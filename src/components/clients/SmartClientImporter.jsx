import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Upload, 
  FileSpreadsheet, 
  Sparkles, 
  Check, 
  X, 
  AlertCircle,
  ArrowRight,
  Edit2,
  Eye,
  Loader2,
  CheckCircle2,
  Brain,
  Wand2,
  Bug
} from 'lucide-react';
import { base44 } from "@/api/base44Client";

// שדות אפשריים בישות Client
const CLIENT_FIELDS = [
  { value: 'name', label: 'שם לקוח', required: true, example: 'חברת בניין שחר' },
  { value: 'email', label: 'אימייל', required: false, example: 'info@shahar.co.il' },
  { value: 'phone', label: 'טלפון', required: false, example: '050-1234567' },
  { value: 'company', label: 'חברה', required: false, example: 'בניין שחר בע"מ' },
  { value: 'address', label: 'כתובת', required: false, example: 'רחוב הרצל 1, תל אביב' },
  { value: 'position', label: 'תפקיד', required: false, example: 'מנכ"ל' },
  { value: 'budget_range', label: 'טווח תקציב', required: false, example: '1M-2M' },
  { value: 'source', label: 'מקור הגעה', required: false, example: 'הפנייה' },
  { value: 'status', label: 'סטטוס', required: false, example: 'פעיל' },
  { value: 'notes', label: 'הערות', required: false, example: 'לקוח VIP' },
  { value: 'phone_secondary', label: 'טלפון משני', required: false, example: '03-1234567' },
  { value: 'whatsapp', label: 'וואטסאפ', required: false, example: '050-1234567' },
  { value: 'website', label: 'אתר', required: false, example: 'www.shahar.co.il' },
  { value: 'linkedin', label: 'לינקדאין', required: false, example: 'linkedin.com/company/shahar' },
  { value: 'preferred_contact', label: 'אמצעי תקשורת מועדף', required: false, example: 'אימייל' },
  { value: '', label: '⚠️ דלג על עמודה זו', required: false }
];

// פונקציה לקריאת CSV פשוט
const parseCSV = (text) => {
  console.log('🔍 [CSV PARSER] Starting CSV parse...');
  console.log('🔍 [CSV PARSER] Text length:', text.length);
  console.log('🔍 [CSV PARSER] First 500 chars:', text.substring(0, 500));
  
  const lines = text.split('\n').filter(line => line.trim());
  console.log('🔍 [CSV PARSER] Total lines after filtering:', lines.length);
  
  if (lines.length === 0) {
    console.error('❌ [CSV PARSER] No lines found in CSV!');
    return [];
  }
  
  const result = [];
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    
    if (lineIndex === 0) {
      console.log('🔍 [CSV PARSER] Header row parsed:', values);
    } else if (lineIndex === 1) {
      console.log('🔍 [CSV PARSER] First data row sample:', values);
    }
    
    result.push(values);
  }
  
  console.log('✅ [CSV PARSER] Parse complete:', result.length, 'rows');
  return result;
};

// פונקציה לקריאת Excel באמצעות parseSpreadsheet function
const parseExcelFile = async (file) => {
  console.log('═══════════════════════════════════════════════════');
  console.log('📊 [EXCEL PARSER] Starting Excel file parsing');
  console.log('═══════════════════════════════════════════════════');
  console.log('📊 [EXCEL PARSER] File details:', {
    name: file.name,
    size: file.size,
    type: file.type,
    lastModified: new Date(file.lastModified).toLocaleString('he-IL')
  });
  
  try {
    // שלב 1: העלאת הקובץ
    console.log('⬆️ [EXCEL PARSER] Step 1: Uploading file...');
    const uploadResult = await base44.integrations.Core.UploadFile({ file });
    console.log('✅ [EXCEL PARSER] Upload successful!');
    console.log('🔗 [EXCEL PARSER] File URL:', uploadResult.file_url);
    
    // שלב 2: קריאת הקובץ
    console.log('📖 [EXCEL PARSER] Step 2: Parsing file via backend...');
    console.log('📤 [EXCEL PARSER] Sending to parseSpreadsheet function with params:', {
      file_url: uploadResult.file_url
    });
    
    const response = await base44.functions.invoke('parseSpreadsheet', { 
      file_url: uploadResult.file_url 
    });
    
    console.log('📥 [EXCEL PARSER] Response received from backend:');
    console.log('📥 [EXCEL PARSER] Response type:', typeof response);
    console.log('📥 [EXCEL PARSER] Response.data:', response?.data);
    console.log('📥 [EXCEL PARSER] Full response structure:', JSON.stringify(response, null, 2));
    
    if (!response || !response.data) {
      console.error('❌ [EXCEL PARSER] Invalid response structure!');
      throw new Error('תגובה לא תקינה מהשרת');
    }
    
    if (response.data.status !== 'success') {
      console.error('❌ [EXCEL PARSER] Backend returned error:', response.data.error);
      throw new Error(response.data.error || 'שגיאה בעיבוד הקובץ');
    }
    
    console.log('✅ [EXCEL PARSER] Backend parse successful!');
    console.log('📊 [EXCEL PARSER] Backend returned:', {
      status: response.data.status,
      rowCount: response.data.rows?.length,
      headerCount: response.data.headers?.length,
      debug: response.data.debug
    });
    
    // שלב 3: המרה לפורמט מערך דו-ממדי
    console.log('🔄 [EXCEL PARSER] Step 3: Converting to 2D array format...');
    const headers = response.data.headers || [];
    console.log('📋 [EXCEL PARSER] Headers extracted:', headers);
    
    if (headers.length === 0) {
      console.error('❌ [EXCEL PARSER] No headers found!');
      throw new Error('לא נמצאו כותרות בקובץ');
    }
    
    const rows = response.data.rows.map((row, idx) => {
      const rowArray = headers.map(h => {
        const value = row[h];
        const stringValue = value !== undefined && value !== null ? String(value) : '';
        if (idx === 0) {
          console.log(`🔍 [EXCEL PARSER] First row - Column "${h}":`, value, '→', stringValue);
        }
        return stringValue;
      });
      return rowArray;
    });
    
    console.log('✅ [EXCEL PARSER] Conversion complete!');
    console.log('📊 [EXCEL PARSER] Rows converted:', rows.length);
    console.log('📊 [EXCEL PARSER] First row sample:', rows[0]);
    console.log('📊 [EXCEL PARSER] Second row sample:', rows[1]);
    
    const result = [headers, ...rows];
    console.log('✅ [EXCEL PARSER] Final result:', result.length, 'total rows (including header)');
    console.log('═══════════════════════════════════════════════════');
    
    return result;
  } catch (error) {
    console.error('═══════════════════════════════════════════════════');
    console.error('❌ [EXCEL PARSER] ERROR OCCURRED!');
    console.error('❌ [EXCEL PARSER] Error type:', error.constructor.name);
    console.error('❌ [EXCEL PARSER] Error message:', error.message);
    console.error('❌ [EXCEL PARSER] Error stack:', error.stack);
    console.error('═══════════════════════════════════════════════════');
    throw error;
  }
};

export default function SmartClientImporter({ open, onClose, onSuccess }) {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [rawData, setRawData] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [mapping, setMapping] = useState({});
  const [previewData, setPreviewData] = useState([]);
  const [aiSuggesting, setAiSuggesting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [error, setError] = useState(null);
  const [debugLogs, setDebugLogs] = useState([]);

  const addDebugLog = (message) => {
    const timestamp = new Date().toLocaleTimeString('he-IL');
    setDebugLogs(prev => [...prev, `[${timestamp}] ${message}`]);
    console.log('🐛 [DEBUG]', message);
  };

  // 📤 שלב 1: העלאת קובץ
  const handleFileUpload = async (e) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    console.log('\n\n🚀🚀🚀 STARTING FILE UPLOAD PROCESS 🚀🚀🚀\n');
    setError(null);
    setFile(uploadedFile);
    setDebugLogs([]);
    
    addDebugLog(`קובץ נבחר: ${uploadedFile.name} (${(uploadedFile.size / 1024).toFixed(2)} KB)`);

    try {
      let parsedData;
      
      addDebugLog(`סוג הקובץ: ${uploadedFile.type}`);
      addDebugLog(`תאריך שינוי אחרון: ${new Date(uploadedFile.lastModified).toLocaleString('he-IL')}`);
      
      // בדיקה אם זה CSV או Excel
      if (uploadedFile.name.toLowerCase().endsWith('.csv')) {
        addDebugLog('🔍 זוהה כקובץ CSV - מתחיל פרסור...');
        const text = await uploadedFile.text();
        addDebugLog(`📄 קובץ נקרא בהצלחה - ${text.length} תווים`);
        parsedData = parseCSV(text);
        addDebugLog(`✅ CSV פורסר בהצלחה - ${parsedData.length} שורות`);
      } else {
        addDebugLog('📊 זוהה כקובץ Excel - שולח לפרסור בשרת...');
        parsedData = await parseExcelFile(uploadedFile);
        addDebugLog(`✅ Excel פורסר בהצלחה - ${parsedData.length} שורות`);
      }

      if (!parsedData || parsedData.length === 0) {
        addDebugLog('❌ שגיאה: הקובץ ריק או לא תקין');
        setError('הקובץ ריק או לא תקין');
        return;
      }

      // השורה הראשונה היא כותרות
      const headerRow = parsedData[0];
      addDebugLog(`📋 כותרות זוהו: ${JSON.stringify(headerRow)}`);
      
      const dataRows = parsedData.slice(1).filter(row => 
        row && Array.isArray(row) && row.some(cell => cell !== null && cell !== undefined && cell !== '')
      );
      addDebugLog(`📊 שורות נתונים: ${dataRows.length}`);
      
      if (dataRows.length === 0) {
        addDebugLog('⚠️ אזהרה: לא נמצאו שורות נתונים');
      } else {
        addDebugLog(`📄 שורה ראשונה לדוגמה: ${JSON.stringify(dataRows[0])}`);
      }

      setHeaders(headerRow.map(h => String(h || '')));
      setRawData(dataRows);
      setStep(2);
      
      addDebugLog('✅ מעבר לשלב מיפוי');

      // הפעלת AI אוטומטית
      setTimeout(() => suggestMappingWithAI(headerRow, dataRows.slice(0, 5)), 500);
    } catch (err) {
      console.error('❌ Critical error in handleFileUpload:', err);
      addDebugLog(`❌ שגיאה קריטית: ${err.message}`);
      setError('שגיאה בקריאת הקובץ: ' + err.message);
    }
  };

  // 🤖 שלב 2: הצעת מיפוי באמצעות AI
  const suggestMappingWithAI = async (headerRow, sampleRows) => {
    addDebugLog('🤖 מתחיל תהליך מיפוי AI...');
    setAiSuggesting(true);
    
    try {
      const prompt = `
אתה מומחה במיפוי נתונים למערכות CRM.
קיבלת קובץ Excel/CSV עם הכותרות והשורות לדוגמה הבאות:

כותרות:
${headerRow.map((h, i) => `עמודה ${i + 1}: "${h}"`).join('\n')}

שורות לדוגמה:
${sampleRows.map((row, i) => 
  `שורה ${i + 1}: ${row.map((cell, j) => `"${cell}"`).join(', ')}`
).join('\n')}

השדות הזמינים במערכת CRM:
${CLIENT_FIELDS.filter(f => f.value).map(f => 
  `- ${f.value}: ${f.label} (דוגמה: ${f.example})${f.required ? ' [חובה]' : ''}`
).join('\n')}

המשימה שלך:
1. זהה את התאמת העמודות לשדות במערכת
2. אם לא בטוח - אל תמפה (השאר ריק)
3. אם עמודה לא רלוונטית - ציין skip
4. שם לקוח הוא שדה חובה!

החזר JSON במבנה הבא:
{
  "mapping": {
    "0": "name",
    "1": "email",
    "2": "phone"
  },
  "confidence": {
    "0": 95,
    "1": 90,
    "2": 85
  },
  "reasoning": "הסבר קצר למיפוי"
}

חשוב: השתמש במספרי העמודות (0, 1, 2...) כמפתחות.
`;

      addDebugLog('📤 שולח בקשה ל-AI...');
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        add_context_from_internet: false,
        response_json_schema: {
          type: "object",
          properties: {
            mapping: {
              type: "object",
              additionalProperties: { type: "string" }
            },
            confidence: {
              type: "object",
              additionalProperties: { type: "number" }
            },
            reasoning: { type: "string" }
          },
          required: ["mapping"]
        }
      });

      addDebugLog('📥 תגובה התקבלה מ-AI');
      console.log('🤖 AI Mapping Result:', response);

      if (response?.mapping) {
        addDebugLog(`✅ מיפוי הוצע: ${JSON.stringify(response.mapping)}`);
        setMapping(response.mapping);
      } else {
        addDebugLog('⚠️ AI לא החזיר מיפוי');
      }
    } catch (error) {
      console.error('❌ AI mapping failed:', error);
      addDebugLog(`❌ שגיאה במיפוי AI: ${error.message}`);
      setError('AI לא הצליח להציע מיפוי. אנא מפה ידנית.');
    } finally {
      setAiSuggesting(false);
    }
  };

  // 👁️ שלב 3: תצוגה מקדימה
  const handlePreview = () => {
    addDebugLog('👁️ מכין תצוגה מקדימה...');
    
    const mappedFields = Object.values(mapping).filter(v => v && v !== 'skip');
    const hasName = mappedFields.includes('name');

    if (!hasName) {
      addDebugLog('❌ שגיאה: לא מופה שדה "שם לקוח"');
      setError('חובה למפות לפחות את שדה "שם לקוח"');
      return;
    }

    const preview = rawData.slice(0, 10).map(row => {
      const client = {};
      headers.forEach((header, index) => {
        const field = mapping[index];
        if (field && field !== 'skip') {
          client[field] = row[index] !== null && row[index] !== undefined ? String(row[index]) : '';
        }
      });
      return client;
    });

    addDebugLog(`✅ תצוגה מקדימה הוכנה: ${preview.length} לקוחות`);
    setPreviewData(preview);
    setStep(3);
    setError(null);
  };

  // 💾 שלב 4: ביצוע יבוא
  const handleImport = async () => {
    addDebugLog('💾 מתחיל תהליך יבוא...');
    setImporting(true);
    setError(null);

    try {
      const clientsToImport = rawData.map(row => {
        const client = {};
        headers.forEach((header, index) => {
          const field = mapping[index];
          if (field && field !== 'skip') {
            const value = row[index];
            client[field] = value !== null && value !== undefined ? String(value) : '';
          }
        });
        return client;
      }).filter(c => c.name);

      addDebugLog(`📦 מייבא ${clientsToImport.length} לקוחות...`);

      let successCount = 0;
      let errorCount = 0;
      const errors = [];

      for (let i = 0; i < clientsToImport.length; i++) {
        try {
          await base44.entities.Client.create(clientsToImport[i]);
          successCount++;
          if (i % 10 === 0) {
            addDebugLog(`⏳ יובאו ${successCount} לקוחות מתוך ${clientsToImport.length}...`);
          }
        } catch (err) {
          errorCount++;
          errors.push({ row: i + 1, error: err.message });
          addDebugLog(`❌ שגיאה בשורה ${i + 1}: ${err.message}`);
        }
      }

      addDebugLog(`✅ יבוא הסתיים: ${successCount} הצליחו, ${errorCount} נכשלו`);

      setImportResult({
        total: clientsToImport.length,
        success: successCount,
        errors: errorCount,
        errorDetails: errors
      });

      setStep(4);

      if (errorCount === 0 && onSuccess) {
        setTimeout(() => {
          onSuccess();
          handleClose();
        }, 2000);
      }
    } catch (error) {
      console.error('❌ Import failed:', error);
      addDebugLog(`❌ שגיאה ביבוא: ${error.message}`);
      setError('שגיאה ביבוא הלקוחות: ' + error.message);
    } finally {
      setImporting(false);
    }
  };

  // 🔄 איפוס
  const handleClose = () => {
    setStep(1);
    setFile(null);
    setRawData(null);
    setHeaders([]);
    setMapping({});
    setPreviewData([]);
    setImportResult(null);
    setError(null);
    setDebugLogs([]);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-2xl">
            <Sparkles className="w-7 h-7 text-purple-600" />
            יבוא לקוחות חכם
          </DialogTitle>
        </DialogHeader>

        {/* Debug Panel */}
        {debugLogs.length > 0 && (
          <div className="bg-slate-900 text-green-400 rounded-lg p-4 mb-4 max-h-48 overflow-y-auto font-mono text-xs">
            <div className="flex items-center gap-2 mb-2 text-white">
              <Bug className="w-4 h-4" />
              <span className="font-bold">יומן דיבאג</span>
            </div>
            {debugLogs.map((log, i) => (
              <div key={i} className="py-0.5">{log}</div>
            ))}
          </div>
        )}

        {/* Progress Indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {[1, 2, 3, 4].map(num => (
            <div key={num} className="flex items-center">
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all
                ${step === num ? 'bg-purple-600 text-white scale-110 shadow-lg' : 
                  step > num ? 'bg-green-600 text-white' : 'bg-slate-200 text-slate-500'}
              `}>
                {step > num ? <Check className="w-5 h-5" /> : num}
              </div>
              {num < 4 && (
                <div className={`w-12 h-1 ${step > num ? 'bg-green-600' : 'bg-slate-200'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-start gap-3 mb-4">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-semibold text-red-900">שגיאה</div>
              <div className="text-sm text-red-700 mt-1">{error}</div>
            </div>
            <button onClick={() => setError(null)} className="text-red-600 hover:text-red-800">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Step 1: Upload */}
        {step === 1 && (
          <div className="py-8">
            <div className="border-4 border-dashed border-slate-300 rounded-2xl p-12 text-center hover:border-purple-400 transition-colors cursor-pointer"
              onClick={() => document.getElementById('file-upload').click()}>
              <FileSpreadsheet className="w-20 h-20 mx-auto mb-4 text-slate-400" />
              <h3 className="text-xl font-bold text-slate-800 mb-2">גרור קובץ לכאן או לחץ להעלאה</h3>
              <p className="text-slate-600 mb-4">תומך ב-Excel (.xlsx, .xls) ו-CSV</p>
              <Input
                id="file-upload"
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button variant="outline" className="mt-4">
                <Upload className="w-5 h-5 ml-2" />
                בחר קובץ
              </Button>
            </div>

            <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="font-semibold text-blue-900 mb-2">💡 טיפים:</div>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>ודא שהשורה הראשונה מכילה כותרות עמודות</li>
                <li>המערכת תזהה אוטומטית את העמודות באמצעות AI</li>
                <li>אפשר לערוך את המיפוי לפני היבוא</li>
              </ul>
            </div>
          </div>
        )}

        {/* Step 2: Mapping */}
        {step === 2 && (
          <div>
            {aiSuggesting && (
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl p-6 mb-6 flex items-center gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600 flex-shrink-0" />
                <div>
                  <div className="font-bold text-purple-900 mb-1">🤖 AI מנתח את הנתונים...</div>
                  <div className="text-sm text-purple-700">מזהה עמודות וממפה אוטומטית לשדות במערכת</div>
                </div>
              </div>
            )}

            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800">מיפוי עמודות</h3>
              <Badge variant="outline" className="text-sm">
                {headers.length} עמודות נמצאו • {rawData.length} שורות
              </Badge>
            </div>

            <ScrollArea className="h-96">
              <div className="space-y-3 pr-4">
                {headers.map((header, index) => {
                  const mappedField = mapping[index];
                  const fieldInfo = CLIENT_FIELDS.find(f => f.value === mappedField);
                  
                  return (
                    <div key={index} className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <div className="text-sm text-slate-600 mb-1">עמודה {index + 1}</div>
                          <div className="font-bold text-slate-900">{header || `עמודה ${index + 1}`}</div>
                          <div className="text-xs text-slate-500 mt-1">
                            דוגמה: {rawData[0]?.[index] || '—'}
                          </div>
                        </div>

                        <ArrowRight className="w-5 h-5 text-slate-400 flex-shrink-0" />

                        <div className="flex-1">
                          <Select
                            value={mappedField || ''}
                            onValueChange={(value) => setMapping({ ...mapping, [index]: value })}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="בחר שדה..." />
                            </SelectTrigger>
                            <SelectContent dir="rtl">
                              {CLIENT_FIELDS.map(field => (
                                <SelectItem key={field.value || 'skip'} value={field.value || 'skip'}>
                                  <div className="flex items-center gap-2">
                                    {field.required && <span className="text-red-500">*</span>}
                                    {field.label}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {fieldInfo?.example && (
                            <div className="text-xs text-slate-500 mt-1">
                              דוגמה: {fieldInfo.example}
                            </div>
                          )}
                        </div>

                        {mappedField && (
                          <div className="flex-shrink-0">
                            {mappedField === 'skip' ? (
                              <X className="w-5 h-5 text-slate-400" />
                            ) : (
                              <Check className="w-5 h-5 text-green-600" />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            <DialogFooter className="gap-2 mt-6">
              <Button variant="outline" onClick={handleClose}>ביטול</Button>
              <Button 
                onClick={() => suggestMappingWithAI(headers, rawData.slice(0, 5))}
                disabled={aiSuggesting}
                variant="outline"
                className="gap-2"
              >
                <Brain className="w-4 h-4" />
                הצע מיפוי מחדש עם AI
              </Button>
              <Button onClick={handlePreview} className="bg-purple-600 hover:bg-purple-700 gap-2">
                <Eye className="w-4 h-4" />
                תצוגה מקדימה
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Step 3: Preview */}
        {step === 3 && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800">תצוגה מקדימה</h3>
              <Badge variant="outline">
                מציג {previewData.length} לקוחות ראשונים מתוך {rawData.length}
              </Badge>
            </div>

            <ScrollArea className="h-96">
              <div className="space-y-2 pr-4">
                {previewData.map((client, index) => (
                  <div key={index} className="bg-white border border-slate-200 rounded-lg p-3">
                    <div className="font-bold text-slate-900 mb-2">
                      {client.name || `לקוח ${index + 1}`}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {Object.entries(client).filter(([k, v]) => v && k !== 'name').map(([key, value]) => (
                        <div key={key} className="flex items-start gap-2">
                          <span className="text-slate-600 font-medium">
                            {CLIENT_FIELDS.find(f => f.value === key)?.label}:
                          </span>
                          <span className="text-slate-800">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <DialogFooter className="gap-2 mt-6">
              <Button variant="outline" onClick={() => setStep(2)}>
                <Edit2 className="w-4 h-4 ml-2" />
                ערוך מיפוי
              </Button>
              <Button 
                onClick={handleImport}
                disabled={importing}
                className="bg-green-600 hover:bg-green-700 gap-2"
              >
                {importing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    מייבא...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    ייבא {rawData.length} לקוחות
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Step 4: Results */}
        {step === 4 && importResult && (
          <div className="py-8 text-center">
            <div className={`w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center ${
              importResult.errors === 0 ? 'bg-green-100' : 'bg-yellow-100'
            }`}>
              {importResult.errors === 0 ? (
                <CheckCircle2 className="w-12 h-12 text-green-600" />
              ) : (
                <AlertCircle className="w-12 h-12 text-yellow-600" />
              )}
            </div>

            <h3 className="text-2xl font-bold text-slate-900 mb-2">
              {importResult.errors === 0 ? 'היבוא הושלם בהצלחה! 🎉' : 'היבוא הושלם עם שגיאות'}
            </h3>

            <div className="grid grid-cols-3 gap-4 max-w-md mx-auto mt-6">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-3xl font-bold text-blue-600">{importResult.total}</div>
                <div className="text-sm text-blue-800">סה"כ</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <div className="text-3xl font-bold text-green-600">{importResult.success}</div>
                <div className="text-sm text-green-800">הצליח</div>
              </div>
              <div className="bg-red-50 rounded-lg p-4">
                <div className="text-3xl font-bold text-red-600">{importResult.errors}</div>
                <div className="text-sm text-red-800">נכשל</div>
              </div>
            </div>

            {importResult.errorDetails && importResult.errorDetails.length > 0 && (
              <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4 max-h-40 overflow-y-auto text-right">
                <div className="font-semibold text-red-900 mb-2">שגיאות:</div>
                <div className="text-sm text-red-800 space-y-1">
                  {importResult.errorDetails.map((err, i) => (
                    <div key={i}>שורה {err.row}: {err.error}</div>
                  ))}
                </div>
              </div>
            )}

            <Button onClick={handleClose} className="mt-6 w-48">
              סגור
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}