
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  UserPlus, 
  Loader2, 
  Users, 
  Briefcase, 
  CheckCircle2,
  XCircle,
  Shield,
  Star,
  Crown,
  UserCircle,
  X // Added X icon
} from "lucide-react";
import { AccessControl } from "@/entities/all";
import { toast } from "react-hot-toast";

const ROLE_OPTIONS = [
  {
    value: "super_admin",
    label: "מנהל על",
    icon: Crown,
    color: "purple",
    description: "הרשאות מלאות ללא הגבלה",
    bgColor: "bg-purple-50",
    textColor: "text-purple-700",
    borderColor: "border-purple-300"
  },
  {
    value: "admin",
    label: "מנהל",
    icon: Shield,
    color: "indigo",
    description: "ניהול מלא של המערכת",
    bgColor: "bg-indigo-50",
    textColor: "text-indigo-700",
    borderColor: "border-indigo-300"
  },
  {
    value: "manager_plus",
    label: "מנהל פלוס",
    icon: Star,
    color: "blue",
    description: "רואה הכל, לא מנהל משתמשים",
    bgColor: "bg-blue-50",
    textColor: "text-blue-700",
    borderColor: "border-blue-300"
  },
  {
    value: "staff",
    label: "עובד",
    icon: Briefcase,
    color: "green",
    description: "גישה מוגבלת למשויכים בלבד",
    bgColor: "bg-green-50",
    textColor: "text-green-700",
    borderColor: "border-green-300"
  },
  {
    value: "client",
    label: "לקוח",
    icon: UserCircle,
    color: "emerald",
    description: "גישה לפורטל לקוח בלבד",
    bgColor: "bg-emerald-50",
    textColor: "text-emerald-700",
    borderColor: "border-emerald-300"
  }
];

export default function QuickPermissionsDialog({ open, onClose, onSuccess, clients = [], projects = [] }) {
  const [email, setEmail] = useState("");
  const [selectedRole, setSelectedRole] = useState(null);
  const [assignedClients, setAssignedClients] = useState([]);
  const [assignedProjects, setAssignedProjects] = useState([]);
  const [searchClients, setSearchClients] = useState("");
  const [searchProjects, setSearchProjects] = useState("");
  const [creating, setCreating] = useState(false);

  const handleClose = () => {
    setEmail("");
    setSelectedRole(null);
    setAssignedClients([]);
    setAssignedProjects([]);
    setSearchClients("");
    setSearchProjects("");
    setCreating(false);
    onClose();
  };

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    
    // Reset assignments when changing role.
    // For admin roles, assigned_clients/projects are not explicitly used by the UI.
    // For staff, they will be selected in step 3. For client, they are not selected via this UI.
    setAssignedClients([]);
    setAssignedProjects([]);
  };

  const toggleClient = (clientId) => {
    setAssignedClients(prev =>
      prev.includes(clientId)
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    );
  };

  const toggleProject = (projectId) => {
    setAssignedProjects(prev =>
      prev.includes(projectId)
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId]
    );
  };

  const selectAllClients = () => {
    if (assignedClients.length === filteredClients.length) {
      setAssignedClients([]);
    } else {
      setAssignedClients(filteredClients.map(c => c.id));
    }
  };

  const selectAllProjects = () => {
    if (assignedProjects.length === filteredProjects.length) {
      setAssignedProjects([]);
    } else {
      setAssignedProjects(filteredProjects.map(p => p.id));
    }
  };

  const handleCreate = async () => {
    if (!email) {
      toast.error('נא להזין כתובת אימייל');
      return;
    }

    if (!selectedRole) {
      toast.error('נא לבחור תפקיד');
      return;
    }

    // בדיקה אם האימייל כבר קיים
    try {
      const existing = await AccessControl.filter({ email: email.toLowerCase() });
      if (existing && existing.length > 0) {
        toast.error('האימייל כבר קיים במערכת');
        return;
      }
    } catch (error) {
      console.error('Error checking existing email:', error);
      toast.error('שגיאה בבדיקת אימייל קיים');
      return;
    }

    setCreating(true);
    try {
      console.log('🔐 [CREATE USER] Starting...', {
        email,
        role: selectedRole,
        assignedClients: assignedClients.length,
        assignedProjects: assignedProjects.length
      });

      // Based on the UI changes, for roles like admin/super_admin/manager_plus/client,
      // assignedClients/assignedProjects are not explicitly set or selected via this UI.
      // They should be empty or handled by backend logic. For 'staff', they are explicitly selected.
      const userAssignedClients = selectedRole === 'staff' ? assignedClients : [];
      const userAssignedProjects = selectedRole === 'staff' ? assignedProjects : [];

      const newUser = await AccessControl.create({
        email: email.toLowerCase().trim(),
        role: selectedRole,
        active: true,
        assigned_clients: userAssignedClients,
        assigned_projects: userAssignedProjects,
        notes: `נוצר דרך הגדרת הרשאות מהירה - ${new Date().toLocaleDateString('he-IL')}`
      });

      console.log('✅ [CREATE USER] Success:', newUser);
      toast.success('משתמש נוסף בהצלחה! 🎉');
      
      onSuccess?.();
      handleClose(); // Use handleClose to reset states and close the dialog
      
    } catch (error) {
      console.error('❌ [CREATE USER] Error:', error);
      
      let errorMessage = 'שגיאה ביצירת המשתמש';
      
      if (error?.message) {
        if (error.message.includes('duplicate') || error.message.includes('unique')) {
          errorMessage = 'האימייל כבר קיים במערכת';
        } else if (error.message.includes('permission') || error.message.includes('unauthorized')) {
          errorMessage = 'אין לך הרשאה ליצור משתמשים חדשים';
        } else {
          errorMessage = `שגיאה: ${error.message}`;
        }
      }
      
      toast.error(errorMessage);
    } finally {
      setCreating(false);
    }
  };

  const filteredClients = clients.filter(c =>
    (c.name || "").toLowerCase().includes(searchClients.toLowerCase())
  );

  const filteredProjects = projects.filter(p =>
    (p.name || "").toLowerCase().includes(searchProjects.toLowerCase()) ||
    (p.client_name || "").toLowerCase().includes(searchProjects.toLowerCase())
  );

  // selectedRoleData is still useful for displaying the admin message
  const selectedRoleData = ROLE_OPTIONS.find(r => r.value === selectedRole);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden" dir="rtl">
        {/* כפתור סגירה */}
        <button
          onClick={handleClose}
          className="absolute left-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground z-50"
        >
          <X className="h-5 w-5" />
          <span className="sr-only">סגור</span>
        </button>

        <DialogHeader className="text-right">
          <DialogTitle className="flex items-center gap-2 text-right text-xl">
            <UserPlus className="w-6 h-6" />
            הוספת משתמש והגדרת הרשאות
          </DialogTitle>
          <p className="text-sm text-slate-500 text-right mt-2">
            הזן פרטי משתמש ובחר הרשאות בצורה מהירה וקלה
          </p>
        </DialogHeader>

        <div className="space-y-6" dir="rtl">
          {/* שלב 1: אימייל */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-sm">
                1
              </div>
              <Label className="text-base font-semibold">פרטי המשתמש</Label>
            </div>
            <Input
              type="email"
              placeholder="הזן כתובת אימייל..."
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="text-right"
              dir="rtl"
            />
          </div>

          {/* שלב 2: בחירת תפקיד */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-sm">
                2
              </div>
              <Label className="text-base font-semibold">בחר תפקיד</Label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {ROLE_OPTIONS.map((role) => {
                const Icon = role.icon;
                const isSelected = selectedRole === role.value;
                
                return (
                  <Card
                    key={role.value}
                    className={`cursor-pointer transition-all ${
                      isSelected
                        ? `${role.borderColor} border-2 ${role.bgColor}`
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                    onClick={() => handleRoleSelect(role.value)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Icon className={`w-5 h-5 ${role.textColor} flex-shrink-0 mt-0.5`} />
                        <div className="flex-1 text-right">
                          <div className="font-semibold text-sm mb-1">{role.label}</div>
                          <div className="text-xs text-slate-600">{role.description}</div>
                        </div>
                        {isSelected && (
                          <CheckCircle2 className={`w-5 h-5 ${role.textColor} flex-shrink-0`} />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* שלב 3: שיוך לקוחות ופרויקטים (רק לעובדים) */}
          {selectedRole === 'staff' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-sm">
                  3
                </div>
                <Label className="text-base font-semibold">בחר לקוחות ופרויקטים</Label>
              </div>
              
              <Tabs defaultValue="clients" dir="rtl" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="clients" className="gap-2">
                    <Users className="w-4 h-4" />
                    לקוחות ({assignedClients.length})
                  </TabsTrigger>
                  <TabsTrigger value="projects" className="gap-2">
                    <Briefcase className="w-4 h-4" />
                    פרויקטים ({assignedProjects.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="clients" className="space-y-3">
                  <div className="flex gap-3" dir="rtl">
                    <Input
                      placeholder="חיפוש לקוחות..."
                      value={searchClients}
                      onChange={(e) => setSearchClients(e.target.value)}
                      className="flex-1 text-right"
                      dir="rtl"
                    />
                    <Button
                      variant="outline"
                      onClick={selectAllClients}
                      className="gap-2"
                    >
                      {assignedClients.length === filteredClients.length ? (
                        <>
                          <XCircle className="w-4 h-4" />
                          בטל הכל
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          בחר הכל
                        </>
                      )}
                    </Button>
                  </div>

                  <ScrollArea className="h-[300px] border rounded-lg p-3 bg-white">
                    <div className="space-y-2">
                      {filteredClients.map((client) => (
                        <div
                          key={client.id}
                          className={`flex items-center gap-3 p-3 rounded-lg transition-colors cursor-pointer ${
                            assignedClients.includes(client.id)
                              ? 'bg-blue-50 border-2 border-blue-300'
                              : 'bg-slate-50 hover:bg-slate-100'
                          }`}
                          onClick={() => toggleClient(client.id)}
                          dir="rtl"
                        >
                          <Checkbox
                            checked={assignedClients.includes(client.id)}
                            onCheckedChange={() => toggleClient(client.id)}
                          />
                          <Users className="w-4 h-4 text-slate-400" />
                          <div className="flex-1 text-right">
                            <div className="font-medium text-right">{client.name}</div>
                            {client.email && (
                              <div className="text-xs text-slate-500 text-right">{client.email}</div>
                            )}
                          </div>
                          {assignedClients.includes(client.id) && (
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="projects" className="space-y-3">
                  <div className="flex gap-3" dir="rtl">
                    <Input
                      placeholder="חיפוש פרויקטים..."
                      value={searchProjects}
                      onChange={(e) => setSearchProjects(e.target.value)}
                      className="flex-1 text-right"
                      dir="rtl"
                    />
                    <Button
                      variant="outline"
                      onClick={selectAllProjects}
                      className="gap-2"
                    >
                      {assignedProjects.length === filteredProjects.length ? (
                        <>
                          <XCircle className="w-4 h-4" />
                          בטל הכל
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          בחר הכל
                        </>
                      )}
                    </Button>
                  </div>

                  <ScrollArea className="h-[300px] border rounded-lg p-3 bg-white">
                    <div className="space-y-2">
                      {filteredProjects.map((project) => (
                        <div
                          key={project.id}
                          className={`flex items-center gap-3 p-3 rounded-lg transition-colors cursor-pointer ${
                            assignedProjects.includes(project.id)
                              ? 'bg-green-50 border-2 border-green-300'
                              : 'bg-slate-50 hover:bg-slate-100'
                          }`}
                          onClick={() => toggleProject(project.id)}
                          dir="rtl"
                        >
                          <Checkbox
                            checked={assignedProjects.includes(project.id)}
                            onCheckedChange={() => toggleProject(project.id)}
                          />
                          <Briefcase className="w-4 h-4 text-slate-400" />
                          <div className="flex-1 text-right">
                            <div className="font-medium text-right">{project.name}</div>
                            {project.client_name && (
                              <div className="text-xs text-slate-500 text-right">{project.client_name}</div>
                            )}
                          </div>
                          {assignedProjects.includes(project.id) && (
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </div>
          )}

          {/* הודעה למנהלים */}
          {(selectedRole === 'admin' || selectedRole === 'super_admin' || selectedRole === 'manager_plus' || selectedRole === 'client') && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4" dir="rtl">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-right">
                  <p className="text-sm font-semibold text-blue-900 mb-1">
                    גישה מלאה ל{selectedRoleData?.label === 'לקוח' ? 'פורטל לקוח' : 'מערכת'}
                  </p>
                  <p className="text-sm text-blue-700">
                    משתמש זה יקבל גישה אוטומטית לכל ה{selectedRoleData?.label === 'לקוח' ? 'שיוכים הרלוונטיים לו' : 'לקוחות והפרויקטים במערכת'} בהתאם לתפקידו.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter dir="rtl" className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={creating}>
            ביטול
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!email || !selectedRole || creating}
            className="gap-2 bg-blue-600 hover:bg-blue-700"
          >
            {creating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                יוצר משתמש...
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                צור משתמש
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
