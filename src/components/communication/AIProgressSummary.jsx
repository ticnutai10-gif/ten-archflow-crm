import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Download, Mail, Loader2, CheckCircle } from "lucide-react";
import ReactMarkdown from "react-markdown";

export default function AIProgressSummary({ project, client }) {
  const [summary, setSummary] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);

  const generateSummary = async () => {
    setGenerating(true);
    try {
      // Fetch related data
      const [tasks, subtasks] = await Promise.all([
        base44.entities.Task.filter({ project_id: project.id }).catch(() => []),
        base44.entities.SubTask.filter({ project_id: project.id }).catch(() => [])
      ]);

      const prompt = `צור סיכום מפורט והכי מועיל של התקדמות הפרויקט עבור הלקוח.

פרטי הפרויקט:
- שם: ${project.name}
- לקוח: ${client?.name || project.client_name}
- סטטוס: ${project.status}
- התקדמות: ${project.progress || 0}%
- תקציב: ${project.budget || 'לא צוין'}
- תאריך התחלה: ${project.start_date || 'לא צוין'}
- תאריך סיום משוער: ${project.end_date || 'לא צוין'}

משימות (${tasks.length}):
${tasks.map(t => `- ${t.title} [${t.status}]`).join('\n')}

תת-משימות (${subtasks.length}):
${subtasks.map(st => `- ${st.title} [${st.status}] - ${st.progress || 0}%`).join('\n')}

צור סיכום ידידותי ומקצועי בעברית שכולל:
1. סטטוס כללי
2. הישגים עיקריים
3. מה בתהליך כרגע
4. צעדים הבאים
5. הערות או עדכונים חשובים

השתמש בפסקאות קצרות וברורות. התחל ב"שלום ${client?.name || 'יקר/ה'},"`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: false
      });

      setSummary(result);
    } catch (error) {
      console.error('Error generating summary:', error);
      alert('שגיאה ביצירת הסיכום');
    }
    setGenerating(false);
  };

  const sendToClient = async () => {
    if (!client?.email) {
      alert('אין כתובת אימייל ללקוח');
      return;
    }

    setSending(true);
    try {
      await base44.integrations.Core.SendEmail({
        to: client.email,
        subject: `עדכון התקדמות - ${project.name}`,
        body: summary
      });

      // Log in communication history
      await base44.entities.CommunicationMessage.create({
        client_id: client.id,
        client_name: client.name,
        project_id: project.id,
        project_name: project.name,
        type: 'email',
        direction: 'out',
        subject: `עדכון התקדמות - ${project.name}`,
        body: summary
      });

      alert('הסיכום נשלח בהצלחה ללקוח');
    } catch (error) {
      console.error('Error sending summary:', error);
      alert('שגיאה בשליחת הסיכום');
    }
    setSending(false);
  };

  const downloadSummary = () => {
    const blob = new Blob([summary], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `סיכום-${project.name}-${new Date().toISOString().split('T')[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      {!summary ? (
        <Card className="p-8 text-center">
          <Sparkles className="w-12 h-12 text-purple-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-900 mb-2">
            סיכום התקדמות מבוסס AI
          </h3>
          <p className="text-slate-600 mb-6">
            צור סיכום מקצועי ומפורט של התקדמות הפרויקט עבור הלקוח
          </p>
          <Button
            onClick={generateSummary}
            disabled={generating}
            className="bg-purple-600 hover:bg-purple-700 gap-2"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                מייצר סיכום...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                צור סיכום
              </>
            )}
          </Button>
        </Card>
      ) : (
        <div>
          <Card className="p-6 mb-4">
            <div className="flex items-center gap-2 mb-4">
              <Badge className="bg-green-600 gap-1">
                <CheckCircle className="w-3 h-3" />
                נוצר בהצלחה
              </Badge>
            </div>
            
            <div className="prose prose-slate max-w-none">
              <ReactMarkdown>{summary}</ReactMarkdown>
            </div>
          </Card>

          <div className="flex gap-3">
            <Button
              onClick={sendToClient}
              disabled={sending}
              className="flex-1 bg-blue-600 hover:bg-blue-700 gap-2"
            >
              {sending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  שולח...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4" />
                  שלח ללקוח
                </>
              )}
            </Button>

            <Button
              onClick={downloadSummary}
              variant="outline"
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              הורד
            </Button>

            <Button
              onClick={() => setSummary(null)}
              variant="outline"
            >
              צור מחדש
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}