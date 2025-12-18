import React, { useState, useEffect, startTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Eye, Briefcase, Users } from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ExpandableCard from "./ExpandableCard";

const DEFAULT_STAGE_OPTIONS = [
  { value: 'ברור_תכן', label: 'ברור תכן', color: '#3b82f6', glow: 'rgba(59, 130, 246, 0.4)' },
  { value: 'תיק_מידע', label: 'תיק מידע', color: '#8b5cf6', glow: 'rgba(139, 92, 246, 0.4)' },
  { value: 'היתרים', label: 'היתרים', color: '#f59e0b', glow: 'rgba(245, 158, 11, 0.4)' },
  { value: 'ביצוע', label: 'ביצוע', color: '#10b981', glow: 'rgba(16, 185, 129, 0.4)' },
  { value: 'סיום', label: 'סיום', color: '#6b7280', glow: 'rgba(107, 114, 128, 0.4)' }
];

export default function RecentClients({ isLoading, className = '' }) {
  const [clients, setClients] = useState([]);
  const [allProjects, setAllProjects] = useState([]);
  const [clientsLimit, setClientsLimit] = useState('10');
  const [clientsFilter, setClientsFilter] = useState('all');

  const handleLimitChange = (value) => {
    startTransition(() => {
      setClientsLimit(value);
    });
  };

  const handleFilterChange = (value) => {
    startTransition(() => {
      setClientsFilter(value);
    });
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const [clientsData, projectsData] = await Promise.all([
          base44.entities.Client.list('-created_date').catch(() => []),
          base44.entities.Project.list().catch(() => [])
        ]);
        
        const validClients = Array.isArray(clientsData) ? clientsData : [];
        const validProjects = Array.isArray(projectsData) ? projectsData : [];
        
        setClients(validClients);
        setAllProjects(validProjects);
      } catch (error) {
        console.error('Error loading clients:', error);
        setClients([]);
        setAllProjects([]);
      }
    };
    loadData();
  }, []);

  const statusColors = {
    'פוטנציאלי': 'bg-amber-100 text-amber-800',
    'פעיל': 'bg-green-100 text-green-800',
    'לא פעיל': 'bg-slate-100 text-slate-800'
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'לא הוגדר';
    try {
      return format(new Date(dateString), 'dd/MM/yyyy', { locale: he });
    } catch (error) {
      return 'תאריך לא תקין';
    }
  };

  const filteredClients = clients.filter(client => {
    if (clientsFilter === 'all') return true;
    
    if (clientsFilter === 'active') return client.status === 'פעיל';
    if (clientsFilter === 'potential') return client.status === 'פוטנציאלי';
    if (clientsFilter === 'inactive') return client.status === 'לא פעיל';
    
    if (['ברור_תכן', 'תיק_מידע', 'היתרים', 'ביצוע', 'סיום'].includes(clientsFilter)) {
      return client.stage === clientsFilter;
    }
    
    if (['הצעת מחיר', 'תכנון', 'היתרים_פרויקט', 'ביצוע_פרויקט', 'הושלם', 'מבוטל'].includes(clientsFilter)) {
      const clientProjects = allProjects.filter(p => p.client_id === client.id || p.client_name === client.name);
      return clientProjects.some(p => p.status === clientsFilter);
    }
    
    return false;
  }).slice(0, parseInt(clientsLimit));

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-24 bg-slate-200 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <ExpandableCard defaultHeight="500px">
      <div className="flex flex-col h-full">
        {/* Filters */}
        <div className="p-4 border-b bg-slate-50 flex gap-3 items-center flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600">הצג:</span>
          <Select value={clientsLimit} onValueChange={handleLimitChange}>
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
          <Select value={clientsFilter} onValueChange={handleFilterChange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">הכל</SelectItem>
              <div className="px-2 py-1 text-xs font-semibold text-slate-500 bg-slate-100">סטטוס לקוח</div>
              <SelectItem value="active">פעילים</SelectItem>
              <SelectItem value="potential">פוטנציאליים</SelectItem>
              <SelectItem value="inactive">לא פעילים</SelectItem>
              <div className="px-2 py-1 text-xs font-semibold text-slate-500 bg-slate-100">שלבי לקוח</div>
              {DEFAULT_STAGE_OPTIONS.map(stage => (
                <SelectItem key={stage.value} value={stage.value}>
                  {stage.label}
                </SelectItem>
              ))}
              <div className="px-2 py-1 text-xs font-semibold text-slate-500 bg-slate-100">שלבי פרויקט</div>
              <SelectItem value="הצעת מחיר">הצעת מחיר</SelectItem>
              <SelectItem value="תכנון">תכנון</SelectItem>
              <SelectItem value="היתרים_פרויקט">היתרים</SelectItem>
              <SelectItem value="ביצוע_פרויקט">ביצוע</SelectItem>
              <SelectItem value="הושלם">הושלם</SelectItem>
              <SelectItem value="מבוטל">מבוטל</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Clients List */}
      <div className="p-4 space-y-3 flex-1 overflow-y-auto">
        {filteredClients.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <p className="mb-4">אין לקוחות להצגה</p>
            <Link to={createPageUrl("Clients")}>
              <Button variant="outline" size="sm">צור לקוח ראשון</Button>
            </Link>
          </div>
        ) : (
          filteredClients.map((client) => {
            const stageOptions = client.custom_stage_options || DEFAULT_STAGE_OPTIONS;
            const currentStage = client.stage ? stageOptions.find(s => s.value === client.stage) : null;
            const clientProjects = allProjects?.filter(p => p.client_id === client.id || p.client_name === client.name) || [];
            const activeProjectsCount = clientProjects.filter(p => p.status !== 'הושלם' && p.status !== 'מבוטל').length;

            return (
              <Link 
                key={client.id} 
                to={createPageUrl(`Clients?open=details&client_name=${encodeURIComponent(client.name || "")}`)}
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

                        {activeProjectsCount > 0 && (
                          <div className="flex items-center gap-2 text-xs text-blue-600 font-medium">
                            <Briefcase className="w-3 h-3 flex-shrink-0" />
                            <span>{activeProjectsCount} פרויקטים פעילים</span>
                          </div>
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
    </ExpandableCard>
  );
}