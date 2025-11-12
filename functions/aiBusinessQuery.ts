import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

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

        // שליפת כל הנתונים מהמערכת
        console.log('📊 [AI QUERY] Loading ALL data...');
        
        const [clients, projects, tasks, timeLogs, meetings, invoices] = await Promise.all([
            base44.asServiceRole.entities.Client.list('-created_date', 10000).catch((e) => {
                console.log('⚠️ Clients error:', e.message);
                return [];
            }),
            base44.asServiceRole.entities.Project.list('-created_date', 5000).catch((e) => {
                console.log('⚠️ Projects error:', e.message);
                return [];
            }),
            base44.asServiceRole.entities.Task.list('-created_date', 5000).catch((e) => {
                console.log('⚠️ Tasks error:', e.message);
                return [];
            }),
            base44.asServiceRole.entities.TimeLog.list('-created_date', 5000).catch((e) => {
                console.log('⚠️ TimeLogs error:', e.message);
                return [];
            }),
            base44.asServiceRole.entities.Meeting.list('-created_date', 2000).catch((e) => {
                console.log('⚠️ Meetings error:', e.message);
                return [];
            }),
            base44.asServiceRole.entities.Invoice.list('-created_date', 2000).catch((e) => {
                console.log('⚠️ Invoices error:', e.message);
                return [];
            })
        ]);

        console.log('✅ [AI QUERY] Data loaded:', {
            clients: clients.length,
            projects: projects.length,
            tasks: tasks.length,
            timeLogs: timeLogs.length,
            meetings: meetings.length,
            invoices: invoices.length
        });

        // חישוב סטטיסטיקות מדויקות
        const stats = calculateStats({ clients, projects, tasks, timeLogs, meetings, invoices });
        
        console.log('📊 [AI QUERY] Calculated stats:', stats);

        // בניית קונטקסט ממוקד
        const context = buildCompactContext({
            clients,
            projects,
            tasks,
            timeLogs,
            meetings,
            invoices,
            question,
            stats
        });

        console.log('📝 [AI QUERY] Context size:', context.length, 'chars');

        // הכנת הפרומפט עם המספרים המדויקים
        const prompt = `אתה עוזר AI מקצועי למערכת ניהול של חברת אדריכלות טננבאום.

המשתמש: ${user.full_name || user.email}

📊 **סטטיסטיקות מדויקות מהמערכת:**

**לקוחות (${stats.clients.total} סה"כ):**
- פעילים: ${stats.clients.active}
- פוטנציאליים: ${stats.clients.potential}
- לא פעילים: ${stats.clients.inactive}

**פרויקטים (${stats.projects.total} סה"כ):**
- בביצוע: ${stats.projects.inProgress}
- בתכנון: ${stats.projects.planning}
- הושלמו: ${stats.projects.completed}

**משימות (${stats.tasks.total} סה"כ):**
- פתוחות: ${stats.tasks.open}
- בתהליך: ${stats.tasks.inProgress}
- הושלמו: ${stats.tasks.completed}

**פגישות החודש: ${stats.meetings.thisMonth}**
**שעות עבודה החודש: ${stats.timeLogs.hoursThisMonth} שעות**
**חשבוניות החודש: ${stats.invoices.thisMonth} (${stats.invoices.totalThisMonth.toLocaleString('he-IL')}₪)**

---

נתונים מפורטים רלוונטיים:
${context}

---

🎯 **שאלת המשתמש:** ${question}

**הנחיות חשובות:**
1. ✅ השתמש במספרים המדויקים שניתנו למעלה - אלו המספרים האמיתיים!
2. ✅ אם שואלים "כמה לקוחות" - תן את המספר ${stats.clients.total}
3. ✅ אם שואלים "כמה פרויקטים" - תן את המספר ${stats.projects.total}
4. ✅ ענה בעברית בצורה ברורה ומקצועית
5. ✅ אם צריך פירוט - השתמש בנתונים המפורטים למטה
6. ✅ ארגן את התשובה בצורה מובנית עם כותרות
7. ✅ היה מדויק - המספרים האלו הם אמיתיים מהמערכת

אם שואלים על מספרים - תשתמש במספרים המדויקים שניתנו בסטטיסטיקות!`;

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
                data_sources: stats,
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

// חישוב סטטיסטיקות מדויקות
function calculateStats(data) {
    const { clients, projects, tasks, timeLogs, meetings, invoices } = data;
    
    // ✅ הגנה על arrays
    const safeClients = Array.isArray(clients) ? clients : [];
    const safeProjects = Array.isArray(projects) ? projects : [];
    const safeTasks = Array.isArray(tasks) ? tasks : [];
    const safeTimeLogs = Array.isArray(timeLogs) ? timeLogs : [];
    const safeMeetings = Array.isArray(meetings) ? meetings : [];
    const safeInvoices = Array.isArray(invoices) ? invoices : [];
    
    const today = new Date();
    const thisMonth = today.getMonth();
    const thisYear = today.getFullYear();

    return {
        clients: {
            total: safeClients.length,
            active: safeClients.filter(c => c && c.status === 'פעיל').length,
            potential: safeClients.filter(c => c && c.status === 'פוטנציאלי').length,
            inactive: safeClients.filter(c => c && c.status === 'לא פעיל').length
        },
        projects: {
            total: safeProjects.length,
            inProgress: safeProjects.filter(p => p && p.status === 'בביצוע').length,
            planning: safeProjects.filter(p => p && p.status === 'תכנון').length,
            completed: safeProjects.filter(p => p && p.status === 'הושלם').length
        },
        tasks: {
            total: safeTasks.length,
            open: safeTasks.filter(t => t && t.status === 'חדשה').length,
            inProgress: safeTasks.filter(t => t && t.status === 'בתהליך').length,
            completed: safeTasks.filter(t => t && t.status === 'הושלמה').length
        },
        meetings: {
            total: safeMeetings.length,
            thisMonth: safeMeetings.filter(m => {
                if (!m || !m.created_date) return false;
                const d = new Date(m.created_date);
                return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
            }).length
        },
        timeLogs: {
            total: safeTimeLogs.length,
            hoursThisMonth: (safeTimeLogs.filter(tl => {
                if (!tl || !tl.log_date) return false;
                const d = new Date(tl.log_date);
                return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
            }).reduce((s, t) => s + (t.duration_seconds || 0), 0) / 3600).toFixed(1)
        },
        invoices: {
            total: safeInvoices.length,
            thisMonth: safeInvoices.filter(inv => {
                if (!inv || !inv.created_date) return false;
                const d = new Date(inv.created_date);
                return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
            }).length,
            totalThisMonth: safeInvoices.filter(inv => {
                if (!inv || !inv.created_date) return false;
                const d = new Date(inv.created_date);
                return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
            }).reduce((s, i) => s + (i.amount || 0), 0)
        }
    };
}

// בניית קונטקסט מפורט
function buildCompactContext(data) {
    const { clients, projects, tasks, timeLogs, meetings, invoices, question, stats } = data;
    
    // ✅ הגנה על arrays
    const safeClients = Array.isArray(clients) ? clients : [];
    const safeProjects = Array.isArray(projects) ? projects : [];
    const safeTasks = Array.isArray(tasks) ? tasks : [];
    const safeTimeLogs = Array.isArray(timeLogs) ? timeLogs : [];
    const safeMeetings = Array.isArray(meetings) ? meetings : [];
    const safeInvoices = Array.isArray(invoices) ? invoices : [];
    
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const thisMonth = today.getMonth();
    const thisYear = today.getFullYear();

    let context = '';

    // פעילות היום
    const todayTimeLogs = safeTimeLogs.filter(tl => tl && tl.log_date === todayStr);
    const todayMeetings = safeMeetings.filter(m => {
        if (!m || !m.meeting_date) return false;
        const mDate = new Date(m.meeting_date);
        return mDate.toISOString().split('T')[0] === todayStr;
    });

    if (todayTimeLogs.length > 0 || todayMeetings.length > 0) {
        context += `## 📅 פעילות היום (${todayStr})\n`;
        if (todayTimeLogs.length > 0) {
            const hours = (todayTimeLogs.reduce((s, t) => s + (t.duration_seconds || 0), 0) / 3600).toFixed(1);
            context += `שעות עבודה: ${hours}h\n`;
        }
        if (todayMeetings.length > 0) {
            context += `פגישות: ${todayMeetings.map(m => m.title || 'ללא שם').join(', ')}\n`;
        }
        context += '\n';
    }

    // לקוחות - אם השאלה קשורה ללקוחות
    const lowerQuestion = (question || '').toLowerCase();
    const isClientQuery = lowerQuestion.includes('לקוח') || 
                          lowerQuestion.includes('client') ||
                          lowerQuestion.includes('כמה') ||
                          lowerQuestion.includes('מי');
    
    if (isClientQuery) {
        context += `## 👥 לקוחות מפורטים\n\n`;
        
        const activeClients = safeClients.filter(c => c && c.status === 'פעיל');
        const potentialClients = safeClients.filter(c => c && c.status === 'פוטנציאלי');
        
        if (activeClients.length > 0) {
            context += `### לקוחות פעילים (${activeClients.length}):\n`;
            activeClients.slice(0, 50).forEach(c => {
                if (!c) return;
                context += `- ${c.name || 'ללא שם'}`;
                if (c.email) context += ` | ${c.email}`;
                if (c.phone) context += ` | ${c.phone}`;
                const clientProjects = safeProjects.filter(p => p && p.client_id === c.id);
                if (clientProjects.length > 0) {
                    context += ` | פרויקטים: ${clientProjects.length}`;
                }
                context += '\n';
            });
            if (activeClients.length > 50) {
                context += `... ועוד ${activeClients.length - 50} לקוחות פעילים נוספים\n`;
            }
            context += '\n';
        }
        
        if (potentialClients.length > 0) {
            context += `### לקוחות פוטנציאליים (${potentialClients.length}):\n`;
            potentialClients.slice(0, 30).forEach(c => {
                if (!c) return;
                context += `- ${c.name || 'ללא שם'}`;
                if (c.email) context += ` | ${c.email}`;
                context += '\n';
            });
            if (potentialClients.length > 30) {
                context += `... ועוד ${potentialClients.length - 30} לקוחות פוטנציאליים נוספים\n`;
            }
            context += '\n';
        }
    }

    // פרויקטים דחופים
    const urgentProjects = safeProjects.filter(p => {
        if (!p || !p.end_date) return false;
        if (p.status !== 'בביצוע' && p.status !== 'תכנון') return false;
        const days = Math.ceil((new Date(p.end_date) - today) / (1000 * 60 * 60 * 24));
        return days <= 30 && days >= 0;
    });

    if (urgentProjects.length > 0) {
        context += `## ⚠️ פרויקטים דחופים (${urgentProjects.length})\n`;
        urgentProjects.slice(0, 15).forEach(p => {
            const days = Math.ceil((new Date(p.end_date) - today) / (1000 * 60 * 60 * 24));
            context += `- ${p.name || 'ללא שם'} (${p.client_name || 'לקוח לא ידוע'}): ${days} ימים | ${p.status}\n`;
        });
        context += '\n';
    }

    // משימות פתוחות
    const openTasks = safeTasks.filter(t => t && t.status !== 'הושלמה');
    if (openTasks.length > 0) {
        const highPriority = openTasks.filter(t => t && t.priority === 'גבוהה');
        if (highPriority.length > 0) {
            context += `## ✅ משימות דחופות (${highPriority.length})\n`;
            highPriority.slice(0, 15).forEach(t => {
                if (!t) return;
                context += `- ${t.title || 'ללא כותרת'}`;
                if (t.project_name) context += ` | ${t.project_name}`;
                context += ` | ${t.status}`;
                if (t.due_date) {
                    const dueDate = new Date(t.due_date);
                    const daysUntil = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
                    context += ` | יעד: ${daysUntil} ימים`;
                }
                context += '\n';
            });
            context += '\n';
        }
    }

    // שעות עבודה לפי לקוח החודש
    const thisMonthLogs = safeTimeLogs.filter(tl => {
        if (!tl || !tl.log_date) return false;
        const d = new Date(tl.log_date);
        return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    });

    if (thisMonthLogs.length > 0) {
        const byClient = {};
        thisMonthLogs.forEach(t => {
            if (!t) return;
            const name = t.client_name || 'לא משויך';
            byClient[name] = (byClient[name] || 0) + (t.duration_seconds || 0);
        });
        
        const topClients = Object.entries(byClient)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);
        
        if (topClients.length > 0) {
            context += `## ⏱️ שעות עבודה החודש (לפי לקוח)\n`;
            topClients.forEach(([name, secs]) => {
                context += `- ${name}: ${(secs/3600).toFixed(1)}h\n`;
            });
            context += '\n';
        }
    }

    return context;
}