import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

export default Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // 1. Get today's meetings
        const today = new Date();
        const startOfDay = new Date(today.setHours(0, 0, 0, 0));
        const endOfDay = new Date(today.setHours(23, 59, 59, 999));
        
        const meetings = await base44.asServiceRole.entities.Meeting.filter({
            status: { $in: ['בוצעה', 'אושרה', 'מתוכננת'] } // Include completed and planned
        });

        const todaysMeetings = meetings.filter(m => {
            const mDate = new Date(m.meeting_date);
            return mDate >= startOfDay && mDate <= endOfDay;
        });

        if (todaysMeetings.length === 0) {
            return Response.json({ message: "No meetings found for today" });
        }

        // 2. Prepare context for LLM
        const meetingsContext = todaysMeetings.map(m => `
            - כותרת: ${m.title}
            - לקוח: ${m.client_name || 'לא צוין'}
            - שעה: ${new Date(m.meeting_date).toLocaleTimeString('he-IL')}
            - סוג: ${m.meeting_type}
            - תיאור: ${m.description || 'אין'}
            - הערות: ${m.notes || 'אין'}
            - סיכום: ${JSON.stringify(m.agenda || [])}
        `).join('\n');

        // 3. Generate Summary with LLM
        const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: `
                אתה עוזר אישי למנהל אדריכלות.
                אנא סכם את הפגישות שהתקיימו היום בצורה תמציתית ומקצועית.
                עבור כל פגישה, כתוב שורה או שתיים על המהות שלה.
                בסוף, תן "שורה תחתונה" של מה הושג היום.
                
                הפגישות:
                ${meetingsContext}
                
                כתוב בעברית.
            `
        });

        const summaryText = typeof llmResponse === 'string' ? llmResponse : JSON.stringify(llmResponse);

        // 4. Save Centrally
        await base44.asServiceRole.entities.DailyMeetingSummary.create({
            date: startOfDay.toISOString().split('T')[0],
            summary: summaryText,
            meeting_count: todaysMeetings.length,
            recipients: ['admin'] // Placeholder, ideally fetch admin emails
        });

        // 5. Send Email (Optional - finding admins)
        // For simplicity, we'll try to find an admin user or just use a hardcoded/env email if available, 
        // but since we don't have a specific recipient, we'll list users and send to admins.
        const users = await base44.asServiceRole.entities.User.list();
        const admins = users.filter(u => u.role === 'admin').map(u => u.email);

        for (const email of admins) {
            await base44.asServiceRole.integrations.Core.SendEmail({
                to: email,
                subject: `סיכום פגישות יומי - ${startOfDay.toLocaleDateString('he-IL')}`,
                body: `
                    <div dir="rtl">
                        <h2>סיכום פגישות יומי</h2>
                        <p>להלן סיכום הפגישות שהתקיימו היום:</p>
                        <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; white-space: pre-wrap;">
                            ${summaryText.replace(/\n/g, '<br/>')}
                        </div>
                        <p>הסיכום נשמר במערכת.</p>
                    </div>
                `
            });
        }

        return Response.json({ 
            success: true, 
            message: `Summarized ${todaysMeetings.length} meetings`,
            summary: summaryText
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});