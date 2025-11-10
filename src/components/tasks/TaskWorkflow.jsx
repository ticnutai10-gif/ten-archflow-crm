
import React, { useState, useMemo } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  User,
  Briefcase,
  Clock,
  AlertCircle,
  CheckCircle2,
  Circle,
  ArrowRight,
  Plus,
  Edit,
  Trash2,
  Settings,
  LayoutGrid,
  Network,
  GitBranch,
  Workflow as WorkflowIcon,
  TrendingUp,
  Layers
} from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import HelpIcon from "@/components/ui/HelpIcon";

const STATUSES = [
  {
    id: 'חדשה',
    name: 'חדשה',
    color: 'bg-slate-100 border-slate-300',
    textColor: 'text-slate-700',
    icon: Circle,
    gradient: 'from-slate-50 to-slate-100'
  },
  {
    id: 'בתהליך',
    name: 'בתהליך',
    color: 'bg-blue-100 border-blue-300',
    textColor: 'text-blue-700',
    icon: ArrowRight,
    gradient: 'from-blue-50 to-blue-100'
  },
  {
    id: 'הושלמה',
    name: 'הושלמה',
    color: 'bg-green-100 border-green-300',
    textColor: 'text-green-700',
    icon: CheckCircle2,
    gradient: 'from-green-50 to-green-100'
  },
  {
    id: 'דחויה',
    name: 'דחויה',
    color: 'bg-amber-100 border-amber-300',
    textColor: 'text-amber-700',
    icon: Clock,
    gradient: 'from-amber-50 to-amber-100'
  }
];

const priorityConfig = {
  'גבוהה': { color: 'bg-red-500', label: 'דחוף', textColor: 'text-red-700' },
  'בינונית': { color: 'bg-amber-500', label: 'בינוני', textColor: 'text-amber-700' },
  'נמוכה': { color: 'bg-green-500', label: 'נמוך', textColor: 'text-green-700' }
};

export default function TaskWorkflow({
  tasks,
  onTaskUpdate,
  onTaskEdit,
  onTaskDelete,
  onTaskCreate,
  clients = [],
  projects = []
}) {
  const [hoveredTask, setHoveredTask] = useState(null);
  const [workflowView, setWorkflowView] = useState('kanban'); // kanban, timeline, network, funnel

  // קיבוץ משימות לפי סטטוס
  const tasksByStatus = useMemo(() => {
    const grouped = {};
    STATUSES.forEach(status => {
      grouped[status.id] = tasks.filter(task => task.status === status.id);
    });
    return grouped;
  }, [tasks]);

  // סטטיסטיקות
  const stats = useMemo(() => {
    return {
      total: tasks.length,
      new: tasksByStatus['חדשה']?.length || 0,
      inProgress: tasksByStatus['בתהליך']?.length || 0,
      completed: tasksByStatus['הושלמה']?.length || 0,
      delayed: tasksByStatus['דחויה']?.length || 0
    };
  }, [tasks, tasksByStatus]);

  const handleDragEnd = async (result) => {
    const { destination, source, draggableId } = result;

    // אם אין יעד או אם המיקום לא השתנה
    if (!destination ||
        (destination.droppableId === source.droppableId &&
         destination.index === source.index)) {
      return;
    }

    const taskId = draggableId;
    const newStatus = destination.droppableId;

    // מצא את המשימה
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    // עדכן סטטוס
    await onTaskUpdate(taskId, { status: newStatus });
  };

  const getTaskDeadlineStatus = (dueDate) => {
    if (!dueDate) return null;

    const today = new Date();
    const due = new Date(dueDate);
    const diffDays = Math.ceil((due - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { status: 'overdue', label: `באיחור ${Math.abs(diffDays)} ימים`, color: 'text-red-600' };
    if (diffDays === 0) return { status: 'today', label: 'היום!', color: 'text-orange-600' };
    if (diffDays <= 3) return { status: 'soon', label: `עוד ${diffDays} ימים`, color: 'text-amber-600' };
    return { status: 'ok', label: format(due, 'dd/MM', { locale: he }), color: 'text-slate-600' };
  };

  const workflowViews = [
    {
      id: 'kanban',
      name: 'לוח קנבן',
      icon: LayoutGrid,
      description: 'תצוגת לוח קלאסית עם עמודות'
    },
    {
      id: 'timeline',
      name: 'ציר זמן',
      icon: TrendingUp,
      description: 'תצוגת ציר זמן לפי תאריכים'
    },
    {
      id: 'network',
      name: 'רשת קשרים',
      icon: Network,
      description: 'תצוגת קשרים בין משימות'
    },
    {
      id: 'funnel',
      name: 'משפך',
      icon: Layers,
      description: 'תצוגת משפך לפי התקדמות'
    }
  ];

  const currentView = workflowViews.find(v => v.id === workflowView) || workflowViews[0];

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header with controls */}
      <div className="flex items-center justify-between bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg">
            <GitBranch className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">זרימת עבודה אינטראקטיבית</h2>
            <p className="text-sm text-slate-500 flex items-center gap-2">
              גרור ושחרר משימות בין שלבים
              <HelpIcon
                text="גרור משימות בין העמודות כדי לשנות את הסטטוס שלהן. לחץ על משימה לפרטים נוספים."
                side="left"
              />
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Workflow View Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                {React.createElement(currentView.icon, { className: "w-4 h-4" })}
                <span className="hidden md:inline">{currentView.name}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64" dir="rtl">
              <DropdownMenuLabel className="flex items-center gap-2">
                <WorkflowIcon className="w-4 h-4" />
                סוג תצוגה
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {workflowViews.map((view) => (
                <DropdownMenuItem
                  key={view.id}
                  onClick={() => setWorkflowView(view.id)}
                  className={workflowView === view.id ? "bg-slate-100 font-semibold" : ""}
                >
                  <div className="flex items-start gap-3 w-full">
                    {React.createElement(view.icon, { className: "w-4 h-4 mt-0.5 flex-shrink-0" })}
                    <div className="flex-1">
                      <div className="font-medium">{view.name}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{view.description}</div>
                    </div>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Add Task Button */}
          <Button
            onClick={() => onTaskCreate?.()}
            className="gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
          >
            <Plus className="w-4 h-4" />
            משימה חדשה
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4 border-2 border-slate-200"
        >
          <div className="flex items-center justify-between mb-2">
            <Circle className="w-5 h-5 text-slate-500" />
            <span className="text-2xl font-bold text-slate-700">{stats.new}</span>
          </div>
          <p className="text-sm text-slate-600 font-medium">משימות חדשות</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border-2 border-blue-200"
        >
          <div className="flex items-center justify-between mb-2">
            <ArrowRight className="w-5 h-5 text-blue-500" />
            <span className="text-2xl font-bold text-blue-700">{stats.inProgress}</span>
          </div>
          <p className="text-sm text-blue-600 font-medium">בתהליך</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border-2 border-green-200"
        >
          <div className="flex items-center justify-between mb-2">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            <span className="text-2xl font-bold text-green-700">{stats.completed}</span>
          </div>
          <p className="text-sm text-green-600 font-medium">הושלמו</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-4 border-2 border-amber-200"
        >
          <div className="flex items-center justify-between mb-2">
            <Clock className="w-5 h-5 text-amber-500" />
            <span className="text-2xl font-bold text-amber-700">{stats.delayed}</span>
          </div>
          <p className="text-sm text-amber-600 font-medium">דחויות</p>
        </motion.div>
      </div>

      {/* Workflow Display */}
      {workflowView === 'kanban' && (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {STATUSES.map((status, columnIndex) => {
              const StatusIcon = status.icon;
              const columnTasks = tasksByStatus[status.id] || [];

              return (
                <motion.div
                  key={status.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: columnIndex * 0.1 }}
                  className="flex flex-col h-full"
                >
                  {/* Column Header */}
                  <div className={`bg-gradient-to-br ${status.gradient} border-2 ${status.color} rounded-t-xl p-4`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <StatusIcon className={`w-5 h-5 ${status.textColor}`} />
                        <h3 className={`font-bold ${status.textColor}`}>{status.name}</h3>
                      </div>
                      <div className={`${status.textColor} font-bold text-lg`}>
                        {columnTasks.length}
                      </div>
                    </div>
                    <div className="h-1 bg-white/30 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-white/60"
                        initial={{ width: 0 }}
                        animate={{ width: `${(columnTasks.length / Math.max(1, tasks.length)) * 100}%` }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                  </div>

                  {/* Tasks List */}
                  <Droppable droppableId={status.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex-1 p-4 rounded-b-xl border-2 border-t-0 ${status.color} ${
                          snapshot.isDraggingOver ? 'bg-slate-50' : 'bg-white'
                        } transition-colors min-h-[200px] space-y-3`}
                      >
                        <AnimatePresence>
                          {columnTasks.map((task, index) => {
                            const deadlineStatus = getTaskDeadlineStatus(task.due_date);
                            const priority = priorityConfig[task.priority] || priorityConfig['בינונית'];

                            return (
                              <Draggable key={task.id} draggableId={task.id} index={index}>
                                {(provided, snapshot) => (
                                  <motion.div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    whileHover={{ scale: 1.02 }}
                                    onMouseEnter={() => setHoveredTask(task.id)}
                                    onMouseLeave={() => setHoveredTask(null)}
                                    className={`
                                      bg-white rounded-lg border-2 border-slate-200 p-3 cursor-move
                                      ${snapshot.isDragging ? 'shadow-2xl rotate-2 border-blue-400' : 'shadow-sm'}
                                      hover:shadow-lg transition-all duration-200
                                    `}
                                  >
                                    {/* כותרת משימה */}
                                    <div className="flex items-start justify-between mb-2">
                                      <h4 className="font-semibold text-slate-900 text-sm flex-1 line-clamp-2">
                                        {task.title}
                                      </h4>
                                      <div className={`w-1.5 h-1.5 rounded-full ${priority.color} flex-shrink-0 mt-1.5 mr-2`} />
                                    </div>

                                    {/* מידע נוסף */}
                                    <div className="space-y-2 text-xs text-slate-600">
                                      {task.client_name && (
                                        <div className="flex items-center gap-1.5">
                                          <User className="w-3.5 h-3.5 text-slate-400" />
                                          <span className="truncate">{task.client_name}</span>
                                        </div>
                                      )}

                                      {task.project_name && (
                                        <div className="flex items-center gap-1.5">
                                          <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                                          <span className="truncate">{task.project_name}</span>
                                        </div>
                                      )}

                                      {deadlineStatus && (
                                        <div className="flex items-center gap-1.5">
                                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                          <span className={deadlineStatus.color}>
                                            {deadlineStatus.label}
                                          </span>
                                          {deadlineStatus.status === 'overdue' && (
                                            <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                                          )}
                                        </div>
                                      )}
                                    </div>

                                    {/* תגיות */}
                                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                                      {task.priority && (
                                        <Badge
                                          variant="outline"
                                          className={`text-[10px] px-2 py-0 ${priority.textColor} border-current`}
                                        >
                                          {priority.label}
                                        </Badge>
                                      )}

                                      {task.category && (
                                        <Badge variant="outline" className="text-[10px] px-2 py-0">
                                          {task.category}
                                        </Badge>
                                      )}
                                    </div>

                                    {/* פעולות - מופיע בהובר */}
                                    <AnimatePresence>
                                      {hoveredTask === task.id && (
                                        <motion.div
                                          initial={{ opacity: 0, y: -10 }}
                                          animate={{ opacity: 1, y: 0 }}
                                          exit={{ opacity: 0, y: -10 }}
                                          className="flex gap-1 mt-3 pt-3 border-t border-slate-100"
                                        >
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              onTaskEdit(task);
                                            }}
                                            className="flex-1 h-7 text-xs"
                                          >
                                            <Edit className="w-3 h-3 ml-1" />
                                            ערוך
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              onTaskDelete(task.id);
                                            }}
                                            className="flex-1 h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                                          >
                                            <Trash2 className="w-3 h-3 ml-1" />
                                            מחק
                                          </Button>
                                        </motion.div>
                                      )}
                                    </AnimatePresence>
                                  </motion.div>
                                )}
                              </Draggable>
                            );
                          })}
                        </AnimatePresence>
                        {provided.placeholder}

                        {/* Add Task to Column */}
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => onTaskCreate?.({ status: status.id })}
                          className="w-full p-3 border-2 border-dashed border-slate-300 rounded-lg hover:border-slate-400 hover:bg-slate-50 transition-all flex items-center justify-center gap-2 text-slate-500 hover:text-slate-700 mt-4"
                        >
                          <Plus className="w-4 h-4" />
                          <span className="text-sm font-medium">הוסף משימה</span>
                        </motion.button>
                      </div>
                    )}
                  </Droppable>
                </motion.div>
              );
            })}
          </div>
        </DragDropContext>
      )}

      {workflowView === 'timeline' && (
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="text-center py-12 text-slate-500">
            <TrendingUp className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <h3 className="text-lg font-semibold mb-2">תצוגת ציר זמן</h3>
            <p>תצוגה זו בפיתוח - תציג משימות לאורך ציר זמן</p>
          </div>
        </div>
      )}

      {workflowView === 'network' && (
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="text-center py-12 text-slate-500">
            <Network className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <h3 className="text-lg font-semibold mb-2">תצוגת רשת קשרים</h3>
            <p>תצוגה זו בפיתוח - תציג קשרים ותלויות בין משימות</p>
          </div>
        </div>
      )}

      {workflowView === 'funnel' && (
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="text-center py-12 text-slate-500">
            <Layers className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <h3 className="text-lg font-semibold mb-2">תצוגת משפך</h3>
            <p>תצוגה זו בפיתוח - תציג משימות כמשפך המתקדם</p>
          </div>
        </div>
      )}

      {/* הסבר מהיר */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800"
      >
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold mb-1">טיפ: גרור ושחרר משימות!</p>
            <p className="text-blue-700">
              לחץ והחזק על משימה, גרור אותה לעמודה אחרת כדי לשנות את הסטטוס שלה בקלות.
              מעבר העכבר על משימה יציג אפשרויות נוספות.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
