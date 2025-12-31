import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Clock, Search, RotateCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function AutomationHistory() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.AutomationLog.list('-triggered_at', 50);
      setLogs(data || []);
    } catch (error) {
      console.error("Failed to load logs", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
    const interval = setInterval(loadLogs, 30000); // Auto refresh
    return () => clearInterval(interval);
  }, []);

  const filteredLogs = logs.filter(log => 
    log.rule_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.trigger?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="חפש בהיסטוריה..." 
            className="pr-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button variant="outline" size="icon" onClick={loadLogs}>
          <RotateCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <ScrollArea className="h-[600px] rounded-md border p-4 bg-white/50">
        <div className="space-y-4">
          {filteredLogs.map((log) => (
            <Card key={log.id} className="overflow-hidden">
              <div className={`h-1 w-full ${
                log.status === 'success' ? 'bg-green-500' : 
                log.status === 'partial' ? 'bg-amber-500' : 'bg-red-500'
              }`} />
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-slate-800">{log.rule_name}</span>
                      {log.is_dry_run && <Badge variant="outline" className="text-xs border-amber-300 bg-amber-50 text-amber-700">בדיקה</Badge>}
                    </div>
                    <div className="text-sm text-slate-500 flex items-center gap-2">
                      <Clock className="w-3 h-3" />
                      {log.triggered_at ? format(new Date(log.triggered_at), 'dd/MM/yyyy HH:mm:ss') : '-'}
                      <span className="mx-1">•</span>
                      <span>{log.trigger}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {log.status === 'success' && <div className="flex items-center text-green-600 text-sm font-medium"><CheckCircle2 className="w-4 h-4 ml-1"/> הצליח</div>}
                    {log.status === 'failure' && <div className="flex items-center text-red-600 text-sm font-medium"><XCircle className="w-4 h-4 ml-1"/> נכשל</div>}
                    {log.status === 'partial' && <div className="flex items-center text-amber-600 text-sm font-medium"><AlertCircle className="w-4 h-4 ml-1"/> חלקי</div>}
                  </div>
                </div>

                {/* Error Message */}
                {log.error_message && (
                  <div className="mt-3 p-2 bg-red-50 text-red-700 text-sm rounded border border-red-100">
                    {log.error_message}
                  </div>
                )}

                {/* Details */}
                {log.execution_details && log.execution_details.length > 0 && (
                  <div className="mt-3 space-y-2 border-t pt-3">
                    {log.execution_details.map((detail, idx) => (
                      <div key={idx} className="text-xs flex items-center justify-between">
                        <span className="text-slate-600">{detail.action}</span>
                        <span className={`px-1.5 py-0.5 rounded ${
                          detail.status === 'ok' || detail.status === 'success' ? 'bg-green-100 text-green-700' : 
                          detail.status === 'skipped' ? 'bg-slate-100 text-slate-600' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {detail.status === 'ok' ? 'בוצע' : 
                           detail.status === 'skipped' ? `דולג (${detail.result?.reason || '-'})` : 
                           'שגיאה'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          
          {filteredLogs.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              לא נמצאו רשומות בהיסטוריה
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}