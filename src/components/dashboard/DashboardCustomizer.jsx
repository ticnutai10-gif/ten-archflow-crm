import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, Grid, Eye, EyeOff, Maximize2, Minimize2 } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

const CARD_OPTIONS = [
  { id: 'stats', name: 'סטטיסטיקות' },
  { id: 'aiInsights', name: 'תובנות AI' },
  { id: 'projectsOverview', name: 'סקירת פרויקטים' },
  { id: 'recentProjects', name: 'פרויקטים אחרונים' },
  { id: 'recentClients', name: 'לקוחות אחרונים' },
  { id: 'upcomingTasks', name: 'משימות קרובות' },
  { id: 'quoteStatus', name: 'הצעות מחיר' },
  { id: 'timerLogs', name: 'לוגי זמן' },
  { id: 'upcomingMeetings', name: 'פגישות קרובות' }
];

export default function DashboardCustomizer({ open, onClose, visibleCards, onSave }) {
  const [localVisible, setLocalVisible] = useState(visibleCards);

  const toggleCard = (cardId) => {
    setLocalVisible(prev => ({
      ...prev,
      [cardId]: !prev[cardId]
    }));
  };

  const handleSave = () => {
    onSave(localVisible);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            בחר כרטיסים להצגה
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {CARD_OPTIONS.map((card) => (
            <div key={card.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <Label htmlFor={card.id} className="cursor-pointer flex-1">
                {card.name}
              </Label>
              <Switch
                id={card.id}
                checked={localVisible[card.id] !== false}
                onCheckedChange={() => toggleCard(card.id)}
              />
            </div>
          ))}

          <div className="flex justify-end gap-3 pt-4 border-t mt-4">
            <Button variant="outline" onClick={onClose}>
              ביטול
            </Button>
            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
              שמור
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}