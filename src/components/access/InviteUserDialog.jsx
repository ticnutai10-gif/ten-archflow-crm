import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Loader2 } from "lucide-react";
import { AccessControl } from "@/entities/all";
import { base44 } from "@/api/base44Client";
import { toast } from "react-hot-toast";

export default function InviteUserDialog({ open, onClose, onSuccess, clients = [] }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("staff");
  const [clientId, setClientId] = useState("");
  const [notes, setNotes] = useState("");
  const [sending, setSending] = useState(false);

  const handleInvite = async () => {
    if (!email) {
      toast.error('נא להזין כתובת אימייל');
      return;
    }

    setSending(true);
    try {
      // יצירת רשומת הרשאה
      const client = clients.find(c => c.id === clientId);
      await AccessControl.create({
        email,
        role,
        client_id: clientId || null,
        client_name: client?.name || null,
        active: true,
        notes
      });

      // שליחת מייל הזמנה
      await base44.integrations.Core.SendEmail({
        to: email,
        subject: "🎉 הוזמנת להצטרף ל-ArchFlow CRM",
        body: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; direction: rtl;">
            <h2 style="color: #2563eb;">ברוכים הבאים ל-ArchFlow CRM!</h2>
            <p>שלום,</p>
            <p>קיבלת הזמנה להצטרף למערכת ArchFlow CRM.</p>
            
            <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>תפקיד במערכת:</strong> ${getRoleLabel(role)}</p>
              ${client ? `<p><strong>לקוח משויך:</strong> ${client.name}</p>` : ''}
            </div>
            
            <p>
              <a href="${window.location.origin}" 
                 style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; 
                        text-decoration: none; border-radius: 6px; margin-top: 10px;">
                התחבר למערכת
              </a>
            </p>
            
            <p style="color: #64748b; font-size: 14px; margin-top: 20px;">
              במידה ויש לך שאלות, אנא פנה למנהל המערכת.
            </p>
          </div>
        `
      });

      toast.success('הזמנה נשלחה בהצלחה!');
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error sending invite:', error);
      toast.error('שגיאה בשליחת ההזמנה');
    } finally {
      setSending(false);
    }
  };

  const getRoleLabel = (role) => {
    const labels = {
      super_admin: 'מנהל על',
      admin: 'מנהל',
      manager_plus: 'מנהל פלוס',
      staff: 'עובד',
      client: 'לקוח'
    };
    return labels[role] || role;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            הזמן משתמש חדש
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="email">כתובת אימייל *</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="role">תפקיד במערכת *</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="staff">עובד</SelectItem>
                <SelectItem value="manager_plus">מנהל פלוס</SelectItem>
                <SelectItem value="admin">מנהל</SelectItem>
                <SelectItem value="super_admin">מנהל על</SelectItem>
                <SelectItem value="client">לקוח</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(role === 'staff' || role === 'client') && (
            <div>
              <Label htmlFor="client">שיוך ללקוח (אופציונלי)</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="בחר לקוח" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>ללא</SelectItem>
                  {clients.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label htmlFor="notes">הערות (אופציונלי)</Label>
            <Textarea
              id="notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={sending}>
            ביטול
          </Button>
          <Button onClick={handleInvite} disabled={sending} className="gap-2">
            {sending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                שולח...
              </>
            ) : (
              <>
                <Mail className="w-4 h-4" />
                שלח הזמנה
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}