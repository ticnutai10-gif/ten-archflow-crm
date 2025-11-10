import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, X } from "lucide-react";

export default function MeetingForm({ meeting, clients, projects, initialDate, onSubmit, onCancel }) {
  const getDefaultDate = () => {
    if (meeting?.meeting_date) return meeting.meeting_date;
    if (initialDate) {
      const d = new Date(initialDate);
      d.setHours(9, 0, 0, 0);
      return d.toISOString().slice(0, 16);
    }
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    return tomorrow.toISOString().slice(0, 16);
  };

  const [formData, setFormData] = useState(meeting || {
    title: '',
    description: '',
    client_name: '',
    project_name: '',
    meeting_date: getDefaultDate(),
    duration_minutes: 60,
    location: '',
    meeting_type: 'פגישת תכנון',
    status: 'מתוכננת',
    participants: [],
    reminder_enabled: true,
    reminder_before_minutes: 60,
    notes: '',
    agenda: [],
    color: 'blue'
  });

  const [newParticipant, setNewParticipant] = useState('');
  const [newAgendaItem, setNewAgendaItem] = useState('');

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addParticipant = () => {
    if (newParticipant.trim()) {
      updateField('participants', [...(formData.participants || []), newParticipant.trim()]);
      setNewParticipant('');
    }
  };

  const removeParticipant = (index) => {
    updateField('participants', formData.participants.filter((_, i) => i !== index));
  };

  const addAgendaItem = () => {
    if (newAgendaItem.trim()) {
      updateField('agenda', [...(formData.agenda || []), { item: newAgendaItem.trim(), completed: false }]);
      setNewAgendaItem('');
    }
  };

  const removeAgendaItem = (index) => {
    updateField('agenda', formData.agenda.filter((_, i) => i !== index));
  };

  const filteredProjects = projects?.filter(p => p.client_name === formData.client_name) || [];

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>{meeting ? 'עריכת' : 'יצירת'} פגישה</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <Label>כותרת הפגישה *</Label>
              <Input 
                value={formData.title} 
                onChange={(e) => updateField('title', e.target.value)}
                placeholder="לדוגמה: פגישת תכנון ראשונית"
              />
            </div>

            <div className="col-span-2 space-y-2">
              <Label>תיאור</Label>
              <Textarea 
                value={formData.description} 
                onChange={(e) => updateField('description', e.target.value)}
                placeholder="תיאור הפגישה ונושאים לדיון"
              />
            </div>

            <div className="space-y-2">
              <Label>לקוח</Label>
              <Select value={formData.client_name || "none"} onValueChange={(v) => updateField('client_name', v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="בחר לקוח" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">ללא לקוח</SelectItem>
                  {clients?.map(client => (
                    <SelectItem key={client.id} value={client.name}>{client.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>פרויקט</Label>
              <Select value={formData.project_name || "none"} onValueChange={(v) => updateField('project_name', v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="בחר פרויקט" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">ללא פרויקט</SelectItem>
                  {filteredProjects.map(project => (
                    <SelectItem key={project.id} value={project.name}>{project.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>תאריך ושעה *</Label>
              <Input 
                type="datetime-local"
                value={formData.meeting_date} 
                onChange={(e) => updateField('meeting_date', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>משך (בדקות)</Label>
              <Input 
                type="number"
                value={formData.duration_minutes} 
                onChange={(e) => updateField('duration_minutes', parseInt(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label>מיקום</Label>
              <Input 
                value={formData.location} 
                onChange={(e) => updateField('location', e.target.value)}
                placeholder="משרד / Zoom / אתר הפרויקט"
              />
            </div>

            <div className="space-y-2">
              <Label>סוג פגישה</Label>
              <Select value={formData.meeting_type} onValueChange={(v) => updateField('meeting_type', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="פגישת היכרות">פגישת היכרות</SelectItem>
                  <SelectItem value="פגישת תכנון">פגישת תכנון</SelectItem>
                  <SelectItem value="פגישת מעקב">פגישת מעקב</SelectItem>
                  <SelectItem value="פגישת סיכום">פגישת סיכום</SelectItem>
                  <SelectItem value="פגישת אתר">פגישת אתר</SelectItem>
                  <SelectItem value="שיחת טלפון">שיחת טלפון</SelectItem>
                  <SelectItem value="Zoom">Zoom</SelectItem>
                  <SelectItem value="אחר">אחר</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>סטטוס</Label>
              <Select value={formData.status} onValueChange={(v) => updateField('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="מתוכננת">מתוכננת</SelectItem>
                  <SelectItem value="אושרה">אושרה</SelectItem>
                  <SelectItem value="בוצעה">בוצעה</SelectItem>
                  <SelectItem value="בוטלה">בוטלה</SelectItem>
                  <SelectItem value="נדחתה">נדחתה</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>צבע בלוח השנה</Label>
              <Select value={formData.color} onValueChange={(v) => updateField('color', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="blue">🔵 כחול</SelectItem>
                  <SelectItem value="green">🟢 ירוק</SelectItem>
                  <SelectItem value="red">🔴 אדום</SelectItem>
                  <SelectItem value="yellow">🟡 צהוב</SelectItem>
                  <SelectItem value="purple">🟣 סגול</SelectItem>
                  <SelectItem value="pink">🌸 ורוד</SelectItem>
                  <SelectItem value="orange">🟠 כתום</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Participants */}
          <div className="space-y-2">
            <Label>משתתפים</Label>
            <div className="flex gap-2">
              <Input 
                value={newParticipant}
                onChange={(e) => setNewParticipant(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addParticipant())}
                placeholder="הוסף משתתף..."
              />
              <Button type="button" onClick={addParticipant} size="sm">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.participants?.map((participant, idx) => (
                <Badge key={idx} variant="secondary" className="gap-1">
                  {participant}
                  <button onClick={() => removeParticipant(idx)} className="ml-1">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          {/* Agenda */}
          <div className="space-y-2">
            <Label>סדר יום</Label>
            <div className="flex gap-2">
              <Input 
                value={newAgendaItem}
                onChange={(e) => setNewAgendaItem(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addAgendaItem())}
                placeholder="הוסף נושא לסדר היום..."
              />
              <Button type="button" onClick={addAgendaItem} size="sm">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-1 mt-2">
              {formData.agenda?.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 bg-slate-50 rounded">
                  <span className="flex-1">{item.item}</span>
                  <button onClick={() => removeAgendaItem(idx)} className="text-red-600 hover:text-red-700">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Reminder */}
          <div className="p-4 bg-slate-50 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <Label>תזכורת</Label>
              <Switch 
                checked={formData.reminder_enabled} 
                onCheckedChange={(v) => updateField('reminder_enabled', v)}
              />
            </div>
            {formData.reminder_enabled && (
              <div className="space-y-2">
                <Label>הזכר לפני (בדקות)</Label>
                <Select value={String(formData.reminder_before_minutes)} onValueChange={(v) => updateField('reminder_before_minutes', parseInt(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 דקות</SelectItem>
                    <SelectItem value="30">30 דקות</SelectItem>
                    <SelectItem value="60">שעה</SelectItem>
                    <SelectItem value="120">שעתיים</SelectItem>
                    <SelectItem value="1440">יום</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>ביטול</Button>
          <Button onClick={() => onSubmit(formData)}>
            {meeting ? 'עדכן' : 'צור'} פגישה
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}