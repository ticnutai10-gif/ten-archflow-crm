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
          // Don't add to authErrors if we already have other methods to try or failed, to reduce noise
          // authErrors.push(msg); 
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

      // Log start of import
      const startTime = Date.now();

      // Check if metadata is requested
      const includeMetadata = payload.includeMetadata;

      if (includeMetadata) {
          // Fetch Grid Data (Values + Formatting + Metadata)
          const response = await sheets.spreadsheets.get({
              spreadsheetId,
              ranges: [readRange || 'A1:Z1000'],
              includeGridData: true
          });

          const sheet = response.data.sheets?.[0];
          if (!sheet) {
              return Response.json({ success: false, error: 'Sheet not found' });
          }

          const data = sheet.data?.[0] || {};
          const rowData = data.rowData || [];
          const merges = sheet.merges || [];

          const rows = [];
          const styles = [];
          const notes = [];

          rowData.forEach((row, rowIndex) => {
              const rowValues = [];
              const rowStyles = [];
              const rowNotes = [];

              if (row.values) {
                  row.values.forEach((cell, colIndex) => {
                      // Value
                      let cellValue = '';
                      if (cell.formattedValue) cellValue = cell.formattedValue;
                      else if (cell.userEnteredValue?.stringValue) cellValue = cell.userEnteredValue.stringValue;
                      else if (cell.userEnteredValue?.numberValue !== undefined) cellValue = cell.userEnteredValue.numberValue;
                      else if (cell.userEnteredValue?.boolValue !== undefined) cellValue = cell.userEnteredValue.boolValue;

                      rowValues.push(cellValue);

                      // Formatting
                      if (cell.userEnteredFormat || cell.note) {
                          const style = {};
                          const format = cell.userEnteredFormat || {};

                          if (format.backgroundColor) {
                              const { red, green, blue } = format.backgroundColor;
                              // Google uses 0-1, we need 0-255 hex
                              const toHex = (c) => {
                                  const hex = Math.round((c || 0) * 255).toString(16);
                                  return hex.length === 1 ? '0' + hex : hex;
                              };
                              // Ignore pure white/empty as default
                              if (red !== undefined || green !== undefined || blue !== undefined) {
                                  style.backgroundColor = `#${toHex(red)}${toHex(green)}${toHex(blue)}`;
                              }
                          }

                          if (format.textFormat) {
                              if (format.textFormat.bold) style.fontWeight = 'bold';
                              if (format.textFormat.foregroundColor) {
                                  const { red, green, blue } = format.textFormat.foregroundColor;
                                  style.color = `#${Math.round((red||0)*255).toString(16).padStart(2,'0')}${Math.round((green||0)*255).toString(16).padStart(2,'0')}${Math.round((blue||0)*255).toString(16).padStart(2,'0')}`;
                              }
                          }

                          if (Object.keys(style).length > 0) {
                              rowStyles[colIndex] = style;
                          }

                          if (cell.note) {
                              rowNotes[colIndex] = cell.note;
                          }
                      }
                  });
              }
              rows.push(rowValues);
              styles.push(rowStyles);
              notes.push(rowNotes);
          });

          const headerRow = rows.length > 0 ? rows[0] : [];
          const dataRows = rows.slice(1);

          // Log success
          try {
             await base44.asServiceRole.entities.SyncLog.create({
                spreadsheet_id: spreadsheetId,
                spreadsheet_name: sheetName,
                status: 'success',
                direction: 'import',
                rows_synced: dataRows.length,
                duration_ms: Date.now() - startTime,
                triggered_by: user.email,
                details: `Imported ${dataRows.length} rows with metadata`
             });
          } catch(e) { console.error('Log error', e); }

          return Response.json({
              success: true,
              headers: headerRow,
              rows: dataRows,
              merges: merges, // Array of {startRowIndex, endRowIndex, startColumnIndex, endColumnIndex}
              styles: styles.slice(1), // Remove header styles from data styles
              headerStyles: styles[0],
              notes: notes.slice(1),
              totalRows: dataRows.length,
              debug: debugLogs
          });

          } else {
          // Simple values only read
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
          
          // Log success
          try {
             await base44.asServiceRole.entities.SyncLog.create({
                spreadsheet_id: spreadsheetId,
                spreadsheet_name: sheetName,
                status: 'success',
                direction: 'export',
                rows_synced: values.length,
                triggered_by: user.email,
                details: `Exported ${values.length} rows (${mode})`
             });
          } catch(e) { console.error('Log error', e); }

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

        // Update headers to ensure new columns are added
        if (headers && headers.length > 0) {
            await sheets.spreadsheets.values.update({
                spreadsheetId,
                range: `${sheetName}!A1`,
                valueInputOption: 'USER_ENTERED',
                resource: { values: [headers] }
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

    if (action === 'twoWaySync') {
       const startTime = Date.now();
       const { localRows, localHeaders, primaryKeyColumn } = payload;
       log('Starting Two-Way Sync', { rowCount: localRows?.length });

       // 1. Fetch Remote Data
       const remoteRes = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: sheetName, // Auto-expand range
       });
       const remoteData = remoteRes.data.values || [];
       const remoteHeaders = remoteData.length > 0 ? remoteData[0] : [];
       const remoteRows = remoteData.slice(1);

       // 1.5 Merge Headers (Structure Sync)
       // Union of local and remote headers to ensure all columns exist
       const mergedHeaders = [...remoteHeaders];
       const headerMap = new Map(); // Header Name -> Index in Merged
       const norm = (v) => String(v || '').trim().toLowerCase(); // Normalize helper defined early

       remoteHeaders.forEach((h, i) => headerMap.set(norm(h), i));

       // Add missing local headers to merged list
       localHeaders.forEach(h => {
           if (!headerMap.has(norm(h))) {
               mergedHeaders.push(h);
               headerMap.set(norm(h), mergedHeaders.length - 1);
           }
       });

       // Update headers in Google Sheet if changed
       if (mergedHeaders.length > remoteHeaders.length) {
           log('Updating remote headers with new columns', { count: mergedHeaders.length });
           await sheets.spreadsheets.values.update({
               spreadsheetId,
               range: `${sheetName}!A1`,
               valueInputOption: 'USER_ENTERED',
               resource: { values: [mergedHeaders] }
           });
       }

       // 2. Identify Key Columns for Matching
       // If primaryKeyColumn provided (e.g. 'Email' or 'ID'), find its index in both
       let remoteKeyIdx = -1;
       let localKeyIdx = -1;

       if (primaryKeyColumn) {
           remoteKeyIdx = remoteHeaders.findIndex(h => norm(h) === norm(primaryKeyColumn));
           localKeyIdx = localHeaders.findIndex(h => norm(h) === norm(primaryKeyColumn));
       }

       // If no key found, we might fallback to index-based (risky) or just Append-Only
       // For true two-way without IDs, we'll use a "Merge" strategy:
       // - Create a Map of Key -> Row for both
       // - Union keys
       // - Compare and resolve

       const mergedRows = [];
       const updatesToRemote = [];
       let rowsAdded = 0;
       let rowsUpdated = 0;
       let conflicts = 0;

       // Helper to align row to merged headers
       const alignRow = (row, sourceHeaders) => {
           const newRow = new Array(mergedHeaders.length).fill('');
           sourceHeaders.forEach((h, i) => {
               const targetIdx = headerMap.get(norm(h));
               if (targetIdx !== undefined && row[i] !== undefined) {
                   newRow[targetIdx] = row[i];
               }
           });
           return newRow;
       };

       const isDifferent = (arr1, arr2) => {
           // Compare only up to the length of existing data to avoid false positives on empty trailing cells
           const len = Math.max(arr1.length, arr2.length);
           for(let i=0; i<len; i++) {
               if (norm(arr1[i]) !== norm(arr2[i])) return true;
           }
           return false;
       };

       if (remoteKeyIdx !== -1 && localKeyIdx !== -1) {
           // --- KEY-BASED MERGE ---
           log('Performing Key-Based Merge', { key: primaryKeyColumn });

           const remoteMap = new Map();
           remoteRows.forEach(row => {
               const key = norm(row[remoteKeyIdx]);
               if(key) remoteMap.set(key, row);
           });

           const localMap = new Map();
           localRows.forEach(row => {
               // localRows might be objects or arrays depending on what frontend sends
               // assuming array of values here for simplicity of 'generic' spreadsheet
               const key = norm(row[localKeyIdx]);
               if(key) localMap.set(key, row);
           });

           const allKeys = new Set([...remoteMap.keys(), ...localMap.keys()]);

           for (const key of allKeys) {
               const rRow = remoteMap.get(key);
               const lRow = localMap.get(key);

               // Align rows to merged headers
               const alignedRRow = rRow ? alignRow(rRow, remoteHeaders) : null;
               const alignedLRow = lRow ? alignRow(lRow, localHeaders) : null;

               if (alignedRRow && alignedLRow) {
                   // Conflict Resolution: Remote Wins, but keep Local values for new columns (if Remote is empty there)
                   if (isDifferent(alignedRRow, alignedLRow)) {
                      conflicts++;
                      const mergedRow = [...alignedRRow];
                      // Fill gaps in remote row from local row (for new columns)
                      for(let i=0; i<mergedRow.length; i++) {
                          if (!mergedRow[i] && alignedLRow[i]) mergedRow[i] = alignedLRow[i];
                      }
                      mergedRows.push(mergedRow);

                      // Optionally update remote here? For simplicity we won't patch existing rows in remote, only append new ones
                   } else {
                      mergedRows.push(alignedRRow);
                   }
               } else if (alignedRRow && !alignedLRow) {
                   // New in Remote -> Add to Local
                   mergedRows.push(alignedRRow);
                   rowsAdded++;
               } else if (!alignedRRow && alignedLRow) {
                   // New in Local -> Add to Remote
                   mergedRows.push(alignedLRow);
                   updatesToRemote.push(alignedLRow); // Will append
                   rowsAdded++;
               }
           }

           // If we have updates for remote (new local rows), append them
           if (updatesToRemote.length > 0) {
               await sheets.spreadsheets.values.append({
                  spreadsheetId,
                  range: sheetName,
                  valueInputOption: 'USER_ENTERED',
                  resource: { values: updatesToRemote }
               });
           }

           } else {
           // --- INDEX/APPEND MERGE (No Key) ---
           // If headers match, we assume row N corresponds to row N
           log('Performing Index-Based Merge (No Key)');

           const maxLen = Math.max(remoteRows.length, localRows.length);

           for (let i = 0; i < maxLen; i++) {
               const rRow = remoteRows[i];
               const lRow = localRows[i];

               // Align
               const alignedRRow = rRow ? alignRow(rRow, remoteHeaders) : null;
               const alignedLRow = lRow ? alignRow(lRow, localHeaders) : null;

               if (alignedRRow && alignedLRow) {
                   if (isDifferent(alignedRRow, alignedLRow)) {
                       conflicts++;
                       const mergedRow = [...alignedRRow];
                       for(let j=0; j<mergedRow.length; j++) {
                           if (!mergedRow[j] && alignedLRow[j]) mergedRow[j] = alignedLRow[j];
                       }
                       mergedRows.push(mergedRow); 
                   } else {
                       mergedRows.push(alignedRRow);
                   }
               } else if (alignedRRow) {
                   mergedRows.push(alignedRRow); // New in Remote
                   rowsAdded++;
               } else if (alignedLRow) {
                   mergedRows.push(alignedLRow); // New in Local
                   // We need to update Remote at this specific index or append?
                   // If we are at index i > remoteRows.length, it's an append.
                   if (i >= remoteRows.length) {
                       updatesToRemote.push(alignedLRow);
                   }
               }
           }

           if (updatesToRemote.length > 0) {
               await sheets.spreadsheets.values.append({
                  spreadsheetId,
                  range: sheetName,
                  valueInputOption: 'USER_ENTERED',
                  resource: { values: updatesToRemote }
               });
           }
           }

           // Log Sync
           try {
           const duration = Date.now() - startTime;
           await base44.asServiceRole.entities.SyncLog.create({
              spreadsheet_id: spreadsheetId,
              spreadsheet_name: sheetName,
              status: 'success',
              direction: 'two_way',
              rows_synced: mergedRows.length,
              rows_added: rowsAdded,
              conflicts: conflicts,
              duration_ms: duration,
              triggered_by: user.email,
              details: `Merged ${localRows.length} local with ${remoteRows.length} remote rows. Added ${mergedHeaders.length - remoteHeaders.length} columns.`
           });
           } catch(e) { console.error('Failed to write sync log', e); }

           return Response.json({ 
           success: true, 
           mergedData: mergedRows,
           mergedHeaders: mergedHeaders,
           rowsAdded,
           conflicts,
           debug: debugLogs 
           });
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