import React, { useMemo, useState, useRef, useCallback } from "react";
import { differenceInCalendarDays, addDays, format, parseISO } from "date-fns";
import { he } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const clamp = (val, min, max) => Math.max(min, Math.min(val, max));
const toDate = (d) => (typeof d === "string" ? parseISO(d) : d);

export default function GanttChart({ tasks = [], onDatesChange, projectFilter }) {
  const [zoom, setZoom] = useState(24); // px per day
  const [dragState, setDragState] = useState(null); // {id, mode: 'move'|'resize-start'|'resize-end', startX, origStart, origEnd}
  const containerRef = useRef(null);

  // Normalize tasks timeline
  const rows = useMemo(() => {
    const visible = tasks.filter(t => {
      if (projectFilter && projectFilter !== "all") return t.project_name === projectFilter;
      return true;
    });
    return visible.map(t => {
      const start = t.start_date ? toDate(t.start_date) : (t.due_date ? addDays(toDate(t.due_date), -3) : new Date());
      const end = t.end_date ? toDate(t.end_date) : (t.due_date ? toDate(t.due_date) : addDays(start, 3));
      return { ...t, _start: start, _end: end };
    });
  }, [tasks, projectFilter]);

  const [minDate, maxDate] = useMemo(() => {
    if (rows.length === 0) {
      const today = new Date();
      return [addDays(today, -7), addDays(today, 21)];
    }
    let minD = rows[0]._start;
    let maxD = rows[0]._end;
    rows.forEach(r => {
      if (r._start < minD) minD = r._start;
      if (r._end > maxD) maxD = r._end;
    });
    // add margins
    return [addDays(minD, -2), addDays(maxD, 2)];
  }, [rows]);

  const totalDays = Math.max(1, differenceInCalendarDays(maxDate, minDate) + 1);
  const widthPx = totalDays * zoom;
  const rowHeight = 36;

  const dayToX = useCallback((date) => differenceInCalendarDays(date, minDate) * zoom, [minDate, zoom]);
  const xToDay = useCallback((x) => addDays(minDate, Math.round(x / zoom)), [minDate, zoom]);

  const handleMouseDown = (e, row, mode) => {
    e.preventDefault();
    e.stopPropagation();
    setDragState({
      id: row.id,
      mode,
      startX: e.clientX,
      origStart: row._start,
      origEnd: row._end
    });
  };

  const handleMouseMove = useCallback((e) => {
    if (!dragState) return;
    const deltaX = e.clientX - dragState.startX;
    const deltaDays = Math.round(deltaX / zoom);

    let newStart = dragState.origStart;
    let newEnd = dragState.origEnd;

    if (dragState.mode === "move") {
      newStart = addDays(dragState.origStart, deltaDays);
      newEnd = addDays(dragState.origEnd, deltaDays);
    } else if (dragState.mode === "resize-start") {
      newStart = addDays(dragState.origStart, deltaDays);
      if (newStart > newEnd) newStart = newEnd;
    } else if (dragState.mode === "resize-end") {
      newEnd = addDays(dragState.origEnd, deltaDays);
      if (newEnd < newStart) newEnd = newStart;
    }

    setDragState({ ...dragState, previewStart: newStart, previewEnd: newEnd });
  }, [dragState, zoom]);

  const handleMouseUp = useCallback(async () => {
    if (!dragState) return;
    const finalStart = dragState.previewStart || dragState.origStart;
    const finalEnd = dragState.previewEnd || dragState.origEnd;
    setDragState(null);

    if (onDatesChange) {
      await onDatesChange(dragState.id, finalStart, finalEnd);
    }
  }, [dragState, onDatesChange]);

  React.useEffect(() => {
    if (!dragState) return;
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragState, handleMouseMove, handleMouseUp]);

  const activePreview = (id) => dragState && dragState.id === id ? {
    start: dragState.previewStart || dragState.origStart,
    end: dragState.previewEnd || dragState.origEnd
  } : null;

  return (
    <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
      <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <CardTitle className="text-right">תרשים גאנט</CardTitle>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600">זום</span>
          <Select value={String(zoom)} onValueChange={(v) => setZoom(parseInt(v) || 24)}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="16">צפוף</SelectItem>
              <SelectItem value="24">רגיל</SelectItem>
              <SelectItem value="32">גדול</SelectItem>
              <SelectItem value="48">ענק</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent dir="rtl">
        <div className="overflow-auto rounded-lg border border-slate-200">
          {/* Header timeline */}
          <div className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200">
            <div className="relative" style={{ width: widthPx }}>
              <div className="flex">
                {Array.from({ length: totalDays }).map((_, i) => {
                  const d = addDays(minDate, i);
                  return (
                    <div
                      key={i}
                      className="text-[11px] text-slate-600 border-l border-slate-200 py-1 px-2 text-center"
                      style={{ width: zoom }}
                      title={format(d, "PPP", { locale: he })}
                    >
                      {format(d, "dd/MM", { locale: he })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Rows */}
          <div ref={containerRef} className="relative" style={{ width: widthPx, minHeight: rows.length * rowHeight }}>
            {rows.map((row, idx) => {
              const preview = activePreview(row.id);
              const start = preview ? preview.start : row._start;
              const end = preview ? preview.end : row._end;
              const x = dayToX(start);
              const w = clamp((differenceInCalendarDays(end, start) + 1) * zoom, zoom, widthPx);
              const y = idx * rowHeight + 8;

              return (
                <div key={row.id}>
                  {/* Background row line */}
                  <div
                    className="absolute left-0 right-0 border-b border-slate-100"
                    style={{ top: y + rowHeight - 8 }}
                  />
                  {/* Task bar */}
                  <div
                    className="absolute h-6 rounded-md shadow-md group"
                    style={{
                      top: y,
                      left: x,
                      width: w,
                      background: "linear-gradient(135deg, var(--accent-from), var(--accent-to))"
                    }}
                  >
                    {/* Label */}
                    <div className="absolute -top-6 right-0 bg-slate-900/85 text-white text-xs px-2 py-0.5 rounded-md shadow hidden group-hover:block whitespace-nowrap">
                      {row.title} • {format(start, "dd/MM", { locale: he })} - {format(end, "dd/MM", { locale: he })}
                    </div>

                    {/* Resize handles (appear on hover) */}
                    <div
                      className="absolute top-0 right-0 h-full w-2 cursor-ew-resize opacity-0 group-hover:opacity-100"
                      onMouseDown={(e) => handleMouseDown(e, row, "resize-start")}
                    />
                    <div
                      className="absolute top-0 left-0 h-full w-2 cursor-ew-resize opacity-0 group-hover:opacity-100"
                      onMouseDown={(e) => handleMouseDown(e, row, "resize-end")}
                    />

                    {/* Move handle overlay */}
                    <div
                      className="absolute inset-0 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100"
                      onMouseDown={(e) => handleMouseDown(e, row, "move")}
                      title="גרור להזזה"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}