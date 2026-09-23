import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import twilio from 'npm:twilio';

// SMS sending via Twilio - uses the same credentials as WhatsApp

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    // We only allow authenticated users to send SMS
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { to, message } = await req.json();

    if (!to || !message) {
      return Response.json({ error: 'Missing "to" or "message" fields' }, { status: 400 });
    }

    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const fromNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

    // If Twilio is not configured, simulate
    if (!accountSid || !authToken || !fromNumber) {
      console.log(`[SMS Simulation] Sending SMS to ${to}: ${message}`);
      return Response.json({ 
        success: true, 
        status: 'simulated', 
        provider: 'simulation',
        details: 'Twilio not configured. SMS simulated.' 
      });
    }

    const client = twilio(accountSid, authToken);

    // Format phone number
    let formattedTo = to.replace(/\D/g, '');
    if (!formattedTo.startsWith('+')) {
      // Assume Israeli number if starts with 0
      if (formattedTo.startsWith('0')) {
        formattedTo = '+972' + formattedTo.substring(1);
      } else if (!formattedTo.startsWith('972')) {
        formattedTo = '+' + formattedTo;
      } else {
        formattedTo = '+' + formattedTo;
      }
    }

    // Remove whatsapp: prefix from from number for SMS
    let smsFromNumber = fromNumber.replace('whatsapp:', '');

    const result = await client.messages.create({
      from: smsFromNumber,
      to: formattedTo,
      body: message,
    });

    return Response.json({ 
      success: true, 
      status: 'sent', 
      sid: result.sid,
      provider: 'twilio'
    });

  } catch (error) {
    console.error('SMS Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});