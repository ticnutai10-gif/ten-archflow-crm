import React from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Plus, MessageSquare, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ConversationsList({ 
  conversations, 
  currentConversation, 
  onSelectConversation, 
  onNewConversation,
  onDeleteConversation 
}) {
  return (
    <div className="w-80 bg-white border-l border-slate-200 flex flex-col shadow-lg">
      {/* Header */}
      <div className="p-4 border-b border-slate-200">
        <Button 
          onClick={onNewConversation}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
        >
          <Plus className="w-5 h-5 ml-2" />
          שיחה חדשה
        </Button>
      </div>

      {/* Conversations List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {conversations.length === 0 ? (
            <div className="text-center py-12 px-4">
              <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-600">אין שיחות עדיין</p>
              <p className="text-xs text-slate-400 mt-1">צור שיחה חדשה כדי להתחיל</p>
            </div>
          ) : (
            conversations.map((conv) => {
              const isActive = currentConversation?.id === conv.id;
              const messageCount = conv.messages?.length || 0;
              const lastMessage = conv.messages?.[messageCount - 1];
              const preview = lastMessage?.content?.substring(0, 60) || 'אין הודעות';

              return (
                <div
                  key={conv.id}
                  className={cn(
                    "group relative p-3 rounded-lg cursor-pointer transition-all",
                    isActive 
                      ? "bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-300 shadow-md" 
                      : "hover:bg-slate-50 border-2 border-transparent"
                  )}
                  onClick={() => onSelectConversation(conv.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className={cn(
                          "text-sm font-semibold truncate",
                          isActive ? "text-blue-900" : "text-slate-900"
                        )}>
                          {conv.metadata?.name || 'שיחה ללא שם'}
                        </h4>
                        {messageCount > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {messageCount}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 line-clamp-2">
                        {preview}
                      </p>
                      {conv.created_date && (
                        <p className="text-xs text-slate-400 mt-1">
                          {new Date(conv.created_date).toLocaleDateString('he-IL')}
                        </p>
                      )}
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteConversation(conv.id);
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

      {/* Stats Footer */}
      <div className="p-4 border-t border-slate-200 bg-slate-50">
        <div className="text-xs text-slate-600 text-center">
          <span className="font-semibold">{conversations.length}</span> שיחות פעילות
        </div>
      </div>
    </div>
  );
}