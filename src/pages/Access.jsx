import React, { useEffect, useMemo, useState } from "react";
import { AccessControl, Client, Project } from "@/entities/all";
import { User } from "@/entities/User";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { 
  Shield, 
  Users as UsersIcon, 
  Mail, 
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  UserPlus,
  Settings as SettingsIcon,
  Zap,
  Download,
  FileJson
} from "lucide-react";
import { toast } from "sonner";

import UsersList from "@/components/access/UsersList";
import UserPermissionsDialog from "@/components/access/UserPermissionsDialog";
import QuickPermissionsDialog from "@/components/access/QuickPermissionsDialog";
import QuickAccessCards from "@/components/access/QuickAccessCards";
import EditUserNameDialog from "@/components/access/EditUserNameDialog";

const SUPER_ADMIN_EMAILS = [
  "jj1212t@gmail.com",
  "mali.f.arch2@gmail.com"
];

export default function AccessPage() {
  const [me, setMe] = useState(null);
  const [entries, setEntries] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  
  const [showPermissionsDialog, setShowPermissionsDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showQuickPermissionsDialog, setShowQuickPermissionsDialog] = useState(false);
  const [showEditNameDialog, setShowEditNameDialog] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      console.log('🔍 [ACCESS PAGE] Loading data...');
      
      const u = await User.me().catch(() => null);
      setMe(u);
      
      console.log('👤 [ACCESS PAGE] Current user:', {
        email: u?.email,
        role: u?.role
      });
      
      const [eList, cList, pList, uList] = await Promise.all([
        AccessControl.list('-created_date').catch(() => []),
        Client.list().catch(() => []),
        Project.list().catch(() => []),
        User.list().catch(() => [])
      ]);
      
      console.log('📊 [ACCESS PAGE] Data loaded:', {
        entries: eList.length,
        clients: cList.length,
        projects: pList.length,
        users: uList.length
      });
      
      console.log('👥 [ACCESS PAGE] All users with names:', 
        uList.map(u => ({ 
          email: u.email, 
          full_name: u.full_name,
          id: u.id 
        }))
      );
      
      setEntries(eList);
      setClients(cList);
      setProjects(pList);
      setAllUsers(uList);
    } catch (error) {
      console.error('❌ [ACCESS PAGE] Error loading data:', error);
      toast.error('שגיאה בטעינת נתונים');
    }
    setLoading(false);
  };

  const iAmAccessAdmin = useMemo(() => {
    if (!me) return false;
    
    const myEmail = (me.email || "").trim().toLowerCase();
    
    if (SUPER_ADMIN_EMAILS.some(email => email.toLowerCase() === myEmail)) {
      return true;
    }
    
    const hasAdminAccess = entries.some(r => 
      r?.active && 
      (r?.role === "admin" || r?.role === "super_admin") && 
      String(r?.email || "").trim().toLowerCase() === myEmail
    );
    
    return hasAdminAccess || me.role === 'admin';
  }, [entries, me]);

  const isSuperAdmin = useMemo(() => {
    if (!me) return false;
    const myEmail = (me.email || "").toLowerCase();
    return SUPER_ADMIN_EMAILS.some(email => email.toLowerCase() === myEmail);
  }, [me]);

  const handleToggleActive = async (row) => {
    if (row.isVirtual) {
      toast.error('לא ניתן לשנות סטטוס למנהל על וירטואלי.');
      return;
    }
    try {
      await AccessControl.update(row.id, { active: !row.active });
      toast.success(`הרשאה ${row.active ? 'הושבתה' : 'הופעלה'} בהצלחה!`);
      await loadData();
    } catch (error) {
      toast.error('שגיאה בעדכון הרשאה');
    }
  };

  const handleDelete = async (row) => {
    if (row.isVirtual) {
      toast.error('לא ניתן למחוק מנהל על וירטואלי.');
      return;
    }
    if (!confirm('למחוק את ההרשאה הזו?')) return;
    try {
      await AccessControl.delete(row.id);
      toast.success('הרשאה נמחקה בהצלחה!');
      await loadData();
    } catch (error) {
      toast.error('שגיאה במחיקת הרשאה');
    }
  };

  const handleOpenPermissions = (user) => {
    setSelectedUser(user);
    setShowPermissionsDialog(true);
  };

  const handleEditUserName = (accessControlEntry) => {
    console.log('✏️ [ACCESS PAGE] Opening edit name dialog for:', accessControlEntry.email);
    
    const fullName = accessControlEntry.full_name || null;
    
    console.log('📋 [ACCESS PAGE] Edit dialog data:', {
      email: accessControlEntry.email,
      currentName: fullName
    });
    
    setEditingUser({
      email: accessControlEntry.email,
      full_name: fullName
    });
    setShowEditNameDialog(true);
  };

  const handleExportAccessBackup = async () => {
    setExporting(true);
    try {
      // Load all related data
      const [auditLogs, timeLogs, tasks, meetings] = await Promise.all([
        AccessControl.list().catch(() => []),
        base44.entities.AuditLog.list('-performed_at', 5000).catch(() => []),
        base44.entities.TimeLog.list('-created_date', 5000).catch(() => []),
        base44.entities.Task.list().catch(() => []),
        base44.entities.Meeting.list().catch(() => [])
      ]);

      // Build comprehensive user map
      const userDataMap = {};

      // Process all users
      allUsers.forEach(user => {
        const email = user.email?.toLowerCase();
        if (!email) return;

        userDataMap[email] = {
          user_info: {
            id: user.id,
            email: user.email,
            full_name: user.full_name || user.display_name,
            role: user.role,
            created_date: user.created_date
          },
          access_control: null,
          activity: {
            audit_logs_created: [],
            time_logs_created: [],
            tasks_assigned: [],
            tasks_created: [],
            meetings_created: []
          }
        };
      });

      // Add access control entries
      entries.forEach(entry => {
        const email = entry.email?.toLowerCase();
        if (!email) return;

        if (!userDataMap[email]) {
          userDataMap[email] = {
            user_info: {
              email: entry.email,
              full_name: entry.full_name
            },
            access_control: null,
            activity: {
              audit_logs_created: [],
              time_logs_created: [],
              tasks_assigned: [],
              tasks_created: [],
              meetings_created: []
            }
          };
        }

        userDataMap[email].access_control = {
          id: entry.id,
          role: entry.role,
          active: entry.active,
          assigned_clients: entry.assigned_clients || [],
          assigned_projects: entry.assigned_projects || [],
          client_id: entry.client_id,
          client_name: entry.client_name,
          created_date: entry.created_date
        };
      });

      // Map audit logs to creators
      auditLogs.forEach(log => {
        const creatorEmail = log.performed_by?.toLowerCase();
        if (creatorEmail && userDataMap[creatorEmail]) {
          userDataMap[creatorEmail].activity.audit_logs_created.push({
            id: log.id,
            entity_type: log.entity_type,
            entity_id: log.entity_id,
            action: log.action,
            description: log.description,
            performed_at: log.performed_at
          });
        }
      });

      // Map time logs to creators
      timeLogs.forEach(log => {
        const creatorEmail = log.created_by?.toLowerCase();
        if (creatorEmail && userDataMap[creatorEmail]) {
          userDataMap[creatorEmail].activity.time_logs_created.push({
            id: log.id,
            client_name: log.client_name,
            project_name: log.project_name,
            description: log.description,
            duration_seconds: log.duration_seconds,
            log_date: log.log_date
          });
        }
      });

      // Map tasks
      tasks.forEach(task => {
        const creatorEmail = task.created_by?.toLowerCase();
        const assignedTo = task.assigned_to?.toLowerCase();

        if (creatorEmail && userDataMap[creatorEmail]) {
          userDataMap[creatorEmail].activity.tasks_created.push({
            id: task.id,
            title: task.title,
            status: task.status,
            created_date: task.created_date
          });
        }

        if (assignedTo && userDataMap[assignedTo]) {
          userDataMap[assignedTo].activity.tasks_assigned.push({
            id: task.id,
            title: task.title,
            status: task.status,
            due_date: task.due_date
          });
        }
      });

      // Map meetings
      meetings.forEach(meeting => {
        const creatorEmail = meeting.created_by?.toLowerCase();
        if (creatorEmail && userDataMap[creatorEmail]) {
          userDataMap[creatorEmail].activity.meetings_created.push({
            id: meeting.id,
            title: meeting.title,
            meeting_date: meeting.meeting_date,
            client_name: meeting.client_name
          });
        }
      });

      // Create export object
      const exportData = {
        export_info: {
          exported_at: new Date().toISOString(),
          exported_by: me?.email,
          total_users: Object.keys(userDataMap).length,
          total_access_entries: entries.length,
          total_audit_logs: auditLogs.length
        },
        super_admins: SUPER_ADMIN_EMAILS,
        users: userDataMap,
        raw_data: {
          access_control_entries: entries,
          all_users: allUsers.map(u => ({
            id: u.id,
            email: u.email,
            full_name: u.full_name,
            role: u.role,
            created_date: u.created_date
          })),
          clients_summary: clients.map(c => ({
            id: c.id,
            name: c.name,
            email: c.email
          })),
          projects_summary: projects.map(p => ({
            id: p.id,
            name: p.name,
            client_name: p.client_name
          }))
        }
      };

      // Download JSON
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `access_control_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`גיבוי הושלם! ${Object.keys(userDataMap).length} משתמשים יוצאו`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('שגיאה ביצוא הגיבוי');
    }
    setExporting(false);
  };

  const enrichedEntries = useMemo(() => {
    const merged = entries.map(entry => {
      const user = allUsers.find(u => u.email?.toLowerCase() === entry.email?.toLowerCase());
      return {
        ...entry,
        full_name: user?.display_name || user?.full_name || null
      };
    });

    SUPER_ADMIN_EMAILS.forEach(superAdminEmail => {
      const existsInAccessControl = entries.some(
        e => e.email?.toLowerCase() === superAdminEmail.toLowerCase()
      );
      
      if (!existsInAccessControl) {
        const user = allUsers.find(u => u.email?.toLowerCase() === superAdminEmail.toLowerCase());
        if (user) {
          merged.push({
            id: `virtual-${user.id || user.email}`,
            email: user.email,
            role: 'super_admin',
            active: true,
            full_name: user.display_name || user.full_name || null,
            assigned_clients: [],
            assigned_projects: [],
            isVirtual: true,
          });
        }
      }
    });

    return merged;
  }, [entries, allUsers]);

  const filteredEntries = useMemo(() => {
    return enrichedEntries
      .filter(e => {
        const matchesRole = roleFilter === "all" || e.role === roleFilter;
        const matchesStatus = statusFilter === "all" || 
          (statusFilter === "active" && e.active) ||
          (statusFilter === "inactive" && !e.active);
        const matchesSearch = !search || 
          (e.email || "").toLowerCase().includes(search.toLowerCase()) ||
          (e.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
          (e.client_name || "").toLowerCase().includes(search.toLowerCase());
        return matchesRole && matchesStatus && matchesSearch;
      })
      .sort((a, b) => (a.email || "").localeCompare(b.email || ""));
  }, [enrichedEntries, roleFilter, statusFilter, search]);

  const stats = useMemo(() => ({
    total: enrichedEntries.length,
    active: enrichedEntries.filter(e => e.active).length,
    superAdmins: enrichedEntries.filter(e => e.role === 'super_admin' && e.active).length,
    admins: enrichedEntries.filter(e => e.role === 'admin' && e.active).length,
    staff: enrichedEntries.filter(e => e.role === 'staff' && e.active).length,
    clients: enrichedEntries.filter(e => e.role === 'client' && e.active).length
  }), [enrichedEntries]);

  if (!me) {
    return null;
  }
  
  if (me.role !== "admin" && !isSuperAdmin && !iAmAccessAdmin) {
    return (
      <div className="p-6 lg:p-8" dir="rtl">
        <div className="max-w-3xl mx-auto">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-right">
                <XCircle className="w-6 h-6 text-red-600" />
                אין הרשאת גישה
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600 text-right mb-4">
                אין לך הרשאה לצפות בעמוד זה. דף זה מיועד למנהלי מערכת בלבד.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-right">
                <p className="text-sm text-blue-800 text-right">
                  💡 <strong>רוצה גישה?</strong> פנה למנהל המערכת
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen pl-24 lg:pl-12 overflow-auto" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between" dir="rtl">
          <div className="flex items-center gap-3 text-right">
            <div className="p-3 bg-blue-100 rounded-xl">
              <Shield className="w-8 h-8 text-blue-600" />
            </div>
            <div className="text-right">
              <h1 className="text-3xl font-bold text-slate-900 text-right">בקרת גישה</h1>
              <p className="text-slate-600 text-right">ניהול הרשאות, משתמשים וגישות למערכת</p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <Button 
              onClick={handleExportAccessBackup}
              disabled={exporting}
              variant="outline"
              className="gap-2"
            >
              {exporting ? (
                <>טוען...</>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  גיבוי מלא
                </>
              )}
            </Button>
            <Button 
              onClick={() => setShowQuickPermissionsDialog(true)}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 gap-2 px-6 py-6 text-lg font-semibold shadow-xl hover:shadow-2xl transition-all duration-200"
            >
              <Plus className="w-6 h-6" />
              הוסף משתמש והגדר הרשאות
            </Button>
          </div>
        </div>

        <QuickAccessCards stats={stats} />

        <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-sm" dir="rtl">
          <CardHeader>
            <div className="flex justify-between items-center" dir="rtl">
              <CardTitle className="text-right">משתמשי המערכת</CardTitle>
              <div className="flex gap-3">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="חיפוש..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pr-10 w-64 text-right"
                    dir="rtl"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          
          <CardContent dir="rtl">
            <Tabs defaultValue="all" className="w-full" dir="rtl">
              <TabsList className="grid w-full grid-cols-6 mb-6">
                <TabsTrigger value="all" onClick={() => setRoleFilter("all")}>
                  הכל ({stats.total})
                </TabsTrigger>
                <TabsTrigger value="super_admin" onClick={() => setRoleFilter("super_admin")}>
                  מנהלי על ({stats.superAdmins})
                </TabsTrigger>
                <TabsTrigger value="admin" onClick={() => setRoleFilter("admin")}>
                  מנהלים ({stats.admins})
                </TabsTrigger>
                <TabsTrigger value="manager_plus" onClick={() => setRoleFilter("manager_plus")}>
                  מנהלי פלוס
                </TabsTrigger>
                <TabsTrigger value="staff" onClick={() => setRoleFilter("staff")}>
                  עובדים ({stats.staff})
                </TabsTrigger>
                <TabsTrigger value="client" onClick={() => setRoleFilter("client")}>
                  לקוחות ({stats.clients})
                </TabsTrigger>
              </TabsList>

              <TabsContent value={roleFilter} className="mt-0">
                <UsersList
                  users={filteredEntries}
                  loading={loading}
                  onToggleActive={handleToggleActive}
                  onDelete={handleDelete}
                  onOpenPermissions={handleOpenPermissions}
                  onEditUserName={handleEditUserName}
                  clients={clients}
                  projects={projects}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {showQuickPermissionsDialog && (
          <QuickPermissionsDialog
            open={showQuickPermissionsDialog}
            onClose={() => setShowQuickPermissionsDialog(false)}
            onSuccess={loadData}
            clients={clients}
            projects={projects}
          />
        )}

        {showPermissionsDialog && selectedUser && (
          <UserPermissionsDialog
            open={showPermissionsDialog}
            onClose={() => {
              setShowPermissionsDialog(false);
              setSelectedUser(null);
            }}
            user={selectedUser}
            clients={clients}
            projects={projects}
            onSuccess={loadData}
          />
        )}

        {showEditNameDialog && editingUser && (
          <EditUserNameDialog
            open={showEditNameDialog}
            onClose={() => {
              setShowEditNameDialog(false);
              setEditingUser(null);
            }}
            userEmail={editingUser.email}
            currentFullName={editingUser.full_name}
            onSuccess={loadData}
          />
        )}
      </div>
    </div>
  );
}