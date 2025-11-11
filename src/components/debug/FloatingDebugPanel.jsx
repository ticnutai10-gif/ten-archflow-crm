import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Bug, 
  Copy, 
  X, 
  ChevronDown, 
  ChevronUp, 
  Terminal,
  Shield,
  Users,
  Briefcase,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { useAccessControl } from '@/components/access/AccessValidator';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const DEFAULT_SETTINGS = {
  showDebugButton: true,
  showConsoleButton: true
};

export default function FloatingDebugPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [logs, setLogs] = useState([]);
  const [accessData, setAccessData] = useState(null);
  const [clientsData, setClientsData] = useState(null);
  const [projectsData, setProjectsData] = useState(null);
  
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('debug-settings');
      return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
    } catch {
      console.error("Failed to parse debug settings");
      return DEFAULT_SETTINGS;
    }
  });

  const { me, isAdmin, isSuperAdmin, isManagerPlus, myAccessRule, loading } = useAccessControl();

  const handleSettingsChange = useCallback((e) => {
    setSettings(e.detail);
  }, []);

  const addLog = useCallback((level, message) => {
    setLogs(prev => {
      const newLog = {
        time: new Date().toLocaleTimeString('he-IL'),
        level,
        message
      };
      return [...prev.slice(-100), newLog];
    });
  }, []);

  const loadAccessData = useCallback(async () => {
    try {
      const [clients, projects, accessRules] = await Promise.all([
        base44.entities.Client.list().catch(() => []),
        base44.entities.Project.list().catch(() => []),
        base44.entities.AccessControl.list().catch(() => [])
      ]);

      setClientsData({
        total: clients.length,
        list: clients.map(c => ({ id: c.id, name: c.name }))
      });

      setProjectsData({
        total: projects.length,
        list: projects.map(p => ({ id: p.id, name: p.name, client_id: p.client_id }))
      });

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
      console.error('Error loading access data:', error);
    }
  }, [me]);

  const copyToClipboard = useCallback((text) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success('הועתק ללוח');
    }).catch(() => {
      toast.error('שגיאה בהעתקה');
    });
  }, []);

  const copyAllDebugInfo = useCallback(() => {
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
  }, [me, isAdmin, isSuperAdmin, isManagerPlus, myAccessRule, clientsData, projectsData, accessData, logs, copyToClipboard]);

  const copyConsole = useCallback(() => {
    const consoleText = logs.map(log => 
      `[${log.time}] [${log.level.toUpperCase()}] ${log.message}`
    ).join('\n');
    
    copyToClipboard(consoleText);
  }, [logs, copyToClipboard]);

  useEffect(() => {
    window.addEventListener('debug-settings-changed', handleSettingsChange);
    return () => window.removeEventListener('debug-settings-changed', handleSettingsChange);
  }, [handleSettingsChange]);

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
      
      setTimeout(() => addLog('log', message), 0);
    };

    console.error = (...args) => {
      originalError(...args);
      const message = args.map(arg => String(arg)).join(' ');
      setTimeout(() => addLog('error', message), 0);
    };

    console.warn = (...args) => {
      originalWarn(...args);
      const message = args.map(arg => String(arg)).join(' ');
      setTimeout(() => addLog('warn', message), 0);
    };

    return () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, [addLog]);

  useEffect(() => {
    if (me && isOpen) {
      loadAccessData();
    }
  }, [me, isOpen, loadAccessData]);

  const shouldShowButtons = useMemo(() => {
    return settings.showDebugButton || settings.showConsoleButton;
  }, [settings]);

  const assignedClientsCount = useMemo(() => {
    return myAccessRule?.assigned_clients?.length || 0;
  }, [myAccessRule]);

  const assignedProjectsCount = useMemo(() => {
    return myAccessRule?.assigned_projects?.length || 0;
  }, [myAccessRule]);

  if (!shouldShowButtons || !me) {
    return null;
  }

  return (
    <>
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
                          <Badge variant="outline">{assignedClientsCount}</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">פרויקטים משויכים:</span>
                          <Badge variant="outline">{assignedProjectsCount}</Badge>
                        </div>
                        
                        {assignedClientsCount > 0 && (
                          <div className="mt-2">
                            <div className="text-xs text-slate-600 mb-1">רשימת לקוחות:</div>
                            <div className="bg-white rounded p-2 max-h-32 overflow-y-auto">
                              {(myAccessRule.assigned_clients || []).map(clientId => {
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
                    </div>
                  </div>

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

                  {myAccessRule?.role === 'staff' && assignedClientsCount === 0 && (
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