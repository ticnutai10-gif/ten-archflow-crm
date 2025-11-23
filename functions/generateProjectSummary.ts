import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Authentication
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId, period = 'weekly' } = await req.json();

    if (!projectId) {
      return Response.json({ error: 'Missing projectId' }, { status: 400 });
    }

    // Fetch project data
    const project = await base44.entities.Project.get(projectId);
    if (!project) {
      return Response.json({ error: 'Project not found' }, { status: 404 });
    }

    // Fetch related data
    const [subtasks, timeLogs, tasks] = await Promise.all([
      base44.entities.SubTask.filter({ project_id: projectId }).catch(() => []),
      base44.entities.TimeLog.filter({ project_name: project.name }).catch(() => []),
      base44.entities.Task.filter({ project_id: projectId }).catch(() => [])
    ]);

    // Calculate date range based on period
    const now = new Date();
    let startDate;
    if (period === 'weekly') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === 'monthly') {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // Filter data by date range
    const recentSubtasks = subtasks.filter(st => 
      new Date(st.updated_date || st.created_date) >= startDate
    );
    const recentTimeLogs = timeLogs.filter(tl => 
      new Date(tl.log_date) >= startDate
    );
    const recentTasks = tasks.filter(t => 
      new Date(t.updated_date || t.created_date) >= startDate
    );

    // Calculate statistics
    const stats = {
      totalSubtasks: subtasks.length,
      completedSubtasks: subtasks.filter(st => st.status === 'הושלם').length,
      inProgressSubtasks: subtasks.filter(st => st.status === 'בתהליך').length,
      totalHoursLogged: recentTimeLogs.reduce((sum, tl) => sum + (tl.duration_seconds || 0) / 3600, 0),
      totalEstimatedHours: subtasks.reduce((sum, st) => sum + (st.estimated_hours || 0), 0),
      totalActualHours: subtasks.reduce((sum, st) => sum + (st.actual_hours || 0), 0),
      progress: project.progress || 0,
      budget: project.budget || 0,
      estimatedBudget: project.estimated_budget || 0
    };

    // Prepare context for AI
    const context = {
      project: {
        name: project.name,
        client: project.client_name,
        status: project.status,
        type: project.type,
        startDate: project.start_date,
        endDate: project.end_date,
        progress: stats.progress,
        budget: stats.budget,
        estimatedBudget: stats.estimatedBudget
      },
      period: period === 'weekly' ? 'שבוע אחרון' : 'חודש אחרון',
      statistics: stats,
      recentActivity: {
        subtasksUpdated: recentSubtasks.length,
        tasksUpdated: recentTasks.length,
        hoursLogged: Math.round(stats.totalHoursLogged * 10) / 10
      },
      subtasks: subtasks.map(st => ({
        title: st.title,
        status: st.status,
        priority: st.priority,
        progress: st.progress,
        estimatedHours: st.estimated_hours,
        actualHours: st.actual_hours
      })).slice(0, 10) // Top 10 only
    };

    // Generate AI summary
    const prompt = `
אתה מנהל פרויקטים מנוסה. צור סיכום מקצועי ומפורט לפרויקט הבא:

**פרטי הפרויקט:**
- שם: ${context.project.name}
- לקוח: ${context.project.client}
- סטטוס: ${context.project.status}
- סוג: ${context.project.type}
- אחוז התקדמות: ${context.statistics.progress}%
- תקופת הסיכום: ${context.period}

**סטטיסטיקות:**
- סה"כ תת-משימות: ${context.statistics.totalSubtasks}
- הושלמו: ${context.statistics.completedSubtasks}
- בתהליך: ${context.statistics.inProgressSubtasks}
- שעות משוערות: ${Math.round(context.statistics.totalEstimatedHours)}
- שעות בפועל: ${Math.round(context.statistics.totalActualHours)}
- שעות נרשמו בתקופה: ${context.recentActivity.hoursLogged}

**פעילות אחרונה (${context.period}):**
- תת-משימות עודכנו: ${context.recentActivity.subtasksUpdated}
- משימות עודכנו: ${context.recentActivity.tasksUpdated}

צור סיכום המכיל:
1. **סטטוס כללי** - מצב הפרויקט הנוכחי בפסקה קצרה
2. **יעדים שהושגו** - הישגים עיקריים בתקופה (2-4 נקודות)
3. **אתגרים ובעיות** - בעיות או עיכובים שזוהו (2-3 נקודות)
4. **צעדים הבאים** - המלצות לשבוע/חודש הבא (2-3 נקודות)
5. **ניתוח משאבים** - ניתוח של שעות עבודה מול אומדן

היה ממוקד, מקצועי ובעברית. השתמש ב-Markdown לעיצוב.
`;

    const summaryResponse = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          overall_status: { type: "string", description: "סטטוס כללי" },
          achievements: { 
            type: "array", 
            items: { type: "string" },
            description: "רשימת הישגים"
          },
          challenges: { 
            type: "array", 
            items: { type: "string" },
            description: "רשימת אתגרים"
          },
          next_steps: { 
            type: "array", 
            items: { type: "string" },
            description: "צעדים הבאים"
          },
          resource_analysis: { type: "string", description: "ניתוח משאבים" },
          summary: { type: "string", description: "סיכום מלא בפורמט Markdown" }
        }
      }
    });

    return Response.json({
      success: true,
      project: {
        id: project.id,
        name: project.name,
        client: project.client_name
      },
      period,
      statistics: stats,
      summary: summaryResponse,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error generating project summary:', error);
    return Response.json({ 
      error: error.message || 'Failed to generate summary' 
    }, { status: 500 });
  }
});