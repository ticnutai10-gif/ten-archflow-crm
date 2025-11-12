import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Save, X, PlusCircle, Trash2 } from "lucide-react";

export default function QuoteForm({ quote, clients, projects, onSubmit, onCancel }) {
  const [formData, setFormData] = useState(quote || {
    client_name: '',
    project_name: '',
    amount: 0,
    status: 'נשלחה',
    valid_until: '',
    description: '',
    items: [{ description: '', quantity: 1, unit_price: 0, total: 0 }],
    notes: ''
  });

  // ✅ הגנה מלאה על clients prop
  const safeClients = useMemo(() => {
    if (!clients) {
      console.warn('⚠️ [QuoteForm] clients is null/undefined');
      return [];
    }
    if (!Array.isArray(clients)) {
      console.error('❌ [QuoteForm] clients is not an array!', {
        type: typeof clients,
        value: clients
      });
      return [];
    }
    const valid = clients.filter(c => c && typeof c === 'object' && c.name);
    console.log('✅ [QuoteForm] safeClients:', valid.length);
    return valid;
  }, [clients]);

  // ✅ הגנה מלאה על projects prop
  const safeProjects = useMemo(() => {
    if (!projects) {
      console.warn('⚠️ [QuoteForm] projects is null/undefined');
      return [];
    }
    if (!Array.isArray(projects)) {
      console.error('❌ [QuoteForm] projects is not an array!', {
        type: typeof projects,
        value: projects
      });
      return [];
    }
    const valid = projects.filter(p => p && typeof p === 'object' && p.name);
    console.log('✅ [QuoteForm] safeProjects:', valid.length);
    return valid;
  }, [projects]);

  useEffect(() => {
    if (quote) {
      setFormData({
        ...quote,
        valid_until: quote.valid_until ? quote.valid_until.split('T')[0] : ''
      });
    }
  }, [quote]);

  const updateField = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;
    if (field === 'quantity' || field === 'unit_price') {
      newItems[index].total = (newItems[index].quantity || 0) * (newItems[index].unit_price || 0);
    }
    updateField('items', newItems);
  };
  
  useEffect(() => {
    const totalAmount = formData.items.reduce((sum, item) => sum + (item.total || 0), 0);
    updateField('amount', totalAmount);
  }, [formData.items]);

  const addItem = () => {
    updateField('items', [...formData.items, { description: '', quantity: 1, unit_price: 0, total: 0 }]);
  };

  const removeItem = (index) => {
    updateField('items', formData.items.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-2xl text-right" dir="rtl">
        <DialogHeader>
          <DialogTitle>{quote ? 'עריכת' : 'יצירת'} הצעת מחיר</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          <div className="space-y-2">
            <Label>לקוח</Label>
            <Select value={formData.client_name} onValueChange={(val) => updateField('client_name', val)}>
              <SelectTrigger><SelectValue placeholder="בחר לקוח" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>ללא</SelectItem>
                {safeClients.length === 0 ? (
                  <SelectItem value={null} disabled>אין לקוחות זמינים</SelectItem>
                ) : (
                  safeClients.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>פרויקט</Label>
            <Select value={formData.project_name} onValueChange={(val) => updateField('project_name', val)}>
              <SelectTrigger><SelectValue placeholder="בחר פרויקט" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>ללא</SelectItem>
                {safeProjects.length === 0 ? (
                  <SelectItem value={null} disabled>אין פרויקטים זמינים</SelectItem>
                ) : (
                  safeProjects.map(p => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>סטטוס</Label>
            <Select value={formData.status} onValueChange={(val) => updateField('status', val)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="נשלחה">נשלחה</SelectItem>
                <SelectItem value="בהמתנה">בהמתנה</SelectItem>
                <SelectItem value="אושרה">אושרה</SelectItem>
                <SelectItem value="נדחתה">נדחתה</SelectItem>
                <SelectItem value="פגה תוקף">פגה תוקף</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>תוקף עד</Label>
            <Input type="date" value={formData.valid_until} onChange={(e) => updateField('valid_until', e.target.value)} />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label>פריטים</Label>
          <div className="space-y-2 rounded-md border p-2">
            {formData.items.map((item, index) => (
              <div key={index} className="flex gap-2 items-center">
                <Input placeholder="תיאור" value={item.description} onChange={(e) => handleItemChange(index, 'description', e.target.value)} />
                <Input type="number" placeholder="כמות" value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', +e.target.value)} className="w-20"/>
                <Input type="number" placeholder="מחיר יחידה" value={item.unit_price} onChange={(e) => handleItemChange(index, 'unit_price', +e.target.value)} className="w-24" />
                <span className="w-24 font-mono">₪{item.total.toFixed(2)}</span>
                <Button variant="ghost" size="icon" onClick={() => removeItem(index)}><Trash2 className="w-4 h-4 text-red-500"/></Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addItem}><PlusCircle className="w-4 h-4 ml-2"/>הוסף פריט</Button>
          </div>
          <div className="text-left font-bold text-lg">סה"כ: ₪{formData.amount.toFixed(2)}</div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onCancel}>ביטול</Button>
          <Button onClick={() => onSubmit(formData)}>שמור</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}