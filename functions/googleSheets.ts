import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { google } from 'npm:googleapis@137.1.0';

Deno.serve(async (req) => {
  const debugLogs = [];
  const log = (msg, data = null) => {
    const entry = { time: new Date().toISOString(), msg, data };
    debugLogs.push(entry);
    console.log(`[DEBUG] ${msg}`, data || '');
  };

  try {
    log('Starting Google Sheets function');
    
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      log('User not authenticated');
      return Response.json({ error: 'Unauthorized', debug: debugLogs }, { status: 401 });
    }
    log('User authenticated', { email: user.email });

    // Parse payload first
    const payload = await req.json();
    log('Received payload', { action: payload.action, spreadsheetId: payload.spreadsheetId });
    const { action, spreadsheetId, sheetName, range, values, headers, title } = payload;

    // Handle service account management actions BEFORE auth check
    if (action === 'saveServiceAccount') {
        const { json } = payload;
        if (!json || !json.client_email || !json.private_key) {
             return Response.json({ success: false, error: 'Invalid Service Account JSON' });
        }
        
        const existing = await base44.asServiceRole.entities.AppSettings.filter({ setting_key: 'google_service_account' });
        if (existing.length > 0) {
            await base44.asServiceRole.entities.AppSettings.update(existing[0].id, { value: json });
        } else {
            await base44.asServiceRole.entities.AppSettings.create({ 
                setting_key: 'google_service_account', 
                value: json,
                description: 'Google Service Account Credentials'
            });
        }
        return Response.json({ success: true, email: json.client_email });
    }

    if (action === 'getServiceAccountEmail') {
         let email = null;
         const settings = await base44.asServiceRole.entities.AppSettings.filter({ setting_key: 'google_service_account' });
         if (settings.length > 0) {
             email = settings[0].value.client_email;
         }
         
         if (!email) {
            const envVar = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
            if (envVar) {
                try { 
                    const parsed = JSON.parse(envVar);
                    email = parsed.client_email;
                } catch(e) {}
            }
         }
         
         return Response.json({ success: true, email });
    }

    // Get authentication
    let auth = null;
    let authMethod = 'none';
    const authErrors = [];

    // 1. Check AppSettings (User Manual Override) - HIGHEST PRIORITY
    log('Checking AppSettings for service account...');
    const settings = await base44.asServiceRole.entities.AppSettings.filter({ setting_key: 'google_service_account' });
    if (settings && settings.length > 0) {
       const credentials = settings[0].value;
       log('Found service account in AppSettings', { email: credentials?.client_email });

       try {
          auth = new google.auth.GoogleAuth({
            credentials,
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
          });
          authMethod = 'service_account_manual';
          log('GoogleAuth created successfully from AppSettings');
        } catch (e) {
          log('Failed to create GoogleAuth from AppSettings', { error: e.message });
          authErrors.push(`Manual Service Account failed: ${e.message}`);
        }
    } else {
       log('No service account in AppSettings');
    }

    // 2. Try OAuth App Connector if no manual service account
    if (!auth) {
        try {
          log('Trying OAuth App Connector for googlesheets...');
          const accessToken = await base44.asServiceRole.connectors.getAccessToken("googlesheets");
          if (accessToken) {
            log('OAuth token received from App Connector', { tokenLength: accessToken?.length });
            const oauth2Client = new google.auth.OAuth2();
            oauth2Client.setCredentials({ access_token: accessToken });
            auth = oauth2Client;
            authMethod = 'oauth_connector';
          } else {
            log('OAuth token is null/empty');
            authErrors.push("OAuth token missing");
          }
        } catch (e) {
          log('OAuth connector failed', { error: e.message });
          authErrors.push(`OAuth failed: ${e.message}`);
        }
    }

    // 3. Fallback to Env Var Service Account
    if (!auth) {
      log('No Auth yet, checking GOOGLE_SERVICE_ACCOUNT_JSON env var...');
      const SERVICE_ACCOUNT_JSON = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
      if (SERVICE_ACCOUNT_JSON) {
        log('Found GOOGLE_SERVICE_ACCOUNT_JSON env var', { length: SERVICE_ACCOUNT_JSON.length });
        try {
          const credentials = JSON.parse(SERVICE_ACCOUNT_JSON);
          log('Parsed service account JSON successfully', { email: credentials?.client_email });

          auth = new google.auth.GoogleAuth({
              credentials,
              scopes: ['https://www.googleapis.com/auth/spreadsheets'],
          });
          authMethod = 'service_account_env';
          log('GoogleAuth created successfully from Env Var');
        } catch (e) {
          const msg = `Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON (Length: ${SERVICE_ACCOUNT_JSON.length}). Possibly truncated. Error: ${e.message}`;
          log(msg);
          authErrors.push(msg);
        }
      } else {
        log('GOOGLE_SERVICE_ACCOUNT_JSON env var not found');
        authErrors.push("GOOGLE_SERVICE_ACCOUNT_JSON env var missing");
      }
    }

    if (!auth) {
      log('No authentication method available!');
      return Response.json({ 
        success: false, 
        error: 'אימות נכשל. ' + authErrors.join('. '),
        debug: debugLogs
      }, { status: 400 });
    }
    
    log('Authentication ready', { method: authMethod });

    const sheets = google.sheets({ version: 'v4', auth });

    if (action === 'create') {
      const resource = {
        properties: {
          title: title || 'New Spreadsheet'
        }
      };
      const response = await sheets.spreadsheets.create({
        resource,
        fields: 'spreadsheetId,spreadsheetUrl',
      });
      return Response.json({ success: true, ...response.data, debug: debugLogs });
    }

    if (action === 'getSheets') {
      log('Getting sheets list', { spreadsheetId });
      try {
        const response = await sheets.spreadsheets.get({
          spreadsheetId,
          fields: 'sheets.properties',
        });
        
        log('Sheets API response received', { sheetsCount: response.data.sheets?.length });
        
        const sheetList = response.data.sheets.map(s => ({
          id: s.properties.sheetId,
          title: s.properties.title,
          rowCount: s.properties.gridProperties.rowCount,
          colCount: s.properties.gridProperties.columnCount
        }));
        
        return Response.json({ success: true, sheets: sheetList, debug: debugLogs });
      } catch (e) {
        log('getSheets failed', { error: e.message, code: e.code, status: e.status });
        throw e;
      }
    }

    if (action === 'getHeaders') {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetName}!A1:Z1`,
      });
      const headersResult = response.data.values ? response.data.values[0] : [];
      return Response.json({ success: true, headers: headersResult, debug: debugLogs });
    }

    if (action === 'read') {
      let readRange = range;
      if (!readRange && sheetName) {
        readRange = sheetName;
      }

      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: readRange || 'A1:Z1000',
      });

      const rows = response.data.values || [];
      const headerRow = rows.length > 0 ? rows[0] : [];
      const dataRows = rows.slice(1);

      return Response.json({
        success: true,
        headers: headerRow,
        rows: dataRows,
        totalRows: dataRows.length,
        debug: debugLogs
      });
    }

    if (action === 'update') {
      const mode = payload.mode || 'overwrite';

      if (mode === 'overwrite') {
        if (!range && sheetName) {
          await sheets.spreadsheets.values.clear({
            spreadsheetId,
            range: sheetName,
          });

          const allValues = headers ? [headers, ...values] : values;
          
          const response = await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `${sheetName}!A1`,
            valueInputOption: 'USER_ENTERED',
            resource: {
              values: allValues
            }
          });
          
          return Response.json({ success: true, updatedCells: response.data.updatedCells, debug: debugLogs });
        }
      } 
      
      else if (mode === 'append') {
        const response = await sheets.spreadsheets.values.append({
          spreadsheetId,
          range: sheetName,
          valueInputOption: 'USER_ENTERED',
          resource: {
            values: values
          }
        });
        return Response.json({ success: true, updates: response.data.updates, debug: debugLogs });
      } 
      
      else if (mode === 'update_existing') {
        const readResponse = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: sheetName,
        });
        
        const existingRows = readResponse.data.values || [];
        const existingData = existingRows.slice(1);
        
        if (existingRows.length === 0) {
           const allValues = headers ? [headers, ...values] : values;
           const response = await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `${sheetName}!A1`,
            valueInputOption: 'USER_ENTERED',
            resource: { values: allValues }
          });
          return Response.json({ success: true, updatedCells: response.data.updatedCells, note: 'Sheet was empty, performed full write', debug: debugLogs });
        }

        const existingMap = new Map();
        existingData.forEach((row, index) => {
          if (row[0]) existingMap.set(String(row[0]), index + 2);
        });

        const updates = [];
        const newRows = [];

        values.forEach(row => {
          const key = String(row[0]);
          if (existingMap.has(key)) {
            const rowIndex = existingMap.get(key);
            updates.push({
              range: `${sheetName}!A${rowIndex}`,
              values: [row]
            });
          } else {
            newRows.push(row);
          }
        });

        if (updates.length > 0) {
          await sheets.spreadsheets.values.batchUpdate({
            spreadsheetId,
            resource: {
              valueInputOption: 'USER_ENTERED',
              data: updates
            }
          });
        }

        if (newRows.length > 0) {
          await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: sheetName,
            valueInputOption: 'USER_ENTERED',
            resource: {
              values: newRows
            }
          });
        }

        return Response.json({ 
          success: true, 
          updatedRows: updates.length, 
          addedRows: newRows.length,
          debug: debugLogs
        });
      }

      if (range) {
        const response = await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: range,
          valueInputOption: 'USER_ENTERED',
          resource: {
            values: values
          }
        });
        return Response.json({ success: true, updatedCells: response.data.updatedCells, debug: debugLogs });
      }
    }
    
    if (action === 'append') {
       const response = await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: range || sheetName,
        valueInputOption: 'USER_ENTERED',
        resource: {
          values: values
        }
      });
      return Response.json({ success: true, updates: response.data.updates, debug: debugLogs });
    }

    if (action === 'addSheet') {
      const response = await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: {
          requests: [{
            addSheet: {
              properties: {
                title: sheetName
              }
            }
          }]
        }
      });
      return Response.json({ success: true, sheetName: sheetName, debug: debugLogs });
    }

    if (action === 'updateHeaders') {
      const response = await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!A1`,
        valueInputOption: 'USER_ENTERED',
        resource: {
          values: [headers]
        }
      });
      return Response.json({ success: true, updatedCells: response.data.updatedCells, debug: debugLogs });
    }

    return Response.json({ success: false, error: 'Unknown action', debug: debugLogs });

  } catch (error) {
    console.error('Google Sheets error:', error);
    debugLogs.push({ time: new Date().toISOString(), msg: 'FATAL ERROR', data: { message: error.message, code: error.code, status: error.status } });
    return Response.json({ 
      success: false, 
      error: error.message,
      details: error.response?.data,
      debug: debugLogs
    }, { status: 500 });
  }
});