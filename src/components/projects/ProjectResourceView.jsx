import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Users, Clock, AlertTriangle } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function ProjectResourceView({ projectId }) {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadResources();
  }, [projectId]);

  const loadResources = async () => {
    setLoading(true);
    try {
      const subtasks = await base44.entities.SubTask.filter({ project_id: projectId });
      const users = await base44.entities.User.list();
      
      // חישוב עומס לכל משתמש
      const resourceMap = new Map();
      
      users.forEach(user => {
        resourceMap.set(user.email, {
          email: user.email,
          name: user.full_name || user.email,
          tasks: [],
          totalHours: 0,
          completedHours: 0
        });
      });
      
      subtasks?.forEach(task => {
        if (task.assigned_to && Array.isArray(task.assigned_to)) {
          task.assigned_to.forEach(userEmail => {
            const resource = resourceMap.get(userEmail);
            if (resource) {
              resource.tasks.push(task);
              resource.totalHours += task.estimated_hours || 0;
              if (task.status === 'הושלם') {
                resource.completedHours += task.estimated_hours || 0;
              }
            }
          });
        }
      });
      
      const resourceList = Array.from(resourceMap.values())
        .filter(r => r.tasks.length > 0)
        .sort((a, b) => b.totalHours - a.totalHours);
      
      setResources(resourceList);
    } catch (error) {
      console.error('Error loading resources:', error);
    } finally {
      setLoading(false);
    }
  };

  const getWorkloadColor = (hours) => {
    if (hours < 20) return 'text-green-600';
    if (hours < 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-slate-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (resources.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600">אין משאבים משוייכים</p>
          <p className="text-sm text-slate-500 mt-1">שייך משתמשים למשימות כדי לראות ניצול משאבים</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card dir="rtl">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          ניצול משאבים
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-6">
          {resources.map((resource) => {
            const workloadPercent = Math.min(100, (resource.totalHours / 40) * 100);
            const completionPercent = resource.totalHours > 0 
              ? (resource.completedHours / resource.totalHours) * 100 
              : 0;

            return (
              <div key={resource.email} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-slate-900">{resource.name}</h3>
                    <p className="text-sm text-slate-600">{resource.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-slate-50">
                      {resource.tasks.length} משימות
                    </Badge>
                    <Badge 
                      className={`${
                        resource.totalHours < 20 ? 'bg-green-100 text-green-800' :
                        resource.totalHours < 40 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}
                    >
                      {resource.totalHours} שעות
                    </Badge>
                  </div>
                </div>

                {/* עומס עבודה */}
                <div className="mb-3">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-slate-600">עומס עבודה</span>
                    <span className={getWorkloadColor(resource.totalHours)}>
                      {workloadPercent.toFixed(0)}%
                    </span>
                  </div>
                  <Progress value={workloadPercent} className="h-2" />
                  {resource.totalHours >= 40 && (
                    <div className="flex items-center gap-1 mt-1 text-xs text-red-600">
                      <AlertTriangle className="w-3 h-3" />
                      עומס יתר
                    </div>
                  )}
                </div>

                {/* התקדמות */}
                <div className="mb-3">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-slate-600">התקדמות</span>
                    <span className="text-blue-600">
                      {completionPercent.toFixed(0)}%
                    </span>
                  </div>
                  <Progress value={completionPercent} className="h-2" />
                </div>

                {/* משימות */}
                <div className="mt-4">
                  <div className="text-sm text-slate-600 mb-2">משימות מוקצות:</div>
                  <div className="space-y-1">
                    {resource.tasks.slice(0, 3).map((task) => (
                      <div key={task.id} className="flex items-center justify-between text-sm p-2 bg-slate-50 rounded">
                        <span className="truncate flex-1">{task.title}</span>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${
                              task.status === 'הושלם' ? 'bg-green-50 text-green-700' :
                              task.status === 'בתהליך' ? 'bg-blue-50 text-blue-700' :
                              'bg-slate-50 text-slate-700'
                            }`}
                          >
                            {task.status}
                          </Badge>
                          <span className="text-xs text-slate-500">
                            {task.estimated_hours}ש׳
                          </span>
                        </div>
                      </div>
                    ))}
                    {resource.tasks.length > 3 && (
                      <p className="text-xs text-slate-500 text-center">
                        + עוד {resource.tasks.length - 3} משימות
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}