import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  Smartphone
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
import { useIsMobile } from "../components/utils/useMediaQuery";
import PullToRefresh from "../components/mobile/PullToRefresh";

const VIEW_MODE_OPTIONS = [
  { value: 'list', label: 'שורות', icon: LayoutList },
  { value: 'grid-small', label: 'רשת קטנה (4 עמודות)', icon: Grid3x3 },
  { value: 'grid-medium', label: 'רשת בינונית (3 עמודות)', icon: LayoutGrid },
  { value: 'grid-large', label: 'רשת גדולה (2 עמודות)', icon: Grid2x2 },
  { value: 'vertical', label: 'אנכי (עמודה אחת)', icon: AlignLeft },
  { value: 'kanban', label: 'לוח קנבן', icon: Columns },
  { value: 'timeline', label: 'ציר זמן', icon: Calendar },
  { value: 'analytics', label: 'אנליטיקה חזותית', icon: BarChart3 },
  { value: 'heatmap', label: 'מפת חום פעילות', icon: Activity },
  { value: 'trends', label: 'גרף מגמות', icon: TrendingUp },
];

const getGridClass = (viewMode) => {
  switch (viewMode) {
    case 'list':
      return 'grid grid-cols-1 gap-4';
    case 'grid-small':
      return 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4';
    case 'grid-medium':
      return 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6';
    case 'grid-large':
      return 'grid grid-cols-1 md:grid-cols-2 gap-6';
    case 'vertical':
      return 'flex flex-col gap-4 max-w-2xl mx-auto';
    case 'kanban':
    case 'timeline':
    case 'analytics':
    case 'heatmap':
    case 'trends':
      return 'flex flex-col gap-6 w-full';
    default:
      return 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6';
  }
};

export default function Dashboard() {
  const isMobile = useIsMobile();
  const [stats, setStats] = useState({
    clients: 0,
    projects: 0,
    quotes: 0,
    tasks: 0
  });
  const [recentProjects, setRecentProjects] = useState([]);
  const [upcomingTasks, setUpcomingTasks] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [timeLogs, setTimeLogs] = useState([]);
  const [upcomingMeetings, setUpcomingMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [allClients, setAllClients] = useState([]);
  const [allProjects, setAllProjects] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [showDashboardSettings, setShowDashboardSettings] = useState(false);
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [dashboardCards, setDashboardCards] = useState(() => {
    try {
      const saved = localStorage.getItem('dashboard-cards-order');
      return saved ? JSON.parse(saved) : [
        { id: 'stats', name: 'סטטיסטיקות', visible: true, size: 'full' },
        { id: 'projectsOverview', name: 'סקירת פרויקטים', visible: true, size: 'large' },
        { id: 'recentProjects', name: 'פרויקטים אחרונים', visible: true, size: 'medium' },
        { id: 'recentClients', name: 'לקוחות אחרונים', visible: true, size: 'medium' },
        { id: 'upcomingTasks', name: 'משימות קרובות', visible: true, size: 'medium' },
        { id: 'quoteStatus', name: 'הצעות מחיר', visible: true, size: 'medium' },
        { id: 'timerLogs', name: 'לוגי זמן', visible: true, size: 'medium' },
        { id: 'upcomingMeetings', name: 'פגישות קרובות', visible: true, size: 'medium' }
      ];
    } catch {
      return [
        { id: 'stats', name: 'סטטיסטיקות', visible: true, size: 'full' },
        { id: 'projectsOverview', name: 'סקירת פרויקטים', visible: true, size: 'large' },
        { id: 'recentProjects', name: 'פרויקטים אחרונים', visible: true, size: 'medium' },
        { id: 'recentClients', name: 'לקוחות אחרונים', visible: true, size: 'medium' },
        { id: 'upcomingTasks', name: 'משימות קרובות', visible: true, size: 'medium' },
        { id: 'quoteStatus', name: 'הצעות מחיר', visible: true, size: 'medium' },
        { id: 'timerLogs', name: 'לוגי זמן', visible: true, size: 'medium' },
        { id: 'upcomingMeetings', name: 'פגישות קרובות', visible: true, size: 'medium' }
      ];
    }
  });

  const getSizeClass = (size) => {
    const sizeMap = {
      'small': 'md:col-span-1',
      'medium': 'md:col-span-2', 
      'large': 'md:col-span-3',
      'full': 'md:col-span-4'
    };
    return sizeMap[size] || 'md:col-span-2';
  };

  const [viewMode, setViewMode] = useState(() => {
    try {
      return localStorage.getItem('dashboard-view-mode') || 'grid-medium';
    } catch {
      return 'grid-medium';
    }
  });

  const [compactHeaders, setCompactHeaders] = useState(() => {
    try {
      return localStorage.getItem('dashboard-compact-headers') === 'true';
    } catch {
      return false;
    }
  });

  const [expandedCards, setExpandedCards] = useState(() => {
    try {
      const saved = localStorage.getItem('dashboard-expanded-cards');
      return saved ? JSON.parse(saved) : {
        projects: true,
        clients: true,
        tasks: true,
        quotes: true,
        timeLogs: true,
        meetings: true
      };
    } catch {
      return {
        projects: true,
        clients: true,
        tasks: true,
        quotes: true,
        timeLogs: true,
        meetings: true
      };
    }
  });

  const [dashboardSettings, setDashboardSettings] = useState(() => {
    try {
      const raw = localStorage.getItem("app-preferences");
      const p = raw ? JSON.parse(raw) : {};
      const dp = p.dashboardSettings || {};
      return {
        showWeeklyGoals: dp.showWeeklyGoals !== undefined ? dp.showWeeklyGoals : false,
        showStats: dp.showStats !== undefined ? dp.showStats : true,
        showRecentProjects: dp.showRecentProjects !== undefined ? dp.showRecentProjects : true,
        showUpcomingTasks: dp.showUpcomingTasks !== undefined ? dp.showUpcomingTasks : true,
        showQuoteStatus: dp.showQuoteStatus !== undefined ? dp.showQuoteStatus : true,
        showTimerLogs: dp.showTimerLogs !== undefined ? dp.showTimerLogs : true,
        showMeetings: dp.showMeetings !== undefined ? dp.showMeetings : true,
      };
    } catch (e) {
      return {
        showWeeklyGoals: false,
        showStats: true,
        showRecentProjects: true,
        showUpcomingTasks: true,
        showQuoteStatus: true,
        showTimerLogs: true,
        showMeetings: true,
      };
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('dashboard-expanded-cards', JSON.stringify(expandedCards));
    } catch (e) {
      console.error('Error saving expanded cards:', e);
    }
  }, [expandedCards]);

  useEffect(() => {
    try {
      localStorage.setItem('dashboard-view-mode', viewMode);
    } catch (e) {
      console.error('Error saving view mode:', e);
    }
  }, [viewMode]);

  useEffect(() => {
    try {
      localStorage.setItem('dashboard-compact-headers', compactHeaders.toString());
    } catch (e) {
      console.error('Error saving compact headers:', e);
    }
  }, [compactHeaders]);

  const toggleCard = useCallback((cardName) => {
    setExpandedCards(prev => ({
      ...prev,
      [cardName]: !prev[cardName]
    }));
  }, []);

  const updateDashboardSettings = useCallback((newSettings) => {
    setDashboardSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      try {
        const raw = localStorage.getItem("app-preferences");
        const prefs = raw ? JSON.parse(raw) : {};
        const mergedAppPrefs = {
          ...prefs,
          dashboardSettings: updated,
        };
        localStorage.setItem("app-preferences", JSON.stringify(mergedAppPrefs));
        window.dispatchEvent(new CustomEvent("preferences:changed", { detail: mergedAppPrefs }));
      } catch (e) {
        console.error("Failed saving dashboard settings to localStorage", e);
      }
      return updated;
    });
  }, []);

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

  useEffect(() => {
    const onPrefsChanged = (e) => {
      const p = e.detail || {};
      const dp = p.dashboardSettings || {};
      setDashboardSettings({
        showWeeklyGoals: dp.showWeeklyGoals !== undefined ? dp.showWeeklyGoals : false,
        showStats: dp.showStats !== undefined ? dp.showStats : true,
        showRecentProjects: dp.showRecentProjects !== undefined ? dp.showRecentProjects : true,
        showUpcomingTasks: dp.showUpcomingTasks !== undefined ? dp.showUpcomingTasks : true,
        showQuoteStatus: dp.showQuoteStatus !== undefined ? dp.showQuoteStatus : true,
        showTimerLogs: dp.showTimerLogs !== undefined ? dp.showTimerLogs : true,
        showMeetings: dp.showMeetings !== undefined ? dp.showMeetings : true,
      });
    };
    window.addEventListener("preferences:changed", onPrefsChanged);
    return () => window.removeEventListener("preferences:changed", onPrefsChanged);
  }, []);

  const currentViewOption = VIEW_MODE_OPTIONS.find(opt => opt.value === viewMode) || VIEW_MODE_OPTIONS[2];
  const CurrentViewIcon = currentViewOption.icon;

  return (
    <div className={`${isMobile ? 'p-3 pb-24' : 'p-6'} min-h-screen`} dir="rtl" style={{ backgroundColor: '#FCF6E3' }}>
      <DashboardSettings
        visible={showDashboardSettings}
        settings={dashboardSettings}
        onChange={updateDashboardSettings}
        onClose={() => setShowDashboardSettings(false)}
      />

      <div className="max-w-7xl mx-auto" dir="rtl">
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
              <div className={`flex gap-2 ${isMobile ? 'flex-col' : 'gap-3'}`} dir="rtl">
                {!isMobile && <ReminderManager />}
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="outline"
                      size={isMobile ? "sm" : "icon"}
                      title="מצב תצוגה"
                      className={`bg-white/10 border-white/20 hover:bg-white/20 text-white ${isMobile ? 'px-3' : ''}`}
                    >
                      <CurrentViewIcon className={isMobile ? "w-4 h-4" : "w-5 h-5"} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64" dir="rtl">
                    <DropdownMenuLabel className="text-right">מצב תצוגה</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {VIEW_MODE_OPTIONS.map((option) => {
                      const OptionIcon = option.icon;
                      return (
                        <DropdownMenuItem
                          key={option.value}
                          onClick={() => setViewMode(option.value)}
                          className={`flex items-center gap-3 cursor-pointer ${
                            viewMode === option.value ? 'bg-blue-50 text-blue-700' : ''
                          }`}
                        >
                          <OptionIcon className={`w-4 h-4 ${viewMode === option.value ? 'text-blue-600' : 'text-slate-600'}`} />
                          <span className="flex-1 text-right">{option.label}</span>
                          {viewMode === option.value && (
                            <Eye className="w-4 h-4 text-blue-600" />
                          )}
                        </DropdownMenuItem>
                      );
                    })}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setCompactHeaders(!compactHeaders)}
                      className="flex items-center gap-3 cursor-pointer"
                    >
                      {compactHeaders ? (
                        <Maximize2 className="w-4 h-4 text-slate-600" />
                      ) : (
                        <Minimize2 className="w-4 h-4 text-slate-600" />
                      )}
                      <span className="flex-1 text-right">
                        {compactHeaders ? 'הרחב כותרות' : 'מזעור כותרות'}
                      </span>
                      {compactHeaders && (
                        <Eye className="w-4 h-4 text-blue-600" />
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => {
                        const current = localStorage.getItem('force-mobile-view');
                        if (current === 'true') {
                          localStorage.removeItem('force-mobile-view');
                        } else {
                          localStorage.setItem('force-mobile-view', 'true');
                        }
                        window.dispatchEvent(new Event('force-mobile-changed'));
                        window.location.reload();
                      }}
                      className="flex items-center gap-3 cursor-pointer"
                    >
                      <Smartphone className="w-4 h-4 text-slate-600" />
                      <span className="flex-1 text-right">
                        {localStorage.getItem('force-mobile-view') === 'true' ? 'בטל תצוגת מובייל' : 'הפעל תצוגת מובייל'}
                      </span>
                      {localStorage.getItem('force-mobile-view') === 'true' && (
                        <Eye className="w-4 h-4 text-blue-600" />
                      )}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {!isMobile && (
                <>
                <Button 
                  variant="outline" 
                  size="icon" 
                  title="התאמה אישית" 
                  onClick={() => setShowCustomizer(true)}
                  className="bg-white/10 border-white/20 hover:bg-white/20 text-white"
                >
                  <LayoutGrid className="w-5 h-5" />
                </Button>

                <Button 
                  variant="outline" 
                  size="icon" 
                  title="הגדרות לוח מחוונים" 
                  onClick={() => setShowDashboardSettings(true)}
                  className="bg-white/10 border-white/20 hover:bg-white/20 text-white"
                >
                  <Settings className="w-5 h-5" />
                </Button>
                </>
                )}
              </div>
            </div>
          </div>
        </div>

        {dashboardSettings.showStats && (
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
                <CardHeader className={compactHeaders ? "pb-1" : "pb-2"}>
                  <CardTitle className={`text-sm text-slate-600 font-normal text-center ${compactHeaders ? 'text-xs' : ''}`}>
                    לקוחות פעילים
                  </CardTitle>
                </CardHeader>
                <CardContent className={compactHeaders ? "pt-2" : ""}>
                  <div className={`font-bold text-center mb-2 ${compactHeaders ? 'text-3xl' : 'text-4xl'}`}>
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
                <CardHeader className={compactHeaders ? "pb-1" : "pb-2"}>
                  <CardTitle className={`text-sm text-slate-600 font-normal text-center ${compactHeaders ? 'text-xs' : ''}`}>
                    פרויקטים פעילים
                  </CardTitle>
                </CardHeader>
                <CardContent className={compactHeaders ? "pt-2" : ""}>
                  <div className={`font-bold text-center mb-2 ${compactHeaders ? 'text-3xl' : 'text-4xl'}`}>
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
                <CardHeader className={compactHeaders ? "pb-1" : "pb-2"}>
                  <CardTitle className={`text-sm text-slate-600 font-normal text-center ${compactHeaders ? 'text-xs' : ''}`}>
                    הצעות בהמתנה
                  </CardTitle>
                </CardHeader>
                <CardContent className={compactHeaders ? "pt-2" : ""}>
                  <div className={`font-bold text-center mb-2 ${compactHeaders ? 'text-3xl' : 'text-4xl'}`}>
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
                <CardHeader className={compactHeaders ? "pb-1" : "pb-2"}>
                  <CardTitle className={`text-sm text-slate-600 font-normal text-center ${compactHeaders ? 'text-xs' : ''}`}>
                    משימות פתוחות
                  </CardTitle>
                </CardHeader>
                <CardContent className={compactHeaders ? "pt-2" : ""}>
                  <div className={`font-bold text-center mb-2 ${compactHeaders ? 'text-3xl' : 'text-4xl'}`}>
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

        <div dir="rtl">
          {!compactHeaders && !['kanban', 'timeline', 'analytics', 'heatmap', 'trends'].includes(viewMode) && (
            <h2 className="text-xl font-bold text-slate-800 mb-4 text-right">פעילויות אחרונות</h2>
          )}

          {/* Special Views */}
          {viewMode === 'kanban' && (
            <KanbanView tasks={allTasks} onUpdate={loadDashboardData} />
          )}

          {viewMode === 'timeline' && (
            <TimelineView 
              tasks={upcomingTasks} 
              meetings={upcomingMeetings} 
              projects={recentProjects} 
            />
          )}

          {viewMode === 'analytics' && (
            <AnalyticsView 
              clients={allClients}
              projects={allProjects}
              tasks={allTasks}
              quotes={quotes}
            />
          )}

          {viewMode === 'heatmap' && (
            <HeatmapView 
              tasks={allTasks}
              timeLogs={timeLogs}
              meetings={upcomingMeetings}
            />
          )}

          {viewMode === 'trends' && (
            <TrendsView 
              clients={allClients}
              projects={allProjects}
              tasks={allTasks}
              quotes={quotes}
            />
          )}

          {/* Regular Grid Views */}
          {!['kanban', 'timeline', 'analytics', 'heatmap', 'trends'].includes(viewMode) && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 auto-rows-min" dir="rtl">
            {dashboardCards.map(card => {
              if (!card.visible) return null;
              
              const sizeClass = getSizeClass(card.size);

              if (card.id === 'projectsOverview') {
                return (
                  <div key={card.id} className={sizeClass}>
                    <ProjectsOverview compactHeader={compactHeaders} isExpanded={expandedCards.projectsOverview !== false} />
                  </div>
                );
              }

              if (card.id === 'recentProjects' && dashboardSettings.showRecentProjects) {
                return (
                  <Card key={card.id} className={`bg-white shadow-md ${sizeClass}`}>
                    <CardHeader 
                      className={`border-b cursor-pointer hover:bg-slate-50 transition-colors ${compactHeaders ? 'py-3' : ''}`}
                      onClick={() => toggleCard('projects')}
                    >
                      <CardTitle className={`flex items-center justify-between ${compactHeaders ? 'text-sm' : 'text-base'}`}>
                        <span className="text-right">פרויקטים אחרונים</span>
                        <div className="flex items-center gap-2">
                          <span className={`text-slate-500 ${compactHeaders ? 'text-xs' : 'text-sm'}`}>
                            {recentProjects.length}
                          </span>
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

              if (card.id === 'recentClients' && dashboardSettings.showRecentProjects) {
                return (
                  <Card key={card.id} className={`bg-white shadow-md ${sizeClass}`}>
                    <CardHeader 
                      className={`border-b cursor-pointer hover:bg-slate-50 transition-colors ${compactHeaders ? 'py-3' : ''}`}
                      onClick={() => toggleCard('clients')}
                    >
                      <CardTitle className={`flex items-center justify-between ${compactHeaders ? 'text-sm' : 'text-base'}`}>
                        <span className="text-right">לקוחות אחרונים</span>
                        <div className="flex items-center gap-2">
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

              if (card.id === 'upcomingTasks' && dashboardSettings.showUpcomingTasks) {
                return (
                  <Card key={card.id} className={`bg-white shadow-md ${sizeClass}`}>
                    <CardHeader 
                    className={`border-b cursor-pointer hover:bg-slate-50 transition-colors ${compactHeaders ? 'py-3' : ''}`}
                    onClick={() => toggleCard('tasks')}
                  >
                    <CardTitle className={`flex items-center justify-between ${compactHeaders ? 'text-sm' : 'text-base'}`}>
                      <span className="text-right">משימות קרובות</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-slate-500 ${compactHeaders ? 'text-xs' : 'text-sm'}`}>
                          {upcomingTasks.length}
                        </span>
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
                      <UpcomingTasks tasks={upcomingTasks} isLoading={loading} onUpdate={loadDashboardData} />
                    </CardContent>
                  )}
                </Card>
              );
            }

              if (card.id === 'quoteStatus' && dashboardSettings.showQuoteStatus) {
                return (
                  <Card key={card.id} className={`bg-white shadow-md ${sizeClass}`}>
                    <CardHeader 
                      className={`border-b cursor-pointer hover:bg-slate-50 transition-colors ${compactHeaders ? 'py-3' : ''}`}
                      onClick={() => toggleCard('quotes')}
                    >
                      <CardTitle className={`flex items-center justify-between ${compactHeaders ? 'text-sm' : 'text-base'}`}>
                        <span className="text-right">הצעות מחיר</span>
                        <div className="flex items-center gap-2">
                          <span className={`text-slate-500 ${compactHeaders ? 'text-xs' : 'text-sm'}`}>
                            {quotes.length}
                          </span>
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
                        <QuoteStatus quotes={quotes} isLoading={loading} />
                      </CardContent>
                    )}
                  </Card>
                );
              }

              if (card.id === 'timerLogs' && dashboardSettings.showTimerLogs) {
                return (
                  <Card key={card.id} className={`bg-white shadow-md ${sizeClass}`}>
                    <CardHeader 
                      className={`border-b cursor-pointer hover:bg-slate-50 transition-colors ${compactHeaders ? 'py-3' : ''}`}
                      onClick={() => toggleCard('timeLogs')}
                    >
                      <CardTitle className={`flex items-center justify-between ${compactHeaders ? 'text-sm' : 'text-base'}`}>
                        <span className="text-right">לוגי זמן</span>
                        <div className="flex items-center gap-2">
                          <span className={`text-slate-500 ${compactHeaders ? 'text-xs' : 'text-sm'}`}>
                            {timeLogs.length}
                          </span>
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
                        <TimerLogs timeLogs={timeLogs} isLoading={loading} onUpdate={loadDashboardData} />
                      </CardContent>
                    )}
                  </Card>
                );
              }

              if (card.id === 'upcomingMeetings' && dashboardSettings.showMeetings) {
                return (
                  <Card key={card.id} className={`bg-white shadow-md ${sizeClass}`}>
                    <CardHeader 
                      className={`border-b cursor-pointer hover:bg-slate-50 transition-colors ${compactHeaders ? 'py-3' : ''}`}
                      onClick={() => toggleCard('meetings')}
                    >
                      <CardTitle className={`flex items-center justify-between ${compactHeaders ? 'text-sm' : 'text-base'}`}>
                        <span className="text-right">פגישות קרובות</span>
                        <div className="flex items-center gap-2">
                          <span className={`text-slate-500 ${compactHeaders ? 'text-xs' : 'text-sm'}`}>
                            {upcomingMeetings.length}
                          </span>
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
                        <UpcomingMeetings meetings={upcomingMeetings} isLoading={loading} onUpdate={loadDashboardData} />
                      </CardContent>
                    )}
                  </Card>
                );
              }

              return null;
            })}
          </div>
          )}
        </div>
      </div>

      {showCustomizer && (
        <DashboardCustomizer
          open={showCustomizer}
          onClose={() => setShowCustomizer(false)}
          cards={dashboardCards}
          onSave={(newCards) => {
            setDashboardCards(newCards);
            try {
              localStorage.setItem('dashboard-cards-order', JSON.stringify(newCards));
            } catch (e) {
              console.error('Error saving cards order:', e);
            }
          }}
        />
      )}
    </div>
  );
}