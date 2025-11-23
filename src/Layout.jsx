import React, { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Building2, Settings, Users, FileText, Clock,
  BarChart3, Archive, FolderOpen, MessageSquare,
  Calculator, Pin, PinOff, ChevronRight, Home,
  Briefcase, CheckSquare2, Timer, Receipt,
  Calendar, Mail, Zap
} from "lucide-react";
import { SidebarProvider } from "@/components/ui/sidebar";
import FloatingTimer from "@/components/timer/FloatingTimer";
import ReminderPopup from "@/components/reminders/ReminderPopup";
import FloatingDebugPanel from "@/components/debug/FloatingDebugPanel";
import NotificationBell from "@/components/notifications/NotificationBell";
import { base44 } from "@/api/base44Client";

const ACCENT_COLOR = "#2C3A50";
const ICON_COLOR = "#2C3A50";

const THEMES = {
  cream: { bg: '#FCF6E3', text: '#1e293b' },
  dark: { bg: '#1a1a2e', text: '#ffffff' },
  light: { bg: '#f8f9fa', text: '#1e293b' },
  ocean: { bg: '#e0f2f7', text: '#1e293b' },
  sunset: { bg: '#fff5f0', text: '#1e293b' },
  forest: { bg: '#e8f5e9', text: '#1e293b' }
};

const MENU_ITEMS = [
  { name: "Dashboard", icon: Home, path: "Dashboard" },
  { name: "לקוחות", icon: Users, path: "Clients" },
  { name: "פרויקטים", icon: Briefcase, path: "Projects" },
  { name: "הצעות מחיר", icon: Calculator, path: "Quotes" },
  { name: "פגישות", icon: Calendar, path: "Meetings" },
  { name: "משימות", icon: CheckSquare2, path: "Tasks" },
  { name: "לוגי זמן", icon: Timer, path: "TimeLogs" },
  { name: "חשבוניות", icon: Receipt, path: "Invoices" },
  { name: "טבלאות מותאמות", icon: FileText, path: "CustomSpreadsheets" },
  { name: "תיקיות", icon: FolderOpen, path: "Folders" },
  { name: "החלטות", icon: MessageSquare, path: "Decisions" },
  { name: "פורטל לקוח", icon: Users, path: "ClientPortal" },
  { name: "בקרת גישה", icon: Settings, path: "Access" },
  { name: "מתכנן משאבים", icon: BarChart3, path: "Planner" },
  { name: "דוחות", icon: BarChart3, path: "Reports" },
  { name: "דוחות יומיים", icon: Mail, path: "DailyReports" },
  { name: "מסמכים", icon: FileText, path: "Documents" },
  { name: "אינטגרציות", icon: Zap, path: "Integrations" },
  { name: "אוטומציות", icon: Settings, path: "Automations" },
  { name: "יצוא", icon: Archive, path: "Exports" },
  { name: "גיבוי", icon: Archive, path: "Backup" },
  { name: "הגדרות", icon: Settings, path: "Settings" }
];

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const [pinned, setPinned] = useState(() => {
    try {
      return localStorage.getItem('sidebar-pinned') === 'true';
    } catch {
      return false;
    }
  });
  const [hovered, setHovered] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const loadedRef = useRef(false);

  // Save pinned state
  useEffect(() => {
    try {
      localStorage.setItem('sidebar-pinned', pinned.toString());
    } catch (e) {
      console.warn('Failed to save sidebar pinned state:', e);
    }
  }, [pinned]);

  // Theme event listener
  useEffect(() => {
    const handleThemeChange = () => {
      const event = new Event('resize');
      window.dispatchEvent(event);
    };

    window.addEventListener('theme:changed', handleThemeChange);
    return () => window.removeEventListener('theme:changed', handleThemeChange);
  }, []);

  // Initial theme load
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    
    const loadTheme = async () => {
      try {
        let userData = {};
        try {
          userData = await base44.auth.me();
        } catch (error) {
          console.warn('Failed to load user, using defaults:', error);
        }
        
        const localTheme = localStorage.getItem('app-theme');
        const themeId = userData?.theme || localTheme || 'cream';
        const theme = THEMES[themeId] || THEMES.cream;
        
        document.body.style.backgroundColor = theme.bg;
        document.body.style.color = theme.text;
        document.documentElement.style.setProperty('--bg-cream', theme.bg);
        document.documentElement.style.setProperty('--text-color', theme.text);
      } catch (e) {
        console.error('Error loading theme:', e);
      }
    };

    loadTheme();
  }, []);

  // Load user
  useEffect(() => {
    let mounted = true;
    
    base44.auth.me()
      .then((u) => {
        if (mounted) setUser(u);
      })
      .catch(() => {
        if (mounted) setUser(null);
      });
      
    return () => {
      mounted = false;
    };
  }, []);

  // Update expanded state
  useEffect(() => {
    const newExpanded = pinned || hovered;
    if (newExpanded !== isExpanded) {
      setIsExpanded(newExpanded);
    }
  }, [pinned, hovered, isExpanded]);

  const handleMouseEnter = useCallback(() => {
    setHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTimeout(() => setHovered(false), 200);
  }, []);

  const sidebarStyles = isExpanded ? {
    width: '320px',
    opacity: 1,
    visibility: 'visible',
    transform: 'translateX(0)'
  } : {
    width: '0px',
    opacity: 0,
    visibility: 'hidden',
    transform: 'translateX(100%)'
  };

  const getUserDisplayName = useCallback(() => {
    if (!user) return null;
    return user.display_name || user.full_name || user.email?.split('@')[0] || 'משתמש';
  }, [user]);

  const handleLogout = useCallback(async () => {
    if (!confirm('האם אתה בטוח שברצונך להתנתק?')) return;
    
    try {
      await base44.auth.logout();
      window.location.href = '/';
    } catch (e) {
      alert('שגיאה בהתנתקות: ' + e.message);
      window.location.href = '/';
    }
  }, []);

  const handleSwitchUser = useCallback(async () => {
    if (!confirm('האם ברצונך להחליף משתמש? תצטרך להתחבר מחדש.')) return;
    
    try {
      await base44.auth.logout();
      window.location.href = '/';
    } catch (e) {
      alert('שגיאה בהחלפת משתמש: ' + e.message);
      window.location.href = '/';
    }
  }, []);

  const handleLogin = useCallback(async () => {
    try {
      await base44.auth.redirectToLogin();
    } catch (e) {
      alert('שגיאה בהתחברות: ' + e.message);
    }
  }, []);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full" dir="rtl" data-app-root style={{ backgroundColor: 'var(--bg-cream)', overflow: 'visible' }}>
        <style>{`
          :root {
            --accent-color: ${ACCENT_COLOR};
            --icon-color: ${ICON_COLOR};
          }
          
          body {
            overflow-x: auto !important;
            overflow-y: auto !important;
          }

          #root, [data-app-root] {
            overflow: visible !important;
            width: 100%;
          }
          
          * {
            direction: rtl;
            text-align: right;
          }
          
          input, textarea, select {
            text-align: right !important;
            direction: rtl !important;
          }
          
          [role="menu"], [role="listbox"], .dropdown-content {
            text-align: right !important;
            direction: rtl !important;
          }
          
          table {
            direction: rtl;
          }
          
          th, td {
            text-align: right !important;
          }
          
          .card, [class*="card"] {
            text-align: right;
          }
          
          button {
            direction: rtl;
          }
          
          .sidebar-container {
            transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
            will-change: width, opacity, visibility, transform;
          }
          
          .sidebar-trigger {
            position: fixed;
            top: 0;
            right: 0;
            width: 20px;
            height: 100vh;
            z-index: 9999;
            background: transparent;
          }
          
          [role="tablist"] button[data-state="active"] {
            background-color: #2C3A50 !important;
            color: white !important;
            border-color: #2C3A50 !important;
          }
          
          [role="tablist"] button[data-state="inactive"] {
            background-color: white;
            color: #2C3A50;
            border: 1px solid #e2e8f0;
          }
          
          [role="tablist"] button:hover {
            background-color: #2C3A50 !important;
            color: white !important;
            opacity: 0.9;
          }
          
          [role="tab"][data-state="active"] {
            background-color: #2C3A50 !important;
            color: white !important;
            border-color: #2C3A50 !important;
          }
          
          [role="tab"][data-state="inactive"] {
            background-color: white;
            color: #2C3A50;
          }
          
          [role="tab"]:hover {
            background-color: #2C3A50 !important;
            color: white !important;
            opacity: 0.9;
          }
        `}</style>

        {!isExpanded && (
          <div className="sidebar-trigger" onMouseEnter={handleMouseEnter} />
        )}

        <div
          className="order-1 relative sidebar-container"
          style={sidebarStyles}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {(isExpanded || hovered || pinned) && (
            <div className="h-full bg-white border-l border-slate-200 shadow-lg relative group rounded-r-2xl overflow-hidden flex flex-col">
              <div
                className="relative p-6 min-h-[120px] flex items-center overflow-hidden rounded-tr-2xl rounded-tl-2xl"
                style={{ backgroundColor: 'white', borderBottom: '1px solid #e2e8f0' }}
              >
                <div className="absolute top-4 left-4 flex gap-2 z-20">
                  <button
                    onClick={() => setPinned((v) => !v)}
                    title={pinned ? "בטל נעיצה (הסתרה אוטומטית)" : "נעל סיידבר"}
                    className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 backdrop-blur-sm bg-slate-100 hover:bg-slate-200 border border-slate-200 opacity-0 hover:opacity-100 group-hover:opacity-100 shadow-lg hover:shadow-xl"
                    style={{ color: ICON_COLOR }}
                  >
                    {pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                  </button>
                </div>

                <div className="flex items-center gap-4 w-full relative z-10" dir="rtl">
                  <div className="relative">
                    <div
                      className="w-16 h-16 rounded-full p-1 shadow-2xl"
                      style={{ backgroundColor: ACCENT_COLOR }}
                    >
                      <div className="w-full h-full rounded-full bg-white flex items-center justify-center shadow-inner">
                        <Building2 className="w-8 h-8" style={{ color: ACCENT_COLOR }} />
                      </div>
                    </div>
                  </div>

                  <div className="transition-all duration-300 text-right overflow-hidden">
                    <div className="relative mb-1">
                      <h2 className="font-black text-xl tracking-wide" style={{ color: ACCENT_COLOR }}>
                        טננבאום
                      </h2>
                    </div>

                    <div className="relative">
                      <p className="text-sm font-semibold text-slate-600 tracking-wider">
                        אדריכלות מתקדמת
                      </p>
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      <div className="flex-1 h-px" style={{ background: `linear-gradient(to left, ${ACCENT_COLOR}30, transparent)` }}></div>
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: `${ACCENT_COLOR}50` }}></div>
                      <div className="w-1 h-1 rounded-full" style={{ backgroundColor: `${ACCENT_COLOR}30` }}></div>
                    </div>
                  </div>
                </div>
              </div>

              <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
                {MENU_ITEMS.map((item) => {
                  const isActive = currentPageName === item.path;
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.path}
                      to={createPageUrl(item.path)}
                      className={`
                        flex items-center gap-3 px-3 py-2.5 rounded-xl
                        transition-colors duration-200 ease-in-out
                        ${isActive
                          ? `text-white shadow-md border border-white/20`
                          : "text-slate-600 hover:text-slate-900"
                        }
                        justify-start group relative
                        transform-none
                        ${!isActive ? "hover:bg-slate-50/80" : ""}
                      `}
                      style={isActive ? { background: ACCENT_COLOR } : undefined}
                    >
                      <Icon 
                        className={`w-5 h-5 flex-shrink-0 transition-colors duration-200`} 
                        style={{ color: isActive ? 'white' : ICON_COLOR }}
                      />
                      <span className="font-medium">
                        {item.name}
                      </span>
                      {isActive && (
                        <ChevronRight className="w-4 h-4 text-white/70 mr-auto flex-shrink-0" />
                      )}
                    </Link>
                  );
                })}
              </nav>

              <div className="p-3 border-t border-slate-200 bg-slate-50">
                {user ? (
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0"
                      style={{ backgroundColor: ACCENT_COLOR }}
                    >
                      {getUserDisplayName()?.substring(0, 1).toUpperCase()}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-slate-800 truncate">
                        {getUserDisplayName()}
                      </div>
                      <div className="text-xs text-slate-600 truncate" title={user.email}>
                        {user.email || 'לא זמין'}
                      </div>
                    </div>

                    <div className="flex gap-1 flex-shrink-0">
                      <NotificationBell />

                      <button
                        onClick={handleSwitchUser}
                        className="p-1.5 hover:bg-slate-200 rounded transition-colors duration-200"
                        style={{ color: ICON_COLOR }}
                        title="החלף משתמש"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                      </button>

                      <button
                        onClick={handleLogout}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors duration-200"
                        title="התנתק"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={handleLogin}
                    className="w-full text-sm text-slate-600 hover:text-blue-600 transition-colors duration-200 py-2"
                  >
                    התחבר
                  </button>
                )}
              </div>
            </div>
          )}
        </div>



        <div className="order-2 flex-1 transition-all duration-200" style={{ backgroundColor: 'var(--bg-cream)', overflow: 'visible', width: '100%' }} dir="rtl">
          {user && (
            <div className="px-6 py-3" dir="rtl" style={{ backgroundColor: 'var(--bg-cream)' }}>
              <div className="max-w-7xl mx-auto">
                <div className="flex items-center gap-3" dir="rtl">
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow-md"
                    style={{ backgroundColor: ACCENT_COLOR }}
                  >
                    {getUserDisplayName()?.substring(0, 1).toUpperCase()}
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-slate-800">
                      ברוכים הבאים, {getUserDisplayName()}! 👋
                    </div>
                    <div className="text-xs text-slate-600">
                      {new Date().toLocaleDateString('he-IL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div dir="rtl">
            {children}
          </div>
        </div>

        <FloatingTimer />
        <ReminderPopup />
        <FloatingDebugPanel />
      </div>
    </SidebarProvider>
  );
}