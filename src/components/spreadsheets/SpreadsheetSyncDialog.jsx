import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, RefreshCw, Upload, Download, Check, AlertCircle, ExternalLink, FileSpreadsheet } from "lucide-react";
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

  useEffect(() => {
    if (open) {
      if (spreadsheet?.google_sheet_id) {
        setStep('sync');
        setSpreadsheetId(spreadsheet.google_sheet_id);
        setSheetName(spreadsheet.google_sheet_name || '');
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
        await onExport(spreadsheetId, sheetName);
        toast.success('יוצא ל-Google Sheets בהצלחה');
      } else {
        await onImport(spreadsheetId, sheetName);
        toast.success('יובא מ-Google Sheets בהצלחה');
      }
      onSaveLink(spreadsheetId, sheetName);
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
            <div className="p-2 bg-green-50 border border-green-200 rounded text-sm text-green-800 flex items-center gap-2">
              <Check className="w-4 h-4" />
              מחובר לגיליון
            </div>
            
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
                  className="justify-start"
                >
                  <Upload className="w-4 h-4 ml-2" />
                  ייצוא לגוגל
                </Button>
                <Button 
                  variant={syncDirection === 'import' ? 'default' : 'outline'}
                  onClick={() => setSyncDirection('import')}
                  className="justify-start"
                >
                  <Download className="w-4 h-4 ml-2" />
                  ייבוא מגוגל
                </Button>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {syncDirection === 'export' 
                  ? 'הנתונים בטבלה זו ידרוס את הנתונים בגיליון Google שנבחר.' 
                  : 'הנתונים מגיליון Google יחליפו את הנתונים בטבלה זו.'}
              </p>
            </div>
            
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