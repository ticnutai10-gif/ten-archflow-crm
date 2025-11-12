
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Upload,
  FileSpreadsheet,
  ArrowRight,
  Check,
  X,
  AlertCircle,
  Info,
  Download,
  RefreshCw,
  CheckCircle2,
  XCircle,
  FileText,
  Sparkles
} from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

const STEP = {
  UPLOAD: 1,
  MAP_COLUMNS: 2,
  REVIEW: 3,
  IMPORT: 4
};

export default function SpreadsheetImporter({ spreadsheet, columns, onImportComplete, onClose }) {
  const [currentStep, setCurrentStep] = useState(STEP.UPLOAD);
  const [file, setFile] = useState(null);
  const [parsedData, setParsedData] = useState([]);
  const [columnMapping, setColumnMapping] = useState({});
  const [duplicateStrategy, setDuplicateStrategy] = useState('skip'); // skip, overwrite, create_new
  const [isProcessing, setIsProcessing] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState(null);

  // Handle file upload
  const handleFileUpload = async (e) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    const fileName = uploadedFile.name.toLowerCase();
    if (!fileName.endsWith('.csv') && !fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
      toast.error('נא להעלות קובץ CSV או Excel (.xlsx, .xls, .csv)');
      return;
    }

    setFile(uploadedFile);
    setIsProcessing(true);
    
    try {
      // ✅ העלאת הקובץ תחילה
      const { file_url } = await base44.integrations.Core.UploadFile({ file: uploadedFile });
      
      console.log('📤 קובץ הועלה:', file_url);
      
      // ✅ שימוש בפונקציית parseSpreadsheet שתומכת בעברית
      const result = await base44.functions.invoke('parseSpreadsheet', { file_url });
      
      console.log('📊 תוצאת פענוח:', result);
      
      if (result.data.status === 'success') {
        const rows = result.data.rows || [];
        const headers = result.data.headers || [];
        
        if (rows.length === 0) {
          toast.error('הקובץ ריק או לא נמצאו נתונים');
          return;
        }

        setParsedData(rows);
        
        // Auto-map columns based on similar names
        const autoMapping = {};
        headers.forEach(header => {
          const normalizedHeader = header.toLowerCase().trim();
          const matchedColumn = columns.find(col => 
            col.title.toLowerCase().includes(normalizedHeader) ||
            normalizedHeader.includes(col.title.toLowerCase())
          );
          if (matchedColumn) {
            autoMapping[header] = matchedColumn.key;
          }
        });
        
        setColumnMapping(autoMapping);
        setCurrentStep(STEP.MAP_COLUMNS);
        toast.success(`✅ נטענו ${rows.length} שורות בהצלחה`);
      } else {
        console.error('שגיאה בפענוח:', result.data);
        toast.error('שגיאה בקריאת הקובץ: ' + (result.data.error || 'לא ידוע'));
      }
    } catch (error) {
      console.error('❌ שגיאה בטעינת הקובץ:', error);
      toast.error('שגיאה בטעינת הקובץ: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Execute import
  const executeImport = async () => {
    setIsProcessing(true);
    setCurrentStep(STEP.IMPORT);
    setImportProgress(0);

    let created = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;

    try {
      const totalRows = parsedData.length;
      
      for (let i = 0; i < parsedData.length; i++) {
        const rawRow = parsedData[i];
        
        try {
          // Map data to spreadsheet columns
          const mappedRow = { id: `row_${Date.now()}_${i}` };
          Object.keys(columnMapping).forEach(fileColumn => {
            const spreadsheetColumn = columnMapping[fileColumn];
            if (spreadsheetColumn && rawRow[fileColumn]) {
              mappedRow[spreadsheetColumn] = rawRow[fileColumn];
            }
          });

          // Check for duplicates (based on first mapped column value)
          const firstMappedColumn = Object.values(columnMapping)[0];
          const firstValue = mappedRow[firstMappedColumn];
          
          const existingRow = spreadsheet.rows_data?.find(row => 
            row[firstMappedColumn] === firstValue
          );

          if (existingRow) {
            if (duplicateStrategy === 'skip') {
              skipped++;
            } else if (duplicateStrategy === 'overwrite') {
              // Update existing row
              mappedRow.id = existingRow.id;
              updated++;
            } else if (duplicateStrategy === 'create_new') {
              created++;
            }
          } else {
            created++;
          }

          setImportProgress(Math.round(((i + 1) / totalRows) * 100));
        } catch (error) {
          console.error('Error processing row:', error);
          errors++;
        }
      }

      // Update spreadsheet with new data
      const newRows = parsedData.map((rawRow, i) => {
        const mappedRow = { id: `row_${Date.now()}_${i}` };
        Object.keys(columnMapping).forEach(fileColumn => {
          const spreadsheetColumn = columnMapping[fileColumn];
          if (spreadsheetColumn && rawRow[fileColumn]) {
            mappedRow[spreadsheetColumn] = rawRow[fileColumn];
          }
        });
        return mappedRow;
      });

      // Combine with existing rows based on strategy
      let finalRows = [];
      if (duplicateStrategy === 'skip') {
        finalRows = [...(spreadsheet.rows_data || []), ...newRows.filter(newRow => {
          const firstMappedColumn = Object.values(columnMapping)[0];
          const firstValue = newRow[firstMappedColumn];
          return !spreadsheet.rows_data?.some(row => row[firstMappedColumn] === firstValue);
        })];
      } else if (duplicateStrategy === 'overwrite') {
        const existingMap = new Map((spreadsheet.rows_data || []).map(row => [row.id, row]));
        newRows.forEach(newRow => {
          const firstMappedColumn = Object.values(columnMapping)[0];
          const firstValue = newRow[firstMappedColumn];
          const existing = (spreadsheet.rows_data || []).find(row => row[firstMappedColumn] === firstValue);
          if (existing) {
            existingMap.set(existing.id, { ...existing, ...newRow, id: existing.id });
          } else {
            existingMap.set(newRow.id, newRow);
          }
        });
        finalRows = Array.from(existingMap.values());
      } else {
        finalRows = [...(spreadsheet.rows_data || []), ...newRows];
      }

      setImportResults({ created, updated, skipped, errors, total: parsedData.length });
      
      if (onImportComplete) {
        onImportComplete(finalRows);
      }
      
      toast.success(`✓ הייבוא הושלם: ${created} נוספו, ${updated} עודכנו, ${skipped} דולגו`);
    } catch (error) {
      console.error('Import error:', error);
      toast.error('שגיאה בייבוא הנתונים');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto shadow-2xl border-2" dir="rtl">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 border-b-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
              <Upload className="w-6 h-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold">ייבוא נתונים לטבלה</CardTitle>
              <p className="text-sm text-slate-600 mt-1">{spreadsheet?.name || 'גיליון כללי'}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-4 mt-6">
          {[
            { num: 1, label: 'העלאה', icon: Upload },
            { num: 2, label: 'מיפוי', icon: ArrowRight },
            { num: 3, label: 'בדיקה', icon: FileText },
            { num: 4, label: 'ייבוא', icon: Check }
          ].map(({ num, label, icon: Icon }) => (
            <div key={num} className="flex items-center gap-2">
              <div className={`
                flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all
                ${currentStep >= num 
                  ? 'bg-gradient-to-br from-blue-500 to-purple-600 border-blue-600 text-white shadow-lg' 
                  : 'bg-white border-slate-300 text-slate-400'
                }
              `}>
                {currentStep > num ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
              </div>
              <span className={`text-sm font-medium ${currentStep >= num ? 'text-blue-700' : 'text-slate-500'}`}>
                {label}
              </span>
              {num < 4 && <ArrowRight className="w-4 h-4 text-slate-400" />}
            </div>
          ))}
        </div>
      </CardHeader>

      <CardContent className="p-6">
        {/* Step 1: Upload */}
        {currentStep === STEP.UPLOAD && (
          <div className="space-y-6">
            {isProcessing ? (
              <div className="text-center py-12">
                <RefreshCw className="w-16 h-16 mx-auto mb-4 text-blue-600 animate-spin" />
                <h3 className="text-xl font-semibold text-slate-900 mb-2">מעלה ומעבד קובץ...</h3>
                <p className="text-sm text-slate-600">אנא המתן, זה עשוי לקחת כמה שניות</p>
              </div>
            ) : (
              <>
                <div className="text-center py-12 border-2 border-dashed border-blue-300 rounded-xl bg-blue-50/30 hover:bg-blue-50/50 transition-all">
                  <FileSpreadsheet className="w-16 h-16 mx-auto mb-4 text-blue-600" />
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">העלה קובץ CSV או Excel</h3>
                  <p className="text-sm text-slate-600 mb-4">תומך בעברית ובכל שפות אחרות</p>
                  
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <div className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg">
                      <Upload className="w-5 h-5" />
                      בחר קובץ
                    </div>
                    <input
                      id="file-upload"
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-900">
                      <p className="font-semibold mb-2">פורמטים נתמכים:</p>
                      <ul className="list-disc list-inside space-y-1 text-blue-800">
                        <li>קבצי CSV (כולל תמיכה מלאה בעברית)</li>
                        <li>Microsoft Excel (.xlsx, .xls)</li>
                        <li>השורה הראשונה חייבת להכיל כותרות עמודות</li>
                        <li>הקידוד מזוהה אוטומטית (UTF-8, Windows-1255, וכו')</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Step 2: Map Columns */}
        {currentStep === STEP.MAP_COLUMNS && (
          <div className="space-y-6">
            <div className="flex items-center justify-between bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-xl border border-purple-200">
              <div>
                <h3 className="font-semibold text-lg text-purple-900">מיפוי עמודות</h3>
                <p className="text-sm text-purple-700 mt-1">התאם את עמודות הקובץ לעמודות הטבלה</p>
              </div>
              <Badge variant="outline" className="bg-white text-purple-700 border-purple-300">
                {parsedData.length} שורות
              </Badge>
            </div>

            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-3">
                {Object.keys(parsedData[0] || {}).map(fileColumn => (
                  <div key={fileColumn} className="p-4 bg-white border-2 rounded-xl hover:border-blue-300 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <Label className="font-semibold text-slate-900 mb-2 block">
                          {fileColumn}
                        </Label>
                        <p className="text-xs text-slate-500">
                          דוגמה: {parsedData[0]?.[fileColumn]?.substring(0, 50)}...
                        </p>
                      </div>

                      <ArrowRight className="w-5 h-5 text-slate-400" />

                      <div className="flex-1">
                        <Select
                          value={columnMapping[fileColumn] || ''}
                          onValueChange={(value) => setColumnMapping(prev => ({
                            ...prev,
                            [fileColumn]: value
                          }))}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="לא ממופה" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="_skip">אל תייבא עמודה זו</SelectItem>
                            <Separator className="my-2" />
                            {columns.filter(col => col.key !== 'actions').map(col => (
                              <SelectItem key={col.key} value={col.key}>
                                {col.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <Separator />

            {/* Duplicate Handling Strategy */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <Label className="font-semibold text-amber-900 mb-3 block flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                טיפול ברשומות כפולות
              </Label>
              
              <RadioGroup value={duplicateStrategy} onValueChange={setDuplicateStrategy}>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 space-x-reverse p-3 bg-white rounded-lg border hover:border-blue-300 transition-all cursor-pointer">
                    <RadioGroupItem value="skip" id="skip" />
                    <Label htmlFor="skip" className="flex-1 cursor-pointer">
                      <div className="font-medium text-slate-900">דלג על כפולים</div>
                      <p className="text-xs text-slate-600 mt-1">השאר את הרשומות הקיימות ללא שינוי</p>
                    </Label>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700">מומלץ</Badge>
                  </div>

                  <div className="flex items-center space-x-2 space-x-reverse p-3 bg-white rounded-lg border hover:border-blue-300 transition-all cursor-pointer">
                    <RadioGroupItem value="overwrite" id="overwrite" />
                    <Label htmlFor="overwrite" className="flex-1 cursor-pointer">
                      <div className="font-medium text-slate-900">שכתב קיימים</div>
                      <p className="text-xs text-slate-600 mt-1">עדכן רשומות קיימות עם נתונים חדשים</p>
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2 space-x-reverse p-3 bg-white rounded-lg border hover:border-blue-300 transition-all cursor-pointer">
                    <RadioGroupItem value="create_new" id="create_new" />
                    <Label htmlFor="create_new" className="flex-1 cursor-pointer">
                      <div className="font-medium text-slate-900">צור רשומות חדשות</div>
                      <p className="text-xs text-slate-600 mt-1">הוסף את כל הרשומות גם אם יש כפולים</p>
                    </Label>
                  </div>
                </div>
              </RadioGroup>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setCurrentStep(STEP.UPLOAD);
                  setFile(null);
                  setParsedData([]);
                }}
                className="gap-2"
              >
                <ArrowRight className="w-4 h-4 rotate-180" />
                חזור
              </Button>
              <Button
                onClick={() => setCurrentStep(STEP.REVIEW)}
                disabled={Object.keys(columnMapping).length === 0}
                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 gap-2"
              >
                המשך לבדיקה
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Review */}
        {currentStep === STEP.REVIEW && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-xl border border-green-200">
              <h3 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                סיכום לפני ייבוא
              </h3>
              <div className="grid grid-cols-2 gap-4 mt-3">
                <div className="bg-white p-3 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{parsedData.length}</div>
                  <div className="text-xs text-slate-600">שורות לייבוא</div>
                </div>
                <div className="bg-white p-3 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {Object.keys(columnMapping).filter(k => columnMapping[k] !== '_skip').length}
                  </div>
                  <div className="text-xs text-slate-600">עמודות ממופות</div>
                </div>
              </div>
            </div>

            {/* Preview mapped data */}
            <div className="border-2 rounded-xl overflow-hidden">
              <div className="bg-slate-100 p-3 border-b">
                <h4 className="font-semibold text-slate-900">תצוגה מקדימה (5 שורות ראשונות)</h4>
              </div>
              <ScrollArea className="h-64">
                <table className="w-full text-sm" dir="rtl">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      {Object.values(columnMapping)
                        .filter(col => col !== '_skip')
                        .map(colKey => {
                          const column = columns.find(c => c.key === colKey);
                          return (
                            <th key={colKey} className="p-2 text-right font-semibold border-b">
                              {column?.title}
                            </th>
                          );
                        })}
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.slice(0, 5).map((row, i) => (
                      <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                        {Object.keys(columnMapping)
                          .filter(fileCol => columnMapping[fileCol] !== '_skip')
                          .map(fileCol => (
                            <td key={fileCol} className="p-2 border-b text-slate-700">
                              {row[fileCol]?.substring(0, 50)}
                            </td>
                          ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollArea>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setCurrentStep(STEP.MAP_COLUMNS)}
                className="gap-2"
              >
                <ArrowRight className="w-4 h-4 rotate-180" />
                חזור
              </Button>
              <Button
                onClick={executeImport}
                className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 gap-2 shadow-lg"
              >
                <Sparkles className="w-5 h-5" />
                התחל ייבוא
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Import Progress & Results */}
        {currentStep === STEP.IMPORT && (
          <div className="space-y-6">
            {isProcessing ? (
              <div className="text-center py-12">
                <RefreshCw className="w-16 h-16 mx-auto mb-4 text-blue-600 animate-spin" />
                <h3 className="text-xl font-semibold text-slate-900 mb-2">מייבא נתונים...</h3>
                <Progress value={importProgress} className="w-full max-w-md mx-auto h-3" />
                <p className="text-sm text-slate-600 mt-2">{importProgress}% הושלם</p>
              </div>
            ) : importResults ? (
              <div className="space-y-4">
                <div className="text-center py-8">
                  <CheckCircle2 className="w-20 h-20 mx-auto mb-4 text-green-600" />
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">הייבוא הושלם בהצלחה!</h3>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                    <CardContent className="p-4 text-center">
                      <div className="text-3xl font-bold text-green-700">{importResults.created}</div>
                      <div className="text-xs text-green-600 mt-1">נוספו</div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
                    <CardContent className="p-4 text-center">
                      <div className="text-3xl font-bold text-blue-700">{importResults.updated}</div>
                      <div className="text-xs text-blue-600 mt-1">עודכנו</div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200">
                    <CardContent className="p-4 text-center">
                      <div className="text-3xl font-bold text-amber-700">{importResults.skipped}</div>
                      <div className="text-xs text-amber-600 mt-1">דולגו</div>
                    </CardContent>
                  </Card>

                  {importResults.errors > 0 && (
                    <Card className="bg-gradient-to-br from-red-50 to-pink-50 border-red-200">
                      <CardContent className="p-4 text-center">
                        <div className="text-3xl font-bold text-red-700">{importResults.errors}</div>
                        <div className="text-xs text-red-600 mt-1">שגיאות</div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                <Button
                  onClick={onClose}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 gap-2"
                >
                  <Check className="w-5 h-5" />
                  סיים
                </Button>
              </div>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
