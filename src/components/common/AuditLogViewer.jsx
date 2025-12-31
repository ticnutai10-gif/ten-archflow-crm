import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History, Clock, User } from 'lucide-react';
import { format } from 'date-fns';

export default function AuditLogViewer({ entityType, entityId }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (entityType && entityId) {
      loadLogs();
    }
  }, [entityType, entityId]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.AuditLog.filter({ 
        entity_type: entityType, 
        entity_id: entityId 
      }, '-performed_at', 50);
      setLogs(data || []);
    } catch (error) {
      console.error('Error loading audit logs:', error);
    }
    setLoading(false);
  };

  const formatValue = (val) => {
    if (typeof val === 'object' && val !== null) return JSON.stringify(val);
    return String(val);
  };

  if (loading) return <div className="p-4 text-center text-slate-500">טוען היסטוריה...</div>;
  if (logs.length === 0) return <div className="p-4 text-center text-slate-500">אין היסטוריית שינויים</div>;

  return (
    <ScrollArea className="h-[400px] w-full pr-4">
      <div className="space-y-4">
        {logs.map((log) => (
          <div key={log.id} className="flex gap-3 border-b pb-4 last:border-0">
            <div className="mt-1">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                <History className="w-4 h-4 text-slate-500" />
              </div>
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <div>
                  <span className="font-medium text-sm text-slate-900">
                    {log.action === 'create' ? 'נוצר' : log.action === 'update' ? 'עודכן' : 'נמחק'}
                  </span>
                  <span className="mx-2 text-slate-300">|</span>
                  <span className="text-xs text-slate-500 flex items-center inline-flex gap-1">
                    <User className="w-3 h-3" />
                    {log.performed_by}
                  </span>
                </div>
                <div className="text-xs text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {format(new Date(log.performed_at), 'dd/MM/yy HH:mm')}
                </div>
              </div>
              
              <div className="mt-2 text-sm bg-slate-50 p-2 rounded">
                {log.changes && Object.entries(log.changes).map(([key, diff]) => (
                  <div key={key} className="grid grid-cols-[1fr,auto,1fr] gap-2 items-center mb-1 last:mb-0">
                    <span className="text-slate-600 font-medium">{key}:</span>
                    <span className="text-slate-400 text-xs">→</span>
                    <span className="text-slate-800">
                      {diff.old ? <span className="text-red-400 line-through mr-1 text-xs">{formatValue(diff.old)}</span> : null}
                      <span className="text-green-600">{formatValue(diff.new)}</span>
                    </span>
                  </div>
                ))}
                {(!log.changes || Object.keys(log.changes).length === 0) && (
                  <span className="text-slate-500 italic">ללא פירוט שינויים</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}