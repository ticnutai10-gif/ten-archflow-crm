import React from 'react';
import { Menu, Bell, Search, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import NotificationBell from '../notifications/NotificationBell';

export default function MobileHeader({ onMenuClick, title = 'CRM' }) {
  return (
    <div className="md:hidden fixed top-0 left-0 right-0 bg-gradient-to-l from-[#2C3A50] to-[#1a252f] text-white z-50 safe-area-pt shadow-lg">
      <div className="flex items-center justify-between px-3 h-16">
        {/* Menu Button - More prominent */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="text-white hover:bg-white/20 w-12 h-12 rounded-xl active:scale-95 transition-transform"
        >
          <Menu className="w-7 h-7" />
        </Button>

        {/* Logo & Title */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-lg font-bold">{title}</h1>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20 w-12 h-12 rounded-xl"
          >
            <Search className="w-6 h-6" />
          </Button>
          <NotificationBell />
        </div>
      </div>
    </div>
  );
}