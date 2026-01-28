import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, FileText, Timer as TimerIcon, CheckSquare, Users, Building2, Archive } from "lucide-react";
import { exportTasks } from "@/functions/exportTasks";
import { exportQuotes } from "@/functions/exportQuotes";
import { exportTimeLogsCsv } from "@/functions/exportTimeLogsCsv";
import { exportUsers } from "@/functions/exportUsers";
import { exportClients } from "@/functions/exportClients";
import { exportTimeLogsDetailed } from "@/functions/exportTimeLogsDetailed";
import { exportFullBackupJson } from "@/functions/exportFullBackupJson";
import { exportLogsByClient } from "@/functions/exportLogsByClient";
import { exportLogsByUser } from "@/functions/exportLogsByUser";

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
      const textData = response.data;
      downloadBlob(textData, "timelogs.csv", "text/csv;charset=utf-8;");
    } catch (error) {
      console.error('Error exporting time logs:', error);
      alert('שגיאה ביצוא רישומי הזמן.');
    }
  };

  const handleExportUsers = async () => {
    try {
      const response = await exportUsers();
      downloadBlob(response.data, "users.csv", "text/csv;charset=utf-8;");
    } catch (error) {
      console.error('Error exporting users:', error);
      alert('שגיאה ביצוא משתמשים.');
    }
  };

  const handleExportClients = async () => {
    try {
      const response = await exportClients();
      downloadBlob(response.data, "clients.csv", "text/csv;charset=utf-8;");
    } catch (error) {
      console.error('Error exporting clients:', error);
      alert('שגיאה ביצוא לקוחות.');
    }
  };

  const handleExportTimeLogsDetailed = async () => {
    try {
      const response = await exportTimeLogsDetailed();
      downloadBlob(response.data, "timelogs_detailed.csv", "text/csv;charset=utf-8;");
    } catch (error) {
      console.error('Error exporting detailed time logs:', error);
      alert('שגיאה ביצוא לוגים מפורט.');
    }
  };

  const handleExportLogsByClient = async () => {
    try {
      const response = await exportLogsByClient();
      downloadBlob(response.data, `logs_by_client_${new Date().toISOString().split('T')[0]}.csv`, "text/csv;charset=utf-8;");
    } catch (error) {
      console.error('Error exporting logs by client:', error);
      alert('שגיאה ביצוא לוגים לפי לקוח.');
    }
  };

  const handleExportLogsByUser = async () => {
    try {
      const response = await exportLogsByUser();
      downloadBlob(response.data, `logs_by_user_${new Date().toISOString().split('T')[0]}.csv`, "text/csv;charset=utf-8;");
    } catch (error) {
      console.error('Error exporting logs by user:', error);
      alert('שגיאה ביצוא לוגים לפי עובד.');
    }
  };

  const handleExportFullBackup = async () => {
    try {
      const response = await exportFullBackupJson();
      const jsonStr = typeof response.data === 'string' ? response.data : JSON.stringify(response.data, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (error) {
      console.error('Error exporting full backup:', error);
      alert('שגיאה בייצוא גיבוי מלא: ' + error.message);
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

          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 justify-end">
                CSV רישומי זמן (שלי)
                <TimerIcon className="w-5 h-5 text-emerald-600" />
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div className="text-slate-600 text-sm">ייצוא רישומי הזמן שלך ל-CSV.</div>
              <Button variant="outline" className="gap-2" onClick={handleExportTimeLogs}>
                <Download className="w-4 h-4" /> הורד
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 justify-end">
                CSV משתמשים
                <Users className="w-5 h-5 text-blue-600" />
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div className="text-slate-600 text-sm">ייצוא כל המשתמשים כולל פרטי שכר ושעות.</div>
              <Button variant="outline" className="gap-2" onClick={handleExportUsers}>
                <Download className="w-4 h-4" /> הורד
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 justify-end">
                CSV לקוחות
                <Building2 className="w-5 h-5 text-orange-600" />
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div className="text-slate-600 text-sm">ייצוא כל הלקוחות עם פרטי קשר וסטטוס.</div>
              <Button variant="outline" className="gap-2" onClick={handleExportClients}>
                <Download className="w-4 h-4" /> הורד
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm rounded-2xl md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 justify-end">
                CSV לוגים מפורט (כל המשתמשים + חיבור ללקוחות)
                <TimerIcon className="w-5 h-5 text-teal-600" />
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div className="text-slate-600 text-sm">ייצוא כל הלוגים עם שם העובד שביצע, שכר שעתי, עלות לוג, וסה"כ שעות ועלות לכל לקוח.</div>
              <Button variant="outline" className="gap-2" onClick={handleExportTimeLogsDetailed}>
                <Download className="w-4 h-4" /> הורד
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0 bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 justify-end text-green-800">
                📊 לוגים לפי לקוח (Excel)
                <Building2 className="w-5 h-5 text-green-600" />
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div className="text-slate-700 text-sm">
                <strong>כל הלוגים מקובצים לפי לקוח:</strong> תאריך, שעה, עובד, משך, עלות, וסיכום לכל לקוח.
              </div>
              <Button className="gap-2 bg-green-600 hover:bg-green-700" onClick={handleExportLogsByClient}>
                <Download className="w-4 h-4" /> הורד
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 justify-end text-blue-800">
                👤 לוגים לפי עובד (Excel)
                <Users className="w-5 h-5 text-blue-600" />
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div className="text-slate-700 text-sm">
                <strong>כל הלוגים מקובצים לפי עובד:</strong> תאריך, לקוח, משך, עלות, וסיכום לכל עובד.
              </div>
              <Button className="gap-2 bg-blue-600 hover:bg-blue-700" onClick={handleExportLogsByUser}>
                <Download className="w-4 h-4" /> הורד
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0 bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 justify-end text-purple-800">
                📦 גיבוי מלא (JSON)
                <Archive className="w-5 h-5 text-purple-600" />
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div className="text-slate-700 text-sm">
                <strong>קובץ JSON מלא הכולל:</strong> משתמשים, לקוחות, פרויקטים, משימות, פגישות, לוגי זמן, וטבלאות עם כל הנתונים.
              </div>
              <Button className="gap-2 bg-purple-600 hover:bg-purple-700" onClick={handleExportFullBackup}>
                <Download className="w-4 h-4" /> הורד JSON
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}