import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Loader2, Send, Sparkles, Trash2, Plus, Mail, CheckCircle, ListTodo, Calendar, Users, TrendingUp, Target, MessageCircle, FileText } from 'lucide-react';
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
        
        // Parse due_date if it's a relative term
        let dueDate = params.due_date;
        if (dueDate === 'מחר') {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          dueDate = tomorrow.toISOString().split('T')[0];
        } else if (dueDate === 'היום') {
          dueDate = new Date().toISOString().split('T')[0];
        }
        
        const newTask = await base44.entities.Task.create({
          title: params.title,
          priority: params.priority || 'בינונית',
          due_date: dueDate,
          status: 'חדשה',
          description: params.description || '',
          client_name: params.client_name || '',
          project_name: params.project_name || ''
        });
        console.log('✅ Task created:', newTask);
        toast.success('✅ משימה נוצרה בהצלחה!');
        
      } else if (action.type === 'SCHEDULE_MEETING') {
        console.log('📅 Scheduling meeting...');
        
        // Build title from available info if not provided
        const title = params.title || 
                     (params.client_name ? `פגישה עם ${params.client_name}` : 'פגישה חדשה');
        
        // Handle different date formats
        let meetingDate = null;
        
        // Option 1: date_time as ISO string (e.g., "2025-11-23T13:00:00")
        if (params.date_time) {
          meetingDate = params.date_time;
        }
        // Option 2: Separate date and time
        else if (params.date && params.time) {
          meetingDate = `${params.date}T${params.time}:00`;
        }
        // Option 3: Just date
        else if (params.date) {
          let dateStr = params.date;
          
          // Handle relative dates
          if (dateStr === 'מחר') {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            dateStr = tomorrow.toISOString().split('T')[0];
          } else if (dateStr === 'היום') {
            dateStr = new Date().toISOString().split('T')[0];
          }
          
          // Add default time if not provided
          const time = params.time || '09:00';
          meetingDate = `${dateStr}T${time}:00`;
        }
        // Option 4: No date provided - use tomorrow at 10:00
        else {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          meetingDate = `${tomorrow.toISOString().split('T')[0]}T10:00:00`;
        }
        
        // Find client by name if provided
        let clientId = params.client_id;
        let clientName = params.client_name;
        
        if (clientName && !clientId) {
          try {
            const clients = await base44.entities.Client.list();
            const client = clients.find(c => 
              c.name?.includes(clientName.trim()) || 
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
          participants: params.participants?.split(';').filter(p => p.trim()) || [],
          meeting_type: params.meeting_type || 'פגישת תכנון'
        };
        
        if (clientId) meetingData.client_id = clientId;
        if (clientName) meetingData.client_name = clientName;
        if (params.project_id) meetingData.project_id = params.project_id;
        if (params.project_name) meetingData.project_name = params.project_name;
        
        console.log('📅 Creating meeting with data:', meetingData);
        
        const newMeeting = await base44.entities.Meeting.create(meetingData);
        console.log('✅ Meeting created:', newMeeting);
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
        
      } else if (action.type === 'ANALYZE_SENTIMENT') {
        console.log('😊 Analyzing sentiment...');
        toast.info(`🎭 ניתוח סנטימנט בוצע - ראה תוצאות בצ'אט`);
        
      } else if (action.type === 'SUGGEST_REMINDERS') {
        console.log('⏰ Suggesting reminders...');
        const tasks = params.tasks?.split(';') || [];
        for (const taskTitle of tasks) {
          try {
            const allTasks = await base44.entities.Task.list();
            const task = allTasks.find(t => t.title?.includes(taskTitle.trim()));
            if (task && !task.reminder_enabled) {
              await base44.entities.Task.update(task.id, {
                reminder_enabled: true,
                reminder_at: params.reminder_time || task.due_date
              });
            }
          } catch (e) {
            console.warn('Failed to update task reminder:', e);
          }
        }
        toast.success(`⏰ ${tasks.length} תזכורות הוצעו והופעלו!`);
        
      } else if (action.type === 'SUMMARIZE_PROJECT') {
        console.log('📋 Summarizing project...');
        toast.info(`📋 סיכום פרויקט "${params.project_name}" בוצע - ראה בצ'אט`);
        
      } else if (action.type === 'SUMMARIZE_CLIENT') {
        console.log('👤 Summarizing client...');
        toast.info(`👤 סיכום לקוח "${params.client_name}" בוצע - ראה בצ'אט`);
        
      } else if (action.type === 'GENERATE_QUOTE_DRAFT') {
        console.log('💰 Generating quote draft...');
        toast.success(`💰 טיוטת הצעת מחיר נוצרה - ראה בצ'אט`);
        
      } else if (action.type === 'GENERATE_EMAIL_DRAFT') {
        console.log('✉️ Generating email draft...');
        toast.success(`✉️ טיוטת מייל נוצרה - ראה בצ'אט`);
        
      } else if (action.type === 'SEND_WHATSAPP') {
        console.log('💬 Sending WhatsApp...');
        const phone = params.phone?.replace(/\D/g, '');
        const message = params.message || params.body;
        
        if (!phone || !message) {
          toast.error('חסר מספר טלפון או הודעה');
          return;
        }
        
        const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
        toast.success('💬 WhatsApp נפתח - שלח את ההודעה המוכנה!');
        
      } else if (action.type === 'SUMMARIZE_COMMUNICATIONS') {
        console.log('📨 Summarizing communications...');
        toast.success('📨 סיכום תקשורת נוצר - ראה בצאט');
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
      const [projects, clients, tasks, communications, decisions, meetings, quotes, timeLogs, subtasks, teamMembers, allCommunications] = await Promise.all([
        base44.entities.Project.list('-created_date').catch(() => []),
        base44.entities.Client.list('-created_date').catch(() => []),
        base44.entities.Task.filter({ status: { $ne: 'הושלמה' } }, '-created_date', 50).catch(() => []),
        base44.entities.CommunicationMessage.list('-created_date', 30).catch(() => []),
        base44.entities.Decision.list('-created_date', 20).catch(() => []),
        base44.entities.Meeting.list('-meeting_date', 20).catch(() => []),
        base44.entities.Quote.filter({ status: 'בהמתנה' }).catch(() => []),
        base44.entities.TimeLog.filter({ created_by: currentUser.email }, '-log_date', 30).catch(() => []),
        base44.entities.SubTask.list().catch(() => []),
        base44.entities.TeamMember.filter({ active: true }).catch(() => []),
        base44.entities.CommunicationMessage.list('-created_date', 100).catch(() => [])
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

תקשורת אחרונה (לניתוח סנטימנט ודפוסים):
${communications.slice(0, 10).map(c => `- ${c.type === 'email' ? '📧' : c.type === 'whatsapp' ? '💬' : '📝'} ${c.client_name || 'כללי'}: ${c.subject || c.body?.substring(0, 80) || 'ללא נושא'} (${c.direction || 'פנימי'}, ${new Date(c.created_date).toLocaleDateString('he-IL')})`).join('\n')}

סיכום תקשורת מפורט (100 הודעות אחרונות זמינות):
${allCommunications.length > 0 ? `סה"כ ${allCommunications.length} הודעות` : 'אין תקשורת'}
- מיילים: ${allCommunications.filter(c => c.type === 'email').length}
- WhatsApp: ${allCommunications.filter(c => c.type === 'whatsapp').length}
- הודעות פנימיות: ${allCommunications.filter(c => c.type === 'internal').length}
- נכנסות: ${allCommunications.filter(c => c.direction === 'in').length}
- יוצאות: ${allCommunications.filter(c => c.direction === 'out').length}

טלפונים ללקוחות (עבור WhatsApp):
${clients.filter(c => c.phone || c.whatsapp).slice(0, 15).map(c => `- ${c.name}: ${c.whatsapp || c.phone}`).join('\n')}

משימות עם תזכורות:
${tasks.filter(t => t.reminder_enabled).length} מתוך ${tasks.length} משימות עם תזכורת מופעלת
משימות ללא תזכורת שקרובות למועד: ${tasks.filter(t => !t.reminder_enabled && t.due_date && new Date(t.due_date) <= new Date(Date.now() + 7*24*60*60*1000)).length}

שלבי לקוח זמינים: ברור_תכן, תיק_מידע, היתרים, ביצוע, סיום

יכולות ניתוח וחיזוי מתקדמות:
1. חיזוי פרויקטים: משך, עלות, משאבים על בסיס היסטוריה
2. ניתוח סנטימנט: זיהוי דפוסים רגשיים בתקשורת עם לקוחות (חיובי/שלילי/ניטרלי)
3. זיהוי סיכונים: משימות/פגישות בסיכון, לקוחות עם אזהרות
4. הצעת תזכורות חכמות: מזהה אוטומטית משימות ופגישות שדורשות תזכורת
5. סיכומים אינטליגנטיים: יצירת סיכומים מקצועיים של פרויקטים ולקוחות
6. יצירת תוכן: טיוטות להצעות מחיר ומיילים מותאמים אישית

הוראות קריטיות לפעולות:
1. ענה בצורה מפורטת, מועילה ומקצועית בהתבסס על כל הנתונים
2. כאשר מבקשים חיזוי או המלצות - נתח את הנתונים ההיסטוריים והסבר את ההיגיון
3. הצע פעולות מעקב ספציפיות בפורמט מדויק: [ACTION: סוג_פעולה | פרמטרים]

סוגי פעולות זמינים (פורמט מדויק!):

📧 SEND_EMAIL - דוגמה:
[ACTION: SEND_EMAIL | to: user@example.com, subject: נושא הדואר, body: תוכן המייל]

✅ CREATE_TASK - דוגמה:
[ACTION: CREATE_TASK | title: שם המשימה, priority: גבוהה, due_date: 2025-11-25, description: תיאור המשימה, client_name: שם הלקוח]
* due_date יכול להיות: YYYY-MM-DD, "מחר", "היום"
* priority: נמוכה/בינונית/גבוהה/דחופה

📅 SCHEDULE_MEETING - דוגמה:
[ACTION: SCHEDULE_MEETING | title: שם הפגישה, date_time: 2025-11-23T14:00:00, client_name: שם הלקוח, location: מיקום, description: תיאור]
* date_time חייב להיות בפורמט: YYYY-MM-DDTHH:MM:SS (לדוגמה: 2025-11-23T14:00:00)
* או שימוש ב: date: 2025-11-23, time: 14:00 (נפרד)
* title הוא שדה חובה!
* אם לא מצוין תאריך - משתמש במחר בשעה 10:00

🎯 UPDATE_CLIENT_STAGE - דוגמה:
[ACTION: UPDATE_CLIENT_STAGE | clients: שם לקוח 1;שם לקוח 2, stage: ביצוע]
* שלבים אפשריים: ברור_תכן, תיק_מידע, היתרים, ביצוע, סיום

📊 PREDICT_TIMELINE - דוגמה:
[ACTION: PREDICT_TIMELINE | project_name: שם הפרויקט, project_type: בית פרטי, complexity: בינונית]

👥 SUGGEST_RESOURCES - דוגמה:
[ACTION: SUGGEST_RESOURCES | project_name: שם הפרויקט, duration_days: 180]

🎭 ANALYZE_SENTIMENT - ניתוח סנטימנט של תקשורות עם לקוח:
[ACTION: ANALYZE_SENTIMENT | client_name: שם הלקוח, time_period: 30]
* ניתוח רגשות והתנהגות בתקשורת עם הלקוח
* מזהה דפוסי תקשורת חיוביים/שליליים
* time_period: מספר ימים אחורה (ברירת מחדל: 30)

⏰ SUGGEST_REMINDERS - הצעה והפעלה של תזכורות:
[ACTION: SUGGEST_REMINDERS | tasks: משימה 1;משימה 2, reminder_time: 2025-11-25T10:00:00]
* מזהה משימות ופגישות שקרובות ללא תזכורת
* מפעיל תזכורות אוטומטית

📋 SUMMARIZE_PROJECT - סיכום מפורט של פרויקט:
[ACTION: SUMMARIZE_PROJECT | project_name: שם הפרויקט]
* סיכום התקדמות, משימות, החלטות, תקציב
* טיימליין של אירועים מרכזיים
* המלצות לצעדים הבאים

👤 SUMMARIZE_CLIENT - סיכום מפורט של לקוח:
[ACTION: SUMMARIZE_CLIENT | client_name: שם הלקוח]
* היסטוריית פרויקטים, תקשורת, הצעות מחיר
* ניתוח מגמות וסטטוס נוכחי
* המלצות לפעולות מעקב

💰 GENERATE_QUOTE_DRAFT - טיוטה להצעת מחיר:
[ACTION: GENERATE_QUOTE_DRAFT | client_name: שם הלקוח, project_type: סוג פרויקט, scope: תיאור היקף, estimated_budget: תקציב משוער]
* יוצר טיוטה מבוססת על פרויקטים דומים
* כולל פריטי עלות ושירותים מקובלים

✉️ GENERATE_EMAIL_DRAFT - טיוטת מייל ללקוח:
[ACTION: GENERATE_EMAIL_DRAFT | client_name: שם הלקוח, purpose: מטרה (מעקב/עדכון/בקשה), tone: טון (רשמי/ידידותי/דחוף), key_points: נקודות עיקריות]
* יוצר מייל מותאם אישית בטון המתאים
* מבוסס על היסטוריית תקשורת עם הלקוח

💬 SEND_WHATSAPP - שליחת הודעת WhatsApp:
[ACTION: SEND_WHATSAPP | phone: מספר טלפון (עם קידומת בינלאומית), message: תוכן ההודעה]
* פותח WhatsApp Web עם ההודעה מוכנה לשליחה
* phone חייב להיות במספר מלא עם קידומת (לדוגמה: 972501234567)
* דוגמה: phone: 972501234567, message: שלום! רציתי לעדכן...

📨 SUMMARIZE_COMMUNICATIONS - סיכום תקשורת עם לקוח:
[ACTION: SUMMARIZE_COMMUNICATIONS | client_name: שם הלקוח, days_back: 30]
* מסכם את כל התכתובות (מיילים והודעות) עם הלקוח
* זיהוי נושאים חוזרים, בקשות פתוחות, ומגמות
* days_back: כמה ימים אחורה לנתח (ברירת מחדל: 30)

חשוב מאוד:
- תאריכים חייבים להיות בפורמט ISO: YYYY-MM-DD
- תאריך+שעה חייבים להיות בפורמט: YYYY-MM-DDTHH:MM:SS
- כל הפרמטרים מופרדים בפסיק ורווח: ", "
- משתמש ב-"date_time" ולא ב-"date" ו-"time" נפרדים (אלא אם כן ממש צריך)
- כותרת (title) היא חובה בפגישות!
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
                                {action.type === 'ANALYZE_SENTIMENT' && '🎭'}
                                {action.type === 'SUGGEST_REMINDERS' && '⏰'}
                                {action.type === 'SUMMARIZE_PROJECT' && '📋'}
                                {action.type === 'SUMMARIZE_CLIENT' && '👤'}
                                {action.type === 'GENERATE_QUOTE_DRAFT' && '💰'}
                                {action.type === 'GENERATE_EMAIL_DRAFT' && <Mail className="w-5 h-5 text-cyan-600" />}
                                {action.type === 'SEND_WHATSAPP' && <MessageCircle className="w-5 h-5 text-green-600" />}
                                {action.type === 'SUMMARIZE_COMMUNICATIONS' && <FileText className="w-5 h-5 text-amber-600" />}
                                <span className="text-sm text-slate-700 flex-1 font-medium">
                                 {action.type === 'SEND_EMAIL' && '📧 שלח אימייל'}
                                 {action.type === 'CREATE_TASK' && '✅ צור משימה'}
                                 {action.type === 'SCHEDULE_MEETING' && '📅 קבע פגישה'}
                                 {action.type === 'UPDATE_CLIENT_STAGE' && '🎯 עדכן שלב לקוח'}
                                 {action.type === 'PREDICT_TIMELINE' && '📊 חזה ציר זמן'}
                                 {action.type === 'SUGGEST_RESOURCES' && '👥 הצע משאבים'}
                                 {action.type === 'ANALYZE_SENTIMENT' && '🎭 נתח סנטימנט'}
                                 {action.type === 'SUGGEST_REMINDERS' && '⏰ הצע תזכורות'}
                                 {action.type === 'SUMMARIZE_PROJECT' && '📋 סכם פרויקט'}
                                 {action.type === 'SUMMARIZE_CLIENT' && '👤 סכם לקוח'}
                                 {action.type === 'GENERATE_QUOTE_DRAFT' && '💰 צור טיוטת הצעה'}
                                 {action.type === 'GENERATE_EMAIL_DRAFT' && '✉️ צור טיוטת מייל'}
                                 {action.type === 'SEND_WHATSAPP' && '💬 שלח WhatsApp'}
                                 {action.type === 'SUMMARIZE_COMMUNICATIONS' && '📨 סכם תקשורת'}
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