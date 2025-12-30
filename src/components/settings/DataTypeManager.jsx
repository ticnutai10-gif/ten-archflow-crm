import React, { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Edit2, Trash2, Circle, Save, GripVertical, Upload, FileJson, FileSpreadsheet, FileText, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { base44 } from "@/api/base44Client";

export default function DataTypeManager({ open, onClose, typeKey, typeName }) {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingIndex, setEditingIndex] = useState(null);
  const [entityId, setEntityId] = useState(null);

  // Load data from GlobalDataType entity
  useEffect(() => {
    if (open && typeKey) {
      loadData();
    }
  }, [open, typeKey]);

  const loadData = async () => {
    setLoading(true);
    try {
      const results = await base44.entities.GlobalDataType.list();
      const existing = results.find(item => item.type_key === typeKey);
      
      if (existing) {
        setOptions(existing.options || []);
        setEntityId(existing.id);
      } else {
        setOptions([]);
        setEntityId(null);
      }
    } catch (error) {
      console.error("Error loading data types:", error);
      toast.error("שגיאה בטעינת נתונים");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    // Validation
    const hasEmptyParent = options.some(opt => !String(opt.label || '').trim());
    const hasEmptyChild = options.some(opt => (opt.children || []).some(ch => !String(ch.label || '').trim()));
    
    if (hasEmptyParent || hasEmptyChild) {
      toast.error('כל הקטגוריות ותתי-הקטגוריות חייבות להכיל שם');
      return;
    }

    // Normalize
    const normalized = options.map(opt => {
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

    try {
      if (entityId) {
        await base44.entities.GlobalDataType.update(entityId, { options: normalized, name: typeName });
      } else {
        await base44.entities.GlobalDataType.create({
          type_key: typeKey,
          name: typeName,
          options: normalized
        });
      }
      
      // Dispatch event for real-time updates across the app
      window.dispatchEvent(new CustomEvent('global-data-type:updated', {
        detail: { typeKey, options: normalized }
      }));
      
      toast.success('השינויים נשמרו בהצלחה');
      onClose();
    } catch (error) {
      console.error("Error saving data type:", error);
      toast.error("שגיאה בשמירה");
    }
  };

  const handleAddOption = () => {
    const newOption = {
      value: `opt_${Date.now()}`,
      label: 'קטגוריה חדשה',
      color: '#6366f1',
      glow: 'rgba(99, 102, 241, 0.4)',
      children: []
    };
    setOptions([...options, newOption]);
    setEditingIndex(options.length); // Start editing immediately
  };

  const handleEditOption = (index, field, value) => {
    const updated = [...options];
    updated[index] = { ...updated[index], [field]: value };
    
    if (field === 'color') {
      const rgb = hexToRgb(value);
      if (rgb) updated[index].glow = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.4)`;
    }
    
    if (field === 'label') {
      updated[index].value = value.replace(/\s+/g, '_');
    }
    
    setOptions(updated);
  };

  const handleDeleteOption = (index) => {
    if (!confirm(`למחוק את "${options[index].label}"?`)) return;
    const updated = options.filter((_, i) => i !== index);
    setOptions(updated);
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const items = Array.from(options);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setOptions(items);
  };

  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };

  // Import/Export Logic (simplified from StageOptionsManager)
  const fileInputRef = useRef(null);
  
  const handleExportJSON = () => {
    const dataStr = JSON.stringify(options, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${typeKey}_config.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const newOptions = JSON.parse(e.target.result);
        if (Array.isArray(newOptions)) {
          setOptions(newOptions);
          toast.success('ייבוא הצליח');
        }
      } catch (err) {
        toast.error('שגיאה בייבוא');
      }
    };
    reader.readAsText(file);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Circle className="w-6 h-6 text-purple-600" />
            ניהול {typeName}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          {loading ? (
            <div className="text-center py-8">טוען...</div>
          ) : (
            <div className="space-y-4">
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="options-list">
                  {(provided) => (
                    <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-3">
                      {options.map((option, index) => (
                        <Draggable key={index} draggableId={`opt-${index}`} index={index}>
                          {(provided, snapshot) => (
                            <div 
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`bg-white border-2 border-slate-200 rounded-lg p-4 hover:border-purple-300 transition-all ${snapshot.isDragging ? 'shadow-xl rotate-1 scale-105' : ''}`}
                            >
                              {editingIndex === index ? (
                                <div className="space-y-3">
                                  <div className="grid grid-cols-2 gap-3">
                                    <div>
                                      <label className="text-xs font-semibold text-slate-600 mb-1 block">שם</label>
                                      <Input value={option.label} onChange={(e) => handleEditOption(index, 'label', e.target.value)} autoFocus />
                                    </div>
                                    <div>
                                      <label className="text-xs font-semibold text-slate-600 mb-1 block">צבע</label>
                                      <div className="flex gap-2">
                                        <Input type="color" value={option.color} onChange={(e) => handleEditOption(index, 'color', e.target.value)} className="w-16 h-10 cursor-pointer" />
                                      </div>
                                    </div>
                                  </div>

                                  {/* Sub-categories */}
                                  <div className="space-y-2 border-t pt-3 mt-2">
                                    <div className="text-xs font-semibold text-slate-600">תתי-קטגוריות</div>
                                    {(option.children || []).map((child, cIdx) => (
                                      <div key={cIdx} className="grid grid-cols-2 gap-3 items-end bg-slate-50 p-2 rounded-lg">
                                        <Input 
                                          value={child.label} 
                                          onChange={(e) => {
                                            const updated = [...options];
                                            const kids = [...updated[index].children];
                                            kids[cIdx] = { ...kids[cIdx], label: e.target.value, value: `${updated[index].value}_${e.target.value.replace(/\s+/g,'_')}` };
                                            updated[index].children = kids;
                                            setOptions(updated);
                                          }} 
                                          placeholder="שם תת-קטגוריה"
                                        />
                                        <div className="flex gap-2">
                                          <Input 
                                            type="color" 
                                            value={child.color || '#22c55e'} 
                                            onChange={(e) => {
                                              const updated = [...options];
                                              const kids = [...updated[index].children];
                                              kids[cIdx] = { ...kids[cIdx], color: e.target.value };
                                              updated[index].children = kids;
                                              setOptions(updated);
                                            }} 
                                            className="w-16 h-10 cursor-pointer" 
                                          />
                                          <Button size="icon" variant="ghost" className="h-9 w-9 text-red-600" onClick={() => {
                                            const updated = [...options];
                                            updated[index].children = updated[index].children.filter((_, i) => i !== cIdx);
                                            setOptions(updated);
                                          }}><Trash2 className="w-4 h-4" /></Button>
                                        </div>
                                      </div>
                                    ))}
                                    <Button size="sm" variant="outline" onClick={() => {
                                      const updated = [...options];
                                      if (!updated[index].children) updated[index].children = [];
                                      updated[index].children.push({ label: 'חדש', value: `sub_${Date.now()}`, color: '#22c55e' });
                                      setOptions(updated);
                                    }}><Plus className="w-4 h-4 ml-2" />הוסף תת-קטגוריה</Button>
                                  </div>

                                  <div className="flex justify-end gap-2">
                                    <Button size="sm" onClick={() => setEditingIndex(null)} className="bg-green-600 hover:bg-green-700"><Save className="w-3 h-3 ml-1" />שמור</Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div {...provided.dragHandleProps} className="cursor-grab text-slate-400"><GripVertical className="w-4 h-4" /></div>
                                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: option.color }} />
                                    <span className="font-semibold">{option.label}</span>
                                    {option.children?.length > 0 && <span className="text-xs text-slate-500">({option.children.length} תתי-קטגוריות)</span>}
                                  </div>
                                  <div className="flex gap-1">
                                    <Button size="icon" variant="ghost" onClick={() => setEditingIndex(index)}><Edit2 className="w-4 h-4 text-blue-600" /></Button>
                                    <Button size="icon" variant="ghost" onClick={() => handleDeleteOption(index)}><Trash2 className="w-4 h-4 text-red-600" /></Button>
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

              <Button onClick={handleAddOption} variant="outline" className="w-full border-dashed gap-2"><Plus className="w-4 h-4" />הוסף קטגוריה חדשה</Button>
              
              <div className="flex gap-2 mt-4">
                 <Button variant="outline" onClick={handleExportJSON} className="flex-1 gap-2"><FileJson className="w-4 h-4" /> ייצוא JSON</Button>
                 <div className="relative flex-1">
                    <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleImport} />
                    <Button variant="outline" onClick={() => fileInputRef.current.click()} className="w-full gap-2"><Upload className="w-4 h-4" /> ייבוא JSON</Button>
                 </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 border-t pt-4">
          <Button variant="outline" onClick={onClose}>סגור</Button>
          <Button onClick={handleSave} className="bg-purple-600 hover:bg-purple-700 gap-2"><Save className="w-4 h-4" />שמור שינויים</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}