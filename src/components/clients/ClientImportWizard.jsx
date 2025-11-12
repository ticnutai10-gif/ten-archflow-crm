
import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Upload, 
  FileSpreadsheet, 
  Sparkles, 
  Check, 
  X, 
  AlertTriangle,
  ArrowRight,
  Eye,
  Loader2,
  CheckCircle2,
  Terminal,
  Wand2,
  FileText,
  Database,
  Zap
} from 'lucide-react';
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import TableManager from './TableManager';

// מפת שדות Client
const CLIENT_SCHEMA = {
  name: { label: 'שם לקוח', required: true, type: 'text', example: 'חברת ABC' },
  email: { label: 'אימייל', required: false, type: 'email', example: 'info@abc.com' },
  phone: { label: 'טלפון', required: false, type: 'phone', example: '050-1234567' },
  company: { label: 'חברה', required: false, type: 'text', example: 'ABC בע"מ' },
  address: { label: 'כתובת', required: false, type: 'text', example: 'רחוב הרצל 1' },
  position: { label: 'תפקיד', required: false, type: 'text', example: 'מנכ"ל' },
  budget_range: { label: 'טווח תקציב', required: false, type: 'select', example: '1M-2M' },
  source: { label: 'מקור הגעה', required: false, type: 'select', example: 'הפנייה' },
  status: { label: 'סטטוס', required: false, type: 'select', example: 'פעיל' },
  notes: { label: 'הערות', required: false, type: 'textarea', example: 'לקוח VIP' },
  phone_secondary: { label: 'טלפון נוסף', required: false, type: 'phone', example: '03-1234567' },
  whatsapp: { label: 'וואטסאפ', required: false, type: 'phone', example: '050-1234567' },
  website: { label: 'אתר', required: false, type: 'url', example: 'www.abc.com' },
  linkedin: { label: 'לינקדאין', required: false, type: 'url', example: 'linkedin.com/company/abc' },
  preferred_contact: { label: 'תקשורת מועדפת', required: false, type: 'select', example: 'אימייל' }
};

// מילון עברית לזיהוי אוטומטי
const HEBREW_FIELD_MAPPINGS = {
  'שם': 'name',
  'שם לקוח': 'name',
  'לקוח': 'name',
  'שם החברה': 'company',
  'חברה': 'company',
  'ח.פ': 'company',
  'חפ': 'company',
  'טלפון': 'phone',
  'טל': 'phone',
  'נייד': 'phone',
  'פלאפון': 'phone',
  'מייל': 'email',
  'אימייל': 'email',
  'אימיל': 'email',
  'דוא"ל': 'email',
  'כתובת': 'address',
  'רחוב': 'address',
  'עיר': 'address',
  'תפקיד': 'position',
  'תפקידו': 'position',
  'סטטוס': 'status',
  'מצב': 'status',
  'מקור': 'source',
  'מקור הגעה': 'source',
  'הערות': 'notes',
  'הערה': 'notes',
  'תקציב': 'budget_range',
  'טווח תקציב': 'budget_range',
  'וואטסאפ': 'whatsapp',
  'whatsapp': 'whatsapp',
  'אתר': 'website',
  'לינקדאין': 'linkedin',
  'linkedin': 'linkedin'
};

// שלבים
const STEPS = {
  UPLOAD: 1,
  PARSE: 2,
  MAP: 3,
  VALIDATE: 4,
  IMPORT: 5,
  COMPLETE: 6
};

export default function ClientImportWizard({ open, onClose, onSuccess }) {
  // State
  const [step, setStep] = useState(STEPS.UPLOAD);
  const [file, setFile] = useState(null);
  const [rawHeaders, setRawHeaders] = useState([]);
  const [rawRows, setRawRows] = useState([]);
  const [mapping, setMapping] = useState({});
  const [validatedData, setValidatedData] = useState([]);
  const [validationErrors, setValidationErrors] = useState([]);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState(null);
  const [logs, setLogs] = useState([]);
  const [showLogs, setShowLogs] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [targetTable, setTargetTable] = useState(null);
  const [showTableSelector, setShowTableSelector] = useState(false);

  // Logger
  const log = useCallback((message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString('he-IL');
    const emoji = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'warning' ? '⚠️' : '📋';
    const logEntry = `${emoji} [${timestamp}] ${message}`;
    
    setLogs(prev => [...prev, logEntry]);
    console.log(`[IMPORT ${type.toUpperCase()}]`, message);
    
    if (type === 'error') {
      toast.error(message);
    } else if (type === 'success') {
      toast.success(message);
    }
  }, []);

  // קריאת CSV
  const parseCSV = (text) => {
    log('מתחיל פרסור CSV...');
    const lines = text.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
      throw new Error('הקובץ ריק');
    }
    
    const result = [];
    for (let line of lines) {
      const values = [];
      let current = '';
      let inQuotes = false;
      
      for (let char of line) {
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
      result.push(values);
    }
    
    log(`CSV פורסר בהצלחה: ${result.length} שורות`, 'success');
    return result;
  };

  // קריאת Excel
  const parseExcel = async (file) => {
    log('מעלה קובץ Excel...');
    
    try {
      // העלאת הקובץ
      const uploadResult = await base44.integrations.Core.UploadFile({ file });
      log(`קובץ הועלה: ${uploadResult.file_url}`);
      
      // פרסור
      log('שולח לפרסור בשרת...');
      const response = await base44.functions.invoke('parseSpreadsheet', { 
        file_url: uploadResult.file_url 
      });
      
      if (!response?.data || response.data.status !== 'success') {
        throw new Error(response?.data?.error || 'שגיאה בפרסור');
      }
      
      log(`Excel פורסר בהצלחה: ${response.data.rows.length} שורות`, 'success');
      
      // המרה למערך דו-ממדי
      const headers = response.data.headers;
      const dataRows = response.data.rows.map(rowObj => 
        headers.map(h => rowObj[h] != null ? String(rowObj[h]) : '')
      );
      
      return [headers, ...dataRows];
    } catch (error) {
      log(`שגיאה בפרסור Excel: ${error.message}`, 'error');
      throw error;
    }
  };

  // מיפוי אוטומטי
  const autoMap = (headers) => {
    log('מתחיל מיפוי אוטומטי...');
    const newMapping = {};
    let mappedCount = 0;
    
    headers.forEach((header, index) => {
      const cleaned = header.trim().toLowerCase();
      
      for (const [hebrewKey, fieldName] of Object.entries(HEBREW_FIELD_MAPPINGS)) {
        if (cleaned.includes(hebrewKey.toLowerCase())) {
          newMapping[index] = fieldName;
          mappedCount++;
          log(`עמודה ${index} "${header}" → ${CLIENT_SCHEMA[fieldName].label}`);
          break;
        }
      }
    });
    
    log(`מיפוי אוטומטי הושלם: ${mappedCount}/${headers.length} עמודות`, mappedCount > 0 ? 'success' : 'warning');
    return newMapping;
  };

  // שינוי בהתחלת התהליך - בחירת טבלה קודם
  const handleStartImport = () => {
    setShowTableSelector(true);
  };

  const handleTableSelected = (table) => {
    setTargetTable(table);
    setShowTableSelector(false);
    log(`נבחרה טבלת יעד: ${table.name}`, 'success');
    
    // פתיחת בורר קבצים
    setTimeout(() => {
      document.getElementById('file-upload')?.click();
    }, 100);
  };

  // העלאת קובץ
  const handleFileSelect = async (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    setLogs([]);
    setFile(selectedFile);
    setStep(STEPS.PARSE);
    setIsProcessing(true);
    
    log(`קובץ נבחר: ${selectedFile.name} (${(selectedFile.size / 1024).toFixed(2)} KB)`);
    
    try {
      let parsedData;
      
      if (selectedFile.name.toLowerCase().endsWith('.csv')) {
        const text = await selectedFile.text();
        parsedData = parseCSV(text);
      } else {
        parsedData = await parseExcel(selectedFile);
      }
      
      if (!parsedData || parsedData.length < 2) {
        throw new Error('הקובץ חייב להכיל לפחות שורת כותרות ושורת נתונים אחת');
      }
      
      const headers = parsedData[0];
      const rows = parsedData.slice(1).filter(row => 
        row.some(cell => cell && cell.trim())
      );
      
      log(`זוהו ${headers.length} עמודות ו-${rows.length} שורות נתונים`, 'success');
      
      setRawHeaders(headers);
      setRawRows(rows);
      
      // מיפוי אוטומטי
      const autoMapping = autoMap(headers);
      setMapping(autoMapping);
      
      setStep(STEPS.MAP);
    } catch (error) {
      log(`שגיאה בטעינת הקובץ: ${error.message}`, 'error');
      setStep(STEPS.UPLOAD);
      setTargetTable(null); // Reset target table if file load fails
    } finally {
      setIsProcessing(false);
    }
  };

  // וולידציה
  const validateData = () => {
    log('מתחיל וולידציה...');
    setStep(STEPS.VALIDATE);
    setIsProcessing(true);
    
    const validated = [];
    const errors = [];
    
    rawRows.forEach((row, rowIndex) => {
      const client = {};
      let hasData = false;
      
      // מיפוי נתונים
      rawHeaders.forEach((header, colIndex) => {
        const fieldName = mapping[colIndex];
        if (fieldName && fieldName !== 'skip') {
          const value = row[colIndex]?.trim() || '';
          if (value) {
            client[fieldName] = value;
            hasData = true;
          }
        }
      });
      
      // בדיקת חובה (for 'name' as it's often a primary identifier)
      if (!hasData) {
        errors.push({ row: rowIndex + 2, error: 'שורה ריקה' });
        return;
      }
      
      if (!client.name || !client.name.trim()) {
        errors.push({ row: rowIndex + 2, error: 'חסר שם (שדה חובה)' });
        return;
      }
      
      // ניקוי נתונים
      if (client.name) {
        client.name = client.name.replace(/[^\p{L}\p{N}\s\-.']/gu, '').trim();
      }
      
      validated.push({ ...client, _rowNumber: rowIndex + 2 });
    });
    
    log(`וולידציה הושלמה: ${validated.length} תקינים, ${errors.length} שגיאות`, 
        errors.length === 0 ? 'success' : 'warning');
    
    setValidatedData(validated);
    setValidationErrors(errors);
    setIsProcessing(false);
    
    if (validated.length === 0) {
      log('לא נמצאו שורות תקינות לייבוא', 'error');
    }
  };

  // יבוא
  const executeImport = async () => {
    log('מתחיל יבוא...');
    setStep(STEPS.IMPORT);
    setIsProcessing(true);
    setImportProgress(0);
    
    let success = 0;
    let failed = 0;
    const failedRows = [];
    
    try {
      if (!targetTable) {
        throw new Error('לא נבחרה טבלת יעד ליבוא.');
      }

      // יבוא לטבלת Client
      if (targetTable.type === 'entity' && targetTable.entity === 'Client') {
        for (let i = 0; i < validatedData.length; i++) {
          try {
            const client = { ...validatedData[i] };
            delete client._rowNumber;
            
            await base44.entities.Client.create(client);
            success++;
            
            if (i % 10 === 0 || i === validatedData.length -1) {
              log(`יובאו ${success}/${validatedData.length} לקוחות...`);
            }
          } catch (error) {
            failed++;
            failedRows.push({ 
              row: validatedData[i]._rowNumber, 
              name: validatedData[i].name,
              error: error.message 
            });
            log(`שגיאה בשורה ${validatedData[i]._rowNumber}: ${error.message}`, 'error');
          }
          
          setImportProgress(Math.round(((i + 1) / validatedData.length) * 100));
        }
      }
      // יבוא לטבלה מותאמת
      else if (targetTable.type === 'custom') {
        const existingTableData = targetTable.data; // Should contain columns and existing rows from base44
        const newRows = validatedData.map((dataItem, i) => {
          const row = { _id: `${Date.now()}-${i}-${Math.random().toString(36).substr(2, 5)}` }; // Generate unique ID for each new row
          
          // Iterate over the keys (field names) from the validated data (based on CLIENT_SCHEMA)
          Object.entries(dataItem).forEach(([fieldName, value]) => {
            if (fieldName === '_rowNumber') return; // Skip internal validation property

            // Find the corresponding column in the custom table by its key or title
            const matchingColumn = existingTableData.columns.find(col => 
                col.key === fieldName || 
                (CLIENT_SCHEMA[fieldName] && CLIENT_SCHEMA[fieldName].label === col.title)
            );
            
            if (matchingColumn) {
              row[matchingColumn.key] = value;
            } else {
              // If no matching column found, add it with the fieldName as the key.
              // This relies on the custom spreadsheet allowing arbitrary keys in rows.
              row[fieldName] = value;
              log(`אזהרה: שדה "${CLIENT_SCHEMA[fieldName]?.label || fieldName}" מהקובץ לא נמצא כעמודה מוגדרת בטבלה המותאמת. הנתונים יובאו תחת מפתח "${fieldName}".`, 'warning');
            }
          });
          
          return row;
        });
        
        // Update the custom table by appending new rows
        const updatedRows = [...(existingTableData.rows_data || []), ...newRows];
        
        // Call base44 API to update the CustomSpreadsheet
        await base44.entities.CustomSpreadsheet.update(targetTable.id, {
          rows_data: updatedRows
        });
        
        success = newRows.length;
        log(`יובאו ${success} שורות לטבלה המותאמת "${targetTable.name}" בהצלחה.`, 'success');
        setImportProgress(100); // Set progress to 100% since it's a single batch operation
        failed = 0; // Assuming all rows are processed successfully in a single batch for custom table update
      }
      
      log(`יבוא הושלם! ${success} הצליחו, ${failed} נכשלו`, 'success');
      
      setImportResults({
        total: validatedData.length,
        success,
        failed,
        failedRows
      });
      
      setStep(STEPS.COMPLETE);
      
      if (success > 0 && onSuccess) {
        setTimeout(() => onSuccess(), 1500);
      }
    } catch (error) {
      log(`שגיאה כללית ביבוא: ${error.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // איפוס
  const reset = () => {
    setStep(STEPS.UPLOAD);
    setFile(null);
    setRawHeaders([]);
    setRawRows([]);
    setMapping({});
    setValidatedData([]);
    setValidationErrors([]);
    setImportProgress(0);
    setImportResults(null);
    setLogs([]);
    setShowLogs(true); // Ensure logs are visible for next import
    setIsProcessing(false);
    setTargetTable(null); // Reset target table
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const mappedCount = Object.values(mapping).filter(v => v && v !== 'skip').length;
  const hasNameField = Object.values(mapping).includes('name');

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-2xl">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              מערכת יבוא מתקדמת
              {targetTable && (
                <Badge className="mr-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                  → {targetTable.name}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              יבוא חכם של נתונים עם תמיכה מלאה בעברית
              {targetTable && ` | יעד: ${targetTable.name}`}
            </DialogDescription>
          </DialogHeader>

          {/* Progress Bar */}
          <div className="flex items-center justify-between gap-2 mb-4">
            {Object.entries(STEPS).slice(0, -1).map(([name, num]) => (
              <div key={num} className="flex items-center gap-2 flex-1">
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all
                  ${step >= num ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg' : 
                    'bg-slate-200 text-slate-500'}
                `}>
                  {step > num ? <Check className="w-5 h-5" /> : num}
                </div>
                {num < 5 && (
                  <div className={`flex-1 h-1 rounded ${step > num ? 'bg-gradient-to-r from-blue-500 to-purple-600' : 'bg-slate-200'}`} />
                )}
              </div>
            ))}
          </div>

          {/* Console Log */}
          {showLogs && logs.length > 0 && (
            <Card className="bg-slate-900 border-slate-700 mb-4">
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-green-400">
                    <Terminal className="w-4 h-4" />
                    <span className="text-xs font-bold">יומן מערכת</span>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setShowLogs(false)}
                    className="h-6 text-slate-400 hover:text-white"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
                <ScrollArea className="h-32">
                  <div className="font-mono text-xs text-green-400 space-y-0.5">
                    {logs.map((log, i) => (
                      <div key={i}>{log}</div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            {/* Step 1: Upload */}
            {step === STEPS.UPLOAD && (
              <div className="text-center py-12">
                {!targetTable ? (
                  <div>
                    <Database className="w-20 h-20 mx-auto mb-4 text-blue-600" />
                    <h3 className="text-2xl font-bold text-slate-900 mb-2">בחר טבלת יעד</h3>
                    <p className="text-slate-600 mb-6">לאן תרצה לייבא את הנתונים?</p>
                    <Button
                      onClick={handleStartImport}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 px-8 py-4 text-lg"
                    >
                      <Database className="w-5 h-5 ml-2" />
                      בחר טבלת יעד
                    </Button>
                  </div>
                ) : (
                  <label 
                    htmlFor="file-upload"
                    className="cursor-pointer block"
                  >
                    <div className="border-4 border-dashed border-blue-300 rounded-2xl p-16 bg-gradient-to-br from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100 transition-all">
                      <FileSpreadsheet className="w-20 h-20 mx-auto mb-4 text-blue-600" />
                      <h3 className="text-2xl font-bold text-slate-900 mb-2">גרור קובץ או לחץ להעלאה</h3>
                      <p className="text-slate-600 mb-2">תומך ב-Excel (.xlsx, .xls) ו-CSV</p>
                      <Badge className="bg-gradient-to-r from-blue-500 to-purple-600 text-white mt-2">
                        יעד: {targetTable.name}
                      </Badge>
                      <div className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all mt-6">
                        <Upload className="w-5 h-5" />
                        בחר קובץ
                      </div>
                    </div>
                    <input
                      id="file-upload"
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <Button
                      variant="outline"
                      onClick={() => { setTargetTable(null); setLogs([]); }}
                      className="mt-4"
                    >
                      שנה טבלת יעד
                    </Button>
                  </label>
                )}

                <div className="mt-8 max-w-2xl mx-auto">
                  <Alert>
                    <Sparkles className="w-5 h-5" />
                    <AlertDescription>
                      <div className="font-semibold mb-2">✨ המערכת תזהה אוטומטית:</div>
                      <ul className="text-sm space-y-1 text-slate-700">
                        <li>✅ עמודות בעברית (שם, טלפון, מייל וכו')</li>
                        <li>✅ ניקוי אוטומטי של תווים מיוחדים</li>
                        <li>✅ וולידציה של נתונים</li>
                        <li>✅ דיווח מפורט על שגיאות</li>
                      </ul>
                    </AlertDescription>
                  </Alert>
                </div>
              </div>
            )}

            {/* Step 2: Parse (Loading) */}
            {step === STEPS.PARSE && (
              <div className="text-center py-16">
                <Loader2 className="w-16 h-16 mx-auto mb-4 text-blue-600 animate-spin" />
                <h3 className="text-xl font-bold text-slate-900">מעבד את הקובץ...</h3>
                <p className="text-slate-600 mt-2">אנא המתן</p>
              </div>
            )}

            {/* Step 3: Mapping */}
            {step === STEPS.MAP && (
              <div>
                <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">מיפוי עמודות</h3>
                      <p className="text-sm text-slate-600 mt-1">התאם את עמודות הקובץ לשדות במערכת</p>
                    </div>
                    <div className="text-left">
                      <Badge variant={hasNameField ? "default" : "destructive"} className="text-sm">
                        {mappedCount}/{rawHeaders.length} עמודות
                      </Badge>
                      {!hasNameField && (
                        <p className="text-xs text-red-600 mt-1">❌ חסר שדה "שם לקוח"</p>
                      )}
                    </div>
                  </div>
                </div>

                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-3">
                    {rawHeaders.map((header, index) => {
                      const fieldName = mapping[index];
                      const field = fieldName ? CLIENT_SCHEMA[fieldName] : null;
                      
                      return (
                        <Card key={index} className="p-4 hover:shadow-md transition-all">
                          <div className="flex items-center gap-4">
                            <div className="flex-1">
                              <div className="text-sm text-slate-600 mb-1">עמודה {index + 1}</div>
                              <div className="font-bold text-slate-900">{header || `עמודה ${index + 1}`}</div>
                              <div className="text-xs text-slate-500 mt-1">
                                דוגמה: {rawRows[0]?.[index]?.substring(0, 40) || '—'}
                              </div>
                            </div>

                            <ArrowRight className="w-5 h-5 text-slate-400 flex-shrink-0" />

                            <div className="flex-1">
                              <Select
                                value={fieldName || 'none'}
                                onValueChange={(value) => setMapping(prev => ({
                                  ...prev,
                                  [index]: value === 'none' ? undefined : value
                                }))}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="בחר שדה..." />
                                </SelectTrigger>
                                <SelectContent dir="rtl">
                                  <SelectItem value="none">⚠️ אל תייבא</SelectItem>
                                  {Object.entries(CLIENT_SCHEMA).map(([key, schema]) => (
                                    <SelectItem key={key} value={key}>
                                      {schema.required && <span className="text-red-500">* </span>}
                                      {schema.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {field && (
                                <div className="text-xs text-slate-500 mt-1">
                                  {field.required && '⚠️ שדה חובה • '}
                                  דוגמה: {field.example}
                                </div>
                              )}
                            </div>

                            {fieldName && fieldName !== 'none' && (
                              <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                            )}
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </ScrollArea>

                <div className="flex gap-3 mt-6">
                  <Button variant="outline" onClick={handleClose}>
                    ביטול
                  </Button>
                  <Button 
                    onClick={validateData}
                    disabled={!hasNameField || isProcessing}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    <Eye className="w-4 h-4 ml-2" />
                    המשך לוולידציה
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Validation */}
            {step === STEPS.VALIDATE && (
              <div>
                <div className="mb-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
                  <h3 className="text-lg font-bold text-green-900 mb-2">תוצאות וולידציה</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-600">{validatedData.length}</div>
                      <div className="text-xs text-green-700">נתונים תקינים</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-red-600">{validationErrors.length}</div>
                      <div className="text-xs text-red-700">שורות עם שגיאות</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600">{rawRows.length}</div>
                      <div className="text-xs text-blue-700">סה"כ שורות</div>
                    </div>
                  </div>
                </div>

                {validationErrors.length > 0 && (
                  <Alert className="mb-4 bg-red-50 border-red-200">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    <AlertDescription>
                      <div className="font-semibold text-red-900 mb-2">נמצאו {validationErrors.length} שגיאות:</div>
                      <ScrollArea className="h-32">
                        <div className="text-sm text-red-800 space-y-1">
                          {validationErrors.map((err, i) => (
                            <div key={i}>שורה {err.row}: {err.error}</div>
                          ))}
                        </div>
                      </ScrollArea>
                    </AlertDescription>
                  </Alert>
                )}

                <Card className="mb-4">
                  <CardContent className="p-4">
                    <h4 className="font-semibold mb-3">תצוגה מקדימה (10 ראשונים):</h4>
                    <ScrollArea className="h-64">
                      <div className="space-y-2">
                        {validatedData.slice(0, 10).map((client, i) => (
                          <div key={i} className="p-3 bg-slate-50 rounded-lg border">
                            <div className="font-bold text-slate-900 mb-1">{client.name}</div>
                            <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                              {Object.entries(client)
                                .filter(([k]) => k !== 'name' && k !== '_rowNumber')
                                .map(([key, value]) => value && (
                                  <div key={key}>
                                    <span className="font-medium">{CLIENT_SCHEMA[key]?.label}:</span> {value}
                                  </div>
                                ))
                              }
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep(STEPS.MAP)}>
                    חזור למיפוי
                  </Button>
                  <Button 
                    onClick={executeImport}
                    disabled={validatedData.length === 0 || isProcessing}
                    className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                  >
                    <Database className="w-4 h-4 ml-2" />
                    ייבא {validatedData.length} נתונים
                  </Button>
                </div>
              </div>
            )}

            {/* Step 5: Import Progress */}
            {step === STEPS.IMPORT && (
              <div className="text-center py-12">
                <Zap className="w-20 h-20 mx-auto mb-4 text-blue-600 animate-pulse" />
                <h3 className="text-2xl font-bold text-slate-900 mb-4">מייבא נתונים...</h3>
                <Progress value={importProgress} className="w-full max-w-md mx-auto h-4 mb-2" />
                <p className="text-slate-600">{importProgress}% הושלם</p>
              </div>
            )}

            {/* Step 6: Complete */}
            {step === STEPS.COMPLETE && importResults && (
              <div className="text-center py-12">
                <CheckCircle2 className="w-24 h-24 mx-auto mb-6 text-green-600" />
                <h3 className="text-3xl font-bold text-slate-900 mb-4">היבוא הושלם בהצלחה! 🎉</h3>
                
                <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto mb-6">
                  <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                    <CardContent className="p-6 text-center">
                      <div className="text-4xl font-bold text-green-600">{importResults.success}</div>
                      <div className="text-sm text-green-700 mt-1">יובאו בהצלחה</div>
                    </CardContent>
                  </Card>
                  
                  {importResults.failed > 0 && (
                    <Card className="bg-gradient-to-br from-red-50 to-pink-50 border-red-200">
                      <CardContent className="p-6 text-center">
                        <div className="text-4xl font-bold text-red-600">{importResults.failed}</div>
                        <div className="text-sm text-red-700 mt-1">נכשלו</div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {importResults.failedRows?.length > 0 && (
                  <Alert className="max-w-2xl mx-auto mb-6 bg-red-50 border-red-200">
                    <AlertDescription>
                      <div className="font-semibold text-red-900 mb-2">שורות שנכשלו:</div>
                      <ScrollArea className="h-32">
                        <div className="text-sm text-red-800 space-y-1 text-right">
                          {importResults.failedRows.map((fail, i) => (
                            <div key={i}>
                              שורה {fail.row} ({fail.name || 'ללא שם'}): {fail.error}
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </AlertDescription>
                  </Alert>
                )}

                <Button 
                  onClick={handleClose}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 px-8"
                >
                  סיים
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Table Selector Dialog */}
      {showTableSelector && (
        <TableManager
          open={showTableSelector}
          onClose={() => setShowTableSelector(false)}
          onTableSelect={handleTableSelected}
        />
      )}
    </>
  );
}
