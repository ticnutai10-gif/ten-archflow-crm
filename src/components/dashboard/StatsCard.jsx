import React from 'react';
import { Card, CardHeader } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";

const colorMap = {
  blue: {
    bg: 'bg-blue-500',
    light: 'bg-blue-50',
    text: 'text-blue-600',
    iconBg: 'bg-blue-100'
  },
  green: {
    bg: 'bg-green-500',
    light: 'bg-green-50',
    text: 'text-green-600',
    iconBg: 'bg-green-100'
  },
  amber: {
    bg: 'bg-amber-500',
    light: 'bg-amber-50',
    text: 'text-amber-600',
    iconBg: 'bg-amber-100'
  },
  purple: {
    bg: 'bg-purple-500',
    light: 'bg-purple-50',
    text: 'text-purple-600',
    iconBg: 'bg-purple-100'
  }
};

export default function StatsCard({ title, value, icon: Icon, color, trend, to, onClick }) {
  const colors = colorMap[color] || colorMap.blue;

  const content = (
    <Card
      onClick={onClick}
      className={`shadow-lg border-0 bg-white/80 backdrop-blur-sm hover:shadow-xl transition-all duration-300 group rounded-2xl ${to || onClick ? 'cursor-pointer' : ''}`}
    >
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="text-right flex-1">
            <p className="text-sm font-medium text-slate-600 mb-1">{title}</p>
            <div className="text-3xl font-bold text-slate-900 mb-2">{value}</div>
          </div>
        </div>
        
        {trend && (
          <div className="flex items-center gap-2 text-sm">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <span className="text-slate-600 font-medium">{trend}</span>
          </div>
        )}
      </CardHeader>
    </Card>
  );

  return to ? (
    <Link to={to} className="block">{content}</Link>
  ) : content;
}