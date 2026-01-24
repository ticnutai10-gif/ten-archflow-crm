import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { 
  Calendar, Clock, Mail, Plus, Trash2, Edit2, 
  CheckCircle2, AlertCircle, Settings
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { format, addDays, addWeeks, addMonths } from 'date-fns';
import { he } from 'date-fns/locale';

const DAYS_OF_WEEK = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

export default function ReportScheduleManager({ projectId, projectName }) {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [formData, setFormData] = useState({
    frequency: 'שבועי',
    day_of_week: 0,
    day_of_month: 1,
    recipients: [],
    include_client: true,
    include_team: false,
    active: true
  });
  const [newEmail, setNewEmail] = useState('');

  useEffect(() => {
    loadSchedules();
  }, [projectId]);

  const loadSchedules = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.ReportSchedule.filter({ project_id: projectId });
      setSchedules(data || []);
    } catch (error) {
      console.error('Error loading schedules:', error);
    }
    setLoading(false);
  };

  const calculateNextSend = (schedule) => {
    const now = new Date();
    let nextDate;

    if (schedule.frequency === 'שבועי') {
      const daysUntil = (schedule.day_of_week - now.getDay() + 7) % 7 || 7;
      nextDate = addDays(now, daysUntil);
    } else if (schedule.frequency === 'חודשי') {
      nextDate = new Date(now.getFullYear(), now.getMonth(), schedule.day_of_month);
      if (nextDate <= now) {
        nextDate = addMonths(nextDate, 1);
      }
    } else {
      // Quarterly
      const currentQuarter = Math.floor(now.getMonth() / 3);
      nextDate = new Date(now.getFullYear(), (currentQuarter + 1) * 3, schedule.day_of_month || 1);
    }

    return nextDate.toISOString();
  };

  const handleSave = async () => {
    try {
      const scheduleData = {
        ...formData,
        project_id: projectId,
        project_name: projectName,
        next_send: calculateNextSend(formData)
      };

      if (editingSchedule) {
        await base44.entities.ReportSchedule.update(editingSchedule.id, scheduleData);
        toast.success('התזמון עודכן');
      } else {
        await base44.entities.ReportSchedule.create(scheduleData);
        toast.success('התזמון נוצר בהצלחה');
      }

      setShowForm(false);
      setEditingSchedule(null);
      resetForm();
      loadSchedules();
    } catch (error) {
      console.error('Error saving schedule:', error);
      toast.error('שגיאה בשמירת התזמון');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('למחוק את התזמון?')) return;
    try {
      await base44.entities.ReportSchedule.delete(id);
      toast.success('התזמון נמחק');
      loadSchedules();
    } catch (error) {
      console.error('Error deleting schedule:', error);
    }
  };

  const toggleActive = async (schedule) => {
    try {
      await base44.entities.ReportSchedule.update(schedule.id, { 
        active: !schedule.active 
      });
      loadSchedules();
    } catch (error) {
      console.error('Error toggling schedule:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      frequency: 'שבועי',
      day_of_week: 0,
      day_of_month: 1,
      recipients: [],
      include_client: true,
      include_team: false,
      active: true
    });
  };

  const addEmail = () => {
    if (newEmail && !formData.recipients.includes(newEmail)) {
      setFormData({ ...formData, recipients: [...formData.recipients, newEmail] });
      setNewEmail('');
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          תזמון דוחות אוטומטיים
        </CardTitle>
        <Button size="sm" onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus className="w-4 h-4 ml-1" />
          תזמון חדש
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-slate-500">טוען...</div>
        ) : schedules.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 mb-4">לא הוגדרו תזמונים אוטומטיים</p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 ml-2" />
              הגדר תזמון ראשון
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {schedules.map(schedule => (
              <div 
                key={schedule.id} 
                className={`border rounded-lg p-4 ${schedule.active ? 'bg-white' : 'bg-slate-50 opacity-60'}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={
                        schedule.frequency === 'שבועי' ? 'bg-blue-100 text-blue-700' :
                        schedule.frequency === 'חודשי' ? 'bg-purple-100 text-purple-700' :
                        'bg-amber-100 text-amber-700'
                      }>
                        {schedule.frequency}
                      </Badge>
                      {schedule.active ? (
                        <Badge className="bg-green-100 text-green-700">
                          <CheckCircle2 className="w-3 h-3 ml-1" />
                          פעיל
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-slate-500">
                          מושהה
                        </Badge>
                      )}
                    </div>
                    
                    <div className="text-sm text-slate-600 space-y-1">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        {schedule.frequency === 'שבועי' 
                          ? `כל יום ${DAYS_OF_WEEK[schedule.day_of_week]}`
                          : `ה-${schedule.day_of_month} לחודש`
                        }
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        {schedule.recipients?.length || 0} נמענים
                      </div>
                      {schedule.next_send && (
                        <div className="flex items-center gap-2 text-blue-600">
                          <Calendar className="w-4 h-4" />
                          שליחה הבאה: {format(new Date(schedule.next_send), 'd/M/yyyy', { locale: he })}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={schedule.active}
                      onCheckedChange={() => toggleActive(schedule)}
                    />
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => {
                        setEditingSchedule(schedule);
                        setFormData({
                          frequency: schedule.frequency,
                          day_of_week: schedule.day_of_week || 0,
                          day_of_month: schedule.day_of_month || 1,
                          recipients: schedule.recipients || [],
                          include_client: schedule.include_client,
                          include_team: schedule.include_team,
                          active: schedule.active
                        });
                        setShowForm(true);
                      }}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="text-red-500"
                      onClick={() => handleDelete(schedule.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Schedule Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
              <h3 className="text-lg font-bold mb-4">
                {editingSchedule ? 'עריכת תזמון' : 'תזמון חדש'}
              </h3>

              <div className="space-y-4">
                <div>
                  <Label>תדירות</Label>
                  <Select 
                    value={formData.frequency} 
                    onValueChange={(val) => setFormData({ ...formData, frequency: val })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="שבועי">שבועי</SelectItem>
                      <SelectItem value="חודשי">חודשי</SelectItem>
                      <SelectItem value="רבעוני">רבעוני</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.frequency === 'שבועי' && (
                  <div>
                    <Label>יום בשבוע</Label>
                    <Select 
                      value={String(formData.day_of_week)} 
                      onValueChange={(val) => setFormData({ ...formData, day_of_week: parseInt(val) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DAYS_OF_WEEK.map((day, idx) => (
                          <SelectItem key={idx} value={String(idx)}>{day}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {(formData.frequency === 'חודשי' || formData.frequency === 'רבעוני') && (
                  <div>
                    <Label>יום בחודש</Label>
                    <Select 
                      value={String(formData.day_of_month)} 
                      onValueChange={(val) => setFormData({ ...formData, day_of_month: parseInt(val) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 28 }, (_, i) => (
                          <SelectItem key={i + 1} value={String(i + 1)}>{i + 1}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div>
                  <Label>נמענים</Label>
                  <div className="flex gap-2 mb-2">
                    <Input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="הוסף אימייל..."
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addEmail())}
                    />
                    <Button type="button" onClick={addEmail}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.recipients.map((email, idx) => (
                      <Badge key={idx} variant="secondary" className="flex items-center gap-1">
                        {email}
                        <button
                          onClick={() => setFormData({
                            ...formData,
                            recipients: formData.recipients.filter((_, i) => i !== idx)
                          })}
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Label>פעיל</Label>
                  <Switch
                    checked={formData.active}
                    onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end mt-6">
                <Button variant="outline" onClick={() => { setShowForm(false); setEditingSchedule(null); }}>
                  ביטול
                </Button>
                <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
                  {editingSchedule ? 'עדכן' : 'צור תזמון'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}