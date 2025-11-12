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
  Brain,
  XCircle,
  CheckSquare,
  Square,
  Info
} from 'lucide-react';
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import TableManager from './TableManager';

// ... keep CLIENT_SCHEMA with synonyms ...

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

// פונקציות validation
const validateEmail = (email) => {
  if (!email) return true; // אימייל לא חובה
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePhone = (phone) => {
  if (!phone) return true; // טלפון לא חובה
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  return cleanPhone.length >= 9 && cleanPhone.length <= 15;
};

const validateUrl = (url) => {
  if (!url) return true;
  try {
    const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
    return urlPattern.test(url);
  } catch {
    return false;
  }
};

// תיקוף שורה לפי סכמה
const validateRow = (rowData, schema, importMode) => {
  const errors = [];
  const warnings = [];

  if (importMode === 'client') {
    // בדיקת שדות חובה
    if (!rowData.name || rowData.name.trim() === '') {
      errors.push('שדה "שם לקוח" חובה');
    }

    // בדיקת פורמט אימייל
    if (rowData.email && !validateEmail(rowData.email)) {
      errors.push(`אימייל לא תקין: "${rowData.email}"`);
    }

    // בדיקת פורמט טלפון
    if (rowData.phone && !validatePhone(rowData.phone)) {
      warnings.push(`טלפון אולי לא תקין: "${rowData.phone}"`);
    }

    if (rowData.phone_secondary && !validatePhone(rowData.phone_secondary)) {
      warnings.push(`טלפון משני אולי לא תקין: "${rowData.phone_secondary}"`);
    }

    // בדיקת URL
    if (rowData.website && !validateUrl(rowData.website)) {
      warnings.push(`כתובת אתר אולי לא תקינה: "${rowData.website}"`);
    }

    // בדיקה אם אין כלל מידע ליצור קשר
    if (!rowData.phone && !rowData.email && !rowData.whatsapp) {
      warnings.push('אין פרטי התקשרות (טלפון/אימייל/וואטסאפ)');
    }
  }

  return { errors, warnings, isValid: errors.length === 0 };
};

// ... keep levenshteinDistance, calculateSimilarity, normalizeString, smartColumnMapping ...

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
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[len1][len2];
};

const calculateSimilarity = (str1, str2) => {
  const distance = levenshteinDistance(str1, str2);
  const maxLen = Math.max(str1.length, str2.length);
  if (maxLen === 0) return 100;
  return Math.round(((maxLen - distance) / maxLen) * 100);
};

const normalizeString = (str) => {
  return (str || '')
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ');
};

const smartColumnMapping = (fileHeaders, targetFields, logFunction = console.log) => {
  const mapping = {};
  const SIMILARITY_THRESHOLD = 60;
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
      const fieldInfo = CLIENT_SCHEMA[targetFieldKey] || { 
        label: targetFieldKey, 
        synonyms: [targetFieldKey] 
      };
      const synonyms = fieldInfo.synonyms || [targetFieldKey, fieldInfo.label];
      const normalizedFieldKey = normalizeString(targetFieldKey);
      const normalizedFieldLabel = normalizeString(fieldInfo.label);
      if (normalizedHeader === normalizedFieldKey || normalizedHeader === normalizedFieldLabel) {
        if (100 > bestScore) {
          bestMatch = targetFieldKey;
          bestScore = 100;
          bestReason = `Perfect match: "${header}" === "${fieldInfo.label}"`;
          logFunction(`  ✅ ${bestReason}`);
        }
        return;
      }
      synonyms.forEach(synonym => {
        const normalizedSynonym = normalizeString(synonym);
        if (normalizedHeader === normalizedSynonym) {
          if (95 > bestScore) {
            bestMatch = targetFieldKey;
            bestScore = 95;
            bestReason = `Exact synonym match: "${header}" === "${synonym}"`;
            logFunction(`  ✅ ${bestReason}`);
          }
          return;
        }
        const similarity = calculateSimilarity(normalizedHeader, normalizedSynonym);
        if (similarity >= SIMILARITY_THRESHOLD) {
          const score = similarity;
          if (score > bestScore) {
            bestMatch = targetFieldKey;
            bestScore = score;
            bestReason = `Fuzzy match: "${header}" ≈ "${synonym}" (${similarity}% similar)`;
            logFunction(`  🎯 ${bestReason}`);
          }
        }
      });
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
  
  // NEW: State for preview and validation
  const [previewRows, setPreviewRows] = useState([]);
  const [skippedRows, setSkippedRows] = useState(new Set());
  const [rowValidations, setRowValidations] = useState({});
  const [editingMapping, setEditingMapping] = useState(null);

  // ... keep log, parseCSV, parseExcel, handleFileSelect, handleTableSelected, createNewTable ...

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

  // NEW: Enhanced preview with validation
  const handlePreview = () => {
    log('מכין תצוגה מקדימה עם תיקוף...');
    
    const mappedFields = Object.values(mapping).filter(v => v && v !== 'skip');
    if (mappedFields.length === 0) {
      toast.error('יש למפות לפחות שדה אחד');
      return;
    }
    
    if (importMode === 'client' && !mappedFields.includes('name')) {
      toast.error('חובה למפות לפחות את שדה "שם לקוח"');
      return;
    }

    // בניית תצוגה מקדימה עם validation
    const preview = [];
    const validations = {};
    let errorCount = 0;
    let warningCount = 0;

    // לוקחים את 20 השורות הראשונות לתצוגה מקדימה
    const rowsToPreview = rawRows.slice(0, 20);

    rowsToPreview.forEach((row, rowIndex) => {
      const actualRowNumber = rowIndex + 2; // +2 כי שורה 1 = כותרות
      const item = { _rowNumber: actualRowNumber, _originalIndex: rowIndex };

      // מיפוי הנתונים
      rawHeaders.forEach((header, colIndex) => {
        const targetField = mapping[colIndex];
        if (targetField && targetField !== 'skip') {
          const value = row[colIndex]?.trim() || '';
          item[targetField] = value;
        }
      });

      // תיקוף השורה
      const validation = validateRow(item, CLIENT_SCHEMA, importMode);
      validations[actualRowNumber] = validation;

      if (validation.errors.length > 0) errorCount++;
      if (validation.warnings.length > 0) warningCount++;

      preview.push(item);
    });

    log(`תצוגה מקדימה: ${preview.length} שורות, ${errorCount} שגיאות, ${warningCount} אזהרות`, 
      errorCount > 0 ? 'warning' : 'success');

    setPreviewRows(preview);
    setRowValidations(validations);
    setSkippedRows(new Set()); // איפוס דילוגים
    setStep(STEPS.VALIDATE);
  };

  // NEW: Toggle skip row
  const toggleSkipRow = (rowNumber) => {
    setSkippedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(rowNumber)) {
        newSet.delete(rowNumber);
      } else {
        newSet.add(rowNumber);
      }
      return newSet;
    });
  };

  // NEW: Quick fix mapping
  const quickFixMapping = (columnIndex, newFieldValue) => {
    setMapping(prev => ({ ...prev, [columnIndex]: newFieldValue }));
    toast.success('המיפוי עודכן - לחץ "רענן תצוגה" לראות שינויים');
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
      const dataToImport = rawRows
        .map((row, rowIdx) => {
          const actualRowNumber = rowIdx + 2;
          
          // דילוג על שורות שסומנו
          if (skippedRows.has(actualRowNumber)) {
            log(`דילוג על שורה ${actualRowNumber} (סומנה לדילוג)`);
            return null;
          }

          const item = {};
          rawHeaders.forEach((header, colIndex) => {
            const targetField = mapping[colIndex];
            if (targetField && targetField !== 'skip') {
              item[targetField] = row[colIndex] || '';
            }
          });
          return { ...item, _originalRowNumber: actualRowNumber };
        })
        .filter(item => item && Object.keys(item).some(key => key !== '_originalRowNumber' && item[key]));

      if (dataToImport.length === 0) {
        throw new Error('אין נתונים לייבוא. כל השורות דולגו או ריקות.');
      }

      log(`מייבא ${dataToImport.length} שורות (${skippedRows.size} דולגו)`);

      if (importMode === 'client') {
        for (let i = 0; i < dataToImport.length; i++) {
          const clientData = { ...dataToImport[i] };
          const originalRowNumber = clientData._originalRowNumber;
          delete clientData._originalRowNumber;
          
          try {
            if (!clientData.name || clientData.name.trim() === '') {
              throw new Error('שם לקוח חסר');
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
            log(`שגיאה בשורה ${originalRowNumber}: ${error.message}`, 'error');
          }
          setImportProgress(Math.round(((i + 1) / dataToImport.length) * 100));
        }
      } else {
        if (!targetTable || !targetTable.id) {
          throw new Error('שגיאה: טבלת יעד לא הוגדרה.');
        }
        const newRows = dataToImport.map((item, i) => {
          const row = { id: `row_${Date.now()}_${i}` };
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
        log(`יובאו ${successCount} שורות`, 'success');
        setImportProgress(100);
      }
      
      log(`יבוא הושלם! ${successCount} הצליחו, ${failedCount} נכשלו, ${skippedRows.size} דולגו`, 'success');
      
      setImportResults({
        total: dataToImport.length,
        success: successCount,
        failed: failedCount,
        skipped: skippedRows.size,
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
        skipped: skippedRows.size,
        failedRows: [{ row: 'כללי', name: 'N/A', error: error.message }]
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
    setPreviewRows([]);
    setSkippedRows(new Set());
    setRowValidations({});
    setEditingMapping(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const mappedCount = Object.values(mapping).filter(v => v && v !== 'skip').length;
  const hasRequiredFields = importMode === 'client'
    ? Object.values(mapping).includes('name')
    : mappedCount > 0;

  // סטטיסטיקות validation
  const validationStats = {
    total: Object.keys(rowValidations).length,
    errors: Object.values(rowValidations).filter(v => v.errors.length > 0).length,
    warnings: Object.values(rowValidations).filter(v => v.warnings.length > 0).length,
    valid: Object.values(rowValidations).filter(v => v.isValid).length
  };

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
                  זיהוי אוטומטי מתקדם עם אלגוריתם Levenshtein + תיקוף נתונים
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

                {/* ... keep all SELECT_MODE, UPLOAD, PARSE, NAME_TABLE, CREATE_TABLE steps ... */}

                {step === STEPS.SELECT_MODE && (
                  <div className="space-y-6 py-4">
                    <div className="text-center mb-6">
                      <h3 className="text-2xl font-bold text-slate-900 mb-2">איך תרצה לייבא?</h3>
                      <p className="text-slate-600">מיפוי אוטומטי מתקדם עם Fuzzy Matching</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card className="cursor-pointer hover:shadow-xl transition-all border-2 hover:border-blue-400" onClick={() => {
                        setImportMode('client');
                        setTargetTable({ id: 'clients', name: 'לקוחות (Client)', type: 'entity', entity: 'Client' });
                        setStep(STEPS.UPLOAD);
                      }}>
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
                      <Card className="cursor-pointer hover:shadow-xl transition-all border-2 hover:border-purple-400" onClick={() => {
                        setImportMode('existing_table');
                        setShowTableSelector(true);
                      }}>
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
                      <Card className="cursor-pointer hover:shadow-xl transition-all border-2 hover:border-green-400" onClick={() => {
                        setImportMode('new_table');
                        setStep(STEPS.UPLOAD);
                      }}>
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
                        <div className="font-semibold text-blue-900 mb-2">🧠 Fuzzy Matching + תיקוף</div>
                        <div className="text-sm text-blue-800 space-y-1">
                          <p>✅ אלגוריתם Levenshtein Distance לדיוק מקסימלי</p>
                          <p>✅ תיקוף אוטומטי של email, טלפון, URL</p>
                          <p>✅ תצוגה מקדימה עם סימון בעיות</p>
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
                        <h3 className="text-2xl font-bold text-slate-900 mb-2">העלה קובץ</h3>
                        <p className="text-slate-600 mb-2">Excel או CSV</p>
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
                    <h3 className="text-xl font-bold text-slate-900">מעבד + מזהה עמודות...</h3>
                  </div>
                )}

                {step === STEPS.NAME_TABLE && (
                  <div className="space-y-6">
                    <div className="text-center mb-6">
                      <TableIcon className="w-16 h-16 mx-auto mb-4 text-green-600" />
                      <h3 className="text-2xl font-bold text-slate-900 mb-2">שם לטבלה</h3>
                      <p className="text-slate-600">{rawHeaders.length} עמודות</p>
                    </div>
                    <Card className="p-6">
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-semibold mb-2 block">שם הטבלה *</label>
                          <Input value={newTableName} onChange={(e) => setNewTableName(e.target.value)} placeholder="לצורך הפקדה" />
                        </div>
                        <div>
                          <label className="text-sm font-semibold mb-2 block">תיאור</label>
                          <Textarea value={newTableDescription} onChange={(e) => setNewTableDescription(e.target.value)} rows={2} />
                        </div>
                      </div>
                    </Card>
                    <div className="flex gap-3">
                      <Button variant="outline" onClick={() => setStep(STEPS.UPLOAD)}>חזור</Button>
                      <Button onClick={createNewTable} disabled={!newTableName.trim()} className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600">
                        <Sparkles className="w-4 h-4 ml-2" />
                        צור
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
                        <h3 className="text-lg font-bold text-slate-900">מיפוי Fuzzy Matching</h3>
                        <p className="text-sm text-slate-600">דיוק {Math.round((mappedCount/rawHeaders.length)*100)}%</p>
                      </div>
                      <Badge variant="outline" className="bg-gradient-to-r from-blue-100 to-purple-100 border-blue-300">
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
                          <Card key={index} className={`p-4 ${isMapped ? 'border-2 border-green-400 bg-green-50/50' : 'hover:border-blue-300'}`}>
                            <div className="flex items-center gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="text-xs text-slate-500">עמודה {index + 1}</div>
                                <div className="font-semibold truncate">{header || `עמודה ${index + 1}`}</div>
                                <div className="text-xs text-slate-600 truncate">דוגמה: {rawRows[0]?.[index] || '—'}</div>
                              </div>
                              <ArrowRight className={`w-5 h-5 flex-shrink-0 ${isMapped ? 'text-green-600' : 'text-slate-400'}`} />
                              <div className="flex-1 min-w-0">
                                <Select value={mappedField || ''} onValueChange={(value) => setMapping({ ...mapping, [index]: value })}>
                                  <SelectTrigger className={isMapped ? 'border-2 border-green-500' : ''}>
                                    <SelectValue placeholder="בחר..." />
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
                                {isMapped ? <CheckCircle2 className="w-6 h-6 text-green-600" /> : <AlertCircle className="w-6 h-6 text-slate-400" />}
                              </div>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ENHANCED VALIDATION STEP */}
                {step === STEPS.VALIDATE && (
                  <div className="space-y-4 pb-20">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">תצוגה מקדימה ותיקוף</h3>
                        <p className="text-sm text-slate-600">מציג {previewRows.length} שורות ראשונות • סך הכל {rawRows.length} שורות</p>
                      </div>
                      <div className="flex gap-2">
                        <Badge className="bg-green-100 text-green-700 border-green-300">
                          <CheckCircle2 className="w-3 h-3 ml-1" />
                          {validationStats.valid} תקינות
                        </Badge>
                        {validationStats.warnings > 0 && (
                          <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300">
                            <AlertTriangle className="w-3 h-3 ml-1" />
                            {validationStats.warnings} אזהרות
                          </Badge>
                        )}
                        {validationStats.errors > 0 && (
                          <Badge className="bg-red-100 text-red-700 border-red-300">
                            <XCircle className="w-3 h-3 ml-1" />
                            {validationStats.errors} שגיאות
                          </Badge>
                        )}
                        {skippedRows.size > 0 && (
                          <Badge className="bg-slate-100 text-slate-700">
                            <X className="w-3 h-3 ml-1" />
                            {skippedRows.size} דולגים
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Validation Summary */}
                    {(validationStats.errors > 0 || validationStats.warnings > 0) && (
                      <Alert className={validationStats.errors > 0 ? "bg-red-50 border-red-200" : "bg-yellow-50 border-yellow-200"}>
                        <AlertTriangle className={`w-5 h-5 ${validationStats.errors > 0 ? 'text-red-600' : 'text-yellow-600'}`} />
                        <AlertDescription>
                          <div className="font-semibold mb-2">
                            {validationStats.errors > 0 ? `⚠️ נמצאו ${validationStats.errors} שורות עם שגיאות` : `💡 ${validationStats.warnings} אזהרות`}
                          </div>
                          <p className="text-sm">
                            {validationStats.errors > 0 
                              ? 'שורות עם שגיאות יכשלו ביבוא. מומלץ לתקן את המיפוי או לדלג עליהן.'
                              : 'אזהרות לא ימנעו יבוא, אך מומלץ לבדוק את הנתונים.'
                            }
                          </p>
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Preview Rows */}
                    <div className="space-y-3">
                      {previewRows.map((item) => {
                        const rowNumber = item._rowNumber;
                        const validation = rowValidations[rowNumber] || { errors: [], warnings: [], isValid: true };
                        const isSkipped = skippedRows.has(rowNumber);
                        const hasIssues = validation.errors.length > 0 || validation.warnings.length > 0;

                        return (
                          <Card 
                            key={rowNumber}
                            className={`
                              transition-all
                              ${isSkipped ? 'opacity-50 bg-slate-100 border-slate-300' : ''}
                              ${!isSkipped && validation.errors.length > 0 ? 'border-2 border-red-300 bg-red-50/30' : ''}
                              ${!isSkipped && validation.errors.length === 0 && validation.warnings.length > 0 ? 'border-2 border-yellow-300 bg-yellow-50/30' : ''}
                              ${!isSkipped && !hasIssues ? 'border-green-200 bg-green-50/20' : ''}
                            `}
                          >
                            <CardContent className="p-4">
                              {/* Row Header */}
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                  <button
                                    onClick={() => toggleSkipRow(rowNumber)}
                                    className="flex-shrink-0 hover:scale-110 transition-transform"
                                  >
                                    {isSkipped ? (
                                      <XCircle className="w-5 h-5 text-slate-500" />
                                    ) : validation.errors.length > 0 ? (
                                      <Square className="w-5 h-5 text-red-500" />
                                    ) : (
                                      <CheckSquare className="w-5 h-5 text-green-600" />
                                    )}
                                  </button>
                                  <div>
                                    <div className="font-bold text-slate-900">
                                      שורה {rowNumber} {isSkipped && <span className="text-slate-500">(דולג)</span>}
                                    </div>
                                    {importMode === 'client' && item.name && (
                                      <div className="text-sm text-slate-600">{item.name}</div>
                                    )}
                                  </div>
                                </div>

                                {/* Status Icons */}
                                <div className="flex gap-2">
                                  {validation.errors.length > 0 && (
                                    <Badge className="bg-red-100 text-red-700 gap-1">
                                      <XCircle className="w-3 h-3" />
                                      {validation.errors.length} שגיאות
                                    </Badge>
                                  )}
                                  {validation.warnings.length > 0 && (
                                    <Badge className="bg-yellow-100 text-yellow-700 gap-1">
                                      <AlertTriangle className="w-3 h-3" />
                                      {validation.warnings.length} אזהרות
                                    </Badge>
                                  )}
                                  {!hasIssues && !isSkipped && (
                                    <Badge className="bg-green-100 text-green-700 gap-1">
                                      <CheckCircle2 className="w-3 h-3" />
                                      תקין
                                    </Badge>
                                  )}
                                </div>
                              </div>

                              {/* Data Preview */}
                              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm mb-3">
                                {Object.entries(item)
                                  .filter(([k]) => k !== '_rowNumber' && k !== '_originalIndex')
                                  .map(([key, value]) => {
                                    const fieldInfo = importMode === 'client' ? CLIENT_SCHEMA[key] : null;
                                    const isRequired = fieldInfo?.required;
                                    const isEmpty = !value || value.trim() === '';
                                    const hasError = isRequired && isEmpty;

                                    return (
                                      <div key={key} className="flex gap-2">
                                        <strong className={`text-slate-700 min-w-[100px] ${isRequired ? 'after:content-["*"] after:text-red-500' : ''}`}>
                                          {importMode === 'client' ? CLIENT_SCHEMA[key]?.label : key}:
                                        </strong>
                                        <span className={`${hasError ? 'text-red-600 font-semibold' : 'text-slate-900'} truncate`}>
                                          {value || <span className="text-slate-400 italic">ריק</span>}
                                        </span>
                                      </div>
                                    );
                                  })
                                }
                              </div>

                              {/* Issues List */}
                              {hasIssues && !isSkipped && (
                                <div className="space-y-2 pt-3 border-t">
                                  {validation.errors.map((error, i) => (
                                    <div key={`err-${i}`} className="flex items-start gap-2 text-sm text-red-700 bg-red-50 p-2 rounded">
                                      <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                      <span>{error}</span>
                                    </div>
                                  ))}
                                  {validation.warnings.map((warning, i) => (
                                    <div key={`warn-${i}`} className="flex items-start gap-2 text-sm text-yellow-700 bg-yellow-50 p-2 rounded">
                                      <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                      <span>{warning}</span>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Quick Actions */}
                              {hasIssues && !isSkipped && (
                                <div className="flex gap-2 mt-3 pt-3 border-t">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => toggleSkipRow(rowNumber)}
                                    className="gap-2"
                                  >
                                    <X className="w-3 h-3" />
                                    דלג על שורה
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setStep(STEPS.MAP)}
                                    className="gap-2"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                    תקן מיפוי
                                  </Button>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}

                      {/* Show remaining rows count */}
                      {rawRows.length > 20 && (
                        <Card className="bg-blue-50 border-blue-200">
                          <CardContent className="p-4 text-center">
                            <Info className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                            <div className="font-semibold text-blue-900">
                              + עוד {rawRows.length - 20} שורות נוספות
                            </div>
                            <p className="text-sm text-blue-700 mt-1">
                              כל השורות יעברו תיקוף זהה לפני היבוא
                            </p>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </div>
                )}

                {step === STEPS.IMPORT && (
                  <div className="text-center py-12">
                    <Zap className="w-16 h-16 mx-auto mb-4 text-blue-600 animate-pulse" />
                    <h3 className="text-2xl font-bold text-slate-900 mb-4">מייבא...</h3>
                    <Progress value={importProgress} className="w-full max-w-md mx-auto h-4" />
                    <p className="text-slate-600 mt-2">{importProgress}%</p>
                    {skippedRows.size > 0 && (
                      <p className="text-sm text-slate-500 mt-2">מדלג על {skippedRows.size} שורות</p>
                    )}
                  </div>
                )}

                {step === STEPS.COMPLETE && importResults && (
                  <div className="text-center py-12">
                    <CheckCircle2 className="w-24 h-24 mx-auto mb-6 text-green-600" />
                    <h3 className="text-3xl font-bold text-slate-900 mb-4">🎉 היבוא הושלם!</h3>
                    
                    <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto">
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
                      {importResults.skipped > 0 && (
                        <Card className="bg-slate-50 border-slate-200">
                          <CardContent className="p-6 text-center">
                            <div className="text-4xl font-bold text-slate-600">{importResults.skipped}</div>
                            <div className="text-sm text-slate-700">דולגו</div>
                          </CardContent>
                        </Card>
                      )}
                    </div>

                    {importResults.failedRows?.length > 0 && (
                      <Card className="bg-red-50 border-red-200 max-w-2xl mx-auto mt-6">
                        <CardHeader>
                          <CardTitle className="text-sm text-red-900">שורות שנכשלו:</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="max-h-32 overflow-y-auto text-xs text-red-800 space-y-1 text-right">
                            {importResults.failedRows.map((err, i) => (
                              <div key={i}>שורה {err.row}: {err.error}</div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

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
                        תצוגה מקדימה + תיקוף
                      </Button>
                    </>
                  )}
                  {step === STEPS.VALIDATE && (
                    <>
                      <Button variant="outline" onClick={() => setStep(STEPS.MAP)}>
                        ← חזור למיפוי
                      </Button>
                      <Button
                        onClick={handlePreview}
                        variant="outline"
                        className="gap-2"
                      >
                        <RefreshCw className="w-4 h-4" />
                        רענן תצוגה
                      </Button>
                      <Button 
                        onClick={executeImport} 
                        disabled={validationStats.valid === 0 && validationStats.errors > 0}
                        className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600"
                      >
                        <Zap className="w-4 h-4 ml-2" />
                        ייבא {rawRows.length - skippedRows.size} שורות
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