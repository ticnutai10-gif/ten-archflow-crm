import React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";

export default function InvoiceForm({ initial = null, onSubmit, onCancel }) {
  const [form, setForm] = React.useState(() => initial || {
    number: "",
    client_id: "",
    client_name: "",
    project_id: "",
    project_name: "",
    currency: "ILS",
    amount: 0,
    status: "draft",
    issue_date: "",
    due_date: "",
    notes: "",
    items: [{ description: "", quantity: 1, unit_price: 0, total: 0 }]
  });

  const recalc = (items) => {
    const calc = items.map(it => ({ ...it, total: (Number(it.quantity) || 0) * (Number(it.unit_price) || 0) }));
    const sum = calc.reduce((s, it) => s + (Number(it.total) || 0), 0);
    setForm(f => ({ ...f, items: calc, amount: sum }));
  };

  const updateItem = (idx, key, val) => {
    const items = [...form.items];
    items[idx] = { ...items[idx], [key]: val };
    recalc(items);
  };

  const addItem = () => recalc([...(form.items || []), { description: "", quantity: 1, unit_price: 0, total: 0 }]);
  const removeItem = (idx) => recalc((form.items || []).filter((_, i) => i !== idx));

  const submit = (e) => {
    e.preventDefault();
    onSubmit && onSubmit(form);
  };

  return (
    <form onSubmit={submit} className="space-y-4" dir="rtl">
      <div className="grid md:grid-cols-2 gap-3">
        <Input placeholder="מספר חשבונית (רשות)" value={form.number || ""} onChange={(e) => setForm({ ...form, number: e.target.value })} />
        <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
          <SelectTrigger><SelectValue placeholder="מטבע" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ILS">ILS</SelectItem>
            <SelectItem value="USD">USD</SelectItem>
            <SelectItem value="EUR">EUR</SelectItem>
          </SelectContent>
        </Select>

        <Input placeholder="שם לקוח" value={form.client_name || ""} onChange={(e) => setForm({ ...form, client_name: e.target.value })} />
        <Input placeholder="שם פרויקט (רשות)" value={form.project_name || ""} onChange={(e) => setForm({ ...form, project_name: e.target.value })} />

        <Input type="date" placeholder="תאריך הפקה" value={form.issue_date || ""} onChange={(e) => setForm({ ...form, issue_date: e.target.value })} />
        <Input type="date" placeholder="תאריך פירעון" value={form.due_date || ""} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />

        <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
          <SelectTrigger><SelectValue placeholder="סטטוס" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="draft">טיוטה</SelectItem>
            <SelectItem value="sent">נשלחה</SelectItem>
            <SelectItem value="viewed">נצפתה</SelectItem>
            <SelectItem value="paid">שולמה</SelectItem>
            <SelectItem value="overdue">באיחור</SelectItem>
            <SelectItem value="canceled">בוטלה</SelectItem>
          </SelectContent>
        </Select>

        <Textarea placeholder="הערות לחשבונית" value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="md:col-span-2" />
      </div>

      <Card className="bg-white/80">
        <CardContent className="p-4 space-y-3">
          <div className="flex justify-between items-center">
            <div className="font-semibold">שורות חשבונית</div>
            <Button type="button" variant="outline" size="sm" onClick={addItem} className="gap-1">
              <Plus className="w-4 h-4" /> הוסף שורה
            </Button>
          </div>
          {(form.items || []).map((it, idx) => (
            <div key={idx} className="grid md:grid-cols-4 gap-2 items-center">
              <Input placeholder="תיאור" value={it.description} onChange={(e) => updateItem(idx, "description", e.target.value)} className="md:col-span-2" />
              <Input type="number" placeholder="כמות" value={it.quantity} onChange={(e) => updateItem(idx, "quantity", e.target.value)} />
              <Input type="number" placeholder="מחיר ליחידה" value={it.unit_price} onChange={(e) => updateItem(idx, "unit_price", e.target.value)} />
              <div className="text-sm text-slate-600 md:col-span-4">סה״כ לשורה: {(Number(it.total) || 0).toLocaleString()}</div>
              <div className="md:col-span-4 flex justify-end">
                <Button type="button" variant="ghost" size="sm" className="text-red-600" onClick={() => removeItem(idx)}>
                  <Trash2 className="w-4 h-4" /> מחק שורה
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-between items-center">
        <div className="text-lg font-semibold">סה״כ: {Number(form.amount || 0).toLocaleString()} {form.currency}</div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>בטל</Button>
          <Button type="submit">שמור</Button>
        </div>
      </div>
    </form>
  );
}