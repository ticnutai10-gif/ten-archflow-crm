import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { GripVertical, Eye, EyeOff, RefreshCw, LayoutDashboard } from "lucide-react";
import { toast } from "sonner";

const LS_KEY = "app-preferences";
const DEFAULT_PREFS = {
  dashboard: {
    order: ["projects", "quotes", "timers", "tasks", "goals", "meetings"],
    visibility: { 
      projects: true, 
      quotes: true, 
      timers: true, 
      tasks: true, 
      goals: true,
      meetings: true 
    },
    columns: 3,
  },
};

const sectionMeta = {
  projects: { title: "פרויקטים אחרונים", icon: "📊" },
  quotes: { title: "הצעות מחיר אחרונות", icon: "💰" },
  timers: { title: "רישומי זמן אחרונים", icon: "⏱️" },
  tasks: { title: "משימות קרובות", icon: "✅" },
  goals: { title: "יעדים השבוע", icon: "🎯" },
  meetings: { title: "פגישות קרובות", icon: "📅" }
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
        order: (parsed.dashboard && parsed.dashboard.order && parsed.dashboard.order.length
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

export default function DashboardCustomizer() {
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);

  useEffect(() => {
    setPrefs(loadPrefs());
  }, []);

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
    toast.success('הגדרות ברירת מחדל שוחזרו');
  };

  const handleSave = () => {
    savePrefs(prefs);
    toast.success('הגדרות הדשבורד נשמרו');
  };

  return (
    <Card dir="rtl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <LayoutDashboard className="w-5 h-5" />
              התאמת דשבורד
            </CardTitle>
            <p className="text-sm text-slate-500 mt-1">
              התאם את פריסת הדשבורד והכרטיסים המוצגים
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={restoreDefaults}>
            <RefreshCw className="w-4 h-4 ml-2" />
            שחזור ברירת מחדל
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* פריסת טורים */}
        <div className="space-y-2">
          <Label>פריסת טורים בדשבורד</Label>
          <Select
            value={String(prefs.dashboard.columns)}
            onValueChange={(v) => setValue("dashboard.columns", parseInt(v, 10))}
          >
            <SelectTrigger>
              <SelectValue placeholder="בחר מספר טורים" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">טור אחד (למובייל)</SelectItem>
              <SelectItem value="2">2 טורים</SelectItem>
              <SelectItem value="3">3 טורים (מומלץ)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* ניהול כרטיסים */}
        <div className="space-y-3">
          <Label>ניהול כרטיסים בדשבורד</Label>
          <p className="text-sm text-slate-500">
            גרור לשינוי סדר, והשתמש במתג כדי להציג/להסתיר כרטיס
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
                            className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <span {...drag.dragHandleProps} className="cursor-grab text-slate-400 hover:text-slate-600">
                                <GripVertical className="w-5 h-5" />
                              </span>
                              <span className="text-2xl">
                                {sectionMeta[id]?.icon || "📋"}
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
                                <Eye className="w-4 h-4 text-green-600" />
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

        {/* כפתור שמירה */}
        <div className="flex justify-end pt-4 border-t">
          <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
            שמור שינויים
          </Button>
        </div>

        {/* הסבר */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900">
            💡 <strong>טיפ:</strong> השינויים יופיעו מיד בדשבורד שלך. 
            תוכל לחזור ולשנות בכל עת מעמוד ההגדרות.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}