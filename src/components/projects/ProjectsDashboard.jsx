import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  FolderOpen, TrendingUp, DollarSign, Calendar, AlertTriangle,
  CheckCircle2, Clock, Flag, ArrowRight, Building, Users
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format, differenceInDays, isPast, addDays } from "date-fns";
import { he } from "date-fns/locale";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";

const STATUS_COLORS = {
  'הצעת מחיר': '#8b5cf6',
  'תכנון': '#3b82f6',
  'היתרים': '#f59e0b',
  'ביצוע': '#22c55e',
  'הושלם': '#64748b',
  'מבוטל': '#ef4444'
};

export default function ProjectsDashboard({ projects = [], tasks = [] }) {
  // Statistics
  const stats = useMemo(() => {
    const active = projects.filter(p => !['הושלם', 'מבוטל'].includes(p.status));
    const totalBudget = active.reduce((sum, p) => sum + (p.budget || 0), 0);
    const totalExpenses = active.reduce((sum, p) => sum + (p.total_expenses || 0), 0);
    const avgProgress = active.length > 0 
      ? Math.round(active.reduce((sum, p) => sum + (p.progress || 0), 0) / active.length)
      : 0;
    
    // Milestones stats
    let totalMilestones = 0;
    let completedMilestones = 0;
    let upcomingMilestones = [];
    let overdueMilestones = [];

    active.forEach(project => {
      (project.milestones || []).forEach(m => {
        totalMilestones++;
        if (m.completed) completedMilestones++;
        else if (m.due_date) {
          const dueDate = new Date(m.due_date);
          if (isPast(dueDate)) {
            overdueMilestones.push({ ...m, project });
          } else if (differenceInDays(dueDate, new Date()) <= 14) {
            upcomingMilestones.push({ ...m, project });
          }
        }
      });
    });

    return {
      total: projects.length,
      active: active.length,
      totalBudget,
      totalExpenses,
      budgetRemaining: totalBudget - totalExpenses,
      avgProgress,
      totalMilestones,
      completedMilestones,
      upcomingMilestones: upcomingMilestones.slice(0, 5),
      overdueMilestones: overdueMilestones.slice(0, 5)
    };
  }, [projects]);

  // Status distribution
  const statusData = useMemo(() => {
    const counts = {};
    projects.forEach(p => {
      counts[p.status] = (counts[p.status] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({
      name,
      value,
      color: STATUS_COLORS[name] || '#64748b'
    }));
  }, [projects]);

  // Budget by project (top 5)
  const budgetData = useMemo(() => {
    return projects
      .filter(p => p.budget > 0)
      .sort((a, b) => (b.budget || 0) - (a.budget || 0))
      .slice(0, 5)
      .map(p => ({
        name: p.name.length > 15 ? p.name.substring(0, 15) + '...' : p.name,
        תקציב: p.budget || 0,
        הוצאות: p.total_expenses || 0
      }));
  }, [projects]);

  // Projects needing attention
  const attentionProjects = useMemo(() => {
    return projects.filter(p => {
      if (['הושלם', 'מבוטל'].includes(p.status)) return false;
      
      // Budget overrun
      if (p.budget && p.total_expenses && p.total_expenses > p.budget) return true;
      
      // Overdue end date
      if (p.end_date && isPast(new Date(p.end_date)) && p.status !== 'הושלם') return true;
      
      // Has overdue milestones
      const hasOverdue = (p.milestones || []).some(m => 
        !m.completed && m.due_date && isPast(new Date(m.due_date))
      );
      if (hasOverdue) return true;
      
      return false;
    }).slice(0, 5);
  }, [projects]);

  return (
    <div className="space-y-6">
      {/* Main Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card className="shadow-lg border-0 bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center">
                <FolderOpen className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="text-3xl font-bold text-blue-700">{stats.active}</div>
                <div className="text-xs text-blue-600">פרויקטים פעילים</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0 bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-green-600 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="text-3xl font-bold text-green-700">{stats.avgProgress}%</div>
                <div className="text-xs text-green-600">התקדמות ממוצעת</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0 bg-gradient-to-br from-amber-50 to-amber-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-amber-600 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="text-xl font-bold text-amber-700">₪{(stats.totalBudget / 1000000).toFixed(1)}M</div>
                <div className="text-xs text-amber-600">תקציב כולל</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0 bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-purple-600 flex items-center justify-center">
                <Flag className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="text-3xl font-bold text-purple-700">
                  {stats.completedMilestones}/{stats.totalMilestones}
                </div>
                <div className="text-xs text-purple-600">אבני דרך הושלמו</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0 bg-gradient-to-br from-red-50 to-red-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-red-600 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="text-3xl font-bold text-red-700">{stats.overdueMilestones.length}</div>
                <div className="text-xs text-red-600">באיחור</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0 bg-gradient-to-br from-cyan-50 to-cyan-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-cyan-600 flex items-center justify-center">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="text-3xl font-bold text-cyan-700">{stats.upcomingMilestones.length}</div>
                <div className="text-xs text-cyan-600">קרובים (14 יום)</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <Card className="shadow-lg border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Building className="w-5 h-5 text-slate-600" />
              התפלגות לפי סטטוס
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={150} height={150}>
                <PieChart>
                  <Pie
                    data={statusData}
                    dataKey="value"
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={60}
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {statusData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-sm">{item.name}</span>
                    </div>
                    <Badge variant="outline">{item.value}</Badge>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Budget Overview */}
        <Card className="shadow-lg border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-slate-600" />
              תקציב לפי פרויקט (Top 5)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {budgetData.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={budgetData} layout="vertical">
                  <XAxis type="number" tickFormatter={(v) => `₪${(v/1000).toFixed(0)}K`} />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => `₪${v.toLocaleString()}`} />
                  <Legend />
                  <Bar dataKey="תקציב" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="הוצאות" fill="#ef4444" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-8 text-slate-500">
                אין נתוני תקציב להצגה
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Upcoming Milestones */}
        <Card className="shadow-lg border-0">
          <CardHeader className="pb-2 border-b">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="w-5 h-5 text-cyan-600" />
              אבני דרך קרובות
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {stats.upcomingMilestones.length === 0 ? (
              <div className="text-center py-6 text-slate-500 text-sm">
                אין אבני דרך ב-14 הימים הקרובים
              </div>
            ) : (
              <div className="divide-y">
                {stats.upcomingMilestones.map((m, i) => (
                  <Link 
                    key={i} 
                    to={createPageUrl('ProjectDetails') + `?id=${m.project.id}`}
                    className="p-3 flex items-center gap-3 hover:bg-slate-50 transition-colors"
                  >
                    <Flag className="w-5 h-5 text-cyan-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{m.name}</div>
                      <div className="text-xs text-slate-500 truncate">{m.project.name}</div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {format(new Date(m.due_date), 'dd/MM')}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Overdue Milestones */}
        <Card className="shadow-lg border-0">
          <CardHeader className="pb-2 border-b bg-red-50">
            <CardTitle className="text-lg flex items-center gap-2 text-red-700">
              <AlertTriangle className="w-5 h-5" />
              אבני דרך באיחור
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {stats.overdueMilestones.length === 0 ? (
              <div className="text-center py-6 text-green-600 text-sm">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-500" />
                אין אבני דרך באיחור! 🎉
              </div>
            ) : (
              <div className="divide-y">
                {stats.overdueMilestones.map((m, i) => (
                  <Link 
                    key={i} 
                    to={createPageUrl('ProjectDetails') + `?id=${m.project.id}`}
                    className="p-3 flex items-center gap-3 hover:bg-red-50 transition-colors"
                  >
                    <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{m.name}</div>
                      <div className="text-xs text-slate-500 truncate">{m.project.name}</div>
                    </div>
                    <Badge className="bg-red-100 text-red-700 text-xs">
                      {differenceInDays(new Date(), new Date(m.due_date))} ימים
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Projects Needing Attention */}
        <Card className="shadow-lg border-0">
          <CardHeader className="pb-2 border-b bg-amber-50">
            <CardTitle className="text-lg flex items-center gap-2 text-amber-700">
              <AlertTriangle className="w-5 h-5" />
              דורשים תשומת לב
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {attentionProjects.length === 0 ? (
              <div className="text-center py-6 text-green-600 text-sm">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-500" />
                כל הפרויקטים במסלול! ✨
              </div>
            ) : (
              <div className="divide-y">
                {attentionProjects.map((p) => (
                  <Link 
                    key={p.id} 
                    to={createPageUrl('ProjectDetails') + `?id=${p.id}`}
                    className="p-3 flex items-center gap-3 hover:bg-amber-50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{p.name}</div>
                      <div className="text-xs text-slate-500">{p.client_name}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {p.total_expenses > p.budget && (
                        <Badge className="bg-red-100 text-red-700 text-xs">חריגת תקציב</Badge>
                      )}
                      {p.end_date && isPast(new Date(p.end_date)) && (
                        <Badge className="bg-amber-100 text-amber-700 text-xs">באיחור</Badge>
                      )}
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400" />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}