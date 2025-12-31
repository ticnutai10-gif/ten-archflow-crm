import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

export default Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Fetch counts efficiently
    const [
      allClients,
      allProjects,
      pendingQuotes,
      activeTasks
    ] = await Promise.all([
      base44.asServiceRole.entities.Client.filter({}, 'created_date', 10000), // Get basic info only if possible? SDK returns full objects.
      base44.asServiceRole.entities.Project.filter({}, 'created_date', 10000),
      base44.asServiceRole.entities.Quote.filter({ status: 'בהמתנה' }, 'created_date', 10000),
      base44.asServiceRole.entities.Task.filter({ status: { $ne: 'הושלמה' } }, 'created_date', 10000)
    ]);

    // Calculate stats
    // Deduplicate clients logic
    const uniqueMap = new Map();
    for (const client of allClients) {
      if (!client) continue;
      const cleanName = (client.name_clean || client.name || '').trim().toLowerCase().replace(/\s+/g, ' ');
      if (!cleanName) continue;
      
      if (!uniqueMap.has(cleanName)) {
        uniqueMap.set(cleanName, client);
      } else {
        const existing = uniqueMap.get(cleanName);
        if (new Date(client.updated_date) > new Date(existing.updated_date)) {
          uniqueMap.set(cleanName, client);
        }
      }
    }
    const dedupedClients = Array.from(uniqueMap.values());

    const stats = {
      clients: dedupedClients.filter(c => c.status === 'פעיל').length,
      projects: allProjects.filter(p => p?.status !== 'הושלם').length,
      quotes: pendingQuotes.length,
      tasks: activeTasks.length,
      
      // Also return full lists if frontend needs them for dropdowns (limit to reasonable amount if needed)
      // For now, let's just return stats as that's the heavy part.
      // Actually, Dashboard uses allClients for filter/activity feed.
      // Returning 1000s of clients might be heavy for JSON.
      // Let's return the simplified lists or just what's needed.
      // The frontend uses `allClients` for `QuickCreationTabs`, `StatsWidget`, `UpcomingTasks` etc.
      // So we kind of need the data. But 1000 clients is ~1MB JSON.
      // Let's send the full data for now, it's better than 4 separate requests.
      allClients: dedupedClients,
      allProjects: allProjects,
      allTasks: activeTasks
    };

    return Response.json(stats);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});