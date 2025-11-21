import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { 
  Cloud, 
  Calendar, 
  MessageSquare, 
  CheckCircle2, 
  XCircle,
  Settings,
  ExternalLink,
  Zap,
  Link as LinkIcon,
  Loader2
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const INTEGRATIONS = [
  {
    id: 'google_drive',
    name: 'Google Drive',
    description: 'העלאת וניהול קבצים ב-Google Drive',
    icon: Cloud,
    color: 'bg-blue-500',
    category: 'storage',
    comingSoon: false
  },
  {
    id: 'google_calendar',
    name: 'Google Calendar',
    description: 'סנכרון פגישות אוטומטי עם Google Calendar',
    icon: Calendar,
    color: 'bg-green-500',
    category: 'calendar',
    comingSoon: false
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'התראות אוטומטיות ל-Slack',
    icon: MessageSquare,
    color: 'bg-purple-500',
    category: 'communication',
    comingSoon: true
  },
  {
    id: 'teams',
    name: 'Microsoft Teams',
    description: 'התראות אוטומטיות ל-Teams',
    icon: MessageSquare,
    color: 'bg-indigo-500',
    category: 'communication',
    comingSoon: true
  }
];

export default function IntegrationsPage() {
  const [connectedIntegrations, setConnectedIntegrations] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadIntegrationStatus();
  }, []);

  const loadIntegrationStatus = async () => {
    try {
      setLoading(true);
      const user = await base44.auth.me();
      
      // Check Google connections
      const hasGoogleDrive = !!user?.google_access_token;
      const hasGoogleCalendar = !!user?.google_calendar_connected;
      
      setConnectedIntegrations({
        google_drive: hasGoogleDrive,
        google_calendar: hasGoogleCalendar,
        slack: false,
        teams: false
      });
    } catch (error) {
      console.error('Error loading integrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (integrationId) => {
    try {
      if (integrationId === 'google_drive') {
        const { data } = await base44.functions.invoke('googleGetAuthUrl', {
          scopes: ['drive.file']
        });
        window.location.href = data.auth_url;
      } else if (integrationId === 'google_calendar') {
        const { data } = await base44.functions.invoke('googleGetAuthUrl', {
          scopes: ['calendar']
        });
        window.location.href = data.auth_url;
      } else {
        toast.info('אינטגרציה זו תהיה זמינה בקרוב');
      }
    } catch (error) {
      console.error('Error connecting:', error);
      toast.error('שגיאה בחיבור: ' + error.message);
    }
  };

  const handleDisconnect = async (integrationId) => {
    if (!confirm('האם לנתק אינטגרציה זו?')) return;
    
    try {
      if (integrationId === 'google_drive' || integrationId === 'google_calendar') {
        await base44.functions.invoke('googleDisconnect');
        await loadIntegrationStatus();
        toast.success('האינטגרציה נותקה בהצלחה');
      }
    } catch (error) {
      console.error('Error disconnecting:', error);
      toast.error('שגיאה בניתוק: ' + error.message);
    }
  };

  const categories = {
    storage: { name: 'אחסון קבצים', icon: Cloud },
    calendar: { name: 'ניהול פגישות', icon: Calendar },
    communication: { name: 'תקשורת והתראות', icon: MessageSquare }
  };

  return (
    <div className="p-6 lg:p-8 min-h-screen pl-24 lg:pl-12" dir="rtl" style={{ backgroundColor: 'var(--bg-cream, #FCF6E3)' }}>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">אינטגרציות</h1>
          <p className="text-slate-600">חבר את המערכת לכלים חיצוניים</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          Object.entries(categories).map(([categoryKey, category]) => {
            const CategoryIcon = category.icon;
            const categoryIntegrations = INTEGRATIONS.filter(i => i.category === categoryKey);
            
            return (
              <div key={categoryKey} className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <CategoryIcon className="w-6 h-6 text-slate-700" />
                  <h2 className="text-xl font-bold text-slate-800">{category.name}</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {categoryIntegrations.map((integration) => {
                    const Icon = integration.icon;
                    const isConnected = connectedIntegrations[integration.id];
                    
                    return (
                      <Card key={integration.id} className="bg-white shadow-md hover:shadow-lg transition-all">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`${integration.color} p-3 rounded-lg text-white`}>
                                <Icon className="w-6 h-6" />
                              </div>
                              <div>
                                <CardTitle className="text-lg">{integration.name}</CardTitle>
                                {integration.comingSoon && (
                                  <Badge variant="outline" className="mt-1 bg-amber-50 text-amber-700 border-amber-200 text-xs">
                                    בקרוב
                                  </Badge>
                                )}
                              </div>
                            </div>
                            {isConnected && (
                              <CheckCircle2 className="w-5 h-5 text-green-600" />
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <p className="text-sm text-slate-600">{integration.description}</p>
                          
                          {!integration.comingSoon && (
                            <div className="flex gap-2">
                              {isConnected ? (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex-1 gap-2"
                                    disabled
                                  >
                                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                                    מחובר
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDisconnect(integration.id)}
                                  >
                                    נתק
                                  </Button>
                                </>
                              ) : (
                                <Button
                                  className="flex-1 gap-2 bg-[#2C3A50] hover:bg-[#1f2937]"
                                  size="sm"
                                  onClick={() => handleConnect(integration.id)}
                                >
                                  <LinkIcon className="w-4 h-4" />
                                  התחבר
                                </Button>
                              )}
                            </div>
                          )}
                          
                          {integration.comingSoon && (
                            <Button variant="outline" size="sm" className="w-full" disabled>
                              בקרוב...
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}

        <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-blue-600" />
              צריך אינטגרציה נוספת?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-700">
              יש לך צורך באינטגרציה עם כלי אחר? צור קשר והוסף בקשה למערכת.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}