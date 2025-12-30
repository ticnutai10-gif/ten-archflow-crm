import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Zap, Table } from "lucide-react";
import { toast } from "sonner";

const STATIC_COLUMN_TYPES = [
  { value: 'text', label: 'טקסט', icon: '📝' },
  { value: 'number', label: 'מספר', icon: '🔢' },
  { value: 'date', label: 'תאריך', icon: '📅' },
  { value: 'client', label: 'לקוח', icon: '👤' },
  { value: 'stage', label: 'שלבים (מואר)', icon: '🔵' },
  { value: 'checkmark', label: 'סימון', icon: '✓' },
  { value: 'boolean', label: 'כן/לא', icon: '⚡' },
  { value: 'select', label: 'בחירה', icon: '📋' }
];

export default function BulkColumnsDialog({ open, onClose, onAdd, globalTypesList = [] }) {
  const [count, setCount] = useState(5);
  const [columnType, setColumnType] = useState('text');
  const [columnWidth, setColumnWidth] = useState('150px');

  // Merge static types with dynamic global types
  const availableColumnTypes = React.useMemo(() => {
    const dynamicTypes = globalTypesList.map(type => ({
      value: type.type_key,
      label: type.name,
      icon: '📑' // Generic icon for custom types
    }));
    
    // Filter out duplicates if static list already has them
    const combined = [...STATIC_COLUMN_TYPES];
    dynamicTypes.forEach(dt => {
      if (!combined.find(st => st.value === dt.value)) {
        combined.splice(5, 0, dt); // Insert after 'stage'
      }
    });
    
    return combined;
  }, [globalTypesList]);

  const handleCreate = () => {
    if (count < 1) {
      toast.error('נא להזין מספר גדול מ-0');
      return;
    }

    if (count > 50) {
      toast.error('מקסימום 50 עמודות בבת אחת');
      return;
    }

    const newColumns = [];
    for (let i = 1; i <= count; i++) {
      newColumns.push({
        key: `col_${Date.now()}_${i}`,
        title: `עמודה ${i}`,
        width: columnWidth,
        type: columnType,
        visible: true,
        required: false
      });
    }

    onAdd(newColumns);
    toast.success(`✓ נוצרו ${count} עמודות חדשות - ניתן לערוך את השמות בניהול עמודות`);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Zap className="w-6 h-6 text-orange-600" />
            יצירה מהירה של עמודות
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4 flex-1 overflow-y-auto px-1">
          <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border-2 border-orange-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="text-3xl">⚡</div>
              <div className="flex-1">
                <h4 className="font-bold text-orange-900 mb-1">יצירה מהירה</h4>
                <p className="text-sm text-orange-800">
                  צור מספר עמודות בבת אחת עם אותו סוג, ולאחר מכן ערוך את השמות בניהול עמודות
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-slate-700 mb-2 block">
                כמה עמודות ליצור? <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                min="1"
                max="50"
                value={count}
                onChange={(e) => setCount(parseInt(e.target.value) || 1)}
                className="text-lg font-bold text-center"
                dir="ltr"
              />
              <div className="text-xs text-slate-500 mt-1 text-center">
                מינימום 1, מקסימום 50 עמודות
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700 mb-2 block">
                סוג הנתונים לכל העמודות
              </label>
              <Select value={columnType} onValueChange={setColumnType}>
                <SelectTrigger className="h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableColumnTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2 py-1">
                        <span className="text-lg">{type.icon}</span>
                        <span className="font-medium">{type.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700 mb-2 block">
                רוחב עמודה (ברירת מחדל)
              </label>
              <div className="grid grid-cols-4 gap-2">
                {['100px', '150px', '200px', '250px'].map(width => (
                  <button
                    key={width}
                    onClick={() => setColumnWidth(width)}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      columnWidth === width 
                        ? 'border-blue-500 bg-blue-50 font-bold' 
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="text-sm">{width}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="text-2xl">📋</div>
                <div className="font-bold text-blue-900">תצוגה מקדימה</div>
              </div>
              <div className="space-y-1 text-sm text-blue-800">
                <div>✓ יווצרו: <strong>{count}</strong> עמודות חדשות</div>
                <div>✓ סוג: <strong>{availableColumnTypes.find(t => t.value === columnType)?.label}</strong></div>
                <div>✓ שמות: <strong>עמודה 1, עמודה 2, עמודה 3...</strong></div>
                <div className="text-xs text-blue-600 mt-2 pt-2 border-t border-blue-200">
                  💡 ניתן לערוך את שמות העמודות אחר כך דרך "ניהול עמודות"
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            ביטול
          </Button>
          <Button
            onClick={handleCreate}
            className="bg-gradient-to-r from-orange-600 to-yellow-600 hover:from-orange-700 hover:to-yellow-700 gap-2"
          >
            <Zap className="w-4 h-4" />
            צור {count} עמודות
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}