import { createClientFromRequest } from 'npm:@base44/sdk@0.7.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const SERVICE_ACCOUNT_JSON = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
    if (!SERVICE_ACCOUNT_JSON) {
      return Response.json({ 
        success: false,
        error: 'Google Service Account credentials not configured',
        solution: 'Please set GOOGLE_SERVICE_ACCOUNT_JSON secret in app settings'
      }, { status: 500 });
    }

    const payload = await req.json();
    const { action, spreadsheetId, range } = payload;

    // פתרון חלופי - יצירת URL ישיר לייצוא CSV
    if (action === 'read' && spreadsheetId) {
      try {
        const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=0`;
        
        // ניסיון לקרוא את ה-CSV ישירות
        const response = await fetch(csvUrl);
        
        if (!response.ok) {
          throw new Error('Unable to access spreadsheet');
        }
        
        const csvText = await response.text();
        const lines = csvText.split('\n').filter(line => line.trim());
        
        if (lines.length === 0) {
          return Response.json({
            success: false,
            error: 'Empty spreadsheet or access denied',
            csvUrl: csvUrl,
            instructions: 'Make sure the spreadsheet is publicly viewable'
          });
        }

        // ניתוח CSV
        const parseCSVLine = (line) => {
          const result = [];
          let current = '';
          let inQuotes = false;
          
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              result.push(current.replace(/^"|"$/g, '').trim());
              current = '';
            } else {
              current += char;
            }
          }
          result.push(current.replace(/^"|"$/g, '').trim());
          return result;
        };

        const headers = parseCSVLine(lines[0]);
        const rows = lines.slice(1).map(parseCSVLine);

        return Response.json({
          success: true,
          headers: headers,
          rows: rows,
          totalRows: rows.length,
          method: 'direct_csv_access'
        });

      } catch (error) {
        return Response.json({
          success: false,
          error: 'Could not access spreadsheet directly',
          details: error.message,
          csvUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=0`,
          instructions: [
            '1. Make sure the Google Sheet is publicly viewable',
            '2. Go to File → Share → General Access → Anyone with the link',
            '3. Or download CSV manually and upload it to the system'
          ]
        });
      }
    }

    // אם אין Google Service Account, החזר הוראות
    let serviceAccountCredentials;
    try {
      serviceAccountCredentials = JSON.parse(SERVICE_ACCOUNT_JSON);
    } catch (parseError) {
      return Response.json({ 
        success: false,
        error: 'Invalid Google Service Account JSON format',
        solution: 'Check the GOOGLE_SERVICE_ACCOUNT_JSON secret format'
      });
    }

    // ניסיון עבודה עם Google API (זה עדיין לא יעבוד עד שהבעיות ייפתרו)
    return Response.json({
      success: false,
      error: 'Google Sheets API temporarily unavailable',
      alternative_solutions: [
        'Use direct CSV export from Google Sheets',
        'Download CSV and upload manually',
        'Make spreadsheet publicly viewable for direct access'
      ],
      csv_export_url: spreadsheetId ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv` : null
    });

  } catch (error) {
    console.error('Google Sheets function error:', error);
    return Response.json({ 
      success: false,
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
});