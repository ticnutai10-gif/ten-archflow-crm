import React, { useEffect, useState } from 'react';
import { Task, Meeting } from '@/entities/all';
import { toast } from "sonner";
import ReminderPopup from "./ReminderPopup";
import { Bell } from "lucide-react";
import { playRingtone } from '@/components/utils/audio';
import { base44 } from "@/api/base44Client";

export default function ReminderManager() {
  const [open, setOpen] = useState(false);
  const [dueReminders, setDueReminders] = useState([]);
  const checkingRef = React.useRef(false);
  const lastActivityRef = React.useRef(Date.now());

  // Track user activity to avoid polling when user is idle
  React.useEffect(() => {
    const bump = () => { lastActivityRef.current = Date.now(); };
    window.addEventListener('mousemove', bump);
    window.addEventListener('keydown', bump);
    window.addEventListener('click', bump);
    return () => {
      window.removeEventListener('mousemove', bump);
      window.removeEventListener('keydown', bump);
      window.removeEventListener('click', bump);
    };
  }, []);

  const checkReminders = async () => {
    if (checkingRef.current) return;
    
    // Only poll when tab is visible and user was active in the last 15 minutes
    if (typeof document !== "undefined") {
      if (document.visibilityState !== "visible") return;
    }
    if (Date.now() - lastActivityRef.current > 15 * 60 * 1000) return;

    checkingRef.current = true;
    try {
      const now = new Date();
      const popupReminders = [];

      // 1. Fetch Tasks (Legacy + New)
      // Filter locally for simplicity with complex array structures, though optimal to use backend filters
      const tasks = await base44.entities.Task.filter({ 
        status: { $ne: 'הושלמה' }
      });

      for (const t of tasks) {
        // Legacy
        if (t.reminder_enabled && !t.reminder_sent && t.reminder_at) {
          const at = new Date(t.reminder_at);
          if (at <= now) {
            popupReminders.push({
              id: t.id,
              type: 'task',
              title: t.title,
              client_name: t.client_name,
              message: `תזכורת למשימה: ${t.title}`,
              ringtone: t.reminder_ringtone || 'ding',
              isLegacy: true,
              entity: t
            });
          }
        }

        // New Array
        if (t.reminders && Array.isArray(t.reminders)) {
          t.reminders.forEach((r, idx) => {
            if (r.sent || r.popup_shown) return;
            if (!r.notify_popup && !r.reminder_popup) return; // Support both naming conventions if any

            let reminderTime;
            if (r.reminder_at) reminderTime = new Date(r.reminder_at);
            // Ignore minutes_before without base date logic for now in frontend to keep simple
            
            if (reminderTime && reminderTime <= now) {
              popupReminders.push({
                id: `${t.id}_${idx}`,
                entityId: t.id,
                type: 'task',
                title: t.title,
                client_name: t.client_name,
                message: `תזכורת למשימה: ${t.title}`,
                ringtone: r.audio_ringtone || 'ding',
                reminderIndex: idx,
                isLegacy: false,
                entity: t
              });
            }
          });
        }
      }

      // 2. Fetch Meetings
      const meetings = await base44.entities.Meeting.filter({
        status: { $in: ['מתוכננת', 'אושרה'] }
      });

      for (const m of meetings) {
        if (m.reminders && Array.isArray(m.reminders)) {
          const meetingDate = new Date(m.meeting_date);
          m.reminders.forEach((r, idx) => {
            if (r.sent || r.popup_shown) return;
            if (!r.notify_popup) return;

            const reminderTime = new Date(meetingDate.getTime() - (r.minutes_before || 0) * 60000);
            
            if (reminderTime <= now) {
              popupReminders.push({
                id: `${m.id}_${idx}`,
                entityId: m.id,
                type: 'meeting',
                title: m.title,
                client_name: m.client_name,
                message: `תזכורת לפגישה: ${m.title} (${r.minutes_before} דקות לפני)`,
                ringtone: r.audio_ringtone || 'ding',
                reminderIndex: idx,
                type_label: 'פגישה',
                entity: m
              });
            }
          });
        }
      }

      if (popupReminders.length > 0) {
        // Play Audio
        playRingtone(popupReminders[0].ringtone || 'ding');
        
        // Show Toasts
        popupReminders.forEach(r => {
          toast.info(r.message, {
            description: r.client_name ? `ללקוח: ${r.client_name}` : undefined,
            icon: <Bell className="w-4 h-4" />,
            duration: 8000,
          });
        });

        // Update State for Popup
        setDueReminders(prev => [...prev, ...popupReminders]);
        setOpen(true);

        // Mark as Shown in Backend
        for (const item of popupReminders) {
          if (item.type === 'task') {
            if (item.isLegacy) {
              await base44.entities.Task.update(item.entityId || item.id, { reminder_sent: true });
            } else {
              const t = item.entity;
              if (t.reminders[item.reminderIndex]) {
                t.reminders[item.reminderIndex].popup_shown = true;
                // If email/wa/sms not required OR already sent, we can mark fully sent
                const r = t.reminders[item.reminderIndex];
                if ((!r.notify_email || r.email_sent) && 
                    (!r.notify_whatsapp || r.whatsapp_sent) && 
                    (!r.notify_sms || r.sms_sent)) {
                  r.sent = true;
                }
                await base44.entities.Task.update(t.id, { reminders: t.reminders });
              }
            }
          } else if (item.type === 'meeting') {
            const m = item.entity;
            if (m.reminders[item.reminderIndex]) {
              m.reminders[item.reminderIndex].popup_shown = true;
              const r = m.reminders[item.reminderIndex];
              if ((!r.notify_email || r.email_sent) && 
                  (!r.notify_whatsapp || r.whatsapp_sent) && 
                  (!r.notify_sms || r.sms_sent)) {
                r.sent = true;
              }
              await base44.entities.Meeting.update(m.id, { reminders: m.reminders });
            }
          }
        }
      }

    } catch (err) {
      console.error("checkReminders frontend failed:", err);
    } finally {
      checkingRef.current = false;
    }
  };

  const handleDismiss = (item) => {
    setDueReminders(prev => prev.filter(x => x.id !== item.id));
    if (dueReminders.length <= 1) {
      setOpen(false);
    }
  };

  const handleComplete = async (item) => {
    handleDismiss(item);
    try {
      if (item.type === 'task') {
        await base44.entities.Task.update(item.entityId, { status: 'הושלמה' });
        toast.success("המשימה סומנה כהושלמה");
      } else if (item.type === 'meeting') {
        await base44.entities.Meeting.update(item.entityId, { status: 'בוצעה' });
        toast.success("הפגישה סומנה כבוצעה");
      }
    } catch (error) {
      console.error("Complete failed:", error);
      toast.error("שגיאה בעדכון הסטטוס");
    }
  };

  const handleSnooze = async (item, duration) => {
    // Optimistic UI update
    handleDismiss(item);

    try {
      const now = new Date();
      let snoozeTime;

      if (duration === 'tomorrow') {
        // Set to tomorrow at 09:00
        snoozeTime = new Date();
        snoozeTime.setDate(snoozeTime.getDate() + 1);
        snoozeTime.setHours(9, 0, 0, 0);
      } else {
        // Duration in minutes
        snoozeTime = new Date(now.getTime() + duration * 60000);
      }

      const entityType = item.type === 'task' ? 'Task' : 'Meeting';
      // Fetch fresh entity to ensure we have latest reminders array
      const entity = await base44.entities[entityType].get(item.entityId);
      
      if (entity && entity.reminders && entity.reminders[item.reminderIndex]) {
        const reminders = [...entity.reminders];
        const r = { ...reminders[item.reminderIndex] };
        
        // Update reminder to trigger again
        r.popup_shown = false;
        r.sent = false;
        r.reminder_at = snoozeTime.toISOString();
        
        // Remove minutes_before to prioritize absolute time
        delete r.minutes_before;
        
        reminders[item.reminderIndex] = r;
        
        await base44.entities[entityType].update(item.entityId, { reminders });
        
        const timeStr = duration === 'tomorrow' ? 'למחר ב-09:00' : `ב-${duration} דקות`;
        toast.success(`התזכורת נדחתה ${timeStr}`);
      }
    } catch (error) {
      console.error("Snooze failed:", error);
      toast.error("שגיאה בדחיית התזכורת");
    }
  };

  React.useEffect(() => {
    const t = setTimeout(checkReminders, 5000);
    // Poll every 1 minute for better responsiveness
    const interval = setInterval(checkReminders, 60 * 1000);
    return () => {
      clearTimeout(t);
      clearInterval(interval);
    };
  }, []);
  
  return (
    <ReminderPopup
      open={open}
      reminders={dueReminders}
      onClose={() => setOpen(false)}
      onSnooze={handleSnooze}
      onDismiss={handleDismiss}
      onComplete={handleComplete}
    />
  );
}