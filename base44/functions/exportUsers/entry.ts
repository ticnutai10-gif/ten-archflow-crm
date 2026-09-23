import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all users
    const users = await base44.asServiceRole.entities.User.list();
    
    // Get team members for additional data
    const teamMembers = await base44.asServiceRole.entities.TeamMember.list();
    const teamMemberMap = {};
    teamMembers.forEach(tm => {
      teamMemberMap[tm.email] = tm;
    });

    // CSV Header
    const headers = ['מזהה', 'שם מלא', 'אימייל', 'תפקיד', 'תאריך הצטרפות', 'שכר שעתי', 'אחוז מעמ', 'שעות שבועיות'];
    
    // Build CSV rows
    const rows = users.map(u => {
      const tm = teamMemberMap[u.email] || {};
      return [
        u.id,
        u.full_name || '',
        u.email || '',
        u.role || 'user',
        u.created_date ? new Date(u.created_date).toLocaleDateString('he-IL') : '',
        tm.hourly_rate || 0,
        tm.vat_percentage || 17,
        tm.capacity_hours_per_week || 40
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
    });

    const csv = '\uFEFF' + [headers.join(','), ...rows].join('\n');

    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename=users.csv'
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});