import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ChevronLeft, ChevronRight, Briefcase, Clock, Plus, Pencil, 
  Trash2, User, ChevronDown, ChevronUp, Calendar
} from "lucide-react";
import {
  format, startOfWeek, endOfWeek, addDays, addWeeks, subWeeks, 
  isSameDay, differenceInDays, isWithinInterval
} from "date-fns";
import { he } from "date-fns/locale";
import { base44 } from "@/api/base44Client";

function formatDuration(seconds) {
  if (!seconds) return '0 דק\'';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours === 0) return `${minutes} דק'`;
  return `${hours}:${minutes.toString().padStart(2, '0')}`;
}

const COLORS = [
  'bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-amber-500',
  'bg-pink-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-rose-500'
];

export default function TimeLogGanttView({
  timeLogs = [],
  clients = [],
  projects = [],
  tasks = [],
  onUpdate,
  currentUser
}) {
  const [startDate, setStartDate] = useState(() => startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [weeksToShow, setWeeksToShow] = useState(2);
  const [expandedClients, setExpandedClients] = useState(new Set());
  const [expandedProjects, setExpandedProjects] = useState(new Set());
  const [editingLog, setEditingLog] = useState(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addContext, setAddContext] = useState(null); // { clientId, projectId, date }

  const endDate = addDays(startDate, weeksToShow * 7 - 1);

  // Generate days array for the header
  const days = useMemo(() => {
    const result = [];
    let current = new Date(startDate);
    while (current <= endDate) {
      result.push(new Date(current));
      current = addDays(current, 1);
    }
    return result;
  }, [startDate, endDate]);

  // Group logs by client and project
  const groupedData = useMemo(() => {
    const clientMap = new Map();

    // Filter logs within date range
    const filteredLogs = timeLogs.filter(log => {
      if (!log?.log_date) return false;
      const logDate = new Date(log.log_date);
      return isWithinInterval(logDate, { start: startDate, end: endDate });
    });

    // Group by client
    filteredLogs.forEach(log => {
      const clientKey = log.client_id || log.client_name || 'unknown';
      if (!clientMap.has(clientKey)) {
        clientMap.set(clientKey, {
          id: log.client_id,
          name: log.client_name || 'ללא לקוח',
          totalSeconds: 0,
          projects: new Map(),
          directLogs: [] // Logs without project
        });
      }

      const clientData = clientMap.get(clientKey);
      clientData.totalSeconds += log.duration_seconds || 0;

      if (log.project_id) {
        const projectKey = log.project_id;
        if (!clientData.projects.has(projectKey)) {
          clientData.projects.set(projectKey, {
            id: log.project_id,
            name: log.project_name || 'פרויקט לא ידוע',
            totalSeconds: 0,
            logs: []
          });
        }
        const projectData = clientData.projects.get(projectKey);
        projectData.totalSeconds += log.duration_seconds || 0;
        projectData.logs.push(log);
      } else {
        clientData.directLogs.push(log);
      }
    });

    return Array.from(clientMap.values()).sort((a, b) => b.totalSeconds - a.totalSeconds);
  }, [timeLogs, startDate, endDate]);

  // Calculate total hours
  const totalStats = useMemo(() => {
    const totalSeconds = groupedData.reduce((sum, c) => sum + c.totalSeconds, 0);
    const uniqueClients = groupedData.length;
    const uniqueProjects = groupedData.reduce((sum, c) => sum + c.projects.size, 0);
    return {
      totalHours: totalSeconds / 3600,
      uniqueClients,
      uniqueProjects,
      logsCount: timeLogs.filter(log => {
        if (!log?.log_date) return false;
        const logDate = new Date(log.log_date);
        return isWithinInterval(logDate, { start: startDate, end: endDate });
      }).length
    };
  }, [groupedData, timeLogs, startDate, endDate]);

  const toggleClient = (clientId) => {
    const newExpanded = new Set(expandedClients);
    if (newExpanded.has(clientId)) {
      newExpanded.delete(clientId);
    } else {
      newExpanded.add(clientId);
    }
    setExpandedClients(newExpanded);
  };

  const toggleProject = (projectId) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId);
    } else {
      newExpanded.add(projectId);
    }
    setExpandedProjects(newExpanded);
  };

  const getLogsForDay = (logs, date) => {
    return logs.filter(log => log.log_date && isSameDay(new Date(log.log_date), date));
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
      await base44.entities.TimeLog.update(editingLog.id, {
        duration_seconds: totalSeconds,
        title: editingLog.title,
        notes: editingLog.notes
      });
      setEditingLog(null);
      onUpdate?.();
    } catch (error) {
      console.error('Error updating time log:', error);
      alert('שגיאה בעדכון');
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

  const handleAddClick = (clientId, projectId, date) => {
    setAddContext({ clientId, projectId, date });
    setShowAddDialog(true);
  };

  const saveNewLog = async (data) => {
    try {
      const client = clients.find(c => c.id === data.client_id);
      const project = data.project_id ? projects.find(p => p.id === data.project_id) : null;

      await base44.entities.TimeLog.create({
        client_id: data.client_id,
        client_name: client?.name || '',
        project_id: data.project_id || null,
        project_name: project?.name || '',
        log_date: format(data.date, 'yyyy-MM-dd'),
        duration_seconds: data.duration_seconds,
        title: data.title || '',
        notes: data.notes || '',
        user_email: currentUser?.email || '',
        user_name: currentUser?.full_name || ''
      });

      setShowAddDialog(false);
      setAddContext(null);
      onUpdate?.();
    } catch (error) {
      console.error('Error creating time log:', error);
      alert('שגיאה ביצירת רישום');
    }
  };

  // Get color for client/project
  const getColor = (idx) => COLORS[idx % COLORS.length];

  return (
    <TooltipProvider>
      <div className="space-y-4" dir="rtl">
        {/* Controls */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setStartDate(subWeeks(startDate, 1))}>
              <ChevronRight className="w-4 h-4" />
            </Button>
            <span className="font-medium min-w-[200px] text-center">
              {format(startDate, 'd MMM', { locale: he })} - {format(endDate, 'd MMM yyyy', { locale: he })}
            </span>
            <Button variant="outline" size="icon" onClick={() => setStartDate(addWeeks(startDate, 1))}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setStartDate(startOfWeek(new Date(), { weekStartsOn: 0 }))}>
              היום
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <Select value={String(weeksToShow)} onValueChange={(v) => setWeeksToShow(Number(v))}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">שבוע</SelectItem>
                <SelectItem value="2">שבועיים</SelectItem>
                <SelectItem value="4">חודש</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="py-1 px-3">
                <Clock className="w-4 h-4 ml-1" />
                {totalStats.totalHours.toFixed(1)}ש'
              </Badge>
              <Badge variant="outline" className="py-1 px-3">
                {totalStats.uniqueClients} לקוחות
              </Badge>
              <Badge variant="outline" className="py-1 px-3">
                {totalStats.uniqueProjects} פרויקטים
              </Badge>
            </div>
          </div>
        </div>

        {/* Gantt Chart */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-slate-50 border-b">
                  <th className="text-right p-3 min-w-[200px] sticky right-0 bg-slate-50 z-10 border-l">
                    לקוח / פרויקט
                  </th>
                  <th className="text-center p-2 min-w-[60px] border-l">
                    סה"כ
                  </th>
                  {days.map((day, idx) => {
                    const isToday = isSameDay(day, new Date());
                    const isWeekend = day.getDay() === 5 || day.getDay() === 6;
                    return (
                      <th
                        key={idx}
                        className={`text-center p-2 min-w-[50px] text-xs border-l
                          ${isToday ? 'bg-blue-100' : isWeekend ? 'bg-slate-100' : ''}
                        `}
                      >
                        <div className="font-medium">{format(day, 'EEE', { locale: he })}</div>
                        <div className="text-slate-500">{format(day, 'd')}</div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {groupedData.length === 0 ? (
                  <tr>
                    <td colSpan={days.length + 2} className="text-center py-12 text-slate-500">
                      <Clock className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                      <p>אין רישומי זמן בטווח התאריכים הנבחר</p>
                    </td>
                  </tr>
                ) : (
                  groupedData.map((client, clientIdx) => (
                    <React.Fragment key={client.id || client.name}>
                      {/* Client row */}
                      <tr className="border-b hover:bg-slate-50 group">
                        <td className="p-2 sticky right-0 bg-white group-hover:bg-slate-50 z-10 border-l">
                          <button
                            className="flex items-center gap-2 w-full text-right"
                            onClick={() => toggleClient(client.id || client.name)}
                          >
                            {client.projects.size > 0 || client.directLogs.length > 0 ? (
                              expandedClients.has(client.id || client.name) ?
                                <ChevronUp className="w-4 h-4 text-slate-400" /> :
                                <ChevronDown className="w-4 h-4 text-slate-400" />
                            ) : <div className="w-4" />}
                            <div className={`w-3 h-3 rounded-full ${getColor(clientIdx)}`} />
                            <span className="font-medium">{client.name}</span>
                          </button>
                        </td>
                        <td className="p-2 text-center border-l">
                          <Badge variant="secondary" className="text-xs">
                            {(client.totalSeconds / 3600).toFixed(1)}
                          </Badge>
                        </td>
                        {days.map((day, dayIdx) => {
                          const allClientLogs = [
                            ...client.directLogs,
                            ...Array.from(client.projects.values()).flatMap(p => p.logs)
                          ];
                          const dayLogs = getLogsForDay(allClientLogs, day);
                          const dayHours = dayLogs.reduce((sum, l) => sum + (l.duration_seconds || 0), 0) / 3600;
                          const isToday = isSameDay(day, new Date());
                          const isWeekend = day.getDay() === 5 || day.getDay() === 6;

                          return (
                            <td
                              key={dayIdx}
                              className={`p-1 text-center border-l relative group/cell
                                ${isToday ? 'bg-blue-50' : isWeekend ? 'bg-slate-50' : ''}
                              `}
                            >
                              {dayHours > 0 ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div
                                      className={`${getColor(clientIdx)} text-white text-xs rounded py-0.5 px-1 cursor-pointer hover:opacity-80`}
                                    >
                                      {dayHours.toFixed(1)}
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent dir="rtl">
                                    <div className="text-sm">
                                      <div className="font-medium">{client.name}</div>
                                      <div>{format(day, 'dd/MM/yyyy')}</div>
                                      <div>{dayLogs.length} רישומים</div>
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              ) : (
                                <button
                                  onClick={() => handleAddClick(client.id, null, day)}
                                  className="w-full h-full min-h-[24px] opacity-0 group-hover/cell:opacity-100 transition-opacity"
                                >
                                  <Plus className="w-3 h-3 mx-auto text-slate-400" />
                                </button>
                              )}
                            </td>
                          );
                        })}
                      </tr>

                      {/* Expanded projects */}
                      {expandedClients.has(client.id || client.name) && (
                        <>
                          {/* Direct logs (without project) */}
                          {client.directLogs.length > 0 && (
                            <tr className="border-b bg-slate-50/50">
                              <td className="p-2 pr-10 sticky right-0 bg-slate-50/50 z-10 border-l">
                                <span className="text-sm text-slate-600">ללא פרויקט</span>
                              </td>
                              <td className="p-2 text-center border-l">
                                <Badge variant="outline" className="text-xs">
                                  {(client.directLogs.reduce((s, l) => s + (l.duration_seconds || 0), 0) / 3600).toFixed(1)}
                                </Badge>
                              </td>
                              {days.map((day, dayIdx) => {
                                const dayLogs = getLogsForDay(client.directLogs, day);
                                const isToday = isSameDay(day, new Date());

                                return (
                                  <td key={dayIdx} className={`p-1 border-l ${isToday ? 'bg-blue-50/50' : ''}`}>
                                    {dayLogs.map(log => (
                                      <Tooltip key={log.id}>
                                        <TooltipTrigger asChild>
                                          <div
                                            onClick={() => handleEditLog(log)}
                                            className="text-xs bg-slate-200 text-slate-700 rounded py-0.5 px-1 mb-0.5 cursor-pointer hover:bg-slate-300"
                                          >
                                            {formatDuration(log.duration_seconds)}
                                          </div>
                                        </TooltipTrigger>
                                        <TooltipContent dir="rtl" className="max-w-xs">
                                          <div className="text-sm">
                                            {log.title && <div className="font-medium">{log.title}</div>}
                                            <div>{formatDuration(log.duration_seconds)}</div>
                                            {log.notes && <div className="text-slate-400 mt-1">{log.notes}</div>}
                                          </div>
                                        </TooltipContent>
                                      </Tooltip>
                                    ))}
                                  </td>
                                );
                              })}
                            </tr>
                          )}

                          {/* Projects */}
                          {Array.from(client.projects.values()).map((project, projIdx) => (
                            <tr key={project.id} className="border-b bg-purple-50/30">
                              <td className="p-2 pr-10 sticky right-0 bg-purple-50/30 z-10 border-l">
                                <div className="flex items-center gap-2">
                                  <Briefcase className="w-4 h-4 text-purple-500" />
                                  <span className="text-sm font-medium text-purple-700">{project.name}</span>
                                </div>
                              </td>
                              <td className="p-2 text-center border-l">
                                <Badge className="text-xs bg-purple-100 text-purple-700">
                                  {(project.totalSeconds / 3600).toFixed(1)}
                                </Badge>
                              </td>
                              {days.map((day, dayIdx) => {
                                const dayLogs = getLogsForDay(project.logs, day);
                                const isToday = isSameDay(day, new Date());

                                return (
                                  <td key={dayIdx} className={`p-1 border-l ${isToday ? 'bg-blue-50/50' : ''}`}>
                                    {dayLogs.map(log => (
                                      <Tooltip key={log.id}>
                                        <TooltipTrigger asChild>
                                          <div
                                            onClick={() => handleEditLog(log)}
                                            className="text-xs bg-purple-200 text-purple-800 rounded py-0.5 px-1 mb-0.5 cursor-pointer hover:bg-purple-300"
                                          >
                                            {formatDuration(log.duration_seconds)}
                                          </div>
                                        </TooltipTrigger>
                                        <TooltipContent dir="rtl" className="max-w-xs">
                                          <div className="text-sm">
                                            {log.title && <div className="font-medium">{log.title}</div>}
                                            <div>{formatDuration(log.duration_seconds)}</div>
                                            {log.task_title && <div className="text-purple-400">משימה: {log.task_title}</div>}
                                            {log.notes && <div className="text-slate-400 mt-1">{log.notes}</div>}
                                          </div>
                                        </TooltipContent>
                                      </Tooltip>
                                    ))}
                                    {dayLogs.length === 0 && (
                                      <button
                                        onClick={() => handleAddClick(client.id, project.id, day)}
                                        className="w-full h-full min-h-[20px] opacity-0 hover:opacity-100 transition-opacity"
                                      >
                                        <Plus className="w-3 h-3 mx-auto text-purple-400" />
                                      </button>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </>
                      )}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={!!editingLog} onOpenChange={() => setEditingLog(null)}>
          <DialogContent dir="rtl" className="max-w-lg">
            <DialogHeader>
              <DialogTitle>עריכת רישום זמן</DialogTitle>
            </DialogHeader>

            {editingLog && (
              <div className="space-y-4 py-4">
                <div className="p-3 bg-slate-50 rounded-lg space-y-1">
                  <div className="text-sm"><span className="text-slate-500">לקוח:</span> {editingLog.client_name}</div>
                  {editingLog.project_name && (
                    <div className="text-sm"><span className="text-slate-500">פרויקט:</span> {editingLog.project_name}</div>
                  )}
                  <div className="text-sm"><span className="text-slate-500">תאריך:</span> {format(new Date(editingLog.log_date), 'dd/MM/yyyy')}</div>
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

            <DialogFooter className="gap-2">
              <Button variant="destructive" size="sm" onClick={() => { deleteLog(editingLog?.id); setEditingLog(null); }}>
                <Trash2 className="w-4 h-4 ml-1" />
                מחק
              </Button>
              <div className="flex-1" />
              <Button variant="outline" onClick={() => setEditingLog(null)}>ביטול</Button>
              <Button onClick={saveEditLog}>שמור</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Quick Add Dialog */}
        <QuickAddDialog
          open={showAddDialog}
          onClose={() => { setShowAddDialog(false); setAddContext(null); }}
          context={addContext}
          clients={clients}
          projects={projects}
          onSave={saveNewLog}
        />
      </div>
    </TooltipProvider>
  );
}

// Quick Add Dialog Component
function QuickAddDialog({ open, onClose, context, clients, projects, onSave }) {
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [clientId, setClientId] = useState('');
  const [projectId, setProjectId] = useState('');

  React.useEffect(() => {
    if (context) {
      setClientId(context.clientId || '');
      setProjectId(context.projectId || '');
      setHours('');
      setMinutes('');
      setTitle('');
      setNotes('');
    }
  }, [context]);

  const filteredProjects = clientId 
    ? projects.filter(p => p.client_id === clientId)
    : projects;

  const handleSave = () => {
    const h = parseInt(hours || '0', 10);
    const m = parseInt(minutes || '0', 10);
    const totalSeconds = (h * 3600) + (m * 60);

    if (!clientId) {
      alert('יש לבחור לקוח');
      return;
    }
    if (totalSeconds <= 0) {
      alert('יש להזין זמן גדול מ-0');
      return;
    }

    onSave({
      client_id: clientId,
      project_id: projectId || null,
      date: context?.date || new Date(),
      duration_seconds: totalSeconds,
      title,
      notes
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent dir="rtl" className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            הוסף רישום זמן
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {context?.date && (
            <div className="p-2 bg-blue-50 rounded-lg text-center text-sm">
              <Calendar className="w-4 h-4 inline ml-2" />
              {format(context.date, 'EEEE, d בMMMM yyyy', { locale: he })}
            </div>
          )}

          <div>
            <label className="text-sm font-medium mb-2 block">לקוח *</label>
            <Select value={clientId} onValueChange={(v) => { setClientId(v); setProjectId(''); }}>
              <SelectTrigger>
                <SelectValue placeholder="בחר לקוח..." />
              </SelectTrigger>
              <SelectContent>
                {clients.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {filteredProjects.length > 0 && (
            <div>
              <label className="text-sm font-medium mb-2 block">פרויקט</label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="בחר פרויקט (אופציונלי)..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>ללא פרויקט</SelectItem>
                  {filteredProjects.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
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
                  value={hours}
                  onChange={(e) => setHours(e.target.value.replace(/\D/g, '').slice(0, 2))}
                  className="w-16 h-10 text-center font-bold"
                  placeholder="00"
                />
                <span className="text-xs text-slate-500 mt-1">שעות</span>
              </div>
              <span className="text-xl font-bold text-slate-400">:</span>
              <div className="flex flex-col items-center">
                <Input
                  value={minutes}
                  onChange={(e) => setMinutes(e.target.value.replace(/\D/g, '').slice(0, 2))}
                  className="w-16 h-10 text-center font-bold"
                  placeholder="00"
                />
                <span className="text-xs text-slate-500 mt-1">דקות</span>
              </div>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">כותרת</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="תיאור קצר..."
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">הערות</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="הערות נוספות..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>ביטול</Button>
          <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700">
            <Plus className="w-4 h-4 ml-1" />
            שמור
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}