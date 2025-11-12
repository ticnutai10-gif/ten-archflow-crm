import React, { useState, useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Send, 
  Trash2, 
  Plus,
  Brain,
  MessageSquare,
  Loader2,
  TrendingUp,
  Edit2,
  Save,
  X,
  Calendar,
  Mail,
  UserPlus,
  MessageCircle,
  ExternalLink,
  Copy,
  Check,
  Target,
  Activity,
  CheckSquare
} from "lucide-react";
import { toast } from "sonner";
import MessageBubble from "@/components/chat/MessageBubble";
import QuickActions from "@/components/chat/QuickActions";

const AGENT_NAME = "business_assistant";

const QUICK_ACTION_QUESTIONS = [
  {
    icon: UserPlus,
    label: "הוסף לקוח",
    question: "תוסיף לקוח חדש בשם משה כהן, מייל: moshe@example.com, טלפון: 050-1234567",
    color: "green"
  },
  {
    icon: Calendar,
    label: "קבע פגישה",
    question: "תקבע לי פגישה עם לקוח מחר בשעה 10:00 בבוקר",
    color: "blue"
  },
  {
    icon: CheckSquare,
    label: "צור משימה",
    question: "תיצור משימה חדשה בשם 'בדיקת תוכניות' עם עדיפות גבוהה",
    color: "purple"
  },
  {
    icon: Mail,
    label: "שלח מייל",
    question: "תשלח מייל ללקוח ותעדכן אותו על התקדמות הפרויקט",
    color: "orange"
  },
  {
    icon: TrendingUp,
    label: "סיכום היום",
    question: "תן לי סיכום מפורט של כל הפעילות שהייתה היום",
    color: "red"
  }
];

export default function AIChatPage() {
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [businessInsights, setBusinessInsights] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [whatsappDialogOpen, setWhatsappDialogOpen] = useState(false);
  const [editingConv, setEditingConv] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', notes: '' });
  const [whatsappUrl, setWhatsappUrl] = useState('');
  const [copiedUrl, setCopiedUrl] = useState(false);
  
  const scrollRef = useRef(null);
  const sendingRef = useRef(false);

  const loadBusinessInsights = useCallback(async () => {
    console.log('📊 [AIChat] Loading business insights...');
    setLoadingInsights(true);
    try {
      const response = await base44.functions.invoke('businessInsights');
      console.log('✅ [AIChat] Insights loaded:', response);
      setBusinessInsights(response?.data?.insights || null);
    } catch (error) {
      console.error('❌ [AIChat] Error loading insights:', error);
      toast.error('שגיאה בטעינת תובנות');
    }
    setLoadingInsights(false);
  }, []);

  const generateWhatsAppUrl = useCallback(() => {
    try {
      const url = base44.agents.getWhatsAppConnectURL(AGENT_NAME);
      console.log('✅ [AIChat] WhatsApp URL generated:', url);
      setWhatsappUrl(url);
    } catch (error) {
      console.error('❌ [AIChat] Error generating WhatsApp URL:', error);
    }
  }, []);

  // ✅ FIX: הגדרת loadConversation לפני loadConversations
  const loadConversation = useCallback(async (convId) => {
    console.log('📖 [AIChat] Loading conversation:', convId);
    try {
      const conv = await base44.agents.getConversation(convId);
      
      if (conv) {
        console.log('✅ [AIChat] Conversation loaded:', {
          id: conv.id,
          messages: conv.messages?.length || 0
        });
        
        setCurrentConversationId(convId);
        setCurrentConversation(conv);
        
        // ✅ הגנה על messages
        const safeMessages = Array.isArray(conv.messages) ? conv.messages : [];
        setMessages([...safeMessages]);
        
        setTimeout(() => {
          if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          }
        }, 50);
        
        toast.success(`נטענה: ${conv.metadata?.name || 'שיחה'}`);
      } else {
        console.warn('⚠️ [AIChat] Conversation not found');
        toast.error('השיחה לא נמצאה');
      }
    } catch (error) {
      console.error('❌ [AIChat] Error loading conversation:', error);
      toast.error('שגיאה בטעינת שיחה');
    }
  }, []);

  const loadConversations = useCallback(async () => {
    console.log('💬 [AIChat] Loading conversations...');
    setLoadingConversations(true);
    try {
      const convs = await base44.agents.listConversations({ agent_name: AGENT_NAME });
      
      // ✅ הגנה על תוצאות
      const safeConvs = Array.isArray(convs) ? convs : [];
      const activeConvs = safeConvs.filter(c => c && !c.metadata?.deleted);
      
      console.log('✅ [AIChat] Conversations loaded:', {
        total: safeConvs.length,
        active: activeConvs.length
      });
      
      setConversations(activeConvs);
      
      // טען את השיחה הראשונה אם אין שיחה פעילה
      if (activeConvs.length > 0 && !currentConversationId) {
        await loadConversation(activeConvs[0].id);
      }
    } catch (error) {
      console.error('❌ [AIChat] Error loading conversations:', error);
      toast.error('שגיאה בטעינת שיחות');
      setConversations([]);
    }
    setLoadingConversations(false);
  }, [currentConversationId, loadConversation]);

  const handleNewConversation = useCallback(async () => {
    console.log('➕ [AIChat] Creating new conversation...');
    try {
      const newConv = await base44.agents.createConversation({
        agent_name: AGENT_NAME,
        metadata: {
          name: `שיחה חדשה - ${new Date().toLocaleString('he-IL', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          })}`,
          notes: ''
        }
      });
      
      console.log('✅ [AIChat] Conversation created:', newConv.id);
      
      // ✅ טען מחדש את רשימת השיחות
      await loadConversations();
      await loadConversation(newConv.id);
      
      toast.success('🎉 שיחה חדשה נוצרה!');
      return newConv.id;
    } catch (error) {
      console.error('❌ [AIChat] Error creating conversation:', error);
      toast.error('שגיאה ביצירת שיחה');
      return null;
    }
  }, [loadConversations, loadConversation]);

  const handleEditConversation = useCallback((conv, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    console.log('✏️ [AIChat] Editing conversation:', conv.id);
    
    setEditingConv(conv);
    setEditForm({
      name: conv.metadata?.name || '',
      notes: conv.metadata?.notes || ''
    });
    setEditDialogOpen(true);
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!editingConv || !editForm.name.trim()) {
      toast.error('נא להזין שם לשיחה');
      return;
    }

    console.log('💾 [AIChat] Saving conversation edit:', editingConv.id);
    
    try {
      await base44.agents.updateConversation(editingConv.id, {
        metadata: {
          ...editingConv.metadata,
          name: editForm.name.trim(),
          notes: editForm.notes.trim()
        }
      });

      // ✅ טען מחדש את רשימת השיחות
      await loadConversations();
      
      // ✅ עדכן את השיחה הנוכחית אם זו השיחה שנערכה
      if (currentConversationId === editingConv.id) {
        await loadConversation(editingConv.id);
      }
      
      setEditDialogOpen(false);
      setEditingConv(null);
      
      toast.success('✅ השיחה עודכנה!');
    } catch (error) {
      console.error('❌ [AIChat] Error updating conversation:', error);
      toast.error('שגיאה בעדכון השיחה');
    }
  }, [editingConv, editForm, loadConversations, loadConversation, currentConversationId]);

  const handleSendMessage = useCallback(async (messageText = null) => {
    const text = messageText || inputMessage.trim();
    
    console.log('📤 [AIChat] Sending message:', { text, loading, sendingRef: sendingRef.current });
    
    if (!text || loading || sendingRef.current) return;

    sendingRef.current = true;

    let convId = currentConversationId;
    let conv = currentConversation;
    
    // אם אין שיחה פעילה, צור חדשה
    if (!convId) {
      console.log('➕ [AIChat] No active conversation, creating new one...');
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
      console.log('📨 [AIChat] Adding message to conversation...');
      await base44.agents.addMessage(conv, {
        role: "user",
        content: text
      });
      console.log('✅ [AIChat] Message sent successfully');
    } catch (error) {
      console.error('❌ [AIChat] Error sending message:', error);
      toast.error(`שגיאה: ${error.message}`);
    } finally {
      setLoading(false);
      sendingRef.current = false;
    }
  }, [inputMessage, loading, currentConversationId, currentConversation, handleNewConversation]);

  const handleDeleteConversation = useCallback(async (convId, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    console.log('🗑️ [AIChat] Deleting conversation:', convId);
    
    if (!confirm('❓ למחוק את השיחה? לא ניתן לשחזר!')) {
      console.log('⚠️ [AIChat] Delete cancelled by user');
      return;
    }
    
    try {
      const conv = conversations.find(c => c && c.id === convId);
      if (conv) {
        // סמן כמחוק
        await base44.agents.updateConversation(convId, {
          metadata: {
            ...conv.metadata,
            deleted: true
          }
        });
        console.log('✅ [AIChat] Conversation marked as deleted');
      }
      
      // ✅ טען מחדש את רשימת השיחות
      await loadConversations();
      
      // אם מחקנו את השיחה הנוכחית, עבור לשיחה אחרת או נקה
      if (currentConversationId === convId) {
        const remaining = conversations.filter(c => c && c.id !== convId && !c.metadata?.deleted);
        console.log('🔄 [AIChat] Switching conversation:', {
          remaining: remaining.length,
          currentDeleted: convId
        });
        
        if (remaining.length > 0) {
          await loadConversation(remaining[0].id);
        } else {
          setCurrentConversationId(null);
          setCurrentConversation(null);
          setMessages([]);
        }
      }
      
      toast.success('🗑️ השיחה נמחקה');
    } catch (error) {
      console.error('❌ [AIChat] Error deleting conversation:', error);
      toast.error('שגיאה במחיקת שיחה');
    }
  }, [conversations, currentConversationId, loadConversations, loadConversation]);

  const copyWhatsAppUrl = useCallback(() => {
    navigator.clipboard.writeText(whatsappUrl);
    setCopiedUrl(true);
    toast.success('✅ הקישור הועתק!');
    setTimeout(() => setCopiedUrl(false), 2000);
  }, [whatsappUrl]);

  useEffect(() => {
    console.log('🎬 [AIChat] Component mounted, loading initial data...');
    loadConversations();
    generateWhatsAppUrl();
    loadBusinessInsights();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (!currentConversationId) {
      console.log('⏭️ [AIChat] No conversation ID, skipping subscription');
      return;
    }
    
    console.log('🔌 [AIChat] Subscribing to conversation:', currentConversationId);
    
    let unsubscribe;
    
    try {
      unsubscribe = base44.agents.subscribeToConversation(
        currentConversationId,
        (data) => {
          console.log('📨 [AIChat] Received update:', {
            conversationId: currentConversationId,
            messages: data?.messages?.length || 0
          });
          
          // ✅ הגנה על messages
          const safeMessages = Array.isArray(data?.messages) ? data.messages : [];
          setMessages([...safeMessages]);
        }
      );
      console.log('✅ [AIChat] Subscription established');
    } catch (error) {
      console.error('❌ [AIChat] WebSocket subscription error:', error);
    }
    
    return () => {
      if (unsubscribe && typeof unsubscribe === 'function') {
        try {
          console.log('🔌 [AIChat] Unsubscribing from conversation');
          unsubscribe();
        } catch (error) {
          console.error('❌ [AIChat] WebSocket unsubscribe error:', error);
        }
      }
    };
  }, [currentConversationId]);

  if (loadingConversations) {
    return (
      <div className="flex items-center justify-center min-h-screen" dir="rtl">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">טוען את העוזר החכם...</p>
        </div>
      </div>
    );
  }

  // ✅ הגנה על conversations
  const safeConversations = Array.isArray(conversations) ? conversations : [];
  const activeConversations = safeConversations.filter(c => c && !c.metadata?.deleted);

  console.log('🎨 [AIChat] Rendering with:', {
    totalConversations: safeConversations.length,
    activeConversations: activeConversations.length,
    currentConversationId,
    messages: messages.length
  });

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 to-slate-100" dir="rtl">
      <div className="w-80 bg-white border-l border-slate-200 flex flex-col shadow-lg">
        <div className="p-4 border-b border-slate-200 space-y-2">
          <Button 
            onClick={handleNewConversation}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-md"
          >
            <Plus className="w-5 h-5 ml-2" />
            שיחה חדשה
          </Button>
          
          <Button 
            onClick={() => setWhatsappDialogOpen(true)}
            variant="outline"
            className="w-full border-2 border-green-500 text-green-700 hover:bg-green-50"
          >
            <MessageCircle className="w-5 h-5 ml-2" />
            חבר ל-WhatsApp
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-2">
            {activeConversations.length === 0 ? (
              <div className="text-center py-12 px-4">
                <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-600">אין שיחות עדיין</p>
                <p className="text-xs text-slate-400 mt-1">לחץ על "שיחה חדשה"</p>
              </div>
            ) : (
              activeConversations.map((conv) => {
                if (!conv) return null;
                
                const isActive = currentConversationId === conv.id;
                const messageCount = conv.messages?.length || 0;
                const convName = conv.metadata?.name || 'שיחה';
                const convNotes = conv.metadata?.notes || '';

                return (
                  <div
                    key={conv.id}
                    className={`group relative p-3 rounded-lg cursor-pointer transition-all ${
                      isActive 
                        ? "bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-400 shadow-md" 
                        : "hover:bg-slate-50 border-2 border-transparent hover:border-slate-200"
                    }`}
                    onClick={() => loadConversation(conv.id)}
                  >
                    <div className="flex justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className={`text-sm font-semibold truncate ${
                          isActive ? "text-blue-900" : "text-slate-900"
                        }`}>
                          {convName}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-xs text-slate-400">
                            {new Date(conv.created_date).toLocaleDateString('he-IL')}
                          </p>
                          {messageCount > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {messageCount}
                            </Badge>
                          )}
                        </div>
                        {convNotes && (
                          <p className="text-xs text-slate-500 mt-1 truncate">
                            💬 {convNotes}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex gap-1 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 hover:bg-blue-100 transition-all"
                          onClick={(e) => handleEditConversation(conv, e)}
                          title="ערוך שיחה"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 hover:bg-red-100 transition-all"
                          onClick={(e) => handleDeleteConversation(conv.id, e)}
                          title="מחק שיחה"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>

        <div className="p-4 border-t bg-slate-50">
          <div className="text-xs text-slate-600 text-center">
            <span className="font-semibold">{activeConversations.length}</span> שיחות שמורות
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="bg-white border-b px-6 py-4 shadow-sm">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">יועץ עסקי AI פרואקטיבי</h1>
                <p className="text-sm text-slate-600 flex items-center gap-1">
                  <Target className="w-3 h-3" />
                  ניתוח תובנות, זיהוי סיכונים והזדמנויות
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={loadBusinessInsights}
                disabled={loadingInsights}
                variant="outline"
                className="gap-2"
              >
                {loadingInsights ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Activity className="w-4 h-4" />
                )}
                רענן תובנות
              </Button>
              <Badge className="bg-gradient-to-r from-green-500 to-green-600 text-white shadow-md">
                <MessageCircle className="w-3 h-3 ml-1" />
                WhatsApp זמין
              </Badge>
              <Badge className="bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-md">
                <Activity className="w-3 h-3 ml-1" />
                AI מתקדם
              </Badge>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1 p-6" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="p-6 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full mb-6 shadow-lg">
                <Brain className="w-16 h-16 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold mb-2">שלום! אני היועץ העסקי החכם שלך 🧠</h2>
              <p className="text-slate-600 mb-2 max-w-md">
                אני מנתח באופן פרואקטיבי את העסק שלך ומזהה הזדמנויות וסיכונים
              </p>
              <p className="text-xs text-slate-500 mb-4">
                ✅ ניתוח לקוחות | ✅ זיהוי סיכונים | ✅ הזדמנויות עסקיות | ✅ המלצות חכמות
              </p>
              
              {businessInsights && (
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-lg p-4 mb-6 max-w-lg">
                  <div className="flex items-start gap-3">
                    <Target className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-right text-sm">
                      <div className="font-bold text-blue-900 mb-2">🎯 תובנות עכשיו:</div>
                      {businessInsights.summary?.risks?.length > 0 && (
                        <div className="text-red-700 mb-1">
                          ⚠️ {businessInsights.summary.risks.length} סיכונים דורשים תשומת לב
                        </div>
                      )}
                      {businessInsights.opportunities?.length > 0 && (
                        <div className="text-green-700 mb-1">
                          💡 {businessInsights.opportunities.length} הזדמנויות עסקיות זוהו
                        </div>
                      )}
                      <div className="text-blue-700">
                        📊 ציון בריאות עסקי: {businessInsights.summary?.score || 0}/100
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <QuickActions 
                actions={QUICK_ACTION_QUESTIONS} 
                onActionClick={handleSendMessage}
                insights={businessInsights}
              />
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-4">
              {messages.map((msg, i) => (
                <MessageBubble key={`${msg?.id || i}-${msg?.timestamp || i}`} message={msg} />
              ))}
              
              {loading && (
                <div className="flex gap-3 p-4 bg-white rounded-lg shadow-sm border-2 border-blue-200">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                  <div>
                    <div className="font-medium text-blue-900">היועץ מנתח...</div>
                    <div className="text-xs text-blue-600">בודק נתונים ומפיק תובנות</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        <div className="bg-white border-t px-6 py-4 shadow-inner">
          <div className="max-w-4xl mx-auto flex gap-3">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder='שאל שאלה או נסה: "מה המצב?", "תן לי תובנות", "אילו לקוחות בסיכון?"'
              className="flex-1 text-lg py-6 shadow-sm"
              disabled={loading}
              dir="rtl"
            />
            <Button
              onClick={() => handleSendMessage()}
              disabled={!inputMessage.trim() || loading}
              className="px-8 py-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-md"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Send className="w-5 h-5 ml-2" />
                  שלח
                </>
              )}
            </Button>
          </div>
          
          <div className="mt-3 flex items-center justify-center gap-2 text-xs text-slate-500">
            <Activity className="w-3 h-3" />
            <span>יועץ AI פרואקטיבי - תובנות אוטומטיות וניתוח חכם</span>
          </div>
        </div>
      </div>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-blue-600" />
              עריכת שיחה
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">שם השיחה *</Label>
              <Input
                id="name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="לדוגמה: שיחה עם העוזר על לקוחות"
                className="text-right"
                dir="rtl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">הערות (אופציונלי)</Label>
              <Textarea
                id="notes"
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                placeholder="הוסף הערות או תזכורות..."
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

      <Dialog open={whatsappDialogOpen} onOpenChange={setWhatsappDialogOpen}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="w-6 h-6 text-green-600" />
              חיבור ל-WhatsApp
            </DialogTitle>
            <DialogDescription className="text-right">
              קבל את היועץ החכם גם ב-WhatsApp! תובנות, התראות והמלצות ישירות לנייד 📱
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
              <h3 className="font-bold text-green-900 mb-2">✨ מה אפשר לעשות ב-WhatsApp?</h3>
              <ul className="text-sm text-green-800 space-y-1">
                <li>✅ לקבל תובנות עסקיות פרואקטיביות</li>
                <li>✅ התראות על סיכונים והזדמנויות</li>
                <li>✅ ניתוח לקוחות ופרויקטים</li>
                <li>✅ ניהול משימות ופגישות</li>
                <li>✅ המלצות חכמות מבוססות נתונים</li>
              </ul>
            </div>

            <div className="space-y-2">
              <Label className="font-bold">📱 שלב 1: העתק את הקישור</Label>
              <div className="flex gap-2">
                <Input
                  value={whatsappUrl}
                  readOnly
                  className="text-left flex-1"
                  dir="ltr"
                />
                <Button
                  onClick={copyWhatsAppUrl}
                  variant="outline"
                  className="flex-shrink-0"
                >
                  {copiedUrl ? (
                    <>
                      <Check className="w-4 h-4 ml-1 text-green-600" />
                      הועתק
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 ml-1" />
                      העתק
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="font-bold">📱 שלב 2: פתח ב-WhatsApp</Label>
              <Button
                onClick={() => window.open(whatsappUrl, '_blank')}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                <ExternalLink className="w-4 h-4 ml-2" />
                פתח ב-WhatsApp
              </Button>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-900">
              <strong>💡 טיפ:</strong> שמור את השיחה בהודעות שמורות לגישה מהירה!
            </div>
          </div>

          <DialogFooter dir="rtl">
            <Button variant="outline" onClick={() => setWhatsappDialogOpen(false)}>
              סגור
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}