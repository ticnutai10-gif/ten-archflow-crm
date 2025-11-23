import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { 
  Plus, Save, Trash2, Edit2, Play, Zap, 
  Mail, CheckSquare, AlertCircle, Clock, User, 
  Briefcase, Calendar, X, ArrowRight, Sparkles
} from "lucide-react";
import { toast } from "sonner";

const TRIGGERS = [
  { 
    value: 'client_created', 
    label: 'לקוח חדש נוצר', 
    icon: User, 
    color: 'blue',
    description: 'מופעל כאשר לקוח חדש נוסף למערכת'
  },
  { 
    value: 'client_status_changed', 
    label: 'סטטוס לקוח השתנה', 
    icon: User, 
    color: 'green',
    description: 'מופעל כאשר סטטוס לקוח משתנה (פוטנציאלי/פעיל/לא פעיל)'
  },
  { 
    value: 'project_created', 
    label: 'פרויקט חדש נוצר', 
    icon: Briefcase, 
    color: 'purple',
    description: 'מופעל כאשר פרויקט חדש נוסף למערכת'
  },
  { 
    value: 'project_status_changed', 
    label: 'סטטוס פרויקט השתנה', 
    icon: Briefcase, 
    color: 'orange',
    description: 'מופעל כאשר סטטוס פרויקט משתנה'
  },
  { 
    value: 'task_created', 
    label: 'משימה חדשה נוצרה', 
    icon: CheckSquare, 
    color: 'pink',
    description: 'מופעל כאשר משימה חדשה נוספה'
  },
  { 
    value: 'task_status_changed', 
    label: 'סטטוס משימה השתנה', 
    icon: CheckSquare, 
    color: 'teal',
    description: 'מופעל כאשר סטטוס משימה משתנה'
  },
  { 
    value: 'task_overdue', 
    label: 'משימה עברה את מועד היעד', 
    icon: AlertCircle, 
    color: 'red',
    description: 'מופעל כאשר משימה לא הושלמה במועד'
  },
  { 
    value: 'meeting_scheduled', 
    label: 'פגישה נקבעה', 
    icon: Calendar, 
    color: 'indigo',
    description: 'מופעל כאשר פגישה חדשה מתוזמנת'
  }
];

const ACTIONS = [
  { 
    value: 'send_email', 
    label: 'שלח מייל', 
    icon: Mail, 
    color: 'blue',
    description: 'שלח הודעת אימייל אוטומטית',
    params: ['to', 'subject', 'body']
  },
  { 
    value: 'send_whatsapp', 
    label: 'שלח הודעת WhatsApp', 
    icon: Mail, 
    color: 'green',
    description: 'שלח הודעה ל-WhatsApp',
    params: ['phone', 'message']
  },
  { 
    value: 'create_task', 
    label: 'צור משימה', 
    icon: CheckSquare, 
    color: 'green',
    description: 'צור משימה חדשה אוטומטית',
    params: ['title', 'description', 'status', 'priority', 'assigned_to']
  },
  { 
    value: 'update_tasks_status', 
    label: 'עדכן סטטוס משימות', 
    icon: CheckSquare, 
    color: 'orange',
    description: 'עדכן סטטוס של משימות קיימות',
    params: ['project_name', 'client_name', 'from_status', 'to_status']
  },
  { 
    value: 'send_notification', 
    label: 'שלח התראה', 
    icon: AlertCircle, 
    color: 'purple',
    description: 'צור התראה במערכת למשתמש',
    params: ['user_email', 'title', 'message', 'type']
  }
];

const ICON_COLOR = "#2C3A50";

export default function AutomationsPage() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  
  const [formData, setFormData] = useState({
    name: "",
    active: true,
    trigger: "",
    conditions: {},
    actions: []
  });

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.AutomationRule.list('-updated_date');
      setRules(data || []);
    } catch (error) {
      console.error('Error loading rules:', error);
      toast.error('שגיאה בטעינת חוקי אוטומציה');
    }
    setLoading(false);
  };

  const openNewRule = () => {
    setEditingRule(null);
    setFormData({
      name: "",
      active: true,
      trigger: "",
      conditions: {},
      actions: []
    });
    setShowDialog(true);
  };

  const openEditRule = (rule) => {
    setEditingRule(rule);
    setFormData({
      name: rule.name || "",
      active: rule.active !== false,
      trigger: rule.trigger || "",
      conditions: rule.conditions || {},
      actions: rule.actions || []
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('נא להזין שם לחוק');
      return;
    }
    
    if (!formData.trigger) {
      toast.error('נא לבחור טריגר');
      return;
    }

    if (formData.actions.length === 0) {
      toast.error('נא להוסיף לפחות פעולה אחת');
      return;
    }

    try {
      if (editingRule) {
        await base44.entities.AutomationRule.update(editingRule.id, formData);
        toast.success('✓ החוק עודכן בהצלחה');
      } else {
        await base44.entities.AutomationRule.create(formData);
        toast.success('✓ חוק חדש נוצר בהצלחה');
      }
      
      setShowDialog(false);
      loadRules();
    } catch (error) {
      console.error('Error saving rule:', error);
      toast.error('שגיאה בשמירת החוק');
    }
  };

  const handleDelete = async (rule) => {
    if (!confirm(`האם למחוק את החוק "${rule.name}"? פעולה זו אינה הפיכה.`)) return;
    
    try {
      await base44.entities.AutomationRule.delete(rule.id);
      toast.success('✓ החוק נמחק');
      loadRules();
    } catch (error) {
      console.error('Error deleting rule:', error);
      toast.error('שגיאה במחיקת החוק');
    }
  };

  const toggleActive = async (rule) => {
    try {
      await base44.entities.AutomationRule.update(rule.id, { active: !rule.active });
      toast.success(rule.active ? 'החוק הושבת' : 'החוק הופעל');
      loadRules();
    } catch (error) {
      toast.error('שגיאה בעדכון החוק');
    }
  };

  const addAction = (actionType) => {
    const newAction = { type: actionType, params: {} };
    setFormData(prev => ({
      ...prev,
      actions: [...prev.actions, newAction]
    }));
  };

  const updateAction = (index, field, value) => {
    setFormData(prev => {
      const newActions = [...prev.actions];
      if (field === 'type') {
        newActions[index] = { type: value, params: {} };
      } else {
        newActions[index] = {
          ...newActions[index],
          params: {
            ...newActions[index].params,
            [field]: value
          }
        };
      }
      return { ...prev, actions: newActions };
    });
  };

  const removeAction = (index) => {
    setFormData(prev => ({
      ...prev,
      actions: prev.actions.filter((_, i) => i !== index)
    }));
  };

  const getTriggerInfo = (value) => {
    return TRIGGERS.find(t => t.value === value) || TRIGGERS[0];
  };

  const getActionInfo = (value) => {
    return ACTIONS.find(a => a.value === value) || ACTIONS[0];
  };

  return (
    <div className="p-6 lg:p-8 min-h-screen pl-24 lg:pl-12" dir="rtl" style={{ backgroundColor: '#FCF6E3' }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 shadow-lg">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">אוטומציות</h1>
                <p className="text-slate-600 mt-1">הגדר פעולות אוטומטיות לייעול העבודה</p>
              </div>
            </div>
            <Button 
              onClick={openNewRule}
              className="gap-2"
              style={{ backgroundColor: ICON_COLOR }}
            >
              <Plus className="w-4 h-4" />
              חוק חדש
            </Button>
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Sparkles className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-bold text-blue-900 mb-1">מה זה אוטומציות?</h3>
                  <p className="text-sm text-blue-800">
                    הגדר פעולות שיבוצעו אוטומטית כאשר אירועים מסוימים מתרחשים במערכת. 
                    למשל: כשלקוח חדש נוצר, שלח לו מייל ברוכים הבאים.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-teal-50 border-2 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Clock className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-bold text-green-900 mb-1">איך זה עובד?</h3>
                  <p className="text-sm text-green-800">
                    בחר טריגר (אירוע מפעיל) → הוסף פעולות → הפעל את החוק. 
                    המערכת תבצע את הפעולות אוטומטית כשהאירוע מתרחש.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Rules List */}
        <Card className="shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center justify-between">
              <span>החוקים שלי</span>
              <Badge variant="outline" className="text-sm">
                {rules.length} חוקים
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {loading ? (
              <div className="space-y-3">
                {Array(3).fill(0).map((_, i) => (
                  <div key={i} className="h-24 bg-slate-200 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : rules.length === 0 ? (
              <div className="text-center py-12">
                <Zap className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-600 mb-2">אין חוקי אוטומציה עדיין</h3>
                <p className="text-slate-500 mb-6">התחל ליצור את החוק הראשון שלך</p>
                <Button onClick={openNewRule} className="gap-2" style={{ backgroundColor: ICON_COLOR }}>
                  <Plus className="w-4 h-4" />
                  צור חוק ראשון
                </Button>
              </div>
            ) : (
              <ScrollArea className="h-[600px]">
                <div className="space-y-4 pr-4">
                  {rules.map(rule => {
                    const triggerInfo = getTriggerInfo(rule.trigger);
                    const TriggerIcon = triggerInfo.icon;
                    
                    return (
                      <Card key={rule.id} className="border-2 hover:shadow-md transition-all">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              {/* Header */}
                              <div className="flex items-center gap-3 mb-3">
                                <div 
                                  className="p-2 rounded-lg"
                                  style={{ backgroundColor: `${triggerInfo.color === 'blue' ? '#dbeafe' : triggerInfo.color === 'green' ? '#d1fae5' : triggerInfo.color === 'purple' ? '#ede9fe' : triggerInfo.color === 'orange' ? '#fed7aa' : triggerInfo.color === 'pink' ? '#fce7f3' : triggerInfo.color === 'teal' ? '#ccfbf1' : triggerInfo.color === 'red' ? '#fee2e2' : '#e0e7ff'}` }}
                                >
                                  <TriggerIcon className="w-5 h-5" style={{ color: ICON_COLOR }} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-bold text-slate-900 text-lg truncate">{rule.name}</h3>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Badge variant="outline" className="text-xs">
                                      {triggerInfo.label}
                                    </Badge>
                                    {rule.active ? (
                                      <Badge className="bg-green-100 text-green-800 text-xs">פעיל ✓</Badge>
                                    ) : (
                                      <Badge variant="outline" className="text-slate-500 text-xs">כבוי</Badge>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Actions Preview */}
                              <div className="bg-slate-50 rounded-lg p-3 space-y-2">
                                <div className="text-xs font-semibold text-slate-600 mb-2">פעולות ({rule.actions?.length || 0}):</div>
                                {(rule.actions || []).map((action, idx) => {
                                  const actionInfo = getActionInfo(action.type);
                                  const ActionIcon = actionInfo.icon;
                                  
                                  return (
                                    <div key={idx} className="flex items-center gap-2 text-sm">
                                      <ArrowRight className="w-3 h-3 text-slate-400" />
                                      <ActionIcon className="w-4 h-4" style={{ color: ICON_COLOR }} />
                                      <span className="text-slate-700">{actionInfo.label}</span>
                                      {action.params?.title && (
                                        <span className="text-slate-500 text-xs truncate">
                                          ({action.params.title})
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col gap-2">
                              <Switch
                                checked={rule.active}
                                onCheckedChange={() => toggleActive(rule)}
                                title={rule.active ? 'השבת חוק' : 'הפעל חוק'}
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditRule(rule)}
                                title="ערוך חוק"
                              >
                                <Edit2 className="w-4 h-4" style={{ color: ICON_COLOR }} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(rule)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                title="מחק חוק"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Rule Editor Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col" dir="rtl">
          <DialogHeader className="border-b pb-4">
            <DialogTitle className="text-2xl flex items-center gap-2">
              <Zap className="w-6 h-6 text-purple-600" />
              {editingRule ? 'עריכת חוק אוטומציה' : 'חוק אוטומציה חדש'}
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="flex-1 px-6">
            <div className="space-y-6 py-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-slate-700 mb-2 block">
                    שם החוק
                  </label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="למשל: שלח ברוכים הבאים ללקוח חדש"
                    className="text-base"
                  />
                </div>

                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
                  <Switch
                    checked={formData.active}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, active: checked }))}
                  />
                  <div>
                    <div className="font-semibold text-slate-900">חוק פעיל</div>
                    <div className="text-xs text-slate-600">
                      {formData.active ? 'החוק יופעל אוטומטית כאשר התנאים מתקיימים' : 'החוק מושבת ולא יופעל'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Trigger Selection */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-lg">1️⃣</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">בחר טריגר (אירוע מפעיל)</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {TRIGGERS.map(trigger => {
                    const TriggerIcon = trigger.icon;
                    const isSelected = formData.trigger === trigger.value;
                    
                    return (
                      <button
                        key={trigger.value}
                        onClick={() => setFormData(prev => ({ ...prev, trigger: trigger.value }))}
                        className={`p-4 rounded-xl border-2 text-right transition-all ${
                          isSelected 
                            ? 'border-blue-500 bg-blue-50 shadow-md' 
                            : 'border-slate-200 bg-white hover:border-blue-300 hover:shadow-sm'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${isSelected ? 'bg-blue-100' : 'bg-slate-100'}`}>
                            <TriggerIcon className="w-5 h-5" style={{ color: isSelected ? '#3b82f6' : ICON_COLOR }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className={`font-semibold mb-1 ${isSelected ? 'text-blue-700' : 'text-slate-900'}`}>
                              {trigger.label}
                            </div>
                            <div className="text-xs text-slate-600">
                              {trigger.description}
                            </div>
                          </div>
                          {isSelected && (
                            <div className="flex-shrink-0">
                              <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center">
                                <span className="text-white text-xs">✓</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                    <span className="text-lg">2️⃣</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">הוסף פעולות</h3>
                </div>

                {/* Existing Actions */}
                {formData.actions.length > 0 && (
                  <div className="space-y-3">
                    {formData.actions.map((action, index) => {
                      const actionInfo = getActionInfo(action.type);
                      const ActionIcon = actionInfo.icon;
                      
                      return (
                        <Card key={index} className="border-2 border-slate-200">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-3 mb-3">
                              <div className="flex items-center gap-2">
                                <div className="p-2 rounded-lg bg-green-100">
                                  <ActionIcon className="w-4 h-4 text-green-700" />
                                </div>
                                <div>
                                  <div className="font-semibold text-slate-900">{actionInfo.label}</div>
                                  <div className="text-xs text-slate-500">{actionInfo.description}</div>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeAction(index)}
                                className="text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>

                            {/* Action Parameters */}
                            <div className="space-y-3 bg-slate-50 p-3 rounded-lg">
                              {action.type === 'send_email' && (
                                <>
                                  <Input
                                    placeholder="נמען (למשל: {{email}} או admin@example.com)"
                                    value={action.params?.to || ""}
                                    onChange={(e) => updateAction(index, 'to', e.target.value)}
                                  />
                                  <Input
                                    placeholder="נושא המייל"
                                    value={action.params?.subject || ""}
                                    onChange={(e) => updateAction(index, 'subject', e.target.value)}
                                  />
                                  <Textarea
                                    placeholder="תוכן המייל (אפשר להשתמש ב-{{name}}, {{email}} וכו')"
                                    value={action.params?.body || ""}
                                    onChange={(e) => updateAction(index, 'body', e.target.value)}
                                    rows={4}
                                  />
                                </>
                              )}

                              {action.type === 'create_task' && (
                                <>
                                  <Input
                                    placeholder="כותרת המשימה"
                                    value={action.params?.title || ""}
                                    onChange={(e) => updateAction(index, 'title', e.target.value)}
                                  />
                                  <Textarea
                                    placeholder="תיאור המשימה"
                                    value={action.params?.description || ""}
                                    onChange={(e) => updateAction(index, 'description', e.target.value)}
                                    rows={3}
                                  />
                                  <div className="grid grid-cols-2 gap-3">
                                    <Select 
                                      value={action.params?.status || ""} 
                                      onValueChange={(v) => updateAction(index, 'status', v)}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="סטטוס" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="חדשה">חדשה</SelectItem>
                                        <SelectItem value="בתהליך">בתהליך</SelectItem>
                                        <SelectItem value="הושלמה">הושלמה</SelectItem>
                                      </SelectContent>
                                    </Select>

                                    <Select 
                                      value={action.params?.priority || ""} 
                                      onValueChange={(v) => updateAction(index, 'priority', v)}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="עדיפות" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="גבוהה">גבוהה</SelectItem>
                                        <SelectItem value="בינונית">בינונית</SelectItem>
                                        <SelectItem value="נמוכה">נמוכה</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <Input
                                    placeholder="הוקצה ל (אימייל או השאר ריק)"
                                    value={action.params?.assigned_to || ""}
                                    onChange={(e) => updateAction(index, 'assigned_to', e.target.value)}
                                  />
                                </>
                              )}

                              {action.type === 'update_tasks_status' && (
                                <>
                                  <Input
                                    placeholder="שם פרויקט (אופציונלי - לעדכן רק משימות של פרויקט מסוים)"
                                    value={action.params?.project_name || ""}
                                    onChange={(e) => updateAction(index, 'project_name', e.target.value)}
                                  />
                                  <Input
                                    placeholder="שם לקוח (אופציונלי)"
                                    value={action.params?.client_name || ""}
                                    onChange={(e) => updateAction(index, 'client_name', e.target.value)}
                                  />
                                  <div className="grid grid-cols-2 gap-3">
                                    <Input
                                      placeholder="מסטטוס (אופציונלי)"
                                      value={action.params?.from_status || ""}
                                      onChange={(e) => updateAction(index, 'from_status', e.target.value)}
                                    />
                                    <Input
                                      placeholder="לסטטוס (למשל: הושלמה)"
                                      value={action.params?.to_status || ""}
                                      onChange={(e) => updateAction(index, 'to_status', e.target.value)}
                                    />
                                  </div>
                                </>
                              )}

                              {action.type === 'send_notification' && (
                                <>
                                  <Input
                                    placeholder="אימייל מקבל ההתראה"
                                    value={action.params?.user_email || ""}
                                    onChange={(e) => updateAction(index, 'user_email', e.target.value)}
                                  />
                                  <Input
                                    placeholder="כותרת ההתראה"
                                    value={action.params?.title || ""}
                                    onChange={(e) => updateAction(index, 'title', e.target.value)}
                                  />
                                  <Textarea
                                    placeholder="תוכן ההתראה"
                                    value={action.params?.message || ""}
                                    onChange={(e) => updateAction(index, 'message', e.target.value)}
                                    rows={3}
                                  />
                                  <Select 
                                    value={action.params?.type || ""} 
                                    onValueChange={(v) => updateAction(index, 'type', v)}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="סוג התראה" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="deadline_approaching">מועד מתקרב</SelectItem>
                                      <SelectItem value="status_changed">שינוי סטטוס</SelectItem>
                                      <SelectItem value="project_milestone">אבן דרך בפרויקט</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </>
                              )}

                              {action.type === 'send_whatsapp' && (
                                <>
                                  <Input
                                    placeholder="מספר טלפון (עם קידומת, למשל: +972501234567 או {{phone}})"
                                    value={action.params?.phone || ""}
                                    onChange={(e) => updateAction(index, 'phone', e.target.value)}
                                  />
                                  <Textarea
                                    placeholder="תוכן ההודעה (אפשר להשתמש ב-{{name}}, {{title}} וכו')"
                                    value={action.params?.message || ""}
                                    onChange={(e) => updateAction(index, 'message', e.target.value)}
                                    rows={4}
                                  />
                                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
                                    💡 ההודעה תפתח את WhatsApp עם הטקסט מוכן לשליחה
                                  </div>
                                </>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}

                {/* Add Action Buttons */}
                <div className="space-y-2">
                  <div className="text-sm font-semibold text-slate-700 mb-2">הוסף פעולה חדשה:</div>
                  <div className="grid grid-cols-2 gap-3">
                    {ACTIONS.map(action => {
                      const ActionIcon = action.icon;
                      
                      return (
                        <button
                          key={action.value}
                          onClick={() => addAction(action.value)}
                          className="p-3 rounded-lg border-2 border-dashed border-slate-300 hover:border-blue-400 hover:bg-blue-50 transition-all text-right"
                        >
                          <div className="flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-slate-100">
                              <ActionIcon className="w-4 h-4" style={{ color: ICON_COLOR }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-sm text-slate-900">{action.label}</div>
                              <div className="text-xs text-slate-600 truncate">{action.description}</div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="border-t pt-4 px-6">
            <div className="flex gap-2 w-full justify-end">
              <Button
                variant="outline"
                onClick={() => setShowDialog(false)}
              >
                ביטול
              </Button>
              <Button
                onClick={handleSave}
                className="gap-2"
                style={{ backgroundColor: ICON_COLOR }}
              >
                <Save className="w-4 h-4" />
                {editingRule ? 'עדכן חוק' : 'צור חוק'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}