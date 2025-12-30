import React, { useState, useRef, useEffect } from 'react';
import { GripHorizontal } from 'lucide-react';

export default function ResizableTableContainer({ children, initialHeight = 600, minHeight = 300 }) {
  const [height, setHeight] = useState(initialHeight);
  const containerRef = useRef(null);
  const isDraggingRef = useRef(false);
  const startYRef = useRef(0);
  const startHeightRef = useRef(0);

  const handleMouseDown = (e) => {
    e.preventDefault();
    isDraggingRef.current = true;
    startYRef.current = e.clientY;
    startHeightRef.current = height;
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e) => {
    if (!isDraggingRef.current) return;
    const delta = e.clientY - startYRef.current;
    const newHeight = Math.max(minHeight, startHeightRef.current + delta);
    setHeight(newHeight);
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  };

  // Full screen toggle helper logic can be added here if needed, 
  // but for now we focus on height resizing.

  return (
    <div className="relative flex flex-col transition-all duration-75" style={{ height: `${height}px` }}>
      {/* Top Handle - Optional, maybe for collapsing upper sections? 
          For now, user asked for "handles to extend up", 
          but usually that implies resizing the top boundary. 
          In a flow layout, moving top boundary up means shrinking the element ABOVE it. 
          That's complex. Let's provide a bottom handle that works well.
      */}
      
      <div className="flex-1 overflow-hidden relative bg-white rounded-xl shadow-lg border border-slate-200">
        {children}
      </div>

      {/* Bottom Resize Handle */}
      <div 
        className="h-4 w-full flex items-center justify-center cursor-row-resize hover:bg-slate-100 transition-colors group mt-1"
        onMouseDown={handleMouseDown}
      >
        <div className="h-1 w-16 bg-slate-300 rounded-full group-hover:bg-slate-400 transition-colors" />
        <GripHorizontal className="w-4 h-4 text-slate-300 absolute right-4 group-hover:text-slate-400" />
      </div>
    </div>
  );
}