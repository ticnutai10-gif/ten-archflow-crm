import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Trash2, Plus, GripVertical, Save, Edit2, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

const FIELD_TYPES = [
  { value: 'text', label: 'טקסט' },
  { value: 'number', label: 'מספר' },
  { value: 'date', label: 'תאריך' },
  { value: 'boolean', label: 'כן/לא' },
  { value: 'select', label: 'רשימה (בחירה יחידה)' },
  { value: 'multiselect', label: 'רשימה (בחירה מרובה)' },
  { value: 'textarea', label: 'טקסט ארוך' }
];

export default function CustomFieldsEditor() {
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Field Form State
  const [formState, setFormState] = useState({
    key: '',
    label: '',
    type: 'text',
    options: '', // comma separated for UI
    required: false,
    showInTable: true
  });

  useEffect(() => {
    loadFields();
  }, []);

  const loadFields = async () => {
    setLoading(true);
    try {
      const settings = await base44.entities.AppSettings.filter({ setting_key: 'client_custom_fields_schema' });
      if (settings.length > 0 && settings[0].value) {
        setFields(settings[0].value.fields || []);
      }
    } catch (error) {
      console.error('Failed to load custom fields:', error);
      toast.error('שגיאה בטעינת שדות מותאמים');
    } finally {
      setLoading(false);
    }
  };

  const saveFields = async (newFields) => {
    setSaving(true);
    try {
      const settings = await base44.entities.AppSettings.filter({ setting_key: 'client_custom_fields_schema' });
      
      const payload = {
        setting_key: 'client_custom_fields_schema',
        value: { fields: newFields },
        description: 'Schema for client custom fields'
      };

      if (settings.length > 0) {
        await base44.entities.AppSettings.update(settings[0].id, { value: { fields: newFields } });
      } else {
        await base44.entities.AppSettings.create(payload);
      }
      
      setFields(newFields);
      toast.success('הגדרות נשמרו בהצלחה');
      
      // Dispatch event for other components to reload
      window.dispatchEvent(new CustomEvent('custom-fields-updated', { detail: newFields }));
      
    } catch (error) {
      console.error('Failed to save custom fields:', error);
      toast.error('שגיאה בשמירת הגדרות');
    } finally {
      setSaving(false);
    }
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    
    const items = Array.from(fields);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    setFields(items); // Optimistic update
    saveFields(items);
  };

  const handleAddStart = () => {
    setFormState({
      key: '',
      label: '',
      type: 'text',
      options: '',
      required: false,
      showInTable: true
    });
    setEditingField(null);
    setIsDialogOpen(true);
  };

  const handleEditStart = (field) => {
    setFormState({
      ...field,
      options: field.options ? field.options.join(', ') : ''
    });
    setEditingField(field);
    setIsDialogOpen(true);
  };

  const handleSaveField = () => {
    // Validation
    if (!formState.label) {
      toast.error('שם השדה הוא חובה');
      return;
    }
    
    let key = formState.key;
    if (!key && !editingField) {
        // Auto generate key from label if new
        // simple sanitization: english only, snake_case
        // If hebrew, generate random or prompt user
        // For simplicity, let's use timestamp suffix if empty or just label if english
        // Actually, let's require a unique key or generate random one
        key = 'cf_' + Math.random().toString(36).substr(2, 9);
    }

    const newField = {
      ...formState,
      key: key || editingField.key,
      options: (formState.type === 'select' || formState.type === 'multiselect') 
        ? formState.options.split(',').map(s => s.trim()).filter(Boolean)
        : []
    };

    let newFields;
    if (editingField) {
      newFields = fields.map(f => f.key === editingField.key ? newField : f);
    } else {
      newFields = [...fields, newField];
    }

    saveFields(newFields);
    setIsDialogOpen(false);
  };

  const handleDeleteField = (key) => {
    if (!confirm('האם אתה בטוח? הנתונים הקיימים בשדה זה לא יימחקו מהלקוחות, אך השדה לא יופיע יותר בטופס.')) return;
    const newFields = fields.filter(f => f.key !== key);
    saveFields(newFields);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>שדות מותאמים אישית ללקוחות</CardTitle>
            <CardDescription>
              הגדר שדות נוספים שיופיעו בטופס הלקוח
            </CardDescription>
          </div>
          <Button onClick={handleAddStart} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 ml-2" />
            הוסף שדה חדש
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-slate-500">טוען...</div>
          ) : fields.length === 0 ? (
            <div className="text-center py-8 bg-slate-50 rounded-lg border border-dashed">
              <p className="text-slate-500 mb-2">אין שדות מוגדרים</p>
              <Button variant="link" onClick={handleAddStart}>צור את השדה הראשון</Button>
            </div>
          ) : (
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="fields">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                    {fields.map((field, index) => (
                      <Draggable key={field.key} draggableId={field.key} index={index}>
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className="flex items-center gap-4 p-3 bg-white border rounded-lg hover:shadow-sm transition-shadow group"
                          >
                            <div {...provided.dragHandleProps} className="text-slate-400 hover:text-slate-600 cursor-grab">
                              <GripVertical className="w-5 h-5" />
                            </div>
                            
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-slate-900">{field.label}</span>
                                <span className="text-xs px-2 py-0.5 bg-slate-100 rounded-full text-slate-600">
                                  {FIELD_TYPES.find(t => t.value === field.type)?.label || field.type}
                                </span>
                                {field.required && (
                                  <span className="text-xs px-2 py-0.5 bg-red-50 text-red-600 rounded-full">חובה</span>
                                )}
                              </div>
                              <div className="text-xs text-slate-500 mt-1 font-mono">
                                {field.key}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button variant="ghost" size="sm" onClick={() => handleEditStart(field)}>
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600" onClick={() => handleDeleteField(field.key)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          )}
        </CardContent>
      </Card>

      {/* Edit/Add Dialog - Inline implementation for simplicity */}
      {isDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg bg-white shadow-xl animate-in fade-in zoom-in-95 duration-200">
            <CardHeader className="border-b pb-4">
              <div className="flex items-center justify-between">
                <CardTitle>{editingField ? 'עריכת שדה' : 'שדה חדש'}</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setIsDialogOpen(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>שם השדה (תווית)</Label>
                  <Input 
                    value={formState.label} 
                    onChange={e => setFormState(prev => ({ ...prev, label: e.target.value }))}
                    placeholder="למשל: תאריך לידה"
                  />
                </div>
                <div className="space-y-2">
                  <Label>סוג שדה</Label>
                  <Select 
                    value={formState.type} 
                    onValueChange={val => setFormState(prev => ({ ...prev, type: val }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FIELD_TYPES.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {(formState.type === 'select' || formState.type === 'multiselect') && (
                <div className="space-y-2">
                  <Label>אפשרויות (מופרדות בפסיקים)</Label>
                  <Input 
                    value={formState.options} 
                    onChange={e => setFormState(prev => ({ ...prev, options: e.target.value }))}
                    placeholder="אדום, כחול, ירוק"
                  />
                </div>
              )}

              <div className="flex items-center gap-8 pt-2">
                <div className="flex items-center gap-2">
                  <Switch 
                    checked={formState.required}
                    onCheckedChange={checked => setFormState(prev => ({ ...prev, required: checked }))}
                  />
                  <Label>שדה חובה</Label>
                </div>
                {/* 
                <div className="flex items-center gap-2">
                  <Switch 
                    checked={formState.showInTable}
                    onCheckedChange={checked => setFormState(prev => ({ ...prev, showInTable: checked }))}
                  />
                  <Label>הצג בטבלה</Label>
                </div> 
                */}
              </div>

              <div className="pt-4 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>ביטול</Button>
                <Button onClick={handleSaveField} disabled={!formState.label}>שמור</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}