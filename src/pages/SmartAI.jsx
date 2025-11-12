import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sparkles,
  Send,
  BarChart3,
  Users,
  FolderOpen,
  Clock,
  TrendingUp,
  Loader2,
  MessageSquare,
  Zap,
  Brain,
  Target,
  Plus,
  Tag,
  Filter,
  X
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import ReactMarkdown from 'react-markdown';
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";

const QUICK_PROMPTS = [
  {
    icon: BarChart3,
    title: "סיכום שבועי",
    prompt: "תן לי סיכום של השבוע האחרון - פרויקטים, משימות ושעות עבודה",
    color: "bg-blue-500"
  },
  {
    icon: Users,
    title: "לקוחות חשובים",
    prompt: "מי הלקוחות הכי חשובים שלי לפי שעות עבודה והכנסות?",
    color: "bg-purple-500"
  },
  {
    icon: TrendingUp,
    title: "הזדמנויות",
    prompt: "זהה לי הזדמנויות עסקיות ופרויקטים שדורשים תשומת לב",
    color: "bg-green-500"
  },
  {
    icon: Clock,
    title: "ניתוח זמנים",
    prompt: "נתח את התפלגות שעות העבודה שלי לפי לקוחות ופרויקטים",
    color: "bg-orange-500"
  },
  {
    icon: Target,
    title: "משימות דחופות",
    prompt: "מה המשימות הכי דחופות שצריך לטפל בהן עכשיו?",
    color: "bg-red-500"
  },
  {
    icon: FolderOpen,
    title: "סטטוס פרויקטים",
    prompt: "תן לי סקירה של כל הפרויקטים הפעילים וההתקדמות שלהם",
    color: "bg-indigo-500"
  }
];

const PRESET_TAGS = [
  { id: 'important', label: '⭐ חשוב', color: 'bg-red-100 text-red-700 border-red-300' },
  { id: 'work', label: '💼 עבודה', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  { id: 'personal', label: '👤 אישי', color: 'bg-purple-100 text-purple-700 border-purple-300' },
  { id: 'archive', label: '📦 ארכיון', color: 'bg-gray-100 text-gray-700 border-gray-300' },
  { id: 'client', label: '🤝 לקוח', color: 'bg-green-100 text-green-700 border-green-300' },
  { id: 'urgent', label: '🔥 דחוף', color: 'bg-orange-100 text-orange-700 border-orange-300' },
  { id: 'follow-up', label: '📞 מעקב', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  { id: 'idea', label: '💡 רעיון', color: 'bg-pink-100 text-pink-700 border-pink-300' }
];

// Helper functions for localStorage tags management
const getConversationTags = (conversationId) => {
  try {
    const tagsData = localStorage.getItem('conversation-tags');
    const allTags = tagsData ? JSON.parse(tagsData) : {};
    return allTags[conversationId] || [];
  } catch {
    return [];
  }
};

const setConversationTags = (conversationId, tags) => {
  try {
    const tagsData = localStorage.getItem('conversation-tags');
    const allTags = tagsData ? JSON.parse(tagsData) : {};
    allTags[conversationId] = tags;
    localStorage.setItem('conversation-tags', JSON.stringify(allTags));
  } catch (error) {
    console.error('Error saving tags:', error);
  }
};

const toggleConversationTag = (conversationId, tagId) => {
  const currentTags = getConversationTags(conversationId);
  const newTags = currentTags.includes(tagId)
    ? currentTags.filter(t => t !== tagId)
    : [...currentTags, tagId];
  setConversationTags(conversationId, newTags);
  return newTags;
};

export default function SmartAIPage() {
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [selectedTagFilter, setSelectedTagFilter] = useState(null);
  const [conversationTags, setConversationTagsState] = useState({});
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (currentConversation) {
      const unsubscribe = base44.agents.subscribeToConversation(
        currentConversation.id,
        (data) => {
          setMessages(data.messages || []);
          scrollToBottom();
        }
      );

      return () => unsubscribe();
    }
  }, [currentConversation]);

  // Load tags for all conversations
  useEffect(() => {
    const tags = {};
    conversations.forEach(conv => {
      tags[conv.id] = getConversationTags(conv.id);
    });
    setConversationTagsState(tags);
  }, [conversations]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const loadConversations = async () => {
    try {
      const convs = await base44.agents.listConversations({
        agent_name: "smart_assistant"
      });
      
      setConversations(convs || []);
    } catch (error) {
      console.error('Error loading conversations:', error);
      toast.error('שגיאה בטעינת השיחות');
    }
  };

  const createNewConversation = async () => {
    try {
      const conv = await base44.agents.createConversation({
        agent_name: "smart_assistant",
        metadata: {
          name: `שיחה חדשה - ${new Date().toLocaleString('he-IL')}`,
          description: "שיחה עם העוזר החכם"
        }
      });
      
      setCurrentConversation(conv);
      setMessages([]);
      await loadConversations();
      inputRef.current?.focus();
      toast.success('שיחה חדשה נוצרה');
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast.error('שגיאה ביצירת שיחה חדשה');
    }
  };

  const selectConversation = async (conv) => {
    try {
      const fullConv = await base44.agents.getConversation(conv.id);
      setCurrentConversation(fullConv);
      setMessages(fullConv.messages || []);
      scrollToBottom();
    } catch (error) {
      console.error('Error loading conversation:', error);
      toast.error('שגיאה בטעינת השיחה');
    }
  };

  const handleToggleTag = (conversationId, tagId, e) => {
    if (e) {
      e.stopPropagation();
    }
    
    const newTags = toggleConversationTag(conversationId, tagId);
    setConversationTagsState(prev => ({
      ...prev,
      [conversationId]: newTags
    }));
    
    const tag = PRESET_TAGS.find(t => t.id === tagId);
    toast.success(`תגית "${tag?.label}" ${newTags.includes(tagId) ? 'נוספה' : 'הוסרה'}`);
  };

  const sendMessage = async (messageText = inputMessage) => {
    if (!messageText.trim()) return;
    if (!currentConversation) {
      await createNewConversation();
      setTimeout(() => sendMessage(messageText), 500);
      return;
    }

    setIsSending(true);
    const userMessage = messageText.trim();
    setInputMessage("");

    try {
      await base44.agents.addMessage(currentConversation, {
        role: "user",
        content: userMessage
      });
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('שגיאה בשליחת ההודעה');
    } finally {
      setIsSending(false);
    }
  };

  const handleQuickPrompt = (prompt) => {
    setInputMessage(prompt);
    setTimeout(() => sendMessage(prompt), 100);
  };

  // Filter conversations by selected tag
  const filteredConversations = selectedTagFilter
    ? conversations.filter(conv => {
        const tags = conversationTags[conv.id] || [];
        return tags.includes(selectedTagFilter);
      })
    : conversations;

  const MessageBubble = ({ message }) => {
    const isUser = message.role === 'user';
    
    return (
      <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
        {!isUser && (
          <Avatar className="h-8 w-8 flex-shrink-0 mt-1">
            <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-600 text-white">
              <Brain className="w-4 h-4" />
            </AvatarFallback>
          </Avatar>
        )}
        
        <div className={`max-w-[85%] ${isUser ? 'order-first' : ''}`}>
          {message.content && (
            <div className={`rounded-2xl px-4 py-3 ${
              isUser 
                ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white' 
                : 'bg-white border border-slate-200 text-slate-900'
            }`}>
              {isUser ? (
                <p className="text-sm leading-relaxed">{message.content}</p>
              ) : (
                <ReactMarkdown 
                  className="text-sm prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                  components={{
                    p: ({ children }) => <p className="my-2 leading-relaxed">{children}</p>,
                    ul: ({ children }) => <ul className="my-2 mr-4 list-disc">{children}</ul>,
                    ol: ({ children }) => <ol className="my-2 mr-4 list-decimal">{children}</ol>,
                    li: ({ children }) => <li className="my-1">{children}</li>,
                    strong: ({ children }) => <strong className="font-bold text-blue-600">{children}</strong>,
                    code: ({ inline, children }) => inline ? (
                      <code className="px-1 py-0.5 rounded bg-slate-100 text-slate-700 text-xs">
                        {children}
                      </code>
                    ) : (
                      <code className="block p-2 rounded bg-slate-100 text-slate-700 text-xs my-2">
                        {children}
                      </code>
                    ),
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              )}
            </div>
          )}
          
          {message.tool_calls && message.tool_calls.length > 0 && (
            <div className="mt-2 space-y-2">
              {message.tool_calls.map((tool, idx) => (
                <div 
                  key={idx} 
                  className="text-xs bg-blue-50 border border-blue-200 rounded-lg p-2 flex items-center gap-2"
                >
                  <Zap className="w-3 h-3 text-blue-600 flex-shrink-0" />
                  <span className="text-blue-800">
                    {tool.status === 'running' || tool.status === 'in_progress' ? (
                      <>
                        <Loader2 className="w-3 h-3 inline animate-spin ml-1" />
                        מבצע פעולה...
                      </>
                    ) : tool.status === 'completed' || tool.status === 'success' ? (
                      <>✓ פעולה הושלמה בהצלחה</>
                    ) : (
                      <>⚡ מבצע: {tool.name}</>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {isUser && (
          <Avatar className="h-8 w-8 flex-shrink-0 mt-1">
            <AvatarFallback className="bg-slate-200 text-slate-700">
              👤
            </AvatarFallback>
          </Avatar>
        )}
      </div>
    );
  };

  return (
    <div className="h-screen flex flex-col p-6 lg:p-8 bg-gradient-to-br from-slate-50 to-slate-100 pl-24 lg:pl-12" dir="rtl">
      <div className="max-w-7xl mx-auto w-full flex flex-col h-full">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center shadow-lg">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">עוזר AI חכם</h1>
              <p className="text-slate-600">ניתוח מתקדם, תובנות עסקיות ופעולות אוטומטיות</p>
            </div>
          </div>
        </div>

        <div className="flex-1 flex gap-6 overflow-hidden">
          <Card className="w-80 flex-shrink-0 shadow-lg border-0 bg-white/80 backdrop-blur-sm flex flex-col">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between mb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  שיחות
                </CardTitle>
                <Button size="sm" onClick={createNewConversation}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              
              {/* Tags Filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full justify-between">
                    <span className="flex items-center gap-2">
                      <Filter className="w-4 h-4" />
                      {selectedTagFilter 
                        ? PRESET_TAGS.find(t => t.id === selectedTagFilter)?.label 
                        : 'כל התגיות'}
                    </span>
                    {selectedTagFilter && (
                      <X 
                        className="w-3 h-3" 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTagFilter(null);
                        }}
                      />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuLabel>סנן לפי תגית</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setSelectedTagFilter(null)}>
                    <span className="font-semibold">כל השיחות</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {PRESET_TAGS.map(tag => (
                    <DropdownMenuItem 
                      key={tag.id}
                      onClick={() => setSelectedTagFilter(tag.id)}
                    >
                      <Badge variant="outline" className={`${tag.color} text-xs`}>
                        {tag.label}
                      </Badge>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </CardHeader>
            
            <ScrollArea className="flex-1">
              <div className="p-3 space-y-2">
                {filteredConversations.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-sm">
                    <MessageSquare className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p>{selectedTagFilter ? 'אין שיחות עם תגית זו' : 'אין שיחות עדיין'}</p>
                    <p className="text-xs mt-1">
                      {selectedTagFilter ? 'בחר תגית אחרת' : 'צור שיחה חדשה כדי להתחיל'}
                    </p>
                  </div>
                ) : (
                  filteredConversations.map((conv) => {
                    const tags = conversationTags[conv.id] || [];
                    
                    return (
                      <div
                        key={conv.id}
                        className={`p-3 rounded-lg cursor-pointer transition-all group ${
                          currentConversation?.id === conv.id
                            ? 'bg-blue-50 border-2 border-blue-500'
                            : 'bg-slate-50 border border-slate-200 hover:bg-slate-100'
                        }`}
                        onClick={() => selectConversation(conv)}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3 className="font-semibold text-sm truncate flex-1">
                            {conv.metadata?.name || 'שיחה'}
                          </h3>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 opacity-0 group-hover:opacity-100 flex-shrink-0"
                              >
                                <Tag className="w-3.5 h-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                              <DropdownMenuLabel>תייג שיחה</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              {PRESET_TAGS.map(tag => (
                                <DropdownMenuItem
                                  key={tag.id}
                                  onClick={(e) => handleToggleTag(conv.id, tag.id, e)}
                                >
                                  <div className="flex items-center justify-between w-full">
                                    <Badge variant="outline" className={`${tag.color} text-xs`}>
                                      {tag.label}
                                    </Badge>
                                    {tags.includes(tag.id) && (
                                      <span className="text-green-600">✓</span>
                                    )}
                                  </div>
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        
                        <p className="text-xs text-slate-500 truncate mb-2">
                          {new Date(conv.created_date).toLocaleDateString('he-IL')}
                        </p>
                        
                        {tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {tags.slice(0, 2).map(tagId => {
                              const tag = PRESET_TAGS.find(t => t.id === tagId);
                              return tag ? (
                                <Badge 
                                  key={tagId} 
                                  variant="outline" 
                                  className={`${tag.color} text-[10px] px-1.5 py-0`}
                                >
                                  {tag.label}
                                </Badge>
                              ) : null;
                            })}
                            {tags.length > 2 && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                +{tags.length - 2}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </Card>

          <div className="flex-1 flex flex-col min-w-0">
            <Card className="flex-1 shadow-lg border-0 bg-white/80 backdrop-blur-sm flex flex-col overflow-hidden">
              {!currentConversation ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8">
                  <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center mb-6 shadow-xl">
                    <Sparkles className="w-12 h-12 text-white" />
                  </div>
                  <h2 className="text-3xl font-bold text-slate-900 mb-3">שלום! אני העוזר החכם שלך 👋</h2>
                  <p className="text-slate-600 text-center max-w-2xl mb-8">
                    אני יכול לעזור לך לנתח נתונים, לנהל משימות, לעקוב אחר פרויקטים ולספק תובנות עסקיות חכמות.
                    בחר באחת מההצעות המהירות או התחל שיחה חדשה!
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-4xl mb-8">
                    {QUICK_PROMPTS.map((prompt, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          if (!currentConversation) createNewConversation();
                          setTimeout(() => handleQuickPrompt(prompt.prompt), 500);
                        }}
                        className="p-4 rounded-xl border-2 border-slate-200 hover:border-blue-500 bg-white hover:shadow-lg transition-all text-right group"
                      >
                        <div className={`w-10 h-10 rounded-lg ${prompt.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                          <prompt.icon className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="font-semibold text-slate-900 mb-1">{prompt.title}</h3>
                        <p className="text-xs text-slate-600 line-clamp-2">{prompt.prompt}</p>
                      </button>
                    ))}
                  </div>

                  <Button size="lg" onClick={createNewConversation} className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
                    <Plus className="w-5 h-5 ml-2" />
                    התחל שיחה חדשה
                  </Button>
                </div>
              ) : (
                <>
                  <ScrollArea className="flex-1 p-6">
                    <div className="max-w-4xl mx-auto">
                      {messages.length === 0 ? (
                        <div className="text-center py-16">
                          <Brain className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                          <h3 className="text-xl font-semibold text-slate-600 mb-2">התחל שיחה</h3>
                          <p className="text-slate-500">שאל אותי כל שאלה או בחר באחת מההצעות המהירות</p>
                          
                          <div className="grid grid-cols-2 gap-3 max-w-2xl mx-auto mt-8">
                            {QUICK_PROMPTS.slice(0, 4).map((prompt, idx) => (
                              <button
                                key={idx}
                                onClick={() => handleQuickPrompt(prompt.prompt)}
                                className="p-3 rounded-lg border border-slate-200 hover:border-blue-500 bg-white hover:shadow-md transition-all text-right text-sm"
                              >
                                <div className="flex items-center gap-2 mb-1">
                                  <prompt.icon className="w-4 h-4 text-slate-600" />
                                  <span className="font-semibold">{prompt.title}</span>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <>
                          {messages.map((message, idx) => (
                            <MessageBubble key={idx} message={message} />
                          ))}
                          <div ref={messagesEndRef} />
                        </>
                      )}
                    </div>
                  </ScrollArea>

                  <div className="border-t bg-white/50 backdrop-blur-sm p-4">
                    <div className="max-w-4xl mx-auto">
                      <div className="flex gap-3">
                        <Input
                          ref={inputRef}
                          value={inputMessage}
                          onChange={(e) => setInputMessage(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              sendMessage();
                            }
                          }}
                          placeholder="שאל אותי כל שאלה או בקש ממני לבצע פעולה..."
                          className="flex-1 text-right"
                          disabled={isSending}
                          dir="rtl"
                        />
                        <Button 
                          onClick={() => sendMessage()} 
                          disabled={!inputMessage.trim() || isSending}
                          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                        >
                          {isSending ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <Send className="w-5 h-5" />
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-slate-500 mt-2 text-center">
                        העוזר החכם יכול לעזור לך עם ניתוח נתונים, יצירת משימות, ועוד הרבה...
                      </p>
                    </div>
                  </div>
                </>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}