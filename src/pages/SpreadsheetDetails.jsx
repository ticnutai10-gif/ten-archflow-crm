import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { ArrowRight, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import GenericSpreadsheet from "@/components/spreadsheets/GenericSpreadsheet";
import { toast } from "sonner";

export default function SpreadsheetDetailsPage() {
  const [spreadsheet, setSpreadsheet] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const spreadsheetId = urlParams.get('id');
    loadSpreadsheet(spreadsheetId);
  }, [window.location.search]);

  const loadSpreadsheet = async (spreadsheetId) => {
    setLoading(true);
    try {
      // const urlParams = new URLSearchParams(window.location.search); // Removed as passed in arg
      // const spreadsheetId = urlParams.get('id'); // Removed as passed in arg

      if (!spreadsheetId) {
        toast.error('לא נמצא מזהה טבלה');
        navigate(createPageUrl('CustomSpreadsheets'));
        return;
      }

      const data = await base44.entities.CustomSpreadsheet.get(spreadsheetId);
      setSpreadsheet(data);
    } catch (error) {
      console.error("Error loading spreadsheet:", error);
      toast.error('שגיאה בטעינת הטבלה');
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
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => window.location.href = createPageUrl('CustomSpreadsheets')}
            className="gap-2"
          >
            <ArrowRight className="w-4 h-4" />
            חזרה לטבלאות מותאמות
          </Button>
          
          <Button
            variant="outline"
            onClick={loadSpreadsheet}
            className="gap-2"
            size="sm"
          >
            <RefreshCw className="w-4 h-4" />
            רענן
          </Button>
        </div>

        {spreadsheet && (
          <GenericSpreadsheet
            spreadsheet={spreadsheet}
            onUpdate={null}
            fullScreenMode={true}
            onNavigate={(url) => navigate(url)}
          />
        )}
      </div>
    </div>
  );
}