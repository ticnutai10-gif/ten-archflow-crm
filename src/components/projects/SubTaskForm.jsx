import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function SubTaskForm({ projectId, projectName, subtask, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assigned_to: [],
    status: 'לא התחיל',
    priority: 'בינונית',
    start_date: '',
    end_date: '',
    estimated_hours: 0,
    progress: 0,
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
                </SelectContent>
              </Select>
            </div>
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