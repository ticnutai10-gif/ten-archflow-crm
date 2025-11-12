import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        console.log('🎯 [PROJECT INSIGHTS] Starting advanced project analysis...');
        
        const base44 = createClientFromRequest(req);
        
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.log('👤 [PROJECT INSIGHTS] User:', user.email);

        // טעינת כל הנתונים
        const [projects, tasks, timeLogs, clients] = await Promise.all([
            base44.asServiceRole.entities.Project.list('-created_date', 2000).catch(() => []),
            base44.asServiceRole.entities.Task.list('-created_date', 3000).catch(() => []),
            base44.asServiceRole.entities.TimeLog.list('-created_date', 5000).catch(() => []),
            base44.asServiceRole.entities.Client.list('-created_date', 2000).catch(() => [])
        ]);

        console.log('✅ [PROJECT INSIGHTS] Data loaded:', {
            projects: projects.length,
            tasks: tasks.length,
            timeLogs: timeLogs.length,
            clients: clients.length
        });

        const insights = analyzeProjects({
            projects,
            tasks,
            timeLogs,
            clients
        });

        console.log('✅ [PROJECT INSIGHTS] Analysis complete');

        return Response.json({
            insights,
            timestamp: new Date().toISOString(),
            user: user.email
        });

    } catch (error) {
        console.error('❌ [PROJECT INSIGHTS] Error:', error);
        return Response.json({ 
            error: error.message,
            details: error.stack
        }, { status: 500 });
    }
});

function analyzeProjects(data) {
    const { projects, tasks, timeLogs, clients } = data;
    const today = new Date();

    const activeProjects = projects.filter(p => 
        p.status === 'בביצוע' || p.status === 'תכנון' || p.status === 'היתרים'
    );

    const projectAnalysis = activeProjects.map(project => {
        const analysis = analyzeProject(project, tasks, timeLogs, today);
        return {
            projectId: project.id,
            projectName: project.name,
            clientName: project.client_name,
            status: project.status,
            ...analysis
        };
    });

    // מיון לפי רמת סיכון (הכי מסוכן ראשון) - FIX: access risk.riskScore correctly
    const sortedByRisk = [...projectAnalysis].sort((a, b) => (b.risk?.riskScore || 0) - (a.risk?.riskScore || 0));

    return {
        total: projects.length,
        active: activeProjects.length,
        atRisk: projectAnalysis.filter(p => p.risk?.riskLevel === 'high').length,
        projects: sortedByRisk,
        summary: generateProjectSummary(projectAnalysis)
    };
}

function analyzeProject(project, allTasks, allTimeLogs, today) {
    // משימות הפרויקט
    const projectTasks = allTasks.filter(t => t.project_id === project.id);
    const completedTasks = projectTasks.filter(t => t.status === 'הושלמה');
    const openTasks = projectTasks.filter(t => t.status !== 'הושלמה');
    const overdueTasks = openTasks.filter(t => {
        if (!t.due_date) return false;
        return new Date(t.due_date) < today;
    });

    // חישוב אחוז השלמה
    const completionRate = projectTasks.length > 0 
        ? (completedTasks.length / projectTasks.length * 100).toFixed(1)
        : 0;

    // ניתוח time logs
    const projectLogs = allTimeLogs.filter(log => log.project_id === project.id);
    const totalHours = projectLogs.reduce((sum, log) => sum + (log.duration_seconds || 0), 0) / 3600;
    
    // שעות בשבועיים האחרונים
    const twoWeeksAgo = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);
    const recentLogs = projectLogs.filter(log => new Date(log.log_date) > twoWeeksAgo);
    const recentHours = recentLogs.reduce((sum, log) => sum + (log.duration_seconds || 0), 0) / 3600;

    // ניתוח משאבים (מי עובד על הפרויקט)
    const contributors = new Set(projectLogs.map(log => log.created_by).filter(Boolean));
    const contributorCount = contributors.size;

    // חישוב מהירות עבודה (tasks per week)
    const projectAge = Math.max(1, Math.ceil((today - new Date(project.start_date || project.created_date)) / (1000 * 60 * 60 * 24 * 7)));
    const taskCompletionRate = completedTasks.length / projectAge;

    // ניתוח דדלין
    let daysUntilDeadline = null;
    let deadlineStatus = 'none';
    let estimatedCompletion = null;

    if (project.end_date) {
        const endDate = new Date(project.end_date);
        daysUntilDeadline = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
        
        if (daysUntilDeadline < 0) {
            deadlineStatus = 'overdue';
        } else if (daysUntilDeadline <= 7) {
            deadlineStatus = 'critical';
        } else if (daysUntilDeadline <= 14) {
            deadlineStatus = 'warning';
        } else {
            deadlineStatus = 'ok';
        }

        // חיזוי זמן השלמה בהתאם למהירות הנוכחית
        if (openTasks.length > 0 && taskCompletionRate > 0) {
            const weeksNeeded = openTasks.length / taskCompletionRate;
            const estimatedDate = new Date(today.getTime() + weeksNeeded * 7 * 24 * 60 * 60 * 1000);
            estimatedCompletion = {
                date: estimatedDate.toISOString().split('T')[0],
                weeksNeeded: weeksNeeded.toFixed(1),
                willMeetDeadline: estimatedDate <= endDate
            };
        }
    }

    // חישוב ציון סיכון (0-100, גבוה = מסוכן יותר)
    let riskScore = 0;
    const riskFactors = [];

    // פקטור 1: אחוז השלמה נמוך
    if (completionRate < 30 && projectTasks.length > 0) {
        riskScore += 20;
        riskFactors.push('אחוז השלמה נמוך מאוד');
    } else if (completionRate < 50 && projectTasks.length > 0) {
        riskScore += 10;
        riskFactors.push('אחוז השלמה נמוך');
    }

    // פקטור 2: משימות שעברו דדלין
    if (overdueTasks.length > 0) {
        riskScore += overdueTasks.length * 5;
        riskFactors.push(`${overdueTasks.length} משימות עברו דדלין`);
    }

    // פקטור 3: חוסר פעילות
    if (recentHours < 2 && project.status === 'בביצוע') {
        riskScore += 25;
        riskFactors.push('אין כמעט פעילות בשבועיים האחרונים');
    } else if (recentHours < 5 && project.status === 'בביצוע') {
        riskScore += 10;
        riskFactors.push('פעילות נמוכה בשבועיים האחרונים');
    }

    // פקטור 4: קרוב לדדלין
    if (deadlineStatus === 'critical') {
        riskScore += 30;
        riskFactors.push('דדלין קריטי (פחות משבוע)');
    } else if (deadlineStatus === 'warning') {
        riskScore += 15;
        riskFactors.push('דדלין קרב (פחות מ-14 ימים)');
    } else if (deadlineStatus === 'overdue') {
        riskScore += 40;
        riskFactors.push('עבר את הדדלין!');
    }

    // פקטור 5: חוסר משאבים
    if (contributorCount === 0) {
        riskScore += 20;
        riskFactors.push('אין עובדים על הפרויקט');
    } else if (contributorCount === 1 && openTasks.length > 10) {
        riskScore += 10;
        riskFactors.push('רק עובד אחד לפרויקט גדול');
    }

    // פקטור 6: חיזוי שלא יעמוד בדדלין
    if (estimatedCompletion && !estimatedCompletion.willMeetDeadline) {
        riskScore += 25;
        riskFactors.push('חיזוי: לא יעמוד בדדלין');
    }

    // פקטור 7: פרויקט ללא משימות
    if (projectTasks.length === 0 && project.status === 'בביצוע') {
        riskScore += 15;
        riskFactors.push('אין משימות מוגדרות');
    }

    // קביעת רמת סיכון
    let riskLevel = 'low';
    if (riskScore >= 60) {
        riskLevel = 'high';
    } else if (riskScore >= 30) {
        riskLevel = 'medium';
    }

    // המלצות לאופטימיזציה
    const recommendations = generateRecommendations({
        project,
        completionRate: parseFloat(completionRate),
        recentHours,
        contributorCount,
        openTasks: openTasks.length,
        overdueTasks: overdueTasks.length,
        deadlineStatus,
        estimatedCompletion,
        riskLevel,
        daysUntilDeadline
    });

    return {
        metrics: {
            totalTasks: projectTasks.length,
            completedTasks: completedTasks.length,
            openTasks: openTasks.length,
            overdueTasks: overdueTasks.length,
            completionRate: parseFloat(completionRate),
            totalHours: totalHours.toFixed(1),
            recentHours: recentHours.toFixed(1),
            contributorCount,
            taskCompletionRate: taskCompletionRate.toFixed(2)
        },
        timeline: {
            daysUntilDeadline,
            deadlineStatus,
            estimatedCompletion
        },
        risk: {
            riskScore: Math.min(100, riskScore),
            riskLevel,
            riskFactors
        },
        recommendations
    };
}

function generateRecommendations(data) {
    const recommendations = [];

    // המלצה 1: הוספת משאבים
    if (data.contributorCount <= 1 && data.openTasks > 10) {
        recommendations.push({
            priority: 'high',
            category: 'resources',
            title: 'הוסף משאבים לפרויקט',
            description: `הפרויקט כולל ${data.openTasks} משימות פתוחות אבל רק ${data.contributorCount} עובד. מומלץ להוסיף עוד משאבים.`,
            action: 'שייך עובדים נוספים לפרויקט'
        });
    }

    // המלצה 2: טיפול במשימות שעברו דדלין
    if (data.overdueTasks > 0) {
        recommendations.push({
            priority: 'high',
            category: 'tasks',
            title: 'טפל במשימות שעברו דדלין',
            description: `${data.overdueTasks} משימות עברו את תאריך היעד שלהן.`,
            action: 'עדכן תאריכים או סגור משימות שהושלמו'
        });
    }

    // המלצה 3: הגבר פעילות
    if (data.recentHours < 5 && data.project.status === 'בביצוע') {
        recommendations.push({
            priority: 'high',
            category: 'activity',
            title: 'הגבר את הפעילות בפרויקט',
            description: `רק ${data.recentHours.toFixed(1)} שעות עבודה בשבועיים האחרונים. פרויקט בביצוע צריך יותר פעילות.`,
            action: 'קבע פגישת סטטוס ותכנן את השלבים הבאים'
        });
    }

    // המלצה 4: עדכן דדלין
    if (data.estimatedCompletion && !data.estimatedCompletion.willMeetDeadline) {
        recommendations.push({
            priority: 'high',
            category: 'timeline',
            title: 'עדכן את דדלין הפרויקט',
            description: `לפי המהירות הנוכחית, הפרויקט יסתיים ב-${data.estimatedCompletion.date} (${data.estimatedCompletion.weeksNeeded} שבועות). זה אחרי הדדלין המקורי.`,
            action: 'עדכן את תאריך היעד או הגבר את הקצב'
        });
    }

    // המלצה 5: הוסף משימות
    if (data.project.status === 'בביצוע' && data.openTasks === 0) {
        recommendations.push({
            priority: 'medium',
            category: 'planning',
            title: 'תכנן את השלבים הבאים',
            description: 'אין משימות פתוחות. מומלץ לתכנן את השלבים הבאים.',
            action: 'צור משימות לשלבים הבאים של הפרויקט'
        });
    }

    // המלצה 6: חגוג הצלחה
    if (data.completionRate > 90 && data.riskLevel === 'low') {
        recommendations.push({
            priority: 'low',
            category: 'success',
            title: 'הפרויקט בדרך מצוינת!',
            description: `${data.completionRate}% מהמשימות הושלמו והכל מתקדם לפי התכנון.`,
            action: 'המשך במסלול הנוכחי'
        });
    }

    // המלצה 7: אופטימיזציה לדדלין קרוב
    if (data.deadlineStatus === 'warning' && data.openTasks > 5) {
        recommendations.push({
            priority: 'high',
            category: 'optimization',
            title: 'סדר עדיפויות למשימות',
            description: `נותרו ${data.daysUntilDeadline} ימים ו-${data.openTasks} משימות פתוחות.`,
            action: 'סמן משימות קריטיות ודחה משימות לא חיוניות'
        });
    }

    return recommendations;
}

function generateProjectSummary(projectAnalysis) {
    const highRisk = projectAnalysis.filter(p => p.risk?.riskLevel === 'high');
    const mediumRisk = projectAnalysis.filter(p => p.risk?.riskLevel === 'medium');
    const onTrack = projectAnalysis.filter(p => p.risk?.riskLevel === 'low');

    const avgCompletionRate = projectAnalysis.length > 0
        ? (projectAnalysis.reduce((sum, p) => sum + (p.metrics?.completionRate || 0), 0) / projectAnalysis.length).toFixed(1)
        : 0;

    const totalRecommendations = projectAnalysis.reduce((sum, p) => sum + (p.recommendations?.length || 0), 0);

    return {
        healthScore: calculateHealthScore(projectAnalysis),
        distribution: {
            highRisk: highRisk.length,
            mediumRisk: mediumRisk.length,
            onTrack: onTrack.length
        },
        avgCompletionRate: parseFloat(avgCompletionRate),
        totalRecommendations,
        topRisks: highRisk.slice(0, 5).map(p => ({
            name: p.projectName,
            client: p.clientName,
            riskScore: p.risk?.riskScore || 0,
            mainIssue: p.risk?.riskFactors?.[0] || 'לא זוהה'
        }))
    };
}

function calculateHealthScore(projectAnalysis) {
    if (projectAnalysis.length === 0) return 100;

    let score = 100;

    projectAnalysis.forEach(project => {
        if (project.risk?.riskLevel === 'high') {
            score -= 15;
        } else if (project.risk?.riskLevel === 'medium') {
            score -= 5;
        }
    });

    return Math.max(0, Math.min(100, score));
}