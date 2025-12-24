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
  ChevronDown
} from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { base44 } from "@/api/base44Client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { StageSelector } from "@/components/spreadsheets/GenericSpreadsheet";
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

const DEFAULT_STAGE_OPTIONS = [
  { value: 'ללא', label: 'ללא', color: '#cbd5e1' },
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
  const [stageOptions, setStageOptions] = useState(DEFAULT_STAGE_OPTIONS);
  const [activeTab, setActiveTab] = useState(() => {
    // Check URL params ONLY - this is the source of truth
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');

    console.log('🎯 [CLIENT DETAILS] Initial tab from URL:', {
      urlTab: tabParam,
      willUse: tabParam || 'timeline'
    });

    return tabParam || 'timeline';
  });

  const [currentClient, setCurrentClient] = useState(client);
  const [isUpdatingStage, setIsUpdatingStage] = useState(false);
  const [stagePopoverOpen, setStagePopoverOpen] = useState(false);

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

  // Load stage options from UserPreferences
  useEffect(() => {
    const loadStageOptions = async () => {
      console.log('🔍 [STAGE DEBUG] Starting to load stage options...');
      console.log('🔍 [STAGE DEBUG] DEFAULT_STAGE_OPTIONS:', JSON.stringify(DEFAULT_STAGE_OPTIONS, null, 2));
      
      try {
        // Load GLOBAL stage options from AppSettings
        const appSettings = await base44.entities.AppSettings.filter({ setting_key: 'table_settings_clients' });
        console.log('🔍 [STAGE DEBUG] AppSettings found:', appSettings.length);
        
        if (appSettings.length > 0 && appSettings[0].value?.stageOptions) {
          let loadedOptions = appSettings[0].value.stageOptions;
          console.log('🔍 [STAGE DEBUG] Loaded options from AppSettings:', JSON.stringify(loadedOptions, null, 2));
          
          // Always ensure "ללא" option exists at the beginning
          const hasLelo = loadedOptions.some(opt => opt.value === 'ללא');
          
          if (!hasLelo) {
            loadedOptions = [
              { value: 'ללא', label: 'ללא', color: '#cbd5e1' },
              ...loadedOptions
            ];
          }
          
          setStageOptions(loadedOptions);
        } else {
          console.log('🔍 [STAGE DEBUG] No AppSettings found, checking UserPreferences as backup');
          // Fallback to UserPreferences if AppSettings not found (backward compatibility)
          const user = await base44.auth.me();
          const userPrefs = await base44.entities.UserPreferences.filter({ user_email: user.email });
          
          if (userPrefs.length > 0 && userPrefs[0].spreadsheet_columns?.clients?.stageOptions) {
             let loadedOptions = userPrefs[0].spreadsheet_columns.clients.stageOptions;
             const hasLelo = loadedOptions.some(opt => opt.value === 'ללא');
             if (!hasLelo) {
               loadedOptions = [{ value: 'ללא', label: 'ללא', color: '#cbd5e1' }, ...loadedOptions];
             }
             setStageOptions(loadedOptions);
          } else {
             setStageOptions(DEFAULT_STAGE_OPTIONS);
          }
        }
      } catch (e) {
        console.warn('🔍 [STAGE DEBUG] Failed to load stage options:', e);
        setStageOptions(DEFAULT_STAGE_OPTIONS);
      }
    };
    
    loadStageOptions();
    
    // Listen for stage options updates
    const handleStageOptionsUpdate = () => {
      console.log('🔍 [STAGE DEBUG] Received stage:options:updated event, reloading...');
      loadStageOptions();
    };
    
    window.addEventListener('stage:options:updated', handleStageOptionsUpdate);
    return () => {
      window.removeEventListener('stage:options:updated', handleStageOptionsUpdate);
    };
  }, []);

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

  // Removed - initial state handles tab from URL correctly

  const handleStageChange = async (newStage) => {
    console.log('🎯 [CLIENT DETAILS] handleStageChange called:', {
      clientId: currentClient.id,
      clientName: currentClient.name,
      oldStage: currentClient.stage,
      newStage: newStage
    });
    
    setIsUpdatingStage(true);
    try {
      // עדכון מיידי של ה-UI המקומי
      const optimisticClient = { ...currentClient, stage: newStage };
      setCurrentClient(optimisticClient);
      
      console.log('📤 [CLIENT DETAILS] Sending update to server...');
      await base44.entities.Client.update(currentClient.id, { stage: newStage });
      console.log('✅ [CLIENT DETAILS] Update sent successfully');
      
      // טען מחדש את הלקוח מהשרת כדי לקבל את הגרסה העדכנית
      console.log('🔄 [CLIENT DETAILS] Reloading client from server...');
      const updatedClient = await base44.entities.Client.get(currentClient.id);
      console.log('📥 [CLIENT DETAILS] Client reloaded:', {
        name: updatedClient.name,
        stage: updatedClient.stage
      });
      
      setCurrentClient(updatedClient);
      
      // שלח אירוע עם כל הנתונים של הלקוח לסנכרון כל הקומפוננטות
      console.log('📢 [CLIENT DETAILS] Dispatching client:updated event...');
      window.dispatchEvent(new CustomEvent('client:updated', {
        detail: updatedClient
      }));
      console.log('✅ [CLIENT DETAILS] Event dispatched - all components should sync');
      
      toast.success('השלב עודכן בהצלחה');
    } catch (error) {
      console.error('❌ [CLIENT DETAILS] Error updating stage:', error);
      // החזר את המצב הקודם במקרה של שגיאה
      setCurrentClient(currentClient);
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
                    const currentStage = stageOptions.find(s => s.value === currentClient.stage);
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
                  <Popover open={stagePopoverOpen} onOpenChange={setStagePopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="w-[200px] h-8 justify-start gap-2 bg-white"
                        style={{ 
                          borderColor: currentClient.stage ? (() => {
                            const findStage = (val, opts) => {
                              for (const opt of opts) {
                                if (opt.value === val) return opt;
                                if (opt.children) {
                                  const found = findStage(val, opt.children);
                                  if (found) return found;
                                }
                              }
                              return null;
                            };
                            return findStage(currentClient.stage, stageOptions)?.color;
                          })() : undefined
                        }}
                        disabled={isUpdatingStage}
                      >
                        {(() => {
                          const findStage = (val, opts) => {
                            for (const opt of opts) {
                              if (opt.value === val) return opt;
                              if (opt.children) {
                                const found = findStage(val, opt.children);
                                if (found) return found;
                              }
                            }
                            return null;
                          };
                          
                          const currentStage = findStage(currentClient.stage, stageOptions);
                          
                          if (currentStage) {
                            return (
                              <div className="flex items-center gap-2 w-full overflow-hidden">
                                <Circle 
                                  className="w-3 h-3 flex-shrink-0 fill-current"
                                  style={{ color: currentStage.color }}
                                />
                                <span className="truncate">{currentStage.label}</span>
                              </div>
                            );
                          }
                          return <span className="text-slate-500">בחר שלב</span>;
                        })()}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <StageSelector 
                        options={stageOptions} 
                        onSelect={(val) => {
                          handleStageChange(val);
                          setStagePopoverOpen(false);
                        }} 
                      />
                    </PopoverContent>
                  </Popover>
                  
                  {currentClient.status === 'פעיל' && (
                    <Badge variant="outline" className={statusColors["פעיל"]}>
                      פעיל
                    </Badge>
                  )}
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