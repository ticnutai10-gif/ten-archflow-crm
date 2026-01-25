import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreVertical, Edit, Trash2, User, Calendar, Flame, AlertTriangle, GripVertical
 } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { he } from "date-fns/locale";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

const statusColumns = [
  { key: 'חדשה', title: 'חדשות', color: 'bg-blue-50 border-blue-200', headerColor: 'bg-blue-500' },
  { key: 'בתהליך', title: 'בתהליך', color: 'bg-purple-50 border-purple-200', headerColor: 'bg-purple-500' },
  { key: 'הושלמה', title: 'הושלמו', color: 'bg-green-50 border-green-200', headerColor: 'bg-green-500' },
  { key: 'דחויה', title: 'דחויות', color: 'bg-slate-50 border-slate-200', headerColor: 'bg-slate-500' }
];

const priorityColors = {
  'קריטית': 'bg-red-600 text-white animate-pulse',
  'גבוהה': 'bg-orange-100 text-orange-800',
  'בינונית': 'bg-amber-100 text-amber-800',
  'נמוכה': 'bg-green-100 text-green-800'
};

const priorityOrder = { 'קריטית': 0, 'גבוהה': 1, 'בינונית': 2, 'נמוכה': 3 };

export default function TaskKanban({ tasks, onTaskUpdate, onTaskEdit, onTaskDelete, onStatusChange, onEdit, onDelete, isLoading }) {
  // Support both prop naming conventions
  const handleEdit = onTaskEdit || onEdit;
  const handleDelete = onTaskDelete || onDelete;
  const handleStatusChange = onTaskUpdate || onStatusChange;

  const tasksByStatus = statusColumns.reduce((acc, column) => {
    const columnTasks = tasks.filter(task => task.status === column.key);
    // Sort by priority (critical first) then by due date
    columnTasks.sort((a, b) => {
      const priorityDiff = (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2);
      if (priorityDiff !== 0) return priorityDiff;
      if (a.due_date && b.due_date) return new Date(a.due_date) - new Date(b.due_date);
      if (a.due_date) return -1;
      if (b.due_date) return 1;
      return 0;
    });
    acc[column.key] = columnTasks;
    return acc;
  }, {});

  const onDragEnd = (result) => {
    const { destination, source, draggableId } = result;
    
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;
    
    const newStatus = destination.droppableId;
    const task = tasks.find(t => t.id === draggableId);
    
    if (task && task.status !== newStatus) {
      handleStatusChange(task.id, { status: newStatus });
    }
  };

  const getDueDateStatus = (dueDate) => {
    if (!dueDate) return null;
    const days = differenceInDays(new Date(dueDate), new Date());
    if (days < 0) return { text: 'באיחור', color: 'text-red-600 bg-red-50' };
    if (days === 0) return { text: 'היום', color: 'text-orange-600 bg-orange-50' };
    if (days === 1) return { text: 'מחר', color: 'text-amber-600 bg-amber-50' };
    if (days <= 3) return { text: `עוד ${days} ימים`, color: 'text-blue-600 bg-blue-50' };
    return null;
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statusColumns.map(column => (
          <Card key={column.key} className={`${column.color} min-h-96 rounded-2xl`}>
            <CardHeader>
              <CardTitle className="text-center">{column.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Array(3).fill(0).map((_, i) => (
                  <div key={i} className="h-24 bg-white rounded animate-pulse" />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statusColumns.map(column => (
          <div key={column.key} className="flex flex-col">
            {/* Column Header */}
            <div className={`${column.headerColor} text-white rounded-t-xl px-4 py-3 flex items-center justify-between`}>
              <span className="font-semibold">{column.title}</span>
              <Badge variant="secondary" className="bg-white/20 text-white border-0">
                {tasksByStatus[column.key].length}
              </Badge>
            </div>
            
            {/* Droppable Area */}
            <Droppable droppableId={column.key}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`${column.color} min-h-[400px] rounded-b-xl p-3 transition-colors ${
                    snapshot.isDraggingOver ? 'bg-blue-100 ring-2 ring-blue-400' : ''
                  }`}
                >
                  <div className="space-y-3">
                    {tasksByStatus[column.key].map((task, index) => {
                      const dueDateStatus = getDueDateStatus(task.due_date);
                      const isCritical = task.priority === 'קריטית';
                      
                      return (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`bg-white rounded-xl shadow-sm hover:shadow-md transition-all ${
                                snapshot.isDragging ? 'shadow-xl rotate-2 scale-105' : ''
                              } ${isCritical ? 'ring-2 ring-red-500 animate-pulse' : ''}`}
                            >
                              <div className="p-4" dir="rtl">
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing">
                                      <GripVertical className="w-4 h-4 text-slate-400" />
                                    </div>
                                    {isCritical && <Flame className="w-4 h-4 text-red-600" />}
                                  </div>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-6 w-6">
                                        <MoreVertical className="w-4 h-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" dir="rtl">
                                      <DropdownMenuItem onClick={() => handleEdit(task)}>
                                        <Edit className="w-4 h-4 ml-2" />
                                        עריכה
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleDelete(task.id)} className="text-red-600">
                                        <Trash2 className="w-4 h-4 ml-2" />
                                        מחיקה
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>

                                <h4 className="font-semibold text-slate-900 mb-2 text-right">{task.title}</h4>

                                {task.description && (
                                  <p className="text-sm text-slate-600 mb-3 line-clamp-2 text-right">{task.description}</p>
                                )}

                                <div className="flex flex-wrap gap-2 justify-end">
                                  {task.priority && (
                                    <Badge variant="secondary" className={`${priorityColors[task.priority]} text-xs`}>
                                      {task.priority}
                                    </Badge>
                                  )}
                                  
                                  {dueDateStatus && (
                                    <Badge variant="outline" className={`${dueDateStatus.color} text-xs`}>
                                      {dueDateStatus.text}
                                    </Badge>
                                  )}
                                </div>

                                <div className="mt-3 space-y-1">
                                  {task.client_name && (
                                    <div className="flex items-center gap-1 text-xs text-slate-500 justify-end">
                                      <span className="truncate">{task.client_name}</span>
                                      <User className="w-3 h-3" />
                                    </div>
                                  )}

                                  {task.due_date && (
                                    <div className={`flex items-center gap-1 text-xs justify-end ${
                                      dueDateStatus?.text === 'באיחור' ? 'text-red-600 font-semibold' : 'text-slate-500'
                                    }`}>
                                      <span>{format(new Date(task.due_date), 'dd/MM/yyyy', { locale: he })}</span>
                                      <Calendar className="w-3 h-3" />
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                  </div>

                  {tasksByStatus[column.key].length === 0 && (
                    <div className="text-center py-12 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                      <p className="text-sm">גרור משימות לכאן</p>
                    </div>
                  )}
                </div>
              )}
            </Droppable>
          </div>
        ))}
      </div>
    </DragDropContext>
  );
}