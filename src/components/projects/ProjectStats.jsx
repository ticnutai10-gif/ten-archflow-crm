import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { FolderOpen, CheckCircle2, Clock } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function ProjectStats({ projects = [], isLoading = false }) {
  const [pendingApprovals, setPendingApprovals] = useState(0);

  useEffect(() => {
    console.log('📊 [ProjectStats] Received projects:', {
      projectsCount: projects?.length,
      projectsType: typeof projects,
      isArray: Array.isArray(projects),
      projects
    });

    if (projects && Array.isArray(projects)) {
      projects.forEach((project, index) => {
        if (!project) {
          console.error(`❌ [ProjectStats] Project at index ${index} is null/undefined!`);
        } else if (typeof project !== 'object') {
          console.error(`❌ [ProjectStats] Project at index ${index} is not an object:`, project);
        } else {
          console.log(`✅ [ProjectStats] Project ${index}:`, {
            id: project.id,
            status: project.status,
            progress: project.progress
          });
        }
      });
    }
  }, [projects]);

  const validProjects = useMemo(() => {
    return (projects || []).filter(p => p && typeof p === 'object');
  }, [projects]);

  const activeProjects = useMemo(() => {
    return validProjects.filter(p => {
      const status = p?.status;
      return status && status !== "הושלם" && status !== "מבוטל";
    });
  }, [validProjects]);

  const avgProgress = useMemo(() => {
    if (activeProjects.length === 0) return 0;
    
    const sum = activeProjects.reduce((acc, p) => {
      const progress = Number(p?.progress || 0);
      return acc + progress;
    }, 0);
    
    const avg = Math.round((sum / activeProjects.length) || 0);
    console.log('📊 [ProjectStats] Average progress:', avg, 'from', activeProjects.length, 'projects');
    return avg;
  }, [activeProjects]);

  const loadApprovals = useCallback(async () => {
    try {
      const approvals = await base44.entities.ClientApproval.list();
      const validApprovals = (approvals || []).filter(a => a && typeof a === 'object');
      const pending = validApprovals.filter(a => {
        const status = a?.status;
        return status && status !== "אושר" && status !== "נדחה";
      }).length;
      
      console.log('📊 [ProjectStats] Pending approvals:', pending);
      setPendingApprovals(pending);
    } catch (error) {
      console.error('❌ [ProjectStats] Error loading approvals:', error);
      setPendingApprovals(0);
    }
  }, []);

  useEffect(() => {
    loadApprovals();
  }, [loadApprovals]);

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