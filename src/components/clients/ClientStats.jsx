import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserCheck, UserX, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function ClientStats({ clients = [], isLoading }) {
  useEffect(() => {
    console.log('📊 [ClientStats] Received clients:', {
      clientsCount: clients?.length,
      clientsType: typeof clients,
      isArray: Array.isArray(clients),
      clients
    });

    if (clients && Array.isArray(clients)) {
      clients.forEach((client, index) => {
        if (!client) {
          console.error(`❌ [ClientStats] Client at index ${index} is null/undefined!`);
        } else if (typeof client !== 'object') {
          console.error(`❌ [ClientStats] Client at index ${index} is not an object:`, client);
        } else {
          console.log(`✅ [ClientStats] Client ${index}:`, {
            id: client.id,
            status: client.status,
            hasStatus: 'status' in client
          });
        }
      });
    }
  }, [clients]);

  const validClients = (clients || []).filter(c => c && typeof c === 'object');
  
  const stats = {
    total: validClients.length,
    active: validClients.filter(c => c?.status === 'פעיל').length,
    potential: validClients.filter(c => c?.status === 'פוטנציאלי').length,
    inactive: validClients.filter(c => c?.status === 'לא פעיל').length
  };

  console.log('📊 [ClientStats] Calculated stats:', stats);

  const statsData = [
    {
      title: "סה\"ח לקוחות",
      value: stats.total,
      icon: Users,
      color: "#2C3A50"
    },
    {
      title: "לקוחות פעילים",
      value: stats.active,
      icon: UserCheck,
      color: "#2C3A50"
    },
    {
      title: "לקוחות פוטנציאליים",
      value: stats.potential,
      icon: TrendingUp,
      color: "#2C3A50"
    },
    {
      title: "לקוחות לא פעילים",
      value: stats.inactive,
      icon: UserX,
      color: "#2C3A50"
    }
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {Array(4).fill(0).map((_, i) => (
          <Card key={i} className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-8 w-16" />
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {statsData.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index} className="shadow-lg border-0 bg-white/80 backdrop-blur-sm hover:shadow-xl transition-all duration-300 group">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div className="text-right flex-1">
                  <p className="text-sm font-medium text-slate-600 mb-1">{stat.title}</p>
                  <div className="text-3xl font-bold text-slate-900">{stat.value}</div>
                </div>
                <Icon className="w-6 h-6" style={{ color: stat.color }} />
              </div>
            </CardHeader>
          </Card>
        );
      })}
    </div>
  );
}