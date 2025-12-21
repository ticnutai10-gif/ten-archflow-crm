import React, { useEffect, useCallback, useMemo, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Timer as TimerIcon, Play, Pause, RefreshCcw, Square, Save, Clock, Settings, BookmarkPlus, Trash2, Plus, Loader2, Calendar, Pencil, Circle, AlertCircle } from 'lucide-react';
import { Client, TimeLog } from "@/entities/all";
import { logInfo, logWarn, logError, logEntry } from "@/components/utils/debugLog";
import { useAccessControl } from "@/components/access/AccessValidator";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const DEFAULT_STAGE_OPTIONS = [
  { value: 'ללא', label: 'ללא', color: '#cbd5e1', glow: 'rgba(203, 213, 225, 0.4)' },
  { value: 'ברור_תכן', label: 'ברור תכן', color: '#3b82f6', glow: 'rgba(59, 130, 246, 0.4)' },
  { value: 'תיק_מידע', label: 'תיק מידע', color: '#8b5cf6', glow: 'rgba(139, 92, 246, 0.4)' },
  { value: 'היתרים', label: 'היתרים', color: '#f59e0b', glow: 'rgba(245, 158, 11, 0.4)' },
  { value: 'ביצוע', label: 'ביצוע', color: '#10b981', glow: 'rgba(16, 185, 129, 0.4)' },
  { value: 'סיום', label: 'סיום', color: '#6b7280', glow: 'rgba(107, 114, 128, 0.4)' }
];

// פונקציה לבדוק אם מספר טלפון תקין
const isValidPhone = (phone) => {
  if (!phone) return false;
  const cleaned = String(phone).replace(/\D/g, '');
  if (cleaned.length < 7) return false;
  const uniqueDigits = new Set(cleaned.split(''));
  if (uniqueDigits.size < 2) return false;
  return true;
};

if (typeof window !== "undefined" && !window.__patchedSafeObjectKeys) {
  try {
    const originalKeys = Object.keys;
    Object.keys = function (obj) {
      if (obj === null || obj === undefined) return [];
      try {
        return originalKeys.call(Object, obj);
      } catch {
        return [];
      }
    };
    window.__patchedSafeObjectKeys = true;
  } catch {
    // no-op if patching fails
  }
}

function SafeGuard({ children }) {
  return <>{children}</>;
}

function readPrefs() {
  try {
    const raw = localStorage.getItem("app-preferences");
    const p = raw ? JSON.parse(raw) : {};
    return {
      colorFrom: p?.timer?.colorFrom || "#8b5cf6",
      colorTo: p?.timer?.colorTo || "#06b6d4",
      textColor: p?.timer?.textColor || "#0f172a",
      fontFamily: p?.timer?.fontFamily || "default",
      scale: typeof p?.timer?.scale === "number" ? p.timer.scale : 1,
      selectedClientId: p?.timer?.selectedClientId || "",
      selectedClientName: p?.timer?.selectedClientName || "",
      timerIconStyle: String(p?.timer?.timerIconStyle || "4"),
      timerIconSize: String(p?.timer?.timerIconSize || "md"),
      positions: p?.timer?.positions || {},
      titleTemplates: p?.timer?.titleTemplates || [],
      notesTemplates: p?.timer?.notesTemplates || [],
      recentClients: p?.timer?.recentClients || [], // רשימת לקוחות אחרונים
      quickTitlePrompts: p?.timer?.quickTitlePrompts || ["פגישת תכנון", "ייעוץ טלפוני", "עדכון פרויקט", "סיור באתר", "שיחת וידאו"],
      quickNotesPrompts: p?.timer?.quickNotesPrompts || ["דנו בתכנון הכללי", "עדכון על התקדמות", "שאלות ובירורים", "תיאום עם ספקים", "בחינת דגמים"]
    };
  } catch {
    return {
      colorFrom: "#8b5cf6",
      colorTo: "#06b6d4",
      textColor: "#0f172a",
      fontFamily: "default",
      scale: 1,
      selectedClientId: "",
      selectedClientName: "",
      timerIconStyle: "4",
      timerIconSize: "md",
      positions: {},
      titleTemplates: [],
      notesTemplates: [],
      recentClients: [],
      quickTitlePrompts: ["פגישת תכנון", "ייעוץ טלפוני", "עדכון פרויקט", "סיור באתר", "שיחת וידאו"],
      quickNotesPrompts: ["דנו בתכנון הכללי", "עדכון על התקדמות", "שאלות ובירורים", "תיאום עם ספקים", "בחינת דגמים"]
    };
  }
}

function writePrefs(next) {
  try {
    const raw = localStorage.getItem("app-preferences");
    const p = raw ? JSON.parse(raw) : {};
    const merged = { ...(p || {}), timer: { ...(p?.timer || {}), ...next } };
    localStorage.setItem("app-preferences", JSON.stringify(merged));
    window.dispatchEvent(new CustomEvent("preferences:changed", { detail: merged }));
  } catch {}
}

function useTimer(initial = 0) {
  const [seconds, setSeconds] = React.useState(initial);
  const [running, setRunning] = React.useState(false);
  const [debug, setDebug] = React.useState({
    lastDeltaMs: 0,
    driftSec: 0,
    corrected: false,
    stalled: false,
    startedAt: null,
    resumedAt: null,
    visibility: typeof document !== "undefined" ? document.visibilityState : "unknown"
  });

  const baseSecondsRef = React.useRef(initial);
  const resumeAtRef = React.useRef(null);
  const lastTickRef = React.useRef(null);
  const intervalRef = React.useRef(null);
  const lastProgressAtRef = React.useRef(null);

  React.useEffect(() => {
    const onVis = () => {
      setDebug((d) => ({ ...d, visibility: document.visibilityState }));
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const computeCurrentSeconds = React.useCallback(() => {
    if (!running || !resumeAtRef.current) return baseSecondsRef.current;
    const now = Date.now();
    const runChunk = Math.floor((now - resumeAtRef.current) / 1000);
    return baseSecondsRef.current + runChunk;
  }, [running]);

  React.useEffect(() => {
    if (!running) return;

    if (!resumeAtRef.current) {
      resumeAtRef.current = Date.now();
      lastProgressAtRef.current = Date.now();
      setDebug((d) => ({ ...d, resumedAt: new Date(resumeAtRef.current).toISOString(), corrected: false }));
      logInfo("timer", "resumed", "Timer resumed", { baseSeconds: baseSecondsRef.current });
    }
    lastTickRef.current = Date.now();

    intervalRef.current = setInterval(() => {
      const now = Date.now();
      const delta = now - (lastTickRef.current || now);
      lastTickRef.current = now;

      const computed = computeCurrentSeconds();
      const drift = computed - seconds;

      let corrected = false;
      if (Math.abs(drift) > 1) {
        setSeconds(computed);
        corrected = true;
        logWarn("timer", "drift_corrected", `Corrected drift of ${drift}s`, { drift, deltaMs: delta, seconds: computed });
      } else {
        setSeconds(computed);
      }

      if (computed > seconds) {
        lastProgressAtRef.current = now;
      }

      setDebug((prev) => ({
        ...prev,
        lastDeltaMs: delta,
        driftSec: drift,
        corrected,
        resumedAt: new Date(resumeAtRef.current).toISOString(),
        visibility: typeof document !== "undefined" ? document.visibilityState : "unknown"
      }));
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [running, computeCurrentSeconds, seconds]);

  React.useEffect(() => {
    if (!running) {
      setDebug((d) => ({ ...d, stalled: false }));
      return;
    }
    const watchdog = setInterval(() => {
      const last = lastProgressAtRef.current || Date.now();
      const stalled = Date.now() - last > 4000;
      setDebug((d) => ({ ...d, stalled }));
      if (stalled) {
        logError("timer", "watchdog_stalled", "Timer appears stalled >4s", {
          sinceMs: Date.now() - last,
          seconds
        });
      }
    }, 1500);
    return () => clearInterval(watchdog);
  }, [running, seconds]);

  const reset = () => {
    logInfo("timer", "reset", "Timer reset", { seconds });
    baseSecondsRef.current = 0;
    resumeAtRef.current = null;
    lastTickRef.current = null;
    lastProgressAtRef.current = null;
    setSeconds(0);
    setRunning(false);
    setDebug((d) => ({ ...d, corrected: false, stalled: false, startedAt: null, resumedAt: null }));
  };

  const toggle = () => {
    if (running) {
      const computed = computeCurrentSeconds();
      baseSecondsRef.current = computed;
      resumeAtRef.current = null;
      setSeconds(computed);
      setRunning(false);
      logInfo("timer", "paused", "Timer paused", { seconds: computed });
    } else {
      if (!debug.startedAt) {
        setDebug((d) => ({ ...d, startedAt: new Date().toISOString() }));
        logInfo("timer", "started", "Timer started", { baseSeconds: baseSecondsRef.current });
      } else {
        logInfo("timer", "resumed_click", "Timer resumed via toggle", { baseSeconds: baseSecondsRef.current });
      }
      resumeAtRef.current = Date.now();
      setRunning(true);
    }
  };

  const stop = () => {
    const computed = computeCurrentSeconds();
    baseSecondsRef.current = computed;
    resumeAtRef.current = null;
    setSeconds(computed);
    setRunning(false);
    logInfo("timer", "stopped", "Timer stopped", { seconds: computed });
  };

  const h = String(Math.floor(seconds / 3600)).padStart(2, "0");
  const m = String(Math.floor(seconds % 3600 / 60)).padStart(2, "0");
  const s = String(seconds % 60).padStart(2, "0");
  const display = `${h}:${m}:${s}`;

  return { seconds, h, m, s, display, running, toggle, reset, stop, debug };
}

let clientsCache = null;
let clientsCacheTime = 0;
const CACHE_DURATION = 5 * 60 * 1000;

export default function FloatingTimer() {
  console.log('⏱️⏱️⏱️ [TIMER] Component mounting/rendering');
  
  const [prefs, setPrefs] = React.useState(readPrefs());
  const [clients, setClients] = React.useState([]);
  const [query, setQuery] = React.useState("");
  const [popoverOpen, setPopoverOpen] = React.useState(false);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragStart, setDragStart] = React.useState({ x: 0, y: 0 });
  const [isCtrlPressed, setIsCtrlPressed] = React.useState(false);
  const [stageOptions, setStageOptions] = React.useState(DEFAULT_STAGE_OPTIONS);

  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const [manualH, setManualH] = React.useState("00");
  const [manualM, setManualM] = React.useState("00");
  const [selectedLogDate, setSelectedLogDate] = React.useState(new Date()); // ✅ תאריך נבחר

  const [title, setTitle] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [aiSuggesting, setAiSuggesting] = React.useState(false);
  const [aiSuggested, setAiSuggested] = React.useState(false);

  const [showTitleTemplates, setShowTitleTemplates] = React.useState(false);
  const [showNotesTemplates, setShowNotesTemplates] = React.useState(false);
  const [newTitleTemplate, setNewTitleTemplate] = React.useState("");
  const [newNotesTemplate, setNewNotesTemplate] = React.useState("");
  const [editingQuickTitleIdx, setEditingQuickTitleIdx] = React.useState(null);
  const [editingQuickNotesIdx, setEditingQuickNotesIdx] = React.useState(null);
  const [newQuickTitle, setNewQuickTitle] = React.useState("");
  const [newQuickNotes, setNewQuickNotes] = React.useState("");
  const [showQuickTitleEditor, setShowQuickTitleEditor] = React.useState(false);
  const [showQuickNotesEditor, setShowQuickNotesEditor] = React.useState(false);

  const { getAllowedClientsForTimer, loading: accessLoading } = useAccessControl();
  const [currentUser, setCurrentUser] = useState(null);
  const [userLoading, setUserLoading] = useState(true);

  // בדיקת משתמש מחובר
  useEffect(() => {
    const checkUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (error) {
        console.warn('⚠️ [TIMER] User not logged in:', error);
        setCurrentUser(null);
      } finally {
        setUserLoading(false);
      }
    };
    checkUser();
  }, []);

  // Detect Ctrl+Shift key press/release for drag mode
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Control' && e.shiftKey) {
        setIsCtrlPressed(true);
      }
      if (e.key === 'Shift' && e.ctrlKey) {
        setIsCtrlPressed(true);
      }
    };

    const handleKeyUp = (e) => {
      if (e.key === 'Control' || e.key === 'Shift') {
        setIsCtrlPressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const getCurrentPageName = () => {
    try {
      const path = window.location.pathname;
      const segments = path.split('/').filter(Boolean);
      return segments[segments.length - 1] || 'dashboard';
    } catch {
      return 'dashboard';
    }
  };

  const currentPage = React.useMemo(getCurrentPageName, []);

  const getCurrentPosition = () => {
    return prefs.positions[currentPage] || { top: 24, left: 24 };
  };

  const currentPosition = getCurrentPosition();

  const state = useTimer(0);

  const [debugOpen, setDebugOpen] = React.useState(() => {
    try {return JSON.parse(localStorage.getItem("timer-debug") || "false");} catch {return false;}
  });

  const toggleDebug = React.useCallback(() => {
    setDebugOpen((v) => {
      try {localStorage.setItem("timer-debug", JSON.stringify(!v));} catch {}
      return !v;
    });
  }, []);

  React.useEffect(() => {
    const onKey = (e) => {
      const k = (e.key || "").toLowerCase();
      if (e.ctrlKey && e.altKey && k === "d") {
        e.preventDefault();
        toggleDebug();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleDebug]);

  // Load stage options from UserPreferences
  useEffect(() => {
    const loadStageOptions = async () => {
      console.log('⏱️⏱️⏱️ [TIMER] Starting to load stage options...');
      console.log('⏱️⏱️⏱️ [TIMER] DEFAULT_STAGE_OPTIONS:', JSON.stringify(DEFAULT_STAGE_OPTIONS, null, 2));
      
      try {
        const user = await base44.auth.me();
        console.log('⏱️⏱️⏱️ [TIMER] User loaded:', user?.email);
        
        const userPrefs = await base44.entities.UserPreferences.filter({ user_email: user.email });
        console.log('⏱️⏱️⏱️ [TIMER] UserPreferences found:', userPrefs.length);
        
        if (userPrefs.length > 0) {
          console.log('⏱️⏱️⏱️ [TIMER] UserPrefs[0].spreadsheet_columns:', JSON.stringify(userPrefs[0].spreadsheet_columns, null, 2));
          console.log('⏱️⏱️⏱️ [TIMER] UserPrefs stageOptions:', JSON.stringify(userPrefs[0].spreadsheet_columns?.clients?.stageOptions, null, 2));
        }
        
        if (userPrefs.length > 0 && userPrefs[0].spreadsheet_columns?.clients?.stageOptions) {
          let loadedOptions = userPrefs[0].spreadsheet_columns.clients.stageOptions;
          console.log('⏱️⏱️⏱️ [TIMER] Loaded options BEFORE ensuring ללא:', JSON.stringify(loadedOptions, null, 2));
          
          // Always ensure "ללא" option exists at the beginning
          const hasLelo = loadedOptions.some(opt => opt.value === 'ללא');
          console.log('⏱️⏱️⏱️ [TIMER] Has ללא option?', hasLelo);
          
          if (!hasLelo) {
            console.log('⏱️⏱️⏱️ [TIMER] Adding ללא option to the beginning');
            loadedOptions = [
              { value: 'ללא', label: 'ללא', color: '#cbd5e1', glow: 'rgba(203, 213, 225, 0.4)' },
              ...loadedOptions
            ];
          }
          
          console.log('⏱️⏱️⏱️ [TIMER] Final options to set:', JSON.stringify(loadedOptions, null, 2));
          setStageOptions(loadedOptions);
        } else {
          console.log('⏱️⏱️⏱️ [TIMER] No user prefs found, using DEFAULT_STAGE_OPTIONS');
          setStageOptions(DEFAULT_STAGE_OPTIONS);
        }
      } catch (e) {
        console.warn('⏱️⏱️⏱️ [TIMER] Failed to load stage options, using defaults:', e);
        setStageOptions(DEFAULT_STAGE_OPTIONS);
      }
    };
    
    loadStageOptions();
    
    // Listen for stage options updates
    const handleStageOptionsUpdate = () => {
      console.log('⏱️⏱️⏱️ [TIMER] Received stage:options:updated event, reloading...');
      loadStageOptions();
    };
    
    window.addEventListener('stage:options:updated', handleStageOptionsUpdate);
    return () => {
      window.removeEventListener('stage:options:updated', handleStageOptionsUpdate);
    };
  }, []);

  const loadData = async (forceRefresh = false) => {
    try {
      console.log('⏱️ [TIMER] Loading clients...');

      const now = Date.now();
      if (!forceRefresh && clientsCache && now - clientsCacheTime < CACHE_DURATION) {
        console.log('⏱️ [TIMER] Using cached clients:', clientsCache.length);
        setClients(clientsCache);
        return;
      }

      console.log('⏱️ [TIMER] Fetching from server...');
      const allowedClients = await getAllowedClientsForTimer();

      // ✅ הגנה על תוצאות
      const validClients = Array.isArray(allowedClients) ? allowedClients : [];

      // 🧹 הסרת כפילויות לפי שם נקי - שמירה על הרשומה החדשה ביותר (עם השלב העדכני)
      const uniqueClientsMap = new Map();
      for (const c of validClients) {
        if (!c) continue;
        const clientName = c.name || "";
        const cleanName = (c.name_clean || clientName).trim().toLowerCase().replace(/\s+/g, ' ');

        if (cleanName) {
          if (!uniqueClientsMap.has(cleanName)) {
            uniqueClientsMap.set(cleanName, c);
          } else {
            // שמור את הרשומה החדשה יותר (עם ה-stage העדכני)
            const existing = uniqueClientsMap.get(cleanName);
            if (c.updated_date && existing.updated_date && new Date(c.updated_date) > new Date(existing.updated_date)) {
              uniqueClientsMap.set(cleanName, c);
            }
          }
        } else {
          const fallbackKey = c.id || `noname_${Math.random()}`;
          if (!uniqueClientsMap.has(fallbackKey)) {
            uniqueClientsMap.set(fallbackKey, c);
          }
        }
      }
      const uniqueClients = Array.from(uniqueClientsMap.values());

      console.log('✅ [TIMER] Clients loaded:', validClients.length, '→ unique:', uniqueClients.length);

      clientsCache = uniqueClients;
      clientsCacheTime = now;
      setClients(uniqueClients);
    } catch (error) {
      console.error('❌ [TIMER] Error loading clients:', error);

      if (error.response?.status === 429 && clientsCache) {
        console.log('⚠️ [TIMER] Rate limit - using old cache');
        setClients(clientsCache);
      } else {
        setClients([]);
      }
    }
  };

  useEffect(() => {
    if (!accessLoading) {
      loadData();
    }
  }, [accessLoading]);

  // Listen for client updates - update cache and state
  useEffect(() => {
    const handleClientUpdate = (event) => {
      const updatedClient = event.detail;
      if (!updatedClient?.id) return;
      
      console.log('⏱️ [TIMER] Received client:updated event:', {
        id: updatedClient.id,
        name: updatedClient.name,
        stage: updatedClient.stage
      });
      
      // Update cache in place instead of full reload
      if (clientsCache) {
        clientsCache = clientsCache.map(c => 
          c.id === updatedClient.id ? { ...c, ...updatedClient } : c
        );
        console.log('⏱️ [TIMER] Cache updated');
      }
      
      // Update local state
      setClients(prev => {
        const updated = prev.map(c => 
          c.id === updatedClient.id ? { ...c, ...updatedClient } : c
        );
        console.log('⏱️ [TIMER] Local state updated');
        return updated;
      });
    };
    
    window.addEventListener('client:updated', handleClientUpdate);
    return () => window.removeEventListener('client:updated', handleClientUpdate);
  }, []);

  // Removed auto-refresh interval to reduce load

  const savePrefs = React.useCallback((patch) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      writePrefs(patch);
      return next;
    });
  }, []);

  // פונקציה לשמירת לקוח אחרון שנבחר
  const saveRecentClient = React.useCallback((clientId, clientName) => {
    const recentClients = prefs.recentClients || [];
    const updated = [
    { id: clientId, name: clientName, lastUsed: new Date().toISOString() },
    ...recentClients.filter((c) => c.id !== clientId)].
    slice(0, 5); // שמור רק 5 אחרונים

    savePrefs({ recentClients: updated });
  }, [prefs.recentClients, savePrefs]);

  // ✅ סינון לקוחות
  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();

    if (!Array.isArray(clients) || clients.length === 0) return [];

    let result = clients;
    if (q) {
      result = clients.filter((c) =>
        c && (
          (c.name || "").toLowerCase().includes(q) ||
          (c.company || "").toLowerCase().includes(q) ||
          (c.email || "").toLowerCase().includes(q)
        )
      );
    }

    // מיון לפי שימוש אחרון
    const recentIds = (prefs.recentClients || []).map((r) => r?.id).filter(Boolean);
    const sorted = [...result].sort((a, b) => {
      if (!a || !b) return 0;

      const aIndex = recentIds.indexOf(a.id);
      const bIndex = recentIds.indexOf(b.id);

      if (aIndex === -1 && bIndex === -1) {
        return (a.name || "").localeCompare(b.name || "");
      }
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });

    return sorted;
  }, [clients, query, prefs.recentClients]);

  const suggestTitleAndNotes = async () => {
    if (!prefs.selectedClientName || !window.base44 || !window.base44.entities || !window.base44.integrations || !window.base44.integrations.Core) {
      console.warn('🤖 [TIMER AI] AI suggestion skipped: missing selected client name or base44 entities/integrations.');
      return;
    }

    setAiSuggesting(true);
    try {
      console.log('🤖 [TIMER AI] Starting AI suggestion for client:', prefs.selectedClientName);

      // טעינת time logs קודמים של הלקוח
      const previousLogs = await TimeLog.filter(// Assuming TimeLog is directly from base44.entities.TimeLog
        { client_name: prefs.selectedClientName },
        '-log_date', // Sort by log_date descending
        20 // Limit to 20 previous logs
      );

      console.log('🤖 [TIMER AI] Found previous logs:', previousLogs.length);

      // הכנת הקשר לבקשה
      const context = previousLogs.length > 0 ?
      `Time logs קודמים של לקוח "${prefs.selectedClientName}":\n${previousLogs.map((log, i) =>
      `${i + 1}. כותרת: "${log.title || 'ללא כותרת'}", הערות: "${log.notes || 'אין'}"`
      ).join('\n')}` :
      `לקוח "${prefs.selectedClientName}" - זהו הרישום הראשון.`;

      const prompt = `
אתה עוזר חכם למערכת CRM אדריכלית.
משתמש רושם זמן עבודה עבור לקוח.

${context}

המשימה שלך:
1. הצע כותרת קצרה ומדויקת (2-5 מילים) למה המשתמש עשה (לדוגמה: "פגישת תכנון ראשונית", "עדכון שרטוטים", "תיאום עם קבלן")
2. הצע הערות קצרות (1-2 משפטים) על מה כנראה נעשה בזמן הזה

חשוב:
- השתמש בעברית תקנית
- התבסס על הדפוסים מהלוגים הקודמים אם יש
- אם זה הרישום הראשון, הצע משהו כללי ומקצועי
- היה תמציתי ומקצועי

החזר רק JSON במבנה הבא:
{
  "title": "כותרת מוצעת",
  "notes": "הערות מוצעות"
}
`;

      console.log('🤖 [TIMER AI] Sending prompt to AI...');

      const response = await window.base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        add_context_from_internet: false,
        response_json_schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            notes: { type: "string" }
          },
          required: ["title", "notes"]
        }
      });

      console.log('🤖 [TIMER AI] AI response:', response);

      if (response?.title) {
        setTitle(response.title);
        setNotes(response.notes || "");
        setAiSuggested(true);
        console.log('✅ [TIMER AI] Successfully set AI suggestions');
      }

    } catch (error) {
      console.error('❌ [TIMER AI] Error getting AI suggestions:', error);
      // אם יש שגיאה, פשוט לא ממלאים כלום - המשתמש ימלא ידנית
    } finally {
      setAiSuggesting(false);
    }
  };

  const openDetailsStep = async () => {
    setDetailsOpen(true);
    // ✅ עדכון: רק שעות ודקות, ללא שניות
    const h = Math.floor(state.seconds / 3600);
    const m = Math.floor(state.seconds % 3600 / 60);
    setManualH(String(h).padStart(2, "0"));
    setManualM(String(m).padStart(2, "0"));
    setSelectedLogDate(new Date()); // ✅ הגדרת ברירת מחדל לתאריך הנוכחי

    // הצעת AI לכותרת והערות
    if (prefs.selectedClientName && !aiSuggested) {
      await suggestTitleAndNotes();
    }
  };

  // ✅ עדכון: חישוב ללא שניות
  const computeSecondsFromManual = () => {
    const h = Math.max(0, parseInt(manualH || "0", 10) || 0);
    const m = Math.max(0, Math.min(59, parseInt(manualM || "0", 10) || 0));
    return h * 3600 + m * 60; // ללא שניות
  };

  const performSave = async () => {
    // בדיקה שהמשתמש מחובר
    if (!currentUser || !currentUser.email) {
      toast.error('עליך להתחבר למערכת כדי לשמור רישום זמן');
      return;
    }

    const validDate = selectedLogDate && !isNaN(selectedLogDate.getTime()) ? selectedLogDate : new Date();
    const logDate = validDate.toISOString().slice(0, 10);
    const secondsToSave = computeSecondsFromManual();
    
    await TimeLog.create({
      client_id: prefs.selectedClientId || "",
      client_name: prefs.selectedClientName || "",
      log_date: logDate,
      duration_seconds: secondsToSave,
      title: title || "",
      notes: notes || ""
      // created_by יתווסף אוטומטית על ידי המערכת
    });
    
    window.dispatchEvent(new CustomEvent('timelog:created', {
      detail: {
        client_name: prefs.selectedClientName,
        duration_seconds: secondsToSave,
        title, notes
      }
    }));
    state.stop();
    state.reset();
    setTitle("");
    setNotes("");
    setSelectedLogDate(new Date());
    setDetailsOpen(false);
    setPopoverOpen(false);
    setAiSuggested(false);
    toast.success('רישום הזמן נשמר בהצלחה');
  };

  const handleSaveClick = async () => {
    if (!detailsOpen) {
      openDetailsStep();
      return;
    }
    await performSave();
  };

  const addTitleTemplate = () => {
    if (!newTitleTemplate.trim()) return;
    const updated = [...prefs.titleTemplates, newTitleTemplate.trim()];
    savePrefs({ titleTemplates: updated });
    setNewTitleTemplate("");
  };

  const deleteTitleTemplate = (index) => {
    const updated = prefs.titleTemplates.filter((_, i) => i !== index);
    savePrefs({ titleTemplates: updated });
  };

  const addNotesTemplate = () => {
    if (!newNotesTemplate.trim()) return;
    const updated = [...prefs.notesTemplates, newNotesTemplate.trim()];
    savePrefs({ notesTemplates: updated });
    setNewNotesTemplate("");
  };

  const deleteNotesTemplate = (index) => {
    const updated = prefs.notesTemplates.filter((_, i) => i !== index);
    savePrefs({ notesTemplates: updated });
  };

  const addQuickTitlePrompt = () => {
    if (!newQuickTitle.trim()) return;
    const updated = [...(prefs.quickTitlePrompts || []), newQuickTitle.trim()];
    savePrefs({ quickTitlePrompts: updated });
    setNewQuickTitle("");
    setShowQuickTitleEditor(false);
  };

  const deleteQuickTitlePrompt = (index) => {
    const updated = (prefs.quickTitlePrompts || []).filter((_, i) => i !== index);
    savePrefs({ quickTitlePrompts: updated });
  };

  const updateQuickTitlePrompt = (index, newValue) => {
    const updated = [...(prefs.quickTitlePrompts || [])];
    updated[index] = newValue.trim();
    savePrefs({ quickTitlePrompts: updated });
    setEditingQuickTitleIdx(null);
  };

  const addQuickNotesPrompt = () => {
    if (!newQuickNotes.trim()) return;
    const updated = [...(prefs.quickNotesPrompts || []), newQuickNotes.trim()];
    savePrefs({ quickNotesPrompts: updated });
    setNewQuickNotes("");
    setShowQuickNotesEditor(false);
  };

  const deleteQuickNotesPrompt = (index) => {
    const updated = (prefs.quickNotesPrompts || []).filter((_, i) => i !== index);
    savePrefs({ quickNotesPrompts: updated });
  };

  const updateQuickNotesPrompt = (index, newValue) => {
    const updated = [...(prefs.quickNotesPrompts || [])];
    updated[index] = newValue.trim();
    savePrefs({ quickNotesPrompts: updated });
    setEditingQuickNotesIdx(null);
  };

  const handleMouseDown = (e) => {
    // Only allow dragging if Ctrl+Shift is pressed
    if (!e.ctrlKey || !e.shiftKey) return;

    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - currentPosition.left, y: e.clientY - currentPosition.top });
  };

  const handleMouseMove = React.useCallback((e) => {
    if (!isDragging) return;

    const newPosition = {
      left: Math.max(0, Math.min(window.innerWidth - 100, e.clientX - dragStart.x)),
      top: Math.max(0, Math.min(window.innerHeight - 100, e.clientY - dragStart.y))
    };

    const updatedPositions = { ...prefs.positions, [currentPage]: newPosition };
    savePrefs({ positions: updatedPositions });
  }, [isDragging, dragStart, savePrefs, currentPage, prefs.positions]);

  const handleMouseUp = React.useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
    }
  }, [isDragging]);

  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const iconThemes = {
    modern: [
    { id: "1", name: "מלא כחול", bg: "bg-blue-600", text: "text-white", border: "" },
    { id: "2", name: "ממוסגר כחול", bg: "bg-transparent", text: "text-blue-600", border: "border-2 border-blue-500" },
    { id: "3", name: "שקוף אפור", bg: "bg-transparent", text: "text-slate-700", border: "border border-slate-300" },
    { id: "4", name: "רק אייקון", bg: "bg-transparent", text: "text-blue-600", border: "" }],

    colorful: [
    { id: "5", name: "ירוק מלא", bg: "bg-green-600", text: "text-white", border: "" },
    { id: "6", name: "סגול מלא", bg: "bg-purple-600", text: "text-white", border: "" },
    { id: "7", name: "אדום מלא", bg: "bg-red-600", text: "text-white", border: "" },
    { id: "8", name: "כתום מלא", bg: "bg-orange-600", text: "text-white", border: "" }],

    gradient: [
    { id: "9", name: "גרדיאנט כחול", bg: "bg-gradient-to-r from-blue-500 to-blue-700", text: "text-white", border: "" },
    { id: "10", name: "גרדיאנט ירוק", bg: "bg-gradient-to-r from-green-500 to-green-700", text: "text-white", border: "" },
    { id: "11", name: "גרדיאנט סגול", bg: "bg-gradient-to-r from-purple-500 to-purple-700", text: "text-white", border: "" },
    { id: "12", name: "גרדיאנט שקיעה", bg: "bg-gradient-to-r from-orange-500 to-pink-600", text: "text-white", border: "" }],

    outlined: [
    { id: "13", name: "מסגרת ירוקה", bg: "bg-transparent", text: "text-green-600", border: "border-2 border-green-500" },
    { id: "14", name: "מסגרת סגולה", bg: "bg-transparent", text: "text-purple-600", border: "border-2 border-purple-500" },
    { id: "15", name: "מסגרת אדומה", bg: "bg-transparent", text: "text-red-600", border: "border-2 border-red-500" },
    { id: "16", name: "מסגרת כתומה", bg: "bg-transparent", text: "text-orange-600", border: "border-2 border-orange-500" }]

  };

  const getSizeClasses = (sizeKey) => {
    switch (sizeKey) {
      case "sm":return { box: "w-12 h-12", icon: "w-6 h-6" };
      case "lg":return { box: "w-20 h-20", icon: "w-10 h-10" };
      default:return { box: "w-16 h-16", icon: "w-8 h-8" };
    }
  };

  const getStyleFromTheme = (styleId) => {
    for (const theme of Object.values(iconThemes)) {
      const style = theme.find((s) => s.id === styleId);
      if (style) return style;
    }
    return iconThemes.modern[3];
  };

  return (
    <div
      className={`fixed z-50 ${isCtrlPressed ? 'cursor-move' : ''}`}
      style={{
        top: `${currentPosition.top}px`,
        left: `${currentPosition.left}px`,
        transform: `scale(${prefs.scale || 1})`,
        transformOrigin: "top left"
      }}
      onMouseDown={handleMouseDown}
      dir="rtl">

      {isCtrlPressed &&
      <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg whitespace-nowrap text-sm font-semibold animate-pulse">
          ✋ גרור אותי עם העכבר! (Ctrl+Shift+לחיצה)
        </div>
      }
      
      <div className="rounded-full bg-white/90 backdrop-blur-sm shadow-xl border border-white/30 p-3 min-w-[72px] min-h-[72px] flex items-center justify-center ring-1 ring-slate-200/60">
        <SafeGuard>
          <div className="flex items-center gap-3">
            <Popover open={popoverOpen} onOpenChange={(open) => {setPopoverOpen(open);if (!open) {setDetailsOpen(false);setAiSuggested(false);}}}>
              <PopoverTrigger asChild>
                {(() => {
                  const sz = getSizeClasses(prefs.timerIconSize || "md");
                  const style = getStyleFromTheme(prefs.timerIconStyle || "4");
                  return (
                    <div
                      className={`relative ${sz.box} rounded-full ${style.bg} ${style.text} ${style.border} flex items-center justify-center transition-all select-none cursor-pointer hover:scale-105`}
                      role="button"
                      tabIndex={0}
                      aria-label="פתח טיימר"
                      title="טיימר (Ctrl+Alt+D לדיבאג)"
                      onDoubleClick={toggleDebug}>

                      <TimerIcon className={`${sz.icon} pointer-events-none`} />
                    </div>);

                })()}
              </PopoverTrigger>

              <PopoverContent
                side="bottom"
                align="start"
                sideOffset={10}
                className="w-[420px] p-0 border border-slate-200 bg-white shadow-2xl rounded-2xl overflow-hidden"
                dir="rtl">

                <div className="max-h-[75vh] overflow-y-auto">
                  <div className="p-4 border-b bg-gradient-to-br from-slate-50 to-white">
                    <div className="flex items-center justify-between mb-3">
                      <div
                        className="font-mono text-3xl leading-none text-transparent bg-clip-text font-bold"
                        style={{
                          backgroundImage: `linear-gradient(to bottom right, ${prefs.colorFrom}, ${prefs.colorTo})`,
                          fontFamily: prefs.fontFamily === "default" ? undefined : prefs.fontFamily
                        }}>

                        {state.h}:{state.m}:{state.s}
                      </div>
                      
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setSettingsOpen(true)}
                        className="h-9 w-9 hover:bg-slate-100"
                        title="הגדרות טיימר">

                        <Settings className="w-5 h-5" />
                      </Button>
                    </div>

                    {prefs.selectedClientId ?
                    <div className="text-sm text-slate-700 mb-3 font-medium text-right">
                        לקוח: <span className="text-blue-600">{prefs.selectedClientName}</span>
                      </div> :

                    <div className="text-sm text-slate-500 mb-3 text-right">בחר לקוח להתחלה</div>
                    }

                    {/* הודעה אם המשתמש לא מחובר */}
                  {!userLoading && !currentUser && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3 flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                      <div className="text-sm text-red-800">
                        <strong>לא מחובר!</strong> יש להתחבר למערכת כדי להפעיל את הטיימר ולשמור רישומי זמן.
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 justify-end">
                      <Button
                        size="icon"
                        onClick={() => {
                          if (!currentUser) {
                            toast.error('עליך להתחבר למערכת כדי להפעיל את הטיימר');
                            return;
                          }
                          if (!prefs.selectedClientName && !state.running) return;
                          state.toggle();
                        }}
                        disabled={!currentUser || (!prefs.selectedClientName && !state.running)}
                        className="rounded-full h-10 w-10 shadow-md hover:shadow-lg transition-all"
                        title={!currentUser ? "יש להתחבר למערכת" : !prefs.selectedClientName && !state.running ? "בחר לקוח קודם" : state.running ? "השהה" : "התחל"}>

                        {state.running ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                      </Button>
                      <Button size="icon" variant="outline" onClick={state.stop} className="rounded-full h-10 w-10" title="עצור">
                        <Square className="w-5 h-5" />
                      </Button>
                      <Button size="icon" variant="outline" onClick={state.reset} className="rounded-full h-10 w-10" title="איפוס">
                        <RefreshCcw className="w-5 h-5" />
                      </Button>
                      {/* ✅ כפתור שמור חדש */}
                      <Button 
                        size="icon" 
                        variant="outline" 
                        onClick={handleSaveClick}
                        disabled={!currentUser || !prefs.selectedClientName}
                        className="rounded-full h-10 w-10 bg-green-50 hover:bg-green-100 border-green-300"
                        title={!currentUser ? "יש להתחבר למערכת" : !prefs.selectedClientName ? "בחר לקוח לפני שמירה" : "שמור"}>
                        <Save className="w-5 h-5 text-green-600" />
                      </Button>
                    </div>
                  </div>

                  {/* סעיף בחירת לקוח - מוצג רק כש-detailsOpen הוא false */}
                  {!detailsOpen &&
                  <div className="p-4">
                      <div className="text-base font-bold text-slate-800 mb-3 text-right">בחר לקוח</div>
                      <Input
                      placeholder="חיפוש לקוח..."
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      className="bg-white/70 h-10 text-sm text-right mb-2"
                      dir="rtl" />

                      
                      {/* מספר תוצאות */}
                      {query &&
                    <div className="text-xs text-slate-500 mb-2 px-1 text-right">
                          {filtered.length} תוצאות
                        </div>
                    }
                      
                      <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-sm">
                        <div className="py-1">
                          {filtered.length === 0 ?
                        <div className="text-sm text-slate-600 p-6 text-center">
                              {query ? 'לא נמצאו לקוחות תואמים' : 'לא נמצאו לקוחות'}
                            </div> :

                        filtered.map((c) => {
                            const isRecent = !query && (prefs.recentClients || []).some((r) => r.id === c.id);
                            const currentStage = c.stage && c.stage !== 'ללא' ? stageOptions.find(s => s.value === c.stage) : null;

                            return (
                              <button
                              key={c.id}
                              className={`w-full text-right px-4 py-3 hover:bg-blue-50 transition flex flex-col border-b border-slate-100 last:border-b-0 ${isRecent ? 'bg-blue-50/50' : ''}`}
                              onClick={() => {
                                console.log('⏱️⏱️⏱️ [TIMER] Client clicked:', c.name);
                                savePrefs({ selectedClientId: c.id, selectedClientName: c.name || "" });
                                saveRecentClient(c.id, c.name || "");
                                if (!state.running) {
                                  state.toggle();
                                }
                                logInfo("timer", "client_selected", "Client selected and timer auto-started", { clientId: c.id, clientName: c.name });
                              }}>

                                  <div className="flex items-center justify-between w-full">
                                    <div className="flex items-center gap-2">
                                      {currentStage && c.stage && c.stage !== 'ללא' ? (
                                        <>
                                          <Circle 
                                            className="w-3 h-3 flex-shrink-0 fill-current"
                                            style={{ color: currentStage.color }}
                                            title={currentStage.label}
                                          />
                                          {console.log('⏱️⏱️⏱️ [TIMER] ✅ Rendered stage icon with color:', currentStage.color, 'for stage:', c.stage)}
                                        </>
                                      ) : (
                                        <>
                                          {console.log('⏱️⏱️⏱️ [TIMER] ❌ No stage icon rendered. Reason:', !c.stage ? 'No stage on client' : c.stage === 'ללא' ? 'Stage is ללא (hidden)' : 'Stage not found in options')}
                                        </>
                                      )}
                                      <span className="text-sm text-slate-900 truncate font-semibold">{c.name || "ללא שם"}</span>
                                    </div>
                                    {isRecent && <span className="text-[10px] text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full mr-2 font-medium">אחרון</span>}
                                  </div>
                                  {(c.company || c.email || c.phone) &&
                              <span className="text-xs text-slate-500 truncate mt-1">
                                      {(c.company || c.email || c.phone || "").toString()}
                                    </span>
                              }
                                </button>);

                        })
                        }

                        })
                        }
                        </div>
                      </div>
                      
                      {filtered.length > 8 &&
                    <div className="text-xs text-slate-400 mt-2 px-1 flex items-center gap-1 justify-center">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                          גלול למטה לעוד לקוחות
                        </div>
                    }
                    </div>
                  }

                  {detailsOpen &&
                    <div className="p-4">
                      <div className="space-y-4">
                        {aiSuggesting &&
                          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-xl p-4 flex items-center gap-3 shadow-sm">
                            <Loader2 className="w-5 h-5 animate-spin text-blue-600 flex-shrink-0" />
                            <span className="text-sm text-blue-900 font-medium">AI מציע כותרת והערות מותאמות...</span>
                          </div>
                        }

                        {aiSuggested && !aiSuggesting &&
                          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-3 flex items-center gap-2 shadow-sm">
                            <span className="text-xl">✨</span>
                            <div className="text-xs text-green-800 font-medium">
                              AI הציע תוכן - ניתן לערוך ולהתאים
                            </div>
                          </div>
                        }

                        {/* 📝 סקשן פרטי הפעילות */}
                        <div className="bg-gradient-to-br from-slate-50 to-white p-5 rounded-xl border-2 border-slate-200 shadow-sm">
                          <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2 text-right text-lg">
                            <Pencil className="w-5 h-5 text-blue-600" />
                            פרטי הפעילות
                          </h3>
                          
                          <div className="space-y-4">
                            <div>
                              <label className="text-sm font-semibold text-slate-700 mb-2 block text-right">
                                כותרת <span className="text-xs text-slate-500 font-normal">(אופציונלי)</span>
                              </label>
                              <div className="relative">
                                <Input
                                  placeholder="למשל: פגישת תכנון, ייעוץ טלפוני..."
                                  value={title}
                                  onChange={(e) => setTitle(e.target.value)}
                                  className="bg-white h-10 text-sm pr-10 text-right border-slate-300 focus:border-blue-500"
                                  dir="rtl"
                                  disabled={aiSuggesting}
                                />
                                <button
                                  onClick={() => setShowTitleTemplates(!showTitleTemplates)}
                                  className="absolute left-2 top-2 hover:bg-slate-100 rounded p-1.5 transition-colors"
                                  title="תבניות כותרת"
                                  disabled={aiSuggesting}>
                                  <BookmarkPlus className="w-4 h-4 text-slate-600" />
                                </button>
                              </div>

                              <div className="bg-white rounded-lg p-3 mt-2 border border-slate-200">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="text-[11px] text-slate-600 font-semibold text-right">בחר כותרת מהירה:</div>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setShowQuickTitleEditor(!showQuickTitleEditor)}
                                    className="h-6 px-2"
                                    title="ערוך כפתורים">
                                    <Settings className="w-3 h-3" />
                                  </Button>
                                </div>
                                <div className="flex flex-wrap gap-2 justify-end">
                                  {(prefs.quickTitlePrompts || []).map((prompt, idx) => (
                                    editingQuickTitleIdx === idx ? (
                                      <div key={idx} className="flex items-center gap-1">
                                        <Input
                                          value={prompt}
                                          onChange={(e) => {
                                            const updated = [...(prefs.quickTitlePrompts || [])];
                                            updated[idx] = e.target.value;
                                            savePrefs({ quickTitlePrompts: updated });
                                          }}
                                          onBlur={() => setEditingQuickTitleIdx(null)}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                              setEditingQuickTitleIdx(null);
                                            }
                                          }}
                                          className="h-7 text-xs w-32"
                                          autoFocus
                                        />
                                      </div>
                                    ) : (
                                      <div key={idx} className="group relative">
                                        <button
                                          onClick={() => setTitle(prompt)}
                                          className="text-xs px-3 py-1.5 bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 border border-blue-300 rounded-lg transition-all font-medium text-blue-700"
                                          disabled={aiSuggesting}>
                                          {prompt}
                                        </button>
                                        {showQuickTitleEditor && (
                                          <div className="absolute -top-1 -left-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setEditingQuickTitleIdx(idx);
                                              }}
                                              className="w-5 h-5 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center shadow-lg"
                                              title="ערוך">
                                              <Pencil className="w-2.5 h-2.5" />
                                            </button>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                deleteQuickTitlePrompt(idx);
                                              }}
                                              className="w-5 h-5 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center shadow-lg"
                                              title="מחק">
                                              <Trash2 className="w-2.5 h-2.5" />
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    )
                                  ))}
                                  {showQuickTitleEditor && (
                                    <button
                                      onClick={() => {
                                        const prompt = window.prompt('הזן כותרת חדשה:');
                                        if (prompt?.trim()) {
                                          const updated = [...(prefs.quickTitlePrompts || []), prompt.trim()];
                                          savePrefs({ quickTitlePrompts: updated });
                                        }
                                      }}
                                      className="text-xs px-3 py-1.5 bg-green-100 hover:bg-green-200 border border-green-400 rounded-lg transition-all font-medium text-green-700 flex items-center gap-1">
                                      <Plus className="w-3 h-3" />
                                      הוסף
                                    </button>
                                  )}
                                </div>
                              </div>

                              {showTitleTemplates && (
                                <div className="bg-white rounded-lg border-2 border-slate-300 p-3 mt-2 shadow-md">
                                  <div className="text-sm font-bold text-slate-800 mb-2 text-right">תבניות כותרת שמורות</div>
                                  <ScrollArea className="max-h-32">
                                    <div className="space-y-1">
                                      {prefs.titleTemplates.length === 0 ? (
                                        <div className="text-xs text-slate-500 text-center py-3">אין תבניות שמורות</div>
                                      ) : (
                                        prefs.titleTemplates.map((template, idx) => (
                                          <div key={idx} className="flex items-center gap-2 group">
                                            <button
                                              onClick={() => {
                                                setTitle(template);
                                                setShowTitleTemplates(false);
                                              }}
                                              className="flex-1 text-right text-xs px-3 py-2 hover:bg-slate-100 rounded-lg truncate transition-colors"
                                              disabled={aiSuggesting}>
                                              {template}
                                            </button>
                                            <button
                                              onClick={() => deleteTitleTemplate(idx)}
                                              className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-50 rounded transition-all"
                                              disabled={aiSuggesting}>
                                              <Trash2 className="w-3.5 h-3.5 text-red-600" />
                                            </button>
                                          </div>
                                        ))
                                      )}
                                    </div>
                                  </ScrollArea>
                                  <div className="flex gap-2 mt-3">
                                    <Input
                                      placeholder="הוסף תבנית חדשה..."
                                      value={newTitleTemplate}
                                      onChange={(e) => setNewTitleTemplate(e.target.value)}
                                      className="h-8 text-xs text-right"
                                      dir="rtl"
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                          addTitleTemplate();
                                        }
                                      }}
                                      disabled={aiSuggesting}
                                    />
                                    <Button size="sm" onClick={addTitleTemplate} className="h-8 px-3" disabled={aiSuggesting}>
                                      <Plus className="w-3.5 h-3.5" />
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>

                            <div>
                              <label className="text-sm font-semibold text-slate-700 mb-2 block text-right">
                                הערות <span className="text-xs text-slate-500 font-normal">(אופציונלי)</span>
                              </label>
                              <div className="relative">
                                <Textarea
                                  placeholder="הוסף פרטים והערות על הפעילות..."
                                  value={notes}
                                  onChange={(e) => setNotes(e.target.value)}
                                  className="bg-white min-h-[90px] text-sm pr-10 text-right border-slate-300 focus:border-blue-500 resize-none"
                                  dir="rtl"
                                  disabled={aiSuggesting}
                                />
                                <button
                                  onClick={() => setShowNotesTemplates(!showNotesTemplates)}
                                  className="absolute left-2 top-2 hover:bg-slate-100 rounded p-1.5 transition-colors"
                                  title="תבניות הערות"
                                  disabled={aiSuggesting}>
                                  <BookmarkPlus className="w-4 h-4 text-slate-600" />
                                </button>
                              </div>

                              <div className="bg-white rounded-lg p-3 mt-2 border border-slate-200">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="text-[11px] text-slate-600 font-semibold text-right">בחר הערה מהירה:</div>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setShowQuickNotesEditor(!showQuickNotesEditor)}
                                    className="h-6 px-2"
                                    title="ערוך כפתורים">
                                    <Settings className="w-3 h-3" />
                                  </Button>
                                </div>
                                <div className="flex flex-wrap gap-2 justify-end">
                                  {(prefs.quickNotesPrompts || []).map((prompt, idx) => (
                                    editingQuickNotesIdx === idx ? (
                                      <div key={idx} className="flex items-center gap-1">
                                        <Input
                                          value={prompt}
                                          onChange={(e) => {
                                            const updated = [...(prefs.quickNotesPrompts || [])];
                                            updated[idx] = e.target.value;
                                            savePrefs({ quickNotesPrompts: updated });
                                          }}
                                          onBlur={() => setEditingQuickNotesIdx(null)}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                              setEditingQuickNotesIdx(null);
                                            }
                                          }}
                                          className="h-7 text-xs w-32"
                                          autoFocus
                                        />
                                      </div>
                                    ) : (
                                      <div key={idx} className="group relative">
                                        <button
                                          onClick={() => setNotes(prompt)}
                                          className="text-xs px-3 py-1.5 bg-gradient-to-r from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 border border-purple-300 rounded-lg transition-all font-medium text-purple-700"
                                          disabled={aiSuggesting}>
                                          {prompt}
                                        </button>
                                        {showQuickNotesEditor && (
                                          <div className="absolute -top-1 -left-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setEditingQuickNotesIdx(idx);
                                              }}
                                              className="w-5 h-5 bg-purple-600 hover:bg-purple-700 text-white rounded-full flex items-center justify-center shadow-lg"
                                              title="ערוך">
                                              <Pencil className="w-2.5 h-2.5" />
                                            </button>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                deleteQuickNotesPrompt(idx);
                                              }}
                                              className="w-5 h-5 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center shadow-lg"
                                              title="מחק">
                                              <Trash2 className="w-2.5 h-2.5" />
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    )
                                  ))}
                                  {showQuickNotesEditor && (
                                    <button
                                      onClick={() => {
                                        const prompt = window.prompt('הזן הערה חדשה:');
                                        if (prompt?.trim()) {
                                          const updated = [...(prefs.quickNotesPrompts || []), prompt.trim()];
                                          savePrefs({ quickNotesPrompts: updated });
                                        }
                                      }}
                                      className="text-xs px-3 py-1.5 bg-green-100 hover:bg-green-200 border border-green-400 rounded-lg transition-all font-medium text-green-700 flex items-center gap-1">
                                      <Plus className="w-3 h-3" />
                                      הוסף
                                    </button>
                                  )}
                                </div>
                              </div>

                              {showNotesTemplates && (
                                <div className="bg-white rounded-lg border-2 border-slate-300 p-3 mt-2 shadow-md">
                                  <div className="text-sm font-bold text-slate-800 mb-2 text-right">תבניות הערות שמורות</div>
                                  <ScrollArea className="max-h-32">
                                    <div className="space-y-1">
                                      {prefs.notesTemplates.length === 0 ? (
                                        <div className="text-xs text-slate-500 text-center py-3">אין תבניות שמורות</div>
                                      ) : (
                                        prefs.notesTemplates.map((template, idx) => (
                                          <div key={idx} className="flex items-center gap-2 group">
                                            <button
                                              onClick={() => {
                                                setNotes(template);
                                                setShowNotesTemplates(false);
                                              }}
                                              className="flex-1 text-right text-xs px-3 py-2 hover:bg-slate-100 rounded-lg truncate transition-colors"
                                              disabled={aiSuggesting}>
                                              {template}
                                            </button>
                                            <button
                                              onClick={() => deleteNotesTemplate(idx)}
                                              className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-50 rounded transition-all"
                                              disabled={aiSuggesting}>
                                              <Trash2 className="w-3.5 h-3.5 text-red-600" />
                                            </button>
                                          </div>
                                        ))
                                      )}
                                    </div>
                                  </ScrollArea>
                                  <div className="flex gap-2 mt-3">
                                    <Input
                                      placeholder="הוסף תבנית חדשה..."
                                      value={newNotesTemplate}
                                      onChange={(e) => setNewNotesTemplate(e.target.value)}
                                      className="h-8 text-xs text-right"
                                      dir="rtl"
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                          addNotesTemplate();
                                        }
                                      }}
                                      disabled={aiSuggesting}
                                    />
                                    <Button size="sm" onClick={addNotesTemplate} className="h-8 px-3" disabled={aiSuggesting}>
                                      <Plus className="w-3.5 h-3.5" />
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* ⏰ סקשן תאריך וזמן */}
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-5 rounded-xl border-2 border-blue-200 shadow-sm">
                          <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2 text-right text-lg">
                            <Clock className="w-5 h-5 text-blue-600" />
                            תאריך וזמן
                          </h3>
                          
                          <div className="space-y-4">
                            <div>
                              <label className="text-sm font-semibold text-slate-700 mb-2 block text-right flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-blue-600" />
                                תאריך הפעילות
                              </label>
                              <Input
                                type="date"
                                value={selectedLogDate && !isNaN(selectedLogDate.getTime()) ? selectedLogDate.toISOString().split('T')[0] : ''}
                                onChange={(e) => {
                                  const newDate = new Date(e.target.value);
                                  if (!isNaN(newDate.getTime())) {
                                    setSelectedLogDate(newDate);
                                  }
                                }}
                                className="bg-white h-10 text-sm text-right border-blue-300 focus:border-blue-500 font-medium"
                                dir="rtl"
                              />
                              <div className="text-xs text-slate-600 mt-2 text-right">
                                📅 {selectedLogDate && !isNaN(selectedLogDate.getTime()) ? selectedLogDate.toLocaleDateString('he-IL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'תאריך לא זמין'}
                              </div>
                            </div>

                            <div>
                              <label className="text-sm font-semibold text-slate-700 mb-2 block text-right">
                                משך זמן (שעות:דקות)
                              </label>
                              <div className="flex items-center gap-3 justify-center">
                                <div className="flex flex-col items-center">
                                  <Input
                                    value={manualH}
                                    onChange={(e) => setManualH(e.target.value.replace(/\D/g, "").slice(0, 2))}
                                    className="w-20 h-12 text-center text-lg font-bold bg-white border-blue-300"
                                    placeholder="00"
                                    dir="ltr"
                                    disabled={aiSuggesting}
                                  />
                                  <span className="text-xs text-slate-600 mt-1 font-medium">שעות</span>
                                </div>
                                <span className="text-2xl font-bold text-blue-600 mt-[-20px]">:</span>
                                <div className="flex flex-col items-center">
                                  <Input
                                    value={manualM}
                                    onChange={(e) => setManualM(e.target.value.replace(/\D/g, "").slice(0, 2))}
                                    className="w-20 h-12 text-center text-lg font-bold bg-white border-blue-300"
                                    placeholder="00"
                                    dir="ltr"
                                    disabled={aiSuggesting}
                                  />
                                  <span className="text-xs text-slate-600 mt-1 font-medium">דקות</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* כפתורי פעולה */}
                        <div className="flex items-center gap-3 pt-2">
                          <Button
                            variant="outline"
                            size="lg"
                            className="flex-1 rounded-xl h-12 font-bold border-2"
                            onClick={() => {setDetailsOpen(false);setAiSuggested(false);}}
                            disabled={aiSuggesting}>
                            ביטול
                          </Button>
                          <Button
                            size="lg"
                            className="flex-1 rounded-xl h-12 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg font-bold text-white"
                            onClick={handleSaveClick}
                            disabled={!prefs.selectedClientName || aiSuggesting}>
                            <Save className="w-5 h-5 ml-2" />
                            אשר ושמור
                          </Button>
                        </div>
                      </div>
                    </div>
                  }
                </div>
              </PopoverContent>
            </Popover>

            {state.running &&
            <div className="flex items-center gap-2 bg-white/80 border border-slate-200 rounded-xl px-2 py-1 shadow-sm">
                <span className="font-mono text-xs text-slate-700">{state.h}:{state.m}:{state.s}</span>
                <span
                className={`h-2 w-2 rounded-full ${
                state.debug?.stalled ? 'bg-red-500' : state.debug?.corrected ? 'bg-amber-500' : 'bg-green-500'}`
                }
                title={state.debug?.stalled ? 'הטיימר נראה תקוע' : state.debug?.corrected ? 'תיקון סטייה בוצע' : 'עובד תקין'} />

                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 max-w-[180px] truncate" title={prefs.selectedClientName || "ללא לקוח"}>
                  {prefs.selectedClientName || 'ללא לקוח'}
                </span>
                <Button
                variant="ghost"
                size="icon"
                onClick={state.toggle}
                title="השהה"
                className="h-7 w-7">

                  <Pause className="w-4 h-4" />
                </Button>
                <Button
                variant="ghost"
                size="icon"
                onClick={state.stop}
                title="עצור"
                className="h-7 w-7">

                  <Square className="w-4 h-4" />
                </Button>
                <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  setPopoverOpen(true);
                  if (!detailsOpen) {
                    setManualH(state.h);
                    setManualM(state.m);
                    setDetailsOpen(true);
                  }
                }}
                title="שמור"
                className="h-7 w-7">

                  <Save className="w-4 h-4" />
                </Button>
              </div>
            }
          </div>

          {debugOpen &&
          <div className="mt-2 text-[11px] leading-5 bg-slate-50 border border-slate-200 rounded-lg p-2 text-right">
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                <div><span className="text-slate-500">Running:</span> <span className="font-mono">{String(state.running)}</span></div>
                <div><span className="text-slate-500">Time:</span> <span className="font-mono">{state.h}:{state.m}:{state.s} ({state.seconds}s)</span></div>
                <div><span className="text-slate-500">Last Δ:</span> <span className="font-mono">{state.debug.lastDeltaMs}ms</span></div>
                <div><span className="text-slate-500">Drift:</span> <span className="font-mono">{state.debug.driftSec}</span></div>
                <div><span className="text-slate-500">Corrected:</span> <span className="font-mono">{String(state.debug.corrected)}</span></div>
                <div><span className="text-slate-500">Stalled:</span> <span className="font-mono">{String(state.debug.stalled)}</span></div>
                <div><span className="text-slate-500">Visibility:</span> <span className="font-mono">{state.debug.visibility}</span></div>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                <div><span className="text-slate-500">Page:</span> <span className="font-mono">{currentPage}</span></div>
                <div><span className="text-slate-500">Position:</span> <span className="font-mono">{currentPosition.top},{currentPosition.left}</span></div>
              </div>
            </div>
          }
        </SafeGuard>
      </div>

      {/* דיאלוג הגדרות */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-hidden flex flex-col" dir="rtl">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>הגדרות טיימר</DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-6 py-4">
              {/* מיקום */}
              <div>
                <h3 className="text-sm font-semibold mb-3">מיקום הטיימר</h3>
                <div className="text-xs text-blue-800 bg-blue-50 p-3 rounded border border-blue-200">
                  <p className="font-semibold mb-1">כדי לשנות מיקום: לחץ והחזק <kbd>Ctrl+Shift</kbd> במקלדת,</p>
                  <p>ולאחר מכן גרור את אייקון הטיימר למיקום הרצוי עם העכבר.</p>
                  <p className="mt-1 text-blue-600">המיקום ישמר אוטומטית לעמוד הנוכחי: <span className="font-bold">{currentPage}</span></p>
                </div>
                <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded mt-3">
                  מיקום נוכחי: עמוד <strong>{currentPage}</strong> • X: {currentPosition.left}px, Y: {currentPosition.top}px
                </div>
              </div>

              {/* גודל */}
              <div>
                <h3 className="text-sm font-semibold mb-3">גודל</h3>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-slate-600">קטן</span>
                  <input
                    type="range"
                    min={0.7}
                    max={1.5}
                    step={0.05}
                    value={prefs.scale || 1}
                    onChange={(e) => savePrefs({ scale: parseFloat(e.target.value) })}
                    className="accent-blue-600 flex-1" />

                  <span className="text-xs text-slate-600">גדול</span>
                  <span className="text-xs text-slate-500 w-12">{Math.round((prefs.scale || 1) * 100)}%</span>
                </div>
              </div>

              {/* ערכות נושא */}
              <div>
                <h3 className="text-sm font-semibold mb-3">ערכות נושא</h3>
                <div className="space-y-4">
                  {Object.entries(iconThemes).map(([themeKey, styles]) =>
                  <div key={themeKey}>
                      <h4 className="text-xs font-medium text-slate-600 mb-2 capitalize">
                        {themeKey === 'modern' ? 'מודרני' :
                      themeKey === 'colorful' ? 'צבעוני' :
                      themeKey === 'gradient' ? 'גרדיאנט' : 'מסגרות'}
                      </h4>
                      <div className="grid grid-cols-4 gap-2">
                        {styles.map((style) =>
                      <button
                        key={style.id}
                        onClick={() => savePrefs({ timerIconStyle: style.id })}
                        className={`p-2 rounded-lg border-2 transition-all ${
                        prefs.timerIconStyle === style.id ? 'border-blue-500' : 'border-slate-200 hover:border-slate-300'}`
                        }
                        title={style.name}>

                            <div className={`w-8 h-8 rounded-full ${style.bg} ${style.text} ${style.border} flex items-center justify-center mx-auto`}>
                              <TimerIcon className="w-full h-full" />
                            </div>
                            <div className="text-xs text-slate-600 mt-1 truncate">{style.name}</div>
                          </button>
                      )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* גודל אייקון */}
              <div>
                <h3 className="text-sm font-semibold mb-3">גודל אייקון</h3>
                <div className="flex gap-3">
                  {[
                  { key: "sm", label: "קטן", size: "w-6 h-6" },
                  { key: "md", label: "בינוני", size: "w-8 h-8" },
                  { key: "lg", label: "גדול", size: "w-10 h-10" }].
                  map(({ key, label, size }) =>
                  <button
                    key={key}
                    onClick={() => savePrefs({ timerIconSize: key })}
                    className={`p-3 rounded-lg border-2 transition-all ${
                    prefs.timerIconSize === key ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`
                    }>

                      <div className={`${size} text-blue-600 mx-auto mb-2`}>
                        <TimerIcon className="w-full h-full" />
                      </div>
                      <div className="text-xs text-slate-600">{label}</div>
                    </button>
                  )}
                </div>
              </div>

              {/* צבעי גרדיאנט */}
              <div>
                <h3 className="text-sm font-semibold mb-3">צבעי הצגת זמן</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-600 mb-1 block">צבע התחלה</label>
                    <input
                      type="color"
                      value={prefs.colorFrom}
                      onChange={(e) => savePrefs({ colorFrom: e.target.value })}
                      className="w-full h-10 rounded border" />

                  </div>
                  <div>
                    <label className="text-xs text-slate-600 mb-1 block">צבע סיום</label>
                    <input
                      type="color"
                      value={prefs.colorTo}
                      onChange={(e) => savePrefs({ colorTo: e.target.value })}
                      className="w-full h-10 rounded border" />

                  </div>
                </div>
                <div className="mt-3 p-3 bg-slate-50 rounded-lg">
                  <div className="text-xs text-slate-600 mb-2">תצוגה מקדימה:</div>
                  <div
                    className="text-2xl font-mono text-transparent bg-clip-text inline-block"
                    style={{
                      backgroundImage: `linear-gradient(to bottom right, ${prefs.colorFrom}, ${prefs.colorTo})`
                    }}>

                    12:34:56
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>

          <div className="flex justify-end gap-2 pt-4 flex-shrink-0">
            <Button variant="outline" onClick={() => setSettingsOpen(false)}>
              סגור
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>);

}