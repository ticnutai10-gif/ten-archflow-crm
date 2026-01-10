import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Book, Search, Code, Database, Zap, Users, Calendar, 
  CheckSquare, FileText, Settings, Mail, MessageSquare,
  Clock, BarChart3, Layers, Shield, ChevronDown, ChevronRight,
  ExternalLink, Copy, Briefcase, Calculator, Bell, Bot
} from "lucide-react";
import { toast } from "sonner";

// ==========================================
// 📚 תיעוד המערכת - CRM טננבאום
// ==========================================

const SECTIONS = {
  overview: {
    title: "סקירה כללית",
    icon: Book,
    color: "bg-blue-100 text-blue-700"
  },
  tech: {
    title: "טכנולוגיות",
    icon: Code,
    color: "bg-purple-100 text-purple-700"
  },
  entities: {
    title: "מבנה נתונים",
    icon: Database,
    color: "bg-green-100 text-green-700"
  },
  functions: {
    title: "פונקציות Backend",
    icon: Zap,
    color: "bg-amber-100 text-amber-700"
  },
  features: {
    title: "תכונות ופיצ'רים",
    icon: Layers,
    color: "bg-pink-100 text-pink-700"
  },
  automations: {
    title: "אוטומציות",
    icon: Bot,
    color: "bg-cyan-100 text-cyan-700"
  }
};

// Data structures
const ENTITIES_DATA = [
  {
    name: "Client",
    hebrewName: "לקוח",
    description: "ישות מרכזית לניהול לקוחות - כולל פרטים אישיים, סטטוס, שלב בתהליך ובעלי מקצוע משויכים",
    fields: [
      { name: "name", type: "string", required: true, description: "שם הלקוח" },
      { name: "email", type: "string", description: "כתובת אימייל" },
      { name: "phone", type: "string", description: "מספר טלפון" },
      { name: "status", type: "enum", description: "פוטנציאלי / פעיל / לא פעיל" },
      { name: "stage", type: "string", description: "שלב בפייפליין (ברור תכן, היתרים...)" },
      { name: "professionals", type: "object", description: "בעלי מקצוע משויכים (קונסטרוקטור, יועץ...)" },
      { name: "custom_data", type: "object", description: "שדות מותאמים אישית" }
    ]
  },
  {
    name: "Project",
    hebrewName: "פרויקט",
    description: "ניהול פרויקטים עם שיוך ללקוח, תקציב, תאריכים וסטטוס",
    fields: [
      { name: "name", type: "string", required: true, description: "שם הפרויקט" },
      { name: "client_id", type: "string", description: "מזהה לקוח" },
      { name: "status", type: "enum", description: "הצעת מחיר / תכנון / ביצוע / הושלם" },
      { name: "budget", type: "number", description: "תקציב" },
      { name: "progress", type: "number", description: "אחוז התקדמות 0-100" }
    ]
  },
  {
    name: "Task",
    hebrewName: "משימה",
    description: "ניהול משימות עם תזכורות מרובות, תאריכי יעד ושיוך לפרויקט/לקוח",
    fields: [
      { name: "title", type: "string", required: true, description: "כותרת המשימה" },
      { name: "status", type: "enum", description: "חדשה / בתהליך / הושלמה / דחויה" },
      { name: "priority", type: "enum", description: "גבוהה / בינונית / נמוכה" },
      { name: "due_date", type: "date", description: "תאריך יעד" },
      { name: "reminders", type: "array", description: "מערך תזכורות מותאמות" }
    ]
  },
  {
    name: "Meeting",
    hebrewName: "פגישה",
    description: "ניהול פגישות עם תזכורות, משתתפים וסנכרון Google Calendar",
    fields: [
      { name: "title", type: "string", required: true, description: "כותרת הפגישה" },
      { name: "meeting_date", type: "datetime", required: true, description: "תאריך ושעה" },
      { name: "duration_minutes", type: "number", description: "משך בדקות (ברירת מחדל: 60)" },
      { name: "google_calendar_event_id", type: "string", description: "מזהה אירוע ב-Google Calendar" },
      { name: "reminders", type: "array", description: "מערך תזכורות" }
    ]
  },
  {
    name: "Quote",
    hebrewName: "הצעת מחיר",
    description: "ניהול הצעות מחיר עם פריטים, סכומים וסטטוס",
    fields: [
      { name: "quote_number", type: "string", description: "מספר הצעה" },
      { name: "client_name", type: "string", required: true, description: "שם הלקוח" },
      { name: "amount", type: "number", description: "סכום כולל" },
      { name: "status", type: "enum", description: "נשלחה / אושרה / נדחתה" },
      { name: "items", type: "array", description: "פריטי ההצעה" }
    ]
  },
  {
    name: "GlobalDataType",
    hebrewName: "סוג נתונים מותאם",
    description: "הגדרת סוגי נתונים דינמיים כמו שלבים, בעלי מקצוע וקטגוריות",
    fields: [
      { name: "type_key", type: "string", required: true, description: "מפתח ייחודי (custom_xxx)" },
      { name: "name", type: "string", required: true, description: "שם תצוגה" },
      { name: "is_professional_type", type: "boolean", description: "האם זה בעל מקצוע" },
      { name: "options", type: "array", required: true, description: "רשימת אפשרויות עם צבעים" }
    ]
  },
  {
    name: "AutomationRule",
    hebrewName: "חוק אוטומציה",
    description: "הגדרת כללי אוטומציה עם טריגרים, תנאים ופעולות",
    fields: [
      { name: "name", type: "string", required: true, description: "שם החוק" },
      { name: "trigger", type: "enum", required: true, description: "אירוע מפעיל" },
      { name: "conditions", type: "object", description: "תנאים להפעלה" },
      { name: "actions", type: "array", required: true, description: "פעולות לביצוע" },
      { name: "active", type: "boolean", description: "האם פעיל" }
    ]
  },
  {
    name: "TimeLog",
    hebrewName: "רישום זמן",
    description: "מעקב שעות עבודה על לקוחות ופרויקטים",
    fields: [
      { name: "client_name", type: "string", description: "שם לקוח" },
      { name: "duration_minutes", type: "number", description: "משך בדקות" },
      { name: "log_date", type: "date", description: "תאריך" },
      { name: "description", type: "string", description: "תיאור העבודה" }
    ]
  },
  {
    name: "CustomSpreadsheet",
    hebrewName: "טבלה מותאמת",
    description: "טבלאות Excel-like מותאמות אישית עם עמודות דינמיות",
    fields: [
      { name: "name", type: "string", required: true, description: "שם הטבלה" },
      { name: "columns", type: "array", required: true, description: "הגדרות עמודות" },
      { name: "rows_data", type: "array", required: true, description: "נתוני השורות" },
      { name: "client_id", type: "string", description: "שיוך ללקוח" }
    ]
  }
];

const FUNCTIONS_DATA = [
  {
    name: "automationEngine",
    category: "אוטומציה",
    description: "מנוע האוטומציות המרכזי - מעבד אירועים ומפעיל חוקים",
    triggers: ["client_created", "client_stage_changed", "task_status_changed", "meeting_scheduled"],
    actions: ["send_email", "create_task", "send_whatsapp", "send_notification", "set_cell_color"],
    logic: [
      "קבלת אירוע (event) ו-payload מהמערכת",
      "טעינת כל החוקים הפעילים התואמים לטריגר",
      "בדיקת תנאים (conditions) לכל חוק",
      "ביצוע פעולות (actions) עבור חוקים שעברו את התנאים",
      "רישום ב-AutomationLog לכל הפעלה"
    ]
  },
  {
    name: "checkReminders",
    category: "תזכורות",
    description: "בודק ושולח תזכורות למשימות ופגישות - רץ כל 5 דקות",
    triggers: ["scheduled_task"],
    actions: ["send_email", "send_whatsapp", "send_sms", "create_notification"],
    logic: [
      "טעינת כל המשימות והפגישות עם תזכורות ממתינות",
      "חישוב זמן התזכורת (reminder_at או minutes_before)",
      "השוואה לזמן הנוכחי (בהתחשב ב-Timezone)",
      "שליחת מייל/WhatsApp/SMS לפי הגדרות",
      "עדכון סטטוס 'sent' ברשומה"
    ]
  },
  {
    name: "googleCalendarSync",
    category: "אינטגרציות",
    description: "סנכרון דו-כיווני עם Google Calendar",
    triggers: ["user_action", "meeting_created", "meeting_updated"],
    actions: ["export_meeting", "import_events", "sync_all"],
    logic: [
      "קבלת access token דרך OAuth connector",
      "לפי action: רשימת לוחות / ייצוא פגישה / ייבוא אירועים",
      "המרת פגישה ל-Google Calendar Event format",
      "שמירת google_calendar_event_id לסנכרון עתידי",
      "זיהוי אירועים קיימים למניעת כפילויות"
    ]
  },
  {
    name: "sendWhatsApp",
    category: "תקשורת",
    description: "שליחת הודעות WhatsApp דרך Twilio",
    triggers: ["automation", "user_action", "reminder"],
    actions: ["send_message"],
    logic: [
      "קבלת מספר טלפון והודעה",
      "פורמט מספר עם prefix whatsapp:",
      "יצירת Twilio client עם credentials",
      "שליחת ההודעה והחזרת SID"
    ],
    secrets: ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_PHONE_NUMBER"]
  },
  {
    name: "sendEmail",
    category: "תקשורת",
    description: "שליחת מיילים דרך Base44 Core integration",
    triggers: ["automation", "user_action", "reminder"],
    actions: ["send_email"],
    logic: [
      "קבלת נמען, נושא ותוכן",
      "תמיכה ב-HTML ו-templates",
      "החלפת placeholders ({{name}}, {{stage}}...)",
      "שליחה דרך Core.SendEmail"
    ]
  },
  {
    name: "getDashboardStats",
    category: "דשבורד",
    description: "חישוב סטטיסטיקות מהירות לדשבורד",
    triggers: ["page_load"],
    actions: ["calculate_stats"],
    logic: [
      "ספירת לקוחות, פרויקטים, הצעות מחיר, משימות",
      "החזרת רשימות מצומצמות לתצוגה מהירה",
      "אופטימיזציה לטעינה מהירה של הדשבורד"
    ]
  },
  {
    name: "exportSpreadsheet",
    category: "ייצוא",
    description: "ייצוא טבלאות ל-Excel/CSV/PDF",
    triggers: ["user_action"],
    actions: ["generate_file", "download"],
    logic: [
      "קבלת מזהה טבלה ופורמט רצוי",
      "טעינת נתוני הטבלה",
      "יצירת קובץ בפורמט המבוקש",
      "החזרת URL להורדה"
    ]
  },
  {
    name: "googleSheets",
    category: "אינטגרציות",
    description: "סנכרון עם Google Sheets - ייבוא וייצוא נתונים",
    triggers: ["user_action", "scheduled"],
    actions: ["import_sheet", "export_to_sheet", "create_sheet"],
    logic: [
      "חיבור ל-Google Sheets API",
      "מיפוי עמודות בין המערכת ל-Sheet",
      "סנכרון דו-כיווני או חד-כיווני"
    ]
  }
];

const FEATURES_DATA = [
  {
    category: "ניהול לקוחות",
    icon: Users,
    features: [
      { name: "כרטיס לקוח מפורט", description: "פרטים אישיים, היסטוריה, קבצים ומשימות" },
      { name: "תצוגת Excel", description: "טבלה חכמה עם עמודות מותאמות וסינון" },
      { name: "Pipeline (שלבים)", description: "מעקב אחר התקדמות לקוחות בתהליך" },
      { name: "בעלי מקצוע", description: "שיוך קונסטרוקטור, יועצים ומודדים ללקוח" },
      { name: "מיזוג לקוחות", description: "איחוד לקוחות כפולים" }
    ]
  },
  {
    category: "ניהול פרויקטים",
    icon: Briefcase,
    features: [
      { name: "תצוגת Kanban", description: "גרירת פרויקטים בין שלבים" },
      { name: "תצוגת Gantt", description: "ציר זמן ויזואלי למשימות" },
      { name: "מעקב תקציב", description: "ניהול הוצאות והכנסות" },
      { name: "קבצים ומסמכים", description: "העלאה וניהול קבצים לפרויקט" }
    ]
  },
  {
    category: "משימות ותזכורות",
    icon: CheckSquare,
    features: [
      { name: "תזכורות מרובות", description: "הגדרת מספר תזכורות לכל משימה" },
      { name: "חזרתיות", description: "משימות יומיות/שבועיות/חודשיות" },
      { name: "התראות מולטי-ערוץ", description: "מייל, WhatsApp, SMS, popup" },
      { name: "שיוך למשתמש", description: "הקצאת משימות לחברי צוות" }
    ]
  },
  {
    category: "לוח שנה ופגישות",
    icon: Calendar,
    features: [
      { name: "סנכרון Google Calendar", description: "ייצוא/ייבוא אירועים אוטומטי" },
      { name: "תצוגות מרובות", description: "יום/שבוע/חודש/Timeline" },
      { name: "תזכורות אוטומטיות", description: "התראות לפני פגישות" },
      { name: "צביעה לפי סוג", description: "קידוד צבעים לפי סוג פגישה" }
    ]
  },
  {
    category: "הצעות מחיר וחשבוניות",
    icon: Calculator,
    features: [
      { name: "יצירת הצעות", description: "פריטים, מחירים וסיכומים" },
      { name: "תבניות", description: "שמירת תבניות לשימוש חוזר" },
      { name: "מעקב סטטוס", description: "נשלחה/אושרה/נדחתה" },
      { name: "המרה לחשבונית", description: "יצירת חשבונית מהצעה שאושרה" }
    ]
  },
  {
    category: "אוטומציות",
    icon: Zap,
    features: [
      { name: "טריגרים", description: "הפעלה אוטומטית לפי אירועים" },
      { name: "תנאים", description: "סינון לפי ערכים ושדות" },
      { name: "פעולות", description: "מייל, משימה, התראה, צביעה" },
      { name: "היסטוריה", description: "לוג של כל ההפעלות" }
    ]
  },
  {
    category: "סוגי נתונים מותאמים",
    icon: Layers,
    features: [
      { name: "יצירת סוגים", description: "הגדרת קטגוריות חדשות" },
      { name: "בעלי מקצוע", description: "סימון סוג כ'בעל מקצוע'" },
      { name: "צבעים ותתי-קטגוריות", description: "עיצוב ומבנה היררכי" },
      { name: "ייבוא/ייצוא", description: "JSON ו-TXT" }
    ]
  },
  {
    category: "דוחות ואנליטיקס",
    icon: BarChart3,
    features: [
      { name: "דשבורד מותאם", description: "כרטיסיות גרירה וסידור" },
      { name: "גרפים", description: "מגמות, התפלגויות, Heatmap" },
      { name: "דוחות יומיים", description: "סיכום אוטומטי במייל" },
      { name: "AI Insights", description: "תובנות חכמות" }
    ]
  }
];

const TECH_STACK = [
  {
    category: "Frontend",
    items: [
      { name: "React 18", description: "ספריית UI מבוססת קומפוננטות" },
      { name: "Tailwind CSS", description: "Framework לעיצוב מהיר" },
      { name: "Shadcn/UI", description: "קומפוננטות מוכנות לשימוש" },
      { name: "React Query", description: "ניהול state ו-caching" },
      { name: "Framer Motion", description: "אנימציות" },
      { name: "Recharts", description: "גרפים ותרשימים" },
      { name: "React Router", description: "ניתוב עמודים" },
      { name: "Lucide React", description: "אייקונים" }
    ]
  },
  {
    category: "Backend",
    items: [
      { name: "Base44 SDK", description: "ניהול entities ו-auth" },
      { name: "Deno Deploy", description: "Backend functions serverless" },
      { name: "REST API", description: "תקשורת עם DB" }
    ]
  },
  {
    category: "אינטגרציות",
    items: [
      { name: "Google Calendar", description: "סנכרון פגישות" },
      { name: "Google Sheets", description: "ייבוא/ייצוא טבלאות" },
      { name: "Twilio", description: "WhatsApp ו-SMS" },
      { name: "Green Invoice", description: "חשבוניות" }
    ]
  },
  {
    category: "כלים נוספים",
    items: [
      { name: "date-fns", description: "עיבוד תאריכים" },
      { name: "jsPDF", description: "יצירת PDF" },
      { name: "@hello-pangea/dnd", description: "Drag & Drop" },
      { name: "React Quill", description: "עורך טקסט עשיר" }
    ]
  }
];

const AUTOMATIONS_DATA = {
  triggers: [
    { value: "client_created", label: "לקוח חדש נוצר", description: "מופעל כאשר נוסף לקוח חדש למערכת" },
    { value: "client_stage_changed", label: "שלב לקוח השתנה", description: "מופעל כאשר לקוח עובר לשלב אחר בפייפליין" },
    { value: "client_professional_assigned", label: "בעל מקצוע שויך", description: "מופעל כאשר מקצים קונסטרוקטור/יועץ ללקוח" },
    { value: "task_status_changed", label: "סטטוס משימה השתנה", description: "מופעל כאשר משימה עוברת בין סטטוסים" },
    { value: "meeting_scheduled", label: "פגישה נקבעה", description: "מופעל כאשר נוצרת פגישה חדשה" },
    { value: "data_type_value_changed", label: "ערך סוג נתונים השתנה", description: "מופעל כאשר ערך מותאם אישית משתנה" }
  ],
  actions: [
    { value: "send_email", label: "שלח מייל", description: "שליחת מייל אוטומטי לנמען" },
    { value: "send_whatsapp", label: "שלח WhatsApp", description: "שליחת הודעה ב-WhatsApp" },
    { value: "create_task", label: "צור משימה", description: "יצירת משימה חדשה אוטומטית" },
    { value: "send_reminder", label: "שלח תזכורת", description: "שליחת תזכורת במייל/SMS" },
    { value: "send_notification", label: "שלח התראה", description: "יצירת התראה במערכת" },
    { value: "set_cell_color", label: "צבע תא", description: "שינוי צבע תא בטבלה" },
    { value: "set_row_color", label: "צבע שורה", description: "שינוי צבע שורה שלמה" },
    { value: "update_client_field", label: "עדכן שדה לקוח", description: "עדכון שדה בכרטיס הלקוח" }
  ],
  examples: [
    {
      name: "ברוכים הבאים ללקוח חדש",
      trigger: "client_created",
      actions: ["send_email"],
      description: "שליחת מייל ברכה אוטומטי כאשר נוצר לקוח חדש"
    },
    {
      name: "תזכורת שיוך קונסטרוקטור",
      trigger: "client_professional_assigned",
      conditions: "data_type_key = קונסטרוקטור",
      actions: ["send_reminder"],
      description: "שליחת תזכורת כאשר מוקצה קונסטרוקטור ללקוח"
    },
    {
      name: "צביעת שורה בשלב היתרים",
      trigger: "client_stage_changed",
      conditions: "to_value = היתרים",
      actions: ["set_row_color"],
      description: "צביעת שורת הלקוח בירוק כאשר עובר לשלב היתרים"
    }
  ]
};

// Components
function SectionHeader({ icon: Icon, title, badge }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="p-2 bg-slate-100 rounded-lg">
        <Icon className="w-5 h-5 text-slate-700" />
      </div>
      <h2 className="text-xl font-bold text-slate-900">{title}</h2>
      {badge && <Badge variant="outline">{badge}</Badge>}
    </div>
  );
}

function EntityCard({ entity, isExpanded, onToggle }) {
  return (
    <Card className="hover:shadow-md transition-all">
      <CardHeader 
        className="cursor-pointer py-3"
        onClick={onToggle}
      >
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-green-600" />
            <span className="font-mono text-sm">{entity.name}</span>
            <span className="text-slate-500">({entity.hebrewName})</span>
          </div>
          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </CardTitle>
      </CardHeader>
      {isExpanded && (
        <CardContent className="pt-0">
          <p className="text-sm text-slate-600 mb-3">{entity.description}</p>
          <div className="bg-slate-50 rounded-lg p-3">
            <div className="text-xs font-semibold text-slate-500 mb-2">שדות:</div>
            <div className="space-y-1">
              {entity.fields.map((field, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs">
                  <code className="bg-slate-200 px-1 rounded font-mono">{field.name}</code>
                  <Badge variant="outline" className="text-[10px]">{field.type}</Badge>
                  {field.required && <Badge className="bg-red-100 text-red-700 text-[10px]">חובה</Badge>}
                  <span className="text-slate-500">{field.description}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

function FunctionCard({ func, isExpanded, onToggle }) {
  return (
    <Card className="hover:shadow-md transition-all">
      <CardHeader 
        className="cursor-pointer py-3"
        onClick={onToggle}
      >
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-600" />
            <span className="font-mono text-sm">{func.name}</span>
            <Badge variant="outline" className="text-[10px]">{func.category}</Badge>
          </div>
          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </CardTitle>
      </CardHeader>
      {isExpanded && (
        <CardContent className="pt-0">
          <p className="text-sm text-slate-600 mb-3">{func.description}</p>
          
          <div className="space-y-3">
            <div>
              <div className="text-xs font-semibold text-slate-500 mb-1">טריגרים:</div>
              <div className="flex flex-wrap gap-1">
                {func.triggers.map((t, idx) => (
                  <Badge key={idx} className="bg-blue-100 text-blue-700 text-[10px]">{t}</Badge>
                ))}
              </div>
            </div>
            
            <div>
              <div className="text-xs font-semibold text-slate-500 mb-1">פעולות:</div>
              <div className="flex flex-wrap gap-1">
                {func.actions.map((a, idx) => (
                  <Badge key={idx} className="bg-green-100 text-green-700 text-[10px]">{a}</Badge>
                ))}
              </div>
            </div>
            
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="text-xs font-semibold text-slate-500 mb-2">לוגיקה:</div>
              <ol className="text-xs text-slate-600 space-y-1 mr-4 list-decimal">
                {func.logic.map((step, idx) => (
                  <li key={idx}>{step}</li>
                ))}
              </ol>
            </div>
            
            {func.secrets && (
              <div>
                <div className="text-xs font-semibold text-slate-500 mb-1">Secrets נדרשים:</div>
                <div className="flex flex-wrap gap-1">
                  {func.secrets.map((s, idx) => (
                    <code key={idx} className="bg-red-100 text-red-700 px-1 rounded text-[10px]">{s}</code>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export default function Documentation() {
  const [activeTab, setActiveTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedEntities, setExpandedEntities] = useState({});
  const [expandedFunctions, setExpandedFunctions] = useState({});

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("הועתק!");
  };

  return (
    <div className="p-6 min-h-screen" dir="rtl" style={{ backgroundColor: '#FCF6E3' }}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg">
              <Book className="w-10 h-10 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">תיעוד המערכת</h1>
              <p className="text-slate-600">CRM טננבאום - מדריך מקיף למפתחים ולמשתמשים</p>
            </div>
          </div>
          
          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="חיפוש בתיעוד..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10"
            />
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 flex-wrap">
            {Object.entries(SECTIONS).map(([key, section]) => {
              const Icon = section.icon;
              return (
                <TabsTrigger key={key} value={key} className="gap-2">
                  <Icon className="w-4 h-4" />
                  {section.title}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold text-blue-900 mb-3">🎯 מה זו המערכת?</h3>
                  <p className="text-blue-800 mb-4">
                    מערכת CRM מתקדמת לניהול לקוחות, פרויקטים, משימות ופגישות.
                    המערכת כוללת טבלאות חכמות בסגנון Excel, אוטומציות מתקדמות,
                    וסנכרון עם Google Calendar ו-Sheets.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Badge className="bg-blue-200 text-blue-800">ניהול לקוחות</Badge>
                    <Badge className="bg-blue-200 text-blue-800">פרויקטים</Badge>
                    <Badge className="bg-blue-200 text-blue-800">משימות</Badge>
                    <Badge className="bg-blue-200 text-blue-800">אוטומציות</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold text-green-900 mb-3">✨ יכולות עיקריות</h3>
                  <ul className="text-green-800 space-y-2">
                    <li>• טבלאות Excel-like עם עמודות דינמיות</li>
                    <li>• אוטומציות מבוססות אירועים</li>
                    <li>• סנכרון Google Calendar/Sheets</li>
                    <li>• תזכורות במייל, WhatsApp, SMS</li>
                    <li>• ניהול בעלי מקצוע מותאם</li>
                    <li>• דוחות ודשבורד מותאם אישית</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold text-slate-900 mb-4">🔄 זרימת עבודה טיפוסית</h3>
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    {[
                      { icon: Users, label: "יצירת לקוח", color: "bg-blue-100 text-blue-700" },
                      { icon: Briefcase, label: "פתיחת פרויקט", color: "bg-purple-100 text-purple-700" },
                      { icon: CheckSquare, label: "הוספת משימות", color: "bg-green-100 text-green-700" },
                      { icon: Calendar, label: "קביעת פגישות", color: "bg-amber-100 text-amber-700" },
                      { icon: Calculator, label: "הצעת מחיר", color: "bg-pink-100 text-pink-700" },
                      { icon: Zap, label: "אוטומציות", color: "bg-cyan-100 text-cyan-700" }
                    ].map((step, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <div className={`p-3 rounded-xl ${step.color}`}>
                          <step.icon className="w-6 h-6" />
                        </div>
                        <span className="text-sm font-medium">{step.label}</span>
                        {idx < 5 && <ChevronRight className="w-4 h-4 text-slate-300" />}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tech Stack Tab */}
          <TabsContent value="tech">
            <div className="grid md:grid-cols-2 gap-6">
              {TECH_STACK.map((category, idx) => (
                <Card key={idx}>
                  <CardHeader>
                    <CardTitle className="text-lg">{category.category}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {category.items.map((item, itemIdx) => (
                        <div key={itemIdx} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                          <Badge variant="outline" className="font-mono text-xs">{item.name}</Badge>
                          <span className="text-sm text-slate-600">{item.description}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Entities Tab */}
          <TabsContent value="entities">
            <SectionHeader icon={Database} title="מבנה הנתונים (Entities)" badge={`${ENTITIES_DATA.length} ישויות`} />
            <div className="space-y-3">
              {ENTITIES_DATA.map((entity, idx) => (
                <EntityCard 
                  key={idx}
                  entity={entity}
                  isExpanded={expandedEntities[entity.name]}
                  onToggle={() => setExpandedEntities(prev => ({
                    ...prev,
                    [entity.name]: !prev[entity.name]
                  }))}
                />
              ))}
            </div>
          </TabsContent>

          {/* Functions Tab */}
          <TabsContent value="functions">
            <SectionHeader icon={Zap} title="פונקציות Backend" badge={`${FUNCTIONS_DATA.length} פונקציות`} />
            <div className="space-y-3">
              {FUNCTIONS_DATA.map((func, idx) => (
                <FunctionCard 
                  key={idx}
                  func={func}
                  isExpanded={expandedFunctions[func.name]}
                  onToggle={() => setExpandedFunctions(prev => ({
                    ...prev,
                    [func.name]: !prev[func.name]
                  }))}
                />
              ))}
            </div>
          </TabsContent>

          {/* Features Tab */}
          <TabsContent value="features">
            <SectionHeader icon={Layers} title="תכונות ופיצ'רים" />
            <div className="grid md:grid-cols-2 gap-6">
              {FEATURES_DATA.map((category, idx) => {
                const Icon = category.icon;
                return (
                  <Card key={idx}>
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Icon className="w-5 h-5 text-slate-600" />
                        {category.category}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {category.features.map((feature, fIdx) => (
                          <div key={fIdx} className="p-2 bg-slate-50 rounded-lg">
                            <div className="font-medium text-sm text-slate-900">{feature.name}</div>
                            <div className="text-xs text-slate-500">{feature.description}</div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* Automations Tab */}
          <TabsContent value="automations">
            <SectionHeader icon={Bot} title="מערכת האוטומציות" />
            
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Zap className="w-5 h-5 text-blue-600" />
                    טריגרים (אירועים מפעילים)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {AUTOMATIONS_DATA.triggers.map((trigger, idx) => (
                      <div key={idx} className="p-2 bg-blue-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <code className="bg-blue-200 px-1 rounded text-xs">{trigger.value}</code>
                          <span className="font-medium text-sm">{trigger.label}</span>
                        </div>
                        <div className="text-xs text-slate-500 mt-1">{trigger.description}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Settings className="w-5 h-5 text-green-600" />
                    פעולות
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {AUTOMATIONS_DATA.actions.map((action, idx) => (
                      <div key={idx} className="p-2 bg-green-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <code className="bg-green-200 px-1 rounded text-xs">{action.value}</code>
                          <span className="font-medium text-sm">{action.label}</span>
                        </div>
                        <div className="text-xs text-slate-500 mt-1">{action.description}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">💡 דוגמאות לאוטומציות</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {AUTOMATIONS_DATA.examples.map((example, idx) => (
                    <div key={idx} className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                      <div className="font-bold text-purple-900 mb-2">{example.name}</div>
                      <div className="text-sm text-purple-800 mb-2">{example.description}</div>
                      <div className="flex flex-wrap gap-2">
                        <Badge className="bg-blue-200 text-blue-800">טריגר: {example.trigger}</Badge>
                        {example.conditions && (
                          <Badge className="bg-amber-200 text-amber-800">תנאי: {example.conditions}</Badge>
                        )}
                        {example.actions.map((a, aIdx) => (
                          <Badge key={aIdx} className="bg-green-200 text-green-800">פעולה: {a}</Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}