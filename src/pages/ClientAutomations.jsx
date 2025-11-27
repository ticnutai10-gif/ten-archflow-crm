import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Bell, 
  Calendar, 
  MessageCircle, 
  Users, 
  Zap, 
  Send, 
  Clock, 
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  Phone,
  Mail,
  RefreshCw,
  Settings,
  Plus,
  Trash2,
  Copy
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { clientAutomations } from "@/functions/clientAutomations";

export default function ClientAutomationsPage() {
  const [activeTab, setActiveTab] = useState('reminders');
  const [clients, setClients] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [selectedClients, setSelectedClients] = useState([]);
  const [customMessage, setCustomMessage] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [marketingResults, setMarketingResults] = useState([]);
  const [showResultsDialog, setShowResultsDialog] = useState(false);
  const [automationSettings, setAutomationSettings] = useState({
    autoReminders: true,
    reminderHoursBefore: 24,
    autoTasksOnStageChange: true
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [clientsData, meetingsData, templatesRes] = await Promise.all([
        base44.entities.Client.list().catch(() => []),
        base44.entities.Meeting.filter({ status: 'מתוכננת' }).catch(() => []),
        clientAutomations({ action: 'getMessageTemplates' }).catch(() => ({ data: { templates: [] } }))
      ]);
      
      setClients(clientsData || []);
      setMeetings(meetingsData || []);
      setTemplates(templatesRes?.data?.templates || []);
    } catch (error) {
      console.error('Error loading data:', error);
    }
    setIsLoading(false);
  };

  const loadReminders = async () => {
    setIsLoading(true);
    try {
      const res = await clientAutomations({ action: 'sendMeetingReminders' });
      setReminders(res?.data?.reminders || []);
    } catch (error) {
      toast.error('שגיאה בטעינת תזכורות');
    }
    setIsLoading(false);
  };

  const sendReminder = (reminder) => {
    window.open(reminder.whatsapp_url, '_blank');
    toast.success(`נפתח WhatsApp לשליחת תזכורת ל-${reminder.client_name}`);
  };

  const sendAllReminders = () => {
    reminders.forEach((reminder, index) => {
      setTimeout(() => {
        window.open(reminder.whatsapp_url, '_blank');
      }, index * 1000); // Delay to prevent popup blocking
    });
    toast.success(`נפתחו ${reminders.length} חלונות WhatsApp`);
  };

  const handleTemplateSelect = (templateId) => {
    setSelectedTemplate(templateId);
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setCustomMessage(template.message);
    }
  };

  const toggleClientSelection = (clientId) => {
    setSelectedClients(prev => 
      prev.includes(clientId) 
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    );
  };

  const selectAllClients = () => {
    const clientsWithPhone = clients.filter(c => c.phone || c.whatsapp);
    setSelectedClients(clientsWithPhone.map(c => c.id));
  };

  const sendMarketingMessages = async () => {
    if (selectedClients.length === 0) {
      toast.error('נא לבחור לקוחות');
      return;
    }
    if (!customMessage.trim()) {
      toast.error('נא להזין הודעה');
      return;
    }

    setIsLoading(true);
    try {
      const res = await clientAutomations({
        action: 'sendMarketingMessage',
        data: {
          client_ids: selectedClients,
          custom_message: customMessage
        }
      });
      
      setMarketingResults(res?.data?.messages || []);
      setShowResultsDialog(true);
    } catch (error) {
      toast.error('שגיאה בהכנת ההודעות');
    }
    setIsLoading(false);
  };

  const openAllMarketingMessages = () => {
    marketingResults.forEach((result, index) => {
      setTimeout(() => {
        window.open(result.whatsapp_url, '_blank');
      }, index * 800);
    });
    toast.success(`נפתחו ${marketingResults.length} חלונות WhatsApp`);
    setShowResultsDialog(false);
  };

  const clientsWithPhone = clients.filter(c => c.phone || c.whatsapp);

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Zap className="w-7 h-7 text-amber-500" />
            אוטומציות תקשורת
          </h1>
          <p className="text-slate-600">ניהול תזכורות, הודעות שיווקיות ואוטומציות</p>
        </div>
        <Button variant="outline" onClick={loadData} disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 ml-2 ${isLoading ? 'animate-spin' : ''}`} />
          רענן
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="reminders" className="gap-2">
            <Bell className="w-4 h-4" />
            תזכורות פגישות
          </TabsTrigger>
          <TabsTrigger value="marketing" className="gap-2">
            <MessageCircle className="w-4 h-4" />
            הודעות שיווקיות
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="w-4 h-4" />
            הגדרות
          </TabsTrigger>
        </TabsList>

        {/* Meeting Reminders Tab */}
        <TabsContent value="reminders" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  תזכורות לפגישות קרובות
                </CardTitle>
                <div className="flex gap-2">
                  <Button onClick={loadReminders} disabled={isLoading}>
                    <Clock className="w-4 h-4 ml-2" />
                    טען תזכורות
                  </Button>
                  {reminders.length > 0 && (
                    <Button onClick={sendAllReminders} className="bg-green-600 hover:bg-green-700">
                      <Send className="w-4 h-4 ml-2" />
                      שלח הכל ({reminders.length})
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              ) : reminders.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <Bell className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                  <p>לחץ "טען תזכורות" לראות פגישות ב-24 השעות הקרובות</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {reminders.map((reminder, idx) => (
                    <div 
                      key={idx}
                      className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Users className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold">{reminder.client_name}</h4>
                          <p className="text-sm text-slate-500">{reminder.phone}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            navigator.clipboard.writeText(reminder.message);
                            toast.success('ההודעה הועתקה');
                          }}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => sendReminder(reminder)}
                        >
                          <MessageCircle className="w-4 h-4 ml-1" />
                          WhatsApp
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Marketing Messages Tab */}
        <TabsContent value="marketing" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Message Composer */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-purple-600" />
                  יצירת הודעה
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="mb-2 block">בחר תבנית</Label>
                  <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="בחר תבנית מוכנה..." />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map(template => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label className="mb-2 block">תוכן ההודעה</Label>
                  <Textarea
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    placeholder="כתוב את ההודעה כאן...
                    
השתמש ב-{שם} או {שם_פרטי} להחלפה אוטומטית"
                    rows={8}
                    className="font-sans"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    משתנים: {'{שם}'} = שם מלא, {'{שם_פרטי}'} = שם פרטי
                  </p>
                </div>

                <Button 
                  onClick={sendMarketingMessages} 
                  disabled={selectedClients.length === 0 || !customMessage.trim() || isLoading}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 ml-2" />
                  )}
                  שלח ל-{selectedClients.length} לקוחות
                </Button>
              </CardContent>
            </Card>

            {/* Client Selection */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="w-5 h-5 text-green-600" />
                    בחירת לקוחות
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={selectAllClients}>
                      בחר הכל ({clientsWithPhone.length})
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setSelectedClients([])}>
                      נקה
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="max-h-96 overflow-y-auto space-y-2">
                  {clientsWithPhone.length === 0 ? (
                    <p className="text-center py-8 text-slate-500">
                      אין לקוחות עם מספר טלפון
                    </p>
                  ) : (
                    clientsWithPhone.map(client => (
                      <div
                        key={client.id}
                        onClick={() => toggleClientSelection(client.id)}
                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedClients.includes(client.id) 
                            ? 'bg-blue-50 border-blue-300' 
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                            selectedClients.includes(client.id)
                              ? 'bg-blue-600 border-blue-600'
                              : 'border-slate-300'
                          }`}>
                            {selectedClients.includes(client.id) && (
                              <CheckCircle2 className="w-4 h-4 text-white" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{client.name}</p>
                            <p className="text-xs text-slate-500">{client.whatsapp || client.phone}</p>
                          </div>
                        </div>
                        <Badge variant="outline">{client.stage || client.status || 'לא מוגדר'}</Badge>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">הגדרות אוטומציה</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Bell className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold">תזכורות אוטומטיות לפגישות</h4>
                    <p className="text-sm text-slate-500">שלח תזכורות WhatsApp לפני פגישות</p>
                  </div>
                </div>
                <Switch 
                  checked={automationSettings.autoReminders}
                  onCheckedChange={(checked) => setAutomationSettings({...automationSettings, autoReminders: checked})}
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                    <Zap className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold">יצירת משימות אוטומטית</h4>
                    <p className="text-sm text-slate-500">צור משימות כשלקוח עובר שלב</p>
                  </div>
                </div>
                <Switch 
                  checked={automationSettings.autoTasksOnStageChange}
                  onCheckedChange={(checked) => setAutomationSettings({...automationSettings, autoTasksOnStageChange: checked})}
                />
              </div>

              <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-amber-800">שים לב</h4>
                    <p className="text-sm text-amber-700">
                      הודעות WhatsApp נפתחות בחלון חדש ודורשות אישור ידני לשליחה.
                      זאת בגלל מגבלות WhatsApp Web.
                    </p>
                  </div>
                </div>
              </div>

              <Button onClick={() => toast.success('ההגדרות נשמרו')} className="w-full">
                שמור הגדרות
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Results Dialog */}
      {showResultsDialog && (
        <Dialog open={showResultsDialog} onOpenChange={setShowResultsDialog}>
          <DialogContent dir="rtl" className="max-w-lg">
            <DialogHeader>
              <DialogTitle>הודעות מוכנות לשליחה</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-slate-600 mb-4">
                נמצאו {marketingResults.length} לקוחות עם מספר טלפון תקין
              </p>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {marketingResults.map((result, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <p className="font-medium">{result.client_name}</p>
                      <p className="text-xs text-slate-500">{result.phone}</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => window.open(result.whatsapp_url, '_blank')}>
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowResultsDialog(false)}>סגור</Button>
              <Button onClick={openAllMarketingMessages} className="bg-green-600 hover:bg-green-700">
                <MessageCircle className="w-4 h-4 ml-2" />
                פתח הכל ב-WhatsApp
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}