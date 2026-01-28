import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [timeLogs, teamMembers] = await Promise.all([
      base44.asServiceRole.entities.TimeLog.list('-log_date', 10000),
      base44.asServiceRole.entities.TeamMember.list().catch(() => [])
    ]);

    const teamMemberMap = {};
    teamMembers.forEach(tm => { teamMemberMap[tm.email] = tm; });

    const formatDuration = (seconds) => {
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      return `${h}:${String(m).padStart(2, '0')}`;
    };

    // Group by client
    const clientGroups = {};
    timeLogs.forEach(log => {
      const clientName = log.client_name || 'לא משויך';
      if (!clientGroups[clientName]) {
        clientGroups[clientName] = {
          logs: [],
          totalSeconds: 0,
          totalCost: 0
        };
      }
      const seconds = log.duration_seconds || 0;
      const rate = log.hourly_rate || teamMemberMap[log.user_email]?.hourly_rate || 0;
      const cost = (seconds / 3600) * rate;
      
      clientGroups[clientName].logs.push(log);
      clientGroups[clientName].totalSeconds += seconds;
      clientGroups[clientName].totalCost += cost;
    });

    // Build CSV with client sections
    const headers = ['לקוח', 'תאריך', 'שעה', 'כותרת', 'הערות', 'עובד', 'משך (שעות:דקות)', 'משך שעות', 'שכר שעתי', 'עלות', 'פרויקט'];
    const rows = [];

    // Sort clients by total hours descending
    const sortedClients = Object.entries(clientGroups)
      .sort((a, b) => b[1].totalSeconds - a[1].totalSeconds);

    sortedClients.forEach(([clientName, data]) => {
      // Add summary row for client
      rows.push([
        `=== ${clientName} ===`,
        `סה"כ שעות: ${formatDuration(data.totalSeconds)}`,
        `סה"כ עלות: ₪${Math.round(data.totalCost)}`,
        `${data.logs.length} רישומים`,
        '', '', '', '', '', '', ''
      ]);

      // Add individual logs sorted by date
      data.logs
        .sort((a, b) => new Date(b.log_date) - new Date(a.log_date))
        .forEach(log => {
          const seconds = log.duration_seconds || 0;
          const hours = seconds / 3600;
          const rate = log.hourly_rate || teamMemberMap[log.user_email]?.hourly_rate || 0;
          const cost = hours * rate;
          
          rows.push([
            clientName,
            log.log_date || '',
            log.created_date ? new Date(log.created_date).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }) : '',
            log.title || '',
            (log.notes || '').replace(/\n/g, ' '),
            log.user_name || log.user_email || '',
            formatDuration(seconds),
            hours.toFixed(2),
            rate,
            cost.toFixed(0),
            log.project_name || ''
          ]);
        });

      // Empty row between clients
      rows.push(['', '', '', '', '', '', '', '', '', '', '']);
    });

    // Add grand total at end
    const grandTotalSeconds = Object.values(clientGroups).reduce((sum, c) => sum + c.totalSeconds, 0);
    const grandTotalCost = Object.values(clientGroups).reduce((sum, c) => sum + c.totalCost, 0);
    rows.push([
      '=== סה"כ כללי ===',
      `${formatDuration(grandTotalSeconds)} שעות`,
      `₪${Math.round(grandTotalCost)}`,
      `${timeLogs.length} רישומים`,
      `${Object.keys(clientGroups).length} לקוחות`,
      '', '', '', '', '', ''
    ]);

    const csvContent = '\uFEFF' + [
      headers.join(','),
      ...rows.map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="logs_by_client_${new Date().toISOString().split('T')[0]}.csv"`
      }
    });
  } catch (error) {
    console.error('Export error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});