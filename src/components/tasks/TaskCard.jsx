import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Calendar, Users, Briefcase, MoreVertical, Edit, Trash2, Copy, CheckSquare, Square, AlertCircle, ShoppingCart } from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";

const STATUS_COLORS = {
  "חדשה": "bg-blue-100 text-blue-800 border-blue-200",
  "בתהליך": "bg-yellow-100 text-yellow-800 border-yellow-200",
  "הושלמה": "bg-green-100 text-green-800 border-green-200",
  "דחויה": "bg-red-100 text-red-800 border-red-200"
};

const PRIORITY_COLORS = {
  "גבוהה": "bg-red-100 text-red-800 border-red-200",
  "בינונית": "bg-yellow-100 text-yellow-800 border-yellow-200",
  "נמוכה": "bg-green-100 text-green-800 border-green-200"
};

export default function TaskCard({ 
  task = {}, 
  onEdit, 
  onDelete, 
  onCopy,
  selectionMode = false,
  selected = false,
  onToggleSelect
}) {
  if (!task || typeof task !== 'object') {
    return null;
  }

  const taskTitle = task.title || 'משימה ללא כותרת';
  const taskStatus = task.status || 'חדשה';
  const taskPriority = task.priority || 'בינונית';
  
  const statusColor = STATUS_COLORS[taskStatus] || STATUS_COLORS["חדשה"];
  const priorityColor = PRIORITY_COLORS[taskPriority] || PRIORITY_COLORS["בינונית"];

  const formatDate = (dateString) => {
    if (!dateString) return null;
    try {
      return format(new Date(dateString), 'dd/MM/yyyy', { locale: he });
    } catch {
      return null;
    }
  };

  const dueDateFormatted = formatDate(task.due_date);
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && taskStatus !== 'הושלמה';

  return (
    <Card className={`bg-white/80 backdrop-blur-sm hover:shadow-lg transition-all ${selected ? 'ring-2 ring-blue-500' : ''} ${isOverdue ? 'border-l-4 border-l-red-500' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          {selectionMode && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleSelect?.();
              }}
              className="flex-shrink-0 mt-1"
            >
              {selected ? (
                <CheckSquare className="w-5 h-5 text-blue-600" />
              ) : (
                <Square className="w-5 h-5 text-slate-400" />
              )}
            </button>
          )}

          {/* אייקון לפי קטגוריה */}
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
            taskPriority === 'דחופה' || taskPriority === 'גבוהה' 
              ? 'bg-red-100' 
              : taskPriority === 'בינונית'
              ? 'bg-yellow-100'
              : 'bg-green-100'
          }`}>
            {task.category === 'פגישה' ? (
              <Calendar className={`w-6 h-6 ${
                taskPriority === 'דחופה' || taskPriority === 'גבוהה' 
                  ? 'text-red-600' 
                  : taskPriority === 'בינונית'
                  ? 'text-yellow-600'
                  : 'text-green-600'
              }`} />
            ) : task.category === 'קניות' || task.category === 'קנייה' ? (
              <ShoppingCart className={`w-6 h-6 ${
                taskPriority === 'דחופה' || taskPriority === 'גבוהה' 
                  ? 'text-red-600' 
                  : taskPriority === 'בינונית'
                  ? 'text-yellow-600'
                  : 'text-green-600'
              }`} />
            ) : (
              <CheckSquare className={`w-6 h-6 ${
                taskPriority === 'דחופה' || taskPriority === 'גבוהה' 
                  ? 'text-red-600' 
                  : taskPriority === 'בינונית'
                  ? 'text-yellow-600'
                  : 'text-green-600'
              }`} />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-bold text-slate-900 mb-2 truncate flex items-center gap-2">
              {taskTitle}
              {isOverdue && (
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" title="איחור!" />
              )}
            </CardTitle>
            <div className="flex flex-wrap gap-2 mb-2">
              <Badge variant="outline" className={`${statusColor} text-xs`}>
                {taskStatus}
              </Badge>
              <Badge variant="outline" className={`${priorityColor} text-xs`}>
                עדיפות {taskPriority}
              </Badge>
            </div>
          </div>
          
          {!selectionMode && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" dir="rtl">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit?.(); }}>
                  <Edit className="w-4 h-4 ml-2" />
                  ערוך
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onCopy?.(); }}>
                  <Copy className="w-4 h-4 ml-2" />
                  שכפל
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
                  className="text-red-600"
                >
                  <Trash2 className="w-4 h-4 ml-2" />
                  מחק
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {task.description && (
          <p className="text-sm text-slate-600 line-clamp-2">
            {task.description}
          </p>
        )}

        {task.client_name && (
          <div className="flex items-center gap-2 text-slate-600 text-sm">
            <Users className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{task.client_name}</span>
          </div>
        )}
        
        {task.project_name && (
          <div className="flex items-center gap-2 text-slate-600 text-sm">
            <Briefcase className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{task.project_name}</span>
          </div>
        )}
        
        {dueDateFormatted && (
          <div className="flex items-center gap-2 text-slate-600 text-sm">
            <Calendar className="w-4 h-4 flex-shrink-0" />
            <span className={isOverdue ? 'text-red-600 font-semibold' : ''}>
              {dueDateFormatted}
              {isOverdue && ' (באיחור!)'}
            </span>
          </div>
        )}

        {task.assigned_to && (
          <div className="pt-2 border-t">
            <div className="text-xs text-slate-500 mb-1">הוקצה ל</div>
            <div className="font-semibold text-slate-700 text-sm">{task.assigned_to}</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}