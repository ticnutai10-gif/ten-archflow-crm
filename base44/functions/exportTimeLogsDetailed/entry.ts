import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all time logs
    const timeLogs = await base44.asServiceRole.entities.TimeLog.list('-log_date', 10000);
    
    // Get all users for mapping
    const users = await base44.asServiceRole.entities.User.list();
    const userMap = {};
    users.forEach(u => {
      userMap[u.email] = u.full_name || u.email;
    });

    // Get team members for hourly rates
    const teamMembers = await base44.asServiceRole.entities.TeamMember.list();
    const teamMemberMap = {};
    teamMembers.forEach(tm => {
      teamMemberMap[tm.email] = tm;
    });

    // Get all clients
    const clients = await base44.entities.Client.list();
    const clientMap = {};
    clients.forEach(c => {
      clientMap[c.id] = c;
      clientMap[c.name] = c;
    });

    // Calculate totals per client
    const clientTotals = {};
    timeLogs.forEach(log => {
      const clientKey = log.client_id || log.client_name;
      if (!clientTotals[clientKey]) {
        clientTotals[clientKey] = { totalSeconds: 0, totalCost: 0 };
      }
      const seconds = log.duration_seconds || 0;
      const hours = seconds / 3600;
      const rate = log.hourly_rate || teamMemberMap[log.user_email]?.hourly_rate || 0;
      clientTotals[clientKey].totalSeconds += seconds;
      clientTotals[clientKey].totalCost += hours * rate;
    });

    // Format duration
    const formatDuration = (seconds) => {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours}:${String(minutes).padStart(2, '0')}`;
    };

    // CSV Header
    const headers = [
      'מזהה', 'תאריך', 'כותרת', 'הערות', 
      'משך (שעות:דקות)', 'משך (דקות)', 'משך (שעות עשרוני)',
      'אימייל עובד', 'שם עובד', 
      'שם לקוח', 'מזהה לקוח',
      'שכר שעתי', 'עלות לוג',
      'סה"כ שעות עבודה על לקוח', 'סה"כ עלות על לקוח',
      'פרויקט', 'משימה', 'לחיוב'
    ];
    
    // Build CSV rows
    const rows = timeLogs.map(log => {
      const seconds = log.duration_seconds || 0;
      const hours = seconds / 3600;
      const userName = userMap[log.user_email] || log.user_name || log.user_email || '';
      const rate = log.hourly_rate || teamMemberMap[log.user_email]?.hourly_rate || 0;
      const logCost = hours * rate;
      
      const clientKey = log.client_id || log.client_name;
      const clientTotal = clientTotals[clientKey] || { totalSeconds: 0, totalCost: 0 };
      
      return [
        log.id,
        log.log_date || '',
        log.title || '',
        (log.notes || '').replace(/\n/g, ' '),
        formatDuration(seconds),
        Math.round(seconds / 60),
        hours.toFixed(2),
        log.user_email || log.created_by || '',
        userName,
        log.client_name || '',
        log.client_id || '',
        rate,
        logCost.toFixed(2),
        formatDuration(clientTotal.totalSeconds),
        clientTotal.totalCost.toFixed(2),
        log.project_name || '',
        log.task_title || '',
        log.billable !== false ? 'כן' : 'לא'
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
    });

    const csv = '\uFEFF' + [headers.join(','), ...rows].join('\n');

    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename=timelogs_detailed.csv'
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});