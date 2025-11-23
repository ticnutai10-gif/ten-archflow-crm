import React, { useState } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { Trash2, Edit2, Eye } from 'lucide-react';

export default function SwipeableCard({ 
  children, 
  onDelete, 
  onEdit, 
  onView,
  className = ""
}) {
  const [isDragging, setIsDragging] = useState(false);
  const x = useMotionValue(0);
  const opacity = useTransform(x, [-150, 0, 150], [0.5, 1, 0.5]);

  const handleDragEnd = (event: any, info: PanInfo) => {
    setIsDragging(false);
    const threshold = 100;

    if (info.offset.x > threshold) {
      // Swiped right - edit
      if (onEdit) onEdit();
    } else if (info.offset.x < -threshold) {
      // Swiped left - delete
      if (onDelete) onDelete();
    }
  };

  return (
    <div className="relative overflow-hidden">
      {/* Action indicators */}
      <div className="absolute inset-0 flex items-center justify-between px-4 pointer-events-none">
        <motion.div
          className="flex items-center gap-2 text-blue-600"
          style={{ opacity: useTransform(x, [0, 100], [0, 1]) }}
        >
          <Edit2 className="w-5 h-5" />
          <span className="font-medium">ערוך</span>
        </motion.div>
        <motion.div
          className="flex items-center gap-2 text-red-600"
          style={{ opacity: useTransform(x, [-100, 0], [1, 0]) }}
        >
          <span className="font-medium">מחק</span>
          <Trash2 className="w-5 h-5" />
        </motion.div>
      </div>

      {/* Draggable card */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.1}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={handleDragEnd}
        style={{ x, opacity }}
        className={`relative bg-white ${className} ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      >
        {children}
      </motion.div>
    </div>
  );
}