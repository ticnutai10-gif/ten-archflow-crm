
import React, { useState, useEffect } from 'react';
import { TimeLog, User } from '@/entities/all';
import { AccessControl } from "@/entities/AccessControl";
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
  const [timeLogs, setTimeLogs] = useState(initialTimeLogs || []);
  const [editingLog, setEditingLog] = useState(null);
  const [deleteLogId, setDeleteLogId] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editData, setEditData] = useState({ title: '', notes: '', duration_seconds: 0, log_date: '' });
  const [canEdit, setCanEdit] = useState(false);

  useEffect(() => {
    setTimeLogs(initialTimeLogs || []);
  }, [initialTimeLogs]);

  useEffect(() => {
    (async () => {
      try {
        const user = await User.me();
        if (!user) {
          setCanEdit(false);
          return;
        }

        if (user.role === "admin") {
          setCanEdit(true);
          return;
        }

        const rows = await AccessControl.filter({ email: user.email, active: true }).catch(() => []);
        setCanEdit(!!rows?.[0] && rows[0].role === "manager_plus");
      } catch (e) {
        setCanEdit(false);
      }
    })();
  }, []);

  const handleEdit = (log) => {
    setEditingLog(log);
    setEditData({
      title: log.title || '',
      notes: log.notes || '',
      duration_seconds: log.duration_seconds || 0,
      log_date: log.log_date || ''
    });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingLog) return;
    try {
      await TimeLog.update(editingLog.id, editData);
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
      await TimeLog.delete(deleteLogId);
      setDeleteDialogOpen(false);
      setDeleteLogId(null);
      if (onTimeLogUpdate) await onTimeLogUpdate();
    } catch (error) {
      console.error('Error deleting time log:', error);
      alert('שגיאה במחיקת רישום הזמן');
    }
  };

  const totalTime = timeLogs.reduce((sum, log) => sum + (log.duration_seconds || 0), 0);

  // פונקציה לפורמט שעה בטוח
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

  return (
    <div className="space-y-4" dir="rtl">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>יומן זמן עבור {client.name}</CardTitle>
            <Badge variant="outline" className="text-lg px-4 py-2">
              <Clock className="w-4 h-4 ml-2" />
              סה״כ: {formatDuration(totalTime)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {timeLogs.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Clock className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>אין רישומי זמן עדיין</p>
            </div>
          ) : (
            <div className="space-y-3">
              {timeLogs.map((log) => {
                const timeStr = formatTime(log.created_date);
                
                return (
                  <Card key={log.id} className="border-l-4 border-blue-500 hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <Badge variant="outline" className="bg-blue-50 text-blue-700">
                              {formatDuration(log.duration_seconds)}
                            </Badge>
                            <div className="flex items-center gap-2 text-sm text-slate-500">
                              <Calendar className="w-4 h-4" />
                              {log.log_date ? format(parseISO(log.log_date), 'dd/MM/yyyy', { locale: he }) : 'לא צוין'}
                            </div>
                            {timeStr && (
                              <div className="flex items-center gap-2 text-sm text-slate-500">
                                <Clock className="w-4 h-4" />
                                <span className="font-medium">{timeStr}</span>
                              </div>
                            )}
                          </div>
                          {log.title && (
                            <h4 className="font-semibold text-slate-900 mb-1">{log.title}</h4>
                          )}
                          {log.notes && (
                            <p className="text-sm text-slate-600 whitespace-pre-wrap">{log.notes}</p>
                          )}
                          {log.created_by && (
                            <div className="flex items-center gap-2 text-xs text-slate-500 mt-2">
                              <UserIcon className="w-3 h-3" />
                              {log.created_by}
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
              <label className="text-sm font-medium">כותרת</label>
              <Input
                value={editData.title}
                onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                placeholder="כותרת רישום הזמן"
              />
            </div>
            <div>
              <label className="text-sm font-medium">הערות</label>
              <Textarea
                value={editData.notes}
                onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                placeholder="הערות נוספות"
                rows={4}
              />
            </div>
            <div>
              <label className="text-sm font-medium">משך זמן (בשניות)</label>
              <Input
                type="number"
                value={editData.duration_seconds}
                onChange={(e) => setEditData({ ...editData, duration_seconds: parseInt(e.target.value) || 0 })}
              />
              <p className="text-xs text-slate-500 mt-1">
                משך זמן נוכחי: {formatDuration(editData.duration_seconds)}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium">תאריך</label>
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
