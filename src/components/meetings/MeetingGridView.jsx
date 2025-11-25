import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, MapPin, Users, Edit, Trash2, Bell, Link as LinkIcon } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { he } from 'date-fns/locale';

const statusColors = {
  'מתוכננת': 'bg-blue-100 text-blue-800',
  'אושרה': 'bg-green-100 text-green-800',
  'בוצעה': 'bg-slate-100 text-slate-800',
  'בוטלה': 'bg-red-100 text-red-800',
  'נדחתה': 'bg-amber-100 text-amber-800'
};

const colorClasses = {
  blue: 'border-r-blue-500',
  green: 'border-r-green-500',
  red: 'border-r-red-500',
  yellow: 'border-r-yellow-500',
  purple: 'border-r-purple-500',
  pink: 'border-r-pink-500',
  orange: 'border-r-orange-500'
};

export default function MeetingGridView({ meetings, onEdit, onDelete, onToggleReminder }) {
  if (!meetings || meetings.length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <p className="text-slate-500">אין פגישות</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {meetings.map((meeting) => {
        const meetingDate = parseISO(meeting.meeting_date);
        
        return (
          <Card
            key={meeting.id}
            className={`border-r-4 ${colorClasses[meeting.color] || 'border-r-blue-500'} hover:shadow-lg transition-all`}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-slate-900 flex-1 truncate">
                  {meeting.title}
                </h3>
                {meeting.google_calendar_event_id && (
                  <LinkIcon className="w-4 h-4 text-slate-400" title="מסונכרן עם Google Calendar" />
                )}
              </div>

              <div className="space-y-2 mb-3">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Calendar className="w-4 h-4 flex-shrink-0" />
                  <span>{format(meetingDate, 'dd/MM/yyyy', { locale: he })}</span>
                </div>

                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Clock className="w-4 h-4 flex-shrink-0" />
                  <span>{format(meetingDate, 'HH:mm')}</span>
                  <Badge className={`${statusColors[meeting.status]} text-xs`}>
                    {meeting.status}
                  </Badge>
                </div>

                {meeting.location && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <MapPin className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{meeting.location}</span>
                  </div>
                )}

                {meeting.client_name && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Users className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{meeting.client_name}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onToggleReminder?.(meeting)}
                  className="flex-1"
                >
                  <Bell className={`w-4 h-4 ${meeting.reminder_enabled ? 'fill-current' : ''}`} />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit?.(meeting)}
                  className="flex-1"
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDelete?.(meeting.id)}
                  className="flex-1"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}