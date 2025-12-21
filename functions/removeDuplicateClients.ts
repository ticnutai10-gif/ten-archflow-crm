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

        // Group by name_clean (normalized) - this is better for matching
        const clientsByName = new Map();
        
        for (const client of allClients) {
            // Use name_clean if available, otherwise normalize name
            const rawName = client.name_clean || client.name || '';
            const name = rawName.trim().toLowerCase().replace(/\s+/g, ' ');
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
                keptClients.push({ name: kept.name, id: kept.id, created_date: kept.created_date, stage: kept.stage });
                
                for (let i = 1; i < clients.length; i++) {
                    duplicatesToDelete.push({
                        id: clients[i].id,
                        name: clients[i].name,
                        created_date: clients[i].created_date,
                        stage: clients[i].stage
                    });
                }
            }
        }

        console.log(`🔍 Found ${duplicatesToDelete.length} duplicate clients to delete`);
        console.log('📋 Duplicates:', JSON.stringify(duplicatesToDelete.map(d => ({ name: d.name, id: d.id, stage: d.stage }))));

        // Delete duplicates - try multiple methods
        let deleted = 0;
        const errors = [];
        const deletedList = [];
        
        for (const dup of duplicatesToDelete) {
            try {
                console.log(`🗑️ Attempting to delete: ${dup.name} (${dup.id})`);
                
                // Try direct delete
                await base44.asServiceRole.entities.Client.delete(dup.id);
                deleted++;
                deletedList.push({ name: dup.name, id: dup.id, stage: dup.stage });
                console.log(`✅ Deleted: ${dup.name} (${dup.id})`);
            } catch (error) {
                console.error(`❌ Failed to delete ${dup.name} (${dup.id}):`, error.message);
                errors.push({ name: dup.name, id: dup.id, stage: dup.stage, error: error.message });
            }
        }

        // Verify deletion by re-fetching
        const remainingClients = await base44.asServiceRole.entities.Client.filter({}, 'created_date', 1000);
        const stillDuplicates = [];
        
        const verifyMap = new Map();
        for (const client of remainingClients) {
            const rawName = client.name_clean || client.name || '';
            const name = rawName.trim().toLowerCase().replace(/\s+/g, ' ');
            if (!name) continue;
            
            if (!verifyMap.has(name)) {
                verifyMap.set(name, []);
            }
            verifyMap.get(name).push(client);
        }
        
        for (const [name, clients] of verifyMap) {
            if (clients.length > 1) {
                stillDuplicates.push({
                    name: clients[0].name,
                    count: clients.length,
                    ids: clients.map(c => c.id)
                });
            }
        }

        return Response.json({
            success: true,
            totalClientsBefore: allClients.length,
            totalClientsAfter: remainingClients.length,
            uniqueNames: clientsByName.size,
            duplicatesFound: duplicatesToDelete.length,
            deleted,
            deletedList: deletedList.slice(0, 30),
            errors: errors.length > 0 ? errors : undefined,
            keptClients: keptClients.slice(0, 30),
            stillDuplicates: stillDuplicates.length > 0 ? stillDuplicates : undefined,
            verificationPassed: stillDuplicates.length === 0
        });

    } catch (error) {
        console.error('❌ Error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});