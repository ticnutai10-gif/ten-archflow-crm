import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageCircle, CheckCircle2, ExternalLink, Info } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function WhatsAppConnector() {
  const [connecting, setConnecting] = useState(false);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const whatsappURL = base44.agents.getWhatsAppConnectURL('notification_agent');
      window.open(whatsappURL, '_blank');
      toast.success('נפתח חלון חדש לחיבור וואטסאפ');
    } catch (error) {
      console.error('Error connecting WhatsApp:', error);
      toast.error('שגיאה בחיבור וואטסאפ');
    } finally {
      setConnecting(false);
    }
  };

  return (
    <Card dir="rtl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-green-600" />
          חיבור וואטסאפ
        </CardTitle>
        <p className="text-sm text-slate-500 mt-1">
          קבל התראות אוטומטיות דרך וואטסאפ
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* מידע על היכולות */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <h4 className="font-semibold text-green-900">מה תקבל בוואטסאפ?</h4>
              <ul className="text-sm text-green-800 space-y-1">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  התראות על משימות קרובות ומשימות שעברו מועד
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  תזכורות לפגישות קרובות
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  עדכונים על שינויי סטטוס בפרויקטים
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  אפשרות לשאול את הסוכן על מצב המשימות והפרויקטים
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* כפתור חיבור */}
        <div className="flex flex-col items-center gap-4 py-6">
          <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center">
            <MessageCircle className="w-12 h-12 text-green-600" />
          </div>
          
          <div className="text-center">
            <h3 className="font-semibold text-lg text-slate-900 mb-1">
              חבר את חשבון הוואטסאפ שלך
            </h3>
            <p className="text-sm text-slate-600">
              התהליך פשוט ומהיר - תועבר לדף חיבור מאובטח
            </p>
          </div>

          <Button
            onClick={handleConnect}
            disabled={connecting}
            className="bg-green-600 hover:bg-green-700 text-white px-8 py-6 text-lg"
          >
            <MessageCircle className="w-5 h-5 ml-2" />
            {connecting ? 'מתחבר...' : 'התחבר לוואטסאפ'}
            <ExternalLink className="w-4 h-4 mr-2" />
          </Button>
        </div>

        {/* הסבר על הפרטיות */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
          <h4 className="font-semibold text-slate-900 mb-2 text-sm">
            🔒 פרטיות ואבטחה
          </h4>
          <p className="text-xs text-slate-600 leading-relaxed">
            המערכת שומרת על הפרטיות שלך. הסוכן יכול לגשת רק למידע הרלוונטי שלך
            (משימות, פגישות ופרויקטים שלך), ולא ישלח הודעות ללא בקשתך. 
            תוכל לנתק את החיבור בכל עת.
          </p>
        </div>

        {/* הוראות */}
        <div className="space-y-2">
          <h4 className="font-semibold text-slate-900 text-sm">איך זה עובד?</h4>
          <ol className="text-sm text-slate-600 space-y-2 list-decimal list-inside">
            <li>לחץ על כפתור "התחבר לוואטסאפ"</li>
            <li>תועבר לדף חיבור מאובטח</li>
            <li>סרוק את קוד ה-QR עם אפליקציית הוואטסאפ שלך</li>
            <li>אשר את החיבור</li>
            <li>זהו! תתחיל לקבל התראות אוטומטיות</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}