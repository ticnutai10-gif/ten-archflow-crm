import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Sparkles, 
  RefreshCw, 
  Download, 
  Calendar,
  TrendingUp,
  AlertCircle,
  ArrowRight,
  BarChart3
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

export default function ProjectSummaryReport({ projectId, projectName }) {
  const [period, setPeriod] = useState('weekly');
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);

  const generateSummary = async () => {
    setLoading(true);
    try {
      const response = await base44.functions.invoke('generateProjectSummary', {
        projectId,
        period
      });

      if (response.data?.success) {
        setSummary(response.data);
        toast.success('סיכום נוצר בהצלחה!');
      } else {
        throw new Error(response.data?.error || 'Failed to generate summary');
      }
    } catch (error) {
      console.error('Error generating summary:', error);
      toast.error('שגיאה ביצירת הסיכום: ' + error.message);
    }
    setLoading(false);
  };

  const downloadSummary = () => {
    if (!summary) return;

    const markdown = `# סיכום פרויקט: ${summary.project.name}

**לקוח:** ${summary.project.client}  
**תקופה:** ${period === 'weekly' ? 'שבוע אחרון' : 'חודש אחרון'}  
**תאריך יצירה:** ${new Date(summary.generatedAt).toLocaleDateString('he-IL')}

---

## סטטיסטיקות

- **אחוז התקדמות:** ${summary.statistics.progress}%
- **סה"כ תת-משימות:** ${summary.statistics.totalSubtasks}
- **הושלמו:** ${summary.statistics.completedSubtasks}
- **בתהליך:** ${summary.statistics.inProgressSubtasks}
- **שעות משוערות:** ${Math.round(summary.statistics.totalEstimatedHours)}
- **שעות בפועל:** ${Math.round(summary.statistics.totalActualHours)}

---

${summary.summary.summary || ''}
`;

    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `summary-${projectName}-${period}-${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="border-0 shadow-lg" dir="rtl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            סיכום פרויקט מבוסס AI
          </CardTitle>
          <div className="flex items-center gap-3">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">שבועי</SelectItem>
                <SelectItem value="monthly">חודשי</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={generateSummary}
              disabled={loading}
              className="bg-purple-600 hover:bg-purple-700 gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  מייצר...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  צור סיכום
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {!summary && !loading && (
          <div className="text-center py-12">
            <Sparkles className="w-16 h-16 text-purple-300 mx-auto mb-4" />
            <p className="text-slate-600 mb-4">
              לחץ על "צור סיכום" כדי לקבל סיכום מקצועי מבוסס AI
            </p>
            <p className="text-sm text-slate-500">
              הסיכום ינתח את התקדמות הפרויקט, משאבים, ויציע צעדים הבאים
            </p>
          </div>
        )}

        {loading && (
          <div className="py-12">
            <div className="flex flex-col items-center gap-4">
              <RefreshCw className="w-12 h-12 text-purple-600 animate-spin" />
              <p className="text-slate-600">מייצר סיכום מקצועי...</p>
              <p className="text-sm text-slate-500">זה עשוי לקחת מספר שניות</p>
            </div>
          </div>
        )}

        {summary && !loading && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900">{summary.project.name}</h3>
                <p className="text-sm text-slate-600">
                  לקוח: {summary.project.client} | תקופה: {period === 'weekly' ? 'שבוע אחרון' : 'חודש אחרון'}
                </p>
              </div>
              <Button
                variant="outline"
                onClick={downloadSummary}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                הורד
              </Button>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-sm text-blue-600 mb-1">התקדמות</div>
                <div className="text-2xl font-bold text-blue-900">
                  {summary.statistics.progress}%
                </div>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <div className="text-sm text-green-600 mb-1">הושלמו</div>
                <div className="text-2xl font-bold text-green-900">
                  {summary.statistics.completedSubtasks}/{summary.statistics.totalSubtasks}
                </div>
              </div>
              <div className="bg-amber-50 rounded-lg p-4">
                <div className="text-sm text-amber-600 mb-1">שעות בפועל</div>
                <div className="text-2xl font-bold text-amber-900">
                  {Math.round(summary.statistics.totalActualHours)}
                </div>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="text-sm text-purple-600 mb-1">בתהליך</div>
                <div className="text-2xl font-bold text-purple-900">
                  {summary.statistics.inProgressSubtasks}
                </div>
              </div>
            </div>

            {/* AI Summary Sections */}
            {summary.summary.overall_status && (
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <BarChart3 className="w-5 h-5 text-slate-600" />
                  <h4 className="font-semibold text-slate-900">סטטוס כללי</h4>
                </div>
                <p className="text-slate-700 leading-relaxed">{summary.summary.overall_status}</p>
              </div>
            )}

            {summary.summary.achievements && summary.summary.achievements.length > 0 && (
              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  <h4 className="font-semibold text-green-900">יעדים שהושגו</h4>
                </div>
                <ul className="space-y-2">
                  {summary.summary.achievements.map((achievement, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-slate-700">
                      <span className="text-green-600 mt-1">✓</span>
                      <span>{achievement}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {summary.summary.challenges && summary.summary.challenges.length > 0 && (
              <div className="bg-red-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <h4 className="font-semibold text-red-900">אתגרים ובעיות</h4>
                </div>
                <ul className="space-y-2">
                  {summary.summary.challenges.map((challenge, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-slate-700">
                      <span className="text-red-600 mt-1">•</span>
                      <span>{challenge}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {summary.summary.next_steps && summary.summary.next_steps.length > 0 && (
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <ArrowRight className="w-5 h-5 text-blue-600" />
                  <h4 className="font-semibold text-blue-900">צעדים הבאים</h4>
                </div>
                <ul className="space-y-2">
                  {summary.summary.next_steps.map((step, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-slate-700">
                      <span className="text-blue-600 mt-1">→</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {summary.summary.resource_analysis && (
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="w-5 h-5 text-purple-600" />
                  <h4 className="font-semibold text-purple-900">ניתוח משאבים</h4>
                </div>
                <p className="text-slate-700 leading-relaxed">{summary.summary.resource_analysis}</p>
              </div>
            )}

            <div className="text-xs text-slate-500 text-center pt-4 border-t">
              נוצר ב-{new Date(summary.generatedAt).toLocaleDateString('he-IL', { 
                day: 'numeric', 
                month: 'long', 
                year: 'numeric', 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}