import { createClientFromRequest } from 'npm:@base44/sdk@0.7.0';

// Supabase Edge Function endpoint URL
const SUPABASE_FUNCTION_URL = 'https://qtrypzzcjebvfcihiynt.supabase.co/functions/v1/google-sheets';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0cnlwenJjamVidmZjaWhpeW50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzA1NDQwNjcsImV4cCI6MjA0NjEyMDA2N30.KkzGOhB4aDyc6FLX3NrFvqX8k0nZCL5sAgaGmRmSQKM';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    // בדיקת אימות
    const isAuth = await base44.auth.isAuthenticated();
    if (!isAuth) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await base44.auth.me();
    const body = await req.json();

    console.log('SupabaseSheets request:', {
      action: body.action,
      user: user.email,
      title: body.title
    });

    // העברת הבקשה ל-Supabase Edge Function
    const response = await fetch(SUPABASE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY
      },
      body: JSON.stringify({
        ...body,
        user_email: user.email,
        app_id: 'arch-flow-crm'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Supabase function error:', errorText);
      throw new Error(`Supabase function failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('SupabaseSheets response:', result);

    // שמירת פרטי הגיליון במשתמש אם נוצר חדש
    if (body.action === 'create' && result.success && result.spreadsheetId) {
      await base44.asServiceRole.entities.User.update(user.id, {
        google_sheets_clients_id: result.spreadsheetId,
        google_sheets_clients_name: body.title || 'לקוחות CRM',
        google_sheets_clients_url: result.spreadsheetUrl
      });
    }

    return Response.json(result);

  } catch (error) {
    console.error('SupabaseSheets error:', error);
    return Response.json({
      error: error.message || 'שגיאה לא ידועה',
      details: error.stack?.split('\n').slice(0, 3)
    }, { status: 500 });
  }
});