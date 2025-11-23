import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, Clock, MapPin, Users, Video, Plus, Edit, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function MeetingScheduler({ clients, meetings, onUpdate, isLoading }) {
  const [showForm, setShowForm] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState(null);
  const [formData, setFormData] = useState({
    client_id: "",
    client_name: "",
    meeting_date: "",
    meeting_time: "",
    duration_minutes: 60,
    location: "",
    type: "פגישה פיזית",
    status: "מתוכננת",
    agenda: "",
    notes: ""
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.client_id || !formData.meeting_date) {
      alert('יש למלא לקוח ותאריך');
      return;
    }

    try {
      const client = clients.find(c => c.id === formData.client_id);
      const meetingData = {
        ...formData,
        client_name: client?.name || formData.client_name
      };

      if (editingMeeting) {
        await base44.entities.Meeting.update(editingMeeting.id, meetingData);
      } else {
        await base44.entities.Meeting.create(meetingData);
        
        // Send notification email to client
        if (client?.email) {
          const emailBody = `שלום ${client.name},

נקבעה פגישה:
תאריך: ${formData.meeting_date}
${formData.meeting_time ? `שעה: ${formData.meeting_time}` : ''}
${formData.location ? `מקום: ${formData.location}` : ''}
${formData.agenda ? `\nנושא: ${formData.agenda}` : ''}

נשמח לראותך!`;

          await base44.integrations.Core.SendEmail({
            to: client.email,
            subject: 'אישור פגישה',
            body: emailBody
          }).catch(err => console.error('Email failed:', err));
        }
      }

      setShowForm(false);
      setEditingMeeting(null);
      setFormData({
        client_id: "",
        client_name: "",
        meeting_date: "",
        meeting_time: "",
        duration_minutes: 60,
        location: "",
        type: "פגישה פיזית",
        status: "מתוכננת",
        agenda: "",
        notes: ""
      });
      
      onUpdate();
    } catch (error) {
      console.error('Error saving meeting:', error);
      alert('שגיאה בשמירת הפגישה');
    }
  };

  const handleEdit = (meeting) => {
    setEditingMeeting(meeting);
    setFormData(meeting);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('למחוק את הפגישה?')) return;
    
    try {
      await base44.entities.Meeting.delete(id);
      onUpdate();
    } catch (error) {
      console.error('Error deleting meeting:', error);
      alert('שגיאה במחיקת הפגישה');
    }
  };

  const upcomingMeetings = meetings
    .filter(m => {
      if (!m.meeting_date) return false;
      const meetingDate = new Date(m.meeting_date);
      return meetingDate >= new Date();
    })
    .sort((a, b) => new Date(a.meeting_date) - new Date(b.meeting_date));

  const pastMeetings = meetings
    .filter(m => {
      if (!m.meeting_date) return false;
      const meetingDate = new Date(m.meeting_date);
      return meetingDate < new Date();
    })
    .sort((a, b) => new Date(b.meeting_date) - new Date(a.meeting_date));

  const statusColors = {
    "מתוכננת": "bg-blue-100 text-blue-800",
    "אושרה": "bg-green-100 text-green-800",
    "בוטלה": "bg-red-100 text-red-800",
    "הושלמה": "bg-slate-100 text-slate-800"
  };

  const MeetingCard = ({ meeting }) => (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-slate-900 text-lg">{meeting.client_name}</h3>
          <Badge className={statusColors[meeting.status] || "bg-slate-100"}>
            {meeting.status}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => handleEdit(meeting)}>
            <Edit className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleDelete(meeting.id)} className="text-red-600">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2 text-slate-600">
          <CalendarIcon className="w-4 h-4" />
          {format(new Date(meeting.meeting_date), 'dd MMMM yyyy', { locale: he })}
        </div>
        
        {meeting.meeting_time && (
          <div className="flex items-center gap-2 text-slate-600">
            <Clock className="w-4 h-4" />
            {meeting.meeting_time}
            {meeting.duration_minutes && ` (${meeting.duration_minutes} דקות)`}
          </div>
        )}

        {meeting.location && (
          <div className="flex items-center gap-2 text-slate-600">
            {meeting.type === 'שיחת וידאו' ? <Video className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
            {meeting.location}
          </div>
        )}

        {meeting.agenda && (
          <p className="text-slate-700 mt-2 pt-2 border-t">{meeting.agenda}</p>
        )}
      </div>
    </Card>
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-900">פגישות</h2>
        <Button onClick={() => setShowForm(true)} className="bg-purple-600 hover:bg-purple-700 gap-2">
          <Plus className="w-4 h-4" />
          פגישה חדשה
        </Button>
      </div>

      {/* Upcoming Meetings */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">פגישות קרובות ({upcomingMeetings.length})</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {upcomingMeetings.length === 0 ? (
            <p className="text-slate-400 col-span-2 text-center py-8">אין פגישות קרובות</p>
          ) : (
            upcomingMeetings.map(meeting => <MeetingCard key={meeting.id} meeting={meeting} />)
          )}
        </div>
      </div>

      {/* Past Meetings */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">פגישות קודמות ({pastMeetings.length})</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
          {pastMeetings.length === 0 ? (
            <p className="text-slate-400 col-span-2 text-center py-8">אין פגישות קודמות</p>
          ) : (
            pastMeetings.slice(0, 10).map(meeting => <MeetingCard key={meeting.id} meeting={meeting} />)
          )}
        </div>
      </div>

      {/* Meeting Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingMeeting ? 'עריכת פגישה' : 'פגישה חדשה'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">לקוח *</label>
              <Select 
                value={formData.client_id} 
                onValueChange={(value) => setFormData({...formData, client_id: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="בחר לקוח" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(client => (
                    <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">תאריך *</label>
                <Input
                  type="date"
                  value={formData.meeting_date}
                  onChange={(e) => setFormData({...formData, meeting_date: e.target.value})}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">שעה</label>
                <Input
                  type="time"
                  value={formData.meeting_time}
                  onChange={(e) => setFormData({...formData, meeting_time: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">משך (דקות)</label>
                <Input
                  type="number"
                  value={formData.duration_minutes}
                  onChange={(e) => setFormData({...formData, duration_minutes: parseInt(e.target.value)})}
                  min="15"
                  step="15"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">סוג פגישה</label>
                <Select 
                  value={formData.type} 
                  onValueChange={(value) => setFormData({...formData, type: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="פגישה פיזית">פגישה פיזית</SelectItem>
                    <SelectItem value="שיחת טלפון">שיחת טלפון</SelectItem>
                    <SelectItem value="שיחת וידאו">שיחת וידאו</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">מיקום / קישור</label>
              <Input
                value={formData.location}
                onChange={(e) => setFormData({...formData, location: e.target.value})}
                placeholder="כתובת או קישור לשיחה"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">סטטוס</label>
              <Select 
                value={formData.status} 
                onValueChange={(value) => setFormData({...formData, status: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="מתוכננת">מתוכננת</SelectItem>
                  <SelectItem value="אושרה">אושרה</SelectItem>
                  <SelectItem value="בוטלה">בוטלה</SelectItem>
                  <SelectItem value="הושלמה">הושלמה</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">נושא</label>
              <Input
                value={formData.agenda}
                onChange={(e) => setFormData({...formData, agenda: e.target.value})}
                placeholder="נושא הפגישה"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">הערות</label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                rows={3}
                placeholder="הערות נוספות"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                ביטול
              </Button>
              <Button type="submit" className="bg-purple-600 hover:bg-purple-700">
                {editingMeeting ? 'עדכן' : 'צור פגישה'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}