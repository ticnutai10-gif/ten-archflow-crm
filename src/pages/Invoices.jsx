
import React from "react";
import { Invoice } from "@/entities/Invoice";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, RefreshCcw, Edit, Trash2, Search, Receipt, Send, Loader2 } from "lucide-react";
import InvoiceForm from "@/components/invoices/InvoiceForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { greenInvoice } from "@/functions/greenInvoice";
import { toast } from "sonner";

const statusMap = {
  draft: { label: "טיוטה", cls: "bg-slate-100 text-slate-700" },
  sent: { label: "נשלחה", cls: "bg-blue-100 text-blue-700" },
  viewed: { label: "נצפתה", cls: "bg-indigo-100 text-indigo-700" },
  paid: { label: "שולמה", cls: "bg-green-100 text-green-700" },
  overdue: { label: "באיחור", cls: "bg-amber-100 text-amber-700" },
  canceled: { label: "בוטלה", cls: "bg-red-100 text-red-700" },
};

export default function InvoicesPage() {
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [showForm, setShowForm] = React.useState(false);
  const [editing, setEditing] = React.useState(null);
  const [q, setQ] = React.useState("");

  const [giOpen, setGiOpen] = React.useState(false);
  const [giInvoice, setGiInvoice] = React.useState(null);
  const [giPath, setGiPath] = React.useState("/api/v1/documents/invoice");
  const [giMethod, setGiMethod] = React.useState("POST");
  const [giBody, setGiBody] = React.useState("");
  const [giLoading, setGiLoading] = React.useState(false);
  const GI_BASE_URL = "https://api.greeninvoice.co.il";

  const load = React.useCallback(async () => {
    setLoading(true);
    const list = await Invoice.list("-created_date", 500).catch(() => []);
    
    // ✅ הגנה על התוצאות
    const validList = Array.isArray(list) ? list : [];
    console.log("✅ [Invoices] Loaded invoices:", validList.length);
    
    setItems(validList);
    setLoading(false);
  }, []);

  React.useEffect(() => { load(); }, [load]);

  // ✅ הגנה על filtered
  const filtered = React.useMemo(() => {
    if (!Array.isArray(items)) {
      console.error("❌ [Invoices] items is not an array!", items);
      return [];
    }
    
    const s = q.trim().toLowerCase();
    if (!s) return items;
    
    return items.filter(inv => {
      if (!inv || typeof inv !== "object") return false;
      return (
        (inv.number || "").toLowerCase().includes(s) ||
        (inv.client_name || "").toLowerCase().includes(s) ||
        (inv.project_name || "").toLowerCase().includes(s) ||
        (inv.status || "").toLowerCase().includes(s)
      );
    });
  }, [items, q]);

  const onCreate = () => { setEditing(null); setShowForm(true); };
  const onEdit = (inv) => { setEditing(inv); setShowForm(true); };
  const onDelete = async (id) => {
    if (!confirm("למחוק חשבונית?")) return;
    await Invoice.delete(id);
    load();
  };

  const onSubmit = async (data) => {
    if (editing) await Invoice.update(editing.id, data);
    else await Invoice.create(data);
    setShowForm(false);
    setEditing(null);
    load();
  };

  const openGi = (inv) => {
    setGiInvoice(inv);
    // Build a simple default payload (ניתן לעריכה חופשית לפני שליחה)
    const payload = {
      // הערה: ייתכן שתצטרך להתאים לשדות המדויקים של ה-API של חשבונית ירוקה
      client: { name: inv.client_name || "לקוח ללא שם" },
      date: inv.issue_date || new Date().toISOString().slice(0, 10),
      currency: inv.currency || "ILS",
      items: [
        {
          description: inv.project_name || inv.number || "שירות",
          quantity: 1,
          price: Number(inv.amount || 0)
        }
      ],
      notes: inv.notes || ""
    };
    setGiBody(JSON.stringify(payload, null, 2));
    setGiPath("/api/v1/documents/invoice");
    setGiMethod("POST");
    setGiOpen(true);
  };

  const sendGi = async () => {
    let parsed = null;
    try { parsed = giBody ? JSON.parse(giBody) : {}; }
    catch { toast.error("גוף הבקשה אינו JSON תקין"); return; }

    setGiLoading(true);
    try {
      const { data } = await greenInvoice({
        action: "request",
        base_url: GI_BASE_URL,
        path: giPath || "/",
        method: giMethod,
        body: parsed
      });
      if (data?.ok) {
        toast.success("נשלח בהצלחה לחשבונית ירוקה");
      } else {
        toast.error("השליחה נכשלה", { description: `סטטוס ${data?.status || "-"} ${data?.message || ""}` });
      }
    } catch (e) {
      toast.error("שגיאה בשליחה", { description: e?.response?.data?.error || e?.message });
    } finally {
      setGiLoading(false);
      setGiOpen(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen pl-24 lg:pl-12" dir="rtl">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-slate-900">חשבוניות</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={load} className="gap-1"><RefreshCcw className="w-4 h-4" /> רענן</Button>
            <Button onClick={onCreate} className="gap-1"><Plus className="w-4 h-4" /> חשבונית חדשה</Button>
          </div>
        </div>

        {showForm && (
          <Card className="mb-6 shadow-lg border-0 bg-white/90">
            <CardHeader><CardTitle>{editing ? "עריכת חשבונית" : "חשבונית חדשה"}</CardTitle></CardHeader>
            <CardContent>
              <InvoiceForm initial={editing} onSubmit={onSubmit} onCancel={() => { setShowForm(false); setEditing(null); }} />
            </CardContent>
          </Card>
        )}

        <Card className="shadow-lg border-0 bg-white/80">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Search className="w-4 h-4 text-slate-400" />
              <Input placeholder="חיפוש לפי מספר/לקוח/פרויקט/סטטוס..." value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <div className="overflow-auto">
              {loading ? (
                <div className="p-8 text-center text-slate-500">טוען...</div>
              ) : filtered.length === 0 ? (
                <div className="p-8 text-center text-slate-500">אין חשבוניות להצגה</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="text-right">מס׳</TableHead>
                      <TableHead className="text-right">לקוח</TableHead>
                      <TableHead className="text-right">פרויקט</TableHead>
                      <TableHead className="text-right">סכום</TableHead>
                      <TableHead className="text-right">סטטוס</TableHead>
                      <TableHead className="text-right">פעולות</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(inv => (
                      <TableRow key={inv.id} className="hover:bg-slate-50">
                        <TableCell>{inv.number || "-"}</TableCell>
                        <TableCell>{inv.client_name || "-"}</TableCell>
                        <TableCell>{inv.project_name || "-"}</TableCell>
                        <TableCell>{Number(inv.amount || 0).toLocaleString()} {inv.currency || "ILS"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={(statusMap[inv.status]?.cls) || "bg-slate-100 text-slate-700"}>
                            {statusMap[inv.status]?.label || inv.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => onEdit(inv)} title="ערוך"><Edit className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" className="text-red-600" onClick={() => onDelete(inv.id)} title="מחק"><Trash2 className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => openGi(inv)} title="שלח לחשבונית ירוקה">
                              <Receipt className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* דיאלוג שליחה לחשבונית ירוקה */}
      {giOpen && (
        <Dialog open={giOpen} onOpenChange={setGiOpen}>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Receipt className="w-5 h-5" />
                שליחה לחשבונית ירוקה
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="grid md:grid-cols-3 gap-2">
                <div className="md:col-span-2">
                  <label className="text-xs text-slate-500">Path</label>
                  <Input value={giPath} onChange={(e) => setGiPath(e.target.value)} placeholder="/api/v1/documents/invoice" />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Method</label>
                  <Input value={giMethod} onChange={(e) => setGiMethod(e.target.value.toUpperCase())} placeholder="POST" />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-500">Body (JSON)</label>
                <Textarea value={giBody} onChange={(e) => setGiBody(e.target.value)} className="min-h-[180px]" />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setGiOpen(false)}>ביטול</Button>
              <Button onClick={sendGi} disabled={giLoading} className="gap-1">
                {giLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                שלח
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
