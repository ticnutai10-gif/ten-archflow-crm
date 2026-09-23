import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accessToken = await base44.asServiceRole.connectors.getAccessToken("googlecalendar");
    const body = await req.json();
    const { action, data } = body;

    const CALENDAR_API = 'https://www.googleapis.com/calendar/v3';

    // Helper function to make Google Calendar API calls
    async function gcalFetch(endpoint, options = {}) {
      const response = await fetch(`${CALENDAR_API}${endpoint}`, {
        ...options,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          ...options.headers
        }
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Google Calendar API error: ${error}`);
      }
      
      return response.json();
    }

    switch (action) {
      case 'listCalendars': {
        const calendars = await gcalFetch('/users/me/calendarList');
        return Response.json({ calendars: calendars.items || [] });
      }

      case 'listEvents': {
        const { calendarId = 'primary', timeMin, timeMax, maxResults = 100 } = data || {};
        const params = new URLSearchParams({
          maxResults: maxResults.toString(),
          singleEvents: 'true',
          orderBy: 'startTime'
        });
        
        if (timeMin) params.append('timeMin', new Date(timeMin).toISOString());
        if (timeMax) params.append('timeMax', new Date(timeMax).toISOString());
        
        const events = await gcalFetch(`/calendars/${encodeURIComponent(calendarId)}/events?${params}`);
        return Response.json({ events: events.items || [] });
      }

      case 'createEvent': {
        const { calendarId = 'primary', event } = data;
        const createdEvent = await gcalFetch(`/calendars/${encodeURIComponent(calendarId)}/events`, {
          method: 'POST',
          body: JSON.stringify(event)
        });
        return Response.json({ event: createdEvent });
      }

      case 'updateEvent': {
        const { calendarId = 'primary', eventId, event } = data;
        const updatedEvent = await gcalFetch(`/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`, {
          method: 'PUT',
          body: JSON.stringify(event)
        });
        return Response.json({ event: updatedEvent });
      }

      case 'deleteEvent': {
        const { calendarId = 'primary', eventId } = data;
        await fetch(`${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        return Response.json({ success: true });
      }

      case 'exportMeeting': {
        const { meeting, calendarId = 'primary' } = data;
        
        const startDate = new Date(meeting.meeting_date);
        const endDate = new Date(startDate.getTime() + (meeting.duration_minutes || 60) * 60000);
        
        const event = {
          summary: meeting.title,
          description: [
            meeting.description || '',
            meeting.client_name ? `לקוח: ${meeting.client_name}` : '',
            meeting.project_name ? `פרויקט: ${meeting.project_name}` : '',
            meeting.notes || ''
          ].filter(Boolean).join('\n'),
          location: meeting.location || '',
          start: {
            dateTime: startDate.toISOString(),
            timeZone: 'Asia/Jerusalem'
          },
          end: {
            dateTime: endDate.toISOString(),
            timeZone: 'Asia/Jerusalem'
          },
          reminders: {
            useDefault: false,
            overrides: meeting.reminder_enabled ? [
              { method: 'popup', minutes: meeting.reminder_before_minutes || 60 }
            ] : []
          }
        };

        let createdEvent;
        if (meeting.google_calendar_event_id) {
          // Update existing event
          createdEvent = await gcalFetch(`/calendars/${encodeURIComponent(calendarId)}/events/${meeting.google_calendar_event_id}`, {
            method: 'PUT',
            body: JSON.stringify(event)
          });
        } else {
          // Create new event
          createdEvent = await gcalFetch(`/calendars/${encodeURIComponent(calendarId)}/events`, {
            method: 'POST',
            body: JSON.stringify(event)
          });
        }

        // Update meeting with Google Calendar event ID
        if (meeting.id && createdEvent.id) {
          await base44.entities.Meeting.update(meeting.id, {
            google_calendar_event_id: createdEvent.id
          });
        }

        return Response.json({ event: createdEvent, meeting_id: meeting.id });
      }

      case 'exportTask': {
        const { task, calendarId = 'primary' } = data;
        
        if (!task.due_date) {
          return Response.json({ error: 'Task has no due date' }, { status: 400 });
        }

        const dueDate = new Date(task.due_date);
        const event = {
          summary: `[משימה] ${task.title}`,
          description: [
            task.description || '',
            task.client_name ? `לקוח: ${task.client_name}` : '',
            task.project_name ? `פרויקט: ${task.project_name}` : '',
            `עדיפות: ${task.priority || 'בינונית'}`,
            `סטטוס: ${task.status || 'חדשה'}`
          ].filter(Boolean).join('\n'),
          start: {
            date: dueDate.toISOString().split('T')[0]
          },
          end: {
            date: dueDate.toISOString().split('T')[0]
          },
          colorId: task.priority === 'גבוהה' ? '11' : task.priority === 'נמוכה' ? '7' : '5'
        };

        const createdEvent = await gcalFetch(`/calendars/${encodeURIComponent(calendarId)}/events`, {
          method: 'POST',
          body: JSON.stringify(event)
        });

        return Response.json({ event: createdEvent });
      }

      case 'importEvents': {
        const { calendarId = 'primary', timeMin, timeMax, createMeetings = true } = data || {};
        
        const params = new URLSearchParams({
          maxResults: '250',
          singleEvents: 'true',
          orderBy: 'startTime'
        });
        
        const now = new Date();
        params.append('timeMin', timeMin ? new Date(timeMin).toISOString() : now.toISOString());
        if (timeMax) params.append('timeMax', new Date(timeMax).toISOString());
        
        const events = await gcalFetch(`/calendars/${encodeURIComponent(calendarId)}/events?${params}`);
        
        const imported = [];
        const existingMeetings = await base44.entities.Meeting.list();
        const existingEventIds = new Set(existingMeetings.map(m => m.google_calendar_event_id).filter(Boolean));

        for (const event of (events.items || [])) {
          if (existingEventIds.has(event.id)) {
            continue; // Skip already imported events
          }

          if (createMeetings && event.start) {
            const meetingDate = event.start.dateTime || event.start.date;
            
            let durationMinutes = 60;
            if (event.start.dateTime && event.end?.dateTime) {
              durationMinutes = Math.round((new Date(event.end.dateTime) - new Date(event.start.dateTime)) / 60000);
            }

            const newMeeting = await base44.entities.Meeting.create({
              title: event.summary || 'אירוע מיובא',
              description: event.description || '',
              meeting_date: meetingDate,
              duration_minutes: durationMinutes,
              location: event.location || '',
              status: 'מתוכננת',
              meeting_type: 'אחר',
              google_calendar_event_id: event.id
            });

            imported.push(newMeeting);
          }
        }

        return Response.json({ 
          imported: imported.length,
          total_events: events.items?.length || 0,
          meetings: imported
        });
      }

      case 'syncAll': {
        const { calendarId = 'primary' } = data || {};
        
        // Export all meetings that don't have Google Calendar ID
        const meetings = await base44.entities.Meeting.list();
        const exported = [];
        
        for (const meeting of meetings) {
          if (!meeting.google_calendar_event_id && meeting.meeting_date) {
            try {
              const startDate = new Date(meeting.meeting_date);
              const endDate = new Date(startDate.getTime() + (meeting.duration_minutes || 60) * 60000);
              
              const event = {
                summary: meeting.title,
                description: meeting.description || '',
                location: meeting.location || '',
                start: {
                  dateTime: startDate.toISOString(),
                  timeZone: 'Asia/Jerusalem'
                },
                end: {
                  dateTime: endDate.toISOString(),
                  timeZone: 'Asia/Jerusalem'
                }
              };

              const createdEvent = await gcalFetch(`/calendars/${encodeURIComponent(calendarId)}/events`, {
                method: 'POST',
                body: JSON.stringify(event)
              });

              await base44.entities.Meeting.update(meeting.id, {
                google_calendar_event_id: createdEvent.id
              });

              exported.push(meeting.id);
            } catch (e) {
              console.error(`Failed to export meeting ${meeting.id}:`, e);
            }
          }
        }

        return Response.json({ 
          exported: exported.length,
          message: `סונכרנו ${exported.length} פגישות ל-Google Calendar`
        });
      }

      default:
        return Response.json({ error: 'Unknown action' }, { status: 400 });
    }

  } catch (error) {
    console.error('Google Calendar sync error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});