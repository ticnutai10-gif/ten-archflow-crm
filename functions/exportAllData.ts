import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

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
      'Client', 'Project', 'Quote', 'Task', 'TimeLog', 'Invoice'
    ];

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

    // CSV Export
    if (format === 'csv') {
      let csvContent = `# ArchFlow CRM Backup\n# Created: ${now.toISOString()}\n# Total Records: ${totalRecords}\n\n`;
      
      for (const name of categories) {
        const rows = allData[name] || [];
        if (rows.length === 0) {
          csvContent += `### ${name} ###\n# No data\n\n`;
          continue;
        }
        
        csvContent += `### ${name} (${rows.length} records) ###\n`;
        
        const cleanRows = cleanDataForCsv(rows);
        
        const allKeys = new Set();
        cleanRows.forEach(row => {
          Object.keys(row || {}).forEach(key => allKeys.add(key));
        });
        const headers = Array.from(allKeys);
        
        csvContent += headers.map(h => escapeCsv(h)).join(',') + '\n';
        
        cleanRows.forEach(row => {
          const values = headers.map(header => {
            return escapeCsv(row[header] || '');
          });
          csvContent += values.join(',') + '\n';
        });
        
        csvContent += '\n';
      }
      
      const csvBytes = new TextEncoder().encode(csvContent);
      
      return new Response(csvBytes, {
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

    // JSON Export (default)
    const jsonData = {
      backup_info: {
        created_at: now.toISOString(),
        format_version: '1.0',
        app: 'ArchFlow CRM'
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