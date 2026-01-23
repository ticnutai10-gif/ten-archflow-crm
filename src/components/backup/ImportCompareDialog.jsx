import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { 
  GitCompare, Plus, RefreshCw, AlertTriangle, CheckCircle2, 
  ArrowLeft, ArrowRight, X, ChevronDown, ChevronUp
} from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function ImportCompareDialog({ 
  open, 
  onClose, 
  importData = {},
  onConfirmImport 
}) {
  const [comparison, setComparison] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedChanges, setSelectedChanges] = useState(new Set());
  const [expandedCategories, setExpandedCategories] = useState(new Set());
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (open && Object.keys(importData).length > 0) {
      compareData();
    }
  }, [open, importData]);

  const compareData = async () => {
    setLoading(true);
    const result = {};
    
    for (const [category, records] of Object.entries(importData)) {
      try {
        if (!base44.entities || !base44.entities[category]) {
          result[category] = {
            new: records,
            updated: [],
            unchanged: [],
            error: 'קטגוריה לא קיימת במערכת'
          };
          continue;
        }

        const existing = await base44.entities[category].list('-created_date', 10000);
        const existingMap = new Map(existing.map(r => [r.id, r]));
        
        const newRecords = [];
        const updatedRecords = [];
        const unchangedRecords = [];
        
        for (const record of records) {
          if (!record.id) {
            newRecords.push({ record, type: 'new' });
          } else if (existingMap.has(record.id)) {
            const existingRecord = existingMap.get(record.id);
            const changes = findChanges(existingRecord, record);
            
            if (changes.length > 0) {
              updatedRecords.push({ 
                record, 
                existing: existingRecord, 
                changes,
                type: 'updated'
              });
            } else {
              unchangedRecords.push({ record, type: 'unchanged' });
            }
          } else {
            newRecords.push({ record, type: 'new' });
          }
        }
        
        result[category] = {
          new: newRecords,
          updated: updatedRecords,
          unchanged: unchangedRecords,
          total: records.length
        };
        
        // Auto-select all new and updated records
        newRecords.forEach((_, idx) => {
          setSelectedChanges(prev => new Set([...prev, `${category}_new_${idx}`]));
        });
        updatedRecords.forEach((_, idx) => {
          setSelectedChanges(prev => new Set([...prev, `${category}_updated_${idx}`]));
        });
        
      } catch (e) {
        console.error(`Error comparing ${category}:`, e);
        result[category] = {
          new: [],
          updated: [],
          unchanged: [],
          error: e.message
        };
      }
    }
    
    setComparison(result);
    setExpandedCategories(new Set(Object.keys(result)));
    setLoading(false);
  };

  const findChanges = (existing, incoming) => {
    const changes = [];
    const ignoredFields = ['id', 'created_date', 'updated_date', 'created_by'];
    
    for (const key of Object.keys(incoming)) {
      if (ignoredFields.includes(key)) continue;
      
      const oldVal = existing[key];
      const newVal = incoming[key];
      
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        changes.push({ field: key, oldValue: oldVal, newValue: newVal });
      }
    }
    
    return changes;
  };

  const toggleChange = (key) => {
    setSelectedChanges(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const toggleCategory = (category) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const selectAllInCategory = (category, select) => {
    const catData = comparison[category];
    if (!catData) return;
    
    setSelectedChanges(prev => {
      const next = new Set(prev);
      catData.new.forEach((_, idx) => {
        const key = `${category}_new_${idx}`;
        if (select) next.add(key);
        else next.delete(key);
      });
      catData.updated.forEach((_, idx) => {
        const key = `${category}_updated_${idx}`;
        if (select) next.add(key);
        else next.delete(key);
      });
      return next;
    });
  };

  const handleImport = async () => {
    setImporting(true);
    setProgress(0);
    
    const toImport = {};
    let totalItems = 0;
    
    // Collect selected items
    for (const [category, catData] of Object.entries(comparison)) {
      if (catData.error) continue;
      
      toImport[category] = { new: [], updated: [] };
      
      catData.new.forEach((item, idx) => {
        if (selectedChanges.has(`${category}_new_${idx}`)) {
          toImport[category].new.push(item.record);
          totalItems++;
        }
      });
      
      catData.updated.forEach((item, idx) => {
        if (selectedChanges.has(`${category}_updated_${idx}`)) {
          toImport[category].updated.push(item);
          totalItems++;
        }
      });
    }
    
    let processed = 0;
    
    // Process imports
    for (const [category, items] of Object.entries(toImport)) {
      try {
        // Create new records
        for (const record of items.new) {
          const { id, created_date, updated_date, created_by, ...cleanRecord } = record;
          await base44.entities[category].create(cleanRecord);
          processed++;
          setProgress(Math.round((processed / totalItems) * 100));
        }
        
        // Update existing records
        for (const item of items.updated) {
          const { id, created_date, updated_date, created_by, ...cleanRecord } = item.record;
          await base44.entities[category].update(item.record.id, cleanRecord);
          processed++;
          setProgress(Math.round((processed / totalItems) * 100));
        }
      } catch (e) {
        console.error(`Error importing ${category}:`, e);
      }
    }
    
    setImporting(false);
    onConfirmImport?.(toImport);
    onClose();
  };

  const stats = Object.values(comparison).reduce((acc, cat) => {
    if (cat.error) return acc;
    acc.new += cat.new.length;
    acc.updated += cat.updated.length;
    acc.unchanged += cat.unchanged.length;
    return acc;
  }, { new: 0, updated: 0, unchanged: 0 });

  const selectedCount = selectedChanges.size;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0" dir="rtl">
        <DialogHeader className="p-4 border-b bg-gradient-to-l from-green-50 to-white">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <GitCompare className="w-6 h-6 text-green-600" />
              <span>השוואת נתונים לפני ייבוא</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-green-100 text-green-700">
                <Plus className="w-3 h-3 ml-1" />
                {stats.new} חדשים
              </Badge>
              <Badge className="bg-amber-100 text-amber-700">
                <RefreshCw className="w-3 h-3 ml-1" />
                {stats.updated} עדכונים
              </Badge>
              <Badge className="bg-slate-100 text-slate-700">
                {stats.unchanged} ללא שינוי
              </Badge>
            </div>
          </DialogTitle>
        </DialogHeader>

        {importing && (
          <div className="p-4 bg-blue-50 border-b">
            <div className="flex items-center gap-3 mb-2">
              <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
              <span className="font-medium">מייבא נתונים...</span>
              <span className="text-sm text-slate-600">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        <ScrollArea className="flex-1 max-h-[60vh]">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <RefreshCw className="w-8 h-8 animate-spin text-green-500" />
            </div>
          ) : (
            <div className="divide-y">
              {Object.entries(comparison).map(([category, catData]) => (
                <div key={category} className="border-b last:border-0">
                  <button
                    onClick={() => toggleCategory(category)}
                    className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {expandedCategories.has(category) 
                        ? <ChevronUp className="w-5 h-5 text-slate-400" />
                        : <ChevronDown className="w-5 h-5 text-slate-400" />
                      }
                      <span className="font-bold text-slate-900">{category}</span>
                      {catData.error && (
                        <Badge className="bg-red-100 text-red-700">
                          <AlertTriangle className="w-3 h-3 ml-1" />
                          שגיאה
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {catData.new.length > 0 && (
                        <Badge className="bg-green-100 text-green-700">{catData.new.length} חדשים</Badge>
                      )}
                      {catData.updated.length > 0 && (
                        <Badge className="bg-amber-100 text-amber-700">{catData.updated.length} עדכונים</Badge>
                      )}
                    </div>
                  </button>
                  
                  {expandedCategories.has(category) && !catData.error && (
                    <div className="px-4 pb-4">
                      {(catData.new.length > 0 || catData.updated.length > 0) && (
                        <div className="flex items-center gap-2 mb-3">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => selectAllInCategory(category, true)}
                          >
                            בחר הכל
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => selectAllInCategory(category, false)}
                          >
                            נקה
                          </Button>
                        </div>
                      )}
                      
                      {/* New Records */}
                      {catData.new.length > 0 && (
                        <div className="mb-4">
                          <div className="text-sm font-bold text-green-700 mb-2 flex items-center gap-2">
                            <Plus className="w-4 h-4" />
                            רשומות חדשות ({catData.new.length})
                          </div>
                          <div className="space-y-2">
                            {catData.new.slice(0, 10).map((item, idx) => (
                              <label
                                key={idx}
                                className={`
                                  flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all
                                  ${selectedChanges.has(`${category}_new_${idx}`)
                                    ? 'bg-green-50 border-green-200'
                                    : 'bg-white border-slate-200 hover:border-green-200'
                                  }
                                `}
                              >
                                <Checkbox
                                  checked={selectedChanges.has(`${category}_new_${idx}`)}
                                  onCheckedChange={() => toggleChange(`${category}_new_${idx}`)}
                                />
                                <div className="flex-1">
                                  <div className="font-medium text-slate-900 text-sm">
                                    {item.record.name || item.record.title || item.record.id || `רשומה ${idx + 1}`}
                                  </div>
                                  <div className="text-xs text-slate-500 mt-1">
                                    {Object.keys(item.record).filter(k => !k.startsWith('_')).length} שדות
                                  </div>
                                </div>
                                <Badge className="bg-green-100 text-green-700">
                                  <Plus className="w-3 h-3" />
                                </Badge>
                              </label>
                            ))}
                            {catData.new.length > 10 && (
                              <div className="text-center text-sm text-slate-500 py-2">
                                ועוד {catData.new.length - 10} רשומות...
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Updated Records */}
                      {catData.updated.length > 0 && (
                        <div>
                          <div className="text-sm font-bold text-amber-700 mb-2 flex items-center gap-2">
                            <RefreshCw className="w-4 h-4" />
                            רשומות לעדכון ({catData.updated.length})
                          </div>
                          <div className="space-y-2">
                            {catData.updated.slice(0, 10).map((item, idx) => (
                              <label
                                key={idx}
                                className={`
                                  block p-3 rounded-lg border cursor-pointer transition-all
                                  ${selectedChanges.has(`${category}_updated_${idx}`)
                                    ? 'bg-amber-50 border-amber-200'
                                    : 'bg-white border-slate-200 hover:border-amber-200'
                                  }
                                `}
                              >
                                <div className="flex items-center gap-3">
                                  <Checkbox
                                    checked={selectedChanges.has(`${category}_updated_${idx}`)}
                                    onCheckedChange={() => toggleChange(`${category}_updated_${idx}`)}
                                  />
                                  <div className="flex-1">
                                    <div className="font-medium text-slate-900 text-sm">
                                      {item.record.name || item.record.title || item.record.id}
                                    </div>
                                    <div className="text-xs text-slate-500">
                                      {item.changes.length} שדות ישתנו
                                    </div>
                                  </div>
                                  <Badge className="bg-amber-100 text-amber-700">
                                    <RefreshCw className="w-3 h-3" />
                                  </Badge>
                                </div>
                                
                                {/* Show changes */}
                                <div className="mt-2 pr-8 space-y-1">
                                  {item.changes.slice(0, 3).map((change, cIdx) => (
                                    <div key={cIdx} className="flex items-center gap-2 text-xs">
                                      <span className="font-medium text-slate-600">{change.field}:</span>
                                      <span className="text-red-600 line-through max-w-[100px] truncate">
                                        {String(change.oldValue || '-')}
                                      </span>
                                      <ArrowLeft className="w-3 h-3 text-slate-400" />
                                      <span className="text-green-600 max-w-[100px] truncate">
                                        {String(change.newValue || '-')}
                                      </span>
                                    </div>
                                  ))}
                                  {item.changes.length > 3 && (
                                    <div className="text-xs text-slate-400">
                                      +{item.changes.length - 3} שדות נוספים
                                    </div>
                                  )}
                                </div>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {catData.new.length === 0 && catData.updated.length === 0 && (
                        <div className="text-center py-4 text-slate-500 text-sm">
                          <CheckCircle2 className="w-6 h-6 mx-auto mb-2 text-green-500" />
                          כל הנתונים זהים - אין שינויים
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="p-4 border-t bg-slate-50 flex items-center justify-between">
          <div className="text-sm text-slate-600">
            <CheckCircle2 className="w-4 h-4 inline ml-1 text-green-500" />
            {selectedCount} פריטים נבחרו לייבוא
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose} disabled={importing}>
              ביטול
            </Button>
            <Button 
              className="bg-green-600 hover:bg-green-700"
              onClick={handleImport}
              disabled={importing || selectedCount === 0}
            >
              {importing ? (
                <>
                  <RefreshCw className="w-4 h-4 ml-1 animate-spin" />
                  מייבא...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 ml-1" />
                  ייבא {selectedCount} פריטים
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}