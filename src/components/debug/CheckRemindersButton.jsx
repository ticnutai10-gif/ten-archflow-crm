import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Bug, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function CheckRemindersButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [open, setOpen] = useState(false);

  const handleCheck = async () => {
    setLoading(true);
    setOpen(true);
    setResult(null);
    try {
      const response = await base44.functions.invoke('checkReminders');
      setResult(response.data);
    } catch (error) {
      setResult({ error: error.message, status: 'failed' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button 
        type="button" 
        variant="ghost" 
        size="icon" 
        onClick={handleCheck} 
        className="h-8 w-8 text-slate-400 hover:text-slate-600"
        title="בדוק סטטוס תזכורות (Debug)"
      >
        <Bug className="w-4 h-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col" dir="ltr">
          <DialogHeader>
            <DialogTitle>Reminders Check Log</DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-auto bg-slate-950 text-slate-50 p-4 rounded-md font-mono text-xs whitespace-pre-wrap">
            {loading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Checking reminders...
              </div>
            ) : (
              JSON.stringify(result, null, 2)
            )}
          </div>

          <DialogFooter>
             <Button onClick={() => setOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}