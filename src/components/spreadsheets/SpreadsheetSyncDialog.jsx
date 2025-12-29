import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, RefreshCw, Upload, Download, Check, AlertCircle, ExternalLink, FileSpreadsheet, Clock, ArrowLeftRight, Settings2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { ScrollArea } from "@/components/ui/scroll-area";

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
    field_mapping: []
  });

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

  const loadSheets = async (id) => {
    setLoading(true);
    try {
      const { data } = await base44.functions.invoke('googleSheets', {
        action: 'getSheets',
        spreadsheetId: id
      });
      
      if (data.success) {
        setAvailableSheets(data.sheets);
        const targetSheet = sheetName || data.sheets[0]?.title;
        if (!sheetName && data.sheets.length > 0) {
          setSheetName(data.sheets[0].title);
        }
        setStep('sync');
        onSaveLink(id, targetSheet);
        
        // Fetch headers for the selected/default sheet
        if (targetSheet) {
            loadHeaders(id, targetSheet);
        }
      } else {
        if (data.error && data.error.includes('No authentication')) {
           setStep('auth_needed');
        } else {
           toast.error('לא ניתן לטעון גיליונות. וודא שהמזהה תקין ושיש הרשאות.');
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

  const handleSync = async () => {
    setLoading(true);
    try {
      if (syncDirection === 'export') {
        await onExport(spreadsheetId, sheetName, syncConfig.sync_mode);
        toast.success('יוצא ל-Google Sheets בהצלחה');
      } else {
        await onImport(spreadsheetId, sheetName, syncConfig.sync_mode);
        toast.success('יובא מ-Google Sheets בהצלחה');
      }
      onSaveLink(spreadsheetId, sheetName, syncConfig);
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
      <DialogContent dir="rtl" className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-green-600" />
            סנכרון עם Google Sheets
          </DialogTitle>
        </DialogHeader>

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
              </TabsList>

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

              <TabsContent value="settings" className="space-y-4 pt-4 h-[400px]">
                <ScrollArea className="h-full pr-4">
                
                {/* Field Mapping UI */}
                <div className="space-y-3 mb-6">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold flex items-center gap-2">
                        <ArrowLeftRight className="w-4 h-4 text-slate-500" />
                        מיפוי שדות
                    </h4>
                    <Button variant="ghost" size="sm" onClick={handleAutoMap} className="text-blue-600 text-xs h-7">
                        <RefreshCw className="w-3 h-3 ml-1" />
                        מיפוי אוטומטי
                    </Button>
                  </div>

                  <div className="border rounded-lg overflow-hidden text-sm">
                      <div className="grid grid-cols-2 bg-slate-50 p-2 font-medium border-b">
                          <div>שדה במערכת</div>
                          <div>עמודה ב-Google Sheet</div>
                      </div>
                      <div className="divide-y max-h-[200px] overflow-y-auto">
                          {syncConfig.field_mapping.map((mapping, idx) => (
                              <div key={idx} className="grid grid-cols-2 p-2 items-center gap-2">
                                  <div className="truncate" title={mapping.entity_field}>
                                      {SYSTEM_FIELDS.find(f => f.value === mapping.entity_field)?.label || 
                                       customFields.find(f => `custom_data.${f.key}` === mapping.entity_field)?.label ||
                                       mapping.entity_field}
                                  </div>
                                  <div className="flex items-center gap-2">
                                      {mapping.is_new ? (
                                          <span className="text-green-600 text-xs bg-green-50 px-2 py-1 rounded flex-1 truncate">
                                              + {mapping.sheet_column} (חדש)
                                          </span>
                                      ) : (
                                          <span className="text-slate-700 bg-slate-50 px-2 py-1 rounded flex-1 truncate">
                                              {mapping.sheet_column}
                                          </span>
                                      )}
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-6 w-6 text-red-400 hover:text-red-600"
                                        onClick={() => {
                                            const newMapping = [...syncConfig.field_mapping];
                                            newMapping.splice(idx, 1);
                                            setSyncConfig({ ...syncConfig, field_mapping: newMapping });
                                        }}
                                      >
                                          <Trash2 className="w-3 h-3" />
                                      </Button>
                                  </div>
                              </div>
                          ))}
                          {syncConfig.field_mapping.length === 0 && (
                              <div className="p-4 text-center text-slate-400 text-xs">
                                  לא הוגדר מיפוי. לחץ על "מיפוי אוטומטי" או הוסף ידנית.
                              </div>
                          )}
                      </div>
                  </div>

                  <div className="flex gap-2">
                      <Select 
                        onValueChange={(val) => {
                            const label = SYSTEM_FIELDS.find(f => f.value === val)?.label || 
                                          customFields.find(f => `custom_data.${f.key}` === val)?.label;
                            
                            // Check if already mapped
                            if (syncConfig.field_mapping.some(m => m.entity_field === val)) return;

                            setSyncConfig(prev => ({
                                ...prev,
                                field_mapping: [...prev.field_mapping, {
                                    entity_field: val,
                                    sheet_column: label,
                                    entity_type: 'client',
                                    is_new: !sheetHeaders.includes(label)
                                }]
                            }));
                        }}
                      >
                          <SelectTrigger className="flex-1 h-8 text-xs">
                              <SelectValue placeholder="הוסף שדה למיפוי..." />
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

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>ביטול</Button>
          {step === 'sync' && (
            <Button onClick={handleSync} disabled={loading} className="bg-green-600 hover:bg-green-700">
              {loading ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : 'בצע סנכרון'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}