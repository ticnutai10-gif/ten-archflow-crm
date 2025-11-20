import React, { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart3, 
  LineChart as LineChartIcon, 
  PieChart as PieChartIcon, 
  TrendingUp, 
  Activity,
  Layers,
  Settings,
  Palette,
  Eye,
  Trash2
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from "recharts";
import { toast } from "sonner";

const CHART_TYPES = [
  { value: 'bar', label: 'עמודות', icon: BarChart3, description: 'השוואה בין קטגוריות' },
  { value: 'line', label: 'קו', icon: LineChartIcon, description: 'מגמות לאורך זמן' },
  { value: 'area', label: 'אזור', icon: Activity, description: 'נפח מצטבר' },
  { value: 'pie', label: 'עוגה', icon: PieChartIcon, description: 'התפלגות יחסית' },
  { value: 'scatter', label: 'פיזור', icon: TrendingUp, description: 'קשרים בין משתנים' },
  { value: 'radar', label: 'רדאר', icon: Layers, description: 'השוואה רב-ממדית' }
];

const COLOR_SCHEMES = {
  vibrant: ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6'],
  pastel: ['#a78bfa', '#7dd3fc', '#6ee7b7', '#fcd34d', '#fca5a5', '#f9a8d4', '#c4b5fd'],
  ocean: ['#0ea5e9', '#0284c7', '#0369a1', '#075985', '#0c4a6e', '#082f49', '#0e7490'],
  forest: ['#10b981', '#059669', '#047857', '#065f46', '#064e3b', '#022c22', '#14532d'],
  sunset: ['#f59e0b', '#f97316', '#ef4444', '#dc2626', '#b91c1c', '#991b1b', '#7c2d12'],
  purple: ['#a855f7', '#9333ea', '#7e22ce', '#6b21a8', '#581c87', '#4c1d95', '#3b0764'],
  mono: ['#1e293b', '#334155', '#475569', '#64748b', '#94a3b8', '#cbd5e1', '#e2e8f0']
};

export default function ChartBuilder({ open, onClose, columns, rowsData, onSave, editingChart }) {
  const [chartConfig, setChartConfig] = useState(editingChart || {
    id: `chart_${Date.now()}`,
    name: '',
    type: 'bar',
    xAxisColumn: '',
    yAxisColumns: [],
    colorScheme: 'vibrant',
    showLegend: true,
    showGrid: true,
    showTooltip: true,
    width: 600,
    height: 400,
    customColors: []
  });

  const [activeTab, setActiveTab] = useState('data');

  // סינון עמודות מספריות ל-Y axis
  const numericColumns = useMemo(() => {
    return columns.filter(col => col.type === 'number' || 
      rowsData.some(row => !isNaN(Number(row[col.key])) && row[col.key] !== '')
    );
  }, [columns, rowsData]);

  // הכנת נתונים לגרף
  const chartData = useMemo(() => {
    if (!chartConfig.xAxisColumn || chartConfig.yAxisColumns.length === 0) {
      return [];
    }

    return rowsData
      .map(row => {
        const dataPoint = {
          name: String(row[chartConfig.xAxisColumn] || '')
        };
        
        chartConfig.yAxisColumns.forEach(colKey => {
          const value = Number(row[colKey]);
          if (!isNaN(value)) {
            const col = columns.find(c => c.key === colKey);
            dataPoint[col?.title || colKey] = value;
          }
        });
        
        return dataPoint;
      })
      .filter(point => Object.keys(point).length > 1);
  }, [rowsData, chartConfig.xAxisColumn, chartConfig.yAxisColumns, columns]);

  const colors = useMemo(() => {
    return chartConfig.customColors.length > 0 
      ? chartConfig.customColors 
      : COLOR_SCHEMES[chartConfig.colorScheme] || COLOR_SCHEMES.vibrant;
  }, [chartConfig.colorScheme, chartConfig.customColors]);

  const handleSave = () => {
    if (!chartConfig.name.trim()) {
      toast.error('נא להזין שם לגרף');
      return;
    }
    if (!chartConfig.xAxisColumn) {
      toast.error('נא לבחור עמודה לציר X');
      return;
    }
    if (chartConfig.yAxisColumns.length === 0) {
      toast.error('נא לבחור לפחות עמודה אחת לציר Y');
      return;
    }

    onSave(chartConfig);
    toast.success(`✓ גרף "${chartConfig.name}" נשמר`);
    onClose();
  };

  const toggleYColumn = (columnKey) => {
    setChartConfig(prev => {
      const isSelected = prev.yAxisColumns.includes(columnKey);
      return {
        ...prev,
        yAxisColumns: isSelected
          ? prev.yAxisColumns.filter(k => k !== columnKey)
          : [...prev.yAxisColumns, columnKey]
      };
    });
  };

  const renderChart = () => {
    if (chartData.length === 0) {
      return (
        <div className="flex items-center justify-center h-full bg-slate-50 rounded-lg border-2 border-dashed border-slate-300">
          <div className="text-center text-slate-500">
            <BarChart3 className="w-16 h-16 mx-auto mb-3 text-slate-300" />
            <p className="font-semibold">בחר נתונים להצגה</p>
            <p className="text-sm mt-1">בחר עמודות לצירים X ו-Y</p>
          </div>
        </div>
      );
    }

    const commonProps = {
      data: chartData,
      margin: { top: 20, right: 30, left: 20, bottom: 20 }
    };

    const yColumns = chartConfig.yAxisColumns.map(colKey => 
      columns.find(c => c.key === colKey)
    ).filter(Boolean);

    switch (chartConfig.type) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={chartConfig.height}>
            <BarChart {...commonProps}>
              {chartConfig.showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />}
              <XAxis dataKey="name" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              {chartConfig.showTooltip && <Tooltip />}
              {chartConfig.showLegend && <Legend />}
              {yColumns.map((col, idx) => (
                <Bar 
                  key={col.key} 
                  dataKey={col.title} 
                  fill={colors[idx % colors.length]}
                  radius={[8, 8, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer width="100%" height={chartConfig.height}>
            <LineChart {...commonProps}>
              {chartConfig.showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />}
              <XAxis dataKey="name" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              {chartConfig.showTooltip && <Tooltip />}
              {chartConfig.showLegend && <Legend />}
              {yColumns.map((col, idx) => (
                <Line 
                  key={col.key} 
                  type="monotone" 
                  dataKey={col.title} 
                  stroke={colors[idx % colors.length]}
                  strokeWidth={3}
                  dot={{ fill: colors[idx % colors.length], r: 4 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );

      case 'area':
        return (
          <ResponsiveContainer width="100%" height={chartConfig.height}>
            <AreaChart {...commonProps}>
              {chartConfig.showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />}
              <XAxis dataKey="name" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              {chartConfig.showTooltip && <Tooltip />}
              {chartConfig.showLegend && <Legend />}
              {yColumns.map((col, idx) => (
                <Area 
                  key={col.key} 
                  type="monotone" 
                  dataKey={col.title} 
                  fill={colors[idx % colors.length]}
                  stroke={colors[idx % colors.length]}
                  fillOpacity={0.6}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'pie':
        const pieData = yColumns.length > 0 
          ? chartData.map(item => ({
              name: item.name,
              value: item[yColumns[0].title]
            }))
          : [];
        
        return (
          <ResponsiveContainer width="100%" height={chartConfig.height}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={120}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              {chartConfig.showTooltip && <Tooltip />}
              {chartConfig.showLegend && <Legend />}
            </PieChart>
          </ResponsiveContainer>
        );

      case 'scatter':
        return (
          <ResponsiveContainer width="100%" height={chartConfig.height}>
            <ScatterChart {...commonProps}>
              {chartConfig.showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />}
              <XAxis dataKey="name" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              {chartConfig.showTooltip && <Tooltip />}
              {chartConfig.showLegend && <Legend />}
              {yColumns.map((col, idx) => (
                <Scatter 
                  key={col.key} 
                  name={col.title} 
                  dataKey={col.title} 
                  fill={colors[idx % colors.length]}
                />
              ))}
            </ScatterChart>
          </ResponsiveContainer>
        );

      case 'radar':
        return (
          <ResponsiveContainer width="100%" height={chartConfig.height}>
            <RadarChart {...commonProps} cx="50%" cy="50%" outerRadius="80%">
              <PolarGrid stroke="#e2e8f0" />
              <PolarAngleAxis dataKey="name" />
              <PolarRadiusAxis />
              {chartConfig.showTooltip && <Tooltip />}
              {chartConfig.showLegend && <Legend />}
              {yColumns.map((col, idx) => (
                <Radar 
                  key={col.key} 
                  name={col.title} 
                  dataKey={col.title} 
                  stroke={colors[idx % colors.length]}
                  fill={colors[idx % colors.length]}
                  fillOpacity={0.6}
                />
              ))}
            </RadarChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-6xl max-h-[90vh] overflow-hidden flex flex-col" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-purple-600" />
            {editingChart ? 'עריכת גרף' : 'יצירת גרף חדש'}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="data" className="gap-2">
              <Layers className="w-4 h-4" />
              נתונים
            </TabsTrigger>
            <TabsTrigger value="style" className="gap-2">
              <Palette className="w-4 h-4" />
              עיצוב
            </TabsTrigger>
            <TabsTrigger value="preview" className="gap-2">
              <Eye className="w-4 h-4" />
              תצוגה מקדימה
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto mt-4">
            <TabsContent value="data" className="space-y-6 m-0">
              {/* שם הגרף */}
              <div>
                <label className="text-sm font-semibold mb-2 block">שם הגרף *</label>
                <Input
                  placeholder="למשל: השוואת מכירות, התקדמות פרויקט..."
                  value={chartConfig.name}
                  onChange={(e) => setChartConfig({ ...chartConfig, name: e.target.value })}
                  className="text-right"
                  dir="rtl"
                />
              </div>

              {/* סוג גרף */}
              <div>
                <label className="text-sm font-semibold mb-3 block">סוג גרף *</label>
                <div className="grid grid-cols-3 gap-3">
                  {CHART_TYPES.map((type) => {
                    const Icon = type.icon;
                    const isSelected = chartConfig.type === type.value;
                    return (
                      <button
                        key={type.value}
                        onClick={() => setChartConfig({ ...chartConfig, type: type.value })}
                        className={`p-4 rounded-xl border-2 transition-all text-right ${
                          isSelected 
                            ? 'border-purple-500 bg-purple-50 shadow-lg' 
                            : 'border-slate-200 hover:border-slate-300 hover:shadow-md'
                        }`}
                      >
                        <Icon className={`w-8 h-8 mb-2 ${isSelected ? 'text-purple-600' : 'text-slate-400'}`} />
                        <div className={`font-semibold mb-1 ${isSelected ? 'text-purple-900' : 'text-slate-700'}`}>
                          {type.label}
                        </div>
                        <div className="text-xs text-slate-500">{type.description}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* בחירת עמודות */}
              <div className="grid grid-cols-2 gap-6">
                {/* ציר X */}
                <div>
                  <label className="text-sm font-semibold mb-2 block">ציר X (קטגוריות) *</label>
                  <Select value={chartConfig.xAxisColumn} onValueChange={(value) => setChartConfig({ ...chartConfig, xAxisColumn: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="בחר עמודה..." />
                    </SelectTrigger>
                    <SelectContent>
                      {columns.map(col => (
                        <SelectItem key={col.key} value={col.key}>
                          {col.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* ציר Y */}
                <div>
                  <label className="text-sm font-semibold mb-2 block">
                    ציר Y (ערכים מספריים) * 
                    <span className="text-xs text-slate-500 font-normal mr-2">
                      ({chartConfig.yAxisColumns.length} נבחרו)
                    </span>
                  </label>
                  <ScrollArea className="h-48 border border-slate-200 rounded-lg p-2">
                    <div className="space-y-1">
                      {numericColumns.length === 0 ? (
                        <div className="text-sm text-slate-500 text-center py-4">
                          לא נמצאו עמודות מספריות
                        </div>
                      ) : (
                        numericColumns.map(col => (
                          <button
                            key={col.key}
                            onClick={() => toggleYColumn(col.key)}
                            className={`w-full text-right px-3 py-2 rounded-lg transition-all ${
                              chartConfig.yAxisColumns.includes(col.key)
                                ? 'bg-purple-100 border-2 border-purple-500 text-purple-900'
                                : 'bg-white hover:bg-slate-50 border border-slate-200'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{col.title}</span>
                              {chartConfig.yAxisColumns.includes(col.key) && (
                                <span className="text-purple-600">✓</span>
                              )}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="style" className="space-y-6 m-0">
              {/* ערכת צבעים */}
              <div>
                <label className="text-sm font-semibold mb-3 block">ערכת צבעים</label>
                <div className="grid grid-cols-4 gap-3">
                  {Object.entries(COLOR_SCHEMES).map(([key, colors]) => (
                    <button
                      key={key}
                      onClick={() => setChartConfig({ ...chartConfig, colorScheme: key, customColors: [] })}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        chartConfig.colorScheme === key && chartConfig.customColors.length === 0
                          ? 'border-purple-500 shadow-lg'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex gap-1 h-8 mb-2">
                        {colors.slice(0, 5).map((color, idx) => (
                          <div key={idx} className="flex-1 rounded" style={{ backgroundColor: color }} />
                        ))}
                      </div>
                      <div className="text-xs font-semibold capitalize">{key}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* גודל */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold mb-2 block">רוחב (px)</label>
                  <Input
                    type="number"
                    value={chartConfig.width}
                    onChange={(e) => setChartConfig({ ...chartConfig, width: Number(e.target.value) })}
                    min={300}
                    max={1200}
                    step={50}
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold mb-2 block">גובה (px)</label>
                  <Input
                    type="number"
                    value={chartConfig.height}
                    onChange={(e) => setChartConfig({ ...chartConfig, height: Number(e.target.value) })}
                    min={200}
                    max={800}
                    step={50}
                  />
                </div>
              </div>

              {/* אפשרויות תצוגה */}
              <div className="space-y-3 bg-slate-50 p-4 rounded-lg">
                <h4 className="font-semibold text-sm mb-3">אפשרויות תצוגה</h4>
                
                <div className="flex items-center justify-between">
                  <label className="text-sm">הצג מקרא</label>
                  <Switch
                    checked={chartConfig.showLegend}
                    onCheckedChange={(checked) => setChartConfig({ ...chartConfig, showLegend: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-sm">הצג רשת</label>
                  <Switch
                    checked={chartConfig.showGrid}
                    onCheckedChange={(checked) => setChartConfig({ ...chartConfig, showGrid: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-sm">הצג Tooltip</label>
                  <Switch
                    checked={chartConfig.showTooltip}
                    onCheckedChange={(checked) => setChartConfig({ ...chartConfig, showTooltip: checked })}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="preview" className="m-0">
              <div className="bg-white p-6 rounded-xl border-2 border-slate-200 shadow-inner">
                <div className="text-center mb-4">
                  <h3 className="text-lg font-bold text-slate-900">{chartConfig.name || 'גרף ללא שם'}</h3>
                  <p className="text-sm text-slate-500">
                    {CHART_TYPES.find(t => t.value === chartConfig.type)?.label} • {chartData.length} נקודות נתונים
                  </p>
                </div>
                {renderChart()}
              </div>
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            ביטול
          </Button>
          <Button 
            onClick={handleSave}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 gap-2"
          >
            <BarChart3 className="w-4 h-4" />
            {editingChart ? 'עדכן גרף' : 'צור גרף'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}