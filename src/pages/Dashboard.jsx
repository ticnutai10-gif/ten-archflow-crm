
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
  Users,
  FolderOpen,
  FileText,
  CheckSquare,
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
  ChevronUp
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

import RecentProjects from "../components/dashboard/RecentProjects";
import UpcomingTasks from "../components/dashboard/UpcomingTasks";
import QuoteStatus from "../components/dashboard/QuoteStatus";
import TimerLogs from "../components/dashboard/TimerLogs";
import ReminderManager from "../components/reminders/ReminderManager";
import DashboardSettings from "../components/dashboard/DashboardSettings";
import UpcomingMeetings from "../components/dashboard/UpcomingMeetings";
import ProjectInsightsCard from "../components/dashboard/ProjectInsightsCard";

export default function Dashboard() {
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
  const [showDashboardSettings, setShowDashboardSettings] = useState(false);

  // View mode state
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

  // Expanded/collapsed state for each card - default all CLOSED
  const [expandedCards, setExpandedCards] = useState(() => {
    try {
      const saved = localStorage.getItem('dashboard-expanded-cards');
      return saved ? JSON.parse(saved) : {
        projects: false,
        tasks: false,
        quotes: false,
        timeLogs: false,
        meetings: false
      };
    } catch {
      return {
        projects: false,
        tasks: false,
        quotes: false,
        timeLogs: false,
        meetings: false
      };
    }
  });

  // Save expanded state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('dashboard-expanded-cards', JSON.stringify(expandedCards));
    } catch (e) {
      console.error('Error saving expanded cards:', e);
    }
  }, [expandedCards]);

  // Toggle card expansion
  const toggleCard = (cardName) => {
    setExpandedCards(prev => ({
      ...prev,
      [cardName]: !prev[cardName]
    }));
  };

  // Save view mode to localStorage
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

  // Dashboard settings state
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

  // Update dashboard settings and save to localStorage
  const updateDashboardSettings = (newSettings) => {
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
  };

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const currentUser = await base44.auth.me();

      let canSeeAllTimeLogs = currentUser?.role === 'admin';
      if (!canSeeAllTimeLogs && currentUser?.email) {
        const rows = await base44.entities.AccessControl.filter({ email: currentUser.email, active: true }).catch(() => []);
        canSeeAllTimeLogs = !!rows?.[0] && rows[0].role === 'manager_plus';
      }

      const timeLogsPromise = canSeeAllTimeLogs ?
        base44.entities.TimeLog.filter({}, '-log_date', 200) :
        base44.entities.TimeLog.filter({ created_by: currentUser.email }, '-log_date', 100);

      const allMeetings = await base44.entities.Meeting.list('-meeting_date', 100);
      const now = new Date();
      const futureMeetings = allMeetings.filter(m => {
        if (!m.meeting_date) return false;
        try {
          const meetingDate = new Date(m.meeting_date);
          if (isNaN(meetingDate.getTime())) return false;
          return meetingDate >= now && ['מתוכננת', 'אושרה'].includes(m.status);
        } catch (e) {
          return false;
        }
      });

      const [clientsData, projectsData, quotesData, tasksData, myTimeLogs] = await Promise.all([
        base44.entities.Client.list('-created_date', 100),
        base44.entities.Project.list('-created_date', 100),
        base44.entities.Quote.list('-created_date', 50),
        base44.entities.Task.filter({ status: { $ne: 'הושלמה' } }, '-due_date', 100),
        timeLogsPromise
      ]);

      setStats({
        clients: clientsData.length,
        projects: projectsData.filter((p) => p.status !== 'הושלם').length,
        quotes: quotesData.filter((q) => q.status === 'בהמתנה').length,
        tasks: tasksData.length
      });

      setRecentProjects(projectsData.slice(0, 5));
      setUpcomingTasks(tasksData.slice(0, 5));
      setQuotes(quotesData.slice(0, 5));
      setTimeLogs(myTimeLogs || []);
      setUpcomingMeetings(futureMeetings.slice(0, 10));
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadDashboardData();
    const onTimelogCreated = (e) => { loadDashboardData(); };
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

  // Get grid class based on view mode
  const getGridClass = () => {
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
      default:
        return 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6';
    }
  };

  const viewModeOptions = [
    { value: 'list', label: 'שורות', icon: LayoutList },
    { value: 'grid-small', label: 'רשת קטנה (4 עמודות)', icon: Grid3x3 },
    { value: 'grid-medium', label: 'רשת בינונית (3 עמודות)', icon: LayoutGrid },
    { value: 'grid-large', label: 'רשת גדולה (2 עמודות)', icon: Grid2x2 },
    { value: 'vertical', label: 'אנכי (עמודה אחת)', icon: AlignLeft },
  ];

  const currentViewOption = viewModeOptions.find(opt => opt.value === viewMode) || viewModeOptions[2];
  const CurrentViewIcon = currentViewOption.icon;

  return (
    <div className="p-6 min-h-screen" dir="rtl" style={{ backgroundColor: '#FCF6E3' }}>
      <DashboardSettings
        visible={showDashboardSettings}
        settings={dashboardSettings}
        onChange={updateDashboardSettings}
        onClose={() => setShowDashboardSettings(false)}
      />

      <div className="max-w-7xl mx-auto" dir="rtl">
        {/* Header */}
        <div className="mb-8" dir="rtl">
          <div className="px-8 py-6 rounded-2xl shadow-md" style={{ backgroundColor: '#2C3E50' }} dir="rtl">
            <div className="flex justify-between items-center" dir="rtl">
              <div className="flex-1 text-right" dir="rtl">
                <h1 className="text-3xl font-bold text-white mb-1 text-right">
                  ניהול לקוחות CRM
                </h1>
                <p className="text-slate-300 text-sm text-right">
                  סקירה כללית על הפעילות העסקית
                </p>
              </div>
              <div className="flex gap-3" dir="rtl">
                <ReminderManager />
                
                {/* View Mode Selector */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="outline"
                      size="icon"
                      title="מצב תצוגה"
                      className="bg-white/10 border-white/20 hover:bg-white/20 text-white"
                    >
                      <CurrentViewIcon className="w-5 h-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64" dir="rtl">
                    <DropdownMenuLabel className="text-right">מצב תצוגה</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {viewModeOptions.map((option) => {
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
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button 
                  variant="outline" 
                  size="icon" 
                  title="הגדרות לוח מחוונים" 
                  onClick={() => setShowDashboardSettings(true)}
                  className="bg-white/10 border-white/20 hover:bg-white/20 text-white"
                >
                  <Settings className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* AI Project Insights - NEW! */}
        <div className="mb-8">
          <ProjectInsightsCard />
        </div>

        {/* Stats Grid */}
        {dashboardSettings.showStats && (
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
                  <Button variant="link" className="w-full text-xs text-blue-600">
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
                  <Button variant="link" className="w-full text-xs text-blue-600">
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
                  <Button variant="link" className="w-full text-xs text-blue-600">
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
                  <Button variant="link" className="w-full text-xs text-blue-600">
                    → כל המשימות
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Activity Grid */}
        <div dir="rtl">
          {!compactHeaders && (
            <h2 className="text-xl font-bold text-slate-800 mb-4 text-right">פעילויות אחרונות</h2>
          )}
          <div className={getGridClass()} dir="rtl">
            {dashboardSettings.showRecentProjects && (
              <Card className="bg-white shadow-md">
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
            )}

            {dashboardSettings.showUpcomingTasks && (
              <Card className="bg-white shadow-md">
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
            )}

            {dashboardSettings.showQuoteStatus && (
              <Card className="bg-white shadow-md">
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
            )}

            {dashboardSettings.showTimerLogs && (
              <Card className="bg-white shadow-md">
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
            )}

            {dashboardSettings.showMeetings && (
              <Card className="bg-white shadow-md">
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
