import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Sparkles, Loader2, Copy, Mail } from 'lucide-react';
import { toast } from 'sonner';

export default function SmartEmailSuggester({ communication, onUseSuggestion }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);

  const analyzeSentiment = (text) => {
    const positive = ['תודה', 'מעולה', 'מצוין', 'נהדר', 'שמח', 'מרוצה', 'אהבתי'];
    const negative = ['בעיה', 'לא', 'מאוכזב', 'דחוף', 'טעות', 'כועס', 'לא מרוצה'];
    
    const lowerText = text.toLowerCase();
    const positiveCount = positive.filter(w => lowerText.includes(w)).length;
    const negativeCount = negative.filter(w => lowerText.includes(w)).length;
    
    if (negativeCount > positiveCount) return 'negative';
    if (positiveCount > negativeCount) return 'positive';
    return 'neutral';
  };

  const generateSuggestions = async () => {
    setLoading(true);
    try {
      const sentiment = analyzeSentiment(communication.body || communication.subject || '');
      
      const [client, project] = await Promise.all([
        communication.client_id ? base44.entities.Client.filter({ id: communication.client_id }).catch(() => []) : Promise.resolve([]),
        communication.project_id ? base44.entities.Project.filter({ id: communication.project_id }).catch(() => []) : Promise.resolve([])
      ]);

      const prompt = `
אתה עוזר AI למערכת CRM. צור 3 הצעות תגובה למייל של לקוח.

הקשר:
לקוח: ${client[0]?.name || communication.client_name || 'לא ידוע'}
${project[0] ? `פרויקט: ${project[0].name} (${project[0].status})` : ''}

המייל המקורי:
נושא: ${communication.subject || 'ללא נושא'}
תוכן: ${communication.body || ''}

ניתוח סנטימנט: ${sentiment === 'positive' ? 'חיובי' : sentiment === 'negative' ? 'שלילי' : 'ניטרלי'}

צור 3 תגובות:
1. תגובה קצרה ומקצועית
2. תגובה ידידותית ומפורטת
3. תגובה דחופה/מיידית (במידה ונדרש)

כל תגובה צריכה:
- להתאים לטון ולתוכן של המייל המקורי
- להיות מנומסת ומקצועית
- להציע פתרון או צעד הבא ברור
- להיות בעברית תקנית

החזר את התגובות בפורמט:
===RESPONSE1===
[תוכן תגובה 1]
===RESPONSE2===
[תוכן תגובה 2]
===RESPONSE3===
[תוכן תגובה 3]
`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: false
      });

      // Parse responses
      const parts = result.split(/===RESPONSE\d+===/);
      const responses = parts
        .slice(1)
        .map(r => r.trim())
        .filter(r => r.length > 10);

      if (responses.length > 0) {
        setSuggestions(responses);
        toast.success(`✨ ${responses.length} הצעות תגובה נוצרו!`);
      } else {
        toast.error('לא הצלחתי ליצור הצעות תגובה');
      }
    } catch (error) {
      console.error('Error generating suggestions:', error);
      toast.error('שגיאה ביצירת הצעות');
    }
    setLoading(false);
  };

  const copySuggestion = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('הועתק ללוח');
  };

  return (
    <div className="space-y-3">
      <Button
        variant="outline"
        onClick={generateSuggestions}
        disabled={loading}
        className="w-full gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            יוצר הצעות תגובה...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            הצע תגובות חכמות
          </>
        )}
      </Button>

      {suggestions.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700">הצעות תגובה:</p>
          {suggestions.map((suggestion, idx) => (
            <Card key={idx} className="p-3 bg-gradient-to-br from-purple-50 to-blue-50">
              <div className="flex justify-between items-start gap-2 mb-2">
                <span className="text-xs font-semibold text-purple-700">
                  הצעה {idx + 1}
                </span>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copySuggestion(suggestion)}
                    className="h-6 px-2"
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onUseSuggestion?.(suggestion)}
                    className="h-6 px-2"
                  >
                    <Mail className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{suggestion}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}