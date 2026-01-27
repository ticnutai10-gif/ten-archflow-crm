import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, DollarSign, Users, RefreshCw, TrendingUp, Calculator } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function ProjectCostSummary({ project, onUpdate }) {
  const [timeLogs, setTimeLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [teamMembers, setTeamMembers] = useState([]);

  useEffect(() => {
    loadData();
  }, [project.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [logs, tms] = await Promise.all([
        base44.entities.TimeLog.filter({ project_id: project.id }),
        base44.entities.TeamMember.list()
      ]);
      setTimeLogs(logs || []);
      setTeamMembers(tms || []);
    } catch (error) {
      console.error('Error loading time logs:', error);
    }
    setLoading(false);
  };

  // Calculate totals from time logs
  const totalSeconds = timeLogs.reduce((sum, log) => sum + (log.duration_seconds || 0), 0);
  const totalHours = totalSeconds / 3600;

  // Calculate cost per worker
  const workerStats = {};
  timeLogs.forEach(log => {
    const email = log.user_email || log.created_by;
    if (!email) return;
    
    if (!workerStats[email]) {
      workerStats[email] = { seconds: 0, cost: 0, name: '' };
    }
    
    const tm = teamMembers.find(t => t.email === email);
    const projectMember = (project.team_members || []).find(m => m.email === email);
    const hourlyRate = log.hourly_rate || projectMember?.hourly_rate || tm?.hourly_rate || 0;
    const hours = (log.duration_seconds || 0) / 3600;
    
    workerStats[email].seconds += log.duration_seconds || 0;
    workerStats[email].cost += hours * hourlyRate;
    workerStats[email].name = tm?.full_name || projectMember?.name || email;
    workerStats[email].rate = hourlyRate;
  });

  const totalLaborCost = Object.values(workerStats).reduce((sum, w) => sum + w.cost, 0);

  // Calculate allocated vs actual
  const allocatedHours = (project.team_members || []).reduce((sum, m) => sum + (m.allocated_hours || 0), 0);
  const allocatedCost = (project.team_members || []).reduce((sum, m) => sum + ((m.allocated_hours || 0) * (m.hourly_rate || 0)), 0);

  const handleUpdateProjectStats = async () => {
    try {
      await onUpdate({
        total_hours: totalHours,
        total_labor_cost: totalLaborCost
      });
      toast.success('הנתונים עודכנו בפרויקט');
    } catch (error) {
      toast.error('שגיאה בעדכון');
    }
  };

  const formatHours = (hours) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}:${String(m).padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <Card className="shadow-lg border-0">
        <CardContent className="p-8 text-center">
          <RefreshCw className="w-8 h-8 text-slate-400 mx-auto animate-spin" />
          <p className="text-slate-500 mt-2">טוען נתונים...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg border-0">
      <CardHeader className="border-b flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Calculator className="w-5 h-5 text-green-600" />
          סיכום שעות ועלויות
        </CardTitle>
        <Button variant="outline" size="sm" onClick={handleUpdateProjectStats}>
          <RefreshCw className="w-4 h-4 ml-1" />
          עדכן בפרויקט
        </Button>
      </CardHeader>
      <CardContent className="p-6">
        {/* Main Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 rounded-xl p-4 text-center">
            <Clock className="w-6 h-6 text-blue-500 mx-auto mb-2" />
            <div className="text-sm text-blue-600">שעות בפועל</div>
            <div className="text-2xl font-bold text-blue-700">{formatHours(totalHours)}</div>
          </div>
          <div className="bg-green-50 rounded-xl p-4 text-center">
            <DollarSign className="w-6 h-6 text-green-500 mx-auto mb-2" />
            <div className="text-sm text-green-600">עלות עבודה</div>
            <div className="text-2xl font-bold text-green-700">₪{Math.round(totalLaborCost).toLocaleString()}</div>
          </div>
          <div className="bg-purple-50 rounded-xl p-4 text-center">
            <Clock className="w-6 h-6 text-purple-500 mx-auto mb-2" />
            <div className="text-sm text-purple-600">שעות מוקצות</div>
            <div className="text-2xl font-bold text-purple-700">{allocatedHours}</div>
          </div>
          <div className="bg-amber-50 rounded-xl p-4 text-center">
            <TrendingUp className="w-6 h-6 text-amber-500 mx-auto mb-2" />
            <div className="text-sm text-amber-600">ניצול</div>
            <div className="text-2xl font-bold text-amber-700">
              {allocatedHours > 0 ? Math.round((totalHours / allocatedHours) * 100) : 0}%
            </div>
          </div>
        </div>

        {/* Comparison Bar */}
        {allocatedHours > 0 && (
          <div className="mb-6">
            <div className="flex justify-between text-sm text-slate-600 mb-2">
              <span>ניצול שעות מוקצות</span>
              <span>{formatHours(totalHours)} / {allocatedHours} שעות</span>
            </div>
            <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all rounded-full ${
                  (totalHours / allocatedHours) > 1 ? 'bg-red-500' : 
                  (totalHours / allocatedHours) > 0.8 ? 'bg-amber-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min((totalHours / allocatedHours) * 100, 100)}%` }}
              />
            </div>
            {(totalHours / allocatedHours) > 1 && (
              <div className="text-sm text-red-600 mt-1">
                ⚠️ חריגה של {formatHours(totalHours - allocatedHours)} שעות
              </div>
            )}
          </div>
        )}

        {/* Per Worker Breakdown */}
        <div>
          <h4 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <Users className="w-4 h-4" />
            פירוט לפי עובד
          </h4>
          {Object.keys(workerStats).length === 0 ? (
            <div className="text-center py-6 text-slate-500">
              אין רישומי זמן לפרויקט זה
            </div>
          ) : (
            <div className="space-y-2">
              {Object.entries(workerStats)
                .sort((a, b) => b[1].seconds - a[1].seconds)
                .map(([email, stats]) => (
                  <div 
                    key={email}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
                        {stats.name[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-slate-900">{stats.name}</div>
                        <div className="text-xs text-slate-500">₪{stats.rate}/שעה</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant="outline" className="font-mono">
                        {formatHours(stats.seconds / 3600)}
                      </Badge>
                      <Badge className="bg-green-100 text-green-700">
                        ₪{Math.round(stats.cost).toLocaleString()}
                      </Badge>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Total Summary */}
        <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-xl">
          <div className="flex justify-between items-center">
            <span className="text-slate-700 font-semibold">סה"כ עלות עבודה בפרויקט:</span>
            <span className="text-2xl font-bold text-green-700">₪{Math.round(totalLaborCost).toLocaleString()}</span>
          </div>
          {allocatedCost > 0 && (
            <div className="flex justify-between items-center mt-2 text-sm text-slate-600">
              <span>תקציב עבודה מוקצה:</span>
              <span className={totalLaborCost > allocatedCost ? 'text-red-600' : 'text-green-600'}>
                ₪{Math.round(allocatedCost).toLocaleString()}
                {totalLaborCost > allocatedCost && ` (חריגה: ₪${Math.round(totalLaborCost - allocatedCost).toLocaleString()})`}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}