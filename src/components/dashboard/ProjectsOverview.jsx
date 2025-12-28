import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  DollarSign,
  Calendar,
  ArrowRight
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell 
} from 'recharts';

const STATUS_COLORS = {
  "הצעת מחיר": "#3b82f6",
  "תכנון": "#8b5cf6",
  "היתרים": "#f59e0b",
  "ביצוע": "#10b981",
  "הושלם": "#6b7280",
  "מבוטל": "#ef4444"
};

export default function ProjectsOverview({ compactHeader = false, isExpanded = true }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setLoading(true);
    try {
      // Limit to 50 projects for overview to avoid performance issues
      const data = await base44.entities.Project.list('-created_date', 50);
      setProjects(data || []);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
    setLoading(false);
  };

  // Calculate statistics
  const activeProjects = projects.filter(p => 
    p.status !== 'הושלם' && p.status !== 'מבוטל'
  );

  const totalBudget = activeProjects.reduce((sum, p) => sum + (p.budget || 0), 0);
  const totalEstimated = activeProjects.reduce((sum, p) => sum + (p.estimated_budget || 0), 0);

  const averageProgress = activeProjects.length > 0
    ? Math.round(activeProjects.reduce((sum, p) => sum + (p.progress || 0), 0) / activeProjects.length)
    : 0;

  // Projects by status
  const projectsByStatus = Object.keys(STATUS_COLORS).map(status => ({
    name: status,
    value: projects.filter(p => p.status === status).length,
    color: STATUS_COLORS[status]
  })).filter(item => item.value > 0);

  // Delayed projects (progress < 50% but past expected midpoint)
  const delayedProjects = activeProjects.filter(p => {
    if (!p.start_date || !p.end_date) return false;
    const start = new Date(p.start_date);
    const end = new Date(p.end_date);
    const now = new Date();
    const totalDuration = end - start;
    const elapsed = now - start;
    const expectedProgress = (elapsed / totalDuration) * 100;
    return (p.progress || 0) < expectedProgress - 20;
  });

  // Projects near completion (progress > 70%)
  const nearCompletionProjects = activeProjects.filter(p => 
    (p.progress || 0) >= 70 && p.status !== 'הושלם'
  );

  if (loading) {
    return (
      <Card className="border-0 shadow-lg">
        <CardHeader className={compactHeader ? "pb-3" : ""}>
          <CardTitle className={compactHeader ? "text-base" : ""}>סקירת פרויקטים</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-32 bg-slate-200 rounded"></div>
            <div className="h-32 bg-slate-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isExpanded) {
    return (
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">סקירת פרויקטים</CardTitle>
            <Badge variant="outline">{activeProjects.length} פעילים</Badge>
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg" dir="rtl">
      <CardHeader className={compactHeader ? "pb-3" : ""}>
        <CardTitle className={compactHeader ? "text-base" : ""}>סקירת פרויקטים פעילים</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-blue-600">פרויקטים פעילים</span>
            </div>
            <div className="text-2xl font-bold text-blue-900">{activeProjects.length}</div>
          </div>

          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm text-green-600">התקדמות ממוצעת</span>
            </div>
            <div className="text-2xl font-bold text-green-900">{averageProgress}%</div>
          </div>

          <div className="bg-amber-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span className="text-sm text-amber-600">בעיכוב</span>
            </div>
            <div className="text-2xl font-bold text-amber-900">{delayedProjects.length}</div>
          </div>

          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-purple-600" />
              <span className="text-sm text-purple-600">קרובים לסיום</span>
            </div>
            <div className="text-2xl font-bold text-purple-900">{nearCompletionProjects.length}</div>
          </div>
        </div>

        {/* Budget Summary */}
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <DollarSign className="w-5 h-5 text-slate-600" />
            <h3 className="font-semibold text-slate-900">סיכום תקציבי</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-slate-600 mb-1">תקציב מאושר</div>
              <div className="text-xl font-bold text-slate-900">
                ₪{totalBudget.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-sm text-slate-600 mb-1">אומדן כולל</div>
              <div className="text-xl font-bold text-slate-900">
                ₪{totalEstimated.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* Status Distribution Chart */}
        {projectsByStatus.length > 0 && (
          <div>
            <h3 className="font-semibold text-slate-900 mb-3">התפלגות לפי סטטוס</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={projectsByStatus}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {projectsByStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Delayed Projects */}
        {delayedProjects.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <h3 className="font-semibold text-slate-900">פרויקטים בעיכוב</h3>
            </div>
            <div className="space-y-2">
              {delayedProjects.slice(0, 3).map(project => (
                <div key={project.id} className="bg-amber-50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="font-semibold text-slate-900">{project.name}</div>
                      <div className="text-sm text-slate-600">{project.client_name}</div>
                    </div>
                    <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200">
                      {project.progress || 0}%
                    </Badge>
                  </div>
                  <Progress value={project.progress || 0} className="h-2" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Near Completion Projects */}
        {nearCompletionProjects.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <h3 className="font-semibold text-slate-900">קרובים לסיום</h3>
            </div>
            <div className="space-y-2">
              {nearCompletionProjects.slice(0, 3).map(project => (
                <div key={project.id} className="bg-green-50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="font-semibold text-slate-900">{project.name}</div>
                      <div className="text-sm text-slate-600">{project.client_name}</div>
                    </div>
                    <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                      {project.progress || 0}%
                    </Badge>
                  </div>
                  <Progress value={project.progress || 0} className="h-2" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* View All Button */}
        <Link to={createPageUrl('Projects')}>
          <Button variant="outline" className="w-full gap-2">
            צפה בכל הפרויקטים
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}