import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Settings, GripVertical, Eye, EyeOff, Save, RefreshCw } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

const LS_KEY = "app-preferences";
const DEFAULT_PREFS = {
  fontFamily: "default",
  fontSize: 16,
  fontBold: false,
  theme: "orchid",
  accentMode: "gradient",
  timerIconStyle: "4",
  timerIconSize: "md",
  dashboard: {
    order: ["projects", "quotes", "timers", "tasks", "goals"],
    visibility: { projects: true, quotes: true, timers: true, tasks: true, goals: true },
    columns: 3,
  },
};

const sectionMeta = {
  projects: { title: "פרויקטים אחרונים" },
  quotes: { title: "הצעות מחיר אחרונות" },
  timers: { title: "רישומי זמן אחרונים" },
  tasks: { title: "משימות קרובות" },
  goals: { title: "יעדים השבוע" },
};

function loadPrefs() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_PREFS,
      ...parsed,
      dashboard: {
        ...DEFAULT_PREFS.dashboard,
        ...(parsed.dashboard || {}),
        visibility: {
          ...DEFAULT_PREFS.dashboard.visibility,
          ...((parsed.dashboard && parsed.dashboard.visibility) || {}),
        },
        order:
          (parsed.dashboard && parsed.dashboard.order && parsed.dashboard.order.length
            ? parsed.dashboard.order
            : DEFAULT_PREFS.dashboard.order),
        columns: (parsed.dashboard && parsed.dashboard.columns) || DEFAULT_PREFS.dashboard.columns,
      },
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

function savePrefs(prefs) {
  localStorage.setItem(LS_KEY, JSON.stringify(prefs));
  try {
    window.dispatchEvent(new CustomEvent("preferences:changed", { detail: prefs }));
  } catch {}
}

const savePrefsPartial = (patch) => {
  try {
    const raw = localStorage.getItem(LS_KEY);
    const p = raw ? JSON.parse(raw) : {};
    const updated = { ...p, ...patch };
    localStorage.setItem(LS_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("preferences:changed", { detail: updated }));
  } catch {}
};

const applyTheme = (themeKey) => {
  savePrefsPartial({ theme: themeKey });
};

const themeChoices = [
  { key: "orchid",    label: "1 • Orchid" },
  { key: "vivid",     label: "2 • Vivid" },
  { key: "mint",      label: "3 • Mint" },
  { key: "lavender",  label: "4 • Lavender" },
  { key: "ocean",     label: "5 • Ocean" },
  { key: "forest",    label: "6 • Forest" },
  { key: "sunset",    label: "7 • Sunset" },
  { key: "charcoal",  label: "8 • Charcoal Gold" },
  { key: "royal",     label: "9 • Royal" },
  { key: "neon",      label: "10 • Neon" },
  { key: "aurora",    label: "11 • Aurora" },
  { key: "cobalt",    label: "12 • Cobalt" },
  { key: "blush",     label: "13 • Blush" },
  { key: "citrus",    label: "14 • Citrus" },
  { key: "graphite",  label: "15 • Graphite" },
  { key: "pastel",    label: "16 • Pastel" },
];

export default function AppSettings() {
  const [open, setOpen] = React.useState(false);
  const [prefs, setPrefs] = React.useState(DEFAULT_PREFS);

  React.useEffect(() => {
    setPrefs(loadPrefs());
  }, []);

  React.useEffect(() => {
    const onPrefs = (e) => {
      const p = e.detail || {};
      if (p?.timerIconStyle) setTimerIconStyle(String(p.timerIconStyle));
      if (p?.timerIconSize) setTimerIconSize(String(p.timerIconSize));
      setPrefs((currentPrefs) => ({
        ...currentPrefs,
        ...p,
        dashboard: {
          ...currentPrefs.dashboard,
          ...(p.dashboard || {}),
          visibility: {
            ...currentPrefs.dashboard.visibility,
            ...((p.dashboard && p.dashboard.visibility) || {}),
          },
          order: p.dashboard?.order || currentPrefs.dashboard.order,
          columns: p.dashboard?.columns || currentPrefs.dashboard.columns,
        },
      }));
    };
    window.addEventListener("preferences:changed", onPrefs);
    return () => window.removeEventListener("preferences:changed", onPrefs);
  }, []);

  const [timerIconStyle, setTimerIconStyle] = React.useState(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      const p = raw ? JSON.parse(raw) : null;
      return String(p?.timerIconStyle || "4");
    } catch {
      return "4";
    }
  });
  
  const [timerIconSize, setTimerIconSize] = React.useState(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      const p = raw ? JSON.parse(raw) : null;
      return String(p?.timerIconSize || "md");
    } catch {
      return "md";
    }
  });

  const saveTimerIconStyle = (value) => {
    setTimerIconStyle(value);
    savePrefsPartial({ timerIconStyle: value });
  };
  
  const saveTimerIconSize = (value) => {
    setTimerIconSize(value);
    savePrefsPartial({ timerIconSize: value });
  };

  const setValue = (path, value) => {
    setPrefs((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      const parts = path.split(".");
      let ref = next;
      for (let i = 0; i < parts.length - 1; i++) ref = ref[parts[i]];
      ref[parts[parts.length - 1]] = value;
      return next;
    });
  };

  const onDragEnd = (result) => {
    if (!result.destination) return;
    const items = Array.from(prefs.dashboard.order);
    const [moved] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, moved);
    setValue("dashboard.order", items);
  };

  const restoreDefaults = () => {
    setPrefs(DEFAULT_PREFS);
    savePrefs(DEFAULT_PREFS);
  };

  const handleSave = () => {
    savePrefs(prefs);
    setOpen(false);
  };

  const fontPreviewStyle = {
    fontFamily:
      prefs.fontFamily === "arial"
        ? "Arial, Helvetica, sans-serif"
        : prefs.fontFamily === "david"
        ? "'David', Arial, sans-serif"
        : "inherit",
    fontWeight: prefs.fontBold ? 600 : 400,
    fontSize: `${prefs.fontSize}px`,
  };

  return (
    <>
      {/* Floating subtle settings button */}
      <button
        onClick={() => setOpen(true)}
        title="הגדרות תצוגה"
        className="fixed bottom-6 left-6 z-50 h-10 w-10 rounded-full bg-slate-900/70 text-white flex items-center justify-center shadow-lg hover:bg-slate-900 transition-colors"
      >
        <Settings className="w-5 h-5" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle>הגדרות תצוגה</DialogTitle>
          </DialogHeader>

          <div dir="rtl" className="text-right">
            <div className="app-settings-scroll max-h-[85vh] overflow-y-auto pr-2">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Typography */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-slate-800">טיפוגרפיה</h3>

                  <div className="space-y-2">
                    <Label>גופן</Label>
                    <Select
                      value={prefs.fontFamily}
                      onValueChange={(v) => setValue("fontFamily", v)}
                    >
                      <SelectTrigger><SelectValue placeholder="בחר גופן" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">ברירת מחדל</SelectItem>
                        <SelectItem value="arial">Arial</SelectItem>
                        <SelectItem value="david">David</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>גודל גופן ({prefs.fontSize}px)</Label>
                    <input
                      type="range"
                      min={14}
                      max={20}
                      step={1}
                      value={prefs.fontSize}
                      onChange={(e) => setValue("fontSize", parseInt(e.target.value, 10))}
                      className="w-full accent-slate-800"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>מודגש (Bold)</Label>
                    <Switch
                      checked={prefs.fontBold}
                      onCheckedChange={(v) => setValue("fontBold", v)}
                    />
                  </div>

                  <div className="p-3 rounded-md border bg-slate-50">
                    <div className="text-sm text-slate-600 mb-1">תצוגה מקדימה</div>
                    <div className="bg-white rounded-md border p-3" style={fontPreviewStyle}>
                      זהו טקסט לדוגמה בעברית להצגת הגדרות הגופן.
                    </div>
                  </div>

                  <div className="space-y-2 mt-3">
                    <Label>סגנון הדגשה</Label>
                    <Select
                      value={prefs.accentMode || "gradient"}
                      onValueChange={(v) => setValue("accentMode", v)}
                    >
                      <SelectTrigger><SelectValue placeholder="בחר סגנון" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gradient">גרדיאנט</SelectItem>
                        <SelectItem value="solid">צבע אחיד</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-slate-500">ישפיע על כפתור הטיימר הצף, לוגו הסיידבר והדגשות בממשק.</p>
                  </div>

                  <div className="mt-4 p-4 border rounded-xl bg-white/80 backdrop-blur-sm" dir="rtl">
                    <div className="flex flex-col gap-4">
                      <div>
                        <Label className="text-sm font-semibold text-slate-700">סגנון אייקון הטיימר</Label>
                        <div className="text-xs text-slate-500 mb-2">בחר איך יוצג האייקון הצף</div>
                        <div className="max-w-xs">
                          <Select value={timerIconStyle} onValueChange={saveTimerIconStyle}>
                            <SelectTrigger>
                              <SelectValue placeholder="בחר סגנון" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">1 • עיגול מלא, אייקון לבן (בולט)</SelectItem>
                              <SelectItem value="2">2 • עיגול שקוף, מסגרת צבעונית</SelectItem>
                              <SelectItem value="3">3 • עיגול שקוף, מסגרת עדינה</SelectItem>
                              <SelectItem value="4">4 • אייקון בלבד (ברירת מחדל)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div>
                        <Label className="text-sm font-semibold text-slate-700">גודל האייקון</Label>
                        <div className="text-xs text-slate-500 mb-2">הקטן/הגדל את גודל הטיימר</div>
                        <div className="max-w-xs">
                          <Select value={timerIconSize} onValueChange={saveTimerIconSize}>
                            <SelectTrigger>
                              <SelectValue placeholder="בחר גודל" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="sm">קטן</SelectItem>
                              <SelectItem value="md">רגיל</SelectItem>
                              <SelectItem value="lg">גדול</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* טיפ להזזת טיימר */}
                  <div className="mt-4 p-4 border-2 border-blue-200 rounded-xl bg-blue-50" dir="rtl">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Settings className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-blue-900 mb-1">💡 הזזת טיימר</h4>
                        <p className="text-sm text-blue-800 leading-relaxed">
                          להזזת הטיימר למיקום חדש:
                        </p>
                        <div className="mt-2 p-3 bg-white rounded-lg border border-blue-200">
                          <p className="text-sm text-blue-900 font-medium">
                            החזק <kbd className="px-2 py-1 bg-blue-100 rounded border border-blue-300 font-mono text-xs">Ctrl</kbd> + לחץ על הטיימר וגרור
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Dashboard sections */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-slate-800">כרטיסים בדשבורד</h3>
                    <Button variant="outline" size="sm" onClick={restoreDefaults}>
                      <RefreshCw className="w-4 h-4 ml-2" />
                      שחזור ברירת מחדל
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label>פריסת טורים</Label>
                    <Select
                      value={String(prefs.dashboard.columns)}
                      onValueChange={(v) => setValue("dashboard.columns", parseInt(v, 10))}
                    >
                      <SelectTrigger><SelectValue placeholder="בחר מספר טורים" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">טור אחד</SelectItem>
                        <SelectItem value="2">2 טורים</SelectItem>
                        <SelectItem value="3">3 טורים</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <p className="text-sm text-slate-500">
                    גרור לשינוי סדר, והשתמש במתג כדי להציג/להסתיר כרטיס.
                  </p>

                  <div className="rounded-md border bg-white">
                    <DragDropContext onDragEnd={onDragEnd}>
                      <Droppable droppableId="sections">
                        {(provided) => (
                          <div ref={provided.innerRef} {...provided.droppableProps} className="divide-y">
                            {prefs.dashboard.order.map((id, index) => (
                              <Draggable key={id} draggableId={id} index={index}>
                                {(drag) => (
                                  <div
                                    ref={drag.innerRef}
                                    {...drag.draggableProps}
                                    className="flex items-center justify-between p-3"
                                  >
                                    <div className="flex items-center gap-2">
                                      <span {...drag.dragHandleProps} className="cursor-grab text-slate-400">
                                        <GripVertical className="w-4 h-4" />
                                      </span>
                                      <span className="font-medium text-slate-800">
                                        {sectionMeta[id]?.title || id}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <Switch
                                        checked={!!prefs.dashboard.visibility[id]}
                                        onCheckedChange={(v) =>
                                          setValue("dashboard.visibility", {
                                            ...prefs.dashboard.visibility,
                                            [id]: v,
                                          })
                                        }
                                      />
                                      {prefs.dashboard.visibility[id] ? (
                                        <Eye className="w-4 h-4 text-slate-400" />
                                      ) : (
                                        <EyeOff className="w-4 h-4 text-slate-300" />
                                      )}
                                    </div>
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </DragDropContext>
                  </div>
                </div>
              </div>

              {/* Theme picker */}
              <div className="mt-6 p-4 border rounded-xl bg-white/80 backdrop-blur-sm">
                <h3 className="text-base font-semibold mb-2">בחירת ערכת נושא (החלפה מיידית)</h3>
                <p className="text-xs text-slate-500 mb-3">לחץ על ערכה כדי להחיל אותה מיד. הרשימה ממוספרת — תוכל לומר לי מה להסיר.</p>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {themeChoices.map((t) => (
                    <button
                      key={t.key}
                      onClick={() => applyTheme(t.key)}
                      className="text-sm px-3 py-2 rounded-lg border hover:bg-slate-50 text-right"
                      title={`החל ערכה: ${t.label}`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <Button variant="outline" onClick={() => setOpen(false)}>ביטול</Button>
                <Button onClick={handleSave}>
                  <Save className="w-4 h-4 ml-2" />
                  שמור הגדרות
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}