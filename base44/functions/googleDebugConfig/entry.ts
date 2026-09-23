import { createClientFromRequest } from 'npm:@base44/sdk@0.5.0';

const CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID");
const CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET");

// Build redirect URI dynamically
function buildRedirectUri(req) {
  const url = new URL(req.url);
  const host = req.headers.get("x-forwarded-host") || url.host;
  const proto = req.headers.get("x-forwarded-proto") || url.protocol.replace(":", "") || "https";
  return `${proto}://${host}/AuthCallback`;
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const isAuth = await base44.auth.isAuthenticated();
  const redirectUri = buildRedirectUri(req);

  const obfuscate = (s) => (s ? `${s.slice(0, 4)}...${s.slice(-4)}` : null);

  return Response.json({
    is_authenticated: isAuth,
    has_client_id: !!CLIENT_ID,
    has_client_secret: !!CLIENT_SECRET,
    client_id_hint: CLIENT_ID ? obfuscate(CLIENT_ID) : null,
    redirect_uri: redirectUri
  });
});