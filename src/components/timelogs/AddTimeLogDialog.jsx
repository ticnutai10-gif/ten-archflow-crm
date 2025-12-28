import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Calendar as CalendarIcon, Clock, Plus, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import VisualDatePicker from "@/components/ui/VisualDatePicker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export default function AddTimeLogDialog({ 
  open, 
  onClose, 
  preselectedClient = null,
  clients = [],
  timeLogs = [],
  onSuccess 
}) {
  const [activeTab, setActiveTab] = useState('quick');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [formData, setFormData] = useState({
    client_id: preselectedClient?.id || '',
    hours: '',
    minutes: '',
    title: '',
    notes: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  // Update preselected client when it changes
  React.useEffect(() => {
    if (preselectedClient?.id) {
      setFormData(prev => ({ ...prev, client_id: preselectedClient.id }));
    }
  }, [preselectedClient?.id]);

  const handleSave = async () => {
    if (!formData.client_id) {
      toast.error('נא לבחור לקוח');
      return;
    }

    const hours = parseInt(formData.hours || '0', 10);
    const minutes = parseInt(formData.minutes || '0', 10);
    const totalSeconds = (hours * 3600) + (minutes * 60);

    if (totalSeconds <= 0) {
      toast.error('נא להזין זמן גדול מ-0');
      return;
    }

    setIsSaving(true);
    try {
      // בדיקה שהמשתמש מחובר
      const currentUser = await base44.auth.me();
      
      if (!currentUser || !currentUser.email) {
        toast.error('עליך להתחבר למערכת כדי לשמור רישום זמן');
        setIsSaving(false);
        return;
      }

      const client = clients.find(c => c.id === formData.client_id);
      
      const logDate = selectedDate && !isNaN(selectedDate.getTime())
        ? format(selectedDate, 'yyyy-MM-dd')
        : format(new Date(), 'yyyy-MM-dd');

      await base44.entities.TimeLog.create({
        client_id: formData.client_id,
        client_name: client?.name || '',
        log_date: logDate,
        duration_seconds: totalSeconds,
        title: formData.title || '',
        notes: formData.notes || ''
        // created_by יתווסף אוטומטית על ידי המערכת
      });

      toast.success('רישום הזמן נוסף בהצלחה');
      onSuccess?.();
      handleClose();
    } catch (error) {
      console.error('Error saving time log:', error);
      if (error.message?.includes('auth') || error.message?.includes('login')) {
        toast.error('עליך להתחבר למערכת כדי לשמור רישום זמן');
      } else {
        toast.error('שגיאה בשמירת רישום הזמן');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setFormData({
      client_id: preselectedClient?.id || '',
      hours: '',
      minutes: '',
      title: '',
      notes: ''
    });
    setSelectedDate(new Date());
    setActiveTab('quick');
    onClose();
  };

  const generateAISuggestion = async () => {
    if (!formData.client_id) {
      toast.error('נא לבחור לקוח תחילה');
      return;
    }

    setIsGeneratingAI(true);
    try {
      const client = clients.find(c => c.id === formData.client_id);
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `הצע כותרת והערות מקצועיות לרישום זמן עבודה ללקוח "${client?.name}". תן 3 אפשרויות שונות.`,
        response_json_schema: {
          type: "object",
          properties: {
            suggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  notes: { type: "string" }
                }
              }
            }
          }
        }
      });

      if (result.suggestions?.[0]) {
        setFormData(prev => ({
          ...prev,
          title: result.suggestions[0].title,
          notes: result.suggestions[0].notes
        }));
        toast.success('הצעות AI נוצרו');
      }
    } catch (error) {
      console.error('Error generating AI suggestions:', error);
      toast.error('שגיאה ביצירת הצעות');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const selectedClient = clients.find(c => c.id === formData.client_id);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent 
        dir="rtl" 
        className="max-w-2xl max-h-[85vh] overflow-y-auto p-6"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            הוסף רישום זמן
            {selectedClient && (
              <span className="text-sm font-normal text-slate-600">
                • {selectedClient.name}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="quick">הזנה מהירה</TabsTrigger>
            <TabsTrigger value="calendar">לוח שנה</TabsTrigger>
          </TabsList>

          <TabsContent value="quick" className="space-y-4 mt-4">
            {/* Client selection (if not preselected) */}
            {!preselectedClient && (
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-2 block">
                  לקוח <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.client_id}
                  onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                >
                  <option value="">בחר לקוח...</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>{client.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Date with Visual Picker */}
            <div>
              <label className="text-sm font-semibold text-slate-700 mb-2 block">תאריך</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal text-lg h-12"
                  >
                    <CalendarIcon className="ml-2 h-5 w-5 text-slate-500" />
                    {selectedDate ? format(selectedDate, "PPP", { locale: he }) : <span>בחר תאריך</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <div className="p-2">
                    <VisualDatePicker
                      selectedDate={selectedDate}
                      onSelect={(date) => setSelectedDate(date)}
                    />
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Duration */}
            <div>
              <label className="text-sm font-semibold text-slate-700 mb-2 block">
                משך זמן <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-3 justify-center">
                <div className="flex flex-col items-center">
                  <Input
                    value={formData.hours}
                    onChange={(e) => setFormData({ ...formData, hours: e.target.value.replace(/\D/g, '').slice(0, 2) })}
                    className="w-20 h-12 text-center text-lg font-bold"
                    placeholder="00"
                    maxLength={2}
                  />
                  <span className="text-xs text-slate-600 mt-1 font-medium">שעות</span>
                </div>
                <span className="text-2xl font-bold text-blue-600">:</span>
                <div className="flex flex-col items-center">
                  <Input
                    value={formData.minutes}
                    onChange={(e) => setFormData({ ...formData, minutes: e.target.value.replace(/\D/g, '').slice(0, 2) })}
                    className="w-20 h-12 text-center text-lg font-bold"
                    placeholder="00"
                    maxLength={2}
                  />
                  <span className="text-xs text-slate-600 mt-1 font-medium">דקות</span>
                </div>
              </div>
              <div className="flex gap-2 mt-2 justify-center">
                <Button size="sm" variant="outline" onClick={() => setFormData({ ...formData, hours: '1', minutes: '0' })}>
                  1 שעה
                </Button>
                <Button size="sm" variant="outline" onClick={() => setFormData({ ...formData, hours: '2', minutes: '0' })}>
                  2 שעות
                </Button>
                <Button size="sm" variant="outline" onClick={() => setFormData({ ...formData, hours: '0', minutes: '30' })}>
                  30 דק'
                </Button>
              </div>
            </div>

            {/* Title & Notes with AI */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-slate-700">כותרת</label>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={generateAISuggestion}
                  disabled={!formData.client_id || isGeneratingAI}
                  className="text-xs gap-1 h-7 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                >
                  {isGeneratingAI ? (
                    <>טוען...</>
                  ) : (
                    <>
                      <Sparkles className="w-3 h-3" />
                      הצע עם AI
                    </>
                  )}
                </Button>
              </div>
              <Input
                placeholder="למשל: פגישת תכנון, ייעוץ טלפוני..."
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700 mb-2 block">הערות</label>
              <Textarea
                placeholder="פרטים נוספים..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="min-h-[80px]"
              />
            </div>
          </TabsContent>

          <TabsContent value="calendar" className="space-y-4 mt-4">
            <VisualDatePicker
              selectedDate={selectedDate}
              onSelect={(date) => {
                setSelectedDate(date);
                setActiveTab('quick'); // Switch to quick entry after selecting date
              }}
            />
            <div className="bg-blue-50 rounded-lg p-3 text-center text-sm text-blue-800">
              לחץ על יום כדי לבחור תאריך ולעבור למילוי הפרטים
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose}>
            ביטול
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="bg-green-600 hover:bg-green-700">
            {isSaving ? 'שומר...' : (
              <>
                <Plus className="w-4 h-4 ml-2" />
                שמור רישום
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}