import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Users, Briefcase, CheckSquare, DollarSign } from "lucide-react";

export default function AnalyticsView({ clients = [], projects = [], tasks = [], quotes = [] }) {
  // Project status distribution
  const projectStatusData = [
    { name: 'הצעת מחיר', value: projects.filter(p => p.status === 'הצעת מחיר').length },
    { name: 'תכנון', value: projects.filter(p => p.status === 'תכנון').length },
    { name: 'היתרים', value: projects.filter(p => p.status === 'היתרים').length },
    { name: 'ביצוע', value: projects.filter(p => p.status === 'ביצוע').length },
    { name: 'הושלם', value: projects.filter(p => p.status === 'הושלם').length },
  ].filter(d => d.value > 0);

  // Client status distribution
  const clientStatusData = [
    { name: 'פוטנציאלי', value: clients.filter(c => c.status === 'פוטנציאלי').length, color: '#f59e0b' },
    { name: 'פעיל', value: clients.filter(c => c.status === 'פעיל').length, color: '#10b981' },
    { name: 'לא פעיל', value: clients.filter(c => c.status === 'לא פעיל').length, color: '#6b7280' },
  ].filter(d => d.value > 0);

  // Task priority distribution
  const taskPriorityData = [
    { name: 'גבוהה', value: tasks.filter(t => t.priority === 'גבוהה').length, color: '#ef4444' },
    { name: 'בינונית', value: tasks.filter(t => t.priority === 'בינונית').length, color: '#f59e0b' },
    { name: 'נמוכה', value: tasks.filter(t => t.priority === 'נמוכה').length, color: '#3b82f6' },
  ].filter(d => d.value > 0);

  // Monthly trends (last 6 months)
  const monthlyData = React.useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthName = date.toLocaleDateString('he-IL', { month: 'short' });
      
      const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      months.push({
        month: monthName,
        לקוחות: clients.filter(c => {
          const created = new Date(c.created_date);
          return created >= startOfMonth && created <= endOfMonth;
        }).length,
        פרויקטים: projects.filter(p => {
          const created = new Date(p.created_date);
          return created >= startOfMonth && created <= endOfMonth;
        }).length,
        משימות: tasks.filter(t => {
          const created = new Date(t.created_date);
          return created >= startOfMonth && created <= endOfMonth;
        }).length
      });
    }
    return months;
  }, [clients, projects, tasks]);

  const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#6b7280'];

  // Calculate KPIs
  const avgProjectBudget = projects.length > 0 
    ? projects.reduce((sum, p) => sum + (p.budget || 0), 0) / projects.length 
    : 0;

  const completedTasks = tasks.filter(t => t.status === 'הושלמה').length;
  const taskCompletionRate = tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0;

  const activeClients = clients.filter(c => c.status === 'פעיל').length;
  const clientGrowth = clients.length > 0 ? (activeClients / clients.length) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-700 mb-1">אחוז לקוחות פעילים</p>
                <p className="text-2xl font-bold text-blue-900">{clientGrowth.toFixed(0)}%</p>
              </div>
              <Users className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-green-700 mb-1">השלמת משימות</p>
                <p className="text-2xl font-bold text-green-900">{taskCompletionRate.toFixed(0)}%</p>
              </div>
              <CheckSquare className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-purple-700 mb-1">ממוצע תקציב</p>
                <p className="text-2xl font-bold text-purple-900">₪{(avgProjectBudget / 1000).toFixed(0)}K</p>
              </div>
              <DollarSign className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-amber-700 mb-1">פרויקטים פעילים</p>
                <p className="text-2xl font-bold text-amber-900">{projects.filter(p => p.status !== 'הושלם').length}</p>
              </div>
              <Briefcase className="w-8 h-8 text-amber-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              מגמות חודשיות
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="לקוחות" stroke="#3b82f6" strokeWidth={2} />
                <Line type="monotone" dataKey="פרויקטים" stroke="#8b5cf6" strokeWidth={2} />
                <Line type="monotone" dataKey="משימות" stroke="#10b981" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Project Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-purple-600" />
              התפלגות פרויקטים
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={projectStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {projectStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Client Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-green-600" />
              סטטוס לקוחות
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={clientStatusData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#10b981">
                  {clientStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Task Priority */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-amber-600" />
              עדיפות משימות
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={taskPriorityData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {taskPriorityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}