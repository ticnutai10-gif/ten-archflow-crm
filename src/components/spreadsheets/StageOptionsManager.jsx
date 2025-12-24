import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Edit2, Trash2, Circle, Save, GripVertical, Download, Upload, FileJson, FileSpreadsheet, FileText } from "lucide-react";
import { toast } from "sonner";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

export default function StageOptionsManager({ open, onClose, stageOptions, onSave }) {
  console.log('🔵🔵🔵 [STAGE MANAGER] Component mounted/updated with props:', {
    open,
    stageOptionsLength: stageOptions?.length,
    stageOptions: JSON.stringify(stageOptions, null, 2)
  });

  const DEFAULT_WITH_LELO = [
    { value: 'ללא', label: 'ללא', color: '#cbd5e1', glow: 'rgba(203, 213, 225, 0.4)' },
    { value: 'ברור_תכן', label: 'ברור תכן', color: '#3b82f6', glow: 'rgba(59, 130, 246, 0.4)' },
    { value: 'תיק_מידע', label: 'תיק מידע', color: '#8b5cf6', glow: 'rgba(139, 92, 246, 0.4)' },
    { value: 'היתרים', label: 'היתרים', color: '#f59e0b', glow: 'rgba(245, 158, 11, 0.4)' },
    { value: 'ביצוע', label: 'ביצוע', color: '#10b981', glow: 'rgba(16, 185, 129, 0.4)' },
    { value: 'סיום', label: 'סיום', color: '#6b7280', glow: 'rgba(107, 114, 128, 0.4)' }
  ];

  const [editedOptions, setEditedOptions] = useState(() => {
    console.log('🔵🔵🔵 [STAGE MANAGER] Initial state calculation for editedOptions');
    const initial = stageOptions && stageOptions.length > 0 ? stageOptions : DEFAULT_WITH_LELO;
    console.log('🔵🔵🔵 [STAGE MANAGER] Initial editedOptions:', JSON.stringify(initial, null, 2));
    return initial;
  });
  
  const [editingIndex, setEditingIndex] = useState(null);

  // Update editedOptions when stageOptions prop changes
  React.useEffect(() => {
    console.log('🔵🔵🔵 [STAGE MANAGER] useEffect triggered - stageOptions changed:', {
      stageOptionsLength: stageOptions?.length,
      stageOptions: JSON.stringify(stageOptions, null, 2)
    });
    
    if (stageOptions && stageOptions.length > 0) {
      console.log('🔵🔵🔵 [STAGE MANAGER] Setting editedOptions from prop');
      setEditedOptions(stageOptions);
    } else {
      console.log('🔵🔵🔵 [STAGE MANAGER] No stageOptions in prop, using DEFAULT_WITH_LELO');
      setEditedOptions(DEFAULT_WITH_LELO);
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
    console.log('🔵🔵🔵 [STAGE MANAGER] handleSave called');
    console.log('🔵🔵🔵 [STAGE MANAGER] editedOptions BEFORE validation:', JSON.stringify(editedOptions, null, 2));
    
    // Validation (parents + children)
    const hasEmptyParent = editedOptions.some(opt => !String(opt.label || '').trim());
    const hasEmptyChild = editedOptions.some(opt => (opt.children || []).some(ch => !String(ch.label || '').trim()));
    
    console.log('🔵🔵🔵 [STAGE MANAGER] Validation results:', { hasEmptyParent, hasEmptyChild });
    
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
    console.log('🔵🔵🔵 [STAGE MANAGER] normalized options:', JSON.stringify(normalized, null, 2));

    console.log('🔵🔵🔵 [STAGE MANAGER] Calling onSave with normalized options');
    onSave(normalized);
    
    // Dispatch event to notify other components
    try {
      console.log('🔵🔵🔵 [STAGE MANAGER] Dispatching stage:options:updated event');
      window.dispatchEvent(new CustomEvent('stage:options:updated', {
        detail: { stageOptions: normalized }
      }));
      console.log('🔵🔵🔵 [STAGE MANAGER] Event dispatched successfully');
    } catch (e) {
      console.warn('🔵🔵🔵 [STAGE MANAGER] Failed to dispatch stage options update event:', e);
    }
    
    console.log('🔵🔵🔵 [STAGE MANAGER] Closing dialog');
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

  const fileInputRef = React.useRef(null);

  const handleExportJSON = () => {
    const dataStr = JSON.stringify(editedOptions, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'stages_config.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success('הגדרות יוצאו בהצלחה (JSON)');
  };

  const handleExportCSV = () => {
    let csvContent = "\uFEFFParent Label,Parent Value,Parent Color,Child Label,Child Value,Child Color\n";
    
    editedOptions.forEach(parent => {
      if (parent.children && parent.children.length > 0) {
        parent.children.forEach(child => {
          const row = [
            `"${(parent.label || '').replace(/"/g, '""')}"`,
            `"${(parent.value || '').replace(/"/g, '""')}"`,
            `"${(parent.color || '').replace(/"/g, '""')}"`,
            `"${(child.label || '').replace(/"/g, '""')}"`,
            `"${(child.value || '').replace(/"/g, '""')}"`,
            `"${(child.color || '').replace(/"/g, '""')}"`
          ].join(",");
          csvContent += row + "\n";
        });
      } else {
        const row = [
          `"${(parent.label || '').replace(/"/g, '""')}"`,
          `"${(parent.value || '').replace(/"/g, '""')}"`,
          `"${(parent.color || '').replace(/"/g, '""')}"`,
          "", "", ""
        ].join(",");
        csvContent += row + "\n";
      }
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'stages_config.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success('הגדרות יוצאו בהצלחה (CSV)');
  };

  const handleExportTXT = () => {
    let txtContent = "";
    
    editedOptions.forEach(parent => {
      txtContent += `${parent.label}, ${parent.color}\n`;
      if (parent.children && parent.children.length > 0) {
        parent.children.forEach(child => {
          txtContent += `- ${child.label}, ${child.color}\n`;
        });
      }
    });

    const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'stages_config.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success('הגדרות יוצאו בהצלחה (TXT)');
  };

  const handleImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const content = e.target.result;
        let newOptions = [];

        if (file.name.endsWith('.json')) {
          newOptions = JSON.parse(content);
          if (!Array.isArray(newOptions)) throw new Error('Format invalid');
        } else if (file.name.endsWith('.csv')) {
          const lines = content.split('\n').map(line => line.trim()).filter(line => line);
          const parentsMap = new Map();
          
          // Skip header row if present
          const startIndex = lines[0].includes('Parent Label') ? 1 : 0;

          for (let i = startIndex; i < lines.length; i++) {
            // Simple CSV parser that handles quotes
            const matches = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
            const cols = matches.map(m => m.replace(/^"|"$/g, '').replace(/""/g, '"'));
            
            if (cols.length < 1) continue;

            const pLabel = cols[0];
            const pValue = cols[1] || pLabel.replace(/\s+/g, '_');
            const pColor = cols[2] || '#6366f1';
            
            if (!pLabel) continue;

            if (!parentsMap.has(pValue)) {
              // Calc glow
              const hex = pColor;
              const rgb = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
              const glow = rgb ? `rgba(${parseInt(rgb[1],16)}, ${parseInt(rgb[2],16)}, ${parseInt(rgb[3],16)}, 0.4)` : 'rgba(99,102,241,0.4)';
              
              parentsMap.set(pValue, {
                label: pLabel,
                value: pValue,
                color: pColor,
                glow,
                children: []
              });
            }

            const cLabel = cols[3];
            if (cLabel) {
              const cValue = cols[4] || `${pValue}_${cLabel.replace(/\s+/g, '_')}`;
              const cColor = cols[5] || '#22c55e';
              
              const cHex = cColor;
              const cRgb = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(cHex);
              const cGlow = cRgb ? `rgba(${parseInt(cRgb[1],16)}, ${parseInt(cRgb[2],16)}, ${parseInt(cRgb[3],16)}, 0.4)` : 'rgba(34,197,94,0.4)';

              const parent = parentsMap.get(pValue);
              parent.children.push({
                label: cLabel,
                value: cValue,
                color: cColor,
                glow: cGlow
              });
            }
          }
          newOptions = Array.from(parentsMap.values());
        } else if (file.name.endsWith('.txt')) {
          const lines = content.split('\n').filter(line => line.trim());
          const options = [];
          let currentParent = null;

          lines.forEach(line => {
            const isChild = line.trim().startsWith('-');
            const parts = line.replace(/^-/, '').split(',').map(s => s.trim());
            const label = parts[0];
            const color = parts[1] || (isChild ? '#22c55e' : '#6366f1');
            
            if (!label) return;

            // Calc glow
            const hex = color;
            const rgb = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            const glow = rgb ? `rgba(${parseInt(rgb[1],16)}, ${parseInt(rgb[2],16)}, ${parseInt(rgb[3],16)}, 0.4)` : 'rgba(99,102,241,0.4)';

            if (isChild && currentParent) {
              const value = `${currentParent.value}_${label.replace(/\s+/g, '_')}`;
              currentParent.children.push({
                label,
                value,
                color,
                glow
              });
            } else {
              const value = label.replace(/\s+/g, '_');
              currentParent = {
                label,
                value,
                color,
                glow,
                children: []
              };
              options.push(currentParent);
            }
          });
          newOptions = options;
        } else {
          toast.error('פורמט קובץ לא נתמך (רק JSON, CSV, או TXT)');
          return;
        }

        setEditedOptions(newOptions);
        toast.success(`✓ נטענו ${newOptions.length} קטגוריות`);
      } catch (error) {
        console.error('Import error:', error);
        toast.error('שגיאה בטעינת הקובץ: ' + error.message);
      }
      
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    };

    reader.readAsText(file);
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

            <div className="grid grid-cols-3 gap-2 mt-4">
              <Button variant="outline" className="gap-2 px-2" onClick={handleExportJSON}>
                <FileJson className="w-4 h-4 text-orange-600" /> יצא JSON
              </Button>
              <Button variant="outline" className="gap-2 px-2" onClick={handleExportCSV}>
                <FileSpreadsheet className="w-4 h-4 text-green-600" /> יצא CSV
              </Button>
              <Button variant="outline" className="gap-2 px-2" onClick={handleExportTXT}>
                <FileText className="w-4 h-4 text-slate-600" /> יצא TXT
              </Button>
            </div>

            <div className="relative mt-2">
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".json,.csv,.txt" 
                onChange={handleImport} 
              />
              <Button 
                variant="outline" 
                className="w-full gap-2 border-dashed border-slate-300 hover:bg-slate-50" 
                onClick={() => fileInputRef.current.click()}
              >
                <Upload className="w-4 h-4 text-blue-600" /> 
                ייבא הגדרות מקובץ (JSON/CSV/TXT)
              </Button>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
              💡 <strong>טיפ:</strong> ניתן לייצא את ההגדרות לגיבוי או לעריכה באקסל, ואז לייבא חזרה.
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