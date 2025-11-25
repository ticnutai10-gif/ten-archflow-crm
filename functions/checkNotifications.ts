import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // בדיקת אותנטיקציה
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const notifications = [];
    const now = new Date();

    // טעינת הגדרות התראות של המשתמש
    const settingsList = await base44.entities.NotificationSettings.filter({
      user_email: user.email
    });
    
    const settings = settingsList?.[0] || {
      deadline_days_before: 3,
      notify_status_changes: true,
      client_inactive_days: 30,
      notify_meetings: true,
      meeting_hours_before: 2,
      email_notifications: false,
      notify_task_overdue: true
    };

    // 1. בדיקת משימות שמתקרבות למועד אחרון
    const tasks = await base44.asServiceRole.entities.Task.filter({
      status: { $ne: 'הושלמה' }
    });

    for (const task of tasks) {
      if (!task.due_date) continue;
      
      const dueDate = new Date(task.due_date);
      const daysUntilDue = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));

      // משימה שעברה מועד
      if (settings.notify_task_overdue && daysUntilDue < 0) {
        const existing = await base44.entities.Notification.filter({
          user_email: user.email,
          related_entity: 'task',
          related_id: task.id,
          type: 'task_overdue'
        });

        if (!existing || existing.length === 0) {
          notifications.push({
            user_email: user.email,
            type: 'task_overdue',
            title: `משימה עברה מועד: ${task.title}`,
            message: `המשימה "${task.title}" עברה את מועד היעד ב-${Math.abs(daysUntilDue)} ימים`,
            link: `/Tasks`,
            related_entity: 'task',
            related_id: task.id,
            priority: 'urgent',
            read: false,
            email_sent: false
          });
        }
      }
      
      // מועד אחרון מתקרב
      if (daysUntilDue > 0 && daysUntilDue <= settings.deadline_days_before) {
        const existing = await base44.entities.Notification.filter({
          user_email: user.email,
          related_entity: 'task',
          related_id: task.id,
          type: 'deadline_approaching'
        });

        if (!existing || existing.length === 0) {
          notifications.push({
            user_email: user.email,
            type: 'deadline_approaching',
            title: `מועד אחרון מתקרב: ${task.title}`,
            message: `המשימה "${task.title}" צפויה להסתיים בעוד ${daysUntilDue} ימים`,
            link: `/Tasks`,
            related_entity: 'task',
            related_id: task.id,
            priority: daysUntilDue <= 1 ? 'high' : 'medium',
            read: false,
            email_sent: false
          });
        }
      }
    }

    // 2. בדיקת פרויקטים שמתקרבים למועד אחרון
    const projects = await base44.asServiceRole.entities.Project.filter({
      status: { $nin: ['הושלם', 'מבוטל'] }
    });

    for (const project of projects) {
      if (!project.end_date) continue;
      
      const endDate = new Date(project.end_date);
      const daysUntilEnd = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));

      if (daysUntilEnd > 0 && daysUntilEnd <= settings.deadline_days_before) {
        const existing = await base44.entities.Notification.filter({
          user_email: user.email,
          related_entity: 'project',
          related_id: project.id,
          type: 'deadline_approaching'
        });

        if (!existing || existing.length === 0) {
          notifications.push({
            user_email: user.email,
            type: 'deadline_approaching',
            title: `פרויקט מתקרב לסיום: ${project.name}`,
            message: `הפרויקט "${project.name}" צפוי להסתיים בעוד ${daysUntilEnd} ימים`,
            link: `/Projects`,
            related_entity: 'project',
            related_id: project.id,
            priority: daysUntilEnd <= 1 ? 'high' : 'medium',
            read: false,
            email_sent: false
          });
        }
      }
    }

    // 3. בדיקת פגישות קרובות עם תזכורות מותאמות
    if (settings.notify_meetings) {
      const meetings = await base44.asServiceRole.entities.Meeting.filter({
        status: { $in: ['מתוכננת', 'אושרה'] }
      });

      for (const meeting of meetings) {
        if (!meeting.meeting_date) continue;
        
        const meetingDate = new Date(meeting.meeting_date);
        const minutesUntilMeeting = (meetingDate - now) / (1000 * 60);

        // בדיקת כל התזכורות שהוגדרו לפגישה
        const reminders = meeting.reminders || [{ minutes_before: 60, method: 'in-app', sent: false }];
        
        for (let i = 0; i < reminders.length; i++) {
          const reminder = reminders[i];
          
          // בדיקה אם הגיע הזמן לתזכורת הזו
          if (minutesUntilMeeting > 0 && 
              minutesUntilMeeting <= reminder.minutes_before && 
              !reminder.sent) {
            
            // בדיקה האם כבר נשלחה תזכורת זו
            const existingNotif = await base44.entities.Notification.filter({
              user_email: user.email,
              related_entity: 'meeting',
              related_id: meeting.id,
              type: 'meeting_reminder',
              message: { $regex: `${reminder.minutes_before}` }
            });

            if (!existingNotif || existingNotif.length === 0) {
              const timeText = reminder.minutes_before >= 1440 ? 
                `${Math.round(reminder.minutes_before / 1440)} ימים` :
                reminder.minutes_before >= 60 ? 
                `${Math.round(reminder.minutes_before / 60)} שעות` :
                `${reminder.minutes_before} דקות`;

              const notification = {
                user_email: user.email,
                type: 'meeting_reminder',
                title: `תזכורת לפגישה: ${meeting.title}`,
                message: `הפגישה "${meeting.title}" תתחיל בעוד ${timeText}${meeting.location ? ` במיקום: ${meeting.location}` : ''}`,
                link: `/Meetings`,
                related_entity: 'meeting',
                related_id: meeting.id,
                priority: reminder.minutes_before <= 15 ? 'high' : 'medium',
                read: false,
                email_sent: false
              };

              // שליחת התראה לפי השיטה שנבחרה
              if (reminder.method === 'in-app' || reminder.method === 'both') {
                notifications.push(notification);
              }

              if ((reminder.method === 'email' || reminder.method === 'both') && settings.email_notifications) {
                try {
                  await base44.integrations.Core.SendEmail({
                    to: user.email,
                    subject: notification.title,
                    body: `${notification.message}\n\nפרטי הפגישה:\n- תאריך: ${new Date(meeting.meeting_date).toLocaleString('he-IL')}\n- מיקום: ${meeting.location || 'לא צוין'}\n- משתתפים: ${meeting.participants?.join(', ') || 'לא צוין'}\n\nלחץ כאן לצפייה בפגישה: ${notification.link || ''}`
                  });
                  notification.email_sent = true;
                } catch (emailError) {
                  console.error('Error sending meeting reminder email:', emailError);
                }
              }

              // עדכון שהתזכורת נשלחה
              const updatedReminders = [...reminders];
              updatedReminders[i] = { ...reminder, sent: true };
              await base44.asServiceRole.entities.Meeting.update(meeting.id, { 
                reminders: updatedReminders 
              });
            }
          }
        }
      }
    }

    // 4. בדיקת לקוחות לא פעילים
    const clients = await base44.asServiceRole.entities.Client.list();
    
    for (const client of clients) {
      const daysSinceUpdate = Math.ceil((now - new Date(client.updated_date)) / (1000 * 60 * 60 * 24));
      
      if (daysSinceUpdate >= settings.client_inactive_days && client.status === 'פעיל') {
        const existing = await base44.entities.Notification.filter({
          user_email: user.email,
          related_entity: 'client',
          related_id: client.id,
          type: 'client_inactive'
        });

        if (!existing || existing.length === 0) {
          notifications.push({
            user_email: user.email,
            type: 'client_inactive',
            title: `לקוח לא פעיל: ${client.name}`,
            message: `הלקוח "${client.name}" לא היה פעיל כבר ${daysSinceUpdate} ימים`,
            link: `/Clients?open=details&client_id=${client.id}`,
            related_entity: 'client',
            related_id: client.id,
            priority: 'low',
            read: false,
            email_sent: false
          });
        }
      }
    }

    // יצירת ההתראות
    const created = [];
    for (const notification of notifications) {
      const newNotification = await base44.entities.Notification.create(notification);
      created.push(newNotification);

      // שליחת מייל אם מופעל
      if (settings.email_notifications && !notification.email_sent) {
        try {
          await base44.integrations.Core.SendEmail({
            to: user.email,
            subject: notification.title,
            body: `${notification.message}\n\nלינק: ${notification.link || 'לא זמין'}`
          });
          
          await base44.entities.Notification.update(newNotification.id, { email_sent: true });
        } catch (emailError) {
          console.error('Error sending email:', emailError);
        }
      }
    }

    return Response.json({
      success: true,
      notifications_created: created.length,
      notifications: created
    });

  } catch (error) {
    console.error('Error checking notifications:', error);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});