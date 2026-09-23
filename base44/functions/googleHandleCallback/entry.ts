import { createClientFromRequest } from 'npm:@base44/sdk@0.7.0';
import { google } from 'npm:googleapis@128.0.0';

const CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID");
const CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET");

// Build redirect URI dynamically from the incoming request (fallback)
function buildRedirectUri(req) {
  const url = new URL(req.url);
  const host = req.headers.get("x-forwarded-host") || url.host;
  const proto = req.headers.get("x-forwarded-proto") || url.protocol.replace(":", "") || "https";
  return `${proto}://${host}/AuthCallback`;
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    if (!CLIENT_ID || !CLIENT_SECRET) {
      return Response.json(
        { 
          error: "Google API credentials are not set.", 
          hint: "Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in environment.",
          debug: {
            has_client_id: !!CLIENT_ID,
            has_client_secret: !!CLIENT_SECRET
          }
        },
        { status: 500 }
      );
    }

    const isAuth = await base44.auth.isAuthenticated();
    if (!isAuth) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body = {};
    try { 
      body = await req.json(); 
    } catch (error) {
      console.log('No JSON body found:', error.message);
    }
    
    let code = body?.code;
    const overrideRedirect = body?.redirect_uri;

    if (!code) {
      return Response.json({ 
        error: "Authorization code not provided",
        debug: { body, url: req.url, method: req.method }
      }, { status: 400 });
    }

    // Accept either a raw code or a full URL and extract ?code=...
    try {
      if (typeof code === "string" && (code.includes("code=") || code.startsWith("http"))) {
        try {
          const u = new URL(code);
          code = u.searchParams.get("code") || code;
        } catch (urlError) {
          console.log('URL parsing failed, trying regex:', urlError.message);
          const m = String(code).match(/[?&]code=([^&]+)/);
          if (m && m[1]) code = decodeURIComponent(m[1]);
        }
      }
    } catch (parseError) {
      console.log('Code parsing failed:', parseError.message);
    }

    const REDIRECT_URI = typeof overrideRedirect === "string" && overrideRedirect.startsWith("http")
      ? overrideRedirect
      : buildRedirectUri(req);

    console.log('Google OAuth attempt:', {
      redirect_uri: REDIRECT_URI,
      code_length: code?.length,
      client_id_prefix: CLIENT_ID?.slice(0, 10)
    });

    const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

    let tokens;
    try {
      const res = await oauth2Client.getToken(code);
      tokens = res.tokens;
    } catch (err) {
      const details = err?.response?.data || err?.message || String(err);
      const invalidClient =
        (typeof details === "object" && (details?.error === "invalid_client" || details?.error === "unauthorized_client")) ||
        (typeof details === "string" && /invalid_client|unauthorized_client/i.test(details));

      console.error('Google token exchange failed:', { details, invalidClient });

      return Response.json(
        {
          error: "Failed to exchange authorization code for tokens.",
          details,
          hint: invalidClient
            ? "invalid_client: Verify GOOGLE_CLIENT_ID/SECRET match a Web application OAuth client and that the same Redirect URI is registered in Google Cloud Console"
            : "Check that the authorization code is valid and hasn't expired",
          redirect_uri_used: REDIRECT_URI,
          client_id_hint: CLIENT_ID ? `${CLIENT_ID.slice(0, 4)}...${CLIENT_ID.slice(-6)}` : null
        },
        { status: invalidClient ? 400 : 500 }
      );
    }

    const user = await base44.auth.me();

    const updateData = {
      google_access_token: tokens.access_token || null,
      google_token_expiry: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null
    };
    
    if (tokens.refresh_token) {
      updateData.google_refresh_token = tokens.refresh_token;
    }

    // שמירת הטוקנים במשתמש
    await base44.asServiceRole.entities.User.update(user.id, updateData);

    console.log('Google OAuth success for user:', user.email);

    return Response.json({
      success: true,
      has_refresh_token: !!tokens.refresh_token,
      redirect_uri_used: REDIRECT_URI,
      user_email: user.email,
      message: "Google authentication completed successfully"
    });
  } catch (error) {
    console.error('Google callback error:', error);
    return Response.json(
      { 
        error: "Unexpected server error.", 
        details: error?.message || String(error),
        stack: error?.stack?.split('\n').slice(0, 5)
      },
      { status: 500 }
    );
  }
});