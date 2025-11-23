import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Users, Briefcase, CheckSquare } from "lucide-react";
import { format, parseISO, startOfDay, isToday, isTomorrow, isThisWeek } from "date-fns";
import { he } from "date-fns/locale";

export default function TimelineView({ tasks = [], meetings = [], projects = [] }) {
  // Combine all activities with dates
  const activities = [
    ...tasks.map(t => ({
      type: 'task',
      date: t.due_date,
      title: t.title,
      description: t.description,
      client: t.client_name,
      priority: t.priority,
      status: t.status,
      icon: CheckSquare,
      color: '#8b5cf6'
    })),
    ...meetings.map(m => ({
      type: 'meeting',
      date: m.meeting_date,
      title: m.title,
      description: m.description,
      client: m.client_name,
      location: m.location,
      icon: Calendar,
      color: '#3b82f6'
    })),
    ...projects.filter(p => p.start_date).map(p => ({
      type: 'project',
      date: p.start_date,
      title: p.name,
      client: p.client_name,
      status: p.status,
      icon: Briefcase,
      color: '#10b981'
    }))
  ].filter(a => a.date)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const groupByDate = (activities) => {
    const groups = {
      today: [],
      tomorrow: [],
      thisWeek: [],
      later: []
    };

    activities.forEach(activity => {
      const date = new Date(activity.date);
      if (isToday(date)) {
        groups.today.push(activity);
      } else if (isTomorrow(date)) {
        groups.tomorrow.push(activity);
      } else if (isThisWeek(date)) {
        groups.thisWeek.push(activity);
      } else {
        groups.later.push(activity);
      }
    });

    return groups;
  };

  const grouped = groupByDate(activities);

  const TimelineSection = ({ title, items, color }) => {
    if (items.length === 0) return null;

    return (
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-1 flex-1 rounded-full" style={{ backgroundColor: color + '30' }} />
          <h3 className="text-lg font-bold text-slate-800">{title}</h3>
          <Badge className="text-white" style={{ backgroundColor: color }}>{items.length}</Badge>
          <div className="h-1 flex-1 rounded-full" style={{ backgroundColor: color + '30' }} />
        </div>

        <div className="space-y-3 mr-4">
          {items.map((activity, idx) => {
            const Icon = activity.icon;
            return (
              <div key={idx} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center shadow-md"
                    style={{ backgroundColor: activity.color }}
                  >
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  {idx < items.length - 1 && (
                    <div className="w-0.5 flex-1 mt-2 rounded-full" style={{ backgroundColor: activity.color + '30', minHeight: '40px' }} />
                  )}
                </div>

                <Card className="flex-1 hover:shadow-lg transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h4 className="font-bold text-slate-900">{activity.title}</h4>
                      <Badge variant="outline" className="text-xs whitespace-nowrap">
                        {format(new Date(activity.date), 'dd/MM HH:mm', { locale: he })}
                      </Badge>
                    </div>

                    {activity.description && (
                      <p className="text-sm text-slate-600 mb-2 line-clamp-2">{activity.description}</p>
                    )}

                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      {activity.client && (
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {activity.client}
                        </div>
                      )}
                      {activity.location && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {activity.location}
                        </div>
                      )}
                      {activity.priority && (
                        <Badge variant="outline" className="text-xs">
                          {activity.priority}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto">
      <TimelineSection title="היום 🎯" items={grouped.today} color="#ef4444" />
      <TimelineSection title="מחר 📅" items={grouped.tomorrow} color="#f59e0b" />
      <TimelineSection title="השבוע 📆" items={grouped.thisWeek} color="#3b82f6" />
      <TimelineSection title="בהמשך ⏰" items={grouped.later} color="#6b7280" />

      {activities.length === 0 && (
        <div className="text-center py-16">
          <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">אין פעילויות מתוזמנות</p>
        </div>
      )}
    </div>
  );
}