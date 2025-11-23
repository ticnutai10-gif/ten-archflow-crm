import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { X, Building2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Briefcase, CheckSquare, Timer, Receipt, Calendar, Mail,
  FileText, FolderOpen, MessageSquare, Settings, Zap, Archive,
  BarChart3, DollarSign
} from 'lucide-react';

const MENU_ITEMS = [
  { name: "צ'אט AI", icon: MessageSquare, path: "AIChat" },
  { name: "לקוחות", icon: Users, path: "Clients" },
  { name: "פרויקטים", icon: Briefcase, path: "Projects" },
  { name: "הצעות מחיר", icon: DollarSign, path: "Quotes" },
  { name: "פגישות", icon: Calendar, path: "Meetings" },
  { name: "משימות", icon: CheckSquare, path: "Tasks" },
  { name: "לוגי זמן", icon: Timer, path: "TimeLogs" },
  { name: "חשבוניות", icon: Receipt, path: "Invoices" },
  { name: "טבלאות", icon: FileText, path: "CustomSpreadsheets" },
  { name: "תיקיות", icon: FolderOpen, path: "Folders" },
  { name: "פורטל לקוח", icon: Users, path: "ClientPortal" },
  { name: "בקרת גישה", icon: Settings, path: "Access" },
  { name: "דוחות", icon: BarChart3, path: "Reports" },
  { name: "מסמכים", icon: FileText, path: "Documents" },
  { name: "אוטומציות", icon: Zap, path: "Automations" },
  { name: "הגדרות", icon: Settings, path: "Settings" }
];

export default function MobileSidebar({ isOpen, onClose, currentPageName, user }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-50 md:hidden"
          />
          
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 bottom-0 w-80 bg-white z-50 shadow-2xl md:hidden overflow-y-auto"
            dir="rtl"
          >
            <div className="sticky top-0 bg-white border-b border-slate-200 z-10">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#2C3A50] flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="font-bold text-[#2C3A50]">טננבאום</h2>
                    <p className="text-xs text-slate-600">אדריכלות מתקדמת</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-slate-600" />
                </button>
              </div>

              {user && (
                <div className="px-4 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-2">
                    <div className="w-8 h-8 rounded-full bg-[#2C3A50] text-white flex items-center justify-center text-sm font-bold">
                      {user.full_name?.substring(0, 1)?.toUpperCase() || 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-slate-800 truncate">
                        {user.full_name || user.email}
                      </div>
                      <div className="text-xs text-slate-500 truncate">
                        {user.email}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <nav className="p-2">
              {MENU_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = currentPageName === item.path;

                return (
                  <Link
                    key={item.path}
                    to={createPageUrl(item.path)}
                    onClick={onClose}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl mb-1 transition-all ${
                      isActive
                        ? 'bg-[#2C3A50] text-white shadow-md'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}