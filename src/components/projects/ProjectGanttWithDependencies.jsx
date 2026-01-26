import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar, Link2, Unlink, AlertTriangle, Info } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { format, addDays, differenceInDays, startOfWeek, eachDayOfInterval } from 'date-fns';
import { he } from 'date-fns/locale';
import { toast } from 'sonner';

const STATUS_COLORS = {
  'לא התחיל': '#94a3b8',
  'בתהליך': '#3b82f6',
  'הושלם': '#22c55e',
  'ממתין': '#f59e0b',
  'חסום': '#ef4444'
};

export default function ProjectGanttWithDependencies({ projectId, onUpdate }) {
  const [subtasks, setSubtasks] = useState([]);
  const [viewMode, setViewMode] = useState('weeks');
  const [startDate, setStartDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [showDependencyDialog, setShowDependencyDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showDependencyLines, setShowDependencyLines] = useState(true);
  const svgRef = useRef(null);

  useEffect(() => {
    loadSubtasks();
  }, [projectId]);

  const loadSubtasks = async () => {
    setLoading(true);
    try {
      const tasks = await base44.entities.SubTask.filter({ project_id: projectId });
      setSubtasks(tasks || []);
      
      if (tasks && tasks.length > 0) {
        const dates = tasks.filter(t => t.start_date).map(t => new Date(t.start_date));
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

  const dateRange = useMemo(() => {
    const days = viewMode === 'days' ? 14 : viewMode === 'weeks' ? 56 : 90;
    const endDate = addDays(startDate, days);
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [startDate, viewMode]);

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
      left: (startOffset / totalDays) * 100,
      width: (duration / totalDays) * 100
    };
  };

  const handleAddDependency = async (taskId, dependsOnId) => {
    const task = subtasks.find(t => t.id === taskId);
    if (!task) return;

    const currentDeps = task.dependencies || [];
    if (currentDeps.includes(dependsOnId)) {
      toast.error('תלות זו כבר קיימת');
      return;
    }

    // Prevent circular dependencies
    const dependsOnTask = subtasks.find(t => t.id === dependsOnId);
    if (dependsOnTask?.dependencies?.includes(taskId)) {
      toast.error('לא ניתן ליצור תלות מעגלית');
      return;
    }

    try {
      await base44.entities.SubTask.update(taskId, {
        dependencies: [...currentDeps, dependsOnId]
      });
      toast.success('התלות נוספה');
      loadSubtasks();
    } catch (error) {
      toast.error('שגיאה בהוספת תלות');
    }
  };

  const handleRemoveDependency = async (taskId, dependsOnId) => {
    const task = subtasks.find(t => t.id === taskId);
    if (!task) return;

    try {
      await base44.entities.SubTask.update(taskId, {
        dependencies: (task.dependencies || []).filter(d => d !== dependsOnId)
      });
      toast.success('התלות הוסרה');
      loadSubtasks();
    } catch (error) {
      toast.error('שגיאה בהסרת תלות');
    }
  };

  // Check for blocked tasks (dependencies not completed)
  const getBlockedStatus = (task) => {
    if (!task.dependencies || task.dependencies.length === 0) return null;
    
    const blockedBy = task.dependencies
      .map(depId => subtasks.find(t => t.id === depId))
      .filter(t => t && t.status !== 'הושלם');
    
    if (blockedBy.length > 0) {
      return { blocked: true, blockedBy };
    }
    return null;
  };

  // Draw dependency lines
  const renderDependencyLines = () => {
    if (!showDependencyLines) return null;

    const lines = [];
    subtasks.forEach((task, taskIndex) => {
      if (!task.dependencies) return;
      
      task.dependencies.forEach(depId => {
        const depTask = subtasks.find(t => t.id === depId);
        if (!depTask) return;
        
        const depIndex = subtasks.findIndex(t => t.id === depId);
        const taskPos = getTaskPosition(task);
        const depPos = getTaskPosition(depTask);
        
        if (!taskPos || !depPos) return;

        const y1 = depIndex * 52 + 26;
        const y2 = taskIndex * 52 + 26;
        const x1 = depPos.left + depPos.width;
        const x2 = taskPos.left;

        lines.push(
          <g key={`${task.id}-${depId}`}>
            <path
              d={`M ${x1}% ${y1} 
                  C ${x1 + 2}% ${y1}, 
                    ${x2 - 2}% ${y2}, 
                    ${x2}% ${y2}`}
              fill="none"
              stroke="#94a3b8"
              strokeWidth="2"
              strokeDasharray="4"
              markerEnd="url(#arrowhead)"
            />
          </g>
        );
      });
    });

    return (
      <svg
        ref={svgRef}
        className="absolute inset-0 pointer-events-none"
        style={{ width: '100%', height: subtasks.length * 52 }}
      >
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
          </marker>
        </defs>
        {lines}
      </svg>
    );
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
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card dir="rtl">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="flex items-center gap-2">
              תצוגת Gantt עם תלויות
            </CardTitle>
            <div className="flex gap-2 flex-wrap">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox 
                  checked={showDependencyLines} 
                  onCheckedChange={setShowDependencyLines}
                />
                הצג קווי תלות
              </label>
              <Button variant="outline" size="sm" onClick={() => setViewMode('days')} className={viewMode === 'days' ? 'bg-blue-50' : ''}>
                ימים
              </Button>
              <Button variant="outline" size="sm" onClick={() => setViewMode('weeks')} className={viewMode === 'weeks' ? 'bg-blue-50' : ''}>
                שבועות
              </Button>
              <div className="border-r mx-2"></div>
              <Button variant="outline" size="sm" onClick={() => setStartDate(addDays(startDate, -7))}>←</Button>
              <Button variant="outline" size="sm" onClick={() => setStartDate(new Date())}>היום</Button>
              <Button variant="outline" size="sm" onClick={() => setStartDate(addDays(startDate, 7))}>→</Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <div className="min-w-[900px]">
              {/* Header */}
              <div className="flex border-b bg-slate-50 sticky top-0 z-10">
                <div className="w-72 p-3 border-l font-semibold text-sm">משימה</div>
                <div className="flex-1 flex">
                  {viewMode === 'weeks' ? (
                    weeks.map((week, weekIndex) => (
                      <div key={weekIndex} className="flex-1 border-l">
                        <div className="p-2 text-center text-xs font-medium">
                          {format(week[0], 'dd/MM', { locale: he })} - {format(week[week.length - 1], 'dd/MM', { locale: he })}
                        </div>
                      </div>
                    ))
                  ) : (
                    dateRange.map((date, index) => (
                      <div key={index} className={`flex-1 border-l text-center p-2 text-xs ${date.getDay() === 6 ? 'bg-blue-50' : ''}`}>
                        <div className="font-medium">{format(date, 'd')}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Tasks */}
              <div className="divide-y relative">
                {renderDependencyLines()}
                
                {subtasks.map((task) => {
                  const position = getTaskPosition(task);
                  const blockedStatus = getBlockedStatus(task);
                  
                  return (
                    <div key={task.id} className="flex hover:bg-slate-50 transition-colors h-[52px]">
                      <div className="w-72 p-2 border-l flex items-center gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{task.title}</div>
                          <div className="flex items-center gap-1">
                            <span
                              className="text-xs px-2 py-0.5 rounded"
                              style={{
                                backgroundColor: STATUS_COLORS[task.status] + '20',
                                color: STATUS_COLORS[task.status]
                              }}
                            >
                              {task.status}
                            </span>
                            {blockedStatus && (
                              <Badge variant="outline" className="text-red-600 border-red-200 text-[10px] gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                חסום
                              </Badge>
                            )}
                            {task.dependencies?.length > 0 && (
                              <Badge variant="outline" className="text-slate-500 text-[10px] gap-1">
                                <Link2 className="w-3 h-3" />
                                {task.dependencies.length}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedTask(task);
                            setShowDependencyDialog(true);
                          }}
                          className="text-slate-500 hover:text-blue-600"
                        >
                          <Link2 className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      <div className="flex-1 relative p-2">
                        {position && (
                          <div
                            className={`absolute h-8 rounded-lg flex items-center px-2 text-white text-xs font-medium ${
                              blockedStatus ? 'opacity-60' : ''
                            }`}
                            style={{
                              left: `${position.left}%`,
                              width: `${position.width}%`,
                              backgroundColor: blockedStatus ? '#ef4444' : STATUS_COLORS[task.status],
                              top: '8px'
                            }}
                          >
                            <div className="truncate flex-1">{task.title}</div>
                            <div className="text-xs opacity-80">{task.progress || 0}%</div>
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

      {/* Dependencies Dialog */}
      <Dialog open={showDependencyDialog} onOpenChange={setShowDependencyDialog}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="w-5 h-5" />
              ניהול תלויות - {selectedTask?.title}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Current Dependencies */}
            <div>
              <h4 className="text-sm font-medium mb-2">תלויות קיימות:</h4>
              {selectedTask?.dependencies?.length > 0 ? (
                <div className="space-y-2">
                  {selectedTask.dependencies.map(depId => {
                    const depTask = subtasks.find(t => t.id === depId);
                    return (
                      <div key={depId} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                        <span className="text-sm">{depTask?.title || 'משימה לא נמצאה'}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveDependency(selectedTask.id, depId)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Unlink className="w-4 h-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-slate-500">אין תלויות מוגדרות</p>
              )}
            </div>

            {/* Add Dependency */}
            <div>
              <h4 className="text-sm font-medium mb-2">הוסף תלות חדשה:</h4>
              <Select
                onValueChange={(value) => {
                  if (value && selectedTask) {
                    handleAddDependency(selectedTask.id, value);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="בחר משימה שחייבת להסתיים קודם" />
                </SelectTrigger>
                <SelectContent>
                  {subtasks
                    .filter(t => t.id !== selectedTask?.id && !selectedTask?.dependencies?.includes(t.id))
                    .map(task => (
                      <SelectItem key={task.id} value={task.id}>
                        {task.title}
                      </SelectItem>
                    ))
                  }
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg text-sm">
              <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <span className="text-blue-700">
                תלות פירושה שהמשימה הנוכחית לא יכולה להתחיל עד שהמשימה התלויה מסתיימת.
              </span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}