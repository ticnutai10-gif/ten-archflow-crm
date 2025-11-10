import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    const { email, full_name, approved, reason } = await req.json();
    
    const subject = approved 
      ? "✅ חשבונך אושר - ברוכים הבאים ל-ArchFlow CRM"
      : "❌ בקשת ההרשמה נדחתה";
    
    const body = approved ? `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; direction: rtl;">
        <h2 style="color: #16a34a;">ברוכים הבאים ל-ArchFlow CRM!</h2>
        <p>שלום ${full_name},</p>
        <p>חשבונך אושר בהצלחה! כעת תוכל להתחבר למערכת ולהתחיל לעבוד.</p>
        
        <p>
          <a href="${Deno.env.get('BASE44_APP_URL') || ''}" 
             style="display: inline-block; background: #16a34a; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 6px; margin-top: 10px;">
            התחבר למערכת
          </a>
        </p>
        
        <p style="color: #64748b; font-size: 14px; margin-top: 20px;">
          במידה ויש לך שאלות, אנא פנה למנהל המערכת.
        </p>
      </div>
    ` : `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; direction: rtl;">
        <h2 style="color: #dc2626;">בקשת ההרשמה נדחתה</h2>
        <p>שלום ${full_name},</p>
        <p>לצערנו, בקשת ההרשמה שלך למערכת ArchFlow CRM נדחתה.</p>
        ${reason ? `<p><strong>סיבה:</strong> ${reason}</p>` : ''}
        <p>אם אתה סבור שזו טעות, אנא צור קשר עם מנהל המערכת.</p>
      </div>
    `;
    
    await base44.integrations.Core.SendEmail({
      to: email,
      subject,
      body
    });
    
    return Response.json({ success: true });
  } catch (error) {
    console.error('Error sending approval email:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});