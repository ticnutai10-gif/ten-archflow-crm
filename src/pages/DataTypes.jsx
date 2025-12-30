import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Circle, FileText, ArrowLeftRight, ShoppingCart, ArrowRight } from "lucide-react";
import DataTypeManager from "@/components/settings/DataTypeManager";
import { useNavigate } from "react-router-dom";

export default function DataTypesPage() {
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState(null);

  const types = [
    { key: "stages", label: "שלבים (מואר)", icon: Circle, color: "text-purple-600", bg: "bg-purple-100", description: "ניהול שלבי התקדמות בפרויקטים ולקוחות" },
    { key: "taba", label: "תב״ע", icon: FileText, color: "text-blue-600", bg: "bg-blue-100", description: "ניהול סטטוסים ותהליכי תכנון בניין עיר" },
    { key: "transfer_rights", label: "העברת זכויות", icon: ArrowLeftRight, color: "text-green-600", bg: "bg-green-100", description: "ניהול שלבי העברת זכויות בין גורמים" },
    { key: "purchase_rights", label: "רכישת זכויות", icon: ShoppingCart, color: "text-orange-600", bg: "bg-orange-100", description: "ניהול תהליכי רכישת זכויות בנייה" }
  ];

  return (
    <div className="container mx-auto py-8 px-4" dir="rtl">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" onClick={() => navigate(-1)} className="rounded-full h-10 w-10 p-0">
          <ArrowRight className="w-6 h-6" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">ניהול סוגי נתונים</h1>
          <p className="text-slate-500 mt-1">הגדרת קטגוריות, תתי-קטגוריות וצבעים למערכת</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {types.map((type) => (
          <Card 
            key={type.key} 
            className="cursor-pointer hover:shadow-lg transition-all hover:border-purple-200 group"
            onClick={() => setSelectedType(type)}
          >
            <CardHeader className="flex flex-row items-center gap-4 pb-2">
              <div className={`p-3 rounded-xl ${type.bg} group-hover:scale-110 transition-transform`}>
                <type.icon className={`w-8 h-8 ${type.color}`} />
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl text-slate-800">{type.label}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-base text-slate-600">
                {type.description}
              </CardDescription>
              <div className="mt-4 flex items-center text-sm font-medium text-purple-600 group-hover:translate-x-[-4px] transition-transform">
                נהל קטגוריות <ArrowRight className="w-4 h-4 mr-1 rotate-180" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedType && (
        <DataTypeManager
          open={!!selectedType}
          onClose={() => setSelectedType(null)}
          typeKey={selectedType.key}
          typeName={selectedType.label}
        />
      )}
    </div>
  );
}