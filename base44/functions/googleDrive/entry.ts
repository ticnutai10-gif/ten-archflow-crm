
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
    
    // The library handles token refreshing automatically.
    return { oauth2Client, user };
}

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    const { action, payload } = await req.json();

    try {
        const { oauth2Client, user } = await getAuthenticatedClient(base44);
        const drive = google.drive({ version: 'v3', auth: oauth2Client });

        switch (action) {
            case 'create_root_folder': {
                const fileMetadata = {
                    name: 'ArchFlow CRM Files',
                    mimeType: 'application/vnd.google-apps.folder',
                };
                const file = await drive.files.create({
                    resource: fileMetadata,
                    fields: 'id',
                });
                const folderId = file.data.id;
                await base44.asServiceRole.entities.User.update(user.id, { google_drive_root_folder_id: folderId });
                return new Response(JSON.stringify({ folderId }), { headers: { 'Content-Type': 'application/json' } });
            }
            case 'create_client_folder': {
                const { clientName, rootFolderId } = payload;
                const fileMetadata = {
                    name: clientName,
                    mimeType: 'application/vnd.google-apps.folder',
                    parents: [rootFolderId],
                };
                const file = await drive.files.create({
                    resource: fileMetadata,
                    fields: 'id, name, webViewLink',
                });
                return new Response(JSON.stringify(file.data), { headers: { 'Content-Type': 'application/json' } });
            }
            case 'list_files': {
                 const { folderId } = payload;
                 const res = await drive.files.list({
                     q: `'${folderId}' in parents and trashed = false`,
                     fields: 'files(id, name, mimeType, webViewLink, iconLink)',
                 });
                 return new Response(JSON.stringify(res.data.files), { headers: { 'Content-Type': 'application/json' } });
            }
            case 'get_file': {
                const { fileId } = payload;
                const res = await drive.files.get({
                    fileId,
                    fields: 'id, name, parents, webViewLink, mimeType, iconLink',
                });
                return new Response(JSON.stringify(res.data), { headers: { 'Content-Type': 'application/json' } });
            }
            case 'create_sheet': {
                const { sheetName, folderId } = payload;
                const sheets = google.sheets({ version: 'v4', auth: oauth2Client });
                const resource = { properties: { title: sheetName } };
                const spreadsheet = await sheets.spreadsheets.create({ resource });
                
                await drive.files.update({
                    fileId: spreadsheet.data.spreadsheetId,
                    addParents: folderId,
                    fields: 'id',
                });

                return new Response(JSON.stringify(spreadsheet.data), { headers: { 'Content-Type': 'application/json' } });
            }
            default:
                return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400 });
        }
    } catch (error) {
        console.error('Google Drive API Error:', error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
});
