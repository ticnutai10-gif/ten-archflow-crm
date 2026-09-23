
import { createClientFromRequest } from 'npm:@base44/sdk@0.5.0';

// Resolve env var by trying multiple common names (case variations + legacy typos)
function resolveEnv(names) {
  for (const n of names) {
    const v = Deno.env.get(n);
    if (v) return { name: n, value: v };
  }
  return { name: null, value: null };
}

// Try all known variants for ID/API key
const idEnv = resolveEnv([
  "GREENINVOICE_ID",
  "PROVIDER_API_KEY",
  "PROVIDER_ID",
  "GreenInvoice_API_KEY",       // user-provided camel case
  "GREENINVOICE_API_KEY"        // possible variant
]);

// Try all known variants for SECRET
const secretEnv = resolveEnv([
  "GREENINVOICE_SECRET",
  "PROVIDER_API_SECRET",
  "PROVIDER_SECRET",
  "GreenInvoice_SEACRET_KEY",   // note the existing typo in env name
  "GreenInvoice_SECRET_KEY",
  "GREENINVOICE_SECRET_KEY"
]);

const GI_ID = idEnv.value;
const GI_SECRET = secretEnv.value;

// Helpers
async function safeJson(res) {
  const text = await res.text();
  try { return text ? JSON.parse(text) : null; } catch { return { raw: text }; }
}

function extractToken(data) {
  return (
    data?.token ||
    data?.access_token ||
    data?.jwt ||
    data?.data?.token ||
    data?.data?.access_token ||
    data?.data?.jwt ||
    null
  );
}

function buildUrl(base, path) {
  if (!path || path === "") path = "/";
  return new URL(path, base).toString();
}

// Try to obtain bearer token from common GreenInvoice auth endpoints
async function getToken(baseUrl) {
  if (!GI_ID || !GI_SECRET) {
    throw new Error(
      "Missing credentials: set GREENINVOICE_ID/GREENINVOICE_SECRET or GreenInvoice_API_KEY/GreenInvoice_SEACRET_KEY (or PROVIDER_API_KEY/PROVIDER_API_SECRET)."
    );
  }

  const endpoints = [
    "/api/v1/account/token",
    "/account/token",
    "/api/v1/auth/token",
    "/auth/token",
    "/api/v1/auth/access_token",
    "/auth/access_token",
    "/api/v1/authenticate",
    "/authenticate",
  ];

  const payload = { id: GI_ID, secret: GI_SECRET };
  const basic = typeof btoa === "function" ? btoa(`${GI_ID}:${GI_SECRET}`) : null;

  const tried = [];

  for (const ep of endpoints) {
    const url = new URL(ep, baseUrl).toString();

    // 1) JSON body
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(payload),
      });
      tried.push(`${url} -> ${res.status}`);
      if (res.ok) {
        const data = await safeJson(res);
        const token = extractToken(data);
        if (token) return token;
      }
    } catch (e) {
      tried.push(`${url} -> error: ${String(e?.message || e)}`);
    }

    // 2) x-www-form-urlencoded
    try {
      const formBody = new URLSearchParams({ id: String(GI_ID), secret: String(GI_SECRET) }).toString();
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", "Accept": "application/json" },
        body: formBody,
      });
      tried.push(`${url} [form] -> ${res.status}`);
      if (res.ok) {
        const data = await safeJson(res);
        const token = extractToken(data);
        if (token) return token;
      }
    } catch (e) {
      tried.push(`${url} [form] -> error: ${String(e?.message || e)}`);
    }

    // 3) Basic auth with empty JSON body
    if (basic) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Accept": "application/json",
            "Authorization": `Basic ${basic}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        });
        tried.push(`${url} [basic+json] -> ${res.status}`);
        if (res.ok) {
          const data = await safeJson(res);
          const token = extractToken(data);
          if (token) return token;
        }
      } catch (e) {
        tried.push(`${url} [basic+json] -> error: ${String(e?.message || e)}`);
      }

      // 4) Basic auth with no body
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Accept": "application/json",
            "Authorization": `Basic ${basic}`,
          },
        });
        tried.push(`${url} [basic] -> ${res.status}`);
        if (res.ok) {
          const data = await safeJson(res);
          const token = extractToken(data);
          if (token) return token;
        }
      } catch (e) {
        tried.push(`${url} [basic] -> error: ${String(e?.message || e)}`);
      }
    }
  }

  throw new Error(`Failed to obtain access token from GreenInvoice. Tried: ${tried.join(" | ")}. Hint: verify environment (Production vs Sandbox) matches your API keys.`);
}

async function doRequest(baseUrl, token, method, path, body) {
  const url = buildUrl(baseUrl, path);
  const headers = new Headers();
  headers.set("Accept", "application/json");
  headers.set("Authorization", `Bearer ${token}`);
  const hasBody = !!body && !["GET", "HEAD"].includes(method);
  if (hasBody) headers.set("Content-Type", "application/json");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort("timeout"), 20000);

  try {
    const res = await fetch(url, {
      method,
      headers,
      body: hasBody ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    const text = await res.text();
    let parsed = null;
    try { parsed = text ? JSON.parse(text) : null; } catch { parsed = text; }

    return {
      ok: res.ok,
      status: res.status,
      headers: Object.fromEntries(res.headers.entries()),
      body: parsed,
    };
  } finally {
    clearTimeout(timeout);
  }
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  if (!(await base44.auth.isAuthenticated())) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const payload = await req.json().catch(() => ({}));
    const action = payload.action || "request";
    const base_url = payload.base_url || "https://api.greeninvoice.co.il";
    const method = (payload.method || "GET").toUpperCase();
    const path = payload.path || "/";
    const body = payload.body || null;

    if (!GI_ID || !GI_SECRET) {
      return new Response(JSON.stringify({
        error: "Missing credentials",
        details: "Set GREENINVOICE_ID/GREENINVOICE_SECRET or GreenInvoice_API_KEY/GreenInvoice_SEACRET_KEY (or PROVIDER_API_KEY/PROVIDER_API_SECRET)"
      }), {
        status: 500, headers: { "Content-Type": "application/json" }
      });
    }

    if (action === "authTest") {
      const token = await getToken(base_url);
      return new Response(JSON.stringify({ ok: true, token_preview: token.slice(0, 8) + "...", base_url }), {
        status: 200, headers: { "Content-Type": "application/json" }
      });
    }

    const token = await getToken(base_url);
    const result = await doRequest(base_url, token, method, path, body);

    return new Response(JSON.stringify({ ok: result.ok, status: result.status, headers: result.headers, body: result.body }), {
      status: result.ok ? 200 : result.status || 500,
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e?.message || String(e) }), {
      status: 500, headers: { "Content-Type": "application/json" }
    });
  }
});
