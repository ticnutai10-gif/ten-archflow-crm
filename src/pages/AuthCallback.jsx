import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { googleHandleCallback } from "@/functions/googleHandleCallback";
import { User } from "@/entities/User";

export default function AuthCallbackPage() {
  const [status, setStatus] = useState('processing'); // 'processing', 'success', 'error'
  const [message, setMessage] = useState('מעבד אישור Google...');
  const [debugInfo, setDebugInfo] = useState(null);

  useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
    try {
      // קבלת הקוד מה-URL
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const error = urlParams.get('error');
      
      console.log('AuthCallback - URL params:', { code: code ? 'received' : 'missing', error });
      
      if (error) {
        throw new Error(`Google OAuth error: ${error}`);
      }

      if (!code) {
        throw new Error('לא התקבל קוד אישור מ-Google');
      }

      setMessage('מאמת עם Google...');
      
      // קריאה לפונקציה עם מידע נוסף לdebug
      const response = await googleHandleCallback({
        code: code,
        redirect_uri: `${window.location.origin}/AuthCallback`
      });

      console.log('AuthCallback - Response from function:', response);
      setDebugInfo(response.data || response);

      if (response.data?.success) {
        setStatus('success');
        setMessage('התחברות ל-Google הושלמה בהצלחה!');
        
        // המתנה קצרה ואז חזרה לעמוד הלקוחות
        setTimeout(() => {
          window.location.href = '/Clients';
        }, 2000);
        
      } else {
        throw new Error(response.data?.error || response.error || 'תגובה לא ידועה מהשרת');
      }

    } catch (error) {
      console.error('AuthCallback error:', error);
      setStatus('error');
      setMessage(`שגיאה: ${error.message}`);
      
      // הצגת מידע נוסף לdebug
      setDebugInfo({
        error: error.message,
        url: window.location.href,
        origin: window.location.origin,
        pathname: window.location.pathname,
        search: window.location.search
      });
    }
  };

  const goBack = () => {
    window.location.href = '/Clients';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6" dir="rtl">
      <Card className="w-full max-w-lg shadow-lg border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            {status === 'processing' && (
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
            )}
            {status === 'success' && (
              <CheckCircle className="w-12 h-12 text-green-600" />
            )}
            {status === 'error' && (
              <XCircle className="w-12 h-12 text-red-600" />
            )}
          </div>
          <CardTitle className="text-xl">
            {status === 'processing' && 'מתחבר ל-Google...'}
            {status === 'success' && 'התחברות הושלמה!'}
            {status === 'error' && 'שגיאה בהתחברות'}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4 text-center">
          <p className="text-slate-600">{message}</p>
          
          {status === 'success' && (
            <div className="text-sm text-green-600">
              מפנה אותך חזרה לעמוד הלקוחות...
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-4">
              <Button onClick={goBack} className="w-full">
                <ArrowRight className="w-4 h-4 ml-2" />
                חזור לעמוד הלקוחות
              </Button>
              
              {debugInfo && (
                <details className="text-left text-xs bg-slate-50 p-3 rounded-lg">
                  <summary className="cursor-pointer text-slate-700 font-medium">
                    פרטי שגיאה (לפיתוח)
                  </summary>
                  <pre className="mt-2 whitespace-pre-wrap text-slate-600">
                    {JSON.stringify(debugInfo, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          )}

          {status === 'processing' && (
            <div className="text-sm text-slate-500">
              אל תסגור את החלון עד לסיום התהליך
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}