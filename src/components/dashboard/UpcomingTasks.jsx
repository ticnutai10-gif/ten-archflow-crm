import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, User, AlertTriangle, CheckSquare, Square, Trash2 } from "lucide-react";
import { format, isPast } from "date-fns";
import { he } from "date-fns/locale";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";

const PRIORITY_COLORS = {
  "גבוהה": "bg-red-100 text-red-800",
  "בינונית": "bg-yellow-100 text-yellow-800",
  "נמוכה": "bg-green-100 text-green-800"
};

export default function UpcomingTasks({ tasks, isLoading, onUpdate }) {
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  // ✅ הגנה מלאה על tasks
  const safeTasks = React.useMemo(() => {
    if (!tasks) {
      console.warn('⚠️ [UpcomingTasks] tasks is null/undefined');
      return [];
    }
    if (!Array.isArray(tasks)) {
      console.error('❌ [UpcomingTasks] tasks is not an array!', tasks);
      return [];
    }
    return tasks.filter(t => t && typeof t === 'object');
  }, [tasks]);

  const toggleSelect = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`למחוק ${selectedIds.length} משימות?`)) return;
    
    try {
      await Promise.all(selectedIds.map(id => base44.entities.Task.delete(id)));
      setSelectedIds([]);
      setSelectionMode(false);
      onUpdate?.();
    } catch (error) {
      console.error('Error deleting tasks:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-20 bg-slate-200 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (safeTasks.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500">
        <p className="mb-4">אין משימות קרובות</p>
        <Link to={createPageUrl("Tasks")}>
          <Button variant="outline" size="sm">צור משימה ראשונה</Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      {selectionMode && selectedIds.length > 0 && (
        <div className="p-3 bg-blue-50 border-b flex items-center justify-between">
          <span className="text-sm text-blue-900">נבחרו {selectedIds.length} משימות</span>
          <Button size="sm" variant="destructive" onClick={handleBulkDelete}>
            <Trash2 className="w-3 h-3 ml-1" />
            מחק
          </Button>
        </div>
      )}

      <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
        {safeTasks.map((task) => {
          if (!task || typeof task !== 'object') {
            console.error('Invalid task:', task);
            return null;
          }

          const isOverdue = task.due_date && isPast(new Date(task.due_date));
          const priorityColor = PRIORITY_COLORS[task.priority || "בינונית"];

          return (
            <div
              key={task.id}
              className={`p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-all cursor-pointer ${
                selectedIds.includes(task.id) ? 'ring-2 ring-blue-500' : ''
              } ${isOverdue ? 'border-r-4 border-red-500' : ''}`}
              onClick={() => selectionMode && toggleSelect(task.id)}
            >
              <div className="flex items-start gap-3">
                {selectionMode && (
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleSelect(task.id); }}
                    className="flex-shrink-0 mt-1"
                  >
                    {selectedIds.includes(task.id) ? (
                      <CheckSquare className="w-5 h-5 text-blue-600" />
                    ) : (
                      <Square className="w-5 h-5 text-slate-400" />
                    )}
                  </button>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-slate-900 truncate flex-1">
                      {task.title || 'משימה ללא כותרת'}
                    </h4>
                    <Badge className={`${priorityColor} text-xs flex-shrink-0 ml-2`}>
                      {task.priority || 'בינונית'}
                    </Badge>
                  </div>

                  <div className="text-sm text-slate-600 space-y-1">
                    {task.client_name && (
                      <div className="flex items-center gap-2">
                        <User className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{task.client_name}</span>
                      </div>
                    )}
                    
                    {task.due_date && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3 h-3 flex-shrink-0" />
                        <span>
                          {format(new Date(task.due_date), 'dd/MM/yyyy', { locale: he })}
                        </span>
                        {isOverdue && (
                          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                        )}
                      </div>
                    )}
                  </div>
                </div>
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
        <Link to={createPageUrl("Tasks")}>
          <Button variant="outline" size="sm">כל המשימות →</Button>
        </Link>
      </div>
    </div>
  );
}