import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  TrendingUp, 
  Users,
  Lightbulb,
  Activity,
  Target,
  Loader2
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";

export default function ProjectInsightsCard() {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTab, setSelectedTab] = useState('overview');

  useEffect(() => {
    loadInsights();
  }, []);

  const loadInsights = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await base44.functions.invoke('projectInsights');
      console.log('✅ [INSIGHTS CARD] Response:', response.data);
      
      if (response.data && response.data.insights) {
        setInsights(response.data.insights);
      } else {
        setError('לא התקבלו תובנות');
      }
    } catch (error) {
      console.error('❌ [INSIGHTS CARD] Error:', error);
      setError(error.message || 'שגיאה בטעינת תובנות');
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <Card className="bg-white shadow-lg border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-600" />
            ניתוח פרויקטים חכם
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-white shadow-lg border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-600" />
            ניתוח פרויקטים חכם
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <p className="text-slate-600 mb-4">{error}</p>
          <Button variant="outline" onClick={loadInsights}>
            נסה שוב
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!insights || !insights.summary || insights.active === 0) {
    return (
      <Card className="bg-white shadow-lg border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-600" />
            ניתוח פרויקטים חכם
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <p className="text-slate-600 mb-4">אין פרויקטים פעילים לניתוח</p>
          <Link to={createPageUrl('Projects')}>
            <Button variant="outline">
              עבור לפרויקטים
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  const { summary, projects = [] } = insights;
  
  // בדיקות בטיחות לפני גישה לנתונים
  const highRiskProjects = projects
    .filter(p => p && p.risk && p.risk.riskLevel === 'high')
    .slice(0, 3);
    
  const topRecommendations = projects
    .filter(p => p && p.recommendations && Array.isArray(p.recommendations))
    .flatMap(p => p.recommendations.map(r => ({ 
      ...r, 
      project: p.projectName || 'פרויקט', 
      client: p.clientName || 'לקוח' 
    })))
    .filter(r => r && r.priority === 'high')
    .slice(0, 5);

  return (
    <Card className="bg-white shadow-lg border-0">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-600" />
            ניתוח פרויקטים חכם
          </CardTitle>
          <Badge 
            className={`text-white ${
              (summary.healthScore || 0) >= 80 ? 'bg-green-600' :
              (summary.healthScore || 0) >= 60 ? 'bg-yellow-600' :
              'bg-red-600'
            }`}
          >
            ציון בריאות: {summary.healthScore || 0}/100
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={selectedTab} onValueChange={setSelectedTab} dir="rtl">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="overview">סקירה</TabsTrigger>
            <TabsTrigger value="risks">סיכונים</TabsTrigger>
            <TabsTrigger value="recommendations">המלצות</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            {/* סטטוס פרויקטים */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 text-center">
                <AlertTriangle className="w-8 h-8 text-red-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-red-900">
                  {summary?.distribution?.highRisk || 0}
                </div>
                <div className="text-xs text-red-700">סיכון גבוה</div>
              </div>

              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4 text-center">
                <Clock className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-yellow-900">
                  {summary?.distribution?.mediumRisk || 0}
                </div>
                <div className="text-xs text-yellow-700">סיכון בינוני</div>
              </div>

              <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 text-center">
                <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-green-900">
                  {summary?.distribution?.onTrack || 0}
                </div>
                <div className="text-xs text-green-700">במסלול</div>
              </div>
            </div>

            {/* מדדים כלליים */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">אחוז השלמה ממוצע</span>
                <span className="text-sm font-bold text-slate-900">{summary?.avgCompletionRate || 0}%</span>
              </div>
              <Progress value={summary?.avgCompletionRate || 0} className="h-2" />

              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">
                  <Lightbulb className="w-4 h-4 inline ml-1 text-yellow-600" />
                  המלצות פעולה
                </span>
                <span className="font-bold text-blue-600">{summary?.totalRecommendations || 0}</span>
              </div>
            </div>

            {/* קישור לדוח מלא */}
            <Button 
              variant="outline" 
              className="w-full"
              onClick={loadInsights}
            >
              <Activity className="w-4 h-4 ml-2" />
              רענן ניתוח
            </Button>
          </TabsContent>

          {/* Risks Tab */}
          <TabsContent value="risks" className="space-y-3">
            {highRiskProjects.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
                <p className="text-slate-600">כל הפרויקטים במסלול! 🎉</p>
              </div>
            ) : (
              <>
                {highRiskProjects.map((project, index) => (
                  <div 
                    key={index}
                    className="bg-red-50 border-2 border-red-200 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="font-semibold text-red-900 text-sm">
                          {project.projectName || 'פרויקט'}
                        </h4>
                        <p className="text-xs text-red-700">{project.clientName || 'לקוח'}</p>
                      </div>
                      <Badge variant="destructive" className="text-xs">
                        {project.risk?.riskScore || 0}/100
                      </Badge>
                    </div>

                    <div className="space-y-1">
                      {(project.risk?.riskFactors || []).slice(0, 2).map((factor, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <AlertTriangle className="w-3 h-3 text-red-600 mt-0.5 flex-shrink-0" />
                          <span className="text-xs text-red-800">{factor}</span>
                        </div>
                      ))}
                    </div>

                    {project.metrics?.completionRate !== undefined && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-red-700">אחוז השלמה</span>
                          <span className="text-xs font-bold text-red-900">
                            {project.metrics.completionRate}%
                          </span>
                        </div>
                        <Progress value={project.metrics.completionRate} className="h-1.5" />
                      </div>
                    )}
                  </div>
                ))}

                {(summary?.distribution?.highRisk || 0) > 3 && (
                  <div className="text-center pt-2">
                    <Link to={createPageUrl('Projects')}>
                      <Button variant="outline" size="sm">
                        ראה עוד {summary.distribution.highRisk - 3} פרויקטים
                      </Button>
                    </Link>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* Recommendations Tab */}
          <TabsContent value="recommendations" className="space-y-3">
            {topRecommendations.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
                <p className="text-slate-600">אין המלצות דחופות</p>
              </div>
            ) : (
              <>
                {topRecommendations.map((rec, index) => (
                  <div 
                    key={index}
                    className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-blue-600 rounded-lg flex-shrink-0">
                        <Lightbulb className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-blue-900 text-sm mb-1">
                          {rec.title || 'המלצה'}
                        </h4>
                        <p className="text-xs text-slate-600 mb-2">
                          {rec.project} • {rec.client}
                        </p>
                        <p className="text-xs text-blue-800 mb-2">
                          {rec.description || ''}
                        </p>
                        <div className="flex items-center gap-1 text-xs text-blue-700">
                          <TrendingUp className="w-3 h-3" />
                          {rec.action || ''}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}