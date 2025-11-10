import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, CheckCircle2, XCircle, AlertTriangle, RefreshCw } from "lucide-react";
import { useAccessControl, validateAccessSetup } from "./AccessValidator";
import { toast } from "react-hot-toast";

/**
 * פאנל דיבאג להרשאות - להצגה זמנית לבדיקה
 */
export default function AccessDebugPanel() {
  const access = useAccessControl();
  const [validation, setValidation] = useState(null);
  const [loading, setLoading] = useState(false);

  const runValidation = async () => {
    setLoading(true);
    try {
      const result = await validateAccessSetup();
      setValidation(result);
      
      if (result.valid) {
        toast.success('בדיקת הרשאות הושלמה');
      } else {
        toast.error('נמצאו בעיות בהרשאות');
      }
    } catch (error) {
      toast.error('שגיאה בבדיקת הרשאות');
    }
    setLoading(false);
  };

  useEffect(() => {
    runValidation();
  }, []);

  if (access.loading) {
    return null;
  }

  return (
    <Card className="fixed bottom-4 left-4 w-96 shadow-2xl z-50 border-2 border-blue-500" dir="rtl">
      <CardHeader className="bg-blue-50 border-b">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-600" />
            <span>מצב הרשאות</span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={runValidation}
            disabled={loading}
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-3 text-sm">
        {/* פרטי משתמש */}
        <div>
          <div className="font-semibold text-slate-700 mb-1">משתמש נוכחי:</div>
          <div className="text-slate-600">{access.me?.email || 'לא מחובר'}</div>
        </div>

        {/* תפקיד */}
        <div>
          <div className="font-semibold text-slate-700 mb-1">תפקיד:</div>
          <Badge className={
            access.isAdmin ? 'bg-purple-100 text-purple-700' :
            access.isManagerPlus ? 'bg-blue-100 text-blue-700' :
            'bg-slate-100 text-slate-700'
          }>
            {access.myAccess?.role || access.me?.role || 'לא מוגדר'}
          </Badge>
        </div>

        {/* הרשאות */}
        <div>
          <div className="font-semibold text-slate-700 mb-2">הרשאות:</div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {access.isAdmin ? (
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              ) : (
                <XCircle className="w-4 h-4 text-slate-300" />
              )}
              <span>מנהל מערכת</span>
            </div>
            <div className="flex items-center gap-2">
              {access.isManagerPlus ? (
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              ) : (
                <XCircle className="w-4 h-4 text-slate-300" />
              )}
              <span>מנהל פלוס</span>
            </div>
          </div>
        </div>

        {/* שיוכים */}
        <div>
          <div className="font-semibold text-slate-700 mb-1">שיוכים:</div>
          <div className="space-y-1 text-slate-600">
            <div>לקוחות: {access.assignedClientsCount}</div>
            <div>פרויקטים: {access.assignedProjectsCount}</div>
          </div>
        </div>

        {/* תוצאות בדיקה */}
        {validation && (
          <div className="pt-3 border-t">
            <div className="flex items-center gap-2 mb-2">
              {validation.valid ? (
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              ) : (
                <XCircle className="w-4 h-4 text-red-500" />
              )}
              <span className="font-semibold">
                {validation.valid ? 'הגדרות תקינות' : 'נמצאו בעיות'}
              </span>
            </div>
            
            {validation.warnings && (
              <div className="space-y-1">
                {validation.warnings.map((w, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-yellow-700">
                    <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            )}
            
            {validation.errors && (
              <div className="space-y-1">
                {validation.errors.map((e, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-red-700">
                    <XCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    <span>{e}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}