
import React, { useEffect, useCallback, useMemo, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Timer as TimerIcon, Play, Pause, RefreshCcw, Square, Save, Clock, Settings, Move, BookmarkPlus, Trash2, Plus, Loader2 } from 'lucide-react';
import { Client, TimeLog } from "@/entities/all";
import { logInfo, logWarn, logError, logEntry } from "@/components/utils/debugLog";
import { useAccessControl } from "@/components/access/AccessValidator";

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
  }}
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
      quickTitlePrompts: p?.timer?.quickTitlePrompts || ["פגישת תכנון", "ייעוץ טלפוני", "עדכון פרויקט"],
      quickNotesPrompts: p?.timer?.quickNotesPrompts || ["דנו בתכנון הכללי", "עדכון על התקדמות", "שאלות ובירורים"]
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
      quickTitlePrompts: ["פגישת תכנון", "ייעוץ טלפוני", "עדכון פרויקט"],
      quickNotesPrompts: ["דנו בתכנון הכללי", "עדכון על התקדמות", "שאלות ובירורים"]
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
  const [prefs, setPrefs] = React.useState(readPrefs());
  const [clients, setClients] = React.useState([]);
  const [query, setQuery] = React.useState("");
  const [popoverOpen, setPopoverOpen] = React.useState(false);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragStart, setDragStart] = React.useState({ x: 0, y: 0 });
  const [isCtrlPressed, setIsCtrlPressed] = React.useState(false);

  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const [manualH, setManualH] = React.useState("00");
  const [manualM, setManualM] = React.useState("00");
  const [manualS, setManualS] = React.useState("00");

  const [title, setTitle] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [aiSuggesting, setAiSuggesting] = React.useState(false);
  const [aiSuggested, setAiSuggested] = React.useState(false);

  const [showTitleTemplates, setShowTitleTemplates] = React.useState(false);
  const [showNotesTemplates, setShowNotesTemplates] = React.useState(false);
  const [newTitleTemplate, setNewTitleTemplate] = React.useState("");
  const [newNotesTemplate, setNewNotesTemplate] = React.useState("");

  const { getAllowedClientsForTimer, loading: accessLoading } = useAccessControl();

  // Detect Ctrl key press/release
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Control') {
        setIsCtrlPressed(true);
      }
    };

    const handleKeyUp = (e) => {
      if (e.key === 'Control') {
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

  const loadData = async () => {
    try {
      console.log('⏱️ [TIMER] Loading clients...');

      const now = Date.now();
      if (clientsCache && now - clientsCacheTime < CACHE_DURATION) {
        console.log('✅ [TIMER] Using cached clients:', clientsCache.length);
        setClients(clientsCache);
        return;
      }

      console.log('🔄 [TIMER] Cache expired or empty, fetching from server...');
      const allowedClients = await getAllowedClientsForTimer();

      console.log('✅ [TIMER] Received clients from server:', allowedClients.length);
      console.log('📋 [TIMER] Sample clients:', allowedClients.slice(0, 5).map((c) => ({ name: c.name, phone: c.phone })));

      // כבר לא מסננים לפי טלפון - מציגים את כל הלקוחות
      clientsCache = allowedClients;
      clientsCacheTime = now;

      setClients(allowedClients);
      console.log('✅ [TIMER] Loaded and cached all clients:', allowedClients.length);
    } catch (error) {
      console.error('❌ [TIMER] Error loading clients:', error);

      if (error.response?.status === 429 && clientsCache) {
        console.log('⚠️ [TIMER] Rate limit - using old cache');
        setClients(clientsCache);
      }
    }
  };

  useEffect(() => {
    if (!accessLoading) {
      loadData();
    }
  }, [accessLoading]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (popoverOpen) {
        console.log('🔄 [TIMER] Auto-refreshing cache...');
        clientsCache = null;
        loadData();
      }
    }, CACHE_DURATION);

    return () => clearInterval(interval);
  }, [popoverOpen]);

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

  // מיון לקוחות - אחרונים בראש
  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!clients) return [];

    let result = clients;
    if (q) {
      result = clients.filter((c) =>
      (c.name || "").toLowerCase().includes(q) ||
      (c.company || "").toLowerCase().includes(q) ||
      (c.email || "").toLowerCase().includes(q)
      );
    }

    // מיון לפי שימוש אחרון
    const recentIds = (prefs.recentClients || []).map((r) => r.id);
    const sorted = [...result].sort((a, b) => {
      const aIndex = recentIds.indexOf(a.id);
      const bIndex = recentIds.indexOf(b.id);

      // אם שניהם לא בשימוש אחרון - לפי שם
      if (aIndex === -1 && bIndex === -1) {
        return (a.name || "").localeCompare(b.name || "");
      }
      // אם רק אחד בשימוש אחרון - הוא קודם
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      // שניהם בשימוש אחרון - לפי סדר השימוש
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
    // Use state.seconds directly, as it's the current elapsed time
    const h = Math.floor(state.seconds / 3600);
    const m = Math.floor(state.seconds % 3600 / 60);
    const s = state.seconds % 60;
    setManualH(String(h).padStart(2, "0"));
    setManualM(String(m).padStart(2, "0"));
    setManualS(String(s).padStart(2, "0"));

    // הצעת AI לכותרת והערות
    if (prefs.selectedClientName && !aiSuggested) {
      await suggestTitleAndNotes();
    }
  };

  const computeSecondsFromManual = () => {
    const h = Math.max(0, parseInt(manualH || "0", 10) || 0);
    const m = Math.max(0, Math.min(59, parseInt(manualM || "0", 10) || 0));
    const s = Math.max(0, Math.min(59, parseInt(manualS || "0", 10) || 0));
    return h * 3600 + m * 60 + s;
  };

  const performSave = async () => {
    const today = new Date().toISOString().slice(0, 10);
    const secondsToSave = computeSecondsFromManual();
    await TimeLog.create({
      client_id: prefs.selectedClientId || "",
      client_name: prefs.selectedClientName || "",
      log_date: today,
      duration_seconds: secondsToSave,
      title: title || "",
      notes: notes || ""
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
    setDetailsOpen(false);
    setPopoverOpen(false);
    setAiSuggested(false); // Reset AI suggestion flag on successful save
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

  const handleMouseDown = (e) => {
    // Only allow dragging if Ctrl is pressed
    if (!e.ctrlKey) return;

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
          ✋ גרור אותי עם העכבר!
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
                className="w-[340px] p-0 border border-slate-200 bg-white shadow-2xl rounded-2xl overflow-hidden"
                dir="rtl">

                <div className="max-h-[75vh] overflow-y-auto">
                  <div className="p-3 border-b border-white/30">
                    <div className="flex items-center justify-between mb-3">
                      <div
                        className="font-mono text-2xl leading-none text-transparent bg-clip-text"
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
                        className="h-8 w-8"
                        title="הגדרות טיימר">

                        <Settings className="w-4 h-4" />
                      </Button>
                    </div>

                    {prefs.selectedClientId ?
                    <div className="text-[11px] text-slate-700 mb-2">
                        לקוח: <span className="font-medium">{prefs.selectedClientName}</span>
                      </div> :

                    <div className="text-[11px] text-slate-500 mb-2">בחר לקוח</div>
                    }

                    <div className="flex items-center gap-1.5">
                      <Button
                        size="icon"
                        onClick={() => {
                          if (!prefs.selectedClientName && !state.running) return;
                          state.toggle();
                        }}
                        disabled={!prefs.selectedClientName && !state.running}
                        className="rounded-full h-8 w-8"
                        title={!prefs.selectedClientName && !state.running ? "בחר לקוח קודם" : state.running ? "השהה" : "התחל"}>

                        {state.running ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </Button>
                      <Button size="icon" variant="outline" onClick={state.stop} className="rounded-full h-8 w-8" title="עצור">
                        <Square className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="outline" onClick={state.reset} className="rounded-full h-8 w-8" title="איפוס">
                        <RefreshCcw className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* סעיף בחירת לקוח - מוצג רק כש-detailsOpen הוא false */}
                  {!detailsOpen &&
                  <div className="p-3 border-b border-white/30">
                      <div className="text-sm font-semibold text-slate-800 mb-1.5">בחר לקוח</div>
                      <Input
                      placeholder="חיפוש לקוח..."
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      className="bg-white/70 h-8 text-sm" />

                      
                      {/* מספר תוצאות */}
                      {query &&
                    <div className="text-xs text-slate-500 mt-1 px-1">
                          {filtered.length} תוצאות
                        </div>
                    }
                      
                      <div className="max-h-72 overflow-y-auto mt-2 rounded-md border border-slate-100 bg-white shadow-inner">
                        <div className="py-1">
                          {filtered.length === 0 ?
                        <div className="text-sm text-slate-600 p-4 text-center">
                              {query ? 'לא נמצאו לקוחות תואמים' : 'לא נמצאו לקוחות'}
                            </div> :

                        filtered.map((c, index) => {
                          const isRecent = !query && (prefs.recentClients || []).some((r) => r.id === c.id);
                          return (
                            <button
                              key={c.id}
                              className={`w-full text-right px-3 py-2 hover:bg-blue-50 transition flex flex-col rounded-md border-b border-slate-50 last:border-b-0 ${isRecent ? 'bg-blue-50/30' : ''}`}
                              onClick={() => {
                                savePrefs({ selectedClientId: c.id, selectedClientName: c.name || "" });
                                saveRecentClient(c.id, c.name || "");
                                if (!state.running) {
                                  state.toggle();
                                }
                                logInfo("timer", "client_selected", "Client selected and timer auto-started", { clientId: c.id, clientName: c.name });
                              }}>

                                  <div className="flex items-center justify-between w-full">
                                    <span className="text-sm text-slate-800 truncate font-medium">{c.name || "ללא שם"}</span>
                                    {isRecent && <span className="text-[10px] text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded mr-2">אחרון</span>}
                                  </div>
                                  {(c.company || c.email || c.phone) &&
                              <span className="text-[11px] text-slate-500 truncate">
                                      {(c.company || c.email || c.phone || "").toString()}
                                    </span>
                              }
                                </button>);

                        })
                        }
                        </div>
                      </div>
                      
                      {/* אינדיקטור גלילה */}
                      {filtered.length > 8 &&
                    <div className="text-xs text-slate-400 mt-1 px-1 flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                          גלול למטה לעוד לקוחות
                        </div>
                    }
                    </div>
                  }

                  <div className="p-3">
                    {!detailsOpen ?
                    <Button
                      size="sm"
                      className="w-full rounded-full"
                      onClick={handleSaveClick}
                      disabled={!prefs.selectedClientName}
                      title={!prefs.selectedClientName ? "בחר לקוח לפני שמירה" : "שמור"}>

                        <Save className="w-4 h-4 ml-1" />
                        שמור
                      </Button> :

                    <div className="space-y-3">
                        {/* אינדיקטור טעינת AI */}
                        {aiSuggesting &&
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                            <span className="text-sm text-blue-700">AI מציע כותרת והערות...</span>
                          </div>
                      }

                        {/* אינדיקטור שהצעת AI הצליחה */}
                        {aiSuggested && !aiSuggesting &&
                      <div className="bg-green-50 border border-green-200 rounded-lg p-2 flex items-center gap-2">
                            <div className="text-xs text-green-700 flex items-center gap-1">
                              <span>✨</span>
                              <span>AI הציע תוכן - ניתן לערוך</span>
                            </div>
                          </div>
                      }

                        {/* כותרת והערות - מועברים למעלה */}
                        <div className="grid gap-2">
                          <div className="relative">
                            <label className="text-slate-600 mb-1 text-lg font-medium block">כותרת (אופציונלי)</label>
                            <Input
                            placeholder="כותרת..."
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="bg-white/80 h-8 text-sm pr-8"
                            disabled={aiSuggesting} />

                            <button
                            onClick={() => setShowTitleTemplates(!showTitleTemplates)}
                            className="absolute left-2 top-7 hover:bg-slate-100 rounded p-1"
                            title="תבניות כותרת"
                            disabled={aiSuggesting}>

                              <BookmarkPlus className="w-4 h-4 text-slate-600" />
                            </button>
                          </div>

                          {/* 3 פרומפטים קבועים לכותרת */}
                          <div className="bg-slate-50 rounded-lg p-2 border border-slate-200">
                            <div className="text-[10px] text-slate-500 mb-1 font-medium">בחר כותרת מהירה:</div>
                            <div className="flex flex-wrap gap-1">
                              {(prefs.quickTitlePrompts || []).map((prompt, idx) =>
                            <button
                              key={idx}
                              onClick={() => setTitle(prompt)}
                              className="text-xs px-2 py-1 bg-white hover:bg-blue-50 border border-slate-200 rounded transition-colors"
                              disabled={aiSuggesting}>

                                  {prompt}
                                </button>
                            )}
                            </div>
                          </div>

                          {showTitleTemplates &&
                        <div className="bg-white rounded-lg border p-2 space-y-2">
                              <div className="text-xs font-semibold text-slate-700">תבניות כותרת</div>
                              <ScrollArea className="max-h-32">
                                <div className="space-y-1">
                                  {prefs.titleTemplates.length === 0 ?
                              <div className="text-xs text-slate-500 text-center py-2">אין תבניות שמורות</div> :

                              prefs.titleTemplates.map((template, idx) =>
                              <div key={idx} className="flex items-center gap-2 group">
                                        <button
                                  onClick={() => {
                                    setTitle(template);
                                    setShowTitleTemplates(false);
                                  }}
                                  className="flex-1 text-right text-xs px-2 py-1 hover:bg-slate-100 rounded truncate"
                                  disabled={aiSuggesting}>

                                          {template}
                                        </button>
                                        <button
                                  onClick={() => deleteTitleTemplate(idx)}
                                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 rounded"
                                  disabled={aiSuggesting}>

                                          <Trash2 className="w-3 h-3 text-red-600" />
                                        </button>
                                      </div>
                              )
                              }
                                </div>
                              </ScrollArea>
                              <div className="flex gap-1">
                                <Input
                              placeholder="הוסף תבנית חדשה..."
                              value={newTitleTemplate}
                              onChange={(e) => setNewTitleTemplate(e.target.value)}
                              className="h-7 text-xs"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  addTitleTemplate();
                                }
                              }}
                              disabled={aiSuggesting} />

                                <Button size="sm" onClick={addTitleTemplate} className="h-7 px-2" disabled={aiSuggesting}>
                                  <Plus className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                        }

                          <div className="relative">
                            <label className="text-slate-600 mb-1 text-lg font-medium block">הערות (אופציונלי)</label>
                            <Textarea
                            placeholder="הערות..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="bg-white/80 min-h-[70px] text-sm pr-8"
                            disabled={aiSuggesting} />

                            <button
                            onClick={() => setShowNotesTemplates(!showNotesTemplates)}
                            className="absolute left-2 top-7 hover:bg-slate-100 rounded p-1"
                            title="תבניות הערות"
                            disabled={aiSuggesting}>

                              <BookmarkPlus className="w-4 h-4 text-slate-600" />
                            </button>
                          </div>

                          {/* 3 פרומפטים קבועים להערות */}
                          <div className="bg-slate-50 rounded-lg p-2 border border-slate-200">
                            <div className="text-[10px] text-slate-500 mb-1 font-medium">בחר הערה מהירה:</div>
                            <div className="flex flex-wrap gap-1">
                              {(prefs.quickNotesPrompts || []).map((prompt, idx) =>
                            <button
                              key={idx}
                              onClick={() => setNotes(prompt)}
                              className="text-xs px-2 py-1 bg-white hover:bg-blue-50 border border-slate-200 rounded transition-colors"
                              disabled={aiSuggesting}>

                                  {prompt}
                                </button>
                            )}
                            </div>
                          </div>

                          {showNotesTemplates &&
                        <div className="bg-white rounded-lg border p-2 space-y-2">
                              <div className="text-xs font-semibold text-slate-700">תבניות הערות</div>
                              <ScrollArea className="max-h-32">
                                <div className="space-y-1">
                                  {prefs.notesTemplates.length === 0 ?
                              <div className="text-xs text-slate-500 text-center py-2">אין תבניות שמורות</div> :

                              prefs.notesTemplates.map((template, idx) =>
                              <div key={idx} className="flex items-center gap-2 group">
                                        <button
                                  onClick={() => {
                                    setNotes(template);
                                    setShowNotesTemplates(false);
                                  }}
                                  className="flex-1 text-right text-xs px-2 py-1 hover:bg-slate-100 rounded truncate"
                                  disabled={aiSuggesting}>

                                          {template}
                                        </button>
                                        <button
                                  onClick={() => deleteNotesTemplate(idx)}
                                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 rounded"
                                  disabled={aiSuggesting}>

                                          <Trash2 className="w-3 h-3 text-red-600" />
                                        </button>
                                      </div>
                              )
                              }
                                </div>
                              </ScrollArea>
                              <div className="flex gap-1">
                                <Input
                              placeholder="הוסף תבנית חדשה..."
                              value={newNotesTemplate}
                              onChange={(e) => setNewNotesTemplate(e.target.value)}
                              className="h-7 text-xs"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  addNotesTemplate();
                                }
                              }}
                              disabled={aiSuggesting} />

                                <Button size="sm" onClick={addNotesTemplate} className="h-7 px-2" disabled={aiSuggesting}>
                                  <Plus className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                        }
                        </div>

                        <div>
                          <div className="text-xs text-slate-600 mb-1">זמן להכנסה</div>
                          <div className="flex items-center gap-2">
                            <Input
                            value={manualH}
                            onChange={(e) => setManualH(e.target.value.replace(/\D/g, "").slice(0, 2))}
                            className="w-14 h-8 text-center"
                            placeholder="שש"
                            disabled={aiSuggesting} />

                            <span className="text-slate-400">:</span>
                            <Input
                            value={manualM}
                            onChange={(e) => setManualM(e.target.value.replace(/\D/g, "").slice(0, 2))}
                            className="w-14 h-8 text-center"
                            placeholder="דד"
                            disabled={aiSuggesting} />

                            <span className="text-slate-400">:</span>
                            <Input
                            value={manualS}
                            onChange={(e) => setManualS(e.target.value.replace(/\D/g, "").slice(0, 2))}
                            className="w-14 h-8 text-center"
                            placeholder="שש"
                            disabled={aiSuggesting} />

                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <Button
                          variant="outline"
                          size="sm"
                          className="rounded-full"
                          onClick={() => {setDetailsOpen(false);setAiSuggested(false);}}
                          disabled={aiSuggesting}>

                            בטל
                          </Button>
                          <Button
                          size="sm"
                          className="rounded-full"
                          onClick={handleSaveClick}
                          disabled={!prefs.selectedClientName || aiSuggesting}>

                            <Save className="w-4 h-4 ml-1" />
                            אשר ושמור
                          </Button>
                        </div>
                      </div>
                    }
                  </div>
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
                    setManualS(state.s);
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
                  <p className="font-semibold mb-1">כדי לשנות מיקום: לחץ והחזק את מקש <kbd>Ctrl</kbd> במקלדת,</p>
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