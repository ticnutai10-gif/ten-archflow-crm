import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  FileText, Send, Download, Flag, CheckCircle2, 
  AlertTriangle, Clock, TrendingUp, Loader2 
} from "lucide-react";
import { format, differenceInDays, isPast, isToday } from "date-fns";
import { he } from "date-fns/locale";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function AutoProgressReport({ project, subtasks = [], milestones = [] }) {
  const [sending, setSending] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [aiSummary, setAiSummary] = useState(null);

  // Calculate milestone-based progress
  const milestoneStats = useMemo(() => {
    const total = milestones.length;
    const completed = milestones.filter(m => m.completed).length;
    const overdue = milestones.filter(m => 
      !m.completed && m.due_date && isPast(new Date(m.due_date)) && !isToday(new Date(m.due_date))
    ).length;
    const upcoming = milestones.filter(m => {
      if (m.completed || !m.due_date) return false;
      const daysUntil = differenceInDays(new Date(m.due_date), new Date());
      return daysUntil >= 0 && daysUntil <= 14;
    });
    
    return { total, completed, overdue, upcoming, progress: total > 0 ? Math.round((completed / total) * 100) : 0 };
  }, [milestones]);

  // Calculate task-based progress
  const taskStats = useMemo(() => {
    const total = subtasks.length;
    const completed = subtasks.filter(t => t.status === 'הושלם').length;
    const inProgress = subtasks.filter(t => t.status === 'בתהליך').length;
    const blocked = subtasks.filter(t => t.status === 'חסום').length;
    
    return { total, completed, inProgress, blocked, progress: total > 0 ? Math.round((completed / total) * 100) : 0 };
  }, [subtasks]);

  // Budget analysis
  const budgetStats = useMemo(() => {
    const budget = project?.budget || 0;
    const expenses = project?.total_expenses || 0;
    const remaining = budget - expenses;
    const utilization = budget > 0 ? Math.round((expenses / budget) * 100) : 0;
    
    return { budget, expenses, remaining, utilization };
  }, [project]);

  // Generate AI summary
  const generateAISummary = async () => {
    setGenerating(true);
    try {
      const prompt = `
        צור סיכום התקדמות קצר ומקצועי לפרויקט "${project?.name || 'פרויקט'}" בהתבסס על הנתונים הבאים:
        
        אבני דרך: ${milestoneStats.completed} מתוך ${milestoneStats.total} הושלמו (${milestoneStats.progress}%)
        ${milestoneStats.overdue > 0 ? `⚠️ ${milestoneStats.overdue} אבני דרך באיחור` : ''}
        
        משימות: ${taskStats.completed} מתוך ${taskStats.total} הושלמו (${taskStats.progress}%)
        ${taskStats.blocked > 0 ? `⚠️ ${taskStats.blocked} משימות חסומות` : ''}
        
        תקציב: ניצולת ${budgetStats.utilization}% (₪${budgetStats.expenses.toLocaleString()} מתוך ₪${budgetStats.budget.toLocaleString()})
        
        צור סיכום של 3-4 משפטים בעברית שמתאר את מצב הפרויקט, הישגים אחרונים, ונקודות לתשומת לב.
      `;
      
      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            summary: { type: "string" },
            highlights: { type: "array", items: { type: "string" } },
            concerns: { type: "array", items: { type: "string" } },
            recommendations: { type: "array", items: { type: "string" } }
          }
        }
      });
      
      setAiSummary(response);
    } catch (error) {
      console.error('Error generating AI summary:', error);
      toast.error('שגיאה ביצירת סיכום AI');
    } finally {
      setGenerating(false);
    }
  };

  // Send report via email
  const sendReport = async () => {
    if (!project?.client_name) {
      toast.error('לא נמצא לקוח לשליחת הדוח');
      return;
    }
    
    setSending(true);
    try {
      // Get client email
      const clients = await base44.entities.Client.filter({ name: project.client_name });
      const clientEmail = clients?.[0]?.email;
      
      if (!clientEmail) {
        toast.error('לא נמצא אימייל ללקוח');
        return;
      }

      const reportContent = `
        <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>דוח התקדמות - ${project.name}</h2>
          <p>תאריך: ${format(new Date(), 'dd/MM/yyyy', { locale: he })}</p>
          
          <h3>סיכום אבני דרך</h3>
          <p>הושלמו ${milestoneStats.completed} מתוך ${milestoneStats.total} (${milestoneStats.progress}%)</p>
          ${milestoneStats.overdue > 0 ? `<p style="color: red;">⚠️ ${milestoneStats.overdue} אבני דרך באיחור</p>` : ''}
          
          <h3>סיכום משימות</h3>
          <p>הושלמו ${taskStats.completed} מתוך ${taskStats.total} (${taskStats.progress}%)</p>
          
          <h3>תקציב</h3>
          <p>ניצולת: ${budgetStats.utilization}%</p>
          <p>הוצאות: ₪${budgetStats.expenses.toLocaleString()}</p>
          <p>יתרה: ₪${budgetStats.remaining.toLocaleString()}</p>
          
          ${aiSummary ? `
            <h3>סיכום AI</h3>
            <p>${aiSummary.summary}</p>
          ` : ''}
          
          <hr/>
          <p style="color: gray; font-size: 12px;">דוח זה נוצר אוטומטית</p>
        </div>
      `;
      
      await base44.integrations.Core.SendEmail({
        to: clientEmail,
        subject: `דוח התקדמות - ${project.name} - ${format(new Date(), 'dd/MM/yyyy')}`,
        body: reportContent
      });
      
      // Save report record
      await base44.entities.ProgressReport.create({
        project_id: project.id,
        project_name: project.name,
        client_id: project.client_id,
        client_name: project.client_name,
        report_type: 'מיוחד',
        period_start: format(new Date(), 'yyyy-MM-dd'),
        period_end: format(new Date(), 'yyyy-MM-dd'),
        overall_progress: milestoneStats.progress,
        status: 'נשלח',
        sent_to: [clientEmail],
        sent_at: new Date().toISOString(),
        highlights: aiSummary?.summary || '',
        milestones_status: milestones.map(m => ({
          name: m.name,
          due_date: m.due_date,
          completed: m.completed,
          progress: m.completed ? 100 : 0
        }))
      });
      
      toast.success('הדוח נשלח בהצלחה');
    } catch (error) {
      console.error('Error sending report:', error);
      toast.error('שגיאה בשליחת הדוח');
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className="shadow-lg border-0">
      <CardHeader className="border-b bg-gradient-to-l from-green-50 to-white">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-green-600" />
            דוח התקדמות אוטומטי
          </CardTitle>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={generateAISummary}
              disabled={generating}
            >
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
              סיכום AI
            </Button>
            <Button 
              size="sm" 
              onClick={sendReport}
              disabled={sending}
              className="bg-green-600 hover:bg-green-700"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              שלח דוח
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-6 space-y-6">
        {/* Milestones Progress */}
        <div className="bg-purple-50 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold flex items-center gap-2">
              <Flag className="w-4 h-4 text-purple-600" />
              התקדמות אבני דרך
            </h4>
            <Badge className="bg-purple-100 text-purple-700">
              {milestoneStats.completed}/{milestoneStats.total}
            </Badge>
          </div>
          <Progress value={milestoneStats.progress} className="h-3 mb-2" />
          <div className="flex gap-4 text-sm">
            <span className="text-green-600">✓ {milestoneStats.completed} הושלמו</span>
            {milestoneStats.overdue > 0 && (
              <span className="text-red-600 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {milestoneStats.overdue} באיחור
              </span>
            )}
            {milestoneStats.upcoming.length > 0 && (
              <span className="text-amber-600 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {milestoneStats.upcoming.length} בקרוב
              </span>
            )}
          </div>
        </div>

        {/* Tasks Progress */}
        <div className="bg-blue-50 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
              התקדמות משימות
            </h4>
            <Badge className="bg-blue-100 text-blue-700">
              {taskStats.completed}/{taskStats.total}
            </Badge>
          </div>
          <Progress value={taskStats.progress} className="h-3 mb-2" />
          <div className="flex gap-4 text-sm">
            <span className="text-green-600">✓ {taskStats.completed} הושלמו</span>
            <span className="text-blue-600">{taskStats.inProgress} בתהליך</span>
            {taskStats.blocked > 0 && (
              <span className="text-red-600">{taskStats.blocked} חסומות</span>
            )}
          </div>
        </div>

        {/* Budget Summary */}
        <div className="bg-amber-50 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold">סיכום תקציב</h4>
            <Badge className={budgetStats.utilization > 90 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}>
              {budgetStats.utilization}% ניצולת
            </Badge>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-xs text-slate-500">תקציב</div>
              <div className="font-bold">₪{budgetStats.budget.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">הוצאות</div>
              <div className="font-bold text-amber-600">₪{budgetStats.expenses.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">יתרה</div>
              <div className={`font-bold ${budgetStats.remaining < 0 ? 'text-red-600' : 'text-green-600'}`}>
                ₪{budgetStats.remaining.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* AI Summary */}
        {aiSummary && (
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-slate-600" />
              סיכום AI
            </h4>
            <p className="text-slate-700 mb-3">{aiSummary.summary}</p>
            
            {aiSummary.highlights?.length > 0 && (
              <div className="mb-2">
                <span className="text-sm font-medium text-green-600">הישגים:</span>
                <ul className="text-sm text-slate-600 list-disc list-inside">
                  {aiSummary.highlights.map((h, i) => <li key={i}>{h}</li>)}
                </ul>
              </div>
            )}
            
            {aiSummary.concerns?.length > 0 && (
              <div>
                <span className="text-sm font-medium text-red-600">נקודות לתשומת לב:</span>
                <ul className="text-sm text-slate-600 list-disc list-inside">
                  {aiSummary.concerns.map((c, i) => <li key={i}>{c}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Upcoming Milestones */}
        {milestoneStats.upcoming.length > 0 && (
          <div>
            <h4 className="font-semibold mb-2">אבני דרך קרובות:</h4>
            <div className="space-y-2">
              {milestoneStats.upcoming.map((m, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-amber-50 rounded-lg">
                  <span className="text-sm">{m.name}</span>
                  <Badge variant="outline" className="text-amber-600">
                    {format(new Date(m.due_date), 'dd/MM/yyyy')}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}