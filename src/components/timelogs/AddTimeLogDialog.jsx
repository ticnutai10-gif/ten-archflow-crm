import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Calendar as CalendarIcon, Clock, Plus, Sparkles, Search, Check, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import VisualDatePicker from "@/components/ui/VisualDatePicker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import QuickOptions from "./QuickOptions";

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
  const [dateInputValue, setDateInputValue] = useState(format(new Date(), "dd/MM/yyyy"));
  const [formData, setFormData] = useState({
    client_id: preselectedClient?.id || '',
    hours: '',
    minutes: '',
    title: '',
    notes: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  
  // Client selection state
  const [isClientOpen, setIsClientOpen] = useState(false);
  const [clientSearch, setClientSearch] = useState("");

  // Optimized client filtering
  const filteredClients = React.useMemo(() => {
    if (!clients) return [];
    
    // If search is empty, return first 50 sorted clients for speed
    if (!clientSearch.trim()) {
      return [...clients]
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
        .slice(0, 50);
    }

    const searchLower = clientSearch.toLowerCase();
    return clients
      .filter(c => 
        (c.name || '').toLowerCase().includes(searchLower) ||
        (c.email || '').toLowerCase().includes(searchLower) ||
        (c.phone || '').includes(searchLower)
      )
      .sort((a, b) => {
        // Prioritize exact matches or startsWith on name
        const aName = (a.name || '').toLowerCase();
        const bName = (b.name || '').toLowerCase();
        const aStarts = aName.startsWith(searchLower);
        const bStarts = bName.startsWith(searchLower);
        
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        
        return aName.localeCompare(bName);
      })
      .slice(0, 50); // Limit results for performance
  }, [clients, clientSearch]);

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
    const now = new Date();
    setSelectedDate(now);
    setDateInputValue(format(now, "dd/MM/yyyy"));
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
        className="max-w-3xl w-full max-h-[90vh] overflow-y-auto p-8 shadow-2xl"
      >
        <DialogHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 -m-6 mb-4 p-6 border-b border-blue-100">
          <DialogTitle className="flex items-center gap-3 text-xl text-blue-900">
            <div className="bg-white p-2 rounded-full shadow-sm">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              הוסף רישום זמן
              {selectedClient && (
                <div className="text-sm font-normal text-slate-600 mt-1">
                  עבור: {selectedClient.name}
                </div>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="quick">הזנה מהירה</TabsTrigger>
            <TabsTrigger value="calendar">לוח שנה</TabsTrigger>
          </TabsList>

          <TabsContent value="quick" className="space-y-4 mt-4">
            {/* Client selection (Optimized Combobox) */}
            {!preselectedClient && (
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 block">
                  לקוח <span className="text-red-500">*</span>
                </label>
                <Popover open={isClientOpen} onOpenChange={setIsClientOpen}>
                  <PopoverTrigger 
                    className="flex w-full h-14 items-center justify-between rounded-md border border-slate-200 bg-white px-4 py-2 text-base ring-offset-background placeholder:text-slate-500 hover:border-blue-400 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all shadow-sm"
                  >
                    {formData.client_id
                      ? clients.find((c) => c.id === formData.client_id)?.name
                      : <span className="text-slate-500">בחר לקוח...</span>}
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 bg-white shadow-xl border border-slate-200 z-[200]" align="start">
                    <div className="flex items-center border-b border-slate-100 px-3 py-2 bg-slate-50/50">
                      <Search className="ml-2 h-4 w-4 text-slate-400" />
                      <input
                        className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="חפש לקוח..."
                        value={clientSearch}
                        onChange={(e) => setClientSearch(e.target.value)}
                        autoFocus
                      />
                    </div>
                    <div className="max-h-[300px] overflow-y-auto p-1">
                      {filteredClients.length === 0 ? (
                        <div className="py-6 text-center text-sm text-slate-500">
                          לא נמצאו לקוחות
                        </div>
                      ) : (
                        filteredClients.map((client) => (
                          <div
                            key={client.id}
                            className={`
                              relative flex cursor-pointer select-none items-center rounded-lg px-3 py-2.5 text-sm outline-none transition-colors
                              ${formData.client_id === client.id ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-100 text-slate-700'}
                            `}
                            onClick={() => {
                              setFormData({ ...formData, client_id: client.id });
                              setIsClientOpen(false);
                              setClientSearch(""); // Reset search on select
                            }}
                          >
                            <span className="flex-1 font-medium">{client.name}</span>
                            {formData.client_id === client.id && (
                              <Check className="h-4 w-4 text-blue-600" />
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            )}

            {/* Date with Manual Entry & Visual Picker */}
            <div>
              <label className="text-sm font-semibold text-slate-700 mb-2 block">תאריך</label>
              <div className="flex flex-col gap-2">
                <Input
                  value={dateInputValue}
                  onChange={(e) => {
                    const val = e.target.value;
                    setDateInputValue(val);
                    // Try parse dd/MM/yyyy
                    const parts = val.split('/');
                    if (parts.length === 3) {
                      const d = parseInt(parts[0]);
                      const m = parseInt(parts[1]) - 1;
                      const y = parseInt(parts[2]);
                      const newDate = new Date(y, m, d);
                      if (!isNaN(newDate.getTime()) && newDate.getFullYear() > 2000) {
                        setSelectedDate(newDate);
                      }
                    }
                  }}
                  className="w-full h-12 text-lg text-center tracking-wider"
                  placeholder="DD/MM/YYYY"
                />
                <Popover>
                  <PopoverTrigger className="w-full h-10 flex gap-2 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-600 text-sm font-medium hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                    <CalendarIcon className="h-4 w-4" />
                    <span>בחירה מלוח שנה</span>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-[200]" align="center">
                    <div className="p-2">
                      <VisualDatePicker
                        selectedDate={selectedDate}
                        onSelect={(date) => {
                          setSelectedDate(date);
                          setDateInputValue(format(date, "dd/MM/yyyy"));
                        }}
                      />
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Duration (Swapped order: Hours on Left, Minutes on Right in RTL flow means Minutes first then Hours) */}
            <div>
              <label className="text-sm font-semibold text-slate-700 mb-2 block">
                משך זמן <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-3 justify-center" dir="rtl">
                 {/* Right Side (Start in RTL) - Minutes */}
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
                
                <span className="text-2xl font-bold text-blue-600">:</span>

                {/* Left Side (End in RTL) - Hours */}
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
            <div className="pt-2">
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
                className="h-12"
              />
              <QuickOptions 
                type="title" 
                onSelect={(val) => setFormData(prev => ({ ...prev, title: val }))} 
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700 mb-2 block">הערות</label>
              <Textarea
                placeholder="פרטים נוספים..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="min-h-[100px] text-base"
              />
              <QuickOptions 
                type="notes" 
                onSelect={(val) => setFormData(prev => ({ 
                  ...prev, 
                  notes: prev.notes ? prev.notes + '\n' + val : val 
                }))} 
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