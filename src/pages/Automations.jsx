
import React from "react";
import { AutomationRule } from "@/entities/AutomationRule";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Plus, Save, Trash2, Edit2, Play, Bot, Filter } from "lucide-react";
import { automationEngine } from "@/functions/automationEngine";

export default function Automations() {
  const [rules, setRules] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [editingRule, setEditingRule] = React.useState(null);
  const [form, setForm] = React.useState({
    name: "",
    active: true,
    trigger: "client_created",
    conditions: "{}", // JSON string
    actions: [] // array of {type, params:{}}
  });
  const [newAction, setNewAction] = React.useState({ type: "create_task", params: {} });
  const [testEvent, setTestEvent] = React.useState("client_created");
  const [testPayload, setTestPayload] = React.useState('{"client_name":"לקוח בדיקה","email":"client@example.com"}');
  const [testResult, setTestResult] = React.useState(null);

  const loadRules = React.useCallback(async () => {
    setLoading(true);
    const list = await AutomationRule.list("-updated_date", 200).catch(() => []);
    setRules(list || []);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    loadRules();
  }, [loadRules]);

  const resetForm = () => {
    setEditingRule(null);
    setForm({
      name: "",
      active: true,
      trigger: "client_created",
      conditions: "{}",
      actions: []
    });
    setNewAction({ type: "create_task", params: {} });
  };

  const saveRule = async () => {
    // Parse conditions JSON safely
    let conditionsObj = {};
    try {
      conditionsObj = form.conditions ? JSON.parse(form.conditions) : {};
    } catch {
      alert("תנאים חייבים להיות JSON תקין");
      return;
    }
    const payload = {
      name: form.name || "כלל ללא שם",
      active: !!form.active,
      trigger: form.trigger,
      conditions: conditionsObj,
      actions: form.actions
    };
    if (editingRule) {
      await AutomationRule.update(editingRule.id, payload);
    } else {
      await AutomationRule.create(payload);
    }
    resetForm();
    await loadRules();
  };

  const editRule = (rule) => {
    setEditingRule(rule);
    setForm({
      name: rule.name || "",
      active: !!rule.active,
      trigger: rule.trigger || "client_created",
      conditions: JSON.stringify(rule.conditions || {}, null, 2),
      actions: Array.isArray(rule.actions) ? rule.actions : []
    });
  };

  const deleteRule = async (rule) => {
    const ok = confirm(`למחוק את הכלל "${rule.name}"?`);
    if (!ok) return;
    await AutomationRule.delete(rule.id);
    await loadRules();
    if (editingRule?.id === rule.id) resetForm();
  };

  const addActionToForm = () => {
    setForm((prev) => ({ ...prev, actions: [...prev.actions, JSON.parse(JSON.stringify(newAction))] }));
    setNewAction({ type: "create_task", params: {} });
  };

  const updateActionParam = (idx, key, value) => {
    setForm((prev) => {
      const next = [...prev.actions];
      next[idx] = { ...next[idx], params: { ...(next[idx]?.params || {}), [key]: value } };
      return { ...prev, actions: next };
    });
  };

  const removeAction = (idx) => {
    setForm((prev) => {
      const next = prev.actions.slice();
      next.splice(idx, 1);
      return { ...prev, actions: next };
    });
  };

  const runTest = async () => {
    try {
      const payload = testPayload ? JSON.parse(testPayload) : {};
      const { data } = await automationEngine({ event: testEvent, payload });
      setTestResult(data);
    } catch (e) {
      setTestResult({ error: String(e?.message || e) });
    }
  };

  return (
    <div className="p-6 lg:p-8 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen pl-24 lg:pl-12" dir="rtl">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Bot className="w-6 h-6 text-purple-600" />
            <h1 className="text-2xl font-bold text-slate-900">אוטומציות</h1>
          </div>
          <Button variant="outline" onClick={resetForm} className="gap-2">
            <Plus className="w-4 h-4" /> כלל חדש
          </Button>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Editor */}
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>{editingRule ? "עריכת כלל" : "כלל חדש"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm text-slate-700">שם הכלל</label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-slate-700">פעיל</label>
                  <div className="h-10 flex items-center px-2 rounded-md border bg-white">
                    <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm text-slate-700">טריגר</label>
                  <Select value={form.trigger} onValueChange={(v) => setForm({ ...form, trigger: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="בחר טריגר" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="client_created">לקוח חדש</SelectItem>
                      <SelectItem value="project_status_changed">שינוי סטטוס פרויקט</SelectItem>
                      <SelectItem value="task_status_changed">שינוי סטטוס משימה</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-slate-700 flex items-center gap-2">
                    <Filter className="w-4 h-4" /> תנאים (JSON)
                  </label>
                  <Textarea
                    rows={4}
                    value={form.conditions}
                    onChange={(e) => setForm({ ...form, conditions: e.target.value })}
                    placeholder='{"status":"הושלמה"}'
                  />
                </div>
              </div>

              <Separator />

              {/* Actions */}
              <div className="space-y-3">
                <div className="text-sm font-semibold text-slate-700">פעולות</div>

                {form.actions.length === 0 ? (
                  <div className="text-slate-500 text-sm">אין פעולות עדיין</div>
                ) : (
                  <div className="space-y-3">
                    {form.actions.map((a, idx) => (
                      <div key={idx} className="p-3 rounded-lg border bg-slate-50">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-medium">{a.type}</div>
                          <Button variant="ghost" size="icon" onClick={() => removeAction(idx)} className="text-red-600">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        {/* Params per action */}
                        {a.type === "create_task" && (
                          <div className="grid md:grid-cols-2 gap-3 mt-2">
                            <Input placeholder="כותרת" value={a.params?.title || ""} onChange={(e) => updateActionParam(idx, "title", e.target.value)} />
                            <Input placeholder="תיאור" value={a.params?.description || ""} onChange={(e) => updateActionParam(idx, "description", e.target.value)} />
                            <Input placeholder="סטטוס (למשל: חדשה)" value={a.params?.status || ""} onChange={(e) => updateActionParam(idx, "status", e.target.value)} />
                            <Input placeholder="עדיפות (גבוהה/בינונית/נמוכה)" value={a.params?.priority || ""} onChange={(e) => updateActionParam(idx, "priority", e.target.value)} />
                          </div>
                        )}
                        {a.type === "send_email" && (
                          <div className="grid gap-3 mt-2">
                            <Input placeholder='נמען (לדוגמה: {{email}})' value={a.params?.to || ""} onChange={(e) => updateActionParam(idx, "to", e.target.value)} />
                            <Input placeholder="נושא" value={a.params?.subject || ""} onChange={(e) => updateActionParam(idx, "subject", e.target.value)} />
                            <Textarea placeholder="תוכן" value={a.params?.body || ""} onChange={(e) => updateActionParam(idx, "body", e.target.value)} rows={3} />
                          </div>
                        )}
                        {a.type === "update_tasks_status" && (
                          <div className="grid md:grid-cols-2 gap-3 mt-2">
                            <Input placeholder="שם פרויקט (אופציונלי)" value={a.params?.project_name || ""} onChange={(e) => updateActionParam(idx, "project_name", e.target.value)} />
                            <Input placeholder="שם לקוח (אופציונלי)" value={a.params?.client_name || ""} onChange={(e) => updateActionParam(idx, "client_name", e.target.value)} />
                            <Input placeholder="מסטטוס (אופציונלי)" value={a.params?.from_status || ""} onChange={(e) => updateActionParam(idx, "from_status", e.target.value)} />
                            <Input placeholder="לסטטוס (ברירת מחדל: הושלמה)" value={a.params?.to_status || ""} onChange={(e) => updateActionParam(idx, "to_status", e.target.value)} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Add new action */}
                <div className="p-3 rounded-lg border bg-white">
                  <div className="grid md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm text-slate-700">סוג פעולה</label>
                      <Select value={newAction.type} onValueChange={(v) => setNewAction({ type: v, params: {} })}>
                        <SelectTrigger>
                          <SelectValue placeholder="בחר פעולה" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="create_task">יצירת משימה</SelectItem>
                          <SelectItem value="send_email">שליחת מייל</SelectItem>
                          <SelectItem value="update_tasks_status">עדכון סטטוס משימות</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end">
                      <Button onClick={addActionToForm} className="w-full gap-2">
                        <Plus className="w-4 h-4" /> הוסף פעולה
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                {editingRule && (
                  <Button variant="outline" onClick={() => resetForm()}>
                    ביטול
                  </Button>
                )}
                <Button onClick={saveRule} className="gap-2">
                  <Save className="w-4 h-4" /> שמור כלל
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Rules list + tester */}
          <div className="space-y-6">
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>החוקים שלי</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3">
                    {Array(4).fill(0).map((_, i) => (
                      <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />
                    ))}
                  </div>
                ) : rules.length === 0 ? (
                  <div className="text-center text-slate-500 py-8">אין חוקים עדיין</div>
                ) : (
                  <div className="space-y-3">
                    {rules.map(rule => (
                      <div key={rule.id} className="p-3 rounded-xl border bg-white flex items-center justify-between">
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 truncate">{rule.name}</div>
                          <div className="text-xs text-slate-500">טריגר: {rule.trigger} • פעיל: {rule.active ? "כן" : "לא"}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="icon" onClick={() => editRule(rule)}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-red-600" onClick={() => deleteRule(rule)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>בדיקת כלל (Run Test)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm text-slate-700">אירוע</label>
                    <Select value={testEvent} onValueChange={setTestEvent}>
                      <SelectTrigger>
                        <SelectValue placeholder="בחר אירוע" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="client_created">client_created</SelectItem>
                        <SelectItem value="project_status_changed">project_status_changed</SelectItem>
                        <SelectItem value="task_status_changed">task_status_changed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm text-slate-700">Payload (JSON)</label>
                    <Textarea rows={4} value={testPayload} onChange={(e) => setTestPayload(e.target.value)} />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button onClick={runTest} className="gap-2">
                    <Play className="w-4 h-4" /> הרץ בדיקה
                  </Button>
                </div>
                {testResult && (
                  <div className="mt-3 p-3 rounded-lg bg-slate-50 border text-xs whitespace-pre-wrap break-words">
                    {typeof testResult === "object" ? JSON.stringify(testResult, null, 2) : String(testResult)}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
