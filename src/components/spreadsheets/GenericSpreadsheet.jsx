import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Save, Table, Copy, Settings, Palette, Eye, EyeOff, Edit2, X, Download, Upload, Grid, List, Search, Filter, ArrowUp, ArrowDown, ArrowUpDown, XCircle, Undo, Redo, GripVertical } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
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
  
  // מיון וסינון
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnFilters, setColumnFilters] = useState({});
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  
  // Undo/Redo
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isUndoRedoAction, setIsUndoRedoAction] = useState(false);
  
  // Resizing
  const [resizingColumn, setResizingColumn] = useState(null);
  const [resizingRow, setResizingRow] = useState(null);
  const [rowHeights, setRowHeights] = useState({});
  
  // ייבוא CSV
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importPreview, setImportPreview] = useState(null);
  const fileInputRef = useRef(null);
  
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
      
      const initialColumns = spreadsheet.columns || [];
      const initialRows = spreadsheet.rows_data || [];
      const initialStyles = spreadsheet.cell_styles || {};
      
      setColumns(initialColumns);
      setRowsData(initialRows);
      setCellStyles(initialStyles);
      setRowHeights(spreadsheet.row_heights || {});
      
      // אתחול ההיסטוריה
      setHistory([{
        columns: initialColumns,
        rows: initialRows,
        styles: initialStyles
      }]);
      setHistoryIndex(0);
      
      console.log('✅ [GenericSpreadsheet] State updated with new data');
    } else {
      console.warn('⚠️ [GenericSpreadsheet] No spreadsheet provided to useEffect');
    }
  }, [spreadsheet]);

  // שמירה להיסטוריה (Undo/Redo)
  const saveToHistory = useCallback((cols, rows, styles) => {
    if (isUndoRedoAction) return;
    
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push({
        columns: cols,
        rows: rows,
        styles: styles
      });
      
      // שמור מקסימום 50 צעדים
      if (newHistory.length > 50) {
        newHistory.shift();
        return newHistory;
      }
      
      return newHistory;
    });
    
    setHistoryIndex(prev => Math.min(prev + 1, 49));
  }, [historyIndex, isUndoRedoAction]);

  // Undo
  const handleUndo = useCallback(() => {
    if (historyIndex <= 0) {
      toast.error('אין מה לבטל');
      return;
    }
    
    setIsUndoRedoAction(true);
    const prevState = history[historyIndex - 1];
    
    setColumns(prevState.columns);
    setRowsData(prevState.rows);
    setCellStyles(prevState.styles);
    setHistoryIndex(prev => prev - 1);
    
    saveToBackend(prevState.columns, prevState.rows, prevState.styles);
    toast.success('✓ פעולה בוטלה');
    
    setTimeout(() => setIsUndoRedoAction(false), 100);
  }, [history, historyIndex]);

  // Redo
  const handleRedo = useCallback(() => {
    if (historyIndex >= history.length - 1) {
      toast.error('אין מה לשחזר');
      return;
    }
    
    setIsUndoRedoAction(true);
    const nextState = history[historyIndex + 1];
    
    setColumns(nextState.columns);
    setRowsData(nextState.rows);
    setCellStyles(nextState.styles);
    setHistoryIndex(prev => prev + 1);
    
    saveToBackend(nextState.columns, nextState.rows, nextState.styles);
    toast.success('✓ פעולה שוחזרה');
    
    setTimeout(() => setIsUndoRedoAction(false), 100);
  }, [history, historyIndex]);

  // קיצורי מקלדת
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+Z = Undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      
      // Ctrl+Y או Ctrl+Shift+Z = Redo
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  // ייבוא CSV
  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImportFile(file);
    
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      toast.error('הקובץ ריק או לא תקין');
      return;
    }

    // פענוח כותרות
    const headerLine = lines[0];
    const headers = headerLine.split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    
    // פענוח שורות
    const rows = lines.slice(1).map((line, idx) => {
      const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      const rowData = { id: `imported_${Date.now()}_${idx}` };
      
      headers.forEach((header, i) => {
        const colKey = `col${i}`;
        rowData[colKey] = values[i] || '';
      });
      
      return rowData;
    });

    // יצירת עמודות
    const importedColumns = headers.map((header, i) => ({
      key: `col${i}`,
      title: header,
      width: '150px',
      type: 'text',
      visible: true
    }));

    setImportPreview({
      columns: importedColumns,
      rows: rows.slice(0, 5), // רק 5 שורות ראשונות לתצוגה
      totalRows: rows.length,
      allRows: rows
    });
    
    setShowImportDialog(true);
  };

  const confirmImport = async () => {
    if (!importPreview) return;

    const { columns: importedColumns, allRows } = importPreview;
    
    setColumns(importedColumns);
    setRowsData(allRows);
    setCellStyles({});
    
    await saveToBackend(importedColumns, allRows, {});
    
    setShowImportDialog(false);
    setImportFile(null);
    setImportPreview(null);
    
    toast.success(`✓ יובאו ${allRows.length} שורות בהצלחה`);
  };

  // גרירת שורות
  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(filteredAndSortedData);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // עדכון המערך המלא (לא רק המסונן)
    const reorderedRowsData = [...rowsData];
    
    // מצא את האינדקסים במערך המקורי
    const sourceIndex = rowsData.findIndex(r => r.id === filteredAndSortedData[result.source.index].id);
    const destIndex = rowsData.findIndex(r => r.id === filteredAndSortedData[result.destination.index].id);
    
    const [movedRow] = reorderedRowsData.splice(sourceIndex, 1);
    reorderedRowsData.splice(destIndex, 0, movedRow);

    setRowsData(reorderedRowsData);
    saveToBackend(columns, reorderedRowsData, cellStyles);
    toast.success('✓ סדר השורות עודכן');
  };

  // פונקציית מיון
  const handleSort = (columnKey) => {
    if (sortColumn === columnKey) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortColumn(null);
        setSortDirection('asc');
      }
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  // חישוב נתונים מסוננים וממוינים
  const filteredAndSortedData = useMemo(() => {
    let result = [...rowsData];

    // 1. סינון גלובלי
    if (globalFilter) {
      const searchLower = globalFilter.toLowerCase();
      result = result.filter(row => {
        return columns.some(col => {
          const value = String(row[col.key] || '').toLowerCase();
          return value.includes(searchLower);
        });
      });
    }

    // 2. סינון לפי עמודות
    Object.entries(columnFilters).forEach(([columnKey, filterValue]) => {
      if (filterValue) {
        const searchLower = filterValue.toLowerCase();
        result = result.filter(row => {
          const value = String(row[columnKey] || '').toLowerCase();
          return value.includes(searchLower);
        });
      }
    });

    // 3. מיון
    if (sortColumn) {
      result.sort((a, b) => {
        const aVal = a[sortColumn] || '';
        const bVal = b[sortColumn] || '';
        
        const aNum = Number(aVal);
        const bNum = Number(bVal);
        
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
        } else {
          const comparison = String(aVal).localeCompare(String(bVal), 'he');
          return sortDirection === 'asc' ? comparison : -comparison;
        }
      });
    }

    return result;
  }, [rowsData, columns, sortColumn, sortDirection, globalFilter, columnFilters]);

  const updateColumnFilter = (columnKey, value) => {
    setColumnFilters(prev => {
      if (!value) {
        const { [columnKey]: removed, ...rest } = prev;
        return rest;
      }
      return { ...prev, [columnKey]: value };
    });
  };

  const clearAllFilters = () => {
    setGlobalFilter("");
    setColumnFilters({});
    setSortColumn(null);
    setSortDirection('asc');
    toast.success('✓ כל הסינונים והמיונים נוקו');
  };

  const addNewRow = async () => {
    const newRow = { id: `row_${Date.now()}` };
    console.log('➕ Adding new row:', newRow);
    
    const updated = [...rowsData, newRow];
    setRowsData(updated);
    saveToHistory(columns, updated, cellStyles);
    
    await saveToBackend(columns, updated, cellStyles);
    toast.success('✓ שורה נוספה');
  };

  const deleteRow = async (rowId) => {
    if (!confirm('למחוק שורה זו?')) return;
    
    const updated = rowsData.filter(r => r.id !== rowId);
    setRowsData(updated);
    
    const newStyles = { ...cellStyles };
    Object.keys(newStyles).forEach(key => {
      if (key.startsWith(`${rowId}_`)) {
        delete newStyles[key];
      }
    });
    setCellStyles(newStyles);
    saveToHistory(columns, updated, newStyles);
    
    await saveToBackend(columns, updated, newStyles);
    toast.success('✓ שורה נמחקה');
  };

  const duplicateRow = async (row) => {
    const { id, ...data } = row;
    const newRow = { ...data, id: `row_${Date.now()}` };
    
    const updated = [...rowsData, newRow];
    setRowsData(updated);
    saveToHistory(columns, updated, cellStyles);
    
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
    saveToHistory(updated, rowsData, cellStyles);
    await saveToBackend(updated, rowsData, cellStyles);
    toast.success('✓ עמודה נוספה');
  };

  const deleteColumn = async (columnKey) => {
    if (!confirm('למחוק עמודה זו?')) return;

    const updated = columns.filter(col => col.key !== columnKey);
    setColumns(updated);
    
    const updatedRows = rowsData.map(row => {
      const { [columnKey]: removed, ...rest } = row;
      return rest;
    });
    setRowsData(updatedRows);
    
    const newStyles = { ...cellStyles };
    Object.keys(newStyles).forEach(key => {
      if (key.endsWith(`_${columnKey}`)) {
        delete newStyles[key];
      }
    });
    setCellStyles(newStyles);
    saveToHistory(updated, updatedRows, newStyles);
    
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
    saveToHistory(updated, rowsData, cellStyles);
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

  // פונקציות Resizing - גרסה משופרת
  const resizeStartRef = useRef(null);
  
  const handleColumnResizeStart = (e, columnKey) => {
    e.preventDefault();
    e.stopPropagation();
    
    const column = columns.find(c => c.key === columnKey);
    const currentWidth = parseInt(column.width) || 150;
    
    resizeStartRef.current = {
      type: 'column',
      key: columnKey,
      startX: e.pageX,
      startWidth: currentWidth
    };
    
    setResizingColumn(columnKey);
  };

  const handleRowResizeStart = (e, rowId) => {
    e.preventDefault();
    e.stopPropagation();
    
    const currentHeight = rowHeights[rowId] || 40;
    
    resizeStartRef.current = {
      type: 'row',
      id: rowId,
      startY: e.pageY,
      startHeight: currentHeight
    };
    
    setResizingRow(rowId);
  };

  useEffect(() => {
    if (!resizingColumn && !resizingRow) return;

    const handleMouseMove = (e) => {
      if (!resizeStartRef.current) return;
      
      if (resizeStartRef.current.type === 'column') {
        const diff = e.pageX - resizeStartRef.current.startX;
        const newWidth = Math.max(50, resizeStartRef.current.startWidth + diff);
        
        const updated = columns.map(col => 
          col.key === resizeStartRef.current.key ? { ...col, width: `${newWidth}px` } : col
        );
        setColumns(updated);
      }
      
      if (resizeStartRef.current.type === 'row') {
        const diff = e.pageY - resizeStartRef.current.startY;
        const newHeight = Math.max(30, resizeStartRef.current.startHeight + diff);
        
        setRowHeights(prev => ({
          ...prev,
          [resizeStartRef.current.id]: newHeight
        }));
      }
    };

    const handleMouseUp = () => {
      if (resizingColumn || resizingRow) {
        saveToBackend(columns, rowsData, cellStyles);
        setResizingColumn(null);
        setResizingRow(null);
        resizeStartRef.current = null;
        toast.success('✓ גודל עודכן');
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    // מניעת בחירת טקסט בזמן גרירה
    document.body.style.userSelect = 'none';
    document.body.style.cursor = resizingColumn ? 'col-resize' : 'row-resize';
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [resizingColumn, resizingRow]);

  const applyCellStyle = (cellKey, style) => {
    const newStyles = {
      ...cellStyles,
      [cellKey]: style
    };
    setCellStyles(newStyles);
    saveToHistory(columns, rowsData, newStyles);
    saveToBackend(columns, rowsData, newStyles);
    toast.success('✓ סגנון הותקן');
  };

  const applyStyleToSelection = (style) => {
    const newStyles = { ...cellStyles };
    selectedCells.forEach(cellKey => {
      newStyles[cellKey] = style;
    });
    setCellStyles(newStyles);
    saveToHistory(columns, rowsData, newStyles);
    saveToBackend(columns, rowsData, newStyles);
    toast.success(`✓ סגנון הותקן ל-${selectedCells.size} תאים`);
  };

  const clearAllStyles = async () => {
    if (!confirm('למחוק את כל העיצובים והצבעים?')) return;
    
    setCellStyles({});
    saveToHistory(columns, rowsData, {});
    await saveToBackend(columns, rowsData, {});
    toast.success('✓ כל העיצובים נמחקו');
  };

  const exportToCSV = () => {
    const visibleColumns = columns.filter(col => col.visible !== false);
    
    const headers = visibleColumns.map(col => col.title).join(',');
    
    const rows = filteredAndSortedData.map(row => {
      return visibleColumns.map(col => {
        const value = row[col.key] || '';
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

    if (event?.ctrlKey || event?.metaKey) {
      event.preventDefault();
      setPopoverOpen(`${rowId}_${columnKey}`);
      return;
    }

    const row = filteredAndSortedData.find(r => r.id === rowId);
    if (!row) return;

    const currentValue = row[columnKey] || '';
    console.log('📝 Opening edit:', { rowId, columnKey, currentValue, row });
    
    setEditingCell(`${rowId}_${columnKey}`);
    setEditValue(String(currentValue));
    setTimeout(() => editInputRef.current?.focus(), 0);
  };

  const handleColumnHeaderClick = (columnKey, event) => {
    if (event?.shiftKey) {
      event.preventDefault();
      handleSort(columnKey);
      return;
    }

    if (event?.ctrlKey || event?.metaKey) {
      event.preventDefault();
      setPopoverOpen(`header_${columnKey}`);
      return;
    }

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
    saveToHistory(columns, updatedRows, cellStyles);

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
        cell_styles: styles,
        row_heights: rowHeights
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
  const hasActiveFilters = globalFilter || Object.keys(columnFilters).length > 0 || sortColumn;
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  console.log('🎨 Rendering table:', {
    visibleColumns: visibleColumns.length,
    totalRows: rowsData.length,
    filteredRows: filteredAndSortedData.length,
    sortColumn,
    sortDirection
  });

  return (
    <div className="w-full" dir="rtl">
      <Card className="shadow-lg">
        <CardHeader className="border-b space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-wrap">
              <Table className="w-6 h-6 text-purple-600" />
              <CardTitle className="text-xl">{spreadsheet.name}</CardTitle>
              <Badge variant="outline">{filteredAndSortedData.length}/{rowsData.length} שורות</Badge>
              <Badge variant="outline">{visibleColumns.length}/{columns.length} עמודות</Badge>
              {hasActiveFilters && (
                <Badge className="bg-blue-600 text-white">
                  <Filter className="w-3 h-3 ml-1" />
                  פעיל
                </Badge>
              )}
            </div>
            
            <div className="flex gap-2 flex-wrap">
              <Button 
                onClick={handleUndo} 
                size="sm" 
                variant="outline" 
                disabled={!canUndo}
                title="בטל פעולה (Ctrl+Z)"
                className="gap-2"
              >
                <Undo className="w-4 h-4" />
              </Button>
              <Button 
                onClick={handleRedo} 
                size="sm" 
                variant="outline" 
                disabled={!canRedo}
                title="שחזר פעולה (Ctrl+Y)"
                className="gap-2"
              >
                <Redo className="w-4 h-4" />
              </Button>
              
              <Button onClick={addNewRow} size="sm" className="gap-2">
                <Plus className="w-4 h-4" />
                שורה
              </Button>
              <Button onClick={addColumn} size="sm" variant="outline" className="gap-2">
                <Plus className="w-4 h-4" />
                עמודה
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
                  </Button>
                </>
              )}
              
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button 
                onClick={() => fileInputRef.current?.click()} 
                size="sm" 
                variant="outline"
                className="gap-2"
              >
                <Upload className="w-4 h-4" />
                ייבוא
              </Button>
              
              <Button 
                onClick={() => setShowFilterDialog(true)} 
                size="sm" 
                variant={hasActiveFilters ? "default" : "outline"}
                className="gap-2"
              >
                <Filter className="w-4 h-4" />
                סינון
              </Button>
              <Button 
                onClick={() => setShowSettingsDialog(true)} 
                size="sm" 
                variant="ghost"
                className="gap-2"
              >
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* שורת חיפוש מהיר */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="חיפוש מהיר בכל הטבלה..."
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="pr-10"
              />
            </div>
            {hasActiveFilters && (
              <Button size="sm" variant="ghost" onClick={clearAllFilters} className="gap-2">
                <XCircle className="w-4 h-4" />
                נקה
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div 
            className="overflow-auto" 
            style={{ 
              maxHeight: fullScreenMode ? '85vh' : '60vh', 
              position: 'relative',
              overflowX: 'auto',
              overflowY: 'auto'
            }}
          >
            <DragDropContext onDragEnd={handleDragEnd}>
              <table className="w-full border-collapse" dir="rtl" style={{ position: 'relative' }}>
                <thead className="bg-slate-100" style={{ position: 'sticky', top: 0, zIndex: 25 }}>
                  <tr>
                    <th className="border border-slate-200 p-3 w-12 bg-slate-200 sticky right-0 shadow-[2px_0_5px_rgba(0,0,0,0.1)]" style={{ zIndex: 35 }}>
                      <GripVertical className="w-4 h-4 mx-auto text-slate-400" />
                    </th>
                    {visibleColumns.map((col, colIndex) => {
                      const isEditing = editingColumnKey === col.key;
                      const isSorted = sortColumn === col.key;
                      const hasFilter = columnFilters[col.key];
                      
                      return (
                        <th
                          key={col.key}
                          className={`border border-slate-200 p-3 text-right font-semibold hover:bg-blue-50 cursor-pointer group relative ${
                            colIndex === 0 ? 'sticky shadow-[2px_0_5px_rgba(0,0,0,0.1)] bg-slate-100' : ''
                          }`}
                          style={{ 
                            width: col.width, 
                            position: colIndex === 0 ? 'sticky' : 'relative',
                            right: colIndex === 0 ? '48px' : undefined,
                            backgroundColor: colIndex === 0 ? '#f1f5f9' : '#f1f5f9',
                            zIndex: colIndex === 0 ? 30 : 25
                          }}
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
                              <div className="flex items-center gap-2">
                                <span>{col.title}</span>
                                {hasFilter && (
                                  <Badge variant="outline" className="h-5 px-1 text-xs bg-blue-50">
                                    <Filter className="w-3 h-3" />
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-1">
                                {/* כפתור מיון */}
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSort(col.key);
                                  }}
                                  title="מיין עמודה"
                                >
                                  {isSorted ? (
                                    sortDirection === 'asc' ? 
                                      <ArrowUp className="w-4 h-4 text-blue-600" /> : 
                                      <ArrowDown className="w-4 h-4 text-blue-600" />
                                  ) : (
                                    <ArrowUpDown className="w-4 h-4 text-slate-400" />
                                  )}
                                </Button>
                                <Popover 
                                  open={popoverOpen === `header_${col.key}`}
                                  onOpenChange={(open) => !open && setPopoverOpen(null)}
                                >
                                  <PopoverTrigger asChild>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-6 w-6"
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
                                          handleSort(col.key);
                                          setPopoverOpen(null);
                                        }}
                                      >
                                        <ArrowUpDown className="w-4 h-4" />
                                        מיין עמודה
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
                            </div>
                          )}
                          
                          {/* Column Resizer - ידית גרירה לשינוי רוחב */}
                          <div
                            className="absolute top-0 bottom-0 cursor-col-resize transition-all"
                            style={{ 
                              left: '-6px',
                              width: '12px',
                              backgroundColor: resizingColumn === col.key ? '#3b82f6' : 'transparent',
                              zIndex: 100,
                              pointerEvents: 'auto'
                            }}
                            onMouseDown={(e) => handleColumnResizeStart(e, col.key)}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#93c5fd'}
                            onMouseLeave={(e) => {
                              if (resizingColumn !== col.key) {
                                e.currentTarget.style.backgroundColor = 'transparent';
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                            title="⬌ גרור לשינוי רוחב עמודה"
                          />
                        </th>
                      );
                    })}
                    <th className="border border-slate-200 p-3" style={{ width: '120px' }}>
                      פעולות
                    </th>
                  </tr>
                </thead>

                <Droppable droppableId="spreadsheet-rows">
                  {(provided) => (
                    <tbody ref={provided.innerRef} {...provided.droppableProps}>
                      {filteredAndSortedData.length === 0 ? (
                        <tr>
                          <td colSpan={visibleColumns.length + 2} className="text-center py-12 text-slate-500 border">
                            {rowsData.length === 0 ? (
                              <>אין שורות בטבלה - לחץ "הוסף שורה"</>
                            ) : (
                              <>אין תוצאות מתאימות לחיפוש</>
                            )}
                          </td>
                        </tr>
                      ) : (
                        filteredAndSortedData.map((row, rowIndex) => {
                          console.log(`🔍 Rendering row ${rowIndex}:`, row);
                          const rowHeight = rowHeights[row.id] || 40;
                          
                          return (
                            <Draggable key={row.id} draggableId={row.id} index={rowIndex}>
                              {(provided, snapshot) => (
                                <tr 
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  className={`${rowIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50'} ${snapshot.isDragging ? 'opacity-70' : ''} relative`}
                                  style={{ height: `${rowHeight}px` }}
                                >
                                  <td 
                                    {...provided.dragHandleProps}
                                    className="border border-slate-200 p-2 cursor-grab active:cursor-grabbing bg-slate-100 hover:bg-slate-200 relative sticky right-0 shadow-[2px_0_5px_rgba(0,0,0,0.1)]"
                                    style={{ height: `${rowHeight}px`, zIndex: 15 }}
                                  >
                                    <GripVertical className="w-4 h-4 mx-auto text-slate-500" />
                                    
                                    {/* Row Resizer - ידית גרירה לשינוי גובה */}
                                    <div
                                      className="absolute left-0 right-0 cursor-row-resize transition-all"
                                      style={{ 
                                        bottom: '-6px',
                                        height: '12px',
                                        backgroundColor: resizingRow === row.id ? '#3b82f6' : 'transparent',
                                        zIndex: 100,
                                        pointerEvents: 'auto'
                                      }}
                                      onMouseDown={(e) => handleRowResizeStart(e, row.id)}
                                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#93c5fd'}
                                      onMouseLeave={(e) => {
                                        if (resizingRow !== row.id) {
                                          e.currentTarget.style.backgroundColor = 'transparent';
                                        }
                                      }}
                                      onClick={(e) => e.stopPropagation()}
                                      title="⬍ גרור לשינוי גובה שורה"
                                    />
                                  </td>
                                  {visibleColumns.map(column => {
                                    const cellKey = `${row.id}_${column.key}`;
                                    const isEditing = editingCell === cellKey;
                                    const isSelected = selectedCells.has(cellKey);
                                    const cellValue = row[column.key] || '';
                                    const cellStyle = cellStyles[cellKey] || {};

                                    console.log(`  📝 Cell [${cellKey}]:`, { value: cellValue, isEditing });

                                    const colIndex = visibleColumns.findIndex(c => c.key === column.key);
                                    
                                    return (
                                      <td
                                        key={column.key}
                                        className={`border border-slate-200 p-2 cursor-pointer hover:bg-blue-50 ${
                                          isSelected ? 'ring-2 ring-purple-500 bg-purple-50' : ''
                                        } ${
                                          colIndex === 0 ? 'sticky shadow-[2px_0_5px_rgba(0,0,0,0.05)]' : ''
                                        }`}
                                        style={{
                                          backgroundColor: isSelected ? '#faf5ff' : colIndex === 0 ? (rowIndex % 2 === 0 ? '#ffffff' : '#f8fafc') : cellStyle.backgroundColor,
                                          opacity: cellStyle.opacity ? cellStyle.opacity / 100 : 1,
                                          fontWeight: cellStyle.fontWeight || 'normal',
                                          height: `${rowHeight}px`,
                                          maxHeight: `${rowHeight}px`,
                                          overflow: 'hidden',
                                          position: colIndex === 0 ? 'sticky' : 'relative',
                                          right: colIndex === 0 ? '48px' : undefined,
                                          zIndex: colIndex === 0 ? 10 : 1
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
                                  <td className="border border-slate-200 p-2 bg-white" style={{ height: `${rowHeight}px` }}>
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
                              )}
                            </Draggable>
                          );
                        })
                      )}
                      {provided.placeholder}
                    </tbody>
                  )}
                </Droppable>
              </table>
            </DragDropContext>
          </div>
        </CardContent>

        <div className="px-6 py-3 border-t bg-slate-50 text-xs text-slate-600 flex items-center justify-between">
          <div>
            {filteredAndSortedData.length} מתוך {rowsData.length} שורות • {visibleColumns.length} עמודות גלויות • {Object.keys(cellStyles).length} תאים מעוצבים
          </div>
          <div className="flex items-center gap-3">
            {hasActiveFilters && (
              <div className="flex items-center gap-2 text-blue-600">
                <Filter className="w-3 h-3" />
                <span>סינון פעיל</span>
              </div>
            )}
            {(canUndo || canRedo) && (
              <div className="flex items-center gap-2 text-slate-500">
                <span>{historyIndex + 1}/{history.length}</span>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* דיאלוג ייבוא CSV */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <Upload className="w-6 h-6" />
              ייבוא מקובץ CSV
            </DialogTitle>
          </DialogHeader>

          {importPreview && (
            <div className="space-y-4 mt-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-bold text-blue-900 mb-2">תצוגה מקדימה</h4>
                <p className="text-sm text-blue-700">
                  נמצאו <strong>{importPreview.totalRows}</strong> שורות ו-<strong>{importPreview.columns.length}</strong> עמודות
                </p>
              </div>

              <div className="border rounded-lg overflow-auto max-h-96">
                <table className="w-full border-collapse" dir="rtl">
                  <thead className="bg-slate-100">
                    <tr>
                      {importPreview.columns.map(col => (
                        <th key={col.key} className="border p-2 text-right font-semibold">
                          {col.title}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {importPreview.rows.map((row, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                        {importPreview.columns.map(col => (
                          <td key={col.key} className="border p-2 text-sm">
                            {row[col.key]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">
                  ⚠️ <strong>שים לב:</strong> הפעולה תחליף את כל הנתונים הקיימים בטבלה!
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowImportDialog(false);
                setImportFile(null);
                setImportPreview(null);
              }}
            >
              ביטול
            </Button>
            <Button 
              onClick={confirmImport}
              className="bg-blue-600 hover:bg-blue-700"
            >
              אישור ייבוא
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* דיאלוג סינון מתקדם */}
      <Dialog open={showFilterDialog} onOpenChange={setShowFilterDialog}>
        <DialogContent className="max-w-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <Filter className="w-6 h-6" />
              סינון וחיפוש מתקדם
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            {/* חיפוש גלובלי */}
            <div className="space-y-2">
              <h3 className="font-bold flex items-center gap-2">
                <Search className="w-5 h-5" />
                חיפוש גלובלי
              </h3>
              <Input
                placeholder="חפש בכל העמודות..."
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="text-lg"
              />
            </div>

            <Separator />

            {/* מיון */}
            <div className="space-y-2">
              <h3 className="font-bold flex items-center gap-2">
                <ArrowUpDown className="w-5 h-5" />
                מיון
              </h3>
              <div className="flex gap-3">
                <Select value={sortColumn || ''} onValueChange={(val) => {
                  if (val) {
                    setSortColumn(val);
                  } else {
                    setSortColumn(null);
                  }
                }}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="בחר עמודה למיון" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>ללא מיון</SelectItem>
                    {columns.map(col => (
                      <SelectItem key={col.key} value={col.key}>
                        {col.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {sortColumn && (
                  <Select value={sortDirection} onValueChange={setSortDirection}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asc">
                        <div className="flex items-center gap-2">
                          <ArrowUp className="w-4 h-4" />
                          עולה (א-ת, 0-9)
                        </div>
                      </SelectItem>
                      <SelectItem value="desc">
                        <div className="flex items-center gap-2">
                          <ArrowDown className="w-4 h-4" />
                          יורד (ת-א, 9-0)
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            <Separator />

            {/* סינון לפי עמודות */}
            <div className="space-y-3">
              <h3 className="font-bold flex items-center gap-2">
                <Filter className="w-5 h-5" />
                סינון לפי עמודות
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                {columns.map(col => (
                  <div key={col.key} className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">
                      {col.title}
                    </label>
                    <Input
                      placeholder={`סנן לפי ${col.title}...`}
                      value={columnFilters[col.key] || ''}
                      onChange={(e) => updateColumnFilter(col.key, e.target.value)}
                      className="h-9"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* תוצאות */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <span className="font-bold text-blue-900">{filteredAndSortedData.length}</span>
                  <span className="text-blue-700"> מתוך </span>
                  <span className="font-bold text-blue-900">{rowsData.length}</span>
                  <span className="text-blue-700"> שורות</span>
                </div>
                {hasActiveFilters && (
                  <Button size="sm" variant="outline" onClick={clearAllFilters}>
                    <XCircle className="w-4 h-4 ml-2" />
                    נקה הכל
                  </Button>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button onClick={() => setShowFilterDialog(false)} className="w-full">
              סגור
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-5 h-5" />
                  <div className="text-right">
                    <div className="font-semibold">ייבא מקובץ CSV</div>
                    <div className="text-xs text-slate-500">טען נתונים מאקסל</div>
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

                <Button 
                  variant="outline" 
                  className="justify-start gap-2 h-auto py-3"
                  disabled={!canUndo}
                  onClick={handleUndo}
                >
                  <Undo className="w-5 h-5" />
                  <div className="text-right">
                    <div className="font-semibold">בטל פעולה אחרונה</div>
                    <div className="text-xs text-slate-500">Ctrl+Z</div>
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
              
              {/* היסטוריה */}
              <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-lg p-4">
                <h4 className="font-bold text-orange-900 mb-2 flex items-center gap-2">
                  <Undo className="w-4 h-4" />
                  היסטוריית שינויים
                </h4>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-orange-700">
                    מיקום נוכחי: <strong>{historyIndex + 1}</strong> מתוך <strong>{history.length}</strong>
                  </span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" disabled={!canUndo} onClick={handleUndo}>
                      <Undo className="w-3 h-3 ml-1" />
                      בטל
                    </Button>
                    <Button size="sm" variant="outline" disabled={!canRedo} onClick={handleRedo}>
                      <Redo className="w-3 h-3 ml-1" />
                      שחזר
                    </Button>
                  </div>
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
                <li>• <kbd className="px-2 py-1 bg-white rounded text-xs">חץ בכותרת</kbd> = מיון מהיר</li>
                <li>• <kbd className="px-2 py-1 bg-white rounded text-xs">Ctrl+Click</kbd> על כותרת = תפריט עמודה</li>
                <li>• <kbd className="px-2 py-1 bg-white rounded text-xs">Ctrl+Z</kbd> = בטל פעולה</li>
                <li>• <kbd className="px-2 py-1 bg-white rounded text-xs">Ctrl+Y</kbd> = שחזר פעולה</li>
                <li>• <kbd className="px-2 py-1 bg-white rounded text-xs">גרור ידית ≡</kbd> = שנה סדר שורות</li>
                <li>• <kbd className="px-2 py-1 bg-white rounded text-xs">גרור קו בין עמודות</kbd> = שנה רוחב (העבר עכבר בין הכותרות)</li>
                <li>• <kbd className="px-2 py-1 bg-white rounded text-xs">גרור קו מתחת לידית ≡</kbd> = שנה גובה שורה</li>
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