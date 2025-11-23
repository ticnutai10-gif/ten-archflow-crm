import React, { useState } from 'react';
import { Plus, X, Users, Briefcase, CheckSquare, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';

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
    <div className="md:hidden fixed bottom-20 left-4 z-40">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute bottom-16 left-0 flex flex-col gap-3"
          >
            {QUICK_ACTIONS.map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.button
                  key={item.action}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleAction(item.action)}
                  className="flex items-center gap-3 bg-white rounded-full shadow-lg px-4 py-3 hover:shadow-xl transition-all"
                  style={{ borderLeft: `4px solid ${item.color}` }}
                >
                  <Icon className="w-5 h-5" style={{ color: item.color }} />
                  <span className="text-sm font-medium text-slate-800">{item.label}</span>
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 rounded-full bg-gradient-to-br from-[#2C3A50] to-[#1f2937] text-white shadow-lg hover:shadow-xl transition-all flex items-center justify-center"
      >
        <motion.div
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <Plus className="w-7 h-7" />
        </motion.div>
      </motion.button>
    </div>
  );
}