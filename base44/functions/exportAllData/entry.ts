import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import * as XLSX from 'npm:xlsx@0.18.5';

function escapeXml(unsafe) {
  if (unsafe === null || unsafe === undefined) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function escapeCsv(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function cleanDataForCsv(data) {
  if (!Array.isArray(data) || data.length === 0) return [];
  
  return data.map(row => {
    if (!row || typeof row !== 'object') return {};
    
    const cleanRow = {};
    for (const [key, value] of Object.entries(row)) {
      const cleanKey = String(key).replace(/[,\n\r]/g, '_');
      
      if (value === null || value === undefined) {
        cleanRow[cleanKey] = '';
      } else if (Array.isArray(value)) {
        cleanRow[cleanKey] = value.join('; ');
      } else if (typeof value === 'object') {
        try {
          cleanRow[cleanKey] = JSON.stringify(value);
        } catch {
          cleanRow[cleanKey] = '[Object]';
        }
      } else if (typeof value === 'boolean') {
        cleanRow[cleanKey] = value ? 'כן' : 'לא';
      } else {
        cleanRow[cleanKey] = String(value);
      }
    }
    return cleanRow;
  });
}

// פונקציה פשוטה לקריאת מקסימום רשומות אפשריות
async function fetchAllRecords(entity, entityName) {
  console.log(`[exportAllData] Fetching records for ${entityName}...`);
  
  try {
    // ננסה לקרוא עד 50,000 רשומות (מגבלה סבירה)
    const records = await entity.list('-created_date', 50000);
    const count = (records || []).length;
    console.log(`[exportAllData] ${entityName}: Got ${count} records`);
    return records || [];
  } catch (error) {
    console.error(`[exportAllData] Error fetching ${entityName}:`, error);
    return [];
  }
}

Deno.serve(async (req) => {
  console.log("[exportAllData] Function started");
  
  try {
    const base44 = createClientFromRequest(req);
    const isAuth = await base44.auth.isAuthenticated();
    
    if (!isAuth) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    let payload = {};
    try {
      payload = await req.json();
    } catch (e) {
      console.log("[exportAllData] No JSON payload, using defaults");
    }
    
    const format = (payload?.format || 'csv').toLowerCase();
    const categories = Array.isArray(payload?.categories) ? payload.categories : [
      'Client', 'Project', 'Quote', 'Task', 'SubTask', 'TimeLog', 'Invoice', 'Meeting', 'CustomSpreadsheet', 'GlobalDataType'
    ];
    
    // Option to export each category separately
    const separateFiles = payload?.separateFiles === true;

    console.log("[exportAllData] Format:", format, "Categories:", categories.length);

    // שליפת כל הנתונים
    const allData = {};
    let totalRecords = 0;
    const errors = [];
    
    for (const name of categories) {
      try {
        if (base44.entities && base44.entities[name]) {
          const data = await fetchAllRecords(base44.entities[name], name);
          allData[name] = data || [];
          const count = (data || []).length;
          totalRecords += count;
          console.log(`[exportAllData] ✓ ${name}: ${count} records`);
        } else {
          console.log(`[exportAllData] Entity ${name} not found`);
          errors.push(`Entity ${name} not available`);
          allData[name] = [];
        }
      } catch (e) {
        console.error(`[exportAllData] Error fetching ${name}:`, e.message);
        errors.push(`${name}: ${e.message}`);
        allData[name] = [];
      }
    }

    console.log(`[exportAllData] Total records: ${totalRecords}`);

    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;

    // Excel Export (true .xlsx with formatting)
    if (format === 'excel') {
      const workbook = XLSX.utils.book_new();
      
      for (const name of categories) {
        const rows = allData[name] || [];
        if (rows.length === 0) continue;
        
        const cleanRows = cleanDataForCsv(rows);
        
        // Special handling for CustomSpreadsheet - export with full styling
        if (name === 'CustomSpreadsheet') {
          for (const spreadsheet of rows) {
            const sheetName = (spreadsheet.name || 'Sheet').substring(0, 31).replace(/[\\/*?:\[\]]/g, '_');
            const sheetRows = spreadsheet.rows_data || [];
            const columns = spreadsheet.columns || [];
            
            if (sheetRows.length === 0) continue;
            
            // Build data with headers
            const headers = columns.map(col => col.title || col.key);
            const dataRows = sheetRows.map(row => {
              return columns.map(col => {
                const val = row[col.key];
                return val !== null && val !== undefined ? val : '';
              });
            });
            
            const wsData = [headers, ...dataRows];
            const ws = XLSX.utils.aoa_to_sheet(wsData);
            
            // Apply column widths
            ws['!cols'] = columns.map(col => {
              const width = parseInt(col.width) || 100;
              return { wch: Math.max(10, Math.floor(width / 7)) };
            });
            
            // Apply cell styles from spreadsheet.cell_styles
            const cellStyles = spreadsheet.cell_styles || {};
            const headerStyles = spreadsheet.header_styles || {};
            
            // Style headers (row 1)
            for (let c = 0; c < headers.length; c++) {
              const cellRef = XLSX.utils.encode_cell({ r: 0, c });
              if (!ws[cellRef]) ws[cellRef] = { v: headers[c], t: 's' };
              ws[cellRef].s = {
                font: { bold: true, color: { rgb: "FFFFFF" } },
                fill: { fgColor: { rgb: "2C3A50" } },
                alignment: { horizontal: "center", vertical: "center" }
              };
              
              // Apply custom header styles if exist
              const colKey = columns[c]?.key;
              if (headerStyles[colKey]) {
                const hs = headerStyles[colKey];
                if (hs.backgroundColor) {
                  ws[cellRef].s.fill = { fgColor: { rgb: hs.backgroundColor.replace('#', '') } };
                }
                if (hs.color) {
                  ws[cellRef].s.font = { ...ws[cellRef].s.font, color: { rgb: hs.color.replace('#', '') } };
                }
              }
            }
            
            // Apply cell styles for data rows
            for (let r = 0; r < sheetRows.length; r++) {
              const rowId = sheetRows[r].id || sheetRows[r]._id || `row_${r}`;
              for (let c = 0; c < columns.length; c++) {
                const cellRef = XLSX.utils.encode_cell({ r: r + 1, c });
                const colKey = columns[c]?.key;
                const styleKey = `${rowId}_${colKey}`;
                
                if (cellStyles[styleKey] && ws[cellRef]) {
                  const style = cellStyles[styleKey];
                  ws[cellRef].s = ws[cellRef].s || {};
                  
                  if (style.backgroundColor) {
                    ws[cellRef].s.fill = { fgColor: { rgb: style.backgroundColor.replace('#', '') } };
                  }
                  if (style.color) {
                    ws[cellRef].s.font = { ...(ws[cellRef].s.font || {}), color: { rgb: style.color.replace('#', '') } };
                  }
                  if (style.fontWeight === 'bold') {
                    ws[cellRef].s.font = { ...(ws[cellRef].s.font || {}), bold: true };
                  }
                }
              }
            }
            
            // Handle merged cells
            if (spreadsheet.merged_cells) {
              ws['!merges'] = ws['!merges'] || [];
              for (const [mergeKey, mergeInfo] of Object.entries(spreadsheet.merged_cells)) {
                if (mergeInfo.start && mergeInfo.end) {
                  ws['!merges'].push({
                    s: { r: mergeInfo.start.row + 1, c: mergeInfo.start.col },
                    e: { r: mergeInfo.end.row + 1, c: mergeInfo.end.col }
                  });
                }
              }
            }
            
            // Freeze header row
            ws['!freeze'] = { xSplit: 0, ySplit: 1 };
            
            XLSX.utils.book_append_sheet(workbook, ws, sheetName);
          }
        } else {
          // Regular entity - simple export
          const allKeys = new Set();
          cleanRows.forEach(row => {
            Object.keys(row || {}).forEach(key => allKeys.add(key));
          });
          const headers = Array.from(allKeys);
          
          const dataRows = cleanRows.map(row => headers.map(h => row[h] || ''));
          const wsData = [headers, ...dataRows];
          const ws = XLSX.utils.aoa_to_sheet(wsData);
          
          // Style headers
          for (let c = 0; c < headers.length; c++) {
            const cellRef = XLSX.utils.encode_cell({ r: 0, c });
            if (ws[cellRef]) {
              ws[cellRef].s = {
                font: { bold: true, color: { rgb: "FFFFFF" } },
                fill: { fgColor: { rgb: "4A5568" } },
                alignment: { horizontal: "center" }
              };
            }
          }
          
          // Auto-width columns
          ws['!cols'] = headers.map(h => ({ wch: Math.max(12, Math.min(40, h.length + 5)) }));
          
          const sheetName = name.substring(0, 31);
          XLSX.utils.book_append_sheet(workbook, ws, sheetName);
        }
      }
      
      // Add summary sheet
      const summaryData = [
        ['ArchFlow CRM Backup Summary'],
        ['Created', now.toISOString()],
        ['Total Records', totalRecords],
        [''],
        ['Entity', 'Count'],
        ...categories.map(cat => [cat, (allData[cat] || []).length])
      ];
      const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
      summaryWs['!cols'] = [{ wch: 25 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(workbook, summaryWs, 'Summary');
      
      const xlsxBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      
      return new Response(xlsxBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename=full-backup-${dateStr}.xlsx`
        }
      });
    }

    // CSV Export
    if (format === 'csv') {
      // Build CSV content without the comment lines that break Excel
      let csvContent = '';
      
      for (const name of categories) {
        const rows = allData[name] || [];
        if (rows.length === 0) {
          continue; // Skip empty entities
        }
        
        const cleanRows = cleanDataForCsv(rows);
        
        // Get all unique keys
        const allKeys = new Set();
        cleanRows.forEach(row => {
          Object.keys(row || {}).forEach(key => allKeys.add(key));
        });
        const headers = Array.from(allKeys);
        
        // Add entity type as first column to identify which entity this row belongs to
        csvContent += '_entity_type,' + headers.map(h => escapeCsv(h)).join(',') + '\n';
        
        cleanRows.forEach(row => {
          const values = headers.map(header => {
            return escapeCsv(row[header] || '');
          });
          csvContent += escapeCsv(name) + ',' + values.join(',') + '\n';
        });
      }
      
      // If no data at all, create a simple header
      if (!csvContent) {
        csvContent = '_entity_type,id,message\ninfo,,No data found for selected categories\n';
      }
      
      return new Response(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename=full-backup-${dateStr}.csv`
        }
      });
    }

    // XML Export
    if (format === 'xml') {
      let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
      xml += `<backup created_at="${now.toISOString()}" total_records="${totalRecords}">\n`;
      
      for (const name of categories) {
        const records = allData[name] || [];
        xml += `  <entity name="${name}" count="${records.length}">\n`;
        for (const rec of records) {
          xml += `    <record>\n`;
          for (const [k, v] of Object.entries(rec || {})) {
            const value = Array.isArray(v) ? v.join(',') : String(v || '');
            xml += `      <${k}>${escapeXml(value)}</${k}>\n`;
          }
          xml += `    </record>\n`;
        }
        xml += `  </entity>\n`;
      }
      xml += `</backup>`;
      
      const xmlBytes = new TextEncoder().encode(xml);
      
      return new Response(xmlBytes, {
        status: 200,
        headers: {
          'Content-Type': 'application/xml; charset=utf-8',
          'Content-Disposition': `attachment; filename=full-backup-${dateStr}.xml`
        }
      });
    }

    // Validate data before export
    const validationReport = {};
    let totalIssues = 0;
    
    for (const [entityName, records] of Object.entries(allData)) {
      if (!Array.isArray(records) || records.length === 0) continue;
      
      const entityIssues = [];
      
      // Basic validation
      const noId = records.filter(r => !r?.id);
      if (noId.length > 0) entityIssues.push({ type: 'missing_id', count: noId.length });
      
      // Entity-specific validation
      if (entityName === 'TimeLog') {
        const noEmployee = records.filter(r => !r?.user_email && !r?.created_by);
        if (noEmployee.length > 0) entityIssues.push({ type: 'missing_employee', count: noEmployee.length, note: 'לוגים ללא עובד משויך' });
      }
      
      if (entityName === 'CustomSpreadsheet') {
        const noRows = records.filter(r => !r?.rows_data || r.rows_data.length === 0);
        if (noRows.length > 0) entityIssues.push({ type: 'empty_spreadsheet', count: noRows.length, note: 'טבלאות ריקות' });
        
        // Advanced spreadsheet validation
        records.forEach((sheet, idx) => {
          const sheetIssues = [];
          
          // Validate columns structure
          if (!sheet.columns || !Array.isArray(sheet.columns)) {
            sheetIssues.push('missing_columns_definition');
          } else {
            const invalidCols = sheet.columns.filter(c => !c?.key || !c?.title);
            if (invalidCols.length > 0) sheetIssues.push(`${invalidCols.length}_invalid_columns`);
          }
          
          // Validate rows data integrity
          if (sheet.rows_data && Array.isArray(sheet.rows_data)) {
            const rowsWithoutId = sheet.rows_data.filter(r => !r?.id);
            if (rowsWithoutId.length > 0) sheetIssues.push(`${rowsWithoutId.length}_rows_without_id`);
            
            // Check for orphan cell styles (styles for non-existent cells)
            if (sheet.cell_styles && typeof sheet.cell_styles === 'object') {
              const validCellKeys = new Set();
              sheet.rows_data.forEach(row => {
                if (row?.id && sheet.columns) {
                  sheet.columns.forEach(col => {
                    if (col?.key) validCellKeys.add(`${row.id}_${col.key}`);
                  });
                }
              });
              const orphanStyles = Object.keys(sheet.cell_styles).filter(k => !validCellKeys.has(k));
              if (orphanStyles.length > 0) sheetIssues.push(`${orphanStyles.length}_orphan_styles`);
            }
          }
          
          // Validate merged cells
          if (sheet.merged_cells && typeof sheet.merged_cells === 'object') {
            const invalidMerges = Object.entries(sheet.merged_cells).filter(([k, v]) => 
              !v?.master || !v?.cells || !Array.isArray(v.cells)
            );
            if (invalidMerges.length > 0) sheetIssues.push(`${invalidMerges.length}_invalid_merges`);
          }
          
          if (sheetIssues.length > 0) {
            entityIssues.push({ 
              type: 'spreadsheet_integrity', 
              sheet_id: sheet.id, 
              sheet_name: sheet.name,
              issues: sheetIssues 
            });
          }
        });
      }
      
      validationReport[entityName] = {
        total: records.length,
        issues: entityIssues.length > 0 ? entityIssues : null,
        status: entityIssues.length === 0 ? 'valid' : 'has_warnings'
      };
      
      totalIssues += entityIssues.length;
    }
    
    // Generate spreadsheet system documentation
    const spreadsheetDocumentation = {
      system_name: 'מערכת טבלאות מותאמות - CRM Tannenbaum',
      version: '2.0',
      description: 'מערכת טבלאות מתקדמת עם תמיכה בעיצוב, מיזוגים, תגובות ועוד',
      
      features: {
        columns: {
          description: 'עמודות הטבלה עם סוגים שונים',
          types: [
            { type: 'text', description: 'טקסט חופשי' },
            { type: 'number', description: 'מספר' },
            { type: 'date', description: 'תאריך' },
            { type: 'client', description: 'בחירת לקוח מרשימה - מקושר לישות Client' },
            { type: 'stage', description: 'שלב/סטטוס עם צבעים - מקושר ל-GlobalDataType' },
            { type: 'checkmark', description: 'תיבת סימון V/X' },
            { type: 'mixed_check', description: 'סימון מעורב' },
            { type: 'select', description: 'בחירה מרשימה' },
            { type: 'taba', description: 'נתון מסוג טאבה - מקושר ל-GlobalDataType' },
            { type: 'transfer_rights', description: 'זכויות העברה - מקושר ל-GlobalDataType' },
            { type: 'purchase_rights', description: 'זכויות רכישה - מקושר ל-GlobalDataType' },
            { type: 'custom_*', description: 'סוג נתונים מותאם אישית - מקושר ל-GlobalDataType' }
          ],
          properties: ['key', 'title', 'type', 'width', 'visible', 'collapsed']
        },
        
        rows_data: {
          description: 'נתוני השורות - כל שורה היא אובייקט עם id וערכים לפי key של עמודות',
          structure: '{ id: string, [column_key]: value }'
        },
        
        cell_styles: {
          description: 'עיצוב תאים - מפתח: rowId_colKey',
          properties: ['backgroundColor', 'color', 'fontWeight', 'opacity'],
          example: '{ "row_123_col_456": { "backgroundColor": "#fee2e2", "fontWeight": "bold" } }'
        },
        
        cell_notes: {
          description: 'הערות צהובות על תאים - מפתח: rowId_colKey',
          structure: '{ "row_123_col_456": "טקסט ההערה" }'
        },
        
        merged_cells: {
          description: 'תאים ממוזגים',
          structure: '{ mergeKey: { cells: string[], master: string, rowspan: number, colspan: number } }'
        },
        
        merged_headers: {
          description: 'כותרות עליונות ממוזגות',
          structure: '{ mergeKey: { columns: string[], master: string, colspan: number, title: string } }'
        },
        
        header_styles: {
          description: 'עיצוב כותרות - מפתח: colKey או mergeKey',
          properties: ['backgroundColor', 'color', 'fontWeight']
        },
        
        sub_headers: {
          description: 'כותרות משנה',
          structure: '{ colKey: { title: string, position: "above"|"below" } }'
        },
        
        theme_settings: {
          description: 'הגדרות עיצוב כללי לטבלה',
          properties: ['palette', 'borderStyle', 'headerFont', 'cellFont', 'fontSize', 'density', 'borderRadius', 'shadow', 'outerBorderColor', 'outerBorderSize']
        },
        
        freeze_settings: {
          description: 'הקפאת שורות ועמודות',
          structure: '{ freeze_rows: number, freeze_columns: number }'
        },
        
        charts: {
          description: 'גרפים וויזואליזציות',
          properties: ['id', 'name', 'type', 'config', 'data_source']
        },
        
        saved_views: {
          description: 'תצוגות שמורות - שומרות מצב עמודות, סינונים ומיונים',
          properties: ['id', 'name', 'columns', 'filters', 'sort', 'isDefault']
        },
        
        google_sync: {
          description: 'סנכרון עם Google Sheets',
          properties: ['google_sheet_id', 'google_sheet_name', 'sync_config'],
          sync_modes: ['export_only', 'import_on_load', 'two_way']
        }
      },
      
      relationships: {
        client_id: 'קישור ל-Client.id - הטבלה שייכת ללקוח',
        columns_type_client: 'עמודות מסוג client מקושרות לרשימת הלקוחות',
        columns_type_stage: 'עמודות מסוג stage/taba/custom מקושרות ל-GlobalDataType'
      },
      
      restore_instructions: {
        step1: 'צור ישות CustomSpreadsheet חדשה',
        step2: 'העתק את כל השדות מהגיבוי (columns, rows_data, cell_styles וכו\')',
        step3: 'ודא שה-columns מכילים key ו-title תקינים',
        step4: 'ודא שה-rows_data מכילים id ייחודי לכל שורה',
        step5: 'cell_styles ו-cell_notes משתמשים במפתח rowId_colKey',
        step6: 'לסנכרון Google Sheets - חבר מחדש דרך הממשק'
      }
    };

    // JSON Export (default)
    const jsonData = {
      _backup_metadata: {
        created_at: now.toISOString(),
        version: '2.0',
        app_name: 'CRM Tannenbaum',
        format: 'full_backup',
        restore_instructions: {
          he: 'לשחזור הנתונים:\n1. השתמש בכלי הייבוא בדף הגיבוי\n2. או ייבא ישירות למערכת אחרת - כל הנתונים ב-data\n3. טבלאות מותאמות כוללות את כל השורות (rows_data) והעיצוב',
          en: 'To restore:\n1. Use import in Backup page\n2. Or import to another system - all data in data field\n3. Spreadsheets include all rows (rows_data) and styling'
        }
      },
      _data_schemas: {
        Client: { primary_key: 'id', relations: [], description: 'לקוחות' },
        Project: { primary_key: 'id', relations: ['client_id → Client.id'], description: 'פרויקטים' },
        Task: { primary_key: 'id', relations: ['project_id → Project.id', 'client_id → Client.id', 'assigned_to → User.email'], description: 'משימות' },
        TimeLog: { primary_key: 'id', relations: ['client_id → Client.id', 'user_email → TeamMember.email'], description: 'לוגי זמן - קישור עובד-לקוח' },
        TeamMember: { primary_key: 'id', relations: [], description: 'עובדים' },
        CustomSpreadsheet: { primary_key: 'id', relations: ['client_id → Client.id'], description: 'טבלאות - rows_data מכיל את כל הנתונים' },
        Meeting: { primary_key: 'id', relations: ['client_id → Client.id'], description: 'פגישות' },
        Quote: { primary_key: 'id', relations: ['client_id → Client.id'], description: 'הצעות מחיר' },
        Invoice: { primary_key: 'id', relations: ['client_id → Client.id'], description: 'חשבוניות' },
        SubTask: { primary_key: 'id', relations: ['project_id → Project.id'], description: 'תת-משימות' }
      },
      _validation: {
        performed_at: now.toISOString(),
        all_valid: totalIssues === 0,
        total_issues: totalIssues,
        report: validationReport
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
      ),
      spreadsheet_documentation: categories.includes('CustomSpreadsheet') ? spreadsheetDocumentation : null,
      
      spreadsheet_details: categories.includes('CustomSpreadsheet') ? 
        (allData['CustomSpreadsheet'] || []).map(sheet => ({
          id: sheet.id,
          name: sheet.name,
          client_id: sheet.client_id,
          client_name: sheet.client_name,
          columns_count: (sheet.columns || []).length,
          columns_types: (sheet.columns || []).map(c => ({ key: c.key, title: c.title, type: c.type || 'text' })),
          rows_count: (sheet.rows_data || []).length,
          has_styles: !!(sheet.cell_styles && Object.keys(sheet.cell_styles).length > 0),
          styles_count: sheet.cell_styles ? Object.keys(sheet.cell_styles).length : 0,
          has_notes: !!(sheet.cell_notes && Object.keys(sheet.cell_notes).length > 0),
          notes_count: sheet.cell_notes ? Object.keys(sheet.cell_notes).length : 0,
          has_merged_cells: !!(sheet.merged_cells && Object.keys(sheet.merged_cells).length > 0),
          merged_cells_count: sheet.merged_cells ? Object.keys(sheet.merged_cells).length : 0,
          has_merged_headers: !!(sheet.merged_headers && Object.keys(sheet.merged_headers).length > 0),
          has_sub_headers: !!(sheet.sub_headers && Object.keys(sheet.sub_headers).length > 0),
          has_charts: !!(sheet.charts && sheet.charts.length > 0),
          charts_count: (sheet.charts || []).length,
          has_saved_views: !!(sheet.saved_views && sheet.saved_views.length > 0),
          has_theme: !!sheet.theme_settings,
          has_google_sync: !!sheet.google_sheet_id,
          google_sheet_id: sheet.google_sheet_id || null,
          google_sheet_name: sheet.google_sheet_name || null,
          sync_direction: sheet.sync_config?.sync_direction || null,
          freeze_settings: sheet.freeze_settings || null,
          created_date: sheet.created_date,
          updated_date: sheet.updated_date
        })) : null,
      employee_time_summary: categories.includes('TimeLog') ?
        (() => {
          const summary = {};
          (allData['TimeLog'] || []).forEach(log => {
            const emp = log.user_email || log.created_by || 'unknown';
            if (!summary[emp]) summary[emp] = { total_seconds: 0, logs_count: 0 };
            summary[emp].total_seconds += (log.duration_seconds || 0);
            summary[emp].logs_count++;
          });
          return Object.entries(summary).map(([email, data]) => ({
            employee: email,
            total_hours: Math.round(data.total_seconds / 3600 * 100) / 100,
            logs_count: data.logs_count
          }));
        })() : null
    };
    
    const jsonStr = JSON.stringify(jsonData, null, 2);
    const jsonBytes = new TextEncoder().encode(jsonStr);
    
    return new Response(jsonBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename=full-backup-${dateStr}.json`
      }
    });

  } catch (error) {
    console.error("[exportAllData] Fatal error:", error.message, error.stack);
    
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    const errorContent = `Error: ${error.message}\nStack: ${error.stack}\nTime: ${now.toISOString()}`;
    const csvBytes = new TextEncoder().encode(errorContent);
    
    return new Response(csvBytes, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename=error-log-${dateStr}.csv`
      }
    });
  }
});