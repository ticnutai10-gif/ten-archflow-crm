import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Manual backup endpoint - creates immediate backup
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[ManualBackup] 🚀 Starting manual backup by:', user.email);
    
    const categories = [
      'Client', 'Project', 'Task', 'TimeLog', 'Quote', 'Invoice',
      'Decision', 'ClientApproval', 'ClientFeedback', 'CommunicationMessage',
      'Document', 'TeamMember', 'AccessControl', 'ClientFile', 'QuoteFile',
      'Meeting', 'UserPreferences', 'Notification', 'WorkflowAutomation',
      'InternalChat', 'InternalMessage', 'ChatConversation', 'CustomSpreadsheet',
      'DailyReportSchedule', 'SubTask', 'MessageTemplate', 'AIInsight',
      'AutomationRule', 'AppSettings', 'Backup', 'BackupSettings'
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
          console.log(`[ManualBackup] ✓ ${name}: ${(records || []).length} רשומות`);
        }
      } catch (e) {
        console.error(`[ManualBackup] ❌ ${name}:`, e.message);
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
        type: 'manual',
        created_by: user.email,
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
    const timeStr = now.toISOString().split('T')[1].substring(0, 5).replace(':', '-');
    const jsonStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const file = new File([blob], `manual-backup-${dateStr}-${timeStr}.json`, { type: 'application/json' });
    
    const { file_url } = await base44.asServiceRole.integrations.Core.UploadFile({
      file: file
    });

    // Save backup record
    const backupRecord = await base44.asServiceRole.entities.Backup.create({
      backup_type: 'manual',
      backup_date: now.toISOString(),
      file_url: file_url,
      file_size: blob.size,
      entities_count: entitiesCount,
      status: 'completed'
    });

    console.log('[ManualBackup] ✅ Completed successfully');

    return Response.json({
      success: true,
      backup_id: backupRecord.id,
      total_records: totalRecords,
      file_url: file_url,
      entities_count: entitiesCount
    });
    
  } catch (error) {
    console.error('[ManualBackup] 💥 Error:', error.message);
    
    // Try to save failed backup record
    try {
      const base44 = createClientFromRequest(req);
      await base44.asServiceRole.entities.Backup.create({
        backup_type: 'manual',
        backup_date: new Date().toISOString(),
        file_url: '',
        status: 'failed',
        entities_count: { error: error.message }
      });
    } catch (e) {
      console.error('[ManualBackup] Failed to save error record:', e.message);
    }
    
    return Response.json({ error: error.message }, { status: 500 });
  }
});