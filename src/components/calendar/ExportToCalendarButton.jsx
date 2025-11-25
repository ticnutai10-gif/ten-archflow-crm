import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Calendar, Loader2, Check, ExternalLink } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function ExportToCalendarButton({ 
  meeting = null, 
  task = null,
  variant = "outline",
  size = "sm",
  showLabel = true 
}) {
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState(false);

  const handleExportToGoogle = async () => {
    setExporting(true);
    try {
      if (meeting) {
        const { data } = await base44.functions.invoke('googleCalendarSync', {
          action: 'exportMeeting',
          data: { meeting }
        });
        
        if (data.event) {
          setExported(true);
          toast.success('הפגישה נוספה ל-Google Calendar');
          setTimeout(() => setExported(false), 3000);
        }
      } else if (task) {
        const { data } = await base44.functions.invoke('googleCalendarSync', {
          action: 'exportTask',
          data: { task }
        });
        
        if (data.event) {
          setExported(true);
          toast.success('המשימה נוספה ל-Google Calendar');
          setTimeout(() => setExported(false), 3000);
        }
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('שגיאה בייצוא ללוח השנה');
    }
    setExporting(false);
  };

  const generateICSContent = () => {
    const item = meeting || task;
    if (!item) return null;

    const title = item.title;
    const description = item.description || '';
    const location = item.location || '';
    
    let startDate, endDate;
    
    if (meeting) {
      startDate = new Date(meeting.meeting_date);
      endDate = new Date(startDate.getTime() + (meeting.duration_minutes || 60) * 60000);
    } else if (task && task.due_date) {
      startDate = new Date(task.due_date);
      endDate = new Date(task.due_date);
    } else {
      return null;
    }

    const formatDate = (date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Tanenbaum CRM//NONSGML v1.0//EN',
      'BEGIN:VEVENT',
      `UID:${Date.now()}@tanenbaum-crm`,
      `DTSTAMP:${formatDate(new Date())}`,
      `DTSTART:${formatDate(startDate)}`,
      `DTEND:${formatDate(endDate)}`,
      `SUMMARY:${title}`,
      `DESCRIPTION:${description.replace(/\n/g, '\\n')}`,
      `LOCATION:${location}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    return icsContent;
  };

  const handleDownloadICS = () => {
    const icsContent = generateICSContent();
    if (!icsContent) {
      toast.error('לא ניתן ליצור קובץ יומן');
      return;
    }

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(meeting?.title || task?.title || 'event').replace(/\s+/g, '_')}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('הקובץ הורד בהצלחה');
  };

  const item = meeting || task;
  const hasGoogleId = meeting?.google_calendar_event_id;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant={variant} 
          size={size}
          disabled={exporting}
          className="gap-2"
        >
          {exporting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : exported ? (
            <Check className="w-4 h-4 text-green-500" />
          ) : (
            <Calendar className="w-4 h-4" />
          )}
          {showLabel && (
            <span>{hasGoogleId ? 'מסונכרן' : 'הוסף ללוח שנה'}</span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" dir="rtl">
        <DropdownMenuItem onClick={handleExportToGoogle}>
          <img 
            src="https://www.google.com/favicon.ico" 
            className="w-4 h-4 ml-2" 
            alt="Google"
          />
          {hasGoogleId ? 'עדכן ב-Google Calendar' : 'הוסף ל-Google Calendar'}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleDownloadICS}>
          <Calendar className="w-4 h-4 ml-2" />
          הורד קובץ ICS (Outlook/Apple)
        </DropdownMenuItem>
        {hasGoogleId && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <a 
                href={`https://calendar.google.com/calendar/event?eid=${btoa(hasGoogleId)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center"
              >
                <ExternalLink className="w-4 h-4 ml-2" />
                פתח ב-Google Calendar
              </a>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}