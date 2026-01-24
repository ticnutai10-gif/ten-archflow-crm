import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Brain, TrendingUp, AlertTriangle, Users, Clock, DollarSign,
  BarChart3, Target, Lightbulb, RefreshCw, ChevronDown, ChevronUp,
  Calendar, CheckCircle2, XCircle, ArrowUp, ArrowDown, Minus,
  FileText, Zap, Shield, Activity
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { format, differenceInDays, addDays, subDays } from 'date-fns';
import { he } from 'date-fns/locale';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Area, AreaChart
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function AIProjectAnalytics() {
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [projects, setProjects] = useState([]);
  const [subtasks, setSubtasks] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [timeLogs, setTimeLogs] = useState([]);
  const [predictions, setPredictions] = useState(null);
  const [riskAnalysis, setRiskAnalysis] = useState(null);
  const [teamAnalysis, setTeamAnalysis] = useState(null);
  const [selectedProject, setSelectedProject] = useState('all');
  const [expandedSections, setExpandedSections] = useState({
    predictions: true,
    risks: true,
    team: true
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [projectsData, subtasksData, teamData, timeLogsData] = await Promise.all([
        base44.entities.Project.list('-created_date'),
        base44.entities.SubTask.list(),
        base44.entities.TeamMember.filter({ active: true }),
        base44.entities.TimeLog.list('-log_date', 500)
      ]);

      setProjects(projectsData || []);
      setSubtasks(subtasksData || []);
      setTeamMembers(teamData || []);
      setTimeLogs(timeLogsData || []);

      // Auto-analyze on load
      await runAnalysis(projectsData, subtasksData, teamData, timeLogsData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('שגיאה בטעינת הנתונים');
    }
    setLoading(false);
  };

  const runAnalysis = async (projectsData, subtasksData, teamData, timeLogsData) => {
    setAnalyzing(true);
    
    const prj = projectsData || projects;
    const sub = subtasksData || subtasks;
    const team = teamData || teamMembers;
    const logs = timeLogsData || timeLogs;

    try {
      // Calculate predictions locally first
      const localPredictions = calculatePredictions(prj, sub, logs);
      setPredictions(localPredictions);

      // Calculate risk analysis
      const localRisks = calculateRiskAnalysis(prj, sub, logs);
      setRiskAnalysis(localRisks);

      // Calculate team analysis
      const localTeam = calculateTeamAnalysis(prj, sub, team, logs);
      setTeamAnalysis(localTeam);

      // Get AI-powered insights
      await getAIInsights(prj, sub, team, logs, localPredictions, localRisks);

    } catch (error) {
      console.error('Error in analysis:', error);
    }
    setAnalyzing(false);
  };

  const calculatePredictions = (prj, sub, logs) => {
    const activeProjects = prj.filter(p => p.status !== 'הושלם' && p.status !== 'מבוטל');
    const completedProjects = prj.filter(p => p.status === 'הושלם');

    // Calculate average completion metrics from historical data
    const historicalMetrics = completedProjects.map(p => {
      const projectTasks = sub.filter(s => s.project_id === p.id);
      const plannedDays = p.start_date && p.end_date 
        ? differenceInDays(new Date(p.end_date), new Date(p.start_date))
        : null;
      const actualDays = p.start_date && p.updated_date
        ? differenceInDays(new Date(p.updated_date), new Date(p.start_date))
        : plannedDays;
      
      const estimatedHours = projectTasks.reduce((sum, t) => sum + (t.estimated_hours || 0), 0);
      const actualHours = projectTasks.reduce((sum, t) => sum + (t.actual_hours || 0), 0);

      return {
        type: p.type,
        plannedDays,
        actualDays,
        overrunDays: actualDays && plannedDays ? actualDays - plannedDays : 0,
        estimatedHours,
        actualHours,
        hoursOverrun: actualHours - estimatedHours,
        budget: p.budget,
        actualExpenses: p.total_expenses || 0
      };
    }).filter(m => m.plannedDays !== null);

    // Calculate averages by project type
    const avgByType = {};
    historicalMetrics.forEach(m => {
      if (!avgByType[m.type]) {
        avgByType[m.type] = { count: 0, totalOverrun: 0, totalHoursOverrun: 0, budgetOverrunPercent: 0 };
      }
      avgByType[m.type].count++;
      avgByType[m.type].totalOverrun += m.overrunDays;
      avgByType[m.type].totalHoursOverrun += m.hoursOverrun;
      if (m.budget > 0) {
        avgByType[m.type].budgetOverrunPercent += ((m.actualExpenses - m.budget) / m.budget) * 100;
      }
    });

    Object.keys(avgByType).forEach(type => {
      avgByType[type].avgOverrunDays = avgByType[type].totalOverrun / avgByType[type].count;
      avgByType[type].avgHoursOverrun = avgByType[type].totalHoursOverrun / avgByType[type].count;
      avgByType[type].avgBudgetOverrun = avgByType[type].budgetOverrunPercent / avgByType[type].count;
    });

    // Generate predictions for active projects
    const projectPredictions = activeProjects.map(p => {
      const typeAvg = avgByType[p.type] || { avgOverrunDays: 7, avgHoursOverrun: 10, avgBudgetOverrun: 5 };
      const projectTasks = sub.filter(s => s.project_id === p.id);
      const completedTasks = projectTasks.filter(t => t.status === 'הושלם');
      const progress = projectTasks.length > 0 
        ? (completedTasks.length / projectTasks.length) * 100 
        : p.progress || 0;

      // Calculate velocity (tasks completed per week)
      const recentCompletions = completedTasks.filter(t => 
        t.updated_date && differenceInDays(new Date(), new Date(t.updated_date)) <= 30
      );
      const weeklyVelocity = recentCompletions.length / 4;

      // Predict completion date
      const remainingTasks = projectTasks.length - completedTasks.length;
      const estimatedWeeksRemaining = weeklyVelocity > 0 ? remainingTasks / weeklyVelocity : 8;
      const predictedEndDate = addDays(new Date(), estimatedWeeksRemaining * 7);
      
      const plannedEndDate = p.end_date ? new Date(p.end_date) : addDays(new Date(), 90);
      const daysVariance = differenceInDays(predictedEndDate, plannedEndDate);

      // Budget prediction
      const currentExpenses = p.total_expenses || 0;
      const budgetUtilization = p.budget > 0 ? (currentExpenses / p.budget) * 100 : 0;
      const projectedExpenses = progress > 0 
        ? (currentExpenses / progress) * 100 
        : currentExpenses * 2;
      const budgetVariance = p.budget > 0 
        ? ((projectedExpenses - p.budget) / p.budget) * 100 
        : 0;

      // Confidence score
      const confidenceScore = Math.min(100, 
        50 + 
        (completedProjects.filter(cp => cp.type === p.type).length * 5) + 
        (progress / 10) +
        (weeklyVelocity > 0 ? 20 : 0)
      );

      return {
        id: p.id,
        name: p.name,
        type: p.type,
        currentProgress: Math.round(progress),
        plannedEndDate: p.end_date,
        predictedEndDate: format(predictedEndDate, 'yyyy-MM-dd'),
        daysVariance,
        isDelayed: daysVariance > 0,
        budget: p.budget,
        currentExpenses,
        projectedExpenses: Math.round(projectedExpenses),
        budgetVariance: Math.round(budgetVariance),
        isBudgetRisk: budgetVariance > 10,
        weeklyVelocity: Math.round(weeklyVelocity * 10) / 10,
        remainingTasks,
        confidenceScore: Math.round(confidenceScore)
      };
    });

    return {
      projectPredictions,
      historicalAverage: {
        avgDaysOverrun: Math.round(historicalMetrics.reduce((sum, m) => sum + m.overrunDays, 0) / (historicalMetrics.length || 1)),
        avgBudgetOverrun: Math.round(historicalMetrics.reduce((sum, m) => sum + (m.budget > 0 ? ((m.actualExpenses - m.budget) / m.budget) * 100 : 0), 0) / (historicalMetrics.length || 1)),
        completedCount: completedProjects.length
      },
      summary: {
        totalActive: activeProjects.length,
        atRisk: projectPredictions.filter(p => p.isDelayed || p.isBudgetRisk).length,
        onTrack: projectPredictions.filter(p => !p.isDelayed && !p.isBudgetRisk).length
      }
    };
  };

  const calculateRiskAnalysis = (prj, sub, logs) => {
    const activeProjects = prj.filter(p => p.status !== 'הושלם' && p.status !== 'מבוטל');

    const projectRisks = activeProjects.map(p => {
      const projectTasks = sub.filter(s => s.project_id === p.id);
      const risks = [];
      let riskScore = 0;

      // Check for overdue tasks
      const overdueTasks = projectTasks.filter(t => 
        t.status !== 'הושלם' && t.due_date && new Date(t.due_date) < new Date()
      );
      if (overdueTasks.length > 0) {
        risks.push({
          type: 'overdue_tasks',
          severity: overdueTasks.length > 3 ? 'high' : 'medium',
          description: `${overdueTasks.length} משימות באיחור`,
          mitigation: 'עדכן את תאריכי היעד או הקצה משאבים נוספים'
        });
        riskScore += overdueTasks.length * 10;
      }

      // Check for blocked tasks
      const blockedTasks = projectTasks.filter(t => t.status === 'חסום');
      if (blockedTasks.length > 0) {
        risks.push({
          type: 'blocked_tasks',
          severity: blockedTasks.length > 2 ? 'high' : 'medium',
          description: `${blockedTasks.length} משימות חסומות`,
          mitigation: 'זהה את החסמים וטפל בהם בדחיפות'
        });
        riskScore += blockedTasks.length * 15;
      }

      // Check budget utilization
      if (p.budget > 0) {
        const utilization = ((p.total_expenses || 0) / p.budget) * 100;
        const progress = p.progress || 0;
        
        if (utilization > progress + 20) {
          risks.push({
            type: 'budget_overrun',
            severity: utilization > progress + 40 ? 'high' : 'medium',
            description: `ניצול תקציב (${Math.round(utilization)}%) גבוה מההתקדמות (${progress}%)`,
            mitigation: 'בחן את הוצאות הפרויקט וחפש דרכים לחסוך'
          });
          riskScore += (utilization - progress) / 2;
        }
      }

      // Check timeline
      if (p.end_date) {
        const daysRemaining = differenceInDays(new Date(p.end_date), new Date());
        const incompleteTasks = projectTasks.filter(t => t.status !== 'הושלם').length;
        
        if (daysRemaining < 14 && incompleteTasks > 5) {
          risks.push({
            type: 'timeline_risk',
            severity: daysRemaining < 7 ? 'high' : 'medium',
            description: `${daysRemaining} ימים לסיום עם ${incompleteTasks} משימות פתוחות`,
            mitigation: 'תעדף משימות קריטיות והקצה משאבים נוספים'
          });
          riskScore += (15 - Math.max(0, daysRemaining)) * 3;
        }
      }

      // Check for stalled progress
      const recentActivity = projectTasks.filter(t => 
        t.updated_date && differenceInDays(new Date(), new Date(t.updated_date)) <= 7
      );
      if (projectTasks.length > 0 && recentActivity.length === 0) {
        risks.push({
          type: 'stalled',
          severity: 'medium',
          description: 'אין פעילות בשבוע האחרון',
          mitigation: 'בדוק מה מעכב את ההתקדמות ושקול פגישת סנכרון'
        });
        riskScore += 20;
      }

      // No assigned tasks
      const unassignedTasks = projectTasks.filter(t => 
        t.status !== 'הושלם' && (!t.assigned_to || t.assigned_to.length === 0)
      );
      if (unassignedTasks.length > projectTasks.length / 3) {
        risks.push({
          type: 'unassigned',
          severity: 'low',
          description: `${unassignedTasks.length} משימות ללא שיוך`,
          mitigation: 'הקצה אחראים לכל המשימות הפתוחות'
        });
        riskScore += unassignedTasks.length * 3;
      }

      return {
        id: p.id,
        name: p.name,
        riskScore: Math.min(100, riskScore),
        riskLevel: riskScore >= 50 ? 'high' : riskScore >= 25 ? 'medium' : 'low',
        risks,
        metrics: {
          overdueTasks: overdueTasks.length,
          blockedTasks: blockedTasks.length,
          unassignedTasks: unassignedTasks.length,
          totalTasks: projectTasks.length
        }
      };
    });

    // Sort by risk score
    projectRisks.sort((a, b) => b.riskScore - a.riskScore);

    return {
      projectRisks,
      summary: {
        highRisk: projectRisks.filter(p => p.riskLevel === 'high').length,
        mediumRisk: projectRisks.filter(p => p.riskLevel === 'medium').length,
        lowRisk: projectRisks.filter(p => p.riskLevel === 'low').length
      },
      topRisks: projectRisks.slice(0, 5)
    };
  };

  const calculateTeamAnalysis = (prj, sub, team, logs) => {
    const teamMetrics = team.map(member => {
      const assignedTasks = sub.filter(t => 
        t.assigned_to?.includes(member.email) || t.assigned_to?.includes(member.full_name)
      );
      const completedTasks = assignedTasks.filter(t => t.status === 'הושלם');
      const inProgressTasks = assignedTasks.filter(t => t.status === 'בתהליך');
      const overdueTasks = assignedTasks.filter(t => 
        t.status !== 'הושלם' && t.due_date && new Date(t.due_date) < new Date()
      );

      // Calculate hours from time logs
      const memberLogs = logs.filter(l => 
        l.created_by === member.email || l.user_name === member.full_name
      );
      const totalHoursLogged = memberLogs.reduce((sum, l) => 
        sum + ((l.duration_seconds || 0) / 3600), 0
      );

      // Calculate estimated vs actual
      const estimatedHours = assignedTasks.reduce((sum, t) => sum + (t.estimated_hours || 0), 0);
      const actualHours = assignedTasks.reduce((sum, t) => sum + (t.actual_hours || 0), 0);

      // Workload score (0-100)
      const capacityPerWeek = member.capacity_hours_per_week || 40;
      const currentWorkload = inProgressTasks.length * 8; // Estimate 8 hours per active task
      const workloadPercent = Math.min(100, (currentWorkload / capacityPerWeek) * 100);

      // Efficiency score
      const completionRate = assignedTasks.length > 0 
        ? (completedTasks.length / assignedTasks.length) * 100 
        : 0;
      const onTimeRate = completedTasks.length > 0
        ? ((completedTasks.length - overdueTasks.length) / completedTasks.length) * 100
        : 100;
      const efficiencyScore = (completionRate + onTimeRate) / 2;

      return {
        id: member.id,
        name: member.full_name,
        email: member.email,
        role: member.role,
        assignedTasks: assignedTasks.length,
        completedTasks: completedTasks.length,
        inProgressTasks: inProgressTasks.length,
        overdueTasks: overdueTasks.length,
        totalHoursLogged: Math.round(totalHoursLogged),
        estimatedHours,
        actualHours,
        workloadPercent: Math.round(workloadPercent),
        efficiencyScore: Math.round(efficiencyScore),
        isOverloaded: workloadPercent > 90,
        isUnderutilized: workloadPercent < 30 && assignedTasks.length > 0
      };
    });

    // Resource allocation by project
    const projectAllocation = prj.filter(p => p.status !== 'הושלם').map(p => {
      const projectTasks = sub.filter(s => s.project_id === p.id);
      const uniqueAssignees = new Set();
      projectTasks.forEach(t => {
        (t.assigned_to || []).forEach(a => uniqueAssignees.add(a));
      });

      return {
        id: p.id,
        name: p.name,
        teamSize: uniqueAssignees.size,
        totalTasks: projectTasks.length,
        activeTasks: projectTasks.filter(t => t.status === 'בתהליך').length
      };
    });

    return {
      teamMetrics,
      projectAllocation,
      summary: {
        totalMembers: team.length,
        overloaded: teamMetrics.filter(m => m.isOverloaded).length,
        underutilized: teamMetrics.filter(m => m.isUnderutilized).length,
        avgEfficiency: Math.round(
          teamMetrics.reduce((sum, m) => sum + m.efficiencyScore, 0) / (teamMetrics.length || 1)
        )
      },
      recommendations: generateTeamRecommendations(teamMetrics, projectAllocation)
    };
  };

  const generateTeamRecommendations = (teamMetrics, projectAllocation) => {
    const recommendations = [];

    const overloaded = teamMetrics.filter(m => m.isOverloaded);
    const underutilized = teamMetrics.filter(m => m.isUnderutilized);

    if (overloaded.length > 0 && underutilized.length > 0) {
      recommendations.push({
        type: 'rebalance',
        priority: 'high',
        title: 'איזון עומסים',
        description: `${overloaded.map(m => m.name).join(', ')} עמוסים מדי. שקול להעביר משימות ל${underutilized.map(m => m.name).join(', ')}`
      });
    }

    const lowEfficiency = teamMetrics.filter(m => m.efficiencyScore < 50 && m.assignedTasks > 3);
    if (lowEfficiency.length > 0) {
      recommendations.push({
        type: 'efficiency',
        priority: 'medium',
        title: 'שיפור יעילות',
        description: `בדוק את הסיבות לאיחורים אצל ${lowEfficiency.map(m => m.name).join(', ')}`
      });
    }

    const smallTeamProjects = projectAllocation.filter(p => p.teamSize < 2 && p.totalTasks > 10);
    if (smallTeamProjects.length > 0) {
      recommendations.push({
        type: 'staffing',
        priority: 'medium',
        title: 'הוספת כוח אדם',
        description: `הפרויקטים ${smallTeamProjects.map(p => p.name).join(', ')} דורשים יותר משאבים`
      });
    }

    return recommendations;
  };

  const getAIInsights = async (prj, sub, team, logs, predictions, risks) => {
    try {
      const summary = `
פרויקטים פעילים: ${predictions?.summary?.totalActive || 0}
פרויקטים בסיכון: ${predictions?.summary?.atRisk || 0}
פרויקטים בסיכון גבוה: ${risks?.summary?.highRisk || 0}
ממוצע ימי איחור היסטורי: ${predictions?.historicalAverage?.avgDaysOverrun || 0}
ממוצע חריגה תקציבית: ${predictions?.historicalAverage?.avgBudgetOverrun || 0}%
      `;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `אתה יועץ ניהול פרויקטים מומחה. נתח את הנתונים הבאים ותן 3 המלצות קצרות וממוקדות לשיפור:
${summary}

תן תשובה קצרה בעברית עם 3 נקודות עיקריות בלבד.`,
        add_context_from_internet: false
      });

      // Store AI insights for display
      if (predictions) {
        predictions.aiInsights = response;
      }
    } catch (error) {
      console.warn('Could not get AI insights:', error);
    }
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const getRiskColor = (level) => {
    switch (level) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-slate-600 bg-slate-50 border-slate-200';
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Brain className="w-12 h-12 text-purple-500 animate-pulse mx-auto mb-3" />
          <p className="text-slate-600">טוען נתונים לניתוח...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">ניתוח AI מתקדם</h2>
            <p className="text-sm text-slate-500">חיזויים, סיכונים וביצועי צוות</p>
          </div>
        </div>
        <Button 
          onClick={() => runAnalysis()} 
          disabled={analyzing}
          className="bg-purple-600 hover:bg-purple-700"
        >
          {analyzing ? (
            <><RefreshCw className="w-4 h-4 ml-2 animate-spin" />מנתח...</>
          ) : (
            <><RefreshCw className="w-4 h-4 ml-2" />עדכן ניתוח</>
          )}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Activity className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold text-blue-700">{predictions?.summary?.totalActive || 0}</p>
                <p className="text-xs text-blue-600">פרויקטים פעילים</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold text-green-700">{predictions?.summary?.onTrack || 0}</p>
                <p className="text-xs text-green-600">במסלול</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-amber-600" />
              <div>
                <p className="text-2xl font-bold text-amber-700">{riskAnalysis?.summary?.mediumRisk || 0}</p>
                <p className="text-xs text-amber-600">סיכון בינוני</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <XCircle className="w-8 h-8 text-red-600" />
              <div>
                <p className="text-2xl font-bold text-red-700">{riskAnalysis?.summary?.highRisk || 0}</p>
                <p className="text-xs text-red-600">סיכון גבוה</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Insights */}
      {predictions?.aiInsights && (
        <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-purple-700">
              <Lightbulb className="w-5 h-5" />
              תובנות AI
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{predictions.aiInsights}</p>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="predictions" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-white">
          <TabsTrigger value="predictions" className="gap-2">
            <TrendingUp className="w-4 h-4" />
            חיזויים
          </TabsTrigger>
          <TabsTrigger value="risks" className="gap-2">
            <Shield className="w-4 h-4" />
            סיכונים
          </TabsTrigger>
          <TabsTrigger value="team" className="gap-2">
            <Users className="w-4 h-4" />
            ביצועי צוות
          </TabsTrigger>
        </TabsList>

        {/* Predictions Tab */}
        <TabsContent value="predictions" className="mt-4 space-y-4">
          {predictions?.projectPredictions?.map(project => (
            <Card key={project.id} className="overflow-hidden">
              <CardHeader className="pb-2 bg-slate-50">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{project.name}</CardTitle>
                  <div className="flex gap-2">
                    {project.isDelayed && (
                      <Badge className="bg-red-100 text-red-700">איחור צפוי</Badge>
                    )}
                    {project.isBudgetRisk && (
                      <Badge className="bg-amber-100 text-amber-700">סיכון תקציבי</Badge>
                    )}
                    {!project.isDelayed && !project.isBudgetRisk && (
                      <Badge className="bg-green-100 text-green-700">במסלול</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500">התקדמות</p>
                    <div className="flex items-center gap-2">
                      <Progress value={project.currentProgress} className="flex-1" />
                      <span className="font-medium">{project.currentProgress}%</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-slate-500">סיום צפוי</p>
                    <p className="font-medium flex items-center gap-1">
                      {project.predictedEndDate}
                      {project.daysVariance > 0 ? (
                        <span className="text-red-600 text-xs">(+{project.daysVariance} ימים)</span>
                      ) : project.daysVariance < 0 ? (
                        <span className="text-green-600 text-xs">({project.daysVariance} ימים)</span>
                      ) : null}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">תקציב צפוי</p>
                    <p className="font-medium">
                      ₪{project.projectedExpenses?.toLocaleString()}
                      {project.budgetVariance !== 0 && (
                        <span className={project.budgetVariance > 0 ? 'text-red-600 text-xs' : 'text-green-600 text-xs'}>
                          ({project.budgetVariance > 0 ? '+' : ''}{project.budgetVariance}%)
                        </span>
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">מהירות (משימות/שבוע)</p>
                    <p className="font-medium">{project.weeklyVelocity}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                  <Target className="w-3 h-3" />
                  רמת ביטחון: {project.confidenceScore}%
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Risks Tab */}
        <TabsContent value="risks" className="mt-4 space-y-4">
          {riskAnalysis?.projectRisks?.filter(p => p.risks.length > 0).map(project => (
            <Card key={project.id} className={`border-2 ${getRiskColor(project.riskLevel)}`}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    {project.riskLevel === 'high' && <AlertTriangle className="w-5 h-5 text-red-500" />}
                    {project.riskLevel === 'medium' && <AlertTriangle className="w-5 h-5 text-amber-500" />}
                    {project.riskLevel === 'low' && <Shield className="w-5 h-5 text-green-500" />}
                    {project.name}
                  </CardTitle>
                  <Badge className={getRiskColor(project.riskLevel)}>
                    ציון סיכון: {project.riskScore}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {project.risks.map((risk, idx) => (
                    <div key={idx} className="p-3 bg-white rounded-lg border">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-slate-800">{risk.description}</p>
                          <p className="text-sm text-slate-500 mt-1">
                            <Lightbulb className="w-3 h-3 inline ml-1" />
                            {risk.mitigation}
                          </p>
                        </div>
                        <Badge variant="outline" className={
                          risk.severity === 'high' ? 'border-red-300 text-red-600' :
                          risk.severity === 'medium' ? 'border-amber-300 text-amber-600' :
                          'border-green-300 text-green-600'
                        }>
                          {risk.severity === 'high' ? 'גבוה' : risk.severity === 'medium' ? 'בינוני' : 'נמוך'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}

          {riskAnalysis?.projectRisks?.filter(p => p.risks.length > 0).length === 0 && (
            <Card className="text-center py-8">
              <CardContent>
                <Shield className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <p className="text-slate-600">כל הפרויקטים במצב תקין!</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="team" className="mt-4 space-y-4">
          {/* Team Recommendations */}
          {teamAnalysis?.recommendations?.length > 0 && (
            <Card className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2 text-amber-700">
                  <Lightbulb className="w-5 h-5" />
                  המלצות לשיפור
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {teamAnalysis.recommendations.map((rec, idx) => (
                    <div key={idx} className="p-3 bg-white rounded-lg border border-amber-200">
                      <p className="font-medium text-slate-800">{rec.title}</p>
                      <p className="text-sm text-slate-600">{rec.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Team Members */}
          <div className="grid md:grid-cols-2 gap-4">
            {teamAnalysis?.teamMetrics?.map(member => (
              <Card key={member.id} className={
                member.isOverloaded ? 'border-red-200 bg-red-50' :
                member.isUnderutilized ? 'border-amber-200 bg-amber-50' :
                'border-green-200 bg-green-50'
              }>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-slate-800">{member.name}</h4>
                      <p className="text-xs text-slate-500">{member.role}</p>
                    </div>
                    {member.isOverloaded && (
                      <Badge className="bg-red-100 text-red-700">עמוס</Badge>
                    )}
                    {member.isUnderutilized && (
                      <Badge className="bg-amber-100 text-amber-700">זמין</Badge>
                    )}
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">עומס עבודה</span>
                      <div className="flex items-center gap-2">
                        <Progress value={member.workloadPercent} className="w-20" />
                        <span>{member.workloadPercent}%</span>
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">יעילות</span>
                      <span className="font-medium">{member.efficiencyScore}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">משימות פעילות</span>
                      <span>{member.inProgressTasks}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">משימות באיחור</span>
                      <span className={member.overdueTasks > 0 ? 'text-red-600' : ''}>
                        {member.overdueTasks}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}