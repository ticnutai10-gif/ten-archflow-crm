import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Table, 
  Search, 
  Edit2, 
  Trash2, 
  ExternalLink,
  Folder,
  Calendar,
  FileSpreadsheet,
  Pin,
  ArrowRight
} from "lucide-react";
import CreateSpreadsheetDialog from "@/components/spreadsheets/CreateSpreadsheetDialog";
import GenericSpreadsheet from "@/components/spreadsheets/GenericSpreadsheet";
import { toast } from "sonner";

export default function ClientSpreadsheet({ 
  initialSpreadsheetId = null, 
  onPinToggle 
}) {
  const [spreadsheets, setSpreadsheets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingSpreadsheet, setEditingSpreadsheet] = useState(null);
  const [selectedSpreadsheet, setSelectedSpreadsheet] = useState(null);

  useEffect(() => {
    loadSpreadsheets();
  }, []);

  useEffect(() => {
    if (initialSpreadsheetId && spreadsheets.length > 0) {
      const target = spreadsheets.find(s => s.id === initialSpreadsheetId);
      if (target) setSelectedSpreadsheet(target);
    }
  }, [initialSpreadsheetId, spreadsheets]);

  const loadSpreadsheets = async () => {
    setIsLoading(true);
    try {
      const data = await base44.entities.CustomSpreadsheet.list();
      setSpreadsheets(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading spreadsheets:', error);
      setSpreadsheets([]);
      toast.error('שגיאה בטעינת הטבלאות');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`האם למחוק את הטבלה "${name}"?\nפעולה זו אינה ניתנת לביטול!`)) {
      return;
    }

    try {
      await base44.entities.CustomSpreadsheet.delete(id);
      toast.success('✓ הטבלה נמחקה');
      loadSpreadsheets();
      if (selectedSpreadsheet?.id === id) setSelectedSpreadsheet(null);
    } catch (error) {
      console.error('Error deleting spreadsheet:', error);
      toast.error('שגיאה במחיקת הטבלה');
    }
  };

  const handleCreateOrUpdate = async (spreadsheetData) => {
    try {
      if (editingSpreadsheet) {
        await base44.entities.CustomSpreadsheet.update(editingSpreadsheet.id, spreadsheetData);
        toast.success('✓ הטבלה עודכנה');
      } else {
        const newSheet = await base44.entities.CustomSpreadsheet.create(spreadsheetData);
        toast.success('✓ הטבלה נוצרה בהצלחה');
        setSelectedSpreadsheet(newSheet);
      }
      
      setShowCreateDialog(false);
      setEditingSpreadsheet(null);
      loadSpreadsheets();
    } catch (error) {
      console.error('Error saving spreadsheet:', error);
      toast.error('שגיאה בשמירת הטבלה');
    }
  };

  const filteredSpreadsheets = spreadsheets.filter(sheet =>
    sheet.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sheet.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // View: Selected Spreadsheet
  if (selectedSpreadsheet) {
    return (
      <div className="h-full flex flex-col">
        <div className="mb-2">
          <Button 
            variant="ghost" 
            onClick={() => setSelectedSpreadsheet(null)}
            className="gap-2 text-slate-600 hover:text-slate-900"
          >
            <ArrowRight className="w-4 h-4" />
            חזרה לרשימת הטבלאות
          </Button>
        </div>
        <GenericSpreadsheet
          spreadsheet={selectedSpreadsheet}
          onUpdate={loadSpreadsheets}
          fullScreenMode={true}
          onBack={() => setSelectedSpreadsheet(null)}
        />
      </div>
    );
  }

  // View: List
  if (isLoading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-slate-500">טוען טבלאות...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">ניהול טבלאות מותאמות</h2>
          <p className="text-slate-600">כל הטבלאות במערכת במקום אחד</p>
        </div>
        
        <Button
          onClick={() => {
            setEditingSpreadsheet(null);
            setShowCreateDialog(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 gap-2"
        >
          <Plus className="w-5 h-5" />
          טבלה חדשה
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <Input
          placeholder="חיפוש טבלה..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pr-10 bg-white"
        />
      </div>

      {/* Grid */}
      {filteredSpreadsheets.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200 border-dashed">
          <FileSpreadsheet className="w-16 h-16 mx-auto mb-4 text-slate-300" />
          <h3 className="text-lg font-semibold text-slate-600">לא נמצאו טבלאות</h3>
          <p className="text-slate-500 mb-4">צור טבלה חדשה כדי להתחיל</p>
          <Button variant="outline" onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4 ml-2" />
            צור טבלה
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSpreadsheets.map(sheet => (
            <Card
              key={sheet.id}
              className="shadow-sm hover:shadow-md transition-all group cursor-pointer border-slate-200"
              onClick={() => setSelectedSpreadsheet(sheet)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate mb-1 text-slate-800">
                      {sheet.name}
                    </CardTitle>
                    {sheet.client_name && (
                      <Badge variant="secondary" className="mb-1 text-[10px]">
                        {sheet.client_name}
                      </Badge>
                    )}
                    {sheet.description && (
                      <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                        {sheet.description}
                      </p>
                    )}
                  </div>
                  <div className="p-2 bg-blue-50 rounded-lg flex-shrink-0">
                    <Table className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="flex items-center gap-4 text-xs text-slate-500 mb-4">
                  <span>{sheet.columns?.length || 0} עמודות</span>
                  <span>{sheet.rows_data?.length || 0} שורות</span>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-100" onClick={e => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 justify-start gap-2 hover:bg-blue-50 hover:text-blue-600"
                    onClick={() => setSelectedSpreadsheet(sheet)}
                  >
                    <ExternalLink className="w-4 h-4" />
                    פתח
                  </Button>
                  
                  {onPinToggle && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-slate-400 hover:text-amber-500"
                      onClick={() => onPinToggle(sheet)}
                      title="נעץ טבלה לסרגל כלים"
                    >
                      <Pin className="w-4 h-4" />
                    </Button>
                  )}
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-400 hover:text-blue-600"
                    onClick={() => {
                      setEditingSpreadsheet(sheet);
                      setShowCreateDialog(true);
                    }}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-400 hover:text-red-600"
                    onClick={() => handleDelete(sheet.id, sheet.name)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreateSpreadsheetDialog
        open={showCreateDialog}
        onClose={() => {
          setShowCreateDialog(false);
          setEditingSpreadsheet(null);
        }}
        onSave={handleCreateOrUpdate}
        spreadsheet={editingSpreadsheet}
      />
    </div>
  );
}