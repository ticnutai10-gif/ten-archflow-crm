import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  User,
  Calendar,
  TrendingUp
} from 'lucide-react';
import { format, differenceInDays, isPast, isToday } from 'date-fns';
import { he } from 'date-fns/locale';

export default function CriticalTasksSummary({ subtasks = [], onTaskClick }) {
  // Filter critical and high priority tasks
  const criticalTasks = subtasks.filter(
    t => t.is_critical || t.priority === 'קריטית' || t.priority === 'דחופה'
  );

  // Overdue tasks
  const overdueTasks = subtasks.filter(t => {
    if (t.status === 'הושלם') return false;
    const dueDate = t.due_date || t.end_date;
    return dueDate && isPast(new Date(dueDate)) && !isToday(new Date(dueDate));
  });

  // Tasks due today
  const todayTasks = subtasks.filter(t => {
    if (t.status === 'הושלם') return false;
    const dueDate = t.due_date || t.end_date;
    return dueDate && isToday(new Date(dueDate));
  });

  // Tasks due in next 7 days
  const upcomingTasks = subtasks.filter(t => {
    if (t.status === 'הושלם') return false;
    const dueDate = t.due_date || t.end_date;
    if (!dueDate) return false;
    const days = differenceInDays(new Date(dueDate), new Date());
    return days > 0 && days <= 7;
  });

  // Calculate stats
  const totalTasks = subtasks.length;
  const completedTasks = subtasks.filter(t => t.status === 'הושלם').length;
  const inProgressTasks = subtasks.filter(t => t.status === 'בתהליך').length;
  const blockedTasks = subtasks.filter(t => t.status === 'חסום').length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'קריטית': return 'bg-red-100 text-red-700 border-red-200';
      case 'דחופה': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'גבוהה': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'בינונית': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'הושלם': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'בתהליך': return <TrendingUp className="w-4 h-4 text-blue-500" />;
      case 'חסום': return <AlertCircle className="w-4 h-4 text-red-500" />;
      default: return <Clock className="w-4 h-4 text-slate-400" />;
    }
  };

  const TaskItem = ({ task }) => {
    const dueDate = task.due_date || task.end_date;
    const isOverdue = dueDate && isPast(new Date(dueDate)) && task.status !== 'הושלם';
    const isDueToday = dueDate && isToday(new Date(dueDate));

    return (
      <div 
        className={`p-3 rounded-lg border transition-all cursor-pointer hover:shadow-md ${
          isOverdue ? 'bg-red-50 border-red-200' : 
          isDueToday ? 'bg-amber-50 border-amber-200' : 
          'bg-white border-slate-200'
        }`}
        onClick={() => onTaskClick?.(task)}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {getStatusIcon(task.status)}
            <span className="font-medium text-slate-900 truncate">{task.title}</span>
          </div>
          <Badge className={`text-xs ${getPriorityColor(task.priority)}`}>
            {task.priority}
          </Badge>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
          {dueDate && (
            <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-600 font-medium' : ''}`}>
              <Calendar className="w-3 h-3" />
              {format(new Date(dueDate), 'd MMM', { locale: he })}
              {isOverdue && ' (באיחור!)'}
            </span>
          )}
          
          {task.assigned_to?.length > 0 && (
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" />
              {task.assigned_to.length === 1 
                ? task.assigned_to[0].split('@')[0] 
                : `${task.assigned_to.length} משתמשים`
              }
            </span>
          )}

          {task.progress > 0 && (
            <span className="flex items-center gap-1 text-blue-600">
              <TrendingUp className="w-3 h-3" />
              {task.progress}%
            </span>
          )}
        </div>

        {/* Subtasks progress */}
        {task.subtasks?.length > 0 && (
          <div className="mt-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span>תתי-משימות</span>
              <span>
                {task.subtasks.filter(s => s.completed).length}/{task.subtasks.length}
              </span>
            </div>
            <Progress 
              value={(task.subtasks.filter(s => s.completed).length / task.subtasks.length) * 100} 
              className="h-1.5"
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-blue-700">{totalTasks}</div>
            <div className="text-sm text-blue-600">סה"כ משימות</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-green-700">{completionRate}%</div>
            <div className="text-sm text-green-600">השלמה</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-red-700">{overdueTasks.length}</div>
            <div className="text-sm text-red-600">באיחור</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-amber-700">{blockedTasks}</div>
            <div className="text-sm text-amber-600">חסומות</div>
          </CardContent>
        </Card>
      </div>

      {/* Critical Tasks Section */}
      {criticalTasks.length > 0 && (
        <Card className="border-red-200 shadow-md">
          <CardHeader className="pb-3 bg-gradient-to-r from-red-50 to-orange-50">
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="w-5 h-5" />
              משימות קריטיות ({criticalTasks.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-2">
              {criticalTasks.slice(0, 5).map(task => (
                <TaskItem key={task.id} task={task} />
              ))}
              {criticalTasks.length > 5 && (
                <div className="text-center text-sm text-slate-500 pt-2">
                  +{criticalTasks.length - 5} משימות נוספות
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overdue Tasks */}
      {overdueTasks.length > 0 && (
        <Card className="border-red-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-red-600 text-lg">
              <AlertCircle className="w-5 h-5" />
              משימות באיחור ({overdueTasks.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-2">
              {overdueTasks.slice(0, 5).map(task => (
                <TaskItem key={task.id} task={task} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Today's Tasks */}
      {todayTasks.length > 0 && (
        <Card className="border-amber-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-amber-600 text-lg">
              <Clock className="w-5 h-5" />
              לביצוע היום ({todayTasks.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-2">
              {todayTasks.map(task => (
                <TaskItem key={task.id} task={task} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Tasks */}
      {upcomingTasks.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-blue-600 text-lg">
              <Calendar className="w-5 h-5" />
              בשבוע הקרוב ({upcomingTasks.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-2">
              {upcomingTasks.slice(0, 5).map(task => (
                <TaskItem key={task.id} task={task} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {totalTasks === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <CheckCircle2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600">אין משימות עדיין</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}