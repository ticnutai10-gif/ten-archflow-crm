import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Zap, Loader2 } from "lucide-react";
import { AccessControl } from "@/entities/all";
import { toast } from "react-hot-toast";
import { Card, CardContent } from "@/components/ui/card";

export default function QuickSetupDialog({ open, onClose, onSuccess, clients = [], projects = [] }) {
  const [email, setEmail] = useState("");
  const [template, setTemplate] = useState("full_access");
  const [creating, setCreating] = useState(false);

  const templates = {
    full_access: {
      label: "גישה מלאה",
      description: "גישה לכל הלקוחות והפרויקטים",
      role: "admin",
      icon: "👑"
    },
    staff_full: {
      label: "עובד - גישה מלאה",
      description: "גישה לכל הלקוחות והפרויקטים",
      role: "staff",
      icon: "👤"
    },
    staff_limited: {
      label: "עובד - גישה מוגבלת",
      description: "ללא גישה ללקוחות ופרויקטים (יש להגדיר ידנית)",
      role: "staff",
      icon: "👨‍💼"
    },
    manager: {
      label: "מנהל פרויקטים",
      description: "גישה לכל הפרויקטים",
      role: "manager_plus",
      icon: "👨‍💻"
    },
    client_portal: {
      label: "לקוח פורטל",
      description: "גישה מוגבלת ללקוח בודד",
      role: "client",
      icon: "🔑"
    }
  };

  const handleCreate = async () => {
    if (!email) {
      toast.error('נא להזין כתובת אימייל');
      return;
    }

    setCreating(true);
    try {
      const config = templates[template];
      const allClientIds = clients.map(c => c.id);
      const allProjectIds = projects.map(p => p.id);

      let assigned_clients = [];
      let assigned_projects = [];

      switch (template) {
        case 'full_access':
        case 'staff_full':
          assigned_clients = allClientIds;
          assigned_projects = allProjectIds;
          break;
        case 'manager':
          assigned_projects = allProjectIds;
          break;
        case 'staff_limited':
        case 'client_portal':
        default:
          // No assignments
          break;
      }

      await AccessControl.create({
        email,
        role: config.role,
        active: true,
        assigned_clients,
        assigned_projects,
        notes: `נוצר דרך הגדרה מהירה: ${config.label}`
      });

      toast.success(`משתמש נוצר בהצלחה עם ${config.label}!`);
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error creating user:', error);
      toast.error('שגיאה ביצירת המשתמש');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-purple-600" />
            הגדרה מהירה
          </DialogTitle>
          <p className="text-sm text-slate-600">צור משתמש חדש עם הרשאות מוגדרות מראש</p>
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
            <Label>בחר תבנית הרשאות</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
              {Object.entries(templates).map(([key, config]) => (
                <Card
                  key={key}
                  className={`cursor-pointer transition-all ${
                    template === key 
                      ? 'ring-2 ring-purple-500 bg-purple-50' 
                      : 'hover:border-purple-300'
                  }`}
                  onClick={() => setTemplate(key)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{config.icon}</span>
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm">{config.label}</h4>
                        <p className="text-xs text-slate-600 mt-1">{config.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={creating}>
            ביטול
          </Button>
          <Button onClick={handleCreate} disabled={creating} className="gap-2 bg-purple-600 hover:bg-purple-700">
            {creating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                יוצר...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                צור משתמש
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}