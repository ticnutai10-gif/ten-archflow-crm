import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, MapPin, Users, Link as LinkIcon } from 'lucide-react';
import { format, parseISO, isSameDay, startOfDay } from 'date-fns';
import { he } from 'date-fns/locale';

const statusColors = {
  'מתוכננת': 'bg-blue-100 text-blue-800',
  'אושרה': 'bg-green-100 text-green-800',
  'בוצעה': 'bg-slate-100 text-slate-800',
  'בוטלה': 'bg-red-100 text-red-800',
  'נדחתה': 'bg-amber-100 text-amber-800'
};

const colorClasses = {
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  red: 'bg-red-500',
  yellow: 'bg-yellow-500',
  purple: 'bg-purple-500',
  pink: 'bg-pink-500',
  orange: 'bg-orange-500'
};

export default function MeetingTimelineView({ meetings, onEdit }) {
  if (!meetings || meetings.length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <p className="text-slate-500">אין פגישות</p>
      </div>
    );
  }

  // קיבוץ פגישות לפי תאריך
  const groupedMeetings = meetings.reduce((acc, meeting) => {
    const date = startOfDay(parseISO(meeting.meeting_date));
    const dateKey = date.getTime();
    
    if (!acc[dateKey]) {
      acc[dateKey] = {
        date,
        meetings: []
      };
    }
    
    acc[dateKey].meetings.push(meeting);
    return acc;
  }, {});

  // מיון לפי תאריך
  const sortedGroups = Object.values(groupedMeetings).sort((a, b) => 
    a.date.getTime() - b.date.getTime()
  );

  return (
    <div className="relative">
      {/* קו הטיימליין */}
      <div className="absolute right-8 top-0 bottom-0 w-0.5 bg-slate-200" />

      <div className="space-y-8">
        {sortedGroups.map(({ date, meetings: dayMeetings }) => (
          <div key={date.getTime()} className="relative">
            {/* נקודת תאריך */}
            <div className="absolute right-6 -translate-x-1/2 w-4 h-4 bg-blue-500 rounded-full border-4 border-white shadow-md z-10" />

            {/* כותרת תאריך */}
            <div className="mr-12 mb-4">
              <div className="inline-flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-full">
                <Calendar className="w-4 h-4 text-slate-600" />
                <span className="font-semibold text-slate-900">
                  {format(date, 'EEEE, dd MMMM yyyy', { locale: he })}
                </span>
                <Badge variant="secondary" className="text-xs">
                  {dayMeetings.length}
                </Badge>
              </div>
            </div>

            {/* פגישות היום */}
            <div className="mr-12 space-y-3">
              {dayMeetings
                .sort((a, b) => parseISO(a.meeting_date).getTime() - parseISO(b.meeting_date).getTime())
                .map((meeting) => {
                  const meetingDate = parseISO(meeting.meeting_date);
                  
                  return (
                    <Card
                      key={meeting.id}
                      onClick={() => onEdit?.(meeting)}
                      className="hover:shadow-md transition-all cursor-pointer"
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          {/* פס צבע */}
                          <div className={`w-1 h-full rounded-full ${colorClasses[meeting.color] || 'bg-blue-500'}`} />
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex-1">
                                <h4 className="font-semibold text-slate-900 mb-1">
                                  {meeting.title}
                                </h4>
                                <Badge className={`${statusColors[meeting.status]} text-xs`}>
                                  {meeting.status}
                                </Badge>
                              </div>
                              {meeting.google_calendar_event_id && (
                                <LinkIcon className="w-4 h-4 text-slate-400 flex-shrink-0" title="מסונכרן" />
                              )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                              <div className="flex items-center gap-2 text-slate-600">
                                <Clock className="w-4 h-4 flex-shrink-0" />
                                <span>{format(meetingDate, 'HH:mm')}</span>
                              </div>

                              {meeting.location && (
                                <div className="flex items-center gap-2 text-slate-600">
                                  <MapPin className="w-4 h-4 flex-shrink-0" />
                                  <span className="truncate">{meeting.location}</span>
                                </div>
                              )}

                              {meeting.client_name && (
                                <div className="flex items-center gap-2 text-slate-600">
                                  <Users className="w-4 h-4 flex-shrink-0" />
                                  <span className="truncate">{meeting.client_name}</span>
                                </div>
                              )}

                              {meeting.meeting_type && (
                                <div className="text-xs text-slate-500">
                                  {meeting.meeting_type}
                                </div>
                              )}
                            </div>

                            {meeting.description && (
                              <p className="text-sm text-slate-600 mt-2 line-clamp-2">
                                {meeting.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}