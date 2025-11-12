import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table as TableIcon,
  Plus,
  Trash2,
  Edit,
  Eye,
  Database,
  Sparkles,
  FileText,
  Grid3x3,
  Check,
  X,
  Zap
} from 'lucide-react';
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function TableManager({ open, onClose, onTableSelect }) {
  const [tables, setTables] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingTable, setEditingTable] = useState(null);

  useEffect(() => {
    if (open) {
      loadTables();
    }
  }, [open]);

  const loadTables = async () => {
    setIsLoading(true);
    try {
      const customTables = await base44.entities.CustomSpreadsheet.list('-created_date');
      setTables(customTables || []);
    } catch (error) {
      console.error('Error loading tables:', error);
      toast.error('שגיאה בטעינת הטבלאות');
    }
    setIsLoading(false);
  };

  const handleDelete = async (tableId) => {
    if (!confirm('האם למחוק את הטבלה? הפעולה אינה הפיכה.')) return;
    
    try {
      await base44.entities.CustomSpreadsheet.delete(tableId);
      toast.success('הטבלה נמחקה בהצלחה');
      loadTables();
    } catch (error) {
      console.error('Error deleting table:', error);
      toast.error('שגיאה במחיקת הטבלה');
    }
  };

  const handleSelectTable = (table) => {
    if (onTableSelect) {
      onTableSelect(table);
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] z-50" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-2xl">
            <Database className="w-7 h-7 text-blue-600" />
            בחר טבלת יעד ליבוא
          </DialogTitle>
          <DialogDescription>
            בחר טבלה קיימת או צור טבלה חדשה לייבוא הנתונים
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Default Client Table */}
          <Card 
            className="cursor-pointer hover:shadow-lg transition-all border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-purple-50"
            onClick={() => handleSelectTable({ 
              id: 'clients',
              name: 'לקוחות (Client)',
              type: 'entity',
              entity: 'Client'
            })}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
                    <Database className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">טבלת לקוחות ראשית</h3>
                    <p className="text-sm text-slate-600 mt-1">ישות Client עם כל השדות הסטנדרטיים</p>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="outline" className="bg-blue-100 text-blue-700">ברירת מחדל</Badge>
                      <Badge variant="outline" className="bg-green-100 text-green-700">מומלץ</Badge>
                    </div>
                  </div>
                </div>
                <Check className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          {/* Custom Tables */}
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-bold text-slate-800">טבלאות מותאמות אישית</h3>
            <Button
              onClick={() => setShowCreateDialog(true)}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
            >
              <Plus className="w-4 h-4 ml-2" />
              צור טבלה חדשה
            </Button>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
              <p className="text-slate-600 mt-4">טוען טבלאות...</p>
            </div>
          ) : tables.length === 0 ? (
            <Card className="border-2 border-dashed border-slate-300">
              <CardContent className="p-12 text-center">
                <Grid3x3 className="w-16 h-16 mx-auto mb-4 text-slate-400" />
                <h3 className="text-lg font-semibold text-slate-700 mb-2">אין טבלאות מותאמות</h3>
                <p className="text-sm text-slate-600 mb-4">צור טבלה חדשה כדי לארגן נתונים בצורה מותאמת אישית</p>
                <Button
                  onClick={() => setShowCreateDialog(true)}
                  variant="outline"
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" />
                  צור טבלה ראשונה
                </Button>
              </CardContent>
            </Card>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-4">
                {tables.map((table) => (
                  <Card 
                    key={table.id}
                    className="cursor-pointer hover:shadow-lg transition-all border-2 hover:border-blue-300"
                    onClick={() => handleSelectTable({
                      id: table.id,
                      name: table.name,
                      type: 'custom',
                      columns: table.columns,
                      data: table
                    })}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="p-2 bg-slate-100 rounded-lg">
                            <TableIcon className="w-6 h-6 text-slate-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-slate-900 truncate">{table.name}</h4>
                            <p className="text-xs text-slate-600 mt-1 line-clamp-2">{table.description || 'אין תיאור'}</p>
                            <div className="flex gap-2 mt-2">
                              <Badge variant="outline" className="text-xs">
                                {table.columns?.length || 0} עמודות
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {table.rows_data?.length || 0} שורות
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setEditingTable(table)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:text-red-700"
                            onClick={() => handleDelete(table.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Create Table Dialog */}
        {showCreateDialog && (
          <CreateTableDialog
            open={showCreateDialog}
            onClose={() => setShowCreateDialog(false)}
            onSuccess={() => {
              setShowCreateDialog(false);
              loadTables();
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

// Create Table Dialog Component
function CreateTableDialog({ open, onClose, onSuccess }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [columns, setColumns] = useState([
    { key: 'col_1', title: 'עמודה 1', type: 'text', visible: true }
  ]);
  const [isCreating, setIsCreating] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickColumnName, setQuickColumnName] = useState('');

  const addColumn = () => {
    const newColNum = columns.length + 1;
    setColumns([...columns, {
      key: `col_${newColNum}`,
      title: `עמודה ${newColNum}`,
      type: 'text',
      visible: true
    }]);
    toast.success('עמודה נוספה');
  };

  const addQuickColumn = () => {
    if (!quickColumnName.trim()) {
      toast.error('נא להזין שם לעמודה');
      return;
    }

    const newColNum = columns.length + 1;
    setColumns([...columns, {
      key: `col_${newColNum}`,
      title: quickColumnName.trim(),
      type: 'text',
      visible: true
    }]);
    
    setQuickColumnName('');
    setShowQuickAdd(false);
    toast.success(`עמודה "${quickColumnName}" נוספה`);
  };

  const removeColumn = (index) => {
    if (columns.length === 1) {
      toast.error('חייבת להיות לפחות עמודה אחת');
      return;
    }
    setColumns(columns.filter((_, i) => i !== index));
    toast.success('עמודה הוסרה');
  };

  const updateColumn = (index, field, value) => {
    const updated = [...columns];
    updated[index] = { ...updated[index], [field]: value };
    setColumns(updated);
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error('נא להזין שם לטבלה');
      return;
    }

    if (columns.length === 0) {
      toast.error('חייבת להיות לפחות עמודה אחת');
      return;
    }

    setIsCreating(true);
    try {
      await base44.entities.CustomSpreadsheet.create({
        name: name.trim(),
        description: description.trim(),
        columns: columns,
        rows_data: []
      });

      toast.success('הטבלה נוצרה בהצלחה!');
      onSuccess();
    } catch (error) {
      console.error('Error creating table:', error);
      toast.error('שגיאה ביצירת הטבלה');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl z-[60]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            <Sparkles className="w-6 h-6 text-green-600" />
            צור טבלה חדשה
          </DialogTitle>
          <DialogDescription>
            הגדר את המבנה של הטבלה החדשה
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-slate-900 mb-2 block">
                שם הטבלה *
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="לדוגמה: לקוחות פוטנציאליים"
                className="text-right"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-900 mb-2 block">
                תיאור
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="תיאור קצר של מטרת הטבלה..."
                rows={2}
                className="text-right"
              />
            </div>
          </div>

          {/* Columns */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-semibold text-slate-900">
                עמודות ({columns.length})
              </label>
              <div className="flex gap-2">
                <Button
                  onClick={() => setShowQuickAdd(!showQuickAdd)}
                  variant="outline"
                  size="sm"
                  className="gap-2 border-purple-300 hover:bg-purple-50"
                >
                  <Zap className="w-4 h-4" />
                  הוספה מהירה
                </Button>
                <Button
                  onClick={addColumn}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" />
                  הוסף עמודה
                </Button>
              </div>
            </div>

            {/* Quick Add Panel */}
            {showQuickAdd && (
              <Card className="p-4 mb-3 bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-200 relative z-[70]">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-purple-900 flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    הוספה מהירה
                  </h4>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => {
                      setShowQuickAdd(false);
                      setQuickColumnName('');
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Input
                    value={quickColumnName}
                    onChange={(e) => setQuickColumnName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') addQuickColumn();
                      if (e.key === 'Escape') {
                        setShowQuickAdd(false);
                        setQuickColumnName('');
                      }
                    }}
                    placeholder="שם העמודה החדשה..."
                    className="flex-1"
                    autoFocus
                  />
                  <Button
                    onClick={addQuickColumn}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-purple-700 mt-2">
                  💡 רק תכתוב שם ותלחץ Enter - העמודה תתוסף אוטומטית כטקסט
                </p>
              </Card>
            )}

            <ScrollArea className="h-64">
              <div className="space-y-3 pr-2">
                {columns.map((col, index) => (
                  <Card key={index} className="p-3 relative z-[65]">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 grid grid-cols-2 gap-3">
                        <Input
                          value={col.title}
                          onChange={(e) => updateColumn(index, 'title', e.target.value)}
                          placeholder="שם העמודה"
                          className="text-right"
                        />
                        <Select
                          value={col.type}
                          onValueChange={(value) => updateColumn(index, 'type', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent dir="rtl">
                            <SelectItem value="text">טקסט</SelectItem>
                            <SelectItem value="number">מספר</SelectItem>
                            <SelectItem value="date">תאריך</SelectItem>
                            <SelectItem value="email">אימייל</SelectItem>
                            <SelectItem value="phone">טלפון</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeColumn(index)}
                        className="text-red-600 hover:text-red-700 relative z-[70]"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isCreating}
            >
              ביטול
            </Button>
            <Button
              onClick={handleCreate}
              disabled={isCreating || !name.trim()}
              className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
            >
              {isCreating ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full ml-2"></div>
                  יוצר...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 ml-2" />
                  צור טבלה
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}