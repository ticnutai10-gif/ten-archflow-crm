import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Save, X } from "lucide-react";
import { StageDisplay } from "@/components/spreadsheets/GenericSpreadsheet";
import { base44 } from "@/api/base44Client";
import { Switch } from "@/components/ui/switch";
import { format } from "date-fns";

const DEFAULT_STAGE_OPTIONS = [
  { value: 'ללא', label: 'ללא', color: '#cbd5e1', glow: 'rgba(203, 213, 225, 0.4)' },
  { value: 'ברור_תכן', label: 'ברור תכן', color: '#3b82f6', glow: 'rgba(59, 130, 246, 0.4)' },
  { value: 'תיק_מידע', label: 'תיק מידע', color: '#8b5cf6', glow: 'rgba(139, 92, 246, 0.4)' },
  { value: 'היתרים', label: 'היתרים', color: '#f59e0b', glow: 'rgba(245, 158, 11, 0.4)' },
  { value: 'ביצוע', label: 'ביצוע', color: '#10b981', glow: 'rgba(16, 185, 129, 0.4)' },
  { value: 'סיום', label: 'סיום', color: '#6b7280', glow: 'rgba(107, 114, 128, 0.4)' }
];

export default function ClientForm({ client, onSubmit, onCancel }) {
  const [formData, setFormData] = useState(client || {
    name: '',
    email: '',
    phone: '',
    phone_secondary: '',
    whatsapp: '',
    website: '',
    linkedin: '',
    position: '',
    preferred_contact: '',
    tags: [],
    address: '',
    company: '',
    budget_range: '',
    source: '',
    status: 'פוטנציאלי',
    stage: '',
    notes: '',
    custom_data: {}
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [customFields, setCustomFields] = useState([]);

  useEffect(() => {
    const loadCustomFields = async () => {
      try {
        const settings = await base44.entities.AppSettings.filter({ setting_key: 'client_custom_fields_schema' });
        if (settings.length > 0 && settings[0].value?.fields) {
          setCustomFields(settings[0].value.fields);
        }
      } catch (error) {
        console.warn('Failed to load custom fields:', error);
      }
    };
    loadCustomFields();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    
    // Validate name field first, ensuring it's not empty after trimming
    const nameValue = formData.name?.trim();
    if (!nameValue) {
      setSubmitError('שם הלקוח הוא שדה חובה');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const cleanData = {};
      Object.keys(formData).forEach(key => {
        let value = formData[key];

        if (typeof value === 'string') {
          value = value.trim(); // Trim all string values
          if (value === '') { // If string becomes empty after trimming, treat as null (will be excluded)
            value = null;
          }
        } else if (Array.isArray(value)) {
          // For arrays (like tags), trim string items and filter out any items that are falsy
          value = value.map(item => typeof item === 'string' ? item.trim() : item).filter(Boolean);
          if (value.length === 0) { // If array becomes empty, treat as null (will be excluded)
            value = null;
          }
        }
        
        // Only include non-null and non-undefined values in the cleanData
        // This ensures "clean data" without empty strings or arrays if they become empty after trimming/filtering
        if (value !== null && value !== undefined) {
          cleanData[key] = value;
        }
      });

      // Ensure 'tags' is always an array, even if it ends up being null/undefined after cleaning (i.e., empty)
      if (!cleanData.tags) {
        cleanData.tags = [];
      }

      console.log('Submitting client data:', cleanData);
      
      await onSubmit(cleanData);
      
    } catch (error) {
      console.error('Error submitting client:', error);
      setSubmitError('שגיאה בשמירת הלקוח: ' + (error.message || 'שגיאה לא ידועה'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateField = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Dialog open={true} onOpenChange={() => !isSubmitting && onCancel()}>
      <DialogContent 
        className="max-w-4xl max-h-[95vh] flex flex-col p-0" 
        dir="rtl" // Ensures overall right-to-left alignment for the entire dialog content
        onPointerDownOutside={(e) => isSubmitting && e.preventDefault()}
        onEscapeKeyDown={(e) => isSubmitting && e.preventDefault()}
      >
        <DialogHeader className="flex-shrink-0 px-6 py-4 border-b">
          <DialogTitle className="text-xl font-bold">
            {client ? 'עריכת לקוח' : 'לקוח חדש'}
          </DialogTitle>
          {submitError && (
            <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
              {submitError}
            </div>
          )}
        </DialogHeader>

        <div className="flex-1 px-6 overflow-y-auto" style={{ maxHeight: 'calc(95vh - 180px)' }}>
          <form onSubmit={handleSubmit} className="space-y-6 py-4">
            {/* מידע בסיסי */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900 border-b pb-2">מידע בסיסי</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium text-slate-700">
                    שם מלא <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={formData.name || ''}
                    onChange={(e) => updateField('name', e.target.value)}
                    placeholder="הכנס שם מלא"
                    required
                    className={!formData.name?.trim() ? 'border-red-300' : ''}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm font-medium text-slate-700">טלפון</Label>
                  <Input
                    id="phone"
                    value={formData.phone || ''}
                    onChange={(e) => updateField('phone', e.target.value)}
                    placeholder="050-1234567"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-slate-700">אימייל</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => updateField('email', e.target.value)}
                    placeholder="example@email.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company" className="text-sm font-medium text-slate-700">חברה</Label>
                  <Input
                    id="company"
                    value={formData.company || ''}
                    onChange={(e) => updateField('company', e.target.value)}
                    placeholder="שם החברה"
                  />
                </div>
              </div>
            </div>

            {/* פרטי התקשרות נוספים */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900 border-b pb-2">פרטי התקשרות</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone_secondary" className="text-sm font-medium text-slate-700">טלפון נוסף</Label>
                  <Input
                    id="phone_secondary"
                    value={formData.phone_secondary || ''}
                    onChange={(e) => updateField('phone_secondary', e.target.value)}
                    placeholder="טלפון משני"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="whatsapp" className="text-sm font-medium text-slate-700">וואטסאפ</Label>
                  <Input
                    id="whatsapp"
                    value={formData.whatsapp || ''}
                    onChange={(e) => updateField('whatsapp', e.target.value)}
                    placeholder="מספר וואטסאפ"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website" className="text-sm font-medium text-slate-700">אתר אינטרנט</Label>
                  <Input
                    id="website"
                    value={formData.website || ''}
                    onChange={(e) => updateField('website', e.target.value)}
                    placeholder="https://example.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="linkedin" className="text-sm font-medium text-slate-700">LinkedIn</Label>
                  <Input
                    id="linkedin"
                    value={formData.linkedin || ''}
                    onChange={(e) => updateField('linkedin', e.target.value)}
                    placeholder="https://linkedin.com/in/..."
                  />
                </div>
              </div>
            </div>

            {/* מידע מקצועי */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900 border-b pb-2">מידע מקצועי</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="position" className="text-sm font-medium text-slate-700">תפקיד</Label>
                  <Input
                    id="position"
                    value={formData.position || ''}
                    onChange={(e) => updateField('position', e.target.value)}
                    placeholder='למשל: מנכ"ל, מנהל רכש'
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="preferred_contact" className="text-sm font-medium text-slate-700">אמצעי התקשרות מועדף</Label>
                  <Select value={formData.preferred_contact || ''} onValueChange={(value) => updateField('preferred_contact', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="בחר אמצעי" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="טלפון">טלפון</SelectItem>
                      <SelectItem value="אימייל">אימייל</SelectItem>
                      <SelectItem value="וואטסאפ">וואטסאפ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="budget_range" className="text-sm font-medium text-slate-700">טווח תקציב</Label>
                  <Select value={formData.budget_range || ''} onValueChange={(value) => updateField('budget_range', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="בחר טווח תקציב" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="עד 500K">עד 500K</SelectItem>
                      <SelectItem value="500K-1M">500K-1M</SelectItem>
                      <SelectItem value="1M-2M">1M-2M</SelectItem>
                      <SelectItem value="2M-5M">2M-5M</SelectItem>
                      <SelectItem value="מעל 5M">מעל 5M</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="source" className="text-sm font-medium text-slate-700">מקור הגעה</Label>
                  <Select value={formData.source || ''} onValueChange={(value) => updateField('source', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="איך הגיע אלינו?" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="הפניה">הפניה</SelectItem>
                      <SelectItem value="אתר אינטרנט">אתר אינטרנט</SelectItem>
                      <SelectItem value="מדיה חברתית">מדיה חברתית</SelectItem>
                      <SelectItem value="פרסומת">פרסומת</SelectItem>
                      <SelectItem value="אחר">אחר</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status" className="text-sm font-medium text-slate-700">סטטוס</Label>
                  <Select value={formData.status || 'פוטנציאלי'} onValueChange={(value) => updateField('status', value)}>
                    <SelectTrigger className="max-w-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="פוטנציאלי">פוטנציאלי</SelectItem>
                      <SelectItem value="פעיל">פעיל</SelectItem>
                      <SelectItem value="לא פעיל">לא פעיל</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">שלב בפרויקט</Label>
                <div className="p-4 border-2 border-slate-200 rounded-lg bg-slate-50/50">
                  <StageDisplay
                    value={formData.stage}
                    options={formData.custom_stage_options || DEFAULT_STAGE_OPTIONS}
                    onChange={(newStage) => updateField('stage', newStage)}
                    isEditing={true}
                    onStartEdit={() => {}}
                    onEndEdit={() => {}}
                  />
                </div>
              </div>
            </div>

            {/* שדות מותאמים אישית */}
            {customFields.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-900 border-b pb-2">פרטים נוספים</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {customFields.map((field) => (
                    <div key={field.key} className="space-y-2">
                      <Label htmlFor={field.key} className="text-sm font-medium text-slate-700">
                        {field.label} {field.required && <span className="text-red-500">*</span>}
                      </Label>
                      
                      {field.type === 'text' && (
                        <Input
                          id={field.key}
                          value={formData.custom_data?.[field.key] || ''}
                          onChange={(e) => updateField('custom_data', { ...formData.custom_data, [field.key]: e.target.value })}
                          required={field.required}
                        />
                      )}

                      {field.type === 'number' && (
                        <Input
                          id={field.key}
                          type="number"
                          value={formData.custom_data?.[field.key] || ''}
                          onChange={(e) => updateField('custom_data', { ...formData.custom_data, [field.key]: e.target.value })}
                          required={field.required}
                        />
                      )}

                      {field.type === 'date' && (
                        <Input
                          id={field.key}
                          type="date"
                          value={formData.custom_data?.[field.key] || ''}
                          onChange={(e) => updateField('custom_data', { ...formData.custom_data, [field.key]: e.target.value })}
                          required={field.required}
                        />
                      )}

                      {field.type === 'boolean' && (
                        <div className="flex items-center gap-2 h-10">
                          <Switch
                            id={field.key}
                            checked={!!formData.custom_data?.[field.key]}
                            onCheckedChange={(checked) => updateField('custom_data', { ...formData.custom_data, [field.key]: checked })}
                          />
                          <span className="text-sm text-slate-600">{formData.custom_data?.[field.key] ? 'כן' : 'לא'}</span>
                        </div>
                      )}

                      {(field.type === 'select') && (
                        <Select 
                          value={formData.custom_data?.[field.key] || ''} 
                          onValueChange={(val) => updateField('custom_data', { ...formData.custom_data, [field.key]: val })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="בחר..." />
                          </SelectTrigger>
                          <SelectContent>
                            {field.options?.map((opt) => (
                              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}

                      {field.type === 'textarea' && (
                        <Textarea
                          id={field.key}
                          value={formData.custom_data?.[field.key] || ''}
                          onChange={(e) => updateField('custom_data', { ...formData.custom_data, [field.key]: e.target.value })}
                          rows={3}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* מידע נוסף */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900 border-b pb-2">הערות ותגיות</h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="tags" className="text-sm font-medium text-slate-700">תגיות</Label>
                  <Input
                    id="tags"
                    value={Array.isArray(formData.tags) ? formData.tags.join(', ') : (formData.tags || '')}
                    onChange={(e) => {
                      const raw = e.target.value;
                      const arr = raw.split(',').map(t => t.trim()).filter(Boolean);
                      updateField('tags', arr);
                    }}
                    placeholder="למשל: VIP, חוזר, קירור"
                  />
                  <div className="text-xs text-slate-500">הפרד בפסיקים</div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address" className="text-sm font-medium text-slate-700">כתובת</Label>
                  <Input
                    id="address"
                    value={formData.address || ''}
                    onChange={(e) => updateField('address', e.target.value)}
                    placeholder="כתובת מלאה"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes" className="text-sm font-medium text-slate-700">הערות</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes || ''}
                    onChange={(e) => updateField('notes', e.target.value)}
                    placeholder="הערות כלליות על הלקוח..."
                    rows={4}
                    className="resize-none"
                  />
                </div>
              </div>
            </div>

            {/* רווח נוסף בתחתית */}
            <div className="h-6"></div>
          </form>
        </div>

        <DialogFooter className="flex-shrink-0 px-6 py-4 border-t bg-slate-50">
          <div className="flex gap-3 w-full">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel}
              disabled={isSubmitting}
              className="flex-1"
            >
              <X className="w-4 h-4 ml-2" />
              ביטול
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={isSubmitting || !formData.name?.trim()}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 ml-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  שומר...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 ml-2" />
                  {client ? 'עדכן לקוח' : 'שמור לקוח'}
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}