import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { google } from 'npm:googleapis@137.1.0';

Deno.serve(async (req) => {
  const results = {
    timestamp: new Date().toISOString(),
    steps: []
  };

  const log = (step, status, data = {}) => {
    results.steps.push({ step, status, data, time: new Date().toISOString() });
  };

  try {
    // Step 1: Parse request
    const base44 = createClientFromRequest(req);
    log('create_client', 'success');

    // Step 2: Check user auth
    const user = await base44.auth.me();
    if (!user) {
      log('user_auth', 'failed', { reason: 'No user' });
      return Response.json(results);
    }
    log('user_auth', 'success', { email: user.email });

    // Step 3: Try OAuth connector
    let oauthToken = null;
    try {
      oauthToken = await base44.asServiceRole.connectors.getAccessToken("googlesheets");
      log('oauth_connector', oauthToken ? 'success' : 'empty', { 
        hasToken: !!oauthToken,
        tokenLength: oauthToken?.length || 0,
        tokenPreview: oauthToken ? oauthToken.substring(0, 20) + '...' : null
      });
    } catch (e) {
      log('oauth_connector', 'error', { error: e.message });
    }

    // Step 4: Check env var
    const envJson = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
    log('env_var_check', envJson ? 'found' : 'not_found', { 
      length: envJson?.length || 0 
    });

    // Step 5: Parse env var if exists
    let serviceAccountCreds = null;
    if (envJson) {
      try {
        serviceAccountCreds = JSON.parse(envJson);
        log('env_var_parse', 'success', { 
          email: serviceAccountCreds.client_email,
          hasPrivateKey: !!serviceAccountCreds.private_key,
          privateKeyLength: serviceAccountCreds.private_key?.length || 0
        });
      } catch (e) {
        log('env_var_parse', 'error', { error: e.message });
      }
    }

    // Step 6: Check AppSettings
    const settings = await base44.asServiceRole.entities.AppSettings.filter({ setting_key: 'google_service_account' });
    log('app_settings_check', settings.length > 0 ? 'found' : 'not_found', { 
      count: settings.length,
      email: settings[0]?.value?.client_email || null
    });

    // Step 7: Try to authenticate with Google
    let auth = null;
    
    // Try OAuth first
    if (oauthToken) {
      try {
        const oauth2Client = new google.auth.OAuth2();
        oauth2Client.setCredentials({ access_token: oauthToken });
        auth = oauth2Client;
        log('google_auth_oauth', 'created');
        
        // Test the auth
        const sheets = google.sheets({ version: 'v4', auth });
        const testSpreadsheetId = '1cIEznO_7ko00wROvIA376tPCrp4G_7-pOTZ9SakJkBA';
        
        try {
          const response = await sheets.spreadsheets.get({
            spreadsheetId: testSpreadsheetId,
            fields: 'spreadsheetId,properties.title'
          });
          log('google_api_test_oauth', 'success', { 
            title: response.data.properties?.title,
            id: response.data.spreadsheetId
          });
        } catch (e) {
          log('google_api_test_oauth', 'failed', { 
            error: e.message,
            code: e.code,
            status: e.status
          });
        }
      } catch (e) {
        log('google_auth_oauth', 'error', { error: e.message });
      }
    }

    // Try Service Account
    if (serviceAccountCreds) {
      try {
        const saAuth = new google.auth.GoogleAuth({
          credentials: serviceAccountCreds,
          scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
        log('google_auth_service_account', 'created');
        
        const sheets = google.sheets({ version: 'v4', auth: saAuth });
        const testSpreadsheetId = '1cIEznO_7ko00wROvIA376tPCrp4G_7-pOTZ9SakJkBA';
        
        try {
          const response = await sheets.spreadsheets.get({
            spreadsheetId: testSpreadsheetId,
            fields: 'spreadsheetId,properties.title'
          });
          log('google_api_test_sa', 'success', { 
            title: response.data.properties?.title,
            id: response.data.spreadsheetId
          });
        } catch (e) {
          log('google_api_test_sa', 'failed', { 
            error: e.message,
            code: e.code,
            status: e.status,
            details: e.response?.data?.error
          });
        }
      } catch (e) {
        log('google_auth_service_account', 'error', { error: e.message });
      }
    }

    return Response.json(results);

  } catch (error) {
    log('fatal_error', 'error', { message: error.message, stack: error.stack });
    return Response.json(results);
  }
});