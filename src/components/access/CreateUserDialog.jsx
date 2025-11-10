import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Loader2, UserPlus, AlertCircle } from "lucide-react";
import { AccessControl } from "@/entities/all";
import { toast } from "react-hot-toast";

export default function CreateUserDialog({ open, onClose, onSuccess }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("staff");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);

  const handleCreate = async () => {
    setError(null);
    
    if (!email) {
      setError('נא להזין כתובת אימייל');
      return;
    }

    if (!email.includes('@')) {
      setError('כתובת אימייל לא תקינה');
      return;
    }

    setCreating(true);
    try {
      console.log('🔐 [CREATE USER DIALOG] Creating user:', { email, role });

      // בדיקה אם האימייל כבר קיים
      const existing = await AccessControl.filter({ email: email.toLowerCase().trim() }).catch(() => []);
      if (existing && existing.length > 0) {
        throw new Error('האימייל כבר קיים במערכת');
      }

      await AccessControl.create({
        email: email.toLowerCase().trim(),
        role,
        active: true,
        assigned_clients: [],
        assigned_projects: [],
        notes: `נוצר ב-${new Date().toLocaleDateString('he-IL')}`
      });

      console.log('✅ [CREATE USER DIALOG] User created successfully');
      toast.success('משתמש נוסף בהצלחה!');
      onSuccess?.();
      onClose();
      
      setEmail("");
      setRole("staff");
    } catch (error) {
      console.error('❌ [CREATE USER DIALOG] Error:', error);
      const errorMsg = error.message || 'שגיאה ביצירת המשתמש';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]" dir="rtl">
        <DialogHeader className="text-right">
          <DialogTitle className="flex items-center gap-2 text-right">
            <UserPlus className="w-5 h-5" />
            הוספת משתמש חדש
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4" dir="rtl">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2" dir="rtl">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800 text-right">{error}</p>
            </div>
          )}

          <div className="space-y-2 text-right">
            <Label htmlFor="email" className="text-right">אימייל</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(null);
              }}
              className="text-right"
              dir="rtl"
            />
          </div>

          <div className="space-y-2 text-right">
            <Label htmlFor="role" className="text-right">תפקיד</Label>
            <Select value={role} onValueChange={setRole} dir="rtl">
              <SelectTrigger className="text-right">
                <SelectValue />
              </SelectTrigger>
              <SelectContent dir="rtl">
                <SelectItem value="super_admin">מנהל על</SelectItem>
                <SelectItem value="admin">מנהל</SelectItem>
                <SelectItem value="manager_plus">מנהל פלוס</SelectItem>
                <SelectItem value="staff">עובד</SelectItem>
                <SelectItem value="client">לקוח</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter dir="rtl">
          <div className="flex gap-2 justify-end w-full">
            <Button variant="outline" onClick={onClose} disabled={creating}>
              ביטול
            </Button>
            <Button onClick={handleCreate} disabled={creating || !email}>
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin ml-2" />
                  יוצר...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 ml-2" />
                  צור משתמש
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}