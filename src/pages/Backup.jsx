import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Upload, ShieldCheck, Database, RefreshCw, Settings, CalendarClock, CheckCircle2, AlertTriangle, FileText, X, Archive, Table, FileDown, FolderOpen, Users, MessageSquare, Briefcase, Calendar, Zap, FileBarChart, Eye, GitCompare, History, Clock } from "lucide-react";
import { exportProjectFiles } from "@/functions/exportProjectFiles";
import { exportEntities } from "@/functions/exportEntities";
import { importBackupJson } from "@/functions/importBackupJson";
import EntityImporter from "@/components/backup/EntityImporter";
import DataPreviewDialog from "@/components/backup/DataPreviewDialog";
import BackupHistoryPanel from "@/components/backup/BackupHistoryPanel";
import ImportCompareDialog from "@/components/backup/ImportCompareDialog";
import ScheduledBackupCard from "@/components/backup/ScheduledBackupCard";
import { User } from "@/entities/User";
import { exportAllData } from "@/functions/exportAllData";
import { importBackupData } from "@/functions/importBackupData";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const CATEGORY_INFO = {
  // === נתוני ליבה ===
  "Client": { label: "לקוחות", icon: "👥", color: "blue", description: "כל נתוני הלקוחות ופרטי הקשר", group: "core" },
  "Project": { label: "פרויקטים", icon: "🏗️", color: "purple", description: "פרויקטים, תקציבים ולוחות זמנים", group: "core" },
  "Quote": { label: "הצעות מחיר", icon: "💰", color: "yellow", description: "הצעות מחיר ללקוחות", group: "core" },
  "Invoice": { label: "חשבוניות", icon: "🧾", color: "red", description: "חשבוניות וחיובים", group: "core" },
  
  // === משימות ===
  "Task": { label: "משימות", icon: "✅", color: "green", description: "משימות, מטלות ופעולות", group: "tasks" },
  "SubTask": { label: "תת-משימות", icon: "📝", color: "emerald", description: "משימות משנה ותת-פריטים", group: "tasks" },
  "TimeLog": { label: "שעות עבודה", icon: "⏱️", color: "orange", description: "תיעוד שעות עבודה", group: "tasks" },
  
  // === לוח שנה ופגישות ===
  "Meeting": { label: "פגישות", icon: "📅", color: "blue", description: "פגישות ואירועים", group: "calendar" },
  "Reminder": { label: "תזכורות", icon: "⏰", color: "amber", description: "תזכורות מתוזמנות", group: "calendar" },
  "DailyMeetingSummary": { label: "סיכומי פגישות", icon: "📋", color: "green", description: "סיכומים יומיים של פגישות", group: "calendar" },
  
  // === טבלאות מותאמות ===
  "CustomSpreadsheet": { label: "טבלאות מותאמות", icon: "📊", color: "teal", description: "טבלאות אקסל מותאמות (כולל נתוני שורות)", group: "spreadsheets" },
  "SheetComment": { label: "תגובות בטבלאות", icon: "💬", color: "cyan", description: "תגובות והערות בטבלאות", group: "spreadsheets" },
  "SheetPresence": { label: "נוכחות בטבלאות", icon: "👁️", color: "blue", description: "מעקב נוכחות משתמשים בטבלאות", group: "spreadsheets" },
  
  // === הגדרות נתונים ===
  "GlobalDataType": { label: "סוגי נתונים גלובליים", icon: "🏷️", color: "violet", description: "הגדרות סוגי נתונים מותאמים", group: "settings" },
  "AppSettings": { label: "הגדרות אפליקציה", icon: "🔧", color: "gray", description: "הגדרות מערכת כלליות", group: "settings" },
  
  // === צוות ומשתמשים ===
  "TeamMember": { label: "חברי צוות", icon: "👤", color: "violet", description: "נתוני צוות", group: "users" },
  "AccessControl": { label: "הרשאות", icon: "🔐", color: "red", description: "ניהול הרשאות גישה", group: "users" },
  "UserPreferences": { label: "העדפות משתמש", icon: "⚙️", color: "gray", description: "הגדרות אישיות", group: "users" },
  "UserAvailability": { label: "זמינות משתמשים", icon: "🗓️", color: "green", description: "הגדרות זמינות", group: "users" },
  "NotificationSettings": { label: "הגדרות התראות", icon: "🔕", color: "slate", description: "הגדרות התראות משתמש", group: "users" },
  
  // === תקשורת ===
  "CommunicationMessage": { label: "הודעות", icon: "📧", color: "cyan", description: "תקשורת עם לקוחות", group: "communication" },
  "InternalChat": { label: "צ'אט פנימי", icon: "💭", color: "blue", description: "שיחות צוות פנימיות", group: "communication" },
  "InternalMessage": { label: "הודעות פנימיות", icon: "✉️", color: "cyan", description: "הודעות בין חברי צוות", group: "communication" },
  "MessageTemplate": { label: "תבניות הודעות", icon: "📋", color: "purple", description: "תבניות למסרים", group: "communication" },
  "Notification": { label: "התראות", icon: "🔔", color: "orange", description: "התראות ועדכונים", group: "communication" },
  
  // === מסמכים וקבצים ===
  "Document": { label: "מסמכים", icon: "📄", color: "slate", description: "קבצים ומסמכים", group: "documents" },
  "SmartDocument": { label: "מסמכים חכמים", icon: "📑", color: "indigo", description: "תבניות מסמכים חכמות", group: "documents" },
  "ClientFile": { label: "קבצי לקוחות", icon: "📁", color: "blue", description: "קבצים של לקוחות", group: "documents" },
  "QuoteFile": { label: "קבצי הצעות", icon: "📎", color: "yellow", description: "קבצים מצורפים להצעות", group: "documents" },
  
  // === אישורים והחלטות ===
  "Decision": { label: "החלטות", icon: "🎯", color: "indigo", description: "החלטות פרויקטליות", group: "decisions" },
  "ClientApproval": { label: "אישורי לקוח", icon: "✔️", color: "teal", description: "אישורים מלקוחות", group: "decisions" },
  "ClientFeedback": { label: "משוב לקוחות", icon: "💬", color: "pink", description: "פידבקים והערות", group: "decisions" },
  
  // === אוטומציות ===
  "WorkflowAutomation": { label: "אוטומציות", icon: "🤖", color: "purple", description: "תהליכים אוטומטיים", group: "automation" },
  "AutomationRule": { label: "כללי אוטומציה", icon: "⚡", color: "yellow", description: "חוקי אוטומציה", group: "automation" },
  "AutomationLog": { label: "לוגי אוטומציות", icon: "📜", color: "slate", description: "היסטוריית הפעלת אוטומציות", group: "automation" },
  
  // === AI ודוחות ===
  "ChatConversation": { label: "שיחות AI", icon: "🤖", color: "indigo", description: "שיחות עם AI", group: "ai" },
  "AIInsight": { label: "תובנות AI", icon: "🧠", color: "violet", description: "תובנות ממערכת AI", group: "ai" },
  "DailyReportSchedule": { label: "דוחות יומיים", icon: "📈", color: "blue", description: "תזמון דוחות", group: "ai" },
  
  // === לוגים ומעקב ===
  "AuditLog": { label: "לוגי פעילות", icon: "📝", color: "slate", description: "היסטוריית שינויים במערכת", group: "logs" },
  "SyncLog": { label: "לוגי סנכרון", icon: "🔄", color: "cyan", description: "היסטוריית סנכרון Google Sheets", group: "logs" }
};

// קבוצות לייצוא מהיר
const CATEGORY_GROUPS = {
  core: { label: "נתוני ליבה", icon: "💎", color: "blue", categories: ["Client", "Project", "Quote", "Invoice"] },
  tasks: { label: "משימות ושעות", icon: "✅", color: "green", categories: ["Task", "SubTask", "TimeLog"] },
  calendar: { label: "לוח שנה", icon: "📅", color: "purple", categories: ["Meeting", "Reminder", "DailyMeetingSummary"] },
  spreadsheets: { label: "טבלאות מותאמות", icon: "📊", color: "teal", categories: ["CustomSpreadsheet", "SheetComment", "SheetPresence"] },
  users: { label: "צוות ומשתמשים", icon: "👥", color: "violet", categories: ["TeamMember", "AccessControl", "UserPreferences", "UserAvailability", "NotificationSettings"] },
  communication: { label: "תקשורת", icon: "💬", color: "cyan", categories: ["CommunicationMessage", "InternalChat", "InternalMessage", "MessageTemplate", "Notification"] },
  documents: { label: "מסמכים וקבצים", icon: "📁", color: "slate", categories: ["Document", "SmartDocument", "ClientFile", "QuoteFile"] },
  decisions: { label: "אישורים והחלטות", icon: "🎯", color: "indigo", categories: ["Decision", "ClientApproval", "ClientFeedback"] },
  automation: { label: "אוטומציות", icon: "⚡", color: "yellow", categories: ["WorkflowAutomation", "AutomationRule", "AutomationLog"] },
  settings: { label: "הגדרות", icon: "⚙️", color: "gray", categories: ["GlobalDataType", "AppSettings"] },
  ai: { label: "AI ודוחות", icon: "🧠", color: "pink", categories: ["ChatConversation", "AIInsight", "DailyReportSchedule"] },
  logs: { label: "לוגים", icon: "📜", color: "slate", categories: ["AuditLog", "SyncLog"] }
};

const ALL_CATEGORIES = Object.keys(CATEGORY_INFO);

export default function BackupPage() {
  const [selected, setSelected] = useState(new Set(["Client","Project","Task","SubTask","TimeLog","Meeting","CustomSpreadsheet","Quote"]));
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
      } else if (format === 'excel') {
        // True Excel .xlsx export with formatting
        console.log("[Backup] Creating Excel XLSX for:", categories);
        const response = await exportAllData({ format: 'excel', categories });
        
        if (!response.data) {
          console.error("[Backup] No data in response:", response);
          alert('שגיאה: לא התקבלו נתונים מהשרת');
          return;
        }
        
        const blob = new Blob([response.data], { 
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
        });
        
        console.log("[Backup] Created Excel blob size:", blob.size, "bytes");
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `backup-${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        URL.revokeObjectURL(url);
        a.remove();
      } else {
        // For CSV/XML, use the exportAllData function
        console.log("[Backup] Calling exportAllData with:", { format, categories });
        const response = await exportAllData({ format, categories });
        console.log("[Backup] exportAllData response:", response);
        
        if (!response.data) {
          console.error("[Backup] No data in response:", response);
          alert('שגיאה: לא התקבלו נתונים מהשרת');
          return;
        }
        
        // Handle both string and ArrayBuffer responses
        let content = response.data;
        if (content instanceof ArrayBuffer) {
          content = new TextDecoder().decode(content);
        }
        
        // Add BOM for CSV Hebrew support
        if (format === 'csv') {
          content = '\uFEFF' + content;
        }
        
        const blob = new Blob([content], { 
          type: format === 'csv' ? 'text/csv; charset=utf-8' :
                format === 'xml' ? 'application/xml; charset=utf-8' : 'application/octet-stream'
        });
        
        console.log("[Backup] Created blob size:", blob.size, "bytes");
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `backup-${new Date().toISOString().split('T')[0]}.${format}`;
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
      console.log("[Backup] Starting import for file:", file.name, "with mode:", importMode);

      // Convert file to Base64 to avoid FormData issues
      const toBase64 = (file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = error => reject(error);
      });

      const fileBase64 = await toBase64(file);
      
      const payload = {
        fileBase64,
        fileName: file.name,
        mode: importMode
      };

      const response = await importBackupData(payload);
      
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

        {/* Quick Export by Group */}
        <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm">
          <CardHeader className="border-b bg-gradient-to-l from-amber-50 to-white pb-4">
            <CardTitle className="flex items-center gap-3 text-2xl">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
                <Zap className="w-6 h-6 text-white" />
              </div>
              ייצוא מהיר לפי קטגוריה
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
              {Object.entries(CATEGORY_GROUPS).map(([groupKey, group]) => {
                const groupCount = group.categories.reduce((sum, cat) => {
                  const count = categoryCounts[cat];
                  return sum + (typeof count === 'number' ? count : 0);
                }, 0);
                
                return (
                  <button
                    key={groupKey}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        const response = await exportEntities({ categories: group.categories, format: 'json' });
                        const jsonData = JSON.stringify(response.data || response, null, 2);
                        const blob = new Blob([jsonData], { type: "application/json" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `${groupKey}-backup-${new Date().toISOString().split('T')[0]}.json`;
                        document.body.appendChild(a);
                        a.click();
                        URL.revokeObjectURL(url);
                        a.remove();
                      } catch (error) {
                        console.error(`${group.label} Export error:`, error);
                        alert(`שגיאה בייצוא ${group.label}: ` + (error?.message || 'שגיאה לא ידועה'));
                      }
                      setBusy(false);
                    }}
                    disabled={busy}
                    className={`
                      p-4 rounded-xl border-2 transition-all text-center
                      border-${group.color}-200 bg-gradient-to-br from-${group.color}-50 to-white
                      hover:border-${group.color}-400 hover:shadow-lg hover:scale-105
                      disabled:opacity-50 disabled:cursor-not-allowed
                    `}
                  >
                    <div className="text-2xl mb-2">{group.icon}</div>
                    <div className="font-bold text-slate-900 text-sm mb-1">{group.label}</div>
                    <div className="text-xs text-slate-500">{group.categories.length} סוגים</div>
                    <Badge className="mt-2 text-xs" variant="outline">
                      {loadingCounts ? '...' : groupCount.toLocaleString()} רשומות
                    </Badge>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Main Quick Export Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Export Full Project ZIP */}
          <Card className="shadow-xl border-0 bg-gradient-to-r from-purple-50 to-indigo-50 border-l-4 border-l-purple-500">
            <CardContent className="p-5">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg">
                    <Archive className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">גיבוי מלא</h3>
                    <p className="text-xs text-slate-600">ZIP עם כל הנתונים</p>
                  </div>
                </div>
                <Button 
                  onClick={async () => {
                    setBusy(true);
                    try {
                      const response = await exportProjectFiles({});
                      const blob = new Blob([response.data], { type: 'application/zip' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `CRM_Tannenbaum_Full_Backup_${new Date().toISOString().split('T')[0]}.zip`;
                      document.body.appendChild(a);
                      a.click();
                      URL.revokeObjectURL(url);
                      a.remove();
                    } catch (error) {
                      console.error('ZIP Export error:', error);
                      alert('שגיאה בייצוא ZIP: ' + (error?.message || 'שגיאה לא ידועה'));
                    }
                    setBusy(false);
                  }}
                  disabled={busy}
                  className="w-full gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg"
                >
                  {busy ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4" />}
                  הורד ZIP מלא
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Export Spreadsheets + Data */}
          <Card className="shadow-xl border-0 bg-gradient-to-r from-teal-50 to-cyan-50 border-l-4 border-l-teal-500">
            <CardContent className="p-5">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-lg">
                    <Table className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">טבלאות מלא</h3>
                    <p className="text-xs text-slate-600">טבלאות + תגובות + נוכחות</p>
                  </div>
                </div>
                <Button 
                  onClick={async () => {
                    setBusy(true);
                    try {
                      const response = await exportEntities({ categories: CATEGORY_GROUPS.spreadsheets.categories, format: 'json' });
                      const jsonData = JSON.stringify(response.data || response, null, 2);
                      const blob = new Blob([jsonData], { type: "application/json" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `spreadsheets-full-backup-${new Date().toISOString().split('T')[0]}.json`;
                      document.body.appendChild(a);
                      a.click();
                      URL.revokeObjectURL(url);
                      a.remove();
                    } catch (error) {
                      console.error('Spreadsheets Export error:', error);
                      alert('שגיאה בייצוא טבלאות: ' + (error?.message || 'שגיאה לא ידועה'));
                    }
                    setBusy(false);
                  }}
                  disabled={busy}
                  className="w-full gap-2 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white shadow-lg"
                >
                  {busy ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Table className="w-4 h-4" />}
                  הורד טבלאות
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Export Tasks Full */}
          <Card className="shadow-xl border-0 bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-l-green-500">
            <CardContent className="p-5">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
                    <CheckCircle2 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">משימות מלא</h3>
                    <p className="text-xs text-slate-600">משימות + תת-משימות + שעות</p>
                  </div>
                </div>
                <Button 
                  onClick={async () => {
                    setBusy(true);
                    try {
                      const response = await exportEntities({ categories: CATEGORY_GROUPS.tasks.categories, format: 'json' });
                      const jsonData = JSON.stringify(response.data || response, null, 2);
                      const blob = new Blob([jsonData], { type: "application/json" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `tasks-full-backup-${new Date().toISOString().split('T')[0]}.json`;
                      document.body.appendChild(a);
                      a.click();
                      URL.revokeObjectURL(url);
                      a.remove();
                    } catch (error) {
                      console.error('Tasks Export error:', error);
                      alert('שגיאה בייצוא משימות: ' + (error?.message || 'שגיאה לא ידועה'));
                    }
                    setBusy(false);
                  }}
                  disabled={busy}
                  className="w-full gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg"
                >
                  {busy ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  הורד משימות
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Export Users & Team */}
          <Card className="shadow-xl border-0 bg-gradient-to-r from-violet-50 to-purple-50 border-l-4 border-l-violet-500">
            <CardContent className="p-5">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">צוות ומשתמשים</h3>
                    <p className="text-xs text-slate-600">הרשאות + העדפות + זמינות</p>
                  </div>
                </div>
                <Button 
                  onClick={async () => {
                    setBusy(true);
                    try {
                      const response = await exportEntities({ categories: CATEGORY_GROUPS.users.categories, format: 'json' });
                      const jsonData = JSON.stringify(response.data || response, null, 2);
                      const blob = new Blob([jsonData], { type: "application/json" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `users-team-backup-${new Date().toISOString().split('T')[0]}.json`;
                      document.body.appendChild(a);
                      a.click();
                      URL.revokeObjectURL(url);
                      a.remove();
                    } catch (error) {
                      console.error('Users Export error:', error);
                      alert('שגיאה בייצוא משתמשים: ' + (error?.message || 'שגיאה לא ידועה'));
                    }
                    setBusy(false);
                  }}
                  disabled={busy}
                  className="w-full gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-lg"
                >
                  {busy ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
                  הורד משתמשים
                </Button>
              </div>
            </CardContent>
          </Card>
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
          <CardContent className="p-6 space-y-6">
            {/* Group Selection Buttons */}
            <div className="flex flex-wrap gap-2 pb-4 border-b">
              <span className="text-sm font-bold text-slate-600 ml-2">בחירה מהירה:</span>
              {Object.entries(CATEGORY_GROUPS).map(([groupKey, group]) => (
                <Button
                  key={groupKey}
                  size="sm"
                  variant="outline"
                  className="gap-1 text-xs"
                  onClick={() => {
                    setSelected(prev => {
                      const next = new Set(prev);
                      const allInGroup = group.categories.every(cat => next.has(cat));
                      if (allInGroup) {
                        group.categories.forEach(cat => next.delete(cat));
                      } else {
                        group.categories.forEach(cat => next.add(cat));
                      }
                      return next;
                    });
                  }}
                >
                  <span>{group.icon}</span>
                  {group.label}
                </Button>
              ))}
            </div>

            {/* Categories by Group */}
            {Object.entries(CATEGORY_GROUPS).map(([groupKey, group]) => (
              <div key={groupKey} className="space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{group.icon}</span>
                  <h4 className="font-bold text-slate-800">{group.label}</h4>
                  <Badge variant="outline" className="text-xs">
                    {group.categories.filter(cat => selected.has(cat)).length}/{group.categories.length}
                  </Badge>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {group.categories.map((name) => {
                    const info = CATEGORY_INFO[name];
                    if (!info) return null;
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
                            ? 'border-blue-400 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-lg scale-[1.02]' 
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
              </div>
            ))}
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
      </div>
    </div>
  );
}