
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Table, Copy, Settings, Palette, Eye, EyeOff, Edit2, X, Download, Grid, Search, Filter, ArrowUp, ArrowDown, ArrowUpDown, XCircle, Undo, Redo, GripVertical, BarChart3, Calculator, Layers, Bookmark, Users, Zap, MessageSquare, Bold, Scissors } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import ThemeSelector, { COLOR_PALETTES, BORDER_STYLES, FONT_OPTIONS } from "./ThemeSelector";
import ViewManager from "./ViewManager";
import ChartBuilder from "./ChartBuilder";
import ChartViewer from "./ChartViewer";
import { useAccessControl } from "@/components/access/AccessValidator";
import ColumnsManagerDialog from "./ColumnsManagerDialog";
import BulkColumnsDialog from "./BulkColumnsDialog";

export default function GenericSpreadsheet({ spreadsheet, onUpdate, fullScreenMode = false }) {
  const [columns, setColumns] = useState([]);
  const [rowsData, setRowsData] = useState([]);
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [selectedCells, setSelectedCells] = useState(new Set());
  const [cellStyles, setCellStyles] = useState({});
  const [cellNotes, setCellNotes] = useState({});
  const [popoverOpen, setPopoverOpen] = useState(null);
  const [editingColumnKey, setEditingColumnKey] = useState(null);
  const [editingColumnTitle, setEditingColumnTitle] = useState("");
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnFilters, setColumnFilters] = useState({});
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isUndoRedoAction, setIsUndoRedoAction] = useState(false);
  const [resizingColumn, setResizingColumn] = useState(null);
  const [resizingRow, setResizingRow] = useState(null);
  const [rowHeights, setRowHeights] = useState({});
  const [validationRules, setValidationRules] = useState([]);
  const [conditionalFormats, setConditionalFormats] = useState([]);
  const [validationErrors, setValidationErrors] = useState({});
  const [freezeSettings, setFreezeSettings] = useState({ freeze_rows: 0, freeze_columns: 1 });
  const [customCellTypes, setCustomCellTypes] = useState([]);
  const [mergedCells, setMergedCells] = useState({});
  const [isDraggingSelection, setIsDraggingSelection] = useState(false);
  const [dragStartCell, setDragStartCell] = useState(null);
  const [copiedCells, setCopiedCells] = useState(null);
  const [showColumnStats, setShowColumnStats] = useState(false);
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const [themeSettings, setThemeSettings] = useState(null);
  const [showViewManager, setShowViewManager] = useState(false);
  const [savedViews, setSavedViews] = useState([]);
  const [activeViewId, setActiveViewId] = useState(null);
  const [allClients, setAllClients] = useState([]);
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [showClientPicker, setShowClientPicker] = useState(null);
  const [showAddFromClientDialog, setShowAddFromClientDialog] = useState(false);
  const [showChartBuilder, setShowChartBuilder] = useState(false);
  const [charts, setCharts] = useState([]);
  const [editingChart, setEditingChart] = useState(null);
  const [showColumnsManager, setShowColumnsManager] = useState(false);
  const [showBulkColumnsDialog, setShowBulkColumnsDialog] = useState(false);
  const [cellContextMenu, setCellContextMenu] = useState(null);
  const [noteDialogCell, setNoteDialogCell] = useState(null);
  const [noteText, setNoteText] = useState("");
  const [showColorPickerDialog, setShowColorPickerDialog] = useState(false);
  const [colorPickerTargetCell, setColorPickerTargetCell] = useState(null);

  const editInputRef = useRef(null);
  const columnEditRef = useRef(null);
  const tableRef = useRef(null);
  const contextMenuRef = useRef(null);

  const columnsRef = useRef(columns);
  const rowsDataRef = useRef(rowsData);
  const cellStylesRef = useRef(cellStyles);
  const cellNotesRef = useRef(cellNotes);
  const rowHeightsRef = useRef(rowHeights);
  const validationRulesRef = useRef(validationRules);
  const conditionalFormatsRef = useRef(conditionalFormats);
  const freezeSettingsRef = useRef(freezeSettings);
  const customCellTypesRef = useRef(customCellTypes);
  const mergedCellsRef = useRef(mergedCells);
  const themeSettingsRef = useRef(themeSettings);
  const savedViewsRef = useRef(savedViews);
  const activeViewIdRef = useRef(activeViewId);
  const chartsRef = useRef(charts);

  useEffect(() => { columnsRef.current = columns; }, [columns]);
  useEffect(() => { rowsDataRef.current = rowsData; }, [rowsData]);
  useEffect(() => { cellStylesRef.current = cellStyles; }, [cellStyles]);
  useEffect(() => { cellNotesRef.current = cellNotes; }, [cellNotes]);
  useEffect(() => { rowHeightsRef.current = rowHeights; }, [rowHeights]);
  useEffect(() => { validationRulesRef.current = validationRules; }, [validationRules]);
  useEffect(() => { conditionalFormatsRef.current = conditionalFormats; }, [conditionalFormats]);
  useEffect(() => { freezeSettingsRef.current = freezeSettings; }, [freezeSettings]);
  useEffect(() => { customCellTypesRef.current = customCellTypes; }, [customCellTypes]);
  useEffect(() => { mergedCellsRef.current = mergedCells; }, [mergedCells]);
  useEffect(() => { themeSettingsRef.current = themeSettings; }, [themeSettings]);
  useEffect(() => { savedViewsRef.current = savedViews; }, [savedViews]);
  useEffect(() => { activeViewIdRef.current = activeViewId; }, [activeViewId]);
  useEffect(() => { chartsRef.current = charts; }, [charts]);

  const { filterClients } = useAccessControl();

  useEffect(() => {
    if (!cellContextMenu) return;

    const handleClickOutside = (e) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target)) {
        setCellContextMenu(null);
      }
    };

    setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [cellContextMenu]);

  useEffect(() => {
    const loadClients = async () => {
      try {
        const clients = await base44.entities.Client.list();
        const validClients = Array.isArray(clients) ? clients : [];
        const filtered = filterClients(validClients);
        setAllClients(filtered);
      } catch (error) {
        console.error('Error loading clients:', error);
        setAllClients([]);
      }
    };
    loadClients();
  }, [filterClients]);

  useEffect(() => {
    if (spreadsheet) {
      const initialColumns = spreadsheet.columns || [];
      const initialRows = spreadsheet.rows_data || [];
      const initialStyles = spreadsheet.cell_styles || {};
      const initialNotes = spreadsheet.cell_notes || {};

      setColumns(initialColumns);
      setRowsData(initialRows);
      setCellStyles(initialStyles);
      setCellNotes(initialNotes);
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

      setThemeSettings(loadedTheme);
      setSavedViews(spreadsheet.saved_views || []);
      setActiveViewId(spreadsheet.active_view_id || null);
      setCharts(spreadsheet.charts || []);

      setHistory([{ columns: initialColumns, rows: initialRows, styles: initialStyles, notes: initialNotes }]);
      setHistoryIndex(0);
    }
  }, [spreadsheet]);

  const saveToHistory = useCallback((cols, rows, styles, notes) => {
    if (isUndoRedoAction) return;
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push({ columns: cols, rows: rows, styles: styles, notes: notes });
      if (newHistory.length > 50) newHistory.shift();
      return newHistory;
    });
    setHistoryIndex(prev => Math.min(prev + 1, 49));
  }, [historyIndex, isUndoRedoAction]);

  const saveToBackend = useCallback(async () => {
    if (!spreadsheet?.id) {
      console.warn('⚠️ No spreadsheet ID');
      return;
    }
    
    try {
      const dataToSave = {
        columns: columnsRef.current,
        rows_data: rowsDataRef.current,
        cell_styles: cellStylesRef.current,
        cell_notes: cellNotesRef.current,
        row_heights: rowHeightsRef.current,
        validation_rules: validationRulesRef.current,
        conditional_formats: conditionalFormatsRef.current,
        freeze_settings: freezeSettingsRef.current,
        custom_cell_types: customCellTypesRef.current,
        merged_cells: mergedCellsRef.current,
        theme_settings: themeSettingsRef.current,
        saved_views: savedViewsRef.current,
        active_view_id: activeViewIdRef.current,
        charts: chartsRef.current
      };

      await base44.entities.CustomSpreadsheet.update(spreadsheet.id, dataToSave);

      if (onUpdate) {
        await onUpdate();
      }
    } catch (error) {
      console.error('❌ [SAVE] Error:', error);
      toast.error('שגיאה בשמירה: ' + (error.message || 'לא ידוע'));
    }
  }, [spreadsheet?.id, onUpdate]);

  const handleUndo = useCallback(() => {
    if (historyIndex <= 0) { toast.error('אין מה לבטל'); return; }
    setIsUndoRedoAction(true);
    const prevState = history[historyIndex - 1];
    setColumns(prevState.columns);
    setRowsData(prevState.rows);
    setCellStyles(prevState.styles);
    setCellNotes(prevState.notes || {});
    setHistoryIndex(prev => prev - 1);
    setTimeout(() => {
      saveToBackend();
      setIsUndoRedoAction(false);
    }, 50);
    toast.success('✓ פעולה בוטלה');
  }, [history, historyIndex, saveToBackend]);

  const handleRedo = useCallback(() => {
    if (historyIndex >= history.length - 1) { toast.error('אין מה לשחזר'); return; }
    setIsUndoRedoAction(true);
    const nextState = history[historyIndex + 1];
    setColumns(nextState.columns);
    setRowsData(nextState.rows);
    setCellStyles(nextState.styles);
    setCellNotes(nextState.notes || {});
    setHistoryIndex(prev => prev + 1);
    setTimeout(() => {
      saveToBackend();
      setIsUndoRedoAction(false);
    }, 50);
    toast.success('✓ פעולה שוחזרה');
  }, [history, historyIndex, saveToBackend]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); handleUndo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); handleRedo(); }

      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && selectedCells.size > 0) {
        e.preventDefault();
        const cellsData = Array.from(selectedCells).map(cellKey => {
          const match = cellKey.match(/^(.+?)_(col.*)$/);
          if (!match) return null;
          const rowId = match[1];
          const colKey = match[2];
          const row = rowsData.find(r => r.id === rowId);
          return { cellKey, value: row?.[colKey] || '' };
        }).filter(Boolean);
        setCopiedCells(cellsData);
        toast.success(`✓ הועתקו ${cellsData.length} תאים`);
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'v' && copiedCells && selectedCells.size > 0) {
        e.preventDefault();
        const updatedRows = [...rowsData];
        copiedCells.forEach((copiedCell, idx) => {
          if (idx < selectedCells.size) {
            const cellKey = Array.from(selectedCells)[idx];
            const match = cellKey.match(/^(.+?)_(col.*)$/);
            if (!match) return;
            const rowId = match[1];
            const colKey = match[2];
            const rowIndex = updatedRows.findIndex(r => r.id === rowId);
            if (rowIndex >= 0) {
              updatedRows[rowIndex] = { ...updatedRows[rowIndex], [colKey]: copiedCell.value };
            }
          }
        });

        setRowsData(updatedRows);
        setTimeout(() => {
          saveToHistory(columnsRef.current, rowsDataRef.current, cellStylesRef.current, cellNotesRef.current);
          saveToBackend();
        }, 50);
        toast.success(`✓ הודבקו ${Math.min(copiedCells.length, selectedCells.size)} תאים`);
      }

      if (e.key === 'Delete' && selectedCells.size > 0 && !editingCell) {
        e.preventDefault();
        const updatedRows = rowsData.map(row => {
          const newRow = { ...row };
          selectedCells.forEach(cellKey => {
            const match = cellKey.match(/^(.+?)_(col.*)$/);
            if (!match) return;
            const rowId = match[1];
            const colKey = match[2];
            if (row.id === rowId) {
              newRow[colKey] = '';
            }
          });
          return newRow;
        });

        setRowsData(updatedRows);
        setTimeout(() => {
          saveToHistory(columnsRef.current, rowsDataRef.current, cellStylesRef.current, cellNotesRef.current);
          saveToBackend();
        }, 50);
        toast.success(`✓ נמחקו ${selectedCells.size} תאים`);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, selectedCells, copiedCells, rowsData, columns, cellStyles, editingCell, saveToHistory, saveToBackend]);

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    if (result.type === 'column') {
      const reorderedColumns = Array.from(columns);
      const [movedColumn] = reorderedColumns.splice(result.source.index, 1);
      reorderedColumns.splice(result.destination.index, 0, movedColumn);
      setColumns(reorderedColumns);
      setTimeout(() => {
        saveToHistory(columnsRef.current, rowsDataRef.current, cellStylesRef.current, cellNotesRef.current);
        saveToBackend();
      }, 50);
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
    setTimeout(() => saveToBackend(), 50);
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
    setTimeout(() => {
      saveToHistory(columnsRef.current, rowsDataRef.current, cellStylesRef.current, cellNotesRef.current);
      saveToBackend();
    }, 50);
    toast.success('✓ שורה נוספה');
  };

  const addRowFromClient = async (client) => {
    const newRow = { id: `row_${Date.now()}` };

    columns.forEach(col => {
      const colKey = col.key.toLowerCase();
      const colTitle = (col.title || '').toLowerCase();

      if (col.type === 'client' || colKey.includes('client') || colKey.includes('לקוח') || colTitle.includes('לקוח')) {
        newRow[col.key] = client.name;
      } else if (colKey.includes('name') || colKey.includes('שם')) {
        newRow[col.key] = client.name;
      } else if (colKey.includes('phone') || colKey.includes('טלפון') || colTitle.includes('טלפון')) {
        newRow[col.key] = client.phone || '';
      } else if (colKey.includes('email') || colKey.includes('מייל') || colTitle.includes('מייל') || colTitle.includes('אימייל')) {
        newRow[col.key] = client.email || '';
      } else if (colKey.includes('company') || colKey.includes('חברה') || colTitle.includes('חברה')) {
        newRow[col.key] = client.company || '';
      } else if (colKey.includes('address') || colKey.includes('כתובת') || colTitle.includes('כתובת')) {
        newRow[col.key] = client.address || '';
      } else if (colKey.includes('contact') || colKey.includes('איש') || colTitle.includes('איש קשר')) {
        newRow[col.key] = client.name || '';
      }
    });

    const updated = [...rowsData, newRow];
    setRowsData(updated);
    setTimeout(() => {
      saveToHistory(columnsRef.current, rowsDataRef.current, cellStylesRef.current, cellNotesRef.current);
      saveToBackend();
    }, 50);

    setShowAddFromClientDialog(false);
    setClientSearchQuery("");

    const filledFields = [];
    if (newRow[columns.find(c => c.type === 'client' || c.key.includes('name'))?.key]) filledFields.push('שם');
    if (newRow[columns.find(c => c.key.includes('phone'))?.key]) filledFields.push('טלפון');
    if (newRow[columns.find(c => c.key.includes('email'))?.key]) filledFields.push('אימייל');
    if (newRow[columns.find(c => c.key.includes('company'))?.key]) filledFields.push('חברה');
    if (newRow[columns.find(c => c.key.includes('address'))?.key]) filledFields.push('כתובת');

    toast.success(`✓ שורה נוספה מלקוח "${client.name}"${filledFields.length > 0 ? ` • מולאו: ${filledFields.join(', ')}` : ''}`);
  };

  const deleteRow = async (rowId) => {
    if (!confirm('למחוק שורה זו?')) return;
    const updated = rowsData.filter(r => r.id !== rowId);
    setRowsData(updated);
    const newStyles = { ...cellStyles };
    const newNotes = { ...cellNotes };
    Object.keys(newStyles).forEach(key => { if (key.startsWith(`${rowId}_`)) delete newStyles[key]; });
    Object.keys(newNotes).forEach(key => { if (key.startsWith(`${rowId}_`)) delete newNotes[key]; });
    setCellStyles(newStyles);
    setCellNotes(newNotes);
    setTimeout(() => {
      saveToHistory(columnsRef.current, rowsDataRef.current, cellStylesRef.current, cellNotesRef.current);
      saveToBackend();
    }, 50);
    toast.success('✓ שורה נמחקה');
  };

  const duplicateRow = async (row) => {
    const { id, ...data } = row;
    const newRow = { ...data, id: `row_${Date.now()}` };
    const updated = [...rowsData, newRow];
    setRowsData(updated);
    setTimeout(() => {
      saveToHistory(columnsRef.current, rowsDataRef.current, cellStylesRef.current, cellNotesRef.current);
      saveToBackend();
    }, 50);
    toast.success('✓ שורה הועתקה');
  };

  const addColumn = async () => {
    const columnName = prompt('שם העמודה החדשה:');
    if (!columnName) return;
    const newColumn = { key: `col_${Date.now()}`, title: columnName, width: '150px', type: 'text', visible: true };
    const updated = [...columns, newColumn];
    setColumns(updated);
    setTimeout(() => {
      saveToHistory(columnsRef.current, rowsDataRef.current, cellStylesRef.current, cellNotesRef.current);
      saveToBackend();
    }, 50);
    toast.success('✓ עמודה נוספה');
  };

  const addBulkColumns = async (newColumns) => {
    if (!newColumns || newColumns.length === 0) return;
    const updated = [...columns, ...newColumns];
    setColumns(updated);
    setTimeout(() => {
      saveToHistory(columnsRef.current, rowsDataRef.current, cellStylesRef.current, cellNotesRef.current);
      saveToBackend();
    }, 50);
    toast.success(`✓ נוספו ${newColumns.length} עמודות`);
  };

  const deleteColumn = async (columnKey) => {
    if (!confirm('למחוק עמודה זו?')) return;
    const updated = columns.filter(col => col.key !== columnKey);
    setColumns(updated);
    const updatedRows = rowsData.map(row => { const { [columnKey]: removed, ...rest } = row; return rest; });
    setRowsData(updatedRows);
    const newStyles = { ...cellStyles };
    const newNotes = { ...cellNotes };
    Object.keys(newStyles).forEach(key => { if (key.endsWith(`_${columnKey}`)) delete newStyles[key]; });
    Object.keys(newNotes).forEach(key => { if (key.endsWith(`_${columnKey}`)) delete newNotes[key]; });
    setCellStyles(newStyles);
    setCellNotes(newNotes);
    setTimeout(() => {
      saveToHistory(columnsRef.current, rowsDataRef.current, cellStylesRef.current, cellNotesRef.current);
      saveToBackend();
    }, 50);
    toast.success('✓ עמודה נמחקה');
  };

  const toggleColumnVisibility = async (columnKey) => {
    const updated = columns.map(col => col.key === columnKey ? { ...col, visible: !col.visible } : col);
    setColumns(updated);
    setTimeout(() => saveToBackend(), 50);
    toast.success('✓ נראות עמודה שונתה');
  };

  const renameColumn = async (columnKey, newTitle) => {
    if (!newTitle.trim()) return;
    const updated = columns.map(col => col.key === columnKey ? { ...col, title: newTitle.trim() } : col);
    setColumns(updated);
    setTimeout(() => {
      saveToHistory(columnsRef.current, rowsDataRef.current, cellStylesRef.current, cellNotesRef.current);
      saveToBackend();
    }, 50);
    toast.success('✓ שם עמודה עודכן');
  };

  const changeColumnType = async (columnKey, newType) => {
    const updated = columns.map(col => col.key === columnKey ? { ...col, type: newType } : col);
    setColumns(updated);
    setTimeout(() => saveToBackend(), 50);
    toast.success('✓ סוג עמודה עודכן');
  };

  const changeColumnWidth = async (columnKey, newWidth) => {
    const updated = columns.map(col => col.key === columnKey ? { ...col, width: newWidth } : col);
    setColumns(updated);
    setTimeout(() => saveToBackend(), 50);
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
        setTimeout(() => saveToBackend(), 50);
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
  }, [resizingColumn, resizingRow, columns, rowHeights, saveToBackend]);

  const applyStyleToSelection = (style) => {
    const newStyles = { ...cellStyles };
    
    selectedCells.forEach(cellKey => { 
      newStyles[cellKey] = { ...(newStyles[cellKey] || {}), ...style };
    });
    
    setCellStyles(newStyles);
    
    setTimeout(() => {
      saveToHistory(columnsRef.current, rowsDataRef.current, cellStylesRef.current, cellNotesRef.current);
      saveToBackend();
    }, 100);
    
    toast.success(`✓ סגנון הותקן ל-${selectedCells.size} תאים`);
  };

  const exportToCSV = () => {
    const visibleCols = columns.filter(col => col.visible !== false);
    const headers = visibleCols.map(col => col.title).join(',');
    const rows = filteredAndSortedData.map(row => {
      return visibleCols.map(col => {
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

  const getAutoCompleteSuggestions = (columnKey) => {
    const values = new Set();
    rowsData.forEach(row => {
      const val = row[columnKey];
      if (val && String(val).trim()) values.add(String(val).trim());
    });
    return Array.from(values).sort();
  };

  // ✅ מיזוג תאים
  const mergeCells = () => {
    if (selectedCells.size < 2) { 
      toast.error('בחר לפחות 2 תאים למיזוג'); 
      return; 
    }
    const cellsArray = Array.from(selectedCells);
    const mergeKey = cellsArray.sort().join('|');
    setMergedCells(prev => ({ ...prev, [mergeKey]: cellsArray }));
    toast.success(`✓ ${cellsArray.length} תאים אוחדו`);
    setSelectedCells(new Set());
    setTimeout(() => saveToBackend(), 50);
  };

  // ✅ ביטול מיזוג תאים
  const unmergeCells = (cellKey) => {
    // מצא את קבוצת המיזוג שמכילה את התא הזה
    const mergeKeyToDelete = Object.keys(mergedCells).find(key => 
      mergedCells[key].includes(cellKey)
    );
    
    if (!mergeKeyToDelete) {
      toast.error('התא אינו חלק ממיזוג');
      return;
    }

    const newMerged = { ...mergedCells };
    delete newMerged[mergeKeyToDelete];
    setMergedCells(newMerged);
    setCellContextMenu(null);
    
    setTimeout(() => saveToBackend(), 50);
    toast.success('✓ מיזוג בוטל');
  };

  // ✅ בדיקה האם תא הוא חלק ממיזוג
  const isCellMerged = (cellKey) => {
    return Object.values(mergedCells).some(cells => cells.includes(cellKey));
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
    const match = dragStartCell.match(/^(.+?)_(col.*)$/);
    if (!match) return;
    
    const startRowId = match[1];
    const startColKey = match[2];
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
    setTimeout(() => {
      saveToHistory(columnsRef.current, rowsDataRef.current, cellStylesRef.current, cellNotesRef.current);
      saveToBackend();
    }, 50);
  };

  const handleClientSelect = async (rowId, columnKey, client) => {
    const phoneCol = columns.find(c => c.key.includes('phone') || c.key.includes('טלפון'));
    const emailCol = columns.find(c => c.key.includes('email') || c.key.includes('מייל'));
    const companyCol = columns.find(c => c.key.includes('company') || c.key.includes('חברה'));
    const addressCol = columns.find(c => c.key.includes('address') || c.key.includes('כתובת'));

    const updatedRows = rowsData.map(row => {
      if (row.id === rowId) {
        const newRow = { ...row, [columnKey]: client.name };

        if (phoneCol && client.phone) newRow[phoneCol.key] = client.phone;
        if (emailCol && client.email) newRow[emailCol.key] = client.email;
        if (companyCol && client.company) newRow[companyCol.key] = client.company;
        if (addressCol && client.address) newRow[addressCol.key] = client.address;

        return newRow;
      }
      return row;
    });

    setRowsData(updatedRows);
    setShowClientPicker(null);
    setClientSearchQuery("");
    setTimeout(() => {
      saveToHistory(columnsRef.current, rowsDataRef.current, cellStylesRef.current, cellNotesRef.current);
      saveToBackend();
    }, 50);

    const autoFilledFields = [];
    if (phoneCol && client.phone) autoFilledFields.push('טלפון');
    if (emailCol && client.email) autoFilledFields.push('אימייל');
    if (companyCol && client.company) autoFilledFields.push('חברה');
    if (addressCol && client.address) autoFilledFields.push('כתובת');

    if (autoFilledFields.length > 0) {
      toast.success(`✓ לקוח נבחר ונתונים נוספים מולאו אוטומטית: ${autoFilledFields.join(', ')}`);
    } else {
      toast.success('✓ לקוח נבחר');
    }
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

    const column = columns.find(c => c.key === columnKey);
    if (column?.type === 'client') {
      event.preventDefault();
      setShowClientPicker(`${rowId}_${columnKey}`);
      setClientSearchQuery("");
      return;
    }

    const row = filteredAndSortedData.find(r => r.id === rowId);
    if (!row) return;
    const currentValue = row[columnKey] || '';
    setEditingCell(`${rowId}_${columnKey}`);
    setEditValue(String(currentValue));
    setTimeout(() => editInputRef.current?.focus(), 0);
  };

  const handleCellDoubleClick = (rowId, columnKey, event) => {
    event.preventDefault();
    event.stopPropagation();
    const cellKey = `${rowId}_${columnKey}`;
    setCellContextMenu(cellKey);
  };

  const handleOpenNoteDialog = (cellKey) => {
    setNoteDialogCell(cellKey);
    setNoteText(cellNotes[cellKey] || '');
    setCellContextMenu(null);
  };

  const handleNoteTriangleClick = (cellKey, event) => {
    event.stopPropagation();
    event.preventDefault();
    handleOpenNoteDialog(cellKey);
  };

  const handleSaveNote = () => {
    if (!noteDialogCell) return;
    
    const newNotes = { ...cellNotes };
    if (noteText.trim()) {
      newNotes[noteDialogCell] = noteText.trim();
      toast.success('✓ הערה נשמרה');
    } else {
      delete newNotes[noteDialogCell];
      toast.success('✓ הערה נמחקה');
    }
    
    setCellNotes(newNotes);
    setNoteDialogCell(null);
    setNoteText("");
    
    setTimeout(() => {
      saveToHistory(columnsRef.current, rowsDataRef.current, cellStylesRef.current, newNotes);
      saveToBackend();
    }, 50);
  };

  const handleColorSingleCell = (cellKey) => {
    setCellContextMenu(null);
    
    setTimeout(() => {
      setColorPickerTargetCell(cellKey);
      setSelectedCells(new Set([cellKey]));
      setShowColorPickerDialog(true);
    }, 100);
  };

  const handleBoldSingleCell = (cellKey) => {
    const currentStyle = cellStyles[cellKey] || {};
    const newStyles = { 
      ...cellStyles, 
      [cellKey]: { 
        ...currentStyle, 
        fontWeight: currentStyle.fontWeight === 'bold' ? 'normal' : 'bold' 
      } 
    };
    
    setCellStyles(newStyles);
    setCellContextMenu(null);
    
    setTimeout(() => {
      saveToHistory(columnsRef.current, rowsDataRef.current, newStyles, cellNotesRef.current);
      saveToBackend();
    }, 50);
    
    toast.success('✓ הדגשה הוחלה');
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
    
    const match = editingCell.match(/^(.+?)_(col.*)$/);
    if (!match) {
      console.error('❌ Invalid cellKey:', editingCell);
      toast.error('שגיאה בזיהוי התא');
      return;
    }
    
    const rowId = match[1];
    const columnKey = match[2];
    
    const validationError = validateCell(columnKey, editValue);
    if (validationError) {
      setValidationErrors(prev => ({ ...prev, [editingCell]: validationError }));
      toast.error(validationError);
      return;
    }
    setValidationErrors(prev => { const { [editingCell]: removed, ...rest } = prev; return rest; });
    
    const updatedRows = rowsData.map(row => 
      row.id === rowId ? { ...row, [columnKey]: editValue } : row
    );
    
    setRowsData(updatedRows);
    setEditingCell(null);
    setEditValue("");
    
    setTimeout(() => {
      saveToHistory(columnsRef.current, updatedRows, cellStylesRef.current, cellNotesRef.current);
      saveToBackend();
    }, 50);
    
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

  const handleSaveChart = async (chart) => {
    const updatedCharts = editingChart
      ? charts.map(c => c.id === chart.id ? chart : c)
      : [...charts, { ...chart, id: chart.id || `chart_${Date.now()}` }];

    setCharts(updatedCharts);
    await base44.entities.CustomSpreadsheet.update(spreadsheet.id, {
      charts: updatedCharts
    });

    setShowChartBuilder(false);
    setEditingChart(null);
    if (onUpdate) await onUpdate();
    toast.success('✓ גרף נשמר');
  };

  const handleEditChart = (chart) => {
    setEditingChart(chart);
    setShowChartBuilder(true);
  };

  const handleDeleteChart = async (chartId) => {
    if (!confirm('האם למחוק גרף זה?')) return;

    const updatedCharts = charts.filter(c => c.id !== chartId);
    setCharts(updatedCharts);

    await base44.entities.CustomSpreadsheet.update(spreadsheet.id, {
      charts: updatedCharts
    });

    toast.success('✓ גרף נמחק');
    if (onUpdate) await onUpdate();
  };

  if (!spreadsheet) return <div className="p-6 text-center text-slate-500">לא נבחרה טבלה</div>;

  const visibleColumns = columns.filter(col => col.visible !== false);
  const hasActiveFilters = globalFilter || Object.keys(columnFilters).length > 0 || sortColumn;
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

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

  const palette = currentTheme.customColors || COLOR_PALETTES[currentTheme.palette] || COLOR_PALETTES.default;
  const borderStyle = BORDER_STYLES[currentTheme.borderStyle] || BORDER_STYLES.thin;
  const headerFont = FONT_OPTIONS[currentTheme.headerFont] || FONT_OPTIONS.default;
  const cellFont = FONT_OPTIONS[currentTheme.cellFont] || FONT_OPTIONS.default;

  const headerFontSize = currentTheme.fontSize === 'small' ? '12px' : currentTheme.fontSize === 'large' ? '16px' : '14px';
  const cellFontSize = currentTheme.fontSize === 'small' ? '11px' : currentTheme.fontSize === 'large' ? '15px' : '13px';
  const cellPadding = currentTheme.density === 'compact' ? '4px 8px' : currentTheme.density === 'spacious' ? '12px 16px' : '8px 12px';

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
    <div className="w-full space-y-6" dir="rtl">
      {charts.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-green-600" />
            גרפים וויזואליזציות
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {charts.map(chart => (
              <ChartViewer
                key={chart.id}
                chart={chart}
                rowsData={filteredAndSortedData}
                columns={columns}
                onEdit={handleEditChart}
                onDelete={handleDeleteChart}
              />
            ))}
          </div>
        </div>
      )}

      <Card className="shadow-lg">
        <CardHeader className="border-b space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-wrap">
              <Table className="w-6 h-6 text-purple-600" />
              <CardTitle className="text-xl">{spreadsheet.name}</CardTitle>
              <Badge variant="outline">{filteredAndSortedData.length}/{rowsData.length} שורות</Badge>
              <Badge variant="outline">{visibleColumns.length}/{columns.length} עמודות</Badge>
              {Object.keys(cellStyles).length > 0 && (
                <Badge className="bg-purple-100 text-purple-800">
                  <Palette className="w-3 h-3 ml-1" />
                  {Object.keys(cellStyles).length} עיצובים
                </Badge>
              )}
              {Object.keys(cellNotes).length > 0 && (
                <Badge className="bg-amber-100 text-amber-800">
                  <MessageSquare className="w-3 h-3 ml-1" />
                  {Object.keys(cellNotes).length} הערות
                </Badge>
              )}
              {Object.keys(mergedCells).length > 0 && (
                <Badge className="bg-green-100 text-green-800">
                  <Grid className="w-3 h-3 ml-1" />
                  {Object.keys(mergedCells).length} מיזוגים
                </Badge>
              )}
              {hasActiveFilters && <Badge className="bg-blue-600 text-white"><Filter className="w-3 h-3 ml-1" />פעיל</Badge>}
              {activeViewId && savedViews.find(v => v.id === activeViewId) && (
                <Badge className="bg-indigo-100 text-indigo-800 border-indigo-300">
                  <Bookmark className="w-3 h-3 ml-1" />
                  {savedViews.find(v => v.id === activeViewId)?.name}
                </Badge>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button onClick={handleUndo} size="sm" variant="outline" disabled={!canUndo} title="בטל (Ctrl+Z)"><Undo className="w-4 h-4" /></Button>
              <Button onClick={handleRedo} size="sm" variant="outline" disabled={!canRedo} title="שחזר (Ctrl+Y)"><Redo className="w-4 h-4" /></Button>
              <Button onClick={() => setShowColumnStats(!showColumnStats)} size="sm" variant="outline" className="gap-2"><BarChart3 className="w-4 h-4" />סטטיסטיקות</Button>
              <Button onClick={() => setShowThemeSelector(true)} size="sm" variant="outline" className="gap-2"><Palette className="w-4 h-4" />עיצוב</Button>
              <Button onClick={() => setShowViewManager(true)} size="sm" variant="outline" className="gap-2">
                <Layers className="w-4 h-4" />תצוגות
                {savedViews.length > 0 && <Badge variant="outline" className="mr-1 h-5 px-1.5 text-xs">{savedViews.length}</Badge>}
              </Button>
              <Button onClick={() => { setEditingChart(null); setShowChartBuilder(true); }} size="sm" variant="outline" className="gap-2 hover:bg-green-50">
                <BarChart3 className="w-4 h-4" />גרפים
                {charts.length > 0 && <Badge variant="outline" className="mr-1 h-5 px-1.5 text-xs bg-green-50 text-green-700">{charts.length}</Badge>}
              </Button>
              <Popover>
                <PopoverTrigger asChild>
                  <Button size="sm" className="gap-2"><Plus className="w-4 h-4" />שורה</Button>
                </PopoverTrigger>
                <PopoverContent className="w-56" align="end" dir="rtl">
                  <div className="space-y-2">
                    <Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={addNewRow}>
                      <Plus className="w-4 h-4" />שורה ריקה
                    </Button>
                    <Button variant="outline" size="sm" className="w-full justify-start gap-2 bg-blue-50 hover:bg-blue-100 border-blue-300" onClick={() => setShowAddFromClientDialog(true)}>
                      <Users className="w-4 h-4 text-blue-600" />
                      <span className="text-blue-900">מלקוח קיים</span>
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button size="sm" className="gap-2"><Plus className="w-4 h-4" />עמודה</Button>
                </PopoverTrigger>
                <PopoverContent className="w-56" align="end" dir="rtl">
                  <div className="space-y-2">
                    <Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={addColumn}>
                      <Plus className="w-4 h-4" />עמודה בודדת
                    </Button>
                    <Button variant="outline" size="sm" className="w-full justify-start gap-2 bg-orange-50 hover:bg-orange-100 border-orange-300" onClick={() => setShowBulkColumnsDialog(true)}>
                      <Zap className="w-4 h-4 text-orange-600" />
                      <span className="text-orange-900">יצירה מהירה</span>
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
              <Button onClick={() => setShowColumnsManager(true)} size="sm" variant="outline" className="gap-2 hover:bg-orange-50">
                <Settings className="w-4 h-4" />
                ניהול עמודות
              </Button>
              {selectedCells.size > 0 && (
                <>
                  <Badge variant="outline" className="bg-purple-50 px-3">נבחרו: {selectedCells.size}</Badge>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button size="sm" variant="outline" className="gap-2">
                        <Palette className="w-4 h-4" />צבע
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80">
                      <ColorPicker onApply={applyStyleToSelection} />
                    </PopoverContent>
                  </Popover>
                  {selectedCells.size >= 2 && <Button size="sm" variant="outline" onClick={mergeCells} className="gap-2 hover:bg-green-50"><Grid className="w-4 h-4 text-green-600" />מזג תאים</Button>}
                  <Button size="sm" variant="ghost" onClick={() => setSelectedCells(new Set())} className="gap-2"><X className="w-4 h-4" /></Button>
                </>
              )}
              <Popover><PopoverTrigger asChild><Button size="sm" variant="outline" className="gap-2"><Download className="w-4 h-4" />ייצוא</Button></PopoverTrigger><PopoverContent className="w-48" align="end" dir="rtl"><div className="space-y-2"><Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={exportToCSV}><Download className="w-4 h-4" />CSV</Button><Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={exportToPDF}><Download className="w-4 h-4" />PDF</Button></div></PopoverContent></Popover>
              <Button onClick={clearAllFilters} size="sm" variant={hasActiveFilters ? "default" : "outline"} className="gap-2">{hasActiveFilters ? <><XCircle className="w-4 h-4" />נקה סינון</> : <><Filter className="w-4 h-4" />סינון</>}</Button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input placeholder="חיפוש..." value={globalFilter} onChange={(e) => setGlobalFilter(e.target.value)} className="pr-10" />
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          {showColumnStats && Object.keys(columnStats).length > 0 && (
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-b-2 border-purple-200 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Calculator className="w-5 h-5 text-purple-600" />
                <h3 className="font-bold text-purple-900">סטטיסטיקות</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(columnStats).map(([colKey, stats]) => {
                  const col = visibleColumns.find(c => c.key === colKey);
                  return (
                    <div key={colKey} className="bg-white rounded-lg p-3 border border-purple-200 shadow-sm">
                      <div className="font-semibold text-sm text-slate-700 mb-2">{col?.title}</div>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between"><span className="text-slate-500">סכום:</span><span className="font-bold text-blue-600">{stats.sum.toFixed(2)}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">ממוצע:</span><span className="font-bold text-green-600">{stats.avg.toFixed(2)}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">מינימום:</span><span className="font-bold text-orange-600">{stats.min}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">מקסימום:</span><span className="font-bold text-red-600">{stats.max}</span></div>
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
              <span className="text-green-800">הועתקו {copiedCells.length} תאים - לחץ Ctrl+V</span>
              <button onClick={() => setCopiedCells(null)} className="mr-auto text-green-600 hover:text-green-800"><X className="w-4 h-4" /></button>
            </div>
          )}

          <div className="overflow-auto" style={{ maxHeight: fullScreenMode ? '85vh' : '60vh' }}>
            <DragDropContext onDragEnd={handleDragEnd}>
              <table ref={tableRef} className="w-full" dir="rtl" style={{
                fontFamily: cellFont.value,
                borderCollapse: isSeparateBorders ? 'separate' : 'collapse',
                borderSpacing: isSeparateBorders ? tableCellSpacing : '0',
                borderRadius: tableBorderRadius,
                boxShadow: tableShadow
              }}>
                <Droppable droppableId="columns" direction="horizontal" type="column">
                  {(provided) => (
                    <thead style={{ position: 'sticky', top: 0, zIndex: 25, backgroundColor: palette.headerBg }} ref={provided.innerRef} {...provided.droppableProps}>
                      <tr>
                        <th className="p-3 w-12 sticky right-0 shadow-[2px_0_5px_rgba(0,0,0,0.1)]" style={{ zIndex: 35, backgroundColor: palette.headerBg, borderWidth: isSeparateBorders ? '0' : borderStyle.width, borderStyle: borderStyle.style, borderColor: palette.border, borderRadius: isSeparateBorders ? tableBorderRadius : '0' }}>
                          <GripVertical className="w-4 h-4 mx-auto" style={{ color: palette.headerText }} />
                        </th>
                        {visibleColumns.map((col, colIndex) => {
                          const isEditing = editingColumnKey === col.key;
                          const isSorted = sortColumn === col.key;
                          return (
                            <Draggable key={col.key} draggableId={col.key} index={colIndex} type="column">
                              {(provided, snapshot) => (
                                <th ref={provided.innerRef} {...provided.draggableProps} className={`text-right font-semibold cursor-pointer group ${snapshot.isDragging ? 'opacity-50 shadow-2xl' : ''}`} style={{
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
                                  ...provided.draggableProps.style
                                }} onClick={(e) => !snapshot.isDragging && handleColumnHeaderClick(col.key, e)}>
                                  {isEditing ? (
                                    <Input ref={columnEditRef} value={editingColumnTitle} onChange={(e) => setEditingColumnTitle(e.target.value)} onBlur={saveColumnTitle} onKeyDown={(e) => { if (e.key === 'Enter') saveColumnTitle(); if (e.key === 'Escape') { setEditingColumnKey(null); setEditingColumnTitle(""); } }} className="h-8" autoFocus />
                                  ) : (
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <div {...provided.dragHandleProps} className="opacity-0 group-hover:opacity-100 cursor-grab p-1 hover:bg-blue-100 rounded transition-opacity"><GripVertical className="w-4 h-4 text-slate-400" /></div>
                                        <span>{col.title}</span>
                                      </div>
                                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); handleSort(col.key); }}>{isSorted ? (sortDirection === 'asc' ? <ArrowUp className="w-4 h-4 text-blue-600" /> : <ArrowDown className="w-4 h-4 text-blue-600" />) : <ArrowUpDown className="w-4 h-4 text-slate-400" />}</Button>
                                        <Popover open={popoverOpen === `header_${col.key}`} onOpenChange={(open) => !open && setPopoverOpen(null)}>
                                          <PopoverTrigger asChild>
                                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); setPopoverOpen(`header_${col.key}`); }}><Settings className="w-3 h-3" /></Button>
                                          </PopoverTrigger>
                                          <PopoverContent className="w-56" align="start">
                                            <div className="space-y-2">
                                              <h4 className="font-semibold text-sm mb-3">{col.title}</h4>
                                              <Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={() => { setEditingColumnKey(col.key); setEditingColumnTitle(col.title); setPopoverOpen(null); }}><Edit2 className="w-4 h-4" />שנה שם</Button>
                                              <Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={() => { toggleColumnVisibility(col.key); setPopoverOpen(null); }}><EyeOff className="w-4 h-4" />הסתר</Button>
                                              <Button variant="outline" size="sm" className="w-full justify-start gap-2 text-red-600" onClick={() => { deleteColumn(col.key); setPopoverOpen(null); }}><Trash2 className="w-4 h-4" />מחק</Button>
                                            </div>
                                          </PopoverContent>
                                        </Popover>
                                      </div>
                                    </div>
                                  )}
                                  <div onMouseDown={(e) => handleColumnResizeStart(e, col.key)} className="absolute top-0 bottom-0 cursor-col-resize" style={{ right: '-6px', width: '12px', zIndex: 999 }}>
                                    <div className="absolute inset-y-0 right-1/2 -translate-x-1/2" style={{ width: resizingColumn === col.key ? '4px' : '2px', backgroundColor: resizingColumn === col.key ? '#3b82f6' : '#cbd5e1' }} />
                                  </div>
                                </th>
                              )}
                            </Draggable>
                          );
                        })}
                        {provided.placeholder}
                        <th className="p-3" style={{ width: '120px', backgroundColor: palette.headerBg, color: palette.headerText, fontFamily: headerFont.value, fontSize: headerFontSize, borderWidth: isSeparateBorders ? '0' : borderStyle.width, borderStyle: borderStyle.style, borderColor: palette.border, borderRadius: isSeparateBorders ? tableBorderRadius : '0' }}>פעולות</th>
                      </tr>
                    </thead>
                  )}
                </Droppable>
                <Droppable droppableId="rows">
                  {(provided) => (
                    <tbody ref={provided.innerRef} {...provided.droppableProps}>
                      {filteredAndSortedData.length === 0 ? (
                        <tr><td colSpan={visibleColumns.length + 2} className="text-center py-12 text-slate-500">אין שורות - לחץ "שורה" להוספה</td></tr>
                      ) : (
                        filteredAndSortedData.map((row, rowIndex) => {
                          const rowHeight = rowHeights[row.id] || 40;
                          return (
                            <Draggable key={row.id} draggableId={row.id} index={rowIndex}>
                              {(provided, snapshot) => (
                                <tr ref={provided.innerRef} {...provided.draggableProps} className={snapshot.isDragging ? 'opacity-70 shadow-lg' : ''} style={{ height: `${rowHeight}px`, backgroundColor: rowIndex % 2 === 0 ? palette.cellBg : palette.cellAltBg }}>
                                  <td {...provided.dragHandleProps} className="p-2 cursor-grab sticky right-0 shadow-[2px_0_5px_rgba(0,0,0,0.1)]" style={{ height: `${rowHeight}px`, zIndex: 15, backgroundColor: palette.headerBg, borderWidth: isSeparateBorders ? '0' : borderStyle.width, borderStyle: borderStyle.style, borderColor: palette.border }}>
                                    <GripVertical className="w-4 h-4 mx-auto" style={{ color: palette.headerText }} />
                                    <div onMouseDown={(e) => handleRowResizeStart(e, row.id)} className="absolute left-0 right-0 cursor-row-resize" style={{ bottom: '-4px', height: '8px', backgroundColor: resizingRow === row.id ? '#3b82f6' : '#e2e8f0', zIndex: 999, opacity: 0.3 }} />
                                  </td>
                                  {visibleColumns.map((column, colIndex) => {
                                    const cellKey = `${row.id}_${column.key}`;
                                    const isEditing = editingCell === cellKey;
                                    const isSelected = selectedCells.has(cellKey);
                                    const isClientPicker = showClientPicker === cellKey;
                                    const cellValue = row[column.key] || '';
                                    const cellStyle = cellStyles[cellKey] || {};
                                    const conditionalStyle = getConditionalStyle(column.key, cellValue);
                                    const finalStyle = { ...conditionalStyle, ...cellStyle };
                                    const hasNote = cellNotes[cellKey];

                                    return (
                                      <td 
                                        key={column.key} 
                                        className={`cursor-pointer relative ${isSelected ? 'ring-2 ring-purple-500' : ''} ${isClientPicker ? 'ring-2 ring-blue-500' : ''}`} 
                                        style={{
                                          backgroundColor: isSelected ? palette.selected : (finalStyle.backgroundColor || (rowIndex % 2 === 0 ? palette.cellBg : palette.cellAltBg)),
                                          color: finalStyle.color || palette.cellText,
                                          opacity: finalStyle.opacity ? finalStyle.opacity / 100 : 1,
                                          fontWeight: finalStyle.fontWeight || 'normal',
                                          fontFamily: cellFont.value,
                                          fontSize: cellFontSize,
                                          padding: cellPadding,
                                          height: `${rowHeight}px`,
                                          position: colIndex === 0 ? 'sticky' : 'relative',
                                          right: colIndex === 0 ? '48px' : 'auto',
                                          zIndex: colIndex === 0 ? 10 : 1,
                                          boxShadow: colIndex === 0 ? '2px 0 5px rgba(0,0,0,0.05)' : 'none',
                                          borderWidth: isSeparateBorders ? '0' : borderStyle.width,
                                          borderStyle: borderStyle.style,
                                          borderColor: palette.border,
                                          borderRadius: isSeparateBorders ? tableBorderRadius : '0'
                                        }} 
                                        onClick={(e) => !isEditing && (column.type === 'checkmark' ? handleCheckmarkClick(row.id, column.key, e) : handleCellClick(row.id, column.key, e))} 
                                        onDoubleClick={(e) => handleCellDoubleClick(row.id, column.key, e)}
                                        onMouseDown={(e) => !isEditing && handleCellMouseDown(row.id, column.key, e)} 
                                        onMouseEnter={() => handleCellMouseEnter(row.id, column.key)}
                                      >
                                        {hasNote && (
                                          <div 
                                            className="absolute top-0 right-0 w-0 h-0 z-10 cursor-pointer hover:opacity-80 transition-opacity" 
                                            style={{
                                              borderTop: '14px solid #f59e0b',
                                              borderLeft: '14px solid transparent'
                                            }}
                                            title={cellNotes[cellKey]}
                                            onClick={(e) => handleNoteTriangleClick(cellKey, e)}
                                          />
                                        )}
                                        {column.type === 'checkmark' ? (
                                          <div className="flex items-center justify-center text-2xl font-bold select-none">
                                            {cellValue === '✓' ? <span className="text-green-600">✓</span> : cellValue === '✗' ? <span className="text-red-600">✗</span> : <span className="text-slate-300">○</span>}
                                          </div>
                                        ) : column.type === 'client' ? (
                                          <div className="relative">
                                            {isClientPicker ? (
                                              <div className="absolute top-0 left-0 right-0 z-50 bg-white border-2 border-blue-500 rounded-lg shadow-2xl p-2" style={{ minWidth: '320px' }}>
                                                <div className="flex items-center gap-2 mb-2">
                                                  <Users className="w-4 h-4 text-blue-600" />
                                                  <Input placeholder="חפש..." value={clientSearchQuery} onChange={(e) => setClientSearchQuery(e.target.value)} className="h-8 text-sm" autoFocus dir="rtl" />
                                                  <Button size="sm" variant="ghost" onClick={() => { setShowClientPicker(null); setClientSearchQuery(""); }} className="h-8 w-8 p-0"><X className="w-4 h-4" /></Button>
                                                </div>
                                                <div className="max-h-64 overflow-y-auto border border-slate-200 rounded bg-white">
                                                  {allClients.filter(c => !clientSearchQuery || c.name?.toLowerCase().includes(clientSearchQuery.toLowerCase()) || c.company?.toLowerCase().includes(clientSearchQuery.toLowerCase()) || c.email?.toLowerCase().includes(clientSearchQuery.toLowerCase())).map(client => (
                                                    <button key={client.id} onClick={() => handleClientSelect(row.id, column.key, client)} className="w-full px-3 py-2 hover:bg-blue-50 rounded-lg text-right border-b border-slate-100 last:border-b-0">
                                                      <div className="font-semibold text-sm text-slate-900">{client.name}</div>
                                                      {(client.company || client.phone || client.email) && (
                                                        <div className="text-xs text-slate-500 truncate">{[client.company, client.phone, client.email].filter(Boolean).join(' • ')}</div>
                                                      )}
                                                    </button>
                                                  ))}
                                                  {allClients.filter(c => !clientSearchQuery || c.name?.toLowerCase().includes(clientSearchQuery.toLowerCase()) || c.company?.toLowerCase().includes(clientSearchQuery.toLowerCase()) || c.email?.toLowerCase().includes(clientSearchQuery.toLowerCase())).length === 0 && (
                                                    <div className="text-center py-12 text-slate-500 text-sm">{clientSearchQuery ? 'לא נמצאו לקוחות' : 'אין לקוחות'}</div>
                                                  )}
                                                </div>
                                              </div>
                                            ) : (
                                              <div className="flex items-center gap-2 text-sm">
                                                {cellValue && <Users className="w-4 h-4 text-blue-600" />}
                                                <span className={cellValue ? 'text-slate-900 font-medium' : 'text-slate-400'}>{cellValue || 'בחר...'}</span>
                                              </div>
                                            )}
                                          </div>
                                        ) : isEditing ? (
                                          <Input ref={editInputRef} value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={saveEdit} onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') { setEditingCell(null); setEditValue(""); } }} className="h-8" autoFocus dir="rtl" list={`ac-${column.key}`} />
                                        ) : (
                                          <div className="text-sm">{String(cellValue)}</div>
                                        )}
                                        <datalist id={`ac-${column.key}`}>{getAutoCompleteSuggestions(column.key).map((s, i) => <option key={i} value={s} />)}</datalist>
                                      </td>
                                    );
                                  })}
                                  <td className="p-2" style={{ height: `${rowHeight}px`, backgroundColor: rowIndex % 2 === 0 ? palette.cellBg : palette.cellAltBg, borderWidth: isSeparateBorders ? '0' : borderStyle.width, borderStyle: borderStyle.style, borderColor: palette.border }}>
                                    <div className="flex gap-1 justify-center">
                                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => duplicateRow(row)}><Copy className="w-3 h-3 text-blue-600" /></Button>
                                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => deleteRow(row.id)}><Trash2 className="w-3 h-3 text-red-600" /></Button>
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
            <span className="font-semibold">{filteredAndSortedData.length}/{rowsData.length} שורות</span>
            <span>•</span>
            <span>{visibleColumns.length} עמודות</span>
            {selectedCells.size > 0 && (
              <>
                <span>•</span>
                <span className="text-purple-600 font-semibold">נבחרו {selectedCells.size} תאים</span>
              </>
            )}
          </div>
          <div className="text-slate-400 text-[10px] bg-slate-100 px-2 py-1 rounded">
            💡 לחיצה כפולה על תא לאפשרויות • לחיצה על 🔺 לעריכת הערה • Alt+Click לבחירה מרובה • Shift+גרירה לטווח
          </div>
        </div>
      </Card>

      {/* ✅ תפריט קונטקסט - עם אפשרות לבטל מיזוג */}
      {cellContextMenu && (
        <div 
          ref={contextMenuRef}
          className="fixed z-[60] bg-white border-2 border-slate-300 rounded-lg shadow-2xl"
          style={{
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)'
          }}
        >
          <div className="p-2 space-y-1 min-w-[220px]">
            <div className="px-3 py-2 text-xs font-semibold text-slate-500 border-b">אפשרויות תא</div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-start gap-2 hover:bg-amber-50"
              onClick={() => handleOpenNoteDialog(cellContextMenu)}
            >
              <MessageSquare className="w-4 h-4 text-amber-600" />
              {cellNotes[cellContextMenu] ? 'ערוך הערה' : 'הוסף הערה'}
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-start gap-2 hover:bg-purple-50"
              onClick={() => handleColorSingleCell(cellContextMenu)}
            >
              <Palette className="w-4 h-4 text-purple-600" />
              צבע תא
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-start gap-2 hover:bg-blue-50"
              onClick={() => handleBoldSingleCell(cellContextMenu)}
            >
              <Bold className="w-4 h-4 text-blue-600" />
              {cellStyles[cellContextMenu]?.fontWeight === 'bold' ? 'בטל הדגשה' : 'הדגש'}
            </Button>
            {isCellMerged(cellContextMenu) && (
              <>
                <Separator />
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full justify-start gap-2 hover:bg-orange-50"
                  onClick={() => unmergeCells(cellContextMenu)}
                >
                  <Scissors className="w-4 h-4 text-orange-600" />
                  בטל מיזוג
                </Button>
              </>
            )}
            <Separator />
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-start gap-2 text-slate-500 hover:bg-slate-50"
              onClick={() => setCellContextMenu(null)}
            >
              <X className="w-4 h-4" />
              סגור
            </Button>
          </div>
        </div>
      )}

      <Dialog open={!!noteDialogCell} onOpenChange={(open) => !open && setNoteDialogCell(null)}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-amber-600" />
              {cellNotes[noteDialogCell] ? 'ערוך הערה' : 'הוסף הערה'}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="הקלד הערה..."
              className="min-h-[100px]"
              autoFocus
              dir="rtl"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteDialogCell(null)}>
              ביטול
            </Button>
            <Button onClick={handleSaveNote} className="bg-amber-600 hover:bg-amber-700">
              שמור הערה
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showColorPickerDialog} onOpenChange={(open) => {
        if (!open) {
          setShowColorPickerDialog(false);
          setColorPickerTargetCell(null);
        }
      }}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-purple-600" />
              בחר צבע לתא
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <ColorPicker 
              currentStyle={colorPickerTargetCell ? cellStyles[colorPickerTargetCell] : {}}
              onApply={(style) => {
                if (colorPickerTargetCell) {
                  applyStyleToSelection(style);
                }
                setShowColorPickerDialog(false);
                setColorPickerTargetCell(null);
                setSelectedCells(new Set());
              }} 
            />
          </div>
        </DialogContent>
      </Dialog>

      <ThemeSelector 
        open={showThemeSelector} 
        onClose={() => setShowThemeSelector(false)} 
        currentTheme={currentTheme} 
        onApply={(newTheme) => { 
          setThemeSettings(newTheme); 
          setTimeout(() => saveToBackend(), 100);
        }} 
      />

      <ViewManager 
        open={showViewManager} 
        onClose={() => setShowViewManager(false)} 
        savedViews={savedViews} 
        activeViewId={activeViewId} 
        currentColumns={columns} 
        onSaveView={(view) => { 
          setSavedViews([...savedViews, view]); 
          setTimeout(() => saveToBackend(), 50);
        }} 
        onLoadView={(view) => { 
          setColumns(view.columns); 
          setTimeout(() => saveToBackend(), 50);
        }} 
        onDeleteView={(viewId) => { 
          setSavedViews(savedViews.filter(v => v.id !== viewId)); 
          setTimeout(() => saveToBackend(), 50);
        }} 
        onSetDefault={(viewId) => { 
          setSavedViews(savedViews.map(v => ({ ...v, isDefault: v.id === viewId }))); 
          setTimeout(() => saveToBackend(), 50);
        }} 
      />

      <Dialog open={showAddFromClientDialog} onOpenChange={setShowAddFromClientDialog}>
        <DialogContent className="sm:max-w-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-6 h-6 text-blue-600" />
              בחר לקוח להוספת שורה
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
              💡 <strong>טיפ:</strong> בחר לקוח והמערכת תמלא אוטומטית את השדות
            </div>

            <Input placeholder="חפש לקוח..." value={clientSearchQuery} onChange={(e) => setClientSearchQuery(e.target.value)} className="text-right" dir="rtl" autoFocus />

            <ScrollArea className="h-96 border border-slate-200 rounded-lg">
              <div className="p-2 space-y-1">
                {allClients.filter(c => !clientSearchQuery || c.name?.toLowerCase().includes(clientSearchQuery.toLowerCase()) || c.company?.toLowerCase().includes(clientSearchQuery.toLowerCase()) || c.email?.toLowerCase().includes(clientSearchQuery.toLowerCase())).map(client => (
                  <button key={client.id} onClick={() => addRowFromClient(client)} className="w-full p-4 hover:bg-blue-50 rounded-lg text-right border border-transparent hover:border-blue-200 transition-all group">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-bold text-slate-900 mb-1">{client.name}</div>
                        <div className="space-y-0.5 text-xs text-slate-600">
                          {client.company && <div>🏢 {client.company}</div>}
                          {client.phone && <div>📞 {client.phone}</div>}
                          {client.email && <div>✉️ {client.email}</div>}
                        </div>
                      </div>
                      <div className="opacity-0 group-hover:opacity-100">
                        <div className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-semibold">בחר</div>
                      </div>
                    </div>
                  </button>
                ))}
                {allClients.filter(c => !clientSearchQuery || c.name?.toLowerCase().includes(clientSearchQuery.toLowerCase()) || c.company?.toLowerCase().includes(clientSearchQuery.toLowerCase()) || c.email?.toLowerCase().includes(clientSearchQuery.toLowerCase())).length === 0 && (
                  <div className="text-center py-12 text-slate-500">
                    <Users className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                    <p>{clientSearchQuery ? 'לא נמצאו לקוחות' : 'אין לקוחות'}</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAddFromClientDialog(false); setClientSearchQuery(""); }}>ביטול</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ChartBuilder open={showChartBuilder} onClose={() => { setShowChartBuilder(false); setEditingChart(null); }} columns={columns} rowsData={filteredAndSortedData} onSave={handleSaveChart} editingChart={editingChart} />

      <ColumnsManagerDialog
        open={showColumnsManager}
        onClose={() => setShowColumnsManager(false)}
        columns={columns}
        onSave={(updatedColumns) => {
          setColumns(updatedColumns);
          setTimeout(() => {
            saveToHistory(columnsRef.current, rowsDataRef.current, cellStylesRef.current, cellNotesRef.current);
            saveToBackend();
          }, 50);
          setShowColumnsManager(false);
        }}
      />

      <BulkColumnsDialog
        open={showBulkColumnsDialog}
        onClose={() => setShowBulkColumnsDialog(false)}
        onAdd={addBulkColumns}
      />
    </div>
  );
}

function ColorPicker({ onApply, currentStyle = {} }) {
  const [color, setColor] = useState(currentStyle.backgroundColor || '#ffffff');
  const [hexInput, setHexInput] = useState(currentStyle.backgroundColor || '#ffffff');
  const [opacity, setOpacity] = useState(currentStyle.opacity || 100);
  const [isBold, setIsBold] = useState(currentStyle.fontWeight === 'bold');
  const [textColor, setTextColor] = useState(currentStyle.color || '#000000');
  const [textHexInput, setTextHexInput] = useState(currentStyle.color || '#000000');
  
  const colors = ['#ffffff', '#fee2e2', '#fef3c7', '#d1fae5', '#dbeafe', '#ede9fe', '#fce7f3', '#f3f4f6', '#FCF6E3', '#e0f2f7', '#fff5f0', '#e8f5e9'];
  
  useEffect(() => {
    setHexInput(color);
  }, [color]);
  
  useEffect(() => {
    setTextHexInput(textColor);
  }, [textColor]);
  
  const handleHexChange = (value) => {
    setHexInput(value);
    if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
      setColor(value);
    }
  };
  
  const handleTextHexChange = (value) => {
    setTextHexInput(value);
    if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
      setTextColor(value);
    }
  };
  
  const handleApply = () => {
    const styleToApply = { 
      backgroundColor: color, 
      color: textColor,
      opacity: opacity, 
      fontWeight: isBold ? 'bold' : 'normal' 
    };
    onApply(styleToApply);
  };
  
  return (
    <div className="space-y-4" dir="rtl">
      <div>
        <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
          <Palette className="w-4 h-4" />
          צבע רקע
        </h4>
        <div className="grid grid-cols-4 gap-2 mb-3">
          {colors.map(c => (
            <button 
              key={c} 
              className={`h-10 rounded-lg border-2 transition-all hover:scale-105 ${color === c ? 'ring-2 ring-blue-500 ring-offset-2' : 'border-slate-200'}`} 
              style={{ backgroundColor: c }} 
              onClick={() => setColor(c)}
              title={c}
            />
          ))}
        </div>
        
        <div className="space-y-2">
          <Label className="text-xs text-slate-600">קוד צבע Hex</Label>
          <div className="flex gap-2">
            <Input 
              type="text"
              value={hexInput}
              onChange={(e) => handleHexChange(e.target.value.toUpperCase())}
              placeholder="#FCF6E3"
              className="font-mono text-sm"
              dir="ltr"
            />
            <Input 
              type="color" 
              value={color} 
              onChange={(e) => setColor(e.target.value)} 
              className="w-16 h-10 cursor-pointer"
              title="בחר צבע"
            />
          </div>
          <p className="text-xs text-slate-500">💡 ניתן להזין קוד Hex ישירות (למשל: #FCF6E3)</p>
        </div>
      </div>
      
      <Separator />
      
      <div>
        <h4 className="font-semibold text-sm mb-3">צבע טקסט</h4>
        <div className="flex gap-2 mb-2">
          <Input 
            type="text"
            value={textHexInput}
            onChange={(e) => handleTextHexChange(e.target.value.toUpperCase())}
            placeholder="#000000"
            className="font-mono text-sm"
            dir="ltr"
          />
          <Input 
            type="color" 
            value={textColor} 
            onChange={(e) => setTextColor(e.target.value)} 
            className="w-16 h-10 cursor-pointer"
            title="בחר צבע טקסט"
          />
        </div>
      </div>
      
      <Separator />
      
      <div>
        <h4 className="font-semibold text-sm mb-2">שקיפות: {opacity}%</h4>
        <input 
          type="range" 
          min="0" 
          max="100" 
          value={opacity} 
          onChange={(e) => setOpacity(Number(e.target.value))} 
          className="w-full accent-purple-600"
        />
      </div>
      
      <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg">
        <span className="text-sm font-medium">טקסט מודגש</span>
        <Switch checked={isBold} onCheckedChange={setIsBold} />
      </div>
      
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-4 rounded-lg border-2 border-blue-200">
        <div className="text-xs text-slate-600 mb-2 font-semibold">תצוגה מקדימה:</div>
        <div 
          className="p-3 rounded text-center font-medium"
          style={{ 
            backgroundColor: color, 
            color: textColor,
            opacity: opacity / 100,
            fontWeight: isBold ? 'bold' : 'normal'
          }}
        >
          דוגמת טקסט
        </div>
      </div>
      
      <Button 
        onClick={handleApply} 
        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
      >
        <Palette className="w-4 h-4 ml-2" />
        החל עיצוב
      </Button>
    </div>
  );
}

function Label({ children, className = "" }) {
  return <label className={`text-sm font-medium ${className}`}>{children}</label>;
}
