import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, PlusCircle, FileText, CheckCircle2, UserPlus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { he } from "date-fns/locale";

export default function ActivityFeedWidget({ 
  recentProjects = [], 
  recentQuotes = [], 
  upcomingTasks = [], 
  recentClients = [] 
}) {
  // Simulate a feed by combining recent items
  // In a real app, you might have an ActivityLog entity
  
  const activities = [
    ...recentProjects.map(p => ({
      id: `proj-${p.id}`,
      type: 'project',
      icon: PlusCircle,
      color: 'text-orange-500',
      bg: 'bg-orange-100',
      text: `פרויקט חדש: ${p.name}`,
      subtext: p.client_name,
      date: new Date(p.created_date)
    })),
    ...recentQuotes.map(q => ({
      id: `quote-${q.id}`,
      type: 'quote',
      icon: FileText,
      color: 'text-green-500',
      bg: 'bg-green-100',
      text: `הצעת מחיר נוצרה`,
      subtext: `${q.client_name} - ₪${q.amount?.toLocaleString()}`,
      date: new Date(q.created_date)
    })),
    ...recentClients.map(c => ({
      id: `client-${c.id}`,
      type: 'client',
      icon: UserPlus,
      color: 'text-blue-500',
      bg: 'bg-blue-100',
      text: `לקוח חדש הצטרף`,
      subtext: c.name,
      date: new Date(c.created_date)
    })),
    ...upcomingTasks.map(t => ({
      id: `task-${t.id}`,
      type: 'task',
      icon: CheckCircle2,
      color: 'text-yellow-500',
      bg: 'bg-yellow-100',
      text: `משימה חדשה`,
      subtext: t.title,
      date: new Date(t.created_date)
    }))
  ].sort((a, b) => b.date - a.date).slice(0, 10);

  return (
    <Card className="h-full bg-white shadow-md hover:shadow-lg transition-shadow flex flex-col">
      <CardHeader className="border-b pb-3">
        <CardTitle className="text-base font-bold text-slate-700 flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-500" />
          פעילות אחרונה
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 flex-1 overflow-auto">
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute top-0 bottom-0 right-6 w-px bg-slate-100" />
          
          <div className="space-y-0">
            {activities.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div key={item.id} className="relative flex items-start gap-3 p-3 hover:bg-slate-50 transition-colors">
                  <div className={`
                    relative z-10 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0
                    ${item.bg} ${item.color}
                  `}>
                    <Icon className="w-3 h-3" />
                  </div>
                  
                  <div className="flex-1 min-w-0 pt-0.5">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {item.text}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {item.subtext}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {formatDistanceToNow(item.date, { addSuffix: true, locale: he })}
                    </p>
                  </div>
                </div>
              );
            })}
            
            {activities.length === 0 && (
              <div className="p-6 text-center text-sm text-slate-400">
                אין פעילות אחרונה להצגה
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}