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
import GenericSpreadsheet from "../components/spreadsheets/GenericSpreadsheet";
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
  const [customSpreadsheets, setCustomSpreadsheets] = useState([]);
  const [selectedSpreadsheet, setSelectedSpreadsheet] = useState(null);
  const [showCreateSpreadsheet, setShowCreateSpreadsheet] = useState(false);
  const [newSpreadsheetName, setNewSpreadsheetName] = useState("");
  const [newSpreadsheetDescription, setNewSpreadsheetDescription] = useState("");

  const { me, isAdmin, isManagerPlus, filterClients, filterProjects } = useAccessControl();

  const loadTasks = async () => {
    setLoading(true);
    try {
      let allTasks, allClients, allProjects;

      if (isAdmin || isManagerPlus) {
        [allTasks, allClients, allProjects] = await Promise.all([
          base44.entities.Task.list('-created_date'),
          base44.entities.Client.list(),
          base44.entities.Project.list()
        ]);
      } else {
        [allTasks, allClients, allProjects] = await Promise.all([
          base44.entities.Task.filter({ created_by: me?.email || '' }, '-created_date', 500),
          base44.entities.Client.list(),
          base44.entities.Project.list()
        ]);
      }

      const visibleClients = filterClients ? filterClients(allClients) : allClients;
      const visibleProjects = filterProjects ? filterProjects(allProjects) : allProjects;

      const accessibleTasks = allTasks.filter(task => {
        if (isAdmin || isManagerPlus) return true;
        if (task.created_by === me?.email) return true;
        if (task.client_id && visibleClients.some(client => client.id === task.client_id)) return true;
        if (task.project_id && visibleProjects.some(project => project.id === task.project_id)) return true;
        return false;
      });

      setTasks(accessibleTasks);
      setClients(visibleClients);
      setProjects(visibleProjects);
    } catch (error) {
      console.error("Error loading tasks:", error);
      toast.error("שגיאה בטעינת משימות");
    } finally {
      setLoading(false);
    }
  };

  const loadCustomSpreadsheets = async () => {
    try {
      const spreadsheets = await base44.entities.CustomSpreadsheet.list('-created_date');
      setCustomSpreadsheets(spreadsheets || []);
    } catch (error) {
      console.error("Error loading spreadsheets:", error);
    }
  };

  useEffect(() => {
    if (me) {
      loadTasks();
      loadCustomSpreadsheets();
    }
  }, [me, isAdmin, isManagerPlus]);

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

  const handleCreateSpreadsheet = async () => {
    if (!newSpreadsheetName.trim()) {
      toast.error('נא להזין שם לטבלה');
      return;
    }

    try {
      const newSpreadsheet = await base44.entities.CustomSpreadsheet.create({
        name: newSpreadsheetName.trim(),
        description: newSpreadsheetDescription.trim(),
        columns: [
          { key: 'col1', title: 'עמודה 1', width: '200px', type: 'text', visible: true, required: false },
          { key: 'col2', title: 'עמודה 2', width: '200px', type: 'text', visible: true, required: false }
        ],
        rows_data: [],
        cell_styles: {},
        sub_headers: {},
        show_sub_headers: false
      });

      setCustomSpreadsheets([newSpreadsheet, ...customSpreadsheets]);
      setSelectedSpreadsheet(newSpreadsheet);
      setShowCreateSpreadsheet(false);
      setNewSpreadsheetName("");
      setNewSpreadsheetDescription("");
      toast.success('הטבלה נוצרה בהצלחה');
    } catch (error) {
      console.error("Error creating spreadsheet:", error);
      toast.error('שגיאה ביצירת הטבלה');
    }
  };

  const handleDeleteSpreadsheet = async (spreadsheetId) => {
    if (!confirm('למחוק את הטבלה הזו? פעולה זו אינה הפיכה.')) return;

    try {
      await base44.entities.CustomSpreadsheet.delete(spreadsheetId);
      setCustomSpreadsheets(customSpreadsheets.filter(s => s.id !== spreadsheetId));
      if (selectedSpreadsheet?.id === spreadsheetId) {
        setSelectedSpreadsheet(null);
      }
      toast.success('הטבלה נמחקה');
    } catch (error) {
      console.error("Error deleting spreadsheet:", error);
      toast.error('שגיאה במחיקת הטבלה');
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

        <Tabs defaultValue="tasks" className="w-full" dir="rtl">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="tasks">משימות</TabsTrigger>
            <TabsTrigger value="spreadsheets">טבלאות</TabsTrigger>
          </TabsList>

          <TabsContent value="tasks">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-lg font-semibold text-slate-900">סינון וחיפוש</h2>
                <HelpIcon
                  text="השתמש בפילטרים לצמצום התוצאות. ניתן לשלב מספר פילטרים יחד"
                  side="left"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

                <Button variant="outline" onClick={handleExport}>
                  <Download className="w-4 h-4 ml-2" />
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
                  {filteredTasks.length === 0 && (
                    <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed border-slate-300">
                      <p className="text-slate-600 mb-4">אין משימות להצגה</p>
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
          </TabsContent>

          <TabsContent value="spreadsheets">
            <div className="space-y-6">
              {!selectedSpreadsheet ? (
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-slate-900">הטבלאות שלי</h2>
                    <Button onClick={() => setShowCreateSpreadsheet(true)} className="bg-purple-600 hover:bg-purple-700 gap-2">
                      <Plus className="w-4 h-4" />
                      טבלה חדשה
                    </Button>
                  </div>

                  {showCreateSpreadsheet && (
                    <div className="mb-6 p-4 border border-purple-200 rounded-lg bg-purple-50">
                      <h3 className="font-semibold mb-3 text-purple-900">יצירת טבלה חדשה</h3>
                      <div className="space-y-3">
                        <Input
                          placeholder="שם הטבלה"
                          value={newSpreadsheetName}
                          onChange={(e) => setNewSpreadsheetName(e.target.value)}
                          className="text-right"
                          dir="rtl"
                        />
                        <Input
                          placeholder="תיאור (אופציונלי)"
                          value={newSpreadsheetDescription}
                          onChange={(e) => setNewSpreadsheetDescription(e.target.value)}
                          className="text-right"
                          dir="rtl"
                        />
                        <div className="flex gap-2">
                          <Button onClick={handleCreateSpreadsheet} className="bg-purple-600 hover:bg-purple-700">
                            צור טבלה
                          </Button>
                          <Button variant="outline" onClick={() => {
                            setShowCreateSpreadsheet(false);
                            setNewSpreadsheetName("");
                            setNewSpreadsheetDescription("");
                          }}>
                            ביטול
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {customSpreadsheets.length === 0 ? (
                    <div className="text-center py-12 bg-slate-50 rounded-lg">
                      <Table2 className="w-16 h-16 mx-auto text-slate-400 mb-4" />
                      <p className="text-slate-600 mb-4">אין טבלאות עדיין</p>
                      <Button onClick={() => setShowCreateSpreadsheet(true)} variant="outline">
                        <Plus className="w-4 h-4 ml-2" />
                        צור טבלה ראשונה
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {customSpreadsheets.map((spreadsheet) => (
                        <div
                          key={spreadsheet.id}
                          className="border border-slate-200 rounded-xl p-4 hover:shadow-lg transition-all cursor-pointer bg-white"
                          onClick={() => setSelectedSpreadsheet(spreadsheet)}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2 flex-1">
                              <div className="p-2 bg-purple-100 rounded-lg">
                                <Table2 className="w-5 h-5 text-purple-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-slate-900 truncate">{spreadsheet.name}</h3>
                                {spreadsheet.description && (
                                  <p className="text-xs text-slate-500 mt-1 truncate">{spreadsheet.description}</p>
                                )}
                              </div>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" dir="rtl">
                                <DropdownMenuItem 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteSpreadsheet(spreadsheet.id);
                                  }} 
                                  className="text-red-600"
                                >
                                  <Trash2 className="w-4 h-4 ml-2" />
                                  מחק טבלה
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          <div className="text-xs text-slate-500">
                            {spreadsheet.rows_data?.length || 0} שורות • {spreadsheet.columns?.length || 0} עמודות
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div className="bg-white rounded-xl shadow-sm p-4">
                    <Button variant="outline" onClick={() => setSelectedSpreadsheet(null)} className="gap-2">
                      <ChevronRight className="w-4 h-4" />
                      חזרה לרשימת הטבלאות
                    </Button>
                  </div>
                  <GenericSpreadsheet
                    spreadsheet={selectedSpreadsheet}
                    onUpdate={loadCustomSpreadsheets}
                  />
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>
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