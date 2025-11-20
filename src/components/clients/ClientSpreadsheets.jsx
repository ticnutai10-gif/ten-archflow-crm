import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, Plus, Link as LinkIcon } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import GenericSpreadsheet from "../spreadsheets/GenericSpreadsheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

export default function ClientSpreadsheets({ clientId, clientName }) {
  const [spreadsheets, setSpreadsheets] = useState([]);
  const [selectedSpreadsheet, setSelectedSpreadsheet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [allSpreadsheets, setAllSpreadsheets] = useState([]);
  const [selectedToLink, setSelectedToLink] = useState("");
  const [newSpreadsheetName, setNewSpreadsheetName] = useState("");

  const loadSpreadsheets = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.CustomSpreadsheet.filter(
        { client_id: clientId },
        '-updated_date',
        100
      );
      const validData = Array.isArray(data) ? data : [];
      setSpreadsheets(validData);
      
      if (validData.length > 0 && !selectedSpreadsheet) {
        setSelectedSpreadsheet(validData[0]);
      }
    } catch (error) {
      console.error('Error loading spreadsheets:', error);
      setSpreadsheets([]);
    } finally {
      setLoading(false);
    }
  };

  const loadAllSpreadsheets = async () => {
    try {
      const all = await base44.entities.CustomSpreadsheet.filter(
        { client_id: null },
        '-updated_date',
        100
      );
      const validAll = Array.isArray(all) ? all : [];
      setAllSpreadsheets(validAll);
    } catch (error) {
      console.error('Error loading all spreadsheets:', error);
      setAllSpreadsheets([]);
    }
  };

  useEffect(() => {
    loadSpreadsheets();
  }, [clientId]);

  const handleLinkExisting = async () => {
    if (!selectedToLink) {
      toast.error('בחר טבלה לשיוך');
      return;
    }

    try {
      await base44.entities.CustomSpreadsheet.update(selectedToLink, {
        client_id: clientId,
        client_name: clientName
      });

      toast.success('✓ טבלה שויכה ללקוח');
      setShowLinkDialog(false);
      setSelectedToLink("");
      await loadSpreadsheets();
    } catch (error) {
      console.error('Error linking spreadsheet:', error);
      toast.error('שגיאה בשיוך הטבלה');
    }
  };

  const handleCreateNew = async () => {
    if (!newSpreadsheetName.trim()) {
      toast.error('הזן שם לטבלה');
      return;
    }

    try {
      const newSpreadsheet = await base44.entities.CustomSpreadsheet.create({
        name: newSpreadsheetName.trim(),
        client_id: clientId,
        client_name: clientName,
        columns: [
          { key: 'col_1', title: 'עמודה 1', width: '200px', type: 'text', visible: true }
        ],
        rows_data: []
      });

      toast.success('✓ טבלה נוצרה');
      setShowCreateDialog(false);
      setNewSpreadsheetName("");
      await loadSpreadsheets();
      setSelectedSpreadsheet(newSpreadsheet);
    } catch (error) {
      console.error('Error creating spreadsheet:', error);
      toast.error('שגיאה ביצירת הטבלה');
    }
  };

  const handleUnlink = async (spreadsheetId) => {
    if (!confirm('האם לנתק טבלה זו מהלקוח?')) return;

    try {
      await base44.entities.CustomSpreadsheet.update(spreadsheetId, {
        client_id: null,
        client_name: null
      });

      toast.success('✓ טבלה נותקה מהלקוח');
      await loadSpreadsheets();
      if (selectedSpreadsheet?.id === spreadsheetId) {
        setSelectedSpreadsheet(null);
      }
    } catch (error) {
      console.error('Error unlinking spreadsheet:', error);
      toast.error('שגיאה בניתוק הטבלה');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-slate-500">טוען טבלאות...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* רשימת טבלאות */}
      <Card className="shadow-lg border-0 bg-white/80">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Table className="w-5 h-5 text-purple-600" />
              טבלאות מותאמות ללקוח
            </CardTitle>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  loadAllSpreadsheets();
                  setShowLinkDialog(true);
                }}
                className="gap-2"
              >
                <LinkIcon className="w-4 h-4" />
                שייך טבלה קיימת
              </Button>
              <Button
                size="sm"
                onClick={() => setShowCreateDialog(true)}
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                צור טבלה חדשה
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {spreadsheets.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Table className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <p className="font-semibold mb-2">אין טבלאות מותאמות ללקוח זה</p>
              <p className="text-sm">צור טבלה חדשה או שייך טבלה קיימת</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {spreadsheets.map(sheet => (
                <button
                  key={sheet.id}
                  onClick={() => setSelectedSpreadsheet(sheet)}
                  className={`p-4 rounded-lg border-2 text-right transition-all ${
                    selectedSpreadsheet?.id === sheet.id
                      ? 'border-purple-500 bg-purple-50 shadow-md'
                      : 'border-slate-200 bg-white hover:border-purple-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="font-semibold text-slate-900">{sheet.name}</div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 text-slate-400 hover:text-red-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUnlink(sheet.id);
                      }}
                    >
                      <LinkIcon className="w-3 h-3" />
                    </Button>
                  </div>
                  <div className="flex gap-2 text-xs">
                    <Badge variant="outline">
                      {(sheet.rows_data || []).length} שורות
                    </Badge>
                    <Badge variant="outline">
                      {(sheet.columns || []).length} עמודות
                    </Badge>
                  </div>
                  {sheet.description && (
                    <p className="text-xs text-slate-600 mt-2 line-clamp-2">
                      {sheet.description}
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* תצוגת הטבלה הנבחרת */}
      {selectedSpreadsheet && (
        <GenericSpreadsheet
          spreadsheet={selectedSpreadsheet}
          onUpdate={loadSpreadsheets}
          fullScreenMode={false}
        />
      )}

      {/* דיאלוג שיוך טבלה קיימת */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LinkIcon className="w-5 h-5 text-purple-600" />
              שייך טבלה קיימת ללקוח
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
              💡 בחר טבלה קיימת ושייך אותה ללקוח {clientName}
            </div>
            <Select value={selectedToLink} onValueChange={setSelectedToLink}>
              <SelectTrigger>
                <SelectValue placeholder="בחר טבלה..." />
              </SelectTrigger>
              <SelectContent>
                {allSpreadsheets.map(sheet => (
                  <SelectItem key={sheet.id} value={sheet.id}>
                    {sheet.name} • {(sheet.rows_data || []).length} שורות
                  </SelectItem>
                ))}
                {allSpreadsheets.length === 0 && (
                  <div className="p-4 text-center text-slate-500 text-sm">
                    אין טבלאות לא משויכות
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLinkDialog(false)}>
              ביטול
            </Button>
            <Button onClick={handleLinkExisting} className="bg-purple-600 hover:bg-purple-700">
              שייך ללקוח
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* דיאלוג יצירת טבלה חדשה */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-purple-600" />
              יצירת טבלה חדשה ללקוח
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-semibold mb-2 block">שם הטבלה</label>
            <Input
              placeholder="למשל: פרויקטים, משימות, תקציב..."
              value={newSpreadsheetName}
              onChange={(e) => setNewSpreadsheetName(e.target.value)}
              className="text-right"
              dir="rtl"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              ביטול
            </Button>
            <Button onClick={handleCreateNew} className="bg-purple-600 hover:bg-purple-700">
              <Plus className="w-4 h-4 ml-2" />
              צור טבלה
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}