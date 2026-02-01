import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const format = url.searchParams.get('format') || 'csv'; // csv, json, xlsx
    
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [clients, projects, tasks, timeLogs] = await Promise.all([
      base44.asServiceRole.entities.Client.list('-created_date', 5000),
      base44.asServiceRole.entities.Project.list('-created_date', 5000),
      base44.asServiceRole.entities.Task.list('-created_date', 10000),
      base44.asServiceRole.entities.TimeLog.list('-log_date', 10000)
    ]);

    // Calculate stats per client
    const clientStats = {};
    clients.forEach(c => {
      clientStats[c.id] = {
        projectCount: 0,
        taskCount: 0,
        completedTasks: 0,
        totalHours: 0
      };
    });

    projects.forEach(p => {
      if (p.client_id && clientStats[p.client_id]) {
        clientStats[p.client_id].projectCount++;
      }
    });

    tasks.forEach(t => {
      if (t.client_id && clientStats[t.client_id]) {
        clientStats[t.client_id].taskCount++;
        if (t.status === 'הושלמה') clientStats[t.client_id].completedTasks++;
      }
    });

    timeLogs.forEach(log => {
      const client = clients.find(c => c.name === log.client_name || c.id === log.client_id);
      if (client && clientStats[client.id]) {
        clientStats[client.id].totalHours += (log.duration_seconds || 0) / 3600;
      }
    });

    // Build CSV
    const headers = [
      'שם לקוח', 'סטטוס', 'שלב', 'טלפון', 'אימייל', 'כתובת', 'חברה',
      'טווח תקציב', 'מקור הגעה', 'תפקיד', 'וואטסאפ', 
      'פרויקטים', 'משימות', 'משימות שהושלמו', 'שעות עבודה',
      'הערות', 'תאריך יצירה'
    ];

    const rows = clients.map(c => {
      const stats = clientStats[c.id] || {};
      return [
        c.name || '',
        c.status || '',
        c.stage || '',
        c.phone || '',
        c.email || '',
        c.address || '',
        c.company || '',
        c.budget_range || '',
        c.source || '',
        c.position || '',
        c.whatsapp || '',
        stats.projectCount || 0,
        stats.taskCount || 0,
        stats.completedTasks || 0,
        (stats.totalHours || 0).toFixed(1),
        (c.notes || '').replace(/\n/g, ' '),
        c.created_date ? new Date(c.created_date).toLocaleDateString('he-IL') : ''
      ];
    });

    const dateStr = new Date().toISOString().split('T')[0];

    if (format === 'json') {
      const jsonData = {
        metadata: {
          exported_at: new Date().toISOString(),
          exported_by: user.email,
          total_clients: clients.length
        },
        headers,
        clients: clients.map(c => {
          const stats = clientStats[c.id] || {};
          return {
            ...c,
            stats: {
              projectCount: stats.projectCount || 0,
              taskCount: stats.taskCount || 0,
              completedTasks: stats.completedTasks || 0,
              totalHours: (stats.totalHours || 0).toFixed(1)
            }
          };
        })
      };
      
      return new Response(JSON.stringify(jsonData, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': `attachment; filename="clients_table_${dateStr}.json"`
        }
      });
    }

    // CSV format (also used as base for xlsx)
    const csvContent = '\uFEFF' + [
      headers.join(','),
      ...rows.map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    if (format === 'xlsx') {
      // Return as tab-separated for Excel compatibility
      const xlsContent = '\uFEFF' + [
        headers.join('\t'),
        ...rows.map(row => row.map(v => String(v).replace(/\t/g, ' ')).join('\t'))
      ].join('\n');
      
      return new Response(xlsContent, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.ms-excel; charset=utf-8',
          'Content-Disposition': `attachment; filename="clients_table_${dateStr}.xls"`
        }
      });
    }

    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="clients_table_${dateStr}.csv"`
      }
    });
  } catch (error) {
    console.error('Export error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});