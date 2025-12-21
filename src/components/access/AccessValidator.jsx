import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

// רשימת Super Admins
const SUPER_ADMIN_EMAILS = [
  'jj1212t@gmail.com',
  'mali.f.arch2@gmail.com'
];

/**
 * Hook לבדיקת הרשאות משתמש
 */
export function useAccessControl() {
  const [me, setMe] = useState(null);
  const [accessRules, setAccessRules] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAccess = async () => {
      try {
        setLoading(true);
        const user = await base44.auth.me().catch(() => null);
        
        if (user) {
          setMe(user);
          const rules = await base44.entities.AccessControl.filter({ active: true }, '-created_date', 100).catch(() => []);
          const validRules = Array.isArray(rules) ? rules : [];
          setAccessRules(validRules);
        } else {
          setMe(null);
          setAccessRules([]);
        }
      } catch (error) {
        console.error('[ACCESS] Error:', error);
        setMe(null);
        setAccessRules([]);
      } finally {
        setLoading(false);
      }
    };

    loadAccess();
  }, []);

  // בדיקה אם Super Admin
  const isSuperAdmin = useMemo(() => {
    if (!me) return false;
    const result = SUPER_ADMIN_EMAILS.some(
      email => email.toLowerCase() === me.email?.toLowerCase()
    );
    return result;
  }, [me]);

  // קבלת הכלל הספציפי של המשתמש הנוכחי
  const myAccessRule = useMemo(() => {
    if (!me) return null;
    
    const rule = accessRules.find(r => 
      r?.email?.toLowerCase() === me.email?.toLowerCase() && r?.active
    );
    
    return rule || null;
  }, [me, accessRules]);

  // בדיקה האם המשתמש הוא מנהל
  const isAdmin = useMemo(() => {
    if (!me) return false;
    
    if (isSuperAdmin) return true;
    if (me.role === 'admin') return true;
    if (myAccessRule?.role === 'admin' || myAccessRule?.role === 'super_admin') return true;

    return false;
  }, [me, isSuperAdmin, myAccessRule]);

  // בדיקה האם המשתמש הוא מנהל פלוס
  const isManagerPlus = useMemo(() => {
    if (!me || isAdmin) return false;
    return myAccessRule?.role === 'manager_plus';
  }, [me, isAdmin, myAccessRule]);

  // בדיקה האם המשתמש הוא עובד
  const isStaff = useMemo(() => {
    if (!me || isAdmin || isManagerPlus) return false;
    return myAccessRule?.role === 'staff';
  }, [me, isAdmin, isManagerPlus, myAccessRule]);

  // בדיקה האם המשתמש הוא לקוח
  const isClient = useMemo(() => {
    if (!me || isAdmin || isManagerPlus || isStaff) return false;
    return myAccessRule?.role === 'client';
  }, [me, isAdmin, isManagerPlus, isStaff, myAccessRule]);

  // בדיקה האם יש גישה ללקוח מסוים
  const canAccessClient = useCallback((clientId) => {
    if (!clientId || !me) return false;
    if (isAdmin || isManagerPlus) return true;
    
    if (isStaff && myAccessRule?.assigned_clients) {
      return myAccessRule.assigned_clients.includes(clientId);
    }
    
    if (isClient && myAccessRule?.client_id) {
      return myAccessRule.client_id === clientId;
    }
    
    return false;
  }, [me, isAdmin, isManagerPlus, isStaff, isClient, myAccessRule]);

  // בדיקה האם יש גישה לפרויקט מסוים
  const canAccessProject = useCallback((projectId) => {
    if (!projectId || !me) return false;
    if (isAdmin || isManagerPlus) return true;
    
    if (isStaff && myAccessRule) {
      const assignedProjects = myAccessRule.assigned_projects || [];
      return assignedProjects.includes(projectId);
    }
    
    if (isClient && myAccessRule?.client_id) {
      return true; 
    }
    
    return false;
  }, [me, isAdmin, isManagerPlus, isStaff, isClient, myAccessRule]);

  // ✅ סינון לקוחות עם הגנה מלאה + דדופליקציה
  const filterClients = useCallback((allClients) => {
    if (!Array.isArray(allClients)) return [];
    if (!me) return allClients;

    // Admin/Manager Plus/SuperAdmin רואים הכל
    if (isAdmin || isManagerPlus || isSuperAdmin) {
      return allClients;
    }

    // Client - רואה רק את עצמו
    if (isClient && myAccessRule?.client_id) {
      return allClients.filter(c => c?.id === myAccessRule.client_id);
    }

    // Staff - רואה רק לקוחות משוייכים
    if (isStaff) {
      const assignedIds = myAccessRule?.assigned_clients || [];
      return allClients.filter(c => c && assignedIds.includes(c.id));
    }

    return [];
  }, [me, isAdmin, isManagerPlus, isSuperAdmin, isClient, isStaff, myAccessRule]);

  // ✅ סינון פרויקטים עם הגנה מלאה
  const filterProjects = useCallback((allProjects) => {
    if (!Array.isArray(allProjects)) return [];
    if (!me) return [];

    if (isAdmin || isManagerPlus || isSuperAdmin) {
      return allProjects;
    }

    if (isClient && myAccessRule?.client_id) {
      return allProjects.filter(p => p?.client_id === myAccessRule.client_id);
    }

    if (isStaff) {
      const assignedProjectIds = myAccessRule?.assigned_projects || [];
      const assignedClientIds = myAccessRule?.assigned_clients || [];
      
      return allProjects.filter(p => 
        p && (
          assignedProjectIds.includes(p.id) || 
          assignedClientIds.includes(p.client_id)
        )
      );
    }

    return [];
  }, [me, isAdmin, isManagerPlus, isSuperAdmin, isClient, isStaff, myAccessRule]);

  // ✅ סינון משימות
  const filterTasks = useCallback((allTasks) => {
    if (!Array.isArray(allTasks)) return [];
    if (!me) return [];
    
    if (isAdmin || isManagerPlus || isSuperAdmin) return allTasks;
    
    if (isStaff) {
      const assignedProjectIds = myAccessRule?.assigned_projects || [];
      const assignedClientIds = myAccessRule?.assigned_clients || [];
      
      return allTasks.filter(t => 
        t && (
          (t.project_id && assignedProjectIds.includes(t.project_id)) ||
          (t.client_id && assignedClientIds.includes(t.client_id)) ||
          t.assigned_to === me?.email
        )
      );
    }
    
    if (isClient && myAccessRule?.client_id) {
      return allTasks.filter(t => t?.client_id === myAccessRule.client_id);
    }
    
    return [];
  }, [me, isAdmin, isManagerPlus, isSuperAdmin, isStaff, isClient, myAccessRule]);

  // ✅ סינון לוגי זמן
  const filterTimeLogs = useCallback((allLogs) => {
    if (!Array.isArray(allLogs)) return [];
    if (!me) return [];
    
    if (isAdmin || isManagerPlus || isSuperAdmin) return allLogs;
    
    if (isStaff) {
      const assignedClientIds = myAccessRule?.assigned_clients || [];
      
      return allLogs.filter(log => 
        log && (
          (log.client_id && assignedClientIds.includes(log.client_id)) ||
          log.created_by === me?.email
        )
      );
    }
    
    if (isClient && myAccessRule?.client_id) {
      return allLogs.filter(log => log?.client_id === myAccessRule.client_id);
    }
    
    return [];
  }, [me, isAdmin, isManagerPlus, isSuperAdmin, isStaff, isClient, myAccessRule]);

  const canCreateClient = useCallback(() => {
    return isAdmin || isManagerPlus || isStaff;
  }, [isAdmin, isManagerPlus, isStaff]);

  const canCreateProject = useCallback(() => {
    return isAdmin || isManagerPlus || isStaff;
  }, [isAdmin, isManagerPlus, isStaff]);

  // Cache לקוחות
  const clientsCacheRef = useRef(null);
  const clientsCacheTimeRef = useRef(0);

  const getAllowedClientsForTimer = useCallback(async () => {
    try {
      const now = Date.now();
      if (clientsCacheRef.current && (now - clientsCacheTimeRef.current) < 5 * 60 * 1000) {
        return clientsCacheRef.current;
      }

      const allClients = await base44.entities.Client.list();
      const validClients = Array.isArray(allClients) ? allClients : [];
      
      // דדופליקציה מובנית לפי name_clean
      const uniqueMap = new Map();
      for (const c of validClients) {
        if (!c) continue;
        const cleanName = (c.name_clean || c.name || '').trim().toLowerCase().replace(/\s+/g, ' ');
        if (!cleanName) continue;
        
        if (!uniqueMap.has(cleanName)) {
          uniqueMap.set(cleanName, c);
        } else {
          const existing = uniqueMap.get(cleanName);
          if (new Date(c.updated_date) > new Date(existing.updated_date)) {
            uniqueMap.set(cleanName, c);
          }
        }
      }
      
      const dedupedClients = Array.from(uniqueMap.values());
      const filtered = filterClients(dedupedClients);
      
      clientsCacheRef.current = filtered;
      clientsCacheTimeRef.current = now;
      
      return filtered;
    } catch (error) {
      console.error('[ACCESS] Error loading clients:', error);
      return clientsCacheRef.current || [];
    }
  }, [filterClients]);

  const assignedClientsCount = useMemo(() => myAccessRule?.assigned_clients?.length || 0, [myAccessRule]);
  const assignedProjectsCount = useMemo(() => myAccessRule?.assigned_projects?.length || 0, [myAccessRule]);

  return {
    me,
    loading,
    myAccessRule,
    isSuperAdmin,
    isAdmin,
    isManagerPlus,
    isStaff,
    isClient,
    canAccessClient,
    canAccessProject,
    canCreateClient,
    canCreateProject,
    filterClients,
    filterProjects,
    filterTasks,
    filterTimeLogs,
    getAllowedClientsForTimer,
    assignedClientsCount,
    assignedProjectsCount
  };
}

/**
 * רכיב לבדיקת הרשאות
 */
export function ProtectedContent({ children, requireAdmin = false, requireManagerPlus = false }) {
  const { isAdmin, isManagerPlus, loading } = useAccessControl();

  if (loading) {
    return <div className="p-4 text-center text-slate-500">טוען הרשאות...</div>;
  }

  if (requireAdmin && !isAdmin) {
    return (
      <div className="p-6 text-center">
        <div className="max-w-md mx-auto bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-red-800 mb-2">אין הרשאת גישה</h3>
          <p className="text-red-600">תוכן זה זמין רק למנהלי מערכת</p>
        </div>
      </div>
    );
  }

  if (requireManagerPlus && !isManagerPlus) {
    return (
      <div className="p-6 text-center">
        <div className="max-w-md mx-auto bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">גישה מוגבלת</h3>
          <p className="text-yellow-600">תוכן זה זמין למנהלים ומנהלי פלוס בלבד</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * פונקציה לשיוך אוטומטי
 */
export async function autoAssignToCreator(itemType, itemId) {
  try {
    const user = await base44.auth.me();
    if (!user?.email) return;

    const accessRecords = await base44.entities.AccessControl.filter({
      email: user.email,
      active: true
    });

    const validRecords = Array.isArray(accessRecords) ? accessRecords : [];
    const access = validRecords[0];
    
    if (!access || access.role !== 'staff') return;

    if (itemType === 'client') {
      const existingClients = access.assigned_clients || [];
      if (!existingClients.includes(itemId)) {
        await base44.entities.AccessControl.update(access.id, {
          assigned_clients: [...existingClients, itemId]
        });
      }
    } else if (itemType === 'project') {
      const existingProjects = access.assigned_projects || [];
      if (!existingProjects.includes(itemId)) {
        await base44.entities.AccessControl.update(access.id, {
          assigned_projects: [...existingProjects, itemId]
        });
      }
    }
  } catch (error) {
    console.error('[AUTO ASSIGN] Error:', error);
  }
}