import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  FileSpreadsheet,
  Upload,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Zap,
  FileText,
  Database,
  ArrowRight,
  Check,
  X,
  RefreshCw,
  Brain,
  Eye,
  TableIcon
} from 'lucide-react';
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import TableManager from './TableManager';

// Client Schema
const CLIENT_SCHEMA = {
  name: { label: 'שם לקוח', required: true },
  email: { label: 'אימייל', required: false },
  phone: { label: 'טלפון', required: false },
  company: { label: 'חברה', required: false },
  address: { label: 'כתובת', required: false },
  position: { label: 'תפקיד', required: false },
  budget_range: { label: 'טווח תקציב', required: false },
  source: { label: 'מקור הגעה', required: false },
  status: { label: 'סטטוס', required: false },
  notes: { label: 'הערות', required: false }
};

// מיפוי מתקדם - עובד גם עם טבלאות מותאמות
const smartColumnMapping = (fileHeaders, targetFields) => {
  const mapping = {};
  
  console.log('🧠 [SMART MAP] Starting smart mapping...');
  console.log('📋 [SMART MAP] File headers:', fileHeaders);
  console.log('🎯 [SMART MAP] Target fields:', targetFields);
  
  // מילות מפתח לכל סוג שדה
  const fieldPatterns = {
    name: ['שם', 'שם לקוח', 'לקוח', 'שם מלא', 'name', 'full name', 'client', 'customer'],
    phone: ['טלפון', 'טל', 'נייד', 'פלאפון', 'phone', 'mobile', 'cell'],
    email: ['מייל', 'אימייל', 'דוא"ל', 'email', 'e-mail', 'mail'],
    company: ['חברה', 'שם חברה', 'ארגון', 'company', 'organization'],
    address: ['כתובת', 'רחוב', 'עיר', 'address', 'street', 'city'],
    position: ['תפקיד', 'משרה', 'position', 'title', 'role'],
    status: ['סטטוס', 'מצב', 'status', 'state'],
    budget_range: ['תקציב', 'טווח תקציב', 'budget'],
    source: ['מקור', 'מקור הגעה', 'source'],
    notes: ['הערות', 'הערה', 'notes', 'note', 'comments'],
    description: ['תיאור', 'פירוט', 'description'],
    date: ['תאריך', 'date'],
    amount: ['סכום', 'amount', 'price', 'מחיר'],
    quantity: ['כמות', 'quantity', 'qty'],
    id: ['מזהה', 'קוד', 'id', 'code', 'מספר']
  };
  
  fileHeaders.forEach((header, index) => {
    const cleanHeader = (header || '').trim().toLowerCase();
    console.log(`🔍 [SMART MAP] Processing column ${index}: "${header}"`);
    
    let bestMatch = null;
    let bestScore = 0;
    
    // נסה למצוא התאמה לכל שדה יעד
    targetFields.forEach(targetField => {
      const targetName = targetField.toLowerCase();
      
      // בדיקה ישירה - שם זהה
      if (cleanHeader === targetName) {
        bestMatch = targetField;
        bestScore = 100;
        console.log(`✅ [SMART MAP] Perfect match: "${header}" → ${targetField}`);
        return;
      }
      
      // בדיקה לפי פטרנים
      for (const [fieldType, patterns] of Object.entries(fieldPatterns)) {
        if (targetName.includes(fieldType) || targetName === fieldType) {
          for (const pattern of patterns) {
            if (cleanHeader.includes(pattern.toLowerCase())) {
              const score = pattern.length / cleanHeader.length * 100;
              if (score > bestScore) {
                bestMatch = targetField;
                bestScore = score;
                console.log(`🎯 [SMART MAP] Pattern match: "${header}" → ${targetField} (score: ${score.toFixed(0)})`);
              }
            }
          }
        }
      }
      
      // בדיקה חלקית
      if (cleanHeader.includes(targetName) || targetName.includes(cleanHeader)) {
        const score = 50;
        if (score > bestScore) {
          bestMatch = targetField;
          bestScore = score;
          console.log(`🔸 [SMART MAP] Partial match: "${header}" → ${targetField} (score: ${score})`);
        }
      }
    });
    
    if (bestMatch && bestScore >= 40) {
      mapping[index] = bestMatch;
      console.log(`✅ [SMART MAP] Mapped column ${index} "${header}" → ${bestMatch}`);
    } else {
      console.log(`⚠️ [SMART MAP] No good match for column ${index} "${header}"`);
    }
  });
  
  console.log('✅ [SMART MAP] Mapping complete:', mapping);
  return mapping;
};

// פרסור CSV פשוט
const parseCSV = (text) => {
  const lines = text.split('\n').filter(line => line.trim());
  const result = [];
  
  for (const line of lines) {
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
    result.push(values);
  }
  
  return result;
};

// שלבים
const STEPS = {
  SELECT_MODE: 0,
  SELECT_TABLE: 1,
  UPLOAD: 2,
  PARSE: 3,
  NAME_TABLE: 4,
  CREATE_TABLE: 5,
  MAP: 6,
  VALIDATE: 7,
  IMPORT: 8,
  COMPLETE: 9
};

export default function ClientImportWizard({ open, onClose, onSuccess }) {
  const [step, setStep] = useState(STEPS.SELECT_MODE);
  const [file, setFile] = useState(null);
  const [rawHeaders, setRawHeaders] = useState([]);
  const [rawRows, setRawRows] = useState([]);
  const [mapping, setMapping] = useState({});
  const [validatedData, setValidatedData] = useState([]);
  const [validationErrors, setValidationErrors] = useState([]);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState(null);
  const [logs, setLogs] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [importMode, setImportMode] = useState(null);
  const [targetTable, setTargetTable] = useState(null);
  const [newTableName, setNewTableName] = useState('');
  const [newTableDescription, setNewTableDescription] = useState('');
  const [detectedSheetName, setDetectedSheetName] = useState('');
  const [showTableSelector, setShowTableSelector] = useState(false);

  const log = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString('he-IL');
    const emoji = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : '📋';
    const logEntry = `${emoji} [${timestamp}] ${message}`;
    setLogs(prev => [...prev, logEntry]);
    console.log(logEntry);
  };

  // קריאת Excel
  const parseExcel = async (file) => {
    log('מעלה קובץ Excel...');
    
    try {
      const uploadResult = await base44.integrations.Core.UploadFile({ file });
      log(`קובץ הועלה: ${uploadResult.file_url}`);
      
      log('שולח לפרסור בשרת...');
      const response = await base44.functions.invoke('parseSpreadsheet', { 
        file_url: uploadResult.file_url 
      });
      
      if (!response?.data || response.data.status !== 'success') {
        throw new Error(response?.data?.error || 'שגיאה בפרסור');
      }
      
      log(`Excel פורסר בהצלחה: ${response.data.rows.length} שורות`, 'success');
      
      // שמירת שם הגיליון
      if (response.data.debug?.sheetName) {
        setDetectedSheetName(response.data.debug.sheetName);
        log(`זוהה שם גיליון: "${response.data.debug.sheetName}"`);
      }
      
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

  // העלאת קובץ
  const handleFileSelect = async (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    setLogs([]);
    setFile(selectedFile);
    setStep(STEPS.PARSE);
    setIsProcessing(true);
    
    log(`קובץ נבחר: ${selectedFile.name} (${(selectedFile.size / 1024).toFixed(2)} KB)`);
    
    const defaultName = selectedFile.name.replace(/\.(xlsx?|csv)$/i, '');
    setNewTableName(defaultName);
    
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
      
      // בחירה לפי מצב
      if (importMode === 'new_table') {
        if (detectedSheetName && detectedSheetName !== 'Sheet1') {
          setNewTableName(detectedSheetName);
        }
        setStep(STEPS.NAME_TABLE);
      } else if (importMode === 'existing_table' && targetTable) {
        log('מתחיל מיפוי אוטומטי לטבלה קיימת...');
        const targetFields = targetTable.columns.map(col => col.key);
        const autoMapping = smartColumnMapping(headers, targetFields);
        setMapping(autoMapping);
        setStep(STEPS.MAP);
      } else {
        log('מתחיל מיפוי אוטומטי ל-Client...');
        const targetFields = Object.keys(CLIENT_SCHEMA);
        const autoMapping = smartColumnMapping(headers, targetFields);
        setMapping(autoMapping);
        setStep(STEPS.MAP);
      }
    } catch (error) {
      log(`שגיאה בטעינת הקובץ: ${error.message}`, 'error');
      setStep(STEPS.UPLOAD);
    } finally {
      setIsProcessing(false);
    }
  };

  // בחירת טבלה
  const handleTableSelected = (table) => {
    setTargetTable(table);
    setShowTableSelector(false);
    log(`נבחרה טבלת יעד: ${table.name}`, 'success');
    
    if (table.type === 'entity') {
      setImportMode('client');
    } else {
      setImportMode('existing_table');
    }
    
    setStep(STEPS.UPLOAD);
  };

  // יצירת טבלה חדשה
  const createNewTable = async () => {
    if (!newTableName.trim()) {
      toast.error('נא להזין שם לטבלה');
      return;
    }

    log('יוצר טבלה חדשה...');
    setStep(STEPS.CREATE_TABLE);
    setIsProcessing(true);

    try {
      const columns = rawHeaders.map((header, index) => ({
        key: `col_${index + 1}`,
        title: header || `עמודה ${index + 1}`,
        type: 'text',
        visible: true,
        width: '150px'
      }));

      log(`יוצר טבלה עם ${columns.length} עמודות`);

      const newTable = await base44.entities.CustomSpreadsheet.create({
        name: newTableName.trim(),
        description: newTableDescription.trim() || `יובא מ-${file?.name || 'קובץ'}`,
        columns: columns,
        rows_data: []
      });

      log(`טבלה נוצרה בהצלחה: ${newTable.name}`, 'success');

      setTargetTable({
        id: newTable.id,
        name: newTable.name,
        type: 'custom',
        columns: columns,
        data: newTable
      });

      // עבור למיפוי
      log('עובר לשלב מיפוי...');
      const targetFields = columns.map(col => col.key);
      const autoMapping = smartColumnMapping(rawHeaders, targetFields);
      setMapping(autoMapping);
      setStep(STEPS.MAP);
      
    } catch (error) {
      log(`שגיאה ביצירת טבלה: ${error.message}`, 'error');
      toast.error('שגיאה ביצירת הטבלה');
      setStep(STEPS.NAME_TABLE);
    } finally {
      setIsProcessing(false);
    }
  };

  // המשך לוולידציה
  const handlePreview = () => {
    log('מכין תצוגה מקדימה...');
    
    const mappedFields = Object.values(mapping).filter(v => v && v !== 'skip');
    
    if (importMode === 'client' && !mappedFields.includes('name')) {
      toast.error('חובה למפות לפחות את שדה "שם לקוח"');
      return;
    }
    
    if (mappedFields.length === 0) {
      toast.error('יש למפות לפחות שדה אחד');
      return;
    }
    
    // יצירת preview data
    const preview = rawRows.slice(0, 10).map((row, rowIdx) => {
      const item = { _rowNumber: rowIdx + 2 };
      
      rawHeaders.forEach((header, index) => {
        const targetField = mapping[index];
        if (targetField && targetField !== 'skip') {
          item[targetField] = row[index] || '';
        }
      });
      
      return item;
    });
    
    log(`תצוגה מקדימה הוכנה: ${preview.length} פריטים`);
    setValidatedData(preview);
    setStep(STEPS.VALIDATE);
  };

  // ביצוע יבוא
  const executeImport = async () => {
    log('מתחיל יבוא...');
    setStep(STEPS.IMPORT);
    setIsProcessing(true);
    setImportProgress(0);
    
    let success = 0;
    let failed = 0;
    const failedRows = [];
    
    try {
      const allData = rawRows.map((row, rowIdx) => {
        const item = { _rowNumber: rowIdx + 2 };
        
        rawHeaders.forEach((header, index) => {
          const targetField = mapping[index];
          if (targetField && targetField !== 'skip') {
            item[targetField] = row[index] || '';
          }
        });
        
        return item;
      });
      
      // יבוא לפי סוג היעד
      if (importMode === 'client') {
        for (let i = 0; i < allData.length; i++) {
          try {
            const client = { ...allData[i] };
            delete client._rowNumber;
            
            await base44.entities.Client.create(client);
            success++;
            
            if (i % 10 === 0) {
              log(`יובאו ${success}/${allData.length} לקוחות...`);
            }
          } catch (error) {
            failed++;
            failedRows.push({ 
              row: allData[i]._rowNumber,
              error: error.message 
            });
          }
          
          setImportProgress(Math.round(((i + 1) / allData.length) * 100));
        }
      } else {
        const newRows = allData.map((item, i) => {
          const row = { id: `row_${Date.now()}_${i}` };
          
          Object.entries(item).forEach(([key, value]) => {
            if (key !== '_rowNumber') {
              row[key] = value;
            }
          });
          
          return row;
        });
        
        const existingRows = targetTable.data?.rows_data || [];
        await base44.entities.CustomSpreadsheet.update(targetTable.id, {
          rows_data: [...existingRows, ...newRows]
        });
        
        success = newRows.length;
        log(`יובאו ${success} שורות לטבלה ${targetTable.name}`, 'success');
        setImportProgress(100);
      }
      
      log(`יבוא הושלם! ${success} הצליחו, ${failed} נכשלו`, 'success');
      
      setImportResults({
        total: allData.length,
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

  const reset = () => {
    setStep(STEPS.SELECT_MODE);
    setFile(null);
    setRawHeaders([]);
    setRawRows([]);
    setMapping({});
    setValidatedData([]);
    setValidationErrors([]);
    setImportProgress(0);
    setImportResults(null);
    setLogs([]);
    setIsProcessing(false);
    setTargetTable(null);
    setImportMode(null);
    setNewTableName('');
    setNewTableDescription('');
    setDetectedSheetName('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-2xl">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              מערכת יבוא חכמה עם מיפוי אוטומטי
              {targetTable && (
                <Badge className="mr-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                  → {targetTable.name}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              מיפוי אוטומטי חכם של עמודות לשדות היעד עם אפשרות לעריכה
            </DialogDescription>
          </DialogHeader>

          {/* Console Log */}
          {logs.length > 0 && (
            <ScrollArea className="h-32 bg-slate-900 text-green-400 rounded-lg p-3 font-mono text-xs">
              {logs.map((log, i) => (
                <div key={i} className="py-0.5">{log}</div>
              ))}
            </ScrollArea>
          )}

          {/* Content */}
          <ScrollArea className="flex-1 max-h-[calc(95vh-280px)]">
            <div className="p-4">
              {/* Step 0: Select Mode */}
              {step === STEPS.SELECT_MODE && (
                <div className="space-y-6 py-4">
                  <div className="text-center mb-6">
                    <h3 className="text-2xl font-bold text-slate-900 mb-2">איך תרצה לייבא?</h3>
                    <p className="text-slate-600">כל האופציות כוללות מיפוי אוטומטי חכם</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Option 1: Client */}
                    <Card 
                      className="cursor-pointer hover:shadow-xl transition-all border-2 hover:border-blue-400"
                      onClick={() => {
                        setImportMode('client');
                        setTargetTable({
                          id: 'clients',
                          name: 'לקוחות (Client)',
                          type: 'entity',
                          entity: 'Client'
                        });
                        setStep(STEPS.UPLOAD);
                      }}
                    >
                      <CardContent className="p-6 text-center">
                        <Database className="w-12 h-12 mx-auto mb-3 text-blue-600" />
                        <h3 className="text-lg font-bold text-slate-900 mb-2">לקוחות</h3>
                        <p className="text-xs text-slate-600 mb-3">
                          יבוא לטבלת Client עם מיפוי אוטומטי
                        </p>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700">
                          <Brain className="w-3 h-3 ml-1" />
                          מיפוי חכם
                        </Badge>
                      </CardContent>
                    </Card>

                    {/* Option 2: Existing Table */}
                    <Card 
                      className="cursor-pointer hover:shadow-xl transition-all border-2 hover:border-purple-400"
                      onClick={() => {
                        setImportMode('existing_table');
                        setShowTableSelector(true);
                      }}
                    >
                      <CardContent className="p-6 text-center">
                        <FileText className="w-12 h-12 mx-auto mb-3 text-purple-600" />
                        <h3 className="text-lg font-bold text-slate-900 mb-2">טבלה קיימת</h3>
                        <p className="text-xs text-slate-600 mb-3">
                          יבוא לטבלה מותאמת עם מיפוי
                        </p>
                        <Badge variant="outline" className="bg-purple-50 text-purple-700">
                          <RefreshCw className="w-3 h-3 ml-1" />
                          גמיש
                        </Badge>
                      </CardContent>
                    </Card>

                    {/* Option 3: New Table */}
                    <Card 
                      className="cursor-pointer hover:shadow-xl transition-all border-2 hover:border-green-400"
                      onClick={() => {
                        setImportMode('new_table');
                        setStep(STEPS.UPLOAD);
                      }}
                    >
                      <CardContent className="p-6 text-center">
                        <Sparkles className="w-12 h-12 mx-auto mb-3 text-green-600" />
                        <h3 className="text-lg font-bold text-slate-900 mb-2">טבלה חדשה</h3>
                        <p className="text-xs text-slate-600 mb-3">
                          יצירה אוטומטית עם מיפוי
                        </p>
                        <Badge variant="outline" className="bg-green-50 text-green-700">
                          <Check className="w-3 h-3 ml-1" />
                          אוטומטי
                        </Badge>
                      </CardContent>
                    </Card>
                  </div>

                  <Alert className="bg-blue-50 border-blue-200">
                    <Brain className="w-5 h-5 text-blue-600" />
                    <AlertDescription>
                      <div className="font-semibold text-blue-900 mb-2">💡 מיפוי אוטומטי חכם</div>
                      <p className="text-sm text-blue-800">
                        המערכת מזהה אוטומטית את העמודות בקובץ וממפה אותן לשדות המתאימים.
                        תוכל לסקור ולשנות את המיפוי לפני היבוא.
                      </p>
                    </AlertDescription>
                  </Alert>
                </div>
              )}

              {/* Step 2: Upload */}
              {step === STEPS.UPLOAD && (
                <div className="text-center py-12">
                  <label 
                    htmlFor="file-upload"
                    className="cursor-pointer block"
                  >
                    <div className="border-4 border-dashed border-blue-300 rounded-2xl p-16 bg-gradient-to-br from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100 transition-all">
                      <FileSpreadsheet className="w-20 h-20 mx-auto mb-4 text-blue-600" />
                      <h3 className="text-2xl font-bold text-slate-900 mb-2">גרור קובץ או לחץ להעלאה</h3>
                      <p className="text-slate-600 mb-2">תומך ב-Excel (.xlsx, .xls) ו-CSV</p>
                      <Badge className="bg-gradient-to-r from-blue-500 to-purple-600 text-white mt-2">
                        <Brain className="w-4 h-4 ml-1" />
                        מיפוי אוטומטי
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
                      onClick={() => setStep(STEPS.SELECT_MODE)}
                      className="mt-4"
                    >
                      חזור לבחירת מצב
                    </Button>
                  </label>
                </div>
              )}

              {/* Step 3: Parse */}
              {step === STEPS.PARSE && (
                <div className="text-center py-16">
                  <Loader2 className="w-16 h-16 mx-auto mb-4 text-blue-600 animate-spin" />
                  <h3 className="text-xl font-bold text-slate-900">מעבד את הקובץ...</h3>
                  <p className="text-slate-600 mt-2">מזהה עמודות ומבצע מיפוי אוטומטי</p>
                </div>
              )}

              {/* Step 4: Name Table (for new_table mode) */}
              {step === STEPS.NAME_TABLE && (
                <div className="space-y-6">
                  <div className="text-center mb-6">
                    <TableIcon className="w-16 h-16 mx-auto mb-4 text-green-600" />
                    <h3 className="text-2xl font-bold text-slate-900 mb-2">קבע שם לטבלה החדשה</h3>
                    <p className="text-slate-600">הטבלה תכלול {rawHeaders.length} עמודות</p>
                  </div>

                  <Card className="p-6">
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-semibold text-slate-900 mb-2 block">
                          שם הטבלה *
                        </label>
                        <Input
                          value={newTableName}
                          onChange={(e) => setNewTableName(e.target.value)}
                          placeholder="לדוגמה: לצורך הפקדה"
                          className="text-lg"
                        />
                      </div>

                      <div>
                        <label className="text-sm font-semibold text-slate-900 mb-2 block">
                          תיאור
                        </label>
                        <Textarea
                          value={newTableDescription}
                          onChange={(e) => setNewTableDescription(e.target.value)}
                          placeholder="תיאור אופציונלי..."
                          rows={2}
                        />
                      </div>
                    </div>
                  </Card>

                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setStep(STEPS.UPLOAD)}>חזור</Button>
                    <Button
                      onClick={createNewTable}
                      disabled={!newTableName.trim()}
                      className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600"
                    >
                      <Sparkles className="w-4 h-4 ml-2" />
                      צור טבלה והמשך
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 5: Creating Table */}
              {step === STEPS.CREATE_TABLE && (
                <div className="text-center py-16">
                  <Loader2 className="w-16 h-16 mx-auto mb-4 text-green-600 animate-spin" />
                  <h3 className="text-xl font-bold text-slate-900">יוצר טבלה...</h3>
                </div>
              )}

              {/* Step 6: Smart Mapping */}
              {step === STEPS.MAP && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">מיפוי אוטומטי חכם</h3>
                      <p className="text-sm text-slate-600">סקור ושנה את המיפוי</p>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="bg-blue-100 text-blue-700">
                        <Brain className="w-3 h-3 ml-1" />
                        {Object.values(mapping).filter(v => v && v !== 'skip').length} / {rawHeaders.length}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {rawHeaders.map((header, index) => {
                      const mappedField = mapping[index];
                      const isMapped = mappedField && mappedField !== 'skip';
                      
                      const targetFields = importMode === 'client' 
                        ? Object.keys(CLIENT_SCHEMA)
                        : targetTable?.columns?.map(col => col.key) || [];
                      
                      return (
                        <Card key={index} className={`p-4 ${isMapped ? 'border-green-200 bg-green-50/30' : ''}`}>
                          <div className="flex items-center gap-3">
                            <div className="flex-1">
                              <div className="text-xs text-slate-500">עמודה {index + 1}</div>
                              <div className="font-semibold">{header}</div>
                              <div className="text-xs text-slate-600">דוגמה: {rawRows[0]?.[index] || '—'}</div>
                            </div>

                            <ArrowRight className={`w-5 h-5 ${isMapped ? 'text-green-600' : 'text-slate-400'}`} />

                            <div className="flex-1">
                              <Select
                                value={mappedField || ''}
                                onValueChange={(value) => setMapping({ ...mapping, [index]: value })}
                              >
                                <SelectTrigger className={isMapped ? 'border-green-500' : ''}>
                                  <SelectValue placeholder="בחר שדה..." />
                                </SelectTrigger>
                                <SelectContent dir="rtl">
                                  <SelectItem value="skip">
                                    <div className="flex items-center gap-2">
                                      <X className="w-4 h-4" />
                                      דלג
                                    </div>
                                  </SelectItem>
                                  {targetFields.map(field => (
                                    <SelectItem key={field} value={field}>
                                      {importMode === 'client' 
                                        ? CLIENT_SCHEMA[field]?.label 
                                        : targetTable?.columns?.find(c => c.key === field)?.title || field
                                      }
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {isMapped ? (
                              <CheckCircle2 className="w-5 h-5 text-green-600" />
                            ) : (
                              <AlertCircle className="w-5 h-5 text-slate-400" />
                            )}
                          </div>
                        </Card>
                      );
                    })}
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button variant="outline" onClick={() => setStep(STEPS.UPLOAD)}>חזור</Button>
                    <Button
                      onClick={() => {
                        const targetFields = importMode === 'client' 
                          ? Object.keys(CLIENT_SCHEMA)
                          : targetTable?.columns?.map(col => col.key) || [];
                        const newMapping = smartColumnMapping(rawHeaders, targetFields);
                        setMapping(newMapping);
                        toast.success('המיפוי רוענן');
                      }}
                      variant="outline"
                      className="gap-2"
                    >
                      <RefreshCw className="w-4 h-4" />
                      רענן
                    </Button>
                    <Button
                      onClick={handlePreview}
                      className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600"
                    >
                      <Eye className="w-4 h-4 ml-2" />
                      תצוגה מקדימה
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 7: Validate */}
              {step === STEPS.VALIDATE && (
                <div className="space-y-4">
                  <h3 className="text-lg font-bold">תצוגה מקדימה ({validatedData.length} מתוך {rawRows.length})</h3>
                  
                  <div className="space-y-2">
                    {validatedData.map((item, i) => (
                      <Card key={i} className="p-3">
                        <div className="text-sm">
                          {Object.entries(item)
                            .filter(([k]) => k !== '_rowNumber')
                            .map(([key, value]) => (
                              <div key={key} className="flex gap-2">
                                <strong>{key}:</strong>
                                <span>{value}</span>
                              </div>
                            ))
                          }
                        </div>
                      </Card>
                    ))}
                  </div>

                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setStep(STEPS.MAP)}>חזור</Button>
                    <Button
                      onClick={executeImport}
                      className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600"
                    >
                      ייבא {rawRows.length} פריטים
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 8: Import */}
              {step === STEPS.IMPORT && (
                <div className="text-center py-12">
                  <Zap className="w-16 h-16 mx-auto mb-4 text-blue-600 animate-pulse" />
                  <h3 className="text-2xl font-bold text-slate-900 mb-4">מייבא נתונים...</h3>
                  <Progress value={importProgress} className="w-full max-w-md mx-auto h-4 mb-2" />
                  <p className="text-slate-600">{importProgress}%</p>
                </div>
              )}

              {/* Step 9: Complete */}
              {step === STEPS.COMPLETE && importResults && (
                <div className="text-center py-12">
                  <CheckCircle2 className="w-24 h-24 mx-auto mb-6 text-green-600" />
                  <h3 className="text-3xl font-bold text-slate-900 mb-4">🎉 היבוא הושלם!</h3>
                  
                  <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto mb-6">
                    <Card className="bg-green-50">
                      <CardContent className="p-6 text-center">
                        <div className="text-4xl font-bold text-green-600">{importResults.success}</div>
                        <div className="text-sm text-green-700">הצליחו</div>
                      </CardContent>
                    </Card>
                    
                    {importResults.failed > 0 && (
                      <Card className="bg-red-50">
                        <CardContent className="p-6 text-center">
                          <div className="text-4xl font-bold text-red-600">{importResults.failed}</div>
                          <div className="text-sm text-red-700">נכשלו</div>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  <Button onClick={handleClose} className="px-8">סיים</Button>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Table Selector */}
      {showTableSelector && (
        <TableManager
          open={showTableSelector}
          onClose={() => {
            setShowTableSelector(false);
            setStep(STEPS.SELECT_MODE);
          }}
          onTableSelect={handleTableSelected}
        />
      )}
    </>
  );
}