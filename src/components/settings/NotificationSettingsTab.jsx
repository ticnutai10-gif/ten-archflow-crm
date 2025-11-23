import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Bell, Mail, Clock, AlertTriangle, Calendar, Users } from 'lucide-react';

export default function NotificationSettingsTab() {
  const [settings, setSettings] = useState({
    deadline_days_before: 3,
    notify_status_changes: true,
    client_inactive_days: 30,
    notify_meetings: true,
    meeting_hours_before: 2,
    email_notifications: false,
    notify_task_overdue: true
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const user = await base44.auth.me();
      if (!user?.email) return;

      const userSettings = await base44.entities.NotificationSettings.filter({
        user_email: user.email
      });

      if (userSettings && userSettings.length > 0) {
        setSettings(userSettings[0]);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const user = await base44.auth.me();
      if (!user?.email) return;

      const existing = await base44.entities.NotificationSettings.filter({
        user_email: user.email
      });

      const settingsData = {
        ...settings,
        user_email: user.email
      };

      if (existing && existing.length > 0) {
        await base44.entities.NotificationSettings.update(existing[0].id, settingsData);
      } else {
        await base44.entities.NotificationSettings.create(settingsData);
      }

      toast.success('הגדרות ההתראות נשמרו בהצלחה');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('שגיאה בשמירת ההגדרות');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-slate-200 rounded"></div>
          <div className="h-32 bg-slate-200 rounded"></div>
          <div className="h-32 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">הגדרות התראות</h2>
          <p className="text-slate-600 mt-1">נהל את ההתראות שלך למעקב אופטימלי</p>
        </div>
        <Button onClick={saveSettings} disabled={saving}>
          {saving ? 'שומר...' : 'שמור שינויים'}
        </Button>
      </div>

      {/* Deadlines */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            מועדים אחרונים
          </CardTitle>
          <CardDescription>
            התראות על משימות ופרויקטים שמתקרבים למועד אחרון
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>כמה ימים לפני מועד אחרון להתריע</Label>
              <p className="text-sm text-slate-500">תקבל התראה מראש</p>
            </div>
            <Input
              type="number"
              min="1"
              max="30"
              value={settings.deadline_days_before}
              onChange={(e) => setSettings({ ...settings, deadline_days_before: parseInt(e.target.value) })}
              className="w-24 text-center"
            />
          </div>
        </CardContent>
      </Card>

      {/* Status Changes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            שינויי סטטוס
          </CardTitle>
          <CardDescription>
            התראות על שינויים בסטטוס פרויקטים ולקוחות
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label>הפעל התראות על שינוי סטטוס</Label>
              <p className="text-sm text-slate-500">קבל עדכון כשסטטוס משתנה</p>
            </div>
            <Switch
              checked={settings.notify_status_changes}
              onCheckedChange={(checked) => setSettings({ ...settings, notify_status_changes: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Inactive Clients */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-600" />
            לקוחות לא פעילים
          </CardTitle>
          <CardDescription>
            התראות על לקוחות שלא היו פעילים לזמן רב
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>ימים ללא פעילות להתראה</Label>
              <p className="text-sm text-slate-500">התראה על לקוח שלא היה פעיל</p>
            </div>
            <Input
              type="number"
              min="7"
              max="90"
              value={settings.client_inactive_days}
              onChange={(e) => setSettings({ ...settings, client_inactive_days: parseInt(e.target.value) })}
              className="w-24 text-center"
            />
          </div>
        </CardContent>
      </Card>

      {/* Meetings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-green-600" />
            פגישות
          </CardTitle>
          <CardDescription>
            התראות על פגישות קרובות
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>הפעל התראות פגישות</Label>
              <p className="text-sm text-slate-500">קבל תזכורות לפגישות</p>
            </div>
            <Switch
              checked={settings.notify_meetings}
              onCheckedChange={(checked) => setSettings({ ...settings, notify_meetings: checked })}
            />
          </div>
          
          {settings.notify_meetings && (
            <div className="flex items-center justify-between">
              <div>
                <Label>שעות לפני פגישה להתריע</Label>
                <p className="text-sm text-slate-500">זמן התראה מראש</p>
              </div>
              <Input
                type="number"
                min="0.5"
                max="48"
                step="0.5"
                value={settings.meeting_hours_before}
                onChange={(e) => setSettings({ ...settings, meeting_hours_before: parseFloat(e.target.value) })}
                className="w-24 text-center"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Overdue Tasks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            משימות שעברו מועד
          </CardTitle>
          <CardDescription>
            התראות על משימות שעברו את מועד היעד
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label>הפעל התראות על משימות שעברו מועד</Label>
              <p className="text-sm text-slate-500">קבל עדכון על משימות באיחור</p>
            </div>
            <Switch
              checked={settings.notify_task_overdue}
              onCheckedChange={(checked) => setSettings({ ...settings, notify_task_overdue: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Email Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-indigo-600" />
            התראות במייל
          </CardTitle>
          <CardDescription>
            קבל התראות גם במייל בנוסף לממשק המערכת
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label>הפעל שליחת התראות במייל</Label>
              <p className="text-sm text-slate-500">התראות יישלחו גם לתיבת הדואר שלך</p>
            </div>
            <Switch
              checked={settings.email_notifications}
              onCheckedChange={(checked) => setSettings({ ...settings, email_notifications: checked })}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}