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

// Enhanced CSV decoder with Hebrew encoding support
function decodeCsvBuffer(ab) {
  console.log('🔍 [CSV DECODE] Starting CSV buffer decode...');
  console.log('🔍 [CSV DECODE] Buffer size:', ab.byteLength, 'bytes');
  
  const u8 = new Uint8Array(ab);
  console.log('🔍 [CSV DECODE] First 20 bytes:', Array.from(u8.slice(0, 20)));
  
  // BOM detection
  const hasUtf8Bom = u8.length >= 3 && u8[0] === 0xEF && u8[1] === 0xBB && u8[2] === 0xBF;
  const hasUtf16LE = u8.length >= 2 && u8[0] === 0xFF && u8[1] === 0xFE;
  const hasUtf16BE = u8.length >= 2 && u8[0] === 0xFE && u8[1] === 0xFF;

  console.log('🔍 [CSV DECODE] BOM detection:', { hasUtf8Bom, hasUtf16LE, hasUtf16BE });

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
    console.log('✅ [CSV DECODE] UTF-16LE BOM detected, using UTF-16LE');
    try {
      return new TextDecoder('utf-16le').decode(u8);
    } catch (e) {
      console.log('❌ [CSV DECODE] UTF-16LE decode failed:', e.message);
    }
  }
  if (hasUtf16BE) {
    console.log('✅ [CSV DECODE] UTF-16BE BOM detected, using UTF-16BE');
    try {
      return new TextDecoder('utf-16be').decode(u8);
    } catch (e) {
      console.log('❌ [CSV DECODE] UTF-16BE decode failed:', e.message);
    }
  }
  if (hasUtf8Bom) {
    console.log('✅ [CSV DECODE] UTF-8 BOM detected, using UTF-8');
    try {
      return new TextDecoder('utf-8').decode(u8);
    } catch (e) {
      console.log('❌ [CSV DECODE] UTF-8 decode failed:', e.message);
    }
  }

  // Try each encoding and check for Hebrew characters
  for (const encoding of encodingsToTry) {
    try {
      console.log(`🔍 [CSV DECODE] Trying encoding: ${encoding}`);
      const decoder = new TextDecoder(encoding, { fatal: false });
      const text = decoder.decode(u8);
      
      // Check if decoded text contains Hebrew characters or looks reasonable
      if (containsHebrewOrLooksGood(text)) {
        console.log(`✅ [CSV DECODE] Successfully decoded with ${encoding}`);
        console.log(`📄 [CSV DECODE] Text preview (first 200 chars):`, text.substring(0, 200));
        return text;
      } else {
        console.log(`⚠️ [CSV DECODE] ${encoding} decode didn't look good`);
      }
    } catch (e) {
      console.log(`❌ [CSV DECODE] Failed to decode with ${encoding}:`, e.message);
      continue;
    }
  }

  // Ultimate fallback - try to manually decode as Windows-1255
  console.log('🔍 [CSV DECODE] Trying manual Windows-1255 decode...');
  try {
    const text = manualDecodeWindows1255(u8);
    console.log('✅ [CSV DECODE] Manual Windows-1255 decode complete');
    return text;
  } catch {
    console.log('❌ [CSV DECODE] Manual decode failed, using UTF-8 fallback');
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
    0x80: 0x20AC, 0x82: 0x201A, 0x83: 0x0192, 0x84: 0x201E, 0x85: 0x2026,
    0xE0: 0x05D0, 0xE1: 0x05D1, 0xE2: 0x05D2, 0xE3: 0x05D3, 0xE4: 0x05D4,
    0xE5: 0x05D5, 0xE6: 0x05D6, 0xE7: 0x05D7, 0xE8: 0x05D8, 0xE9: 0x05D9,
    0xEA: 0x05DA, 0xEB: 0x05DB, 0xEC: 0x05DC, 0xED: 0x05DD, 0xEE: 0x05DE,
    0xEF: 0x05DF, 0xF0: 0x05E0, 0xF1: 0x05E1, 0xF2: 0x05E2, 0xF3: 0x05E3,
    0xF4: 0x05E4, 0xF5: 0x05E5, 0xF6: 0x05E6, 0xF7: 0x05E7, 0xF8: 0x05E8,
    0xF9: 0x05E9, 0xFA: 0x05EA,
  };

  let result = '';
  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i];
    
    if (byte < 0x80) {
      result += String.fromCharCode(byte);
    } else if (cp1255Map[byte] !== undefined) {
      if (cp1255Map[byte] !== null) {
        result += String.fromCharCode(cp1255Map[byte]);
      }
    } else {
      result += String.fromCharCode(byte);
    }
  }
  
  return result;
}

Deno.serve(async (req) => {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('📊 [PARSE SPREADSHEET] Function invoked');
  console.log('═══════════════════════════════════════════════════');
  
  try {
    // Auth check
    console.log('🔐 [AUTH] Checking authentication...');
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      console.log('❌ [AUTH] Unauthorized - no user found');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.log('✅ [AUTH] User authenticated:', user.email);

    // Parse payload
    console.log('📥 [PAYLOAD] Parsing request payload...');
    const payload = await req.json().catch(() => ({}));
    console.log('📥 [PAYLOAD] Payload received:', JSON.stringify(payload, null, 2));
    
    const file_url = payload?.file_url;
    if (!file_url) {
      console.log('❌ [PAYLOAD] Missing file_url in payload');
      return Response.json({ error: 'Missing file_url' }, { status: 400 });
    }

    console.log('🔗 [FILE] File URL:', file_url);
    
    // Determine file type
    const ext = inferExt(file_url);
    console.log('🔍 [FILE] Detected extension:', ext);
    
    // Fetch file
    console.log('📥 [FETCH] Fetching file from URL...');
    const res = await fetch(file_url);
    console.log('📥 [FETCH] Response status:', res.status, res.statusText);
    
    if (!res.ok) {
      console.log('❌ [FETCH] Failed to fetch file');
      return Response.json({ error: `Failed to fetch file (${res.status})` }, { status: 400 });
    }
    
    const contentType = res.headers.get('content-type');
    const contentLength = res.headers.get('content-length');
    console.log('📥 [FETCH] Content-Type:', contentType);
    console.log('📥 [FETCH] Content-Length:', contentLength, 'bytes');

    let rows = [];
    let headers = [];

    if (ext === 'xlsx' || ext === 'xls') {
      console.log('\n📊 [EXCEL] Processing Excel file...');
      const ab = await res.arrayBuffer();
      console.log('📊 [EXCEL] ArrayBuffer size:', ab.byteLength, 'bytes');
      
      console.log('📊 [EXCEL] Reading workbook with XLSX...');
      const wb = XLSX.read(ab, { type: 'array' });
      console.log('📊 [EXCEL] Workbook loaded');
      console.log('📊 [EXCEL] Sheet names:', wb.SheetNames);
      
      const sheetName = wb.SheetNames?.[0];
      if (!sheetName) {
        console.log('❌ [EXCEL] No sheets found in workbook');
        return Response.json({ error: 'No sheets found in workbook' }, { status: 400 });
      }
      
      console.log('📊 [EXCEL] Using sheet:', sheetName);
      const ws = wb.Sheets[sheetName];
      
      console.log('📊 [EXCEL] Converting sheet to JSON...');
      rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
      console.log('📊 [EXCEL] Rows converted:', rows.length);
      
      if (rows.length > 0) {
        console.log('📊 [EXCEL] First row sample:', JSON.stringify(rows[0]));
        console.log('📊 [EXCEL] Second row sample:', rows.length > 1 ? JSON.stringify(rows[1]) : 'N/A');
      }
      
      headers = Array.from(new Set(rows.flatMap((r) => Object.keys(r || {}))));
      console.log('📊 [EXCEL] Headers extracted:', headers);
      
    } else if (ext === 'csv') {
      console.log('\n📄 [CSV] Processing CSV file...');
      const ab = await res.arrayBuffer();
      console.log('📄 [CSV] ArrayBuffer size:', ab.byteLength, 'bytes');
      
      const text = decodeCsvBuffer(ab);
      console.log('📄 [CSV] Text decoded, length:', text.length, 'characters');
      console.log('📄 [CSV] Text preview (first 300 chars):', text.substring(0, 300));
      
      console.log('📄 [CSV] Parsing with PapaParse...');
      const parsed = Papa.parse(text, { 
        header: true, 
        skipEmptyLines: true,
        encoding: 'utf-8'
      });
      
      if (parsed.errors && parsed.errors.length) {
        console.error('❌ [CSV] Parse errors:', parsed.errors);
        return Response.json({ 
          error: 'CSV parse error', 
          details: parsed.errors 
        }, { status: 400 });
      }
      
      rows = parsed.data || [];
      console.log('📄 [CSV] Rows parsed:', rows.length);
      
      if (rows.length > 0) {
        console.log('📄 [CSV] First row sample:', JSON.stringify(rows[0]));
        console.log('📄 [CSV] Second row sample:', rows.length > 1 ? JSON.stringify(rows[1]) : 'N/A');
      }
      
      headers = parsed.meta?.fields || Array.from(new Set(rows.flatMap((r) => Object.keys(r || {}))));
      console.log('📄 [CSV] Headers extracted:', headers);
      
    } else {
      console.log('❌ [FILE] Unsupported file type:', ext);
      return Response.json({ error: `Unsupported file type: .${ext}` }, { status: 400 });
    }

    console.log('\n✅ [SUCCESS] Parse completed successfully!');
    console.log('✅ [SUCCESS] Total rows:', rows.length);
    console.log('✅ [SUCCESS] Total headers:', headers.length);
    console.log('═══════════════════════════════════════════════════\n');

    return Response.json({
      status: 'success',
      rows,
      headers,
      count: rows.length,
      debug: {
        fileType: ext,
        headersFound: headers.length,
        firstRowKeys: rows[0] ? Object.keys(rows[0]) : [],
        contentType,
        contentLength
      }
    });
  } catch (error) {
    console.error('\n═══════════════════════════════════════════════════');
    console.error('❌ [ERROR] Parse failed!');
    console.error('❌ [ERROR] Error type:', error.constructor.name);
    console.error('❌ [ERROR] Error message:', error?.message);
    console.error('❌ [ERROR] Error stack:', error?.stack);
    console.error('═══════════════════════════════════════════════════\n');
    
    return Response.json({ 
      error: error?.message || 'Unknown error',
      stack: error?.stack
    }, { status: 500 });
  }
});