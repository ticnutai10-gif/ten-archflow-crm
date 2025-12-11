import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Calendar as CalendarIcon, Clock, Plus, Sparkles } from "lucide-react";
import { format, addDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameDay, isWithinInterval } from "date-fns";
import { he } from "date-fns/locale";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

// Simple calendar component
function MiniCalendar({ selectedDate, onSelectDate, timeLogs }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const getDaysInMonth = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const start = startOfWeek(monthStart, { weekStartsOn: 0 });
    const end = endOfWeek(monthEnd, { weekStartsOn: 0 });
    
    const days = [];
    let current = new Date(start);
    
    while (current <= end) {
      days.push(new Date(current));
      current = addDays(current, 1);
    }
    
    return days;
  };

  const getHoursForDay = (date) => {
    const logsForDay = timeLogs.filter(log => 
      log && log.log_date && isSameDay(new Date(log.log_date), date)
    );
    const totalSeconds = logsForDay.reduce((sum, log) => sum + (log.duration_seconds || 0), 0);
    return totalSeconds / 3600;
  };

  const days = getDaysInMonth();
  const daysOfWeek = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => setCurrentMonth(addDays(currentMonth, -30))}>
          ←
        </Button>
        <h3 className="font-semibold">{format(currentMonth, 'MMMM yyyy', { locale: he })}</h3>
        <Button variant="outline" size="sm" onClick={() => setCurrentMonth(addDays(currentMonth, 30))}>
          →
        </Button>
      </div>
      
      <div className="grid grid-cols-7 gap-1">
        {daysOfWeek.map((day, i) => (
          <div key={i} className="text-center text-xs text-slate-500 font-medium py-1">
            {day}
          </div>
        ))}
        
        {days.map((day, i) => {
          const hours = getHoursForDay(day);
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          const isToday = isSameDay(day, new Date());
          const isOutsideMonth = !isWithinInterval(day, {
            start: startOfMonth(currentMonth),
            end: endOfMonth(currentMonth)
          });
          
          return (
            <button
              key={i}
              onClick={() => onSelectDate(day)}
              className={`
                aspect-square p-1 rounded-lg text-sm transition-all
                ${isSelected ? 'bg-blue-600 text-white ring-2 ring-blue-400' : ''}
                ${isToday && !isSelected ? 'bg-blue-50 text-blue-600 font-bold' : ''}
                ${isOutsideMonth ? 'text-slate-300' : 'text-slate-700 hover:bg-slate-100'}
                ${hours > 0 && !isSelected ? 'font-semibold' : ''}
              `}
            >
              <div>{format(day, 'd')}</div>
              {hours > 0 && !isSelected && (
                <div className="text-[8px] text-blue-600 mt-0.5">
                  {hours.toFixed(1)}ש'
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

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
      const client = clients.find(c => c.id === formData.client_id);
      const currentUser = await base44.auth.me();
      
      await base44.entities.TimeLog.create({
        client_id: formData.client_id,
        client_name: client?.name || '',
        log_date: format(selectedDate, 'yyyy-MM-dd'),
        duration_seconds: totalSeconds,
        title: formData.title || '',
        notes: formData.notes || '',
        created_by: currentUser?.email || 'unknown'
      });

      toast.success('רישום הזמן נוסף בהצלחה');
      onSuccess?.();
      handleClose();
    } catch (error) {
      console.error('Error saving time log:', error);
      toast.error('שגיאה בשמירת רישום הזמן');
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
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        style={{
          animation: 'dialogFadeIn 0.3s ease-out'
        }}
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

            {/* Date */}
            <div>
              <label className="text-sm font-semibold text-slate-700 mb-2 block">תאריך</label>
              <Input
                type="date"
                value={format(selectedDate, 'yyyy-MM-dd')}
                onChange={(e) => setSelectedDate(new Date(e.target.value))}
              />
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
            <MiniCalendar
              selectedDate={selectedDate}
              onSelectDate={(date) => {
                setSelectedDate(date);
                setActiveTab('quick'); // Switch to quick entry after selecting date
              }}
              timeLogs={timeLogs}
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