
import React from 'react';
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  Calendar,
  TrendingUp,
  Edit,
  Users,
  Building2,
  Ruler,
  Copy,
  Trash2,
  CheckSquare,
  Square
} from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";

const statusColors = {
  'הצעת מחיר': 'bg-amber-100 text-amber-800 border-amber-200',
  'תכנון': 'bg-blue-100 text-blue-800 border-blue-200',
  'היתרים': 'bg-purple-100 text-purple-800 border-purple-200',
  'ביצוע': 'bg-green-100 text-green-800 border-green-200',
  'הושלם': 'bg-slate-100 text-slate-800 border-slate-200',
  'מבוטל': 'bg-red-100 text-red-800 border-red-200'
};

const typeColors = {
  'דירת מגורים': 'bg-blue-50 text-blue-700',
  'בית פרטי': 'bg-green-50 text-green-700',
  'משרדים': 'bg-purple-50 text-purple-700',
  'מסחרי': 'bg-amber-50 text-amber-700',
  'ציבורי': 'bg-red-50 text-red-700',
  'אחר': 'bg-slate-50 text-slate-700'
};

export default function ProjectCard({ project, onEdit, onView, selectionMode = false, selected = false, onToggleSelect, onCopy, onDelete }) {
  return (
    <Card
      className="hover:shadow-lg transition-all duration-200 cursor-pointer group bg-white/80 backdrop-blur-sm relative h-full flex flex-col"
      dir="rtl"
      onClick={() => onView && onView(project.id)}
    >
      {/* Selection toggle (appears only in selection mode) */}
      {selectionMode && (
        <button
          onClick={(e) => { e.stopPropagation(); onToggleSelect && onToggleSelect(); }}
          className="absolute top-3 left-3 z-10 bg-white/90 hover:bg-white rounded-md border px-1.5 py-1 shadow-sm"
          title={selected ? "בטל בחירה" : "בחר"}
        >
          {selected ? <CheckSquare className="w-5 h-5 text-purple-600" /> : <Square className="w-5 h-5 text-slate-500" />}
        </button>
      )}

      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h3 className="font-bold text-slate-900 mb-2 text-lg">{project.name}</h3>
            <div className="flex gap-2 flex-wrap mb-3">
              <Badge variant="outline" className={statusColors[project.status]}>
                {project.status}
              </Badge>
              <Badge variant="outline" className={typeColors[project.type]}>
                <Building2 className="w-3 h-3 ml-1" />
                {project.type}
              </Badge>
            </div>
            {project.client_name && (
              <Link
                to={`${createPageUrl("Clients")}?open=details&client_name=${encodeURIComponent(project.client_name)}`}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors text-sm font-medium"
                onClick={(e) => e.stopPropagation()} // Prevent card click from firing
              >
                <Users className="w-4 h-4" />
                {project.client_name}
              </Link>
            )}
          </div>

          {/* Per-card quick actions */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              title="העתק"
              onClick={(e) => { e.stopPropagation(); onCopy && onCopy(project); }}
              className="h-8 w-8 text-slate-500 hover:text-slate-700"
            >
              <Copy className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              title="מחק"
              onClick={(e) => {
                e.stopPropagation();
                if (onDelete) onDelete(project.id);
              }}
              className="h-8 w-8 text-red-600 hover:text-red-700"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="space-y-2">
          {project.location && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <MapPin className="w-4 h-4" />
              <span className="truncate">{project.location}</span>
            </div>
          )}

          {project.area && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Ruler className="w-4 h-4" />
              <span>{project.area} מ"ר</span>
            </div>
          )}

          {project.budget && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <TrendingUp className="w-4 h-4" />
              <span className="font-semibold">₪{project.budget.toLocaleString()}</span>
            </div>
          )}

          {project.start_date && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Calendar className="w-4 h-4" />
              <span>התחלה: {format(new Date(project.start_date), 'dd/MM/yy', { locale: he })}</span>
            </div>
          )}
        </div>

        {project.progress !== undefined && (
          <div className="pt-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-slate-600">התקדמות</span>
              <span className="text-xs font-semibold text-slate-700">{project.progress}%</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div
                className="bg-gradient-to-l from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${project.progress}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-3 border-t border-slate-100">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={(e) => { e.stopPropagation(); onEdit(project); }} // Prevent card click from firing
          >
            <Edit className="w-4 h-4 ml-2" />
            עריכה
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
