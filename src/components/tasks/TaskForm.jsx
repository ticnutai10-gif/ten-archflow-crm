import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { base44 } from "@/api/base44Client";
import { Clock, Play } from "lucide-react";
import { playRingtone } from '@/components/utils/audio';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ReminderTimePicker from "./ReminderTimePicker"; // Added import

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

          {/* תזכורות */}
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
                  {/* Replace absolute icon with inline button so it won't overlap ringtone section */}
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
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Select
                        value={formData.reminder_ringtone}
                        onValueChange={(v) => updateField('reminder_ringtone', v)}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ding">🔔 צלצול קלאסי</SelectItem>
                      <SelectItem value="chime">🔔 פעמונים</SelectItem>
                      <SelectItem value="alarm">🚨 אזעקה</SelectItem>
                      
                      <div className="p-1 px-2 text-xs font-semibold text-slate-500 bg-slate-50">מוזיקה קלאסית</div>
                      <SelectItem value="beethoven_5th">🎼 בטהובן - הסימפוניה ה-5</SelectItem>
                      <SelectItem value="vivaldi_spring">🎼 ויוואלדי - אביב</SelectItem>
                      <SelectItem value="mozart_night">🎼 מוצרט - מוזיקת לילה זעירה</SelectItem>
                      <SelectItem value="bach_cello">🎼 באך - סוויטת צ'לו</SelectItem>
                      <SelectItem value="tchaikovsky_sugar">🎼 צ'ייקובסקי - מפצח האגוזים</SelectItem>
                      <SelectItem value="brahms_lullaby">🎼 ברהמס - שיר ערש</SelectItem>
                      <SelectItem value="chopin_nocturne">🎼 שופן - נוקטורן</SelectItem>
                      <SelectItem value="debussy_clair">🎼 דביסי - לאור הירח</SelectItem>
                      <SelectItem value="pachelbel_canon">🎼 פכלבל - קאנון ברה מז'ור</SelectItem>
                      <SelectItem value="strauss_danube">🎼 שטראוס - הדנובה הכחולה</SelectItem>

                      {customRingtones.length > 0 && (
                        <>
                          <div className="p-1 px-2 text-xs font-semibold text-slate-500 bg-slate-50">מותאם אישית</div>
                          {customRingtones.map(ringtone => (
                            <SelectItem key={ringtone.id} value={`custom_${ringtone.id}`}>
                              🎵 {ringtone.name}
                            </SelectItem>
                          ))}
                        </>
                      )}
                    </SelectContent>
                  </Select>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => playRingtone(formData.reminder_ringtone)}
                      title="השמע דוגמה"
                      className="shrink-0"
                    >
                      <Play className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <Label>ערוצי תזכורת</Label>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between bg-white p-2 rounded border">
                      <span className="text-sm flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500"></div>הודעה באתר</span>
                      <Switch checked={!!formData.reminder_popup} onCheckedChange={(v) => updateField('reminder_popup', v)} />
                    </div>
                    <div className="flex items-center justify-between bg-white p-2 rounded border">
                      <span className="text-sm flex items-center gap-2">📢 תזכורת קולית</span>
                      <Switch checked={formData.notify_audio !== false} onCheckedChange={(v) => updateField('notify_audio', v)} />
                    </div>
                    <div className="flex items-center justify-between bg-white p-2 rounded border">
                      <span className="text-sm flex items-center gap-2">💬 וואטסאפ</span>
                      <Switch checked={!!formData.notify_whatsapp} onCheckedChange={(v) => updateField('notify_whatsapp', v)} />
                    </div>
                    <div className="flex items-center justify-between bg-white p-2 rounded border">
                      <span className="text-sm flex items-center gap-2">📧 אימייל</span>
                      <Switch checked={!!formData.notify_email} onCheckedChange={(v) => updateField('notify_email', v)} />
                    </div>
                  </div>
                </div>
              </div>
            )}
            <p className="text-xs text-slate-500">
              טיפ: אפשר גם להדליק/לכבות תזכורת ישירות מכפתור התפריט בכל משימה (איקון פעמון).
            </p>
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