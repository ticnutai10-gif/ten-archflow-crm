import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, Download, Filter, Eye, EyeOff, ChevronDown, ChevronUp,
  Table, Grid3X3, List, X, Check, RefreshCw, FileDown
} from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function DataPreviewDialog({ 
  open, 
  onClose, 
  categories = [], 
  onExport,
  categoryInfo = {}
}) {
  const [previewData, setPreviewData] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState(categories[0] || '');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('table'); // table, cards, json
  const [selectedFields, setSelectedFields] = useState({});
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [selectedRows, setSelectedRows] = useState(new Set());

  useEffect(() => {
    if (open && categories.length > 0) {
      loadPreviewData();
      setActiveCategory(categories[0]);
    }
  }, [open, categories]);

  const loadPreviewData = async () => {
    setLoading(true);
    const data = {};
    
    for (const cat of categories) {
      try {
        if (base44.entities && base44.entities[cat]) {
          const records = await base44.entities[cat].list('-created_date', 100);
          data[cat] = records || [];
          
          // Initialize selected fields for this category
          if (records.length > 0) {
            const fields = Object.keys(records[0]).filter(k => !k.startsWith('_'));
            setSelectedFields(prev => ({
              ...prev,
              [cat]: new Set(fields)
            }));
          }
        }
      } catch (e) {
        console.error(`Error loading ${cat}:`, e);
        data[cat] = [];
      }
    }
    
    setPreviewData(data);
    setLoading(false);
  };

  const toggleField = (category, field) => {
    setSelectedFields(prev => {
      const current = prev[category] || new Set();
      const next = new Set(current);
      if (next.has(field)) {
        next.delete(field);
      } else {
        next.add(field);
      }
      return { ...prev, [category]: next };
    });
  };

  const toggleAllFields = (category, fields, selectAll) => {
    setSelectedFields(prev => ({
      ...prev,
      [category]: selectAll ? new Set(fields) : new Set(['id'])
    }));
  };

  const toggleRow = (rowId) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (next.has(rowId)) {
        next.delete(rowId);
      } else {
        next.add(rowId);
      }
      return next;
    });
  };

  const currentData = previewData[activeCategory] || [];
  const currentFields = currentData.length > 0 
    ? Object.keys(currentData[0]).filter(k => !k.startsWith('_'))
    : [];
  const currentSelectedFields = selectedFields[activeCategory] || new Set(currentFields);

  const filteredData = searchTerm
    ? currentData.filter(row => 
        Object.values(row).some(val => 
          String(val).toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    : currentData;

  const handleExportSelected = () => {
    const exportData = {};
    
    for (const cat of categories) {
      const catData = previewData[cat] || [];
      const fields = selectedFields[cat] || new Set(Object.keys(catData[0] || {}));
      
      exportData[cat] = catData.map(row => {
        const filtered = {};
        fields.forEach(field => {
          if (row[field] !== undefined) {
            filtered[field] = row[field];
          }
        });
        return filtered;
      });
    }
    
    onExport?.(exportData);
  };

  const formatValue = (value) => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? '✓' : '✗';
    if (Array.isArray(value)) return `[${value.length}]`;
    if (typeof value === 'object') return JSON.stringify(value).substring(0, 50) + '...';
    if (typeof value === 'string' && value.length > 50) return value.substring(0, 50) + '...';
    return String(value);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-hidden p-0" dir="rtl">
        <DialogHeader className="p-4 border-b bg-gradient-to-l from-blue-50 to-white">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Eye className="w-6 h-6 text-blue-600" />
              <span>תצוגה מקדימה של נתונים</span>
              <Badge variant="outline">{categories.length} קטגוריות</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={loadPreviewData}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
                onClick={handleExportSelected}
              >
                <FileDown className="w-4 h-4 ml-1" />
                ייצא נבחרים
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex h-[75vh]">
          {/* Sidebar - Categories */}
          <div className="w-56 border-l bg-slate-50 p-3 overflow-y-auto">
            <div className="text-sm font-bold text-slate-600 mb-2">קטגוריות</div>
            <div className="space-y-1">
              {categories.map(cat => {
                const info = categoryInfo[cat] || {};
                const count = (previewData[cat] || []).length;
                
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`
                      w-full text-right p-2 rounded-lg transition-all text-sm
                      ${activeCategory === cat 
                        ? 'bg-blue-100 text-blue-700 shadow-sm' 
                        : 'hover:bg-slate-100 text-slate-700'
                      }
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <span>{info.icon || '📄'} {info.label || cat}</span>
                      <Badge variant="secondary" className="text-xs">{count}</Badge>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Toolbar */}
            <div className="p-3 border-b bg-white flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="חיפוש בנתונים..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
              </div>

              <div className="flex items-center gap-1 border rounded-lg p-1">
                {[
                  { mode: 'table', icon: Table },
                  { mode: 'cards', icon: Grid3X3 },
                  { mode: 'json', icon: List }
                ].map(({ mode, icon: Icon }) => (
                  <Button
                    key={mode}
                    size="sm"
                    variant={viewMode === mode ? 'default' : 'ghost'}
                    onClick={() => setViewMode(mode)}
                    className="h-8 w-8 p-0"
                  >
                    <Icon className="w-4 h-4" />
                  </Button>
                ))}
              </div>

              <Badge variant="outline">
                {filteredData.length} / {currentData.length} רשומות
              </Badge>
            </div>

            {/* Fields Selection */}
            <div className="p-3 border-b bg-slate-50">
              <div className="flex items-center gap-2 mb-2">
                <Filter className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-bold text-slate-600">שדות לייצוא:</span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs h-6"
                  onClick={() => toggleAllFields(activeCategory, currentFields, true)}
                >
                  בחר הכל
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs h-6"
                  onClick={() => toggleAllFields(activeCategory, currentFields, false)}
                >
                  נקה
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {currentFields.map(field => (
                  <label
                    key={field}
                    className={`
                      flex items-center gap-1 px-2 py-1 rounded-lg text-xs cursor-pointer transition-all
                      ${currentSelectedFields.has(field)
                        ? 'bg-blue-100 text-blue-700 border border-blue-200'
                        : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
                      }
                    `}
                  >
                    <Checkbox
                      checked={currentSelectedFields.has(field)}
                      onCheckedChange={() => toggleField(activeCategory, field)}
                      className="h-3 w-3"
                    />
                    <span>{field}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Data Display */}
            <ScrollArea className="flex-1 p-3">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
                </div>
              ) : viewMode === 'table' ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="p-2 border text-right font-bold">#</th>
                        {currentFields.filter(f => currentSelectedFields.has(f)).map(field => (
                          <th key={field} className="p-2 border text-right font-bold whitespace-nowrap">
                            {field}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredData.slice(0, 100).map((row, idx) => (
                        <tr 
                          key={row.id || idx} 
                          className="hover:bg-blue-50 transition-colors"
                          onClick={() => toggleRow(row.id)}
                        >
                          <td className="p-2 border text-center text-slate-500">{idx + 1}</td>
                          {currentFields.filter(f => currentSelectedFields.has(f)).map(field => (
                            <td key={field} className="p-2 border max-w-[200px] truncate">
                              {formatValue(row[field])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredData.length > 100 && (
                    <div className="text-center py-4 text-slate-500 text-sm">
                      מוצגות 100 רשומות מתוך {filteredData.length}
                    </div>
                  )}
                </div>
              ) : viewMode === 'cards' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredData.slice(0, 50).map((row, idx) => (
                    <div 
                      key={row.id || idx}
                      className="bg-white rounded-xl border p-4 hover:shadow-md transition-all"
                    >
                      <div className="text-xs text-slate-400 mb-2">#{idx + 1}</div>
                      {currentFields.filter(f => currentSelectedFields.has(f)).slice(0, 6).map(field => (
                        <div key={field} className="flex justify-between py-1 border-b border-slate-100 last:border-0">
                          <span className="text-xs text-slate-500">{field}</span>
                          <span className="text-xs font-medium text-slate-700 max-w-[150px] truncate">
                            {formatValue(row[field])}
                          </span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ) : (
                <pre className="bg-slate-900 text-green-400 p-4 rounded-xl text-xs overflow-auto max-h-full">
                  {JSON.stringify(filteredData.slice(0, 20), null, 2)}
                </pre>
              )}
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}