import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Bell, Mail, Smartphone, Sparkles, Play } from "lucide-react";
import { playRingtone } from '@/components/utils/audio';
import SmartAgendaGenerator from "../ai/SmartAgendaGenerator";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import MultiRecipientSelector from "@/components/common/MultiRecipientSelector";
import MultiPhoneSelector from "@/components/common/MultiPhoneSelector";

export default function MeetingForm({ meeting, clients, projects, initialDate, onSubmit, onCancel }) {
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
    reminders: [
      { minutes_before: 60, method: 'in-app', sent: false }
    ],
    notes: '',
    agenda: [],
    color: 'blue',
    email_recipients: [],
    whatsapp_recipients: []
  });

  const [newParticipant, setNewParticipant] = useState('');
  const [newAgendaItem, setNewAgendaItem] = useState('');
  const [showSmartSuggestion, setShowSmartSuggestion] = useState(false);

  // Smart reminder suggestion for new meetings
  useEffect(() => {
    if (!meeting && !showSmartSuggestion) {
      setTimeout(() => setShowSmartSuggestion(true), 500);
    }
  }, [meeting, showSmartSuggestion]);

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

  const addReminder = () => {
    const newReminder = { 
      minutes_before: 60, 
      notify_popup: true,
      notify_audio: true,
      notify_email: false,
      notify_whatsapp: false,
      audio_ringtone: 'ding',
      sent: false 
    };
    updateField('reminders', [...(formData.reminders || []), newReminder]);
  };

  const removeReminder = (index) => {
    updateField('reminders', formData.reminders.filter((_, i) => i !== index));
  };

  const updateReminder = (index, field, value) => {
    const updated = [...formData.reminders];
    updated[index] = { ...updated[index], [field]: value };
    updateField('reminders', updated);
  };

  const applySmartReminders = () => {
    const smartReminders = [
      { minutes_before: 1440, method: 'email', sent: false }, // יום לפני
      { minutes_before: 60, method: 'both', sent: false }, // שעה לפני
      { minutes_before: 15, method: 'in-app', sent: false } // 15 דקות לפני
    ];
    updateField('reminders', smartReminders);
    setShowSmartSuggestion(false);
    toast.success('הוגדרו תזכורות חכמות!');
  };

  const filteredProjects = projects?.filter(p => p.client_name === formData.client_name) || [];

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] p-0 flex flex-col gap-0" dir="rtl">
        <DialogHeader className="px-8 py-6 border-b border-[#D4AF37]/20 shrink-0 bg-gradient-to-r from-amber-50/50 to-transparent">
          <DialogTitle className="text-2xl font-serif text-[#8B6E15]">{meeting ? 'עריכת פגישה' : 'יצירת פגישה חדשה'}</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-5 scrollbar-thin scrollbar-thumb-[#D4AF37]/50 scrollbar-track-transparent">
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
            <div className="flex items-center justify-between mb-2">
              <Label>סדר יום</Label>
              {(formData.client_name || formData.project_name) && (
                <div className="w-64">
                  <SmartAgendaGenerator
                    clientId={clients?.find(c => c.name === formData.client_name)?.id}
                    projectId={projects?.find(p => p.name === formData.project_name)?.id}
                    onAgendaGenerated={(items) => setFormData(prev => ({ ...prev, agenda: items }))}
                  />
                </div>
              )}
            </div>
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

          {/* Smart Reminder Suggestion */}
          {showSmartSuggestion && !meeting && (
            <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-purple-600 mt-1 flex-shrink-0" />
                <div className="flex-1">
                  <h4 className="font-semibold text-purple-900 mb-1">💡 הצעה חכמה</h4>
                  <p className="text-sm text-purple-700 mb-3">
                    נוסיף לך תזכורות בזמנים אופטימליים? יום לפני במייל, שעה לפני בשתי דרכים, ו-15 דקות לפני באפליקציה.
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={applySmartReminders} className="bg-purple-600 hover:bg-purple-700">
                      כן, תודה!
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setShowSmartSuggestion(false)}>
                      לא, תודה
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Reminders */}
          <div className="p-4 bg-slate-50 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">תזכורות מותאמות</Label>
              <Button type="button" size="sm" onClick={addReminder} variant="outline">
                <Plus className="w-4 h-4 ml-1" />
                הוסף תזכורת
              </Button>
            </div>
            
            {/* Email Recipients for all reminders */}
            <div className="space-y-4 mb-4">
              <div className="space-y-2 p-3 bg-white rounded border border-blue-100">
                <div className="flex items-center gap-2 mb-2">
                  <Mail className="w-4 h-4 text-blue-500" />
                  <Label>נמענים לתזכורות מייל</Label>
                </div>
                <MultiRecipientSelector
                  recipients={formData.email_recipients || []}
                  onChange={(newRecipients) => updateField('email_recipients', newRecipients)}
                  clients={clients}
                  placeholder="הוסף נמענים לתזכורות..."
                />
              </div>

              <div className="space-y-2 p-3 bg-white rounded border border-green-100">
                <div className="flex items-center gap-2 mb-2">
                  <Smartphone className="w-4 h-4 text-green-500" />
                  <Label>נמענים לתזכורות וואטסאפ</Label>
                </div>
                <MultiPhoneSelector
                  recipients={formData.whatsapp_recipients || []}
                  onChange={(newRecipients) => updateField('whatsapp_recipients', newRecipients)}
                  clients={clients}
                  placeholder="הוסף נמענים לוואטסאפ..."
                />
              </div>
            </div>
            
            {(!formData.reminders || formData.reminders.length === 0) && (
              <p className="text-sm text-slate-500">לא הוגדרו תזכורות. לחץ "הוסף תזכורת" כדי להוסיף.</p>
            )}

            <div className="space-y-3">
              {formData.reminders?.map((reminder, idx) => (
                <div key={idx} className="p-3 bg-white rounded border border-slate-200">
                  <div className="grid grid-cols-2 gap-3 mb-2">
                    <div className="space-y-1">
                      <Label className="text-xs">זמן תזכורת</Label>
                      <Select 
                        value={String(reminder.minutes_before)} 
                        onValueChange={(v) => updateReminder(idx, 'minutes_before', parseInt(v))}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">5 דקות לפני</SelectItem>
                          <SelectItem value="10">10 דקות לפני</SelectItem>
                          <SelectItem value="15">15 דקות לפני</SelectItem>
                          <SelectItem value="30">30 דקות לפני</SelectItem>
                          <SelectItem value="60">שעה לפני</SelectItem>
                          <SelectItem value="120">שעתיים לפני</SelectItem>
                          <SelectItem value="1440">יום לפני</SelectItem>
                          <SelectItem value="2880">יומיים לפני</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2 col-span-2">
                      <Label className="text-xs font-semibold">ערוצי התראה</Label>
                      <div className="flex flex-wrap gap-3 p-2 bg-slate-50 rounded border">
                        <div className="flex items-center gap-1.5">
                          <Switch 
                            checked={reminder.notify_popup} 
                            onCheckedChange={(v) => updateReminder(idx, 'notify_popup', v)} 
                            className="scale-75"
                          />
                          <span className="text-xs">פופ־אפ</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Switch 
                            checked={reminder.notify_audio} 
                            onCheckedChange={(v) => updateReminder(idx, 'notify_audio', v)} 
                            className="scale-75"
                          />
                          <span className="text-xs">קול</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Switch 
                            checked={reminder.notify_whatsapp} 
                            onCheckedChange={(v) => updateReminder(idx, 'notify_whatsapp', v)} 
                            className="scale-75"
                          />
                          <span className="text-xs">וואטסאפ</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Switch 
                            checked={reminder.notify_email} 
                            onCheckedChange={(v) => updateReminder(idx, 'notify_email', v)} 
                            className="scale-75"
                          />
                          <span className="text-xs">מייל</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Switch 
                            checked={reminder.notify_sms} 
                            onCheckedChange={(v) => updateReminder(idx, 'notify_sms', v)} 
                            className="scale-75"
                          />
                          <span className="text-xs">SMS</span>
                        </div>
                      </div>
                      
                      {reminder.notify_audio && (
                        <div className="mt-2 flex gap-2">
                          <div className="flex-1">
                            <Select 
                              value={reminder.audio_ringtone || 'ding'} 
                              onValueChange={(v) => updateReminder(idx, 'audio_ringtone', v)}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="בחר רינגטון" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ding">🔔 צלצול קלאסי</SelectItem>
                                <SelectItem value="chime">🔔 פעמונים</SelectItem>
                                <div className="p-1 px-2 text-xs font-semibold text-slate-500 bg-slate-50">מוזיקה קלאסית</div>
                                <SelectItem value="beethoven_5th">🎼 בטהובן - הסימפוניה ה-5</SelectItem>
                                <SelectItem value="vivaldi_spring">🎼 ויוואלדי - אביב</SelectItem>
                                <SelectItem value="mozart_night">🎼 מוצרט - מוזיקת לילה</SelectItem>
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
                            variant="ghost"
                            size="icon"
                            onClick={() => playRingtone(reminder.audio_ringtone || 'ding')}
                            title="השמע דוגמה"
                            className="h-8 w-8 shrink-0"
                          >
                            <Play className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      {reminder.method === 'in-app' && <Bell className="w-3 h-3" />}
                      {reminder.method === 'email' && <Mail className="w-3 h-3" />}
                      {reminder.method === 'both' && (
                        <>
                          <Bell className="w-3 h-3" />
                          <Mail className="w-3 h-3" />
                        </>
                      )}
                      {reminder.sent && (
                        <Badge variant="secondary" className="text-xs">נשלחה</Badge>
                      )}
                    </div>
                    
                    <Button 
                      type="button"
                      size="sm" 
                      variant="ghost" 
                      onClick={() => removeReminder(idx)}
                      className="h-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recurrence */}
          <div className="p-4 bg-slate-50 rounded-lg border border-indigo-100">
            <div className="flex items-center gap-2 mb-2">
              <Switch 
                checked={formData.recurrence?.enabled} 
                onCheckedChange={(v) => updateField('recurrence', { ...formData.recurrence, enabled: v })} 
              />
              <Label className="font-semibold">פגישה חוזרת</Label>
            </div>
            
            {formData.recurrence?.enabled && (
              <div className="grid grid-cols-2 gap-3 mt-2 bg-white p-3 rounded border">
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
        </div>

        <DialogFooter className="px-6 py-4 border-t border-slate-100 shrink-0 bg-slate-50/50 rounded-b-2xl">
          <Button variant="outline" onClick={onCancel}>ביטול</Button>
          <Button onClick={() => onSubmit(formData)}>
            {meeting ? 'עדכן' : 'צור'} פגישה
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}