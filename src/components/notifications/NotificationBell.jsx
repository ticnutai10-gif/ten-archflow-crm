import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import NotificationCenter from './NotificationCenter';

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [showCenter, setShowCenter] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadNotifications = async () => {
    try {
      const user = await base44.auth.me();
      if (!user?.email) return;

      const allNotifications = await base44.entities.Notification.filter(
        { user_email: user.email },
        '-created_date',
        50
      );

      setNotifications(allNotifications || []);
      setUnreadCount(allNotifications?.filter(n => !n.read).length || 0);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  useEffect(() => {
    loadNotifications();
    
    // רענון כל דקה
    const interval = setInterval(loadNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  // האזנה לאירועים של התראות חדשות
  useEffect(() => {
    const handleNewNotification = () => {
      loadNotifications();
    };

    window.addEventListener('notification:created', handleNewNotification);
    return () => window.removeEventListener('notification:created', handleNewNotification);
  }, []);

  return (
    <>
      <div className="relative">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowCenter(true)}
          className="relative text-white hover:bg-white/20 w-12 h-12 rounded-xl md:w-10 md:h-10 md:text-slate-600 md:hover:bg-slate-100"
        >
          <Bell className="w-6 h-6 md:w-5 md:h-5" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-0.5 -right-0.5 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white text-[10px] font-bold border-2 border-white"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </div>

      {showCenter && (
        <NotificationCenter
          notifications={notifications}
          onClose={() => setShowCenter(false)}
          onUpdate={loadNotifications}
        />
      )}
    </>
  );
}