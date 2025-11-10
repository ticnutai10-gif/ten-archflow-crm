import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ 
        success: false, 
        error: 'Unauthorized',
        needsAuth: true 
      }, { status: 401 });
    }

    // Parse request body
    const payload = await req.json().catch(() => ({ method: 'export' }));
    const method = payload.method || 'export';

    // Check if Google is connected
    if (!user.google_refresh_token) {
      return Response.json({
        success: false,
        error: 'Google Calendar לא מחובר',
        needsAuth: true
      }, { status: 400 });
    }

    // Get valid access token
    let accessToken = user.google_access_token;
    
    // Check if token needs refresh
    const expiryDate = user.google_token_expiry ? new Date(user.google_token_expiry) : null;
    const now = new Date();
    const needsRefresh = !expiryDate || (expiryDate.getTime() - now.getTime()) < 5 * 60 * 1000;

    if (needsRefresh) {
      const CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID");
      const CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET");

      if (!CLIENT_ID || !CLIENT_SECRET) {
        return Response.json({
          success: false,
          error: 'הגדרות Google לא קיימות במערכת'
        }, { status: 500 });
      }

      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          refresh_token: user.google_refresh_token,
          grant_type: 'refresh_token'
        })
      });

      if (!tokenResponse.ok) {
        return Response.json({
          success: false,
          error: 'פג תוקף ההתחברות, יש להתחבר מחדש',
          needsAuth: true
        }, { status: 401 });
      }

      const tokenData = await tokenResponse.json();
      const newExpiry = new Date(Date.now() + (tokenData.expires_in * 1000));
      
      await base44.auth.updateMe({
        google_access_token: tokenData.access_token,
        google_token_expiry: newExpiry.toISOString()
      });

      accessToken = tokenData.access_token;
    }

    // Export to Google Calendar
    if (method === 'export') {
      const meetings = await base44.entities.Meeting.filter({
        status: { $in: ['מתוכננת', 'אושרה'] }
      });

      let created = 0;
      let updated = 0;
      let errors = 0;

      for (const meeting of meetings) {
        try {
          const event = {
            summary: meeting.title || 'פגישה',
            description: meeting.description || '',
            location: meeting.location || '',
            start: {
              dateTime: meeting.meeting_date,
              timeZone: 'Asia/Jerusalem'
            },
            end: {
              dateTime: new Date(new Date(meeting.meeting_date).getTime() + (meeting.duration_minutes || 60) * 60000).toISOString(),
              timeZone: 'Asia/Jerusalem'
            },
            reminders: {
              useDefault: false,
              overrides: [{ method: 'popup', minutes: meeting.reminder_before_minutes || 60 }]
            }
          };

          if (meeting.google_calendar_event_id) {
            // Update existing
            const response = await fetch(
              `https://www.googleapis.com/calendar/v3/calendars/primary/events/${meeting.google_calendar_event_id}`,
              {
                method: 'PUT',
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify(event)
              }
            );

            if (response.ok) {
              updated++;
            } else {
              errors++;
            }
          } else {
            // Create new
            const response = await fetch(
              'https://www.googleapis.com/calendar/v3/calendars/primary/events',
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify(event)
              }
            );

            if (response.ok) {
              const eventData = await response.json();
              await base44.entities.Meeting.update(meeting.id, {
                google_calendar_event_id: eventData.id
              });
              created++;
            } else {
              errors++;
            }
          }
        } catch (error) {
          console.error('Error syncing meeting:', error);
          errors++;
        }
      }

      return Response.json({
        success: true,
        message: `סונכרנו ${created + updated} פגישות (${created} חדשות, ${updated} עודכנו)`,
        details: { created, updated, errors }
      });
    }

    // Import from Google Calendar
    if (method === 'import') {
      const now = new Date();
      const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?` + new URLSearchParams({
          timeMin: now.toISOString(),
          timeMax: futureDate.toISOString(),
          singleEvents: 'true',
          orderBy: 'startTime'
        }),
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        return Response.json({
          success: false,
          error: 'שגיאה בקריאת אירועים מ-Google Calendar'
        }, { status: 500 });
      }

      const data = await response.json();
      const events = data.items || [];

      let imported = 0;
      let skipped = 0;
      let errors = 0;

      for (const event of events) {
        try {
          if (!event.start?.dateTime) {
            skipped++;
            continue;
          }

          // Check if already exists
          const existing = await base44.entities.Meeting.filter({
            google_calendar_event_id: event.id
          });

          if (existing.length > 0) {
            skipped++;
            continue;
          }

          // Create new meeting
          await base44.entities.Meeting.create({
            title: event.summary || 'אירוע מ-Google Calendar',
            description: event.description || '',
            meeting_date: event.start.dateTime,
            duration_minutes: Math.round((new Date(event.end.dateTime) - new Date(event.start.dateTime)) / 60000),
            location: event.location || '',
            google_calendar_event_id: event.id,
            status: 'אושרה',
            meeting_type: 'אחר',
            color: 'blue'
          });

          imported++;
        } catch (error) {
          console.error('Error importing event:', error);
          errors++;
        }
      }

      return Response.json({
        success: true,
        message: `יובאו ${imported} אירועים חדשים (${skipped} כבר קיימים)`,
        details: { imported, skipped, errors }
      });
    }

    return Response.json({
      success: false,
      error: 'Invalid method'
    }, { status: 400 });

  } catch (error) {
    console.error('Google Calendar Sync Error:', error);
    return Response.json({
      success: false,
      error: error.message || 'שגיאה לא צפויה',
      stack: error.stack
    }, { status: 500 });
  }
});