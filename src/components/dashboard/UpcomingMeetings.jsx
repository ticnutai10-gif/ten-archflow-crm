import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Video,
  Phone,
  Building,
  Globe,
  Edit,
  Trash2,
  BellRing,
  BellOff
} from "lucide-react";
import { format, isToday, isTomorrow, isThisWeek } from "date-fns";
import { he } from "date-fns/locale";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";

const STATUS_COLORS = {
  "מתוכננת": "bg-blue-100 text-blue-800",
  "אושרה": "bg-green-100 text-green-800",
  "בוצעה": "bg-slate-100 text-slate-800",
  "בוטלה": "bg-red-100 text-red-800",
  "נדחתה": "bg-yellow-100 text-yellow-800"
};

const MEETING_ICONS = {
  "פגישת היכרות": Users,
  "פגישת תכנון": Building,
  "פגישת מעקב": Clock,
  "פגישת סיכום": Globe,
  "פגישת אתר": MapPin,
  "שיחת טלפון": Phone,
  "Zoom": Video,
  "אחר": Calendar
};

function getDateLabel(dateString) {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';

    if (isToday(date)) return 'היום';
    if (isTomorrow(date)) return 'מחר';
    if (isThisWeek(date)) return format(date, 'EEEE', { locale: he });
    return format(date, 'dd/MM/yyyy', { locale: he });
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
}

export default function UpcomingMeetings({ meetings, isLoading, onUpdate }) {
  const [editingMeeting, setEditingMeeting] = useState(null);
  const [formData, setFormData] = useState({});

  // ✅ הגנה מלאה על meetings
  const safeMeetings = React.useMemo(() => {
    if (!meetings) {
      console.warn('⚠️ [UpcomingMeetings] meetings is null/undefined');
      return [];
    }
    if (!Array.isArray(meetings)) {
      console.error('❌ [UpcomingMeetings] meetings is not an array!', meetings);
      return [];
    }
    return meetings.filter(m => m && typeof m === 'object');
  }, [meetings]);

  const handleEdit = (meeting) => {
    setEditingMeeting(meeting);
    setFormData({
      title: meeting.title || '',
      meeting_date: meeting.meeting_date ? new Date(meeting.meeting_date).toISOString().slice(0, 16) : '',
      meeting_type: meeting.meeting_type || 'פגישת תכנון',
      status: meeting.status || 'מתוכננת',
      location: meeting.location || '',
      description: meeting.description || ''
    });
  };

  const handleSave = async () => {
    if (!editingMeeting) return;
    
    try {
      await base44.entities.Meeting.update(editingMeeting.id, formData);
      setEditingMeeting(null);
      onUpdate?.();
    } catch (error) {
      console.error('Error updating meeting:', error);
    }
  };

  const handleDelete = async (meetingId) => {
    if (!confirm('למחוק את הפגישה?')) return;
    
    try {
      await base44.entities.Meeting.delete(meetingId);
      onUpdate?.();
    } catch (error) {
      console.error('Error deleting meeting:', error);
    }
  };

  const toggleReminder = async (meeting) => {
    try {
      await base44.entities.Meeting.update(meeting.id, {
        reminder_enabled: !meeting.reminder_enabled
      });
      onUpdate?.();
    } catch (error) {
      console.error('Error toggling reminder:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-24 bg-slate-200 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (safeMeetings.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500">
        <p className="mb-4">אין פגישות קרובות</p>
        <Link to={createPageUrl("Meetings")}>
          <Button variant="outline" size="sm">תזמן פגישה ראשונה</Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
        {safeMeetings.map((meeting) => {
          if (!meeting || typeof meeting !== 'object') {
            console.error('Invalid meeting:', meeting);
            return null;
          }

          const MeetingIcon = MEETING_ICONS[meeting.meeting_type] || Calendar;
          const statusColor = STATUS_COLORS[meeting.status || "מתוכננת"];
          const dateLabel = getDateLabel(meeting.meeting_date);
          const timeLabel = meeting.meeting_date ? 
            format(new Date(meeting.meeting_date), 'HH:mm', { locale: he }) : '';

          return (
            <div
              key={meeting.id}
              className="p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-all"
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <MeetingIcon className="w-5 h-5 text-blue-600" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-slate-900 truncate flex-1">
                      {meeting.title || 'פגישה ללא כותרת'}
                    </h4>
                    <Badge className={`${statusColor} text-xs flex-shrink-0 ml-2`}>
                      {meeting.status || 'מתוכננת'}
                    </Badge>
                  </div>

                  <div className="text-sm text-slate-600 space-y-1">
                    {meeting.client_name && (
                      <div className="flex items-center gap-2">
                        <Users className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{meeting.client_name}</span>
                      </div>
                    )}
                    
                    {meeting.meeting_date && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3 h-3 flex-shrink-0" />
                        <span className="font-medium">{dateLabel}</span>
                        <Clock className="w-3 h-3 flex-shrink-0 mr-2" />
                        <span>{timeLabel}</span>
                      </div>
                    )}

                    {meeting.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{meeting.location}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-1 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => toggleReminder(meeting)}
                    title={meeting.reminder_enabled ? "בטל תזכורת" : "הפעל תזכורת"}
                  >
                    {meeting.reminder_enabled ? (
                      <BellRing className="w-3 h-3 text-blue-600" />
                    ) : (
                      <BellOff className="w-3 h-3 text-slate-400" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleEdit(meeting)}
                    title="ערוך"
                  >
                    <Edit className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleDelete(meeting.id)}
                    title="מחק"
                  >
                    <Trash2 className="w-3 h-3 text-red-500" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-3 border-t">
        <Link to={createPageUrl("Meetings")} className="block">
          <Button variant="outline" size="sm" className="w-full">
            כל הפגישות →
          </Button>
        </Link>
      </div>

      {editingMeeting && (
        <Dialog open={true} onOpenChange={() => setEditingMeeting(null)}>
          <DialogContent className="sm:max-w-lg" dir="rtl">
            <DialogHeader>
              <DialogTitle>עריכת פגישה</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4" dir="rtl">
              <div>
                <label className="text-sm font-medium mb-1 block text-right">כותרת</label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="text-right"
                  dir="rtl"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block text-right">תאריך ושעה</label>
                <Input
                  type="datetime-local"
                  value={formData.meeting_date}
                  onChange={(e) => setFormData({ ...formData, meeting_date: e.target.value })}
                  className="text-right"
                  dir="rtl"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block text-right">סוג פגישה</label>
                <Select
                  value={formData.meeting_type}
                  onValueChange={(value) => setFormData({ ...formData, meeting_type: value })}
                >
                  <SelectTrigger className="text-right" dir="rtl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="פגישת היכרות">פגישת היכרות</SelectItem>
                    <SelectItem value="פגישת תכנון">פגישת תכנון</SelectItem>
                    <SelectItem value="פגישת מעקב">פגישת מעקב</SelectItem>
                    <SelectItem value="פגישת סיכום">פגישת סיכום</SelectItem>
                    <SelectItem value="פגישת אתר">פגישת אתר</SelectItem>
                    <SelectItem value="שיחת טלפון">שיחת טלפון</SelectItem>
                    <SelectItem value="Zoom">Zoom</SelectItem>
                    <SelectItem value="אחר">אחר</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block text-right">סטטוס</label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger className="text-right" dir="rtl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="מתוכננת">מתוכננת</SelectItem>
                    <SelectItem value="אושרה">אושרה</SelectItem>
                    <SelectItem value="בוצעה">בוצעה</SelectItem>
                    <SelectItem value="בוטלה">בוטלה</SelectItem>
                    <SelectItem value="נדחתה">נדחתה</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block text-right">מיקום</label>
                <Input
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="text-right"
                  dir="rtl"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block text-right">תיאור</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="text-right"
                  dir="rtl"
                />
              </div>
            </div>

            <DialogFooter className="gap-2" dir="rtl">
              <Button variant="outline" onClick={() => setEditingMeeting(null)}>
                ביטול
              </Button>
              <Button onClick={handleSave}>
                שמור
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}