import React, { useState, useEffect, useCallback } from "react";
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
  Lightbulb,
  Activity,
  Target,
  Loader2
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";

const RISK_COLORS = {
  high: 'bg-red-100 text-red-800 border-red-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  low: 'bg-green-100 text-green-800 border-green-200'
};

const PRIORITY_COLORS = {
  high: 'text-red-600',
  medium: 'text-yellow-600',
  low: 'text-blue-600'
};

export default function ProjectInsightsCard() {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTab, setSelectedTab] = useState('overview');

  const loadInsights = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await base44.functions.invoke('projectInsights');
      
      if (response?.data?.insights) {
        setInsights(response.data.insights);
      } else {
        setError('לא התקבלו תובנות');
      }
    } catch (error) {
      console.error('Error loading insights:', error);
      setError(error?.message || 'שגיאה בטעינת תובנות');
    }
    
    setLoading(false);
  }, []);

  useEffect(() => {
    loadInsights();
  }, [loadInsights]);

  const getHealthScoreColor = useCallback((score) => {
    if (!score) return 'bg-slate-600';
    if (score >= 80) return 'bg-green-600';
    if (score >= 60) return 'bg-yellow-600';
    return 'bg-red-600';
  }, []);

  const renderLoadingState = useCallback(() => (
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
  ), []);

  const renderErrorState = useCallback(() => (
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
  ), [error, loadInsights]);

  const renderEmptyState = useCallback(() => (
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
  ), []);

  const renderDistributionCard = useCallback((type, count, color, icon) => {
    const Icon = icon;
    return (
      <div className={`${color} border-2 rounded-lg p-4 text-center`}>
        <Icon className={`w-8 h-8 mx-auto mb-2 ${color.split(' ')[1]}`} />
        <div className="text-2xl font-bold">{count || 0}</div>
        <div className="text-xs">{type}</div>
      </div>
    );
  }, []);

  const renderOverviewTab = useCallback(() => {
    const summary = insights?.summary || {};
    const distribution = summary.distribution || {};
    
    return (
      <TabsContent value="overview" className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          {renderDistributionCard('סיכון גבוה', distribution.highRisk, 'bg-red-50 text-red-900', AlertTriangle)}
          {renderDistributionCard('סיכון בינוני', distribution.mediumRisk, 'bg-yellow-50 text-yellow-900', Clock)}
          {renderDistributionCard('במסלול', distribution.onTrack, 'bg-green-50 text-green-900', CheckCircle)}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">אחוז השלמה ממוצע</span>
            <span className="text-sm font-bold text-slate-900">{summary.avgCompletionRate || 0}%</span>
          </div>
          <Progress value={summary.avgCompletionRate || 0} className="h-2" />

          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">
              <Lightbulb className="w-4 h-4 inline ml-1 text-yellow-600" />
              המלצות פעולה
            </span>
            <span className="font-bold text-blue-600">{summary.totalRecommendations || 0}</span>
          </div>
        </div>

        <Button 
          variant="outline" 
          className="w-full"
          onClick={loadInsights}
        >
          <Activity className="w-4 h-4 ml-2" />
          רענן ניתוח
        </Button>
      </TabsContent>
    );
  }, [insights, loadInsights, renderDistributionCard]);

  const renderRisksTab = useCallback(() => {
    const projects = insights?.projects || [];
    const highRiskProjects = projects
      .filter(p => p?.risk?.riskLevel === 'high')
      .slice(0, 3);
    
    const summary = insights?.summary || {};
    const distribution = summary.distribution || {};

    return (
      <TabsContent value="risks" className="space-y-3">
        {highRiskProjects.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
            <p className="text-slate-600">כל הפרויקטים במסלול! 🎉</p>
          </div>
        ) : (
          <>
            {highRiskProjects.map((project, index) => {
              const risk = project.risk || {};
              const metrics = project.metrics || {};
              
              return (
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
                      {risk.riskScore || 0}/100
                    </Badge>
                  </div>

                  <div className="space-y-1">
                    {(risk.riskFactors || []).slice(0, 2).map((factor, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <AlertTriangle className="w-3 h-3 text-red-600 mt-0.5 flex-shrink-0" />
                        <span className="text-xs text-red-800">{factor}</span>
                      </div>
                    ))}
                  </div>

                  {metrics.completionRate !== undefined && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-red-700">אחוז השלמה</span>
                        <span className="text-xs font-bold text-red-900">
                          {metrics.completionRate}%
                        </span>
                      </div>
                      <Progress value={metrics.completionRate} className="h-1.5" />
                    </div>
                  )}
                </div>
              );
            })}

            {(distribution.highRisk || 0) > 3 && (
              <div className="text-center pt-2">
                <Link to={createPageUrl('Projects')}>
                  <Button variant="outline" size="sm">
                    ראה עוד {distribution.highRisk - 3} פרויקטים
                  </Button>
                </Link>
              </div>
            )}
          </>
        )}
      </TabsContent>
    );
  }, [insights]);

  const renderRecommendationsTab = useCallback(() => {
    const projects = insights?.projects || [];
    const topRecommendations = projects
      .filter(p => p?.recommendations && Array.isArray(p.recommendations))
      .flatMap(p => (p.recommendations || []).map(r => ({ 
        ...r, 
        project: p.projectName || 'פרויקט', 
        client: p.clientName || 'לקוח' 
      })))
      .filter(r => r && r.priority === 'high')
      .slice(0, 5);

    return (
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
    );
  }, [insights]);

  if (loading) {
    return renderLoadingState();
  }

  if (error) {
    return renderErrorState();
  }

  if (!insights || !insights.summary || insights.active === 0) {
    return renderEmptyState();
  }

  const summary = insights.summary || {};
  const healthScore = summary.healthScore || 0;

  return (
    <Card className="bg-white shadow-lg border-0">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-600" />
            ניתוח פרויקטים חכם
          </CardTitle>
          <Badge 
            className={`text-white ${getHealthScoreColor(healthScore)}`}
          >
            ציון בריאות: {healthScore}/100
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

          {renderOverviewTab()}
          {renderRisksTab()}
          {renderRecommendationsTab()}
        </Tabs>
      </CardContent>
    </Card>
  );
}