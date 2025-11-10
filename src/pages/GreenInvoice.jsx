
import React, { useMemo, useState } from "react";
import { greenInvoice } from "@/functions/greenInvoice";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Receipt, Filter, Calendar, RefreshCcw, Download, BarChart3, Search, Globe, FileText, Sliders, Code, TrendingUp, Save } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { format } from "date-fns";
import { toast } from "sonner"; // Added import for toast notifications
import FieldEditDialog from "../components/gi/FieldEditDialog";
import AdvancedBodyEditor from "../components/gi/AdvancedBodyEditor";

const GI_BASE_URL = "https://api.greeninvoice.co.il";

// Utility to safely extract nested fields
const getPath = (obj, path) => {
  if (!obj || !path) return undefined;
  return path.split(".").reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);
};

// Heuristic field detection for common GI document shapes
function pickFields(item) {
  const id =
    item.id ||
    item._id ||
    item.number ||
    item.docNumber ||
    item.documentNumber ||
    item.uuid;

  // הרחבת זיהוי שדות תאריך נפוצים במסמכים וקבלות
  const dateRaw =
    item.date ??
    item.issueDate ??
    item.issuedDate ??
    item.receiptDate ??
    item.paymentDate ??
    item.incomeDate ??
    item.created ??
    item.createDate ??
    item.creationDate ??
    getPath(item, "payment.date") ??
    getPath(item, "document.date");

  const type = item.type || item.documentType || item.kind;
  const status = item.status || item.state;
  const clientName =
    getPath(item, "client.name") ||
    item.client_name ||
    item.customer ||
    getPath(item, "supplier.name") ||
    item.supplier ||
    item.name;

  const amount =
    item.total != null
      ? item.total
      : item.amount != null
      ? item.amount
      : item.sum != null
      ? item.sum
      : getPath(item, "totals.total") != null
      ? getPath(item, "totals.total")
      : getPath(item, "payment.total") != null
      ? getPath(item, "payment.total")
      : getPath(item, "price") != null
      ? item.price
      : null;

  return { id, date: dateRaw, type, status, clientName, amount };
}

// עדכון toISO כך שיתמוך גם ב-timestamp (שניות/מילישניות) ומחרוזת מספרית
function toISO(dateInput) {
  if (dateInput === null || dateInput === undefined || dateInput === "") return "";
  try {
    // מספר (timestamp)
    if (typeof dateInput === "number") {
      let ms = dateInput;
      // Heuristic: if number is less than 10^12, assume it's seconds and convert to milliseconds
      // 10^12 is roughly `2001-09-09 01:46:40 UTC` (timestamp in ms)
      // 10^9 is roughly `2001-09-09 01:46:40 UTC` (timestamp in s)
      if (ms < 1e12 && ms.toString().length < 13) ms *= 1000;
      const d = new Date(ms);
      return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
    }
    // מחרוזת מספרית (timestamp)
    if (typeof dateInput === "string") {
      const s = dateInput.trim();
      if (/^\d+$/.test(s)) {
        let n = parseInt(s, 10);
        // Same heuristic for numeric strings
        if (n < 1e12 && s.length < 13) n *= 1000;
        const d = new Date(n);
        return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
      }
      // מחרוזת תאריך רגילה
      const d = new Date(s);
      return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
    }
    // כבר Date
    if (dateInput instanceof Date) {
      return isNaN(dateInput.getTime()) ? "" : dateInput.toISOString().slice(0, 10);
    }
    return "";
  } catch {
    return "";
  }
}

export default function GreenInvoice() {
  const [loading, setLoading] = useState(false);
  const [baseUrl, setBaseUrl] = useState(GI_BASE_URL);
  const [preset, setPreset] = useState("invoices"); // invoices | receipts | expenses | custom
  const [method, setMethod] = useState("POST");
  const [path, setPath] = useState("/api/v1/documents/search"); // ניתן לשנות אם הספק דורש נתיב אחר
  const [body, setBody] = useState("");
  const [query, setQuery] = useState("");
  const [fromDate, setFromDate] = useState(() => toISO(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
  const [toDate, setToDate] = useState(() => toISO(new Date()));
  const [result, setResult] = useState(null);
  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState({ income: 0, expense: 0, count: 0 });

  // New state variables for authentication check
  const [authLoading, setAuthLoading] = useState(false);
  const [authOk, setAuthOk] = useState(null); // null, true, or false
  const [authMsg, setAuthMsg] = useState("");
  const [monthlyData, setMonthlyData] = useState([]); // NEW: current-year revenue
  const [importing, setImporting] = useState(false);

  // NEW: שליטה במיון וסיכום
  const [sortOrder, setSortOrder] = useState("desc"); // 'asc' | 'desc'
  const [groupBy, setGroupBy] = useState("none"); // 'none' | 'day' | 'month' | 'year'

  // Build a suggested request body based on preset
  const suggestedBody = useMemo(() => {
    // הוספת שני הפורמטים: dateFrom/dateTo וגם fromDate/toDate
    const common = {
      page: 1,
      pageSize: 50,
      dateFrom: fromDate,
      dateTo: toDate,
      fromDate: fromDate,
      toDate: toDate
    };
    if (preset === "invoices") {
      return JSON.stringify({ ...common, types: ["invoice", "taxInvoice", "invoiceTax"] }, null, 2);
    }
    if (preset === "receipts") {
      return JSON.stringify({ ...common, types: ["receipt", "invoiceReceipt"] }, null, 2);
    }
    if (preset === "expenses") {
      return JSON.stringify({ ...common, types: ["expense", "supplierInvoice"] }, null, 2);
    }
    return JSON.stringify({ ...common }, null, 2);
  }, [preset, fromDate, toDate]);

  // סנכרון אוטומטי: בכל שינוי פריסט/תאריכים - עדכן מתודה/נתיב/Body מוצע
  // This replaces the explicit `applyPreset` button for method/path/body updates
  React.useEffect(() => {
    setMethod("POST");
    setPath("/api/v1/documents/search");
    setBody(suggestedBody);
  }, [suggestedBody]);

  // קיצורי טווחי תאריכים
  const setQuickRange = (key) => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (key === "today") {
      const d = new Date();
      const iso = fmt(d);
      setFromDate(iso);
      setToDate(iso);
      return;
    }
    if (key === "yesterday") {
      const d = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const iso = fmt(d);
      setFromDate(iso);
      setToDate(iso);
      return;
    }
    if (key === "this_month") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0); // Last day of current month
      setFromDate(fmt(start));
      setToDate(fmt(end));
      return;
    }
    if (key === "prev_month") {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0); // Last day of previous month
      setFromDate(fmt(start));
      setToDate(fmt(end));
      return;
    }
  };

  const resetAll = () => {
    setBaseUrl(GI_BASE_URL);
    setPreset("invoices"); // Default preset
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    setFromDate(fmt(startMonth));
    setToDate(fmt(now)); // Today's date
    setMethod("POST");
    setPath("/api/v1/documents/search");
    // Suggested body will automatically update after fromDate/toDate/preset states are set
    // This explicit call ensures the body textarea is updated immediately if needed
    setBody(suggestedBody); // Use the suggestedBody based on new dates/preset
    setRows([]);
    setResult(null);
    setTotals({ income: 0, expense: 0, count: 0 });
    setAuthOk(null);
    setAuthMsg("");
    setMonthlyData([]); // Reset monthly data on full reset
    setSortOrder("desc"); // Reset sort order
    setGroupBy("none"); // Reset group by
    toast.info("כל הפרמטרים אופסו לברירת המחדל");
  };

  // NEW: Load current year revenue by month
  const loadYearRevenue = async () => {
    const now = new Date();
    const yearStart = `${now.getFullYear()}-01-01`;
    const yearEnd = `${now.getFullYear()}-12-31`;

    try {
      const { data } = await greenInvoice({
        action: "request",
        base_url: baseUrl,
        path: "/api/v1/documents/search",
        method: "POST",
        body: {
          page: 1,
          pageSize: 500,
          dateFrom: yearStart,
          dateTo: yearEnd,
          types: ["invoice", "taxInvoice", "invoiceTax"]
        }
      });

      const items = Array.isArray(data?.body?.items) ? data.body.items
        : Array.isArray(data?.body?.documents) ? data.body.documents
        : Array.isArray(data?.body?.data) ? data.body.data
        : Array.isArray(data?.items) ? data.items
        : Array.isArray(data) ? data
        : [];

      const normalized = items.map(pickFields);
      const map = new Map();
      for (const it of normalized) {
        const d = it.date ? new Date(it.date) : null;
        if (!d || isNaN(d.getTime())) continue;
        const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
        const amt = Number(it.amount || 0);
        map.set(key, (map.get(key) || 0) + (isNaN(amt) ? 0 : amt));
      }
      const arr = Array.from(map.entries()).sort((a,b) => a[0].localeCompare(b[0])).map(([k, v]) => ({ name: k, value: Math.round(v) }));
      setMonthlyData(arr);
      if (arr.length === 0) toast.info("לא נמצאו הכנסות בשנה הנוכחית");
      else toast.success("הכנסות השנה נטענו");
    } catch (e) {
      toast.error("טעינת הכנסות השנה נכשלה", { description: String(e?.response?.data?.error || e?.message || "") });
    }
  };

  // NEW: Import current-year income to our Invoice entity
  const importYearInvoices = async () => {
    setImporting(true);
    try {
      const now = new Date();
      const yearStart = `${now.getFullYear()}-01-01`;
      const yearEnd = `${now.getFullYear()}-12-31`;

      const { data } = await greenInvoice({
        action: "request",
        base_url: baseUrl,
        path: "/api/v1/documents/search",
        method: "POST",
        body: {
          page: 1,
          pageSize: 500,
          dateFrom: yearStart,
          dateTo: yearEnd,
          types: ["invoice", "taxInvoice", "invoiceTax"]
        }
      });

      const items = Array.isArray(data?.body?.items) ? data.body.items
        : Array.isArray(data?.body?.documents) ? data.body.documents
        : Array.isArray(data?.body?.data) ? data.body.data
        : Array.isArray(data?.items) ? data.items
        : Array.isArray(data) ? data
        : [];

      const normalized = items.map(pickFields);

      // Fetch existing invoices to avoid duplicates by external_id (GI id/number)
      const { Invoice } = await import("@/entities/Invoice");
      const existing = await Invoice.list();
      const existingSet = new Set((existing || []).map(r => r.external_id).filter(Boolean));

      const toCreate = normalized
        .filter(r => r.id && !existingSet.has(String(r.id)))
        .map((r) => ({
          external_id: String(r.id),
          number: String(r.id),
          client_name: r.clientName || "",
          amount: Number(r.amount || 0),
          status: "sent",
          currency: "ILS",
          issue_date: r.date ? toISO(r.date) : null,
          notes: "Imported from GreenInvoice"
        }));

      if (toCreate.length === 0) {
        toast.info("אין מסמכים חדשים לייבוא");
      } else {
        await Invoice.bulkCreate(toCreate);
        toast.success(`יבוא הושלם: ${toCreate.length} מסמכים נוספו`);
        // fire app event
        window.dispatchEvent(new CustomEvent("invoice:imported", { detail: { count: toCreate.length } }));
      }
    } catch (e) {
      toast.error("יבוא הכנסות נכשל", { description: String(e?.response?.data?.error || e?.message || "") });
    } finally {
      setImporting(false);
    }
  };

  const runAuth = async () => {
    setAuthLoading(true);
    setAuthOk(null);
    setAuthMsg("");
    try {
      const { data } = await greenInvoice({ action: "authTest", base_url: baseUrl });
      setAuthOk(true);
      setAuthMsg(`Token ✓ (${data?.token_preview || "—"})`);
      toast.success("התחברות לחשבונית ירוקה הצליחה");
    } catch (e) {
      setAuthOk(false);
      setAuthMsg(e?.response?.data?.error || e?.message || "שגיאה");
      toast.error("בדיקת התחברות נכשלה", { description: String(e?.response?.data?.error || e?.message || "") });
      // אם קיבלנו 403 בסביבת הפרודקשן - כנראה המפתחות הם של Sandbox
      const errText = String(e?.response?.data?.error || e?.message || "");
      if (baseUrl.includes("api.greeninvoice.co.il") && /403/.test(errText)) {
        setBaseUrl("https://sandbox.d.greeninvoice.co.il");
        toast.info("זוהתה בעיית הרשאה ב-Production. עברתי אוטומטית ל-Sandbox. לחץ שוב על בדיקת התחברות.");
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const run = async () => {
    setLoading(true);
    setResult(null);
    setRows([]);
    setTotals({ income: 0, expense: 0, count: 0 });

    let parsed = undefined;
    if (body && body.trim()) {
      try { parsed = JSON.parse(body); }
      catch {
        // אם ה-Body לא תקין - נ fallback ל-suggestedBody
        try {
          parsed = JSON.parse(suggestedBody);
          toast.warning("גוף הבקשה שסופק אינו JSON תקין. משתמש בפריסט.");
        }
        catch {
          toast.error("גוף הבקשה אינו JSON תקין", { description: "ודא שה-JSON תקין או השתמש ב'החל פריסט'" });
          setLoading(false);
          return;
        }
      }
    } else {
      // ללא Body ידני - נשתמש ב-suggested
      try { parsed = JSON.parse(suggestedBody); } catch {}
    }

    try {
      const { data } = await greenInvoice({
        action: "request",
        base_url: baseUrl,
        path: path || "/",
        method,
        body: parsed
      });
      setResult(data);

      // Try to normalize list of documents, expanded to cover more common API responses
      const items =
        Array.isArray(data?.body) ? data.body :
        Array.isArray(data?.body?.items) ? data.body.items :
        Array.isArray(data?.body?.documents) ? data.body.documents :
        Array.isArray(data?.body?.data) ? data.body.data :
        Array.isArray(data?.items) ? data.items : // Added
        Array.isArray(data?.documents) ? data.documents : // Added
        Array.isArray(data?.data) ? data.data : // Added
        Array.isArray(data) ? data :
        [];

      const normalized = items.map(pickFields);
      setRows(normalized);

      // Calculate totals (heuristic: expenses detected by type keywords)
      const sums = normalized.reduce((acc, it) => {
        const amt = Number(it.amount || 0);
        const t = String(it.type || "").toLowerCase();
        const isExpense = t.includes("expense") || t.includes("supplier") || t.includes("cost");
        if (isExpense) acc.expense += amt;
        else acc.income += amt;
        acc.count += 1;
        return acc;
      }, { income: 0, expense: 0, count: 0 });
      setTotals(sums);

      if (normalized.length === 0) {
        toast.info("לא נמצאו מסמכים בטווח ובפריסט שנבחרו");
      } else {
        toast.success(`נמצאו ${normalized.length} מסמכים`);
      }
    } catch (e) {
      setResult({ ok: false, error: e?.response?.data?.error || e?.message || "שגיאה לא ידועה" });
      toast.error("שגיאה בשליפת נתונים", { description: String(e?.response?.data?.error || e?.message || "") });
      // אם קיבלנו 403 בסביבת הפרודקשן - כנראה המפתחות הם של Sandbox
      const errText = String(e?.response?.data?.error || e?.message || "");
      if (baseUrl.includes("api.greeninvoice.co.il") && /403/.test(errText)) {
        setBaseUrl("https://sandbox.d.greeninvoice.co.il");
        toast.info("זוהתה בעיית הרשאה ב-Production. עברתי אוטומטית ל-Sandbox. לחץ שוב על 'הבא נתונים'.");
      }
    } finally {
      setLoading(false);
    }
  };

  // החלפת filteredRows: מוסיפים סינון תאריכים בצד הלקוח + מיון
  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    let arr = rows;

    if (q) {
      arr = arr.filter(r =>
        String(r.id || "").toLowerCase().includes(q) ||
        String(r.clientName || "").toLowerCase().includes(q) ||
        String(r.type || "").toLowerCase().includes(q) ||
        String(r.status || "").toLowerCase().includes(q)
      );
    }

    // סינון לפי טווח תאריכים (Client-side safeguard)
    const toTime = (val) => {
      if (val === null || val === undefined || val === "") return -Infinity;
      if (typeof val === "number") {
        let ms = val;
        if (ms < 1e12 && ms.toString().length < 13) ms *= 1000; // seconds -> ms
        return ms;
      }
      if (typeof val === "string" && /^\d+$/.test(val.trim())) {
        let n = parseInt(val.trim(), 10);
        if (n < 1e12 && val.trim().length < 13) n *= 1000; // seconds -> ms
        return n;
      }
      const d = new Date(val);
      return isNaN(d.getTime()) ? -Infinity : d.getTime();
    };

    const fromTs = fromDate ? new Date(fromDate).getTime() : -Infinity;
    const toTs = toDate ? (new Date(toDate).getTime() + 24*60*60*1000 - 1) : Infinity;

    arr = arr.filter(r => {
      const t = toTime(r.date);
      return t >= fromTs && t <= toTs;
    });

    // מיון לפי תאריך
    const sorted = arr.slice().sort((a, b) => {
      const ta = toTime(a.date);
      const tb = toTime(b.date);
      if (sortOrder === "asc") return ta - tb;
      return tb - ta;
    });

    return sorted;
  }, [rows, query, sortOrder, fromDate, toDate]);

  // סיכום לפי יום/חודש/שנה
  const groupedSummary = useMemo(() => {
    if (groupBy === "none") return [];

    const keyFor = (dStr) => {
      const iso = toISO(dStr);
      if (!iso) return "—";
      if (groupBy === "day") return iso;             // YYYY-MM-DD
      if (groupBy === "month") return iso.slice(0, 7); // YYYY-MM
      if (groupBy === "year") return iso.slice(0, 4);  // YYYY
      return iso;
    };

    const isExpenseType = (t) => {
      const s = String(t || "").toLowerCase();
      return s.includes("expense") || s.includes("supplier") || s.includes("cost");
    };

    const map = new Map();
    for (const r of filteredRows) {
      const k = keyFor(r.date);
      if (k === "—") continue; // Skip items with invalid dates for grouping
      const amt = Number(r.amount || 0);
      const exp = isExpenseType(r.type);
      const prev = map.get(k) || { period: k, income: 0, expense: 0, net: 0, count: 0 };
      if (exp) prev.expense += amt; else prev.income += amt;
      prev.net = (prev.income) - (prev.expense);
      prev.count += 1;
      map.set(k, prev);
    }

    // מיון מפתחות לפי סדר כרונולוגי
    const parseKeyTime = (k) => {
      // day: YYYY-MM-DD, month: YYYY-MM, year: YYYY
      if (groupBy === "day") return new Date(k).getTime();
      if (groupBy === "month") return new Date(k + "-01").getTime();
      if (groupBy === "year") return new Date(k + "-01-01").getTime();
      return 0; // Should not happen for valid keys
    };

    const arr = Array.from(map.values()).sort((a, b) => {
      const ta = parseKeyTime(a.period);
      const tb = parseKeyTime(b.period);
      return sortOrder === "asc" ? ta - tb : tb - ta;
    });

    return arr;
  }, [filteredRows, groupBy, sortOrder]);

  // התאמת הגרף לפי groupBy (נטו: הכנסה פחות הוצאה)
  const chartData = useMemo(() => {
    if (groupBy !== "none") {
      return groupedSummary.map(row => ({
        name: row.period,
        value: Math.round(row.net)
      }));
    }

    // ברירת מחדל: לפי יום, בדומה לקודם
    const map = new Map();
    filteredRows.forEach(r => {
      const d = r.date ? toISO(r.date) : "";
      const amt = Number(r.amount || 0);
      if (!d) return;
      const prev = map.get(d) || 0;
      const t = String(r.type || "").toLowerCase();
      const val = (t.includes("expense") || t.includes("supplier")) ? -Math.abs(amt) : Math.abs(amt);
      map.set(d, prev + val);
    });
    const arr = Array.from(map.entries())
      .sort((a, b) => sortOrder === "asc" ? a[0].localeCompare(b[0]) : b[0].localeCompare(a[0]))
      .map(([name, value]) => ({ name, value }));
    return arr;
  }, [filteredRows, groupBy, groupedSummary, sortOrder]);

  // הוספת פונקציית ייצוא JSON
  const exportJSON = () => {
    if (!result) return;
    const dataToExport = result?.body ?? result;
    const json = JSON.stringify(dataToExport, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    const from = (fromDate || "").replaceAll("-", "");
    const to = (toDate || "").replaceAll("-", "");
    const namePart = preset ? `${preset}_` : "";
    a.href = url;
    a.download = `greeninvoice_${namePart}${from}_${to}.json`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  };

  return (
    <div className="p-6 lg:p-8 min-h-screen bg-gradient-to-br from-slate-50 to-slate-100" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Receipt className="w-7 h-7 text-emerald-600" />
            <h1 className="text-3xl font-bold text-slate-900">חשבונית ירוקה – הכנסות, הוצאות וקבלות</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={resetAll} className="gap-2">
              <RefreshCcw className="w-4 h-4" /> איפוס כללי
            </Button>
            <Button variant="outline" onClick={runAuth} disabled={authLoading} className="gap-2">
              {authLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldIcon />}
              בדיקת התחברות
            </Button>
            {authOk !== null && (
              <Badge variant={authOk ? "default" : "destructive"} className={authOk ? "bg-emerald-100 text-emerald-700" : ""}>
                {authOk ? "מחובר" : "שגיאת התחברות"} {authMsg ? `• ${authMsg}` : ""}
              </Badge>
            )}
          </div>
        </div>

        {/* Controls card */}
        <Card className="shadow-lg border-0 bg-white/85 backdrop-blur-sm rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-slate-900">
              <Filter className="w-5 h-5 text-indigo-500" />
              מסננים וחיבור
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Presets and Environment Selection */}
            <div className="flex flex-wrap gap-2">
              <Button variant={preset === "invoices" ? "default" : "outline"} size="sm" onClick={() => setPreset("invoices")}>חשבוניות הכנסה</Button>
              <Button variant={preset === "receipts" ? "default" : "outline"} size="sm" onClick={() => setPreset("receipts")}>קבלות</Button>
              <Button variant={preset === "expenses" ? "default" : "outline"} size="sm" onClick={() => setPreset("expenses")}>הוצאות/ספקים</Button>
              <Button variant={preset === "custom" ? "default" : "outline"} size="sm" onClick={() => setPreset("custom")}>מותאם אישית</Button>
              <div className="ml-auto flex items-center gap-1">
                <Button size="sm" variant="outline" onClick={() => setBaseUrl("https://api.greeninvoice.co.il")} className="gap-1">
                  <Globe className="w-3.5 h-3.5" /> Production
                </Button>
                <Button size="sm" variant="outline" onClick={() => setBaseUrl("https://sandbox.d.greeninvoice.co.il")} className="gap-1">
                  <Globe className="w-3.5 h-3.5" /> Sandbox
                </Button>
              </div>
            </div>

            {/* Short info row with icon-based editors */}
            <div className="flex flex-wrap items-center gap-2">
              <FieldEditDialog
                icon={Globe}
                label="Base URL"
                value={baseUrl}
                onSave={(v) => setBaseUrl(v)}
                type="text"
                placeholder="https://api.greeninvoice.co.il"
              />
              <FieldEditDialog
                icon={Sliders}
                label={`מתודה: ${method}`}
                value={method}
                onSave={(v) => setMethod(v)}
                type="select"
                selectOptions={["GET","POST","PUT","PATCH","DELETE","HEAD"]}
              />
              <FieldEditDialog
                icon={FileText}
                label="נתיב (Path)"
                value={path}
                onSave={(v) => setPath(v)}
                type="text"
                placeholder="/api/v1/documents/search"
              />
              <AdvancedBodyEditor body={body} setBody={setBody} suggestedBody={suggestedBody} />
            </div>

            {/* Dates + quick range */}
            <div className="grid md:grid-cols-5 gap-3">
              <div className="md:col-span-2">
                <label className="text-xs text-slate-500 flex items-center gap-2"><Calendar className="w-3 h-3" /> מתאריך</label>
                <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs text-slate-500 flex items-center gap-2"><Calendar className="w-3 h-3" /> עד תאריך</label>
                <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
              </div>
              <div className="col-span-1 flex items-end">
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => setQuickRange("today")}>היום</Button>
                  <Button size="sm" variant="outline" onClick={() => setQuickRange("yesterday")}>אתמול</Button>
                  <Button size="sm" variant="outline" onClick={() => setQuickRange("this_month")}>החודש</Button>
                  <Button size="sm" variant="outline" onClick={() => setQuickRange("prev_month")}>חודש קודם</Button>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 items-center">
              <Button variant="secondary" onClick={() => setBody(suggestedBody)} className="gap-2">
                <BarChart3 className="w-4 h-4" /> החל פריסט
              </Button>
              <Button onClick={run} disabled={loading} className="gap-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                הבא נתונים
              </Button>
              <Button variant="outline" onClick={loadYearRevenue} className="gap-2">
                <TrendingUp className="w-4 h-4" /> הכנסות השנה
              </Button>
              <Button variant="outline" onClick={importYearInvoices} disabled={importing} className="gap-2">
                {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                ייבוא הכנסות השנה
              </Button>
              <Button variant="outline" onClick={exportJSON} disabled={!result} className="gap-2">
                <Download className="w-4 h-4" /> ייצוא JSON
              </Button>

              {/* NEW: מיון לפי תאריך */}
              <div className="flex items-center gap-2 mr-auto"> {/* Changed ml-auto to mr-auto for RTL layout */}
                <div className="text-xs text-slate-500">מיון תאריך</div>
                <Select value={sortOrder} onValueChange={setSortOrder}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="מיון" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">יורד (מהחדש לישן)</SelectItem>
                    <SelectItem value="asc">עולה (מהישן לחדש)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* NEW: סיכום לפי */}
              <div className="flex items-center gap-2">
                <div className="text-xs text-slate-500">סיכום לפי</div>
                <Select value={groupBy} onValueChange={setGroupBy}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="סיכום" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">ללא</SelectItem>
                    <SelectItem value="day">יום</SelectItem>
                    <SelectItem value="month">חודש</SelectItem>
                    <SelectItem value="year">שנה</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="shadow-lg border-0 bg-white/85 backdrop-blur-sm rounded-2xl lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-slate-900">
                תוצאות
                <Badge variant="outline" className="bg-slate-50">{filteredRows.length} רשומות</Badge>
                {groupBy !== "none" && (
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700">
                    סיכום לפי {groupBy === "day" ? "יום" : groupBy === "month" ? "חודש" : "שנה"}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* חיפוש */}
              <div className="mb-3 relative">
                <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input placeholder="חיפוש לפי מספר/לקוח/סוג/סטטוס..." value={query} onChange={(e) => setQuery(e.target.value)} className="pr-9" />
              </div>

              {/* NEW: טבלת סיכום לפי בחירה */}
              {groupBy !== "none" && (
                groupedSummary.length === 0 ? (
                  <div className="p-4 text-slate-500 border rounded-lg bg-slate-50 mb-4 text-center">
                    אין נתוני סיכום לתצוגה
                  </div>
                ) : (
                  <div className="overflow-auto border rounded-lg bg-white mb-4">
                    <table className="w-full text-right">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-3 py-2">תקופה</th>
                          <th className="px-3 py-2">הכנסה</th>
                          <th className="px-3 py-2">הוצאה</th>
                          <th className="px-3 py-2">נטו</th>
                          <th className="px-3 py-2">מסמכים</th>
                        </tr>
                      </thead>
                      <tbody>
                        {groupedSummary.map((row) => (
                          <tr key={row.period} className="border-t hover:bg-slate-50">
                            <td className="px-3 py-2">{row.period}</td>
                            <td className="px-3 py-2 text-emerald-700">{Math.round(row.income).toLocaleString()}</td>
                            <td className="px-3 py-2 text-rose-700">{Math.round(row.expense).toLocaleString()}</td>
                            <td className={`px-3 py-2 ${row.net >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                              {Math.round(row.net).toLocaleString()}
                            </td>
                            <td className="px-3 py-2">{row.count.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              )}

              {/* טבלת פרטים */}
              {loading ? (
                <div className="p-8 text-center text-slate-500">טוען...</div>
              ) : filteredRows.length === 0 ? (
                <div className="p-8 text-center text-slate-500">אין נתונים לתצוגה</div>
              ) : (
                <div className="overflow-auto border rounded-lg bg-white">
                  <table className="w-full text-right">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2">#</th>
                        <th className="px-3 py-2">תאריך</th>
                        <th className="px-3 py-2">לקוח/ספק</th>
                        <th className="px-3 py-2">סוג</th>
                        <th className="px-3 py-2">סטטוס</th>
                        <th className="px-3 py-2">סכום</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRows.map((r, idx) => (
                        <tr key={idx} className="border-t hover:bg-slate-50">
                          <td className="px-3 py-2">{r.id || "-"}</td>
                          <td className="px-3 py-2">{r.date ? toISO(r.date) : "-"}</td>
                          <td className="px-3 py-2">{r.clientName || "-"}</td>
                          <td className="px-3 py-2">{r.type || "-"}</td>
                          <td className="px-3 py-2">{r.status || "-"}</td>
                          <td className="px-3 py-2">{r.amount != null ? Number(r.amount).toLocaleString() : "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {result && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm text-slate-600">הצג JSON מלא</summary>
                  <pre className="bg-slate-50 border rounded p-3 text-xs overflow-auto max-h-96 mt-2">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </details>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0 bg-white/85 backdrop-blur-sm rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-slate-900">
                סיכום וגרף
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-3 rounded-lg bg-emerald-50 text-emerald-700">
                  <div className="text-xs">סה״כ הכנסות</div>
                  <div className="text-xl font-bold">{totals.income.toLocaleString()}</div>
                </div>
                <div className="p-3 rounded-lg bg-rose-50 text-rose-700">
                  <div className="text-xs">סה״כ הוצאות</div>
                  <div className="text-xl font-bold">{totals.expense.toLocaleString()}</div>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 text-slate-700 col-span-2">
                  <div className="text-xs">סה״כ מסמכים</div>
                  <div className="text-lg font-semibold">{totals.count}</div>
                </div>
              </div>

              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* NEW: Monthly revenue chart (only if loaded) */}
        {monthlyData.length > 0 && (
          <Card className="shadow-lg border-0 bg-white/85 backdrop-blur-sm rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-slate-900">
                הכנסות לפי חודש – השנה הנוכחית
                <TrendingUp className="w-5 h-5 text-emerald-500" />
              </CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[6,6,0,0]} fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        <div className="mt-6 text-sm text-slate-500">
          הערה: נקודות הקצה (path) וה-Body עשויים להשתנות לפי גרסת ה-API. אם נתיב החיפוש שונה אצלך, עדכן את השדה "נתיב" ואת ה-Body בהתאם לתיעוד שלך. הכפתור "החל פריסט" מספק תבנית התחלתית נפוצה.
        </div>
      </div>
    </div>
  );
}

// אייקון מגן קטן ללא תלות בספריה נוספת (inline SVG)
function ShieldIcon() {
  return (
    <svg className="w-4 h-4 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M12 3l7 4v5c0 5-3.5 9-7 9s-7-4-7-9V7l7-4z" strokeWidth="2" />
      <path d="M9 12l2 2 4-4" strokeWidth="2" />
    </svg>
  );
}
