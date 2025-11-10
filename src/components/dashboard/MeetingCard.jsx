
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


export default function MeetingCard({ meeting, onEdit, onDelete, onStatusChange, onToggleReminder }) {
  // The 'compact' prop and its conditional rendering have been removed as per the outline.
  // Original meetingDate, TypeIcon, statusColors, typeIcons are no longer used.

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Card className="bg-white/80 backdrop-blur-sm hover:shadow-lg transition-all duration-300">
        <CardHeader className="flex flex-row items-start justify-between">
          <div className="flex items-start gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="mt-1 hover:opacity-70 transition-opacity">
                  {/* Render icon based on meeting status, default to 'todo' if status is unknown */}
                  {statusIcons[meeting.status] || statusIcons['todo']}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" dir="rtl"> {/* Added dir="rtl" for Hebrew context */}
                <DropdownMenuItem onClick={() => onStatusChange(meeting, "todo")}>
                  <Circle className="w-4 h-4 ml-2 text-gray-400" />
                  סמן כמתוכנן
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onStatusChange(meeting, "in_progress")}>
                  <ArrowUpCircle className="w-4 h-4 ml-2 text-blue-500" />
                  סמן כבתהליך
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onStatusChange(meeting, "done")}>
                  <CheckCircle2 className="w-4 h-4 ml-2 text-green-500" />
                  סמן כבוצע
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className={meeting.status === 'done' ? 'line-through text-gray-500' : ''}>
                  {meeting.title}
                </CardTitle>
                {meeting.google_calendar_event_id && (
                  <LinkIcon className="w-4 h-4 text-amber-500" title="מסונכרן עם Google Calendar" />
                )}
              </div>
              <div className="flex gap-2 mt-2 flex-wrap">
                {/* Render priority badge, falling back to an empty string key if not found */}
                <Badge className={priorityColors[meeting.priority] || priorityColors['']}>
                  {meeting.priority} Priority
                </Badge>
                {meeting.status === 'in_progress' && (
                  <Badge className="bg-blue-100 text-blue-800">בתהליך</Badge>
                )}
                {/* Render category badge, falling back to an empty string key if not found */}
                <Badge className={categoryColors[meeting.category] || categoryColors['']}>
                  {meeting.category}
                </Badge>
                {meeting.due_date && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <CalendarIcon className="w-3 h-3" />
                    {format(new Date(meeting.due_date), 'MMM d')}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(meeting)}
            className="text-gray-400 hover:text-gray-600"
          >
            <Pencil className="w-4 h-4" />
          </Button>
        </CardHeader>
        {meeting.description && (
          <CardContent className="pt-0"> {/* Added pt-0 to align with CardHeader */}
            <p className="text-gray-600">{meeting.description}</p>
          </CardContent>
        )}
      </Card>
    </motion.div>
  );
}
