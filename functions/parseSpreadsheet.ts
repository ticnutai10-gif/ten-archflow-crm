import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import * as XLSX from 'npm:xlsx@0.18.5';

Deno.serve(async (req) => {
  console.log('═══════════════════════════════════════════════════');
  console.log('📊 [PARSE SPREADSHEET] Request received');
  console.log('═══════════════════════════════════════════════════');

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      console.log('❌ [AUTH] User not authenticated');
      return Response.json({ status: 'error', error: 'Unauthorized' }, { status: 401 });
    }

    console.log('✅ [AUTH] User authenticated:', user.email);

    const { file_url } = await req.json();
    console.log('📥 [INPUT] File URL:', file_url);

    if (!file_url) {
      return Response.json({ status: 'error', error: 'Missing file_url' }, { status: 400 });
    }

    console.log('⬇️ [FETCH] Downloading file...');
    const fileResponse = await fetch(file_url);

    if (!fileResponse.ok) {
      console.log('❌ [FETCH] Failed to download file:', fileResponse.status);
      return Response.json({ 
        status: 'error', 
        error: `Failed to download file: ${fileResponse.status}` 
      }, { status: 400 });
    }

    const contentType = fileResponse.headers.get('content-type');
    const contentLength = fileResponse.headers.get('content-length');
    console.log('📄 [FILE] Content-Type:', contentType);
    console.log('📄 [FILE] Size:', contentLength, 'bytes');

    const arrayBuffer = await fileResponse.arrayBuffer();
    console.log('✅ [FETCH] File downloaded, size:', arrayBuffer.byteLength, 'bytes');

    console.log('📖 [PARSE] Parsing workbook...');
    const workbook = XLSX.read(arrayBuffer, {
      type: 'array',
      cellDates: true,
      cellNF: false,
      cellText: false,
      raw: false,
      dense: false,
      sheetStubs: true // ✅ קריאת תאים ריקים
    });

    console.log('✅ [PARSE] Workbook parsed successfully');
    console.log('📚 [SHEETS] Available sheets:', workbook.SheetNames);

    const sheetName = workbook.SheetNames[0];
    console.log('📄 [SHEET] Using sheet:', sheetName);
    
    const worksheet = workbook.Sheets[sheetName];
    
    // ✅ קבלת הטווח המלא של הגיליון
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    console.log('📐 [RANGE] Sheet range:', worksheet['!ref']);
    console.log('📐 [RANGE] Rows:', range.e.r + 1, 'Columns:', range.e.c + 1);
    
    // המרה ל-JSON עם כל העמודות
    console.log('🔄 [CONVERT] Converting to JSON with all columns...');
    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
      raw: false,
      defval: '', // ✅ תאים ריקים יהפכו למחרוזת ריקה
      blankrows: false,
      header: 1 // ✅ שימוש בשורה הראשונה ככותרות
    });

    console.log('✅ [CONVERT] Conversion complete');
    console.log('📊 [DATA] Total rows:', jsonData.length);

    if (jsonData.length === 0) {
      console.log('⚠️ [DATA] No data rows found');
      return Response.json({
        status: 'success',
        rows: [],
        headers: [],
        count: 0,
        debug: {
          sheetName,
          allSheets: workbook.SheetNames,
          contentType,
          fileSize: contentLength,
          range: worksheet['!ref']
        }
      });
    }

    // ✅ חילוץ כותרות - כל העמודות!
    const firstRow = jsonData[0];
    const headers = [];
    
    // אם השורה הראשונה היא אובייקט עם מפתחות מספריים
    if (Array.isArray(firstRow)) {
      headers.push(...firstRow.map(h => String(h || '')));
    } else {
      // אובייקט - השתמש במפתחות
      const maxCol = range.e.c;
      for (let i = 0; i <= maxCol; i++) {
        const key = XLSX.utils.encode_col(i);
        headers.push(firstRow[key] || firstRow[i] || `עמודה ${i + 1}`);
      }
    }
    
    console.log('📋 [HEADERS] Extracted headers:', headers.length);
    console.log('📋 [HEADERS] Headers:', headers);
    
    // המרת כל השורות לפורמט אחיד
    const rows = jsonData.slice(1).map((row, rowIndex) => {
      const rowData = {};
      headers.forEach((header, colIndex) => {
        const value = Array.isArray(row) ? row[colIndex] : row[colIndex] || row[XLSX.utils.encode_col(colIndex)];
        rowData[header] = value != null ? String(value) : '';
      });
      
      if (rowIndex === 0) {
        console.log('📊 [SAMPLE] First data row:', JSON.stringify(rowData));
      }
      
      return rowData;
    });

    console.log('✅ [SUCCESS] Parse complete!');
    console.log('📊 [RESULT] Headers:', headers.length, 'Rows:', rows.length);
    console.log('═══════════════════════════════════════════════════');

    return Response.json({
      status: 'success',
      rows: rows,
      headers: headers,
      count: rows.length,
      debug: {
        sheetName: sheetName,
        allSheets: workbook.SheetNames,
        contentType,
        fileSize: contentLength,
        rowCount: rows.length,
        columnCount: headers.length,
        range: worksheet['!ref']
      }
    });

  } catch (error) {
    console.error('═══════════════════════════════════════════════════');
    console.error('❌ [ERROR] Exception occurred!');
    console.error('❌ [ERROR] Type:', error.constructor.name);
    console.error('❌ [ERROR] Message:', error.message);
    console.error('❌ [ERROR] Stack:', error.stack);
    console.error('═══════════════════════════════════════════════════');

    return Response.json({
      status: 'error',
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});