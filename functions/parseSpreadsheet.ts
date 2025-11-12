import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import XLSX from 'npm:xlsx@0.18.5';
import Papa from 'npm:papaparse@5.4.1';

function inferExt(nameOrUrl = "") {
  try {
    const qless = nameOrUrl.split('?')[0] || "";
    const parts = qless.toLowerCase().split('.');
    return parts.length > 1 ? parts.pop() : '';
  } catch {
    return '';
  }
}

// ✅ תמיכה מלאה בעברית - פענוח חכם של CSV
function decodeCsvBuffer(ab) {
  const u8 = new Uint8Array(ab);
  
  // זיהוי BOM
  const hasUtf8Bom = u8.length >= 3 && u8[0] === 0xEF && u8[1] === 0xBB && u8[2] === 0xBF;
  const hasUtf16LE = u8.length >= 2 && u8[0] === 0xFF && u8[1] === 0xFE;
  const hasUtf16BE = u8.length >= 2 && u8[0] === 0xFE && u8[1] === 0xFF;

  // רשימת קידודים לנסות (כולל קידודי עברית)
  const encodingsToTry = [
    'utf-8',
    'windows-1255', // קידוד עברי של Windows
    'iso-8859-8',   // קידוד עברי ISO
    'utf-16le',
    'utf-16be',
    'windows-1252',
  ];

  // אם יש BOM, השתמש בקידוד הספציפי
  if (hasUtf16LE) {
    try {
      return new TextDecoder('utf-16le').decode(u8);
    } catch {
      // Continue to try other encodings
    }
  }
  if (hasUtf16BE) {
    try {
      return new TextDecoder('utf-16be').decode(u8);
    } catch {
      // Continue to try other encodings
    }
  }
  if (hasUtf8Bom) {
    try {
      return new TextDecoder('utf-8').decode(u8);
    } catch {
      // Continue to try other encodings
    }
  }

  // נסה כל קידוד ובדוק אם יש תווים עבריים או אם הטקסט נראה תקין
  for (const encoding of encodingsToTry) {
    try {
      const decoder = new TextDecoder(encoding, { fatal: false });
      const text = decoder.decode(u8);
      
      // בדיקה אם יש תווים עבריים או אם הטקסט נראה תקין
      if (containsHebrewOrLooksGood(text)) {
        console.log(`✅ פענוח CSV הצליח עם קידוד: ${encoding}`);
        return text;
      }
    } catch (e) {
      console.log(`❌ פענוח נכשל עם ${encoding}:`, e.message);
      continue;
    }
  }

  // פענוח ידני של Windows-1255 (קידוד עברי נפוץ)
  try {
    return manualDecodeWindows1255(u8);
  } catch {
    // אחרון - נסה UTF-8 עם שחזור שגיאות
    try {
      return new TextDecoder('utf-8', { fatal: false }).decode(u8);
    } catch {
      return '';
    }
  }
}

function containsHebrewOrLooksGood(text) {
  // בדיקת תווים עבריים (טווח Unicode U+0590 עד U+05FF)
  const hebrewRegex = /[\u0590-\u05FF]/;
  
  // מילים עבריות נפוצות
  const commonHebrewWords = ['שם', 'כתובת', 'טלפון', 'מייל', 'אימייל', 'לקוח', 'חברה', 'תאריך', 'סטטוס'];
  
  // בדיקה אם יש תווים עבריים
  if (hebrewRegex.test(text)) {
    return true;
  }
  
  // בדיקה אם יש מילים עבריות נפוצות
  for (const word of commonHebrewWords) {
    if (text.includes(word)) {
      return true;
    }
  }
  
  // בדיקה שאין יותר מדי תווי החלפה (�)
  const replacementCount = (text.match(/�/g) || []).length;
  const totalLength = text.length;
  
  // אם פחות מ-10% תווי החלפה, נחשיב את זה כטוב
  if (totalLength > 0 && (replacementCount / totalLength) < 0.1) {
    return true;
  }
  
  return false;
}

function manualDecodeWindows1255(bytes) {
  // מפת תווים של Windows-1255 (קידוד עברי)
  const cp1255Map = {
    0x80: 0x20AC, // סימן יורו
    0x82: 0x201A, // מרכאות בודדות
    0x83: 0x0192,
    0x84: 0x201E, // מרכאות כפולות
    0x85: 0x2026, // שלוש נקודות
    // אותיות עבריות מתחילות ב-0xE0
    0xE0: 0x05D0, // א
    0xE1: 0x05D1, // ב
    0xE2: 0x05D2, // ג
    0xE3: 0x05D3, // ד
    0xE4: 0x05D4, // ה
    0xE5: 0x05D5, // ו
    0xE6: 0x05D6, // ז
    0xE7: 0x05D7, // ח
    0xE8: 0x05D8, // ט
    0xE9: 0x05D9, // י
    0xEA: 0x05DA, // ך
    0xEB: 0x05DB, // כ
    0xEC: 0x05DC, // ל
    0xED: 0x05DD, // ם
    0xEE: 0x05DE, // מ
    0xEF: 0x05DF, // ן
    0xF0: 0x05E0, // נ
    0xF1: 0x05E1, // ס
    0xF2: 0x05E2, // ע
    0xF3: 0x05E3, // ף
    0xF4: 0x05E4, // פ
    0xF5: 0x05E5, // ץ
    0xF6: 0x05E6, // צ
    0xF7: 0x05E7, // ק
    0xF8: 0x05E8, // ר
    0xF9: 0x05E9, // ש
    0xFA: 0x05EA, // ת
  };

  let result = '';
  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i];
    
    if (byte < 0x80) {
      // טווח ASCII
      result += String.fromCharCode(byte);
    } else if (cp1255Map[byte] !== undefined) {
      if (cp1255Map[byte] !== null) {
        result += String.fromCharCode(cp1255Map[byte]);
      }
    } else {
      // ברירת מחדל לתווים לא ממופים
      result += String.fromCharCode(byte);
    }
  }
  
  return result;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json().catch(() => ({}));
    const file_url = payload?.file_url;
    if (!file_url) {
      return Response.json({ error: 'Missing file_url' }, { status: 400 });
    }

    console.log('📂 מעבד קובץ:', file_url);
    const ext = inferExt(file_url);
    const res = await fetch(file_url);
    if (!res.ok) {
      return Response.json({ error: `Failed to fetch file (${res.status})` }, { status: 400 });
    }

    let rows = [];
    let headers = [];

    if (ext === 'xlsx' || ext === 'xls') {
      console.log('📊 מעבד קובץ Excel');
      const ab = await res.arrayBuffer();
      const wb = XLSX.read(ab, { type: 'array' });
      const sheetName = wb.SheetNames?.[0];
      if (!sheetName) {
        return Response.json({ error: 'No sheets found in workbook' }, { status: 400 });
      }
      const ws = wb.Sheets[sheetName];
      rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
      headers = Array.from(new Set(rows.flatMap((r) => Object.keys(r || {}))));
      console.log(`✅ Excel עובד: ${rows.length} שורות, ${headers.length} עמודות`);
    } else if (ext === 'csv') {
      console.log('📄 מעבד CSV עם תמיכה מלאה בעברית');
      const ab = await res.arrayBuffer();
      const text = decodeCsvBuffer(ab);
      
      console.log('📝 תצוגה מקדימה:', text.substring(0, 200));
      
      const parsed = Papa.parse(text, { 
        header: true, 
        skipEmptyLines: true,
        encoding: 'utf-8'
      });
      
      if (parsed.errors && parsed.errors.length) {
        console.error('❌ שגיאות בפענוח CSV:', parsed.errors);
        return Response.json({ error: 'CSV parse error', details: parsed.errors }, { status: 400 });
      }
      
      rows = parsed.data || [];
      headers = parsed.meta?.fields || Array.from(new Set(rows.flatMap((r) => Object.keys(r || {}))));
      
      console.log(`✅ CSV עובד: ${rows.length} שורות, ${headers.length} עמודות`);
      console.log('📋 כותרות:', headers);
      console.log('📌 דוגמה ראשונה:', rows[0]);
    } else {
      return Response.json({ error: `Unsupported file type: .${ext}` }, { status: 400 });
    }

    return Response.json({
      status: 'success',
      rows,
      headers,
      count: rows.length,
      debug: {
        fileType: ext,
        headersFound: headers.length,
        firstRowKeys: rows[0] ? Object.keys(rows[0]) : []
      }
    });
  } catch (error) {
    console.error('❌ שגיאת פענוח:', error);
    return Response.json({ error: error?.message || 'Unknown error' }, { status: 500 });
  }
});