import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  Calendar, Clock, MapPin, Users, FileText, 
  ChevronDown, ChevronUp, Edit2, Save, X,
  Video, Phone, Building, CheckCircle2
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { format, isPast, isToday, isFuture } from 'date-fns';
import { he } from 'date-fns/locale';
import { toast } from 'sonner';

export default function ClientMeetingsSummary({ clientId, clientName }) {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedMeeting, setExpandedMeeting] = useState(null);
  const [editingNotes, setEditingNotes] = useState(null);
  const [notesText, setNotesText] = useState('');

  useEffect(() => {
    loadMeetings();
  }, [clientId]);

  const loadMeetings = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.Meeting.filter(
        { client_id: clientId },
        '-meeting_date',
        100
      );
      setMeetings(data || []);
    } catch (error) {
      console.error('Error loading meetings:', error);
    }
    setLoading(false);
  };

  const saveNotes = async (meetingId) => {
    try {
      await base44.entities.Meeting.update(meetingId, { notes: notesText });
      setMeetings(meetings.map(m => m.id === meetingId ? { ...m, notes: notesText } : m));
      setEditingNotes(null);
      toast.success('ההערות נשמרו');
    } catch (error) {
      toast.error('שגיאה בשמירת ההערות');
    }
  };

  const getMeetingTypeIcon = (type) => {
    switch (type) {
      case 'Zoom': return <Video className="w-4 h-4 text-blue-500" />;
      case 'שיחת טלפון': return <Phone className="w-4 h-4 text-green-500" />;
      case 'פגישת אתר': return <Building className="w-4 h-4 text-orange-500" />;
      default: return <Calendar className="w-4 h-4 text-purple-500" />;
    }
  };

  const getStatusBadge = (meeting) => {
    const meetingDate = new Date(meeting.meeting_date);
    
    if (meeting.status === 'בוצעה') {
      return <Badge className="bg-green-100 text-green-700">בוצעה</Badge>;
    }
    if (meeting.status === 'בוטלה') {
      return <Badge className="bg-red-100 text-red-700">בוטלה</Badge>;
    }
    if (isPast(meetingDate) && !isToday(meetingDate)) {
      return <Badge className="bg-amber-100 text-amber-700">עברה</Badge>;
    }
    if (isToday(meetingDate)) {
      return <Badge className="bg-blue-100 text-blue-700">היום</Badge>;
    }
    return <Badge className="bg-slate-100 text-slate-700">מתוכננת</Badge>;
  };

  // Group meetings
  const upcomingMeetings = meetings.filter(m => {
    const date = new Date(m.meeting_date);
    return (isFuture(date) || isToday(date)) && m.status !== 'בוטלה';
  });

  const pastMeetings = meetings.filter(m => {
    const date = new Date(m.meeting_date);
    return isPast(date) && !isToday(date);
  });

  const MeetingCard = ({ meeting }) => {
    const isExpanded = expandedMeeting === meeting.id;
    const isEditing = editingNotes === meeting.id;
    const meetingDate = new Date(meeting.meeting_date);

    return (
      <Card className={`transition-all ${isExpanded ? 'shadow-lg' : 'shadow-sm'}`}>
        <CardHeader 
          className="cursor-pointer hover:bg-slate-50 transition-colors py-3"
          onClick={() => setExpandedMeeting(isExpanded ? null : meeting.id)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getMeetingTypeIcon(meeting.meeting_type)}
              <div>
                <h4 className="font-semibold text-slate-900">{meeting.title}</h4>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Calendar className="w-3 h-3" />
                  {format(meetingDate, 'EEEE, d MMMM yyyy', { locale: he })}
                  <span>•</span>
                  <Clock className="w-3 h-3" />
                  {format(meetingDate, 'HH:mm')}
                  {meeting.duration_minutes && (
                    <>
                      <span>•</span>
                      {meeting.duration_minutes} דקות
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge(meeting)}
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </div>
          </div>
        </CardHeader>

        {isExpanded && (
          <CardContent className="pt-0 border-t">
            <div className="space-y-4 pt-4">
              {/* Meeting Details */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                {meeting.location && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <MapPin className="w-4 h-4" />
                    {meeting.location}
                  </div>
                )}
                {meeting.meeting_type && (
                  <div className="flex items-center gap-2 text-slate-600">
                    {getMeetingTypeIcon(meeting.meeting_type)}
                    {meeting.meeting_type}
                  </div>
                )}
                {meeting.participants?.length > 0 && (
                  <div className="flex items-center gap-2 text-slate-600 col-span-2">
                    <Users className="w-4 h-4" />
                    {meeting.participants.join(', ')}
                  </div>
                )}
              </div>

              {/* Description */}
              {meeting.description && (
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-700">{meeting.description}</p>
                </div>
              )}

              {/* Agenda */}
              {meeting.agenda?.length > 0 && (
                <div>
                  <h5 className="font-medium text-slate-700 mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    סדר יום
                  </h5>
                  <ul className="space-y-1">
                    {meeting.agenda.map((item, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm">
                        {item.completed ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border-2 border-slate-300" />
                        )}
                        <span className={item.completed ? 'line-through text-slate-400' : 'text-slate-700'}>
                          {item.item}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Notes Section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h5 className="font-medium text-slate-700 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    סיכום פגישה
                  </h5>
                  {!isEditing && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingNotes(meeting.id);
                        setNotesText(meeting.notes || '');
                      }}
                    >
                      <Edit2 className="w-4 h-4 ml-1" />
                      ערוך
                    </Button>
                  )}
                </div>
                
                {isEditing ? (
                  <div className="space-y-2">
                    <Textarea
                      value={notesText}
                      onChange={(e) => setNotesText(e.target.value)}
                      placeholder="הוסף סיכום פגישה, החלטות, נקודות עיקריות..."
                      rows={4}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex gap-2 justify-end">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingNotes(null);
                        }}
                      >
                        <X className="w-4 h-4 ml-1" />
                        ביטול
                      </Button>
                      <Button 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          saveNotes(meeting.id);
                        }}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Save className="w-4 h-4 ml-1" />
                        שמור
                      </Button>
                    </div>
                  </div>
                ) : meeting.notes ? (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{meeting.notes}</p>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 italic">אין סיכום פגישה</p>
                )}
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-20 bg-slate-200 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-700">{meetings.length}</div>
            <div className="text-sm text-blue-600">סה"כ פגישות</div>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-700">
              {meetings.filter(m => m.status === 'בוצעה').length}
            </div>
            <div className="text-sm text-green-600">בוצעו</div>
          </CardContent>
        </Card>
        <Card className="bg-purple-50 border-purple-200">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-700">{upcomingMeetings.length}</div>
            <div className="text-sm text-purple-600">מתוכננות</div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Meetings */}
      {upcomingMeetings.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            פגישות קרובות ({upcomingMeetings.length})
          </h3>
          <div className="space-y-3">
            {upcomingMeetings.map(meeting => (
              <MeetingCard key={meeting.id} meeting={meeting} />
            ))}
          </div>
        </div>
      )}

      {/* Past Meetings */}
      {pastMeetings.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Clock className="w-5 h-5 text-slate-500" />
            פגישות קודמות ({pastMeetings.length})
          </h3>
          <div className="space-y-3">
            {pastMeetings.slice(0, 10).map(meeting => (
              <MeetingCard key={meeting.id} meeting={meeting} />
            ))}
            {pastMeetings.length > 10 && (
              <p className="text-center text-sm text-slate-500">
                +{pastMeetings.length - 10} פגישות נוספות
              </p>
            )}
          </div>
        </div>
      )}

      {/* Empty State */}
      {meetings.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600">אין פגישות עם לקוח זה</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}