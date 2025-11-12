
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import XLSX from 'npm:xlsx@0.18.5';

Deno.serve(async (req) => {
  console.log('═══════════════════════════════════════════════════');
  console.log('📊 [PARSE SPREADSHEET] Function started');
  console.log('═══════════════════════════════════════════════════');
  
  try {
    // Auth
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      console.log('❌ [AUTH] Unauthorized');
      return Response.json({ 
        status: 'error',
        error: 'Unauthorized' 
      }, { status: 401 });
    }
    
    console.log('✅ [AUTH] User:', user.email);

    // Parse request
    const payload = await req.json().catch(() => ({}));
    const file_url = payload?.file_url;
    
    if (!file_url) {
      console.log('❌ [PAYLOAD] Missing file_url');
      return Response.json({ 
        status: 'error',
        error: 'Missing file_url parameter' 
      }, { status: 400 });
    }

    console.log('🔗 [FILE] URL:', file_url);

    // Fetch file
    console.log('📥 [FETCH] Downloading file...');
    const res = await fetch(file_url);
    
    if (!res.ok) {
      console.log('❌ [FETCH] Failed:', res.status);
      return Response.json({ 
        status: 'error',
        error: `Failed to fetch file: ${res.status}` 
      }, { status: 400 });
    }

    const contentType = res.headers.get('content-type') || '';
    const contentLength = res.headers.get('content-length') || '0';
    
    console.log('📊 [FILE] Content-Type:', contentType);
    console.log('📊 [FILE] Size:', contentLength, 'bytes');

    // Read as ArrayBuffer
    const arrayBuffer = await res.arrayBuffer();
    console.log('📦 [BUFFER] ArrayBuffer size:', arrayBuffer.byteLength);

    // Parse with XLSX
    console.log('📖 [XLSX] Parsing workbook...');
    const workbook = XLSX.read(arrayBuffer, { 
      type: 'array',
      cellDates: true,
      cellNF: false,
      cellText: false
    });

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      console.log('❌ [XLSX] No sheets found');
      return Response.json({ 
        status: 'error',
        error: 'No sheets found in workbook' 
      }, { status: 400 });
    }

    const sheetName = workbook.SheetNames[0];
    console.log('📄 [SHEET] Using sheet:', sheetName);
    console.log('📄 [SHEET] All available sheets:', workbook.SheetNames);
    
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    console.log('🔄 [CONVERT] Converting to JSON...');
    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
      raw: false,
      defval: '',
      blankrows: false
    });

    console.log('✅ [CONVERT] Rows:', jsonData.length);

    if (jsonData.length === 0) {
      console.log('⚠️ [DATA] No data rows found');
      return Response.json({
        status: 'success',
        rows: [],
        headers: [],
        count: 0,
        debug: {
          sheetName,
          contentType,
          fileSize: contentLength
        }
      });
    }

    // Extract headers
    const headers = Object.keys(jsonData[0]);
    console.log('📋 [HEADERS]', headers);
    console.log('📊 [SAMPLE] First row:', JSON.stringify(jsonData[0]));
    
    if (jsonData.length > 1) {
      console.log('📊 [SAMPLE] Second row:', JSON.stringify(jsonData[1]));
    }

    console.log('✅ [SUCCESS] Parse complete!');
    console.log('═══════════════════════════════════════════════════');

    return Response.json({
      status: 'success',
      rows: jsonData,
      headers: headers,
      count: jsonData.length,
      debug: {
        sheetName: sheetName,
        allSheets: workbook.SheetNames,
        contentType,
        fileSize: contentLength,
        rowCount: jsonData.length,
        columnCount: headers.length
      }
    });

  } catch (error) {
    console.error('═══════════════════════════════════════════════════');
    console.error('❌ [ERROR] Parse failed!');
    console.error('❌ [ERROR] Type:', error.constructor.name);
    console.error('❌ [ERROR] Message:', error?.message);
    console.error('❌ [ERROR] Stack:', error?.stack);
    console.error('═══════════════════════════════════════════════════');
    
    return Response.json({ 
      status: 'error',
      error: error?.message || 'Unknown error',
      details: error?.stack
    }, { status: 500 });
  }
});
