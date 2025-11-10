import React from "react";
import { CommunicationMessage } from "@/entities/CommunicationMessage";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";

export default function ClientChat({ clientId, clientName }) {
  const [messages, setMessages] = React.useState([]);
  const [text, setText] = React.useState("");
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    setLoading(true);
    const res = await CommunicationMessage.filter({ client_id: clientId }, "-created_date", 200).catch(() => []);
    setMessages(res || []);
    setLoading(false);
  }, [clientId]);

  React.useEffect(() => { load(); }, [load]);

  const send = async () => {
    const body = text.trim();
    if (!body) return;
    await CommunicationMessage.create({
      type: "internal",
      direction: "in",
      client_id: clientId,
      client_name: clientName,
      body
    });
    setText("");
    load();
  };

  return (
    <Card className="bg-white/80 border-0" dir="rtl">
      <CardContent className="p-4 space-y-3">
        <div className="h-64 overflow-auto border rounded-lg p-3 bg-slate-50">
          {loading ? (
            <div className="text-center text-slate-500">טוען...</div>
          ) : messages.length === 0 ? (
            <div className="text-center text-slate-500">אין הודעות עדיין</div>
          ) : (
            messages.map(m => (
              <div key={m.id} className="mb-3">
                <div className={`inline-block px-3 py-2 rounded-xl ${m.direction === "in" ? "bg-blue-600 text-white" : "bg-white border"}`}>
                  <div className="text-sm">{m.body}</div>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="flex gap-2">
          <Input placeholder="הקלד/י הודעה..." value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} />
          <Button onClick={send} className="gap-1"><Send className="w-4 h-4" /> שלח</Button>
        </div>
      </CardContent>
    </Card>
  );
}