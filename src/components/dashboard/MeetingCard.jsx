import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Pencil,
  LinkIcon,
  CalendarIcon,
  Circle,
  ArrowUpCircle,
  CheckCircle2,
  Trash2,
  Calendar,
  Users,
  Clock,
  MapPin,
  Phone,
  Video,
  Bell,
  Mail
} from "lucide-react";
import { format } from "date-fns";

const statusColors = {
  'מתוכננת': 'bg-blue-100 text-blue-800 border-blue-200',
  'אושרה': 'bg-green-100 text-green-800 border-green-200',
  'בוצעה': 'bg-slate-100 text-slate-800 border-slate-200',
  'בוטלה': 'bg-red-100 text-red-800 border-red-200',
  'נדחתה': 'bg-amber-100 text-amber-800 border-amber-200'
};

const typeIcons = {
  'שיחת טלפון': Phone,
  'Zoom': Video,
  'פגישת אתר': MapPin,
  'פגישת היכרות': Users,
  'פגישת תכנון': Calendar,
  'פגישת מעקב': Clock
};

export default function MeetingCard({ meeting, onEdit, onDelete, onStatusChange }) {
  const TypeIcon = typeIcons[meeting.meeting_type] || Calendar;
  const meetingDate = new Date(meeting.meeting_date);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Card className="bg-white/80 backdrop-blur-sm hover:shadow-lg transition-all duration-300">
        <CardHeader className="pb-3">
          <div className="flex items-start gap-3">
            {/* אייקון לפי סוג פגישה */}
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
              meeting.status === 'מתוכננת' || meeting.status === 'אושרה'
                ? 'bg-blue-100' 
                : meeting.status === 'בוצעה'
                ? 'bg-green-100'
                : 'bg-slate-100'
            }`}>
              <TypeIcon className={`w-6 h-6 ${
                meeting.status === 'מתוכננת' || meeting.status === 'אושרה'
                  ? 'text-blue-600' 
                  : meeting.status === 'בוצעה'
                  ? 'text-green-600'
                  : 'text-slate-600'
              }`} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <CardTitle className="text-base font-bold text-slate-900 truncate">
                  {meeting.title}
                </CardTitle>
                {meeting.google_calendar_event_id && (
                  <LinkIcon className="w-4 h-4 text-amber-500 flex-shrink-0" title="מסונכרן עם Google Calendar" />
                )}
              </div>
              <div className="flex gap-2 flex-wrap">
                <Badge className={statusColors[meeting.status] || 'bg-slate-100 text-slate-800'}>
                  {meeting.status}
                </Badge>
                {meeting.meeting_date && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <CalendarIcon className="w-3 h-3" />
                    {format(meetingDate, 'dd/MM HH:mm')}
                  </Badge>
                )}
                {meeting.client_name && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {meeting.client_name}
                  </Badge>
                )}
                {meeting.reminders?.length > 0 && (
                  <div className="flex gap-1 items-center">
                    {meeting.reminders.map((reminder, idx) => (
                      <span key={idx} title={`תזכורת: ${reminder.minutes_before} דקות לפני, ${reminder.method === 'in-app' ? 'באפליקציה' : reminder.method === 'email' ? 'במייל' : 'שניהם'}`}>
                        {reminder.method === 'in-app' || reminder.method === 'both' ? <Bell className="w-3 h-3 text-blue-500" /> : null}
                        {reminder.method === 'email' || reminder.method === 'both' ? <Mail className="w-3 h-3 text-purple-500" /> : null}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex gap-1 flex-shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => { e.stopPropagation(); onEdit(meeting); }}
                className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                title="ערוך"
              >
                <Pencil className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => { e.stopPropagation(); onDelete(meeting.id); }}
                className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                title="מחק"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        {meeting.description && (
          <CardContent className="pt-0">
            <p className="text-slate-600 text-sm">{meeting.description}</p>
          </CardContent>
        )}
      </Card>
    </motion.div>
  );
}