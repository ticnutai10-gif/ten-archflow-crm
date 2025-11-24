import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Settings, Bug, Bell, Palette, Terminal, AlertCircle, CheckCircle, XCircle, Shield, Play, LayoutDashboard, MessageCircle, Languages } from "lucide-react";
import AppSettings from "@/components/settings/AppSettings";
import RingtoneManager from "@/components/settings/RingtoneManager";
import ThemeManager from "@/components/settings/ThemeManager";
import NotificationSettingsTab from "@/components/settings/NotificationSettingsTab";
import DashboardCustomizer from "@/components/settings/DashboardCustomizer";
import WhatsAppConnector from "@/components/settings/WhatsAppConnector";
import LanguageSelector from "@/components/settings/LanguageSelector";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = React.useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('tab') || 'general';
  });
  const [debugSettings, setDebugSettings] = React.useState(() => {
    try {
      const saved = localStorage.getItem('debug-settings');
      return saved ? JSON.parse(saved) : {
        showDebugButton: true,
        showConsoleButton: true
      };
    } catch {
      return {
        showDebugButton: true,
        showConsoleButton: true
      };
    }
  });

  const [permissionTest, setPermissionTest] = React.useState(null);
  const [testingPermissions, setTestingPermissions] = React.useState(false);

  const saveDebugSettings = (newSettings) => {
    try {
      localStorage.setItem('debug-settings', JSON.stringify(newSettings));
      setDebugSettings(newSettings);
      
      window.dispatchEvent(new CustomEvent('debug-settings-changed', { 
        detail: newSettings 
      }));
      
      toast.success('הגדרות דיבאג נשמרו');
    } catch (e) {
      toast.error('שגיאה בשמירת הגדרות');
    }
  };

  const runPermissionTest = async () => {
    setTestingPermissions(true);
    const results = {
      timestamp: new Date().toISOString(),
      steps: [],
      passed: 0,
      failed: 0,
      warnings: 0
    };

    try {
      // שלב 1: טעינת משתמש נוכחי
      results.steps.push({ name: 'טעינת משתמש נוכחי', status: 'running', details: 'מנסה לטעון את פרטי המשתמש...' });
      setPermissionTest({ ...results });

      let user;
      try {
        user = await base44.auth.me();
        results.steps[0] = {
          name: 'טעינת משתמש נוכחי',
          status: 'success',
          details: `משתמש נטען בהצלחה: ${user.email}`,
          data: {
            email: user.email,
            id: user.id,
            role: user.role,
            full_name: user.full_name
          }
        };
        results.passed++;
      } catch (error) {
        results.steps[0] = {
          name: 'טעינת משתמש נוכחי',
          status: 'error',
          details: `שגיאה בטעינת משתמש: ${error.message}`,
          recommendation: 'המשתמש לא מחובר או שיש בעיית אימות'
        };
        results.failed++;
        setPermissionTest({ ...results });
        setTestingPermissions(false);
        return;
      }

      setPermissionTest({ ...results });

      // שלב 2: חיפוש רשומת AccessControl
      results.steps.push({ name: 'חיפוש רשומת בקרת גישה', status: 'running', details: 'מחפש רשומה ב-AccessControl...' });
      setPermissionTest({ ...results });

      let allRules, myRule;
      try {
        allRules = await base44.entities.AccessControl.list();
        myRule = allRules.find(r => r.email?.toLowerCase() === user.email?.toLowerCase());

        if (myRule) {
          results.steps[1] = {
            name: 'חיפוש רשומת בקרת גישה',
            status: myRule.active ? 'success' : 'warning',
            details: myRule.active ? 
              `נמצאה רשומה פעילה: תפקיד ${myRule.role}` : 
              'נמצאה רשומה אך היא לא פעילה!',
            data: {
              role: myRule.role,
              active: myRule.active,
              assigned_clients: myRule.assigned_clients?.length || 0,
              assigned_projects: myRule.assigned_projects?.length || 0
            },
            recommendation: !myRule.active ? 'יש להפעיל את הרשומה בעמוד בקרת הגישה' : null
          };
          if (myRule.active) results.passed++;
          else results.warnings++;
        } else {
          results.steps[1] = {
            name: 'חיפוש רשומת בקרת גישה',
            status: 'error',
            details: 'לא נמצאה רשומת בקרת גישה למשתמש זה!',
            data: {
              totalRules: allRules.length,
              searchedEmail: user.email
            },
            recommendation: 'יש ליצור רשומת הרשאות חדשה בעמוד בקרת הגישה'
          };
          results.failed++;
        }
      } catch (error) {
        results.steps[1] = {
          name: 'חיפוש רשומת בקרת גישה',
          status: 'error',
          details: `שגיאה בטעינת כללי גישה: ${error.message}`,
          recommendation: 'בדוק אם יש בעיית רשת או הרשאות API'
        };
        results.failed++;
      }

      setPermissionTest({ ...results });

      // שלב 3: בדיקת תפקיד וסוג גישה
      results.steps.push({ name: 'בדיקת תפקיד וסוג גישה', status: 'running', details: 'מנתח את סוג הגישה...' });
      setPermissionTest({ ...results });

      const SUPER_ADMINS = ['jj1212t@gmail.com', 'mali.f.arch2@gmail.com'];
      const isSuperAdmin = SUPER_ADMINS.includes(user.email?.toLowerCase());
      const isAdmin = isSuperAdmin || user.role === 'admin' || myRule?.role === 'admin';
      const isManagerPlus = !isAdmin && myRule?.role === 'manager_plus';
      const isStaff = !isAdmin && !isManagerPlus && myRule?.role === 'staff';
      const isClient = !isAdmin && !isManagerPlus && !isStaff && myRule?.role === 'client';

      let accessType = 'לא מוגדר';
      let expectedAccess = 'אין גישה';

      if (isSuperAdmin) {
        accessType = 'Super Admin';
        expectedAccess = 'גישה מלאה לכל הנתונים';
      } else if (isAdmin) {
        accessType = 'Admin';
        expectedAccess = 'גישה מלאה לכל הנתונים';
      } else if (isManagerPlus) {
        accessType = 'Manager Plus';
        expectedAccess = 'גישה מלאה לנתונים (ללא ניהול משתמשים)';
      } else if (isStaff) {
        accessType = 'Staff (עובד)';
        expectedAccess = `גישה ל-${myRule?.assigned_clients?.length || 0} לקוחות משוייכים`;
      } else if (isClient) {
        accessType = 'Client (לקוח)';
        expectedAccess = 'גישה לפורטל לקוח בלבד';
      }

      results.steps[2] = {
        name: 'בדיקת תפקיד וסוג גישה',
        status: accessType !== 'לא מוגדר' ? 'success' : 'error',
        details: `סוג גישה: ${accessType}`,
        data: {
          accessType,
          expectedAccess,
          isSuperAdmin,
          isAdmin,
          isManagerPlus,
          isStaff,
          isClient
        },
        recommendation: accessType === 'לא מוגדר' ? 'יש להגדיר תפקיד בבקרת הגישה' : null
      };

      if (accessType !== 'לא מוגדר') results.passed++;
      else results.failed++;

      setPermissionTest({ ...results });

      // שלב 4: בדיקה מעשית - טעינת לקוחות
      results.steps.push({ name: 'בדיקה מעשית - טעינת לקוחות', status: 'running', details: 'מנסה לטעון לקוחות בפועל...' });
      setPermissionTest({ ...results });

      try {
        const allClients = await base44.entities.Client.list();
        
        let filteredClients = [];
        if (isAdmin || isManagerPlus || isSuperAdmin) {
          filteredClients = allClients;
        } else if (isStaff && myRule?.assigned_clients) {
          filteredClients = allClients.filter(c => myRule.assigned_clients.includes(c.id));
        } else if (isClient && myRule?.client_id) {
          filteredClients = allClients.filter(c => c.id === myRule.client_id);
        }

        const shouldSeeClients = isAdmin || isManagerPlus || isSuperAdmin || 
          (isStaff && myRule?.assigned_clients?.length > 0) ||
          (isClient && myRule?.client_id);

        results.steps[3] = {
          name: 'בדיקה מעשית - טעינת לקוחות',
          status: shouldSeeClients ? (filteredClients.length > 0 ? 'success' : 'warning') : 'info',
          details: `נטענו ${allClients.length} לקוחות במערכת, ${filteredClients.length} נגישים למשתמש זה`,
          data: {
            totalClients: allClients.length,
            accessibleClients: filteredClients.length,
            shouldSeeClients
          },
          recommendation: shouldSeeClients && filteredClients.length === 0 ? 
            'למרות שיש הרשאות, אין לקוחות משוייכים. יש לשייך לקוחות בעמוד בקרת הגישה' : null
        };

        if (shouldSeeClients && filteredClients.length > 0) results.passed++;
        else if (!shouldSeeClients) results.passed++;
        else results.warnings++;

      } catch (error) {
        results.steps[3] = {
          name: 'בדיקה מעשית - טעינת לקוחות',
          status: 'error',
          details: `שגיאה בטעינת לקוחות: ${error.message}`,
          recommendation: 'בדוק את הרשאות ה-API או חיבור לשרת'
        };
        results.failed++;
      }

      setPermissionTest({ ...results });

      // שלב 5: המלצות מסכמות
      results.steps.push({ name: 'סיכום והמלצות', status: 'info', details: 'מסכם את תוצאות הבדיקה...' });
      
      const recommendations = [];
      
      if (!myRule) {
        recommendations.push({
          type: 'critical',
          message: 'חסרה רשומת בקרת גישה למשתמש זה',
          action: 'עבור לעמוד בקרת גישה ויצור רשומה חדשה עם התפקיד המתאים'
        });
      } else if (!myRule.active) {
        recommendations.push({
          type: 'critical',
          message: 'רשומת בקרת הגישה לא פעילה',
          action: 'עבור לעמוד בקרת גישה והפעל את הרשומה'
        });
      } else if (myRule.role === 'staff' && (!myRule.assigned_clients || myRule.assigned_clients.length === 0)) {
        recommendations.push({
          type: 'warning',
          message: 'עובד ללא לקוחות משוייכים',
          action: 'עבור לעמוד בקרת גישה ושייך לקוחות לעובד זה'
        });
      }

      if (recommendations.length === 0) {
        recommendations.push({
          type: 'success',
          message: 'כל ההרשאות תקינות!',
          action: 'אין פעולות נדרשות'
        });
      }

      results.steps[4] = {
        name: 'סיכום והמלצות',
        status: recommendations.some(r => r.type === 'critical') ? 'error' : 
                recommendations.some(r => r.type === 'warning') ? 'warning' : 'success',
        details: 'ניתוח הושלם',
        data: { recommendations }
      };

      results.passed++;

    } catch (error) {
      results.steps.push({
        name: 'שגיאה כללית',
        status: 'error',
        details: `שגיאה לא צפויה: ${error.message}`,
        recommendation: 'אנא פנה למפתח'
      });
      results.failed++;
    }

    setPermissionTest({ ...results });
    setTestingPermissions(false);
  };

  return (
    <div className="p-6 lg:p-8" dir="rtl">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 text-right">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">הגדרות מערכת</h1>
          <p className="text-slate-600">נהל את הגדרות האפליקציה והעדפות המשתמש</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-slate-200">
          <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl">
            <div className="border-b border-slate-200 px-6">
              <TabsList className="w-full justify-start gap-2 bg-transparent h-auto p-0 flex-wrap">
                <TabsTrigger 
                  value="dashboard" 
                  className="data-[state=active]:bg-[#2C3A50] data-[state=active]:text-white px-6 py-3"
                >
                  <LayoutDashboard className="w-4 h-4 ml-2" />
                  דשבורד
                </TabsTrigger>

                <TabsTrigger 
                  value="notifications" 
                  className="data-[state=active]:bg-[#2C3A50] data-[state=active]:text-white px-6 py-3"
                >
                  <Bell className="w-4 h-4 ml-2" />
                  התראות
                </TabsTrigger>
                
                <TabsTrigger 
                  value="theme" 
                  className="data-[state=active]:bg-[#2C3A50] data-[state=active]:text-white px-6 py-3"
                >
                  <Palette className="w-4 h-4 ml-2" />
                  ערכות נושא
                </TabsTrigger>

                <TabsTrigger 
                  value="whatsapp" 
                  className="data-[state=active]:bg-[#2C3A50] data-[state=active]:text-white px-6 py-3"
                >
                  <MessageCircle className="w-4 h-4 ml-2" />
                  וואטסאפ
                </TabsTrigger>

                <TabsTrigger 
                  value="language" 
                  className="data-[state=active]:bg-[#2C3A50] data-[state=active]:text-white px-6 py-3"
                >
                  <Languages className="w-4 h-4 ml-2" />
                  שפה
                </TabsTrigger>
                
                <TabsTrigger 
                  value="general" 
                  className="data-[state=active]:bg-[#2C3A50] data-[state=active]:text-white px-6 py-3"
                >
                  <Settings className="w-4 h-4 ml-2" />
                  כללי
                </TabsTrigger>
                
                <TabsTrigger 
                  value="ringtone" 
                  className="data-[state=active]:bg-[#2C3A50] data-[state=active]:text-white px-6 py-3"
                >
                  <Bell className="w-4 h-4 ml-2" />
                  רינגטונים
                </TabsTrigger>

                <TabsTrigger 
                  value="debug" 
                  className="data-[state=active]:bg-[#2C3A50] data-[state=active]:text-white px-6 py-3"
                >
                  <Bug className="w-4 h-4 ml-2" />
                  מצב פיתוח
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="p-6">
              <TabsContent value="dashboard" className="mt-0">
                <DashboardCustomizer />
              </TabsContent>

              <TabsContent value="notifications" className="mt-0">
                <NotificationSettingsTab />
              </TabsContent>

              <TabsContent value="theme" className="mt-0">
                <ThemeManager />
              </TabsContent>

              <TabsContent value="whatsapp" className="mt-0">
                <WhatsAppConnector />
              </TabsContent>

              <TabsContent value="language" className="mt-0">
                <LanguageSelector />
              </TabsContent>

              <TabsContent value="general" className="mt-0">
                <AppSettings />
              </TabsContent>

              <TabsContent value="ringtone" className="mt-0">
                <RingtoneManager />
              </TabsContent>

              <TabsContent value="debug" className="space-y-6 mt-0">
                {/* כפתורי דיבאג וקונסול */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Bug className="w-5 h-5 text-purple-600" />
                      כלי פיתוח ודיבאג
                    </CardTitle>
                    <p className="text-sm text-slate-600 mt-2">
                      שלוט בהצגת כפתורי הדיבאג והקונסול הצפים
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* כפתור דיבאג */}
                    <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg border border-purple-200">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <Bug className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900 mb-1">
                            כפתור דיבאג צף
                          </h3>
                          <p className="text-sm text-slate-600">
                            הצג כפתור סגול צף בפינה השמאלית התחתונה למעקב אחר הרשאות, משתמשים ונתונים
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={debugSettings.showDebugButton}
                        onCheckedChange={(checked) => 
                          saveDebugSettings({ ...debugSettings, showDebugButton: checked })
                        }
                      />
                    </div>

                    {/* כפתור קונסול */}
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-slate-100 rounded-lg">
                          <Terminal className="w-5 h-5 text-slate-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900 mb-1">
                            כפתור קונסול צף
                          </h3>
                          <p className="text-sm text-slate-600">
                            הצג כפתור אפור צף למעקב אחר לוגים ומסרי קונסול בזמן אמת
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={debugSettings.showConsoleButton}
                        onCheckedChange={(checked) => 
                          saveDebugSettings({ ...debugSettings, showConsoleButton: checked })
                        }
                      />
                    </div>

                    {/* הסבר */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-blue-900">
                          <p className="font-semibold mb-1">💡 טיפ למפתחים</p>
                          <p>
                            כפתורים אלו מיועדים למפתחים ומנהלי מערכת לצורך בדיקה ופתרון בעיות.
                            משתמשים רגילים יכולים להסתיר אותם לחוויה נקייה יותר.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* תצוגה מקדימה */}
                    <div className="border-t pt-6">
                      <h4 className="font-semibold text-slate-900 mb-3">תצוגה מקדימה:</h4>
                      <div className="relative h-32 bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg border-2 border-dashed border-slate-300 overflow-hidden">
                        <div className="absolute bottom-4 left-4 flex flex-col gap-2">
                          {debugSettings.showDebugButton && (
                            <div className="w-14 h-14 rounded-full bg-purple-600 shadow-lg flex items-center justify-center">
                              <Bug className="w-6 h-6 text-white" />
                            </div>
                          )}
                          {debugSettings.showConsoleButton && (
                            <div className="w-14 h-14 rounded-full bg-slate-700 shadow-lg flex items-center justify-center">
                              <Terminal className="w-6 h-6 text-white" />
                            </div>
                          )}
                        </div>
                        {(!debugSettings.showDebugButton && !debugSettings.showConsoleButton) && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <p className="text-slate-500 text-sm">אין כפתורים מוצגים</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* בדיקת הרשאות יסודית */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="w-5 h-5 text-blue-600" />
                      בדיקת הרשאות יסודית
                    </CardTitle>
                    <p className="text-sm text-slate-600 mt-2">
                      בדיקה מקיפה של הרשאות המשתמש, כולל בדיקה מעשית של גישה לנתונים
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Button
                      onClick={runPermissionTest}
                      disabled={testingPermissions}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      {testingPermissions ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin ml-2" />
                          מריץ בדיקה...
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 ml-2" />
                          הרץ בדיקת הרשאות
                        </>
                      )}
                    </Button>

                    {permissionTest && (
                      <div className="mt-6 space-y-4">
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                          <div>
                            <p className="text-sm text-slate-600">תוצאות בדיקה</p>
                            <p className="text-xs text-slate-500">{new Date(permissionTest.timestamp).toLocaleString('he-IL')}</p>
                          </div>
                          <div className="flex gap-4">
                            <div className="text-center">
                              <div className="text-2xl font-bold text-green-600">{permissionTest.passed}</div>
                              <div className="text-xs text-slate-600">עבר</div>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold text-yellow-600">{permissionTest.warnings}</div>
                              <div className="text-xs text-slate-600">אזהרה</div>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold text-red-600">{permissionTest.failed}</div>
                              <div className="text-xs text-slate-600">נכשל</div>
                            </div>
                          </div>
                        </div>

                        {permissionTest.steps.map((step, index) => (
                          <div key={index} className="border rounded-lg p-4">
                            <div className="flex items-start gap-3">
                              <div className="mt-1">
                                {step.status === 'success' && <CheckCircle className="w-5 h-5 text-green-600" />}
                                {step.status === 'error' && <XCircle className="w-5 h-5 text-red-600" />}
                                {step.status === 'warning' && <AlertCircle className="w-5 h-5 text-yellow-600" />}
                                {step.status === 'running' && (
                                  <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                )}
                                {step.status === 'info' && <AlertCircle className="w-5 h-5 text-blue-600" />}
                              </div>
                              <div className="flex-1">
                                <h4 className="font-semibold text-slate-900">{step.name}</h4>
                                <p className="text-sm text-slate-600 mt-1">{step.details}</p>
                                
                                {step.data && (
                                  <div className="mt-2 p-2 bg-slate-50 rounded text-xs font-mono">
                                    <pre className="whitespace-pre-wrap">{JSON.stringify(step.data, null, 2)}</pre>
                                  </div>
                                )}

                                {step.recommendation && (
                                  <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                    <p className="text-sm text-yellow-800">
                                      <strong>💡 המלצה:</strong> {step.recommendation}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
}