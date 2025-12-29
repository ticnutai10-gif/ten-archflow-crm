import React, { useState, useEffect, useRef } from 'react';
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, X, MessageSquare, Check, Trash2, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { he } from "date-fns/locale";
import { toast } from "sonner";

export default function CommentsSidebar({ spreadsheetId, cellKey, cellTitle, currentUser, onClose, isOpen }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  const fetchComments = async () => {
    if (!spreadsheetId) return;
    try {
      // Filter by cell_key if provided, or show all if 'general' (or we could show all sheet comments)
      // If cellKey is null, maybe show "General" comments or prompt to select a cell
      const targetKey = cellKey || 'general';
      const fetched = await base44.entities.SheetComment.filter({ 
        spreadsheet_id: spreadsheetId,
        cell_key: targetKey
      });
      // Sort by date
      fetched.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
      setComments(fetched);
    } catch (e) {
      console.error("Failed to fetch comments", e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchComments();
      const interval = setInterval(fetchComments, 5000); // Poll for new comments
      return () => clearInterval(interval);
    }
  }, [spreadsheetId, cellKey, isOpen]);

  // Scroll to bottom on new comments
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [comments]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !currentUser) return;

    setLoading(true);
    try {
      await base44.entities.SheetComment.create({
        spreadsheet_id: spreadsheetId,
        cell_key: cellKey || 'general',
        content: newComment.trim(),
        author_name: currentUser.full_name || currentUser.email.split('@')[0],
        author_email: currentUser.email,
        resolved: false
      });
      setNewComment("");
      fetchComments();
      toast.success("תגובה נשלחה");
    } catch (e) {
      toast.error("שגיאה בשליחת תגובה");
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (commentId) => {
    try {
      await base44.entities.SheetComment.update(commentId, { resolved: true });
      fetchComments();
    } catch (e) {
      toast.error("שגיאה בעדכון");
    }
  };

  const handleDelete = async (commentId) => {
    if (!confirm("למחוק תגובה זו?")) return;
    try {
      await base44.entities.SheetComment.delete(commentId);
      fetchComments();
    } catch (e) {
      toast.error("שגיאה במחיקה");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed left-0 top-0 h-full w-80 bg-white shadow-2xl border-r border-slate-200 z-[100] flex flex-col animate-in slide-in-from-left duration-200">
      <div className="p-4 border-b bg-slate-50 flex items-center justify-between">
        <h3 className="font-bold flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-blue-600" />
          {cellKey ? `תגובות לתא ${cellTitle || ''}` : 'תגובות כלליות'}
        </h3>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
          <X className="w-4 h-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1 p-4 bg-slate-50/30">
        {comments.length === 0 ? (
          <div className="text-center text-slate-400 py-10">
            <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-20" />
            <p className="text-sm">אין תגובות עדיין.</p>
            <p className="text-xs">היה הראשון להגיב!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => (
              <div 
                key={comment.id} 
                className={`group bg-white p-3 rounded-lg shadow-sm border ${comment.resolved ? 'opacity-60 border-slate-100' : 'border-slate-200'}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="bg-blue-100 text-blue-700 text-[10px]">
                        {comment.author_name?.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-xs font-bold text-slate-800">{comment.author_name}</div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(new Date(comment.created_date), { addSuffix: true, locale: he })}
                      </div>
                    </div>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    {!comment.resolved && (
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-green-600" onClick={() => handleResolve(comment.id)} title="סמן כטופל">
                        <Check className="w-3 h-3" />
                      </Button>
                    )}
                    {(comment.author_email === currentUser?.email) && (
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400 hover:text-red-600" onClick={() => handleDelete(comment.id)} title="מחק">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="text-sm text-slate-700 whitespace-pre-wrap break-words">
                  {comment.content}
                </div>
              </div>
            ))}
            <div ref={scrollRef} />
          </div>
        )}
      </ScrollArea>

      <div className="p-4 border-t bg-white">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input 
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="כתוב תגובה..."
            className="flex-1"
            disabled={loading}
            autoFocus
          />
          <Button type="submit" size="icon" disabled={loading || !newComment.trim()} className="bg-blue-600 hover:bg-blue-700">
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}