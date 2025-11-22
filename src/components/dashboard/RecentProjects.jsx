import React, { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { MapPin, Calendar, Edit, Eye, Copy, Trash2, CheckSquare, Square, Users, Briefcase } from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Default stage options
const DEFAULT_STAGE_OPTIONS = [
  { value: 'ברור_תכן', label: 'ברור תכן', color: '#3b82f6', glow: 'rgba(59, 130, 246, 0.4)' },
  { value: 'תיק_מידע', label: 'תיק מידע', color: '#8b5cf6', glow: 'rgba(139, 92, 246, 0.4)' },
  { value: 'היתרים', label: 'היתרים', color: '#f59e0b', glow: 'rgba(245, 158, 11, 0.4)' },
  { value: 'ביצוע', label: 'ביצוע', color: '#10b981', glow: 'rgba(16, 185, 129, 0.4)' },
  { value: 'סיום', label: 'סיום', color: '#6b7280', glow: 'rgba(107, 114, 128, 0.4)' }
];

const STATUS_COLORS = {
  "הצעת מחיר": "bg-blue-100 text-blue-800",
  "תכנון": "bg-purple-100 text-purple-800",
  "היתרים": "bg-yellow-100 text-yellow-800",
  "ביצוע": "bg-orange-100 text-orange-800",
  "הושלם": "bg-green-100 text-green-800",
  "מבוטל": "bg-red-100 text-red-800"
};

export default function RecentProjects({ projects = [], isLoading, onUpdate }) {
  const [activeTab, setActiveTab] = useState('projects');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [clients, setClients] = useState([]);
  const [clientsLimit, setClientsLimit] = useState('10');
  const [clientsFilter, setClientsFilter] = useState('all');
  const [recentClients, setRecentClients] = useState([]);

  // Load clients to get stage info and recent clients
  useEffect(() => {
    const loadClients = async () => {
      try {
        const clientsData = await base44.entities.Client.list('-created_date');
        const validClients = Array.isArray(clientsData) ? clientsData : [];
        setClients(validClients);
        setRecentClients(validClients);
      } catch (error) {
        console.error('Error loading clients:', error);
        setClients([]);
        setRecentClients([]);
      }
    };
    loadClients();
  }, []);

  useEffect(() => {
    console.log('🔍 [RecentProjects] Received projects:', {
      projectsCount: projects?.length,
      projectsType: typeof projects,
      isArray: Array.isArray(projects),
      firstProject: projects?.[0],
      allProjects: projects
    });

    if (projects && Array.isArray(projects)) {
      projects.forEach((project, index) => {
        if (!project) {
          console.error(`❌ [RecentProjects] Project at index ${index} is null/undefined!`);
        } else if (typeof project !== 'object') {
          console.error(`❌ [RecentProjects] Project at index ${index} is not an object:`, project);
        } else {
          console.log(`✅ [RecentProjects] Project ${index}:`, {
            id: project.id,
            name: project.name,
            hasName: 'name' in project,
            keys: Object.keys(project)
          });
        }
      });
    }
  }, [projects]);

  const toggleSelect = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`למחוק ${selectedIds.length} פרויקטים?`)) return;
    
    try {
      await Promise.all(selectedIds.map(id => base44.entities.Project.delete(id)));
      setSelectedIds([]);
      setSelectionMode(false);
      onUpdate?.();
    } catch (error) {
      console.error('❌ [RecentProjects] Error deleting projects:', error);
    }
  };

  const handleBulkCopy = async () => {
    if (selectedIds.length === 0) return;
    
    try {
      const toCopy = projects.filter(p => p && selectedIds.includes(p.id));
      for (const project of toCopy) {
        if (!project) continue;
        const { id, created_date, updated_date, created_by, ...rest } = project;
        await base44.entities.Project.create({ 
          ...rest, 
          name: `${project.name || 'פרויקט'} (העתק)` 
        });
      }
      setSelectedIds([]);
      setSelectionMode(false);
      onUpdate?.();
    } catch (error) {
      console.error('❌ [RecentProjects] Error copying projects:', error);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'לא הוגדר';
    try {
      return format(new Date(dateString), 'dd/MM/yyyy', { locale: he });
    } catch (error) {
      console.error('❌ [RecentProjects] Error formatting date:', error, dateString);
      return 'תאריך לא תקין';
    }
  };

  if (isLoading) {
    console.log('⏳ [RecentProjects] Loading...');
    return (
      <div className="p-4 space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-24 bg-slate-200 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (!projects || projects.length === 0) {
    console.log('📭 [RecentProjects] No projects to display');
    return (
      <div className="p-8 text-center text-slate-500">
        <p className="mb-4">אין פרויקטים אחרונים</p>
        <Link to={createPageUrl("Projects")}>
          <Button variant="outline" size="sm">צור פרויקט ראשון</Button>
        </Link>
      </div>
    );
  }

  const validProjects = projects.filter(p => p && typeof p === 'object');
  console.log('📊 [RecentProjects] Valid projects:', validProjects.length, 'out of', projects.length);

  // Filter and limit clients
  const filteredClients = recentClients.filter(client => {
    if (clientsFilter === 'all') return true;
    if (clientsFilter === 'active') return client.status === 'פעיל';
    if (clientsFilter === 'potential') return client.status === 'פוטנציאלי';
    if (clientsFilter === 'inactive') return client.status === 'לא פעיל';
    // Filter by stage
    return client.stage === clientsFilter;
  }).slice(0, parseInt(clientsLimit));

  const statusColors = {
    'פוטנציאלי': 'bg-amber-100 text-amber-800',
    'פעיל': 'bg-green-100 text-green-800',
    'לא פעיל': 'bg-slate-100 text-slate-800'
  };

  return (
    <div className="flex flex-col h-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-2 mx-4 mt-3">
          <TabsTrigger value="projects" className="gap-2">
            <Briefcase className="w-4 h-4" />
            פרויקטים
          </TabsTrigger>
          <TabsTrigger value="clients" className="gap-2">
            <Users className="w-4 h-4" />
            לקוחות
          </TabsTrigger>
        </TabsList>

        <TabsContent value="projects" className="flex-1 mt-0">
          <ProjectsTab 
            projects={validProjects}
            selectionMode={selectionMode}
            selectedIds={selectedIds}
            setSelectionMode={setSelectionMode}
            setSelectedIds={setSelectedIds}
            clients={clients}
            onUpdate={onUpdate}
            handleBulkCopy={handleBulkCopy}
            handleBulkDelete={handleBulkDelete}
            toggleSelect={toggleSelect}
            formatDate={formatDate}
          />
        </TabsContent>

        <TabsContent value="clients" className="flex-1 mt-0">
          <ClientsTab
            clients={filteredClients}
            clientsLimit={clientsLimit}
            setClientsLimit={setClientsLimit}
            clientsFilter={clientsFilter}
            setClientsFilter={setClientsFilter}
            statusColors={statusColors}
            formatDate={formatDate}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ProjectsTab({ 
  projects, 
  selectionMode, 
  selectedIds, 
  setSelectionMode, 
  setSelectedIds,
  clients,
  onUpdate,
  handleBulkCopy,
  handleBulkDelete,
  toggleSelect,
  formatDate
}) {
  const STATUS_COLORS = {
    "הצעת מחיר": "bg-blue-100 text-blue-800",
    "תכנון": "bg-purple-100 text-purple-800",
    "היתרים": "bg-yellow-100 text-yellow-800",
    "ביצוע": "bg-orange-100 text-orange-800",
    "הושלם": "bg-green-100 text-green-800",
    "מבוטל": "bg-red-100 text-red-800"
  };

  const DEFAULT_STAGE_OPTIONS = [
    { value: 'ברור_תכן', label: 'ברור תכן', color: '#3b82f6', glow: 'rgba(59, 130, 246, 0.4)' },
    { value: 'תיק_מידע', label: 'תיק מידע', color: '#8b5cf6', glow: 'rgba(139, 92, 246, 0.4)' },
    { value: 'היתרים', label: 'היתרים', color: '#f59e0b', glow: 'rgba(245, 158, 11, 0.4)' },
    { value: 'ביצוע', label: 'ביצוע', color: '#10b981', glow: 'rgba(16, 185, 129, 0.4)' },
    { value: 'סיום', label: 'סיום', color: '#6b7280', glow: 'rgba(107, 114, 128, 0.4)' }
  ];

  return (
    <div>
      {selectionMode && selectedIds.length > 0 && (
        <div className="p-3 bg-blue-50 border-b flex items-center justify-between">
          <span className="text-sm text-blue-900">נבחרו {selectedIds.length} פרויקטים</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleBulkCopy}>
              <Copy className="w-3 h-3 ml-1" />
              העתק
            </Button>
            <Button size="sm" variant="destructive" onClick={handleBulkDelete}>
              <Trash2 className="w-3 h-3 ml-1" />
              מחק
            </Button>
          </div>
        </div>
      )}

      <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
        {validProjects.map((project, index) => {
          if (!project || typeof project !== 'object') {
            console.error(`❌ [RecentProjects] Skipping invalid project at index ${index}:`, project);
            return null;
          }
          
          let projectName = 'פרויקט ללא שם';
          let clientName = 'לקוח לא ידוע';
          let projectStatus = 'הצעת מחיר';
          let progress = 0;

          try {
            projectName = project.name || project.project_name || 'פרויקט ללא שם';
            clientName = project.client_name || 'לקוח לא ידוע';
            projectStatus = project.status || 'הצעת מחיר';
            progress = Math.min(100, Math.max(0, project.progress || 0));

            console.log(`✅ [RecentProjects] Rendering project ${index}:`, {
              id: project.id,
              projectName,
              clientName,
              projectStatus
            });
          } catch (error) {
            console.error(`❌ [RecentProjects] Error processing project ${index}:`, error, project);
            return null;
          }

          const statusColor = STATUS_COLORS[projectStatus] || STATUS_COLORS["הצעת מחיר"];

          return (
            <div
              key={project.id || index}
              className={`p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-all cursor-pointer ${
                selectedIds.includes(project.id) ? 'ring-2 ring-blue-500' : ''
              }`}
              onClick={() => selectionMode && project.id && toggleSelect(project.id)}
            >
              <div className="flex items-start gap-3">
                {selectionMode && (
                  <button
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      if (project.id) toggleSelect(project.id); 
                    }}
                    className="flex-shrink-0 mt-1"
                  >
                    {selectedIds.includes(project.id) ? (
                      <CheckSquare className="w-5 h-5 text-blue-600" />
                    ) : (
                      <Square className="w-5 h-5 text-slate-400" />
                    )}
                  </button>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-slate-900 truncate">{projectName}</h4>
                    <Badge className={`${statusColor} text-xs flex-shrink-0 ml-2`}>
                      {projectStatus}
                    </Badge>
                  </div>
                  
                  <div className="text-sm text-slate-600 space-y-1">
                    <div className="flex items-center gap-2">
                      {(() => {
                        // Find the client and their stage
                        const client = clients.find(c => c.id === project.client_id || c.name === clientName);
                        if (client?.stage) {
                          const stageOptions = client.custom_stage_options || DEFAULT_STAGE_OPTIONS;
                          const currentStage = stageOptions.find(s => s.value === client.stage);
                          if (currentStage) {
                            return (
                              <div 
                                className="w-3 h-3 rounded-full flex-shrink-0 animate-pulse"
                                style={{ 
                                  backgroundColor: currentStage.color,
                                  boxShadow: `0 0 8px ${currentStage.glow}, 0 0 12px ${currentStage.glow}`,
                                  border: '1px solid white'
                                }}
                                title={currentStage.label}
                              />
                            );
                          }
                        }
                        return <Eye className="w-3 h-3 flex-shrink-0" />;
                      })()}
                      <span className="truncate">{clientName}</span>
                    </div>
                    
                    {project.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{project.location}</span>
                      </div>
                    )}
                    
                    {project.start_date && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3 h-3 flex-shrink-0" />
                        <span>{formatDate(project.start_date)}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span>התקדמות</span>
                      <span className="font-semibold">{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-1.5" />
                  </div>
                </div>

                {!selectionMode && (
                  <div className="flex gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => { e.stopPropagation(); }}
                      title="ערוך"
                    >
                      <Edit className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-3 border-t flex justify-between items-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setSelectionMode(!selectionMode);
            setSelectedIds([]);
          }}
        >
          {selectionMode ? 'ביטול בחירה' : 'בחר מרובים'}
        </Button>
        <Link to={createPageUrl("Projects")}>
          <Button variant="outline" size="sm">כל הפרויקטים →</Button>
        </Link>
      </div>
    </div>
  );
}

function ClientsTab({ 
  clients, 
  clientsLimit, 
  setClientsLimit, 
  clientsFilter, 
  setClientsFilter,
  statusColors,
  formatDate
}) {
  const DEFAULT_STAGE_OPTIONS = [
    { value: 'ברור_תכן', label: 'ברור תכן', color: '#3b82f6', glow: 'rgba(59, 130, 246, 0.4)' },
    { value: 'תיק_מידע', label: 'תיק מידע', color: '#8b5cf6', glow: 'rgba(139, 92, 246, 0.4)' },
    { value: 'היתרים', label: 'היתרים', color: '#f59e0b', glow: 'rgba(245, 158, 11, 0.4)' },
    { value: 'ביצוע', label: 'ביצוע', color: '#10b981', glow: 'rgba(16, 185, 129, 0.4)' },
    { value: 'סיום', label: 'סיום', color: '#6b7280', glow: 'rgba(107, 114, 128, 0.4)' }
  ];

  return (
    <div>
      {/* Filters */}
      <div className="p-4 border-b bg-slate-50 flex gap-3 items-center flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600">הצג:</span>
          <Select value={clientsLimit} onValueChange={setClientsLimit}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="30">30</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600">סינון:</span>
          <Select value={clientsFilter} onValueChange={setClientsFilter}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">הכל</SelectItem>
              <SelectItem value="active">פעילים</SelectItem>
              <SelectItem value="potential">פוטנציאליים</SelectItem>
              <SelectItem value="inactive">לא פעילים</SelectItem>
              {DEFAULT_STAGE_OPTIONS.map(stage => (
                <SelectItem key={stage.value} value={stage.value}>
                  {stage.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Clients List */}
      <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
        {clients.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <p className="mb-4">אין לקוחות להצגה</p>
            <Link to={createPageUrl("Clients")}>
              <Button variant="outline" size="sm">צור לקוח ראשון</Button>
            </Link>
          </div>
        ) : (
          clients.map((client) => {
            const stageOptions = client.custom_stage_options || DEFAULT_STAGE_OPTIONS;
            const currentStage = client.stage ? stageOptions.find(s => s.value === client.stage) : null;

            return (
              <Link 
                key={client.id} 
                to={createPageUrl(`Clients?view=${client.id}`)}
                className="block"
              >
                <div className="p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-all cursor-pointer">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {currentStage && (
                            <div 
                              className="w-3 h-3 rounded-full flex-shrink-0 animate-pulse"
                              style={{ 
                                backgroundColor: currentStage.color,
                                boxShadow: `0 0 8px ${currentStage.glow}, 0 0 12px ${currentStage.glow}`,
                                border: '1px solid white'
                              }}
                              title={currentStage.label}
                            />
                          )}
                          <h4 className="font-semibold text-slate-900 truncate">
                            {client.name || 'לקוח ללא שם'}
                          </h4>
                        </div>
                        {client.status && (
                          <Badge className={`${statusColors[client.status] || 'bg-slate-100 text-slate-800'} text-xs flex-shrink-0 ml-2`}>
                            {client.status}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="text-sm text-slate-600 space-y-1">
                        {client.company && (
                          <div className="truncate">{client.company}</div>
                        )}
                        
                        {client.phone && (
                          <div className="truncate">{client.phone}</div>
                        )}
                        
                        {client.email && (
                          <div className="truncate text-xs">{client.email}</div>
                        )}

                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <Calendar className="w-3 h-3 flex-shrink-0" />
                          <span>נוצר: {formatDate(client.created_date)}</span>
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 flex-shrink-0"
                      onClick={(e) => { e.preventDefault(); }}
                      title="צפה"
                    >
                      <Eye className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>

      <div className="p-3 border-t flex justify-end">
        <Link to={createPageUrl("Clients")}>
          <Button variant="outline" size="sm">כל הלקוחות →</Button>
        </Link>
      </div>
    </div>
  );
}