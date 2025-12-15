import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Download, Upload, ShieldCheck, Database, RefreshCw, Settings, CalendarClock, CheckCircle2, AlertTriangle, FileText } from "lucide-react";
import { exportEntities } from "@/functions/exportEntities";
import { importBackupJson } from "@/functions/importBackupJson";
import EntityImporter from "@/components/backup/EntityImporter";
import { User } from "@/entities/User";
import { exportAllData } from "@/functions/exportAllData";
import { importBackupData } from "@/functions/importBackupData";
import { base44 } from "@/api/base44Client";

const ALL_CATEGORIES = [
  "Client","Project","Task","TimeLog","Quote","Invoice","Decision","ClientApproval","ClientFeedback","CommunicationMessage","Document","TeamMember","AccessControl","ClientFile","QuoteFile","Meeting","UserPreferences","Notification","WorkflowAutomation","InternalChat","InternalMessage","ChatConversation","CustomSpreadsheet","DailyReportSchedule","SubTask","MessageTemplate","AIInsight","AutomationRule"
];

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

  return (
    <div className="p-6 lg:p-8 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen pl-24 lg:pl-12" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">גיבוי וייבוא נתונים</h1>
            <p className="text-slate-600">ייצוא/ייבוא לפי קטגוריות או הכל יחד + גיבוי אוטומטי</p>
          </div>
          <Badge variant="outline" className="bg-white">בטא</Badge>
        </div>

        {/* בחירת קטגוריות */}
        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 justify-end"><Database className="w-5 h-5" /> קטגוריות לגיבוי</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-3 gap-4">
            {ALL_CATEGORIES.map((name) => {
              const count = categoryCounts[name];
              const isLoading = loadingCounts && count === undefined; // Check if still loading AND count hasn't been set yet
              
              return (
                <label key={name} className="flex flex-col gap-2 p-3 border rounded-lg bg-white hover:bg-slate-50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <Checkbox checked={selected.has(name)} onCheckedChange={() => toggleCategory(name)} />
                    <span className="font-medium">{name}</span>
                  </div>
                  <div className="mr-7 text-xs text-slate-500">
                    {isLoading ? (
                      <span className="flex items-center gap-1">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        טוען...
                      </span>
                    ) : (
                      <span>{count !== undefined && count !== '?' ? `${count} רשומות` : 'לא זמין'}</span>
                    )}
                  </div>
                </label>
              );
            })}
            <div className="md:col-span-3 flex items-center gap-3">
              <Button variant="outline" onClick={() => setSelected(new Set(ALL_CATEGORIES))}>בחר הכל</Button>
              <Button variant="outline" onClick={() => setSelected(new Set())}>נקה הכל</Button>
            </div>
          </CardContent>
        </Card>

        {/* פעולות מהירות */}
        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 justify-end"><Settings className="w-5 h-5" /> פעולות</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6"> {/* Added space-y-6 for separation between sections */}
            {/* ייצוא נתונים */}
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <Download className="w-4 h-4" /> ייצוא נתונים
              </h3>
              
              <div className="flex items-center gap-3">
                <Label className="text-sm font-semibold">פורמט ייצוא:</Label>
                <Select value={exportFormat} onValueChange={setExportFormat} disabled={busy}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="בחר פורמט" />
                  </SelectTrigger>
                  <SelectContent align="end">
                    <SelectItem value="json">JSON (גיבוי מלא)</SelectItem>
                    <SelectItem value="excel">Excel (.xlsx)</SelectItem>
                    <SelectItem value="csv">CSV (פסיקים)</SelectItem>
                    <SelectItem value="xml">XML</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-wrap gap-3 items-center">
                <Button className="gap-2" onClick={() => handleExport()} disabled={busy || selected.size === 0}>
                  <Download className="w-4 h-4" /> 
                  {busy ? "מייצא..." : `ייצא ${exportFormat.toUpperCase()} (נבחר)`}
                </Button>

                <Button variant="outline" className="gap-2" onClick={() => handleExport('json')} disabled={busy}>
                  JSON מהיר
                </Button>
                <Button variant="outline" className="gap-2" onClick={() => handleExport('excel')} disabled={busy}>
                  Excel מהיר
                </Button>
              </div>
            </div>

            {/* מפריד */}
            <div className="border-t"></div>

            {/* ייבוא נתונים */}
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <Upload className="w-4 h-4" /> ייבוא נתונים
              </h3>

              <div className="flex items-center gap-3">
                <Label className="text-sm font-semibold">אופן ייבוא:</Label>
                <Select value={importMode} onValueChange={setImportMode} disabled={busy}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="בחר אופן ייבוא" />
                  </SelectTrigger>
                  <SelectContent align="end">
                    <SelectItem value="create">צור רשומות חדשות בלבד</SelectItem>
                    <SelectItem value="update">עדכן קיימות או צור חדשות</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* אזור גרירה לייבוא */}
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                  dragActive ? 'border-blue-400 bg-blue-50' : 'border-slate-300 hover:border-slate-400'
                }`}
                onDragEnter={handleDragEvents}
                onDragLeave={handleDragEvents}
                onDragOver={handleDragEvents}
                onDrop={handleDrop}
              >
                <Upload className="w-8 h-8 text-slate-400 mx-auto mb-3" />
                <p className="font-medium text-slate-700 mb-2">
                  גרור קובץ לכאן או לחץ לבחירה
                </p>
                <p className="text-sm text-slate-500 mb-4">
                  תומך ב-JSON, Excel (.xlsx), CSV
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
                  variant="outline"
                  onClick={() => document.getElementById('import-file')?.click()}
                  disabled={busy}
                >
                  <Upload className="w-4 h-4 ml-2" />
                  בחר קובץ
                </Button>
              </div>

              {/* קובץ נבחר */}
              {importFile && (
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-500" />
                    <span className="text-sm font-medium">{importFile.name}</span>
                    <span className="text-xs text-slate-500">
                      ({(importFile.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      size="sm"
                      onClick={() => handleImportFile(importFile)}
                      disabled={busy}
                    >
                      {busy ? <RefreshCw className="w-4 h-4 animate-spin ml-1" /> : null}
                      {busy ? "מייבא..." : "התחל ייבוא"}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setImportFile(null)}
                      disabled={busy}
                    >
                      ביטול
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* ייבוא לפי קטגוריה עם אשף כמו לקוחות (Old method for specific entity import) */}
            <div className="border-t"></div> {/* Separator for the next section */}
            <div className="flex flex-wrap gap-3 items-center">
              <Select onValueChange={(v) => setImporterEntity(v)} disabled={busy}>
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="ייבוא לפי קטגוריה (בחר ישות)" />
                </SelectTrigger>
                <SelectContent align="end">
                  {ALL_CATEGORIES.map((name) => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* גיבוי אוטומטי */}
              <div className="ml-auto flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox checked={autoEnabled} onCheckedChange={setAutoEnabled} disabled={busy} />
                    גיבוי אוטומטי בעת כניסה
                  </label>
                  <Select value={autoFreq} onValueChange={setAutoFreq} disabled={busy || !autoEnabled}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="תדירות" />
                    </SelectTrigger>
                    <SelectContent align="end">
                      <SelectItem value="daily">יומי</SelectItem>
                      <SelectItem value="weekly">שבועי</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" onClick={saveAutoSettings} disabled={busy}>שמור הגדרות</Button>
                  {lastRun && <span className="text-xs text-slate-500">גיבוי אחרון: {new Date(lastRun).toLocaleString()}</span>}
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-600 bg-blue-50 border border-blue-200 rounded-lg p-2">
                  <CalendarClock className="w-4 h-4 text-blue-600" />
                  <span>✅ גיבוי אוטומטי פעיל - רץ כל יום ראשון בשעה 02:00 ונשלח למייל המנהלים</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Debug info */}
        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>מידע דיבאג</CardTitle>
          </CardHeader>
          <CardContent className="text-xs font-mono">
            <div>קטגוריות נבחרות: {Array.from(selected).join(', ')}</div>
            <div>פורמט ייצוא נוכחי: {exportFormat}</div>
            <div>קובץ ייבוא נבחר: {importFile ? importFile.name : "אין"}</div>
            <div>אופן ייבוא: {importMode}</div>
            <div>סטטוס: {busy ? "עסוק" : "מוכן"}</div>
            <div className="mt-2 text-slate-600">
              לבדיקת לוגי הדיבאג, פתח את Developer Tools (F12) ועבור ל-Console
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
      </div>
    </div>
  );
}