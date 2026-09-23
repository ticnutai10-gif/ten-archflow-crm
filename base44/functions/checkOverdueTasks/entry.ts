import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Get all tasks that are not completed and have a due date
    const allTasks = await base44.asServiceRole.entities.Task.filter({
      status: { $ne: 'הושלמה' }
    }, '-updated_date', 1000);
    
    const now = new Date();
    const overdueTasks = [];
    
    for (const task of allTasks) {
      if (!task.due_date) continue;
      
      const dueDate = new Date(task.due_date);
      if (isNaN(dueDate.getTime())) continue;
      
      // Check if task is overdue
      if (dueDate < now) {
        overdueTasks.push(task);
        
        // Trigger automation for each overdue task
        try {
          await base44.asServiceRole.functions.invoke('automationEngine', {
            event: 'task_overdue',
            payload: {
              id: task.id,
              title: task.title,
              description: task.description,
              due_date: task.due_date,
              status: task.status,
              priority: task.priority,
              assigned_to: task.assigned_to,
              client_id: task.client_id,
              client_name: task.client_name,
              project_id: task.project_id,
              project_name: task.project_name,
              email: task.created_by || '',
              phone: '',
              created_by: task.created_by
            }
          });
        } catch (err) {
          console.error('Error triggering automation for task:', task.id, err);
        }
      }
    }
    
    return Response.json({
      success: true,
      checked: allTasks.length,
      overdue: overdueTasks.length,
      tasks: overdueTasks.map(t => ({
        id: t.id,
        title: t.title,
        due_date: t.due_date
      }))
    });
    
  } catch (error) {
    console.error('Error checking overdue tasks:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});