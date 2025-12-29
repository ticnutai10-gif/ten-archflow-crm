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
      const mode = payload.mode || 'overwrite'; // 'overwrite', 'append', 'update_existing'

      if (mode === 'overwrite') {
        // Full sync mode: Clear and write
        if (!range && sheetName) {
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
        }
      } 
      
      else if (mode === 'append') {
        // Append rows to the end of the sheet
        const response = await sheets.spreadsheets.values.append({
          spreadsheetId,
          range: sheetName,
          valueInputOption: 'USER_ENTERED',
          resource: {
            values: values // Just the data rows
          }
        });
        return Response.json({ success: true, updates: response.data.updates });
      } 
      
      else if (mode === 'update_existing') {
        // Smart update: Read existing data, match by first column (ID/Key), update if exists, append if new
        
        // 1. Read existing data
        const readResponse = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: sheetName,
        });
        
        const existingRows = readResponse.data.values || [];
        const existingHeaders = existingRows[0] || [];
        const existingData = existingRows.slice(1);
        
        // If sheet is empty, treat as overwrite
        if (existingRows.length === 0) {
           const allValues = headers ? [headers, ...values] : values;
           const response = await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `${sheetName}!A1`,
            valueInputOption: 'USER_ENTERED',
            resource: { values: allValues }
          });
          return Response.json({ success: true, updatedCells: response.data.updatedCells, note: 'Sheet was empty, performed full write' });
        }

        // Map existing rows by first column (assuming it's a unique key)
        const existingMap = new Map();
        existingData.forEach((row, index) => {
          if (row[0]) existingMap.set(String(row[0]), index + 2); // Store 1-based row index (header is 1, so data starts at 2)
        });

        const updates = []; // Batch updates
        const newRows = []; // Rows to append

        values.forEach(row => {
          const key = String(row[0]);
          if (existingMap.has(key)) {
            // Update existing row
            const rowIndex = existingMap.get(key);
            updates.push({
              range: `${sheetName}!A${rowIndex}`,
              values: [row]
            });
          } else {
            // Append new row
            newRows.push(row);
          }
        });

        // Perform batch updates
        if (updates.length > 0) {
          await sheets.spreadsheets.values.batchUpdate({
            spreadsheetId,
            resource: {
              valueInputOption: 'USER_ENTERED',
              data: updates
            }
          });
        }

        // Perform append for new rows
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
          addedRows: newRows.length 
        });
      }

      // Fallback for simple update with range
      if (range) {
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