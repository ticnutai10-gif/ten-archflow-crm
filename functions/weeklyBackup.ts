import { createClient } from 'npm:@base44/sdk@0.8.4';

/**
 * Weekly automatic backup - runs every Sunday at 2 AM
 * Creates full JSON backup and sends to all admins via email
 */

async function performBackup() {
  console.log('[WeeklyBackup] 🚀 Starting backup...');
  
  try {
    const base44 = createClient(Deno.env.get('BASE44_APP_ID'));
    
    const categories = [
      'Client', 'Project', 'Task', 'TimeLog', 'Quote', 'Invoice',
      'Decision', 'ClientApproval', 'ClientFeedback', 'CommunicationMessage',
      'Document', 'TeamMember', 'AccessControl', 'ClientFile', 'QuoteFile',
      'Meeting', 'UserPreferences', 'Notification', 'WorkflowAutomation',
      'InternalChat', 'InternalMessage', 'ChatConversation', 'CustomSpreadsheet',
      'DailyReportSchedule', 'SubTask', 'MessageTemplate', 'AIInsight',
      'AutomationRule'
    ];

    const allData = {};
    let totalRecords = 0;
    const errors = [];
    
    for (const name of categories) {
      try {
        if (base44.entities && base44.entities[name]) {
          const records = await base44.asServiceRole.entities[name].list('-created_date', 100000);
          allData[name] = records || [];
          totalRecords += (records || []).length;
          console.log(`[WeeklyBackup] ✓ ${name}: ${(records || []).length} רשומות`);
        }
      } catch (e) {
        console.error(`[WeeklyBackup] ❌ ${name}:`, e.message);
        errors.push(`${name}: ${e.message}`);
        allData[name] = [];
      }
    }

    const now = new Date();
    const backupData = {
      backup_info: {
        created_at: now.toISOString(),
        format_version: '2.0',
        app: 'ArchFlow CRM',
        type: 'automatic_weekly',
        backup_date: now.toLocaleDateString('he-IL')
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
      .filter(u => u.role === 'admin')
      .map(u => u.email)
      .filter(Boolean);

    if (adminEmails.length === 0) {
      console.error('[WeeklyBackup] ⚠️ No admin emails found');
      return;
    }

    const dateStr = now.toISOString().split('T')[0];
    const summaryLines = Object.entries(backupData.summary)
      .filter(([_, count]) => count > 0)
      .map(([cat, count]) => `  • ${cat}: ${count} רשומות`)
      .join('\n');

    const emailBody = `
שלום,

✅ הגיבוי השבועי האוטומטי הושלם בהצלחה.

📊 סטטיסטיקה:
  • סה"כ רשומות: ${totalRecords.toLocaleString()}
  • קטגוריות: ${categories.length}
  ${errors.length > 0 ? `  • ⚠️ שגיאות: ${errors.length}` : ''}

📁 פירוט לפי קטגוריות:
${summaryLines}

${errors.length > 0 ? `\n⚠️ שגיאות:\n${errors.map(e => `  • ${e}`).join('\n')}` : ''}

💾 קובץ הגיבוי המלא זמין בדאשבורד > גיבוי

בברכה,
מערכת ArchFlow CRM
    `;

    // Send to all admins
    for (const email of adminEmails) {
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: email,
          subject: `✅ גיבוי שבועי - ${dateStr} (${totalRecords.toLocaleString()} רשומות)`,
          body: emailBody,
          from_name: 'ArchFlow גיבוי אוטומטי'
        });
        console.log(`[WeeklyBackup] 📧 Email sent to ${email}`);
      } catch (e) {
        console.error(`[WeeklyBackup] ❌ Email failed for ${email}:`, e.message);
      }
    }

    // Save backup record
    try {
      await base44.asServiceRole.entities.Document.create({
        name: `גיבוי אוטומטי - ${dateStr}`,
        type: 'גיבוי',
        content: JSON.stringify(backupData, null, 2),
        metadata: {
          backup_date: dateStr,
          total_records: totalRecords,
          categories_count: categories.length,
          errors_count: errors.length
        }
      });
      console.log('[WeeklyBackup] 💾 Backup saved to Documents');
    } catch (e) {
      console.error('[WeeklyBackup] ⚠️ Failed to save backup document:', e.message);
    }

    console.log('[WeeklyBackup] ✅ Completed successfully');
    
  } catch (error) {
    console.error('[WeeklyBackup] 💥 Fatal error:', error.message);
  }
}

// Scheduled cron job - every Sunday at 2 AM
Deno.cron("weekly backup", "0 2 * * 0", performBackup);