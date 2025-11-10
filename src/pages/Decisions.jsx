
import React, { useEffect, useState, useCallback } from "react";
import { Decision, Project, Task } from "@/entities/all";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Save, Filter } from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";

export default function DecisionsPage() {
  const [decisions, setDecisions] = useState([]);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [filterProject, setFilterProject] = useState("all");
  const [form, setForm] = useState({
    project_name: "",
    task_id: "",
    task_title: "",
    title: "",
    description: "",
    decision_date: "",
    decided_by: ""
  });

  const load = useCallback(async () => {
    const [ds, ps, ts] = await Promise.all([
      Decision.list?.().catch(() => []),
      Project.list(),
      Task.list()
    ]);
    setDecisions(ds || []);
    setProjects(ps);
    setTasks(ts);
  }, []);

  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    if (!form.project_name || !form.title) return;
    const selectedTask = tasks.find(t => t.id === form.task_id);
    await Decision.create({
      project_name: form.project_name,
      task_id: form.task_id === "none" ? undefined : form.task_id, // Handle "none" value
      task_title: form.task_id === "none" ? undefined : (selectedTask?.title || form.task_title || undefined), // Handle "none" value
      title: form.title,
      description: form.description,
      decision_date: form.decision_date || format(new Date(), "yyyy-MM-dd"),
      decided_by: form.decided_by || undefined
    });
    setForm({ project_name: "", task_id: "", task_title: "", title: "", description: "", decision_date: "", decided_by: "" });
    load();
  };

  const displayed = decisions.filter(d => filterProject === "all" || d.project_name === filterProject);

  return (
    <div className="p-6 lg:p-8 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen pl-24 lg:pl-12" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">יומן החלטות</h1>
            <p className="text-slate-600">תיעוד החלטות לפי פרויקט/משימה</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={filterProject} onValueChange={setFilterProject}>
              <SelectTrigger className="w-48"><SelectValue placeholder="סינון לפי פרויקט" /></SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="all">כל הפרויקטים</SelectItem>
                {projects.map(p => (
                  <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>הוספת החלטה</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-slate-700">פרויקט</label>
                <Select value={form.project_name} onValueChange={(v) => setForm({ ...form, project_name: v })}>
                  <SelectTrigger><SelectValue placeholder="בחר פרויקט" /></SelectTrigger>
                  <SelectContent>
                    {projects.map(p => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm text-slate-700">משימה (לא חובה)</label>
                <Select value={form.task_id} onValueChange={(v) => setForm({ ...form, task_id: v })}>
                  <SelectTrigger><SelectValue placeholder="בחר משימה" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">ללא</SelectItem>
                    {tasks.filter(t => !form.project_name || t.project_name === form.project_name).map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-slate-700">כותרת</label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div>
                <label className="text-sm text-slate-700">תאריך החלטה</label>
                <Input type="date" value={form.decision_date} onChange={(e) => setForm({ ...form, decision_date: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="text-sm text-slate-700">פירוט</label>
              <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-slate-700">מי החליט</label>
                <Input value={form.decided_by} onChange={(e) => setForm({ ...form, decided_by: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={submit} className="bg-blue-600 hover:bg-blue-700">
                <Save className="w-4 h-4 ml-2" />
                שמור החלטה
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>רשימת החלטות</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="text-right">תאריך</TableHead>
                    <TableHead className="text-right">פרויקט</TableHead>
                    <TableHead className="text-right">משימה</TableHead>
                    <TableHead className="text-right">כותרת</TableHead>
                    <TableHead className="text-right">פירוט</TableHead>
                    <TableHead className="text-right">מי החליט</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayed.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-slate-500 py-6">אין החלטות להצגה</TableCell>
                    </TableRow>
                  ) : displayed.map(d => (
                    <TableRow key={d.id}>
                      <TableCell>{d.decision_date ? format(new Date(d.decision_date), "dd/MM/yy", { locale: he }) : "-"}</TableCell>
                      <TableCell>{d.project_name}</TableCell>
                      <TableCell>{d.task_title || "-"}</TableCell>
                      <TableCell>{d.title}</TableCell>
                      <TableCell className="max-w-[320px] truncate">{d.description || "-"}</TableCell>
                      <TableCell>{d.decided_by || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
