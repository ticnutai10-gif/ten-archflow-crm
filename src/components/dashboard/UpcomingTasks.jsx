import React, { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, AlertCircle, CheckSquare, Square, Trash2, Plus } from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import TaskForm from "@/components/tasks/TaskForm";

const PRIORITY_COLORS = {
  "גבוהה": "bg-red-100 text-red-800 border-red-200",
  "בינונית": "bg-yellow-100 text-yellow-800 border-yellow-200",
  "נמוכה": "bg-green-100 text-green-800 border-green-200"
};

export default function UpcomingTasks({ tasks = [], isLoading, onUpdate, clients = [] }) {
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showAddDialog, setShowAddDialog] = useState(false);

  useEffect(() => {
    console.log('🔍 [UpcomingTasks] Received tasks:', {
      tasksCount: tasks?.length,
      tasksType: typeof tasks,
      isArray: Array.isArray(tasks),
      firstTask: tasks?.[0],
      allTasks: tasks
    });

    if (tasks && Array.isArray(tasks)) {
      tasks.forEach((task, index) => {
        if (!task) {
          console.error(`❌ [UpcomingTasks] Task at index ${index} is null/undefined!`);
        } else if (typeof task !== 'object') {
          console.error(`❌ [UpcomingTasks] Task at index ${index} is not an object:`, task);
        } else {
          console.log(`✅ [UpcomingTasks] Task ${index}:`, {
            id: task.id,
            title: task.title,
            hasTitle: 'title' in task,
            keys: Object.keys(task)
          });
        }
      });
    }
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
      toast.success('המשימות נמחקו בהצלחה');
      onUpdate?.();
    } catch (error) {
      console.error('❌ [UpcomingTasks] Error deleting tasks:', error);
      toast.error('שגיאה במחיקת המשימות');
    }
  };

  const handleDelete = async (taskId, e) => {
    e.stopPropagation();
    if (!confirm('האם אתה בטוח שברצונך למחוק את המשימה?')) return;
    
    try {
      await base44.entities.Task.delete(taskId);
      toast.success('המשימה נמחקה בהצלחה');
      onUpdate?.();
    } catch (error) {
      console.error('❌ [UpcomingTasks] Error deleting task:', error);
      toast.error('שגיאה במחיקת המשימה');
    }
  };

  const getDueDateLabel = (dateString) => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const taskDate = new Date(date);
      taskDate.setHours(0, 0, 0, 0);

      const diffTime = taskDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 0) return "היום";
      if (diffDays === 1) return "מחר";
      return format(date, 'dd/MM', { locale: he });
    } catch (error) {
      console.error('❌ [UpcomingTasks] Error processing date:', error, dateString);
      return null;
    }
  };

  if (isLoading) {
    console.log('⏳ [UpcomingTasks] Loading...');
    return (
      <div className="p-4 space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-20 bg-slate-200 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (!tasks || tasks.length === 0) {
    console.log('📭 [UpcomingTasks] No tasks to display');
    return (
      <div className="p-8 text-center text-slate-500">
        <p className="mb-4">אין משימות קרובות</p>
        <Link to={createPageUrl("Tasks")}>
          <Button variant="outline" size="sm">צור משימה ראשונה</Button>
        </Link>
      </div>
    );
  }

  const validTasks = tasks.filter(t => t && typeof t === 'object');
  console.log('📊 [UpcomingTasks] Valid tasks:', validTasks.length, 'out of', tasks.length);

  return (
    <>
    <div>
      {/* כפתור הוספה */}
      <div className="flex justify-end p-3 border-b">
        <Button
          onClick={() => setShowAddDialog(true)}
          size="sm"
          className="h-8 w-8 p-0 bg-blue-600 hover:bg-blue-700 text-white shadow-md"
          title="הוסף משימה"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

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
        {validTasks.map((task, index) => {
          if (!task || typeof task !== 'object') {
            console.error(`❌ [UpcomingTasks] Skipping invalid task at index ${index}:`, task);
            return null;
          }

          let taskTitle = 'משימה ללא כותרת';
          let taskPriority = 'בינונית';
          let isOverdue = false;

          try {
            taskTitle = task.title || 'משימה ללא כותרת';
            taskPriority = task.priority || 'בינונית';
            isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'הושלמה';

            console.log(`✅ [UpcomingTasks] Rendering task ${index}:`, {
              id: task.id,
              taskTitle,
              taskPriority,
              isOverdue
            });
          } catch (error) {
            console.error(`❌ [UpcomingTasks] Error processing task ${index}:`, error, task);
            return null;
          }

          const priorityColor = PRIORITY_COLORS[taskPriority] || PRIORITY_COLORS["בינונית"];
          const dueDateLabel = getDueDateLabel(task.due_date);

          return (
            <div
              key={task.id || index}
              className={`p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-all cursor-pointer ${
                isOverdue ? 'border-r-4 border-r-red-500' : ''
              } ${selectedIds.includes(task.id) ? 'ring-2 ring-blue-500' : ''}`}
              onClick={() => selectionMode && task.id && toggleSelect(task.id)}
            >
              <div className="flex items-start gap-3">
                {selectionMode && (
                  <button
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      if (task.id) toggleSelect(task.id); 
                    }}
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
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-semibold text-slate-900 truncate flex items-center gap-2">
                      {taskTitle}
                      {isOverdue && (
                        <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                      )}
                    </h4>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`${priorityColor} text-xs flex-shrink-0`}>
                        {taskPriority}
                      </Badge>
                      {!selectionMode && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleDelete(task.id, e)}
                          className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                          title="מחק משימה"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-slate-600">
                    {dueDateLabel && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 flex-shrink-0" />
                        <span className={isOverdue ? 'text-red-600 font-semibold' : ''}>
                          {dueDateLabel}
                        </span>
                      </div>
                    )}
                    
                    {task.client_name && (
                      <span className="truncate">{task.client_name}</span>
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

    {/* Add Task Dialog */}
    {showAddDialog && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <TaskForm
          clients={clients}
          onSubmit={async (data) => {
            await base44.entities.Task.create(data);
            setShowAddDialog(false);
            onUpdate && onUpdate();
          }}
          onCancel={() => setShowAddDialog(false)}
        />
      </div>
    )}
    </>
  );
}