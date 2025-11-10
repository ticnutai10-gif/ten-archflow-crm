import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Clock, Mail } from "lucide-react";

const REPORT_TYPES = [
  { value: 'time_logs', label: 'רישומי זמן', icon: '⏱️' },
  { value: 'new_clients', label: 'לקוחות חדשים', icon: '👥' },
  { value: 'new_tasks', label: 'משימות חדשות', icon: '✅' },
  { value: 'new_projects', label: 'פרויקטים חדשים', icon: '🏗️' },
  { value: 'meetings', label: 'פגישות', icon: '📅' },
  { value: 'invoices', label: 'חשבוניות', icon: '💰' }
];

export default function ReportScheduleForm({ open, onClose, schedule, onSubmit }) {
  const [formData, setFormData] = useState({
    name: '',
    recipients: [],
    schedule_time: '20:00',
    report_types: [],
    active: true,
    send_on_weekends: false,
    include_summary: true
  });
  const [newRecipient, setNewRecipient] = useState('');

  useEffect(() => {
    if (schedule) {
      setFormData({
        name: schedule.name || '',
        recipients: schedule.recipients || [],
        schedule_time: schedule.schedule_time || '20:00',
        report_types: schedule.report_types || [],
        active: schedule.active ?? true,
        send_on_weekends: schedule.send_on_weekends ?? false,
        include_summary: schedule.include_summary ?? true
      });
    } else {
      setFormData({
        name: '',
        recipients: [],
        schedule_time: '20:00',
        report_types: [],
        active: true,
        send_on_weekends: false,
        include_summary: true
      });
    }
  }, [schedule, open]);

  const handleAddRecipient = () => {
    const email = newRecipient.trim();
    if (email && email.includes('@') && !formData.recipients.includes(email)) {
      setFormData({
        ...formData,
        recipients: [...formData.recipients, email]
      });
      setNewRecipient('');
    }
  };

  const handleRemoveRecipient = (email) => {
    setFormData({
      ...formData,
      recipients: formData.recipients.filter(r => r !== email)
    });
  };

  const toggleReportType = (type) => {
    const types = formData.report_types.includes(type)
      ? formData.report_types.filter(t => t !== type)
      : [...formData.report_types, type];
    
    setFormData({ ...formData, report_types: types });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      alert('נא להזין שם לדוח');
      return;
    }
    
    if (formData.recipients.length === 0) {
      alert('נא להוסיף לפחות נמען אחד');
      return;
    }
    
    if (formData.report_types.length === 0) {
      alert('נא לבחור לפחות סוג תוכן אחד');
      return;
    }
    
    onSubmit(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>
            {schedule ? 'עריכת דוח יומי' : 'דוח יומי חדש'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* שם הדוח */}
          <div className="space-y-2">
            <Label>שם הדוח *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="לדוגמה: סיכום יומי - צוות ניהול"
              className="text-right"
              dir="rtl"
            />
          </div>

          {/* שעת שליחה */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              שעת שליחה *
            </Label>
            <Input
              type="time"
              value={formData.schedule_time}
              onChange={(e) => setFormData({ ...formData, schedule_time: e.target.value })}
              className="text-right"
              dir="rtl"
            />
            <p className="text-xs text-slate-500 text-right">
              💡 הדוח ישלח אוטומטית כל יום בשעה זו
            </p>
          </div>

          {/* נמענים */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              נמענים *
            </Label>
            <div className="flex gap-2">
              <Input
                type="email"
                value={newRecipient}
                onChange={(e) => setNewRecipient(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddRecipient();
                  }
                }}
                placeholder="הוסף כתובת אימייל..."
                className="flex-1 text-right"
                dir="rtl"
              />
              <Button type="button" onClick={handleAddRecipient} variant="outline">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.recipients.map((email) => (
                <Badge key={email} variant="secondary" className="gap-1">
                  {email}
                  <button
                    type="button"
                    onClick={() => handleRemoveRecipient(email)}
                    className="hover:bg-slate-300 rounded-full"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          {/* סוגי תוכן */}
          <div className="space-y-2">
            <Label>סוגי תוכן לכלול בדוח *</Label>
            <div className="grid grid-cols-2 gap-3">
              {REPORT_TYPES.map((type) => (
                <div
                  key={type.value}
                  onClick={() => toggleReportType(type.value)}
                  className={`
                    flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all
                    ${formData.report_types.includes(type.value)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 hover:border-slate-300'
                    }
                  `}
                >
                  <Checkbox
                    checked={formData.report_types.includes(type.value)}
                    onCheckedChange={() => toggleReportType(type.value)}
                  />
                  <span className="text-2xl">{type.icon}</span>
                  <span className="font-medium">{type.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* אפשרויות נוספות */}
          <div className="space-y-3 border-t pt-4">
            <Label>אפשרויות נוספות</Label>
            
            <div className="flex items-center gap-3">
              <Checkbox
                checked={formData.send_on_weekends}
                onCheckedChange={(checked) => 
                  setFormData({ ...formData, send_on_weekends: checked })
                }
              />
              <Label className="cursor-pointer">
                שלח גם בסופי שבוע (שישי ושבת)
              </Label>
            </div>

            <div className="flex items-center gap-3">
              <Checkbox
                checked={formData.include_summary}
                onCheckedChange={(checked) => 
                  setFormData({ ...formData, include_summary: checked })
                }
              />
              <Label className="cursor-pointer">
                כלול סיכום כללי בראש הדוח
              </Label>
            </div>

            <div className="flex items-center gap-3">
              <Checkbox
                checked={formData.active}
                onCheckedChange={(checked) => 
                  setFormData({ ...formData, active: checked })
                }
              />
              <Label className="cursor-pointer">
                הדוח פעיל (ישלח אוטומטית)
              </Label>
            </div>
          </div>

          <DialogFooter dir="rtl">
            <Button type="button" variant="outline" onClick={onClose}>
              ביטול
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
              {schedule ? 'עדכן דוח' : 'צור דוח'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}