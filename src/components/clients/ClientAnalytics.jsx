import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import { Users, TrendingUp, DollarSign, Calendar, Phone, Mail, Building, Target } from 'lucide-react';
import { differenceInDays, format, startOfMonth, eachMonthOfInterval, subMonths } from 'date-fns';
import { he } from 'date-fns/locale';

const COLORS = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#6b7280'];

export default function ClientAnalytics({ clients, isLoading }) {
  const analytics = useMemo(() => {
    // Status distribution
    const statusDist = {};
    clients.forEach(c => {
      const status = c.status || 'לא מוגדר';
      statusDist[status] = (statusDist[status] || 0) + 1;
    });

    // Stage distribution
    const stageDist = {};
    clients.forEach(c => {
      const stage = c.stage || 'לא מוגדר';
      stageDist[stage] = (stageDist[stage] || 0) + 1;
    });

    // Source distribution
    const sourceDist = {};
    clients.forEach(c => {
      const source = c.source || 'לא מוגדר';
      sourceDist[source] = (sourceDist[source] || 0) + 1;
    });

    // Budget distribution
    const budgetDist = {};
    clients.forEach(c => {
      const budget = c.budget_range || 'לא מוגדר';
      budgetDist[budget] = (budgetDist[budget] || 0) + 1;
    });

    // Monthly trend (last 6 months)
    const sixMonthsAgo = subMonths(new Date(), 6);
    const months = eachMonthOfInterval({ start: sixMonthsAgo, end: new Date() });
    const monthlyData = months.map(month => {
      const monthStart = startOfMonth(month);
      const count = clients.filter(c => {
        const created = new Date(c.created_date);
        return created >= monthStart && created < startOfMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1));
      }).length;
      
      return {
        month: format(month, 'MMM', { locale: he }),
        לקוחות: count
      };
    });

    // Contact info stats
    const withPhone = clients.filter(c => c.phone).length;
    const withEmail = clients.filter(c => c.email).length;
    const withCompany = clients.filter(c => c.company).length;
    const avgDaysInSystem = clients.length > 0 
      ? Math.round(clients.reduce((sum, c) => sum + differenceInDays(new Date(), new Date(c.created_date)), 0) / clients.length)
      : 0;

    return {
      statusData: Object.entries(statusDist).map(([name, value]) => ({ name, value })),
      stageData: Object.entries(stageDist).map(([name, value]) => ({ name, value })),
      sourceData: Object.entries(sourceDist).map(([name, value]) => ({ name, value })),
      budgetData: Object.entries(budgetDist).map(([name, value]) => ({ name, value })),
      monthlyData,
      stats: {
        total: clients.length,
        withPhone,
        withEmail,
        withCompany,
        avgDaysInSystem,
        completionRate: clients.length > 0 ? Math.round(((withPhone + withEmail) / (clients.length * 2)) * 100) : 0
      }
    };
  }, [clients]);

  if (isLoading) {
    return <div className="p-6 text-center text-slate-500">טוען אנליטיקה...</div>;
  }

  return (
    <div className="h-[calc(100vh-380px)] overflow-y-auto px-6 py-4">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
        {/* Key Stats */}
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold">{analytics.stats.total}</div>
                <div className="text-sm opacity-90">סה"כ לקוחות</div>
              </div>
              <Users className="w-10 h-10 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold">{analytics.stats.withPhone}</div>
                <div className="text-sm opacity-90">עם טלפון</div>
              </div>
              <Phone className="w-10 h-10 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold">{analytics.stats.withEmail}</div>
                <div className="text-sm opacity-90">עם אימייל</div>
              </div>
              <Mail className="w-10 h-10 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold">{analytics.stats.completionRate}%</div>
                <div className="text-sm opacity-90">שלמות מידע</div>
              </div>
              <Target className="w-10 h-10 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">התפלגות לפי סטטוס</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={analytics.statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {analytics.statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Stage Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">התפלגות לפי שלב</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={analytics.stageData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Source Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">מקורות הגעה</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={analytics.sourceData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Monthly Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">מגמה חודשית</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={analytics.monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="לקוחות" stroke="#10b981" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Additional insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-slate-600">ממוצע ימים במערכת</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{analytics.stats.avgDaysInSystem}</div>
            <div className="text-sm text-slate-500 mt-1">ימים</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-slate-600">לקוחות עם חברה</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{analytics.stats.withCompany}</div>
            <div className="text-sm text-slate-500 mt-1">
              {analytics.stats.total > 0 ? Math.round((analytics.stats.withCompany / analytics.stats.total) * 100) : 0}% מהלקוחות
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-slate-50 to-slate-100">
          <CardHeader>
            <CardTitle className="text-sm text-slate-600">איכות נתונים</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>טלפון:</span>
                <span className="font-semibold">{analytics.stats.total > 0 ? Math.round((analytics.stats.withPhone / analytics.stats.total) * 100) : 0}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>אימייל:</span>
                <span className="font-semibold">{analytics.stats.total > 0 ? Math.round((analytics.stats.withEmail / analytics.stats.total) * 100) : 0}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>חברה:</span>
                <span className="font-semibold">{analytics.stats.total > 0 ? Math.round((analytics.stats.withCompany / analytics.stats.total) * 100) : 0}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}