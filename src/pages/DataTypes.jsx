import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Circle, FileText, ArrowLeftRight, ShoppingCart, ArrowRight, Plus, Layers, Loader2, Pencil, Trash2 } from "lucide-react";
import DataTypeManager from "@/components/settings/DataTypeManager";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function DataTypesPage() {
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState(null);
  const [dbTypes, setDbTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");
  const [newTypeDescription, setNewTypeDescription] = useState("");
  const [editingType, setEditingType] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const HARDCODED_TYPES = [
    { key: "stages", label: "שלבים (מואר)", icon: Circle, color: "text-purple-600", bg: "bg-purple-100", description: "ניהול שלבי התקדמות בפרויקטים ולקוחות" },
    { key: "taba", label: "תב״ע", icon: FileText, color: "text-blue-600", bg: "bg-blue-100", description: "ניהול סטטוסים ותהליכי תכנון בניין עיר" },
    { key: "transfer_rights", label: "העברת זכויות", icon: ArrowLeftRight, color: "text-green-600", bg: "bg-green-100", description: "ניהול שלבי העברת זכויות בין גורמים" },
    { key: "purchase_rights", label: "רכישת זכויות", icon: ShoppingCart, color: "text-orange-600", bg: "bg-orange-100", description: "ניהול תהליכי רכישת זכויות בנייה" }
  ];

  const fetchTypes = async () => {
    try {
      setLoading(true);
      console.log("Fetching global data types...");
      const results = await base44.entities.GlobalDataType.list();
      console.log("Fetched types:", results);
      setDbTypes(results);
    } catch (error) {
      console.error("Error fetching data types:", error);
      toast.error("שגיאה בטעינת סוגי נתונים");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTypes();
    
    // Listen for updates
    const handleUpdate = () => {
        console.log("Received global-data-type:updated event, refreshing...");
        fetchTypes();
    };
    window.addEventListener('global-data-type:updated', handleUpdate);
    return () => window.removeEventListener('global-data-type:updated', handleUpdate);
  }, []);

  const handleCreateType = async () => {
    if (!newTypeName.trim()) {
        toast.error("נא להזין שם לסוג הנתונים");
        return;
    }

    try {
        const typeKey = `custom_${Date.now()}`;
        console.log("Creating new type:", { name: newTypeName, key: typeKey });
        
        const newType = await base44.entities.GlobalDataType.create({
            name: newTypeName,
            type_key: typeKey,
            options: [],
        });

        toast.success("סוג נתונים חדש נוצר בהצלחה");
        
        // Dispatch event for other components
        window.dispatchEvent(new CustomEvent('global-data-type:updated', { 
            detail: { typeKey: newType.type_key, options: [] } 
        }));

        setShowAddDialog(false);
        setNewTypeName("");
        setNewTypeDescription("");
        fetchTypes();
    } catch (error) {
        console.error("Error creating type:", error);
        toast.error("שגיאה ביצירת סוג נתונים");
    }
  };

  const handleEditType = async () => {
    if (!editingType || !newTypeName.trim()) return;
    
    try {
        const dbType = dbTypes.find(t => t.type_key === editingType.key);
        if (dbType) {
            await base44.entities.GlobalDataType.update(dbType.id, { name: newTypeName });
            toast.success("סוג הנתונים עודכן בהצלחה");
            window.dispatchEvent(new CustomEvent('global-data-type:updated'));
            fetchTypes();
        }
        setEditingType(null);
        setNewTypeName("");
    } catch (error) {
        console.error("Error updating type:", error);
        toast.error("שגיאה בעדכון סוג נתונים");
    }
  };

  const handleDeleteType = async (typeKey) => {
    try {
        const dbType = dbTypes.find(t => t.type_key === typeKey);
        if (dbType) {
            await base44.entities.GlobalDataType.delete(dbType.id);
            toast.success("סוג הנתונים נמחק בהצלחה");
            window.dispatchEvent(new CustomEvent('global-data-type:updated'));
            fetchTypes();
        }
        setDeleteConfirm(null);
    } catch (error) {
        console.error("Error deleting type:", error);
        toast.error("שגיאה במחיקת סוג נתונים");
    }
  };

  const isCustomType = (typeKey) => {
    return typeKey.startsWith('custom_') || !HARDCODED_TYPES.find(t => t.key === typeKey);
  };

  // Merge hardcoded types with DB types
  // Priority: DB types override hardcoded ones if keys match (though keys shouldn't clash if we use unique ones)
  // Actually, we want to show everything. 
  // Let's map DB types to the UI structure.
  
  const mergedTypes = React.useMemo(() => {
      const dbTypeMap = new Map(dbTypes.map(t => [t.type_key, t]));
      
      // Start with hardcoded to preserve icons/colors if they match
      const combined = [...HARDCODED_TYPES];
      
      // Add DB types that aren't in hardcoded list
      dbTypes.forEach(dbType => {
          const exists = combined.find(t => t.key === dbType.type_key);
          if (!exists) {
              combined.push({
                  key: dbType.type_key,
                  label: dbType.name,
                  icon: Layers, // Default icon
                  color: "text-slate-600",
                  bg: "bg-slate-100",
                  description: "סוג נתונים מותאם אישית"
              });
          }
      });
      
      return combined;
  }, [dbTypes]);

  return (
    <div className="container mx-auto py-8 px-4" dir="rtl">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" onClick={() => navigate(-1)} className="rounded-full h-10 w-10 p-0">
          <ArrowRight className="w-6 h-6" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">ניהול סוגי נתונים</h1>
          <p className="text-slate-500 mt-1">הגדרת קטגוריות, תתי-קטגוריות וצבעים למערכת</p>
        </div>
        <div className="mr-auto">
             {/* Debug info */}
            <span className="text-xs text-slate-400 hidden md:inline-block ml-4">
                {loading ? "טוען..." : `${dbTypes.length} סוגים בבסיס הנתונים`}
            </span>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Add New Type Card */}
            <Card 
                className="cursor-pointer border-dashed border-2 border-slate-300 hover:border-purple-400 hover:bg-purple-50 transition-all flex flex-col items-center justify-center text-center min-h-[200px]"
                onClick={() => setShowAddDialog(true)}
            >
                <div className="p-4 rounded-full bg-slate-100 mb-4">
                    <Plus className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-700">הוסף סוג חדש</h3>
                <p className="text-sm text-slate-500 mt-1">צור סוג נתונים מותאם אישית</p>
            </Card>

            {mergedTypes.map((type) => (
            <Card 
                key={type.key} 
                className="cursor-pointer hover:shadow-lg transition-all hover:border-purple-200 group relative overflow-hidden"
                onClick={() => setSelectedType(type)}
            >
                {/* Edit/Delete buttons on hover */}
                {isCustomType(type.key) && (
                    <div className="absolute top-2 left-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setEditingType(type);
                                setNewTypeName(type.label);
                            }}
                            className="p-2 rounded-lg bg-white/90 hover:bg-blue-50 border border-slate-200 shadow-sm transition-all hover:scale-110"
                            title="עריכה"
                        >
                            <Pencil className="w-4 h-4 text-blue-600" />
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirm(type.key);
                            }}
                            className="p-2 rounded-lg bg-white/90 hover:bg-red-50 border border-slate-200 shadow-sm transition-all hover:scale-110"
                            title="מחיקה"
                        >
                            <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                    </div>
                )}
                
                <CardHeader className="flex flex-row items-center gap-4 pb-2">
                <div className={`p-3 rounded-xl ${type.bg} group-hover:scale-110 transition-transform`}>
                    <type.icon className={`w-8 h-8 ${type.color}`} />
                </div>
                <div className="flex-1">
                    <CardTitle className="text-xl text-slate-800">{type.label}</CardTitle>
                </div>
                </CardHeader>
                <CardContent>
                <CardDescription className="text-base text-slate-600 line-clamp-2">
                    {type.description}
                </CardDescription>
                <div className="mt-4 flex items-center text-sm font-medium text-purple-600 group-hover:translate-x-[-4px] transition-transform">
                    נהל קטגוריות <ArrowRight className="w-4 h-4 mr-1 rotate-180" />
                </div>
                </CardContent>
            </Card>
            ))}
        </div>
      )}

      {selectedType && (
        <DataTypeManager
          open={!!selectedType}
          onClose={() => setSelectedType(null)}
          typeKey={selectedType.key}
          typeName={selectedType.label}
        />
      )}

      {/* Add New Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent dir="rtl">
            <DialogHeader>
                <DialogTitle>הוספת סוג נתונים חדש</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 p-6">
                <div>
                    <label className="text-sm font-medium mb-1 block">שם הסוג (למשל: סטטוס רישוי)</label>
                    <Input 
                        value={newTypeName} 
                        onChange={(e) => setNewTypeName(e.target.value)}
                        placeholder="הכנס שם..."
                    />
                </div>
                <div>
                    <label className="text-sm font-medium mb-1 block">תיאור (אופציונלי)</label>
                    <Input 
                        value={newTypeDescription} 
                        onChange={(e) => setNewTypeDescription(e.target.value)}
                        placeholder="תיאור קצר..."
                    />
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>ביטול</Button>
                <Button onClick={handleCreateType}>צור</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingType} onOpenChange={(open) => !open && setEditingType(null)}>
        <DialogContent dir="rtl">
            <DialogHeader>
                <DialogTitle>עריכת סוג נתונים</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 p-6">
                <div>
                    <label className="text-sm font-medium mb-1 block">שם הסוג</label>
                    <Input 
                        value={newTypeName} 
                        onChange={(e) => setNewTypeName(e.target.value)}
                        placeholder="הכנס שם..."
                    />
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => { setEditingType(null); setNewTypeName(""); }}>ביטול</Button>
                <Button onClick={handleEditType}>שמור</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent dir="rtl">
            <DialogHeader>
                <DialogTitle className="text-red-600">מחיקת סוג נתונים</DialogTitle>
            </DialogHeader>
            <div className="p-6">
                <p className="text-slate-600">האם אתה בטוח שברצונך למחוק סוג נתונים זה?</p>
                <p className="text-sm text-red-500 mt-2">פעולה זו לא ניתנת לביטול!</p>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteConfirm(null)}>ביטול</Button>
                <Button variant="destructive" onClick={() => handleDeleteType(deleteConfirm)}>מחק</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}