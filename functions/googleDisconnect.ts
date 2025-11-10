import { createClientFromRequest } from 'npm:@base44/sdk@0.5.0';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
        return new Response(JSON.stringify({ error: "User not authenticated" }), { status: 401 });
    }

    try {
        await base44.asServiceRole.entities.User.update(user.id, {
            google_access_token: null,
            google_refresh_token: null,
            google_token_expiry: null
        });
        
        return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (error) {
        console.error("Error disconnecting Google account:", error);
        return new Response(JSON.stringify({ error: "Failed to disconnect account." }), { status: 500 });
    }
});