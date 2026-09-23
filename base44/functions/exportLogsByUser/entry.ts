import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [timeLogs, users, teamMembers] = await Promise.all([
      base44.asServiceRole.entities.TimeLog.list('-log_date', 10000),
      base44.asServiceRole.entities.User.list(),
      base44.asServiceRole.entities.TeamMember.list().catch(() => [])
    ]);

    const userMap = {};
    users.forEach(u => { userMap[u.email] = u.full_name || u.email; });
    
    const teamMemberMap = {};
    teamMembers.forEach(tm => { teamMemberMap[tm.email] = tm; });

    const formatDuration = (seconds) => {
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      return `${h}:${String(m).padStart(2, '0')}`;
    };

    // Group by user
    const userGroups = {};
    timeLogs.forEach(log => {
      const userEmail = log.user_email || log.created_by || 'לא ידוע';
      const userName = userMap[userEmail] || log.user_name || userEmail;
      
      if (!userGroups[userEmail]) {
        userGroups[userEmail] = {
          name: userName,
          logs: [],
          totalSeconds: 0,
          totalCost: 0,
          rate: teamMemberMap[userEmail]?.hourly_rate || 0
        };
      }
      const seconds = log.duration_seconds || 0;
      const rate = log.hourly_rate || teamMemberMap[userEmail]?.hourly_rate || 0;
      const cost = (seconds / 3600) * rate;
      
      userGroups[userEmail].logs.push(log);
      userGroups[userEmail].totalSeconds += seconds;
      userGroups[userEmail].totalCost += cost;
    });

    // Build CSV with user sections
    const headers = ['עובד', 'אימייל', 'תאריך', 'שעה', 'כותרת', 'הערות', 'לקוח', 'משך (שעות:דקות)', 'משך שעות', 'שכר שעתי', 'עלות', 'פרויקט'];
    const rows = [];

    // Sort users by total hours descending
    const sortedUsers = Object.entries(userGroups)
      .sort((a, b) => b[1].totalSeconds - a[1].totalSeconds);

    sortedUsers.forEach(([email, data]) => {
      // Add summary row for user
      rows.push([
        `=== ${data.name} ===`,
        email,
        `סה"כ שעות: ${formatDuration(data.totalSeconds)}`,
        `סה"כ עלות: ₪${Math.round(data.totalCost)}`,
        `${data.logs.length} רישומים`,
        `שכר: ₪${data.rate}/שעה`,
        '', '', '', '', '', ''
      ]);

      // Add individual logs sorted by date
      data.logs
        .sort((a, b) => new Date(b.log_date) - new Date(a.log_date))
        .forEach(log => {
          const seconds = log.duration_seconds || 0;
          const hours = seconds / 3600;
          const rate = log.hourly_rate || data.rate || 0;
          const cost = hours * rate;
          
          rows.push([
            data.name,
            email,
            log.log_date || '',
            log.created_date ? new Date(log.created_date).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }) : '',
            log.title || '',
            (log.notes || '').replace(/\n/g, ' '),
            log.client_name || '',
            formatDuration(seconds),
            hours.toFixed(2),
            rate,
            cost.toFixed(0),
            log.project_name || ''
          ]);
        });

      // Empty row between users
      rows.push(['', '', '', '', '', '', '', '', '', '', '', '']);
    });

    // Add grand total at end
    const grandTotalSeconds = Object.values(userGroups).reduce((sum, u) => sum + u.totalSeconds, 0);
    const grandTotalCost = Object.values(userGroups).reduce((sum, u) => sum + u.totalCost, 0);
    rows.push([
      '=== סה"כ כללי ===',
      `${Object.keys(userGroups).length} עובדים`,
      `${formatDuration(grandTotalSeconds)} שעות`,
      `₪${Math.round(grandTotalCost)}`,
      `${timeLogs.length} רישומים`,
      '', '', '', '', '', '', ''
    ]);

    const csvContent = '\uFEFF' + [
      headers.join(','),
      ...rows.map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="logs_by_user_${new Date().toISOString().split('T')[0]}.csv"`
      }
    });
  } catch (error) {
    console.error('Export error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});