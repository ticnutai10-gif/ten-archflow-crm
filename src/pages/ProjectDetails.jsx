import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Plus, ListTodo, BarChart3, Users } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';

import SubTaskForm from '../components/projects/SubTaskForm';
import ProjectGantt from '../components/projects/ProjectGantt';
import ProjectResourceView from '../components/projects/ProjectResourceView';

export default function ProjectDetails() {
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [subtasks, setSubtasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSubTaskForm, setShowSubTaskForm] = useState(false);
  const [editingSubTask, setEditingSubTask] = useState(null);
  const [activeTab, setActiveTab] = useState('tasks');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const projectId = params.get('project_id');
    
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
            
            <Button
              onClick={() => setShowSubTaskForm(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 ml-2" />
              תת-משימה חדשה
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="tasks" className="gap-2">
              <ListTodo className="w-4 h-4" />
              משימות
            </TabsTrigger>
            <TabsTrigger value="gantt" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              Gantt
            </TabsTrigger>
            <TabsTrigger value="resources" className="gap-2">
              <Users className="w-4 h-4" />
              משאבים
            </TabsTrigger>
          </TabsList>

          {/* Tasks List */}
          <TabsContent value="tasks">
            <Card>
              <CardHeader>
                <CardTitle>תת-משימות ({subtasks.length})</CardTitle>
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
                        className="border rounded-lg p-4 hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-slate-900 mb-1">
                              {task.title}
                            </h3>
                            {task.description && (
                              <p className="text-sm text-slate-600 mb-2">
                                {task.description}
                              </p>
                            )}
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {task.status}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {task.priority}
                              </Badge>
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
      </div>
    </div>
  );
}