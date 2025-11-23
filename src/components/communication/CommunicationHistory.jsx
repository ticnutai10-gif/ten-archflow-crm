import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, MessageSquare, Calendar, Paperclip, Search } from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";

export default function CommunicationHistory({ clients, messages, meetings, isLoading }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterClient, setFilterClient] = useState("all");

  // Combine messages and meetings into a unified timeline
  const timelineItems = [
    ...messages.map(m => ({
      type: 'message',
      date: new Date(m.created_date),
      data: m
    })),
    ...meetings.map(m => ({
      type: 'meeting',
      date: new Date(m.meeting_date || m.created_date),
      data: m
    }))
  ].sort((a, b) => b.date - a.date);

  // Filter timeline
  const filteredTimeline = timelineItems.filter(item => {
    const matchesSearch = 
      item.data.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.data.body?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.data.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.data.agenda?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = filterType === "all" || 
      (filterType === "message" && item.type === "message") ||
      (filterType === "meeting" && item.type === "meeting");

    const matchesClient = filterClient === "all" || 
      item.data.client_name === filterClient;

    return matchesSearch && matchesType && matchesClient;
  });

  const MessageItem = ({ message }) => (
    <Card className="p-4">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          {message.type === 'email' ? (
            <Mail className="w-4 h-4 text-blue-600" />
          ) : (
            <MessageSquare className="w-4 h-4 text-green-600" />
          )}
          <span className="font-semibold text-slate-900">{message.client_name}</span>
          <Badge className={message.direction === 'out' ? 'bg-blue-600' : 'bg-green-600'}>
            {message.direction === 'out' ? 'נשלח' : 'התקבל'}
          </Badge>
        </div>
        <span className="text-xs text-slate-500">
          {format(new Date(message.created_date), 'dd/MM/yyyy HH:mm', { locale: he })}
        </span>
      </div>

      {message.subject && (
        <div className="font-semibold text-slate-800 mb-1">{message.subject}</div>
      )}
      
      <p className="text-slate-600 text-sm whitespace-pre-wrap line-clamp-3">
        {message.body}
      </p>

      {message.attachments?.length > 0 && (
        <div className="mt-2 flex items-center gap-2 text-xs text-blue-600">
          <Paperclip className="w-3 h-3" />
          {message.attachments.length} קבצים מצורפים
        </div>
      )}
    </Card>
  );

  const MeetingItem = ({ meeting }) => (
    <Card className="p-4 bg-purple-50">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-purple-600" />
          <span className="font-semibold text-slate-900">{meeting.client_name}</span>
          <Badge className="bg-purple-600">פגישה</Badge>
        </div>
        <span className="text-xs text-slate-500">
          {format(new Date(meeting.meeting_date || meeting.created_date), 'dd/MM/yyyy HH:mm', { locale: he })}
        </span>
      </div>

      <div className="text-slate-800 font-medium mb-1">
        {meeting.agenda || 'פגישה עם לקוח'}
      </div>

      <div className="text-sm text-slate-600">
        {meeting.type} • {meeting.status}
        {meeting.location && ` • ${meeting.location}`}
      </div>

      {meeting.notes && (
        <p className="text-sm text-slate-600 mt-2 line-clamp-2">{meeting.notes}</p>
      )}
    </Card>
  );

  return (
    <div>
      {/* Filters */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="חיפוש..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pr-10"
          />
        </div>

        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger>
            <SelectValue placeholder="סוג" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל הסוגים</SelectItem>
            <SelectItem value="message">הודעות</SelectItem>
            <SelectItem value="meeting">פגישות</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterClient} onValueChange={setFilterClient}>
          <SelectTrigger>
            <SelectValue placeholder="לקוח" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל הלקוחות</SelectItem>
            {clients.map(client => (
              <SelectItem key={client.id} value={client.name}>{client.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Timeline */}
      <div className="space-y-3 max-h-[700px] overflow-y-auto">
        {filteredTimeline.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-slate-400">אין תוצאות להצגה</p>
          </Card>
        ) : (
          filteredTimeline.map((item, idx) => (
            <div key={idx}>
              {item.type === 'message' ? (
                <MessageItem message={item.data} />
              ) : (
                <MeetingItem meeting={item.data} />
              )}
            </div>
          ))
        )}
      </div>

      <div className="mt-4 text-sm text-slate-600 text-center">
        מציג {filteredTimeline.length} פריטים מתוך {timelineItems.length}
      </div>
    </div>
  );
}