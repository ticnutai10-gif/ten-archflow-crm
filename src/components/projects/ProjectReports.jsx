import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FileText, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle2, 
  Calendar,
  Download,
  Sparkles,
  Loader2,
  Clock,
  Users,
  BarChart3
} from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

export default function ProjectReports({ projectId }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);

  useEffect(() => {
    loadReports();
  }, [projectId]);

  const loadReports = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.ProjectReport.filter(
        { project_id: projectId },
        '-created_date'
      );
      setReports(data);
      if (data.length > 0 && !selectedReport) {
        setSelectedReport(data[0]);
      }
    } catch (error) {
      console.error('Error loading reports:', error);
    }
    setLoading(false);
  };

  const generateReport = async (reportType) => {
    setGenerating(true);
    try {
      const response = await base44.functions.invoke('generateProjectReport', {
        project_id: projectId,
        report_type: reportType
      });

      if (response.data.success) {
        await loadReports();
        setSelectedReport(response.data.report);
      }
    } catch (error) {
      console.error('Error generating report:', error);
      alert('שגיאה ביצירת הדוח: ' + error.message);
    }
    setGenerating(false);
  };

  const getScheduleStatusBadge = (status) => {
    const config = {
      on_time: { label: 'בזמן', className: 'bg-green-100 text-green-800' },
      delayed: { label: 'באיחור', className: 'bg-red-100 text-red-800' },
      ahead: { label: 'מקדימים לוח זמנים', className: 'bg-blue-100 text-blue-800' }
    };
    return config[status] || config.on_time;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold text-slate-900">דוחות AI אוטומטיים</h3>
          <p className="text-sm text-slate-600 mt-1">
            ניתוח חכם של התקדמות הפרויקט, משאבים ולוחות זמנים
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => generateReport('weekly')}
            disabled={generating}
            variant="outline"
            className="gap-2"
          >
            {generating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            דוח שבועי
          </Button>
          <Button
            onClick={() => generateReport('monthly')}
            disabled={generating}
            className="gap-2 bg-blue-600 hover:bg-blue-700"
          >
            {generating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            דוח חודשי
          </Button>
        </div>
      </div>

      {reports.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">
              אין דוחות עדיין
            </h3>
            <p className="text-slate-500 mb-4">
              צור דוח AI ראשון כדי לקבל ניתוח מקצועי של הפרויקט
            </p>
            <div className="flex gap-2 justify-center">
              <Button
                onClick={() => generateReport('weekly')}
                disabled={generating}
                variant="outline"
              >
                צור דוח שבועי
              </Button>
              <Button
                onClick={() => generateReport('monthly')}
                disabled={generating}
              >
                צור דוח חודשי
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Reports list */}
          <div className="lg:col-span-1 space-y-3">
            <h4 className="font-semibold text-slate-700 mb-3">דוחות קודמים</h4>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {reports.map((report) => (
                <Card
                  key={report.id}
                  className={`cursor-pointer transition-all ${
                    selectedReport?.id === report.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'hover:border-slate-300'
                  }`}
                  onClick={() => setSelectedReport(report)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <Badge variant="outline" className="text-xs">
                        {report.report_type === 'weekly' ? 'שבועי' : 'חודשי'}
                      </Badge>
                      <span className="text-xs text-slate-500">
                        {format(new Date(report.created_date), 'dd/MM/yy')}
                      </span>
                    </div>
                    <div className="text-sm text-slate-600 mb-2">
                      {format(new Date(report.period_start), 'dd/MM', { locale: he })} -{' '}
                      {format(new Date(report.period_end), 'dd/MM', { locale: he })}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-blue-100 text-blue-800 text-xs">
                        {report.progress_percentage}% התקדמות
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Selected report details */}
          {selectedReport && (
            <div className="lg:col-span-2">
              <Card className="shadow-lg">
                <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl mb-2">
                        דוח {selectedReport.report_type === 'weekly' ? 'שבועי' : 'חודשי'}
                      </CardTitle>
                      <div className="flex items-center gap-4 text-sm text-slate-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {format(new Date(selectedReport.period_start), 'dd/MM/yyyy', { locale: he })} -{' '}
                          {format(new Date(selectedReport.period_end), 'dd/MM/yyyy', { locale: he })}
                        </div>
                      </div>
                    </div>
                    <Badge {...getScheduleStatusBadge(selectedReport.schedule_status)}>
                      {getScheduleStatusBadge(selectedReport.schedule_status).label}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="p-6 space-y-6">
                  {/* Statistics Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                      <CardContent className="p-4 text-center">
                        <BarChart3 className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-blue-900">
                          {selectedReport.progress_percentage}%
                        </div>
                        <div className="text-xs text-blue-700">התקדמות</div>
                      </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                      <CardContent className="p-4 text-center">
                        <CheckCircle2 className="w-6 h-6 text-green-600 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-green-900">
                          {selectedReport.tasks_completed}
                        </div>
                        <div className="text-xs text-green-700">הושלמו</div>
                      </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
                      <CardContent className="p-4 text-center">
                        <Clock className="w-6 h-6 text-amber-600 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-amber-900">
                          {selectedReport.tasks_in_progress}
                        </div>
                        <div className="text-xs text-amber-700">בתהליך</div>
                      </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                      <CardContent className="p-4 text-center">
                        <Users className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-purple-900">
                          {Math.round(selectedReport.resource_utilization)}%
                        </div>
                        <div className="text-xs text-purple-700">משאבים</div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Summary */}
                  <div className="bg-slate-50 rounded-lg p-4 border-l-4 border-blue-500">
                    <h4 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-blue-600" />
                      סיכום כללי
                    </h4>
                    <p className="text-slate-700 leading-relaxed">
                      {selectedReport.summary}
                    </p>
                  </div>

                  {/* Tabs for details */}
                  <Tabs defaultValue="achievements" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="achievements">הישגים</TabsTrigger>
                      <TabsTrigger value="challenges">אתגרים</TabsTrigger>
                      <TabsTrigger value="recommendations">המלצות</TabsTrigger>
                      <TabsTrigger value="insights">תובנות AI</TabsTrigger>
                    </TabsList>

                    <TabsContent value="achievements" className="space-y-3 mt-4">
                      {selectedReport.achievements?.map((achievement, index) => (
                        <div key={index} className="flex gap-3 items-start">
                          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                          <p className="text-slate-700">{achievement}</p>
                        </div>
                      ))}
                    </TabsContent>

                    <TabsContent value="challenges" className="space-y-3 mt-4">
                      {selectedReport.challenges?.map((challenge, index) => (
                        <div key={index} className="flex gap-3 items-start">
                          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                          <p className="text-slate-700">{challenge}</p>
                        </div>
                      ))}
                    </TabsContent>

                    <TabsContent value="recommendations" className="space-y-3 mt-4">
                      {selectedReport.recommendations?.map((rec, index) => (
                        <div key={index} className="flex gap-3 items-start">
                          <TrendingUp className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                          <p className="text-slate-700">{rec}</p>
                        </div>
                      ))}
                    </TabsContent>

                    <TabsContent value="insights" className="mt-4">
                      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg p-4 border border-indigo-200">
                        <div className="flex items-center gap-2 mb-3">
                          <Sparkles className="w-5 h-5 text-indigo-600" />
                          <h4 className="font-semibold text-indigo-900">ניתוח מעמיק</h4>
                        </div>
                        <p className="text-slate-700 leading-relaxed whitespace-pre-line">
                          {selectedReport.ai_insights}
                        </p>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}