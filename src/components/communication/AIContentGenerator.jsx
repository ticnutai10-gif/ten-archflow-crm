import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wand2, Copy, RotateCcw, CheckCircle, Loader2 } from "lucide-react";

export default function AIContentGenerator({ project, onGenerated }) {
  const [contentType, setContentType] = useState("description");
  const [tone, setTone] = useState("professional");
  const [generatedContent, setGeneratedContent] = useState("");
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const contentTypes = {
    description: {
      label: "תיאור פרויקט",
      prompt: "כתוב תיאור מקצועי ומפורט לפרויקט זה שיתאר את המטרות, ההיקף והערך שהוא מביא ללקוח."
    },
    update: {
      label: "עדכון התקדמות",
      prompt: "כתוב עדכון התקדמות קצר וממוקד עבור הלקוח על המצב הנוכחי של הפרויקט."
    },
    milestone: {
      label: "הודעת אבן דרך",
      prompt: "כתוב הודעה מקצועית המודיעה על השגת אבן דרך חשובה בפרויקט."
    },
    proposal: {
      label: "הצעה ראשונית",
      prompt: "כתוב הצעה ראשונית מקצועית המתארת את הפרויקט, יתרונותיו והערך שהוא מביא."
    },
    summary: {
      label: "סיכום ביצוע",
      prompt: "כתוב סיכום מקיף של ביצוע הפרויקט, כולל הישגים, אתגרים ולקחים."
    }
  };

  const tones = {
    professional: "מקצועי ורשמי",
    friendly: "ידידותי וחם",
    technical: "טכני ומפורט",
    concise: "תמציתי ולעניין"
  };

  const generateContent = async () => {
    setGenerating(true);
    try {
      const selectedType = contentTypes[contentType];
      
      const prompt = `${selectedType.prompt}

פרטי הפרויקט:
- שם: ${project.name}
- לקוח: ${project.client_name}
- סטטוס: ${project.status}
- סוג: ${project.type}
- תקציב: ${project.budget ? `${project.budget.toLocaleString()} ₪` : 'לא צוין'}
- התקדמות: ${project.progress || 0}%
- תאריך התחלה: ${project.start_date || 'לא צוין'}
- תאריך סיום: ${project.end_date || 'לא צוין'}
${project.description ? `- תיאור קיים: ${project.description}` : ''}
${project.location ? `- מיקום: ${project.location}` : ''}
${project.area ? `- שטח: ${project.area} מ"ר` : ''}

סגנון כתיבה: ${tones[tone]}

כתוב תוכן בעברית, באופן ${tones[tone]}, מובנה היטב עם פסקאות ברורות. התוכן צריך להיות מוכן לשימוש מיידי.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: false
      });

      setGeneratedContent(result);
    } catch (error) {
      console.error('Error generating content:', error);
      alert('שגיאה ביצירת התוכן');
    }
    setGenerating(false);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const useContent = () => {
    if (onGenerated) {
      onGenerated(generatedContent);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">סוג תוכן</label>
          <Select value={contentType} onValueChange={setContentType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(contentTypes).map(([key, type]) => (
                <SelectItem key={key} value={key}>{type.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">סגנון</label>
          <Select value={tone} onValueChange={setTone}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(tones).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!generatedContent ? (
        <Card className="p-8 text-center">
          <Wand2 className="w-12 h-12 text-indigo-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-900 mb-2">
            יצירת תוכן מבוסס AI
          </h3>
          <p className="text-slate-600 mb-6">
            צור תוכן מקצועי ומותאם אישית עבור הפרויקט
          </p>
          <Button
            onClick={generateContent}
            disabled={generating}
            className="bg-indigo-600 hover:bg-indigo-700 gap-2"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                מייצר תוכן...
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4" />
                צור תוכן
              </>
            )}
          </Button>
        </Card>
      ) : (
        <div>
          <Card className="p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <Badge className="bg-green-600 gap-1">
                <CheckCircle className="w-3 h-3" />
                נוצר בהצלחה
              </Badge>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={copyToClipboard}
                  className="gap-2"
                >
                  {copied ? (
                    <>
                      <CheckCircle className="w-3 h-3" />
                      הועתק
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      העתק
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setGeneratedContent("")}
                  className="gap-2"
                >
                  <RotateCcw className="w-3 h-3" />
                  צור מחדש
                </Button>
              </div>
            </div>

            <Textarea
              value={generatedContent}
              onChange={(e) => setGeneratedContent(e.target.value)}
              rows={12}
              className="font-sans"
            />
          </Card>

          {onGenerated && (
            <Button
              onClick={useContent}
              className="w-full bg-indigo-600 hover:bg-indigo-700"
            >
              השתמש בתוכן זה
            </Button>
          )}
        </div>
      )}
    </div>
  );
}