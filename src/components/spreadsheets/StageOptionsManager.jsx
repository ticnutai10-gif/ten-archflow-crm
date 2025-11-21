import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Edit2, Trash2, Circle, Save } from "lucide-react";
import { toast } from "sonner";

export default function StageOptionsManager({ open, onClose, stageOptions, onSave }) {
  const [editedOptions, setEditedOptions] = useState(stageOptions || []);
  const [editingIndex, setEditingIndex] = useState(null);

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

            <div className="space-y-3">
              {editedOptions.map((stage, index) => (
                <div 
                  key={index} 
                  className="bg-white border-2 border-slate-200 rounded-lg p-4 hover:border-purple-300 transition-all"
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
              ))}
            </div>

            <Button
              onClick={handleAddStage}
              variant="outline"
              className="w-full border-2 border-dashed border-purple-300 hover:border-purple-500 hover:bg-purple-50 gap-2"
            >
              <Plus className="w-4 h-4" />
              הוסף שלב חדש
            </Button>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
              💡 <strong>טיפ:</strong> לחץ על עריכה כדי לשנות את שם השלב והצבע שלו. הצבע יוצג בטבלה עם אפקט זוהר
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