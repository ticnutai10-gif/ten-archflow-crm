import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Circle, FileText, ArrowLeftRight, ShoppingCart, ArrowRight, Plus, Layers, Loader2 } from "lucide-react";
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
        
        await base44.entities.GlobalDataType.create({
            name: newTypeName,
            type_key: typeKey,
            options: [], // Empty options initially
            // We can store description in the entity if schema allows, or just ignore it for now as schema doesn't seem to have description field in summary
            // Assuming description is not in schema based on summary, but let's check. 
            // Summary says: type_key, name, options. No description.
            // So we won't save description to DB unless we update schema.
        });

        toast.success("סוג נתונים חדש נוצר בהצלחה");
        setShowAddDialog(false);
        setNewTypeName("");
        setNewTypeDescription("");
        fetchTypes();
    } catch (error) {
        console.error("Error creating type:", error);
        toast.error("שגיאה ביצירת סוג נתונים");
    }
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

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent dir="rtl">
            <DialogHeader>
                <DialogTitle>הוספת סוג נתונים חדש</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div>
                    <label className="text-sm font-medium mb-1 block">שם הסוג (למשל: סטטוס רישוי)</label>
                    <Input 
                        value={newTypeName} 
                        onChange={(e) => setNewTypeName(e.target.value)}
                        placeholder="הכנס שם..."
                    />
                </div>
                {/* Description field is UI only for now as schema support is unclear, but good for UX */}
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
    </div>
  );
}