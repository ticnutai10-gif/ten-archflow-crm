import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Download, FileSpreadsheet, FileText, FileCode, CheckCircle2, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import * as XLSX from "xlsx";

export default function ExportDialog({ 
  open, 
  onClose, 
  spreadsheetName,
  columns,
  rowsData,
  cellStyles,
  onExportToGoogle 
}) {
  const [format, setFormat] = useState("xlsx");
  const [includeStyles, setIncludeStyles] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");

  const handleExport = async () => {
    setIsExporting(true);
    setProgress(0);
    setStatusText("מתחיל ייצוא...");
    
    try {
      // Google Sheets export
      if (format === 'google_sheets') {
        setStatusText("מתחבר ל-Google Sheets...");
        setProgress(20);
        if (onExportToGoogle) {
          setProgress(50);
          setStatusText("מעלה נתונים...");
          await onExportToGoogle();
          setProgress(100);
          setStatusText("הושלם!");
          await new Promise(r => setTimeout(r, 500));
          onClose();
        } else {
          toast.error("ייצוא ל-Google Sheets אינו זמין כרגע");
        }
        setIsExporting(false);
        return;
      }

      // JSON export - client-side
      if (format === 'json') {
        setStatusText("מכין נתונים...");
        setProgress(30);
        
        const exportData = {
          name: spreadsheetName,
          exported_at: new Date().toISOString(),
          columns: columns,
          rows_data: rowsData,
          cell_styles: includeStyles ? cellStyles : {},
          summary: {
            total_rows: (rowsData || []).length,
            total_columns: (columns || []).length
          }
        };
        
        setStatusText("יוצר קובץ JSON...");
        setProgress(60);
        
        const jsonStr = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json; charset=utf-8' });
        
        setStatusText("מוריד קובץ...");
        setProgress(90);
        
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${spreadsheetName || 'export'}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
        
        setProgress(100);
        setStatusText("הושלם בהצלחה!");
        toast.success("קובץ JSON יוצא בהצלחה");
        await new Promise(r => setTimeout(r, 500));
        onClose();
        setIsExporting(false);
        return;
      }

      // CSV export - client-side
      if (format === 'csv') {
        setStatusText("מכין נתונים...");
        setProgress(20);
        
        const visibleColumns = (columns || []).filter(c => c.visible !== false);
        const headers = visibleColumns.map(c => c.title || c.key).join(',');
        
        setStatusText("ממיר לפורמט CSV...");
        setProgress(50);
        
        const csvRows = (rowsData || []).map(row => {
          return visibleColumns.map(col => {
            const val = row[col.key] ?? '';
            const strVal = String(val).replace(/"/g, '""');
            return `"${strVal}"`;
          }).join(',');
        });
        
        const csvContent = '\uFEFF' + [headers, ...csvRows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv; charset=utf-8' });
        
        setStatusText("מוריד קובץ...");
        setProgress(90);
        
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${spreadsheetName || 'export'}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
        
        setProgress(100);
        setStatusText("הושלם בהצלחה!");
        toast.success("קובץ CSV יוצא בהצלחה");
        await new Promise(r => setTimeout(r, 500));
        onClose();
        setIsExporting(false);
        return;
      }

      // Excel export - client-side using xlsx library
      if (format === 'xlsx') {
        setStatusText("מכין נתונים...");
        setProgress(20);
        
        const visibleColumns = (columns || []).filter(c => c.visible !== false);
        
        setStatusText("יוצר גיליון Excel...");
        setProgress(40);
        
        // Prepare data for Excel
        const wsData = [];
        
        // Headers
        wsData.push(visibleColumns.map(c => c.title || c.key));
        
        // Data rows
        (rowsData || []).forEach(row => {
          wsData.push(visibleColumns.map(col => row[col.key] ?? ''));
        });
        
        setStatusText("מעצב גיליון...");
        setProgress(60);
        
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        
        // Set column widths
        ws['!cols'] = visibleColumns.map(col => ({
          wch: Math.max(15, (col.title || col.key).length + 5)
        }));
        
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, spreadsheetName?.substring(0, 31) || 'Sheet1');
        
        setStatusText("מוריד קובץ...");
        setProgress(90);
        
        XLSX.writeFile(wb, `${spreadsheetName || 'export'}.xlsx`);
        
        setProgress(100);
        setStatusText("הושלם בהצלחה!");
        toast.success("קובץ Excel יוצא בהצלחה");
        await new Promise(r => setTimeout(r, 500));
        onClose();
      }
      
    } catch (error) {
      console.error("Export error:", error);
      setStatusText("שגיאה בייצוא");
      toast.error("שגיאה בייצוא: " + (error?.message || 'שגיאה לא ידועה'));
    } finally {
      setIsExporting(false);
      setProgress(0);
      setStatusText("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5 text-blue-600" />
            ייצוא נתונים
          </DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-6">
          {isExporting ? (
            <div className="space-y-4 py-6">
              <div className="flex items-center justify-center gap-3">
                {progress < 100 ? (
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                ) : (
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                )}
                <span className="text-lg font-medium">{statusText}</span>
              </div>
              <Progress value={progress} className="h-3" />
              <div className="text-center text-sm text-slate-500">{progress}%</div>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                <Label>בחר פורמט</Label>
                <RadioGroup value={format} onValueChange={setFormat} className="grid grid-cols-2 gap-4">
                  <div>
                    <RadioGroupItem value="xlsx" id="xlsx" className="peer sr-only" />
                    <Label
                      htmlFor="xlsx"
                      className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-blue-600 peer-data-[state=checked]:bg-blue-50 cursor-pointer"
                    >
                      <FileSpreadsheet className="mb-2 h-6 w-6 text-green-600" />
                      Excel (XLSX)
                    </Label>
                  </div>
                  
                  <div>
                    <RadioGroupItem value="json" id="json" className="peer sr-only" />
                    <Label
                      htmlFor="json"
                      className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-blue-600 peer-data-[state=checked]:bg-blue-50 cursor-pointer"
                    >
                      <FileCode className="mb-2 h-6 w-6 text-orange-600" />
                      JSON
                    </Label>
                  </div>

                  <div>
                    <RadioGroupItem value="csv" id="csv" className="peer sr-only" />
                    <Label
                      htmlFor="csv"
                      className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-blue-600 peer-data-[state=checked]:bg-blue-50 cursor-pointer"
                    >
                      <FileText className="mb-2 h-6 w-6 text-blue-600" />
                      CSV
                    </Label>
                  </div>

                  <div>
                    <RadioGroupItem value="google_sheets" id="google_sheets" className="peer sr-only" />
                    <Label
                      htmlFor="google_sheets"
                      className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-blue-600 peer-data-[state=checked]:bg-blue-50 cursor-pointer"
                    >
                      <FileSpreadsheet className="mb-2 h-6 w-6 text-green-700" />
                      Google Sheets
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {(format === 'xlsx' || format === 'json') && (
                <div className="flex items-center space-x-2 space-x-reverse bg-slate-50 p-3 rounded-lg">
                  <Checkbox 
                    id="styles" 
                    checked={includeStyles} 
                    onCheckedChange={setIncludeStyles}
                  />
                  <Label htmlFor="styles" className="cursor-pointer">כלול עיצובים (צבעים, הדגשות)</Label>
                </div>
              )}
            </>
          )}
        </div>

        {!isExporting && (
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              ביטול
            </Button>
            <Button onClick={handleExport} className="bg-blue-600 hover:bg-blue-700 gap-2">
              <Download className="w-4 h-4" />
              ייצא
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}