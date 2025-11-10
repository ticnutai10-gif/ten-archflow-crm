
import React, { useState, useEffect, useCallback } from 'react';
import { ClientFile } from '@/entities/all';
import { googleSheets } from '@/functions/googleSheets';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table,
  Plus,
  ExternalLink,
  Edit,
  Save,
  X,
  Loader2,
  FileSpreadsheet,
  Grid3x3,
  RotateCcw,
  Download
} from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { toast } from "sonner";

const SHEET_TEMPLATES = {
    project_stages: {
        name: 'שלבי פרויקט',
        description: 'מעקב אחר שלבי הפרויקט ומשימות',
        icon: Grid3x3,
        color: 'bg-blue-100 text-blue-800'
    },
    project_timeline: {
        name: 'לוח זמנים ואבני דרך',
        description: 'מעקב אחר תאריכים ואבני דרך',
        icon: FileSpreadsheet,
        color: 'bg-green-100 text-green-800'
    },
    communication_log: {
        name: 'יומן תקשורת',
        description: 'תיעוד כל התקשורת עם הלקוח',
        icon: Table,
        color: 'bg-purple-100 text-purple-800'
    },
    budget_tracking: {
        name: 'מעקב תקציב',
        description: 'מעקב אחר עלויות ותקציב',
        icon: FileSpreadsheet,
        color: 'bg-amber-100 text-amber-800'
    }
};

export default function ClientSheets({ client, onSheetsUpdate }) {
    const [sheets, setSheets] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreatingSheets, setIsCreatingSheets] = useState(false);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [showAddRowDialog, setShowAddRowDialog] = useState(false);
    const [showAddColumnDialog, setShowAddColumnDialog] = useState(false);
    const [selectedSheet, setSelectedSheet] = useState(null);
    const [sheetData, setSheetData] = useState([]);
    const [isLoadingData, setIsLoadingData] = useState(false);
    const [newRowData, setNewRowData] = useState([]);
    const [newColumnName, setNewColumnName] = useState('');
    const [editingCell, setEditingCell] = useState(null);
    const [editValue, setEditValue] = useState('');

    const loadClientSheets = useCallback(async () => {
        try {
            const clientFiles = await ClientFile.filter({ 
                client_id: client.id,
                type: 'sheet'
            });
            setSheets(clientFiles);
        } catch (error) {
            console.error('Error loading client sheets:', error);
        }
        setIsLoading(false);
    }, [client.id]); // Dependency on client.id

    useEffect(() => {
        loadClientSheets();
    }, [loadClientSheets]); // Dependency on the memoized function

    const handleCreateClientSheets = async () => {
        setIsCreatingSheets(true);
        try {
            const { data } = await googleSheets({
                action: 'create_client_sheets',
                payload: {
                    clientName: client.name,
                    clientId: client.id
                }
            });

            if (data.success) {
                // שמירת הטבלאות בבסיס הנתונים
                for (const sheet of data.sheets) {
                    await ClientFile.create({
                        client_id: client.id,
                        client_name: client.name,
                        google_file_id: sheet.spreadsheetId,
                        name: sheet.name,
                        mime_type: 'application/vnd.google-apps.spreadsheet',
                        link: sheet.webViewLink,
                        type: 'sheet'
                    });
                }

                toast.success(`נוצרו ${data.sheets.length} טבלאות בהצלחה!`);
                loadClientSheets();
                onSheetsUpdate?.();
            }
        } catch (error) {
            console.error('Error creating client sheets:', error);
            toast.error('שגיאה ביצירת הטבלאות');
        }
        setIsCreatingSheets(false);
        setShowCreateDialog(false);
    };

    const loadSheetData = async (sheet) => {
        setSelectedSheet(sheet);
        setIsLoadingData(true);
        try {
            const { data } = await googleSheets({
                action: 'get_sheet_data',
                payload: {
                    spreadsheetId: sheet.google_file_id
                }
            });

            if (data.success) {
                setSheetData(data.data);
            }
        } catch (error) {
            console.error('Error loading sheet data:', error);
            toast.error('שגיאה בטעינת הנתונים');
        }
        setIsLoadingData(false);
    };

    const handleAddRow = async () => {
        if (!selectedSheet || newRowData.length === 0) return;

        try {
            const { data } = await googleSheets({
                action: 'add_row',
                payload: {
                    spreadsheetId: selectedSheet.google_file_id,
                    sheetName: selectedSheet.name.split(' - ')[1], // חילוץ שם הגיליון
                    rowData: newRowData
                }
            });

            if (data.success) {
                toast.success('שורה נוספה בהצלחה!');
                loadSheetData(selectedSheet); // רענון הנתונים
                setShowAddRowDialog(false);
                setNewRowData([]);
            }
        } catch (error) {
            console.error('Error adding row:', error);
            toast.error('שגיאה בהוספת השורה');
        }
    };

    const handleAddColumn = async () => {
        if (!selectedSheet || !newColumnName) return;

        try {
            const { data } = await googleSheets({
                action: 'add_column',
                payload: {
                    spreadsheetId: selectedSheet.google_file_id,
                    sheetId: 0,
                    columnName: newColumnName
                }
            });

            if (data.success) {
                toast.success('עמודה נוספה בהצלחה!');
                loadSheetData(selectedSheet); // רענון הנתונים
                setShowAddColumnDialog(false);
                setNewColumnName('');
            }
        } catch (error) {
            console.error('Error adding column:', error);
            toast.error('שגיאה בהוספת העמודה');
        }
    };

    const handleCellEdit = async (rowIndex, colIndex, value) => {
        if (!selectedSheet) return;

        try {
            // Note: Range needs to include the specific sheet name if there are multiple sheets within the spreadsheet.
            // Assuming the sheet we're interacting with is the *first* sheet or identified by name
            // For simplicity and matching current backend action, we'll assume the primary sheet.
            // If the backend `update_sheet_data` handles sheet naming in payload or assumes first sheet, this is fine.
            // If it needs the explicit sheet name for range, it should be passed like `'Sheet1!A1'`.
            // The original code does not pass sheetName to update_sheet_data, so keeping it consistent.
            const columnLetter = String.fromCharCode(65 + colIndex);
            const range = `${columnLetter}${rowIndex + 1}:${columnLetter}${rowIndex + 1}`;
            
            await googleSheets({
                action: 'update_sheet_data',
                payload: {
                    spreadsheetId: selectedSheet.google_file_id,
                    range,
                    values: [[value]]
                }
            });

            // עדכון מקומי
            const newData = [...sheetData];
            if (!newData[rowIndex]) newData[rowIndex] = [];
            newData[rowIndex][colIndex] = value;
            setSheetData(newData);
            
            toast.success('התא עודכן בהצלחה!');
        } catch (error) {
            console.error('Error updating cell:', error);
            toast.error('שגיאה בעדכון התא');
        }
    };

    const startCellEdit = (rowIndex, colIndex, currentValue) => {
        setEditingCell({ row: rowIndex, col: colIndex });
        setEditValue(currentValue || '');
    };

    const saveCellEdit = () => {
        if (editingCell) {
            handleCellEdit(editingCell.row, editingCell.col, editValue);
            setEditingCell(null);
            setEditValue('');
        }
    };

    const cancelCellEdit = () => {
        setEditingCell(null);
        setEditValue('');
    };

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="text-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-slate-400" />
                    <p className="text-slate-500">טוען טבלאות...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-2xl font-bold text-slate-900">טבלאות פרויקט</h3>
                    <p className="text-slate-600">ניהול מתקדם של נתוני הפרויקט</p>
                </div>
                
                {sheets.length === 0 ? (
                    <Button onClick={() => setShowCreateDialog(true)} className="bg-blue-600 hover:bg-blue-700">
                        <Plus className="w-4 h-4 ml-2" />
                        צור טבלאות פרויקט
                    </Button>
                ) : (
                    <div className="flex gap-2">
                        <Button 
                            variant="outline" 
                            onClick={() => selectedSheet && loadSheetData(selectedSheet)}
                            disabled={!selectedSheet || isLoadingData}
                        >
                            <RotateCcw className="w-4 h-4 ml-2" />
                            רענן נתונים
                        </Button>
                    </div>
                )}
            </div>

            {sheets.length === 0 ? (
                <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                    <CardContent className="p-12 text-center">
                        <Table className="w-16 h-16 text-slate-300 mx-auto mb-6" />
                        <h3 className="text-xl font-semibold text-slate-700 mb-3">
                            עדיין לא נוצרו טבלאות לפרויקט
                        </h3>
                        <p className="text-slate-500 mb-6">
                            צור טבלאות מתקדמות לניהול שלבי הפרויקט, מעקב זמנים ותקציב
                        </p>
                        <Button onClick={() => setShowCreateDialog(true)} className="bg-blue-600 hover:bg-blue-700">
                            <Plus className="w-4 h-4 ml-2" />
                            צור טבלאות כעת
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <Tabs defaultValue="sheets" className="space-y-6">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="sheets">רשימת טבלאות</TabsTrigger>
                        <TabsTrigger value="viewer">צפייה ועריכה</TabsTrigger>
                    </TabsList>

                    <TabsContent value="sheets">
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {sheets.map((sheet) => {
                                const sheetKey = Object.keys(SHEET_TEMPLATES).find(key => 
                                    sheet.name.includes(SHEET_TEMPLATES[key].name)
                                );
                                const template = SHEET_TEMPLATES[sheetKey];
                                const IconComponent = template?.icon || Table;

                                return (
                                    <Card key={sheet.id} className="hover:shadow-lg transition-all duration-200 cursor-pointer group">
                                        <CardHeader>
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-2 rounded-lg ${template?.color || 'bg-slate-100'} group-hover:scale-110 transition-transform`}>
                                                        <IconComponent className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <CardTitle className="text-base font-semibold">
                                                            {template?.name || sheet.name}
                                                        </CardTitle>
                                                        <p className="text-sm text-slate-500 mt-1">
                                                            {template?.description || 'טבלת נתונים'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                            <div className="flex gap-2">
                                                <Button 
                                                    size="sm" 
                                                    onClick={() => loadSheetData(sheet)}
                                                    className="flex-1"
                                                >
                                                    <Edit className="w-4 h-4 ml-2" />
                                                    ערוך
                                                </Button>
                                                <Button 
                                                    size="sm" 
                                                    variant="outline"
                                                    onClick={() => window.open(sheet.link, '_blank')}
                                                >
                                                    <ExternalLink className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    </TabsContent>

                    <TabsContent value="viewer">
                        {!selectedSheet ? (
                            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                                <CardContent className="p-12 text-center">
                                    <FileSpreadsheet className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                                    <p className="text-slate-500">בחר טבלה מהרשימה כדי לצפות ולערוך</p>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <h4 className="text-lg font-semibold">{selectedSheet.name}</h4>
                                    <div className="flex gap-2">
                                        <Button size="sm" onClick={() => setShowAddRowDialog(true)}>
                                            <Plus className="w-4 h-4 ml-2" />
                                            הוסף שורה
                                        </Button>
                                        <Button size="sm" variant="outline" onClick={() => setShowAddColumnDialog(true)}>
                                            <Plus className="w-4 h-4 ml-2" />
                                            הוסף עמודה
                                        </Button>
                                        <Button size="sm" variant="outline" onClick={() => window.open(selectedSheet.link, '_blank')}>
                                            <ExternalLink className="w-4 h-4 ml-2" />
                                            פתח בגוגל
                                        </Button>
                                    </div>
                                </div>

                                <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                                    <CardContent className="p-0">
                                        {isLoadingData ? (
                                            <div className="p-12 text-center">
                                                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-slate-400" />
                                                <p className="text-slate-500">טוען נתונים...</p>
                                            </div>
                                        ) : (
                                            <div className="overflow-x-auto">
                                                {/* שדרוג קווי טבלה: גבולות ברורים לאורך ולרוחב */}
                                                <table className="w-full border-collapse table-fixed">
                                                    <tbody>
                                                        {sheetData.map((row, rowIndex) => (
                                                            <tr key={rowIndex} className={rowIndex === 0 ? "bg-slate-100" : "hover:bg-slate-50"}>
                                                                {row.map((cell, colIndex) => (
                                                                    <td key={colIndex} className="border border-slate-300 p-2 min-w-[140px] align-top">
                                                                        {editingCell?.row === rowIndex && editingCell?.col === colIndex ? (
                                                                            <div className="flex gap-1">
                                                                                <Input
                                                                                    value={editValue}
                                                                                    onChange={(e) => setEditValue(e.target.value)}
                                                                                    onKeyDown={(e) => {
                                                                                        if (e.key === 'Enter') saveCellEdit();
                                                                                        if (e.key === 'Escape') cancelCellEdit();
                                                                                    }}
                                                                                    className="h-7 text-sm"
                                                                                    autoFocus
                                                                                />
                                                                                <Button size="sm" onClick={saveCellEdit} className="h-7 w-7 p-0">
                                                                                    <Save className="w-3 h-3" />
                                                                                </Button>
                                                                                <Button size="sm" variant="outline" onClick={cancelCellEdit} className="h-7 w-7 p-0">
                                                                                    <X className="w-3 h-3" />
                                                                                </Button>
                                                                            </div>
                                                                        ) : (
                                                                            <div 
                                                                                className={`${rowIndex === 0 ? "font-semibold" : "cursor-pointer hover:bg-blue-50"} p-1 rounded min-h-[22px]`}
                                                                                onClick={() => rowIndex > 0 && startCellEdit(rowIndex, colIndex, cell)}
                                                                            >
                                                                                {cell || (rowIndex > 0 ? '—' : '')}
                                                                            </div>
                                                                        )}
                                                                    </td>
                                                                ))}
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            )}

            {/* Create Sheets Dialog */}
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogContent className="text-right" dir="rtl">
                    <DialogHeader>
                        <DialogTitle>יצירת טבלאות פרויקט עבור {client.name}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <p className="text-slate-600">
                            יווצרו הטבלאות הבאות עם תבניות מוכנות מראש:
                        </p>
                        <div className="grid gap-3">
                            {Object.entries(SHEET_TEMPLATES).map(([key, template]) => {
                                const IconComponent = template.icon;
                                return (
                                    <div key={key} className="flex items-center gap-3 p-3 rounded-lg border">
                                        <div className={`p-2 rounded-lg ${template.color}`}>
                                            <IconComponent className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <div className="font-semibold">{template.name}</div>
                                            <div className="text-sm text-slate-600">{template.description}</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                            ביטול
                        </Button>
                        <Button onClick={handleCreateClientSheets} disabled={isCreatingSheets}>
                            {isCreatingSheets ? (
                                <>
                                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                                    יוצר...
                                </>
                            ) : (
                                <>
                                    <Plus className="w-4 h-4 ml-2" />
                                    צור טבלאות
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Add Row Dialog */}
            <Dialog open={showAddRowDialog} onOpenChange={setShowAddRowDialog}>
                <DialogContent className="text-right" dir="rtl">
                    <DialogHeader>
                        <DialogTitle>הוספת שורה חדשה</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <p className="text-slate-600">הכנס את הנתונים לשורה החדשה:</p>
                        {sheetData[0]?.map((header, index) => (
                            <div key={index} className="space-y-2">
                                <label className="font-medium">{header}:</label>
                                <Input
                                    value={newRowData[index] || ''}
                                    onChange={(e) => {
                                        const newData = [...newRowData];
                                        newData[index] = e.target.value;
                                        setNewRowData(newData);
                                    }}
                                    placeholder={`הכנס ${header}`}
                                />
                            </div>
                        ))}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAddRowDialog(false)}>
                            ביטול
                        </Button>
                        <Button onClick={handleAddRow}>
                            <Plus className="w-4 h-4 ml-2" />
                            הוסף שורה
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Add Column Dialog */}
            <Dialog open={showAddColumnDialog} onOpenChange={setShowAddColumnDialog}>
                <DialogContent className="text-right" dir="rtl">
                    <DialogHeader>
                        <DialogTitle>הוספת עמודה חדשה</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="font-medium">שם העמודה:</label>
                            <Input
                                value={newColumnName}
                                onChange={(e) => setNewColumnName(e.target.value)}
                                placeholder="הכנס שם עמודה"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAddColumnDialog(false)}>
                            ביטול
                        </Button>
                        <Button onClick={handleAddColumn}>
                            <Plus className="w-4 h-4 ml-2" />
                            הוסף עמודה
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
