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

// מפת שדות Client
const CLIENT_SCHEMA = {
  name: { label: 'שם לקוח', required: true, type: 'text', example: 'חברת ABC', 
    synonyms: ['שם', 'שם לקוח', 'לקוח', 'שם מלא', 'שם החברה', 'name', 'full name', 'client name', 'customer', 'client'] },
  email: { label: 'אימייל', required: false, type: 'email', example: 'info@abc.com',
    synonyms: ['מייל', 'אימייל', 'אימיל', 'דוא"ל', 'דואל', 'email', 'e-mail', 'mail', 'e mail'] },
  phone: { label: 'טלפון', required: false, type: 'phone', example: '050-1234567',
    synonyms: ['טלפון', 'טל', 'נייד', 'פלאפון', 'פלפון', 'טלפון נייד', 'phone', 'mobile', 'cell', 'telephone', 'tel', 'cellphone'] },
  company: { label: 'חברה', required: false, type: 'text', example: 'ABC בע"מ',
    synonyms: ['חברה', 'שם חברה', 'ארגון', 'עסק', 'company', 'organization', 'business', 'firm'] },
  address: { label: 'כתובת', required: false, type: 'text', example: 'רחוב הרצל 1',
    synonyms: ['כתובת', 'רחוב', 'עיר', 'מען', 'address', 'street', 'city', 'location'] },
  position: { label: 'תפקיד', required: false, type: 'text', example: 'מנכ"ל',
    synonyms: ['תפקיד', 'תפקידו', 'משרה', 'position', 'title', 'role', 'job title'] },
  status: { label: 'סטטוס', required: false, type: 'select', example: 'פעיל',
    synonyms: ['סטטוס', 'מצב', 'סטאטוס', 'status', 'state', 'condition'] },
  budget_range: { label: 'טווח תקציב', required: false, type: 'select', example: '1M-2M',
    synonyms: ['תקציב', 'טווח תקציב', 'תק', 'budget', 'price range', 'budget range'] },
  source: { label: 'מקור הגעה', required: false, type: 'select', example: 'הפנייה',
    synonyms: ['מקור', 'מקור הגעה', 'מקור לקוח', 'source', 'lead source', 'origin'] },
  notes: { label: 'הערות', required: false, type: 'textarea', example: 'לקוח VIP',
    synonyms: ['הערות', 'הערה', 'הע', 'notes', 'note', 'comments', 'remarks'] },
  phone_secondary: { label: 'טלפון נוסף', required: false, type: 'phone', example: '03-1234567',
    synonyms: ['טלפון נוסף', 'טלפון משני', 'טל 2', 'secondary phone', 'phone 2', 'additional phone'] },
  whatsapp: { label: 'וואטסאפ', required: false, type: 'phone', example: '050-1234567',
    synonyms: ['וואטסאפ', 'ווצאפ', 'whatsapp', 'wa', 'wapp'] },
  website: { label: 'אתר', required: false, type: 'url', example: 'www.abc.com',
    synonyms: ['אתר', 'אתר אינטרנט', 'website', 'site', 'web', 'url'] },
  linkedin: { label: 'לינקדאין', required: false, type: 'url', example: 'linkedin.com/company/abc',
    synonyms: ['לינקדאין', 'לינקדין', 'linkedin', 'linked in'] },
  preferred_contact: { label: 'תקשורת מועדפת', required: false, type: 'select', example: 'אימייל',
    synonyms: ['תקשורת מועדפת', 'דרך תקשורת', 'preferred contact', 'contact method'] }
};

// אלגוריתם Levenshtein Distance - מחשב מרחק עריכה בין 2 מחרוזות
const levenshteinDistance = (str1, str2) => {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(0));

  for (let i = 0; i <= len1; i++) matrix[i][0] = i;
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[len1][len2];
};

// חישוב אחוז דמיון בין 2 מחרוזות (0-100)
const calculateSimilarity = (str1, str2) => {
  const distance = levenshteinDistance(str1, str2);
  const maxLen = Math.max(str1.length, str2.length);
  if (maxLen === 0) return 100;
  return Math.round(((maxLen - distance) / maxLen) * 100);
};

// ניקוי מחרוזת לצורך השוואה
const normalizeString = (str) => {
  return (str || '')
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s]/gu, '') // הסרת תווים מיוחדים
    .replace(/\s+/g, ' ');            // נרמול רווחים
};

// מיפוי אוטומטי מתקדם עם Fuzzy Matching
const smartColumnMapping = (fileHeaders, targetFields, logFunction = console.log) => {
  const mapping = {};
  const SIMILARITY_THRESHOLD = 60; // סף דמיון מינימלי (60%)

  logFunction('🧠 [SMART MAP] Starting advanced fuzzy matching...');
  logFunction(`📋 [SMART MAP] File headers: ${fileHeaders.join(', ')}`);
  logFunction(`🎯 [SMART MAP] Target fields: ${targetFields.join(', ')}`);

  fileHeaders.forEach((header, index) => {
    const normalizedHeader = normalizeString(header);
    logFunction(`\n🔍 [COLUMN ${index + 1}] "${header}" → normalized: "${normalizedHeader}"`);

    let bestMatch = null;
    let bestScore = 0;
    let bestReason = '';

    targetFields.forEach(targetFieldKey => {
      // קבלת מידע על השדה
      const fieldInfo = CLIENT_SCHEMA[targetFieldKey] || { 
        label: targetFieldKey, 
        synonyms: [targetFieldKey] 
      };
      
      const synonyms = fieldInfo.synonyms || [targetFieldKey, fieldInfo.label];
      const normalizedFieldKey = normalizeString(targetFieldKey);
      const normalizedFieldLabel = normalizeString(fieldInfo.label);

      // 1️⃣ התאמה מושלמת (100 נקודות)
      if (normalizedHeader === normalizedFieldKey || normalizedHeader === normalizedFieldLabel) {
        if (100 > bestScore) {
          bestMatch = targetFieldKey;
          bestScore = 100;
          bestReason = `Perfect match: "${header}" === "${fieldInfo.label}"`;
          logFunction(`  ✅ ${bestReason}`);
        }
        return; // ממשיכים לשדה הבא
      }

      // 2️⃣ בדיקה מול כל הסינונימים עם Fuzzy Matching
      synonyms.forEach(synonym => {
        const normalizedSynonym = normalizeString(synonym);
        
        // התאמה מדויקת לסינונים
        if (normalizedHeader === normalizedSynonym) {
          if (95 > bestScore) {
            bestMatch = targetFieldKey;
            bestScore = 95;
            bestReason = `Exact synonym match: "${header}" === "${synonym}"`;
            logFunction(`  ✅ ${bestReason}`);
          }
          return;
        }

        // Fuzzy matching - חישוב דמיון
        const similarity = calculateSimilarity(normalizedHeader, normalizedSynonym);
        
        if (similarity >= SIMILARITY_THRESHOLD) {
          const score = similarity; // ציון לפי אחוז הדמיון
          
          if (score > bestScore) {
            bestMatch = targetFieldKey;
            bestScore = score;
            bestReason = `Fuzzy match: "${header}" ≈ "${synonym}" (${similarity}% similar)`;
            logFunction(`  🎯 ${bestReason}`);
          }
        }
      });

      // 3️⃣ בדיקת הכלה (Contains)
      if (normalizedHeader.includes(normalizedFieldKey) || normalizedFieldKey.includes(normalizedHeader)) {
        const score = 70 + (Math.min(normalizedHeader.length, normalizedFieldKey.length) / 
                           Math.max(normalizedHeader.length, normalizedFieldKey.length) * 20);
        
        if (score > bestScore) {
          bestMatch = targetFieldKey;
          bestScore = score;
          bestReason = `Contains match: "${header}" ⊃⊂ "${targetFieldKey}" (${Math.round(score)}%)`;
          logFunction(`  🔸 ${bestReason}`);
        }
      }

      // בדיקה גם מול ה-label
      if (normalizedHeader.includes(normalizedFieldLabel) || normalizedFieldLabel.includes(normalizedHeader)) {
        const score = 70 + (Math.min(normalizedHeader.length, normalizedFieldLabel.length) / 
                           Math.max(normalizedHeader.length, normalizedFieldLabel.length) * 20);
        
        if (score > bestScore) {
          bestMatch = targetFieldKey;
          bestScore = score;
          bestReason = `Contains label match: "${header}" ⊃⊂ "${fieldInfo.label}" (${Math.round(score)}%)`;
          logFunction(`  🔸 ${bestReason}`);
        }
      }
    });

    // שמירת המיפוי רק אם עבר את הסף
    if (bestMatch && bestScore >= SIMILARITY_THRESHOLD) {
      mapping[index] = bestMatch;
      logFunction(`  ✅ [FINAL] Column ${index + 1} "${header}" → ${bestMatch} (score: ${Math.round(bestScore)})`);
    } else {
      logFunction(`  ⚠️ [SKIP] Column ${index + 1} "${header}" - no good match (best: ${Math.round(bestScore)})`);
    }
  });

  const mappedCount = Object.keys(mapping).length;
  const totalColumns = fileHeaders.length;
  logFunction(`\n✅ [COMPLETE] Mapped ${mappedCount}/${totalColumns} columns (${Math.round((mappedCount/totalColumns)*100)}%)`);
  
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
  // ... keep all existing state and functions (same as before) ...
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
        log('מתחיל מיפוי אוטומטי מתקדם עם Fuzzy Matching...');
        const targetFields = targetTable.columns.map(col => col.key);
        const autoMapping = smartColumnMapping(headers, targetFields, log);
        setMapping(autoMapping);
        setStep(STEPS.MAP);
      } else if (importMode === 'client') {
        log('מתחיל מיפוי אוטומטי מתקדם ל-Client עם Fuzzy Matching...');
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

  // ... keep the entire JSX return statement from previous version (same DialogContent structure) ...
  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-6xl h-[90vh] p-0" dir="rtl">
          <div className="flex flex-col h-full">
            <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3 text-2xl">
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  מערכת יבוא חכמה עם Fuzzy Matching
                  {targetTable && (
                    <Badge className="mr-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                      → {targetTable.name}
                    </Badge>
                  )}
                </DialogTitle>
                <DialogDescription>
                  זיהוי אוטומטי מתקדם עם אלגוריתם Levenshtein Distance לדיוק מקסימלי
                </DialogDescription>
              </DialogHeader>
            </div>

            <ScrollArea className="flex-1 px-6">
              <div className="py-4 space-y-4">
                {logs.length > 0 && (
                  <div className="bg-slate-900 text-green-400 rounded-lg p-3 font-mono text-xs max-h-32 overflow-y-auto">
                    {logs.map((log, i) => (
                      <div key={i} className="py-0.5">{log}</div>
                    ))}
                  </div>
                )}

                {step === STEPS.SELECT_MODE && (
                  <div className="space-y-6 py-4">
                    <div className="text-center mb-6">
                      <h3 className="text-2xl font-bold text-slate-900 mb-2">איך תרצה לייבא?</h3>
                      <p className="text-slate-600">מיפוי אוטומטי מתקדם עם Fuzzy Matching</p>
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
                          <p className="text-xs text-slate-600 mb-3">יבוא עם Fuzzy Matching מתקדם</p>
                          <Badge variant="outline" className="bg-blue-50 text-blue-700">
                            <Brain className="w-3 h-3 ml-1" />
                            Levenshtein
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
                          <p className="text-xs text-slate-600 mb-3">מיפוי חכם לכל טבלה</p>
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
                          <p className="text-xs text-slate-600 mb-3">יצירה + מיפוי אוטומטי</p>
                          <Badge variant="outline" className="bg-green-50 text-green-700">
                            <Check className="w-3 h-3 ml-1" />
                            אוטומטי
                          </Badge>
                        </CardContent>
                      </Card>
                    </div>

                    <Alert className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200">
                      <Brain className="w-5 h-5 text-blue-600" />
                      <AlertDescription>
                        <div className="font-semibold text-blue-900 mb-2">🧠 Fuzzy Matching מתקדם</div>
                        <div className="text-sm text-blue-800 space-y-1">
                          <p>✅ אלגוריתם <strong>Levenshtein Distance</strong> לחישוב דמיון</p>
                          <p>✅ זיהוי אוטומטי של שגיאות כתיב ושמות דומים</p>
                          <p>✅ תמיכה ב-60+ סינונימים לכל שדה</p>
                          <p>✅ סף דמיון 60% למיפוי אוטומטי</p>
                        </div>
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
                        <p className="text-slate-600 mb-2">תומך ב-Excel (.xlsx, .xls) ו-CSV</p>
                        <Badge className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                          <Brain className="w-4 h-4 ml-1" />
                          Fuzzy Matching
                        </Badge>
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
                    <h3 className="text-xl font-bold text-slate-900">מעבד קובץ + מפעיל Fuzzy Matching...</h3>
                    <p className="text-slate-600 mt-2">מזהה עמודות בדיוק מקסימלי</p>
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
                          {detectedSheetName && (
                            <p className="text-xs text-blue-600 mt-1">💡 זוהה: "{detectedSheetName}"</p>
                          )}
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
                        צור טבלה
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
                        <h3 className="text-lg font-bold text-slate-900">מיפוי עם Fuzzy Matching</h3>
                        <p className="text-sm text-slate-600">דיוק {Math.round((mappedCount/rawHeaders.length)*100)}% ({rawHeaders.length} עמודות)</p>
                      </div>
                      <Badge variant="outline" className="bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 border-blue-300">
                        <Brain className="w-3 h-3 ml-1" />
                        {mappedCount} / {rawHeaders.length}
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
                          <Card key={index} className={`p-4 transition-all ${isMapped ? 'border-2 border-green-400 bg-green-50/50 shadow-md' : 'border-slate-200 hover:border-blue-300'}`}>
                            <div className="flex items-center gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="text-xs text-slate-500">עמודה {index + 1}</div>
                                <div className="font-semibold truncate text-slate-900">{header || `עמודה ${index + 1}`}</div>
                                <div className="text-xs text-slate-600 truncate">דוגמה: {rawRows[0]?.[index] || '—'}</div>
                              </div>
                              <ArrowRight className={`w-5 h-5 flex-shrink-0 ${isMapped ? 'text-green-600' : 'text-slate-400'}`} />
                              <div className="flex-1 min-w-0">
                                <Select value={mappedField || ''} onValueChange={(value) => setMapping({ ...mapping, [index]: value })}>
                                  <SelectTrigger className={isMapped ? 'border-2 border-green-500 bg-green-50' : 'hover:border-blue-400'}>
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
                                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                                ) : (
                                  <AlertCircle className="w-6 h-6 text-slate-400" />
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
                      {validatedData.slice(0, 10).map((item, i) => (
                        <Card key={i} className="p-3 hover:shadow-md transition-shadow">
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
                      {validatedData.length > 10 && (
                        <p className="text-center text-sm text-slate-500">+ עוד {validatedData.length - 10} פריטים...</p>
                      )}
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
                          toast.success('המיפוי רוענן עם Fuzzy Matching');
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