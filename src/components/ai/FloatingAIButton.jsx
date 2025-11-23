import React, { useState } from 'react';
import { MessageSquare, X, Send, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { base44 } from '@/api/base44Client';
import ReactMarkdown from 'react-markdown';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function FloatingAIButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const [projects, clients, tasks] = await Promise.all([
        base44.entities.Project.list('-created_date').catch(() => []),
        base44.entities.Client.list('-created_date').catch(() => []),
        base44.entities.Task.filter({ status: { $ne: 'הושלמה' } }, '-created_date').catch(() => [])
      ]);

      const context = `אתה עוזר AI למערכת CRM. יש ${projects.length} פרויקטים, ${clients.length} לקוחות, ${tasks.length} משימות פתוחות.`;
      const prompt = `${context}\n\nשאלה: ${input}`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: false
      });

      setMessages(prev => [...prev, { role: 'assistant', content: result }]);
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'מצטער, אירעה שגיאה.' 
      }]);
    }
    setLoading(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 group"
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          boxShadow: '0 8px 30px rgba(102, 126, 234, 0.3)',
          border: '1.5px solid rgba(255, 255, 255, 0.3)'
        }}
        title="צ'אט AI"
      >
        <div 
          className="w-10 h-10 bg-white rounded-full flex items-center justify-center transition-transform group-hover:rotate-12"
          style={{ border: '1.5px solid rgba(102, 126, 234, 0.2)' }}
        >
          {isOpen ? (
            <X className="w-5 h-5 text-purple-600" />
          ) : (
            <MessageSquare className="w-5 h-5 text-purple-600" />
          )}
        </div>
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div
          className="fixed bottom-24 right-6 z-50 w-96 h-[600px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-purple-200 animate-in fade-in zoom-in-95 duration-200"
          dir="rtl"
        >
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-bold">צ'אט AI</h3>
                <p className="text-xs opacity-90">עוזר חכם שלך</p>
              </div>
            </div>
            <Link to={createPageUrl('AIChat')}>
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/20">
                פתח מסך מלא
              </Button>
            </Link>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-br from-purple-50/50 to-blue-50/50">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center p-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-3 animate-pulse">
                    <Sparkles className="w-8 h-8 text-white" />
                  </div>
                  <h4 className="font-semibold text-slate-800 mb-2">שלום! 👋</h4>
                  <p className="text-sm text-slate-600">איך אני יכול לעזור?</p>
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                    <div
                      className={`max-w-[85%] rounded-2xl p-3 text-sm ${
                        msg.role === 'user'
                          ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                          : 'bg-white border border-slate-200'
                      }`}
                    >
                      {msg.role === 'assistant' ? (
                        <div className="prose prose-sm max-w-none">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <p>{msg.content}</p>
                      )}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-end">
                    <div className="bg-white border rounded-2xl p-3 flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                      <span className="text-sm text-slate-600">חושב...</span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Input */}
          <div className="p-3 border-t bg-white">
            <div className="flex gap-2 items-end">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="שאל משהו..."
                className="flex-1 min-h-[50px] max-h-[100px] resize-none text-sm"
                disabled={loading}
              />
              <Button
                onClick={sendMessage}
                disabled={!input.trim() || loading}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                size="icon"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}