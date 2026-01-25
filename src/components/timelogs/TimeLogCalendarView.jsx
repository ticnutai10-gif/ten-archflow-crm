import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ChevronLeft, ChevronRight, Calendar, Clock, Plus, Pencil, Trash2, User, Briefcase
} from "lucide-react";
import {
  format, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  addDays, addMonths, subMonths, isSameDay, isWithinInterval
} from "date-fns";
import { he } from "date-fns/locale";
import { base44 } from "@/api/base44Client";

function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours === 0) return `${minutes} דק'`;
  return `${hours}:${minutes.toString().padStart(2, '0')}`;
}

export default function TimeLogCalendarView({ 
  timeLogs = [], 
  clients = [], 
  projects = [],
  tasks = [],
  onUpdate,
  currentUser 
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [showDayDialog, setShowDayDialog] = useState(false);
  const [editingLog, setEditingLog] = useState(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  
  const [newLogData, setNewLogData] = useState({
    client_id: '', client_name: '', project_id: '', project_name: '',
    task_id: '', task_title: '', hours: '', minutes: '', title: '', notes: ''
  });

  // Get days in month grid
  const getDaysInMonth = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const start = startOfWeek(monthStart, { weekStartsOn: 0 });
    const end = endOfWeek(monthEnd, { weekStartsOn: 0 });
    
    const days = [];
    let current = new Date(start);
    while (current <= end) {
      days.push(new Date(current));
      current = addDays(current, 1);
    }
    return days;
  };

  // Get logs for a specific day
  const getLogsForDay = (date) => {
    return timeLogs.filter(log => 
      log && log.log_date && isSameDay(new Date(log.log_date), date)
    );
  };

  // Get total hours for a day
  const getHoursForDay = (date) => {
    const logs = getLogsForDay(date);
    return logs.reduce((sum, log) => sum + (log.duration_seconds || 0), 0) / 3600;
  };

  // Stats for current view
  const monthStats = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    
    const monthLogs = timeLogs.filter(log => {
      if (!log?.log_date) return false;
      const logDate = new Date(log.log_date);
      return isWithinInterval(logDate, { start: monthStart, end: monthEnd });
    });

    const totalSeconds = monthLogs.reduce((sum, log) => sum + (log.duration_seconds || 0), 0);
    const byClient = {};
    const byProject = {};

    monthLogs.forEach(log => {
      const client = log.client_name || 'ללא לקוח';
      const project = log.project_name || 'ללא פרויקט';
      byClient[client] = (byClient[client] || 0) + (log.duration_seconds || 0);
      byProject[project] = (byProject[project] || 0) + (log.duration_seconds || 0);
    });

    return {
      totalHours: totalSeconds / 3600,
      logsCount: monthLogs.length,
      byClient: Object.entries(byClient).sort((a, b) => b[1] - a[1]).slice(0, 5),
      byProject: Object.entries(byProject).sort((a, b) => b[1] - a[1]).slice(0, 5)
    };
  }, [timeLogs, currentMonth]);

  const handleDayClick = (date) => {
    setSelectedDate(date);
    setShowDayDialog(true);
  };

  const handleAddLog = () => {
    setNewLogData({
      client_id: '', client_name: '', project_id: '', project_name: '',
      task_id: '', task_title: '', hours: '', minutes: '', title: '', notes: ''
    });
    setShowAddDialog(true);
  };

  const handleEditLog = (log) => {
    const hours = Math.floor((log.duration_seconds || 0) / 3600);
    const minutes = Math.floor(((log.duration_seconds || 0) % 3600) / 60);
    setEditingLog({
      ...log,
      hours: String(hours),
      minutes: String(minutes)
    });
  };

  const saveNewLog = async () => {
    if (!newLogData.client_id) {
      alert('יש לבחור לקוח');
      return;
    }

    const hours = parseInt(newLogData.hours || '0', 10);
    const minutes = parseInt(newLogData.minutes || '0', 10);
    const totalSeconds = (hours * 3600) + (minutes * 60);

    if (totalSeconds <= 0) {
      alert('יש להזין זמן גדול מ-0');
      return;
    }

    try {
      const client = clients.find(c => c.id === newLogData.client_id);
      const project = projects.find(p => p.id === newLogData.project_id);
      const task = tasks.find(t => t.id === newLogData.task_id);

      await base44.entities.TimeLog.create({
        client_id: newLogData.client_id,
        client_name: client?.name || '',
        project_id: newLogData.project_id || null,
        project_name: project?.name || '',
        task_id: newLogData.task_id || null,
        task_title: task?.title || '',
        log_date: format(selectedDate, 'yyyy-MM-dd'),
        duration_seconds: totalSeconds,
        title: newLogData.title || '',
        notes: newLogData.notes || '',
        user_email: currentUser?.email || '',
        user_name: currentUser?.full_name || ''
      });

      setShowAddDialog(false);
      onUpdate?.();
    } catch (error) {
      console.error('Error saving time log:', error);
      alert('שגיאה בשמירת רישום הזמן');
    }
  };

  const saveEditLog = async () => {
    if (!editingLog) return;

    const hours = parseInt(editingLog.hours || '0', 10);
    const minutes = parseInt(editingLog.minutes || '0', 10);
    const totalSeconds = (hours * 3600) + (minutes * 60);

    if (totalSeconds <= 0) {
      alert('יש להזין זמן גדול מ-0');
      return;
    }

    try {
      const project = projects.find(p => p.id === editingLog.project_id);
      const task = tasks.find(t => t.id === editingLog.task_id);

      await base44.entities.TimeLog.update(editingLog.id, {
        project_id: editingLog.project_id || null,
        project_name: project?.name || editingLog.project_name || '',
        task_id: editingLog.task_id || null,
        task_title: task?.title || editingLog.task_title || '',
        duration_seconds: totalSeconds,
        title: editingLog.title,
        notes: editingLog.notes
      });

      setEditingLog(null);
      onUpdate?.();
    } catch (error) {
      console.error('Error updating time log:', error);
      alert('שגיאה בעדכון רישום הזמן');
    }
  };

  const deleteLog = async (logId) => {
    if (!confirm('למחוק רישום זמן זה?')) return;
    
    try {
      await base44.entities.TimeLog.delete(logId);
      onUpdate?.();
    } catch (error) {
      console.error('Error deleting time log:', error);
    }
  };

  const days = getDaysInMonth();
  const daysOfWeek = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];

  // Filter projects by client
  const filteredProjects = useMemo(() => {
    if (!newLogData.client_id) return projects;
    return projects.filter(p => p.client_id === newLogData.client_id);
  }, [projects, newLogData.client_id]);

  // Filter tasks by project
  const filteredTasks = useMemo(() => {
    if (!newLogData.project_id) return [];
    return tasks.filter(t => t.project_id === newLogData.project_id);
  }, [tasks, newLogData.project_id]);

  return (
    <div className="space-y-4" dir="rtl">
      {/* Header with navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <h3 className="text-xl font-bold min-w-[180px] text-center">
            {format(currentMonth, 'MMMM yyyy', { locale: he })}
          </h3>
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date())}>
            היום
          </Button>
        </div>

        {/* Month stats */}
        <div className="flex items-center gap-4">
          <Badge variant="secondary" className="text-sm py-1 px-3">
            <Clock className="w-4 h-4 ml-1" />
            {monthStats.totalHours.toFixed(1)} שעות
          </Badge>
          <Badge variant="outline" className="text-sm py-1 px-3">
            {monthStats.logsCount} רישומים
          </Badge>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
          {daysOfWeek.map((day, idx) => (
            <div key={idx} className="p-3 text-center font-semibold text-slate-600 text-sm">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7">
          {days.map((day, idx) => {
            const hours = getHoursForDay(day);
            const logs = getLogsForDay(day);
            const isToday = isSameDay(day, new Date());
            const isOutsideMonth = !isWithinInterval(day, {
              start: startOfMonth(currentMonth),
              end: endOfMonth(currentMonth)
            });

            return (
              <div
                key={idx}
                onClick={() => handleDayClick(day)}
                className={`
                  min-h-[100px] p-2 border-b border-l border-slate-200 cursor-pointer 
                  transition-all hover:bg-blue-50 group
                  ${isToday ? 'bg-blue-50 ring-2 ring-blue-500 ring-inset' : ''}
                  ${isOutsideMonth ? 'bg-slate-50 text-slate-400' : ''}
                `}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-sm font-semibold ${isToday ? 'text-blue-600' : ''}`}>
                    {format(day, 'd')}
                  </span>
                  {hours > 0 && (
                    <Badge variant="secondary" className="text-xs h-5 px-1.5">
                      {hours.toFixed(1)}ש'
                    </Badge>
                  )}
                </div>

                <div className="space-y-1">
                  {logs.slice(0, 3).map((log, logIdx) => (
                    <div
                      key={logIdx}
                      className={`
                        text-xs p-1 rounded truncate
                        ${log.project_id ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}
                      `}
                      title={`${log.client_name}${log.project_name ? ` - ${log.project_name}` : ''}: ${formatDuration(log.duration_seconds)}`}
                    >
                      {log.client_name}
                    </div>
                  ))}
                  {logs.length > 3 && (
                    <div className="text-xs text-slate-500 text-center">
                      +{logs.length - 3}
                    </div>
                  )}
                </div>

                {/* Quick add button on hover */}
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute bottom-1 left-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity bg-white shadow-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedDate(day);
                    handleAddLog();
                  }}
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top clients/projects summary */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <User className="w-4 h-4" />
              לקוחות מובילים החודש
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {monthStats.byClient.map(([name, seconds], idx) => (
                <div key={name} className="flex items-center justify-between text-sm">
                  <span className="truncate">{name}</span>
                  <Badge variant="outline">{(seconds / 3600).toFixed(1)}ש'</Badge>
                </div>
              ))}
              {monthStats.byClient.length === 0 && (
                <div className="text-slate-400 text-sm">אין נתונים</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Briefcase className="w-4 h-4" />
              פרויקטים מובילים החודש
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {monthStats.byProject.map(([name, seconds], idx) => (
                <div key={name} className="flex items-center justify-between text-sm">
                  <span className="truncate">{name}</span>
                  <Badge variant="outline">{(seconds / 3600).toFixed(1)}ש'</Badge>
                </div>
              ))}
              {monthStats.byProject.length === 0 && (
                <div className="text-slate-400 text-sm">אין נתונים</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Day details dialog */}
      <Dialog open={showDayDialog} onOpenChange={setShowDayDialog}>
        <DialogContent className="max-w-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                {selectedDate && format(selectedDate, 'EEEE, d בMMMM yyyy', { locale: he })}
              </span>
              <Button size="sm" onClick={handleAddLog} className="gap-1">
                <Plus className="w-4 h-4" />
                הוסף רישום
              </Button>
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-3 p-1">
              {selectedDate && getLogsForDay(selectedDate).length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <Clock className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p>אין רישומי זמן ליום זה</p>
                </div>
              ) : (
                selectedDate && getLogsForDay(selectedDate).map(log => (
                  <Card key={log.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="secondary">{log.client_name}</Badge>
                            {log.project_name && (
                              <Badge variant="outline" className="bg-purple-50">
                                <Briefcase className="w-3 h-3 ml-1" />
                                {log.project_name}
                              </Badge>
                            )}
                            <Badge className="bg-blue-100 text-blue-700">
                              {formatDuration(log.duration_seconds)}
                            </Badge>
                          </div>
                          {log.title && <div className="font-medium">{log.title}</div>}
                          {log.notes && <div className="text-sm text-slate-600 mt-1">{log.notes}</div>}
                          {log.task_title && (
                            <div className="text-xs text-slate-500 mt-1">משימה: {log.task_title}</div>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEditLog(log)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteLog(log.id)} className="text-red-600">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>

          {selectedDate && getLogsForDay(selectedDate).length > 0 && (
            <div className="border-t pt-3 flex justify-between items-center">
              <span className="text-sm text-slate-600">
                {getLogsForDay(selectedDate).length} רישומים
              </span>
              <Badge className="bg-blue-600">
                סה"כ: {getHoursForDay(selectedDate).toFixed(1)} שעות
              </Badge>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add log dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent dir="rtl" className="max-w-lg">
          <DialogHeader>
            <DialogTitle>הוסף רישום זמן</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">תאריך</label>
              <div className="p-2 bg-slate-50 rounded border">
                {selectedDate && format(selectedDate, 'dd/MM/yyyy', { locale: he })}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">לקוח *</label>
              <Select
                value={newLogData.client_id}
                onValueChange={(value) => {
                  const client = clients.find(c => c.id === value);
                  setNewLogData({
                    ...newLogData,
                    client_id: value,
                    client_name: client?.name || '',
                    project_id: '',
                    project_name: '',
                    task_id: '',
                    task_title: ''
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="בחר לקוח..." />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(client => (
                    <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">פרויקט</label>
              <Select
                value={newLogData.project_id}
                onValueChange={(value) => {
                  const project = projects.find(p => p.id === value);
                  setNewLogData({
                    ...newLogData,
                    project_id: value,
                    project_name: project?.name || '',
                    task_id: '',
                    task_title: ''
                  });
                }}
                disabled={!newLogData.client_id}
              >
                <SelectTrigger>
                  <SelectValue placeholder="בחר פרויקט (אופציונלי)..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>ללא פרויקט</SelectItem>
                  {filteredProjects.map(project => (
                    <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {filteredTasks.length > 0 && (
              <div>
                <label className="text-sm font-medium mb-2 block">משימה</label>
                <Select
                  value={newLogData.task_id}
                  onValueChange={(value) => {
                    const task = tasks.find(t => t.id === value);
                    setNewLogData({
                      ...newLogData,
                      task_id: value,
                      task_title: task?.title || ''
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="בחר משימה (אופציונלי)..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>ללא משימה</SelectItem>
                    {filteredTasks.map(task => (
                      <SelectItem key={task.id} value={task.id}>{task.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <label className="text-sm font-medium mb-2 block">משך זמן *</label>
              <div className="flex items-center gap-3 justify-center">
                <div className="flex flex-col items-center">
                  <Input
                    value={newLogData.hours}
                    onChange={(e) => setNewLogData({ ...newLogData, hours: e.target.value.replace(/\D/g, '').slice(0, 2) })}
                    className="w-20 h-12 text-center text-lg font-bold"
                    placeholder="00"
                  />
                  <span className="text-xs text-slate-600 mt-1">שעות</span>
                </div>
                <span className="text-2xl font-bold text-blue-600">:</span>
                <div className="flex flex-col items-center">
                  <Input
                    value={newLogData.minutes}
                    onChange={(e) => setNewLogData({ ...newLogData, minutes: e.target.value.replace(/\D/g, '').slice(0, 2) })}
                    className="w-20 h-12 text-center text-lg font-bold"
                    placeholder="00"
                  />
                  <span className="text-xs text-slate-600 mt-1">דקות</span>
                </div>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">כותרת</label>
              <Input
                value={newLogData.title}
                onChange={(e) => setNewLogData({ ...newLogData, title: e.target.value })}
                placeholder="תיאור קצר של העבודה..."
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">הערות</label>
              <Textarea
                value={newLogData.notes}
                onChange={(e) => setNewLogData({ ...newLogData, notes: e.target.value })}
                placeholder="הערות נוספות..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>ביטול</Button>
            <Button onClick={saveNewLog} className="bg-green-600 hover:bg-green-700">
              <Plus className="w-4 h-4 ml-2" />
              שמור
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit log dialog */}
      <Dialog open={!!editingLog} onOpenChange={() => setEditingLog(null)}>
        <DialogContent dir="rtl" className="max-w-lg">
          <DialogHeader>
            <DialogTitle>עריכת רישום זמן</DialogTitle>
          </DialogHeader>

          {editingLog && (
            <div className="space-y-4 py-4">
              <div className="p-3 bg-slate-50 rounded-lg">
                <div className="text-sm text-slate-600">לקוח: <span className="font-medium">{editingLog.client_name}</span></div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">פרויקט</label>
                <Select
                  value={editingLog.project_id || ''}
                  onValueChange={(value) => {
                    const project = projects.find(p => p.id === value);
                    setEditingLog({
                      ...editingLog,
                      project_id: value,
                      project_name: project?.name || ''
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="בחר פרויקט..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>ללא פרויקט</SelectItem>
                    {projects.filter(p => p.client_id === editingLog.client_id).map(project => (
                      <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">משך זמן</label>
                <div className="flex items-center gap-3 justify-center">
                  <div className="flex flex-col items-center">
                    <Input
                      value={editingLog.hours}
                      onChange={(e) => setEditingLog({ ...editingLog, hours: e.target.value.replace(/\D/g, '').slice(0, 2) })}
                      className="w-20 h-12 text-center text-lg font-bold"
                      placeholder="00"
                    />
                    <span className="text-xs text-slate-600 mt-1">שעות</span>
                  </div>
                  <span className="text-2xl font-bold text-blue-600">:</span>
                  <div className="flex flex-col items-center">
                    <Input
                      value={editingLog.minutes}
                      onChange={(e) => setEditingLog({ ...editingLog, minutes: e.target.value.replace(/\D/g, '').slice(0, 2) })}
                      className="w-20 h-12 text-center text-lg font-bold"
                      placeholder="00"
                    />
                    <span className="text-xs text-slate-600 mt-1">דקות</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">כותרת</label>
                <Input
                  value={editingLog.title || ''}
                  onChange={(e) => setEditingLog({ ...editingLog, title: e.target.value })}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">הערות</label>
                <Textarea
                  value={editingLog.notes || ''}
                  onChange={(e) => setEditingLog({ ...editingLog, notes: e.target.value })}
                  rows={2}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingLog(null)}>ביטול</Button>
            <Button onClick={saveEditLog}>שמור שינויים</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}