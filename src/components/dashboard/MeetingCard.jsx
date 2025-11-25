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
  Video
} from "lucide-react";
import { format } from "date-fns";

// Define new status icons for the dropdown
const statusIcons = {
  'todo': <Circle className="w-4 h-4 text-gray-400" />,
  'in_progress': <ArrowUpCircle className="w-4 h-4 text-blue-500" />,
  'done': <CheckCircle2 className="w-4 h-4 text-green-500" />,
};

// Define color mappings for priority badges
const priorityColors = {
  'Low': 'bg-green-100 text-green-800 border-green-200',
  'Medium': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'High': 'bg-red-100 text-red-800 border-red-200',
  // Default fallback if priority isn't matched
  '': 'bg-gray-100 text-gray-800 border-gray-200',
};

// Define color mappings for category badges
const categoryColors = {
  'Work': 'bg-purple-100 text-purple-800 border-purple-200',
  'Personal': 'bg-blue-100 text-blue-800 border-blue-200',
  'Study': 'bg-orange-100 text-orange-800 border-orange-200',
  // Default fallback if category isn't matched
  '': 'bg-gray-100 text-gray-800 border-gray-200',
};


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

export default function MeetingCard({ meeting, onEdit, onDelete, onStatusChange, onToggleReminder }) {
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