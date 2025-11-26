import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calendar,
  Calendar as CalendarIcon,
  Plus,
  Clock,
  MapPin,
  Users,
  Video,
  Phone,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  FileText,
  Bell,
  Mail,
  Edit,
  Trash2,
  RefreshCw,
  List,
  Grid3x3,
  Loader2,
  Download,
  Upload,
  Link as LinkIcon,
  Sparkles,
  LayoutGrid,
  Rows,
  GitBranch,
  Eye,
  X
} from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, parseISO, addDays } from "date-fns";
import { he } from "date-fns/locale";
import { toast } from "sonner";
import MeetingForm from "../components/dashboard/MeetingForm";
import MeetingCard from "../components/dashboard/MeetingCard";
import CalendarSyncManager from "../components/calendar/CalendarSyncManager";
import ExportToCalendarButton from "../components/calendar/ExportToCalendarButton";
import AIWorkflowAutomation from "../components/ai/AIWorkflowAutomation";
import MobileCalendarView from "../components/mobile/MobileCalendarView";
import MeetingGridView from "../components/meetings/MeetingGridView";
import MeetingCompactView from "../components/meetings/MeetingCompactView";
import MeetingTimelineView from "../components/meetings/MeetingTimelineView";
import { useIsMobile } from "../components/utils/useMediaQuery";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";

const statusColors = {
  'מתוכננת': 'bg-blue-100 text-blue-800 border-blue-200',
  'אושרה': 'bg-green-100 text-green-800 border-green-200',
  'בוצעה': 'bg-slate-100 text-slate-800 border-slate-200',
  'בוטלה': 'bg-red-100 text-red-800 border-red-200',
  'נדחתה': 'bg-amber-100 text-amber-800 border-amber-200'
};

const typeIcons = {
  'פגישת היכרות': Users,
  'פגישת תכנון': CalendarIcon,
  'פגישת מעקב': CheckCircle,
  'פגישת סיכום': FileText,
  'פגישת אתר': MapPin,
  'שיחת טלפון': Phone,
  'Zoom': Video
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

export default function MeetingsPage() {
  const isMobile = useIsMobile();
  const [meetings, setMeetings] = useState([]);
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState(() => {
    try {
      return localStorage.getItem('meetings-view-mode') || 'month';
    } catch {
      return 'month';
    }
  });
  const [selectedDayMeetings, setSelectedDayMeetings] = useState(null);
  const [selectedDayDate, setSelectedDayDate] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isGoogleConnected, setIsGoogleConnected] = useState(true);
  const [selectedDateForNew, setSelectedDateForNew] = useState(null);
  const [showSyncManager, setShowSyncManager] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedMeetings, setSelectedMeetings] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  // שמירת תצוגה נבחרת
  useEffect(() => {
    try {
      localStorage.setItem('meetings-view-mode', viewMode);
    } catch (e) {
      console.warn('Failed to save view mode:', e);
    }
  }, [viewMode]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [meetingsData, clientsData, projectsData] = await Promise.all([
        base44.entities.Meeting.list('-meeting_date').catch(() => []),
        base44.entities.Client.list().catch(() => []),
        base44.entities.Project.list().catch(() => [])
      ]);
      
      const validMeetings = Array.isArray(meetingsData) ? meetingsData : [];
      const validClients = Array.isArray(clientsData) ? clientsData : [];
      const validProjects = Array.isArray(projectsData) ? projectsData : [];
      
      setMeetings(validMeetings);
      setClients(validClients);
      setProjects(validProjects);
    } catch (error) {
      console.error('❌ [Meetings] Error loading meetings data:', error);
      toast.error('שגיאה בטעינת הנתונים');
      setMeetings([]);
      setClients([]);
      setProjects([]);
    }
    setIsLoading(false);
  };

  const handleSubmit = async (meetingData) => {
    try {
      if (editingMeeting) {
        await base44.entities.Meeting.update(editingMeeting.id, meetingData);
        toast.success('הפגישה עודכנה בהצלחה');
      } else {
        await base44.entities.Meeting.create(meetingData);
        toast.success('הפגישה נוספה בהצלחה');
      }
      setShowForm(false);
      setEditingMeeting(null);
      setSelectedDateForNew(null);
      loadData();
    } catch (error) {
      console.error('Error saving meeting:', error);
      toast.error('שגיאה בשמירת הפגישה');
    }
  };

  const handleEdit = (meeting) => {
    setEditingMeeting(meeting);
    setShowForm(true);
  };

  const handleDelete = async (meetingId) => {
    if (confirm('האם אתה בטוח שברצונך למחוק את הפגישה?')) {
      try {
        await base44.entities.Meeting.delete(meetingId);
        toast.success('הפגישה נמחקה');
        loadData();
      } catch (error) {
        toast.error('שגיאה במחיקת הפגישה');
      }
    }
  };

  const handleStatusChange = async (meetingId, newStatus) => {
    try {
      await base44.entities.Meeting.update(meetingId, { status: newStatus });
      toast.success('הסטטוס עודכן');
      loadData();
    } catch (error) {
      toast.error('שגיאה בעדכון הסטטוס');
    }
  };

  const handleSyncAll = async () => {
    setIsSyncing(true);
    try {
      const selectedCalendar = localStorage.getItem('selected-calendar') || 'primary';
      const { data } = await base44.functions.invoke('googleCalendarSync', {
        action: 'syncAll',
        data: { calendarId: selectedCalendar }
      });
      toast.success(data.message || 'הפגישות סונכרנו בהצלחה');
      loadData();
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('שגיאה בסנכרון');
    }
    setIsSyncing(false);
  };

  const handleImportFromGoogle = async () => {
    setIsSyncing(true);
    try {
      const selectedCalendar = localStorage.getItem('selected-calendar') || 'primary';
      const now = new Date();
      const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      
      const { data } = await base44.functions.invoke('googleCalendarSync', {
        action: 'importEvents',
        data: {
          calendarId: selectedCalendar,
          timeMin: now.toISOString(),
          timeMax: nextMonth.toISOString(),
          createMeetings: true
        }
      });
      toast.success(`יובאו ${data.imported} אירועים חדשים מתוך ${data.total_events}`);
      loadData();
    } catch (error) {
      console.error('Import error:', error);
      toast.error('שגיאה בייבוא');
    }
    setIsSyncing(false);
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const dateRange = eachDayOfInterval({ start: startDate, end: endDate });

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getMeetingsForDate = (date) => {
    if (!Array.isArray(meetings)) {
      return [];
    }
    
    return meetings.filter(meeting => {
      if (!meeting || !meeting.meeting_date) return false;
      try {
        const meetingDate = parseISO(meeting.meeting_date);
        return isSameDay(meetingDate, date);
      } catch (e) {
        return false;
      }
    });
  };

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToToday = () => {
    setCurrentMonth(new Date());
    setSelectedDate(new Date());
  };

  const upcomingMeetings = useMemo(() => {
    if (!Array.isArray(meetings)) {
      return [];
    }
    
    const now = new Date();
    return meetings
      .filter(m => {
        if (!m || !m.meeting_date) return false;
        try {
          return new Date(m.meeting_date) >= now && 
                 m.status !== 'בוצעה' && 
                 m.status !== 'בוטלה';
        } catch (e) {
          return false;
        }
      })
      .slice(0, 5);
  }, [meetings]);

  const todayMeetings = useMemo(() => {
    if (!Array.isArray(meetings)) {
      return [];
    }
    
    return meetings.filter(m => {
      if (!m || !m.meeting_date) return false;
      try {
        const meetingDate = parseISO(m.meeting_date);
        return isToday(meetingDate) && m.status !== 'בוטלה';
      } catch (e) {
        return false;
      }
    });
  }, [meetings]);

  const handleDateClick = (date) => {
    const dayMeetings = getMeetingsForDate(date);
    setSelectedDate(date);
    setSelectedDayDate(date);
    setSelectedDayMeetings(dayMeetings);
  };

  const handleAddMeetingForDay = () => {
    setSelectedDateForNew(selectedDayDate);
    setEditingMeeting(null);
    setSelectedDayMeetings(null);
    setShowForm(true);
  };

  const closeDayView = () => {
    setSelectedDayMeetings(null);
    setSelectedDayDate(null);
  };

  const toggleSelection = (meetingId) => {
    setSelectedMeetings(prev =>
      prev.includes(meetingId)
        ? prev.filter(id => id !== meetingId)
        : [...prev, meetingId]
    );
  };

  const handleBulkDelete = async () => {
    if (selectedMeetings.length === 0) return;
    if (!confirm(`האם למחוק ${selectedMeetings.length} פגישות?`)) return;

    try {
      await Promise.all(selectedMeetings.map(id => base44.entities.Meeting.delete(id)));
      toast.success('הפגישות נמחקו בהצלחה');
      setSelectedMeetings([]);
      setSelectionMode(false);
      loadData();
    } catch (error) {
      toast.error('שגיאה במחיקת הפגישות');
    }
  };

  const handleBulkCopy = async () => {
    if (selectedMeetings.length === 0) return;

    try {
      const meetingsToCopy = meetings.filter(m => selectedMeetings.includes(m.id));
      await Promise.all(meetingsToCopy.map(m => {
        const { id, created_date, updated_date, created_by, google_calendar_event_id, ...rest } = m;
        return base44.entities.Meeting.create(rest);
      }));
      toast.success('הפגישות שוכפלו בהצלחה');
      setSelectedMeetings([]);
      setSelectionMode(false);
      loadData();
    } catch (error) {
      toast.error('שגיאה בשכפול הפגישות');
    }
  };

  return (
    <div className={`space-y-6 ${isMobile ? 'p-3' : 'p-6 lg:p-8'}`} dir="rtl">
      {isMobile ? (
        <>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-900">פגישות</h2>
            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Eye className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48" dir="rtl">
                  <DropdownMenuLabel>תצוגה</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setViewMode('month')} className={viewMode === 'month' ? 'bg-slate-100' : ''}>
                    <Grid3x3 className="w-4 h-4 ml-2" />
                    לוח
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setViewMode('list')} className={viewMode === 'list' ? 'bg-slate-100' : ''}>
                    <List className="w-4 h-4 ml-2" />
                    רשימה
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setViewMode('compact')} className={viewMode === 'compact' ? 'bg-slate-100' : ''}>
                    <Rows className="w-4 h-4 ml-2" />
                    קומפקטי
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setViewMode('timeline')} className={viewMode === 'timeline' ? 'bg-slate-100' : ''}>
                    <GitBranch className="w-4 h-4 ml-2" />
                    ציר זמן
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant={selectionMode ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setSelectionMode(!selectionMode);
                  setSelectedMeetings([]);
                }}
              >
                <CheckCircle className="w-4 h-4" />
              </Button>
              <Button
                onClick={() => { setEditingMeeting(null); setSelectedDateForNew(null); setShowForm(true); }}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {selectionMode && selectedMeetings.length > 0 && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg flex items-center justify-between">
              <span className="text-sm font-medium text-blue-900">
                נבחרו {selectedMeetings.length} פגישות
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleBulkCopy}
                  className="bg-white"
                >
                  <RefreshCw className="w-4 h-4 ml-1" />
                  העתק
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleBulkDelete}
                >
                  <Trash2 className="w-4 h-4 ml-1" />
                  מחק
                </Button>
              </div>
            </div>
          )}
          
          {viewMode === 'month' ? (
            <MobileCalendarView
              meetings={meetings}
              onEdit={handleEdit}
              onDateClick={handleDateClick}
            />
          ) : viewMode === 'list' ? (
            <div className="space-y-3">
              {meetings.map(meeting => (
                <div key={meeting.id} className="relative">
                  {selectionMode && (
                    <div className="absolute top-2 left-2 z-10">
                      <input
                        type="checkbox"
                        checked={selectedMeetings.includes(meeting.id)}
                        onChange={() => toggleSelection(meeting.id)}
                        className="w-5 h-5 rounded border-slate-300"
                      />
                    </div>
                  )}
                  <MeetingCard
                    meeting={meeting}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onStatusChange={handleStatusChange}
                  />
                </div>
              ))}
            </div>
          ) : viewMode === 'compact' ? (
            <MeetingCompactView
              meetings={meetings}
              onEdit={handleEdit}
            />
          ) : viewMode === 'timeline' ? (
            <MeetingTimelineView
              meetings={meetings}
              onEdit={handleEdit}
            />
          ) : null}
        </>
      ) : (
        <>
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">פגישות</h2>
          <p className="text-slate-600">ניהול וארגון פגישות</p>
        </div>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                disabled={isSyncing}
                variant="outline"
                className="gap-2"
              >
                {isSyncing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    מסנכרן...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    סנכרון Google Calendar
                  </>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" dir="rtl">
              <DropdownMenuItem onClick={handleSyncAll} className="gap-2">
                <Upload className="w-4 h-4" />
                ייצא כל הפגישות ל-Google
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleImportFromGoogle} className="gap-2">
                <Download className="w-4 h-4" />
                ייבא מ-Google Calendar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowSyncManager(true)} className="gap-2">
                <Calendar className="w-4 h-4" />
                מנהל סנכרון מתקדם
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={() => { setEditingMeeting(null); setSelectedDateForNew(null); setShowForm(true); }} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            פגישה חדשה
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">היום</p>
                <p className="text-2xl font-bold text-blue-600">{todayMeetings.length}</p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                <CalendarIcon className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">קרובות</p>
                <p className="text-2xl font-bold text-green-600">{upcomingMeetings.length}</p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                <Clock className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">החודש</p>
                <p className="text-2xl font-bold text-purple-600">
                  {meetings.filter(m => {
                    if (!m || !m.meeting_date) return false;
                    try {
                      const d = parseISO(m.meeting_date);
                      return isSameMonth(d, currentMonth);
                    } catch (e) {
                      return false;
                    }
                  }).length}
                </p>
              </div>
              <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">מסונכרנות</p>
                <p className="text-2xl font-bold text-amber-600">
                  {meetings.filter(m => m && m.google_calendar_event_id).length}
                </p>
              </div>
              <div className="h-12 w-12 bg-amber-100 rounded-full flex items-center justify-center">
                <LinkIcon className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {selectionMode && selectedMeetings.length > 0 && (
        <div className="mb-4 p-4 bg-blue-50 rounded-lg flex items-center justify-between">
          <span className="text-sm font-medium text-blue-900">
            נבחרו {selectedMeetings.length} פגישות
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleBulkCopy}
              className="bg-white"
            >
              <RefreshCw className="w-4 h-4 ml-1" />
              שכפל
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleBulkDelete}
            >
              <Trash2 className="w-4 h-4 ml-1" />
              מחק
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setSelectionMode(false);
                setSelectedMeetings([]);
              }}
            >
              <X className="w-4 h-4 ml-1" />
              בטל
            </Button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 mb-4">
        <Button 
          variant={selectionMode ? "default" : "outline"} 
          className="gap-2"
          onClick={() => {
            setSelectionMode(!selectionMode);
            setSelectedMeetings([]);
          }}
        >
          <CheckCircle className="w-4 h-4" />
          בחירה מרובה
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Eye className="w-4 h-4" />
              <span className="hidden md:inline">תצוגה</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56" dir="rtl">
            <DropdownMenuLabel>בחר תצוגה</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setViewMode('month')} className={viewMode === 'month' ? 'bg-slate-100 font-semibold' : ''}>
              <Grid3x3 className="w-4 h-4 ml-2" />
              לוח חודשי
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setViewMode('week')} className={viewMode === 'week' ? 'bg-slate-100 font-semibold' : ''}>
              <CalendarIcon className="w-4 h-4 ml-2" />
              לוח שבועי
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setViewMode('list')} className={viewMode === 'list' ? 'bg-slate-100 font-semibold' : ''}>
              <List className="w-4 h-4 ml-2" />
              רשימה מפורטת
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setViewMode('grid')} className={viewMode === 'grid' ? 'bg-slate-100 font-semibold' : ''}>
              <LayoutGrid className="w-4 h-4 ml-2" />
              כרטיסים בגריד
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setViewMode('compact')} className={viewMode === 'compact' ? 'bg-slate-100 font-semibold' : ''}>
              <Rows className="w-4 h-4 ml-2" />
              תצוגה קומפקטית
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setViewMode('timeline')} className={viewMode === 'timeline' ? 'bg-slate-100 font-semibold' : ''}>
              <GitBranch className="w-4 h-4 ml-2" />
              ציר זמן
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setViewMode('ai-summary')} className={viewMode === 'ai-summary' ? 'bg-blue-50 font-semibold text-blue-700' : ''}>
              <Sparkles className="w-4 h-4 ml-2 text-purple-600" />
              סיכום AI
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Tabs value={viewMode} onValueChange={setViewMode} className="w-full">
        <div className="flex justify-between items-center mb-4">
          <TabsList className="hidden">
            <TabsTrigger value="month" className="gap-2">
              <Grid3x3 className="w-4 h-4" />
              חודשי
            </TabsTrigger>
            <TabsTrigger value="week" className="gap-2">
              <CalendarIcon className="w-4 h-4" />
              שבועי
            </TabsTrigger>
            <TabsTrigger value="list" className="gap-2">
              <List className="w-4 h-4" />
              רשימה
            </TabsTrigger>
            <TabsTrigger value="ai-summary" className="gap-2">
              <Sparkles className="w-4 h-4" />
              סיכום AI
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goToToday}>
              היום
            </Button>
            <Button variant="ghost" size="icon" onClick={prevMonth}>
              <ChevronRight className="w-4 h-4" />
            </Button>
            <div className="min-w-[150px] text-center font-semibold">
              {format(currentMonth, 'MMMM yyyy', { locale: he })}
            </div>
            <Button variant="ghost" size="icon" onClick={nextMonth}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <TabsContent value="month" className="mt-0">
          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-7 gap-1">
                {['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'].map((day, i) => (
                  <div key={i} className="text-center text-sm font-semibold text-slate-600 p-2">
                    {day}
                  </div>
                ))}

                {dateRange.map((date, i) => {
                  const dayMeetings = getMeetingsForDate(date);
                  const isCurrentMonth = isSameMonth(date, currentMonth);
                  const isSelectedDate = isSameDay(date, selectedDate);
                  const isTodayDate = isToday(date);

                  return (
                    <button
                      key={i}
                      onClick={() => handleDateClick(date)}
                      className={`
                        min-h-[100px] p-2 rounded-lg border text-right relative transition-all group
                        ${!isCurrentMonth ? 'text-slate-300 bg-slate-50' : 'text-slate-900 hover:bg-blue-50'}
                        ${isTodayDate ? 'border-blue-500 bg-blue-50 font-bold' : 'border-slate-200'}
                        ${isSelectedDate ? 'ring-2 ring-blue-500 bg-blue-50' : ''}
                        hover:border-blue-300 hover:shadow-md cursor-pointer
                      `}
                    >
                      <div className="text-sm font-medium mb-1">
                        {format(date, 'd')}
                      </div>

                      <div className="space-y-1">
                        {dayMeetings.slice(0, 2).map((meeting, idx) => (
                          <div
                            key={idx}
                            className={`text-[10px] px-1.5 py-0.5 rounded text-white truncate ${colorClasses[meeting.color]} flex items-center justify-between gap-1 relative`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(meeting);
                            }}
                          >
                            <span className="truncate flex-1">{format(parseISO(meeting.meeting_date), 'HH:mm')} {meeting.title}</span>
                            {meeting.google_calendar_event_id && (
                              <LinkIcon className="w-2.5 h-2.5 flex-shrink-0" title="מסונכרן עם Google Calendar" />
                            )}
                            <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              {meeting.reminders?.map((reminder, idx) => (
                                <span key={idx} title={`תזכורת: ${reminder.minutes_before} דקות לפני, ${reminder.method === 'in-app' ? 'באפליקציה' : reminder.method === 'email' ? 'במייל' : 'שניהם'}`}>
                                  {reminder.method === 'in-app' || reminder.method === 'both' ? <Bell className="w-2.5 h-2.5 text-blue-300" /> : null}
                                  {reminder.method === 'email' || reminder.method === 'both' ? <Mail className="w-2.5 h-2.5 text-purple-300" /> : null}
                                </span>
                              ))}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEdit(meeting);
                                }}
                                className="hover:bg-white/20 rounded p-0.5"
                                title="ערוך"
                              >
                                <Edit className="w-2.5 h-2.5" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(meeting.id);
                                }}
                                className="hover:bg-white/20 rounded p-0.5"
                                title="מחק"
                              >
                                <Trash2 className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                        {dayMeetings.length > 2 && (
                          <div className="text-[10px] text-slate-500 px-1">
                            +{dayMeetings.length - 2} נוספות
                          </div>
                        )}
                      </div>

                      <div className="absolute bottom-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Plus className="w-4 h-4 text-blue-500" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="week" className="mt-0">
          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-7 gap-2">
                {weekDays.map((day, i) => {
                  const dayMeetings = getMeetingsForDate(day);
                  const isTodayDate = isToday(day);

                  return (
                    <div
                      key={i}
                      className={`border rounded-lg p-3 min-h-[300px] ${isTodayDate ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`}
                    >
                      <div className={`text-center mb-3 pb-2 border-b ${isTodayDate ? 'border-blue-500' : 'border-slate-200'}`}>
                        <div className="text-xs text-slate-600">{format(day, 'EEEE', { locale: he })}</div>
                        <div className={`text-lg font-bold ${isTodayDate ? 'text-blue-600' : 'text-slate-900'}`}>
                          {format(day, 'd')}
                        </div>
                      </div>

                      <div className="space-y-2">
                        {dayMeetings.map((meeting) => (
                          <div
                            key={meeting.id}
                            className={`text-xs p-2 rounded cursor-pointer hover:shadow-md transition-all ${colorClasses[meeting.color]} text-white relative`}
                            onClick={() => handleEdit(meeting)}
                          >
                            {meeting.google_calendar_event_id && (
                              <LinkIcon className="w-3 h-3 absolute top-1 left-1" title="מסונכרן עם Google Calendar" />
                            )}
                            <div className="font-semibold mb-1">{format(parseISO(meeting.meeting_date), 'HH:mm')}</div>
                            <div className="truncate">{meeting.title}</div>
                            <div className="flex gap-1 mt-2">
                              {meeting.reminders?.map((reminder, idx) => (
                                <span key={idx} title={`תזכורת: ${reminder.minutes_before} דקות לפני, ${reminder.method === 'in-app' ? 'באפליקציה' : reminder.method === 'email' ? 'במייל' : 'שניהם'}`}>
                                  {reminder.method === 'in-app' || reminder.method === 'both' ? <Bell className="w-3 h-3 text-blue-200" /> : null}
                                  {reminder.method === 'email' || reminder.method === 'both' ? <Mail className="w-3 h-3 text-purple-200" /> : null}
                                </span>
                              ))}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEdit(meeting);
                                }}
                                className="hover:bg-white/20 rounded p-1"
                                title="ערוך"
                              >
                                <Edit className="w-3 h-3" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(meeting.id);
                                }}
                                className="hover:bg-white/20 rounded p-1"
                                title="מחק"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}

                        <button
                          onClick={() => handleDateClick(day)}
                          className="w-full p-2 border-2 border-dashed border-slate-300 rounded hover:border-blue-500 hover:bg-blue-50 transition-all text-slate-400 hover:text-blue-600 text-xs"
                        >
                          <Plus className="w-4 h-4 mx-auto" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="list" className="mt-0">
          <div className="grid gap-4">
            {isLoading ? (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto" />
            </div>
            ) : meetings.length === 0 ? (
            <div className="text-center py-12">
              <CalendarIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">אין פגישות</p>
            </div>
            ) : (
            meetings.map(meeting => (
              <div key={meeting.id} className="relative">
                {selectionMode && (
                  <div className="absolute top-4 left-4 z-10">
                    <input
                      type="checkbox"
                      checked={selectedMeetings.includes(meeting.id)}
                      onChange={() => toggleSelection(meeting.id)}
                      className="w-5 h-5 rounded border-slate-300"
                    />
                  </div>
                )}
                <MeetingCard
                  meeting={meeting}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onStatusChange={handleStatusChange}
                />
              </div>
            ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="grid" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {meetings.map(meeting => (
              <div key={meeting.id} className="relative">
                {selectionMode && (
                  <div className="absolute top-3 left-3 z-10">
                    <input
                      type="checkbox"
                      checked={selectedMeetings.includes(meeting.id)}
                      onChange={() => toggleSelection(meeting.id)}
                      className="w-5 h-5 rounded border-slate-300"
                    />
                  </div>
                )}
                <MeetingGridView
                  meetings={[meeting]}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="compact" className="mt-0">
          {meetings.map(meeting => (
            <div key={meeting.id} className="relative mb-2">
              {selectionMode && (
                <div className="absolute top-3 left-3 z-10">
                  <input
                    type="checkbox"
                    checked={selectedMeetings.includes(meeting.id)}
                    onChange={() => toggleSelection(meeting.id)}
                    className="w-5 h-5 rounded border-slate-300"
                  />
                </div>
              )}
              <MeetingCompactView
                meetings={[meeting]}
                onEdit={handleEdit}
              />
            </div>
          ))}
        </TabsContent>

        <TabsContent value="timeline" className="mt-0">
          {meetings.map(meeting => (
            <div key={meeting.id} className="relative mb-2">
              {selectionMode && (
                <div className="absolute top-3 left-3 z-10">
                  <input
                    type="checkbox"
                    checked={selectedMeetings.includes(meeting.id)}
                    onChange={() => toggleSelection(meeting.id)}
                    className="w-5 h-5 rounded border-slate-300"
                  />
                </div>
              )}
              <MeetingTimelineView
                meetings={[meeting]}
                onEdit={handleEdit}
              />
            </div>
          ))}
        </TabsContent>

        <TabsContent value="ai-summary" className="mt-0">
          <AIWorkflowAutomation
            type="meeting_summary"
            context={{}}
            onActionTaken={loadData}
          />
        </TabsContent>
      </Tabs>

      {showSyncManager && (
        <CalendarSyncManager onClose={() => setShowSyncManager(false)} />
      )}
        </>
      )}

      {showForm && (
        <MeetingForm
          meeting={editingMeeting}
          clients={clients}
          projects={projects}
          initialDate={selectedDateForNew}
          onSubmit={handleSubmit}
          onCancel={() => {
            setShowForm(false);
            setEditingMeeting(null);
            setSelectedDateForNew(null);
          }}
        />
      )}
    </div>
  );
}