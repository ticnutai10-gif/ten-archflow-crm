import React, { useState, startTransition } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { GripVertical, Eye, EyeOff, Sparkles, Save, RotateCcw, ChevronRight } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

const DEFAULT_CARD_ORDER = [
  { id: 'stats', name: 'סטטיסטיקות', icon: '📊', desc: 'מספרים עיקריים על העסק' },
  { id: 'aiInsights', name: 'תובנות AI', icon: '🤖', desc: 'תובנות חכמות מבינה מלאכותית' },
  { id: 'projectsOverview', name: 'סקירת פרויקטים', icon: '🏗️', desc: 'מבט על על כל הפרויקטים' },
  { id: 'recentProjects', name: 'פרויקטים אחרונים', icon: '📁', desc: 'פרויקטים שנוצרו לאחרונה' },
  { id: 'recentClients', name: 'לקוחות אחרונים', icon: '👥', desc: 'לקוחות חדשים במערכת' },
  { id: 'upcomingTasks', name: 'משימות קרובות', icon: '✅', desc: 'משימות שצריך לבצע בקרוב' },
  { id: 'quoteStatus', name: 'הצעות מחיר', icon: '💰', desc: 'סטטוס הצעות מחיר פתוחות' },
  { id: 'timerLogs', name: 'לוגי זמן', icon: '⏱️', desc: 'תיעוד שעות עבודה' },
  { id: 'upcomingMeetings', name: 'פגישות קרובות', icon: '📅', desc: 'פגישות מתוכננות הקרובות' }
];

export default function DashboardCustomizer({ open, onClose, visibleCards, cardOrder, onSave }) {
  const [localVisible, setLocalVisible] = useState(visibleCards);
  const [localOrder, setLocalOrder] = useState(cardOrder || DEFAULT_CARD_ORDER);

  const toggleCard = (cardId) => {
    startTransition(() => {
      setLocalVisible(prev => ({
        ...prev,
        [cardId]: !prev[cardId]
      }));
    });
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    startTransition(() => {
      const items = Array.from(localOrder);
      const [reorderedItem] = items.splice(result.source.index, 1);
      items.splice(result.destination.index, 0, reorderedItem);

      setLocalOrder(items);
    });
  };

  const handleSave = () => {
    onSave({ visibleCards: localVisible, cardOrder: localOrder });
    onClose();
  };

  const resetToDefault = () => {
    if (!confirm('האם לאפס את הדשבורד להגדרות ברירת המחדל?')) return;
    startTransition(() => {
      setLocalOrder(DEFAULT_CARD_ORDER);
      setLocalVisible({
        stats: true,
        aiInsights: true,
        projectsOverview: true,
        recentProjects: true,
        recentClients: true,
        upcomingTasks: true,
        quoteStatus: true,
        timerLogs: true,
        upcomingMeetings: true
      });
    });
  };

  const enabledCount = Object.values(localVisible).filter(Boolean).length;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" dir="rtl">
        {/* Header */}
        <DialogHeader className="pb-4 border-b">
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-2xl font-black text-slate-900 mb-2 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-lg">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                התאמה אישית של הדשבורד
              </DialogTitle>
              <p className="text-sm text-slate-600">
                גרור כדי לשנות סדר • הפעל/כבה כרטיסים
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-4 py-1">
                {enabledCount} / {localOrder.length} פעילים
              </Badge>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={resetToDefault}
                className="gap-2 text-xs h-7"
              >
                <RotateCcw className="w-3 h-3" />
                איפוס
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Info Banner */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-4 flex items-start gap-3">
          <div className="text-2xl">✨</div>
          <div className="flex-1">
            <h4 className="font-bold text-blue-900 mb-1">התאם את הדשבורד בדיוק בשבילך</h4>
            <p className="text-sm text-blue-800">
              גרור כדי לשנות את הסדר, כבה כרטיסים שלא בשימוש, והפוך את הדשבורד ליעיל יותר
            </p>
          </div>
        </div>

        {/* Cards List */}
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="dashboard-cards">
            {(provided, snapshot) => (
              <ScrollArea className="h-[500px] pr-4">
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className={`space-y-3 pb-2 transition-colors ${snapshot.isDraggingOver ? 'bg-blue-50/50 rounded-lg' : ''}`}
                >
                  {localOrder.map((card, index) => {
                    const isVisible = localVisible[card.id] !== false;
                    return (
                      <Draggable key={card.id} draggableId={card.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`
                              relative overflow-hidden flex items-center gap-4 p-4 rounded-xl border-2 
                              transition-all duration-200
                              ${snapshot.isDragging 
                                ? 'shadow-2xl border-blue-500 scale-105 bg-white rotate-2' 
                                : isVisible
                                  ? 'border-slate-200 bg-gradient-to-l from-white to-slate-50 hover:border-blue-300 hover:shadow-lg'
                                  : 'border-slate-100 bg-slate-50 opacity-60'
                              }
                            `}
                          >
                            {/* Drag Handle */}
                            <div 
                              {...provided.dragHandleProps} 
                              className="cursor-grab active:cursor-grabbing hover:bg-slate-100 rounded-lg p-2 transition-colors"
                              title="גרור לשינוי סדר"
                            >
                              <GripVertical className="w-5 h-5 text-slate-400" />
                            </div>
                            
                            {/* Icon */}
                            <div className={`
                              w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-md
                              ${isVisible 
                                ? 'bg-gradient-to-br from-blue-100 to-indigo-100' 
                                : 'bg-slate-200'
                              }
                            `}>
                              {card.icon || '📋'}
                            </div>
                            
                            {/* Card Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-bold text-slate-900 text-base">
                                  {card.name}
                                </h3>
                                {index < 3 && (
                                  <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                                    מומלץ
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-slate-500">
                                {card.desc || 'כרטיס מידע'}
                              </p>
                            </div>
                            
                            {/* Toggle */}
                            <div className="flex items-center gap-3 flex-shrink-0">
                              <div className={`
                                flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium text-xs
                                ${isVisible 
                                  ? 'bg-green-100 text-green-700' 
                                  : 'bg-slate-200 text-slate-500'
                                }
                              `}>
                                {isVisible ? (
                                  <>
                                    <Eye className="w-4 h-4" />
                                    מוצג
                                  </>
                                ) : (
                                  <>
                                    <EyeOff className="w-4 h-4" />
                                    מוסתר
                                  </>
                                )}
                              </div>
                              <Switch
                                checked={isVisible}
                                onCheckedChange={() => toggleCard(card.id)}
                                className="data-[state=checked]:bg-blue-600"
                              />
                            </div>

                            {/* Order Badge */}
                            <div className={`
                              absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center
                              text-xs font-bold shadow-md
                              ${isVisible 
                                ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white' 
                                : 'bg-slate-300 text-slate-600'
                              }
                            `}>
                              {index + 1}
                            </div>

                            {/* Active Indicator */}
                            {isVisible && (
                              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
                            )}
                          </div>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                </div>
              </ScrollArea>
            )}
          </Droppable>
        </DragDropContext>

        {/* Footer */}
        <div className="flex justify-between items-center gap-3 pt-4 border-t bg-slate-50 -mx-6 px-6 -mb-6 pb-6 rounded-b-lg">
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <ChevronRight className="w-4 h-4 text-blue-500" />
            השינויים ישמרו אוטומטית
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="gap-2">
              ביטול
            </Button>
            <Button 
              onClick={handleSave} 
              className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg"
            >
              <Save className="w-4 h-4" />
              שמור שינויים
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}