
import React from "react";
import { CommunicationMessage } from "@/entities/CommunicationMessage";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Send,
  MessageSquare,
  Mail,
  PhoneCall,
  Pin,
  PinOff,
  Trash2,
  Clock,
  User as UserIcon
} from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";

function TypeIcon({ type, className = "w-4 h-4" }) {
  if (type === "email") return <Mail className={className} />;
  if (type === "whatsapp") return <PhoneCall className={className} />;
  return <MessageSquare className={className} />;
}

export default function ClientCommunication({ client, project }) {
  const [messages, setMessages] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [subject, setSubject] = React.useState("");
  const [body, setBody] = React.useState("");
  const [activeTab, setActiveTab] = React.useState("all");

  const filterQuery = React.useMemo(() => {
    if (client?.id) return { client_id: client.id };
    if (project?.id) return { project_id: project.id };
    return {};
  }, [client?.id, project?.id]);

  const loadMessages = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const items = await CommunicationMessage.filter(filterQuery, "-created_date", 200).catch(() => []);
      
      // ✅ הגנה על התוצאות
      const validItems = Array.isArray(items) ? items : [];
      console.log('[ClientCommunication] Loaded messages:', validItems.length);
      
      const sorted = validItems.slice().sort((a, b) => {
        if (!a || !b) return 0;
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return new Date(b.created_date) - new Date(a.created_date);
      });
      
      setMessages(sorted);
    } catch (error) {
      console.error('[ClientCommunication] Error loading messages:', error);
      setMessages([]);
    }
    setIsLoading(false);
  }, [filterQuery]);

  React.useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // ✅ הגנה על filteredMessages
  const filteredMessages = React.useMemo(() => {
    if (!Array.isArray(messages)) {
      console.error('[ClientCommunication] messages is not an array!', messages);
      return [];
    }
    
    if (activeTab === "all") return messages;
    return messages.filter(m => m?.type === activeTab);
  }, [messages, activeTab]);

  const onSend = async () => {
    if (!body.trim()) return;
    const payload = {
      type: "internal",
      direction: "out",
      subject: subject || undefined,
      body: body.trim(),
      client_id: client?.id,
      client_name: client?.name,
      project_id: project?.id,
      project_name: project?.name
    };
    await CommunicationMessage.create(payload);
    setSubject("");
    setBody("");
    await loadMessages();
  };

  const togglePin = async (msg) => {
    await CommunicationMessage.update(msg.id, { pinned: !msg.pinned });
    await loadMessages();
  };

  const removeMsg = async (msg) => {
    const ok = confirm("למחוק הודעה זו? הפעולה אינה הפיכה.");
    if (!ok) return;
    await CommunicationMessage.delete(msg.id);
    await loadMessages();
  };

  const TypeBadge = ({ type }) => {
    const map = {
      internal: { label: "פנימית", cls: "bg-slate-100 text-slate-700" },
      email: { label: "מייל", cls: "bg-blue-100 text-blue-700" },
      whatsapp: { label: "וואטסאפ", cls: "bg-green-100 text-green-700" },
    }[type] || { label: type, cls: "bg-slate-100 text-slate-700" };
    return <Badge variant="outline" className={map.cls}>{map.label}</Badge>;
  };

  return (
    <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm" dir="rtl">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>מרכז תקשורת</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Composer */}
        <div className="bg-slate-50 rounded-xl p-4 mb-6">
          <div className="grid gap-3">
            <Input
              placeholder="נושא (לא חובה)"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              dir="rtl"
            />
            <Textarea
              placeholder="כתוב/י הודעה פנימית לצוות לגבי הלקוח/פרויקט..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
              dir="rtl"
            />
            <div className="flex justify-end">
              <Button onClick={onSend} className="gap-2">
                <Send className="w-4 h-4" />
                שלח הודעה פנימית
              </Button>
            </div>
          </div>
        </div>

        <Separator className="my-4" />

        {/* Filters */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
          <TabsList className="justify-end w-full">
            <TabsTrigger value="all">הכול</TabsTrigger>
            <TabsTrigger value="internal">פנימי</TabsTrigger>
            <TabsTrigger value="email">מייל</TabsTrigger>
            <TabsTrigger value="whatsapp">וואטסאפ</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Feed */}
        {isLoading ? (
          <div className="space-y-3">
            {Array(4).fill(0).map((_, i) => (
              <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="text-center text-slate-500 py-10">
            אין הודעות להצגה עדיין
          </div>
        ) : (
          <TooltipProvider>
            <div className="space-y-3">
              {filteredMessages.map((m) => (
                <div key={m.id} className={`p-4 rounded-xl border ${m.pinned ? "bg-amber-50 border-amber-200" : "bg-white border-slate-200"} hover:shadow-sm transition`}>
                  <div className="flex items-start gap-3">
                    <div className="shrink-0">
                      <div className={`w-9 h-9 rounded-xl grid place-items-center ${m.type === 'email' ? 'bg-blue-100' : m.type === 'whatsapp' ? 'bg-green-100' : 'bg-slate-100'}`}>
                        <TypeIcon type={m.type} className="w-4 h-4 text-slate-700" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 justify-between">
                        <div className="flex items-center gap-2">
                          <TypeBadge type={m.type} />
                          {m.direction && (
                            <Badge variant="outline" className="bg-slate-50 text-slate-600">
                              {m.direction === "in" ? "נכנס" : "יוצא"}
                            </Badge>
                          )}
                          {m.subject && (
                            <span className="font-semibold text-slate-900">{m.subject}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                          <Clock className="w-3 h-3" />
                          <span>{format(new Date(m.created_date), 'dd/MM/yy HH:mm', { locale: he })}</span>
                          {m.created_by && (
                            <span className="flex items-center gap-1">
                              <UserIcon className="w-3 h-3" />
                              {m.created_by}
                            </span>
                          )}
                        </div>
                      </div>
                      {m.body && (
                        <div className="mt-2 text-slate-700 whitespace-pre-wrap break-words">
                          {m.body}
                        </div>
                      )}
                      {/* attachments placeholder if needed in the future */}
                    </div>
                    <div className="flex items-center gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => togglePin(m)} title={m.pinned ? "בטל הצמדה" : "הצמד"}>
                            {m.pinned ? <Pin className="w-4 h-4 text-amber-600" /> : <PinOff className="w-4 h-4 text-slate-500" />}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>הצמדה</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => removeMsg(m)} className="text-red-600">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>מחק</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TooltipProvider>
        )}
      </CardContent>
    </Card>
  );
}
