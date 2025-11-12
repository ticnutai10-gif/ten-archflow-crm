import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { User } from '@/entities/User';
import ReminderTimePicker from "./ReminderTimePicker";

export default function TaskForm({ task, clients, projects, onSubmit, onCancel, initialData = {} }) {
  const [formData, setFormData] = useState(task || {
    title: '',
    description: '',
    project_name: '',
    client_name: '',
    status: 'חדשה',
    priority: 'בינונית',
    due_date: '',
    category: 'אחר',
    reminder_enabled: false,
    reminder_at: '',
    reminder_ringtone: 'ding',
    reminder_popup: true,
    ...initialData
  });

  const [user, setUser] = useState(null);
  const [customRingtones, setCustomRingtones] = useState([]);

  // ✅ הגנה מלאה על clients prop
  const safeClients = useMemo(() => {
    if (!clients) {
      console.warn('⚠️ [TaskForm] clients is null/undefined');
      return [];
    }
    if (!Array.isArray(clients)) {
      console.error('❌ [TaskForm] clients is not an array!', {
        type: typeof clients,
        value: clients
      });
      return [];
    }
    const valid = clients.filter(c => c && typeof c === 'object' && c.name);
    console.log('✅ [TaskForm] safeClients:', valid.length);
    return valid;
  }, [clients]);

  // ✅ הגנה מלאה על projects prop
  const safeProjects = useMemo(() => {
    if (!projects) {
      console.warn('⚠️ [TaskForm] projects is null/undefined');
      return [];
    }
    if (!Array.isArray(projects)) {
      console.error('❌ [TaskForm] projects is not an array!', {
        type: typeof projects,
        value: projects
      });
      return [];
    }
    const valid = projects.filter(p => p && typeof p === 'object' && p.name);
    console.log('✅ [TaskForm] safeProjects:', valid.length);
    return valid;
  }, [projects]);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const currentUser = await User.me();
        setUser(currentUser);
        setCustomRingtones(currentUser.custom_ringtones || []);
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    };
    
    loadUserData();
  }, []);

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleClientChange = (newClientName) => {
    setFormData(prev => {
      const updatedFormData = { ...prev, client_name: newClientName };

      const currentProjectName = updatedFormData.project_name;
      const selectedClientProjects = safeProjects.filter(p => p.client_name === newClientName);
      const isCurrentProjectValidForNewClient = selectedClientProjects.some(p => p.name === currentProjectName);

      if (newClientName === "" || !isCurrentProjectValidForNewClient) {
        updatedFormData.project_name = "";
      }
      return updatedFormData;
    });
  };

  // ✅ Filter projects based on the selected client - with protection
  const filteredProjects = useMemo(() => {
    if (safeProjects.length === 0) {
      return [];
    }
    if (formData.client_name) {
      return safeProjects.filter(project => project.client_name === formData.client_name);
    }
    return safeProjects;
  }, [safeProjects, formData.client_name]);

  const setReminderTime = (hour, minute) => {
    let reminderDate;
    if (formData.due_date) {
      reminderDate = new Date(formData.due_date);
    } else if (formData.reminder_at) {
      reminderDate = new Date(formData.reminder_at);
    } else {
      reminderDate = new Date();
      reminderDate.setDate(reminderDate.getDate() + 1); 
    }
    reminderDate.setHours(hour, minute, 0, 0);
    const pad = (n) => String(n).padStart(2, "0");
    const toLocal = (d) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    updateField('reminder_at', toLocal(reminderDate));
  };

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-lg text-right" dir="rtl">
        <DialogHeader>
          <DialogTitle>{task ? 'עריכת' : 'יצירת'} משימה</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>כותרת</Label>
            <Input value={formData.title} onChange={(e) => updateField('title', e.target.value)} />
          </div>
          
          <div className="space-y-2">
            <Label>תיאור</Label>
            <Textarea value={formData.description} onChange={(e) => updateField('description', e.target.value)} />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>לקוח</Label>
              <Select value={formData.client_name || "none"} onValueChange={(value) => handleClientChange(value === "none" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="בחר לקוח" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">ללא לקוח</SelectItem>
                  {safeClients.length === 0 ? (
                    <SelectItem value={null} disabled>אין לקוחות זמינים</SelectItem>
                  ) : (
                    safeClients.map(client => (
                      <SelectItem key={client.id} value={client.name}>{client.name}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>פרויקט</Label>
              <Select value={formData.project_name || "none"} onValueChange={(value) => setFormData({...formData, project_name: value === "none" ? "" : value})}>
                <SelectTrigger>
                  <SelectValue placeholder="בחר פרויקט" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">ללא פרויקט</SelectItem>
                  {filteredProjects.length === 0 ? (
                    <SelectItem value={null} disabled>אין פרויקטים זמינים</SelectItem>
                  ) : (
                    filteredProjects.map(project => (
                      <SelectItem key={project.id} value={project.name}>{project.name}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>סטטוס</Label>
              <Select value={formData.status} onValueChange={(v) => updateField('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
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
              <Select value={formData.priority} onValueChange={(v) => updateField('priority', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="גבוהה">גבוהה</SelectItem>
                  <SelectItem value="בינונית">בינונית</SelectItem>
                  <SelectItem value="נמוכה">נמוכה</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>קטגוריה</Label>
              <Select value={formData.category} onValueChange={(v) => updateField('category', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="פגישה">פגישה</SelectItem>
                  <SelectItem value="תכנון">תכנון</SelectItem>
                  <SelectItem value="היתרים">היתרים</SelectItem>
                  <SelectItem value="קניות">קניות</SelectItem>
                  <SelectItem value="מעקב">מעקב</SelectItem>
                  <SelectItem value="אחר">אחר</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>תאריך יעד</Label>
            <Input type="date" value={formData.due_date} onChange={(e) => updateField('due_date', e.target.value)} />
          </div>

          <div className="mt-2 p-3 rounded-lg border bg-slate-50 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="font-semibold">תזכורת</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600">מופעל</span>
                <Switch checked={!!formData.reminder_enabled} onCheckedChange={(v) => updateField('reminder_enabled', v)} />
              </div>
            </div>

            {formData.reminder_enabled && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>מועד התזכורת</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="datetime-local"
                      value={formData.reminder_at || ''}
                      onChange={(e) => updateField('reminder_at', e.target.value)}
                      className="flex-1"
                    />
                    <ReminderTimePicker
                      value={formData.reminder_at}
                      baseDate={formData.due_date}
                      onChange={(v) => updateField('reminder_at', v)}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>רינגטון</Label>
                  <Select
                    value={formData.reminder_ringtone}
                    onValueChange={(v) => updateField('reminder_ringtone', v)}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ding">צלצול קלאסי</SelectItem>
                      <SelectItem value="chime">פעמונים</SelectItem>
                      <SelectItem value="alarm">אזעקה</SelectItem>
                      {customRingtones.map(ringtone => (
                        <SelectItem key={ringtone.id} value={`custom_${ringtone.id}`}>
                          🎵 {ringtone.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {customRingtones.length === 0 && (
                    <p className="text-xs text-blue-600">
                      💡 ניתן להוסיף רינגטונים מותאמים אישית בעמוד ההגדרות
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label>פופ־אפ</Label>
                  <div className="flex items-center gap-2 h-10">
                    <Switch
                      checked={!!formData.reminder_popup}
                      onCheckedChange={(v) => updateField('reminder_popup', v)}
                    />
                    <span className="text-sm text-slate-600">הצג חלונית קופצת בזמן התזכורת</span>
                  </div>
                </div>
              </div>
            )}
            <p className="text-xs text-slate-500">
              טיפ: אפשר גם להדליק/לכבות תזכורת ישירות מכפתור התפריט בכל משימה (איקון פעמון).
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>ביטול</Button>
          <Button onClick={() => onSubmit(formData)}>שמור משימה</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}