import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Restore backup endpoint - restores data from a specific backup
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      return Response.json({ error: 'Only admins can restore backups' }, { status: 403 });
    }

    const { backup_id } = await req.json();

    if (!backup_id) {
      return Response.json({ error: 'backup_id is required' }, { status: 400 });
    }

    console.log('[RestoreBackup] 🚀 Starting restore from backup:', backup_id);

    // Get backup record
    const backup = await base44.asServiceRole.entities.Backup.get(backup_id);
    
    if (!backup || !backup.file_url) {
      return Response.json({ error: 'Backup not found or invalid' }, { status: 404 });
    }

    // Download backup file
    const response = await fetch(backup.file_url);
    if (!response.ok) {
      throw new Error('Failed to download backup file');
    }

    const backupData = await response.json();
    
    if (!backupData.data) {
      return Response.json({ error: 'Invalid backup format' }, { status: 400 });
    }

    console.log('[RestoreBackup] 📦 Backup loaded, starting restore...');

    const results = {
      success: [],
      failed: [],
      skipped: []
    };

    // Restore each entity
    for (const [entityName, records] of Object.entries(backupData.data)) {
      if (!Array.isArray(records) || records.length === 0) {
        results.skipped.push(entityName);
        continue;
      }

      try {
        // Skip User entity - cannot be restored this way
        if (entityName === 'User') {
          results.skipped.push(entityName);
          console.log(`[RestoreBackup] ⏭️ Skipping ${entityName} (special entity)`);
          continue;
        }

        // Get current records
        const currentRecords = await base44.asServiceRole.entities[entityName].list('-created_date', 100000);
        
        // Create a map of existing records by ID
        const existingIds = new Set(currentRecords.map(r => r.id));

        let created = 0;
        let updated = 0;

        for (const record of records) {
          try {
            const recordData = { ...record };
            const recordId = recordData.id;
            
            // Remove system fields
            delete recordData.id;
            delete recordData.created_date;
            delete recordData.updated_date;
            delete recordData.created_by;

            if (existingIds.has(recordId)) {
              // Update existing record
              await base44.asServiceRole.entities[entityName].update(recordId, recordData);
              updated++;
            } else {
              // Create new record with original ID if possible
              try {
                await base44.asServiceRole.entities[entityName].create({ ...recordData, id: recordId });
              } catch {
                // If ID creation fails, create without ID
                await base44.asServiceRole.entities[entityName].create(recordData);
              }
              created++;
            }
          } catch (e) {
            console.error(`[RestoreBackup] ❌ Failed to restore record in ${entityName}:`, e.message);
          }
        }

        results.success.push({
          entity: entityName,
          created,
          updated,
          total: created + updated
        });

        console.log(`[RestoreBackup] ✓ ${entityName}: ${created} created, ${updated} updated`);

      } catch (e) {
        console.error(`[RestoreBackup] ❌ Failed to restore ${entityName}:`, e.message);
        results.failed.push({
          entity: entityName,
          error: e.message
        });
      }
    }

    // Send notification
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: user.email,
      subject: '✅ שחזור גיבוי הושלם',
      body: `
שלום ${user.full_name || user.email},

שחזור הגיבוי הושלם בהצלחה!

📊 סיכום:
  • הצלחה: ${results.success.length} entities
  • נכשל: ${results.failed.length} entities
  • דולג: ${results.skipped.length} entities

✅ Entities ששוחזרו:
${results.success.map(r => `  • ${r.entity}: ${r.created} נוצרו, ${r.updated} עודכנו`).join('\n')}

${results.failed.length > 0 ? `\n❌ כשלונות:\n${results.failed.map(f => `  • ${f.entity}: ${f.error}`).join('\n')}` : ''}

בברכה,
מערכת ArchFlow CRM
      `,
      from_name: 'ArchFlow גיבוי'
    });

    console.log('[RestoreBackup] ✅ Restore completed');

    return Response.json({
      success: true,
      results
    });

  } catch (error) {
    console.error('[RestoreBackup] 💥 Fatal error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});