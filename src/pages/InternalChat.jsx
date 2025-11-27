import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { 
  MessageCircle, 
  Send, 
  Plus, 
  Paperclip, 
  Mic, 
  MicOff, 
  Square,
  Image as ImageIcon,
  File,
  Play,
  Pause,
  Users,
  Search,
  MoreVertical,
  Trash2,
  Edit,
  User,
  Phone,
  Video,
  X,
  Loader2,
  Check,
  CheckCheck,
  Tag,
  Hash
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { format } from "date-fns";
import { he } from "date-fns/locale";

export default function InternalChatPage() {
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [clients, setClients] = useState([]);
  const [showNewChatDialog, setShowNewChatDialog] = useState(false);
  const [newChatData, setNewChatData] = useState({ participants: [], client_id: '', name: '', tags: [] });
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editChatData, setEditChatData] = useState(null);
  const [newTag, setNewTag] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [playingVoice, setPlayingVoice] = useState(null);
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingIntervalRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedChat) {
      loadMessages(selectedChat.id);
    }
  }, [selectedChat]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [user, chatsData, usersData, clientsData] = await Promise.all([
        base44.auth.me(),
        base44.entities.InternalChat.list('-last_message_at').catch(() => []),
        base44.entities.User.list().catch(() => []),
        base44.entities.Client.list().catch(() => [])
      ]);
      
      setCurrentUser(user);
      setUsers(usersData || []);
      setClients(clientsData || []);
      
      // Filter chats where current user is participant
      const myChats = (chatsData || []).filter(chat => 
        chat.participants?.includes(user.email)
      );
      setChats(myChats);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('שגיאה בטעינת הנתונים');
    }
    setIsLoading(false);
  };

  const loadMessages = async (chatId) => {
    try {
      const msgs = await base44.entities.InternalMessage.filter(
        { chat_id: chatId },
        'created_date',
        100
      );
      setMessages(msgs || []);
      
      // Mark as read
      const unreadMsgs = msgs.filter(m => 
        m.sender_email !== currentUser?.email && 
        !m.read_by?.includes(currentUser?.email)
      );
      
      for (const msg of unreadMsgs) {
        await base44.entities.InternalMessage.update(msg.id, {
          read_by: [...(msg.read_by || []), currentUser.email]
        });
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async (type = 'text', fileData = null) => {
    if (type === 'text' && !newMessage.trim()) return;
    if (!selectedChat) return;
    
    setIsSending(true);
    try {
      const messageData = {
        chat_id: selectedChat.id,
        sender_email: currentUser.email,
        sender_name: currentUser.full_name || currentUser.email,
        content: type === 'text' ? newMessage : (fileData?.name || 'קובץ'),
        type,
        read_by: [currentUser.email]
      };

      if (fileData) {
        messageData.file_url = fileData.url;
        messageData.file_name = fileData.name;
        messageData.file_type = fileData.type;
        if (type === 'voice') {
          messageData.voice_duration = fileData.duration;
        }
      }

      await base44.entities.InternalMessage.create(messageData);
      
      // Update chat last message
      await base44.entities.InternalChat.update(selectedChat.id, {
        last_message: type === 'text' ? newMessage : `📎 ${fileData?.name || 'קובץ'}`,
        last_message_at: new Date().toISOString()
      });

      setNewMessage('');
      loadMessages(selectedChat.id);
      loadData(); // Refresh chat list
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('שגיאה בשליחת ההודעה');
    }
    setIsSending(false);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      toast.loading('מעלה קובץ...', { id: 'file-upload' });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      const type = file.type.startsWith('image/') ? 'image' : 'file';
      await sendMessage(type, {
        url: file_url,
        name: file.name,
        type: file.type
      });
      
      toast.dismiss('file-upload');
      toast.success('הקובץ הועלה בהצלחה');
    } catch (error) {
      toast.dismiss('file-upload');
      toast.error('שגיאה בהעלאת הקובץ');
    }
    
    e.target.value = '';
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        // Check if cancelled
        if (audioChunksRef.current.length === 0) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        // Make sure there's actual audio data
        if (audioBlob.size < 100) {
          toast.error('ההקלטה קצרה מדי');
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        
        // Create file-like object for upload
        audioBlob.name = `voice_${Date.now()}.webm`;
        const duration = recordingTime;
        
        try {
          toast.loading('מעלה הקלטה...', { id: 'voice-upload' });
          const { file_url } = await base44.integrations.Core.UploadFile({ file: audioBlob });
          
          await sendMessage('voice', {
            url: file_url,
            name: 'הודעה קולית',
            type: 'audio/webm',
            duration: duration
          });
          
          toast.dismiss('voice-upload');
          toast.success('ההודעה הקולית נשלחה');
        } catch (error) {
          console.error('Voice upload error:', error);
          toast.dismiss('voice-upload');
          toast.error('שגיאה בשליחת ההקלטה: ' + (error.message || 'נסה שוב'));
        }
        
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start(100); // Collect data every 100ms
      setIsRecording(true);
      setRecordingTime(0);
      
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Microphone error:', error);
      toast.error('אין גישה למיקרופון - אנא אשר גישה בהגדרות הדפדפן');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(recordingIntervalRef.current);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(recordingIntervalRef.current);
      audioChunksRef.current = [];
    }
  };

  const playVoice = (url, msgId) => {
    if (playingVoice === msgId) {
      audioRef.current?.pause();
      setPlayingVoice(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      audioRef.current = new Audio(url);
      audioRef.current.play();
      audioRef.current.onended = () => setPlayingVoice(null);
      setPlayingVoice(msgId);
    }
  };

  const createNewChat = async () => {
    if (newChatData.participants.length === 0) {
      toast.error('נא לבחור משתתפים');
      return;
    }

    try {
      const client = clients.find(c => c.id === newChatData.client_id);
      const participantNames = newChatData.participants.map(email => {
        const user = users.find(u => u.email === email);
        return user?.full_name || email;
      });

      await base44.entities.InternalChat.create({
        participants: [...newChatData.participants, currentUser.email],
        client_id: newChatData.client_id || null,
        client_name: client?.name || null,
        name: newChatData.name || participantNames.join(', '),
        tags: newChatData.tags || [],
        last_message_at: new Date().toISOString()
      });

      toast.success('השיחה נוצרה');
      setShowNewChatDialog(false);
      setNewChatData({ participants: [], client_id: '', name: '', tags: [] });
      loadData();
    } catch (error) {
      toast.error('שגיאה ביצירת השיחה');
    }
  };

  const handleDeleteChat = async (chatId) => {
    if (!confirm('האם למחוק את השיחה?')) return;
    try {
      // Delete all messages first
      const msgs = await base44.entities.InternalMessage.filter({ chat_id: chatId });
      for (const msg of msgs) {
        await base44.entities.InternalMessage.delete(msg.id);
      }
      await base44.entities.InternalChat.delete(chatId);
      toast.success('השיחה נמחקה');
      if (selectedChat?.id === chatId) {
        setSelectedChat(null);
        setMessages([]);
      }
      loadData();
    } catch (error) {
      toast.error('שגיאה במחיקה');
    }
  };

  const handleEditChat = (chat) => {
    setEditChatData({
      id: chat.id,
      name: chat.name || '',
      client_id: chat.client_id || '',
      tags: chat.tags || []
    });
    setShowEditDialog(true);
  };

  const saveEditChat = async () => {
    try {
      const client = clients.find(c => c.id === editChatData.client_id);
      await base44.entities.InternalChat.update(editChatData.id, {
        name: editChatData.name,
        client_id: editChatData.client_id || null,
        client_name: client?.name || null,
        tags: editChatData.tags || []
      });
      toast.success('השיחה עודכנה');
      setShowEditDialog(false);
      loadData();
    } catch (error) {
      toast.error('שגיאה בעדכון');
    }
  };

  const addTag = (tagList, setTagList, tag) => {
    if (tag.trim() && !tagList.includes(tag.trim())) {
      setTagList([...tagList, tag.trim()]);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getOtherParticipants = (chat) => {
    return chat.participants?.filter(p => p !== currentUser?.email) || [];
  };

  const filteredChats = chats.filter(chat => {
    const searchLower = searchTerm.toLowerCase();
    return (
      chat.name?.toLowerCase().includes(searchLower) ||
      chat.client_name?.toLowerCase().includes(searchLower) ||
      chat.participants?.some(p => p.toLowerCase().includes(searchLower))
    );
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-120px)] flex" dir="rtl">
      {/* Chat List */}
      <div className="w-80 border-l bg-white flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">צ'אט פנימי</h2>
            <Button size="sm" onClick={() => setShowNewChatDialog(true)}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 absolute right-3 top-3 text-slate-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="חיפוש..."
              className="pr-10"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredChats.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <MessageCircle className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>אין שיחות</p>
            </div>
          ) : (
            filteredChats.map(chat => {
              const others = getOtherParticipants(chat);
              const isSelected = selectedChat?.id === chat.id;
              
              return (
                <div
                  key={chat.id}
                  className={`p-4 border-b cursor-pointer hover:bg-slate-50 transition-colors group ${
                    isSelected ? 'bg-blue-50 border-r-4 border-r-blue-500' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="w-10 h-10" onClick={() => setSelectedChat(chat)}>
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                        {others[0]?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0" onClick={() => setSelectedChat(chat)}>
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-sm truncate">
                          {chat.name || others.join(', ')}
                        </h3>
                        <div className="flex items-center gap-1">
                          {chat.last_message_at && (
                            <span className="text-xs text-slate-500">
                              {format(new Date(chat.last_message_at), 'HH:mm', { locale: he })}
                            </span>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" dir="rtl">
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEditChat(chat); }}>
                                <Edit className="w-4 h-4 ml-2" />
                                עריכה
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={(e) => { e.stopPropagation(); handleDeleteChat(chat.id); }}
                                className="text-red-600"
                              >
                                <Trash2 className="w-4 h-4 ml-2" />
                                מחיקה
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {chat.client_name && (
                          <Badge variant="outline" className="text-xs">
                            <User className="w-3 h-3 ml-1" />
                            {chat.client_name}
                          </Badge>
                        )}
                        {chat.tags?.slice(0, 2).map(tag => (
                          <Badge key={tag} className="text-xs bg-purple-100 text-purple-700">
                            <Hash className="w-2 h-2 ml-1" />
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      {chat.last_message && (
                        <p className="text-xs text-slate-500 truncate mt-1">
                          {chat.last_message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-slate-50">
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="bg-white border-b p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                    {getOtherParticipants(selectedChat)[0]?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold">
                    {selectedChat.name || getOtherParticipants(selectedChat).join(', ')}
                  </h3>
                  {selectedChat.client_name && (
                    <p className="text-xs text-slate-500">לקוח: {selectedChat.client_name}</p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" disabled title="בקרוב">
                  <Phone className="w-5 h-5" />
                </Button>
                <Button variant="ghost" size="icon" disabled title="בקרוב">
                  <Video className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => {
                const isMe = msg.sender_email === currentUser?.email;
                
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-[70%] ${isMe ? 'order-1' : 'order-2'}`}>
                      <div
                        className={`rounded-2xl p-3 ${
                          isMe 
                            ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-br-sm'
                            : 'bg-white border rounded-bl-sm'
                        }`}
                      >
                        {!isMe && (
                          <p className="text-xs font-semibold text-slate-600 mb-1">
                            {msg.sender_name}
                          </p>
                        )}
                        
                        {msg.type === 'text' && (
                          <p className="text-sm">{msg.content}</p>
                        )}
                        
                        {msg.type === 'image' && (
                          <img 
                            src={msg.file_url} 
                            alt={msg.file_name}
                            className="rounded-lg max-w-full max-h-64 cursor-pointer"
                            onClick={() => window.open(msg.file_url, '_blank')}
                          />
                        )}
                        
                        {msg.type === 'file' && (
                          <a 
                            href={msg.file_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className={`flex items-center gap-2 p-2 rounded-lg ${isMe ? 'bg-white/20' : 'bg-slate-100'}`}
                          >
                            <File className="w-5 h-5" />
                            <span className="text-sm truncate">{msg.file_name}</span>
                          </a>
                        )}
                        
                        {msg.type === 'voice' && (
                          <div className={`flex items-center gap-3 p-2 rounded-lg ${isMe ? 'bg-white/20' : 'bg-slate-100'}`}>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => playVoice(msg.file_url, msg.id)}
                            >
                              {playingVoice === msg.id ? (
                                <Pause className="w-4 h-4" />
                              ) : (
                                <Play className="w-4 h-4" />
                              )}
                            </Button>
                            <div className="flex-1 h-1 bg-slate-300 rounded-full">
                              <div className="h-full bg-blue-500 rounded-full" style={{ width: '0%' }} />
                            </div>
                            <span className="text-xs">{formatTime(msg.voice_duration || 0)}</span>
                          </div>
                        )}
                      </div>
                      <div className={`flex items-center gap-1 mt-1 ${isMe ? 'justify-start' : 'justify-end'}`}>
                        <span className="text-xs text-slate-400">
                          {format(new Date(msg.created_date), 'HH:mm', { locale: he })}
                        </span>
                        {isMe && (
                          msg.read_by?.length > 1 ? (
                            <CheckCheck className="w-3 h-3 text-blue-500" />
                          ) : (
                            <Check className="w-3 h-3 text-slate-400" />
                          )
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="bg-white border-t p-4">
              {isRecording ? (
                <div className="flex items-center gap-4 bg-red-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 flex-1">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-red-600 font-medium">מקליט... {formatTime(recordingTime)}</span>
                  </div>
                  <Button variant="ghost" size="icon" onClick={cancelRecording}>
                    <X className="w-5 h-5 text-slate-500" />
                  </Button>
                  <Button onClick={stopRecording} className="bg-red-600 hover:bg-red-700">
                    <Square className="w-4 h-4 ml-2" />
                    שלח
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                  />
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Paperclip className="w-5 h-5" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={startRecording}
                  >
                    <Mic className="w-5 h-5" />
                  </Button>
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="הקלד הודעה..."
                    className="flex-1"
                    onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  />
                  <Button 
                    onClick={() => sendMessage()}
                    disabled={!newMessage.trim() || isSending}
                    className="bg-gradient-to-r from-blue-600 to-purple-600"
                  >
                    {isSending ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </Button>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageCircle className="w-20 h-20 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-600 mb-2">בחר שיחה</h3>
              <p className="text-slate-500 mb-4">או צור שיחה חדשה</p>
              <Button onClick={() => setShowNewChatDialog(true)}>
                <Plus className="w-4 h-4 ml-2" />
                שיחה חדשה
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* New Chat Dialog */}
      {showNewChatDialog && (
        <Dialog open={showNewChatDialog} onOpenChange={setShowNewChatDialog}>
          <DialogContent dir="rtl" className="max-w-md">
            <DialogHeader>
              <DialogTitle>שיחה חדשה</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label className="mb-2 block">שם השיחה (אופציונלי)</Label>
                <Input
                  value={newChatData.name}
                  onChange={(e) => setNewChatData({ ...newChatData, name: e.target.value })}
                  placeholder="לדוגמה: פרויקט כהן"
                />
              </div>
              <div>
                <Label className="mb-2 block">משתתפים</Label>
                <Select 
                  value="" 
                  onValueChange={(v) => {
                    if (!newChatData.participants.includes(v)) {
                      setNewChatData({ 
                        ...newChatData, 
                        participants: [...newChatData.participants, v] 
                      });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="בחר משתמש להוספה" />
                  </SelectTrigger>
                  <SelectContent>
                    {users
                      .filter(u => u.email !== currentUser?.email)
                      .map(user => (
                        <SelectItem key={user.id} value={user.email}>
                          {user.full_name || user.email}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <div className="flex flex-wrap gap-2 mt-2">
                  {newChatData.participants.map(email => {
                    const user = users.find(u => u.email === email);
                    return (
                      <Badge key={email} variant="secondary" className="gap-1">
                        {user?.full_name || email}
                        <X 
                          className="w-3 h-3 cursor-pointer" 
                          onClick={() => setNewChatData({
                            ...newChatData,
                            participants: newChatData.participants.filter(p => p !== email)
                          })}
                        />
                      </Badge>
                    );
                  })}
                </div>
              </div>
              <div>
                <Label className="mb-2 block">שיוך ללקוח (אופציונלי)</Label>
                <Select 
                  value={newChatData.client_id || 'none'} 
                  onValueChange={(v) => setNewChatData({ ...newChatData, client_id: v === 'none' ? '' : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="בחר לקוח" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">ללא לקוח</SelectItem>
                    {clients.map(client => (
                      <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowNewChatDialog(false)}>ביטול</Button>
              <Button onClick={createNewChat} className="bg-blue-600 hover:bg-blue-700">
                צור שיחה
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
      {/* Edit Chat Dialog */}
      {showEditDialog && editChatData && (
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent dir="rtl" className="max-w-md">
            <DialogHeader>
              <DialogTitle>עריכת שיחה</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label className="mb-2 block">שם השיחה</Label>
                <Input
                  value={editChatData.name}
                  onChange={(e) => setEditChatData({ ...editChatData, name: e.target.value })}
                />
              </div>
              <div>
                <Label className="mb-2 block">שיוך ללקוח</Label>
                <Select 
                  value={editChatData.client_id || 'none'} 
                  onValueChange={(v) => setEditChatData({ ...editChatData, client_id: v === 'none' ? '' : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="בחר לקוח" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">ללא לקוח</SelectItem>
                    {clients.map(client => (
                      <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-2 block">תגיות</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="הוסף תגית..."
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (newTag.trim()) {
                          setEditChatData({ 
                            ...editChatData, 
                            tags: [...(editChatData.tags || []), newTag.trim()] 
                          });
                          setNewTag('');
                        }
                      }
                    }}
                  />
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (newTag.trim()) {
                        setEditChatData({ 
                          ...editChatData, 
                          tags: [...(editChatData.tags || []), newTag.trim()] 
                        });
                        setNewTag('');
                      }
                    }}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {editChatData.tags?.map((tag, i) => (
                    <Badge key={i} variant="secondary" className="gap-1">
                      <Hash className="w-3 h-3" />
                      {tag}
                      <X 
                        className="w-3 h-3 cursor-pointer" 
                        onClick={() => setEditChatData({
                          ...editChatData,
                          tags: editChatData.tags.filter((_, idx) => idx !== i)
                        })}
                      />
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>ביטול</Button>
              <Button onClick={saveEditChat}>שמור</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}