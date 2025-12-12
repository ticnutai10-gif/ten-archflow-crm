import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { GripVertical, Eye, EyeOff } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { ScrollArea } from '@/components/ui/scroll-area';

const DEFAULT_CARD_ORDER = [
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

export default function DashboardCustomizer({ open, onClose, visibleCards, cardOrder, onSave }) {
  const [localVisible, setLocalVisible] = useState(visibleCards);
  const [localOrder, setLocalOrder] = useState(cardOrder || DEFAULT_CARD_ORDER);

  const toggleCard = (cardId) => {
    setLocalVisible(prev => ({
      ...prev,
      [cardId]: !prev[cardId]
    }));
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(localOrder);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setLocalOrder(items);
  };

  const handleSave = () => {
    onSave({ visibleCards: localVisible, cardOrder: localOrder });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[85vh]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">
            התאמה אישית של הדשבורד
          </DialogTitle>
          <p className="text-sm text-slate-600 mt-1">
            גרור כדי לשנות סדר • הפעל/כבה כרטיסים
          </p>
        </DialogHeader>

        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="dashboard-cards">
            {(provided) => (
              <ScrollArea className="h-[450px] pr-4">
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="space-y-2"
                >
                  {localOrder.map((card, index) => (
                    <Draggable key={card.id} draggableId={card.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`flex items-center gap-3 p-3 bg-white border-2 rounded-lg transition-all ${
                            snapshot.isDragging 
                              ? 'shadow-xl border-blue-400 scale-105' 
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing">
                            <GripVertical className="w-5 h-5 text-slate-400" />
                          </div>
                          
                          <span className="flex-1 font-medium text-slate-900">
                            {card.name}
                          </span>
                          
                          <div className="flex items-center gap-2">
                            {localVisible[card.id] !== false ? (
                              <Eye className="w-4 h-4 text-green-600" />
                            ) : (
                              <EyeOff className="w-4 h-4 text-slate-400" />
                            )}
                            <Switch
                              checked={localVisible[card.id] !== false}
                              onCheckedChange={() => toggleCard(card.id)}
                            />
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              </ScrollArea>
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
      </DialogContent>
    </Dialog>
  );
}