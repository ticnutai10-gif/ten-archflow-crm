import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  DollarSign, Plus, Trash2, TrendingUp, TrendingDown, 
  AlertTriangle, CheckCircle2, Clock, PieChart
} from "lucide-react";
import { format } from "date-fns";

const BUDGET_CATEGORIES = [
  'תכנון ואדריכלות',
  'הנדסה וקונסטרוקציה', 
  'היתרים ואגרות',
  'עבודות בנייה',
  'חשמל ותקשורת',
  'אינסטלציה',
  'גמר ופיניש',
  'ריהוט וציוד',
  'פיקוח',
  'אחר'
];

export default function BudgetManager({ 
  budgetItems = [], 
  totalBudget = 0,
  onChange, 
  readOnly = false 
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState({
    category: '',
    description: '',
    planned_amount: '',
    actual_amount: '',
    status: 'ממתין',
    vendor: '',
    due_date: ''
  });

  // Calculate totals
  const totals = useMemo(() => {
    const planned = budgetItems.reduce((sum, item) => sum + (item.planned_amount || 0), 0);
    const actual = budgetItems.reduce((sum, item) => sum + (item.actual_amount || 0), 0);
    const paid = budgetItems.reduce((sum, item) => sum + (item.paid_amount || 0), 0);
    const pending = actual - paid;
    const remaining = totalBudget - actual;
    const budgetUsedPercent = totalBudget > 0 ? Math.round((actual / totalBudget) * 100) : 0;
    
    return { planned, actual, paid, pending, remaining, budgetUsedPercent };
  }, [budgetItems, totalBudget]);

  // Group by category
  const byCategory = useMemo(() => {
    const groups = {};
    budgetItems.forEach(item => {
      const cat = item.category || 'אחר';
      if (!groups[cat]) groups[cat] = { items: [], total: 0, actual: 0 };
      groups[cat].items.push(item);
      groups[cat].total += item.planned_amount || 0;
      groups[cat].actual += item.actual_amount || 0;
    });
    return groups;
  }, [budgetItems]);

  const addItem = () => {
    if (!newItem.description.trim()) return;
    const item = {
      ...newItem,
      id: Date.now().toString(),
      planned_amount: Number(newItem.planned_amount) || 0,
      actual_amount: Number(newItem.actual_amount) || 0,
      paid_amount: 0
    };
    onChange([...budgetItems, item]);
    setNewItem({
      category: '',
      description: '',
      planned_amount: '',
      actual_amount: '',
      status: 'ממתין',
      vendor: '',
      due_date: ''
    });
    setShowAddForm(false);
  };

  const updateItem = (id, updates) => {
    onChange(budgetItems.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const deleteItem = (id) => {
    if (confirm('האם למחוק את הפריט?')) {
      onChange(budgetItems.filter(item => item.id !== id));
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'שולם': return <Badge className="bg-green-100 text-green-700">שולם</Badge>;
      case 'אושר': return <Badge className="bg-blue-100 text-blue-700">אושר</Badge>;
      case 'בוטל': return <Badge className="bg-red-100 text-red-700">בוטל</Badge>;
      default: return <Badge className="bg-amber-100 text-amber-700">ממתין</Badge>;
    }
  };

  return (
    <Card className="shadow-lg border-0">
      <CardHeader className="border-b bg-gradient-to-l from-green-50 to-white pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3 text-xl">
            <DollarSign className="w-6 h-6 text-green-600" />
            ניהול תקציב
          </CardTitle>
          {!readOnly && (
            <Button 
              size="sm" 
              onClick={() => setShowAddForm(!showAddForm)}
              className="gap-2 bg-green-600 hover:bg-green-700"
            >
              <Plus className="w-4 h-4" />
              הוסף פריט
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-blue-50 rounded-xl p-3 text-center">
            <div className="text-xs text-blue-600 mb-1">תקציב כולל</div>
            <div className="text-lg font-bold text-blue-700">₪{totalBudget.toLocaleString()}</div>
          </div>
          <div className="bg-amber-50 rounded-xl p-3 text-center">
            <div className="text-xs text-amber-600 mb-1">הוצאות בפועל</div>
            <div className="text-lg font-bold text-amber-700">₪{totals.actual.toLocaleString()}</div>
          </div>
          <div className="bg-green-50 rounded-xl p-3 text-center">
            <div className="text-xs text-green-600 mb-1">שולם</div>
            <div className="text-lg font-bold text-green-700">₪{totals.paid.toLocaleString()}</div>
          </div>
          <div className={`rounded-xl p-3 text-center ${totals.remaining >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
            <div className={`text-xs ${totals.remaining >= 0 ? 'text-emerald-600' : 'text-red-600'} mb-1`}>
              {totals.remaining >= 0 ? 'נותר' : 'חריגה'}
            </div>
            <div className={`text-lg font-bold ${totals.remaining >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
              ₪{Math.abs(totals.remaining).toLocaleString()}
            </div>
          </div>
        </div>

        {/* Budget Progress */}
        <div className="bg-slate-50 rounded-xl p-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-slate-600">ניצול תקציב</span>
            <span className={`font-bold ${totals.budgetUsedPercent > 100 ? 'text-red-600' : totals.budgetUsedPercent > 80 ? 'text-amber-600' : 'text-green-600'}`}>
              {totals.budgetUsedPercent}%
            </span>
          </div>
          <Progress 
            value={Math.min(totals.budgetUsedPercent, 100)} 
            className={`h-3 ${totals.budgetUsedPercent > 100 ? '[&>div]:bg-red-500' : totals.budgetUsedPercent > 80 ? '[&>div]:bg-amber-500' : ''}`}
          />
          {totals.budgetUsedPercent > 100 && (
            <div className="flex items-center gap-2 mt-2 text-red-600 text-sm">
              <AlertTriangle className="w-4 h-4" />
              חריגה מהתקציב!
            </div>
          )}
        </div>

        {/* Add Form */}
        {showAddForm && !readOnly && (
          <div className="bg-green-50 rounded-xl p-4 space-y-3 border-2 border-green-200">
            <div className="grid grid-cols-2 gap-3">
              <Select value={newItem.category} onValueChange={(v) => setNewItem({ ...newItem, category: v })}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="קטגוריה" />
                </SelectTrigger>
                <SelectContent>
                  {BUDGET_CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="ספק/קבלן"
                value={newItem.vendor}
                onChange={(e) => setNewItem({ ...newItem, vendor: e.target.value })}
                className="bg-white"
              />
            </div>
            <Input
              placeholder="תיאור הפריט"
              value={newItem.description}
              onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
              className="bg-white"
            />
            <div className="grid grid-cols-3 gap-3">
              <Input
                type="number"
                placeholder="סכום מתוכנן"
                value={newItem.planned_amount}
                onChange={(e) => setNewItem({ ...newItem, planned_amount: e.target.value })}
                className="bg-white"
              />
              <Input
                type="number"
                placeholder="סכום בפועל"
                value={newItem.actual_amount}
                onChange={(e) => setNewItem({ ...newItem, actual_amount: e.target.value })}
                className="bg-white"
              />
              <Input
                type="date"
                value={newItem.due_date}
                onChange={(e) => setNewItem({ ...newItem, due_date: e.target.value })}
                className="bg-white"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowAddForm(false)}>ביטול</Button>
              <Button onClick={addItem} className="bg-green-600 hover:bg-green-700">הוסף</Button>
            </div>
          </div>
        )}

        {/* Items by Category */}
        {budgetItems.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <PieChart className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p>עדיין אין פריטי תקציב</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(byCategory).map(([category, data]) => (
              <div key={category} className="border rounded-xl overflow-hidden">
                <div className="bg-slate-100 px-4 py-2 flex justify-between items-center">
                  <span className="font-semibold">{category}</span>
                  <div className="flex gap-4 text-sm">
                    <span className="text-slate-600">מתוכנן: ₪{data.total.toLocaleString()}</span>
                    <span className={data.actual > data.total ? 'text-red-600 font-semibold' : 'text-green-600'}>
                      בפועל: ₪{data.actual.toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="divide-y">
                  {data.items.map(item => (
                    <div key={item.id} className="p-3 flex items-center gap-3 hover:bg-slate-50">
                      <div className="flex-1">
                        <div className="font-medium">{item.description}</div>
                        <div className="text-xs text-slate-500 flex gap-3 mt-1">
                          {item.vendor && <span>ספק: {item.vendor}</span>}
                          {item.due_date && <span>תאריך: {format(new Date(item.due_date), 'dd/MM/yyyy')}</span>}
                        </div>
                      </div>
                      <div className="text-left">
                        <div className="text-sm text-slate-500">מתוכנן: ₪{(item.planned_amount || 0).toLocaleString()}</div>
                        <div className="font-semibold">בפועל: ₪{(item.actual_amount || 0).toLocaleString()}</div>
                      </div>
                      {getStatusBadge(item.status)}
                      {!readOnly && (
                        <div className="flex gap-1">
                          <Select 
                            value={item.status} 
                            onValueChange={(v) => updateItem(item.id, { status: v })}
                          >
                            <SelectTrigger className="w-24 h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ממתין">ממתין</SelectItem>
                              <SelectItem value="אושר">אושר</SelectItem>
                              <SelectItem value="שולם">שולם</SelectItem>
                              <SelectItem value="בוטל">בוטל</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="text-red-600 h-8 w-8 p-0"
                            onClick={() => deleteItem(item.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}