import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Save, Table, Copy } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function GenericSpreadsheetSimple({ spreadsheet, onUpdate }) {
  const [columns, setColumns] = useState([]);
  const [rowsData, setRowsData] = useState([]);
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState("");

  useEffect(() => {
    if (spreadsheet) {
      console.log('📊 [GenericSpreadsheet] Loading:', {
        name: spreadsheet.name,
        columns: spreadsheet.columns?.length,
        rows: spreadsheet.rows_data?.length,
        rowsData: spreadsheet.rows_data
      });
      
      setColumns(spreadsheet.columns || []);
      setRowsData(spreadsheet.rows_data || []);
    }
  }, [spreadsheet]);

  const addNewRow = async () => {
    const newRow = { id: `row_${Date.now()}` };
    console.log('➕ Adding new row:', newRow);
    
    const updated = [...rowsData, newRow];
    setRowsData(updated);
    
    await saveToBackend(columns, updated);
    toast.success('✓ שורה נוספה');
  };

  const deleteRow = async (rowId) => {
    if (!confirm('למחוק שורה זו?')) return;
    
    const updated = rowsData.filter(r => r.id !== rowId);
    setRowsData(updated);
    
    await saveToBackend(columns, updated);
    toast.success('✓ שורה נמחקה');
  };

  const duplicateRow = async (row) => {
    const { id, ...data } = row;
    const newRow = { ...data, id: `row_${Date.now()}` };
    
    const updated = [...rowsData, newRow];
    setRowsData(updated);
    
    await saveToBackend(columns, updated);
    toast.success('✓ שורה הועתקה');
  };

  const handleCellClick = (rowId, columnKey) => {
    const row = rowsData.find(r => r.id === rowId);
    if (!row) return;

    const currentValue = row[columnKey] || '';
    console.log('📝 Opening edit:', { rowId, columnKey, currentValue, row });
    
    setEditingCell(`${rowId}_${columnKey}`);
    setEditValue(String(currentValue));
  };

  const saveEdit = async () => {
    if (!editingCell) return;

    const [rowId, columnKey] = editingCell.split('_');
    console.log('💾 Saving edit:', { rowId, columnKey, editValue });

    const updatedRows = rowsData.map(row => {
      if (row.id === rowId) {
        const newRow = { ...row, [columnKey]: editValue };
        console.log('✏️ Updated row:', newRow);
        return newRow;
      }
      return row;
    });

    console.log('📊 All rows after update:', updatedRows);
    setRowsData(updatedRows);
    setEditingCell(null);
    setEditValue("");

    await saveToBackend(columns, updatedRows);
    toast.success('✓ התא נשמר');
  };

  const saveToBackend = async (cols, rows) => {
    if (!spreadsheet?.id) return;

    try {
      console.log('💾 [saveToBackend] Saving:', {
        id: spreadsheet.id,
        columnsCount: cols.length,
        rowsCount: rows.length,
        rows
      });

      await base44.entities.CustomSpreadsheet.update(spreadsheet.id, {
        columns: cols,
        rows_data: rows
      });

      console.log('✅ Saved successfully');
      
      if (onUpdate) await onUpdate();
    } catch (error) {
      console.error('❌ Save error:', error);
      toast.error('שגיאה בשמירה');
    }
  };

  if (!spreadsheet) {
    return <div className="p-6 text-center text-slate-500">לא נבחרה טבלה</div>;
  }

  const visibleColumns = columns.filter(col => col.visible !== false);

  console.log('🎨 Rendering table:', {
    visibleColumns: visibleColumns.length,
    rows: rowsData.length,
    rowsData
  });

  return (
    <div className="w-full" dir="rtl">
      <Card className="shadow-lg">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Table className="w-6 h-6 text-purple-600" />
              <CardTitle className="text-xl">{spreadsheet.name}</CardTitle>
              <Badge variant="outline">{rowsData.length} שורות</Badge>
            </div>
            
            <div className="flex gap-2">
              <Button onClick={addNewRow} size="sm" className="gap-2">
                <Plus className="w-4 h-4" />
                הוסף שורה
              </Button>
              <Button onClick={() => saveToBackend(columns, rowsData)} size="sm" variant="outline" className="gap-2">
                <Save className="w-4 h-4" />
                שמור
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-auto" style={{ maxHeight: '60vh' }}>
            <table className="w-full border-collapse" dir="rtl">
              <thead className="bg-slate-100 sticky top-0">
                <tr>
                  {visibleColumns.map(col => (
                    <th
                      key={col.key}
                      className="border border-slate-200 p-3 text-right font-semibold"
                      style={{ width: col.width }}
                    >
                      {col.title}
                    </th>
                  ))}
                  <th className="border border-slate-200 p-3" style={{ width: '120px' }}>
                    פעולות
                  </th>
                </tr>
              </thead>

              <tbody>
                {rowsData.length === 0 ? (
                  <tr>
                    <td colSpan={visibleColumns.length + 1} className="text-center py-12 text-slate-500 border">
                      אין שורות בטבלה - לחץ "הוסף שורה"
                    </td>
                  </tr>
                ) : (
                  rowsData.map((row, rowIndex) => {
                    console.log(`🔍 Rendering row ${rowIndex}:`, row);
                    
                    return (
                      <tr key={row.id} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                        {visibleColumns.map(column => {
                          const cellKey = `${row.id}_${column.key}`;
                          const isEditing = editingCell === cellKey;
                          const cellValue = row[column.key] || '';

                          console.log(`  📝 Cell [${cellKey}]:`, { value: cellValue, isEditing });

                          return (
                            <td
                              key={column.key}
                              className="border border-slate-200 p-2 cursor-pointer hover:bg-blue-50"
                              onClick={() => !isEditing && handleCellClick(row.id, column.key)}
                            >
                              {isEditing ? (
                                <Input
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onBlur={saveEdit}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') saveEdit();
                                    if (e.key === 'Escape') {
                                      setEditingCell(null);
                                      setEditValue("");
                                    }
                                  }}
                                  className="h-8"
                                  autoFocus
                                  dir="rtl"
                                />
                              ) : (
                                <span className="text-sm">{String(cellValue)}</span>
                              )}
                            </td>
                          );
                        })}
                        
                        <td className="border border-slate-200 p-2">
                          <div className="flex gap-1 justify-center">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => duplicateRow(row)}
                              title="שכפל"
                            >
                              <Copy className="w-3 h-3 text-blue-600" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => deleteRow(row.id)}
                              title="מחק"
                            >
                              <Trash2 className="w-3 h-3 text-red-600" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>

        <div className="px-6 py-3 border-t bg-slate-50 text-xs text-slate-600">
          {rowsData.length} שורות • {visibleColumns.length} עמודות
        </div>
      </Card>
    </div>
  );
}