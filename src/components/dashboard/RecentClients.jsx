import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Eye, ArrowLeft } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const statusColors = {
  'פוטנציאלי': 'bg-amber-100 text-amber-800 border-amber-200',
  'פעיל': 'bg-green-100 text-green-800 border-green-200',
  'לא פעיל': 'bg-slate-100 text-slate-800 border-slate-200'
};

export default function RecentClients({ clients, isLoading }) {
  const [limit, setLimit] = useState("10");
  const [statusFilter, setStatusFilter] = useState("all");

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-16 bg-slate-200 rounded-lg"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const filteredClients = clients
    .filter(client => statusFilter === 'all' || client.status === statusFilter)
    .slice(0, parseInt(limit));

  if (filteredClients.length === 0) {
    return (
      <div className="p-6 text-center text-slate-500">
        <Users className="w-12 h-12 mx-auto mb-3 text-slate-400" />
        <p className="text-sm">אין לקוחות להצגה</p>
      </div>
    );
  }

  return (
    <div className="p-4" dir="rtl">
      <div className="flex items-center gap-3 mb-4">
        <Select value={limit} onValueChange={setLimit}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10 לקוחות</SelectItem>
            <SelectItem value="20">20 לקוחות</SelectItem>
            <SelectItem value="30">30 לקוחות</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל הסטטוסים</SelectItem>
            <SelectItem value="פוטנציאלי">פוטנציאלי</SelectItem>
            <SelectItem value="פעיל">פעיל</SelectItem>
            <SelectItem value="לא פעיל">לא פעיל</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        {filteredClients.map((client) => (
          <div
            key={client.id}
            className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-lg border border-slate-100 transition-colors group"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-slate-900 truncate">
                  {client.name}
                </h4>
                <Badge variant="outline" className={statusColors[client.status] || 'bg-slate-100 text-slate-800'}>
                  {client.status}
                </Badge>
              </div>
              {client.company && (
                <p className="text-sm text-slate-600 truncate mt-1">
                  {client.company}
                </p>
              )}
              {client.phone && (
                <p className="text-xs text-slate-500 mt-1">
                  {client.phone}
                </p>
              )}
            </div>

            <Link to={createPageUrl(`Clients`)}>
              <Button
                variant="ghost"
                size="sm"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Eye className="w-4 h-4 ml-1" />
                צפה
              </Button>
            </Link>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t">
        <Link to={createPageUrl("Clients")}>
          <Button variant="outline" className="w-full gap-2">
            <ArrowLeft className="w-4 h-4" />
            כל הלקוחות
          </Button>
        </Link>
      </div>
    </div>
  );
}