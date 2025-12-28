import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameDay, isSameMonth } from "date-fns";
import { he } from "date-fns/locale";
import { ChevronRight, ChevronLeft } from "lucide-react";

// Hebrew month names mapping
const HEBREW_MONTHS = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
];

export default function VisualDatePicker({ selectedDate, onSelect, className = "" }) {
  const [viewDate, setViewDate] = useState(selectedDate || new Date());
  const [viewMode, setViewMode] = useState('days'); // 'days' or 'months'

  useEffect(() => {
    if (selectedDate) {
      setViewDate(selectedDate);
    }
  }, [selectedDate]);

  const handlePrev = () => {
    if (viewMode === 'days') {
      setViewDate(subMonths(viewDate, 1));
    } else {
      // In month view, prev means previous year
      setViewDate(addMonths(viewDate, -12));
    }
  };

  const handleNext = () => {
    if (viewMode === 'days') {
      setViewDate(addMonths(viewDate, 1));
    } else {
      // In month view, next means next year
      setViewDate(addMonths(viewDate, 12));
    }
  };

  const renderHeader = () => (
    <div className="flex items-center justify-between mb-4 px-2">
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={handleNext}
        className="h-10 w-10 rounded-xl hover:bg-slate-100"
      >
        <ChevronLeft className="h-6 w-6 text-slate-600" />
      </Button>
      
      <button 
        onClick={() => setViewMode(viewMode === 'days' ? 'months' : 'days')}
        className="text-lg font-bold text-slate-800 hover:text-blue-600 transition-colors px-4 py-2 rounded-xl hover:bg-slate-50"
      >
        {viewMode === 'days' 
          ? `${HEBREW_MONTHS[viewDate.getMonth()]} ${viewDate.getFullYear()}`
          : viewDate.getFullYear()
        }
      </button>

      <Button 
        variant="ghost" 
        size="icon" 
        onClick={handlePrev}
        className="h-10 w-10 rounded-xl hover:bg-slate-100"
      >
        <ChevronRight className="h-6 w-6 text-slate-600" />
      </Button>
    </div>
  );

  const renderMonthsGrid = () => {
    return (
      <div className="grid grid-cols-3 gap-3 p-2">
        {HEBREW_MONTHS.map((monthName, index) => {
          const isSelected = selectedDate && selectedDate.getMonth() === index && selectedDate.getFullYear() === viewDate.getFullYear();
          const isCurrent = new Date().getMonth() === index && new Date().getFullYear() === viewDate.getFullYear();
          
          return (
            <button
              key={monthName}
              onClick={() => {
                const newDate = new Date(viewDate);
                newDate.setMonth(index);
                setViewDate(newDate);
                setViewMode('days');
              }}
              className={`
                h-14 rounded-xl text-base font-medium transition-all shadow-sm border
                ${isSelected 
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md transform scale-105' 
                  : isCurrent
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-white text-slate-700 border-slate-100 hover:bg-slate-50 hover:border-slate-300'
                }
              `}
            >
              {monthName}
            </button>
          );
        })}
      </div>
    );
  };

  const renderDaysGrid = () => {
    const monthStart = startOfMonth(viewDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 }); // Sunday start
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

    const dateFormat = "d";
    const rows = [];
    let days = [];
    let day = startDate;
    let formattedDate = "";

    // Weekday headers
    const weekDays = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];
    
    return (
      <div className="p-2">
        {/* Week headers */}
        <div className="grid grid-cols-7 mb-2">
          {weekDays.map((d, i) => (
            <div key={i} className="text-center text-sm font-semibold text-slate-400">
              {d}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-2">
          {(() => {
            const dayElements = [];
            let currentDay = startDate;
            
            while (currentDay <= endDate) {
              const cloneDay = currentDay; // Closure capture
              const isSelected = selectedDate && isSameDay(currentDay, selectedDate);
              const isCurrentMonth = isSameMonth(currentDay, monthStart);
              const isToday = isSameDay(currentDay, new Date());

              dayElements.push(
                <button
                  key={currentDay.toString()}
                  onClick={() => onSelect(cloneDay)}
                  disabled={!isCurrentMonth}
                  className={`
                    aspect-square rounded-xl flex items-center justify-center text-lg font-medium transition-all shadow-sm border
                    ${!isCurrentMonth ? 'opacity-0 pointer-events-none' : ''}
                    ${isSelected 
                      ? 'bg-amber-400 text-white border-amber-400 shadow-md transform scale-105 z-10 font-bold text-xl' 
                      : isToday
                        ? 'bg-blue-50 text-blue-600 border-blue-200'
                        : 'bg-white text-slate-700 border-slate-100 hover:bg-slate-50 hover:border-slate-300 hover:shadow-md hover:-translate-y-0.5'
                    }
                  `}
                >
                  {format(currentDay, dateFormat)}
                  {isSelected && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></span>
                  )}
                </button>
              );
              currentDay = addDays(currentDay, 1);
            }
            return dayElements;
          })()}
        </div>
      </div>
    );
  };

  return (
    <div className={`bg-slate-50/50 p-4 rounded-2xl border border-slate-200 ${className}`} dir="rtl">
      {renderHeader()}
      <div className="min-h-[320px]">
        {viewMode === 'days' ? renderDaysGrid() : renderMonthsGrid()}
      </div>
    </div>
  );
}