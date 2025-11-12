import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckSquare, Clock, AlertTriangle, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { isToday, isPast } from "date-fns";

export default function TaskStats({ tasks, isLoading }) {
  // ✅ הגנה מלאה על tasks prop
  const safeTasks = useMemo(() => {
    if (!tasks) {
      console.warn('⚠️ [TaskStats] tasks is null/undefined');
      return [];
    }
    if (!Array.isArray(tasks)) {
      console.error('❌ [TaskStats] tasks is not an array!', {
        type: typeof tasks,
        value: tasks
      });
      return [];
    }
    const valid = tasks.filter(t => t && typeof t === 'object');
    console.log('✅ [TaskStats] safeTasks:', valid.length);
    return valid;
  }, [tasks]);

  const stats = useMemo(() => {
    return {
      total: safeTasks.length,
      completed: safeTasks.filter(t => t?.status === 'הושלמה').length,
      inProgress: safeTasks.filter(t => t?.status === 'בתהליך').length,
      overdue: safeTasks.filter(t => {
        if (!t?.due_date || t?.status === 'הושלמה') return false;
        try {
          return isPast(new Date(t.due_date));
        } catch {
          return false;
        }
      }).length,
      dueToday: safeTasks.filter(t => {
        if (!t?.due_date || t?.status === 'הושלמה') return false;
        try {
          return isToday(new Date(t.due_date));
        } catch {
          return false;
        }
      }).length
    };
  }, [safeTasks]);

  const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  const statsData = [
    {
      title: "סה\"ח משימות",
      value: stats.total,
      icon: CheckSquare,
      color: "blue"
    },
    {
      title: "בתהליך",
      value: stats.inProgress,
      icon: Clock,
      color: "purple"
    },
    {
      title: "באיחור",
      value: stats.overdue,
      icon: AlertTriangle,
      color: "red"
    },
    {
      title: `אחוז השלמה`,
      value: `${completionRate}%`,
      icon: TrendingUp,
      color: "green"
    }
  ];

  const colorMap = {
    blue: { bg: 'bg-blue-500', iconBg: 'bg-blue-100', text: 'text-blue-600' },
    purple: { bg: 'bg-purple-500', iconBg: 'bg-purple-100', text: 'text-purple-600' },
    red: { bg: 'bg-red-500', iconBg: 'bg-red-100', text: 'text-red-600' },
    green: { bg: 'bg-green-500', iconBg: 'bg-green-100', text: 'text-green-600' }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {Array(4).fill(0).map((_, i) => (
          <Card key={i} className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-8 w-16" />
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {statsData.map((stat, index) => {
        const colors = colorMap[stat.color];
        return (
          <Card key={index} className="shadow-lg border-0 bg-white/80 backdrop-blur-sm hover:shadow-xl transition-all duration-300 group">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start" dir="rtl">
                <div className="text-right flex-1">
                  <p className="text-sm font-medium text-slate-600 mb-1 text-right">{stat.title}</p>
                  <div className="text-3xl font-bold text-slate-900">{stat.value}</div>
                </div>
                <div className={`p-3 rounded-xl ${colors.iconBg} group-hover:scale-110 transition-transform duration-300`}>
                  <stat.icon className={`w-6 h-6 ${colors.text}`} />
                </div>
              </div>
            </CardHeader>
          </Card>
        );
      })}
    </div>
  );
}