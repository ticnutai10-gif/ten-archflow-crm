import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
  Phone,
  Mail,
  Building,
  MapPin,
  Calendar,
  Eye,
  Edit,
  Copy,
  Trash2,
  MoreVertical,
  CheckSquare,
  Square,
  GripVertical,
  Save,
  X
} from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const statusColors = {
  "פוטנציאלי": "bg-amber-100 text-amber-800 border-amber-200",
  "פעיל": "bg-green-100 text-green-800 border-green-200",
  "לא פעיל": "bg-slate-100 text-slate-800 border-slate-200"
};

const iconColor = "#2C3A50";

export default function ClientCard({
  client,
  onEdit,
  onView,
  selectionMode = false,
  selected = false,
  onToggleSelect,
  onCopy,
  onDelete,
  onEnterSelectionMode,
  isDraggable = false,
  dragHandleProps = {}
}) {
  const [editingField, setEditingField] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const cardRef = useRef(null);
  const editInputRef = useRef(null);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!cardRef.current) return;
      
      // Enter = view details
      if (e.key === "Enter" && !editingField) {
        e.preventDefault();
        onView();
      }
      
      // Escape = cancel editing
      if (e.key === "Escape" && editingField) {
        setEditingField(null);
        setEditValue("");
      }
      
      // Ctrl/Cmd + E = edit
      if ((e.ctrlKey || e.metaKey) && e.key === "e" && !editingField) {
        e.preventDefault();
        onEdit();
      }
      
      // Delete key = delete (with confirmation)
      if (e.key === "Delete" && !editingField) {
        e.preventDefault();
        onDelete();
      }
    };

    const card = cardRef.current;
    if (card) {
      card.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      if (card) {
        card.removeEventListener("keydown", handleKeyDown);
      }
    };
  }, [editingField, onView, onEdit, onDelete]);

  // Focus on input when editing
  useEffect(() => {
    if (editingField && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingField]);

  // Inline editing handlers
  const startEditing = (field, currentValue) => {
    setEditingField(field);
    setEditValue(currentValue || "");
  };

  const saveEdit = async () => {
    if (!editingField) return;
    
    setIsSaving(true);
    try {
      const updates = { [editingField]: editValue };
      await base44.entities.Client.update(client.id, updates);
      
      // Update local client object
      Object.assign(client, updates);
      
      toast.success("עודכן בהצלחה");
      setEditingField(null);
    } catch (error) {
      console.error("Error saving edit:", error);
      toast.error("שגיאה בשמירה");
    } finally {
      setIsSaving(false);
    }
  };

  const cancelEdit = () => {
    setEditingField(null);
    setEditValue("");
  };

  // Render editable field
  const renderField = (field, value, icon, placeholder = "") => {
    const isEditing = editingField === field;
    
    if (isEditing) {
      return (
        <div className="flex items-center gap-2 w-full">
          {icon}
          <Input
            ref={editInputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={saveEdit}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveEdit();
              if (e.key === "Escape") cancelEdit();
            }}
            className="h-7 text-sm flex-1"
            disabled={isSaving}
            dir="rtl"
          />
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={saveEdit}
            disabled={isSaving}>
            <Save className="w-3 h-3" style={{ color: iconColor }} />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={cancelEdit}>
            <X className="w-3 h-3 text-red-600" />
          </Button>
        </div>
      );
    }

    return (
      <div
        className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 rounded px-1 py-0.5 transition-colors group/field"
        onDoubleClick={() => startEditing(field, value)}
        title="לחץ פעמיים לעריכה">
        {icon}
        <span className="text-sm flex-1">{value || placeholder}</span>
        <Edit 
          className="w-3 h-3 opacity-0 group-hover/field:opacity-100 transition-opacity" 
          style={{ color: iconColor }} 
        />
      </div>
    );
  };

  return (
    <Card
      ref={cardRef}
      tabIndex={0}
      className={`
        h-full hover:shadow-xl transition-all duration-200 cursor-pointer 
        bg-white/90 backdrop-blur-sm border-2 group relative
        focus:ring-2 focus:ring-blue-500 focus:outline-none
        ${selected ? "border-blue-500 bg-blue-50/50" : "border-slate-200"}
      `}
      onClick={() => !editingField && onView()}>
      
      {/* Drag Handle */}
      {isDraggable && (
        <div
          {...dragHandleProps}
          className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
          onClick={(e) => e.stopPropagation()}>
          <GripVertical className="w-5 h-5 text-slate-400" />
        </div>
      )}

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Selection checkbox */}
            {selectionMode && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSelect();
                }}
                className="mb-2 hover:scale-110 transition-transform">
                {selected ? (
                  <CheckSquare className="w-5 h-5" style={{ color: iconColor }} />
                ) : (
                  <Square className="w-5 h-5 text-slate-400" />
                )}
              </button>
            )}

            {/* Name - editable */}
            {editingField === "name" ? (
              <div className="flex items-center gap-2 mb-2">
                <Input
                  ref={editInputRef}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={saveEdit}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveEdit();
                    if (e.key === "Escape") cancelEdit();
                  }}
                  className="h-8 text-lg font-bold"
                  disabled={isSaving}
                  dir="rtl"
                />
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={saveEdit} disabled={isSaving}>
                  <Save className="w-4 h-4" style={{ color: iconColor }} />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={cancelEdit}>
                  <X className="w-4 h-4 text-red-600" />
                </Button>
              </div>
            ) : (
              <CardTitle
                className="text-xl font-bold mb-2 hover:bg-slate-50 rounded px-1 cursor-pointer transition-colors group/title"
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  startEditing("name", client.name);
                }}
                title="לחץ פעמיים לעריכה">
                {client.name}
                <Edit className="w-4 h-4 inline ml-2 opacity-0 group-hover/title:opacity-100 transition-opacity" style={{ color: iconColor }} />
              </CardTitle>
            )}

            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className={`${statusColors[client.status]} text-xs`}>
                {client.status}
              </Badge>
              {client.budget_range && (
                <Badge variant="outline" className="bg-slate-100 text-slate-700 text-xs">
                  {client.budget_range}
                </Badge>
              )}
            </div>
          </div>

          {/* Quick Actions - appear on hover */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-blue-100"
              onClick={(e) => {
                e.stopPropagation();
                onView();
              }}
              title="צפה בפרטים (Enter)">
              <Eye className="w-4 h-4" style={{ color: iconColor }} />
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-green-100"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              title="ערוך (Ctrl+E)">
              <Edit className="w-4 h-4" style={{ color: iconColor }} />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => e.stopPropagation()}>
                  <MoreVertical className="w-4 h-4" style={{ color: iconColor }} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" dir="rtl">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onView(); }}>
                  <Eye className="w-4 h-4 ml-2" style={{ color: iconColor }} />
                  צפה בפרטים
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                  <Edit className="w-4 h-4 ml-2" style={{ color: iconColor }} />
                  ערוך
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onCopy(); }}>
                  <Copy className="w-4 h-4 ml-2" style={{ color: iconColor }} />
                  שכפל
                </DropdownMenuItem>
                {!selectionMode && onEnterSelectionMode && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEnterSelectionMode(); }}>
                      <CheckSquare className="w-4 h-4 ml-2" style={{ color: iconColor }} />
                      בחר מרובים
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => { e.stopPropagation(); onDelete(); }}
                  className="text-red-600 focus:text-red-700">
                  <Trash2 className="w-4 h-4 ml-2" />
                  מחק (Delete)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-2" onClick={(e) => e.stopPropagation()}>
        {/* Phone - editable */}
        {(client.phone || editingField === "phone") && 
          renderField(
            "phone",
            client.phone,
            <Phone className="w-4 h-4 flex-shrink-0" style={{ color: iconColor }} />,
            "הוסף טלפון"
          )
        }

        {/* Email - editable */}
        {(client.email || editingField === "email") && 
          renderField(
            "email",
            client.email,
            <Mail className="w-4 h-4 flex-shrink-0" style={{ color: iconColor }} />,
            "הוסף אימייל"
          )
        }

        {/* Company - editable */}
        {(client.company || editingField === "company") && 
          renderField(
            "company",
            client.company,
            <Building className="w-4 h-4 flex-shrink-0" style={{ color: iconColor }} />,
            "הוסף חברה"
          )
        }

        {/* Address - editable */}
        {(client.address || editingField === "address") && 
          renderField(
            "address",
            client.address,
            <MapPin className="w-4 h-4 flex-shrink-0" style={{ color: iconColor }} />,
            "הוסף כתובת"
          )
        }

        {/* Created date */}
        {client.created_date && (
          <div className="flex items-center gap-2 text-xs text-slate-500 pt-2 border-t">
            <Calendar className="w-3 h-3" style={{ color: iconColor }} />
            <span>נוצר: {format(new Date(client.created_date), "dd/MM/yyyy", { locale: he })}</span>
          </div>
        )}

        {/* Helper text */}
        <div className="text-xs text-slate-400 text-center pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
          לחץ פעמיים על שדה לעריכה מהירה
        </div>
      </CardContent>
    </Card>
  );
}