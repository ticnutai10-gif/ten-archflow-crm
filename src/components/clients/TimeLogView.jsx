import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Clock, Edit, Trash2, Calendar, User as UserIcon } from "lucide-react";
import { format, parseISO } from "date-fns";
import { he } from "date-fns/locale";

function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours === 0) return `${minutes} דקות`;
  return `${hours}:${minutes.toString().padStart(2, '0')} שעות`;
}

export default function TimeLogView({ client, timeLogs: initialTimeLogs, onTimeLogUpdate }) {
  // ✅ הגנה מלאה על props
  console.log('🕒 [TimeLogView] Component mounted/updated with:', {
    client,
    clientType: typeof client,
    clientIsValid: client && typeof client === 'object',
    clientName: client?.name,
    initialTimeLogs,
    initialTimeLogsType: typeof initialTimeLogs,
    initialTimeLogsIsArray: Array.isArray(initialTimeLogs),
    initialTimeLogsCount: initialTimeLogs?.length
  });

  // ✅ ברירת מחדל בטוחה
  const [timeLogs, setTimeLogs] = useState([]);
  const [editingLog, setEditingLog] = useState(null);
  const [deleteLogId, setDeleteLogId] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editData, setEditData] = useState({ title: '', notes: '', hours: '0', minutes: '0', log_date: '' });
  const [canEdit, setCanEdit] = useState(false);

  // ✅ עדכון timeLogs עם הגנה מלאה
  useEffect(() => {
    if (!initialTimeLogs) {
      console.warn('⚠️ [TimeLogView] initialTimeLogs is null/undefined, using empty array');
      setTimeLogs([]);
      return;
    }

    if (!Array.isArray(initialTimeLogs)) {
      console.error('❌ [TimeLogView] initialTimeLogs is not an array!', {
        type: typeof initialTimeLogs,
        value: initialTimeLogs
      });
      setTimeLogs([]);
      return;
    }

    console.log('✅ [TimeLogView] Setting timeLogs from props:', initialTimeLogs.length);
    setTimeLogs(initialTimeLogs);
  }, [initialTimeLogs]);

  useEffect(() => {
    const checkPermissions = async () => {
      try {
        const user = await base44.auth.me();
        if (!user) {
          setCanEdit(false);
          return;
        }

        if (user.role === "admin") {
          setCanEdit(true);
          return;
        }

        const rows = await base44.entities.AccessControl.filter({ 
          email: user.email, 
          active: true 
        }).catch(() => []);
        
        // ✅ הגנה על תוצאות
        const validRows = Array.isArray(rows) ? rows : [];
        setCanEdit(!!validRows?.[0] && validRows[0].role === "manager_plus");
      } catch (e) {
        console.error('❌ [TimeLogView] Error checking permissions:', e);
        setCanEdit(false);
      }
    };

    checkPermissions();
  }, []);

  const handleEdit = (log) => {
    const hours = Math.floor((log.duration_seconds || 0) / 3600);
    const minutes = Math.floor(((log.duration_seconds || 0) % 3600) / 60);
    
    setEditingLog(log);
    setEditData({
      title: log.title || '',
      notes: log.notes || '',
      hours: String(hours),
      minutes: String(minutes),
      log_date: log.log_date || ''
    });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingLog) return;
    
    const hours = parseInt(editData.hours || '0', 10);
    const minutes = parseInt(editData.minutes || '0', 10);
    const totalSeconds = (hours * 3600) + (minutes * 60);
    
    if (totalSeconds <= 0) {
      alert('יש להזין זמן גדול מ-0');
      return;
    }
    
    try {
      await base44.entities.TimeLog.update(editingLog.id, {
        title: editData.title,
        notes: editData.notes,
        duration_seconds: totalSeconds,
        log_date: editData.log_date
      });
      setEditDialogOpen(false);
      setEditingLog(null);
      if (onTimeLogUpdate) await onTimeLogUpdate();
    } catch (error) {
      console.error('Error updating time log:', error);
      alert('שגיאה בעדכון רישום הזמן');
    }
  };

  const handleDelete = async () => {
    if (!deleteLogId) return;
    try {
      await base44.entities.TimeLog.delete(deleteLogId);
      setDeleteDialogOpen(false);
      setDeleteLogId(null);
      if (onTimeLogUpdate) await onTimeLogUpdate();
    } catch (error) {
      console.error('Error deleting time log:', error);
      alert('שגיאה במחיקת רישום הזמן');
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return null;
      return format(date, 'HH:mm', { locale: he });
    } catch (e) {
      console.error('Error formatting time:', e);
      return null;
    }
  };

  // ✅ הגנה מלאה על client prop
  if (!client || typeof client !== 'object') {
    console.error('❌ [TimeLogView] Invalid client prop:', {
      client,
      type: typeof client
    });
    return (
      <div className="p-8 text-center" dir="rtl">
        <Card>
          <CardContent className="p-6">
            <Clock className="w-12 h-12 mx-auto mb-3 text-red-300" />
            <p className="text-red-600">שגיאה: נתוני לקוח לא תקינים</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ✅ ברירת מחדל בטוחה לשם הלקוח
  const clientName = client.name || client.client_name || 'לקוח לא ידוע';

  // ✅ הגנה מלאה על timeLogs array
  const validTimeLogs = Array.isArray(timeLogs) 
    ? timeLogs.filter(log => log && typeof log === 'object')
    : [];

  const totalTime = validTimeLogs.reduce((sum, log) => sum + (log?.duration_seconds || 0), 0);

  console.log('✅ [TimeLogView] Rendering with:', {
    clientName,
    validTimeLogsCount: validTimeLogs.length,
    totalTime,
    canEdit
  });

  return (
    <div className="space-y-4" dir="rtl">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>יומן זמן עבור {clientName}</CardTitle>
            <Badge variant="outline" className="text-lg px-4 py-2">
              <Clock className="w-4 h-4 ml-2" />
              סה״כ: {formatDuration(totalTime)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {validTimeLogs.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Clock className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>אין רישומי זמן עדיין</p>
            </div>
          ) : (
            <div className="space-y-3">
              {validTimeLogs.map((log) => {
                if (!log || typeof log !== 'object') {
                  console.error('❌ [TimeLogView] Invalid log in render:', log);
                  return null;
                }

                const timeStr = formatTime(log.created_date);
                const durationSeconds = log.duration_seconds || 0;
                const logDate = log.log_date;
                const title = log.title || '';
                const notes = log.notes || '';
                const createdBy = log.created_by || '';
                
                return (
                  <Card key={log.id} className="border-l-4 border-blue-500 hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <Badge variant="outline" className="bg-blue-50 text-blue-700">
                              {formatDuration(durationSeconds)}
                            </Badge>
                            <div className="flex items-center gap-2 text-sm text-slate-500">
                              <Calendar className="w-4 h-4" />
                              {logDate ? format(parseISO(logDate), 'dd/MM/yyyy', { locale: he }) : 'לא צוין'}
                            </div>
                            {timeStr && (
                              <div className="flex items-center gap-2 text-sm text-slate-500">
                                <Clock className="w-4 h-4" />
                                <span className="font-medium">{timeStr}</span>
                              </div>
                            )}
                          </div>
                          {title && (
                            <h4 className="font-semibold text-slate-900 mb-1">{title}</h4>
                          )}
                          {notes && (
                            <p className="text-sm text-slate-600 whitespace-pre-wrap">{notes}</p>
                          )}
                          {createdBy && (
                            <div className="flex items-center gap-2 text-xs text-slate-500 mt-2">
                              <UserIcon className="w-3 h-3" />
                              {createdBy}
                            </div>
                          )}
                        </div>
                        {canEdit && (
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(log)}
                              className="h-8 w-8"
                            >
                              <Edit className="w-4 h-4 text-blue-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setDeleteLogId(log.id);
                                setDeleteDialogOpen(true);
                              }}
                              className="h-8 w-8"
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>עריכת רישום זמן</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-slate-700 mb-2 block">כותרת</label>
              <Input
                value={editData.title}
                onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                placeholder="כותרת רישום הזמן"
              />
            </div>
            
            <div>
              <label className="text-sm font-semibold text-slate-700 mb-2 block">משך זמן</label>
              <div className="flex items-center gap-3 justify-center">
                <div className="flex flex-col items-center">
                  <Input
                    value={editData.hours}
                    onChange={(e) => setEditData({ ...editData, hours: e.target.value.replace(/\D/g, '').slice(0, 2) })}
                    className="w-20 h-12 text-center text-lg font-bold"
                    placeholder="00"
                    maxLength={2}
                  />
                  <span className="text-xs text-slate-600 mt-1 font-medium">שעות</span>
                </div>
                <span className="text-2xl font-bold text-blue-600">:</span>
                <div className="flex flex-col items-center">
                  <Input
                    value={editData.minutes}
                    onChange={(e) => setEditData({ ...editData, minutes: e.target.value.replace(/\D/g, '').slice(0, 2) })}
                    className="w-20 h-12 text-center text-lg font-bold"
                    placeholder="00"
                    maxLength={2}
                  />
                  <span className="text-xs text-slate-600 mt-1 font-medium">דקות</span>
                </div>
              </div>
            </div>
            
            <div>
              <label className="text-sm font-semibold text-slate-700 mb-2 block">הערות</label>
              <Textarea
                value={editData.notes}
                onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                placeholder="הערות נוספות"
                className="min-h-[80px]"
              />
            </div>
            
            <div>
              <label className="text-sm font-semibold text-slate-700 mb-2 block">תאריך</label>
              <Input
                type="date"
                value={editData.log_date}
                onChange={(e) => setEditData({ ...editData, log_date: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              ביטול
            </Button>
            <Button onClick={handleSaveEdit}>
              שמור שינויים
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>מחיקת רישום זמן</DialogTitle>
          </DialogHeader>
          <p>האם אתה בטוח שברצונך למחוק רישום זמן זה? פעולה זו אינה ניתנת לביטול.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              ביטול
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              מחק
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}