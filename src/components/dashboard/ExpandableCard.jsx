import React, { useState, startTransition } from 'react';
import { ChevronDown, ChevronUp, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function ExpandableCard({ 
  children, 
  defaultHeight = '400px',
  expandedHeight = 'auto',
  className = ''
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpand = () => {
    startTransition(() => {
      setIsExpanded(!isExpanded);
    });
  };

  return (
    <div className={`relative ${className}`}>
      {/* Expand/Collapse Button */}
      <Button
        size="sm"
        variant="ghost"
        onClick={toggleExpand}
        className="absolute top-2 left-2 z-10 h-7 w-7 p-0 hover:bg-slate-100 rounded-full shadow-sm bg-white/80 backdrop-blur-sm"
        title={isExpanded ? 'כווץ' : 'הרחב'}
      >
        {isExpanded ? (
          <Minimize2 className="w-4 h-4 text-slate-600" />
        ) : (
          <Maximize2 className="w-4 h-4 text-slate-600" />
        )}
      </Button>

      {/* Content */}
      {isExpanded ? (
        <div style={{ height: expandedHeight }}>
          {children}
        </div>
      ) : (
        <ScrollArea style={{ height: defaultHeight }}>
          {children}
        </ScrollArea>
      )}
    </div>
  );
}