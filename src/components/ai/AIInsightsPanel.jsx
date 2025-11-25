import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  AlertCircle, TrendingUp, Lightbulb, AlertTriangle, 
  CheckCircle, X, Calendar, Mail, Play, Loader2, Sparkles
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { generateAIInsights } from '@/functions/generateAIInsights';

const SEVERITY_COLORS = {
  low: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', badge: 'bg-blue-100' },
  medium: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', badge: 'bg-amber-100' },
  high: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', badge: 'bg-orange-100' },
  critical: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', badge: 'bg-red-100' }
};

const TYPE_ICONS = {
  risk_detection: AlertTriangle,
  opportunity: TrendingUp,
  suggestion: Lightbulb,
  alert: AlertCircle,
  trend: TrendingUp
};

export default function AIInsightsPanel() {
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadInsights();
  }, []);

  const loadInsights = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.AIInsight.filter({ status: 'new' }, '-created_date', 20);
      setInsights(data || []);
    } catch (error) {
      console.error('Error loading insights:', error);
    }
    setLoading(false);
  };

  const generateInsights = async () => {
    setGenerating(true);
    try {
      const response = await generateAIInsights();
      toast.success(`נוצרו ${response.data.insights_generated} תובנות חדשות`);
      await loadInsights();
    } catch (error) {
      console.error('Error generating insights:', error);
      toast.error('שגיאה ביצירת תובנות');
    }
    setGenerating(false);
  };

  const executeAction = async (insight, action) => {
    try {
      console.log('Executing action:', action);
      
      if (action.action_type === 'send_email') {
        // Get client email
        const client = await base44.entities.Client.get(insight.entity_id);
        const params = { ...action.params };
        params.to = params.to?.replace('{{client_email}}', client.email || '');
        
        await base44.integrations.Core.SendEmail(params);
        toast.success('מייל נשלח בהצלחה');
        
      } else if (action.action_type === 'create_task') {
        await base44.entities.Task.create({
          ...action.params,
          client_id: insight.entity_id,
          client_name: insight.entity_name
        });
        toast.success('משימה נוצרה בהצלחה');
        
      } else if (action.action_type === 'schedule_meeting') {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(10, 0, 0, 0);
        
        await base44.entities.Meeting.create({
          title: action.params.title,
          client_id: insight.entity_id,
          client_name: insight.entity_name,
          meeting_date: tomorrow.toISOString(),
          status: 'מתוכננת'
        });
        toast.success('פגישה נקבעה בהצלחה');
      }
      
      // Mark insight as acknowledged
      await base44.entities.AIInsight.update(insight.id, { 
        status: 'acknowledged',
        resolved_at: new Date().toISOString()
      });
      
      loadInsights();
      
    } catch (error) {
      console.error('Error executing action:', error);
      toast.error('שגיאה בביצוע הפעולה');
    }
  };

  const dismissInsight = async (insight) => {
    try {
      await base44.entities.AIInsight.update(insight.id, { status: 'dismissed' });
      toast.info('התובנה נדחתה');
      loadInsights();
    } catch (error) {
      console.error('Error dismissing insight:', error);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-3">
            {Array(3).fill(0).map((_, i) => (
              <div key={i} className="h-24 bg-slate-200 rounded-lg animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            תובנות AI
          </CardTitle>
          <Button
            size="sm"
            onClick={generateInsights}
            disabled={generating}
            className="gap-2 bg-purple-600 hover:bg-purple-700"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                מנתח...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                צור תובנות
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {insights.length === 0 ? (
          <div className="text-center py-8">
            <Lightbulb className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 mb-4">אין תובנות חדשות</p>
            <Button
              size="sm"
              onClick={generateInsights}
              disabled={generating}
              className="gap-2"
            >
              <Sparkles className="w-4 h-4" />
              נתח את הנתונים
            </Button>
          </div>
        ) : (
          <ScrollArea className="h-[500px]">
            <div className="space-y-4 pr-4">
              {insights.map(insight => {
                const Icon = TYPE_ICONS[insight.insight_type] || Lightbulb;
                const colors = SEVERITY_COLORS[insight.severity] || SEVERITY_COLORS.medium;
                
                return (
                  <Card key={insight.id} className={`border-2 ${colors.border} ${colors.bg}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-start gap-3 flex-1">
                          <div className={`p-2 rounded-lg ${colors.badge}`}>
                            <Icon className={`w-5 h-5 ${colors.text}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-slate-900 mb-1">{insight.title}</h4>
                            <p className="text-sm text-slate-700 mb-2">{insight.description}</p>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className="text-xs">
                                {insight.entity_type === 'client' ? 'לקוח' : 
                                 insight.entity_type === 'project' ? 'פרויקט' : 
                                 insight.entity_type === 'task' ? 'משימה' : 'כללי'}
                              </Badge>
                              <Badge className={`text-xs ${colors.badge} ${colors.text}`}>
                                {insight.severity === 'critical' ? 'קריטי' :
                                 insight.severity === 'high' ? 'גבוה' :
                                 insight.severity === 'medium' ? 'בינוני' : 'נמוך'}
                              </Badge>
                              {insight.confidence_score && (
                                <Badge variant="outline" className="text-xs">
                                  {insight.confidence_score}% ביטחון
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => dismissInsight(insight)}
                          className="flex-shrink-0"
                        >
                          <X className="w-4 h-4 text-slate-400" />
                        </Button>
                      </div>

                      {/* Suggested Actions */}
                      {insight.suggested_actions && insight.suggested_actions.length > 0 && (
                        <div className="space-y-2 mt-4 pt-4 border-t border-slate-200">
                          <div className="text-xs font-semibold text-slate-600 mb-2">פעולות מוצעות:</div>
                          {insight.suggested_actions.map((action, idx) => (
                            <div key={idx} className="flex items-center justify-between gap-3 bg-white p-3 rounded-lg border">
                              <div className="flex items-center gap-2 flex-1">
                                {action.action_type === 'send_email' && <Mail className="w-4 h-4 text-blue-600" />}
                                {action.action_type === 'create_task' && <CheckCircle className="w-4 h-4 text-green-600" />}
                                {action.action_type === 'schedule_meeting' && <Calendar className="w-4 h-4 text-purple-600" />}
                                <span className="text-sm text-slate-700">{action.description}</span>
                              </div>
                              <Button
                                size="sm"
                                onClick={() => executeAction(insight, action)}
                                className="gap-1 bg-blue-600 hover:bg-blue-700"
                              >
                                <Play className="w-3 h-3" />
                                בצע
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}