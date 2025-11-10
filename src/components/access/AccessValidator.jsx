
import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { User } from "@/entities/User";
import { AccessControl, Client, Project } from "@/entities/all";
import { toast } from "react-hot-toast";

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
  const [accessRules, setAccessRules] = useState([]); // This will hold all access control records
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAccess = async () => {
      try {
        console.log('🔐 [ACCESS] Loading user and rules...');
        setLoading(true);
        
        const user = await User.me().catch(() => null);
        
        if (user) {
          console.log('👤 [ACCESS] User loaded:', {
            email: user.email,
            id: user.id,
            role: user.role,
            full_name: user.full_name
          });
          setMe(user);

          // טען כללי גישה
          // Fetch up to 100 active access rules (adjust limit if needed for larger orgs)
          const rules = await AccessControl.filter({ active: true }, '-created_date', 100)
            .catch(() => []);
          
          console.log('📋 [ACCESS] Access rules loaded:', rules.length);
          setAccessRules(rules);

          // חפש את הכלל של המשתמש הנוכחי
          const myRule = rules.find(r => 
            r.email?.toLowerCase() === user.email?.toLowerCase()
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
    // console.log('👑 [ACCESS] Super admin check:', { email: me.email, result });
    return result;
  }, [me]);

  // קבלת הכלל הספציפי של המשתמש הנוכחי מתוך רשימת הכללים
  const myAccessRule = useMemo(() => {
    if (!me) return null;
    
    const rule = accessRules.find(r => 
      r.email?.toLowerCase() === me.email?.toLowerCase() && r.active
    );
    
    // console.log('📝 [ACCESS] My specific access rule:', rule);
    return rule;
  }, [me, accessRules]);

  // בדיקה האם המשתמש הוא מנהל (רואה הכל)
  const isAdmin = useMemo(() => {
    if (!me) return false;
    
    // Super admin = תמיד admin
    if (isSuperAdmin) {
      // console.log('✅ [ACCESS] Admin via super admin');
      return true;
    }

    // בדיקת role ב-User entity (for legacy/fallback)
    if (me.role === 'admin') {
      // console.log('✅ [ACCESS] Admin via user.role');
      return true;
    }

    // בדיקת AccessControl rule
    if (myAccessRule?.role === 'admin' || myAccessRule?.role === 'super_admin') {
      // console.log('✅ [ACCESS] Admin via AccessControl rule');
      return true;
    }

    // console.log('❌ [ACCESS] Not admin');
    return false;
  }, [me, isSuperAdmin, myAccessRule]);

  // בדיקה האם המשתמש הוא מנהל פלוס (רואה הכל אבל לא מנהל משתמשים)
  const isManagerPlus = useMemo(() => {
    if (!me || isAdmin) return false; // If already admin, not Manager Plus
    
    const result = myAccessRule?.role === 'manager_plus';
    // console.log('⭐ [ACCESS] Manager plus check:', { result, role: myAccessRule?.role });
    return result;
  }, [me, isAdmin, myAccessRule]);

  // בדיקה האם המשתמש הוא עובד (רואה רק את המשויכים אליו)
  const isStaff = useMemo(() => {
    if (!me || isAdmin || isManagerPlus) return false;
    const result = myAccessRule?.role === 'staff';
    // console.log('👷 [ACCESS] Staff check:', { result, role: myAccessRule?.role });
    return result;
  }, [me, isAdmin, isManagerPlus, myAccessRule]);

  // בדיקה האם המשתמש הוא לקוח (גישה לפורטל בלבד)
  const isClient = useMemo(() => {
    if (!me || isAdmin || isManagerPlus || isStaff) return false;
    const result = myAccessRule?.role === 'client';
    // console.log('👤 [ACCESS] Client check:', { result, role: myAccessRule?.role });
    return result;
  }, [me, isAdmin, isManagerPlus, isStaff, myAccessRule]);

  // בדיקה האם יש למשתמש גישה ללקוח מסוים
  const canAccessClient = useCallback((clientId) => {
    if (!clientId) return false;
    if (!me) return false; // No user, no access

    // מנהלים ומנהלי פלוס רואים הכל
    if (isAdmin || isManagerPlus) return true;
    
    // עובדים רואים רק את המשויכים אליהם
    if (isStaff && myAccessRule?.assigned_clients) {
      return myAccessRule.assigned_clients.includes(clientId);
    }
    
    // לקוחות רואים רק את עצמם
    if (isClient && myAccessRule?.client_id) {
      return myAccessRule.client_id === clientId;
    }
    
    return false;
  }, [me, isAdmin, isManagerPlus, isStaff, isClient, myAccessRule]);

  // בדיקה האם יש למשתמש גישה לפרויקט מסוים
  const canAccessProject = useCallback((projectId) => {
    if (!projectId) return false;
    if (!me) return false; // No user, no access

    // מנהלים ומנהלי פלוס רואים הכל
    if (isAdmin || isManagerPlus) return true;
    
    // עובדים רואים רק את המשויכים אליהם (או של לקוחות משויכים)
    if (isStaff && myAccessRule) {
      const assignedProjects = myAccessRule.assigned_projects || [];
      // This is a simplified check. A full check would require fetching the project's client_id.
      // For now, if staff is assigned to project or client, assume access
      return assignedProjects.includes(projectId); // We only have project IDs here. Client projects needs lookup.
    }
    
    // לקוחות רואים את הפרויקטים של הלקוח שלהם
    if (isClient && myAccessRule?.client_id) {
      // This check would ideally involve checking the project's client_id against myAccessRule.client_id
      // For now, assuming a helper will filter full lists
      return true; 
    }
    
    return false;
  }, [me, isAdmin, isManagerPlus, isStaff, isClient, myAccessRule]);

  // סינון רשימת לקוחות לפי הרשאות
  const filterClients = useCallback((allClients) => {
    if (!me || !Array.isArray(allClients)) {
      // console.log('⚠️ [ACCESS] filterClients: No user or clients');
      return [];
    }
    
    // console.log('🔍 [ACCESS] Filtering clients:', {
    //   totalClients: allClients.length,
    //   userEmail: me.email,
    //   isAdmin,
    //   isManagerPlus,
    //   isSuperAdmin
    // });

    // Admin/Manager Plus/SuperAdmin רואים הכל
    if (isAdmin || isManagerPlus || isSuperAdmin) {
      // console.log('✅ [ACCESS] Admin/Manager+/SuperAdmin - returning all clients:', allClients.length);
      return allClients;
    }

    // Client - רואה רק את עצמו
    if (isClient && myAccessRule?.client_id) {
      const filtered = allClients.filter(c => c.id === myAccessRule.client_id);
      // console.log('👤 [ACCESS] Client role - filtered clients:', {
      //   clientId: myAccessRule.client_id,
      //   found: filtered.length
      // });
      return filtered;
    }

    // Staff - רואה רק לקוחות משוייכים
    if (isStaff) {
      const assignedIds = myAccessRule?.assigned_clients || [];
      // console.log('👷 [ACCESS] Staff role:', {
      //   assignedClients: assignedIds.length,
      //   assignedIds
      // });

      const filtered = allClients.filter(c => assignedIds.includes(c.id));
      // console.log('👷 [ACCESS] Staff filtered clients:', {
      //   total: allClients.length,
      //   filtered: filtered.length,
      //   clientNames: filtered.map(c => c.name)
      // });
      return filtered;
    }

    // אין הרשאה - ריק
    // console.log('⛔ [ACCESS] No permissions for clients - returning empty');
    return [];
  }, [me, isAdmin, isManagerPlus, isSuperAdmin, isClient, isStaff, myAccessRule]);

  // סינון רשימת פרויקטים לפי הרשאות
  const filterProjects = useCallback((allProjects) => {
    if (!me || !Array.isArray(allProjects)) {
      // console.log('⚠️ [ACCESS] filterProjects: No user or projects');
      return [];
    }
    
    // console.log('🔍 [ACCESS] Filtering projects:', {
    //   totalProjects: allProjects.length,
    //   userEmail: me.email,
    //   isAdmin,
    //   isManagerPlus,
    //   isSuperAdmin
    // });

    if (isAdmin || isManagerPlus || isSuperAdmin) {
      // console.log('✅ [ACCESS] Admin/Manager+/SuperAdmin - returning all projects');
      return allProjects;
    }

    if (isClient && myAccessRule?.client_id) {
      const filtered = allProjects.filter(p => p.client_id === myAccessRule.client_id);
      // console.log('👤 [ACCESS] Client role - filtered projects:', filtered.length);
      return filtered;
    }

    if (isStaff) {
      const assignedProjectIds = myAccessRule?.assigned_projects || [];
      const assignedClientIds = myAccessRule?.assigned_clients || [];
      
      // console.log('👷 [ACCESS] Staff assignments:', {
      //   projects: assignedProjectIds.length,
      //   clients: assignedClientIds.length
      // });

      const filtered = allProjects.filter(p => 
        assignedProjectIds.includes(p.id) || 
        assignedClientIds.includes(p.client_id)
      );
      
      // console.log('👷 [ACCESS] Staff filtered projects:', filtered.length);
      return filtered;
    }

    // console.log('⛔ [ACCESS] No permissions for projects - returning empty');
    return [];
  }, [me, isAdmin, isManagerPlus, isSuperAdmin, isClient, isStaff, myAccessRule]);

  // סינון משימות לפי הרשאות
  const filterTasks = useCallback((allTasks) => {
    if (!me || !Array.isArray(allTasks)) return [];
    
    // מנהלים ומנהלי פלוס רואים הכל
    if (isAdmin || isManagerPlus || isSuperAdmin) return allTasks;
    
    // עובדים רואים משימות של הפרויקטים והלקוחות המשויכים אליהם
    if (isStaff) {
      const assignedProjectIds = myAccessRule?.assigned_projects || [];
      const assignedClientIds = myAccessRule?.assigned_clients || [];
      
      return allTasks.filter(t => 
        (t.project_id && assignedProjectIds.includes(t.project_id)) ||
        (t.client_id && assignedClientIds.includes(t.client_id)) ||
        t.assigned_to === me?.email // משימות שהוקצו לו
      );
    }
    
    // לקוחות רואים משימות של הלקוח שלהם
    if (isClient && myAccessRule?.client_id) {
      return allTasks.filter(t => t.client_id === myAccessRule.client_id);
    }
    
    return [];
  }, [me, isAdmin, isManagerPlus, isSuperAdmin, isStaff, isClient, myAccessRule]);

  // סינון לוגי זמן לפי הרשאות
  const filterTimeLogs = useCallback((allLogs) => {
    if (!me || !Array.isArray(allLogs)) return [];
    
    // מנהלים ומנהלי פלוס רואים הכל
    if (isAdmin || isManagerPlus || isSuperAdmin) return allLogs;
    
    // עובדים רואים לוגים של הלקוחות המשויכים אליהם + הלוגים שלהם
    if (isStaff) {
      const assignedClientIds = myAccessRule?.assigned_clients || [];
      
      return allLogs.filter(log => 
        (log.client_id && assignedClientIds.includes(log.client_id)) ||
        log.created_by === me?.email // הלוגים שלו
      );
    }
    
    // לקוחות רואים לוגים של הלקוח שלהם
    if (isClient && myAccessRule?.client_id) {
      return allLogs.filter(log => log.client_id === myAccessRule.client_id);
    }
    
    return [];
  }, [me, isAdmin, isManagerPlus, isSuperAdmin, isStaff, isClient, myAccessRule]);

  // האם העובד יכול ליצור לקוח חדש?
  const canCreateClient = useCallback(() => {
    // מנהלים, מנהלי פלוס ועובדים יכולים ליצור לקוחות
    return isAdmin || isManagerPlus || isStaff;
  }, [isAdmin, isManagerPlus, isStaff]);

  // האם העובד יכול ליצור פרויקט חדש?
  const canCreateProject = useCallback(() => {
    // מנהלים, מנהלי פלוס ועובדים יכולים ליצור פרויקטים
    return isAdmin || isManagerPlus || isStaff;
  }, [isAdmin, isManagerPlus, isStaff]);


  // Cache לקוחות למניעת טעינה מיותרת
  const clientsCacheRef = useRef(null);
  const clientsCacheTimeRef = useRef(0);

  const getAllowedClientsForTimer = useCallback(async () => {
    try {
      // בדיקת Cache (2 דקות)
      const now = Date.now();
      if (clientsCacheRef.current && (now - clientsCacheTimeRef.current) < 2 * 60 * 1000) {
        console.log('✅ [ACCESS] Using cached clients for timer');
        return clientsCacheRef.current;
      }

      console.log('🔄 [ACCESS] Fetching clients for timer...');
      const allClients = await Client.list();
      const filtered = filterClients(allClients); // Use the memoized filterClients
      
      // שמירה ב-Cache
      clientsCacheRef.current = filtered;
      clientsCacheTimeRef.current = now;
      
      return filtered;
    } catch (error) {
      console.error('Error loading clients for timer:', error);
      
      // אם יש שגיאה ויש Cache ישן - השתמש בו
      if (clientsCacheRef.current) {
        console.log('⚠️ [ACCESS] Error loading clients, using old cache');
        return clientsCacheRef.current;
      }
      
      return [];
    }
  }, [filterClients]); // Dependency: filterClients

  const assignedClientsCount = useMemo(() => myAccessRule?.assigned_clients?.length || 0, [myAccessRule]);
  const assignedProjectsCount = useMemo(() => myAccessRule?.assigned_projects?.length || 0, [myAccessRule]);

  // The final return object of the hook, combining all derived values and functions
  return {
    me,
    loading,
    myAccessRule, // Expose the specific access rule for the user
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
    getAllowedClientsForTimer, // This is the new function with caching
    assignedClientsCount,
    assignedProjectsCount
  };
}

/**
 * רכיב לבדיקת הרשאות - מציג רק אם יש הרשאה
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
 * פונקציה לשיוך אוטומטי של לקוח/פרויקט חדש לעובד
 */
export async function autoAssignToCreator(itemType, itemId) {
  try {
    const user = await User.me();
    if (!user?.email) return;

    const accessRecords = await AccessControl.filter({
      email: user.email,
      active: true
    });

    const access = accessRecords[0];
    if (!access || access.role !== 'staff') return; // רק עובדים

    console.log('🔗 [AUTO ASSIGN] Assigning', itemType, itemId, 'to', user.email);

    // שיוך הפריט לעובד
    if (itemType === 'client') {
      const existingClients = access.assigned_clients || [];
      if (!existingClients.includes(itemId)) {
        await AccessControl.update(access.id, {
          assigned_clients: [...existingClients, itemId]
        });
        console.log('✅ [AUTO ASSIGN] Client assigned successfully');
      }
    } else if (itemType === 'project') {
      const existingProjects = access.assigned_projects || [];
      if (!existingProjects.includes(itemId)) {
        await AccessControl.update(access.id, {
          assigned_projects: [...existingProjects, itemId]
        });
        console.log('✅ [AUTO ASSIGN] Project assigned successfully');
      }
    }
  } catch (error) {
    console.error('❌ [AUTO ASSIGN] Error:', error);
  }
}
