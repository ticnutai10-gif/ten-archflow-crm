import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Plus, 
  Trash2, 
  GripVertical, 
  Sparkles,
  Table,
  Edit2,
  Eye,
  EyeOff
} from "lucide-react";
import { toast } from "sonner";

const COLUMN_TYPES = [
  { value: 'text', label: 'טקסט' },
  { value: 'number', label: 'מספר' },
  { value: 'date', label: 'תאריך' },
  { value: 'client', label: '👤 לקוח (מקושר)' },
  { value: 'stage', label: '🔵 שלבים (מואר)' },
  { value: 'checkmark', label: '✓/✗ סימון' },
  { value: 'boolean', label: 'כן/לא' },
  { value: 'select', label: 'בחירה' }
];

const DEFAULT_STAGE_OPTIONS = [
  { value: 'ברור_תכן', label: 'ברור תכן', color: '#3b82f6', glow: 'rgba(59, 130, 246, 0.4)' },
  { value: 'תיק_מידע', label: 'תיק מידע', color: '#8b5cf6', glow: 'rgba(139, 92, 246, 0.4)' },
  { value: 'היתרים', label: 'היתרים', color: '#f59e0b', glow: 'rgba(245, 158, 11, 0.4)' },
  { value: 'ביצוע', label: 'ביצוע', color: '#10b981', glow: 'rgba(16, 185, 129, 0.4)' },
  { value: 'סיום', label: 'סיום', color: '#6b7280', glow: 'rgba(107, 114, 128, 0.4)' }
];

export default function CreateSpreadsheetDialog({ open, onClose, onSave, spreadsheet }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    columns: [],
    rows_data: [],
    cell_styles: {},
    show_sub_headers: false,
    sub_headers: {},
    custom_stage_options: DEFAULT_STAGE_OPTIONS
  });

  const [newColumn, setNewColumn] = useState({
    key: '',
    title: '',
    width: '150px',
    type: 'text',
    visible: true,
    required: false
  });

  useEffect(() => {
    if (spreadsheet) {
      setFormData({
        name: spreadsheet.name || '',
        description: spreadsheet.description || '',
        columns: spreadsheet.columns || [],
        rows_data: spreadsheet.rows_data || [],
        cell_styles: spreadsheet.cell_styles || {},
        show_sub_headers: spreadsheet.show_sub_headers || false,
        sub_headers: spreadsheet.sub_headers || {},
        custom_stage_options: spreadsheet.custom_stage_options || DEFAULT_STAGE_OPTIONS
      });
    } else {
      setFormData({
        name: '',
        description: '',
        columns: [],
        rows_data: [],
        cell_styles: {},
        show_sub_headers: false,
        sub_headers: {},
        custom_stage_options: DEFAULT_STAGE_OPTIONS
      });
    }
  }, [spreadsheet, open]);

  const addColumn = () => {
    if (!newColumn.title.trim()) {
      toast.error('נא להזין שם לעמודה');
      return;
    }

    const colKey = newColumn.key || `col_${Date.now()}`;
    const column = { ...newColumn, key: colKey };

    setFormData(prev => ({
      ...prev,
      columns: [...prev.columns, column]
    }));

    setNewColumn({
      key: '',
      title: '',
      width: '150px',
      type: 'text',
      visible: true,
      required: false
    });

    toast.success(`✓ עמודה "${column.title}" נוספה`);
  };

  const removeColumn = (index) => {
    setFormData(prev => ({
      ...prev,
      columns: prev.columns.filter((_, i) => i !== index)
    }));
    toast.success('✓ עמודה הוסרה');
  };

  const updateColumn = (index, updates) => {
    setFormData(prev => ({
      ...prev,
      columns: prev.columns.map((col, i) => 
        i === index ? { ...col, ...updates } : col
      )
    }));
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast.error('נא להזין שם לטבלה');
      return;
    }

    if (formData.columns.length === 0) {
      toast.error('נא להוסיף לפחות עמודה אחת');
      return;
    }

    onSave(formData);
  };

  const addQuickTemplate = (templateName) => {
    let templateColumns = [];

    switch (templateName) {
      case 'plans':
        templateColumns = [
          { key: 'project_name', title: 'שם פרויקט', width: '200px', type: 'text', visible: true, required: true },
          { key: 'plan_type', title: 'סוג תוכנית', width: '150px', type: 'text', visible: true, required: false },
          { key: 'submission_date', title: 'תאריך הגשה', width: '150px', type: 'date', visible: true, required: false },
          { key: 'approval_status', title: 'סטטוס אישור', width: '150px', type: 'text', visible: true, required: false },
          { key: 'approving_entity', title: 'גורם מאשר', width: '180px', type: 'text', visible: true, required: false },
          { key: 'notes', title: 'הערות', width: '250px', type: 'text', visible: true, required: false }
        ];
        setFormData(prev => ({ ...prev, name: 'תוכניות פרויקטים', columns: templateColumns }));
        break;

      case 'permits':
        templateColumns = [
          { key: 'project_name', title: 'שם פרויקט', width: '200px', type: 'text', visible: true, required: true },
          { key: 'permit_type', title: 'סוג היתר', width: '150px', type: 'text', visible: true, required: false },
          { key: 'request_date', title: 'תאריך בקשה', width: '150px', type: 'date', visible: true, required: false },
          { key: 'approval_date', title: 'תאריך אישור', width: '150px', type: 'date', visible: true, required: false },
          { key: 'status', title: 'סטטוס', width: '120px', type: 'text', visible: true, required: false },
          { key: 'permit_number', title: 'מספר היתר', width: '150px', type: 'text', visible: true, required: false },
          { key: 'documents', title: 'מסמכים נדרשים', width: '200px', type: 'text', visible: true, required: false }
        ];
        setFormData(prev => ({ ...prev, name: 'ניהול היתרים', columns: templateColumns }));
        break;

      case 'contractors':
        templateColumns = [
          { key: 'contractor_name', title: 'שם קבלן', width: '200px', type: 'text', visible: true, required: true },
          { key: 'specialty', title: 'התמחות', width: '150px', type: 'text', visible: true, required: false },
          { key: 'phone', title: 'טלפון', width: '130px', type: 'text', visible: true, required: false },
          { key: 'email', title: 'אימייל', width: '200px', type: 'text', visible: true, required: false },
          { key: 'rating', title: 'דירוג', width: '100px', type: 'number', visible: true, required: false },
          { key: 'active_projects', title: 'פרויקטים פעילים', width: '150px', type: 'number', visible: true, required: false }
        ];
        setFormData(prev => ({ ...prev, name: 'רשימת קבלנים', columns: templateColumns }));
        break;

      case 'materials':
        templateColumns = [
          { key: 'material_name', title: 'שם חומר', width: '200px', type: 'text', visible: true, required: true },
          { key: 'supplier', title: 'ספק', width: '150px', type: 'text', visible: true, required: false },
          { key: 'unit_price', title: 'מחיר ליחידה', width: '120px', type: 'number', visible: true, required: false },
          { key: 'quantity', title: 'כמות', width: '100px', type: 'number', visible: true, required: false },
          { key: 'total', title: 'סה"כ', width: '120px', type: 'number', visible: true, required: false },
          { key: 'delivery_date', title: 'תאריך אספקה', width: '150px', type: 'date', visible: true, required: false }
        ];
        setFormData(prev => ({ ...prev, name: 'ניהול חומרים', columns: templateColumns }));
        break;
    }

    toast.success('✓ תבנית נטענה');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {spreadsheet ? 'עריכת טבלה' : 'צור טבלה מותאמת אישית'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-1">
          <div className="space-y-6 py-4">
            {/* Basic Info */}
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-2 block">
                  שם הטבלה <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="לדוגמה: תוכניות פרויקטים, ניהול היתרים..."
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="text-right"
                  dir="rtl"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700 mb-2 block">
                  תיאור <span className="text-xs text-slate-500 font-normal">(אופציונלי)</span>
                </label>
                <Textarea
                  placeholder="מה המטרה של הטבלה הזו?"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="text-right"
                  dir="rtl"
                  rows={2}
                />
              </div>
            </div>

            {/* Quick Templates */}
            {!spreadsheet && formData.columns.length === 0 && (
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-xl border-2 border-blue-200">
                <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  תבניות מהירות
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addQuickTemplate('plans')}
                    className="justify-start"
                  >
                    📐 תוכניות פרויקטים
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addQuickTemplate('permits')}
                    className="justify-start"
                  >
                    📋 ניהול היתרים
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addQuickTemplate('contractors')}
                    className="justify-start"
                  >
                    👷 רשימת קבלנים
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addQuickTemplate('materials')}
                    className="justify-start"
                  >
                    🧱 ניהול חומרים
                  </Button>
                </div>
              </div>
            )}

            <Separator />

            {/* Columns Section */}
            <div>
              <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Table className="w-5 h-5 text-blue-600" />
                עמודות הטבלה
              </h3>

              {/* Add Column Form */}
              <div className="bg-slate-50 p-4 rounded-xl border-2 border-slate-200 mb-4">
                <h4 className="font-semibold text-sm mb-3">הוסף עמודה חדשה</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-600 mb-1 block">שם תצוגה *</label>
                    <Input
                      placeholder="לדוגמה: שם פרויקט, תאריך הגשה..."
                      value={newColumn.title}
                      onChange={(e) => setNewColumn({ ...newColumn, title: e.target.value })}
                      className="text-right"
                      dir="rtl"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-600 mb-1 block">סוג נתונים</label>
                    <Select
                      value={newColumn.type}
                      onValueChange={(value) => setNewColumn({ ...newColumn, type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COLUMN_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-xs text-slate-600 mb-1 block">רוחב</label>
                    <Input
                      placeholder="150px"
                      value={newColumn.width}
                      onChange={(e) => setNewColumn({ ...newColumn, width: e.target.value })}
                      dir="rtl"
                    />
                  </div>

                  <div className="flex items-end gap-2">
                    <div className="flex items-center gap-2 flex-1">
                      <Switch
                        checked={newColumn.required}
                        onCheckedChange={(checked) => setNewColumn({ ...newColumn, required: checked })}
                      />
                      <label className="text-xs">שדה חובה</label>
                    </div>
                    
                    <Button
                      onClick={addColumn}
                      className="bg-blue-600 hover:bg-blue-700 gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      הוסף
                    </Button>
                  </div>
                </div>
              </div>

              {/* Columns List */}
              {formData.columns.length === 0 ? (
                <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-lg border-2 border-dashed border-slate-300">
                  <Table className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p className="text-sm">טרם הוספו עמודות</p>
                  <p className="text-xs mt-1">הוסף עמודות למעלה או בחר תבנית מהירה</p>
                </div>
              ) : (
                <ScrollArea className="h-64">
                  <div className="space-y-2">
                    {formData.columns.map((column, index) => (
                      <div
                        key={index}
                        className="group p-3 border-2 rounded-xl hover:border-blue-300 hover:shadow-md transition-all bg-white"
                      >
                        <div className="flex items-center gap-3">
                          <GripVertical className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-slate-900 truncate">
                                {column.title}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {COLUMN_TYPES.find(t => t.value === column.type)?.label || column.type}
                              </Badge>
                              {column.required && (
                                <Badge className="text-xs bg-red-100 text-red-700">
                                  חובה
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-slate-500">
                              מזהה: {column.key} • רוחב: {column.width}
                            </div>
                          </div>

                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => updateColumn(index, { visible: !column.visible })}
                              title={column.visible ? "הסתר עמודה" : "הצג עמודה"}
                            >
                              {column.visible ? (
                                <Eye className="w-4 h-4 text-blue-600" />
                              ) : (
                                <EyeOff className="w-4 h-4 text-slate-400" />
                              )}
                            </Button>
                            
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-red-100"
                              onClick={() => removeColumn(index)}
                              title="הסר עמודה"
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}

              {formData.columns.length > 0 && (
                <div className="mt-3 text-xs text-slate-600 bg-blue-50 p-3 rounded-lg border border-blue-200">
                  ✓ {formData.columns.length} עמודות הוגדרו
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            ביטול
          </Button>
          <Button
            onClick={handleSave}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 gap-2"
          >
            <Sparkles className="w-4 h-4" />
            {spreadsheet ? 'עדכן טבלה' : 'צור טבלה'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}