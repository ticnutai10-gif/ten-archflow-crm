import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Save, Table, Copy, Settings, Palette, Eye, EyeOff, Edit2, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  
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

  const addColumn = async () => {
    const columnName = prompt('שם העמודה החדשה:');
    if (!columnName) return;

    const newColumn = {
      key: `col_${Date.now()}`,
      title: columnName,
      width: '150px',
      visible: true
    };

    const updated = [...columns, newColumn];
    setColumns(updated);
    await saveToBackend(updated, rowsData);
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
    
    await saveToBackend(updated, updatedRows);
    toast.success('✓ עמודה נמחקה');
  };

  const toggleColumnVisibility = async (columnKey) => {
    const updated = columns.map(col => 
      col.key === columnKey ? { ...col, visible: !col.visible } : col
    );
    setColumns(updated);
    await saveToBackend(updated, rowsData);
    toast.success('✓ נראות עמודה שונתה');
  };

  const renameColumn = async (columnKey, newTitle) => {
    if (!newTitle.trim()) return;
    
    const updated = columns.map(col => 
      col.key === columnKey ? { ...col, title: newTitle.trim() } : col
    );
    setColumns(updated);
    await saveToBackend(updated, rowsData);
    toast.success('✓ שם עמודה עודכן');
  };

  const applyCellStyle = (cellKey, style) => {
    setCellStyles(prev => ({
      ...prev,
      [cellKey]: style
    }));
    toast.success('✓ סגנון הותקן');
  };

  const applyStyleToSelection = (style) => {
    setCellStyles(prev => {
      const newStyles = { ...prev };
      selectedCells.forEach(cellKey => {
        newStyles[cellKey] = style;
      });
      return newStyles;
    });
    toast.success(`✓ סגנון הותקן ל-${selectedCells.size} תאים`);
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

    // Fix: Split correctly when cell key is "rowId_columnKey"
    // Example: "row_1762974168484_col1" should split to rowId="row_1762974168484", columnKey="col1"
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
                onClick={() => setShowColumnSettings(!showColumnSettings)} 
                size="sm" 
                variant="ghost"
                className="gap-2"
              >
                <Settings className="w-4 h-4" />
              </Button>
              <Button onClick={() => saveToBackend(columns, rowsData)} size="sm" variant="outline" className="gap-2">
                <Save className="w-4 h-4" />
                שמור
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-auto" style={{ maxHeight: fullScreenMode ? '85vh' : '60vh' }}>
            <table className="w-full border-collapse" dir="rtl">
              <thead className="bg-slate-100 sticky top-0">
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
          {rowsData.length} שורות • {visibleColumns.length} עמודות
        </div>
      </Card>

      {/* הגדרות עמודות */}
      {showColumnSettings && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-lg">הגדרות עמודות</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {columns.map(col => (
                <div key={col.key} className="flex items-center justify-between p-2 border rounded hover:bg-slate-50">
                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => toggleColumnVisibility(col.key)}
                    >
                      {col.visible !== false ? (
                        <Eye className="w-4 h-4 text-green-600" />
                      ) : (
                        <EyeOff className="w-4 h-4 text-slate-400" />
                      )}
                    </Button>
                    <span className={col.visible === false ? 'text-slate-400' : ''}>
                      {col.title}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => {
                        setEditingColumnKey(col.key);
                        setEditingColumnTitle(col.title);
                        setShowColumnSettings(false);
                      }}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-red-600"
                      onClick={() => deleteColumn(col.key)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
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