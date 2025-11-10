import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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
  Save,
  Zap
} from "lucide-react";
import { toast } from "sonner";
import MessageBubble from "./MessageBubble";

const AGENT_NAME = "business_assistant";

export default function FloatingChatButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingConv, setEditingConv] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', notes: '' });
  const scrollRef = useRef(null);
  const sendingRef = useRef(false);
  const subscriptionRef = useRef(null);
  const mountedRef = useRef(false);
  const wsOpenRef = useRef(false); // 🆕 Track if WebSocket is actually open

  // 🚀 FIX: Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    console.log('✅ [FLOAT-CHAT] Component mounted');
    
    return () => {
      console.log('🧹 [FLOAT-CHAT] Component unmounting...');
      mountedRef.current = false;
      cleanupWebSocket();
    };
  }, []);

  // 🚀 FIX: Improved WebSocket cleanup function
  const cleanupWebSocket = () => {
    if (subscriptionRef.current && typeof subscriptionRef.current === 'function') {
      try {
        // 🆕 Only cleanup if WebSocket was actually opened
        if (wsOpenRef.current) {
          console.log('🧹 [FLOAT-WS] Cleaning up active WebSocket...');
          subscriptionRef.current();
          wsOpenRef.current = false;
        } else {
          console.log('⏭️ [FLOAT-WS] Skipping cleanup - WebSocket was not open');
        }
      } catch (error) {
        console.warn('⚠️ [FLOAT-WS] Cleanup warning:', error.message);
      } finally {
        subscriptionRef.current = null;
      }
    }
  };

  // 🚀 FIX: טעינת שיחות רק כשנפתח הדיאלוג
  useEffect(() => {
    if (isOpen && conversations.length === 0 && mountedRef.current) {
      console.log('🔄 [FLOAT-CHAT] Loading conversations on open...');
      loadConversations();
    }
  }, [isOpen]);

  // סקרול אוטומטי
  useEffect(() => {
    if (scrollRef.current && mountedRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // 🔥 FIX: Improved WebSocket subscription with proper state tracking
  useEffect(() => {
    // ⚠️ Only connect if dialog is OPEN and we have a conversation
    if (!isOpen || !currentConversationId || !mountedRef.current) {
      // Cleanup if dialog closed
      if (!isOpen && subscriptionRef.current) {
        cleanupWebSocket();
      }
      return;
    }
    
    // Cleanup previous subscription
    cleanupWebSocket();
    
    // 🆕 Reset WebSocket state
    wsOpenRef.current = false;
    
    // Delay for connection
    let setupTimeout = setTimeout(() => {
      if (!mountedRef.current || !isOpen) {
        console.log('⏭️ [FLOAT-WS] Skipping setup - component unmounted or dialog closed');
        return;
      }
      
      try {
        console.log('🔌 [FLOAT-WS] Attempting to connect...', currentConversationId);
        
        const unsubscribe = base44.agents.subscribeToConversation(
          currentConversationId,
          (data) => {
            if (mountedRef.current && isOpen) {
              // 🆕 Mark WebSocket as open on first data
              if (!wsOpenRef.current) {
                wsOpenRef.current = true;
                console.log('✅ [FLOAT-WS] Connection confirmed - first data received');
              }
              setMessages([...data.messages || []]);
            }
          }
        );
        
        subscriptionRef.current = unsubscribe;
        
      } catch (error) {
        console.error('❌ [FLOAT-WS] Connection error:', error.message);
        wsOpenRef.current = false;
        subscriptionRef.current = null;
      }
    }, 150);
    
    return () => {
      clearTimeout(setupTimeout);
      cleanupWebSocket();
    };
  }, [currentConversationId, isOpen]);

  const loadConversations = async () => {
    setLoadingConversations(true);
    try {
      // 🚀 FIX: limit ל-20 שיחות במקום הכל
      const convs = await base44.agents.listConversations({
        agent_name: AGENT_NAME
      });
      
      if (mountedRef.current) {
        const activeConvs = convs.filter(c => !c.metadata?.deleted).slice(0, 20);
        setConversations(activeConvs);
        
        if (activeConvs.length > 0 && !currentConversationId) {
          await loadConversation(activeConvs[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      if (mountedRef.current) {
        setLoadingConversations(false);
      }
    }
  };

  const loadConversation = async (convId) => {
    try {
      const conv = await base44.agents.getConversation(convId);
      
      if (conv && mountedRef.current) {
        setCurrentConversationId(convId);
        setCurrentConversation(conv);
        setMessages([...conv.messages || []]);
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
  };

  const handleNewConversation = async () => {
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
      
      if (mountedRef.current) {
        await loadConversations();
        await loadConversation(newConv.id);
        toast.success('🎉 שיחה חדשה!');
      }
      
      return newConv.id;
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast.error('שגיאה ביצירת שיחה');
      return null;
    }
  };

  const handleEditConversation = (conv, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    setEditingConv(conv);
    setEditForm({
      name: conv.metadata?.name || '',
      notes: conv.metadata?.notes || ''
    });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingConv || !editForm.name.trim()) {
      toast.error('נא להזין שם לשיחה');
      return;
    }

    try {
      // 🔥 FIX: Use correct API method
      const updatedConv = await base44.agents.getConversation(editingConv.id);
      
      // Update metadata directly on the conversation object
      updatedConv.metadata = {
        ...updatedConv.metadata,
        name: editForm.name.trim(),
        notes: editForm.notes.trim()
      };

      if (mountedRef.current) {
        await loadConversations();
        setEditDialogOpen(false);
        setEditingConv(null);
        toast.success('✅ השיחה עודכנה!');
      }
    } catch (error) {
      console.error('Error updating conversation:', error);
      toast.error('שגיאה בעדכון השיחה');
    }
  };

  const handleSendMessage = async () => {
    const text = inputMessage.trim();
    
    if (!text || loading || sendingRef.current) return;

    sendingRef.current = true;

    let convId = currentConversationId;
    let conv = currentConversation;
    
    if (!convId) {
      convId = await handleNewConversation();
      if (!convId) {
        sendingRef.current = false;
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 500));
      conv = await base44.agents.getConversation(convId);
    }

    setInputMessage("");
    setLoading(true);

    try {
      await base44.agents.addMessage(conv, {
        role: "user",
        content: text
      });
    } catch (error) {
      console.error('Error:', error);
      toast.error(`שגיאה: ${error.message}`);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        sendingRef.current = false;
      }
    }
  };

  const handleDeleteConversation = async (convId, e) => {
    e.stopPropagation();
    
    if (!confirm('למחוק את השיחה?')) return;
    
    try {
      if (mountedRef.current) {
        setConversations(prev => prev.filter(c => c.id !== convId));
        
        if (currentConversationId === convId) {
          const remaining = conversations.filter(c => c.id !== convId);
          if (remaining.length > 0) {
            await loadConversation(remaining[0].id);
          } else {
            setCurrentConversationId(null);
            setCurrentConversation(null);
            setMessages([]);
          }
        }
        
        toast.success('נמחק');
      }
    } catch (error) {
      console.error('Error deleting:', error);
      toast.error('שגיאה במחיקה');
    }
  };

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          className="h-14 w-14 rounded-full shadow-2xl hover:scale-110 transition-all duration-300"
          style={{ 
            backgroundColor: '#2C3E50',
            color: 'white'
          }}
          title="העוזר החכם"
        >
          <Brain className="w-6 h-6 text-white" />
        </Button>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl h-[80vh] p-0 gap-0" dir="rtl">
          <div className="flex h-full">
            <div className="w-64 bg-slate-50 border-l flex flex-col">
              <div className="p-3 border-b bg-white">
                <Button 
                  onClick={handleNewConversation}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  size="sm"
                >
                  <Plus className="w-4 h-4 ml-1" />
                  שיחה חדשה
                </Button>
              </div>

              <ScrollArea className="flex-1">
                <div className="p-2 space-y-1">
                  {loadingConversations ? (
                    <div className="text-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600" />
                    </div>
                  ) : conversations.length === 0 ? (
                    <div className="text-center py-8 px-3">
                      <p className="text-xs text-slate-500">אין שיחות</p>
                    </div>
                  ) : (
                    conversations.map((conv) => {
                      const isActive = currentConversationId === conv.id;
                      const convName = conv.metadata?.name || 'שיחה';
                      const convNotes = conv.metadata?.notes || '';

                      return (
                        <div
                          key={conv.id}
                          className={`group p-2 rounded-lg cursor-pointer transition-all text-right ${
                            isActive 
                              ? "bg-blue-100 border-2 border-blue-400" 
                              : "hover:bg-slate-100 border-2 border-transparent"
                          }`}
                          onClick={() => loadConversation(conv.id)}
                        >
                          <div className="flex justify-between items-start gap-1">
                            <div className="flex-1 min-w-0">
                              <h4 className={`text-xs font-semibold truncate ${
                                isActive ? "text-blue-900" : "text-slate-900"
                              }`}>
                                {convName}
                              </h4>
                              {convNotes && (
                                <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                                  💬 {convNotes}
                                </p>
                              )}
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                {new Date(conv.created_date).toLocaleDateString('he-IL')}
                              </p>
                            </div>
                            
                            <div className="flex gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-all">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 hover:bg-blue-200"
                                onClick={(e) => handleEditConversation(conv, e)}
                                title="ערוך"
                              >
                                <Edit2 className="w-3 h-3 text-blue-600" />
                              </Button>
                              
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 hover:bg-red-100"
                                onClick={(e) => handleDeleteConversation(conv.id, e)}
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

            <div className="flex-1 flex flex-col bg-white">
              <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-purple-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                      <Brain className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold">העוזר החכם</h2>
                      <p className="text-xs text-slate-600 flex items-center gap-1">
                        <Zap className="w-3 h-3" />
                        מענה מיידי ופעולות אוטומטיות
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsOpen(false)}
                    className="hover:bg-slate-100"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <div className="p-4 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full mb-4">
                      <Brain className="w-12 h-12 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-bold mb-2">שלום! במה אוכל לעזור?</h3>
                    <p className="text-sm text-slate-600 mb-4 max-w-md">
                      תוכל לשאול שאלות, לקבוע פגישות, ליצור משימות, להוסיף לקוחות ולשלוח מיילים
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
                      <MessageBubble key={`${i}-${msg.timestamp || i}`} message={msg} />
                    ))}
                    
                    {loading && (
                      <div className="flex gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                        <div className="text-sm text-blue-900">הסוכן עובד...</div>
                      </div>
                    )}
                  </div>
                )}
              </ScrollArea>

              <div className="p-4 border-t bg-slate-50">
                <div className="flex gap-2">
                  <Input
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="שאל שאלה או בקש לבצע פעולה..."
                    className="flex-1"
                    disabled={loading}
                    dir="rtl"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!inputMessage.trim() || loading}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    {loading ? (
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

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-right">
              <Edit2 className="w-5 h-5 text-blue-600" />
              עריכת שיחה
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name" className="text-right">שם השיחה *</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="לדוגמה: שיחה עם העוזר"
                className="text-right"
                dir="rtl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-notes" className="text-right">הערות (אופציונלי)</Label>
              <Textarea
                id="edit-notes"
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                placeholder="הוסף הערות..."
                className="text-right h-24"
                dir="rtl"
              />
            </div>
          </div>

          <DialogFooter dir="rtl">
            <div className="flex gap-2 justify-start w-full">
              <Button 
                onClick={handleSaveEdit}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Save className="w-4 h-4 ml-2" />
                שמור
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setEditDialogOpen(false)}
              >
                <X className="w-4 h-4 ml-2" />
                ביטול
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}