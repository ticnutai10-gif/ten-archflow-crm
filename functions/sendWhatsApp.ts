import { createClientFromRequest } from 'npm:@base44/sdk@0.8.3';
import twilio from 'npm:twilio';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        // Allow system/automation calls (where user might be null or service role)
        // If called from frontend, user must be authenticated
        
        const { to, message, mediaUrl } = await req.json();

        if (!to || !message) {
            return Response.json({ error: 'Missing to or message' }, { status: 400 });
        }

        const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
        const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
        const fromNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

        if (!accountSid || !authToken || !fromNumber) {
            return Response.json({ error: 'Twilio secrets not set' }, { status: 500 });
        }

        const client = twilio(accountSid, authToken);

        // Format phone number: ensure it has whatsapp: prefix
        let formattedTo = to;
        if (!formattedTo.startsWith('whatsapp:')) {
            // Remove any non-digit chars
            const cleanNumber = formattedTo.replace(/\D/g, '');
            formattedTo = `whatsapp:+${cleanNumber}`;
        }

        let formattedFrom = fromNumber;
        if (!formattedFrom.startsWith('whatsapp:')) {
             formattedFrom = `whatsapp:${formattedFrom}`;
        }

        const messageData = {
            from: formattedFrom,
            to: formattedTo,
            body: message,
        };

        if (mediaUrl) {
            messageData.mediaUrl = [mediaUrl];
        }

        const result = await client.messages.create(messageData);

        return Response.json({ success: true, sid: result.sid });

    } catch (error) {
        console.error('Twilio Error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});