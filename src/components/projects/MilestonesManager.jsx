import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  Flag, Plus, Trash2, Calendar, CheckCircle2, Circle,
  ChevronDown, ChevronUp, Edit2, Save, X
} from "lucide-react";
import { format, isPast, isToday } from "date-fns";
import { he } from "date-fns/locale";

export default function MilestonesManager({ milestones = [], onChange, readOnly = false }) {
  const [expandedId, setExpandedId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [newMilestone, setNewMilestone] = useState({
    name: '',
    due_date: '',
    description: '',
    budget_allocation: 0
  });
  const [showAddForm, setShowAddForm] = useState(false);

  const completedCount = milestones.filter(m => m.completed).length;
  const progressPercent = milestones.length > 0 ? Math.round((completedCount / milestones.length) * 100) : 0;

  const addMilestone = () => {
    if (!newMilestone.name.trim()) return;
    const milestone = {
      ...newMilestone,
      id: Date.now().toString(),
      completed: false,
      budget_allocation: Number(newMilestone.budget_allocation) || 0
    };
    onChange([...milestones, milestone]);
    setNewMilestone({ name: '', due_date: '', description: '', budget_allocation: 0 });
    setShowAddForm(false);
  };

  const toggleComplete = (id) => {
    onChange(milestones.map(m => 
      m.id === id 
        ? { ...m, completed: !m.completed, completed_date: !m.completed ? new Date().toISOString().split('T')[0] : null }
        : m
    ));
  };

  const updateMilestone = (id, updates) => {
    onChange(milestones.map(m => m.id === id ? { ...m, ...updates } : m));
  };

  const deleteMilestone = (id) => {
    if (confirm('האם למחוק את אבן הדרך?')) {
      onChange(milestones.filter(m => m.id !== id));
    }
  };

  const getStatusColor = (milestone) => {
    if (milestone.completed) return 'bg-green-100 text-green-700 border-green-200';
    if (milestone.due_date && isPast(new Date(milestone.due_date)) && !isToday(new Date(milestone.due_date))) {
      return 'bg-red-100 text-red-700 border-red-200';
    }
    if (milestone.due_date && isToday(new Date(milestone.due_date))) {
      return 'bg-amber-100 text-amber-700 border-amber-200';
    }
    return 'bg-blue-100 text-blue-700 border-blue-200';
  };

  return (
    <Card className="shadow-lg border-0">
      <CardHeader className="border-b bg-gradient-to-l from-purple-50 to-white pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3 text-xl">
            <Flag className="w-6 h-6 text-purple-600" />
            אבני דרך
            <Badge variant="outline" className="mr-2">
              {completedCount}/{milestones.length}
            </Badge>
          </CardTitle>
          {!readOnly && (
            <Button 
              size="sm" 
              onClick={() => setShowAddForm(!showAddForm)}
              className="gap-2 bg-purple-600 hover:bg-purple-700"
            >
              <Plus className="w-4 h-4" />
              הוסף אבן דרך
            </Button>
          )}
        </div>
        {milestones.length > 0 && (
          <div className="mt-4">
            <div className="flex justify-between text-sm text-slate-600 mb-2">
              <span>התקדמות כללית</span>
              <span>{progressPercent}%</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>
        )}
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        {/* Add Form */}
        {showAddForm && !readOnly && (
          <div className="bg-purple-50 rounded-xl p-4 space-y-3 border-2 border-purple-200">
            <Input
              placeholder="שם אבן הדרך"
              value={newMilestone.name}
              onChange={(e) => setNewMilestone({ ...newMilestone, name: e.target.value })}
              className="bg-white"
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                type="date"
                value={newMilestone.due_date}
                onChange={(e) => setNewMilestone({ ...newMilestone, due_date: e.target.value })}
                className="bg-white"
              />
              <Input
                type="number"
                placeholder="הקצאת תקציב"
                value={newMilestone.budget_allocation || ''}
                onChange={(e) => setNewMilestone({ ...newMilestone, budget_allocation: e.target.value })}
                className="bg-white"
              />
            </div>
            <Textarea
              placeholder="תיאור (אופציונלי)"
              value={newMilestone.description}
              onChange={(e) => setNewMilestone({ ...newMilestone, description: e.target.value })}
              className="bg-white h-20"
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowAddForm(false)}>
                ביטול
              </Button>
              <Button onClick={addMilestone} className="bg-purple-600 hover:bg-purple-700">
                הוסף
              </Button>
            </div>
          </div>
        )}

        {/* Milestones List */}
        {milestones.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <Flag className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p>עדיין אין אבני דרך מוגדרות</p>
            {!readOnly && <p className="text-sm">הוסף אבני דרך כדי לעקוב אחר התקדמות הפרויקט</p>}
          </div>
        ) : (
          <div className="space-y-2">
            {milestones.map((milestone, index) => (
              <div
                key={milestone.id}
                className={`rounded-xl border-2 transition-all ${getStatusColor(milestone)} ${
                  expandedId === milestone.id ? 'shadow-md' : ''
                }`}
              >
                <div 
                  className="p-3 flex items-center gap-3 cursor-pointer"
                  onClick={() => setExpandedId(expandedId === milestone.id ? null : milestone.id)}
                >
                  {!readOnly && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleComplete(milestone.id);
                      }}
                      className="flex-shrink-0"
                    >
                      {milestone.completed ? (
                        <CheckCircle2 className="w-6 h-6 text-green-600" />
                      ) : (
                        <Circle className="w-6 h-6 text-slate-400 hover:text-purple-600" />
                      )}
                    </button>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <div className={`font-semibold ${milestone.completed ? 'line-through text-slate-500' : ''}`}>
                      {milestone.name}
                    </div>
                    {milestone.due_date && (
                      <div className="text-xs flex items-center gap-1 mt-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(milestone.due_date), 'dd/MM/yyyy', { locale: he })}
                        {milestone.completed && milestone.completed_date && (
                          <span className="text-green-600 mr-2">
                            ✓ הושלם {format(new Date(milestone.completed_date), 'dd/MM/yyyy')}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {milestone.budget_allocation > 0 && (
                    <Badge variant="outline" className="text-xs">
                      ₪{milestone.budget_allocation.toLocaleString()}
                    </Badge>
                  )}

                  {expandedId === milestone.id ? (
                    <ChevronUp className="w-5 h-5 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                  )}
                </div>

                {/* Expanded Details */}
                {expandedId === milestone.id && (
                  <div className="px-3 pb-3 pt-0 border-t border-current/10">
                    {milestone.description && (
                      <p className="text-sm mt-2 text-slate-600">{milestone.description}</p>
                    )}
                    {!readOnly && (
                      <div className="flex gap-2 mt-3 justify-end">
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="text-red-600 hover:bg-red-50"
                          onClick={() => deleteMilestone(milestone.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}