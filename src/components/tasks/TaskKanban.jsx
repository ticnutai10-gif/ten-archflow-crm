
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreVertical, Edit, Trash2, User, Calendar } from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";

const statusColumns = [
  { key: 'חדשה', title: 'חדשות', color: 'bg-blue-50 border-blue-200' },
  { key: 'בתהליך', title: 'בתהליך', color: 'bg-purple-50 border-purple-200' },
  { key: 'הושלמה', title: 'הושלמו', color: 'bg-green-50 border-green-200' },
  { key: 'דחויה', title: 'דחויות', color: 'bg-slate-50 border-slate-200' }
];

const priorityColors = {
  'גבוהה': 'bg-red-100 text-red-800',
  'בינונית': 'bg-amber-100 text-amber-800',
  'נמוכה': 'bg-green-100 text-green-800'
};

export default function TaskKanban({ tasks, onStatusChange, onEdit, onDelete, isLoading }) {
  const tasksByStatus = statusColumns.reduce((acc, column) => {
    acc[column.key] = tasks.filter(task => task.status === column.key);
    return acc;
  }, {});

  const handleDragStart = (e, taskId) => {
    e.dataTransfer.setData('text/plain', taskId);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, newStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    const task = tasks.find(t => t.id === taskId);
    if (task && task.status !== newStatus) {
      onStatusChange(taskId, newStatus);
    }
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statusColumns.map(column => (
        <Card 
          key={column.key} 
          className={`${column.color} min-h-96 rounded-2xl`}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, column.key)}
        >
          <CardHeader className="pb-3">
            <CardTitle className="text-center flex items-center justify-center gap-2">
              {column.title}
              <Badge variant="secondary" className="rounded-full">
                {tasksByStatus[column.key].length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-right" dir="rtl">
            {tasksByStatus[column.key].map(task => (
              <Card
                key={task.id}
                draggable
                onDragStart={(e) => handleDragStart(e, task.id)}
                className="cursor-move hover:shadow-lg transition-all duration-200 bg-white border-0 rounded-xl"
              >
                <CardContent className="p-4 text-right" dir="rtl">
                  <div className="flex flex-row-reverse justify-between items-start mb-3">
                    <h4 className="font-semibold text-slate-900 flex-1 text-right">{task.title}</h4>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(task)}>
                          <Edit className="w-4 h-4 ml-2" />
                          עריכה
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onDelete(task.id)} className="text-red-600">
                          <Trash2 className="w-4 h-4 ml-2" />
                          מחיקה
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {task.description && (
                    <p className="text-sm text-slate-600 mb-3 line-clamp-2 text-right">{task.description}</p>
                  )}

                  <div className="space-y-2">
                    {task.priority && (
                      <div className="flex justify-end">
                        <Badge variant="secondary" className={`${priorityColors[task.priority]} text-xs`}>
                          {task.priority}
                        </Badge>
                      </div>
                    )}

                    {task.client_name && (
                      <div className="flex items-center gap-1 text-xs text-slate-500 justify-end flex-row-reverse">
                        <span className="truncate text-right">{task.client_name}</span>
                        <User className="w-3 h-3" />
                      </div>
                    )}

                    {task.due_date && (
                      <div className="flex items-center gap-1 text-xs text-slate-500 justify-end flex-row-reverse">
                        <span className="text-right">{format(new Date(task.due_date), 'dd/MM', { locale: he })}</span>
                        <Calendar className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}

            {tasksByStatus[column.key].length === 0 && (
              <div className="text-center py-8 text-slate-400">
                <p className="text-sm">אין משימות</p>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
