import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Settings, Grid, Eye, EyeOff } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

const DEFAULT_CARDS = [
  { id: 'stats', name: 'סטטיסטיקות', visible: true },
  { id: 'projectsOverview', name: 'סקירת פרויקטים', visible: true },
  { id: 'recentProjects', name: 'פרויקטים אחרונים', visible: true },
  { id: 'upcomingTasks', name: 'משימות קרובות', visible: true },
  { id: 'quoteStatus', name: 'סטטוס הצעות מחיר', visible: true },
  { id: 'timerLogs', name: 'לוגי זמן', visible: true },
  { id: 'reminderManager', name: 'תזכורות', visible: true },
  { id: 'upcomingMeetings', name: 'פגישות קרובות', visible: true }
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
            גרור כדי לשנות סדר, הפעל/כבה כדי להציג או להסתיר כרטיסים
          </p>

          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="cards">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="space-y-2"
                >
                  {localCards.map((card, index) => (
                    <Draggable key={card.id} draggableId={card.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`flex items-center justify-between p-3 bg-white border rounded-lg ${
                            snapshot.isDragging ? 'shadow-lg' : 'shadow-sm'
                          }`}
                        >
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