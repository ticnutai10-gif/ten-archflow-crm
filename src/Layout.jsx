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
import FloatingAIButton from "@/components/ai/FloatingAIButton";
import MobileBottomNav from "@/components/mobile/MobileBottomNav";
import MobileHeader from "@/components/mobile/MobileHeader";
import MobileSidebar from "@/components/mobile/MobileSidebar";
import MobileFAB from "@/components/mobile/MobileFAB";
import InstallPrompt from "@/components/mobile/InstallPrompt";
import { base44 } from "@/api/base44Client";
import { useIsMobile } from "@/components/utils/useMediaQuery";

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
  { name: "צ'אט AI", icon: MessageSquare, path: "AIChat" },
  { name: "לקוחות", icon: Users, path: "Clients" },
  { name: "פרויקטים", icon: Briefcase, path: "Projects" },
  { name: "הצעות מחיר", icon: Calculator, path: "Quotes" },
  { name: "פגישות", icon: Calendar, path: "Meetings" },
  { name: "משימות", icon: CheckSquare2, path: "Tasks" },
  { name: "לוגי זמן", icon: Timer, path: "TimeLogs" },
  { name: "חשבוניות", icon: Receipt, path: "Invoices" },
  { name: "טבלאות", icon: FileText, path: "CustomSpreadsheets" },
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
  const isMobile = useIsMobile();
  const [user, setUser] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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

  // Update expanded state (desktop only)
  useEffect(() => {
    if (isMobile) {
      setIsExpanded(false);
      return;
    }
    const newExpanded = pinned || hovered;
    if (newExpanded !== isExpanded) {
      setIsExpanded(newExpanded);
    }
  }, [pinned, hovered, isExpanded, isMobile]);

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

  const handleMobileFAB = (action) => {
    // Handle quick actions from FAB
    console.log('FAB action:', action);
    // You can dispatch events or open modals here
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full" dir="rtl" data-app-root style={{ backgroundColor: 'var(--bg-cream)', overflowY: 'auto', overflowX: 'hidden', paddingTop: isMobile ? '56px' : '0', paddingBottom: isMobile ? '64px' : '0', WebkitOverflowScrolling: 'touch' }}>
        <style>{`
          :root {
            --accent-color: ${ACCENT_COLOR};
            --icon-color: ${ICON_COLOR};
            --primary-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            --card-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            --card-shadow-hover: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          }

          @import url('https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700;800&display=swap');

          * {
            font-family: 'Heebo', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          }

          html, body {
            overflow-x: hidden !important;
            overflow-y: auto !important;
            transition: background-color 0.3s ease;
            touch-action: pan-y pan-x;
            -webkit-overflow-scrolling: touch;
            overscroll-behavior: contain;
          }

          #root, [data-app-root] {
            overflow-y: auto !important;
            overflow-x: hidden !important;
            width: 100%;
            min-height: 100vh;
            -webkit-overflow-scrolling: touch;
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

          /* Smooth page transitions */
          [data-app-root] > div {
            animation: fadeInUp 0.4s ease-out;
          }

          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          /* Enhanced card styles */
          .card, [class*="card"] {
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            border-radius: 16px;
          }

          .card:hover {
            transform: translateY(-4px);
            box-shadow: var(--card-shadow-hover);
          }

          /* Smooth button transitions */
          button {
            transition: all 0.2s ease;
          }

          button:hover:not(:disabled) {
            transform: translateY(-1px);
          }

          button:active:not(:disabled) {
            transform: translateY(0);
          }

          /* Input focus styles */
          input:focus, textarea:focus, select:focus {
            outline: none;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
            border-color: #667eea;
            transition: all 0.2s ease;
          }

          /* Smooth scrollbar */
          ::-webkit-scrollbar {
            width: 6px;
            height: 6px;
          }

          ::-webkit-scrollbar-track {
            background: transparent;
          }

          ::-webkit-scrollbar-thumb {
            background: rgba(44, 62, 80, 0.2);
            border-radius: 3px;
            transition: background 0.3s ease;
          }

          ::-webkit-scrollbar-thumb:hover {
            background: rgba(44, 62, 80, 0.4);
          }

          /* Badge animations */
          .badge, [class*="badge"] {
            animation: scaleIn 0.2s ease-out;
          }

          @keyframes scaleIn {
            from {
              opacity: 0;
              transform: scale(0.8);
            }
            to {
              opacity: 1;
              transform: scale(1);
            }
          }

          /* Link hover effect */
          a {
            transition: color 0.2s ease;
          }

          /* Modal overlay animation */
          [role="dialog"] {
            animation: modalFadeIn 0.2s ease-out;
          }

          @keyframes modalFadeIn {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
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

          /* Mobile specific styles */
          @media (max-width: 768px) {
            .safe-area-pt {
              padding-top: env(safe-area-inset-top);
            }
            .safe-area-pb {
              padding-bottom: env(safe-area-inset-bottom);
            }
            
            /* Hide desktop elements on mobile */
            .hide-on-mobile {
              display: none !important;
            }

            /* Touch-friendly sizing */
            button, a, [role="button"] {
              min-height: 44px;
              min-width: 44px;
            }

            /* Better touch handling */
            * {
              -webkit-tap-highlight-color: transparent;
            }

            /* Smooth scrolling for mobile */
            html, body {
              scroll-behavior: smooth;
              -webkit-overflow-scrolling: touch;
              touch-action: pan-y pan-x;
            }
          }

          /* Tablet styles */
          @media (min-width: 769px) and (max-width: 1024px) {
            .container {
              max-width: 100%;
              padding: 0 2rem;
            }
          }
        `}</style>

        {/* Mobile Header */}
        {isMobile && (
          <MobileHeader 
            onMenuClick={() => setMobileMenuOpen(true)}
            title={MENU_ITEMS.find(item => item.path === currentPageName)?.name || 'טננבאום CRM'}
          />
        )}

        {/* Mobile Sidebar */}
        {isMobile && (
          <MobileSidebar
            isOpen={mobileMenuOpen}
            onClose={() => setMobileMenuOpen(false)}
            currentPageName={currentPageName}
            user={user}
          />
        )}

        {!isExpanded && !isMobile && (
          <div className="sidebar-trigger" onMouseEnter={handleMouseEnter} />
        )}

        {!isMobile && (
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
        )}



        <div className="order-2 flex-1 transition-all duration-200" style={{ backgroundColor: 'var(--bg-cream)', overflow: 'visible', width: '100%' }} dir="rtl">
          {user && !isMobile && (
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

        {!isMobile && <FloatingTimer />}
        <ReminderPopup />
        {!isMobile && <FloatingDebugPanel />}
        {!isMobile && <FloatingAIButton />}

        {/* Mobile Bottom Navigation */}
        {isMobile && <MobileBottomNav />}

        {/* Mobile FAB */}
        {isMobile && <MobileFAB onAction={handleMobileFAB} />}

        {/* PWA Install Prompt */}
        <InstallPrompt />
        </div>
        </SidebarProvider>
        );
        }