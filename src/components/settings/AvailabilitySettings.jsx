import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Clock, Calendar, Save, Check } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const DAYS = [
  { id: 0, label: "ראשון" },
  { id: 1, label: "שני" },
  { id: 2, label: "שלישי" },
  { id: 3, label: "רביעי" },
  { id: 4, label: "חמישי" },
  { id: 5, label: "שישי" },
  { id: 6, label: "שבת" },
];

export default function AvailabilitySettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [availability, setAvailability] = useState({
    working_days: [0, 1, 2, 3, 4],
    working_hours: { start: "09:00", end: "17:00" }
  });
  const [user, setUser] = useState(null);
  const [recordId, setRecordId] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      const records = await base44.entities.UserAvailability.filter({ user_email: currentUser.email });
      if (records.length > 0) {
        setAvailability(records[0]);
        setRecordId(records[0].id);
      }
    } catch (error) {
      console.error("Failed to load availability:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = {
        user_email: user.email,
        working_days: availability.working_days,
        working_hours: availability.working_hours,
        timezone: "Asia/Jerusalem"
      };

      if (recordId) {
        await base44.entities.UserAvailability.update(recordId, data);
      } else {
        const newRecord = await base44.entities.UserAvailability.create(data);
        setRecordId(newRecord.id);
      }
      toast.success("הגדרות זמינות נשמרו בהצלחה");
    } catch (error) {
      console.error("Failed to save:", error);
      toast.error("שגיאה בשמירה");
    } finally {
      setSaving(false);
    }
  };

  const toggleDay = (dayId) => {
    setAvailability(prev => {
      const days = new Set(prev.working_days);
      if (days.has(dayId)) days.delete(dayId);
      else days.add(dayId);
      return { ...prev, working_days: Array.from(days).sort() };
    });
  };

  if (loading) return <div className="p-8 text-center">טוען הגדרות...</div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            שעות פעילות
          </CardTitle>
          <CardDescription>
            הגדר את ימי ושעות העבודה שלך כדי לאפשר קביעת פגישות חכמה
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <Label className="text-base">ימי עבודה</Label>
            <div className="flex flex-wrap gap-2">
              {DAYS.map(day => {
                const isSelected = availability.working_days.includes(day.id);
                return (
                  <button
                    key={day.id}
                    onClick={() => toggleDay(day.id)}
                    className={`
                      px-4 py-2 rounded-full text-sm font-medium transition-all
                      ${isSelected 
                        ? "bg-blue-600 text-white shadow-md" 
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                      }
                    `}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>שעת התחלה</Label>
              <div className="relative">
                <Input
                  type="time"
                  value={availability.working_hours.start}
                  onChange={(e) => setAvailability(prev => ({
                    ...prev,
                    working_hours: { ...prev.working_hours, start: e.target.value }
                  }))}
                  className="pl-10 text-left ltr"
                />
                <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>שעת סיום</Label>
              <div className="relative">
                <Input
                  type="time"
                  value={availability.working_hours.end}
                  onChange={(e) => setAvailability(prev => ({
                    ...prev,
                    working_hours: { ...prev.working_hours, end: e.target.value }
                  }))}
                  className="pl-10 text-left ltr"
                />
                <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
              {saving ? "שומר..." : (
                <>
                  <Save className="w-4 h-4 ml-2" />
                  שמור הגדרות
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}