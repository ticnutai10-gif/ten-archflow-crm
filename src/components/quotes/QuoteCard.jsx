
import React from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  User, 
  FolderOpen, 
  Calendar,
  MoreVertical,
  Edit,
  Trash2
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { he } from "date-fns/locale";

const statusColors = {
  'נשלחה': 'bg-blue-100 text-blue-800 border-blue-200',
  'בהמתנה': 'bg-amber-100 text-amber-800 border-amber-200',
  'אושרה': 'bg-green-100 text-green-800 border-green-200',
  'נדחתה': 'bg-red-100 text-red-800 border-red-200',
  'פגה תוקף': 'bg-slate-100 text-slate-800 border-slate-200'
};

export default function QuoteCard({ quote, onEdit, onView, onCopy, onDelete, selectionMode, selected, onToggleSelect }) {
  return (
    <Card 
      className="hover:shadow-lg transition-all duration-200 cursor-pointer group bg-white/80 backdrop-blur-sm relative h-full flex flex-col" 
      dir="rtl"
    >
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
                <FileText className="w-5 h-5 text-slate-500" />
                <h3 className="font-bold text-slate-900 text-lg">הצעה #{quote.quote_number}</h3>
            </div>
            <Badge variant="outline" className={statusColors[quote.status]}>
              {quote.status}
            </Badge>
          </div>
          <DropdownMenu>
              <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4"/></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={onEdit}><Edit className="w-4 h-4 ml-2"/>עריכה</DropdownMenuItem>
                  <DropdownMenuItem onClick={onDelete} className="text-red-600"><Trash2 className="w-4 h-4 ml-2"/>מחיקה</DropdownMenuItem>
              </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <FolderOpen className="w-4 h-4" />
          <span className="font-semibold">פרויקט:</span>
          <span className="truncate">{quote.project_name}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <User className="w-4 h-4" />
          <span className="font-semibold">לקוח:</span>
          <span className="truncate">{quote.client_name}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Calendar className="w-4 h-4" />
          <span className="font-semibold">תאריך:</span>
          <span className="truncate">{format(new Date(quote.created_date), 'dd/MM/yyyy', { locale: he })}</span>
        </div>
        <div className="pt-3 border-t border-slate-100 text-left">
            <span className="text-xl font-bold text-slate-800">₪{quote.amount.toLocaleString()}</span>
        </div>
      </CardContent>
    </Card>
  );
}
