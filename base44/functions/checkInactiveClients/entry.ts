import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * בדיקת לקוחות שלא עודכנו במשך X ימים ושליחת תזכורות
 * ניתן לקרוא לפונקציה זו ידנית או להגדיר cron job חיצוני
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Get parameters
    const { days = 30, recipient_email } = await req.json();
    
    if (!recipient_email) {
      return Response.json({ 
        error: 'נדרש אימייל נמען (recipient_email)' 
      }, { status: 400 });
    }

    // חישוב תאריך הסף
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - days);

    // שליפת כל הלקוחות
    const clients = await base44.asServiceRole.entities.Client.list();
    
    // סינון לקוחות שלא עודכנו במשך X ימים
    const inactiveClients = clients.filter(client => {
      const lastUpdate = new Date(client.updated_date);
      return lastUpdate < thresholdDate && client.status !== 'לא פעיל';
    });

    console.log(`Found ${inactiveClients.length} inactive clients (not updated for ${days} days)`);

    // יצירת התראות למערכת
    const notifications = [];
    for (const client of inactiveClients) {
      const daysSinceUpdate = Math.floor((Date.now() - new Date(client.updated_date)) / (1000 * 60 * 60 * 24));
      
      const notification = await base44.asServiceRole.entities.Notification.create({
        user_email: recipient_email,
        title: `תזכורת: לקוח לא עודכן - ${client.name}`,
        message: `הלקוח ${client.name} לא עודכן כבר ${daysSinceUpdate} ימים. מומלץ ליצור איתו קשר.`,
        type: 'client_inactive',
        related_entity: 'Client',
        related_id: client.id,
        read: false
      });
      
      notifications.push(notification);
    }

    // שליחת מייל סיכום
    if (inactiveClients.length > 0) {
      const clientsList = inactiveClients
        .map(c => {
          const daysSinceUpdate = Math.floor((Date.now() - new Date(c.updated_date)) / (1000 * 60 * 60 * 24));
          return `• ${c.name} (${daysSinceUpdate} ימים)`;
        })
        .join('\n');

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: recipient_email,
        subject: `תזכורת: ${inactiveClients.length} לקוחות לא עודכנו במשך ${days} ימים`,
        body: `שלום,\n\nהתקבלה התראה על לקוחות שלא עודכנו במערכת:\n\n${clientsList}\n\nמומלץ ליצור קשר עם לקוחות אלה ולעדכן את סטטוסם.\n\nבברכה,\nמערכת CRM`
      });
    }

    return Response.json({
      success: true,
      message: `נבדקו ${clients.length} לקוחות, נמצאו ${inactiveClients.length} לקוחות לא פעילים`,
      inactive_count: inactiveClients.length,
      notifications_created: notifications.length,
      inactive_clients: inactiveClients.map(c => ({
        id: c.id,
        name: c.name,
        last_updated: c.updated_date,
        days_since_update: Math.floor((Date.now() - new Date(c.updated_date)) / (1000 * 60 * 60 * 24))
      }))
    });

  } catch (error) {
    console.error('Error checking inactive clients:', error);
    return Response.json({ 
      error: error.message || 'שגיאה בבדיקת לקוחות לא פעילים',
      details: error.stack
    }, { status: 500 });
  }
});