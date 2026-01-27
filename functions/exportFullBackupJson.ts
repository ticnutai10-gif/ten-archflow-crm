import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ========== Load all data ==========
    const [users, teamMembers, clients, timeLogs, spreadsheets, projects, tasks, meetings] = await Promise.all([
      base44.asServiceRole.entities.User.list(),
      base44.asServiceRole.entities.TeamMember.list().catch(() => []),
      base44.entities.Client.list(),
      base44.asServiceRole.entities.TimeLog.list('-log_date', 10000),
      base44.entities.CustomSpreadsheet.list().catch(() => []),
      base44.entities.Project.list().catch(() => []),
      base44.entities.Task.list().catch(() => []),
      base44.entities.Meeting.list().catch(() => [])
    ]);

    // Build statistics
    const teamMemberMap = {};
    teamMembers.forEach(tm => { teamMemberMap[tm.email] = tm; });
    
    const totalLogSeconds = timeLogs.reduce((sum, l) => sum + (l.duration_seconds || 0), 0);
    
    // Per-client stats
    const clientStats = {};
    const userStats = {};
    timeLogs.forEach(log => {
      const clientKey = log.client_name || log.client_id || 'לא ידוע';
      const userKey = log.user_email || log.created_by || 'לא ידוע';
      const seconds = log.duration_seconds || 0;
      const rate = log.hourly_rate || teamMemberMap[log.user_email]?.hourly_rate || 0;
      const cost = (seconds / 3600) * rate;
      
      if (!clientStats[clientKey]) clientStats[clientKey] = { seconds: 0, cost: 0, count: 0 };
      clientStats[clientKey].seconds += seconds;
      clientStats[clientKey].cost += cost;
      clientStats[clientKey].count++;
      
      if (!userStats[userKey]) userStats[userKey] = { seconds: 0, cost: 0, count: 0, name: '' };
      userStats[userKey].seconds += seconds;
      userStats[userKey].cost += cost;
      userStats[userKey].count++;
      userStats[userKey].name = users.find(u => u.email === userKey)?.full_name || userKey;
    });

    // Build export object
    const backup = {
      metadata: {
        exported_at: new Date().toISOString(),
        exported_by: user.email,
        version: '1.0'
      },
      statistics: {
        users: users.length,
        clients: clients.length,
        projects: projects.length,
        tasks: tasks.length,
        timeLogs: timeLogs.length,
        meetings: meetings.length,
        spreadsheets: spreadsheets.length,
        totalHours: Math.round(totalLogSeconds / 3600 * 10) / 10,
        totalLaborCost: Math.round(Object.values(clientStats).reduce((sum, c) => sum + c.cost, 0))
      },
      documentation: {
        description: "תיעוד מפורט של כל הנתונים במערכת",
        dataRelationships: {
          "timeLogs -> users": "כל לוג זמן מחובר למשתמש דרך שדה user_email או created_by",
          "timeLogs -> clients": "כל לוג מחובר ללקוח דרך client_id או client_name",
          "timeLogs -> projects": "לוג יכול להיות מחובר לפרויקט דרך project_id",
          "tasks -> projects": "משימות מחוברות לפרויקט דרך project_id",
          "tasks -> clients": "משימות מחוברות ללקוח דרך client_id",
          "projects -> clients": "פרויקטים מחוברים ללקוח דרך client_id",
          "spreadsheets -> clients": "טבלאות יכולות להיות משויכות ללקוח דרך client_id",
          "spreadsheets -> projects": "טבלאות יכולות להיות משויכות לפרויקט דרך project_id",
          "meetings -> clients": "פגישות מחוברות ללקוח דרך client_id",
          "meetings -> projects": "פגישות יכולות להיות מחוברות לפרויקט דרך project_id"
        },
        costCalculation: "עלות = (duration_seconds / 3600) × hourly_rate. שכר שעתי נלקח מהלוג עצמו או מ-teamMembers",
        fields: {
          timeLogs: {
            duration_seconds: "משך הזמן בשניות",
            log_date: "תאריך הרישום",
            user_email: "אימייל העובד שביצע",
            client_name: "שם הלקוח",
            hourly_rate: "שכר שעתי (אם מוגדר)",
            billable: "האם ניתן לחיוב"
          },
          clients: {
            stage: "שלב הלקוח בתהליך",
            status: "סטטוס: פוטנציאלי/פעיל/לא פעיל",
            budget_range: "טווח תקציב משוער"
          },
          projects: {
            status: "סטטוס: הצעת מחיר/תכנון/היתרים/ביצוע/הושלם/מבוטל",
            progress: "אחוז התקדמות (0-100)",
            team_members: "צוות העובדים המשויך לפרויקט"
          }
        }
      },
      summaries: {
        byClient: Object.entries(clientStats)
          .sort((a, b) => b[1].seconds - a[1].seconds)
          .slice(0, 50)
          .map(([name, stats]) => ({
            client: name,
            totalHours: Math.round(stats.seconds / 3600 * 10) / 10,
            totalCost: Math.round(stats.cost),
            logCount: stats.count
          })),
        byUser: Object.entries(userStats)
          .sort((a, b) => b[1].seconds - a[1].seconds)
          .map(([email, stats]) => ({
            email,
            name: stats.name,
            totalHours: Math.round(stats.seconds / 3600 * 10) / 10,
            totalCost: Math.round(stats.cost),
            logCount: stats.count
          }))
      },
      data: {
        users: users.map(u => ({
          id: u.id,
          full_name: u.full_name,
          email: u.email,
          role: u.role,
          created_date: u.created_date
        })),
        teamMembers: teamMembers,
        clients: clients,
        projects: projects,
        tasks: tasks,
        timeLogs: timeLogs,
        meetings: meetings,
        spreadsheets: spreadsheets.map(s => ({
          id: s.id,
          name: s.name,
          description: s.description,
          client_id: s.client_id,
          client_name: s.client_name,
          project_id: s.project_id,
          project_name: s.project_name,
          columns: s.columns,
          rows_data: s.rows_data,
          created_date: s.created_date
        }))
      }
    };

    const jsonStr = JSON.stringify(backup, null, 2);
    const filename = `backup_${new Date().toISOString().split('T')[0]}.json`;

    return new Response(jsonStr, {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    });
  } catch (error) {
    console.error('Export error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});