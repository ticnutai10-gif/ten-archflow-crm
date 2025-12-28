import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Settings, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function QuickOptions({ 
  type = "title", // 'title' or 'notes'
  onSelect, 
  className = "" 
}) {
  const [options, setOptions] = useState([]);
  const [isManageOpen, setIsManageOpen] = useState(false);
  const [newOption, setNewOption] = useState("");
  const [loading, setLoading] = useState(false);
  const [settingsId, setSettingsId] = useState(null);

  const SETTING_KEY = "time_log_options";

  useEffect(() => {
    loadOptions();
  }, []);

  const loadOptions = async () => {
    try {
      const settings = await base44.entities.AppSettings.filter({
        setting_key: SETTING_KEY
      });

      if (settings.length > 0) {
        setSettingsId(settings[0].id);
        const data = settings[0].value || {};
        const list = data[type] || getDefaultOptions(type);
        setOptions(list);
      } else {
        setOptions(getDefaultOptions(type));
      }
    } catch (e) {
      console.error("Failed to load options", e);
      setOptions(getDefaultOptions(type));
    }
  };

  const getDefaultOptions = (t) => {
    if (t === "title") return ["פגישה", "פיתוח", "עיצוב", "תכנון", "שיחת טלפון"];
    if (t === "notes") return ["הושלם בהצלחה", "נדרש המשך טיפול", "ממתין לאישור הלקוח"];
    return [];
  };

  const saveOptions = async (newOptions) => {
    setLoading(true);
    try {
      // Fetch fresh to ensure we don't overwrite other fields (like the other type's array)
      const settings = await base44.entities.AppSettings.filter({
        setting_key: SETTING_KEY
      });

      let currentData = {};
      let id = settingsId;

      if (settings.length > 0) {
        currentData = settings[0].value || {};
        id = settings[0].id;
      }

      const updatedData = {
        ...currentData,
        [type]: newOptions
      };

      if (id) {
        await base44.entities.AppSettings.update(id, {
          value: updatedData
        });
      } else {
        const res = await base44.entities.AppSettings.create({
          setting_key: SETTING_KEY,
          value: updatedData,
          description: "Options for time log titles and notes"
        });
        setSettingsId(res.id);
      }
      
      setOptions(newOptions);
      toast.success("נשמר בהצלחה");
    } catch (e) {
      console.error("Failed to save options", e);
      toast.error("שגיאה בשמירה");
    } finally {
      setLoading(false);
    }
  };

  const handleAddOption = () => {
    if (!newOption.trim()) return;
    if (options.includes(newOption.trim())) {
      toast.error("האפשרות קיימת כבר");
      return;
    }
    const updated = [...options, newOption.trim()];
    saveOptions(updated);
    setNewOption("");
  };

  const handleRemoveOption = (optToRemove) => {
    const updated = options.filter(o => o !== optToRemove);
    saveOptions(updated);
  };

  return (
    <div className={`flex flex-wrap items-center gap-2 mt-2 ${className}`}>
      {options.map((opt) => (
        <Badge 
          key={opt} 
          variant="secondary"
          className="cursor-pointer hover:bg-blue-100 transition-colors px-2 py-1 text-xs font-normal border border-slate-200"
          onClick={() => onSelect(opt)}
        >
          {opt}
        </Badge>
      ))}
      
      <Button 
        variant="ghost" 
        size="sm" 
        className="h-6 w-6 p-0 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600"
        onClick={() => setIsManageOpen(true)}
        title="ניהול אפשרויות"
      >
        <Settings className="w-3.5 h-3.5" />
      </Button>

      <Dialog open={isManageOpen} onOpenChange={setIsManageOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>ניהול {type === 'title' ? 'כותרות' : 'הערות'}</DialogTitle>
          </DialogHeader>
          
          <div className="flex items-center gap-2 mt-4">
            <Input
              value={newOption}
              onChange={(e) => setNewOption(e.target.value)}
              placeholder="הוסף אפשרות חדשה..."
              onKeyDown={(e) => e.key === 'Enter' && handleAddOption()}
            />
            <Button onClick={handleAddOption} disabled={!newOption.trim() || loading}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex flex-wrap gap-2 mt-4 max-h-[200px] overflow-y-auto p-1">
            {options.map((opt) => (
              <div 
                key={opt} 
                className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-md border border-slate-200 text-sm"
              >
                <span>{opt}</span>
                <button 
                  onClick={() => handleRemoveOption(opt)}
                  disabled={loading}
                  className="text-slate-400 hover:text-red-500 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {options.length === 0 && (
              <div className="text-slate-500 text-sm w-full text-center py-4">
                אין אפשרויות שמורות
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsManageOpen(false)}>
              סגור
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}