import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Download, FileSpreadsheet, FileJson, FileText, Check, FileCode } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

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
          onExportToGoogle();
          onClose();
        } else {
          toast.error("ייצוא ל-Google Sheets אינו זמין כרגע");
        }
        setIsExporting(false);
        return;
      }

      // Prepare payload
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

      // Call backend
      const response = await base44.functions.invoke('exportSpreadsheet', payload);
      
      // Handle file download
      // The backend returns a blob/buffer
      // We need to handle this manually since SDK might try to parse JSON
      
      // Re-fetch using native fetch to get blob if SDK parses it weirdly
      // OR use the data from SDK if it handles binary.
      // Base44 SDK 'invoke' usually returns JSON. For binary, we might need a direct call or specific handling.
      // Assuming 'invoke' returns the parsed JSON body, but we need binary.
      // Let's use fetch directly for binary download
      
      // TODO: Check if base44 SDK supports binary response.
      // If not, we can construct the URL manually.
      
      // Fallback: Using direct fetch with authentication headers
      // Since we don't have easy access to auth headers here without SDK internals,
      // we might need to rely on the backend returning a signed URL or base64.
      // BUT, let's try to fetch using the function URL if we can get it.
      
      // ALTERNATIVE: Backend returns base64 in JSON.
      // Let's stick to standard invoke and see. If it fails, we switch to Base64.
      // For now, let's try to fetch the function URL directly.
      
      // Let's try to use the 'exportSpreadsheet' logic completely in client side for small data?
      // No, we already wrote the backend function.
      
      // Let's modify the frontend to use fetch with token.
      const session = await base44.auth.getSession();
      const token = session?.access_token;
      
      // Construct function URL (assuming standard pattern or getting it from somewhere)
      // Actually, we can use the `functions/exportSpreadsheet` path relative to API? 
      // Base44 functions are usually at /functions/functionName
      
      // Better approach: Modify backend to return Base64 string if frontend SDK limits binary.
      // But standard 'response.blob()' works with fetch.
      
      const functionUrl = `/functions/exportSpreadsheet`; 
      // Note: In local dev or some envs this might differ. 
      // Let's try using `base44.functions.invoke` and expect it to handle it?
      // SDK `invoke` does `response.json()`. It will fail for binary.
      
      // We will use `fetch` to call the function.
      const res = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Export failed');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${spreadsheetName}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

      toast.success("הקובץ יוצא בהצלחה");
      onClose();
    } catch (error) {
      console.error("Export error:", error);
      toast.error("שגיאה בייצוא: " + error.message);
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