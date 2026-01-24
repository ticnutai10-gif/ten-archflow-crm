import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { 
  FileText, Send, Calendar, TrendingUp, AlertTriangle, 
  CheckCircle2, Clock, DollarSign, Plus, X, Loader2,
  Download, Eye, Mail
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { format, subDays, subWeeks, subMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { he } from 'date-fns/locale';

export default function ProgressReportGenerator({ project, subtasks = [], onClose }) {
  const [reportType, setReportType] = useState('שבועי');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [highlights, setHighlights] = useState('');
  const [nextSteps, setNextSteps] = useState('');
  const [notes, setNotes] = useState('');
  const [issues, setIssues] = useState([]);
  const [recipients, setRecipients] = useState([]);
  const [newRecipient, setNewRecipient] = useState('');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [client, setClient] = useState(null);
  const [previewMode, setPreviewMode] = useState(false);

  useEffect(() => {
    // Set default period based on report type
    const today = new Date();
    let start, end;
    
    if (reportType === 'שבועי') {
      start = startOfWeek(subWeeks(today, 1), { weekStartsOn: 0 });
      end = endOfWeek(subWeeks(today, 1), { weekStartsOn: 0 });
    } else if (reportType === 'חודשי') {
      start = startOfMonth(subMonths(today, 1));
      end = endOfMonth(subMonths(today, 1));
    } else {
      start = subDays(today, 7);
      end = today;
    }
    
    setPeriodStart(format(start, 'yyyy-MM-dd'));
    setPeriodEnd(format(end, 'yyyy-MM-dd'));
  }, [reportType]);

  useEffect(() => {
    loadClient();
  }, [project]);

  const loadClient = async () => {
    if (project?.client_id) {
      try {
        const clientData = await base44.entities.Client.get(project.client_id);
        setClient(clientData);
        if (clientData?.email) {
          setRecipients([clientData.email]);
        }
      } catch (e) {
        console.error('Error loading client:', e);
      }
    }
  };

  // Calculate report data
  const getReportData = () => {
    const startDate = new Date(periodStart);
    const endDate = new Date(periodEnd);

    // Filter tasks by period
    const completedInPeriod = subtasks.filter(t => {
      if (t.status !== 'הושלם') return false;
      const updated = new Date(t.updated_date);
      return updated >= startDate && updated <= endDate;
    });

    const pendingTasks = subtasks.filter(t => 
      t.status !== 'הושלם' && (t.priority === 'גבוהה' || t.priority === 'דחופה' || t.priority === 'קריטית')
    );

    const blockedTasks = subtasks.filter(t => t.status === 'חסום');

    // Milestones status
    const milestones = (project?.milestones || []).map(m => ({
      name: m.name,
      due_date: m.due_date,
      completed: m.completed,
      progress: m.completed ? 100 : 0
    }));

    // Budget summary
    const budgetSummary = {
      total_budget: project?.budget || 0,
      spent: project?.total_expenses || 0,
      remaining: (project?.budget || 0) - (project?.total_expenses || 0),
      utilization_percent: project?.budget ? Math.round((project.total_expenses || 0) / project.budget * 100) : 0
    };

    return {
      project_id: project.id,
      project_name: project.name,
      client_id: project.client_id,
      client_name: project.client_name,
      report_type: reportType,
      period_start: periodStart,
      period_end: periodEnd,
      overall_progress: project.progress || 0,
      completed_tasks: completedInPeriod.map(t => ({
        title: t.title,
        completed_date: t.updated_date,
        assigned_to: t.assigned_to?.join(', ') || ''
      })),
      pending_tasks: pendingTasks.map(t => ({
        title: t.title,
        due_date: t.due_date || t.end_date,
        status: t.status,
        priority: t.priority
      })),
      issues: issues,
      milestones_status: milestones,
      budget_summary: budgetSummary,
      highlights,
      next_steps: nextSteps,
      notes,
      status: 'טיוטה'
    };
  };

  const generateWithAI = async () => {
    setGenerating(true);
    try {
      const reportData = getReportData();
      
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `אתה כותב דוחות התקדמות מקצועיים לפרויקטים.
        
נתוני הפרויקט:
- שם: ${project.name}
- לקוח: ${project.client_name}
- התקדמות: ${project.progress || 0}%
- תקופת הדוח: ${periodStart} עד ${periodEnd}

משימות שהושלמו (${reportData.completed_tasks.length}):
${reportData.completed_tasks.map(t => `- ${t.title}`).join('\n') || 'אין'}

משימות בהמתנה בעדיפות גבוהה (${reportData.pending_tasks.length}):
${reportData.pending_tasks.map(t => `- ${t.title} (${t.priority})`).join('\n') || 'אין'}

אבני דרך:
${reportData.milestones_status.map(m => `- ${m.name}: ${m.completed ? 'הושלם' : 'בתהליך'}`).join('\n') || 'אין'}

תקציב: ₪${reportData.budget_summary.total_budget.toLocaleString()} | נוצל: ${reportData.budget_summary.utilization_percent}%

כתוב:
1. highlights - סיכום הישגים עיקריים (2-3 משפטים)
2. next_steps - צעדים הבאים מתוכננים (2-3 נקודות)
3. issues - בעיות פוטנציאליות (אם יש)`,
        response_json_schema: {
          type: "object",
          properties: {
            highlights: { type: "string" },
            next_steps: { type: "string" },
            issues: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  description: { type: "string" },
                  severity: { type: "string" }
                }
              }
            }
          }
        }
      });

      if (response.highlights) setHighlights(response.highlights);
      if (response.next_steps) setNextSteps(response.next_steps);
      if (response.issues?.length > 0) {
        setIssues(response.issues.map(i => ({ ...i, status: 'פתוח' })));
      }
      
      toast.success('התוכן נוצר בהצלחה');
    } catch (error) {
      console.error('Error generating AI content:', error);
      toast.error('שגיאה ביצירת התוכן');
    }
    setGenerating(false);
  };

  const saveReport = async (send = false) => {
    setLoading(true);
    try {
      const reportData = {
        ...getReportData(),
        highlights,
        next_steps: nextSteps,
        issues,
        sent_to: send ? recipients : [],
        sent_at: send ? new Date().toISOString() : null,
        status: send ? 'נשלח' : 'טיוטה'
      };

      const savedReport = await base44.entities.ProgressReport.create(reportData);

      if (send && recipients.length > 0) {
        // Send email
        const emailBody = generateEmailBody(reportData);
        
        for (const recipient of recipients) {
          await base44.integrations.Core.SendEmail({
            to: recipient,
            subject: `דוח התקדמות ${reportType} - ${project.name}`,
            body: emailBody
          });
        }
        
        toast.success(`הדוח נשלח ל-${recipients.length} נמענים`);
      } else {
        toast.success('הדוח נשמר כטיוטה');
      }

      onClose?.();
    } catch (error) {
      console.error('Error saving report:', error);
      toast.error('שגיאה בשמירת הדוח');
    }
    setLoading(false);
  };

  const generateEmailBody = (data) => {
    return `
<div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #1e40af;">דוח התקדמות ${data.report_type} - ${data.project_name}</h2>
  <p style="color: #64748b;">תקופה: ${format(new Date(data.period_start), 'd/M/yyyy')} - ${format(new Date(data.period_end), 'd/M/yyyy')}</p>
  
  <div style="background: #f0f9ff; padding: 15px; border-radius: 8px; margin: 15px 0;">
    <h3 style="margin: 0; color: #0369a1;">התקדמות כללית: ${data.overall_progress}%</h3>
  </div>

  ${data.highlights ? `
  <h3 style="color: #15803d;">✅ הישגים עיקריים</h3>
  <p>${data.highlights}</p>
  ` : ''}

  <h3 style="color: #1e40af;">📋 משימות שהושלמו (${data.completed_tasks.length})</h3>
  <ul>
    ${data.completed_tasks.map(t => `<li>${t.title}</li>`).join('') || '<li>אין משימות שהושלמו בתקופה זו</li>'}
  </ul>

  ${data.pending_tasks.length > 0 ? `
  <h3 style="color: #d97706;">⏳ משימות בהמתנה</h3>
  <ul>
    ${data.pending_tasks.map(t => `<li>${t.title} (${t.priority})</li>`).join('')}
  </ul>
  ` : ''}

  ${data.issues.length > 0 ? `
  <h3 style="color: #dc2626;">⚠️ בעיות שזוהו</h3>
  <ul>
    ${data.issues.map(i => `<li>${i.description} - ${i.severity}</li>`).join('')}
  </ul>
  ` : ''}

  ${data.next_steps ? `
  <h3 style="color: #7c3aed;">🎯 צעדים הבאים</h3>
  <p>${data.next_steps}</p>
  ` : ''}

  <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin-top: 20px;">
    <h4 style="margin: 0 0 10px 0;">💰 סיכום תקציבי</h4>
    <p style="margin: 5px 0;">תקציב: ₪${data.budget_summary.total_budget.toLocaleString()}</p>
    <p style="margin: 5px 0;">נוצל: ₪${data.budget_summary.spent.toLocaleString()} (${data.budget_summary.utilization_percent}%)</p>
  </div>

  <hr style="margin: 20px 0; border: none; border-top: 1px solid #e2e8f0;">
  <p style="color: #94a3b8; font-size: 12px;">דוח זה נוצר אוטומטית ממערכת ניהול הפרויקטים</p>
</div>
    `;
  };

  const addIssue = () => {
    setIssues([...issues, { description: '', severity: 'בינונית', status: 'פתוח' }]);
  };

  const removeIssue = (index) => {
    setIssues(issues.filter((_, i) => i !== index));
  };

  const addRecipient = () => {
    if (newRecipient && !recipients.includes(newRecipient)) {
      setRecipients([...recipients, newRecipient]);
      setNewRecipient('');
    }
  };

  const reportData = getReportData();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" dir="rtl">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold">יצירת דוח התקדמות - {project.name}</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Report Settings */}
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <Label>סוג דוח</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="שבועי">שבועי</SelectItem>
                  <SelectItem value="חודשי">חודשי</SelectItem>
                  <SelectItem value="רבעוני">רבעוני</SelectItem>
                  <SelectItem value="מיוחד">מיוחד</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>מתאריך</Label>
              <Input
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
              />
            </div>
            <div>
              <Label>עד תאריך</Label>
              <Input
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
              />
            </div>
          </div>

          {/* Auto-calculated Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4 text-center">
                <TrendingUp className="w-6 h-6 text-blue-600 mx-auto mb-1" />
                <div className="text-2xl font-bold text-blue-700">{reportData.overall_progress}%</div>
                <div className="text-xs text-blue-600">התקדמות</div>
              </CardContent>
            </Card>
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4 text-center">
                <CheckCircle2 className="w-6 h-6 text-green-600 mx-auto mb-1" />
                <div className="text-2xl font-bold text-green-700">{reportData.completed_tasks.length}</div>
                <div className="text-xs text-green-600">משימות הושלמו</div>
              </CardContent>
            </Card>
            <Card className="bg-amber-50 border-amber-200">
              <CardContent className="p-4 text-center">
                <Clock className="w-6 h-6 text-amber-600 mx-auto mb-1" />
                <div className="text-2xl font-bold text-amber-700">{reportData.pending_tasks.length}</div>
                <div className="text-xs text-amber-600">בהמתנה</div>
              </CardContent>
            </Card>
            <Card className="bg-purple-50 border-purple-200">
              <CardContent className="p-4 text-center">
                <DollarSign className="w-6 h-6 text-purple-600 mx-auto mb-1" />
                <div className="text-2xl font-bold text-purple-700">{reportData.budget_summary.utilization_percent}%</div>
                <div className="text-xs text-purple-600">ניצול תקציב</div>
              </CardContent>
            </Card>
          </div>

          {/* AI Generate Button */}
          <div className="flex justify-center">
            <Button 
              onClick={generateWithAI} 
              disabled={generating}
              className="bg-gradient-to-r from-purple-600 to-blue-600"
            >
              {generating ? (
                <><Loader2 className="w-4 h-4 ml-2 animate-spin" />מייצר תוכן...</>
              ) : (
                <>✨ יצירת תוכן אוטומטי עם AI</>
              )}
            </Button>
          </div>

          {/* Highlights */}
          <div>
            <Label>הישגים עיקריים</Label>
            <Textarea
              value={highlights}
              onChange={(e) => setHighlights(e.target.value)}
              placeholder="סכם את ההישגים העיקריים בתקופה..."
              rows={3}
            />
          </div>

          {/* Next Steps */}
          <div>
            <Label>צעדים הבאים</Label>
            <Textarea
              value={nextSteps}
              onChange={(e) => setNextSteps(e.target.value)}
              placeholder="מה מתוכנן להמשך..."
              rows={3}
            />
          </div>

          {/* Issues */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>בעיות שזוהו</Label>
              <Button type="button" variant="ghost" size="sm" onClick={addIssue}>
                <Plus className="w-4 h-4 ml-1" />
                הוסף
              </Button>
            </div>
            <div className="space-y-2">
              {issues.map((issue, idx) => (
                <div key={idx} className="flex gap-2 items-start p-3 bg-red-50 rounded-lg border border-red-200">
                  <AlertTriangle className="w-4 h-4 text-red-500 mt-2" />
                  <Input
                    value={issue.description}
                    onChange={(e) => {
                      const updated = [...issues];
                      updated[idx] = { ...issue, description: e.target.value };
                      setIssues(updated);
                    }}
                    placeholder="תיאור הבעיה"
                    className="flex-1"
                  />
                  <Select
                    value={issue.severity}
                    onValueChange={(val) => {
                      const updated = [...issues];
                      updated[idx] = { ...issue, severity: val };
                      setIssues(updated);
                    }}
                  >
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="נמוכה">נמוכה</SelectItem>
                      <SelectItem value="בינונית">בינונית</SelectItem>
                      <SelectItem value="גבוהה">גבוהה</SelectItem>
                      <SelectItem value="קריטית">קריטית</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="icon" onClick={() => removeIssue(idx)}>
                    <X className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label>הערות נוספות</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="הערות כלליות..."
              rows={2}
            />
          </div>

          {/* Recipients */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Mail className="w-4 h-4" />
                נמענים לשליחה
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-3">
                <Input
                  type="email"
                  value={newRecipient}
                  onChange={(e) => setNewRecipient(e.target.value)}
                  placeholder="הוסף אימייל..."
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addRecipient())}
                />
                <Button type="button" onClick={addRecipient}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {recipients.map((email, idx) => (
                  <Badge key={idx} variant="secondary" className="flex items-center gap-1">
                    {email}
                    <X 
                      className="w-3 h-3 cursor-pointer" 
                      onClick={() => setRecipients(recipients.filter((_, i) => i !== idx))}
                    />
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer Actions */}
        <div className="border-t p-4 flex gap-3 justify-end bg-slate-50">
          <Button variant="outline" onClick={onClose}>
            ביטול
          </Button>
          <Button variant="outline" onClick={() => saveReport(false)} disabled={loading}>
            <Download className="w-4 h-4 ml-2" />
            שמור כטיוטה
          </Button>
          <Button 
            onClick={() => saveReport(true)} 
            disabled={loading || recipients.length === 0}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 ml-2 animate-spin" />שולח...</>
            ) : (
              <><Send className="w-4 h-4 ml-2" />שלח דוח</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}