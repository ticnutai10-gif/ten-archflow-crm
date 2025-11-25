import React, { useState } from 'react';
import { X, Check, Trash2, Settings, ExternalLink, Clock, AlertCircle, Info, AlertTriangle, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';

const priorityConfig = {
  urgent: { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' },
  high: { icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50' },
  medium: { icon: Info, color: 'text-blue-600', bg: 'bg-blue-50' },
  low: { icon: Clock, color: 'text-slate-600', bg: 'bg-slate-50' }
};

export default function NotificationCenter({ notifications, onClose, onUpdate }) {
  const [filter, setFilter] = useState('all'); // all, unread, read
  const [showAddForm, setShowAddForm] = useState(false);
  const [newNotification, setNewNotification] = useState({
    title: '',
    message: '',
    priority: 'medium',
    link: ''
  });

  // Close on Escape key
  React.useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        if (showAddForm) {
          setShowAddForm(false);
        } else {
          onClose();
        }
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose, showAddForm]);

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

  const createNotification = async () => {
    if (!newNotification.title || !newNotification.message) {
      toast.error('נא למלא כותרת והודעה');
      return;
    }

    try {
      const user = await base44.auth.me();
      await base44.entities.Notification.create({
        ...newNotification,
        user_email: user.email,
        read: false
      });
      
      toast.success('התראה נוצרה בהצלחה!');
      setShowAddForm(false);
      setNewNotification({ title: '', message: '', priority: 'medium', link: '' });
      onUpdate();
    } catch (error) {
      console.error('Error creating notification:', error);
      toast.error('שגיאה ביצירת התראה');
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
      <div className="bg-white text-slate-900 rounded-lg shadow-2xl w-full max-w-2xl mx-4 max-h-[85vh] md:max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()} style={{ color: '#1e293b' }}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-white">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-slate-900">התראות</h2>
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              {notifications.filter(n => !n.read).length} חדשות
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAddForm(!showAddForm)}
              title="הוסף תזכורת"
              className="text-slate-600 hover:text-slate-900 bg-blue-50 hover:bg-blue-100"
            >
              <Plus className="w-4 h-4 ml-1" />
              הוסף תזכורת
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.location.href = createPageUrl('Settings') + '?tab=notifications'}
              title="הגדרות התראות"
              className="text-slate-600 hover:text-slate-900"
            >
              <Settings className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-slate-600 hover:text-slate-900"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Add Notification Form */}
        {showAddForm && (
          <div className="p-4 border-b bg-blue-50">
            <h3 className="font-semibold text-slate-900 mb-3">תזכורת חדשה</h3>
            <div className="space-y-3">
              <Input
                placeholder="כותרת התזכורת"
                value={newNotification.title}
                onChange={(e) => setNewNotification({ ...newNotification, title: e.target.value })}
                className="bg-white text-slate-900"
              />
              <Textarea
                placeholder="תוכן ההודעה"
                value={newNotification.message}
                onChange={(e) => setNewNotification({ ...newNotification, message: e.target.value })}
                className="bg-white text-slate-900 min-h-[80px]"
              />
              <div className="flex gap-3">
                <Select
                  value={newNotification.priority}
                  onValueChange={(value) => setNewNotification({ ...newNotification, priority: value })}
                >
                  <SelectTrigger className="bg-white text-slate-900">
                    <SelectValue placeholder="עדיפות" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">נמוכה</SelectItem>
                    <SelectItem value="medium">בינונית</SelectItem>
                    <SelectItem value="high">גבוהה</SelectItem>
                    <SelectItem value="urgent">דחוף</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder="קישור (אופציונלי)"
                  value={newNotification.link}
                  onChange={(e) => setNewNotification({ ...newNotification, link: e.target.value })}
                  className="bg-white text-slate-900 flex-1"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowAddForm(false);
                    setNewNotification({ title: '', message: '', priority: 'medium', link: '' });
                  }}
                  className="text-slate-700"
                >
                  ביטול
                </Button>
                <Button
                  size="sm"
                  onClick={createNotification}
                  className="bg-[#2C3A50] hover:bg-[#1f2937] text-white"
                >
                  <Plus className="w-4 h-4 ml-1" />
                  צור תזכורת
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center gap-2 p-4 border-b bg-slate-50">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
            className={filter === 'all' ? 'bg-[#2C3A50] text-white hover:bg-[#1f2937]' : 'text-slate-700'}
          >
            הכל ({notifications.length})
          </Button>
          <Button
            variant={filter === 'unread' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('unread')}
            className={filter === 'unread' ? 'bg-[#2C3A50] text-white hover:bg-[#1f2937]' : 'text-slate-700'}
          >
            לא נקראו ({notifications.filter(n => !n.read).length})
          </Button>
          <Button
            variant={filter === 'read' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('read')}
            className={filter === 'read' ? 'bg-[#2C3A50] text-white hover:bg-[#1f2937]' : 'text-slate-700'}
          >
            נקראו ({notifications.filter(n => n.read).length})
          </Button>
          
          {notifications.filter(n => !n.read).length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="mr-auto text-slate-700 hover:text-slate-900"
            >
              <Check className="w-4 h-4 ml-2" />
              סמן הכל כנקרא
            </Button>
          )}
        </div>

        {/* Notifications List */}
        <ScrollArea className="flex-1 bg-white">
          {filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-500 bg-white">
              <Clock className="w-12 h-12 mb-3 text-slate-300" />
              <p className="text-slate-600">אין התראות להצגה</p>
            </div>
          ) : (
            <div className="divide-y bg-white">
              {filteredNotifications.map((notification) => {
                const PriorityIcon = priorityConfig[notification.priority]?.icon || Info;
                const priorityColor = priorityConfig[notification.priority]?.color || 'text-slate-600';
                const priorityBg = priorityConfig[notification.priority]?.bg || 'bg-slate-50';

                return (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-slate-50 transition-colors bg-white ${
                      !notification.read ? 'bg-blue-50/30' : ''
                    }`}
                    style={{ color: '#1e293b' }}
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