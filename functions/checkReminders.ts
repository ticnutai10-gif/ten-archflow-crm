import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { zonedTimeToUtc } from 'npm:date-fns-tz@2.0.0';

const TIMEZONE = 'Asia/Jerusalem';

// Helper to safely parse date, treating timezone-less strings as Jerusalem time
const parseReminderDate = (dateStr) => {
  if (!dateStr) return null;
  // If it ends in Z or has timezone offset, let standard Date handle it
  if (dateStr.endsWith('Z') || dateStr.includes('+')) {
    return new Date(dateStr);
  }
  // Otherwise treat as local Jerusalem time
  try {
    return zonedTimeToUtc(dateStr, TIMEZONE);
  } catch (e) {
    return new Date(dateStr); // Fallback
  }
};

export default Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // 1. Get all pending reminders that are due
    const now = new Date();
    
    // Debug info storage
    const debugInfo = {
      serverTime: now.toISOString(),
      serverTimeLocalApprox: now.toLocaleString("en-US", {timeZone: TIMEZONE}),
      checked: { tasks: 0, meetings: 0, reminders: 0 },
      skipped: [],
    };

    const pendingReminders = await base44.asServiceRole.entities.Reminder.filter({ 
      status: 'pending' 
    });
    debugInfo.checked.reminders = pendingReminders.length;

    // 1a. Fetch Tasks
    const pendingTasks = await base44.asServiceRole.entities.Task.filter({ 
      status: { $ne: 'הושלמה' }
    });
    debugInfo.checked.tasks = pendingTasks.length;
    
    // 1b. Fetch Meetings
    const pendingMeetings = await base44.asServiceRole.entities.Meeting.filter({
      status: { $in: ['מתוכננת', 'אושרה'] }
    });
    debugInfo.checked.meetings = pendingMeetings.length;

    const dueTaskReminders = [];
    for (const t of pendingTasks) {
      // Legacy support
      if (t.reminder_enabled && !t.reminder_sent && t.reminder_at) {
        const reminderTime = parseReminderDate(t.reminder_at);
        if (reminderTime <= now) {
          dueTaskReminders.push({
            type: 'task',
            entityId: t.id,
            target_name: t.title,
            reminder_date: reminderTime.toISOString(),
            created_by: t.created_by,
            notify_email: t.notify_email,
            notify_whatsapp: t.notify_whatsapp,
            message: `תזכורת למשימה: ${t.title}`,
            email_recipients: t.email_recipients,
            whatsapp_recipients: t.whatsapp_recipients,
            isLegacy: true
          });
        } else {
          // Log skipped nearby items for debugging (e.g. within next 24h)
          if (reminderTime.getTime() - now.getTime() < 86400000) {
            debugInfo.skipped.push({ type: 'task-legacy', id: t.id, title: t.title, time: reminderTime.toISOString(), reason: 'future' });
          }
        }
      }

      // New multiple reminders support
      if (t.reminders && Array.isArray(t.reminders)) {
        t.reminders.forEach((r, idx) => {
          if (r.sent) return;
          
          let reminderTime;
          if (r.reminder_at) {
            reminderTime = parseReminderDate(r.reminder_at);
          } else if (r.minutes_before && t.due_date) {
             // Fallback for simple date: assume 09:00 Jerusalem time if only date is given
             // But t.due_date is typically YYYY-MM-DD. 
             // We'll skip for now to avoid complexity, usually reminder_at is set.
             return; 
          } else {
            return;
          }

          if (reminderTime <= now) {
            dueTaskReminders.push({
              type: 'task',
              entityId: t.id,
              target_name: t.title,
              reminder_date: reminderTime.toISOString(),
              created_by: t.created_by,
              notify_email: r.notify_email,
              notify_whatsapp: r.notify_whatsapp,
              notify_sms: r.notify_sms,
              message: `תזכורת למשימה: ${t.title}`,
              email_recipients: t.email_recipients,
              whatsapp_recipients: t.whatsapp_recipients,
              sms_recipients: t.sms_recipients,
              reminderIndex: idx,
              isLegacy: false
            });
          } else {
             if (reminderTime.getTime() - now.getTime() < 86400000) {
                debugInfo.skipped.push({ type: 'task', id: t.id, title: t.title, time: reminderTime.toISOString(), reason: 'future', idx });
             }
          }
        });
      }
    }
    
    const dueMeetingReminders = [];
    for (const m of pendingMeetings) {
      if (!m.reminders || !Array.isArray(m.reminders)) continue;
      
      const meetingTime = parseReminderDate(m.meeting_date);
      
      m.reminders.forEach((r, idx) => {
        if (r.sent) return;
        
        const reminderTime = new Date(meetingTime.getTime() - r.minutes_before * 60000);
        if (reminderTime <= now) {
          dueMeetingReminders.push({
            type: 'meeting',
            entityId: m.id,
            target_name: m.title,
            reminder_date: reminderTime.toISOString(),
            created_by: m.created_by,
            notify_email: r.notify_email,
            notify_whatsapp: r.notify_whatsapp,
            notify_sms: r.notify_sms,
            message: `תזכורת לפגישה: ${m.title} (${r.minutes_before} דקות לפני)`,
            email_recipients: m.email_recipients,
            whatsapp_recipients: m.whatsapp_recipients,
            sms_recipients: m.sms_recipients,
            reminderIndex: idx
          });
        } else {
           if (reminderTime.getTime() - now.getTime() < 86400000) {
              debugInfo.skipped.push({ type: 'meeting', id: m.id, title: m.title, time: reminderTime.toISOString(), reason: 'future', idx });
           }
        }
      });
    }

    // Combine all
    const allItems = [
      ...pendingReminders.filter(r => {
        const rt = parseReminderDate(r.reminder_date);
        return rt <= now;
      }).map(r => ({ ...r, type: 'reminder', entityId: r.id })),
      ...dueTaskReminders,
      ...dueMeetingReminders
    ];

    const dueItems = allItems; // already filtered

    console.log(`Found ${dueItems.length} due items.`);
    
    if (dueItems.length === 0) {
       console.log("No due items found. Debug info:", JSON.stringify(debugInfo, null, 2));
    }

    const results = [];

    for (const item of dueItems) {
      try {
        const creatorEmail = item.created_by_email || item.created_by; // created_by is standard field with email
        
        // 2. Prepare recipients
        const recipients = [];
        
        // Priority: Explicit recipients list -> then creator/additional
        if (item.email_recipients && Array.isArray(item.email_recipients) && item.email_recipients.length > 0) {
          recipients.push(...item.email_recipients);
        } else {
          // Fallback to creator if no explicit recipients
          if (creatorEmail) recipients.push(creatorEmail);
        }

        // Add additional emails from reminder entity if exists
        if (item.additional_emails && Array.isArray(item.additional_emails)) {
          recipients.push(...item.additional_emails);
        }
        
        const uniqueRecipients = [...new Set(recipients)].filter(e => e && e.includes('@'));

        // 3a. Send Emails
        if (item.notify_email !== false || item.type === 'reminder') { // Default to sending for generic reminders if logic allows
           for (const to of uniqueRecipients) {
            await base44.asServiceRole.integrations.Core.SendEmail({
              to: to,
              subject: `תזכורת: ${item.target_name || 'ללא שם'}`,
              body: `
                <div dir="rtl" style="font-family: Arial, sans-serif;">
                  <h2>תזכורת</h2>
                  <p>שלום,</p>
                  <p>זוהי תזכורת עבור: <strong>${item.target_name}</strong></p>
                  ${item.message ? `<p>${item.message}</p>` : ''}
                  <p>מועד התזכורת: ${new Date(item.reminder_date).toLocaleString('he-IL')}</p>
                  <br/>
                  <p>בברכה,<br/>מערכת CRM</p>
                </div>
              `
            });
          }
        }

        // 3b. Send WhatsApp
        if (item.notify_whatsapp) {
           // Prepare WhatsApp recipients
           const whatsappRecipients = [];
           if (item.whatsapp_recipients && Array.isArray(item.whatsapp_recipients) && item.whatsapp_recipients.length > 0) {
             whatsappRecipients.push(...item.whatsapp_recipients);
           } else {
             // Fallback: If no explicit recipients, we don't have a phone number for the creator easily available (only email).
             // We can only send if we have explicit recipients or if we can look up user phone.
             // For now, if no recipients, we skip or maybe log for admin.
           }

           // Send to each recipient
           for (const phone of whatsappRecipients) {
             try {
               await base44.asServiceRole.entities.CommunicationMessage.create({
                 type: 'whatsapp',
                 direction: 'outbound',
                 content: `🔔 תזכורת: ${item.target_name}\n${item.message || ''}\nמועד: ${new Date(item.reminder_date).toLocaleString('he-IL')}`,
                 status: 'pending', 
                 metadata: { target_phone: phone, source: 'reminder_system' }
               });
             } catch(e) { console.warn("Could not create WhatsApp message", e); }
           }
        }

        // 3c. Send SMS
        if (item.notify_sms) {
           const smsRecipients = [];
           if (item.sms_recipients && Array.isArray(item.sms_recipients) && item.sms_recipients.length > 0) {
             smsRecipients.push(...item.sms_recipients);
           }
           
           for (const phone of smsRecipients) {
             try {
               await base44.asServiceRole.entities.CommunicationMessage.create({
                 type: 'sms',
                 direction: 'outbound',
                 recipient: phone,
                 content: `🔔 תזכורת: ${item.target_name}\n${item.message || ''}`,
                 status: 'pending', 
                 metadata: { source: 'reminder_system' }
               });
             } catch(e) { console.warn("Could not create SMS message", e); }
           }
        }

        // 4. Update status to sent & Handle Recurrence
        const getNextDate = (currentDate, recurrence) => {
          const date = new Date(currentDate);
          const { frequency, interval = 1 } = recurrence;
          switch (frequency) {
            case 'daily': date.setDate(date.getDate() + interval); break;
            case 'weekly': date.setDate(date.getDate() + (interval * 7)); break;
            case 'monthly': date.setMonth(date.getMonth() + interval); break;
            case 'yearly': date.setFullYear(date.getFullYear() + interval); break;
          }
          return date;
        };

        if (item.type === 'reminder') {
          const r = await base44.asServiceRole.entities.Reminder.get(item.entityId);
          await base44.asServiceRole.entities.Reminder.update(item.entityId, { status: 'sent' });
          
          if (r && r.recurrence?.enabled && r.recurrence?.frequency) {
             const nextDate = getNextDate(r.reminder_date, r.recurrence);
             if (!r.recurrence.end_date || nextDate <= new Date(r.recurrence.end_date)) {
               await base44.asServiceRole.entities.Reminder.create({
                 ...r,
                 id: undefined, created_date: undefined, updated_date: undefined,
                 reminder_date: nextDate.toISOString(),
                 status: 'pending'
               });
             }
          }
        } else if (item.type === 'task') {
          await base44.asServiceRole.entities.Task.update(item.entityId, { reminder_sent: true });
        } else if (item.type === 'meeting') {
          // We need to fetch the meeting again to ensure we don't overwrite other updates, 
          // but for simplicity we assume race conditions are rare on the same second.
          // Better: Use $set on specific array element if supported, but usually update needs full object or top level fields.
          // We'll read, update specific index, and write back.
          const meeting = await base44.asServiceRole.entities.Meeting.get(item.entityId);
          if (meeting && meeting.reminders && meeting.reminders[item.reminderIndex]) {
            meeting.reminders[item.reminderIndex].sent = true;
            await base44.asServiceRole.entities.Meeting.update(item.entityId, { reminders: meeting.reminders });
          }
        }

        results.push({ id: item.entityId, status: 'sent', recipients: uniqueRecipients });

      } catch (err) {
        console.error(`Failed to process item ${item.entityId}:`, err);
        results.push({ id: item.entityId, status: 'failed', error: err.message });
      }
    }

    return Response.json({ success: true, processed: results.length, results, debugInfo });

  } catch (error) {
    console.error('Check Reminders Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});