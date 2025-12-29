import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ExternalLink, 
  FileSpreadsheet, 
  Download,
  AlertTriangle,
  Check,
  Copy,
  Info,
  ChevronDown,
  ChevronUp,
  Settings,
  Upload,
  RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { Textarea } from "@/components/ui/textarea";

export default function GoogleSheetsManager({ clients = [], onRefresh }) {
  const [isExporting, setIsExporting] = useState(false);
  const [serviceAccountEmail, setServiceAccountEmail] = useState(null);
  const [jsonInput, setJsonInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  
  // מצב מזעור/הרחבה עם שמירה ב-localStorage
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem('google-sheets-manager-collapsed') === 'true';
    } catch {
      return false; // ברירת מחדל - מורחב
    }
  });

  // שמירת המצב ב-localStorage כאשר משתנה
  const toggleCollapsed = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    try {
      localStorage.setItem('google-sheets-manager-collapsed', newState.toString());
    } catch (e) {
      console.warn('Failed to save Google Sheets Manager collapsed state:', e);
    }
  };

  // Fetch Service Account Email on mount
  React.useEffect(() => {
    const fetchEmail = async () => {
      try {
        const { data } = await base44.functions.invoke('googleSheets', { action: 'getServiceAccountEmail' });
        if (data.success && data.email) {
          setServiceAccountEmail(data.email);
        }
      } catch (e) {
        console.warn('Failed to fetch service account email', e);
      }
    };
    if (!isCollapsed) {
        fetchEmail();
    }
  }, [isCollapsed]);

  const handleSaveJson = async () => {
    if (!jsonInput.trim()) return;
    setIsSaving(true);
    try {
        let json;
        try {
            json = JSON.parse(jsonInput);
        } catch (e) {
            toast.error("קובץ ה-JSON אינו תקין");
            setIsSaving(false);
            return;
        }

        const { data } = await base44.functions.invoke('googleSheets', { 
            action: 'saveServiceAccount',
            json 
        });

        if (data.success) {
            toast.success("פרטי החשבון נשמרו בהצלחה!");
            setServiceAccountEmail(data.email);
            setJsonInput("");
        } else {
            toast.error(data.error || "שגיאה בשמירה");
        }
    } catch (e) {
        toast.error("שגיאה בשמירה: " + e.message);
    } finally {
        setIsSaving(false);
    }
  };

  // פתרון חלופי - ייצוא CSV וייבוא ידני
  const exportToCSV = () => {
    setIsExporting(true);
    
    try {
      const baseHeaders = [
        'שם', 'טלפון', 'אימייל', 'חברה', 'כתובת',
        'סטטוס', 'מקור הגעה', 'טווח תקציב', 'הערות', 'תאריך יצירה'
      ];

      // הוספת שדות מותאמים
      const customFields = new Set();
      clients.forEach(client => {
        if (client.custom_data && customFields.size < 15) {
          Object.keys(client.custom_data).forEach(key => {
            if (customFields.size < 15) {
              customFields.add(key);
            }
          });
        }
      });

      const headers = [...baseHeaders, ...Array.from(customFields)];

      const csvData = [
        headers.join(','),
        ...clients.map(client => {
          const row = [
            client.name || '',
            client.phone || '',
            client.email || '',
            client.company || '',
            client.address || '',
            client.status || '',
            client.source || '',
            client.budget_range || '',
            client.notes || '',
            client.created_date ? new Date(client.created_date).toLocaleDateString('he-IL') : ''
          ];

          // הוספת שדות מותאמים
          Array.from(customFields).forEach(field => {
            row.push(client.custom_data?.[field] || '');
          });

          return row.map(field => `"${field}"`).join(',');
        })
      ].join('\n');

      const blob = new Blob(['\uFEFF' + csvData], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `לקוחות-CRM-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("קובץ CSV נוצר בהצלחה! כעת תוכל להעלות אותו ל-Google Sheets");
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast.error('שגיאה בייצוא הקובץ');
    } finally {
      setIsExporting(false);
    }
  };

  const copySheetUrl = () => {
    const url = "https://docs.google.com/spreadsheets/d/11cHX_TgtMHsnBogdrEdGpdlqsnIZIJGumnP1_XdED2Q/edit?usp=sharing";
    navigator.clipboard.writeText(url);
    toast.success("כתובת הגיליון הועתקה!");
  };

  return (
    <div className="space-y-6">
      <Card className="border-blue-200 bg-blue-50/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileSpreadsheet className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Google Sheets - עבודה ידנית</CardTitle>
                <p className="text-sm text-slate-600">
                  ייצוא וייבוא נתונים עם Google Sheets שלך
                </p>
              </div>
            </div>
            
            {/* כפתור מזעור/הרחבה */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleCollapsed}
              className="text-slate-500 hover:text-slate-700"
              title={isCollapsed ? "הרחב" : "מזער"}
            >
              {isCollapsed ? (
                <ChevronDown className="w-5 h-5" />
              ) : (
                <ChevronUp className="w-5 h-5" />
              )}
            </Button>
          </div>
        </CardHeader>

        {/* תוכן הקארד - מוצג רק אם לא מזוער */}
        {!isCollapsed && (
          <CardContent className="space-y-4">
            <Tabs defaultValue="export" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="export">ייצוא נתונים</TabsTrigger>
                <TabsTrigger value="connect">התחברות לגיליון</TabsTrigger>
                <TabsTrigger value="service_account">חשבון שירות</TabsTrigger>
                <TabsTrigger value="troubleshoot">פתרון בעיות</TabsTrigger>
              </TabsList>
              
              <TabsContent value="export" className="space-y-4">
                <div className="text-center py-6">
                  <FileSpreadsheet className="w-12 h-12 text-blue-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-700 mb-2">
                    ייצא נתונים ל-Google Sheets
                  </h3>
                  <p className="text-slate-600 mb-6">
                    ייצא את כל הלקוחות לקובץ CSV ואז העלה אותו ל-Google Sheets
                  </p>
                  <Button 
                    onClick={exportToCSV}
                    disabled={isExporting || clients.length === 0}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isExporting ? (
                      'מייצא...'
                    ) : (
                      <>
                        <Download className="w-4 h-4 ml-2" />
                        ייצא CSV ({clients.length} לקוחות)
                      </>
                    )}
                  </Button>
                </div>

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>איך להעלות ל-Google Sheets?</AlertTitle>
                  <AlertDescription>
                    <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
                      <li>לחץ על "ייצא CSV" למעלה</li>
                      <li>פתח את Google Sheets בדפדפן</li>
                      <li>לחץ על "קובץ" → "ייבוא"</li>
                      <li>גרור את קובץ ה-CSV שהורדת</li>
                      <li>בחר "החלף גיליון נוכחי" ולחץ על "ייבוא נתונים"</li>
                    </ol>
                  </AlertDescription>
                </Alert>
              </TabsContent>

              <TabsContent value="connect" className="space-y-4">
                <div className="space-y-4">
                  <h3 className="font-semibold">הגיליון שלך</h3>
                  <div className="p-4 bg-white rounded-lg border">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Google Sheets CRM</p>
                        <p className="text-sm text-slate-500">הגיליון הפרטי שלך</p>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={copySheetUrl}
                        >
                          <Copy className="w-4 h-4 ml-1" />
                          העתק קישור
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => window.open("https://docs.google.com/spreadsheets/d/11cHX_TgtMHsnBogdrEdGpdlqsnIZIJGumnP1_XdED2Q/edit?usp=sharing", '_blank')}
                        >
                          <ExternalLink className="w-4 h-4 ml-1" />
                          פתח גיליון
                        </Button>
                      </div>
                    </div>
                  </div>

                  <Alert>
                    <Check className="h-4 w-4 text-green-600" />
                    <AlertTitle className="text-green-800">הגיליון מחובר</AlertTitle>
                    <AlertDescription className="text-green-700">
                      תוכל לערוך נתונים ישירות בגיליון Google Sheets שלך
                    </AlertDescription>
                  </Alert>
                </div>
              </TabsContent>

              <TabsContent value="service_account" className="space-y-4">
                <div className="bg-white p-4 rounded-lg border space-y-4">
                    <div>
                        <h3 className="text-lg font-semibold mb-2">הגדרת חשבון שירות (Service Account)</h3>
                        <p className="text-sm text-slate-600 mb-4">
                            כדי לאפשר לאפליקציה לגשת ל-Google Sheets באופן אוטומטי, יש להעלות קובץ מפתח JSON של חשבון שירות.
                        </p>
                    </div>

                    {serviceAccountEmail && (
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-xs text-blue-800 font-semibold mb-1">כתובת האימייל לשיתוף:</p>
                            <div className="flex items-center gap-2">
                                <code className="flex-1 bg-white p-2 rounded border text-xs overflow-hidden text-ellipsis">
                                    {serviceAccountEmail}
                                </code>
                                <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => {
                                        navigator.clipboard.writeText(serviceAccountEmail);
                                        toast.success("הכתובת הועתקה!");
                                    }}
                                >
                                    <Copy className="w-4 h-4" />
                                </Button>
                            </div>
                            <p className="text-xs text-blue-600 mt-2">
                                * יש לשתף את הגיליון (Share) עם כתובת זו בהרשאת "Editor".
                            </p>
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-sm font-medium">הדבק תוכן קובץ JSON כאן:</label>
                        <Textarea 
                            value={jsonInput}
                            onChange={(e) => setJsonInput(e.target.value)}
                            placeholder='{"type": "service_account", ...}'
                            className="font-mono text-xs h-32 text-left ltr"
                            dir="ltr"
                        />
                        <Button 
                            onClick={handleSaveJson} 
                            disabled={isSaving || !jsonInput.trim()}
                            className="w-full"
                        >
                            {isSaving ? <RefreshCw className="w-4 h-4 animate-spin ml-2" /> : <Upload className="w-4 h-4 ml-2" />}
                            שמור הגדרות
                        </Button>
                    </div>
                </div>
              </TabsContent>

              <TabsContent value="troubleshoot" className="space-y-4">
                <Alert className="border-amber-200 bg-amber-50">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertTitle className="text-amber-800">בעיות הרשאות Google API</AlertTitle>
                  <AlertDescription className="text-amber-700">
                    <p className="mb-3">הסיבה לשגיאות הקודמות:</p>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      <li>חשבון השירות של Google לא הוגדר נכון</li>
                      <li>חסרות הרשאות ל-Google Sheets API</li>
                      <li>לא הופעלו ה-APIs הדרושים ב-Google Cloud Console</li>
                    </ul>
                  </AlertDescription>
                </Alert>

                <div className="bg-white p-4 rounded-lg border">
                  <h4 className="font-semibold mb-3">צעדים לתיקון הבעיה:</h4>
                  <ol className="list-decimal list-inside space-y-2 text-sm">
                    <li><strong>כנס ל-Google Cloud Console:</strong> console.cloud.google.com</li>
                    <li><strong>הפעל APIs:</strong> עבור ל-"APIs & Services" → "Library" וחפש והפעל:
                      <ul className="list-disc list-inside ml-4 mt-1">
                        <li>Google Sheets API</li>
                        <li>Google Drive API</li>
                      </ul>
                    </li>
                    <li><strong>בדוק הרשאות Service Account:</strong> עבור ל-"IAM & Admin" → "Service Accounts"</li>
                    <li><strong>הוסף תפקיד:</strong> תן לחשבון השירות תפקיד של "Editor" או "Sheets Editor"</li>
                    <li><strong>בדוק JSON Key:</strong> ודא שה-GOOGLE_SERVICE_ACCOUNT_JSON נכון במשתני הסביבה</li>
                  </ol>
                </div>

                <div className="bg-slate-50 p-3 rounded text-xs">
                  <p><strong>טיפ:</strong> בינתיים, השתמש בפתרון הידני בלשונית "ייצוא נתונים" - זה יעבוד מיד!</p>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        )}
      </Card>
    </div>
  );
}