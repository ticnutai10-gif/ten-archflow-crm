import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, Plus, ExternalLink, Unlink, Link2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import { toast } from "sonner";

export default function ProjectSpreadsheets({ projectId, projectName }) {
  const [linkedSheets, setLinkedSheets] = useState([]);
  const [availableSheets, setAvailableSheets] = useState([]);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [selectedSheetId, setSelectedSheetId] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSpreadsheets();
  }, [projectId]);

  const loadSpreadsheets = async () => {
    setLoading(true);
    try {
      const allSheets = await base44.entities.CustomSpreadsheet.list();
      
      // Separate linked vs unlinked
      const linked = allSheets.filter(s => s.project_id === projectId);
      const available = allSheets.filter(s => !s.project_id);
      
      setLinkedSheets(linked);
      setAvailableSheets(available);
    } catch (error) {
      console.error('Error loading spreadsheets:', error);
    }
    setLoading(false);
  };

  const handleLinkSheet = async () => {
    if (!selectedSheetId) {
      toast.error('יש לבחור טבלה');
      return;
    }

    try {
      await base44.entities.CustomSpreadsheet.update(selectedSheetId, {
        project_id: projectId,
        project_name: projectName
      });
      
      toast.success('הטבלה שויכה לפרויקט');
      setShowLinkDialog(false);
      setSelectedSheetId('');
      loadSpreadsheets();
    } catch (error) {
      toast.error('שגיאה בשיוך הטבלה');
    }
  };

  const handleUnlinkSheet = async (sheetId) => {
    if (!confirm('להסיר את הקישור בין הטבלה לפרויקט?')) return;

    try {
      await base44.entities.CustomSpreadsheet.update(sheetId, {
        project_id: null,
        project_name: null
      });
      
      toast.success('הקישור הוסר');
      loadSpreadsheets();
    } catch (error) {
      toast.error('שגיאה בהסרת הקישור');
    }
  };

  return (
    <Card className="shadow-lg border-0">
      <CardHeader className="border-b flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Table className="w-5 h-5 text-indigo-600" />
          טבלאות משויכות ({linkedSheets.length})
        </CardTitle>
        <Button onClick={() => setShowLinkDialog(true)} size="sm" className="bg-indigo-600 hover:bg-indigo-700">
          <Link2 className="w-4 h-4 ml-1" />
          שייך טבלה
        </Button>
      </CardHeader>
      <CardContent className="p-6">
        {loading ? (
          <div className="text-center py-8 text-slate-500">טוען...</div>
        ) : linkedSheets.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <Table className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p>אין טבלאות משויכות לפרויקט זה</p>
            <Button 
              variant="outline" 
              className="mt-3"
              onClick={() => setShowLinkDialog(true)}
            >
              <Plus className="w-4 h-4 ml-1" />
              שייך טבלה קיימת
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {linkedSheets.map(sheet => (
              <div 
                key={sheet.id}
                className="flex items-center justify-between p-4 border rounded-xl hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                    <Table className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900">{sheet.name}</div>
                    <div className="text-sm text-slate-500">
                      {sheet.description || `${(sheet.columns || []).length} עמודות · ${(sheet.rows_data || []).length} שורות`}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link to={createPageUrl('SpreadsheetDetails') + `?id=${sheet.id}`}>
                    <Button variant="outline" size="sm">
                      <ExternalLink className="w-4 h-4 ml-1" />
                      פתח
                    </Button>
                  </Link>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-red-500 hover:text-red-700"
                    onClick={() => handleUnlinkSheet(sheet.id)}
                  >
                    <Unlink className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Link Sheet Dialog */}
        <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
          <DialogContent className="max-w-md" dir="rtl">
            <DialogHeader>
              <DialogTitle>שייך טבלה לפרויקט</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              {availableSheets.length === 0 ? (
                <div className="text-center py-6 text-slate-500">
                  <p>אין טבלאות זמינות לשיוך</p>
                  <p className="text-sm mt-1">כל הטבלאות כבר משויכות לפרויקטים</p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1 block">בחר טבלה</label>
                    <Select value={selectedSheetId} onValueChange={setSelectedSheetId}>
                      <SelectTrigger>
                        <SelectValue placeholder="בחר טבלה..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableSheets.map(sheet => (
                          <SelectItem key={sheet.id} value={sheet.id}>
                            {sheet.name} ({(sheet.rows_data || []).length} שורות)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex gap-2 justify-end pt-4">
                    <Button variant="outline" onClick={() => setShowLinkDialog(false)}>ביטול</Button>
                    <Button onClick={handleLinkSheet} className="bg-indigo-600 hover:bg-indigo-700">שייך</Button>
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}