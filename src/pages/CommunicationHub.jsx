import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Calendar, Bell, Users, Send } from "lucide-react";

import ClientMessaging from "../components/communication/ClientMessaging";
import MeetingScheduler from "../components/communication/MeetingScheduler";
import NotificationManager from "../components/communication/NotificationManager";
import CommunicationHistory from "../components/communication/CommunicationHistory";
import SmartEmailSuggester from "../components/ai/SmartEmailSuggester";
import { autoTagCommunication } from "../components/ai/AutoCommunicationTagger";
import AIClientChatbot from "../components/communication/AIClientChatbot";

export default function CommunicationHub() {
  const [clients, setClients] = useState([]);
  const [messages, setMessages] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('messages');
  const [stats, setStats] = useState({
    unreadMessages: 0,
    upcomingMeetings: 0,
    pendingNotifications: 0
  });
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [clientsData, messagesData, meetingsData, projectsData] = await Promise.all([
        base44.entities.Client.list(),
        base44.entities.CommunicationMessage.list('-created_date', 100),
        base44.entities.Meeting.list('-meeting_date', 50),
        base44.entities.Project.list()
      ]);

      setClients(clientsData || []);
      setMessages(messagesData || []);
      setMeetings(meetingsData || []);
      setProjects(projectsData || []);

      // Calculate stats
      const now = new Date();
      const upcomingMeetings = (meetingsData || []).filter(m => {
        if (!m.meeting_date) return false;
        const meetingDate = new Date(m.meeting_date);
        return meetingDate >= now && ['מתוכננת', 'אושרה'].includes(m.status);
      });

      setStats({
        unreadMessages: (messagesData || []).filter(m => m.direction === 'in').length,
        upcomingMeetings: upcomingMeetings.length,
        pendingNotifications: 0
      });
    } catch (error) {
      console.error('Error loading communication data:', error);
    }
    setLoading(false);
  };

  return (
    <div className="p-6 lg:p-8 min-h-screen bg-gradient-to-br from-slate-50 to-slate-100" dir="rtl">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">מרכז תקשורת לקוחות</h1>
          <p className="text-slate-600">ניהול כל התקשורת עם הלקוחות במקום אחד</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-white shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-slate-600 font-normal flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                הודעות חדשות
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{stats.unreadMessages}</div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-slate-600 font-normal flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                פגישות קרובות
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">{stats.upcomingMeetings}</div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-slate-600 font-normal flex items-center gap-2">
                <Users className="w-4 h-4" />
                לקוחות פעילים
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{clients.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Card className="bg-white shadow-lg">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <CardHeader className="border-b">
              <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full gap-2">
                <TabsTrigger value="messages" className="gap-2">
                  <MessageSquare className="w-4 h-4" />
                  הודעות
                  {stats.unreadMessages > 0 && (
                    <Badge className="bg-blue-600 text-white rounded-full px-2 py-0.5 text-xs">
                      {stats.unreadMessages}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="meetings" className="gap-2">
                  <Calendar className="w-4 h-4" />
                  פגישות
                </TabsTrigger>
                <TabsTrigger value="notifications" className="gap-2">
                  <Bell className="w-4 h-4" />
                  התראות
                </TabsTrigger>
                <TabsTrigger value="chatbot" className="gap-2">
                  צ'אטבוט AI
                </TabsTrigger>
                <TabsTrigger value="history" className="gap-2">
                  <Send className="w-4 h-4" />
                  היסטוריה
                </TabsTrigger>
              </TabsList>
            </CardHeader>

            <CardContent className="p-6">
              <TabsContent value="messages">
                <ClientMessaging 
                  clients={clients}
                  messages={messages}
                  onUpdate={loadData}
                  isLoading={loading}
                />
              </TabsContent>

              <TabsContent value="meetings">
                <MeetingScheduler 
                  clients={clients}
                  meetings={meetings}
                  onUpdate={loadData}
                  isLoading={loading}
                />
              </TabsContent>

              <TabsContent value="notifications">
                <NotificationManager 
                  clients={clients}
                  onUpdate={loadData}
                  isLoading={loading}
                />
              </TabsContent>

              <TabsContent value="chatbot">
                <AIClientChatbot 
                  client={clients[0]}
                  projects={projects}
                />
              </TabsContent>

              <TabsContent value="history">
                <CommunicationHistory 
                  clients={clients}
                  messages={messages}
                  meetings={meetings}
                  isLoading={loading}
                />
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}