import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { FolderOpen, CheckCircle2, Clock } from "lucide-react";
import { ClientApproval } from "@/entities/ClientApproval";

export default function ProjectStats({ projects = [], isLoading = false }) {
  const [pendingApprovals, setPendingApprovals] = useState(0);

  const activeProjects = useMemo(
    () => projects.filter(p => p.status !== "הושלם" && p.status !== "מבוטל"),
    [projects]
  );

  const avgProgress = useMemo(() => {
    if (activeProjects.length === 0) return 0;
    const sum = activeProjects.reduce((acc, p) => acc + (Number(p.progress || 0)), 0);
    return Math.round((sum / activeProjects.length) || 0);
  }, [activeProjects]);

  useEffect(() => {
    const loadApprovals = async () => {
      try {
        const approvals = await ClientApproval.list();
        const pending = (approvals || []).filter(a => a.status !== "אושר" && a.status !== "נדחה").length;
        setPendingApprovals(pending);
      } catch {
        setPendingApprovals(0);
      }
    };
    loadApprovals();
  }, []);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        {Array(3).fill(0).map((_, i) => (
          <div key={i} className="h-12 rounded-full bg-slate-200 animate-pulse" />
        ))}
      </div>
    );
  }

  const Chip = ({ icon: Icon, colorClasses, children }) => (
    <div className={`flex items-center gap-2 rounded-full px-3 py-2 text-sm ${colorClasses} border`}>
      <Icon className="w-4 h-4" />
      <span className="font-medium">{children}</span>
    </div>
  );

  return (
    <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm mb-6">
      <CardContent className="p-4">
        <div className="flex flex-wrap gap-3" dir="rtl">
          <Chip icon={FolderOpen} colorClasses="bg-blue-50 text-blue-700 border-blue-200">
            {activeProjects.length} פרויקטים
          </Chip>
          <Chip icon={CheckCircle2} colorClasses="bg-emerald-50 text-emerald-700 border-emerald-200">
            {avgProgress}% התקדמות ממוצעת
          </Chip>
          <Chip icon={Clock} colorClasses="bg-amber-50 text-amber-700 border-amber-200">
            {pendingApprovals} אישורים בהמתנה
          </Chip>
        </div>
      </CardContent>
    </Card>
  );
}