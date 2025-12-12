import React, { useState, useEffect, useCallback } from "react";
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
  Trash2
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

import RecentProjects from "../components/dashboard/RecentProjects";
import RecentClients from "../components/dashboard/RecentClients";
import UpcomingTasks from "../components/dashboard/UpcomingTasks";
import QuoteStatus from "../components/dashboard/QuoteStatus";
import TimerLogs from "../components/dashboard/TimerLogs";
import ReminderManager from "../components/reminders/ReminderManager";
import DashboardSettings from "../components/dashboard/DashboardSettings";
import UpcomingMeetings from "../components/dashboard/UpcomingMeetings";
import ProjectsOverview from "../components/dashboard/ProjectsOverview";
import DashboardCustomizer from "../components/dashboard/DashboardCustomizer";
import KanbanView from "../components/dashboard/KanbanView";
import TimelineView from "../components/dashboard/TimelineView";
import AnalyticsView from "../components/dashboard/AnalyticsView";
import HeatmapView from "../components/dashboard/HeatmapView";
import TrendsView from "../components/dashboard/TrendsView";
import AIInsightsPanel from "../components/ai/AIInsightsPanel";
import { useIsMobile } from "../components/utils/useMediaQuery";

const VIEW_MODES = [
  { value: 'grid-2', label: 'רשת 2 עמודות', icon: Grid2x2 },
  { value: 'grid-3', label: 'רשת 3 עמודות', icon: LayoutGrid },
  { value: 'grid-4', label: 'רשת 4 עמודות', icon: Grid3x3 },
  { value: 'list', label: 'רשימה', icon: LayoutList }
];

export default function Dashboard() {
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(true);
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  
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
  
  // User Preferences
  const [viewMode, setViewMode] = useState('grid-3');
  const [expandedCards, setExpandedCards] = useState({
    projects: true,
    clients: true,
    tasks: true,
    quotes: true,
    timeLogs: true,
    meetings: true
  });
  const [visibleCards, setVisibleCards] = useState({
    stats: true,
    aiInsights: true,
    projectsOverview: true,
    recentProjects: true,
    recentClients: true,
    upcomingTasks: true,
    quoteStatus: true,
    timerLogs: true,
    upcomingMeetings: true
  });
  const [cardOrder, setCardOrder] = useState([
    { id: 'stats', name: 'סטטיסטיקות' },
    { id: 'aiInsights', name: 'תובנות AI' },
    { id: 'projectsOverview', name: 'סקירת פרויקטים' },
    { id: 'recentProjects', name: 'פרויקטים אחרונים' },
    { id: 'recentClients', name: 'לקוחות אחרונים' },
    { id: 'upcomingTasks', name: 'משימות קרובות' },
    { id: 'quoteStatus', name: 'הצעות מחיר' },
    { id: 'timerLogs', name: 'לוגי זמן' },
    { id: 'upcomingMeetings', name: 'פגישות קרובות' }
  ]);

  // Load preferences from database
  useEffect(() => {
    const loadPrefs = async () => {
      try {
        const user = await base44.auth.me();
        const userPrefs = await base44.entities.UserPreferences.filter({ user_email: user.email });
        
        console.log('📂 [Dashboard] Loading preferences for:', user.email);
        console.log('📂 [Dashboard] Found preferences:', userPrefs);
        
        if (userPrefs.length > 0 && userPrefs[0].dashboard_preferences) {
          const p = userPrefs[0].dashboard_preferences;
          console.log('✅ [Dashboard] Applying preferences:', p);
          
          if (p.viewMode) setViewMode(p.viewMode);
          if (p.expandedCards) setExpandedCards(p.expandedCards);
          if (p.visibleCards) setVisibleCards(p.visibleCards);
          if (p.cardOrder) setCardOrder(p.cardOrder);
          if (p.savedLayouts) setSavedLayouts(p.savedLayouts);
        } else {
          console.log('ℹ️ [Dashboard] No preferences found, using defaults');
        }
      } catch (e) {
        console.error('❌ [Dashboard] Error loading preferences:', e);
      } finally {
        setPrefsLoaded(true);
        console.log('🏁 [Dashboard] Preferences loading complete');
      }
    };
    
    loadPrefs();
  }, []);

  // Save preferences to database (debounced) - only after initial load
  useEffect(() => {
    if (!prefsLoaded) {
      console.log('⏸️ [Dashboard] Skipping save - preferences not loaded yet');
      return;
    }
    
    const savePrefs = async () => {
      try {
        const user = await base44.auth.me();
        const existing = await base44.entities.UserPreferences.filter({ user_email: user.email });
        
        const prefs = { viewMode, expandedCards, visibleCards, cardOrder, savedLayouts };
        
        console.log('💾 [Dashboard] Saving preferences:', prefs);
        
        if (existing.length > 0) {
          await base44.entities.UserPreferences.update(existing[0].id, {
            dashboard_preferences: prefs
          });
          console.log('✅ [Dashboard] Preferences updated in DB');
        } else {
          await base44.entities.UserPreferences.create({
            user_email: user.email,
            dashboard_preferences: prefs
          });
          console.log('✅ [Dashboard] Preferences created in DB');
        }
      } catch (e) {
        console.error('❌ [Dashboard] Error saving preferences:', e);
      }
    };
    
    const timeoutId = setTimeout(savePrefs, 500);
    return () => clearTimeout(timeoutId);
  }, [viewMode, expandedCards, visibleCards, cardOrder, savedLayouts, prefsLoaded]);

  const toggleCard = useCallback((cardName) => {
    setExpandedCards(prev => ({
      ...prev,
      [cardName]: !prev[cardName]
    }));
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
    
    setSavedLayouts(prev => [...prev, newLayout]);
    setLayoutName('');
    setShowSaveLayoutDialog(false);
  }, [layoutName, viewMode, expandedCards, visibleCards, cardOrder]);

  const loadLayout = useCallback((layout) => {
    setViewMode(layout.viewMode);
    setExpandedCards(layout.expandedCards);
    setVisibleCards(layout.visibleCards);
    setCardOrder(layout.cardOrder);
  }, []);

  const deleteLayout = useCallback((layoutId) => {
    setSavedLayouts(prev => prev.filter(l => l.id !== layoutId));
  }, []);

  // ESC key to close focus mode
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && focusedCard) {
        setFocusedCard(null);
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
        canSeeAllTimeLogs = !!validRows?.[0] && validRows[0].role === 'manager_plus';
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

      const [clientsData, projectsData, quotesData, tasksData, myTimeLogs] = await Promise.all([
        base44.entities.Client.list().catch(() => []),
        base44.entities.Project.list('-created_date').catch(() => []),
        base44.entities.Quote.list('-created_date').catch(() => []),
        base44.entities.Task.filter({ status: { $ne: 'הושלמה' } }, '-due_date').catch(() => []),
        timeLogsPromise.catch(() => [])
      ]);

      const validClients = Array.isArray(clientsData) ? clientsData : [];
      const validProjects = Array.isArray(projectsData) ? projectsData : [];
      const validQuotes = Array.isArray(quotesData) ? quotesData : [];
      const validTasks = Array.isArray(tasksData) ? tasksData : [];
      const validTimeLogs = Array.isArray(myTimeLogs) ? myTimeLogs : [];

      setStats({
        clients: validClients.length,
        projects: validProjects.filter((p) => p?.status !== 'הושלם').length,
        quotes: validQuotes.filter((q) => q?.status === 'בהמתנה').length,
        tasks: validTasks.length
      });

      setRecentProjects(validProjects.slice(0, 5));
      setUpcomingTasks(validTasks.slice(0, 5));
      setQuotes(validQuotes.slice(0, 5));
      setTimeLogs(validTimeLogs);
      setUpcomingMeetings(futureMeetings.slice(0, 10));
      
      // Store full data for special views
      setAllClients(validClients);
      setAllProjects(validProjects);
      setAllTasks(validTasks);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadDashboardData();
    const onTimelogCreated = () => { loadDashboardData(); };
    window.addEventListener('timelog:created', onTimelogCreated);
    return () => { window.removeEventListener('timelog:created', onTimelogCreated); };
  }, [loadDashboardData]);



  const currentView = VIEW_MODES.find(v => v.value === viewMode) || VIEW_MODES[1];
  const ViewIcon = currentView.icon;
  
  const getGridClass = () => {
    if (viewMode === 'grid-2') return 'grid grid-cols-1 md:grid-cols-2 gap-6';
    if (viewMode === 'grid-3') return 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6';
    if (viewMode === 'grid-4') return 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4';
    if (viewMode === 'list') return 'flex flex-col gap-4';
    return 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6';
  };

  // Show loading state until preferences are loaded
  if (!prefsLoaded) {
    return (
      <div className={`${isMobile ? 'p-3 pb-24' : 'p-6'} min-h-screen flex items-center justify-center`} dir="rtl" style={{ backgroundColor: '#FCF6E3' }}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-slate-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 text-lg">טוען העדפות...</p>
        </div>
      </div>
    );
  }

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
                {!isMobile && <ReminderManager />}
                
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
                            onClick={() => loadLayout(layout)}
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
                    onClick={() => setShowSaveLayoutDialog(true)}
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
                            onClick={() => setViewMode(mode.value)}
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
                    onClick={() => setShowCustomizer(true)}
                    className="bg-white/10 border-white/20 hover:bg-white/20 text-white"
                  >
                    <Settings className="w-5 h-5" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        {visibleCards.stats && (
          isMobile ? (
            /* Mobile Stats - Large Touch-Friendly Grid */
            <div className="grid grid-cols-2 gap-3 mb-4" dir="rtl">
              <Link to={createPageUrl("Clients")} className="block">
                <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg hover:shadow-xl transition-all active:scale-95">
                  <CardContent className="p-4 text-center">
                    <div className="w-14 h-14 mx-auto mb-2 rounded-2xl bg-white/20 flex items-center justify-center">
                      <Users className="w-7 h-7" />
                    </div>
                    <div className="text-3xl font-bold mb-1">{stats.clients}</div>
                    <div className="text-xs text-white/80">לקוחות פעילים</div>
                  </CardContent>
                </Card>
              </Link>

              <Link to={createPageUrl("Projects")} className="block">
                <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg hover:shadow-xl transition-all active:scale-95">
                  <CardContent className="p-4 text-center">
                    <div className="w-14 h-14 mx-auto mb-2 rounded-2xl bg-white/20 flex items-center justify-center">
                      <Briefcase className="w-7 h-7" />
                    </div>
                    <div className="text-3xl font-bold mb-1">{stats.projects}</div>
                    <div className="text-xs text-white/80">פרויקטים פעילים</div>
                  </CardContent>
                </Card>
              </Link>

              <Link to={createPageUrl("Quotes")} className="block">
                <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg hover:shadow-xl transition-all active:scale-95">
                  <CardContent className="p-4 text-center">
                    <div className="w-14 h-14 mx-auto mb-2 rounded-2xl bg-white/20 flex items-center justify-center">
                      <DollarSign className="w-7 h-7" />
                    </div>
                    <div className="text-3xl font-bold mb-1">{stats.quotes}</div>
                    <div className="text-xs text-white/80">הצעות בהמתנה</div>
                  </CardContent>
                </Card>
              </Link>

              <Link to={createPageUrl("Tasks")} className="block">
                <Card className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white shadow-lg hover:shadow-xl transition-all active:scale-95">
                  <CardContent className="p-4 text-center">
                    <div className="w-14 h-14 mx-auto mb-2 rounded-2xl bg-white/20 flex items-center justify-center">
                      <CheckSquare className="w-7 h-7" />
                    </div>
                    <div className="text-3xl font-bold mb-1">{stats.tasks}</div>
                    <div className="text-xs text-white/80">משימות פתוחות</div>
                  </CardContent>
                </Card>
              </Link>
            </div>
          ) : (
            /* Desktop Stats */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8" dir="rtl">
              <Card className="bg-white shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-slate-600 font-normal text-center">
                    לקוחות פעילים
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="font-bold text-center mb-2 text-4xl">
                    {stats.clients}
                  </div>
                  <Link to={createPageUrl("Clients")} className="block">
                    <Button variant="link" className="w-full text-xs" style={{ color: '#2C3E50' }}>
                      → כל הלקוחות
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              <Card className="bg-white shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-slate-600 font-normal text-center">
                    פרויקטים פעילים
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="font-bold text-center mb-2 text-4xl">
                    {stats.projects}
                  </div>
                  <Link to={createPageUrl("Projects")} className="block">
                    <Button variant="link" className="w-full text-xs" style={{ color: '#2C3E50' }}>
                      → כל הפרויקטים
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              <Card className="bg-white shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-slate-600 font-normal text-center">
                    הצעות בהמתנה
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="font-bold text-center mb-2 text-4xl">
                    {stats.quotes}
                  </div>
                  <Link to={createPageUrl("Quotes")} className="block">
                    <Button variant="link" className="w-full text-xs" style={{ color: '#2C3E50' }}>
                      → כל ההצעות
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              <Card className="bg-white shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-slate-600 font-normal text-center">
                    משימות פתוחות
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="font-bold text-center mb-2 text-4xl">
                    {stats.tasks}
                  </div>
                  <Link to={createPageUrl("Tasks")} className="block">
                    <Button variant="link" className="w-full text-xs" style={{ color: '#2C3E50' }}>
                      → כל המשימות
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          )
        )}

        {/* Cards Grid */}
        <div 
          className={focusedCard ? 'fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-6' : getGridClass()} 
          dir="rtl"
          onClick={(e) => {
            if (focusedCard && e.target === e.currentTarget) {
              setFocusedCard(null);
            }
          }}
        >
          {cardOrder.map((cardDef) => {
            const cardId = cardDef.id;
            
            // Skip stats - rendered separately
            if (cardId === 'stats' || !visibleCards[cardId]) return null;
            
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
                            setFocusedCard(focusedCard === cardId ? null : cardId);
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
                            setFocusedCard(focusedCard === cardId ? null : cardId);
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
                            setFocusedCard(focusedCard === cardId ? null : cardId);
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
                            setFocusedCard(focusedCard === cardId ? null : cardId);
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
                            setFocusedCard(focusedCard === cardId ? null : cardId);
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
                            setFocusedCard(focusedCard === cardId ? null : cardId);
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
      </div>

      {/* Customizer Dialog */}
      {showCustomizer && (
        <DashboardCustomizer
          open={showCustomizer}
          onClose={() => setShowCustomizer(false)}
          visibleCards={visibleCards}
          cardOrder={cardOrder}
          onSave={({ visibleCards: newVisible, cardOrder: newOrder }) => {
            setVisibleCards(newVisible);
            setCardOrder(newOrder);
          }}
        />
      )}

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
                  setShowSaveLayoutDialog(false);
                  setLayoutName('');
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