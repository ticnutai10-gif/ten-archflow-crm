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
  const [activeTab, setActiveTab] = useState('timeline');

  const [currentClient, setCurrentClient] = useState(client);

  const loadClientData = useCallback(async () => {
    if (!client?.id) return;
    
    setIsLoading(true);
    try {
      const [clientData, projectsData, quotesData, invoicesData, timeLogsData] = await Promise.all([
        base44.entities.Client.get(client.id).catch(() => client),
        base44.entities.Project.filter({ client_id: client.id }, '-created_date', 50).catch(() => []),
        base44.entities.Quote.filter({ client_id: client.id }, '-created_date', 50).catch(() => []),
        base44.entities.Invoice.filter({ client_id: client.id }, '-created_date', 50).catch(() => []),
        base44.entities.TimeLog.filter({ client_id: client.id }, '-log_date', 50).catch(() => [])
      ]);

      setCurrentClient(clientData || client);
      setProjects(Array.isArray(projectsData) ? projectsData : []);
      setQuotes(Array.isArray(quotesData) ? quotesData : []);
      setInvoices(Array.isArray(invoicesData) ? invoicesData : []);
      setTimeLogs(Array.isArray(timeLogsData) ? timeLogsData : []);
    } catch (error) {
      console.error("Error loading client data:", error);
      setCurrentClient(client);
      setProjects([]);
      setQuotes([]);
      setInvoices([]);
      setTimeLogs([]);
    } finally {
      setIsLoading(false);
    }
  }, [client?.id]);

  useEffect(() => {
    loadClientData();
  }, [loadClientData]);

  useEffect(() => {
    const handleClientUpdate = (event) => {
      if (event.detail?.id === client?.id) {
        loadClientData();
      }
    };
    
    window.addEventListener('client:updated', handleClientUpdate);
    return () => window.removeEventListener('client:updated', handleClientUpdate);
  }, [client?.id, loadClientData]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const spreadsheetId = urlParams.get('spreadsheetId');
    if (spreadsheetId) {
      setActiveTab('spreadsheets');
    }
  }, []);

  const DEFAULT_STAGE_OPTIONS = [
    { value: 'ברור_תכן', label: 'ברור תכן', color: '#3b82f6', glow: 'rgba(59, 130, 246, 0.4)' },
    { value: 'תיק_מידע', label: 'תיק מידע', color: '#8b5cf6', glow: 'rgba(139, 92, 246, 0.4)' },
    { value: 'היתרים', label: 'היתרים', color: '#f59e0b', glow: 'rgba(245, 158, 11, 0.4)' },
    { value: 'ביצוע', label: 'ביצוע', color: '#10b981', glow: 'rgba(16, 185, 129, 0.4)' },
    { value: 'סיום', label: 'סיום', color: '#6b7280', glow: 'rgba(107, 114, 128, 0.4)' }
  ];

  if (!client) {
    return (
      <div className="p-6 text-center text-slate-500">
        לא נמצא לקוח
      </div>
    );
  }

  const totalRevenue = invoices
    .filter(inv => inv?.status === 'paid')
    .reduce((sum, inv) => sum + (inv?.amount || 0), 0);

  const totalHours = timeLogs.reduce((sum, log) => sum + (log?.duration_seconds || 0) / 3600, 0);

  return (
    <div className="p-6 lg:p-8 min-h-screen" style={{ backgroundColor: 'var(--bg-cream, #FCF6E3)' }} dir="rtl">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => { if (typeof onBack === 'function') onBack(); }}
            className="gap-2 bg-white hover:bg-slate-50">
            <ArrowRight className="w-4 h-4" style={{ color: iconColor }} />
            חזרה
          </Button>

          <Button
            onClick={() => { if (typeof onEdit === 'function') onEdit(); }}
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
                <CardTitle className="text-3xl font-bold text-slate-900 mb-3 flex items-center gap-3">
                  {currentClient.stage && (() => {
                    const stageOptions = currentClient.custom_stage_options || DEFAULT_STAGE_OPTIONS;
                    const currentStage = stageOptions.find(s => s.value === currentClient.stage);
                    if (currentStage) {
                      return (
                        <div 
                          className="w-4 h-4 rounded-full flex-shrink-0 animate-pulse"
                          style={{ 
                            backgroundColor: currentStage.color,
                            boxShadow: `0 0 8px ${currentStage.glow}, 0 0 12px ${currentStage.glow}`,
                            border: '1px solid white'
                          }}
                          title={currentStage.label}
                        />
                      );
                    }
                    return null;
                  })()}
                  {currentClient.name || 'ללא שם'}
                </CardTitle>
                <div className="flex flex-wrap gap-2">
                  {currentClient.stage && (() => {
                    const stageOptions = currentClient.custom_stage_options || DEFAULT_STAGE_OPTIONS;
                    const currentStage = stageOptions.find(s => s.value === currentClient.stage);
                    if (currentStage) {
                      return (
                        <Badge variant="outline" className="bg-slate-100 text-slate-700">
                          שלב: {currentStage.label}
                        </Badge>
                      );
                    }
                    return null;
                  })()}
                  <Badge variant="outline" className={statusColors[currentClient.status] || statusColors["פוטנציאלי"]}>
                    {currentClient.status || 'פוטנציאלי'}
                  </Badge>
                  {currentClient.source && (
                    <Badge variant="outline" className="bg-slate-100 text-slate-700">
                      <TrendingUp className="w-3 h-3 ml-1" />
                      {currentClient.source}
                    </Badge>
                  )}
                  {currentClient.budget_range && (
                    <Badge variant="outline" className="bg-slate-100 text-slate-700">
                      <DollarSign className="w-3 h-3 ml-1" />
                      {currentClient.budget_range}
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

                {client.created_date && (
                  <div className="flex items-center gap-3 text-slate-700">
                    <Calendar className="w-5 h-5" style={{ color: iconColor }} />
                    <span>
                      נוצר: {format(new Date(client.created_date), "dd/MM/yyyy", { locale: he })}
                    </span>
                  </div>
                )}

                {client.tags && Array.isArray(client.tags) && client.tags.length > 0 && (
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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full" dir="rtl">
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

          <TabsContent value="timeline" className="mt-6">
            <ClientTimeline clientId={client.id} clientName={client.name} />
          </TabsContent>

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
                            {project.description && (
                              <p className="text-sm text-slate-600 mt-1">{project.description}</p>
                            )}
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

          <TabsContent value="tasks" className="mt-6">
            <ClientTasks client={client} />
          </TabsContent>

          <TabsContent value="spreadsheets" className="mt-6">
            <ClientSpreadsheets clientId={client.id} clientName={client.name} />
          </TabsContent>

          <TabsContent value="time" className="mt-6">
            <TimeLogView 
              client={client} 
              timeLogs={timeLogs}
              onTimeLogUpdate={loadClientData}
            />
          </TabsContent>

          <TabsContent value="files" className="mt-6">
            <ClientFiles client={client} clientId={client.id} />
          </TabsContent>

          <TabsContent value="sheets" className="mt-6">
            <ClientSheets client={client} clientId={client.id} />
          </TabsContent>

          <TabsContent value="communication" className="mt-6">
            <ClientCommunication client={client} clientId={client.id} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}