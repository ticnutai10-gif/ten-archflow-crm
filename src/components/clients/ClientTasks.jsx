
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  CheckCircle2,
  Circle,
  ArrowUpCircle,
  Clock,
  Calendar,
  Plus,
  Edit,
  Trash2,
  User,
  AlertCircle,
  CheckSquare,
  ListTodo
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { format, isToday, isTomorrow, isPast } from "date-fns";
import { he } from "date-fns/locale";
import { toast } from "sonner";

const statusIcons = {
  'חדשה': Circle,
  'בתהליך': ArrowUpCircle,
  'הושלמה': CheckCircle2,
  'דחויה': Clock
};

const statusColors = {
  'חדשה': 'bg-blue-50 text-blue-700 border-blue-200',
  'בתהליך': 'bg-purple-50 text-purple-700 border-purple-200',
  'הושלמה': 'bg-green-50 text-green-700 border-green-200',
  'דחויה': 'bg-slate-50 text-slate-600 border-slate-200'
};

const priorityColors = {
  'גבוהה': 'bg-red-50 text-red-700 border-red-200',
  'בינונית': 'bg-amber-50 text-amber-700 border-amber-200',
  'נמוכה': 'bg-green-50 text-green-700 border-green-200'
};

export default function ClientTasks({ client }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'חדשה',
    priority: 'בינונית',
    due_date: '',
    assigned_to: ''
  });

  const loadTasks = async () => {
    try {
      setLoading(true);
      const allTasks = await base44.entities.Task.filter(
        { client_name: client.name },
        '-created_date'
      );
      setTasks(allTasks);
    } catch (error) {
      console.error('Error loading tasks:', error);
      toast.error('שגיאה בטעינת משימות');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (client) {
      loadTasks();
    }
  }, [client]);

  const handleOpenForm = (task = null) => {
    if (task) {
      setEditingTask(task);
      setFormData({
        title: task.title || '',
        description: task.description || '',
        status: task.status || 'חדשה',
        priority: task.priority || 'בינונית',
        due_date: task.due_date || '',
        assigned_to: task.assigned_to || ''
      });
    } else {
      setEditingTask(null);
      setFormData({
        title: '',
        description: '',
        status: 'חדשה',
        priority: 'בינונית',
        due_date: '',
        assigned_to: ''
      });
    }
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast.error('נא להזין כותרת למשימה');
      return;
    }

    try {
      const taskData = {
        ...formData,
        client_id: client.id,
        client_name: client.name
      };

      if (editingTask) {
        await base44.entities.Task.update(editingTask.id, taskData);
        toast.success('המשימה עודכנה בהצלחה');
      } else {
        await base44.entities.Task.create(taskData);
        toast.success('המשימה נוצרה בהצלחה');
      }

      setShowForm(false);
      setEditingTask(null);
      loadTasks();
    } catch (error) {
      console.error('Error saving task:', error);
      toast.error('שגיאה בשמירת המשימה');
    }
  };

  const handleDelete = async (taskId) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק את המשימה?')) {
      return;
    }

    try {
      await base44.entities.Task.delete(taskId);
      toast.success('המשימה נמחקה בהצלחה');
      loadTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('שגיאה במחיקת המשימה');
    }
  };

  const handleStatusChange = async (task, newStatus) => {
    try {
      await base44.entities.Task.update(task.id, { status: newStatus });
      toast.success('הסטטוס עודכן');
      loadTasks();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('שגיאה בעדכון הסטטוס');
    }
  };

  const getUrgencyInfo = (task) => {
    if (!task.due_date) return null;
    
    const dueDate = new Date(task.due_date);
    if (isPast(dueDate) && task.status !== 'הושלמה') {
      return { label: 'באיחור', color: 'text-red-600', icon: AlertCircle };
    }
    if (isToday(dueDate)) {
      return { label: 'היום', color: 'text-orange-600', icon: Calendar };
    }
    if (isTomorrow(dueDate)) {
      return { label: 'מחר', color: 'text-amber-600', icon: Calendar };
    }
    return null;
  };

  const formatDueDate = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    
    if (isToday(date)) return 'היום';
    if (isTomorrow(date)) return 'מחר';
    if (isPast(date)) return `איחור: ${format(date, 'dd/MM', { locale: he })}`;
    
    return format(date, 'dd/MM/yyyy', { locale: he });
  };

  const filteredTasks = filterStatus === 'all' 
    ? tasks 
    : tasks.filter(t => t.status === filterStatus);

  const stats = {
    total: tasks.length,
    open: tasks.filter(t => t.status !== 'הושלמה').length,
    completed: tasks.filter(t => t.status === 'הושלמה').length,
    overdue: tasks.filter(t => t.due_date && isPast(new Date(t.due_date)) && t.status !== 'הושלמה').length
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-slate-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header with stats */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <ListTodo className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-slate-900">משימות</h3>
          </div>
          
          <div className="flex gap-2">
            <Badge variant="outline" className="bg-blue-50 text-blue-700">
              {stats.total} סה״כ
            </Badge>
            <Badge variant="outline" className="bg-green-50 text-green-700">
              {stats.completed} הושלמו
            </Badge>
            {stats.overdue > 0 && (
              <Badge variant="outline" className="bg-red-50 text-red-700">
                {stats.overdue} באיחור
              </Badge>
            )}
          </div>
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full md:w-40">
              <SelectValue placeholder="סינון לפי סטטוס" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">הכל ({stats.total})</SelectItem>
              <SelectItem value="חדשה">חדשות</SelectItem>
              <SelectItem value="בתהליך">בתהליך</SelectItem>
              <SelectItem value="הושלמה">הושלמו</SelectItem>
              <SelectItem value="דחויה">דחויות</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={() => handleOpenForm()} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 ml-2" />
            משימה חדשה
          </Button>
        </div>
      </div>

      {/* Tasks list */}
      {filteredTasks.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <ListTodo className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 mb-4">
              {filterStatus === 'all' 
                ? 'אין משימות עדיין' 
                : 'אין משימות בסטטוס זה'}
            </p>
            {filterStatus === 'all' && (
              <Button onClick={() => handleOpenForm()} variant="outline">
                <Plus className="w-4 h-4 ml-2" />
                צור משימה ראשונה
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map(task => {
            const StatusIcon = statusIcons[task.status];
            const urgency = getUrgencyInfo(task);
            
            return (
              <Card key={task.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      {/* Status icon */}
                      <button
                        onClick={() => {
                          const statuses = ['חדשה', 'בתהליך', 'הושלמה'];
                          const currentIndex = statuses.indexOf(task.status);
                          const nextStatus = statuses[(currentIndex + 1) % statuses.length];
                          handleStatusChange(task, nextStatus);
                        }}
                        className="mt-1 hover:scale-110 transition-transform"
                        title="שנה סטטוס"
                      >
                        <StatusIcon className={`w-5 h-5 ${
                          task.status === 'הושלמה' ? 'text-green-600' : 'text-slate-400'
                        }`} />
                      </button>

                      {/* Task content */}
                      <div className="flex-1 min-w-0">
                        <h4 className={`font-semibold text-slate-900 mb-1 ${
                          task.status === 'הושלמה' ? 'line-through text-slate-500' : ''
                        }`}>
                          {task.title}
                        </h4>
                        
                        {task.description && (
                          <p className="text-sm text-slate-600 mb-2 line-clamp-2">
                            {task.description}
                          </p>
                        )}
                        
                        <div className="flex flex-wrap gap-2 items-center">
                          <Badge variant="outline" className={statusColors[task.status]}>
                            {task.status}
                          </Badge>
                          
                          {task.priority && (
                            <Badge variant="outline" className={priorityColors[task.priority]}>
                              {task.priority}
                            </Badge>
                          )}
                          
                          {task.due_date && (
                            <div className={`flex items-center gap-1 text-xs ${
                              urgency ? urgency.color : 'text-slate-600'
                            }`}>
                              <Calendar className="w-3 h-3" />
                              <span>{formatDueDate(task.due_date)}</span>
                              {urgency && <urgency.icon className="w-3 h-3" />}
                            </div>
                          )}
                          
                          {task.assigned_to && (
                            <div className="flex items-center gap-1 text-xs text-slate-600">
                              <User className="w-3 h-3" />
                              <span>{task.assigned_to}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenForm(task)}
                        className="h-8 w-8"
                        title="ערוך"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(task.id)}
                        className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                        title="מחק"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Task form dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ListTodo className="w-5 h-5 text-blue-600" />
              {editingTask ? 'עריכת משימה' : 'משימה חדשה'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>כותרת המשימה *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="לדוגמה: שיחת מעקב, שליחת הצעת מחיר..."
                required
              />
            </div>

            <div className="space-y-2">
              <Label>תיאור</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="פרטים נוספים על המשימה..."
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>סטטוס</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="חדשה">חדשה</SelectItem>
                    <SelectItem value="בתהליך">בתהליך</SelectItem>
                    <SelectItem value="הושלמה">הושלמה</SelectItem>
                    <SelectItem value="דחויה">דחויה</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>עדיפות</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => setFormData({ ...formData, priority: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="גבוהה">גבוהה</SelectItem>
                    <SelectItem value="בינונית">בינונית</SelectItem>
                    <SelectItem value="נמוכה">נמוכה</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>תאריך יעד</Label>
                <Input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>מוקצה ל</Label>
                <Input
                  value={formData.assigned_to}
                  onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                  placeholder="שם או מייל..."
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowForm(false)}
              >
                ביטול
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                {editingTask ? 'עדכן משימה' : 'צור משימה'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
