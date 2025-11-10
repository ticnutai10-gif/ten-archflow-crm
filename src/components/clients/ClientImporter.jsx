
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Upload, Settings, Check, AlertTriangle, Loader2, X, Eye, Pencil, ArrowUp, ArrowDown } from "lucide-react";
import { Client } from "@/entities/all";
import { UploadFile } from "@/integrations/Core";
import { logInfo, logWarn, logError, listLogs } from "@/components/utils/debugLog";
import { logPerf, startTimer, endTimer, usePerformanceMonitor } from "@/components/utils/performanceLog"; // NEW: performance logging
import { Switch } from "@/components/ui/switch";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Maximize2, Minimize2, WrapText, AlignJustify, GripVertical } from "lucide-react";
import { parseSpreadsheet } from "@/functions/parseSpreadsheet";
import { PRESET_CLIENT_COLUMNS } from "@/components/constants/presetClientColumns";

const TARGET_FIELDS = [
  { key: "name", title: "שם", required: true },
  { key: "email", title: "אימייל" },
  { key: "phone", title: "טלפון" },
  { key: "company", title: "חברה" },
  { key: "address", title: "כתובת" },
  { key: "source", title: "מקור הגעה" },
  { key: "status", title: "סטטוס" },
  { key: "notes", title: "הערות" },
  // NEW: virtual targets for custom_data fields
  // נעשה מיפוי עם הערך "cf:slug" כדי לשמור ל-custom_data[slug]
  // הרשימה למטה מתווספת דינמית ב-Select
];

const SYNONYMS = {
  name: ["name", "full_name", "fullname", "שם", "שם לקוח", "לקוח", "contact name", "customer"],
  email: ["email", "mail", "e-mail", "אימייל", "דוא\"ל", "דואר"],
  phone: ["phone", "mobile", "טלפון", "נייד", "סלולרי", "מספר", "טל"],
  company: ["company", "organization", "ארגון", "חברה", "עסק", "שם חברה"],
  address: ["address", "כתובת", "רחוב", "עיר"],
  source: ["source", "מקור הגעה", "מקור", "ערוץ"],
  status: ["status", "סטטוס", "מצב"],
  notes: ["notes", "note", "הערות", "תיאור"]
};

// NEW: helper to infer extension
const getExt = (name, url) => {
  const candidates = [name || "", url || ""].filter(Boolean);
  for (const s of candidates) {
    try {
      const base = s.split('?')[0] || "";
      const ext = base.toLowerCase().split('.').pop();
      if (ext) return ext;
    } catch {}
  }
  return "";
};

function autoMapColumns(headers) {
  let mapping = {}; // Changed from const to let
  headers.forEach((h) => {
    const key = String(h || "").trim();
    const lower = key.toLowerCase();
    for (const field of TARGET_FIELDS) {
      const synonyms = SYNONYMS[field.key] || [];
      if (synonyms.some(s => lower === s.toLowerCase())) {
        mapping[key] = field.key;
        return;
      }
    }
    // Heuristics: firstName+lastName
    if (/(first\s*name|שם\s*פרטי)/i.test(lower)) mapping[key] = "__firstName";
    if (/(last\s*name|שם\s*משפחה)/i.test(lower)) mapping = { ...mapping, [key]: "__lastName" };
  });
  return mapping;
}

function buildClientRow(raw, mapping) {
  const out = {};
  for (const [srcKey, target] of Object.entries(mapping)) {
    const val = raw?.[srcKey];

    // Skip if value is null/undefined or target is explicitly null (meaning "don't map")
    if (val === undefined || val === null || target === null) {
      continue;
    }

    if (String(target).startsWith("cf:")) {
      const slug = String(target).slice(3);
      out.custom_data = out.custom_data || {};
      out.custom_data[slug] = String(val).trim(); // Ensure value is string
      continue;
    }

    if (target.startsWith("__")) continue; // Internal temp fields like __firstName
    if (val !== undefined && val !== null) out[target] = String(val).trim();
  }
  // Combine name from first/last if needed
  const first = Object.entries(mapping).find(([k, v]) => v === "__firstName");
  const last = Object.entries(mapping).find(([k, v]) => v === "__lastName");
  if ((!out.name || out.name.trim() === "") && (first || last)) {
    const fn = first ? String(raw[first[0]] || "").trim() : "";
    const ln = last ? String(raw[last[0]] || "").trim() : "";
    const combined = [fn, ln].filter(Boolean).join(" ");
    if (combined) out.name = combined;
  }
  // Fallback name
  if (!out.name || out.name.trim() === "") out.name = "לקוח ללא שם";
  return out;
}

export default function ClientImporter({ open = true, onClose, onDone }) {
  usePerformanceMonitor('ClientImporter'); // NEW: Performance monitor hook

  const [file, setFile] = React.useState(null);
  const [fileUrl, setFileUrl] = React.useState("");
  const [headers, setHeaders] = React.useState([]);
  const [rows, setRows] = React.useState([]);
  const [mapping, setMapping] = React.useState({});
  const [busy, setBusy] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [statusText, setStatusText] = React.useState("");
  const [errors, setErrors] = React.useState([]);
  const [showDebug, setShowDebug] = React.useState(false);
  const [previewCount, setPreviewCount] = React.useState(10);

  // Preview controls
  const [fullScreen, setFullScreen] = React.useState(false);
  const [wrap, setWrap] = React.useState(true);
  const [dense, setDense] = React.useState(false);
  const [headerOrder, setHeaderOrder] = React.useState([]); // order of headers for preview/reorder
  const [rowDnDEnabled, setRowDnDEnabled] = React.useState(true);

  // עריכת כותרות בתצוגה מקדימה
  const [editingHeader, setEditingHeader] = React.useState(null);
  const [headerDraft, setHeaderDraft] = React.useState("");

  // מיון בתצוגה המקדימה
  const [sortKey, setSortKey] = React.useState(null);
  const [sortDir, setSortDir] = React.useState("asc");

  // Performance monitoring for component lifecycle
  React.useEffect(() => {
    logPerf('ClientImporter', 'component_mounted', { open });
    return () => {
      logPerf('ClientImporter', 'component_unmounted', {});
    };
  }, [open]);

  const reset = () => {
    startTimer('importerReset'); // NEW: Start timer
    setFile(null); setFileUrl(""); setHeaders([]); setRows([]); setMapping({});
    setBusy(false); setProgress(0); setStatusText(""); setErrors([]);
    setFullScreen(false); setWrap(true); setDense(false); setHeaderOrder([]); setRowDnDEnabled(true);
    setEditingHeader(null); setHeaderDraft("");
    setSortKey(null); setSortDir("asc");
    endTimer('ClientImporter', 'importerReset', 100); // NEW: End timer with threshold
    logPerf('ClientImporter', 'reset_complete', {}); // NEW: Log performance
  };

  // NEW: retry helpers for integrations
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const withRetry = async (actionName, fn, { retries = 3, baseDelay = 800 } = {}) => {
    let lastErr = null;
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        logInfo("Importer", `${actionName}_attempt`, `Attempt ${attempt}/${retries}`);
        const res = await fn();
        return res;
      } catch (e) {
        lastErr = e;
        const msg = String(e?.message || e);
        logWarn("Importer", `${actionName}_failed`, msg, { attempt });
        if (attempt < retries) {
          const delay = baseDelay * attempt;
          setStatusText(`${actionName} נכשל (ניסיון ${attempt}/${retries}) — מנסה שוב בעוד ${Math.round(delay/1000)}ש׳...`);
          await sleep(delay);
        }
      }
    }
    throw lastErr;
  };

  // Helper: make slug from label (keeps Hebrew, replaces spaces, removes quotes)
  const makeSlug = (label) => {
    return String(label || "")
      .trim()
      .replace(/\s+/g, "_")
      .replace(/['"]/g, "") // Escape single and double quotes correctly
      .slice(0, 60);
  };

  // When headers change -> initialize order
  React.useEffect(() => {
    if (headers && headers.length) {
      setHeaderOrder(headers.slice());
      logInfo("Importer", "headers_initialized", "Headers detected", { count: headers.length, headers });
    }
  }, [headers]);

  // Count mapping coverage (debug helper)
  const mappingStats = React.useMemo(() => {
    // Filter out internal '__' fields and 'null' mappings for accurate count
    const mappedCount = Object.entries(mapping || {}).filter(([_, target]) => target && !String(target).startsWith('__')).length;
    return { mapped: mappedCount, total: headers.length || 0, unmapped: Math.max(0, (headers.length || 0) - mappedCount) };
  }, [mapping, headers]);

  // DND end handler (columns + rows)
  const onDragEnd = (result) => {
    if (!result?.destination) return;
    // columns
    if (result.type === "columns") {
      const arr = Array.from(headerOrder);
      const [moved] = arr.splice(result.source.index, 1);
      arr.splice(result.destination.index, 0, moved);
      setHeaderOrder(arr);
      logInfo("Importer", "columns_reordered", "Columns reordered", { from: result.source.index, to: result.destination.index });
      return;
    }
    // rows
    if (result.type === "rows") {
      // only reorders the shown slice [0..previewCount)
      const shown = rows.slice(0, previewCount);
      const rest = rows.slice(previewCount);
      const arr = Array.from(shown);
      const [moved] = arr.splice(result.source.index, 1);
      arr.splice(result.destination.index, 0, moved);
      const newRows = [...arr, ...rest];
      setRows(newRows);
      logInfo("Importer", "rows_reordered", "Rows reordered in preview", { from: result.source.index, to: result.destination.index });
    }
  };

  // helpers for preview cell classes
  const cellCls = wrap
    ? "px-3 py-2 text-right whitespace-pre-wrap break-words"
    : "px-3 py-2 text-right truncate";
  const rowCls = dense ? "text-xs" : "text-sm";

  // הבטחת ייחודיות לשמות כותרות (מונע כפילויות)
  const ensureUniqueHeader = (name, ignoreKey = null) => {
    const set = new Set(headers);
    if (ignoreKey) set.delete(ignoreKey);
    let base = String(name || "").trim() || "עמודה חדשה";
    let candidate = base;
    let i = 1;
    while (set.has(candidate)) {
      i += 1;
      candidate = `${base} (${i})`;
    }
    return candidate;
  };

  // שינוי שם כותרת + העברת הנתונים + עדכון מיפוי
  const renameHeader = (oldKey, newKey, forcedMappingValue = null) => {
    if (!oldKey) return;
    const nextLabel = ensureUniqueHeader(newKey, oldKey);
    if (nextLabel === oldKey && forcedMappingValue === null) return; // Only return if no change and no forced mapping

    // update headers + order
    setHeaders(prev => prev.map(h => (h === oldKey ? nextLabel : h)));
    setHeaderOrder(prev => prev.map(h => (h === oldKey ? nextLabel : h)));

    // move row values from oldKey to nextLabel
    setRows(prev =>
      prev.map(r => {
        if (Object.prototype.hasOwnProperty.call(r || {}, oldKey)) {
          const nr = { ...r };
          nr[nextLabel] = nr[oldKey];
          delete nr[oldKey];
          return nr;
        }
        return r;
      })
    );

    // move/override mapping
    setMapping(prev => {
      const next = { ...prev };
      const current = next[oldKey]; // This is the mapping for the OLD key
      delete next[oldKey];

      let valueToSet = forcedMappingValue; // Start with forced value

      // If no forced value, decide based on current mapping
      if (valueToSet === null) { // forcedMappingValue is null means no explicit override
        if (current === undefined || current === null || current === "") {
          // אם לא היה מיפוי קודם – צור מיפוי אוטומטי לשדה מותאם (custom_data)
          const slug = makeSlug(nextLabel); // Use the new label to make the slug
          valueToSet = `cf:${slug}`;
        } else {
          // Otherwise, retain the old mapping for the new key
          valueToSet = current;
        }
      }

      // Only set if a valid value is determined
      if (valueToSet !== undefined && valueToSet !== null && valueToSet !== "") {
        next[nextLabel] = valueToSet;
      }
      return next;
    });
    logInfo("Importer", "header_renamed", `Renamed header from "${oldKey}" to "${nextLabel}"`, { oldKey, nextLabel, forcedMappingValue });
  };

  const setSortFor = (key, dir) => {
    if (sortKey === key && sortDir === dir) {
      setSortKey(null);
      setSortDir("asc"); // Reset to default
      logInfo("Importer", "sort_cleared", "Cleared sorting", { key });
    } else {
      setSortKey(key);
      setSortDir(dir);
      logInfo("Importer", "sort_applied", "Applied sorting", { key, dir });
    }
  };

  const applyPresetToHeader = (oldKey, slug) => {
    const preset = PRESET_CLIENT_COLUMNS.find(p => p.slug === slug);
    if (!preset) return;
    const label = ensureUniqueHeader(preset.label, oldKey);
    // מיפוי אוטומטי לשדה מותאם אישית
    const mappingValue = `cf:${preset.slug}`;
    renameHeader(oldKey, label, mappingValue);
    setEditingHeader(null);
    setHeaderDraft("");
    logInfo("Importer", "preset_applied_to_header", `Applied preset "${preset.label}" to header "${oldKey}"`, { oldKey, newLabel: label, slug });
  };

  // Performance-optimized display rows
  const displayRows = React.useMemo(() => {
    startTimer('displayRowsCalc'); // NEW: Start timer
    if (!sortKey) {
      endTimer('ClientImporter', 'displayRowsCalc', 100); // NEW: End timer
      return rows;
    }
    
    const list = [...rows];
    list.sort((a, b) => {
      const va = a?.[sortKey];
      const vb = b?.[sortKey];
      const na = Number(va);
      const nb = Number(vb);
      let cmp;
      if (!isNaN(na) && !isNaN(nb)) {
        cmp = na - nb;
      } else {
        cmp = String(va ?? "").localeCompare(String(vb ?? ""), "he");
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    
    endTimer('ClientImporter', 'displayRowsCalc', 200); // NEW: End timer
    logPerf('ClientImporter', 'rows_sorted', { // NEW: Log performance
      sortKey,
      sortDir,
      rowCount: list.length
    });
    
    return list;
  }, [rows, sortKey, sortDir]);

  const onPick = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    
    startTimer('filePick'); // NEW: Start timer
    reset();
    setFile(f);
    logPerf('ClientImporter', 'file_picked', { // NEW: Log performance
      name: f.name, 
      size: f.size, 
      type: f.type,
      sizeInMB: Math.round(f.size / 1024 / 1024 * 100) / 100
    });

    // Performance warning for large files
    if (f.size > 10 * 1024 * 1024) { // 10MB
      logPerf('ClientImporter', 'large_file_warning', { // NEW: Log performance
        size: f.size,
        warning: 'File over 10MB may cause performance issues'
      });
    }

    try {
      setStatusText("מעלה קובץ...");
      const { file_url } = await withRetry("UploadFile", () => UploadFile({ file: f }), { retries: 3, baseDelay: 900 });
      setFileUrl(file_url);
      logInfo("Importer", "file_uploaded", "File uploaded", { url: file_url });

      // NEW: always use parseSpreadsheet for CSV and Excel (handles encodings internally)
      setStatusText("מחלץ נתונים (CSV/Excel)...");
      startTimer('parseFile'); // NEW: Start timer
      const { data } = await parseSpreadsheet({ file_url });
      endTimer('ClientImporter', 'parseFile', 2000); // NEW: End timer
      
      if (data?.status !== "success") {
        logPerf('ClientImporter', 'parse_failed', { data: data || {} }); // NEW: Log performance
        setErrors(prev => [...prev, "כשל בקריאת הקובץ (CSV/Excel)."]);
        setStatusText("כשל בקריאת קובץ");
        endTimer('ClientImporter', 'filePick', 5000); // NEW: Ensure timer ends on error
        return;
      }

      const list = Array.isArray(data.rows) ? data.rows : [];
      const hdrs = Array.isArray(data.headers)
        ? data.headers
        : Array.from(new Set(list.flatMap((r) => Object.keys(r || {}))).map((k) => String(k || "").trim()).filter(Boolean));

      // Performance limits
      const maxRows = 5000;
      const maxHeaders = 100;
      
      if (list.length > maxRows) {
        logPerf('ClientImporter', 'rows_limited', { // NEW: Log performance
          original: list.length,
          limited: maxRows
        });
      }
      
      if (hdrs.length > maxHeaders) {
        logPerf('ClientImporter', 'headers_limited', { // NEW: Log performance
          original: hdrs.length,
          limited: maxHeaders
        });
      }

      const limitedList = list.slice(0, maxRows);
      const limitedHeaders = hdrs.slice(0, maxHeaders);

      if (!Array.isArray(limitedList) || limitedList.length === 0) {
        setErrors(prev => [...prev, "לא נמצאו נתונים בקובץ."]);
        setStatusText("אין נתונים");
        endTimer('ClientImporter', 'filePick', 5000); // NEW: Ensure timer ends on error
        return;
      }

      setHeaders(limitedHeaders);
      const auto = autoMapColumns(limitedHeaders);
      setMapping(auto);
      setRows(limitedList);
      setStatusText(`נמצאו ${limitedList.length} שורות, מזוהות ${Object.keys(auto).length} התאמות`);
      
      endTimer('ClientImporter', 'filePick', 5000); // NEW: End timer
      logPerf('ClientImporter', 'extract_success_final', { // NEW: Log performance
        rows: limitedList.length, 
        headers: limitedHeaders.length, 
        auto_mapping: Object.keys(auto).length,
        originalRows: list.length,
        originalHeaders: hdrs.length
      });
    } catch (err) {
      const msg = String(err?.message || err);
      logPerf('ClientImporter', 'upload_or_parse_failed', { error: msg }); // NEW: Log performance
      setErrors(prev => [...prev, `שגיאה בזמן העלאה/חילוץ: ${msg}`]);
      setStatusText("נכשל — נסה שוב בעוד רגע, או העלה שוב את הקובץ");
      endTimer('ClientImporter', 'filePick', 5000); // NEW: Ensure timer ends on error
    }
  };

  const updateMapping = (srcKey, targetKey) => {
    setMapping((m) => ({ ...m, [srcKey]: targetKey }));
  };

  const startImport = async () => {
    if (rows.length === 0) return;
    setBusy(true);
    setProgress(0);
    setStatusText("מייבא...");
    setErrors([]);
    startTimer('importProcess'); // NEW: Start timer for import

    // NEW: complete mapping – כל כותרת שאין לה מיפוי תהפוך לשדה custom_data אוטומטי
    const effectiveMapping = { ...(mapping || {}) };
    (headers || []).forEach(h => {
      const val = effectiveMapping[h];
      if (val === undefined || val === null || val === "") {
        const slug = makeSlug(h);
        effectiveMapping[h] = `cf:${slug}`;
        logInfo("Importer", "automap_unmapped_header", `Auto-mapped header "${h}" to custom field "cf:${slug}"`);
      }
    });

    // Build clients from rows using effectiveMapping
    const mapped = rows.map(r => buildClientRow(r, effectiveMapping));
    const batchSize = 50;
    let created = 0;
    let failed = 0;
    for (let i = 0; i < mapped.length; i += batchSize) {
      const batch = mapped.slice(i, i + batchSize);
      try {
        await Client.bulkCreate(batch);
        created += batch.length;
      } catch (e) {
        // Try item by item to identify failures (debug)
        logWarn("Importer", "bulk_failed", "Bulk create failed, attempting per-row", { index: i, error: String(e?.message || e) });
        const results = await Promise.allSettled(batch.map(r => Client.create(r)));
        results.forEach((res, idx) => {
          if (res.status === "fulfilled") created++;
          else {
            failed++;
            setErrors(prev => [...prev, `שורה ${i + idx + 1} נכשלה: ${String(res.reason?.message || res.reason || 'שגיאה')}`]);
            logPerf("Importer", "single_client_create_failed", { row: i + idx + 1, error: String(res.reason?.message || res.reason || 'שגיאה') }); // NEW: Log performance for individual failures
          }
        });
      }
      setProgress(Math.round(((i + batch.length) / mapped.length) * 100));
      await new Promise(r => setTimeout(r, 50));
    }
    setStatusText(`הסתיים: נוצרו ${created}, נכשלו ${failed}`);
    logPerf("Importer", "import_done", { created, failed }); // NEW: Log performance
    endTimer('ClientImporter', 'importProcess', 5000); // NEW: End timer for import

    setBusy(false);
    onDone && onDone({ created, failed });
  };

  if (!open) return null;

  const debugItems = listLogs().slice(0, 80);

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
      <Card className={`w-full ${fullScreen ? "max-w-[95vw] h-[90vh]" : "max-w-5xl max-h-[90vh]"} overflow-auto rounded-2xl`}>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>ייבוא לקוחות</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => { setFullScreen(v => !v); logInfo("Importer","toggle_fullscreen", "", { fullScreen: !fullScreen }); }}>
              {fullScreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => { reset(); onClose && onClose(); }}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6" dir="rtl">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>בחר קובץ CSV/XLSX</Label>
              <div className="flex items-center gap-2">
                <Input type="file" accept=".csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" onChange={onPick} />
                <Button variant="outline" disabled>
                  <Upload className="w-4 h-4 ml-2" /> העלאה
                </Button>
              </div>
              {statusText && <div className="text-sm text-slate-600 mt-2">{statusText}</div>}
            </div>

            <div className="space-y-2">
              <Label>התקדמות</Label>
              <Progress value={progress} className="h-2" />
              {busy ? (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Loader2 className="w-4 h-4 animate-spin" /> מייבא...
                </div>
              ) : (
                <div className="text-xs text-slate-500">מוכן לייבוא</div>
              )}
            </div>
          </div>

          {headers.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-800">
                  מיפוי עמודות • {mappingStats.mapped}/{mappingStats.total} ממופות
                </h3>
                <div className="flex items-center gap-2">
                  <div className="text-xs text-slate-500">לא ממופות: {mappingStats.unmapped}</div>
                  <Button variant="outline" onClick={() => setShowDebug(v => !v)}>
                    <Settings className="w-4 h-4 ml-2" /> דיבאג
                  </Button>
                  <Button onClick={startImport} disabled={busy || rows.length === 0}>
                    {busy ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Check className="w-4 h-4 ml-2" />}
                    התחל יבוא
                  </Button>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                {headers.map((h) => (
                  <div key={h} className="p-3 border rounded-lg bg-white">
                    <div className="text-xs text-slate-500 mb-1">עמודה מקורית</div>
                    <div className="font-medium mb-2 truncate">{h}</div>
                    <Select value={mapping[h] || ""} onValueChange={(v) => updateMapping(h, v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="בחר שדה יעד" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={null}>(אל תמפה)</SelectItem>
                        <SelectItem value="__firstName">שם פרטי</SelectItem>
                        <SelectItem value="__lastName">שם משפחה</SelectItem>
                        {TARGET_FIELDS.map((f) => (
                          <SelectItem key={f.key} value={f.key}>{f.title}</SelectItem>
                        ))}
                        <div className="px-2 py-1 text-xs text-slate-500">שדות מותאמים</div>
                        {PRESET_CLIENT_COLUMNS.filter(p => !p.builtin).map((p) => (
                          <SelectItem key={`cf-${p.slug}`} value={`cf:${p.slug}`}>custom: {p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>

              {/* הוספת כותרת מוכנה לנתונים שנחצבו (מייצרת עמודה חדשה ריקה לצורך מיפוי) */}
              <div className="flex items-center gap-2 mt-4">
                <Label className="text-sm">הוסף כותרת מוכנה</Label>
                <Select onValueChange={(slug) => {
                  const preset = PRESET_CLIENT_COLUMNS.find(p => p.slug === slug);
                  if (!preset) return;
                  // הוסף כותרת לטבלת התצוגה
                  const key = ensureUniqueHeader(preset.label); // Ensure uniqueness for new header
                  if (!headers.includes(key)) {
                    setHeaders(prev => [...prev, key]);
                    setHeaderOrder(prev => [...prev, key]);
                    setRows(prev => prev.map(r => ({ ...r, [key]: "" }))); // Add empty value for new column
                    setMapping(prev => ({ ...prev, [key]: `cf:${preset.slug}` })); // Pre-map the new column
                    logInfo("Importer", "add_preset_header", "Added preset header", { key, slug });
                  } else {
                    logInfo("Importer", "add_preset_header_skipped", "Preset header already exists", { key, slug });
                  }
                }}>
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="בחר כותרת מוכנה" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRESET_CLIENT_COLUMNS.filter(p => !p.builtin).map(p => (
                      <SelectItem key={`add-${p.slug}`} value={p.slug}>{p.label} {p.group ? `• ${p.group}` : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <WrapText className="w-4 h-4 text-slate-500" />
                    <Switch checked={wrap} onCheckedChange={(v) => { setWrap(v); logInfo("Importer","toggle_wrap","", { wrap: v }); }} />
                    <span className="text-sm text-slate-600">עטיפת טקסט</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlignJustify className="w-4 h-4 text-slate-500" />
                    <Switch checked={dense} onCheckedChange={(v) => { setDense(v); logInfo("Importer","toggle_density","", { dense: v }); }} />
                    <span className="text-sm text-slate-600">תצוגה דחוסה</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <GripVertical className="w-4 h-4 text-slate-500" />
                    <Switch checked={rowDnDEnabled} onCheckedChange={(v) => { setRowDnDEnabled(v); logInfo("Importer","toggle_row_dnd","", { enabled: v }); }} />
                    <span className="text-sm text-slate-600">גרירת שורות</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-sm text-slate-600">כמות שורות לתצוגה</Label>
                  <Input
                    type="number"
                    min={1}
                    max={Math.max(1, rows.length)}
                    value={previewCount}
                    onChange={(e) => {
                      const n = Math.max(1, Math.min(rows.length || 1, Number(e.target.value || 1)));
                      setPreviewCount(n);
                      logInfo("Importer","preview_count_changed","", { previewCount: n });
                    }}
                    className="w-24 h-8"
                  />
                  <Select value={String(previewCount)} onValueChange={(v) => { const n = Number(v); setPreviewCount(n); logInfo("Importer","preview_quick_select","", { previewCount: n }); }}>
                    <SelectTrigger className="w-28 h-8">
                      <SelectValue placeholder="בחר כמות" />
                    </SelectTrigger>
                    <SelectContent align="end">
                      {[10,20,30,100].map(n => (
                        <SelectItem key={n} value={String(n)}>{n} שורות</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Eye className="w-4 h-4 text-slate-500" />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setPreviewCount(rows.length || 1); logInfo("Importer","preview_show_all",""); }}
                  >
                    הצג הכל ({rows.length})
                  </Button>
                </div>
              </div>

              {/* תצוגה מקדימה */}
              <div className="overflow-auto border rounded-lg" style={{ maxHeight: fullScreen ? "65vh" : "50vh" }}>
                <DragDropContext onDragEnd={onDragEnd}>
                  <Droppable droppableId="columns-droppable" direction="horizontal" type="columns">
                    {(provided) => (
                      <table className="min-w-full">
                        <thead className="bg-slate-50 sticky top-0 z-10" ref={provided.innerRef} {...provided.droppableProps}>
                          <tr>
                            <th className="px-2 py-2 text-slate-400 w-8 text-center">#</th>
                            {headerOrder.map((h, index) => (
                              <Draggable draggableId={`col-${h}`} index={index} key={h}>
                                {(drag) => (
                                  <th
                                    ref={drag.innerRef}
                                    {...drag.draggableProps}
                                    className="px-3 py-2 text-right font-medium text-slate-700 bg-slate-50 border-b border-slate-200 align-top"
                                  >
                                    <div className="flex items-start gap-2">
                                      <span
                                        {...drag.dragHandleProps}
                                        className="cursor-grab text-slate-400 mt-0.5"
                                        title="גרור לשינוי סדר עמודות"
                                      >
                                        <GripVertical className="w-3 h-3" />
                                      </span>

                                      {/* מצב עריכה של כותרת */}
                                      {editingHeader === h ? (
                                        <div className="space-y-1">
                                          <div className="flex items-center gap-2">
                                            <Input
                                              value={headerDraft}
                                              onChange={(e) => setHeaderDraft(e.target.value)}
                                              className="h-8 w-44"
                                              placeholder="שם עמודה"
                                              autoFocus
                                              onKeyDown={(e) => {
                                                if (e.key === "Enter") {
                                                  renameHeader(h, headerDraft);
                                                  setEditingHeader(null);
                                                  setHeaderDraft("");
                                                }
                                                if (e.key === "Escape") {
                                                  setEditingHeader(null);
                                                  setHeaderDraft("");
                                                }
                                              }}
                                            />
                                            <Button
                                              size="icon"
                                              variant="ghost"
                                              title="שמור"
                                              onClick={() => {
                                                renameHeader(h, headerDraft);
                                                setEditingHeader(null);
                                                setHeaderDraft("");
                                              }}
                                            >
                                              <Check className="w-4 h-4 text-emerald-600" />
                                            </Button>
                                            <Button
                                              size="icon"
                                              variant="ghost"
                                              title="בטל"
                                              onClick={() => {
                                                setEditingHeader(null);
                                                setHeaderDraft("");
                                              }}
                                            >
                                              <X className="w-4 h-4" />
                                            </Button>
                                          </div>
                                          {/* בחירה מכותרות מוכנות */}
                                          <div className="flex items-center gap-2">
                                            <Select onValueChange={(slug) => applyPresetToHeader(h, slug)}>
                                              <SelectTrigger className="h-8 w-56">
                                                <SelectValue placeholder="בחר מכותרות מוכנות" />
                                              </SelectTrigger>
                                              <SelectContent>
                                                {PRESET_CLIENT_COLUMNS.filter(p => !p.builtin).map(p => (
                                                  <SelectItem key={`preset-${p.slug}`} value={p.slug}>
                                                    {p.label} {p.group ? `• ${p.group}` : ""}
                                                  </SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>
                                          </div>
                                        </div>
                                      ) : (
                                        // מצב תצוגה רגיל של הכותרת
                                        <div className="flex items-center gap-2">
                                          <span className="truncate max-w-[240px]" title={h}>{h}</span>
                                          {/* אייקוני מיון קטנים */}
                                          <div className="flex items-center gap-1">
                                            <button
                                              className={`p-1 rounded hover:bg-slate-100 ${sortKey === h && sortDir === "asc" ? "text-blue-600" : "text-slate-400"}`}
                                              title="מיון עולה"
                                              onClick={() => setSortFor(h, "asc")}
                                            >
                                              <ArrowUp className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                              className={`p-1 rounded hover:bg-slate-100 ${sortKey === h && sortDir === "desc" ? "text-blue-600" : "text-slate-400"}`}
                                              title="מיון יורד"
                                              onClick={() => setSortFor(h, "desc")}
                                            >
                                              <ArrowDown className="w-3.5 h-3.5" />
                                            </button>
                                          </div>
                                          {/* עריכת כותרת */}
                                          <button
                                            className="p-1 rounded hover:bg-slate-100 text-slate-500"
                                            title="ערוך כותרת"
                                            onClick={() => { setEditingHeader(h); setHeaderDraft(h); }}
                                          >
                                            <Pencil className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </th>
                                )}
                              </Draggable>
                            ))}
                          </tr>
                          {provided.placeholder}
                        </thead>

                        <Droppable droppableId="rows-droppable" type="rows" isDropDisabled={!rowDnDEnabled || !!sortKey}>
                          {(rowsDrop) => (
                            <tbody ref={rowsDrop.innerRef} {...rowsDrop.droppableProps} className={rowCls}>
                              {displayRows.slice(0, previewCount).map((r, i) => (
                                <Draggable
                                  key={`row-${i}`}
                                  draggableId={`row-${i}`}
                                  index={i}
                                  isDragDisabled={!rowDnDEnabled || !!sortKey}
                                >
                                  {(drag) => (
                                    <tr
                                      ref={drag.innerRef}
                                      {...(rowDnDEnabled && !sortKey ? drag.draggableProps : {})}
                                      className={`border-t ${i % 2 ? "bg-white" : "bg-slate-25"} hover:bg-slate-50`}
                                    >
                                      <td className="px-2 py-2 text-slate-400 w-8 text-center align-top" {...(rowDnDEnabled && !sortKey ? drag.dragHandleProps : {})}>
                                        <GripVertical className="w-3 h-3 inline-block" />
                                      </td>
                                      {headerOrder.map((h) => (
                                        <td key={`${i}-${h}`} className={`${cellCls} align-top`}>
                                          {String(r?.[h] ?? "")}
                                        </td>
                                      ))}
                                    </tr>
                                  )}
                                
                                </Draggable>
                              ))}
                              {rowsDrop.placeholder}
                              {displayRows.length === 0 && (
                                <tr>
                                  <td colSpan={headerOrder.length + 1} className="text-center py-8 text-slate-500">
                                    אין נתונים להצגה
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          )}
                        </Droppable>
                      </table>
                    )}
                  </Droppable>
                </DragDropContext>
              </div>

              {errors.length > 0 && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
                  <div className="flex items-center gap-2 font-medium mb-1"><AlertTriangle className="w-4 h-4" /> תקלות</div>
                  <ul className="list-disc mr-5">
                    {errors.map((e, idx) => <li key={idx}>{e}</li>)}
                  </ul>
                </div>
              )}

              {showDebug && (
                <div className="p-3 rounded-lg bg-slate-50 border text-xs">
                  <div className="font-semibold mb-2">Debug Log</div>
                  <div className="max-h-48 overflow-auto space-y-1">
                    {debugItems.map((l, idx) => (
                      <div key={idx} className="flex gap-2">
                        <span className="text-slate-400">{new Date(l.ts).toLocaleTimeString()}</span>
                        <span className="font-medium">{l.source}</span>
                        <span className="text-slate-600">{l.event}</span>
                        <span className="text-slate-500 truncate">{l.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
