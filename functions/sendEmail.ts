
import { createClientFromRequest } from 'npm:@base44/sdk@0.5.0';
import { google } from 'npm:googleapis@128.0.0';

const CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID");
const CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET");

async function getAuthenticatedClient(base44) {
    const user = await base44.auth.me();
    if (!user || !user.google_refresh_token) {
        throw new Error("User not authenticated with Google.");
    }
    const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET);
    oauth2Client.setCredentials({ refresh_token: user.google_refresh_token });
    return oauth2Client;
}

function encodeSubjectUTF8(subject) {
    try {
        return `=?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;
    } catch {
        return subject || '';
    }
}

function asHeaderList(arrOrStr) {
    if (!arrOrStr) return null;
    const list = Array.isArray(arrOrStr) ? arrOrStr : String(arrOrStr).split(/[,;\s]+/);
    const clean = list.map(s => String(s).trim()).filter(Boolean);
    return clean.length ? clean.join(', ') : null;
}

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const { to, cc, bcc, subject, body, client_id, client_name, project_id, project_name } = payload || {};

    try {
        const oauth2Client = await getAuthenticatedClient(base44);
        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

        const toHeader = asHeaderList(to);
        if (!toHeader) {
            return new Response(JSON.stringify({ error: "Missing 'to' recipients" }), { status: 400 });
        }

        const ccHeader = asHeaderList(cc);
        const bccHeader = asHeaderList(bcc);

        const lines = [
            `Content-Type: text/html; charset="UTF-8"`,
            `MIME-Version: 1.0`,
            `Content-Transfer-Encoding: 7bit`,
            `to: ${toHeader}`,
            ...(ccHeader ? [`cc: ${ccHeader}`] : []),
            ...(bccHeader ? [`bcc: ${bccHeader}`] : []),
            `subject: ${encodeSubjectUTF8(subject || '')}`,
            ``,
            body || ''
        ];

        const raw = btoa(lines.join('\n'))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');

        await gmail.users.messages.send({
            userId: 'me',
            resource: { raw },
        });

        // NEW: log to CommunicationMessage for centralized hub
        try {
            await base44.entities.CommunicationMessage.create({
                type: "email",
                direction: "out",
                subject: subject || "",
                body: body || "",
                client_id: client_id || null,
                client_name: client_name || null,
                project_id: project_id || null,
                project_name: project_name || null,
                // attachments can be added in the future if needed
            });
        } catch (e) {
            // Non-fatal: email was sent, logging failed
            console.warn("Failed to log CommunicationMessage for sent email:", e?.message || e);
        }

        return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
    } catch (error) {
        console.error('Gmail API Error:', error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
});
