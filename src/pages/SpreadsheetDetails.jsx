import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import GenericSpreadsheet from "@/components/spreadsheets/GenericSpreadsheet";
import { toast } from "sonner";

console.log('🎬 [SpreadsheetDetails] Module loaded, GenericSpreadsheet imported:', {
  GenericSpreadsheet,
  type: typeof GenericSpreadsheet,
  isFunction: typeof GenericSpreadsheet === 'function',
  hasDefaultExport: !!GenericSpreadsheet
});

export default function SpreadsheetDetailsPage() {
  console.log('🎬 [SpreadsheetDetails] Component mounted/rendered');

  const [spreadsheet, setSpreadsheet] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    console.log('🔄 [SpreadsheetDetails] useEffect triggered - loading spreadsheet');
    loadSpreadsheet();
  }, []);

  const loadSpreadsheet = async () => {
    console.log('🚀 [SpreadsheetDetails] loadSpreadsheet called');
    
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const spreadsheetId = urlParams.get('id');

      console.log('🔍 [SpreadsheetDetails] URL params:', { 
        fullUrl: window.location.href,
        search: window.location.search,
        spreadsheetId 
      });

      if (!spreadsheetId) {
        console.error('❌ [SpreadsheetDetails] No spreadsheet ID in URL');
        toast.error('לא נמצא מזהה טבלה');
        navigate(createPageUrl('CustomSpreadsheets'));
        return;
      }

      console.log('📞 [SpreadsheetDetails] Calling API to get spreadsheet:', spreadsheetId);
      const data = await base44.entities.CustomSpreadsheet.get(spreadsheetId);
      
      console.log('✅ [SpreadsheetDetails] API response received:', {
        hasData: !!data,
        id: data?.id,
        name: data?.name,
        columnsCount: data?.columns?.length,
        rowsCount: data?.rows_data?.length,
        fullData: data
      });
      
      console.log('📝 [SpreadsheetDetails] Setting spreadsheet state');
      setSpreadsheet(data);
      console.log('✅ [SpreadsheetDetails] State updated successfully');
    } catch (error) {
      console.error("❌ [SpreadsheetDetails] Error loading spreadsheet:", {
        error,
        message: error.message,
        stack: error.stack
      });
      toast.error('שגיאה בטעינת הטבלה: ' + error.message);
      navigate(createPageUrl('CustomSpreadsheets'));
    } finally {
      console.log('🏁 [SpreadsheetDetails] loadSpreadsheet finished, setting loading=false');
      setLoading(false);
    }
  };

  console.log('🎨 [SpreadsheetDetails] Rendering, state:', { loading, hasSpreadsheet: !!spreadsheet });

  if (loading) {
    console.log('⏳ [SpreadsheetDetails] Rendering loading state');
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-slate-600">טוען טבלה...</p>
        </div>
      </div>
    );
  }

  console.log('🎨 [SpreadsheetDetails] Rendering main content');

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

        {spreadsheet ? (
          <>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
              <strong>🔍 DEBUG INFO:</strong> Rendering GenericSpreadsheet with data:<br/>
              ID: {spreadsheet.id}<br/>
              Name: {spreadsheet.name}<br/>
              Columns: {spreadsheet.columns?.length || 0}<br/>
              Rows: {spreadsheet.rows_data?.length || 0}
            </div>
            <GenericSpreadsheet
              spreadsheet={spreadsheet}
              onUpdate={loadSpreadsheet}
              fullScreenMode={true}
            />
          </>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <p className="text-yellow-800 font-semibold">⚠️ אין נתוני טבלה להצגה</p>
            <p className="text-sm text-yellow-600 mt-2">הטעינה הושלמה אבל המידע חסר</p>
          </div>
        )}
      </div>
    </div>
  );
}