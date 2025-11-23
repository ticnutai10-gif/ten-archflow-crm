import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function SmartAgendaGenerator({ clientId, projectId, onAgendaGenerated }) {
  const [generating, setGenerating] = useState(false);

  const generateAgenda = async () => {
    setGenerating(true);
    try {
      // Fetch context
      const [projects, clients, tasks, decisions, communications] = await Promise.all([
        projectId ? base44.entities.Project.filter({ id: projectId }).catch(() => []) : Promise.resolve([]),
        clientId ? base44.entities.Client.filter({ id: clientId }).catch(() => []) : Promise.resolve([]),
        projectId ? base44.entities.Task.filter({ project_id: projectId, status: { $ne: 'הושלמה' } }).catch(() => []) : Promise.resolve([]),
        projectId ? base44.entities.Decision.filter({ project_id: projectId }, '-created_date', 5).catch(() => []) : Promise.resolve([]),
        clientId ? base44.entities.CommunicationMessage.filter({ client_id: clientId }, '-created_date', 5).catch(() => []) : Promise.resolve([])
      ]);

      const project = projects[0];
      const client = clients[0];

      const prompt = `
אתה עוזר AI לניהול פרויקטים אדריכליים. צור סדר יום מפורט ומקצועי לפגישה.

הקשר הפגישה:
${client ? `- לקוח: ${client.name} (שלב: ${client.stage || 'לא מוגדר'}, סטטוס: ${client.status || 'לא מוגדר'})` : ''}
${project ? `- פרויקט: ${project.name} (${project.type}, סטטוס: ${project.status}, התקדמות: ${project.progress || 0}%)` : ''}
${project && project.description ? `- תיאור: ${project.description}` : ''}

משימות פתוחות (${tasks.length}):
${tasks.slice(0, 5).map(t => `- ${t.title} (${t.status}, עדיפות: ${t.priority || 'רגילה'})`).join('\n')}

החלטות אחרונות (${decisions.length}):
${decisions.map(d => `- ${d.title}: ${d.description?.substring(0, 80)}`).join('\n')}

תקשורת אחרונה:
${communications.slice(0, 3).map(c => `- ${c.subject || 'ללא נושא'}: ${c.body?.substring(0, 60) || ''}`).join('\n')}

הנחיות:
1. צור רשימת נושאים לסדר יום הפגישה (4-8 פריטים)
2. כל פריט צריך להיות קצר, ממוקד ופרקטי
3. התחל בנושאים קריטיים, סיים בסיכום וצעדים הבאים
4. התאם את הנושאים לשלב הפרויקט/לקוח הנוכחי
5. החזר רשימה של פריטי סדר יום בלבד, כל פריט בשורה נפרדת, ללא מספור או נקודות

פורמט תשובה: כל שורה = פריט אחד בסדר היום (ללא סימון, מספור או תבליטים)
`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: false
      });

      // Parse agenda items
      const agendaItems = result
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#') && !line.startsWith('*') && !line.startsWith('-'))
        .map(item => item.replace(/^\d+\.\s*/, '').replace(/^[-*•]\s*/, ''))
        .filter(item => item.length > 5)
        .map(item => ({ item, completed: false }));

      if (agendaItems.length > 0) {
        onAgendaGenerated(agendaItems);
        toast.success(`✨ סדר יום עם ${agendaItems.length} נושאים נוצר!`);
      } else {
        toast.error('לא הצלחתי ליצור סדר יום מתאים');
      }
    } catch (error) {
      console.error('Error generating agenda:', error);
      toast.error('שגיאה ביצירת סדר יום');
    }
    setGenerating(false);
  };

  return (
    <Button
      type="button"
      variant="outline"
      onClick={generateAgenda}
      disabled={generating}
      className="w-full gap-2"
    >
      {generating ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          יוצר סדר יום חכם...
        </>
      ) : (
        <>
          <Sparkles className="w-4 h-4" />
          צור סדר יום אוטומטי
        </>
      )}
    </Button>
  );
}