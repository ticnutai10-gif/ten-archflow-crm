import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare,
  Trash2,
  Edit,
  Pin,
  Archive,
  FolderOpen,
  User,
  Search,
  Clock,
  ChevronLeft
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import ReactMarkdown from 'react-markdown';
import { Plus } from 'lucide-react';

const FOLDERS = ['כללי', 'לקוחות', 'פרויקטים', 'משימות', 'דוחות', 'אחר'];

const folderColors = {
  'כללי': 'bg-slate-100 text-slate-700',
  'לקוחות': 'bg-blue-100 text-blue-700',
  'פרויקטים': 'bg-purple-100 text-purple-700',
  'משימות': 'bg-green-100 text-green-700',
  'דוחות': 'bg-amber-100 text-amber-700',
  'אחר': 'bg-pink-100 text-pink-700'
};

export default function ChatHistory() {
  const [conversations, setConversations] = useState([]);
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFolder, setSelectedFolder] = useState('all');
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editData, setEditData] = useState({ name: '', folder: '', client_id: '', project_id: '' });
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newChatData, setNewChatData] = useState({ name: '', folder: 'כללי', client_id: '' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [convos, clientsData, projectsData] = await Promise.all([
        base44.entities.ChatConversation.list('-last_message_at').catch(() => []),
        base44.entities.Client.list().catch(() => []),
        base44.entities.Project.list().catch(() => [])
      ]);
      setConversations(convos);
      setClients(clientsData);
      setProjects(projectsData);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('למחוק שיחה זו? לא ניתן לשחזר.')) return;
    try {
      await base44.entities.ChatConversation.delete(id);
      toast.success('השיחה נמחקה');
      loadData();
    } catch (error) {
      toast.error('שגיאה במחיקה');
    }
  };

  const handleTogglePin = async (conv) => {
    try {
      await base44.entities.ChatConversation.update(conv.id, { pinned: !conv.pinned });
      toast.success(conv.pinned ? 'הנעיצה בוטלה' : 'השיחה נעוצה');
      loadData();
    } catch (error) {
      toast.error('שגיאה בעדכון');
    }
  };

  const handleArchive = async (conv) => {
    try {
      await base44.entities.ChatConversation.update(conv.id, { archived: !conv.archived });
      toast.success(conv.archived ? 'השיחה שוחזרה' : 'השיחה הועברה לארכיון');
      loadData();
    } catch (error) {
      toast.error('שגיאה בעדכון');
    }
  };

  const handleEdit = (conv) => {
    setEditData({
      name: conv.name,
      folder: conv.folder || 'כללי',
      client_id: conv.client_id || '',
      project_id: conv.project_id || ''
    });
    setSelectedConversation(conv);
    setShowEditDialog(true);
  };

  const handleSaveEdit = async () => {
    try {
      const client = clients.find(c => c.id === editData.client_id);
      const project = projects.find(p => p.id === editData.project_id);
      
      await base44.entities.ChatConversation.update(selectedConversation.id, {
        name: editData.name,
        folder: editData.folder,
        client_id: editData.client_id || null,
        client_name: client?.name || null,
        project_id: editData.project_id || null,
        project_name: project?.name || null
      });
      
      toast.success('השיחה עודכנה');
      setShowEditDialog(false);
      loadData();
    } catch (error) {
      toast.error('שגיאה בעדכון');
    }
  };

  const handleCreateNewChat = async () => {
    if (!newChatData.name.trim()) {
      toast.error('נא להזין שם לשיחה');
      return;
    }
    
    try {
      const client = clients.find(c => c.id === newChatData.client_id);
      
      await base44.entities.ChatConversation.create({
        name: newChatData.name,
        folder: newChatData.folder,
        client_id: newChatData.client_id || null,
        client_name: client?.name || null,
        messages: [],
        last_message_at: new Date().toISOString()
      });
      
      toast.success('שיחה חדשה נוצרה');
      setShowNewDialog(false);
      setNewChatData({ name: '', folder: 'כללי', client_id: '' });
      loadData();
    } catch (error) {
      toast.error('שגיאה ביצירת שיחה');
    }
  };

  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = conv.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         conv.client_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFolder = selectedFolder === 'all' || conv.folder === selectedFolder;
    return matchesSearch && matchesFolder && !conv.archived;
  });

  const pinnedConversations = filteredConversations.filter(c => c.pinned);
  const regularConversations = filteredConversations.filter(c => !c.pinned);

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">היסטוריית צ'אט</h2>
          <p className="text-slate-600">נהל את כל השיחות שלך עם ה-AI</p>
        </div>
        <Button onClick={() => setShowNewDialog(true)} className="gap-2 bg-purple-600 hover:bg-purple-700">
          <Plus className="w-4 h-4" />
          שיחה חדשה
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 items-center">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 absolute right-3 top-3 text-slate-400" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="חפש שיחות..."
                className="pr-10"
              />
            </div>
            <Select value={selectedFolder} onValueChange={setSelectedFolder}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="כל התיקיות" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל התיקיות</SelectItem>
                {FOLDERS.map(folder => (
                  <SelectItem key={folder} value={folder}>{folder}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Pinned */}
      {pinnedConversations.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <Pin className="w-4 h-4" />
            נעוצות
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pinnedConversations.map(conv => (
              <ConversationCard
                key={conv.id}
                conversation={conv}
                onDelete={handleDelete}
                onEdit={handleEdit}
                onTogglePin={handleTogglePin}
                onArchive={handleArchive}
              />
            ))}
          </div>
        </div>
      )}

      {/* Regular */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-700">שיחות</h3>
        {regularConversations.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <MessageSquare className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">אין שיחות</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {regularConversations.map(conv => (
              <ConversationCard
                key={conv.id}
                conversation={conv}
                onDelete={handleDelete}
                onEdit={handleEdit}
                onTogglePin={handleTogglePin}
                onArchive={handleArchive}
              />
            ))}
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      {showEditDialog && (
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle>עריכת שיחה</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>שם השיחה</Label>
                <Input
                  value={editData.name}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                />
              </div>
              <div>
                <Label>תיקייה</Label>
                <Select value={editData.folder} onValueChange={(v) => setEditData({ ...editData, folder: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FOLDERS.map(folder => (
                      <SelectItem key={folder} value={folder}>{folder}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>לקוח</Label>
                <Select value={editData.client_id || 'none'} onValueChange={(v) => setEditData({ ...editData, client_id: v === 'none' ? '' : v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="בחר לקוח (אופציונלי)" />
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
                <Label>פרויקט</Label>
                <Select value={editData.project_id || 'none'} onValueChange={(v) => setEditData({ ...editData, project_id: v === 'none' ? '' : v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="בחר פרויקט (אופציונלי)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">ללא פרויקט</SelectItem>
                    {projects.map(project => (
                      <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>ביטול</Button>
              <Button onClick={handleSaveEdit}>שמור</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* New Chat Dialog */}
      {showNewDialog && (
        <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle>שיחה חדשה</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>שם השיחה</Label>
                <Input
                  value={newChatData.name}
                  onChange={(e) => setNewChatData({ ...newChatData, name: e.target.value })}
                  placeholder="הזן שם לשיחה..."
                />
              </div>
              <div>
                <Label>תיקייה</Label>
                <Select value={newChatData.folder} onValueChange={(v) => setNewChatData({ ...newChatData, folder: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FOLDERS.map(folder => (
                      <SelectItem key={folder} value={folder}>{folder}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>לקוח (אופציונלי)</Label>
                <Select value={newChatData.client_id || 'none'} onValueChange={(v) => setNewChatData({ ...newChatData, client_id: v === 'none' ? '' : v })}>
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
              <Button variant="outline" onClick={() => setShowNewDialog(false)}>ביטול</Button>
              <Button onClick={handleCreateNewChat} className="bg-purple-600 hover:bg-purple-700">צור שיחה</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
      </div>
      );
      }

function ConversationCard({ conversation, onDelete, onEdit, onTogglePin, onArchive }) {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <Card className="hover:shadow-lg transition-all">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-base flex items-center gap-2 mb-2">
              {conversation.pinned && <Pin className="w-3 h-3 text-amber-500 fill-current" />}
              {conversation.name}
            </CardTitle>
            <div className="flex flex-wrap gap-2">
              <Badge className={folderColors[conversation.folder] || 'bg-slate-100'}>
                <FolderOpen className="w-3 h-3 ml-1" />
                {conversation.folder}
              </Badge>
              {conversation.client_name && (
                <Badge variant="outline" className="text-xs">
                  <User className="w-3 h-3 ml-1" />
                  {conversation.client_name}
                </Badge>
              )}
              {conversation.messages?.length > 0 && (
                <Badge variant="outline" className="text-xs">
                  {conversation.messages.length} הודעות
                </Badge>
              )}
            </div>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={() => onTogglePin(conversation)}>
              <Pin className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onEdit(conversation)}>
              <Edit className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onDelete(conversation.id)} className="text-red-600">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {conversation.last_message_at && (
          <p className="text-xs text-slate-500 mb-3 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {format(new Date(conversation.last_message_at), 'dd/MM/yyyy HH:mm', { locale: he })}
          </p>
        )}
        
        {conversation.messages?.length > 0 && (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="w-full text-xs mb-2"
            >
              <ChevronLeft className={`w-3 h-3 ml-1 transition-transform ${expanded ? 'rotate-90' : ''}`} />
              {expanded ? 'הסתר שיחה' : 'הצג שיחה'}
            </Button>
            
            {expanded && (
              <div className="space-y-2 max-h-96 overflow-y-auto border-t pt-3">
                {conversation.messages.map((msg, i) => (
                  <div key={i} className={`text-xs p-2 rounded ${msg.role === 'user' ? 'bg-purple-50 text-right' : 'bg-slate-50'}`}>
                    <div className="font-semibold mb-1">{msg.role === 'user' ? 'אתה' : 'AI'}</div>
                    <div className="prose prose-xs max-w-none">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}