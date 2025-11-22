import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Plus,
  Search,
  Download,
  Grid3x3,
  List,
  GitBranch,
  LayoutGrid,
  Rows,
  Columns,
  Table2,
  Settings,
  Trash2,
  ChevronRight,
  MoreVertical
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import HelpIcon from "@/components/ui/HelpIcon";
import TaskForm from "../components/tasks/TaskForm";
import TaskCard from "../components/tasks/TaskCard";
import TaskStats from "../components/tasks/TaskStats";
import TaskTemplates from "../components/tasks/TaskTemplates";
import TaskKanban from "../components/tasks/TaskKanban";
import TaskWorkflow from "../components/tasks/TaskWorkflow";
import ReminderManager from "../components/reminders/ReminderManager";
import { toast } from "sonner";
import { useAccessControl } from "@/components/access/AccessValidator";

export default function TasksPage() {
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [viewMode, setViewMode] = useState("list");
  const [showTemplates, setShowTemplates] = useState(false);

  const { me, isAdmin, isManagerPlus, filterClients, filterProjects, loading: accessLoading } = useAccessControl();

  const loadTasks = async () => {
    setLoading(true);
    try {
      console.log('🔄 [TASKS] Loading tasks...', { me: me?.email, isAdmin, isManagerPlus });
      
      const [tasksData, clientsData, projectsData] = await Promise.all([
        base44.entities.Task.list('-created_date').catch((e) => { console.error('Error loading tasks:', e); return []; }),
        base44.entities.Client.list().catch((e) => { console.error('Error loading clients:', e); return []; }),
        base44.entities.Project.list().catch((e) => { console.error('Error loading projects:', e); return []; })
      ]);

      const allTasks = Array.isArray(tasksData) ? tasksData : [];
      const allClients = Array.isArray(clientsData) ? clientsData : [];
      const allProjects = Array.isArray(projectsData) ? projectsData : [];

      console.log('✅ [TASKS] Raw data loaded:', {
        tasks: allTasks.length,
        clients: allClients.length,
        projects: allProjects.length
      });

      const visibleClients = filterClients ? filterClients(allClients) : allClients;
      const visibleProjects = filterProjects ? filterProjects(allProjects) : allProjects;

      console.log('✅ [TASKS] After access filter:', {
        visibleClients: visibleClients.length,
        visibleProjects: visibleProjects.length
      });

      // אם אדמין או מנהל+ - הצג הכל
      let accessibleTasks = allTasks;
      
      // אם לא אדמין - סנן לפי הרשאות
      if (!isAdmin && !isManagerPlus && me?.email) {
        accessibleTasks = allTasks.filter(task => {
          if (task.created_by === me.email) return true;
          if (task.client_id && visibleClients.some(client => client.id === task.client_id)) return true;
          if (task.project_id && visibleProjects.some(project => project.id === task.project_id)) return true;
          return false;
        });
      }

      console.log('✅ [TASKS] Final accessible tasks:', accessibleTasks.length);
      console.log('📋 [TASKS] Sample tasks:', accessibleTasks.slice(0, 3).map(t => ({ id: t.id, title: t.title })));

      setTasks(accessibleTasks);
      setClients(visibleClients);
      setProjects(visibleProjects);
    } catch (error) {
      console.error("❌ [TASKS] Error loading tasks:", error);
      toast.error("שגיאה בטעינת משימות");
      setTasks([]);
      setClients([]);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('🎯 [TASKS] useEffect triggered', { 
      hasMe: !!me, 
      meEmail: me?.email, 
      accessLoading, 
      isAdmin, 
      isManagerPlus 
    });
    
    if (!accessLoading) {
      loadTasks();
    }
  }, [accessLoading, isAdmin, isManagerPlus]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const openParam = urlParams.get('open');
    const searchParam = urlParams.get('search');

    if (openParam === 'new') {
      setShowForm(true);
      setEditingTask(null);
    }

    if (searchParam) {
      setSearchTerm(decodeURIComponent(searchParam));
    }
  }, []);

  useEffect(() => {
    let result = [...tasks];

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      result = result.filter(task =>
        task.title?.toLowerCase().includes(search) ||
        task.description?.toLowerCase().includes(search) ||
        task.client_name?.toLowerCase().includes(search) ||
        task.project_name?.toLowerCase().includes(search)
      );
    }

    if (statusFilter !== "all") {
      result = result.filter(task => task.status === statusFilter);
    }

    if (priorityFilter !== "all") {
      result = result.filter(task => task.priority === priorityFilter);
    }

    if (clientFilter !== "all") {
      result = result.filter(task => task.client_name === clientFilter);
    }

    setFilteredTasks(result);
  }, [tasks, searchTerm, statusFilter, priorityFilter, clientFilter]);

  const handleSave = async (taskData) => {
    try {
      if (editingTask) {
        await base44.entities.Task.update(editingTask.id, taskData);
        toast.success("המשימה עודכנה בהצלחה");
      } else {
        await base44.entities.Task.create(taskData);
        toast.success("המשימה נוצרה בהצלחה");
      }

      setShowForm(false);
      setEditingTask(null);
      await loadTasks();
    } catch (error) {
      console.error("Error saving task:", error);
      toast.error("שגיאה בשמירת המשימה");
    }
  };

  const handleEdit = (task) => {
    setEditingTask(task);
    setShowForm(true);
  };

  const handleDelete = async (taskId) => {
    if (!confirm("האם אתה בטוח שברצונך למחוק משימה זו?")) return;

    try {
      await base44.entities.Task.delete(taskId);
      toast.success("המשימה נמחקה");
      await loadTasks();
    } catch (error) {
      console.error("Error deleting task:", error);
      toast.error("שגיאה במחיקת המשימה");
    }
  };

  const handleTaskUpdate = async (taskId, updates) => {
    try {
      await base44.entities.Task.update(taskId, updates);
      toast.success("המשימה עודכנה");
      await loadTasks();
    } catch (error) {
      console.error("Error updating task:", error);
      toast.error("שגיאה בעדכון המשימה");
    }
  };

  const handleExport = async () => {
    try {
      const csv = [
        ['כותרת', 'תיאור', 'סטטוס', 'עדיפות', 'לקוח', 'פרויקט', 'תאריך יעד'].join(','),
        ...filteredTasks.map(task => [
          task.title,
          task.description || '',
          task.status,
          task.priority || '',
          task.client_name || '',
          task.project_name || '',
          task.due_date || ''
        ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `tasks_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("הקובץ יוצא בהצלחה");
    } catch (error) {
      console.error("Error exporting:", error);
      toast.error("שגיאה ביצוא");
    }
  };



  const uniqueClients = [...new Set(tasks.map(t => t.client_name).filter(Boolean))];

  const viewModeConfig = [
    { id: 'list', name: 'רשימה', icon: List, description: 'תצוגת רשימה מסורתית' },
    { id: 'grid', name: 'גריד', icon: LayoutGrid, description: 'תצוגת כרטיסים בגריד' },
    { id: 'compact', name: 'קומפקטי', icon: Rows, description: 'תצוגה צפופה עם פרטים מינימליים' },
    { id: 'detailed', name: 'מפורט', icon: Columns, description: 'תצוגה מפורטת עם כל הפרטים' },
    { id: 'kanban', name: 'קנבן', icon: Grid3x3, description: 'לוח קנבן לפי סטטוס' },
    { id: 'workflow', name: 'זרימה', icon: GitBranch, description: 'תצוגת זרימת עבודה אינטראקטיבית' },
    { id: 'table', name: 'טבלה', icon: Table2, description: 'תצוגת טבלה מסודרת' }
  ];

  const currentViewConfig = viewModeConfig.find(v => v.id === viewMode) || viewModeConfig[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-slate-900">ניהול משימות</h1>
            <HelpIcon
              text="מערכת ניהול משימות מתקדמת עם תצוגות שונות, סינון חכם ותזכורות אוטומטיות"
              side="bottom"
            />
          </div>

          <div className="flex items-center gap-2">
            <ReminderManager />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  {React.createElement(currentViewConfig.icon, { className: "w-4 h-4" })}
                  <span className="hidden md:inline">{currentViewConfig.name}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56" dir="rtl">
                <DropdownMenuLabel className="flex items-center gap-2">
                  <LayoutGrid className="w-4 h-4" />
                  בחר תצוגה
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {viewModeConfig.map((mode) => (
                  <DropdownMenuItem
                    key={mode.id}
                    onClick={() => setViewMode(mode.id)}
                    className={viewMode === mode.id ? "bg-slate-100 font-semibold" : ""}
                  >
                    <div className="flex items-start gap-3 w-full">
                      {React.createElement(mode.icon, { className: "w-4 h-4 mt-0.5 flex-shrink-0" })}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">{mode.name}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{mode.description}</div>
                      </div>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button onClick={() => setShowTemplates(true)} variant="outline" className="gap-2">
              <Plus className="w-4 h-4" />
              <span className="hidden md:inline">תבניות</span>
            </Button>

            <Button onClick={() => { setShowForm(true); setEditingTask(null); }} className="bg-[#2C3A50] hover:bg-[#1f2937] gap-2">
              <Plus className="w-4 h-4" />
              משימה חדשה
            </Button>
          </div>
        </div>

        <TaskStats tasks={tasks} loading={loading} />

        <div className="w-full" dir="rtl">
            <div className="space-y-4">
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="text-lg font-semibold text-slate-900">סינון וחיפוש</h2>
                  <HelpIcon
                    text="השתמש בפילטרים לצמצום התוצאות. ניתן לשלב מספר פילטרים יחד"
                    side="left"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="חיפוש משימות..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pr-10"
                    />
                  </div>

                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="כל הסטטוסים" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">כל הסטטוסים</SelectItem>
                      <SelectItem value="חדשה">חדשה</SelectItem>
                      <SelectItem value="בתהליך">בתהליך</SelectItem>
                      <SelectItem value="הושלמה">הושלמה</SelectItem>
                      <SelectItem value="דחויה">דחויה</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="כל הדחיפויות" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">כל הדחיפויות</SelectItem>
                      <SelectItem value="גבוהה">גבוהה</SelectItem>
                      <SelectItem value="בינונית">בינונית</SelectItem>
                      <SelectItem value="נמוכה">נמוכה</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={clientFilter} onValueChange={setClientFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="כל הלקוחות" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">כל הלקוחות</SelectItem>
                      {uniqueClients.map(client => (
                        <SelectItem key={client} value={client}>{client}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button variant="outline" onClick={handleExport} className="gap-2">
                    <Download className="w-4 h-4" />
                    יצוא
                  </Button>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                {loading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto"></div>
                    <p className="text-slate-600 mt-4">טוען משימות...</p>
                  </div>
                ) : (
                  <>
                    {/* Debug info */}
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
                      📊 נתונים: {tasks.length} משימות כולל • {filteredTasks.length} אחרי סינון • {clients.length} לקוחות • {projects.length} פרויקטים
                    </div>

                    {filteredTasks.length === 0 && (
                      <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed border-slate-300">
                        <p className="text-slate-600 mb-4">
                          {tasks.length === 0 ? 'אין משימות במערכת' : 'אין משימות המתאימות לסינון'}
                        </p>
                        <Button
                          onClick={() => {
                            setEditingTask(null);
                            setShowForm(true);
                          }}
                          variant="outline"
                        >
                          <Plus className="w-4 h-4 ml-2" />
                          צור משימה ראשונה
                        </Button>
                      </div>
                    )}

                    {filteredTasks.length > 0 && viewMode === 'list' && (
                      <div className="space-y-4">
                        {filteredTasks.map(task => (
                          <TaskCard
                            key={task.id}
                            task={task}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            onUpdate={handleTaskUpdate}
                          />
                        ))}
                      </div>
                    )}

                    {filteredTasks.length > 0 && viewMode === 'grid' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredTasks.map(task => (
                          <TaskCard
                            key={task.id}
                            task={task}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            onUpdate={handleTaskUpdate}
                          />
                        ))}
                      </div>
                    )}

                    {filteredTasks.length > 0 && viewMode === 'compact' && (
                      <div className="space-y-2">
                        {filteredTasks.map(task => (
                          <div
                            key={task.id}
                            className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                task.priority === 'גבוהה' ? 'bg-red-500' :
                                task.priority === 'בינונית' ? 'bg-amber-500' :
                                'bg-green-500'
                              }`} />
                              <span className="font-medium text-slate-900 truncate">{task.title}</span>
                              {task.client_name && (
                                <span className="text-xs text-slate-500 truncate">{task.client_name}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <Button variant="ghost" size="sm" onClick={() => handleEdit(task)}>
                                ערוך
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {filteredTasks.length > 0 && viewMode === 'detailed' && (
                      <div className="space-y-6">
                        {filteredTasks.map(task => (
                          <div
                            key={task.id}
                            className="border border-slate-200 rounded-xl p-6 hover:shadow-md transition-shadow"
                          >
                            <div className="flex items-start justify-between mb-4">
                              <div>
                                <h3 className="text-xl font-semibold text-slate-900 mb-2">{task.title}</h3>
                                <p className="text-slate-600">{task.description}</p>
                              </div>
                              <div className="flex gap-2 flex-shrink-0">
                                <Button variant="outline" size="sm" onClick={() => handleEdit(task)}>
                                  ערוך
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => handleDelete(task.id)}>
                                  מחק
                                </Button>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-slate-500">סטטוס:</span>
                                <span className="font-medium mr-2">{task.status}</span>
                              </div>
                              <div>
                                <span className="text-slate-500">עדיפות:</span>
                                <span className="font-medium mr-2">{task.priority}</span>
                              </div>
                              {task.client_name && (
                                <div>
                                  <span className="text-slate-500">לקוח:</span>
                                  <span className="font-medium mr-2">{task.client_name}</span>
                                </div>
                              )}
                              {task.due_date && (
                                <div>
                                  <span className="text-slate-500">תאריך יעד:</span>
                                  <span className="font-medium mr-2">{task.due_date}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {filteredTasks.length > 0 && viewMode === 'table' && (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                              <th className="text-right p-3 text-sm font-semibold text-slate-700">משימה</th>
                              <th className="text-right p-3 text-sm font-semibold text-slate-700">לקוח</th>
                              <th className="text-right p-3 text-sm font-semibold text-slate-700">סטטוס</th>
                              <th className="text-right p-3 text-sm font-semibold text-slate-700">עדיפות</th>
                              <th className="text-right p-3 text-sm font-semibold text-slate-700">תאריך יעד</th>
                              <th className="text-right p-3 text-sm font-semibold text-slate-700">פעולות</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredTasks.map(task => (
                              <tr key={task.id} className="border-b border-slate-100 hover:bg-slate-50">
                                <td className="p-3">{task.title}</td>
                                <td className="p-3 text-slate-600">{task.client_name || '—'}</td>
                                <td className="p-3">{task.status}</td>
                                <td className="p-3">
                                  <span className={`inline-block px-2 py-1 rounded text-xs ${
                                    task.priority === 'גבוהה' ? 'bg-red-100 text-red-700' :
                                    task.priority === 'בינונית' ? 'bg-amber-100 text-amber-700' :
                                    'bg-green-100 text-green-700'
                                  }`}>
                                    {task.priority}
                                  </span>
                                </td>
                                <td className="p-3 text-slate-600">{task.due_date || '—'}</td>
                                <td className="p-3">
                                  <div className="flex gap-2">
                                    <Button variant="ghost" size="sm" onClick={() => handleEdit(task)}>
                                      ערוך
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {filteredTasks.length > 0 && viewMode === 'kanban' && (
                      <TaskKanban
                        tasks={filteredTasks}
                        onTaskUpdate={handleTaskUpdate}
                        onTaskEdit={handleEdit}
                        onTaskDelete={handleDelete}
                      />
                    )}

                    {viewMode === 'workflow' && (
                      <TaskWorkflow
                        tasks={filteredTasks}
                        onTaskUpdate={handleTaskUpdate}
                        onTaskEdit={handleEdit}
                        onTaskDelete={handleDelete}
                        onTaskCreate={(initialData) => {
                          setEditingTask(initialData || null);
                          setShowForm(true);
                        }}
                        clients={clients}
                        projects={projects}
                      />
                    )}
                  </>
                )}
              </div>
            </div>
        </div>
      </div>

      {showForm && (
        <TaskForm
          task={editingTask}
          clients={clients}
          projects={projects}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false);
            setEditingTask(null);
          }}
        />
      )}

      {showTemplates && (
        <TaskTemplates
          clients={clients}
          projects={projects}
          onSelectTemplate={(template) => {
            setEditingTask(template);
            setShowTemplates(false);
            setShowForm(true);
          }}
          onCancel={() => setShowTemplates(false)}
        />
      )}
    </div>
  );
}