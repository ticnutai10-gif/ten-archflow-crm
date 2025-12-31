import { createClientFromRequest } from 'npm:@base44/sdk@0.5.0';

// Helpers
function getByPath(obj, path) {
  if (!obj || !path) return undefined;
  return path.split('.').reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);
}
function applyTemplate(str, payload) {
  if (!str || typeof str !== 'string') return str;
  return str.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, p) => {
    const v = getByPath(payload, p.trim());
    return v == null ? '' : String(v);
  });
}
function matchConditions(payload, conditions = {}) {
  // Simple equality AND matcher
  return Object.entries(conditions || {}).every(([k, v]) => getByPath(payload, k) === v);
}

// Actions
async function actionCreateTask(base44, payload, params = {}) {
  const task = {
    title: applyTemplate(params.title || 'משימה חדשה', payload),
    description: applyTemplate(params.description || '', payload),
    status: params.status || 'חדשה',
    priority: params.priority || 'בינונית',
    client_id: params.client_id || payload.client_id || null,
    client_name: params.client_name ? applyTemplate(params.client_name, payload) : (payload.client_name || null),
    project_id: params.project_id || payload.project_id || null,
    project_name: params.project_name ? applyTemplate(params.project_name, payload) : (payload.project_name || null),
    due_date: params.due_date ? applyTemplate(params.due_date, payload) : undefined,
  };
  Object.keys(task).forEach(k => task[k] === undefined && delete task[k]);
  const created = await base44.entities.Task.create(task);
  try {
    // broadcast
    globalThis?.window?.dispatchEvent?.(new CustomEvent('task:created', { detail: created }));
  } catch {}
  return { type: 'create_task', id: created.id };
}

async function actionSendEmail(base44, payload, params = {}) {
  const to = applyTemplate(params.to || payload.email || '', payload);
  const subject = applyTemplate(params.subject || 'עדכון מערכת', payload);
  const body = applyTemplate(params.body || '', payload);
  if (!to) return { type: 'send_email', skipped: true, reason: 'missing_to' };
  const res = await base44.functions.invoke('sendEmail', {
    to, subject, body,
    client_id: payload.client_id || null,
    client_name: payload.client_name || null,
    project_id: payload.project_id || null,
    project_name: payload.project_name || null
  });
  return { type: 'send_email', ok: true, status: res?.status || 200 };
}

async function actionUpdateTasksStatus(base44, payload, params = {}) {
  const filter = {};
  if (params.project_name) filter.project_name = applyTemplate(params.project_name, payload);
  if (params.client_name) filter.client_name = applyTemplate(params.client_name, payload);
  let tasks = await base44.entities.Task.filter(filter, '-updated_date', 1000);
  if (params.from_status) tasks = tasks.filter(t => t.status === params.from_status);
  const toStatus = params.to_status || 'הושלמה';
  for (const t of tasks) {
    await base44.entities.Task.update(t.id, { status: toStatus });
    try { globalThis?.window?.dispatchEvent?.(new CustomEvent('task:updated', { detail: { id: t.id, status: toStatus } })); } catch {}
  }
  return { type: 'update_tasks_status', updated: tasks.length, to: toStatus };
}

async function actionSendWhatsApp(base44, payload, params = {}) {
  const phone = applyTemplate(params.phone || payload.phone || '', payload);
  const message = applyTemplate(params.message || '', payload);
  if (!phone || !message) return { type: 'send_whatsapp', skipped: true, reason: 'missing_params' };
  
  // Invoke the Twilio backend function
  try {
    const res = await base44.functions.invoke('sendWhatsApp', {
      to: phone,
      message: message
    });
    return { type: 'send_whatsapp', ok: true, sid: res?.data?.sid };
  } catch (error) {
    console.error('WhatsApp send failed:', error);
    return { type: 'send_whatsapp', ok: false, error: error.message };
  }
}

async function actionSendNotification(base44, payload, params = {}) {
  const notification = {
    user_email: applyTemplate(params.user_email || payload.email || '', payload),
    title: applyTemplate(params.title || 'התראה חדשה', payload),
    message: applyTemplate(params.message || '', payload),
    type: params.type || 'status_changed',
    related_entity: params.related_entity || payload.entity_type || '',
    related_id: params.related_id || payload.entity_id || payload.id || '',
    priority: params.priority || 'medium'
  };
  
  if (!notification.user_email) return { type: 'send_notification', skipped: true, reason: 'missing_email' };
  
  const created = await base44.entities.Notification.create(notification);
  return { type: 'send_notification', ok: true, id: created.id };
}

async function actionSendReminder(base44, payload, params = {}) {
  const recipientEmail = applyTemplate(params.recipient_email || payload.email || payload.created_by || '', payload);
  const subject = applyTemplate(params.subject || 'תזכורת', payload);
  const message = applyTemplate(params.message || '', payload);
  
  if (!recipientEmail || !message) return { type: 'send_reminder', skipped: true, reason: 'missing_params' };
  
  // Send email
  await base44.functions.invoke('sendEmail', {
    to: recipientEmail,
    subject: subject,
    body: message
  });
  
  // Create notification
  await base44.entities.Notification.create({
    user_email: recipientEmail,
    title: subject,
    message: message,
    type: 'reminder',
    read: false
  });
  
  return { type: 'send_reminder', ok: true, recipient: recipientEmail };
}

const handlers = {
  create_task: actionCreateTask,
  send_email: actionSendEmail,
  update_tasks_status: actionUpdateTasksStatus,
  send_whatsapp: actionSendWhatsApp,
  send_notification: actionSendNotification,
  send_reminder: actionSendReminder
};

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const { event, payload } = await req.json();

  // Load active rules for event
  const rules = await base44.entities.AutomationRule.filter({ trigger: event, active: true }, '-updated_date', 200).catch(() => []);
  const executed = [];
  for (const rule of rules) {
    if (!matchConditions(payload || {}, rule.conditions || {})) continue;
    const actions = Array.isArray(rule.actions) ? rule.actions : [];
    for (const a of actions) {
      const fn = handlers[a.type];
      if (!fn) continue;
      const res = await fn(base44, payload || {}, a.params || {});
      executed.push({ rule: rule.name, action: a.type, result: res });
    }
  }
  return new Response(JSON.stringify({ ok: true, count: executed.length, executed }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
});