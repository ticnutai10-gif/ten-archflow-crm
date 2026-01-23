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

  const handleExport = async () => {
    setIsExporting(true);
    try {
      if (format === 'google_sheets') {
        if (onExportToGoogle) {
          await onExportToGoogle();
          onClose();
        } else {
          toast.error("ייצוא ל-Google Sheets אינו זמין כרגע");
        }
        setIsExporting(false);
        return;
      }

      // JSON export - do it client-side for reliability
      if (format === 'json') {
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
        
        const jsonStr = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json; charset=utf-8' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${spreadsheetName || 'export'}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
        
        toast.success("קובץ JSON יוצא בהצלחה");
        onClose();
        setIsExporting(false);
        return;
      }

      // For Excel, use the backend function
      const payload = {
        format,
        data: rowsData,
        columns: columns,
        styles: cellStyles,
        options: {
          includeStyles,
          sheetName: spreadsheetName
        }
      };

      // Try using the SDK invoke which returns axios response
      const response = await base44.functions.invoke('exportSpreadsheet', payload);
      
      // Check if we got binary data
      if (response.data) {
        let blob;
        if (response.data instanceof ArrayBuffer || response.data instanceof Uint8Array) {
          blob = new Blob([response.data], { 
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
          });
        } else if (typeof response.data === 'string') {
          // Maybe base64?
          try {
            const binary = atob(response.data);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
              bytes[i] = binary.charCodeAt(i);
            }
            blob = new Blob([bytes], { 
              type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
            });
          } catch {
            blob = new Blob([response.data], { type: 'application/octet-stream' });
          }
        } else {
          // Fallback - stringify if object
          blob = new Blob([JSON.stringify(response.data)], { type: 'application/json' });
        }
        
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${spreadsheetName || 'export'}.${format === 'xlsx' ? 'xlsx' : format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
        
        toast.success("הקובץ יוצא בהצלחה");
        onClose();
      } else {
        throw new Error('לא התקבלו נתונים מהשרת');
      }
    } catch (error) {
      console.error("Export error:", error);
      toast.error("שגיאה בייצוא: " + (error?.message || 'שגיאה לא ידועה'));
    } finally {
      setIsExporting(false);
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
                <RadioGroupItem value="csv" id="csv" className="peer sr-only" disabled />
                <Label
                  htmlFor="csv"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 opacity-50 cursor-not-allowed"
                >
                  <FileText className="mb-2 h-6 w-6 text-slate-500" />
                  CSV (ישן)
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

          {format === 'xlsx' && (
            <div className="flex items-center space-x-2 space-x-reverse bg-slate-50 p-3 rounded-lg">
              <Checkbox 
                id="styles" 
                checked={includeStyles} 
                onCheckedChange={setIncludeStyles}
              />
              <Label htmlFor="styles" className="cursor-pointer">כלול עיצובים (צבעים, הדגשות)</Label>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isExporting}>
            ביטול
          </Button>
          <Button onClick={handleExport} disabled={isExporting} className="bg-blue-600 hover:bg-blue-700">
            {isExporting ? "מייצא..." : "ייצא"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}