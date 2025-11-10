import React from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, Check, X } from "lucide-react";

function toLocalInputValue(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function ReminderTimePicker({ value, onChange, baseDate }) {
  const [open, setOpen] = React.useState(false);
  const [hour, setHour] = React.useState("09");
  const [minute, setMinute] = React.useState("00");

  React.useEffect(() => {
    if (!open) return;
    let dt = value ? new Date(value) : null;
    if (dt && isNaN(dt)) dt = null;
    if (!dt && baseDate) dt = new Date(baseDate);
    if (!dt) {
      dt = new Date();
      dt.setDate(dt.getDate() + 1);
    }
    setHour(String(dt.getHours()).padStart(2, "0"));
    setMinute(String(dt.getMinutes()).padStart(2, "0"));
  }, [open, value, baseDate]);

  const save = () => {
    let dt = value ? new Date(value) : null;
    if (dt && isNaN(dt)) dt = null;
    if (!dt && baseDate) dt = new Date(baseDate);
    if (!dt) {
      dt = new Date();
      dt.setDate(dt.getDate() + 1);
    }
    dt.setHours(parseInt(hour, 10), parseInt(minute, 10), 0, 0);
    onChange?.(toLocalInputValue(dt));
    setOpen(false);
  };

  const quickTimes = [
    { h: "08", m: "00", label: "08:00 בבוקר" },
    { h: "09", m: "00", label: "09:00 בבוקר" },
    { h: "12", m: "00", label: "12:00 צהריים" },
    { h: "14", m: "00", label: "14:00 אחה״צ" },
    { h: "16", m: "00", label: "16:00 אחה״צ" },
    { h: "18", m: "00", label: "18:00 ערב" },
    { h: "20", m: "00", label: "20:00 ערב" }
  ];

  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
  const minutes = ["00","05","10","15","20","25","30","35","40","45","50","55"];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" type="button" title="בחר שעה ודקות">
          <Clock className="w-4 h-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="end" dir="rtl">
        <div className="space-y-3">
          <div className="text-sm font-medium text-slate-700">בחירת שעה</div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <div className="text-xs text-slate-500 text-right">שעה</div>
              <Select value={hour} onValueChange={setHour}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent align="end">
                  {hours.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-slate-500 text-right">דקות</div>
              <Select value={minute} onValueChange={setMinute}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent align="end">
                  {minutes.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="text-xs text-slate-500 border-t pt-2">שעות נפוצות</div>
          <div className="grid grid-cols-2 gap-2">
            {quickTimes.map((t) => (
              <Button
                key={`${t.h}-${t.m}`}
                variant="secondary"
                size="sm"
                className="justify-center"
                type="button"
                onClick={() => { setHour(t.h); setMinute(t.m); save(); }}
              >
                {t.label}
              </Button>
            ))}
          </div>

          <div className="flex justify-between pt-1">
            <Button variant="ghost" size="sm" type="button" onClick={() => setOpen(false)}>
              <X className="w-4 h-4 ml-1" /> ביטול
            </Button>
            <Button size="sm" type="button" onClick={save}>
              <Check className="w-4 h-4 ml-1" /> שמור שעה
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}