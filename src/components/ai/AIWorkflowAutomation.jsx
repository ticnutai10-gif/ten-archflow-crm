import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, FileText, CheckSquare, UserPlus, Calendar, Tag, ArrowRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function AIWorkflowAutomation({ type, context, onActionTaken }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [suggestions, setSuggestions] = useState(null);
  const [input, setInput] = useState('');

  const processWithAI = async () => {
    if (!input.trim()) {
      toast.error('נא להזין טקסט לעיבוד');
      return;
    }

    setIsProcessing(true);
    try {
      const response = await base44.functions.invoke('aiWorkflowAssistant', {
        type,
        input,
        context
      });

      setSuggestions(response.data);
      toast.success('ניתוח הושלם בהצלחה!');
    } catch (error) {
      console.error('AI processing error:', error);
      toast.error('שגיאה בעיבוד: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const executeSuggestion = async (suggestion) => {
    try {
      if (suggestion.action === 'create_task') {
        await base44.entities.Task.create(suggestion.data);
        toast.success('משימה נוצרה בהצלחה!');
      } else if (suggestion.action === 'create_meeting_summary') {
        // Create a decision record or communication message with the summary
        await base44.entities.Decision.create({
          title: `סיכום פגישה - ${new Date().toLocaleDateString('he-IL')}`,
          description: suggestion.data.summary,
          project_name: context?.project_name || '',
          client_name: context?.client_name || ''
        });
        toast.success('סיכום הפגישה נשמר בהצלחה!');
      } else if (suggestion.action === 'assign_category') {
        toast.success(`הקטגוריה "${suggestion.data.category}" הוצעה`);
      }

      if (onActionTaken) {
        onActionTaken(suggestion);
      }
    } catch (error) {
      console.error('Error executing suggestion:', error);
      toast.error('שגיאה בביצוע הפעולה');
    }
  };

  const getTypeConfig = () => {
    switch (type) {
      case 'meeting_summary':
        return {
          title: 'סיכום פגישה אוטומטי',
          placeholder: 'הדבק כאן את תמלול הפגישה או הערות מהפגישה...',
          icon: FileText,
          color: 'text-blue-600'
        };
      case 'task_classification':
        return {
          title: 'סיווג והקצאת משימות',
          placeholder: 'תאר את המשימה או הדרישה החדשה...',
          icon: CheckSquare,
          color: 'text-purple-600'
        };
      case 'action_suggestions':
        return {
          title: 'המלצות פעולה חכמות',
          placeholder: 'תאר את המצב או האתגר הנוכחי...',
          icon: Sparkles,
          color: 'text-green-600'
        };
      default:
        return {
          title: 'AI Assistant',
          placeholder: 'הזן טקסט לעיבוד...',
          icon: Sparkles,
          color: 'text-slate-600'
        };
    }
  };

  const config = getTypeConfig();
  const IconComponent = config.icon;

  return (
    <Card className="border-2 border-slate-200 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg bg-white shadow-sm ${config.color}`}>
            <IconComponent className="w-6 h-6" />
          </div>
          <CardTitle className="text-slate-900">{config.title}</CardTitle>
          <Badge className="mr-auto bg-purple-100 text-purple-700">
            <Sparkles className="w-3 h-3 ml-1" />
            AI מופעל
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-6 space-y-4">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={config.placeholder}
          className="min-h-[150px] text-slate-900 bg-white"
          disabled={isProcessing}
        />

        <Button
          onClick={processWithAI}
          disabled={isProcessing || !input.trim()}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 ml-2 animate-spin" />
              מעבד...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 ml-2" />
              נתח והצע פעולות
            </>
          )}
        </Button>

        {suggestions && (
          <div className="mt-6 space-y-3 animate-in slide-in-from-bottom-2">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <Tag className="w-4 h-4 text-purple-600" />
              המלצות ופעולות מוצעות:
            </h3>

            {suggestions.actions?.map((suggestion, index) => (
              <Card key={index} className="border border-purple-200 bg-purple-50/30">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 text-slate-900">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className="bg-purple-100 text-purple-700">
                          {suggestion.type === 'task' && <CheckSquare className="w-3 h-3 ml-1" />}
                          {suggestion.type === 'meeting' && <Calendar className="w-3 h-3 ml-1" />}
                          {suggestion.type === 'contact' && <UserPlus className="w-3 h-3 ml-1" />}
                          {suggestion.label}
                        </Badge>
                        {suggestion.priority && (
                          <Badge className={
                            suggestion.priority === 'גבוהה' ? 'bg-red-100 text-red-700' :
                            suggestion.priority === 'בינונית' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-green-100 text-green-700'
                          }>
                            {suggestion.priority}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm font-medium mb-1">{suggestion.title}</p>
                      <p className="text-xs text-slate-600">{suggestion.description}</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => executeSuggestion(suggestion)}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {suggestions.summary && (
              <Card className="border border-blue-200 bg-blue-50/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-slate-900">סיכום</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{suggestions.summary}</p>
                </CardContent>
              </Card>
            )}

            {suggestions.categories && (
              <div className="flex flex-wrap gap-2">
                <span className="text-sm text-slate-600">קטגוריות מוצעות:</span>
                {suggestions.categories.map((cat, idx) => (
                  <Badge key={idx} variant="outline" className="bg-white text-slate-700">
                    {cat}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}