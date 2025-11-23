import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Send, Paperclip, Mail, MessageSquare, X, Upload } from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";

export default function ClientMessaging({ clients, messages, onUpdate, isLoading }) {
  const [selectedClient, setSelectedClient] = useState(null);
  const [messageType, setMessageType] = useState("internal");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    
    try {
      const uploadPromises = files.map(async (file) => {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        return { name: file.name, url: file_url };
      });
      
      const uploaded = await Promise.all(uploadPromises);
      setAttachments([...attachments, ...uploaded]);
    } catch (error) {
      console.error('Error uploading files:', error);
      alert('שגיאה בהעלאת קבצים');
    }
  };

  const handleSendMessage = async () => {
    if (!selectedClient || !body.trim()) {
      alert('יש למלא לקוח והודעה');
      return;
    }

    setSending(true);
    try {
      const messageData = {
        client_id: selectedClient.id,
        client_name: selectedClient.name,
        type: messageType,
        direction: 'out',
        subject: subject || undefined,
        body: body.trim(),
        attachments: attachments.map(a => a.url)
      };

      await base44.entities.CommunicationMessage.create(messageData);

      // Send email if type is email
      if (messageType === 'email' && selectedClient.email) {
        await base44.integrations.Core.SendEmail({
          to: selectedClient.email,
          subject: subject || 'הודעה חדשה',
          body: body
        });
      }

      // Reset form
      setBody("");
      setSubject("");
      setAttachments([]);
      
      onUpdate();
      alert('ההודעה נשלחה בהצלחה');
    } catch (error) {
      console.error('Error sending message:', error);
      alert('שגיאה בשליחת ההודעה');
    }
    setSending(false);
  };

  const filteredClients = clients.filter(c => 
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const clientMessages = selectedClient 
    ? messages.filter(m => m.client_id === selectedClient.id)
    : [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Client List */}
      <div className="lg:col-span-1">
        <div className="mb-4">
          <Input
            placeholder="חיפוש לקוחות..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>
        
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {filteredClients.map(client => (
            <Card
              key={client.id}
              className={`p-4 cursor-pointer transition-colors ${
                selectedClient?.id === client.id 
                  ? 'bg-blue-50 border-blue-300' 
                  : 'hover:bg-slate-50'
              }`}
              onClick={() => setSelectedClient(client)}
            >
              <div className="font-semibold text-slate-900">{client.name}</div>
              {client.email && (
                <div className="text-xs text-slate-600 mt-1">{client.email}</div>
              )}
              {client.company && (
                <div className="text-xs text-slate-500">{client.company}</div>
              )}
            </Card>
          ))}
        </div>
      </div>

      {/* Messaging Area */}
      <div className="lg:col-span-2">
        {!selectedClient ? (
          <div className="flex items-center justify-center h-64 text-slate-400">
            <div className="text-center">
              <MessageSquare className="w-16 h-16 mx-auto mb-4" />
              <p>בחר לקוח כדי להתחיל שיחה</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            {/* Selected Client Header */}
            <div className="border-b pb-4 mb-4">
              <h3 className="text-xl font-bold text-slate-900">{selectedClient.name}</h3>
              {selectedClient.email && (
                <p className="text-sm text-slate-600">{selectedClient.email}</p>
              )}
            </div>

            {/* Message History */}
            <div className="flex-1 overflow-y-auto mb-4 space-y-3 max-h-64">
              {clientMessages.length === 0 ? (
                <p className="text-slate-400 text-center py-8">אין הודעות קודמות</p>
              ) : (
                clientMessages.map(msg => (
                  <Card key={msg.id} className={`p-4 ${msg.direction === 'out' ? 'bg-blue-50' : 'bg-slate-50'}`}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {msg.type === 'email' ? <Mail className="w-3 h-3" /> : <MessageSquare className="w-3 h-3" />}
                        </Badge>
                        <Badge className={msg.direction === 'out' ? 'bg-blue-600' : 'bg-green-600'}>
                          {msg.direction === 'out' ? 'נשלח' : 'התקבל'}
                        </Badge>
                      </div>
                      <span className="text-xs text-slate-500">
                        {format(new Date(msg.created_date), 'dd/MM/yyyy HH:mm', { locale: he })}
                      </span>
                    </div>
                    {msg.subject && (
                      <div className="font-semibold text-slate-900 mb-1">{msg.subject}</div>
                    )}
                    <p className="text-slate-700 whitespace-pre-wrap">{msg.body}</p>
                    {msg.attachments?.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {msg.attachments.map((url, idx) => (
                          <a
                            key={idx}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                          >
                            <Paperclip className="w-3 h-3" />
                            קובץ מצורף {idx + 1}
                          </a>
                        ))}
                      </div>
                    )}
                  </Card>
                ))
              )}
            </div>

            {/* New Message Form */}
            <div className="border-t pt-4">
              <div className="mb-3">
                <Select value={messageType} onValueChange={setMessageType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="internal">הודעה פנימית</SelectItem>
                    <SelectItem value="email">אימייל</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(messageType === 'email' || messageType === 'whatsapp') && (
                <Input
                  placeholder="נושא"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="mb-3"
                />
              )}

              <Textarea
                placeholder="כתוב הודעה..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={4}
                className="mb-3"
              />

              {/* Attachments */}
              {attachments.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {attachments.map((file, idx) => (
                    <Badge key={idx} variant="outline" className="gap-2">
                      <Paperclip className="w-3 h-3" />
                      {file.name}
                      <button
                        onClick={() => setAttachments(attachments.filter((_, i) => i !== idx))}
                        className="text-red-600 hover:text-red-800"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              <div className="flex gap-3">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Button type="button" variant="outline" className="gap-2">
                    <Upload className="w-4 h-4" />
                    צרף קבצים
                  </Button>
                </label>

                <Button
                  onClick={handleSendMessage}
                  disabled={sending || !body.trim()}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 gap-2"
                >
                  <Send className="w-4 h-4" />
                  {sending ? 'שולח...' : 'שלח הודעה'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}