import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Calendar, Users, Target } from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { he } from "date-fns/locale";

export default function TrendsView({ clients = [], projects = [], tasks = [], quotes = [] }) {
  // Last 12 months data
  const monthlyTrends = React.useMemo(() => {
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const monthStart = startOfMonth(date);
      const monthEnd = endOfMonth(date);
      const monthName = format(date, 'MMM yyyy', { locale: he });

      const monthClients = clients.filter(c => {
        const created = new Date(c.created_date);
        return created >= monthStart && created <= monthEnd;
      }).length;

      const monthProjects = projects.filter(p => {
        const created = new Date(p.created_date);
        return created >= monthStart && created <= monthEnd;
      }).length;

      const monthTasks = tasks.filter(t => {
        const created = new Date(t.created_date);
        return created >= monthStart && created <= monthEnd;
      }).length;

      const completedTasks = tasks.filter(t => {
        const updated = new Date(t.updated_date);
        return t.status === 'הושלמה' && updated >= monthStart && updated <= monthEnd;
      }).length;

      const monthRevenue = quotes.filter(q => {
        const created = new Date(q.created_date);
        return q.status === 'אושרה' && created >= monthStart && created <= monthEnd;
      }).reduce((sum, q) => sum + (q.amount || 0), 0);

      months.push({
        month: monthName,
        לקוחות: monthClients,
        פרויקטים: monthProjects,
        משימות: monthTasks,
        'משימות הושלמו': completedTasks,
        'הכנסות (K)': Math.round(monthRevenue / 1000)
      });
    }
    return months;
  }, [clients, projects, tasks, quotes]);

  // Calculate growth rates
  const currentMonth = monthlyTrends[monthlyTrends.length - 1];
  const lastMonth = monthlyTrends[monthlyTrends.length - 2];

  const clientGrowth = lastMonth?.לקוחות > 0 
    ? ((currentMonth?.לקוחות - lastMonth?.לקוחות) / lastMonth?.לקוחות) * 100 
    : 0;

  const projectGrowth = lastMonth?.פרויקטים > 0 
    ? ((currentMonth?.פרויקטים - lastMonth?.פרויקטים) / lastMonth?.פרויקטים) * 100 
    : 0;

  const revenueGrowth = lastMonth?.['הכנסות (K)'] > 0 
    ? ((currentMonth?.['הכנסות (K)'] - lastMonth?.['הכנסות (K)']) / lastMonth?.['הכנסות (K)']) * 100 
    : 0;

  const GrowthCard = ({ title, value, trend, icon: Icon, color }) => (
    <Card className={`bg-gradient-to-br ${color}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium mb-1 opacity-80">{title}</p>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold">{value}</p>
              {trend !== 0 && (
                <Badge className={trend > 0 ? 'bg-green-600' : 'bg-red-600'}>
                  {trend > 0 ? <TrendingUp className="w-3 h-3 ml-1" /> : <TrendingDown className="w-3 h-3 ml-1" />}
                  {Math.abs(trend).toFixed(0)}%
                </Badge>
              )}
            </div>
          </div>
          <Icon className="w-10 h-10 opacity-80" />
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Growth indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <GrowthCard
          title="גידול בלקוחות החודש"
          value={currentMonth?.לקוחות || 0}
          trend={clientGrowth}
          icon={Users}
          color="from-blue-50 to-blue-100 text-blue-900 border-blue-200"
        />
        <GrowthCard
          title="פרויקטים חדשים החודש"
          value={currentMonth?.פרויקטים || 0}
          trend={projectGrowth}
          icon={Target}
          color="from-purple-50 to-purple-100 text-purple-900 border-purple-200"
        />
        <GrowthCard
          title="הכנסות החודש (₪K)"
          value={currentMonth?.['הכנסות (K)'] || 0}
          trend={revenueGrowth}
          icon={TrendingUp}
          color="from-green-50 to-green-100 text-green-900 border-green-200"
        />
      </div>

      {/* Main trends chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            מגמות עסקיות - 12 חודשים אחרונים
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={monthlyTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="לקוחות" 
                stackId="1" 
                stroke="#3b82f6" 
                fill="#3b82f6" 
                fillOpacity={0.6}
              />
              <Area 
                type="monotone" 
                dataKey="פרויקטים" 
                stackId="2" 
                stroke="#8b5cf6" 
                fill="#8b5cf6" 
                fillOpacity={0.6}
              />
              <Area 
                type="monotone" 
                dataKey="משימות הושלמו" 
                stackId="3" 
                stroke="#10b981" 
                fill="#10b981" 
                fillOpacity={0.6}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Revenue trend */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            מגמת הכנסות
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="הכנסות (K)" 
                stroke="#10b981" 
                strokeWidth={3}
                dot={{ fill: '#10b981', r: 5 }}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Task completion trend */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-purple-600" />
            ביצועי משימות
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="משימות" 
                stroke="#f59e0b" 
                strokeWidth={2}
                name="נוצרו"
              />
              <Line 
                type="monotone" 
                dataKey="משימות הושלמו" 
                stroke="#10b981" 
                strokeWidth={2}
                name="הושלמו"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}