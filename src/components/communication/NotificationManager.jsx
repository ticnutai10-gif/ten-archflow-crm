import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, Send, CheckCircle, AlertCircle } from "lucide-react";

export default function NotificationManager({ clients, onUpdate, isLoading }) {
  const [notificationType, setNotificationType] = useState("milestone");
  const [selectedClients, setSelectedClients] = useState([]);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);

  const notificationTemplates = {
    milestone: {
      title: "עדכון אבן דרך בפרויקט",
      template: "שלום {client_name},\n\nאנו שמחים לעדכן שהושגה אבן דרך חשובה בפרויקט שלך!\n\n[פרט את האבן דרך כאן]\n\nנשמח לעדכן אותך בהמשך.\n\nבברכה,\nהצוות"
    },
    progress: {
      title: "עדכון התקדמות",
      template: "שלום {client_name},\n\nרצינו לעדכן אותך על ההתקדמות בפרויקט:\n\n[פרט את ההתקדמות]\n\nנשמח לענות על כל שאלה.\n\nבברכה,\nהצוות"
    },
    delay: {
      title: "עדכון על עיכוב",
      template: "שלום {client_name},\n\nרצינו ליידע אותך על עיכוב קל בלוח הזמנים:\n\n[פרט את העיכוב והסיבה]\n\nנעשה כל מה שניתן כדי להשלים בהקדם.\n\nבברכה,\nהצוות"
    },
    completion: {
      title: "פרויקט הושלם",
      template: "שלום {client_name},\n\nאנו שמחים להודיע שהפרויקט שלך הושלם!\n\n[פרט מסקנות או צעדים הבאים]\n\nתודה על האמון והשיתוף פעולה.\n\nבברכה,\nהצוות"
    }
  };

  const handleTemplateChange = (type) => {
    setNotificationType(type);
    const template = notificationTemplates[type];
    setSubject(template.title);
    setMessage(template.template);
  };

  const handleSendNotifications = async () => {
    if (selectedClients.length === 0 || !message.trim()) {
      alert('יש לבחור לקוחות ולכתוב הודעה');
      return;
    }

    setSending(true);
    setSendResult(null);
    
    const results = {
      success: [],
      failed: []
    };

    try {
      for (const clientId of selectedClients) {
        const client = clients.find(c => c.id === clientId);
        if (!client) continue;

        try {
          // Personalize message
          const personalizedMessage = message
            .replace(/{client_name}/g, client.name)
            .replace(/{company}/g, client.company || '');

          // Create communication record
          await base44.entities.CommunicationMessage.create({
            client_id: client.id,
            client_name: client.name,
            type: 'email',
            direction: 'out',
            subject: subject,
            body: personalizedMessage
          });

          // Send email notification
          if (client.email) {
            await base44.integrations.Core.SendEmail({
              to: client.email,
              subject: subject,
              body: personalizedMessage
            });
          }

          results.success.push(client.name);
        } catch (error) {
          console.error(`Failed to send to ${client.name}:`, error);
          results.failed.push(client.name);
        }
      }

      setSendResult(results);
      
      if (results.success.length > 0) {
        setSelectedClients([]);
        setMessage("");
        setSubject("");
        onUpdate();
      }
    } catch (error) {
      console.error('Error sending notifications:', error);
      alert('שגיאה בשליחת ההתראות');
    }
    
    setSending(false);
  };

  const toggleClient = (clientId) => {
    setSelectedClients(prev => 
      prev.includes(clientId) 
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    );
  };

  const selectAll = () => {
    if (selectedClients.length === clients.length) {
      setSelectedClients([]);
    } else {
      setSelectedClients(clients.map(c => c.id));
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Client Selection */}
      <div className="lg:col-span-1">
        <div className="mb-4">
          <Button 
            variant="outline" 
            onClick={selectAll}
            className="w-full"
          >
            {selectedClients.length === clients.length ? 'בטל בחירה' : 'בחר הכל'}
          </Button>
        </div>

        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {clients.map(client => (
            <Card
              key={client.id}
              className={`p-3 cursor-pointer transition-colors ${
                selectedClients.includes(client.id)
                  ? 'bg-purple-50 border-purple-300'
                  : 'hover:bg-slate-50'
              }`}
              onClick={() => toggleClient(client.id)}
            >
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedClients.includes(client.id)}
                  onChange={() => toggleClient(client.id)}
                  className="w-4 h-4"
                />
                <div className="flex-1">
                  <div className="font-semibold text-slate-900">{client.name}</div>
                  {client.email && (
                    <div className="text-xs text-slate-600">{client.email}</div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div className="mt-4 text-sm text-slate-600">
          נבחרו {selectedClients.length} מתוך {clients.length} לקוחות
        </div>
      </div>

      {/* Notification Form */}
      <div className="lg:col-span-2">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">תבנית התראה</label>
            <Select value={notificationType} onValueChange={handleTemplateChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="milestone">עדכון אבן דרך</SelectItem>
                <SelectItem value="progress">עדכון התקדמות</SelectItem>
                <SelectItem value="delay">עדכון עיכוב</SelectItem>
                <SelectItem value="completion">השלמת פרויקט</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500 mt-1">
              ניתן להתאים אישית את ההודעה
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">נושא</label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="נושא ההתראה"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">תוכן ההודעה</label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={12}
              placeholder="כתוב את ההודעה..."
            />
            <p className="text-xs text-slate-500 mt-1">
              משתנים זמינים: {'{client_name}'}, {'{company}'}
            </p>
          </div>

          {sendResult && (
            <Card className="p-4">
              {sendResult.success.length > 0 && (
                <div className="mb-3">
                  <div className="flex items-center gap-2 text-green-600 mb-2">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-semibold">נשלח בהצלחה ל-{sendResult.success.length} לקוחות:</span>
                  </div>
                  <div className="text-sm text-slate-600">
                    {sendResult.success.join(', ')}
                  </div>
                </div>
              )}
              
              {sendResult.failed.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 text-red-600 mb-2">
                    <AlertCircle className="w-5 h-5" />
                    <span className="font-semibold">נכשל עבור {sendResult.failed.length} לקוחות:</span>
                  </div>
                  <div className="text-sm text-slate-600">
                    {sendResult.failed.join(', ')}
                  </div>
                </div>
              )}
            </Card>
          )}

          <Button
            onClick={handleSendNotifications}
            disabled={sending || selectedClients.length === 0 || !message.trim()}
            className="w-full bg-purple-600 hover:bg-purple-700 gap-2"
          >
            <Send className="w-4 h-4" />
            {sending ? 'שולח...' : `שלח ל-${selectedClients.length} לקוחות`}
          </Button>
        </div>
      </div>
    </div>
  );
}