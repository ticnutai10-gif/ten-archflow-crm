import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Briefcase, DollarSign, CheckSquare, Filter } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function StatsWidget({ 
  stats, 
  displayedClientCount, 
  clientFilter, 
  setClientFilter, 
  clientFilterLabel,
  isMobile 
}) {
  return (
    <Card className="h-full bg-white shadow-md hover:shadow-lg transition-shadow">
      <CardHeader className="border-b pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="text-base font-bold text-slate-700">מבט על</CardTitle>
          <div className="flex gap-1">
             <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-blue-600">
                  <Filter className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setClientFilter('all')}>כל הלקוחות</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setClientFilter('active')}>לקוחות פעילים</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setClientFilter('potential')}>לקוחות פוטנציאליים</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="grid grid-cols-2 gap-4">
          {/* Clients */}
          <Link to={createPageUrl("Clients")} className="flex flex-col p-3 rounded-lg bg-emerald-50 hover:bg-emerald-100 transition-colors">
            <div className="flex items-center gap-2 mb-1 text-emerald-700">
              <Users className="w-4 h-4" />
              <span className="text-xs font-medium">לקוחות</span>
            </div>
            <div className="text-2xl font-bold text-emerald-900">{displayedClientCount}</div>
            <div className="text-[10px] text-emerald-600 truncate">{clientFilterLabel}</div>
          </Link>

          {/* Projects */}
          <Link to={createPageUrl("Projects")} className="flex flex-col p-3 rounded-lg bg-orange-50 hover:bg-orange-100 transition-colors">
            <div className="flex items-center gap-2 mb-1 text-orange-700">
              <Briefcase className="w-4 h-4" />
              <span className="text-xs font-medium">פרויקטים</span>
            </div>
            <div className="text-2xl font-bold text-orange-900">{stats.projects}</div>
            <div className="text-[10px] text-orange-600">פעילים</div>
          </Link>

          {/* Quotes */}
          <Link to={createPageUrl("Quotes")} className="flex flex-col p-3 rounded-lg bg-green-50 hover:bg-green-100 transition-colors">
            <div className="flex items-center gap-2 mb-1 text-green-700">
              <DollarSign className="w-4 h-4" />
              <span className="text-xs font-medium">הצעות</span>
            </div>
            <div className="text-2xl font-bold text-green-900">{stats.quotes}</div>
            <div className="text-[10px] text-green-600">בהמתנה</div>
          </Link>

          {/* Tasks */}
          <Link to={createPageUrl("Tasks")} className="flex flex-col p-3 rounded-lg bg-yellow-50 hover:bg-yellow-100 transition-colors">
            <div className="flex items-center gap-2 mb-1 text-yellow-700">
              <CheckSquare className="w-4 h-4" />
              <span className="text-xs font-medium">משימות</span>
            </div>
            <div className="text-2xl font-bold text-yellow-900">{stats.tasks}</div>
            <div className="text-[10px] text-yellow-600">פתוחות</div>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}