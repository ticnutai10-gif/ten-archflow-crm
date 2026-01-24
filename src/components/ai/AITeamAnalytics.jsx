import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Users, Brain, TrendingUp, AlertTriangle, Clock, BarChart3,
  Lightbulb, RefreshCw, ArrowRight, CheckCircle2, XCircle,
  User, Briefcase, Calendar, Target, Zap, Activity
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { differenceInDays, format, subDays } from 'date-fns';
import { he } from 'date-fns/locale';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function AITeamAnalytics({ onClose }) {
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [subtasks, setSubtasks] = useState([]);
  const [timeLogs, setTimeLogs] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [aiRecommendations, setAiRecommendations] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [team, prj, tasks, logs] = await Promise.all([
        base44.entities.TeamMember.filter({ active: true }),
        base44.entities.Project.filter({ status: { $nin: ['הושלם', 'מבוטל'] } }),
        base44.entities.SubTask.list(),
        base44.entities.TimeLog.list('-log_date', 1000)
      ]);

      setTeamMembers(team || []);
      setProjects(prj || []);
      setSubtasks(tasks || []);
      setTimeLogs(logs || []);

      await runAnalysis(team, prj, tasks, logs);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('שגיאה בטעינת הנתונים');
    }
    setLoading(false);
  };

  const runAnalysis = async (team, prj, tasks, logs) => {
    setAnalyzing(true);
    
    const members = team || teamMembers;
    const projects_ = prj || projects;
    const subtasks_ = tasks || subtasks;
    const timeLogs_ = logs || timeLogs;

    // Analyze each team member
    const memberAnalysis = members.map(member => {
      // Get assigned tasks
      const assignedTasks = subtasks_.filter(t => 
        t.assigned_to?.includes(member.email) || 
        t.assigned_to?.includes(member.full_name)
      );
      
      const activeTasks = assignedTasks.filter(t => t.status === 'בתהליך');
      const completedTasks = assignedTasks.filter(t => t.status === 'הושלם');
      const pendingTasks = assignedTasks.filter(t => t.status === 'לא התחיל' || t.status === 'ממתין');
      const overdueTasks = assignedTasks.filter(t => 
        t.status !== 'הושלם' && t.due_date && new Date(t.due_date) < new Date()
      );
      const blockedTasks = assignedTasks.filter(t => t.status === 'חסום');

      // Get time logs for last 30 days
      const recentLogs = timeLogs_.filter(l => 
        (l.created_by === member.email || l.user_name === member.full_name) &&
        l.log_date && differenceInDays(new Date(), new Date(l.log_date)) <= 30
      );
      
      const hoursLast30Days = recentLogs.reduce((sum, l) => 
        sum + ((l.duration_seconds || 0) / 3600), 0
      );
      
      const avgHoursPerDay = hoursLast30Days / 30;
      const avgHoursPerWeek = avgHoursPerDay * 5;

      // Get projects involved
      const projectIds = new Set(assignedTasks.map(t => t.project_id).filter(Boolean));
      const involvedProjects = projects_.filter(p => projectIds.has(p.id));

      // Calculate estimated hours from assigned tasks
      const totalEstimatedHours = assignedTasks
        .filter(t => t.status !== 'הושלם')
        .reduce((sum, t) => sum + (t.estimated_hours || 4), 0);

      // Capacity analysis
      const weeklyCapacity = member.capacity_hours_per_week || 40;
      const currentWorkload = totalEstimatedHours;
      const workloadPercent = Math.min(150, (currentWorkload / weeklyCapacity) * 100);

      // Performance metrics
      const completionRate = assignedTasks.length > 0 
        ? (completedTasks.length / assignedTasks.length) * 100 
        : 0;
      
      // On-time delivery rate (completed tasks that weren't overdue)
      const completedOnTime = completedTasks.filter(t => {
        if (!t.due_date) return true;
        const completedDate = t.updated_date ? new Date(t.updated_date) : new Date();
        return completedDate <= new Date(t.due_date);
      });
      const onTimeRate = completedTasks.length > 0 
        ? (completedOnTime.length / completedTasks.length) * 100 
        : 100;

      // Velocity (tasks completed per week in last 30 days)
      const recentCompletions = completedTasks.filter(t => 
        t.updated_date && differenceInDays(new Date(), new Date(t.updated_date)) <= 30
      );
      const weeklyVelocity = recentCompletions.length / 4;

      // Status determination
      let status = 'optimal';
      let statusLabel = 'אופטימלי';
      if (workloadPercent > 120) {
        status = 'overloaded';
        statusLabel = 'עומס יתר';
      } else if (workloadPercent > 90) {
        status = 'high';
        statusLabel = 'עומס גבוה';
      } else if (workloadPercent < 40 && assignedTasks.length > 0) {
        status = 'underutilized';
        statusLabel = 'ניצול חלקי';
      } else if (assignedTasks.length === 0) {
        status = 'available';
        statusLabel = 'זמין';
      }

      // Efficiency score (0-100)
      const efficiencyScore = Math.round(
        (completionRate * 0.3) + 
        (onTimeRate * 0.4) + 
        (Math.min(100, weeklyVelocity * 20) * 0.3)
      );

      return {
        id: member.id,
        name: member.full_name,
        email: member.email,
        role: member.role,
        status,
        statusLabel,
        workloadPercent: Math.round(workloadPercent),
        weeklyCapacity,
        currentWorkload: Math.round(currentWorkload),
        tasks: {
          total: assignedTasks.length,
          active: activeTasks.length,
          completed: completedTasks.length,
          pending: pendingTasks.length,
          overdue: overdueTasks.length,
          blocked: blockedTasks.length
        },
        performance: {
          completionRate: Math.round(completionRate),
          onTimeRate: Math.round(onTimeRate),
          weeklyVelocity: Math.round(weeklyVelocity * 10) / 10,
          efficiencyScore
        },
        hours: {
          last30Days: Math.round(hoursLast30Days),
          avgPerWeek: Math.round(avgHoursPerWeek),
          estimated: Math.round(totalEstimatedHours)
        },
        projects: involvedProjects.map(p => ({ id: p.id, name: p.name }))
      };
    });

    // Project resource analysis
    const projectAnalysis = projects_.map(project => {
      const projectTasks = subtasks_.filter(t => t.project_id === project.id);
      const assignees = new Set();
      projectTasks.forEach(t => (t.assigned_to || []).forEach(a => assignees.add(a)));

      const teamOnProject = memberAnalysis.filter(m => 
        assignees.has(m.email) || assignees.has(m.name)
      );

      const totalEstimatedHours = projectTasks
        .filter(t => t.status !== 'הושלם')
        .reduce((sum, t) => sum + (t.estimated_hours || 4), 0);

      const totalCapacity = teamOnProject.reduce((sum, m) => sum + m.weeklyCapacity, 0);
      const weeksNeeded = totalCapacity > 0 ? totalEstimatedHours / totalCapacity : 0;

      return {
        id: project.id,
        name: project.name,
        teamSize: teamOnProject.length,
        totalTasks: projectTasks.length,
        openTasks: projectTasks.filter(t => t.status !== 'הושלם').length,
        estimatedHours: Math.round(totalEstimatedHours),
        teamCapacity: totalCapacity,
        weeksNeeded: Math.round(weeksNeeded * 10) / 10,
        team: teamOnProject.map(m => ({ name: m.name, workload: m.workloadPercent }))
      };
    });

    // Generate summary
    const summary = {
      totalMembers: memberAnalysis.length,
      overloaded: memberAnalysis.filter(m => m.status === 'overloaded').length,
      highWorkload: memberAnalysis.filter(m => m.status === 'high').length,
      optimal: memberAnalysis.filter(m => m.status === 'optimal').length,
      underutilized: memberAnalysis.filter(m => m.status === 'underutilized').length,
      available: memberAnalysis.filter(m => m.status === 'available').length,
      avgEfficiency: Math.round(
        memberAnalysis.reduce((sum, m) => sum + m.performance.efficiencyScore, 0) / 
        (memberAnalysis.length || 1)
      ),
      avgWorkload: Math.round(
        memberAnalysis.reduce((sum, m) => sum + m.workloadPercent, 0) / 
        (memberAnalysis.length || 1)
      )
    };

    setAnalysis({
      members: memberAnalysis,
      projects: projectAnalysis,
      summary
    });

    // Get AI recommendations
    await getAIRecommendations(memberAnalysis, projectAnalysis, summary);
    
    setAnalyzing(false);
  };

  const getAIRecommendations = async (members, projects_, summary) => {
    try {
      const overloaded = members.filter(m => m.status === 'overloaded' || m.status === 'high');
      const underutilized = members.filter(m => m.status === 'underutilized' || m.status === 'available');
      
      const prompt = `אתה מומחה לניהול משאבים וצוותים. נתח את המצב ותן המלצות ספציפיות:

סיכום צוות:
- ${summary.totalMembers} חברי צוות
- ${summary.overloaded + summary.highWorkload} עמוסים (${overloaded.map(m => `${m.name}: ${m.workloadPercent}%`).join(', ')})
- ${summary.underutilized + summary.available} לא מנוצלים מספיק (${underutilized.map(m => `${m.name}: ${m.workloadPercent}%`).join(', ')})
- יעילות ממוצעת: ${summary.avgEfficiency}%

פרויקטים פעילים:
${projects_.slice(0, 5).map(p => `- ${p.name}: ${p.teamSize} אנשים, ${p.openTasks} משימות, ${p.estimatedHours} שעות נדרשות`).join('\n')}

תן 4-5 המלצות קונקרטיות וספציפיות לאיזון העומסים ושיפור היעילות. התייחס לשמות ספציפיים.
פורמט: רשימה ממוספרת עם המלצות קצרות וברורות.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: false
      });

      setAiRecommendations(response);
    } catch (error) {
      console.warn('Could not get AI recommendations:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'overloaded': return 'bg-red-100 text-red-700 border-red-200';
      case 'high': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'optimal': return 'bg-green-100 text-green-700 border-green-200';
      case 'underutilized': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'available': return 'bg-slate-100 text-slate-700 border-slate-200';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getProgressColor = (percent) => {
    if (percent > 100) return 'bg-red-500';
    if (percent > 80) return 'bg-amber-500';
    if (percent > 50) return 'bg-green-500';
    return 'bg-blue-500';
  };

  // Chart data
  const workloadDistribution = analysis ? [
    { name: 'עומס יתר', value: analysis.summary.overloaded, color: '#ef4444' },
    { name: 'עומס גבוה', value: analysis.summary.highWorkload, color: '#f59e0b' },
    { name: 'אופטימלי', value: analysis.summary.optimal, color: '#10b981' },
    { name: 'ניצול חלקי', value: analysis.summary.underutilized, color: '#3b82f6' },
    { name: 'זמין', value: analysis.summary.available, color: '#94a3b8' }
  ].filter(d => d.value > 0) : [];

  const teamPerformance = analysis?.members.map(m => ({
    name: m.name.split(' ')[0],
    יעילות: m.performance.efficiencyScore,
    עומס: m.workloadPercent,
    'השלמה בזמן': m.performance.onTimeRate
  })) || [];

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Users className="w-12 h-12 text-purple-500 animate-pulse mx-auto mb-3" />
          <p className="text-slate-600">טוען נתוני צוות...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">ניתוח ביצועי צוות</h2>
            <p className="text-sm text-slate-500">עומסים, יעילות והמלצות AI</p>
          </div>
        </div>
        <Button 
          onClick={() => runAnalysis()} 
          disabled={analyzing}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {analyzing ? (
            <><RefreshCw className="w-4 h-4 ml-2 animate-spin" />מנתח...</>
          ) : (
            <><RefreshCw className="w-4 h-4 ml-2" />עדכן ניתוח</>
          )}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-3 text-center">
            <AlertTriangle className="w-6 h-6 text-red-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-red-700">{analysis?.summary.overloaded || 0}</p>
            <p className="text-xs text-red-600">עומס יתר</p>
          </CardContent>
        </Card>
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="p-3 text-center">
            <Activity className="w-6 h-6 text-amber-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-amber-700">{analysis?.summary.highWorkload || 0}</p>
            <p className="text-xs text-amber-600">עומס גבוה</p>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-3 text-center">
            <CheckCircle2 className="w-6 h-6 text-green-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-green-700">{analysis?.summary.optimal || 0}</p>
            <p className="text-xs text-green-600">אופטימלי</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-3 text-center">
            <User className="w-6 h-6 text-blue-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-blue-700">{analysis?.summary.underutilized || 0}</p>
            <p className="text-xs text-blue-600">ניצול חלקי</p>
          </CardContent>
        </Card>
        <Card className="bg-purple-50 border-purple-200">
          <CardContent className="p-3 text-center">
            <Target className="w-6 h-6 text-purple-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-purple-700">{analysis?.summary.avgEfficiency || 0}%</p>
            <p className="text-xs text-purple-600">יעילות ממוצעת</p>
          </CardContent>
        </Card>
      </div>

      {/* AI Recommendations */}
      {aiRecommendations && (
        <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-purple-700">
              <Brain className="w-5 h-5" />
              המלצות AI לאיזון משאבים
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap">
              {aiRecommendations}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Workload Distribution Pie */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">התפלגות עומסים</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={workloadDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {workloadDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Team Performance Bar */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">ביצועי צוות</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={teamPerformance.slice(0, 6)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 100]} />
                <YAxis type="category" dataKey="name" width={60} />
                <Tooltip />
                <Bar dataKey="יעילות" fill="#10b981" />
                <Bar dataKey="עומס" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Team Members Detail */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            פירוט חברי צוות
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analysis?.members.sort((a, b) => b.workloadPercent - a.workloadPercent).map(member => (
              <div 
                key={member.id} 
                className={`p-4 rounded-lg border-2 ${getStatusColor(member.status)}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-slate-800">{member.name}</h4>
                      <Badge variant="outline" className={getStatusColor(member.status)}>
                        {member.statusLabel}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-500">{member.role}</p>
                  </div>
                  <div className="text-left">
                    <p className="text-2xl font-bold">{member.workloadPercent}%</p>
                    <p className="text-xs text-slate-500">עומס עבודה</p>
                  </div>
                </div>

                {/* Workload Progress Bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span>{member.currentWorkload} שעות</span>
                    <span>קיבולת: {member.weeklyCapacity} שעות/שבוע</span>
                  </div>
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${getProgressColor(member.workloadPercent)} transition-all`}
                      style={{ width: `${Math.min(100, member.workloadPercent)}%` }}
                    />
                  </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-4 gap-3 text-sm">
                  <div className="text-center p-2 bg-white/50 rounded">
                    <p className="font-semibold">{member.tasks.active}</p>
                    <p className="text-xs text-slate-500">פעילות</p>
                  </div>
                  <div className="text-center p-2 bg-white/50 rounded">
                    <p className="font-semibold text-red-600">{member.tasks.overdue}</p>
                    <p className="text-xs text-slate-500">באיחור</p>
                  </div>
                  <div className="text-center p-2 bg-white/50 rounded">
                    <p className="font-semibold">{member.performance.onTimeRate}%</p>
                    <p className="text-xs text-slate-500">בזמן</p>
                  </div>
                  <div className="text-center p-2 bg-white/50 rounded">
                    <p className="font-semibold">{member.performance.efficiencyScore}%</p>
                    <p className="text-xs text-slate-500">יעילות</p>
                  </div>
                </div>

                {/* Projects */}
                {member.projects.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-200">
                    <p className="text-xs text-slate-500 mb-1">פרויקטים:</p>
                    <div className="flex flex-wrap gap-1">
                      {member.projects.slice(0, 4).map(p => (
                        <Badge key={p.id} variant="outline" className="text-xs bg-white">
                          {p.name}
                        </Badge>
                      ))}
                      {member.projects.length > 4 && (
                        <Badge variant="outline" className="text-xs">
                          +{member.projects.length - 4}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Project Resource Allocation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="w-5 h-5" />
            הקצאת משאבים לפרויקטים
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analysis?.projects.slice(0, 6).map(project => (
              <div key={project.id} className="p-3 border rounded-lg bg-white">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">{project.name}</h4>
                  <Badge variant="outline">
                    {project.teamSize} אנשים
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500">משימות פתוחות</p>
                    <p className="font-semibold">{project.openTasks}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">שעות נדרשות</p>
                    <p className="font-semibold">{project.estimatedHours}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">שבועות להשלמה</p>
                    <p className="font-semibold">{project.weeksNeeded}</p>
                  </div>
                </div>
                {project.team.length > 0 && (
                  <div className="mt-2 pt-2 border-t">
                    <div className="flex flex-wrap gap-2">
                      {project.team.map((m, idx) => (
                        <span 
                          key={idx} 
                          className={`text-xs px-2 py-1 rounded ${
                            m.workload > 100 ? 'bg-red-100 text-red-700' :
                            m.workload > 80 ? 'bg-amber-100 text-amber-700' :
                            'bg-green-100 text-green-700'
                          }`}
                        >
                          {m.name} ({m.workload}%)
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}