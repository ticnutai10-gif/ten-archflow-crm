import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Eye, Trash2, Star, Edit2, Plus, Layers, Check } from "lucide-react";
import { toast } from "sonner";

export default function ViewManager({ 
  open, 
  onClose, 
  savedViews = [], 
  activeViewId, 
  currentColumns,
  currentSort,       // { column, direction }
  currentFilters,    // { columnKey: value }
  currentGlobalFilter, // string
  onSaveView,
  onLoadView,
  onDeleteView,
  onSetDefault
}) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingView, setEditingView] = useState(null);
  const [newViewName, setNewViewName] = useState("");
  const [newViewDescription, setNewViewDescription] = useState("");

  const handleCreateView = () => {
    if (!newViewName.trim()) {
      toast.error("נא להזין שם לתצוגה");
      return;
    }

    const viewId = `view_${Date.now()}`;
    const newView = {
    id: viewId,
    name: newViewName.trim(),
    description: newViewDescription.trim(),
    isDefault: savedViews.length === 0,
    sort: currentSort,
    filters: currentFilters,
    globalFilter: currentGlobalFilter,
    columns: currentColumns.map((col, index) => ({
      key: col.key,
      visible: col.visible !== false,
      width: col.width,
      order: index
    })),
    created_at: new Date().toISOString()
    };

    onSaveView(newView);
    setNewViewName("");
    setNewViewDescription("");
    setShowCreateDialog(false);
    toast.success(`✓ תצוגה "${newView.name}" נשמרה בהצלחה`);
  };

  const handleUpdateView = () => {
    if (!editingView || !newViewName.trim()) {
      toast.error("נא להזין שם לתצוגה");
      return;
    }

    const updatedView = {
      ...editingView,
      name: newViewName.trim(),
      description: newViewDescription.trim(),
      sort: currentSort,
      filters: currentFilters,
      globalFilter: currentGlobalFilter,
      columns: currentColumns.map((col, index) => ({
        key: col.key,
        visible: col.visible !== false,
        width: col.width,
        order: index
      }))
    };

    onSaveView(updatedView);
    setEditingView(null);
    setNewViewName("");
    setNewViewDescription("");
    toast.success(`✓ תצוגה "${updatedView.name}" עודכנה`);
  };

  const handleEditClick = (view) => {
    setEditingView(view);
    setNewViewName(view.name);
    setNewViewDescription(view.description || "");
  };

  const handleDelete = (view) => {
    if (!confirm(`האם למחוק את התצוגה "${view.name}"?`)) return;
    onDeleteView(view.id);
    toast.success(`✓ תצוגה "${view.name}" נמחקה`);
  };

  const getVisibleColumnsCount = (view) => {
    return view.columns?.filter(col => col.visible).length || 0;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Layers className="w-6 h-6 text-blue-600" />
              ניהול תצוגות טבלה
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-hidden">
            <div className="mb-4">
              <Button 
                onClick={() => setShowCreateDialog(true)} 
                className="w-full gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                <Plus className="w-4 h-4" />
                שמור תצוגה נוכחית
              </Button>
            </div>

            {savedViews.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-lg border-2 border-dashed border-slate-300">
                <Layers className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                <p className="text-slate-600 font-semibold mb-2">אין תצוגות שמורות</p>
                <p className="text-sm text-slate-500">שמור את סידור העמודות הנוכחי כתצוגה לשימוש עתידי</p>
              </div>
            ) : (
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-3">
                  {savedViews.map((view) => {
                    const isActive = view.id === activeViewId;
                    const visibleCount = getVisibleColumnsCount(view);
                    const totalCount = view.columns?.length || 0;

                    return (
                      <div
                        key={view.id}
                        className={`p-4 rounded-xl border-2 transition-all ${
                          isActive 
                            ? 'border-blue-500 bg-blue-50 shadow-md' 
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-bold text-slate-900">{view.name}</h3>
                              {view.isDefault && (
                                <Badge className="bg-amber-100 text-amber-800 border-amber-300">
                                  <Star className="w-3 h-3 ml-1" />
                                  ברירת מחדל
                                </Badge>
                              )}
                              {isActive && (
                                <Badge className="bg-blue-100 text-blue-800 border-blue-300">
                                  <Check className="w-3 h-3 ml-1" />
                                  פעילה
                                </Badge>
                              )}
                            </div>
                            {view.description && (
                              <p className="text-sm text-slate-600">{view.description}</p>
                            )}
                            <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                              <span>{visibleCount} מתוך {totalCount} עמודות</span>
                              <span>•</span>
                              <span>{new Date(view.created_at).toLocaleDateString('he-IL')}</span>
                            </div>
                          </div>

                          <div className="flex gap-1">
                            {!isActive && (
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => onLoadView(view)}
                                className="h-8 w-8 hover:bg-blue-100"
                                title="טען תצוגה"
                              >
                                <Eye className="w-4 h-4 text-blue-600" />
                              </Button>
                            )}
                            {!view.isDefault && (
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => onSetDefault(view.id)}
                                className="h-8 w-8 hover:bg-amber-100"
                                title="הגדר כברירת מחדל"
                              >
                                <Star className="w-4 h-4 text-amber-600" />
                              </Button>
                            )}
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleEditClick(view)}
                              className="h-8 w-8 hover:bg-purple-100"
                              title="עדכן תצוגה"
                            >
                              <Edit2 className="w-4 h-4 text-purple-600" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDelete(view)}
                              className="h-8 w-8 hover:bg-red-100"
                              title="מחק תצוגה"
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </Button>
                          </div>
                        </div>

                        {/* תצוגה מקדימה של העמודות */}
                        <div className="mt-3 pt-3 border-t border-slate-200">
                          <div className="flex flex-wrap gap-1">
                            {view.columns
                              ?.filter(col => col.visible)
                              .sort((a, b) => a.order - b.order)
                              .slice(0, 10)
                              .map((col) => {
                                const columnInfo = currentColumns.find(c => c.key === col.key);
                                return (
                                  <Badge 
                                    key={col.key} 
                                    variant="outline" 
                                    className="text-xs bg-slate-50"
                                  >
                                    {columnInfo?.title || col.key}
                                  </Badge>
                                );
                              })}
                            {visibleCount > 10 && (
                              <Badge variant="outline" className="text-xs bg-slate-100">
                                +{visibleCount - 10} עוד
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={onClose}>
              סגור
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* דיאלוג יצירה/עריכה */}
      <Dialog open={showCreateDialog || !!editingView} onOpenChange={(open) => {
        if (!open) {
          setShowCreateDialog(false);
          setEditingView(null);
          setNewViewName("");
          setNewViewDescription("");
        }
      }}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>
              {editingView ? "עדכון תצוגה" : "שמירת תצוגה חדשה"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>שם התצוגה *</Label>
              <Input
                placeholder="לדוגמה: תצוגה מקוצרת, עמודות עיקריות..."
                value={newViewName}
                onChange={(e) => setNewViewName(e.target.value)}
                dir="rtl"
              />
            </div>

            <div className="space-y-2">
              <Label>תיאור (אופציונלי)</Label>
              <Textarea
                placeholder="הוסף תיאור לתצוגה..."
                value={newViewDescription}
                onChange={(e) => setNewViewDescription(e.target.value)}
                rows={3}
                dir="rtl"
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <strong>התצוגה תכלול:</strong>
              </p>
              <ul className="text-xs text-blue-700 mt-2 space-y-1 mr-4">
                <li>• סדר העמודות הנוכחי</li>
                <li>• רוחב כל עמודה</li>
                <li>• אילו עמודות מוצגות/מוסתרות</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowCreateDialog(false);
                setEditingView(null);
                setNewViewName("");
                setNewViewDescription("");
              }}
            >
              ביטול
            </Button>
            <Button onClick={editingView ? handleUpdateView : handleCreateView}>
              {editingView ? "עדכן" : "שמור"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}