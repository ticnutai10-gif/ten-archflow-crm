import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Mail, MessageSquare, Plus, Edit2, Trash2, Save } from 'lucide-react';
import { toast } from 'sonner';

export default function MessageTemplatesManager() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  
  const [formData, setFormData] = useState({
    name: "",
    type: "email",
    subject: "",
    content: ""
  });

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.MessageTemplate.list('-updated_date');
      setTemplates(data || []);
    } catch (error) {
      console.error('Error loading templates:', error);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.content) {
      toast.error('נא למלא שדות חובה');
      return;
    }

    try {
      if (editingTemplate) {
        await base44.entities.MessageTemplate.update(editingTemplate.id, formData);
        toast.success('התבנית עודכנה');
      } else {
        await base44.entities.MessageTemplate.create(formData);
        toast.success('תבנית חדשה נוצרה');
      }
      setShowDialog(false);
      loadTemplates();
    } catch (error) {
      toast.error('שגיאה בשמירה');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('למחוק תבנית זו?')) return;
    try {
      await base44.entities.MessageTemplate.delete(id);
      loadTemplates();
      toast.success('התבנית נמחקה');
    } catch (error) {
      toast.error('שגיאה במחיקה');
    }
  };

  const openNew = () => {
    setEditingTemplate(null);
    setFormData({ name: "", type: "email", subject: "", content: "" });
    setShowDialog(true);
  };

  const openEdit = (tpl) => {
    setEditingTemplate(tpl);
    setFormData({ 
      name: tpl.name, 
      type: tpl.type, 
      subject: tpl.subject || "", 
      content: tpl.content 
    });
    setShowDialog(true);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>תבניות הודעה</CardTitle>
        <Button onClick={openNew} size="sm">
          <Plus className="w-4 h-4 ml-2" />
          תבנית חדשה
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div>טוען...</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {templates.map(tpl => (
              <Card key={tpl.id} className="border hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      {tpl.type === 'email' ? <Mail className="w-4 h-4 text-blue-500" /> : <MessageSquare className="w-4 h-4 text-green-500" />}
                      <span className="font-semibold">{tpl.name}</span>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEdit(tpl)}>
                        <Edit2 className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={() => handleDelete(tpl.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  {tpl.subject && (
                    <div className="text-sm text-slate-500 mb-1 truncate">נושא: {tpl.subject}</div>
                  )}
                  <div className="text-xs text-slate-400 line-clamp-3 bg-slate-50 p-2 rounded">
                    {tpl.content}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? 'עריכת תבנית' : 'תבנית חדשה'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-1 block">שם התבנית</label>
              <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">סוג</label>
              <Select value={formData.type} onValueChange={v => setFormData({...formData, type: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">אימייל</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formData.type === 'email' && (
              <div>
                <label className="text-sm font-medium mb-1 block">נושא</label>
                <Input value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})} />
              </div>
            )}
            <div>
              <label className="text-sm font-medium mb-1 block">תוכן ההודעה</label>
              <Textarea 
                value={formData.content} 
                onChange={e => setFormData({...formData, content: e.target.value})} 
                rows={6}
              />
              <p className="text-xs text-slate-500 mt-1">
                ניתן להשתמש במשתנים: {"{{client_name}}, {{project_name}}, {{status}}"} וכו'
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>ביטול</Button>
            <Button onClick={handleSave}>
              <Save className="w-4 h-4 ml-2" />
              שמור
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}