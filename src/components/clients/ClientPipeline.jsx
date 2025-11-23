import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Phone, Mail, Eye, Edit, TrendingUp, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

const PIPELINE_STAGES = [
  { value: 'ברור_תכן', label: 'ברור תכן', color: '#3b82f6', icon: '📋' },
  { value: 'תיק_מידע', label: 'תיק מידע', color: '#8b5cf6', icon: '📁' },
  { value: 'היתרים', label: 'היתרים', color: '#f59e0b', icon: '✅' },
  { value: 'ביצוע', label: 'ביצוע', color: '#10b981', icon: '🏗️' },
  { value: 'סיום', label: 'סיום', color: '#6b7280', icon: '🎉' }
];

export default function ClientPipeline({ clients, onView, onEdit, isLoading }) {
  const pipelineData = useMemo(() => {
    return PIPELINE_STAGES.map(stage => {
      const stageClients = clients.filter(c => c.stage === stage.value);
      const totalValue = stageClients.reduce((sum, c) => {
        if (!c.budget_range) return sum;
        const match = c.budget_range.match(/(\d+)/g);
        return sum + (match ? parseInt(match[match.length - 1]) * 1000 : 0);
      }, 0);

      return {
        ...stage,
        clients: stageClients,
        count: stageClients.length,
        value: totalValue
      };
    });
  }, [clients]);

  const totalClients = clients.length;
  const totalValue = pipelineData.reduce((sum, stage) => sum + stage.value, 0);

  if (isLoading) {
    return <div className="p-6 text-center text-slate-500">טוען פייפליין...</div>;
  }

  return (
    <div className="h-[calc(100vh-380px)] overflow-x-auto overflow-y-hidden pb-4">
      {/* Summary */}
      <div className="flex items-center justify-between mb-6 px-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">פייפליין מכירות</h2>
          <p className="text-slate-600">{totalClients} לקוחות בתהליך</p>
        </div>
        <div className="text-left">
          <div className="text-sm text-slate-600">ערך כולל משוער</div>
          <div className="text-2xl font-bold text-green-600">
            ₪{(totalValue / 1000).toFixed(0)}K
          </div>
        </div>
      </div>

      {/* Pipeline columns */}
      <div className="flex gap-4 px-4 min-w-max">
        {pipelineData.map((stage) => (
          <div key={stage.value} className="flex-shrink-0 w-80">
            <div 
              className="rounded-lg border-2 p-4 h-full"
              style={{ 
                borderColor: stage.color + '40',
                backgroundColor: stage.color + '08'
              }}
            >
              {/* Stage header */}
              <div className="mb-4 pb-3 border-b-2" style={{ borderColor: stage.color + '20' }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{stage.icon}</span>
                    <h3 className="font-bold text-lg text-slate-900">{stage.label}</h3>
                  </div>
                  <Badge 
                    className="text-white"
                    style={{ backgroundColor: stage.color }}
                  >
                    {stage.count}
                  </Badge>
                </div>
                
                {stage.value > 0 && (
                  <div className="flex items-center gap-1 text-sm text-slate-600">
                    <DollarSign className="w-4 h-4" />
                    <span>₪{(stage.value / 1000).toFixed(0)}K</span>
                  </div>
                )}

                {/* Progress bar */}
                {totalClients > 0 && (
                  <div className="mt-2">
                    <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full transition-all duration-500"
                        style={{ 
                          width: `${(stage.count / totalClients) * 100}%`,
                          backgroundColor: stage.color
                        }}
                      ></div>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {((stage.count / totalClients) * 100).toFixed(0)}% מהלקוחות
                    </div>
                  </div>
                )}
              </div>

              {/* Clients list */}
              <ScrollArea className="h-[calc(100vh-600px)]">
                <div className="space-y-3 pr-2">
                  {stage.clients.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-sm">
                      אין לקוחות בשלב זה
                    </div>
                  ) : (
                    stage.clients.map(client => (
                      <Card 
                        key={client.id} 
                        className="p-3 hover:shadow-md transition-all cursor-pointer bg-white"
                        onClick={() => onView(client)}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-semibold text-slate-900 text-sm">{client.name}</h4>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 w-6 p-0"
                            onClick={(e) => { e.stopPropagation(); onEdit(client); }}
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                        </div>

                        <div className="space-y-1 text-xs text-slate-600">
                          {client.phone && (
                            <div className="flex items-center gap-1 truncate">
                              <Phone className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">{client.phone}</span>
                            </div>
                          )}
                          {client.email && (
                            <div className="flex items-center gap-1 truncate">
                              <Mail className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">{client.email}</span>
                            </div>
                          )}
                        </div>

                        <div className="mt-2 flex items-center justify-between">
                          <Badge variant="outline" className="text-xs">
                            {client.status}
                          </Badge>
                          {client.budget_range && (
                            <Badge className="text-xs bg-green-100 text-green-700">
                              {client.budget_range}
                            </Badge>
                          )}
                        </div>

                        <div className="mt-2 flex items-center gap-1 text-xs text-slate-400">
                          <Clock className="w-3 h-3" />
                          {format(new Date(client.created_date), 'dd/MM/yy', { locale: he })}
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}