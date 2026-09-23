import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    const { user } = await req.json();
    
    // מציאת כל המנהלים
    const admins = await base44.asServiceRole.entities.AccessControl.filter({
      role: "admin",
      active: true
    });
    
    // שליחת מייל לכל מנהל
    for (const admin of admins) {
      await base44.integrations.Core.SendEmail({
        to: admin.email,
        subject: "🔔 בקשת הרשמה חדשה למערכת",
        body: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; direction: rtl;">
            <h2 style="color: #2563eb;">בקשת הרשמה חדשה</h2>
            <p>משתמש חדש ביקש להצטרף למערכת ArchFlow CRM:</p>
            
            <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>שם:</strong> ${user.full_name}</p>
              <p><strong>אימייל:</strong> ${user.email}</p>
              ${user.phone ? `<p><strong>טלפון:</strong> ${user.phone}</p>` : ''}
              ${user.company ? `<p><strong>חברה:</strong> ${user.company}</p>` : ''}
              ${user.reason ? `<p><strong>סיבה:</strong> ${user.reason}</p>` : ''}
            </div>
            
            <p>
              <a href="${Deno.env.get('BASE44_APP_URL') || ''}/UserApprovals" 
                 style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; 
                        text-decoration: none; border-radius: 6px; margin-top: 10px;">
                אשר או דחה בקשה
              </a>
            </p>
          </div>
        `
      });
    }
    
    return Response.json({ success: true });
  } catch (error) {
    console.error('Error sending admin notification:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});