import React, { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, User, Phone, Mail, Eye, Edit, Circle } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { he } from 'date-fns/locale';

const STAGE_OPTIONS = [
  { value: 'ברור_תכן', label: 'ברור תכן', color: '#3b82f6' },
  { value: 'תיק_מידע', label: 'תיק מידע', color: '#8b5cf6' },
  { value: 'היתרים', label: 'היתרים', color: '#f59e0b' },
  { value: 'ביצוע', label: 'ביצוע', color: '#10b981' },
  { value: 'סיום', label: 'סיום', color: '#6b7280' }
];

export default function ClientTimeline({ clients, onView, onEdit, isLoading }) {
  const timeline = useMemo(() => {
    const now = new Date();
    const grouped = {
      today: [],
      yesterday: [],
      thisWeek: [],
      thisMonth: [],
      last3Months: [],
      older: []
    };

    clients.forEach(client => {
      const created = new Date(client.created_date);
      const daysAgo = differenceInDays(now, created);

      if (daysAgo === 0) grouped.today.push(client);
      else if (daysAgo === 1) grouped.yesterday.push(client);
      else if (daysAgo <= 7) grouped.thisWeek.push(client);
      else if (daysAgo <= 30) grouped.thisMonth.push(client);
      else if (daysAgo <= 90) grouped.last3Months.push(client);
      else grouped.older.push(client);
    });

    return grouped;
  }, [clients]);

  const TimelineSection = ({ title, clients, color }) => {
    if (clients.length === 0) return null;

    return (
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: color }}></div>
          <h3 className="font-bold text-slate-900">{title}</h3>
          <Badge variant="outline">{clients.length}</Badge>
        </div>

        <div className="space-y-3 border-r-2 pr-4 mr-2" style={{ borderColor: color + '40' }}>
          {clients.map(client => {
            const stage = STAGE_OPTIONS.find(s => s.value === client.stage);
            return (
              <Card key={client.id} className="p-4 hover:shadow-lg transition-all bg-white relative">
                <div className="absolute -right-[21px] top-6 w-4 h-4 rounded-full border-4 border-white" style={{ backgroundColor: color }}></div>
                
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    {stage && (
                      <Circle className="w-3 h-3 fill-current" style={{ color: stage.color }} />
                    )}
                    <h4 className="font-semibold text-slate-900">{client.name}</h4>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => onView(client)}>
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => onEdit(client)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-sm text-slate-600 flex-wrap">
                  {client.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {client.phone}
                    </span>
                  )}
                  {client.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      {client.email}
                    </span>
                  )}
                </div>

                <div className="mt-2 flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {client.status}
                  </Badge>
                  {client.budget_range && (
                    <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                      {client.budget_range}
                    </Badge>
                  )}
                </div>

                <div className="mt-2 flex items-center gap-1 text-xs text-slate-400">
                  <Clock className="w-3 h-3" />
                  {format(new Date(client.created_date), 'dd/MM/yyyy HH:mm', { locale: he })}
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return <div className="p-6 text-center text-slate-500">טוען ציר זמן...</div>;
  }

  return (
    <div className="h-[calc(100vh-380px)] overflow-y-auto px-6 py-4">
      <TimelineSection title="היום" clients={timeline.today} color="#10b981" />
      <TimelineSection title="אתמול" clients={timeline.yesterday} color="#3b82f6" />
      <TimelineSection title="השבוע" clients={timeline.thisWeek} color="#8b5cf6" />
      <TimelineSection title="החודש" clients={timeline.thisMonth} color="#f59e0b" />
      <TimelineSection title="3 חודשים אחרונים" clients={timeline.last3Months} color="#ef4444" />
      <TimelineSection title="ישנים יותר" clients={timeline.older} color="#6b7280" />
    </div>
  );
}