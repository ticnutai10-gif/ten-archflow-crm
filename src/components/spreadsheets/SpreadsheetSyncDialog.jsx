import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, RefreshCw, Upload, Download, Check, AlertCircle, ExternalLink, FileSpreadsheet, Clock, ArrowLeftRight, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { googleSheets } from "@/functions/googleSheets";

export default function SpreadsheetSyncDialog({ open, onClose, spreadsheet, onImport, onExport, onSaveLink }) {
  const [step, setStep] = useState('connect'); // connect, select, sync
  const [loading, setLoading] = useState(false);
  const [spreadsheetId, setSpreadsheetId] = useState(spreadsheet?.google_sheet_id || '');
  const [sheetName, setSheetName] = useState(spreadsheet?.google_sheet_name || '');
  const [availableSheets, setAvailableSheets] = useState([]);
  const [syncDirection, setSyncDirection] = useState('export'); // export (to google), import (from google)
  const [syncConfig, setSyncConfig] = useState({
    auto_sync_interval: 'none',
    sync_mode: 'overwrite',
    field_mapping: []
  });

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
        if (!sheetName && data.sheets.length > 0) {
          setSheetName(data.sheets[0].title);
        }
        setStep('sync');
        onSaveLink(id, sheetName || data.sheets[0]?.title);
      } else {
        if (data.error && data.error.includes('No authentication')) {
           // Prompt for auth
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

              <TabsContent value="settings" className="space-y-4 pt-4">
                {/* Field Mapping Section */}
                <div className="space-y-3">
                  <h4 className="text-sm font-bold flex items-center gap-2">
                    <ArrowLeftRight className="w-4 h-4 text-slate-500" />
                    ניהול עמודות ב-Google Sheets
                  </h4>
                  
                  <div className="bg-slate-50 p-3 rounded-lg space-y-3">
                    <p className="text-xs text-slate-600">
                      באפשרותך ליצור אוטומטית עמודות בגיליון Google עבור כל השדות במערכת, כולל שדות מותאמים אישית.
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full bg-white hover:bg-blue-50 text-blue-700 border-blue-200"
                      onClick={async () => {
                        if (!confirm("האם לעדכן את שורת הכותרת (שורה 1) בגיליון עם כל השדות הקיימים?")) return;
                        
                        setLoading(true);
                        try {
                          // Fetch custom fields
                          const settings = await base44.entities.AppSettings.filter({ setting_key: 'client_custom_fields_schema' });
                          const customFields = settings[0]?.value?.fields || [];
                          
                          // Default fields + Custom fields
                          const defaultHeaders = [
                            'שם', 'טלפון', 'אימייל', 'חברה', 'כתובת', 
                            'סטטוס', 'מקור הגעה', 'טווח תקציב', 'הערות', 'תאריך יצירה'
                          ];
                          
                          const customHeaders = customFields.map(f => f.label);
                          const allHeaders = [...defaultHeaders, ...customHeaders];
                          
                          const { data } = await base44.functions.invoke('googleSheets', {
                            action: 'updateHeaders',
                            spreadsheetId,
                            sheetName,
                            headers: allHeaders
                          });
                          
                          if (data.success) {
                            toast.success('עמודות עודכנו בהצלחה!');
                          } else {
                            toast.error('שגיאה בעדכון עמודות: ' + (data.error || 'Unknown'));
                          }
                        } catch(e) {
                          toast.error('שגיאה: ' + e.message);
                        } finally {
                          setLoading(false);
                        }
                      }}
                    >
                      <Settings2 className="w-3 h-3 ml-2" />
                      עדכן עמודות בגיליון (צור חסרות)
                    </Button>
                  </div>
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