import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  MessageCircleMore, 
  Users, 
  Calendar, 
  ExternalLink,
  Plus,
  Loader2,
  MessageSquare,
  Clock,
  CheckCheck
} from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import { toast } from "sonner";

export default function ClientChatRooms({ clientId, clientName }) {
  const [chatRooms, setChatRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadChatRooms();
    loadUser();
  }, [clientId]);

  const loadUser = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const loadChatRooms = async () => {
    setLoading(true);
    try {
      const rooms = await base44.entities.ChatRoom.filter(
        { 
          client_id: clientId,
          active: true
        },
        '-last_message_at',
        100
      );
      setChatRooms(rooms);
    } catch (error) {
      console.error('Error loading chat rooms:', error);
      toast.error('שגיאה בטעינת חדרי צ\'אט');
    } finally {
      setLoading(false);
    }
  };

  const getUnreadCount = (room) => {
    if (!user || !room.unread_count) return 0;
    return room.unread_count[user.email] || 0;
  };

  if (loading) {
    return (
      <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircleMore className="w-5 h-5 text-blue-600" />
            חדרי צ'אט
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
      <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageCircleMore className="w-5 h-5 text-blue-600" />
            חדרי צ'אט ({chatRooms.length})
          </CardTitle>
          <Link to={createPageUrl("TeamChat")}>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 ml-1" />
              חדר חדש
            </Button>
          </Link>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        {chatRooms.length === 0 ? (
          <div className="text-center py-12">
            <MessageCircleMore className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-600 mb-2">
              אין חדרי צ'אט ללקוח זה
            </h3>
            <p className="text-sm text-slate-500 mb-6">
              צור חדר צ'אט חדש כדי לתקשר עם הצוות על {clientName}
            </p>
            <Link to={createPageUrl("TeamChat")}>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 ml-2" />
                צור חדר ראשון
              </Button>
            </Link>
          </div>
        ) : (
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-4">
              {chatRooms.map((room) => {
                const unreadCount = getUnreadCount(room);
                
                return (
                  <Card 
                    key={room.id} 
                    className="hover:shadow-md transition-all border-2 border-transparent hover:border-blue-200 bg-white"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          {/* Header */}
                          <div className="flex items-start gap-3 mb-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                              <MessageSquare className="w-5 h-5 text-blue-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-slate-900 mb-1 text-lg">
                                {room.name}
                              </h3>
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                  {room.type === 'client' ? 'לקוח' : 
                                   room.type === 'project' ? 'פרויקט' : 
                                   room.type === 'direct' ? 'ישיר' : 'נושא'}
                                </Badge>
                                {unreadCount > 0 && (
                                  <Badge className="bg-red-500 text-white">
                                    {unreadCount} הודעות חדשות
                                  </Badge>
                                )}
                                {room.archived && (
                                  <Badge variant="outline" className="bg-slate-100 text-slate-600">
                                    בארכיון
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Topic */}
                          {room.topic && (
                            <div className="mb-3 p-3 bg-slate-50 rounded-lg">
                              <p className="text-sm text-slate-700">
                                💬 {room.topic}
                              </p>
                            </div>
                          )}

                          {/* Last Message Preview */}
                          {room.last_message_preview && (
                            <div className="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                              <div className="flex items-center gap-2 mb-1">
                                <MessageSquare className="w-3 h-3 text-blue-600" />
                                <span className="text-xs font-semibold text-blue-900">הודעה אחרונה:</span>
                              </div>
                              <p className="text-sm text-slate-700 line-clamp-2">
                                {room.last_message_preview}
                              </p>
                            </div>
                          )}

                          {/* Metadata */}
                          <div className="flex items-center gap-4 text-xs text-slate-500">
                            {room.participants && (
                              <div className="flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                <span>{room.participants.length} משתתפים</span>
                              </div>
                            )}
                            {room.last_message_at && (
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>
                                  {format(new Date(room.last_message_at), 'dd/MM/yyyy HH:mm', { locale: he })}
                                </span>
                              </div>
                            )}
                            {room.created_date && (
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                <span>
                                  נוצר: {format(new Date(room.created_date), 'dd/MM/yyyy', { locale: he })}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Participants List */}
                          {room.participants && room.participants.length > 0 && (
                            <div className="mt-3">
                              <div className="text-xs font-semibold text-slate-600 mb-2">משתתפים:</div>
                              <div className="flex flex-wrap gap-1">
                                {room.participants.slice(0, 5).map((email, idx) => (
                                  <Badge 
                                    key={idx} 
                                    variant="outline" 
                                    className="text-xs bg-slate-50"
                                  >
                                    {email.split('@')[0]}
                                  </Badge>
                                ))}
                                {room.participants.length > 5 && (
                                  <Badge variant="outline" className="text-xs bg-slate-100">
                                    +{room.participants.length - 5} נוספים
                                  </Badge>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Action Button */}
                        <Link to={createPageUrl("TeamChat")}>
                          <Button 
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 flex-shrink-0"
                          >
                            <ExternalLink className="w-4 h-4 ml-1" />
                            פתח
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}