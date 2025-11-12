import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import * as XLSX from 'npm:xlsx@0.18.5';

Deno.serve(async (req) => {
  console.log('📊 [PARSER] Starting simple Excel parser');

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ status: 'error', error: 'Unauthorized' }, { status: 401 });
    }

    const { file_url } = await req.json();
    if (!file_url) {
      return Response.json({ status: 'error', error: 'Missing file_url' }, { status: 400 });
    }

    console.log('⬇️ Downloading:', file_url);
    const fileResponse = await fetch(file_url);
    const arrayBuffer = await fileResponse.arrayBuffer();
    console.log('✅ Downloaded:', arrayBuffer.byteLength, 'bytes');

    // קריאת Excel
    const workbook = XLSX.read(arrayBuffer, {
      type: 'array',
      cellDates: true,
      cellStyles: true,
      sheetStubs: true,
      raw: false
    });

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    
    console.log('📐 Range:', range.e.r + 1, 'rows x', range.e.c + 1, 'cols');

    // ✅ פשוט: שורה 1 = כותרת, שורה 2 = תת-כותרת
    const mergedCells = worksheet['!merges'] || [];
    console.log('🔗 Merged cells:', mergedCells.length);

    // קריאת שורה 1 (כותרת ראשית)
    const mainHeaders = [];
    for (let c = 0; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r: 0, c });
      const cell = worksheet[addr];
      mainHeaders.push(cell ? String(cell.w || cell.v || '') : '');
    }
    console.log('📋 Row 1 (main):', mainHeaders);

    // קריאת שורה 2 (תת-כותרות)
    const subHeaders = [];
    for (let c = 0; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r: 1, c });
      const cell = worksheet[addr];
      subHeaders.push(cell ? String(cell.w || cell.v || '') : '');
    }
    console.log('📋 Row 2 (sub):', subHeaders);

    // ✅ בניית כותרות סופיות: "כותרת - תת-כותרת"
    const finalHeaders = [];
    for (let c = 0; c <= range.e.c; c++) {
      const main = mainHeaders[c]?.trim() || '';
      const sub = subHeaders[c]?.trim() || '';
      
      if (main && sub) {
        finalHeaders.push(`${main} - ${sub}`);
      } else if (sub) {
        finalHeaders.push(sub);
      } else if (main) {
        finalHeaders.push(main);
      } else {
        finalHeaders.push(`עמודה ${c + 1}`);
      }
    }
    
    console.log('✅ Final headers:', finalHeaders);

    // ✅ קריאת נתונים משורה 3 ואילך
    const rows = [];
    for (let r = 2; r <= range.e.r; r++) {
      const rowData = {};
      let hasData = false;
      
      for (let c = 0; c <= range.e.c; c++) {
        const addr = XLSX.utils.encode_cell({ r, c });
        const cell = worksheet[addr];
        let value = cell ? String(cell.w || cell.v || '') : '';
        
        // המרת V/X לערכים ברורים
        if (value === 'V' || value === 'v' || value === '✓') {
          value = 'בוצע';
        } else if (value === 'X' || value === 'x' || value === '✗') {
          value = 'לא בוצע';
        }
        
        rowData[finalHeaders[c]] = value;
        if (value) hasData = true;
      }
      
      if (hasData) rows.push(rowData);
    }

    console.log('✅ Data rows:', rows.length);

    return Response.json({
      status: 'success',
      headers: finalHeaders,
      rows: rows,
      count: rows.length,
      debug: {
        sheetName,
        mainHeaders,
        subHeaders,
        mergedCells: mergedCells.length,
        totalRows: range.e.r + 1,
        totalCols: range.e.c + 1
      }
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    return Response.json({
      status: 'error',
      error: error.message
    }, { status: 500 });
  }
});