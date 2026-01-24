import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowRight, Plus, ListTodo, BarChart3, Users, Flag, DollarSign, Wallet, Edit2, Save, FileText } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';

import SubTaskForm from '../components/projects/SubTaskForm';
import ProjectGantt from '../components/projects/ProjectGantt';
import ProjectResourceView from '../components/projects/ProjectResourceView';
import ProjectSummaryReport from '../components/projects/ProjectSummaryReport';
import AIClientChatbot from '../components/communication/AIClientChatbot';
import AIProgressSummary from '../components/communication/AIProgressSummary';
import AIContentGenerator from '../components/communication/AIContentGenerator';
import ProjectAIAssistant from '../components/communication/ProjectAIAssistant';
import AuditLogViewer from '../components/common/AuditLogViewer';
import MilestonesManager from '../components/projects/MilestonesManager';
import BudgetManager from '../components/projects/BudgetManager';
import CashflowManager from '../components/projects/CashflowManager';
import CriticalTasksSummary from '../components/projects/CriticalTasksSummary';
import ProgressReportGenerator from '../components/projects/ProgressReportGenerator';
import ReportScheduleManager from '../components/projects/ReportScheduleManager';

export default function ProjectDetails() {
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [subtasks, setSubtasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSubTaskForm, setShowSubTaskForm] = useState(false);
  const [editingSubTask, setEditingSubTask] = useState(null);
  const [activeTab, setActiveTab] = useState('tasks');
  const [client, setClient] = useState(null);
  const [projects, setProjects] = useState([]);
  const [showReportGenerator, setShowReportGenerator] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const projectId = params.get('project_id') || params.get('id');
    
    if (!projectId) {
      alert('לא נמצא מזהה פרויקט');
      navigate(createPageUrl('Projects'));
      return;
    }
    
    loadProject(projectId);
  }, []);

  const loadProject = async (projectId) => {
    setLoading(true);
    try {
      const projectData = await base44.entities.Project.get(projectId);
      setProject(projectData);
      
      // Load client and their projects
      if (projectData.client_id) {
        const clientData = await base44.entities.Client.get(projectData.client_id).catch(() => null);
        setClient(clientData);
        
        if (clientData) {
          const clientProjects = await base44.entities.Project.filter({ client_id: clientData.id }).catch(() => []);
          setProjects(clientProjects);
        }
      }
      
      loadSubTasks(projectId);
    } catch (error) {
      console.error('Error loading project:', error);
      alert('שגיאה בטעינת הפרויקט');
      navigate(createPageUrl('Projects'));
    }
    setLoading(false);
  };

  const loadSubTasks = async (projectId) => {
    try {
      const tasks = await base44.entities.SubTask.filter({ project_id: projectId });
      setSubtasks(tasks || []);
    } catch (error) {
      console.error('Error loading subtasks:', error);
    }
  };

  const handleSubTaskSubmit = async (subtaskData) => {
    try {
      if (editingSubTask) {
        await base44.entities.SubTask.update(editingSubTask.id, subtaskData);
      } else {
        await base44.entities.SubTask.create(subtaskData);
      }
      
      setShowSubTaskForm(false);
      setEditingSubTask(null);
      loadSubTasks(project.id);
    } catch (error) {
      console.error('Error saving subtask:', error);
      throw error;
    }
  };

  const handleDeleteSubTask = async (id) => {
    if (!confirm('למחוק את המשימה?')) return;
    
    try {
      await base44.entities.SubTask.delete(id);
      loadSubTasks(project.id);
    } catch (error) {
      console.error('Error deleting subtask:', error);
    }
  };

  if (loading || !project) {
    return (
      <div className="p-6 lg:p-8 min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-slate-600">טוען פרויקט...</div>
      </div>
    );
  }

  const STATUS_COLORS = {
    "הצעת מחיר": "bg-blue-100 text-blue-800",
    "תכנון": "bg-purple-100 text-purple-800",
    "היתרים": "bg-yellow-100 text-yellow-800",
    "ביצוע": "bg-orange-100 text-orange-800",
    "הושלם": "bg-green-100 text-green-800",
    "מבוטל": "bg-red-100 text-red-800"
  };

  return (
    <div className="p-6 lg:p-8 min-h-screen bg-gradient-to-br from-slate-50 to-slate-100" dir="rtl">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl('Projects'))}
            className="mb-4"
          >
            <ArrowRight className="w-4 h-4 ml-2" />
            חזור לפרויקטים
          </Button>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">{project.name}</h1>
              <div className="flex items-center gap-3">
                <Badge className={STATUS_COLORS[project.status]}>
                  {project.status}
                </Badge>
                <span className="text-slate-600">
                  {project.client_name}
                </span>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={() => setShowReportGenerator(true)}
                variant="outline"
                className="border-purple-200 text-purple-700 hover:bg-purple-50"
              >
                <FileText className="w-4 h-4 ml-2" />
                דוח התקדמות
              </Button>
              <Button
                onClick={() => setShowSubTaskForm(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 ml-2" />
                תת-משימה חדשה
              </Button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 flex flex-wrap gap-2">
            <TabsTrigger value="overview" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              סקירה
            </TabsTrigger>
            <TabsTrigger value="milestones" className="gap-2">
              <Flag className="w-4 h-4" />
              אבני דרך
            </TabsTrigger>
            <TabsTrigger value="budget" className="gap-2">
              <DollarSign className="w-4 h-4" />
              תקציב
            </TabsTrigger>
            <TabsTrigger value="cashflow" className="gap-2">
              <Wallet className="w-4 h-4" />
              תזרים
            </TabsTrigger>
            <TabsTrigger value="tasks" className="gap-2">
              <ListTodo className="w-4 h-4" />
              משימות
            </TabsTrigger>
            <TabsTrigger value="gantt" className="gap-2">
              Gantt
            </TabsTrigger>
            <TabsTrigger value="resources" className="gap-2">
              <Users className="w-4 h-4" />
              משאבים
            </TabsTrigger>
            <TabsTrigger value="ai-assistant" className="gap-2">
              עוזר AI
            </TabsTrigger>
            <TabsTrigger value="reports" className="gap-2">
              <FileText className="w-4 h-4" />
              דוחות
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              היסטוריה
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Project Info Card */}
              <Card className="shadow-lg border-0">
                <CardHeader className="border-b">
                  <CardTitle>פרטי הפרויקט</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-slate-500">סוג</div>
                      <div className="font-semibold">{project.type || '-'}</div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-500">עדיפות</div>
                      <div className="font-semibold">{project.priority || 'בינונית'}</div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-500">תאריך התחלה</div>
                      <div className="font-semibold">{project.start_date || '-'}</div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-500">תאריך סיום משוער</div>
                      <div className="font-semibold">{project.end_date || '-'}</div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-500">מיקום</div>
                      <div className="font-semibold">{project.location || '-'}</div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-500">שטח</div>
                      <div className="font-semibold">{project.area ? `${project.area} מ"ר` : '-'}</div>
                    </div>
                  </div>
                  {project.description && (
                    <div>
                      <div className="text-sm text-slate-500 mb-1">תיאור</div>
                      <div className="text-slate-700">{project.description}</div>
                    </div>
                  )}
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-slate-500">התקדמות כללית</span>
                      <span className="font-bold text-blue-600">{project.progress || 0}%</span>
                    </div>
                    <Progress value={project.progress || 0} className="h-3" />
                  </div>
                </CardContent>
              </Card>

              {/* Budget Summary Card */}
              <Card className="shadow-lg border-0">
                <CardHeader className="border-b">
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-green-600" />
                    סיכום תקציב
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 rounded-xl p-4 text-center">
                      <div className="text-sm text-blue-600">תקציב מאושר</div>
                      <div className="text-2xl font-bold text-blue-700">
                        ₪{(project.budget || 0).toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-amber-50 rounded-xl p-4 text-center">
                      <div className="text-sm text-amber-600">הוצאות בפועל</div>
                      <div className="text-2xl font-bold text-amber-700">
                        ₪{(project.total_expenses || 0).toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-green-50 rounded-xl p-4 text-center">
                      <div className="text-sm text-green-600">הכנסות</div>
                      <div className="text-2xl font-bold text-green-700">
                        ₪{(project.total_income || 0).toLocaleString()}
                      </div>
                    </div>
                    <div className={`rounded-xl p-4 text-center ${(project.budget || 0) - (project.total_expenses || 0) >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
                      <div className={`text-sm ${(project.budget || 0) - (project.total_expenses || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        יתרה
                      </div>
                      <div className={`text-2xl font-bold ${(project.budget || 0) - (project.total_expenses || 0) >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                        ₪{((project.budget || 0) - (project.total_expenses || 0)).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Milestones Summary */}
              <Card className="shadow-lg border-0 md:col-span-2">
                <CardHeader className="border-b">
                  <CardTitle className="flex items-center gap-2">
                    <Flag className="w-5 h-5 text-purple-600" />
                    אבני דרך ({(project.milestones || []).filter(m => m.completed).length}/{(project.milestones || []).length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  {(project.milestones || []).length === 0 ? (
                    <div className="text-center py-4 text-slate-500">
                      לא הוגדרו אבני דרך עדיין
                      <Button 
                        variant="link" 
                        onClick={() => setActiveTab('milestones')}
                        className="mr-2"
                      >
                        הוסף עכשיו
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-2 flex-wrap">
                      {(project.milestones || []).map((m, i) => (
                        <Badge 
                          key={i} 
                          className={m.completed ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}
                        >
                          {m.completed ? '✓' : '○'} {m.name}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Milestones Tab */}
          <TabsContent value="milestones">
            <MilestonesManager
              milestones={project.milestones || []}
              onChange={async (milestones) => {
                const updated = { ...project, milestones };
                await base44.entities.Project.update(project.id, { milestones });
                setProject(updated);
                toast.success('אבני הדרך עודכנו');
              }}
            />
          </TabsContent>

          {/* Budget Tab */}
          <TabsContent value="budget">
            <BudgetManager
              budgetItems={project.budget_items || []}
              totalBudget={project.budget || 0}
              onChange={async (budget_items) => {
                const total_expenses = budget_items.reduce((sum, item) => sum + (item.actual_amount || 0), 0);
                const updated = { ...project, budget_items, total_expenses };
                await base44.entities.Project.update(project.id, { budget_items, total_expenses });
                setProject(updated);
                toast.success('התקציב עודכן');
              }}
            />
          </TabsContent>

          {/* Cashflow Tab */}
          <TabsContent value="cashflow">
            <CashflowManager
              cashflow={project.cashflow || []}
              milestones={project.milestones || []}
              onChange={async (cashflow) => {
                const total_income = cashflow
                  .filter(c => c.type === 'income' && c.status === 'התקבל')
                  .reduce((sum, c) => sum + (c.amount || 0), 0);
                const updated = { ...project, cashflow, total_income };
                await base44.entities.Project.update(project.id, { cashflow, total_income });
                setProject(updated);
                toast.success('התזרים עודכן');
              }}
            />
          </TabsContent>

          {/* Tasks List */}
          <TabsContent value="tasks">
            {/* Critical Tasks Summary */}
            <div className="mb-6">
              <CriticalTasksSummary 
                subtasks={subtasks} 
                onTaskClick={(task) => {
                  setEditingSubTask(task);
                  setShowSubTaskForm(true);
                }}
              />
            </div>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>תת-משימות ({subtasks.length})</CardTitle>
                <Button
                  onClick={() => setShowSubTaskForm(true)}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 ml-1" />
                  משימה חדשה
                </Button>
              </CardHeader>
              <CardContent>
                {subtasks.length === 0 ? (
                  <div className="text-center py-12">
                    <ListTodo className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-600 mb-4">אין תת-משימות עדיין</p>
                    <Button onClick={() => setShowSubTaskForm(true)}>
                      <Plus className="w-4 h-4 ml-2" />
                      הוסף משימה ראשונה
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {subtasks.map((task) => (
                      <div
                        key={task.id}
                        className={`border rounded-lg p-4 hover:bg-slate-50 transition-colors ${
                          task.is_critical || task.priority === 'קריטית' 
                            ? 'border-red-300 bg-red-50/50' 
                            : ''
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              {(task.is_critical || task.priority === 'קריטית') && (
                                <span className="text-red-500">🔴</span>
                              )}
                              <h3 className="font-semibold text-slate-900">
                                {task.title}
                              </h3>
                            </div>
                            {task.description && (
                              <p className="text-sm text-slate-600 mb-2">
                                {task.description}
                              </p>
                            )}
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="outline" className={`text-xs ${
                                task.status === 'הושלם' ? 'bg-green-100 text-green-700' :
                                task.status === 'בתהליך' ? 'bg-blue-100 text-blue-700' :
                                task.status === 'חסום' ? 'bg-red-100 text-red-700' :
                                ''
                              }`}>
                                {task.status}
                              </Badge>
                              <Badge variant="outline" className={`text-xs ${
                                task.priority === 'קריטית' ? 'bg-red-100 text-red-700' :
                                task.priority === 'דחופה' ? 'bg-orange-100 text-orange-700' :
                                task.priority === 'גבוהה' ? 'bg-amber-100 text-amber-700' :
                                ''
                              }`}>
                                {task.priority}
                              </Badge>
                              {task.due_date && (
                                <Badge variant="outline" className="text-xs">
                                  📅 {task.due_date}
                                </Badge>
                              )}
                              {task.assigned_to?.length > 0 && (
                                <Badge variant="outline" className="text-xs">
                                  <Users className="w-3 h-3 ml-1" />
                                  {task.assigned_to.length}
                                </Badge>
                              )}
                              {task.estimated_hours > 0 && (
                                <span className="text-xs text-slate-500">
                                  {task.estimated_hours} שעות
                                </span>
                              )}
                              {task.progress > 0 && (
                                <span className="text-xs text-blue-600">
                                  {task.progress}% הושלם
                                </span>
                              )}
                              {task.subtasks?.length > 0 && (
                                <span className="text-xs text-purple-600">
                                  {task.subtasks.filter(s => s.completed).length}/{task.subtasks.length} תתי-משימות
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingSubTask(task);
                                setShowSubTaskForm(true);
                              }}
                            >
                              ערוך
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteSubTask(task.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              מחק
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Gantt Chart */}
          <TabsContent value="gantt">
            <ProjectGantt projectId={project.id} />
          </TabsContent>

          {/* Resources */}
          <TabsContent value="resources">
            <ProjectResourceView projectId={project.id} />
          </TabsContent>

          {/* AI Summary */}
          {/* AI Assistant - All-in-one */}
          <TabsContent value="ai-assistant">
            <ProjectAIAssistant 
              project={project} 
              client={client}
              subtasks={subtasks}
            />
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports">
            <div className="space-y-6">
              {/* Report Schedule Manager */}
              <ReportScheduleManager 
                projectId={project.id} 
                projectName={project.name}
              />
              
              {/* Generate Report Button */}
              <Card>
                <CardContent className="p-6 text-center">
                  <FileText className="w-12 h-12 text-purple-400 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold mb-2">יצירת דוח התקדמות</h3>
                  <p className="text-slate-600 mb-4">צור דוח התקדמות תקופתי ושלח ללקוח או לצוות</p>
                  <Button 
                    onClick={() => setShowReportGenerator(true)}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <FileText className="w-4 h-4 ml-2" />
                    יצירת דוח חדש
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>היסטוריית שינויים</CardTitle>
              </CardHeader>
              <CardContent>
                <AuditLogViewer entityType="Project" entityId={project.id} />
              </CardContent>
            </Card>
          </TabsContent>
          </Tabs>

        {/* SubTask Form Modal */}
        {showSubTaskForm && (
          <SubTaskForm
            projectId={project.id}
            projectName={project.name}
            subtask={editingSubTask}
            onSubmit={handleSubTaskSubmit}
            onCancel={() => {
              setShowSubTaskForm(false);
              setEditingSubTask(null);
            }}
          />
        )}

        {/* Progress Report Generator Modal */}
        {showReportGenerator && (
          <ProgressReportGenerator
            project={project}
            subtasks={subtasks}
            onClose={() => setShowReportGenerator(false)}
          />
        )}
      </div>
    </div>
  );
}