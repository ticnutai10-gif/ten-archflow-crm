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

    console.log("[exportEntities] Starting export for user:", me.email);

    const payload = await req.json().catch(() => ({}));
    const categories = Array.isArray(payload?.categories) && payload.categories.length ? payload.categories : [
      'Client','Project','Task','TimeLog','Quote','Invoice','Decision','ClientApproval','ClientFeedback','CommunicationMessage','Document','TeamMember','AccessControl','ClientFile','QuoteFile'
    ];
    const limit = Math.max(1000, Number(payload?.limit) || 5000);
    const format = payload?.format || 'json'; // json, excel, csv, xml

    console.log("[exportEntities] Categories to export:", categories);
    console.log("[exportEntities] Limit per entity:", limit);
    console.log("[exportEntities] Format requested:", format);

    const elevate = await canElevateToService(base44, me);
    const client = elevate ? base44.asServiceRole : base44;

    console.log("[exportEntities] Using service role:", elevate);

    const data = {};
    let totalRecords = 0;

    for (const entityName of categories) {
      try {
        console.log(`[exportEntities] Fetching ${entityName}...`);
        const startTime = Date.now();
        
        const rows = await client.entities[entityName].filter({}, '-created_date', limit);
        const fetchTime = Date.now() - startTime;
        
        data[entityName] = rows || [];
        const recordCount = (rows || []).length;
        totalRecords += recordCount;
        
        console.log(`[exportEntities] ${entityName}: ${recordCount} records (${fetchTime}ms)`);
        
        // Log first record structure for debugging
        if (recordCount > 0) {
          console.log(`[exportEntities] ${entityName} first record keys:`, Object.keys(rows[0]));
        }
      } catch (e) {
        console.error(`[exportEntities] Error fetching ${entityName}:`, e?.message || e);
        data[entityName] = { error: String(e?.message || e) };
      }
    }

    console.log(`[exportEntities] Total records exported: ${totalRecords}`);

    const exportData = {
      generated_at: new Date().toISOString(),
      by: me.email,
      total_records: totalRecords,
      categories: categories,
      data: data
    };

    // Return different formats based on request
    if (format === 'json') {
      const jsonOutput = JSON.stringify(exportData, null, 2);
      const bytes = new TextEncoder().encode(jsonOutput);
      
      console.log(`[exportEntities] JSON output size: ${bytes.length} bytes (${(bytes.length/1024).toFixed(1)}KB)`);

      return new Response(bytes, {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': 'attachment; filename=backup.json',
          'Content-Length': bytes.length.toString()
        }
      });
    }

    // For other formats, we'll return the data structure that can be processed by the frontend
    return Response.json({
      success: true,
      format: format,
      total_records: totalRecords,
      data: exportData
    });

  } catch (error) {
    console.error("[exportEntities] Fatal error:", error?.message || error);
    return Response.json({ 
      error: error?.message || 'Unknown error',
      stack: error?.stack || 'No stack trace'
    }, { status: 500 });
  }
});