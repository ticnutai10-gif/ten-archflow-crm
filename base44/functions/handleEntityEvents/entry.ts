import { createClientFromRequest } from 'npm:@base44/sdk@0.5.0';

// Helpers for Automation Logic
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
  if (!conditions || Object.keys(conditions).length === 0) return true;
  return Object.entries(conditions).every(([k, v]) => getByPath(payload, k) === v);
}

// Action Handlers
async function executeAction(base44, action, payload) {
  const params = action.params || {};
  
  switch (action.type) {
    case 'create_task':
      await base44.entities.Task.create({
        title: applyTemplate(params.title || 'משימה חדשה', payload),
        description: applyTemplate(params.description || '', payload),
        status: params.status || 'חדשה',
        priority: params.priority || 'בינונית',
        client_id: params.client_id || payload.client_id || null,
        project_id: params.project_id || payload.project_id || null,
      });
      break;

    case 'send_email':
      // Check if using a template
      let subject = params.subject;
      let body = params.body;
      
      if (action.template_id) {
        try {
          const template = await base44.entities.MessageTemplate.get(action.template_id);
          if (template) {
            subject = template.subject;
            body = template.content;
          }
        } catch (e) {
          console.error("Template not found", e);
        }
      }

      if (!subject || !body) return { skipped: true, reason: 'no content' };

      const to = applyTemplate(params.to || payload.email || '', payload);
      if (!to) return { skipped: true, reason: 'no recipient' };

      await base44.functions.invoke('sendEmail', {
        to,
        subject: applyTemplate(subject, payload),
        body: applyTemplate(body, payload),
        client_id: payload.client_id || null
      });
      break;
      
    case 'send_whatsapp':
      const phone = applyTemplate(params.phone || payload.phone || '', payload);
      let message = params.message;
      
      if (action.template_id) {
        try {
          const template = await base44.entities.MessageTemplate.get(action.template_id);
          if (template) message = template.content;
        } catch (e) {}
      }
      
      if (!phone || !message) return { skipped: true, reason: 'missing params' };
      
      const finalMessage = applyTemplate(message, payload);
      console.log("Sending WhatsApp to", phone, finalMessage);
      
      await base44.functions.invoke('sendWhatsApp', {
        to: phone,
        message: finalMessage
      });
      break;
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { entityType, entityId, oldData, newData, userId, userEmail } = await req.json();

    // 1. Audit Log Logic
    const changes = {};
    let hasChanges = false;

    if (oldData && newData) {
      // Update
      const keys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);
      for (const key of keys) {
        if (key === 'updated_date' || key === 'updated_by') continue; // Skip meta fields
        // Simple comparison
        const oldV = oldData[key];
        const newV = newData[key];
        if (JSON.stringify(oldV) !== JSON.stringify(newV)) {
          changes[key] = { old: oldV, new: newV };
          hasChanges = true;
        }
      }
    } else if (newData) {
      // Create
      hasChanges = true;
      changes['action'] = { new: 'created' };
    }

    if (hasChanges) {
      await base44.asServiceRole.entities.AuditLog.create({
        entity_type: entityType,
        entity_id: entityId,
        action: oldData ? 'update' : 'create',
        changes: changes,
        performed_by: userEmail || userId || 'system',
        performed_at: new Date().toISOString(),
        description: `Change detected in ${entityType}`
      });
    }

    // 2. Automation Logic
    // Determine triggers based on changes
    const triggers = [];
    if (!oldData && newData) {
      triggers.push(`${entityType.toLowerCase()}_created`);
    } else if (oldData && newData) {
      // Check specific field changes
      Object.keys(changes).forEach(field => {
        triggers.push(`${entityType.toLowerCase()}_${field}_changed`);
      });
    }

    // Load active rules that match these triggers
    const allRules = await base44.asServiceRole.entities.AutomationRule.filter({ active: true });
    
    for (const rule of allRules) {
      if (triggers.includes(rule.trigger)) {
        // Check extra conditions
        if (matchConditions(newData, rule.conditions)) {
          // Execute Actions
          const executionDetails = [];
          let ruleStatus = 'success';
          let ruleError = null;

          if (rule.actions && Array.isArray(rule.actions)) {
            for (const action of rule.actions) {
               try {
                  const res = await executeAction(base44, action, { ...newData, entity_type: entityType, entity_id: entityId });
                  executionDetails.push({ 
                      action: action.type, 
                      status: res?.skipped ? 'skipped' : 'ok', 
                      result: res 
                  });
               } catch (e) {
                  executionDetails.push({ action: action.type, status: 'error', error: e.message });
                  ruleStatus = 'failure';
                  ruleError = e.message;
               }
            }
          }

          // Log Execution
          try {
            await base44.asServiceRole.entities.AutomationLog.create({
                rule_id: rule.id,
                rule_name: rule.name,
                trigger: rule.trigger,
                status: ruleStatus,
                execution_details: executionDetails,
                error_message: ruleError,
                triggered_at: new Date().toISOString(),
                is_dry_run: false
            });
          } catch(e) { console.error("Failed log", e); }
        }
      }
    }

    return Response.json({ success: true, changes_logged: hasChanges, triggers_processed: triggers.length });

  } catch (error) {
    console.error('Handle Entity Events Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});