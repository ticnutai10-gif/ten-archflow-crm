import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        console.log('🚀 [AI QUERY] Function started');
        
        const base44 = createClientFromRequest(req);
        
        // אימות משתמש
        const user = await base44.auth.me();
        if (!user) {
            console.log('❌ [AI QUERY] Unauthorized - no user');
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.log('👤 [AI QUERY] User:', user.email);

        // קבלת השאלה מהמשתמש
        const body = await req.json();
        const { question } = body;
        
        if (!question) {
            console.log('❌ [AI QUERY] No question provided');
            return Response.json({ error: 'Question is required' }, { status: 400 });
        }

        console.log('❓ [AI QUERY] Question:', question);

        // שליפת נתונים מהמערכת - עם כל הלקוחות!
        console.log('📊 [AI QUERY] Loading ALL data...');
        
        const [clients, projects, tasks, timeLogs, meetings, invoices] = await Promise.all([
            // הבאת כל הלקוחות - ללא הגבלה!
            base44.asServiceRole.entities.Client.list('-created_date', 10000).catch((e) => {
                console.log('⚠️ Clients error:', e.message);
                return [];
            }),
            // הבאת כל הפרויקטים
            base44.asServiceRole.entities.Project.list('-created_date', 5000).catch((e) => {
                console.log('⚠️ Projects error:', e.message);
                return [];
            }),
            // הבאת כל המשימות
            base44.asServiceRole.entities.Task.list('-created_date', 5000).catch((e) => {
                console.log('⚠️ Tasks error:', e.message);
                return [];
            }),
            // הבאת כל רישומי הזמן
            base44.asServiceRole.entities.TimeLog.list('-created_date', 5000).catch((e) => {
                console.log('⚠️ TimeLogs error:', e.message);
                return [];
            }),
            // הבאת כל הפגישות
            base44.asServiceRole.entities.Meeting.list('-created_date', 2000).catch((e) => {
                console.log('⚠️ Meetings error:', e.message);
                return [];
            }),
            // הבאת כל החשבוניות
            base44.asServiceRole.entities.Invoice.list('-created_date', 2000).catch((e) => {
                console.log('⚠️ Invoices error:', e.message);
                return [];
            })
        ]);

        console.log('✅ [AI QUERY] ALL Data loaded:', {
            clients: clients.length,
            projects: projects.length,
            tasks: tasks.length,
            timeLogs: timeLogs.length,
            meetings: meetings.length,
            invoices: invoices.length
        });

        // בניית קונטקסט מקוצר וממוקד
        const context = buildCompactContext({
            clients,
            projects,
            tasks,
            timeLogs,
            meetings,
            invoices,
            question
        });

        console.log('📝 [AI QUERY] Context size:', context.length, 'chars');

        // הכנת הפרומפט
        const prompt = `אתה עוזר AI מקצועי למערכת ניהול של חברת אדריכלות טננבאום.

המשתמש: ${user.full_name || user.email}

נתונים רלוונטיים מהמערכת:
${context}

---
שאלת המשתמש: ${question}

הנחיות:
1. ענה בעברית בצורה ברורה ומקצועית
2. השתמש במספרים ופרטים ממשיים מהנתונים
3. אם אין מספיק נתונים - ציין זאת
4. ארגן את התשובה בצורה מובנית עם כותרות וסעיפים
5. היה מדויק - השתמש בנתונים המדויקים שקיבלת
6. אם שואלים "כמה" - תן מספר מדויק!`;

        console.log('🧠 [AI QUERY] Calling LLM...');

        // קריאה ל-LLM
        const response = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: prompt,
            add_context_from_internet: false
        });

        console.log('✅ [AI QUERY] LLM response received');

        return Response.json({
            answer: response,
            metadata: {
                data_sources: {
                    clients: clients.length,
                    projects: projects.length,
                    tasks: tasks.length,
                    timeLogs: timeLogs.length,
                    meetings: meetings.length,
                    invoices: invoices.length
                },
                timestamp: new Date().toISOString(),
                user: user.email
            }
        });

    } catch (error) {
        console.error('❌ [AI QUERY] Error:', error);
        console.error('Stack:', error.stack);
        return Response.json({ 
            error: error.message || 'Unknown error',
            details: error.stack
        }, { status: 500 });
    }
});

// פונקציה לבניית קונטקסט מקוצר וממוקד
function buildCompactContext(data) {
    const { clients, projects, tasks, timeLogs, meetings, invoices, question } = data;
    
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const thisMonth = today.getMonth();
    const thisYear = today.getFullYear();

    let context = '';

    // סטטיסטיקות כלליות - עם המספרים המדויקים!
    context += `## 📊 סטטיסטיקות כלליות\n`;
    context += `סה"כ לקוחות: ${clients.length}\n`;
    context += `  - פעילים: ${clients.filter(c => c.status === 'פעיל').length}\n`;
    context += `  - פוטנציאליים: ${clients.filter(c => c.status === 'פוטנציאלי').length}\n`;
    context += `  - לא פעילים: ${clients.filter(c => c.status === 'לא פעיל').length}\n`;
    context += `סה"כ פרויקטים: ${projects.length}\n`;
    context += `  - בביצוע: ${projects.filter(p => p.status === 'בביצוע').length}\n`;
    context += `סה"כ משימות: ${tasks.length}\n`;
    context += `  - פתוחות: ${tasks.filter(t => t.status !== 'הושלמה').length}\n\n`;

    // פעילות היום
    const todayTimeLogs = timeLogs.filter(tl => tl.log_date === todayStr);
    const todayMeetings = meetings.filter(m => {
        const mDate = new Date(m.meeting_date);
        return mDate.toISOString().split('T')[0] === todayStr;
    });

    if (todayTimeLogs.length > 0 || todayMeetings.length > 0) {
        context += `## 📅 היום (${todayStr})\n`;
        if (todayTimeLogs.length > 0) {
            const hours = (todayTimeLogs.reduce((s, t) => s + (t.duration_seconds || 0), 0) / 3600).toFixed(1);
            context += `שעות עבודה: ${hours}h\n`;
        }
        if (todayMeetings.length > 0) {
            context += `פגישות: ${todayMeetings.map(m => m.title).join(', ')}\n`;
        }
        context += '\n';
    }

    // לקוחות - תלוי בשאלה
    const lowerQuestion = question.toLowerCase();
    const isClientQuery = lowerQuestion.includes('לקוח') || 
                          lowerQuestion.includes('client') ||
                          lowerQuestion.includes('כמה');
    
    if (isClientQuery) {
        // פירוט לקוחות לפי סטטוס
        context += `## 👥 לקוחות מפורטים\n`;
        
        const activeClients = clients.filter(c => c.status === 'פעיל');
        const potentialClients = clients.filter(c => c.status === 'פוטנציאלי');
        const inactiveClients = clients.filter(c => c.status === 'לא פעיל');
        
        if (activeClients.length > 0) {
            context += `\n### לקוחות פעילים (${activeClients.length}):\n`;
            activeClients.slice(0, 30).forEach(c => {
                context += `- ${c.name}`;
                if (c.email) context += ` | ${c.email}`;
                if (c.phone) context += ` | ${c.phone}`;
                const clientProjects = projects.filter(p => p.client_id === c.id);
                if (clientProjects.length > 0) {
                    context += ` | פרויקטים: ${clientProjects.length}`;
                }
                context += '\n';
            });
            if (activeClients.length > 30) {
                context += `... ועוד ${activeClients.length - 30} לקוחות פעילים\n`;
            }
        }
        
        if (potentialClients.length > 0) {
            context += `\n### לקוחות פוטנציאליים (${potentialClients.length}):\n`;
            potentialClients.slice(0, 20).forEach(c => {
                context += `- ${c.name}`;
                if (c.email) context += ` | ${c.email}`;
                context += '\n';
            });
            if (potentialClients.length > 20) {
                context += `... ועוד ${potentialClients.length - 20} לקוחות פוטנציאליים\n`;
            }
        }
        
        if (inactiveClients.length > 0) {
            context += `\n### לקוחות לא פעילים: ${inactiveClients.length}\n`;
        }
        
        context += '\n';
    }

    // פרויקטים דחופים
    const urgentProjects = projects.filter(p => {
        if (p.end_date && (p.status === 'בביצוע' || p.status === 'תכנון')) {
            const days = Math.ceil((new Date(p.end_date) - today) / (1000 * 60 * 60 * 24));
            return days <= 30 && days >= 0;
        }
        return false;
    });

    if (urgentProjects.length > 0) {
        context += `## ⚠️ פרויקטים דחופים (${urgentProjects.length})\n`;
        urgentProjects.forEach(p => {
            const days = Math.ceil((new Date(p.end_date) - today) / (1000 * 60 * 60 * 24));
            context += `- ${p.name} (${p.client_name}): ${days} ימים | ${p.status}\n`;
        });
        context += '\n';
    }

    // משימות פתוחות
    const openTasks = tasks.filter(t => t.status !== 'הושלמה');
    if (openTasks.length > 0) {
        context += `## ✅ משימות פתוחות (${openTasks.length} סה"כ)\n`;
        const highPriority = openTasks.filter(t => t.priority === 'גבוהה');
        if (highPriority.length > 0) {
            context += `\n### עדיפות גבוהה (${highPriority.length}):\n`;
            highPriority.slice(0, 10).forEach(t => {
                context += `- ${t.title}`;
                if (t.project_name) context += ` | ${t.project_name}`;
                context += ` | ${t.status}`;
                if (t.due_date) {
                    const dueDate = new Date(t.due_date);
                    const daysUntil = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
                    context += ` | יעד: ${daysUntil} ימים`;
                }
                context += '\n';
            });
        }
        context += '\n';
    }

    // ניתוח שעות החודש
    const thisMonthLogs = timeLogs.filter(tl => {
        const d = new Date(tl.log_date);
        return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    });

    if (thisMonthLogs.length > 0) {
        const totalHours = (thisMonthLogs.reduce((s, t) => s + (t.duration_seconds || 0), 0) / 3600).toFixed(1);
        context += `## ⏱️ שעות החודש\n`;
        context += `סה"כ: ${totalHours} שעות\n`;
        
        const byClient = {};
        thisMonthLogs.forEach(t => {
            const name = t.client_name || 'לא משויך';
            byClient[name] = (byClient[name] || 0) + (t.duration_seconds || 0);
        });
        
        const top = Object.entries(byClient)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, secs]) => `${name}: ${(secs/3600).toFixed(1)}h`)
            .join(', ');
        
        if (top) context += `חלוקה: ${top}\n\n`;
    }

    // חשבוניות החודש
    const thisMonthInvoices = invoices.filter(inv => {
        const d = new Date(inv.created_date);
        return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    });

    if (thisMonthInvoices.length > 0) {
        const total = thisMonthInvoices.reduce((s, i) => s + (i.amount || 0), 0);
        context += `## 💰 חשבוניות החודש\n`;
        context += `כמות: ${thisMonthInvoices.length} | סכום: ${total.toLocaleString('he-IL')}₪\n`;
        context += `ששולמו: ${thisMonthInvoices.filter(i => i.status === 'paid').length}\n\n`;
    }

    return context;
}