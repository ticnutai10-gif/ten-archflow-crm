import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Loader2, Send, Sparkles, Trash2, Plus, Mail, CheckCircle, ListTodo, Calendar } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';

export default function AIChat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const executeAction = async (action) => {
    try {
      const params = {};
      action.params.split(',').forEach(p => {
        const [key, ...valueParts] = p.split(':');
        if (key && valueParts.length) {
          params[key.trim()] = valueParts.join(':').trim();
        }
      });

      if (action.type === 'SEND_EMAIL') {
        await base44.integrations.Core.SendEmail({
          to: params.to,
          subject: params.subject,
          body: params.body
        });
        toast.success('✉️ אימייל נשלח בהצלחה!');
      } else if (action.type === 'CREATE_TASK') {
        await base44.entities.Task.create({
          title: params.title,
          priority: params.priority || 'בינונית',
          due_date: params.due_date,
          status: 'חדשה',
          description: params.description || ''
        });
        toast.success('✅ משימה נוצרה בהצלחה!');
      } else if (action.type === 'SCHEDULE_MEETING') {
        await base44.entities.Meeting.create({
          title: params.title,
          meeting_date: params.date,
          participants: params.participants?.split(';') || [],
          status: 'מתוכננת'
        });
        toast.success('📅 פגישה נקבעה בהצלחה!');
      }
    } catch (error) {
      console.error('Action execution error:', error);
      toast.error('❌ שגיאה בביצוע הפעולה');
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const currentUser = await base44.auth.me();
      
      // Load comprehensive data
      const [projects, clients, tasks, communications, decisions, meetings, quotes, timeLogs] = await Promise.all([
        base44.entities.Project.list('-created_date').catch(() => []),
        base44.entities.Client.list('-created_date').catch(() => []),
        base44.entities.Task.filter({ status: { $ne: 'הושלמה' } }, '-created_date', 50).catch(() => []),
        base44.entities.CommunicationMessage.list('-created_date', 30).catch(() => []),
        base44.entities.Decision.list('-created_date', 20).catch(() => []),
        base44.entities.Meeting.list('-meeting_date', 20).catch(() => []),
        base44.entities.Quote.filter({ status: 'בהמתנה' }).catch(() => []),
        base44.entities.TimeLog.filter({ created_by: currentUser.email }, '-log_date', 30).catch(() => [])
      ]);

      const activeProjects = projects.filter(p => p.status !== 'הושלם');
      const urgentTasks = tasks.filter(t => t.priority === 'דחופה' || t.priority === 'גבוהה');
      const upcomingMeetings = meetings.filter(m => new Date(m.meeting_date) >= new Date());
      
      const context = `
אתה עוזר AI חכם למערכת CRM של ${currentUser.full_name || currentUser.email}.

סיכום נתונים מפורט:
- ${activeProjects.length} פרויקטים פעילים מתוך ${projects.length} סה"כ
- ${clients.length} לקוחות במערכת
- ${tasks.length} משימות פתוחות (${urgentTasks.length} דחופות)
- ${communications.length} הודעות תקשורת אחרונות
- ${decisions.length} החלטות תיעוד אחרונות
- ${upcomingMeetings.length} פגישות קרובות
- ${quotes.length} הצעות מחיר בהמתנה
- ${timeLogs.length} רישומי זמן אחרונים

פרטי פרויקטים פעילים:
${activeProjects.slice(0, 10).map(p => `- ${p.name} (לקוח: ${p.client_name}): סטטוס ${p.status}, התקדמות ${p.progress || 0}%`).join('\n')}

משימות דחופות:
${urgentTasks.slice(0, 10).map(t => `- ${t.title} (${t.project_name || 'כללי'}): ${t.status}, עדיפות: ${t.priority}, יעד: ${t.due_date || 'לא הוגדר'}`).join('\n')}

פגישות קרובות:
${upcomingMeetings.slice(0, 5).map(m => `- ${m.title} עם ${m.participants?.join(', ') || 'משתתפים'} ב-${m.meeting_date}`).join('\n')}

תקשורת אחרונה:
${communications.slice(0, 5).map(c => `- ${c.subject || c.body?.substring(0, 50)} (${c.type})`).join('\n')}

הוראות:
1. ענה בצורה מפורטת, מועילה ומקצועית בהתבסס על כל הנתונים
2. הצע פעולות מעקב ספציפיות בפורמט: [ACTION: סוג_פעולה | פרמטרים]
   סוגי פעולות זמינים:
   - SEND_EMAIL: to: כתובת, subject: נושא, body: תוכן
   - CREATE_TASK: title: כותרת, priority: עדיפות, due_date: תאריך, description: תיאור
   - UPDATE_PROJECT: project_id: מזהה, field: שדה, value: ערך
   - SCHEDULE_MEETING: title: כותרת, date: תאריך, participants: משתתפים
3. כשמשתמש מבקש עזרה, הצע פעולות קונקרטיות שיעזרו לו
4. השתמש במידע ההיסטורי כדי לתת המלצות חכמות ומותאמות אישית
`;

      const prompt = `${context}\n\nשאלת המשתמש: ${input}`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: false
      });

      // Parse suggested actions
      const actions = [];
      const actionMatches = result.match(/\[ACTION:.*?\]/g);
      if (actionMatches) {
        actionMatches.forEach(match => {
          const actionStr = match.slice(8, -1);
          const [type, ...params] = actionStr.split('|').map(s => s.trim());
          actions.push({ type, params: params.join('|') });
        });
      }

      const aiMessage = { role: 'assistant', content: result, actions };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'מצטער, אירעה שגיאה בעיבוד הבקשה. אנא נסה שוב.' 
      }]);
    }
    setLoading(false);
  };

  const clearChat = () => {
    setMessages([]);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50" dir="rtl">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6 text-center">
          <div className="inline-flex items-center gap-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-2xl shadow-lg">
            <Sparkles className="w-6 h-6" />
            <h1 className="text-2xl font-bold">צ'אט AI חכם</h1>
          </div>
          <p className="text-slate-600 mt-3">שאל אותי כל שאלה על הפרויקטים, הלקוחות והמשימות שלך</p>
        </div>

        {/* Chat Container */}
        <Card className="shadow-2xl bg-white/80 backdrop-blur-sm border-0 overflow-hidden" style={{ height: 'calc(100vh - 240px)' }}>
          <div className="flex flex-col h-full">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                      <Sparkles className="w-10 h-10 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-800 mb-2">מה אני יכול לעזור?</h3>
                    <p className="text-slate-500 mb-6">אני כאן כדי לעזור לך עם כל מה שקשור לפרויקטים, לקוחות ומשימות</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto">
                      {[
                        'מה הפרויקטים הפעילים שלי?',
                        'תן לי סיכום של המשימות הדחופות',
                        'אילו לקוחות דורשים תשומת לב?',
                        'איך אני יכול לשפר את ניהול הפרויקטים?'
                      ].map((suggestion, i) => (
                        <button
                          key={i}
                          onClick={() => setInput(suggestion)}
                          className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-purple-50 hover:border-purple-300 transition-all text-sm text-slate-700 text-right"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((message, index) => (
                    <div key={index} className="space-y-2">
                      <div
                        className={`flex ${message.role === 'user' ? 'justify-start' : 'justify-end'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-2xl p-4 ${
                            message.role === 'user'
                              ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                              : 'bg-white border border-slate-200'
                          }`}
                        >
                          {message.role === 'assistant' ? (
                            <div className="prose prose-sm max-w-none">
                              <ReactMarkdown>{message.content.replace(/\[ACTION:.*?\]/g, '')}</ReactMarkdown>
                            </div>
                          ) : (
                            <p className="text-sm leading-relaxed">{message.content}</p>
                          )}
                        </div>
                      </div>
                      {message.actions && message.actions.length > 0 && (
                        <div className="flex justify-end">
                          <div className="max-w-[80%] space-y-2">
                            <p className="text-xs text-slate-500 mb-2">פעולות מוצעות:</p>
                            {message.actions.map((action, idx) => (
                              <div key={idx} className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-3 flex items-center gap-3 shadow-sm hover:shadow-md transition-all">
                                {action.type === 'SEND_EMAIL' && <Mail className="w-5 h-5 text-blue-600" />}
                                {action.type === 'CREATE_TASK' && <ListTodo className="w-5 h-5 text-purple-600" />}
                                {action.type === 'SCHEDULE_MEETING' && <Calendar className="w-5 h-5 text-green-600" />}
                                <span className="text-sm text-slate-700 flex-1 font-medium">
                                  {action.type === 'SEND_EMAIL' && '📧 שלח אימייל'}
                                  {action.type === 'CREATE_TASK' && '✅ צור משימה'}
                                  {action.type === 'SCHEDULE_MEETING' && '📅 קבע פגישה'}
                                </span>
                                <Button
                                  size="sm"
                                  onClick={() => executeAction(action)}
                                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                                >
                                  <CheckCircle className="w-4 h-4 ml-1" />
                                  בצע עכשיו
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {loading && (
                    <div className="flex justify-end">
                      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                        <span className="text-sm text-slate-600">חושב...</span>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input Area */}
            <div className="border-t bg-white/50 backdrop-blur-sm p-4">
              <div className="flex gap-2 items-end">
                {messages.length > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={clearChat}
                    className="flex-shrink-0"
                    title="נקה שיחה"
                  >
                    <Trash2 className="w-5 h-5 text-slate-500" />
                  </Button>
                )}
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="שאל אותי משהו..."
                  className="flex-1 min-h-[60px] max-h-[120px] resize-none border-slate-200 focus:border-purple-400"
                  disabled={loading}
                />
                <Button
                  onClick={sendMessage}
                  disabled={!input.trim() || loading}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 flex-shrink-0"
                  size="icon"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-slate-500 mt-2 text-center">
                לחץ Enter לשליחה, Shift+Enter לשורה חדשה
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}