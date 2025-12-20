import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Only allow admin users
        if (user.role !== 'admin' && user.email !== 'jj1212t@gmail.com' && user.email !== 'mali.f.arch2@gmail.com') {
            return Response.json({ error: 'Admin access required' }, { status: 403 });
        }

        console.log('🧹 Starting duplicate client cleanup...');

        // Get all clients sorted by created_date (oldest first)
        const allClients = await base44.asServiceRole.entities.Client.filter({}, 'created_date', 1000);
        
        console.log(`📊 Total clients found: ${allClients.length}`);

        // Group by name (normalized)
        const clientsByName = new Map();
        
        for (const client of allClients) {
            const name = (client.name || '').trim().toLowerCase();
            if (!name) continue;
            
            if (!clientsByName.has(name)) {
                clientsByName.set(name, []);
            }
            clientsByName.get(name).push(client);
        }

        // Find duplicates (names that appear more than once)
        const duplicatesToDelete = [];
        const keptClients = [];
        
        for (const [name, clients] of clientsByName) {
            if (clients.length > 1) {
                // Sort by created_date (oldest first) - keep the oldest one
                clients.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
                
                // Keep the first one (oldest), delete the rest
                const kept = clients[0];
                keptClients.push({ name: kept.name, id: kept.id, created_date: kept.created_date });
                
                for (let i = 1; i < clients.length; i++) {
                    duplicatesToDelete.push({
                        id: clients[i].id,
                        name: clients[i].name,
                        created_date: clients[i].created_date
                    });
                }
            }
        }

        console.log(`🔍 Found ${duplicatesToDelete.length} duplicate clients to delete`);
        console.log('📋 Duplicates:', duplicatesToDelete.map(d => d.name));

        // Delete duplicates
        let deleted = 0;
        const errors = [];
        
        for (const dup of duplicatesToDelete) {
            try {
                await base44.asServiceRole.entities.Client.delete(dup.id);
                deleted++;
                console.log(`✅ Deleted: ${dup.name} (${dup.id})`);
            } catch (error) {
                console.error(`❌ Failed to delete ${dup.name}:`, error.message);
                errors.push({ name: dup.name, id: dup.id, error: error.message });
            }
        }

        return Response.json({
            success: true,
            totalClients: allClients.length,
            uniqueNames: clientsByName.size,
            duplicatesFound: duplicatesToDelete.length,
            deleted,
            errors: errors.length > 0 ? errors : undefined,
            keptClients: keptClients.slice(0, 20), // Show first 20 kept
            deletedClients: duplicatesToDelete.slice(0, 20) // Show first 20 deleted
        });

    } catch (error) {
        console.error('❌ Error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});