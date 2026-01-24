import React from 'react';
import AIProjectAnalytics from '../components/ai/AIProjectAnalytics';

export default function ProjectAnalyticsPage() {
  return (
    <div className="p-6 min-h-screen" style={{ backgroundColor: 'var(--bg-cream, #FCF6E3)' }} dir="rtl">
      <div className="max-w-7xl mx-auto">
        <AIProjectAnalytics />
      </div>
    </div>
  );
}