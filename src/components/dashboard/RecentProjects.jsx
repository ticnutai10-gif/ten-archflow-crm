import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { MapPin, Calendar, Edit, Eye, Copy, Trash2, CheckSquare, Square } from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";

const STATUS_COLORS = {
  "הצעת מחיר": "bg-blue-100 text-blue-800",
  "תכנון": "bg-purple-100 text-purple-800",
  "היתרים": "bg-yellow-100 text-yellow-800",
  "ביצוע": "bg-orange-100 text-orange-800",
  "הושלם": "bg-green-100 text-green-800",
  "מבוטל": "bg-red-100 text-red-800"
};

export default function RecentProjects({ projects = [], isLoading, onUpdate }) {
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  const toggleSelect = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`למחוק ${selectedIds.length} פרויקטים?`)) return;
    
    await Promise.all(selectedIds.map(id => base44.entities.Project.delete(id)));
    setSelectedIds([]);
    setSelectionMode(false);
    onUpdate?.();
  };

  const handleBulkCopy = async () => {
    if (selectedIds.length === 0) return;
    
    const toCopy = projects.filter(p => selectedIds.includes(p.id));
    for (const project of toCopy) {
      const { id, created_date, updated_date, created_by, ...rest } = project;
      await base44.entities.Project.create({ ...rest, name: `${project.name || 'פרויקט'} (העתק)` });
    }
    setSelectedIds([]);
    setSelectionMode(false);
    onUpdate?.();
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'לא הוגדר';
    try {
      return format(new Date(dateString), 'dd/MM/yyyy', { locale: he });
    } catch {
      return 'תאריך לא תקין';
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-24 bg-slate-200 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (!projects || projects.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500">
        <p className="mb-4">אין פרויקטים אחרונים</p>
        <Link to={createPageUrl("Projects")}>
          <Button variant="outline" size="sm">צור פרויקט ראשון</Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      {selectionMode && selectedIds.length > 0 && (
        <div className="p-3 bg-blue-50 border-b flex items-center justify-between">
          <span className="text-sm text-blue-900">נבחרו {selectedIds.length} פרויקטים</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleBulkCopy}>
              <Copy className="w-3 h-3 ml-1" />
              העתק
            </Button>
            <Button size="sm" variant="destructive" onClick={handleBulkDelete}>
              <Trash2 className="w-3 h-3 ml-1" />
              מחק
            </Button>
          </div>
        </div>
      )}

      <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
        {projects.map((project) => {
          if (!project || typeof project !== 'object') return null;
          
          const projectName = project.name || 'פרויקט ללא שם';
          const clientName = project.client_name || 'לקוח לא ידוע';
          const projectStatus = project.status || 'הצעת מחיר';
          const statusColor = STATUS_COLORS[projectStatus] || STATUS_COLORS["הצעת מחיר"];
          const progress = Math.min(100, Math.max(0, project.progress || 0));

          return (
            <div
              key={project.id}
              className={`p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-all cursor-pointer ${
                selectedIds.includes(project.id) ? 'ring-2 ring-blue-500' : ''
              }`}
              onClick={() => selectionMode && toggleSelect(project.id)}
            >
              <div className="flex items-start gap-3">
                {selectionMode && (
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleSelect(project.id); }}
                    className="flex-shrink-0 mt-1"
                  >
                    {selectedIds.includes(project.id) ? (
                      <CheckSquare className="w-5 h-5 text-blue-600" />
                    ) : (
                      <Square className="w-5 h-5 text-slate-400" />
                    )}
                  </button>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-slate-900 truncate">{projectName}</h4>
                    <Badge className={`${statusColor} text-xs flex-shrink-0 ml-2`}>
                      {projectStatus}
                    </Badge>
                  </div>
                  
                  <div className="text-sm text-slate-600 space-y-1">
                    <div className="flex items-center gap-2">
                      <Eye className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{clientName}</span>
                    </div>
                    
                    {project.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{project.location}</span>
                      </div>
                    )}
                    
                    {project.start_date && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3 h-3 flex-shrink-0" />
                        <span>{formatDate(project.start_date)}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span>התקדמות</span>
                      <span className="font-semibold">{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-1.5" />
                  </div>
                </div>

                {!selectionMode && (
                  <div className="flex gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => { e.stopPropagation(); /* onEdit */ }}
                      title="ערוך"
                    >
                      <Edit className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-3 border-t flex justify-between items-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setSelectionMode(!selectionMode);
            setSelectedIds([]);
          }}
        >
          {selectionMode ? 'ביטול בחירה' : 'בחר מרובים'}
        </Button>
        <Link to={createPageUrl("Projects")}>
          <Button variant="outline" size="sm">כל הפרויקטים →</Button>
        </Link>
      </div>
    </div>
  );
}