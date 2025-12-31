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

    // 1a. Also fetch Tasks that have reminders enabled and not sent
    // We only care about email/whatsapp here. Audio/Popup is client side.
    const pendingTasks = await base44.asServiceRole.entities.Task.filter({ 
      reminder_enabled: true,
      reminder_sent: false,
      status: { $ne: 'הושלמה' }
    });

    const dueTasks = pendingTasks.filter(t => t.reminder_at && new Date(t.reminder_at) <= now);
    
    // Combine reminders and tasks
    const allItems = [
      ...dueReminders.map(r => ({ ...r, type: 'reminder', entityId: r.id })),
      ...dueTasks.map(t => ({
        type: 'task',
        entityId: t.id,
        target_name: t.title,
        reminder_date: t.reminder_at,
        created_by_email: null, // Need to find who to send to. For Task, it's assigned_to or creator? 
                                // We'll use a lookup or just create generic message if we can't find email. 
                                // Tasks usually don't store creator email directly on root unless 'created_by' field is standard (it is).
                                // But base44 entities have created_by (email).
        created_by: t.created_by, // Email
        notify_email: t.notify_email,
        notify_whatsapp: t.notify_whatsapp,
        message: `תזכורת למשימה: ${t.title}`
      }))
    ];

    const dueItems = allItems.filter(item => new Date(item.reminder_date) <= now);

    console.log(`Found ${dueItems.length} due items (Reminders + Tasks).`);

    const results = [];

    for (const item of dueItems) {
      try {
        const creatorEmail = item.created_by_email || item.created_by; // created_by is standard field with email
        
        // 2. Prepare recipients
        const recipients = [];
        if (creatorEmail) recipients.push(creatorEmail);
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
           // Create a CommunicationMessage to trigger whatsapp agent or log it
           // Since we don't have direct WhatsApp integration confirmed, we'll create a system message
           // that might be picked up by another process or serve as log.
           if (creatorEmail) {
             try {
               await base44.asServiceRole.entities.CommunicationMessage.create({
                 type: 'whatsapp',
                 direction: 'outbound',
                 content: `🔔 תזכורת: ${item.target_name} - ${new Date(item.reminder_date).toLocaleString('he-IL')}`,
                 status: 'pending', // Agent will pick this up hopefully
                 metadata: {
                   target_email: creatorEmail,
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
          // Only update if it was actually due and processed. 
          // Note: Client side audio polling also updates this. Race condition is acceptable (both set to true).
          await base44.asServiceRole.entities.Task.update(item.entityId, { reminder_sent: true });
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