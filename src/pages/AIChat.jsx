import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Loader2, Send, Sparkles, Trash2, Plus } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function AIChat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Build context from recent data
      const [projects, clients, tasks] = await Promise.all([
        base44.entities.Project.list('-created_date').catch(() => []),
        base44.entities.Client.list('-created_date').catch(() => []),
        base44.entities.Task.filter({ status: { $ne: 'הושלמה' } }, '-created_date').catch(() => [])
      ]);

      const context = `
היי! אתה עוזר AI חכם למערכת CRM.
יש לך גישה למידע הבא:
- ${projects.length} פרויקטים
- ${clients.length} לקוחות
- ${tasks.length} משימות פתוחות

השתמש במידע הזה כדי לענות על שאלות, לתת המלצות, ולסייע למשתמש.
`;

      const prompt = `${context}\n\nשאלת המשתמש: ${input}`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: false
      });

      const aiMessage = { role: 'assistant', content: result };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'מצטער, אירעה שגיאה. אנא נסה שוב.' 
      }]);
    }
    setLoading(false);
  };

  const clearChat = () => {
    setMessages([]);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50" dir="rtl">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6 text-center">
          <div className="inline-flex items-center gap-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-2xl shadow-lg">
            <Sparkles className="w-6 h-6" />
            <h1 className="text-2xl font-bold">צ'אט AI חכם</h1>
          </div>
          <p className="text-slate-600 mt-3">שאל אותי כל שאלה על הפרויקטים, הלקוחות והמשימות שלך</p>
        </div>

        {/* Chat Container */}
        <Card className="shadow-2xl bg-white/80 backdrop-blur-sm border-0 overflow-hidden" style={{ height: 'calc(100vh - 240px)' }}>
          <div className="flex flex-col h-full">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                      <Sparkles className="w-10 h-10 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-800 mb-2">מה אני יכול לעזור?</h3>
                    <p className="text-slate-500 mb-6">אני כאן כדי לעזור לך עם כל מה שקשור לפרויקטים, לקוחות ומשימות</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto">
                      {[
                        'מה הפרויקטים הפעילים שלי?',
                        'תן לי סיכום של המשימות הדחופות',
                        'אילו לקוחות דורשים תשומת לב?',
                        'איך אני יכול לשפר את ניהול הפרויקטים?'
                      ].map((suggestion, i) => (
                        <button
                          key={i}
                          onClick={() => setInput(suggestion)}
                          className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-purple-50 hover:border-purple-300 transition-all text-sm text-slate-700 text-right"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((message, index) => (
                    <div
                      key={index}
                      className={`flex ${message.role === 'user' ? 'justify-start' : 'justify-end'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl p-4 ${
                          message.role === 'user'
                            ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                            : 'bg-white border border-slate-200'
                        }`}
                      >
                        {message.role === 'assistant' ? (
                          <div className="prose prose-sm max-w-none">
                            <ReactMarkdown>{message.content}</ReactMarkdown>
                          </div>
                        ) : (
                          <p className="text-sm leading-relaxed">{message.content}</p>
                        )}
                      </div>
                    </div>
                  ))}
                  {loading && (
                    <div className="flex justify-end">
                      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                        <span className="text-sm text-slate-600">חושב...</span>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input Area */}
            <div className="border-t bg-white/50 backdrop-blur-sm p-4">
              <div className="flex gap-2 items-end">
                {messages.length > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={clearChat}
                    className="flex-shrink-0"
                    title="נקה שיחה"
                  >
                    <Trash2 className="w-5 h-5 text-slate-500" />
                  </Button>
                )}
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="שאל אותי משהו..."
                  className="flex-1 min-h-[60px] max-h-[120px] resize-none border-slate-200 focus:border-purple-400"
                  disabled={loading}
                />
                <Button
                  onClick={sendMessage}
                  disabled={!input.trim() || loading}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 flex-shrink-0"
                  size="icon"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-slate-500 mt-2 text-center">
                לחץ Enter לשליחה, Shift+Enter לשורה חדשה
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}