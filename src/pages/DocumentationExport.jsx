import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, FileJson, BookOpen } from "lucide-react";

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
      "כל רשומה מכילה id ייחודי, created_date, updated_date ו-created_by (אימייל היוצר)",
      "קשרים בין ישויות נשמרים גם ב-ID וגם בשם (לנוחות וגמישות)",
      "טבלאות מותאמות (CustomSpreadsheet) תומכות בעיצוב, מיזוג, תגובות וגרפים",
      "סוגי נתונים (GlobalDataType) מאפשרים הגדרת שלבים וערכים מותאמים"
    ],
    built_in_fields: {
      id: "מזהה ייחודי - נוצר אוטומטית",
      created_date: "תאריך יצירה - נוצר אוטומטית",
      updated_date: "תאריך עדכון אחרון - מתעדכן אוטומטית",
      created_by: "אימייל המשתמש שיצר את הרשומה"
    }
  },

  entities: {
    User: {
      description: "משתמשי המערכת (ישות מובנית)",
      note: "ישות מובנית - לא ניתן ליצור ישירות, רק להזמין משתמשים",
      fields: {
        id: { type: "string", description: "מזהה ייחודי" },
        email: { type: "string", description: "כתובת אימייל (מפתח ראשי)" },
        full_name: { type: "string", description: "שם מלא" },
        role: { type: "enum", values: ["admin", "user"], description: "תפקיד במערכת" }
      },
      relations_outgoing: ["Task.assigned_to", "TimeLog.created_by", "Meeting.participants"]
    },

    Client: {
      description: "לקוחות המערכת - ישות מרכזית שממנה מתחילה כל הפעילות העסקית",
      required_fields: ["name"],
      fields: {
        id: { type: "string", description: "מזהה ייחודי" },
        name: { type: "string", required: true, description: "שם הלקוח" },
        name_clean: { type: "string", description: "שם הלקוח (נקי מתווים מיוחדים)" },
        email: { type: "string", format: "email", description: "כתובת אימייל" },
        phone: { type: "string", description: "טלפון ראשי" },
        phone_secondary: { type: "string", description: "טלפון נוסף" },
        whatsapp: { type: "string", description: "מספר וואטסאפ" },
        address: { type: "string", description: "כתובת" },
        company: { type: "string", description: "שם החברה" },
        position: { type: "string", description: "תפקיד איש הקשר" },
        website: { type: "string", description: "אתר אינטרנט" },
        linkedin: { type: "string", description: "קישור לינקדאין" },
        stage: { type: "string", description: "שלב בתהליך - מקושר ל-GlobalDataType.stages" },
        status: { type: "enum", values: ["פוטנציאלי", "פעיל", "לא פעיל"], default: "פוטנציאלי", description: "סטטוס הלקוח" },
        source: { type: "enum", values: ["הפניה", "אתר אינטרנט", "מדיה חברתית", "פרסומת", "אחר"], description: "מקור ההגעה" },
        budget_range: { type: "enum", values: ["עד 500K", "500K-1M", "1M-2M", "2M-5M", "מעל 5M"], description: "טווח תקציב" },
        preferred_contact: { type: "enum", values: ["טלפון", "אימייל", "וואטסאפ"], description: "אמצעי התקשרות מועדף" },
        tags: { type: "array", items: "string", description: "תגיות לסיווג" },
        notes: { type: "string", description: "הערות חופשיות" },
        professionals: { type: "object", description: "בעלי מקצוע משויכים - מפתח: type_key מ-GlobalDataType, ערך: הערך שנבחר" },
        custom_data: { type: "object", description: "שדות מותאמים אישית (key:value גמיש)" }
      },
      relations_incoming: [
        "Project.client_id",
        "Task.client_id",
        "TimeLog.client_id",
        "Meeting.client_id",
        "Quote.client_id",
        "Invoice.client_id",
        "CustomSpreadsheet.client_id"
      ]
    },

    TeamMember: {
      description: "חברי צוות / עובדים / פרילנסרים - כולל פרטי שכר ובנק לדוחות משכורות",
      required_fields: ["full_name"],
      important_note: "שדה email הוא המפתח לחיבור עם TimeLog.user_email",
      fields: {
        id: { type: "string", description: "מזהה ייחודי" },
        full_name: { type: "string", required: true, description: "שם מלא" },
        email: { type: "string", format: "email", description: "אימייל - מפתח לחיבור ל-TimeLog" },
        role: { type: "string", description: "תפקיד בצוות" },
        capacity_hours_per_week: { type: "number", default: 40, description: "קיבולת שעות שבועית" },
        hourly_rate: { type: "number", default: 0, description: "שכר שעתי (₪)" },
        vat_percentage: { type: "number", default: 17, description: "אחוז מע\"מ" },
        bank_details: {
          type: "object",
          description: "פרטי בנק",
          properties: {
            bank_name: "שם הבנק",
            branch: "מספר סניף",
            account_number: "מספר חשבון"
          }
        },
        active: { type: "boolean", default: true, description: "האם פעיל" }
      },
      relations_incoming: ["TimeLog.user_email"]
    },

    Project: {
      description: "פרויקטים - שייכים ללקוח, כוללים תקציב, אבני דרך ותזרים מזומנים",
      required_fields: ["name", "client_name", "type"],
      fields: {
        id: { type: "string", description: "מזהה ייחודי" },
        name: { type: "string", required: true, description: "שם הפרויקט" },
        client_id: { type: "string", relation: "Client.id", description: "מזהה הלקוח" },
        client_name: { type: "string", required: true, description: "שם הלקוח (לנוחות)" },
        type: { type: "enum", required: true, values: ["דירת מגורים", "בית פרטי", "משרדים", "מסחרי", "ציבורי", "אחר"], description: "סוג הפרויקט" },
        status: { type: "enum", values: ["הצעת מחיר", "תכנון", "היתרים", "ביצוע", "הושלם", "מבוטל"], default: "הצעת מחיר", description: "סטטוס" },
        priority: { type: "enum", values: ["גבוהה", "בינונית", "נמוכה"], default: "בינונית", description: "עדיפות" },
        budget: { type: "number", description: "תקציב הפרויקט" },
        estimated_budget: { type: "number", description: "תקציב משוער" },
        start_date: { type: "date", description: "תאריך התחלה" },
        end_date: { type: "date", description: "תאריך סיום משוער" },
        location: { type: "string", description: "כתובת הפרויקט" },
        area: { type: "number", description: "שטח במ\"ר" },
        description: { type: "string", description: "תיאור הפרויקט" },
        progress: { type: "number", min: 0, max: 100, default: 0, description: "אחוז התקדמות" },
        images: { type: "array", items: "string", description: "URLs של תמונות" },
        files: { type: "array", items: "string", description: "URLs של קבצים" },
        milestones: {
          type: "array",
          description: "אבני דרך",
          item_structure: {
            id: "מזהה",
            name: "שם אבן הדרך",
            due_date: "תאריך יעד",
            completed: "האם הושלם (boolean)",
            completed_date: "תאריך השלמה",
            description: "תיאור",
            budget_allocation: "הקצאת תקציב"
          }
        },
        budget_items: {
          type: "array",
          description: "פריטי תקציב מפורטים",
          item_structure: {
            id: "מזהה",
            category: "קטגוריה",
            description: "תיאור",
            planned_amount: "סכום מתוכנן",
            actual_amount: "סכום בפועל",
            paid_amount: "סכום ששולם",
            status: "ממתין/אושר/שולם/בוטל",
            vendor: "ספק",
            notes: "הערות"
          }
        },
        cashflow: {
          type: "array",
          description: "תזרים מזומנים",
          item_structure: {
            id: "מזהה",
            type: "income/expense",
            description: "תיאור",
            amount: "סכום",
            due_date: "תאריך צפוי",
            actual_date: "תאריך בפועל",
            status: "צפוי/התקבל/שולם/באיחור",
            milestone_id: "קישור לאבן דרך"
          }
        },
        total_expenses: { type: "number", description: "סה\"כ הוצאות בפועל" },
        total_income: { type: "number", description: "סה\"כ הכנסות בפועל" }
      },
      relations_outgoing: ["Client.id via client_id"],
      relations_incoming: ["Task.project_id", "SubTask.project_id", "TimeLog.project_id", "Meeting.project_id"]
    },

    Task: {
      description: "משימות - יכולות להיות קשורות ללקוח, לפרויקט או לשניהם",
      required_fields: ["title"],
      fields: {
        id: { type: "string", description: "מזהה ייחודי" },
        title: { type: "string", required: true, description: "כותרת המשימה" },
        description: { type: "string", description: "תיאור" },
        client_id: { type: "string", relation: "Client.id", description: "מזהה לקוח" },
        client_name: { type: "string", description: "שם הלקוח" },
        project_id: { type: "string", relation: "Project.id", description: "מזהה פרויקט" },
        project_name: { type: "string", description: "שם הפרויקט" },
        assigned_to: { type: "string", relation: "User.email", description: "אחראי על המשימה (אימייל)" },
        status: { type: "enum", values: ["חדשה", "בתהליך", "הושלמה", "דחויה"], default: "חדשה", description: "סטטוס" },
        priority: { type: "enum", values: ["קריטית", "גבוהה", "בינונית", "נמוכה"], default: "בינונית", description: "עדיפות" },
        category: { type: "enum", values: ["פגישה", "תכנון", "היתרים", "קניות", "מעקב", "אחר"], description: "קטגוריה" },
        due_date: { type: "date", description: "תאריך יעד" },
        due_date_type: { type: "enum", values: ["fixed", "flexible"], default: "fixed", description: "סוג תאריך יעד" },
        flexible_due_description: { type: "string", description: "תיאור תאריך גמיש (לדוג': תוך 3 ימים)" },
        start_date: { type: "date", description: "תאריך התחלה (לגאנט)" },
        end_date: { type: "date", description: "תאריך סיום (לגאנט)" },
        estimated_hours: { type: "number", default: 0, description: "שעות מוערכות" },
        tags: { type: "array", items: "string", description: "תגיות" },
        auto_reminder_enabled: { type: "boolean", default: true, description: "תזכורת אוטומטית" },
        auto_reminder_days_before: { type: "number", default: 1, description: "ימים לפני לתזכורת" },
        reminders: {
          type: "array",
          description: "רשימת תזכורות",
          item_structure: {
            reminder_at: "תאריך ושעה",
            minutes_before: "דקות לפני",
            notify_popup: "התראה באתר",
            notify_email: "שליחת מייל",
            notify_whatsapp: "שליחת וואטסאפ",
            notify_sms: "שליחת SMS",
            sent: "האם נשלח"
          }
        },
        recurrence: {
          type: "object",
          description: "הגדרות חזרתיות",
          properties: {
            enabled: "מופעל",
            frequency: "daily/weekly/monthly/yearly",
            interval: "מרווח",
            days_of_week: "ימים בשבוע (0=ראשון)",
            end_date: "תאריך סיום"
          }
        },
        email_recipients: { type: "array", items: "string", description: "נמעני מייל" },
        whatsapp_recipients: { type: "array", items: "string", description: "נמעני וואטסאפ" },
        sms_recipients: { type: "array", items: "string", description: "נמעני SMS" }
      },
      relations_outgoing: ["Client.id via client_id", "Project.id via project_id", "User.email via assigned_to"],
      relations_incoming: ["TimeLog.task_id", "SubTask.parent_task_id"]
    },

    SubTask: {
      description: "תת-משימות בפרויקט - משימות מפורטות יותר",
      required_fields: ["project_id", "title"],
      fields: {
        id: { type: "string", description: "מזהה ייחודי" },
        project_id: { type: "string", required: true, relation: "Project.id", description: "מזהה פרויקט" },
        project_name: { type: "string", description: "שם הפרויקט" },
        parent_task_id: { type: "string", relation: "Task.id", description: "מזהה משימת אב (אופציונלי)" },
        title: { type: "string", required: true, description: "כותרת" },
        description: { type: "string", description: "תיאור" },
        assigned_to: { type: "array", items: "string", description: "רשימת אימיילים של משויכים" },
        status: { type: "enum", values: ["לא התחיל", "בתהליך", "הושלם", "ממתין", "חסום"], default: "לא התחיל", description: "סטטוס" },
        priority: { type: "enum", values: ["נמוכה", "בינונית", "גבוהה", "דחופה", "קריטית"], default: "בינונית", description: "עדיפות" },
        due_date: { type: "date", description: "תאריך יעד" },
        start_date: { type: "date", description: "תאריך התחלה" },
        end_date: { type: "date", description: "תאריך סיום" },
        estimated_hours: { type: "number", default: 0, description: "שעות מוערכות" },
        actual_hours: { type: "number", default: 0, description: "שעות בפועל" },
        progress: { type: "number", min: 0, max: 100, default: 0, description: "אחוז התקדמות" },
        is_critical: { type: "boolean", default: false, description: "משימה קריטית" },
        dependencies: { type: "array", items: "string", description: "רשימת מזהי משימות תלויות" },
        subtasks: {
          type: "array",
          description: "תת-משימות פנימיות (צ'קליסט)",
          item_structure: {
            id: "מזהה",
            title: "כותרת",
            completed: "הושלם",
            assigned_to: "אחראי",
            due_date: "תאריך יעד"
          }
        },
        tags: { type: "array", items: "string", description: "תגיות" },
        notes: { type: "string", description: "הערות" }
      },
      relations_outgoing: ["Project.id via project_id", "Task.id via parent_task_id"]
    },

    TimeLog: {
      description: "לוגי זמן / רישום שעות עבודה - משמש לחישוב משכורות ודוחות",
      required_fields: ["client_name", "log_date", "duration_seconds"],
      important_note: "לזיהוי העובד: קודם בודקים user_email, אם ריק - משתמשים ב-created_by",
      fields: {
        id: { type: "string", description: "מזהה ייחודי" },
        user_email: { type: "string", relation: "TeamMember.email", description: "⭐ אימייל העובד שביצע את העבודה" },
        user_name: { type: "string", description: "שם העובד (לנוחות)" },
        client_id: { type: "string", relation: "Client.id", description: "מזהה הלקוח" },
        client_name: { type: "string", required: true, description: "שם הלקוח" },
        project_id: { type: "string", relation: "Project.id", description: "מזהה פרויקט (אופציונלי)" },
        project_name: { type: "string", description: "שם הפרויקט" },
        task_id: { type: "string", relation: "Task.id", description: "מזהה משימה (אופציונלי)" },
        task_title: { type: "string", description: "כותרת המשימה" },
        log_date: { type: "date", required: true, description: "תאריך העבודה" },
        duration_seconds: { type: "number", required: true, description: "משך הפעילות בשניות" },
        title: { type: "string", description: "כותרת/תיאור העבודה" },
        notes: { type: "string", description: "הערות" },
        billable: { type: "boolean", default: true, description: "האם לחייב על השעות" },
        hourly_rate: { type: "number", description: "שכר שעתי מותאם (אם שונה מברירת מחדל של העובד)" }
      },
      relations_outgoing: [
        "TeamMember.email via user_email",
        "User.email via created_by (fallback)",
        "Client.id via client_id",
        "Project.id via project_id",
        "Task.id via task_id"
      ],
      salary_calculation: {
        description: "חישוב שכר מלוג זמן",
        steps: [
          "1. מצא את העובד: employeeEmail = user_email || created_by",
          "2. חפש ב-TeamMember לפי email",
          "3. חשב שעות: hours = duration_seconds / 3600",
          "4. קבע תעריף: rate = timeLog.hourly_rate || teamMember.hourly_rate || 0",
          "5. חשב שכר: salary = hours * rate"
        ],
        code_example: `const employeeEmail = timeLog.user_email || timeLog.created_by;
const teamMember = teamMembers.find(tm => tm.email === employeeEmail);
const hours = timeLog.duration_seconds / 3600;
const rate = timeLog.hourly_rate || teamMember?.hourly_rate || 0;
const salary = hours * rate;`
      }
    },

    Meeting: {
      description: "פגישות - כולל תזכורות, חזרתיות וסנכרון עם Google Calendar",
      required_fields: ["title", "meeting_date"],
      fields: {
        id: { type: "string", description: "מזהה ייחודי" },
        title: { type: "string", required: true, description: "כותרת הפגישה" },
        description: { type: "string", description: "תיאור" },
        client_id: { type: "string", relation: "Client.id", description: "מזהה לקוח" },
        client_name: { type: "string", description: "שם הלקוח" },
        project_id: { type: "string", relation: "Project.id", description: "מזהה פרויקט" },
        project_name: { type: "string", description: "שם הפרויקט" },
        meeting_date: { type: "datetime", required: true, description: "תאריך ושעה" },
        duration_minutes: { type: "number", default: 60, description: "משך בדקות" },
        location: { type: "string", description: "מיקום" },
        meeting_type: { type: "enum", values: ["פגישת היכרות", "פגישת תכנון", "פגישת מעקב", "פגישת סיכום", "פגישת אתר", "שיחת טלפון", "Zoom", "אחר"], default: "פגישת תכנון", description: "סוג הפגישה" },
        status: { type: "enum", values: ["מתוכננת", "אושרה", "בוצעה", "בוטלה", "נדחתה"], default: "מתוכננת", description: "סטטוס" },
        color: { type: "enum", values: ["blue", "green", "red", "yellow", "purple", "pink", "orange"], default: "blue", description: "צבע בלוח שנה" },
        participants: { type: "array", items: "string", description: "רשימת משתתפים" },
        agenda: {
          type: "array",
          description: "סדר יום",
          item_structure: { item: "נושא", completed: "הושלם" }
        },
        reminders: {
          type: "array",
          description: "תזכורות",
          item_structure: {
            minutes_before: "דקות לפני",
            notify_popup: "התראה באתר",
            notify_audio: "התראה קולית",
            notify_email: "מייל",
            notify_whatsapp: "וואטסאפ",
            notify_sms: "SMS",
            audio_ringtone: "סוג צליל",
            sent: "נשלח"
          }
        },
        recurrence: {
          type: "object",
          description: "חזרתיות",
          properties: {
            enabled: "מופעל",
            frequency: "daily/weekly/monthly/yearly",
            interval: "מרווח",
            days_of_week: "ימים בשבוע",
            end_date: "תאריך סיום",
            parent_meeting_id: "מזהה פגישת מקור"
          }
        },
        notes: { type: "string", description: "הערות מהפגישה" },
        attachments: { type: "array", items: "string", description: "קבצים מצורפים" },
        google_calendar_event_id: { type: "string", description: "מזהה אירוע ב-Google Calendar (לסנכרון)" }
      },
      relations_outgoing: ["Client.id via client_id", "Project.id via project_id"]
    },

    Quote: {
      description: "הצעות מחיר ללקוחות",
      required_fields: ["client_name", "project_name", "amount"],
      fields: {
        id: { type: "string", description: "מזהה ייחודי" },
        quote_number: { type: "string", description: "מספר הצעת מחיר" },
        client_id: { type: "string", relation: "Client.id", description: "מזהה לקוח" },
        client_name: { type: "string", required: true, description: "שם הלקוח" },
        project_name: { type: "string", required: true, description: "שם הפרויקט" },
        amount: { type: "number", required: true, description: "סכום ההצעה" },
        status: { type: "enum", values: ["נשלחה", "בהמתנה", "אושרה", "נדחתה", "פגה תוקף"], default: "נשלחה", description: "סטטוס" },
        valid_until: { type: "date", description: "תוקף עד" },
        description: { type: "string", description: "תיאור השירותים" },
        items: {
          type: "array",
          description: "פריטי ההצעה",
          item_structure: {
            description: "תיאור הפריט",
            quantity: "כמות",
            unit_price: "מחיר ליחידה",
            total: "סה\"כ"
          }
        },
        notes: { type: "string", description: "הערות" }
      },
      relations_outgoing: ["Client.id via client_id"]
    },

    Invoice: {
      description: "חשבוניות",
      required_fields: ["client_name", "amount", "status"],
      fields: {
        id: { type: "string", description: "מזהה ייחודי" },
        number: { type: "string", description: "מספר חשבונית" },
        external_id: { type: "string", description: "מזהה במערכת חיצונית" },
        client_id: { type: "string", relation: "Client.id", description: "מזהה לקוח" },
        client_name: { type: "string", required: true, description: "שם הלקוח" },
        project_id: { type: "string", relation: "Project.id", description: "מזהה פרויקט" },
        project_name: { type: "string", description: "שם הפרויקט" },
        currency: { type: "enum", values: ["ILS", "USD", "EUR"], default: "ILS", description: "מטבע" },
        amount: { type: "number", required: true, description: "סכום" },
        status: { type: "enum", required: true, values: ["draft", "sent", "viewed", "paid", "overdue", "canceled"], default: "draft", description: "סטטוס" },
        issue_date: { type: "date", description: "תאריך הפקה" },
        due_date: { type: "date", description: "תאריך פירעון" },
        notes: { type: "string", description: "הערות" },
        items: {
          type: "array",
          description: "שורות חשבונית",
          item_structure: {
            description: "תיאור",
            quantity: "כמות",
            unit_price: "מחיר ליחידה",
            total: "סה\"כ"
          }
        }
      },
      relations_outgoing: ["Client.id via client_id", "Project.id via project_id"]
    },

    GlobalDataType: {
      description: "סוגי נתונים גלובליים - מגדירים שלבים, ערכים ואפשרויות מותאמות",
      required_fields: ["type_key", "name", "options"],
      fields: {
        id: { type: "string", description: "מזהה ייחודי" },
        type_key: { type: "enum", values: ["stages", "taba", "transfer_rights", "purchase_rights", "custom_*"], description: "מפתח ייחודי לסוג הנתונים" },
        name: { type: "string", required: true, description: "שם תצוגה" },
        options: {
          type: "array",
          required: true,
          description: "רשימת אפשרויות/קטגוריות",
          item_structure: {
            label: "תווית תצוגה",
            value: "ערך טכני",
            color: "צבע (hex)",
            glow: "אפקט זוהר",
            fields: "שדות מותאמים לקטגוריה",
            validation: "כללי וולידציה",
            auto_color: "כללי צביעה אוטומטית",
            children: "תת-אפשרויות"
          }
        }
      },
      usage: [
        "Client.stage - שלב הלקוח בתהליך",
        "Client.professionals[type_key] - בעלי מקצוע לפי סוג",
        "CustomSpreadsheet.columns[type=stage/taba/custom_*] - עמודות מסוג נתונים"
      ]
    },

    CustomSpreadsheet: {
      description: "טבלאות מותאמות אישית עם יכולות מתקדמות",
      required_fields: ["name", "columns", "rows_data"],
      fields: {
        id: { type: "string", description: "מזהה ייחודי" },
        name: { type: "string", required: true, description: "שם הטבלה" },
        description: { type: "string", description: "תיאור" },
        client_id: { type: "string", relation: "Client.id", description: "שיוך ללקוח (אופציונלי)" },
        client_name: { type: "string", description: "שם הלקוח" },
        
        columns: {
          type: "array",
          required: true,
          description: "הגדרות עמודות הטבלה",
          item_structure: {
            key: "מזהה ייחודי לעמודה (חובה)",
            title: "כותרת העמודה (חובה)",
            type: "סוג: text/number/date/client/stage/checkmark/mixed_check/select/taba/transfer_rights/purchase_rights/custom_*",
            width: "רוחב (לדוג': 150px)",
            visible: "נראות (boolean)",
            collapsed: "מכווצת (boolean)",
            required: "חובה (boolean)"
          }
        },
        
        rows_data: {
          type: "array",
          required: true,
          description: "נתוני השורות - כל שורה חייבת id ייחודי",
          item_structure: {
            id: "מזהה שורה ייחודי (חובה!)",
            "[column_key]": "ערך לפי מפתח העמודה"
          }
        },
        
        cell_styles: {
          type: "object",
          description: "עיצוב תאים - מפתח: rowId_colKey",
          example: {
            "row_123_col_456": {
              backgroundColor: "#fee2e2",
              color: "#991b1b",
              fontWeight: "bold",
              opacity: 100
            }
          }
        },
        
        cell_notes: {
          type: "object",
          description: "הערות צהובות על תאים - מפתח: rowId_colKey",
          example: { "row_123_col_456": "טקסט ההערה" }
        },
        
        cell_metadata: {
          type: "object",
          description: "מטא-דאטה לתאים (שדות מותאמים)"
        },
        
        merged_cells: {
          type: "object",
          description: "תאים ממוזגים",
          example: {
            "merge_123": {
              cells: ["row_1_col_a", "row_1_col_b", "row_2_col_a", "row_2_col_b"],
              master: "row_1_col_a",
              rowspan: 2,
              colspan: 2
            }
          }
        },
        
        merged_headers: {
          type: "object",
          description: "כותרות עליונות ממוזגות",
          example: {
            "header_merge_1": {
              columns: ["col_a", "col_b"],
              master: "col_a",
              colspan: 2,
              title: "כותרת משותפת"
            }
          }
        },
        
        header_styles: {
          type: "object",
          description: "עיצוב כותרות - מפתח: colKey",
          example: { "col_123": { backgroundColor: "#3b82f6", color: "#ffffff" } }
        },
        
        sub_headers: {
          type: "object",
          description: "כותרות משנה",
          example: { "col_123": { title: "כותרת משנה", position: "below" } }
        },
        
        show_sub_headers: { type: "boolean", default: false, description: "הצג שורת כותרות משנה" },
        sub_header_position: { type: "enum", values: ["above", "below"], default: "above", description: "מיקום כותרת משנה" },
        
        row_heights: { type: "object", description: "גבהים מותאמים לשורות" },
        
        freeze_settings: {
          type: "object",
          description: "הקפאת שורות ועמודות",
          properties: {
            freeze_rows: "מספר שורות להקפאה מלמעלה",
            freeze_columns: "מספר עמודות להקפאה מימין"
          }
        },
        
        theme_settings: {
          type: "object",
          description: "הגדרות עיצוב כללי",
          properties: {
            palette: "פלטת צבעים",
            borderStyle: "סגנון גבולות (thin/medium/thick/none)",
            headerFont: "פונט כותרות",
            cellFont: "פונט תאים",
            fontSize: "גודל גופן (small/medium/large)",
            density: "צפיפות (compact/comfortable/spacious)",
            borderRadius: "עיגול פינות",
            shadow: "צל",
            outerBorderColor: "צבע גבול חיצוני",
            outerBorderSize: "עובי גבול חיצוני"
          }
        },
        
        charts: {
          type: "array",
          description: "גרפים וויזואליזציות",
          item_structure: {
            id: "מזהה",
            name: "שם הגרף",
            type: "bar/line/pie/area",
            config: "הגדרות הגרף",
            data_source: "מקור הנתונים"
          }
        },
        
        saved_views: {
          type: "array",
          description: "תצוגות שמורות",
          item_structure: {
            id: "מזהה",
            name: "שם התצוגה",
            isDefault: "תצוגת ברירת מחדל",
            columns: "הגדרות עמודות",
            created_at: "תאריך יצירה"
          }
        },
        
        active_view_id: { type: "string", description: "מזהה התצוגה הפעילה" },
        
        validation_rules: {
          type: "array",
          description: "כללי וולידציה לתאים"
        },
        
        conditional_formats: {
          type: "array",
          description: "כללי עיצוב מותנה"
        },
        
        google_sheet_id: { type: "string", description: "מזהה Google Sheet מקושר" },
        google_sheet_name: { type: "string", description: "שם הגיליון (Tab)" },
        sync_config: {
          type: "object",
          description: "הגדרות סנכרון",
          properties: {
            auto_sync_interval: "none/hourly/daily/on_change",
            sync_mode: "overwrite/append/update_existing",
            sync_direction: "export_only/import_on_load/two_way",
            last_synced_at: "זמן סנכרון אחרון"
          }
        }
      },
      relations_outgoing: ["Client.id via client_id"],
      relations_incoming: ["SheetComment.spreadsheet_id", "Reminder.spreadsheet_id"]
    },

    Reminder: {
      description: "תזכורות - יכולות להתייחס לכל סוג ישות",
      required_fields: ["target_type", "target_id", "reminder_date", "created_by_email"],
      fields: {
        id: { type: "string", description: "מזהה ייחודי" },
        target_type: { type: "enum", values: ["cell", "row", "client", "task", "project", "meeting"], description: "סוג היעד" },
        target_id: { type: "string", description: "מזהה היעד" },
        target_sub_id: { type: "string", description: "מזהה משני (לדוג': rowId_colKey לתא)" },
        target_name: { type: "string", description: "שם היעד לתצוגה" },
        reminder_date: { type: "datetime", required: true, description: "מועד התזכורת" },
        created_by_email: { type: "string", required: true, description: "יוצר התזכורת" },
        additional_emails: { type: "array", items: "string", description: "נמענים נוספים" },
        message: { type: "string", description: "הודעת התזכורת" },
        status: { type: "enum", values: ["pending", "sent", "cancelled"], default: "pending", description: "סטטוס" },
        notify_whatsapp: { type: "boolean", default: false },
        notify_email: { type: "boolean", default: false },
        notify_sms: { type: "boolean", default: false },
        spreadsheet_id: { type: "string", description: "קישור לטבלה (אם רלוונטי)" },
        recurrence: { type: "object", description: "הגדרות חזרתיות" }
      }
    }
  },

  relationships_map: {
    description: "מפת הקשרים המלאה בין כל הישויות",
    diagram: `
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CRM DATA RELATIONSHIPS                            │
└─────────────────────────────────────────────────────────────────────────────┘

                              ┌──────────────┐
                              │     User     │
                              │  (built-in)  │
                              └──────┬───────┘
                                     │ email
                     ┌───────────────┼───────────────┐
                     │               │               │
                     ▼               ▼               ▼
              ┌────────────┐  ┌────────────┐  ┌────────────┐
              │ TeamMember │  │   Task     │  │  TimeLog   │
              │            │  │assigned_to │  │ user_email │
              │   email ◄──┼──┼────────────┼──┤ created_by │
              │hourly_rate │  │            │  │            │
              └────────────┘  └─────┬──────┘  └─────┬──────┘
                                    │               │
                                    │ project_id    │ project_id
                                    │ client_id     │ client_id
                                    │               │ task_id
                                    ▼               ▼
     ┌──────────┐                    ┌──────────┐
     │  Client  │◄───── client_id ───│ Project  │
     │    id    │                    │    id    │
     │   name   │                    │   name   │
     │   stage  │                    │  budget  │
     └────┬─────┘                    └────┬─────┘
          │                               │
          │ client_id                     │ project_id
          ▼                               ▼
   ┌──────────────┐               ┌──────────────┐
   │   Meeting    │               │   SubTask    │
   │   Quote      │               └──────────────┘
   │   Invoice    │
   │CustomSpread  │
   └──────────────┘
`,
    connections: [
      { from: "Project.client_id", to: "Client.id", description: "פרויקט שייך ללקוח" },
      { from: "Task.client_id", to: "Client.id", description: "משימה ללקוח (ישיר)" },
      { from: "Task.project_id", to: "Project.id", description: "משימה בפרויקט" },
      { from: "Task.assigned_to", to: "User.email", description: "אחראי על המשימה" },
      { from: "TimeLog.user_email", to: "TeamMember.email", description: "⭐ עובד שביצע" },
      { from: "TimeLog.created_by", to: "User.email", description: "fallback לזיהוי עובד" },
      { from: "TimeLog.client_id", to: "Client.id", description: "לקוח עליו עבדו" },
      { from: "TimeLog.project_id", to: "Project.id", description: "פרויקט (אופציונלי)" },
      { from: "TimeLog.task_id", to: "Task.id", description: "משימה (אופציונלי)" },
      { from: "Meeting.client_id", to: "Client.id", description: "לקוח בפגישה" },
      { from: "Meeting.project_id", to: "Project.id", description: "פרויקט (אופציונלי)" },
      { from: "Quote.client_id", to: "Client.id", description: "הצעת מחיר ללקוח" },
      { from: "Invoice.client_id", to: "Client.id", description: "חשבונית ללקוח" },
      { from: "Invoice.project_id", to: "Project.id", description: "חשבונית לפרויקט" },
      { from: "CustomSpreadsheet.client_id", to: "Client.id", description: "טבלה ללקוח" },
      { from: "SubTask.project_id", to: "Project.id", description: "תת-משימה בפרויקט" },
      { from: "SubTask.parent_task_id", to: "Task.id", description: "תת-משימה של משימה" },
      { from: "Client.stage", to: "GlobalDataType.stages", description: "שלב הלקוח" },
      { from: "CustomSpreadsheet.columns[type]", to: "GlobalDataType", description: "עמודות מסוג נתונים" }
    ]
  },

  restore_instructions: {
    order: [
      { step: 1, entity: "GlobalDataType", reason: "סוגי נתונים (שלבים, טאבה) - אין תלויות" },
      { step: 2, entity: "TeamMember", reason: "עובדים - אין תלויות, נדרש ל-TimeLog" },
      { step: 3, entity: "Client", reason: "לקוחות - בסיס לכל הישויות" },
      { step: 4, entity: "Project", reason: "פרויקטים - תלוי ב-Client" },
      { step: 5, entity: "Task", reason: "משימות - תלוי ב-Client, Project" },
      { step: 6, entity: "SubTask", reason: "תת-משימות - תלוי ב-Project, Task" },
      { step: 7, entity: "TimeLog", reason: "לוגי זמן - תלוי ב-Client, Project, Task, TeamMember" },
      { step: 8, entity: "Meeting", reason: "פגישות - תלוי ב-Client, Project" },
      { step: 9, entity: "Quote", reason: "הצעות מחיר - תלוי ב-Client" },
      { step: 10, entity: "Invoice", reason: "חשבוניות - תלוי ב-Client, Project" },
      { step: 11, entity: "CustomSpreadsheet", reason: "טבלאות - תלוי ב-Client, GlobalDataType" },
      { step: 12, entity: "Reminder", reason: "תזכורות - יכולות להתייחס לכל ישות" },
      { step: 13, entity: "SheetComment", reason: "תגובות - תלוי ב-CustomSpreadsheet" }
    ],
    
    important_notes: [
      "גבה את הנתונים הנוכחיים לפני שחזור",
      "ודא שמבנה קובץ הגיבוי תקין (JSON valid)",
      "בדוק שכל ה-IDs ייחודיים",
      "לא לשחזר שדות מערכת: created_date, updated_date",
      "Google Sheets sync לא משוחזר אוטומטית - יש לחבר מחדש"
    ],
    
    common_issues: [
      {
        problem: "TimeLog ללא עובד משויך",
        solution: "השתמש ב-created_by כ-fallback או קבע עובד ברירת מחדל"
      },
      {
        problem: "CustomSpreadsheet ללא rows_data",
        solution: "צור טבלה ריקה או דלג (טבלת Template)"
      },
      {
        problem: "קישורים שבורים (client_id לא קיים)",
        solution: "השתמש ב-client_name כ-fallback או צור לקוח חדש"
      },
      {
        problem: "שורות ללא ID בטבלה",
        solution: "צור ID אוטומטי: row_restored_[timestamp]_[index]"
      }
    ],
    
    code_examples: {
      basic_restore: `// שחזור בסיסי
const backup = JSON.parse(backupFileContent);

for (const entityName of restoreOrder) {
  const records = backup.data[entityName];
  if (!records) continue;
  
  for (const record of records) {
    const { created_date, updated_date, ...cleanData } = record;
    await base44.entities[entityName].create(cleanData);
  }
}`,
      
      spreadsheet_restore: `// שחזור טבלה מותאמת
const sheet = backup.data.CustomSpreadsheet[0];

// וידוא שכל שורה מכילה ID
sheet.rows_data = sheet.rows_data.map((r, i) => ({
  ...r,
  id: r.id || \`row_restored_\${Date.now()}_\${i}\`
}));

// וידוא עמודות תקינות
sheet.columns = sheet.columns.map((col, i) => ({
  ...col,
  key: col.key || \`col_restored_\${i}\`,
  title: col.title || \`Column \${i + 1}\`
}));

await base44.entities.CustomSpreadsheet.create(sheet);`,

      find_employee: `// מציאת עובד מלוג זמן
const employeeEmail = timeLog.user_email || timeLog.created_by;
const teamMember = teamMembers.find(tm => tm.email === employeeEmail);

// חישוב שכר
const hours = timeLog.duration_seconds / 3600;
const rate = timeLog.hourly_rate || teamMember?.hourly_rate || 0;
const salary = hours * rate;`
    }
  }
};

export default function DocumentationExportPage() {
  const downloadJSON = () => {
    const dataStr = JSON.stringify(FULL_DOCUMENTATION, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CRM_Documentation_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen p-6" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <BookOpen className="w-8 h-8 text-amber-600" />
              ייצוא תיעוד למנוע AI
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-slate-600">
              קובץ JSON מלא המכיל את כל המידע על מבנה המערכת, הישויות, הקשרים ביניהן והנחיות לשחזור.
              ניתן להעלות את הקובץ הזה לכל מנוע AI (ChatGPT, Claude, Gemini) כהקשר.
            </p>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h3 className="font-bold text-amber-900 mb-2">הקובץ מכיל:</h3>
              <ul className="space-y-1 text-amber-800 text-sm">
                <li>✓ תיאור כל הישויות (Client, Project, Task, TimeLog...)</li>
                <li>✓ פירוט כל השדות עם סוגים ותיאורים</li>
                <li>✓ מפת הקשרים המלאה בין הישויות</li>
                <li>✓ מבנה CustomSpreadsheet המורחב</li>
                <li>✓ הנחיות שחזור מפורטות עם דוגמאות קוד</li>
                <li>✓ פתרונות לבעיות נפוצות</li>
              </ul>
            </div>

            <Button onClick={downloadJSON} size="lg" className="w-full gap-2">
              <Download className="w-5 h-5" />
              הורד קובץ JSON לתיעוד AI
            </Button>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-bold text-blue-900 mb-2">שימוש:</h3>
              <ol className="space-y-1 text-blue-800 text-sm list-decimal pr-4">
                <li>לחץ על כפתור ההורדה</li>
                <li>העלה את הקובץ ל-ChatGPT / Claude / Gemini</li>
                <li>שאל שאלות על המערכת, בקש עזרה בשחזור, או בקש הסברים</li>
              </ol>
            </div>

            <Card className="bg-slate-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileJson className="w-4 h-4" />
                  תצוגה מקדימה
                </CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="bg-slate-900 text-green-400 p-4 rounded-lg text-xs overflow-x-auto max-h-96" dir="ltr">
                  {JSON.stringify(FULL_DOCUMENTATION._meta, null, 2)}
                  {"\n\n// ... המשך התיעוד המלא בקובץ ..."}
                </pre>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}