import { createClientFromRequest } from 'npm:@base44/sdk@0.7.0';

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    const me = await base44.auth.me();
    if (!me) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await req.json().catch(() => ({}));
    const idsInput = Array.isArray(body?.ids) ? body.ids.filter(Boolean) : [];
    const deleteUnnamed = !!body?.deleteUnnamed;
    const dryRun = !!body?.dryRun;
    const maxIterations = Math.max(1, Math.min(500, Number(body?.maxIterations || 50)));
    const batchSize = Math.max(1, Math.min(100, Number(body?.batchSize || 50)));
    const useService = !!deleteUnnamed || !!body?.useServiceRole;

    const isAdmin = (me.role === 'admin') || (me.email || '').toLowerCase() === 'jj1212t@gmail.com';
    const client = (useService && isAdmin) ? base44.asServiceRole : base44;

    if (idsInput.length > 0) {
      if (dryRun) {
        return new Response(JSON.stringify({
          requested: idsInput.length,
          would_delete: idsInput.length,
          dry_run: true,
          details: idsInput.map(id => ({ id, reason: 'provided_id' }))
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }

      let deleted = 0, failed = 0;
      const details = [];
      for (let i = 0; i < idsInput.length; i += batchSize) {
        const chunk = idsInput.slice(i, i + batchSize);
        const results = await Promise.allSettled(chunk.map(id => client.entities.Client.delete(id)));
        results.forEach((res, idx) => {
          const id = chunk[idx];
          if (res.status === 'fulfilled') deleted++;
          else {
            failed++;
            details.push({ id, error: String(res.reason?.message || res.reason || 'delete failed') });
          }
        });
        if (i + batchSize < idsInput.length) await sleep(100);
      }

      return new Response(JSON.stringify({ requested: idsInput.length, deleted, failed, details }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (deleteUnnamed) {
      const iterations = [];
      let totalDeleted = 0;
      let totalFailed = 0;
      let totalChecked = 0;
      let totalRateLimited = 0;

      if (dryRun) {
        const sample = await client.entities.Client.list().catch(() => []);
        const unnamed = (sample || []).filter(c => {
          const name = (c?.name || '').trim();
          return name === '' || name === 'לקוח ללא שם';
        });
        return new Response(JSON.stringify({
          dry_run: true,
          sample_checked: sample.length,
          sample_unnamed_count: unnamed.length,
          note: "במחיקה אמיתית נרוץ בלולאה עד ניקוי המאגר (לא מוגבל ל-100)."
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }

      for (let iter = 1; iter <= maxIterations; iter++) {
        const all = await client.entities.Client.list().catch(() => []);
        const candidates = (all || []).filter(c => {
          const name = (c?.name || '').trim();
          return name === '' || name === 'לקוח ללא שם';
        });

        const batchNote = { iteration: iter, fetched: all.length || 0, to_delete: candidates.length, deleted: 0, failed: 0, rate_limits: 0 };
        totalChecked += all.length || 0;

        if (candidates.length === 0) {
          iterations.push({ ...batchNote, note: 'no_more_candidates' });
          break;
        }

        const ids = candidates.map(c => c.id);
        for (let i = 0; i < ids.length; i += batchSize) {
          const chunk = ids.slice(i, i + batchSize);

          let attempt = 0;
          while (attempt < 3) {
            attempt++;
            const results = await Promise.allSettled(chunk.map(id => client.entities.Client.delete(id)));
            let needRetry = false;
            results.forEach((res) => {
              if (res.status === 'fulfilled') {
                batchNote.deleted++;
                totalDeleted++;
              } else {
                const msg = String(res.reason?.message || res.reason || '');
                if (/429|rate/i.test(msg)) {
                  needRetry = true;
                } else {
                  batchNote.failed++;
                  totalFailed++;
                }
              }
            });

            if (needRetry && attempt < 3) {
              batchNote.rate_limits++;
              totalRateLimited++;
              await sleep(500 * attempt);
            } else {
              break;
            }
          }

          if (i + batchSize < ids.length) await sleep(80);
        }

        iterations.push(batchNote);

        if (batchNote.to_delete < 1) break;

        await sleep(120);
      }

      return new Response(JSON.stringify({
        mode: 'deleteUnnamed',
        total_checked: totalChecked,
        total_deleted: totalDeleted,
        total_failed: totalFailed,
        total_rate_limits: totalRateLimited,
        batch_size: batchSize,
        max_iterations: maxIterations,
        iterations
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'No ids provided and deleteUnnamed=false' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error?.message || 'Unknown error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});