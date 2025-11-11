import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  MessageCircleMore,
  Plus,
  Send,
  Loader2,
  Users,
  Briefcase,
  Hash,
  Edit2,
  Trash2,
  Archive,
  Search,
  Paperclip,
  X,
  Check,
  CheckCheck,
  Pin,
  Filter,
  UserPlus
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { he } from "date-fns/locale";

export default function TeamChatPage() {
  const [rooms, setRooms] = useState([]);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [newRoomDialogOpen, setNewRoomDialogOpen] = useState(false);
  const [filterType, setFilterType] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [user, setUser] = useState(null);
  
  // New room form
  const [newRoomForm, setNewRoomForm] = useState({
    name: '',
    type: 'topic',
    client_id: '',
    project_id: '',
    topic: '',
    participants: []
  });

  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  
  const scrollRef = useRef(null);
  const messagesPollingRef = useRef(null);
  const mountedRef = useRef(true);

  // Load user and initial data
  useEffect(() => {
    loadInitialData();
    
    return () => {
      mountedRef.current = false;
      if (messagesPollingRef.current) {
        clearInterval(messagesPollingRef.current);
      }
    };
  }, []);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Poll for new messages when room is selected
  useEffect(() => {
    if (currentRoom && mountedRef.current) {
      loadMessages(currentRoom.id);
      
      // Poll every 3 seconds
      messagesPollingRef.current = setInterval(() => {
        if (mountedRef.current && currentRoom) {
          loadMessages(currentRoom.id);
        }
      }, 3000);
      
      return () => {
        if (messagesPollingRef.current) {
          clearInterval(messagesPollingRef.current);
        }
      };
    }
  }, [currentRoom]);

  const loadInitialData = async () => {
    try {
      const [userData, clientsData, projectsData, usersData] = await Promise.all([
        base44.auth.me(),
        base44.entities.Client.list('-created_date', 100),
        base44.entities.Project.list('-created_date', 100),
        base44.entities.User.list()
      ]);
      
      if (mountedRef.current) {
        setUser(userData);
        setClients(clientsData);
        setProjects(projectsData);
        setAllUsers(usersData);
        await loadRooms(userData.email);
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
      toast.error('שגיאה בטעינת נתונים');
    }
  };

  const loadRooms = async (userEmail) => {
    setLoadingRooms(true);
    try {
      const allRooms = await base44.entities.ChatRoom.filter(
        { 
          active: true,
          participants: { $in: [userEmail] }
        },
        '-last_message_at',
        100
      );
      
      if (mountedRef.current) {
        setRooms(allRooms);
        if (allRooms.length > 0 && !currentRoom) {
          setCurrentRoom(allRooms[0]);
        }
      }
    } catch (error) {
      console.error('Error loading rooms:', error);
      toast.error('שגיאה בטעינת חדרי צ\'אט');
    } finally {
      if (mountedRef.current) {
        setLoadingRooms(false);
      }
    }
  };

  const loadMessages = async (roomId) => {
    try {
      const msgs = await base44.entities.ChatMessage.filter(
        { chat_room_id: roomId },
        'created_date',
        200
      );
      
      if (mountedRef.current) {
        setMessages(msgs);
        
        // Mark messages as read
        const unreadMessages = msgs.filter(
          m => !m.read_by?.includes(user.email) && m.sender_email !== user.email
        );
        
        for (const msg of unreadMessages) {
          await base44.entities.ChatMessage.update(msg.id, {
            read_by: [...(msg.read_by || []), user.email]
          });
        }
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const handleCreateRoom = async () => {
    if (!newRoomForm.name.trim()) {
      toast.error('נא להזין שם לחדר');
      return;
    }

    if (newRoomForm.participants.length === 0) {
      toast.error('נא לבחור לפחות משתתף אחד');
      return;
    }

    try {
      const roomData = {
        name: newRoomForm.name.trim(),
        type: newRoomForm.type,
        participants: [...new Set([...newRoomForm.participants, user.email])], // הוסף את המשתמש הנוכחי
        active: true,
        archived: false,
        topic: newRoomForm.topic.trim() || undefined
      };

      // הוסף שדות נוספים לפי סוג החדר
      if (newRoomForm.type === 'client' && newRoomForm.client_id) {
        roomData.client_id = newRoomForm.client_id;
        roomData.client_name = clients.find(c => c.id === newRoomForm.client_id)?.name;
      }

      if (newRoomForm.type === 'project' && newRoomForm.project_id) {
        roomData.project_id = newRoomForm.project_id;
        roomData.project_name = projects.find(p => p.id === newRoomForm.project_id)?.name;
      }

      const newRoom = await base44.entities.ChatRoom.create(roomData);
      
      if (mountedRef.current) {
        await loadRooms(user.email);
        setCurrentRoom(newRoom);
        setNewRoomDialogOpen(false);
        setNewRoomForm({
          name: '',
          type: 'topic',
          client_id: '',
          project_id: '',
          topic: '',
          participants: []
        });
        toast.success('חדר צ\'אט נוצר בהצלחה! 🎉');
      }
    } catch (error) {
      console.error('Error creating room:', error);
      toast.error('שגיאה ביצירת חדר');
    }
  };

  const handleSendMessage = async () => {
    const text = inputMessage.trim();
    
    if (!text || !currentRoom || loading) return;

    setInputMessage("");
    setLoading(true);

    try {
      const messageData = {
        chat_room_id: currentRoom.id,
        sender_email: user.email,
        sender_name: user.full_name || user.email,
        content: text,
        message_type: 'text',
        read_by: [user.email]
      };

      await base44.entities.ChatMessage.create(messageData);
      
      // Update room's last message
      await base44.entities.ChatRoom.update(currentRoom.id, {
        last_message_at: new Date().toISOString(),
        last_message_preview: text.substring(0, 100)
      });

      if (mountedRef.current) {
        await loadMessages(currentRoom.id);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('שגיאה בשליחת הודעה');
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  };

  const handleDeleteRoom = async (roomId) => {
    if (!confirm('למחוק את חדר הצ\'אט? לא ניתן לשחזר!')) return;

    try {
      await base44.entities.ChatRoom.update(roomId, { active: false });
      
      if (mountedRef.current) {
        await loadRooms(user.email);
        if (currentRoom?.id === roomId) {
          setCurrentRoom(null);
          setMessages([]);
        }
        toast.success('חדר הצ\'אט נמחק');
      }
    } catch (error) {
      console.error('Error deleting room:', error);
      toast.error('שגיאה במחיקת החדר');
    }
  };

  const toggleParticipant = (email) => {
    setNewRoomForm(prev => ({
      ...prev,
      participants: prev.participants.includes(email)
        ? prev.participants.filter(p => p !== email)
        : [...prev.participants, email]
    }));
  };

  const selectAllParticipants = () => {
    const allEmails = allUsers.filter(u => u.email !== user.email).map(u => u.email);
    setNewRoomForm(prev => ({
      ...prev,
      participants: prev.participants.length === allEmails.length ? [] : allEmails
    }));
  };

  const getRoomIcon = (type) => {
    switch (type) {
      case 'client': return <Users className="w-4 h-4" />;
      case 'project': return <Briefcase className="w-4 h-4" />;
      case 'direct': return <Users className="w-4 h-4" />;
      default: return <Hash className="w-4 h-4" />;
    }
  };

  const getRoomTypeLabel = (type) => {
    switch (type) {
      case 'client': return 'לקוח';
      case 'project': return 'פרויקט';
      case 'direct': return 'ישיר';
      default: return 'נושא';
    }
  };

  const filteredRooms = rooms.filter(room => {
    const matchesType = filterType === 'all' || room.type === filterType;
    const matchesSearch = room.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         room.topic?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         room.client_name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesSearch;
  });

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 to-slate-100" dir="rtl">
      {/* Sidebar - Rooms List */}
      <div className="w-80 bg-white border-l border-slate-200 flex flex-col shadow-lg">
        <div className="p-4 border-b border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <MessageCircleMore className="w-6 h-6 text-blue-600" />
              צ'אט צוות
            </h2>
            <Button
              onClick={() => setNewRoomDialogOpen(true)}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 ml-1" />
              חדש
            </Button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="חיפוש חדרים..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10"
            />
          </div>

          {/* Filter */}
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger>
              <SelectValue placeholder="סנן לפי סוג" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">הכל</SelectItem>
              <SelectItem value="topic">נושאים</SelectItem>
              <SelectItem value="client">לקוחות</SelectItem>
              <SelectItem value="project">פרויקטים</SelectItem>
              <SelectItem value="direct">ישיר</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {loadingRooms ? (
              <div className="text-center py-8">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600" />
              </div>
            ) : filteredRooms.length === 0 ? (
              <div className="text-center py-8 px-3">
                <p className="text-sm text-slate-600">אין חדרי צ'אט</p>
                <Button
                  onClick={() => setNewRoomDialogOpen(true)}
                  size="sm"
                  variant="outline"
                  className="mt-3"
                >
                  <Plus className="w-4 h-4 ml-1" />
                  צור חדר ראשון
                </Button>
              </div>
            ) : (
              filteredRooms.map((room) => {
                const isActive = currentRoom?.id === room.id;
                const unreadCount = room.unread_count?.[user.email] || 0;

                return (
                  <div
                    key={room.id}
                    className={`group p-3 rounded-lg cursor-pointer transition-all ${
                      isActive
                        ? "bg-blue-100 border-2 border-blue-400"
                        : "hover:bg-slate-50 border-2 border-transparent"
                    }`}
                    onClick={() => setCurrentRoom(room)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        <div className="mt-0.5">
                          {getRoomIcon(room.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className={`text-sm font-semibold truncate ${
                            isActive ? "text-blue-900" : "text-slate-900"
                          }`}>
                            {room.name}
                          </h4>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <Badge variant="outline" className="text-xs">
                              {getRoomTypeLabel(room.type)}
                            </Badge>
                            {room.client_name && (
                              <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                                {room.client_name}
                              </Badge>
                            )}
                            {unreadCount > 0 && (
                              <Badge className="bg-red-500 text-white text-xs">
                                {unreadCount}
                              </Badge>
                            )}
                          </div>
                          {room.last_message_preview && (
                            <p className="text-xs text-slate-500 truncate mt-1">
                              {room.last_message_preview}
                            </p>
                          )}
                          {room.participants && (
                            <p className="text-xs text-slate-400 mt-1">
                              <Users className="w-3 h-3 inline ml-1" />
                              {room.participants.length} משתתפים
                            </p>
                          )}
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteRoom(room.id);
                        }}
                      >
                        <Trash2 className="w-3 h-3 text-red-500" />
                      </Button>
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
        {currentRoom ? (
          <>
            {/* Header */}
            <div className="bg-white border-b px-6 py-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-bold flex items-center gap-2">
                    {getRoomIcon(currentRoom.type)}
                    {currentRoom.name}
                  </h1>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <Badge variant="outline" className="text-xs">
                      {getRoomTypeLabel(currentRoom.type)}
                    </Badge>
                    {currentRoom.client_name && (
                      <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                        לקוח: {currentRoom.client_name}
                      </Badge>
                    )}
                    {currentRoom.participants && (
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {currentRoom.participants.length} משתתפים
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-6" ref={scrollRef}>
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <MessageCircleMore className="w-16 h-16 text-slate-300 mb-4" />
                  <h3 className="text-lg font-semibold text-slate-600 mb-2">
                    עדיין אין הודעות
                  </h3>
                  <p className="text-sm text-slate-500">
                    התחל שיחה עם הצוות שלך!
                  </p>
                </div>
              ) : (
                <div className="space-y-4 max-w-4xl mx-auto">
                  {messages.map((msg, index) => {
                    const isOwn = msg.sender_email === user.email;
                    const showDate = index === 0 || 
                      new Date(messages[index - 1].created_date).toDateString() !== 
                      new Date(msg.created_date).toDateString();

                    return (
                      <div key={msg.id}>
                        {showDate && (
                          <div className="flex items-center justify-center my-4">
                            <div className="bg-slate-200 text-slate-600 text-xs px-3 py-1 rounded-full">
                              {format(new Date(msg.created_date), 'dd MMMM yyyy', { locale: he })}
                            </div>
                          </div>
                        )}
                        
                        <div className={`flex gap-3 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                          {!isOwn && (
                            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                              {msg.sender_name?.substring(0, 1).toUpperCase()}
                            </div>
                          )}
                          
                          <div className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                            {!isOwn && (
                              <span className="text-xs font-semibold text-slate-700 mb-1">
                                {msg.sender_name}
                              </span>
                            )}
                            
                            <div className={`rounded-2xl px-4 py-2 ${
                              isOwn 
                                ? 'bg-blue-600 text-white' 
                                : 'bg-white border border-slate-200'
                            }`}>
                              <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                                {msg.content}
                              </p>
                            </div>
                            
                            <div className="flex items-center gap-1 mt-1">
                              <span className="text-xs text-slate-400">
                                {format(new Date(msg.created_date), 'HH:mm')}
                              </span>
                              {isOwn && msg.read_by && msg.read_by.length > 1 && (
                                <CheckCheck className="w-3 h-3 text-blue-500" />
                              )}
                            </div>
                          </div>

                          {isOwn && (
                            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                              {user.full_name?.substring(0, 1).toUpperCase() || 'א'}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {loading && (
                    <div className="flex justify-center">
                      <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>

            {/* Input */}
            <div className="bg-white border-t px-6 py-4">
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
                  placeholder="הקלד הודעה..."
                  className="flex-1"
                  disabled={loading}
                  dir="rtl"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || loading}
                  className="bg-blue-600 hover:bg-blue-700"
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
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <MessageCircleMore className="w-20 h-20 text-slate-300 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-slate-600 mb-2">
                בחר חדר צ'אט
              </h2>
              <p className="text-slate-500 mb-6">
                בחר חדר מהרשימה או צור חדר חדש
              </p>
              <Button
                onClick={() => setNewRoomDialogOpen(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-5 h-5 ml-2" />
                צור חדר חדש
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* New Room Dialog */}
      <Dialog open={newRoomDialogOpen} onOpenChange={setNewRoomDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl">יצירת חדר צ'אט חדש</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">שם החדר *</label>
              <Input
                value={newRoomForm.name}
                onChange={(e) => setNewRoomForm({ ...newRoomForm, name: e.target.value })}
                placeholder="לדוגמה: דיון פרויקט X"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">סוג החדר</label>
              <Select
                value={newRoomForm.type}
                onValueChange={(value) => setNewRoomForm({ ...newRoomForm, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="topic">נושא כללי</SelectItem>
                  <SelectItem value="client">לקוח ספציפי</SelectItem>
                  <SelectItem value="project">פרויקט ספציפי</SelectItem>
                  <SelectItem value="direct">שיחה ישירה</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {newRoomForm.type === 'client' && (
              <div className="space-y-2 p-3 bg-green-50 rounded-lg border border-green-200">
                <label className="text-sm font-medium text-green-900">בחר לקוח *</label>
                <Select
                  value={newRoomForm.client_id}
                  onValueChange={(value) => {
                    const client = clients.find(c => c.id === value);
                    setNewRoomForm({ 
                      ...newRoomForm, 
                      client_id: value,
                      client_name: client?.name 
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="בחר לקוח מהרשימה" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map(client => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {newRoomForm.type === 'project' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">בחר פרויקט</label>
                <Select
                  value={newRoomForm.project_id}
                  onValueChange={(value) => {
                    const project = projects.find(p => p.id === value);
                    setNewRoomForm({ 
                      ...newRoomForm, 
                      project_id: value,
                      project_name: project?.name 
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="בחר פרויקט" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map(project => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">נושא (אופציונלי)</label>
              <Input
                value={newRoomForm.topic}
                onChange={(e) => setNewRoomForm({ ...newRoomForm, topic: e.target.value })}
                placeholder="תיאור קצר של הנושא"
              />
            </div>

            {/* בחירת משתתפים - חדש ומשופר */}
            <div className="space-y-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-blue-900 flex items-center gap-2">
                  <UserPlus className="w-4 h-4" />
                  בחר משתתפים * ({newRoomForm.participants.length} נבחרו)
                </label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={selectAllParticipants}
                  className="text-xs"
                >
                  {newRoomForm.participants.length === allUsers.filter(u => u.email !== user.email).length 
                    ? 'בטל הכל' 
                    : 'בחר הכל'}
                </Button>
              </div>

              <ScrollArea className="max-h-60 pr-3">
                <div className="space-y-2">
                  {allUsers
                    .filter(u => u.email !== user.email)
                    .map(u => (
                      <div
                        key={u.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          newRoomForm.participants.includes(u.email)
                            ? 'bg-blue-100 border-blue-400'
                            : 'bg-white border-slate-200 hover:border-blue-300'
                        }`}
                        onClick={() => toggleParticipant(u.email)}
                      >
                        <Checkbox
                          checked={newRoomForm.participants.includes(u.email)}
                          onCheckedChange={() => toggleParticipant(u.email)}
                        />
                        <div className="flex-1">
                          <div className="font-medium text-sm">{u.full_name || u.email}</div>
                          <div className="text-xs text-slate-500">{u.email}</div>
                        </div>
                        {newRoomForm.participants.includes(u.email) && (
                          <Check className="w-5 h-5 text-blue-600" />
                        )}
                      </div>
                    ))}
                </div>
              </ScrollArea>

              {newRoomForm.participants.length === 0 && (
                <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
                  יש לבחור לפחות משתתף אחד
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setNewRoomDialogOpen(false)}>
              ביטול
            </Button>
            <Button 
              onClick={handleCreateRoom} 
              className="bg-blue-600 hover:bg-blue-700"
              disabled={!newRoomForm.name.trim() || newRoomForm.participants.length === 0}
            >
              <Plus className="w-4 h-4 ml-2" />
              צור חדר
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}