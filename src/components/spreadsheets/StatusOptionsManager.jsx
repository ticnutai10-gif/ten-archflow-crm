import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Edit2, Trash2, Circle, Save, GripVertical, Upload } from "lucide-react";
import { toast } from "sonner";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { base44 } from "@/api/base44Client";

const DEFAULT_STATUS_OPTIONS = [
  { value: 'פוטנציאלי', label: 'פוטנציאלי', color: '#f59e0b', glow: 'rgba(245, 158, 11, 0.4)' },
  { value: 'פעיל', label: 'פעיל', color: '#22c55e', glow: 'rgba(34, 197, 94, 0.4)' },
  { value: 'לא_פעיל', label: 'לא פעיל', color: '#ef4444', glow: 'rgba(239, 68, 68, 0.4)' }
];

export default function StatusOptionsManager({ open, onClose, statusOptions, onSave }) {
  const [editedOptions, setEditedOptions] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const fileInputRef = React.useRef(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load global options from AppSettings when dialog opens
  React.useEffect(() => {
    if (!open) {
      // Reset state when closing
      setEditingIndex(null);
      return;
    }
    
    setIsLoading(true);
    setEditingIndex(null);
    
    const loadGlobalOptions = async () => {
      try {
        const statusSettings = await base44.entities.AppSettings.filter({ setting_key: 'client_status_options' });
        
        let globalStatusOptions = DEFAULT_STATUS_OPTIONS;
        if (statusSettings.length > 0 && statusSettings[0].value) {
          // Extract options from wrapped object or array
          const val = statusSettings[0].value;
          globalStatusOptions = Array.isArray(val) ? val : (val.options || DEFAULT_STATUS_OPTIONS);
        }
        
        setEditedOptions(globalStatusOptions);
      } catch (error) {
        console.error('Error loading global status options:', error);
        setEditedOptions(statusOptions || DEFAULT_STATUS_OPTIONS);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadGlobalOptions();
  }, [open]);

  const handleAddStatus = () => {
    const newStatus = {
      value: `סטטוס_${Date.now()}`,
      label: 'סטטוס חדש',
      color: '#22c55e',
      glow: 'rgba(34, 197, 94, 0.4)',
      iconColor: '#22c55e',
      iconSize: 'md'
    };
    setEditedOptions([...editedOptions, newStatus]);
  };

  const handleEditStatus = (index, field, value) => {
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

  const handleDeleteStatus = (index) => {
    if (editedOptions.length <= 1) {
      toast.error('חייב להישאר לפחות סטטוס אחד');
      return;
    }
    
    if (!confirm(`למחוק את הסטטוס "${editedOptions[index].label}"?`)) return;
    
    const updated = editedOptions.filter((_, i) => i !== index);
    setEditedOptions(updated);
    toast.success('✓ סטטוס נמחק');
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(editedOptions);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setEditedOptions(items);
    toast.success('✓ סדר הסטטוסים עודכן');
  };

  const handleSave = async () => {
    // Validation
    const hasEmpty = editedOptions.some(opt => !opt.label.trim());
    if (hasEmpty) {
      toast.error('כל הסטטוסים חייבים להכיל שם');
      return;
    }

    const uniqueLabels = new Set(editedOptions.map(opt => opt.label));
    if (uniqueLabels.size !== editedOptions.length) {
      toast.error('כל הסטטוסים חייבים להיות בעלי שם ייחודי');
      return;
    }

    // Save to AppSettings
    try {
      const user = await base44.auth.me();
      const existingSettings = await base44.entities.AppSettings.filter({ setting_key: 'client_status_options' });
      
      // Wrap array in object for AppSettings
      const valueToSave = { options: editedOptions };
      
      if (existingSettings.length > 0) {
        await base44.entities.AppSettings.update(existingSettings[0].id, {
          value: valueToSave,
          updated_by: user.email
        });
      } else {
        await base44.entities.AppSettings.create({
          setting_key: 'client_status_options',
          value: valueToSave,
          updated_by: user.email
        });
      }
      
      toast.success('✓ הסטטוסים נשמרו ויסונכרנו בכל המערכת');
    } catch (error) {
      console.error('Error saving to AppSettings:', error);
      toast.error('שגיאה בשמירת ההגדרות');
      return;
    }

    onSave(editedOptions);
    
    // Dispatch event to notify other components
    try {
      window.dispatchEvent(new CustomEvent('status:options:updated', {
        detail: { statusOptions: editedOptions }
      }));
    } catch (e) {
      console.warn('Failed to dispatch status options update event');
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
          toast.error('הקובץ חייב להכיל מערך של סטטוסים');
          return;
        }

        const validStatuses = imported.filter(status => 
          status.label && status.color
        );

        if (validStatuses.length === 0) {
          toast.error('לא נמצאו סטטוסים תקינים בקובץ');
          return;
        }

        // Add glow if missing
        const normalized = validStatuses.map(status => {
          if (!status.glow && status.color) {
            const rgb = hexToRgb(status.color);
            if (rgb) {
              status.glow = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.4)`;
            }
          }
          if (!status.value) {
            status.value = status.label.replace(/\s+/g, '_');
          }
          if (!status.iconColor) {
            status.iconColor = status.color;
          }
          if (!status.iconSize) {
            status.iconSize = 'md';
          }
          return status;
        });

        setEditedOptions(normalized);
        toast.success(`✓ ייובאו ${normalized.length} סטטוסים מהקובץ`);
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
    link.download = `statuses-${new Date().toISOString().split('T')[0]}.json`;
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
            <Circle className="w-6 h-6 text-green-600" />
            ניהול סטטוסים מותאמים
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          <div className="space-y-4">
            {isLoading ? (
              <div className="text-center py-8 text-slate-500">טוען...</div>
            ) : (
              <>
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="text-3xl">🟢</div>
                <div className="flex-1">
                  <h4 className="font-bold text-green-900 mb-1">סטטוסים מותאמים</h4>
                  <p className="text-sm text-green-800">
                    הגדר את הסטטוסים שלך עם צבעים מותאמים. כל סטטוס יוצג עם עיגול זוהר בצבע ייחודי
                  </p>
                </div>
              </div>
            </div>

            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="statuses-list">
                {(provided) => (
                  <div 
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="space-y-3"
                  >
                    {editedOptions.map((status, index) => (
                      <Draggable key={index} draggableId={`status-${index}`} index={index}>
                        {(provided, snapshot) => (
                          <div 
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`bg-white border-2 border-slate-200 rounded-lg p-4 hover:border-green-300 transition-all ${
                              snapshot.isDragging ? 'shadow-xl rotate-1 scale-105' : ''
                            }`}
                          >
                  {editingIndex === index ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-semibold text-slate-600 mb-1 block">
                            שם הסטטוס
                          </label>
                          <Input
                            value={status.label}
                            onChange={(e) => handleEditStatus(index, 'label', e.target.value)}
                            placeholder="שם הסטטוס"
                            dir="rtl"
                            autoFocus
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-slate-600 mb-1 block">
                            צבע רקע
                          </label>
                          <div className="flex gap-2">
                            <Input
                              type="color"
                              value={status.color}
                              onChange={(e) => handleEditStatus(index, 'color', e.target.value)}
                              className="w-16 h-10 cursor-pointer"
                            />
                            <Input
                              type="text"
                              value={status.color}
                              onChange={(e) => handleEditStatus(index, 'color', e.target.value)}
                              placeholder="#22c55e"
                              className="font-mono text-sm"
                              dir="ltr"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-semibold text-slate-600 mb-1 block">
                            צבע אייקון
                          </label>
                          <div className="flex gap-2">
                            <Input
                              type="color"
                              value={status.iconColor || status.color}
                              onChange={(e) => handleEditStatus(index, 'iconColor', e.target.value)}
                              className="w-16 h-10 cursor-pointer"
                            />
                            <Input
                              type="text"
                              value={status.iconColor || status.color}
                              onChange={(e) => handleEditStatus(index, 'iconColor', e.target.value)}
                              placeholder="#22c55e"
                              className="font-mono text-sm"
                              dir="ltr"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-slate-600 mb-1 block">
                            גודל אייקון
                          </label>
                          <select
                            value={status.iconSize || 'md'}
                            onChange={(e) => handleEditStatus(index, 'iconSize', e.target.value)}
                            className="w-full h-10 px-3 border border-slate-300 rounded-md text-sm"
                          >
                            <option value="sm">קטן (12px)</option>
                            <option value="md">בינוני (16px)</option>
                            <option value="lg">גדול (20px)</option>
                          </select>
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
                          className={`rounded-full transition-all animate-pulse ${
                            status.iconSize === 'sm' ? 'w-3 h-3' : 
                            status.iconSize === 'lg' ? 'w-5 h-5' : 'w-4 h-4'
                          }`}
                          style={{ 
                            backgroundColor: status.iconColor || status.color,
                            boxShadow: `0 0 8px ${status.glow}, 0 0 12px ${status.glow}`
                          }}
                        />
                        <span 
                          className="font-semibold px-4 py-1.5 rounded-full text-sm"
                          style={{ 
                            backgroundColor: `${status.color}15`,
                            color: status.color,
                            border: `1px solid ${status.color}40`
                          }}
                        >
                          {status.label}
                        </span>
                        <span className="text-xs text-slate-500 font-mono">{status.color}</span>
                        {status.iconColor && status.iconColor !== status.color && (
                          <span className="text-xs text-slate-400 font-mono">אייקון: {status.iconColor}</span>
                        )}
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
                          onClick={() => handleDeleteStatus(index)}
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
                onClick={handleAddStatus}
                variant="outline"
                className="border-2 border-dashed border-green-300 hover:border-green-500 hover:bg-green-50 gap-2"
              >
                <Plus className="w-4 h-4" />
                הוסף סטטוס חדש
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
              💡 <strong>טיפ:</strong> גרור את האייקון ⋮⋮ כדי לשנות את סדר הסטטוסים. לחץ על עריכה לשינוי שם וצבע
            </div>
            </>
            )}
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
            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 gap-2"
          >
            <Save className="w-4 h-4" />
            שמור שינויים
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}