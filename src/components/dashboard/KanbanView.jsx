import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Circle, Clock, User } from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";

const STATUSES = [
  { value: 'חדשה', label: 'משימות חדשות', color: '#3b82f6', bg: '#dbeafe' },
  { value: 'בתהליך', label: 'בביצוע', color: '#f59e0b', bg: '#fef3c7' },
  { value: 'הושלמה', label: 'הושלמו', color: '#10b981', bg: '#d1fae5' },
];

export default function KanbanView({ tasks = [], onUpdate }) {
  const [localTasks, setLocalTasks] = React.useState(tasks);

  React.useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);

  const onDragEnd = async (result) => {
    if (!result.destination) return;

    const sourceStatus = result.source.droppableId;
    const destStatus = result.destination.droppableId;

    if (sourceStatus === destStatus) return;

    const taskId = result.draggableId;
    const task = localTasks.find(t => t.id === taskId);

    if (!task) return;

    // Update locally for immediate feedback
    setLocalTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, status: destStatus } : t
    ));

    // Update on server
    try {
      await base44.entities.Task.update(taskId, { status: destStatus });
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error updating task:', error);
      setLocalTasks(tasks);
    }
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STATUSES.map(status => {
          const statusTasks = localTasks.filter(t => t.status === status.value);

          return (
            <div key={status.value} className="flex-shrink-0 w-80">
              <Card style={{ borderColor: status.color + '40', backgroundColor: status.bg }}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Circle className="w-4 h-4 fill-current" style={{ color: status.color }} />
                      {status.label}
                    </CardTitle>
                    <Badge style={{ backgroundColor: status.color, color: 'white' }}>
                      {statusTasks.length}
                    </Badge>
                  </div>
                </CardHeader>
                <Droppable droppableId={status.value}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`min-h-[400px] transition-colors ${snapshot.isDraggingOver ? 'bg-blue-50/50' : ''}`}
                    >
                      <ScrollArea className="h-[500px] px-4">
                        <div className="space-y-3">
                          {statusTasks.map((task, index) => (
                            <Draggable key={task.id} draggableId={task.id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                >
                                  <Card
                                    className={`cursor-grab active:cursor-grabbing hover:shadow-md transition-all ${
                                      snapshot.isDragging ? 'shadow-xl rotate-2 scale-105' : ''
                                    }`}
                                  >
                                    <CardHeader className="pb-2">
                                      <CardTitle className="text-sm">{task.title}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2 text-xs text-slate-600">
                                      {task.description && (
                                        <p className="line-clamp-2">{task.description}</p>
                                      )}
                                      {task.client_name && (
                                        <div className="flex items-center gap-1">
                                          <User className="w-3 h-3" />
                                          {task.client_name}
                                        </div>
                                      )}
                                      {task.due_date && (
                                        <div className="flex items-center gap-1">
                                          <Clock className="w-3 h-3" />
                                          {format(new Date(task.due_date), 'dd/MM/yyyy', { locale: he })}
                                        </div>
                                      )}
                                      {task.priority && (
                                        <Badge variant="outline" className="text-xs">
                                          {task.priority}
                                        </Badge>
                                      )}
                                    </CardContent>
                                  </Card>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      </ScrollArea>
                    </div>
                  )}
                </Droppable>
              </Card>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}