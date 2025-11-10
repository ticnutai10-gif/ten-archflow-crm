import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Building2, Settings, Users, FileText, Clock,
  BarChart3, Archive, FolderOpen, MessageSquare,
  Calculator, Pin, PinOff, ChevronRight, Home,
  Briefcase, CheckSquare2, Timer, Receipt, Menu,
  Calendar, Mail, Brain, LogOut, UserCog
} from "lucide-react";
import { SidebarProvider } from "@/components/ui/sidebar";
import FloatingTimer from "@/components/timer/FloatingTimer";
import ReminderPopup from "@/components/reminders/ReminderPopup";
import FloatingDebugPanel from "@/components/debug/FloatingDebugPanel";
import FloatingChatButton from "@/components/chat/FloatingChatButton";
import { base44 } from "@/api/base44Client";

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = React.useState(null);
  const [collapsed, setCollapsed] = React.useState(false);
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [pinned, setPinned] = React.useState(function() {
    try {
      return localStorage.getItem('sidebar-pinned') === 'true';
    } catch {
      return false;
    }
  });
  const [hovered, setHovered] = React.useState(false);
  const loadedRef = React.useRef(false);

  const accentColor = "#2C3A50";
  const iconColor = "#2C3A50";

  React.useEffect(() => {
    try {
      localStorage.setItem('sidebar-pinned', pinned.toString());
    } catch (e) {
      console.warn('Failed to save sidebar pinned state:', e);
    }
  }, [pinned]);

  React.useEffect(() => {
    console.log('🔧 [LAYOUT] Setting up theme event listener...');
    
    const handleThemeChange = (e) => {
      const themeId = e.detail?.theme;
      console.log('🎨 [LAYOUT] ⚡ Theme changed event received!', {
        themeId,
        currentBodyBg: document.body.style.backgroundColor,
        currentCSSVar: getComputedStyle(document.documentElement).getPropertyValue('--bg-cream')
      });
      
      const event = new Event('resize');
      window.dispatchEvent(event);
      
      console.log('🎨 [LAYOUT] ✅ Resize event dispatched');
    };

    window.addEventListener('theme:changed', handleThemeChange);
    console.log('🔧 [LAYOUT] Theme event listener registered');
    
    return () => {
      console.log('🔧 [LAYOUT] Removing theme event listener');
      window.removeEventListener('theme:changed', handleThemeChange);
    };
  }, []);

  React.useEffect(() => {
    if (loadedRef.current) {
      console.log('⏭️ [LAYOUT] Theme already loaded, skipping...');
      return;
    }
    
    loadedRef.current = true;
    console.log('🎨 [LAYOUT] 🚀 INITIAL THEME LOAD - START');
    
    const loadTheme = async () => {
      try {
        console.log('🎨 [LAYOUT] Step 1: Loading user data...');
        
        let userData;
        try {
          userData = await base44.auth.me();
          console.log('🎨 [LAYOUT] Step 2: User loaded:', {
            email: userData.email,
            theme: userData.theme
          });
        } catch (error) {
          console.warn('⚠️ [LAYOUT] Failed to load user, using defaults:', error);
          userData = {};
        }
        
        const localTheme = localStorage.getItem('app-theme');
        console.log('🎨 [LAYOUT] Step 3: localStorage theme:', localTheme);
        
        const themeId = userData.theme || localTheme || 'cream';
        console.log('🎨 [LAYOUT] Step 4: Selected theme:', themeId);
        
        const themes = {
          cream: { bg: '#FCF6E3', text: '#1e293b' },
          dark: { bg: '#1a1a2e', text: '#ffffff' },
          light: { bg: '#f8f9fa', text: '#1e293b' },
          ocean: { bg: '#e0f2f7', text: '#1e293b' },
          sunset: { bg: '#fff5f0', text: '#1e293b' },
          forest: { bg: '#e8f5e9', text: '#1e293b' }
        };
        
        const theme = themes[themeId] || themes.cream;
        console.log('🎨 [LAYOUT] Step 5: Theme config:', theme);
        
        const currentBg = document.body.style.backgroundColor;
        const currentVar = getComputedStyle(document.documentElement).getPropertyValue('--bg-cream');
        
        console.log('🎨 [LAYOUT] Step 6: Current state:', {
          bodyBg: currentBg,
          cssVar: currentVar
        });
        
        console.log('🎨 [LAYOUT] Step 7: Applying theme to DOM...');
        
        document.body.style.backgroundColor = theme.bg;
        document.body.style.color = theme.text;
        document.documentElement.style.setProperty('--bg-cream', theme.bg);
        document.documentElement.style.setProperty('--text-color', theme.text);
        
        console.log('🎨 [LAYOUT] Step 8: Theme applied!', {
          bodyBg: document.body.style.backgroundColor,
          bodyColor: document.body.style.color,
          cssVarBg: getComputedStyle(document.documentElement).getPropertyValue('--bg-cream'),
          cssVarText: getComputedStyle(document.documentElement).getPropertyValue('--text-color')
        });
        
        console.log('🎨 [LAYOUT] ✅ INITIAL THEME LOAD - COMPLETE');
        
      } catch (e) {
        console.error('❌ [LAYOUT] Error loading theme:', e);
      }
    };

    loadTheme();
  }, []);

  React.useEffect(() => {
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

  React.useEffect(() => {
    const newExpanded = pinned || hovered;
    if (newExpanded !== isExpanded) {
      setIsExpanded(newExpanded);
    }
  }, [pinned, hovered, isExpanded]);

  const handleMouseEnter = React.useCallback(() => {
    setHovered(true);
  }, []);

  const handleMouseLeave = React.useCallback(() => {
    setTimeout(() => {
      setHovered(false);
    }, 200);
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

  const menuItems = [
    { name: "Dashboard", icon: Home, path: "Dashboard" },
    { name: "צ'אט AI חכם", icon: Brain, path: "AIChat" },
    { name: "לקוחות", icon: Users, path: "Clients" },
    { name: "פרויקטים", icon: Briefcase, path: "Projects" },
    { name: "הצעות מחיר", icon: Calculator, path: "Quotes" },
    { name: "פגישות", icon: Calendar, path: "Meetings" },
    { name: "משימות", icon: CheckSquare2, path: "Tasks" },
    { name: "לוגי זמן", icon: Timer, path: "TimeLogs" },
    { name: "חשבוניות", icon: Receipt, path: "Invoices" },
    { name: "תיקיות", icon: FolderOpen, path: "Folders" },
    { name: "החלטות", icon: MessageSquare, path: "Decisions" },
    { name: "פורטל לקוח", icon: Users, path: "ClientPortal" },
    { name: "בקרת גישה", icon: Settings, path: "Access" },
    { name: "מתכנן משאבים", icon: BarChart3, path: "Planner" },
    { name: "דוחות", icon: BarChart3, path: "Reports" },
    { name: "דוחות יומיים", icon: Mail, path: "DailyReports" },
    { name: "מסמכים", icon: FileText, path: "Documents" },
    { name: "אוטומציות", icon: Settings, path: "Automations" },
    { name: "יצוא", icon: Archive, path: "Exports" },
    { name: "גיבוי", icon: Archive, path: "Backup" },
    { name: "הגדרות", icon: Settings, path: "Settings" }
  ];

  const getUserDisplayName = () => {
    if (!user) return null;
    return user.full_name || user.email?.split('@')[0] || 'משתמש';
  };

  console.log('🔄 [LAYOUT] Render - Current backgroundColor:', document.body.style.backgroundColor);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full" dir="rtl" data-app-root style={{ backgroundColor: 'var(--bg-cream)', overflow: 'visible' }}>
        <style>{`
          :root {
            --accent-color: ${accentColor};
            --icon-color: ${iconColor};
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
          <div
            className="sidebar-trigger"
            onMouseEnter={handleMouseEnter}
          />
        )}

        {/* Sidebar */}
        <div
          className="order-1 relative sidebar-container"
          style={sidebarStyles}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {(isExpanded || hovered || pinned) && (
            <div className="h-full bg-white border-l border-slate-200 shadow-lg relative group rounded-r-2xl overflow-hidden flex flex-col">
              {/* Header */}
              <div
                className="relative p-6 min-h-[120px] flex items-center overflow-hidden rounded-tr-2xl rounded-tl-2xl"
                style={{ backgroundColor: 'white', borderBottom: '1px solid #e2e8f0' }}
              >
                {/* Toggle buttons */}
                <div className="absolute top-4 left-4 flex gap-2 z-20">
                  <button
                    onClick={() => setPinned((v) => !v)}
                    title={pinned ? "בטל נעיצה (הסתרה אוטומטית)" : "נעל סיידבר"}
                    className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 backdrop-blur-sm bg-slate-100 hover:bg-slate-200 border border-slate-200 opacity-0 hover:opacity-100 group-hover:opacity-100 shadow-lg hover:shadow-xl"
                    style={{ color: iconColor }}
                  >
                    {pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                  </button>
                </div>

                <div className="flex items-center gap-4 w-full relative z-10" dir="rtl">
                  {/* Logo */}
                  <div className="relative">
                    <div
                      className="w-16 h-16 rounded-full p-1 shadow-2xl"
                      style={{ backgroundColor: accentColor }}
                    >
                      <div className="w-full h-full rounded-full bg-white flex items-center justify-center shadow-inner">
                        <Building2 className="w-8 h-8" style={{ color: accentColor }} />
                      </div>
                    </div>
                  </div>

                  <div className="transition-all duration-300 text-right overflow-hidden">
                    <div className="relative mb-1">
                      <h2 className="font-black text-xl tracking-wide" style={{ color: accentColor }}>
                        טננבאום
                      </h2>
                    </div>

                    <div className="relative">
                      <p className="text-sm font-semibold text-slate-600 tracking-wider">
                        אדריכלות מתקדמת
                      </p>
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      <div className="flex-1 h-px" style={{ background: `linear-gradient(to left, ${accentColor}30, transparent)` }}></div>
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: `${accentColor}50` }}></div>
                      <div className="w-1 h-1 rounded-full" style={{ backgroundColor: `${accentColor}30` }}></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* User section - מעבר לראש הסיידבר */}
              {user && (
                <div className="px-4 py-3 border-b bg-slate-50">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                        style={{ backgroundColor: accentColor }}
                      >
                        {getUserDisplayName().substring(0, 1).toUpperCase()}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-slate-900 truncate" title={user.full_name || user.email}>
                          {getUserDisplayName()}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-1 flex-shrink-0">
                      <button
                        onClick={async () => {
                          if (confirm('האם ברצונך להחליף משתמש? תצטרך להתחבר מחדש.')) {
                            try {
                              await base44.auth.logout();
                              window.location.href = '/';
                            } catch (e) {
                              alert('שגיאה בהחלפת משתמש: ' + e.message);
                              window.location.href = '/';
                            }
                          }
                        }}
                        className="p-1.5 hover:bg-blue-100 rounded-lg transition-colors duration-200"
                        style={{ color: iconColor }}
                        title="החלף משתמש"
                      >
                        <UserCog className="w-4 h-4" />
                      </button>
                      
                      <button
                        onClick={async () => {
                          if (confirm('האם אתה בטוח שברצונך להתנתק?')) {
                            try {
                              await base44.auth.logout();
                              window.location.href = '/';
                            } catch (e) {
                              alert('שגיאה בהתנתקות: ' + e.message);
                              window.location.href = '/';
                            }
                          }
                        }}
                        className="p-1.5 hover:bg-red-100 rounded-lg transition-colors duration-200"
                        title="התנתק"
                      >
                        <LogOut className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation menu */}
              <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
                {menuItems.map((item) => {
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
                      style={isActive ? {
                        background: accentColor
                      } : undefined}
                    >
                      <Icon 
                        className={`w-5 h-5 flex-shrink-0 transition-colors duration-200`} 
                        style={{ color: isActive ? 'white' : iconColor }}
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
            </div>
          )}
        </div>

        {/* Main content */}
        <div className="order-2 flex-1 transition-all duration-200" style={{ backgroundColor: 'var(--bg-cream)', overflow: 'visible', width: '100%' }} dir="rtl">
          {/* הודעת ברוכים הבאים */}
          {user && (
            <div className="px-6 py-3" dir="rtl" style={{ backgroundColor: 'var(--bg-cream)' }}>
              <div className="max-w-7xl mx-auto">
                <div className="flex items-center gap-3" dir="rtl">
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow-md"
                    style={{ backgroundColor: accentColor }}
                  >
                    {getUserDisplayName().substring(0, 1).toUpperCase()}
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
        <FloatingChatButton />
      </div>
    </SidebarProvider>
  );
}