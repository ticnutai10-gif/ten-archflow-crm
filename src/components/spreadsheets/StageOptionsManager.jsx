import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Edit2, Trash2, Circle, Save, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

export default function StageOptionsManager({ open, onClose, stageOptions, onSave }) {
  const [editedOptions, setEditedOptions] = useState(stageOptions || []);
  const [editingIndex, setEditingIndex] = useState(null);
  // Optional children editing is inline when a parent is in edit mode

  // Update editedOptions when stageOptions prop changes
  React.useEffect(() => {
    if (stageOptions) {
      setEditedOptions(stageOptions);
    }
  }, [stageOptions]);

  const handleAddStage = () => {
    const newStage = {
      value: `שלב_${Date.now()}`,
      label: 'שלב חדש',
      color: '#6366f1',
      glow: 'rgba(99, 102, 241, 0.4)'
    };
    setEditedOptions([...editedOptions, newStage]);
  };

  const handleEditStage = (index, field, value) => {
    const updated = [...editedOptions];
    updated[index] = { ...updated[index], [field]: value };
    
    // Update glow color when main color changes
    if (field === 'color') {
      const rgb = hexToRgb(value);
      if (rgb) {
        updated[index].glow = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.4)`;
      }
    }
    
    // Update value when label changes
    if (field === 'label') {
      updated[index].value = value.replace(/\s+/g, '_');
    }
    
    setEditedOptions(updated);
  };

  const handleDeleteStage = (index) => {
    if (editedOptions.length <= 1) {
      toast.error('חייב להישאר לפחות שלב אחד');
      return;
    }
    
    if (!confirm(`למחוק את השלב "${editedOptions[index].label}"?`)) return;
    
    const updated = editedOptions.filter((_, i) => i !== index);
    setEditedOptions(updated);
    toast.success('✓ שלב נמחק');
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(editedOptions);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setEditedOptions(items);
    toast.success('✓ סדר השלבים עודכן');
  };

  const handleSave = () => {
    // Validation (parents + children)
    const hasEmptyParent = editedOptions.some(opt => !String(opt.label || '').trim());
    const hasEmptyChild = editedOptions.some(opt => (opt.children || []).some(ch => !String(ch.label || '').trim()));
    if (hasEmptyParent || hasEmptyChild) {
      toast.error('כל השלבים ותתי-השלבים חייבים להכיל שם');
      return;
    }

    // Ensure glow exists based on color for all
    const normalize = (opts) => opts.map(opt => {
      const hex = opt.color || '#6366f1';
      const rgb = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      const glow = rgb ? `rgba(${parseInt(rgb[1],16)}, ${parseInt(rgb[2],16)}, ${parseInt(rgb[3],16)}, 0.4)` : (opt.glow || 'rgba(99,102,241,0.4)');
      const children = Array.isArray(opt.children) ? opt.children.map(ch => {
        const chHex = ch.color || '#22c55e';
        const chRgb = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(chHex);
        const chGlow = chRgb ? `rgba(${parseInt(chRgb[1],16)}, ${parseInt(chRgb[2],16)}, ${parseInt(chRgb[3],16)}, 0.4)` : (ch.glow || 'rgba(34,197,94,0.4)');
        return { ...ch, glow: chGlow };
      }) : undefined;
      return { ...opt, glow, children };
    });

    const normalized = normalize(editedOptions);

    onSave(normalized);
    
    // Dispatch event to notify other components
    try {
      window.dispatchEvent(new CustomEvent('stage:options:updated', {
        detail: { stageOptions: normalized }
      }));
    } catch (e) {
      console.warn('Failed to dispatch stage options update event');
    }
    
    onClose();
  };

  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Circle className="w-6 h-6 text-purple-600" />
            ניהול שלבים מותאמים
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="text-3xl">🔵</div>
                <div className="flex-1">
                  <h4 className="font-bold text-purple-900 mb-1">שלבים מותאמים</h4>
                  <p className="text-sm text-purple-800">
                    הגדר את השלבים שלך עם צבעים מותאמים. כל שלב יוצג עם עיגול זוהר בצבע ייחודי
                  </p>
                </div>
              </div>
            </div>

            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="stages-list">
                {(provided) => (
                  <div 
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="space-y-3"
                  >
                    {editedOptions.map((stage, index) => (
                      <Draggable key={index} draggableId={`stage-${index}`} index={index}>
                        {(provided, snapshot) => (
                          <div 
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`bg-white border-2 border-slate-200 rounded-lg p-4 hover:border-purple-300 transition-all ${
                              snapshot.isDragging ? 'shadow-xl rotate-1 scale-105' : ''
                            }`}
                          >
                  {editingIndex === index ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-semibold text-slate-600 mb-1 block">
                            שם השלב
                          </label>
                          <Input
                            value={stage.label}
                            onChange={(e) => handleEditStage(index, 'label', e.target.value)}
                            placeholder="שם השלב"
                            dir="rtl"
                            autoFocus
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-slate-600 mb-1 block">
                            צבע
                          </label>
                          <div className="flex gap-2">
                            <Input
                              type="color"
                              value={stage.color}
                              onChange={(e) => handleEditStage(index, 'color', e.target.value)}
                              className="w-16 h-10 cursor-pointer"
                            />
                            <Input
                              type="text"
                              value={stage.color}
                              onChange={(e) => handleEditStage(index, 'color', e.target.value)}
                              placeholder="#3b82f6"
                              className="font-mono text-sm"
                              dir="ltr"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Children editor */}
                      <div className="space-y-2 border-t pt-3 mt-2">
                        <div className="text-xs font-semibold text-slate-600">תתי-שלבים (אופציונלי)</div>
                        {(stage.children && stage.children.length > 0) ? stage.children.map((child, cIdx) => (
                          <div key={cIdx} className="grid grid-cols-2 gap-3 items-end bg-slate-50 p-2 rounded-lg">
                            <div>
                              <label className="text-xs font-semibold text-slate-600 mb-1 block">שם תת-שלב</label>
                              <Input
                                value={child.label || ''}
                                onChange={(e) => {
                                  const updated = [...editedOptions];
                                  const kids = Array.isArray(updated[index].children) ? [...updated[index].children] : [];
                                  kids[cIdx] = { ...kids[cIdx], label: e.target.value, value: `${(updated[index].label || '').replace(/\s+/g,'_')}_${e.target.value.replace(/\s+/g,'_')}` };
                                  updated[index] = { ...updated[index], children: kids };
                                  setEditedOptions(updated);
                                }}
                                placeholder="שם התת-שלב"
                                dir="rtl"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-semibold text-slate-600 mb-1 block">צבע</label>
                              <div className="flex gap-2">
                                <Input
                                  type="color"
                                  value={child.color || '#22c55e'}
                                  onChange={(e) => {
                                    const updated = [...editedOptions];
                                    const kids = Array.isArray(updated[index].children) ? [...updated[index].children] : [];
                                    const val = e.target.value;
                                    const rgb = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(val);
                                    const glow = rgb ? `rgba(${parseInt(rgb[1],16)}, ${parseInt(rgb[2],16)}, ${parseInt(rgb[3],16)}, 0.4)` : 'rgba(34,197,94,0.4)';
                                    kids[cIdx] = { ...kids[cIdx], color: val, glow };
                                    updated[index] = { ...updated[index], children: kids };
                                    setEditedOptions(updated);
                                  }}
                                  className="w-16 h-10 cursor-pointer"
                                />
                                <Input
                                  type="text"
                                  value={child.color || ''}
                                  onChange={(e) => {
                                    const updated = [...editedOptions];
                                    const kids = Array.isArray(updated[index].children) ? [...updated[index].children] : [];
                                    const val = e.target.value;
                                    const rgb = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(val);
                                    const glow = rgb ? `rgba(${parseInt(rgb[1],16)}, ${parseInt(rgb[2],16)}, ${parseInt(rgb[3],16)}, 0.4)` : kids[cIdx]?.glow;
                                    kids[cIdx] = { ...kids[cIdx], color: val, glow };
                                    updated[index] = { ...updated[index], children: kids };
                                    setEditedOptions(updated);
                                  }}
                                  placeholder="#10b981"
                                  className="font-mono text-sm"
                                  dir="ltr"
                                />
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-9 w-9 hover:bg-red-50"
                                  onClick={() => {
                                    const updated = [...editedOptions];
                                    const kids = (updated[index].children || []).filter((_,i) => i !== cIdx);
                                    updated[index] = { ...updated[index], children: kids };
                                    setEditedOptions(updated);
                                  }}
                                >
                                  <Trash2 className="w-4 h-4 text-red-600" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        )) : (
                          <div className="text-xs text-slate-500">אין תתי-שלבים</div>
                        )}
                        <Button size="sm" variant="outline" className="gap-2" onClick={() => {
                          const updated = [...editedOptions];
                          const kids = Array.isArray(updated[index].children) ? [...updated[index].children] : [];
                          kids.push({ label: 'תת-שלב חדש', value: `${(updated[index].label || 'קטגוריה').replace(/\s+/g,'_')}_${Date.now()}`, color: '#22c55e', glow: 'rgba(34,197,94,0.4)' });
                          updated[index] = { ...updated[index], children: kids };
                          setEditedOptions(updated);
                        }}>
                          <Plus className="w-4 h-4" /> הוסף תת-שלב
                        </Button>
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingIndex(null)}
                        >
                          ביטול
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => setEditingIndex(null)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Save className="w-3 h-3 ml-1" />
                          שמור
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          {...provided.dragHandleProps}
                          className="cursor-grab active:cursor-grabbing hover:bg-slate-100 rounded p-1"
                          title="גרור לשינוי סדר"
                        >
                          <GripVertical className="w-4 h-4 text-slate-400" />
                        </div>
                        <div 
                          className="w-4 h-4 rounded-full transition-all"
                          style={{ 
                            backgroundColor: stage.color,
                            boxShadow: `0 0 8px ${stage.glow}, 0 0 12px ${stage.glow}`
                          }}
                        />
                        <span 
                          className="font-semibold px-4 py-1.5 rounded-full text-sm"
                          style={{ 
                            backgroundColor: `${stage.color}15`,
                            color: stage.color,
                            border: `1px solid ${stage.color}40`
                          }}
                        >
                          {stage.label}
                        </span>
                        <span className="text-xs text-slate-500 font-mono">{stage.color}</span>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 hover:bg-blue-50"
                          onClick={() => setEditingIndex(index)}
                        >
                          <Edit2 className="w-4 h-4 text-blue-600" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 hover:bg-red-50"
                          onClick={() => handleDeleteStage(index)}
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
                )}
              </Droppable>
            </DragDropContext>

            <Button
              onClick={handleAddStage}
              variant="outline"
              className="w-full border-2 border-dashed border-purple-300 hover:border-purple-500 hover:bg-purple-50 gap-2"
            >
              <Plus className="w-4 h-4" />
              הוסף שלב חדש
            </Button>

            <Button
              onClick={() => {
                // Add a ready-made category template as requested
                const template = [
                  {
                    label: 'מידע/אגרות',
                    value: 'מידע_אגרות',
                    color: '#8b5cf6',
                    glow: 'rgba(139, 92, 246, 0.4)',
                    children: [
                      { label: 'תיק מידע', value: 'מידע_תיק_מידע', color: '#8b5cf6' },
                      { label: 'פקיד היערות', value: 'מידע_פקיד_היערות', color: '#f59e0b' },
                      { label: 'מפת מדידה בתוקף', value: 'מידע_מפת_מדידה_בתוקף', color: '#3b82f6' },
                      { label: 'תשלום אגרות', value: 'מידע_תשלום_אגרות', color: '#10b981' },
                      { label: 'היטל השבחה', value: 'מידע_היטל_השבחה', color: '#ef4444' }
                    ]
                  },
                  {
                    label: 'תכנון/ביצוע',
                    value: 'תכנון_ביצוע',
                    color: '#3b82f6',
                    glow: 'rgba(59, 130, 246, 0.4)',
                    children: [
                      { label: 'תוכניות עבודה', value: 'תכנון_תוכניות_עבודה', color: '#3b82f6' }
                    ]
                  }
                ];
                setEditedOptions(template);
                toast.success('תבנית קטגוריות נטענה');
              }}
              variant="outline"
              className="w-full mt-2 gap-2 bg-blue-50 border-blue-300 hover:bg-blue-100"
            >
              <Plus className="w-4 h-4" />
              טען תבנית קטגוריות לדוגמה
            </Button>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
              💡 <strong>טיפ:</strong> גרור את האייקון ⋮⋮ כדי לשנות את סדר השלבים. לחץ על עריכה לשינוי שם וצבע
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 border-t pt-4">
          <Button variant="outline" onClick={onClose}>
            ביטול
          </Button>
          <Button
            onClick={handleSave}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 gap-2"
          >
            <Save className="w-4 h-4" />
            שמור שינויים
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}