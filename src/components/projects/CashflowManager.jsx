import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ArrowUpCircle, ArrowDownCircle, Plus, Trash2, 
  TrendingUp, TrendingDown, Calendar, Wallet
} from "lucide-react";
import { format, startOfMonth, endOfMonth, isWithinInterval, addMonths } from "date-fns";
import { he } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, Cell } from "recharts";

export default function CashflowManager({ 
  cashflow = [], 
  milestones = [],
  onChange, 
  readOnly = false 
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState({
    type: 'expense',
    description: '',
    amount: '',
    due_date: '',
    status: 'צפוי',
    milestone_id: ''
  });

  // Calculate totals
  const totals = useMemo(() => {
    const expectedIncome = cashflow.filter(c => c.type === 'income' && c.status === 'צפוי')
      .reduce((sum, c) => sum + (c.amount || 0), 0);
    const receivedIncome = cashflow.filter(c => c.type === 'income' && c.status === 'התקבל')
      .reduce((sum, c) => sum + (c.amount || 0), 0);
    const expectedExpense = cashflow.filter(c => c.type === 'expense' && c.status === 'צפוי')
      .reduce((sum, c) => sum + (c.amount || 0), 0);
    const paidExpense = cashflow.filter(c => c.type === 'expense' && c.status === 'שולם')
      .reduce((sum, c) => sum + (c.amount || 0), 0);
    const balance = receivedIncome - paidExpense;
    const projected = (receivedIncome + expectedIncome) - (paidExpense + expectedExpense);
    
    return { expectedIncome, receivedIncome, expectedExpense, paidExpense, balance, projected };
  }, [cashflow]);

  // Monthly chart data
  const chartData = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = -2; i <= 6; i++) {
      const monthStart = startOfMonth(addMonths(now, i));
      const monthEnd = endOfMonth(addMonths(now, i));
      
      const monthIncome = cashflow
        .filter(c => c.type === 'income' && c.due_date && 
          isWithinInterval(new Date(c.due_date), { start: monthStart, end: monthEnd }))
        .reduce((sum, c) => sum + (c.amount || 0), 0);
      
      const monthExpense = cashflow
        .filter(c => c.type === 'expense' && c.due_date && 
          isWithinInterval(new Date(c.due_date), { start: monthStart, end: monthEnd }))
        .reduce((sum, c) => sum + (c.amount || 0), 0);
      
      months.push({
        month: format(monthStart, 'MMM yy', { locale: he }),
        הכנסות: monthIncome,
        הוצאות: monthExpense,
        net: monthIncome - monthExpense
      });
    }
    return months;
  }, [cashflow]);

  const addItem = () => {
    if (!newItem.description.trim() || !newItem.amount) return;
    const item = {
      ...newItem,
      id: Date.now().toString(),
      amount: Number(newItem.amount) || 0
    };
    onChange([...cashflow, item]);
    setNewItem({
      type: 'expense',
      description: '',
      amount: '',
      due_date: '',
      status: 'צפוי',
      milestone_id: ''
    });
    setShowAddForm(false);
  };

  const updateItem = (id, updates) => {
    onChange(cashflow.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const deleteItem = (id) => {
    if (confirm('האם למחוק את הפריט?')) {
      onChange(cashflow.filter(item => item.id !== id));
    }
  };

  const getStatusBadge = (item) => {
    if (item.type === 'income') {
      if (item.status === 'התקבל') return <Badge className="bg-green-100 text-green-700">התקבל</Badge>;
      if (item.status === 'באיחור') return <Badge className="bg-red-100 text-red-700">באיחור</Badge>;
      return <Badge className="bg-blue-100 text-blue-700">צפוי</Badge>;
    } else {
      if (item.status === 'שולם') return <Badge className="bg-green-100 text-green-700">שולם</Badge>;
      if (item.status === 'באיחור') return <Badge className="bg-red-100 text-red-700">באיחור</Badge>;
      return <Badge className="bg-amber-100 text-amber-700">צפוי</Badge>;
    }
  };

  // Sort by date
  const sortedCashflow = [...cashflow].sort((a, b) => {
    if (!a.due_date && !b.due_date) return 0;
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    return new Date(a.due_date) - new Date(b.due_date);
  });

  return (
    <Card className="shadow-lg border-0">
      <CardHeader className="border-b bg-gradient-to-l from-cyan-50 to-white pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3 text-xl">
            <Wallet className="w-6 h-6 text-cyan-600" />
            תזרים מזומנים
          </CardTitle>
          {!readOnly && (
            <Button 
              size="sm" 
              onClick={() => setShowAddForm(!showAddForm)}
              className="gap-2 bg-cyan-600 hover:bg-cyan-700"
            >
              <Plus className="w-4 h-4" />
              הוסף תנועה
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-green-50 rounded-xl p-3">
            <div className="flex items-center gap-2 text-green-600 mb-1">
              <ArrowDownCircle className="w-4 h-4" />
              <span className="text-xs">הכנסות שהתקבלו</span>
            </div>
            <div className="text-lg font-bold text-green-700">₪{totals.receivedIncome.toLocaleString()}</div>
          </div>
          <div className="bg-blue-50 rounded-xl p-3">
            <div className="flex items-center gap-2 text-blue-600 mb-1">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs">הכנסות צפויות</span>
            </div>
            <div className="text-lg font-bold text-blue-700">₪{totals.expectedIncome.toLocaleString()}</div>
          </div>
          <div className="bg-red-50 rounded-xl p-3">
            <div className="flex items-center gap-2 text-red-600 mb-1">
              <ArrowUpCircle className="w-4 h-4" />
              <span className="text-xs">הוצאות ששולמו</span>
            </div>
            <div className="text-lg font-bold text-red-700">₪{totals.paidExpense.toLocaleString()}</div>
          </div>
          <div className={`rounded-xl p-3 ${totals.balance >= 0 ? 'bg-emerald-50' : 'bg-orange-50'}`}>
            <div className={`flex items-center gap-2 ${totals.balance >= 0 ? 'text-emerald-600' : 'text-orange-600'} mb-1`}>
              <Wallet className="w-4 h-4" />
              <span className="text-xs">יתרה נוכחית</span>
            </div>
            <div className={`text-lg font-bold ${totals.balance >= 0 ? 'text-emerald-700' : 'text-orange-700'}`}>
              ₪{totals.balance.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Chart */}
        {cashflow.length > 0 && (
          <div className="bg-slate-50 rounded-xl p-4">
            <h4 className="font-semibold mb-4 text-slate-700">תזרים חודשי</h4>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData}>
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₪${(v/1000).toFixed(0)}K`} />
                <Tooltip 
                  formatter={(value) => `₪${value.toLocaleString()}`}
                  labelStyle={{ textAlign: 'right' }}
                />
                <Legend />
                <Bar dataKey="הכנסות" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="הוצאות" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Add Form */}
        {showAddForm && !readOnly && (
          <div className="bg-cyan-50 rounded-xl p-4 space-y-3 border-2 border-cyan-200">
            <div className="grid grid-cols-2 gap-3">
              <Select value={newItem.type} onValueChange={(v) => setNewItem({ ...newItem, type: v })}>
                <SelectTrigger className="bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">
                    <span className="flex items-center gap-2">
                      <ArrowDownCircle className="w-4 h-4 text-green-600" />
                      הכנסה
                    </span>
                  </SelectItem>
                  <SelectItem value="expense">
                    <span className="flex items-center gap-2">
                      <ArrowUpCircle className="w-4 h-4 text-red-600" />
                      הוצאה
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
              {milestones.length > 0 && (
                <Select value={newItem.milestone_id} onValueChange={(v) => setNewItem({ ...newItem, milestone_id: v })}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="שיוך לאבן דרך (אופציונלי)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>ללא שיוך</SelectItem>
                    {milestones.map(m => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <Input
              placeholder="תיאור"
              value={newItem.description}
              onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
              className="bg-white"
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                type="number"
                placeholder="סכום"
                value={newItem.amount}
                onChange={(e) => setNewItem({ ...newItem, amount: e.target.value })}
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
              <Button onClick={addItem} className="bg-cyan-600 hover:bg-cyan-700">הוסף</Button>
            </div>
          </div>
        )}

        {/* Items List */}
        {cashflow.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <Wallet className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p>עדיין אין תנועות תזרים</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sortedCashflow.map(item => {
              const milestone = milestones.find(m => m.id === item.milestone_id);
              return (
                <div 
                  key={item.id} 
                  className={`rounded-xl border p-3 flex items-center gap-3 ${
                    item.type === 'income' ? 'bg-green-50/50 border-green-200' : 'bg-red-50/50 border-red-200'
                  }`}
                >
                  {item.type === 'income' ? (
                    <ArrowDownCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                  ) : (
                    <ArrowUpCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{item.description}</div>
                    <div className="text-xs text-slate-500 flex gap-3 mt-1">
                      {item.due_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(item.due_date), 'dd/MM/yyyy')}
                        </span>
                      )}
                      {milestone && (
                        <span className="text-purple-600">🚩 {milestone.name}</span>
                      )}
                    </div>
                  </div>
                  <div className={`text-lg font-bold ${item.type === 'income' ? 'text-green-700' : 'text-red-700'}`}>
                    {item.type === 'income' ? '+' : '-'}₪{(item.amount || 0).toLocaleString()}
                  </div>
                  {getStatusBadge(item)}
                  {!readOnly && (
                    <div className="flex gap-1">
                      <Select 
                        value={item.status} 
                        onValueChange={(v) => updateItem(item.id, { status: v, actual_date: v !== 'צפוי' ? new Date().toISOString().split('T')[0] : null })}
                      >
                        <SelectTrigger className="w-24 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="צפוי">צפוי</SelectItem>
                          <SelectItem value={item.type === 'income' ? 'התקבל' : 'שולם'}>
                            {item.type === 'income' ? 'התקבל' : 'שולם'}
                          </SelectItem>
                          <SelectItem value="באיחור">באיחור</SelectItem>
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
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}