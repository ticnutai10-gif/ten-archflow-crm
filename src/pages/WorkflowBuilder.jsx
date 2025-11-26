import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Zap,
  Plus,
  Trash2,
  Edit,
  Copy,
  Play,
  Pause,
  ArrowRight,
  Clock,
  Mail,
  CheckSquare,
  Users,
  FileText,
  Bell,
  Sparkles,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { toast } from "sonner";

const TEMPLATES = {
  new_lead_followup: {
    name: "מעקב אחר ליד חדש",
    description: "שולח אימייל אוטומטי ויוצר משימת מעקב כשנוצר לקוח חדש",
    trigger: { type: "client_created", conditions: {} },
    actions: [
      {
        type: "send_email",
        delay_minutes: 5,
        params: {
          subject: "ברוכים הבאים!",
          body: "שלום, תודה שבחרת בנו. נחזור אליך בקרוב."
        }
      },
      {
        type: "create_task",
        delay_minutes: 1440,
        params: {
          title: "מעקב אחר ליד חדש",
          priority: "גבוהה",
          description: "לבצע שיחת מעקב עם הלקוח"
        }
      }
    ]
  },
  project_onboarding: {
    name: "אונבורדינג פרויקט חדש",
    description: "יוצר משימות וקובע פגישת קיק-אוף כשפרויקט עובר לשלב 'תכנון'",
    trigger: { 
      type: "project_status_changed", 
      conditions: { new_status: "תכנון" } 
    },
    actions: [
      {
        type: "schedule_meeting",
        params: {
          title: "פגישת קיק-אוף",
          meeting_type: "פגישת תכנון",
          duration_minutes: 90
        }
      },
      {
        type: "create_task",
        params: {
          title: "הכנת מצגת קיק-אוף",
          priority: "גבוהה"
        }
      },
      {
        type: "create_task",
        delay_minutes: 60,
        params: {
          title: "איסוף מסמכים ראשוניים",
          priority: "בינונית"
        }
      }
    ]
  },
  task_escalation: {
    name: "הסלמת משימה",
    description: "שולח התראה ומעדכן עדיפות כשמשימה מאחרת",
    trigger: { type: "task_overdue", conditions: {} },
    actions: [
      {
        type: "send_notification",
        params: {
          title: "משימה באיחור",
          message: "המשימה עברה את תאריך היעד"
        }
      },
      {
        type: "send_email",
        delay_minutes: 1440,
        params: {
          subject: "משימה דחופה - נדרשת פעולה",
          body: "המשימה באיחור של יותר מיום. אנא טפל בהקדם."
        }
      }
    ]
  }
};

const TRIGGER_TYPES = [
  { value: "client_created", label: "לקוח חדש נוצר", icon: Users },
  { value: "client_stage_changed", label: "שלב לקוח השתנה", icon: Users },
  { value: "project_status_changed", label: "סטטוס פרויקט השתנה", icon: FileText },
  { value: "task_status_changed", label: "סטטוס משימה השתנה", icon: CheckSquare },
  { value: "task_overdue", label: "משימה באיחור", icon: Clock },
  { value: "meeting_scheduled", label: "פגישה נקבעה", icon: Clock },
  { value: "quote_status_changed", label: "סטטוס הצעת מחיר השתנה", icon: FileText }
];

const ACTION_TYPES = [
  { value: "create_task", label: "צור משימה", icon: CheckSquare, color: "blue" },
  { value: "send_email", label: "שלח אימייל", icon: Mail, color: "purple" },
  { value: "send_notification", label: "שלח התראה", icon: Bell, color: "orange" },
  { value: "schedule_meeting", label: "קבע פגישה", icon: Clock, color: "green" },
  { value: "change_stage", label: "שנה שלב", icon: ArrowRight, color: "indigo" },
  { value: "add_note", label: "הוסף הערה", icon: FileText, color: "slate" }
];

export default function WorkflowBuilder() {
  const [workflows, setWorkflows] = useState([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    active: true,
    trigger: { type: '', conditions: {} },
    actions: [],
    template: 'custom'
  });
  const [expandedActions, setExpandedActions] = useState([]);

  useEffect(() => {
    loadWorkflows();
  }, []);

  const loadWorkflows = async () => {
    try {
      const data = await base44.entities.WorkflowAutomation.list('-created_date');
      setWorkflows(data);
    } catch (error) {
      console.error('Error loading workflows:', error);
      setWorkflows([]);
    }
  };

  const handleCreateFromTemplate = (templateKey) => {
    const template = TEMPLATES[templateKey];
    setFormData({
      name: template.name,
      description: template.description,
      active: true,
      trigger: template.trigger,
      actions: template.actions,
      template: templateKey
    });
    setShowDialog(true);
  };

  const handleAddAction = () => {
    setFormData(prev => ({
      ...prev,
      actions: [...prev.actions, { type: '', delay_minutes: 0, params: {} }]
    }));
  };

  const handleUpdateAction = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      actions: prev.actions.map((action, i) => 
        i === index ? { ...action, [field]: value } : action
      )
    }));
  };

  const handleRemoveAction = (index) => {
    setFormData(prev => ({
      ...prev,
      actions: prev.actions.filter((_, i) => i !== index)
    }));
  };

  const handleSave = async () => {
    if (!formData.name || !formData.trigger.type || formData.actions.length === 0) {
      toast.error('נא למלא את כל השדות הנדרשים');
      return;
    }

    try {
      if (editingWorkflow) {
        await base44.entities.WorkflowAutomation.update(editingWorkflow.id, formData);
        toast.success('האוטומציה עודכנה');
      } else {
        await base44.entities.WorkflowAutomation.create(formData);
        toast.success('האוטומציה נוצרה');
      }
      setShowDialog(false);
      setEditingWorkflow(null);
      setFormData({
        name: '',
        description: '',
        active: true,
        trigger: { type: '', conditions: {} },
        actions: [],
        template: 'custom'
      });
      loadWorkflows();
    } catch (error) {
      toast.error('שגיאה בשמירה');
    }
  };

  const handleToggleActive = async (workflow) => {
    try {
      await base44.entities.WorkflowAutomation.update(workflow.id, {
        active: !workflow.active
      });
      toast.success(workflow.active ? 'האוטומציה הושבתה' : 'האוטומציה הופעלה');
      loadWorkflows();
    } catch (error) {
      toast.error('שגיאה בעדכון');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('למחוק אוטומציה זו?')) return;
    try {
      await base44.entities.WorkflowAutomation.delete(id);
      toast.success('האוטומציה נמחקה');
      loadWorkflows();
    } catch (error) {
      toast.error('שגיאה במחיקה');
    }
  };

  const handleEdit = (workflow) => {
    setEditingWorkflow(workflow);
    setFormData({
      name: workflow.name,
      description: workflow.description || '',
      active: workflow.active,
      trigger: workflow.trigger,
      actions: workflow.actions,
      template: workflow.template || 'custom'
    });
    setShowDialog(true);
  };

  const getActionIcon = (type) => {
    const actionType = ACTION_TYPES.find(a => a.value === type);
    return actionType ? actionType.icon : CheckSquare;
  };

  const getActionColor = (type) => {
    const actionType = ACTION_TYPES.find(a => a.value === type);
    return actionType ? actionType.color : 'slate';
  };

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">בונה אוטומציות</h2>
          <p className="text-slate-600">צור רצפי פעולות אוטומטיות מותאמות אישית</p>
        </div>
        <Button onClick={() => setShowDialog(true)} className="bg-purple-600 hover:bg-purple-700">
          <Plus className="w-4 h-4 mr-2" />
          אוטומציה חדשה
        </Button>
      </div>

      {/* Templates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            תבניות מוכנות
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(TEMPLATES).map(([key, template]) => (
              <Card key={key} className="border-2 hover:border-purple-300 transition-all cursor-pointer" onClick={() => handleCreateFromTemplate(key)}>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-slate-900 mb-2">{template.name}</h3>
                  <p className="text-sm text-slate-600 mb-3">{template.description}</p>
                  <Badge variant="outline" className="text-xs">
                    {template.actions.length} פעולות
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Workflows List */}
      <div className="space-y-4">
        {workflows.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Zap className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">אין אוטומציות. התחל מתבנית או צור אוטומציה מותאמת.</p>
            </CardContent>
          </Card>
        ) : (
          workflows.map(workflow => {
            const triggerType = TRIGGER_TYPES.find(t => t.value === workflow.trigger.type);
            
            return (
              <Card key={workflow.id} className={workflow.active ? 'border-l-4 border-l-purple-500' : 'opacity-60'}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-bold text-lg text-slate-900">{workflow.name}</h3>
                        <Badge className={workflow.active ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'}>
                          {workflow.active ? 'פעיל' : 'מושבת'}
                        </Badge>
                        {workflow.template !== 'custom' && (
                          <Badge variant="outline" className="text-xs">
                            <Sparkles className="w-3 h-3 ml-1" />
                            תבנית
                          </Badge>
                        )}
                      </div>
                      {workflow.description && (
                        <p className="text-sm text-slate-600 mb-3">{workflow.description}</p>
                      )}
                      
                      {/* Trigger */}
                      <div className="flex items-center gap-2 text-sm text-slate-700 mb-3">
                        <Zap className="w-4 h-4 text-purple-600" />
                        <span className="font-medium">טריגר:</span>
                        <span>{triggerType?.label || workflow.trigger.type}</span>
                      </div>

                      {/* Actions Flow */}
                      <div className="flex flex-wrap gap-2 items-center">
                        {workflow.actions.map((action, idx) => {
                          const Icon = getActionIcon(action.type);
                          const color = getActionColor(action.type);
                          
                          return (
                            <React.Fragment key={idx}>
                              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg bg-${color}-50 border border-${color}-200`}>
                                <Icon className={`w-4 h-4 text-${color}-600`} />
                                <span className={`text-xs font-medium text-${color}-900`}>
                                  {ACTION_TYPES.find(a => a.value === action.type)?.label || action.type}
                                </span>
                                {action.delay_minutes > 0 && (
                                  <Badge variant="outline" className="text-[10px] px-1">
                                    +{action.delay_minutes}ד'
                                  </Badge>
                                )}
                              </div>
                              {idx < workflow.actions.length - 1 && (
                                <ArrowRight className="w-4 h-4 text-slate-400" />
                              )}
                            </React.Fragment>
                          );
                        })}
                      </div>

                      {/* Stats */}
                      {workflow.execution_count > 0 && (
                        <div className="mt-3 text-xs text-slate-500">
                          בוצע {workflow.execution_count} פעמים
                          {workflow.last_execution && ` • אחרון: ${new Date(workflow.last_execution).toLocaleDateString('he-IL')}`}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggleActive(workflow)}
                        title={workflow.active ? 'השבת' : 'הפעל'}
                      >
                        {workflow.active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(workflow)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(workflow.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Create/Edit Dialog */}
      {showDialog && (
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle>{editingWorkflow ? 'עריכת אוטומציה' : 'אוטומציה חדשה'}</DialogTitle>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Basic Info */}
              <div className="space-y-4">
                <div>
                  <Label>שם האוטומציה *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="לדוגמה: מעקב אחר לקוח חדש"
                  />
                </div>

                <div>
                  <Label>תיאור</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="מה האוטומציה עושה?"
                    rows={2}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.active}
                    onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                  />
                  <Label>אוטומציה פעילה</Label>
                </div>
              </div>

              {/* Trigger */}
              <div className="space-y-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                <h3 className="font-semibold flex items-center gap-2">
                  <Zap className="w-5 h-5 text-purple-600" />
                  טריגר - מתי להפעיל?
                </h3>
                <Select
                  value={formData.trigger.type}
                  onValueChange={(value) => setFormData({ ...formData, trigger: { ...formData.trigger, type: value } })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="בחר טריגר" />
                  </SelectTrigger>
                  <SelectContent>
                    {TRIGGER_TYPES.map(trigger => (
                      <SelectItem key={trigger.value} value={trigger.value}>
                        {trigger.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Actions */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold flex items-center gap-2">
                    <ArrowRight className="w-5 h-5 text-blue-600" />
                    פעולות - מה לבצע?
                  </h3>
                  <Button onClick={handleAddAction} size="sm" variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    הוסף פעולה
                  </Button>
                </div>

                {formData.actions.map((action, index) => {
                  const isExpanded = expandedActions.includes(index);
                  const Icon = getActionIcon(action.type);
                  
                  return (
                    <Card key={index} className="border-2">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-${getActionColor(action.type)}-100 flex-shrink-0`}>
                            <Icon className={`w-4 h-4 text-${getActionColor(action.type)}-600`} />
                          </div>
                          
                          <div className="flex-1 space-y-3">
                            <Select
                              value={action.type}
                              onValueChange={(value) => handleUpdateAction(index, 'type', value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="בחר סוג פעולה" />
                              </SelectTrigger>
                              <SelectContent>
                                {ACTION_TYPES.map(actionType => (
                                  <SelectItem key={actionType.value} value={actionType.value}>
                                    {actionType.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-slate-400" />
                              <Input
                                type="number"
                                value={action.delay_minutes}
                                onChange={(e) => handleUpdateAction(index, 'delay_minutes', parseInt(e.target.value) || 0)}
                                placeholder="0"
                                className="w-24"
                              />
                              <span className="text-sm text-slate-600">דקות המתנה</span>
                            </div>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setExpandedActions(prev => 
                                isExpanded ? prev.filter(i => i !== index) : [...prev, index]
                              )}
                              className="text-xs"
                            >
                              {isExpanded ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
                              פרמטרים נוספים
                            </Button>

                            {isExpanded && (
                              <div className="space-y-2 p-3 bg-slate-50 rounded">
                                <p className="text-xs text-slate-600 mb-2">פרמטרים (JSON):</p>
                                <Textarea
                                  value={JSON.stringify(action.params, null, 2)}
                                  onChange={(e) => {
                                    try {
                                      const params = JSON.parse(e.target.value);
                                      handleUpdateAction(index, 'params', params);
                                    } catch (err) {
                                      // Invalid JSON, ignore
                                    }
                                  }}
                                  rows={4}
                                  className="font-mono text-xs"
                                />
                              </div>
                            )}
                          </div>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveAction(index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                ביטול
              </Button>
              <Button onClick={handleSave} className="bg-purple-600 hover:bg-purple-700">
                {editingWorkflow ? 'עדכן' : 'צור אוטומציה'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}