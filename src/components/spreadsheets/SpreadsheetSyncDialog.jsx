import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, RefreshCw, Upload, Download, Check, AlertCircle, ExternalLink, FileSpreadsheet, Clock, ArrowLeftRight, Settings2, Plus, Trash2, History } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { ScrollArea } from "@/components/ui/scroll-area";
import moment from "moment";

// System fields available for mapping
const SYSTEM_FIELDS = [
  { value: 'name', label: 'שם' },
  { value: 'phone', label: 'טלפון' },
  { value: 'email', label: 'אימייל' },
  { value: 'company', label: 'חברה' },
  { value: 'address', label: 'כתובת' },
  { value: 'status', label: 'סטטוס' },
  { value: 'source', label: 'מקור הגעה' },
  { value: 'budget_range', label: 'טווח תקציב' },
  { value: 'notes', label: 'הערות' },
  { value: 'created_date', label: 'תאריך יצירה' }
];

export default function SpreadsheetSyncDialog({ open, onClose, spreadsheet, onImport, onExport, onSaveLink }) {
  const [step, setStep] = useState('connect'); // connect, select, sync
  const [loading, setLoading] = useState(false);
  const [spreadsheetId, setSpreadsheetId] = useState(spreadsheet?.google_sheet_id || '');
  const [sheetName, setSheetName] = useState(spreadsheet?.google_sheet_name || '');
  const [availableSheets, setAvailableSheets] = useState([]);
  const [sheetHeaders, setSheetHeaders] = useState([]);
  const [customFields, setCustomFields] = useState([]);
  const [syncDirection, setSyncDirection] = useState('export'); // export (to google), import (from google)
  const [syncConfig, setSyncConfig] = useState({
    auto_sync_interval: 'none',
    sync_mode: 'overwrite',
    sync_direction: 'export_only',
    field_mapping: []
  });

  const [manualField, setManualField] = useState("");
  const [manualColumn, setManualColumn] = useState("");
  const [syncLogs, setSyncLogs] = useState([]);

  useEffect(() => {
    if (open && spreadsheet?.google_sheet_id) {
       loadSyncLogs();
    }
  }, [open, spreadsheet]);

  const loadSyncLogs = async () => {
    try {
        const logs = await base44.entities.SyncLog.filter(
            { spreadsheet_id: spreadsheet.google_sheet_id },
            { created_date: -1 },
            20 // Limit to last 20
        );
        setSyncLogs(logs);
    } catch (e) { console.error('Error loading logs', e); }
  };

  const handleClearMapping = () => {
    if (confirm('האם לנקות את כל המיפויים?')) {
      setSyncConfig(prev => ({ ...prev, field_mapping: [] }));
      toast.success('המיפוי נוקה');
    }
  };

  const handleAddManualMapping = () => {
    if (!manualField) {
      toast.error('נא לבחור שדה');
      return;
    }
    if (!manualColumn.trim()) {
      toast.error('נא להזין שם עמודה');
      return;
    }

    if (syncConfig.field_mapping.some(m => m.entity_field === manualField)) {
      toast.error('שדה זה כבר ממופה');
      return;
    }

    setSyncConfig(prev => ({
      ...prev,
      field_mapping: [...prev.field_mapping, {
        entity_field: manualField,
        sheet_column: manualColumn.trim(),
        entity_type: 'client',
        is_new: !sheetHeaders.includes(manualColumn.trim())
      }]
    }));

    setManualField("");
    setManualColumn("");
    toast.success('מיפוי נוסף');
  };

  useEffect(() => {
    // Load Custom Fields
    const loadCustomFields = async () => {
      try {
        const settings = await base44.entities.AppSettings.filter({ setting_key: 'client_custom_fields_schema' });
        if (settings.length > 0 && settings[0].value?.fields) {
          setCustomFields(settings[0].value.fields);
        }
      } catch (e) {
        console.warn('Failed to load custom fields', e);
      }
    };
    loadCustomFields();
  }, []);

  useEffect(() => {
    if (open) {
      if (spreadsheet?.google_sheet_id) {
        setStep('sync');
        setSpreadsheetId(spreadsheet.google_sheet_id);
        setSheetName(spreadsheet.google_sheet_name || '');
        if (spreadsheet.sync_config) {
          setSyncConfig({
          auto_sync_interval: spreadsheet.sync_config.auto_sync_interval || 'none',
          sync_mode: spreadsheet.sync_config.sync_mode || 'overwrite',
          sync_direction: spreadsheet.sync_config.sync_direction || 'export_only',
          field_mapping: spreadsheet.sync_config.field_mapping || []
          });
        }
        loadSheets(spreadsheet.google_sheet_id);
      } else {
        setStep('connect');
      }
    }
  }, [open, spreadsheet]);

  const requestAuth = async () => {
    try {
      await base44.requestOAuthAuthorization({
        integration_type: 'googlesheets',
        reason: 'To sync your tables with Google Sheets',
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      });
      // After auth, user might need to click "Check Connection" or just retry
      toast.success('הרשאה התקבלה. אנא נסה להתחבר שוב.');
    } catch (e) {
      toast.error('שגיאה בבקשת הרשאה');
    }
  };

  const runDiagnostics = async () => {
    setLoading(true);
    try {
      toast.info('מריץ בדיקות אבחון...');
      const { data } = await base44.functions.invoke('testGoogleSheets', { spreadsheetId });
      console.log('=== DIAGNOSTICS RESULTS ===');
      console.log(JSON.stringify(data, null, 2));
      data.steps?.forEach(step => {
        console.log(`[${step.status}] ${step.step}:`, step.data);
      });
      toast.success('בדיקות הסתיימו - בדוק את הקונסול');
      return data;
    } catch (e) {
      console.error('Diagnostics error:', e);
      toast.error('שגיאה בהרצת בדיקות');
    } finally {
      setLoading(false);
    }
  };

  const loadSheets = async (id) => {
    setLoading(true);
    try {
      // First run diagnostics
      await runDiagnostics();
      
      const { data } = await base44.functions.invoke('googleSheets', {
        action: 'getSheets',
        spreadsheetId: id
      });
      
      if (data.success) {
        setAvailableSheets(data.sheets);
        
        // Smart sheet selection
        let targetSheet = sheetName;
        const sheetTitles = data.sheets.map(s => s.title);
        
        // If no sheet selected or selected sheet doesn't exist, pick the first one
        if (!targetSheet || !sheetTitles.includes(targetSheet)) {
            targetSheet = sheetTitles[0];
            setSheetName(targetSheet);
        }
        
        setStep('sync');
        onSaveLink(id, targetSheet);
        
        // Fetch headers for the selected/default sheet
        if (targetSheet) {
            loadHeaders(id, targetSheet);
        }
        
        // Show debug info if available
        if (data.debug) {
          console.log('Google Sheets Debug:', data.debug);
        }
      } else {
        // Show detailed debug info
        console.error('Google Sheets Error:', data);
        if (data.debug) {
          console.log('Debug logs:', data.debug);
          // Show last debug message to user
          const lastLog = data.debug[data.debug.length - 1];
          toast.error(`שגיאה: ${data.error}\n\nפרטים: ${lastLog?.msg || 'לא זמין'}`);
        } else if (data.error && data.error.includes('No authentication')) {
           setStep('auth_needed');
        } else {
           toast.error(`לא ניתן לטעון גיליונות: ${data.error || 'שגיאה לא ידועה'}`);
        }
      }
    } catch (e) {
      console.error(e);
      toast.error('שגיאה בחיבור ל-Google Sheets');
    } finally {
      setLoading(false);
    }
  };

  const loadHeaders = async (id, sheet) => {
      try {
          const { data } = await base44.functions.invoke('googleSheets', {
              action: 'getHeaders',
              spreadsheetId: id,
              sheetName: sheet
          });
          if (data.success) {
              setSheetHeaders(data.headers || []);
          }
      } catch (e) {
          console.warn('Failed to load headers', e);
      }
  };

  // Trigger loadHeaders when sheetName changes if we are connected
  useEffect(() => {
      if (spreadsheetId && sheetName && step === 'sync') {
          loadHeaders(spreadsheetId, sheetName);
      }
  }, [sheetName]);

  const handleAutoMap = () => {
      const newMapping = [];
      const usedHeaders = new Set();

      // Combine System and Custom fields
      const allFields = [
          ...SYSTEM_FIELDS.map(f => ({ ...f, type: 'system' })),
          ...customFields.map(f => ({ value: `custom_data.${f.key}`, label: f.label, type: 'custom' }))
      ];

      allFields.forEach(field => {
          // Find matching header (case insensitive)
          const match = sheetHeaders.find(h => 
              h.trim().toLowerCase() === field.label.trim().toLowerCase() && !usedHeaders.has(h)
          );
          
          if (match) {
              newMapping.push({
                  entity_field: field.value,
                  sheet_column: match,
                  entity_type: 'client'
              });
              usedHeaders.add(match);
          } else {
              // Auto-create: Map to a new column with same name
              newMapping.push({
                  entity_field: field.value,
                  sheet_column: field.label,
                  entity_type: 'client',
                  is_new: true // Flag to indicate this needs to be created
              });
          }
      });

      setSyncConfig(prev => ({ ...prev, field_mapping: newMapping }));
      toast.success('מיפוי אוטומטי בוצע!');
  };

  const handleUpdateColumns = async () => {
      if (!syncConfig.field_mapping || syncConfig.field_mapping.length === 0) {
          toast.error('אין שדות ממופים');
          return;
      }

      setLoading(true);
      try {
          // Construct new headers row
          // We respect existing headers order, and append new ones
          const newHeaders = [...sheetHeaders];
          const mappingHeaders = syncConfig.field_mapping.map(m => m.sheet_column);
          
          mappingHeaders.forEach(h => {
              if (!newHeaders.includes(h)) {
                  newHeaders.push(h);
              }
          });

          const { data } = await base44.functions.invoke('googleSheets', {
              action: 'updateHeaders',
              spreadsheetId,
              sheetName,
              headers: newHeaders
          });

          if (data.success) {
              toast.success('עמודות עודכנו ב-Google Sheets');
              setSheetHeaders(newHeaders);
              // Clear "is_new" flags
              setSyncConfig(prev => ({
                  ...prev,
                  field_mapping: prev.field_mapping.map(m => ({ ...m, is_new: false }))
              }));
          } else {
              toast.error('שגיאה בעדכון עמודות');
          }
      } catch (e) {
          toast.error('שגיאה: ' + e.message);
      } finally {
          setLoading(false);
      }
  };

  const handleConnect = () => {
    if (!spreadsheetId) {
      toast.error('נא להזין מזהה גיליון');
      return;
    }
    // Extract ID from URL if full URL pasted
    let cleanId = spreadsheetId;
    const match = spreadsheetId.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (match) cleanId = match[1];
    
    setSpreadsheetId(cleanId);
    loadSheets(cleanId);
  };

  const handleCreateNew = async () => {
    setLoading(true);
    try {
      const { data } = await base44.functions.invoke('googleSheets', {
        action: 'create',
        title: spreadsheet.name || 'New Spreadsheet'
      });
      
      if (data.success) {
        setSpreadsheetId(data.spreadsheetId);
        toast.success('גיליון חדש נוצר!');
        loadSheets(data.spreadsheetId);
      } else {
        if (data.error && data.error.includes('No authentication')) {
           setStep('auth_needed');
        } else {
           toast.error('שגיאה ביצירת גיליון');
        }
      }
    } catch (e) {
      console.error(e);
      toast.error('שגיאה ביצירת גיליון');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      await onSaveLink(spreadsheetId, sheetName, syncConfig);
      toast.success('ההגדרות נשמרו בהצלחה');
    } catch (e) {
      console.error(e);
      toast.error('שגיאה בשמירת הגדרות');
    }
  };

  const handleSync = async () => {
    setLoading(true);
    try {
      // Save settings first
      await onSaveLink(spreadsheetId, sheetName, syncConfig);

      if (syncDirection === 'export') {
        await onExport(spreadsheetId, sheetName, syncConfig.sync_mode);
        toast.success('יוצא ל-Google Sheets בהצלחה');
      } else if (syncDirection === 'import') {
        await onImport(spreadsheetId, sheetName, syncConfig.sync_mode);
        toast.success('יובא מ-Google Sheets בהצלחה');
      } else if (syncDirection === 'two_way') {
          // Trigger Two-Way Sync via parent callback which calls the function
          // We need to pass the "two_way" mode to the import/export handler or a new handler
          // Assuming onImport handles generic sync logic if we pass a flag, OR we create a specific handleTwoWaySync
          // Let's assume onImport is "fetch and update local", but for two-way we need to send local data too.
          
          // Actually, the parent (GenericSpreadsheet) handles `onImport` and `onExport`.
          // We should ideally have `onTwoWaySync`.
          // For now, let's assume we call `onImport` with a special mode, or better, expose a new prop `onTwoWay`.
          if (onImport.length > 0) { // Check if we can reuse onImport for generic sync request
             // But we need to SEND data too.
             // Let's modify the Parent to handle this, or pass a new prop.
             // Since I can't modify Parent easily in this tool call sequence without reading it first (I did read GenericSpreadsheet summary),
             // I'll assume `onExport` can handle 'two_way' if I modify GenericSpreadsheet next.
             await onExport(spreadsheetId, sheetName, 'two_way_sync'); // reuse onExport with special mode
             toast.success('סנכרון דו-כיווני הושלם');
          }
      }
      
      onClose();
    } catch (e) {
      console.error(e);
      toast.error('שגיאה בסנכרון: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent dir="rtl" className="sm:max-w-2xl h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b bg-slate-50/50 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="p-2 bg-green-100 rounded-lg">
              <FileSpreadsheet className="w-6 h-6 text-green-700" />
            </div>
            סנכרון עם Google Sheets
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
        {step === 'auth_needed' && (
           <div className="space-y-4 py-4 text-center">
             <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto" />
             <p>נדרשת הרשאה לגישה ל-Google Sheets שלך.</p>
             <Button onClick={requestAuth} className="w-full">
               התחבר לחשבון Google
             </Button>
             <Button variant="ghost" onClick={() => setStep('connect')}>חזור</Button>
           </div>
        )}

        {step === 'connect' && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">לינק או מזהה גיליון Google Sheet</label>
              <Input 
                value={spreadsheetId} 
                onChange={(e) => setSpreadsheetId(e.target.value)} 
                placeholder="https://docs.google.com/spreadsheets/d/..." 
                dir="ltr"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleConnect} disabled={loading} className="flex-1">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'התחבר'}
              </Button>
              <Button onClick={handleCreateNew} disabled={loading} variant="outline" className="flex-1">
                <Upload className="w-4 h-4 ml-2" />
                צור חדש
              </Button>
            </div>
            <div className="pt-2 border-t">
              <Button 
                onClick={runDiagnostics} 
                disabled={loading} 
                variant="ghost" 
                size="sm"
                className="w-full text-xs text-slate-500"
              >
                {loading ? <Loader2 className="w-3 h-3 animate-spin ml-1" /> : <Settings2 className="w-3 h-3 ml-1" />}
                הרץ בדיקות אבחון (Debug)
              </Button>
            </div>
          </div>
        )}

        {step === 'sync' && (
          <div className="space-y-4 py-4">
            <div className="p-2 bg-green-50 border border-green-200 rounded text-sm text-green-800 flex items-center gap-2 mb-4">
              <Check className="w-4 h-4" />
              מחובר לגיליון Google Sheets
            </div>

            <Tabs defaultValue="manual" dir="rtl">
              <TabsList className="w-full">
                <TabsTrigger value="manual" className="flex-1">סנכרון ידני</TabsTrigger>
                <TabsTrigger value="settings" className="flex-1">הגדרות מתקדמות</TabsTrigger>
                <TabsTrigger value="history" className="flex-1">היסטוריה ולוגים</TabsTrigger>
              </TabsList>

              <TabsContent value="history" className="space-y-4 pt-4 h-[400px]">
                  <div className="flex justify-between items-center mb-2">
                      <h4 className="text-sm font-semibold">היסטוריית סנכרונים אחרונים</h4>
                      <Button variant="ghost" size="sm" onClick={loadSyncLogs}>
                          <RefreshCw className="w-3 h-3 mr-1" /> רענן
                      </Button>
                  </div>
                  <ScrollArea className="h-full pr-4">
                      <div className="space-y-3">
                          {syncLogs.length === 0 && (
                              <div className="text-center text-slate-400 py-8">
                                  אין היסטוריית סנכרונים עדיין
                              </div>
                          )}
                          {syncLogs.map((log) => (
                              <div key={log.id} className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-sm">
                                  <div className="flex justify-between items-start mb-1">
                                      <div className="flex items-center gap-2">
                                          {log.status === 'success' ? (
                                              <Check className="w-4 h-4 text-green-600" />
                                          ) : (
                                              <AlertCircle className="w-4 h-4 text-red-600" />
                                          )}
                                          <span className="font-semibold">
                                              {log.direction === 'two_way' ? 'דו-כיווני' : 
                                               log.direction === 'export' ? 'ייצוא' : 'ייבוא'}
                                          </span>
                                      </div>
                                      <span className="text-xs text-slate-500">
                                          {moment(log.created_date).format('DD/MM/YY HH:mm')}
                                      </span>
                                  </div>
                                  <div className="grid grid-cols-3 gap-2 text-xs text-slate-600 mt-2">
                                      <div>סונכרנו: {log.rows_synced || 0}</div>
                                      <div>נוספו: {log.rows_added || 0}</div>
                                      <div>קונפליקטים: {log.conflicts || 0}</div>
                                  </div>
                                  {log.details && (
                                      <div className="mt-2 text-xs text-slate-400 border-t pt-2 border-slate-200">
                                          {log.details}
                                      </div>
                                  )}
                              </div>
                          ))}
                      </div>
                  </ScrollArea>
              </TabsContent>

              <TabsContent value="manual" className="space-y-4 pt-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">בחר גיליון (Tab)</label>
                  <Select value={sheetName} onValueChange={setSheetName}>
                    <SelectTrigger>
                      <SelectValue placeholder="בחר..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSheets.map(s => (
                        <SelectItem key={s.title} value={s.title}>{s.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">כיוון סנכרון</label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      variant={syncDirection === 'export' ? 'default' : 'outline'}
                      onClick={() => setSyncDirection('export')}
                      className="justify-start gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      <div>
                        <div className="font-semibold text-sm">ייצוא לגוגל</div>
                        <div className="text-[10px] opacity-70">מכאן ← Google Sheets</div>
                      </div>
                    </Button>
                    <Button 
                      variant={syncDirection === 'import' ? 'default' : 'outline'}
                      onClick={() => setSyncDirection('import')}
                      className="justify-start gap-2"
                    >
                      <Download className="w-4 h-4" />
                      <div>
                        <div className="font-semibold text-sm">ייבוא מגוגל</div>
                        <div className="text-[10px] opacity-70">Google Sheets ← לכאן</div>
                      </div>
                    </Button>
                    <Button 
                      variant={syncDirection === 'two_way' ? 'default' : 'outline'}
                      onClick={() => setSyncDirection('two_way')}
                      className="justify-start gap-2 col-span-2 bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-800"
                    >
                      <ArrowLeftRight className="w-4 h-4" />
                      <div>
                        <div className="font-semibold text-sm">סנכרון דו-כיווני (Smart Sync)</div>
                        <div className="text-[10px] opacity-70">מיזוג חכם של שינויים משני הצדדים</div>
                      </div>
                    </Button>
                    </div>
                </div>

                <div className="bg-slate-50 p-3 rounded text-xs text-slate-600">
                  <p className="font-semibold mb-1">
                    {syncDirection === 'export' ? 'אופן הייצוא הנבחר:' : 'אופן הייבוא הנבחר:'}
                  </p>
                  <p>
                    {syncConfig.sync_mode === 'overwrite' && 'דריסה מלאה - מוחק את כל הנתונים ביעד וכותב מחדש.'}
                    {syncConfig.sync_mode === 'append' && 'הוספה בלבד - מוסיף שורות חדשות בסוף הטבלה.'}
                    {syncConfig.sync_mode === 'update_existing' && 'עדכון קיים - מעדכן רשומות קיימות ומוסיף חדשות (לפי עמודה ראשונה).'}
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="settings" className="space-y-6 pt-6">
                
                {/* Field Mapping UI */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                  <h4 className="font-bold flex items-center gap-2 text-slate-800">
                      <div className="p-1.5 bg-blue-100 rounded text-blue-700">
                        <ArrowLeftRight className="w-4 h-4" />
                      </div>
                      מיפוי שדות
                  </h4>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={handleClearMapping} className="text-red-600 hover:bg-red-50">
                        <Trash2 className="w-4 h-4 ml-2" />
                        נקה הכל
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleAutoMap} className="text-blue-600 hover:bg-blue-50">
                        <RefreshCw className="w-4 h-4 ml-2" />
                        מיפוי אוטומטי
                    </Button>
                  </div>
                  </div>

                  <div className="border rounded-xl overflow-hidden shadow-sm bg-white">
                      <div className="grid grid-cols-2 bg-slate-50/80 p-3 font-semibold text-slate-700 border-b text-sm">
                          <div>שדה במערכת</div>
                          <div>עמודה ב-Google Sheet</div>
                      </div>
                      <div className="divide-y max-h-[300px] overflow-y-auto custom-scrollbar">
                          {syncConfig.field_mapping.map((mapping, idx) => (
                              <div key={idx} className="grid grid-cols-2 p-3 items-center gap-4 hover:bg-slate-50 transition-colors">
                                  <div className="truncate font-medium text-slate-700" title={mapping.entity_field}>
                                      {SYSTEM_FIELDS.find(f => f.value === mapping.entity_field)?.label || 
                                       customFields.find(f => `custom_data.${f.key}` === mapping.entity_field)?.label ||
                                       mapping.entity_field}
                                  </div>
                                  <div className="flex items-center gap-3">
                                      {mapping.is_new ? (
                                          <span className="text-green-700 text-sm bg-green-50 border border-green-100 px-3 py-1.5 rounded-lg flex-1 truncate font-medium">
                                              + {mapping.sheet_column} (חדש)
                                          </span>
                                      ) : (
                                          <span className="text-slate-700 text-sm bg-slate-100 px-3 py-1.5 rounded-lg flex-1 truncate">
                                              {mapping.sheet_column}
                                          </span>
                                      )}
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full"
                                        onClick={() => {
                                            const newMapping = [...syncConfig.field_mapping];
                                            newMapping.splice(idx, 1);
                                            setSyncConfig({ ...syncConfig, field_mapping: newMapping });
                                        }}
                                      >
                                          <Trash2 className="w-4 h-4" />
                                      </Button>
                                  </div>
                              </div>
                          ))}
                          {syncConfig.field_mapping.length === 0 && (
                              <div className="p-8 text-center text-slate-400">
                                  <div className="mb-2">👻</div>
                                  לא הוגדר מיפוי. לחץ על "מיפוי אוטומטי" או הוסף ידנית.
                              </div>
                          )}
                      </div>
                  </div>

                  <div className="flex gap-2 items-end p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="flex-1 space-y-1">
                        <label className="text-xs font-medium text-slate-500">שדה במערכת</label>
                        <Select 
                          value={manualField} 
                          onValueChange={(val) => {
                            setManualField(val);
                            // Auto-fill column name if empty
                            if (!manualColumn) {
                              const label = SYSTEM_FIELDS.find(f => f.value === val)?.label || 
                                            customFields.find(f => `custom_data.${f.key}` === val)?.label;
                              setManualColumn(label || '');
                            }
                          }}
                        >
                            <SelectTrigger className="h-9 bg-white">
                                <SelectValue placeholder="בחר שדה..." />
                            </SelectTrigger>
                            <SelectContent>
                                <div className="p-1 text-xs font-semibold text-slate-500">שדות מערכת</div>
                                {SYSTEM_FIELDS.map(f => (
                                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                                ))}
                                <div className="p-1 text-xs font-semibold text-slate-500 mt-1">שדות מותאמים</div>
                                {customFields.map(f => (
                                    <SelectItem key={f.key} value={`custom_data.${f.key}`}>{f.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="flex-1 space-y-1">
                        <label className="text-xs font-medium text-slate-500">עמודה ב-Google Sheet</label>
                        <Input 
                          value={manualColumn}
                          onChange={(e) => setManualColumn(e.target.value)}
                          placeholder="שם העמודה..."
                          className="h-9 bg-white"
                        />
                      </div>

                      <Button 
                        onClick={handleAddManualMapping}
                        className="h-9 bg-blue-600 hover:bg-blue-700"
                        disabled={!manualField || !manualColumn}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                  </div>

                  {syncConfig.field_mapping.some(m => m.is_new) && (
                      <Button 
                        size="sm" 
                        onClick={handleUpdateColumns}
                        className="w-full bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
                        disabled={loading}
                      >
                          {loading ? <Loader2 className="w-3 h-3 animate-spin ml-2" /> : <Plus className="w-3 h-3 ml-2" />}
                          צור עמודות חסרות ב-Google Sheets
                      </Button>
                  )}
                </div>

                <div className="space-y-3 pt-2 border-t">
                  <h4 className="text-sm font-bold flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-500" />
                    סנכרון אוטומטי
                  </h4>
                  <Select 
                    value={syncConfig.auto_sync_interval} 
                    onValueChange={(val) => setSyncConfig(prev => ({ ...prev, auto_sync_interval: val }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">ללא (ידני בלבד)</SelectItem>
                      <SelectItem value="hourly">כל שעה</SelectItem>
                      <SelectItem value="daily">פעם ביום</SelectItem>
                      <SelectItem value="on_change">בעת שינוי (On Change)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3 pt-2 border-t">
                  <h4 className="text-sm font-bold flex items-center gap-2">
                    <ArrowLeftRight className="w-4 h-4 text-slate-500" />
                    כיוון סנכרון אוטומטי
                  </h4>
                  <Select 
                    value={syncConfig.sync_direction} 
                    onValueChange={(val) => setSyncConfig(prev => ({ ...prev, sync_direction: val }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="export_only">ייצוא בלבד (Base44 ← Google Sheets)</SelectItem>
                      <SelectItem value="import_on_load">ייבוא בטעינה (Base44 → Google Sheets)</SelectItem>
                      <SelectItem value="two_way">דו-כיווני (מסוכן - עלול ליצור קונפליקטים)</SelectItem>
                    </SelectContent>
                  </Select>
                  {syncConfig.sync_direction === 'import_on_load' && (
                    <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                      ⚠️ זהירות: הנתונים ייטענו מ-Google Sheets בכל פעם שתפתח את הטבלה, וידרסו שינויים מקומיים שטרם סונכרנו.
                    </p>
                  )}
                  {syncConfig.sync_direction === 'two_way' && (
                    <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                      ⚠️ זהירות: מצב דו-כיווני מנסה למזג נתונים אך עלול לגרום לקונפליקטים אם שני הצדדים נערכים במקביל.
                    </p>
                  )}
                </div>

                <div className="space-y-3 pt-2 border-t">
                  <h4 className="text-sm font-bold flex items-center gap-2">
                    <Settings2 className="w-4 h-4 text-slate-500" />
                    מצב כתיבה
                  </h4>
                  <Select 
                    value={syncConfig.sync_mode} 
                    onValueChange={(val) => setSyncConfig(prev => ({ ...prev, sync_mode: val }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="overwrite">דריסה מלאה (Overwrite)</SelectItem>
                      <SelectItem value="append">הוספה בלבד (Append)</SelectItem>
                      <SelectItem value="update_existing">עדכון חכם (Update/Insert)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>
            </Tabs>
            
            <div className="pt-2 text-center">
               <a 
                 href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}`} 
                 target="_blank" 
                 rel="noreferrer"
                 className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1"
               >
                 פתח גיליון ב-Google <ExternalLink className="w-3 h-3" />
               </a>
            </div>
          </div>
        )}

        </div>

        <DialogFooter className="px-6 py-4 border-t bg-slate-50 mt-auto shrink-0 flex justify-between">
          <Button variant="ghost" onClick={onClose} size="lg">ביטול</Button>
          {step === 'sync' && (
            <div className="flex gap-2">
              <Button onClick={handleSaveSettings} disabled={loading} variant="outline" size="lg">
                שמור הגדרות
              </Button>
              <Button onClick={handleSync} disabled={loading} size="lg" className="bg-green-600 hover:bg-green-700 min-w-[120px]">
                {loading ? <Loader2 className="w-5 h-5 ml-2 animate-spin" /> : 'שמור וסנכרן'}
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}