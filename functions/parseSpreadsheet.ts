import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import * as XLSX from 'npm:xlsx@0.18.5';

Deno.serve(async (req) => {
  console.log('═══════════════════════════════════════════════════');
  console.log('📊 [ADVANCED PARSER] Microsoft Research Algorithm');
  console.log('═══════════════════════════════════════════════════');

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

    console.log('⬇️ [FETCH] Downloading file:', file_url);
    const fileResponse = await fetch(file_url);
    if (!fileResponse.ok) {
      return Response.json({ status: 'error', error: `Failed to download: ${fileResponse.status}` }, { status: 400 });
    }

    const arrayBuffer = await fileResponse.arrayBuffer();
    console.log('✅ [FETCH] Downloaded:', arrayBuffer.byteLength, 'bytes');

    // קריאת Workbook עם כל המידע
    const workbook = XLSX.read(arrayBuffer, {
      type: 'array',
      cellDates: true,
      cellStyles: true,
      cellNF: true,
      sheetStubs: true,
      raw: false,
      dense: false
    });

    const sheetName = workbook.SheetNames[0];
    console.log('📄 [SHEET] Processing:', sheetName);
    
    const worksheet = workbook.Sheets[sheetName];
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    
    console.log('📐 [RANGE] Dimensions:', {
      rows: range.e.r + 1,
      cols: range.e.c + 1,
      range: worksheet['!ref']
    });

    // ✅ זיהוי תאים ממוזגים (Merged Cells)
    const mergedCells = worksheet['!merges'] || [];
    console.log('🔗 [MERGED] Found', mergedCells.length, 'merged cell ranges');
    
    const mergeMap = new Map();
    mergedCells.forEach(merge => {
      for (let R = merge.s.r; R <= merge.e.r; R++) {
        for (let C = merge.s.c; C <= merge.e.c; C++) {
          const addr = XLSX.utils.encode_cell({ r: R, c: C });
          mergeMap.set(addr, {
            masterCell: XLSX.utils.encode_cell({ r: merge.s.r, c: merge.s.c }),
            spanRows: merge.e.r - merge.s.r + 1,
            spanCols: merge.e.c - merge.s.c + 1,
            isTopLeft: R === merge.s.r && C === merge.s.c
          });
        }
      }
    });

    // ✅ זיהוי שורות כותרת (Header Detection Algorithm)
    console.log('🧠 [HEADER DETECTION] Analyzing table structure...');
    
    const firstRows = [];
    for (let r = 0; r <= Math.min(5, range.e.r); r++) {
      const row = [];
      for (let c = 0; c <= range.e.c; c++) {
        const cellAddr = XLSX.utils.encode_cell({ r, c });
        const cell = worksheet[cellAddr];
        row.push({
          value: cell ? (cell.v || '') : '',
          formatted: cell ? (cell.w || cell.v || '') : '',
          type: cell ? cell.t : 'z',
          style: cell ? cell.s : null,
          merged: mergeMap.get(cellAddr)
        });
      }
      firstRows.push(row);
    }

    // אלגוריתם זיהוי כותרות (Microsoft Research inspired)
    const detectHeaderRows = (rows) => {
      const scores = rows.map((row, idx) => {
        let score = 0;
        
        // 1. תאים ממוזגים = סימן לכותרת
        const mergedCount = row.filter(c => c.merged?.isTopLeft).length;
        score += mergedCount * 10;
        
        // 2. בדיקת טקסט vs מספרים
        const textCells = row.filter(c => c.type === 's' && c.value).length;
        const numericCells = row.filter(c => c.type === 'n').length;
        if (textCells > numericCells) score += 5;
        
        // 3. אורך ממוצע של טקסט (כותרות בדרך כלל קצרות)
        const avgLength = row.reduce((sum, c) => sum + String(c.value).length, 0) / row.length;
        if (avgLength < 30) score += 3;
        
        // 4. עיצוב מיוחד (bold, background color)
        const styledCells = row.filter(c => c.style).length;
        score += styledCells * 2;
        
        // 5. שורות ראשונות מקבלות בונוס
        if (idx === 0) score += 15;
        if (idx === 1) score += 10;
        
        return { rowIndex: idx, score, row };
      });
      
      scores.sort((a, b) => b.score - a.score);
      console.log('📊 [HEADER SCORES]:', scores.map(s => `Row ${s.rowIndex}: ${s.score}`).join(', '));
      
      // שורות עם ציון גבוה = כותרות
      const headerRows = scores.filter(s => s.score > 10).map(s => s.rowIndex);
      return headerRows.length > 0 ? headerRows : [0];
    };

    const headerRowIndices = detectHeaderRows(firstRows);
    console.log('✅ [HEADERS] Detected header rows:', headerRowIndices);

    // ✅ בניית מבנה הירארכי של כותרות
    const buildHeaderHierarchy = () => {
      const hierarchy = [];
      
      headerRowIndices.forEach(rowIdx => {
        const headerLevel = [];
        
        for (let c = 0; c <= range.e.c; c++) {
          const cellAddr = XLSX.utils.encode_cell({ r: rowIdx, c });
          const cell = worksheet[cellAddr];
          const mergeInfo = mergeMap.get(cellAddr);
          
          let headerText = cell ? String(cell.w || cell.v || '') : '';
          
          // אם זה תא ממוזג, קח את הערך מהתא הראשי
          if (mergeInfo && !mergeInfo.isTopLeft) {
            const masterCell = worksheet[mergeInfo.masterCell];
            headerText = masterCell ? String(masterCell.w || masterCell.v || '') : '';
          }
          
          headerLevel.push({
            col: c,
            text: headerText,
            merged: mergeInfo,
            isEmpty: !headerText || headerText.trim() === ''
          });
        }
        
        hierarchy.push(headerLevel);
      });
      
      return hierarchy;
    };

    const headerHierarchy = buildHeaderHierarchy();
    console.log('🌳 [HIERARCHY] Built', headerHierarchy.length, 'header levels');

    // ✅ פילוס הכותרות למערך אחד
    const flattenHeaders = () => {
      const finalHeaders = [];
      
      for (let c = 0; c <= range.e.c; c++) {
        const parts = [];
        
        // אסוף את כל רמות הכותרות לעמודה זו
        headerHierarchy.forEach((level, levelIdx) => {
          const header = level[c];
          if (header && header.text && header.text.trim()) {
            parts.push(header.text.trim());
          }
        });
        
        // איחוד הכותרות
        if (parts.length > 1) {
          // כותרת הירארכית: "כותרת ראשית - תת כותרת"
          finalHeaders.push(parts.join(' - '));
          console.log(`📋 [COL ${c}] Hierarchical: "${parts.join(' → ')}"`);
        } else if (parts.length === 1) {
          finalHeaders.push(parts[0]);
        } else {
          finalHeaders.push(`עמודה ${c + 1}`);
        }
      }
      
      return finalHeaders;
    };

    const headers = flattenHeaders();
    console.log('📋 [FINAL HEADERS]:', headers);

    // ✅ קריאת שורות הנתונים (מתחת לכותרות)
    const dataStartRow = Math.max(...headerRowIndices) + 1;
    console.log('📊 [DATA] Starting from row:', dataStartRow + 1);

    const rows = [];
    for (let r = dataStartRow; r <= range.e.r; r++) {
      const rowData = {};
      let hasData = false;
      
      for (let c = 0; c <= range.e.c; c++) {
        const cellAddr = XLSX.utils.encode_cell({ r, c });
        const cell = worksheet[cellAddr];
        const value = cell ? String(cell.w || cell.v || '') : '';
        
        rowData[headers[c]] = value;
        if (value) hasData = true;
      }
      
      if (hasData) {
        rows.push(rowData);
      }
    }

    console.log('✅ [SUCCESS] Extracted:', rows.length, 'data rows');
    console.log('═══════════════════════════════════════════════════');

    return Response.json({
      status: 'success',
      rows: rows,
      headers: headers,
      count: rows.length,
      debug: {
        sheetName,
        totalRows: range.e.r + 1,
        totalCols: range.e.c + 1,
        headerRows: headerRowIndices,
        headerLevels: headerHierarchy.length,
        mergedCellsCount: mergedCells.length,
        dataStartRow: dataStartRow + 1
      },
      structure: {
        hasMultiLevelHeaders: headerHierarchy.length > 1,
        hasMergedCells: mergedCells.length > 0,
        headerRowIndices: headerRowIndices,
        mergedRegions: mergedCells.map(m => ({
          range: `${XLSX.utils.encode_cell(m.s)}:${XLSX.utils.encode_cell(m.e)}`,
          rows: m.e.r - m.s.r + 1,
          cols: m.e.c - m.s.c + 1
        }))
      }
    });

  } catch (error) {
    console.error('❌ [ERROR]', error.message);
    return Response.json({
      status: 'error',
      error: error.message
    }, { status: 500 });
  }
});