import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Calendar,
  CheckCircle,
  MessageSquare,
  FileText,
  Clock,
  User,
  Briefcase,
  DollarSign,
  Phone,
  Mail,
  AlertCircle,
  TrendingUp,
  Users
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { he } from "date-fns/locale";
import { base44 } from "@/api/base44Client";

const iconColor = "#2C3A50";

// Event type configurations
const eventTypeConfig = {
  client_created: {
    icon: Users,
    label: "לקוח נוצר",
    color: "bg-green-100 text-green-800 border-green-200"
  },
  project_created: {
    icon: Briefcase,
    label: "פרויקט חדש",
    color: "bg-blue-100 text-blue-800 border-blue-200"
  },
  meeting: {
    icon: Calendar,
    label: "פגישה",
    color: "bg-purple-100 text-purple-800 border-purple-200"
  },
  task_created: {
    icon: CheckCircle,
    label: "משימה נוצרה",
    color: "bg-amber-100 text-amber-800 border-amber-200"
  },
  task_completed: {
    icon: CheckCircle,
    label: "משימה הושלמה",
    color: "bg-green-100 text-green-800 border-green-200"
  },
  communication: {
    icon: MessageSquare,
    label: "תקשורת",
    color: "bg-indigo-100 text-indigo-800 border-indigo-200"
  },
  quote: {
    icon: DollarSign,
    label: "הצעת מחיר",
    color: "bg-emerald-100 text-emerald-800 border-emerald-200"
  },
  invoice: {
    icon: FileText,
    label: "חשבונית",
    color: "bg-slate-100 text-slate-800 border-slate-200"
  },
  feedback: {
    icon: MessageSquare,
    label: "פידבק",
    color: "bg-pink-100 text-pink-800 border-pink-200"
  },
  approval: {
    icon: CheckCircle,
    label: "אישור",
    color: "bg-teal-100 text-teal-800 border-teal-200"
  },
  note: {
    icon: FileText,
    label: "הערה",
    color: "bg-gray-100 text-gray-800 border-gray-200"
  }
};

export default function ClientTimeline({ clientId, clientName }) {
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTimeline();
  }, [clientId]);

  const loadTimeline = async () => {
    setIsLoading(true);
    try {
      // Fetch all relevant data for this client
      const [projects, tasks, meetings, quotes, invoices, communications, feedbacks, approvals] = await Promise.all([
        base44.entities.Project.filter({ client_id: clientId }, '-created_date', 100).catch(() => []),
        base44.entities.Task.filter({ client_id: clientId }, '-created_date', 100).catch(() => []),
        base44.entities.Meeting.filter({ client_id: clientId }, '-created_date', 100).catch(() => []),
        base44.entities.Quote.filter({ client_id: clientId }, '-created_date', 100).catch(() => []),
        base44.entities.Invoice.filter({ client_id: clientId }, '-created_date', 100).catch(() => []),
        base44.entities.CommunicationMessage.filter({ client_id: clientId }, '-created_date', 100).catch(() => []),
        base44.entities.ClientFeedback.filter({ client_id: clientId }, '-created_date', 100).catch(() => []),
        base44.entities.ClientApproval.filter({ client_id: clientId }, '-created_date', 100).catch(() => [])
      ]);

      // Convert all to timeline events
      const timelineEvents = [];

      // Projects
      projects.forEach(project => {
        timelineEvents.push({
          id: `project_${project.id}`,
          type: 'project_created',
          title: `פרויקט נוצר: ${project.name}`,
          description: project.description || '',
          date: project.created_date,
          metadata: {
            status: project.status,
            budget: project.budget
          }
        });
      });

      // Tasks
      tasks.forEach(task => {
        timelineEvents.push({
          id: `task_${task.id}`,
          type: task.status === 'הושלמה' ? 'task_completed' : 'task_created',
          title: task.title,
          description: task.description || '',
          date: task.status === 'הושלמה' ? task.updated_date : task.created_date,
          metadata: {
            status: task.status,
            priority: task.priority,
            due_date: task.due_date
          }
        });
      });

      // Meetings
      meetings.forEach(meeting => {
        timelineEvents.push({
          id: `meeting_${meeting.id}`,
          type: 'meeting',
          title: meeting.title,
          description: meeting.description || '',
          date: meeting.meeting_date,
          metadata: {
            status: meeting.status,
            location: meeting.location,
            duration: meeting.duration_minutes
          }
        });
      });

      // Quotes
      quotes.forEach(quote => {
        timelineEvents.push({
          id: `quote_${quote.id}`,
          type: 'quote',
          title: `הצעת מחיר: ${quote.project_name || ''}`,
          description: quote.description || '',
          date: quote.created_date,
          metadata: {
            amount: quote.amount,
            status: quote.status
          }
        });
      });

      // Invoices
      invoices.forEach(invoice => {
        timelineEvents.push({
          id: `invoice_${invoice.id}`,
          type: 'invoice',
          title: `חשבונית מס' ${invoice.number || ''}`,
          description: '',
          date: invoice.issue_date || invoice.created_date,
          metadata: {
            amount: invoice.amount,
            status: invoice.status
          }
        });
      });

      // Communications
      communications.forEach(comm => {
        timelineEvents.push({
          id: `comm_${comm.id}`,
          type: 'communication',
          title: comm.subject || 'תקשורת',
          description: comm.body ? comm.body.substring(0, 150) : '',
          date: comm.created_date,
          metadata: {
            type: comm.type,
            direction: comm.direction
          }
        });
      });

      // Feedbacks
      feedbacks.forEach(feedback => {
        timelineEvents.push({
          id: `feedback_${feedback.id}`,
          type: 'feedback',
          title: 'פידבק מהלקוח',
          description: feedback.message ? feedback.message.substring(0, 150) : '',
          date: feedback.created_date,
          metadata: {
            status: feedback.status
          }
        });
      });

      // Approvals
      approvals.forEach(approval => {
        timelineEvents.push({
          id: `approval_${approval.id}`,
          type: 'approval',
          title: approval.title,
          description: approval.description || '',
          date: approval.approved_at || approval.created_date,
          metadata: {
            status: approval.status
          }
        });
      });

      // Sort by date (newest first)
      timelineEvents.sort((a, b) => new Date(b.date) - new Date(a.date));

      setEvents(timelineEvents);
    } catch (error) {
      console.error("Error loading timeline:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" style={{ color: iconColor }} />
            ציר זמן
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex gap-4">
                <Skeleton className="h-12 w-12 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (events.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" style={{ color: iconColor }} />
            ציר זמן
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <AlertCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">אין אירועים להצגה</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" style={{ color: iconColor }} />
          ציר זמן - {clientName}
        </CardTitle>
        <p className="text-sm text-slate-500 mt-1">
          {events.length} אירועים • מעודכן עד {format(new Date(), "dd/MM/yyyy HH:mm", { locale: he })}
        </p>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] pr-4">
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute right-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-200 via-purple-200 to-slate-200" />

            <div className="space-y-6">
              {events.map((event, index) => {
                const config = eventTypeConfig[event.type] || eventTypeConfig.note;
                const Icon = config.icon;
                const isRecent = index < 3;

                return (
                  <div key={event.id} className="relative flex gap-4 group">
                    {/* Icon circle */}
                    <div className={`
                      relative z-10 flex-shrink-0 w-12 h-12 rounded-full 
                      flex items-center justify-center border-4 border-white
                      shadow-lg transition-transform duration-200
                      ${config.color}
                      ${isRecent ? 'ring-2 ring-blue-400 ring-offset-2' : ''}
                      group-hover:scale-110
                    `}>
                      <Icon className="w-5 h-5" />
                    </div>

                    {/* Event card */}
                    <div className={`
                      flex-1 bg-white rounded-lg border-2 p-4 shadow-sm
                      transition-all duration-200
                      ${isRecent ? 'border-blue-200 bg-blue-50/30' : 'border-slate-200'}
                      group-hover:shadow-md group-hover:border-blue-300
                    `}>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1">
                          <h3 className="font-semibold text-slate-900">
                            {event.title}
                          </h3>
                          <p className="text-xs text-slate-500 mt-1">
                            <Clock className="w-3 h-3 inline ml-1" style={{ color: iconColor }} />
                            {format(new Date(event.date), "dd/MM/yyyy HH:mm", { locale: he })}
                            {" • "}
                            {formatDistanceToNow(new Date(event.date), { addSuffix: true, locale: he })}
                          </p>
                        </div>
                        <Badge variant="outline" className={`${config.color} text-xs flex-shrink-0`}>
                          {config.label}
                        </Badge>
                      </div>

                      {event.description && (
                        <p className="text-sm text-slate-600 mb-3 line-clamp-2">
                          {event.description}
                        </p>
                      )}

                      {/* Metadata */}
                      {event.metadata && (
                        <div className="flex flex-wrap gap-2 text-xs">
                          {event.metadata.status && (
                            <Badge variant="outline" className="bg-slate-50">
                              {event.metadata.status}
                            </Badge>
                          )}
                          {event.metadata.priority && (
                            <Badge variant="outline" className="bg-slate-50">
                              עדיפות: {event.metadata.priority}
                            </Badge>
                          )}
                          {event.metadata.amount && (
                            <Badge variant="outline" className="bg-slate-50">
                              <DollarSign className="w-3 h-3 ml-1" />
                              {event.metadata.amount.toLocaleString()} ₪
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}