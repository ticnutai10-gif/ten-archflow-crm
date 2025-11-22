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
        console.log('🔐 [ACCESS] Loading user and rules...');
        setLoading(true);
        
        const user = await base44.auth.me().catch(() => null);
        
        if (user) {
          console.log('👤 [ACCESS] User loaded:', {
            email: user.email,
            id: user.id,
            role: user.role,
            full_name: user.full_name
          });
          setMe(user);

          // טען כללי גישה
          const rules = await base44.entities.AccessControl.filter({ active: true }, '-created_date', 100)
            .catch(() => []);
          
          // ✅ הגנה על תוצאות undefined
          const validRules = Array.isArray(rules) ? rules : [];
          
          console.log('📋 [ACCESS] Access rules loaded:', validRules.length);
          setAccessRules(validRules);

          // חפש את הכלל של המשתמש הנוכחי
          const myRule = validRules.find(r => 
            r?.email?.toLowerCase() === user.email?.toLowerCase()
          );

          if (myRule) {
            console.log('✅ [ACCESS] My access rule found:', {
              role: myRule.role,
              active: myRule.active,
              assigned_clients: myRule.assigned_clients?.length || 0,
              assigned_projects: myRule.assigned_projects?.length || 0
            });
          } else {
            console.log('⚠️ [ACCESS] No specific access rule found for this user in AccessControl.');
          }
        } else {
          console.log('⚠️ [ACCESS] No user found (not logged in or session expired).');
          setMe(null);
          setAccessRules([]);
        }

      } catch (error) {
        console.error('❌ [ACCESS] Error loading access data:', error);
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

  // ✅ סינון לקוחות עם הגנה מלאה
  const filterClients = useCallback((allClients) => {
    console.log('🔍 [ACCESS] filterClients called with:', {
      allClients,
      isArray: Array.isArray(allClients),
      length: allClients?.length,
      type: typeof allClients
    });

    // ✅ הגנה: בדוק אם allClients הוא array תקין
    if (!Array.isArray(allClients)) {
      console.error('❌ [ACCESS] filterClients: allClients is not an array!', allClients);
      return [];
    }

    if (!me) {
      console.log('⚠️ [ACCESS] filterClients: No user - returning all clients (public access)');
      return allClients;
    }

    // Admin/Manager Plus/SuperAdmin רואים הכל
    if (isAdmin || isManagerPlus || isSuperAdmin) {
      console.log('✅ [ACCESS] Admin/Manager+/SuperAdmin - returning all clients:', allClients.length);
      return allClients;
    }

    // Client - רואה רק את עצמו
    if (isClient && myAccessRule?.client_id) {
      const filtered = allClients.filter(c => c?.id === myAccessRule.client_id);
      console.log('👤 [ACCESS] Client role - filtered:', filtered.length);
      return filtered;
    }

    // Staff - רואה רק לקוחות משוייכים
    if (isStaff) {
      const assignedIds = myAccessRule?.assigned_clients || [];
      console.log('👷 [ACCESS] Staff role:', {
        assignedClients: assignedIds.length,
        assignedIds
      });

      const filtered = allClients.filter(c => c && assignedIds.includes(c.id));
      console.log('👷 [ACCESS] Staff filtered:', filtered.length);
      return filtered;
    }

    console.log('⛔ [ACCESS] No permissions - returning empty');
    return [];
  }, [me, isAdmin, isManagerPlus, isSuperAdmin, isClient, isStaff, myAccessRule]);

  // ✅ סינון פרויקטים עם הגנה מלאה
  const filterProjects = useCallback((allProjects) => {
    console.log('🔍 [ACCESS] filterProjects called with:', {
      allProjects,
      isArray: Array.isArray(allProjects),
      length: allProjects?.length,
      type: typeof allProjects
    });

    // ✅ הגנה: בדוק אם allProjects הוא array תקין
    if (!Array.isArray(allProjects)) {
      console.error('❌ [ACCESS] filterProjects: allProjects is not an array!', allProjects);
      return [];
    }

    if (!me) {
      console.log('⚠️ [ACCESS] filterProjects: No user');
      return [];
    }

    if (isAdmin || isManagerPlus || isSuperAdmin) {
      console.log('✅ [ACCESS] Admin/Manager+/SuperAdmin - returning all projects');
      return allProjects;
    }

    if (isClient && myAccessRule?.client_id) {
      const filtered = allProjects.filter(p => p?.client_id === myAccessRule.client_id);
      console.log('👤 [ACCESS] Client role - filtered projects:', filtered.length);
      return filtered;
    }

    if (isStaff) {
      const assignedProjectIds = myAccessRule?.assigned_projects || [];
      const assignedClientIds = myAccessRule?.assigned_clients || [];
      
      console.log('👷 [ACCESS] Staff assignments:', {
        projects: assignedProjectIds.length,
        clients: assignedClientIds.length
      });

      const filtered = allProjects.filter(p => 
        p && (
          assignedProjectIds.includes(p.id) || 
          assignedClientIds.includes(p.client_id)
        )
      );
      
      console.log('👷 [ACCESS] Staff filtered projects:', filtered.length);
      return filtered;
    }

    console.log('⛔ [ACCESS] No permissions - returning empty');
    return [];
  }, [me, isAdmin, isManagerPlus, isSuperAdmin, isClient, isStaff, myAccessRule]);

  // ✅ סינון משימות עם הגנה מלאה
  const filterTasks = useCallback((allTasks) => {
    if (!Array.isArray(allTasks)) {
      console.error('❌ [ACCESS] filterTasks: allTasks is not an array!', allTasks);
      return [];
    }

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

  // ✅ סינון לוגי זמן עם הגנה מלאה
  const filterTimeLogs = useCallback((allLogs) => {
    if (!Array.isArray(allLogs)) {
      console.error('❌ [ACCESS] filterTimeLogs: allLogs is not an array!', allLogs);
      return [];
    }

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
      if (clientsCacheRef.current && (now - clientsCacheTimeRef.current) < 2 * 60 * 1000) {
        console.log('✅ [ACCESS] Using cached clients for timer');
        return clientsCacheRef.current;
      }

      console.log('🔄 [ACCESS] Fetching clients for timer...');
      const allClients = await base44.entities.Client.list();
      
      // ✅ הגנה על תוצאות undefined
      const validClients = Array.isArray(allClients) ? allClients : [];
      const filtered = filterClients(validClients);
      
      clientsCacheRef.current = filtered;
      clientsCacheTimeRef.current = now;
      
      return filtered;
    } catch (error) {
      console.error('Error loading clients for timer:', error);
      
      if (clientsCacheRef.current) {
        console.log('⚠️ [ACCESS] Error loading clients, using old cache');
        return clientsCacheRef.current;
      }
      
      return [];
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

    // ✅ הגנה על תוצאות undefined
    const validRecords = Array.isArray(accessRecords) ? accessRecords : [];
    const access = validRecords[0];
    
    if (!access || access.role !== 'staff') return;

    console.log('🔗 [AUTO ASSIGN] Assigning', itemType, itemId, 'to', user.email);

    if (itemType === 'client') {
      const existingClients = access.assigned_clients || [];
      if (!existingClients.includes(itemId)) {
        await base44.entities.AccessControl.update(access.id, {
          assigned_clients: [...existingClients, itemId]
        });
        console.log('✅ [AUTO ASSIGN] Client assigned successfully');
      }
    } else if (itemType === 'project') {
      const existingProjects = access.assigned_projects || [];
      if (!existingProjects.includes(itemId)) {
        await base44.entities.AccessControl.update(access.id, {
          assigned_projects: [...existingProjects, itemId]
        });
        console.log('✅ [AUTO ASSIGN] Project assigned successfully');
      }
    }
  } catch (error) {
    console.error('❌ [AUTO ASSIGN] Error:', error);
  }
}