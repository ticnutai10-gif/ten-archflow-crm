import React from "react";
import { Card, CardContent } from "@/components/ui/card";

export default function QuickActions({ actions, onActionClick }) {
  const colorClasses = {
    blue: "from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700",
    green: "from-green-500 to-green-600 hover:from-green-600 hover:to-green-700",
    red: "from-red-500 to-red-600 hover:from-red-600 hover:to-red-700",
    purple: "from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700",
    orange: "from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-4xl">
      {actions.map((action, index) => {
        const Icon = action.icon;
        return (
          <Card
            key={index}
            className="cursor-pointer hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-2 border-transparent hover:border-slate-300"
            onClick={() => onActionClick(action.question)}
          >
            <CardContent className="p-6">
              <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${colorClasses[action.color]} mb-4 shadow-lg`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-bold text-slate-900 mb-2">{action.label}</h3>
              <p className="text-xs text-slate-600 line-clamp-2">{action.question}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}