import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Play, Loader2, CheckCircle2, AlertTriangle, AlertCircle, Terminal } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";

export default function DryRunDialog({ open, onOpenChange, rule }) {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);

  const handleRunTest = async () => {
    setRunning(true);
    setResult(null);
    try {
      // Prepare mock payload based on trigger
      const mockPayload = getMockPayload(rule.trigger);
      
      const response = await base44.functions.invoke('automationEngine', {
        event: rule.trigger,
        payload: mockPayload,
        isDryRun: true, // Specific flag for dry run
        specificRuleId: rule.id // Optimization to run only this rule
      });

      setResult(response.data);
    } catch (error) {
      setResult({ error: error.message });
    } finally {
      setRunning(false);
    }
  };

  const getMockPayload = (trigger) => {
    // Basic mock data generation
    const base = {
      is_test: true,
      timestamp: new Date().toISOString()
    };
    
    if (trigger?.includes('client')) {
      return { ...base, id: 'test_client_1', name: 'ישראל ישראלי', email: 'test@example.com', phone: '0501234567', status: 'חדש' };
    }
    if (trigger?.includes('project')) {
      return { ...base, id: 'test_proj_1', name: 'פרויקט לדוגמה', client_name: 'ישראל ישראלי', status: 'בתהליך', budget: 50000 };
    }
    if (trigger?.includes('task')) {
      return { ...base, id: 'test_task_1', title: 'משימה לבדיקה', status: 'חדשה', priority: 'גבוהה', due_date: '2025-01-01' };
    }
    return base;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-blue-600" />
            בדיקת חוק (Dry Run)
          </DialogTitle>
          <DialogDescription>
            הרצת בדיקה של החוק "{rule?.name}" ללא ביצוע שינויים בפועל במערכת.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <Card className="bg-slate-50 p-4 border-dashed">
            <div className="text-sm font-semibold mb-2 text-slate-700">נתוני בדיקה (הדמיה):</div>
            <pre className="text-xs bg-slate-900 text-green-400 p-3 rounded-lg overflow-x-auto" dir="ltr">
              {JSON.stringify(getMockPayload(rule?.trigger), null, 2)}
            </pre>
          </Card>

          {result && (
            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                תוצאות הבדיקה:
              </div>
              
              {result.error ? (
                <div className="p-4 bg-red-50 text-red-700 rounded-lg flex gap-3 border border-red-100">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <div>
                    <div className="font-bold">שגיאה בהרצה</div>
                    <div className="text-sm">{result.error}</div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="p-3 bg-blue-50 text-blue-800 rounded-lg text-sm border border-blue-100 flex justify-between">
                     <span>סה"כ פעולות שזוהו: <strong>{result.count || 0}</strong></span>
                     <span className="text-xs bg-blue-200 px-2 py-0.5 rounded-full">מצב בדיקה</span>
                  </div>

                  <ScrollArea className="h-[200px] rounded-lg border">
                    <div className="p-2 space-y-2">
                      {result.executed?.map((exec, idx) => (
                        <div key={idx} className="bg-white p-3 rounded border shadow-sm text-sm">
                           <div className="flex items-center justify-between mb-1">
                             <span className="font-bold text-slate-800">{exec.action}</span>
                             {exec.result?.skipped ? (
                               <Badge variant="secondary" className="bg-slate-100 text-slate-600">דולג</Badge>
                             ) : (
                               <Badge className="bg-green-100 text-green-700 hover:bg-green-100">היה מבוצע</Badge>
                             )}
                           </div>
                           <div className="text-xs text-slate-500 font-mono bg-slate-50 p-1.5 rounded mt-1">
                             {JSON.stringify(exec.result, null, 2)}
                           </div>
                        </div>
                      ))}
                      {(!result.executed || result.executed.length === 0) && (
                        <div className="text-center py-8 text-slate-400 text-sm">
                          לא נמצאו פעולות לביצוע עבור נתונים אלו (ייתכן שהתנאים לא התקיימו)
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>סגור</Button>
          <Button onClick={handleRunTest} disabled={running} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
            {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            הרץ בדיקה
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}