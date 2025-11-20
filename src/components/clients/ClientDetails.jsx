import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowRight,
  Edit,
  Phone,
  Mail,
  MapPin,
  Building,
  Calendar,
  Clock,
  FolderOpen,
  FileText,
  TrendingUp,
  DollarSign,
  Users,
  Briefcase,
  MessageSquare,
  CheckCircle,
  Globe
} from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { base44 } from "@/api/base44Client";

import ClientFiles from "./ClientFiles";
import ClientCommunication from "./ClientCommunication";
import ClientSheets from "./ClientSheets";
import TimeLogView from "./TimeLogView";
import ClientTasks from "./ClientTasks";
import ClientTimeline from "../portal/ClientTimeline";
import ClientSpreadsheets from "./ClientSpreadsheets";

const statusColors = {
  "פוטנציאלי": "bg-amber-100 text-amber-800 border-amber-200",
  "פעיל": "bg-green-100 text-green-800 border-green-200",
  "לא פעיל": "bg-red-100 text-red-800 border-red-200"
};

const iconColor = "#2C3A50";

export default function ClientDetails({ client, onBack, onEdit }) {
  const [projects, setProjects] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [timeLogs, setTimeLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadClientData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [projectsData, quotesData, invoicesData, timeLogsData] = await Promise.all([
        base44.entities.Project.filter({ client_id: client.id }, '-created_date', 50).catch(() => []),
        base44.entities.Quote.filter({ client_id: client.id }, '-created_date', 50).catch(() => []),
        base44.entities.Invoice.filter({ client_id: client.id }, '-created_date', 50).catch(() => []),
        base44.entities.TimeLog.filter({ client_id: client.id }, '-log_date', 50).catch(() => [])
      ]);

      // ✅ הגנה על כל התוצאות
      setProjects(Array.isArray(projectsData) ? projectsData : []);
      setQuotes(Array.isArray(quotesData) ? quotesData : []);
      setInvoices(Array.isArray(invoicesData) ? invoicesData : []);
      setTimeLogs(Array.isArray(timeLogsData) ? timeLogsData : []);
    } catch (error) {
      console.error("Error loading client data:", error);
      setProjects([]);
      setQuotes([]);
      setInvoices([]);
      setTimeLogs([]);
    } finally {
      setIsLoading(false);
    }
  }, [client.id]);

  useEffect(() => {
    loadClientData();
  }, [loadClientData]);

  const totalRevenue = invoices
    .filter(inv => inv?.status === 'paid')
    .reduce((sum, inv) => sum + (inv?.amount || 0), 0);

  // totalQuoted is declared in the outline but not used in the UI for display
  // const totalQuoted = quotes.reduce((sum, q) => sum + (q.amount || 0), 0);

  const totalHours = timeLogs.reduce((sum, log) => sum + (log?.duration_seconds || 0) / 3600, 0);

  return (
    <div className="p-6 lg:p-8 min-h-screen" style={{ backgroundColor: 'var(--bg-cream, #FCF6E3)' }} dir="rtl">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={onBack}
            className="gap-2 bg-white hover:bg-slate-50">
            <ArrowRight className="w-4 h-4" style={{ color: iconColor }} />
            חזרה
          </Button>

          <Button
            onClick={onEdit}
            className="gap-2 bg-[#2C3A50] hover:bg-[#1f2937] text-white">
            <Edit className="w-4 h-4" />
            ערוך לקוח
          </Button>
        </div>

        {/* Client Info Card */}
        <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-sm">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-white border-b">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-3xl font-bold text-slate-900 mb-3">
                  {client.name}
                </CardTitle>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className={statusColors[client.status]}>
                    {client.status}
                  </Badge>
                  {client.source && (
                    <Badge variant="outline" className="bg-slate-100 text-slate-700">
                      <TrendingUp className="w-3 h-3 ml-1" />
                      {client.source}
                    </Badge>
                  )}
                  {client.budget_range && (
                    <Badge variant="outline" className="bg-slate-100 text-slate-700">
                      <DollarSign className="w-3 h-3 ml-1" />
                      {client.budget_range}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Quick Stats */}
              <div className="flex gap-6 text-center">
                <div>
                  <div className="text-2xl font-bold" style={{ color: iconColor }}>
                    {projects.length}
                  </div>
                  <div className="text-xs text-slate-500">פרויקטים</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    ₪{totalRevenue.toLocaleString()}
                  </div>
                  <div className="text-xs text-slate-500">הכנסות</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    {totalHours.toFixed(1)}
                  </div>
                  <div className="text-xs text-slate-500">שעות</div>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Contact Info */}
              <div className="space-y-3">
                <h3 className="font-semibold text-slate-900 mb-3">פרטי קשר</h3>

                {client.phone && (
                  <div className="flex items-center gap-3 text-slate-700">
                    <Phone className="w-5 h-5" style={{ color: iconColor }} />
                    <a href={`tel:${client.phone}`} className="hover:underline">
                      {client.phone}
                    </a>
                  </div>
                )}

                {client.email && (
                  <div className="flex items-center gap-3 text-slate-700">
                    <Mail className="w-5 h-5" style={{ color: iconColor }} />
                    <a href={`mailto:${client.email}`} className="hover:underline">
                      {client.email}
                    </a>
                  </div>
                )}

                {client.company && (
                  <div className="flex items-center gap-3 text-slate-700">
                    <Building className="w-5 h-5" style={{ color: iconColor }} />
                    <span>{client.company}</span>
                  </div>
                )}

                {client.address && (
                  <div className="flex items-center gap-3 text-slate-700">
                    <MapPin className="w-5 h-5" style={{ color: iconColor }} />
                    <span>{client.address}</span>
                  </div>
                )}

                {client.website && (
                  <div className="flex items-center gap-3 text-slate-700">
                    <Globe className="w-5 h-5" style={{ color: iconColor }} />
                    <a href={client.website} target="_blank" rel="noopener noreferrer" className="hover:underline">
                      {client.website}
                    </a>
                  </div>
                )}
              </div>

              {/* Additional Info */}
              <div className="space-y-3">
                <h3 className="font-semibold text-slate-900 mb-3">מידע נוסף</h3>

                {client.position && (
                  <div className="flex items-center gap-3 text-slate-700">
                    <Users className="w-5 h-5" style={{ color: iconColor }} />
                    <span>תפקיד: {client.position}</span>
                  </div>
                )}

                <div className="flex items-center gap-3 text-slate-700">
                  <Calendar className="w-5 h-5" style={{ color: iconColor }} />
                  <span>
                    נוצר: {format(new Date(client.created_date), "dd/MM/yyyy", { locale: he })}
                  </span>
                </div>

                {client.tags && client.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {client.tags.map((tag, i) => (
                      <Badge key={i} variant="outline" className="bg-slate-50">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {client.notes && (
              <div className="mt-6 p-4 bg-slate-50 rounded-lg">
                <h3 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4" style={{ color: iconColor }} />
                  הערות
                </h3>
                <p className="text-slate-700 whitespace-pre-wrap">{client.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="timeline" className="w-full" dir="rtl">
          <TabsList className="grid w-full grid-cols-8 bg-white shadow-sm">
            <TabsTrigger value="timeline" className="gap-2">
              <Clock className="w-4 h-4" />
              ציר זמן
            </TabsTrigger>
            <TabsTrigger value="projects" className="gap-2">
              <Briefcase className="w-4 h-4" />
              פרויקטים
            </TabsTrigger>
            <TabsTrigger value="tasks" className="gap-2">
              <CheckCircle className="w-4 h-4" />
              משימות
            </TabsTrigger>
            <TabsTrigger value="spreadsheets" className="gap-2">
              <FileText className="w-4 h-4" />
              טבלאות
            </TabsTrigger>
            <TabsTrigger value="time" className="gap-2">
              <Clock className="w-4 h-4" />
              שעות
            </TabsTrigger>
            <TabsTrigger value="files" className="gap-2">
              <FolderOpen className="w-4 h-4" />
              קבצים
            </TabsTrigger>
            <TabsTrigger value="sheets" className="gap-2">
              <FileText className="w-4 h-4" />
              גיליונות
            </TabsTrigger>
            <TabsTrigger value="communication" className="gap-2">
              <MessageSquare className="w-4 h-4" />
              תקשורת
            </TabsTrigger>
          </TabsList>

          {/* Timeline Tab - NEW! */}
          <TabsContent value="timeline" className="mt-6">
            <ClientTimeline clientId={client.id} clientName={client.name} />
          </TabsContent>

          {/* Projects Tab */}
          <TabsContent value="projects" className="mt-6">
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>פרויקטים ({projects.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {projects.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    אין פרויקטים ללקוח זה
                  </div>
                ) : (
                  <div className="space-y-3">
                    {projects.map(project => (
                      <div key={project.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-slate-900">{project.name}</h3>
                            <p className="text-sm text-slate-600 mt-1">{project.description}</p>
                          </div>
                          <Badge variant="outline">{project.status}</Badge>
                        </div>
                        {project.budget && (
                          <div className="mt-2 text-sm text-slate-600">
                            תקציב: ₪{project.budget.toLocaleString()}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tasks Tab */}
          <TabsContent value="tasks" className="mt-6">
            <ClientTasks clientId={client.id} clientName={client.name} />
          </TabsContent>

          {/* Spreadsheets Tab */}
          <TabsContent value="spreadsheets" className="mt-6">
            <ClientSpreadsheets clientId={client.id} clientName={client.name} />
          </TabsContent>

          {/* Time Tab */}
          <TabsContent value="time" className="mt-6">
            <TimeLogView 
              client={client} 
              timeLogs={timeLogs}
              onTimeLogUpdate={loadClientData}
            />
          </TabsContent>

          {/* Files Tab */}
          <TabsContent value="files" className="mt-6">
            <ClientFiles client={client} clientId={client.id} />
          </TabsContent>

          {/* Sheets Tab */}
          <TabsContent value="sheets" className="mt-6">
            <ClientSheets client={client} clientId={client.id} />
          </TabsContent>

          {/* Communication Tab */}
          <TabsContent value="communication" className="mt-6">
            <ClientCommunication client={client} clientId={client.id} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}