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
  Globe,
  Circle,
  ChevronDown,
  LayoutGrid,
  List,
  Kanban
} from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { base44 } from "@/api/base44Client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

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

const STAGE_OPTIONS = [
  { value: 'ברור_תכן', label: 'ברור תכן', color: '#3b82f6' },
  { value: 'תיק_מידע', label: 'תיק מידע', color: '#8b5cf6' },
  { value: 'היתרים', label: 'היתרים', color: '#f59e0b' },
  { value: 'ביצוע', label: 'ביצוע', color: '#10b981' },
  { value: 'סיום', label: 'סיום', color: '#6b7280' }
];

const iconColor = "#2C3A50";

export default function ClientDetails({ client, onBack, onEdit }) {
  const [projects, setProjects] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [timeLogs, setTimeLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(() => {
    // Check URL params first
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    
    // Check sessionStorage second
    const sessionTab = sessionStorage.getItem('clientDetailsActiveTab');
    
    console.log('🎯 [CLIENT DETAILS] Initial tab determination:', {
      urlTab: tabParam,
      sessionTab: sessionTab,
      willUse: tabParam || sessionTab || 'timeline'
    });
    
    // Clean up sessionStorage after reading
    if (sessionTab) {
      sessionStorage.removeItem('clientDetailsActiveTab');
    }
    
    return tabParam || sessionTab || 'timeline';
  });

  const [currentClient, setCurrentClient] = useState(client);
  const [isUpdatingStage, setIsUpdatingStage] = useState(false);
  const [tabViewMode, setTabViewMode] = useState(() => {
    try {
      return localStorage.getItem('client-tabs-view-mode') || 'icons';
    } catch {
      return 'icons';
    }
  });

  // Save tab view mode
  useEffect(() => {
    try {
      localStorage.setItem('client-tabs-view-mode', tabViewMode);
    } catch (e) {
      console.error('Error saving tab view mode:', e);
    }
  }, [tabViewMode]);

  // Update currentClient when client prop changes
  useEffect(() => {
    if (client) {
      console.log('🔄 [CLIENT DETAILS] Client prop changed:', { 
        id: client.id, 
        name: client.name, 
        stage: client.stage 
      });
      setCurrentClient(client);
    }
  }, [client]);

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
      console.log('📬 [CLIENT DETAILS] Received client:updated event:', event.detail);
      if (event.detail?.id === client?.id) {
        console.log('✅ [CLIENT DETAILS] Event matches current client, reloading...');
        loadClientData();
      } else {
        console.log('⏭️ [CLIENT DETAILS] Event for different client, ignoring');
      }
    };
    
    window.addEventListener('client:updated', handleClientUpdate);
    console.log('👂 [CLIENT DETAILS] Listening for updates on client:', client?.id);
    return () => {
      console.log('🔇 [CLIENT DETAILS] Stopped listening');
      window.removeEventListener('client:updated', handleClientUpdate);
    };
  }, [client?.id, loadClientData]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const spreadsheetId = urlParams.get('spreadsheetId');
    const tabParam = urlParams.get('tab');
    
    console.log('🔄 [CLIENT DETAILS] URL params check:', {
      spreadsheetId,
      tabParam,
      currentActiveTab: activeTab
    });
    
    if (spreadsheetId) {
      console.log('📊 [CLIENT DETAILS] Setting tab to spreadsheets (spreadsheetId found)');
      setActiveTab('spreadsheets');
    } else if (tabParam && tabParam !== activeTab) {
      console.log('📑 [CLIENT DETAILS] Setting tab from URL param:', tabParam);
      setActiveTab(tabParam);
    }
  }, []);

  const handleStageChange = async (newStage) => {
    console.log('🎯 [CLIENT DETAILS] handleStageChange called:', {
      clientId: currentClient.id,
      clientName: currentClient.name,
      oldStage: currentClient.stage,
      newStage: newStage
    });
    
    setIsUpdatingStage(true);
    try {
      console.log('📤 [CLIENT DETAILS] Sending update to server...');
      await base44.entities.Client.update(currentClient.id, { stage: newStage });
      console.log('✅ [CLIENT DETAILS] Update sent successfully');
      
      // טען מחדש את הלקוח מהשרת כדי לקבל את הגרסה העדכנית
      console.log('🔄 [CLIENT DETAILS] Reloading client from server...');
      const updatedClient = await base44.entities.Client.get(currentClient.id);
      console.log('📥 [CLIENT DETAILS] Client reloaded:', {
        name: updatedClient.name,
        stage: updatedClient.stage,
        fullData: updatedClient
      });
      
      setCurrentClient(updatedClient);
      console.log('💾 [CLIENT DETAILS] Local state updated');
      
      // שלח אירוע עם כל הנתונים של הלקוח
      console.log('📢 [CLIENT DETAILS] Dispatching client:updated event...');
      window.dispatchEvent(new CustomEvent('client:updated', {
        detail: updatedClient
      }));
      console.log('✅ [CLIENT DETAILS] Event dispatched successfully');
      
      toast.success('השלב עודכן בהצלחה');
    } catch (error) {
      console.error('❌ [CLIENT DETAILS] Error updating stage:', error);
      toast.error('שגיאה בעדכון השלב');
    } finally {
      setIsUpdatingStage(false);
    }
  };

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
                    const currentStage = STAGE_OPTIONS.find(s => s.value === currentClient.stage);
                    if (currentStage) {
                      return (
                        <Circle 
                          className="w-4 h-4 flex-shrink-0 fill-current"
                          style={{ color: currentStage.color }}
                          title={currentStage.label}
                        />
                      );
                    }
                    return null;
                  })()}
                  {currentClient.name || 'ללא שם'}
                </CardTitle>
                <div className="flex flex-wrap gap-2">
                  <Select 
                    value={currentClient.stage || ''} 
                    onValueChange={handleStageChange}
                    disabled={isUpdatingStage}
                  >
                    <SelectTrigger className="w-[200px] h-8" style={{ 
                      borderColor: currentClient.stage ? STAGE_OPTIONS.find(s => s.value === currentClient.stage)?.color : undefined,
                      color: currentClient.stage ? STAGE_OPTIONS.find(s => s.value === currentClient.stage)?.color : undefined
                    }}>
                      <SelectValue placeholder="בחר שלב">
                        {currentClient.stage && (() => {
                          const currentStage = STAGE_OPTIONS.find(s => s.value === currentClient.stage);
                          return currentStage ? (
                            <div className="flex items-center gap-2">
                              <Circle 
                                className="w-3 h-3 flex-shrink-0 fill-current"
                                style={{ color: currentStage.color }}
                              />
                              <span>{currentStage.label}</span>
                            </div>
                          ) : 'בחר שלב';
                        })()}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {STAGE_OPTIONS.map(stage => (
                        <SelectItem key={stage.value} value={stage.value}>
                          <div className="flex items-center gap-2">
                            <Circle 
                              className="w-3 h-3 flex-shrink-0 fill-current"
                              style={{ color: stage.color }}
                            />
                            <span>{stage.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
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
        <Tabs 
          value={activeTab} 
          onValueChange={(newTab) => {
            console.log('🔀 [CLIENT DETAILS] Tab changed:', {
              from: activeTab,
              to: newTab
            });
            setActiveTab(newTab);
          }} 
          className="w-full" 
          dir="rtl"
        >
          <div className="flex items-center gap-3 mb-4">
            <TabsList className="inline-flex h-9 items-center justify-start rounded-lg bg-slate-100 p-1 gap-1 overflow-x-auto flex-1">
              {tabViewMode === 'icons' ? (
                <>
                  <TabsTrigger value="timeline" className="h-7 w-9 px-0 text-xs rounded-md flex items-center justify-center" title="ציר זמן">
                    <Clock className="w-3.5 h-3.5" />
                  </TabsTrigger>
                  <TabsTrigger value="projects" className="h-7 w-9 px-0 text-xs rounded-md flex items-center justify-center" title="פרויקטים">
                    <Briefcase className="w-3.5 h-3.5" />
                  </TabsTrigger>
                  <TabsTrigger value="tasks" className="h-7 w-9 px-0 text-xs rounded-md flex items-center justify-center" title="משימות">
                    <CheckCircle className="w-3.5 h-3.5" />
                  </TabsTrigger>
                  <TabsTrigger value="spreadsheets" className="h-7 w-9 px-0 text-xs rounded-md flex items-center justify-center" title="טבלאות">
                    <FileText className="w-3.5 h-3.5" />
                  </TabsTrigger>
                  <TabsTrigger value="time" className="h-7 w-9 px-0 text-xs rounded-md flex items-center justify-center" title="שעות">
                    <Clock className="w-3.5 h-3.5" />
                  </TabsTrigger>
                  <TabsTrigger value="files" className="h-7 w-9 px-0 text-xs rounded-md flex items-center justify-center" title="קבצים">
                    <FolderOpen className="w-3.5 h-3.5" />
                  </TabsTrigger>
                  <TabsTrigger value="sheets" className="h-7 w-9 px-0 text-xs rounded-md flex items-center justify-center" title="גיליונות">
                    <FileText className="w-3.5 h-3.5" />
                  </TabsTrigger>
                  <TabsTrigger value="communication" className="h-7 w-9 px-0 text-xs rounded-md flex items-center justify-center" title="תקשורת">
                    <MessageSquare className="w-3.5 h-3.5" />
                  </TabsTrigger>
                </>
              ) : tabViewMode === 'compact' ? (
                <>
                  <TabsTrigger value="timeline" className="h-7 px-2 text-[11px] rounded-md gap-1">
                    <Clock className="w-3 h-3" />
                    ציר זמן
                  </TabsTrigger>
                  <TabsTrigger value="projects" className="h-7 px-2 text-[11px] rounded-md gap-1">
                    <Briefcase className="w-3 h-3" />
                    פרויקטים
                  </TabsTrigger>
                  <TabsTrigger value="tasks" className="h-7 px-2 text-[11px] rounded-md gap-1">
                    <CheckCircle className="w-3 h-3" />
                    משימות
                  </TabsTrigger>
                  <TabsTrigger value="spreadsheets" className="h-7 px-2 text-[11px] rounded-md gap-1">
                    <FileText className="w-3 h-3" />
                    טבלאות
                  </TabsTrigger>
                  <TabsTrigger value="time" className="h-7 px-2 text-[11px] rounded-md gap-1">
                    <Clock className="w-3 h-3" />
                    שעות
                  </TabsTrigger>
                  <TabsTrigger value="files" className="h-7 px-2 text-[11px] rounded-md gap-1">
                    <FolderOpen className="w-3 h-3" />
                    קבצים
                  </TabsTrigger>
                  <TabsTrigger value="sheets" className="h-7 px-2 text-[11px] rounded-md gap-1">
                    <FileText className="w-3 h-3" />
                    גיליונות
                  </TabsTrigger>
                  <TabsTrigger value="communication" className="h-7 px-2 text-[11px] rounded-md gap-1">
                    <MessageSquare className="w-3 h-3" />
                    תקשורת
                  </TabsTrigger>
                </>
              ) : (
                <>
                  <TabsTrigger value="timeline" className="h-7 px-3 text-xs rounded-md gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    ציר זמן
                  </TabsTrigger>
                  <TabsTrigger value="projects" className="h-7 px-3 text-xs rounded-md gap-1.5">
                    <Briefcase className="w-3.5 h-3.5" />
                    פרויקטים
                  </TabsTrigger>
                  <TabsTrigger value="tasks" className="h-7 px-3 text-xs rounded-md gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5" />
                    משימות
                  </TabsTrigger>
                  <TabsTrigger value="spreadsheets" className="h-7 px-3 text-xs rounded-md gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    טבלאות
                  </TabsTrigger>
                  <TabsTrigger value="time" className="h-7 px-3 text-xs rounded-md gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    שעות
                  </TabsTrigger>
                  <TabsTrigger value="files" className="h-7 px-3 text-xs rounded-md gap-1.5">
                    <FolderOpen className="w-3.5 h-3.5" />
                    קבצים
                  </TabsTrigger>
                  <TabsTrigger value="sheets" className="h-7 px-3 text-xs rounded-md gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    גיליונות
                  </TabsTrigger>
                  <TabsTrigger value="communication" className="h-7 px-3 text-xs rounded-md gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5" />
                    תקשורת
                  </TabsTrigger>
                </>
              )}
            </TabsList>

          {/* View Mode Toggle */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-2 shrink-0">
                {tabViewMode === 'icons' ? <LayoutGrid className="w-4 h-4" /> : tabViewMode === 'compact' ? <Kanban className="w-4 h-4" /> : <List className="w-4 h-4" />}
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" dir="rtl">
              <DropdownMenuItem onClick={() => setTabViewMode('icons')} className={tabViewMode === 'icons' ? 'bg-blue-50' : ''}>
                <LayoutGrid className="w-4 h-4 ml-2" />
                אייקונים בלבד
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTabViewMode('compact')} className={tabViewMode === 'compact' ? 'bg-blue-50' : ''}>
                <Kanban className="w-4 h-4 ml-2" />
                קומפקטי
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTabViewMode('full')} className={tabViewMode === 'full' ? 'bg-blue-50' : ''}>
                <List className="w-4 h-4 ml-2" />
                מלא
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
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