
import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export default function ResourcePlanner({ team = [], tasks = [], onAssign }) {
  const [selectedMember, setSelectedMember] = useState("all");

  const activeTeam = useMemo(() => team.filter(m => m?.active !== false), [team]);
  const openTasks = useMemo(() => tasks.filter(t => t.status !== "הושלמה"), [tasks]);

  const metrics = useMemo(() => {
    const map = {};
    activeTeam.forEach(m => { map[m.full_name] = { hours: 0, count: 0 }; });
    openTasks.forEach(t => {
      const assignee = t.assigned_to;
      const hrs = Number(t.estimated_hours || 0);
      if (assignee && map[assignee]) {
        map[assignee].hours += hrs;
        map[assignee].count += 1;
      }
    });
    return map;
  }, [activeTeam, openTasks]);

  const filteredTeam = selectedMember === "all" ? activeTeam : activeTeam.filter(m => m.full_name === selectedMember);
  const tasksForAssign = useMemo(() => {
    if (selectedMember === "all") return openTasks;
    return openTasks.filter(t => !t.assigned_to || t.assigned_to === selectedMember);
  }, [openTasks, selectedMember]);

  const colorForLoad = (pct) => pct < 60 ? "bg-green-100 text-green-700" : pct < 90 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700";

  return (
    <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
      <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <CardTitle className="text-right">ניהול משאבים (צוות)</CardTitle>
        <div className="flex items-center gap-2">
          <Select value={selectedMember} onValueChange={setSelectedMember}>
            <SelectTrigger className="w-48"><SelectValue placeholder="בחר איש צוות" /></SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="all">כל הצוות</SelectItem>
              {activeTeam.map(m => (
                <SelectItem key={m.id} value={m.full_name}>{m.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent dir="rtl" className="space-y-6">
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="text-right">שם</TableHead>
                <TableHead className="text-right">תפקיד</TableHead>
                <TableHead className="text-right">קיבולת (ש"ש)</TableHead>
                <TableHead className="text-right">עומס נוכחי</TableHead>
                <TableHead className="text-right">משימות פתוחות</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTeam.map(m => {
                const load = metrics[m.full_name] || { hours: 0, count: 0 };
                const capacity = Number(m.capacity_hours_per_week || 40);
                const pct = Math.min(100, Math.round((load.hours / (capacity || 1)) * 100));
                return (
                  <TableRow key={m.id} className="hover:bg-slate-50">
                    <TableCell className="font-semibold">{m.full_name}</TableCell>
                    <TableCell>{m.role || "-"}</TableCell>
                    <TableCell>{capacity}</TableCell>
                    <TableCell>
                      <Badge className={colorForLoad(pct)}>{load.hours} ש״ש ({pct}%)</Badge>
                    </TableCell>
                    <TableCell>{load.count}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <div className="border rounded-lg p-4">
          <div className="mb-3 font-semibold text-slate-800">הקצאת משימות</div>
          <div className="grid md:grid-cols-2 gap-3">
            {tasksForAssign.length === 0 ? (
              <div className="text-slate-500">אין משימות להקצות</div>
            ) : tasksForAssign.map(task => (
              <div key={task.id} className="flex items-center justify-between border rounded-lg p-3 bg-white">
                <div className="text-right">
                  <div className="font-medium">{task.title}</div>
                  <div className="text-xs text-slate-500">
                    {(task.project_name || "ללא פרויקט")} • {Number(task.estimated_hours || 0)} ש״ש
                  </div>
                </div>
                <div className="w-48">
                  <Select
                    value={task.assigned_to || "none"} // Changed from "" to "none" for unassigned tasks
                    onValueChange={(val) => onAssign && onAssign(task.id, val === "none" ? null : val)} // Convert "none" back to null for the handler
                  >
                    <SelectTrigger><SelectValue placeholder="הקצה" /></SelectTrigger>
                    <SelectContent align="end">
                      <SelectItem key="none" value="none">ללא</SelectItem> {/* Changed value from "" to "none" */}
                      {activeTeam.map(m => (
                        <SelectItem key={m.id} value={m.full_name}>{m.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
