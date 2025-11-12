import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Trash2, Maximize2, Settings, Save, Palette, Edit2, Copy, Table, Info, Sparkles, Download, Search, Eye, EyeOff, GripVertical, Merge, Split, FileDown, Clock, Zap, Columns, MoreHorizontal, ChevronDown, CheckSquare, MousePointer2, Undo, Redo, History, Upload } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuCheckboxItem, DropdownMenuGroup } from "@/components/ui/dropdown-menu";
import HelpIcon from "@/components/ui/HelpIcon";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import SpreadsheetImporter from "./SpreadsheetImporter";

const COLORS = [
  { name: 'לבן', value: '#FFFFFF', border: '#E5E7EB' },
  { name: 'צהוב', value: '#FEF3C7', border: '#FDE047' },
  { name: 'ירוק', value: '#D1FAE5', border: '#34D399' },
  { name: 'כחול', value: '#DBEAFE', border: '#60A5FA' },
  { name: 'אדום', value: '#FEE2E2', border: '#F87171' },
  { name: 'סגול', value: '#EDE9FE', border: '#A78BFA' },
  { name: 'ורוד', value: '#FCE7F3', border: '#F472B6' },
  { name: 'אפור', value: '#F3F4F6', border: '#9CA3AF' }
];

// History Action Types
const ACTION_TYPES = {
  EDIT_CELL: 'edit_cell',
  DELETE_CELL: 'delete_cell',
  DELETE_CELLS: 'delete_cells',
  ADD_ROW: 'add_row',
  DELETE_ROW: 'delete_row',
  DELETE_ROWS: 'delete_rows',
  DUPLICATE_ROW: 'duplicate_row',
  ADD_COLUMN: 'add_column',
  DELETE_COLUMN: 'delete_column',
  RENAME_COLUMN: 'rename_column',
  REORDER_COLUMNS: 'reorder_columns',
  TOGGLE_COLUMN_VISIBILITY: 'toggle_column_visibility',
  APPLY_CELL_STYLE: 'apply_cell_style',
  APPLY_COLUMN_STYLE: 'apply_column_style',
  APPLY_HEADER_STYLE: 'apply_header_style',
  APPLY_SUBHEADER_STYLE: 'apply_subheader_style',
  APPLY_BULK_STYLE: 'apply_bulk_style',
  MERGE_COLUMNS: 'merge_columns',
  SPLIT_COLUMN: 'split_column',
  EDIT_SUBHEADER: 'edit_subheader',
  TOGGLE_SUBHEADERS: 'toggle_subheaders'
};

// Helper function to create action descriptions
function getActionDescription(action) {
  if (!action) return 'פעולה לא ידועה';
  
  const descriptions = {
    [ACTION_TYPES.EDIT_CELL]: 'עריכת תא',
    [ACTION_TYPES.DELETE_CELL]: 'מחיקת תא',
    [ACTION_TYPES.DELETE_CELLS]: `מחיקת ${action.payload?.count || 0} תאים`,
    [ACTION_TYPES.ADD_ROW]: 'הוספת שורה',
    [ACTION_TYPES.DELETE_ROW]: 'מחיקת שורה',
    [ACTION_TYPES.DELETE_ROWS]: `מחיקת ${action.payload?.count || 0} שורות`,
    [ACTION_TYPES.DUPLICATE_ROW]: 'שכפול שורה',
    [ACTION_TYPES.ADD_COLUMN]: `הוספת עמודה: ${action.payload?.column?.title || ''}`,
    [ACTION_TYPES.DELETE_COLUMN]: `מחיקת עמודה: ${action.payload?.column?.title || ''}`,
    [ACTION_TYPES.RENAME_COLUMN]: `שינוי שם עמודה`,
    [ACTION_TYPES.REORDER_COLUMNS]: 'סידור מחדש של עמודות',
    [ACTION_TYPES.TOGGLE_COLUMN_VISIBILITY]: 'שינוי נראות עמודה',
    [ACTION_TYPES.APPLY_CELL_STYLE]: 'שינוי עיצוב תא',
    [ACTION_TYPES.APPLY_COLUMN_STYLE]: 'שינוי עיצוב עמודה',
    [ACTION_TYPES.APPLY_HEADER_STYLE]: 'שינוי עיצוב כותרת',
    [ACTION_TYPES.APPLY_SUBHEADER_STYLE]: 'שינוי עיצוב כותרת משנה',
    [ACTION_TYPES.APPLY_BULK_STYLE]: `שינוי עיצוב ל-${action.payload?.count || 0} תאים`,
    [ACTION_TYPES.MERGE_COLUMNS]: 'מיזוג עמודות',
    [ACTION_TYPES.SPLIT_COLUMN]: 'פיצול עמודה',
    [ACTION_TYPES.EDIT_SUBHEADER]: 'עריכת כותרת משנה',
    [ACTION_TYPES.TOGGLE_SUBHEADERS]: action.payload?.newEnabled ? 'הצגת כותרות משנה' : 'הסתרת כותרות משנה'
  };
  
  return descriptions[action.type] || 'פעולה לא ידועה';
}

function ColorPicker({ onApply, currentStyle = {}, onClose }) {
  const [selectedColor, setSelectedColor] = useState(currentStyle.backgroundColor || '#FFFFFF');
  const [opacity, setOpacity] = useState(currentStyle.opacity !== undefined ? currentStyle.opacity : 100);
  const [isBold, setIsBold] = useState(currentStyle.fontWeight === 'bold');

  const handleApply = () => {
    const style = {
      backgroundColor: selectedColor,
      opacity: opacity,
      fontWeight: isBold ? 'bold' : 'normal',
      borderColor: selectedColor
    };
    onApply(style);
    if (onClose) onClose();
  };

  return (
    <div className="space-y-4 p-4 w-80" dir="rtl" onClick={(e) => e.stopPropagation()}>
      <div>
        <h4 className="font-semibold text-sm mb-3">בחר צבע</h4>
        <div className="grid grid-cols-4 gap-2 mb-3">
          {COLORS.map((color) => (
            <button
              key={color.value}
              type="button"
              className={`h-10 rounded-lg border-2 hover:scale-110 transition-transform ${
                selectedColor === color.value ? 'ring-2 ring-blue-500 ring-offset-2' : ''
              }`}
              style={{
                backgroundColor: color.value,
                borderColor: color.border
              }}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedColor(color.value);
              }}
              title={color.name}
            />
          ))}
        </div>
        
        <Input
          type="color"
          value={selectedColor}
          onChange={(e) => {
            e.stopPropagation();
            setSelectedColor(e.target.value);
          }}
          onClick={(e) => e.stopPropagation()}
          className="w-full h-10 cursor-pointer rounded-lg"
        />
      </div>

      <div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium">שקיפות</span>
          <Badge variant="outline" className="text-xs">{opacity}%</Badge>
        </div>
        <Slider
          value={[opacity]}
          onValueChange={(values) => setOpacity(values[0])}
          min={0}
          max={100}
          step={5}
          className="w-full"
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
        <span className="text-sm font-medium">טקסט מודגש</span>
        <Switch
          checked={isBold}
          onCheckedChange={setIsBold}
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      <Separator />

      <Button
        onClick={(e) => {
          e.stopPropagation();
          handleApply();
        }}
        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
      >
        <Sparkles className="w-4 h-4 ml-2" />
        החל סגנון
      </Button>
    </div>
  );
}

// Context Menu Component
function ContextMenu({ x, y, onClose, children }) {
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };

    const handleScroll = () => onClose();

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('wheel', handleScroll);
    document.addEventListener('contextmenu', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('wheel', handleScroll);
      document.removeEventListener('contextmenu', handleClickOutside);
    };
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="fixed z-[9999] bg-white rounded-xl shadow-2xl border-2 border-slate-200 py-2 min-w-[200px] animate-in fade-in-0 zoom-in-95"
      style={{
        left: `${x}px`,
        top: `${y}px`
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  );
}

function ContextMenuItem({ icon: Icon, label, onClick, danger = false, disabled = false }) {
  return (
    <button
      className={`w-full px-4 py-2.5 text-right flex items-center gap-3 transition-colors ${
        danger
          ? 'text-red-600 hover:bg-red-50'
          : disabled
          ? 'text-slate-300 cursor-not-allowed'
          : 'text-slate-700 hover:bg-slate-50'
      }`}
      onClick={onClick}
      disabled={disabled}
    >
      <Icon className="w-4 h-4" />
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}

// Floating Action Bar Component
function FloatingActionBar({ selectedCount, actions, onClear }) {
  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-5">
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-2xl shadow-2xl px-6 py-4 flex items-center gap-4 border-2 border-white/20">
        <Badge variant="secondary" className="bg-white/20 text-white border-white/30 px-3 py-1">
          <CheckSquare className="w-4 h-4 ml-1" />
          {selectedCount} נבחרו
        </Badge>
        
        <Separator orientation="vertical" className="h-8 bg-white/30" />
        
        <div className="flex items-center gap-2">
          {actions}
        </div>
        
        <Separator orientation="vertical" className="h-8 bg-white/30" />
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="text-white hover:bg-white/20 gap-2"
        >
          <X className="w-4 h-4" />
          בטל
        </Button>
      </div>
    </div>
  );
}

export default function GenericSpreadsheet({ spreadsheet, onUpdate, fullScreenMode = false }) {
  const [columns, setColumns] = useState(spreadsheet?.columns || []);
  const [rowsData, setRowsData] = useState(spreadsheet?.rows_data || []);
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [cellStyles, setCellStyles] = useState(spreadsheet?.cell_styles || {});
  const [showSubHeaders, setShowSubHeaders] = useState(spreadsheet?.show_sub_headers || false);
  const [subHeaders, setSubHeaders] = useState(spreadsheet?.sub_headers || {});
  
  // History Management
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  // UI States
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showColumnDialog, setShowColumnDialog] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [selectedCells, setSelectedCells] = useState(new Set());
  const [selectedHeaders, setSelectedHeaders] = useState(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const [editingSubHeader, setEditingSubHeader] = useState(null);
  const [tempSubHeaderValue, setTempSubHeaderValue] = useState('');
  const [editingColumnKey, setEditingColumnKey] = useState(null);
  const [editingColumnTitle, setEditingColumnTitle] = useState("");
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [showImporter, setShowImporter] = useState(false);
  
  // Context Menu States
  const [contextMenu, setContextMenu] = useState(null);
  
  // Column Dialog State
  const [newColumn, setNewColumn] = useState({
    key: '',
    title: '',
    width: '150px',
    type: 'text',
    visible: true,
    required: false
  });
  
  // Settings
  const [autoSave, setAutoSave] = useState(true);
  const [autoCloseEdit, setAutoCloseEdit] = useState(true);

  const editInputRef = useRef(null);
  const columnEditRef = useRef(null);
  const tableContainerRef = useRef(null);

  // Add action to history
  const addToHistory = useCallback((action) => {
    setHistory(prev => {
      // Remove any actions after current index (for redo)
      const newHistory = prev.slice(0, historyIndex + 1);
      // Add new action
      newHistory.push({
        ...action,
        timestamp: new Date().toISOString()
      });
      // Limit history to 100 actions
      if (newHistory.length > 100) {
        newHistory.shift();
        setHistoryIndex(99);
      } else {
        setHistoryIndex(newHistory.length - 1);
      }
      return newHistory;
    });
  }, [historyIndex]);

  // Undo function
  const undo = useCallback(() => {
    if (historyIndex < 0) {
      toast.info('אין פעולות לביטול');
      return;
    }

    const action = history[historyIndex];
    
    // Apply reverse action based on type
    switch (action.type) {
      case ACTION_TYPES.EDIT_CELL:
        setRowsData(prev => prev.map(row => 
          row.id === action.payload.rowId 
            ? { ...row, [action.payload.columnKey]: action.payload.oldValue }
            : row
        ));
        break;
        
      case ACTION_TYPES.DELETE_CELL:
        setRowsData(prev => prev.map(row => 
          row.id === action.payload.rowId 
            ? { ...row, [action.payload.columnKey]: action.payload.oldValue }
            : row
        ));
        break;
        
      case ACTION_TYPES.DELETE_CELLS:
        setRowsData(prev => {
          const updatedRows = [...prev];
          action.payload.cells.forEach(({ rowId, columnKey, oldValue }) => {
            const rowIndex = updatedRows.findIndex(r => r.id === rowId);
            if (rowIndex !== -1) {
              updatedRows[rowIndex] = {
                ...updatedRows[rowIndex],
                [columnKey]: oldValue
              };
            }
          });
          return updatedRows;
        });
        break;
        
      case ACTION_TYPES.ADD_ROW:
        setRowsData(prev => prev.filter(row => row.id !== action.payload.row.id));
        break;
        
      case ACTION_TYPES.DELETE_ROW:
        setRowsData(prev => {
          const newRows = [...prev];
          newRows.splice(action.payload.index, 0, action.payload.row);
          return newRows;
        });
        break;
        
      case ACTION_TYPES.DELETE_ROWS:
        setRowsData(action.payload.oldRowsData); // Restore full previous state
        break;
        
      case ACTION_TYPES.DUPLICATE_ROW:
        setRowsData(prev => prev.filter(row => row.id !== action.payload.newRow.id));
        break;
        
      case ACTION_TYPES.ADD_COLUMN:
        setColumns(prev => prev.filter(col => col.key !== action.payload.column.key));
        break;
        
      case ACTION_TYPES.DELETE_COLUMN:
        setColumns(action.payload.oldColumns); // Restore columns array
        setRowsData(action.payload.oldRowsData); // Restore rows data
        setCellStyles(prev => { // Merge old column styles back
          const newStyles = { ...prev };
          for (const key in action.payload.oldColumnStyles) {
            newStyles[key] = action.payload.oldColumnStyles[key];
          }
          return newStyles;
        });
        break;
        
      case ACTION_TYPES.RENAME_COLUMN:
        setColumns(prev => prev.map(col =>
          col.key === action.payload.columnKey
            ? { ...col, title: action.payload.oldTitle }
            : col
        ));
        break;
        
      case ACTION_TYPES.REORDER_COLUMNS:
        setColumns(action.payload.oldColumns);
        break;
        
      case ACTION_TYPES.TOGGLE_COLUMN_VISIBILITY:
        setColumns(prev => prev.map(col =>
          col.key === action.payload.columnKey
            ? { ...col, visible: action.payload.oldVisible }
            : col
        ));
        break;
        
      case ACTION_TYPES.APPLY_CELL_STYLE:
        setCellStyles(prev => {
          const newStyles = { ...prev };
          if (action.payload.oldStyle) {
            newStyles[action.payload.cellKey] = action.payload.oldStyle;
          } else {
            delete newStyles[action.payload.cellKey];
          }
          return newStyles;
        });
        break;
        
      case ACTION_TYPES.APPLY_BULK_STYLE:
      case ACTION_TYPES.APPLY_COLUMN_STYLE:
        setCellStyles(action.payload.oldCellStylesSnapshot);
        break;
        
      case ACTION_TYPES.APPLY_HEADER_STYLE:
        setCellStyles(prev => {
          const newStyles = { ...prev };
          const key = `header_${action.payload.columnKey}`;
          if (action.payload.oldStyle) {
            newStyles[key] = action.payload.oldStyle;
          } else {
            delete newStyles[key];
          }
          return newStyles;
        });
        break;
        
      case ACTION_TYPES.APPLY_SUBHEADER_STYLE:
        setCellStyles(prev => {
          const newStyles = { ...prev };
          const key = `subheader_${action.payload.columnKey}`;
          if (action.payload.oldStyle) {
            newStyles[key] = action.payload.oldStyle;
          } else {
            delete newStyles[key];
          }
          return newStyles;
        });
        break;
        
      case ACTION_TYPES.MERGE_COLUMNS:
        setColumns(action.payload.oldColumns);
        setRowsData(action.payload.oldRowsData);
        setCellStyles(action.payload.oldCellStylesSnapshot);
        break;
        
      case ACTION_TYPES.SPLIT_COLUMN:
        setColumns(action.payload.oldColumns);
        break;
        
      case ACTION_TYPES.EDIT_SUBHEADER:
        setSubHeaders(prev => ({
          ...prev,
          [action.payload.columnKey]: action.payload.oldValue
        }));
        break;
        
      case ACTION_TYPES.TOGGLE_SUBHEADERS:
        setShowSubHeaders(action.payload.oldEnabled);
        setSubHeaders(action.payload.oldSubHeaders);
        break;
    }
    
    setHistoryIndex(historyIndex - 1);
    toast.success('✓ פעולה בוטלה');
  }, [history, historyIndex]); // Dependencies should be specific to what state `undo` changes

  // Redo function
  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1) {
      toast.info('אין פעולות לשחזור');
      return;
    }

    const action = history[historyIndex + 1];
    
    // Apply action based on type
    switch (action.type) {
      case ACTION_TYPES.EDIT_CELL:
        setRowsData(prev => prev.map(row => 
          row.id === action.payload.rowId 
            ? { ...row, [action.payload.columnKey]: action.payload.newValue }
            : row
        ));
        break;
        
      case ACTION_TYPES.DELETE_CELL:
        setRowsData(prev => prev.map(row => 
          row.id === action.payload.rowId 
            ? { ...row, [action.payload.columnKey]: '' }
            : row
        ));
        break;
        
      case ACTION_TYPES.DELETE_CELLS:
        setRowsData(prev => {
          const updatedRows = [...prev];
          action.payload.cells.forEach(({ rowId, columnKey }) => {
            const rowIndex = updatedRows.findIndex(r => r.id === rowId);
            if (rowIndex !== -1) {
              updatedRows[rowIndex] = {
                ...updatedRows[rowIndex],
                [columnKey]: ''
              };
            }
          });
          return updatedRows;
        });
        break;
        
      case ACTION_TYPES.ADD_ROW:
        setRowsData(prev => [...prev, action.payload.row]);
        break;
        
      case ACTION_TYPES.DELETE_ROW:
        setRowsData(prev => prev.filter(row => row.id !== action.payload.row.id));
        break;
        
      case ACTION_TYPES.DELETE_ROWS:
        // Filter out the deleted rows from the state that existed before the undo
        setRowsData(prev => prev.filter(row =>
          !action.payload.deletedRows.some(deletedRow => deletedRow.id === row.id)
        ));
        break;
        
      case ACTION_TYPES.DUPLICATE_ROW:
        setRowsData(prev => [...prev, action.payload.newRow]);
        break;
        
      case ACTION_TYPES.ADD_COLUMN:
        setColumns(prev => [...prev, action.payload.column]);
        break;
        
      case ACTION_TYPES.DELETE_COLUMN:
        setColumns(prev => prev.filter(col => col.key !== action.payload.column.key));
        setRowsData(prev => prev.map(row => {
          const { [action.payload.column.key]: _, ...rest } = row;
          return rest;
        }));
        setCellStyles(prevStyles => {
          const newStyles = { ...prevStyles };
          const colRelatedStyleKeys = Object.keys(prevStyles).filter(key =>
            key.endsWith(`_${action.payload.column.key}`) || key === `header_${action.payload.column.key}` || key === `subheader_${action.payload.column.key}`
          );
          colRelatedStyleKeys.forEach(key => delete newStyles[key]);
          return newStyles;
        });
        break;
        
      case ACTION_TYPES.RENAME_COLUMN:
        setColumns(prev => prev.map(col =>
          col.key === action.payload.columnKey
            ? { ...col, title: action.payload.newTitle }
            : col
        ));
        break;
        
      case ACTION_TYPES.REORDER_COLUMNS:
        setColumns(action.payload.newColumns);
        break;
        
      case ACTION_TYPES.TOGGLE_COLUMN_VISIBILITY:
        setColumns(prev => prev.map(col =>
          col.key === action.payload.columnKey
            ? { ...col, visible: action.payload.newVisible }
            : col
        ));
        break;
        
      case ACTION_TYPES.APPLY_CELL_STYLE:
        setCellStyles(prev => ({
          ...prev,
          [action.payload.cellKey]: action.payload.newStyle
        }));
        break;
        
      case ACTION_TYPES.APPLY_BULK_STYLE:
        setCellStyles(prev => {
          const newStyles = { ...prev };
          action.payload.selectedCellKeys.forEach(key => {
            newStyles[key] = action.payload.newStyle;
          });
          return newStyles;
        });
        break;
        
      case ACTION_TYPES.APPLY_COLUMN_STYLE:
        setCellStyles(prev => {
          const newStyles = { ...prev };
          action.payload.affectedCellKeys.forEach(key => {
            newStyles[key] = action.payload.newStyle;
          });
          return newStyles;
        });
        break;
        
      case ACTION_TYPES.APPLY_HEADER_STYLE:
        setCellStyles(prev => ({
          ...prev,
          [`header_${action.payload.columnKey}`]: action.payload.newStyle
        }));
        break;
        
      case ACTION_TYPES.APPLY_SUBHEADER_STYLE:
        setCellStyles(prev => ({
          ...prev,
          [`subheader_${action.payload.columnKey}`]: action.payload.newStyle
        }));
        break;
        
      case ACTION_TYPES.MERGE_COLUMNS:
        setColumns(action.payload.newColumns);
        setRowsData(action.payload.newRowsData);
        setCellStyles(action.payload.newCellStyles);
        break;
        
      case ACTION_TYPES.SPLIT_COLUMN:
        setColumns(action.payload.newColumns);
        break;
        
      case ACTION_TYPES.EDIT_SUBHEADER:
        setSubHeaders(prev => ({
          ...prev,
          [action.payload.columnKey]: action.payload.newValue
        }));
        break;
        
      case ACTION_TYPES.TOGGLE_SUBHEADERS:
        setShowSubHeaders(action.payload.newEnabled);
        setSubHeaders(action.payload.newSubHeaders);
        break;
    }
    
    setHistoryIndex(historyIndex + 1);
    toast.success('✓ פעולה שוחזרה');
  }, [history, historyIndex]); // Dependencies should be specific to what state `redo` changes

  const saveToBackend = useCallback(async () => {
    if (!spreadsheet?.id) return;
    
    try {
      await base44.entities.CustomSpreadsheet.update(spreadsheet.id, {
        columns,
        rows_data: rowsData,
        cell_styles: cellStyles,
        show_sub_headers: showSubHeaders,
        sub_headers: subHeaders
      });
      
      if (onUpdate) onUpdate();
      toast.success('✓ הטבלה נשמרה');
    } catch (error) {
      console.error('Error saving spreadsheet:', error);
      toast.error('שגיאה בשמירה');
    }
  }, [spreadsheet, columns, rowsData, cellStyles, showSubHeaders, subHeaders, onUpdate]);

  // Keyboard shortcuts for undo/redo/save
  useEffect(() => {
    const handleKeyboard = (e) => {
      // Ctrl+Z or Cmd+Z = Undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      // Ctrl+Y or Cmd+Y or Ctrl+Shift+Z = Redo
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
      // Ctrl+S = Save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveToBackend();
      }
      // F1 = Show/Hide Shortcuts
      if (e.key === 'F1') {
        e.preventDefault();
        setShowShortcuts(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, [undo, redo, saveToBackend]);

  useEffect(() => {
    if (spreadsheet) {
      setColumns(spreadsheet.columns || []);
      setRowsData(spreadsheet.rows_data || []);
      setCellStyles(spreadsheet.cell_styles || {});
      setShowSubHeaders(spreadsheet.show_sub_headers || false);
      setSubHeaders(spreadsheet.sub_headers || {});
      // Reset history when a new spreadsheet is loaded
      setHistory([]);
      setHistoryIndex(-1);
    }
  }, [spreadsheet]);

  useEffect(() => {
    if (editingColumnKey && columnEditRef.current) {
      columnEditRef.current.focus();
    }
  }, [editingColumnKey]);

  useEffect(() => {
    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
      }
    };
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, [isDragging]);

  // Close context menu on any click or scroll
  useEffect(() => {
    const closeMenu = () => setContextMenu(null);
    window.addEventListener('click', closeMenu);
    window.addEventListener('scroll', closeMenu, true);
    return () => {
      window.removeEventListener('click', closeMenu);
      window.removeEventListener('scroll', closeMenu, true);
    };
  }, []);

  const visibleColumns = useMemo(() => {
    return columns.filter((col) => col.visible !== false);
  }, [columns]);

  const filteredRows = useMemo(() => {
    if (!searchTerm) return rowsData;
    
    const search = searchTerm.toLowerCase();
    return rowsData.filter(row => {
      return Object.values(row).some(val => 
        String(val).toLowerCase().includes(search)
      );
    });
  }, [rowsData, searchTerm]);

  const addNewRow = () => {
    const newRow = { id: `row_${Date.now()}` };
    setRowsData(prev => [...prev, newRow]);
    
    addToHistory({
      type: ACTION_TYPES.ADD_ROW,
      payload: { row: newRow }
    });
    
    if (autoSave) saveToBackend();
    toast.success('✓ שורה נוספה');
  };

  const addNewColumn = () => {
    if (!newColumn.title.trim()) {
      toast.error('נא להזין שם לעמודה');
      return;
    }

    const colKey = newColumn.key || `col_${Date.now()}`;
    const col = { ...newColumn, key: colKey };

    setColumns(prev => [...prev, col]);
    
    addToHistory({
      type: ACTION_TYPES.ADD_COLUMN,
      payload: { column: col }
    });
    
    setShowColumnDialog(false);
    setNewColumn({
      key: '',
      title: '',
      width: '150px',
      type: 'text',
      visible: true,
      required: false
    });
    
    if (autoSave) saveToBackend();
    toast.success('✓ עמודה נוספה');
  };

  const addQuickColumn = () => {
    const columnName = prompt('שם העמודה החדשה:');
    if (!columnName) return;

    const newCol = {
      key: `col_${Date.now()}`,
      title: columnName,
      width: '150px',
      type: 'text',
      required: false,
      visible: true
    };

    setColumns(prev => [...prev, newCol]);
    
    addToHistory({
      type: ACTION_TYPES.ADD_COLUMN,
      payload: { column: newCol }
    });
    
    if (autoSave) saveToBackend();
    toast.success(`✓ עמודה "${columnName}" נוספה`);
  };

  const deleteColumn = (columnKey) => {
    const column = columns.find(c => c.key === columnKey);
    if (!column || column.required) {
      toast.error('לא ניתן למחוק עמודה זו');
      return;
    }
    
    if (!confirm(`למחוק את העמודה "${column.title}"?`)) return;
    
    const columnIndex = columns.findIndex(c => c.key === columnKey);
    const oldColumns = [...columns]; // Snapshot of columns array
    const oldRowsData = JSON.parse(JSON.stringify(rowsData)); // Deep copy for full row state
    const oldColumnStyles = {}; // Store only styles related to this column
    const colRelatedStyleKeys = Object.keys(cellStyles).filter(key =>
      key.endsWith(`_${columnKey}`) || key === `header_${columnKey}` || key === `subheader_${columnKey}`
    );
    colRelatedStyleKeys.forEach(key => { oldColumnStyles[key] = cellStyles[key]; });

    // Apply changes
    setColumns(prev => prev.filter((c) => c.key !== columnKey));
    
    const updatedRows = rowsData.map(row => {
      const { [columnKey]: _, ...rest } = row;
      return rest;
    });
    setRowsData(updatedRows);
    
    setCellStyles(prevStyles => {
      const newStyles = { ...prevStyles };
      colRelatedStyleKeys.forEach(key => delete newStyles[key]);
      return newStyles;
    });
    
    addToHistory({
      type: ACTION_TYPES.DELETE_COLUMN,
      payload: {
        column,
        index: columnIndex,
        oldColumns,
        oldRowsData,
        oldColumnStyles
      }
    });
    
    if (autoSave) saveToBackend();
    toast.success('✓ עמודה נמחקה');
  };

  const deleteRow = (rowId) => {
    if (!confirm('למחוק שורה זו?')) return;
    
    const rowIndex = rowsData.findIndex(r => r.id === rowId);
    const row = rowsData[rowIndex];
    
    setRowsData(prev => prev.filter((r) => r.id !== rowId));
    
    addToHistory({
      type: ACTION_TYPES.DELETE_ROW,
      payload: { row, index: rowIndex }
    });
    
    if (autoSave) saveToBackend();
    toast.success('✓ שורה נמחקה');
  };

  const duplicateRow = (row) => {
    const { id, ...data } = row;
    const newRow = { ...data, id: `row_${Date.now()}` };
    setRowsData(prev => [...prev, newRow]);
    
    addToHistory({
      type: ACTION_TYPES.DUPLICATE_ROW,
      payload: { originalRow: row, newRow }
    });
    
    if (autoSave) saveToBackend();
    toast.success('✓ שורה הועתקה');
  };

  const deleteSelectedRows = () => {
    if (selectedRows.size === 0) return;
    if (!confirm(`למחוק ${selectedRows.size} שורות?`)) return;
    
    const rowsToDelete = rowsData.filter(row => selectedRows.has(row.id));
    const oldRowsData = [...rowsData]; // Snapshot of rowsData before deletion
    
    setRowsData(prev => prev.filter(row => !selectedRows.has(row.id)));
    
    addToHistory({
      type: ACTION_TYPES.DELETE_ROWS,
      payload: { deletedRows: rowsToDelete, oldRowsData, count: rowsToDelete.length }
    });
    
    setSelectedRows(new Set());
    if (autoSave) saveToBackend();
    toast.success(`✓ ${rowsToDelete.length} שורות נמחקו`);
  };

  const deleteSelectedCells = async () => {
    if (selectedCells.size === 0) return;
    
    if (!confirm(`למחוק תוכן ${selectedCells.size} תאים?`)) return;
    
    const cellsArray = Array.from(selectedCells);
    const cellsData = cellsArray.map(cellKey => {
      const [rowId, columnKey] = cellKey.split('_');
      const row = rowsData.find(r => r.id === rowId);
      return {
        rowId,
        columnKey,
        oldValue: row?.[columnKey] || ''
      };
    });
    
    const updatedRows = [...rowsData];
    
    for (const cellKey of cellsArray) {
      const [rowId, columnKey] = cellKey.split('_');
      const rowIndex = updatedRows.findIndex(r => r.id === rowId);
      if (rowIndex !== -1) {
        updatedRows[rowIndex] = {
          ...updatedRows[rowIndex],
          [columnKey]: ''
        };
      }
    }
    
    setRowsData(updatedRows);
    
    addToHistory({
      type: ACTION_TYPES.DELETE_CELLS,
      payload: { cells: cellsData, count: cellsData.length }
    });
    
    setSelectedCells(new Set());
    if (autoSave) saveToBackend();
    toast.success(`✓ ${cellsArray.length} תאים נמחקו`);
  };

  const toggleRowSelection = (rowId) => {
    const newSelection = new Set(selectedRows);
    if (newSelection.has(rowId)) {
      newSelection.delete(rowId);
    } else {
      newSelection.add(rowId);
    }
    setSelectedRows(newSelection);
  };

  const selectAllRows = () => {
    if (selectedRows.size === filteredRows.length && filteredRows.length > 0) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(filteredRows.map(r => r.id)));
    }
  };

  // Cell click handler (left click only)
  const handleCellClick = (rowId, columnKey, event) => {
    // Alt + Click = multi-select
    if (event.altKey) {
      event.preventDefault();
      event.stopPropagation();
      const cellKey = `${rowId}_${columnKey}`;
      setSelectedCells((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(cellKey)) {
          newSet.delete(cellKey);
        } else {
          newSet.add(cellKey);
        }
        return newSet;
      });
      setIsDragging(true);
      return;
    }

    // Regular click = edit
    const column = columns.find((c) => c.key === columnKey);
    if (!column) return;

    const row = rowsData.find((r) => r.id === rowId);
    if (!row) return;

    const currentValue = row[columnKey] || '';
    setEditingCell(`${rowId}_${columnKey}`);
    setEditValue(String(currentValue));
    setTimeout(() => editInputRef.current?.focus(), 0);
  };

  // Right-click handler for cells
  const handleCellContextMenu = (rowId, columnKey, event) => {
    event.preventDefault();
    event.stopPropagation();
    
    const cellKey = `${rowId}_${columnKey}`;
    const row = rowsData.find(r => r.id === rowId);
    const column = columns.find(c => c.key === columnKey);
    const cellValue = row?.[columnKey] || '';
    const cellStyle = cellStyles[cellKey] || {};
    
    setContextMenu({
      type: 'cell',
      x: event.clientX,
      y: event.clientY,
      cellKey,
      rowId,
      columnKey,
      cellValue,
      cellStyle,
      row,
      column
    });
  };

  // Right-click handler for column headers
  const handleHeaderContextMenu = (columnKey, event) => {
    event.preventDefault();
    event.stopPropagation();
    
    const column = columns.find(c => c.key === columnKey);
    const headerStyle = cellStyles[`header_${column.key}`] || {};
    
    setContextMenu({
      type: 'header',
      x: event.clientX,
      y: event.clientY,
      columnKey,
      column,
      headerStyle
    });
  };

  // Right-click handler for rows
  const handleRowContextMenu = (rowId, event) => {
    event.preventDefault();
    event.stopPropagation();
    
    const row = rowsData.find(r => r.id === rowId);
    
    setContextMenu({
      type: 'row',
      x: event.clientX,
      y: event.clientY,
      rowId,
      row
    });
  };

  const handleCellMouseEnter = (rowId, columnKey, event) => {
    if (event.altKey && isDragging) {
      event.preventDefault();
      const cellKey = `${rowId}_${columnKey}`;
      setSelectedCells((prev) => {
        const newSet = new Set(prev);
        if (!newSet.has(cellKey)) {
          newSet.add(cellKey);
        }
        return newSet;
      });
    }
  };

  const handleColumnClick = (columnKey, event) => {
    const column = columns.find((c) => c.key === columnKey);
    if (!column) return;

    // Alt+Shift+Click = select header
    if (event.altKey && event.shiftKey) {
      event.preventDefault();
      event.stopPropagation();
      setSelectedHeaders((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(columnKey)) {
          newSet.delete(columnKey);
        } else {
          newSet.add(columnKey);
        }
        return newSet;
      });
      return;
    }

    // Alt+Click = select entire column
    if (event.altKey) {
      event.preventDefault();
      event.stopPropagation();
      const columnCells = filteredRows.map((r) => `${r.id}_${columnKey}`);
      setSelectedCells((prev) => {
        const newSet = new Set(prev);
        const allSelected = columnCells.every((cell) => newSet.has(cell));
        if (allSelected) {
          columnCells.forEach((cell) => newSet.delete(cell));
        } else {
          columnCells.forEach((cell) => newSet.add(cell));
        }
        return newSet;
      });
      return;
    }

    // Regular click = edit title
    if (!column.required && !editingColumnKey) {
      setEditingColumnKey(column.key);
      setEditingColumnTitle(column.title);
    }
  };

  const saveEdit = async () => {
    if (!editingCell) return;
    
    const [rowId, columnKey] = editingCell.split('_');
    const row = rowsData.find(r => r.id === rowId);
    const oldValue = row?.[columnKey] || '';
    
    // Only save if value actually changed
    if (String(oldValue) === editValue) {
      if (autoCloseEdit) {
        setEditingCell(null);
        setEditValue("");
      }
      return;
    }

    const updatedRows = rowsData.map((row) => {
      if (row.id === rowId) {
        return { ...row, [columnKey]: editValue };
      }
      return row;
    });

    setRowsData(updatedRows);
    
    addToHistory({
      type: ACTION_TYPES.EDIT_CELL,
      payload: {
        rowId,
        columnKey,
        oldValue,
        newValue: editValue
      }
    });
    
    if (autoCloseEdit) {
      setEditingCell(null);
      setEditValue("");
    }

    // ✅ תמיד שמור - גם אם autoSave כבוי
    try {
      await saveToBackend();
      console.log('✅ Cell saved successfully');
    } catch (error) {
      console.error('❌ Error saving cell:', error);
      toast.error('שגיאה בשמירת התא');
    }
  };

  const saveColumnTitle = () => {
    if (!editingColumnKey || !editingColumnTitle.trim()) {
      setEditingColumnKey(null);
      setEditingColumnTitle("");
      return;
    }

    const column = columns.find(c => c.key === editingColumnKey);
    const oldTitle = column?.title || '';
    
    // Only save if title actually changed
    if (oldTitle === editingColumnTitle.trim()) {
      setEditingColumnKey(null);
      setEditingColumnTitle("");
      return;
    }

    setColumns((prev) => prev.map((col) => {
      if (col.key === editingColumnKey) {
        return { ...col, title: editingColumnTitle.trim() };
      }
      return col;
    }));

    addToHistory({
      type: ACTION_TYPES.RENAME_COLUMN,
      payload: {
        columnKey: editingColumnKey,
        oldTitle,
        newTitle: editingColumnTitle.trim()
      }
    });

    setEditingColumnKey(null);
    setEditingColumnTitle("");
    if (autoSave) saveToBackend();
    toast.success('✓ שם העמודה עודכן');
  };

  const applyCellStyle = (cellKey, style) => {
    const oldStyle = cellStyles[cellKey] || null;
    
    setCellStyles((prev) => ({ ...prev, [cellKey]: style }));
    
    addToHistory({
      type: ACTION_TYPES.APPLY_CELL_STYLE,
      payload: { cellKey, oldStyle, newStyle: style }
    });
    
    if (autoSave) saveToBackend();
    toast.success('✓ סגנון הותקן');
  };

  const applyStyleToSelection = (style) => {
    const oldCellStylesSnapshot = JSON.parse(JSON.stringify(cellStyles)); // Deep copy
    const selectedCellKeys = Array.from(selectedCells);
    
    setCellStyles((prev) => {
      const newStyles = { ...prev };
      selectedCellKeys.forEach((cellKey) => {
        newStyles[cellKey] = style;
      });
      return newStyles;
    });
    
    addToHistory({
      type: ACTION_TYPES.APPLY_BULK_STYLE,
      payload: {
        selectedCellKeys,
        oldCellStylesSnapshot,
        newStyle: style,
        count: selectedCells.size
      }
    });
    
    if (autoSave) saveToBackend();
    toast.success(`✓ סגנון הותקן ל-${selectedCells.size} תאים`);
  };

  const applyColumnStyle = (columnKey, style) => {
    const columnCells = filteredRows.map((r) => `${r.id}_${columnKey}`);
    const oldCellStylesSnapshot = JSON.parse(JSON.stringify(cellStyles)); // Deep copy
    
    setCellStyles((prev) => {
      const newStyles = { ...prev };
      columnCells.forEach((cellKey) => {
        newStyles[cellKey] = style;
      });
      return newStyles;
    });
    
    addToHistory({
      type: ACTION_TYPES.APPLY_COLUMN_STYLE,
      payload: {
        columnKey,
        affectedCellKeys: columnCells,
        oldCellStylesSnapshot,
        newStyle: style
      }
    });
    
    if (autoSave) saveToBackend();
    toast.success('✓ סגנון הותקן לעמודה');
  };

  const applyHeaderStyle = (columnKey, style) => {
    const key = `header_${columnKey}`;
    const oldStyle = cellStyles[key] || null;
    
    setCellStyles((prev) => {
      const newStyles = { ...prev };
      newStyles[key] = style;
      return newStyles;
    });
    
    addToHistory({
      type: ACTION_TYPES.APPLY_HEADER_STYLE,
      payload: { columnKey, oldStyle, newStyle: style }
    });
    
    if (autoSave) saveToBackend();
    toast.success('✓ סגנון כותרת עודכן');
  };

  const applySubHeaderStyle = (columnKey, style) => {
    const key = `subheader_${columnKey}`;
    const oldStyle = cellStyles[key] || null;
    
    setCellStyles((prev) => {
      const newStyles = { ...prev };
      newStyles[key] = style;
      return newStyles;
    });
    
    addToHistory({
      type: ACTION_TYPES.APPLY_SUBHEADER_STYLE,
      payload: { columnKey, oldStyle, newStyle: style }
    });
    
    if (autoSave) saveToBackend();
    toast.success('✓ סגנון כותרת משנה עודכן');
  };

  const toggleColumnVisibility = (columnKey) => {
    const column = columns.find(c => c.key === columnKey);
    const oldVisible = column?.visible !== false; // Default is true if not set
    
    setColumns(prev => prev.map(col => 
      col.key === columnKey ? { ...col, visible: !col.visible } : col
    ));
    
    addToHistory({
      type: ACTION_TYPES.TOGGLE_COLUMN_VISIBILITY,
      payload: {
        columnKey,
        oldVisible,
        newVisible: !oldVisible
      }
    });
    
    if (autoSave) saveToBackend();
  };

  const onDragEnd = (result) => {
    if (!result.destination) return;
    
    const sourceIndex = result.source.index;
    const destIndex = result.destination.index;
    
    if (sourceIndex === destIndex) return;
    
    const oldColumns = [...columns]; // Store columns before reorder
    const newColumns = [...columns];
    const [moved] = newColumns.splice(sourceIndex, 1);
    newColumns.splice(destIndex, 0, moved);
    setColumns(newColumns);
    
    addToHistory({
      type: ACTION_TYPES.REORDER_COLUMNS,
      payload: { oldColumns, newColumns }
    });
    
    if (autoSave) saveToBackend();
    toast.success('✓ סדר עודכן');
  };

  const exportToCSV = () => {
    try {
      const headers = visibleColumns.map(col => col.title).join(',');
      const rows = filteredRows.map(row => 
        visibleColumns.map(col => {
          const value = row[col.key] || '';
          return `"${String(value).replace(/"/g, '""')}"`;
        }).join(',')
      ).join('\n');

      const csv = `${headers}\n${rows}`;
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${spreadsheet.name}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('✓ הקובץ יוצא בהצלחה');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('שגיאה ביצוא');
    }
  };

  const saveSubHeader = () => {
    if (editingSubHeader) {
      const oldValue = subHeaders[editingSubHeader] || '';
      
      setSubHeaders(prev => ({
        ...prev,
        [editingSubHeader]: tempSubHeaderValue
      }));
      
      addToHistory({
        type: ACTION_TYPES.EDIT_SUBHEADER,
        payload: {
          columnKey: editingSubHeader,
          oldValue,
          newValue: tempSubHeaderValue
        }
      });
      
      setEditingSubHeader(null);
      setTempSubHeaderValue('');
      if (autoSave) saveToBackend();
      toast.success('✓ כותרת משנה עודכנה');
    }
  };

  const toggleSubHeaders = () => {
    const newValue = !showSubHeaders;
    const oldShowSubHeaders = showSubHeaders;
    const oldSubHeaders = { ...subHeaders }; // Snapshot current subHeaders
    
    setShowSubHeaders(newValue);
    
    let newSubHeadersState = {};
    if (newValue) {
      const initialSubHeaders = {};
      visibleColumns.forEach(col => {
        if (subHeaders[col.key] === undefined) {
          initialSubHeaders[col.key] = '';
        }
      });
      newSubHeadersState = { ...subHeaders, ...initialSubHeaders };
      setSubHeaders(newSubHeadersState);
    } else {
      setSubHeaders({}); // When toggling off, clear them
    }
    
    addToHistory({
      type: ACTION_TYPES.TOGGLE_SUBHEADERS,
      payload: {
        oldEnabled: oldShowSubHeaders,
        newEnabled: newValue,
        oldSubHeaders,
        newSubHeaders: newSubHeadersState
      }
    });
    
    if (autoSave) saveToBackend();
    toast.success(newValue ? '✓ כותרות משנה הופעלו' : '✓ כותרות משנה הוסתרו');
  };

  const mergeColumns = async (sourceKey, targetKey) => {
    const sourceCol = columns.find((c) => c.key === sourceKey);
    const targetCol = columns.find((c) => c.key === targetKey);

    if (!sourceCol || !targetCol) {
      toast.error('לא ניתן למזג עמודות אלה');
      return;
    }

    if (sourceCol.required || targetCol.required) {
      toast.error('לא ניתן למזג עמודות חובה');
      return;
    }

    if (!confirm(`למזג "${sourceCol.title}" אל "${targetCol.title}"?`)) {
      return;
    }

    const oldColumns = [...columns];
    const oldRowsData = JSON.parse(JSON.stringify(rowsData));
    const oldCellStylesSnapshot = JSON.parse(JSON.stringify(cellStyles));

    // Calculate new states after merge
    const updatedRows = rowsData.map((row) => {
      const sourceValue = row[sourceKey] || '';
      const targetValue = row[targetKey] || '';
      const mergedValue = targetValue && sourceValue ?
        `${targetValue}, ${sourceValue}` : targetValue || sourceValue;

      const { [sourceKey]: _, ...rest } = row;
      return { ...rest, [targetKey]: mergedValue };
    });

    const newCellStylesAfterMerge = (() => {
      const tempStyles = { ...cellStyles };
      for (const key in tempStyles) {
        if (key.endsWith(`_${sourceKey}`) || key === `header_${sourceKey}` || key === `subheader_${sourceKey}`) {
          delete tempStyles[key];
        }
      }
      return tempStyles;
    })();
    const newColumnsAfterMerge = columns.filter((c) => c.key !== sourceKey);

    // Apply new states
    setRowsData(updatedRows);
    setCellStyles(newCellStylesAfterMerge);
    setColumns(newColumnsAfterMerge);
    
    addToHistory({
      type: ACTION_TYPES.MERGE_COLUMNS,
      payload: {
        sourceKey,
        targetKey,
        oldColumns,
        oldRowsData,
        oldCellStylesSnapshot,
        newColumns: newColumnsAfterMerge,
        newRowsData: updatedRows,
        newCellStyles: newCellStylesAfterMerge
      }
    });
    
    clearSelection();
    
    if (autoSave) saveToBackend();
    toast.success('✓ עמודות מוזגו');
  };

  const mergeSelectedHeaders = async () => {
    const headersList = Array.from(selectedHeaders);

    if (headersList.length < 2) {
      toast.error('בחר לפחות 2 כותרות');
      return;
    }

    const actualHeaders = headersList.filter(key => !key.startsWith('sub_'));
    if (actualHeaders.length < 2) {
      toast.error('בחר לפחות 2 כותרות ראשיות');
      return;
    }

    const targetKey = actualHeaders[0];
    const targetCol = columns.find((c) => c.key === targetKey);

    if (!targetCol) {
      toast.error('עמודה לא חוקית');
      return;
    }
    
    if (!confirm(`למזג ${actualHeaders.length} עמודות אל "${targetCol.title}"?`)) {
      return;
    }

    for (let i = 1; i < actualHeaders.length; i++) {
      // mergeColumns will add to history for each call, which is fine
      await mergeColumns(actualHeaders[i], actualHeaders[0]);
    }

    setSelectedHeaders(new Set());
    toast.success(`✓ ${actualHeaders.length} עמודות מוזגו`);
  };

  const splitColumn = (columnKey) => {
    const column = columns.find((c) => c.key === columnKey);
    if (!column) return;

    if (column.key.match(/_(\d+)$/)) {
      toast.error('עמודה כבר פוצלה');
      return;
    }

    const oldColumns = [...columns]; // Store current columns

    const newCol1 = {
      ...column,
      key: `${column.key}_1`,
      title: `${column.title} (1)`,
      width: '120px'
    };

    const newCol2 = {
      ...column,
      key: `${column.key}_2`,
      title: `${column.title} (2)`,
      width: '120px'
    };

    const columnIndex = columns.findIndex((c) => c.key === columnKey);
    const newColumns = [...columns];
    newColumns.splice(columnIndex, 1, newCol1, newCol2);

    setColumns(newColumns);
    
    addToHistory({
      type: ACTION_TYPES.SPLIT_COLUMN,
      payload: {
        columnKey,
        oldColumns,
        newColumns
      }
    });
    
    if (autoSave) saveToBackend();
    toast.success('✓ עמודה פוצלה');
  };

  const clearSelection = () => {
    setSelectedCells(new Set());
    setSelectedHeaders(new Set());
    setSelectedRows(new Set());
    setIsDragging(false);
    toast.info('הבחירה נוקתה');
  };

  const handleImportComplete = async (newRows) => {
    setRowsData(newRows);
    setShowImporter(false);
    
    if (autoSave) {
      await saveToBackend();
    }
    
    toast.success('✓ הנתונים יובאו בהצלחה');
  };

  if (!spreadsheet) {
    return (
      <div className="p-6 text-center">
        <p className="text-slate-500">לא נבחרה טבלה</p>
      </div>
    );
  }

  const totalSelected = selectedCells.size + selectedRows.size + selectedHeaders.size;
  const canUndo = historyIndex >= 0;
  const canRedo = historyIndex < history.length - 1;

  return (
    <TooltipProvider>
      <div className="w-full overflow-visible" dir="rtl">
        <Card className="shadow-2xl border-0 bg-gradient-to-br from-white to-slate-50 rounded-3xl overflow-hidden">
          {/* Header מודרני */}
          <CardHeader className="border-b-2 bg-gradient-to-r from-slate-50 via-white to-slate-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-purple-500 to-blue-500 rounded-2xl shadow-lg">
                  <Table className="w-6 h-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                    {spreadsheet.name}
                  </CardTitle>
                  {spreadsheet.description && (
                    <p className="text-sm text-slate-600 mt-1 flex items-center gap-2">
                      {spreadsheet.description}
                      <Badge variant="outline" className="text-xs">
                        {filteredRows.length} שורות
                      </Badge>
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {/* Undo/Redo Buttons */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={undo}
                      disabled={!canUndo}
                      className="gap-2"
                    >
                      <Undo className="w-4 h-4" />
                      <span className="hidden lg:inline">ביטול</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {canUndo 
                      ? `ביטול: ${getActionDescription(history[historyIndex])} (Ctrl+Z)`
                      : 'אין פעולות לביטול'
                    }
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={redo}
                      disabled={!canRedo}
                      className="gap-2"
                    >
                      <Redo className="w-4 h-4" />
                      <span className="hidden lg:inline">שחזור</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {canRedo 
                      ? `שחזור: ${getActionDescription(history[historyIndex + 1])} (Ctrl+Y)`
                      : 'אין פעולות לשחזור'
                    }
                  </TooltipContent>
                </Tooltip>

                <Separator orientation="vertical" className="h-8" />
                
                {!fullScreenMode && (
                  <Link to={createPageUrl(`SpreadsheetDetails?id=${spreadsheet.id}`)}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-2">
                          <Maximize2 className="w-4 h-4" />
                          <span className="hidden lg:inline">מסך מלא</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>הרחב לתצוגת מסך מלא</TooltipContent>
                    </Tooltip>
                  </Link>
                )}
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={saveToBackend}
                      className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg"
                    >
                      <Save className="w-4 h-4" />
                      <span className="hidden lg:inline">שמור</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>שמור את כל השינויים (Ctrl+S)</TooltipContent>
                </Tooltip>
              </div>
            </div>

            {/* Simplified Toolbar - Only critical actions */}
            <div className="flex flex-wrap items-center gap-3 mt-4 p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-slate-200">
              {/* חיפוש */}
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="חיפוש בטבלה..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10 h-9 w-56 rounded-lg border-2 focus:border-purple-500 transition-colors"
                />
              </div>

              <Separator orientation="vertical" className="h-8" />

              {/* כפתורי הוספה מהירים */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addNewRow}
                    className="gap-2 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 hover:from-green-100 hover:to-emerald-100"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="hidden md:inline">שורה</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>הוסף שורה חדשה (Insert)</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addQuickColumn}
                    className="gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="hidden md:inline">עמודה</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>הוסף עמודה חדשה</TooltipContent>
              </Tooltip>

              <Separator orientation="vertical" className="h-8" />

              {/* תפריט תצוגה */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Eye className="w-4 h-4" />
                    <span className="hidden md:inline">תצוגה</span>
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" dir="rtl" className="w-64">
                  <DropdownMenuLabel>עמודות גלויות</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <ScrollArea className="h-48">
                    {columns.map((col) => (
                      <DropdownMenuCheckboxItem
                        key={col.key}
                        checked={col.visible !== false}
                        onCheckedChange={() => toggleColumnVisibility(col.key)}
                        disabled={col.required}
                      >
                        {col.title}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </ScrollArea>
                  <DropdownMenuSeparator />
                  <DropdownMenuCheckboxItem
                    checked={showSubHeaders}
                    onCheckedChange={toggleSubHeaders}
                  >
                    <Columns className="w-4 h-4 ml-2" />
                    כותרות משנה
                  </DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Separator orientation="vertical" className="h-8" />

              {/* תפריט אפשרויות נוספות */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <MoreHorizontal className="w-4 h-4" />
                    <span className="hidden md:inline">עוד</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" dir="rtl" className="w-64">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>ייבוא וייצוא</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => setShowImporter(true)} className="gap-2">
                      <Upload className="w-4 h-4 text-blue-600" />
                      ייבא נתונים
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={exportToCSV} className="gap-2">
                      <FileDown className="w-4 h-4 text-green-600" />
                      ייצוא ל-CSV
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>ניהול מתקדם</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => setShowColumnDialog(true)} className="gap-2">
                      <Plus className="w-4 h-4 text-purple-600" />
                      עמודה מתקדמת
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setIsSheetOpen(true)} className="gap-2">
                      <Settings className="w-4 h-4 text-blue-600" />
                      ניהול עמודות
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setShowHistory(true)} className="gap-2">
                      <History className="w-4 h-4 text-slate-600" />
                      היסטוריית פעולות
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>הגדרות</DropdownMenuLabel>
                    <div className="px-2 py-1.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">שמירה אוטומטית</span>
                        <Switch
                          checked={autoSave}
                          onCheckedChange={setAutoSave}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">סגירה אוטומטית</span>
                        <Switch
                          checked={autoCloseEdit}
                          onCheckedChange={setAutoCloseEdit}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>

              <Separator orientation="vertical" className="h-8" />

              {/* עזרה */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowShortcuts(!showShortcuts)}
                    className="gap-2"
                  >
                    <Info className="w-4 h-4" />
                    <span className="hidden md:inline">{showShortcuts ? 'הסתר' : 'עזרה'}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>הצג/הסתר מדריך שימוש (F1)</TooltipContent>
              </Tooltip>

              {/* אינדיקטור בחירה */}
              {totalSelected > 0 && (
                <>
                  <Separator orientation="vertical" className="h-8" />
                  <Badge className="gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-500 to-blue-500 text-white border-0">
                    <CheckSquare className="w-4 h-4" />
                    {totalSelected} נבחרו
                  </Badge>
                </>
              )}
            </div>
          </CardHeader>

          {/* פאנל עזרה */}
          {showShortcuts && (
            <div className="p-6 bg-gradient-to-r from-purple-50 via-blue-50 to-indigo-50 border-b-2">
              <div className="flex items-start gap-3 mb-4">
                <div className="p-2 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                    מדריך שימוש מהיר
                  </h3>
                  <p className="text-sm text-slate-600 mt-1">
                    <MousePointer2 className="w-4 h-4 inline ml-1" />
                    לחץ ימנית על תא/כותרת/שורה לתפריט מהיר!
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm text-purple-700 flex items-center gap-2 mb-3">
                    <Edit2 className="w-4 h-4" />
                    עריכה מהירה
                  </h4>
                  <div className="space-y-1.5">
                    <div className="text-xs text-slate-600">• <strong>לחיצה רגילה</strong> על תא = עריכה</div>
                    <div className="text-xs text-slate-600">• <strong>לחיצה ימנית</strong> = תפריט מלא</div>
                    <div className="text-xs text-slate-600">• <strong>Enter</strong> = שמירה</div>
                    <div className="text-xs text-slate-600">• <strong>Escape</strong> = ביטול</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold text-sm text-blue-700 flex items-center gap-2 mb-3">
                    <CheckSquare className="w-4 h-4" />
                    בחירה מרובה
                  </h4>
                  <div className="space-y-1.5">
                    <div className="text-xs text-slate-600">• <strong>Alt+Click</strong> = בחירת תאים</div>
                    <div className="text-xs text-slate-600">• <strong>Alt+Shift+Click</strong> = בחירת כותרת</div>
                    <div className="text-xs text-slate-600">• <strong>Checkbox</strong> בשורה = בחירה</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold text-sm text-indigo-700 flex items-center gap-2 mb-3">
                    <GripVertical className="w-4 h-4" />
                    סידור וארגון
                  </h4>
                  <div className="space-y-1.5">
                    <div className="text-xs text-slate-600">• <strong>גרור כותרת</strong> = שינוי סדר</div>
                    <div className="text-xs text-slate-600">• <strong>לחץ על כותרת</strong> = עריכת שם</div>
                    <div className="text-xs text-slate-600">• <strong>לחיצה ימנית</strong> = כל הפעולות</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold text-sm text-green-700 flex items-center gap-2 mb-3">
                    <Undo className="w-4 h-4" />
                    ביטול ושחזור
                  </h4>
                  <div className="space-y-1.5">
                    <div className="text-xs text-slate-600">• <strong>Ctrl+Z</strong> = ביטול פעולה</div>
                    <div className="text-xs text-slate-600">• <strong>Ctrl+Y</strong> = שחזור פעולה</div>
                    <div className="text-xs text-slate-600">• <strong>Ctrl+S</strong> = שמירה</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <CardContent className="p-0">
            <div
              ref={tableContainerRef}
              className="border-t-2 border-slate-200 overflow-auto"
              style={{ maxHeight: fullScreenMode ? '85vh' : '60vh', width: '100%' }}
            >
              <DragDropContext onDragEnd={onDragEnd}>
                <table className="border-collapse" dir="rtl" style={{ width: 'max-content', minWidth: '100%' }}>
                  <thead className="bg-slate-100 sticky top-0 z-20">
                    {showSubHeaders && (
                      <tr>
                        <th className="border border-slate-200 p-2" style={{ width: '50px' }}>#</th>
                        {visibleColumns.map((column) => {
                          const subHeaderStyle = cellStyles[`subheader_${column.key}`] || {};
                          const isSelected = selectedHeaders.has(`sub_${column.key}`);

                          return (
                            <th
                              key={`sub_${column.key}`}
                              className={`border border-slate-200 p-2 text-xs ${
                                isSelected ? 'ring-2 ring-purple-500 bg-purple-50' : ''
                              } hover:bg-purple-50 transition-all cursor-pointer`}
                              style={{
                                width: column.width,
                                backgroundColor: isSelected ? '#faf5ff' : subHeaderStyle.backgroundColor || '#f8fafc',
                                opacity: subHeaderStyle.opacity ? subHeaderStyle.opacity / 100 : 1,
                                fontWeight: subHeaderStyle.fontWeight || 'normal'
                              }}
                              onClick={(e) => {
                                if (e.altKey && e.shiftKey) {
                                  e.preventDefault();
                                  setSelectedHeaders(prev => {
                                    const newSet = new Set(prev);
                                    const key = `sub_${column.key}`;
                                    if (newSet.has(key)) {
                                      newSet.delete(key);
                                    } else {
                                      newSet.add(key);
                                    }
                                    return newSet;
                                  });
                                } else if (editingSubHeader !== column.key) {
                                  setEditingSubHeader(column.key);
                                  setTempSubHeaderValue(subHeaders[column.key] || '');
                                }
                              }}
                              onContextMenu={(e) => {
                                e.preventDefault();
                                setContextMenu({
                                  type: 'subheader',
                                  x: e.clientX,
                                  y: e.clientY,
                                  columnKey: column.key,
                                  column
                                });
                              }}
                            >
                              {editingSubHeader === column.key ? (
                                <Input
                                  value={tempSubHeaderValue}
                                  onChange={(e) => setTempSubHeaderValue(e.target.value)}
                                  onBlur={saveSubHeader}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') saveSubHeader();
                                    if (e.key === 'Escape') {
                                      setEditingSubHeader(null);
                                      setTempSubHeaderValue('');
                                    }
                                  }}
                                  className="h-6 text-xs"
                                  autoFocus
                                />
                              ) : (
                                <span className="text-slate-500">{subHeaders[column.key] || 'לחץ להוספה...'}</span>
                              )}
                            </th>
                          );
                        })}
                        <th className="border border-slate-200 p-2" style={{ width: '100px' }}></th>
                      </tr>
                    )}
                    <Droppable droppableId="columns" direction="horizontal">
                      {(provided) => (
                        <tr ref={provided.innerRef} {...provided.droppableProps}>
                          <th className="border border-slate-200 p-3" style={{ width: '50px' }}>
                            <input
                              type="checkbox"
                              checked={selectedRows.size === filteredRows.length && filteredRows.length > 0}
                              onChange={selectAllRows}
                              className="cursor-pointer"
                              title="בחר/בטל את כל השורות"
                            />
                          </th>
                          {visibleColumns.map((column, index) => {
                            const headerStyle = cellStyles[`header_${column.key}`] || {};
                            const isSelected = selectedHeaders.has(column.key);

                            return (
                              <Draggable key={column.key} draggableId={column.key} index={index} isDragDisabled={column.required}>
                                {(provided, snapshot) => (
                                  <th
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    className={`border border-slate-200 p-3 font-medium ${
                                      isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                                    } hover:bg-blue-50 transition-all ${
                                      snapshot.isDragging ? 'opacity-50 bg-blue-100 shadow-xl' : ''
                                    }`}
                                    style={{
                                      ...provided.draggableProps.style,
                                      width: column.width,
                                      minWidth: column.width,
                                      backgroundColor: snapshot.isDragging ? '#dbeafe' : (isSelected ? '#eff6ff' : headerStyle.backgroundColor || '#f1f5f9'),
                                      opacity: headerStyle.opacity ? headerStyle.opacity / 100 : 1,
                                      fontWeight: headerStyle.fontWeight || 'semibold',
                                      cursor: !column.required ? 'grab' : 'default'
                                    }}
                                    onClick={(e) => !snapshot.isDragging && handleColumnClick(column.key, e)}
                                    onContextMenu={(e) => !snapshot.isDragging && handleHeaderContextMenu(column.key, e)}
                                  >
                                    {editingColumnKey === column.key ? (
                                      <div className="flex items-center gap-2">
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
                                          onClick={(e) => e.stopPropagation()}
                                        />
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-2">
                                        {!column.required && (
                                          <div {...provided.dragHandleProps}>
                                            <GripVertical className="w-4 h-4 text-slate-400 hover:text-slate-600" />
                                          </div>
                                        )}
                                        <span className="flex-1">{column.title}</span>
                                      </div>
                                    )}
                                  </th>
                                )}
                              </Draggable>
                            );
                          })}
                          {provided.placeholder}
                          <th className="border border-slate-200 p-3 font-medium" style={{ width: '100px' }}>
                            פעולות
                          </th>
                        </tr>
                      )}
                    </Droppable>
                  </thead>
                  
                  <tbody>
                    {filteredRows.map((row, rowIndex) => (
                      <tr
                        key={row.id}
                        className={`${rowIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50'} ${
                          selectedRows.has(row.id) ? 'bg-blue-50 ring-2 ring-blue-300' : ''
                        } hover:bg-blue-50/50 transition-colors`}
                      >
                        <td 
                          className="border border-slate-200 p-2 text-center"
                          onContextMenu={(e) => handleRowContextMenu(row.id, e)}
                        >
                          <input
                            type="checkbox"
                            checked={selectedRows.has(row.id)}
                            onChange={() => toggleRowSelection(row.id)}
                            className="cursor-pointer"
                            title="בחר שורה"
                          />
                        </td>
                        {visibleColumns.map((column) => {
                          const cellKey = `${row.id}_${column.key}`;
                          const isEditing = editingCell === cellKey;
                          const cellStyle = cellStyles[cellKey] || {};
                          const isSelected = selectedCells.has(cellKey);
                          const cellValue = row[column.key] || '';

                          return (
                            <td
                              key={column.key}
                              className={`border border-slate-200 p-2 cursor-pointer transition-all ${
                                isSelected ? 'ring-2 ring-purple-500 bg-purple-50' : 'hover:bg-blue-50'
                              }`}
                              onClick={(e) => handleCellClick(row.id, column.key, e)}
                              onContextMenu={(e) => handleCellContextMenu(row.id, column.key, e)}
                              onMouseEnter={(e) => handleCellMouseEnter(row.id, column.key, e)}
                              onMouseDown={(e) => {
                                if (e.altKey) e.preventDefault();
                              }}
                              style={{
                                backgroundColor: isSelected ? '#faf5ff' : (cellStyle.backgroundColor || 'inherit'),
                                opacity: cellStyle.opacity ? cellStyle.opacity / 100 : 1,
                                fontWeight: cellStyle.fontWeight || 'normal'
                              }}
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
                                  className="h-8 w-full"
                                  dir="rtl"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              ) : (
                                <span className="text-sm">{String(cellValue)}</span>
                              )}
                            </td>
                          );
                        })}
                        <td 
                          className="border border-slate-200 p-2"
                          onContextMenu={(e) => handleRowContextMenu(row.id, e)}
                        >
                          <div className="flex items-center gap-1 justify-center">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 hover:bg-blue-100"
                              onClick={() => duplicateRow(row)}
                              title="שכפל שורה"
                            >
                              <Copy className="w-3 h-3 text-blue-600" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 hover:bg-red-100"
                              onClick={() => deleteRow(row.id)}
                              title="מחק שורה"
                            >
                              <Trash2 className="w-3 h-3 text-red-600" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </DragDropContext>
            </div>
          </CardContent>

          {/* Status Bar */}
          <div className="px-6 py-3 bg-gradient-to-r from-slate-50 to-white border-t-2">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <Table className="w-3 h-3" />
                  {filteredRows.length} שורות
                </span>
                <span className="flex items-center gap-1">
                  <Columns className="w-3 h-3" />
                  {visibleColumns.length}/{columns.length} עמודות
                </span>
                {history.length > 0 && (
                  <span className="flex items-center gap-1">
                    <History className="w-3 h-3" />
                    {history.length} פעולות בהיסטוריה
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {autoSave && (
                  <Badge variant="outline" className="text-xs gap-1">
                    <Zap className="w-3 h-3" />
                    שמירה אוטומטית
                  </Badge>
                )}
                <span className="text-slate-400">
                  {new Date().toLocaleTimeString('he-IL')}
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Context Menus */}
        {contextMenu && contextMenu.type === 'cell' && (
          <ContextMenu x={contextMenu.x} y={contextMenu.y} onClose={() => setContextMenu(null)}>
            <div className="px-2 py-1 border-b border-slate-200 mb-1">
              <p className="text-xs font-semibold text-slate-700">{contextMenu.column?.title}</p>
              <p className="text-xs text-slate-500 truncate max-w-[180px]">
                {String(contextMenu.cellValue).substring(0, 30)}
              </p>
            </div>
            
            <ContextMenuItem
              icon={Edit2}
              label="ערוך תא"
              onClick={() => {
                setEditingCell(contextMenu.cellKey);
                setEditValue(String(contextMenu.cellValue));
                setTimeout(() => editInputRef.current?.focus(), 0);
                setContextMenu(null);
              }}
            />
            
            <Popover>
              <PopoverTrigger asChild>
                <button className="w-full px-4 py-2.5 text-right flex items-center gap-3 hover:bg-slate-50">
                  <Palette className="w-4 h-4" />
                  <span className="text-sm font-medium">צבע ועיצוב</span>
                </button>
              </PopoverTrigger>
              <PopoverContent side="left" align="start" className="w-auto p-0">
                <ColorPicker
                  currentStyle={contextMenu.cellStyle}
                  onApply={(style) => {
                    applyCellStyle(contextMenu.cellKey, style);
                    setContextMenu(null);
                  }}
                  onClose={() => setContextMenu(null)}
                />
              </PopoverContent>
            </Popover>
            
            <ContextMenuItem
              icon={Copy}
              label="העתק"
              onClick={() => {
                navigator.clipboard.writeText(String(contextMenu.cellValue));
                toast.success('הועתק ללוח');
                setContextMenu(null);
              }}
            />
            
            <div className="my-1 h-px bg-slate-200" />
            
            <ContextMenuItem
              icon={Trash2}
              label="מחק תוכן"
              danger
              onClick={() => {
                const rowIndex = rowsData.findIndex(r => r.id === contextMenu.rowId);
                const oldValue = rowsData[rowIndex]?.[contextMenu.columnKey] || '';
                
                const updatedRows = rowsData.map(r =>
                  r.id === contextMenu.rowId ? { ...r, [contextMenu.columnKey]: '' } : r
                );
                setRowsData(updatedRows);
                
                addToHistory({
                  type: ACTION_TYPES.DELETE_CELL,
                  payload: {
                    rowId: contextMenu.rowId,
                    columnKey: contextMenu.columnKey,
                    oldValue
                  }
                });
                
                if (autoSave) saveToBackend();
                toast.success('תוכן נמחק');
                setContextMenu(null);
              }}
            />
          </ContextMenu>
        )}

        {contextMenu && contextMenu.type === 'header' && (
          <ContextMenu x={contextMenu.x} y={contextMenu.y} onClose={() => setContextMenu(null)}>
            <div className="px-2 py-1 border-b border-slate-200 mb-1">
              <p className="text-xs font-semibold text-slate-700">עמודה: {contextMenu.column?.title}</p>
            </div>
            
            <ContextMenuItem
              icon={Edit2}
              label="ערוך שם עמודה"
              onClick={() => {
                setEditingColumnKey(contextMenu.columnKey);
                setEditingColumnTitle(contextMenu.column.title);
                setContextMenu(null);
              }}
              disabled={contextMenu.column?.required}
            />
            
            <Popover>
              <PopoverTrigger asChild>
                <button className="w-full px-4 py-2.5 text-right flex items-center gap-3 hover:bg-slate-50">
                  <Palette className="w-4 h-4" />
                  <span className="text-sm font-medium">צבע כותרת</span>
                </button>
              </PopoverTrigger>
              <PopoverContent side="left" align="start" className="w-auto p-0">
                <ColorPicker
                  currentStyle={contextMenu.headerStyle}
                  onApply={(style) => {
                    applyHeaderStyle(contextMenu.columnKey, style);
                    setContextMenu(null);
                  }}
                  onClose={() => setContextMenu(null)}
                />
              </PopoverContent>
            </Popover>
            
            <Popover>
              <PopoverTrigger asChild>
                <button className="w-full px-4 py-2.5 text-right flex items-center gap-3 hover:bg-slate-50">
                  <Palette className="w-4 h-4" />
                  <span className="text-sm font-medium">צבע עמודה מלאה</span>
                </button>
              </PopoverTrigger>
              <PopoverContent side="left" align="start" className="w-auto p-0">
                <ColorPicker
                  onApply={(style) => {
                    applyColumnStyle(contextMenu.columnKey, style);
                    setContextMenu(null);
                  }}
                  onClose={() => setContextMenu(null)}
                />
              </PopoverContent>
            </Popover>
            
            <div className="my-1 h-px bg-slate-200" />
            
            <ContextMenuItem
              icon={Merge}
              label="מזג לעמודה אחרת"
              onClick={() => {
                const targetKey = prompt(`בחר מפתח עמודת יעד למיזוג (זמינות: ${columns.filter(c => c.key !== contextMenu.columnKey && !c.required).map(c => c.key).join(', ')})`);
                if (targetKey) {
                  mergeColumns(contextMenu.columnKey, targetKey);
                }
                setContextMenu(null);
              }}
              disabled={contextMenu.column?.required}
            />
            
            <ContextMenuItem
              icon={Split}
              label="פצל לשתי עמודות"
              onClick={() => {
                splitColumn(contextMenu.columnKey);
                setContextMenu(null);
              }}
              disabled={contextMenu.column?.required}
            />
            
            <ContextMenuItem
              icon={contextMenu.column?.visible !== false ? EyeOff : Eye}
              label={contextMenu.column?.visible !== false ? 'הסתר עמודה' : 'הצג עמודה'}
              onClick={() => {
                toggleColumnVisibility(contextMenu.columnKey);
                setContextMenu(null);
              }}
              disabled={contextMenu.column?.required}
            />
            
            <div className="my-1 h-px bg-slate-200" />
            
            <ContextMenuItem
              icon={Trash2}
              label="מחק עמודה"
              danger
              onClick={() => {
                deleteColumn(contextMenu.columnKey);
                setContextMenu(null);
              }}
              disabled={contextMenu.column?.required}
            />
          </ContextMenu>
        )}

        {contextMenu && contextMenu.type === 'row' && (
          <ContextMenu x={contextMenu.x} y={contextMenu.y} onClose={() => setContextMenu(null)}>
            <div className="px-2 py-1 border-b border-slate-200 mb-1">
              <p className="text-xs font-semibold text-slate-700">פעולות שורה</p>
            </div>
            
            <ContextMenuItem
              icon={Copy}
              label="שכפל שורה"
              onClick={() => {
                duplicateRow(contextMenu.row);
                setContextMenu(null);
              }}
            />
            
            <ContextMenuItem
              icon={CheckSquare}
              label={selectedRows.has(contextMenu.rowId) ? 'בטל בחירה' : 'בחר שורה'}
              onClick={() => {
                toggleRowSelection(contextMenu.rowId);
                setContextMenu(null);
              }}
            />
            
            <div className="my-1 h-px bg-slate-200" />
            
            <ContextMenuItem
              icon={Trash2}
              label="מחק שורה"
              danger
              onClick={() => {
                deleteRow(contextMenu.rowId);
                setContextMenu(null);
              }}
            />
          </ContextMenu>
        )}

        {contextMenu && contextMenu.type === 'subheader' && (
          <ContextMenu x={contextMenu.x} y={contextMenu.y} onClose={() => setContextMenu(null)}>
            <div className="px-2 py-1 border-b border-slate-200 mb-1">
              <p className="text-xs font-semibold text-slate-700">כותרת משנה: {contextMenu.column?.title}</p>
            </div>
            
            <ContextMenuItem
              icon={Edit2}
              label="ערוך כותרת משנה"
              onClick={() => {
                setEditingSubHeader(contextMenu.columnKey);
                setTempSubHeaderValue(subHeaders[contextMenu.columnKey] || '');
                setContextMenu(null);
              }}
            />
            
            <Popover>
              <PopoverTrigger asChild>
                <button className="w-full px-4 py-2.5 text-right flex items-center gap-3 hover:bg-slate-50">
                  <Palette className="w-4 h-4" />
                  <span className="text-sm font-medium">צבע וסגנון</span>
                </button>
              </PopoverTrigger>
              <PopoverContent side="left" align="start" className="w-auto p-0">
                <ColorPicker
                  currentStyle={cellStyles[`subheader_${contextMenu.columnKey}`] || {}}
                  onApply={(style) => {
                    applySubHeaderStyle(contextMenu.columnKey, style);
                    setContextMenu(null);
                  }}
                  onClose={() => setContextMenu(null)}
                />
              </PopoverContent>
            </Popover>
            
            <div className="my-1 h-px bg-slate-200" />
            
            <ContextMenuItem
              icon={Trash2}
              label="מחק כותרת משנה"
              danger
              onClick={() => {
                const oldValue = subHeaders[contextMenu.columnKey] || '';
                setSubHeaders(prev => ({...prev, [contextMenu.columnKey]: ''}));
                
                addToHistory({
                  type: ACTION_TYPES.EDIT_SUBHEADER,
                  payload: {
                    columnKey: contextMenu.columnKey,
                    oldValue,
                    newValue: ''
                  }
                });
                
                if (autoSave) saveToBackend();
                toast.success('כותרת משנה נמחקה');
                setContextMenu(null);
              }}
            />
          </ContextMenu>
        )}

        {/* Floating Action Bar */}
        {totalSelected > 0 && (
          <FloatingActionBar
            selectedCount={totalSelected}
            onClear={clearSelection}
            actions={
              <>
                {selectedCells.size > 0 && (
                  <>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-white hover:bg-white/20 gap-2">
                          <Palette className="w-4 h-4" />
                          צבע
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" side="top">
                        <ColorPicker onApply={applyStyleToSelection} />
                      </PopoverContent>
                    </Popover>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={deleteSelectedCells}
                      className="text-white hover:bg-white/20 gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      מחק תוכן
                    </Button>
                  </>
                )}
                
                {selectedRows.size > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={deleteSelectedRows}
                    className="text-white hover:bg-white/20 gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    מחק {selectedRows.size} שורות
                  </Button>
                )}
                
                {selectedHeaders.size >= 2 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={mergeSelectedHeaders}
                    className="text-white hover:bg-white/20 gap-2"
                  >
                    <Merge className="w-4 h-4" />
                    מזג עמודות
                  </Button>
                )}
              </>
            }
          />
        )}

        {/* Importer Dialog */}
        {showImporter && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <SpreadsheetImporter
              spreadsheet={spreadsheet}
              columns={columns}
              onImportComplete={handleImportComplete}
              onClose={() => setShowImporter(false)}
            />
          </div>
        )}

        {/* Dialog for adding advanced column */}
        <Dialog open={showColumnDialog} onOpenChange={setShowColumnDialog}>
          <DialogContent dir="rtl" className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>הוספת עמודה מתקדמת</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="col-title">שם העמודה *</Label>
                <Input
                  id="col-title"
                  value={newColumn.title}
                  onChange={(e) => setNewColumn({...newColumn, title: e.target.value})}
                  placeholder="לדוגמה: כתובת, טלפון, סטטוס..."
                  className="text-right"
                  dir="rtl"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="col-type">סוג</Label>
                  <Select value={newColumn.type} onValueChange={(value) => setNewColumn({...newColumn, type: value})}>
                    <SelectTrigger id="col-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">טקסט</SelectItem>
                      <SelectItem value="number">מספר</SelectItem>
                      <SelectItem value="boolean">כן/לא</SelectItem>
                      <SelectItem value="date">תאריך</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="col-width">רוחב</Label>
                  <Input
                    id="col-width"
                    value={newColumn.width}
                    onChange={(e) => setNewColumn({...newColumn, width: e.target.value})}
                    placeholder="150px"
                    dir="rtl"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={newColumn.required}
                  onCheckedChange={(checked) => setNewColumn({...newColumn, required: checked})}
                />
                <Label>שדה חובה</Label>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowColumnDialog(false)}>
                ביטול
              </Button>
              <Button onClick={addNewColumn} className="bg-purple-600 hover:bg-purple-700">
                <Plus className="w-4 h-4 ml-2" />
                הוסף עמודה
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Sheet for column management */}
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetContent side="left" className="w-[450px] p-0" dir="rtl">
            <SheetHeader className="p-6 pb-4 border-b">
              <SheetTitle>ניהול עמודות</SheetTitle>
            </SheetHeader>

            <ScrollArea className="h-[calc(100vh-180px)]">
              <div className="p-6 space-y-4">
                <Button
                  onClick={() => setShowColumnDialog(true)}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 gap-2 shadow-lg">
                  <Plus className="w-5 h-5" />
                  הוסף עמודה חדשה
                </Button>

                <div className="pt-2">
                  <h4 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                    <Table className="w-4 h-4" />
                    רשימת עמודות
                  </h4>

                  <div className="space-y-2">
                    {columns.map((col) => (
                      <div
                        key={col.key}
                        className="group p-4 border-2 rounded-xl hover:border-blue-300 hover:shadow-md transition-all bg-white">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <Switch
                              checked={col.visible !== false}
                              onCheckedChange={() => toggleColumnVisibility(col.key)}
                              disabled={col.required}
                            />

                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-slate-900 truncate">
                                {col.title}
                              </div>
                              <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                                <span className="truncate">{col.key}</span>
                                {col.required && (
                                  <Badge variant="outline" className="text-xs bg-blue-50 border-blue-200">
                                    חובה
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>

                          {!col.required && (
                            <div className="flex items-center gap-1 transition-opacity">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 hover:bg-blue-100"
                                onClick={() => {
                                  const newTitle = prompt('שם חדש לעמודה:', col.title);
                                  if (newTitle && newTitle.trim()) {
                                    const oldTitle = col.title;
                                    
                                    setColumns(prev => prev.map(c =>
                                      c.key === col.key ? { ...c, title: newTitle.trim() } : c
                                    ));
                                    
                                    addToHistory({
                                      type: ACTION_TYPES.RENAME_COLUMN,
                                      payload: {
                                        columnKey: col.key,
                                        oldTitle,
                                        newTitle: newTitle.trim()
                                      }
                                    });
                                    
                                    if (autoSave) saveToBackend();
                                    toast.success('✓ שם העמודה עודכן');
                                  }
                                }}
                                title="ערוך שם">
                                <Edit2 className="w-4 h-4 text-blue-600" />
                              </Button>

                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 hover:bg-red-100"
                                onClick={() => deleteColumn(col.key)}
                                title="מחק עמודה">
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </SheetContent>
        </Sheet>

        {/* History Sheet */}
        <Sheet open={showHistory} onOpenChange={setShowHistory}>
          <SheetContent side="left" className="w-[450px] p-0" dir="rtl">
            <SheetHeader className="p-6 pb-4 border-b">
              <SheetTitle className="flex items-center gap-2">
                <History className="w-5 h-5" />
                היסטוריית פעולות
              </SheetTitle>
            </SheetHeader>
            <ScrollArea className="h-[calc(100vh-100px)] p-6">
              {history.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>אין פעולות בהיסטוריה</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {history.map((action, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg border transition-all ${
                        index === historyIndex
                          ? 'bg-blue-50 border-blue-300'
                          : index > historyIndex
                          ? 'bg-slate-50 border-slate-200 opacity-60'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-900">
                            {getActionDescription(action)}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            {new Date(action.timestamp).toLocaleString('he-IL')}
                          </p>
                        </div>
                        {index === historyIndex && (
                          <Badge variant="default" className="text-xs">
                            נוכחי
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </SheetContent>
        </Sheet>
      </div>
    </TooltipProvider>
  );
}