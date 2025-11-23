import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, format, differenceInDays } from 'npm:date-fns';
import { he } from 'npm:date-fns/locale';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Check authentication
    const currentUser = await base44.auth.me();
    if (!currentUser) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { project_id, report_type = 'weekly' } = await req.json();
    
    if (!project_id) {
      return Response.json({ error: 'Missing project_id' }, { status: 400 });
    }

    // Load project data
    const project = await base44.entities.Project.get(project_id);
    if (!project) {
      return Response.json({ error: 'Project not found' }, { status: 404 });
    }

    // Calculate period
    const now = new Date();
    let periodStart, periodEnd;
    
    if (report_type === 'weekly') {
      periodStart = startOfWeek(now, { weekStartsOn: 0 });
      periodEnd = endOfWeek(now, { weekStartsOn: 0 });
    } else if (report_type === 'monthly') {
      periodStart = startOfMonth(now);
      periodEnd = endOfMonth(now);
    } else {
      periodStart = now;
      periodEnd = now;
    }

    // Load subtasks for the project
    const allSubtasks = await base44.entities.SubTask.filter({ project_id });
    
    // Calculate statistics
    const completedTasks = allSubtasks.filter(t => t.status === 'הושלם').length;
    const inProgressTasks = allSubtasks.filter(t => t.status === 'בתהליך').length;
    const notStartedTasks = allSubtasks.filter(t => t.status === 'לא התחיל').length;
    
    const totalEstimatedHours = allSubtasks.reduce((sum, t) => sum + (t.estimated_hours || 0), 0);
    const totalActualHours = allSubtasks.reduce((sum, t) => sum + (t.actual_hours || 0), 0);
    
    const avgProgress = allSubtasks.length > 0 
      ? allSubtasks.reduce((sum, t) => sum + (t.progress || 0), 0) / allSubtasks.length 
      : 0;

    // Schedule analysis
    let scheduleStatus = 'on_time';
    if (project.end_date) {
      const daysRemaining = differenceInDays(new Date(project.end_date), now);
      if (daysRemaining < 0) {
        scheduleStatus = 'delayed';
      } else if (avgProgress > 80 && daysRemaining > 30) {
        scheduleStatus = 'ahead';
      }
    }

    // Resource utilization
    const resourceUtilization = totalEstimatedHours > 0 
      ? Math.min(100, (totalActualHours / totalEstimatedHours) * 100)
      : 0;

    // Prepare data for AI analysis
    const projectData = {
      name: project.name,
      client: project.client_name,
      type: project.type,
      status: project.status,
      progress: project.progress || 0,
      budget: project.budget,
      estimatedBudget: project.estimated_budget,
      startDate: project.start_date,
      endDate: project.end_date,
      location: project.location,
      description: project.description,
      statistics: {
        totalTasks: allSubtasks.length,
        completedTasks,
        inProgressTasks,
        notStartedTasks,
        totalEstimatedHours,
        totalActualHours,
        avgProgress: Math.round(avgProgress),
        scheduleStatus,
        resourceUtilization: Math.round(resourceUtilization)
      },
      tasks: allSubtasks.map(t => ({
        title: t.title,
        status: t.status,
        priority: t.priority,
        progress: t.progress,
        assignedTo: t.assigned_to?.length || 0,
        estimatedHours: t.estimated_hours,
        actualHours: t.actual_hours
      }))
    };

    // Generate AI report using InvokeLLM
    const aiPrompt = `
אתה מנתח פרויקטים מקצועי. נתח את נתוני הפרויקט הבא והפק דוח מקצועי ומפורט בעברית.

**נתוני הפרויקט:**
${JSON.stringify(projectData, null, 2)}

**תקופת הדוח:** ${format(periodStart, 'dd/MM/yyyy', { locale: he })} - ${format(periodEnd, 'dd/MM/yyyy', { locale: he })}
**סוג דוח:** ${report_type === 'weekly' ? 'שבועי' : 'חודשי'}

נתח את הנתונים והפק דוח JSON עם המבנה הבא:
- summary: סיכום כללי קצר (2-3 משפטים) של מצב הפרויקט
- achievements: מערך של 3-5 הישגים מרכזיים שהושגו (כל פריט משפט אחד)
- challenges: מערך של 2-4 אתגרים או בעיות שזיהית (כל פריט משפט אחד)
- recommendations: מערך של 3-5 המלצות קונקרטיות לשיפור (כל פריט משפט אחד)
- ai_insights: תובנות נוספות חשובות - ניתוח עמוק של מגמות, סיכונים או הזדמנויות (פסקה אחת)

התמקד בניתוח ביצועים, ניצול משאבים, עמידה בלוחות זמנים, ואיכות ביצוע.
היה קונקרטי ומעשי בהמלצות.
`;

    const aiResponse = await base44.integrations.Core.InvokeLLM({
      prompt: aiPrompt,
      response_json_schema: {
        type: "object",
        properties: {
          summary: { type: "string" },
          achievements: { 
            type: "array",
            items: { type: "string" }
          },
          challenges: { 
            type: "array",
            items: { type: "string" }
          },
          recommendations: { 
            type: "array",
            items: { type: "string" }
          },
          ai_insights: { type: "string" }
        },
        required: ["summary", "achievements", "challenges", "recommendations"]
      }
    });

    // Create the report
    const report = await base44.entities.ProjectReport.create({
      project_id,
      project_name: project.name,
      report_type,
      period_start: format(periodStart, 'yyyy-MM-dd'),
      period_end: format(periodEnd, 'yyyy-MM-dd'),
      summary: aiResponse.summary,
      achievements: aiResponse.achievements || [],
      challenges: aiResponse.challenges || [],
      recommendations: aiResponse.recommendations || [],
      ai_insights: aiResponse.ai_insights || '',
      progress_percentage: Math.round(avgProgress),
      tasks_completed: completedTasks,
      tasks_in_progress: inProgressTasks,
      resource_utilization: Math.round(resourceUtilization),
      schedule_status: scheduleStatus
    });

    return Response.json({
      success: true,
      report,
      statistics: projectData.statistics
    });

  } catch (error) {
    console.error('Error generating project report:', error);
    return Response.json({ 
      error: error.message || 'Failed to generate report',
      details: error.stack
    }, { status: 500 });
  }
});