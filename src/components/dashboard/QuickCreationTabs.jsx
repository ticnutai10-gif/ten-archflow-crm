import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckSquare, Bell, Calendar, Plus, Clock, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function QuickCreationTabs({ clients, onUpdate }) {
  const [isLoading, setIsLoading] = useState(false);

  // Task State
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDate, setTaskDate] = useState("");

  // Reminder State
  const [reminderText, setReminderText] = useState("");
  const [reminderTime, setReminderTime] = useState("");

  // Meeting State
  const [meetingTitle, setMeetingTitle] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingClient, setMeetingClient] = useState("");

  const handleCreateTask = async () => {
    if (!taskTitle) return toast.error("נא להזין כותרת למשימה");
    
    setIsLoading(true);
    try {
      await base44.entities.Task.create({
        title: taskTitle,
        due_date: taskDate || new Date().toISOString().split('T')[0],
        status: "חדשה",
        priority: "בינונית",
        description: "נוצר דרך יצירה מהירה",
        reminder_enabled: true, // Default to true for quick tasks
        notify_audio: true
      });
      toast.success("המשימה נוצרה בהצלחה!");
      setTaskTitle("");
      setTaskDate("");
      onUpdate?.();
    } catch (error) {
      console.error(error);
      toast.error("שגיאה ביצירת המשימה");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateReminder = async () => {
    if (!reminderText || !reminderTime) return toast.error("נא להזין תוכן ושעה לתזכורת");

    setIsLoading(true);
    try {
      const user = await base44.auth.me();
      // Using Task entity as a quick reminder container or pure Reminder entity if supported
      // The user schema has Reminder entity, let's use that directly for pure reminders
      await base44.entities.Reminder.create({
        target_type: 'row', // Generic type or 'general'
        target_id: 'quick-' + Date.now(),
        target_name: 'תזכורת מהירה',
        message: reminderText,
        reminder_date: reminderTime,
        created_by_email: user.email,
        status: 'pending',
        notify_popup: true,
        notify_audio: true
      });
      toast.success("התזכורת הוגדרה בהצלחה!");
      setReminderText("");
      setReminderTime("");
      onUpdate?.();
    } catch (error) {
      console.error(error);
      toast.error("שגיאה ביצירת התזכורת");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateMeeting = async () => {
    if (!meetingTitle || !meetingDate) return toast.error("נא להזין כותרת וזמן לפגישה");

    setIsLoading(true);
    try {
      const client = clients?.find(c => c.id === meetingClient);
      
      await base44.entities.Meeting.create({
        title: meetingTitle,
        meeting_date: meetingDate,
        client_id: client?.id,
        client_name: client?.name,
        duration_minutes: 60,
        status: "מתוכננת",
        meeting_type: "פגישת תכנון", // Default
        description: "נוצר דרך יצירה מהירה"
      });
      toast.success("הפגישה נקבעה בהצלחה!");
      setMeetingTitle("");
      setMeetingDate("");
      setMeetingClient("");
      onUpdate?.();
    } catch (error) {
      console.error(error);
      toast.error("שגיאה ביצירת הפגישה");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full shadow-sm border border-slate-200 bg-white/50 backdrop-blur-sm mb-6">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-lg font-medium text-slate-700 flex items-center gap-2">
          <Plus className="w-5 h-5 text-blue-500" />
          פעולות מהירות
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <Tabs defaultValue="task" className="w-full" dir="rtl">
          <TabsList className="grid w-full grid-cols-3 mb-4 bg-slate-100/50">
            <TabsTrigger value="task" className="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm gap-2">
              <CheckSquare className="w-4 h-4" />
              משימה מהירה
            </TabsTrigger>
            <TabsTrigger value="reminder" className="data-[state=active]:bg-white data-[state=active]:text-amber-600 data-[state=active]:shadow-sm gap-2">
              <Bell className="w-4 h-4" />
              תזכורת
            </TabsTrigger>
            <TabsTrigger value="meeting" className="data-[state=active]:bg-white data-[state=active]:text-purple-600 data-[state=active]:shadow-sm gap-2">
              <Calendar className="w-4 h-4" />
              פגישה
            </TabsTrigger>
          </TabsList>

          {/* Quick Task Tab */}
          <TabsContent value="task" className="space-y-3 mt-0">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <Input 
                  placeholder="מה צריך לעשות?" 
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="bg-white"
                />
              </div>
              <div className="w-full sm:w-40">
                <Input 
                  type="date" 
                  value={taskDate}
                  onChange={(e) => setTaskDate(e.target.value)}
                  className="bg-white"
                />
              </div>
              <Button 
                onClick={handleCreateTask} 
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white min-w-[100px]"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "צור משימה"}
              </Button>
            </div>
          </TabsContent>

          {/* Quick Reminder Tab */}
          <TabsContent value="reminder" className="space-y-3 mt-0">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <Input 
                  placeholder="על מה להזכיר לך?" 
                  value={reminderText}
                  onChange={(e) => setReminderText(e.target.value)}
                  className="bg-white"
                />
              </div>
              <div className="w-full sm:w-48">
                <div className="relative">
                  <Input 
                    type="datetime-local" 
                    value={reminderTime}
                    onChange={(e) => setReminderTime(e.target.value)}
                    className="bg-white text-right ltr-input"
                    style={{ direction: 'ltr', textAlign: 'right' }}
                  />
                </div>
              </div>
              <Button 
                onClick={handleCreateReminder} 
                disabled={isLoading}
                className="bg-amber-500 hover:bg-amber-600 text-white min-w-[100px]"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "קבע תזכורת"}
              </Button>
            </div>
          </TabsContent>

          {/* Quick Meeting Tab */}
          <TabsContent value="meeting" className="space-y-3 mt-0">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <Input 
                    placeholder="נושא הפגישה" 
                    value={meetingTitle}
                    onChange={(e) => setMeetingTitle(e.target.value)}
                    className="bg-white"
                  />
                </div>
                <div className="w-full sm:w-48">
                  <Input 
                    type="datetime-local" 
                    value={meetingDate}
                    onChange={(e) => setMeetingDate(e.target.value)}
                    className="bg-white"
                    style={{ direction: 'ltr', textAlign: 'right' }}
                  />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <Select value={meetingClient} onValueChange={setMeetingClient}>
                    <SelectTrigger className="bg-white w-full text-right">
                      <SelectValue placeholder="בחר לקוח (אופציונלי)" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients?.map(client => (
                        <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={handleCreateMeeting} 
                  disabled={isLoading}
                  className="bg-purple-600 hover:bg-purple-700 text-white min-w-[100px]"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "קבע פגישה"}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}