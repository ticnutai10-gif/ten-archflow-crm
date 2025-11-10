
import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { MapPin, Calendar, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { Project } from "@/entities/all";
import { Pencil, Trash2, Copy, CheckSquare, Square } from "lucide-react";


const statusColors = {
  'הצעת מחיר': 'bg-amber-100 text-amber-800 border-amber-200',
  'תכנון': 'bg-blue-100 text-blue-800 border-blue-200',
  'היתרים': 'bg-purple-100 text-purple-800 border-purple-200',
  'ביצוע': 'bg-green-100 text-green-800 border-green-200',
  'הושלם': 'bg-slate-100 text-slate-800 border-slate-200'
};

export default function RecentProjects({ projects, isLoading, onUpdate }) {
  const [selectionMode, setSelectionMode] = React.useState(false);
  const [selectedIds, setSelectedIds] = React.useState([]);

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    const all = projects.map(p => p.id);
    const isAll = selectedIds.length === all.length && all.length > 0 && selectedIds.every(id => all.includes(id));
    setSelectedIds(isAll ? [] : all);
  };

  const duplicateProject = async (project) => {
    const { id, created_date, updated_date, created_by, ...rest } = project;
    const newName = `${project.name} (העתק)`;
    await Project.create({ ...rest, name: newName });
    onUpdate && onUpdate();
  };

  const bulkCopy = async () => {
    if (selectedIds.length === 0) return;
    const setIds = new Set(selectedIds);
    for (const p of projects.filter(pr => setIds.has(pr.id))) {
      await duplicateProject(p);
    }
    setSelectedIds([]);
    onUpdate && onUpdate();
  };

  const deleteOne = async (id) => {
    if (!confirm("למחוק את הפרויקט? הפעולה אינה הפיכה.")) return;
    await Project.delete(id);
    onUpdate && onUpdate();
  };

  const bulkDelete = async () => {
    if (selectedIds.length === 0) return;
    const allSelected = selectedIds.length === projects.length;
    if (allSelected) {
      const ok = confirm(`נבחרו ${selectedIds.length} פרויקטים (כל הרשימה) למחיקה. להמשיך?`);
      if (!ok) return;
    } else if (!confirm(`למחוק ${selectedIds.length} פרויקטים?`)) {
      return;
    }
    await Promise.all(selectedIds.map((id) => Project.delete(id)));
    setSelectedIds([]);
    onUpdate && onUpdate();
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4 h-[400px] overflow-y-auto" dir="rtl">
        {Array(3).fill(0).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-20 bg-slate-200 rounded-lg"></div>
          </div>
        ))}
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="p-6 text-center h-[400px] flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <p className="text-slate-500">אין פרויקטים עדיין</p>
          <Link to={createPageUrl("Projects")}>
            <Button className="mt-4">הוסף פרויקט ראשון</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[400px] flex flex-col" dir="rtl">
      {/* Controls */}
      {projects.length > 0 && (
        <div className="flex-shrink-0 flex items-center justify-between px-6 pt-4 pb-2" dir="rtl">
          <div className="text-xs text-slate-500 text-right">
            {selectionMode ? `נבחרו ${selectedIds.length}` : `${projects.length} פרויקטים`}
          </div>
          <div className="flex items-center gap-2">
            {selectionMode && (
              <>
                <button onClick={selectAll} className="text-xs px-2 py-1 rounded border hover:bg-slate-50">
                  בחר הכל
                </button>
                <button onClick={bulkCopy} className="text-xs px-2 py-1 rounded border hover:bg-slate-50">
                  העתק
                </button>
                <button onClick={bulkDelete} className="text-xs px-2 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50">
                  מחק
                </button>
              </>
            )}
            <button
              onClick={() => { setSelectionMode(v => !v); setSelectedIds([]); }}
              className="text-xs px-2 py-1 rounded border hover:bg-slate-50"
            >
              {selectionMode ? "בטל בחירה" : "מצב בחירה"}
            </button>
          </div>
        </div>
      )}

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-6 pb-4" dir="rtl">
        <div className="space-y-4">
          {projects.map((project) => (
            <div key={project.id} className="p-4 border border-slate-200 rounded-xl hover:shadow-md transition-all duration-200 bg-white relative" dir="rtl">
              {/* selection toggle */}
              {selectionMode && (
                <button
                  onClick={() => toggleSelect(project.id)}
                  className="absolute top-3 left-3 bg-white rounded border p-1"
                  title={selectedIds.includes(project.id) ? "בטל בחירה" : "בחר"}
                >
                  {selectedIds.includes(project.id) ? (
                    <CheckSquare className="w-4 h-4 text-purple-600" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-500" />
                  )}
                </button>
              )}

              <div className="flex justify-between items-start mb-3" dir="rtl">
                <div className="flex-1 text-right" dir="rtl">
                  <h3 className="font-semibold text-slate-900 mb-1 text-right">{project.name}</h3>
                  <p className="text-sm text-slate-600 mb-2 text-right">{project.client_name}</p>
                  {/* meta row */}
                  <div className="flex items-center gap-4 text-sm text-slate-500">
                    {project.location && (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        <span>{project.location}</span>
                      </div>
                    )}
                    {project.start_date && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>{format(new Date(project.start_date), 'dd/MM/yyyy', { locale: he })}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Badge and quick actions */}
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={statusColors[project.status] || 'bg-slate-100 text-slate-800'}>
                    {project.status}
                  </Badge>
                  <div className="flex items-center gap-1">
                    <button
                      className="h-8 w-8 flex items-center justify-center rounded hover:bg-slate-50"
                      title="ערוך (פתיחה בעמוד פרויקטים)"
                    >
                      <Link to={`${createPageUrl("Projects")}?search=${encodeURIComponent(project.name)}`}>
                        <Pencil className="w-4 h-4 text-slate-600" />
                      </Link>
                    </button>
                    <button
                      className="h-8 w-8 flex items-center justify-center rounded hover:bg-slate-50"
                      title="העתק"
                      onClick={() => duplicateProject(project)}
                    >
                      <Copy className="w-4 h-4 text-slate-600" />
                    </button>
                    <button
                      className="h-8 w-8 flex items-center justify-center rounded hover:bg-red-50"
                      title="מחק"
                      onClick={() => deleteOne(project.id)}
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>
              </div>

              {project.progress !== undefined && (
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-l from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      
      {/* Fixed footer */}
      <div className="flex-shrink-0 px-6 pb-4 pt-2 border-t border-slate-100" dir="rtl">
        <Link to={createPageUrl("Projects")}>
          <Button variant="outline" className="w-full text-sm">
            <ExternalLink className="w-4 h-4 ml-2" />
            צפה בכל הפרויקטים
          </Button>
        </Link>
      </div>
    </div>
  );
}
