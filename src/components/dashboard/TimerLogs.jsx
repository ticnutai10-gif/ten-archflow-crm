import React, { useState, useEffect } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Clock,
  Calendar,
  User,
  Search,
  Filter,
  Eye,
  BarChart3,
  Download,
  List,
  Table as TableIcon,
  Pencil,
  Trash2,
  CheckSquare,
  Square,
  Users,
  Mail,
  UserCircle,
  ChevronDown,
  Plus
} from 'lucide-react';
import { Table as UITable, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  format,
  isToday,
  isYesterday,
  startOfWeek,
  endOfWeek,
  isWithinInterval,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear
} from "date-fns";
import { he } from "date-fns/locale";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { TimeLog, Client } from "@/entities/all";
import { User as UserEntity } from "@/entities/User";

function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours === 0) {
    return `${minutes} דקות`;
  }
  return `${hours}:${minutes.toString().padStart(2, '0')} שעות`;
}

function getDateLabel(dateString) {
  const date = new Date(dateString);

  if (isToday(date)) return 'היום';
  if (isYesterday(date)) return 'אתמול';

  return format(date, 'dd/MM/yyyy', { locale: he });
}

// פונקציה לקבלת created_by מהלוג - תומך ב-created_by או created_by_id
function getCreatedBy(log) {
  const result = log.created_by || log.created_by_id || null;
  console.log('🔍 [TimerLogs] getCreatedBy:', { 
    logId: log.id, 
    created_by: log.created_by, 
    created_by_id: log.created_by_id,
    result 
  });
  return result;
}

// פונקציה לבדוק אם זה מייל
function isEmail(str) {
  const result = str && typeof str === 'string' && str.includes('@');
  console.log('📧 [TimerLogs] isEmail:', { str, result });
  return result;
}

import AddTimeLogDialog from "@/components/timelogs/AddTimeLogDialog";

export default function TimerLogs({ timeLogs, isLoading, onUpdate, clients = [] }) {
  console.log('🎬 [TimerLogs] Component rendered with:', {
    timeLogs,
    timeLogsType: typeof timeLogs,
    isArray: Array.isArray(timeLogs),
    timeLogsCount: timeLogs?.length || 0,
    isLoading,
    clientsCount: clients?.length || 0
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [clientFilter, setClientFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("all");
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [showStats, setShowStats] = useState(false);
  const [viewMode, setViewMode] = useState(() => {
    try {
      const saved = localStorage.getItem('timer-logs-view-mode') || 'list';
      console.log('💾 [TimerLogs] Loaded viewMode from localStorage:', saved);
      return saved;
    } catch {
      console.log('⚠️ [TimerLogs] Failed to load viewMode, using default');
      return 'list';
    }
  });
  const [summaryMode, setSummaryMode] = useState(false);
  const [summaryGranularity, setSummaryGranularity] = useState("day");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [editing, setEditing] = useState(null);
  const [editData, setEditData] = useState({ title: "", notes: "" });
  const [userIdToDataMap, setUserIdToDataMap] = useState({});
  
  // Add time log dialog state
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedClientForAdd, setSelectedClientForAdd] = useState(null);

  useEffect(() => {
    console.log('💾 [TimerLogs] Saving viewMode to localStorage:', viewMode);
    try {
      localStorage.setItem('timer-logs-view-mode', viewMode);
    } catch (e) {
      console.error("❌ [TimerLogs] Failed to save view mode to local storage:", e);
    }
  }, [viewMode]);

  // ✅ הגנה מלאה על timeLogs prop
  const safeTimeLogs = React.useMemo(() => {
    if (!timeLogs) {
      console.warn('⚠️ [TimerLogs] timeLogs is null/undefined');
      return [];
    }
    if (!Array.isArray(timeLogs)) {
      console.error('❌ [TimerLogs] timeLogs is not an array!', {
        type: typeof timeLogs,
        value: timeLogs
      });
      return [];
    }
    // Filter out invalid items
    const valid = timeLogs.filter(log => log && typeof log === 'object');
    console.log('✅ [TimerLogs] safeTimeLogs:', { 
      original: timeLogs.length, 
      valid: valid.length 
    });
    return valid;
  }, [timeLogs]);

  // טעינת מיפוי של user IDs למיילים ושמות
  useEffect(() => {
    const loadUserMapping = async () => {
      console.log('👥 [TimerLogs] 🚀 Starting loadUserMapping...');
      try {
        // קבלת כל ה-created_by הייחודיים
        const allCreatedBys = safeTimeLogs.map(log => getCreatedBy(log)).filter(Boolean);
        const uniqueCreatedBys = [...new Set(allCreatedBys)];

        console.log('👥 [TimerLogs] Extracted user data:', {
          totalLogs: safeTimeLogs.length,
          allCreatedBys: allCreatedBys.length,
          uniqueCreatedBys
        });

        if (uniqueCreatedBys.length === 0) {
          console.log('⚠️ [TimerLogs] No users to map');
          return;
        }

        console.log('📞 [TimerLogs] Calling UserEntity.list()...');
        const users = await UserEntity.list();
        console.log('✅ [TimerLogs] UserEntity.list() returned:', {
          count: users.length,
          users: users.map(u => ({ id: u.id, email: u.email, full_name: u.full_name }))
        });
        
        // יצירת מיפוי - גם לפי ID וגם לפי מייל
        const mapping = {};
        users.forEach(user => {
          const userData = {
            email: user.email || null,
            full_name: user.full_name || null
          };
          
          // מיפוי לפי ID
          if (user.id) {
            mapping[user.id] = userData;
          }
          
          // מיפוי גם לפי מייל
          if (user.email) {
            mapping[user.email] = userData;
          }
        });

        console.log('✅ [TimerLogs] User mapping created:', {
          mappingSize: Object.keys(mapping).length,
          mapping
        });
        
        setUserIdToDataMap(mapping);
      } catch (error) {
        console.error('❌ [TimerLogs] Error loading user mapping:', {
          error,
          message: error.message,
          stack: error.stack
        });
      }
    };

    if (safeTimeLogs.length > 0) {
      console.log('🎯 [TimerLogs] Triggering loadUserMapping (safeTimeLogs.length > 0)');
      loadUserMapping();
    } else {
      console.log('⏭️ [TimerLogs] Skipping loadUserMapping (no timeLogs)');
    }
  }, [safeTimeLogs]);

  // פונקציה לקבלת מייל מ-ID או מייל
  const getUserEmail = (idOrEmail) => {
    if (!idOrEmail) return null;
    
    // אם יש מיפוי, השתמש בו (יעבוד גם עבור ID וגם עבור מייל)
    if (userIdToDataMap[idOrEmail]?.email) {
      return userIdToDataMap[idOrEmail].email;
    }
    
    // אם זה מייל, החזר אותו
    if (isEmail(idOrEmail)) {
      return idOrEmail;
    }
    
    return idOrEmail;
  };

  // פונקציה לקבלת שם מלא מ-ID או מייל
  const getUserFullName = (idOrEmail) => {
    if (!idOrEmail) return null;
    
    // השתמש במיפוי שיכול לעבוד גם עם ID וגם עם מייל
    return userIdToDataMap[idOrEmail]?.full_name || null;
  };

  // פונקציה לקבלת שם תצוגה - מעדיף שם מלא, אחרת חלק מהמייל
  const getUserDisplayName = (idOrEmail) => {
    const fullName = getUserFullName(idOrEmail);
    if (fullName) {
      return fullName;
    }
    
    const email = getUserEmail(idOrEmail);
    if (!email) {
      return 'לא ידוע';
    }
    if (isEmail(email)) {
      return email.split('@')[0];
    }
    return String(email);
  };

  const toggleSelect = (id) => {
    console.log('☑️ [TimerLogs] toggleSelect:', { id, currentSelected: selectedIds });
    setSelectedIds((prev) => {
      const newSelected = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      console.log('☑️ [TimerLogs] toggleSelect → new selection:', newSelected);
      return newSelected;
    });
  };

  const selectAll = () => {
    console.log('☑️ [TimerLogs] selectAll called');
    const all = filteredLogs.map(l => l.id);
    const isAllSelected = selectedIds.length === all.length && all.length > 0 && selectedIds.every(id => all.includes(id));
    const newSelection = isAllSelected ? [] : all;
    console.log('☑️ [TimerLogs] selectAll:', { all, isAllSelected, newSelection });
    setSelectedIds(newSelection);
  };

  const deleteOne = async (id) => {
    console.log('🗑️ [TimerLogs] deleteOne called:', { id });
    if (!confirm("למחוק רישום זמן זה?")) {
      console.log('🗑️ [TimerLogs] deleteOne cancelled by user');
      return;
    }
    try {
      console.log('🗑️ [TimerLogs] Calling TimeLog.delete...');
      await TimeLog.delete(id);
      console.log('✅ [TimerLogs] TimeLog deleted successfully');
      onUpdate && onUpdate();
      setSelectedIds(prev => prev.filter(x => x !== id));
    } catch (error) {
      console.error('❌ [TimerLogs] Error deleting TimeLog:', error);
    }
  };

  const bulkDelete = async () => {
    console.log('🗑️ [TimerLogs] bulkDelete called:', { selectedCount: selectedIds.length });
    if (selectedIds.length === 0) {
      console.log('🗑️ [TimerLogs] bulkDelete - no items selected');
      return;
    }
    
    const allSelectedInFilter = selectedIds.length === filteredLogs.length && 
                                filteredLogs.length > 0 && 
                                selectedIds.every(id => filteredLogs.map(l => l.id).includes(id));

    let confirmationMessage = `למחוק ${selectedIds.length} רישומים?`;
    if (allSelectedInFilter) {
      confirmationMessage = `נבחרו כל ${selectedIds.length} הרישומים המוצגים למחיקה. להמשיך?`;
    }

    console.log('🗑️ [TimerLogs] bulkDelete confirmation:', { 
      allSelectedInFilter, 
      confirmationMessage 
    });

    if (!confirm(confirmationMessage)) {
      console.log('🗑️ [TimerLogs] bulkDelete cancelled by user');
      return;
    }

    console.log('🗑️ [TimerLogs] Starting bulk delete...');
    const results = await Promise.allSettled(selectedIds.map((id) => TimeLog.delete(id)));

    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(`❌ [TimerLogs] Failed to delete log ID ${selectedIds[index]}:`, result.reason);
      } else {
        console.log(`✅ [TimerLogs] Successfully deleted log ID ${selectedIds[index]}`);
      }
    });

    setSelectedIds([]);
    setSelectionMode(false);
    onUpdate && onUpdate();
    console.log('✅ [TimerLogs] bulkDelete completed');
  };

  const openEdit = (log) => {
    console.log('✏️ [TimerLogs] openEdit:', log);
    const hours = Math.floor((log.duration_seconds || 0) / 3600);
    const minutes = Math.floor(((log.duration_seconds || 0) % 3600) / 60);
    setEditing(log);
    setEditData({ 
      title: log.title || "", 
      notes: log.notes || "",
      hours: String(hours),
      minutes: String(minutes)
    });
  };

  const saveEdit = async () => {
    console.log('💾 [TimerLogs] saveEdit called:', { editing, editData });
    if (!editing) {
      console.log('💾 [TimerLogs] saveEdit - no editing log');
      return;
    }
    
    const hours = parseInt(editData.hours || '0', 10);
    const minutes = parseInt(editData.minutes || '0', 10);
    const totalSeconds = (hours * 3600) + (minutes * 60);
    
    if (totalSeconds <= 0) {
      alert('יש להזין זמן גדול מ-0');
      return;
    }
    
    try {
      console.log('💾 [TimerLogs] Calling TimeLog.update...');
      await TimeLog.update(editing.id, { 
        title: editData.title, 
        notes: editData.notes,
        duration_seconds: totalSeconds
      });
      console.log('✅ [TimerLogs] TimeLog updated successfully');
      setEditing(null);
      onUpdate && onUpdate();
    } catch (error) {
      console.error('❌ [TimerLogs] Error updating TimeLog:', error);
    }
  };

  // ✅ הגנה על uniqueClients
  const uniqueClients = React.useMemo(() => {
    const clients = [...new Set(safeTimeLogs.map(log => log?.client_name))].filter(Boolean);
    console.log('👥 [TimerLogs] uniqueClients:', { count: clients.length, clients });
    return clients;
  }, [safeTimeLogs]);

  // קבלת רשימת משתמשים ייחודיים עם פרטים מלאים
  const allUsers = React.useMemo(() => {
    console.log('👥 [TimerLogs] 🔄 Computing allUsers...');
    const uniqueIds = [...new Set(safeTimeLogs.map(log => getCreatedBy(log)))].filter(Boolean);

    console.log('👥 [TimerLogs] Found unique user IDs/Emails:', {
      count: uniqueIds.length,
      ids: uniqueIds
    });

    const users = uniqueIds.map(idOrEmail => {
      const userLogs = safeTimeLogs.filter(l => getCreatedBy(l) === idOrEmail);
      const totalSeconds = userLogs.reduce((sum, log) => sum + (log?.duration_seconds || 0), 0);
      const email = getUserEmail(idOrEmail);
      const fullName = getUserFullName(idOrEmail);
      
      const user = {
        id: idOrEmail,
        email: email,
        full_name: fullName,
        name: getUserDisplayName(idOrEmail),
        totalHours: totalSeconds / 3600,
        sessionsCount: userLogs.length,
        clients: [...new Set(userLogs.map(l => l?.client_name).filter(Boolean))]
      };

      console.log('👥 [TimerLogs] Created user object:', user);
      return user;
    }).sort((a, b) => b.totalHours - a.totalHours);

    console.log('👥 [TimerLogs] ✅ allUsers computed:', {
      count: users.length,
      users
    });

    return users;
  }, [safeTimeLogs, userIdToDataMap]);

  // ✅ הגנה על filteredUsers
  const filteredUsers = React.useMemo(() => {
    if (!userSearchTerm) return allUsers;
    
    return allUsers.filter(user => {
      const matches = user?.email?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                     user?.name?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                     user?.full_name?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                     user?.id?.toLowerCase().includes(userSearchTerm.toLowerCase());
      return matches;
    });
  }, [allUsers, userSearchTerm]);

  console.log('🔍 [TimerLogs] filteredUsers:', { count: filteredUsers.length });

  // ✅ הגנה על filteredLogs
  const filteredLogs = React.useMemo(() => {
    return safeTimeLogs.filter(log => {
      if (!log || typeof log !== 'object') return false;
      
      const matchesSearch = log.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           log.title?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesClient = clientFilter === "all" || log.client_name === clientFilter;
      const matchesUser = userFilter === "all" || getCreatedBy(log) === userFilter;

      let matchesTime = true;
      if (timeFilter !== "all" && log.log_date) {
        const logDate = new Date(log.log_date);
        const now = new Date();

        switch (timeFilter) {
          case 'today':
            matchesTime = isToday(logDate);
            break;
          case 'week':
            matchesTime = isWithinInterval(logDate, {
              start: startOfWeek(now, { weekStartsOn: 0 }),
              end: endOfWeek(now, { weekStartsOn: 0 })
            });
            break;
          case 'month':
            matchesTime = logDate.getMonth() === now.getMonth() &&
                        logDate.getFullYear() === now.getFullYear();
            break;
          default:
            break;
        }
      }

      const result = matchesSearch && matchesClient && matchesUser && matchesTime;
      if (!result) {
        // console.log('🔍 [TimerLogs] Log filtered out:', { 
        //   logId: log.id, 
        //   matchesSearch, 
        //   matchesClient, 
        //   matchesUser, 
        //   matchesTime 
        // });
      }
      return result;
    });
  }, [safeTimeLogs, searchTerm, clientFilter, userFilter, timeFilter]);

  console.log('🔍 [TimerLogs] filteredLogs:', { 
    count: filteredLogs.length,
    filters: { searchTerm, clientFilter, userFilter, timeFilter }
  });

  // ✅ הגנה על totalTime
  const totalTime = React.useMemo(() => {
    return filteredLogs.reduce((sum, log) => sum + (log?.duration_seconds || 0), 0);
  }, [filteredLogs]);

  // ✅ הגנה על clientStats
  const clientStats = React.useMemo(() => {
    return uniqueClients.map(clientName => {
      const clientLogs = filteredLogs.filter(log => log?.client_name === clientName);
      const clientTime = clientLogs.reduce((sum, log) => sum + (log?.duration_seconds || 0), 0);
      const client = clients.find(c => c.name === clientName);
      return {
        clientName,
        clientId: client?.id || null,
        time: clientTime,
        sessions: clientLogs.length
      };
    }).sort((a, b) => b.time - a.time);
  }, [uniqueClients, filteredLogs, clients]);

  // ✅ הגנה על userStats
  const userStats = React.useMemo(() => {
    return allUsers
      .map(user => {
        const userLogs = filteredLogs.filter(log => getCreatedBy(log) === user.id);
        const userTime = userLogs.reduce((sum, log) => sum + (log?.duration_seconds || 0), 0);
        return {
          ...user,
          filteredHours: userTime / 3600,
          filteredSessions: userLogs.length
        };
      })
      .filter(user => user.filteredSessions > 0)
      .sort((a, b) => b.filteredHours - a.filteredHours);
  }, [allUsers, filteredLogs]);

  // Build summary columns
  const getSummaryColumns = () => {
    const now = new Date();
    const cols = [];
    if (summaryGranularity === "day") {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        cols.push({
          key: format(d, 'yyyy-MM-dd'),
          label: format(d, 'dd/MM', { locale: he }),
          start: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0),
          end: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)
        });
      }
    } else if (summaryGranularity === "week") {
      const startOfCurrentWeek = startOfWeek(now, { weekStartsOn: 0 });
      for (let i = 7; i >= 0; i--) {
        const dateForWeek = new Date(startOfCurrentWeek);
        dateForWeek.setDate(startOfCurrentWeek.getDate() - (i * 7));

        const start = startOfWeek(dateForWeek, { weekStartsOn: 0 });
        const end = endOfWeek(dateForWeek, { weekStartsOn: 0 });
        cols.push({
          key: format(start, 'yyyy-MM-dd'),
          label: `שבוע ${format(start, 'dd/MM', { locale: he })}`,
          start: start,
          end: end,
        });
      }
    } else if (summaryGranularity === "month") {
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const start = startOfMonth(d);
        const end = endOfMonth(d);
        cols.push({
          key: format(start, 'yyyy-MM'),
          label: format(start, 'MMM yyyy', { locale: he }),
          start: start,
          end: end
        });
      }
    } else { // Year granularity
      for (let i = 4; i >= 0; i--) {
        const d = new Date(now.getFullYear() - i, 0, 1);
        const start = startOfYear(d);
        const end = endOfYear(d);
        cols.push({
          key: format(start, 'yyyy'),
          label: format(start, 'yyyy'),
          start: start,
          end: end
        });
      }
    }
    return cols;
  };

  const summaryColumns = getSummaryColumns();

  // Changed from useMemo to direct calculation as per outline, ensuring it still reacts to changes
  const summaryRows = (() => {
    if (!summaryMode) return [];
    const rowsMap = new Map();

    const clientsInFilteredLogs = [...new Set(filteredLogs.map(l => l?.client_name))].filter(Boolean);
    clientsInFilteredLogs.forEach(name => {
      rowsMap.set(name, { clientName: name, totals: Object.fromEntries(summaryColumns.map(c => [c.key, 0])), total: 0 });
    });

    filteredLogs.forEach(log => {
      const row = rowsMap.get(log?.client_name);
      if (!row) return;
      const logDate = new Date(log.log_date);

      for (const col of summaryColumns) {
        if (isWithinInterval(logDate, { start: col.start, end: col.end })) {
          row.totals[col.key] += (log?.duration_seconds || 0);
          row.total += (log?.duration_seconds || 0);
          break;
        }
      }
    });

    return Array.from(rowsMap.values()).sort((a, b) => b.total - a.total);
  })();

  if (isLoading) {
    console.log('⏳ [TimerLogs] Rendering loading state...');
    return (
      <div className="p-6 h-[400px] overflow-y-auto">
        <div className="space-y-3">
          {Array(5).fill(0).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-16 bg-slate-200 rounded-lg"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  console.log('🎨 [TimerLogs] Rendering main component...');

  return (
    <div className="flex flex-col" style={{ minHeight: '400px', maxHeight: '600px' }}>
      {/* מידע על המצב */}
      {safeTimeLogs.length === 0 ? (
        <div className="p-4 text-center text-slate-500">אין רישומי זמן</div>
      ) : allUsers.length === 0 ? (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mx-4 mt-4">
          <p className="font-semibold text-yellow-800 text-center">⚠️ יש {safeTimeLogs.length} רישומי זמן אבל אין משתמשים</p>
          <p className="text-sm text-yellow-700 text-center mt-2">
            כל הרישומים חסרים את השדה created_by
          </p>
        </div>
      ) : null}

      {/* כלי בקרה - שורה אחת קומפקטית */}
      <div className="flex-shrink-0 bg-white border-b border-slate-200">
        <div className="flex items-center gap-2 p-3 flex-wrap">
          {/* חיפוש */}
          <div className="relative w-48">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="חיפוש..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10 h-9 text-sm"
            />
          </div>

          {/* פילטר לקוחות */}
          <Select value={clientFilter} onValueChange={setClientFilter}>
            <SelectTrigger className="w-40 h-9" title="לקוח">
              <SelectValue placeholder="כל הלקוחות" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל הלקוחות</SelectItem>
              {uniqueClients.map(client => (
                <SelectItem key={client} value={client}>{client}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* פילטר משתמשים */}
          <Select value={userFilter} onValueChange={setUserFilter}>
            <SelectTrigger className="w-40 h-9" title="משתמש">
              <SelectValue placeholder="כל העובדים" />
            </SelectTrigger>
            <SelectContent className="w-80">
              <div className="p-2 border-b sticky top-0 bg-white z-10">
                <div className="relative">
                  <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="חפש משתמש..."
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                    className="pr-8 h-9 text-sm"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>

              <SelectItem value="all">
                <div className="flex items-center gap-2 py-1">
                  <Users className="w-4 h-4 text-slate-500" />
                  <div>
                    <div className="font-medium">כל המשתמשים</div>
                    <div className="text-xs text-slate-500">{allUsers.length} משתמשים</div>
                  </div>
                </div>
              </SelectItem>

              {allUsers.length === 0 ? (
                <div className="p-4 text-center text-slate-500 text-sm">
                  <p className="font-semibold mb-2">⚠️ אין משתמשים</p>
                  <p className="text-xs">לא נמצאו רישומי זמן עם created_by</p>
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto">
                  {filteredUsers.length === 0 ? (
                    <div className="p-4 text-center text-slate-500 text-sm">
                      אין תוצאות
                    </div>
                  ) : (
                    filteredUsers.map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        <div className="flex items-center gap-3 py-1">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="text-xs bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                              {user.name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">{user.full_name || user.name}</div>
                            <div className="text-xs text-slate-500 truncate">{user.email || user.id}</div>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-[10px] px-1 py-0">
                                {Math.round(user.totalHours * 10) / 10}ש׳
                              </Badge>
                              <Badge variant="outline" className="text-[10px] px-1 py-0">
                                {user.clients.length} לקוחות
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </div>
              )}
            </SelectContent>
          </Select>

          {/* פילטר זמן */}
          <Select value={timeFilter} onValueChange={setTimeFilter}>
            <SelectTrigger className="w-40 h-9" title="תקופה">
              <SelectValue placeholder="כל התקופות" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל התקופות</SelectItem>
              <SelectItem value="today">היום</SelectItem>
              <SelectItem value="week">השבוע</SelectItem>
              <SelectItem value="month">החודש</SelectItem>
            </SelectContent>
          </Select>

          {/* מפריד */}
          <div className="h-6 w-px bg-slate-300"></div>

          {/* סטטיסטיקות */}
          <Button
            variant={showStats ? "default" : "ghost"}
            size="icon"
            onClick={() => setShowStats(!showStats)}
            title={showStats ? 'הסתר סטטיסטיקות' : 'הצג סטטיסטיקות'}
            className="h-9 w-9"
          >
            <BarChart3 className="w-4 h-4" />
          </Button>

          {/* תצוגות */}
          <div className="flex items-center gap-0.5 bg-slate-100 rounded-md p-0.5">
            <Button
              variant={!summaryMode && viewMode === 'list' ? 'default' : 'ghost'}
              size="icon"
              className={!summaryMode && viewMode === 'list' ? 'h-8 w-8 bg-slate-900 text-white' : 'h-8 w-8'}
              onClick={() => { setSummaryMode(false); setViewMode('list'); }}
              title="רשימה"
            >
              <List className="w-4 h-4" />
            </Button>
            <Button
              variant={!summaryMode && viewMode === 'table' ? 'default' : 'ghost'}
              size="icon"
              className={!summaryMode && viewMode === 'table' ? 'h-8 w-8 bg-slate-900 text-white' : 'h-8 w-8'}
              onClick={() => { setSummaryMode(false); setViewMode('table'); }}
              title="טבלה"
            >
              <TableIcon className="w-4 h-4" />
            </Button>
          </div>

          {/* סיכום */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-md p-0.5">
            <Button
              variant={summaryMode ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSummaryMode((v) => !v)}
              title="סיכום"
              className="h-8 px-2 text-xs"
            >
              סיכום
            </Button>
            <Select value={summaryGranularity} onValueChange={setSummaryGranularity}>
              <SelectTrigger className="w-20 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">יום</SelectItem>
                <SelectItem value="week">שבוע</SelectItem>
                <SelectItem value="month">חודש</SelectItem>
                <SelectItem value="year">שנה</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* מפריד */}
          <div className="h-6 w-px bg-slate-300"></div>

          {/* בחירה */}
          <Button
            variant={selectionMode ? "default" : "ghost"}
            size="icon"
            onClick={() => { setSelectionMode(v => !v); setSelectedIds([]); }}
            className={selectionMode ? "h-9 w-9 bg-purple-600 hover:bg-purple-700 text-white" : "h-9 w-9"}
            title={selectionMode ? 'בטל בחירה' : 'בחירה מרובה'}
          >
            {selectionMode ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
          </Button>
          
          {selectionMode && (
            <>
              <Button variant="outline" size="sm" onClick={selectAll} className="h-9 text-xs px-2">
                בחר הכל
              </Button>
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={bulkDelete} 
                disabled={selectedIds.length === 0}
                className="h-9 text-xs px-2"
              >
                <Trash2 className="w-3 h-3 ml-1" />
                {selectedIds.length > 0 && `(${selectedIds.length})`}
              </Button>
            </>
          )}

          {/* סה"כ רישומים */}
          <div className="mr-auto text-xs text-slate-500 font-medium">
            {filteredLogs.length} / {safeTimeLogs.length}
          </div>
        </div>
      </div>

      {/* סטטיסטיקות משתמשים */}
      {showStats && userFilter === "all" && userStats.length > 0 && (
        <div className="flex-shrink-0 mx-4 mb-4 p-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border border-blue-200">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-semibold text-slate-800 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              פילוח לפי משתמשים
            </h4>
            <div className="text-sm text-slate-600">
              {userStats.length} משתמשים פעילים
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-h-64 overflow-y-auto">
            {userStats.slice(0, 9).map(user => (
              <div key={user.id} className="bg-white p-3 rounded-lg border border-slate-200 hover:shadow-md transition-all group relative">
                <div className="flex items-start gap-3">
                  <Avatar className="w-10 h-10 flex-shrink-0">
                    <AvatarFallback className="text-sm font-bold bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                      {user.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-800 truncate">{user.full_name || user.name}</div>
                    <div className="text-xs text-slate-500 truncate">{user.email || user.id}</div>
                    <div className="mt-2 flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        <Clock className="w-3 h-3 ml-1" />
                        {formatDuration(user.filteredHours * 3600)}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {user.filteredSessions} רישומים
                      </Badge>
                    </div>
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute left-2 top-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity bg-blue-50 hover:bg-blue-100"
                  onClick={() => {
                    setSelectedClientForAdd(null);
                    setShowAddDialog(true);
                  }}
                  title="הוסף רישום זמן"
                >
                  <Plus className="w-4 h-4 text-blue-600" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* סטטיסטיקות לקוחות */}
      {showStats && clientFilter === "all" && (
        <div className="flex-shrink-0 mx-4 mb-4 p-4 bg-slate-50 rounded-lg space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="font-semibold text-slate-800">סטטיסטיקות מהירות</h4>
            <div className="text-2xl font-bold text-blue-600">
              {formatDuration(totalTime)}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {clientStats.slice(0, 3).map(stat => (
              <div key={stat.clientName} className="bg-white p-3 rounded-lg border hover:shadow-md transition-all group relative">
                <div className="font-medium text-slate-800 truncate">{stat.clientName}</div>
                <div className="text-sm text-slate-600">{formatDuration(stat.time)}</div>
                <div className="text-xs text-slate-500">{stat.sessions} פעילויות</div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute left-2 top-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity bg-blue-50 hover:bg-blue-100"
                  onClick={() => {
                    const client = clients.find(c => c.name === stat.clientName);
                    setSelectedClientForAdd(client);
                    setShowAddDialog(true);
                  }}
                  title="הוסף רישום זמן"
                >
                  <Plus className="w-4 h-4 text-blue-600" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 py-2">
        {/* Summary table mode */}
        {summaryMode ? (
          <div className="bg-white border border-slate-200 rounded-lg overflow-auto">
            <UITable>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right min-w-[180px]">לקוח</TableHead>
                  {summaryColumns.map(col => (
                    <TableHead key={col.key} className="text-right whitespace-nowrap">{col.label}</TableHead>
                  ))}
                  <TableHead className="text-right">סה״כ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summaryRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={summaryColumns.length + 2} className="text-center text-slate-500 py-10">
                      אין נתונים לתצוגה עבור הפילטרים הנוכחיים.
                    </TableCell>
                  </TableRow>
                ) : (
                  summaryRows.map(row => (
                    <TableRow key={row.clientName} className="group">
                     <TableCell className="font-medium">
                       <div className="flex items-center gap-2">
                         <Link
                           to={`${createPageUrl("Clients")}?open=details&client_name=${encodeURIComponent(row.clientName || "")}&tab=timelogs`}
                           className="hover:text-blue-600 transition-colors flex-1"
                         >
                           {row.clientName}
                         </Link>
                         <Button
                           size="icon"
                           variant="ghost"
                           className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                           onClick={() => {
                             const client = clients.find(c => c.name === row.clientName);
                             setSelectedClientForAdd(client);
                             setShowAddDialog(true);
                           }}
                           title="הוסף רישום זמן"
                         >
                           <Plus className="w-3 h-3 text-blue-600" />
                         </Button>
                       </div>
                     </TableCell>
                      {summaryColumns.map(col => (
                        <TableCell key={col.key} className="whitespace-nowrap">{formatDuration(row.totals[col.key] || 0)}</TableCell>
                      ))}
                      <TableCell className="font-bold text-blue-600">{formatDuration(row.total)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </UITable>
          </div>
        ) : (
          <>
            {filteredLogs.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Clock className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p>אין רישומי זמן להצגה</p>
                {searchTerm && (
                  <p className="text-sm mt-2">נסה לשנות את החיפוש או הפילטרים</p>
                )}
              </div>
            ) : viewMode === 'table' ? (
              <div className="bg-white border border-slate-200 rounded-lg overflow-auto">
                <UITable>
                  <TableHeader>
                    <TableRow>
                      {selectionMode && <TableHead className="text-right w-10"></TableHead>}
                      <TableHead className="text-right">משתמש</TableHead>
                      <TableHead className="text-right">לקוח</TableHead>
                      <TableHead className="text-right">תאריך</TableHead>
                      <TableHead className="text-right">כותרת</TableHead>
                      <TableHead className="text-right">הערות</TableHead>
                      <TableHead className="text-right">משך</TableHead>
                      <TableHead className="text-right">פעולות</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log) => (
                      <TableRow key={log.id}>
                        {selectionMode && (
                          <TableCell>
                            <button onClick={() => toggleSelect(log.id)} title="בחר/בטל" className="p-1">
                              {selectedIds.includes(log.id) ? <CheckSquare className="w-4 h-4 text-purple-600" /> : <Square className="w-4 h-4 text-slate-500" />}
                            </button>
                          </TableCell>
                        )}
                        <TableCell className="whitespace-nowrap group">
                          <div className="flex items-center gap-2">
                            <Avatar className="w-6 h-6">
                              <AvatarFallback className="text-[10px] bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                                {getUserDisplayName(getCreatedBy(log)).substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <Link
                              to={`${createPageUrl("Clients")}?open=details&client_name=${encodeURIComponent(log.client_name || "")}&tab=timelogs`}
                              className="text-slate-600 text-sm flex-1 hover:text-blue-600 transition-colors"
                              onClick={() => {
                                console.log('🖱️ [TimerLogs] User link clicked:', {
                                  userName: getUserDisplayName(getCreatedBy(log)),
                                  clientName: log.client_name,
                                  targetURL: `${createPageUrl("Clients")}?open=details&client_name=${encodeURIComponent(log.client_name || "")}&tab=time`
                                });
                              }}
                            >
                              {getUserDisplayName(getCreatedBy(log))}
                            </Link>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => {
                                setSelectedClientForAdd(null);
                                setShowAddDialog(true);
                              }}
                              title="הוסף רישום זמן"
                            >
                              <Plus className="w-3 h-3 text-blue-600" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <User className="w-3 h-3" />
                            <Link
                              to={`${createPageUrl("Clients")}?open=details&client_name=${encodeURIComponent(log.client_name || "")}&tab=timelogs`}
                              className="hover:text-blue-600 transition-colors flex-1"
                            >
                              {log.client_name}
                            </Link>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => {
                                const client = clients.find(c => c.name === log.client_name);
                                setSelectedClientForAdd(client);
                                setShowAddDialog(true);
                              }}
                              title="הוסף רישום זמן"
                            >
                              <Plus className="w-3 h-3 text-blue-600" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{getDateLabel(log.log_date)}</TableCell>
                        <TableCell className="max-w-[280px] truncate">{log.title || '—'}</TableCell>
                        <TableCell className="max-w-[360px] truncate text-slate-600">{log.notes || ''}</TableCell>
                        <TableCell className="whitespace-nowrap group/duration">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{formatDuration(log.duration_seconds)}</span>
                            <button
                              onClick={() => openEdit(log)}
                              className="opacity-0 group-hover/duration:opacity-100 transition-opacity p-1 hover:bg-blue-50 rounded"
                              title="ערוך משך זמן"
                            >
                              <Clock className="w-4 h-4 text-blue-600" />
                            </button>
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openEdit(log)} title="ערוך">
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => deleteOne(log.id)} title="מחק" className="text-red-600 hover:text-red-700">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell colSpan={selectionMode ? 6 : 5} className="text-left font-semibold">סה״כ</TableCell>
                      <TableCell className="font-bold text-blue-600">{formatDuration(totalTime)}</TableCell>
                      <TableCell />
                    </TableRow>
                  </TableBody>
                </UITable>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredLogs.map((log) => (
                  <div key={log.id} className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md transition-all relative group">
                    {selectionMode && (
                      <button
                        onClick={() => toggleSelect(log.id)}
                        className="absolute top-3 left-3 bg-white rounded border p-1 z-10"
                        title={selectedIds.includes(log.id) ? "בטל בחירה" : "בחר"}
                      >
                        {selectedIds.includes(log.id) ? <CheckSquare className="w-4 h-4 text-purple-600" /> : <Square className="w-4 h-4 text-slate-500" />}
                      </button>
                    )}
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-semibold text-slate-900">{log.title || 'פעילות ללא כותרת'}</h4>
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 group/badge relative">
                            {formatDuration(log.duration_seconds)}
                            <button
                              onClick={() => openEdit(log)}
                              className="absolute -left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover/badge:opacity-100 transition-opacity p-0.5 bg-white rounded-full shadow-sm hover:shadow-md"
                              title="ערוך משך זמן"
                            >
                              <Clock className="w-3 h-3 text-blue-600" />
                            </button>
                          </Badge>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-slate-600 mb-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <Avatar className="w-5 h-5">
                              <AvatarFallback className="text-[10px] bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                                {getUserDisplayName(getCreatedBy(log)).substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <Link
                              to={`${createPageUrl("Clients")}?open=details&client_name=${encodeURIComponent(log.client_name || "")}&tab=timelogs`}
                              className="truncate max-w-[180px] hover:text-blue-600 transition-colors"
                              onClick={() => {
                                console.log('🖱️ [TimerLogs] User link clicked (list view):', {
                                  userName: getUserDisplayName(getCreatedBy(log)),
                                  clientName: log.client_name,
                                  targetURL: `${createPageUrl("Clients")}?open=details&client_name=${encodeURIComponent(log.client_name || "")}&tab=time`
                                });
                              }}
                            >
                              {getUserDisplayName(getCreatedBy(log))}
                            </Link>
                          </div>
                          <div className="flex items-center gap-2">
                            <User className="w-3 h-3" />
                            <Link
                              to={`${createPageUrl("Clients")}?open=details&client_name=${encodeURIComponent(log.client_name || "")}&tab=timelogs`}
                              className="hover:text-blue-600 transition-colors"
                            >
                              {log.client_name}
                            </Link>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => {
                                const client = clients.find(c => c.name === log.client_name);
                                setSelectedClientForAdd(client);
                                setShowAddDialog(true);
                              }}
                              title="הוסף רישום זמן נוסף ללקוח זה"
                            >
                              <Plus className="w-3 h-3 text-blue-600" />
                            </Button>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>{getDateLabel(log.log_date)}</span>
                          </div>
                        </div>

                        {log.notes && (
                          <div className="mt-2">
                            <details className="group">
                              <summary className="text-sm text-slate-600 bg-slate-50 p-2 rounded cursor-pointer hover:bg-slate-100 transition-colors list-none flex items-center justify-between">
                                <span className="truncate flex-1">{log.notes}</span>
                                <ChevronDown className="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform flex-shrink-0 mr-2" />
                              </summary>
                              <div className="mt-2 text-sm text-slate-600 bg-slate-50 p-3 rounded border border-slate-200">
                                {log.notes}
                              </div>
                            </details>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(log)} title="ערוך">
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => deleteOne(log.id)} title="מחק" className="text-red-600 hover:text-red-700">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {filteredLogs.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-200">
                <div className="flex justify-between items-center text-sm text-slate-600">
                  <span>{filteredLogs.length} רישומי זמן</span>
                  <span className="font-semibold">סה"כ: {formatDuration(totalTime)}</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Edit dialog */}
      {editing && (
        <Dialog open={true} onOpenChange={() => setEditing(null)}>
          <DialogContent dir="rtl" className="sm:max-w-[500px]">
            <DialogHeader className="px-6 pt-6">
              <DialogTitle>עריכת רישום זמן</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 px-6 py-4">
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-2 block">כותרת</label>
                <Input value={editData.title} onChange={(e) => setEditData(d => ({ ...d, title: e.target.value }))} />
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700 mb-2 block">משך זמן</label>
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-start flex-1">
                    <Input
                      value={editData.hours}
                      onChange={(e) => setEditData(d => ({ ...d, hours: e.target.value.replace(/\D/g, '').slice(0, 2) }))}
                      className="w-full h-12 text-center text-lg font-bold"
                      placeholder="00"
                      maxLength={2}
                    />
                    <span className="text-xs text-slate-600 mt-1 font-medium">שעות</span>
                  </div>
                  <span className="text-2xl font-bold text-blue-600 mt-[-20px]">:</span>
                  <div className="flex flex-col items-start flex-1">
                    <Input
                      value={editData.minutes}
                      onChange={(e) => setEditData(d => ({ ...d, minutes: e.target.value.replace(/\D/g, '').slice(0, 2) }))}
                      className="w-full h-12 text-center text-lg font-bold"
                      placeholder="00"
                      maxLength={2}
                    />
                    <span className="text-xs text-slate-600 mt-1 font-medium">דקות</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700 mb-2 block">הערות</label>
                <Textarea value={editData.notes} onChange={(e) => setEditData(d => ({ ...d, notes: e.target.value }))} className="min-h-[80px]" />
              </div>
            </div>
            <DialogFooter className="gap-2 px-6 pb-6">
              <Button variant="outline" onClick={() => setEditing(null)}>ביטול</Button>
              <Button onClick={saveEdit}>שמור שינויים</Button>
            </DialogFooter>
            </DialogContent>
            </Dialog>
            )}

      {/* Added total summary at the bottom */}
      <div className="flex-shrink-0 p-4 text-sm text-slate-600 border-t border-slate-200 mt-auto">
        <span className="font-medium text-slate-800">{allUsers.length}</span> משתמשים • <span className="font-medium text-slate-800">{safeTimeLogs.length}</span> רישומים
      </div>

      {/* Add Time Log Dialog */}
      <AddTimeLogDialog
        open={showAddDialog}
        onClose={() => {
          setShowAddDialog(false);
          setSelectedClientForAdd(null);
        }}
        preselectedClient={selectedClientForAdd}
        clients={clients}
        timeLogs={safeTimeLogs}
        onSuccess={onUpdate}
      />
    </div>
  );
}