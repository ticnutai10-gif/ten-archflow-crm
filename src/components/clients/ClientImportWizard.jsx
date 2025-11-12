import React, { useState, useCallback, useEffect } from 'react';
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
  Upload, FileSpreadsheet, Sparkles, Check, X, AlertTriangle, ArrowRight, Eye, Loader2,
  CheckCircle2, Terminal, Wand2, FileText, Database, Zap, Table as TableIcon, AlertCircle,
  RefreshCw, Brain, XCircle, CheckSquare, Square, Info, Layers, Edit2, Plus
} from 'lucide-react';
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import TableManager from './TableManager';

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

// Helper: Fuzzy match columns
const fuzzyMatch = (str1, str2) => {
  if (!str1 || !str2) return 0;
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  if (s1 === s2) return 100;
  if (s1.includes(s2) || s2.includes(s1)) return 80;
  const words1 = s1.split(/\s+/);
  const words2 = s2.split(/\s+/);
  const commonWords = words1.filter(w => words2.includes(w)).length;
  if (commonWords > 0) return (commonWords / Math.max(words1.length, words2.length)) * 60;
  return 0;
};

// Helper: Auto-map columns
const autoMapColumns = (headers, schema) => {
  const mapping = {};
  
  headers.forEach((header, index) => {
    if (!header) return;
    
    let bestMatch = null;
    let bestScore = 0;
    
    Object.entries(schema).forEach(([field, config]) => {
      const synonyms = config.synonyms || [];
      synonyms.forEach(synonym => {
        const score = fuzzyMatch(header, synonym);
        if (score > bestScore && score >= 60) {
          bestScore = score;
          bestMatch = field;
        }
      });
    });
    
    if (bestMatch) {
      mapping[index] = bestMatch;
    } else {
      mapping[index] = header; // Use header as default
    }
  });
  
  return mapping;
};

// Helper: Parse CSV
const parseCSV = (text) => {
  const lines = text.split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];
  
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

// Helper: Parse Excel
const parseExcelFile = async (file) => {
  try {
    const uploadResult = await base44.integrations.Core.UploadFile({ file });
    const response = await base44.functions.invoke('parseSpreadsheet', { 
      file_url: uploadResult.file_url 
    });
    
    if (response?.data?.status !== 'success') {
      throw new Error(response?.data?.error || 'שגיאה בעיבוד הקובץ');
    }
    
    const headers = response.data.headers || [];
    const dataRows = response.data.rows.map(rowObj => 
      headers.map(header => {
        const value = rowObj[header];
        return value !== undefined && value !== null ? String(value) : '';
      })
    );
    
    return [headers, ...dataRows];
  } catch (error) {
    throw error;
  }
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
  const [previewRows, setPreviewRows] = useState([]);
  const [skippedRows, setSkippedRows] = useState(new Set());
  const [rowValidations, setRowValidations] = useState({});
  const [tableStructure, setTableStructure] = useState(null);
  const [editingHeaders, setEditingHeaders] = useState({});

  // 🐕 DEBUG: Track component lifecycle
  useEffect(() => {
    console.log('🐕🐕🐕 [LIFECYCLE] ClientImportWizard MOUNTED');
    return () => {
      console.log('🐕🐕🐕 [LIFECYCLE] ClientImportWizard UNMOUNTED');
    };
  }, []);

  // 🐕 DEBUG: Track step changes
  useEffect(() => {
    console.log('🐕🐕🐕 [STEP-CHANGE] Step changed to:', step, 'Step name:', Object.keys(STEPS).find(k => STEPS[k] === step));
  }, [step]);

  // 🐕 DEBUG: Track targetTable changes
  useEffect(() => {
    console.log('🐕🐕🐕 [TARGET-TABLE-CHANGE] targetTable updated:', JSON.stringify(targetTable, null, 2));
  }, [targetTable]);

  // 🐕 DEBUG: Track validatedData changes
  useEffect(() => {
    console.log('🐕🐕🐕 [VALIDATED-DATA-CHANGE] validatedData length:', validatedData.length);
    if (validatedData.length > 0) {
      console.log('🐕🐕🐕 [VALIDATED-DATA-CHANGE] First item:', JSON.stringify(validatedData[0], null, 2));
    }
  }, [validatedData]);

  const log = useCallback((message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString('he-IL');
    const icon = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'warning' ? '⚠️' : 'ℹ️';
    const logMessage = `[${timestamp}] ${icon} ${message}`;
    setLogs(prev => [...prev, logMessage]);
    console.log(`🐕🐕🐕 [LOG] ${logMessage}`);
  }, []);

  const updateHeaderName = (index, newName) => {
    console.log('🐕🐕🐕 [UPDATE-HEADER] Index:', index, 'New name:', newName);
    setRawHeaders(prev => {
      const updated = [...prev];
      updated[index] = newName;
      console.log('🐕🐕🐕 [UPDATE-HEADER] Updated headers:', updated);
      return updated;
    });
    setEditingHeaders(prev => {
      const updated = { ...prev };
      delete updated[index];
      return updated;
    });
    toast.success('שם הכותרת עודכן');
  };

  const handleFileSelect = async (e) => {
    console.log('🐕🐕🐕 [FILE-SELECT] Function called');
    const uploadedFile = e.target.files?.[0];
    console.log('🐕🐕🐕 [FILE-SELECT] File:', uploadedFile?.name);
    
    if (!uploadedFile) {
      console.log('🐕🐕🐕 [FILE-SELECT] No file selected, returning');
      return;
    }

    setFile(uploadedFile);
    setLogs([]);
    log(`קובץ נבחר: ${uploadedFile.name}`);
    
    console.log('🐕🐕🐕 [FILE-SELECT] Moving to PARSE step');
    setStep(STEPS.PARSE);
    setIsProcessing(true);

    try {
      let parsedData;
      
      if (uploadedFile.name.toLowerCase().endsWith('.csv')) {
        console.log('🐕🐕🐕 [FILE-SELECT] Parsing as CSV');
        log('מפרסר CSV...');
        const text = await uploadedFile.text();
        parsedData = parseCSV(text);
      } else {
        console.log('🐕🐕🐕 [FILE-SELECT] Parsing as Excel');
        log('מפרסר Excel...');
        parsedData = await parseExcelFile(uploadedFile);
      }

      console.log('🐕🐕🐕 [FILE-SELECT] Parsed data rows:', parsedData?.length);

      if (!parsedData || parsedData.length === 0) {
        throw new Error('הקובץ ריק או לא תקין');
      }

      const headerRow = parsedData[0];
      const dataRows = parsedData.slice(1).filter(row => 
        row && Array.isArray(row) && row.some(cell => cell !== null && cell !== undefined && cell !== '')
      );
      
      console.log('🐕🐕🐕 [FILE-SELECT] Header row:', headerRow);
      console.log('🐕🐕🐕 [FILE-SELECT] Data rows count:', dataRows.length);
      
      if (dataRows.length === 0) {
        throw new Error('לא נמצאו שורות נתונים בקובץ');
      }

      const headersArray = headerRow.map(h => String(h || ''));
      setRawHeaders(headersArray);
      setRawRows(dataRows);
      
      log(`✅ נמצאו ${headersArray.length} עמודות ו-${dataRows.length} שורות נתונים`);
      
      const schema = importMode === 'client' ? CLIENT_SCHEMA : 
        (targetTable?.columns || []).reduce((acc, col) => {
          acc[col.key] = { label: col.title, synonyms: [col.title, col.key] };
          return acc;
        }, {});
      
      const autoMapping = autoMapColumns(headersArray, schema);
      console.log('🐕🐕🐕 [FILE-SELECT] Auto mapping:', autoMapping);
      setMapping(autoMapping);
      
      console.log('🐕🐕🐕 [FILE-SELECT] Moving to MAP step');
      setStep(STEPS.MAP);
    } catch (err) {
      console.error('🐕🐕🐕 [FILE-SELECT] ERROR:', err);
      log(`שגיאה: ${err.message}`, 'error');
      toast.error('שגיאה בקריאת הקובץ: ' + err.message);
    } finally {
      setIsProcessing(false);
      console.log('🐕🐕🐕 [FILE-SELECT] Function completed');
    }
  };

  const handleValidate = () => {
    console.log('🐕🐕🐕 [VALIDATE] Function called');
    log('מתחיל ולידציה...');
    setStep(STEPS.VALIDATE);
    setIsProcessing(true);

    try {
      const validated = [];
      const errors = [];
      const validations = {};

      console.log('🐕🐕🐕 [VALIDATE] Processing', rawRows.length, 'rows');
      console.log('🐕🐕🐕 [VALIDATE] Current mapping:', mapping);

      rawRows.forEach((row, rowIndex) => {
        const mappedRow = {};
        const rowErrors = [];
        
        rawHeaders.forEach((header, colIndex) => {
          const fieldKey = mapping[colIndex];
          
          if (!fieldKey || fieldKey === 'skip') return;
          
          const value = row[colIndex];
          mappedRow[fieldKey] = value || '';
          
          if (importMode === 'client') {
            const fieldConfig = CLIENT_SCHEMA[fieldKey];
            if (fieldConfig?.required && !value) {
              rowErrors.push(`חסר ${fieldConfig.label}`);
            }
          }
        });
        
        if (rowErrors.length > 0) {
          errors.push({ row: rowIndex + 1, errors: rowErrors });
          validations[rowIndex] = { status: 'error', errors: rowErrors };
        } else {
          validations[rowIndex] = { status: 'valid' };
        }
        
        validated.push(mappedRow);
      });

      console.log('🐕🐕🐕 [VALIDATE] Validated rows:', validated.length);
      console.log('🐕🐕🐕 [VALIDATE] First validated row:', JSON.stringify(validated[0], null, 2));
      console.log('🐕🐕🐕 [VALIDATE] Errors:', errors.length);

      setValidatedData(validated);
      setValidationErrors(errors);
      setRowValidations(validations);
      
      log(`✅ ולידציה הושלמה: ${validated.length - errors.length}/${validated.length} תקינות`);
      setPreviewRows(validated.slice(0, 10));
    } catch (err) {
      console.error('🐕🐕🐕 [VALIDATE] ERROR:', err);
      log(`שגיאה בולידציה: ${err.message}`, 'error');
    } finally {
      setIsProcessing(false);
      console.log('🐕🐕🐕 [VALIDATE] Function completed');
    }
  };

  const handleImport = async () => {
    // 🚨 ALERT למבחן - אם זה לא מופיע, הפונקציה לא נקראת!
    alert('🐕 handleImport נקרא! בדוק קונסול עכשיו');
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🐕🐕🐕 [IMPORT] *** FUNCTION CALLED ***');
    console.log('🐕🐕🐕 [IMPORT] Timestamp:', new Date().toISOString());
    console.log('═══════════════════════════════════════════════════════════');
    
    log('🚀 מתחיל יבוא נתונים...', 'info');
    
    console.log('🐕🐕🐕 [IMPORT] Setting step to IMPORT');
    setStep(STEPS.IMPORT);
    console.log('🐕🐕🐕 [IMPORT] Setting isProcessing to true');
    setIsProcessing(true);
    console.log('🐕🐕🐕 [IMPORT] Setting progress to 0');
    setImportProgress(0);

    try {
      console.log('🐕🐕🐕 [IMPORT] ======== STATE SNAPSHOT ========');
      console.log('🐕🐕🐕 [IMPORT] targetTable:', JSON.stringify(targetTable, null, 2));
      console.log('🐕🐕🐕 [IMPORT] importMode:', importMode);
      console.log('🐕🐕🐕 [IMPORT] validatedData.length:', validatedData.length);
      console.log('🐕🐕🐕 [IMPORT] validatedData sample:', JSON.stringify(validatedData.slice(0, 2), null, 2));
      console.log('🐕🐕🐕 [IMPORT] ================================');
      
      let successCount = 0;
      let errorCount = 0;
      const importErrors = [];

      console.log('🐕🐕🐕 [IMPORT] Checking table type...');
      console.log('🐕🐕🐕 [IMPORT] targetTable?.type:', targetTable?.type);
      console.log('🐕🐕🐕 [IMPORT] Is custom?:', targetTable?.type === 'custom');
      console.log('🐕🐕🐕 [IMPORT] Type comparison:', typeof targetTable?.type, '===', typeof 'custom');
      
      if (targetTable?.type === 'custom') {
        console.log('═══════════════════════════════════════════════════════════');
        console.log('🐕🐕🐕 [CUSTOM-PATH] *** ENTERING CUSTOM TABLE LOGIC ***');
        console.log('═══════════════════════════════════════════════════════════');
        
        log(`📊 זיהוי: טבלה מותאמת - "${targetTable.name}"`, 'info');
        
        console.log('🐕🐕🐕 [CUSTOM] Table details:');
        console.log('🐕🐕🐕 [CUSTOM] - ID:', targetTable.id);
        console.log('🐕🐕🐕 [CUSTOM] - Name:', targetTable.name);
        console.log('🐕🐕🐕 [CUSTOM] - Type:', targetTable.type);
        console.log('🐕🐕🐕 [CUSTOM] - Columns:', JSON.stringify(targetTable.columns, null, 2));
        console.log('🐕🐕🐕 [CUSTOM] - Full table object keys:', Object.keys(targetTable));
        
        console.log('🐕🐕🐕 [CUSTOM] Creating new rows with IDs...');
        const newRows = validatedData.map((data, idx) => {
          const rowId = `row_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 9)}`;
          const newRow = { id: rowId, ...data };
          
          if (idx < 3) {
            console.log(`🐕🐕🐕 [CUSTOM] Sample row ${idx}:`, JSON.stringify(newRow, null, 2));
          }
          
          return newRow;
        });
        
        console.log('🐕🐕🐕 [CUSTOM] Created', newRows.length, 'new rows');
        log(`📦 יצרתי ${newRows.length} שורות חדשות עם IDs ייחודיים`, 'success');
        
        console.log('🐕🐕🐕 [CUSTOM] Fetching current table from database...');
        console.log('🐕🐕🐕 [CUSTOM] Calling: base44.entities.CustomSpreadsheet.get("' + targetTable.id + '")');
        
        let currentTable;
        try {
          currentTable = await base44.entities.CustomSpreadsheet.get(targetTable.id);
          console.log('🐕🐕🐕 [CUSTOM] ✅ Fetch successful');
          console.log('🐕🐕🐕 [CUSTOM] Current table keys:', Object.keys(currentTable));
          console.log('🐕🐕🐕 [CUSTOM] Current table.rows_data:', currentTable.rows_data);
          console.log('🐕🐕🐕 [CUSTOM] Current table.rows_data type:', typeof currentTable.rows_data);
          console.log('🐕🐕🐕 [CUSTOM] Current table.rows_data isArray:', Array.isArray(currentTable.rows_data));
          console.log('🐕🐕🐕 [CUSTOM] Full current table:', JSON.stringify(currentTable, null, 2));
        } catch (fetchError) {
          console.error('🐕🐕🐕 [CUSTOM] ❌❌❌ FETCH FAILED');
          console.error('🐕🐕🐕 [CUSTOM] Error:', fetchError);
          console.error('🐕🐕🐕 [CUSTOM] Error message:', fetchError.message);
          console.error('🐕🐕🐕 [CUSTOM] Error stack:', fetchError.stack);
          log(`❌ שגיאה בטעינת הטבלה: ${fetchError.message}`, 'error');
          throw fetchError;
        }
        
        const existingRows = currentTable?.rows_data || [];
        console.log('🐕🐕🐕 [CUSTOM] Existing rows count:', existingRows.length);
        console.log('🐕🐕🐕 [CUSTOM] Existing rows type:', typeof existingRows);
        console.log('🐕🐕🐕 [CUSTOM] Existing rows isArray:', Array.isArray(existingRows));
        
        if (existingRows.length > 0) {
          console.log('🐕🐕🐕 [CUSTOM] Sample existing rows:', JSON.stringify(existingRows.slice(0, 2), null, 2));
        } else {
          console.log('🐕🐕🐕 [CUSTOM] No existing rows (empty table)');
        }
        
        log(`📚 הטבלה מכילה כרגע ${existingRows.length} שורות קיימות`, 'info');
        
        console.log('🐕🐕🐕 [CUSTOM] Merging rows...');
        const allRows = [...existingRows, ...newRows];
        console.log('🐕🐕🐕 [CUSTOM] Total rows after merge:', allRows.length);
        console.log('🐕🐕🐕 [CUSTOM] Calculation:', existingRows.length, '+', newRows.length, '=', allRows.length);
        console.log('🐕🐕🐕 [CUSTOM] First 2 merged rows:', JSON.stringify(allRows.slice(0, 2), null, 2));
        console.log('🐕🐕🐕 [CUSTOM] Last 2 merged rows:', JSON.stringify(allRows.slice(-2), null, 2));
        
        log(`📊 סה"כ אחרי מיזוג: ${allRows.length} שורות (${existingRows.length} קיימות + ${newRows.length} חדשות)`, 'info');
        
        console.log('🐕🐕🐕 [CUSTOM] Preparing update payload...');
        const updatePayload = { rows_data: allRows };
        console.log('🐕🐕🐕 [CUSTOM] Payload keys:', Object.keys(updatePayload));
        console.log('🐕🐕🐕 [CUSTOM] Payload.rows_data length:', updatePayload.rows_data.length);
        console.log('🐕🐕🐕 [CUSTOM] Payload.rows_data isArray:', Array.isArray(updatePayload.rows_data));
        console.log('🐕🐕🐕 [CUSTOM] Payload sample (first 2):', JSON.stringify(updatePayload.rows_data.slice(0, 2), null, 2));
        
        console.log('🐕🐕🐕 [CUSTOM] ========== EXECUTING UPDATE ==========');
        console.log('🐕🐕🐕 [CUSTOM] API call: base44.entities.CustomSpreadsheet.update()');
        console.log('🐕🐕🐕 [CUSTOM] Param 1 (ID):', targetTable.id);
        console.log('🐕🐕🐕 [CUSTOM] Param 2 (Payload):', JSON.stringify(updatePayload, null, 2));
        
        let updateResult;
        try {
          console.log('🐕🐕🐕 [CUSTOM] Sending update request...');
          updateResult = await base44.entities.CustomSpreadsheet.update(targetTable.id, updatePayload);
          console.log('🐕🐕🐕 [CUSTOM] ✅✅✅ UPDATE SUCCESSFUL!');
          console.log('🐕🐕🐕 [CUSTOM] Update result:', JSON.stringify(updateResult, null, 2));
          console.log('🐕🐕🐕 [CUSTOM] Update result keys:', Object.keys(updateResult || {}));
        } catch (updateError) {
          console.error('🐕🐕🐕 [CUSTOM] ❌❌❌ UPDATE FAILED!!!');
          console.error('🐕🐕🐕 [CUSTOM] Error object:', updateError);
          console.error('🐕🐕🐕 [CUSTOM] Error message:', updateError.message);
          console.error('🐕🐕🐕 [CUSTOM] Error stack:', updateError.stack);
          console.error('🐕🐕🐕 [CUSTOM] Error name:', updateError.name);
          console.error('🐕🐕🐕 [CUSTOM] Error type:', typeof updateError);
          log(`❌ שגיאה בעדכון הטבלה: ${updateError.message}`, 'error');
          throw updateError;
        }
        
        console.log('🐕🐕🐕 [CUSTOM] ========== VERIFYING UPDATE ==========');
        try {
          console.log('🐕🐕🐕 [CUSTOM] Fetching table again to verify...');
          const verifyTable = await base44.entities.CustomSpreadsheet.get(targetTable.id);
          console.log('🐕🐕🐕 [CUSTOM] ✅ Verification fetch successful');
          console.log('🐕🐕🐕 [CUSTOM] Verified table:', JSON.stringify(verifyTable, null, 2));
          console.log('🐕🐕🐕 [CUSTOM] Verified rows_data length:', verifyTable.rows_data?.length);
          console.log('🐕🐕🐕 [CUSTOM] Expected rows_data length:', allRows.length);
          
          const match = verifyTable.rows_data?.length === allRows.length;
          console.log('🐕🐕🐕 [CUSTOM] Lengths match?:', match ? '✅ YES' : '❌ NO');
          
          if (!match) {
            console.error('🐕🐕🐕 [CUSTOM] ⚠️⚠️⚠️ MISMATCH DETECTED!');
            console.error('🐕🐕🐕 [CUSTOM] Expected:', allRows.length);
            console.error('🐕🐕🐕 [CUSTOM] Got:', verifyTable.rows_data?.length);
            console.error('🐕🐕🐕 [CUSTOM] Difference:', allRows.length - (verifyTable.rows_data?.length || 0));
            log(`⚠️ אזהרה: מספר השורות לא תואם! צפוי: ${allRows.length}, התקבל: ${verifyTable.rows_data?.length}`, 'warning');
          } else {
            console.log('🐕🐕🐕 [CUSTOM] ✅✅✅ VERIFICATION SUCCESSFUL!');
            log(`✅ אימות: הטבלה מכילה ${verifyTable.rows_data?.length} שורות כצפוי`, 'success');
          }
        } catch (verifyError) {
          console.error('🐕🐕🐕 [CUSTOM] ❌ Verification failed:', verifyError);
          log(`⚠️ לא הצלחתי לאמת את העדכון: ${verifyError.message}`, 'warning');
        }
        
        successCount = newRows.length;
        console.log('🐕🐕🐕 [CUSTOM] Final success count:', successCount);
        log(`✅ ${successCount} שורות נשמרו בהצלחה לטבלה "${targetTable.name}"!`, 'success');
        
        console.log('═══════════════════════════════════════════════════════════');
        console.log('🐕🐕🐕 [CUSTOM-PATH] *** EXITING CUSTOM TABLE LOGIC ***');
        console.log('═══════════════════════════════════════════════════════════');
        
      } else {
        console.log('═══════════════════════════════════════════════════════════');
        console.log('🐕🐕🐕 [CLIENT-PATH] *** ENTERING CLIENT ENTITY LOGIC ***');
        console.log('═══════════════════════════════════════════════════════════');
        
        log(`📊 זיהוי: ישות Client - יבוא ${validatedData.length} לקוחות`, 'info');
        
        for (let i = 0; i < validatedData.length; i++) {
          try {
            console.log(`🐕🐕🐕 [CLIENT] Row ${i + 1}/${validatedData.length}:`, JSON.stringify(validatedData[i], null, 2));
            await base44.entities.Client.create(validatedData[i]);
            successCount++;
            const progress = ((i + 1) / validatedData.length) * 100;
            setImportProgress(progress);
            console.log(`🐕🐕🐕 [CLIENT] ✅ Row ${i + 1} success, progress: ${progress}%`);
          } catch (err) {
            errorCount++;
            importErrors.push({ row: i + 1, error: err.message });
            console.error(`🐕🐕🐕 [CLIENT] ❌ Row ${i + 1} failed:`, err);
            log(`❌ שגיאה בשורה ${i + 1}: ${err.message}`, 'error');
          }
        }
        
        console.log('🐕🐕🐕 [CLIENT] Import complete');
        console.log('🐕🐕🐕 [CLIENT] Success:', successCount, '/', validatedData.length);
        console.log('🐕🐕🐕 [CLIENT] Errors:', errorCount);
        log(`✅ ${successCount} לקוחות יובאו בהצלחה`, 'success');
        
        console.log('═══════════════════════════════════════════════════════════');
        console.log('🐕🐕🐕 [CLIENT-PATH] *** EXITING CLIENT ENTITY LOGIC ***');
        console.log('═══════════════════════════════════════════════════════════');
      }

      console.log('🐕🐕🐕 [IMPORT] Setting import results...');
      const results = {
        total: validatedData.length,
        success: successCount,
        errors: errorCount,
        errorDetails: importErrors
      };
      console.log('🐕🐕🐕 [IMPORT] Results:', JSON.stringify(results, null, 2));
      setImportResults(results);

      console.log('🐕🐕🐕 [IMPORT] Moving to COMPLETE step');
      setStep(STEPS.COMPLETE);
      
      if (errorCount === 0 && onSuccess) {
        console.log('🐕🐕🐕 [IMPORT] No errors detected, will call onSuccess in 2 seconds');
        setTimeout(() => {
          console.log('🐕🐕🐕 [IMPORT] Calling onSuccess callback NOW');
          onSuccess();
          console.log('🐕🐕🐕 [IMPORT] Calling handleClose NOW');
          handleClose();
        }, 2000);
      } else {
        console.log('🐕🐕🐕 [IMPORT] Has errors or no onSuccess callback');
        console.log('🐕🐕🐕 [IMPORT] errorCount:', errorCount);
        console.log('🐕🐕🐕 [IMPORT] onSuccess exists:', !!onSuccess);
      }
    } catch (error) {
      console.error('═══════════════════════════════════════════════════════════');
      console.error('🐕🐕🐕 [IMPORT] ❌❌❌ CRITICAL ERROR!!!');
      console.error('═══════════════════════════════════════════════════════════');
      console.error('🐕🐕🐕 [ERROR] Error object:', error);
      console.error('🐕🐕🐕 [ERROR] Error type:', typeof error);
      console.error('🐕🐕🐕 [ERROR] Error constructor:', error?.constructor?.name);
      console.error('🐕🐕🐕 [ERROR] Error message:', error.message);
      console.error('🐕🐕🐕 [ERROR] Error stack:', error.stack);
      console.error('🐕🐕🐕 [ERROR] Error name:', error.name);
      console.error('🐕🐕🐕 [ERROR] Error toString:', error.toString());
      
      log(`❌ שגיאה קריטית ביבוא: ${error.message}`, 'error');
      toast.error('שגיאה ביבוא: ' + error.message);
    } finally {
      console.log('🐕🐕🐕 [IMPORT] *** FINALLY BLOCK ***');
      console.log('🐕🐕🐕 [IMPORT] Setting isProcessing = false');
      setIsProcessing(false);
      console.log('🐕🐕🐕 [IMPORT] Setting progress = 100');
      setImportProgress(100);
      console.log('═══════════════════════════════════════════════════════════');
      console.log('🐕🐕🐕 [IMPORT] *** FUNCTION COMPLETED ***');
      console.log('🐕🐕🐕 [IMPORT] Timestamp:', new Date().toISOString());
      console.log('═══════════════════════════════════════════════════════════');
    }
  };

  const handleClose = () => {
    console.log('🐕🐕🐕 [CLOSE] Resetting all state');
    setStep(STEPS.SELECT_MODE);
    setFile(null);
    setRawHeaders([]);
    setRawRows([]);
    setMapping({});
    setValidatedData([]);
    setValidationErrors([]);
    setImportResults(null);
    setLogs([]);
    setImportMode(null);
    setTargetTable(null);
    setNewTableName('');
    setNewTableDescription('');
    setEditingHeaders({});
    console.log('🐕🐕🐕 [CLOSE] Calling onClose callback');
    onClose();
  };

  const handleModeSelect = (mode) => {
    console.log('🐕🐕🐕 [MODE-SELECT] Selected mode:', mode);
    setImportMode(mode);
    if (mode === 'client') {
      console.log('🐕🐕🐕 [MODE-SELECT] Setting client entity as target');
      setTargetTable({ type: 'entity', entity: 'Client', name: 'לקוחות' });
      setStep(STEPS.UPLOAD);
    } else {
      console.log('🐕🐕🐕 [MODE-SELECT] Moving to table selection');
      setStep(STEPS.SELECT_TABLE);
    }
  };

  const handleTableSelect = (table) => {
    console.log('🐕🐕🐕 [TABLE-SELECT] Table selected:', JSON.stringify(table, null, 2));
    log(`✅ נבחרה טבלה: ${table.name}`);
    setTargetTable(table);
    setShowTableSelector(false);
    console.log('🐕🐕🐕 [TABLE-SELECT] Moving to UPLOAD step');
    setStep(STEPS.UPLOAD);
  };

  const handleCreateNewTable = async () => {
    console.log('🐕🐕🐕 [CREATE-TABLE] Function called');
    console.log('🐕🐕🐕 [CREATE-TABLE] Table name:', newTableName);
    
    if (!newTableName.trim()) {
      toast.error('נא להזין שם לטבלה');
      return;
    }

    setStep(STEPS.CREATE_TABLE);
    setIsProcessing(true);
    
    try {
      log(`יוצר טבלה חדשה: ${newTableName}`);
      
      const initialColumns = rawHeaders.map((header, index) => ({
        key: `col_${index + 1}`,
        title: header || `עמודה ${index + 1}`,
        width: '150px',
        type: 'text',
        visible: true,
        required: false
      }));
      
      console.log('🐕🐕🐕 [CREATE-TABLE] Initial columns:', JSON.stringify(initialColumns, null, 2));
      
      const newTable = await base44.entities.CustomSpreadsheet.create({
        name: newTableName.trim(),
        description: newTableDescription.trim(),
        columns: initialColumns,
        rows_data: []
      });
      
      console.log('🐕🐕🐕 [CREATE-TABLE] Created table:', JSON.stringify(newTable, null, 2));
      log(`✅ טבלה נוצרה בהצלחה: ${newTable.name}`);
      
      const tableObj = {
        id: newTable.id,
        type: 'custom',
        name: newTable.name,
        columns: initialColumns,
        data: newTable
      };
      
      console.log('🐕🐕🐕 [CREATE-TABLE] Setting targetTable:', JSON.stringify(tableObj, null, 2));
      setTargetTable(tableObj);
      
      console.log('🐕🐕🐕 [CREATE-TABLE] Moving to MAP step');
      setStep(STEPS.MAP);
    } catch (error) {
      console.error('🐕🐕🐕 [CREATE-TABLE] ERROR:', error);
      log(`❌ שגיאה ביצירת הטבלה: ${error.message}`, 'error');
      toast.error('שגיאה ביצירת הטבלה');
      setStep(STEPS.NAME_TABLE);
    } finally {
      setIsProcessing(false);
    }
  };

  const mappedCount = Object.values(mapping).filter(v => v && v !== 'skip').length;

  console.log('🐕🐕🐕 [RENDER] Component rendering, current step:', step, 'Step name:', Object.keys(STEPS).find(k => STEPS[k] === step));

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-6xl h-[90vh] p-0" dir="rtl">
          <div className="flex flex-col h-full">
            {/* Header */}
            <DialogHeader className="px-6 py-4 border-b bg-gradient-to-r from-purple-50 to-blue-50">
              <DialogTitle className="flex items-center gap-3 text-2xl">
                <Sparkles className="w-7 h-7 text-purple-600" />
                אשף יבוא נתונים חכם
              </DialogTitle>
              <DialogDescription>
                מערכת מתקדמת עם זיהוי אוטומטי של מבנה ונתונים עבריים
              </DialogDescription>
            </DialogHeader>

            {/* Progress Bar */}
            <div className="px-6 py-3 bg-white border-b">
              <div className="flex items-center justify-center gap-2">
                {[
                  { num: 1, label: 'בחירת מצב' },
                  { num: 2, label: 'העלאה' },
                  { num: 3, label: 'מיפוי' },
                  { num: 4, label: 'ולידציה' },
                  { num: 5, label: 'יבוא' }
                ].map(({ num, label }, idx) => (
                  <React.Fragment key={num}>
                    <div className="flex flex-col items-center">
                      <div className={`
                        w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all
                        ${step >= idx * 2 ? 'bg-purple-600 text-white scale-110 shadow-lg' : 'bg-slate-200 text-slate-500'}
                      `}>
                        {step > idx * 2 + 1 ? <Check className="w-5 h-5" /> : num}
                      </div>
                      <span className="text-xs mt-1 text-slate-600">{label}</span>
                    </div>
                    {num < 5 && (
                      <div className={`w-12 h-1 ${step > idx * 2 + 1 ? 'bg-purple-600' : 'bg-slate-200'}`} />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Logs - תמיד גלוי עם DEBUG */}
            <div className="px-6 py-3 bg-slate-900 text-green-400 font-mono text-xs border-b">
              <div className="flex items-center justify-between mb-2">
                <div className="text-white font-bold">📋 לוג מערכת (לייב)</div>
                <Badge variant="outline" className="bg-green-900 text-green-300">
                  {logs.length} הודעות
                </Badge>
              </div>
              <ScrollArea className="h-32">
                {logs.length === 0 ? (
                  <div className="text-slate-500 italic py-2">אין לוגים עדיין... מחכה לפעולות</div>
                ) : (
                  logs.map((log, i) => (
                    <div key={i} className="py-0.5 hover:bg-slate-800">{log}</div>
                  ))
                )}
              </ScrollArea>
              
              {/* תצוגת state נוכחי */}
              <div className="mt-2 pt-2 border-t border-slate-700 text-xs text-slate-400">
                <div>🎯 Step: {step} ({Object.keys(STEPS).find(k => STEPS[k] === step)})</div>
                <div>📊 Mode: {importMode || 'לא נבחר'}</div>
                <div>🎲 Table Type: {targetTable?.type || 'אין'}</div>
                <div>📝 Validated: {validatedData.length} rows</div>
                <div>⚙️ Processing: {isProcessing ? 'כן ⏳' : 'לא'}</div>
              </div>
            </div>

            <ScrollArea className="flex-1 px-6">
              <div className="py-4 space-y-4">
                {/* STEP 0: Select Mode */}
                {step === STEPS.SELECT_MODE && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-8">
                    <Card 
                      className="cursor-pointer hover:shadow-2xl transition-all border-2 hover:border-blue-400 bg-gradient-to-br from-blue-50 to-purple-50"
                      onClick={() => handleModeSelect('client')}
                    >
                      <CardContent className="p-8 text-center">
                        <Database className="w-16 h-16 mx-auto mb-4 text-blue-600" />
                        <h3 className="text-xl font-bold mb-2">טבלת לקוחות ראשית</h3>
                        <p className="text-sm text-slate-600">יבוא ישיר לישות Client</p>
                      </CardContent>
                    </Card>

                    <Card 
                      className="cursor-pointer hover:shadow-2xl transition-all border-2 hover:border-purple-400 bg-gradient-to-br from-purple-50 to-pink-50"
                      onClick={() => handleModeSelect('custom')}
                    >
                      <CardContent className="p-8 text-center">
                        <TableIcon className="w-16 h-16 mx-auto mb-4 text-purple-600" />
                        <h3 className="text-xl font-bold mb-2">טבלה מותאמת אישית</h3>
                        <p className="text-sm text-slate-600">יבוא לטבלה קיימת או חדשה</p>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* STEP 1: Select Table */}
                {step === STEPS.SELECT_TABLE && (
                  <div className="space-y-4 py-8">
                    <h3 className="text-lg font-bold text-center mb-6">בחר טבלת יעד</h3>
                    <div className="flex gap-4 justify-center">
                      <Button
                        onClick={() => setShowTableSelector(true)}
                        className="bg-blue-600 hover:bg-blue-700 gap-2"
                      >
                        <Database className="w-5 h-5" />
                        טבלה קיימת
                      </Button>
                      <Button
                        onClick={() => setStep(STEPS.NAME_TABLE)}
                        className="bg-green-600 hover:bg-green-700 gap-2"
                      >
                        <Plus className="w-5 h-5" />
                        טבלה חדשה
                      </Button>
                    </div>
                  </div>
                )}

                {/* STEP 2: Upload File */}
                {step === STEPS.UPLOAD && (
                  <div className="py-8">
                    {targetTable && (
                      <Alert className="mb-6 bg-blue-50 border-blue-200">
                        <Database className="w-5 h-5 text-blue-600" />
                        <AlertDescription>
                          <span className="font-semibold text-blue-900">יעד: </span>
                          <span className="text-blue-800">{targetTable.name}</span>
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    <div 
                      className="border-4 border-dashed border-slate-300 rounded-2xl p-12 text-center hover:border-purple-400 transition-colors cursor-pointer"
                      onClick={() => document.getElementById('file-upload-wizard').click()}
                    >
                      <FileSpreadsheet className="w-20 h-20 mx-auto mb-4 text-slate-400" />
                      <h3 className="text-xl font-bold text-slate-800 mb-2">גרור קובץ או לחץ להעלאה</h3>
                      <p className="text-slate-600 mb-4">Excel (.xlsx, .xls) או CSV</p>
                      <Input
                        id="file-upload-wizard"
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      <Button variant="outline" className="mt-4">
                        <Upload className="w-5 h-5 ml-2" />
                        בחר קובץ
                      </Button>
                    </div>
                  </div>
                )}

                {/* STEP 3: Parsing (auto-handled) */}
                {step === STEPS.PARSE && (
                  <div className="py-16 text-center">
                    <Loader2 className="w-16 h-16 animate-spin text-purple-600 mx-auto mb-4" />
                    <h3 className="text-xl font-bold mb-2">מנתח את הקובץ...</h3>
                    <p className="text-slate-600">זיהוי מבנה ונתונים</p>
                  </div>
                )}

                {/* STEP 4: Name Table (for new custom tables) */}
                {step === STEPS.NAME_TABLE && (
                  <div className="space-y-4 py-8 max-w-2xl mx-auto">
                    <h3 className="text-lg font-bold text-center mb-6">פרטי הטבלה החדשה</h3>
                    
                    <div>
                      <label className="text-sm font-semibold mb-2 block">שם הטבלה *</label>
                      <Input
                        value={newTableName}
                        onChange={(e) => setNewTableName(e.target.value)}
                        placeholder={detectedSheetName || "לדוגמה: לקוחות פוטנציאליים 2024"}
                        className="text-right"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-semibold mb-2 block">תיאור (אופציונלי)</label>
                      <Textarea
                        value={newTableDescription}
                        onChange={(e) => setNewTableDescription(e.target.value)}
                        placeholder="תיאור קצר של מטרת הטבלה..."
                        rows={3}
                        className="text-right"
                      />
                    </div>

                    <div className="flex gap-3 pt-4">
                      <Button
                        variant="outline"
                        onClick={() => setStep(STEPS.SELECT_TABLE)}
                      >
                        חזור
                      </Button>
                      <Button
                        onClick={handleCreateNewTable}
                        disabled={!newTableName.trim()}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        צור טבלה והמשך
                      </Button>
                    </div>
                  </div>
                )}

                {/* STEP 6: Map Columns */}
                {step === STEPS.MAP && (
                  <div className="space-y-4 pb-20">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-bold">מיפוי עמודות</h3>
                        <p className="text-sm text-slate-600">דיוק {Math.round((mappedCount/rawHeaders.length)*100)}%</p>
                      </div>
                      <Badge className="bg-gradient-to-r from-purple-100 to-blue-100 border-purple-300">
                        <Brain className="w-3 h-3 ml-1" />
                        {mappedCount} / {rawHeaders.length}
                      </Badge>
                    </div>

                    <Alert className="bg-blue-50 border-blue-200">
                      <Info className="w-5 h-5 text-blue-600" />
                      <AlertDescription>
                        <div className="font-semibold text-blue-900 mb-1">💡 טיפ</div>
                        <div className="text-sm text-blue-800">
                          ברירת המחדל היא שם הכותרת מהקובץ. לחץ על העיפרון ✏️ לשינוי שם הכותרת.
                        </div>
                      </AlertDescription>
                    </Alert>

                    <div className="space-y-3">
                      {rawHeaders.map((header, index) => {
                        const mappedField = mapping[index];
                        const isMapped = mappedField && mappedField !== 'skip';
                        const targetFields = importMode === 'client' ? Object.keys(CLIENT_SCHEMA) : targetTable?.columns?.map(col => col.key) || [];
                        const isEditingName = editingHeaders[index] !== undefined;
                        
                        return (
                          <Card key={index} className={`p-4 transition-all ${isMapped ? 'border-2 border-green-400 bg-green-50/50 shadow-md' : 'hover:border-purple-300'}`}>
                            <div className="flex items-center gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="text-xs text-slate-500 mb-1">עמודה {index + 1}</div>
                                {isEditingName ? (
                                  <div className="flex items-center gap-2">
                                    <Input
                                      value={editingHeaders[index]}
                                      onChange={(e) => setEditingHeaders(prev => ({ ...prev, [index]: e.target.value }))}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') updateHeaderName(index, editingHeaders[index]);
                                        if (e.key === 'Escape') {
                                          setEditingHeaders(prev => {
                                            const updated = { ...prev };
                                            delete updated[index];
                                            return updated;
                                          });
                                        }
                                      }}
                                      onBlur={() => {
                                        if (editingHeaders[index]?.trim()) {
                                          updateHeaderName(index, editingHeaders[index]);
                                        } else {
                                          setEditingHeaders(prev => {
                                            const updated = { ...prev };
                                            delete updated[index];
                                            return updated;
                                          });
                                        }
                                      }}
                                      className="h-8 text-sm"
                                      autoFocus
                                    />
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-8 w-8"
                                      onClick={() => updateHeaderName(index, editingHeaders[index])}
                                    >
                                      <Check className="w-4 h-4 text-green-600" />
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 group">
                                    <div className="font-semibold truncate flex-1">{header || `עמודה ${index + 1}`}</div>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                      onClick={() => setEditingHeaders(prev => ({ ...prev, [index]: header }))}
                                      title="ערוך שם כותרת"
                                    >
                                      <Edit2 className="w-3 h-3 text-blue-600" />
                                    </Button>
                                  </div>
                                )}
                                <div className="text-xs text-slate-600 truncate mt-1">דוגמה: {rawRows[0]?.[index] || '—'}</div>
                              </div>

                              <ArrowRight className={`w-5 h-5 flex-shrink-0 ${isMapped ? 'text-green-600' : 'text-slate-400'}`} />

                              <div className="flex-1 min-w-0">
                                <Select 
                                  value={mappedField || header} 
                                  onValueChange={(value) => setMapping({ ...mapping, [index]: value })}
                                >
                                  <SelectTrigger className={isMapped ? 'border-2 border-green-500 bg-green-50' : ''}>
                                    <SelectValue placeholder={header || "בחר שדה..."} />
                                  </SelectTrigger>
                                  <SelectContent dir="rtl">
                                    <SelectItem value="skip">
                                      <div className="flex items-center gap-2">
                                        <X className="w-4 h-4" />
                                        דלג על עמודה זו
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
                                <div className="text-xs text-slate-500 mt-1">
                                  {isMapped && mappedField !== 'skip' && (
                                    <span className="text-green-600">✓ ממופה</span>
                                  )}
                                  {mappedField === 'skip' && <span className="text-slate-400">⊗ תדולג</span>}
                                  {!mappedField && <span className="text-blue-600">📌 ברירת מחדל</span>}
                                </div>
                              </div>

                              <div className="flex-shrink-0">
                                {isMapped && mappedField !== 'skip' ? 
                                  <CheckCircle2 className="w-6 h-6 text-green-600" /> : 
                                  <AlertCircle className="w-6 h-6 text-slate-400" />
                                }
                              </div>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* STEP 7: Validation Preview */}
                {step === STEPS.VALIDATE && (
                  <div className="space-y-4 pb-20">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold">תצוגה מקדימה וולידציה</h3>
                      <Badge variant="outline">
                        {validatedData.length - validationErrors.length}/{validatedData.length} תקינות
                      </Badge>
                    </div>

                    {validationErrors.length > 0 && (
                      <Alert className="bg-red-50 border-red-200">
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                        <AlertDescription>
                          <div className="font-semibold text-red-900">נמצאו {validationErrors.length} שגיאות</div>
                          <div className="text-sm text-red-800 mt-2 max-h-32 overflow-y-auto">
                            {validationErrors.map((err, i) => (
                              <div key={i}>שורה {err.row}: {err.errors.join(', ')}</div>
                            ))}
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}

                    <ScrollArea className="h-96 border rounded-lg">
                      <div className="p-4 space-y-2">
                        {previewRows.map((row, index) => (
                          <Card 
                            key={index}
                            className={rowValidations[index]?.status === 'error' ? 'border-red-300 bg-red-50' : ''}
                          >
                            <CardContent className="p-3">
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                {Object.entries(row).map(([key, value]) => (
                                  <div key={key}>
                                    <span className="font-medium text-slate-600">
                                      {importMode === 'client' ? CLIENT_SCHEMA[key]?.label : key}:
                                    </span>{' '}
                                    <span className="text-slate-800">{value || '—'}</span>
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}

                {/* STEP 8: Importing */}
                {step === STEPS.IMPORT && (
                  <div className="py-16 text-center">
                    <Loader2 className="w-16 h-16 animate-spin text-purple-600 mx-auto mb-4" />
                    <h3 className="text-xl font-bold mb-2">מייבא נתונים...</h3>
                    <Progress value={importProgress} className="w-96 mx-auto mt-4" />
                    <p className="text-slate-600 mt-2">{Math.round(importProgress)}%</p>
                  </div>
                )}

                {/* STEP 9: Complete */}
                {step === STEPS.COMPLETE && importResults && (
                  <div className="py-8 text-center">
                    <div className={`w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center ${
                      importResults.errors === 0 ? 'bg-green-100' : 'bg-yellow-100'
                    }`}>
                      {importResults.errors === 0 ? (
                        <CheckCircle2 className="w-12 h-12 text-green-600" />
                      ) : (
                        <AlertCircle className="w-12 h-12 text-yellow-600" />
                      )}
                    </div>

                    <h3 className="text-2xl font-bold text-slate-900 mb-2">
                      {importResults.errors === 0 ? 'היבוא הושלם בהצלחה! 🎉' : 'היבוא הושלם עם שגיאות'}
                    </h3>

                    <div className="grid grid-cols-3 gap-4 max-w-md mx-auto mt-6">
                      <div className="bg-blue-50 rounded-lg p-4">
                        <div className="text-3xl font-bold text-blue-600">{importResults.total}</div>
                        <div className="text-sm text-blue-800">סה"כ</div>
                      </div>
                      <div className="bg-green-50 rounded-lg p-4">
                        <div className="text-3xl font-bold text-green-600">{importResults.success}</div>
                        <div className="text-sm text-green-800">הצליח</div>
                      </div>
                      <div className="bg-red-50 rounded-lg p-4">
                        <div className="text-3xl font-bold text-red-600">{importResults.errors}</div>
                        <div className="text-sm text-red-800">נכשל</div>
                      </div>
                    </div>

                    {importResults.errorDetails && importResults.errorDetails.length > 0 && (
                      <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4 max-h-40 overflow-y-auto text-right max-w-2xl mx-auto">
                        <div className="font-semibold text-red-900 mb-2">שגיאות:</div>
                        <div className="text-sm text-red-800 space-y-1">
                          {importResults.errorDetails.map((err, i) => (
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
              </div>
            </ScrollArea>

            {/* Footer Buttons */}
            <div className="px-6 py-4 border-t bg-slate-50 flex justify-between">
              <Button
                variant="outline"
                onClick={() => {
                  console.log('🐕🐕🐕 [BUTTON] Cancel button clicked');
                  handleClose();
                }}
                disabled={isProcessing}
              >
                ביטול
              </Button>

              <div className="flex gap-2">
                {step === STEPS.MAP && (
                  <Button
                    onClick={() => {
                      console.log('🐕🐕🐕 [BUTTON] Preview button clicked at MAP step');
                      handleValidate();
                    }}
                    className="bg-purple-600 hover:bg-purple-700 gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    תצוגה מקדימה
                  </Button>
                )}

                {step === STEPS.VALIDATE && (
                  <Button
                    onClick={() => {
                      alert('🐕 כפתור ייבוא נלחץ! בדוק קונסול');
                      console.log('═══════════════════════════════════════════════════════════');
                      console.log('🐕🐕🐕 [BUTTON-CLICK] *** IMPORT BUTTON CLICKED ***');
                      console.log('🐕🐕🐕 [BUTTON-CLICK] Timestamp:', new Date().toISOString());
                      console.log('🐕🐕🐕 [BUTTON-CLICK] Current step:', step);
                      console.log('🐕🐕🐕 [BUTTON-CLICK] validatedData.length:', validatedData.length);
                      console.log('🐕🐕🐕 [BUTTON-CLICK] validationErrors.length:', validationErrors.length);
                      console.log('🐕🐕🐕 [BUTTON-CLICK] isProcessing:', isProcessing);
                      console.log('🐕🐕🐕 [BUTTON-CLICK] targetTable:', targetTable);
                      console.log('🐕🐕🐕 [BUTTON-CLICK] Calling handleImport() NOW...');
                      console.log('═══════════════════════════════════════════════════════════');
                      handleImport();
                    }}
                    disabled={validationErrors.length === validatedData.length}
                    className="bg-green-600 hover:bg-green-700 gap-2 relative"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    ייבא {validatedData.length} שורות
                    {/* DEBUG: הצג אם הכפתור disabled */}
                    {validationErrors.length === validatedData.length && (
                      <span className="absolute -top-8 left-0 bg-red-600 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                        ❌ כפתור מושבת - כל השורות עם שגיאות
                      </span>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Table Selector */}
      {showTableSelector && (
        <TableManager
          open={showTableSelector}
          onClose={() => setShowTableSelector(false)}
          onTableSelect={handleTableSelect}
        />
      )}
    </>
  );
}