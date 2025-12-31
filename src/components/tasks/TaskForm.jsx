import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { base44 } from "@/api/base44Client";
import { Clock, Play, X } from "lucide-react";
import { playRingtone } from '@/components/utils/audio';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ReminderTimePicker from "./ReminderTimePicker";
import MultiRecipientSelector from "@/components/common/MultiRecipientSelector";
import MultiPhoneSelector from "@/components/common/MultiPhoneSelector";

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
    notify_whatsapp: false,
    notify_email: false,
    notify_audio: true,
    email_recipients: [],
    whatsapp_recipients: [],
    ...initialData
  });

  // Close dialog on Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onCancel]);

  const [user, setUser] = useState(null);
  const [customRingtones, setCustomRingtones] = useState([]);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const currentUser = await base44.auth.me();
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

  // Handler for client selection changes
  const handleClientChange = (newClientName) => {
    setFormData(prev => {
      const updatedFormData = { ...prev, client_name: newClientName };

      // Check if the current project is valid for the newly selected client
      // If client is "none", or if the previously selected project does not belong to the new client,
      // reset the project_name.
      const currentProjectName = updatedFormData.project_name;
      const selectedClientProjects = projects?.filter(p => p.client_name === newClientName) || [];
      const isCurrentProjectValidForNewClient = selectedClientProjects.some(p => p.name === currentProjectName);

      if (newClientName === "" || !isCurrentProjectValidForNewClient) {
        updatedFormData.project_name = "";
      }
      return updatedFormData;
    });
  };

  // Filter projects based on the selected client
  const filteredProjects = useMemo(() => {
    if (!projects || projects.length === 0) {
      return [];
    }
    if (formData.client_name) {
      return projects.filter(project => project.client_name === formData.client_name);
    }
    return projects; // If no client is selected, show all projects
  }, [projects, formData.client_name]);

  // Helper function to format time for display (not directly used here, but included as per outline)
  // eslint-disable-next-line no-unused-vars
  const formatTimeForDisplay = (hour, minute) => {
    const h = hour.toString().padStart(2, '0');
    const m = minute.toString().padStart(2, '0');
    return `${h}:${m}`;
  };

  // Helper function to set reminder time with specific hour/minute
  const setReminderTime = (hour, minute) => {
    let reminderDate;
    if (formData.due_date) {
      // Use the due date for the reminder date if available
      reminderDate = new Date(formData.due_date);
    } else if (formData.reminder_at) {
      // If no due date but a reminder_at exists, use that date
      reminderDate = new Date(formData.reminder_at);
    } else {
      // Default to tomorrow if neither due_date nor reminder_at is set
      reminderDate = new Date();
      reminderDate.setDate(reminderDate.getDate() + 1); 
    }
    reminderDate.setHours(hour, minute, 0, 0);
    // use local datetime format expected by input[type=datetime-local]
    const pad = (n) => String(n).padStart(2, "0");
    const toLocal = (d) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    updateField('reminder_at', toLocal(reminderDate));
  };

  // Quick time options - No longer used directly by DropdownMenu, but can be passed to ReminderTimePicker if needed.
  // Kept for now as it was in the original code, but the outline suggests it's not needed for this component.
  // The ReminderTimePicker component will handle its own quick times.
  const quickTimes = [
    { hour: 8, minute: 0, label: '08:00 בבוקר' },
    { hour: 9, minute: 0, label: '09:00 בבוקר' },
    { hour: 12, minute: 0, label: '12:00 צהריים' },
    { hour: 14, minute: 0, label: '14:00 אחה״צ' },
    { hour: 16, minute: 0, label: '16:00 אחה״צ' },
    { hour: 18, minute: 0, label: '18:00 ערב' },
    { hour: 20, minute: 0, label: '20:00 ערב' },
  ];

  // Sync to Reminder entity for backend processing (Email/WhatsApp)
  const syncToReminderEntity = async (taskData, createdTaskId) => {
    if ((taskData.notify_email || taskData.notify_whatsapp) && taskData.reminder_at && taskData.reminder_enabled) {
      try {
        const user = await base44.auth.me();
        await base44.entities.Reminder.create({
          target_type: 'task',
          target_id: createdTaskId || taskData.id,
          target_name: taskData.title,
          reminder_date: taskData.reminder_at,
          created_by_email: user.email,
          status: 'pending',
          notify_whatsapp: taskData.notify_whatsapp,
          notify_email: taskData.notify_email,
          message: `תזכורת למשימה: ${taskData.title}\nפרויקט: ${taskData.project_name || '-'}\nלקוח: ${taskData.client_name || '-'}`
        });
      } catch (e) {
        console.error("Failed to create backend reminder:", e);
      }
    }
  };

  const handleFormSubmit = async (data) => {
    // If creating a new task, we need to wait for ID to create Reminder
    // But onSubmit usually handles the API call. 
    // We can't intercept the ID here easily unless onSubmit returns it.
    // Assuming onSubmit returns the created object or we handle it inside onSubmit wrapper in parent.
    // However, to keep it simple, we'll modify the data passed to onSubmit, and assume the parent or backend handles logic,
    // OR we trigger the sync here if it's an update.
    
    // Actually, for TaskForm, the parent (Tasks.js or similar) calls the API. 
    // We can't create the Reminder entity here for a NEW task without the ID.
    // So we will just pass the flags to the Task entity (which we did by adding fields to Task.json).
    // The backend `checkReminders` function currently queries `Reminder` entity.
    // **SOLUTION**: I will update `checkReminders` to ALSO query `Task` entity directly for pending reminders.
    // This is much cleaner than syncing two entities.
    onSubmit(data);
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-2xl text-right max-h-[90vh] p-0 flex flex-col gap-0" dir="rtl">
        <DialogHeader className="px-8 py-6 border-b border-[#D4AF37]/20 shrink-0 bg-gradient-to-r from-amber-50/50 to-transparent">
          <DialogTitle className="text-2xl font-serif text-[#8B6E15]">{task ? 'עריכת משימה' : 'יצירת משימה חדשה'}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-5 scrollbar-thin scrollbar-thumb-[#D4AF37]/50 scrollbar-track-transparent">
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
                  {clients?.map(client => (
                    <SelectItem key={client.id} value={client.name}>{client.name}</SelectItem>
                  ))}
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
                  {filteredProjects.map(project => (
                    <SelectItem key={project.id} value={project.name}>{project.name}</SelectItem>
                  ))}
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

          {/* תזכורות מרובות וחזרתיות */}
          <div className="mt-2 p-3 rounded-lg border bg-slate-50 space-y-4">
            <div className="flex items-center justify-between">
              <Label className="font-semibold text-base">תזכורות וחזרתיות</Label>
              <Button type="button" variant="outline" size="sm" onClick={() => {
                const newReminder = { 
                  reminder_at: formData.due_date ? `${formData.due_date}T09:00` : new Date().toISOString(),
                  notify_popup: true,
                  notify_audio: true,
                  notify_email: false, 
                  notify_whatsapp: false,
                  notify_sms: false
                };
                updateField('reminders', [...(formData.reminders || []), newReminder]);
              }}>
                <Clock className="w-4 h-4 ml-2" />
                הוסף תזכורת
              </Button>
            </div>

            {/* Recurrence */}
            <div className="bg-white p-3 rounded border border-indigo-100">
              <div className="flex items-center gap-2 mb-2">
                <Switch 
                  checked={formData.recurrence?.enabled} 
                  onCheckedChange={(v) => updateField('recurrence', { ...formData.recurrence, enabled: v })} 
                />
                <Label>משימה חוזרת</Label>
              </div>
              
              {formData.recurrence?.enabled && (
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <div>
                    <Label className="text-xs">תדירות</Label>
                    <Select 
                      value={formData.recurrence?.frequency || 'weekly'} 
                      onValueChange={(v) => updateField('recurrence', { ...formData.recurrence, frequency: v })}
                    >
                      <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">יומי</SelectItem>
                        <SelectItem value="weekly">שבועי</SelectItem>
                        <SelectItem value="monthly">חודשי</SelectItem>
                        <SelectItem value="yearly">שנתי</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">תאריך סיום (אופציונלי)</Label>
                    <Input 
                      type="date" 
                      className="h-8" 
                      value={formData.recurrence?.end_date || ''}
                      onChange={(e) => updateField('recurrence', { ...formData.recurrence, end_date: e.target.value })}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Reminders List */}
            {formData.reminders?.length > 0 && (
              <div className="space-y-3">
                {formData.reminders.map((reminder, idx) => (
                  <div key={idx} className="bg-white p-3 rounded border border-slate-200 shadow-sm relative group">
                    <button 
                      onClick={() => {
                        const newReminders = formData.reminders.filter((_, i) => i !== idx);
                        updateField('reminders', newReminders);
                      }}
                      className="absolute top-2 left-2 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs mb-1 block">זמן התזכורת</Label>
                        <Input 
                          type="datetime-local" 
                          className="h-8 text-xs"
                          value={reminder.reminder_at || ''}
                          onChange={(e) => {
                            const newReminders = [...formData.reminders];
                            newReminders[idx] = { ...newReminders[idx], reminder_at: e.target.value };
                            updateField('reminders', newReminders);
                          }}
                        />
                      </div>
                      
                      <div>
                        <Label className="text-xs mb-1 block">ערוצי שליחה</Label>
                        <div className="flex gap-2">
                          <div className={`p-1.5 rounded cursor-pointer border ${reminder.notify_popup ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-transparent'}`}
                               onClick={() => {
                                 const newReminders = [...formData.reminders];
                                 newReminders[idx].notify_popup = !newReminders[idx].notify_popup;
                                 updateField('reminders', newReminders);
                               }}>
                            <span className="text-xs">פופ־אפ</span>
                          </div>
                          <div className={`p-1.5 rounded cursor-pointer border ${reminder.notify_whatsapp ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-transparent'}`}
                               onClick={() => {
                                 const newReminders = [...formData.reminders];
                                 newReminders[idx].notify_whatsapp = !newReminders[idx].notify_whatsapp;
                                 updateField('reminders', newReminders);
                               }}>
                            <span className="text-xs">WhatsApp</span>
                          </div>
                          <div className={`p-1.5 rounded cursor-pointer border ${reminder.notify_email ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-transparent'}`}
                               onClick={() => {
                                 const newReminders = [...formData.reminders];
                                 newReminders[idx].notify_email = !newReminders[idx].notify_email;
                                 updateField('reminders', newReminders);
                               }}>
                            <span className="text-xs">מייל</span>
                          </div>
                          <div className={`p-1.5 rounded cursor-pointer border ${reminder.notify_sms ? 'bg-purple-50 border-purple-200' : 'bg-slate-50 border-transparent'}`}
                               onClick={() => {
                                 const newReminders = [...formData.reminders];
                                 newReminders[idx].notify_sms = !newReminders[idx].notify_sms;
                                 updateField('reminders', newReminders);
                               }}>
                            <span className="text-xs">SMS</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {(formData.reminders?.some(r => r.notify_email) || formData.reminders?.some(r => r.notify_whatsapp) || formData.reminders?.some(r => r.notify_sms)) && (
               <div className="space-y-3 pt-2 border-t mt-2">
                 {formData.reminders.some(r => r.notify_email) && (
                    <div>
                      <Label className="text-xs mb-1">נמענים למייל</Label>
                      <MultiRecipientSelector
                        recipients={formData.email_recipients || []}
                        onChange={(v) => updateField('email_recipients', v)}
                        clients={clients}
                      />
                    </div>
                 )}
                 {formData.reminders.some(r => r.notify_whatsapp) && (
                    <div>
                      <Label className="text-xs mb-1">נמענים ל-WhatsApp</Label>
                      <MultiPhoneSelector
                        recipients={formData.whatsapp_recipients || []}
                        onChange={(v) => updateField('whatsapp_recipients', v)}
                        clients={clients}
                      />
                    </div>
                 )}
                 {formData.reminders.some(r => r.notify_sms) && (
                    <div>
                      <Label className="text-xs mb-1">נמענים ל-SMS</Label>
                      <MultiPhoneSelector
                        recipients={formData.sms_recipients || []}
                        onChange={(v) => updateField('sms_recipients', v)}
                        clients={clients}
                      />
                    </div>
                 )}
               </div>
            )}
          </div>

          {/* תגיות */}
          <div className="space-y-2">
            <Label>תגיות (הפרד בפסיקים)</Label>
            <Input
              value={formData.tags?.join(', ') || ''}
              onChange={(e) => setFormData({ 
                ...formData, 
                tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean)
              })}
              placeholder="דחוף, חשוב, פגישה..."
            />
            <div className="flex flex-wrap gap-1 mt-2">
              {['דחוף', 'חשוב', 'פגישה', 'מסמכים', 'תשלום', 'מעקב', 'אישור'].map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    const currentTags = formData.tags || [];
                    if (currentTags.includes(tag)) {
                      setFormData({ ...formData, tags: currentTags.filter(t => t !== tag) });
                    } else {
                      setFormData({ ...formData, tags: [...currentTags, tag] });
                    }
                  }}
                  className={`text-xs px-2 py-1 rounded-full transition-colors ${
                    formData.tags?.includes(tag)
                      ? 'bg-blue-500 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  #{tag}
                </button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter className="px-6 py-4 border-t border-slate-100 shrink-0 bg-slate-50/50 rounded-b-2xl">
          <Button variant="outline" onClick={onCancel}>ביטול</Button>
          <Button onClick={() => handleFormSubmit(formData)}>שמור משימה</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}