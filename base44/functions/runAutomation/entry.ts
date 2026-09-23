import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { event, data } = await req.json();
    console.log('🤖 Running automation for event:', event, 'with data:', data);

    // Get active rules for this trigger
    const rules = await base44.asServiceRole.entities.AutomationRule.filter({
      trigger: event,
      active: true
    });

    if (rules.length === 0) {
      return Response.json({ message: 'No active rules for this event', executed: 0 });
    }

    console.log(`Found ${rules.length} active rules for ${event}`);
    const results = [];

    for (const rule of rules) {
      try {
        // Check conditions
        if (rule.conditions && Object.keys(rule.conditions).length > 0) {
          const conditionsMet = Object.entries(rule.conditions).every(([key, value]) => {
            return data[key] === value;
          });

          if (!conditionsMet) {
            console.log(`Conditions not met for rule: ${rule.name}`);
            continue;
          }
        }

        console.log(`Executing rule: ${rule.name}`);

        // Execute actions
        for (const action of rule.actions || []) {
          console.log(`Executing action: ${action.type}`, action.params);

          // Replace variables in params
          const processedParams = {};
          for (const [key, value] of Object.entries(action.params || {})) {
            if (typeof value === 'string') {
              let processed = value;
              
              // Replace {{variable}} with data
              Object.entries(data).forEach(([dataKey, dataValue]) => {
                const regex = new RegExp(`\\{\\{${dataKey}\\}\\}`, 'g');
                processed = processed.replace(regex, dataValue || '');
              });
              
              processedParams[key] = processed;
            } else {
              processedParams[key] = value;
            }
          }

          // Execute action
          if (action.type === 'send_email') {
            await base44.asServiceRole.integrations.Core.SendEmail({
              to: processedParams.to,
              subject: processedParams.subject,
              body: processedParams.body
            });
            results.push({ rule: rule.name, action: 'email_sent', to: processedParams.to });

          } else if (action.type === 'create_task') {
            const taskData = {
              title: processedParams.title,
              description: processedParams.description,
              status: processedParams.status || 'חדשה',
              priority: processedParams.priority || 'בינונית',
              assigned_to: processedParams.assigned_to || '',
              client_name: data.client_name || data.name || '',
              project_name: data.project_name || ''
            };

            if (data.client_id) taskData.client_id = data.client_id;
            if (data.project_id) taskData.project_id = data.project_id;

            await base44.asServiceRole.entities.Task.create(taskData);
            results.push({ rule: rule.name, action: 'task_created', task: taskData.title });

          } else if (action.type === 'update_tasks_status') {
            const filters = {};
            if (processedParams.project_name) filters.project_name = processedParams.project_name;
            if (processedParams.client_name) filters.client_name = processedParams.client_name;
            if (processedParams.from_status) filters.status = processedParams.from_status;

            const tasksToUpdate = await base44.asServiceRole.entities.Task.filter(filters);
            
            for (const task of tasksToUpdate) {
              await base44.asServiceRole.entities.Task.update(task.id, {
                status: processedParams.to_status
              });
            }
            
            results.push({ 
              rule: rule.name, 
              action: 'tasks_updated', 
              count: tasksToUpdate.length 
            });

          } else if (action.type === 'send_notification') {
            await base44.asServiceRole.entities.Notification.create({
              title: processedParams.title,
              message: processedParams.message,
              type: processedParams.type || 'info',
              recipient_email: processedParams.user_email,
              read: false
            });
            results.push({ rule: rule.name, action: 'notification_sent' });

          } else if (action.type === 'send_reminder') {
            await base44.asServiceRole.integrations.Core.SendEmail({
              to: processedParams.recipient_email,
              subject: processedParams.subject || 'תזכורת',
              body: processedParams.message
            });
            results.push({ rule: rule.name, action: 'reminder_sent' });
          }
        }
      } catch (error) {
        console.error(`Error executing rule ${rule.name}:`, error);
        results.push({ 
          rule: rule.name, 
          error: error.message 
        });
      }
    }

    return Response.json({
      success: true,
      executed: results.length,
      results
    });

  } catch (error) {
    console.error('Error in automation:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});