import React, { useState } from 'react';
import { MessageSquare, X, Send, Loader2, Sparkles, Mail, CheckCircle, ListTodo, Users, TrendingUp, Target, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { base44 } from '@/api/base44Client';
import ReactMarkdown from 'react-markdown';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';
import { useIsMobile } from '@/components/utils/useMediaQuery';

export default function FloatingAIButton() {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const executeAction = async (action) => {
    console.log('🚀 Executing action:', action);
    
    try {
      const params = {};
      
      if (action.params && typeof action.params === 'string') {
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
        await base44.integrations.Core.SendEmail({
          to: params.to,
          subject: params.subject,
          body: params.body
        });
        toast.success('✉️ אימייל נשלח בהצלחה!');
        
      } else if (action.type === 'CREATE_TASK') {
        let dueDate = params.due_date;
        if (dueDate === 'מחר') {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          dueDate = tomorrow.toISOString().split('T')[0];
        } else if (dueDate === 'היום') {
          dueDate = new Date().toISOString().split('T')[0];
        }
        
        await base44.entities.Task.create({
          title: params.title,
          priority: params.priority || 'בינונית',
          due_date: dueDate,
          status: 'חדשה',
          description: params.description || '',
          client_name: params.client_name || '',
          project_name: params.project_name || ''
        });
        toast.success('✅ משימה נוצרה בהצלחה!');
        
      } else if (action.type === 'SCHEDULE_MEETING') {
        const title = params.title || 'פגישה חדשה';
        
        let meetingDate = null;
        
        if (params.date_time) {
          meetingDate = params.date_time;
        } else if (params.date && params.time) {
          meetingDate = `${params.date}T${params.time}`;
        } else if (params.date) {
          let dateStr = params.date;
          if (dateStr === 'מחר') {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            dateStr = tomorrow.toISOString().split('T')[0];
          } else if (dateStr === 'היום') {
            dateStr = new Date().toISOString().split('T')[0];
          }
          const time = params.time || '09:00';
          meetingDate = `${dateStr}T${time}`;
        } else {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          meetingDate = `${tomorrow.toISOString().split('T')[0]}T10:00`;
        }
        
        let clientId = params.client_id;
        let clientName = params.client_name;
        
        if (clientName && !clientId) {
          try {
            const clients = await base44.entities.Client.list();
            const client = clients.find(c => 
              c.name?.toLowerCase().includes(clientName.toLowerCase().trim()) || 
              c.name?.toLowerCase() === clientName.toLowerCase()
            );
            if (client) {
              clientId = client.id;
              clientName = client.name;
            }
          } catch (e) {
            console.warn('Could not fetch clients:', e);
          }
        }
        
        const meetingData = {
          title,
          meeting_date: meetingDate,
          status: 'מתוכננת',
          location: params.location || '',
          description: params.description || (clientName ? `פגישה עם ${clientName}` : ''),
          participants: params.participants?.split(';').map(p => p.trim()).filter(Boolean) || [],
          meeting_type: params.meeting_type || 'פגישת תכנון',
          duration_minutes: params.duration_minutes ? parseInt(params.duration_minutes) : 60,
          reminders: [
            { minutes_before: 60, method: 'in-app', sent: false }
          ]
        };
        
        if (clientId) meetingData.client_id = clientId;
        if (clientName) meetingData.client_name = clientName;
        if (params.project_id) meetingData.project_id = params.project_id;
        if (params.project_name) meetingData.project_name = params.project_name;
        
        const newMeeting = await base44.entities.Meeting.create(meetingData);
        toast.success(`📅 פגישה "${title}" נקבעה ל-${meetingDate.split('T')[0]} בשעה ${meetingDate.split('T')[1]}`);
        
      } else if (action.type === 'UPDATE_CLIENT_STAGE') {
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
        
        toast.success(`🎯 ${updated} לקוחות עודכנו לשלב!`);
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
    const userInput = input;
    setInput('');
    setLoading(true);

    try {
      const currentUser = await base44.auth.me();
      
      const [projects, clients, tasks, meetings] = await Promise.all([
        base44.entities.Project.list('-created_date', 10).catch(() => []),
        base44.entities.Client.list('-created_date', 20).catch(() => []),
        base44.entities.Task.filter({ status: { $ne: 'הושלמה' } }, '-created_date', 20).catch(() => []),
        base44.entities.Meeting.list('-meeting_date', 10).catch(() => [])
      ]);

      const activeProjects = projects.filter(p => p.status !== 'הושלם');
      const urgentTasks = tasks.filter(t => t.priority === 'דחופה' || t.priority === 'גבוהה');
      const upcomingMeetings = meetings.filter(m => new Date(m.meeting_date) >= new Date());
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      const todayStr = new Date().toISOString().split('T')[0];
      
      const context = `אתה עוזר AI חכם למערכת CRM.

נתונים נוכחיים:
- ${activeProjects.length} פרויקטים פעילים
- ${clients.length} לקוחות במערכת
- ${tasks.length} משימות פתוחות (${urgentTasks.length} דחופות)
- ${upcomingMeetings.length} פגישות קרובות

התאריך של היום: ${todayStr}
התאריך של מחר: ${tomorrowStr}

לקוחות אחרונים:
${clients.slice(0, 5).map(c => `- ${c.name}`).join('\n')}

הוראות:
1. **זיהוי מהיר של בקשות פגישה:**
   - כל בקשה שמכילה "פגישה" או "meeting" = צור מיד ACTION
   - אם אין שעה מוגדרת, השתמש ב-09:00
   - אם אין תאריך, השתמש במחר
   - אם יש שם לקוח, חפש אותו ברשימה ושייך

2. **פורמט ACTION:**
   [ACTION: SCHEDULE_MEETING | title: <כותרת>, date: YYYY-MM-DD, time: HH:MM, client_name: <שם לקוח אם יש>]

3. **דוגמאות:**
   - "פגישה מחר" → [ACTION: SCHEDULE_MEETING | title: פגישה חדשה, date: ${tomorrowStr}, time: 09:00]
   - "פגישה עם דני מחר בשעה 2" → [ACTION: SCHEDULE_MEETING | title: פגישה עם דני, client_name: דני, date: ${tomorrowStr}, time: 14:00]
   - "פגישה היום 10:30" → [ACTION: SCHEDULE_MEETING | title: פגישה חדשה, date: ${todayStr}, time: 10:30]

4. **המרת שעות:**
   - "שעה 2" / "2 בצהריים" = 14:00
   - "שעה 4" = 16:00
   - "9 בבוקר" = 09:00
   - "10:30" = 10:30

5. **חשוב:** אל תשאל שאלות מיותרות - אם מבקשים פגישה, צור ACTION מיד!`;

      const prompt = `${context}\n\nבקשת המשתמש: ${userInput}\n\nענה בקצרה וצור ACTION מיד אם נדרש.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: false
      });

      const actions = [];
      const actionMatches = result.match(/\[ACTION:.*?\]/g);
      if (actionMatches) {
        actionMatches.forEach(match => {
          const actionStr = match.slice(8, -1);
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
      console.error('❌ AI Error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'מצטער, אירעה שגיאה. אנא נסה שוב.' 
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
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed ${isMobile ? 'bottom-20 right-4' : 'bottom-6 right-6'} z-50 ${isMobile ? 'w-14 h-14' : 'w-12 h-12'} rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 group shadow-lg`}
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          boxShadow: '0 6px 20px rgba(102, 126, 234, 0.25)',
          border: '0.5px solid rgba(255, 255, 255, 0.1)'
        }}
        title="צ'אט AI"
      >
        <div 
          className={`${isMobile ? 'w-9 h-9' : 'w-8 h-8'} bg-white rounded-full flex items-center justify-center transition-transform group-hover:rotate-12`}
          style={{ border: '0.5px solid rgba(102, 126, 234, 0.1)' }}
        >
          {isOpen ? (
            <X className={`${isMobile ? 'w-5 h-5' : 'w-4 h-4'} text-purple-600`} />
          ) : (
            <MessageSquare className={`${isMobile ? 'w-5 h-5' : 'w-4 h-4'} text-purple-600`} />
          )}
        </div>
      </button>

      {isOpen && (
        <div
          className={`fixed ${isMobile ? 'top-16 bottom-20 left-4 right-4' : 'bottom-24 right-6 w-96 h-[600px]'} z-[45] bg-white ${isMobile ? 'rounded-2xl' : 'rounded-2xl'} shadow-2xl flex flex-col overflow-hidden border border-purple-200 animate-in fade-in zoom-in-95 duration-200`}
          dir="rtl"
        >
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
            <div className="flex gap-2">
              {!isMobile && (
                <Link to={createPageUrl('AIChat')}>
                  <Button variant="ghost" size="sm" className="text-white hover:bg-white/20">
                    פתח מסך מלא
                  </Button>
                </Link>
              )}
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsOpen(false)}
                className="text-white hover:bg-white/20"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-br from-purple-50/50 to-blue-50/50">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center p-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-3 animate-pulse">
                    <Sparkles className="w-8 h-8 text-white" />
                  </div>
                  <h4 className="font-semibold text-slate-800 mb-2">שלום! 👋</h4>
                  <p className="text-sm text-slate-600 mb-3">איך אני יכול לעזור?</p>
                  <div className="space-y-2 text-xs text-slate-500">
                    <p>נסה: "פגישה מחר בשעה 2"</p>
                    <p>או: "צור משימה לבדוק מסמכים"</p>
                  </div>
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
                              {action.type === 'SCHEDULE_MEETING' && <Calendar className="w-4 h-4 text-green-600" />}
                              {action.type === 'UPDATE_CLIENT_STAGE' && <Users className="w-4 h-4 text-orange-600" />}
                              <span className="text-xs text-blue-800 flex-1">
                                {action.type === 'SEND_EMAIL' && 'שלח אימייל'}
                                {action.type === 'CREATE_TASK' && 'צור משימה'}
                                {action.type === 'SCHEDULE_MEETING' && 'קבע פגישה'}
                                {action.type === 'UPDATE_CLIENT_STAGE' && 'עדכן שלב'}
                              </span>
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  executeAction(action);
                                }}
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