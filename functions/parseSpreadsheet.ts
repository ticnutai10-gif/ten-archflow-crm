import { createClientFromRequest } from 'npm:@base44/sdk@0.7.0';
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

// Enhanced CSV decoder with Hebrew encoding support
function decodeCsvBuffer(ab) {
  const u8 = new Uint8Array(ab);
  
  // BOM detection
  const hasUtf8Bom = u8.length >= 3 && u8[0] === 0xEF && u8[1] === 0xBB && u8[2] === 0xBF;
  const hasUtf16LE = u8.length >= 2 && u8[0] === 0xFF && u8[1] === 0xFE;
  const hasUtf16BE = u8.length >= 2 && u8[0] === 0xFE && u8[1] === 0xFF;

  // List of encodings to try for Hebrew text
  const encodingsToTry = [
    'utf-8',
    'windows-1255', // Hebrew Windows encoding
    'iso-8859-8',   // Hebrew ISO encoding
    'utf-16le',
    'utf-16be',
    'windows-1252', // Western European fallback
  ];

  // If BOM detected, use specific encoding
  if (hasUtf16LE) {
    try {
      return new TextDecoder('utf-16le').decode(u8);
    } catch {
      // Fall through to try other encodings
    }
  }
  if (hasUtf16BE) {
    try {
      return new TextDecoder('utf-16be').decode(u8);
    } catch {
      // Fall through to try other encodings
    }
  }
  if (hasUtf8Bom) {
    try {
      return new TextDecoder('utf-8').decode(u8);
    } catch {
      // Fall through to try other encodings
    }
  }

  // Try each encoding and check for Hebrew characters
  for (const encoding of encodingsToTry) {
    try {
      const decoder = new TextDecoder(encoding, { fatal: false });
      const text = decoder.decode(u8);
      
      // Check if decoded text contains Hebrew characters or looks reasonable
      if (containsHebrewOrLooksGood(text)) {
        console.log(`Successfully decoded CSV with encoding: ${encoding}`);
        return text;
      }
    } catch (e) {
      console.log(`Failed to decode with ${encoding}:`, e.message);
      continue;
    }
  }

  // Ultimate fallback - try to manually decode as Windows-1255
  try {
    return manualDecodeWindows1255(u8);
  } catch {
    // Last resort - return as UTF-8 with error recovery
    try {
      return new TextDecoder('utf-8', { fatal: false }).decode(u8);
    } catch {
      return '';
    }
  }
}

function containsHebrewOrLooksGood(text) {
  // Check for Hebrew characters (Unicode range U+0590 to U+05FF)
  const hebrewRegex = /[\u0590-\u05FF]/;
  
  // Check for common Hebrew words
  const commonHebrewWords = ['שם', 'כתובת', 'טלפון', 'מייל', 'אימייל', 'לקוח', 'חברה'];
  
  // Check if text contains Hebrew characters or common Hebrew words
  if (hebrewRegex.test(text)) {
    return true;
  }
  
  for (const word of commonHebrewWords) {
    if (text.includes(word)) {
      return true;
    }
  }
  
  // Check if text doesn't contain too many replacement characters (�)
  const replacementCount = (text.match(/�/g) || []).length;
  const totalLength = text.length;
  
  // If less than 10% replacement characters, consider it good
  if (totalLength > 0 && (replacementCount / totalLength) < 0.1) {
    return true;
  }
  
  return false;
}

function manualDecodeWindows1255(bytes) {
  // Windows-1255 character map for Hebrew (partial)
  const cp1255Map = {
    0x80: 0x20AC, // Euro sign
    0x81: null,    // Undefined
    0x82: 0x201A, // Single low-9 quotation mark
    0x83: 0x0192, // Latin small letter f with hook
    0x84: 0x201E, // Double low-9 quotation mark
    0x85: 0x2026, // Horizontal ellipsis
    // ... more mappings would go here
    // Hebrew letters start at 0xE0
    0xE0: 0x05D0, // Hebrew letter Alef
    0xE1: 0x05D1, // Hebrew letter Bet
    0xE2: 0x05D2, // Hebrew letter Gimel
    0xE3: 0x05D3, // Hebrew letter Dalet
    0xE4: 0x05D4, // Hebrew letter He
    0xE5: 0x05D5, // Hebrew letter Vav
    0xE6: 0x05D6, // Hebrew letter Zayin
    0xE7: 0x05D7, // Hebrew letter Het
    0xE8: 0x05D8, // Hebrew letter Tet
    0xE9: 0x05D9, // Hebrew letter Yod
    0xEA: 0x05DA, // Hebrew letter Final Kaf
    0xEB: 0x05DB, // Hebrew letter Kaf
    0xEC: 0x05DC, // Hebrew letter Lamed
    0xED: 0x05DD, // Hebrew letter Final Mem
    0xEE: 0x05DE, // Hebrew letter Mem
    0xEF: 0x05DF, // Hebrew letter Final Nun
    0xF0: 0x05E0, // Hebrew letter Nun
    0xF1: 0x05E1, // Hebrew letter Samekh
    0xF2: 0x05E2, // Hebrew letter Ayin
    0xF3: 0x05E3, // Hebrew letter Final Pe
    0xF4: 0x05E4, // Hebrew letter Pe
    0xF5: 0x05E5, // Hebrew letter Final Tsadi
    0xF6: 0x05E6, // Hebrew letter Tsadi
    0xF7: 0x05E7, // Hebrew letter Qof
    0xF8: 0x05E8, // Hebrew letter Resh
    0xF9: 0x05E9, // Hebrew letter Shin
    0xFA: 0x05EA, // Hebrew letter Tav
  };

  let result = '';
  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i];
    
    if (byte < 0x80) {
      // ASCII range
      result += String.fromCharCode(byte);
    } else if (cp1255Map[byte] !== undefined) {
      if (cp1255Map[byte] !== null) {
        result += String.fromCharCode(cp1255Map[byte]);
      }
    } else {
      // Fallback for unmapped characters
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

    console.log('Parsing file:', file_url);
    const ext = inferExt(file_url);
    const res = await fetch(file_url);
    if (!res.ok) {
      return Response.json({ error: `Failed to fetch file (${res.status})` }, { status: 400 });
    }

    let rows = [];
    let headers = [];

    if (ext === 'xlsx' || ext === 'xls') {
      console.log('Processing Excel file');
      const ab = await res.arrayBuffer();
      const wb = XLSX.read(ab, { type: 'array' });
      const sheetName = wb.SheetNames?.[0];
      if (!sheetName) {
        return Response.json({ error: 'No sheets found in workbook' }, { status: 400 });
      }
      const ws = wb.Sheets[sheetName];
      rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
      headers = Array.from(new Set(rows.flatMap((r) => Object.keys(r || {}))));
      console.log(`Excel parsed: ${rows.length} rows, ${headers.length} headers`);
    } else if (ext === 'csv') {
      console.log('Processing CSV file with enhanced Hebrew support');
      const ab = await res.arrayBuffer();
      const text = decodeCsvBuffer(ab);
      
      console.log('Decoded text preview:', text.substring(0, 200));
      
      const parsed = Papa.parse(text, { 
        header: true, 
        skipEmptyLines: true,
        encoding: 'utf-8'
      });
      
      if (parsed.errors && parsed.errors.length) {
        console.error('CSV parse errors:', parsed.errors);
        return Response.json({ error: 'CSV parse error', details: parsed.errors }, { status: 400 });
      }
      
      rows = parsed.data || [];
      headers = parsed.meta?.fields || Array.from(new Set(rows.flatMap((r) => Object.keys(r || {}))));
      
      console.log(`CSV parsed: ${rows.length} rows, ${headers.length} headers`);
      console.log('Headers:', headers);
      console.log('First row sample:', rows[0]);
    } else if (ext === 'json') {
      console.log('Processing JSON file');
      const text = await res.text();
      try {
        const jsonData = JSON.parse(text);
        if (Array.isArray(jsonData)) {
          rows = jsonData;
        } else if (typeof jsonData === 'object' && Array.isArray(jsonData.data)) {
          rows = jsonData.data; // Handle { data: [...] } format
        } else if (typeof jsonData === 'object') {
          // Single object or unknown structure - wrap in array
          rows = [jsonData];
        } else {
          return Response.json({ error: 'Invalid JSON format. Expected an array of objects.' }, { status: 400 });
        }
        
        // Normalize rows to flat objects if needed (simple implementation)
        rows = rows.map(r => {
          if (typeof r !== 'object' || r === null) return { value: r };
          return r;
        });

        headers = Array.from(new Set(rows.flatMap((r) => Object.keys(r || {}))));
        console.log(`JSON parsed: ${rows.length} rows, ${headers.length} headers`);
      } catch (e) {
        return Response.json({ error: 'Invalid JSON file' }, { status: 400 });
      }
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
    console.error('Parse error:', error);
    return Response.json({ error: error?.message || 'Unknown error' }, { status: 500 });
  }
});