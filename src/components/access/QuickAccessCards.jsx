import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Shield, Briefcase, UserCheck } from "lucide-react";

export default function QuickAccessCards({ stats }) {
  const cards = [
    {
      title: "סה\"כ משתמשים",
      value: stats.total,
      active: stats.active,
      icon: Users,
      color: "blue"
    },
    {
      title: "מנהלים",
      value: stats.superAdmins + stats.admins,
      icon: Shield,
      color: "indigo"
    },
    {
      title: "עובדים",
      value: stats.staff,
      icon: Briefcase,
      color: "green"
    },
    {
      title: "לקוחות",
      value: stats.clients,
      icon: UserCheck,
      color: "emerald"
    }
  ];

  const colorClasses = {
    blue: "bg-blue-100 text-blue-600",
    indigo: "bg-indigo-100 text-indigo-600",
    green: "bg-green-100 text-green-600",
    emerald: "bg-emerald-100 text-emerald-600"
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, i) => (
        <Card key={i} className="shadow-lg border-0 bg-white/90 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 mb-1">{card.title}</p>
                <div className="text-3xl font-bold text-slate-900">{card.value}</div>
                {card.active !== undefined && (
                  <p className="text-xs text-slate-500 mt-1">{card.active} פעילים</p>
                )}
              </div>
              <div className={`p-3 rounded-xl ${colorClasses[card.color]}`}>
                <card.icon className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}