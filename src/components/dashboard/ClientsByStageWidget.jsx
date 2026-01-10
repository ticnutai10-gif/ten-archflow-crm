import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, TrendingUp, ChevronLeft, BarChart3,
  UserCheck, UserX, UserPlus, Clock
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';

const STAGE_COLORS = {
  "ברור תכן": "#3b82f6",
  "תכנון": "#8b5cf6", 
  "היתרים": "#f59e0b",
  "ביצוע": "#10b981",
  "מעקב": "#06b6d4",
  "הושלם": "#6b7280",
  "default": "#94a3b8"
};

const STATUS_CONFIG = {
  "פוטנציאלי": { color: "#3b82f6", icon: UserPlus, bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  "פעיל": { color: "#10b981", icon: UserCheck, bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  "לא פעיל": { color: "#6b7280", icon: UserX, bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-200" }
};

export default function ClientsByStageWidget() {
  const [clients, setClients] = useState([]);
  const [dataTypes, setDataTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("stage");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [clientsData, typesData] = await Promise.all([
        base44.entities.Client.list('-created_date', 500),
        base44.entities.GlobalDataType.filter({ type_key: 'stages' })
      ]);
      setClients(clientsData || []);
      setDataTypes(typesData || []);
    } catch (error) {
      console.error('Error loading clients:', error);
    }
    setLoading(false);
  };

  // Get stage options from GlobalDataType
  const stageOptions = useMemo(() => {
    const stagesType = dataTypes.find(t => t.type_key === 'stages');
    if (stagesType?.options) {
      return stagesType.options.map(opt => ({
        value: opt.value || opt.label,
        label: opt.label,
        color: opt.color || STAGE_COLORS[opt.label] || STAGE_COLORS.default
      }));
    }
    return Object.keys(STAGE_COLORS).filter(k => k !== 'default').map(k => ({
      value: k, label: k, color: STAGE_COLORS[k]
    }));
  }, [dataTypes]);

  // Calculate clients by stage
  const clientsByStage = useMemo(() => {
    const counts = {};
    stageOptions.forEach(opt => { counts[opt.label] = 0; });
    counts['ללא שלב'] = 0;
    
    clients.forEach(client => {
      const stage = client.stage || 'ללא שלב';
      if (counts[stage] !== undefined) {
        counts[stage]++;
      } else {
        counts['ללא שלב']++;
      }
    });

    return Object.entries(counts)
      .filter(([_, count]) => count > 0)
      .map(([name, value]) => {
        const opt = stageOptions.find(o => o.label === name);
        return {
          name,
          value,
          color: opt?.color || STAGE_COLORS.default
        };
      })
      .sort((a, b) => b.value - a.value);
  }, [clients, stageOptions]);

  // Calculate clients by status
  const clientsByStatus = useMemo(() => {
    const counts = { "פוטנציאלי": 0, "פעיל": 0, "לא פעיל": 0 };
    
    clients.forEach(client => {
      const status = client.status || "פוטנציאלי";
      if (counts[status] !== undefined) {
        counts[status]++;
      }
    });

    return Object.entries(counts).map(([name, value]) => ({
      name,
      value,
      color: STATUS_CONFIG[name]?.color || "#94a3b8"
    }));
  }, [clients]);

  const totalClients = clients.length;
  const activeClients = clients.filter(c => c.status === 'פעיל').length;
  const potentialClients = clients.filter(c => c.status === 'פוטנציאלי').length;

  if (loading) {
    return (
      <Card className="h-full bg-white shadow-md">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-slate-200 rounded w-1/3"></div>
            <div className="h-40 bg-slate-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full bg-white shadow-md hover:shadow-lg transition-shadow overflow-hidden">
      <CardHeader className="border-b pb-3 bg-gradient-to-l from-blue-50 to-transparent">
        <div className="flex justify-between items-center">
          <CardTitle className="text-base font-bold text-slate-700 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            ניתוח לקוחות
          </CardTitle>
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            {totalClients} לקוחות
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="p-4">
        {/* Quick Stats Row */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="text-center p-2 bg-emerald-50 rounded-lg">
            <div className="text-lg font-bold text-emerald-700">{activeClients}</div>
            <div className="text-[10px] text-emerald-600">פעילים</div>
          </div>
          <div className="text-center p-2 bg-blue-50 rounded-lg">
            <div className="text-lg font-bold text-blue-700">{potentialClients}</div>
            <div className="text-[10px] text-blue-600">פוטנציאליים</div>
          </div>
          <div className="text-center p-2 bg-slate-50 rounded-lg">
            <div className="text-lg font-bold text-slate-700">{totalClients - activeClients - potentialClients}</div>
            <div className="text-[10px] text-slate-600">לא פעילים</div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full mb-4 grid grid-cols-2">
            <TabsTrigger value="stage" className="text-xs gap-1">
              <TrendingUp className="w-3 h-3" />
              לפי שלב
            </TabsTrigger>
            <TabsTrigger value="status" className="text-xs gap-1">
              <BarChart3 className="w-3 h-3" />
              לפי סטטוס
            </TabsTrigger>
          </TabsList>

          <TabsContent value="stage" className="mt-0">
            {clientsByStage.length > 0 ? (
              <div className="space-y-3">
                {/* Mini Pie Chart */}
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie
                      data={clientsByStage}
                      cx="50%"
                      cy="50%"
                      innerRadius={35}
                      outerRadius={60}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {clientsByStage.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} לקוחות`, '']} />
                  </PieChart>
                </ResponsiveContainer>

                {/* Legend */}
                <div className="grid grid-cols-2 gap-1">
                  {clientsByStage.slice(0, 6).map((item, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 text-xs">
                      <div 
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-slate-600 truncate">{item.name}</span>
                      <span className="font-semibold text-slate-900 mr-auto">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center text-slate-500 py-8 text-sm">
                אין נתונים להצגה
              </div>
            )}
          </TabsContent>

          <TabsContent value="status" className="mt-0">
            <div className="space-y-3">
              {clientsByStatus.map((item, idx) => {
                const config = STATUS_CONFIG[item.name] || {};
                const Icon = config.icon || Users;
                const percentage = totalClients > 0 ? Math.round((item.value / totalClients) * 100) : 0;
                
                return (
                  <div 
                    key={idx} 
                    className={`p-3 rounded-lg ${config.bg || 'bg-slate-50'} border ${config.border || 'border-slate-200'}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Icon className={`w-4 h-4 ${config.text || 'text-slate-600'}`} />
                        <span className={`font-medium ${config.text || 'text-slate-700'}`}>{item.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-bold" style={{ color: item.color }}>{item.value}</span>
                        <Badge variant="outline" className="text-[10px]">{percentage}%</Badge>
                      </div>
                    </div>
                    <div className="w-full bg-white/50 rounded-full h-2">
                      <div 
                        className="h-2 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%`, backgroundColor: item.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>

        {/* View All Link */}
        <Link to={createPageUrl('Clients')}>
          <Button variant="ghost" size="sm" className="w-full mt-4 text-blue-600 hover:text-blue-700 hover:bg-blue-50 gap-1">
            צפה בכל הלקוחות
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}