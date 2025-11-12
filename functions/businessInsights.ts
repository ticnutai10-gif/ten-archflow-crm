import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        console.log('🧠 [INSIGHTS] Starting business insights analysis...');
        
        const base44 = createClientFromRequest(req);
        
        // אימות משתמש
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.log('👤 [INSIGHTS] User:', user.email);

        // טעינת כל הנתונים
        console.log('📊 [INSIGHTS] Loading all data...');
        
        const [clients, projects, tasks, timeLogs, meetings, invoices, quotes] = await Promise.all([
            base44.asServiceRole.entities.Client.list('-created_date', 2000).catch(() => []),
            base44.asServiceRole.entities.Project.list('-created_date', 2000).catch(() => []),
            base44.asServiceRole.entities.Task.list('-created_date', 3000).catch(() => []),
            base44.asServiceRole.entities.TimeLog.list('-created_date', 5000).catch(() => []),
            base44.asServiceRole.entities.Meeting.list('-created_date', 2000).catch(() => []),
            base44.asServiceRole.entities.Invoice.list('-created_date', 2000).catch(() => []),
            base44.asServiceRole.entities.Quote.list('-created_date', 1000).catch(() => [])
        ]);

        console.log('✅ [INSIGHTS] Data loaded:', {
            clients: clients.length,
            projects: projects.length,
            tasks: tasks.length,
            timeLogs: timeLogs.length,
            meetings: meetings.length,
            invoices: invoices.length,
            quotes: quotes.length
        });

        const insights = analyzeBusinessData({
            clients,
            projects,
            tasks,
            timeLogs,
            meetings,
            invoices,
            quotes
        });

        console.log('✅ [INSIGHTS] Analysis complete');

        return Response.json({
            insights,
            timestamp: new Date().toISOString(),
            user: user.email
        });

    } catch (error) {
        console.error('❌ [INSIGHTS] Error:', error);
        return Response.json({ 
            error: error.message,
            details: error.stack
        }, { status: 500 });
    }
});

function analyzeBusinessData(data) {
    const { clients, projects, tasks, timeLogs, meetings, invoices, quotes } = data;
    
    // ✅ הגנה על arrays
    const safeClients = Array.isArray(clients) ? clients : [];
    const safeProjects = Array.isArray(projects) ? projects : [];
    const safeTasks = Array.isArray(tasks) ? tasks : [];
    const safeTimeLogs = Array.isArray(timeLogs) ? timeLogs : [];
    const safeMeetings = Array.isArray(meetings) ? meetings : [];
    const safeInvoices = Array.isArray(invoices) ? invoices : [];
    const safeQuotes = Array.isArray(quotes) ? quotes : [];
    
    const today = new Date();
    const thisMonth = today.getMonth();
    const thisYear = today.getFullYear();
    const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
    const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear;
    
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    // 1. ניתוח לקוחות
    const clientInsights = analyzeClients(safeClients, safeTimeLogs, safeProjects, thirtyDaysAgo);
    
    // 2. ניתוח פרויקטים
    const projectInsights = analyzeProjects(safeProjects, safeTasks, safeTimeLogs, today);
    
    // 3. ניתוח כספי
    const financialInsights = analyzeFinancials(safeInvoices, safeTimeLogs, thisMonth, thisYear, lastMonth, lastMonthYear);
    
    // 4. ניתוח משימות
    const taskInsights = analyzeTasks(safeTasks, today);
    
    // 5. הזדמנויות עסקיות
    const opportunities = findOpportunities(safeClients, safeProjects, safeQuotes, safeTimeLogs, thirtyDaysAgo);
    
    // 6. ניתוח פרודוקטיביות
    const productivityInsights = analyzeProductivity(safeTimeLogs, thisMonth, thisYear);

    return {
        summary: generateSummary({
            clients: clientInsights,
            projects: projectInsights,
            financials: financialInsights,
            tasks: taskInsights,
            opportunities,
            productivity: productivityInsights
        }),
        clients: clientInsights,
        projects: projectInsights,
        financials: financialInsights,
        tasks: taskInsights,
        opportunities,
        productivity: productivityInsights
    };
}

function analyzeClients(clients, timeLogs, projects, thirtyDaysAgo) {
    const activeClients = clients.filter(c => c && c.status === 'פעיל');
    const potentialClients = clients.filter(c => c && c.status === 'פוטנציאלי');
    
    // לקוחות ללא פעילות
    const inactiveClients = activeClients.filter(client => {
        if (!client) return false;
        const clientLogs = timeLogs.filter(log => 
            log && log.client_id === client.id && new Date(log.log_date) > thirtyDaysAgo
        );
        return clientLogs.length === 0;
    }).map(c => ({
        id: c.id,
        name: c.name || 'ללא שם',
        email: c.email,
        daysSinceActivity: Math.floor((new Date() - new Date(c.updated_date)) / (1000 * 60 * 60 * 24))
    }));

    // לקוחות VIP (הכי הרבה שעות)
    const clientHours = {};
    timeLogs.forEach(log => {
        if (!log) return;
        const clientName = log.client_name || 'לא משויך';
        clientHours[clientName] = (clientHours[clientName] || 0) + (log.duration_seconds || 0);
    });
    
    const topClients = Object.entries(clientHours)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, seconds]) => ({
            name,
            hours: (seconds / 3600).toFixed(1)
        }));

    // לקוחות פוטנציאליים ישנים (יותר מחודש)
    const oldPotentialClients = potentialClients.filter(c => {
        if (!c || !c.created_date) return false;
        const daysSince = Math.floor((new Date() - new Date(c.created_date)) / (1000 * 60 * 60 * 24));
        return daysSince > 30;
    }).map(c => ({
        id: c.id,
        name: c.name || 'ללא שם',
        daysSince: Math.floor((new Date() - new Date(c.created_date)) / (1000 * 60 * 60 * 24))
    }));

    return {
        total: clients.length,
        active: activeClients.length,
        potential: potentialClients.length,
        inactive: inactiveClients,
        topClients,
        oldPotentialClients
    };
}

function analyzeProjects(projects, tasks, timeLogs, today) {
    const activeProjects = projects.filter(p => p && (p.status === 'בביצוע' || p.status === 'תכנון'));
    
    // פרויקטים בסיכון (קרובים לדדלין ללא עדכונים)
    const riskyProjects = activeProjects.filter(project => {
        if (!project || !project.end_date) return false;
        
        const endDate = new Date(project.end_date);
        const daysUntil = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
        
        if (daysUntil > 14 || daysUntil < 0) return false;
        
        // בדיקה אם יש time logs בשבוע האחרון
        const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        const recentLogs = timeLogs.filter(log => 
            log && log.project_id === project.id && new Date(log.log_date) > sevenDaysAgo
        );
        
        return recentLogs.length === 0;
    }).map(p => ({
        id: p.id,
        name: p.name || 'ללא שם',
        clientName: p.client_name || 'לקוח לא ידוע',
        daysUntilDeadline: Math.ceil((new Date(p.end_date) - today) / (1000 * 60 * 60 * 24)),
        status: p.status
    }));

    // פרויקטים שעברו דדלין
    const overdueProjects = activeProjects.filter(p => {
        if (!p || !p.end_date) return false;
        return new Date(p.end_date) < today;
    }).map(p => ({
        id: p.id,
        name: p.name || 'ללא שם',
        clientName: p.client_name || 'לקוח לא ידוע',
        daysOverdue: Math.floor((today - new Date(p.end_date)) / (1000 * 60 * 60 * 24))
    }));

    // פרויקטים ללא משימות פתוחות (חשוד)
    const projectsWithoutTasks = activeProjects.filter(project => {
        if (!project) return false;
        const projectTasks = tasks.filter(t => t && t.project_id === project.id && t.status !== 'הושלמה');
        return projectTasks.length === 0;
    }).map(p => ({
        id: p.id,
        name: p.name || 'ללא שם',
        clientName: p.client_name || 'לקוח לא ידוע',
        status: p.status
    }));

    return {
        total: projects.length,
        active: activeProjects.length,
        risky: riskyProjects,
        overdue: overdueProjects,
        withoutTasks: projectsWithoutTasks
    };
}

function analyzeFinancials(invoices, timeLogs, thisMonth, thisYear, lastMonth, lastMonthYear) {
    // הכנסות החודש
    const thisMonthInvoices = invoices.filter(inv => {
        if (!inv || !inv.created_date) return false;
        const d = new Date(inv.created_date);
        return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    });
    
    const thisMonthRevenue = thisMonthInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);

    // הכנסות חודש שעבר
    const lastMonthInvoices = invoices.filter(inv => {
        if (!inv || !inv.created_date) return false;
        const d = new Date(inv.created_date);
        return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
    });
    
    const lastMonthRevenue = lastMonthInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);

    // חשבוניות שלא שולמו
    const unpaidInvoices = invoices.filter(inv => 
        inv && inv.status !== 'paid' && inv.status !== 'canceled'
    ).map(inv => ({
        id: inv.id,
        number: inv.number,
        clientName: inv.client_name || 'לא ידוע',
        amount: inv.amount || 0,
        daysOverdue: Math.floor((new Date() - new Date(inv.due_date || inv.created_date)) / (1000 * 60 * 60 * 24))
    })).sort((a, b) => b.daysOverdue - a.daysOverdue);

    // לקוחות לפי הכנסות
    const revenueByClient = {};
    invoices.forEach(inv => {
        if (!inv) return;
        const clientName = inv.client_name || 'לא ידוע';
        revenueByClient[clientName] = (revenueByClient[clientName] || 0) + (inv.amount || 0);
    });
    
    const topRevenueClients = Object.entries(revenueByClient)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, amount]) => ({ name, amount }));

    // ניתוח שעות לעומת הכנסות
    const totalHours = timeLogs.reduce((sum, log) => sum + ((log && log.duration_seconds) || 0), 0) / 3600;
    const totalRevenue = invoices.reduce((sum, inv) => sum + ((inv && inv.amount) || 0), 0);
    const revenuePerHour = totalHours > 0 ? totalRevenue / totalHours : 0;

    return {
        thisMonth: {
            revenue: thisMonthRevenue,
            invoices: thisMonthInvoices.length
        },
        lastMonth: {
            revenue: lastMonthRevenue,
            invoices: lastMonthInvoices.length
        },
        change: {
            amount: thisMonthRevenue - lastMonthRevenue,
            percentage: lastMonthRevenue > 0 ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue * 100).toFixed(1) : 0
        },
        unpaidInvoices,
        topClients: topRevenueClients,
        revenuePerHour: revenuePerHour.toFixed(0)
    };
}

function analyzeTasks(tasks, today) {
    const openTasks = tasks.filter(t => t && t.status !== 'הושלמה');
    const highPriorityTasks = openTasks.filter(t => t && t.priority === 'גבוהה');
    
    // משימות שעברו דדלין
    const overdueTasks = openTasks.filter(t => {
        if (!t || !t.due_date) return false;
        return new Date(t.due_date) < today;
    }).map(t => ({
        id: t.id,
        title: t.title || 'ללא כותרת',
        projectName: t.project_name,
        daysOverdue: Math.floor((today - new Date(t.due_date)) / (1000 * 60 * 60 * 24))
    }));

    return {
        total: tasks.length,
        open: openTasks.length,
        highPriority: highPriorityTasks.length,
        overdue: overdueTasks
    };
}

function findOpportunities(clients, projects, quotes, timeLogs, thirtyDaysAgo) {
    const opportunities = [];

    // פרויקטים שהסתיימו - הצע המשך
    const completedProjects = projects.filter(p => p && p.status === 'הושלם');
    completedProjects.forEach(project => {
        if (!project || !project.updated_date) return;
        const completionDate = new Date(project.updated_date);
        const daysSince = Math.floor((new Date() - completionDate) / (1000 * 60 * 60 * 24));
        
        if (daysSince < 60 && daysSince > 7) {
            opportunities.push({
                type: 'follow_up_project',
                priority: 'high',
                client: project.client_name || 'לקוח לא ידוע',
                projectName: project.name || 'ללא שם',
                suggestion: `פרויקט '${project.name || 'ללא שם'}' הושלם לפני ${daysSince} ימים. הצע שירותי תחזוקה, שדרוג או פרויקט המשך ללקוח ${project.client_name || 'לקוח לא ידוע'}.`
            });
        }
    });

    // לקוחות פוטנציאליים ללא הצעת מחיר
    const potentialClients = clients.filter(c => c && c.status === 'פוטנציאלי');
    potentialClients.forEach(client => {
        if (!client) return;
        const clientQuotes = quotes.filter(q => q && q.client_id === client.id);
        if (clientQuotes.length === 0 && client.created_date) {
            const daysSince = Math.floor((new Date() - new Date(client.created_date)) / (1000 * 60 * 60 * 24));
            if (daysSince > 7) {
                opportunities.push({
                    type: 'missing_quote',
                    priority: 'medium',
                    client: client.name || 'ללא שם',
                    suggestion: `לקוח פוטנציאלי '${client.name || 'ללא שם'}' (${daysSince} ימים) ללא הצעת מחיר. שלח הצעה או פנה לבירור צרכים.`
                });
            }
        }
    });

    // לקוחות עם הרבה שעות - הצע שירותים נוספים
    const clientHours = {};
    timeLogs.filter(log => log && log.log_date && new Date(log.log_date) > thirtyDaysAgo).forEach(log => {
        const clientName = log.client_name;
        if (clientName) {
            clientHours[clientName] = (clientHours[clientName] || 0) + (log.duration_seconds || 0);
        }
    });
    
    Object.entries(clientHours).forEach(([name, seconds]) => {
        const hours = seconds / 3600;
        if (hours > 40) {
            opportunities.push({
                type: 'upsell',
                priority: 'high',
                client: name,
                suggestion: `לקוח '${name}' עם ${hours.toFixed(1)} שעות בחודש האחרון. לקוח פעיל מאוד - הצע שירותים נוספים או חבילה מיוחדת.`
            });
        }
    });

    return opportunities.slice(0, 10);
}

function analyzeProductivity(timeLogs, thisMonth, thisYear) {
    const thisMonthLogs = timeLogs.filter(log => {
        if (!log || !log.log_date) return false;
        const d = new Date(log.log_date);
        return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    });

    const totalHours = (thisMonthLogs.reduce((s, l) => s + (l.duration_seconds || 0), 0) / 3600).toFixed(1);
    const workDays = new Set(thisMonthLogs.map(l => l.log_date)).size;
    const avgHoursPerDay = workDays > 0 ? (totalHours / workDays).toFixed(1) : 0;

    // פילוח לפי לקוח
    const byClient = {};
    thisMonthLogs.forEach(log => {
        if (!log) return;
        const name = log.client_name || 'לא משויך';
        byClient[name] = (byClient[name] || 0) + (log.duration_seconds || 0);
    });

    const topClients = Object.entries(byClient)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, secs]) => ({
            name,
            hours: (secs / 3600).toFixed(1)
        }));

    return {
        totalHours,
        workDays,
        avgHoursPerDay,
        topClients
    };
}

function generateSummary(data) {
    const { clients, projects, financials, tasks, opportunities, productivity } = data;
    
    const risks = [];
    const highlights = [];
    
    // סיכונים
    if (projects.risky && projects.risky.length > 0) {
        risks.push(`${projects.risky.length} פרויקטים בסיכון (קרובים לדדלין ללא עדכונים)`);
    }
    if (projects.overdue && projects.overdue.length > 0) {
        risks.push(`${projects.overdue.length} פרויקטים עברו דדלין`);
    }
    if (clients.inactive && clients.inactive.length > 0) {
        risks.push(`${clients.inactive.length} לקוחות פעילים ללא פעילות 30+ ימים`);
    }
    if (financials.unpaidInvoices && financials.unpaidInvoices.length > 0) {
        risks.push(`${financials.unpaidInvoices.length} חשבוניות ממתינות לתשלום`);
    }
    if (tasks.overdue && tasks.overdue.length > 0) {
        risks.push(`${tasks.overdue.length} משימות עברו דדלין`);
    }

    // הדגשים חיוביים
    if (financials.change && financials.change.amount > 0) {
        highlights.push(`הכנסות עלו ב-${financials.change.percentage}% מול חודש שעבר`);
    }
    if (opportunities && opportunities.length > 0) {
        highlights.push(`${opportunities.length} הזדמנויות עסקיות זוהו`);
    }
    if (productivity.totalHours > 100) {
        highlights.push(`${productivity.totalHours} שעות עבודה החודש (ממוצע ${productivity.avgHoursPerDay}h/יום)`);
    }

    return {
        risks,
        highlights,
        score: calculateHealthScore(data)
    };
}

function calculateHealthScore(data) {
    let score = 100;
    
    // הפחתות
    if (data.projects.risky) score -= data.projects.risky.length * 5;
    if (data.projects.overdue) score -= data.projects.overdue.length * 10;
    if (data.clients.inactive) score -= data.clients.inactive.length * 2;
    if (data.financials.unpaidInvoices) score -= data.financials.unpaidInvoices.length * 3;
    if (data.tasks.overdue) score -= data.tasks.overdue.length * 2;
    
    // בונוסים
    if (data.financials.change && data.financials.change.amount > 0) score += 10;
    if (data.opportunities && data.opportunities.length > 5) score += 5;
    
    return Math.max(0, Math.min(100, score));
}