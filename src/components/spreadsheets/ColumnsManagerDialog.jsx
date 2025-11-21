import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Trash2, GripVertical, Eye, EyeOff, Edit2, Save, X, Table, Palette } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { toast } from "sonner";

const COLUMN_TYPES = [
  { value: 'text', label: 'טקסט', icon: '📝' },
  { value: 'number', label: 'מספר', icon: '🔢' },
  { value: 'date', label: 'תאריך', icon: '📅' },
  { value: 'client', label: 'לקוח (מקושר)', icon: '👤' },
  { value: 'stage', label: 'שלבים (מואר)', icon: '🔵' },
  { value: 'checkmark', label: 'סימון ✓/✗', icon: '✓' },
  { value: 'boolean', label: 'כן/לא', icon: '⚡' },
  { value: 'select', label: 'בחירה', icon: '📋' }
];

export default function ColumnsManagerDialog({ open, onClose, columns, onSave, headerStyles = {}, onHeaderStyleChange }) {
  const [editedColumns, setEditedColumns] = useState(columns);
  const [editingIndex, setEditingIndex] = useState(null);
  const [newColumnData, setNewColumnData] = useState({
    title: '',
    type: 'text',
    width: '150px',
    visible: true,
    required: false
  });

  React.useEffect(() => {
    if (open) {
      setEditedColumns(columns);
      setEditingIndex(null);
      setNewColumnData({ title: '', type: 'text', width: '150px', visible: true, required: false });
    }
  }, [open, columns]);

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    
    const items = Array.from(editedColumns);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    setEditedColumns(items);
    toast.success('✓ סדר העמודות שונה');
  };

  const addNewColumn = () => {
    if (!newColumnData.title.trim()) {
      toast.error('נא להזין שם לעמודה');
      return;
    }

    const newColumn = {
      key: `col_${Date.now()}`,
      title: newColumnData.title.trim(),
      width: newColumnData.width,
      type: newColumnData.type,
      visible: newColumnData.visible,
      required: newColumnData.required
    };

    setEditedColumns([...editedColumns, newColumn]);
    setNewColumnData({ title: '', type: 'text', width: '150px', visible: true, required: false });
    toast.success(`✓ עמודה "${newColumn.title}" נוספה`);
  };

  const deleteColumn = (index) => {
    if (!confirm('האם למחוק עמודה זו?')) return;
    
    const updated = editedColumns.filter((_, i) => i !== index);
    setEditedColumns(updated);
    toast.success('✓ עמודה נמחקה');
  };

  const toggleVisibility = (index) => {
    const updated = editedColumns.map((col, i) => 
      i === index ? { ...col, visible: !col.visible } : col
    );
    setEditedColumns(updated);
  };

  const updateColumn = (index, updates) => {
    const updated = editedColumns.map((col, i) => 
      i === index ? { ...col, ...updates } : col
    );
    setEditedColumns(updated);
  };

  const updateHeaderColor = (columnKey, color) => {
    if (onHeaderStyleChange) {
      onHeaderStyleChange(columnKey, { backgroundColor: color });
    }
  };

  const handleSave = () => {
    // בדיקה שיש לפחות עמודה אחת
    if (editedColumns.length === 0) {
      toast.error('חייבת להיות לפחות עמודה אחת בטבלה');
      return;
    }

    // בדיקה שכל העמודות יש להן שם
    const hasEmptyNames = editedColumns.some(col => !col.title?.trim());
    if (hasEmptyNames) {
      toast.error('כל העמודות חייבות לכלול שם');
      return;
    }

    onSave(editedColumns);
    toast.success('✓ העמודות עודכנו בהצלחה');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-hidden flex flex-col" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Table className="w-6 h-6 text-purple-600" />
            ניהול עמודות הטבלה
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* הוספת עמודה חדשה */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-xl border-2 border-blue-200">
            <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
              <Plus className="w-4 h-4 text-blue-600" />
              הוסף עמודה חדשה
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="text-xs text-slate-600 mb-1 block">שם העמודה *</label>
                <Input
                  placeholder="שם תצוגה..."
                  value={newColumnData.title}
                  onChange={(e) => setNewColumnData({ ...newColumnData, title: e.target.value })}
                  className="h-9 text-sm"
                  dir="rtl"
                />
              </div>

              <div>
                <label className="text-xs text-slate-600 mb-1 block">סוג נתונים</label>
                <Select
                  value={newColumnData.type}
                  onValueChange={(value) => setNewColumnData({ ...newColumnData, type: value })}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COLUMN_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        <span className="flex items-center gap-2">
                          <span>{type.icon}</span>
                          <span>{type.label}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs text-slate-600 mb-1 block">רוחב</label>
                <Input
                  placeholder="150px"
                  value={newColumnData.width}
                  onChange={(e) => setNewColumnData({ ...newColumnData, width: e.target.value })}
                  className="h-9 text-sm"
                  dir="rtl"
                />
              </div>

              <div className="flex items-end">
                <Button
                  onClick={addNewColumn}
                  className="w-full h-9 bg-blue-600 hover:bg-blue-700 gap-2"
                >
                  <Plus className="w-4 h-4" />
                  הוסף עמודה
                </Button>
              </div>
            </div>
          </div>

          {/* רשימת עמודות קיימות */}
          <div className="flex-1 overflow-hidden">
            <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
              <Table className="w-4 h-4 text-slate-600" />
              עמודות קיימות ({editedColumns.length})
            </h3>
            
            {editedColumns.length === 0 ? (
              <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-lg border-2 border-dashed border-slate-300">
                <Table className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                <p className="font-semibold text-lg mb-2">אין עמודות בטבלה</p>
                <p className="text-sm">הוסף עמודות למעלה כדי להתחיל</p>
              </div>
            ) : (
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="columns-manager">
                  {(provided) => (
                    <ScrollArea className="h-[400px]">
                      <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2 pr-2">
                        {editedColumns.map((column, index) => (
                          <Draggable key={column.key} draggableId={column.key} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={`group p-4 border-2 rounded-xl transition-all ${
                                  snapshot.isDragging 
                                    ? 'shadow-2xl border-blue-400 bg-blue-50' 
                                    : 'border-slate-200 hover:border-blue-300 bg-white hover:shadow-md'
                                } ${!column.visible ? 'opacity-60' : ''}`}
                              >
                                {editingIndex === index ? (
                                  <div className="space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                      <div>
                                        <label className="text-xs text-slate-600 mb-1 block">שם תצוגה</label>
                                        <Input
                                          value={column.title}
                                          onChange={(e) => updateColumn(index, { title: e.target.value })}
                                          className="h-8 text-sm"
                                          dir="rtl"
                                        />
                                      </div>
                                      <div>
                                        <label className="text-xs text-slate-600 mb-1 block">סוג</label>
                                        <Select
                                          value={column.type}
                                          onValueChange={(value) => updateColumn(index, { type: value })}
                                        >
                                          <SelectTrigger className="h-8">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {COLUMN_TYPES.map(type => (
                                              <SelectItem key={type.value} value={type.value}>
                                                {type.icon} {type.label}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      <div>
                                        <label className="text-xs text-slate-600 mb-1 block">רוחב</label>
                                        <Input
                                          value={column.width}
                                          onChange={(e) => updateColumn(index, { width: e.target.value })}
                                          className="h-8 text-sm"
                                          dir="rtl"
                                        />
                                      </div>
                                      <div className="flex items-end">
                                        <Button
                                          size="sm"
                                          onClick={() => setEditingIndex(null)}
                                          className="w-full h-8 gap-2"
                                        >
                                          <Save className="w-3 h-3" />
                                          סיים עריכה
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-3">
                                    <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing p-2 hover:bg-slate-100 rounded-lg" title="גרור לשינוי סדר">
                                      <GripVertical className="w-5 h-5 text-slate-400" />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-1">
                                        <div 
                                          className="w-6 h-6 rounded border-2 border-slate-200 flex-shrink-0" 
                                          style={{ backgroundColor: headerStyles[column.key]?.backgroundColor || '#f1f5f9' }}
                                          title="צבע כותרת"
                                        />
                                        <span className="font-bold text-slate-900 text-base">
                                          {column.title}
                                        </span>
                                        <Badge variant="outline" className="text-xs">
                                          {COLUMN_TYPES.find(t => t.value === column.type)?.icon} {COLUMN_TYPES.find(t => t.value === column.type)?.label}
                                        </Badge>
                                        {column.required && (
                                          <Badge className="text-xs bg-red-100 text-red-700 border-red-300">
                                            חובה
                                          </Badge>
                                        )}
                                        {!column.visible && (
                                          <Badge className="text-xs bg-slate-100 text-slate-600 border-slate-300">
                                            מוסתר
                                          </Badge>
                                        )}
                                      </div>
                                      <div className="text-xs text-slate-500">
                                        מזהה: <code className="bg-slate-100 px-1 py-0.5 rounded">{column.key}</code> • רוחב: {column.width}
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <input
                                        type="color"
                                        value={headerStyles[column.key]?.backgroundColor || '#f1f5f9'}
                                        onChange={(e) => updateHeaderColor(column.key, e.target.value)}
                                        className="h-8 w-8 cursor-pointer rounded border-2 border-slate-200 hover:border-purple-400"
                                        title="בחר צבע כותרת"
                                      />

                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-8 w-8"
                                        onClick={() => toggleVisibility(index)}
                                        title={column.visible ? "הסתר עמודה" : "הצג עמודה"}
                                      >
                                        {column.visible ? (
                                          <Eye className="w-4 h-4 text-blue-600" />
                                        ) : (
                                          <EyeOff className="w-4 h-4 text-slate-400" />
                                        )}
                                      </Button>

                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-8 w-8"
                                        onClick={() => setEditingIndex(index)}
                                        title="ערוך עמודה"
                                      >
                                        <Edit2 className="w-4 h-4 text-green-600" />
                                      </Button>

                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-8 w-8 hover:bg-red-50"
                                        onClick={() => deleteColumn(index)}
                                        title="מחק עמודה"
                                      >
                                        <Trash2 className="w-4 h-4 text-red-600" />
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    </ScrollArea>
                  )}
                </Droppable>
              </DragDropContext>
            )}
          </div>
        </div>

        <DialogFooter className="flex-shrink-0 gap-2">
          <Button variant="outline" onClick={onClose}>
            ביטול
          </Button>
          <Button
            onClick={handleSave}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 gap-2"
          >
            <Save className="w-4 h-4" />
            שמור שינויים ({editedColumns.length} עמודות)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}