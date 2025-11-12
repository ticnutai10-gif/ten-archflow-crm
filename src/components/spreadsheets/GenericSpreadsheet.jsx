import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Table, Copy, Settings, Palette, Eye, EyeOff, Edit2, X, Download, Upload, Grid, List, Search, Filter, ArrowUp, ArrowDown, ArrowUpDown, XCircle, Undo, Redo, GripVertical, BarChart3, TrendingUp, Calculator, Layers, Save, Bookmark } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import ThemeSelector, { COLOR_PALETTES, BORDER_STYLES, FONT_OPTIONS } from "./ThemeSelector";
import ViewManager from "./ViewManager";

export default function GenericSpreadsheet({ spreadsheet, onUpdate, fullScreenMode = false }) {
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
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnFilters, setColumnFilters] = useState({});
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isUndoRedoAction, setIsUndoRedoAction] = useState(false);
  const [resizingColumn, setResizingColumn] = useState(null);
  const [resizingRow, setResizingRow] = useState(null);
  const [rowHeights, setRowHeights] = useState({});
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importPreview, setImportPreview] = useState(null);
  const fileInputRef = useRef(null);
  const [validationRules, setValidationRules] = useState([]);
  const [conditionalFormats, setConditionalFormats] = useState([]);
  const [showValidationDialog, setShowValidationDialog] = useState(false);
  const [showConditionalDialog, setShowConditionalDialog] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [freezeSettings, setFreezeSettings] = useState({ freeze_rows: 0, freeze_columns: 1 });
  const [showFreezeDialog, setShowFreezeDialog] = useState(false);
  const [customCellTypes, setCustomCellTypes] = useState([]);
  const [showCellTypesDialog, setShowCellTypesDialog] = useState(false);
  const [showFindReplaceDialog, setShowFindReplaceDialog] = useState(false);
  const [findText, setFindText] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [mergedCells, setMergedCells] = useState({});
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [showTemplatesDialog, setShowTemplatesDialog] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [isDraggingSelection, setIsDraggingSelection] = useState(false);
  const [dragStartCell, setDragStartCell] = useState(null);
  const [copiedCells, setCopiedCells] = useState(null);
  const [showColumnStats, setShowColumnStats] = useState(false);
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const [themeSettings, setThemeSettings] = useState(null);
  const [showViewManager, setShowViewManager] = useState(false);
  const [savedViews, setSavedViews] = useState([]);
  const [activeViewId, setActiveViewId] = useState(null);
  
  const editInputRef = useRef(null);
  const columnEditRef = useRef(null);
  const tableRef = useRef(null);

  useEffect(() => {
    if (spreadsheet) {
      const initialColumns = spreadsheet.columns || [];
      const initialRows = spreadsheet.rows_data || [];
      const initialStyles = spreadsheet.cell_styles || {};
      
      console.log('📊 [SPREADSHEET] Loading spreadsheet data:', {
        id: spreadsheet.id,
        name: spreadsheet.name,
        theme_settings: spreadsheet.theme_settings
      });
      
      setColumns(initialColumns);
      setRowsData(initialRows);
      setCellStyles(initialStyles);
      setRowHeights(spreadsheet.row_heights || {});
      setValidationRules(spreadsheet.validation_rules || []);
      setConditionalFormats(spreadsheet.conditional_formats || []);
      setFreezeSettings(spreadsheet.freeze_settings || { freeze_rows: 0, freeze_columns: 1 });
      setCustomCellTypes(spreadsheet.custom_cell_types || []);
      setMergedCells(spreadsheet.merged_cells || {});
      
      const loadedTheme = spreadsheet.theme_settings || {
        palette: "default",
        borderStyle: "thin",
        headerFont: "default",
        cellFont: "default",
        fontSize: "medium",
        density: "comfortable",
        borderRadius: "none",
        shadow: "none",
        cellSpacing: "none",
        hoverEffect: "subtle",
        customColors: null
      };
      
      console.log('🎨 [THEME] Loaded theme settings:', loadedTheme);
      setThemeSettings(loadedTheme);
      
      setSavedViews(spreadsheet.saved_views || []);
      setActiveViewId(spreadsheet.active_view_id || null);
      
      setHistory([{ columns: initialColumns, rows: initialRows, styles: initialStyles }]);
      setHistoryIndex(0);
    }
  }, [spreadsheet]);

  const saveToHistory = useCallback((cols, rows, styles) => {
    if (isUndoRedoAction) return;
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push({ columns: cols, rows: rows, styles: styles });
      if (newHistory.length > 50) newHistory.shift();
      return newHistory;
    });
    setHistoryIndex(prev => Math.min(prev + 1, 49));
  }, [historyIndex, isUndoRedoAction]);

  const handleUndo = useCallback(() => {
    if (historyIndex <= 0) { toast.error('אין מה לבטל'); return; }
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

  const handleRedo = useCallback(() => {
    if (historyIndex >= history.length - 1) { toast.error('אין מה לשחזר'); return; }
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

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); handleUndo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); handleRedo(); }
      
      // Copy (Ctrl+C)
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && selectedCells.size > 0) {
        e.preventDefault();
        const cellsData = Array.from(selectedCells).map(cellKey => {
          const [rowId, colKey] = cellKey.split('_');
          const row = rowsData.find(r => r.id === rowId);
          return { cellKey, value: row?.[colKey] || '' };
        });
        setCopiedCells(cellsData);
        toast.success(`✓ הועתקו ${cellsData.length} תאים`);
      }
      
      // Paste (Ctrl+V)
      if ((e.ctrlKey || e.metaKey) && e.key === 'v' && copiedCells && selectedCells.size > 0) {
        e.preventDefault();
        const targetCell = Array.from(selectedCells)[0];
        const [targetRowId, targetColKey] = targetCell.split('_');
        
        const updatedRows = [...rowsData];
        copiedCells.forEach((copiedCell, idx) => {
          if (idx < selectedCells.size) {
            const cellKey = Array.from(selectedCells)[idx];
            const [rowId, colKey] = cellKey.split('_');
            const rowIndex = updatedRows.findIndex(r => r.id === rowId);
            if (rowIndex >= 0) {
              updatedRows[rowIndex] = { ...updatedRows[rowIndex], [colKey]: copiedCell.value };
            }
          }
        });
        
        setRowsData(updatedRows);
        saveToHistory(columns, updatedRows, cellStyles);
        saveToBackend(columns, updatedRows, cellStyles);
        toast.success(`✓ הודבקו ${Math.min(copiedCells.length, selectedCells.size)} תאים`);
      }
      
      // Delete (Delete key)
      if (e.key === 'Delete' && selectedCells.size > 0 && !editingCell) {
        e.preventDefault();
        const updatedRows = rowsData.map(row => {
          const newRow = { ...row };
          selectedCells.forEach(cellKey => {
            const [rowId, colKey] = cellKey.split('_');
            if (row.id === rowId) {
              newRow[colKey] = '';
            }
          });
          return newRow;
        });
        
        setRowsData(updatedRows);
        saveToHistory(columns, updatedRows, cellStyles);
        saveToBackend(columns, updatedRows, cellStyles);
        toast.success(`✓ נמחקו ${selectedCells.size} תאים`);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, selectedCells, copiedCells, rowsData, columns, cellStyles, editingCell]);

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImportFile(file);
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) { toast.error('הקובץ ריק או לא תקין'); return; }
    const headerLine = lines[0];
    const headers = headerLine.split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const rows = lines.slice(1).map((line, idx) => {
      const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      const rowData = { id: `imported_${Date.now()}_${idx}` };
      headers.forEach((header, i) => { rowData[`col${i}`] = values[i] || ''; });
      return rowData;
    });
    const importedColumns = headers.map((header, i) => ({
      key: `col${i}`, title: header, width: '150px', type: 'text', visible: true
    }));
    setImportPreview({ columns: importedColumns, rows: rows.slice(0, 5), totalRows: rows.length, allRows: rows });
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

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    if (result.type === 'column') {
      const reorderedColumns = Array.from(columns);
      const [movedColumn] = reorderedColumns.splice(result.source.index, 1);
      reorderedColumns.splice(result.destination.index, 0, movedColumn);
      setColumns(reorderedColumns);
      saveToHistory(reorderedColumns, rowsData, cellStyles);
      saveToBackend(reorderedColumns, rowsData, cellStyles);
      toast.success('✓ סדר העמודות עודכן');
      return;
    }
    const items = Array.from(filteredAndSortedData);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    const reorderedRowsData = [...rowsData];
    const sourceIndex = rowsData.findIndex(r => r.id === filteredAndSortedData[result.source.index].id);
    const destIndex = rowsData.findIndex(r => r.id === filteredAndSortedData[result.destination.index].id);
    const [movedRow] = reorderedRowsData.splice(sourceIndex, 1);
    reorderedRowsData.splice(destIndex, 0, movedRow);
    setRowsData(reorderedRowsData);
    saveToBackend(columns, reorderedRowsData, cellStyles);
    toast.success('✓ סדר השורות עודכן');
  };

  const handleSort = (columnKey) => {
    if (sortColumn === columnKey) {
      if (sortDirection === 'asc') setSortDirection('desc');
      else { setSortColumn(null); setSortDirection('asc'); }
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  const filteredAndSortedData = useMemo(() => {
    let result = [...rowsData];
    if (globalFilter) {
      const searchLower = globalFilter.toLowerCase();
      result = result.filter(row => columns.some(col => String(row[col.key] || '').toLowerCase().includes(searchLower)));
    }
    Object.entries(columnFilters).forEach(([columnKey, filterValue]) => {
      if (filterValue) {
        const searchLower = filterValue.toLowerCase();
        result = result.filter(row => String(row[columnKey] || '').toLowerCase().includes(searchLower));
      }
    });
    if (sortColumn) {
      result.sort((a, b) => {
        const aVal = a[sortColumn] || '';
        const bVal = b[sortColumn] || '';
        const aNum = Number(aVal);
        const bNum = Number(bVal);
        if (!isNaN(aNum) && !isNaN(bNum)) return sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
        const comparison = String(aVal).localeCompare(String(bVal), 'he');
        return sortDirection === 'asc' ? comparison : -comparison;
      });
    }
    return result;
  }, [rowsData, columns, sortColumn, sortDirection, globalFilter, columnFilters]);

  const updateColumnFilter = (columnKey, value) => {
    setColumnFilters(prev => {
      if (!value) { const { [columnKey]: removed, ...rest } = prev; return rest; }
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
    Object.keys(newStyles).forEach(key => { if (key.startsWith(`${rowId}_`)) delete newStyles[key]; });
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
    const newColumn = { key: `col${Date.now()}`, title: columnName, width: '150px', type: 'text', visible: true };
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
    const updatedRows = rowsData.map(row => { const { [columnKey]: removed, ...rest } = row; return rest; });
    setRowsData(updatedRows);
    const newStyles = { ...cellStyles };
    Object.keys(newStyles).forEach(key => { if (key.endsWith(`_${columnKey}`)) delete newStyles[key]; });
    setCellStyles(newStyles);
    saveToHistory(updated, updatedRows, newStyles);
    await saveToBackend(updated, updatedRows, newStyles);
    toast.success('✓ עמודה נמחקה');
  };

  const toggleColumnVisibility = async (columnKey) => {
    const updated = columns.map(col => col.key === columnKey ? { ...col, visible: !col.visible } : col);
    setColumns(updated);
    await saveToBackend(updated, rowsData, cellStyles);
    toast.success('✓ נראות עמודה שונתה');
  };

  const renameColumn = async (columnKey, newTitle) => {
    if (!newTitle.trim()) return;
    const updated = columns.map(col => col.key === columnKey ? { ...col, title: newTitle.trim() } : col);
    setColumns(updated);
    saveToHistory(updated, rowsData, cellStyles);
    await saveToBackend(updated, rowsData, cellStyles);
    toast.success('✓ שם עמודה עודכן');
  };

  const changeColumnType = async (columnKey, newType) => {
    const updated = columns.map(col => col.key === columnKey ? { ...col, type: newType } : col);
    setColumns(updated);
    await saveToBackend(updated, rowsData, cellStyles);
    toast.success('✓ סוג עמודה עודכן');
  };

  const changeColumnWidth = async (columnKey, newWidth) => {
    const updated = columns.map(col => col.key === columnKey ? { ...col, width: newWidth } : col);
    setColumns(updated);
    await saveToBackend(updated, rowsData, cellStyles);
  };

  const resizeStartRef = useRef(null);
  
  const handleColumnResizeStart = (e, columnKey) => {
    e.preventDefault();
    e.stopPropagation();
    const column = columns.find(c => c.key === columnKey);
    const currentWidth = parseInt(column.width) || 150;
    resizeStartRef.current = { type: 'column', key: columnKey, startX: e.clientX, startWidth: currentWidth };
    setResizingColumn(columnKey);
  };

  const handleRowResizeStart = (e, rowId) => {
    e.preventDefault();
    e.stopPropagation();
    const currentHeight = rowHeights[rowId] || 40;
    resizeStartRef.current = { type: 'row', id: rowId, startY: e.clientY, startHeight: currentHeight };
    setResizingRow(rowId);
  };

  useEffect(() => {
    if (!resizingColumn && !resizingRow) return;
    const handleMouseMove = (e) => {
      e.preventDefault();
      if (!resizeStartRef.current) return;
      if (resizeStartRef.current.type === 'column') {
        const diff = e.clientX - resizeStartRef.current.startX;
        const newWidth = Math.max(50, resizeStartRef.current.startWidth + diff);
        const updated = columns.map(col => col.key === resizeStartRef.current.key ? { ...col, width: `${newWidth}px` } : col);
        setColumns(updated);
      }
      if (resizeStartRef.current.type === 'row') {
        const diff = e.clientY - resizeStartRef.current.startY;
        const newHeight = Math.max(30, resizeStartRef.current.startHeight + diff);
        setRowHeights(prev => ({ ...prev, [resizeStartRef.current.id]: newHeight }));
      }
    };
    const handleMouseUp = (e) => {
      e.preventDefault();
      if (resizingColumn || resizingRow) {
        saveToBackend(columns, rowsData, cellStyles);
        setResizingColumn(null);
        setResizingRow(null);
        resizeStartRef.current = null;
        toast.success('✓ גודל עודכן');
      }
    };
    window.addEventListener('mousemove', handleMouseMove, { capture: true });
    window.addEventListener('mouseup', handleMouseUp, { capture: true });
    document.body.style.userSelect = 'none';
    document.body.style.cursor = resizingColumn ? 'col-resize' : 'row-resize';
    return () => {
      window.removeEventListener('mousemove', handleMouseMove, { capture: true });
      window.removeEventListener('mouseup', handleMouseUp, { capture: true });
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [resizingColumn, resizingRow, columns, rowHeights]);

  const applyCellStyle = (cellKey, style) => {
    const newStyles = { ...cellStyles, [cellKey]: style };
    setCellStyles(newStyles);
    saveToHistory(columns, rowsData, newStyles);
    saveToBackend(columns, rowsData, newStyles);
    toast.success('✓ סגנון הותקן');
  };

  const applyStyleToSelection = (style) => {
    const newStyles = { ...cellStyles };
    selectedCells.forEach(cellKey => { newStyles[cellKey] = style; });
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

  const exportToPDF = () => {
    const printWindow = window.open('', '_blank');
    const visibleCols = columns.filter(col => col.visible !== false);
    const html = `<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"><title>${spreadsheet.name}</title><style>body{font-family:Arial,sans-serif;direction:rtl;padding:20px}h1{text-align:center;margin-bottom:20px}table{width:100%;border-collapse:collapse;margin:20px 0}th,td{border:1px solid #ccc;padding:8px;text-align:right}th{background-color:#f1f5f9;font-weight:bold}tr:nth-child(even){background-color:#f8fafc}.footer{text-align:center;margin-top:30px;font-size:12px;color:#666}</style></head><body><h1>${spreadsheet.name}</h1><p style="text-align:center;color:#666;margin-bottom:20px">נוצר ב-${new Date().toLocaleDateString('he-IL')} | ${filteredAndSortedData.length} שורות</p><table><thead><tr>${visibleCols.map(col => `<th>${col.title}</th>`).join('')}</tr></thead><tbody>${filteredAndSortedData.map(row => `<tr>${visibleCols.map(col => {
      const cellKey = `${row.id}_${col.key}`;
      const cellStyle = cellStyles[cellKey] || {};
      const conditionalStyle = getConditionalStyle(col.key, row[col.key]);
      const mergedStyle = { ...conditionalStyle, ...cellStyle };
      return `<td style="${mergedStyle.backgroundColor ? `background-color:${mergedStyle.backgroundColor};` : ''}${mergedStyle.color ? `color:${mergedStyle.color};` : ''}${mergedStyle.fontWeight ? `font-weight:${mergedStyle.fontWeight};` : ''}${mergedStyle.opacity ? `opacity:${mergedStyle.opacity / 100};` : ''}">${row[col.key] || ''}</td>`;
    }).join('')}</tr>`).join('')}</tbody></table><div class="footer">${spreadsheet.description || ''}</div></body></html>`;
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); toast.success('✓ מוכן להדפסה/שמירה כ-PDF'); }, 250);
  };

  const applyTemplate = (template) => {
    const newColumns = template.columns.map((col, idx) => ({ ...col, key: `col${Date.now()}_${idx}` }));
    const newRows = template.sampleData.map((rowData, idx) => ({ id: `row_${Date.now()}_${idx}`, ...rowData }));
    setColumns(newColumns);
    setRowsData(newRows);
    setCellStyles({});
    saveToHistory(newColumns, newRows, {});
    saveToBackend(newColumns, newRows, {});
    setShowTemplatesDialog(false);
    toast.success('✓ תבנית הוחלה בהצלחה');
  };

  const handleFindReplace = (replaceAll = false) => {
    if (!findText) { toast.error('הזן טקסט לחיפוש'); return; }
    let replacedCount = 0;
    const updatedRows = rowsData.map(row => {
      const newRow = { ...row };
      columns.forEach(col => {
        const cellValue = String(row[col.key] || '');
        const searchValue = caseSensitive ? findText : findText.toLowerCase();
        const compareValue = caseSensitive ? cellValue : cellValue.toLowerCase();
        if (replaceAll ? compareValue.includes(searchValue) : compareValue === searchValue) {
          if (replaceAll) newRow[col.key] = caseSensitive ? cellValue.replaceAll(findText, replaceText) : cellValue.replace(new RegExp(findText, 'gi'), replaceText);
          else newRow[col.key] = replaceText;
          replacedCount++;
        }
      });
      return newRow;
    });
    if (replacedCount > 0) {
      setRowsData(updatedRows);
      saveToHistory(columns, updatedRows, cellStyles);
      saveToBackend(columns, updatedRows, cellStyles);
      toast.success(`✓ ${replacedCount} תאים עודכנו`);
    } else toast.error('לא נמצאו תוצאות');
  };

  const getAutoCompleteSuggestions = (columnKey) => {
    const values = new Set();
    rowsData.forEach(row => {
      const val = row[columnKey];
      if (val && String(val).trim()) values.add(String(val).trim());
    });
    return Array.from(values).sort();
  };

  const mergeCells = () => {
    if (selectedCells.size < 2) { toast.error('בחר לפחות 2 תאים למיזוג'); return; }
    const cellsArray = Array.from(selectedCells);
    const mergeKey = cellsArray.sort().join('|');
    setMergedCells(prev => ({ ...prev, [mergeKey]: cellsArray }));
    toast.success(`✓ ${cellsArray.length} תאים אוחדו`);
    setSelectedCells(new Set());
    saveToBackend(columns, rowsData, cellStyles);
  };

  const unmergeCells = (mergeKey) => {
    setMergedCells(prev => { const { [mergeKey]: removed, ...rest } = prev; return rest; });
    toast.success('✓ תאים הופרדו');
    saveToBackend(columns, rowsData, cellStyles);
  };

  const handleCellMouseDown = (rowId, columnKey, event) => {
    if (event?.shiftKey) {
      event.preventDefault();
      const cellKey = `${rowId}_${columnKey}`;
      setIsDraggingSelection(true);
      setDragStartCell(cellKey);
      setSelectedCells(new Set([cellKey]));
      return;
    }
  };

  const handleCellMouseEnter = (rowId, columnKey) => {
    if (!isDraggingSelection || !dragStartCell) return;
    const cellKey = `${rowId}_${columnKey}`;
    const startParts = dragStartCell.split('_');
    const startRowId = startParts[0];
    const startColKey = startParts[1];
    const startRowIndex = filteredAndSortedData.findIndex(r => r.id === startRowId);
    const endRowIndex = filteredAndSortedData.findIndex(r => r.id === rowId);
    const startColIndex = visibleColumns.findIndex(c => c.key === startColKey);
    const endColIndex = visibleColumns.findIndex(c => c.key === columnKey);
    const minRow = Math.min(startRowIndex, endRowIndex);
    const maxRow = Math.max(startRowIndex, endRowIndex);
    const minCol = Math.min(startColIndex, endColIndex);
    const maxCol = Math.max(startColIndex, endColIndex);
    const newSelected = new Set();
    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        const row = filteredAndSortedData[r];
        const col = visibleColumns[c];
        if (row && col) newSelected.add(`${row.id}_${col.key}`);
      }
    }
    setSelectedCells(newSelected);
  };

  useEffect(() => {
    const handleMouseUp = () => {
      if (isDraggingSelection) {
        setIsDraggingSelection(false);
        setDragStartCell(null);
      }
    };
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, [isDraggingSelection]);

  const handleCheckmarkClick = async (rowId, columnKey, event) => {
    if (event?.altKey || event?.ctrlKey || event?.metaKey) return;
    event.preventDefault();
    const row = rowsData.find(r => r.id === rowId);
    if (!row) return;
    const currentValue = row[columnKey];
    let nextValue = '';
    if (currentValue === '✓') nextValue = '✗';
    else if (currentValue === '✗') nextValue = '';
    else nextValue = '✓';
    const updatedRows = rowsData.map(r => r.id === rowId ? { ...r, [columnKey]: nextValue } : r);
    setRowsData(updatedRows);
    saveToHistory(columns, updatedRows, cellStyles);
    await saveToBackend(columns, updatedRows, cellStyles);
  };

  const handleCellClick = (rowId, columnKey, event) => {
    if (event?.altKey) {
      event.preventDefault();
      const cellKey = `${rowId}_${columnKey}`;
      setSelectedCells(prev => {
        const newSet = new Set(prev);
        if (newSet.has(cellKey)) newSet.delete(cellKey);
        else newSet.add(cellKey);
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
    setEditingCell(`${rowId}_${columnKey}`);
    setEditValue(String(currentValue));
    setTimeout(() => editInputRef.current?.focus(), 0);
  };

  const handleColumnHeaderClick = (columnKey, event) => {
    if (event?.shiftKey) { event.preventDefault(); handleSort(columnKey); return; }
    if (event?.ctrlKey || event?.metaKey) { event.preventDefault(); setPopoverOpen(`header_${columnKey}`); return; }
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

  const validateCell = (columnKey, value) => {
    const rules = validationRules.filter(r => r.column_key === columnKey);
    for (const rule of rules) {
      if (rule.rule_type === 'number_range') {
        const num = Number(value);
        if (isNaN(num)) return rule.error_message || 'חייב להיות מספר';
        if (rule.params.min !== undefined && num < rule.params.min) return rule.error_message || `ערך מינימלי: ${rule.params.min}`;
        if (rule.params.max !== undefined && num > rule.params.max) return rule.error_message || `ערך מקסימלי: ${rule.params.max}`;
      }
      if (rule.rule_type === 'text_length') {
        const len = String(value).length;
        if (rule.params.min && len < rule.params.min) return rule.error_message || `אורך מינימלי: ${rule.params.min} תווים`;
        if (rule.params.max && len > rule.params.max) return rule.error_message || `אורך מקסימלי: ${rule.params.max} תווים`;
      }
      if (rule.rule_type === 'regex' && rule.params.pattern) {
        const regex = new RegExp(rule.params.pattern);
        if (!regex.test(value)) return rule.error_message || 'פורמט לא תקין';
      }
      if (rule.rule_type === 'custom_list' && rule.params.allowed_values) {
        if (!rule.params.allowed_values.includes(value)) return rule.error_message || `ערכים מותרים: ${rule.params.allowed_values.join(', ')}`;
      }
      if (rule.rule_type === 'date_range') {
        const date = new Date(value);
        if (isNaN(date.getTime())) return rule.error_message || 'תאריך לא תקין';
        if (rule.params.min_date && date < new Date(rule.params.min_date)) return rule.error_message || `תאריך מינימלי: ${rule.params.min_date}`;
        if (rule.params.max_date && date > new Date(rule.params.max_date)) return rule.error_message || `תאריך מקסימלי: ${rule.params.max_date}`;
      }
    }
    return null;
  };

  const saveEdit = async () => {
    if (!editingCell) return;
    const lastUnderscoreIndex = editingCell.lastIndexOf('_');
    const rowId = editingCell.substring(0, lastUnderscoreIndex);
    const columnKey = editingCell.substring(lastUnderscoreIndex + 1);
    const validationError = validateCell(columnKey, editValue);
    if (validationError) {
      setValidationErrors(prev => ({ ...prev, [editingCell]: validationError }));
      toast.error(validationError);
      return;
    }
    setValidationErrors(prev => { const { [editingCell]: removed, ...rest } = prev; return rest; });
    const updatedRows = rowsData.map(row => row.id === rowId ? { ...row, [columnKey]: editValue } : row);
    setRowsData(updatedRows);
    setEditingCell(null);
    setEditValue("");
    saveToHistory(columns, updatedRows, cellStyles);
    await saveToBackend(columns, updatedRows, cellStyles);
    toast.success('✓ התא נשמר');
  };

  const getConditionalStyle = (columnKey, value) => {
    const formats = conditionalFormats.filter(f => f.active !== false && f.column_key === columnKey);
    for (const format of formats) {
      let matches = false;
      if (format.condition_type === 'equals') matches = String(value) === String(format.condition_value);
      else if (format.condition_type === 'contains') matches = String(value).toLowerCase().includes(String(format.condition_value).toLowerCase());
      else if (format.condition_type === 'greater_than') matches = Number(value) > Number(format.condition_value);
      else if (format.condition_type === 'less_than') matches = Number(value) < Number(format.condition_value);
      else if (format.condition_type === 'between') {
        const num = Number(value);
        matches = num >= Number(format.condition_value) && num <= Number(format.condition_value2);
      }
      if (matches && format.style) return format.style;
    }
    return {};
  };

  const saveToBackend = async (cols, rows, styles) => {
    if (!spreadsheet?.id) return;
    try {
      const payload = {
        columns: cols, 
        rows_data: rows, 
        cell_styles: styles, 
        row_heights: rowHeights,
        validation_rules: validationRules, 
        conditional_formats: conditionalFormats,
        freeze_settings: freezeSettings, 
        custom_cell_types: customCellTypes, 
        merged_cells: mergedCells,
        theme_settings: themeSettings, 
        saved_views: savedViews, 
        active_view_id: activeViewId
      };
      
      console.log('💾 [SAVE] Saving to backend, theme_settings:', themeSettings);
      console.log('💾 [SAVE] theme_settings.customColors:', themeSettings?.customColors);
      
      await base44.entities.CustomSpreadsheet.update(spreadsheet.id, payload);
      
      console.log('✅ [SAVE] Data saved successfully');
      
      if (onUpdate) await onUpdate();
    } catch (error) {
      console.error('❌ Save error:', error);
      toast.error('שגיאה בשמירה');
    }
  };

  const handleThemeApply = async (newTheme) => {
    console.log('🎨 [THEME] Applying new theme:', newTheme);
    console.log('🎨 [THEME] newTheme.customColors:', newTheme.customColors);
    
    setThemeSettings(newTheme);
    
    try {
      const updatePayload = {
        theme_settings: newTheme
      };
      
      console.log('📤 [THEME] Sending to backend:', JSON.stringify(updatePayload, null, 2));
      
      await base44.entities.CustomSpreadsheet.update(spreadsheet.id, updatePayload);
      
      console.log('✅ [THEME] Theme saved to backend successfully');
      
      // וידוא - קרא את הנתונים מהשרת
      const verifyData = await base44.entities.CustomSpreadsheet.get(spreadsheet.id);
      console.log('🔍 [THEME] Verification - data from server:', verifyData.theme_settings);
      console.log('🔍 [THEME] Verification - customColors exists?', !!verifyData.theme_settings?.customColors);
      
      if (verifyData.theme_settings?.customColors) {
        console.log('✅ [THEME] customColors saved correctly!', verifyData.theme_settings.customColors);
      } else {
        console.error('❌ [THEME] customColors NOT saved! Server returned:', verifyData.theme_settings);
      }
      
      toast.success('✓ עיצוב נשמר בהצלחה');
      
      if (onUpdate) await onUpdate();
    } catch (error) {
      console.error('❌ [THEME] Error saving theme:', error);
      toast.error('שגיאה בשמירת עיצוב: ' + error.message);
    }
  };

  const handleSaveView = async (view) => {
    const existingIndex = savedViews.findIndex(v => v.id === view.id);
    let updatedViews;
    
    if (existingIndex >= 0) {
      // עדכון תצוגה קיימת
      updatedViews = [...savedViews];
      updatedViews[existingIndex] = view;
    } else {
      // הוספת תצוגה חדשה
      updatedViews = [...savedViews, view];
    }
    
    setSavedViews(updatedViews);
    setActiveViewId(view.id);
    
    await base44.entities.CustomSpreadsheet.update(spreadsheet.id, {
      saved_views: updatedViews,
      active_view_id: view.id
    });
    
    if (onUpdate) await onUpdate();
  };

  const handleLoadView = async (view) => {
    // יצירת מפה של העמודות הנוכחיות לפי key
    const columnMap = new Map(columns.map(col => [col.key, col]));
    
    // יצירת מערך עמודות חדש לפי התצוגה
    const newColumns = view.columns
      .sort((a, b) => a.order - b.order)
      .map(viewCol => {
        const existingCol = columnMap.get(viewCol.key);
        if (!existingCol) return null;
        
        return {
          ...existingCol,
          visible: viewCol.visible,
          width: viewCol.width
        };
      })
      .filter(Boolean);
    
    // הוספת עמודות שלא היו בתצוגה (במקרה של עמודות חדשות שנוספו אחרי יצירת התצוגה)
    columns.forEach(col => {
      if (!view.columns.find(vc => vc.key === col.key)) {
        newColumns.push({ ...col, visible: false });
      }
    });
    
    setColumns(newColumns);
    setActiveViewId(view.id);
    saveToHistory(newColumns, rowsData, cellStyles);
    
    await base44.entities.CustomSpreadsheet.update(spreadsheet.id, {
      columns: newColumns,
      active_view_id: view.id
    });
    
    if (onUpdate) await onUpdate();
    toast.success(`✓ תצוגה "${view.name}" נטענה בהצלחה`);
  };

  const handleDeleteView = async (viewId) => {
    const updatedViews = savedViews.filter(v => v.id !== viewId);
    setSavedViews(updatedViews);
    
    // אם מחקנו את התצוגה הפעילה, נבטל את ה-active view
    if (activeViewId === viewId) {
      setActiveViewId(null);
    }
    
    await base44.entities.CustomSpreadsheet.update(spreadsheet.id, {
      saved_views: updatedViews,
      active_view_id: activeViewId === viewId ? null : activeViewId
    });
    
    if (onUpdate) await onUpdate();
  };

  const handleSetDefaultView = async (viewId) => {
    const updatedViews = savedViews.map(v => ({
      ...v,
      isDefault: v.id === viewId
    }));
    
    setSavedViews(updatedViews);
    
    await base44.entities.CustomSpreadsheet.update(spreadsheet.id, {
      saved_views: updatedViews
    });
    
    if (onUpdate) await onUpdate();
    toast.success('✓ ברירת המחדל עודכנה');
  };

  if (!spreadsheet) return <div className="p-6 text-center text-slate-500">לא נבחרה טבלה</div>;

  const visibleColumns = columns.filter(col => col.visible !== false);
  const hasActiveFilters = globalFilter || Object.keys(columnFilters).length > 0 || sortColumn;
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;
  
  // קבלת הגדרות עיצוב נוכחיות
  const currentTheme = themeSettings || {
    palette: "default",
    borderStyle: "thin",
    headerFont: "default",
    cellFont: "default",
    fontSize: "medium",
    density: "comfortable",
    borderRadius: "none",
    shadow: "none",
    cellSpacing: "none",
    hoverEffect: "subtle",
    customColors: null
  };
  
  console.log('🎨 [RENDER] Current theme being applied:', {
    currentTheme,
    hasCustomColors: !!currentTheme.customColors,
    palette: currentTheme.palette,
    borderRadius: currentTheme.borderRadius,
    shadow: currentTheme.shadow
  });
  
  const palette = currentTheme.customColors || COLOR_PALETTES[currentTheme.palette] || COLOR_PALETTES.default;
  const borderStyle = BORDER_STYLES[currentTheme.borderStyle] || BORDER_STYLES.thin;
  const headerFont = FONT_OPTIONS[currentTheme.headerFont] || FONT_OPTIONS.default;
  const cellFont = FONT_OPTIONS[currentTheme.cellFont] || FONT_OPTIONS.default;
  
  console.log('🎨 [RENDER] Computed palette:', palette);
  
  const headerFontSize = currentTheme.fontSize === 'small' ? '12px' : currentTheme.fontSize === 'large' ? '16px' : '14px';
  const cellFontSize = currentTheme.fontSize === 'small' ? '11px' : currentTheme.fontSize === 'large' ? '15px' : '13px';
  const cellPadding = currentTheme.density === 'compact' ? '4px 8px' : currentTheme.density === 'spacious' ? '12px 16px' : '8px 12px';
  
  // הגדרות נוספות
  const borderRadiusMap = {
    none: "0px",
    small: "4px",
    medium: "8px",
    large: "12px",
    xlarge: "16px"
  };
  
  const shadowMap = {
    none: "none",
    subtle: "0 1px 3px rgba(0,0,0,0.1)",
    medium: "0 4px 6px rgba(0,0,0,0.1)",
    strong: "0 10px 15px rgba(0,0,0,0.15)",
    glow: "0 0 10px rgba(147, 51, 234, 0.3)"
  };
  
  const cellSpacingMap = {
    none: "0px",
    small: "2px",
    medium: "4px",
    large: "8px"
  };
  
  const tableBorderRadius = borderRadiusMap[currentTheme.borderRadius] || "0px";
  const tableShadow = shadowMap[currentTheme.shadow] || "none";
  const tableCellSpacing = cellSpacingMap[currentTheme.cellSpacing] || "0px";
  const isSeparateBorders = currentTheme.cellSpacing !== 'none';
  
  // חישוב סטטיסטיקות עמודות
  const columnStats = useMemo(() => {
    const stats = {};
    visibleColumns.forEach(col => {
      if (col.type === 'number') {
        const values = filteredAndSortedData.map(row => Number(row[col.key])).filter(v => !isNaN(v));
        if (values.length > 0) {
          stats[col.key] = {
            sum: values.reduce((a, b) => a + b, 0),
            avg: values.reduce((a, b) => a + b, 0) / values.length,
            min: Math.min(...values),
            max: Math.max(...values),
            count: values.length
          };
        }
      }
    });
    return stats;
  }, [visibleColumns, filteredAndSortedData]);

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
              {hasActiveFilters && <Badge className="bg-blue-600 text-white"><Filter className="w-3 h-3 ml-1" />פעיל</Badge>}
              {activeViewId && savedViews.find(v => v.id === activeViewId) && (
                <Badge className="bg-indigo-100 text-indigo-800 border-indigo-300">
                  <Bookmark className="w-3 h-3 ml-1" />
                  {savedViews.find(v => v.id === activeViewId)?.name}
                </Badge>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button onClick={handleUndo} size="sm" variant="outline" disabled={!canUndo} title="בטל פעולה (Ctrl+Z)" className="gap-2 hover:bg-blue-50 transition-all"><Undo className="w-4 h-4" /></Button>
              <Button onClick={handleRedo} size="sm" variant="outline" disabled={!canRedo} title="שחזר פעולה (Ctrl+Y)" className="gap-2 hover:bg-blue-50 transition-all"><Redo className="w-4 h-4" /></Button>
              <Button onClick={() => setShowColumnStats(!showColumnStats)} size="sm" variant="outline" className="gap-2 hover:bg-purple-50 transition-all" title="הצג סטטיסטיקות">
                <BarChart3 className="w-4 h-4" />
                {showColumnStats ? 'הסתר סטטיסטיקות' : 'סטטיסטיקות'}
              </Button>
              <Button onClick={() => setShowThemeSelector(true)} size="sm" variant="outline" className="gap-2 hover:bg-pink-50 transition-all" title="עיצוב הטבלה">
                <Palette className="w-4 h-4" />
                עיצוב
              </Button>
              <Button onClick={() => setShowViewManager(true)} size="sm" variant="outline" className="gap-2 hover:bg-indigo-50 transition-all" title="ניהול תצוגות">
                <Layers className="w-4 h-4" />
                תצוגות
                {savedViews.length > 0 && (
                  <Badge variant="outline" className="mr-1 h-5 px-1.5 text-xs bg-indigo-50 text-indigo-700 border-indigo-300">
                    {savedViews.length}
                  </Badge>
                )}
              </Button>
              <Button onClick={addNewRow} size="sm" className="gap-2"><Plus className="w-4 h-4" />שורה</Button>
              <Button onClick={addColumn} size="sm" variant="outline" className="gap-2"><Plus className="w-4 h-4" />עמודה</Button>
              {selectedCells.size > 0 && (
                <>
                  <Badge variant="outline" className="bg-purple-50 px-3">נבחרו: {selectedCells.size}</Badge>
                  <Popover><PopoverTrigger asChild><Button size="sm" variant="outline" className="gap-2"><Palette className="w-4 h-4" />צבע</Button></PopoverTrigger><PopoverContent className="w-64"><ColorPicker onApply={applyStyleToSelection} /></PopoverContent></Popover>
                  {selectedCells.size >= 2 && <Button size="sm" variant="outline" onClick={mergeCells} className="gap-2"><Grid className="w-4 h-4" />מזג</Button>}
                  <Button size="sm" variant="ghost" onClick={() => setSelectedCells(new Set())} className="gap-2"><X className="w-4 h-4" /></Button>
                </>
              )}
              <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileSelect} className="hidden" />
              <Button onClick={() => fileInputRef.current?.click()} size="sm" variant="outline" className="gap-2"><Upload className="w-4 h-4" />ייבוא</Button>
              <Popover><PopoverTrigger asChild><Button size="sm" variant="outline" className="gap-2"><Download className="w-4 h-4" />ייצוא</Button></PopoverTrigger><PopoverContent className="w-48" align="end" dir="rtl"><div className="space-y-2"><Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={exportToCSV}><Download className="w-4 h-4" />ייצא ל-CSV</Button><Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={() => exportToPDF()}><Download className="w-4 h-4" />ייצא ל-PDF</Button><Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={() => setShowPrintPreview(true)}><Eye className="w-4 h-4" />תצוגת הדפסה</Button></div></PopoverContent></Popover>
              <Button onClick={() => setShowFilterDialog(true)} size="sm" variant={hasActiveFilters ? "default" : "outline"} className="gap-2"><Filter className="w-4 h-4" />סינון</Button>
              <Popover><PopoverTrigger asChild><Button size="sm" variant="outline" className="gap-2"><Settings className="w-4 h-4" />מתקדם</Button></PopoverTrigger><PopoverContent className="w-64" align="end" dir="rtl"><div className="space-y-2"><Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={() => setShowValidationDialog(true)}><Settings className="w-4 h-4" />כללי ולידציה ({validationRules.length})</Button><Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={() => setShowConditionalDialog(true)}><Palette className="w-4 h-4" />עיצוב מותנה ({conditionalFormats.length})</Button><Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={() => setShowFreezeDialog(true)}><Grid className="w-4 h-4" />הקפאת שורות/עמודות</Button><Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={() => setShowCellTypesDialog(true)}><Table className="w-4 h-4" />סוגי תאים מותאמים ({customCellTypes.length})</Button><Separator /><Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={() => setShowFindReplaceDialog(true)}><Search className="w-4 h-4" />חיפוש והחלפה</Button><Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={() => setShowTemplatesDialog(true)}><Table className="w-4 h-4" />תבניות מוכנות</Button><Separator /><Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={() => setShowSettingsDialog(true)}><Settings className="w-4 h-4" />הגדרות כלליות</Button></div></PopoverContent></Popover>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input placeholder="חיפוש מהיר בכל הטבלה..." value={globalFilter} onChange={(e) => setGlobalFilter(e.target.value)} className="pr-10" />
            </div>
            {hasActiveFilters && <Button size="sm" variant="ghost" onClick={clearAllFilters} className="gap-2"><XCircle className="w-4 h-4" />נקה</Button>}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {showColumnStats && Object.keys(columnStats).length > 0 && (
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-b-2 border-purple-200 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Calculator className="w-5 h-5 text-purple-600" />
                <h3 className="font-bold text-purple-900">סטטיסטיקות עמודות</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(columnStats).map(([colKey, stats]) => {
                  const col = visibleColumns.find(c => c.key === colKey);
                  return (
                    <div key={colKey} className="bg-white rounded-lg p-3 border border-purple-200 shadow-sm hover:shadow-md transition-all">
                      <div className="font-semibold text-sm text-slate-700 mb-2">{col?.title}</div>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between"><span className="text-slate-500">סכום:</span><span className="font-bold text-blue-600">{stats.sum.toFixed(2)}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">ממוצע:</span><span className="font-bold text-green-600">{stats.avg.toFixed(2)}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">מינימום:</span><span className="font-bold text-orange-600">{stats.min}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">מקסימום:</span><span className="font-bold text-red-600">{stats.max}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">כמות:</span><span className="font-bold text-purple-600">{stats.count}</span></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {copiedCells && (
            <div className="bg-green-50 border-b border-green-200 px-4 py-2 text-sm flex items-center gap-2">
              <Copy className="w-4 h-4 text-green-600" />
              <span className="text-green-800">הועתקו <strong>{copiedCells.length}</strong> תאים - לחץ Ctrl+V להדבקה</span>
              <button onClick={() => setCopiedCells(null)} className="mr-auto text-green-600 hover:text-green-800">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          
          <div className="overflow-auto" style={{ maxHeight: fullScreenMode ? '85vh' : '60vh', position: 'relative', overflowX: 'auto', overflowY: 'auto' }}>
            <DragDropContext onDragEnd={handleDragEnd}>
              <table ref={tableRef} className="w-full" dir="rtl" style={{ 
                position: 'relative',
                fontFamily: cellFont.value,
                borderCollapse: isSeparateBorders ? 'separate' : 'collapse',
                borderSpacing: isSeparateBorders ? tableCellSpacing : '0',
                borderRadius: tableBorderRadius,
                boxShadow: tableShadow,
                overflow: 'hidden'
              }}>
                <Droppable droppableId="spreadsheet-columns" direction="horizontal" type="column">
                  {(provided) => (
                    <thead style={{ 
                      position: 'sticky', 
                      top: 0, 
                      zIndex: 25,
                      backgroundColor: palette.headerBg
                    }} ref={provided.innerRef} {...provided.droppableProps}>
                      <tr>
                        <th className="p-3 w-12 sticky right-0 shadow-[2px_0_5px_rgba(0,0,0,0.1)] transition-all duration-200" style={{ 
                          zIndex: 35,
                          backgroundColor: palette.headerBg,
                          borderWidth: isSeparateBorders ? '0' : borderStyle.width,
                          borderStyle: borderStyle.style,
                          borderColor: palette.border,
                          borderRadius: isSeparateBorders ? tableBorderRadius : '0'
                        }}><GripVertical className="w-4 h-4 mx-auto" style={{ color: palette.headerText }} /></th>
                        {visibleColumns.map((col, colIndex) => {
                          const isEditing = editingColumnKey === col.key;
                          const isSorted = sortColumn === col.key;
                          const hasFilter = columnFilters[col.key];
                          return (
                            <Draggable key={col.key} draggableId={col.key} index={colIndex} type="column">
                              {(provided, snapshot) => (
                                <th ref={provided.innerRef} {...provided.draggableProps} className={`text-right font-semibold cursor-pointer group transition-all duration-200 ${snapshot.isDragging ? 'opacity-50 shadow-2xl z-50' : ''}`} style={{ 
                                  width: col.width, 
                                  minWidth: col.width, 
                                  maxWidth: col.width, 
                                  position: 'relative', 
                                  backgroundColor: snapshot.isDragging ? palette.hover : palette.headerBg,
                                  color: palette.headerText,
                                  fontFamily: headerFont.value,
                                  fontSize: headerFontSize,
                                  padding: cellPadding,
                                  borderWidth: isSeparateBorders ? '0' : borderStyle.width,
                                  borderStyle: borderStyle.style,
                                  borderColor: palette.border,
                                  borderRadius: isSeparateBorders ? tableBorderRadius : '0',
                                  zIndex: snapshot.isDragging ? 50 : 10, 
                                  overflow: editingColumnKey === col.key ? 'visible' : 'hidden', 
                                  ...provided.draggableProps.style 
                                }} onClick={(e) => !snapshot.isDragging && handleColumnHeaderClick(col.key, e)} onDoubleClick={(e) => {
                                  e.stopPropagation();
                                  // Auto-fit column width based on content
                                  const cells = filteredAndSortedData.map(row => String(row[col.key] || ''));
                                  const maxLength = Math.max(col.title.length, ...cells.map(c => c.length));
                                  const newWidth = Math.max(100, Math.min(400, maxLength * 8 + 40));
                                  changeColumnWidth(col.key, `${newWidth}px`);
                                  toast.success('✓ רוחב עמודה הותאם אוטומטית');
                                }}>
                                  {isEditing ? (
                                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                      <Input ref={columnEditRef} value={editingColumnTitle} onChange={(e) => setEditingColumnTitle(e.target.value)} onBlur={saveColumnTitle} onKeyDown={(e) => { if (e.key === 'Enter') saveColumnTitle(); if (e.key === 'Escape') { setEditingColumnKey(null); setEditingColumnTitle(""); } }} className="h-8 min-w-[200px]" style={{ width: 'auto', minWidth: '200px' }} autoFocus />
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing p-1 hover:bg-blue-100 rounded" title="גרור לשינוי סדר"><GripVertical className="w-4 h-4 text-slate-400" /></div>
                                        <span>{col.title}</span>
                                        {hasFilter && <Badge variant="outline" className="h-5 px-1 text-xs bg-blue-50"><Filter className="w-3 h-3" /></Badge>}
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); handleSort(col.key); }} title="מיין עמודה">{isSorted ? (sortDirection === 'asc' ? <ArrowUp className="w-4 h-4 text-blue-600" /> : <ArrowDown className="w-4 h-4 text-blue-600" />) : <ArrowUpDown className="w-4 h-4 text-slate-400" />}</Button>
                                        <Popover open={popoverOpen === `header_${col.key}`} onOpenChange={(open) => !open && setPopoverOpen(null)}><PopoverTrigger asChild><Button size="icon" variant="ghost" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); setPopoverOpen(`header_${col.key}`); }}><Settings className="w-3 h-3" /></Button></PopoverTrigger><PopoverContent className="w-56" align="start"><div className="space-y-2"><h4 className="font-semibold text-sm mb-3">{col.title}</h4><Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={() => { setEditingColumnKey(col.key); setEditingColumnTitle(col.title); setPopoverOpen(null); }}><Edit2 className="w-4 h-4" />שנה שם</Button><Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={() => { handleSort(col.key); setPopoverOpen(null); }}><ArrowUpDown className="w-4 h-4" />מיין עמודה</Button><Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={() => { toggleColumnVisibility(col.key); setPopoverOpen(null); }}>{col.visible !== false ? <><EyeOff className="w-4 h-4" />הסתר עמודה</> : <><Eye className="w-4 h-4" />הצג עמודה</>}</Button><Button variant="outline" size="sm" className="w-full justify-start gap-2 text-red-600" onClick={() => { deleteColumn(col.key); setPopoverOpen(null); }}><Trash2 className="w-4 h-4" />מחק עמודה</Button></div></PopoverContent></Popover>
                                      </div>
                                    </div>
                                  )}
                                  <div onMouseDown={(e) => handleColumnResizeStart(e, col.key)} className="absolute top-0 bottom-0 cursor-col-resize group/resizer transition-all" style={{ right: '-6px', width: '12px', zIndex: 999 }} title="גרור לשינוי רוחב (מינימום 50px)"><div className="absolute inset-y-0 right-1/2 -translate-x-1/2 transition-all" style={{ width: resizingColumn === col.key ? '4px' : '2px', backgroundColor: resizingColumn === col.key ? '#3b82f6' : '#cbd5e1', boxShadow: resizingColumn === col.key ? '0 0 8px rgba(59, 130, 246, 0.5)' : 'none' }} /><div className="absolute inset-0 group-hover/resizer:bg-blue-200/30" /></div>
                                </th>
                              )}
                            </Draggable>
                          );
                        })}
                        {provided.placeholder}
                        <th className="p-3 transition-all duration-200" style={{ 
                          width: '120px',
                          backgroundColor: palette.headerBg,
                          color: palette.headerText,
                          fontFamily: headerFont.value,
                          fontSize: headerFontSize,
                          borderWidth: isSeparateBorders ? '0' : borderStyle.width,
                          borderStyle: borderStyle.style,
                          borderColor: palette.border,
                          borderRadius: isSeparateBorders ? tableBorderRadius : '0'
                        }}>פעולות</th>
                      </tr>
                    </thead>
                  )}
                </Droppable>
                <Droppable droppableId="spreadsheet-rows">
                  {(provided) => (
                    <tbody ref={provided.innerRef} {...provided.droppableProps}>
                      {filteredAndSortedData.length === 0 ? (
                        <tr><td colSpan={visibleColumns.length + 2} className="text-center py-12 text-slate-500 border">{rowsData.length === 0 ? <>אין שורות בטבלה - לחץ "הוסף שורה"</> : <>אין תוצאות מתאימות לחיפוש</>}</td></tr>
                      ) : (
                        filteredAndSortedData.map((row, rowIndex) => {
                          const rowHeight = rowHeights[row.id] || 40;
                          return (
                            <Draggable key={row.id} draggableId={row.id} index={rowIndex}>
                              {(provided, snapshot) => (
                                <tr ref={provided.innerRef} {...provided.draggableProps} className={`${snapshot.isDragging ? 'opacity-70 shadow-lg' : ''} relative transition-all duration-200`} style={{ 
                                  height: `${rowHeight}px`,
                                  backgroundColor: rowIndex % 2 === 0 ? palette.cellBg : palette.cellAltBg
                                }} onMouseEnter={(e) => {
                                  if (!snapshot.isDragging) {
                                    e.currentTarget.style.backgroundColor = palette.hover;
                                    if (currentTheme.hoverEffect === 'medium') {
                                      e.currentTarget.style.transform = 'translateY(-1px)';
                                      e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
                                    } else if (currentTheme.hoverEffect === 'strong') {
                                      e.currentTarget.style.transform = 'scale(1.002)';
                                      e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
                                    }
                                  }
                                }} onMouseLeave={(e) => {
                                  if (!snapshot.isDragging) {
                                    e.currentTarget.style.backgroundColor = rowIndex % 2 === 0 ? palette.cellBg : palette.cellAltBg;
                                    e.currentTarget.style.transform = 'none';
                                    e.currentTarget.style.boxShadow = 'none';
                                  }
                                }}>
                                  <td {...provided.dragHandleProps} className="p-2 cursor-grab active:cursor-grabbing relative sticky right-0 shadow-[2px_0_5px_rgba(0,0,0,0.1)] transition-all duration-200" style={{ 
                                    height: `${rowHeight}px`, 
                                    zIndex: 15,
                                    backgroundColor: palette.headerBg,
                                    borderWidth: isSeparateBorders ? '0' : borderStyle.width,
                                    borderStyle: borderStyle.style,
                                    borderColor: palette.border,
                                    borderRadius: isSeparateBorders ? tableBorderRadius : '0'
                                  }}>
                                    <GripVertical className="w-4 h-4 mx-auto" style={{ color: palette.headerText }} />
                                    <div onMouseDown={(e) => handleRowResizeStart(e, row.id)} className="absolute left-0 right-0 hover:bg-blue-300 active:bg-blue-500 cursor-row-resize" style={{ bottom: '-4px', height: '8px', backgroundColor: resizingRow === row.id ? '#3b82f6' : '#e2e8f0', zIndex: 999, opacity: resizingRow === row.id ? 1 : 0.3 }} title="גרור לשינוי גובה" />
                                  </td>
                                  {visibleColumns.map(column => {
                                    const cellKey = `${row.id}_${column.key}`;
                                    const isEditing = editingCell === cellKey;
                                    const isSelected = selectedCells.has(cellKey);
                                    const cellValue = row[column.key] || '';
                                    const cellStyle = cellStyles[cellKey] || {};
                                    const colIndex = visibleColumns.findIndex(c => c.key === column.key);
                                    return (
                                      <td key={column.key} className={`transition-all duration-200 ${isSelected ? 'ring-2 ring-purple-500 animate-pulse' : ''} ${isDraggingSelection ? 'cursor-crosshair' : 'cursor-pointer'} ${copiedCells?.some(c => c.cellKey === cellKey) ? 'ring-2 ring-green-400' : ''}`} style={{ 
                                        backgroundColor: isSelected ? palette.selected : copiedCells?.some(c => c.cellKey === cellKey) ? '#dcfce7' : colIndex === 0 ? (rowIndex % 2 === 0 ? palette.cellBg : palette.cellAltBg) : (cellStyle.backgroundColor || (rowIndex % 2 === 0 ? palette.cellBg : palette.cellAltBg)),
                                        color: cellStyle.color || palette.cellText,
                                        opacity: cellStyle.opacity ? cellStyle.opacity / 100 : 1, 
                                        fontWeight: cellStyle.fontWeight || 'normal',
                                        fontFamily: cellFont.value,
                                        fontSize: cellFontSize,
                                        padding: cellPadding,
                                        height: `${rowHeight}px`, 
                                        maxHeight: `${rowHeight}px`, 
                                        overflow: 'hidden', 
                                        position: colIndex === 0 ? 'sticky' : 'relative', 
                                        right: colIndex === 0 ? '48px' : 'auto', 
                                        zIndex: colIndex === 0 ? 10 : 1, 
                                        userSelect: isDraggingSelection ? 'none' : 'auto', 
                                        boxShadow: colIndex === 0 ? '2px 0 5px rgba(0,0,0,0.05)' : 'none',
                                        borderWidth: isSeparateBorders ? '0' : borderStyle.width,
                                        borderStyle: borderStyle.style,
                                        borderColor: palette.border,
                                        borderRadius: isSeparateBorders ? tableBorderRadius : '0'
                                      }} onClick={(e) => !isEditing && (column.type === 'checkmark' ? handleCheckmarkClick(row.id, column.key, e) : handleCellClick(row.id, column.key, e))} onMouseDown={(e) => !isEditing && handleCellMouseDown(row.id, column.key, e)} onMouseEnter={() => handleCellMouseEnter(row.id, column.key)}>
                                        {column.type === 'checkmark' ? (
                                          <div className="flex items-center justify-center text-2xl font-bold select-none" style={{ userSelect: 'none' }}>
                                            {cellValue === '✓' ? <span className="text-green-600">✓</span> : cellValue === '✗' ? <span className="text-red-600">✗</span> : <span className="text-slate-300">○</span>}
                                          </div>
                                        ) : isEditing ? (
                                          <div className="relative">
                                            <Input ref={editInputRef} value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={saveEdit} onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') { setEditingCell(null); setEditValue(""); } }} className="h-8" autoFocus dir="rtl" list={`autocomplete-${column.key}`} />
                                            <datalist id={`autocomplete-${column.key}`}>{getAutoCompleteSuggestions(column.key).map((suggestion, idx) => <option key={idx} value={suggestion} />)}</datalist>
                                          </div>
                                        ) : (
                                          <div className="text-sm w-full relative">
                                            {String(cellValue)}
                                            {validationErrors[cellKey] && <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" title={validationErrors[cellKey]} />}
                                            {popoverOpen === cellKey && <Popover open={true} onOpenChange={(open) => !open && setPopoverOpen(null)}><PopoverContent className="w-64" align="start"><ColorPicker onApply={(style) => { applyCellStyle(cellKey, style); setPopoverOpen(null); }} currentStyle={cellStyle} /></PopoverContent></Popover>}
                                          </div>
                                        )}
                                      </td>
                                    );
                                  })}
                                  <td className="p-2 transition-all duration-200" style={{ 
                                    height: `${rowHeight}px`,
                                    backgroundColor: rowIndex % 2 === 0 ? palette.cellBg : palette.cellAltBg,
                                    borderWidth: isSeparateBorders ? '0' : borderStyle.width,
                                    borderStyle: borderStyle.style,
                                    borderColor: palette.border,
                                    borderRadius: isSeparateBorders ? tableBorderRadius : '0'
                                  }}>
                                    <div className="flex gap-1 justify-center">
                                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => duplicateRow(row)} title="שכפל"><Copy className="w-3 h-3 text-blue-600" /></Button>
                                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => deleteRow(row.id)} title="מחק"><Trash2 className="w-3 h-3 text-red-600" /></Button>
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
        <div className="px-6 py-3 border-t bg-gradient-to-r from-slate-50 to-slate-100 text-xs text-slate-600 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="font-semibold">{filteredAndSortedData.length} מתוך {rowsData.length} שורות</span>
            <span>•</span>
            <span>{visibleColumns.length} עמודות גלויות</span>
            {Object.keys(cellStyles).length > 0 && <><span>•</span><span className="text-purple-600 font-medium">{Object.keys(cellStyles).length} תאים מעוצבים</span></>}
            {validationRules.length > 0 && <><span>•</span><span className="text-blue-600 font-medium">{validationRules.length} כללי ולידציה</span></>}
            {conditionalFormats.filter(f => f.active !== false).length > 0 && <><span>•</span><span className="text-green-600 font-medium">{conditionalFormats.filter(f => f.active !== false).length} עיצובים מותנים</span></>}
          </div>
          <div className="flex items-center gap-4">
            {selectedCells.size > 0 && <div className="flex items-center gap-2 text-purple-600 bg-purple-50 px-3 py-1 rounded-full"><span className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" /><span className="font-semibold">{selectedCells.size} נבחרו</span></div>}
            {Object.keys(validationErrors).length > 0 && <div className="flex items-center gap-2 text-red-600 bg-red-50 px-3 py-1 rounded-full"><span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" /><span className="font-semibold">{Object.keys(validationErrors).length} שגיאות</span></div>}
            {hasActiveFilters && <div className="flex items-center gap-2 text-blue-600 bg-blue-50 px-3 py-1 rounded-full"><Filter className="w-3 h-3" /><span className="font-semibold">סינון פעיל</span></div>}
            {(canUndo || canRedo) && <div className="flex items-center gap-2 text-slate-500 bg-slate-100 px-3 py-1 rounded-full"><span className="font-semibold">{historyIndex + 1}/{history.length}</span></div>}
            <div className="text-slate-400 text-[10px] bg-slate-100 px-2 py-1 rounded">
              💡 Ctrl+C להעתקה • Ctrl+V להדבקה • Delete למחיקה • Double-click להתאמת רוחב
            </div>
          </div>
        </div>
      </Card>
      
      <ThemeSelector
        open={showThemeSelector}
        onClose={() => setShowThemeSelector(false)}
        currentTheme={currentTheme}
        onApply={handleThemeApply}
      />
      
      <ViewManager
        open={showViewManager}
        onClose={() => setShowViewManager(false)}
        savedViews={savedViews}
        activeViewId={activeViewId}
        currentColumns={columns}
        onSaveView={handleSaveView}
        onLoadView={handleLoadView}
        onDeleteView={handleDeleteView}
        onSetDefault={handleSetDefaultView}
      />
    </div>
  );
}

function ColorPicker({ onApply, currentStyle = {} }) {
  const [color, setColor] = useState(currentStyle.backgroundColor || '#ffffff');
  const [opacity, setOpacity] = useState(currentStyle.opacity || 100);
  const [isBold, setIsBold] = useState(currentStyle.fontWeight === 'bold');
  const colors = ['#ffffff', '#fee2e2', '#fef3c7', '#d1fae5', '#dbeafe', '#ede9fe', '#fce7f3', '#f3f4f6'];
  return (
    <div className="space-y-3" dir="rtl">
      <div><h4 className="font-semibold text-sm mb-2">צבע רקע</h4><div className="grid grid-cols-4 gap-2 mb-2">{colors.map(c => <button key={c} className={`h-8 rounded border-2 ${color === c ? 'ring-2 ring-blue-500' : ''}`} style={{ backgroundColor: c }} onClick={() => setColor(c)} />)}</div><Input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-full h-10" /></div>
      <div><h4 className="font-semibold text-sm mb-2">שקיפות: {opacity}%</h4><input type="range" min="0" max="100" value={opacity} onChange={(e) => setOpacity(Number(e.target.value))} className="w-full" /></div>
      <div className="flex items-center justify-between"><span className="text-sm">טקסט מודגש</span><input type="checkbox" checked={isBold} onChange={(e) => setIsBold(e.target.checked)} className="h-4 w-4" /></div>
      <Button onClick={() => onApply({ backgroundColor: color, opacity: opacity, fontWeight: isBold ? 'bold' : 'normal' })} className="w-full">החל</Button>
    </div>
  );
}