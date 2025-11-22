import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Save, X } from "lucide-react";

export default function ProjectForm({ project, clients, onSubmit, onCancel }) {
  const [formData, setFormData] = useState(project || {
    name: '',
    client_name: '',
    client_id: '',
    type: 'דירת מגורים',
    status: 'הצעת מחיר',
    budget: '',
    estimated_budget: '',
    start_date: '',
    end_date: '',
    location: '',
    area: '',
    description: '',
    priority: 'בינונית',
    progress: 0
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.client_name) return;
    
    setIsSubmitting(true);
    await onSubmit(formData);
    setIsSubmitting(false);
  };

  const updateField = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleClientChange = (clientName) => {
    const selectedClient = clients.find(c => c.name === clientName);
    updateField('client_name', clientName);
    updateField('client_id', selectedClient?.id || '');
  };

  return (
    <Dialog open={true} onOpenChange={() => onCancel()}>
      <DialogContent className="sm:max-w-2xl text-right" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {project ? 'עריכת פרויקט' : 'פרויקט חדש'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium text-slate-700">
                שם הפרויקט <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="הכנס שם פרויקט"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="client" className="text-sm font-medium text-slate-700">
                לקוח <span className="text-red-500">*</span>
              </Label>
              <Select value={formData.client_name} onValueChange={handleClientChange}>
                <SelectTrigger>
                  <SelectValue placeholder="בחר לקוח" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(client => (
                    <SelectItem key={client.id} value={client.name}>{client.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="type" className="text-sm font-medium text-slate-700">סוג פרויקט</Label>
              <Select value={formData.type} onValueChange={(value) => updateField('type', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="דירת מגורים">דירת מגורים</SelectItem>
                  <SelectItem value="בית פרטי">בית פרטי</SelectItem>
                  <SelectItem value="משרדים">משרדים</SelectItem>
                  <SelectItem value="מסחרי">מסחרי</SelectItem>
                  <SelectItem value="ציבורי">ציבורי</SelectItem>
                  <SelectItem value="אחר">אחר</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status" className="text-sm font-medium text-slate-700">סטטוס</Label>
              <Select value={formData.status} onValueChange={(value) => updateField('status', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="הצעת מחיר">הצעת מחיר</SelectItem>
                  <SelectItem value="תכנון">תכנון</SelectItem>
                  <SelectItem value="היתרים">היתרים</SelectItem>
                  <SelectItem value="ביצוע">ביצוע</SelectItem>
                  <SelectItem value="הושלם">הושלם</SelectItem>
                  <SelectItem value="מבוטל">מבוטל</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="budget" className="text-sm font-medium text-slate-700">תקציב</Label>
              <Input
                id="budget"
                type="number"
                value={formData.budget}
                onChange={(e) => updateField('budget', e.target.value ? parseInt(e.target.value) : '')}
                placeholder="תקציב בשקלים"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="area" className="text-sm font-medium text-slate-700">שטח (מ"ר)</Label>
              <Input
                id="area"
                type="number"
                value={formData.area}
                onChange={(e) => updateField('area', e.target.value ? parseFloat(e.target.value) : '')}
                placeholder="שטח במטרים רבועים"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="start_date" className="text-sm font-medium text-slate-700">תאריך התחלה</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => updateField('start_date', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_date" className="text-sm font-medium text-slate-700">תאריך סיום משוער</Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => updateField('end_date', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location" className="text-sm font-medium text-slate-700">מיקום</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => updateField('location', e.target.value)}
              placeholder="כתובת הפרויקט"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium text-slate-700">תיאור</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="תיאור הפרויקט..."
              rows={3}
            />
          </div>

          <DialogFooter className="gap-3">
            <Button type="button" variant="outline" onClick={onCancel}>
              <X className="w-4 h-4 ml-2" />
              ביטול
            </Button>
            <Button type="submit" disabled={isSubmitting || !formData.name || !formData.client_name}>
              <Save className="w-4 h-4 ml-2" />
              {isSubmitting ? 'שומר...' : (project ? 'עדכן' : 'שמור')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}