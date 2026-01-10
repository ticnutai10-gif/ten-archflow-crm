import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import JSZip from 'npm:jszip@3.10.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const zip = new JSZip();

    // ============================================
    // 1. ENTITIES (JSON Schemas)
    // ============================================
    const entitiesFolder = zip.folder("entities");
    
    const entitySchemas = {
      "Client.json": {
        name: "Client",
        type: "object",
        properties: {
          name: { type: "string", description: "שם הלקוח" },
          name_clean: { type: "string", description: "שם הלקוח (נקי)" },
          stage: { type: "string", description: "שלב הלקוח בתהליך" },
          email: { type: "string", format: "email", description: "כתובת אימייל" },
          phone: { type: "string", description: "מספר טלפון" },
          address: { type: "string", description: "כתובת" },
          company: { type: "string", description: "חברה" },
          status: { type: "string", enum: ["פוטנציאלי", "פעיל", "לא פעיל"], default: "פוטנציאלי" },
          notes: { type: "string", description: "הערות" },
          professionals: { type: "object", description: "בעלי מקצוע משויכים" },
          custom_data: { type: "object", description: "שדות מותאמים" }
        },
        required: ["name"]
      },
      "Project.json": {
        name: "Project",
        type: "object",
        properties: {
          name: { type: "string", description: "שם הפרויקט" },
          client_id: { type: "string" },
          client_name: { type: "string" },
          type: { type: "string", enum: ["דירת מגורים", "בית פרטי", "משרדים", "מסחרי", "ציבורי", "אחר"] },
          status: { type: "string", enum: ["הצעת מחיר", "תכנון", "היתרים", "ביצוע", "הושלם", "מבוטל"] },
          budget: { type: "number" },
          progress: { type: "number", minimum: 0, maximum: 100, default: 0 }
        },
        required: ["name", "client_name", "type"]
      },
      "Task.json": {
        name: "Task",
        type: "object",
        properties: {
          title: { type: "string", description: "כותרת המשימה" },
          description: { type: "string" },
          status: { type: "string", enum: ["חדשה", "בתהליך", "הושלמה", "דחויה"] },
          priority: { type: "string", enum: ["גבוהה", "בינונית", "נמוכה"] },
          due_date: { type: "string", format: "date" },
          reminders: { type: "array" }
        },
        required: ["title"]
      },
      "Meeting.json": {
        name: "Meeting",
        type: "object",
        properties: {
          title: { type: "string" },
          meeting_date: { type: "string", format: "date-time" },
          duration_minutes: { type: "number", default: 60 },
          status: { type: "string", enum: ["מתוכננת", "אושרה", "בוצעה", "בוטלה"] },
          reminders: { type: "array" }
        },
        required: ["title", "meeting_date"]
      },
      "Quote.json": {
        name: "Quote",
        type: "object",
        properties: {
          quote_number: { type: "string" },
          client_name: { type: "string" },
          amount: { type: "number" },
          status: { type: "string", enum: ["טיוטה", "נשלחה", "אושרה", "נדחתה"] },
          items: { type: "array" }
        },
        required: ["client_name"]
      },
      "GlobalDataType.json": {
        name: "GlobalDataType",
        type: "object",
        properties: {
          type_key: { type: "string" },
          name: { type: "string" },
          is_professional_type: { type: "boolean" },
          options: { type: "array" }
        },
        required: ["type_key", "name", "options"]
      },
      "AutomationRule.json": {
        name: "AutomationRule",
        type: "object",
        properties: {
          name: { type: "string" },
          trigger: { type: "string" },
          conditions: { type: "object" },
          actions: { type: "array" },
          active: { type: "boolean", default: true }
        },
        required: ["name", "trigger", "actions"]
      },
      "CustomSpreadsheet.json": {
        name: "CustomSpreadsheet",
        type: "object",
        properties: {
          name: { type: "string" },
          columns: { type: "array" },
          rows_data: { type: "array" },
          client_id: { type: "string" }
        },
        required: ["name", "columns", "rows_data"]
      },
      "TimeLog.json": {
        name: "TimeLog",
        type: "object",
        properties: {
          client_name: { type: "string" },
          duration_minutes: { type: "number" },
          log_date: { type: "string", format: "date" },
          description: { type: "string" }
        }
      },
      "UserPreferences.json": {
        name: "UserPreferences",
        type: "object",
        properties: {
          user_email: { type: "string" },
          dashboard_preferences: { type: "object" },
          spreadsheet_columns: { type: "object" }
        },
        required: ["user_email"]
      }
    };

    for (const [filename, schema] of Object.entries(entitySchemas)) {
      entitiesFolder.file(filename, JSON.stringify(schema, null, 2));
    }

    // ============================================
    // 2. Export all entity DATA
    // ============================================
    const dataFolder = zip.folder("data");

    const entitiesToExport = [
      'Client', 'Project', 'Task', 'Meeting', 'Quote', 
      'GlobalDataType', 'AutomationRule', 'CustomSpreadsheet',
      'TimeLog', 'UserPreferences', 'Reminder', 'Notification',
      'AutomationLog', 'TeamMember', 'Invoice', 'Document'
    ];

    for (const entityName of entitiesToExport) {
      try {
        const data = await base44.asServiceRole.entities[entityName].list('-created_date', 10000);
        if (data && data.length > 0) {
          dataFolder.file(`${entityName}.json`, JSON.stringify(data, null, 2));
        }
      } catch (e) {
        // Entity might not exist, skip
        console.log(`Skipping entity ${entityName}: ${e.message}`);
      }
    }

    // ============================================
    // 3. Create PROJECT_INFO.md
    // ============================================
    const projectInfo = `# CRM טננבאום - מידע על הפרויקט

## סקירה כללית
מערכת CRM מתקדמת לניהול לקוחות, פרויקטים, משימות ופגישות.

## טכנולוגיות
- **Frontend:** React 18, Tailwind CSS, Shadcn/UI
- **Backend:** Base44 SDK, Deno Deploy
- **Database:** Base44 Entities
- **אינטגרציות:** Google Calendar, Google Sheets, Twilio (WhatsApp/SMS)

## מבנה תיקיות
\`\`\`
├── entities/          # JSON Schemas של הישויות
├── data/              # נתוני הישויות (JSON)
├── pages/             # עמודי React
├── components/        # קומפוננטות React
├── functions/         # Backend Functions (Deno)
├── agents/            # AI Agents
└── PROJECT_INFO.md    # קובץ זה
\`\`\`

## ישויות עיקריות
- **Client** - לקוחות
- **Project** - פרויקטים
- **Task** - משימות
- **Meeting** - פגישות
- **Quote** - הצעות מחיר
- **GlobalDataType** - סוגי נתונים מותאמים
- **AutomationRule** - כללי אוטומציה
- **CustomSpreadsheet** - טבלאות מותאמות

## תאריך ייצוא
${new Date().toLocaleString('he-IL')}
`;

    zip.file("PROJECT_INFO.md", projectInfo);

    // ============================================
    // 4. Create FUNCTIONS_LIST.md
    // ============================================
    const functionsList = `# רשימת פונקציות Backend

## אוטומציות
- **automationEngine** - מנוע האוטומציות המרכזי
- **handleEntityEvents** - טיפול באירועי ישויות

## תזכורות ותקשורת
- **checkReminders** - בדיקת ושליחת תזכורות
- **sendWhatsApp** - שליחת הודעות WhatsApp (Twilio)
- **sendEmail** - שליחת מיילים
- **sendSMS** - שליחת SMS

## Google אינטגרציות
- **googleCalendarSync** - סנכרון Google Calendar
- **googleSheets** - עבודה עם Google Sheets

## ייצוא ודוחות
- **exportSpreadsheet** - ייצוא טבלאות
- **getDashboardStats** - סטטיסטיקות דשבורד
- **generateDailyReport** - דוח יומי

## ניהול
- **exportAllData** - ייצוא כל הנתונים
- **importBackupData** - ייבוא גיבוי
`;

    zip.file("FUNCTIONS_LIST.md", functionsList);

    // ============================================
    // 5. Generate ZIP
    // ============================================
    const zipBlob = await zip.generateAsync({ 
      type: "uint8array",
      compression: "DEFLATE",
      compressionOptions: { level: 9 }
    });

    const filename = `CRM_Tannenbaum_Export_${new Date().toISOString().split('T')[0]}.zip`;

    return new Response(zipBlob, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': zipBlob.length.toString()
      }
    });

  } catch (error) {
    console.error('Export error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});