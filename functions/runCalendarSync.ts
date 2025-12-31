import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Check if auto-sync is enabled via UserPreferences (or just run for all - safely)
    // Since we don't have a backend "list users" easy way without admin, and we want to sync for the current business context.
    // We'll invoke the sync logic directly.
    
    // We'll import events from Google Calendar to keep the app updated.
    // We assume 'primary' calendar.
    
    // Note: We need to use the stored refresh token to get an access token.
    // The SDK `getAccessToken` handles this for the App Connector.
    // This connects to the App Builder's calendar.
    
    console.log("Starting automatic calendar sync...");
    
    const now = new Date();
    const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // Sync 30 days ahead

    // 1. Import from Google
    const importRes = await base44.asServiceRole.functions.invoke('googleCalendarSync', {
      action: 'importEvents',
      data: {
        calendarId: 'primary',
        timeMin: now.toISOString(),
        timeMax: nextMonth.toISOString(),
        createMeetings: true
      }
    });

    // 2. Export to Google (Sync all pending)
    const exportRes = await base44.asServiceRole.functions.invoke('googleCalendarSync', {
      action: 'syncAll',
      data: { calendarId: 'primary' }
    });

    return Response.json({
      success: true,
      import: importRes.data,
      export: exportRes.data
    });

  } catch (error) {
    console.error('Auto Sync Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});