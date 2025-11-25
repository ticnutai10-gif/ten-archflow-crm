import React, { useState } from 'react';
import { X, Check, Trash2, Settings, ExternalLink, Clock, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';
import { createPageUrl } from '@/utils';

const priorityConfig = {
  urgent: { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' },
  high: { icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50' },
  medium: { icon: Info, color: 'text-blue-600', bg: 'bg-blue-50' },
  low: { icon: Clock, color: 'text-slate-600', bg: 'bg-slate-50' }
};

export default function NotificationCenter({ notifications, onClose, onUpdate }) {
  const [filter, setFilter] = useState('all'); // all, unread, read

  // Close on Escape key
  React.useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const markAsRead = async (id) => {
    try {
      await base44.entities.Notification.update(id, { read: true });
      onUpdate();
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unread = notifications.filter(n => !n.read);
      await Promise.all(unread.map(n => base44.entities.Notification.update(n.id, { read: true })));
      onUpdate();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const deleteNotification = async (id) => {
    try {
      await base44.entities.Notification.delete(id);
      onUpdate();
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }
    
    if (notification.link) {
      window.location.href = notification.link;
      onClose();
    }
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.read;
    if (filter === 'read') return n.read;
    return true;
  });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-16 md:pt-20" dir="rtl" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl mx-4 max-h-[85vh] md:max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold">התראות</h2>
            <Badge variant="secondary">
              {notifications.filter(n => !n.read).length} חדשות
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.location.href = createPageUrl('Settings') + '?tab=notifications'}
              title="הגדרות התראות"
            >
              <Settings className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 p-4 border-b bg-slate-50">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            הכל ({notifications.length})
          </Button>
          <Button
            variant={filter === 'unread' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('unread')}
          >
            לא נקראו ({notifications.filter(n => !n.read).length})
          </Button>
          <Button
            variant={filter === 'read' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('read')}
          >
            נקראו ({notifications.filter(n => n.read).length})
          </Button>
          
          {notifications.filter(n => !n.read).length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="mr-auto"
            >
              <Check className="w-4 h-4 ml-2" />
              סמן הכל כנקרא
            </Button>
          )}
        </div>

        {/* Notifications List */}
        <ScrollArea className="flex-1">
          {filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-500">
              <Clock className="w-12 h-12 mb-3 text-slate-300" />
              <p>אין התראות להצגה</p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredNotifications.map((notification) => {
                const PriorityIcon = priorityConfig[notification.priority]?.icon || Info;
                const priorityColor = priorityConfig[notification.priority]?.color || 'text-slate-600';
                const priorityBg = priorityConfig[notification.priority]?.bg || 'bg-slate-50';

                return (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-slate-50 transition-colors ${
                      !notification.read ? 'bg-blue-50/30' : ''
                    }`}
                  >
                    <div className="flex gap-3">
                      {/* Priority Icon */}
                      <div className={`flex-shrink-0 w-10 h-10 rounded-full ${priorityBg} flex items-center justify-center`}>
                        <PriorityIcon className={`w-5 h-5 ${priorityColor}`} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <h3 className="font-semibold text-slate-900 mb-1">
                              {notification.title}
                            </h3>
                            <p className="text-sm text-slate-600">
                              {notification.message}
                            </p>
                          </div>
                          {!notification.read && (
                            <div className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0 mt-2"></div>
                          )}
                        </div>

                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-xs text-slate-500">
                            {formatDistanceToNow(new Date(notification.created_date), { 
                              addSuffix: true, 
                              locale: he 
                            })}
                          </span>
                          
                          {notification.link && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleNotificationClick(notification)}
                              className="h-7 text-xs"
                            >
                              <ExternalLink className="w-3 h-3 ml-1" />
                              פתח
                            </Button>
                          )}
                          
                          {!notification.read && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => markAsRead(notification.id)}
                              className="h-7 text-xs"
                            >
                              <Check className="w-3 h-3 ml-1" />
                              סמן כנקרא
                            </Button>
                          )}
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteNotification(notification.id)}
                            className="h-7 text-xs text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}