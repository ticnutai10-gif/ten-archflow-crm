import React, { useEffect } from 'react';
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

const STATUS_COLORS = {
  'נשלחה': 'bg-blue-100 text-blue-800 border-blue-200',
  'בהמתנה': 'bg-amber-100 text-amber-800 border-amber-200',
  'אושרה': 'bg-green-100 text-green-800 border-green-200',
  'נדחתה': 'bg-red-100 text-red-800 border-red-200',
  'פגה תוקף': 'bg-slate-100 text-slate-800 border-slate-200'
};

export default function QuoteCard({ 
  quote = {}, 
  onEdit, 
  onView, 
  onCopy, 
  onDelete, 
  selectionMode, 
  selected, 
  onToggleSelect 
}) {
  useEffect(() => {
    console.log('🔍 [QuoteCard] Received quote:', {
      quote,
      quoteType: typeof quote,
      quoteKeys: quote ? Object.keys(quote) : 'null'
    });
  }, [quote]);

  if (!quote || typeof quote !== 'object') {
    console.error('❌ [QuoteCard] Quote is invalid:', quote);
    return null;
  }

  const quoteNumber = quote.quote_number || 'לא זמין';
  const projectName = quote.project_name || 'פרויקט לא ידוע';
  const clientName = quote.client_name || 'לקוח לא ידוע';
  const quoteStatus = quote.status || 'בהמתנה';
  const amount = quote.amount || 0;
  
  const statusColor = STATUS_COLORS[quoteStatus] || STATUS_COLORS['בהמתנה'];

  const formatDate = (dateString) => {
    if (!dateString) return 'לא זמין';
    try {
      return format(new Date(dateString), 'dd/MM/yyyy', { locale: he });
    } catch (error) {
      console.error('❌ [QuoteCard] Error formatting date:', error, dateString);
      return 'תאריך לא תקין';
    }
  };

  const createdDate = formatDate(quote.created_date);

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
              <h3 className="font-bold text-slate-900 text-lg">הצעה #{quoteNumber}</h3>
            </div>
            <Badge variant="outline" className={statusColor}>
              {quoteStatus}
            </Badge>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="w-4 h-4"/>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Edit className="w-4 h-4 ml-2"/>
                עריכה
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="text-red-600">
                <Trash2 className="w-4 h-4 ml-2"/>
                מחיקה
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <FolderOpen className="w-4 h-4" />
          <span className="font-semibold">פרויקט:</span>
          <span className="truncate">{projectName}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <User className="w-4 h-4" />
          <span className="font-semibold">לקוח:</span>
          <span className="truncate">{clientName}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Calendar className="w-4 h-4" />
          <span className="font-semibold">תאריך:</span>
          <span className="truncate">{createdDate}</span>
        </div>
        <div className="pt-3 border-t border-slate-100 text-left">
          <span className="text-xl font-bold text-slate-800">
            ₪{amount.toLocaleString('he-IL')}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}