import React from 'react';
import { Menu, Bell, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import NotificationBell from '../notifications/NotificationBell';

export default function MobileHeader({ onMenuClick, title = 'CRM' }) {
  return (
    <div className="md:hidden fixed top-0 left-0 right-0 bg-[#2C3A50] text-white z-50 safe-area-pt">
      <div className="flex items-center justify-between px-4 h-14">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="text-white hover:bg-white/10"
        >
          <Menu className="w-6 h-6" />
        </Button>

        <h1 className="text-lg font-bold">{title}</h1>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/10"
          >
            <Search className="w-5 h-5" />
          </Button>
          <NotificationBell />
        </div>
      </div>
    </div>
  );
}