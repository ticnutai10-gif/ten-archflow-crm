import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { removeDuplicateClients } from "@/functions/removeDuplicateClients";

export default function RemoveDuplicatesPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleRemoveDuplicates = async () => {
    if (!confirm('האם אתה בטוח? פעולה זו תמחק את כל הלקוחות הכפולים (ישאיר רק את הישן ביותר מכל שם)')) {
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await removeDuplicateClients();
      setResult(response.data);
    } catch (err) {
      setError(err.message || 'שגיאה במחיקת כפילויות');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto" dir="rtl">
      <Card className="shadow-lg">
        <CardHeader className="bg-red-50 border-b">
          <CardTitle className="flex items-center gap-2 text-red-800">
            <AlertTriangle className="w-6 h-6" />
            מחיקת לקוחות כפולים
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4">
            <h3 className="font-bold text-yellow-800 mb-2">⚠️ שים לב!</h3>
            <ul className="text-sm text-yellow-700 space-y-1 list-disc mr-4">
              <li>פעולה זו תמחק את כל הלקוחות הכפולים (לפי שם)</li>
              <li>מכל קבוצת כפילויות - יישאר רק הלקוח <strong>הישן ביותר</strong></li>
              <li>הפעולה אינה הפיכה!</li>
              <li>מומלץ לגבות את הנתונים לפני הפעלה</li>
            </ul>
          </div>

          <Button
            onClick={handleRemoveDuplicates}
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-700 text-white h-12 text-lg"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 ml-2 animate-spin" />
                מוחק כפילויות...
              </>
            ) : (
              <>
                <Trash2 className="w-5 h-5 ml-2" />
                הפעל מחיקת כפילויות
              </>
            )}
          </Button>

          {error && (
            <div className="bg-red-100 border border-red-300 rounded-lg p-4 text-red-800">
              <strong>שגיאה:</strong> {error}
            </div>
          )}

          {result && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-300 rounded-lg p-4">
                <div className="flex items-center gap-2 text-green-800 font-bold mb-3">
                  <CheckCircle2 className="w-5 h-5" />
                  הפעולה הושלמה בהצלחה!
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-white rounded p-3 border">
                    <div className="text-slate-600">סה"כ לקוחות</div>
                    <div className="text-2xl font-bold text-slate-800">{result.totalClients}</div>
                  </div>
                  <div className="bg-white rounded p-3 border">
                    <div className="text-slate-600">שמות ייחודיים</div>
                    <div className="text-2xl font-bold text-slate-800">{result.uniqueNames}</div>
                  </div>
                  <div className="bg-white rounded p-3 border">
                    <div className="text-slate-600">כפילויות שנמצאו</div>
                    <div className="text-2xl font-bold text-orange-600">{result.duplicatesFound}</div>
                  </div>
                  <div className="bg-white rounded p-3 border">
                    <div className="text-slate-600">נמחקו בהצלחה</div>
                    <div className="text-2xl font-bold text-green-600">{result.deleted}</div>
                  </div>
                </div>
              </div>

              {result.deletedClients && result.deletedClients.length > 0 && (
                <div className="bg-slate-50 rounded-lg p-4 border">
                  <h4 className="font-bold text-slate-800 mb-2">לקוחות שנמחקו (עד 20 ראשונים):</h4>
                  <div className="max-h-48 overflow-y-auto">
                    <ul className="text-sm space-y-1">
                      {result.deletedClients.map((client, i) => (
                        <li key={i} className="text-slate-600">
                          • {client.name} <span className="text-slate-400">({client.id})</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {result.errors && result.errors.length > 0 && (
                <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                  <h4 className="font-bold text-red-800 mb-2">שגיאות:</h4>
                  <ul className="text-sm text-red-700 space-y-1">
                    {result.errors.map((err, i) => (
                      <li key={i}>• {err.name}: {err.error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}