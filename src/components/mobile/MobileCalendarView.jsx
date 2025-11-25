import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Calendar, Clock, MapPin, Plus } from 'lucide-react';
import { format, startOfWeek, addDays, isSameDay, isToday, parseISO } from 'date-fns';
import { he } from 'date-fns/locale';

const colorClasses = {
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  red: 'bg-red-500',
  yellow: 'bg-yellow-500',
  purple: 'bg-purple-500',
  pink: 'bg-pink-500',
  orange: 'bg-orange-500'
};

const statusColors = {
  'מתוכננת': 'bg-blue-100 text-blue-800',
  'אושרה': 'bg-green-100 text-green-800',
  'בוצעה': 'bg-slate-100 text-slate-800',
  'בוטלה': 'bg-red-100 text-red-800',
  'נדחתה': 'bg-amber-100 text-amber-800'
};

export default function MobileCalendarView({ meetings = [], onEdit, onDateClick }) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const goToPrevWeek = () => {
    setSelectedDate(addDays(selectedDate, -7));
  };

  const goToNextWeek = () => {
    setSelectedDate(addDays(selectedDate, 7));
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  const getMeetingsForDate = (date) => {
    return meetings.filter(meeting => {
      if (!meeting?.meeting_date) return false;
      try {
        const meetingDate = parseISO(meeting.meeting_date);
        return isSameDay(meetingDate, date);
      } catch (e) {
        return false;
      }
    });
  };

  const selectedDayMeetings = getMeetingsForDate(selectedDate);

  return (
    <div className="space-y-3" dir="rtl">
      {/* ניווט */}
      <div className="flex items-center justify-between bg-white rounded-xl p-3 shadow-sm">
        <Button variant="ghost" size="icon" onClick={goToPrevWeek} className="h-9 w-9">
          <ChevronRight className="w-5 h-5" />
        </Button>
        
        <div className="text-center">
          <div className="font-bold text-lg text-slate-900">
            {format(selectedDate, 'MMMM yyyy', { locale: he })}
          </div>
          <Button variant="ghost" size="sm" onClick={goToToday} className="h-7 text-xs">
            היום
          </Button>
        </div>
        
        <Button variant="ghost" size="icon" onClick={goToNextWeek} className="h-9 w-9">
          <ChevronLeft className="w-5 h-5" />
        </Button>
      </div>

      {/* שבוע - תצוגה קומפקטית */}
      <div className="bg-white rounded-xl shadow-sm p-3">
        <div className="grid grid-cols-7 gap-1">
          {weekDays.map((day, i) => {
            const dayMeetings = getMeetingsForDate(day);
            const isSelectedDay = isSameDay(day, selectedDate);
            const isTodayDate = isToday(day);
            const hasMeetings = dayMeetings.length > 0;

            return (
              <button
                key={i}
                onClick={() => setSelectedDate(day)}
                className={`
                  relative p-2 rounded-lg transition-all
                  ${isSelectedDay 
                    ? 'bg-blue-500 text-white shadow-md' 
                    : isTodayDate
                    ? 'bg-blue-50 text-blue-600 border border-blue-200'
                    : 'text-slate-700 hover:bg-slate-50'
                  }
                `}
              >
                <div className="text-[10px] font-medium mb-1">
                  {format(day, 'EEE', { locale: he })}
                </div>
                <div className={`text-sm font-bold ${isSelectedDay ? 'text-white' : ''}`}>
                  {format(day, 'd')}
                </div>
                {hasMeetings && (
                  <div className={`mt-1 w-1 h-1 rounded-full mx-auto ${
                    isSelectedDay ? 'bg-white' : 'bg-blue-500'
                  }`} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* פגישות היום */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            {format(selectedDate, 'dd MMMM', { locale: he })}
            {selectedDayMeetings.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {selectedDayMeetings.length}
              </Badge>
            )}
          </h3>
          <Button
            size="sm"
            onClick={() => onDateClick?.(selectedDate)}
            className="h-8 gap-1 bg-blue-500 hover:bg-blue-600"
          >
            <Plus className="w-4 h-4" />
            פגישה
          </Button>
        </div>

        {selectedDayMeetings.length === 0 ? (
          <Card className="bg-slate-50 border-dashed">
            <CardContent className="p-6 text-center">
              <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">אין פגישות מתוכננות</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {selectedDayMeetings.map((meeting) => {
              const meetingDate = parseISO(meeting.meeting_date);
              
              return (
                <Card
                  key={meeting.id}
                  onClick={() => onEdit?.(meeting)}
                  className="bg-white shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {/* פס צבע */}
                      <div className={`w-1 h-full rounded-full ${colorClasses[meeting.color] || 'bg-blue-500'}`} />
                      
                      <div className="flex-1 min-w-0">
                        {/* כותרת */}
                        <h4 className="font-semibold text-slate-900 mb-1 truncate">
                          {meeting.title}
                        </h4>
                        
                        {/* פרטים */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-xs text-slate-600">
                            <Clock className="w-3 h-3 flex-shrink-0" />
                            <span>{format(meetingDate, 'HH:mm')}</span>
                            <Badge className={`${statusColors[meeting.status]} text-xs`}>
                              {meeting.status}
                            </Badge>
                          </div>
                          
                          {meeting.location && (
                            <div className="flex items-center gap-2 text-xs text-slate-600">
                              <MapPin className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">{meeting.location}</span>
                            </div>
                          )}
                          
                          {meeting.participants && meeting.participants.length > 0 && (
                            <div className="text-xs text-slate-500 truncate">
                              {meeting.participants.join(', ')}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}