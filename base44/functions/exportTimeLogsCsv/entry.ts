
import { createClientFromRequest } from 'npm:@base44/sdk@0.5.0';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  if (!(await base44.auth.isAuthenticated())) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const me = await base44.auth.me();

    // Detect admin-like (admin or manager_plus)
    let canSeeAll = me?.role === 'admin';
    if (!canSeeAll) {
      try {
        const rows = await base44.entities.AccessControl.filter({ email: me.email, active: true });
        const rule = rows?.[0];
        if (rule?.role === 'manager_plus') canSeeAll = true;
      } catch (_e) {
        // ignore, default is false
      }
    }

    const logs = canSeeAll
      ? await base44.entities.TimeLog.filter({}, '-log_date', 1000)
      : await base44.entities.TimeLog.filter({ created_by: me.email }, '-log_date', 1000);

    // UPDATED: add created_by column
    const headers = ['לקוח', 'תאריך', 'כותרת', 'הערות', 'משך (שניות)', 'נוצר ע״י'];
    const rows = logs.map(l => [
      (l.client_name || '').replaceAll('"', '""'),
      l.log_date ? new Date(l.log_date).toISOString().slice(0, 10) : '',
      (l.title || '').replaceAll('"', '""'),
      (l.notes || '').replaceAll('"', '""'),
      String(l.duration_seconds || 0),
      (l.created_by || '').replaceAll('"', '""')
    ]);

    const csv = [headers, ...rows]
      .map(r => r.map(v => `"${v}"`).join(','))
      .join('\n');

    return new Response(new TextEncoder().encode(csv), {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename=timelogs.csv'
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
