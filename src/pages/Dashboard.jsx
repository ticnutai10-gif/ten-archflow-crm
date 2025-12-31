import React, { useState, useEffect, useCallback, Suspense, startTransition } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import {
  Settings,
  LayoutGrid,
  LayoutList,
  Grid3x3,
  Grid2x2,
  AlignLeft,
  Minimize2,
  Maximize2,
  Eye,
  ChevronDown,
  ChevronUp,
  Columns,
  BarChart3,
  Calendar,
  TrendingUp,
  Activity,
  Users,
  Briefcase,
  DollarSign,
  CheckSquare,
  Smartphone,
  Save,
  Bookmark,
  X,
  Trash2,
  Filter
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const RecentProjects = React.lazy(() => import("../components/dashboard/RecentProjects"));
const RecentClients = React.lazy(() => import("../components/dashboard/RecentClients"));
const UpcomingTasks = React.lazy(() => import("../components/dashboard/UpcomingTasks"));
const QuoteStatus = React.lazy(() => import("../components/dashboard/QuoteStatus"));
const TimerLogs = React.lazy(() => import("../components/dashboard/TimerLogs"));
const ReminderManager = React.lazy(() => import("../components/reminders/ReminderManager"));
const DashboardSettings = React.lazy(() => import("../components/dashboard/DashboardSettings"));
const UpcomingMeetings = React.lazy(() => import("../components/dashboard/UpcomingMeetings"));
const ProjectsOverview = React.lazy(() => import("../components/dashboard/ProjectsOverview"));
const DashboardCustomizer = React.lazy(() => import("../components/dashboard/DashboardCustomizer"));
const KanbanView = React.lazy(() => import("../components/dashboard/KanbanView"));
const TimelineView = React.lazy(() => import("../components/dashboard/TimelineView"));
const AnalyticsView = React.lazy(() => import("../components/dashboard/AnalyticsView"));
const HeatmapView = React.lazy(() => import("../components/dashboard/HeatmapView"));
const TrendsView = React.lazy(() => import("../components/dashboard/TrendsView"));
const AIInsightsPanel = React.lazy(() => import("../components/ai/AIInsightsPanel"));
const StatsWidget = React.lazy(() => import("../components/dashboard/StatsWidget"));
const UpcomingDeadlinesWidget = React.lazy(() => import("../components/dashboard/UpcomingDeadlinesWidget"));
const ActivityFeedWidget = React.lazy(() => import("../components/dashboard/ActivityFeedWidget"));
import QuickCreationTabs from "../components/dashboard/QuickCreationTabs";
import { useIsMobile } from "../components/utils/useMediaQuery";
import { useAccessControl } from "../components/access/AccessValidator";

const VIEW_MODES = [
  { value: 'grid-2', label: 'רשת 2 עמודות', icon: Grid2x2 },
  { value: 'grid-3', label: 'רשת 3 עמודות', icon: LayoutGrid },
  { value: 'grid-4', label: 'רשת 4 עמודות', icon: Grid3x3 },
  { value: 'list', label: 'רשימה', icon: LayoutList }
];

export default function Dashboard() {
  const isMobile = useIsMobile();
  const { filterClients } = useAccessControl();
  const [loading, setLoading] = useState(true);
  
  // Data
  const [stats, setStats] = useState({ clients: 0, projects: 0, quotes: 0, tasks: 0 });
  const [recentProjects, setRecentProjects] = useState([]);
  const [upcomingTasks, setUpcomingTasks] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [timeLogs, setTimeLogs] = useState([]);
  const [upcomingMeetings, setUpcomingMeetings] = useState([]);
  const [allClients, setAllClients] = useState([]);
  const [allProjects, setAllProjects] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  
  // UI State
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [focusedCard, setFocusedCard] = useState(null);
  const [showSaveLayoutDialog, setShowSaveLayoutDialog] = useState(false);
  const [savedLayouts, setSavedLayouts] = useState([]);
  const [layoutName, setLayoutName] = useState('');
  
  // Load preferences from localStorage immediately (synchronous - no delay)
  const loadInitialPrefs = () => {
    try {
      const cached = localStorage.getItem('dashboard_preferences');
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      console.warn('Failed to load cached preferences');
    }
    return null;
  };

  const initialPrefs = loadInitialPrefs();

  // User Preferences - loaded instantly from localStorage
  const [viewMode, setViewMode] = useState(initialPrefs?.viewMode || 'grid-3');
  const [clientFilter, setClientFilter] = useState(initialPrefs?.clientFilter || 'all');
  const [expandedCards, setExpandedCards] = useState(initialPrefs?.expandedCards || {
    projects: true,
    clients: true,
    tasks: true,
    quotes: true,
    timeLogs: true,
    meetings: true
  });
  const [visibleCards, setVisibleCards] = useState(initialPrefs?.visibleCards || {
    stats: true,
    quickActions: true,
    aiInsights: true,
    projectsOverview: true,
    upcomingDeadlines: true,
    activityFeed: true,
    recentProjects: true,
    recentClients: true,
    upcomingTasks: true,
    quoteStatus: true,
    timerLogs: true,
    upcomingMeetings: true
  });
  const [cardOrder, setCardOrder] = useState(initialPrefs?.cardOrder || [
    { id: 'stats', name: 'סטטיסטיקות' },
    { id: 'quickActions', name: 'פעולות מהירות' },
    { id: 'aiInsights', name: 'תובנות AI' },
    { id: 'upcomingDeadlines', name: 'מועדים קרובים' },
    { id: 'activityFeed', name: 'פעילות אחרונה' },
    { id: 'projectsOverview', name: 'סקירת פרויקטים' },
    { id: 'recentProjects', name: 'פרויקטים אחרונים' },
    { id: 'recentClients', name: 'לקוחות אחרונים' },
    { id: 'upcomingTasks', name: 'משימות קרובות' },
    { id: 'quoteStatus', name: 'הצעות מחיר' },
    { id: 'timerLogs', name: 'לוגי זמן' },
    { id: 'upcomingMeetings', name: 'פגישות קרובות' }
  ]);

  // Sync with database in background (non-blocking)
  useEffect(() => {
    const syncWithDB = async () => {
      try {
        const user = await base44.auth.me();
        const userPrefs = await base44.entities.UserPreferences.filter({ user_email: user.email });
        
        if (userPrefs.length > 0 && userPrefs[0].dashboard_preferences) {
          const p = userPrefs[0].dashboard_preferences;
          localStorage.setItem('dashboard_preferences', JSON.stringify(p));

          // Only update if different from current state
          if (JSON.stringify(p) !== JSON.stringify({ viewMode, clientFilter, expandedCards, visibleCards, cardOrder, savedLayouts })) {
            if (p.viewMode) setViewMode(p.viewMode);
            if (p.clientFilter) setClientFilter(p.clientFilter);
            if (p.expandedCards) setExpandedCards(p.expandedCards);
            if (p.visibleCards) setVisibleCards(p.visibleCards);
            if (p.cardOrder) setCardOrder(p.cardOrder);
            if (p.savedLayouts) setSavedLayouts(p.savedLayouts);
          }
        }
      } catch (e) {
        // Silently fail - user is not logged in or no preferences
      }
    };
    
    syncWithDB();
  }, []);

  // Save preferences (debounced)
  useEffect(() => {
    const savePrefs = async () => {
      try {
        const prefs = { viewMode, clientFilter, expandedCards, visibleCards, cardOrder, savedLayouts };
        
        // Save to localStorage immediately (synchronous)
        localStorage.setItem('dashboard_preferences', JSON.stringify(prefs));
        
        // Save to database in background (non-blocking)
        const user = await base44.auth.me();
        const existing = await base44.entities.UserPreferences.filter({ user_email: user.email });
        
        if (existing.length > 0) {
          await base44.entities.UserPreferences.update(existing[0].id, {
            dashboard_preferences: prefs
          });
        } else {
          await base44.entities.UserPreferences.create({
            user_email: user.email,
            dashboard_preferences: prefs
          });
        }
      } catch (e) {
        // Silently fail
      }
    };
    
    const timeoutId = setTimeout(savePrefs, 500);
    return () => clearTimeout(timeoutId);
  }, [viewMode, clientFilter, expandedCards, visibleCards, cardOrder, savedLayouts]);

  const toggleCard = useCallback((cardName) => {
    startTransition(() => {
      setExpandedCards(prev => ({
        ...prev,
        [cardName]: !prev[cardName]
      }));
    });
  }, []);

  const saveCurrentLayout = useCallback(() => {
    if (!layoutName.trim()) return;
    
    const newLayout = {
      id: Date.now().toString(),
      name: layoutName,
      viewMode,
      expandedCards,
      visibleCards,
      cardOrder,
      createdAt: new Date().toISOString()
    };
    
    startTransition(() => {
      setSavedLayouts(prev => [...prev, newLayout]);
      setLayoutName('');
      setShowSaveLayoutDialog(false);
    });
  }, [layoutName, viewMode, expandedCards, visibleCards, cardOrder]);

  const loadLayout = useCallback((layout) => {
    startTransition(() => {
      setViewMode(layout.viewMode);
      setExpandedCards(layout.expandedCards);
      setVisibleCards(layout.visibleCards);
      setCardOrder(layout.cardOrder);
    });
  }, []);

  const deleteLayout = useCallback((layoutId) => {
    startTransition(() => {
      setSavedLayouts(prev => prev.filter(l => l.id !== layoutId));
    });
  }, []);

  // ESC key to close focus mode
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && focusedCard) {
        startTransition(() => {
          setFocusedCard(null);
        });
      }
    };
    
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [focusedCard]);

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const currentUser = await base44.auth.me();

      let canSeeAllTimeLogs = currentUser?.role === 'admin';
      if (!canSeeAllTimeLogs && currentUser?.email) {
        const rows = await base44.entities.AccessControl.filter({ email: currentUser.email, active: true }).catch(() => []);
        const validRows = Array.isArray(rows) ? rows : [];
        // Check if ANY active permission grants manager_plus or higher
        canSeeAllTimeLogs = validRows.some(row => ['manager_plus', 'admin', 'super_admin'].includes(row.role));
      }

      const timeLogsPromise = canSeeAllTimeLogs ?
        base44.entities.TimeLog.filter({}, '-log_date', 1000) :
        base44.entities.TimeLog.filter({ created_by: currentUser.email }, '-log_date', 300);

      const allMeetings = await base44.entities.Meeting.list('-meeting_date').catch(() => []);
      
      const validMeetings = Array.isArray(allMeetings) ? allMeetings : [];
      
      const now = new Date();
      const futureMeetings = validMeetings.filter(m => {
        if (!m || !m.meeting_date) return false;
        try {
          const meetingDate = new Date(m.meeting_date);
          if (isNaN(meetingDate.getTime())) return false;
          return meetingDate >= now && ['מתוכננת', 'אושרה'].includes(m?.status);
        } catch (e) {
          return false;
        }
      });

      // 1. Fast load: Fetch only recent items and limited lists for immediate display
      const [recentProjectsData, recentQuotesData, recentTasksData, myTimeLogs, limitedClients] = await Promise.all([
        base44.entities.Project.list('-created_date', 5).catch(() => []),
        base44.entities.Quote.list('-created_date', 5).catch(() => []),
        base44.entities.Task.filter({ status: { $ne: 'הושלמה' } }, '-due_date', 5).catch(() => []),
        timeLogsPromise.catch(() => []),
        base44.entities.Client.list('-created_date', 20).catch(() => []) // Limit clients for dropdowns initially
      ]);

      setRecentProjects(Array.isArray(recentProjectsData) ? recentProjectsData : []);
      setUpcomingTasks(Array.isArray(recentTasksData) ? recentTasksData : []);
      setQuotes(Array.isArray(recentQuotesData) ? recentQuotesData : []);
      setTimeLogs(Array.isArray(myTimeLogs) ? myTimeLogs : []);
      setUpcomingMeetings(futureMeetings.slice(0, 10));
      setAllClients(Array.isArray(limitedClients) ? limitedClients : []);
      
      // Stop spinner here - user sees the dashboard
      setLoading(false);

      // 2. Background load: Fetch counts and full lists via optimized backend function
      base44.functions.invoke('getDashboardStats').then(({ data }) => {
        if (data && !data.error) {
          const { clients, projects, quotes, tasks, allClients, allProjects, allTasks } = data;
          
          // Use stats from backend directly
          setStats({ clients, projects, quotes, tasks });
          
          // Update full lists if provided (backend handles deduplication)
          if (Array.isArray(allClients)) {
             setAllClients(filterClients(allClients));
          }
          if (Array.isArray(allProjects)) setAllProjects(allProjects);
          if (Array.isArray(allTasks)) setAllTasks(allTasks);
        }
      }).catch(e => console.warn("Background stats fetch failed", e));

    } catch (error) {
      console.error("Dashboard initial load failed", error);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
    const onTimelogCreated = () => { loadDashboardData(); };
    window.addEventListener('timelog:created', onTimelogCreated);
    return () => { window.removeEventListener('timelog:created', onTimelogCreated); };
  }, [loadDashboardData, filterClients]);



  const currentView = VIEW_MODES.find(v => v.value === viewMode) || VIEW_MODES[1];
  const ViewIcon = currentView.icon;

  const displayedClientCount = React.useMemo(() => {
    if (!allClients) return 0;
    switch (clientFilter) {
      case 'all': return allClients.length;
      case 'active': return allClients.filter(c => c.status === 'פעיל').length;
      case 'potential': return allClients.filter(c => c.status === 'פוטנציאלי').length;
      default: return allClients.filter(c => c.status === 'פעיל').length;
    }
  }, [allClients, clientFilter]);

  const clientFilterLabel = React.useMemo(() => {
    switch (clientFilter) {
      case 'all': return 'כל הלקוחות';
      case 'active': return 'לקוחות פעילים';
      case 'potential': return 'לקוחות פוטנציאליים';
      default: return 'לקוחות פעילים';
    }
  }, [clientFilter]);
  
  const getGridClass = () => {
    if (viewMode === 'grid-2') return 'grid grid-cols-1 md:grid-cols-2 gap-6';
    if (viewMode === 'grid-3') return 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6';
    if (viewMode === 'grid-4') return 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4';
    if (viewMode === 'list') return 'flex flex-col gap-4';
    return 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6';
  };

  return (
    <div className={`${isMobile ? 'p-3 pb-24' : 'p-6'} min-h-screen`} dir="rtl" style={{ backgroundColor: '#FCF6E3' }}>
      <div className="max-w-7xl mx-auto" dir="rtl">
        {/* Header */}
        <div className={isMobile ? "mb-4" : "mb-8"} dir="rtl">
          <div className={`${isMobile ? 'px-4 py-4' : 'px-8 py-6'} rounded-2xl shadow-md`} style={{ backgroundColor: '#2C3E50' }} dir="rtl">
            <div className="flex justify-between items-center" dir="rtl">
              <div className="flex-1 text-right" dir="rtl">
                <h1 className={`${isMobile ? 'text-xl' : 'text-3xl'} font-bold text-white mb-1 text-right`}>
                  {isMobile ? 'CRM טננבאום' : 'ניהול לקוחות CRM'}
                </h1>
                {!isMobile && (
                  <p className="text-slate-300 text-sm text-right">
                    סקירה כללית על הפעילות העסקית
                  </p>
                )}
              </div>
              
              <div className="flex gap-3" dir="rtl">
                {!isMobile && (
                  <Suspense fallback={<div className="w-8 h-8 rounded-full bg-slate-200 animate-pulse" />}>
                    <ReminderManager />
                  </Suspense>
                )}
                
                {/* Saved Layouts Selector */}
                {!isMobile && savedLayouts.length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="icon"
                        title="תצוגות שמורות"
                        className="bg-white/10 border-white/20 hover:bg-white/20 text-white"
                      >
                        <Bookmark className="w-5 h-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-64" dir="rtl">
                      <DropdownMenuLabel>תצוגות שמורות</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {savedLayouts.map((layout) => (
                        <div key={layout.id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-100 rounded-sm">
                          <button
                            onClick={() => {
                              startTransition(() => {
                                loadLayout(layout);
                              });
                            }}
                            className="flex-1 text-right text-sm hover:text-blue-600 transition-colors"
                          >
                            {layout.name}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteLayout(layout.id);
                            }}
                            className="p-1 hover:bg-red-100 rounded"
                          >
                            <Trash2 className="w-3 h-3 text-red-600" />
                          </button>
                        </div>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                
                {/* Save Current Layout */}
                {!isMobile && (
                  <Button 
                    variant="outline" 
                    size="icon"
                    title="שמור תצוגה נוכחית"
                    onClick={() => {
                      startTransition(() => {
                        setShowSaveLayoutDialog(true);
                      });
                    }}
                    className="bg-white/10 border-white/20 hover:bg-white/20 text-white"
                  >
                    <Save className="w-5 h-5" />
                  </Button>
                )}
                
                {/* View Mode Selector */}
                {!isMobile && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="icon"
                        title="סוג תצוגה"
                        className="bg-white/10 border-white/20 hover:bg-white/20 text-white"
                      >
                        <ViewIcon className="w-5 h-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56" dir="rtl">
                      <DropdownMenuLabel>בחר תצוגה</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {VIEW_MODES.map((mode) => {
                        const Icon = mode.icon;
                        return (
                          <DropdownMenuItem
                            key={mode.value}
                            onClick={() => {
                              startTransition(() => {
                                setViewMode(mode.value);
                              });
                            }}
                            className={`gap-3 ${viewMode === mode.value ? 'bg-blue-50' : ''}`}
                          >
                            <Icon className="w-4 h-4" />
                            <span className="flex-1">{mode.label}</span>
                            {viewMode === mode.value && <Eye className="w-4 h-4 text-blue-600" />}
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                
                {/* Settings */}
                {!isMobile && (
                  <Button 
                    variant="outline" 
                    size="icon" 
                    title="התאמה אישית" 
                    onClick={() => {
                      startTransition(() => {
                        setShowCustomizer(true);
                      });
                    }}
                    className="bg-white/10 border-white/20 hover:bg-white/20 text-white"
                  >
                    <Settings className="w-5 h-5" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stats and Quick Actions handled in the grid */}

        {/* Cards Grid */}
        <Suspense fallback={<div className="text-center py-8"><div className="animate-spin w-8 h-8 border-4 border-slate-300 border-t-blue-600 rounded-full mx-auto"></div></div>}>
        <div 
          className={focusedCard ? 'fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-6' : getGridClass()} 
          dir="rtl"
          onClick={(e) => {
            if (focusedCard && e.target === e.currentTarget) {
              startTransition(() => {
                setFocusedCard(null);
              });
            }
          }}
        >
          {cardOrder.map((cardDef) => {
            const cardId = cardDef.id;
            
            // Check visibility
            if (!visibleCards[cardId]) return null;

            // Stats Widget
            if (cardId === 'stats') {
              return (
                <div key={cardId} className="h-full">
                  <StatsWidget 
                    stats={stats}
                    displayedClientCount={displayedClientCount}
                    clientFilter={clientFilter}
                    setClientFilter={setClientFilter}
                    clientFilterLabel={clientFilterLabel}
                    isMobile={isMobile}
                  />
                </div>
              );
            }

            // Quick Actions
            if (cardId === 'quickActions') {
              return (
                <div key={cardId} className="h-full">
                  <QuickCreationTabs clients={allClients} onUpdate={loadDashboardData} />
                </div>
              );
            }

            // Upcoming Deadlines
            if (cardId === 'upcomingDeadlines') {
              return (
                <div key={cardId} className="h-full">
                  <UpcomingDeadlinesWidget tasks={upcomingTasks} meetings={upcomingMeetings} />
                </div>
              );
            }

            // Activity Feed
            if (cardId === 'activityFeed') {
              return (
                <div key={cardId} className="h-full">
                  <ActivityFeedWidget 
                    recentProjects={recentProjects}
                    recentQuotes={quotes}
                    upcomingTasks={upcomingTasks}
                    recentClients={allClients.slice(0, 5)} // Pass some recent clients
                  />
                </div>
              );
            }
            
            // Skip non-focused cards in focus mode
            if (focusedCard && focusedCard !== cardId) return null;

            // AI Insights
            if (cardId === 'aiInsights') {
              return <div key={cardId}><AIInsightsPanel /></div>;
            }

            // Projects Overview
            if (cardId === 'projectsOverview') {
              return <div key={cardId}><ProjectsOverview isExpanded={expandedCards.projectsOverview !== false} /></div>;
            }

            // Recent Projects
            if (cardId === 'recentProjects') {
              return (
                <Card key={cardId} className={`bg-white shadow-md ${focusedCard === cardId ? 'w-full max-w-6xl max-h-[90vh] overflow-y-auto' : ''}`}>
                  <CardHeader 
                    className="border-b cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => toggleCard('projects')}
                  >
                    <CardTitle className="flex items-center justify-between text-base">
                      <span className="text-right">פרויקטים אחרונים</span>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 text-sm">{recentProjects.length}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startTransition(() => {
                              setFocusedCard(focusedCard === cardId ? null : cardId);
                            });
                          }}
                          className="p-1 hover:bg-slate-200 rounded transition-colors"
                          title={focusedCard === cardId ? "צא ממצב פוקוס" : "מצב פוקוס"}
                        >
                          {focusedCard === cardId ? (
                            <Minimize2 className="w-4 h-4 text-slate-600" />
                          ) : (
                            <Maximize2 className="w-4 h-4 text-slate-600" />
                          )}
                        </button>
                        {expandedCards.projects ? (
                          <ChevronUp className="w-5 h-5 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                    </CardTitle>
                  </CardHeader>
                  {expandedCards.projects && (
                    <CardContent className="p-0">
                      <RecentProjects projects={recentProjects} isLoading={loading} onUpdate={loadDashboardData} />
                    </CardContent>
                  )}
                </Card>
              );
            }

            // Recent Clients
            if (cardId === 'recentClients') {
              return (
                <Card key={cardId} className={`bg-white shadow-md ${focusedCard === cardId ? 'w-full max-w-6xl max-h-[90vh] overflow-y-auto' : ''}`}>
                  <CardHeader 
                    className="border-b cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => toggleCard('clients')}
                  >
                    <CardTitle className="flex items-center justify-between text-base">
                      <span className="text-right">לקוחות אחרונים</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startTransition(() => {
                              setFocusedCard(focusedCard === cardId ? null : cardId);
                            });
                          }}
                          className="p-1 hover:bg-slate-200 rounded transition-colors"
                          title={focusedCard === cardId ? "צא ממצב פוקוס" : "מצב פוקוס"}
                        >
                          {focusedCard === cardId ? (
                            <Minimize2 className="w-4 h-4 text-slate-600" />
                          ) : (
                            <Maximize2 className="w-4 h-4 text-slate-600" />
                          )}
                        </button>
                        {expandedCards.clients ? (
                          <ChevronUp className="w-5 h-5 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                    </CardTitle>
                  </CardHeader>
                  {expandedCards.clients && (
                    <CardContent className="p-0">
                      <RecentClients isLoading={loading} />
                    </CardContent>
                  )}
                </Card>
              );
            }

            // Upcoming Tasks
            if (cardId === 'upcomingTasks') {
              return (
                <Card key={cardId} className={`bg-white shadow-md ${focusedCard === cardId ? 'w-full max-w-6xl max-h-[90vh] overflow-y-auto' : ''}`}>
                  <CardHeader 
                    className="border-b cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => toggleCard('tasks')}
                  >
                    <CardTitle className="flex items-center justify-between text-base">
                      <span className="text-right">משימות קרובות</span>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 text-sm">{upcomingTasks.length}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startTransition(() => {
                              setFocusedCard(focusedCard === cardId ? null : cardId);
                            });
                          }}
                          className="p-1 hover:bg-slate-200 rounded transition-colors"
                          title={focusedCard === cardId ? "צא ממצב פוקוס" : "מצב פוקוס"}
                        >
                          {focusedCard === cardId ? (
                            <Minimize2 className="w-4 h-4 text-slate-600" />
                          ) : (
                            <Maximize2 className="w-4 h-4 text-slate-600" />
                          )}
                        </button>
                        {expandedCards.tasks ? (
                          <ChevronUp className="w-5 h-5 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                    </CardTitle>
                  </CardHeader>
                  {expandedCards.tasks && (
                    <CardContent className="p-0">
                      <UpcomingTasks tasks={upcomingTasks} isLoading={loading} onUpdate={loadDashboardData} clients={allClients} />
                    </CardContent>
                  )}
                </Card>
              );
            }

            // Quote Status
            if (cardId === 'quoteStatus') {
              return (
                <Card key={cardId} className={`bg-white shadow-md ${focusedCard === cardId ? 'w-full max-w-6xl max-h-[90vh] overflow-y-auto' : ''}`}>
                  <CardHeader 
                    className="border-b cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => toggleCard('quotes')}
                  >
                    <CardTitle className="flex items-center justify-between text-base">
                      <span className="text-right">הצעות מחיר</span>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 text-sm">{quotes.length}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startTransition(() => {
                              setFocusedCard(focusedCard === cardId ? null : cardId);
                            });
                          }}
                          className="p-1 hover:bg-slate-200 rounded transition-colors"
                          title={focusedCard === cardId ? "צא ממצב פוקוס" : "מצב פוקוס"}
                        >
                          {focusedCard === cardId ? (
                            <Minimize2 className="w-4 h-4 text-slate-600" />
                          ) : (
                            <Maximize2 className="w-4 h-4 text-slate-600" />
                          )}
                        </button>
                        {expandedCards.quotes ? (
                          <ChevronUp className="w-5 h-5 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                    </CardTitle>
                  </CardHeader>
                  {expandedCards.quotes && (
                    <CardContent className="p-0">
                      <QuoteStatus quotes={quotes} isLoading={loading} clients={allClients} onUpdate={loadDashboardData} />
                    </CardContent>
                  )}
                </Card>
              );
            }

            // Timer Logs
            if (cardId === 'timerLogs') {
              return (
                <Card key={cardId} className={`bg-white shadow-md ${focusedCard === cardId ? 'w-full max-w-6xl max-h-[90vh] overflow-y-auto' : ''}`}>
                  <CardHeader 
                    className="border-b cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => toggleCard('timeLogs')}
                  >
                    <CardTitle className="flex items-center justify-between text-base">
                      <span className="text-right">לוגי זמן</span>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 text-sm">{timeLogs.length}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startTransition(() => {
                              setFocusedCard(focusedCard === cardId ? null : cardId);
                            });
                          }}
                          className="p-1 hover:bg-slate-200 rounded transition-colors"
                          title={focusedCard === cardId ? "צא ממצב פוקוס" : "מצב פוקוס"}
                        >
                          {focusedCard === cardId ? (
                            <Minimize2 className="w-4 h-4 text-slate-600" />
                          ) : (
                            <Maximize2 className="w-4 h-4 text-slate-600" />
                          )}
                        </button>
                        {expandedCards.timeLogs ? (
                          <ChevronUp className="w-5 h-5 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                    </CardTitle>
                  </CardHeader>
                  {expandedCards.timeLogs && (
                    <CardContent className="p-0">
                      <TimerLogs timeLogs={timeLogs} isLoading={loading} onUpdate={loadDashboardData} clients={allClients} />
                    </CardContent>
                  )}
                </Card>
              );
            }

            // Upcoming Meetings
            if (cardId === 'upcomingMeetings') {
              return (
                <Card key={cardId} className={`bg-white shadow-md ${focusedCard === cardId ? 'w-full max-w-6xl max-h-[90vh] overflow-y-auto' : ''}`}>
                  <CardHeader 
                    className="border-b cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => toggleCard('meetings')}
                  >
                    <CardTitle className="flex items-center justify-between text-base">
                      <span className="text-right">פגישות קרובות</span>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 text-sm">{upcomingMeetings.length}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startTransition(() => {
                              setFocusedCard(focusedCard === cardId ? null : cardId);
                            });
                          }}
                          className="p-1 hover:bg-slate-200 rounded transition-colors"
                          title={focusedCard === cardId ? "צא ממצב פוקוס" : "מצב פוקוס"}
                        >
                          {focusedCard === cardId ? (
                            <Minimize2 className="w-4 h-4 text-slate-600" />
                          ) : (
                            <Maximize2 className="w-4 h-4 text-slate-600" />
                          )}
                        </button>
                        {expandedCards.meetings ? (
                          <ChevronUp className="w-5 h-5 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                    </CardTitle>
                  </CardHeader>
                  {expandedCards.meetings && (
                    <CardContent className="p-0">
                      <UpcomingMeetings meetings={upcomingMeetings} isLoading={loading} onUpdate={loadDashboardData} clients={allClients} />
                    </CardContent>
                  )}
                </Card>
              );
            }

            return null;
          })}
        </div>
        </Suspense>
      </div>

      {/* Customizer Dialog */}
      <Suspense fallback={null}>
        {showCustomizer && (
          <DashboardCustomizer
            open={showCustomizer}
            onClose={() => {
              startTransition(() => {
                setShowCustomizer(false);
              });
            }}
            visibleCards={visibleCards}
            cardOrder={cardOrder}
            onSave={({ visibleCards: newVisible, cardOrder: newOrder }) => {
              startTransition(() => {
                setVisibleCards(newVisible);
                setCardOrder(newOrder);
              });
            }}
          />
        )}
      </Suspense>

      {/* Save Layout Dialog */}
      <Dialog open={showSaveLayoutDialog} onOpenChange={setShowSaveLayoutDialog}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right">שמור תצוגה נוכחית</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4" dir="rtl">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block text-right">
                שם התצוגה
              </label>
              <Input
                value={layoutName}
                onChange={(e) => setLayoutName(e.target.value)}
                placeholder="לדוגמה: תצוגה יומית, דוח שבועי..."
                className="text-right"
                dir="rtl"
              />
            </div>
            <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg text-right" dir="rtl">
              <p className="font-semibold mb-1">התצוגה תכלול:</p>
              <ul className="space-y-1 mr-4 list-disc">
                <li>סדר הכרטיסים</li>
                <li>כרטיסים גלויים/מוסתרים</li>
                <li>כרטיסים מורחבים/מכווצים</li>
                <li>סוג התצוגה (רשת/רשימה)</li>
              </ul>
            </div>
            <div className="flex gap-2 justify-end" dir="rtl">
              <Button
                variant="outline"
                onClick={() => {
                  startTransition(() => {
                    setShowSaveLayoutDialog(false);
                    setLayoutName('');
                  });
                }}
              >
                ביטול
              </Button>
              <Button
                onClick={saveCurrentLayout}
                disabled={!layoutName.trim()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Save className="w-4 h-4 ml-2" />
                שמור
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}