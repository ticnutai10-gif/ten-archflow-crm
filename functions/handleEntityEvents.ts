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
      
      // Ideally call a whatsapp sending function or create a message entity
      // For now, logging as this requires a specific integration setup
      console.log("Sending WhatsApp to", phone, applyTemplate(message, payload));
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
    // Note: We scan all rules for now as filter by array is tricky, or we iterate triggers
    // Optimisation: Filter by one common trigger if possible
    
    // Simple approach: Fetch active rules and filter in memory (assuming low count of rules)
    const allRules = await base44.asServiceRole.entities.AutomationRule.filter({ active: true });
    
    for (const rule of allRules) {
      if (triggers.includes(rule.trigger)) {
        // Check extra conditions
        if (matchConditions(newData, rule.conditions)) {
          // Execute Actions
          if (rule.actions && Array.isArray(rule.actions)) {
            for (const action of rule.actions) {
              await executeAction(base44, action, { ...newData, entity_type: entityType, entity_id: entityId });
            }
          }
        }
      }
    }

    return Response.json({ success: true, changes_logged: hasChanges, triggers_processed: triggers.length });

  } catch (error) {
    console.error('Handle Entity Events Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});