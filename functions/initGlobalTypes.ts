import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const DEFAULT_TYPES = [
  {
    type_key: 'taba',
    name: 'טאבו',
    options: [
      { label: 'פרצלציה', value: 'parcellation', color: '#3b82f6', glow: 'rgba(59, 130, 246, 0.4)' },
      { label: 'רישום בית משותף', value: 'condo_registration', color: '#8b5cf6', glow: 'rgba(139, 92, 246, 0.4)' },
      { label: 'הערת אזהרה', value: 'cautionary_note', color: '#f59e0b', glow: 'rgba(245, 158, 11, 0.4)' },
      { label: 'העברת זכויות', value: 'rights_transfer', color: '#10b981', glow: 'rgba(16, 185, 129, 0.4)' }
    ]
  },
  {
    type_key: 'transfer_rights',
    name: 'העברת זכויות',
    options: [
      { label: 'אישור עירייה', value: 'muni_approval', color: '#ef4444', glow: 'rgba(239, 68, 68, 0.4)' },
      { label: 'אישור מס שבח', value: 'betterment_tax', color: '#f97316', glow: 'rgba(249, 115, 22, 0.4)' },
      { label: 'אישור מס רכישה', value: 'purchase_tax', color: '#84cc16', glow: 'rgba(132, 204, 22, 0.4)' },
      { label: 'שטר מכר', value: 'deed', color: '#06b6d4', glow: 'rgba(6, 182, 212, 0.4)' }
    ]
  },
  {
    type_key: 'purchase_rights',
    name: 'זכויות קנייה',
    options: [
      { label: 'בדיקת נאותות', value: 'due_diligence', color: '#6366f1', glow: 'rgba(99, 102, 241, 0.4)' },
      { label: 'משא ומתן', value: 'negotiation', color: '#ec4899', glow: 'rgba(236, 72, 153, 0.4)' },
      { label: 'חתימת חוזה', value: 'contract', color: '#14b8a6', glow: 'rgba(20, 184, 166, 0.4)' },
      { label: 'הושלם', value: 'completed', color: '#22c55e', glow: 'rgba(34, 197, 94, 0.4)' }
    ]
  },
  {
    type_key: 'stages',
    name: 'שלבים',
    options: [
      { value: 'ללא', label: 'ללא', color: '#cbd5e1', glow: 'rgba(203, 213, 225, 0.4)' },
      { value: 'ברור_תכן', label: 'ברור תכן', color: '#3b82f6', glow: 'rgba(59, 130, 246, 0.4)' },
      { value: 'תיק_מידע', label: 'תיק מידע', color: '#8b5cf6', glow: 'rgba(139, 92, 246, 0.4)' },
      { value: 'היתרים', label: 'היתרים', color: '#f59e0b', glow: 'rgba(245, 158, 11, 0.4)' },
      { value: 'ביצוע', label: 'ביצוע', color: '#10b981', glow: 'rgba(16, 185, 129, 0.4)' },
      { value: 'סיום', label: 'סיום', color: '#6b7280', glow: 'rgba(107, 114, 128, 0.4)' }
    ]
  }
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const results = [];

    for (const typeData of DEFAULT_TYPES) {
      // Check if exists
      const existing = await base44.entities.GlobalDataType.filter({ type_key: typeData.type_key });
      
      if (existing.length === 0) {
        // Create if missing
        await base44.entities.GlobalDataType.create(typeData);
        results.push(`Created: ${typeData.name}`);
      } else {
        // Optional: Update if exists to ensure latest structure? 
        // For now, let's just skip to avoid overwriting user customizations
        results.push(`Skipped (Exists): ${typeData.name}`);
      }
    }

    return Response.json({ success: true, log: results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});