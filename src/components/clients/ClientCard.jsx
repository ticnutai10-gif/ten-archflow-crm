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
import { Phone, Mail, MapPin, Building, MoreVertical, Edit, Eye, Copy, Trash2, GripVertical, CheckSquare, Square } from "lucide-react";

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
  useEffect(() => {
    console.log('🔍 [ClientCard] Received props:', {
      client,
      clientType: typeof client,
      clientKeys: client ? Object.keys(client) : 'null',
      hasName: client?.name !== undefined,
      nameValue: client?.name,
      nameType: typeof client?.name
    });
  }, [client]);

  if (!client) {
    console.error('❌ [ClientCard] Client is null/undefined!');
    return null;
  }

  if (typeof client !== 'object') {
    console.error('❌ [ClientCard] Client is not an object:', client);
    return null;
  }

  let clientName = 'לקוח ללא שם';
  let clientStatus = 'פוטנציאלי';
  
  try {
    clientName = client.name || client.client_name || 'לקוח ללא שם';
    clientStatus = client.status || 'פוטנציאלי';
    
    console.log('✅ [ClientCard] Processed values:', {
      id: client.id,
      clientName,
      clientStatus
    });
  } catch (error) {
    console.error('❌ [ClientCard] Error processing client:', error, client);
    return null;
  }

  const statusColor = STATUS_COLORS[clientStatus] || STATUS_COLORS["פוטנציאלי"];

  const handleCardClick = (e) => {
    if (selectionMode) {
      e.stopPropagation();
      onToggleSelect?.();
    } else {
      onView?.();
    }
  };

  const handleLongPress = (e) => {
    if (!selectionMode && onEnterSelectionMode) {
      e.preventDefault();
      onEnterSelectionMode();
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
                onToggleSelect?.();
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
            <CardTitle className="text-lg font-bold text-slate-900 mb-2 truncate">
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
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onView?.(); }}>
                  <Eye className="w-4 h-4 ml-2" />
                  צפה בפרטים
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit?.(); }}>
                  <Edit className="w-4 h-4 ml-2" />
                  ערוך
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onCopy?.(); }}>
                  <Copy className="w-4 h-4 ml-2" />
                  שכפל
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
                  className="text-red-600"
                >
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