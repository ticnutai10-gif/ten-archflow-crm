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
import { exportAllSpreadsheets } from "@/functions/exportAllSpreadsheets";
import { exportClientsTable } from "@/functions/exportClientsTable";
import { base44 } from "@/api/base44Client";
import { useState, useEffect } from "react";

export default function Exports() {
  const [spreadsheets, setSpreadsheets] = useState([]);
  const [loadingSheets, setLoadingSheets] = useState(true);

  useEffect(() => {
    base44.entities.CustomSpreadsheet.list('-created_date', 100)
      .then(setSpreadsheets)
      .catch(console.error)
      .finally(() => setLoadingSheets(false));
  }, []);

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

  const handleExportAllSpreadsheets = async () => {
    try {
      const response = await exportAllSpreadsheets();
      downloadBlob(response.data, `all_spreadsheets_${new Date().toISOString().split('T')[0]}.json`, "application/json;charset=utf-8;");
    } catch (error) {
      console.error('Error exporting spreadsheets:', error);
      alert('שגיאה ביצוא טבלאות.');
    }
  };

  const handleExportSingleSpreadsheet = async (sheetId, sheetName, format) => {
    try {
      const response = await exportAllSpreadsheets({ id: sheetId, format });
      const dateStr = new Date().toISOString().split('T')[0];
      const safeName = sheetName.replace(/[^a-zA-Z0-9א-ת\s]/g, '_');
      
      if (format === 'xlsx' || format === 'excel') {
        downloadBlob(response.data, `${safeName}_${dateStr}.xls`, "application/vnd.ms-excel;charset=utf-8;");
      } else if (format === 'csv') {
        downloadBlob(response.data, `${safeName}_${dateStr}.csv`, "text/csv;charset=utf-8;");
      } else {
        downloadBlob(response.data, `${safeName}_${dateStr}.json`, "application/json;charset=utf-8;");
      }
    } catch (error) {
      console.error('Error exporting spreadsheet:', error);
      alert('שגיאה ביצוא טבלה.');
    }
  };

  const handleExportClientsTable = async (format = 'csv') => {
    try {
      const response = await exportClientsTable({ format });
      const dateStr = new Date().toISOString().split('T')[0];
      
      if (format === 'json') {
        downloadBlob(response.data, `clients_table_${dateStr}.json`, "application/json;charset=utf-8;");
      } else if (format === 'xlsx') {
        downloadBlob(response.data, `clients_table_${dateStr}.xls`, "application/vnd.ms-excel;charset=utf-8;");
      } else {
        downloadBlob(response.data, `clients_table_${dateStr}.csv`, "text/csv;charset=utf-8;");
      }
    } catch (error) {
      console.error('Error exporting clients table:', error);
      alert('שגיאה ביצוא טבלת לקוחות.');
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

          <Card className="shadow-lg border-0 bg-gradient-to-r from-purple-50 to-violet-50 rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 justify-end text-purple-800">
                📋 כל הטבלאות (JSON)
                <FileText className="w-5 h-5 text-purple-600" />
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div className="text-slate-700 text-sm">
                <strong>ייצוא כל הטבלאות המותאמות:</strong> כולל עמודות, נתונים, וקישור ללקוחות/פרויקטים.
              </div>
              <Button className="gap-2 bg-purple-600 hover:bg-purple-700" onClick={handleExportAllSpreadsheets}>
                <Download className="w-4 h-4" /> הורד
              </Button>
            </CardContent>
          </Card>

          {/* Individual Spreadsheets Export */}
          <Card className="shadow-lg border-0 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 justify-end text-indigo-800">
                📊 ייצוא טבלאות בודדות
                <FileText className="w-5 h-5 text-indigo-600" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingSheets ? (
                <div className="text-center text-slate-500 py-4">טוען טבלאות...</div>
              ) : spreadsheets.length === 0 ? (
                <div className="text-center text-slate-500 py-4">אין טבלאות מותאמות</div>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {spreadsheets.map(sheet => (
                    <div key={sheet.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200">
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="gap-1" onClick={() => handleExportSingleSpreadsheet(sheet.id, sheet.name, 'xlsx')}>
                          <Download className="w-3 h-3" /> Excel
                        </Button>
                        <Button size="sm" variant="outline" className="gap-1" onClick={() => handleExportSingleSpreadsheet(sheet.id, sheet.name, 'csv')}>
                          <Download className="w-3 h-3" /> CSV
                        </Button>
                        <Button size="sm" variant="outline" className="gap-1" onClick={() => handleExportSingleSpreadsheet(sheet.id, sheet.name, 'json')}>
                          <Download className="w-3 h-3" /> JSON
                        </Button>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-slate-800">{sheet.name}</div>
                        {sheet.client_name && <div className="text-xs text-slate-500">{sheet.client_name}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0 bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 justify-end text-amber-800">
                🏢 טבלת לקוחות מרכזית
                <Building2 className="w-5 h-5 text-amber-600" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-slate-700 text-sm mb-4">
                <strong>כל הלקוחות עם סטטיסטיקות:</strong> פרטים, פרויקטים, משימות, שעות עבודה.
              </div>
              <div className="flex gap-2 flex-wrap justify-end">
                <Button className="gap-2 bg-amber-600 hover:bg-amber-700" onClick={() => handleExportClientsTable('csv')}>
                  <Download className="w-4 h-4" /> CSV
                </Button>
                <Button className="gap-2 bg-green-600 hover:bg-green-700" onClick={() => handleExportClientsTable('xlsx')}>
                  <Download className="w-4 h-4" /> Excel
                </Button>
                <Button className="gap-2 bg-blue-600 hover:bg-blue-700" onClick={() => handleExportClientsTable('json')}>
                  <Download className="w-4 h-4" /> JSON
                </Button>
              </div>
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