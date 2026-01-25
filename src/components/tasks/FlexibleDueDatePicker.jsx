import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar, Clock, Zap } from "lucide-react";
import { addDays, addWeeks, nextSaturday, endOfWeek, startOfWeek, format } from "date-fns";
import { he } from "date-fns/locale";

const QUICK_OPTIONS = [
  { label: "היום", getValue: () => new Date(), description: "היום" },
  { label: "מחר", getValue: () => addDays(new Date(), 1), description: "מחר" },
  { label: "תוך 3 ימים", getValue: () => addDays(new Date(), 3), description: "תוך 3 ימים" },
  { label: "סוף השבוע", getValue: () => nextSaturday(new Date()), description: "סוף השבוע (שבת)" },
  { label: "שבוע הבא", getValue: () => addWeeks(new Date(), 1), description: "עוד שבוע" },
  { label: "תחילת שבוע הבא", getValue: () => startOfWeek(addWeeks(new Date(), 1), { weekStartsOn: 0 }), description: "ראשון הבא" },
  { label: "סוף שבוע הבא", getValue: () => endOfWeek(addWeeks(new Date(), 1), { weekStartsOn: 0 }), description: "שבת הבאה" },
  { label: "עוד שבועיים", getValue: () => addWeeks(new Date(), 2), description: "עוד שבועיים" },
  { label: "סוף החודש", getValue: () => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0);
  }, description: "סוף החודש" },
];

export default function FlexibleDueDatePicker({ 
  value, 
  onChange, 
  dueDateType,
  flexibleDescription,
  onDueDateTypeChange,
  onFlexibleDescriptionChange
}) {
  const [open, setOpen] = useState(false);

  const handleQuickSelect = (option) => {
    const date = option.getValue();
    onChange(format(date, 'yyyy-MM-dd'));
    onFlexibleDescriptionChange?.(option.description);
    onDueDateTypeChange?.('flexible');
    setOpen(false);
  };

  const handleFixedDateChange = (e) => {
    onChange(e.target.value);
    onDueDateTypeChange?.('fixed');
    onFlexibleDescriptionChange?.('');
  };

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <Calendar className="w-4 h-4" />
        תאריך יעד
      </Label>
      
      <div className="flex gap-2">
        <Input 
          type="date" 
          value={value || ''} 
          onChange={handleFixedDateChange}
          className="flex-1"
        />
        
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="icon" title="בחירה מהירה">
              <Zap className="w-4 h-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2" align="end" dir="rtl">
            <div className="text-sm font-medium text-slate-600 mb-2 px-2">בחירה מהירה</div>
            <div className="space-y-1">
              {QUICK_OPTIONS.map((option, idx) => {
                const date = option.getValue();
                return (
                  <button
                    key={idx}
                    onClick={() => handleQuickSelect(option)}
                    className="w-full text-right px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors flex items-center justify-between"
                  >
                    <span className="font-medium">{option.label}</span>
                    <span className="text-xs text-slate-500">
                      {format(date, 'dd/MM', { locale: he })}
                    </span>
                  </button>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {dueDateType === 'flexible' && flexibleDescription && (
        <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {flexibleDescription}
        </div>
      )}
    </div>
  );
}