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
  UserCircle
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
import { TimeLog } from "@/entities/all";
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

function getCreatedBy(log) {
  const result = log.created_by || log.created_by_id || null;
  return result;
}

function isEmail(str) {
  return str && typeof str === 'string' && str.includes('@');
}

export default function TimerLogs({ timeLogs, isLoading, onUpdate }) {
  // ✅ הגנה מלאה על timeLogs
  const safeTimeLogs = React.useMemo(() => {
    if (!timeLogs) {
      console.warn('⚠️ [TimerLogs] timeLogs is null/undefined');
      return [];
    }
    if (!Array.isArray(timeLogs)) {
      console.error('❌ [TimerLogs] timeLogs is not an array!', timeLogs);
      return [];
    }
    return timeLogs.filter(log => log && typeof log === 'object');
  }, [timeLogs]);

  const [searchTerm, setSearchTerm] = useState("");
  const [clientFilter, setClientFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("all");
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [showStats, setShowStats] = useState(false);
  const [viewMode, setViewMode] = useState(() => {
    try {
      const saved = localStorage.getItem('timer-logs-view-mode') || 'list';
      return saved;
    } catch {
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

  useEffect(() => {
    try {
      localStorage.setItem('timer-logs-view-mode', viewMode);
    } catch (e) {
      console.error("Failed to save view mode:", e);
    }
  }, [viewMode]);

  useEffect(() => {
    const loadUserMapping = async () => {
      try {
        const allCreatedBys = safeTimeLogs.map(log => getCreatedBy(log)).filter(Boolean);
        const userIds = [...new Set(allCreatedBys)].filter(id => !isEmail(id));

        if (userIds.length === 0) return;

        const users = await UserEntity.list();
        const mapping = {};
        users.forEach(user => {
          if (user.id) {
            mapping[user.id] = {
              email: user.email || null,
              full_name: user.full_name || null
            };
          }
        });
        
        setUserIdToDataMap(mapping);
      } catch (error) {
        console.error('Error loading user mapping:', error);
      }
    };

    if (safeTimeLogs.length > 0) {
      loadUserMapping();
    }
  }, [safeTimeLogs]);

  const getUserEmail = (idOrEmail) => {
    if (!idOrEmail) return null;
    if (isEmail(idOrEmail)) return idOrEmail;
    return userIdToDataMap[idOrEmail]?.email || idOrEmail;
  };

  const getUserFullName = (idOrEmail) => {
    if (!idOrEmail) return null;
    if (isEmail(idOrEmail)) return null;
    return userIdToDataMap[idOrEmail]?.full_name || null;
  };

  const getUserDisplayName = (idOrEmail) => {
    const fullName = getUserFullName(idOrEmail);
    if (fullName) return fullName;
    
    const email = getUserEmail(idOrEmail);
    if (!email) return 'לא ידוע';
    if (isEmail(email)) return email.split('@')[0];
    return String(email);
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      return prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
    });
  };

  const selectAll = () => {
    const all = filteredLogs.map(l => l.id);
    const isAllSelected = selectedIds.length === all.length && all.length > 0 && selectedIds.every(id => all.includes(id));
    setSelectedIds(isAllSelected ? [] : all);
  };

  const deleteOne = async (id) => {
    if (!confirm("למחוק רישום זמן זה?")) return;
    
    try {
      await TimeLog.delete(id);
      onUpdate && onUpdate();
      setSelectedIds(prev => prev.filter(x => x !== id));
    } catch (error) {
      console.error('Error deleting TimeLog:', error);
    }
  };

  const bulkDelete = async () => {
    if (selectedIds.length === 0) return;
    
    const allSelectedInFilter = selectedIds.length === filteredLogs.length && 
                                filteredLogs.length > 0 && 
                                selectedIds.every(id => filteredLogs.map(l => l.id).includes(id));

    let confirmationMessage = `למחוק ${selectedIds.length} רישומים?`;
    if (allSelectedInFilter) {
      confirmationMessage = `נבחרו כל ${selectedIds.length} הרישומים המוצגים למחיקה. להמשיך?`;
    }

    if (!confirm(confirmationMessage)) return;

    const results = await Promise.allSettled(selectedIds.map((id) => TimeLog.delete(id)));
    setSelectedIds([]);
    setSelectionMode(false);
    onUpdate && onUpdate();
  };

  const openEdit = (log) => {
    setEditing(log);
    setEditData({ title: log.title || "", notes: log.notes || "" });
  };

  const saveEdit = async () => {
    if (!editing) return;
    
    try {
      await TimeLog.update(editing.id, { title: editData.title, notes: editData.notes });
      setEditing(null);
      onUpdate && onUpdate();
    } catch (error) {
      console.error('Error updating TimeLog:', error);
    }
  };

  const uniqueClients = React.useMemo(() => {
    return [...new Set(safeTimeLogs.map(log => log?.client_name))].filter(Boolean);
  }, [safeTimeLogs]);

  const allUsers = React.useMemo(() => {
    const uniqueIds = [...new Set(safeTimeLogs.map(log => getCreatedBy(log)))].filter(Boolean);

    return uniqueIds.map(idOrEmail => {
      const userLogs = safeTimeLogs.filter(l => getCreatedBy(l) === idOrEmail);
      const totalSeconds = userLogs.reduce((sum, log) => sum + (log?.duration_seconds || 0), 0);
      const email = getUserEmail(idOrEmail);
      const fullName = getUserFullName(idOrEmail);
      
      return {
        id: idOrEmail,
        email: email,
        full_name: fullName,
        name: getUserDisplayName(idOrEmail),
        totalHours: totalSeconds / 3600,
        sessionsCount: userLogs.length,
        clients: [...new Set(userLogs.map(l => l?.client_name).filter(Boolean))]
      };
    }).sort((a, b) => b.totalHours - a.totalHours);
  }, [safeTimeLogs, userIdToDataMap]);

  const filteredUsers = React.useMemo(() => {
    if (!userSearchTerm) return allUsers;
    
    return allUsers.filter(user => {
      return user?.email?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
             user?.name?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
             user?.full_name?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
             user?.id?.toLowerCase().includes(userSearchTerm.toLowerCase());
    });
  }, [allUsers, userSearchTerm]);

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

      return matchesSearch && matchesClient && matchesUser && matchesTime;
    });
  }, [safeTimeLogs, searchTerm, clientFilter, userFilter, timeFilter]);

  const totalTime = React.useMemo(() => {
    return filteredLogs.reduce((sum, log) => sum + (log?.duration_seconds || 0), 0);
  }, [filteredLogs]);

  const clientStats = React.useMemo(() => {
    return uniqueClients.map(clientName => {
      const clientLogs = filteredLogs.filter(log => log?.client_name === clientName);
      const clientTime = clientLogs.reduce((sum, log) => sum + (log?.duration_seconds || 0), 0);
      return {
        clientName,
        time: clientTime,
        sessions: clientLogs.length
      };
    }).sort((a, b) => b.time - a.time);
  }, [uniqueClients, filteredLogs]);

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

  if (isLoading) {
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

  return (
    <div className="h-[400px] flex flex-col">
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

      <div className="flex-shrink-0 overflow-x-auto">
        <div className="flex flex-col md:flex-row md:flex-wrap items-stretch gap-3 p-4 min-w-0 whitespace-nowrap md:whitespace-normal">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="חיפוש לקוח או פעילות..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10 w-full"
            />
          </div>

          <Select value={clientFilter} onValueChange={setClientFilter}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="כל הלקוחות" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל הלקוחות</SelectItem>
              {uniqueClients.map(client => (
                <SelectItem key={client} value={client}>{client}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={timeFilter} onValueChange={setTimeFilter}>
            <SelectTrigger className="w-full md:w-40">
              <SelectValue placeholder="תקופה" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל התקופות</SelectItem>
              <SelectItem value="today">היום</SelectItem>
              <SelectItem value="week">השבוע</SelectItem>
              <SelectItem value="month">החודש</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowStats(!showStats)}
              title={showStats ? 'הסתר סטטיסטיקות' : 'הצג סטטיסטיקות'}
              className="shrink-0">
              <BarChart3 className="w-4 h-4 ml-2" />
              {showStats ? 'הסתר סטטיסטיקות' : 'סטטיסטיקות'}
            </Button>

            <div className="flex items-center gap-1 bg-white border rounded-md p-1 shrink-0">
              <Button
                variant={!summaryMode && viewMode === 'list' ? 'default' : 'ghost'}
                size="icon"
                className={!summaryMode && viewMode === 'list' ? 'h-8 w-8 bg-slate-900 text-white' : 'h-8 w-8'}
                onClick={() => { setSummaryMode(false); setViewMode('list'); }}
                title="תצוגת רשימה">
                <List className="w-4 h-4" />
              </Button>
              <Button
                variant={!summaryMode && viewMode === 'table' ? 'default' : 'ghost'}
                size="icon"
                className={!summaryMode && viewMode === 'table' ? 'h-8 w-8 bg-slate-900 text-white' : 'h-8 w-8'}
                onClick={() => { setSummaryMode(false); setViewMode('table'); }}
                title="תצוגת טבלה לפריטים">
                <TableIcon className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <Button
                variant={selectionMode ? "default" : "outline"}
                size="sm"
                onClick={() => { setSelectionMode(v => !v); setSelectedIds([]); }}
                className={selectionMode ? "bg-purple-600 hover:bg-purple-700 text-white" : ""}
                title="מצב בחירה מרובה">
                {selectionMode ? 'בטל בחירה' : 'בחירה'}
              </Button>
              {selectionMode && (
                <>
                  <Button variant="outline" size="sm" onClick={selectAll}>בחר הכל</Button>
                  <Button variant="destructive" size="sm" onClick={bulkDelete} disabled={selectedIds.length === 0}>
                    מחק נבחרים ({selectedIds.length})
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

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
              <div key={user.id} className="bg-white p-3 rounded-lg border border-slate-200 hover:shadow-md transition-shadow">
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
              </div>
            ))}
          </div>
        </div>
      )}

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
              <div key={stat.clientName} className="bg-white p-3 rounded-lg border">
                <div className="font-medium text-slate-800 truncate">{stat.clientName}</div>
                <div className="text-sm text-slate-600">{formatDuration(stat.time)}</div>
                <div className="text-xs text-slate-500">{stat.sessions} פעילויות</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-6">
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
                          {selectedIds.includes(log.id) ? 
                            <CheckSquare className="w-4 h-4 text-purple-600" /> : 
                            <Square className="w-4 h-4 text-slate-500" />
                          }
                        </button>
                      </TableCell>
                    )}
                    <TableCell className="whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Avatar className="w-6 h-6">
                          <AvatarFallback className="text-[10px] bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                            {getUserDisplayName(getCreatedBy(log)).substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-slate-600 text-sm">{getUserDisplayName(getCreatedBy(log))}</span>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        <Link
                          to={`${createPageUrl("Clients")}?open=details&client_name=${encodeURIComponent(log.client_name || "")}`}
                          className="hover:text-blue-600 transition-colors">
                          {log.client_name}
                        </Link>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{getDateLabel(log.log_date)}</TableCell>
                    <TableCell className="max-w-[280px] truncate">{log.title || '—'}</TableCell>
                    <TableCell className="max-w-[360px] truncate text-slate-600">{log.notes || ''}</TableCell>
                    <TableCell className="whitespace-nowrap font-medium">{formatDuration(log.duration_seconds)}</TableCell>
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
              <div key={log.id} className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md transition-all relative">
                {selectionMode && (
                  <button
                    onClick={() => toggleSelect(log.id)}
                    className="absolute top-3 left-3 bg-white rounded border p-1 z-10"
                    title={selectedIds.includes(log.id) ? "בטל בחירה" : "בחר"}>
                    {selectedIds.includes(log.id) ? 
                      <CheckSquare className="w-4 h-4 text-purple-600" /> : 
                      <Square className="w-4 h-4 text-slate-500" />
                    }
                  </button>
                )}
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold text-slate-900">{log.title || 'פעילות ללא כותרת'}</h4>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700">
                        {formatDuration(log.duration_seconds)}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-slate-600 mb-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <Avatar className="w-5 h-5">
                          <AvatarFallback className="text-[10px] bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                            {getUserDisplayName(getCreatedBy(log)).substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate max-w-[180px]">{getUserDisplayName(getCreatedBy(log))}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        <Link
                          to={`${createPageUrl("Clients")}?open=details&client_name=${encodeURIComponent(log.client_name || "")}`}
                          className="hover:text-blue-600 transition-colors">
                          {log.client_name}
                        </Link>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{getDateLabel(log.log_date)}</span>
                      </div>
                    </div>

                    {log.notes && (
                      <p className="text-sm text-slate-600 bg-slate-50 p-2 rounded truncate">
                        {log.notes}
                      </p>
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
      </div>

      {editing && (
        <Dialog open={true} onOpenChange={() => setEditing(null)}>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle>עריכת רישום זמן</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">כותרת</label>
                <Input value={editData.title} onChange={(e) => setEditData(d => ({ ...d, title: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">הערות</label>
                <Textarea value={editData.notes} onChange={(e) => setEditData(d => ({ ...d, notes: e.target.value }))} />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setEditing(null)}>ביטול</Button>
              <Button onClick={saveEdit}>שמור</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <div className="flex-shrink-0 p-4 text-sm text-slate-600 border-t border-slate-200 mt-auto">
        <span className="font-medium text-slate-800">{allUsers.length}</span> משתמשים • <span className="font-medium text-slate-800">{safeTimeLogs.length}</span> רישומים
      </div>
    </div>
  );
}