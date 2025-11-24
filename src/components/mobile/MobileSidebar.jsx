import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { X, Building2, Home, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import {
  Users, Briefcase, CheckSquare, Timer, Receipt, Calendar, Mail,
  FileText, FolderOpen, MessageSquare, Settings, Zap, Archive,
  BarChart3, DollarSign
} from 'lucide-react';

const MENU_ITEMS = [
  { name: "דשבורד", icon: Home, path: "Dashboard", color: "bg-blue-500" },
  { name: "צ'אט AI", icon: MessageSquare, path: "AIChat", color: "bg-purple-500" },
  { name: "לקוחות", icon: Users, path: "Clients", color: "bg-emerald-500" },
  { name: "פרויקטים", icon: Briefcase, path: "Projects", color: "bg-orange-500" },
  { name: "הצעות מחיר", icon: DollarSign, path: "Quotes", color: "bg-green-500" },
  { name: "פגישות", icon: Calendar, path: "Meetings", color: "bg-pink-500" },
  { name: "משימות", icon: CheckSquare, path: "Tasks", color: "bg-yellow-500" },
  { name: "לוגי זמן", icon: Timer, path: "TimeLogs", color: "bg-cyan-500" },
  { name: "חשבוניות", icon: Receipt, path: "Invoices", color: "bg-indigo-500" },
  { name: "טבלאות", icon: FileText, path: "CustomSpreadsheets", color: "bg-teal-500" },
  { name: "תיקיות", icon: FolderOpen, path: "Folders", color: "bg-amber-500" },
  { name: "דוחות", icon: BarChart3, path: "Reports", color: "bg-red-500" },
  { name: "מסמכים", icon: FileText, path: "Documents", color: "bg-slate-500" },
  { name: "הגדרות", icon: Settings, path: "Settings", color: "bg-gray-500" }
];

export default function MobileSidebar({ isOpen, onClose, currentPageName, user }) {
  const handleLogout = async () => {
    if (confirm('האם אתה בטוח שברצונך להתנתק?')) {
      try {
        await base44.auth.logout();
        window.location.href = '/';
      } catch (e) {
        window.location.href = '/';
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 md:hidden"
          />
          
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 bottom-0 w-[85%] max-w-sm bg-white z-50 shadow-2xl md:hidden overflow-hidden flex flex-col"
            dir="rtl"
          >
            {/* Header */}
            <div className="bg-gradient-to-l from-[#2C3A50] to-[#1a252f] text-white p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                    <Building2 className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h2 className="font-bold text-lg">טננבאום</h2>
                    <p className="text-xs text-white/70">אדריכלות מתקדמת</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-3 hover:bg-white/10 rounded-xl transition-colors active:scale-95"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {user && (
                <div className="flex items-center gap-3 bg-white/10 rounded-2xl p-3">
                  <div className="w-12 h-12 rounded-xl bg-white/20 text-white flex items-center justify-center text-lg font-bold">
                    {user.full_name?.substring(0, 1)?.toUpperCase() || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">
                      {user.full_name || user.email}
                    </div>
                    <div className="text-xs text-white/70 truncate">
                      {user.email}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Navigation - Grid Layout */}
            <nav className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-3 gap-3">
                {MENU_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentPageName === item.path;

                  return (
                    <Link
                      key={item.path}
                      to={createPageUrl(item.path)}
                      onClick={onClose}
                      className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl transition-all active:scale-95 ${
                        isActive
                          ? 'bg-[#2C3A50] text-white shadow-lg'
                          : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        isActive ? 'bg-white/20' : item.color
                      }`}>
                        <Icon className={`w-6 h-6 ${isActive ? 'text-white' : 'text-white'}`} />
                      </div>
                      <span className="text-xs font-medium text-center leading-tight">{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 p-4 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-colors active:scale-95"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium">התנתק</span>
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}