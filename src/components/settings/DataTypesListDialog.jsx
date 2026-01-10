import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Circle, FileText, ArrowLeftRight, ShoppingCart, ArrowRight, Plus, Layers, Loader2, X, Users, Briefcase, Trash2, AlertCircle } from "lucide-react";
import DataTypeManager from "@/components/settings/DataTypeManager";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export default function DataTypesListDialog({ open, onClose }) {
  const [selectedType, setSelectedType] = useState(null);
  const [dbTypes, setDbTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");
  const [newTypeDescription, setNewTypeDescription] = useState("");
  const [isProfessionalType, setIsProfessionalType] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // סוגי נתונים מובנים במערכת (לא ניתן למחוק)
  const HARDCODED_TYPES = [
    { key: "stages", label: "שלבים (מואר)", icon: Circle, color: "text-purple-600", bg: "bg-purple-100", description: "ניהול שלבי התקדמות בפרויקטים ולקוחות", isSystem: true },
    { key: "taba", label: "תב״ע", icon: FileText, color: "text-blue-600", bg: "bg-blue-100", description: "ניהול סטטוסים ותהליכי תכנון בניין עיר", isSystem: true },
    { key: "transfer_rights", label: "העברת זכויות", icon: ArrowLeftRight, color: "text-green-600", bg: "bg-green-100", description: "ניהול שלבי העברת זכויות בין גורמים", isSystem: true },
    { key: "purchase_rights", label: "רכישת זכויות", icon: ShoppingCart, color: "text-orange-600", bg: "bg-orange-100", description: "ניהול תהליכי רכישת זכויות בנייה", isSystem: true }
  ];

  const fetchTypes = async () => {
    try {
      setLoading(true);
      const results = await base44.entities.GlobalDataType.list();
      
      // Remove duplicates - keep only the latest version of each type_key
      const uniqueTypes = {};
      results.forEach(type => {
        if (!uniqueTypes[type.type_key] || 
            new Date(type.updated_date) > new Date(uniqueTypes[type.type_key].updated_date)) {
          uniqueTypes[type.type_key] = type;
        }
      });
      
      setDbTypes(Object.values(uniqueTypes));
    } catch (error) {
      console.error("Error fetching data types:", error);
      toast.error("שגיאה בטעינת סוגי נתונים");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchTypes();
    }
  }, [open]);

  useEffect(() => {
    const handleUpdate = () => {
      if (open) fetchTypes();
    };
    window.addEventListener('global-data-type:updated', handleUpdate);
    return () => window.removeEventListener('global-data-type:updated', handleUpdate);
  }, [open]);

  const handleCreateType = async () => {
    if (!newTypeName.trim()) {
      toast.error("נא להזין שם לסוג הנתונים");
      return;
    }

    try {
      const typeKey = `custom_${Date.now()}`;
      
      const newType = await base44.entities.GlobalDataType.create({
        name: newTypeName,
        type_key: typeKey,
        options: [],
        is_professional_type: isProfessionalType, // Flag to indicate this is a professional/person type
        description: newTypeDescription
      });

      toast.success("סוג נתונים חדש נוצר בהצלחה");
      
      window.dispatchEvent(new CustomEvent('global-data-type:updated', { 
        detail: { typeKey: newType.type_key, options: [], is_professional_type: isProfessionalType } 
      }));

      setShowAddDialog(false);
      setNewTypeName("");
      setNewTypeDescription("");
      setIsProfessionalType(false);
      fetchTypes();
    } catch (error) {
      console.error("Error creating type:", error);
      toast.error("שגיאה ביצירת סוג נתונים");
    }
  };

  const handleDeleteType = async (typeKey, typeId) => {
    try {
      await base44.entities.GlobalDataType.delete(typeId);
      toast.success("סוג הנתונים נמחק בהצלחה");
      setDeleteConfirm(null);
      fetchTypes();
      
      window.dispatchEvent(new CustomEvent('global-data-type:updated', { 
        detail: { typeKey, deleted: true } 
      }));
    } catch (error) {
      console.error("Error deleting type:", error);
      toast.error("שגיאה במחיקת סוג נתונים");
    }
  };

  // Merge hardcoded types with DB types
  const mergedTypes = React.useMemo(() => {
    const combined = [...HARDCODED_TYPES];
    
    dbTypes.forEach(dbType => {
      const exists = combined.find(t => t.key === dbType.type_key);
      if (!exists) {
        combined.push({
          key: dbType.type_key,
          label: dbType.name,
          icon: dbType.is_professional_type ? Users : Layers,
          color: dbType.is_professional_type ? "text-amber-600" : "text-slate-600",
          bg: dbType.is_professional_type ? "bg-amber-100" : "bg-slate-100",
          description: dbType.description || "סוג נתונים מותאם אישית",
          isSystem: false,
          isProfessional: dbType.is_professional_type,
          entityId: dbType.id
        });
      }
    });
    
    return combined;
  }, [dbTypes]);

  // Filter types by tab
  const filteredTypes = React.useMemo(() => {
    if (activeTab === "all") return mergedTypes;
    if (activeTab === "professionals") return mergedTypes.filter(t => t.isProfessional);
    if (activeTab === "system") return mergedTypes.filter(t => t.isSystem);
    if (activeTab === "custom") return mergedTypes.filter(t => !t.isSystem && !t.isProfessional);
    return mergedTypes;
  }, [mergedTypes, activeTab]);

  const professionalCount = mergedTypes.filter(t => t.isProfessional).length;
  const customCount = mergedTypes.filter(t => !t.isSystem && !t.isProfessional).length;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-5xl max-h-[90vh] flex flex-col p-0 overflow-hidden" dir="rtl">
        <DialogHeader className="p-6 pb-2">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-6 h-6 text-purple-600" />
              ניהול סוגי נתונים
            </DialogTitle>
          </div>
          <DialogDescription className="text-slate-500 mt-1">
            הגדרת קטגוריות, בעלי מקצוע וסוגי נתונים מותאמים אישית למערכת
          </DialogDescription>
        </DialogHeader>

        {/* Tabs for filtering */}
        <div className="px-6 pb-2">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all" className="gap-1">
                <Layers className="w-4 h-4" />
                הכל ({mergedTypes.length})
              </TabsTrigger>
              <TabsTrigger value="professionals" className="gap-1">
                <Users className="w-4 h-4" />
                בעלי מקצוע ({professionalCount})
              </TabsTrigger>
              <TabsTrigger value="system" className="gap-1">
                <Circle className="w-4 h-4" />
                מובנים ({HARDCODED_TYPES.length})
              </TabsTrigger>
              <TabsTrigger value="custom" className="gap-1">
                <Briefcase className="w-4 h-4" />
                מותאמים ({customCount})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex-1 overflow-y-auto p-6 pt-2">
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Add New Type Card */}
              <Card 
                className="cursor-pointer border-dashed border-2 border-slate-300 hover:border-purple-400 hover:bg-purple-50 transition-all flex flex-col items-center justify-center text-center min-h-[180px]"
                onClick={() => setShowAddDialog(true)}
              >
                <div className="p-3 rounded-full bg-slate-100 mb-3">
                  <Plus className="w-6 h-6 text-slate-400" />
                </div>
                <h3 className="text-base font-semibold text-slate-700">הוסף סוג חדש</h3>
                <p className="text-xs text-slate-500 mt-1">צור סוג נתונים או בעל מקצוע חדש</p>
              </Card>

              {filteredTypes.map((type) => (
                <Card 
                  key={type.key} 
                  className="cursor-pointer hover:shadow-lg transition-all hover:border-purple-200 group relative overflow-hidden"
                  onClick={() => setSelectedType(type)}
                >
                  {/* Delete button for custom types */}
                  {!type.isSystem && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="absolute top-2 left-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 hover:bg-red-50 z-10"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirm(type);
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  )}
                  
                  <CardHeader className="flex flex-row items-center gap-3 pb-2 pt-4 px-4">
                    <div className={`p-2 rounded-lg ${type.bg} group-hover:scale-110 transition-transform`}>
                      <type.icon className={`w-5 h-5 ${type.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg text-slate-800 truncate" title={type.label}>
                          {type.label}
                        </CardTitle>
                        {type.isProfessional && (
                          <Badge variant="secondary" className="bg-amber-100 text-amber-700 text-[10px]">
                            בעל מקצוע
                          </Badge>
                        )}
                        {type.isSystem && (
                          <Badge variant="secondary" className="bg-slate-100 text-slate-600 text-[10px]">
                            מובנה
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <CardDescription className="text-xs text-slate-600 line-clamp-2 h-8">
                      {type.description}
                    </CardDescription>
                    <div className="mt-3 flex items-center text-xs font-medium text-purple-600 group-hover:translate-x-[-4px] transition-transform">
                      נהל קטגוריות <ArrowRight className="w-3 h-3 mr-1 rotate-180" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Nested Dialog for managing specific type */}
        {selectedType && (
          <DataTypeManager
            open={!!selectedType}
            onClose={() => setSelectedType(null)}
            typeKey={selectedType.key}
            typeName={selectedType.label}
            isProfessionalType={selectedType.isProfessional}
          />
        )}

        {/* Nested Dialog for creating new type */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent dir="rtl" className="z-[150]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-purple-600" />
                הוספת סוג נתונים חדש
              </DialogTitle>
              <DialogDescription>
                צור סוג נתונים מותאם אישית או הגדר בעל מקצוע חדש
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium mb-1 block">שם הסוג *</label>
                <Input 
                  value={newTypeName} 
                  onChange={(e) => setNewTypeName(e.target.value)}
                  placeholder="לדוגמה: יועץ סניטרי, מודד, קבלן שלד..."
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">תיאור (אופציונלי)</label>
                <Textarea 
                  value={newTypeDescription} 
                  onChange={(e) => setNewTypeDescription(e.target.value)}
                  placeholder="תיאור קצר של סוג הנתונים..."
                  rows={2}
                />
              </div>
              
              {/* Professional Type Toggle */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <Users className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-amber-900">סוג "בעל מקצוע"</h4>
                        <p className="text-xs text-amber-700 mt-1">
                          סמן אם זהו בעל מקצוע (כמו קונסטרוקטור, יועץ, מודד וכו'). 
                          הערך שנבחר יישמר אוטומטית בכרטיס הלקוח.
                        </p>
                      </div>
                      <Switch 
                        checked={isProfessionalType} 
                        onCheckedChange={setIsProfessionalType}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {isProfessionalType && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                  <strong>💡 טיפ:</strong> לאחר יצירת הסוג, תוכל להוסיף את כל בעלי המקצוע (שמות) כקטגוריות.
                  כשתבחר ערך בטבלה, הוא יישמר אוטומטית בלקוח.
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setShowAddDialog(false);
                setNewTypeName("");
                setNewTypeDescription("");
                setIsProfessionalType(false);
              }}>
                ביטול
              </Button>
              <Button onClick={handleCreateType} className="bg-purple-600 hover:bg-purple-700">
                <Plus className="w-4 h-4 ml-2" />
                צור סוג נתונים
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
          <DialogContent dir="rtl" className="z-[150]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <AlertCircle className="w-5 h-5" />
                מחיקת סוג נתונים
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-slate-600">
                האם אתה בטוח שברצונך למחוק את סוג הנתונים <strong>"{deleteConfirm?.label}"</strong>?
              </p>
              <p className="text-sm text-red-600 mt-2">
                ⚠️ פעולה זו בלתי הפיכה! כל הקטגוריות והנתונים שקשורים לסוג זה יימחקו.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
                ביטול
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => handleDeleteType(deleteConfirm.key, deleteConfirm.entityId)}
              >
                <Trash2 className="w-4 h-4 ml-2" />
                מחק לצמיתות
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}