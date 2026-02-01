import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const spreadsheets = await base44.asServiceRole.entities.CustomSpreadsheet.list('-created_date', 1000);

    // Create a JSON with all spreadsheets data
    const exportData = {
      metadata: {
        exported_at: new Date().toISOString(),
        exported_by: user.email,
        total_spreadsheets: spreadsheets.length
      },
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
        created_date: s.created_date,
        updated_date: s.updated_date
      }))
    };

    return new Response(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="all_spreadsheets_${new Date().toISOString().split('T')[0]}.json"`
      }
    });
  } catch (error) {
    console.error('Export error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});