import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";

export default function FieldEditDialog({ icon: Icon, label, value, onSave, type = "text", selectOptions = [], triggerVariant = "outline", triggerClassName = "" }) {
  const [open, setOpen] = React.useState(false);
  const [local, setLocal] = React.useState(value);

  React.useEffect(() => {
    setLocal(value);
  }, [value, open]);

  const handleSave = () => {
    if (type === "text") {
      onSave(local);
    } else {
      onSave(local);
    }
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={triggerVariant} size="sm" className={`gap-2 ${triggerClassName}`}>
          {Icon ? <Icon className="w-4 h-4" /> : null}
          <span>{label}</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
        </DialogHeader>
        <div className="mt-2">
          {type === "text" ? (
            <Input value={local} onChange={(e) => setLocal(e.target.value)} />
          ) : (
            <Select value={local} onValueChange={setLocal}>
              <SelectTrigger><SelectValue placeholder="בחר" /></SelectTrigger>
              <SelectContent>
                {selectOptions.map((opt) => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>בטל</Button>
          <Button onClick={handleSave}>שמור</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}