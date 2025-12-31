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

    const dueReminders = pendingReminders.filter(r => new Date(r.reminder_date) <= now);

    console.log(`Found ${dueReminders.length} due reminders.`);

    const results = [];

    for (const reminder of dueReminders) {
      try {
        // 2. Prepare emails
        const recipients = [reminder.created_by_email];
        if (reminder.additional_emails && Array.isArray(reminder.additional_emails)) {
          recipients.push(...reminder.additional_emails);
        }
        
        // Remove duplicates and invalid emails
        const uniqueRecipients = [...new Set(recipients)].filter(e => e && e.includes('@'));

        // 3. Send Emails
        for (const to of uniqueRecipients) {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: to,
            subject: `תזכורת: ${reminder.target_name || 'ללא שם'}`,
            body: `
              <div dir="rtl" style="font-family: Arial, sans-serif;">
                <h2>תזכורת</h2>
                <p>שלום,</p>
                <p>זוהי תזכורת עבור: <strong>${reminder.target_name}</strong></p>
                ${reminder.message ? `<p>הודעה: ${reminder.message}</p>` : ''}
                <p>מועד התזכורת: ${new Date(reminder.reminder_date).toLocaleString('he-IL')}</p>
                <br/>
                <p>בברכה,<br/>מערכת CRM</p>
              </div>
            `
          });
        }

        // 4. Update status to sent
        await base44.asServiceRole.entities.Reminder.update(reminder.id, {
          status: 'sent'
        });

        results.push({ id: reminder.id, status: 'sent', recipients: uniqueRecipients });

      } catch (err) {
        console.error(`Failed to process reminder ${reminder.id}:`, err);
        results.push({ id: reminder.id, status: 'failed', error: err.message });
      }
    }

    return Response.json({ success: true, processed: results.length, results });

  } catch (error) {
    console.error('Check Reminders Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});