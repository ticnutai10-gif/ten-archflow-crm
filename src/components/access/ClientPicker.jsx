
import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, Mail, Search } from "lucide-react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

export default function ClientPicker({ open, onOpenChange, clients = [], onPick }) {
  const [q, setQ] = React.useState("");
  const [selectedStatus, setSelectedStatus] = React.useState("none"); // New state for status filter

  const filtered = React.useMemo(() => {
    let currentClients = clients;

    // Apply status filter first
    if (selectedStatus !== "none") {
      currentClients = currentClients.filter(c => c.status === selectedStatus);
    }

    // Apply search query filter
    if (q) {
      const s = q.toLowerCase();
      currentClients = currentClients.filter(c =>
        (c.name || "").toLowerCase().includes(s) ||
        (c.email || "").toLowerCase().includes(s) ||
        (c.phone || "").toLowerCase().includes(s)
      );
    }
    return currentClients;
  }, [q, clients, selectedStatus]); // Add selectedStatus to dependencies

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            בחר לקוח והשתמש במייל שלו
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="חיפוש לפי שם / מייל / טלפון..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pr-9"
            />
          </div>
          {/* Added Select component for status filtering */}
          <Select onValueChange={setSelectedStatus} value={selectedStatus}>
            <SelectTrigger className="w-[180px]"> {/* Adjust width as needed */}
              <SelectValue placeholder="בחר סטטוס" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">ללא סינון</SelectItem>
              <SelectItem value="פוטנציאלי">פוטנציאלי</SelectItem>
              <SelectItem value="פעיל">פעיל</SelectItem>
              <SelectItem value="לא פעיל">לא פעיל</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <ScrollArea className="max-h-80 mt-3">
          <div className="divide-y">
            {filtered.length === 0 ? (
              <div className="text-center text-slate-500 py-6">לא נמצאו לקוחות תואמים</div>
            ) : filtered.map((c) => (
              <div key={c.id} className="flex items-center justify-between py-3">
                <div className="min-w-0 text-right">
                  <div className="font-medium text-slate-900 truncate">{c.name}</div>
                  <div className="text-xs text-slate-500 flex items-center gap-1 justify-end">
                    <Mail className="w-3 h-3" />
                    <span className="truncate">{c.email || "— אין אימייל —"}</span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    onPick && onPick(c);
                    onOpenChange(false);
                  }}
                  disabled={!c.email}
                >
                  השתמש במייל
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
