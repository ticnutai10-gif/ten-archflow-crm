import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
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
  Zap,
  Table as TableIcon,
  AlertCircle,
  RefreshCw,
  Brain
} from 'lucide-react';
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import TableManager from './TableManager';

// ... keep all existing constants, mappings, and helper functions (CLIENT_SCHEMA, HEBREW_FIELD_MAPPINGS, smartColumnMapping, STEPS) ...

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

const smartColumnMapping = (fileHeaders, targetFields, logFunction = console.log) => {
  const mapping = {};

  logFunction('🧠 [SMART MAP] Starting smart mapping...');
  logFunction(`📋 [SMART MAP] File headers: ${fileHeaders.join(', ')}`);
  logFunction(`🎯 [SMART MAP] Target fields: ${targetFields.join(', ')}`);

  const fieldPatterns = {
    name: ['שם', 'שם לקוח', 'לקוח', 'שם מלא', 'name', 'full name', 'client', 'customer'],
    phone: ['טלפון', 'טל', 'נייד', 'פלאפון', 'phone', 'mobile', 'cell', 'tel'],
    email: ['מייל', 'אימייל', 'דוא"ל', 'email', 'e-mail', 'mail'],
    company: ['חברה', 'שם חברה', 'ארגון', 'company', 'organization'],
    address: ['כתובת', 'רחוב', 'עיר', 'address', 'street', 'city'],
    position: ['תפקיד', 'משרה', 'position', 'title', 'role'],
    status: ['סטטוס', 'מצב', 'status', 'state'],
    budget_range: ['תקציב', 'טווח תקציב', 'budget', 'price range'],
    source: ['מקור', 'מקור הגעה', 'source', 'lead source'],
    notes: ['הערות', 'הערה', 'notes', 'note', 'comments'],
    description: ['תיאור', 'פירוט', 'description'],
    date: ['תאריך', 'date'],
    amount: ['סכום', 'amount', 'price', 'מחיר'],
    quantity: ['כמות', 'quantity', 'qty'],
    id: ['מזהה', 'קוד', 'id', 'code', 'מספר'],
    website: ['אתר', 'website', 'site'],
    linkedin: ['לינקדאין', 'linkedin'],
    whatsapp: ['וואטסאפ', 'whatsapp']
  };

  fileHeaders.forEach((header, index) => {
    const cleanHeader = (header || '').trim().toLowerCase();
    logFunction(`🔍 [SMART MAP] Processing column ${index}: "${header}"`);

    let bestMatch = null;
    let bestScore = 0;

    targetFields.forEach(targetFieldKey => {
      let targetFieldLabel = targetFieldKey;
      if (CLIENT_SCHEMA[targetFieldKey]) {
        targetFieldLabel = CLIENT_SCHEMA[targetFieldKey].label;
      }

      const cleanTargetFieldKey = targetFieldKey.toLowerCase();
      const cleanTargetFieldLabel = targetFieldLabel.toLowerCase();

      if (cleanHeader === cleanTargetFieldKey || cleanHeader === cleanTargetFieldLabel) {
        if (100 > bestScore) {
          bestMatch = targetFieldKey;
          bestScore = 100;
          logFunction(`✅ [SMART MAP] Perfect match: "${header}" → ${targetFieldKey}`);
        }
      }

      if (HEBREW_FIELD_MAPPINGS[cleanHeader] === targetFieldKey) {
        if (90 > bestScore) {
          bestMatch = targetFieldKey;
          bestScore = 90;
          logFunction(`✅ [SMART MAP] Hebrew direct mapping: "${header}" → ${targetFieldKey}`);
        }
      }

      for (const [patternType, patterns] of Object.entries(fieldPatterns)) {
        const isTargetRelatedToPattern = (
          patternType === targetFieldKey ||
          cleanTargetFieldKey.includes(patternType) ||
          cleanTargetFieldLabel.includes(patternType)
        );

        if (isTargetRelatedToPattern || CLIENT_SCHEMA[targetFieldKey]) {
          for (const pattern of patterns) {
            if (cleanHeader.includes(pattern.toLowerCase())) {
              const score = pattern.length * 5;
              if (score > bestScore) {
                bestMatch = targetFieldKey;
                bestScore = score;
                logFunction(`🎯 [SMART MAP] Pattern match: "${header}" → ${targetFieldKey} (score: ${score})`);
              }
            }
          }
        }
      }

      if (cleanHeader.includes(cleanTargetFieldKey) || cleanTargetFieldKey.includes(cleanHeader) ||
        cleanHeader.includes(cleanTargetFieldLabel) || cleanTargetFieldLabel.includes(cleanHeader)) {
        const score = 40;
        if (score > bestScore) {
          bestMatch = targetFieldKey;
          bestScore = score;
          logFunction(`🔸 [SMART MAP] Partial match: "${header}" → ${targetFieldKey} (score: ${score})`);
        }
      }
    });

    if (bestMatch && bestScore >= 40) {
      mapping[index] = bestMatch;
      logFunction(`✅ [SMART MAP] Mapped column ${index} "${header}" → ${bestMatch}`);
    } else {
      logFunction(`⚠️ [SMART MAP] No good match for column ${index} "${header}"`);
    }
  });

  logFunction('✅ [SMART MAP] Mapping complete.');
  return mapping;
};

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
  // ... keep all existing state variables ...
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

  const log = useCallback((message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString('he-IL');
    const emoji = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'warning' ? '⚠️' : '📋';
    const logEntry = `${emoji} [${timestamp}] ${message}`;
    setLogs(prev => [...prev, logEntry]);
    if (type === 'error') {
      toast.error(message);
    } else if (type === 'success') {
      toast.success(message);
    }
  }, []);

  // ... keep all existing helper functions (parseCSV, parseExcel, handleFileSelect, etc.) ...

  const parseCSV = async (text) => {
    log('מתחיל פרסור CSV...');
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length === 0) throw new Error('הקובץ ריק');
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
        parsedData = await parseCSV(text);
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
      if (importMode === 'new_table') {
        if (detectedSheetName && detectedSheetName !== 'Sheet1') {
          setNewTableName(detectedSheetName);
        }
        setStep(STEPS.NAME_TABLE);
      } else if (importMode === 'existing_table' && targetTable) {
        log('מתחיל מיפוי אוטומטי לטבלה קיימת...');
        const targetFields = targetTable.columns.map(col => col.key);
        const autoMapping = smartColumnMapping(headers, targetFields, log);
        setMapping(autoMapping);
        setStep(STEPS.MAP);
      } else if (importMode === 'client') {
        log('מתחיל מיפוי אוטומטי ל-Client...');
        const targetFields = Object.keys(CLIENT_SCHEMA);
        const autoMapping = smartColumnMapping(headers, targetFields, log);
        setMapping(autoMapping);
        setStep(STEPS.MAP);
      } else {
        log('שגיאה: מצב יבוא לא ידוע או טבלת יעד לא הוגדרה.', 'error');
        setStep(STEPS.SELECT_MODE);
      }
    } catch (error) {
      log(`שגיאה בטעינת הקובץ: ${error.message}`, 'error');
      setStep(STEPS.UPLOAD);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTableSelected = (table) => {
    setTargetTable(table);
    setShowTableSelector(false);
    log(`נבחרה טבלת יעד: ${table.name}`, 'success');
    setImportMode('existing_table');
    setStep(STEPS.UPLOAD);
  };

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
      log(`טבלה נוצרה בהצלחה: "${newTable.name}" (ID: ${newTable.id})`, 'success');
      setTargetTable({
        id: newTable.id,
        name: newTable.name,
        type: 'custom',
        columns: columns,
        data: newTable
      });
      log('עובר לשלב מיפוי...');
      const targetFields = columns.map(col => col.key);
      const autoMapping = smartColumnMapping(rawHeaders, targetFields, log);
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

  const handlePreview = () => {
    log('מכין תצוגה מקדימה...');
    const mappedFields = Object.values(mapping).filter(v => v && v !== 'skip');
    if (mappedFields.length === 0) {
      toast.error('יש למפות לפחות שדה אחד');
      return;
    }
    if (importMode === 'client' && !mappedFields.includes('name')) {
      toast.error('חובה למפות לפחות את שדה "שם לקוח"');
      return;
    }
    const preview = [];
    const errors = [];
    rawRows.forEach((row, rowIndex) => {
      const item = { _rowNumber: rowIndex + 2 };
      let hasData = false;
      rawHeaders.forEach((header, colIndex) => {
        const targetField = mapping[colIndex];
        if (targetField && targetField !== 'skip') {
          const value = row[colIndex]?.trim() || '';
          if (value) {
            item[targetField] = value;
            hasData = true;
          }
        }
      });
      if (importMode === 'client') {
        if (!hasData) {
          errors.push({ row: rowIndex + 2, error: 'שורה ריקה' });
        } else if (!item.name || !item.name.trim()) {
          errors.push({ row: rowIndex + 2, error: 'חסר שם (שדה חובה בייבוא לקוחות)' });
        }
      }
      if (Object.keys(item).length > 1 || (Object.keys(item).length === 1 && item._rowNumber)) {
        const hasMappedData = Object.keys(item).some(k => k !== '_rowNumber' && item[k] !== '');
        if (hasMappedData || importMode === 'client') {
          preview.push(item);
        }
      }
    });
    log(`תצוגה מקדימה הושלמה: ${preview.length} פריטים, ${errors.length} שגיאות`, errors.length === 0 ? 'success' : 'warning');
    setValidatedData(preview);
    setValidationErrors(errors);
    setStep(STEPS.VALIDATE);
  };

  const executeImport = async () => {
    log('מתחיל יבוא...');
    setStep(STEPS.IMPORT);
    setIsProcessing(true);
    setImportProgress(0);
    let successCount = 0;
    let failedCount = 0;
    const failedRows = [];
    try {
      const dataToImport = rawRows.map((row, rowIdx) => {
        const item = {};
        rawHeaders.forEach((header, colIndex) => {
          const targetField = mapping[colIndex];
          if (targetField && targetField !== 'skip') {
            item[targetField] = row[colIndex] || '';
          }
        });
        return { ...item, _originalRowNumber: rowIdx + 2 };
      }).filter(item => Object.keys(item).some(key => key !== '_originalRowNumber' && item[key]));
      if (dataToImport.length === 0) {
        throw new Error('אין נתונים לייבוא לאחר המיפוי. ודא ששדות מופו כראוי וקיימים נתונים.');
      }
      if (importMode === 'client') {
        for (let i = 0; i < dataToImport.length; i++) {
          const clientData = { ...dataToImport[i] };
          const originalRowNumber = clientData._originalRowNumber;
          delete clientData._originalRowNumber;
          try {
            if (!clientData.name || clientData.name.trim() === '') {
              throw new Error('שם לקוח חסר או ריק (שדה חובה)');
            }
            await base44.entities.Client.create(clientData);
            successCount++;
          } catch (error) {
            failedCount++;
            failedRows.push({
              row: originalRowNumber,
              name: clientData.name || 'ללא שם',
              error: error.message
            });
            log(`שגיאה בשורה ${originalRowNumber} (${clientData.name || 'ללא שם'}): ${error.message}`, 'error');
          }
          setImportProgress(Math.round(((i + 1) / dataToImport.length) * 100));
        }
      } else {
        if (!targetTable || !targetTable.id) {
          throw new Error('שגיאה: טבלת יעד מותאמת לא הוגדרה.');
        }
        const newRows = dataToImport.map((item, i) => {
          const row = { id: `row_${Date.now()}_${i}-${Math.random().toString(36).substr(2, 5)}` };
          Object.entries(item).forEach(([key, value]) => {
            if (key !== '_originalRowNumber') {
              row[key] = value;
            }
          });
          return row;
        });
        const existingRows = targetTable.data?.rows_data || [];
        await base44.entities.CustomSpreadsheet.update(targetTable.id, {
          rows_data: [...existingRows, ...newRows]
        });
        successCount = newRows.length;
        log(`יובאו ${successCount} שורות לטבלה "${targetTable.name}"`, 'success');
        setImportProgress(100);
      }
      log(`יבוא הושלם! ${successCount} הצליחו, ${failedCount} נכשלו`, 'success');
      setImportResults({
        total: dataToImport.length,
        success: successCount,
        failed: failedCount,
        failedRows
      });
      setStep(STEPS.COMPLETE);
      if (successCount > 0 && onSuccess) {
        setTimeout(() => onSuccess(), 1500);
      }
    } catch (error) {
      log(`שגיאה כללית ביבוא: ${error.message}`, 'error');
      setImportResults({
        total: dataToImport?.length || 0,
        success: successCount,
        failed: (dataToImport?.length || 0) - successCount,
        failedRows: failedRows.length > 0 ? failedRows : [{ row: 'כללי', name: 'N/A', error: error.message }]
      });
      setStep(STEPS.COMPLETE);
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
    setShowTableSelector(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const mappedCount = Object.values(mapping).filter(v => v && v !== 'skip').length;
  const hasRequiredFields = importMode === 'client'
    ? Object.values(mapping).includes('name')
    : mappedCount > 0;

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-6xl h-[90vh] p-0" dir="rtl">
          <div className="flex flex-col h-full">
            {/* Header - Fixed */}
            <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b">
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
            </div>

            {/* Scrollable Content */}
            <ScrollArea className="flex-1 px-6">
              <div className="py-4 space-y-4">
                {/* Console Log */}
                {logs.length > 0 && (
                  <div className="bg-slate-900 text-green-400 rounded-lg p-3 font-mono text-xs max-h-32 overflow-y-auto">
                    {logs.map((log, i) => (
                      <div key={i} className="py-0.5">{log}</div>
                    ))}
                  </div>
                )}

                {/* Step Content */}
                {step === STEPS.SELECT_MODE && (
                  <div className="space-y-6 py-4">
                    <div className="text-center mb-6">
                      <h3 className="text-2xl font-bold text-slate-900 mb-2">איך תרצה לייבא?</h3>
                      <p className="text-slate-600">כל האופציות כוללות מיפוי אוטומטי חכם</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                          <p className="text-xs text-slate-600 mb-3">יבוא לטבלת Client עם מיפוי אוטומטי</p>
                          <Badge variant="outline" className="bg-blue-50 text-blue-700">
                            <Brain className="w-3 h-3 ml-1" />
                            מיפוי חכם
                          </Badge>
                        </CardContent>
                      </Card>

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
                          <p className="text-xs text-slate-600 mb-3">יבוא לטבלה מותאמת עם מיפוי</p>
                          <Badge variant="outline" className="bg-purple-50 text-purple-700">
                            <RefreshCw className="w-3 h-3 ml-1" />
                            גמיש
                          </Badge>
                        </CardContent>
                      </Card>

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
                          <p className="text-xs text-slate-600 mb-3">יצירה אוטומטית עם מיפוי</p>
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

                {step === STEPS.UPLOAD && (
                  <div className="text-center py-12">
                    <label htmlFor="file-upload" className="cursor-pointer block">
                      <div className="border-4 border-dashed border-blue-300 rounded-2xl p-16 bg-gradient-to-br from-blue-50 to-purple-50">
                        <FileSpreadsheet className="w-20 h-20 mx-auto mb-4 text-blue-600" />
                        <h3 className="text-2xl font-bold text-slate-900 mb-2">גרור קובץ או לחץ להעלאה</h3>
                        <p className="text-slate-600">תומך ב-Excel (.xlsx, .xls) ו-CSV</p>
                        <div className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-bold shadow-lg mt-6">
                          <Upload className="w-5 h-5" />
                          בחר קובץ
                        </div>
                      </div>
                      <input id="file-upload" type="file" accept=".xlsx,.xls,.csv" onChange={handleFileSelect} className="hidden" />
                    </label>
                  </div>
                )}

                {step === STEPS.PARSE && (
                  <div className="text-center py-16">
                    <Loader2 className="w-16 h-16 mx-auto mb-4 text-blue-600 animate-spin" />
                    <h3 className="text-xl font-bold text-slate-900">מעבד את הקובץ...</h3>
                  </div>
                )}

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
                          <label className="text-sm font-semibold text-slate-900 mb-2 block">שם הטבלה *</label>
                          <Input value={newTableName} onChange={(e) => setNewTableName(e.target.value)} placeholder="לדוגמה: לצורך הפקדה" />
                        </div>
                        <div>
                          <label className="text-sm font-semibold text-slate-900 mb-2 block">תיאור</label>
                          <Textarea value={newTableDescription} onChange={(e) => setNewTableDescription(e.target.value)} rows={2} />
                        </div>
                      </div>
                    </Card>
                    <div className="flex gap-3">
                      <Button variant="outline" onClick={() => setStep(STEPS.UPLOAD)}>חזור</Button>
                      <Button onClick={createNewTable} disabled={!newTableName.trim()} className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600">
                        <Sparkles className="w-4 h-4 ml-2" />
                        צור טבלה והמשך
                      </Button>
                    </div>
                  </div>
                )}

                {step === STEPS.CREATE_TABLE && (
                  <div className="text-center py-16">
                    <Loader2 className="w-16 h-16 mx-auto mb-4 text-green-600 animate-spin" />
                    <h3 className="text-xl font-bold text-slate-900">יוצר טבלה...</h3>
                  </div>
                )}

                {step === STEPS.MAP && (
                  <div className="space-y-4 pb-20">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">מיפוי אוטומטי חכם</h3>
                        <p className="text-sm text-slate-600">סקור ושנה את המיפוי ({rawHeaders.length} עמודות)</p>
                      </div>
                      <Badge variant="outline" className="bg-blue-100 text-blue-700">
                        <Brain className="w-3 h-3 ml-1" />
                        {Object.values(mapping).filter(v => v && v !== 'skip').length} / {rawHeaders.length}
                      </Badge>
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
                              <div className="flex-1 min-w-0">
                                <div className="text-xs text-slate-500">עמודה {index + 1}</div>
                                <div className="font-semibold truncate">{header || `עמודה ${index + 1}`}</div>
                                <div className="text-xs text-slate-600 truncate">דוגמה: {rawRows[0]?.[index] || '—'}</div>
                              </div>
                              <ArrowRight className={`w-5 h-5 flex-shrink-0 ${isMapped ? 'text-green-600' : 'text-slate-400'}`} />
                              <div className="flex-1 min-w-0">
                                <Select value={mappedField || ''} onValueChange={(value) => setMapping({ ...mapping, [index]: value })}>
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
                              <div className="flex-shrink-0">
                                {isMapped ? (
                                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                                ) : (
                                  <AlertCircle className="w-5 h-5 text-slate-400" />
                                )}
                              </div>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                )}

                {step === STEPS.VALIDATE && (
                  <div className="space-y-4 pb-20">
                    <h3 className="text-lg font-bold">תצוגה מקדימה ({validatedData.length} מתוך {rawRows.length})</h3>
                    <div className="space-y-2">
                      {validatedData.map((item, i) => (
                        <Card key={i} className="p-3">
                          <div className="text-sm space-y-1">
                            {Object.entries(item)
                              .filter(([k]) => k !== '_rowNumber')
                              .map(([key, value]) => (
                                <div key={key} className="flex gap-2">
                                  <strong className="text-slate-700 min-w-[120px]">{key}:</strong>
                                  <span className="text-slate-900">{value || '—'}</span>
                                </div>
                              ))
                            }
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {step === STEPS.IMPORT && (
                  <div className="text-center py-12">
                    <Zap className="w-16 h-16 mx-auto mb-4 text-blue-600 animate-pulse" />
                    <h3 className="text-2xl font-bold text-slate-900 mb-4">מייבא נתונים...</h3>
                    <Progress value={importProgress} className="w-full max-w-md mx-auto h-4" />
                    <p className="text-slate-600 mt-2">{importProgress}%</p>
                  </div>
                )}

                {step === STEPS.COMPLETE && importResults && (
                  <div className="text-center py-12">
                    <CheckCircle2 className="w-24 h-24 mx-auto mb-6 text-green-600" />
                    <h3 className="text-3xl font-bold text-slate-900 mb-4">🎉 היבוא הושלם!</h3>
                    {targetTable && (
                      <Badge className="bg-gradient-to-r from-blue-500 to-purple-600 text-white text-lg px-4 py-2 mb-6">
                        {targetTable.name}
                      </Badge>
                    )}
                    <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto">
                      <Card className="bg-green-50 border-green-200">
                        <CardContent className="p-6 text-center">
                          <div className="text-4xl font-bold text-green-600">{importResults.success}</div>
                          <div className="text-sm text-green-700">הצליחו</div>
                        </CardContent>
                      </Card>
                      {importResults.failed > 0 && (
                        <Card className="bg-red-50 border-red-200">
                          <CardContent className="p-6 text-center">
                            <div className="text-4xl font-bold text-red-600">{importResults.failed}</div>
                            <div className="text-sm text-red-700">נכשלו</div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                    <Button onClick={handleClose} className="mt-6 px-8">סיים</Button>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Footer - Fixed */}
            {[STEPS.MAP, STEPS.VALIDATE].includes(step) && (
              <div className="flex-shrink-0 px-6 py-4 border-t bg-white">
                <div className="flex gap-3">
                  {step === STEPS.MAP && (
                    <>
                      <Button variant="outline" onClick={() => setStep(STEPS.UPLOAD)}>חזור</Button>
                      <Button
                        onClick={() => {
                          const targetFields = importMode === 'client'
                            ? Object.keys(CLIENT_SCHEMA)
                            : targetTable?.columns?.map(col => col.key) || [];
                          const newMapping = smartColumnMapping(rawHeaders, targetFields, log);
                          setMapping(newMapping);
                          toast.success('המיפוי רוענן');
                        }}
                        variant="outline"
                        className="gap-2"
                      >
                        <RefreshCw className="w-4 h-4" />
                        רענן
                      </Button>
                      <Button onClick={handlePreview} className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600">
                        <Eye className="w-4 h-4 ml-2" />
                        תצוגה מקדימה
                      </Button>
                    </>
                  )}
                  {step === STEPS.VALIDATE && (
                    <>
                      <Button variant="outline" onClick={() => setStep(STEPS.MAP)}>חזור למיפוי</Button>
                      <Button onClick={executeImport} className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600">
                        <Zap className="w-4 h-4 ml-2" />
                        ייבא {rawRows.length} פריטים
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

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