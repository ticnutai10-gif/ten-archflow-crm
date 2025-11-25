import React, { useState } from 'react';
import { Plus, X, Users, Briefcase, CheckSquare, Calendar } from 'lucide-react';

const QUICK_ACTIONS = [
  { icon: Users, label: 'לקוח חדש', action: 'client', color: '#3b82f6' },
  { icon: Briefcase, label: 'פרויקט חדש', action: 'project', color: '#8b5cf6' },
  { icon: CheckSquare, label: 'משימה חדשה', action: 'task', color: '#10b981' },
  { icon: Calendar, label: 'פגישה חדשה', action: 'meeting', color: '#f59e0b' },
];

export default function MobileFAB({ onAction }) {
  const [isOpen, setIsOpen] = useState(false);

  const handleAction = (action) => {
    setIsOpen(false);
    if (onAction) onAction(action);
  };

  return (
    <div className="md:hidden fixed bottom-20 left-4 z-40" style={{ touchAction: 'none' }}>
      {isOpen && (
        <div className="absolute bottom-16 left-0 flex flex-col gap-3">
          {QUICK_ACTIONS.map((item, index) => {
            const Icon = item.icon;
            return (
              <button
                key={item.action}
                onClick={() => handleAction(item.action)}
                className="flex items-center gap-3 bg-white rounded-full shadow-lg px-4 py-3 active:scale-95 transition-transform"
                style={{ borderLeft: `4px solid ${item.color}`, touchAction: 'manipulation' }}
              >
                <Icon className="w-5 h-5" style={{ color: item.color }} />
                <span className="text-sm font-medium text-slate-800">{item.label}</span>
              </button>
            );
          })}
        </div>
      )}

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 rounded-full bg-gradient-to-br from-[#2C3A50] to-[#1f2937] text-white shadow-lg active:scale-90 transition-transform flex items-center justify-center"
        style={{ touchAction: 'manipulation' }}
      >
        <div
          style={{ transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
        >
          <Plus className="w-7 h-7" />
        </div>
      </button>
    </div>
  );
}