import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Home, Users, Briefcase, CheckSquare, Calendar, MoreHorizontal } from 'lucide-react';
import { motion } from 'framer-motion';

const NAV_ITEMS = [
  { name: 'Dashboard', icon: Home, path: 'Dashboard', label: 'בית' },
  { name: 'Clients', icon: Users, path: 'Clients', label: 'לקוחות' },
  { name: 'Projects', icon: Briefcase, path: 'Projects', label: 'פרויקטים' },
  { name: 'Tasks', icon: CheckSquare, path: 'Tasks', label: 'משימות' },
  { name: 'Meetings', icon: Calendar, path: 'Meetings', label: 'פגישות' },
];

export default function MobileBottomNav() {
  const location = useLocation();
  const currentPath = location.pathname.split('/').pop() || 'Dashboard';

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 safe-area-pb">
      <nav className="flex justify-around items-center h-16 px-2" dir="rtl">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = currentPath === item.path;

          return (
            <Link
              key={item.path}
              to={createPageUrl(item.path)}
              className="flex-1 flex flex-col items-center justify-center gap-1 py-2 relative"
            >
              <motion.div
                whileTap={{ scale: 0.9 }}
                className={`p-2 rounded-xl transition-all ${
                  isActive 
                    ? 'bg-[#2C3A50] text-white' 
                    : 'text-slate-600'
                }`}
              >
                <Icon className="w-5 h-5" />
              </motion.div>
              <span className={`text-xs font-medium ${
                isActive ? 'text-[#2C3A50]' : 'text-slate-500'
              }`}>
                {item.label}
              </span>
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-12 h-1 bg-[#2C3A50] rounded-t-full"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}