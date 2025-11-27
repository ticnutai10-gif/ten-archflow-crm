import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  Square,
  Image as ImageIcon,
  File as FileIcon,
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
  Hash,
  RefreshCw,
  Sparkles,
  FileText,
  Bell,
  Clock
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
  // Core state
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [clients, setClients] = useState([]);
  
  // UI state
  const [showNewChatDialog, setShowNewChatDialog] = useState(false);
  const [newChatData, setNewChatData] = useState({ participants: [], client_id: '', name: '', tags: [] });
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editChatData, setEditChatData] = useState(null);
  const [newTag, setNewTag] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // AI Features state
  const [showSummaryDialog, setShowSummaryDialog] = useState(false);
  const [chatSummary, setChatSummary] = useState('');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [showReminderDialog, setShowReminderDialog] = useState(false);
  const [reminderMessage, setReminderMessage] = useState(null);
  const [reminderTime, setReminderTime] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(null);
  
  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  
  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [playingVoice, setPlayingVoice] = useState(null);
  
  // Refs
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingIntervalRef = useRef(null);
  const audioRef = useRef(null);
  const recordingTimeRef = useRef(0);
  const streamRef = useRef(null);
  const dataLoadedRef = useRef(false); // Prevent double loading
  const selectedChatIdRef = useRef(null); // Track selected chat for message loading

  // Memoized user lookup map for fast name resolution
  const userEmailToName = useMemo(() => {
    const map = {};
    allUsers.forEach(u => {
      map[u.email] = u.full_name || u.email;
    });
    return map;
  }, [allUsers]);

  // Get display name from email - uses memoized map
  const getDisplayName = useCallback((email) => {
    if (!email) return 'משתמש';
    return userEmailToName[email] || email;
  }, [userEmailToName]);

  // Check if user is online (last seen within 2 minutes)
  const isUserOnline = useCallback((email) => {
    const user = allUsers.find(u => u.email === email);
    if (!user?.last_seen) return false;
    const lastSeen = new Date(user.last_seen);
    const diffMinutes = (new Date() - lastSeen) / 1000 / 60;
    return diffMinutes < 2;
  }, [allUsers]);

  // Get other participants in a chat
  const getOtherParticipants = useCallback((chat) => {
    if (!chat?.participants || !currentUser?.email) return [];
    return chat.participants.filter(p => p !== currentUser.email);
  }, [currentUser?.email]);

  // Initial data load - runs only once
  useEffect(() => {
    if (dataLoadedRef.current) return;
    dataLoadedRef.current = true;

    const loadInitialData = async () => {
      setIsLoading(true);
      try {
        // Load current user first
        const user = await base44.auth.me();
        setCurrentUser(user);

        // Load chats and users in parallel
        const [chatsData, usersData] = await Promise.all([
          base44.entities.InternalChat.list('-last_message_at', 50).catch(() => []),
          base44.entities.User.list().catch(() => [])
        ]);

        setAllUsers(usersData || []);
        
        // Filter chats where current user is participant
        const myChats = (chatsData || []).filter(chat => 
          chat.participants?.includes(user.email)
        );
        setChats(myChats);

      } catch (error) {
        console.error('Error loading initial data:', error);
        if (!error.message?.includes('Rate limit')) {
          toast.error('שגיאה בטעינת הנתונים');
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, []);

  // Update online status periodically
  useEffect(() => {
    if (!currentUser?.id) return;

    const updateStatus = async () => {
      try {
        await base44.entities.User.update(currentUser.id, {
          last_seen: new Date().toISOString(),
          is_online: true
        });
      } catch (e) {
        // Silently fail - not critical
      }
    };

    updateStatus();
    const interval = setInterval(updateStatus, 60000); // Every minute instead of 30 seconds

    return () => clearInterval(interval);
  }, [currentUser?.id]);

  // Load messages when chat is selected
  useEffect(() => {
    if (!selectedChat?.id || !currentUser?.email) {
      setMessages([]);
      return;
    }

    // Prevent duplicate loads
    if (selectedChatIdRef.current === selectedChat.id) return;
    selectedChatIdRef.current = selectedChat.id;

    const loadMessages = async () => {
      setIsLoadingMessages(true);
      try {
        const msgs = await base44.entities.InternalMessage.filter(
          { chat_id: selectedChat.id },
          'created_date',
          100
        );
        setMessages(msgs || []);

        // Mark unread messages as read
        const unreadMsgs = (msgs || []).filter(m => 
          m.sender_email !== currentUser.email && 
          !m.read_by?.includes(currentUser.email)
        );

        // Update read status in background
        for (const msg of unreadMsgs) {
          base44.entities.InternalMessage.update(msg.id, {
            read_by: [...(msg.read_by || []), currentUser.email]
          }).catch(() => {});
        }
      } catch (error) {
        console.error('Error loading messages:', error);
      } finally {
        setIsLoadingMessages(false);
      }
    };

    loadMessages();
  }, [selectedChat?.id, currentUser?.email]);

  // Reset selected chat ref when chat changes
  useEffect(() => {
    if (!selectedChat) {
      selectedChatIdRef.current = null;
    }
  }, [selectedChat]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Load clients only when dialog opens
  const loadClients = useCallback(async () => {
    if (clients.length > 0) return;
    try {
      const clientsData = await base44.entities.Client.list('-created_date', 100);
      setClients(clientsData || []);
    } catch (e) {
      console.warn('Failed to load clients');
    }
  }, [clients.length]);

  // Refresh chats list
  const refreshChats = useCallback(async () => {
    if (!currentUser?.email) return;
    try {
      const chatsData = await base44.entities.InternalChat.list('-last_message_at', 50);
      const myChats = (chatsData || []).filter(chat => 
        chat.participants?.includes(currentUser.email)
      );
      setChats(myChats);
    } catch (e) {
      console.warn('Failed to refresh chats');
    }
  }, [currentUser?.email]);

  // Send message
  const sendMessage = useCallback(async (type = 'text', fileData = null) => {
    if (type === 'text' && !newMessage.trim()) return;
    if (!selectedChat || !currentUser) return;

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

      const newMsg = await base44.entities.InternalMessage.create(messageData);

      // Update chat last message
      await base44.entities.InternalChat.update(selectedChat.id, {
        last_message: type === 'text' ? newMessage : `📎 ${fileData?.name || 'קובץ'}`,
        last_message_at: new Date().toISOString()
      });

      // Add message to local state immediately
      setMessages(prev => [...prev, { ...messageData, id: newMsg.id, created_date: new Date().toISOString() }]);
      
      // Update chat in list
      setChats(prev => prev.map(c => 
        c.id === selectedChat.id 
          ? { ...c, last_message: messageData.content, last_message_at: new Date().toISOString() }
          : c
      ).sort((a, b) => new Date(b.last_message_at) - new Date(a.last_message_at)));

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('שגיאה בשליחת ההודעה');
    } finally {
      setIsSending(false);
    }
  }, [newMessage, selectedChat, currentUser]);

  // Handle file upload
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

  // Voice recording functions
  const startRecording = async () => {
    console.log('🎤 Starting recording...');
    try {
      console.log('🎤 Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('🎤 Microphone access granted');
      streamRef.current = stream;
      
      const supportedTypes = ['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/wav'];
      let mimeType = '';
      for (const type of supportedTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          mimeType = type;
          console.log('🎤 Using mimeType:', mimeType);
          break;
        }
      }
      
      if (!mimeType) {
        console.error('🎤 No supported audio format found');
        toast.error('הדפדפן לא תומך בהקלטת אודיו');
        return;
      }
      
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];
      recordingTimeRef.current = 0;
      console.log('🎤 MediaRecorder created');

      mediaRecorderRef.current.ondataavailable = (e) => {
        console.log('🎤 Data available:', e.data?.size, 'bytes');
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current.onerror = (e) => {
        console.error('🎤 MediaRecorder error:', e.error);
        toast.error('שגיאה בהקלטה');
      };

      mediaRecorderRef.current.onstop = async () => {
        console.log('🎤 Recording stopped, chunks:', audioChunksRef.current.length);
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
        
        if (audioChunksRef.current.length === 0) {
          console.log('🎤 No audio chunks - cancelled');
          return;
        }
        
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        console.log('🎤 Audio blob size:', audioBlob.size);
        
        if (audioBlob.size < 100) {
          toast.error('ההקלטה קצרה מדי');
          return;
        }
        
        try {
          toast.loading('מעלה הקלטה...', { id: 'voice-upload' });
          // Convert Blob to File object for the SDK
          const audioFile = new File([audioBlob], `voice_${Date.now()}.webm`, { type: mimeType });
          console.log('🎤 Uploading audio file...', audioFile.name, audioFile.size);
          const { file_url } = await base44.integrations.Core.UploadFile({ file: audioFile });
          console.log('🎤 Upload successful:', file_url);
          
          await sendMessage('voice', {
            url: file_url,
            name: 'הודעה קולית',
            type: mimeType,
            duration: recordingTimeRef.current
          });
          
          toast.dismiss('voice-upload');
          toast.success('ההודעה הקולית נשלחה');
        } catch (error) {
          console.error('🎤 Upload error:', error);
          toast.dismiss('voice-upload');
          toast.error('שגיאה בשליחת ההקלטה');
        }
      };

      console.log('🎤 Starting MediaRecorder...');
      mediaRecorderRef.current.start(200);
      console.log('🎤 MediaRecorder state:', mediaRecorderRef.current.state);
      
      setIsRecording(true);
      setRecordingTime(0);
      recordingTimeRef.current = 0;
      
      recordingIntervalRef.current = setInterval(() => {
        recordingTimeRef.current += 1;
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      console.log('🎤 Recording started successfully');
    } catch (error) {
      console.error('🎤 Error starting recording:', error);
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
      audioChunksRef.current = [];
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(recordingIntervalRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    }
  };

  const playVoice = (url, msgId) => {
    if (playingVoice === msgId) {
      audioRef.current?.pause();
      setPlayingVoice(null);
    } else {
      if (audioRef.current) audioRef.current.pause();
      audioRef.current = new Audio(url);
      audioRef.current.play();
      audioRef.current.onended = () => setPlayingVoice(null);
      setPlayingVoice(msgId);
    }
  };

  // Chat management
  const createNewChat = async () => {
    if (newChatData.participants.length === 0) {
      toast.error('נא לבחור משתתפים');
      return;
    }

    try {
      const client = clients.find(c => c.id === newChatData.client_id);
      const participantNames = newChatData.participants.map(email => getDisplayName(email));

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
      refreshChats();
    } catch (error) {
      toast.error('שגיאה ביצירת השיחה');
    }
  };

  const handleDeleteChat = async (chatId) => {
    if (!confirm('האם למחוק את השיחה?')) return;
    try {
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
      refreshChats();
    } catch (error) {
      toast.error('שגיאה במחיקה');
    }
  };

  const handleEditChat = (chat) => {
    loadClients();
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
      refreshChats();
    } catch (error) {
      toast.error('שגיאה בעדכון');
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // AI: Generate chat summary
  const generateChatSummary = async () => {
    if (messages.length === 0) {
      toast.error('אין הודעות לסיכום');
      return;
    }
    
    setIsGeneratingSummary(true);
    setShowSummaryDialog(true);
    setChatSummary('');
    
    try {
      const chatContent = messages.map(m => 
        `${getDisplayName(m.sender_email)}: ${m.content}`
      ).join('\n');
      
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `סכם את השיחה הבאה בעברית. תן סיכום קצר וממוקד של הנקודות העיקריות, החלטות שהתקבלו, ומשימות שעלו:\n\n${chatContent}`,
        response_json_schema: {
          type: "object",
          properties: {
            summary: { type: "string", description: "סיכום השיחה" },
            key_points: { type: "array", items: { type: "string" }, description: "נקודות מפתח" },
            action_items: { type: "array", items: { type: "string" }, description: "משימות לביצוע" }
          }
        }
      });
      
      let summaryText = result.summary || '';
      if (result.key_points?.length > 0) {
        summaryText += '\n\n📌 נקודות מפתח:\n' + result.key_points.map(p => `• ${p}`).join('\n');
      }
      if (result.action_items?.length > 0) {
        summaryText += '\n\n✅ משימות:\n' + result.action_items.map(t => `• ${t}`).join('\n');
      }
      
      setChatSummary(summaryText);
    } catch (error) {
      console.error('Error generating summary:', error);
      toast.error('שגיאה ביצירת הסיכום');
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  // AI: Transcribe voice message
  const transcribeVoice = async (msg) => {
    if (!msg.file_url) return;
    
    setIsTranscribing(msg.id);
    
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: 'תמלל את ההודעה הקולית הזו לעברית. אם זה לא אודיו או לא ניתן לתמלל, כתוב "לא ניתן לתמלל".',
        file_urls: [msg.file_url],
        response_json_schema: {
          type: "object",
          properties: {
            transcription: { type: "string", description: "התמלול" }
          }
        }
      });
      
      if (result.transcription && result.transcription !== 'לא ניתן לתמלל') {
        // Update message with transcription
        await base44.entities.InternalMessage.update(msg.id, {
          content: result.transcription
        });
        
        // Update local state
        setMessages(prev => prev.map(m => 
          m.id === msg.id ? { ...m, content: result.transcription } : m
        ));
        
        toast.success('התמלול הושלם');
      } else {
        toast.error('לא ניתן לתמלל את ההודעה');
      }
    } catch (error) {
      console.error('Error transcribing:', error);
      toast.error('שגיאה בתמלול');
    } finally {
      setIsTranscribing(null);
    }
  };

  // Create reminder from message
  const createReminderFromMessage = async () => {
    if (!reminderMessage || !reminderTime) {
      toast.error('נא לבחור זמן לתזכורת');
      return;
    }
    
    try {
      await base44.entities.Task.create({
        title: `תזכורת: ${reminderMessage.content.substring(0, 50)}...`,
        description: `מתוך שיחה עם ${getDisplayName(reminderMessage.sender_email)}:\n\n"${reminderMessage.content}"`,
        status: 'חדשה',
        priority: 'בינונית',
        due_date: reminderTime,
        reminder_enabled: true,
        reminder_at: new Date(reminderTime).toISOString(),
        category: 'אחר'
      });
      
      toast.success('התזכורת נוצרה כמשימה');
      setShowReminderDialog(false);
      setReminderMessage(null);
      setReminderTime('');
    } catch (error) {
      console.error('Error creating reminder:', error);
      toast.error('שגיאה ביצירת התזכורת');
    }
  };

  // Video call state
  const [showVideoCallDialog, setShowVideoCallDialog] = useState(false);
  const [videoCallType, setVideoCallType] = useState('meet');
  const [zoomApiKey, setZoomApiKey] = useState(() => localStorage.getItem('zoom_api_key') || '');
  const [teamsLink, setTeamsLink] = useState('');

  const startVideoCall = async (type = 'meet', customLink = null) => {
    let meetingUrl = '';
    let platform = '';
    
    if (type === 'meet') {
      // Generate a unique meeting code
      const meetCode = Math.random().toString(36).substring(2, 5) + '-' + 
                       Math.random().toString(36).substring(2, 6) + '-' + 
                       Math.random().toString(36).substring(2, 5);
      meetingUrl = `https://meet.google.com/${meetCode}`;
      platform = 'Google Meet';
    } else if (type === 'zoom' && customLink) {
      meetingUrl = customLink;
      platform = 'Zoom';
    } else if (type === 'teams' && customLink) {
      meetingUrl = customLink;
      platform = 'Microsoft Teams';
    }
    
    if (!meetingUrl) {
      toast.error('נא להזין קישור לפגישה');
      return;
    }
    
    // Send meeting link as message
    try {
      const messageContent = `📹 הזמנה לשיחת וידאו ב-${platform}\n\n🔗 ${meetingUrl}\n\nלחץ על הקישור כדי להצטרף`;
      
      const messageData = {
        chat_id: selectedChat.id,
        sender_email: currentUser.email,
        sender_name: currentUser.full_name || currentUser.email,
        content: messageContent,
        type: 'text',
        read_by: [currentUser.email]
      };

      const newMsg = await base44.entities.InternalMessage.create(messageData);

      await base44.entities.InternalChat.update(selectedChat.id, {
        last_message: `📹 שיחת וידאו ב-${platform}`,
        last_message_at: new Date().toISOString()
      });

      setMessages(prev => [...prev, { ...messageData, id: newMsg.id, created_date: new Date().toISOString() }]);
      
      setChats(prev => prev.map(c => 
        c.id === selectedChat.id 
          ? { ...c, last_message: `📹 שיחת וידאו`, last_message_at: new Date().toISOString() }
          : c
      ).sort((a, b) => new Date(b.last_message_at) - new Date(a.last_message_at)));

      // Open the meeting in new tab
      window.open(meetingUrl, '_blank');
      toast.success(`קישור ל-${platform} נשלח ונפתח`);
      setShowVideoCallDialog(false);
    } catch (error) {
      console.error('Error sending video call link:', error);
      toast.error('שגיאה בשליחת הקישור');
    }
  };

  const startVoiceCall = () => {
    const others = getOtherParticipants(selectedChat);
    const participantPhones = others.map(email => {
      const user = allUsers.find(u => u.email === email);
      return user?.phone || user?.whatsapp;
    }).filter(Boolean);
    
    if (participantPhones.length > 0) {
      const phone = participantPhones[0].replace(/[^0-9]/g, '');
      window.open(`https://wa.me/${phone}`, '_blank');
      toast.success('נפתחה שיחה ב-WhatsApp');
    } else {
      // Start voice call via Meet
      startVideoCall('meet');
    }
  };

  // Filtered chats based on search
  const filteredChats = useMemo(() => {
    if (!searchTerm) return chats;
    const term = searchTerm.toLowerCase();
    return chats.filter(chat => 
      chat.name?.toLowerCase().includes(term) ||
      chat.client_name?.toLowerCase().includes(term) ||
      chat.participants?.some(p => 
        p.toLowerCase().includes(term) || 
        getDisplayName(p).toLowerCase().includes(term)
      )
    );
  }, [chats, searchTerm, getDisplayName]);

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
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={refreshChats} title="רענן">
                <RefreshCw className="w-4 h-4" />
              </Button>
              <Button size="sm" onClick={() => { loadClients(); setShowNewChatDialog(true); }}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
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
              const chatDisplayName = chat.name || others.map(getDisplayName).join(', ') || 'שיחה';
              
              return (
                <div
                  key={chat.id}
                  className={`p-4 border-b cursor-pointer hover:bg-slate-50 transition-colors group ${
                    isSelected ? 'bg-blue-50 border-r-4 border-r-blue-500' : ''
                  }`}
                  onClick={() => {
                    if (selectedChat?.id !== chat.id) {
                      selectedChatIdRef.current = null; // Reset to allow loading
                      setSelectedChat(chat);
                    }
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="relative">
                      <Avatar className="w-10 h-10">
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                          {getDisplayName(others[0])?.charAt(0).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      {others.some(email => isUserOnline(email)) && (
                        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-sm truncate">
                          {chatDisplayName}
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
                <div className="relative">
                  <Avatar>
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                      {getDisplayName(getOtherParticipants(selectedChat)[0])?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  {getOtherParticipants(selectedChat).some(email => isUserOnline(email)) && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold">
                    {selectedChat.name || getOtherParticipants(selectedChat).map(getDisplayName).join(', ')}
                  </h3>
                  <div className="flex items-center gap-2">
                    {selectedChat.client_name && (
                      <span className="text-xs text-slate-500">לקוח: {selectedChat.client_name}</span>
                    )}
                    {getOtherParticipants(selectedChat).some(email => isUserOnline(email)) ? (
                      <span className="text-xs text-green-600 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                        מחובר
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">לא מחובר</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={generateChatSummary}
                  title="סיכום שיחה עם AI"
                  className="hover:bg-purple-50 hover:text-purple-600"
                >
                  <Sparkles className="w-5 h-5" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={startVoiceCall}
                  title="התחל שיחה קולית"
                  className="hover:bg-green-50 hover:text-green-600"
                >
                  <Phone className="w-5 h-5" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setShowVideoCallDialog(true)}
                  title="התחל שיחת וידאו"
                  className="hover:bg-blue-50 hover:text-blue-600"
                >
                  <Video className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {isLoadingMessages ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                </div>
              ) : (
                <>
                  {messages.map((msg) => {
                    const isMe = msg.sender_email === currentUser?.email;
                    
                    return (
                      <div key={msg.id} className={`flex ${isMe ? 'justify-start' : 'justify-end'} group`}>
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
                                {getDisplayName(msg.sender_email)}
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
                                <FileIcon className="w-5 h-5" />
                                <span className="text-sm truncate">{msg.file_name}</span>
                              </a>
                            )}
                            
                            {msg.type === 'voice' && (
                              <div className={`flex flex-col gap-2 p-2 rounded-lg ${isMe ? 'bg-white/20' : 'bg-slate-100'}`}>
                                <div className="flex items-center gap-3">
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
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6"
                                    onClick={() => transcribeVoice(msg)}
                                    disabled={isTranscribing === msg.id}
                                    title="תמלל הודעה"
                                  >
                                    {isTranscribing === msg.id ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <FileText className="w-3 h-3" />
                                    )}
                                  </Button>
                                </div>
                                {msg.content && msg.content !== 'הודעה קולית' && (
                                  <p className="text-xs opacity-80 border-t pt-1 mt-1">
                                    📝 {msg.content}
                                  </p>
                                )}
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
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-5 w-5 opacity-0 group-hover:opacity-100 hover:bg-amber-50"
                              onClick={() => {
                                setReminderMessage(msg);
                                setShowReminderDialog(true);
                              }}
                              title="צור תזכורת"
                            >
                              <Bell className="w-3 h-3 text-amber-600" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </>
              )}
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
              <Button onClick={() => { loadClients(); setShowNewChatDialog(true); }}>
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
                    {allUsers
                      .filter(u => u.email !== currentUser?.email)
                      .map(user => (
                        <SelectItem key={user.id} value={user.email}>
                          {getDisplayName(user.email)}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <div className="flex flex-wrap gap-2 mt-2">
                  {newChatData.participants.map(email => (
                    <Badge key={email} variant="secondary" className="gap-1">
                      {getDisplayName(email)}
                      <X 
                        className="w-3 h-3 cursor-pointer" 
                        onClick={() => setNewChatData({
                          ...newChatData,
                          participants: newChatData.participants.filter(p => p !== email)
                        })}
                      />
                    </Badge>
                  ))}
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
      
      {/* Video Call Dialog */}
      {showVideoCallDialog && (
        <Dialog open={showVideoCallDialog} onOpenChange={setShowVideoCallDialog}>
          <DialogContent dir="rtl" className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Video className="w-5 h-5 text-blue-600" />
                התחל שיחת וידאו
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant={videoCallType === 'meet' ? 'default' : 'outline'}
                  onClick={() => setVideoCallType('meet')}
                  className="flex flex-col items-center gap-2 h-auto py-4"
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-blue-500 rounded-lg flex items-center justify-center">
                    <Video className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-xs">Google Meet</span>
                </Button>
                <Button
                  variant={videoCallType === 'zoom' ? 'default' : 'outline'}
                  onClick={() => setVideoCallType('zoom')}
                  className="flex flex-col items-center gap-2 h-auto py-4"
                >
                  <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">Z</span>
                  </div>
                  <span className="text-xs">Zoom</span>
                </Button>
                <Button
                  variant={videoCallType === 'teams' ? 'default' : 'outline'}
                  onClick={() => setVideoCallType('teams')}
                  className="flex flex-col items-center gap-2 h-auto py-4"
                >
                  <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">T</span>
                  </div>
                  <span className="text-xs">Teams</span>
                </Button>
              </div>

              {videoCallType === 'meet' && (
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <p className="text-sm text-green-800">
                    ייווצר קישור חדש ל-Google Meet וישלח לשיחה
                  </p>
                </div>
              )}

              {videoCallType === 'zoom' && (
                <div className="space-y-3">
                  <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-800">
                    הדבק קישור לפגישת Zoom קיימת, או צור פגישה חדשה ב-Zoom והדבק את הקישור
                  </div>
                  <Input
                    placeholder="https://zoom.us/j/..."
                    value={zoomApiKey}
                    onChange={(e) => {
                      setZoomApiKey(e.target.value);
                      localStorage.setItem('zoom_api_key', e.target.value);
                    }}
                  />
                </div>
              )}

              {videoCallType === 'teams' && (
                <div className="space-y-3">
                  <div className="bg-purple-50 rounded-lg p-3 text-sm text-purple-800">
                    הדבק קישור לפגישת Teams קיימת
                  </div>
                  <Input
                    placeholder="https://teams.microsoft.com/..."
                    value={teamsLink}
                    onChange={(e) => setTeamsLink(e.target.value)}
                  />
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowVideoCallDialog(false)}>ביטול</Button>
              <Button 
                onClick={() => {
                  if (videoCallType === 'meet') {
                    startVideoCall('meet');
                  } else if (videoCallType === 'zoom') {
                    startVideoCall('zoom', zoomApiKey);
                  } else if (videoCallType === 'teams') {
                    startVideoCall('teams', teamsLink);
                  }
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Video className="w-4 h-4 ml-2" />
                התחל שיחה
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* AI Summary Dialog */}
      {showSummaryDialog && (
        <Dialog open={showSummaryDialog} onOpenChange={setShowSummaryDialog}>
          <DialogContent dir="rtl" className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                סיכום שיחה
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              {isGeneratingSummary ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-600 mb-3" />
                  <p className="text-slate-600">מייצר סיכום...</p>
                </div>
              ) : (
                <div className="bg-slate-50 rounded-lg p-4 whitespace-pre-wrap text-sm">
                  {chatSummary || 'אין סיכום'}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowSummaryDialog(false)}>סגור</Button>
              {chatSummary && (
                <Button 
                  onClick={() => {
                    navigator.clipboard.writeText(chatSummary);
                    toast.success('הסיכום הועתק');
                  }}
                >
                  העתק סיכום
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Reminder Dialog */}
      {showReminderDialog && reminderMessage && (
        <Dialog open={showReminderDialog} onOpenChange={setShowReminderDialog}>
          <DialogContent dir="rtl" className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-amber-600" />
                צור תזכורת מהודעה
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="bg-slate-50 rounded-lg p-3 text-sm">
                <p className="text-xs text-slate-500 mb-1">ההודעה:</p>
                <p>"{reminderMessage.content}"</p>
                <p className="text-xs text-slate-400 mt-2">
                  מאת: {getDisplayName(reminderMessage.sender_email)}
                </p>
              </div>
              <div>
                <Label className="mb-2 block">מתי להזכיר?</Label>
                <Input
                  type="datetime-local"
                  value={reminderTime}
                  onChange={(e) => setReminderTime(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    const tomorrow = new Date();
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    tomorrow.setHours(9, 0, 0, 0);
                    setReminderTime(tomorrow.toISOString().slice(0, 16));
                  }}
                >
                  <Clock className="w-3 h-3 ml-1" />
                  מחר 09:00
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    const inHour = new Date();
                    inHour.setHours(inHour.getHours() + 1);
                    setReminderTime(inHour.toISOString().slice(0, 16));
                  }}
                >
                  <Clock className="w-3 h-3 ml-1" />
                  בעוד שעה
                </Button>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowReminderDialog(false)}>ביטול</Button>
              <Button onClick={createReminderFromMessage} className="bg-amber-600 hover:bg-amber-700">
                <Bell className="w-4 h-4 ml-2" />
                צור תזכורת
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