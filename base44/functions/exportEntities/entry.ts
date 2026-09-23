import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

async function canElevateToService(base44, me) {
  if (me?.role === 'admin') return true;
  try {
    const rows = await base44.entities.AccessControl.filter({ email: me.email, active: true });
    const rule = rows?.[0];
    if (rule?.role === 'manager_plus') return true;
    const all = await base44.entities.AccessControl.list().catch(() => []);
    const r2 = (all || []).find(r =>
      r?.active && typeof r?.email === "string" &&
      r.email.trim().toLowerCase() === (me.email || "").trim().toLowerCase()
    );
    if (r2?.role === 'manager_plus') return true;
  } catch (e) {
    console.warn("canElevateToService check failed", e);
  }
  return false;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const me = await base44.auth.me();
    if (!me) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log("[exportEntities] Starting export for user:", me.email);

    const payload = await req.json().catch(() => ({}));
    const categories = Array.isArray(payload?.categories) && payload.categories.length ? payload.categories : [
      'Client','Project','Task','TimeLog','Quote','Invoice','Decision','ClientApproval','ClientFeedback','CommunicationMessage','Document','TeamMember','AccessControl','ClientFile','QuoteFile'
    ];
    const limit = Math.max(1000, Number(payload?.limit) || 5000);
    const format = payload?.format || 'json'; // json, excel, csv, xml

    console.log("[exportEntities] Categories to export:", categories);
    console.log("[exportEntities] Limit per entity:", limit);
    console.log("[exportEntities] Format requested:", format);

    const elevate = await canElevateToService(base44, me);
    const client = elevate ? base44.asServiceRole : base44;

    console.log("[exportEntities] Using service role:", elevate);

    const data = {};
    let totalRecords = 0;

    for (const entityName of categories) {
      try {
        console.log(`[exportEntities] Fetching ${entityName}...`);
        const startTime = Date.now();
        
        const rows = await client.entities[entityName].filter({}, '-created_date', limit);
        const fetchTime = Date.now() - startTime;
        
        data[entityName] = rows || [];
        const recordCount = (rows || []).length;
        totalRecords += recordCount;
        
        console.log(`[exportEntities] ${entityName}: ${recordCount} records (${fetchTime}ms)`);
        
        // Log first record structure for debugging
        if (recordCount > 0) {
          console.log(`[exportEntities] ${entityName} first record keys:`, Object.keys(rows[0]));
        }
      } catch (e) {
        console.error(`[exportEntities] Error fetching ${entityName}:`, e?.message || e);
        data[entityName] = { error: String(e?.message || e) };
      }
    }

    console.log(`[exportEntities] Total records exported: ${totalRecords}`);

    // Validate data integrity
    const validationResults = {};
    let validationErrors = 0;
    
    for (const [entityName, records] of Object.entries(data)) {
      if (Array.isArray(records)) {
        const issues = [];
        
        // Check for records without ID
        const noId = records.filter(r => !r?.id);
        if (noId.length > 0) {
          issues.push(`${noId.length} רשומות ללא ID`);
        }
        
        // Check for records without created_date
        const noDate = records.filter(r => !r?.created_date);
        if (noDate.length > 0) {
          issues.push(`${noDate.length} רשומות ללא תאריך יצירה`);
        }
        
        // Check for orphan references (basic)
        if (entityName === 'TimeLog') {
          const noClient = records.filter(r => !r?.client_id && !r?.client_name);
          if (noClient.length > 0) {
            issues.push(`${noClient.length} לוגים ללא קישור ללקוח`);
          }
          const noUser = records.filter(r => !r?.user_email && !r?.created_by);
          if (noUser.length > 0) {
            issues.push(`${noUser.length} לוגים ללא קישור לעובד`);
          }
        }
        
        if (entityName === 'Task') {
          const noProject = records.filter(r => !r?.project_id && !r?.client_id);
          if (noProject.length > 0) {
            issues.push(`${noProject.length} משימות ללא קישור לפרויקט/לקוח`);
          }
        }
        
        validationResults[entityName] = {
          total: records.length,
          valid: records.length - issues.length,
          issues: issues.length > 0 ? issues : null
        };
        
        if (issues.length > 0) validationErrors++;
      }
    }

    const exportData = {
      _backup_metadata: {
        generated_at: new Date().toISOString(),
        generated_by: me.email,
        version: '2.0',
        app_name: 'CRM Tannenbaum',
        format: 'structured_backup',
        restore_instructions: {
          he: 'לשחזור הנתונים:\n1. השתמש בכלי הייבוא בדף גיבוי\n2. או יבא את קובץ ה-JSON למערכת אחרת\n3. שדה data מכיל את כל הרשומות לפי סוג ישות',
          en: 'To restore:\n1. Use import tool in Backup page\n2. Or import JSON to another system\n3. data field contains all records by entity type'
        }
      },
      _data_schemas: {
        Client: {
          primary_key: 'id',
          fields: ['id', 'name', 'email', 'phone', 'address', 'stage', 'status', 'source', 'custom_data', 'professionals'],
          relations: [],
          description: 'לקוחות המערכת'
        },
        Project: {
          primary_key: 'id',
          fields: ['id', 'name', 'client_id', 'client_name', 'status', 'budget', 'start_date', 'end_date', 'progress', 'milestones', 'budget_items'],
          relations: ['client_id → Client.id'],
          description: 'פרויקטים'
        },
        Task: {
          primary_key: 'id',
          fields: ['id', 'title', 'description', 'project_id', 'project_name', 'client_id', 'client_name', 'assigned_to', 'status', 'priority', 'due_date'],
          relations: ['project_id → Project.id', 'client_id → Client.id', 'assigned_to → User.email'],
          description: 'משימות'
        },
        TimeLog: {
          primary_key: 'id',
          fields: ['id', 'client_id', 'client_name', 'log_date', 'duration_seconds', 'title', 'notes', 'user_email', 'user_name', 'project_id', 'task_id', 'billable', 'hourly_rate'],
          relations: ['client_id → Client.id', 'user_email → User.email/TeamMember.email', 'project_id → Project.id', 'task_id → Task.id'],
          description: 'רישומי שעות עבודה - כולל קישור לעובד שביצע'
        },
        TeamMember: {
          primary_key: 'id',
          fields: ['id', 'full_name', 'email', 'role', 'capacity_hours_per_week', 'hourly_rate', 'vat_percentage', 'bank_details', 'active'],
          relations: [],
          description: 'חברי צוות - עובדים'
        },
        CustomSpreadsheet: {
          primary_key: 'id',
          fields: ['id', 'name', 'description', 'client_id', 'columns', 'rows_data', 'cell_styles', 'cell_notes', 'header_styles', 'merged_cells'],
          relations: ['client_id → Client.id'],
          description: 'טבלאות מותאמות - כולל כל הנתונים והעיצוב',
          special_note: 'rows_data מכיל את כל השורות, cell_styles את עיצוב התאים'
        },
        Meeting: {
          primary_key: 'id',
          fields: ['id', 'title', 'description', 'client_id', 'client_name', 'project_id', 'meeting_date', 'duration_minutes', 'location', 'status'],
          relations: ['client_id → Client.id', 'project_id → Project.id'],
          description: 'פגישות'
        },
        Quote: {
          primary_key: 'id',
          fields: ['id', 'title', 'client_id', 'client_name', 'project_id', 'amount', 'status', 'valid_until'],
          relations: ['client_id → Client.id', 'project_id → Project.id'],
          description: 'הצעות מחיר'
        },
        Invoice: {
          primary_key: 'id',
          fields: ['id', 'invoice_number', 'client_id', 'client_name', 'amount', 'status', 'due_date'],
          relations: ['client_id → Client.id'],
          description: 'חשבוניות'
        },
        SubTask: {
          primary_key: 'id',
          fields: ['id', 'project_id', 'project_name', 'parent_task_id', 'title', 'description', 'assigned_to', 'status', 'priority', 'due_date', 'progress'],
          relations: ['project_id → Project.id', 'parent_task_id → SubTask.id'],
          description: 'תת-משימות ומשימות פרויקט'
        }
      },
      _validation: {
        performed_at: new Date().toISOString(),
        total_entities: categories.length,
        entities_with_issues: validationErrors,
        all_valid: validationErrors === 0,
        results: validationResults
      },
      _statistics: {
        total_records: totalRecords,
        categories_exported: categories,
        records_per_category: Object.fromEntries(
          Object.entries(data).map(([k, v]) => [k, Array.isArray(v) ? v.length : 0])
        )
      },
      data: data
    };

    // Return different formats based on request
    if (format === 'json') {
      const jsonOutput = JSON.stringify(exportData, null, 2);
      const bytes = new TextEncoder().encode(jsonOutput);
      
      console.log(`[exportEntities] JSON output size: ${bytes.length} bytes (${(bytes.length/1024).toFixed(1)}KB)`);
      console.log(`[exportEntities] Validation: ${validationErrors === 0 ? 'All valid' : validationErrors + ' entities with issues'}`);

      return new Response(bytes, {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': 'attachment; filename=backup.json',
          'Content-Length': bytes.length.toString()
        }
      });
    }

    // For other formats, we'll return the data structure that can be processed by the frontend
    return Response.json({
      success: true,
      format: format,
      total_records: totalRecords,
      data: exportData
    });

  } catch (error) {
    console.error("[exportEntities] Fatal error:", error?.message || error);
    return Response.json({ 
      error: error?.message || 'Unknown error',
      stack: error?.stack || 'No stack trace'
    }, { status: 500 });
  }
});