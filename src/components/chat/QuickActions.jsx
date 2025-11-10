import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function QuickActions({ actions, onActionClick, insights }) {
  const colorClasses = {
    blue: "from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700",
    green: "from-green-500 to-green-600 hover:from-green-600 hover:to-green-700",
    red: "from-red-500 to-red-600 hover:from-red-600 hover:to-red-700",
    purple: "from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700",
    orange: "from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700",
    teal: "from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700",
    indigo: "from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700"
  };

  // תובנות מהירות
  const insightActions = insights ? [
    {
      icon: () => <span className="text-2xl">⚠️</span>,
      label: "סיכונים דחופים",
      question: "אילו סיכונים דחופים יש לי? תן לי רשימה של דברים שצריך טיפול מיידי",
      color: "red",
      badge: insights.summary?.risks?.length || 0
    },
    {
      icon: () => <span className="text-2xl">🎯</span>,
      label: "ניתוח פרויקטים",
      question: "תן לי ניתוח מתקדם של כל הפרויקטים - סיכונים, חיזויים וחלוקת משאבים",
      color: "indigo"
    },
    {
      icon: () => <span className="text-2xl">🔮</span>,
      label: "חיזוי דדליינים",
      question: "אילו פרויקטים לא יעמדו בדדלין? תן חיזוי מדויק לפי הקצב הנוכחי",
      color: "purple"
    },
    {
      icon: () => <span className="text-2xl">💡</span>,
      label: "המלצות אופטימיזציה",
      question: "איך אפשר לייעל את הפרויקטים? תן לי המלצות קונקרטיות עם מספרים",
      color: "green",
      badge: insights.opportunities?.length || 0
    },
    {
      icon: () => <span className="text-2xl">📊</span>,
      label: "ניתוח משאבים",
      question: "תן לי ניתוח של הקצאת המשאבים - איפה יש חוסר ואיפה עודף?",
      color: "teal"
    },
    {
      icon: () => <span className="text-2xl">💰</span>,
      label: "ניתוח פיננסי",
      question: "תן לי ניתוח פיננסי מפורט - הכנסות, חשבוניות, מגמות ורווחיות",
      color: "purple"
    }
  ] : [];

  const allActions = [...(insights ? insightActions : []), ...actions];

  return (
    <div className="w-full max-w-4xl space-y-6">
      {insights && (
        <div className="text-center mb-4">
          <h3 className="text-lg font-bold text-slate-900 mb-2">🎯 תובנות ופעולות מהירות</h3>
          <p className="text-sm text-slate-600">לחץ לקבלת ניתוח מפורט או בקש פעולה</p>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {allActions.map((action, index) => {
          const Icon = action.icon;
          return (
            <Card
              key={index}
              className="cursor-pointer hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-2 border-transparent hover:border-slate-300 relative"
              onClick={() => onActionClick(action.question)}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${colorClasses[action.color]} shadow-lg`}>
                    {typeof Icon === 'function' ? <Icon className="w-6 h-6 text-white" /> : Icon}
                  </div>
                  {action.badge !== undefined && action.badge > 0 && (
                    <Badge variant="destructive" className="absolute top-2 left-2">
                      {action.badge}
                    </Badge>
                  )}
                </div>
                <h3 className="font-bold text-slate-900 mb-2">{action.label}</h3>
                <p className="text-xs text-slate-600 line-clamp-2">{action.question}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}