
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { 
  MoreVertical,
  Edit,
  Trash2,
  CheckCircle2,
  Circle,
  ArrowUpCircle,
  Clock,
  User,
  FolderOpen,
  Calendar,
  AlertTriangle,
  Bell,
  BellOff,
  Copy // Added Copy icon
} from "lucide-react";
import { format, isToday, isTomorrow, isPast } from "date-fns";
import { he } from "date-fns/locale";

const statusIcons = {
  'חדשה': Circle,
  'בתהליך': ArrowUpCircle,
  'הושלמה': CheckCircle2,
  'דחויה': Clock
};

const priorityColors = {
  'גבוהה': 'bg-red-100 text-red-800 border-red-200',
  'בינונית': 'bg-amber-100 text-amber-800 border-amber-200',
  'נמוכה': 'bg-green-100 text-green-800 border-green-200'
};

const statusColors = {
  'חדשה': 'bg-blue-100 text-blue-800 border-blue-200',
  'בתהליך': 'bg-purple-100 text-purple-800 border-purple-200',
  'הושלמה': 'bg-green-100 text-green-800 border-green-200',
  'דחויה': 'bg-slate-100 text-slate-800 border-slate-200'
};

// New constant for status icon colors
const statusIconColors = {
  'חדשה': 'text-blue-500',
  'בתהליך': 'text-purple-500',
  'הושלמה': 'text-green-500',
  'דחויה': 'text-slate-500'
};

export default function TaskCard({ task, onEdit, onDelete, onUpdate, onCopy }) {
  const StatusIcon = statusIcons[task.status];
  
  const formatDueDate = () => {
    if (!task.due_date) return null;
    const dueDate = new Date(task.due_date);
    
    if (isToday(dueDate)) return 'היום';
    if (isTomorrow(dueDate)) return 'מחר';
    // isPast check is now only for formatting, urgency styling is removed
    if (isPast(dueDate)) return `איחור: ${format(dueDate, 'dd/MM', { locale: he })}`;
    return format(dueDate, 'dd/MM/yyyy', { locale: he });
  };

  const toggleStatus = (e) => {
    e.stopPropagation();
    const currentStatus = task.status;
    let newStatus;
    switch (currentStatus) {
      case 'חדשה':
        newStatus = 'בתהליך';
        break;
      case 'בתהליך':
        newStatus = 'הושלמה';
        break;
      case 'הושלמה':
        newStatus = 'דחויה';
        break;
      case 'דחויה':
        newStatus = 'חדשה';
        break;
      default:
        newStatus = 'חדשה';
    }
    onUpdate(task.id, { status: newStatus });
  };

  return (
    <div 
      className={`bg-white rounded-xl border transition-all duration-200 hover:shadow-lg ${
        task.status === 'הושלמה' ? 'border-green-200 bg-green-50/30' : 'border-slate-200'
      }`}
      dir="rtl"
    >
      <div className="p-5" dir="rtl">
        {/* Header */}
        <div className="flex items-start justify-between mb-3" dir="rtl">
          <div className="flex items-start gap-3 flex-1 min-w-0" dir="rtl">
            <button
              onClick={toggleStatus}
              className="mt-1 flex-shrink-0"
              title="שנה סטטוס"
            >
              {StatusIcon && <StatusIcon className={`w-5 h-5 ${statusIconColors[task.status]}`} />}
            </button>

            <div className="flex-1 min-w-0 text-right" dir="rtl">
              <h3 className={`font-semibold text-slate-900 mb-1 text-right ${
                task.status === 'הושלמה' ? 'line-through text-slate-500' : ''
              }`}>
                {task.title}
              </h3>

              {task.description && (
                <p className="text-sm text-slate-600 line-clamp-2 mb-2 text-right">
                  {task.description}
                </p>
              )}

              <div className="flex flex-wrap gap-2 mt-2" dir="rtl">
                <Badge variant="outline" className={statusColors[task.status]}>
                  {task.status}
                </Badge>
                {task.priority && (
                  <Badge variant="outline" className={priorityColors[task.priority]}>
                    {task.priority}
                  </Badge>
                )}
                {/* Quick reminder button */}
                <button
                  onClick={(e) => e.stopPropagation()} // Prevent card view/selection
                  className={`transition-all hover:scale-110 ${
                    task.reminder_enabled 
                      ? 'text-amber-500 hover:text-amber-600' 
                      : 'text-slate-400 hover:text-amber-500'
                  }`}
                  title={task.reminder_enabled ? 'כבה תזכורת' : 'הפעל תזכורת מהירה'}
                >
                  <Bell className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={(e) => e.stopPropagation()} // Prevent card view/selection
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(task); }}>
                <Edit className="w-4 h-4 ml-2" />
                עריכה
              </DropdownMenuItem>
              {/* Added Copy option */}
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onCopy(task); }}>
                <Copy className="w-4 h-4 ml-2" />
                העתקה
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); }}>
                {task.reminder_enabled ? <BellOff className="w-4 h-4 ml-2" /> : <Bell className="w-4 h-4 ml-2" />}
                {task.reminder_enabled ? 'כבה תזכורת' : 'הפעל תזכורת'} (לא פעיל)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(task.id); }} className="text-red-600">
                <Trash2 className="w-4 h-4 ml-2" />
                מחיקה
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Footer */}
        {(task.client_name || task.project_name || task.due_date) && (
          <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-slate-100 text-sm text-slate-500" dir="rtl">
            {task.client_name && (
                <div className="flex items-center gap-1 flex-row-reverse">
                  <span className="text-right">{task.client_name}</span>
                  <User className="w-4 h-4" />
                </div>
              )}
              
            {task.project_name && (
                <div className="flex items-center gap-1 flex-row-reverse">
                  <span className="text-right">{task.project_name}</span>
                  <FolderOpen className="w-4 h-4" />
                </div>
              )}
              
            {task.due_date && (
                <div className={`flex items-center gap-1 flex-row-reverse`}>
                  <span className="text-right">{formatDueDate()}</span>
                  <Calendar className="w-4 h-4" />
                </div>
              )}
          </div>
        )}
      </div>
    </div>
  );
}
