import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Database, Users, Briefcase, CheckSquare, Timer, Receipt, 
  Calendar, FileText, Table, Link2, ArrowRight, Download,
  AlertCircle, CheckCircle, Info, BookOpen, Copy, ChevronDown,
  ChevronRight, Building2, Layers, Settings, Zap
} from "lucide-react";
import { toast } from "sonner";

export default function DocumentationPage() {
  const [expandedSections, setExpandedSections] = useState({});

  const toggleSection = (key) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('הועתק ללוח');
  };

  return (
    <div className="min-h-screen p-6" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-4 py-8">
          <div className="flex items-center justify-center gap-3">
            <BookOpen className="w-12 h-12 text-amber-600" />
            <h1 className="text-4xl font-bold text-slate-800">תיעוד מערכת הגיבוי והשחזור</h1>
          </div>
          <p className="text-lg text-slate-600 max-w-3xl mx-auto">
            מסמך מפורט המתאר את מבנה הנתונים, הקשרים בין הישויות, ואופן השחזור של המידע
          </p>
          <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50">
            גרסה 2.0 - CRM Tannenbaum
          </Badge>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid grid-cols-5 w-full max-w-3xl mx-auto">
            <TabsTrigger value="overview">סקירה כללית</TabsTrigger>
            <TabsTrigger value="entities">ישויות</TabsTrigger>
            <TabsTrigger value="relations">קשרים</TabsTrigger>
            <TabsTrigger value="spreadsheets">טבלאות</TabsTrigger>
            <TabsTrigger value="restore">שחזור</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-blue-600" />
                  מבנה מערכת הנתונים
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-bold text-blue-900 mb-2">עקרונות מפתח</h3>
                  <ul className="space-y-2 text-blue-800">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 mt-1 text-green-600" />
                      <span>כל רשומה מכילה <code className="bg-blue-100 px-1 rounded">id</code> ייחודי, <code className="bg-blue-100 px-1 rounded">created_date</code> ו-<code className="bg-blue-100 px-1 rounded">updated_date</code></span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 mt-1 text-green-600" />
                      <span>קשרים בין ישויות נשמרים גם ב-ID וגם בשם (לנוחות וגמישות)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 mt-1 text-green-600" />
                      <span>שדה <code className="bg-blue-100 px-1 rounded">created_by</code> מכיל את האימייל של המשתמש שיצר את הרשומה</span>
                    </li>
                  </ul>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { icon: Users, name: 'Client', count: 'לקוחות', color: 'purple' },
                    { icon: Briefcase, name: 'Project', count: 'פרויקטים', color: 'blue' },
                    { icon: CheckSquare, name: 'Task', count: 'משימות', color: 'green' },
                    { icon: Timer, name: 'TimeLog', count: 'לוגי זמן', color: 'orange' },
                    { icon: Calendar, name: 'Meeting', count: 'פגישות', color: 'pink' },
                    { icon: Receipt, name: 'Invoice', count: 'חשבוניות', color: 'amber' },
                    { icon: FileText, name: 'Quote', count: 'הצעות מחיר', color: 'cyan' },
                    { icon: Table, name: 'CustomSpreadsheet', count: 'טבלאות', color: 'indigo' },
                    { icon: Users, name: 'TeamMember', count: 'חברי צוות', color: 'rose' },
                  ].map(entity => (
                    <Card key={entity.name} className={`bg-${entity.color}-50 border-${entity.color}-200`}>
                      <CardContent className="p-4 flex items-center gap-3">
                        <entity.icon className={`w-8 h-8 text-${entity.color}-600`} />
                        <div>
                          <div className="font-bold text-slate-800">{entity.name}</div>
                          <div className="text-sm text-slate-600">{entity.count}</div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Entities Tab */}
          <TabsContent value="entities" className="space-y-6">
            
            {/* Client Entity */}
            <Card>
              <CardHeader className="cursor-pointer" onClick={() => toggleSection('client')}>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-purple-600" />
                    Client - לקוחות
                  </div>
                  {expandedSections.client ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                </CardTitle>
              </CardHeader>
              {expandedSections.client && (
                <CardContent className="space-y-4">
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <h4 className="font-bold mb-2">תיאור</h4>
                    <p>ישות מרכזית - כל הפעילות העסקית מתחילה מלקוח. לקוח יכול להיות פוטנציאלי, פעיל או לא פעיל.</p>
                  </div>
                  
                  <div>
                    <h4 className="font-bold mb-2">שדות עיקריים</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="bg-slate-100">
                            <th className="border p-2 text-right">שדה</th>
                            <th className="border p-2 text-right">סוג</th>
                            <th className="border p-2 text-right">תיאור</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr><td className="border p-2 font-mono">id</td><td className="border p-2">string</td><td className="border p-2">מזהה ייחודי (אוטומטי)</td></tr>
                          <tr><td className="border p-2 font-mono">name</td><td className="border p-2">string</td><td className="border p-2">שם הלקוח (חובה)</td></tr>
                          <tr><td className="border p-2 font-mono">email</td><td className="border p-2">string</td><td className="border p-2">כתובת אימייל</td></tr>
                          <tr><td className="border p-2 font-mono">phone</td><td className="border p-2">string</td><td className="border p-2">טלפון ראשי</td></tr>
                          <tr><td className="border p-2 font-mono">stage</td><td className="border p-2">string</td><td className="border p-2">שלב בתהליך (מקושר ל-GlobalDataType)</td></tr>
                          <tr><td className="border p-2 font-mono">status</td><td className="border p-2">enum</td><td className="border p-2">פוטנציאלי / פעיל / לא פעיל</td></tr>
                          <tr><td className="border p-2 font-mono">professionals</td><td className="border p-2">object</td><td className="border p-2">בעלי מקצוע משויכים (מפתח: type_key)</td></tr>
                          <tr><td className="border p-2 font-mono">custom_data</td><td className="border p-2">object</td><td className="border p-2">שדות מותאמים גמישים</td></tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
                    <h4 className="font-bold text-amber-900 mb-2 flex items-center gap-2">
                      <Link2 className="w-4 h-4" />
                      קשרים יוצאים
                    </h4>
                    <ul className="space-y-1 text-amber-800">
                      <li>← Project.client_id</li>
                      <li>← Task.client_id</li>
                      <li>← TimeLog.client_id</li>
                      <li>← Meeting.client_id</li>
                      <li>← Quote.client_id</li>
                      <li>← Invoice.client_id</li>
                      <li>← CustomSpreadsheet.client_id</li>
                    </ul>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* TimeLog Entity */}
            <Card>
              <CardHeader className="cursor-pointer" onClick={() => toggleSection('timelog')}>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Timer className="w-5 h-5 text-orange-600" />
                    TimeLog - לוגי זמן
                  </div>
                  {expandedSections.timelog ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                </CardTitle>
              </CardHeader>
              {expandedSections.timelog && (
                <CardContent className="space-y-4">
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <h4 className="font-bold mb-2">תיאור</h4>
                    <p>רישום שעות עבודה של עובדים על לקוחות/פרויקטים. משמש לחישוב משכורות ודוחות.</p>
                  </div>
                  
                  <div>
                    <h4 className="font-bold mb-2">שדות עיקריים</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="bg-slate-100">
                            <th className="border p-2 text-right">שדה</th>
                            <th className="border p-2 text-right">סוג</th>
                            <th className="border p-2 text-right">תיאור</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr><td className="border p-2 font-mono">id</td><td className="border p-2">string</td><td className="border p-2">מזהה ייחודי</td></tr>
                          <tr className="bg-green-50"><td className="border p-2 font-mono">user_email</td><td className="border p-2">string</td><td className="border p-2">⭐ אימייל העובד שביצע (חדש)</td></tr>
                          <tr className="bg-green-50"><td className="border p-2 font-mono">user_name</td><td className="border p-2">string</td><td className="border p-2">⭐ שם העובד (לנוחות)</td></tr>
                          <tr><td className="border p-2 font-mono">created_by</td><td className="border p-2">string</td><td className="border p-2">אימייל יוצר הרשומה (fallback)</td></tr>
                          <tr><td className="border p-2 font-mono">client_id</td><td className="border p-2">string</td><td className="border p-2">מזהה הלקוח</td></tr>
                          <tr><td className="border p-2 font-mono">client_name</td><td className="border p-2">string</td><td className="border p-2">שם הלקוח</td></tr>
                          <tr><td className="border p-2 font-mono">log_date</td><td className="border p-2">date</td><td className="border p-2">תאריך העבודה</td></tr>
                          <tr><td className="border p-2 font-mono">duration_seconds</td><td className="border p-2">number</td><td className="border p-2">משך בשניות</td></tr>
                          <tr><td className="border p-2 font-mono">project_id</td><td className="border p-2">string</td><td className="border p-2">מזהה פרויקט (אופציונלי)</td></tr>
                          <tr><td className="border p-2 font-mono">task_id</td><td className="border p-2">string</td><td className="border p-2">מזהה משימה (אופציונלי)</td></tr>
                          <tr><td className="border p-2 font-mono">billable</td><td className="border p-2">boolean</td><td className="border p-2">לחייב על השעות?</td></tr>
                          <tr><td className="border p-2 font-mono">hourly_rate</td><td className="border p-2">number</td><td className="border p-2">שכר שעתי (אם שונה מברירת מחדל)</td></tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                    <h4 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
                      <Link2 className="w-4 h-4" />
                      קשרים
                    </h4>
                    <ul className="space-y-1 text-blue-800">
                      <li><code>user_email</code> → TeamMember.email או User.email</li>
                      <li><code>client_id</code> → Client.id</li>
                      <li><code>project_id</code> → Project.id</li>
                      <li><code>task_id</code> → Task.id</li>
                    </ul>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
                    <h4 className="font-bold text-amber-900 mb-2 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      חשוב לשחזור
                    </h4>
                    <p className="text-amber-800">
                      לזיהוי העובד, המערכת בודקת קודם את <code>user_email</code>, ואם לא קיים - משתמשת ב-<code>created_by</code>.
                      מומלץ לוודא שכל הלוגים מכילים <code>user_email</code> לדיוק מקסימלי.
                    </p>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* TeamMember Entity */}
            <Card>
              <CardHeader className="cursor-pointer" onClick={() => toggleSection('teammember')}>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-rose-600" />
                    TeamMember - חברי צוות
                  </div>
                  {expandedSections.teammember ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                </CardTitle>
              </CardHeader>
              {expandedSections.teammember && (
                <CardContent className="space-y-4">
                  <div className="bg-rose-50 p-4 rounded-lg">
                    <h4 className="font-bold mb-2">תיאור</h4>
                    <p>עובדים/פרילנסרים של המשרד. כולל פרטי שכר ופרטי בנק לצורך הפקת דוחות משכורות.</p>
                  </div>
                  
                  <div>
                    <h4 className="font-bold mb-2">שדות עיקריים</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="bg-slate-100">
                            <th className="border p-2 text-right">שדה</th>
                            <th className="border p-2 text-right">סוג</th>
                            <th className="border p-2 text-right">תיאור</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr><td className="border p-2 font-mono">id</td><td className="border p-2">string</td><td className="border p-2">מזהה ייחודי</td></tr>
                          <tr><td className="border p-2 font-mono">full_name</td><td className="border p-2">string</td><td className="border p-2">שם מלא (חובה)</td></tr>
                          <tr className="bg-green-50"><td className="border p-2 font-mono">email</td><td className="border p-2">string</td><td className="border p-2">⭐ אימייל - מפתח לחיבור ל-TimeLog</td></tr>
                          <tr><td className="border p-2 font-mono">role</td><td className="border p-2">string</td><td className="border p-2">תפקיד בצוות</td></tr>
                          <tr><td className="border p-2 font-mono">hourly_rate</td><td className="border p-2">number</td><td className="border p-2">שכר שעתי (₪)</td></tr>
                          <tr><td className="border p-2 font-mono">vat_percentage</td><td className="border p-2">number</td><td className="border p-2">אחוז מע"מ (17 כברירת מחדל)</td></tr>
                          <tr><td className="border p-2 font-mono">bank_details</td><td className="border p-2">object</td><td className="border p-2">פרטי בנק (bank_name, branch, account_number)</td></tr>
                          <tr><td className="border p-2 font-mono">active</td><td className="border p-2">boolean</td><td className="border p-2">האם פעיל</td></tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="bg-purple-50 border border-purple-200 p-4 rounded-lg">
                    <h4 className="font-bold text-purple-900 mb-2">חיבור לוגי זמן ← עובד</h4>
                    <pre className="bg-white p-3 rounded text-sm overflow-x-auto" dir="ltr">
{`// למציאת העובד מתוך TimeLog:
const employeeEmail = timeLog.user_email || timeLog.created_by;
const teamMember = teamMembers.find(tm => tm.email === employeeEmail);

// חישוב שכר:
const hours = timeLog.duration_seconds / 3600;
const rate = timeLog.hourly_rate || teamMember?.hourly_rate || 0;
const salary = hours * rate;`}
                    </pre>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Project Entity */}
            <Card>
              <CardHeader className="cursor-pointer" onClick={() => toggleSection('project')}>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-blue-600" />
                    Project - פרויקטים
                  </div>
                  {expandedSections.project ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                </CardTitle>
              </CardHeader>
              {expandedSections.project && (
                <CardContent className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-bold mb-2">תיאור</h4>
                    <p>פרויקט שייך ללקוח. כולל תקציב, אבני דרך, תזרים מזומנים וסטטוס התקדמות.</p>
                  </div>
                  
                  <div>
                    <h4 className="font-bold mb-2">שדות עיקריים</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="bg-slate-100">
                            <th className="border p-2 text-right">שדה</th>
                            <th className="border p-2 text-right">סוג</th>
                            <th className="border p-2 text-right">תיאור</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr><td className="border p-2 font-mono">id</td><td className="border p-2">string</td><td className="border p-2">מזהה ייחודי</td></tr>
                          <tr><td className="border p-2 font-mono">name</td><td className="border p-2">string</td><td className="border p-2">שם הפרויקט (חובה)</td></tr>
                          <tr className="bg-green-50"><td className="border p-2 font-mono">client_id</td><td className="border p-2">string</td><td className="border p-2">⭐ מזהה הלקוח</td></tr>
                          <tr><td className="border p-2 font-mono">client_name</td><td className="border p-2">string</td><td className="border p-2">שם הלקוח (לנוחות)</td></tr>
                          <tr><td className="border p-2 font-mono">type</td><td className="border p-2">enum</td><td className="border p-2">סוג: דירה/בית/משרדים/מסחרי/ציבורי/אחר</td></tr>
                          <tr><td className="border p-2 font-mono">status</td><td className="border p-2">enum</td><td className="border p-2">הצעה/תכנון/היתרים/ביצוע/הושלם/מבוטל</td></tr>
                          <tr><td className="border p-2 font-mono">budget</td><td className="border p-2">number</td><td className="border p-2">תקציב</td></tr>
                          <tr><td className="border p-2 font-mono">progress</td><td className="border p-2">number</td><td className="border p-2">אחוז התקדמות (0-100)</td></tr>
                          <tr><td className="border p-2 font-mono">milestones</td><td className="border p-2">array</td><td className="border p-2">אבני דרך</td></tr>
                          <tr><td className="border p-2 font-mono">budget_items</td><td className="border p-2">array</td><td className="border p-2">פריטי תקציב מפורטים</td></tr>
                          <tr><td className="border p-2 font-mono">cashflow</td><td className="border p-2">array</td><td className="border p-2">תזרים מזומנים</td></tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
                    <h4 className="font-bold text-amber-900 mb-2 flex items-center gap-2">
                      <Link2 className="w-4 h-4" />
                      קשרים
                    </h4>
                    <ul className="space-y-1 text-amber-800">
                      <li><code>client_id</code> → Client.id (הלקוח של הפרויקט)</li>
                      <li>← Task.project_id (משימות בפרויקט)</li>
                      <li>← SubTask.project_id (תת-משימות)</li>
                      <li>← TimeLog.project_id (לוגי זמן)</li>
                      <li>← Meeting.project_id (פגישות)</li>
                    </ul>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Task Entity */}
            <Card>
              <CardHeader className="cursor-pointer" onClick={() => toggleSection('task')}>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="w-5 h-5 text-green-600" />
                    Task - משימות
                  </div>
                  {expandedSections.task ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                </CardTitle>
              </CardHeader>
              {expandedSections.task && (
                <CardContent className="space-y-4">
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="font-bold mb-2">תיאור</h4>
                    <p>משימה יכולה להיות קשורה ללקוח, לפרויקט, או לשניהם. כוללת תזכורות ואפשרות חזרתיות.</p>
                  </div>
                  
                  <div>
                    <h4 className="font-bold mb-2">קשרים</h4>
                    <ul className="space-y-1">
                      <li><code>client_id</code> → Client.id</li>
                      <li><code>project_id</code> → Project.id</li>
                      <li><code>assigned_to</code> → User.email (האחראי על המשימה)</li>
                    </ul>
                  </div>
                </CardContent>
              )}
            </Card>
          </TabsContent>

          {/* Relations Tab */}
          <TabsContent value="relations" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link2 className="w-5 h-5 text-purple-600" />
                  מפת הקשרים בין ישויות
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-slate-900 text-green-400 p-6 rounded-lg font-mono text-sm overflow-x-auto" dir="ltr">
                  <pre>{`
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
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│     ┌──────────┐                    ┌──────────┐                            │
│     │  Client  │◄───── client_id ───│ Project  │                            │
│     │    id    │                    │    id    │                            │
│     │   name   │                    │   name   │                            │
│     │   stage  │                    │  budget  │                            │
│     │   ...    │                    │milestones│                            │
│     └────┬─────┘                    └────┬─────┘                            │
│          │                               │                                  │
│          │ client_id                     │ project_id                       │
│          ▼                               ▼                                  │
│   ┌──────────────┐               ┌──────────────┐                           │
│   │   Meeting    │               │   SubTask    │                           │
│   │   Quote      │               │  (פרויקט)    │                           │
│   │   Invoice    │               └──────────────┘                           │
│   │CustomSpread  │                                                          │
│   │   sheet      │                                                          │
│   └──────────────┘                                                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                          SPREADSHEET STRUCTURE                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  CustomSpreadsheet                                                          │
│  ├── columns[] ──────────────► Column definitions (key, title, type)        │
│  │                                   └── type can link to GlobalDataType    │
│  ├── rows_data[] ────────────► Row objects { id, [col_key]: value }         │
│  │                                                                          │
│  ├── cell_styles{} ──────────► { "rowId_colKey": {bg, color, bold} }        │
│  ├── cell_notes{} ───────────► { "rowId_colKey": "note text" }              │
│  ├── merged_cells{} ─────────► { mergeKey: {cells[], master, rowspan} }     │
│  ├── merged_headers{} ───────► { mergeKey: {columns[], colspan, title} }    │
│  ├── header_styles{} ────────► { colKey: {bg, color} }                      │
│  ├── theme_settings ─────────► Palette, fonts, borders                      │
│  ├── charts[] ───────────────► Visualizations                               │
│  └── saved_views[] ──────────► Column/filter presets                        │
│                                                                             │
│  GlobalDataType                                                             │
│  ├── type_key ───────────────► "stages", "taba", "custom_xyz"               │
│  └── options[] ──────────────► [{value, label, color, children[]}]          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
`}</pre>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>טבלת קשרים מפורטת</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="border p-2 text-right">ישות מקור</th>
                        <th className="border p-2 text-right">שדה</th>
                        <th className="border p-2 text-center">←</th>
                        <th className="border p-2 text-right">ישות יעד</th>
                        <th className="border p-2 text-right">שדה יעד</th>
                        <th className="border p-2 text-right">הערות</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr><td className="border p-2">Project</td><td className="border p-2 font-mono">client_id</td><td className="border p-2 text-center">→</td><td className="border p-2">Client</td><td className="border p-2 font-mono">id</td><td className="border p-2">פרויקט שייך ללקוח</td></tr>
                      <tr><td className="border p-2">Task</td><td className="border p-2 font-mono">client_id</td><td className="border p-2 text-center">→</td><td className="border p-2">Client</td><td className="border p-2 font-mono">id</td><td className="border p-2">משימה ללקוח (ישיר)</td></tr>
                      <tr><td className="border p-2">Task</td><td className="border p-2 font-mono">project_id</td><td className="border p-2 text-center">→</td><td className="border p-2">Project</td><td className="border p-2 font-mono">id</td><td className="border p-2">משימה בפרויקט</td></tr>
                      <tr><td className="border p-2">Task</td><td className="border p-2 font-mono">assigned_to</td><td className="border p-2 text-center">→</td><td className="border p-2">User</td><td className="border p-2 font-mono">email</td><td className="border p-2">אחראי על המשימה</td></tr>
                      <tr className="bg-orange-50"><td className="border p-2">TimeLog</td><td className="border p-2 font-mono">user_email</td><td className="border p-2 text-center">→</td><td className="border p-2">TeamMember</td><td className="border p-2 font-mono">email</td><td className="border p-2">⭐ עובד שביצע</td></tr>
                      <tr className="bg-orange-50"><td className="border p-2">TimeLog</td><td className="border p-2 font-mono">created_by</td><td className="border p-2 text-center">→</td><td className="border p-2">User</td><td className="border p-2 font-mono">email</td><td className="border p-2">fallback לזיהוי עובד</td></tr>
                      <tr><td className="border p-2">TimeLog</td><td className="border p-2 font-mono">client_id</td><td className="border p-2 text-center">→</td><td className="border p-2">Client</td><td className="border p-2 font-mono">id</td><td className="border p-2">לקוח עליו עבדו</td></tr>
                      <tr><td className="border p-2">TimeLog</td><td className="border p-2 font-mono">project_id</td><td className="border p-2 text-center">→</td><td className="border p-2">Project</td><td className="border p-2 font-mono">id</td><td className="border p-2">פרויקט (אופציונלי)</td></tr>
                      <tr><td className="border p-2">TimeLog</td><td className="border p-2 font-mono">task_id</td><td className="border p-2 text-center">→</td><td className="border p-2">Task</td><td className="border p-2 font-mono">id</td><td className="border p-2">משימה (אופציונלי)</td></tr>
                      <tr><td className="border p-2">Meeting</td><td className="border p-2 font-mono">client_id</td><td className="border p-2 text-center">→</td><td className="border p-2">Client</td><td className="border p-2 font-mono">id</td><td className="border p-2">לקוח בפגישה</td></tr>
                      <tr><td className="border p-2">Meeting</td><td className="border p-2 font-mono">project_id</td><td className="border p-2 text-center">→</td><td className="border p-2">Project</td><td className="border p-2 font-mono">id</td><td className="border p-2">פרויקט (אופציונלי)</td></tr>
                      <tr><td className="border p-2">Quote</td><td className="border p-2 font-mono">client_id</td><td className="border p-2 text-center">→</td><td className="border p-2">Client</td><td className="border p-2 font-mono">id</td><td className="border p-2">הצעת מחיר ללקוח</td></tr>
                      <tr><td className="border p-2">Invoice</td><td className="border p-2 font-mono">client_id</td><td className="border p-2 text-center">→</td><td className="border p-2">Client</td><td className="border p-2 font-mono">id</td><td className="border p-2">חשבונית ללקוח</td></tr>
                      <tr><td className="border p-2">CustomSpreadsheet</td><td className="border p-2 font-mono">client_id</td><td className="border p-2 text-center">→</td><td className="border p-2">Client</td><td className="border p-2 font-mono">id</td><td className="border p-2">טבלה ללקוח</td></tr>
                      <tr><td className="border p-2">SubTask</td><td className="border p-2 font-mono">project_id</td><td className="border p-2 text-center">→</td><td className="border p-2">Project</td><td className="border p-2 font-mono">id</td><td className="border p-2">תת-משימה בפרויקט</td></tr>
                      <tr><td className="border p-2">Client</td><td className="border p-2 font-mono">stage</td><td className="border p-2 text-center">→</td><td className="border p-2">GlobalDataType</td><td className="border p-2 font-mono">stages</td><td className="border p-2">שלב הלקוח</td></tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Spreadsheets Tab */}
          <TabsContent value="spreadsheets" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Table className="w-5 h-5 text-indigo-600" />
                  מערכת הטבלאות המתקדמת
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-indigo-50 p-4 rounded-lg">
                  <h4 className="font-bold mb-2">תיאור כללי</h4>
                  <p>מערכת טבלאות מותאמות עם יכולות מתקדמות כגון: עיצוב תאים, מיזוג, תגובות, גרפים, סנכרון עם Google Sheets ועוד.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="bg-slate-50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">מבנה עמודות (columns)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <pre className="bg-white p-3 rounded text-xs overflow-x-auto" dir="ltr">
{`{
  "key": "col_123456",      // מזהה ייחודי
  "title": "שם הלקוח",       // כותרת
  "type": "client",          // סוג העמודה
  "width": "150px",          // רוחב
  "visible": true,           // נראות
  "collapsed": false         // מכווצת
}

// סוגי עמודות זמינים:
// text, number, date, client,
// stage, checkmark, mixed_check,
// select, taba, transfer_rights,
// purchase_rights, custom_*`}</pre>
                    </CardContent>
                  </Card>

                  <Card className="bg-slate-50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">מבנה שורות (rows_data)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <pre className="bg-white p-3 rounded text-xs overflow-x-auto" dir="ltr">
{`{
  "id": "row_123456",        // מזהה ייחודי (חובה!)
  "col_111": "ערך 1",        // ערך לפי key עמודה
  "col_222": "ערך 2",
  "col_333": 100             // מספרים/בוליאנים OK
}

// ⚠️ חשוב: כל שורה חייבת id ייחודי!
// המערכת משתמשת ב-id לזיהוי סגנונות,
// הערות ומיזוגים`}</pre>
                    </CardContent>
                  </Card>

                  <Card className="bg-slate-50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">סגנונות תאים (cell_styles)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <pre className="bg-white p-3 rounded text-xs overflow-x-auto" dir="ltr">
{`{
  "row_123_col_456": {
    "backgroundColor": "#fee2e2",
    "color": "#991b1b",
    "fontWeight": "bold",
    "opacity": 100
  }
}

// מפתח: rowId_colKey
// מחבר בין שורה לעמודה`}</pre>
                    </CardContent>
                  </Card>

                  <Card className="bg-slate-50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">תאים ממוזגים (merged_cells)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <pre className="bg-white p-3 rounded text-xs overflow-x-auto" dir="ltr">
{`{
  "merge_123456": {
    "cells": [               // כל התאים במיזוג
      "row_1_col_a",
      "row_1_col_b",
      "row_2_col_a",
      "row_2_col_b"
    ],
    "master": "row_1_col_a", // תא ראשי
    "rowspan": 2,            // כמה שורות
    "colspan": 2             // כמה עמודות
  }
}`}</pre>
                    </CardContent>
                  </Card>
                </div>

                <Card className="bg-green-50 border-green-200">
                  <CardHeader>
                    <CardTitle className="text-green-800 flex items-center gap-2">
                      <Zap className="w-5 h-5" />
                      פונקציות מתקדמות
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {[
                        { name: 'סגנונות תאים', desc: 'צבע רקע, טקסט, הדגשה' },
                        { name: 'הערות (פתקיות)', desc: 'הערות צהובות על תאים' },
                        { name: 'מיזוג תאים', desc: 'איחוד תאים לתא אחד' },
                        { name: 'מיזוג כותרות', desc: 'כותרות עליונות משותפות' },
                        { name: 'כותרות משנה', desc: 'שורה נוספת מעל/מתחת' },
                        { name: 'הקפאת שורות/עמודות', desc: 'סקרול עם header קבוע' },
                        { name: 'תגובות (צ\'אט)', desc: 'דיונים על תאים' },
                        { name: 'גרפים', desc: 'ויזואליזציות מנתוני הטבלה' },
                        { name: 'תצוגות שמורות', desc: 'שמירת הגדרות עמודות' },
                        { name: 'ייבוא/ייצוא', desc: 'CSV, Excel, Google Sheets' },
                        { name: 'סנכרון Google', desc: 'חיבור דו-כיווני' },
                        { name: 'עיצוב נושאי', desc: 'פלטות צבעים ופונטים' },
                      ].map(feature => (
                        <div key={feature.name} className="bg-white p-3 rounded border">
                          <div className="font-bold text-green-800">{feature.name}</div>
                          <div className="text-sm text-green-700">{feature.desc}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Restore Tab */}
          <TabsContent value="restore" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="w-5 h-5 text-green-600" />
                  הנחיות לשחזור מגיבוי
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                
                <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                  <h4 className="font-bold text-red-900 mb-2 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    חשוב לפני שחזור!
                  </h4>
                  <ul className="space-y-2 text-red-800">
                    <li>• גבה את הנתונים הנוכחיים לפני שחזור</li>
                    <li>• ודא שמבנה קובץ הגיבוי תקין (JSON valid)</li>
                    <li>• בדוק שכל ה-IDs ייחודיים</li>
                    <li>• שחזר בסדר נכון: קודם Client, אז Project, אז Task וכו'</li>
                  </ul>
                </div>

                <div className="space-y-4">
                  <h3 className="font-bold text-lg">סדר שחזור מומלץ</h3>
                  
                  <div className="space-y-3">
                    {[
                      { num: 1, entity: 'GlobalDataType', reason: 'סוגי נתונים (שלבים, טאבה) - אין תלויות' },
                      { num: 2, entity: 'TeamMember', reason: 'עובדים - אין תלויות, נדרש ל-TimeLog' },
                      { num: 3, entity: 'Client', reason: 'לקוחות - בסיס לכל הישויות' },
                      { num: 4, entity: 'Project', reason: 'פרויקטים - תלוי ב-Client' },
                      { num: 5, entity: 'Task', reason: 'משימות - תלוי ב-Client, Project' },
                      { num: 6, entity: 'SubTask', reason: 'תת-משימות - תלוי ב-Project' },
                      { num: 7, entity: 'TimeLog', reason: 'לוגי זמן - תלוי ב-Client, Project, Task, TeamMember' },
                      { num: 8, entity: 'Meeting', reason: 'פגישות - תלוי ב-Client, Project' },
                      { num: 9, entity: 'Quote', reason: 'הצעות מחיר - תלוי ב-Client' },
                      { num: 10, entity: 'Invoice', reason: 'חשבוניות - תלוי ב-Client, Project' },
                      { num: 11, entity: 'CustomSpreadsheet', reason: 'טבלאות - תלוי ב-Client, GlobalDataType' },
                      { num: 12, entity: 'Reminder', reason: 'תזכורות - יכולות להתייחס לכל ישות' },
                      { num: 13, entity: 'SheetComment', reason: 'תגובות על טבלאות - תלוי ב-CustomSpreadsheet' },
                    ].map(step => (
                      <div key={step.num} className="flex items-start gap-3 p-3 bg-white rounded-lg border">
                        <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold flex-shrink-0">
                          {step.num}
                        </div>
                        <div className="flex-1">
                          <div className="font-bold text-slate-800">{step.entity}</div>
                          <div className="text-sm text-slate-600">{step.reason}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <Card className="bg-green-50 border-green-200">
                  <CardHeader>
                    <CardTitle className="text-green-800">דוגמת שחזור ב-JavaScript</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="bg-slate-900 text-green-400 p-4 rounded-lg text-xs overflow-x-auto" dir="ltr">
{`// קריאת קובץ גיבוי
const backup = JSON.parse(backupFileContent);

// בדיקת תקינות
if (backup._validation && !backup._validation.all_valid) {
  console.warn('⚠️ Validation issues detected:', 
    backup._validation.report);
}

// שחזור ישויות בסדר הנכון
const entitiesToRestore = [
  'GlobalDataType',
  'TeamMember', 
  'Client',
  'Project',
  'Task',
  'TimeLog',
  'Meeting',
  'Quote',
  'Invoice',
  'CustomSpreadsheet'
];

for (const entityName of entitiesToRestore) {
  const records = backup.data[entityName];
  
  if (!Array.isArray(records) || records.length === 0) {
    console.log(\`⏭️  Skipping \${entityName} (no data)\`);
    continue;
  }
  
  console.log(\`📥 Restoring \${entityName}: \${records.length} records\`);
  
  for (const record of records) {
    try {
      // הסר שדות מערכת שנוצרים אוטומטית
      const { created_date, updated_date, ...cleanData } = record;
      
      await base44.entities[entityName].create(cleanData);
    } catch (error) {
      console.error(\`❌ Failed to restore \${entityName}.\${record.id}:\`, error);
    }
  }
}

console.log('✅ Restore completed');`}</pre>
                  </CardContent>
                </Card>

                <Card className="bg-purple-50 border-purple-200">
                  <CardHeader>
                    <CardTitle className="text-purple-800">שחזור טבלאות מותאמות</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="bg-slate-900 text-purple-400 p-4 rounded-lg text-xs overflow-x-auto" dir="ltr">
{`// טבלאות דורשות טיפול מיוחד
const spreadsheets = backup.data.CustomSpreadsheet;

for (const sheet of spreadsheets) {
  // ודא שכל השדות החיוניים קיימים
  const required = ['columns', 'rows_data'];
  const missing = required.filter(f => !sheet[f]);
  
  if (missing.length > 0) {
    console.error(\`❌ Missing fields: \${missing.join(', ')}\`);
    continue;
  }
  
  // ודא שכל שורה מכילה ID
  const rowsWithoutId = sheet.rows_data.filter(r => !r?.id);
  if (rowsWithoutId.length > 0) {
    console.warn(\`⚠️  \${rowsWithoutId.length} rows without ID, generating...\`);
    sheet.rows_data = sheet.rows_data.map((r, i) => ({
      ...r,
      id: r.id || \`row_restored_\${Date.now()}_\${i}\`
    }));
  }
  
  // ודא שכל עמודה מכילה key ו-title
  sheet.columns = sheet.columns.map((col, i) => ({
    ...col,
    key: col.key || \`col_restored_\${Date.now()}_\${i}\`,
    title: col.title || \`Column \${i + 1}\`,
    visible: col.visible !== false
  }));
  
  // שחזר את הטבלה
  await base44.entities.CustomSpreadsheet.create({
    name: sheet.name,
    description: sheet.description,
    client_id: sheet.client_id,
    client_name: sheet.client_name,
    columns: sheet.columns,
    rows_data: sheet.rows_data,
    cell_styles: sheet.cell_styles || {},
    cell_notes: sheet.cell_notes || {},
    cell_metadata: sheet.cell_metadata || {},
    merged_cells: sheet.merged_cells || {},
    merged_headers: sheet.merged_headers || {},
    sub_headers: sheet.sub_headers || {},
    header_styles: sheet.header_styles || {},
    theme_settings: sheet.theme_settings,
    charts: sheet.charts || [],
    saved_views: sheet.saved_views || [],
    freeze_settings: sheet.freeze_settings,
    custom_stage_options: sheet.custom_stage_options,
    // שים לב: google_sheet_id לא משוחזר אוטומטית
    // יש לחבר מחדש דרך הממשק
  });
  
  console.log(\`✅ Restored spreadsheet: \${sheet.name}\`);
}`}</pre>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">שחזור למערכת אחרת (Excel/CSV)</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="text-sm space-y-2">
                        <p className="font-bold">קובץ JSON:</p>
                        <ol className="space-y-1 pr-4">
                          <li>1. פתח את backup.data[EntityName]</li>
                          <li>2. כל רשומה היא שורה בטבלה</li>
                          <li>3. השתמש ב-JSON→CSV converter</li>
                        </ol>
                        
                        <p className="font-bold mt-3">קובץ Excel/CSV:</p>
                        <ol className="space-y-1 pr-4">
                          <li>1. כל גיליון = ישות אחת</li>
                          <li>2. שורה ראשונה = כותרות</li>
                          <li>3. עמודת _entity_type מזהה את הסוג</li>
                        </ol>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">אימות תקינות הנתונים</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm space-y-2">
                        <p>בקובץ הגיבוי תמצא מידע ב-<code className="bg-slate-100 px-1">_validation</code>:</p>
                        <pre className="bg-slate-100 p-2 rounded text-xs" dir="ltr">
{`{
  "all_valid": true/false,
  "total_issues": 0,
  "report": {
    "TimeLog": {
      "total": 150,
      "issues": null,
      "status": "valid"
    }
  }
}`}</pre>
                        <p className="text-amber-700 font-bold">
                          ⚠️ אם all_valid = false, בדוק את ה-report לפני שחזור
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>דוגמאות לבעיות נפוצות ופתרונות</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="border-r-4 border-red-500 pr-4">
                        <h5 className="font-bold text-red-700">❌ בעיה: TimeLog ללא עובד משויך</h5>
                        <p className="text-sm text-slate-600 mt-1">
                          <code>user_email</code> ו-<code>created_by</code> ריקים
                        </p>
                        <p className="text-sm text-green-700 mt-2">
                          ✅ פתרון: השתמש ב-<code>created_by</code> מהמערכת או קבע ידנית עובד ברירת מחדל
                        </p>
                      </div>

                      <div className="border-r-4 border-amber-500 pr-4">
                        <h5 className="font-bold text-amber-700">⚠️ בעיה: CustomSpreadsheet ללא rows_data</h5>
                        <p className="text-sm text-slate-600 mt-1">
                          טבלה ללא שורות נתונים
                        </p>
                        <p className="text-sm text-green-700 mt-2">
                          ✅ פתרון: צור טבלה ריקה או דלג על השחזור (טבלת Template)
                        </p>
                      </div>

                      <div className="border-r-4 border-blue-500 pr-4">
                        <h5 className="font-bold text-blue-700">💡 טיפ: קישורים שבורים</h5>
                        <p className="text-sm text-slate-600 mt-1">
                          Project עם client_id שלא קיים
                        </p>
                        <p className="text-sm text-green-700 mt-2">
                          ✅ פתרון: השתמש ב-<code>client_name</code> כ-fallback, או צור לקוח חדש לפי השם
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-blue-600" />
                  מבנה קובץ הגיבוי
                </CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="bg-slate-900 text-cyan-400 p-4 rounded-lg text-xs overflow-x-auto" dir="ltr">
{`{
  "_backup_metadata": {
    "generated_at": "2026-01-25T10:00:00.000Z",
    "generated_by": "user@example.com",
    "version": "2.0",
    "app_name": "CRM Tannenbaum",
    "format": "structured_backup",
    "restore_instructions": { ... }
  },
  
  "_data_schemas": {
    "Client": {
      "primary_key": "id",
      "fields": [...],
      "relations": [],
      "description": "לקוחות המערכת"
    },
    "TimeLog": {
      "primary_key": "id",
      "fields": [...],
      "relations": [
        "client_id → Client.id",
        "user_email → TeamMember.email"
      ],
      "description": "רישומי שעות עבודה"
    }
    // ... all entities
  },
  
  "_validation": {
    "performed_at": "2026-01-25T10:00:00.000Z",
    "all_valid": true,
    "total_issues": 0,
    "report": { ... }
  },
  
  "statistics": {
    "total_records": 1250,
    "categories_exported": [...],
    "records_per_category": { ... }
  },
  
  "data": {
    "Client": [ {...}, {...}, ... ],
    "Project": [ {...}, {...}, ... ],
    "TimeLog": [ {...}, {...}, ... ],
    "CustomSpreadsheet": [ {...}, {...}, ... ]
    // ... all entities
  },
  
  "spreadsheet_documentation": { ... },
  "spreadsheet_details": [ ... ],
  "employee_time_summary": [ ... ]
}`}</pre>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>שחזור מהיר - סקריפט מוכן</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-slate-600">העתק את הקוד הזה לקונסול הדפדפן בעמוד הגיבוי:</p>
                <div className="relative">
                  <Button 
                    size="sm" 
                    variant="ghost"
                    className="absolute top-2 left-2 z-10"
                    onClick={() => copyToClipboard(restoreScript)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  <pre className="bg-slate-900 text-green-400 p-4 rounded-lg text-xs overflow-x-auto pt-12" dir="ltr">
{restoreScript}</pre>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <Card className="bg-gradient-to-r from-amber-50 to-purple-50 border-2 border-amber-200">
          <CardContent className="p-6 text-center">
            <Building2 className="w-12 h-12 mx-auto text-amber-600 mb-4" />
            <h3 className="font-bold text-xl text-slate-800 mb-2">CRM Tannenbaum</h3>
            <p className="text-slate-600">מערכת ניהול לקוחות ופרויקטים מתקדמת</p>
            <p className="text-sm text-slate-500 mt-2">גרסת מערכת: 2.0 | תיעוד נוצר אוטומטית</p>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}

const restoreScript = `// סקריפט שחזור מהיר
async function restoreFromBackup(backupData) {
  const order = [
    'GlobalDataType', 'TeamMember', 'Client', 'Project', 
    'Task', 'SubTask', 'TimeLog', 'Meeting', 'Quote', 
    'Invoice', 'CustomSpreadsheet'
  ];
  
  let restored = 0;
  let failed = 0;
  
  for (const entity of order) {
    const records = backupData.data[entity];
    if (!records || records.length === 0) continue;
    
    console.log(\`📥 Restoring \${entity}...\`);
    
    for (const record of records) {
      try {
        const { created_date, updated_date, ...clean } = record;
        await base44.entities[entity].create(clean);
        restored++;
      } catch (e) {
        console.error(\`❌ \${entity}.\${record.id}:\`, e.message);
        failed++;
      }
    }
  }
  
  console.log(\`✅ Done: \${restored} restored, \${failed} failed\`);
  return { restored, failed };
}

// שימוש:
// const backup = await fetch('/backup.json').then(r => r.json());
// await restoreFromBackup(backup);`;