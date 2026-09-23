import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const FULL_DOCUMENTATION = {
  _meta: {
    title: "CRM Tannenbaum - תיעוד מערכת מלא",
    version: "2.0",
    generated_at: new Date().toISOString(),
    purpose: "מסמך זה מכיל את כל המידע הנדרש להבנת מבנה הנתונים, הקשרים בין הישויות, ואופן השחזור מגיבוי",
    language: "Hebrew (RTL)",
    ai_instructions: "השתמש במסמך זה כהקשר להבנת מערכת ה-CRM. הישויות מקושרות דרך שדות ID. בשחזור - שמור על סדר התלויות."
  },

  system_overview: {
    description: "מערכת CRM לניהול לקוחות, פרויקטים, משימות ושעות עבודה עבור משרד אדריכלות",
    core_principles: [
      "כל רשומה מכילה id ייחודי, created_date, updated_date ו-created_by",
      "קשרים בין ישויות נשמרים גם ב-ID וגם בשם",
      "טבלאות מותאמות תומכות בעיצוב, מיזוג, תגובות וגרפים",
      "סוגי נתונים מאפשרים הגדרת שלבים וערכים מותאמים"
    ]
  },

  entities: {
    Client: {
      description: "לקוחות המערכת",
      required_fields: ["name"],
      key_fields: ["id", "name", "email", "phone", "stage", "status"]
    },
    TeamMember: {
      description: "חברי צוות/עובדים",
      required_fields: ["full_name"],
      key_fields: ["id", "full_name", "email", "hourly_rate"]
    },
    Project: {
      description: "פרויקטים",
      required_fields: ["name", "client_name", "type"],
      key_fields: ["id", "name", "client_id", "status", "budget"]
    },
    Task: {
      description: "משימות",
      required_fields: ["title"],
      key_fields: ["id", "title", "client_id", "project_id", "status"]
    },
    TimeLog: {
      description: "רישומי זמן",
      required_fields: ["client_name", "log_date", "duration_seconds"],
      key_fields: ["id", "client_id", "project_id", "user_email", "duration_seconds"]
    },
    Meeting: {
      description: "פגישות",
      required_fields: ["title", "meeting_date"],
      key_fields: ["id", "title", "client_id", "meeting_date"]
    },
    CustomSpreadsheet: {
      description: "טבלאות מותאמות",
      required_fields: ["name", "columns", "rows_data"],
      key_fields: ["id", "name", "columns", "rows_data", "cell_styles"]
    }
  },

  relationships: {
    "Project → Client": "project.client_id = client.id",
    "Task → Client": "task.client_id = client.id",
    "Task → Project": "task.project_id = project.id",
    "TimeLog → Client": "timelog.client_id = client.id",
    "TimeLog → Project": "timelog.project_id = project.id",
    "TimeLog → TeamMember": "timelog.user_email = teammember.email"
  },

  restore_order: [
    "1. GlobalDataType",
    "2. TeamMember",
    "3. Client",
    "4. Project",
    "5. Task",
    "6. TimeLog",
    "7. Meeting",
    "8. CustomSpreadsheet"
  ]
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const jsonContent = JSON.stringify(FULL_DOCUMENTATION, null, 2);
    
    return new Response(jsonContent, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="CRM_Documentation_${new Date().toISOString().split('T')[0]}.json"`,
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});