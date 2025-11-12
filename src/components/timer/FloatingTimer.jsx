import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Clock, Play, Pause, Square, X, Settings, ChevronDown, Search, Sparkles, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { cn } from "@/lib/utils";
import { useAccessControl } from "../access/AccessValidator";

// ✅ Fixed: Export default component properly
export default function FloatingTimer() {
  const { filterClients } = useAccessControl();
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [clients, setClients] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showPopover, setShowPopover] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [dialogData, setDialogData] = useState({
    date: new Date().toISOString().split('T')[0],
    duration: '',
    title: '',
    notes: ''
  });
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('floating-timer-settings');
      return saved ? JSON.parse(saved) : {
        position: { x: 20, y: window.innerHeight - 100 },
        size: 'medium',
        showSeconds: true,
        color: 'blue'
      };
    } catch {
      return {
        position: { x: 20, y: window.innerHeight - 100 },
        size: 'medium',
        showSeconds: true,
        color: 'blue'
      };
    }
  });
  const [showSettings, setShowSettings] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [recentClients, setRecentClients] = useState(() => {
    try {
      const saved = localStorage.getItem('recent-timer-clients');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isAISuggesting, setIsAISuggesting] = useState(false);
  const [savedTemplates, setSavedTemplates] = useState(() => {
    try {
      const saved = localStorage.getItem('timer-templates');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const timerIntervalRef = useRef(null);

  useEffect(() => {
    if (running) {
      timerIntervalRef.current = setInterval(() => {
        setSeconds(s => s + 1);
      }, 1000);
    } else if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [running]);

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('floating-timer-settings', JSON.stringify(settings));
    } catch (e) {
      console.error('Error saving settings:', e);
    }
  }, [settings]);

  useEffect(() => {
    try {
      localStorage.setItem('recent-timer-clients', JSON.stringify(recentClients));
    } catch (e) {
      console.error('Error saving recent clients:', e);
    }
  }, [recentClients]);

  useEffect(() => {
    try {
      localStorage.setItem('timer-templates', JSON.stringify(savedTemplates));
    } catch (e) {
      console.error('Error saving templates:', e);
    }
  }, [savedTemplates]);

  const loadClients = async () => {
    try {
      const allClients = await base44.entities.Client.list();
      const validClients = Array.isArray(allClients) ? allClients : [];
      const accessibleClients = filterClients ? filterClients(validClients) : validClients;
      setClients(accessibleClients);
    } catch (error) {
      console.error('Error loading clients:', error);
      setClients([]);
    }
  };

  const filteredClients = useMemo(() => {
    const safeClients = Array.isArray(clients) ? clients : [];
    if (!searchTerm) return safeClients;
    return safeClients.filter(client =>
      client?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [clients, searchTerm]);

  const displayClients = useMemo(() => {
    if (searchTerm) return filteredClients;
    
    const recentIds = new Set(recentClients.map(r => r?.id).filter(Boolean));
    const safeClients = Array.isArray(clients) ? clients : [];
    const recentList = recentClients
      .map(rc => safeClients.find(c => c?.id === rc?.id))
      .filter(Boolean);
    const otherClients = safeClients.filter(c => c && !recentIds.has(c.id));
    
    return [...recentList, ...otherClients];
  }, [clients, recentClients, searchTerm, filteredClients]);

  const toggleTimer = useCallback(() => {
    if (!selectedClient) {
      toast.error('יש לבחור לקוח תחילה');
      setShowPopover(true);
      return;
    }
    setRunning(r => !r);
  }, [selectedClient]);

  const resetTimer = useCallback(() => {
    setSeconds(0);
    setRunning(false);
  }, []);

  const stopAndSave = useCallback(() => {
    if (seconds === 0) {
      toast.error('הטיימר ריק');
      return;
    }
    if (!selectedClient) {
      toast.error('לא נבחר לקוח');
      return;
    }

    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    const formatted = `${hours}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    setDialogData({
      date: new Date().toISOString().split('T')[0],
      duration: formatted,
      title: '',
      notes: ''
    });
    setShowDialog(true);
    setRunning(false);
  }, [seconds, selectedClient]);

  const handleClientSelect = useCallback((client) => {
    if (!client) return;
    
    setSelectedClient(client);
    setShowPopover(false);

    setRecentClients(prev => {
      const filtered = (prev || []).filter(c => c?.id !== client.id);
      return [{ id: client.id, name: client.name }, ...filtered].slice(0, 5);
    });
  }, []);

  const saveTimeLog = async () => {
    if (!selectedClient || !dialogData.duration) {
      toast.error('חסרים פרטים');
      return;
    }

    try {
      const [h, m, s] = dialogData.duration.split(':').map(Number);
      const totalSeconds = (h || 0) * 3600 + (m || 0) * 60 + (s || 0);

      if (totalSeconds <= 0) {
        toast.error('משך זמן לא תקין');
        return;
      }

      await base44.entities.TimeLog.create({
        client_id: selectedClient.id,
        client_name: selectedClient.name,
        log_date: dialogData.date,
        duration_seconds: totalSeconds,
        title: dialogData.title || 'עבודה',
        notes: dialogData.notes || ''
      });

      toast.success('הזמן נשמר בהצלחה');
      setShowDialog(false);
      resetTimer();
      setDialogData({ date: new Date().toISOString().split('T')[0], duration: '', title: '', notes: '' });
      window.dispatchEvent(new CustomEvent('timelog:created'));
    } catch (error) {
      console.error('Error saving time log:', error);
      toast.error('שגיאה בשמירת הזמן');
    }
  };

  const suggestWithAI = async () => {
    if (!selectedClient) {
      toast.error('נא לבחור לקוח תחילה');
      return;
    }

    setIsAISuggesting(true);
    try {
      const recentLogs = await base44.entities.TimeLog.filter(
        { client_name: selectedClient.name },
        '-log_date',
        10
      );
      const validLogs = Array.isArray(recentLogs) ? recentLogs : [];

      if (validLogs.length === 0) {
        setDialogData(prev => ({
          ...prev,
          title: 'עבודה על פרויקט',
          notes: 'פגישה ותכנון ראשוני'
        }));
        toast.success('הוצעו ברירות מחדל (אין היסטוריה)');
        return;
      }

      const prompt = `
על סמך רישומי עבודה קודמים עבור הלקוח "${selectedClient.name}", הצע:
1. כותרת קצרה (עד 5 מילים) לפעילות נוכחית
2. הערה קצרה (עד 15 מילים) על מה נעשה

רישומים אחרונים:
${validLogs.map(log => `- ${log.title || 'ללא כותרת'}: ${log.notes || 'ללא הערות'}`).join('\n')}

החזר רק JSON בפורמט:
{"title": "...", "notes": "..."}
`.trim();

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            notes: { type: 'string' }
          },
          required: ['title', 'notes']
        }
      });

      if (result && result.title && result.notes) {
        setDialogData(prev => ({
          ...prev,
          title: result.title,
          notes: result.notes
        }));
        toast.success('AI הציע כותרת והערות');
      } else {
        toast.error('AI לא הצליח לייצר הצעות');
      }
    } catch (error) {
      console.error('AI suggestion error:', error);
      toast.error('שגיאה בהפקת הצעות AI');
    } finally {
      setIsAISuggesting(false);
    }
  };

  const saveAsTemplate = () => {
    if (!dialogData.title) {
      toast.error('יש להזין כותרת');
      return;
    }

    const newTemplate = {
      id: Date.now(),
      title: dialogData.title,
      notes: dialogData.notes || ''
    };

    setSavedTemplates(prev => [newTemplate, ...(prev || [])].slice(0, 10));
    toast.success('התבנית נשמרה');
  };

  const deleteTemplate = (id) => {
    setSavedTemplates(prev => (prev || []).filter(t => t.id !== id));
    toast.success('התבנית נמחקה');
  };

  const applyTemplate = (template) => {
    setDialogData(prev => ({
      ...prev,
      title: template.title,
      notes: template.notes
    }));
    toast.success('התבנית הוחלה');
  };

  const formatTime = (totalSeconds) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;

    if (settings.showSeconds) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const sizeMap = {
    small: 'w-12 h-12',
    medium: 'w-16 h-16',
    large: 'w-20 h-20'
  };

  const colorMap = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    purple: 'from-purple-500 to-purple-600',
    orange: 'from-orange-500 to-orange-600'
  };

  const handleMouseDown = (e) => {
    if (e.target.closest('button')) return;
    setIsDragging(true);
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e) => {
      setSettings(prev => ({
        ...prev,
        position: {
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y
        }
      }));
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  return (
    <>
      <div
        className={cn(
          "fixed z-50 shadow-2xl rounded-full cursor-move select-none",
          sizeMap[settings.size],
          isDragging && "cursor-grabbing"
        )}
        style={{
          left: `${settings.position.x}px`,
          top: `${settings.position.y}px`
        }}
        onMouseDown={handleMouseDown}
      >
        <Popover open={showPopover} onOpenChange={setShowPopover}>
          <PopoverTrigger asChild>
            <button
              className={cn(
                "w-full h-full rounded-full bg-gradient-to-br shadow-lg hover:shadow-xl transition-all flex items-center justify-center relative overflow-hidden group",
                colorMap[settings.color]
              )}
            >
              {running && (
                <div className="absolute inset-0 animate-ping bg-white/20 rounded-full" />
              )}
              <Clock className="w-1/2 h-1/2 text-white relative z-10" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-4" align="start" side="right" dir="rtl">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">טיימר</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setShowSettings(true)}
                >
                  <Settings className="w-4 h-4" />
                </Button>
              </div>

              <div className="text-center">
                <div className="text-3xl font-bold text-slate-900 mb-2">
                  {formatTime(seconds)}
                </div>
                {selectedClient && (
                  <div className="text-sm text-slate-600 bg-slate-100 px-3 py-1 rounded-full inline-block">
                    {selectedClient.name}
                  </div>
                )}
              </div>

              <div className="flex gap-2 justify-center">
                <Button
                  onClick={toggleTimer}
                  size="sm"
                  className={running ? "bg-amber-500 hover:bg-amber-600" : "bg-green-500 hover:bg-green-600"}
                >
                  {running ? <Pause className="w-4 h-4 ml-1" /> : <Play className="w-4 h-4 ml-1" />}
                  {running ? 'עצור' : 'התחל'}
                </Button>
                <Button onClick={resetTimer} size="sm" variant="outline">
                  <X className="w-4 h-4 ml-1" />
                  אפס
                </Button>
                <Button
                  onClick={stopAndSave}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={seconds === 0}
                >
                  <Square className="w-4 h-4 ml-1" />
                  שמור
                </Button>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="חיפוש לקוח..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1"
                  />
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1">
                  {displayClients.length === 0 ? (
                    <div className="text-center py-4 text-slate-500 text-sm">
                      אין לקוחות זמינים
                    </div>
                  ) : (
                    displayClients.map((client) => {
                      if (!client) return null;
                      const isRecent = recentClients.some(r => r?.id === client.id);
                      return (
                        <button
                          key={client.id}
                          onClick={() => handleClientSelect(client)}
                          className={cn(
                            "w-full text-right px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors",
                            selectedClient?.id === client.id && "bg-blue-50 border border-blue-200"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm">{client.name}</span>
                            {isRecent && (
                              <Badge variant="secondary" className="text-xs">
                                אחרון
                              </Badge>
                            )}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-xl" dir="rtl">
          <DialogHeader>
            <DialogTitle>שמירת זמן עבודה</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="details" dir="rtl">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details">פרטים</TabsTrigger>
              <TabsTrigger value="templates">תבניות</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block text-right">תאריך</label>
                  <Input
                    type="date"
                    value={dialogData.date}
                    onChange={(e) => setDialogData(prev => ({ ...prev, date: e.target.value }))}
                    dir="rtl"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block text-right">משך (HH:MM:SS)</label>
                  <Input
                    value={dialogData.duration}
                    onChange={(e) => setDialogData(prev => ({ ...prev, duration: e.target.value }))}
                    placeholder="00:00:00"
                    dir="ltr"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-right">כותרת</label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={suggestWithAI}
                    disabled={isAISuggesting}
                    className="h-7 text-xs gap-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    {isAISuggesting ? 'מייצר...' : 'הצע עם AI'}
                  </Button>
                </div>
                <Input
                  value={dialogData.title}
                  onChange={(e) => setDialogData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="תיאור קצר של העבודה"
                  dir="rtl"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block text-right">הערות</label>
                <Textarea
                  value={dialogData.notes}
                  onChange={(e) => setDialogData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="פירוט נוסף על העבודה שבוצעה..."
                  rows={4}
                  dir="rtl"
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={saveAsTemplate} variant="outline" className="gap-2" size="sm">
                  <Save className="w-4 h-4" />
                  שמור כתבנית
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="templates" className="mt-4">
              <div className="space-y-2">
                {(!savedTemplates || savedTemplates.length === 0) ? (
                  <div className="text-center py-8 text-slate-500 text-sm">
                    אין תבניות שמורות
                  </div>
                ) : (
                  savedTemplates.map((template) => (
                    <div
                      key={template.id}
                      className="p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-sm mb-1">{template.title}</div>
                          {template.notes && (
                            <div className="text-xs text-slate-600">{template.notes}</div>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => applyTemplate(template)}
                          >
                            <ChevronDown className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-red-600 hover:text-red-700"
                            onClick={() => deleteTemplate(template.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="gap-2" dir="rtl">
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              ביטול
            </Button>
            <Button onClick={saveTimeLog} className="bg-blue-600 hover:bg-blue-700">
              שמור זמן
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>הגדרות טיימר</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block text-right">גודל</label>
              <Select
                value={settings.size}
                onValueChange={(value) => setSettings(prev => ({ ...prev, size: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">קטן</SelectItem>
                  <SelectItem value="medium">בינוני</SelectItem>
                  <SelectItem value="large">גדול</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block text-right">צבע</label>
              <Select
                value={settings.color}
                onValueChange={(value) => setSettings(prev => ({ ...prev, color: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="blue">כחול</SelectItem>
                  <SelectItem value="green">ירוק</SelectItem>
                  <SelectItem value="purple">סגול</SelectItem>
                  <SelectItem value="orange">כתום</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-right">הצג שניות</label>
              <input
                type="checkbox"
                checked={settings.showSeconds}
                onChange={(e) => setSettings(prev => ({ ...prev, showSeconds: e.target.checked }))}
                className="rounded"
              />
            </div>
          </div>

          <DialogFooter dir="rtl">
            <Button onClick={() => setShowSettings(false)}>סגור</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}