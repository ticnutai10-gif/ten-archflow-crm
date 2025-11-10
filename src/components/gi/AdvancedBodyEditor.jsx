import React from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Code } from "lucide-react";

export default function AdvancedBodyEditor({ body, setBody, suggestedBody }) {
  const [open, setOpen] = React.useState(false);
  const [local, setLocal] = React.useState(body || "");

  React.useEffect(() => {
    if (open) setLocal(body || "");
  }, [open, body]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Code className="w-4 h-4" />
          עריכת Body (מתקדם)
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Body (JSON)</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Textarea className="min-h-[220px]" value={local} onChange={(e) => setLocal(e.target.value)} />
          <div className="text-xs text-slate-500">
            טיפ: אם אינך בטוח, לחץ "החל פריסט" כדי לשחזר את ה-Body המוצע לפי המסננים.
          </div>
        </div>
        <DialogFooter className="mt-2">
          <Button variant="secondary" onClick={() => setLocal(suggestedBody)}>החל פריסט</Button>
          <Button variant="outline" onClick={() => setOpen(false)}>בטל</Button>
          <Button onClick={() => { setBody(local); setOpen(false); }}>שמור</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}