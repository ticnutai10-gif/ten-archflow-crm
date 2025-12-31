import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BellRing, Clock, X } from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";

export default function ReminderPopup({ open, reminders = [], onClose, onSnooze, onDismiss, onComplete }) {
  // בדיקה שהפרמטרים קיימים
  if (!Array.isArray(reminders)) {
    console.warn('[ReminderPopup] reminders is not an array:', reminders);
  }

  const validReminders = Array.isArray(reminders) ? reminders : [];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BellRing className="w-5 h-5 text-amber-500" />
            יש לך תזכורת!
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 max-h-80 overflow-auto">
          {validReminders.length === 0 ? (
            <div className="p-3 text-center text-slate-500">
              אין תזכורות להצגה
            </div>
          ) : (
            validReminders.map((t) => (
              <div key={t?.id || Math.random()} className="p-3 rounded-lg border bg-slate-50">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="font-semibold text-slate-900">{t?.title || 'תזכורת ללא כותרת'}</div>
                    <div className="text-sm text-slate-600">{t?.client_name || ''}</div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                      <Clock className="w-3 h-3" />
                      {t?.reminder_at ? format(new Date(t.reminder_at), "dd/MM/yyyy HH:mm", { locale: he }) : "עכשיו"}
                      {t?.priority && <Badge variant="outline" className="ml-2">{t.priority}</Badge>}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button 
                      size="sm" 
                      className="bg-emerald-600 hover:bg-emerald-700 text-white w-full"
                      onClick={() => onComplete && onComplete(t)}
                    >
                      סמן כהושלם
                    </Button>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => onSnooze && onSnooze(t, 10)}
                        className="flex-1"
                      >
                        דחה 10 דק׳
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => onSnooze && onSnooze(t, 60)}
                        className="flex-1"
                      >
                        דחה שעה
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => onSnooze && onSnooze(t, 'tomorrow')}
                        className="flex-1"
                      >
                        העבר למחר
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => onDismiss && onDismiss(t)}
                        className="flex-1 text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                      >
                        סגור
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            <X className="w-4 h-4 ml-2" />
            סגור
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}