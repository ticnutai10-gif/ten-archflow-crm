
import React, { useEffect, useState, useMemo } from "react";
import { Client, Project, Quote, Task, TimeLog } from "@/entities/all";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, PieChart as PieIcon, Clock, CheckSquare } from "lucide-react";
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
  const [projects, setProjects] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [timeLogs, setTimeLogs] = useState([]);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      const [p, q, t, tl] = await Promise.all([
        Project.list(),
        Quote.list(),
        Task.list(),
        TimeLog.list()
      ]);
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

  return (
    <div className="p-6 lg:p-8 min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 pl-24 lg:pl-12" dir="rtl">
      <div className="max-w-7xl mx-auto text-right">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-1">דוחות וניתוחים</h1>
          <p className="text-slate-600">סקירה ויזואלית של פרויקטים, הצעות, שעות עבודה ומשימות</p>
        </div>

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
      </div>
    </div>
  );
}
