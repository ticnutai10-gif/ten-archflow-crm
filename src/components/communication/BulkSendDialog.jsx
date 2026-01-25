import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Send, Mail, Phone, MessageSquare, Users, 
  Loader2, CheckCircle2, XCircle, AlertCircle,
  ChevronDown, List
} from "lucide-react";
import { toast } from "sonner";
import { sendWhatsApp } from "@/functions/sendWhatsApp";
import { sendSMS } from "@/functions/sendSMS";
import DistributionListManager from "./DistributionListManager";

export default function BulkSendDialog({ 
  open, 
  onClose, 
  defaultRecipients = [],
  defaultSubject = "",
  defaultMessage = "",
  attachmentHtml = null,
  title = "שליחה מרובה"
}) {
  const [recipients, setRecipients] = useState([]);
  const [channels, setChannels] = useState({ email: true, whatsapp: false, sms: false });
  const [subject, setSubject] = useState(defaultSubject);
  const [message, setMessage] = useState(defaultMessage);
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState([]);
  const [showListManager, setShowListManager] = useState(false);
  const [manualEmail, setManualEmail] = useState("");
  const [manualPhone, setManualPhone] = useState("");

  useEffect(() => {
    if (open) {
      setRecipients(defaultRecipients.map(r => ({
        name: r.name || r.full_name || r.email,
        email: r.email || "",
        phone: r.phone || r.whatsapp || "",
        selected: true
      })));
      setSubject(defaultSubject);
      setMessage(defaultMessage);
      setProgress(0);
      setResults([]);
    }
  }, [open, defaultRecipients, defaultSubject, defaultMessage]);

  const addManualRecipient = () => {
    if (!manualEmail && !manualPhone) {
      toast.error("יש להזין אימייל או טלפון");
      return;
    }
    
    setRecipients(prev => [...prev, {
      name: manualEmail || manualPhone,
      email: manualEmail,
      phone: manualPhone,
      selected: true,
      manual: true
    }]);
    setManualEmail("");
    setManualPhone("");
  };

  const handleSelectList = (list) => {
    const newRecipients = (list.members || []).map(m => ({
      name: m.name,
      email: m.email || "",
      phone: m.phone || "",
      selected: true,
      fromList: list.name
    }));
    
    // Merge without duplicates
    const existingEmails = new Set(recipients.map(r => r.email).filter(Boolean));
    const toAdd = newRecipients.filter(r => !r.email || !existingEmails.has(r.email));
    
    setRecipients(prev => [...prev, ...toAdd]);
    setShowListManager(false);
    toast.success(`נוספו ${toAdd.length} נמענים מהרשימה "${list.name}"`);
  };

  const toggleRecipient = (index) => {
    setRecipients(prev => prev.map((r, i) => 
      i === index ? { ...r, selected: !r.selected } : r
    ));
  };

  const removeRecipient = (index) => {
    setRecipients(prev => prev.filter((_, i) => i !== index));
  };

  const getSelectedRecipients = () => recipients.filter(r => r.selected);

  const handleSend = async () => {
    const selected = getSelectedRecipients();
    if (selected.length === 0) {
      toast.error("יש לבחור לפחות נמען אחד");
      return;
    }

    if (!channels.email && !channels.whatsapp && !channels.sms) {
      toast.error("יש לבחור לפחות ערוץ תקשורת אחד");
      return;
    }

    setSending(true);
    setResults([]);
    const newResults = [];
    let completed = 0;

    for (const recipient of selected) {
      const result = { recipient, channels: {} };

      // Send Email
      if (channels.email && recipient.email) {
        try {
          await base44.integrations.Core.SendEmail({
            to: recipient.email,
            subject: subject,
            body: attachmentHtml || message
          });
          result.channels.email = { success: true };
        } catch (error) {
          result.channels.email = { success: false, error: error.message };
        }
      }

      // Send WhatsApp
      if (channels.whatsapp && recipient.phone) {
        try {
          await sendWhatsApp({ to: recipient.phone, message });
          result.channels.whatsapp = { success: true };
        } catch (error) {
          result.channels.whatsapp = { success: false, error: error.message };
        }
      }

      // Send SMS
      if (channels.sms && recipient.phone) {
        try {
          await sendSMS({ to: recipient.phone, message });
          result.channels.sms = { success: true };
        } catch (error) {
          result.channels.sms = { success: false, error: error.message };
        }
      }

      newResults.push(result);
      completed++;
      setProgress((completed / selected.length) * 100);
      setResults([...newResults]);
    }

    setSending(false);
    
    const successCount = newResults.filter(r => 
      Object.values(r.channels).some(c => c.success)
    ).length;
    
    toast.success(`השליחה הושלמה: ${successCount}/${selected.length} הצליחו`);
  };

  const selectedCount = getSelectedRecipients().length;

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Send className="w-6 h-6 text-blue-600" />
              {title}
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="recipients" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="recipients">נמענים ({selectedCount})</TabsTrigger>
              <TabsTrigger value="message">תוכן</TabsTrigger>
              <TabsTrigger value="results" disabled={results.length === 0}>תוצאות</TabsTrigger>
            </TabsList>

            <TabsContent value="recipients" className="space-y-4 mt-4">
              {/* Channels */}
              <div className="space-y-2">
                <Label>ערוצי שליחה</Label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-slate-50">
                    <Checkbox
                      checked={channels.email}
                      onCheckedChange={(v) => setChannels(prev => ({ ...prev, email: v }))}
                    />
                    <Mail className="w-4 h-4 text-blue-500" />
                    <span>מייל</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-slate-50">
                    <Checkbox
                      checked={channels.whatsapp}
                      onCheckedChange={(v) => setChannels(prev => ({ ...prev, whatsapp: v }))}
                    />
                    <MessageSquare className="w-4 h-4 text-green-500" />
                    <span>WhatsApp</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-slate-50">
                    <Checkbox
                      checked={channels.sms}
                      onCheckedChange={(v) => setChannels(prev => ({ ...prev, sms: v }))}
                    />
                    <Phone className="w-4 h-4 text-purple-500" />
                    <span>SMS</span>
                  </label>
                </div>
              </div>

              {/* Add Recipients */}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowListManager(true)} className="gap-2">
                  <List className="w-4 h-4" />
                  בחר מרשימת תפוצה
                </Button>
              </div>

              {/* Manual Add */}
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <Label className="text-xs">אימייל</Label>
                  <Input 
                    value={manualEmail} 
                    onChange={(e) => setManualEmail(e.target.value)} 
                    placeholder="email@example.com"
                  />
                </div>
                <div className="flex-1">
                  <Label className="text-xs">טלפון</Label>
                  <Input 
                    value={manualPhone} 
                    onChange={(e) => setManualPhone(e.target.value)} 
                    placeholder="050-1234567"
                  />
                </div>
                <Button onClick={addManualRecipient} size="icon" variant="outline">
                  <Users className="w-4 h-4" />
                </Button>
              </div>

              {/* Recipients List */}
              <div className="border rounded-lg max-h-60 overflow-y-auto">
                {recipients.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>אין נמענים</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {recipients.map((recipient, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-3 hover:bg-slate-50">
                        <Checkbox
                          checked={recipient.selected}
                          onCheckedChange={() => toggleRecipient(idx)}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{recipient.name}</div>
                          <div className="text-xs text-slate-500 flex gap-2">
                            {recipient.email && <span>{recipient.email}</span>}
                            {recipient.phone && <span>{recipient.phone}</span>}
                          </div>
                        </div>
                        {recipient.fromList && (
                          <Badge variant="outline" className="text-xs">{recipient.fromList}</Badge>
                        )}
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-6 w-6 text-slate-400 hover:text-red-500"
                          onClick={() => removeRecipient(idx)}
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="message" className="space-y-4 mt-4">
              {channels.email && (
                <div className="space-y-2">
                  <Label>נושא המייל</Label>
                  <Input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="נושא ההודעה..."
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>תוכן ההודעה</Label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="כתוב את ההודעה כאן..."
                  rows={6}
                />
                <p className="text-xs text-slate-500">
                  {attachmentHtml ? "* למייל יצורף גם תוכן HTML מעוצב" : ""}
                </p>
              </div>
            </TabsContent>

            <TabsContent value="results" className="space-y-4 mt-4">
              {sending && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>שולח...</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} />
                </div>
              )}

              <div className="border rounded-lg max-h-60 overflow-y-auto divide-y">
                {results.map((result, idx) => (
                  <div key={idx} className="p-3">
                    <div className="font-medium text-sm mb-1">{result.recipient.name}</div>
                    <div className="flex gap-2">
                      {result.channels.email && (
                        <Badge variant={result.channels.email.success ? "default" : "destructive"} className="text-xs gap-1">
                          <Mail className="w-3 h-3" />
                          {result.channels.email.success ? "נשלח" : "נכשל"}
                        </Badge>
                      )}
                      {result.channels.whatsapp && (
                        <Badge variant={result.channels.whatsapp.success ? "default" : "destructive"} className="text-xs gap-1">
                          <MessageSquare className="w-3 h-3" />
                          {result.channels.whatsapp.success ? "נשלח" : "נכשל"}
                        </Badge>
                      )}
                      {result.channels.sms && (
                        <Badge variant={result.channels.sms.success ? "default" : "destructive"} className="text-xs gap-1">
                          <Phone className="w-3 h-3" />
                          {result.channels.sms.success ? "נשלח" : "נכשל"}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="gap-2 mt-4">
            <Button variant="outline" onClick={onClose}>
              {results.length > 0 ? "סגור" : "ביטול"}
            </Button>
            <Button 
              onClick={handleSend} 
              disabled={sending || selectedCount === 0}
              className="gap-2"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              שלח ל-{selectedCount} נמענים
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DistributionListManager
        open={showListManager}
        onClose={() => setShowListManager(false)}
        onSelectList={handleSelectList}
        mode="select"
      />
    </>
  );
}