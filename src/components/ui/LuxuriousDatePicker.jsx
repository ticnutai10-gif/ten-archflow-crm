import React, { useState, useEffect } from "react";
import { format, getDaysInMonth, startOfMonth, getDay } from "date-fns";
import { he } from "date-fns/locale";
import { ChevronRight, ChevronLeft, Calendar as CalendarIcon, ChevronDown, ChevronUp } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/utils/cn";
import { ScrollArea } from "@/components/ui/scroll-area";

const MONTHS = [
  "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"
];

const YEARS_RANGE_START = 1900;
const YEARS_RANGE_END = 2100;
const YEARS = Array.from({ length: YEARS_RANGE_END - YEARS_RANGE_START + 1 }, (_, i) => YEARS_RANGE_START + i).reverse();

export default function LuxuriousDatePicker({ value, onChange, placeholder, label, className }) {
  const [date, setDateState] = useState(value ? new Date(value) : new Date());
  const [view, setView] = useState("months"); // 'years', 'months', 'days'
  const [displayYear, setDisplayYear] = useState(date.getFullYear());
  const [displayMonth, setDisplayMonth] = useState(date.getMonth());
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (value) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        setDateState(d);
        setDisplayYear(d.getFullYear());
        setDisplayMonth(d.getMonth());
      }
    }
  }, [value]);

  const handleYearChange = (increment) => {
    setDisplayYear((prev) => prev + increment);
  };

  const handleMonthSelect = (monthIndex) => {
    setDisplayMonth(monthIndex);
    setView("days");
  };

  const handleDaySelect = (day) => {
    const newDate = new Date(displayYear, displayMonth, day, 12, 0, 0); // Noon to avoid timezone shifts
    const year = newDate.getFullYear();
    const month = String(newDate.getMonth() + 1).padStart(2, "0");
    const d = String(newDate.getDate()).padStart(2, "0");
    onChange(`${year}-${month}-${d}`);
    setIsOpen(false);
  };

  const renderYears = () => (
    <ScrollArea className="h-64 w-full pr-4">
      <div className="grid grid-cols-4 gap-2">
        {YEARS.map((year) => (
          <button
            key={year}
            onClick={() => {
              setDisplayYear(year);
              setView("months");
            }}
            className={cn(
              "p-2 rounded-lg text-sm font-medium transition-all",
              displayYear === year
                ? "bg-[#D4AF37] text-white shadow-md"
                : "hover:bg-amber-50 text-slate-700"
            )}
          >
            {year}
          </button>
        ))}
      </div>
    </ScrollArea>
  );

  const renderMonths = () => (
    <div className="grid grid-cols-3 gap-3">
      {MONTHS.map((month, index) => (
        <button
          key={month}
          onClick={() => handleMonthSelect(index)}
          className={cn(
            "p-3 rounded-xl text-sm font-semibold transition-all border",
            displayMonth === index && view !== 'months' // Highlight current month if checking days
              ? "border-[#D4AF37] bg-amber-50 text-[#D4AF37]"
              : "border-slate-100 hover:border-[#D4AF37]/50 hover:bg-amber-50/50 text-slate-700"
          )}
        >
          <div className="text-xs text-slate-400 mb-1">{(index + 1).toString().padStart(2, '0')}</div>
          {month}
        </button>
      ))}
    </div>
  );

  const renderDays = () => {
    const daysInMonth = getDaysInMonth(new Date(displayYear, displayMonth));
    const firstDayOfMonth = getDay(startOfMonth(new Date(displayYear, displayMonth)));
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const padding = Array.from({ length: firstDayOfMonth }, (_, i) => i);

    const weekDays = ["א", "ב", "ג", "ד", "ה", "ו", "ש"];

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between mb-2 px-1">
            <button onClick={() => setView('months')} className="text-sm font-bold text-[#D4AF37] hover:underline">
                {MONTHS[displayMonth]} {displayYear}
            </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center mb-2">
          {weekDays.map((d) => (
            <div key={d} className="text-xs font-bold text-[#D4AF37]">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {padding.map((i) => (
            <div key={`pad-${i}`} />
          ))}
          {days.map((day) => {
            const isSelected =
              value &&
              new Date(value).getDate() === day &&
              new Date(value).getMonth() === displayMonth &&
              new Date(value).getFullYear() === displayYear;

            return (
              <button
                key={day}
                onClick={() => handleDaySelect(day)}
                className={cn(
                  "h-8 w-8 rounded-full text-sm flex items-center justify-center transition-all",
                  isSelected
                    ? "bg-[#D4AF37] text-white shadow-md transform scale-110"
                    : "hover:bg-amber-50 text-slate-700 font-medium"
                )}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <Popover open={isOpen} onOpenChange={(open) => {
        setIsOpen(open);
        if(open) setView('months'); 
    }}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "relative flex items-center justify-start text-right font-normal transition-all duration-200",
            "border-2 border-[#D4AF37]/30 hover:border-[#D4AF37] rounded-xl bg-white",
            "px-4 py-3 min-w-[160px] shadow-sm hover:shadow-md",
            "group",
            className
          )}
        >
          <CalendarIcon className="ml-3 h-5 w-5 text-[#D4AF37] group-hover:scale-110 transition-transform" />
          <div className="flex flex-col items-start">
             {label && <span className="text-[10px] text-slate-500 font-medium mb-0.5">{label}</span>}
             <span className={cn("text-sm font-semibold", !value && "text-slate-400")}>
                {value ? format(new Date(value), "dd/MM/yyyy") : placeholder || "בחר תאריך"}
             </span>
          </div>
        </button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[320px] p-0 border-2 border-[#D4AF37] rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.2)] bg-white overflow-hidden" 
        align="start"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-50 via-white to-amber-50 p-4 border-b border-[#D4AF37]/20">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleYearChange(1)}
              className="h-8 w-8 text-[#D4AF37] hover:bg-amber-100 hover:text-[#D4AF37] rounded-full"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
            
            <button
              onClick={() => setView(view === "years" ? "months" : "years")}
              className="flex items-center gap-2 text-xl font-bold text-slate-800 hover:text-[#D4AF37] transition-colors"
            >
              {displayYear}
              {view === "years" ? (
                <ChevronUp className="h-4 w-4 text-[#D4AF37]" />
              ) : (
                <ChevronDown className="h-4 w-4 text-[#D4AF37]" />
              )}
            </button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleYearChange(-1)}
              className="h-8 w-8 text-[#D4AF37] hover:bg-amber-100 hover:text-[#D4AF37] rounded-full"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 bg-white min-h-[300px]">
          {view === "years" && renderYears()}
          {view === "months" && renderMonths()}
          {view === "days" && renderDays()}
        </div>
        
        {/* Footer decoration */}
        <div className="h-1.5 bg-gradient-to-r from-[#D4AF37] via-amber-300 to-[#D4AF37]" />
      </PopoverContent>
    </Popover>
  );
}