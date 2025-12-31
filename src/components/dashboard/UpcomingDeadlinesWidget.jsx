import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Calendar, Clock, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Badge } from "@/components/ui/badge";

export default function UpcomingDeadlinesWidget({ tasks = [], meetings = [] }) {
  // Combine and sort by date
  const allItems = [
    ...tasks.map(t => ({ ...t, type: 'task', date: new Date(t.due_date), label: 'משימה' })),
    ...meetings.map(m => ({ ...m, type: 'meeting', date: new Date(m.meeting_date), label: 'פגישה' }))
  ].sort((a, b) => a.date - b.date).slice(0, 5);

  return (
    <Card className="h-full bg-white shadow-md hover:shadow-lg transition-shadow flex flex-col">
      <CardHeader className="border-b pb-3">
        <CardTitle className="text-base font-bold text-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500" />
            מועדים קרובים
          </div>
          <Badge variant="secondary" className="text-xs">
            {allItems.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 flex-1 overflow-auto">
        {allItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-slate-400 text-sm">
            <Calendar className="w-8 h-8 mb-2 opacity-50" />
            אין מועדים קרובים
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {allItems.map((item, idx) => (
              <div key={`${item.type}-${item.id}`} className="p-3 hover:bg-slate-50 transition-colors flex items-start gap-3">
                <div className={`
                  w-2 h-2 mt-2 rounded-full flex-shrink-0
                  ${item.type === 'task' ? 'bg-amber-500' : 'bg-purple-500'}
                `} />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                      {item.label}
                    </span>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {format(item.date, 'dd/MM/yyyy')}
                    </span>
                  </div>
                  
                  <h4 className="text-sm font-semibold text-slate-800 truncate" title={item.title}>
                    {item.title}
                  </h4>
                  
                  {item.client_name && (
                    <div className="text-xs text-slate-500 mt-1 truncate">
                      {item.client_name}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      <div className="p-2 border-t bg-slate-50 text-center">
        <Link to={createPageUrl("Tasks")} className="text-xs text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1">
          לכל המשימות <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </Card>
  );
}