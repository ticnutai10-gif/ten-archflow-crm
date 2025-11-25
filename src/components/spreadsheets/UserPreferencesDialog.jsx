import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, User, Settings as SettingsIcon } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

export default function UserPreferencesDialog({ open, onClose, tableName = 'clients' }) {
  const [loading, setLoading] = useState(false);
  const [preferences, setPreferences] = useState({
    auto_save: true,
    auto_close_edit: true,
    default_view_mode: 'table',
    rows_per_page: 50,
    show_archived: false,
    compact_mode: false,
    enable_animations: true
  });

  useEffect(() => {
    if (open) {
      loadPreferences();
    }
  }, [open]);

  const loadPreferences = async () => {
    try {
      const user = await base44.auth.me();
      const userPrefs = await base44.entities.UserPreferences.filter({ user_email: user.email });
      
      if (userPrefs.length > 0) {
        const prefs = userPrefs[0];
        setPreferences(prefs.general_preferences || {
          auto_save: true,
          auto_close_edit: true,
          default_view_mode: 'table',
          rows_per_page: 50,
          show_archived: false,
          compact_mode: false,
          enable_animations: true
        });
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };

  const savePreferences = async () => {
    setLoading(true);
    try {
      const user = await base44.auth.me();
      const existingPrefs = await base44.entities.UserPreferences.filter({ user_email: user.email });
      
      if (existingPrefs.length > 0) {
        await base44.entities.UserPreferences.update(existingPrefs[0].id, {
          general_preferences: preferences
        });
      } else {
        await base44.entities.UserPreferences.create({
          user_email: user.email,
          general_preferences: preferences
        });
      }
      
      // Dispatch event to notify components
      window.dispatchEvent(new CustomEvent('user:preferences:updated', {
        detail: { preferences }
      }));
      
      toast.success('ההעדפות נשמרו בהצלחה');
      onClose();
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('שגיאה בשמירת ההעדפות');
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <User className="w-5 h-5" />
            העדפות אישיות
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* שמירה ועריכה */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-slate-700 flex items-center gap-2">
              <SettingsIcon className="w-4 h-4" />
              שמירה ועריכה
            </h3>
            
            <div className="space-y-3 pr-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">שמירה אוטומטית</Label>
                  <p className="text-xs text-slate-500 mt-1">שמור שינויים מיידית בעת עריכת תאים</p>
                </div>
                <Switch
                  checked={preferences.auto_save}
                  onCheckedChange={(val) => setPreferences({ ...preferences, auto_save: val })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">סגירת עריכה אוטומטית</Label>
                  <p className="text-xs text-slate-500 mt-1">סגור אוטומטית את מצב העריכה לאחר שמירה</p>
                </div>
                <Switch
                  checked={preferences.auto_close_edit}
                  onCheckedChange={(val) => setPreferences({ ...preferences, auto_close_edit: val })}
                />
              </div>
            </div>
          </div>

          {/* תצוגה */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-slate-700">תצוגה</h3>
            
            <div className="space-y-3 pr-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">מצב תצוגה ברירת מחדל</Label>
                  <p className="text-xs text-slate-500 mt-1">תצוגת התחלה בעת פתיחת הדף</p>
                </div>
                <Select 
                  value={preferences.default_view_mode} 
                  onValueChange={(val) => setPreferences({ ...preferences, default_view_mode: val })}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="table">טבלה</SelectItem>
                    <SelectItem value="grid">רשת</SelectItem>
                    <SelectItem value="kanban">קנבאן</SelectItem>
                    <SelectItem value="compact">מצומצם</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">שורות בעמוד</Label>
                  <p className="text-xs text-slate-500 mt-1">מספר רשומות להצגה בעמוד</p>
                </div>
                <Select 
                  value={String(preferences.rows_per_page)} 
                  onValueChange={(val) => setPreferences({ ...preferences, rows_per_page: parseInt(val) })}
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                    <SelectItem value="200">200</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">הצג פריטים בארכיון</Label>
                  <p className="text-xs text-slate-500 mt-1">כלול פריטים שהועברו לארכיון</p>
                </div>
                <Switch
                  checked={preferences.show_archived}
                  onCheckedChange={(val) => setPreferences({ ...preferences, show_archived: val })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">מצב תצוגה מצומצם</Label>
                  <p className="text-xs text-slate-500 mt-1">הצג פחות פרטים לתצוגה נקייה</p>
                </div>
                <Switch
                  checked={preferences.compact_mode}
                  onCheckedChange={(val) => setPreferences({ ...preferences, compact_mode: val })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">הפעל אנימציות</Label>
                  <p className="text-xs text-slate-500 mt-1">אפקטים ויזואליים חלקים</p>
                </div>
                <Switch
                  checked={preferences.enable_animations}
                  onCheckedChange={(val) => setPreferences({ ...preferences, enable_animations: val })}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 border-t pt-4">
          <Button variant="outline" onClick={onClose}>
            ביטול
          </Button>
          <Button 
            onClick={savePreferences} 
            disabled={loading}
            className="bg-[#2C3A50] hover:bg-[#1f2937] gap-2"
          >
            <Save className="w-4 h-4" />
            שמור העדפות
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}