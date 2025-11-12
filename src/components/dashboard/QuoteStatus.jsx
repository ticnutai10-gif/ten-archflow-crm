import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const STATUS_COLORS = {
  "נשלחה": "bg-blue-100 text-blue-800",
  "בהמתנה": "bg-yellow-100 text-yellow-800",
  "אושרה": "bg-green-100 text-green-800",
  "נדחתה": "bg-red-100 text-red-800",
  "פג תוקף": "bg-slate-100 text-slate-800"
};

export default function QuoteStatus({ quotes, isLoading }) {
  // ✅ הגנה מלאה על quotes
  const safeQuotes = React.useMemo(() => {
    if (!quotes) {
      console.warn('⚠️ [QuoteStatus] quotes is null/undefined');
      return [];
    }
    if (!Array.isArray(quotes)) {
      console.error('❌ [QuoteStatus] quotes is not an array!', quotes);
      return [];
    }
    return quotes.filter(q => q && typeof q === 'object');
  }, [quotes]);

  const formatCurrency = (amount) => {
    if (!amount) return '₪0';
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-20 bg-slate-200 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (safeQuotes.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500">
        <p className="mb-4">אין הצעות מחיר</p>
        <Link to={createPageUrl("Quotes")}>
          <Button variant="outline" size="sm">צור הצעה ראשונה</Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
        {safeQuotes.map((quote) => {
          if (!quote || typeof quote !== 'object') {
            console.error('Invalid quote:', quote);
            return null;
          }

          const statusColor = STATUS_COLORS[quote.status || "בהמתנה"];

          return (
            <div
              key={quote.id}
              className="p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-slate-900">
                  {quote.project_name || 'פרויקט ללא שם'}
                </h4>
                <Badge className={`${statusColor} text-xs`}>
                  {quote.status || 'בהמתנה'}
                </Badge>
              </div>
              
              <div className="text-sm text-slate-600">
                <div className="flex justify-between items-center">
                  <span>{quote.client_name || 'לקוח לא ידוע'}</span>
                  <span className="font-semibold text-slate-900">
                    {formatCurrency(quote.amount)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-3 border-t">
        <Link to={createPageUrl("Quotes")} className="block">
          <Button variant="outline" size="sm" className="w-full">
            כל ההצעות →
          </Button>
        </Link>
      </div>
    </div>
  );
}