import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { 
  Users, 
  Briefcase, 
  CheckSquare, 
  Clock, 
  Calendar, 
  DollarSign,
  BarChart3,
  LayoutGrid,
  Maximize2,
  Grid2x2,
  Columns3
} from 'lucide-react';

const TAB_ITEMS = [
  { id: 'clients', label: 'לקוחות', icon: Users, color: '#3b82f6' },
  { id: 'projects', label: 'פרויקטים', icon: Briefcase, color: '#8b5cf6' },
  { id: 'tasks', label: 'משימות', icon: CheckSquare, color: '#f59e0b' },
  { id: 'timeLogs', label: 'לוג זמן', icon: Clock, color: '#10b981' },
  { id: 'meetings', label: 'פגישות', icon: Calendar, color: '#ef4444' },
  { id: 'quotes', label: 'הצעות מחיר', icon: DollarSign, color: '#06b6d4' },
  { id: 'analytics', label: 'אנליטיקה', icon: BarChart3, color: '#6366f1' }
];

export default function TabsPanelLayout({ children, renderContent }) {
  const [activeTab, setActiveTab] = useState('clients');
  const [layout, setLayout] = useState('single'); // single, dual, quad
  const [tabsStyle, setTabsStyle] = useState('compact'); // compact, separate
  const [panels, setPanels] = useState([
    { id: 1, tab: 'clients' }
  ]);

  // Update panels based on layout
  useEffect(() => {
    if (layout === 'single') {
      setPanels([{ id: 1, tab: activeTab }]);
    } else if (layout === 'dual') {
      setPanels([
        { id: 1, tab: activeTab },
        { id: 2, tab: TAB_ITEMS[0].id }
      ]);
    } else if (layout === 'quad') {
      setPanels([
        { id: 1, tab: activeTab },
        { id: 2, tab: TAB_ITEMS[1].id },
        { id: 3, tab: TAB_ITEMS[2].id },
        { id: 4, tab: TAB_ITEMS[3].id }
      ]);
    }
  }, [layout, activeTab]);

  const updatePanelTab = (panelId, newTab) => {
    setPanels(prev => prev.map(p => 
      p.id === panelId ? { ...p, tab: newTab } : p
    ));
  };

  const getLayoutClass = () => {
    if (layout === 'single') return 'grid grid-cols-1';
    if (layout === 'dual') return 'grid grid-cols-2 gap-4';
    return 'grid grid-cols-2 gap-4';
  };

  return (
    <div className="flex h-auto min-h-[800px] gap-6" dir="rtl">
      {/* Tabs Sidebar */}
      {tabsStyle === 'compact' ? (
        <div className="w-64 bg-white rounded-xl shadow-lg p-4 flex-shrink-0 border border-slate-200">
          <h3 className="text-sm font-bold text-slate-700 mb-4 text-right">פעילויות אחרונות</h3>
          <div className="space-y-2">
            {TAB_ITEMS.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    if (layout === 'single') {
                      setPanels([{ id: 1, tab: tab.id }]);
                    }
                  }}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all
                    ${isActive 
                      ? 'text-white shadow-md' 
                      : 'text-slate-700 hover:bg-slate-50 border border-slate-200'
                    }
                  `}
                  style={isActive ? { backgroundColor: tab.color } : {}}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium text-sm">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="w-48 flex-shrink-0 space-y-10">
          {TAB_ITEMS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  if (layout === 'single') {
                    setPanels([{ id: 1, tab: tab.id }]);
                  }
                }}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all shadow-md border-2
                  ${isActive 
                    ? 'text-white border-transparent' 
                    : 'bg-white text-slate-700 hover:shadow-lg border-slate-200'
                  }
                `}
                style={isActive ? { backgroundColor: tab.color } : {}}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium text-sm">{tab.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 bg-white rounded-xl shadow-lg border border-slate-200 flex flex-col overflow-hidden">
        {/* Header with Layout Controls */}
        <div className="border-b border-slate-200 p-4 flex items-center justify-between bg-slate-50">
          <h2 className="text-lg font-bold text-slate-800">
            {TAB_ITEMS.find(t => t.id === activeTab)?.label || 'תוכן'}
          </h2>
          
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 border-l border-slate-300 pl-2 ml-2">
              <Button
                variant={tabsStyle === 'compact' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTabsStyle('compact')}
                title="טאבים מרוכזים"
                className="h-8 px-3 text-xs"
              >
                מרוכז
              </Button>
              <Button
                variant={tabsStyle === 'separate' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTabsStyle('separate')}
                title="טאבים נפרדים"
                className="h-8 px-3 text-xs"
              >
                נפרד
              </Button>
            </div>
            
            <Button
              variant={layout === 'single' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setLayout('single')}
              title="חלון יחיד"
              className="h-8 w-8 p-0"
            >
              <Maximize2 className="w-4 h-4" />
            </Button>
            <Button
              variant={layout === 'dual' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setLayout('dual')}
              title="2 חלונות"
              className="h-8 w-8 p-0"
            >
              <Columns3 className="w-4 h-4" />
            </Button>
            <Button
              variant={layout === 'quad' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setLayout('quad')}
              title="4 חלונות"
              className="h-8 w-8 p-0"
            >
              <Grid2x2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content Grid */}
        <div className={`flex-1 p-4 ${getLayoutClass()}`}>
          {panels.map((panel, index) => {
            const currentTab = TAB_ITEMS.find(t => t.id === panel.tab);
            const Icon = currentTab?.icon || Users;
            
            return (
              <div 
                key={panel.id} 
                className="border border-slate-200 rounded-lg bg-slate-50 overflow-hidden flex flex-col h-full"
                style={{ minHeight: layout === 'quad' ? '350px' : layout === 'dual' ? '700px' : '750px' }}
              >
                {/* Panel Header (only show in multi-panel mode) */}
                {layout !== 'single' && (
                  <div className="bg-white border-b border-slate-200 p-2 flex items-center gap-2">
                    <select
                      value={panel.tab}
                      onChange={(e) => updatePanelTab(panel.id, e.target.value)}
                      className="flex-1 text-sm border border-slate-200 rounded px-2 py-1"
                    >
                      {TAB_ITEMS.map(tab => (
                        <option key={tab.id} value={tab.id}>
                          {tab.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Panel Content */}
                <div className="flex-1 overflow-y-auto bg-white flex flex-col">
                  {renderContent(panel.tab)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}