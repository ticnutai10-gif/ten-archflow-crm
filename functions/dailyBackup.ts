import { createClient } from 'npm:@base44/sdk@0.8.4';

/**
 * Daily automatic backup - runs every day at 3 AM
 * Keeps only last 10 daily backups, weekly backups are kept forever
 */

async function performDailyBackup() {
  console.log('[DailyBackup] 🚀 Starting daily backup...');
  
  try {
    const base44 = createClient(Deno.env.get('BASE44_APP_ID'));
    
    const categories = [
      'Client', 'Project', 'Task', 'TimeLog', 'Quote', 'Invoice',
      'Decision', 'ClientApproval', 'ClientFeedback', 'CommunicationMessage',
      'Document', 'TeamMember', 'AccessControl', 'ClientFile', 'QuoteFile',
      'Meeting', 'UserPreferences', 'Notification', 'WorkflowAutomation',
      'InternalChat', 'InternalMessage', 'ChatConversation', 'CustomSpreadsheet',
      'DailyReportSchedule', 'SubTask', 'MessageTemplate', 'AIInsight',
      'AutomationRule', 'AppSettings'
    ];

    const allData = {};
    let totalRecords = 0;
    const entitiesCount = {};
    
    for (const name of categories) {
      try {
        if (base44.entities && base44.entities[name]) {
          const records = await base44.asServiceRole.entities[name].list('-created_date', 100000);
          allData[name] = records || [];
          entitiesCount[name] = (records || []).length;
          totalRecords += (records || []).length;
          console.log(`[DailyBackup] ✓ ${name}: ${(records || []).length} רשומות`);
        }
      } catch (e) {
        console.error(`[DailyBackup] ❌ ${name}:`, e.message);
        allData[name] = [];
        entitiesCount[name] = 0;
      }
    }

    const now = new Date();
    const backupData = {
      backup_info: {
        created_at: now.toISOString(),
        format_version: '2.0',
        app: 'ArchFlow CRM',
        type: 'automatic_daily',
        backup_date: now.toLocaleDateString('he-IL')
      },
      statistics: {
        total_records: totalRecords,
        categories_count: categories.length
      },
      data: allData
    };

    // Upload backup file
    const dateStr = now.toISOString().split('T')[0];
    const jsonStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const file = new File([blob], `daily-backup-${dateStr}.json`, { type: 'application/json' });
    
    const { file_url } = await base44.asServiceRole.integrations.Core.UploadFile({
      file: file
    });

    // Save backup record
    await base44.asServiceRole.entities.Backup.create({
      backup_type: 'daily',
      backup_date: now.toISOString(),
      file_url: file_url,
      file_size: blob.size,
      entities_count: entitiesCount,
      status: 'completed'
    });

    console.log('[DailyBackup] 💾 Backup record saved');

    // Clean old daily backups - keep only last 10
    const allBackups = await base44.asServiceRole.entities.Backup.filter(
      { backup_type: 'daily' },
      '-backup_date',
      1000
    );

    if (allBackups.length > 10) {
      const backupsToDelete = allBackups.slice(10);
      console.log(`[DailyBackup] 🗑️ Removing ${backupsToDelete.length} old daily backups...`);
      
      for (const backup of backupsToDelete) {
        try {
          await base44.asServiceRole.entities.Backup.delete(backup.id);
          console.log(`[DailyBackup] ✓ Deleted backup from ${backup.backup_date}`);
        } catch (e) {
          console.error(`[DailyBackup] ❌ Failed to delete backup ${backup.id}:`, e.message);
        }
      }
    }

    console.log('[DailyBackup] ✅ Completed successfully');
    
  } catch (error) {
    console.error('[DailyBackup] 💥 Fatal error:', error.message);
    
    // Try to save failed backup record
    try {
      const base44 = createClient(Deno.env.get('BASE44_APP_ID'));
      await base44.asServiceRole.entities.Backup.create({
        backup_type: 'daily',
        backup_date: new Date().toISOString(),
        file_url: '',
        status: 'failed',
        entities_count: { error: error.message }
      });
    } catch (e) {
      console.error('[DailyBackup] Failed to save error record:', e.message);
    }
  }
}

// Scheduled cron job - every day at 3 AM
Deno.cron("daily backup", "0 3 * * *", performDailyBackup);