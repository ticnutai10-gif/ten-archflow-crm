import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, Brain, Loader2, Calendar, CheckSquare, 
  Key, AlertTriangle, Sparkles, Copy, X, RefreshCw
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function AIDocumentSummarizer({ fileUrl, fileName, onClose, onSummaryGenerated }) {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);

  const analyzeDocument = async () => {
    if (!fileUrl) {
      toast.error('לא נמצא קובץ לניתוח');
      return;
    }

    setLoading(true);
    try {
      // Get file URL - handle private files if needed
      let accessibleUrl = fileUrl;
      if (fileUrl.startsWith('private://') || fileUrl.includes('/private/')) {
        const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({
          file_uri: fileUrl,
          expires_in: 300
        });
        accessibleUrl = signed_url;
      }

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `אתה מומחה לניתוח מסמכים עסקיים. נתח את המסמך המצורף וספק סיכום מקיף בעברית.

הפק את המידע הבא:
1. סיכום כללי (2-3 משפטים)
2. מונחי מפתח - רשימת מונחים חשובים מהמסמך
3. פריטי פעולה (Action Items) - משימות שצריך לבצע
4. תאריכי יעד וזמנים חשובים
5. סכומים כספיים חשובים (אם יש)
6. נקודות קריטיות שדורשות תשומת לב

שם הקובץ: ${fileName}`,
        file_urls: [accessibleUrl],
        response_json_schema: {
          type: "object",
          properties: {
            general_summary: {
              type: "string",
              description: "סיכום כללי של המסמך"
            },
            key_terms: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  term: { type: "string" },
                  explanation: { type: "string" }
                }
              },
              description: "מונחי מפתח חשובים"
            },
            action_items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  task: { type: "string" },
                  responsible: { type: "string" },
                  priority: { type: "string", enum: ["גבוהה", "בינונית", "נמוכה"] }
                }
              },
              description: "פריטי פעולה"
            },
            deadlines: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  date: { type: "string" },
                  description: { type: "string" }
                }
              },
              description: "תאריכי יעד"
            },
            financial_items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  amount: { type: "string" },
                  description: { type: "string" }
                }
              },
              description: "סכומים כספיים"
            },
            critical_points: {
              type: "array",
              items: { type: "string" },
              description: "נקודות קריטיות"
            },
            document_type: {
              type: "string",
              description: "סוג המסמך (הסכם, סיכום פגישה, הצעת מחיר וכו')"
            }
          }
        }
      });

      setSummary(response);
      if (onSummaryGenerated) {
        onSummaryGenerated(response);
      }
      toast.success('הניתוח הושלם בהצלחה');
    } catch (error) {
      console.error('Error analyzing document:', error);
      toast.error('שגיאה בניתוח המסמך');
    }
    setLoading(false);
  };

  const copyToClipboard = () => {
    if (!summary) return;
    
    const text = `סיכום מסמך: ${fileName}
    
${summary.general_summary}

מונחי מפתח:
${summary.key_terms?.map(t => `• ${t.term}: ${t.explanation}`).join('\n') || 'אין'}

פריטי פעולה:
${summary.action_items?.map(a => `• ${a.task} (${a.priority})`).join('\n') || 'אין'}

תאריכי יעד:
${summary.deadlines?.map(d => `• ${d.date}: ${d.description}`).join('\n') || 'אין'}
`;
    
    navigator.clipboard.writeText(text);
    toast.success('הועתק ללוח');
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'גבוהה': return 'bg-red-100 text-red-700';
      case 'בינונית': return 'bg-amber-100 text-amber-700';
      case 'נמוכה': return 'bg-green-100 text-green-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-purple-700">
            <Brain className="w-5 h-5" />
            סיכום AI למסמך
          </CardTitle>
          <div className="flex gap-2">
            {summary && (
              <Button variant="ghost" size="sm" onClick={copyToClipboard}>
                <Copy className="w-4 h-4" />
              </Button>
            )}
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
        <p className="text-sm text-slate-600 flex items-center gap-2">
          <FileText className="w-4 h-4" />
          {fileName}
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {!summary && !loading && (
          <Button 
            onClick={analyzeDocument} 
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            <Sparkles className="w-4 h-4 ml-2" />
            נתח מסמך עם AI
          </Button>
        )}

        {loading && (
          <div className="text-center py-8">
            <Loader2 className="w-10 h-10 text-purple-500 animate-spin mx-auto mb-3" />
            <p className="text-slate-600">מנתח את המסמך...</p>
            <p className="text-xs text-slate-500 mt-1">זה עשוי לקחת מספר שניות</p>
          </div>
        )}

        {summary && (
          <div className="space-y-4">
            {/* Document Type */}
            {summary.document_type && (
              <Badge className="bg-purple-100 text-purple-700">
                {summary.document_type}
              </Badge>
            )}

            {/* General Summary */}
            <div className="p-3 bg-white rounded-lg border">
              <h4 className="font-semibold text-slate-700 mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-500" />
                סיכום כללי
              </h4>
              <p className="text-sm text-slate-600">{summary.general_summary}</p>
            </div>

            {/* Key Terms */}
            {summary.key_terms?.length > 0 && (
              <div className="p-3 bg-white rounded-lg border">
                <h4 className="font-semibold text-slate-700 mb-2 flex items-center gap-2">
                  <Key className="w-4 h-4 text-amber-500" />
                  מונחי מפתח
                </h4>
                <div className="flex flex-wrap gap-2">
                  {summary.key_terms.map((term, idx) => (
                    <div key={idx} className="group relative">
                      <Badge variant="outline" className="cursor-help">
                        {term.term}
                      </Badge>
                      {term.explanation && (
                        <div className="absolute bottom-full right-0 mb-1 hidden group-hover:block z-10 w-48 p-2 bg-slate-800 text-white text-xs rounded shadow-lg">
                          {term.explanation}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Items */}
            {summary.action_items?.length > 0 && (
              <div className="p-3 bg-white rounded-lg border">
                <h4 className="font-semibold text-slate-700 mb-2 flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-green-500" />
                  פריטי פעולה ({summary.action_items.length})
                </h4>
                <ul className="space-y-2">
                  {summary.action_items.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <Badge className={`${getPriorityColor(item.priority)} text-xs shrink-0`}>
                        {item.priority}
                      </Badge>
                      <span className="text-slate-600">{item.task}</span>
                      {item.responsible && (
                        <span className="text-slate-400 text-xs">({item.responsible})</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Deadlines */}
            {summary.deadlines?.length > 0 && (
              <div className="p-3 bg-white rounded-lg border">
                <h4 className="font-semibold text-slate-700 mb-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-red-500" />
                  תאריכי יעד
                </h4>
                <ul className="space-y-1">
                  {summary.deadlines.map((deadline, idx) => (
                    <li key={idx} className="text-sm flex items-center gap-2">
                      <span className="font-medium text-red-600">{deadline.date}</span>
                      <span className="text-slate-600">- {deadline.description}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Financial Items */}
            {summary.financial_items?.length > 0 && (
              <div className="p-3 bg-white rounded-lg border">
                <h4 className="font-semibold text-slate-700 mb-2 flex items-center gap-2">
                  ₪ סכומים כספיים
                </h4>
                <ul className="space-y-1">
                  {summary.financial_items.map((item, idx) => (
                    <li key={idx} className="text-sm flex items-center gap-2">
                      <span className="font-bold text-green-600">{item.amount}</span>
                      <span className="text-slate-600">- {item.description}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Critical Points */}
            {summary.critical_points?.length > 0 && (
              <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                <h4 className="font-semibold text-red-700 mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  נקודות קריטיות
                </h4>
                <ul className="space-y-1">
                  {summary.critical_points.map((point, idx) => (
                    <li key={idx} className="text-sm text-red-600 flex items-start gap-2">
                      <span className="text-red-400">•</span>
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Refresh Button */}
            <Button 
              variant="outline" 
              onClick={analyzeDocument}
              className="w-full"
            >
              <RefreshCw className="w-4 h-4 ml-2" />
              נתח מחדש
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}