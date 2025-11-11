import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  MessageCircle, 
  X,
  Send,
  Loader2,
  Brain,
  Sparkles,
  Plus,
  Trash2,
  Edit2,
  Save
} from "lucide-react";
import { toast } from "sonner";
import MessageBubble from "./MessageBubble";

const AGENT_NAME = "business_assistant";

export default function FloatingChatButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [currentConvId, setCurrentConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingConvs, setLoadingConvs] = useState(false);
  
  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editingConv, setEditingConv] = useState(null);
  const [editName, setEditName] = useState("");
  const [editNotes, setEditNotes] = useState("");
  
  const scrollRef = useRef(null);
  const unsubscribeRef = useRef(null);
  const mountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
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

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Load conversations when opened
  useEffect(() => {
    if (isOpen && conversations.length === 0) {
      loadConversations();
    }
  }, [isOpen]);

  // Subscribe to current conversation
  useEffect(() => {
    if (!currentConvId || !isOpen) {
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
          if (mountedRef.current && isOpen) {
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
  }, [currentConvId, isOpen]);

  const loadConversations = async () => {
    setLoadingConvs(true);
    try {
      const convs = await base44.agents.listConversations({
        agent_name: AGENT_NAME
      });
      
      if (!mountedRef.current) return;
      
      setConversations(convs || []);
      
      if (convs && convs.length > 0 && !currentConvId) {
        setCurrentConvId(convs[0].id);
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

  const createNewConversation = async () => {
    try {
      const newConv = await base44.agents.createConversation({
        agent_name: AGENT_NAME,
        metadata: {
          name: `שיחה - ${new Date().toLocaleString('he-IL', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          })}`,
          notes: ''
        }
      });
      
      if (!mountedRef.current) return;
      
      await loadConversations();
      setCurrentConvId(newConv.id);
      toast.success('🎉 שיחה חדשה נוצרה!');
      
      return newConv.id;
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast.error('שגיאה ביצירת שיחה');
      return null;
    }
  };

  const sendMessage = async () => {
    const text = inputMessage.trim();
    
    if (!text || sending) return;

    let convId = currentConvId;
    
    // Create new conversation if needed
    if (!convId) {
      convId = await createNewConversation();
      if (!convId) return;
      await new Promise(r => setTimeout(r, 300));
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

  const deleteConversation = async (convId, e) => {
    e.stopPropagation();
    
    if (!confirm('למחוק את השיחה לצמיתות?')) return;
    
    try {
      // Remove from local state immediately
      setConversations(prev => prev.filter(c => c.id !== convId));
      
      // If it was the current conversation, switch to another
      if (currentConvId === convId) {
        const remaining = conversations.filter(c => c.id !== convId);
        if (remaining.length > 0) {
          setCurrentConvId(remaining[0].id);
        } else {
          setCurrentConvId(null);
          setMessages([]);
        }
      }
      
      toast.success('✅ השיחה נמחקה');
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast.error('שגיאה במחיקת השיחה');
    }
  };

  const openEditDialog = (conv, e) => {
    e.stopPropagation();
    setEditingConv(conv);
    setEditName(conv.metadata?.name || '');
    setEditNotes(conv.metadata?.notes || '');
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editName.trim()) {
      toast.error('נא להזין שם לשיחה');
      return;
    }

    try {
      // Update local state
      setConversations(prev => 
        prev.map(c => 
          c.id === editingConv.id 
            ? { ...c, metadata: { ...c.metadata, name: editName.trim(), notes: editNotes.trim() } }
            : c
        )
      );
      
      setEditOpen(false);
      setEditingConv(null);
      toast.success('✅ השיחה עודכנה!');
    } catch (error) {
      console.error('Error updating conversation:', error);
      toast.error('שגיאה בעדכון השיחה');
    }
  };

  return (
    <>
      {/* Floating Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          className="h-14 w-14 rounded-full shadow-2xl hover:scale-110 transition-all duration-300 bg-gradient-to-br from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          title="העוזר החכם"
        >
          <Brain className="w-6 h-6 text-white" />
        </Button>
      </div>

      {/* Main Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl h-[80vh] p-0 gap-0" dir="rtl">
          <div className="flex h-full">
            {/* Sidebar - Conversations List */}
            <div className="w-64 bg-slate-50 border-l flex flex-col">
              <div className="p-3 border-b bg-white">
                <Button 
                  onClick={createNewConversation}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  size="sm"
                >
                  <Plus className="w-4 h-4 ml-1" />
                  שיחה חדשה
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
                      <p className="text-xs text-slate-500">אין שיחות</p>
                      <Button
                        onClick={createNewConversation}
                        size="sm"
                        variant="outline"
                        className="mt-3 text-xs"
                      >
                        <Plus className="w-3 h-3 ml-1" />
                        צור ראשונה
                      </Button>
                    </div>
                  ) : (
                    conversations.map((conv) => {
                      const isActive = currentConvId === conv.id;
                      const convName = conv.metadata?.name || 'שיחה';

                      return (
                        <div
                          key={conv.id}
                          className={`group p-2 rounded-lg cursor-pointer transition-all text-right ${
                            isActive 
                              ? "bg-blue-100 border-2 border-blue-400" 
                              : "hover:bg-slate-100 border-2 border-transparent"
                          }`}
                          onClick={() => setCurrentConvId(conv.id)}
                        >
                          <div className="flex justify-between items-start gap-1">
                            <div className="flex-1 min-w-0">
                              <h4 className={`text-xs font-semibold truncate ${
                                isActive ? "text-blue-900" : "text-slate-900"
                              }`}>
                                {convName}
                              </h4>
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                {new Date(conv.created_date).toLocaleDateString('he-IL')}
                              </p>
                            </div>
                            
                            <div className="flex gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 hover:bg-blue-200"
                                onClick={(e) => openEditDialog(conv, e)}
                                title="ערוך"
                              >
                                <Edit2 className="w-3 h-3 text-blue-600" />
                              </Button>
                              
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 hover:bg-red-100"
                                onClick={(e) => deleteConversation(conv.id, e)}
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
            <div className="flex-1 flex flex-col bg-white">
              {/* Header */}
              <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-purple-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                      <Brain className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold">העוזר החכם</h2>
                      <p className="text-xs text-slate-600">מענה מיידי ופעולות אוטומטיות</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsOpen(false)}
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <div className="p-4 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full mb-4">
                      <Brain className="w-12 h-12 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-bold mb-2">שלום! במה אוכל לעזור?</h3>
                    <p className="text-sm text-slate-600 mb-4 max-w-md">
                      שאל שאלות, קבע פגישות, צור משימות, הוסף לקוחות ושלח מיילים
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
                      <div className="flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        שאלות ותשובות
                      </div>
                      <div className="flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        קביעת פגישות
                      </div>
                      <div className="flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        הוספת לקוחות
                      </div>
                      <div className="flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        שליחת מיילים
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((msg, i) => (
                      <MessageBubble key={`msg-${i}-${msg.timestamp || Date.now()}`} message={msg} />
                    ))}
                    
                    {sending && (
                      <div className="flex gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                        <span className="text-sm text-blue-900">הסוכן חושב...</span>
                      </div>
                    )}
                  </div>
                )}
              </ScrollArea>

              {/* Input */}
              <div className="p-4 border-t bg-slate-50">
                <div className="flex gap-2">
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
                    dir="rtl"
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={!inputMessage.trim() || sending}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    {sending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Send className="w-4 h-4 ml-1" />
                        שלח
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-right">
              <Edit2 className="w-5 h-5 text-blue-600" />
              עריכת שיחה
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">שם השיחה *</label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="לדוגמה: שיחה עם העוזר"
                dir="rtl"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">הערות (אופציונלי)</label>
              <Textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="הוסף הערות..."
                className="h-24"
                dir="rtl"
              />
            </div>
          </div>

          <div className="flex gap-2 justify-start">
            <Button onClick={saveEdit} className="bg-blue-600 hover:bg-blue-700">
              <Save className="w-4 h-4 ml-2" />
              שמור
            </Button>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              ביטול
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}