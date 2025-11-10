
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, FileText, Timer as TimerIcon, CheckSquare } from "lucide-react";
import { exportTasks } from "@/functions/exportTasks";
import { exportQuotes } from "@/functions/exportQuotes";
import { exportTimeLogsCsv } from "@/functions/exportTimeLogsCsv";

export default function Exports() {
  const downloadBlob = (data, filename, mime) => {
    // Convert Uint8Array or ArrayBuffer to blob
    let blobData = data;
    if (data instanceof ArrayBuffer) {
      blobData = new Uint8Array(data);
    }
    
    const blob = new Blob([blobData], { type: mime });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  };

  const handleExportTasks = async () => {
    try {
      const response = await exportTasks();
      // Response should be an object where 'data' holds the ArrayBuffer
      const arrayBuffer = response.data;
      downloadBlob(arrayBuffer, "tasks.pdf", "application/pdf");
    } catch (error) {
      console.error('Error exporting tasks:', error);
      alert('שגיאה ביצוא המשימות.');
    }
  };

  const handleExportQuotes = async () => {
    try {
      const response = await exportQuotes();
      const arrayBuffer = response.data;
      downloadBlob(arrayBuffer, "quotes.pdf", "application/pdf");
    } catch (error) {
      console.error('Error exporting quotes:', error);
      alert('שגיאה ביצוא הצעות המחיר.');
    }
  };

  const handleExportTimeLogs = async () => {
    try {
      const response = await exportTimeLogsCsv();
      // CSV data should be text directly in response.data
      const textData = response.data;
      downloadBlob(textData, "timelogs.csv", "text/csv;charset=utf-8;");
    } catch (error) {
      console.error('Error exporting time logs:', error);
      alert('שגיאה ביצוא רישומי הזמן.');
    }
  };

  return (
    <div className="p-6 lg:p-8 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen pl-24 lg:pl-12" dir="rtl">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 text-right">
          <h1 className="text-3xl font-bold text-slate-900">ייצוא נתונים</h1>
          <p className="text-slate-600">הורדת דוחות קלים לשיתוף וגיבוי</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 justify-end">
                PDF משימות
                <CheckSquare className="w-5 h-5 text-purple-600" />
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div className="text-slate-600 text-sm">ייצוא כל המשימות כקובץ PDF מסודר עם סטטוס, עדיפות ותאריכים.</div>
              <Button variant="outline" className="gap-2" onClick={handleExportTasks}>
                <Download className="w-4 h-4" /> הורד
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 justify-end">
                PDF הצעות מחיר
                <FileText className="w-5 h-5 text-amber-600" />
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div className="text-slate-600 text-sm">ייצוא כל ההצעות ל-PDF כולל סכומים וסטטוסים.</div>
              <Button variant="outline" className="gap-2" onClick={handleExportQuotes}>
                <Download className="w-4 h-4" /> הורד
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm rounded-2xl md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 justify-end">
                CSV רישומי זמן (שלי)
                <TimerIcon className="w-5 h-5 text-emerald-600" />
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div className="text-slate-600 text-sm">ייצוא רישומי הזמן שלך ל-CSV (לקוח, תאריך, כותרת, הערות, משך).</div>
              <Button variant="outline" className="gap-2" onClick={handleExportTimeLogs}>
                <Download className="w-4 h-4" /> הורד
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
