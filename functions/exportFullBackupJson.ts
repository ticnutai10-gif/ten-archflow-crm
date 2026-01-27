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
        totalHours: Math.round(timeLogs.reduce((sum, l) => sum + (l.duration_seconds || 0), 0) / 3600 * 10) / 10
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