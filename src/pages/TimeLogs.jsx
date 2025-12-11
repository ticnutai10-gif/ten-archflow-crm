import React, { useState, useEffect } from "react";
import { TimeLog, Client } from "@/entities/all";
import { User } from "@/entities/User";
import { AccessControl } from "@/entities/AccessControl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Timer,
  Clock,
  BarChart3,
  PieChart as PieIcon,
  Calendar,
  User as UserIcon,
  Search,
  Filter,
  LayoutGrid,
  List,
  Table as TableIcon,
  Download,
  TrendingUp,
  Users,
  Activity,
  Zap,
  Target,
  Flame,
  Plus,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
  AreaChart,
  Area,
  RadialBarChart,
  RadialBar,
  ComposedChart,
  Treemap
} from "recharts";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, getDay, getHours, startOfDay, addDays, isSameDay, addMonths, subMonths } from "date-fns";
import { he } from "date-fns/locale";

import TimerLogsComponent from "../components/dashboard/TimerLogs";
import { exportTimeLogsCsv } from "@/functions/exportTimeLogsCsv";
import { UploadFile } from "@/integrations/Core";

function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours === 0) return `${minutes} דקות`;
  return `${hours}:${minutes.toString().padStart(2, '0')} שעות`;
}

// Heat map component for daily patterns
function HeatMapCalendar({ data }) {
  const days = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];
  const hours = Array.from({ length: 24 }, (_, i) => i);
  
  const getIntensity = (dayOfWeek, hour) => {
    const key = `${dayOfWeek}-${hour}`;
    const entry = data.find(d => d.key === key);
    return entry ? Math.min(entry.hours / 2, 1) : 0; // Normalize to 0-1
  };

  return (
    <div className="p-4">
      <div className="grid grid-cols-25 gap-1 text-xs">
        <div className="col-span-1"></div>
        {hours.map(hour => (
          <div key={hour} className="text-center text-slate-400">
            {hour % 4 === 0 ? hour.toString().padStart(2, '0') : ''}
          </div>
        ))}
        {days.map((day, dayIndex) => (
          <React.Fragment key={dayIndex}>
            <div className="flex items-center justify-center text-slate-600 font-medium">
              {day}
            </div>
            {hours.map(hour => {
              const intensity = getIntensity(dayIndex, hour);
              return (
                <div
                  key={`${dayIndex}-${hour}`}
                  className="aspect-square rounded-sm border border-slate-100"
                  style={{
                    backgroundColor: intensity > 0 
                      ? `rgba(99, 102, 241, ${intensity})` 
                      : '#f8fafc'
                  }}
                  title={`${day} ${hour}:00 - ${intensity > 0 ? `${Math.round(intensity * 2)} שעות` : 'אין פעילות'}`}
                />
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

// Productivity rings component
function ProductivityRings({ data }) {
  const COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444'];
  
  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart cx="50%" cy="50%" innerRadius="20%" outerRadius="80%" data={data}>
          <RadialBar
            minAngle={15}
            dataKey="value"
            cornerRadius={10}
            fill="#8884d8"
            label={{ fill: '#fff', position: 'insideStart' }}
          />
          <Tooltip formatter={(value) => `${value}%`} />
          <Legend />
        </RadialBarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Time treemap for client distribution
function ClientTreemap({ data }) {
  const COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#8B5CF6', '#EC4899', '#F97316'];
  
  const dataWithColors = data.map((entry, index) => ({
    ...entry,
    fill: COLORS[index % COLORS.length]
  }));
  
  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <Treemap
          data={dataWithColors}
          dataKey="hours"
          aspectRatio={4 / 3}
          stroke="#fff"
          strokeWidth={2}
          content={<CustomTreemapContent />}
        >
          <Tooltip formatter={(value) => `${value} שעות`} />
        </Treemap>
      </ResponsiveContainer>
    </div>
  );
}

const CustomTreemapContent = ({ root, depth, x, y, width, height, index, payload, colors, name }) => {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        style={{
          fill: root.children ? colors[index % colors.length] : payload.fill,
          stroke: '#fff',
          strokeWidth: 2 / (depth + 1e-10),
          strokeOpacity: 1 / (depth + 1e-10),
        }}
      />
      {width > 50 && height > 20 && (
        <text
          x={x + width / 2}
          y={y + height / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#fff"
          style={{ fontSize: 10, fontWeight: 'bold' }}
        >
          {name}
        </text>
      )}
    </g>
  );
};




// ✅ קומפוננטת לוח שנה חדשה
function CalendarView({ timeLogs, onDateClick, clients }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [calendarView, setCalendarView] = useState('month'); // month, week, day

  // קבלת ימי החודש הנוכחי
  const getDaysInMonth = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    
    // התחל מהראשון ביום ראשון של השבוע
    const start = startOfWeek(monthStart, { weekStartsOn: 0 });
    const end = endOfWeek(monthEnd, { weekStartsOn: 0 });
    
    const days = [];
    let current = new Date(start);
    
    while (current <= end) {
      days.push(new Date(current));
      current = addDays(current, 1);
    }
    
    return days;
  };

  // חישוב שעות ליום
  const getHoursForDay = (date) => {
    const logsForDay = timeLogs.filter(log => 
      log && log.log_date && isSameDay(new Date(log.log_date), date)
    );
    
    const totalSeconds = logsForDay.reduce((sum, log) => sum + (log.duration_seconds || 0), 0);
    return totalSeconds / 3600;
  };

  // קבלת רישומים ליום
  const getLogsForDay = (date) => {
    return timeLogs.filter(log => 
      log && log.log_date && isSameDay(new Date(log.log_date), date)
    );
  };

  const days = getDaysInMonth();
  const daysOfWeek = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];

  return (
    <div className="space-y-4">
      {/* כלי בקרה */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          <h3 className="text-lg font-bold">
            {format(currentMonth, 'MMMM yyyy', { locale: he })}
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentMonth(new Date())}
          >
            היום
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {/* Calendar view buttons - currently only month is fully supported */}
          {/* <Button
            variant={calendarView === 'day' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCalendarView('day')}
          >
            יום
          </Button>
          <Button
            variant={calendarView === 'week' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCalendarView('week')}
          >
            שבוע
          </Button> */}
          <Button
            variant={calendarView === 'month' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCalendarView('month')}
          >
            חודש
          </Button>
        </div>
      </div>

      {/* לוח שנה */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        {/* כותרות ימי השבוע */}
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
          {daysOfWeek.map((day, index) => (
            <div
              key={index}
              className="p-2 text-center font-semibold text-slate-600 text-sm"
            >
              {day}
            </div>
          ))}
        </div>

        {/* ימי החודש */}
        <div className="grid grid-cols-7">
          {days.map((day, index) => {
            const hours = getHoursForDay(day);
            const logs = getLogsForDay(day);
            const isToday = isSameDay(day, new Date());
            const isOutsideMonth = !isWithinInterval(day, {
                start: startOfMonth(currentMonth),
                end: endOfMonth(currentMonth)
            });
            
            return (
              <div
                key={index}
                className={`min-h-[120px] p-2 border-b border-l border-slate-200 hover:bg-blue-50 cursor-pointer transition-colors 
                  ${isToday ? 'bg-blue-50 ring-2 ring-blue-500 ring-inset' : ''}
                  ${isOutsideMonth ? 'text-slate-400 bg-slate-50' : 'text-slate-800'}
                `}
                onClick={() => onDateClick(day)}
              >
                <div className="flex flex-col h-full">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm font-semibold ${
                      isToday ? 'text-blue-600' : 'text-slate-700'
                    }`}>
                      {format(day, 'd')}
                    </span>
                    {hours > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {hours.toFixed(1)}ש'
                      </Badge>
                    )}
                  </div>
                  
                  <ScrollArea className="flex-1 space-y-1">
                    {logs.slice(0, 3).map((log, idx) => (
                      <div
                        key={idx}
                        className="text-xs p-1 bg-blue-100 rounded truncate"
                        title={`${log.client_name} - ${formatDuration(log.duration_seconds)}`}
                      >
                        {log.client_name}
                      </div>
                    ))}
                    {logs.length > 3 && (
                      <div className="text-xs text-slate-500 text-center">
                        +{logs.length - 3} עוד
                      </div>
                    )}
                  </ScrollArea>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function TimeLogsPage() {
  const [timeLogs, setTimeLogs] = useState([]);
  const [clients, setClients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [clientFilter, setClientFilter] = useState("all");
  const [employeeFilter, setEmployeeFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState("all");
  const [viewMode, setViewMode] = useState("table");
  const [currentUser, setCurrentUser] = useState(null);

  // Check URL params for user filter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const userFilterParam = urlParams.get('user_filter');
    if (userFilterParam) {
      setEmployeeFilter(userFilterParam);
      setViewMode('table'); // Force table view to show the filtered logs
    }
  }, []);

  // ✅ מצב טופס הוספת זמן
  const [addTimeDialogOpen, setAddTimeDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [newLogData, setNewLogData] = useState({
    client_id: '',
    client_name: '',
    hours: '', // Changed to empty string for better controlled input
    minutes: '', // Changed to empty string
    title: '',
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Get current user first
      const me = await User.me();
      setCurrentUser(me);

      // Check if user can see all time logs (admin, super_admin, or manager_plus)
      let canSeeAll = me?.role === 'admin';
      
      // If not admin in User table, check AccessControl
      if (!canSeeAll && me?.email) {
        try {
          const rows = await AccessControl.filter({ email: me.email }).catch(() => []);
          const validRows = Array.isArray(rows) ? rows : [];
          const rule = validRows?.[0];
          
          // Allow admin, super_admin, or manager_plus roles
          if (rule?.role === 'admin' || rule?.role === 'super_admin' || rule?.role === 'manager_plus') {
            canSeeAll = true;
            console.log('✅ User has elevated permissions via AccessControl:', rule.role);
          }
        } catch (e) {
          console.warn('Access control check failed:', e);
        }
      }

      console.log('👤 User permissions check:', {
        email: me?.email,
        userRole: me?.role,
        canSeeAll
      });

      // Load time logs based on permissions
      const timeLogsData = canSeeAll
        ? await TimeLog.filter({}, '-log_date', 1000).catch(() => [])
        : await TimeLog.filter({ created_by: me.email }, '-log_date', 1000).catch(() => []);

      console.log('📊 Loaded time logs:', {
        total: timeLogsData?.length || 0,
        canSeeAll,
        filter: canSeeAll ? 'all logs' : 'user logs only'
      });

      const clientsData = await Client.list().catch(() => []);

      // ✅ הגנה על התוצאות
      const validTimeLogs = Array.isArray(timeLogsData) ? timeLogsData : [];
      const validClients = Array.isArray(clientsData) ? clientsData : [];

      console.log('✅ [TimeLogsPage] Loaded data:', {
        timeLogs: validTimeLogs.length,
        clients: validClients.length
      });

      setTimeLogs(validTimeLogs);
      setClients(validClients);
    } catch (error) {
      console.error('❌ [TimeLogsPage] Error loading time logs:', error);
      setTimeLogs([]);
      setClients([]);
    }
    setIsLoading(false);
  };

  // ✅ פתיחת טופס הוספת זמן בלחיצה על תאריך
  const handleDateClick = (date) => {
    setSelectedDate(date);
    setNewLogData({
      client_id: '',
      client_name: '',
      hours: '',
      minutes: '',
      title: '',
      notes: ''
    });
    setAddTimeDialogOpen(true);
  };

  // ✅ שמירת רישום זמן חדש
  const handleSaveNewLog = async () => {
    if (!newLogData.client_id) {
      alert('יש לבחור לקוח');
      return;
    }

    const hours = parseInt(newLogData.hours || '0', 10);
    const minutes = parseInt(newLogData.minutes || '0', 10);
    const totalSeconds = (hours * 3600) + (minutes * 60);

    if (totalSeconds <= 0) {
      alert('יש להזין זמן גדול מ-0');
      return;
    }

    try {
      const client = clients.find(c => c.id === newLogData.client_id);
      if (!client) {
        alert('לקוח לא נמצא.');
        return;
      }

      await TimeLog.create({
        client_id: newLogData.client_id,
        client_name: client.name, // Ensure client_name is correctly taken from selected client object
        log_date: format(selectedDate, 'yyyy-MM-dd'),
        duration_seconds: totalSeconds,
        title: newLogData.title || '',
        notes: newLogData.notes || '',
        created_by: currentUser?.email || 'unknown', // Ensure created_by is set
      });

      setAddTimeDialogOpen(false);
      loadData();
      
      window.dispatchEvent(new CustomEvent('timelog:created', {
        detail: {
          client_name: client.name,
          duration_seconds: totalSeconds,
          title: newLogData.title,
          notes: newLogData.notes
        }
      }));
    } catch (error) {
      console.error('Error saving time log:', error);
      alert('שגיאה בשמירת רישום הזמן: ' + (error.message || 'נסה שוב מאוחר יותר.'));
    }
  };

  // ✅ הגנה על uniqueEmployees
  const uniqueEmployees = React.useMemo(() => {
    if (!Array.isArray(timeLogs)) {
      console.error('❌ [TimeLogsPage] timeLogs is not an array for uniqueEmployees!', timeLogs);
      return [];
    }
    return [...new Set(timeLogs.map(log => log?.created_by))].filter(Boolean);
  }, [timeLogs]);

  // Filter logs
  // ✅ הגנה על filteredLogs
  const filteredLogs = React.useMemo(() => {
    if (!Array.isArray(timeLogs)) {
      console.error('❌ [TimeLogsPage] timeLogs is not an array for filtering!', timeLogs);
      return [];
    }
    
    return timeLogs.filter(log => {
      if (!log || typeof log !== 'object') return false; // Ensure log is a valid object
      
      const matchesSearch = log.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           log.title?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesClient = clientFilter === "all" || log.client_name === clientFilter;
      const matchesEmployee = employeeFilter === "all" || log.created_by === employeeFilter;

      let matchesTime = true;
      if (timeFilter !== "all" && log.log_date) {
        try {
          const logDate = new Date(log.log_date);
          const now = new Date();

          switch (timeFilter) {
            case 'today':
              matchesTime = logDate.toDateString() === now.toDateString();
              break;
            case 'week':
              matchesTime = isWithinInterval(logDate, {
                start: startOfWeek(now, { weekStartsOn: 0 }),
                end: endOfWeek(now, { weekStartsOn: 0 })
              });
              break;
            case 'month':
              matchesTime = isWithinInterval(logDate, {
                start: startOfMonth(now),
                end: endOfMonth(now)
              });
              break;
            default:
              break;
          }
        } catch (e) {
          console.warn('Invalid log_date for filtering:', log.log_date, e);
          matchesTime = false; // If date is invalid, it doesn't match
        }
      }

      return matchesSearch && matchesClient && matchesEmployee && matchesTime;
    });
  }, [timeLogs, searchTerm, clientFilter, employeeFilter, timeFilter]);

  // Analytics data
  // ✅ הגנה על totalHours
  const totalHours = React.useMemo(() => {
    return filteredLogs.reduce((sum, log) => sum + (log?.duration_seconds || 0), 0) / 3600;
  }, [filteredLogs]);

  // const avgSessionTime = filteredLogs.length > 0 ? totalHours / filteredLogs.length : 0; // Not used in this version
  const totalSecondsFiltered = filteredLogs.reduce((sum, log) => sum + (log?.duration_seconds || 0), 0);


  // Client distribution for pie chart
  // ✅ הגנה על clientDistribution
  const clientDistribution = () => {
    const clientHours = {};
    filteredLogs.forEach(log => {
      if (!log) return; // Skip if log is null/undefined
      const client = log.client_name || 'ללא לקוח';
      const hours = (log?.duration_seconds || 0) / 3600;
      clientHours[client] = (clientHours[client] || 0) + hours;
    });
    
    return Object.entries(clientHours)
      .map(([name, hours]) => ({ name, hours: Math.round(hours * 10) / 10, fill: '#6366F1' }))
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 8); // Top 8 clients
  };

  // Heat map data for daily patterns
  // ✅ הגנה על heatMapData
  const heatMapData = () => {
    const patterns = {};
    filteredLogs.forEach(log => {
      if (!log || !log.log_date) return;
      try {
        const date = new Date(log.log_date);
        const dayOfWeek = getDay(date);
        const hour = getHours(date); // Changed from getHour to getHours
        const key = `${dayOfWeek}-${hour}`;
        const hours = (log?.duration_seconds || 0) / 3600;
        patterns[key] = (patterns[key] || 0) + hours;
      } catch (e) {
        console.error('Error processing log date for heat map:', e, log);
      }
    });
    
    return Object.entries(patterns).map(([key, hours]) => ({ key, hours }));
  };

  // Daily activity data for last 30 days
  // ✅ הגנה על dailyActivity
  const dailyActivity = () => {
    const days = {};
    const now = new Date();
    
    // Last 30 days
    for (let i = 29; i >= 0; i--) {
      const date = startOfDay(addDays(now, -i));
      const dateKey = format(date, 'yyyy-MM-dd');
      days[dateKey] = { date: dateKey, hours: 0, sessions: 0 };
    }
    
    filteredLogs.forEach(log => {
      if (!log || !log.log_date) return;
      try {
        const dateKey = format(new Date(log.log_date), 'yyyy-MM-dd');
        if (days[dateKey]) {
          days[dateKey].hours += (log?.duration_seconds || 0) / 3600;
          days[dateKey].sessions += 1;
        }
      } catch (e) {
        console.error('Error processing log date for daily activity:', e, log);
      }
    });
    
    return Object.values(days).map(d => ({
      ...d,
      hours: Math.round(d.hours * 10) / 10,
      name: format(new Date(d.date), 'dd/MM', { locale: he })
    }));
  };

  // Productivity rings data
  // ✅ הגנה על productivityData
  const productivityData = () => {
    const totalPossibleHours = 8 * 5; // 8 hours * 5 days
    const now = new Date();
    
    const thisWeekHours = filteredLogs
      .filter(log => {
        if (!log || !log.log_date) return false;
        try {
          const logDate = new Date(log.log_date);
          return isWithinInterval(logDate, {
            start: startOfWeek(now, { weekStartsOn: 0 }),
            end: endOfWeek(now, { weekStartsOn: 0 })
          });
        } catch (e) {
          console.warn('Invalid log_date for weekly productivity filter:', log.log_date, e);
          return false;
        }
      })
      .reduce((sum, log) => sum + (log?.duration_seconds || 0), 0) / 3600;
    
    const productivity = Math.min((thisWeekHours / totalPossibleHours) * 100, 100);
    
    return [
      { name: 'יעילות שבועית', value: Math.round(productivity), fill: '#6366F1' },
      { name: 'מטרה', value: 80, fill: '#10B981' },
      { name: 'שעות יומיות', value: Math.min((thisWeekHours / 5 / 8) * 100, 100), fill: '#F59E0B' }
    ];
  };

  // Weekly hours trend
  // ✅ הגנה על weeklyTrend
  const weeklyTrend = () => {
    const weeks = {};
    const now = new Date();
    
    // Last 8 weeks
    for (let i = 7; i >= 0; i--) {
      const weekStart = startOfWeek(new Date(now.getFullYear(), now.getMonth(), now.getDate() - i * 7), { weekStartsOn: 0 });
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 0 });
      const weekLabel = format(weekStart, 'dd/MM', { locale: he });
      
      const weekHours = filteredLogs
        .filter(log => {
          if (!log || !log.log_date) return false;
          try {
            const logDate = new Date(log.log_date);
            return isWithinInterval(logDate, { start: weekStart, end: weekEnd });
          } catch (e) {
            console.warn('Invalid log_date for weekly trend filter:', log.log_date, e);
            return false;
          }
        })
        .reduce((sum, log) => sum + (log?.duration_seconds || 0), 0) / 3600;
      
      weeks[weekLabel] = Math.round(weekHours * 10) / 10;
    }
    
    return Object.entries(weeks).map(([week, hours]) => ({ week, hours }));
  };

  // Employee hours distribution
  // ✅ הגנה על employeeHours
  const employeeHours = () => {
    const empHours = {};
    filteredLogs.forEach(log => {
      if (!log) return; // Skip if log is null/undefined
      const emp = log.created_by || 'לא ידוע';
      const hours = (log?.duration_seconds || 0) / 3600;
      empHours[emp] = (empHours[emp] || 0) + hours;
    });
    
    return Object.entries(empHours)
      .map(([name, hours]) => ({ name: name.split('@')[0], hours: Math.round(hours * 10) / 10 }))
      .sort((a, b) => b.hours - a.hours);
  };

  const handleExport = async () => {
    try {
      const { data } = await exportTimeLogsCsv(); // This function exports all time logs, not filtered ones.
      const blob = new Blob([data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `timelogs-full-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (error) {
      console.error('Error exporting time logs:', error);
      alert('שגיאה ביצוא רישומי הזמן.');
    }
  };

  // פונקציה ליצירת CSV ושליחה
  const createAndSendCSV = async (sendMethod = 'whatsapp') => {
    try {
      if (filteredLogs.length === 0) {
        alert('אין רישומי זמן זמינים ליצוא.');
        return;
      }

      // יצירת CSV של רישומי זמן
      const headers = ['לקוח', 'תאריך', 'כותרת', 'הערות', 'משך (דקות)', 'עובד'];
      const csvData = [
        headers.join(','),
        ...filteredLogs.map(log => [
          log.client_name || '',
          log.log_date ? format(new Date(log.log_date), 'dd/MM/yyyy') : '',
          log.title || '',
          log.notes ? log.notes.replace(/\n/g, ' ') : '', // Replace newlines in notes for CSV compatibility
          Math.round((log?.duration_seconds || 0) / 60),
          log.created_by || ''
        ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      // יצירת Blob - כולל BOM לטיפול נכון בעברית באקסל
      const blob = new Blob(['\uFEFF' + csvData], { type: 'text/csv;charset=utf-8' });
      const file = new File([blob], `רישומי-זמן-${new Date().toISOString().split('T')[0]}.csv`, { type: 'text/csv' });

      // העלאת הקובץ לשרת
      const uploadResult = await UploadFile({ file });
      const fileUrl = uploadResult.file_url;

      if (sendMethod === 'whatsapp') {
        const logsSummary = filteredLogs
          .slice(0, 5) // Only 5 first to prevent overwhelming message length
          .map(log => `${log.client_name || 'ללא לקוח'}: ${formatDuration(log?.duration_seconds)} - ${format(new Date(log.log_date), 'dd/MM')}`)
          .join('\n');

        if (confirm(`האם לשלוח סיכום רישומי זמן לוואטסאפ?\n(${filteredLogs.length} רישומים בסך הכל)`)) {
          const message = encodeURIComponent(
            `סיכום רישומי זמן מ-CRM\n\n` +
            `${logsSummary}${filteredLogs.length > 5 ? `\n... ועוד ${filteredLogs.length - 5} רישומים` : ''}\n\n` +
            `סה״כ זמן בסינון: ${formatDuration(totalSecondsFiltered)}\n\n` +
            `קובץ CSV מלא: ${fileUrl}`
          );
          window.open(`https://wa.me/?text=${message}`, '_blank');
        }
      } else { // email
        if (confirm(`האם לשלוח דוח רישומי זמן במייל?\n(${filteredLogs.length} רישומים)`)) {
          const subject = encodeURIComponent('דוח רישומי זמן מ-CRM');
          const body = encodeURIComponent(
            `דוח רישומי זמן:\n\n` +
            `סה״כ ${filteredLogs.length} רישומים\n` +
            `סה״כ זמן בסינון: ${formatDuration(totalSecondsFiltered)}\n\n` +
            `קובץ CSV מלא: ${fileUrl}`
          );
          window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
        }
      }

      alert(`קובץ CSV של רישומי זמן נוצר והקישור שותף. ${filteredLogs.length} רישומים נכללו.`);

    } catch (error) {
      console.error('Error creating and sending time logs CSV:', error);
      alert('שגיאה ביצירת הקובץ: ' + error.message);
    }
  };

  const COLORS = ["#6366F1", "#22C55E", "#F59E0B", "#EF4444", "#06B6D4", "#A78BFA", "#EC4899", "#10B981"];

  return (
    <div className="p-6 lg:p-8 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen pl-24 lg:pl-12" dir="rtl">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">זמני עבודה</h1>
            <p className="text-slate-600">ניתוח ומעקב אחר שעות העבודה</p>
          </div>
          <div className="flex gap-2">
            {/* יצוא עם אפשרויות שליחה */}
            <div className="flex items-center gap-1 bg-white border rounded-lg">
              <Button 
                variant="ghost" 
                onClick={handleExport}
                className="gap-2"
                title="הורד CSV מקומי (כל הנתונים)"
              >
                <Download className="w-4 h-4" /> יצוא CSV
              </Button>
              <div className="h-6 w-px bg-slate-200"></div>
              <button
                onClick={() => createAndSendCSV('whatsapp')}
                className="p-2 hover:bg-slate-100 rounded text-green-600"
                title="יצור CSV מהנתונים המסוננים ושלח לוואטסאפ"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
                </svg>
              </button>
              <button
                onClick={() => createAndSendCSV('email')}
                className="p-2 hover:bg-slate-100 rounded text-blue-600"
                title="יצור CSV מהנתונים המסוננים ושלח במייל"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  {viewMode === 'table' ? <TableIcon className="w-4 h-4" /> :
                   viewMode === 'grid' ? <LayoutGrid className="w-4 h-4" /> :
                   viewMode === 'analytics' ? <BarChart3 className="w-4 h-4" /> :
                   viewMode === 'heatmap' ? <Flame className="w-4 h-4" /> :
                   viewMode === 'calendar' ? <Calendar className="w-4 h-4" /> :
                   <Activity className="w-4 h-4" />}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" dir="rtl">
                <DropdownMenuItem onClick={() => setViewMode('calendar')}>
                  <Calendar className="w-4 h-4 ml-2" />
                  לוח שנה
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setViewMode('table')}>
                  <TableIcon className="w-4 h-4 ml-2" />
                  תצוגת טבלה
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setViewMode('grid')}>
                  <LayoutGrid className="w-4 h-4 ml-2" />
                  תצוגת כרטיסים
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setViewMode('analytics')}>
                  <BarChart3 className="w-4 h-4 ml-2" />
                  תצוגת ניתוחים
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setViewMode('heatmap')}>
                  <Flame className="w-4 h-4 ml-2" />
                  מפת חום
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setViewMode('dashboard')}>
                  <Activity className="w-4 h-4 ml-2" />
                  דשבורד מתקדם
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Content Based on View Mode */}
        {/* ✅ תצוגת לוח שנה חדשה */}
        {viewMode === 'calendar' ? (
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardContent className="p-6">
              <CalendarView 
                timeLogs={filteredLogs} 
                onDateClick={handleDateClick}
                clients={clients}
              />
            </CardContent>
          </Card>
        ) : viewMode === 'heatmap' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 justify-end">
                  מפת חום - דפוסי עבודה שבועיים
                  <Flame className="w-5 h-5 text-orange-500" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <HeatMapCalendar data={heatMapData()} />
              </CardContent>
            </Card>

            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 justify-end">
                  טריימאפ לקוחות
                  <LayoutGrid className="w-5 h-5 text-purple-500" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ClientTreemap data={clientDistribution()} />
              </CardContent>
            </Card>

            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 justify-end">
                  טבעות יעילות
                  <Target className="w-5 h-5 text-blue-500" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ProductivityRings data={productivityData()} />
              </CardContent>
            </Card>
          </div>
        ) : viewMode === 'dashboard' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 30-day trend */}
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 justify-end">
                  מגמת 30 יום אחרונים
                  <TrendingUp className="w-5 h-5 text-indigo-500" />
                </CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={dailyActivity()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="hours" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="sessions" orientation="left" tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Area yAxisId="hours" type="monotone" dataKey="hours" fill="#6366F1" fillOpacity={0.3} stroke="#6366F1" strokeWidth={2} />
                    <Bar yAxisId="sessions" dataKey="sessions" fill="#10B981" opacity={0.6} />
                    <Line yAxisId="hours" type="monotone" dataKey="hours" stroke="#EF4444" strokeWidth={3} />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Productivity rings */}
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 justify-end">
                  מדדי יעילות
                  <Target className="w-5 h-5 text-green-500" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ProductivityRings data={productivityData()} />
              </CardContent>
            </Card>

            {/* Client treemap */}
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 justify-end">
                  התפלגות זמן לפי לקוח
                  <Users className="w-5 h-5 text-amber-500" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ClientTreemap data={clientDistribution()} />
              </CardContent>
            </Card>

            {/* Employee performance */}
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 justify-end">
                  ביצועי צוות
                  <UserIcon className="w-5 h-5 text-emerald-500" />
                </CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={employeeHours()} layout="vertical"> {/* Changed layout to vertical for better employee display */}
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis dataKey="name" type="category" width={60} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value) => `${value} שעות`} />
                    <Bar dataKey="hours" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        ) : viewMode === 'analytics' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Client Distribution */}
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 justify-end">
                  התפלגות שעות לפי לקוח
                  <PieIcon className="w-5 h-5 text-blue-500" />
                </CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={clientDistribution()}
                      dataKey="hours"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      label={({ name, hours }) => `${name}: ${hours}ש׳`}
                    >
                      {clientDistribution().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `${value} שעות`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Weekly Trend */}
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 justify-end">
                  מגמת שעות שבועית
                  <BarChart3 className="w-5 h-5 text-green-500" />
                </CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weeklyTrend()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(value) => `${value} שעות`} />
                    <Line type="monotone" dataKey="hours" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Employee Hours */}
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 justify-end">
                  שעות לפי עובד
                  <UserIcon className="w-5 h-5 text-purple-500" />
                </CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={employeeHours()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(value) => `${value} שעות`} />
                    <Bar dataKey="hours" radius={[4, 4, 0, 0]} fill="#8b5cf6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardContent className="p-0">
              <TimerLogsComponent
                timeLogs={filteredLogs}
                isLoading={isLoading}
                onUpdate={loadData}
                clients={clients}
              />
            </CardContent>
          </Card>
        )}
      </div>

      {/* ✅ דיאלוג הוספת זמן */}
      <Dialog open={addTimeDialogOpen} onOpenChange={setAddTimeDialogOpen}>
        <DialogContent className="sm:max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle>הוסף רישום זמן</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 px-6 py-4 overflow-y-auto flex-1">
            {/* תאריך */}
            <div>
              <label className="text-sm font-semibold text-slate-700 mb-2 block text-right flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                תאריך
              </label>
              <Input
                type="date"
                value={selectedDate ? format(selectedDate, 'yyyy-MM-dd') : ''}
                onChange={(e) => setSelectedDate(new Date(e.target.value))}
                className="text-right"
                dir="rtl"
              />
              <div className="text-xs text-slate-600 mt-1 text-right">
                📅 {selectedDate.toLocaleDateString('he-IL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
            </div>

            {/* בחירת לקוח */}
            <div>
              <label className="text-sm font-semibold text-slate-700 mb-2 block text-right">
                לקוח <span className="text-red-500">*</span>
              </label>
              <Select
                value={newLogData.client_id}
                onValueChange={(value) => {
                  const client = clients.find(c => c.id === value);
                  setNewLogData({
                    ...newLogData,
                    client_id: value,
                    client_name: client?.name || ''
                  });
                }}
              >
                <SelectTrigger className="text-right">
                  <SelectValue placeholder="בחר לקוח..." />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(client => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* זמן */}
            <div>
              <label className="text-sm font-semibold text-slate-700 mb-2 block text-right">
                משך זמן <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-3 justify-center">
                <div className="flex flex-col items-center">
                  <Input
                    value={newLogData.hours}
                    onChange={(e) => setNewLogData({ ...newLogData, hours: e.target.value.replace(/\D/g, '').slice(0, 2) })}
                    className="w-20 h-12 text-center text-lg font-bold"
                    placeholder="00"
                    dir="ltr"
                    maxLength={2}
                  />
                  <span className="text-xs text-slate-600 mt-1 font-medium">שעות</span>
                </div>
                <span className="text-2xl font-bold text-blue-600 mt-[-20px]">:</span>
                <div className="flex flex-col items-center">
                  <Input
                    value={newLogData.minutes}
                    onChange={(e) => setNewLogData({ ...newLogData, minutes: e.target.value.replace(/\D/g, '').slice(0, 2) })}
                    className="w-20 h-12 text-center text-lg font-bold"
                    placeholder="00"
                    dir="ltr"
                    maxLength={2}
                  />
                  <span className="text-xs text-slate-600 mt-1 font-medium">דקות</span>
                </div>
              </div>
            </div>

            {/* כותרת */}
            <div>
              <label className="text-sm font-semibold text-slate-700 mb-2 block text-right">
                כותרת <span className="text-xs text-slate-500 font-normal">(אופציונלי)</span>
              </label>
              <Input
                placeholder="למשל: פגישת תכנון, ייעוץ טלפוני..."
                value={newLogData.title}
                onChange={(e) => setNewLogData({ ...newLogData, title: e.target.value })}
                className="text-right"
                dir="rtl"
              />
            </div>

            {/* הערות */}
            <div>
              <label className="text-sm font-semibold text-slate-700 mb-2 block text-right">
                הערות <span className="text-xs text-slate-500 font-normal">(אופציונלי)</span>
              </label>
              <Textarea
                placeholder="הוסף פרטים והערות על הפעילות..."
                value={newLogData.notes}
                onChange={(e) => setNewLogData({ ...newLogData, notes: e.target.value })}
                className="text-right min-h-[80px]"
                dir="rtl"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAddTimeDialogOpen(false)}>
              ביטול
            </Button>
            <Button onClick={handleSaveNewLog} className="bg-green-600 hover:bg-green-700">
              <Plus className="w-4 h-4 ml-2" />
              שמור
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}