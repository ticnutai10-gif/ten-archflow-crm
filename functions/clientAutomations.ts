import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { action, data } = await req.json();

    // Actions: sendMeetingReminders, handleStageChange, sendMarketingMessage
    
    if (action === 'sendMeetingReminders') {
      // Get meetings in the next 24 hours that haven't been reminded
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      
      const meetings = await base44.asServiceRole.entities.Meeting.filter({
        status: 'מתוכננת'
      });
      
      const upcomingMeetings = meetings.filter(m => {
        const meetingDate = new Date(m.meeting_date);
        return meetingDate >= now && meetingDate <= tomorrow;
      });
      
      const results = [];
      
      for (const meeting of upcomingMeetings) {
        // Get client phone number
        if (meeting.client_id) {
          try {
            const clients = await base44.asServiceRole.entities.Client.filter({ id: meeting.client_id });
            const client = clients[0];
            
            if (client && (client.whatsapp || client.phone)) {
              const phone = (client.whatsapp || client.phone).replace(/[^0-9]/g, '');
              const meetingTime = new Date(meeting.meeting_date).toLocaleString('he-IL', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                hour: '2-digit',
                minute: '2-digit'
              });
              
              const message = `שלום ${client.name},\n\nתזכורת לפגישה שלנו:\n📅 ${meetingTime}\n📍 ${meeting.location || 'יתואם'}\n📋 ${meeting.title}\n\nנתראה! 🙂`;
              
              // Generate WhatsApp link
              const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
              
              results.push({
                meeting_id: meeting.id,
                client_name: client.name,
                phone,
                message,
                whatsapp_url: whatsappUrl,
                status: 'ready'
              });
            }
          } catch (e) {
            console.error('Error processing meeting:', e);
          }
        }
      }
      
      return Response.json({ success: true, reminders: results });
    }
    
    if (action === 'handleStageChange') {
      // Create tasks when client stage changes
      const { client_id, client_name, old_stage, new_stage } = data;
      
      const stageTasks = {
        'תיק_מידע': [
          { title: 'איסוף מסמכים ראשוניים', priority: 'גבוהה', category: 'מסמכים' },
          { title: 'פגישת היכרות ראשונית', priority: 'גבוהה', category: 'פגישה' }
        ],
        'היתרים': [
          { title: 'הגשת בקשה להיתר', priority: 'גבוהה', category: 'היתרים' },
          { title: 'מעקב אחרי הגשה', priority: 'בינונית', category: 'מעקב' }
        ],
        'ביצוע': [
          { title: 'פגישת תיאום לפני תחילת עבודה', priority: 'גבוהה', category: 'פגישה' },
          { title: 'הכנת לוח זמנים', priority: 'גבוהה', category: 'תכנון' }
        ],
        'סיום': [
          { title: 'בדיקת איכות סופית', priority: 'גבוהה', category: 'בדיקה' },
          { title: 'מסירת פרויקט ללקוח', priority: 'גבוהה', category: 'מסירה' },
          { title: 'בקשת משוב מלקוח', priority: 'בינונית', category: 'משוב' }
        ]
      };
      
      const tasksToCreate = stageTasks[new_stage] || [];
      const createdTasks = [];
      
      for (const taskTemplate of tasksToCreate) {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 7); // Default 7 days
        
        const task = await base44.asServiceRole.entities.Task.create({
          title: `${taskTemplate.title} - ${client_name}`,
          client_id,
          client_name,
          priority: taskTemplate.priority,
          category: taskTemplate.category,
          status: 'חדשה',
          due_date: dueDate.toISOString().split('T')[0],
          description: `משימה אוטומטית שנוצרה עקב מעבר לשלב: ${new_stage}`
        });
        
        createdTasks.push(task);
      }
      
      return Response.json({ 
        success: true, 
        message: `נוצרו ${createdTasks.length} משימות חדשות`,
        tasks: createdTasks 
      });
    }
    
    if (action === 'sendMarketingMessage') {
      // Send marketing message to selected clients
      const { client_ids, message_template, custom_message } = data;
      
      const results = [];
      
      for (const clientId of client_ids) {
        try {
          const clients = await base44.asServiceRole.entities.Client.filter({ id: clientId });
          const client = clients[0];
          
          if (client && (client.whatsapp || client.phone)) {
            const phone = (client.whatsapp || client.phone).replace(/[^0-9]/g, '');
            
            // Replace placeholders in message
            let message = custom_message || message_template;
            message = message.replace(/{שם}/g, client.name);
            message = message.replace(/{שם_פרטי}/g, client.name.split(' ')[0]);
            
            const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
            
            results.push({
              client_id: clientId,
              client_name: client.name,
              phone,
              whatsapp_url: whatsappUrl,
              status: 'ready'
            });
          }
        } catch (e) {
          console.error('Error processing client:', e);
        }
      }
      
      return Response.json({ success: true, messages: results });
    }
    
    if (action === 'getMessageTemplates') {
      const templates = [
        {
          id: 'holiday',
          name: 'ברכת חג',
          message: 'שלום {שם_פרטי},\n\nחג שמח! 🎉\nמאחלים לך ולמשפחתך חג נעים ושמח.\n\nבברכה,\nצוות טננבאום אדריכלות'
        },
        {
          id: 'project_update',
          name: 'עדכון פרויקט',
          message: 'שלום {שם},\n\nרצינו לעדכן אותך שהפרויקט מתקדם כמתוכנן.\nנשמח לתאם פגישת עדכון בהקדם.\n\nבברכה,\nצוות טננבאום אדריכלות'
        },
        {
          id: 'followup',
          name: 'מעקב אחרי הצעת מחיר',
          message: 'שלום {שם_פרטי},\n\nרצינו לבדוק אם קיבלת את הצעת המחיר ששלחנו.\nנשמח לענות על כל שאלה.\n\nבברכה,\nצוות טננבאום אדריכלות'
        },
        {
          id: 'thank_you',
          name: 'תודה על שיתוף פעולה',
          message: 'שלום {שם},\n\nתודה רבה על שיתוף הפעולה המצוין!\nאנחנו כאן לכל שאלה או בקשה.\n\nבברכה,\nצוות טננבאום אדריכלות'
        }
      ];
      
      return Response.json({ success: true, templates });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
    
  } catch (error) {
    console.error('Automation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});