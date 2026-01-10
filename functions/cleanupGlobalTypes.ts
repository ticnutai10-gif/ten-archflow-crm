import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const allTypes = await base44.entities.GlobalDataType.list();
        const grouped = {};

        // Group by type_key
        allTypes.forEach(t => {
            if (!grouped[t.type_key]) grouped[t.type_key] = [];
            grouped[t.type_key].push(t);
        });

        const deletedIds = [];
        const keptIds = [];

        for (const key in grouped) {
            const records = grouped[key];
            if (records.length > 1) {
                // Sort by updated_date descending (newest first)
                records.sort((a, b) => new Date(b.updated_date || b.created_date) - new Date(a.updated_date || a.created_date));
                
                const toKeep = records[0];
                keptIds.push({ key, id: toKeep.id, name: toKeep.name });

                // Delete the rest
                for (let i = 1; i < records.length; i++) {
                    await base44.entities.GlobalDataType.delete(records[i].id);
                    deletedIds.push(records[i].id);
                }
            } else {
                keptIds.push({ key, id: records[0].id, name: records[0].name });
            }
        }

        return Response.json({ 
            success: true, 
            deleted: deletedIds.length, 
            deletedIds, 
            kept: keptIds 
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});