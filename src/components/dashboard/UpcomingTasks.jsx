
import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Calendar, Clock, ExternalLink } from "lucide-react";
import { format, isToday, isTomorrow } from "date-fns";
import { he } from "date-fns/locale";
import { Task } from "@/entities/all";
import { Pencil, Trash2, CheckSquare, Square } from "lucide-react";

const priorityColors = {
  'גבוהה': 'bg-red-100 text-red-800 border-red-200',
  'בינונית': 'bg-amber-100 text-amber-800 border-amber-200',
  'נמוכה': 'bg-green-100 text-green-800 border-green-200'
};

const getDateLabel = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  
  if (isToday(date)) return 'היום';
  if (isTomorrow(date)) return 'מחר';
  
  return format(date, 'dd/MM', { locale: he });
};

export default function UpcomingTasks({ tasks, isLoading, onUpdate }) {
  const [selectionMode, setSelectionMode] = React.useState(false);
  const [selectedIds, setSelectedIds] = React.useState([]);

  const toggleSelect = (id) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const selectAll = () => {
    const allTaskIds = tasks.map(t => t.id);
    // Check if all tasks are currently selected
    const areAllSelected = selectedIds.length === allTaskIds.length && 
                           allTaskIds.length > 0 && 
                           selectedIds.every(id => allTaskIds.includes(id));
    setSelectedIds(areAllSelected ? [] : allTaskIds);
  };

  const deleteOne = async (id) => {
    if (!confirm("למחוק את המשימה?")) return;
    await Task.delete(id);
    onUpdate && onUpdate();
  };

  const bulkDelete = async () => {
    if (selectedIds.length === 0) return;
    const allTaskIds = tasks.map(t => t.id);
    const areAllCurrentlySelected = selectedIds.length === allTaskIds.length && allTaskIds.length > 0;

    if (areAllCurrentlySelected) {
      const ok = confirm(`נבחרו ${selectedIds.length} משימות (כל הרשימה) למחיקה. להמשיך?`);
      if (!ok) return;
    } else if (!confirm(`למחוק ${selectedIds.length} משימות?`)) {
      return;
    }
    await Promise.all(selectedIds.map((id) => Task.delete(id)));
    setSelectedIds([]);
    setSelectionMode(false); // Exit selection mode after bulk delete
    onUpdate && onUpdate();
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-3 h-[400px] overflow-y-auto">
        {Array(4).fill(0).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-16 bg-slate-200 rounded-lg"></div>
          </div>
        ))}
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="p-6 text-center h-[400px] flex items-center justify-center">
        <p className="text-slate-500 text-sm">אין משימות קרובות</p>
      </div>
    );
  }

  return (
    <div className="h-[400px] flex flex-col">
      {/* Controls */}
      {tasks.length > 0 && (
        <div className="flex-shrink-0 flex items-center justify-between px-6 pt-4 pb-2">
          <div className="text-xs text-slate-500">
            {selectionMode ? `נבחרו ${selectedIds.length}` : `${tasks.length} משימות`}
          </div>
          <div className="flex items-center gap-2">
            {selectionMode && (
              <>
                <button onClick={selectAll} className="text-xs px-2 py-1 rounded border hover:bg-slate-50">
                  בחר הכל
                </button>
                <button onClick={bulkDelete} className="text-xs px-2 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50">
                  מחק
                </button>
              </>
            )}
            <button onClick={() => { setSelectionMode(v => !v); setSelectedIds([]); }} className="text-xs px-2 py-1 rounded border hover:bg-slate-50">
              {selectionMode ? "בטל בחירה" : "מצב בחירה"}
            </button>
          </div>
        </div>
      )}

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-6">
        <div className="space-y-3">
          {tasks.map((task) => (
            <div key={task.id} className="p-3 border border-slate-200 rounded-lg hover:shadow-sm transition-all duration-200 bg-white relative">
              {selectionMode && (
                <button
                  onClick={(e) => { e.stopPropagation(); toggleSelect(task.id); }}
                  className="absolute top-2 left-2 bg-white rounded border p-1"
                  title={selectedIds.includes(task.id) ? "בטל בחירה" : "בחר"}
                >
                  {selectedIds.includes(task.id) ? <CheckSquare className="w-4 h-4 text-purple-600" /> : <Square className="w-4 h-4 text-slate-500" />}
                </button>
              )}

              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h4 className={`font-medium text-slate-900 text-sm mb-1 ${selectionMode ? 'ml-8' : ''}`}>
                    {task.title}
                  </h4>
                  <div className={`flex items-center gap-3 text-xs text-slate-500 ${selectionMode ? 'ml-8' : ''}`}>
                    {task.project_name && (
                      <span>{task.project_name}</span>
                    )}
                    {task.due_date && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{getDateLabel(task.due_date)}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!selectionMode && (
                    <>
                      <a
                        href={`${createPageUrl("Tasks")}?search=${encodeURIComponent(task.title)}`}
                        title="ערוך (פתיחה בעמוד משימות)"
                        className="h-7 w-7 flex items-center justify-center rounded hover:bg-slate-50"
                      >
                        <Pencil className="w-4 h-4 text-slate-600" />
                      </a>
                      <button
                        title="מחק"
                        onClick={() => deleteOne(task.id)}
                        className="h-7 w-7 flex items-center justify-center rounded hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </>
                  )}
                  {task.priority && (
                    <Badge variant="outline" className={`${priorityColors[task.priority]} text-xs px-2 py-1`}>
                      {task.priority}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Fixed footer */}
      <div className="flex-shrink-0 px-6 pb-4 pt-2 border-t border-slate-100">
        <Link to={createPageUrl("Tasks")}>
          <Button variant="outline" size="sm" className="w-full text-sm">
            <ExternalLink className="w-4 h-4 ml-2" />
            צפה בכל המשימות
          </Button>
        </Link>
      </div>
    </div>
  );
}
