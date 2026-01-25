import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Users, Plus, Trash2, Mail, Phone, MessageSquare, 
  Search, UserPlus, X, Edit, Save, Loader2
} from "lucide-react";
import { toast } from "sonner";

export default function DistributionListManager({ 
  open, 
  onClose, 
  onSelectList,
  mode = "manage" // "manage" | "select"
}) {
  const [lists, setLists] = useState([]);
  const [clients, setClients] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [editingList, setEditingList] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    type: "mixed",
    members: [],
    channels: { email: true, whatsapp: false, sms: false },
    tags: [],
    active: true
  });

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [listsData, clientsData, teamData] = await Promise.all([
        base44.entities.DistributionList.list(),
        base44.entities.Client.list(),
        base44.entities.TeamMember.list()
      ]);
      setLists(listsData || []);
      setClients(clientsData || []);
      setTeamMembers(teamData?.filter(m => m.active !== false) || []);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("שגיאה בטעינת הנתונים");
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("יש להזין שם לרשימה");
      return;
    }

    setSaving(true);
    try {
      if (editingList) {
        await base44.entities.DistributionList.update(editingList.id, formData);
        toast.success("הרשימה עודכנה בהצלחה");
      } else {
        await base44.entities.DistributionList.create(formData);
        toast.success("הרשימה נוצרה בהצלחה");
      }
      setShowForm(false);
      setEditingList(null);
      resetForm();
      await loadData();
    } catch (error) {
      console.error("Error saving list:", error);
      toast.error("שגיאה בשמירת הרשימה");
    }
    setSaving(false);
  };

  const handleDelete = async (listId) => {
    if (!confirm("האם אתה בטוח שברצונך למחוק את הרשימה?")) return;
    
    try {
      await base44.entities.DistributionList.delete(listId);
      toast.success("הרשימה נמחקה");
      await loadData();
    } catch (error) {
      console.error("Error deleting list:", error);
      toast.error("שגיאה במחיקת הרשימה");
    }
  };

  const handleEdit = (list) => {
    setEditingList(list);
    setFormData({
      name: list.name || "",
      description: list.description || "",
      type: list.type || "mixed",
      members: list.members || [],
      channels: list.channels || { email: true, whatsapp: false, sms: false },
      tags: list.tags || [],
      active: list.active !== false
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      type: "mixed",
      members: [],
      channels: { email: true, whatsapp: false, sms: false },
      tags: [],
      active: true
    });
  };

  const addMember = (person, type) => {
    const exists = formData.members.some(m => m.email === person.email);
    if (exists) {
      toast.error("חבר זה כבר קיים ברשימה");
      return;
    }

    const member = {
      id: person.id,
      name: person.full_name || person.name,
      email: person.email || "",
      phone: person.phone || person.whatsapp || "",
      type
    };

    setFormData(prev => ({
      ...prev,
      members: [...prev.members, member]
    }));
  };

  const removeMember = (index) => {
    setFormData(prev => ({
      ...prev,
      members: prev.members.filter((_, i) => i !== index)
    }));
  };

  const getAvailablePeople = () => {
    const all = [];
    
    if (formData.type === "team" || formData.type === "mixed") {
      teamMembers.forEach(m => {
        if (!formData.members.some(mem => mem.email === m.email)) {
          all.push({ ...m, sourceType: "team" });
        }
      });
    }
    
    if (formData.type === "clients" || formData.type === "mixed") {
      clients.forEach(c => {
        if (!formData.members.some(mem => mem.email === c.email)) {
          all.push({ ...c, sourceType: "client", full_name: c.name });
        }
      });
    }

    if (searchTerm) {
      return all.filter(p => 
        (p.full_name || p.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.email || "").toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return all.slice(0, 20);
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl" dir="rtl">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Users className="w-6 h-6 text-blue-600" />
            {showForm ? (editingList ? "עריכת רשימת תפוצה" : "יצירת רשימת תפוצה חדשה") : "ניהול רשימות תפוצה"}
          </DialogTitle>
        </DialogHeader>

        {!showForm ? (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                <Badge variant="outline">{lists.length} רשימות</Badge>
              </div>
              <Button onClick={() => { resetForm(); setShowForm(true); }} className="gap-2">
                <Plus className="w-4 h-4" />
                רשימה חדשה
              </Button>
            </div>

            {lists.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>אין רשימות תפוצה</p>
                <Button onClick={() => setShowForm(true)} variant="outline" className="mt-4">
                  צור רשימה ראשונה
                </Button>
              </div>
            ) : (
              <div className="grid gap-3">
                {lists.map(list => (
                  <Card 
                    key={list.id} 
                    className={`cursor-pointer hover:shadow-md transition-shadow ${mode === "select" ? "hover:border-blue-400" : ""}`}
                    onClick={() => mode === "select" && onSelectList?.(list)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold">{list.name}</h3>
                            <Badge variant="outline" className="text-xs">
                              {list.type === "team" ? "צוות" : list.type === "clients" ? "לקוחות" : "מעורב"}
                            </Badge>
                            {!list.active && <Badge variant="secondary">לא פעיל</Badge>}
                          </div>
                          {list.description && (
                            <p className="text-sm text-slate-600 mb-2">{list.description}</p>
                          )}
                          <div className="flex items-center gap-4 text-sm text-slate-500">
                            <span className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              {list.members?.length || 0} חברים
                            </span>
                            <div className="flex items-center gap-2">
                              {list.channels?.email && <Mail className="w-4 h-4 text-blue-500" />}
                              {list.channels?.whatsapp && <MessageSquare className="w-4 h-4 text-green-500" />}
                              {list.channels?.sms && <Phone className="w-4 h-4 text-purple-500" />}
                            </div>
                          </div>
                        </div>
                        {mode === "manage" && (
                          <div className="flex gap-2">
                            <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleEdit(list); }}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="text-red-600" onClick={(e) => { e.stopPropagation(); handleDelete(list.id); }}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>שם הרשימה *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="לדוגמה: צוות תכנון"
                />
              </div>
              <div className="space-y-2">
                <Label>סוג הרשימה</Label>
                <Select value={formData.type} onValueChange={(v) => setFormData(prev => ({ ...prev, type: v, members: [] }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="team">צוות בלבד</SelectItem>
                    <SelectItem value="clients">לקוחות בלבד</SelectItem>
                    <SelectItem value="mixed">מעורב</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>תיאור</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="תיאור קצר של הרשימה..."
                rows={2}
              />
            </div>

            {/* Channels */}
            <div className="space-y-2">
              <Label>ערוצי תקשורת</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={formData.channels.email}
                    onCheckedChange={(v) => setFormData(prev => ({ ...prev, channels: { ...prev.channels, email: v } }))}
                  />
                  <Mail className="w-4 h-4 text-blue-500" />
                  <span>מייל</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={formData.channels.whatsapp}
                    onCheckedChange={(v) => setFormData(prev => ({ ...prev, channels: { ...prev.channels, whatsapp: v } }))}
                  />
                  <MessageSquare className="w-4 h-4 text-green-500" />
                  <span>WhatsApp</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={formData.channels.sms}
                    onCheckedChange={(v) => setFormData(prev => ({ ...prev, channels: { ...prev.channels, sms: v } }))}
                  />
                  <Phone className="w-4 h-4 text-purple-500" />
                  <span>SMS</span>
                </label>
              </div>
            </div>

            {/* Members */}
            <div className="space-y-3">
              <Label>חברי הרשימה ({formData.members.length})</Label>
              
              {/* Current Members */}
              {formData.members.length > 0 && (
                <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-lg">
                  {formData.members.map((member, idx) => (
                    <Badge key={idx} variant="secondary" className="pl-1 flex items-center gap-1">
                      <span>{member.name}</span>
                      <button onClick={() => removeMember(idx)} className="hover:text-red-600">
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              {/* Add Members */}
              <div className="border rounded-lg p-3 space-y-3">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="חפש לפי שם או אימייל..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pr-9"
                  />
                </div>
                
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {getAvailablePeople().map((person, idx) => (
                    <button
                      key={idx}
                      onClick={() => addMember(person, person.sourceType)}
                      className="w-full flex items-center justify-between p-2 hover:bg-slate-100 rounded text-right"
                    >
                      <div>
                        <div className="font-medium text-sm">{person.full_name || person.name}</div>
                        <div className="text-xs text-slate-500">{person.email}</div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {person.sourceType === "team" ? "צוות" : "לקוח"}
                      </Badge>
                    </button>
                  ))}
                  {getAvailablePeople().length === 0 && (
                    <p className="text-sm text-slate-500 text-center py-4">אין תוצאות</p>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => { setShowForm(false); setEditingList(null); }}>
                ביטול
              </Button>
              <Button onClick={handleSave} disabled={saving} className="gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {editingList ? "עדכן" : "צור רשימה"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}