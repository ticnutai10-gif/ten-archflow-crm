import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { 
  MessageCircle, 
  Plus,
  Send,
  Loader2,
  Trash2,
  Brain,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  X,
  Edit2,
  Save,
  Copy,
  CheckCircle,
  Clock,
  Users,
  Briefcase
} from "lucide-react";
import { toast } from "sonner";
import MessageBubble from "../components/chat/MessageBubble";
import QuickActions from "../components/chat/QuickActions";

const AGENT_NAME = "business_assistant";

export default function AIChatPage() {
  const [conversations, setConversations] = useState([]);
  const [currentConvId, setCurrentConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [businessInsights, setBusinessInsights] = useState(null);
  const [whatsappUrl, setWhatsappUrl] = useState('');
  const [showWhatsAppDialog, setShowWhatsAppDialog] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  
  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editingConv, setEditingConv] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editNotes, setEditNotes] = useState("");
  
  const scrollRef = useRef(null);
  const unsubscribeRef = useRef(null);
  const mountedRef = useRef(true);

  // Initial setup and cleanup
  useEffect(() => {
    loadInitialData();
    
    return () => {
      mountedRef.current = false;
      if (unsubscribeRef.current) {
        try {
          unsubscribeRef.current();
        } catch (e) {
          console.warn('Cleanup warning:', e);
        }
        unsubscribeRef.current = null;
      }
    };
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Load business insights
  useEffect(() => {
    loadBusinessInsights();
  }, []);

  // Load WhatsApp URL
  useEffect(() => {
    const url = base44.agents.getWhatsAppConnectURL(AGENT_NAME);
    setWhatsappUrl(url);
  }, []);

  const copyWhatsAppUrl = () => {
    navigator.clipboard.writeText(whatsappUrl);
    setCopiedUrl(true);
    toast.success('✅ הקישור הועתק!');
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const loadBusinessInsights = async () => {
    try {
      const result = await base44.functions.invoke('businessInsights');
      if (result?.data) {
        setBusinessInsights(result.data);
      }
    } catch (error) {
      console.error('Error loading business insights:', error);
    }
  };

  const loadInitialData = async () => {
    try {
      const convs = await base44.agents.listConversations({
        agent_name: AGENT_NAME
      });
      
      if (!mountedRef.current) return;
      
      setConversations(convs || []);
      
      if (convs && convs.length > 0) {
        loadConversation(convs[0].id);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
      toast.error('שגיאה בטעינת שיחות');
    } finally {
      if (mountedRef.current) {
        setLoadingConvs(false);
      }
    }
  };

  const loadConversation = async (convId) => {
    try {
      setCurrentConvId(convId);
      
      const conv = await base44.agents.getConversation(convId);
      
      if (mountedRef.current) {
        setMessages(conv?.messages || []);
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
  };

  // Subscribe to current conversation for real-time updates
  useEffect(() => {
    if (!currentConvId) {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      return;
    }

    // Cleanup previous subscription
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    // Subscribe to updates
    try {
      const unsub = base44.agents.subscribeToConversation(
        currentConvId,
        (data) => {
          if (mountedRef.current) {
            setMessages(data.messages || []);
          }
        }
      );
      unsubscribeRef.current = unsub;
    } catch (error) {
      console.error('Subscribe error:', error);
    }

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [currentConvId]);

  const createNewConversation = async () => {
    try {
      const newConv = await base44.agents.createConversation({
        agent_name: AGENT_NAME,
        metadata: {
          title: `שיחה - ${new Date().toLocaleString('he-IL', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          })}`,
          notes: ''
        }
      });
      
      if (!mountedRef.current) return;
      
      await loadInitialData();
      setCurrentConvId(newConv.id);
      setMessages([]);
      toast.success('🎉 שיחה חדשה נוצרה!');
      
      return newConv.id;
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast.error('שגיאה ביצירת שיחה');
      return null;
    }
  };

  const openEditDialog = (conv) => {
    setEditingConv(conv);
    setEditTitle(conv?.metadata?.title || '');
    setEditNotes(conv?.metadata?.notes || '');
    setEditOpen(true);
  };

  const handleEditConversation = async () => {
    if (!editTitle.trim()) {
      toast.error('נא להזין כותרת לשיחה');
      return;
    }

    try {
      await base44.agents.updateConversation(editingConv.id, {
        metadata: {
          title: editTitle.trim(),
          notes: editNotes.trim()
        }
      });

      if (mountedRef.current) {
        await loadInitialData();
        setEditOpen(false);
        setEditingConv(null);
        toast.success('✅ השיחה עודכנה!');
      }
    } catch (error) {
      console.error('Error updating conversation:', error);
      toast.error('שגיאה בעדכון השיחה');
    }
  };

  const sendMessage = async (messageText) => {
    const text = messageText || inputMessage.trim();
    
    if (!text || sending) return;

    let convId = currentConvId;
    
    // Create new conversation if needed
    if (!convId) {
      convId = await createNewConversation();
      if (!convId) return;
      
      // Wait a bit for the conversation to be ready
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    setInputMessage("");
    setSending(true);

    try {
      const conv = await base44.agents.getConversation(convId);
      
      await base44.agents.addMessage(conv, {
        role: "user",
        content: text
      });
      
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('שגיאה בשליחת הודעה');
    } finally {
      if (mountedRef.current) {
        setSending(false);
      }
    }
  };

  const deleteConversation = async (convId) => {
    if (!confirm('למחוק את השיחה? לא ניתן לשחזר!')) return;

    try {
      await base44.agents.updateConversation(convId, {
        deleted: true
      });

      if (mountedRef.current) {
        await loadInitialData();
        
        if (currentConvId === convId) {
          const remaining = conversations.filter(c => c.id !== convId);
          if (remaining.length > 0) {
            loadConversation(remaining[0].id);
          } else {
            setCurrentConvId(null);
            setMessages([]);
          }
        }
        
        toast.success('✅ השיחה נמחקה');
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast.error('שגיאה במחיקת השיחה');
    }
  };

  const quickActions = [
    { icon: Users, label: "מה מצב הלקוחות שלי?", question: "תן לי סיכום של הלקוחות האחרונים שנוספו למערכת, כולל סטטוס ופרטי קשר", color: "blue" },
    { icon: Briefcase, label: "סיכום פרויקטים פעילים", question: "תן לי סיכום של כל הפרויקטים הפעילים כרגע, עם אחוזי התקדמות ומועדים", color: "purple" },
    { icon: Clock, label: "משימות להיום", question: "מה המשימות שעליי לבצע היום? תן לי רשימה ממוינת לפי עדיפות", color: "green" },
    { icon: AlertTriangle, label: "התראות חשובות", question: "האם יש משימות או פגישות דחופות שאני צריך לדעת עליהן?", color: "red" }
  ];

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 to-purple-50" dir="rtl">
      {/* Sidebar - Conversations */}
      <div className="w-80 bg-white border-l border-slate-200 flex flex-col shadow-lg">
        <div className="p-4 border-b border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Brain className="w-6 h-6 text-blue-600" />
              יועץ עסקי AI
            </h2>
            <Button
              onClick={createNewConversation}
              size="sm"
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              <Plus className="w-4 h-4 ml-1" />
              חדש
            </Button>
          </div>

          <Button
            onClick={() => setShowWhatsAppDialog(true)}
            variant="outline"
            className="w-full gap-2 border-green-200 text-green-700 hover:bg-green-50"
            size="sm"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488" />
            </svg>
            חבר ל-WhatsApp
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {loadingConvs ? (
              <div className="text-center py-8">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-8 px-3">
                <p className="text-sm text-slate-600">אין שיחות</p>
                <Button
                  onClick={createNewConversation}
                  size="sm"
                  variant="outline"
                  className="mt-3"
                >
                  <Plus className="w-4 h-4 ml-1" />
                  צור ראשונה
                </Button>
              </div>
            ) : (
              conversations.map((conv) => {
                const isActive = currentConvId === conv.id;
                const convTitle = conv?.metadata?.title || 'שיחה';

                return (
                  <div
                    key={conv.id}
                    className={`group p-3 rounded-lg cursor-pointer transition-all ${
                      isActive 
                        ? "bg-blue-100 border-2 border-blue-400" 
                        : "hover:bg-slate-50 border-2 border-transparent"
                    }`}
                    onClick={() => loadConversation(conv.id)}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className={`text-sm font-semibold truncate ${
                          isActive ? "text-blue-900" : "text-slate-900"
                        }`}>
                          {convTitle}
                        </h4>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {conv?.created_date ? new Date(conv.created_date).toLocaleDateString('he-IL') : ''}
                        </p>
                      </div>
                      
                      <div className="flex gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditDialog(conv);
                          }}
                          title="ערוך"
                        >
                          <Edit2 className="w-3 h-3 text-blue-600" />
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteConversation(conv.id);
                          }}
                          title="מחק"
                        >
                          <Trash2 className="w-3 h-3 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b px-6 py-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">יועץ עסקי AI פרואקטיבי</h1>
                <p className="text-sm text-slate-600">שאל שאלות, קבל המלצות, צור משימות ועוד</p>
              </div>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <ScrollArea className="flex-1 p-6" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-8">
                <div className="inline-block p-4 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full mb-4">
                  <Brain className="w-16 h-16 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold mb-2">שלום! אני היועץ העסקי שלך 👋</h2>
                <p className="text-slate-600 mb-6">
                  אני כאן לעזור לך לנהל את העסק בצורה יעילה יותר. שאל אותי כל שאלה או בחר פעולה מהירה:
                </p>
              </div>

              <QuickActions 
                actions={quickActions}
                insights={businessInsights}
                onActionClick={(question) => sendMessage(question)}
              />
            </div>
          ) : (
            <div className="space-y-4 max-w-4xl mx-auto">
              {messages.map((msg, i) => (
                <MessageBubble key={`msg-${i}-${msg.timestamp || Date.now()}`} message={msg} />
              ))}
              
              {sending && (
                <div className="flex gap-2 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                  <span className="text-sm text-blue-900">הסוכן חושב ומנתח...</span>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Input Area */}
        <div className="p-6 border-t bg-white">
          <div className="max-w-4xl mx-auto flex gap-3">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="שאל שאלה או בקש לבצע פעולה..."
              disabled={sending}
              className="flex-1"
              dir="rtl"
            />
            <Button
              onClick={() => sendMessage()}
              disabled={!inputMessage.trim() || sending}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              {sending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Send className="w-5 h-5 ml-2" />
                  שלח
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-blue-600" />
              עריכת שיחה
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">כותרת *</label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="כותרת השיחה"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">הערות (אופציונלי)</label>
              <Textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="הערות..."
                className="h-24"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              ביטול
            </Button>
            <Button 
              onClick={handleEditConversation} 
              className="bg-blue-600 hover:bg-blue-700"
              disabled={!editTitle.trim()}
            >
              <Save className="w-4 h-4 ml-2" />
              שמור
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* WhatsApp Dialog */}
      <Dialog open={showWhatsAppDialog} onOpenChange={setShowWhatsAppDialog}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488" />
              </svg>
              חיבור ל-WhatsApp
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-green-900 mb-2">✨ אפשר לי גישה מ-WhatsApp!</h3>
              <p className="text-sm text-green-800">
                חבר את היועץ ל-WhatsApp ותוכל לשלוח שאלות ולקבל עזרה ישירות מהנייד שלך.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">קישור חיבור:</label>
              <div className="flex gap-2">
                <Input
                  value={whatsappUrl}
                  readOnly
                  className="flex-1 font-mono text-xs"
                  dir="ltr"
                />
                <Button
                  onClick={copyWhatsAppUrl}
                  variant="outline"
                  size="icon"
                >
                  {copiedUrl ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-slate-500">
                העתק את הקישור ושלח אותו לעצמך ב-WhatsApp, ואז לחץ עליו מהנייד
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-800">
                💡 <strong>טיפ:</strong> שמור את הקישור בהודעה שמורה ב-WhatsApp כדי לגשת אליו בקלות בעתיד
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => {
                window.open(whatsappUrl, '_blank');
                setShowWhatsAppDialog(false);
              }}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              פתח ב-WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}