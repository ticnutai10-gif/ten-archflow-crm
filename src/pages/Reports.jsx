import React, { useEffect, useState, useMemo } from "react";
import { Client, Project, Quote, Task, TimeLog } from "@/entities/all";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BarChart3, PieChart as PieIcon, Clock, CheckSquare, Users, Download, Circle } from "lucide-react";
import { base44 } from "@/api/base44Client";
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
  CartesianGrid
} from "recharts";
import { format, startOfWeek, endOfWeek } from "date-fns";
import { he } from "date-fns/locale";

// Define statuses as constants to avoid useMemo missing dependency warnings
const PROJECT_STATUSES = ["הצעת מחיר", "תכנון", "היתרים", "ביצוע", "הושלם", "מבוטל"];
const QUOTE_STATUSES = ["נשלחה", "בהמתנה", "אושרה", "נדחתה", "פגה תוקף"];
const TASK_STATUSES = ["חדשה", "בתהליך", "הושלמה", "דחויה"];

export default function Reports() {
  const [isLoading, setIsLoading] = useState(true);
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [timeLogs, setTimeLogs] = useState([]);
  const [stageOptions, setStageOptions] = useState([
    { value: 'ברור_תכן', label: 'ברור תכן', color: '#3b82f6' },
    { value: 'תיק_מידע', label: 'תיק מידע', color: '#8b5cf6' },
    { value: 'היתרים', label: 'היתרים', color: '#f59e0b' },
    { value: 'ביצוע', label: 'ביצוע', color: '#10b981' },
    { value: 'סיום', label: 'סיום', color: '#6b7280' }
  ]);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      
      // Load stage options from UserPreferences
      try {
        const user = await base44.auth.me();
        const userPrefs = await base44.entities.UserPreferences.filter({ user_email: user.email });
        
        if (userPrefs.length > 0 && userPrefs[0].spreadsheet_columns?.clients?.stageOptions) {
          setStageOptions(userPrefs[0].spreadsheet_columns.clients.stageOptions);
        }
      } catch (e) {
        console.warn('Failed to load stage options');
      }
      
      const [c, p, q, t, tl] = await Promise.all([
        Client.list(),
        Project.list(),
        Quote.list(),
        Task.list(),
        TimeLog.list()
      ]);
      setClients(c || []);
      setProjects(p || []);
      setQuotes(q || []);
      setTasks(t || []);
      setTimeLogs(tl || []);
      setIsLoading(false);
    })();
  }, []);

  // Projects by status
  const projectsByStatusData = useMemo(() => {
    const map = new Map(PROJECT_STATUSES.map(s => [s, 0]));
    projects.forEach(p => map.set(p.status || "אחר", (map.get(p.status || "אחר") || 0) + 1));
    return PROJECT_STATUSES.map(s => ({ name: s, value: map.get(s) || 0 }));
  }, [projects]);

  // Quotes by status
  const quotesByStatusData = useMemo(() => {
    const map = new Map(QUOTE_STATUSES.map(s => [s, 0]));
    quotes.forEach(q => map.set(q.status || "אחר", (map.get(q.status || "אחר") || 0) + 1));
    return QUOTE_STATUSES.map(s => ({ name: s, value: map.get(s) || 0 }));
  }, [quotes]);

  // Tasks by status
  const tasksByStatusData = useMemo(() => {
    const map = new Map(TASK_STATUSES.map(s => [s, 0]));
    tasks.forEach(t => map.set(t.status || "אחר", (map.get(t.status || "אחר") || 0) + 1));
    return TASK_STATUSES.map(s => ({ name: s, value: map.get(s) || 0 }));
  }, [tasks]);

  // Weekly hours (last 8 weeks)
  const weeklyHoursData = useMemo(() => {
    const now = new Date();
    const weeks = [];
    for (let i = 7; i >= 0; i--) {
      const start = startOfWeek(new Date(now.getFullYear(), now.getMonth(), now.getDate() - i * 7), { weekStartsOn: 0 });
      const end = endOfWeek(start, { weekStartsOn: 0 });
      const label = format(start, "dd/MM", { locale: he });
      const seconds = timeLogs.reduce((sum, log) => {
        const d = new Date(log.log_date);
        if (d >= start && d <= end) return sum + (log.duration_seconds || 0);
        return sum;
      }, 0);
      const hours = Math.round((seconds / 3600) * 10) / 10;
      weeks.push({ name: label, hours });
    }
    return weeks;
  }, [timeLogs]);

  const COLORS = ["#6366F1", "#22C55E", "#F59E0B", "#EF4444", "#06B6D4", "#A78BFA"];

  // Clients by status
  const clientsByStatusData = useMemo(() => {
    const statuses = ['פוטנציאלי', 'פעיל', 'לא פעיל'];
    const map = new Map(statuses.map(s => [s, 0]));
    clients.forEach(c => map.set(c.status || 'פוטנציאלי', (map.get(c.status || 'פוטנציאלי') || 0) + 1));
    return statuses.map(s => ({ name: s, value: map.get(s) || 0 }));
  }, [clients]);

  // Clients by stage
  const clientsByStageData = useMemo(() => {
    const map = new Map();
    stageOptions.forEach(s => map.set(s.value, { name: s.label, value: 0, color: s.color }));
    clients.forEach(c => {
      if (c.stage) {
        const existing = map.get(c.stage);
        if (existing) {
          map.set(c.stage, { ...existing, value: existing.value + 1 });
        }
      }
    });
    return Array.from(map.values());
  }, [clients, stageOptions]);

  // Client statistics
  const clientStats = useMemo(() => {
    const total = clients.length;
    const active = clients.filter(c => c.status === 'פעיל').length;
    const potential = clients.filter(c => c.status === 'פוטנציאלי').length;
    const inactive = clients.filter(c => c.status === 'לא פעיל').length;
    
    const avgCreatedDays = clients.length > 0 
      ? clients.reduce((sum, c) => {
          const days = (new Date() - new Date(c.created_date)) / (1000 * 60 * 60 * 24);
          return sum + days;
        }, 0) / clients.length
      : 0;
    
    const avgUpdatedDays = clients.length > 0
      ? clients.reduce((sum, c) => {
          const days = (new Date() - new Date(c.updated_date)) / (1000 * 60 * 60 * 24);
          return sum + days;
        }, 0) / clients.length
      : 0;

    return {
      total,
      active,
      potential,
      inactive,
      avgCreatedDays: Math.round(avgCreatedDays),
      avgUpdatedDays: Math.round(avgUpdatedDays)
    };
  }, [clients]);

  // Export clients report to CSV
  const exportClientsReport = () => {
    const headers = ['קטגוריה', 'ערך'];
    const rows = [
      ['סה"כ לקוחות', clientStats.total],
      ['לקוחות פעילים', clientStats.active],
      ['לקוחות פוטנציאליים', clientStats.potential],
      ['לקוחות לא פעילים', clientStats.inactive],
      ['', ''],
      ['חלוקה לפי שלבים', ''],
      ...clientsByStageData.map(s => [s.name, s.value]),
      ['', ''],
      ['ממוצעים', ''],
      ['ימים ממוצעים מיצירה', clientStats.avgCreatedDays],
      ['ימים ממוצעים מעדכון אחרון', clientStats.avgUpdatedDays]
    ];

    const csvData = [
      headers.join(','),
      ...rows.map(row => row.map(field => `"${String(field || '')}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `דוח-לקוחות-${format(new Date(), 'dd-MM-yyyy')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 lg:p-8 min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 pl-24 lg:pl-12" dir="rtl">
      <div className="max-w-7xl mx-auto text-right">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-1">דוחות וניתוחים</h1>
          <p className="text-slate-600">סקירה ויזואלית של פרויקטים, הצעות, שעות עבודה, משימות ולקוחות</p>
        </div>

        <Tabs defaultValue="clients" dir="rtl" className="mb-6">
          <TabsList className="bg-white shadow-md border">
            <TabsTrigger value="clients" className="gap-2">
              <Users className="w-4 h-4" />
              דוח לקוחות
            </TabsTrigger>
            <TabsTrigger value="projects" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              פרויקטים ומשימות
            </TabsTrigger>
          </TabsList>

          <TabsContent value="clients">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Array(4).fill(0).map((_, i) => (
                  <Card key={i} className="shadow-lg border-0 bg-white/80 backdrop-blur-sm rounded-2xl">
                    <CardHeader className="pb-2">
                      <Skeleton className="h-6 w-24" />
                    </CardHeader>
                    <CardContent className="h-64">
                      <Skeleton className="h-full w-full rounded-xl" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                {/* Export Button */}
                <div className="flex justify-end">
                  <Button onClick={exportClientsReport} className="gap-2 bg-green-600 hover:bg-green-700">
                    <Download className="w-4 h-4" />
                    ייצא דוח לקוחות ל-CSV
                  </Button>
                </div>

                {/* Summary Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg">
                    <CardContent className="pt-6">
                      <div className="text-3xl font-bold mb-1">{clientStats.total}</div>
                      <div className="text-sm text-blue-100">סה"כ לקוחות</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg">
                    <CardContent className="pt-6">
                      <div className="text-3xl font-bold mb-1">{clientStats.active}</div>
                      <div className="text-sm text-green-100">לקוחות פעילים</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-lg">
                    <CardContent className="pt-6">
                      <div className="text-3xl font-bold mb-1">{clientStats.potential}</div>
                      <div className="text-sm text-amber-100">לקוחות פוטנציאליים</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-slate-500 to-slate-600 text-white shadow-lg">
                    <CardContent className="pt-6">
                      <div className="text-3xl font-bold mb-1">{clientStats.inactive}</div>
                      <div className="text-sm text-slate-100">לקוחות לא פעילים</div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Clients by Status */}
                  <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm rounded-2xl">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 justify-end text-slate-900">
                        חלוקת לקוחות לפי סטטוס
                        <Users className="w-5 h-5 text-blue-500" />
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={clientsByStatusData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={3}
                            label
                          >
                            {clientsByStatusData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Clients by Stage */}
                  <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm rounded-2xl">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 justify-end text-slate-900">
                        חלוקת לקוחות לפי שלבים
                        <Circle className="w-5 h-5 text-purple-500" />
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={clientsByStageData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                          <Tooltip />
                          <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                            {clientsByStageData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Detailed Summary Table */}
                  <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm rounded-2xl md:col-span-2">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 justify-end text-slate-900">
                        סיכום מפורט
                        <BarChart3 className="w-5 h-5 text-emerald-500" />
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-right">קטגוריה</TableHead>
                            <TableHead className="text-right">ערך</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow>
                            <TableCell className="font-semibold">סה"כ לקוחות</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                {clientStats.total}
                              </Badge>
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-semibold">לקוחות פעילים</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                {clientStats.active}
                              </Badge>
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-semibold">לקוחות פוטנציאליים</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                                {clientStats.potential}
                              </Badge>
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-semibold">לקוחות לא פעילים</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">
                                {clientStats.inactive}
                              </Badge>
                            </TableCell>
                          </TableRow>
                          <TableRow className="border-t-2">
                            <TableCell className="font-semibold" colSpan={2}>חלוקה לפי שלבים</TableCell>
                          </TableRow>
                          {clientsByStageData.map((stage, index) => (
                            <TableRow key={index}>
                              <TableCell className="pr-6">
                                <div className="flex items-center gap-2">
                                  <Circle 
                                    className="w-3 h-3 fill-current"
                                    style={{ color: stage.color }}
                                  />
                                  {stage.name}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge 
                                  variant="outline" 
                                  style={{ 
                                    backgroundColor: `${stage.color}20`,
                                    borderColor: `${stage.color}40`,
                                    color: stage.color
                                  }}
                                >
                                  {stage.value}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="border-t-2">
                            <TableCell className="font-semibold" colSpan={2}>ממוצעים</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>ממוצע ימים מיצירת לקוח</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                                {clientStats.avgCreatedDays} ימים
                              </Badge>
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>ממוצע ימים מעדכון אחרון</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
                                {clientStats.avgUpdatedDays} ימים
                              </Badge>
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="projects">
            {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Array(4).fill(0).map((_, i) => (
              <Card key={i} className="shadow-lg border-0 bg-white/80 backdrop-blur-sm rounded-2xl">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2 justify-end">
                    <Skeleton className="h-6 w-24" />
                  </div>
                </CardHeader>
                <CardContent className="h-64">
                  <Skeleton className="h-full w-full rounded-xl" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Projects by status */}
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 justify-end text-slate-900">
                  מצב פרויקטים
                  <BarChart3 className="w-5 h-5 text-indigo-500" />
                </CardTitle>
              </CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={projectsByStatusData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="#6366F1" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Quotes by status */}
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 justify-end text-slate-900">
                  סטטוס הצעות מחיר
                  <PieIcon className="w-5 h-5 text-amber-500" />
                </CardTitle>
              </CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={quotesByStatusData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      label
                    >
                      {quotesByStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Weekly hours */}
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 justify-end text-slate-900">
                  שעות עבודה – 8 שבועות אחרונים
                  <Clock className="w-5 h-5 text-emerald-500" />
                </CardTitle>
              </CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weeklyHoursData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="hours" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Tasks by status */}
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 justify-end text-slate-900">
                  סטטוס משימות
                  <CheckSquare className="w-5 h-5 text-purple-500" />
                </CardTitle>
              </CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={tasksByStatusData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="#8b5cf6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            </div>
          )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}