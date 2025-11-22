import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Phone,
  Mail,
  MapPin,
  Building,
  Edit,
  Eye,
  MoreVertical,
  Copy,
  Trash2,
  Plus
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { createPageUrl } from "@/utils";

// Stage options
const STAGE_OPTIONS = [
  { value: 'ברור_תכן', label: 'ברור תכן', color: '#3b82f6' },
  { value: 'תיק_מידע', label: 'תיק מידע', color: '#8b5cf6' },
  { value: 'היתרים', label: 'היתרים', color: '#f59e0b' },
  { value: 'ביצוע', label: 'ביצוע', color: '#10b981' },
  { value: 'סיום', label: 'סיום', color: '#6b7280' }
];

const statusColors = {
  'פוטנציאלי': 'bg-amber-100 text-amber-800 border-amber-200',
  'פעיל': 'bg-green-100 text-green-800 border-green-200',
  'לא פעיל': 'bg-slate-100 text-slate-800 border-slate-200'
};

// פונקציה משופרת לבדוק אם מספר הטלפון תקין
const isValidPhone = (phone) => {
  if (!phone) return false;
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length < 7) return false;
  
  // בודק שיש לפחות 2 ספרות שונות
  const uniqueDigits = new Set(cleaned.split(''));
  if (uniqueDigits.size < 2) return false;
  
  return true;
};

export default function ClientTable({ 
  clients, 
  onEdit, 
  onView, 
  selectionMode = false, 
  selectedIds = [], 
  onToggleSelect,
  onCopy,
  onDelete,
  onRefresh
}) {
  console.log('[ClientTable] Props received:', { 
    hasOnEdit: typeof onEdit === 'function',
    hasOnView: typeof onView === 'function'
  });

  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
      <Table>
        <TableRow>
          {selectionMode && <TableHead className="w-12"></TableHead>}
          <TableHead className="text-right font-semibold">שם</TableHead>
          <TableHead className="text-right font-semibold">שלב</TableHead>
          <TableHead className="text-right font-semibold">טלפון</TableHead>
          <TableHead className="text-right font-semibold">אימייל</TableHead>
          <TableHead className="text-right font-semibold">חברה</TableHead>
          <TableHead className="text-right font-semibold">כתובת</TableHead>
          <TableHead className="text-right font-semibold">סטטוס</TableHead>
          <TableHead className="text-right font-semibold w-12"></TableHead>
        </TableRow>
        <TableBody>
          {clients.length === 0 ? (
            <TableRow>
              <TableCell colSpan={selectionMode ? 9 : 8} className="text-center py-8 text-slate-500">
                אין לקוחות להצגה
              </TableCell>
            </TableRow>
          ) : (
            clients.map((client) => {
              const hasValidPhone = isValidPhone(client.phone);
              
              return (
                <TableRow 
                  key={client.id} 
                  className="hover:bg-slate-50 cursor-pointer"
                  onClick={() => { if (typeof onView === 'function') onView(client); }}
                >
                  {selectionMode && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.includes(client.id)}
                        onCheckedChange={() => { if (typeof onToggleSelect === 'function') onToggleSelect(client.id); }}
                      />
                    </TableCell>
                  )}
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
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
                      <span className="hover:text-blue-600 transition-colors">
                        {client.name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {client.stage && (() => {
                      const currentStage = STAGE_OPTIONS.find(s => s.value === client.stage);
                      if (currentStage) {
                        return (
                          <Badge variant="outline" style={{ color: currentStage.color, borderColor: currentStage.color }}>
                            {currentStage.label}
                          </Badge>
                        );
                      }
                      return <span className="text-slate-400 text-sm">-</span>;
                    })()}
                  </TableCell>
                  <TableCell>
                    {hasValidPhone ? (
                      <div className="flex items-center gap-2 text-slate-600">
                        <Phone className="w-4 h-4 text-slate-400" />
                        <span>{client.phone}</span>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); if (typeof onEdit === 'function') onEdit(client); }}
                        className="flex items-center gap-2 text-slate-400 hover:text-blue-600 transition-colors group/phone px-2 py-1 rounded hover:bg-blue-50"
                        title="הוסף מספר טלפון"
                      >
                        <div className="flex items-center justify-center w-5 h-5 rounded-full border-2 border-dashed border-slate-300 group-hover/phone:border-blue-600">
                          <Plus className="w-3 h-3" />
                        </div>
                        <span className="text-xs group-hover/phone:text-blue-600">הוסף טלפון</span>
                      </button>
                    )}
                  </TableCell>
                  <TableCell>
                    {client.email && (
                      <div className="flex items-center gap-2 text-slate-600">
                        <Mail className="w-4 h-4 text-slate-400" />
                        <span className="truncate max-w-[200px]">{client.email}</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {client.company && (
                      <div className="flex items-center gap-2 text-slate-600">
                        <Building className="w-4 h-4 text-slate-400" />
                        <span className="truncate max-w-[150px]">{client.company}</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {client.address && (
                      <div className="flex items-center gap-2 text-slate-600">
                        <MapPin className="w-4 h-4 text-slate-400" />
                        <span className="truncate max-w-[150px]">{client.address}</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`${statusColors[client.status]} text-xs`}>
                      {client.status}
                    </Badge>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { if (typeof onView === 'function') onView(client); }}>
                          <Eye className="w-4 h-4 ml-2" />
                          פתח דף לקוח
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          if (typeof onEdit === 'function') onEdit(client);
                        }}>
                          <Edit className="w-4 h-4 ml-2" />
                          ערוך
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { if (typeof onCopy === 'function') onCopy(client); }}>
                          <Copy className="w-4 h-4 ml-2" />
                          העתק
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { if (typeof onDelete === 'function') onDelete(client.id); }} className="text-red-600">
                          <Trash2 className="w-4 h-4 ml-2" />
                          מחק
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}