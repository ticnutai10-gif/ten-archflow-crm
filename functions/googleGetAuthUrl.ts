import { google } from 'npm:googleapis@128.0.0';

const CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID");
const CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET");

// Build redirect URI dynamically from the incoming request
function buildRedirectUri(req) {
  const url = new URL(req.url);
  const host = req.headers.get("x-forwarded-host") || url.host;
  const proto = req.headers.get("x-forwarded-proto") || url.protocol.replace(":", "") || "https";
  return `${proto}://${host}/AuthCallback`;
}

Deno.serve(async (req) => {
  try {
    if (!CLIENT_ID || !CLIENT_SECRET) {
      return new Response(JSON.stringify({ error: "Google API credentials are not set in environment variables." }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Allow the frontend to override the redirect_uri to ensure it matches the app host (not the deno.dev host)
    let override = null;
    if (req.method === "POST") {
      try {
        const body = await req.json();
        if (typeof body?.redirect_uri === "string" && body.redirect_uri.startsWith("http")) {
          override = body.redirect_uri;
        }
      } catch (_) {}
    }

    const REDIRECT_URI = override || buildRedirectUri(req);
    const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
    const scopes = [
      "https://www.googleapis.com/auth/drive",
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/gmail.send"
    ];

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: scopes,
      prompt: "consent"
    });

    return new Response(JSON.stringify({ authUrl, redirect_uri: REDIRECT_URI, client_id: CLIENT_ID }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error?.message || "Unknown error in googleGetAuthUrl" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
});