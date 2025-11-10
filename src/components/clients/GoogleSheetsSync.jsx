
import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  RefreshCw, 
  Upload, 
  Download,
  Plus,
  ExternalLink,
  Check,
  AlertCircle,
  Loader2,
  FileSpreadsheet,
  Trash2,
  Edit3,
  Save
} from "lucide-react";
import { toast } from "sonner";
import { googleSheets } from "@/functions/googleSheets";
import { User } from "@/entities/User"; // Added User import
import { Client } from "@/entities/Client";

export default function GoogleSheetsSync({ onClientsUpdate }) {
  const [isLoading, setIsLoading] = useState(false);
  const [sheetData, setSheetData] = useState({ headers: [], rows: [] });
  const [sheets, setSheets] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState('');
  const [spreadsheetUrl, setSpreadsheetUrl] = useState('');
  const [connected, setConnected] = useState(false);
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [editingCell, setEditingCell] = useState(null);
  const [newSheetName, setNewSheetName] = useState('');

  // loadSheets is now wrapped in useCallback and moved before checkConnection
  const loadSheets = useCallback(async (sheetId) => {
    try {
      const { data } = await googleSheets({
        action: 'getSheets',
        spreadsheetId: sheetId
      });

      if (data.success) {
        setSheets(data.sheets);
        // Modified logic: Don't set selectedSheet if it's already set
        if (data.sheets.length > 0) {
          setSelectedSheet(prev => prev || data.sheets[0].title);
        }
      }
    } catch (error) {
      console.error('Error loading sheets:', error);
      toast.error('שגיאה בטעינת רשימת הגיליונות');
    }
  }, []); // Dependencies are stable or external, so an empty array is appropriate

  // checkConnection is now wrapped in useCallback
  const checkConnection = useCallback(async () => {
    // בדיקה אם כבר יש חיבור לגיליון
    try {
      // Changed Client.me to User.me
      const user = await User.me(); 
      if (user?.google_sheets_clients_id) {
        setSpreadsheetId(user.google_sheets_clients_id);
        setSpreadsheetUrl(user.google_sheets_clients_url || '');
        setConnected(true);
        loadSheets(user.google_sheets_clients_id);
      }
    } catch (error) {
      console.error('Error checking connection:', error);
    }
  }, [loadSheets]); // loadSheets is a dependency now because it's a memoized function

  // useEffect now depends on checkConnection
  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  const connectToExistingSheet = async () => {
    if (!spreadsheetUrl.trim()) {
      toast.error('אנא הזן כתובת Google Sheets');
      return;
    }

    setIsLoading(true);
    try {
      const { data } = await googleSheets({
        action: 'connectExisting',
        spreadsheetUrl: spreadsheetUrl.trim()
      });

      if (data.success) {
        setSpreadsheetId(data.spreadsheetId);
        setConnected(true);
        toast.success('התחברת בהצלחה לגיליון הקיים!');
        loadSheets(data.spreadsheetId);
      } else {
        throw new Error(data.error || 'התחברות נכשלה');
      }
    } catch (error) {
      console.error('Connection error:', error);
      toast.error(`שגיאה בהתחברות: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSheetData = async () => {
    if (!spreadsheetId || !selectedSheet) return;

    setIsLoading(true);
    try {
      const { data } = await googleSheets({
        action: 'read',
        spreadsheetId,
        sheetName: selectedSheet
      });

      if (data.success) {
        setSheetData({
          headers: data.headers,
          rows: data.rows
        });
        toast.success(`נטען ${data.totalRows} שורות מהגיליון`);
      } else {
        throw new Error(data.error || 'קריאה נכשלה');
      }
    } catch (error) {
      console.error('Read error:', error);
      toast.error(`שגיאה בקריאת הנתונים: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const syncToGoogleSheets = async () => {
    if (!spreadsheetId || !selectedSheet) return;

    setIsLoading(true);
    try {
      // קבלת כל הלקוחות מהמערכת
      const clients = await Client.list();
      
      const headers = [
        'שם', 'טלפון', 'אימייל', 'חברה', 'כתובת', 
        'סטטוס', 'מקור הגעה', 'טווח תקציב', 'הערות', 'תאריך יצירה'
      ];

      const rows = clients.map(client => [
        client.name || '',
        client.phone || '',
        client.email || '',
        client.company || '',
        client.address || '',
        client.status || '',
        client.source || '',
        client.budget_range || '',
        client.notes || '',
        client.created_date ? new Date(client.created_date).toLocaleDateString('he-IL') : ''
      ]);

      const { data } = await googleSheets({
        action: 'update',
        spreadsheetId,
        sheetName: selectedSheet,
        headers,
        rows
      });

      if (data.success) {
        toast.success('הנתונים סונכרנו בהצלחה ל-Google Sheets!');
        loadSheetData(); // רענון התצוגה
      } else {
        throw new Error(data.error || 'סנכרון נכשל');
      }
    } catch (error) {
      console.error('Sync error:', error);
      toast.error(`שגיאה בסנכרון: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const syncFromGoogleSheets = async () => {
    if (sheetData.rows.length === 0) {
      toast.error('אין נתונים לסנכרון');
      return;
    }

    setIsLoading(true);
    try {
      // המרת נתוני הגיליון ללקוחות
      const clientsToCreate = sheetData.rows.map((row, index) => {
        const client = {};
        sheetData.headers.forEach((header, headerIndex) => {
          const value = row[headerIndex] || '';
          
          // מיפוי עמודות לשדות
          switch (header.toLowerCase()) {
            case 'שם':
            case 'name':
              client.name = value;
              break;
            case 'טלפון':
            case 'phone':
              client.phone = value;
              break;
            case 'אימייל':
            case 'email':
            case 'מייל':
              if (value && value.includes('@')) client.email = value;
              break;
            case 'חברה':
            case 'company':
              client.company = value;
              break;
            case 'כתובת':
            case 'address':
              client.address = value;
              break;
            case 'סטטוס':
            case 'status':
              if (['פוטנציאלי', 'פעיל', 'לא פעיל'].includes(value)) {
                client.status = value;
              }
              break;
            case 'מקור הגעה':
            case 'source':
              client.source = value;
              break;
            case 'הערות':
            case 'notes':
              client.notes = value;
              break;
          }
        });

        // וידוא שיש לפחות שם
        return client.name ? client : null;
      }).filter(Boolean);

      if (clientsToCreate.length === 0) {
        toast.error('לא נמצאו לקוחות תקינים לסנכרון');
        return;
      }

      // יצירת הלקוחות במערכת
      let created = 0;
      for (const clientData of clientsToCreate) {
        try {
          await Client.create(clientData);
          created++;
        } catch (error) {
          console.warn('Failed to create client:', clientData.name, error);
        }
      }

      toast.success(`נוצרו ${created} לקוחות חדשים מהגיליון!`);
      onClientsUpdate?.(); // רענון רשימת הלקוחות

    } catch (error) {
      console.error('Import error:', error);
      toast.error(`שגיאה בייבוא: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const addNewSheet = async () => {
    if (!newSheetName.trim()) {
      toast.error('אנא הזן שם לגיליון החדש');
      return;
    }

    setIsLoading(true);
    try {
      const { data } = await googleSheets({
        action: 'addSheet',
        spreadsheetId,
        sheetName: newSheetName.trim()
      });

      if (data.success) {
        toast.success('גיליון חדש נוסף בהצלחה!');
        setNewSheetName('');
        loadSheets(spreadsheetId);
        setSelectedSheet(data.sheetName);
      } else {
        throw new Error(data.error || 'הוספה נכשלה');
      }
    } catch (error) {
      console.error('Add sheet error:', error);
      toast.error(`שגיאה בהוספת גיליון: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const updateCell = async (rowIndex, colIndex, newValue) => {
    // עדכון מקומי
    const newRows = [...sheetData.rows];
    if (!newRows[rowIndex]) newRows[rowIndex] = [];
    newRows[rowIndex][colIndex] = newValue;
    setSheetData(prev => ({ ...prev, rows: newRows }));

    // עדכון ב-Google Sheets
    try {
      const range = `${selectedSheet}!${String.fromCharCode(65 + colIndex)}${rowIndex + 2}`; // +2 כי שורה 1 הם הכותרות
      
      await googleSheets({
        action: 'update',
        spreadsheetId,
        range,
        values: [[newValue]]
      });

      toast.success('התא עודכן בהצלחה');
    } catch (error) {
      console.error('Cell update error:', error);
      toast.error('שגיאה בעדכון התא');
    }
  };

  if (!connected) {
    return (
      <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 justify-end">
            התחברות ל-Google Sheets
            <FileSpreadsheet className="w-5 h-5 text-green-600" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2 text-right">
              כתובת Google Sheets
            </label>
            <Input
              value={spreadsheetUrl}
              onChange={(e) => setSpreadsheetUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/..."
              className="text-right"
              dir="ltr"
            />
          </div>
          <Button 
            onClick={connectToExistingSheet}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                מתחבר...
              </>
            ) : (
              <>
                <ExternalLink className="w-4 h-4 ml-2" />
                התחבר לגיליון קיים
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* כותרת וכפתורי פעולה */}
      <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="flex gap-2">
                <Button onClick={loadSheetData} disabled={isLoading} variant="outline">
                  <RefreshCw className={`w-4 h-4 ml-2 ${isLoading ? 'animate-spin' : ''}`} />
                  רענן
                </Button>
                <Button onClick={syncToGoogleSheets} disabled={isLoading} variant="outline">
                  <Upload className="w-4 h-4 ml-2" />
                  סנכרן למעלה
                </Button>
                <Button onClick={syncFromGoogleSheets} disabled={isLoading} variant="outline">
                  <Download className="w-4 h-4 ml-2" />
                  סנכרן למטה
                </Button>
                <Button 
                  onClick={() => window.open(spreadsheetUrl, '_blank')}
                  variant="outline"
                >
                  <ExternalLink className="w-4 h-4 ml-2" />
                  פתח בגוגל
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-green-100 text-green-700">
                <Check className="w-3 h-3 ml-1" />
                מחובר
              </Badge>
              <CardTitle className="flex items-center gap-2">
                סנכרון Google Sheets
                <FileSpreadsheet className="w-5 h-5 text-green-600" />
              </CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-center">
            <Select value={selectedSheet} onValueChange={setSelectedSheet}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="בחר גיליון" />
              </SelectTrigger>
              <SelectContent>
                {sheets.map(sheet => (
                  <SelectItem key={sheet.id} value={sheet.title}>
                    {sheet.title} ({sheet.rowCount} שורות)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex gap-2">
              <Input
                value={newSheetName}
                onChange={(e) => setNewSheetName(e.target.value)}
                placeholder="שם גיליון חדש"
                className="w-40"
              />
              <Button onClick={addNewSheet} disabled={isLoading} size="sm">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* תצוגת הנתונים */}
      {sheetData.headers.length > 0 && (
        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-right">
              נתוני הגיליון: {selectedSheet} ({sheetData.rows.length} שורות)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96 w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    {sheetData.headers.map((header, index) => (
                      <TableHead key={index} className="text-right">
                        {header}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sheetData.rows.map((row, rowIndex) => (
                    <TableRow key={rowIndex}>
                      {sheetData.headers.map((_, colIndex) => (
                        <TableCell 
                          key={colIndex} 
                          className="text-right cursor-pointer hover:bg-slate-50"
                          onClick={() => setEditingCell({ row: rowIndex, col: colIndex })}
                        >
                          {editingCell?.row === rowIndex && editingCell?.col === colIndex ? (
                            <Input
                              value={row[colIndex] || ''}
                              onChange={(e) => {
                                const newRows = [...sheetData.rows];
                                if (!newRows[rowIndex]) newRows[rowIndex] = [];
                                newRows[rowIndex][colIndex] = e.target.value;
                                setSheetData(prev => ({ ...prev, rows: newRows }));
                              }}
                              onBlur={() => {
                                updateCell(rowIndex, colIndex, row[colIndex] || '');
                                setEditingCell(null);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  updateCell(rowIndex, colIndex, row[colIndex] || '');
                                  setEditingCell(null);
                                }
                                if (e.key === 'Escape') {
                                  setEditingCell(null);
                                }
                              }}
                              className="h-8"
                              autoFocus
                            />
                          ) : (
                            <span className="block truncate max-w-xs">
                              {row[colIndex] || ''}
                            </span>
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
