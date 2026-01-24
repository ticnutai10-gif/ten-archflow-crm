import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { X, Plus, Trash2, AlertTriangle } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function SubTaskForm({ projectId, projectName, subtask, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assigned_to: [],
    status: 'לא התחיל',
    priority: 'בינונית',
    due_date: '',
    start_date: '',
    end_date: '',
    estimated_hours: 0,
    progress: 0,
    is_critical: false,
    subtasks: [],
    tags: [],
    ...subtask
  });
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const allUsers = await base44.entities.User.list();
      setUsers(allUsers || []);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit({
        ...formData,
        project_id: projectId,
        project_name: projectName
      });
    } catch (error) {
      console.error('Error saving subtask:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleUser = (email) => {
    setFormData(prev => ({
      ...prev,
      assigned_to: prev.assigned_to?.includes(email)
        ? prev.assigned_to.filter(e => e !== email)
        : [...(prev.assigned_to || []), email]
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" dir="rtl">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">
            {subtask ? 'עריכת תת-משימה' : 'תת-משימה חדשה'}
          </h2>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <Label>כותרת *</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              placeholder="שם המשימה"
            />
          </div>

          <div>
            <Label>תיאור</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="תיאור מפורט"
              rows={3}
            />
          </div>

          {/* Critical Task Toggle */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-red-50 border border-red-200">
            <Checkbox
              id="is_critical"
              checked={formData.is_critical}
              onCheckedChange={(checked) => setFormData({ ...formData, is_critical: checked })}
            />
            <label htmlFor="is_critical" className="flex items-center gap-2 cursor-pointer">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <span className="font-medium text-red-700">משימה קריטית</span>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>סטטוס</Label>
              <Select value={formData.status} onValueChange={(val) => setFormData({ ...formData, status: val })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="לא התחיל">לא התחיל</SelectItem>
                  <SelectItem value="בתהליך">בתהליך</SelectItem>
                  <SelectItem value="הושלם">הושלם</SelectItem>
                  <SelectItem value="ממתין">ממתין</SelectItem>
                  <SelectItem value="חסום">חסום</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>עדיפות</Label>
              <Select value={formData.priority} onValueChange={(val) => setFormData({ ...formData, priority: val })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="נמוכה">נמוכה</SelectItem>
                  <SelectItem value="בינונית">בינונית</SelectItem>
                  <SelectItem value="גבוהה">גבוהה</SelectItem>
                  <SelectItem value="דחופה">דחופה</SelectItem>
                  <SelectItem value="קריטית">קריטית</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Due Date - NEW */}
          <div>
            <Label>תאריך יעד</Label>
            <Input
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>תאריך התחלה</Label>
              <Input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              />
            </div>

            <div>
              <Label>תאריך סיום</Label>
              <Input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>שעות משוערות</Label>
              <Input
                type="number"
                min="0"
                value={formData.estimated_hours}
                onChange={(e) => setFormData({ ...formData, estimated_hours: parseFloat(e.target.value) })}
              />
            </div>

            <div>
              <Label>התקדמות (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={formData.progress}
                onChange={(e) => setFormData({ ...formData, progress: parseInt(e.target.value) })}
              />
            </div>
          </div>

          <div>
            <Label>משתמשים משוייכים</Label>
            <div className="border rounded-lg p-3 max-h-32 overflow-y-auto">
              {users.length === 0 ? (
                <p className="text-sm text-slate-500">אין משתמשים זמינים</p>
              ) : (
                <div className="space-y-2">
                  {users.map(user => (
                    <label key={user.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.assigned_to?.includes(user.email)}
                        onChange={() => toggleUser(user.email)}
                        className="rounded"
                      />
                      <span className="text-sm">{user.full_name || user.email}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Subtasks (Checklist) */}
          <div>
            <Label className="flex items-center justify-between">
              <span>תתי-משימות (צ'קליסט)</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  const newSubtask = {
                    id: `sub_${Date.now()}`,
                    title: '',
                    completed: false,
                    assigned_to: '',
                    due_date: ''
                  };
                  setFormData({
                    ...formData,
                    subtasks: [...(formData.subtasks || []), newSubtask]
                  });
                }}
              >
                <Plus className="w-4 h-4 ml-1" />
                הוסף
              </Button>
            </Label>
            <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
              {(formData.subtasks || []).length === 0 ? (
                <div className="p-3 text-center text-sm text-slate-500">
                  אין תתי-משימות
                </div>
              ) : (
                (formData.subtasks || []).map((sub, idx) => (
                  <div key={sub.id} className="p-2 flex items-center gap-2">
                    <Checkbox
                      checked={sub.completed}
                      onCheckedChange={(checked) => {
                        const updated = [...formData.subtasks];
                        updated[idx] = { ...sub, completed: checked };
                        setFormData({ ...formData, subtasks: updated });
                      }}
                    />
                    <Input
                      value={sub.title}
                      onChange={(e) => {
                        const updated = [...formData.subtasks];
                        updated[idx] = { ...sub, title: e.target.value };
                        setFormData({ ...formData, subtasks: updated });
                      }}
                      placeholder="כותרת תת-משימה"
                      className="flex-1 h-8 text-sm"
                    />
                    <Select
                      value={sub.assigned_to || ''}
                      onValueChange={(val) => {
                        const updated = [...formData.subtasks];
                        updated[idx] = { ...sub, assigned_to: val };
                        setFormData({ ...formData, subtasks: updated });
                      }}
                    >
                      <SelectTrigger className="w-32 h-8 text-xs">
                        <SelectValue placeholder="משתמש" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={null}>ללא</SelectItem>
                        {users.map(u => (
                          <SelectItem key={u.id} value={u.email}>
                            {u.full_name || u.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="date"
                      value={sub.due_date || ''}
                      onChange={(e) => {
                        const updated = [...formData.subtasks];
                        updated[idx] = { ...sub, due_date: e.target.value };
                        setFormData({ ...formData, subtasks: updated });
                      }}
                      className="w-32 h-8 text-xs"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-500 hover:text-red-600"
                      onClick={() => {
                        const updated = formData.subtasks.filter((_, i) => i !== idx);
                        setFormData({ ...formData, subtasks: updated });
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div>
            <Label>הערות</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="הערות נוספות"
              rows={2}
            />
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button type="button" variant="outline" onClick={onCancel}>
              ביטול
            </Button>
            <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
              {loading ? 'שומר...' : subtask ? 'עדכן' : 'צור משימה'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}