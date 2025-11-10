import React from 'react';
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Target, TrendingUp } from 'lucide-react';

export default function WeeklyGoals() {
  const goals = [
    {
      id: 1,
      title: "סיום 3 פרויקטים",
      completed: 2,
      total: 3,
      status: "בתהליך",
      color: "bg-green-100 text-green-800"
    },
    {
      id: 2,
      title: "שליחת הצעות מחיר",
      completed: 1,
      total: 2,
      status: "בתהליך",
      color: "bg-amber-100 text-amber-800"
    },
    {
      id: 3,
      title: "פגישות לקוחות",
      completed: 3,
      total: 4,
      status: "בתהליך",
      color: "bg-blue-100 text-blue-800"
    },
    {
      id: 4,
      title: "עדכון תיקי היתרים",
      completed: 5,
      total: 5,
      status: "הושלם",
      color: "bg-green-100 text-green-800"
    }
  ];

  return (
    <div className="h-[400px] flex flex-col">
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="space-y-4">
          {goals.map((goal) => {
            const percentage = (goal.completed / goal.total) * 100;
            const isCompleted = goal.completed === goal.total;
            
            return (
              <div key={goal.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isCompleted ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    ) : (
                      <Target className="w-4 h-4 text-slate-400" />
                    )}
                    <span className="font-medium text-slate-700">{goal.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-600">
                      {goal.completed}/{goal.total}
                    </span>
                    <Badge variant="outline" className={goal.color}>
                      {isCompleted ? 'הושלם' : 'בתהליך'}
                    </Badge>
                  </div>
                </div>
                
                <Progress value={percentage} className="h-2" />
                
                {isCompleted && (
                  <div className="flex items-center gap-1 text-sm text-green-600">
                    <TrendingUp className="w-3 h-3" />
                    <span>יעד הושג בהצלחה!</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Fixed footer */}
      <div className="flex-shrink-0 px-6 pb-4 pt-4 border-t border-slate-100">
        <div className="bg-slate-50 rounded-lg p-4">
          <h4 className="font-semibold text-slate-800 mb-2 text-sm">סיכום השבוע</h4>
          <div className="text-sm text-slate-600 space-y-1">
            <p>• {goals.filter(g => g.completed === g.total).length} יעדים הושגו מתוך {goals.length}</p>
            <p>• ביצועים כלליים: {Math.round((goals.reduce((sum, g) => sum + g.completed, 0) / goals.reduce((sum, g) => sum + g.total, 0)) * 100)}%</p>
          </div>
        </div>
      </div>
    </div>
  );
}