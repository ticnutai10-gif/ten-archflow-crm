
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  FileSpreadsheet, 
  Download, 
  Upload,
  RefreshCw,
  Check,
  AlertCircle,
  Loader2,
  Eye,
  Database,
  ArrowRight,
  Link,
  FileText,
  Zap
} from "lucide-react";
import { toast } from "sonner";
import { Client } from "@/entities/Client";
import { googleSheets } from "@/functions/googleSheets";

export default function GoogleSheetsImporter({ onImportComplete, onClose }) {
  const [step, setStep] = useState(1);
  const [sheetUrl, setSheetUrl] = useState('https://docs.google.com/spreadsheets/d/11cHX_TgtMHsnBogdrEdGpdlqsnIZIJGumnP1_XdED2Q/edit?usp=sharing');
  const [isLoading, setIsLoading] = useState(false);
  const [sheetData, setSheetData] = useState({ headers: [], rows: [] });
  const [columnMapping, setColumnMapping] = useState({});
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [importMode, setImportMode] = useState('add');

  const systemFields = [
    { key: 'name', label: 'שם', required: true },
    { key: 'phone', label: 'טלפון' },
    { key: 'email', label: 'אימייל' },
    { key: 'company', label: 'חברה' },
    { key: 'address', label: 'כתובת' },
    { key: 'status', label: 'סטטוס' },
    { key: 'source', label: 'מקור הגעה' },
    { key: 'budget_range', label: 'טווח תקציב' },
    { key: 'notes', label: 'הערות' },
    { key: 'position', label: 'תפקיד' },
    { key: 'phone_secondary', label: 'טלפון נוסף' },
    { key: 'whatsapp', label: 'וואטסאפ' },
    { key: 'website', label: 'אתר אינטרנט' },
    { key: 'linkedin', label: 'LinkedIn' },
    { key: 'preferred_contact', label: 'אמצעי התקשרות מועדף' },
    { key: 'tags', label: 'תגיות' },
  ];

  // ייבוא ישיר מ-Google Sheets (ניסיון מחדש עם טיפול בשגיאות)
  const loadFromGoogleSheets = async () => {
    setIsLoading(true);
    try {
      const match = sheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (!match) {
        toast.error('כתובת Google Sheets לא תקינה');
        setIsLoading(false);
        return;
      }

      const spreadsheetId = match[1];
      
      // ניסיון קריאה מ-Google Sheets
      const response = await googleSheets({
        action: 'read',
        spreadsheetId: spreadsheetId,
        range: 'A:Z'
      });

      if (response.data && response.data.success) {
        // Clean and validate data
        const cleanHeaders = (response.data.headers || []).map(h => String(h || '').trim()).filter(Boolean);
        const cleanRows = (response.data.rows || []).map(row => 
          row.map(cell => String(cell || '').trim())
        ).filter(row => row.some(cell => cell !== '')); // Remove empty rows

        setSheetData({
          headers: cleanHeaders,
          rows: cleanRows
        });
        setStep(2);
        toast.success(`נטענו ${cleanRows.length} שורות מגוגל שיטס`);
      } else {
        throw new Error(response.data?.error || 'שגיאה בקריאת הנתונים');
      }
    } catch (error) {
      console.error('Google Sheets error:', error);
      toast.error('לא ניתן לקרוא ישירות מגוגל שיטס. נסה להוריד כ-CSV ולגרור לכאן.');
    } finally {
      setIsLoading(false);
    }
  };

  // טיפול בקובץ CSV (גרירה או בחירה)
  const handleFileUpload = (event) => {
    const file = event.target.files?.[0] || event.dataTransfer?.files?.[0];
    if (!file) return;

    setIsLoading(true);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const csvText = e.target.result;
        const lines = csvText.split('\n').filter(line => line.trim());
        
        if (lines.length === 0) {
          toast.error('הקובץ ריק');
          setIsLoading(false);
          return;
        }

        // ניתוח CSV מתקדם
        const parseCSVLine = (line) => {
          const result = [];
          let current = '';
          let inQuotes = false;
          
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              result.push(current.replace(/^"|"$/g, '').trim());
              current = '';
            } else {
              current += char;
            }
          }
          result.push(current.replace(/^"|"$/g, '').trim());
          return result;
        };

        const headers = parseCSVLine(lines[0]);
        const rows = lines.slice(1)
          .map(parseCSVLine)
          .filter(row => row.some(cell => cell !== '')); // Remove empty rows

        setSheetData({ headers, rows });
        setStep(2);
        toast.success(`טוען ${rows.length} שורות מהקובץ`);
      } catch (error) {
        console.error('CSV parsing error:', error);
        toast.error('שגיאה בניתוח הקובץ');
      } finally {
        setIsLoading(false);
      }
    };

    reader.readAsText(file, 'utf-8');
  };

  // אזור גרירה
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFileUpload(e);
  };

  const proceedToMapping = () => {
    // מיפוי אוטומטי מתקדם
    const autoMapping = {};
    
    sheetData.headers.forEach((header, index) => {
      const lowerHeader = header.toLowerCase().trim();
      
      // מיפויים בעברית ואנגלית
      const mappings = {
        name: ['שם', 'name', 'לקוח', 'client', 'customer'],
        phone: ['טלפון', 'phone', 'telephone', 'tel', 'פלאפון'],
        email: ['מייל', 'email', 'mail', 'אימייל', 'כתובת מייל'],
        company: ['חברה', 'company', 'business', 'עסק'],
        address: ['כתובת', 'address', 'מיקום', 'location'],
        status: ['סטטוס', 'status', 'מצב', 'state'],
        source: ['מקור', 'source', 'origin', 'מקור הגעה'],
        budget_range: ['תקציב', 'budget', 'price', 'מחיר'],
        notes: ['הערות', 'notes', 'comment', 'description', 'תיאור']
      };

      for (const [field, keywords] of Object.entries(mappings)) {
        if (keywords.some(keyword => lowerHeader.includes(keyword))) {
          autoMapping[index] = field;
          break;
        }
      }
    });

    setColumnMapping(autoMapping);
    setSelectedRows(new Set(sheetData.rows.map((_, index) => index)));
    setStep(3);
  };

  const executeImport = async () => {
    setIsLoading(true);
    let successCount = 0;
    let errorCount = 0;
    let duplicateCount = 0;
    const errors = [];

    try {
      const rowsToImport = Array.from(selectedRows).map(rowIndex => sheetData.rows[rowIndex]);

      for (const [rowOriginalIndex, row] of rowsToImport.entries()) {
        try {
          const clientData = {};
          const customData = {};

          // מיפוי נתונים
          Object.entries(columnMapping).forEach(([columnIndex, systemField]) => {
            const value = row[parseInt(columnIndex)]?.trim();
            if (value && value !== '') {
              if (systemFields.find(f => f.key === systemField)) {
                if (systemField === 'tags') {
                  clientData[systemField] = value.split(/[,;]/).map(t => t.trim()).filter(Boolean);
                } else {
                  clientData[systemField] = value;
                }
              } else if (systemField.startsWith('custom_')) {
                const customKey = systemField.replace('custom_', '');
                customData[customKey] = value;
              }
            }
          });

          // הוספת custom_data אם קיים
          if (Object.keys(customData).length > 0) {
            clientData.custom_data = customData;
          }

          // וידוא שם
          if (!clientData.name || clientData.name.trim() === '') {
            errors.push(`שורה ${rowOriginalIndex + 1}: חסר שם לקוח`);
            errorCount++;
            continue;
          }

          // Clean name - remove any non-printable characters or unusual symbols
          clientData.name = clientData.name.replace(/[^\p{L}\p{N}\s\-.']/gu, '').trim();


          // טיפול במצב עדכון
          if (importMode === 'update') {
            const existingClients = await Client.filter({
              name: clientData.name
            });
            
            if (existingClients.length > 0) {
              const existing = existingClients[0];
              const mergedData = { ...existing, ...clientData };
              // Don't override existing values with empty ones from the import
              Object.keys(clientData).forEach(key => {
                if (clientData[key] === '' && existing[key] !== undefined) {
                  // If incoming value is empty, but existing value is not, keep existing
                  mergedData[key] = existing[key];
                } else if (clientData[key] !== undefined) {
                  // Otherwise, use the incoming value (or existing if incoming is undefined)
                  mergedData[key] = clientData[key];
                }
              });
              await Client.update(existing.id, mergedData);
              duplicateCount++;
            } else {
              await Client.create(clientData);
              successCount++;
            }
          } else {
            // Check for existing client before creating in 'add' mode
            const existingClients = await Client.filter({
              name: clientData.name
            });
            
            if (existingClients.length > 0) {
              duplicateCount++;
              console.log(`Client "${clientData.name}" already exists, skipping creation.`);
            } else {
              await Client.create(clientData);
              successCount++;
            }
          }

        } catch (error) {
          console.error('Error importing row:', error);
          errors.push(`שורה ${rowOriginalIndex + 1}: ${error.message}`);
          errorCount++;
        }
      }

      // הודעת סיכום
      let message = `ייבוא הושלם! ${successCount} לקוחות חדשים נוספו`;
      if (duplicateCount > 0) message += `, ${duplicateCount} כבר קיימים/עודכנו`;
      if (errorCount > 0) message += `, ${errorCount} שגיאות`;

      if (errors.length > 0) {
        console.error('Import errors:', errors);
      }

      toast.success(message);
      onImportComplete?.();

    } catch (error) {
      console.error('Import error:', error);
      toast.error('שגיאה כללית בייבוא הנתונים');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleRowSelection = (rowIndex) => {
    const newSelection = new Set(selectedRows);
    if (newSelection.has(rowIndex)) {
      newSelection.delete(rowIndex);
    } else {
      newSelection.add(rowIndex);
    }
    setSelectedRows(newSelection);
  };

  const selectAllRows = () => {
    if (selectedRows.size === sheetData.rows.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(sheetData.rows.map((_, index) => index)));
    }
  };

  return (
    <Card className="w-full max-w-6xl mx-auto max-h-[90vh] flex flex-col">
      <CardHeader className="flex-shrink-0">
        <div className="flex items-center gap-3">
          <FileSpreadsheet className="w-6 h-6 text-blue-600" />
          <div>
            <CardTitle>ייבוא מתקדם מ-Google Sheets</CardTitle>
            <p className="text-sm text-slate-600">
              ייבוא אוטומטי או ידני עם מיפוי חכם
            </p>
          </div>
          <Badge className="bg-green-100 text-green-700">
            <Zap className="w-3 h-3 ml-1" />
            מיפוי אוטומטי
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea className="flex-1 max-h-[70vh]">
          <div className="p-6 space-y-6 pb-20"> {/* pb-20 ensures space for the fixed footer */}
            {/* שלב 1 */}
            {step === 1 && (
              <div className="space-y-6">
                {/* אופציה 1: Google Sheets ישיר */}
                <div className="space-y-3">
                  <Label htmlFor="sheet-url" className="text-lg font-medium">
                    🔗 ייבוא ישיר מ-Google Sheets
                  </Label>
                  <Input
                    id="sheet-url"
                    value={sheetUrl}
                    onChange={(e) => setSheetUrl(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    className="font-mono text-sm"
                  />
                  <Button onClick={loadFromGoogleSheets} disabled={isLoading} className="w-full">
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                        מנסה לטעון...
                      </>
                    ) : (
                      <>
                        <Link className="w-4 h-4 ml-2" />
                        טען ישירות מגוגל שיטס
                      </>
                    )}
                  </Button>
                </div>

                {/* מפריד */}
                <div className="flex items-center gap-4">
                  <div className="flex-1 border-t"></div>
                  <span className="text-sm text-slate-500">או</span>
                  <div className="flex-1 border-t"></div>
                </div>

                {/* אופציה 2: גרירה או בחירת קובץ */}
                <div className="space-y-3">
                  <Label className="text-lg font-medium">
                    📁 העלאת קובץ CSV
                  </Label>
                  
                  {/* אזור גרירה */}
                  <div
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                      dragActive ? 'border-blue-400 bg-blue-50' : 'border-slate-300 hover:border-slate-400'
                    }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                  >
                    <FileText className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <p className="text-lg font-medium text-slate-700 mb-2">
                      גרור קובץ CSV לכאן
                    </p>
                    <p className="text-sm text-slate-500 mb-4">
                      או לחץ לבחירת קובץ
                    </p>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="csv-upload"
                    />
                    <Button 
                      variant="outline" 
                      onClick={() => document.getElementById('csv-upload')?.click()}
                      disabled={isLoading}
                    >
                      <Upload className="w-4 h-4 ml-2" />
                      בחר קובץ CSV
                    </Button>
                  </div>
                </div>

                <Alert className="border-blue-200 bg-blue-50">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                  <AlertTitle className="text-blue-800">טיפ לייבוא מהיר</AlertTitle>
                  <AlertDescription className="text-blue-700">
                    <ol className="list-decimal list-inside mt-2 space-y-1">
                      <li>פתח את הגיליון שלך ב-Google Sheets</li>
                      <li>לחץ על קובץ → הורד → CSV</li>
                      <li>גרור את הקובץ שהורדת לאזור למעלה</li>
                    </ol>
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {/* שלב 2: תצוגה מקדימה */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Eye className="w-5 h-5" />
                    תצוגה מקדימה
                  </h3>
                  <Badge variant="outline" className="text-lg px-3 py-1">
                    {sheetData.rows.length} שורות
                  </Badge>
                </div>

                <Alert className="border-green-200 bg-green-50">
                  <Check className="h-4 w-4 text-green-600" />
                  <AlertTitle className="text-green-800">הנתונים נטענו בהצלחה!</AlertTitle>
                  <AlertDescription className="text-green-700">
                    נמצאו {sheetData.headers.length} עמודות ו-{sheetData.rows.length} שורות נתונים
                  </AlertDescription>
                </Alert>

                <div className="border rounded-lg max-h-72 overflow-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-white z-10">
                      <TableRow>
                        <TableHead className="w-12 text-center">#</TableHead>
                        {sheetData.headers.map((header, index) => (
                          <TableHead key={index} className="text-right font-medium min-w-32">
                            {header}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sheetData.rows.slice(0, 15).map((row, rowIndex) => (
                        <TableRow key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-slate-50' : ''}>
                          <TableCell className="text-center text-xs text-slate-500">
                            {rowIndex + 1}
                          </TableCell>
                          {row.map((cell, cellIndex) => (
                            <TableCell key={cellIndex} className="text-right text-sm">
                              <div className="max-w-32 truncate" title={cell}>
                                {cell || <span className="text-slate-400">ריק</span>}
                              </div>
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {sheetData.rows.length > 15 && (
                  <p className="text-sm text-slate-500 text-center">
                    מציג 15 שורות ראשונות מתוך {sheetData.rows.length} • כל השורות ייובאו
                  </p>
                )}
              </div>
            )}

            {/* שלב 3: מיפוי */}
            {step === 3 && (
              <div className="space-y-6">
                {/* כותרת קבועה */}
                <div className="flex items-center justify-between sticky top-0 bg-white z-20 py-2 border-b -mx-6 px-6">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Database className="w-5 h-5" />
                    מיפוי אוטומטי ובחירת נתונים
                  </h3>
                  <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" onClick={selectAllRows}>
                      {selectedRows.size === sheetData.rows.length ? 'בטל בחירת הכל' : 'בחר הכל'}
                    </Button>
                    <Badge variant="outline" className="text-lg px-3 py-1">
                      {selectedRows.size} נבחרו
                    </Badge>
                  </div>
                </div>

                {/* תוכן הגלילה */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>אופן הייבוא</Label>
                    <Select value={importMode} onValueChange={setImportMode}>
                      <SelectTrigger className="max-w-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="add">הוסף רק לקוחות חדשים</SelectItem>
                        <SelectItem value="update">עדכן לקוחות קיימים או הוסף חדשים</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-medium text-slate-800">מיפוי עמודות (זוהה אוטומטית):</h4>
                    <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg bg-slate-50 p-3">
                      {sheetData.headers.map((header, index) => (
                        <div key={index} className="flex items-center gap-4 p-3 border rounded-lg bg-white hover:shadow-sm transition-shadow">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-slate-800 truncate">{header}</div>
                            <div className="text-sm text-slate-500 truncate">
                              דוגמה: <span className="font-mono bg-slate-100 px-1 rounded text-xs">
                                {sheetData.rows[0]?.[index] || 'אין נתונים'}
                              </span>
                            </div>
                          </div>
                          <ArrowRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          <Select
                            value={columnMapping[index] || ''}
                            onValueChange={(value) => setColumnMapping(prev => ({
                              ...prev,
                              [index]: value || undefined
                            }))}
                          >
                            <SelectTrigger className="w-56 flex-shrink-0">
                              <SelectValue placeholder="בחר שדה במערכת" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={null}>❌ אל תייבא</SelectItem>
                              {systemFields.map((field) => (
                                <SelectItem key={field.key} value={field.key}>
                                  {field.required && '⭐'} {field.label}
                                </SelectItem>
                              ))}
                              <SelectItem value={`custom_${header}`}>
                                ✨ שדה מותאם: {header}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          {columnMapping[index] === 'name' && (
                            <Badge className="bg-green-100 text-green-800 flex-shrink-0">חובה</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-medium text-slate-800">בחר שורות לייבוא:</h4>
                    <div className="border rounded-lg bg-white max-h-48 overflow-y-auto">
                      <div className="p-3 space-y-1">
                        {sheetData.rows.map((row, rowIndex) => (
                          <div key={rowIndex} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-md group">
                            <Checkbox
                              checked={selectedRows.has(rowIndex)}
                              onCheckedChange={() => toggleRowSelection(rowIndex)}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate">
                                {row[0] || `שורה ${rowIndex + 1}`}
                              </div>
                              <div className="text-xs text-slate-500 truncate">
                                {row.slice(1, 4).filter(Boolean).join(' • ') || 'נתונים נוספים...'}
                              </div>
                            </div>
                            <Badge variant="outline" className="text-xs flex-shrink-0">
                              {rowIndex + 1}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {!Object.values(columnMapping).includes('name') && (
                    <Alert className="border-red-200 bg-red-50">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <AlertTitle className="text-red-800">שדה חובה חסר</AlertTitle>
                      <AlertDescription className="text-red-700">
                        חובה למפות לפחות עמודה אחת לשדה <strong>"שם"</strong> כדי להתחיל את הייבוא
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* כפתורים קבועים בתחתית */}
        <div className="flex-shrink-0 sticky bottom-0 bg-white border-t pt-4 pb-6 px-6 -mx-6 z-30">
          {step === 1 && (
            <Button variant="outline" onClick={onClose} className="ml-auto">
              ביטול
            </Button>
          )}

          {step === 2 && (
            <>
              <Button onClick={proceedToMapping} className="flex-1">
                <ArrowRight className="w-4 h-4 ml-2" />
                המשך למיפוי אוטומטי
              </Button>
              <Button variant="outline" onClick={() => setStep(1)}>
                חזור
              </Button>
            </>
          )}

          {step === 3 && (
            <>
              <Button 
                onClick={executeImport}
                disabled={selectedRows.size === 0 || !Object.values(columnMapping).includes('name') || isLoading}
                className="flex-1 text-lg py-6"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 ml-2 animate-spin" />
                    מייבא...
                  </>
                ) : (
                  <>
                    <Database className="w-5 h-5 ml-2" />
                    ייבא {selectedRows.size} לקוחות למערכת
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={() => setStep(2)} disabled={isLoading}>
                חזור
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
