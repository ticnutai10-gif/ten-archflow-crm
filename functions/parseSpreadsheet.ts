import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import * as XLSX from 'npm:xlsx@0.18.5';

Deno.serve(async (req) => {
  console.log('═══════════════════════════════════════════════════');
  console.log('🧠 [SMART PARSER] Intelligent Structure Detection');
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

    console.log('⬇️ [FETCH] Downloading:', file_url);
    const fileResponse = await fetch(file_url);
    const arrayBuffer = await fileResponse.arrayBuffer();
    console.log('✅ [FETCH]', arrayBuffer.byteLength, 'bytes');

    const workbook = XLSX.read(arrayBuffer, {
      type: 'array',
      cellDates: true,
      cellStyles: true,
      cellNF: true,
      sheetStubs: true,
      raw: false
    });

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    
    console.log('📐 [RANGE]', range.e.r + 1, 'rows x', range.e.c + 1, 'cols');

    // ✅ זיהוי תאים ממוזגים
    const mergedCells = worksheet['!merges'] || [];
    console.log('🔗 [MERGED]', mergedCells.length, 'ranges found');
    
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

    // ✅ קריאת 10 שורות ראשונות לניתוח
    const firstRows = [];
    for (let r = 0; r <= Math.min(10, range.e.r); r++) {
      const row = [];
      for (let c = 0; c <= range.e.c; c++) {
        const cellAddr = XLSX.utils.encode_cell({ r, c });
        const cell = worksheet[cellAddr];
        const mergeInfo = mergeMap.get(cellAddr);
        
        let value = '';
        let formatted = '';
        
        if (cell) {
          value = String(cell.v || '');
          formatted = String(cell.w || cell.v || '');
        }
        
        // אם תא ממוזג ולא התא הראשי - קח מהתא הראשי
        if (mergeInfo && !mergeInfo.isTopLeft) {
          const masterCell = worksheet[mergeInfo.masterCell];
          if (masterCell) {
            value = String(masterCell.v || '');
            formatted = String(masterCell.w || masterCell.v || '');
          }
        }
        
        row.push({
          value,
          formatted,
          type: cell ? cell.t : 'z',
          style: cell ? (cell.s || null) : null,
          merged: mergeInfo,
          isEmpty: !value || value.trim() === ''
        });
      }
      firstRows.push(row);
    }

    // 🧠 אלגוריתם זיהוי כותרות אוטומטי
    const detectHeaderRows = (rows) => {
      const scores = [];
      
      for (let idx = 0; idx < Math.min(5, rows.length); idx++) {
        const row = rows[idx];
        let score = 0;
        
        // 1️⃣ תאים ממוזגים = כותרת חזקה (10 נקודות)
        const mergedCount = row.filter(c => c.merged?.isTopLeft).length;
        score += mergedCount * 10;
        
        // 2️⃣ טקסט vs מספרים (5 נקודות אם יותר טקסט)
        const textCells = row.filter(c => c.type === 's' && c.value).length;
        const numericCells = row.filter(c => c.type === 'n').length;
        if (textCells > numericCells) score += 5;
        
        // 3️⃣ אורך טקסט קצר = כותרת (3 נקודות)
        const nonEmptyCells = row.filter(c => !c.isEmpty);
        const avgLength = nonEmptyCells.reduce((sum, c) => sum + c.value.length, 0) / (nonEmptyCells.length || 1);
        if (avgLength > 0 && avgLength < 50) score += 3;
        
        // 4️⃣ עיצוב מיוחד (2 נקודות)
        const styledCells = row.filter(c => c.style).length;
        score += Math.min(styledCells, 5) * 2;
        
        // 5️⃣ אחוז תאים מלאים (2 נקודות אם מעל 50%)
        const fillRate = nonEmptyCells.length / row.length;
        if (fillRate > 0.5) score += 2;
        
        // 6️⃣ בונוס לשורות ראשונות
        if (idx === 0) score += 15;
        if (idx === 1) score += 10;
        if (idx === 2) score += 5;
        
        // 7️⃣ בדיקה אם יש תווי V/X רבים = סימן שזה נתונים (הפחתת ציון)
        const vxCount = row.filter(c => {
          const v = c.value.toUpperCase();
          return v === 'V' || v === 'X' || v === '✓' || v === '✗';
        }).length;
        if (vxCount > row.length * 0.3) score -= 15;
        
        scores.push({ rowIndex: idx, score });
      }
      
      console.log('📊 [SCORES]:', scores.map(s => `R${s.rowIndex}:${s.score}`).join(', '));
      
      // שורות עם ציון מעל 15 = כותרות
      const headerRows = scores
        .filter(s => s.score >= 15)
        .sort((a, b) => a.rowIndex - b.rowIndex)
        .map(s => s.rowIndex);
      
      // אם לא מצאנו - שורה 0 בלבד
      return headerRows.length > 0 ? headerRows : [0];
    };

    const headerRowIndices = detectHeaderRows(firstRows);
    console.log('✅ [HEADERS] Auto-detected rows:', headerRowIndices);

    // ✅ בניית כותרות סופיות (הירארכיות)
    const buildFinalHeaders = () => {
      const finalHeaders = [];
      
      for (let c = 0; c <= range.e.c; c++) {
        const parts = [];
        
        // אסוף כותרות מכל הרמות
        headerRowIndices.forEach(rowIdx => {
          const cell = firstRows[rowIdx][c];
          if (cell && cell.value && cell.value.trim()) {
            parts.push(cell.value.trim());
          }
        });
        
        // בניית כותרת סופית
        if (parts.length > 1) {
          // הירארכיה: "כותרת ראשית - תת-כותרת"
          finalHeaders.push(parts.join(' - '));
        } else if (parts.length === 1) {
          finalHeaders.push(parts[0]);
        } else {
          finalHeaders.push(`עמודה ${c + 1}`);
        }
      }
      
      console.log('📋 [FINAL]:', finalHeaders);
      return finalHeaders;
    };

    const headers = buildFinalHeaders();

    // ✅ קריאת נתונים (מתחת לכותרות)
    const dataStartRow = Math.max(...headerRowIndices) + 1;
    console.log('📊 [DATA] Starting from row:', dataStartRow + 1);

    const rows = [];
    for (let r = dataStartRow; r <= range.e.r; r++) {
      const rowData = {};
      let hasData = false;
      
      for (let c = 0; c <= range.e.c; c++) {
        const cellAddr = XLSX.utils.encode_cell({ r, c });
        const cell = worksheet[cellAddr];
        let value = cell ? String(cell.w || cell.v || '') : '';
        
        // המרת V/X
        const upperValue = value.toUpperCase().trim();
        if (upperValue === 'V' || upperValue === '✓') {
          value = 'בוצע';
        } else if (upperValue === 'X' || upperValue === '✗') {
          value = 'לא בוצע';
        }
        
        rowData[headers[c]] = value;
        if (value) hasData = true;
      }
      
      if (hasData) rows.push(rowData);
    }

    console.log('✅ [SUCCESS]', rows.length, 'data rows extracted');
    console.log('═══════════════════════════════════════════════════');

    return Response.json({
      status: 'success',
      headers: headers,
      rows: rows,
      count: rows.length,
      debug: {
        sheetName,
        totalRows: range.e.r + 1,
        totalCols: range.e.c + 1,
        headerRows: headerRowIndices,
        headerLevels: headerRowIndices.length,
        mergedCellsCount: mergedCells.length,
        dataStartRow: dataStartRow + 1
      },
      structure: {
        hasMultiLevelHeaders: headerRowIndices.length > 1,
        hasMergedCells: mergedCells.length > 0,
        headerRowIndices: headerRowIndices,
        detectionMethod: 'automatic-scoring',
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