import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

export default Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // 1. Get all pending reminders that are due
    // Note: We filter for reminders where reminder_date is less than or equal to now
    // Since we can't do complex date comparisons easily in filter sometimes, we'll fetch pending and filter in code or use available operators
    // Assuming we can use $lte operator if supported, otherwise fetch pending
    
    const now = new Date();
    const pendingReminders = await base44.asServiceRole.entities.Reminder.filter({ 
      status: 'pending' 
    });

    // 1a. Also fetch Tasks
    const pendingTasks = await base44.asServiceRole.entities.Task.filter({ 
      reminder_enabled: true,
      reminder_sent: false,
      status: { $ne: 'הושלמה' }
    });
    
    // 1b. Also fetch Meetings with pending reminders
    // This is heavier, so we fetch meetings in range or just all active ones.
    // For optimization, we should probably add a 'next_reminder_at' field to Meeting, but for now we'll scan recent/upcoming meetings.
    const pendingMeetings = await base44.asServiceRole.entities.Meeting.filter({
      status: { $in: ['מתוכננת', 'אושרה'] }
    });

    const dueTasks = pendingTasks.filter(t => t.reminder_at && new Date(t.reminder_at) <= now);
    
    const dueMeetingReminders = [];
    for (const m of pendingMeetings) {
      if (!m.reminders || !Array.isArray(m.reminders)) continue;
      
      const meetingTime = new Date(m.meeting_date);
      let updated = false;
      const newReminders = [...m.reminders];
      
      newReminders.forEach((r, idx) => {
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
            message: `תזכורת לפגישה: ${m.title} (${r.minutes_before} דקות לפני)`,
            email_recipients: m.email_recipients, // Use meeting-level recipients
            whatsapp_recipients: m.whatsapp_recipients,
            reminderIndex: idx
          });
          // Mark as sent in memory (we'll update DB later)
          // Actually we can't update DB easily in loop if we want to be safe, so we'll do it in the processing loop
        }
      });
    }

    // Combine all
    const allItems = [
      ...pendingReminders.filter(r => new Date(r.reminder_date) <= now).map(r => ({ ...r, type: 'reminder', entityId: r.id })),
      ...dueTasks.map(t => ({
        type: 'task',
        entityId: t.id,
        target_name: t.title,
        reminder_date: t.reminder_at,
        created_by: t.created_by,
        notify_email: t.notify_email,
        notify_whatsapp: t.notify_whatsapp,
        message: `תזכורת למשימה: ${t.title}`,
        email_recipients: t.email_recipients,
        whatsapp_recipients: t.whatsapp_recipients
      })),
      ...dueMeetingReminders
    ];

    const dueItems = allItems.filter(item => new Date(item.reminder_date) <= now);

    console.log(`Found ${dueItems.length} due items (Reminders + Tasks).`);

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
               // Create a CommunicationMessage for the agent to pick up
               await base44.asServiceRole.entities.CommunicationMessage.create({
                 type: 'whatsapp',
                 direction: 'outbound',
                 content: `🔔 תזכורת: ${item.target_name}\n${item.message || ''}\nמועד: ${new Date(item.reminder_date).toLocaleString('he-IL')}`,
                 status: 'pending', 
                 metadata: {
                   target_phone: phone,
                   source: 'reminder_system'
                 }
               });
             } catch(e) { console.warn("Could not create WhatsApp message", e); }
           }
        }

        // 4. Update status to sent
        if (item.type === 'reminder') {
          await base44.asServiceRole.entities.Reminder.update(item.entityId, { status: 'sent' });
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

    return Response.json({ success: true, processed: results.length, results });

  } catch (error) {
    console.error('Check Reminders Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});