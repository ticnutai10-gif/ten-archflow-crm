import React, { useState } from 'react';

const DEFAULT_STATUS_OPTIONS = [
  { value: 'פוטנציאלי', label: 'פוטנציאלי', color: '#f59e0b', glow: 'rgba(245, 158, 11, 0.4)' },
  { value: 'פעיל', label: 'פעיל', color: '#22c55e', glow: 'rgba(34, 197, 94, 0.4)' },
  { value: 'לא_פעיל', label: 'לא פעיל', color: '#ef4444', glow: 'rgba(239, 68, 68, 0.4)' }
];

export default function StatusDisplay({ value, column, isEditing, onEdit, editValue, onSave, onCancel, statusOptions = DEFAULT_STATUS_OPTIONS, compact = false, onDirectSave }) {
  const [showPicker, setShowPicker] = useState(false);
  
  // Handle both array and wrapped object format
  const STATUS_OPTIONS = Array.isArray(statusOptions) 
    ? statusOptions 
    : (statusOptions?.options || DEFAULT_STATUS_OPTIONS);
  const currentStatus = STATUS_OPTIONS.find(s => s.value === value);
  
  if (isEditing) {
    return (
      <div className="relative" onClick={(e) => e.stopPropagation()}>
        <div className="space-y-2 p-2 bg-white rounded-lg shadow-lg border-2 border-green-300 min-w-[180px]">
          {STATUS_OPTIONS.map(status => (
            <button
              key={status.value}
              onClick={() => {
                console.log('🟢 [STATUS] Clicked status:', status.value);
                // Use direct save if available, otherwise use the old method
                if (onDirectSave) {
                  onDirectSave(status.value);
                } else if (typeof onEdit === 'function' && typeof onSave === 'function') {
                  onEdit(status.value);
                  setTimeout(() => onSave(), 100);
                }
              }}
              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-green-50 rounded-lg transition-all"
            >
              <div 
                className="w-3 h-3 rounded-full animate-pulse"
                style={{ 
                  backgroundColor: status.color,
                  boxShadow: `0 0 8px ${status.glow}, 0 0 12px ${status.glow}`
                }}
              />
              <span className="text-sm font-medium">{status.label}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }
  
  if (!currentStatus && !isEditing) {
    return (
      <div className="text-xs text-slate-400 text-center py-2 hover:bg-green-50 rounded transition-colors">
        לחץ לבחירה
      </div>
    );
  }
  
  if (!currentStatus && isEditing) {
    return (
      <div className="relative" onClick={(e) => e.stopPropagation()}>
        <div className="space-y-2 p-2 bg-white rounded-lg shadow-lg border-2 border-green-300 min-w-[180px]">
          {STATUS_OPTIONS.map(status => (
            <button
              key={status.value}
              onClick={() => {
                if (onDirectSave) {
                  onDirectSave(status.value);
                } else if (typeof onEdit === 'function' && typeof onSave === 'function') {
                  onEdit(status.value);
                  setTimeout(() => onSave(), 50);
                }
              }}
              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-green-50 rounded-lg transition-all"
            >
              <div 
                className="w-3 h-3 rounded-full"
                style={{ 
                  backgroundColor: status.color,
                  boxShadow: `0 0 8px ${status.glow}, 0 0 12px ${status.glow}`
                }}
              />
              <span className="text-sm font-medium">{status.label}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex items-center justify-center gap-2 group cursor-pointer py-1">
      <div 
        className="w-4 h-4 rounded-full transition-all duration-300 group-hover:scale-125 flex-shrink-0 animate-pulse"
        style={{ 
          backgroundColor: currentStatus.color,
          boxShadow: `0 0 10px ${currentStatus.glow}, 0 0 15px ${currentStatus.glow}`,
          border: '2px solid white'
        }}
      />
      <span 
        className="text-sm font-semibold px-3 py-1.5 rounded-full transition-all duration-300"
        style={{ 
          backgroundColor: `${currentStatus.color}20`,
          color: currentStatus.color,
          border: `2px solid ${currentStatus.color}60`
        }}
      >
        {currentStatus.label}
      </span>
    </div>
  );
}