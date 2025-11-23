import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { 
  Settings, 
  Eye, 
  EyeOff, 
  Target, 
  BarChart3,
  Briefcase,
  CheckSquare,
  TrendingUp,
  Clock,
  Calendar
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function DashboardSettings({ visible, settings, onChange, onClose }) {
  const [open, setOpen] = useState(false);

  // בדיקת בטיחות להגדרות
  const safeSettings = settings || {
    showWeeklyGoals: true,
    showStats: true,
    showRecentProjects: true,
    showUpcomingTasks: true,
    showQuoteStatus: true,
    showTimerLogs: true,
    showMeetings: true
  };

  const handleVisibilityChange = (key, value) => {
    if (onChange) {
      onChange({ ...safeSettings, [key]: value });
    }
  };

  React.useEffect(() => {
    if (visible !== undefined) {
      setOpen(visible);
    }
  }, [visible]);

  const handleOpenChange = (newOpen) => {
    setOpen(newOpen);
    if (!newOpen && onClose) {
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-right text-xl">
            <Settings className="h-6 w-6" />
            הגדרות דאשבורד
          </DialogTitle>
        </DialogHeader>
        
        <div className="max-h-[60vh] overflow-y-auto pr-2">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">ניהול קטעים</CardTitle>
                <p className="text-sm text-slate-500">
                  הפעל או השבת קטעים שונים בדאשבורד
                </p>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <Target className="h-5 w-5 text-amber-500" />
                      <span className="font-medium text-slate-700">יעדים השבוע</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={safeSettings.showWeeklyGoals}
                        onCheckedChange={(checked) => handleVisibilityChange('showWeeklyGoals', checked)}
                      />
                      {safeSettings.showWeeklyGoals ? (
                        <Eye className="h-4 w-4 text-green-600" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-slate-400" />
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <BarChart3 className="h-5 w-5 text-blue-500" />
                      <span className="font-medium text-slate-700">כרטיסי סטטיסטיקה</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={safeSettings.showStats}
                        onCheckedChange={(checked) => handleVisibilityChange('showStats', checked)}
                      />
                      {safeSettings.showStats ? (
                        <Eye className="h-4 w-4 text-green-600" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-slate-400" />
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <Briefcase className="h-5 w-5 text-indigo-500" />
                      <span className="font-medium text-slate-700">פרויקטים אחרונים</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={safeSettings.showRecentProjects}
                        onCheckedChange={(checked) => handleVisibilityChange('showRecentProjects', checked)}
                      />
                      {safeSettings.showRecentProjects ? (
                        <Eye className="h-4 w-4 text-green-600" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-slate-400" />
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <CheckSquare className="h-5 w-5 text-blue-500" />
                      <span className="font-medium text-slate-700">משימות קרובות</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={safeSettings.showUpcomingTasks}
                        onCheckedChange={(checked) => handleVisibilityChange('showUpcomingTasks', checked)}
                      />
                      {safeSettings.showUpcomingTasks ? (
                        <Eye className="h-4 w-4 text-green-600" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-slate-400" />
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <TrendingUp className="h-5 w-5 text-emerald-500" />
                      <span className="font-medium text-slate-700">הצעות מחיר</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={safeSettings.showQuoteStatus}
                        onCheckedChange={(checked) => handleVisibilityChange('showQuoteStatus', checked)}
                      />
                      {safeSettings.showQuoteStatus ? (
                        <Eye className="h-4 w-4 text-green-600" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-slate-400" />
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-violet-500" />
                      <span className="font-medium text-slate-700">לוגי זמן</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={safeSettings.showTimerLogs}
                        onCheckedChange={(checked) => handleVisibilityChange('showTimerLogs', checked)}
                      />
                      {safeSettings.showTimerLogs ? (
                        <Eye className="h-4 w-4 text-green-600" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-slate-400" />
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-amber-500" />
                      <span className="font-medium text-slate-700">פגישות</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={safeSettings.showMeetings}
                        onCheckedChange={(checked) => handleVisibilityChange('showMeetings', checked)}
                      />
                      {safeSettings.showMeetings ? (
                        <Eye className="h-4 w-4 text-green-600" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-slate-400" />
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="text-sm text-blue-700">
                  <p className="font-medium mb-1">💡 טיפים:</p>
                  <ul className="space-y-1 mr-4 list-disc">
                    <li>הפעל או השבת קטעים לפי הצורך</li>
                    <li>השינויים נשמרים אוטומטית</li>
                    <li>תוכל לשנות בכל עת</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}