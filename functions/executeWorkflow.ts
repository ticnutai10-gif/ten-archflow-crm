import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Workflow Execution Engine
 * Executes workflow actions based on triggers
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { trigger_type, entity_id, entity_type, old_value, new_value } = await req.json();

    // Find active workflows matching the trigger
    const workflows = await base44.asServiceRole.entities.WorkflowAutomation.filter({
      active: true,
      'trigger.type': trigger_type
    });

    const results = [];

    for (const workflow of workflows) {
      // Check if workflow conditions match
      if (!checkConditions(workflow.trigger.conditions, { old_value, new_value })) {
        continue;
      }

      // Execute each action in sequence
      for (const action of workflow.actions) {
        // Wait for delay if specified
        if (action.delay_minutes > 0) {
          await new Promise(resolve => setTimeout(resolve, action.delay_minutes * 60 * 1000));
        }

        try {
          const actionResult = await executeAction(base44, action, {
            entity_id,
            entity_type,
            trigger_type,
            user_email: user.email
          });
          
          results.push({
            workflow_id: workflow.id,
            workflow_name: workflow.name,
            action_type: action.type,
            success: true,
            result: actionResult
          });
        } catch (error) {
          results.push({
            workflow_id: workflow.id,
            workflow_name: workflow.name,
            action_type: action.type,
            success: false,
            error: error.message
          });
        }
      }

      // Update execution stats
      await base44.asServiceRole.entities.WorkflowAutomation.update(workflow.id, {
        execution_count: (workflow.execution_count || 0) + 1,
        last_execution: new Date().toISOString()
      });
    }

    return Response.json({
      success: true,
      executed_workflows: workflows.length,
      results
    });

  } catch (error) {
    console.error('Workflow execution error:', error);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});

function checkConditions(conditions, context) {
  if (!conditions || Object.keys(conditions).length === 0) {
    return true;
  }

  for (const [key, value] of Object.entries(conditions)) {
    if (context[key] !== value) {
      return false;
    }
  }

  return true;
}

async function executeAction(base44, action, context) {
  const { type, params } = action;
  const { entity_id, entity_type, user_email } = context;

  switch (type) {
    case 'create_task': {
      const taskData = {
        title: params.title || 'משימה אוטומטית',
        description: params.description || '',
        priority: params.priority || 'בינונית',
        status: 'חדשה',
        created_by: user_email
      };

      if (entity_type === 'Client') {
        const client = await base44.asServiceRole.entities.Client.filter({ id: entity_id });
        if (client.length > 0) {
          taskData.client_id = client[0].id;
          taskData.client_name = client[0].name;
        }
      } else if (entity_type === 'Project') {
        const project = await base44.asServiceRole.entities.Project.filter({ id: entity_id });
        if (project.length > 0) {
          taskData.project_id = project[0].id;
          taskData.project_name = project[0].name;
        }
      }

      if (params.due_days_from_now) {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + params.due_days_from_now);
        taskData.due_date = dueDate.toISOString().split('T')[0];
      }

      return await base44.asServiceRole.entities.Task.create(taskData);
    }

    case 'send_email': {
      let recipient = params.to;

      if (!recipient && entity_type === 'Client') {
        const client = await base44.asServiceRole.entities.Client.filter({ id: entity_id });
        if (client.length > 0 && client[0].email) {
          recipient = client[0].email;
        }
      }

      if (!recipient) {
        throw new Error('No recipient email found');
      }

      return await base44.asServiceRole.integrations.Core.SendEmail({
        to: recipient,
        subject: params.subject || 'עדכון ממערכת CRM',
        body: params.body || 'עדכון אוטומטי מהמערכת'
      });
    }

    case 'send_notification': {
      return await base44.asServiceRole.entities.Notification.create({
        user_email: user_email,
        type: 'automation',
        title: params.title || 'התראה אוטומטית',
        message: params.message || '',
        read: false
      });
    }

    case 'schedule_meeting': {
      const meetingData = {
        title: params.title || 'פגישה אוטומטית',
        meeting_type: params.meeting_type || 'פגישת תכנון',
        duration_minutes: params.duration_minutes || 60,
        status: 'מתוכננת'
      };

      if (entity_type === 'Client') {
        const client = await base44.asServiceRole.entities.Client.filter({ id: entity_id });
        if (client.length > 0) {
          meetingData.client_id = client[0].id;
          meetingData.client_name = client[0].name;
        }
      } else if (entity_type === 'Project') {
        const project = await base44.asServiceRole.entities.Project.filter({ id: entity_id });
        if (project.length > 0) {
          meetingData.project_id = project[0].id;
          meetingData.project_name = project[0].name;
        }
      }

      if (params.days_from_now) {
        const meetingDate = new Date();
        meetingDate.setDate(meetingDate.getDate() + params.days_from_now);
        meetingDate.setHours(params.hour || 10, params.minute || 0, 0, 0);
        meetingData.meeting_date = meetingDate.toISOString();
      } else {
        const defaultDate = new Date();
        defaultDate.setDate(defaultDate.getDate() + 1);
        defaultDate.setHours(10, 0, 0, 0);
        meetingData.meeting_date = defaultDate.toISOString();
      }

      return await base44.asServiceRole.entities.Meeting.create(meetingData);
    }

    case 'change_stage': {
      if (entity_type === 'Client' && params.new_stage) {
        return await base44.asServiceRole.entities.Client.update(entity_id, {
          stage: params.new_stage
        });
      }
      throw new Error('Invalid entity type for stage change');
    }

    case 'add_note': {
      return await base44.asServiceRole.entities.CommunicationMessage.create({
        type: 'internal',
        body: params.note || 'הערה אוטומטית',
        client_id: entity_type === 'Client' ? entity_id : null,
        project_id: entity_type === 'Project' ? entity_id : null
      });
    }

    default:
      throw new Error(`Unknown action type: ${type}`);
  }
}