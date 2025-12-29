import { createClientFromRequest } from 'npm:@base44/sdk@0.8.3';
import { google } from 'npm:googleapis';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    // Service role is needed to access all user spreadsheets for background processing
    
    // 1. Get all spreadsheets with auto-sync enabled
    // Note: This implementation assumes we can iterate all. In production, pagination might be needed.
    const spreadsheets = await base44.asServiceRole.entities.CustomSpreadsheet.filter({
        // Filtering by JSON fields might be limited depending on DB, fetching all and filtering in memory for now if needed
        // Or better: Use a dedicated "scheduled_sync_active": true field on the entity if possible. 
        // For now, we'll fetch recently updated ones or just all if list is small. 
        // Assuming we can filter by nested property in future or this is small scale.
        // Let's assume we iterate all for simplicity in this MVP or rely on client-side triggering for now if cron isn't available.
        // ACTUALLY: The best way is to fetch all CustomSpreadsheets and check their sync_config.
    });

    const results = [];

    // Authenticate with Service Account (preferred for background tasks)
    let auth = null;
    const SERVICE_ACCOUNT_JSON = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
    
    // Also check AppSettings for service account
    if (!SERVICE_ACCOUNT_JSON) {
        const settings = await base44.asServiceRole.entities.AppSettings.filter({ setting_key: 'google_service_account' });
        if (settings.length > 0) {
             const credentials = settings[0].value;
             auth = new google.auth.GoogleAuth({
                credentials,
                scopes: ['https://www.googleapis.com/auth/spreadsheets'],
             });
        }
    } else {
        const credentials = JSON.parse(SERVICE_ACCOUNT_JSON);
        auth = new google.auth.GoogleAuth({
          credentials,
          scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
    }

    if (!auth) {
        return Response.json({ error: 'No Service Account configured for background sync' });
    }

    const sheets = google.sheets({ version: 'v4', auth });

    for (const spreadsheet of spreadsheets) {
        if (!spreadsheet.sync_config || spreadsheet.sync_config.auto_sync_interval === 'none') continue;

        const { auto_sync_interval, last_synced_at, sync_mode, field_mapping } = spreadsheet.sync_config;
        const now = new Date();
        const lastSync = last_synced_at ? new Date(last_synced_at) : new Date(0);
        
        let shouldSync = false;
        const diffHours = (now - lastSync) / (1000 * 60 * 60);

        if (auto_sync_interval === 'hourly' && diffHours >= 1) shouldSync = true;
        if (auto_sync_interval === 'daily' && diffHours >= 24) shouldSync = true;

        if (shouldSync) {
            try {
                // Perform Export (Base44 -> Google Sheets)
                // 1. Fetch Data (Clients) - Assuming this spreadsheet is linked to Clients
                // In a real app, we'd need to know WHICH entity type this spreadsheet is for.
                // Assuming 'Client' for now based on context.
                
                const clients = await base44.asServiceRole.entities.Client.list(); // Fetch all clients
                
                // 2. Map Data
                let headers = [];
                let rows = [];

                if (field_mapping && field_mapping.length > 0) {
                    headers = field_mapping.map(m => m.sheet_column);
                    rows = clients.map(client => {
                        return field_mapping.map(m => {
                            // Handle custom data vs top level
                            if (m.entity_field.startsWith('custom_data.')) {
                                const key = m.entity_field.split('.')[1];
                                return client.custom_data?.[key] || '';
                            }
                            return client[m.entity_field] || '';
                        });
                    });
                } else {
                    // Fallback to default if no mapping (not ideal for auto-sync but safe)
                    // Skip or implement default
                    continue; 
                }

                // 3. Update Sheet
                // Reuse logic from googleSheets.js or call API directly
                // Here we call API directly since we are already in backend
                
                if (sync_mode === 'overwrite') {
                     await sheets.spreadsheets.values.clear({
                        spreadsheetId: spreadsheet.google_sheet_id,
                        range: spreadsheet.google_sheet_name,
                     });
                     await sheets.spreadsheets.values.update({
                        spreadsheetId: spreadsheet.google_sheet_id,
                        range: `${spreadsheet.google_sheet_name}!A1`,
                        valueInputOption: 'USER_ENTERED',
                        resource: { values: [headers, ...rows] }
                     });
                } else if (sync_mode === 'append') {
                     // Append logic...
                     await sheets.spreadsheets.values.append({
                        spreadsheetId: spreadsheet.google_sheet_id,
                        range: spreadsheet.google_sheet_name,
                        valueInputOption: 'USER_ENTERED',
                        resource: { values: rows }
                     });
                }

                // 4. Update last_synced_at
                await base44.asServiceRole.entities.CustomSpreadsheet.update(spreadsheet.id, {
                    sync_config: {
                        ...spreadsheet.sync_config,
                        last_synced_at: now.toISOString()
                    }
                });

                results.push({ id: spreadsheet.id, status: 'synced' });

            } catch (e) {
                console.error(`Failed to sync spreadsheet ${spreadsheet.id}:`, e);
                results.push({ id: spreadsheet.id, status: 'error', error: e.message });
            }
        }
    }

    return Response.json({ success: true, results });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});