import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // טוען את כל הגדרות הדוחות הפעילים
        const schedules = await base44.asServiceRole.entities.DailyReportSchedule.filter({ active: true });
        
        if (!schedules || schedules.length === 0) {
            return Response.json({ 
                message: 'אין דוחות פעילים', 
                sent: 0 
            });
        }

        const today = new Date();
        const isWeekend = today.getDay() === 5 || today.getDay() === 6; // שישי ושבת
        const todayStr = today.toISOString().split('T')[0];
        const currentTime = `${today.getHours().toString().padStart(2, '0')}:${today.getMinutes().toString().padStart(2, '0')}`;
        
        let sentCount = 0;
        const results = [];

        // עובר על כל הגדרת דוח
        for (const schedule of schedules) {
            // בודק אם צריך לשלוח (שעה + סופש"ש)
            if (isWeekend && !schedule.send_on_weekends) {
                continue;
            }

            // בודק אם כבר נשלח היום
            if (schedule.last_sent && schedule.last_sent.startsWith(todayStr)) {
                continue;
            }

            // בודק אם הגיעה השעה (תוך סובלנות של 10 דקות)
            const scheduleTime = schedule.schedule_time;
            const timeDiff = getTimeDifferenceInMinutes(currentTime, scheduleTime);
            
            if (Math.abs(timeDiff) > 10) {
                continue; // עדיין לא הגיעה השעה או עברה יותר מדי זמן
            }

            try {
                // יצירת הדוח
                const reportContent = await generateReportContent(base44, schedule.report_types, schedule.include_summary);
                
                // שליחת מייל לכל נמען
                for (const recipient of schedule.recipients) {
                    await base44.asServiceRole.integrations.Core.SendEmail({
                        to: recipient,
                        subject: `${schedule.name} - ${today.toLocaleDateString('he-IL')}`,
                        body: reportContent
                    });
                }

                // עדכון תאריך שליחה אחרונה
                await base44.asServiceRole.entities.DailyReportSchedule.update(schedule.id, {
                    last_sent: today.toISOString()
                });

                sentCount++;
                results.push({
                    schedule_name: schedule.name,
                    recipients: schedule.recipients.length,
                    status: 'success'
                });
            } catch (error) {
                results.push({
                    schedule_name: schedule.name,
                    status: 'error',
                    error: error.message
                });
            }
        }

        return Response.json({
            message: `נשלחו ${sentCount} דוחות בהצלחה`,
            sent: sentCount,
            results
        });

    } catch (error) {
        console.error('Error generating daily reports:', error);
        return Response.json({ 
            error: error.message 
        }, { status: 500 });
    }
});

// פונקציה לחישוב הפרש זמן בדקות
function getTimeDifferenceInMinutes(time1, time2) {
    const [h1, m1] = time1.split(':').map(Number);
    const [h2, m2] = time2.split(':').map(Number);
    return (h1 * 60 + m1) - (h2 * 60 + m2);
}

// פונקציה ליצירת תוכן הדוח
async function generateReportContent(base44, reportTypes, includeSummary) {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    
    let html = `
        <!DOCTYPE html>
        <html dir="rtl" lang="he">
        <head>
            <meta charset="UTF-8">
            <style>
                body { font-family: Arial, sans-serif; direction: rtl; background-color: #f5f5f5; padding: 20px; }
                .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                h1 { color: #2C3A50; border-bottom: 3px solid #2C3A50; padding-bottom: 10px; }
                h2 { color: #2C3A50; margin-top: 30px; border-right: 4px solid #2C3A50; padding-right: 10px; }
                .summary { background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0; }
                .summary-item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #90caf9; }
                .summary-item:last-child { border-bottom: none; }
                .stat { font-size: 24px; font-weight: bold; color: #2C3A50; }
                table { width: 100%; border-collapse: collapse; margin: 15px 0; }
                th { background: #2C3A50; color: white; padding: 12px; text-align: right; }
                td { padding: 10px; border-bottom: 1px solid #ddd; text-align: right; }
                tr:hover { background: #f5f5f5; }
                .badge { padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: bold; }
                .badge-new { background: #4caf50; color: white; }
                .badge-progress { background: #2196f3; color: white; }
                .badge-done { background: #9e9e9e; color: white; }
                .no-data { text-align: center; color: #999; padding: 20px; font-style: italic; }
                .footer { margin-top: 30px; text-align: center; color: #999; font-size: 12px; border-top: 1px solid #ddd; padding-top: 15px; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>📊 דוח יומי - ${today.toLocaleDateString('he-IL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h1>
    `;

    const data = {};

    // איסוף נתונים לפי סוגי הדוח
    for (const type of reportTypes) {
        switch (type) {
            case 'time_logs':
                data.timeLogs = await base44.asServiceRole.entities.TimeLog.filter({
                    log_date: todayStart.toISOString().split('T')[0]
                });
                break;
            case 'new_clients':
                const allClients = await base44.asServiceRole.entities.Client.list();
                data.newClients = allClients.filter(c => {
                    const created = new Date(c.created_date);
                    return created >= todayStart && created < todayEnd;
                });
                break;
            case 'new_tasks':
                const allTasks = await base44.asServiceRole.entities.Task.list();
                data.newTasks = allTasks.filter(t => {
                    const created = new Date(t.created_date);
                    return created >= todayStart && created < todayEnd;
                });
                break;
            case 'new_projects':
                const allProjects = await base44.asServiceRole.entities.Project.list();
                data.newProjects = allProjects.filter(p => {
                    const created = new Date(p.created_date);
                    return created >= todayStart && created < todayEnd;
                });
                break;
            case 'meetings':
                const allMeetings = await base44.asServiceRole.entities.Meeting.list();
                data.meetings = allMeetings.filter(m => {
                    const meetingDate = new Date(m.meeting_date);
                    return meetingDate >= todayStart && meetingDate < todayEnd;
                });
                break;
            case 'invoices':
                const allInvoices = await base44.asServiceRole.entities.Invoice.list();
                data.invoices = allInvoices.filter(i => {
                    const created = new Date(i.created_date);
                    return created >= todayStart && created < todayEnd;
                });
                break;
        }
    }

    // סיכום כללי
    if (includeSummary) {
        html += '<div class="summary">';
        html += '<h2>📈 סיכום כללי</h2>';
        
        if (data.timeLogs) {
            const totalSeconds = data.timeLogs.reduce((sum, log) => sum + (log.duration_seconds || 0), 0);
            const totalHours = (totalSeconds / 3600).toFixed(1);
            html += `<div class="summary-item"><span>⏱️ סה"כ שעות עבודה:</span><span class="stat">${totalHours}</span></div>`;
        }
        
        if (data.newClients) {
            html += `<div class="summary-item"><span>👥 לקוחות חדשים:</span><span class="stat">${data.newClients.length}</span></div>`;
        }
        
        if (data.newTasks) {
            html += `<div class="summary-item"><span>✅ משימות חדשות:</span><span class="stat">${data.newTasks.length}</span></div>`;
        }
        
        if (data.newProjects) {
            html += `<div class="summary-item"><span>🏗️ פרויקטים חדשים:</span><span class="stat">${data.newProjects.length}</span></div>`;
        }
        
        if (data.meetings) {
            html += `<div class="summary-item"><span>📅 פגישות היום:</span><span class="stat">${data.meetings.length}</span></div>`;
        }

        if (data.invoices) {
            const totalAmount = data.invoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
            html += `<div class="summary-item"><span>💰 חשבוניות שהופקו:</span><span class="stat">${data.invoices.length} (${totalAmount.toLocaleString('he-IL')} ₪)</span></div>`;
        }
        
        html += '</div>';
    }

    // רישומי זמן
    if (data.timeLogs) {
        html += '<h2>⏱️ רישומי זמן</h2>';
        if (data.timeLogs.length === 0) {
            html += '<div class="no-data">אין רישומי זמן להיום</div>';
        } else {
            html += '<table><thead><tr><th>לקוח</th><th>תיאור</th><th>משך זמן</th><th>נוצר על ידי</th></tr></thead><tbody>';
            for (const log of data.timeLogs) {
                const hours = Math.floor(log.duration_seconds / 3600);
                const minutes = Math.floor((log.duration_seconds % 3600) / 60);
                html += `<tr>
                    <td>${log.client_name || 'לא צוין'}</td>
                    <td>${log.title || log.notes || 'אין תיאור'}</td>
                    <td>${hours}:${minutes.toString().padStart(2, '0')}</td>
                    <td>${log.created_by || 'לא ידוע'}</td>
                </tr>`;
            }
            html += '</tbody></table>';
        }
    }

    // לקוחות חדשים
    if (data.newClients) {
        html += '<h2>👥 לקוחות חדשים</h2>';
        if (data.newClients.length === 0) {
            html += '<div class="no-data">לא נוספו לקוחות חדשים היום</div>';
        } else {
            html += '<table><thead><tr><th>שם</th><th>אימייל</th><th>טלפון</th><th>סטטוס</th></tr></thead><tbody>';
            for (const client of data.newClients) {
                html += `<tr>
                    <td>${client.name || 'לא צוין'}</td>
                    <td>${client.email || '-'}</td>
                    <td>${client.phone || '-'}</td>
                    <td><span class="badge badge-new">${client.status || 'חדש'}</span></td>
                </tr>`;
            }
            html += '</tbody></table>';
        }
    }

    // משימות חדשות
    if (data.newTasks) {
        html += '<h2>✅ משימות חדשות</h2>';
        if (data.newTasks.length === 0) {
            html += '<div class="no-data">לא נוצרו משימות חדשות היום</div>';
        } else {
            html += '<table><thead><tr><th>כותרת</th><th>פרויקט</th><th>סטטוס</th><th>עדיפות</th></tr></thead><tbody>';
            for (const task of data.newTasks) {
                const statusClass = task.status === 'הושלמה' ? 'badge-done' : 
                                    task.status === 'בתהליך' ? 'badge-progress' : 'badge-new';
                html += `<tr>
                    <td>${task.title || 'אין כותרת'}</td>
                    <td>${task.project_name || task.client_name || '-'}</td>
                    <td><span class="badge ${statusClass}">${task.status || 'חדשה'}</span></td>
                    <td>${task.priority || '-'}</td>
                </tr>`;
            }
            html += '</tbody></table>';
        }
    }

    // פרויקטים חדשים
    if (data.newProjects) {
        html += '<h2>🏗️ פרויקטים חדשים</h2>';
        if (data.newProjects.length === 0) {
            html += '<div class="no-data">לא נוצרו פרויקטים חדשים היום</div>';
        } else {
            html += '<table><thead><tr><th>שם</th><th>לקוח</th><th>סוג</th><th>תקציב</th></tr></thead><tbody>';
            for (const project of data.newProjects) {
                html += `<tr>
                    <td>${project.name || 'אין שם'}</td>
                    <td>${project.client_name || '-'}</td>
                    <td>${project.type || '-'}</td>
                    <td>${project.budget ? project.budget.toLocaleString('he-IL') + ' ₪' : '-'}</td>
                </tr>`;
            }
            html += '</tbody></table>';
        }
    }

    // פגישות
    if (data.meetings) {
        html += '<h2>📅 פגישות היום</h2>';
        if (data.meetings.length === 0) {
            html += '<div class="no-data">אין פגישות מתוכננות להיום</div>';
        } else {
            html += '<table><thead><tr><th>כותרת</th><th>לקוח</th><th>שעה</th><th>סטטוס</th></tr></thead><tbody>';
            for (const meeting of data.meetings) {
                const meetingTime = new Date(meeting.meeting_date).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
                html += `<tr>
                    <td>${meeting.title || 'אין כותרת'}</td>
                    <td>${meeting.client_name || '-'}</td>
                    <td>${meetingTime}</td>
                    <td>${meeting.status || '-'}</td>
                </tr>`;
            }
            html += '</tbody></table>';
        }
    }

    // חשבוניות
    if (data.invoices) {
        html += '<h2>💰 חשבוניות שהופקו</h2>';
        if (data.invoices.length === 0) {
            html += '<div class="no-data">לא הופקו חשבוניות היום</div>';
        } else {
            html += '<table><thead><tr><th>מספר</th><th>לקוח</th><th>סכום</th><th>סטטוס</th></tr></thead><tbody>';
            for (const invoice of data.invoices) {
                html += `<tr>
                    <td>${invoice.number || '-'}</td>
                    <td>${invoice.client_name || '-'}</td>
                    <td>${(invoice.amount || 0).toLocaleString('he-IL')} ${invoice.currency || 'ILS'}</td>
                    <td>${invoice.status || '-'}</td>
                </tr>`;
            }
            html += '</tbody></table>';
        }
    }

    html += `
                <div class="footer">
                    <p>דוח זה נוצר אוטומטית על ידי מערכת טננבאום - אדריכלות מתקדמת</p>
                    <p>תאריך יצירה: ${today.toLocaleString('he-IL')}</p>
                </div>
            </div>
        </body>
        </html>
    `;

    return html;
}