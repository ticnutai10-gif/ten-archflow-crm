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
  FileSpreadsheet
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import CreateSpreadsheetDialog from "@/components/spreadsheets/CreateSpreadsheetDialog";
import { toast } from "sonner";

export default function CustomSpreadsheetsPage() {
  const [spreadsheets, setSpreadsheets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingSpreadsheet, setEditingSpreadsheet] = useState(null);

  useEffect(() => {
    loadSpreadsheets();
  }, []);

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
        await base44.entities.CustomSpreadsheet.create(spreadsheetData);
        toast.success('✓ הטבלה נוצרה בהצלחה');
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

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen" dir="rtl">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="animate-pulse">
                <div className="h-48 bg-slate-200 rounded-2xl"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen" dir="rtl">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">טבלאות מותאמות אישית</h1>
            <p className="text-slate-600">צור וערוך טבלאות דמויות אקסל לניהול מידע מותאם</p>
          </div>
          
          <Button
            onClick={() => {
              setEditingSpreadsheet(null);
              setShowCreateDialog(true);
            }}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg gap-2"
          >
            <Plus className="w-5 h-5" />
            צור טבלה חדשה
          </Button>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="חיפוש טבלה..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10"
            />
          </div>
        </div>

        {/* Empty state */}
        {filteredSpreadsheets.length === 0 && !searchTerm && (
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardContent className="p-12 text-center">
              <div className="max-w-md mx-auto">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <FileSpreadsheet className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">
                  טרם נוצרו טבלאות מותאמות
                </h3>
                <p className="text-slate-600 mb-6">
                  צור טבלאות דמויות אקסל עם עמודות מותאמות אישית לניהול נתונים ספציפיים כמו תוכניות, היתרים, ועוד
                </p>
                <Button
                  onClick={() => setShowCreateDialog(true)}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 gap-2"
                >
                  <Plus className="w-5 h-5" />
                  צור את הטבלה הראשונה
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* No search results */}
        {filteredSpreadsheets.length === 0 && searchTerm && (
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardContent className="p-12 text-center">
              <p className="text-slate-500">לא נמצאו טבלאות המתאימות לחיפוש "{searchTerm}"</p>
            </CardContent>
          </Card>
        )}

        {/* Spreadsheets Grid */}
        {filteredSpreadsheets.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSpreadsheets.map(sheet => (
              <Card
                key={sheet.id}
                className="shadow-lg border-0 bg-white/80 backdrop-blur-sm hover:shadow-xl transition-all group"
              >
                <CardHeader className="bg-gradient-to-br from-slate-50 to-white pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate mb-1">
                        {sheet.name}
                      </CardTitle>
                      {sheet.description && (
                        <p className="text-sm text-slate-600 line-clamp-2">
                          {sheet.description}
                        </p>
                      )}
                    </div>
                    <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex-shrink-0">
                      <Table className="w-5 h-5 text-white" />
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Stats */}
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <FileSpreadsheet className="w-4 h-4 text-slate-500" />
                      <span className="text-slate-600">
                        {sheet.columns?.length || 0} עמודות
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Folder className="w-4 h-4 text-slate-500" />
                      <span className="text-slate-600">
                        {sheet.rows_data?.length || 0} שורות
                      </span>
                    </div>
                  </div>

                  {/* Date */}
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Calendar className="w-3 h-3" />
                    <span>
                      נוצר ב-{new Date(sheet.created_date).toLocaleDateString('he-IL')}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Link
                      to={createPageUrl(`SpreadsheetDetails?id=${sheet.id}`)}
                      className="flex-1"
                    >
                      <Button
                        variant="default"
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 gap-2"
                      >
                        <ExternalLink className="w-4 h-4" />
                        פתח
                      </Button>
                    </Link>
                    
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        setEditingSpreadsheet(sheet);
                        setShowCreateDialog(true);
                      }}
                      title="ערוך הגדרות"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleDelete(sheet.id, sheet.name)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      title="מחק טבלה"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Summary */}
        {spreadsheets.length > 0 && (
          <div className="mt-8 text-center text-sm text-slate-600">
            סה"כ {spreadsheets.length} טבלאות במערכת
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
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