import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Save, Table, Copy, Settings, Palette, Eye, EyeOff, Edit2, X, Download, Upload, Grid, List } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function GenericSpreadsheet({ spreadsheet, onUpdate, fullScreenMode = false }) {
  console.log('🎬 [GenericSpreadsheet] Component mounted/rendered', { 
    hasSpreadsheet: !!spreadsheet,
    spreadsheetId: spreadsheet?.id,
    spreadsheetName: spreadsheet?.name 
  });

  const [columns, setColumns] = useState([]);
  const [rowsData, setRowsData] = useState([]);
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [selectedCells, setSelectedCells] = useState(new Set());
  const [cellStyles, setCellStyles] = useState({});
  const [popoverOpen, setPopoverOpen] = useState(null);
  const [editingColumnKey, setEditingColumnKey] = useState(null);
  const [editingColumnTitle, setEditingColumnTitle] = useState("");
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  
  const editInputRef = useRef(null);
  const columnEditRef = useRef(null);

  useEffect(() => {
    console.log('🔄 [GenericSpreadsheet] useEffect triggered', { 
      hasSpreadsheet: !!spreadsheet,
      spreadsheetId: spreadsheet?.id 
    });

    if (spreadsheet) {
      console.log('📊 [GenericSpreadsheet] Loading spreadsheet data:', {
        id: spreadsheet.id,
        name: spreadsheet.name,
        columnsCount: spreadsheet.columns?.length,
        rowsDataCount: spreadsheet.rows_data?.length,
        columns: spreadsheet.columns,
        rowsData: spreadsheet.rows_data
      });
      
      setColumns(spreadsheet.columns || []);
      setRowsData(spreadsheet.rows_data || []);
      setCellStyles(spreadsheet.cell_styles || {});
      
      console.log('✅ [GenericSpreadsheet] State updated with new data');
    } else {
      console.warn('⚠️ [GenericSpreadsheet] No spreadsheet provided to useEffect');
    }
  }, [spreadsheet]);

  const addNewRow = async () => {
    const newRow = { id: `row_${Date.now()}` };
    console.log('➕ Adding new row:', newRow);
    
    const updated = [...rowsData, newRow];
    setRowsData(updated);
    
    await saveToBackend(columns, updated, cellStyles);
    toast.success('✓ שורה נוספה');
  };

  const deleteRow = async (rowId) => {
    if (!confirm('למחוק שורה זו?')) return;
    
    const updated = rowsData.filter(r => r.id !== rowId);
    setRowsData(updated);
    
    // מחיקת סגנונות של התאים בשורה
    const newStyles = { ...cellStyles };
    Object.keys(newStyles).forEach(key => {
      if (key.startsWith(`${rowId}_`)) {
        delete newStyles[key];
      }
    });
    setCellStyles(newStyles);
    
    await saveToBackend(columns, updated, newStyles);
    toast.success('✓ שורה נמחקה');
  };

  const duplicateRow = async (row) => {
    const { id, ...data } = row;
    const newRow = { ...data, id: `row_${Date.now()}` };
    
    const updated = [...rowsData, newRow];
    setRowsData(updated);
    
    await saveToBackend(columns, updated, cellStyles);
    toast.success('✓ שורה הועתקה');
  };

  const addColumn = async () => {
    const columnName = prompt('שם העמודה החדשה:');
    if (!columnName) return;

    const newColumn = {
      key: `col${Date.now()}`,
      title: columnName,
      width: '150px',
      type: 'text',
      visible: true
    };

    const updated = [...columns, newColumn];
    setColumns(updated);
    await saveToBackend(updated, rowsData, cellStyles);
    toast.success('✓ עמודה נוספה');
  };

  const deleteColumn = async (columnKey) => {
    if (!confirm('למחוק עמודה זו?')) return;

    const updated = columns.filter(col => col.key !== columnKey);
    setColumns(updated);
    
    // מחיקת ערכים מהשורות
    const updatedRows = rowsData.map(row => {
      const { [columnKey]: removed, ...rest } = row;
      return rest;
    });
    setRowsData(updatedRows);
    
    // מחיקת סגנונות של התאים בעמודה
    const newStyles = { ...cellStyles };
    Object.keys(newStyles).forEach(key => {
      if (key.endsWith(`_${columnKey}`)) {
        delete newStyles[key];
      }
    });
    setCellStyles(newStyles);
    
    await saveToBackend(updated, updatedRows, newStyles);
    toast.success('✓ עמודה נמחקה');
  };

  const toggleColumnVisibility = async (columnKey) => {
    const updated = columns.map(col => 
      col.key === columnKey ? { ...col, visible: !col.visible } : col
    );
    setColumns(updated);
    await saveToBackend(updated, rowsData, cellStyles);
    toast.success('✓ נראות עמודה שונתה');
  };

  const renameColumn = async (columnKey, newTitle) => {
    if (!newTitle.trim()) return;
    
    const updated = columns.map(col => 
      col.key === columnKey ? { ...col, title: newTitle.trim() } : col
    );
    setColumns(updated);
    await saveToBackend(updated, rowsData, cellStyles);
    toast.success('✓ שם עמודה עודכן');
  };

  const changeColumnType = async (columnKey, newType) => {
    const updated = columns.map(col => 
      col.key === columnKey ? { ...col, type: newType } : col
    );
    setColumns(updated);
    await saveToBackend(updated, rowsData, cellStyles);
    toast.success('✓ סוג עמודה עודכן');
  };

  const changeColumnWidth = async (columnKey, newWidth) => {
    const updated = columns.map(col => 
      col.key === columnKey ? { ...col, width: newWidth } : col
    );
    setColumns(updated);
    await saveToBackend(updated, rowsData, cellStyles);
  };

  const applyCellStyle = (cellKey, style) => {
    const newStyles = {
      ...cellStyles,
      [cellKey]: style
    };
    setCellStyles(newStyles);
    saveToBackend(columns, rowsData, newStyles);
    toast.success('✓ סגנון הותקן');
  };

  const applyStyleToSelection = (style) => {
    const newStyles = { ...cellStyles };
    selectedCells.forEach(cellKey => {
      newStyles[cellKey] = style;
    });
    setCellStyles(newStyles);
    saveToBackend(columns, rowsData, newStyles);
    toast.success(`✓ סגנון הותקן ל-${selectedCells.size} תאים`);
  };

  const clearAllStyles = async () => {
    if (!confirm('למחוק את כל העיצובים והצבעים?')) return;
    
    setCellStyles({});
    await saveToBackend(columns, rowsData, {});
    toast.success('✓ כל העיצובים נמחקו');
  };

  const exportToCSV = () => {
    const visibleColumns = columns.filter(col => col.visible !== false);
    
    // כותרות
    const headers = visibleColumns.map(col => col.title).join(',');
    
    // שורות
    const rows = rowsData.map(row => {
      return visibleColumns.map(col => {
        const value = row[col.key] || '';
        // Escape commas and quotes
        return `"${String(value).replace(/"/g, '""')}"`;
      }).join(',');
    }).join('\n');
    
    const csv = headers + '\n' + rows;
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${spreadsheet.name || 'spreadsheet'}.csv`;
    link.click();
    
    toast.success('✓ הקובץ יוצא בהצלחה');
  };

  const handleCellClick = (rowId, columnKey, event) => {
    // Alt+Click = בחירה מרובה
    if (event?.altKey) {
      event.preventDefault();
      const cellKey = `${rowId}_${columnKey}`;
      setSelectedCells(prev => {
        const newSet = new Set(prev);
        if (newSet.has(cellKey)) {
          newSet.delete(cellKey);
        } else {
          newSet.add(cellKey);
        }
        return newSet;
      });
      return;
    }

    // Ctrl+Click = תפריט צביעה
    if (event?.ctrlKey || event?.metaKey) {
      event.preventDefault();
      setPopoverOpen(`${rowId}_${columnKey}`);
      return;
    }

    // Click רגיל = עריכה
    const row = rowsData.find(r => r.id === rowId);
    if (!row) return;

    const currentValue = row[columnKey] || '';
    console.log('📝 Opening edit:', { rowId, columnKey, currentValue, row });
    
    setEditingCell(`${rowId}_${columnKey}`);
    setEditValue(String(currentValue));
    setTimeout(() => editInputRef.current?.focus(), 0);
  };

  const handleColumnHeaderClick = (columnKey, event) => {
    // Ctrl+Click = תפריט הגדרות עמודה
    if (event?.ctrlKey || event?.metaKey) {
      event.preventDefault();
      setPopoverOpen(`header_${columnKey}`);
      return;
    }

    // Click רגיל = עריכת שם
    setEditingColumnKey(columnKey);
    const col = columns.find(c => c.key === columnKey);
    setEditingColumnTitle(col?.title || '');
    setTimeout(() => columnEditRef.current?.focus(), 0);
  };

  const saveColumnTitle = () => {
    if (!editingColumnKey || !editingColumnTitle.trim()) {
      setEditingColumnKey(null);
      setEditingColumnTitle("");
      return;
    }

    renameColumn(editingColumnKey, editingColumnTitle);
    setEditingColumnKey(null);
    setEditingColumnTitle("");
  };

  const saveEdit = async () => {
    if (!editingCell) return;

    const lastUnderscoreIndex = editingCell.lastIndexOf('_');
    const rowId = editingCell.substring(0, lastUnderscoreIndex);
    const columnKey = editingCell.substring(lastUnderscoreIndex + 1);
    
    console.log('💾 Saving edit:', { 
      editingCell, 
      rowId, 
      columnKey, 
      editValue,
      lastUnderscoreIndex 
    });

    const updatedRows = rowsData.map(row => {
      if (row.id === rowId) {
        const newRow = { ...row, [columnKey]: editValue };
        console.log('✏️ Updated row:', { oldRow: row, newRow });
        return newRow;
      }
      return row;
    });

    console.log('📊 All rows after update:', updatedRows);
    setRowsData(updatedRows);
    setEditingCell(null);
    setEditValue("");

    await saveToBackend(columns, updatedRows, cellStyles);
    toast.success('✓ התא נשמר');
  };

  const saveToBackend = async (cols, rows, styles) => {
    if (!spreadsheet?.id) return;

    try {
      console.log('💾 [saveToBackend] Saving:', {
        id: spreadsheet.id,
        columnsCount: cols.length,
        rowsCount: rows.length,
        stylesCount: Object.keys(styles).length,
        rows
      });

      await base44.entities.CustomSpreadsheet.update(spreadsheet.id, {
        columns: cols,
        rows_data: rows,
        cell_styles: styles
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
              <Badge variant="outline">{visibleColumns.length}/{columns.length} עמודות</Badge>
            </div>
            
            <div className="flex gap-2">
              <Button onClick={addNewRow} size="sm" className="gap-2">
                <Plus className="w-4 h-4" />
                הוסף שורה
              </Button>
              <Button onClick={addColumn} size="sm" variant="outline" className="gap-2">
                <Plus className="w-4 h-4" />
                הוסף עמודה
              </Button>
              {selectedCells.size > 0 && (
                <>
                  <Badge variant="outline" className="bg-purple-50 px-3">
                    נבחרו: {selectedCells.size}
                  </Badge>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button size="sm" variant="outline" className="gap-2">
                        <Palette className="w-4 h-4" />
                        צבע
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64">
                      <ColorPicker onApply={applyStyleToSelection} />
                    </PopoverContent>
                  </Popover>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => setSelectedCells(new Set())}
                    className="gap-2"
                  >
                    <X className="w-4 h-4" />
                    בטל בחירה
                  </Button>
                </>
              )}
              <Button 
                onClick={() => setShowSettingsDialog(true)} 
                size="sm" 
                variant="ghost"
                className="gap-2"
              >
                <Settings className="w-4 h-4" />
                הגדרות
              </Button>
              <Button onClick={() => saveToBackend(columns, rowsData, cellStyles)} size="sm" variant="outline" className="gap-2">
                <Save className="w-4 h-4" />
                שמור
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-auto" style={{ maxHeight: fullScreenMode ? '85vh' : '60vh' }}>
            <table className="w-full border-collapse" dir="rtl">
              <thead className="bg-slate-100 sticky top-0 z-10">
                <tr>
                  {visibleColumns.map(col => {
                    const isEditing = editingColumnKey === col.key;
                    
                    return (
                      <th
                        key={col.key}
                        className="border border-slate-200 p-3 text-right font-semibold hover:bg-blue-50 cursor-pointer group relative"
                        style={{ width: col.width }}
                        onClick={(e) => handleColumnHeaderClick(col.key, e)}
                      >
                        {isEditing ? (
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <Input
                              ref={columnEditRef}
                              value={editingColumnTitle}
                              onChange={(e) => setEditingColumnTitle(e.target.value)}
                              onBlur={saveColumnTitle}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveColumnTitle();
                                if (e.key === 'Escape') {
                                  setEditingColumnKey(null);
                                  setEditingColumnTitle("");
                                }
                              }}
                              className="h-8"
                              autoFocus
                            />
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <span>{col.title}</span>
                            <Popover 
                              open={popoverOpen === `header_${col.key}`}
                              onOpenChange={(open) => !open && setPopoverOpen(null)}
                            >
                              <PopoverTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6 opacity-0 group-hover:opacity-100"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPopoverOpen(`header_${col.key}`);
                                  }}
                                >
                                  <Settings className="w-3 h-3" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-56" align="start">
                                <div className="space-y-2">
                                  <h4 className="font-semibold text-sm mb-3">{col.title}</h4>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full justify-start gap-2"
                                    onClick={() => {
                                      setEditingColumnKey(col.key);
                                      setEditingColumnTitle(col.title);
                                      setPopoverOpen(null);
                                    }}
                                  >
                                    <Edit2 className="w-4 h-4" />
                                    שנה שם
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full justify-start gap-2"
                                    onClick={() => {
                                      toggleColumnVisibility(col.key);
                                      setPopoverOpen(null);
                                    }}
                                  >
                                    {col.visible !== false ? (
                                      <>
                                        <EyeOff className="w-4 h-4" />
                                        הסתר עמודה
                                      </>
                                    ) : (
                                      <>
                                        <Eye className="w-4 h-4" />
                                        הצג עמודה
                                      </>
                                    )}
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full justify-start gap-2 text-red-600"
                                    onClick={() => {
                                      deleteColumn(col.key);
                                      setPopoverOpen(null);
                                    }}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    מחק עמודה
                                  </Button>
                                </div>
                              </PopoverContent>
                            </Popover>
                          </div>
                        )}
                      </th>
                    );
                  })}
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
                          const isSelected = selectedCells.has(cellKey);
                          const cellValue = row[column.key] || '';
                          const cellStyle = cellStyles[cellKey] || {};

                          console.log(`  📝 Cell [${cellKey}]:`, { value: cellValue, isEditing });

                          return (
                            <td
                              key={column.key}
                              className={`border border-slate-200 p-2 cursor-pointer hover:bg-blue-50 ${
                                isSelected ? 'ring-2 ring-purple-500 bg-purple-50' : ''
                              }`}
                              style={{
                                backgroundColor: isSelected ? '#faf5ff' : cellStyle.backgroundColor,
                                opacity: cellStyle.opacity ? cellStyle.opacity / 100 : 1,
                                fontWeight: cellStyle.fontWeight || 'normal'
                              }}
                              onClick={(e) => !isEditing && handleCellClick(row.id, column.key, e)}
                            >
                              {isEditing ? (
                                <Input
                                  ref={editInputRef}
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
                                <div className="text-sm w-full">
                                  {String(cellValue)}
                                  {popoverOpen === cellKey && (
                                    <Popover
                                      open={true}
                                      onOpenChange={(open) => !open && setPopoverOpen(null)}
                                    >
                                      <PopoverContent className="w-64" align="start">
                                        <ColorPicker 
                                          onApply={(style) => {
                                            applyCellStyle(cellKey, style);
                                            setPopoverOpen(null);
                                          }}
                                          currentStyle={cellStyle}
                                        />
                                      </PopoverContent>
                                    </Popover>
                                  )}
                                </div>
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
          {rowsData.length} שורות • {visibleColumns.length} עמודות גלויות • {Object.keys(cellStyles).length} תאים מעוצבים
        </div>
      </Card>

      {/* דיאלוג הגדרות מתקדם */}
      <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <Settings className="w-6 h-6" />
              הגדרות וניהול טבלה
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            {/* ניהול עמודות */}
            <div className="space-y-3">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Grid className="w-5 h-5" />
                ניהול עמודות
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {columns.map(col => (
                  <div key={col.key} className="border rounded-lg p-4 space-y-3 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={col.visible !== false}
                          onCheckedChange={() => toggleColumnVisibility(col.key)}
                        />
                        <span className="font-semibold">{col.title}</span>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteColumn(col.key)}
                        className="h-8 w-8 text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <label className="text-xs text-slate-600 mb-1 block">שם העמודה</label>
                        <Input
                          value={col.title}
                          onChange={(e) => renameColumn(col.key, e.target.value)}
                          className="h-8 text-sm"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-slate-600 mb-1 block">סוג</label>
                          <Select value={col.type || 'text'} onValueChange={(val) => changeColumnType(col.key, val)}>
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="text">טקסט</SelectItem>
                              <SelectItem value="number">מספר</SelectItem>
                              <SelectItem value="date">תאריך</SelectItem>
                              <SelectItem value="checkbox">תיבת סימון</SelectItem>
                              <SelectItem value="select">בחירה</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <label className="text-xs text-slate-600 mb-1 block">רוחב</label>
                          <Select value={col.width} onValueChange={(val) => changeColumnWidth(col.key, val)}>
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="100px">צר (100px)</SelectItem>
                              <SelectItem value="150px">רגיל (150px)</SelectItem>
                              <SelectItem value="200px">רחב (200px)</SelectItem>
                              <SelectItem value="300px">רחב מאוד (300px)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* פעולות כלליות */}
            <div className="space-y-3">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <List className="w-5 h-5" />
                פעולות כלליות
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Button 
                  variant="outline" 
                  className="justify-start gap-2 h-auto py-3"
                  onClick={exportToCSV}
                >
                  <Download className="w-5 h-5" />
                  <div className="text-right">
                    <div className="font-semibold">ייצא לקובץ CSV</div>
                    <div className="text-xs text-slate-500">שמור את הטבלה כקובץ אקסל</div>
                  </div>
                </Button>

                <Button 
                  variant="outline" 
                  className="justify-start gap-2 h-auto py-3"
                  onClick={addColumn}
                >
                  <Plus className="w-5 h-5" />
                  <div className="text-right">
                    <div className="font-semibold">הוסף עמודה חדשה</div>
                    <div className="text-xs text-slate-500">צור שדה חדש בטבלה</div>
                  </div>
                </Button>

                <Button 
                  variant="outline" 
                  className="justify-start gap-2 h-auto py-3"
                  onClick={addNewRow}
                >
                  <Plus className="w-5 h-5" />
                  <div className="text-right">
                    <div className="font-semibold">הוסף שורה חדשה</div>
                    <div className="text-xs text-slate-500">צור רשומה חדשה</div>
                  </div>
                </Button>

                <Button 
                  variant="outline" 
                  className="justify-start gap-2 h-auto py-3 text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={clearAllStyles}
                >
                  <Palette className="w-5 h-5" />
                  <div className="text-right">
                    <div className="font-semibold">נקה את כל העיצובים</div>
                    <div className="text-xs text-slate-500">הסר צבעים וסגנונות מהטבלה</div>
                  </div>
                </Button>
              </div>
            </div>

            <Separator />

            {/* מידע על הטבלה */}
            <div className="space-y-3">
              <h3 className="font-bold text-lg">מידע על הטבלה</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-lg">
                <div>
                  <div className="text-xs text-slate-600">שם הטבלה</div>
                  <div className="font-bold text-lg">{spreadsheet.name}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-600">סה"כ שורות</div>
                  <div className="font-bold text-lg text-blue-600">{rowsData.length}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-600">סה"כ עמודות</div>
                  <div className="font-bold text-lg text-purple-600">{columns.length}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-600">תאים מעוצבים</div>
                  <div className="font-bold text-lg text-green-600">{Object.keys(cellStyles).length}</div>
                </div>
              </div>
            </div>

            {/* טיפים מהירים */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-bold mb-2 text-blue-900">💡 טיפים מהירים</h4>
              <ul className="text-sm space-y-1 text-blue-800">
                <li>• <kbd className="px-2 py-1 bg-white rounded text-xs">Click</kbd> על תא = עריכה</li>
                <li>• <kbd className="px-2 py-1 bg-white rounded text-xs">Ctrl+Click</kbd> על תא = תפריט צבעים</li>
                <li>• <kbd className="px-2 py-1 bg-white rounded text-xs">Alt+Click</kbd> על תא = בחירה מרובה</li>
                <li>• <kbd className="px-2 py-1 bg-white rounded text-xs">Click</kbd> על כותרת = שינוי שם</li>
                <li>• <kbd className="px-2 py-1 bg-white rounded text-xs">Ctrl+Click</kbd> על כותרת = תפריט עמודה</li>
              </ul>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button onClick={() => setShowSettingsDialog(false)} className="w-full">
              סגור
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// רכיב עזר לבחירת צבעים
function ColorPicker({ onApply, currentStyle = {} }) {
  const [color, setColor] = useState(currentStyle.backgroundColor || '#ffffff');
  const [opacity, setOpacity] = useState(currentStyle.opacity || 100);
  const [isBold, setIsBold] = useState(currentStyle.fontWeight === 'bold');

  const colors = [
    '#ffffff', '#fee2e2', '#fef3c7', '#d1fae5', '#dbeafe', '#ede9fe', '#fce7f3', '#f3f4f6'
  ];

  return (
    <div className="space-y-3" dir="rtl">
      <div>
        <h4 className="font-semibold text-sm mb-2">צבע רקע</h4>
        <div className="grid grid-cols-4 gap-2 mb-2">
          {colors.map(c => (
            <button
              key={c}
              className={`h-8 rounded border-2 ${color === c ? 'ring-2 ring-blue-500' : ''}`}
              style={{ backgroundColor: c }}
              onClick={() => setColor(c)}
            />
          ))}
        </div>
        <Input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="w-full h-10"
        />
      </div>

      <div>
        <h4 className="font-semibold text-sm mb-2">שקיפות: {opacity}%</h4>
        <input
          type="range"
          min="0"
          max="100"
          value={opacity}
          onChange={(e) => setOpacity(Number(e.target.value))}
          className="w-full"
        />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm">טקסט מודגש</span>
        <input
          type="checkbox"
          checked={isBold}
          onChange={(e) => setIsBold(e.target.checked)}
          className="h-4 w-4"
        />
      </div>

      <Button
        onClick={() => onApply({
          backgroundColor: color,
          opacity: opacity,
          fontWeight: isBold ? 'bold' : 'normal'
        })}
        className="w-full"
      >
        החל
      </Button>
    </div>
  );
}