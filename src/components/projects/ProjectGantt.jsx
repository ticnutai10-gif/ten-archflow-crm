import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, Calendar } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { format, addDays, differenceInDays, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { he } from 'date-fns/locale';

const STATUS_COLORS = {
  'לא התחיל': '#94a3b8',
  'בתהליך': '#3b82f6',
  'הושלם': '#22c55e',
  'ממתין': '#f59e0b',
  'חסום': '#ef4444'
};

export default function ProjectGantt({ projectId }) {
  const [subtasks, setSubtasks] = useState([]);
  const [viewMode, setViewMode] = useState('weeks'); // days, weeks, months
  const [startDate, setStartDate] = useState(new Date());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSubtasks();
  }, [projectId]);

  const loadSubtasks = async () => {
    setLoading(true);
    try {
      const tasks = await base44.entities.SubTask.filter({ project_id: projectId });
      setSubtasks(tasks || []);
      
      // מציאת התאריך המוקדם ביותר
      if (tasks && tasks.length > 0) {
        const dates = tasks
          .filter(t => t.start_date)
          .map(t => new Date(t.start_date));
        if (dates.length > 0) {
          const earliest = new Date(Math.min(...dates));
          setStartDate(startOfWeek(earliest, { locale: he }));
        }
      }
    } catch (error) {
      console.error('Error loading subtasks:', error);
    } finally {
      setLoading(false);
    }
  };

  // חישוב טווח תאריכים להצגה
  const dateRange = useMemo(() => {
    const days = viewMode === 'days' ? 14 : viewMode === 'weeks' ? 56 : 90;
    const endDate = addDays(startDate, days);
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [startDate, viewMode]);

  // קיבוץ לפי שבועות
  const weeks = useMemo(() => {
    const grouped = [];
    let currentWeek = [];
    
    dateRange.forEach((date, index) => {
      currentWeek.push(date);
      if (date.getDay() === 6 || index === dateRange.length - 1) {
        grouped.push(currentWeek);
        currentWeek = [];
      }
    });
    
    return grouped;
  }, [dateRange]);

  const getTaskPosition = (task) => {
    if (!task.start_date || !task.end_date) return null;
    
    const taskStart = new Date(task.start_date);
    const taskEnd = new Date(task.end_date);
    const rangeStart = dateRange[0];
    const rangeEnd = dateRange[dateRange.length - 1];
    
    if (taskEnd < rangeStart || taskStart > rangeEnd) return null;
    
    const startOffset = Math.max(0, differenceInDays(taskStart, rangeStart));
    const duration = differenceInDays(taskEnd, taskStart) + 1;
    const totalDays = dateRange.length;
    
    return {
      left: `${(startOffset / totalDays) * 100}%`,
      width: `${(duration / totalDays) * 100}%`
    };
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-slate-200 rounded w-1/3"></div>
            <div className="h-32 bg-slate-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (subtasks.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600">אין תת-משימות להצגה</p>
          <p className="text-sm text-slate-500 mt-1">הוסף משימות כדי לראות אותן בתצוגת Gantt</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card dir="rtl">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <CardTitle>תצוגת Gantt</CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode('days')}
              className={viewMode === 'days' ? 'bg-blue-50' : ''}
            >
              ימים
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode('weeks')}
              className={viewMode === 'weeks' ? 'bg-blue-50' : ''}
            >
              שבועות
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode('months')}
              className={viewMode === 'months' ? 'bg-blue-50' : ''}
            >
              חודשים
            </Button>
            <div className="border-r mx-2"></div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStartDate(addDays(startDate, -7))}
            >
              ←
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStartDate(new Date())}
            >
              היום
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStartDate(addDays(startDate, 7))}
            >
              →
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            {/* Header - Timeline */}
            <div className="flex border-b bg-slate-50 sticky top-0 z-10">
              <div className="w-64 p-3 border-l font-semibold text-sm">משימה</div>
              <div className="flex-1 flex">
                {viewMode === 'weeks' ? (
                  weeks.map((week, weekIndex) => (
                    <div
                      key={weekIndex}
                      className="flex-1 border-l"
                    >
                      <div className="p-2 text-center text-xs font-medium">
                        {format(week[0], 'dd/MM', { locale: he })} - {format(week[week.length - 1], 'dd/MM', { locale: he })}
                      </div>
                      <div className="flex">
                        {week.map((day, dayIndex) => (
                          <div
                            key={dayIndex}
                            className={`flex-1 border-l text-center text-xs py-1 ${
                              day.getDay() === 6 ? 'bg-blue-50' : ''
                            }`}
                          >
                            {format(day, 'EEEEE', { locale: he })}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  dateRange.map((date, index) => (
                    <div
                      key={index}
                      className={`flex-1 border-l text-center p-2 text-xs ${
                        date.getDay() === 6 ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="font-medium">{format(date, 'd', { locale: he })}</div>
                      <div className="text-slate-500">{format(date, 'MMM', { locale: he })}</div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Tasks */}
            <div className="divide-y">
              {subtasks.map((task) => {
                const position = getTaskPosition(task);
                
                return (
                  <div key={task.id} className="flex hover:bg-slate-50 transition-colors">
                    <div className="w-64 p-3 border-l">
                      <div className="font-medium text-sm mb-1">{task.title}</div>
                      <div className="flex items-center gap-2">
                        <span
                          className="text-xs px-2 py-0.5 rounded"
                          style={{
                            backgroundColor: STATUS_COLORS[task.status] + '20',
                            color: STATUS_COLORS[task.status]
                          }}
                        >
                          {task.status}
                        </span>
                        {task.assigned_to?.length > 0 && (
                          <span className="text-xs text-slate-500">
                            {task.assigned_to.length} משתמשים
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex-1 relative p-2">
                      {position && (
                        <div
                          className="absolute h-8 rounded-lg flex items-center px-2 text-white text-xs font-medium cursor-pointer hover:opacity-90 transition-opacity"
                          style={{
                            left: position.left,
                            width: position.width,
                            backgroundColor: STATUS_COLORS[task.status],
                            top: '8px'
                          }}
                          title={`${task.title}\n${task.start_date} - ${task.end_date}\nהתקדמות: ${task.progress}%`}
                        >
                          <div className="truncate flex-1">{task.title}</div>
                          <div className="text-xs opacity-80">{task.progress}%</div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}