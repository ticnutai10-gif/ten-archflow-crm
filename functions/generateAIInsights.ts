import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🤖 Generating AI insights...');

    // Load all relevant data
    const [clients, projects, tasks, communications, meetings] = await Promise.all([
      base44.asServiceRole.entities.Client.list('-updated_date'),
      base44.asServiceRole.entities.Project.list('-updated_date'),
      base44.asServiceRole.entities.Task.filter({ status: { $ne: 'הושלמה' } }),
      base44.asServiceRole.entities.CommunicationMessage.list('-created_date', 100),
      base44.asServiceRole.entities.Meeting.list('-meeting_date', 50)
    ]);

    console.log(`📊 Analyzing: ${clients.length} clients, ${projects.length} projects, ${tasks.length} tasks`);

    const insights = [];
    const now = new Date();

    // 1. Detect clients at risk (no communication in 30+ days)
    for (const client of clients.filter(c => c.status === 'פעיל')) {
      const clientComms = communications.filter(c => c.client_id === client.id);
      
      if (clientComms.length === 0) continue;
      
      const lastComm = new Date(clientComms[0].created_date);
      const daysSinceLastComm = Math.floor((now - lastComm) / (1000 * 60 * 60 * 24));
      
      if (daysSinceLastComm > 30) {
        insights.push({
          title: `לקוח בסיכון: ${client.name}`,
          description: `לא היתה תקשורת עם ${client.name} כבר ${daysSinceLastComm} ימים`,
          insight_type: 'risk_detection',
          severity: daysSinceLastComm > 60 ? 'high' : 'medium',
          entity_type: 'client',
          entity_id: client.id,
          entity_name: client.name,
          suggested_actions: [
            {
              action_type: 'send_email',
              description: 'שלח מייל מעקב',
              params: {
                to: client.email,
                subject: `עדכון - ${client.name}`,
                body: `שלום ${client.name},\n\nרצינו לבדוק איך הדברים?\n\nנשמח לשמוע ממך.`
              }
            },
            {
              action_type: 'schedule_meeting',
              description: 'קבע פגישת מעקב',
              params: {
                client_name: client.name,
                title: `פגישת מעקב - ${client.name}`
              }
            }
          ],
          confidence_score: 85
        });
      }
    }

    // 2. Detect overdue tasks
    const overdueTasks = tasks.filter(t => {
      if (!t.due_date) return false;
      return new Date(t.due_date) < now;
    });

    if (overdueTasks.length > 0) {
      insights.push({
        title: `${overdueTasks.length} משימות באיחור`,
        description: `נמצאו ${overdueTasks.length} משימות שעברו את מועד היעד שלהן`,
        insight_type: 'alert',
        severity: overdueTasks.length > 10 ? 'critical' : overdueTasks.length > 5 ? 'high' : 'medium',
        entity_type: 'task',
        entity_id: overdueTasks[0]?.id,
        entity_name: overdueTasks[0]?.title,
        suggested_actions: [
          {
            action_type: 'create_task',
            description: 'צור משימת מעקב',
            params: {
              title: 'טיפול במשימות באיחור',
              priority: 'גבוהה',
              description: `קיימות ${overdueTasks.length} משימות שעברו מועד יעד`
            }
          }
        ],
        confidence_score: 100
      });
    }

    // 3. Detect projects with no recent activity
    for (const project of projects.filter(p => p.status === 'ביצוע')) {
      const projectTasks = tasks.filter(t => t.project_id === project.id);
      const recentTasks = projectTasks.filter(t => {
        const taskDate = new Date(t.created_date);
        const daysSince = Math.floor((now - taskDate) / (1000 * 60 * 60 * 24));
        return daysSince <= 14;
      });

      if (projectTasks.length > 0 && recentTasks.length === 0) {
        insights.push({
          title: `פרויקט ללא פעילות: ${project.name}`,
          description: `לא נוצרו משימות חדשות בפרויקט ${project.name} ב-14 הימים האחרונים`,
          insight_type: 'alert',
          severity: 'medium',
          entity_type: 'project',
          entity_id: project.id,
          entity_name: project.name,
          suggested_actions: [
            {
              action_type: 'schedule_meeting',
              description: 'קבע פגישת סטטוס',
              params: {
                project_name: project.name,
                title: `סטטוס פרויקט - ${project.name}`
              }
            }
          ],
          confidence_score: 75
        });
      }
    }

    // 4. Detect clients ready for next stage
    for (const client of clients.filter(c => c.stage && c.stage !== 'סיום')) {
      const clientTasks = tasks.filter(t => t.client_id === client.id);
      const completedTasks = clientTasks.filter(t => t.status === 'הושלמה');
      
      if (clientTasks.length > 0) {
        const completionRate = (completedTasks.length / clientTasks.length) * 100;
        
        if (completionRate >= 80) {
          const stageMap = {
            'ברור_תכן': 'תיק_מידע',
            'תיק_מידע': 'היתרים',
            'היתרים': 'ביצוע',
            'ביצוע': 'סיום'
          };
          
          const nextStage = stageMap[client.stage];
          
          if (nextStage) {
            insights.push({
              title: `לקוח מוכן לשלב הבא: ${client.name}`,
              description: `${completionRate.toFixed(0)}% מהמשימות הושלמו. ${client.name} מוכן לעבור לשלב ${nextStage}`,
              insight_type: 'opportunity',
              severity: 'medium',
              entity_type: 'client',
              entity_id: client.id,
              entity_name: client.name,
              suggested_actions: [
                {
                  action_type: 'update_status',
                  description: `העבר לשלב ${nextStage}`,
                  params: {
                    client_id: client.id,
                    new_stage: nextStage
                  }
                }
              ],
              confidence_score: Math.min(completionRate, 95)
            });
          }
        }
      }
    }

    // 5. Suggest follow-up meetings
    const upcomingMeetings = meetings.filter(m => 
      new Date(m.meeting_date) > now && 
      Math.floor((new Date(m.meeting_date) - now) / (1000 * 60 * 60 * 24)) <= 7
    );

    for (const meeting of upcomingMeetings) {
      const daysTillMeeting = Math.floor((new Date(meeting.meeting_date) - now) / (1000 * 60 * 60 * 24));
      
      if (daysTillMeeting <= 2 && daysTillMeeting > 0) {
        insights.push({
          title: `פגישה מתקרבת: ${meeting.title}`,
          description: `הפגישה "${meeting.title}" מתקיימת בעוד ${daysTillMeeting} ימים`,
          insight_type: 'suggestion',
          severity: 'low',
          entity_type: 'client',
          entity_id: meeting.client_id,
          entity_name: meeting.client_name,
          suggested_actions: [
            {
              action_type: 'send_email',
              description: 'שלח תזכורת ללקוח',
              params: {
                to: '{{client_email}}',
                subject: `תזכורת: פגישה מחר`,
                body: `שלום,\n\nרק רצינו להזכיר על הפגישה שלנו מחר.\n\nנתראה!`
              }
            },
            {
              action_type: 'create_reminder',
              description: 'הוסף תזכורת למערכת',
              params: {
                title: `הכן לפגישה: ${meeting.title}`
              }
            }
          ],
          confidence_score: 90
        });
      }
    }

    // Save insights to database
    const savedInsights = [];
    for (const insight of insights) {
      // Check if similar insight already exists
      const existing = await base44.asServiceRole.entities.AIInsight.filter({
        entity_id: insight.entity_id,
        insight_type: insight.insight_type,
        status: 'new'
      });

      if (existing.length === 0) {
        const saved = await base44.asServiceRole.entities.AIInsight.create(insight);
        savedInsights.push(saved);
      }
    }

    console.log(`✅ Generated ${savedInsights.length} new insights`);

    return Response.json({
      success: true,
      insights_generated: savedInsights.length,
      insights: savedInsights
    });

  } catch (error) {
    console.error('Error generating insights:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});