import { createClientFromRequest } from 'npm:@base44/sdk@0.5.0';

const API_KEY = Deno.env.get("BEAMIE_API_KEY");
const API_SECRET = Deno.env.get("BEAMIE_API_SECRET");

function buildUrl(base, path) {
  try {
    // Allow full url or relative path
    if (!path || path === "") path = "/";
    return new URL(path, base).toString();
  } catch {
    return null;
  }
}

function makeOptions(method, body, strategy) {
  const headers = new Headers();
  headers.set("Accept", "application/json");
  if (body && (method !== "GET" && method !== "HEAD")) {
    headers.set("Content-Type", "application/json");
  }

  if (strategy === "bearer") {
    headers.set("Authorization", `Bearer ${API_KEY}`);
  } else if (strategy === "basic") {
    const creds = btoa(`${API_KEY}:${API_SECRET}`);
    headers.set("Authorization", `Basic ${creds}`);
  } else if (strategy === "headers") {
    headers.set("X-API-KEY", API_KEY || "");
    headers.set("X-API-SECRET", API_SECRET || "");
  }

  return {
    method,
    headers,
    body: body && (method !== "GET" && method !== "HEAD") ? JSON.stringify(body) : undefined,
  };
}

async function tryRequest(url, method, body, strategies) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort("timeout"), 15000);
  try {
    for (const strat of strategies) {
      const opts = makeOptions(method, body, strat);
      opts.signal = controller.signal;
      const res = await fetch(url, opts);
      // If not unauthorized/forbidden, or success, return it
      if (![401, 403].includes(res.status)) {
        const text = await res.text();
        let json = null;
        try { json = text ? JSON.parse(text) : null; } catch {}
        return { status: res.status, ok: res.ok, headers: Object.fromEntries(res.headers.entries()), body: json ?? text, strategy: strat };
      }
    }
    // Last attempt also unauthorized
    return { status: 401, ok: false, body: { error: "Unauthorized with provided strategies" }, strategy: strategies[strategies.length - 1] };
  } finally {
    clearTimeout(timeout);
  }
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  // Ensure user is authenticated
  if (!(await base44.auth.isAuthenticated())) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
  }

  if (!API_KEY || !API_SECRET) {
    return new Response(JSON.stringify({ error: "Missing BEAMIE_API_KEY/BEAMIE_API_SECRET. Set them in environment variables." }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }

  let payload = {};
  try { payload = await req.json(); } catch {}

  const action = payload.action || "request";
  const baseUrl = payload.base_url;
  const path = payload.path || "/";
  const method = (payload.method || "GET").toUpperCase();
  const body = payload.body || null;

  if (!baseUrl) {
    return new Response(JSON.stringify({ error: "Missing base_url. Provide the provider base URL (e.g. https://api.provider.com)" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  const url = buildUrl(baseUrl, path);
  if (!url) {
    return new Response(JSON.stringify({ error: "Invalid URL. Check base_url and path." }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  // Supported strategies
  const strategies = ["bearer", "basic", "headers"];

  try {
    if (action === "ping") {
      // Try a light-weight HEAD, then GET
      let result = await tryRequest(url, "HEAD", null, strategies);
      if (result.status === 405 || result.status === 404 || !result.ok) {
        result = await tryRequest(url, "GET", null, strategies);
      }
      return new Response(JSON.stringify({ ok: result.ok, status: result.status, strategy: result.strategy, body: result.body }), {
        status: result.ok ? 200 : result.status || 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Generic request
    const result = await tryRequest(url, method, body, strategies);
    return new Response(JSON.stringify({ ok: result.ok, status: result.status, strategy: result.strategy, headers: result.headers, body: result.body }), {
      status: result.ok ? 200 : result.status || 500,
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e?.message || String(e) }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
});