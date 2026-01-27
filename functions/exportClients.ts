import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all clients
    const clients = await base44.entities.Client.list();

    // CSV Header
    const headers = [
      'מזהה', 'שם', 'אימייל', 'טלפון', 'חברה', 'שלב', 'סטטוס', 
      'טווח תקציב', 'מקור', 'כתובת', 'תאריך יצירה', 'הערות'
    ];
    
    // Build CSV rows
    const rows = clients.map(c => {
      return [
        c.id,
        c.name || '',
        c.email || '',
        c.phone || '',
        c.company || '',
        c.stage || '',
        c.status || '',
        c.budget_range || '',
        c.source || '',
        c.address || '',
        c.created_date ? new Date(c.created_date).toLocaleDateString('he-IL') : '',
        (c.notes || '').replace(/\n/g, ' ')
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
    });

    const csv = '\uFEFF' + [headers.join(','), ...rows].join('\n');

    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename=clients.csv'
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});