import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit2, Trash2, Download, Maximize2 } from "lucide-react";
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

const COLOR_SCHEMES = {
  vibrant: ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6'],
  pastel: ['#a78bfa', '#7dd3fc', '#6ee7b7', '#fcd34d', '#fca5a5', '#f9a8d4', '#c4b5fd'],
  ocean: ['#0ea5e9', '#0284c7', '#0369a1', '#075985', '#0c4a6e', '#082f49', '#0e7490'],
  forest: ['#10b981', '#059669', '#047857', '#065f46', '#064e3b', '#022c22', '#14532d'],
  sunset: ['#f59e0b', '#f97316', '#ef4444', '#dc2626', '#b91c1c', '#991b1b', '#7c2d12'],
  purple: ['#a855f7', '#9333ea', '#7e22ce', '#6b21a8', '#581c87', '#4c1d95', '#3b0764'],
  mono: ['#1e293b', '#334155', '#475569', '#64748b', '#94a3b8', '#cbd5e1', '#e2e8f0']
};

export default function ChartViewer({ chart, rowsData, columns, onEdit, onDelete, onExport }) {
  const colors = chart.customColors?.length > 0 
    ? chart.customColors 
    : COLOR_SCHEMES[chart.colorScheme] || COLOR_SCHEMES.vibrant;

  // הכנת נתונים
  const chartData = React.useMemo(() => {
    if (!chart.xAxisColumn || !chart.yAxisColumns?.length) return [];

    return rowsData
      .map(row => {
        const dataPoint = {
          name: String(row[chart.xAxisColumn] || '')
        };
        
        chart.yAxisColumns.forEach(colKey => {
          const value = Number(row[colKey]);
          if (!isNaN(value)) {
            const col = columns.find(c => c.key === colKey);
            dataPoint[col?.title || colKey] = value;
          }
        });
        
        return dataPoint;
      })
      .filter(point => Object.keys(point).length > 1);
  }, [rowsData, chart.xAxisColumn, chart.yAxisColumns, columns]);

  const yColumns = (chart.yAxisColumns || [])
    .map(colKey => columns.find(c => c.key === colKey))
    .filter(Boolean);

  const handleExport = () => {
    // המרת הגרף לתמונה (באמצעות Canvas API או ספרייה חיצונית)
    // כרגע נעשה ייצוא של הנתונים ל-CSV
    const csv = [
      ['שם', ...yColumns.map(c => c.title)].join(','),
      ...chartData.map(item => [
        item.name,
        ...yColumns.map(col => item[col.title] || '')
      ].join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${chart.name}.csv`;
    link.click();
    
    if (onExport) onExport(chart);
  };

  const renderChart = () => {
    if (chartData.length === 0) return null;

    const commonProps = {
      data: chartData,
      margin: { top: 20, right: 30, left: 20, bottom: 20 }
    };

    switch (chart.type) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={chart.height || 400}>
            <BarChart {...commonProps}>
              {chart.showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />}
              <XAxis dataKey="name" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              {chart.showTooltip && <Tooltip />}
              {chart.showLegend && <Legend />}
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
          <ResponsiveContainer width="100%" height={chart.height || 400}>
            <LineChart {...commonProps}>
              {chart.showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />}
              <XAxis dataKey="name" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              {chart.showTooltip && <Tooltip />}
              {chart.showLegend && <Legend />}
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
          <ResponsiveContainer width="100%" height={chart.height || 400}>
            <AreaChart {...commonProps}>
              {chart.showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />}
              <XAxis dataKey="name" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              {chart.showTooltip && <Tooltip />}
              {chart.showLegend && <Legend />}
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
          <ResponsiveContainer width="100%" height={chart.height || 400}>
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
              {chart.showTooltip && <Tooltip />}
              {chart.showLegend && <Legend />}
            </PieChart>
          </ResponsiveContainer>
        );

      case 'scatter':
        return (
          <ResponsiveContainer width="100%" height={chart.height || 400}>
            <ScatterChart {...commonProps}>
              {chart.showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />}
              <XAxis dataKey="name" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              {chart.showTooltip && <Tooltip />}
              {chart.showLegend && <Legend />}
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
          <ResponsiveContainer width="100%" height={chart.height || 400}>
            <RadarChart {...commonProps} cx="50%" cy="50%" outerRadius="80%">
              <PolarGrid stroke="#e2e8f0" />
              <PolarAngleAxis dataKey="name" />
              <PolarRadiusAxis />
              {chart.showTooltip && <Tooltip />}
              {chart.showLegend && <Legend />}
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
    <Card className="shadow-lg hover:shadow-xl transition-all">
      <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-white">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{chart.name}</CardTitle>
          <div className="flex gap-2">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onEdit(chart)}
              className="h-8 w-8"
              title="ערוך גרף"
            >
              <Edit2 className="w-4 h-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={handleExport}
              className="h-8 w-8"
              title="ייצא נתונים"
            >
              <Download className="w-4 h-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onDelete(chart.id)}
              className="h-8 w-8 hover:bg-red-50 hover:text-red-600"
              title="מחק גרף"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {renderChart()}
      </CardContent>
    </Card>
  );
}