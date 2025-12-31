import React from "react";
import { ArrowDown, Zap, Filter, Play, CheckCircle2, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function VisualRuleFlow({ rule, triggerInfo }) {
  if (!rule) return null;

  return (
    <div className="flex flex-col items-center p-6 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
      
      {/* Trigger Node */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg blur opacity-25 group-hover:opacity-50 transition duration-200"></div>
        <Card className="relative p-4 w-64 border-blue-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-blue-600 uppercase tracking-wider">טריגר</div>
              <div className="font-semibold text-slate-900">{triggerInfo?.label || rule.trigger}</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Connection Line */}
      <div className="h-8 w-0.5 bg-slate-300 my-1"></div>
      <ArrowDown className="w-4 h-4 text-slate-300 -mt-2 mb-1" />

      {/* Conditions Node (Optional) */}
      {rule.conditions && Object.keys(rule.conditions).length > 0 && (
        <>
          <Card className="p-3 w-56 border-purple-200 bg-purple-50">
            <div className="flex items-center gap-2 mb-2">
              <Filter className="w-4 h-4 text-purple-600" />
              <div className="text-xs font-bold text-purple-600 uppercase">תנאים</div>
            </div>
            <div className="space-y-1">
              {Object.entries(rule.conditions).map(([key, value]) => (
                <div key={key} className="text-xs flex justify-between bg-white p-1.5 rounded border border-purple-100">
                  <span className="text-slate-500">{key}</span>
                  <span className="font-mono font-medium text-purple-700">= {String(value)}</span>
                </div>
              ))}
            </div>
          </Card>
          <div className="h-8 w-0.5 bg-slate-300 my-1"></div>
          <ArrowDown className="w-4 h-4 text-slate-300 -mt-2 mb-1" />
        </>
      )}

      {/* Actions Nodes */}
      <div className="space-y-4 w-full flex flex-col items-center">
        {rule.actions?.map((action, index) => (
          <React.Fragment key={index}>
            {index > 0 && (
              <>
                <div className="h-6 w-0.5 bg-slate-300"></div>
                <ArrowDown className="w-4 h-4 text-slate-300 -mt-2" />
              </>
            )}
            <Card className="p-4 w-64 border-green-200 bg-white hover:shadow-md transition-shadow relative">
              <div className="absolute top-0 right-0 -mr-2 -mt-2 bg-slate-100 text-slate-500 text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-slate-200">
                {index + 1}
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg text-green-600">
                  <Play className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-green-600 uppercase tracking-wider">פעולה</div>
                  <div className="font-semibold text-slate-900 text-sm">
                    {action.type === 'send_email' && 'שליחת אימייל'}
                    {action.type === 'send_whatsapp' && 'שליחת WhatsApp'}
                    {action.type === 'create_task' && 'יצירת משימה'}
                    {action.type === 'update_tasks_status' && 'עדכון סטטוס'}
                    {action.type === 'send_notification' && 'התראה'}
                    {action.type === 'send_reminder' && 'תזכורת'}
                    {!['send_email', 'send_whatsapp', 'create_task', 'update_tasks_status', 'send_notification', 'send_reminder'].includes(action.type) && action.type}
                  </div>
                  {/* Summary of params */}
                  <div className="text-xs text-slate-500 mt-1 truncate max-w-[180px]">
                    {Object.entries(action.params || {}).slice(0, 1).map(([k, v]) => v).join(', ')}
                  </div>
                </div>
              </div>
            </Card>
          </React.Fragment>
        ))}
        {(!rule.actions || rule.actions.length === 0) && (
           <Badge variant="outline" className="border-dashed border-slate-300 text-slate-400">
             לא הוגדרו פעולות
           </Badge>
        )}
      </div>

    </div>
  );
}