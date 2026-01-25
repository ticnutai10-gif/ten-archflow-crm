import React from 'react';
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, AlertCircle, ArrowUp, ArrowDown, Flame } from "lucide-react";

const PRIORITY_CONFIG = {
  'קריטית': {
    color: 'bg-red-600 text-white border-red-700',
    bgLight: 'bg-red-100',
    textColor: 'text-red-700',
    icon: Flame,
    glow: 'shadow-red-500/50 shadow-lg animate-pulse'
  },
  'גבוהה': {
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    bgLight: 'bg-orange-50',
    textColor: 'text-orange-700',
    icon: AlertTriangle,
    glow: ''
  },
  'בינונית': {
    color: 'bg-amber-100 text-amber-800 border-amber-200',
    bgLight: 'bg-amber-50',
    textColor: 'text-amber-700',
    icon: ArrowUp,
    glow: ''
  },
  'נמוכה': {
    color: 'bg-green-100 text-green-800 border-green-200',
    bgLight: 'bg-green-50',
    textColor: 'text-green-700',
    icon: ArrowDown,
    glow: ''
  }
};

export default function PriorityBadge({ priority, size = 'default', showIcon = true, showLabel = true }) {
  const config = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG['בינונית'];
  const Icon = config.icon;
  
  const sizeClasses = {
    'sm': 'text-xs px-1.5 py-0.5',
    'default': 'text-xs px-2 py-1',
    'lg': 'text-sm px-3 py-1.5'
  };

  const iconSizes = {
    'sm': 'w-3 h-3',
    'default': 'w-3.5 h-3.5',
    'lg': 'w-4 h-4'
  };

  return (
    <Badge 
      variant="outline" 
      className={`${config.color} ${sizeClasses[size]} ${config.glow} flex items-center gap-1`}
    >
      {showIcon && <Icon className={iconSizes[size]} />}
      {showLabel && <span>{priority}</span>}
    </Badge>
  );
}

export function PriorityIndicator({ priority, size = 'default' }) {
  const config = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG['בינונית'];
  
  const sizeClasses = {
    'sm': 'w-2 h-2',
    'default': 'w-3 h-3',
    'lg': 'w-4 h-4'
  };

  const colorClasses = {
    'קריטית': 'bg-red-600',
    'גבוהה': 'bg-orange-500',
    'בינונית': 'bg-amber-500',
    'נמוכה': 'bg-green-500'
  };

  return (
    <div 
      className={`${sizeClasses[size]} ${colorClasses[priority] || colorClasses['בינונית']} rounded-full ${priority === 'קריטית' ? 'animate-pulse' : ''}`}
      title={`עדיפות: ${priority}`}
    />
  );
}

export { PRIORITY_CONFIG };