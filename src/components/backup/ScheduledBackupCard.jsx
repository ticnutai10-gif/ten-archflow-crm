import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { 
  CalendarClock, Mail, Clock, CheckCircle2, Settings, Bell, Save, X 
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function ScheduledBackupCard({ 
  categories = [], 
  selectedCategories = new Set(),
  onSettingsChange 
}) {
  const [settings, setSettings] = useState({
    enabled: false,
    frequency: 'weekly',
    dayOfWeek: 0, // Sunday
    time: '02:00',
    emailEnabled: true,
    emailRecipients: '',
    notifyOnSuccess: true,
    notifyOnError: true,
    includeAllCategories: true,
    selectedCategories: []
  });
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const user = await base44.auth.me();
      if (user?.scheduled_backup_settings) {
        setSettings(prev => ({ ...prev, ...user.scheduled_backup_settings }));
      }
    } catch (e) {
      console.error('Error loading backup settings:', e);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      await base44.auth.updateMe({
        scheduled_backup_settings: settings
      });
      toast.success('הגדרות נשמרו בהצלחה');
      setEditing(false);
      onSettingsChange?.(settings);
    } catch (e) {
      console.error('Error saving backup settings:', e);
      toast.error('שגיאה בשמירת ההגדרות');
    }
    setSaving(false);
  };

  const DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  const FREQUENCIES = [
    { value: 'daily', label: 'יומי' },
    { value: 'weekly', label: 'שבועי' },
    { value: 'biweekly', label: 'דו-שבועי' },
    { value: 'monthly', label: 'חודשי' }
  ];

  const getNextRunText = () => {
    const now = new Date();
    const [hours, minutes] = settings.time.split(':').map(Number);
    
    let nextRun = new Date();
    nextRun.setHours(hours, minutes, 0, 0);
    
    if (settings.frequency === 'daily') {
      if (nextRun <= now) nextRun.setDate(nextRun.getDate() + 1);
    } else if (settings.frequency === 'weekly') {
      const daysUntil = (settings.dayOfWeek - now.getDay() + 7) % 7;
      nextRun.setDate(now.getDate() + (daysUntil === 0 && nextRun <= now ? 7 : daysUntil));
    }
    
    return nextRun.toLocaleString('he-IL', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card className="shadow-xl border-0 bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50">
      <CardHeader className="border-b bg-white/50 pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3 text-xl">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
              <CalendarClock className="w-5 h-5 text-white" />
            </div>
            גיבוי מתוזמן
          </CardTitle>
          <div className="flex items-center gap-3">
            <Switch
              checked={settings.enabled}
              onCheckedChange={(checked) => setSettings(s => ({ ...s, enabled: checked }))}
            />
            <span className={settings.enabled ? 'text-green-600 font-bold' : 'text-slate-400'}>
              {settings.enabled ? 'פעיל' : 'כבוי'}
            </span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-6">
        {!editing ? (
          <div className="space-y-4">
            {settings.enabled ? (
              <>
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <Clock className="w-5 h-5 text-indigo-500" />
                    <span className="font-bold text-slate-900">תזמון הבא</span>
                  </div>
                  <div className="text-lg font-medium text-indigo-600">
                    {getNextRunText()}
                  </div>
                  <div className="text-sm text-slate-500 mt-1">
                    {FREQUENCIES.find(f => f.value === settings.frequency)?.label} בשעה {settings.time}
                    {settings.frequency === 'weekly' && ` (יום ${DAYS[settings.dayOfWeek]})`}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white rounded-xl p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <Mail className="w-4 h-4 text-blue-500" />
                      <span className="font-bold text-sm text-slate-700">שליחה למייל</span>
                    </div>
                    <Badge className={settings.emailEnabled ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}>
                      {settings.emailEnabled ? 'פעיל' : 'כבוי'}
                    </Badge>
                    {settings.emailEnabled && settings.emailRecipients && (
                      <div className="text-xs text-slate-500 mt-1 truncate">
                        {settings.emailRecipients}
                      </div>
                    )}
                  </div>

                  <div className="bg-white rounded-xl p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <Bell className="w-4 h-4 text-amber-500" />
                      <span className="font-bold text-sm text-slate-700">התראות</span>
                    </div>
                    <div className="flex gap-2">
                      {settings.notifyOnSuccess && (
                        <Badge className="bg-green-100 text-green-700 text-xs">הצלחה</Badge>
                      )}
                      {settings.notifyOnError && (
                        <Badge className="bg-red-100 text-red-700 text-xs">שגיאה</Badge>
                      )}
                    </div>
                  </div>
                </div>

                <Button 
                  variant="outline" 
                  className="w-full gap-2"
                  onClick={() => setEditing(true)}
                >
                  <Settings className="w-4 h-4" />
                  ערוך הגדרות
                </Button>
              </>
            ) : (
              <div className="text-center py-6">
                <CalendarClock className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="text-slate-500 mb-4">גיבוי מתוזמן אינו פעיל</p>
                <Button onClick={() => {
                  setSettings(s => ({ ...s, enabled: true }));
                  setEditing(true);
                }}>
                  הפעל והגדר
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-bold mb-2 block">תדירות</Label>
                <Select 
                  value={settings.frequency} 
                  onValueChange={(v) => setSettings(s => ({ ...s, frequency: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FREQUENCIES.map(f => (
                      <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {settings.frequency === 'weekly' && (
                <div>
                  <Label className="text-sm font-bold mb-2 block">יום בשבוע</Label>
                  <Select 
                    value={String(settings.dayOfWeek)} 
                    onValueChange={(v) => setSettings(s => ({ ...s, dayOfWeek: Number(v) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DAYS.map((day, idx) => (
                        <SelectItem key={idx} value={String(idx)}>{day}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label className="text-sm font-bold mb-2 block">שעה</Label>
                <Input
                  type="time"
                  value={settings.time}
                  onChange={(e) => setSettings(s => ({ ...s, time: e.target.value }))}
                />
              </div>
            </div>

            <div className="border-t pt-4">
              <Label className="text-sm font-bold mb-2 block flex items-center gap-2">
                <Mail className="w-4 h-4" />
                שליחה למייל
              </Label>
              <div className="flex items-center gap-3 mb-2">
                <Switch
                  checked={settings.emailEnabled}
                  onCheckedChange={(checked) => setSettings(s => ({ ...s, emailEnabled: checked }))}
                />
                <span className="text-sm text-slate-600">
                  {settings.emailEnabled ? 'פעיל' : 'כבוי'}
                </span>
              </div>
              {settings.emailEnabled && (
                <Input
                  placeholder="כתובות מייל (מופרדות בפסיק)"
                  value={settings.emailRecipients}
                  onChange={(e) => setSettings(s => ({ ...s, emailRecipients: e.target.value }))}
                />
              )}
            </div>

            <div className="border-t pt-4">
              <Label className="text-sm font-bold mb-2 block flex items-center gap-2">
                <Bell className="w-4 h-4" />
                התראות
              </Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={settings.notifyOnSuccess}
                    onCheckedChange={(checked) => setSettings(s => ({ ...s, notifyOnSuccess: checked }))}
                  />
                  <span className="text-sm">בהצלחה</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={settings.notifyOnError}
                    onCheckedChange={(checked) => setSettings(s => ({ ...s, notifyOnError: checked }))}
                  />
                  <span className="text-sm">בשגיאה</span>
                </label>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button 
                className="flex-1 gap-2 bg-indigo-600 hover:bg-indigo-700"
                onClick={saveSettings}
                disabled={saving}
              >
                <Save className="w-4 h-4" />
                {saving ? 'שומר...' : 'שמור'}
              </Button>
              <Button 
                variant="outline"
                onClick={() => {
                  setEditing(false);
                  loadSettings();
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}