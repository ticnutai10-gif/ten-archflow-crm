import React, { useState } from 'react';
import { MessageSquare, X, Send, Loader2, Sparkles, Mail, CheckCircle, ListTodo, Users, TrendingUp, Target, Calendar, FileText, Navigation, Table, Database, BarChart, AlertCircle, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { base44 } from '@/api/base44Client';
import ReactMarkdown from 'react-markdown';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';
import { useIsMobile } from '@/components/utils/useMediaQuery';

export default function FloatingAIButton() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [showConversations, setShowConversations] = useState(false);

  // Fuzzy matching helper - finds best match even with typos
  const fuzzyMatch = (search, target) => {
    if (!search || !target) return 0;
    search = search.toLowerCase().trim();
    target = target.toLowerCase().trim();
    
    // Exact match
    if (target === search) return 1.0;
    if (target.includes(search)) return 0.9;
    
    // Calculate Levenshtein distance for fuzzy matching
    const matrix = [];
    for (let i = 0; i <= target.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= search.length; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= target.length; i++) {
      for (let j = 1; j <= search.length; j++) {
        if (target.charAt(i - 1) === search.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    const distance = matrix[target.length][search.length];
    const maxLength = Math.max(search.length, target.length);
    return 1 - (distance / maxLength);
  };

  const findBestMatch = (searchTerm, items, keyFn) => {
    if (!searchTerm || !items || items.length === 0) return null;
    
    let bestMatch = null;
    let bestScore = 0;
    
    items.forEach(item => {
      const target = keyFn(item);
      if (!target) return;
      
      const score = fuzzyMatch(searchTerm, target);
      if (score > bestScore && score > 0.6) { // 60% similarity threshold
        bestScore = score;
        bestMatch = item;
      }
    });
    
    return bestMatch;
  };

  const executeAction = async (action) => {
    console.log('🚀 Executing action:', action);
    
    try {
      // Parse params from string format
      const params = {};
      
      if (action.params && typeof action.params === 'string') {
        // Split by | first to get each param
        const parts = action.params.split('|').map(p => p.trim()).filter(Boolean);
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
      
      // Show processing toast
      toast.loading('מבצע פעולה...', { id: 'action-loading' });

      if (action.type === 'NAVIGATE_TO_PAGE') {
        toast.dismiss('action-loading');
        const page = params.page;
        const pageMap = {
          'לקוחות': 'Clients',
          'פרויקטים': 'Projects',
          'משימות': 'Tasks',
          'פגישות': 'Meetings',
          'טבלאות': 'CustomSpreadsheets',
          'דוחות': 'Reports',
          'הגדרות': 'Settings'
        };
        const targetPage = pageMap[page] || page;
        navigate(createPageUrl(targetPage));
        toast.success(`📍 מנווט לדף ${page}`);
        
      } else if (action.type === 'GENERATE_CLIENT_REPORT') {
        const clientName = params.client_name;
        const allClients = await base44.entities.Client.list();
        const client = findBestMatch(clientName, allClients, c => c.name);
        
        if (!client) {
          toast.error(`לא נמצא לקוח: ${clientName}`);
          return;
        }

        const [projects, tasks, meetings, communications] = await Promise.all([
          base44.entities.Project.filter({ client_id: client.id }).catch(() => []),
          base44.entities.Task.filter({ client_id: client.id }).catch(() => []),
          base44.entities.Meeting.filter({ client_id: client.id }).catch(() => []),
          base44.entities.CommunicationMessage.filter({ client_id: client.id }).catch(() => [])
        ]);

        const reportData = `
# דוח לקוח: ${client.name}

## פרטים כלליים
- סטטוס: ${client.status || 'לא הוגדר'}
- שלב: ${client.stage || 'לא הוגדר'}
- אימייל: ${client.email || 'לא זמין'}
- טלפון: ${client.phone || 'לא זמין'}
- תקציב: ${client.budget_range || 'לא הוגדר'}

## סטטיסטיקות
- **${projects.length}** פרויקטים
- **${tasks.length}** משימות
- **${meetings.length}** פגישות
- **${communications.length}** תקשורות

## פרויקטים פעילים
${projects.filter(p => p.status !== 'הושלם').map(p => `- ${p.name} (${p.status})`).join('\n') || 'אין פרויקטים פעילים'}

## משימות פתוחות
${tasks.filter(t => t.status !== 'הושלמה').slice(0, 5).map(t => `- ${t.title} (${t.status})`).join('\n') || 'אין משימות פתוחות'}

## פגישות קרובות
${meetings.filter(m => new Date(m.meeting_date) >= new Date()).slice(0, 3).map(m => `- ${m.title} - ${new Date(m.meeting_date).toLocaleDateString('he-IL')}`).join('\n') || 'אין פגישות קרובות'}
`;

        // Add report as new message
        toast.dismiss('action-loading');
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: reportData 
        }]);
        toast.success(`📊 דוח נוצר עבור ${client.name}`);
        
      } else if (action.type === 'GENERATE_PROJECT_REPORT') {
        const projectName = params.project_name;
        const allProjects = await base44.entities.Project.list();
        const project = findBestMatch(projectName, allProjects, p => p.name);
        
        if (!project) {
          toast.error(`לא נמצא פרויקט: ${projectName}`);
          return;
        }

        const [tasks, decisions, meetings] = await Promise.all([
          base44.entities.Task.filter({ project_id: project.id }).catch(() => []),
          base44.entities.Decision.filter({ project_id: project.id }).catch(() => []),
          base44.entities.Meeting.filter({ project_id: project.id }).catch(() => [])
        ]);

        const completedTasks = tasks.filter(t => t.status === 'הושלמה').length;
        const progressPercent = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

        const reportData = `
# דוח פרויקט: ${project.name}

## פרטים כלליים
- לקוח: ${project.client_name || 'לא מוגדר'}
- סטטוס: ${project.status || 'לא הוגדר'}
- סוג: ${project.type || 'לא מוגדר'}
- תקציב: ${project.budget ? `₪${project.budget.toLocaleString()}` : 'לא מוגדר'}
- התקדמות: **${project.progress || progressPercent}%**

## תאריכים
- התחלה: ${project.start_date ? new Date(project.start_date).toLocaleDateString('he-IL') : 'לא הוגדר'}
- סיום משוער: ${project.end_date ? new Date(project.end_date).toLocaleDateString('he-IL') : 'לא הוגדר'}

## משימות
- סה"כ: **${tasks.length}**
- הושלמו: **${completedTasks}** (${progressPercent}%)
- פתוחות: **${tasks.length - completedTasks}**

### משימות דחופות
${tasks.filter(t => t.priority === 'גבוהה' && t.status !== 'הושלמה').slice(0, 5).map(t => `- ${t.title} (יעד: ${t.due_date || 'לא הוגדר'})`).join('\n') || 'אין משימות דחופות'}

## החלטות מרכזיות
${decisions.slice(0, 5).map(d => `- ${d.title} (${d.decision_date ? new Date(d.decision_date).toLocaleDateString('he-IL') : 'ללא תאריך'})`).join('\n') || 'אין החלטות מתועדות'}

## פגישות
- סה"כ: **${meetings.length}**
- קרובות: **${meetings.filter(m => new Date(m.meeting_date) >= new Date()).length}**
`;

        toast.dismiss('action-loading');
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: reportData 
        }]);
        toast.success(`📊 דוח נוצר עבור ${project.name}`);
        
      } else if (action.type === 'ANALYZE_SENTIMENT') {
        const clientName = params.client_name;
        const allClients = await base44.entities.Client.list();
        const client = findBestMatch(clientName, allClients, c => c.name);
        
        if (!client) {
          toast.error(`לא נמצא לקוח: ${clientName}`);
          return;
        }

        const communications = await base44.entities.CommunicationMessage.filter({ client_id: client.id }).catch(() => []);
        
        if (communications.length === 0) {
          toast.info('אין תקשורות לניתוח');
          return;
        }

        // Analyze sentiment using AI
        const recentComms = communications.slice(0, 10);
        const textToAnalyze = recentComms.map(c => c.body || c.message).join('\n\n');
        
        const sentimentPrompt = `נתח את הסנטימנט של התקשורות הבאות עם לקוח ותן ציון כללי (חיובי/ניטרלי/שלילי) והסבר קצר:

${textToAnalyze}

תשובה בפורמט:
סנטימנט: [חיובי/ניטרלי/שלילי]
הסבר: [הסבר קצר]
המלצות: [המלצות לפעולה]`;

        const sentimentResult = await base44.integrations.Core.InvokeLLM({
          prompt: sentimentPrompt,
          add_context_from_internet: false
        });

        const analysisData = `
# ניתוח סנטימנט: ${client.name}

${sentimentResult}

## תקשורות שנותחו
- סה"כ: **${communications.length}**
- נותחו: **${recentComms.length}** האחרונות
`;

        toast.dismiss('action-loading');
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: analysisData 
        }]);
        toast.success(`🎭 ניתוח סנטימנט הושלם עבור ${client.name}`);
        
      } else if (action.type === 'SEND_EMAIL') {
        toast.dismiss('action-loading');
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
        toast.dismiss('action-loading');
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
            const client = findBestMatch(clientName, clients, c => c.name);
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
        toast.dismiss('action-loading');
        toast.success(`📅 פגישה "${title}" נקבעה ל-${meetingDate.split('T')[0]} בשעה ${meetingDate.split('T')[1]}`);
        
      } else if (action.type === 'UPDATE_CLIENT_STAGE') {
        const clientsToUpdate = params.clients?.split(';') || [];
        const newStage = params.stage;
        
        const allClients = await base44.entities.Client.list();
        let updated = 0;
        
        for (const clientIdentifier of clientsToUpdate) {
          const client = findBestMatch(clientIdentifier.trim(), allClients, c => c.name) || 
                        allClients.find(c => c.id === clientIdentifier.trim());
          
          if (client) {
            await base44.entities.Client.update(client.id, { stage: newStage });
            updated++;
          }
        }
        
        toast.dismiss('action-loading');
        toast.success(`🎯 ${updated} לקוחות עודכנו לשלב!`);
        
      } else if (action.type === 'ADD_CLIENT_DATA') {
        const clientName = params.client_name;
        const allClients = await base44.entities.Client.list();
        const client = findBestMatch(clientName, allClients, c => c.name);
        
        if (!client) {
          toast.error(`לא נמצא לקוח: ${clientName}`);
          return;
        }

        const updateData = {};
        if (params.email) updateData.email = params.email;
        if (params.phone) updateData.phone = params.phone;
        if (params.address) updateData.address = params.address;
        if (params.notes) updateData.notes = params.notes;
        if (params.stage) updateData.stage = params.stage;
        if (params.status) updateData.status = params.status;
        
        await base44.entities.Client.update(client.id, updateData);
        toast.dismiss('action-loading');
        toast.success(`✅ המידע עודכן עבור ${client.name}`);
      }
    } catch (error) {
      console.error('❌ Action execution error:', error);
      toast.dismiss('action-loading');
      toast.error('❌ שגיאה בביצוע הפעולה: ' + (error.message || 'נסה שוב'));
    }
  };

  const loadConversations = async () => {
    try {
      const convos = await base44.entities.ChatConversation.list('-last_message_at', 10);
      setConversations(convos);
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  const saveConversation = async (msgs) => {
    try {
      const conversationData = {
        name: msgs[0]?.content.substring(0, 50) + '...' || 'שיחה חדשה',
        messages: msgs,
        folder: 'כללי',
        last_message_at: new Date().toISOString()
      };

      if (currentConversationId) {
        await base44.entities.ChatConversation.update(currentConversationId, conversationData);
      } else {
        const newConvo = await base44.entities.ChatConversation.create(conversationData);
        setCurrentConversationId(newConvo.id);
      }
      loadConversations();
    } catch (error) {
      console.error('Error saving conversation:', error);
    }
  };

  const loadConversation = async (convo) => {
    setMessages(convo.messages || []);
    setCurrentConversationId(convo.id);
    setShowConversations(false);
  };

  const startNewConversation = () => {
    setMessages([]);
    setCurrentConversationId(null);
    setShowConversations(false);
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = { role: 'user', content: input, timestamp: new Date().toISOString() };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
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
      
      const projectsList = activeProjects.slice(0, 5).map(p => `- ${p.name} (${p.client_name || 'ללא לקוח'})`).join('\n');
      
      const context = `אתה עוזר AI מקצועי ומתקדם למערכת CRM אדריכלית.

## נתונים נוכחיים
- **${activeProjects.length}** פרויקטים פעילים מתוך ${projects.length}
- **${clients.length}** לקוחות במערכת
- **${tasks.length}** משימות פתוחות (${urgentTasks.length} דחופות)
- **${upcomingMeetings.length}** פגישות קרובות

📅 תאריך היום: ${todayStr}
📅 תאריך מחר: ${tomorrowStr}

## לקוחות פעילים
${clients.slice(0, 8).map(c => `- ${c.name} (${c.stage || 'לא הוגדר'})`).join('\n')}

## פרויקטים פעילים
${projectsList || 'אין פרויקטים פעילים'}

## יכולות מתקדמות שלך

### 1. 📊 דוחות מקצועיים
- **דוח לקוח**: צור דוח מקיף על לקוח כולל פרויקטים, משימות, פגישות וסטטיסטיקות
  [ACTION: GENERATE_CLIENT_REPORT | client_name: <שם הלקוח>]
  
- **דוח פרויקט**: צור דוח מפורט על פרויקט כולל התקדמות, משימות והחלטות
  [ACTION: GENERATE_PROJECT_REPORT | project_name: <שם הפרויקט>]

### 2. 🎭 ניתוח סנטימנט
- נתח אוטומטית את הסנטימנט בתקשורות עם לקוח והמלץ על פעולות
  [ACTION: ANALYZE_SENTIMENT | client_name: <שם הלקוח>]

### 3. 📍 ניווט מהיר
- נווט לכל דף במערכת: "הוביל אותי ללקוחות" / "פתח דף פרויקטים"
  [ACTION: NAVIGATE_TO_PAGE | page: <לקוחות/פרויקטים/משימות/פגישות/טבלאות/דוחות/הגדרות>]

### 4. ✏️ עדכון מידע
- הוסף או עדכן פרטי לקוח
  [ACTION: ADD_CLIENT_DATA | client_name: <שם>, email: <מייל>, phone: <טלפון>, address: <כתובת>, notes: <הערות>]

### 5. 📅 קביעת פגישות
- קבע פגישה מהירה עם זיהוי אוטומטי של תאריכים ושעות
  [ACTION: SCHEDULE_MEETING | title: <כותרת>, date: YYYY-MM-DD, time: HH:MM, client_name: <שם לקוח>]

### 6. ✅ יצירת משימות
- צור משימה עם כל הפרטים
  [ACTION: CREATE_TASK | title: <כותרת>, priority: <נמוכה/בינונית/גבוהה>, due_date: <תאריך>, client_name: <שם לקוח>]

### 7. 🎯 עדכון שלבי לקוח
- עדכן שלב לקוח (ברור_תכן, תיק_מידע, היתרים, ביצוע, סיום)
  [ACTION: UPDATE_CLIENT_STAGE | clients: <שם1;שם2>, stage: <שלב>]

### 8. ✉️ שליחת אימיילים
  [ACTION: SEND_EMAIL | to: <מייל>, subject: <נושא>, body: <תוכן>]

## כללי פעולה

### זיהוי חכם עם שגיאות כתיבה
- **אתה מזהה אוטומטית שמות גם עם טעויות כתיבה!**
- דני/דנ/דנ"י = כולם מזהה אותו לקוח
- קוזלובסקי/קוזלובסק/קוזלבסקי = כולם אותו לקוח
- אל תתקן את המשתמש, פשוט תמצא את הכי קרוב!

### המרת זמנים
- "מחר" → ${tomorrowStr}
- "היום" → ${todayStr}
- "שעה 2" / "2 בצהריים" → 14:00
- "שעה 4" / "4 אחר הצהריים" → 16:00
- "9 בבוקר" → 09:00

### תגובות מקצועיות
1. **זהה כוונה במהירות** - אל תשאל שאלות מיותרות
2. **צור ACTION מיד** אם אפשר
3. **השתמש במידע קיים** - אל תבקש מידע שכבר יש לך
4. **היה מדויק ותמציתי** בתשובות

### דוגמאות שימוש
- "תן לי דוח על דני" → צור דוח לקוח
- "מה הסנטימנט של קוזלובסקי?" → נתח סנטימנט
- "פגישה עם משה מחר 2 אחר הצהריים" → קבע פגישה
- "הוביל אותי ללקוחות" → נווט לדף
- "עדכן טלפון של רמי ל-050-1234567" → עדכן מידע
- "צור דוח על פרויקט אפרת" → צור דוח פרויקט

**תמיד בדוק אם יש ACTION שאתה יכול לבצע לפני שאתה עונה!**`;

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

      const assistantMessage = { 
        role: 'assistant', 
        content: result,
        actions,
        timestamp: new Date().toISOString()
      };
      
      const finalMessages = [...updatedMessages, assistantMessage];
      setMessages(finalMessages);
      
      // Auto-save conversation
      await saveConversation(finalMessages);
    } catch (error) {
      console.error('❌ AI Error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'מצטער, אירעה שגיאה. אנא נסה שוב.',
        timestamp: new Date().toISOString()
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
            <div className="flex items-center gap-2 flex-1">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-purple-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold">צ'אט AI</h3>
                <p className="text-xs opacity-90">
                  {currentConversationId ? 'שיחה שמורה' : 'שיחה חדשה'} • {messages.length} הודעות
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={startNewConversation}
                className="text-white hover:bg-white/20"
                title="שיחה חדשה"
              >
                <Plus className="w-4 h-4 ml-1" />
                חדש
              </Button>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => {
                  setShowConversations(!showConversations);
                  if (!showConversations) loadConversations();
                }}
                className="text-white hover:bg-white/20"
                title="שיחות שמורות"
              >
                <MessageSquare className="w-5 h-5" />
              </Button>
              {!isMobile && (
                <Link to={createPageUrl('ChatHistory')}>
                  <Button variant="ghost" size="sm" className="text-white hover:bg-white/20">
                    נהל שיחות
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
            {showConversations ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-slate-800">שיחות אחרונות</h4>
                  <Button size="sm" onClick={startNewConversation} className="bg-purple-600">
                    <Plus className="w-3 h-3 ml-1" />
                    חדש
                  </Button>
                </div>
                {conversations.length === 0 ? (
                  <p className="text-center text-slate-500 text-sm py-8">אין שיחות שמורות</p>
                ) : (
                  conversations.map(convo => (
                    <Card 
                      key={convo.id} 
                      className="cursor-pointer hover:bg-slate-50 transition-colors"
                      onClick={() => loadConversation(convo)}
                    >
                      <CardContent className="p-3">
                        <p className="font-medium text-sm text-slate-900 truncate">{convo.name}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {convo.messages?.length || 0} הודעות • {new Date(convo.last_message_at).toLocaleDateString('he-IL')}
                        </p>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            ) : messages.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center p-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-3 animate-pulse">
                    <Sparkles className="w-8 h-8 text-white" />
                  </div>
                  <h4 className="font-semibold text-slate-800 mb-2">שלום! 👋</h4>
                  <p className="text-sm text-slate-600 mb-3">איך אני יכול לעזור?</p>
                  <div className="space-y-1 text-xs text-slate-500">
                    <p>💬 "תן לי דוח על דני"</p>
                    <p>📅 "פגישה מחר בשעה 2"</p>
                    <p>🎭 "מה הסנטימנט של קוזלובסקי?"</p>
                    <p>📍 "הוביל אותי ללקוחות"</p>
                    <p>✏️ "עדכן טלפון של משה"</p>
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
                              {action.type === 'GENERATE_CLIENT_REPORT' && <FileText className="w-4 h-4 text-purple-600" />}
                              {action.type === 'GENERATE_PROJECT_REPORT' && <BarChart className="w-4 h-4 text-indigo-600" />}
                              {action.type === 'ANALYZE_SENTIMENT' && <AlertCircle className="w-4 h-4 text-pink-600" />}
                              {action.type === 'NAVIGATE_TO_PAGE' && <Navigation className="w-4 h-4 text-teal-600" />}
                              {action.type === 'ADD_CLIENT_DATA' && <Database className="w-4 h-4 text-amber-600" />}
                              <span className="text-xs text-blue-800 flex-1">
                                {action.type === 'SEND_EMAIL' && 'שלח אימייל'}
                                {action.type === 'CREATE_TASK' && 'צור משימה'}
                                {action.type === 'SCHEDULE_MEETING' && 'קבע פגישה'}
                                {action.type === 'UPDATE_CLIENT_STAGE' && 'עדכן שלב'}
                                {action.type === 'GENERATE_CLIENT_REPORT' && 'דוח לקוח'}
                                {action.type === 'GENERATE_PROJECT_REPORT' && 'דוח פרויקט'}
                                {action.type === 'ANALYZE_SENTIMENT' && 'נתח סנטימנט'}
                                {action.type === 'NAVIGATE_TO_PAGE' && 'נווט לדף'}
                                {action.type === 'ADD_CLIENT_DATA' && 'עדכן מידע'}
                              </span>
                              <Button
                                size="sm"
                                onClick={async (e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  console.log('🖱️ בצע נלחץ!', action);
                                  await executeAction(action);
                                }}
                                className="h-6 px-2 bg-blue-600 hover:bg-blue-700 text-xs"
                              >
                                <CheckCircle className="w-3 h-3 ml-1" />
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