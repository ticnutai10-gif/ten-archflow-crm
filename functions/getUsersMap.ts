import { createClientFromRequest } from 'npm:@base44/sdk@0.8.3';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Verify authentication
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Use service role to list all users (bypassing regular user restrictions)
        const users = await base44.asServiceRole.entities.User.list();
        
        // Also fetch TeamMember entity as a fallback/supplement
        const teamMembers = await base44.entities.TeamMember.list().catch(() => []);

        const mapping = {};

        // Helper
        const add = (key, data) => {
            if (!key) return;
            mapping[key] = { ...(mapping[key] || {}), ...data };
        };

        // 1. Process standard Users
        for (const u of users) {
            const data = {
                email: u.email,
                full_name: u.full_name || u.display_name,
                id: u.id
            };
            if (u.id) add(u.id, data);
            if (u.email) add(u.email, data);
        }

        // 2. Process TeamMembers (might have better names or cover missing users)
        for (const tm of teamMembers) {
            const data = {
                email: tm.email,
                full_name: tm.full_name
            };
            // We only have email in TeamMember usually, no ID linkage unless implicit
            if (tm.email) add(tm.email, data);
        }

        return Response.json({ mapping });
    } catch (error) {
        console.error('Error in getUsersMap:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});