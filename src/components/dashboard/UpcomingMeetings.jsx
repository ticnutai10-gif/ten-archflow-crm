import React, { useState } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Calendar, Clock, MapPin, Users, Video, Phone, ExternalLink, Edit, Trash2, Bell, Mail, X, Plus } from "lucide-react";
import { format, isToday, isTomorrow } from "date-fns";
import { he } from "date-fns/locale";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import MeetingForm from "@/components/dashboard/MeetingForm";
import ExpandableCard from "./ExpandableCard";

const statusColors = {
  'מתוכננת': 'bg-blue-50 text-blue-700 border-blue-200',
  'אושרה': 'bg-green-50 text-green-700 border-green-200',
  'בוצעה': 'bg-slate-50 text-slate-600 border-slate-200',
  'בוטלה': 'bg-red-50 text-red-700 border-red-200',
  'נדחתה': 'bg-amber-50 text-amber-700 border-amber-200'
};

const typeIcons = {
  'שיחת טלפון': Phone,
  'Zoom': Video,
  'פגישת אתר': MapPin,
  'פגישת היכרות': Users,
  'פגישת תכנון': Calendar,
  'פגישת מעקב': Clock
};

const getDateLabel = (dateString) => {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    
    if (isNaN(date.getTime())) {
      console.warn('Invalid date:', dateString);
      return dateString;
    }
    
    if (isToday(date)) return 'היום';
    if (isTomorrow(date)) return 'מחר';
    
    return format(date, 'dd/MM', { locale: he });
  } catch (e) {
    console.error('Error formatting date:', dateString, e);
    return dateString;
  }
};

export default function UpcomingMeetings({ meetings, isLoading, onUpdate, clients = [] }) {
  const [editingMeeting, setEditingMeeting] = useState(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);

  const handleDelete = async (meetingId, e) => {
    e.stopPropagation();
    if (confirm('האם אתה בטוח שברצונך למחוק את הפגישה?')) {
      try {
        await base44.entities.Meeting.delete(meetingId);
        toast.success('הפגישה נמחקה');
        if (onUpdate) onUpdate();
      } catch (error) {
        toast.error('שגיאה במחיקת הפגישה');
      }
    }
  };

  const handleEdit = (meeting, e) => {
    e.stopPropagation();
    const meetingDate = new Date(meeting.meeting_date);
    const dateTimeLocal = format(meetingDate, "yyyy-MM-dd'T'HH:mm");
    
    setFormData({
      ...meeting,
      meeting_date: dateTimeLocal
    });
    setEditingMeeting(meeting);
  };

  const handleSave = async () => {
    if (!editingMeeting) return;
    
    setSaving(true);
    try {
      const updatedData = {
        ...formData,
        meeting_date: new Date(formData.meeting_date).toISOString()
      };

      await base44.entities.Meeting.update(editingMeeting.id, updatedData);
      toast.success('הפגישה עודכנה בהצלחה');
      setEditingMeeting(null);
      setFormData({});
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error saving meeting:', error);
      toast.error('שגיאה בשמירת הפגישה');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-3 h-[400px] overflow-y-auto">
        {Array(4).fill(0).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-24 bg-slate-100 rounded-xl"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!meetings || meetings.length === 0) {
    return (
      <div className="p-8 text-center h-[400px] flex items-center justify-center">
        <div>
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-indigo-50 flex items-center justify-center">
            <Calendar className="w-8 h-8 text-indigo-400" />
          </div>
          <h3 className="text-sm font-semibold text-slate-700 mb-1">אין פגישות קרובות</h3>
          <p className="text-xs text-slate-500 mb-4">הוסף פגישה ראשונה כדי להתחיל</p>
          <Link to={createPageUrl("Meetings")}>
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-sm">
              <Calendar className="w-4 h-4 mr-2" />
              הוסף פגישה
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <ExpandableCard defaultHeight="500px">
        <div className="flex flex-col">
        <div className="flex-shrink-0 px-6 pt-4 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-600" />
              <span className="text-sm font-semibold text-slate-700">
                {meetings.length} פגישות קרובות
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setShowAddDialog(true)}
                size="sm"
                className="h-8 w-8 p-0 bg-blue-600 hover:bg-blue-700 text-white shadow-md"
                title="הוסף פגישה"
              >
                <Plus className="w-4 h-4" />
              </Button>
              <Link to={createPageUrl("Meetings")}>
                <Button variant="ghost" size="sm" className="text-xs">
                  צפה בהכל →
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-3">
            {meetings.map((meeting) => {
              const TypeIcon = typeIcons[meeting.meeting_type] || Calendar;
              const meetingDate = new Date(meeting.meeting_date);
              const dateLabel = getDateLabel(meeting.meeting_date);
              const isUrgent = isToday(meetingDate) || isTomorrow(meetingDate);
              
              return (
                <div 
                  key={meeting.id} 
                  className={`
                    group relative p-4 rounded-xl border transition-all duration-200 bg-white
                    hover:shadow-lg hover:border-indigo-300 hover:-translate-y-0.5
                    ${isUrgent ? 'border-indigo-200 bg-gradient-to-br from-indigo-50/50 to-white' : 'border-slate-200'}
                  `}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        {TypeIcon && (
                          <div className={`p-1.5 rounded-lg ${isUrgent ? 'bg-indigo-100' : 'bg-slate-100'}`}>
                            <TypeIcon className={`w-4 h-4 ${isUrgent ? 'text-indigo-600' : 'text-slate-600'}`} />
                          </div>
                        )}
                        <h4 className="font-semibold text-slate-900 text-sm truncate flex-1">
                          {meeting.title}
                        </h4>
                        <Badge variant="outline" className={`${statusColors[meeting.status]} text-xs px-2 py-0.5 whitespace-nowrap flex-shrink-0`}>
                          {meeting.status}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs text-slate-600 flex-wrap">
                        {meeting.client_name && (
                          <div className="flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-slate-400" />
                            <span className="font-medium">{meeting.client_name}</span>
                          </div>
                        )}
                        <div className={`flex items-center gap-1.5 ${isUrgent ? 'text-indigo-700 font-semibold' : ''}`}>
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{dateLabel}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{format(meetingDate, 'HH:mm', { locale: he })}</span>
                        </div>
                        {meeting.location && (
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            <span className="truncate max-w-[100px]">{meeting.location}</span>
                          </div>
                        )}
                        {meeting.reminders?.length > 0 && (
                          <div className="flex gap-1 items-center">
                            {meeting.reminders.map((reminder, idx) => (
                              <span key={idx} title={`תזכורת: ${reminder.minutes_before} דקות לפני, ${reminder.method === 'in-app' ? 'באפליקציה' : reminder.method === 'email' ? 'במייל' : 'שניהם'}`}>
                                {reminder.method === 'in-app' || reminder.method === 'both' ? <Bell className="w-3.5 h-3.5 text-blue-500" /> : null}
                                {reminder.method === 'email' || reminder.method === 'both' ? <Mail className="w-3.5 h-3.5 text-purple-500" /> : null}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {meeting.description && (
                    <p className="text-xs text-slate-600 line-clamp-2 mb-3 pr-1">
                      {meeting.description}
                    </p>
                  )}

                  <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleEdit(meeting, e)}
                      className="h-8 px-3 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      title="ערוך פגישה"
                    >
                      <Edit className="w-3.5 h-3.5 ml-1.5" />
                      ערוך
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleDelete(meeting.id, e)}
                      className="h-8 px-3 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                      title="מחק פגישה"
                    >
                      <Trash2 className="w-3.5 h-3.5 ml-1.5" />
                      מחק
                    </Button>

                    {meeting.participants && meeting.participants.length > 0 && (
                      <div className="flex items-center gap-1 mr-auto">
                        <div className="flex -space-x-2">
                          {meeting.participants.slice(0, 3).map((participant, idx) => (
                            <div 
                              key={idx}
                              className="w-6 h-6 rounded-full bg-indigo-100 border-2 border-white flex items-center justify-center"
                              title={participant}
                            >
                              <span className="text-[10px] font-semibold text-indigo-700">
                                {participant.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          ))}
                        </div>
                        {meeting.participants.length > 3 && (
                          <span className="text-xs text-slate-500">+{meeting.participants.length - 3}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        <div className="flex-shrink-0 px-6 pb-4 pt-2 border-t border-slate-100">
          <Link to={createPageUrl("Meetings")}>
            <Button variant="outline" size="sm" className="w-full text-sm hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300">
              <ExternalLink className="w-4 h-4 ml-2" />
              צפה בכל הפגישות
            </Button>
          </Link>
        </div>
      </ExpandableCard>

      {editingMeeting && (
        <Dialog open={!!editingMeeting} onOpenChange={() => setEditingMeeting(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit className="w-5 h-5 text-blue-600" />
                עריכת פגישה
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>כותרת הפגישה *</Label>
                <Input
                  value={formData.title || ''}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="לדוגמה: פגישת תכנון פרויקט"
                />
              </div>

              <div className="space-y-2">
                <Label>תאריך ושעה *</Label>
                <Input
                  type="datetime-local"
                  value={formData.meeting_date || ''}
                  onChange={(e) => setFormData({ ...formData, meeting_date: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>סוג פגישה</Label>
                <Select
                  value={formData.meeting_type || ''}
                  onValueChange={(value) => setFormData({ ...formData, meeting_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="בחר סוג פגישה" />
                  </SelectTrigger>
                  <SelectContent>
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

              <div className="space-y-2">
                <Label>סטטוס</Label>
                <Select
                  value={formData.status || ''}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="בחר סטטוס" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="מתוכננת">מתוכננת</SelectItem>
                    <SelectItem value="אושרה">אושרה</SelectItem>
                    <SelectItem value="בוצעה">בוצעה</SelectItem>
                    <SelectItem value="בוטלה">בוטלה</SelectItem>
                    <SelectItem value="נדחתה">נדחתה</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>מיקום</Label>
                <Input
                  value={formData.location || ''}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="לדוגמה: משרד הלקוח, זום, טלפון"
                />
              </div>

              <div className="space-y-2">
                <Label>תיאור</Label>
                <Textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="פרטים נוספים על הפגישה..."
                  rows={4}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setEditingMeeting(null)}
                disabled={saving}
              >
                ביטול
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || !formData.title || !formData.meeting_date}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {saving ? 'שומר...' : 'שמור שינויים'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Add Meeting Dialog */}
      {showAddDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <MeetingForm
            clients={clients}
            onSubmit={async (data) => {
              await base44.entities.Meeting.create(data);
              setShowAddDialog(false);
              onUpdate && onUpdate();
            }}
            onCancel={() => setShowAddDialog(false)}
          />
        </div>
      )}
    </>
  );
}