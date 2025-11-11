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
import { Progress } from "@/components/ui/progress";
import { MapPin, Calendar, Users, MoreVertical, Edit, Eye, Copy, Trash2, CheckSquare, Square } from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";

const STATUS_COLORS = {
  "הצעת מחיר": "bg-blue-100 text-blue-800 border-blue-200",
  "תכנון": "bg-purple-100 text-purple-800 border-purple-200",
  "היתרים": "bg-yellow-100 text-yellow-800 border-yellow-200",
  "ביצוע": "bg-orange-100 text-orange-800 border-orange-200",
  "הושלם": "bg-green-100 text-green-800 border-green-200",
  "מבוטל": "bg-red-100 text-red-800 border-red-200"
};

export default function ProjectCard({ 
  project = {}, 
  onEdit, 
  selectionMode = false,
  selected = false,
  onToggleSelect,
  onCopy,
  onDelete
}) {
  if (!project || typeof project !== 'object') {
    return null;
  }

  const projectName = project.name || 'פרויקט ללא שם';
  const clientName = project.client_name || 'לקוח לא ידוע';
  const projectStatus = project.status || 'הצעת מחיר';
  const statusColor = STATUS_COLORS[projectStatus] || STATUS_COLORS["הצעת מחיר"];
  const progress = Math.min(100, Math.max(0, project.progress || 0));

  const formatDate = (dateString) => {
    if (!dateString) return null;
    try {
      return format(new Date(dateString), 'dd/MM/yyyy', { locale: he });
    } catch {
      return null;
    }
  };

  const startDateFormatted = formatDate(project.start_date);
  const endDateFormatted = formatDate(project.end_date);

  return (
    <Card className={`bg-white/80 backdrop-blur-sm hover:shadow-lg transition-all ${selected ? 'ring-2 ring-blue-500' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start gap-2">
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

          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-bold text-slate-900 mb-2 truncate">
              {projectName}
            </CardTitle>
            <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
              <Users className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{clientName}</span>
            </div>
            <Badge variant="outline" className={`${statusColor} text-xs`}>
              {projectStatus}
            </Badge>
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
                  onClick={(e) => { e.stopPropagation(); onDelete?.(project.id); }}
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
        {project.location && (
          <div className="flex items-center gap-2 text-slate-600 text-sm">
            <MapPin className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{project.location}</span>
          </div>
        )}
        
        {(startDateFormatted || endDateFormatted) && (
          <div className="flex items-center gap-2 text-slate-600 text-sm">
            <Calendar className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">
              {startDateFormatted && endDateFormatted 
                ? `${startDateFormatted} - ${endDateFormatted}`
                : startDateFormatted || endDateFormatted || 'לא הוגדר'}
            </span>
          </div>
        )}
        
        {project.budget && (
          <div className="pt-2 border-t">
            <div className="text-xs text-slate-500 mb-1">תקציב</div>
            <div className="font-semibold text-slate-700">
              ₪{project.budget.toLocaleString('he-IL')}
            </div>
          </div>
        )}
        
        <div className="pt-2 border-t">
          <div className="flex justify-between text-xs text-slate-500 mb-2">
            <span>התקדמות</span>
            <span className="font-semibold">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </CardContent>
    </Card>
  );
}