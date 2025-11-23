import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  Sparkles, 
  Wand2, 
  FileText, 
  Send, 
  Copy, 
  CheckCircle, 
  Loader2,
  Download,
  Mail
} from "lucide-react";
import ReactMarkdown from "react-markdown";

export default function ProjectAIAssistant({ project, client, subtasks }) {
  const [activeTab, setActiveTab] = useState("description");
  const [generating, setGenerating] = useState(false);
  const [content, setContent] = useState("");
  const [contentType, setContentType] = useState("professional");
  const [copied, setCopied] = useState(false);

  const generateDescription = async () => {
    setGenerating(true);
    try {
      const prompt = `צור תיאור מפורט ומקצועי לפרויקט הבא.

פרטי הפרויקט:
- שם: ${project.name}
- לקוח: ${project.client_name}
- סוג: ${project.type}
- מיקום: ${project.location || 'לא צוין'}
- שטח: ${project.area ? `${project.area} מ"ר` : 'לא צוין'}
- תקציב: ${project.budget ? `${project.budget.toLocaleString()} ₪` : 'לא צוין'}
- סטטוס: ${project.status}
${project.description ? `- תיאור נוכחי: ${project.description}` : ''}

תת-משימות (${subtasks?.length || 0}):
${subtasks?.map(st => `- ${st.title}`).join('\n') || 'אין תת-משימות'}

כתוב תיאור מקצועי ומעניין בעברית שכולל:
1. סקירה כללית של הפרויקט
2. יעדים ומטרות
3. היקף העבודה
4. מאפיינים ייחודיים
5. ערך ללקוח

השתמש בסגנון ${contentType === 'professional' ? 'מקצועי ורשמי' : contentType === 'friendly' ? 'ידידותי וקליל' : 'טכני ומפורט'}.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: false
      });

      setContent(result);
    } catch (error) {
      console.error('Error generating description:', error);
      alert('שגיאה ביצירת התיאור');
    }
    setGenerating(false);
  };

  const generateUpdate = async () => {
    setGenerating(true);
    try {
      const completedTasks = subtasks?.filter(st => st.status === 'הושלם') || [];
      const inProgressTasks = subtasks?.filter(st => st.status === 'בתהליך') || [];
      
      const prompt = `כתוב עדכון התקדמות מקצועי ללקוח על הפרויקט.

פרטי הפרויקט:
- שם: ${project.name}
- לקוח: ${project.client_name}
- סטטוס: ${project.status}
- התקדמות כללית: ${project.progress || 0}%
- תאריך התחלה: ${project.start_date || 'לא צוין'}
- תאריך סיום משוער: ${project.end_date || 'לא צוין'}

משימות שהושלמו (${completedTasks.length}):
${completedTasks.slice(0, 5).map(st => `✓ ${st.title}`).join('\n') || 'אין משימות מושלמות'}

משימות בביצוע (${inProgressTasks.length}):
${inProgressTasks.slice(0, 5).map(st => `• ${st.title}`).join('\n') || 'אין משימות בביצוע'}

כתוב עדכון ${contentType === 'professional' ? 'מקצועי ורשמי' : contentType === 'friendly' ? 'ידידותי וחם' : 'תמציתי ולעניין'} בעברית שכולל:
1. פתיחה חמה ללקוח (שלום ${client?.name || project.client_name})
2. סטטוס נוכחי והתקדמות
3. הישגים עיקריים
4. מה בתהליך כעת
5. צעדים הבאים
6. סיום מעודד

השתמש בטון ${contentType === 'professional' ? 'מקצועי אך חם' : contentType === 'friendly' ? 'ידידותי ומעודד' : 'ישיר ותמציתי'}.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: false
      });

      setContent(result);
    } catch (error) {
      console.error('Error generating update:', error);
      alert('שגיאה ביצירת העדכון');
    }
    setGenerating(false);
  };

  const generateProgressSummary = async () => {
    setGenerating(true);
    try {
      const tasks = await base44.entities.Task.filter({ project_id: project.id }).catch(() => []);
      
      const prompt = `צור סיכום מפורט של התקדמות הפרויקט.

פרטי הפרויקט:
- שם: ${project.name}
- לקוח: ${client?.name || project.client_name}
- סטטוס: ${project.status}
- התקדמות: ${project.progress || 0}%
- תקציב: ${project.budget ? `${project.budget.toLocaleString()} ₪` : 'לא צוין'}
- תקציב משוער: ${project.estimated_budget ? `${project.estimated_budget.toLocaleString()} ₪` : 'לא צוין'}

תת-משימות (${subtasks?.length || 0}):
${subtasks?.map(st => `- ${st.title} [${st.status}] - התקדמות: ${st.progress || 0}%`).join('\n') || 'אין תת-משימות'}

משימות כלליות (${tasks.length}):
${tasks.map(t => `- ${t.title} [${t.status}]`).join('\n') || 'אין משימות'}

צור סיכום מקיף בעברית שכולל:

## 📊 סטטוס כללי
[סטטוס נוכחי ואחוז התקדמות]

## ✅ הישגים עיקריים
[מה הושג עד כה]

## 🚧 בתהליך כעת
[על מה אנחנו עובדים]

## 📅 לוח זמנים
[עמידה בלוח זמנים / עיכובים]

## 💰 תקציב
[מצב תקציבי]

## ⏭️ צעדים הבאים
[מה מתוכנן]

## 💡 הערות חשובות
[אם יש]

השתמש בשפה ${contentType === 'professional' ? 'מקצועית' : contentType === 'friendly' ? 'ידידותית' : 'תמציתית'} וברורה.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: false
      });

      setContent(result);
    } catch (error) {
      console.error('Error generating summary:', error);
      alert('שגיאה ביצירת הסיכום');
    }
    setGenerating(false);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadContent = () => {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeTab}-${project.name}-${new Date().toISOString().split('T')[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const sendToClient = async () => {
    if (!client?.email) {
      alert('אין כתובת אימייל ללקוח');
      return;
    }

    try {
      const subjects = {
        description: `פרטי הפרויקט - ${project.name}`,
        update: `עדכון התקדמות - ${project.name}`,
        summary: `סיכום מצב - ${project.name}`
      };

      await base44.integrations.Core.SendEmail({
        to: client.email,
        subject: subjects[activeTab],
        body: content
      });

      await base44.entities.CommunicationMessage.create({
        client_id: client.id,
        client_name: client.name,
        project_id: project.id,
        project_name: project.name,
        type: 'email',
        direction: 'out',
        subject: subjects[activeTab],
        body: content
      });

      alert('התוכן נשלח בהצלחה ללקוח');
    } catch (error) {
      console.error('Error sending to client:', error);
      alert('שגיאה בשליחת התוכן');
    }
  };

  return (
    <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">עוזר AI לפרויקט</h2>
            <p className="text-sm text-slate-600">יצירת תוכן מקצועי אוטומטית</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setContent(""); }}>
          <TabsList className="grid grid-cols-3 w-full mb-6">
            <TabsTrigger value="description" className="gap-2">
              <FileText className="w-4 h-4" />
              תיאור פרויקט
            </TabsTrigger>
            <TabsTrigger value="update" className="gap-2">
              <Send className="w-4 h-4" />
              עדכון ללקוח
            </TabsTrigger>
            <TabsTrigger value="summary" className="gap-2">
              <Sparkles className="w-4 h-4" />
              סיכום התקדמות
            </TabsTrigger>
          </TabsList>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">סגנון כתיבה</label>
            <Select value={contentType} onValueChange={setContentType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="professional">מקצועי ורשמי</SelectItem>
                <SelectItem value="friendly">ידידותי וחם</SelectItem>
                <SelectItem value="concise">תמציתי ולעניין</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <TabsContent value="description">
            {!content ? (
              <div className="text-center py-8">
                <FileText className="w-16 h-16 text-indigo-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  תיאור פרויקט אוטומטי
                </h3>
                <p className="text-slate-600 mb-6">
                  צור תיאור מקצועי ומפורט של הפרויקט על בסיס הנתונים הקיימים
                </p>
                <Button
                  onClick={generateDescription}
                  disabled={generating}
                  className="bg-indigo-600 hover:bg-indigo-700 gap-2"
                >
                  {generating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      מייצר...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4" />
                      צור תיאור
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <ContentDisplay 
                content={content}
                onCopy={copyToClipboard}
                onDownload={downloadContent}
                onSend={sendToClient}
                onReset={() => setContent("")}
                copied={copied}
                client={client}
              />
            )}
          </TabsContent>

          <TabsContent value="update">
            {!content ? (
              <div className="text-center py-8">
                <Send className="w-16 h-16 text-purple-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  עדכון ללקוח
                </h3>
                <p className="text-slate-600 mb-6">
                  צור הודעת עדכון מותאמת אישית עם סטטוס והתקדמות נוכחיים
                </p>
                <Button
                  onClick={generateUpdate}
                  disabled={generating}
                  className="bg-purple-600 hover:bg-purple-700 gap-2"
                >
                  {generating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      מייצר...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4" />
                      צור עדכון
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <ContentDisplay 
                content={content}
                onCopy={copyToClipboard}
                onDownload={downloadContent}
                onSend={sendToClient}
                onReset={() => setContent("")}
                copied={copied}
                client={client}
              />
            )}
          </TabsContent>

          <TabsContent value="summary">
            {!content ? (
              <div className="text-center py-8">
                <Sparkles className="w-16 h-16 text-blue-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  סיכום מקיף
                </h3>
                <p className="text-slate-600 mb-6">
                  צור סיכום מפורט של ההתקדמות, הישגים וצעדים הבאים
                </p>
                <Button
                  onClick={generateProgressSummary}
                  disabled={generating}
                  className="bg-blue-600 hover:bg-blue-700 gap-2"
                >
                  {generating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      מייצר...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4" />
                      צור סיכום
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <ContentDisplay 
                content={content}
                onCopy={copyToClipboard}
                onDownload={downloadContent}
                onSend={sendToClient}
                onReset={() => setContent("")}
                copied={copied}
                client={client}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Card>
  );
}

function ContentDisplay({ content, onCopy, onDownload, onSend, onReset, copied, client }) {
  const [editing, setEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(content);

  return (
    <div>
      <div className="mb-4">
        <Badge className="bg-green-600 gap-1 mb-3">
          <CheckCircle className="w-3 h-3" />
          נוצר בהצלחה
        </Badge>

        {editing ? (
          <Textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            rows={15}
            className="font-sans"
          />
        ) : (
          <Card className="p-4 max-h-96 overflow-y-auto">
            <div className="prose prose-slate max-w-none">
              <ReactMarkdown>{editedContent}</ReactMarkdown>
            </div>
          </Card>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => setEditing(!editing)}
          variant="outline"
          className="gap-2"
        >
          {editing ? 'סיום עריכה' : 'ערוך'}
        </Button>

        <Button
          onClick={onCopy}
          variant="outline"
          className="gap-2"
        >
          {copied ? (
            <>
              <CheckCircle className="w-4 h-4" />
              הועתק!
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              העתק
            </>
          )}
        </Button>

        <Button
          onClick={onDownload}
          variant="outline"
          className="gap-2"
        >
          <Download className="w-4 h-4" />
          הורד
        </Button>

        {client?.email && (
          <Button
            onClick={onSend}
            className="bg-blue-600 hover:bg-blue-700 gap-2"
          >
            <Mail className="w-4 h-4" />
            שלח ללקוח
          </Button>
        )}

        <Button
          onClick={onReset}
          variant="outline"
          className="mr-auto"
        >
          צור מחדש
        </Button>
      </div>
    </div>
  );
}