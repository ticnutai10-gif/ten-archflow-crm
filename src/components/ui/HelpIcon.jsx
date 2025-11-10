import React from 'react';
import { HelpCircle } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from './tooltip';

export default function HelpIcon({ text, side = "top", className = "" }) {
  if (!text) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button className={`inline-flex items-center justify-center ${className}`} type="button">
          <HelpCircle className="w-4 h-4 text-slate-400 hover:text-slate-600 transition-colors" />
        </button>
      </TooltipTrigger>
      <TooltipContent side={side}>
        <div className="max-w-xs text-right" dir="rtl">
          {text}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}