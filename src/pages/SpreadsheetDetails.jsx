import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import GenericSpreadsheet from "@/components/spreadsheets/GenericSpreadsheetSimple";
import { toast } from "sonner";

export default function SpreadsheetDetailsPage() {
  const [spreadsheet, setSpreadsheet] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadSpreadsheet();
  }, []);

  const loadSpreadsheet = async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const spreadsheetId = urlParams.get('id');

      if (!spreadsheetId) {
        toast.error('לא נמצא מזהה טבלה');
        navigate(createPageUrl('CustomSpreadsheets'));
        return;
      }

      console.log('📊 [SpreadsheetDetails] Loading spreadsheet:', spreadsheetId);
      const data = await base44.entities.CustomSpreadsheet.get(spreadsheetId);
      
      console.log('✅ [SpreadsheetDetails] Spreadsheet loaded:', {
        name: data.name,
        columnsCount: data.columns?.length,
        rowsCount: data.rows_data?.length,
        rows: data.rows_data
      });
      
      setSpreadsheet(data);
    } catch (error) {
      console.error("❌ [SpreadsheetDetails] Error loading spreadsheet:", error);
      toast.error('שגיאה בטעינת הטבלה: ' + error.message);
      navigate(createPageUrl('CustomSpreadsheets'));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-slate-600">טוען טבלה...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6" dir="rtl">
      <div className="max-w-[95%] mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => navigate(createPageUrl('Tasks'))}
            className="gap-2"
          >
            <ArrowRight className="w-4 h-4" />
            חזרה למשימות
          </Button>
        </div>

        {spreadsheet && (
          <GenericSpreadsheet
            spreadsheet={spreadsheet}
            onUpdate={loadSpreadsheet}
            fullScreenMode={true}
          />
        )}
      </div>
    </div>
  );
}