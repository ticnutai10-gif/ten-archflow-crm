import React, { useState, useEffect } from 'react';
import { Menu, Search, Building2, LogIn, LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import NotificationBell from '../notifications/NotificationBell';
import { base44 } from '@/api/base44Client';

export default function MobileHeader({ onMenuClick, title = 'CRM', onSearch }) {
  const [showSearch, setShowSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [user, setUser] = useState(null);

  // Load user
  useEffect(() => {
    base44.auth.me()
      .then(setUser)
      .catch(() => setUser(null));
  }, []);

  const handleSearch = () => {
    if (onSearch) {
      onSearch(searchTerm);
      setShowSearch(false);
    }
  };

  const handleLogout = async () => {
    if (confirm('האם אתה בטוח שברצונך להתנתק?')) {
      await base44.auth.logout();
    }
  };

  const handleLogin = async () => {
    await base44.auth.redirectToLogin();
  };

  // Close search on Escape
  React.useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && showSearch) {
        setShowSearch(false);
      }
    };
    
    if (showSearch) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [showSearch]);

  return (
    <>
      <div className="md:hidden fixed top-0 left-0 right-0 bg-gradient-to-l from-[#2C3A50] to-[#1a252f] text-white z-50 safe-area-pt shadow-lg">
        <div className="flex items-center justify-between px-3 h-16">
          {/* Menu Button */}
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
              onClick={() => setShowSearch(true)}
              className="text-white hover:bg-white/20 w-10 h-10 rounded-xl active:scale-95 transition-transform"
            >
              <Search className="w-5 h-5" />
            </Button>
            <NotificationBell />
            {user ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                className="text-white hover:bg-white/20 w-10 h-10 rounded-xl active:scale-95 transition-transform"
                title="התנתק"
              >
                <LogOut className="w-5 h-5" />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogin}
                className="text-white hover:bg-white/20 w-10 h-10 rounded-xl active:scale-95 transition-transform"
                title="התחבר"
              >
                <LogIn className="w-5 h-5" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Search Dialog */}
      <Dialog open={showSearch} onOpenChange={setShowSearch}>
        <DialogContent className="top-20 translate-y-0" dir="rtl">
          <DialogHeader>
            <DialogTitle>חיפוש</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              placeholder="הקלד לחיפוש..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearch();
                }
              }}
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowSearch(false)}>
                ביטול
              </Button>
              <Button onClick={handleSearch} className="bg-[#2C3A50] hover:bg-[#1f2937]">
                <Search className="w-4 h-4 ml-2" />
                חפש
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}