import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Send, Bot, User, Loader2, X } from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";

export default function AIClientChatbot({ client, projects }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `שלום! אני עוזר וירטואלי. אני כאן לענות על שאלות לגבי ${client?.name ? `הפרויקטים של ${client.name}` : 'הפרויקטים שלך'}. איך אוכל לעזור?`,
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    
    setMessages(prev => [...prev, {
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    }]);

    setLoading(true);

    try {
      // Build context for AI
      const projectsContext = projects.map(p => `
פרויקט: ${p.name}
סטטוס: ${p.status}
תקציב: ${p.budget || 'לא צוין'}
התקדמות: ${p.progress || 0}%
תאריך התחלה: ${p.start_date || 'לא צוין'}
תאריך סיום משוער: ${p.end_date || 'לא צוין'}
${p.description ? `תיאור: ${p.description}` : ''}
      `).join('\n---\n');

      const systemPrompt = `אתה עוזר וירטואלי חכם ומקצועי שעוזר ללקוחות לקבל מידע על הפרויקטים שלהם.

פרטי הלקוח:
שם: ${client?.name || 'לא ידוע'}
${client?.email ? `אימייל: ${client.email}` : ''}
${client?.company ? `חברה: ${client.company}` : ''}

פרויקטים של הלקוח:
${projectsContext || 'אין פרויקטים פעילים'}

הנחיות:
1. ענה בעברית בצורה ברורה ומקצועית
2. השתמש במידע שניתן לך על הפרויקטים
3. אם אין מידע מספיק, הסבר שאתה לא יכול לענות ללא פרטים נוספים
4. היה אדיב ומועיל
5. אל תמציא מידע שלא ניתן לך`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `${systemPrompt}\n\nשאלת הלקוח: ${userMessage}\n\nענה בצורה תמציתית ומועילה:`,
        add_context_from_internet: false
      });

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response,
        timestamp: new Date()
      }]);
    } catch (error) {
      console.error('AI Error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'מצטער, נתקלתי בבעיה. אנא נסה שוב או פנה ישירות לצוות.',
        timestamp: new Date()
      }]);
    }

    setLoading(false);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b pb-3 mb-4">
        <div className="flex items-center gap-2">
          <Bot className="w-6 h-6 text-blue-600" />
          <div>
            <h3 className="font-semibold text-slate-900">עוזר AI</h3>
            <p className="text-xs text-slate-600">שאל אותי כל דבר על הפרויקטים</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-4 max-h-96">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-blue-600" />
              </div>
            )}
            
            <div className={`max-w-[80%] ${msg.role === 'user' ? 'order-1' : ''}`}>
              <div
                className={`rounded-2xl px-4 py-2 ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-900'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              </div>
              <p className="text-xs text-slate-400 mt-1 px-2">
                {format(msg.timestamp, 'HH:mm', { locale: he })}
              </p>
            </div>

            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-slate-600" />
              </div>
            )}
          </div>
        ))}
        
        {loading && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <Bot className="w-4 h-4 text-blue-600" />
            </div>
            <div className="bg-slate-100 rounded-2xl px-4 py-2">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="שאל שאלה..."
          disabled={loading}
        />
        <Button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}