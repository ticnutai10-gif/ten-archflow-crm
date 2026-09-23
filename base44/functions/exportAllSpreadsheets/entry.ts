import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const spreadsheetId = url.searchParams.get('id');
    const format = url.searchParams.get('format') || 'json';
    
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dateStr = new Date().toISOString().split('T')[0];

    // Export single spreadsheet
    if (spreadsheetId) {
      const spreadsheets = await base44.asServiceRole.entities.CustomSpreadsheet.filter({ id: spreadsheetId });
      if (!spreadsheets.length) {
        return Response.json({ error: 'Spreadsheet not found' }, { status: 404 });
      }
      
      const sheet = spreadsheets[0];
      const columns = sheet.columns || [];
      const rows = sheet.rows_data || [];
      const safeName = (sheet.name || 'spreadsheet').replace(/[^a-zA-Z0-9א-ת\s]/g, '_');
      
      if (format === 'xlsx' || format === 'excel') {
        // Tab-separated for Excel
        const headers = columns.map(c => c.title || c.key);
        const dataRows = rows.map(row => 
          columns.map(c => String(row[c.key] || '').replace(/\t/g, ' ').replace(/\n/g, ' '))
        );
        
        const xlsContent = '\uFEFF' + [
          headers.join('\t'),
          ...dataRows.map(r => r.join('\t'))
        ].join('\n');
        
        return new Response(xlsContent, {
          status: 200,
          headers: {
            'Content-Type': 'application/vnd.ms-excel; charset=utf-8',
            'Content-Disposition': `attachment; filename="${safeName}_${dateStr}.xls"`
          }
        });
      }
      
      if (format === 'csv') {
        const headers = columns.map(c => c.title || c.key);
        const dataRows = rows.map(row => 
          columns.map(c => `"${String(row[c.key] || '').replace(/"/g, '""')}"`)
        );
        
        const csvContent = '\uFEFF' + [
          headers.map(h => `"${h}"`).join(','),
          ...dataRows.map(r => r.join(','))
        ].join('\n');
        
        return new Response(csvContent, {
          status: 200,
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="${safeName}_${dateStr}.csv"`
          }
        });
      }
      
      // JSON format
      return new Response(JSON.stringify({
        name: sheet.name,
        columns,
        rows_data: rows,
        exported_at: new Date().toISOString()
      }, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': `attachment; filename="${safeName}_${dateStr}.json"`
        }
      });
    }

    // Export all spreadsheets (list)
    const spreadsheets = await base44.asServiceRole.entities.CustomSpreadsheet.list('-created_date', 1000);

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
        'Content-Disposition': `attachment; filename="all_spreadsheets_${dateStr}.json"`
      }
    });
  } catch (error) {
    console.error('Export error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});