
import React, { useEffect, useState } from 'react';
import { Task, User } from '@/entities/all'; // Added User import
import { toast } from "sonner";
import ReminderPopup from "./ReminderPopup";
import { Bell } from "lucide-react";

function playTone(freq = 600, durationMs = 300, type = 'sine', volume = 0.2) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = volume;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    setTimeout(() => {
      osc.stop();
      ctx.close();
    }, durationMs);
  } catch (e) {
    // ignore audio errors
  }
}

async function playCustomRingtone(ringtoneId) {
  try {
    const user = await User.me();
    const customRingtones = user.custom_ringtones || [];
    const ringtone = customRingtones.find(r => r.id === ringtoneId);
    
    if (!ringtone) {
      console.error('Custom ringtone not found:', ringtoneId);
      playTone(660, 250, 'sine', 0.25); // fallback
      return;
    }
    
    const audio = new Audio(ringtone.url);
    audio.volume = 0.7;
    audio.play().catch(error => {
      console.error('Error playing custom ringtone:', error);
      playTone(660, 250, 'sine', 0.25); // fallback
    });
  } catch (error) {
    console.error('Error loading custom ringtone:', error);
    playTone(660, 250, 'sine', 0.25); // fallback
  }
}

function playRingtone(kind = 'ding') {
  // אם זה רינגטון מותאם אישית
  if (kind.startsWith('custom_')) {
    playCustomRingtone(kind.replace('custom_', ''));
    return;
  }

  // רינגטונים מוגדרים מראש
  if (kind === 'ding') {
    playTone(660, 250, 'sine', 0.25);
    setTimeout(() => playTone(880, 200, 'sine', 0.22), 260);
  } else if (kind === 'chime') {
    playTone(523, 200, 'triangle', 0.22);
    setTimeout(() => playTone(659, 250, 'triangle', 0.22), 220);
    setTimeout(() => playTone(784, 300, 'triangle', 0.22), 500);
  } else {
    // alarm
    for (let i = 0; i < 4; i++) {
      setTimeout(() => playTone(700, 200, 'square', 0.3), i * 300);
    }
  }
}

export default function ReminderManager() {
  const [open, setOpen] = useState(false);
  const [dueReminders, setDueReminders] = useState([]);
  const checkingRef = React.useRef(false);
  const cooldownRef = React.useRef(0); // timestamp until which we pause polling
  const backoffMsRef = React.useRef(120000); // start with 2 min backoff and grow on repeated 429s
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
    if (Date.now() < cooldownRef.current) return;

    // Only poll when tab is visible and user was active in the last 5 minutes
    if (typeof document !== "undefined") {
      if (document.visibilityState !== "visible") return;
    }
    if (Date.now() - lastActivityRef.current > 5 * 60 * 1000) return;

    checkingRef.current = true;
    try {
      // Limit size to reduce pressure
      const tasks = await Task.filter(
        { status: { $ne: 'הושלמה' }, reminder_enabled: true, reminder_sent: false },
        '-reminder_at',
        50
      );

      const now = new Date();
      const due = tasks.filter(t => {
        if (!t.reminder_at) return false;
        const at = new Date(t.reminder_at);
        return at <= now;
      });

      if (due.length > 0) {
        playRingtone(due[0].reminder_ringtone || 'ding');
        due.forEach(t => {
          toast.info(`תזכורת למשימה: ${t.title}`, {
            description: t.client_name ? `ללקוח: ${t.client_name}` : undefined,
            icon: <Bell className="w-4 h-4" />,
            duration: 8000,
          });
        });

        const withPopup = due.filter(t => t.reminder_popup);
        if (withPopup.length > 0) {
          setDueReminders(withPopup);
          setOpen(true);
        }

        for (const t of due) {
          await Task.update(t.id, { reminder_sent: true });
        }
      }

      // success – reset backoff
      backoffMsRef.current = 120000;
    } catch (err) {
      const status = err?.status || err?.response?.status;
      const msg = String(err?.message || err?.detail || "");
      const is429 = status === 429 || /429/.test(msg) || (/rate/i.test(msg) && /limit/i.test(msg));
      if (is429) {
        // Exponential backoff up to 30 minutes
        cooldownRef.current = Date.now() + backoffMsRef.current;
        backoffMsRef.current = Math.min(backoffMsRef.current * 2, 30 * 60 * 1000);
        console.warn(`ReminderManager rate limited. Cooling down for ${Math.round((cooldownRef.current - Date.now())/1000)}s. Next backoff: ${Math.round(backoffMsRef.current/1000)}s`);
      } else {
        console.error("checkReminders failed:", err);
      }
    } finally {
      checkingRef.current = false;
    }
  };

  const handleSnooze = async (task, minutes) => {
    const when = new Date(Date.now() + minutes * 60 * 1000).toISOString();
    await Task.update(task.id, { reminder_at: when, reminder_sent: false });
    setDueReminders(prev => prev.filter(x => x.id !== task.id));
    if (dueReminders.length <= 1) {
      setOpen(false);
    }
  };

  React.useEffect(() => {
    // Delay initial run with small jitter to avoid thundering herd
    const initialDelay = 8000 + Math.floor(Math.random() * 4000);
    const t = setTimeout(checkReminders, initialDelay);

    // Poll every 5 minutes (reduced frequency)
    const interval = setInterval(checkReminders, 5 * 60 * 1000);
    return () => {
      clearTimeout(t);
      clearInterval(interval);
    };
  }, []);
  
  return (
    <>
      <ReminderPopup
        open={open}
        reminders={dueReminders}
        onClose={() => setOpen(false)}
        onSnooze={handleSnooze}
      />
    </>
  );
}
