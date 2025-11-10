
import React, { useEffect, useState, useMemo } from "react";
import { Task, Project, TeamMember } from "@/entities/all";
import GanttChart from "@/components/planner/GanttChart";
import ResourcePlanner from "@/components/planner/ResourcePlanner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

export default function PlannerPage() {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [projectFilter, setProjectFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [t, p, tm] = await Promise.all([
          Task.list("-created_date"),
          Project.list("-created_date"),
          TeamMember.list()
        ]);
        setTasks(t);
        setProjects(p);
        setTeam(tm);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const reloadTasks = async () => {
    const t = await Task.list("-created_date");
    setTasks(t);
  };

  const projectOptions = useMemo(() => {
    return [{ id: "all", name: "כל הפרויקטים" }, ...projects.map(p => ({ id: String(p.id), name: p.name }))];
  }, [projects]);

  const filteredTasks = useMemo(() => {
    let arr = tasks;
    if (projectFilter !== "all") {
      const pr = projects.find(p => String(p.id) === String(projectFilter));
      const name = pr?.name || "";
      arr = arr.filter(t => t.project_name === name || String(t.project_id) === String(projectFilter));
    }
    if (search) {
      const q = search.toLowerCase();
      arr = arr.filter(t => (t.title || "").toLowerCase().includes(q) || (t.project_name || "").toLowerCase().includes(q));
    }
    return arr;
  }, [tasks, projects, projectFilter, search]);

  const handleDatesChange = async (taskId, startDate, endDate) => {
    const toDateStr = (d) => {
      try {
        const dt = d instanceof Date ? d : new Date(d);
        return dt.toISOString().split("T")[0];
      } catch {
        return null;
      }
    };
    const payload = {};
    const s = toDateStr(startDate);
    const e = toDateStr(endDate);
    if (s) payload.start_date = s;
    if (e) payload.end_date = e;
    if (Object.keys(payload).length > 0) {
      await Task.update(taskId, payload);
      await reloadTasks();
    }
  };

  const handleAssign = async (taskId, memberName) => {
    await Task.update(taskId, { assigned_to: memberName || "" });
    await reloadTasks();
  };

  return (
    <div className="p-6 lg:p-8 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen pl-24 lg:pl-12" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">תכנון</h1>
            <p className="text-slate-600">לוחות זמנים, עומסים והקצאות צוות</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            <div className="flex-1">
              <Input
                placeholder="חיפוש משימות/פרויקטים..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="text-right"
              />
            </div>
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="w-full sm:w-56 justify-between">
                <SelectValue placeholder="סינון לפי פרויקט" />
              </SelectTrigger>
              <SelectContent align="end">
                {projectOptions.map(op => (
                  <SelectItem key={op.id} value={String(op.id)}>{op.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle>כלי תכנון</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="gantt" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="gantt">תרשים גאנט</TabsTrigger>
                <TabsTrigger value="resources">ניהול משאבים</TabsTrigger>
              </TabsList>

              <TabsContent value="gantt" className="mt-4">
                {loading ? (
                  <div className="h-64 rounded-lg bg-slate-100 animate-pulse" />
                ) : (
                  <GanttChart
                    tasks={filteredTasks}
                    projectFilter={projectFilter}
                    onDatesChange={handleDatesChange}
                  />
                )}
              </TabsContent>

              <TabsContent value="resources" className="mt-4">
                {loading ? (
                  <div className="h-64 rounded-lg bg-slate-100 animate-pulse" />
                ) : (
                  <ResourcePlanner
                    team={team}
                    tasks={filteredTasks}
                    onAssign={handleAssign}
                  />
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
