import { createClientFromRequest } from 'npm:@base44/sdk@0.8.3';
import { google } from 'npm:googleapis';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Try to get OAuth token first (App Connector)
    let auth = null;
    try {
      const accessToken = await base44.asServiceRole.connectors.getAccessToken("googlesheets");
      if (accessToken) {
        const oauth2Client = new google.auth.OAuth2();
        oauth2Client.setCredentials({ access_token: accessToken });
        auth = oauth2Client;
      }
    } catch (e) {
      console.log("No OAuth token found, falling back to Service Account if available");
    }

    // Fallback to Service Account if no OAuth
    if (!auth) {
      const SERVICE_ACCOUNT_JSON = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
      if (SERVICE_ACCOUNT_JSON) {
        const credentials = JSON.parse(SERVICE_ACCOUNT_JSON);
        auth = new google.auth.GoogleAuth({
          credentials,
          scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
      }
    }

    if (!auth) {
      return Response.json({ 
        success: false, 
        error: 'No authentication method available. Please connect Google Sheets.' 
      }, { status: 400 });
    }

    const sheets = google.sheets({ version: 'v4', auth });
    const payload = await req.json();
    const { action, spreadsheetId, sheetName, range, values, headers, title } = payload;

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
      return Response.json({ success: true, ...response.data });
    }

    if (action === 'getSheets') {
      const response = await sheets.spreadsheets.get({
        spreadsheetId,
        fields: 'sheets.properties',
      });
      
      const sheetList = response.data.sheets.map(s => ({
        id: s.properties.sheetId,
        title: s.properties.title,
        rowCount: s.properties.gridProperties.rowCount,
        colCount: s.properties.gridProperties.columnCount
      }));
      
      return Response.json({ success: true, sheets: sheetList });
    }

    if (action === 'read') {
      // If sheetName is provided, read that sheet. Otherwise read first sheet or provided range.
      let readRange = range;
      if (!readRange && sheetName) {
        readRange = sheetName; // Read whole sheet
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
        totalRows: dataRows.length
      });
    }

    if (action === 'update') {
      // values expected to be array of arrays
      // headers optional. if provided, we assume we overwrite the whole sheet or append?
      // Simple sync: Clear sheet and write all data
      
      if (!range && sheetName) {
        // Full sync mode: Clear and write
        // 1. Clear
        await sheets.spreadsheets.values.clear({
          spreadsheetId,
          range: sheetName,
        });

        // 2. Write headers + rows
        const allValues = headers ? [headers, ...values] : values;
        
        const response = await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${sheetName}!A1`,
          valueInputOption: 'USER_ENTERED',
          resource: {
            values: allValues
          }
        });
        
        return Response.json({ success: true, updatedCells: response.data.updatedCells });
      } else {
        // Specific range update
        const response = await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: range,
          valueInputOption: 'USER_ENTERED',
          resource: {
            values: values
          }
        });
        return Response.json({ success: true, updatedCells: response.data.updatedCells });
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
      return Response.json({ success: true, updates: response.data.updates });
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
      return Response.json({ success: true, sheetName: sheetName });
    }

    return Response.json({ success: false, error: 'Unknown action' });

  } catch (error) {
    console.error('Google Sheets error:', error);
    return Response.json({ 
      success: false, 
      error: error.message,
      details: error.response?.data 
    }, { status: 500 });
  }
});