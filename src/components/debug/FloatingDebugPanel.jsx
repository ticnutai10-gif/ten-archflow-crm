import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Bug, 
  Copy, 
  X, 
  Terminal,
  Shield,
  Users,
  Briefcase,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { useAccessControl } from '@/components/access/AccessValidator';
import { Client, Project, AccessControl } from '@/entities/all';
import { toast } from 'sonner';

export default function FloatingDebugPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [logs, setLogs] = useState([]);
  const [accessData, setAccessData] = useState(null);
  const [clientsData, setClientsData] = useState(null);
  const [projectsData, setProjectsData] = useState(null);
  
  // הגדרות תצוגה - נטען רק אחרי mount
  const [settings, setSettings] = useState({
    showDebugButton: true,
    showConsoleButton: true
  });
  
  const [mounted, setMounted] = useState(false);

  const { me, isAdmin, isSuperAdmin, isManagerPlus, myAccessRule, loading } = useAccessControl();

  // Load settings after mount
  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem('debug-settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        setSettings(parsed);
      }
    } catch (e) {
      console.error("Failed to parse debug settings:", e);
    }
  }, []);

  // Listen for settings changes
  useEffect(() => {
    if (!mounted) return;
    
    const handleSettingsChange = (e) => {
      if (e.detail) {
        setSettings(e.detail);
      }
    };

    window.addEventListener('debug-settings-changed', handleSettingsChange);
    
    return () => {
      window.removeEventListener('debug-settings-changed', handleSettingsChange);
    };
  }, [mounted]);

  // Console logging
  useEffect(() => {
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    console.log = (...args) => {
      originalLog(...args);
      const message = args.map(arg => {
        if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg, null, 2);
          } catch {
            return String(arg);
          }
        }
        return String(arg);
      }).join(' ');
      
      setLogs(prev => [...prev.slice(-100), {
        time: new Date().toLocaleTimeString('he-IL'),
        level: 'log',
        message
      }]);
    };

    console.error = (...args) => {
      originalError(...args);
      const message = args.map(arg => String(arg)).join(' ');
      setLogs(prev => [...prev.slice(-100), {
        time: new Date().toLocaleTimeString('he-IL'),
        level: 'error',
        message
      }]);
    };

    console.warn = (...args) => {
      originalWarn(...args);
      const message = args.map(arg => String(arg)).join(' ');
      setLogs(prev => [...prev.slice(-100), {
        time: new Date().toLocaleTimeString('he-IL'),
        level: 'warn',
        message
      }]);
    };

    return () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, []);

  const loadAccessData = useCallback(async () => {
    if (!me) return;
    
    try {
      const [clients, projects, accessRules] = await Promise.all([
        Client.list(),
        Project.list(),
        AccessControl.list()
      ]);

      const clientsDataObj = {
        total: clients.length,
        list: clients.map(c => ({ id: c.id, name: c.name }))
      };

      const projectsDataObj = {
        total: projects.length,
        list: projects.map(p => ({ id: p.id, name: p.name, client_id: p.client_id }))
      };

      setClientsData(clientsDataObj);
      setProjectsData(projectsDataObj);

      const myRule = accessRules.find(r => 
        r.email?.toLowerCase() === me?.email?.toLowerCase()
      );

      setAccessData({
        allRules: accessRules.length,
        myRule,
        clients,
        projects
      });
    } catch (error) {
      console.error('❌ [DEBUG PANEL] Error loading access data:', error);
    }
  }, [me]);

  useEffect(() => {
    if (me && isOpen) {
      loadAccessData();
    }
  }, [me, isOpen, loadAccessData]);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success('הועתק ללוח');
    });
  };

  const copyAllDebugInfo = () => {
    const debugInfo = {
      user: me,
      isAdmin,
      isSuperAdmin,
      isManagerPlus,
      myAccessRule,
      clientsData,
      projectsData,
      accessData,
      recentLogs: logs.slice(-50)
    };
    
    copyToClipboard(JSON.stringify(debugInfo, null, 2));
  };

  const copyConsole = () => {
    const consoleText = logs.map(log => 
      `[${log.time}] [${log.level.toUpperCase()}] ${log.message}`
    ).join('\n');
    
    copyToClipboard(consoleText);
  };

  // Don't render until mounted and settings loaded
  if (!mounted) return null;

  // אם שני הכפתורים מוסתרים, לא להציג כלום
  if (!settings.showDebugButton && !settings.showConsoleButton) {
    return null;
  }

  if (!me) return null;

  return (
    <>
      {/* כפתורים צפים */}
      <div className="fixed bottom-6 left-6 z-[9999] flex flex-col gap-2">
        {settings.showDebugButton && (
          <Button
            onClick={() => setIsOpen(!isOpen)}
            className="rounded-full w-14 h-14 shadow-2xl bg-purple-600 hover:bg-purple-700"
            title="פאנל דיבאג"
          >
            <Bug className="w-6 h-6" />
          </Button>
        )}
        
        {settings.showConsoleButton && (
          <Button
            onClick={() => setConsoleOpen(!consoleOpen)}
            className="rounded-full w-14 h-14 shadow-2xl bg-slate-700 hover:bg-slate-800"
            title="קונסול"
          >
            <Terminal className="w-6 h-6" />
          </Button>
        )}
      </div>

      {/* פאנל דיבאג */}
      {isOpen && (
        <div className="fixed bottom-24 left-6 z-[9999] w-[500px]" dir="rtl">
          <Card className="shadow-2xl border-2 border-purple-500">
            <CardHeader className="bg-purple-600 text-white flex flex-row items-center justify-between p-4">
              <div className="flex items-center gap-2">
                <Bug className="w-5 h-5" />
                <CardTitle className="text-lg">פאנל דיבאג - הרשאות</CardTitle>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-white hover:bg-purple-700 h-8 w-8 p-0"
                  onClick={copyAllDebugInfo}
                  title="העתק הכל"
                >
                  <Copy className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-white hover:bg-purple-700 h-8 w-8 p-0"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            
            <CardContent className="p-4">
              <ScrollArea className="h-[500px]">
                <div className="space-y-4">
                  {/* מידע משתמש */}
                  <div className="bg-slate-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="w-4 h-4 text-blue-600" />
                      <h3 className="font-bold text-sm">פרטי משתמש</h3>
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-600">אימייל:</span>
                        <span className="font-mono">{me?.email}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">ID:</span>
                        <span className="font-mono text-xs">{me?.id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">תפקיד (User):</span>
                        <Badge variant="outline">{me?.role || 'N/A'}</Badge>
                      </div>
                    </div>
                  </div>

                  {/* הרשאות */}
                  <div className="bg-blue-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-4 h-4 text-blue-600" />
                      <h3 className="font-bold text-sm">בדיקות הרשאה</h3>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span>Super Admin:</span>
                        {isSuperAdmin ? (
                          <Badge className="bg-green-500">✓ כן</Badge>
                        ) : (
                          <Badge variant="outline">✗ לא</Badge>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span>Admin:</span>
                        {isAdmin ? (
                          <Badge className="bg-green-500">✓ כן</Badge>
                        ) : (
                          <Badge variant="outline">✗ לא</Badge>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span>Manager Plus:</span>
                        {isManagerPlus ? (
                          <Badge className="bg-blue-500">✓ כן</Badge>
                        ) : (
                          <Badge variant="outline">✗ לא</Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* רשומת AccessControl */}
                  <div className="bg-amber-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <h3 className="font-bold text-sm">רשומת בקרת גישה</h3>
                    </div>
                    {myAccessRule ? (
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-600">תפקיד (Access):</span>
                          <Badge>{myAccessRule.role}</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">פעיל:</span>
                          {myAccessRule.active ? (
                            <Badge className="bg-green-500">✓ כן</Badge>
                          ) : (
                            <Badge className="bg-red-500">✗ לא</Badge>
                          )}
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">לקוחות משויכים:</span>
                          <Badge variant="outline">
                            {myAccessRule.assigned_clients?.length || 0}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">פרויקטים משויכים:</span>
                          <Badge variant="outline">
                            {myAccessRule.assigned_projects?.length || 0}
                          </Badge>
                        </div>
                        
                        {myAccessRule.assigned_clients?.length > 0 && (
                          <div className="mt-2">
                            <div className="text-xs text-slate-600 mb-1">רשימת לקוחות:</div>
                            <div className="bg-white rounded p-2 max-h-32 overflow-y-auto">
                              {myAccessRule.assigned_clients.map(clientId => {
                                const client = accessData?.clients?.find(c => c.id === clientId);
                                return (
                                  <div key={clientId} className="text-xs flex justify-between items-center py-1">
                                    <span className="font-mono text-[10px]">{clientId}</span>
                                    <span className="font-medium">{client?.name || 'לא נמצא'}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                        ⚠️ אין רשומת בקרת גישה למשתמש זה!
                      </div>
                    )}
                  </div>

                  {/* סטטיסטיקות */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-green-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Users className="w-4 h-4 text-green-600" />
                        <h3 className="font-bold text-xs">לקוחות</h3>
                      </div>
                      <div className="text-2xl font-bold text-green-600">
                        {clientsData?.total || 0}
                      </div>
                      <div className="text-[10px] text-slate-600">סה"כ במערכת</div>
                      {clientsData && (
                        <div className="text-[10px] text-green-700 mt-1">
                          ✅ טעון מהשרת
                        </div>
                      )}
                    </div>

                    <div className="bg-blue-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Briefcase className="w-4 h-4 text-blue-600" />
                        <h3 className="font-bold text-xs">פרויקטים</h3>
                      </div>
                      <div className="text-2xl font-bold text-blue-600">
                        {projectsData?.total || 0}
                      </div>
                      <div className="text-[10px] text-slate-600">סה"כ במערכת</div>
                      {projectsData && (
                        <div className="text-[10px] text-blue-700 mt-1">
                          ✅ טעון מהשרת
                        </div>
                      )}
                    </div>
                  </div>

                  {/* המלצות */}
                  {myAccessRule && !myAccessRule.active && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-red-700">
                        <XCircle className="w-4 h-4" />
                        <span className="font-bold text-sm">הרשאה לא פעילה!</span>
                      </div>
                      <p className="text-xs text-red-600 mt-1">
                        ההרשאה של המשתמש מסומנת כלא פעילה. יש להפעיל אותה בעמוד בקרת הגישה.
                      </p>
                    </div>
                  )}

                  {myAccessRule?.role === 'staff' && (!myAccessRule.assigned_clients || myAccessRule.assigned_clients.length === 0) && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-amber-700">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="font-bold text-sm">אין לקוחות משויכים!</span>
                      </div>
                      <p className="text-xs text-amber-600 mt-1">
                        למשתמש עם תפקיד "staff" אין לקוחות משויכים. יש לשייך לקוחות בעמוד בקרת הגישה.
                      </p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}

      {/* קונסול */}
      {consoleOpen && (
        <div className="fixed bottom-24 left-6 z-[9999] w-[600px]" dir="ltr">
          <Card className="shadow-2xl border-2 border-slate-500">
            <CardHeader className="bg-slate-700 text-white flex flex-row items-center justify-between p-4">
              <div className="flex items-center gap-2">
                <Terminal className="w-5 h-5" />
                <CardTitle className="text-lg font-mono">Console</CardTitle>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-white hover:bg-slate-600 h-8 w-8 p-0"
                  onClick={copyConsole}
                  title="Copy"
                >
                  <Copy className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-white hover:bg-slate-600 h-8 w-8 p-0"
                  onClick={() => setLogs([])}
                  title="Clear"
                >
                  <X className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-white hover:bg-slate-600 h-8 w-8 p-0"
                  onClick={() => setConsoleOpen(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            
            <CardContent className="p-0 bg-slate-900">
              <ScrollArea className="h-[400px] p-4">
                <div className="space-y-1 font-mono text-xs">
                  {logs.map((log, i) => (
                    <div 
                      key={i}
                      className={`${
                        log.level === 'error' ? 'text-red-400' : 
                        log.level === 'warn' ? 'text-yellow-400' : 
                        'text-green-400'
                      }`}
                    >
                      <span className="text-slate-500">[{log.time}]</span> {log.message}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}