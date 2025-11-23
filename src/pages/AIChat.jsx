import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Loader2, Send, Sparkles, Trash2, Plus, Mail, CheckCircle, ListTodo, Calendar, Users, TrendingUp, Target } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';

export default function AIChat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const executeAction = async (action) => {
    console.log('🚀 Executing action:', action);
    
    try {
      const params = {};
      
      // Parse params string more carefully
      if (action.params && typeof action.params === 'string') {
        // Split by comma, but be careful with commas inside values
        const parts = action.params.split(/,(?=\s*\w+:)/);
        parts.forEach(p => {
          const colonIndex = p.indexOf(':');
          if (colonIndex > 0) {
            const key = p.substring(0, colonIndex).trim();
            const value = p.substring(colonIndex + 1).trim();
            params[key] = value;
          }
        });
      }

      console.log('📋 Parsed params:', params);

      if (action.type === 'SEND_EMAIL') {
        console.log('📧 Sending email...');
        await base44.integrations.Core.SendEmail({
          to: params.to,
          subject: params.subject,
          body: params.body
        });
        toast.success('✉️ אימייל נשלח בהצלחה!');
      } else if (action.type === 'CREATE_TASK') {
        console.log('✅ Creating task...');
        const newTask = await base44.entities.Task.create({
          title: params.title,
          priority: params.priority || 'בינונית',
          due_date: params.due_date,
          status: 'חדשה',
          description: params.description || ''
        });
        console.log('✅ Task created:', newTask);
        toast.success('✅ משימה נוצרה בהצלחה!');
      } else if (action.type === 'SCHEDULE_MEETING') {
        console.log('📅 Scheduling meeting...');
        
        // Build title from available info if not provided
        const title = params.title || 
                     (params.client_name ? `פגישה עם ${params.client_name}` : 'פגישה חדשה');
        
        // Parse date - handle "מחר", specific dates, etc.
        let meetingDate = params.date;
        if (meetingDate === 'מחר') {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          meetingDate = tomorrow.toISOString().split('T')[0];
        }
        
        // Add time if provided
        if (params.time && meetingDate) {
          meetingDate = `${meetingDate}T${params.time}:00`;
        }
        
        const newMeeting = await base44.entities.Meeting.create({
          title,
          meeting_date: meetingDate,
          participants: params.participants?.split(';') || [],
          status: 'מתוכננת',
          location: params.location || '',
          description: params.description || (params.client_name ? `פגישה עם ${params.client_name}` : '')
        });
        console.log('📅 Meeting created:', newMeeting);
        toast.success(`📅 פגישה "${title}" נקבעה בהצלחה!`);
      } else if (action.type === 'UPDATE_CLIENT_STAGE') {
        console.log('🎯 Updating client stage...');
        const clientsToUpdate = params.clients?.split(';') || [];
        const newStage = params.stage;
        
        const allClients = await base44.entities.Client.list();
        let updated = 0;
        
        for (const clientIdentifier of clientsToUpdate) {
          const client = allClients.find(c => 
            c.name?.includes(clientIdentifier.trim()) || 
            c.id === clientIdentifier.trim()
          );
          
          if (client) {
            await base44.entities.Client.update(client.id, { stage: newStage });
            updated++;
          }
        }
        
        console.log(`✅ Updated ${updated} clients`);
        toast.success(`🎯 ${updated} לקוחות עודכנו לשלב ${newStage}!`);
      } else if (action.type === 'PREDICT_TIMELINE') {
        toast.info(`📊 חיזוי ציר זמן לפרויקט "${params.project_name}" בוצע - ראה תוצאות בצ'אט`);
      } else if (action.type === 'SUGGEST_RESOURCES') {
        toast.info(`👥 הצעת משאבים לפרויקט "${params.project_name}" בוצעה - ראה המלצות בצ'אט`);
      }
    } catch (error) {
      console.error('❌ Action execution error:', error);
      toast.error('❌ שגיאה בביצוע הפעולה: ' + (error.message || 'נסה שוב'));
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
      const [projects, clients, tasks, communications, decisions, meetings, quotes, timeLogs, subtasks, teamMembers] = await Promise.all([
        base44.entities.Project.list('-created_date').catch(() => []),
        base44.entities.Client.list('-created_date').catch(() => []),
        base44.entities.Task.filter({ status: { $ne: 'הושלמה' } }, '-created_date', 50).catch(() => []),
        base44.entities.CommunicationMessage.list('-created_date', 30).catch(() => []),
        base44.entities.Decision.list('-created_date', 20).catch(() => []),
        base44.entities.Meeting.list('-meeting_date', 20).catch(() => []),
        base44.entities.Quote.filter({ status: 'בהמתנה' }).catch(() => []),
        base44.entities.TimeLog.filter({ created_by: currentUser.email }, '-log_date', 30).catch(() => []),
        base44.entities.SubTask.list().catch(() => []),
        base44.entities.TeamMember.filter({ active: true }).catch(() => [])
      ]);

      const activeProjects = projects.filter(p => p.status !== 'הושלם');
      const completedProjects = projects.filter(p => p.status === 'הושלם');
      const urgentTasks = tasks.filter(t => t.priority === 'דחופה' || t.priority === 'גבוהה');
      const upcomingMeetings = meetings.filter(m => new Date(m.meeting_date) >= new Date());
      
      // Calculate historical project metrics
      const historicalMetrics = completedProjects.map(p => {
        const projectSubtasks = subtasks.filter(st => st.project_id === p.id);
        const totalEstimatedHours = projectSubtasks.reduce((sum, st) => sum + (st.estimated_hours || 0), 0);
        const totalActualHours = projectSubtasks.reduce((sum, st) => sum + (st.actual_hours || 0), 0);
        const startDate = p.start_date ? new Date(p.start_date) : null;
        const endDate = p.end_date ? new Date(p.end_date) : null;
        const durationDays = startDate && endDate ? Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) : null;
        const uniqueAssignees = new Set(projectSubtasks.flatMap(st => st.assigned_to || [])).size;
        
        return {
          name: p.name,
          type: p.type,
          durationDays,
          totalEstimatedHours,
          totalActualHours,
          teamSize: uniqueAssignees,
          budget: p.budget,
          area: p.area,
          subtasksCount: projectSubtasks.length
        };
      }).filter(m => m.durationDays !== null);
      
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
- ${completedProjects.length} פרויקטים שהושלמו (נתונים היסטוריים)
- ${teamMembers.length} חברי צוות פעילים

נתונים היסטוריים של פרויקטים שהושלמו (לחיזוי):
${historicalMetrics.slice(0, 10).map(m => 
  `- ${m.name} (${m.type}): ${m.durationDays} ימים, ${m.teamSize} אנשי צוות, ${m.totalEstimatedHours}/${m.totalActualHours} שעות (משוער/בפועל), ${m.subtasksCount} תת-משימות`
).join('\n')}

סטטיסטיקה כללית מפרויקטים שהושלמו:
- משך ממוצע: ${historicalMetrics.length > 0 ? Math.round(historicalMetrics.reduce((sum, m) => sum + m.durationDays, 0) / historicalMetrics.length) : 0} ימים
- גודל צוות ממוצע: ${historicalMetrics.length > 0 ? Math.round(historicalMetrics.reduce((sum, m) => sum + m.teamSize, 0) / historicalMetrics.length) : 0} אנשים
- שעות ממוצעות לפרויקט: ${historicalMetrics.length > 0 ? Math.round(historicalMetrics.reduce((sum, m) => sum + m.totalActualHours, 0) / historicalMetrics.length) : 0} שעות

צוות זמין:
${teamMembers.map(tm => `- ${tm.full_name} (${tm.role}): ${tm.capacity_hours_per_week || 40} שעות/שבוע`).join('\n')}

פרטי לקוחות:
${clients.slice(0, 15).map(c => `- ${c.name}: סטטוס ${c.status || 'לא הוגדר'}, שלב: ${c.stage || 'לא הוגדר'}`).join('\n')}

פרטי פרויקטים פעילים:
${activeProjects.slice(0, 10).map(p => `- ${p.name} (לקוח: ${p.client_name}): סטטוס ${p.status}, התקדמות ${p.progress || 0}%`).join('\n')}

משימות דחופות:
${urgentTasks.slice(0, 10).map(t => `- ${t.title} (${t.project_name || 'כללי'}): ${t.status}, עדיפות: ${t.priority}, יעד: ${t.due_date || 'לא הוגדר'}`).join('\n')}

פגישות קרובות:
${upcomingMeetings.slice(0, 5).map(m => `- ${m.title} עם ${m.participants?.join(', ') || 'משתתפים'} ב-${m.meeting_date}`).join('\n')}

תקשורת אחרונה:
${communications.slice(0, 5).map(c => `- ${c.subject || c.body?.substring(0, 50)} (${c.type})`).join('\n')}

שלבי לקוח זמינים: ברור_תכן, תיק_מידע, היתרים, ביצוע, סיום

יכולות ניתוח וחיזוי:
אתה יכול לנתח את הנתונים ההיסטוריים ולבצע חיזויים מבוססי-נתונים:
1. לחזות משך פרויקט חדש על בסיס פרויקטים דומים שהושלמו (סוג, גודל, מורכבות)
2. להמליץ על הרכב צוות אופטימלי על בסיס ניסיון קודם
3. לחשב סבירות להשלמה במועד על בסיס נתונים היסטוריים
4. להציע אומדן שעות עבודה ריאליסטי

הוראות:
1. ענה בצורה מפורטת, מועילה ומקצועית בהתבסס על כל הנתונים
2. כאשר מבקשים חיזוי או המלצות - נתח את הנתונים ההיסטוריים והסבר את ההיגיון
3. הצע פעולות מעקב ספציפיות בפורמט: [ACTION: סוג_פעולה | פרמטרים]
   סוגי פעולות זמינים:
   - SEND_EMAIL: to: כתובת, subject: נושא, body: תוכן
   - CREATE_TASK: title: כותרת, priority: עדיפות, due_date: תאריך, description: תיאור
   - UPDATE_PROJECT: project_id: מזהה, field: שדה, value: ערך
   - SCHEDULE_MEETING: title: כותרת_הפגישה (חובה!), date: תאריך (YYYY-MM-DD או "מחר"), time: שעה (HH:MM), client_name: שם_לקוח, participants: משתתפים, location: מיקום, description: תיאור
   - UPDATE_CLIENT_STAGE: clients: שמות_לקוחות, stage: שלב_חדש (ברור_תכן/תיק_מידע/היתרים/ביצוע/סיום)
   - PREDICT_TIMELINE: project_name: שם_הפרויקט, project_type: סוג, estimated_area: שטח_משוער, complexity: רמת_מורכבות (נמוכה/בינונית/גבוהה)
   - SUGGEST_RESOURCES: project_name: שם_הפרויקט, duration_days: משך_צפוי, required_skills: מיומנויות_נדרשות
4. כשמשתמש מבקש עזרה, הצע פעולות קונקרטיות שיעזרו לו
5. השתמש במידע ההיסטורי כדי לתת המלצות חכמות, מבוססות-נתונים ומותאמות אישית
6. בחיזויים - ציין את רמת הביטחון והנחות היסוד
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
                                {action.type === 'UPDATE_CLIENT_STAGE' && <Users className="w-5 h-5 text-orange-600" />}
                                {action.type === 'PREDICT_TIMELINE' && <TrendingUp className="w-5 h-5 text-indigo-600" />}
                                {action.type === 'SUGGEST_RESOURCES' && <Target className="w-5 h-5 text-pink-600" />}
                                <span className="text-sm text-slate-700 flex-1 font-medium">
                                  {action.type === 'SEND_EMAIL' && '📧 שלח אימייל'}
                                  {action.type === 'CREATE_TASK' && '✅ צור משימה'}
                                  {action.type === 'SCHEDULE_MEETING' && '📅 קבע פגישה'}
                                  {action.type === 'UPDATE_CLIENT_STAGE' && '🎯 עדכן שלב לקוח'}
                                  {action.type === 'PREDICT_TIMELINE' && '📊 חזה ציר זמן'}
                                  {action.type === 'SUGGEST_RESOURCES' && '👥 הצע משאבים'}
                                </span>
                                <Button
                                  size="sm"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    console.log('🖱️ Button clicked!', action);
                                    executeAction(action);
                                  }}
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