
import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { TrendingUp, ExternalLink } from "lucide-react";

const statusColors = {
  'נשלחה': 'bg-blue-100 text-blue-800 border-blue-200',
  'בהמתנה': 'bg-amber-100 text-amber-800 border-amber-200',
  'אושרה': 'bg-green-100 text-green-800 border-green-200',
  'נדחתה': 'bg-red-100 text-red-800 border-red-200',
  'פגה תוקף': 'bg-slate-100 text-slate-800 border-slate-200'
};

export default function QuoteStatus({ quotes, isLoading }) {
  const formatAmount = (amount) => {
    return new Intl.NumberFormat('he-IL', { 
      style: 'currency', 
      currency: 'ILS',
      maximumFractionDigits: 0 
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4 h-[400px] overflow-y-auto" dir="rtl">
        {Array(3).fill(0).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-20 bg-slate-200 rounded-lg"></div>
          </div>
        ))}
      </div>
    );
  }

  if (quotes.length === 0) {
    return (
      <div className="p-6 text-center h-[400px] flex items-center justify-center" dir="rtl">
        <p className="text-slate-500 text-center">אין הצעות מחיר עדיין</p>
      </div>
    );
  }

  return (
    <div className="h-[400px] flex flex-col" dir="rtl">
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-6 py-4" dir="rtl">
        <div className="space-y-4">
          {quotes.map((quote) => (
            <div key={quote.id} className="p-4 border border-slate-200 rounded-xl hover:shadow-md transition-all duration-200 bg-white" dir="rtl">
              <div className="flex justify-between items-start mb-3" dir="rtl">
                <div className="flex-1 min-w-0 text-right" dir="rtl">
                  <h3 className="font-semibold text-slate-900 mb-1 truncate text-right">{quote.project_name}</h3>
                  <p className="text-sm text-slate-600 mb-2 truncate text-right">{quote.client_name}</p>
                  <div className="flex items-center gap-2 text-lg font-bold text-green-600" dir="rtl">
                    <TrendingUp className="w-4 h-4 flex-shrink-0" />
                    <span>{formatAmount(quote.amount)}</span>
                  </div>
                </div>
                <Badge variant="outline" className={`${statusColors[quote.status] || 'bg-slate-100 text-slate-800'} flex-shrink-0 text-xs`}>
                  {quote.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Fixed footer */}
      <div className="flex-shrink-0 px-6 pb-4 pt-2 border-t border-slate-100" dir="rtl">
        <Link to={createPageUrl("Quotes")}>
          <Button variant="outline" className="w-full text-sm">
            <ExternalLink className="w-4 h-4 ml-2" />
            צפה בכל הצעות המחיר
          </Button>
        </Link>
      </div>
    </div>
  );
}
