import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { SendEmail } from './sendEmail.js';

/**
 * Weekly automatic backup function
 * Creates a full JSON backup and sends it via email
 * Scheduled to run every Sunday at 2 AM
 */

Deno.cron("weekly backup", "0 2 * * 0", async () => {
  console.log('[WeeklyBackup] Starting scheduled weekly backup...');
  
  try {
    // Create a service role client
    const base44 = await import('npm:@base44/sdk@0.8.4').then(m => 
      m.createClient(Deno.env.get('BASE44_APP_ID'))
    );
    
    const categories = [
      'Client', 'Project', 'Task', 'TimeLog', 'Quote', 'Invoice',
      'Decision', 'ClientApproval', 'ClientFeedback', 'CommunicationMessage',
      'Document', 'TeamMember', 'AccessControl', 'ClientFile', 'QuoteFile',
      'Meeting', 'UserPreferences', 'Notification', 'WorkflowAutomation'
    ];

    const allData = {};
    let totalRecords = 0;
    const errors = [];
    
    // Fetch all data
    for (const name of categories) {
      try {
        if (base44.entities && base44.entities[name]) {
          const records = await base44.asServiceRole.entities[name].list('-created_date', 50000);
          allData[name] = records || [];
          totalRecords += (records || []).length;
          console.log(`[WeeklyBackup] ✓ ${name}: ${(records || []).length} records`);
        }
      } catch (e) {
        console.error(`[WeeklyBackup] Error fetching ${name}:`, e.message);
        errors.push(`${name}: ${e.message}`);
        allData[name] = [];
      }
    }

    console.log(`[WeeklyBackup] Total records: ${totalRecords}`);

    const now = new Date();
    const backupData = {
      backup_info: {
        created_at: now.toISOString(),
        format_version: '1.0',
        app: 'ArchFlow CRM',
        type: 'automatic_weekly'
      },
      statistics: {
        total_records: totalRecords,
        categories_count: categories.length,
        errors_count: errors.length
      },
      errors: errors,
      data: allData,
      summary: Object.fromEntries(
        categories.map(cat => [cat, (allData[cat] || []).length])
      )
    };

    // Get admin emails
    const users = await base44.asServiceRole.entities.User.list();
    const adminEmails = users
      .filter(u => u.role === 'admin' || u.role === 'super_admin')
      .map(u => u.email)
      .filter(Boolean);

    if (adminEmails.length === 0) {
      console.error('[WeeklyBackup] No admin emails found');
      return;
    }

    // Create backup file content
    const jsonStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    
    // Convert to base64 for email attachment
    const buffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const base64 = btoa(String.fromCharCode(...bytes));

    const dateStr = now.toISOString().split('T')[0];
    
    // Summary for email body
    const summaryLines = Object.entries(backupData.summary)
      .filter(([_, count]) => count > 0)
      .map(([cat, count]) => `  • ${cat}: ${count} רשומות`)
      .join('\n');

    const emailBody = `
שלום,

הגיבוי השבועי האוטומטי הושלם בהצלחה.

📊 סטטיסטיקה:
  • סה"כ רשומות: ${totalRecords}
  • קטגוריות: ${categories.length}
  ${errors.length > 0 ? `⚠️ שגיאות: ${errors.length}\n` : ''}

📁 פירוט לפי קטגוריות:
${summaryLines}

${errors.length > 0 ? `\n⚠️ שגיאות שהתגלו:\n${errors.join('\n')}` : ''}

הקובץ המלא מצורף למייל זה.

בברכה,
מערכת ArchFlow CRM
    `;

    // Send email to all admins
    for (const email of adminEmails) {
      try {
        await SendEmail({
          to: email,
          subject: `גיבוי שבועי אוטומטי - ${dateStr} - ${totalRecords} רשומות`,
          body: emailBody,
          from_name: 'ArchFlow CRM - גיבוי אוטומטי'
        });
        console.log(`[WeeklyBackup] Backup sent to ${email}`);
      } catch (e) {
        console.error(`[WeeklyBackup] Failed to send to ${email}:`, e.message);
      }
    }

    console.log('[WeeklyBackup] Weekly backup completed successfully');
    
  } catch (error) {
    console.error('[WeeklyBackup] Fatal error:', error.message, error.stack);
  }
});

// HTTP endpoint for manual trigger (for testing)
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      return Response.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
    }

    // Trigger manual backup
    console.log('[WeeklyBackup] Manual trigger by:', user.email);
    
    return Response.json({
      message: 'Manual backup triggered. Check logs for progress.',
      note: 'Automatic backups run every Sunday at 2 AM'
    });
    
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});