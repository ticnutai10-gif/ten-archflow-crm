import React, { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Phone, Mail, MapPin, Building, MoreVertical, Edit, Eye, Copy, Trash2, GripVertical, CheckSquare, Square, Circle } from "lucide-react";
import { createPageUrl } from "@/utils";

// Default stage options
const STAGE_OPTIONS = [
  { value: 'ברור_תכן', label: 'ברור תכן', color: '#3b82f6' },
  { value: 'תיק_מידע', label: 'תיק מידע', color: '#8b5cf6' },
  { value: 'היתרים', label: 'היתרים', color: '#f59e0b' },
  { value: 'ביצוע', label: 'ביצוע', color: '#10b981' },
  { value: 'סיום', label: 'סיום', color: '#6b7280' }
];

const STATUS_COLORS = {
  "פוטנציאלי": "bg-amber-100 text-amber-800 border-amber-200",
  "פעיל": "bg-green-100 text-green-800 border-green-200",
  "לא פעיל": "bg-red-100 text-red-800 border-red-200"
};

export default function ClientCard({ 
  client = {}, 
  onEdit, 
  onView, 
  selectionMode = false, 
  selected = false, 
  onToggleSelect, 
  onCopy, 
  onDelete,
  onEnterSelectionMode,
  isDraggable = false,
  dragHandleProps = {}
  }) {
  console.log('[ClientCard] Props received:', { 
    hasOnEdit: typeof onEdit === 'function',
    hasOnView: typeof onView === 'function',
    hasOnToggleSelect: typeof onToggleSelect === 'function',
    clientName: client?.name,
    clientStage: client?.stage
  });
  if (!client) {
    return null;
  }

  if (typeof client !== 'object') {
    return null;
  }

  const clientName = client.name || client.client_name || 'לקוח ללא שם';
  const clientStatus = client.status || 'פוטנציאלי';
  const statusColor = STATUS_COLORS[clientStatus] || STATUS_COLORS["פוטנציאלי"];

  const handleCardClick = (e) => {
    if (selectionMode) {
      e.stopPropagation();
      if (typeof onToggleSelect === 'function') {
        onToggleSelect();
      }
    } else {
      if (typeof onView === 'function') {
        onView();
      }
    }
  };

  const handleLongPress = (e) => {
    if (!selectionMode && typeof onEnterSelectionMode === 'function') {
      e.preventDefault();
      onEnterSelectionMode();
    }
  };

  const handleEditClick = (e) => {
    if (e) e.stopPropagation();
    if (typeof onEdit === 'function') {
      onEdit();
    }
  };

  const handleViewClick = (e) => {
    if (e) e.stopPropagation();
    if (typeof onView === 'function') {
      onView();
    }
  };

  const handleCopyClick = (e) => {
    if (e) e.stopPropagation();
    if (typeof onCopy === 'function') {
      onCopy();
    }
  };

  const handleDeleteClick = (e) => {
    if (e) e.stopPropagation();
    if (typeof onDelete === 'function') {
      onDelete();
    }
  };

  return (
    <Card
      className={`
        bg-white/80 backdrop-blur-sm hover:shadow-lg transition-all cursor-pointer
        ${selected ? 'ring-2 ring-blue-500 shadow-lg' : ''}
        ${selectionMode ? 'hover:ring-2 hover:ring-blue-300' : ''}
      `}
      onClick={handleCardClick}
      onContextMenu={handleLongPress}
    >
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start gap-2">
          {selectionMode && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (typeof onToggleSelect === 'function') {
                  onToggleSelect();
                }
              }}
              className="flex-shrink-0 mt-1"
            >
              {selected ? (
                <CheckSquare className="w-5 h-5 text-blue-600" />
              ) : (
                <Square className="w-5 h-5 text-slate-400" />
              )}
            </button>
          )}

          {isDraggable && !selectionMode && (
            <div {...dragHandleProps} className="flex-shrink-0 cursor-grab active:cursor-grabbing mt-1">
              <GripVertical className="w-5 h-5 text-slate-400 hover:text-slate-600" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-bold text-slate-900 truncate flex items-center gap-2 mb-2">
              {client.stage && (() => {
                const currentStage = STAGE_OPTIONS.find(s => s.value === client.stage);
                if (currentStage) {
                  return (
                    <Circle 
                      className="w-3 h-3 flex-shrink-0 fill-current"
                      style={{ color: currentStage.color }}
                      title={currentStage.label}
                    />
                  );
                }
                return null;
              })()}
              {clientName}
            </CardTitle>
            <Badge variant="outline" className={`${statusColor} text-xs`}>
              {clientStatus}
            </Badge>
          </div>
          
          {!selectionMode && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" dir="rtl">
                <DropdownMenuItem onClick={handleViewClick}>
                  <Eye className="w-4 h-4 ml-2" />
                  צפה בפרטים
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  if (typeof onEdit === 'function') onEdit();
                }}>
                  <Edit className="w-4 h-4 ml-2" />
                  ערוך
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleCopyClick}>
                  <Copy className="w-4 h-4 ml-2" />
                  שכפל
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDeleteClick} className="text-red-600">
                  <Trash2 className="w-4 h-4 ml-2" />
                  מחק
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {client.phone && (
          <div className="flex items-center gap-2 text-slate-600 text-sm">
            <Phone className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{client.phone}</span>
          </div>
        )}
        
        {client.email && (
          <div className="flex items-center gap-2 text-slate-600 text-sm">
            <Mail className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{client.email}</span>
          </div>
        )}
        
        {client.company && (
          <div className="flex items-center gap-2 text-slate-600 text-sm">
            <Building className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{client.company}</span>
          </div>
        )}
        
        {client.address && (
          <div className="flex items-center gap-2 text-slate-600 text-sm">
            <MapPin className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{client.address}</span>
          </div>
        )}
        
        {client.budget_range && (
          <div className="pt-2 border-t">
            <div className="text-xs text-slate-500 mb-1">טווח תקציב</div>
            <div className="font-semibold text-slate-700">{client.budget_range}</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}