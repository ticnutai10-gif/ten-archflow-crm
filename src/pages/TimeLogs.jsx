
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
  Flame
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
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, getDay, getHours, startOfDay, addDays } from "date-fns";
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


// Activity sparklines component
function ActivitySparklines({ dailyData }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <Card className="shadow-lg border-0 bg-gradient-to-r from-blue-500 to-blue-600 text-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-blue-100 text-sm">שעות השבוע</p>
              <div className="text-2xl font-bold">
                {Math.round(dailyData.slice(-7).reduce((sum, d) => sum + d.hours, 0) * 10) / 10}
              </div>
            </div>
            <Activity className="w-8 h-8 text-blue-200" />
          </div>
          <div className="h-12">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyData.slice(-7)}>
                <Area 
                  type="monotone" 
                  dataKey="hours" 
                  stroke="#fff" 
                  fill="rgba(255,255,255,0.3)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg border-0 bg-gradient-to-r from-green-500 to-green-600 text-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-green-100 text-sm">פעילות יומית</p>
              <div className="text-2xl font-bold">
                {dailyData.slice(-1)[0]?.hours.toFixed(1) || 0}
              </div>
            </div>
            <Zap className="w-8 h-8 text-green-200" />
          </div>
          <div className="h-12">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyData.slice(-7)}>
                <Bar dataKey="hours" fill="rgba(255,255,255,0.8)" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg border-0 bg-gradient-to-r from-purple-500 to-purple-600 text-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-purple-100 text-sm">יעילות</p>
              <div className="text-2xl font-bold">
                {dailyData.length > 0 ? Math.round((dailyData.slice(-7).reduce((sum, d) => sum + d.hours, 0) / 7) * 10) : 0}%
              </div>
            </div>
            <Target className="w-8 h-8 text-purple-200" />
          </div>
          <div className="h-12">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyData.slice(-7)}>
                <Line 
                  type="monotone" 
                  dataKey="hours" 
                  stroke="#fff" 
                  strokeWidth={3}
                  dot={{ fill: '#fff', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Get current user first
      const me = await User.me();
      setCurrentUser(me);

      // Check if user can see all time logs (admin or manager_plus)
      let canSeeAll = me?.role === 'admin';
      if (!canSeeAll && me?.email) {
        try {
          const rows = await AccessControl.filter({ email: me.email, active: true });
          const rule = rows?.[0];
          if (rule?.role === 'manager_plus') canSeeAll = true;
        } catch (e) {
          console.warn('Access control check failed:', e);
        }
      }

      // Load time logs based on permissions
      const timeLogsData = canSeeAll
        ? await TimeLog.filter({}, '-log_date', 1000)
        : await TimeLog.filter({ created_by: me.email }, '-log_date', 1000);

      const clientsData = await Client.list();

      setTimeLogs(timeLogsData);
      setClients(clientsData);
    } catch (error) {
      console.error('Error loading time logs:', error);
    }
    setIsLoading(false);
  };

  // Get unique employees
  const uniqueEmployees = [...new Set(timeLogs.map(log => log.created_by))].filter(Boolean);

  // Filter logs
  const filteredLogs = timeLogs.filter(log => {
    const matchesSearch = log.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.title?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClient = clientFilter === "all" || log.client_name === clientFilter;
    const matchesEmployee = employeeFilter === "all" || log.created_by === employeeFilter;

    let matchesTime = true;
    if (timeFilter !== "all") {
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
    }

    return matchesSearch && matchesClient && matchesEmployee && matchesTime;
  });

  // Analytics data
  const totalHours = filteredLogs.reduce((sum, log) => sum + (log.duration_seconds || 0), 0) / 3600;
  const avgSessionTime = filteredLogs.length > 0 ? totalHours / filteredLogs.length : 0;
  const totalSecondsFiltered = filteredLogs.reduce((sum, log) => sum + (log.duration_seconds || 0), 0);


  // Client distribution for pie chart
  const clientDistribution = () => {
    const clientHours = {};
    filteredLogs.forEach(log => {
      const client = log.client_name || 'ללא לקוח';
      const hours = (log.duration_seconds || 0) / 3600;
      clientHours[client] = (clientHours[client] || 0) + hours;
    });
    
    return Object.entries(clientHours)
      .map(([name, hours]) => ({ name, hours: Math.round(hours * 10) / 10, fill: '#6366F1' }))
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 8); // Top 8 clients
  };

  // Heat map data for daily patterns
  const heatMapData = () => {
    const patterns = {};
    filteredLogs.forEach(log => {
      const date = new Date(log.log_date);
      const dayOfWeek = getDay(date);
      const hour = getHours(date); // Changed from getHour to getHours
      const key = `${dayOfWeek}-${hour}`;
      const hours = (log.duration_seconds || 0) / 3600;
      patterns[key] = (patterns[key] || 0) + hours;
    });
    
    return Object.entries(patterns).map(([key, hours]) => ({ key, hours }));
  };

  // Daily activity data for last 30 days
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
      const dateKey = format(new Date(log.log_date), 'yyyy-MM-dd');
      if (days[dateKey]) {
        days[dateKey].hours += (log.duration_seconds || 0) / 3600;
        days[dateKey].sessions += 1;
      }
    });
    
    return Object.values(days).map(d => ({
      ...d,
      hours: Math.round(d.hours * 10) / 10,
      name: format(new Date(d.date), 'dd/MM', { locale: he })
    }));
  };

  // Productivity rings data
  const productivityData = () => {
    const totalPossibleHours = 8 * 5; // 8 hours * 5 days
    const thisWeekHours = filteredLogs
      .filter(log => {
        const logDate = new Date(log.log_date);
        const now = new Date();
        return isWithinInterval(logDate, {
          start: startOfWeek(now, { weekStartsOn: 0 }),
          end: endOfWeek(now, { weekStartsOn: 0 })
        });
      })
      .reduce((sum, log) => sum + (log.duration_seconds || 0), 0) / 3600;
    
    const productivity = Math.min((thisWeekHours / totalPossibleHours) * 100, 100);
    
    return [
      { name: 'יעילות שבועית', value: Math.round(productivity), fill: '#6366F1' },
      { name: 'מטרה', value: 80, fill: '#10B981' },
      { name: 'שעות יומיות', value: Math.min((thisWeekHours / 5 / 8) * 100, 100), fill: '#F59E0B' }
    ];
  };

  // Weekly hours trend
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
          const logDate = new Date(log.log_date);
          return isWithinInterval(logDate, { start: weekStart, end: weekEnd });
        })
        .reduce((sum, log) => sum + (log.duration_seconds || 0), 0) / 3600;
      
      weeks[weekLabel] = Math.round(weekHours * 10) / 10;
    }
    
    return Object.entries(weeks).map(([week, hours]) => ({ week, hours }));
  };

  // Employee hours distribution
  const employeeHours = () => {
    const empHours = {};
    filteredLogs.forEach(log => {
      const emp = log.created_by || 'לא ידוע';
      const hours = (log.duration_seconds || 0) / 3600;
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
          Math.round((log.duration_seconds || 0) / 60),
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
          .map(log => `${log.client_name || 'ללא לקוח'}: ${formatDuration(log.duration_seconds)} - ${format(new Date(log.log_date), 'dd/MM')}`)
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
                   <Activity className="w-4 h-4" />}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" dir="rtl">
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

        {/* Activity Sparklines - Always visible */}
        <ActivitySparklines dailyData={dailyActivity()} />

        {/* Filters */}
        <Card className="mb-6 shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  placeholder="חיפוש לקוח או פעילות..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
              </div>
              
              <Select value={clientFilter} onValueChange={setClientFilter}>
                <SelectTrigger className="w-full lg:w-48">
                  <SelectValue placeholder="כל הלקוחות" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל הלקוחות</SelectItem>
                  {[...new Set(timeLogs.map(log => log.client_name))].filter(Boolean).map(client => (
                    <SelectItem key={client} value={client}>{client}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
                <SelectTrigger className="w-full lg:w-56">
                  <SelectValue placeholder="כל העובדים" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל העובדים</SelectItem>
                  {uniqueEmployees.map(emp => (
                    <SelectItem key={emp} value={emp}>{emp}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={timeFilter} onValueChange={setTimeFilter}>
                <SelectTrigger className="w-full lg:w-40">
                  <SelectValue placeholder="תקופה" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל התקופות</SelectItem>
                  <SelectItem value="today">היום</SelectItem>
                  <SelectItem value="week">השבוע</SelectItem>
                  <SelectItem value="month">החודש</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Content Based on View Mode */}
        {viewMode === 'heatmap' ? (
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
                  <BarChart data={employeeHours()} layout="horizontal">
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
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
