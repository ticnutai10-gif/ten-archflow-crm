import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Clock } from "lucide-react";
import { format, subDays, startOfDay } from "date-fns";
import { he } from "date-fns/locale";

export default function HeatmapView({ tasks = [], timeLogs = [], meetings = [] }) {
  // Create a 7x24 grid (7 days x 24 hours)
  const days = 7;
  const hours = 24;

  // Calculate activity for each hour of each day
  const getActivityData = () => {
    const data = {};
    
    for (let d = 0; d < days; d++) {
      const date = subDays(new Date(), days - d - 1);
      const dateKey = format(startOfDay(date), 'yyyy-MM-dd');
      data[dateKey] = {};

      for (let h = 0; h < hours; h++) {
        data[dateKey][h] = { count: 0, types: [] };
      }
    }

    // Count tasks
    tasks.forEach(task => {
      if (!task.created_date) return;
      const date = new Date(task.created_date);
      const dateKey = format(startOfDay(date), 'yyyy-MM-dd');
      const hour = date.getHours();
      
      if (data[dateKey] && data[dateKey][hour]) {
        data[dateKey][hour].count++;
        data[dateKey][hour].types.push('משימה');
      }
    });

    // Count meetings
    meetings.forEach(meeting => {
      if (!meeting.meeting_date) return;
      const date = new Date(meeting.meeting_date);
      const dateKey = format(startOfDay(date), 'yyyy-MM-dd');
      const hour = date.getHours();
      
      if (data[dateKey] && data[dateKey][hour]) {
        data[dateKey][hour].count++;
        data[dateKey][hour].types.push('פגישה');
      }
    });

    // Count time logs
    timeLogs.forEach(log => {
      if (!log.created_date) return;
      const date = new Date(log.created_date);
      const dateKey = format(startOfDay(date), 'yyyy-MM-dd');
      const hour = date.getHours();
      
      if (data[dateKey] && data[dateKey][hour]) {
        data[dateKey][hour].count++;
        data[dateKey][hour].types.push('לוג זמן');
      }
    });

    return data;
  };

  const activityData = getActivityData();
  const maxActivity = Math.max(...Object.values(activityData).flatMap(day => 
    Object.values(day).map(h => h.count)
  ), 1);

  const getColor = (count) => {
    if (count === 0) return '#f1f5f9';
    const intensity = count / maxActivity;
    
    if (intensity > 0.75) return '#1e40af'; // Dark blue
    if (intensity > 0.5) return '#3b82f6';  // Blue
    if (intensity > 0.25) return '#60a5fa'; // Light blue
    return '#bfdbfe'; // Very light blue
  };

  // Peak hours analysis
  const hourActivity = Array.from({ length: 24 }, (_, hour) => {
    const total = Object.values(activityData).reduce((sum, day) => 
      sum + (day[hour]?.count || 0), 0
    );
    return { hour, total };
  });

  const peakHour = hourActivity.reduce((max, curr) => 
    curr.total > max.total ? curr : max, hourActivity[0]
  );

  const busyHours = hourActivity
    .filter(h => h.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-700 mb-1">שעת השיא</p>
                <p className="text-2xl font-bold text-blue-900">{peakHour.hour}:00</p>
                <p className="text-xs text-blue-600">{peakHour.total} פעילויות</p>
              </div>
              <Clock className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-green-700 mb-1">סה"כ פעילויות</p>
                <p className="text-2xl font-bold text-green-900">
                  {Object.values(activityData).reduce((sum, day) => 
                    sum + Object.values(day).reduce((s, h) => s + h.count, 0), 0
                  )}
                </p>
              </div>
              <Activity className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
            <div>
              <p className="text-xs text-purple-700 mb-2">שעות עמוסות</p>
              <div className="flex gap-2">
                {busyHours.map(h => (
                  <Badge key={h.hour} className="bg-purple-600 text-white">
                    {h.hour}:00
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" />
            מפת חום - 7 ימים אחרונים
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="inline-block min-w-full">
              {/* Hours header */}
              <div className="flex">
                <div className="w-20" /> {/* Day label space */}
                {Array.from({ length: 24 }, (_, hour) => (
                  <div key={hour} className="flex-shrink-0 w-8 text-center text-xs text-slate-500">
                    {hour % 4 === 0 ? `${hour}` : ''}
                  </div>
                ))}
              </div>

              {/* Heatmap grid */}
              {Object.keys(activityData).map((dateKey, dayIndex) => {
                const date = new Date(dateKey);
                
                return (
                  <div key={dateKey} className="flex items-center mb-1">
                    <div className="w-20 text-xs text-slate-600 text-right pr-2">
                      {format(date, 'EEE dd/MM', { locale: he })}
                    </div>
                    {Array.from({ length: 24 }, (_, hour) => {
                      const activity = activityData[dateKey][hour];
                      const color = getColor(activity.count);
                      
                      return (
                        <div
                          key={hour}
                          className="flex-shrink-0 w-8 h-8 m-0.5 rounded transition-all hover:scale-110 cursor-pointer"
                          style={{ backgroundColor: color }}
                          title={`${format(date, 'dd/MM')} ${hour}:00 - ${activity.count} פעילויות${activity.types.length > 0 ? '\n' + activity.types.join(', ') : ''}`}
                        />
                      );
                    })}
                  </div>
                );
              })}

              {/* Legend */}
              <div className="flex items-center gap-2 mt-4 justify-center text-xs text-slate-600">
                <span>פחות</span>
                {[0, 0.25, 0.5, 0.75, 1].map((intensity, i) => (
                  <div
                    key={i}
                    className="w-6 h-6 rounded"
                    style={{ backgroundColor: getColor(maxActivity * intensity) }}
                  />
                ))}
                <span>יותר</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}