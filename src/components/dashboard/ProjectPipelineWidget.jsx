import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Briefcase, ChevronLeft, ChevronRight, TrendingUp,
  DollarSign, Clock, AlertTriangle, CheckCircle2, 
  FileText, HardHat, Ruler, Home, CircleDot, ArrowRight
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion, AnimatePresence } from "framer-motion";

// Pipeline stages with premium design
const PIPELINE_STAGES = [
  { 
    key: "הצעת מחיר", 
    label: "הצעת מחיר",
    icon: FileText,
    color: "#3b82f6",
    gradient: "from-blue-500 to-blue-600",
    bgLight: "bg-blue-50",
    borderColor: "border-blue-200",
    description: "הצעות ממתינות לאישור"
  },
  { 
    key: "תכנון", 
    label: "תכנון",
    icon: Ruler,
    color: "#8b5cf6",
    gradient: "from-purple-500 to-purple-600",
    bgLight: "bg-purple-50",
    borderColor: "border-purple-200",
    description: "בשלב תכנון אדריכלי"
  },
  { 
    key: "היתרים", 
    label: "היתרים",
    icon: FileText,
    color: "#f59e0b",
    gradient: "from-amber-500 to-amber-600",
    bgLight: "bg-amber-50",
    borderColor: "border-amber-200",
    description: "ממתינים להיתר בנייה"
  },
  { 
    key: "ביצוע", 
    label: "ביצוע",
    icon: HardHat,
    color: "#10b981",
    gradient: "from-emerald-500 to-emerald-600",
    bgLight: "bg-emerald-50",
    borderColor: "border-emerald-200",
    description: "פרויקטים בבנייה פעילה"
  },
  { 
    key: "הושלם", 
    label: "הושלם",
    icon: Home,
    color: "#6b7280",
    gradient: "from-slate-500 to-slate-600",
    bgLight: "bg-slate-50",
    borderColor: "border-slate-200",
    description: "פרויקטים שהסתיימו"
  }
];

function ProjectMiniCard({ project, stageColor }) {
  const progress = project.progress || 0;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="bg-white rounded-xl p-3 shadow-sm border border-slate-100 hover:shadow-md hover:border-slate-200 transition-all cursor-pointer group"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-slate-900 text-sm truncate group-hover:text-blue-600 transition-colors">
            {project.name}
          </h4>
          <p className="text-xs text-slate-500 truncate">{project.client_name || 'ללא לקוח'}</p>
        </div>
        {project.priority === 'גבוהה' && (
          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
        )}
      </div>
      
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
            <span>התקדמות</span>
            <span className="font-semibold" style={{ color: stageColor }}>{progress}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5">
            <div 
              className="h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${progress}%`, backgroundColor: stageColor }}
            />
          </div>
        </div>
      </div>

      {project.budget && (
        <div className="flex items-center gap-1 mt-2 text-[10px] text-slate-500">
          <DollarSign className="w-3 h-3" />
          <span>₪{project.budget.toLocaleString()}</span>
        </div>
      )}
    </motion.div>
  );
}

function PipelineStage({ stage, projects, isActive, onClick }) {
  const Icon = stage.icon;
  const count = projects.length;
  const totalBudget = projects.reduce((sum, p) => sum + (p.budget || 0), 0);
  
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`
        relative p-4 rounded-2xl cursor-pointer transition-all duration-300
        ${isActive 
          ? `bg-gradient-to-br ${stage.gradient} text-white shadow-lg shadow-${stage.color}/30` 
          : `${stage.bgLight} border ${stage.borderColor} hover:shadow-md`
        }
      `}
    >
      {/* Glow effect when active */}
      {isActive && (
        <div 
          className="absolute inset-0 rounded-2xl blur-xl opacity-30"
          style={{ backgroundColor: stage.color }}
        />
      )}
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <div className={`p-2 rounded-xl ${isActive ? 'bg-white/20' : 'bg-white'}`}>
            <Icon className={`w-5 h-5 ${isActive ? 'text-white' : ''}`} style={{ color: isActive ? undefined : stage.color }} />
          </div>
          <Badge 
            className={`
              font-bold text-sm px-2.5 py-0.5
              ${isActive 
                ? 'bg-white/20 text-white border-white/30' 
                : 'bg-white border'
              }
            `}
            style={{ borderColor: isActive ? undefined : stage.color, color: isActive ? undefined : stage.color }}
          >
            {count}
          </Badge>
        </div>
        
        <h3 className={`font-bold text-base mb-1 ${isActive ? 'text-white' : 'text-slate-900'}`}>
          {stage.label}
        </h3>
        
        <p className={`text-xs mb-3 ${isActive ? 'text-white/80' : 'text-slate-500'}`}>
          {stage.description}
        </p>
        
        {totalBudget > 0 && (
          <div className={`flex items-center gap-1 text-xs ${isActive ? 'text-white/90' : 'text-slate-600'}`}>
            <DollarSign className="w-3 h-3" />
            <span className="font-semibold">₪{(totalBudget / 1000000).toFixed(1)}M</span>
          </div>
        )}
      </div>
      
      {/* Arrow indicator */}
      {isActive && (
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
          <div 
            className="w-4 h-4 rotate-45"
            style={{ backgroundColor: stage.color }}
          />
        </div>
      )}
    </motion.div>
  );
}

export default function ProjectPipelineWidget() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeStage, setActiveStage] = useState(null);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.Project.list('-created_date', 200);
      setProjects(data || []);
      
      // Set initial active stage to the one with most projects
      const stageWithMost = PIPELINE_STAGES.reduce((max, stage) => {
        const count = (data || []).filter(p => p.status === stage.key).length;
        return count > max.count ? { key: stage.key, count } : max;
      }, { key: PIPELINE_STAGES[0].key, count: 0 });
      
      setActiveStage(stageWithMost.key);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
    setLoading(false);
  };

  // Group projects by stage
  const projectsByStage = useMemo(() => {
    const grouped = {};
    PIPELINE_STAGES.forEach(stage => {
      grouped[stage.key] = projects.filter(p => p.status === stage.key);
    });
    return grouped;
  }, [projects]);

  // Stats
  const stats = useMemo(() => {
    const activeProjects = projects.filter(p => p.status !== 'הושלם' && p.status !== 'מבוטל');
    const totalBudget = activeProjects.reduce((sum, p) => sum + (p.budget || 0), 0);
    const avgProgress = activeProjects.length > 0 
      ? Math.round(activeProjects.reduce((sum, p) => sum + (p.progress || 0), 0) / activeProjects.length)
      : 0;
    return { active: activeProjects.length, totalBudget, avgProgress };
  }, [projects]);

  const activeStageData = PIPELINE_STAGES.find(s => s.key === activeStage);
  const activeProjects = projectsByStage[activeStage] || [];

  if (loading) {
    return (
      <Card className="bg-white shadow-lg border-0">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-slate-200 rounded w-1/3"></div>
            <div className="grid grid-cols-5 gap-3">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="h-32 bg-slate-200 rounded-2xl"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white shadow-lg border-0 overflow-hidden">
      {/* Premium Header */}
      <CardHeader className="border-b bg-gradient-to-l from-slate-50 via-white to-blue-50/30 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg shadow-blue-500/20">
              <Briefcase className="w-6 h-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-slate-900">פייפליין פרויקטים</CardTitle>
              <p className="text-xs text-slate-500">מעקב התקדמות בשלבי הפרויקט</p>
            </div>
          </div>
          
          {/* Quick Stats */}
          <div className="flex items-center gap-4">
            <div className="text-left">
              <div className="text-xs text-slate-500">פרויקטים פעילים</div>
              <div className="text-xl font-bold text-slate-900">{stats.active}</div>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div className="text-left">
              <div className="text-xs text-slate-500">תקציב כולל</div>
              <div className="text-xl font-bold text-emerald-600">₪{(stats.totalBudget / 1000000).toFixed(1)}M</div>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div className="text-left">
              <div className="text-xs text-slate-500">התקדמות ממוצעת</div>
              <div className="text-xl font-bold text-blue-600">{stats.avgProgress}%</div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        {/* Pipeline Stages */}
        <div className="grid grid-cols-5 gap-3 mb-6">
          {PIPELINE_STAGES.map((stage, idx) => (
            <React.Fragment key={stage.key}>
              <PipelineStage
                stage={stage}
                projects={projectsByStage[stage.key]}
                isActive={activeStage === stage.key}
                onClick={() => setActiveStage(stage.key)}
              />
            </React.Fragment>
          ))}
        </div>

        {/* Connection Line */}
        <div className="relative h-1 mb-6 mx-8">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-200 via-purple-200 via-amber-200 via-emerald-200 to-slate-200 rounded-full" />
          {PIPELINE_STAGES.map((stage, idx) => {
            const count = projectsByStage[stage.key].length;
            const position = (idx / (PIPELINE_STAGES.length - 1)) * 100;
            return (
              <div 
                key={stage.key}
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-white shadow-sm transition-all duration-300"
                style={{ 
                  left: `${position}%`, 
                  backgroundColor: stage.color,
                  transform: `translate(-50%, -50%) scale(${activeStage === stage.key ? 1.3 : 1})`
                }}
              />
            );
          })}
        </div>

        {/* Active Stage Projects */}
        <AnimatePresence mode="wait">
          {activeStageData && (
            <motion.div
              key={activeStage}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <activeStageData.icon className="w-5 h-5" style={{ color: activeStageData.color }} />
                  <h3 className="font-bold text-slate-900">{activeStageData.label}</h3>
                  <Badge 
                    className="mr-2"
                    style={{ backgroundColor: `${activeStageData.color}20`, color: activeStageData.color }}
                  >
                    {activeProjects.length} פרויקטים
                  </Badge>
                </div>
                <Link to={createPageUrl('Projects') + `?status=${encodeURIComponent(activeStage)}`}>
                  <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 gap-1">
                    צפה בכולם
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                </Link>
              </div>

              {activeProjects.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {activeProjects.slice(0, 6).map(project => (
                    <Link key={project.id} to={createPageUrl('ProjectDetails') + `?id=${project.id}`}>
                      <ProjectMiniCard project={project} stageColor={activeStageData.color} />
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <CircleDot className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p>אין פרויקטים בשלב זה</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* View All Button */}
        <div className="mt-6 pt-4 border-t">
          <Link to={createPageUrl('Projects')}>
            <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg shadow-blue-500/20 gap-2">
              <Briefcase className="w-4 h-4" />
              צפה בכל הפרויקטים
              <ArrowRight className="w-4 h-4 mr-auto" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}