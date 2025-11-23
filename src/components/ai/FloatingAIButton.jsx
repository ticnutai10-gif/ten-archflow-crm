import React, { useState } from 'react';
import { MessageSquare, X, Send, Loader2, Sparkles, Mail, CheckCircle, ListTodo, Users, TrendingUp, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { base44 } from '@/api/base44Client';
import ReactMarkdown from 'react-markdown';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';

export default function FloatingAIButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

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
        const newMeeting = await base44.entities.Meeting.create({
          title: params.title,
          meeting_date: params.date,
          participants: params.participants?.split(';') || [],
          status: 'מתוכננת',
          location: params.location || '',
          description: params.description || ''
        });
        console.log('📅 Meeting created:', newMeeting);
        toast.success('📅 פגישה נקבעה בהצלחה!');
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
        toast.success(`🎯 ${updated} לקוחות עודכנו לשלב!`);
      } else if (action.type === 'PREDICT_TIMELINE') {
        toast.info(`📊 חיזוי ציר זמן בוצע`);
      } else if (action.type === 'SUGGEST_RESOURCES') {
        toast.info(`👥 הצעת משאבים בוצעה`);
      }
    } catch (error) {
      console.error('❌ Action execution error:', error);
      toast.error('❌ שגיאה בביצוע הפעולה: ' + (error.message || 'נסה שוב'));
    }
  };

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
      
      const historicalMetrics = completedProjects.map(p => {
        const projectSubtasks = subtasks.filter(st => st.project_id === p.id);
        const startDate = p.start_date ? new Date(p.start_date) : null;
        const endDate = p.end_date ? new Date(p.end_date) : null;
        const durationDays = startDate && endDate ? Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) : null;
        return { name: p.name, type: p.type, durationDays, teamSize: new Set(projectSubtasks.flatMap(st => st.assigned_to || [])).size };
      }).filter(m => m.durationDays);
      
      const context = `
אתה עוזר AI חכם למערכת CRM של ${currentUser.full_name || currentUser.email}.

סיכום נתונים:
- ${activeProjects.length} פרויקטים פעילים מתוך ${projects.length}
- ${clients.length} לקוחות במערכת
- ${tasks.length} משימות פתוחות (מתוכן ${urgentTasks.length} דחופות)
- ${communications.length} הודעות תקשורת אחרונות
- ${decisions.length} החלטות תיעוד אחרונות
- ${upcomingMeetings.length} פגישות קרובות
- ${quotes.length} הצעות מחיר בהמתנה
- ${timeLogs.length} רישומי זמן אחרונים
- ${completedProjects.length} פרויקטים היסטוריים
- ${teamMembers.length} צוות זמין

נתונים היסטוריים לחיזוי:
${historicalMetrics.slice(0, 5).map(m => `- ${m.name} (${m.type}): ${m.durationDays} ימים, ${m.teamSize} אנשים`).join('\n')}

פרטי לקוחות:
${clients.slice(0, 10).map(c => `- ${c.name}: סטטוס ${c.status || 'לא הוגדר'}, שלב: ${c.stage || 'לא הוגדר'}`).join('\n')}

פרטי פרויקטים פעילים:
${activeProjects.slice(0, 5).map(p => `- ${p.name} (${p.client_name}): סטטוס ${p.status}, ${p.progress || 0}% התקדמות`).join('\n')}

משימות דחופות:
${urgentTasks.slice(0, 5).map(t => `- ${t.title} (${t.project_name || 'כללי'}): ${t.status}, יעד: ${t.due_date || 'לא הוגדר'}`).join('\n')}

פגישות קרובות:
${upcomingMeetings.slice(0, 3).map(m => `- ${m.title} עם ${m.participants?.join(', ') || 'לא צוין'} בתאריך ${m.meeting_date}`).join('\n')}

שלבי לקוח זמינים: ברור_תכן, תיק_מידע, היתרים, ביצוע, סיום

הוראות:
1. ענה בצורה מפורטת ומועילה בהתבסס על הנתונים
2. נתח נתונים היסטוריים לחיזויים מבוססי-נתונים
3. אם רלוונטי, הצע פעולות מעקב ספציפיות בפורמט: [ACTION: סוג_פעולה | נתונים]
   סוגי פעולות: CREATE_TASK, SEND_EMAIL, UPDATE_PROJECT, SCHEDULE_MEETING, UPDATE_CLIENT_STAGE, PREDICT_TIMELINE, SUGGEST_RESOURCES
4. דוגמה חיזוי: [ACTION: PREDICT_TIMELINE | project_name: פרויקט חדש, project_type: בית פרטי, complexity: בינונית]
5. דוגמה משאבים: [ACTION: SUGGEST_RESOURCES | project_name: פרויקט חדש, duration_days: 180]
`;

      const prompt = `${context}\n\nשאלת המשתמש: ${input}`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: false
      });

      // Parse actions from response
      const actions = [];
      const actionMatches = result.match(/\[ACTION:.*?\]/g);
      if (actionMatches) {
        actionMatches.forEach(match => {
          const actionStr = match.slice(8, -1); // Remove [ACTION: and ]
          const [type, ...params] = actionStr.split('|').map(s => s.trim());
          actions.push({ type, params: params.join('|') });
        });
      }

      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: result,
        actions 
      }]);
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'מצטער, אירעה שגיאה בעיבוד הבקשה.' 
      }]);
    }
    setLoading(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 group"
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          boxShadow: '0 6px 20px rgba(102, 126, 234, 0.25)',
          border: '0.5px solid rgba(255, 255, 255, 0.1)'
        }}
        title="צ'אט AI"
      >
        <div 
          className="w-8 h-8 bg-white rounded-full flex items-center justify-center transition-transform group-hover:rotate-12"
          style={{ border: '0.5px solid rgba(102, 126, 234, 0.1)' }}
        >
          {isOpen ? (
            <X className="w-4 h-4 text-purple-600" />
          ) : (
            <MessageSquare className="w-4 h-4 text-purple-600" />
          )}
        </div>
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div
          className="fixed bottom-24 right-6 z-50 w-96 h-[600px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-purple-200 animate-in fade-in zoom-in-95 duration-200"
          dir="rtl"
        >
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-bold">צ'אט AI</h3>
                <p className="text-xs opacity-90">עוזר חכם שלך</p>
              </div>
            </div>
            <Link to={createPageUrl('AIChat')}>
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/20">
                פתח מסך מלא
              </Button>
            </Link>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-br from-purple-50/50 to-blue-50/50">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center p-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-3 animate-pulse">
                    <Sparkles className="w-8 h-8 text-white" />
                  </div>
                  <h4 className="font-semibold text-slate-800 mb-2">שלום! 👋</h4>
                  <p className="text-sm text-slate-600">איך אני יכול לעזור?</p>
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg, i) => (
                  <div key={i}>
                    <div className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                      <div
                        className={`max-w-[85%] rounded-2xl p-3 text-sm ${
                          msg.role === 'user'
                            ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                            : 'bg-white border border-slate-200'
                        }`}
                      >
                        {msg.role === 'assistant' ? (
                          <div className="prose prose-sm max-w-none">
                            <ReactMarkdown>{msg.content.replace(/\[ACTION:.*?\]/g, '')}</ReactMarkdown>
                          </div>
                        ) : (
                          <p>{msg.content}</p>
                        )}
                      </div>
                    </div>
                    {msg.actions && msg.actions.length > 0 && (
                      <div className="flex justify-end mt-2">
                        <div className="max-w-[85%] space-y-2">
                          {msg.actions.map((action, idx) => (
                            <div key={idx} className="bg-blue-50 border border-blue-200 rounded-lg p-2 flex items-center gap-2">
                              {action.type === 'SEND_EMAIL' && <Mail className="w-4 h-4 text-blue-600" />}
                              {action.type === 'CREATE_TASK' && <ListTodo className="w-4 h-4 text-blue-600" />}
                              {action.type === 'UPDATE_CLIENT_STAGE' && <Users className="w-4 h-4 text-orange-600" />}
                              {action.type === 'PREDICT_TIMELINE' && <TrendingUp className="w-4 h-4 text-indigo-600" />}
                              {action.type === 'SUGGEST_RESOURCES' && <Target className="w-4 h-4 text-pink-600" />}
                              <span className="text-xs text-blue-800 flex-1">
                                {action.type === 'SEND_EMAIL' && 'שלח אימייל'}
                                {action.type === 'CREATE_TASK' && 'צור משימה'}
                                {action.type === 'UPDATE_CLIENT_STAGE' && 'עדכן שלב'}
                                {action.type === 'PREDICT_TIMELINE' && 'חזה זמן'}
                                {action.type === 'SUGGEST_RESOURCES' && 'הצע משאבים'}
                              </span>
                              <Button
                                size="sm"
                                onClick={() => executeAction(action)}
                                className="h-6 px-2 bg-blue-600 hover:bg-blue-700 text-xs"
                              >
                                <CheckCircle className="w-3 h-3 ml-1" />
                                בצע
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
                    <div className="bg-white border rounded-2xl p-3 flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                      <span className="text-sm text-slate-600">חושב...</span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Input */}
          <div className="p-3 border-t bg-white">
            <div className="flex gap-2 items-end">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="שאל משהו..."
                className="flex-1 min-h-[50px] max-h-[100px] resize-none text-sm"
                disabled={loading}
              />
              <Button
                onClick={sendMessage}
                disabled={!input.trim() || loading}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                size="icon"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}