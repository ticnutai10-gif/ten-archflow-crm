import React, { useState, useRef } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { RefreshCw } from 'lucide-react';

export default function PullToRefresh({ onRefresh, children }) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const y = useMotionValue(0);
  const rotate = useTransform(y, [0, 100], [0, 360]);
  const opacity = useTransform(y, [0, 50, 100], [0, 0.5, 1]);
  const scale = useTransform(y, [0, 100], [0.5, 1]);

  const handleDragEnd = async (event, info) => {
    if (info.offset.y > 100 && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefresh?.();
      } finally {
        setIsRefreshing(false);
      }
    }
  };

  return (
    <div className="relative overflow-hidden">
      {/* Pull indicator */}
      <motion.div
        className="absolute top-0 left-1/2 -translate-x-1/2 flex items-center justify-center pointer-events-none z-10"
        style={{ opacity, y: useTransform(y, [0, 100], [-40, 20]) }}
      >
        <motion.div
          style={{ rotate, scale }}
          className="bg-white rounded-full p-2 shadow-lg"
        >
          <RefreshCw className="w-6 h-6 text-[#2C3A50]" />
        </motion.div>
      </motion.div>

      {/* Content */}
      <motion.div
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
        style={{ y }}
        className={isRefreshing ? 'pointer-events-none' : ''}
      >
        {children}
      </motion.div>

      {/* Refreshing overlay */}
      {isRefreshing && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
          <div className="bg-white rounded-full p-3 shadow-lg animate-spin">
            <RefreshCw className="w-6 h-6 text-[#2C3A50]" />
          </div>
        </div>
      )}
    </div>
  );
}