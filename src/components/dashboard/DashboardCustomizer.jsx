import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, Grid, Eye, EyeOff, Maximize2, Minimize2 } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

const DEFAULT_CARDS = [
  { id: 'stats', name: 'סטטיסטיקות', visible: true, size: 'full' },
  { id: 'projectsOverview', name: 'סקירת פרויקטים', visible: true, size: 'large' },
  { id: 'recentProjects', name: 'פרויקטים אחרונים', visible: true, size: 'medium' },
  { id: 'upcomingTasks', name: 'משימות קרובות', visible: true, size: 'medium' },
  { id: 'quoteStatus', name: 'סטטוס הצעות מחיר', visible: true, size: 'medium' },
  { id: 'timerLogs', name: 'לוגי זמן', visible: true, size: 'medium' },
  { id: 'reminderManager', name: 'תזכורות', visible: true, size: 'small' },
  { id: 'upcomingMeetings', name: 'פגישות קרובות', visible: true, size: 'medium' }
];

const SIZE_OPTIONS = [
  { value: 'small', label: 'קטן', cols: 'md:col-span-1' },
  { value: 'medium', label: 'בינוני', cols: 'md:col-span-2' },
  { value: 'large', label: 'גדול', cols: 'md:col-span-3' },
  { value: 'full', label: 'מלא', cols: 'md:col-span-4' }
];

export default function DashboardCustomizer({ open, onClose, cards, onSave }) {
  const [localCards, setLocalCards] = useState(cards || DEFAULT_CARDS);

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(localCards);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setLocalCards(items);
  };

  const toggleVisibility = (id) => {
    setLocalCards(prev => 
      prev.map(card => 
        card.id === id ? { ...card, visible: !card.visible } : card
      )
    );
  };

  const changeSize = (id, newSize) => {
    setLocalCards(prev => 
      prev.map(card => 
        card.id === id ? { ...card, size: newSize } : card
      )
    );
  };

  const handleSave = () => {
    onSave(localCards);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            התאמה אישית של הדשבורד
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            גרור כדי לשנות סדר, שנה גודל, והפעל/כבה כרטיסים
          </p>

          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="cards">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="space-y-2 max-h-[400px] overflow-y-auto"
                >
                  {localCards.map((card, index) => (
                    <Draggable key={card.id} draggableId={card.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`bg-white border rounded-lg p-3 ${
                            snapshot.isDragging ? 'shadow-lg' : 'shadow-sm'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <Grid className="w-4 h-4 text-slate-400 cursor-move" />
                              <span className="font-medium text-slate-900">{card.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {card.visible ? (
                                <Eye className="w-4 h-4 text-green-600" />
                              ) : (
                                <EyeOff className="w-4 h-4 text-slate-400" />
                              )}
                              <Switch
                                checked={card.visible}
                                onCheckedChange={() => toggleVisibility(card.id)}
                              />
                            </div>
                          </div>
                          {card.visible && card.id !== 'stats' && (
                            <div className="flex items-center gap-2 pr-7">
                              <Maximize2 className="w-3 h-3 text-slate-400" />
                              <Select 
                                value={card.size || 'medium'} 
                                onValueChange={(value) => changeSize(card.id, value)}
                              >
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {SIZE_OPTIONS.map(opt => (
                                    <SelectItem key={opt.value} value={opt.value}>
                                      {opt.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              ביטול
            </Button>
            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
              שמור שינויים
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}