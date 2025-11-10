
import { createClientFromRequest } from 'npm:@base44/sdk@0.7.0';

async function canElevateToService(base44, me) {
  if (me?.role === 'admin') return true;
  try {
    const rows = await base44.entities.AccessControl.filter({ email: me.email, active: true });
    const rule = rows?.[0];
    if (rule?.role === 'manager_plus') return true;
    const all = await base44.entities.AccessControl.list().catch(() => []);
    const r2 = (all || []).find(r =>
      r?.active && typeof r?.email === "string" &&
      r.email.trim().toLowerCase() === (me.email || "").trim().toLowerCase()
    );
    if (r2?.role === 'manager_plus') return true;
  } catch (e) {
    // no-op: אם בדיקת ההרשאות נכשלה, נמשיך בלי העלאת הרשאות
    console.warn("canElevateToService check failed", e);
  }
  return false;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const me = await base44.auth.me();
    if (!me) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const data = body?.data || body;
    if (!data || typeof data !== 'object') {
      return Response.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const elevate = await canElevateToService(base44, me);
    const client = elevate ? base44.asServiceRole : base44;

    const results = {};
    const entityNames = Object.keys(data);
    for (const entityName of entityNames) {
      const items = data[entityName];
      if (!Array.isArray(items)) continue;

      const cleaned = items.map(({ id, created_date, updated_date, created_by, ...rest }) => rest);

      try {
        // eslint-disable-next-line no-await-in-loop
        await client.entities[entityName].bulkCreate(cleaned);
        results[entityName] = { inserted: cleaned.length };
      } catch (e) {
        results[entityName] = { error: String(e?.message || e) };
      }
    }

    return Response.json({ status: 'success', results }, { status: 200 });
  } catch (error) {
    return Response.json({ error: error?.message || 'Unknown error' }, { status: 500 });
  }
});
