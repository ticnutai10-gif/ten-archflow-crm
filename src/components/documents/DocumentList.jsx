
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Trash2, Filter, Tag as TagIcon, ExternalLink } from "lucide-react";
import { Document } from "@/entities/Document";

export default function DocumentList({ initialFilter = {}, dir = "rtl" }) {
  const [docs, setDocs] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [category, setCategory] = React.useState("all");

  // rate limit state and retry timer
  const [rateLimited, setRateLimited] = React.useState(false);
  const [retryIn, setRetryIn] = React.useState(0);
  const retryIntervalRef = React.useRef(null);

  // Guards and backoff
  const loadRef = React.useRef(() => {}); // Holds the latest 'load' function
  const inFlightRef = React.useRef(false); // Prevents simultaneous API calls
  const lastLoadAtRef = React.useRef(0); // For throttling
  const backoffMsRef = React.useRef(3000); // Current exponential backoff delay

  const scheduleRetry = React.useCallback((ms) => {
    const waitMs = typeof ms === "number" ? ms : 3000;
    setRateLimited(true);
    let remaining = Math.ceil(waitMs / 1000);
    setRetryIn(remaining);
    if (retryIntervalRef.current) clearInterval(retryIntervalRef.current);
    retryIntervalRef.current = setInterval(() => {
      remaining -= 1;
      setRetryIn(remaining);
      if (remaining <= 0) {
        clearInterval(retryIntervalRef.current);
        retryIntervalRef.current = null;
        setRateLimited(false);
        // Call the latest load function safely
        if (typeof loadRef.current === "function") {
          loadRef.current();
        }
      }
    }, 1000);
  }, []);

  const load = React.useCallback(async () => {
    // throttle duplicate requests
    const now = Date.now();
    if (inFlightRef.current) return; // Request already in flight
    // Throttle period: don't load if less than 2.5 seconds since last attempt started
    if (now - lastLoadAtRef.current < 2500 && lastLoadAtRef.current !== 0) return;

    inFlightRef.current = true;
    lastLoadAtRef.current = now; // Mark the start of the current load attempt

    setLoading(true);
    try {
      // session cache (60s) per filter
      const cacheKey = `doclist:${JSON.stringify({ initialFilter, category })}`;
      try {
        const cachedRaw = sessionStorage.getItem(cacheKey);
        if (cachedRaw) {
          const cached = JSON.parse(cachedRaw);
          if (cached?.ts && (Date.now() - cached.ts) < 60000) { // Cache valid for 60 seconds
            setDocs(cached.items || []);
            setLoading(false);
            inFlightRef.current = false;
            return;
          }
        }
      } catch (e) {
        console.error("Error reading from session storage:", e);
      }

      const filter = { ...initialFilter };
      if (category !== "all") filter.category = category;

      // smaller page to ease pressure
      const items = await Document.filter(filter, "-created_date", 25);
      setDocs(items || []);

      // cache success and reset backoff
      try {
        sessionStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), items: items || [] }));
      } catch (e) {
        console.error("Error writing to session storage:", e);
      }
      backoffMsRef.current = 3000; // Reset backoff on successful load
    } catch (err) {
      const msg = String(err?.message || err?.detail || "");
      const isRate = msg.toLowerCase().includes("rate") && msg.toLowerCase().includes("limit");
      if (isRate) {
        // exponential backoff up to 60s
        scheduleRetry(backoffMsRef.current);
        backoffMsRef.current = Math.min(backoffMsRef.current * 2, 60000); // Double backoff, max 60s
      } else {
        setDocs([]);
      }
    } finally {
      setLoading(false);
      inFlightRef.current = false;
      lastLoadAtRef.current = Date.now(); // Update last load time for throttling
    }
  }, [initialFilter, category, scheduleRetry]);

  // Keep loadRef in sync with the latest load
  React.useEffect(() => {
    loadRef.current = load;
  }, [load]);

  // Stagger first fetch slightly to avoid bursts competing with global loads
  React.useEffect(() => {
    const t = setTimeout(() => { load(); }, 500); // Increased initial delay to 500ms
    return () => clearTimeout(t);
  }, [load]);

  React.useEffect(() => {
    return () => {
      if (retryIntervalRef.current) {
        clearInterval(retryIntervalRef.current);
        retryIntervalRef.current = null;
      }
    };
  }, []);

  const handleDelete = async (doc) => {
    if (!confirm(`למחוק את "${doc.title || doc.filename}"?`)) return;
    await Document.delete(doc.id);
    // invalidate cache for current filter
    try {
      const cacheKey = `doclist:${JSON.stringify({ initialFilter, category })}`;
      sessionStorage.removeItem(cacheKey);
    } catch (e) {
      console.error("Error invalidating cache on delete:", e);
    }
    load();
  };

  const filtered = docs.filter(d => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (d.title || "").toLowerCase().includes(q) ||
      (d.filename || "").toLowerCase().includes(q) ||
      (d.category || "").toLowerCase().includes(q) ||
      (Array.isArray(d.tags) ? d.tags.join(" ").toLowerCase().includes(q) : false) ||
      (d.client_name || "").toLowerCase().includes(q) ||
      (d.project_name || "").toLowerCase().includes(q)
    );
  });

  return (
    <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm" dir={dir}>
      <CardContent className="p-4">
        {rateLimited && (
          <div className="mb-3 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2 text-right">
            הגעתם למגבלת בקשות. ננסה שוב בעוד {retryIn} שניות...
          </div>
        )}
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative md:w-1/2">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input placeholder="חיפוש לפי שם/תגיות/לקוח/פרויקט..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-9" />
          </div>
          <div className="flex items-center gap-3">
            <Filter className="w-4 h-4 text-slate-400" />
            <Select value={category} onValueChange={(v) => {
              // invalidate cache on filter change
              try {
                const cacheKey = `doclist:${JSON.stringify({ initialFilter, category: v })}`;
                sessionStorage.removeItem(cacheKey);
              } catch (e) {
                console.error("Error invalidating cache on category change:", e);
              }
              setCategory(v);
            }}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="קטגוריה" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הקטגוריות</SelectItem>
                <SelectItem value="שרטוט">שרטוט</SelectItem>
                <SelectItem value="חוזה">חוזה</SelectItem>
                <SelectItem value="תמונה">תמונה</SelectItem>
                <SelectItem value="חשבונית">חשבונית</SelectItem>
                <SelectItem value="אחר">אחר</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => {
              // manual refresh clears cache and loads
              try {
                const cacheKey = `doclist:${JSON.stringify({ initialFilter, category })}`;
                sessionStorage.removeItem(cacheKey);
              } catch (e) {
                console.error("Error invalidating cache on manual refresh:", e);
              }
              load();
            }}>רענן</Button>
          </div>
        </div>

        <div className="mt-4 border rounded-lg overflow-hidden bg-white">
          {loading ? (
            <div className="p-6 text-center text-slate-500">טוען מסמכים...</div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-center text-slate-500">אין מסמכים להצגה</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="text-right">כותרת</TableHead>
                  <TableHead className="text-right">קטגוריה</TableHead>
                  <TableHead className="text-right">לקוח</TableHead>
                  <TableHead className="text-right">פרויקט</TableHead>
                  <TableHead className="text-right">תגיות</TableHead>
                  <TableHead className="text-right">קובץ</TableHead>
                  <TableHead className="text-right">פעולות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((d) => (
                  <TableRow key={d.id} className="hover:bg-slate-50">
                    <TableCell className="font-medium">{d.title || d.filename}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-slate-50">{d.category || "אחר"}</Badge>
                    </TableCell>
                    <TableCell>{d.client_name || "-"}</TableCell>
                    <TableCell>{d.project_name || "-"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(Array.isArray(d.tags) ? d.tags : []).map((t, i) => (
                          <Badge key={i} variant="outline" className="bg-slate-50">
                            <TagIcon className="w-3 h-3 ml-1" />{t}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {d.file_url ? (
                        <a href={d.file_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:underline">
                          פתח <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : "-"}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="text-red-600" onClick={() => handleDelete(d)} title="מחק">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
