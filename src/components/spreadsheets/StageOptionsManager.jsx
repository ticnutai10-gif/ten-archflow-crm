import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Edit2, Trash2, Circle, Save, GripVertical, Upload } from "lucide-react";
import { toast } from "sonner";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

const DEFAULT_STAGE_OPTIONS = [
  { value: 'ברור_תכן', label: 'ברור תכן', color: '#3b82f6', glow: 'rgba(59, 130, 246, 0.4)' },
  { value: 'תיק_מידע', label: 'תיק מידע', color: '#8b5cf6', glow: 'rgba(139, 92, 246, 0.4)' },
  { value: 'היתרים', label: 'היתרים', color: '#f59e0b', glow: 'rgba(245, 158, 11, 0.4)' },
  { value: 'ביצוע', label: 'ביצוע', color: '#10b981', glow: 'rgba(16, 185, 129, 0.4)' },
  { value: 'סיום', label: 'סיום', color: '#6b7280', glow: 'rgba(107, 114, 128, 0.4)' }
];

export default function StageOptionsManager({ open, onClose, stageOptions, onSave }) {
  const [editedOptions, setEditedOptions] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const fileInputRef = React.useRef(null);

  // Load options when dialog opens
  React.useEffect(() => {
    if (!open) {
      setEditingIndex(null);
      return;
    }
    
    setIsLoading(true);
    setEditingIndex(null);
    
    // Handle both array and wrapped object format
    const opts = stageOptions;
    const normalizedOpts = Array.isArray(opts) ? opts : (opts?.options || DEFAULT_STAGE_OPTIONS);
    setEditedOptions(normalizedOpts);
    setIsLoading(false);
  }, [open, stageOptions]);

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
    // Validation
    const hasEmpty = editedOptions.some(opt => !opt.label.trim());
    if (hasEmpty) {
      toast.error('כל השלבים חייבים להכיל שם');
      return;
    }

    const uniqueLabels = new Set(editedOptions.map(opt => opt.label));
    if (uniqueLabels.size !== editedOptions.length) {
      toast.error('כל השלבים חייבים להיות בעלי שם ייחודי');
      return;
    }

    onSave(editedOptions);
    
    // Dispatch event to notify other components
    try {
      window.dispatchEvent(new CustomEvent('stage:options:updated', {
        detail: { stageOptions: editedOptions }
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

  const handleImportFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target.result;
        const imported = JSON.parse(content);
        
        // Validate structure
        if (!Array.isArray(imported)) {
          toast.error('הקובץ חייב להכיל מערך של שלבים');
          return;
        }

        const validStages = imported.filter(stage => 
          stage.label && stage.color
        );

        if (validStages.length === 0) {
          toast.error('לא נמצאו שלבים תקינים בקובץ');
          return;
        }

        // Add glow if missing
        const normalized = validStages.map(stage => {
          if (!stage.glow && stage.color) {
            const rgb = hexToRgb(stage.color);
            if (rgb) {
              stage.glow = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.4)`;
            }
          }
          if (!stage.value) {
            stage.value = stage.label.replace(/\s+/g, '_');
          }
          return stage;
        });

        setEditedOptions(normalized);
        toast.success(`✓ ייובאו ${normalized.length} שלבים מהקובץ`);
      } catch (error) {
        toast.error('שגיאה בקריאת הקובץ. ודא שזהו קובץ JSON תקין');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleExportFile = () => {
    const dataStr = JSON.stringify(editedOptions, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `stages-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('✓ הקובץ יוצא בהצלחה');
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

            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={handleAddStage}
                variant="outline"
                className="border-2 border-dashed border-purple-300 hover:border-purple-500 hover:bg-purple-50 gap-2"
              >
                <Plus className="w-4 h-4" />
                הוסף שלב חדש
              </Button>
              
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImportFile}
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                className="border-2 border-dashed border-blue-300 hover:border-blue-500 hover:bg-blue-50 gap-2"
              >
                <Upload className="w-4 h-4" />
                ייבא מקובץ JSON
              </Button>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
              💡 <strong>טיפ:</strong> גרור את האייקון ⋮⋮ כדי לשנות את סדר השלבים. לחץ על עריכה לשינוי שם וצבע
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 border-t pt-4">
          <Button variant="outline" onClick={handleExportFile}>
            ייצא JSON
          </Button>
          <div className="flex-1" />
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