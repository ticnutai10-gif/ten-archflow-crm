
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Users, Eye, Lock, CheckCircle2, XCircle, Crown, Star, Briefcase, UserCircle, ChevronDown } from "lucide-react";

const ROLES_INFO = [
  {
    role: "super_admin",
    icon: Crown,
    label: "מנהל על",
    color: "purple",
    description: "הרשאות מלאות ללא הגבלה",
    permissions: [
      { text: "גישה לכל הלקוחות והפרויקטים", allowed: true },
      { text: "ניהול משתמשים והרשאות", allowed: true },
      { text: "הגדרות מערכת", allowed: true },
      { text: "מחיקת נתונים", allowed: true },
      { text: "גישה לפורטל לקוח", allowed: false }
    ],
    useCase: "למייסדי החברה או מנהלי IT",
    example: "משה - בעלים, רואה ומנהל הכל"
  },
  {
    role: "admin",
    icon: Shield,
    label: "מנהל",
    color: "indigo",
    description: "הרשאות ניהול מלאות",
    permissions: [
      { text: "גישה לכל הלקוחות והפרויקטים", allowed: true },
      { text: "ניהול משתמשים והרשאות", allowed: true },
      { text: "הגדרות מערכת", allowed: true },
      { text: "מחיקת נתונים", allowed: true },
      { text: "גישה לפורטל לקוח", allowed: false }
    ],
    useCase: "למנהלי המשרד",
    example: "דנה - מנהלת המשרד, מנהלת את כל הצוות"
  },
  {
    role: "manager_plus",
    icon: Star,
    label: "מנהל פלוס",
    color: "blue",
    description: "רואה הכל, מנהל חלקי",
    permissions: [
      { text: "גישה לכל הלקוחות והפרויקטים", allowed: true },
      { text: "יצירה ועריכה של לקוחות ופרויקטים", allowed: true },
      { text: "ניהול משתמשים", allowed: false },
      { text: "הגדרות מערכת", allowed: false },
      { text: "גישה לפורטל לקוח", allowed: false }
    ],
    useCase: "למנהלי פרויקטים בכירים שצריכים ראייה כוללת",
    example: "יוסי - מנהל פרויקטים ראשי, רואה הכל אבל לא משנה הגדרות"
  },
  {
    role: "staff",
    icon: Briefcase,
    label: "עובד",
    color: "green",
    description: "גישה מוגבלת ללקוחות ופרויקטים שמשויכים אליו",
    permissions: [
      { text: "רואה רק לקוחות ופרויקטים שהוקצו לו", allowed: true },
      { text: "יכול לערוך את הלקוחות והפרויקטים שלו", allowed: true },
      { text: "לא רואה לקוחות של עובדים אחרים", allowed: false },
      { text: "אין גישה להגדרות", allowed: false },
      { text: "גישה לפורטל לקוח", allowed: false }
    ],
    useCase: "לעובדים רגילים במשרד",
    example: "שרה - אדריכלית, רואה רק את 5 הפרויקטים שהוקצו לה"
  },
  {
    role: "client",
    icon: UserCircle,
    label: "לקוח",
    color: "emerald",
    description: "גישה מוגבלת דרך פורטל הלקוח בלבד",
    permissions: [
      { text: "רואה רק את הפרויקטים שלו", allowed: true },
      { text: "יכול להעלות קבצים ולשלוח הודעות", allowed: true },
      { text: "אישור תכניות ושינויים", allowed: true },
      { text: "אין גישה למערכת הניהול", allowed: false },
      { text: "אין גישה ללקוחות אחרים", allowed: false }
    ],
    useCase: "ללקוחות שרוצים לעקוב אחר הפרויקט",
    example: "אבי כהן - לקוח, רואה רק את דירתו בתכנון"
  }
];

const colorClasses = {
  purple: {
    bg: "bg-purple-50",
    text: "text-purple-700",
    border: "border-purple-200",
    badge: "bg-purple-100 text-purple-800"
  },
  indigo: {
    bg: "bg-indigo-50",
    text: "text-indigo-700",
    border: "border-indigo-200",
    badge: "bg-indigo-100 text-indigo-800"
  },
  blue: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
    badge: "bg-blue-100 text-blue-800"
  },
  green: {
    bg: "bg-green-50",
    text: "text-green-700",
    border: "border-green-200",
    badge: "bg-green-100 text-green-800"
  },
  emerald: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    badge: "bg-emerald-100 text-emerald-800"
  }
};

// רכיב אקורדיון בודד
function RoleAccordion({ role, index }) {
  const [isOpen, setIsOpen] = useState(false);
  const Icon = role.icon;
  const colors = colorClasses[role.color];
  
  return (
    <div className={`border-2 ${colors.border} rounded-lg overflow-hidden`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`${colors.bg} px-6 py-4 w-full hover:opacity-90 transition-opacity`}
      >
        <div className="flex items-center gap-4 w-full">
          <Icon className={`w-6 h-6 ${colors.text}`} />
          <div className="flex-1 text-right">
            <div className="font-bold text-lg">{role.label}</div>
            <div className="text-sm text-slate-600 font-normal">{role.description}</div>
          </div>
          <Badge className={colors.badge}>{index + 1}</Badge>
          <ChevronDown 
            className={`w-5 h-5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </button>
      
      {isOpen && (
        <div className="px-6 py-4 bg-white animate-in slide-in-from-top-2 duration-200">
          <div className="space-y-4">
            {/* מקרה שימוש */}
            <div>
              <div className="font-semibold text-slate-700 mb-2 flex items-center gap-2">
                <Star className="w-4 h-4" />
                מתי להשתמש:
              </div>
              <p className="text-slate-600 bg-slate-50 p-3 rounded-lg">{role.useCase}</p>
            </div>

            {/* דוגמה */}
            <div>
              <div className="font-semibold text-slate-700 mb-2 flex items-center gap-2">
                <Users className="w-4 h-4" />
                דוגמה:
              </div>
              <p className="text-slate-600 bg-amber-50 p-3 rounded-lg border border-amber-200">
                💡 {role.example}
              </p>
            </div>

            {/* הרשאות */}
            <div>
              <div className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                הרשאות:
              </div>
              <div className="space-y-2">
                {role.permissions.map((perm, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 bg-slate-50 rounded">
                    {perm.allowed ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-slate-300 flex-shrink-0" />
                    )}
                    <span className={perm.allowed ? 'text-slate-700' : 'text-slate-400'}>
                      {perm.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function RolesExplainer({ compact = false }) {
  if (compact) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" dir="rtl">
        {ROLES_INFO.map((role) => {
          const Icon = role.icon;
          const colors = colorClasses[role.color];
          
          return (
            <Card key={role.role} className={`${colors.border} border-2`}>
              <CardHeader className={colors.bg}>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Icon className={`w-5 h-5 ${colors.text}`} />
                  <span>{role.label}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-2">
                <p className="text-sm text-slate-600">{role.description}</p>
                <Badge className={colors.badge}>{role.useCase}</Badge>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      <Card className="border-2 border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-600" />
            מדריך הרשאות - הבנת התפקידים
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-slate-700 leading-relaxed">
              המערכת מאפשרת 5 סוגי תפקידים שונים. כל תפקיד מגדיר מה המשתמש יכול לראות ולעשות במערכת.
            </p>
            
            <div className="bg-white border-2 border-blue-300 rounded-lg p-4">
              <h4 className="font-bold text-blue-800 mb-3">💡 ההבדלים המרכזיים:</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span><strong>מנהלים:</strong> רואים ועורכים הכל ללא הגבלה</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <span><strong>מנהלי פלוס:</strong> רואים הכל אבל לא מנהלים משתמשים</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <span><strong>עובדים:</strong> רואים <u>רק</u> לקוחות ופרויקטים שמשויכים אליהם</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span><strong>לקוחות:</strong> גישה רק דרך פורטל הלקוח - רואים רק את הפרויקטים שלהם</span>
                </li>
              </ul>
            </div>

            <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-4">
              <h4 className="font-bold text-amber-800 mb-3">🎯 מה עובדים יכולים לעשות?</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>ליצור לקוחות חדשים (ישויכו אליהם אוטומטית)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>ליצור פרויקטים ללקוחות המשויכים אליהם</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>להפעיל טיימר עבור הלקוחות שלהם</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>לראות את כל לוגי הזמן של הלקוחות המשויכים</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>לערוך ולעדכן את הלקוחות והפרויקטים שלהם</span>
                </li>
                <li className="flex items-start gap-2">
                  <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <span>לא רואים לקוחות של עובדים אחרים</span>
                </li>
                <li className="flex items-start gap-2">
                  <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <span>לא יכולים לנהל הרשאות או הגדרות מערכת</span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {ROLES_INFO.map((role, index) => (
          <RoleAccordion key={role.role} role={role} index={index} />
        ))}
      </div>

      {/* סיכום השוואתי */}
      <Card className="border-2 border-slate-200">
        <CardHeader className="bg-slate-50">
          <CardTitle className="text-lg">טבלת השוואה מהירה</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" dir="rtl">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-3 text-right font-semibold border-b">תכונה</th>
                  <th className="p-3 text-center font-semibold border-b">מנהל על</th>
                  <th className="p-3 text-center font-semibold border-b">מנהל</th>
                  <th className="p-3 text-center font-semibold border-b">מנהל פלוס</th>
                  <th className="p-3 text-center font-semibold border-b">עובד</th>
                  <th className="p-3 text-center font-semibold border-b">לקוח</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="p-3 font-medium">רואה את כל הלקוחות</td>
                  <td className="p-3 text-center"><CheckCircle2 className="w-5 h-5 text-green-500 mx-auto" /></td>
                  <td className="p-3 text-center"><CheckCircle2 className="w-5 h-5 text-green-500 mx-auto" /></td>
                  <td className="p-3 text-center"><CheckCircle2 className="w-5 h-5 text-green-500 mx-auto" /></td>
                  <td className="p-3 text-center"><XCircle className="w-5 h-5 text-slate-300 mx-auto" /></td>
                  <td className="p-3 text-center"><XCircle className="w-5 h-5 text-slate-300 mx-auto" /></td>
                </tr>
                <tr className="border-b">
                  <td className="p-3 font-medium">מנהל הרשאות</td>
                  <td className="p-3 text-center"><CheckCircle2 className="w-5 h-5 text-green-500 mx-auto" /></td>
                  <td className="p-3 text-center"><CheckCircle2 className="w-5 h-5 text-green-500 mx-auto" /></td>
                  <td className="p-3 text-center"><XCircle className="w-5 h-5 text-slate-300 mx-auto" /></td>
                  <td className="p-3 text-center"><XCircle className="w-5 h-5 text-slate-300 mx-auto" /></td>
                  <td className="p-3 text-center"><XCircle className="w-5 h-5 text-slate-300 mx-auto" /></td>
                </tr>
                <tr className="border-b">
                  <td className="p-3 font-medium">מוגבל ללקוחות ספציפיים</td>
                  <td className="p-3 text-center"><XCircle className="w-5 h-5 text-slate-300 mx-auto" /></td>
                  <td className="p-3 text-center"><XCircle className="w-5 h-5 text-slate-300 mx-auto" /></td>
                  <td className="p-3 text-center"><XCircle className="w-5 h-5 text-slate-300 mx-auto" /></td>
                  <td className="p-3 text-center"><CheckCircle2 className="w-5 h-5 text-green-500 mx-auto" /></td>
                  <td className="p-3 text-center"><CheckCircle2 className="w-5 h-5 text-green-500 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="p-3 font-medium">גישה לפורטל לקוח</td>
                  <td className="p-3 text-center"><XCircle className="w-5 h-5 text-slate-300 mx-auto" /></td>
                  <td className="p-3 text-center"><XCircle className="w-5 h-5 text-slate-300 mx-auto" /></td>
                  <td className="p-3 text-center"><XCircle className="w-5 h-5 text-slate-300 mx-auto" /></td>
                  <td className="p-3 text-center"><XCircle className="w-5 h-5 text-slate-300 mx-auto" /></td>
                  <td className="p-3 text-center"><CheckCircle2 className="w-5 h-5 text-green-500 mx-auto" /></td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
