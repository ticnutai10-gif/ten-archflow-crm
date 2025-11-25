import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Calendar,
  RefreshCw,
  Upload,
  Download,
  Check,
  X,
  AlertCircle,
  Clock,
  CalendarPlus,
  ExternalLink,
  Loader2
} from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function CalendarSyncManager({ onClose }) {
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [calendars, setCalendars] = useState([]);
  const [selectedCalendar, setSelectedCalendar] = useState('primary');
  const [events, setEvents] = useState([]);
  const [syncStatus, setSyncStatus] = useState(null);
  const [autoSync, setAutoSync] = useState(() => {
    try {
      return localStorage.getItem('calendar-auto-sync') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    loadCalendars();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('calendar-auto-sync', autoSync.toString());
    } catch (e) {}
  }, [autoSync]);

  const loadCalendars = async () => {
    setLoading(true);
    try {
      const { data } = await base44.functions.invoke('googleCalendarSync', {
        action: 'listCalendars'
      });
      setCalendars(data.calendars || []);
    } catch (error) {
      console.error('Error loading calendars:', error);
      setSyncStatus({ type: 'error', message: 'שגיאה בטעינת לוחות שנה' });
    }
    setLoading(false);
  };

  const loadEvents = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      
      const { data } = await base44.functions.invoke('googleCalendarSync', {
        action: 'listEvents',
        data: {
          calendarId: selectedCalendar,
          timeMin: now.toISOString(),
          timeMax: nextMonth.toISOString()
        }
      });
      setEvents(data.events || []);
    } catch (error) {
      console.error('Error loading events:', error);
      setSyncStatus({ type: 'error', message: 'שגיאה בטעינת אירועים' });
    }
    setLoading(false);
  };

  const handleSyncAll = async () => {
    setSyncing(true);
    setSyncStatus(null);
    try {
      const { data } = await base44.functions.invoke('googleCalendarSync', {
        action: 'syncAll',
        data: { calendarId: selectedCalendar }
      });
      setSyncStatus({ 
        type: 'success', 
        message: `יוצאו ${data.exported} פגישות ל-Google Calendar` 
      });
      loadEvents();
    } catch (error) {
      console.error('Sync error:', error);
      setSyncStatus({ type: 'error', message: 'שגיאה בסנכרון' });
    }
    setSyncing(false);
  };

  const handleImportEvents = async () => {
    setSyncing(true);
    setSyncStatus(null);
    try {
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
      setSyncStatus({ 
        type: 'success', 
        message: `יובאו ${data.imported} אירועים חדשים מתוך ${data.total_events}` 
      });
    } catch (error) {
      console.error('Import error:', error);
      setSyncStatus({ type: 'error', message: 'שגיאה בייבוא' });
    }
    setSyncing(false);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            סנכרון לוח שנה
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Calendar Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">בחר לוח שנה</label>
            <Select value={selectedCalendar} onValueChange={setSelectedCalendar}>
              <SelectTrigger>
                <SelectValue placeholder="בחר לוח שנה" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="primary">לוח ראשי</SelectItem>
                {calendars.map(cal => (
                  <SelectItem key={cal.id} value={cal.id}>
                    {cal.summary}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sync Status */}
          {syncStatus && (
            <div className={`p-4 rounded-lg flex items-center gap-3 ${
              syncStatus.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}>
              {syncStatus.type === 'success' ? (
                <Check className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
              <span>{syncStatus.message}</span>
            </div>
          )}

          {/* Sync Options */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">אפשרויות סנכרון</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">סנכרון אוטומטי</div>
                  <div className="text-sm text-slate-500">
                    סנכרן אוטומטית פגישות חדשות
                  </div>
                </div>
                <Switch checked={autoSync} onCheckedChange={setAutoSync} />
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-4">
            <Button
              onClick={handleSyncAll}
              disabled={syncing}
              className="flex items-center gap-2"
            >
              {syncing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              ייצא פגישות ל-Google
            </Button>
            
            <Button
              onClick={handleImportEvents}
              disabled={syncing}
              variant="outline"
              className="flex items-center gap-2"
            >
              {syncing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              ייבא מ-Google
            </Button>
          </div>

          {/* Upcoming Events Preview */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base">אירועים קרובים ב-Google</CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={loadEvents}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </CardHeader>
            <CardContent>
              {events.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>לחץ על כפתור הרענון לטעינת אירועים</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {events.slice(0, 10).map(event => (
                    <div 
                      key={event.id}
                      className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg"
                    >
                      <CalendarPlus className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{event.summary}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {event.start?.dateTime ? 
                            new Date(event.start.dateTime).toLocaleString('he-IL', {
                              weekday: 'short',
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            }) :
                            event.start?.date
                          }
                        </div>
                      </div>
                      {event.htmlLink && (
                        <a 
                          href={event.htmlLink} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:text-blue-700"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            סגור
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}