import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Download, Upload, ShieldCheck, Database, RefreshCw, Settings, CalendarClock, CheckCircle2, AlertTriangle, FileText, X, Clock, Trash2, Save } from "lucide-react";
import { exportEntities } from "@/functions/exportEntities";
import { importBackupJson } from "@/functions/importBackupJson";
import EntityImporter from "@/components/backup/EntityImporter";
import { User } from "@/entities/User";
import { exportAllData } from "@/functions/exportAllData";
import { importBackupData } from "@/functions/importBackupData";
import { base44 } from "@/api/base44Client";
import { manualBackup } from "@/functions/manualBackup";
import { restoreBackup } from "@/functions/restoreBackup";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const CATEGORY_INFO = {
  "Client": { label: "לקוחות", icon: "👥", color: "blue", description: "כל נתוני הלקוחות ופרטי הקשר" },
  "Project": { label: "פרויקטים", icon: "🏗️", color: "purple", description: "פרויקטים, תקציבים ולוחות זמנים" },
  "Task": { label: "משימות", icon: "✅", color: "green", description: "משימות, מטלות ופעולות" },
  "TimeLog": { label: "שעות עבודה", icon: "⏱️", color: "orange", description: "תיעוד שעות עבודה" },
  "Quote": { label: "הצעות מחיר", icon: "💰", color: "yellow", description: "הצעות מחיר ללקוחות" },
  "Invoice": { label: "חשבוניות", icon: "🧾", color: "red", description: "חשבוניות וחיובים" },
  "Decision": { label: "החלטות", icon: "🎯", color: "indigo", description: "החלטות פרויקטליות" },
  "ClientApproval": { label: "אישורי לקוח", icon: "✔️", color: "teal", description: "אישורים מלקוחות" },
  "ClientFeedback": { label: "משוב לקוחות", icon: "💬", color: "pink", description: "פידבקים והערות" },
  "CommunicationMessage": { label: "הודעות", icon: "📧", color: "cyan", description: "תקשורת עם לקוחות" },
  "Document": { label: "מסמכים", icon: "📄", color: "slate", description: "קבצים ומסמכים" },
  "TeamMember": { label: "חברי צוות", icon: "👤", color: "violet", description: "נתוני צוות" },
  "AccessControl": { label: "הרשאות", icon: "🔐", color: "red", description: "ניהול הרשאות גישה" },
  "ClientFile": { label: "קבצי לקוחות", icon: "📁", color: "blue", description: "קבצים של לקוחות" },
  "QuoteFile": { label: "קבצי הצעות", icon: "📎", color: "yellow", description: "קבצים מצורפים להצעות" },
  "Meeting": { label: "פגישות", icon: "📅", color: "blue", description: "פגישות ואירועים" },
  "UserPreferences": { label: "העדפות משתמש", icon: "⚙️", color: "gray", description: "הגדרות אישיות" },
  "Notification": { label: "התראות", icon: "🔔", color: "orange", description: "התראות ועדכונים" },
  "WorkflowAutomation": { label: "אוטומציות", icon: "🤖", color: "purple", description: "תהליכים אוטומטיים" },
  "InternalChat": { label: "צ'אט פנימי", icon: "💭", color: "blue", description: "שיחות צוות פנימיות" },
  "InternalMessage": { label: "הודעות פנימיות", icon: "✉️", color: "cyan", description: "הודעות בין חברי צוות" },
  "ChatConversation": { label: "שיחות AI", icon: "🤖", color: "indigo", description: "שיחות עם AI" },
  "CustomSpreadsheet": { label: "טבלאות מותאמות", icon: "📊", color: "green", description: "טבלאות אקסל מותאמות" },
  "DailyReportSchedule": { label: "דוחות יומיים", icon: "📈", color: "blue", description: "תזמון דוחות" },
  "SubTask": { label: "תת-משימות", icon: "📝", color: "green", description: "משימות משנה" },
  "MessageTemplate": { label: "תבניות הודעות", icon: "📋", color: "purple", description: "תבניות למסרים" },
  "AIInsight": { label: "תובנות AI", icon: "🧠", color: "violet", description: "תובנות ממערכת AI" },
  "AutomationRule": { label: "כללי אוטומציה", icon: "⚡", color: "yellow", description: "חוקי אוטומציה" }
};

const ALL_CATEGORIES = Object.keys(CATEGORY_INFO);

export default function BackupPage() {
  const [selected, setSelected] = useState(new Set(["Client","Task","TimeLog"]));
  const [importerEntity, setImporterEntity] = useState(null);
  const [busy, setBusy] = useState(false);
  const [autoEnabled, setAutoEnabled] = useState(false);
  const [autoFreq, setAutoFreq] = useState("daily");
  const [lastRun, setLastRun] = useState(null);
  const [exportFormat, setExportFormat] = useState("json");
  const [importFile, setImportFile] = useState(null);
  const [importMode, setImportMode] = useState('create');
  const [dragActive, setDragActive] = useState(false);
  
  // NEW: State for record counts per category
  const [categoryCounts, setCategoryCounts] = useState({});
  const [loadingCounts, setLoadingCounts] = useState(true);
  
  // NEW: Backup history and settings
  const [backupHistory, setBackupHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [backupSettings, setBackupSettings] = useState(null);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [selectedBackupForRestore, setSelectedBackupForRestore] = useState(null);

  useEffect(() => {
    // load user backup prefs
    (async () => {
      try {
        const me = await User.me().catch(() => null);
        if (me) {
          setAutoEnabled(!!me.backup_auto_enabled);
          setAutoFreq(me.backup_auto_frequency || "daily");
          setLastRun(me.backup_last_run_at || null);
          const cats = Array.isArray(me.backup_selected_categories) ? me.backup_selected_categories : [];
          if (cats.length) setSelected(new Set(cats));
        }
      } catch {}
    })();
  }, []);

  // NEW: Effect to load record counts for each category
  useEffect(() => {
    const loadCounts = async () => {
      setLoadingCounts(true);
      const counts = {};
      
      for (const category of ALL_CATEGORIES) {
        try {
          if (base44.entities && base44.entities[category]) {
            // Using .list() with a limit to estimate count, as a direct .count() might not be available
            // and fetching all records for very large collections can be slow.
            // If base44.entities[category].count() was available, that would be preferred.
            const records = await base44.entities[category].list('-created_date', 10000); // Fetch up to 10,000 records
            counts[category] = records.length;
          } else {
            counts[category] = 0; // Or indicate not applicable/available
          }
        } catch (error) {
          console.error(`Error counting ${category}:`, error);
          counts[category] = '?'; // Indicate an error occurred
        }
      }
      
      setCategoryCounts(counts);
      setLoadingCounts(false);
    };

    loadCounts();
  }, []); // Run once on component mount

  // Load backup history
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const backups = await base44.entities.Backup.list('-backup_date', 100);
        setBackupHistory(backups || []);
      } catch (error) {
        console.error('Error loading backup history:', error);
        setBackupHistory([]);
      } finally {
        setLoadingHistory(false);
      }
    };
    
    loadHistory();
  }, []);

  // Load backup settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await base44.entities.BackupSettings.list();
        if (settings.length > 0) {
          setBackupSettings(settings[0]);
        }
      } catch (error) {
        console.error('Error loading backup settings:', error);
      }
    };
    
    loadSettings();
  }, []);

  useEffect(() => {
    // auto backup on page open if needed
    (async () => {
      if (!autoEnabled) return;
      const now = new Date();
      const last = lastRun ? new Date(lastRun) : null;
      let shouldRun = false;
      if (!last) shouldRun = true;
      else if (autoFreq === "daily") shouldRun = (now.getDate() !== last.getDate()) || (now - last > 24*3600*1000);
      else if (autoFreq === "weekly") shouldRun = (now - last > 7*24*3600*1000);

      if (shouldRun && selected.size > 0 && !busy) {
        await handleExport('json'); // Auto-backup always exports as JSON
        await User.updateMyUserData({ backup_last_run_at: new Date().toISOString() });
        setLastRun(new Date().toISOString());
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoEnabled, autoFreq, lastRun]);

  const toggleCategory = (name) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };

  const handleExport = async (format = exportFormat) => {
    setBusy(true);
    try {
      const categories = Array.from(selected);
      console.log("[Backup] Starting export with format:", format, "categories:", categories);
      
      if (format === 'json') {
        const response = await exportEntities({ categories, format: 'json' });
        console.log("[Backup] exportEntities response:", response);
        
        const jsonData = JSON.stringify(response.data || response, null, 2); // Ensure it's stringified JSON
        const blob = new Blob([jsonData], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        URL.revokeObjectURL(url);
        a.remove();
      } else {
        // For Excel/CSV/XML, use the exportAllData function
        console.log("[Backup] Calling exportAllData with:", { format, categories });
        const response = await exportAllData({ format, categories });
        console.log("[Backup] exportAllData response size:", response.data?.length || 'unknown');
        
        if (!response.data) {
          console.error("[Backup] No data in response:", response);
          alert('שגיאה: לא התקבלו נתונים מהשרת');
          return;
        }
        
        const blob = new Blob([response.data], { 
          type: format === 'excel' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' :
                format === 'csv' ? 'text/csv; charset=utf-8' :
                format === 'xml' ? 'application/xml; charset=utf-8' : 'application/octet-stream'
        });
        
        console.log("[Backup] Created blob size:", blob.size, "bytes");
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const ext = format === 'excel' ? 'xlsx' : format;
        a.download = `backup-${new Date().toISOString().split('T')[0]}.${ext}`;
        document.body.appendChild(a);
        a.click();
        URL.revokeObjectURL(url);
        a.remove();
      }
      
      console.log("[Backup] Export completed successfully");
    } catch (error) {
      console.error('Export error:', error);
      alert('שגיאה ביצוא הנתונים: ' + (error?.message || error?.response?.data?.error || 'שגיאה לא ידועה'));
    }
    setBusy(false);
  };

  const handleImportFile = async (file) => {
    if (!file) return;
    setBusy(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('mode', importMode);

      console.log("[Backup] Starting import for file:", file.name, "with mode:", importMode);
      const response = await importBackupData(formData);
      
      if (response.data?.success) {
        const { totals, results } = response.data;
        let message = `ייבוא הושלם בהצלחה!\n`;
        message += `נוצרו: ${totals.created} רשומות\n`;
        if (totals.updated > 0) message += `עודכנו: ${totals.updated} רשומות\n`;
        if (totals.errors > 0) message += `שגיאות: ${totals.errors} רשומות\n`;
        
        alert(message);
        setImportFile(null); // Clear selected file after successful import
      } else {
        alert('שגיאה בייבוא: ' + (response.data?.error || 'שגיאה לא ידועה'));
      }
    } catch (error) {
      console.error('Import error:', error);
      alert('שגיאה בייבוא הנתונים: ' + (error?.message || error));
    } finally {
      setBusy(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setImportFile(file);
    }
    e.target.value = ''; // Clear the input so same file can be selected again
  };

  const handleDragEvents = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setImportFile(file);
    }
  };

  const saveAutoSettings = async () => {
    await User.updateMyUserData({
      backup_auto_enabled: autoEnabled,
      backup_auto_frequency: autoFreq,
      backup_selected_categories: Array.from(selected)
    });
  };

  const handleManualBackup = async () => {
    setIsCreatingBackup(true);
    try {
      const response = await manualBackup({});
      if (response.data?.success) {
        alert(`✅ גיבוי ידני הושלם!\n\n📊 סה"כ רשומות: ${response.data.total_records.toLocaleString()}\n📁 הקובץ נשמר בהצלחה`);
        
        // Reload history
        const backups = await base44.entities.Backup.list('-backup_date', 100);
        setBackupHistory(backups || []);
      } else {
        alert('שגיאה ביצירת גיבוי: ' + (response.data?.error || 'שגיאה לא ידועה'));
      }
    } catch (error) {
      console.error('Manual backup error:', error);
      alert('שגיאה ביצירת גיבוי ידני: ' + error.message);
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const handleRestoreBackup = async () => {
    if (!selectedBackupForRestore) return;
    
    if (!confirm(`⚠️ האם אתה בטוח שברצונך לשחזר מגיבוי זה?\n\nפעולה זו תעדכן/תוסיף רשומות מהגיבוי למערכת.\nהפעולה עלולה לקחת מספר דקות.`)) {
      return;
    }

    setBusy(true);
    try {
      const response = await restoreBackup({ backup_id: selectedBackupForRestore.id });
      if (response.data?.success) {
        const results = response.data.results;
        let message = '✅ שחזור הושלם בהצלחה!\n\n';
        message += `✓ הצלחה: ${results.success.length} entities\n`;
        if (results.failed.length > 0) {
          message += `❌ נכשל: ${results.failed.length} entities\n`;
        }
        if (results.skipped.length > 0) {
          message += `⏭️ דולג: ${results.skipped.length} entities\n`;
        }
        
        alert(message);
        setShowRestoreDialog(false);
        setSelectedBackupForRestore(null);
      } else {
        alert('שגיאה בשחזור: ' + (response.data?.error || 'שגיאה לא ידועה'));
      }
    } catch (error) {
      console.error('Restore error:', error);
      alert('שגיאה בשחזור גיבוי: ' + error.message);
    } finally {
      setBusy(false);
    }
  };

  const handleSaveSettings = async (newSettings) => {
    try {
      if (backupSettings?.id) {
        await base44.entities.BackupSettings.update(backupSettings.id, newSettings);
      } else {
        const created = await base44.entities.BackupSettings.create(newSettings);
        setBackupSettings(created);
      }
      alert('✅ ההגדרות נשמרו בהצלחה');
      setShowSettings(false);
    } catch (error) {
      alert('שגיאה בשמירת הגדרות: ' + error.message);
    }
  };

  const totalSelectedRecords = useMemo(() => {
    return Array.from(selected).reduce((sum, cat) => {
      const count = categoryCounts[cat];
      return sum + (typeof count === 'number' ? count : 0);
    }, 0);
  }, [selected, categoryCounts]);

  return (
    <div className="p-6 lg:p-8 bg-gradient-to-br from-indigo-50 via-blue-50 to-slate-50 min-h-screen pl-24 lg:pl-12" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header with stats */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black text-slate-900 mb-2 flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg">
                <Database className="w-7 h-7 text-white" />
              </div>
              גיבוי וייבוא נתונים
            </h1>
            <p className="text-slate-600 text-lg">מערכת גיבוי משוכללת עם ייצוא בפורמטים מרובים</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-white rounded-xl px-6 py-3 shadow-md border border-blue-100">
              <div className="text-2xl font-bold text-blue-600">{totalSelectedRecords.toLocaleString()}</div>
              <div className="text-xs text-slate-500">רשומות נבחרות</div>
            </div>
            <div className="bg-white rounded-xl px-6 py-3 shadow-md border border-green-100">
              <div className="text-2xl font-bold text-green-600">{selected.size}</div>
              <div className="text-xs text-slate-500">קטגוריות</div>
            </div>
          </div>
        </div>

        {/* Automatic Backup Status */}
        <Card className="shadow-xl border-0 bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-l-green-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
                  <CalendarClock className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 mb-1">גיבוי אוטומטי שבועי</h3>
                  <p className="text-sm text-slate-600">הגיבוי רץ אוטומטית כל יום ראשון בשעה 02:00 ונשלח למייל המנהלים</p>
                  {lastRun && (
                    <p className="text-xs text-slate-500 mt-1">גיבוי אחרון: {new Date(lastRun).toLocaleString('he-IL')}</p>
                  )}
                </div>
              </div>
              <CheckCircle2 className="w-12 h-12 text-green-500" />
            </div>
          </CardContent>
        </Card>

        {/* בחירת קטגוריות */}
        <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm">
          <CardHeader className="border-b bg-gradient-to-l from-slate-50 to-white pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-3 text-2xl">
                <Database className="w-6 h-6 text-blue-600" />
                בחר קטגוריות לגיבוי
              </CardTitle>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setSelected(new Set(ALL_CATEGORIES))} className="gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  בחר הכל ({ALL_CATEGORIES.length})
                </Button>
                <Button size="sm" variant="outline" onClick={() => setSelected(new Set())} className="gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  נקה הכל
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {ALL_CATEGORIES.map((name) => {
                const info = CATEGORY_INFO[name];
                const count = categoryCounts[name];
                const isLoading = loadingCounts && count === undefined;
                const isSelected = selected.has(name);
                
                return (
                  <label 
                    key={name} 
                    className={`
                      relative overflow-hidden flex flex-col gap-2 p-4 rounded-xl border-2 
                      transition-all cursor-pointer group
                      ${isSelected 
                        ? 'border-blue-400 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-lg scale-105' 
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md'
                      }
                    `}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Checkbox 
                          checked={isSelected} 
                          onCheckedChange={() => toggleCategory(name)}
                          className="mt-0.5"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{info.icon}</span>
                            <span className="font-bold text-slate-900">{info.label}</span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">{info.description}</p>
                        </div>
                      </div>
                    </div>
                    <div className={`
                      mt-2 pt-2 border-t flex items-center justify-between
                      ${isSelected ? 'border-blue-200' : 'border-slate-100'}
                    `}>
                      <span className="text-xs text-slate-400 font-mono">{name}</span>
                      <div className={`
                        px-2 py-1 rounded-lg text-xs font-bold
                        ${isSelected ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}
                      `}>
                        {isLoading ? (
                          <span className="flex items-center gap-1">
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            ...
                          </span>
                        ) : (
                          <span>{count !== undefined && count !== '?' ? count.toLocaleString() : '?'}</span>
                        )}
                      </div>
                    </div>
                    {isSelected && (
                      <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-500 to-indigo-600"></div>
                    )}
                  </label>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* ייצוא נתונים */}
        <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm">
          <CardHeader className="border-b bg-gradient-to-l from-blue-50 to-white pb-4">
            <CardTitle className="flex items-center gap-3 text-2xl">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                <Download className="w-6 h-6 text-white" />
              </div>
              ייצוא נתונים
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* פורמט ייצוא */}
            <div className="flex items-center gap-4">
              <Label className="text-base font-bold text-slate-700 min-w-[120px]">בחר פורמט:</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 flex-1">
                {[
                  { value: 'json', label: 'JSON', icon: '📋', desc: 'גיבוי מלא כולל מטא-דאטה' },
                  { value: 'excel', label: 'Excel', icon: '📊', desc: 'קובץ .xlsx לעריכה' },
                  { value: 'csv', label: 'CSV', icon: '📄', desc: 'פסיקים - תואם לכל תוכנה' },
                  { value: 'xml', label: 'XML', icon: '🔖', desc: 'פורמט סטנדרטי' }
                ].map((fmt) => (
                  <button
                    key={fmt.value}
                    onClick={() => setExportFormat(fmt.value)}
                    disabled={busy}
                    className={`
                      p-4 rounded-xl border-2 transition-all text-right
                      ${exportFormat === fmt.value
                        ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-lg scale-105'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md'
                      }
                    `}
                  >
                    <div className="text-2xl mb-1">{fmt.icon}</div>
                    <div className="font-bold text-slate-900 mb-1">{fmt.label}</div>
                    <div className="text-xs text-slate-500">{fmt.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* כפתורי ייצוא */}
            <div className="flex flex-wrap gap-3">
              <Button 
                onClick={() => handleExport()} 
                disabled={busy || selected.size === 0}
                className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg px-8 py-6 text-lg h-auto"
              >
                <Download className="w-5 h-5" /> 
                {busy ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    מייצא {totalSelectedRecords.toLocaleString()} רשומות...
                  </>
                ) : (
                  `ייצא ${exportFormat.toUpperCase()} (${selected.size} קטגוריות)`
                )}
              </Button>

              <div className="flex gap-2">
                <Button variant="outline" className="gap-2 h-auto py-3" onClick={() => handleExport('json')} disabled={busy}>
                  📋 JSON מהיר
                </Button>
                <Button variant="outline" className="gap-2 h-auto py-3" onClick={() => handleExport('excel')} disabled={busy}>
                  📊 Excel מהיר
                </Button>
                <Button variant="outline" className="gap-2 h-auto py-3" onClick={() => handleExport('csv')} disabled={busy}>
                  📄 CSV מהיר
                </Button>
              </div>
            </div>

            {selected.size === 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <span className="text-sm text-amber-800">יש לבחור לפחות קטגוריה אחת לייצוא</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ייבוא נתונים */}
        <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm">
          <CardHeader className="border-b bg-gradient-to-l from-green-50 to-white pb-4">
            <CardTitle className="flex items-center gap-3 text-2xl">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
                <Upload className="w-6 h-6 text-white" />
              </div>
              ייבוא נתונים
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* אופן ייבוא */}
            <div className="flex items-center gap-4">
              <Label className="text-base font-bold text-slate-700 min-w-[120px]">אופן ייבוא:</Label>
              <div className="grid grid-cols-2 gap-3 flex-1 max-w-2xl">
                {[
                  { value: 'create', label: 'צור חדשות', icon: '➕', desc: 'רק רשומות חדשות' },
                  { value: 'update', label: 'עדכן וצור', icon: '🔄', desc: 'עדכן קיימות + צור חדשות' }
                ].map((mode) => (
                  <button
                    key={mode.value}
                    onClick={() => setImportMode(mode.value)}
                    disabled={busy}
                    className={`
                      p-4 rounded-xl border-2 transition-all text-right
                      ${importMode === mode.value
                        ? 'border-green-500 bg-gradient-to-br from-green-50 to-emerald-50 shadow-lg scale-105'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md'
                      }
                    `}
                  >
                    <div className="text-2xl mb-1">{mode.icon}</div>
                    <div className="font-bold text-slate-900 mb-1">{mode.label}</div>
                    <div className="text-xs text-slate-500">{mode.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* אזור גרירה */}
            <div
              className={`
                relative border-2 border-dashed rounded-2xl p-12 text-center transition-all
                ${dragActive 
                  ? 'border-green-500 bg-gradient-to-br from-green-50 to-emerald-50 scale-105 shadow-xl' 
                  : 'border-slate-300 bg-slate-50 hover:border-green-400 hover:bg-green-50/50'
                }
              `}
              onDragEnter={handleDragEvents}
              onDragLeave={handleDragEvents}
              onDragOver={handleDragEvents}
              onDrop={handleDrop}
            >
              <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center">
                <Upload className="w-10 h-10 text-green-600" />
              </div>
              <p className="font-bold text-slate-900 text-lg mb-2">
                גרור קובץ לכאן
              </p>
              <p className="text-slate-500 mb-6">
                או לחץ לבחירת קובץ ידנית
              </p>
              
              <input
                type="file"
                accept=".json,.xlsx,.xls,.csv"
                onChange={handleFileSelect}
                className="hidden"
                id="import-file"
                disabled={busy}
              />
              <Button
                size="lg"
                onClick={() => document.getElementById('import-file')?.click()}
                disabled={busy}
                className="gap-2 bg-white hover:bg-slate-50 text-slate-900 border-2 border-slate-200 px-8"
              >
                <Upload className="w-5 h-5" />
                בחר קובץ
              </Button>

              <div className="mt-6 flex items-center justify-center gap-6 text-sm text-slate-500">
                <span className="flex items-center gap-1">📋 JSON</span>
                <span className="flex items-center gap-1">📊 Excel</span>
                <span className="flex items-center gap-1">📄 CSV</span>
              </div>
            </div>

            {/* קובץ נבחר */}
            {importFile && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-4 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                      <FileText className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">{importFile.name}</div>
                      <div className="text-sm text-slate-600">
                        {(importFile.size / 1024).toFixed(1)} KB • {importMode === 'create' ? 'יצירת חדשות בלבד' : 'עדכון + יצירה'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      size="lg"
                      onClick={() => handleImportFile(importFile)}
                      disabled={busy}
                      className="gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg"
                    >
                      {busy ? (
                        <>
                          <RefreshCw className="w-5 h-5 animate-spin" />
                          מייבא...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-5 h-5" />
                          התחל ייבוא
                        </>
                      )}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="lg"
                      onClick={() => setImportFile(null)}
                      disabled={busy}
                    >
                      ביטול
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* הגדרות גיבוי אוטומטי בכניסה */}
        <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm">
          <CardHeader className="border-b bg-gradient-to-l from-purple-50 to-white pb-4">
            <CardTitle className="flex items-center gap-3 text-2xl">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg">
                <Settings className="w-6 h-6 text-white" />
              </div>
              גיבוי אוטומטי בעת כניסה
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-4 flex-wrap">
              <label className="flex items-center gap-3 cursor-pointer px-4 py-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                <Checkbox checked={autoEnabled} onCheckedChange={setAutoEnabled} disabled={busy} />
                <span className="font-semibold text-slate-900">הפעל גיבוי בכניסה לעמוד</span>
              </label>
              <Select value={autoFreq} onValueChange={setAutoFreq} disabled={busy || !autoEnabled}>
                <SelectTrigger className="w-40 h-12">
                  <SelectValue placeholder="תדירות" />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value="daily">פעם ביום</SelectItem>
                  <SelectItem value="weekly">פעם בשבוע</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                onClick={saveAutoSettings} 
                disabled={busy}
                className="gap-2 bg-purple-600 hover:bg-purple-700 h-12"
              >
                <CheckCircle2 className="w-4 h-4" />
                שמור הגדרות
              </Button>
            </div>
            {lastRun && (
              <div className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3">
                📅 גיבוי אחרון: {new Date(lastRun).toLocaleString('he-IL', { dateStyle: 'full', timeStyle: 'short' })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ייבוא לפי קטגוריה */}
        <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm">
          <CardHeader className="border-b bg-gradient-to-l from-orange-50 to-white pb-4">
            <CardTitle className="flex items-center gap-3 text-2xl">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg">
                <FileText className="w-6 h-6 text-white" />
              </div>
              ייבוא ממוקד לפי קטגוריה
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Label className="text-base font-bold text-slate-700">בחר קטגוריה:</Label>
              <Select onValueChange={(v) => setImporterEntity(v)} disabled={busy}>
                <SelectTrigger className="flex-1 max-w-md h-12">
                  <SelectValue placeholder="בחר קטגוריה לייבוא ממוקד" />
                </SelectTrigger>
                <SelectContent align="end">
                  {ALL_CATEGORIES.map((name) => {
                    const info = CATEGORY_INFO[name];
                    return (
                      <SelectItem key={name} value={name}>
                        <div className="flex items-center gap-2">
                          <span>{info.icon}</span>
                          <span className="font-semibold">{info.label}</span>
                          <span className="text-xs text-slate-400">({name})</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-slate-500 mt-3">
              ייבוא ממוקד מאפשר לייבא קובץ אקסל/CSV ספציפי לקטגוריה אחת בלבד
            </p>
          </CardContent>
        </Card>

        {/* Backup History */}
        <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm">
          <CardHeader className="border-b bg-gradient-to-l from-indigo-50 to-white pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-3 text-2xl">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                היסטוריית גיבויים
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  onClick={handleManualBackup}
                  disabled={isCreatingBackup || busy}
                  className="gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg"
                >
                  {isCreatingBackup ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      יוצר גיבוי...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      צור גיבוי ידני
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowSettings(true)}
                  className="gap-2"
                >
                  <Settings className="w-4 h-4" />
                  הגדרות גיבוי
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {loadingHistory ? (
              <div className="text-center py-8">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-slate-400" />
                <p className="text-slate-500 mt-2">טוען היסטוריית גיבויים...</p>
              </div>
            ) : backupHistory.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Database className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                <p className="text-lg font-semibold">אין גיבויים קיימים</p>
                <p className="text-sm mt-1">צור גיבוי ידני או המתן לגיבוי אוטומטי</p>
              </div>
            ) : (
              <div className="space-y-3">
                {backupHistory.map((backup) => (
                  <div
                    key={backup.id}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      backup.status === 'failed'
                        ? 'border-red-200 bg-red-50'
                        : 'border-slate-200 bg-white hover:border-blue-300 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          backup.backup_type === 'daily' ? 'bg-blue-100' :
                          backup.backup_type === 'weekly' ? 'bg-purple-100' :
                          'bg-green-100'
                        }`}>
                          {backup.backup_type === 'daily' && <CalendarClock className="w-6 h-6 text-blue-600" />}
                          {backup.backup_type === 'weekly' && <Database className="w-6 h-6 text-purple-600" />}
                          {backup.backup_type === 'manual' && <Download className="w-6 h-6 text-green-600" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">
                              {backup.backup_type === 'daily' ? 'גיבוי יומי' :
                               backup.backup_type === 'weekly' ? 'גיבוי שבועי' :
                               'גיבוי ידני'}
                            </span>
                            <Badge className={
                              backup.backup_type === 'daily' ? 'bg-blue-500' :
                              backup.backup_type === 'weekly' ? 'bg-purple-500' :
                              'bg-green-500'
                            }>
                              {backup.backup_type}
                            </Badge>
                            {backup.status === 'failed' && (
                              <Badge className="bg-red-500">
                                <AlertTriangle className="w-3 h-3 ml-1" />
                                נכשל
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-slate-600 mt-1">
                            {new Date(backup.backup_date).toLocaleString('he-IL', {
                              dateStyle: 'full',
                              timeStyle: 'short'
                            })}
                          </div>
                          <div className="text-xs text-slate-500 mt-1 flex items-center gap-3">
                            {backup.file_size && (
                              <span>📦 {(backup.file_size / 1024 / 1024).toFixed(2)} MB</span>
                            )}
                            {backup.entities_count && typeof backup.entities_count === 'object' && (
                              <span>📊 {Object.values(backup.entities_count).reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0).toLocaleString()} רשומות</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {backup.status === 'completed' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedBackupForRestore(backup);
                                setShowRestoreDialog(true);
                              }}
                              className="gap-2"
                            >
                              <RefreshCw className="w-4 h-4" />
                              שחזר
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(backup.file_url, '_blank')}
                              className="gap-2"
                            >
                              <Download className="w-4 h-4" />
                              הורד
                            </Button>
                          </>
                        )}
                        {backup.backup_type === 'daily' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                              if (!confirm('למחוק גיבוי זה?')) return;
                              try {
                                await base44.entities.Backup.delete(backup.id);
                                const updated = await base44.entities.Backup.list('-backup_date', 100);
                                setBackupHistory(updated || []);
                              } catch (error) {
                                alert('שגיאה במחיקת גיבוי: ' + error.message);
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* סיכום וסטטוס */}
        <Card className="shadow-xl border-0 bg-gradient-to-r from-slate-900 to-slate-800 text-white">
          <CardHeader className="border-b border-slate-700 pb-4">
            <CardTitle className="flex items-center gap-3 text-2xl text-white">
              <ShieldCheck className="w-8 h-8" />
              סיכום ומידע טכני
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="font-bold text-white/90 text-sm mb-3">📊 מצב נוכחי</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center bg-white/10 rounded-lg p-2">
                    <span className="text-white/70">קטגוריות נבחרות:</span>
                    <Badge className="bg-blue-500">{selected.size} / {ALL_CATEGORIES.length}</Badge>
                  </div>
                  <div className="flex justify-between items-center bg-white/10 rounded-lg p-2">
                    <span className="text-white/70">סה"כ רשומות לייצוא:</span>
                    <Badge className="bg-green-500">{totalSelectedRecords.toLocaleString()}</Badge>
                  </div>
                  <div className="flex justify-between items-center bg-white/10 rounded-lg p-2">
                    <span className="text-white/70">פורמט ייצוא:</span>
                    <Badge className="bg-purple-500">{exportFormat.toUpperCase()}</Badge>
                  </div>
                  <div className="flex justify-between items-center bg-white/10 rounded-lg p-2">
                    <span className="text-white/70">אופן ייבוא:</span>
                    <Badge className="bg-orange-500">{importMode === 'create' ? 'יצירה' : 'עדכון'}</Badge>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-white/90 text-sm mb-3">🔧 הגדרות</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center bg-white/10 rounded-lg p-2">
                    <span className="text-white/70">סטטוס מערכת:</span>
                    <Badge className={busy ? "bg-yellow-500 animate-pulse" : "bg-green-500"}>
                      {busy ? "עסוק 🔄" : "מוכן ✅"}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center bg-white/10 rounded-lg p-2">
                    <span className="text-white/70">גיבוי בכניסה:</span>
                    <Badge className={autoEnabled ? "bg-green-500" : "bg-slate-500"}>
                      {autoEnabled ? "פעיל ✓" : "כבוי ✗"}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center bg-white/10 rounded-lg p-2">
                    <span className="text-white/70">גיבוי שבועי:</span>
                    <Badge className="bg-green-500 animate-pulse">פעיל 🕐 02:00</Badge>
                  </div>
                  {importFile && (
                    <div className="flex justify-between items-center bg-white/10 rounded-lg p-2">
                      <span className="text-white/70">קובץ נבחר:</span>
                      <Badge className="bg-blue-500">{importFile.name.substring(0, 20)}...</Badge>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-white/20 text-xs text-white/60">
              💡 לבדיקת לוגים מפורטים: F12 → Console
            </div>
          </CardContent>
        </Card>

        {/* ייבוא לפי קטגוריה - מודל */}
        {importerEntity && (
          <EntityImporter
            open={!!importerEntity}
            entityName={importerEntity}
            onClose={() => setImporterEntity(null)}
            onDone={() => setImporterEntity(null)}
          />
        )}

        {/* Restore Dialog */}
        <Dialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
          <DialogContent className="sm:max-w-lg" dir="rtl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <RefreshCw className="w-6 h-6 text-blue-600" />
                שחזור מגיבוי
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {selectedBackupForRestore && (
                <>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="font-bold text-slate-900 mb-2">
                      {selectedBackupForRestore.backup_type === 'daily' ? '📅 גיבוי יומי' :
                       selectedBackupForRestore.backup_type === 'weekly' ? '📆 גיבוי שבועי' :
                       '💾 גיבוי ידני'}
                    </div>
                    <div className="text-sm text-slate-600">
                      {new Date(selectedBackupForRestore.backup_date).toLocaleString('he-IL', {
                        dateStyle: 'full',
                        timeStyle: 'short'
                      })}
                    </div>
                    {selectedBackupForRestore.entities_count && (
                      <div className="text-xs text-slate-500 mt-2">
                        📊 {Object.values(selectedBackupForRestore.entities_count).reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0).toLocaleString()} רשומות
                      </div>
                    )}
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-amber-900">
                        <p className="font-semibold mb-1">⚠️ שים לב:</p>
                        <p>• הפעולה תעדכן רשומות קיימות ותוסיף חדשות</p>
                        <p>• הפעולה עלולה לקחת מספר דקות</p>
                        <p>• מומלץ ליצור גיבוי נוסף לפני השחזור</p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRestoreDialog(false)} disabled={busy}>
                ביטול
              </Button>
              <Button
                onClick={handleRestoreBackup}
                disabled={busy}
                className="bg-blue-600 hover:bg-blue-700 gap-2"
              >
                {busy ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    משחזר...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    שחזר עכשיו
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Backup Settings Dialog */}
        <Dialog open={showSettings} onOpenChange={setShowSettings}>
          <DialogContent className="sm:max-w-2xl" dir="rtl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <Settings className="w-6 h-6 text-purple-600" />
                הגדרות גיבוי מתקדמות
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div>
                    <div className="font-semibold text-slate-900">גיבוי יומי אוטומטי</div>
                    <div className="text-sm text-slate-600">הפעל/כבה גיבוי יומי אוטומטי</div>
                  </div>
                  <Checkbox
                    checked={backupSettings?.daily_backup_enabled !== false}
                    onCheckedChange={(checked) => setBackupSettings({
                      ...backupSettings,
                      daily_backup_enabled: checked
                    })}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="font-semibold text-slate-900">תדירות גיבוי יומי (שעות):</Label>
                  <Input
                    type="number"
                    min="1"
                    max="168"
                    value={backupSettings?.daily_backup_interval_hours || 24}
                    onChange={(e) => setBackupSettings({
                      ...backupSettings,
                      daily_backup_interval_hours: parseInt(e.target.value) || 24
                    })}
                    className="max-w-xs"
                  />
                  <p className="text-xs text-slate-500">כל כמה שעות לבצע גיבוי (1-168 שעות)</p>
                </div>

                <div className="space-y-2">
                  <Label className="font-semibold text-slate-900">מקסימום גיבויים יומיים:</Label>
                  <Input
                    type="number"
                    min="5"
                    max="100"
                    value={backupSettings?.max_daily_backups || 10}
                    onChange={(e) => setBackupSettings({
                      ...backupSettings,
                      max_daily_backups: parseInt(e.target.value) || 10
                    })}
                    className="max-w-xs"
                  />
                  <p className="text-xs text-slate-500">גיבויים ישנים יותר יימחקו אוטומטית (5-100)</p>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div>
                    <div className="font-semibold text-slate-900">התראות על כישלון</div>
                    <div className="text-sm text-slate-600">שלח אימייל במקרה של כישלון בגיבוי</div>
                  </div>
                  <Checkbox
                    checked={backupSettings?.notify_on_failure !== false}
                    onCheckedChange={(checked) => setBackupSettings({
                      ...backupSettings,
                      notify_on_failure: checked
                    })}
                  />
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-900">
                    <p className="font-semibold mb-1">💡 מידע חשוב:</p>
                    <p>• גיבויים יומיים ישמרו עד ל-{backupSettings?.max_daily_backups || 10} האחרונים</p>
                    <p>• גיבויים שבועיים נשמרים תמיד ולא נמחקים אוטומטית</p>
                    <p>• גיבויים ידניים נשמרים עד שתמחק אותם ידנית</p>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowSettings(false)}>
                ביטול
              </Button>
              <Button
                onClick={() => handleSaveSettings(backupSettings)}
                className="bg-purple-600 hover:bg-purple-700 gap-2"
              >
                <Save className="w-4 h-4" />
                שמור הגדרות
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}