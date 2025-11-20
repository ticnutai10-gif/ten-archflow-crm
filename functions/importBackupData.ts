import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import XLSX from 'npm:xlsx@0.18.5';
import Papa from 'npm:papaparse@5.4.1';

function inferExt(filename = "") {
  try {
    const parts = filename.toLowerCase().split('.');
    return parts.length > 1 ? parts.pop() : '';
  } catch {
    return '';
  }
}

function decodeCsvBuffer(ab) {
  const u8 = new Uint8Array(ab);
  
  // BOM detection
  const hasUtf8Bom = u8.length >= 3 && u8[0] === 0xEF && u8[1] === 0xBB && u8[2] === 0xBF;
  const hasUtf16LE = u8.length >= 2 && u8[0] === 0xFF && u8[1] === 0xFE;
  const hasUtf16BE = u8.length >= 2 && u8[0] === 0xFE && u8[1] === 0xFF;

  const encodingsToTry = ['utf-8', 'windows-1255', 'iso-8859-8', 'utf-16le', 'utf-16be', 'windows-1252'];

  if (hasUtf16LE) {
    try { 
      return new TextDecoder('utf-16le').decode(u8); 
    } catch (e) {
      console.warn('UTF-16LE decode failed:', e);
    }
  }
  if (hasUtf16BE) {
    try { 
      return new TextDecoder('utf-16be').decode(u8); 
    } catch (e) {
      console.warn('UTF-16BE decode failed:', e);
    }
  }
  if (hasUtf8Bom) {
    try { 
      return new TextDecoder('utf-8').decode(u8); 
    } catch (e) {
      console.warn('UTF-8 BOM decode failed:', e);
    }
  }

  for (const encoding of encodingsToTry) {
    try {
      const decoder = new TextDecoder(encoding, { fatal: false });
      const text = decoder.decode(u8);
      if (text && text.length > 0) {
        return text;
      }
    } catch (e) {
      console.warn(`Encoding ${encoding} failed:`, e);
    }
  }

  return new TextDecoder('utf-8', { fatal: false }).decode(u8);
}

function parseExcelFile(buffer) {
  const wb = XLSX.read(buffer, { type: 'array' });
  const result = {};
  
  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
    result[sheetName] = rows;
  }
  
  return result;
}

function parseCsvFile(buffer) {
  const text = decodeCsvBuffer(buffer);
  const sections = {};
  
  // Check if it's a multi-section CSV (with ### headers)
  if (text.includes('### ') && text.includes(' ###')) {
    const parts = text.split(/### (.+?) ###/);
    
    for (let i = 1; i < parts.length; i += 2) {
      const sectionName = parts[i].trim();
      const sectionData = parts[i + 1];
      
      if (sectionData && sectionData.trim()) {
        const parsed = Papa.parse(sectionData.trim(), { 
          header: true, 
          skipEmptyLines: true 
        });
        sections[sectionName] = parsed.data || [];
      }
    }
  } else {
    // Regular CSV file - treat as single entity
    const parsed = Papa.parse(text, { 
      header: true, 
      skipEmptyLines: true 
    });
    sections['ImportedData'] = parsed.data || [];
  }
  
  return sections;
}

function parseJsonFile(buffer) {
  const text = new TextDecoder().decode(buffer);
  const data = JSON.parse(text);
  
  // Handle different JSON structures
  if (data.data && typeof data.data === 'object') {
    return data.data; // Backup format
  } else if (typeof data === 'object' && !Array.isArray(data)) {
    return data; // Direct object with entities
  } else {
    return { ImportedData: Array.isArray(data) ? data : [data] };
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file');
    const importMode = formData.get('mode') || 'create'; // create, update, merge
    
    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }

    const filename = file.name || 'unknown';
    const ext = inferExt(filename);
    const buffer = await file.arrayBuffer();
    
    console.log(`[importBackupData] Processing file: ${filename}, size: ${buffer.byteLength} bytes, extension: ${ext}`);

    let parsedData = {};

    try {
      switch (ext) {
        case 'xlsx':
        case 'xls':
          parsedData = parseExcelFile(buffer);
          break;
        case 'csv':
          parsedData = parseCsvFile(buffer);
          break;
        case 'json':
          parsedData = parseJsonFile(buffer);
          break;
        default:
          return Response.json({ error: `Unsupported file type: ${ext}` }, { status: 400 });
      }
    } catch (parseError) {
      console.error('[importBackupData] Parse error:', parseError);
      return Response.json({ error: `Failed to parse ${ext} file: ${parseError.message}` }, { status: 400 });
    }

    console.log(`[importBackupData] Parsed entities:`, Object.keys(parsedData));

    const results = {};
    let totalCreated = 0;
    let totalUpdated = 0;
    let totalErrors = 0;

    // Import each entity
    for (const [entityName, records] of Object.entries(parsedData)) {
      if (!Array.isArray(records) || records.length === 0) {
        console.log(`[importBackupData] Skipping ${entityName} - no valid records`);
        continue;
      }

      console.log(`[importBackupData] Processing ${entityName} with ${records.length} records`);

      let created = 0;
      let updated = 0;
      let errors = 0;

      try {
        const Entity = base44.entities[entityName];
        if (!Entity) {
          console.warn(`[importBackupData] Entity ${entityName} not found, skipping`);
          results[entityName] = { error: 'Entity not found', created: 0, updated: 0, errors: records.length };
          totalErrors += records.length;
          continue;
        }

        for (const record of records) {
          try {
            // Clean record - remove built-in fields that shouldn't be imported
            const cleanRecord = { ...record };
            delete cleanRecord.id;
            delete cleanRecord.created_date;
            delete cleanRecord.updated_date;
            delete cleanRecord.created_by;

            // Skip empty records
            if (Object.keys(cleanRecord).length === 0) continue;

            if (importMode === 'update' && record.id) {
              try {
                await Entity.update(record.id, cleanRecord);
                updated++;
              } catch (updateError) {
                // If update fails, try create
                await Entity.create(cleanRecord);
                created++;
              }
            } else {
              await Entity.create(cleanRecord);
              created++;
            }
          } catch (recordError) {
            console.error(`[importBackupData] Error processing record in ${entityName}:`, recordError.message);
            errors++;
          }
        }

        results[entityName] = { created, updated, errors };
        totalCreated += created;
        totalUpdated += updated;
        totalErrors += errors;

        console.log(`[importBackupData] ${entityName}: ${created} created, ${updated} updated, ${errors} errors`);

      } catch (entityError) {
        console.error(`[importBackupData] Error processing entity ${entityName}:`, entityError);
        results[entityName] = { error: entityError.message, created: 0, updated: 0, errors: records.length };
        totalErrors += records.length;
      }
    }

    return Response.json({
      success: true,
      message: `Import completed: ${totalCreated} created, ${totalUpdated} updated, ${totalErrors} errors`,
      results,
      totals: {
        created: totalCreated,
        updated: totalUpdated,
        errors: totalErrors
      }
    });

  } catch (error) {
    console.error('[importBackupData] Fatal error:', error);
    return Response.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});