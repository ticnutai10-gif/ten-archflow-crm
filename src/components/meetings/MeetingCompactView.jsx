import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, MapPin, Edit, ChevronLeft, Link as LinkIcon } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { he } from 'date-fns/locale';

const statusColors = {
  'מתוכננת': 'bg-blue-100 text-blue-800',
  'אושרה': 'bg-green-100 text-green-800',
  'בוצעה': 'bg-slate-100 text-slate-800',
  'בוטלה': 'bg-red-100 text-red-800',
  'נדחתה': 'bg-amber-100 text-amber-800'
};

const colorDots = {
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  red: 'bg-red-500',
  yellow: 'bg-yellow-500',
  purple: 'bg-purple-500',
  pink: 'bg-pink-500',
  orange: 'bg-orange-500'
};

export default function MeetingCompactView({ meetings, onEdit }) {
  if (!meetings || meetings.length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <p className="text-slate-500">אין פגישות</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {meetings.map((meeting) => {
        const meetingDate = parseISO(meeting.meeting_date);
        
        return (
          <div
            key={meeting.id}
            onClick={() => onEdit?.(meeting)}
            className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer group"
          >
            <div className={`w-3 h-3 rounded-full flex-shrink-0 ${colorDots[meeting.color] || 'bg-blue-500'}`} />
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-slate-900 truncate">{meeting.title}</span>
                {meeting.google_calendar_event_id && (
                  <LinkIcon className="w-3 h-3 text-slate-400 flex-shrink-0" title="מסונכרן" />
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-600">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>{format(meetingDate, 'dd/MM', { locale: he })}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{format(meetingDate, 'HH:mm')}</span>
                </div>
                {meeting.location && (
                  <div className="flex items-center gap-1 truncate">
                    <MapPin className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{meeting.location}</span>
                  </div>
                )}
              </div>
            </div>

            <Badge className={`${statusColors[meeting.status]} text-xs flex-shrink-0`}>
              {meeting.status}
            </Badge>

            <Button
              variant="ghost"
              size="icon"
              className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.(meeting);
              }}
            >
              <Edit className="w-4 h-4" />
            </Button>

            <ChevronLeft className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
          </div>
        );
      })}
    </div>
  );
}