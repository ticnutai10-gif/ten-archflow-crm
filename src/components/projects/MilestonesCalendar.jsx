import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ChevronRight, ChevronLeft, Flag, Calendar as CalendarIcon, 
  Users, CheckCircle2, Circle, AlertTriangle 
} from "lucide-react";
import { 
  format, startOfMonth, endOfMonth, eachDayOfInterval, 
  isSameDay, isSameMonth, addMonths, subMonths, isPast, isToday 
} from "date-fns";
import { he } from "date-fns/locale";

export default function MilestonesCalendar({ 
  milestones = [], 
  meetings = [], 
  onMilestoneClick,
  onMeetingClick 
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start, end });

    // Add padding for start of week
    const startDay = start.getDay();
    const paddingBefore = Array(startDay).fill(null);
    
    return [...paddingBefore, ...days];
  }, [currentMonth]);

  const getItemsForDay = (day) => {
    if (!day) return { milestones: [], meetings: [] };
    
    const dayMilestones = milestones.filter(m => 
      m.due_date && isSameDay(new Date(m.due_date), day)
    );
    
    const dayMeetings = meetings.filter(m => 
      m.meeting_date && isSameDay(new Date(m.meeting_date), day)
    );
    
    return { milestones: dayMilestones, meetings: dayMeetings };
  };

  const getMilestoneStatus = (milestone) => {
    if (milestone.completed) return { color: 'bg-green-500', text: 'הושלם' };
    if (milestone.due_date && isPast(new Date(milestone.due_date)) && !isToday(new Date(milestone.due_date))) {
      return { color: 'bg-red-500', text: 'באיחור' };
    }
    return { color: 'bg-blue-500', text: 'פתוח' };
  };

  const weekDays = ['א\'', 'ב\'', 'ג\'', 'ד\'', 'ה\'', 'ו\'', 'ש\''];

  // Summary stats
  const stats = useMemo(() => {
    const upcoming = milestones.filter(m => !m.completed && m.due_date && new Date(m.due_date) >= new Date());
    const overdue = milestones.filter(m => !m.completed && m.due_date && isPast(new Date(m.due_date)) && !isToday(new Date(m.due_date)));
    const completed = milestones.filter(m => m.completed);
    return { upcoming: upcoming.length, overdue: overdue.length, completed: completed.length };
  }, [milestones]);

  return (
    <Card className="shadow-lg border-0">
      <CardHeader className="border-b bg-gradient-to-l from-blue-50 to-white">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-blue-600" />
            לוח שנה - אבני דרך ופגישות
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronRight className="w-4 h-4" />
            </Button>
            <span className="font-semibold min-w-[120px] text-center">
              {format(currentMonth, 'MMMM yyyy', { locale: he })}
            </span>
            <Button variant="outline" size="sm" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date())}>
              היום
            </Button>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="flex gap-4 mt-4">
          <Badge className="bg-blue-100 text-blue-700 gap-1">
            <Flag className="w-3 h-3" />
            {stats.upcoming} בהמתנה
          </Badge>
          {stats.overdue > 0 && (
            <Badge className="bg-red-100 text-red-700 gap-1">
              <AlertTriangle className="w-3 h-3" />
              {stats.overdue} באיחור
            </Badge>
          )}
          <Badge className="bg-green-100 text-green-700 gap-1">
            <CheckCircle2 className="w-3 h-3" />
            {stats.completed} הושלמו
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-4">
        {/* Week Days Header */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map((day, i) => (
            <div key={i} className="text-center text-sm font-medium text-slate-500 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, index) => {
            if (!day) {
              return <div key={`empty-${index}`} className="h-24 bg-slate-50 rounded-lg" />;
            }

            const { milestones: dayMilestones, meetings: dayMeetings } = getItemsForDay(day);
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const today = isToday(day);

            return (
              <div
                key={day.toISOString()}
                className={`h-24 p-1 rounded-lg border transition-colors overflow-hidden ${
                  today ? 'border-blue-500 bg-blue-50' :
                  isCurrentMonth ? 'border-slate-200 hover:border-slate-300' : 
                  'border-slate-100 bg-slate-50'
                }`}
              >
                <div className={`text-xs font-medium mb-1 ${today ? 'text-blue-600' : 'text-slate-600'}`}>
                  {format(day, 'd')}
                </div>
                
                <div className="space-y-0.5 overflow-y-auto max-h-[64px]">
                  {dayMilestones.map((m, i) => {
                    const status = getMilestoneStatus(m);
                    return (
                      <div
                        key={`m-${i}`}
                        onClick={() => onMilestoneClick?.(m)}
                        className={`text-[10px] px-1 py-0.5 rounded cursor-pointer truncate flex items-center gap-1 ${
                          m.completed ? 'bg-green-100 text-green-700' : 
                          status.color === 'bg-red-500' ? 'bg-red-100 text-red-700' :
                          'bg-purple-100 text-purple-700'
                        }`}
                        title={m.name}
                      >
                        <Flag className="w-2.5 h-2.5 flex-shrink-0" />
                        <span className="truncate">{m.name}</span>
                      </div>
                    );
                  })}
                  
                  {dayMeetings.map((meeting, i) => (
                    <div
                      key={`mtg-${i}`}
                      onClick={() => onMeetingClick?.(meeting)}
                      className="text-[10px] px-1 py-0.5 rounded cursor-pointer truncate bg-amber-100 text-amber-700 flex items-center gap-1"
                      title={meeting.title}
                    >
                      <Users className="w-2.5 h-2.5 flex-shrink-0" />
                      <span className="truncate">{meeting.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex gap-4 mt-4 pt-4 border-t justify-center text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-purple-100 border border-purple-200" />
            <span>אבן דרך פתוחה</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-green-100 border border-green-200" />
            <span>אבן דרך שהושלמה</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-red-100 border border-red-200" />
            <span>באיחור</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-amber-100 border border-amber-200" />
            <span>פגישה</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}