
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
  AlertTriangle, // Kept this for the validation errors display, as AlertCircle in outline was not a direct replacement there.
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
  AlertCircle, // Added for UI elements like status indicators
  RefreshCw, // Added for refresh mapping button
  Brain // Added for smart mapping badge
} from 'lucide-react';
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import TableManager from './TableManager'; // Re-added TableManager import

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

// מיפוי מתקדם - עובד גם עם טבלאות מותאמות
const smartColumnMapping = (fileHeaders, targetFields, logFunction) => {
  const mapping = {};

  logFunction('🧠 [SMART MAP] Starting smart mapping...');
  logFunction(`📋 [SMART MAP] File headers: ${fileHeaders.join(', ')}`);
  logFunction(`🎯 [SMART MAP] Target fields: ${targetFields.join(', ')}`);

  // מילות מפתח לכל סוג שדה
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
      let targetFieldLabel = targetFieldKey; // Default to key if no label available
      if (CLIENT_SCHEMA[targetFieldKey]) {
        targetFieldLabel = CLIENT_SCHEMA[targetFieldKey].label;
      } else if (targetFieldKey.startsWith('col_')) {
        // For default custom table column keys, the key itself is often the best match value
      } else {
        // For custom tables with custom keys, the key itself might be meaningful
      }
      
      const cleanTargetFieldKey = targetFieldKey.toLowerCase();
      const cleanTargetFieldLabel = targetFieldLabel.toLowerCase();

      // 1. Direct match (header == targetFieldKey or header == targetFieldLabel)
      if (cleanHeader === cleanTargetFieldKey || cleanHeader === cleanTargetFieldLabel) {
        if (100 > bestScore) { // Ensure perfect matches always win
          bestMatch = targetFieldKey;
          bestScore = 100;
          logFunction(`✅ [SMART MAP] Perfect match: "${header}" → ${targetFieldKey}`);
        }
        // Don't return, as multiple perfect matches could exist for a column.
        // The last one found would win, but it's usually fine.
      }

      // 2. Match based on HEBREW_FIELD_MAPPINGS (for client schema fields primarily)
      if (HEBREW_FIELD_MAPPINGS[cleanHeader] === targetFieldKey) {
        if (90 > bestScore) { // High score for direct Hebrew mapping
          bestMatch = targetFieldKey;
          bestScore = 90;
          logFunction(`✅ [SMART MAP] Hebrew direct mapping: "${header}" → ${targetFieldKey}`);
        }
      }

      // 3. Match using patterns
      for (const [patternType, patterns] of Object.entries(fieldPatterns)) {
        // Check if the target field key or label contains the pattern type or a pattern
        const isTargetRelatedToPattern = (
          patternType === targetFieldKey ||
          cleanTargetFieldKey.includes(patternType) ||
          cleanTargetFieldLabel.includes(patternType)
        );

        if (isTargetRelatedToPattern || CLIENT_SCHEMA[targetFieldKey]) { // Always check for CLIENT_SCHEMA fields
          for (const pattern of patterns) {
            if (cleanHeader.includes(pattern.toLowerCase())) {
              const score = pattern.length * 5; // Give a higher score for longer pattern matches
              if (score > bestScore) {
                bestMatch = targetFieldKey;
                bestScore = score;
                logFunction(`🎯 [SMART MAP] Pattern match: "${header}" → ${targetFieldKey} (score: ${score})`);
              }
            }
          }
        }
      }

      // 4. Partial match (header contains targetFieldKey/label or vice versa)
      if (cleanHeader.includes(cleanTargetFieldKey) || cleanTargetFieldKey.includes(cleanHeader) ||
          cleanHeader.includes(cleanTargetFieldLabel) || cleanTargetFieldLabel.includes(cleanHeader)) {
        const score = 40; // Base score for partial match
        if (score > bestScore) {
          bestMatch = targetFieldKey;
          bestScore = score;
          logFunction(`🔸 [SMART MAP] Partial match: "${header}" → ${targetFieldKey} (score: ${score})`);
        }
      }
    });

    if (bestMatch && bestScore >= 40) { // Apply a threshold for a "good enough" match
      mapping[index] = bestMatch;
      logFunction(`✅ [SMART MAP] Mapped column ${index} "${header}" → ${bestMatch}`);
    } else {
      logFunction(`⚠️ [SMART MAP] No good match for column ${index} "${header}"`);
    }
  });

  logFunction('✅ [SMART MAP] Mapping complete.');
  return mapping;
};

// שלבים
const STEPS = {
  SELECT_MODE: 0,
  SELECT_TABLE: 1, // New step for selecting an existing table
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
  // State
  const [step, setStep] = useState(STEPS.SELECT_MODE);
  const [file, setFile] = useState(null);
  const [rawHeaders, setRawHeaders] = useState([]);
  const [rawRows, setRawRows] = useState([]);
  const [mapping, setMapping] = useState({});
  const [validatedData, setValidatedData] = useState([]); // This will be preview data in new flow
  const [validationErrors, setValidationErrors] = useState([]);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState(null);
  const [logs, setLogs] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // New state variables
  const [importMode, setImportMode] = useState(null); // 'client', 'existing_table', or 'new_table'
  const [targetTable, setTargetTable] = useState(null); // Stores details of selected entity/custom table
  const [newTableName, setNewTableName] = useState('');
  const [newTableDescription, setNewTableDescription] = useState('');
  const [detectedSheetName, setDetectedSheetName] = useState('');
  const [showTableSelector, setShowTableSelector] = useState(false); // Controls TableManager visibility

  // Logger
  const log = useCallback((message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString('he-IL');
    const emoji = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'warning' ? '⚠️' : '📋';
    const logEntry = `${emoji} [${timestamp}] ${message}`;

    setLogs(prev => [...prev, logEntry]);
    // console.log(`[IMPORT ${type.toUpperCase()}]`, message); // Keep for dev console as well

    if (type === 'error') {
      toast.error(message);
    } else if (type === 'success') {
      toast.success(message);
    }
  }, []);

  // קריאת CSV
  const parseCSV = async (text) => { // Made async for consistency with parseExcel, though not strictly needed
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

  // קריאת Excel - עם זיהוי שם גיליון
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

      // שמירת שם הגיליון
      if (response.data.debug?.sheetName) {
        setDetectedSheetName(response.data.debug.sheetName);
        log(`זוהה שם גיליון: "${response.data.debug.sheetName}"`);
      }

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

  // העלאת קובץ
  const handleFileSelect = async (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setLogs([]);
    setFile(selectedFile);
    setStep(STEPS.PARSE);
    setIsProcessing(true);

    log(`קובץ נבחר: ${selectedFile.name} (${(selectedFile.size / 1024).toFixed(2)} KB)`);

    // הצע שם טבלה מברירת מחדל
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

      // Transition based on selected import mode
      if (importMode === 'new_table') {
        // New table - proceed to naming step
        if (detectedSheetName && detectedSheetName !== 'Sheet1') {
          setNewTableName(detectedSheetName);
        }
        setStep(STEPS.NAME_TABLE);
      } else if (importMode === 'existing_table' && targetTable) {
        // Existing table - auto-map to its columns
        log('מתחיל מיפוי אוטומטי לטבלה קיימת...');
        const targetFields = targetTable.columns.map(col => col.key);
        const autoMapping = smartColumnMapping(headers, targetFields, log);
        setMapping(autoMapping);
        setStep(STEPS.MAP);
      } else if (importMode === 'client') {
        // Client entity - auto-map to CLIENT_SCHEMA fields
        log('מתחיל מיפוי אוטומטי ל-Client...');
        const targetFields = Object.keys(CLIENT_SCHEMA);
        const autoMapping = smartColumnMapping(headers, targetFields, log);
        setMapping(autoMapping);
        setStep(STEPS.MAP);
      } else {
        log('שגיאה: מצב יבוא לא ידוע או טבלת יעד לא הוגדרה.', 'error');
        setStep(STEPS.SELECT_MODE); // Go back to mode selection
      }
    } catch (error) {
      log(`שגיאה בטעינת הקובץ: ${error.message}`, 'error');
      setStep(STEPS.UPLOAD);
    } finally {
      setIsProcessing(false);
    }
  };

  // בחירת טבלה קיימת (from TableManager)
  const handleTableSelected = (table) => {
    setTargetTable(table);
    setShowTableSelector(false); // Close the table selector dialog
    log(`נבחרה טבלת יעד: ${table.name}`, 'success');

    setImportMode('existing_table'); // Set mode explicitly
    setStep(STEPS.UPLOAD); // Proceed to upload file
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
      // יצירת עמודות מהכותרות
      const columns = rawHeaders.map((header, index) => ({
        key: `col_${index + 1}`, // Generic key for new tables
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
        rows_data: [] // Start with empty data, will be updated in import step
      });

      log(`טבלה נוצרה בהצלחה: "${newTable.name}" (ID: ${newTable.id})`, 'success');

      setTargetTable({
        id: newTable.id,
        name: newTable.name,
        type: 'custom',
        columns: columns, // Store columns for mapping
        data: newTable // Store full table object if needed, e.g., for existing rows.
      });

      // עבור למיפוי
      log('עובר לשלב מיפוי...');
      const targetFields = columns.map(col => col.key);
      const autoMapping = smartColumnMapping(rawHeaders, targetFields, log);
      setMapping(autoMapping);
      setStep(STEPS.MAP);

    } catch (error) {
      log(`שגיאה ביצירת טבלה: ${error.message}`, 'error');
      toast.error('שגיאה ביצירת הטבלה');
      setStep(STEPS.NAME_TABLE); // Go back to naming step on error
    } finally {
      setIsProcessing(false);
    }
  };

  // הכנת תצוגה מקדימה וולידציה (before final import)
  const handlePreview = () => {
    log('מכין תצוגה מקדימה...');

    const mappedFields = Object.values(mapping).filter(v => v && v !== 'skip');

    if (mappedFields.length === 0) {
      toast.error('יש למפות לפחות שדה אחד');
      return;
    }

    // Client-specific validation for 'name'
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

      // Perform minimal validation for preview, e.g., for required 'name' field in client mode
      if (importMode === 'client') {
        if (!hasData) {
          errors.push({ row: rowIndex + 2, error: 'שורה ריקה' });
        } else if (!item.name || !item.name.trim()) {
          errors.push({ row: rowIndex + 2, error: 'חסר שם (שדה חובה בייבוא לקוחות)' });
        }
      }

      if (Object.keys(item).length > 1 || (Object.keys(item).length === 1 && item._rowNumber)) { // If it has more than just _rowNumber or only _rowNumber
        // This check is to filter out entirely empty rows that were mapped but had no data.
        // A row with just '_rowNumber' might indicate an empty row, but if it has other mapped fields, it's not empty.
        // The earlier `filter` on rawRows already removed empty file rows. This is for post-mapping empty items.
        const hasMappedData = Object.keys(item).some(k => k !== '_rowNumber' && item[k] !== '');
        if (hasMappedData || importMode === 'client') { // For client mode, even partially empty rows might be included for validation.
             preview.push(item);
        }
      }
    });

    log(`תצוגה מקדימה הושלמה: ${preview.length} פריטים, ${errors.length} שגיאות`, errors.length === 0 ? 'success' : 'warning');

    setValidatedData(preview);
    setValidationErrors(errors);
    setStep(STEPS.VALIDATE);
  };

  // ביצוע יבוא
  const executeImport = async () => {
    log('מתחיל יבוא...');
    setStep(STEPS.IMPORT);
    setIsProcessing(true);
    setImportProgress(0);

    let successCount = 0;
    let failedCount = 0;
    const failedRows = [];

    try {
      // Prepare all data based on current mapping
      const dataToImport = rawRows.map((row, rowIdx) => {
        const item = {};
        rawHeaders.forEach((header, colIndex) => {
          const targetField = mapping[colIndex];
          if (targetField && targetField !== 'skip') {
            item[targetField] = row[colIndex] || '';
          }
        });
        return { ...item, _originalRowNumber: rowIdx + 2 }; // Keep original row number for errors
      }).filter(item => Object.keys(item).some(key => key !== '_originalRowNumber' && item[key])); // Filter out truly empty rows

      if (dataToImport.length === 0) {
        throw new Error('אין נתונים לייבוא לאחר המיפוי. ודא ששדות מופו כראוי וקיימים נתונים.');
      }

      // Import logic based on mode
      if (importMode === 'client') {
        // Import to Client entity
        for (let i = 0; i < dataToImport.length; i++) {
          const clientData = { ...dataToImport[i] };
          const originalRowNumber = clientData._originalRowNumber;
          delete clientData._originalRowNumber; // Remove internal tracking field

          try {
            // Minimal validation for client mode: ensure name exists
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
      } else { // 'existing_table' or 'new_table' (which transitions to existing_table logic after creation)
        // Import to custom table (append new rows)
        if (!targetTable || !targetTable.id) {
          throw new Error('שגיאה: טבלת יעד מותאמת לא הוגדרה.');
        }

        const newRows = dataToImport.map((item, i) => {
          const row = { id: `row_${Date.now()}_${i}-${Math.random().toString(36).substr(2, 5)}` }; // Unique ID
          Object.entries(item).forEach(([key, value]) => {
            if (key !== '_originalRowNumber') {
              row[key] = value;
            }
          });
          return row;
        });

        // Fetch existing rows if it's an existing table, otherwise it's an empty array.
        // For 'new_table' mode, targetTable.data.rows_data is already [].
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
      setStep(STEPS.COMPLETE); // Show results even if overall import failed
    } finally {
      setIsProcessing(false);
    }
  };

  // איפוס מלא
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
    setImportMode(null); // Reset import mode
    setNewTableName(''); // Reset new table name
    setNewTableDescription(''); // Reset new table description
    setDetectedSheetName(''); // Reset detected sheet name
    setShowTableSelector(false); // Reset table selector visibility
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const mappedCount = Object.values(mapping).filter(v => v && v !== 'skip').length;
  // Dynamic required field check for client mode
  const hasRequiredFields = importMode === 'client'
    ? Object.values(mapping).includes('name')
    : mappedCount > 0; // For custom tables, just need at least one mapped field

  // Filter out steps not relevant to the current import mode for the progress bar
  const visibleSteps = Object.entries(STEPS)
    .filter(([key, value]) => {
      if (key === 'SELECT_MODE') return false; // This is the initial decision point, not part of linear progress
      if (importMode === 'new_table' && (key === 'SELECT_TABLE')) return false; // New table mode skips selecting an existing table
      if ((importMode === 'client' || importMode === 'existing_table') && (key === 'NAME_TABLE' || key === 'CREATE_TABLE')) return false; // These modes skip naming/creating a new table
      return true;
    })
    .map(([, value]) => value);


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
              {importMode === 'new_table'
                ? 'יצירת טבלה חדשה אוטומטית מהקובץ'
                : importMode === 'existing_table'
                  ? `ייבוא נתונים לטבלה קיימת: ${targetTable?.name || ''}`
                  : importMode === 'client'
                    ? 'יבוא חכם של נתונים עם תמיכה מלאה בעברית לטבלת לקוחות'
                    : 'בחר מצב יבוא כדי להתחיל'
              }
            </DialogDescription>
          </DialogHeader>

          {/* Progress Bar */}
          <div className="flex items-center justify-between gap-2 mb-4">
            {visibleSteps.map((s, index) => {
              const isCurrent = step === s;
              const isCompleted = step > s;
              const stepIcon = isCompleted ? <Check className="w-5 h-5" /> : s;

              let stepLabel = '';
              switch (s) {
                case STEPS.SELECT_TABLE: stepLabel = 'בחר טבלה'; break;
                case STEPS.UPLOAD: stepLabel = 'העלה קובץ'; break;
                case STEPS.PARSE: stepLabel = 'פרסור'; break;
                case STEPS.NAME_TABLE: stepLabel = 'שם לטבלה'; break;
                case STEPS.CREATE_TABLE: stepLabel = 'יצירת טבלה'; break;
                case STEPS.MAP: stepLabel = 'מיפוי'; break;
                case STEPS.VALIDATE: stepLabel = 'תצוגה מקדימה'; break; // Label changed to reflect new flow
                case STEPS.IMPORT: stepLabel = 'יבוא'; break;
                case STEPS.COMPLETE: stepLabel = 'סיכום'; break;
                default: stepLabel = `שלב ${s}`;
              }

              return (
                <React.Fragment key={s}>
                  <div className="flex flex-col items-center flex-1 min-w-0">
                    <div className={`
                      w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all
                      ${isCompleted ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg' :
                        isCurrent ? 'bg-blue-400 text-white shadow-md' :
                          'bg-slate-200 text-slate-500'}
                    `}>
                      {stepIcon}
                    </div>
                    <span className="text-xs mt-1 text-center truncate w-full">
                      {stepLabel}
                    </span>
                  </div>
                  {index < visibleSteps.length - 1 && (
                    <div className={`flex-1 h-1 rounded ${isCompleted ? 'bg-gradient-to-r from-blue-500 to-purple-600' : 'bg-slate-200'}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Console Log */}
          {logs.length > 0 && (
            <Card className="bg-slate-900 border-slate-700 mb-4">
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-green-400">
                    <Terminal className="w-4 h-4" />
                    <span className="text-xs font-bold">יומן מערכת</span>
                  </div>
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
            {/* Step 0: Select Import Mode */}
            {step === STEPS.SELECT_MODE && (
              <div className="space-y-6 py-8">
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">איך תרצה לייבא?</h3>
                  <p className="text-slate-600">בחר את סוג היבוא המתאים</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
                  {/* Option 1: Import to Client */}
                  <Card
                    className="cursor-pointer hover:shadow-xl transition-all border-2 hover:border-blue-400 group"
                    onClick={() => {
                      setImportMode('client');
                      setTargetTable({
                        id: 'clients', // A logical ID for the fixed Client entity
                        name: 'לקוחות (Client)',
                        type: 'entity',
                        entity: 'Client'
                      });
                      setStep(STEPS.UPLOAD);
                    }}
                  >
                    <CardContent className="p-8 text-center">
                      <div className="p-4 bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl w-20 h-20 mx-auto mb-4 group-hover:scale-110 transition-transform">
                        <Database className="w-12 h-12 text-blue-600" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 mb-2">ייבא ללקוחות</h3>
                      <p className="text-sm text-slate-600 mb-4">
                        ייבוא לטבלת הלקוחות הראשית עם מיפוי אוטומטי של שדות
                      </p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        <Badge variant="outline" className="bg-blue-50 text-blue-700">מיפוי חכם</Badge>
                        <Badge variant="outline" className="bg-green-50 text-green-700">וולידציה</Badge>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Option 2: Existing Table */}
                  <Card
                    className="cursor-pointer hover:shadow-xl transition-all border-2 hover:border-purple-400 group"
                    onClick={() => {
                      setImportMode('existing_table');
                      setShowTableSelector(true); // Open TableManager
                    }}
                  >
                    <CardContent className="p-8 text-center">
                      <div className="p-4 bg-gradient-to-br from-purple-100 to-pink-100 rounded-2xl w-20 h-20 mx-auto mb-4 group-hover:scale-110 transition-transform">
                        <FileText className="w-12 h-12 text-purple-600" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 mb-2">ייבא לטבלה קיימת</h3>
                      <p className="text-sm text-slate-600 mb-4">
                        הוספת נתונים לטבלה מותאמת אישית קיימת במערכת
                      </p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        <Badge variant="outline" className="bg-purple-50 text-purple-700">גמיש</Badge>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700">מיפוי חכם</Badge>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Option 3: Create New Table */}
                  <Card
                    className="cursor-pointer hover:shadow-xl transition-all border-2 hover:border-green-400 group"
                    onClick={() => {
                      setImportMode('new_table');
                      setStep(STEPS.UPLOAD);
                    }}
                  >
                    <CardContent className="p-8 text-center">
                      <div className="p-4 bg-gradient-to-br from-green-100 to-emerald-100 rounded-2xl w-20 h-20 mx-auto mb-4 group-hover:scale-110 transition-transform">
                        <Sparkles className="w-12 h-12 text-green-600" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 mb-2">צור טבלה חדשה</h3>
                      <p className="text-sm text-slate-600 mb-4">
                        יצירה אוטומטית של טבלה חדשה עם כל העמודות מהקובץ
                      </p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        <Badge variant="outline" className="bg-green-50 text-green-700">אוטומטי</Badge>
                        <Badge variant="outline" className="bg-purple-50 text-purple-700">ללא מיפוי</Badge>
                        <Badge variant="outline" className="bg-orange-50 text-orange-700">שם מותאם</Badge>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="max-w-2xl mx-auto">
                  <Alert>
                    <Sparkles className="w-5 h-5" />
                    <AlertDescription>
                      <div className="font-semibold mb-2">💡 מתי להשתמש בכל אופציה?</div>
                      <ul className="text-sm space-y-1 text-slate-700">
                        <li><strong>ייבא ללקוחות:</strong> כשיש לך קובץ לקוחות עם שדות סטנדרטיים (שם, טלפון, מייל)</li>
                        <li><strong>ייבא לטבלה קיימת:</strong> כשיש לך נתונים שתרצה להוסיף לטבלה מותאמת אישית שכבר יצרת.</li>
                        <li><strong>צור טבלה חדשה:</strong> כשיש לך קובץ עם נתונים במבנה ייחודי (לדוגמה: "לצורך הפקדה", "פרוגרמת יחידת דיור"), והמערכת תיצור טבלה מתאימה באופן אוטומטי.</li>
                      </ul>
                    </AlertDescription>
                  </Alert>
                </div>
              </div>
            )}

            {/* Step 1: Upload */}
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
                    {importMode === 'new_table' && (
                      <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 text-white mt-2">
                        ✨ יצירת טבלה אוטומטית
                      </Badge>
                    )}
                    {(importMode === 'client' || importMode === 'existing_table') && targetTable && (
                      <Badge className="bg-gradient-to-r from-blue-500 to-purple-600 text-white mt-2">
                        יעד: {targetTable.name}
                      </Badge>
                    )}
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
                    onClick={() => {
                      setImportMode(null);
                      setStep(STEPS.SELECT_MODE);
                      setTargetTable(null);
                    }}
                    className="mt-4"
                  >
                    חזור לבחירת מצב
                  </Button>
                </label>
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

            {/* Step 3: Name New Table */}
            {step === STEPS.NAME_TABLE && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <div className="p-4 bg-gradient-to-br from-green-100 to-emerald-100 rounded-2xl w-20 h-20 mx-auto mb-4">
                    <TableIcon className="w-12 h-12 text-green-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">קבע שם לטבלה החדשה</h3>
                  <p className="text-slate-600">הטבלה תכלול את כל {rawHeaders.length} העמודות מהקובץ</p>
                </div>

                <Card className="p-6 bg-gradient-to-br from-blue-50 to-purple-50">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-semibold text-slate-900 mb-2 block flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        שם הטבלה *
                      </label>
                      <Input
                        value={newTableName}
                        onChange={(e) => setNewTableName(e.target.value)}
                        placeholder={detectedSheetName || "לדוגמה: לצורך הפקדה"}
                        className="text-right text-lg font-semibold"
                        autoFocus
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        {detectedSheetName && detectedSheetName !== 'Sheet1' && `💡 שם מוצע מהקובץ: "${detectedSheetName}"`}
                      </p>
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-slate-900 mb-2 block">
                        תיאור (אופציונלי)
                      </label>
                      <Textarea
                        value={newTableDescription}
                        onChange={(e) => setNewTableDescription(e.target.value)}
                        placeholder="תיאור קצר של מטרת הטבלה..."
                        rows={2}
                        className="text-right"
                      />
                    </div>
                  </div>
                </Card>

                {/* Preview of columns */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">תצוגה מקדימה של העמודות שייווצרו:</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-48">
                      <div className="flex flex-wrap gap-2">
                        {rawHeaders.map((header, index) => (
                          <Badge key={index} variant="outline" className="text-sm">
                            {index + 1}. {header || `עמודה ${index + 1}`}
                          </Badge>
                        ))}
                      </div>
                    </ScrollArea>
                    <div className="mt-4 text-sm text-slate-600 text-center">
                      סה"כ {rawHeaders.length} עמודות • {rawRows.length} שורות נתונים
                    </div>
                  </CardContent>
                </Card>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setStep(STEPS.UPLOAD)}
                  >
                    חזור
                  </Button>
                  <Button
                    onClick={createNewTable}
                    disabled={!newTableName.trim() || isProcessing}
                    className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 gap-2"
                  >
                    <Sparkles className="w-5 h-5" />
                    צור טבלה ועבור למיפוי
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Creating Table (Loading) */}
            {step === STEPS.CREATE_TABLE && (
              <div className="text-center py-16">
                <Loader2 className="w-16 h-16 mx-auto mb-4 text-green-600 animate-spin" />
                <h3 className="text-xl font-bold text-slate-900">יוצר טבלה ומכין למיפוי...</h3>
                <p className="text-slate-600 mt-2">זה עשוי לקחת מספר שניות</p>
              </div>
            )}

            {/* Step 5: Mapping (Enhanced with Auto-mapping) */}
            {step === STEPS.MAP && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">מיפוי עמודות</h3>
                    <p className="text-sm text-slate-600">סקור ושנה את המיפוי האוטומטי</p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="bg-blue-100 text-blue-700">
                      <Brain className="w-3 h-3 ml-1" />
                      מיפוי אוטומטי
                    </Badge>
                    <Badge variant="outline">
                      {mappedCount} / {rawHeaders.length} מופו
                    </Badge>
                  </div>
                </div>

                <ScrollArea className="h-[400px]">
                  <div className="space-y-3 pr-4">
                    {rawHeaders.map((header, index) => {
                      const mappedField = mapping[index];
                      const isMapped = mappedField && mappedField !== 'skip';

                      // Determine the list of target fields based on importMode
                      const targetFieldsForSelect = importMode === 'client'
                        ? Object.entries(CLIENT_SCHEMA).map(([key, schema]) => ({ key, label: schema.label, required: schema.required }))
                        : targetTable?.columns?.map(col => ({ key: col.key, label: col.title || col.key, required: false })) || [];

                      const currentTargetFieldSchema = importMode === 'client'
                        ? CLIENT_SCHEMA[mappedField]
                        : targetTable?.columns?.find(c => c.key === mappedField);

                      return (
                        <Card key={index} className={`p-4 ${isMapped ? 'border-green-200 bg-green-50/50' : 'border-slate-200'}`}>
                          <div className="flex items-center gap-4">
                            {/* Source Column */}
                            <div className="flex-1">
                              <div className="text-xs text-slate-500 mb-1">עמודה {index + 1} בקובץ</div>
                              <div className="font-semibold text-slate-900">{header || `עמודה ${index + 1}`}</div>
                              <div className="text-xs text-slate-600 mt-1">
                                דוגמה: {rawRows[0]?.[index] || '—'}
                              </div>
                            </div>

                            <ArrowRight className={`w-5 h-5 flex-shrink-0 ${isMapped ? 'text-green-600' : 'text-slate-400'}`} />

                            {/* Target Field */}
                            <div className="flex-1">
                              <Select
                                value={mappedField || 'skip'} // Default to skip if not mapped
                                onValueChange={(value) => setMapping(prev => ({ ...prev, [index]: value }))}
                              >
                                <SelectTrigger className={`w-full ${isMapped ? 'border-green-500 bg-white' : ''}`}>
                                  <SelectValue placeholder="בחר שדה יעד..." />
                                </SelectTrigger>
                                <SelectContent dir="rtl">
                                  <SelectItem value="skip">
                                    <div className="flex items-center gap-2 text-red-500">
                                      <X className="w-4 h-4" />
                                      דלג על עמודה זו
                                    </div>
                                  </SelectItem>
                                  {targetFieldsForSelect.map(field => (
                                    <SelectItem key={field.key} value={field.key}>
                                      {field.required && <span className="text-red-500">* </span>}
                                      {field.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {isMapped && mappedField !== 'skip' && (
                                <div className="text-xs text-green-700 mt-1 flex items-center gap-1">
                                  <Check className="w-3 h-3" />
                                  ממופה
                                  {importMode === 'client' && currentTargetFieldSchema?.required && (
                                    <span className="text-red-600 font-medium"> (חובה)</span>
                                  )}
                                  {importMode === 'client' && currentTargetFieldSchema?.example && (
                                    <span className="text-slate-500 mr-1"> • דוגמה: {currentTargetFieldSchema.example}</span>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Status Indicator */}
                            <div className="flex-shrink-0">
                              {isMapped && mappedField !== 'skip' ? (
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
                </ScrollArea>

                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setStep(importMode === 'new_table' ? STEPS.NAME_TABLE : STEPS.UPLOAD)}
                  >
                    חזור
                  </Button>
                  <Button
                    onClick={() => {
                      // Re-run smart mapping with current headers and target fields
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
                    רענן מיפוי
                  </Button>
                  <Button
                    onClick={handlePreview}
                    disabled={!hasRequiredFields || isProcessing}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    תצוגה מקדימה
                  </Button>
                </div>
              </div>
            )}

            {/* Step 6: Validation (Preview) */}
            {step === STEPS.VALIDATE && (
              <div>
                <div className="mb-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
                  <h3 className="text-lg font-bold text-green-900 mb-2">תוצאות תצוגה מקדימה</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-4xl font-bold text-green-600">{validatedData.length}</div>
                      <div className="text-sm text-green-700">פריטים לייבוא</div>
                    </div>
                    <div className="text-center">
                      <div className="text-4xl font-bold text-red-600">{validationErrors.length}</div>
                      <div className="text-sm text-red-700">שגיאות בתצוגה מקדימה</div>
                    </div>
                    <div className="text-center">
                      <div className="text-4xl font-bold text-blue-600">{rawRows.length}</div>
                      <div className="text-sm text-blue-700">סה"כ שורות בקובץ</div>
                    </div>
                  </div>
                </div>

                {validationErrors.length > 0 && (
                  <Alert className="mb-4 bg-red-50 border-red-200">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    <AlertDescription>
                      <div className="font-semibold text-red-900 mb-2">נמצאו {validationErrors.length} שגיאות בתצוגה מקדימה:</div>
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
                        {validatedData.slice(0, 10).map((item, i) => (
                          <div key={i} className="p-3 bg-slate-50 rounded-lg border">
                            <div className="font-bold text-slate-900 mb-1">
                              {importMode === 'client' ? item.name || `לקוח ללא שם (שורה ${item._rowNumber})` : `שורה ${item._rowNumber}`}
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                              {Object.entries(item)
                                .filter(([k]) => k !== '_rowNumber' && (importMode !== 'client' || k !== 'name'))
                                .map(([key, value]) => {
                                  let label = key;
                                  if (importMode === 'client' && CLIENT_SCHEMA[key]) {
                                    label = CLIENT_SCHEMA[key].label;
                                  } else if (targetTable?.columns) {
                                    label = targetTable.columns.find(c => c.key === key)?.title || key;
                                  }
                                  return value && (
                                    <div key={key}>
                                      <span className="font-medium">{label}:</span> {value}
                                    </div>
                                  );
                                })
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

            {/* Step 7: Import Progress */}
            {step === STEPS.IMPORT && (
              <div className="text-center py-12">
                <Zap className="w-20 h-20 mx-auto mb-4 text-blue-600 animate-pulse" />
                <h3 className="text-2xl font-bold text-slate-900 mb-4">
                  {importMode === 'new_table' ? 'מייבא לטבלה החדשה...' : `מייבא נתונים ל${targetTable?.name || 'טבלה'}...`}
                </h3>
                <Progress value={importProgress} className="w-full max-w-md mx-auto h-4 mb-2" />
                <p className="text-slate-600">{importProgress}% הושלם</p>
              </div>
            )}

            {/* Step 8: Complete */}
            {step === STEPS.COMPLETE && importResults && (
              <div className="text-center py-12">
                <CheckCircle2 className="w-24 h-24 mx-auto mb-6 text-green-600" />
                <h3 className="text-3xl font-bold text-slate-900 mb-2">
                  🎉 היבוא הושלם!
                </h3>

                {targetTable && (
                  <div className="mb-6">
                    <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 text-white text-lg px-4 py-2">
                      {targetTable.name}
                    </Badge>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto mb-6">
                  <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                    <CardContent className="p-6 text-center">
                      <div className="text-4xl font-bold text-green-600">{importResults.success}</div>
                      <div className="text-sm text-green-700 mt-1">
                        {importMode === 'client' ? 'לקוחות יובאו' : 'שורות יובאו'}
                      </div>
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
                    <AlertTriangle className="w-5 h-5 text-red-600" />
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

      {/* Table Selector (rendered outside main dialog content) */}
      {showTableSelector && (
        <TableManager
          open={showTableSelector}
          onClose={() => {
            setShowTableSelector(false);
            setStep(STEPS.SELECT_MODE); // Go back to mode selection if TableManager is closed without selection
          }}
          onTableSelect={handleTableSelected}
        />
      )}
    </>
  );
}
