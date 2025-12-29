import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Table, Copy, Settings, Palette, Eye, EyeOff, Edit2, X, Download, Grid, Search, Filter, ArrowUp, ArrowDown, ArrowUpDown, XCircle, Undo, Redo, GripVertical, BarChart3, Calculator, Layers, Bookmark, Users, Zap, MessageSquare, Bold, Scissors, Merge, Type, Circle, ChevronRight, ChevronLeft, ChevronDown, Snowflake, RefreshCw } from "lucide-react";
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
import { createPageUrl } from "@/utils";
import ThemeSelector, { COLOR_PALETTES, BORDER_STYLES, FONT_OPTIONS } from "./ThemeSelector";
import ViewManager from "./ViewManager";
import ChartBuilder from "./ChartBuilder";
import ChartViewer from "./ChartViewer";
import { useAccessControl } from "@/components/access/AccessValidator";
import ColumnsManagerDialog from "./ColumnsManagerDialog";
import BulkColumnsDialog from "./BulkColumnsDialog";
import StageOptionsManager from "./StageOptionsManager";
import SpreadsheetSyncDialog from "./SpreadsheetSyncDialog";
import Collaborators from "./Collaborators";
import CommentsSidebar from "./CommentsSidebar";
import SpreadsheetRow from "./SpreadsheetRow"; // IMPORT NEW COMPONENT
import { FileSpreadsheet } from "lucide-react";

// Default stage options with colors - MUST BE OUTSIDE COMPONENT
const DEFAULT_STAGE_OPTIONS = [
  { value: 'ללא', label: 'ללא', color: '#cbd5e1', glow: 'rgba(203, 213, 225, 0.4)' },
  { value: 'ברור_תכן', label: 'ברור תכן', color: '#3b82f6', glow: 'rgba(59, 130, 246, 0.4)' },
  { value: 'תיק_מידע', label: 'תיק מידע', color: '#8b5cf6', glow: 'rgba(139, 92, 246, 0.4)' },
  { value: 'היתרים', label: 'היתרים', color: '#f59e0b', glow: 'rgba(245, 158, 11, 0.4)' },
  { value: 'ביצוע', label: 'ביצוע', color: '#10b981', glow: 'rgba(16, 185, 129, 0.4)' },
  { value: 'סיום', label: 'סיום', color: '#6b7280', glow: 'rgba(107, 114, 128, 0.4)' }
];

// Helper component for hierarchical menu items (Hover/Flyout Style)
function StageMenuItem({ option, onSelect, depth = 0 }) {
  const hasChildren = option.children && option.children.length > 0;

  return (
    <div className="relative group/item w-full">
      <button
        onClick={(e) => {
          e.stopPropagation();
          onSelect(option.value);
        }}
        className="w-full flex items-center justify-between gap-3 px-3 py-2 hover:bg-purple-50 rounded-lg transition-all text-right"
      >
        <div className="flex items-center gap-3 overflow-hidden">
          <div 
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ 
              backgroundColor: option.color,
              boxShadow: `0 0 8px ${option.glow}, 0 0 12px ${option.glow}`
            }}
          />
          <span className="text-sm font-medium text-slate-700 truncate">{option.label}</span>
        </div>
        
        {hasChildren && (
          <ChevronLeft className="w-4 h-4 text-slate-500 opacity-100 group-hover/item:text-slate-900 group-hover/item:scale-110 transition-all font-bold" strokeWidth={2.5} />
        )}
      </button>

      {/* Submenu on hover - Positioned to the left (RTL) */}
      {hasChildren && (
        <div 
          className="absolute right-[98%] top-0 hidden group-hover/item:block z-50 pr-2 pt-1"
          style={{ minWidth: '180px' }}
        >
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 p-1">
            {option.children.map(child => (
              <StageMenuItem 
                key={child.value} 
                option={child} 
                onSelect={onSelect} 
                depth={depth + 1} 
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function StageSelector({ options = [], onSelect }) {
  return (
    <div className="p-1 bg-white rounded-lg shadow-xl border border-slate-200 min-w-[200px] overflow-visible">
      {options.map(option => (
        <StageMenuItem 
          key={option.value} 
          option={option} 
          onSelect={onSelect} 
        />
      ))}
    </div>
  );
}

// Export StageDisplay for use in other components
export function StageDisplay({ value, column, isEditing, onEdit, editValue, onSave, onCancel, stageOptions = DEFAULT_STAGE_OPTIONS, compact = false, onDirectSave }) {
  // Flatten for lookup only
  const FLAT_OPTIONS = React.useMemo(() => {
    const flat = [];
    (stageOptions || []).forEach(p => {
      flat.push({ ...p });
      if (Array.isArray(p.children)) {
        p.children.forEach(ch => flat.push({ ...ch, parentLabel: p.label }));
      }
    });
    return flat;
  }, [stageOptions]);

  const currentStage = FLAT_OPTIONS.find(s => s.value === value);
  
  const handleSelect = (val) => {
    console.log('🟣 [STAGE] Selected:', val);
    if (onDirectSave) {
      onDirectSave(val);
    } else if (typeof onEdit === 'function' && typeof onSave === 'function') {
      onEdit(val);
      setTimeout(() => onSave(), 50);
    }
  };

  const Badge = !currentStage ? (
    <div className="text-xs text-slate-400 text-center py-2 hover:bg-purple-50 rounded transition-colors cursor-pointer w-full">
      לחץ לבחירה
    </div>
  ) : (
    <div className="flex items-center justify-center gap-2 group cursor-pointer py-1">
      <div 
        className="w-4 h-4 rounded-full transition-all duration-300 group-hover:scale-125 flex-shrink-0"
        style={{ 
          backgroundColor: currentStage.color,
          boxShadow: `0 0 10px ${currentStage.glow}, 0 0 15px ${currentStage.glow}`,
          border: '2px solid white'
        }}
      />
      <div className="flex flex-col items-start">
        <span 
          className="text-sm font-semibold px-3 py-1.5 rounded-full transition-all duration-300"
          style={{ 
            backgroundColor: `${currentStage.color}20`,
            color: currentStage.color,
            border: `2px solid ${currentStage.color}60`
          }}
        >
          {currentStage.label}
        </span>
        {currentStage.parentLabel && (
          <span className="text-[10px] text-slate-400 mr-2 mt-0.5 hidden group-hover:inline-block">
            {currentStage.parentLabel}
          </span>
        )}
      </div>
    </div>
  );

  if (isEditing) {
    return (
      <Popover open={true} onOpenChange={(isOpen) => !isOpen && onCancel && onCancel()}>
        <PopoverTrigger asChild>
          <div>{Badge}</div>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-auto overflow-visible" align="center" side="bottom">
          <StageSelector options={stageOptions} onSelect={handleSelect} />
        </PopoverContent>
      </Popover>
    );
  }
  
  return Badge;
}

export default function GenericSpreadsheet({ spreadsheet, onUpdate, fullScreenMode = false, filterByClient = null, onBack = null }) {
  const [columns, setColumns] = useState([]);
  const [rowsData, setRowsData] = useState([]);
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [selectedCells, setSelectedCells] = useState(new Set());
  const [selectedHeaders, setSelectedHeaders] = useState(new Set());
  const [cellStyles, setCellStyles] = useState({});
  const [cellNotes, setCellNotes] = useState({});
  const [subHeaders, setSubHeaders] = useState({});
  const [showSubHeaders, setShowSubHeaders] = useState(false);
  const [headerStyles, setHeaderStyles] = useState({});
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
  const [mergedHeaders, setMergedHeaders] = useState({});
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
  const [showStageManager, setShowStageManager] = useState(false);
  const [customStageOptions, setCustomStageOptions] = useState(DEFAULT_STAGE_OPTIONS);
  const [showSyncDialog, setShowSyncDialog] = useState(false);
  // When using categories/children, allow selecting either parent or child
  const [viewMode, setViewMode] = useState('table');
  const [cellContextMenu, setCellContextMenu] = useState(null);
  const [noteDialogCell, setNoteDialogCell] = useState(null);
  const [noteText, setNoteText] = useState("");
  const [showColorPickerDialog, setShowColorPickerDialog] = useState(false);
  const [colorPickerTargetCell, setColorPickerTargetCell] = useState(null);
  const [showHeaderColorDialog, setShowHeaderColorDialog] = useState(false);
  const [colorPickerTargetHeader, setColorPickerTargetHeader] = useState(null);
  
  // Collaboration State
  const [currentUser, setCurrentUser] = useState(null);
  const [showCommentsSidebar, setShowCommentsSidebar] = useState(false);
  const [commentsTargetCell, setCommentsTargetCell] = useState(null); // null = general, string = cellKey
  const [activeCollaborators, setActiveCollaborators] = useState([]);
  const [currentFocusedCell, setCurrentFocusedCell] = useState(null);

  const editInputRef = useRef(null);
  const columnEditRef = useRef(null);
  const tableRef = useRef(null);
  const contextMenuRef = useRef(null);
  const clientPopoverRef = useRef(null);

  const columnsRef = useRef(columns);
  const rowsDataRef = useRef(rowsData);
  const cellStylesRef = useRef(cellStyles);
  const cellNotesRef = useRef(cellNotes);
  const subHeadersRef = useRef(subHeaders);
  const headerStylesRef = useRef(headerStyles);
  const rowHeightsRef = useRef(rowHeights);
  const validationRulesRef = useRef(validationRules);
  const conditionalFormatsRef = useRef(conditionalFormats);
  const freezeSettingsRef = useRef(freezeSettings);
  const customCellTypesRef = useRef(customCellTypes);
  const mergedCellsRef = useRef(mergedCells);
  const mergedHeadersRef = useRef(mergedHeaders);
  const themeSettingsRef = useRef(themeSettings);
  const savedViewsRef = useRef(savedViews);
  const activeViewIdRef = useRef(activeViewId);
  const chartsRef = useRef(charts);
  const customStageOptionsRef = useRef(customStageOptions);

  useEffect(() => { columnsRef.current = columns; }, [columns]);
  useEffect(() => { customStageOptionsRef.current = customStageOptions; }, [customStageOptions]);
  useEffect(() => { rowsDataRef.current = rowsData; }, [rowsData]);
  useEffect(() => { cellStylesRef.current = cellStyles; }, [cellStyles]);
  useEffect(() => { cellNotesRef.current = cellNotes; }, [cellNotes]);
  useEffect(() => { subHeadersRef.current = subHeaders; }, [subHeaders]);
  useEffect(() => { headerStylesRef.current = headerStyles; }, [headerStyles]);
  useEffect(() => { rowHeightsRef.current = rowHeights; }, [rowHeights]);
  useEffect(() => { validationRulesRef.current = validationRules; }, [validationRules]);
  useEffect(() => { conditionalFormatsRef.current = conditionalFormats; }, [conditionalFormats]);
  useEffect(() => { freezeSettingsRef.current = freezeSettings; }, [freezeSettings]);
  useEffect(() => { customCellTypesRef.current = customCellTypes; }, [customCellTypes]);
  useEffect(() => { mergedCellsRef.current = mergedCells; }, [mergedCells]);
  useEffect(() => { mergedHeadersRef.current = mergedHeaders; }, [mergedHeaders]);
  useEffect(() => { themeSettingsRef.current = themeSettings; }, [themeSettings]);
  useEffect(() => { savedViewsRef.current = savedViews; }, [savedViews]);
  useEffect(() => { activeViewIdRef.current = activeViewId; }, [activeViewId]);
  useEffect(() => { chartsRef.current = charts; }, [charts]);

  // Fetch current user
  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  // Handle Auto-Import on Load
  useEffect(() => {
    const checkAutoImport = async () => {
      if (!spreadsheet?.id || !spreadsheet.google_sheet_id || !spreadsheet.google_sheet_name) return;
      if (spreadsheet.sync_config?.sync_direction === 'import_on_load' || spreadsheet.sync_config?.sync_direction === 'two_way') {
        console.log('🔄 [AUTO-IMPORT] Triggering import from Google Sheets...');
        try {
          toast.info('טוען נתונים עדכניים מ-Google Sheets...');
          await handleImportFromGoogle(spreadsheet.google_sheet_id, spreadsheet.google_sheet_name);
          toast.success('✓ נתונים סונכרנו מ-Google Sheets');
        } catch (e) {
          console.error('Auto-import failed:', e);
          toast.error('שגיאה בטעינת נתונים מ-Google Sheets');
        }
      }
    };
    
    // Slight delay to ensure everything is mounted
    setTimeout(checkAutoImport, 1000);
  }, [spreadsheet?.id]);

  // Polling for spreadsheet data updates (Real-time sync)
  useEffect(() => {
    if (!spreadsheet?.id) return;
    
    const checkForUpdates = async () => {
      // Don't pull updates if user is currently editing a cell to avoid conflicts
      if (editingCell) return;
      
      try {
        const latest = await base44.entities.CustomSpreadsheet.get(spreadsheet.id);
        
        // Simple check if rows changed (length or JSON string) - optimize this in real app
        // Here we just update rows if they are different to allow seeing others' changes
        // We compare stringified versions to avoid deep object equality check complexity
        // Note: This is a heavy operation for large sheets, but acceptable for MVP
        
        if (latest && JSON.stringify(latest.rows_data) !== JSON.stringify(rowsDataRef.current)) {
          console.log('🔄 [SYNC] Incoming changes detected, updating rows...');
          setRowsData(latest.rows_data);
          // Also update columns if changed
          if (JSON.stringify(latest.columns) !== JSON.stringify(columnsRef.current)) {
             setColumns(latest.columns);
          }
        }
      } catch (e) {
        // console.error("Sync polling error", e);
      }
    };

    const interval = setInterval(checkForUpdates, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, [spreadsheet?.id, editingCell]);

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
    if (!popoverOpen) return;

    const handleClickOutside = (e) => {
      if (clientPopoverRef.current && !clientPopoverRef.current.contains(e.target)) {
        setPopoverOpen(null);
      }
    };

    setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [popoverOpen]);

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
      setSubHeaders(spreadsheet.sub_headers || {});
      setShowSubHeaders(spreadsheet.show_sub_headers || false);
      setHeaderStyles(spreadsheet.header_styles || {});
      setRowHeights(spreadsheet.row_heights || {});
      setValidationRules(spreadsheet.validation_rules || []);
      setConditionalFormats(spreadsheet.conditional_formats || []);
      setFreezeSettings(spreadsheet.freeze_settings || { freeze_rows: 0, freeze_columns: 1 });
      setCustomCellTypes(spreadsheet.custom_cell_types || []);
      setMergedCells(spreadsheet.merged_cells || {});
      setMergedHeaders(spreadsheet.merged_headers || {});

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
      
      console.log('🔵🔵🔵 [GENERIC SPREADSHEET] Loading spreadsheet custom_stage_options:', JSON.stringify(spreadsheet.custom_stage_options, null, 2));
      console.log('🔵🔵🔵 [GENERIC SPREADSHEET] DEFAULT_STAGE_OPTIONS:', JSON.stringify(DEFAULT_STAGE_OPTIONS, null, 2));
      
      let finalStageOptions = spreadsheet.custom_stage_options || DEFAULT_STAGE_OPTIONS;
      
      // Always ensure "ללא" exists
      const hasLelo = finalStageOptions.some(opt => opt.value === 'ללא');
      console.log('🔵🔵🔵 [GENERIC SPREADSHEET] Has ללא option?', hasLelo);
      
      if (!hasLelo) {
        console.log('🔵🔵🔵 [GENERIC SPREADSHEET] Adding ללא option to beginning');
        finalStageOptions = [
          { value: 'ללא', label: 'ללא', color: '#cbd5e1', glow: 'rgba(203, 213, 225, 0.4)' },
          ...finalStageOptions
        ];
      }
      
      console.log('🔵🔵🔵 [GENERIC SPREADSHEET] Final stage options to set:', JSON.stringify(finalStageOptions, null, 2));
      setCustomStageOptions(finalStageOptions);

      setHistory([{ 
        columns: initialColumns, 
        rows: initialRows, 
        styles: initialStyles, 
        notes: initialNotes,
        subHeaders: spreadsheet.sub_headers || {},
        mergedHeaders: spreadsheet.merged_headers || {},
        headerStyles: spreadsheet.header_styles || {}
      }]);
      setHistoryIndex(0);
    }
  }, [spreadsheet]);

  const saveToHistory = useCallback((cols, rows, styles, notes, subH, mergedH, hStyles) => {
    console.log('📜 [HISTORY] saveToHistory called:', { 
      isUndoRedoAction, 
      currentHistoryIndex: historyIndex,
      rowsCount: rows?.length,
      colsCount: cols?.length,
      subHeadersCount: subH ? Object.keys(subH).length : 0,
      mergedHeadersCount: mergedH ? Object.keys(mergedH).length : 0
    });
    
    if (isUndoRedoAction) {
      console.log('📜 [HISTORY] Skipped - isUndoRedoAction is true');
      return;
    }
    
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push({ 
        columns: cols, 
        rows: rows, 
        styles: styles, 
        notes: notes,
        subHeaders: subH || {},
        mergedHeaders: mergedH || {},
        headerStyles: hStyles || {}
      });
      if (newHistory.length > 50) newHistory.shift();
      console.log('📜 [HISTORY] New history length:', newHistory.length);
      return newHistory;
    });
    setHistoryIndex(prev => {
      const newIndex = Math.min(prev + 1, 49);
      console.log('📜 [HISTORY] New historyIndex:', newIndex);
      return newIndex;
    });
  }, [historyIndex, isUndoRedoAction]);

  const saveToBackend = useCallback(async () => {
    if (!spreadsheet?.id) {
      console.warn('⚠️ No spreadsheet ID');
      return;
    }
    
    try {
      // Auto-detect client from spreadsheet data
      let detectedClientId = spreadsheet.client_id;
      let detectedClientName = spreadsheet.client_name;
      
      // Find client columns
      const clientColumns = columnsRef.current.filter(col => 
        col.type === 'client' || 
        col.key.toLowerCase().includes('client') || 
        col.key.toLowerCase().includes('לקוח') ||
        col.title?.toLowerCase().includes('לקוח') ||
        col.title?.toLowerCase().includes('client')
      );
      
      // Extract all client names from rows
      const clientNames = new Set();
      if (clientColumns.length > 0) {
        rowsDataRef.current.forEach(row => {
          clientColumns.forEach(col => {
            const value = row[col.key];
            if (value && typeof value === 'string' && value.trim()) {
              clientNames.add(value.trim());
            }
          });
        });
      }
      
      // If we found client names and no client is assigned yet, try to link
      if (clientNames.size > 0 && !detectedClientId) {
        const clientNamesArray = Array.from(clientNames);
        
        // Try to find matching client in system
        try {
          const allClients = await base44.entities.Client.list();
          const matchedClient = allClients.find(c => 
            clientNamesArray.some(name => 
              c.name?.toLowerCase() === name.toLowerCase()
            )
          );
          
          if (matchedClient) {
            detectedClientId = matchedClient.id;
            detectedClientName = matchedClient.name;
            console.log('✓ [AUTO-LINK] Linked spreadsheet to client:', matchedClient.name);
          }
        } catch (e) {
          console.warn('Failed to auto-link client:', e);
        }
      }
      
      const dataToSave = {
        columns: columnsRef.current,
        rows_data: rowsDataRef.current,
        cell_styles: cellStylesRef.current,
        cell_notes: cellNotesRef.current,
        sub_headers: subHeadersRef.current,
        show_sub_headers: showSubHeaders,
        header_styles: headerStylesRef.current,
        row_heights: rowHeightsRef.current,
        validation_rules: validationRulesRef.current,
        conditional_formats: conditionalFormatsRef.current,
        freeze_settings: freezeSettingsRef.current,
        custom_cell_types: customCellTypesRef.current,
        merged_cells: mergedCellsRef.current,
        merged_headers: mergedHeadersRef.current,
        theme_settings: themeSettingsRef.current,
        saved_views: savedViewsRef.current,
        active_view_id: activeViewIdRef.current,
        charts: chartsRef.current,
        custom_stage_options: customStageOptionsRef.current,
        client_id: detectedClientId,
        client_name: detectedClientName
      };

      await base44.entities.CustomSpreadsheet.update(spreadsheet.id, dataToSave);

      if (onUpdate) {
        await onUpdate();
      }
    } catch (error) {
      console.error('❌ [SAVE] Error:', error);
      toast.error('שגיאה בשמירה: ' + (error.message || 'לא ידוע'));
    }
  }, [spreadsheet?.id, spreadsheet?.client_id, spreadsheet?.client_name, onUpdate, showSubHeaders]);

  const handleUndo = useCallback(() => {
    console.log('⏪ [handleUndo] Called!', { historyIndex, historyLength: history.length });
    if (historyIndex <= 0) { 
      console.log('⏪ [handleUndo] Nothing to undo - historyIndex is 0');
      toast.error('אין מה לבטל'); 
      return; 
    }
    console.log('⏪ [handleUndo] Undoing to state:', historyIndex - 1);
    setIsUndoRedoAction(true);
    const prevState = history[historyIndex - 1];
    setColumns(prevState.columns);
    setRowsData(prevState.rows);
    setCellStyles(prevState.styles);
    setCellNotes(prevState.notes || {});
    setSubHeaders(prevState.subHeaders || {});
    setMergedHeaders(prevState.mergedHeaders || {});
    setHeaderStyles(prevState.headerStyles || {});
    setHistoryIndex(prev => prev - 1);
    setTimeout(() => {
      saveToBackend();
      setIsUndoRedoAction(false);
    }, 50);
    toast.success('✓ פעולה בוטלה');
  }, [history, historyIndex, saveToBackend]);

  const handleRedo = useCallback(() => {
    console.log('⏩ [handleRedo] Called!', { historyIndex, historyLength: history.length });
    if (historyIndex >= history.length - 1) { 
      console.log('⏩ [handleRedo] Nothing to redo - at end of history');
      toast.error('אין מה לשחזר'); 
      return; 
    }
    console.log('⏩ [handleRedo] Redoing to state:', historyIndex + 1);
    setIsUndoRedoAction(true);
    const nextState = history[historyIndex + 1];
    setColumns(nextState.columns);
    setRowsData(nextState.rows);
    setCellStyles(nextState.styles);
    setCellNotes(nextState.notes || {});
    setSubHeaders(nextState.subHeaders || {});
    setMergedHeaders(nextState.mergedHeaders || {});
    setHeaderStyles(nextState.headerStyles || {});
    setHistoryIndex(prev => prev + 1);
    setTimeout(() => {
      saveToBackend();
      setIsUndoRedoAction(false);
    }, 50);
    toast.success('✓ פעולה שוחזרה');
  }, [history, historyIndex, saveToBackend]);

  // Listen for client updates
  useEffect(() => {
    const handleClientUpdate = (event) => {
      const updatedClient = event.detail || {};
      if (!updatedClient.id) return;
      
      console.log('📬 [GENERIC SPREADSHEET] Received client update:', updatedClient);
      
      // עדכן את השורות עם כל הנתונים העדכניים של הלקוח
      setRowsData(prev => prev.map(row => {
        if (row.client_id === updatedClient.id) {
          return { 
            ...row, 
            stage: updatedClient.stage,
            name: updatedClient.name,
            // עדכן כל שדה אחר שרלוונטי
          };
        }
        return row;
      }));
    };
    
    window.addEventListener('client:updated', handleClientUpdate);
    return () => window.removeEventListener('client:updated', handleClientUpdate);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // DEBUG: Log all keyboard events
      console.log('🎹 [KEYBOARD] Key pressed:', {
        key: e.key,
        code: e.code,
        ctrl: e.ctrlKey,
        meta: e.metaKey,
        shift: e.shiftKey,
        alt: e.altKey,
        target: e.target.tagName,
        defaultPrevented: e.defaultPrevented
      });
      
      // Skip if user is typing in an input/textarea
      const target = e.target;
      const isTypingInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      
      // Use e.code for language-independent key detection (KeyZ, KeyY work regardless of keyboard layout)
      const isZKey = e.code === 'KeyZ' || e.key.toLowerCase() === 'z' || e.key === 'ז';
      const isYKey = e.code === 'KeyY' || e.key.toLowerCase() === 'y' || e.key === 'ט';
      
      // Undo: Ctrl+Z (but NOT Ctrl+Shift which is for timer drag)
      if ((e.ctrlKey || e.metaKey) && isZKey && !e.shiftKey) { 
        console.log('🔵 [UNDO] Ctrl+Z detected!', { isTypingInput, historyIndex, historyLength: history.length });
        e.preventDefault(); 
        e.stopPropagation();
        e.stopImmediatePropagation();
        if (!isTypingInput) {
          console.log('🔵 [UNDO] Calling handleUndo...');
          handleUndo(); 
        } else {
          console.log('🔵 [UNDO] Skipped - user is typing in input');
        }
        return false;
      }
      // Redo: Ctrl+Y or Ctrl+Shift+Z
      if ((e.ctrlKey || e.metaKey) && (isYKey || (isZKey && e.shiftKey))) { 
        console.log('🟢 [REDO] Ctrl+Y or Ctrl+Shift+Z detected!', { isTypingInput, historyIndex, historyLength: history.length });
        e.preventDefault(); 
        e.stopPropagation();
        e.stopImmediatePropagation();
        if (!isTypingInput) {
          console.log('🟢 [REDO] Calling handleRedo...');
          handleRedo(); 
        } else {
          console.log('🟢 [REDO] Skipped - user is typing in input');
        }
        return false;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && selectedCells.size > 0) {
        e.preventDefault();
        const cellsData = Array.from(selectedCells).map(cellKey => {
          const lastColIndex = cellKey.lastIndexOf('_col');
          if (lastColIndex === -1) return null;
          const rowId = cellKey.substring(0, lastColIndex);
          const colKey = cellKey.substring(lastColIndex + 1);
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
            const lastColIndex = cellKey.lastIndexOf('_col');
            if (lastColIndex === -1) return;
            const rowId = cellKey.substring(0, lastColIndex);
            const colKey = cellKey.substring(lastColIndex + 1);
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
            const lastColIndex = cellKey.lastIndexOf('_col');
            if (lastColIndex === -1) return;
            const rowId = cellKey.substring(0, lastColIndex);
            const colKey = cellKey.substring(lastColIndex + 1);
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
    
    // Use capture phase (true) to intercept before other handlers
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [handleUndo, handleRedo, selectedCells, copiedCells, rowsData, columns, cellStyles, editingCell, saveToHistory, saveToBackend]);

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    if (result.type === 'column') {
      const reorderedColumns = Array.from(columns);
      const [movedColumn] = reorderedColumns.splice(result.source.index, 1);
      reorderedColumns.splice(result.destination.index, 0, movedColumn);
      setColumns(reorderedColumns);
      setTimeout(() => {
        saveToHistory(columnsRef.current, rowsDataRef.current, cellStylesRef.current, cellNotesRef.current, subHeadersRef.current, mergedHeadersRef.current, headerStylesRef.current);
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
    
    // סינון אוטומטי לפי לקוח (אם הוגדר)
    if (filterByClient) {
      const clientColumns = columns.filter(col => 
        col.type === 'client' || 
        col.key.toLowerCase().includes('client') || 
        col.key.toLowerCase().includes('לקוח') ||
        col.title?.toLowerCase().includes('לקוח') ||
        col.title?.toLowerCase().includes('client')
      );
      
      if (clientColumns.length > 0) {
        result = result.filter(row => {
          return clientColumns.some(col => {
            const cellValue = row[col.key];
            if (!cellValue) return false;
            return String(cellValue).toLowerCase().includes(filterByClient.toLowerCase()) ||
                   filterByClient.toLowerCase().includes(String(cellValue).toLowerCase());
          });
        });
      }
    }
    
    if (globalFilter) {
      const searchLower = globalFilter.toLowerCase();
      result = result.filter(row => columns.some(col => {
        const val = row[col.key];
        // For stage columns, search in the label
        if (col.type === 'stage') {
          const stage = STAGE_OPTIONS.find(s => s.value === val);
          return stage?.label?.toLowerCase().includes(searchLower) || stage?.parent?.toLowerCase().includes(searchLower);
        }
        return String(val || '').toLowerCase().includes(searchLower);
      }));
    }
    Object.entries(columnFilters).forEach(([columnKey, filterValue]) => {
      if (filterValue) {
        const searchLower = filterValue.toLowerCase();
        const col = columns.find(c => c.key === columnKey);
        result = result.filter(row => {
          const val = row[columnKey];
          // For stage columns, filter by label
          if (col?.type === 'stage') {
            const stage = STAGE_OPTIONS.find(s => s.value === val);
            return stage?.label?.toLowerCase().includes(searchLower) || stage?.parent?.toLowerCase().includes(searchLower);
          }
          return String(val || '').toLowerCase().includes(searchLower);
        });
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
  }, [rowsData, columns, sortColumn, sortDirection, globalFilter, columnFilters, filterByClient]);

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
    
    const newHeaderStyles = { ...headerStyles };
    delete newHeaderStyles[columnKey];
    setHeaderStyles(newHeaderStyles);

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

    const html = `<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"><title>${spreadsheet.name}</title><style>body{font-family:Arial,sans-serif;direction:rtl;padding:20px}h1{text-align:center;margin-bottom:20px}table{width:100%;border-collapse:collapse;margin:20px 0}th,td{border:1px solid #ccc;padding:8px;text-align:right}th{background-color:#f1f5f9;font-weight:bold}tr:nth-child(even){background-color:#f8fafc}.footer{text-align:center;margin-top:30px;font-size:12px;color:#666}</style></head><body><h1>${spreadsheet.name}</h1><p style="text-align:center;color:#666;margin-bottom:20px">נוצר ב-${new Date().toLocaleDateString('he-IL')} | ${filteredAndSortedData.length} שורות</p><table><thead><tr>${visibleCols.map(col => {
      const headerStyle = headerStyles[col.key] || {};
      return `<th style="${headerStyle.backgroundColor ? `background-color:${headerStyle.backgroundColor};` : ''}${headerStyle.color ? `color:${headerStyle.color};` : ''}${headerStyle.fontWeight ? `font-weight:${headerStyle.fontWeight};` : ''}">${col.title}</th>`;
    }).join('')}</tr></thead><tbody>${filteredAndSortedData.map(row => `<tr>${visibleCols.map(col => {
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

  const getStageLabel = useCallback((val) => {
    if (!val) return '';
    // search parent first
    const parent = (customStageOptions || []).find(s => s.value === val);
    if (parent) return parent.label || val;
    // search children
    for (const p of (customStageOptions || [])) {
      if (Array.isArray(p.children)) {
        const ch = p.children.find(c => c.value === val);
        if (ch) return p.label ? `${p.label} › ${ch.label}` : (ch.label || val);
      }
    }
    return val;
  }, [customStageOptions]);

  const mergeCells = () => {
    if (selectedCells.size < 2) { 
      toast.error('בחר לפחות 2 תאים למיזוג'); 
      return; 
    }
    
    const cellsArray = Array.from(selectedCells);
    
    // Parse cell keys to get row and column info
    const cellsInfo = cellsArray.map(cellKey => {
      const lastColIndex = cellKey.lastIndexOf('_col');
      if (lastColIndex === -1) return null;
      const rowId = cellKey.substring(0, lastColIndex);
      const colKey = cellKey.substring(lastColIndex + 1);
      const rowIndex = filteredAndSortedData.findIndex(r => r.id === rowId);
      const colIndex = visibleColumns.findIndex(c => c.key === colKey);
      return { cellKey, rowId, colKey, rowIndex, colIndex };
    }).filter(Boolean);
    
    if (cellsInfo.length === 0) {
      toast.error('לא ניתן למזג תאים אלה');
      return;
    }
    
    // Calculate merge area
    const minRow = Math.min(...cellsInfo.map(c => c.rowIndex));
    const maxRow = Math.max(...cellsInfo.map(c => c.rowIndex));
    const minCol = Math.min(...cellsInfo.map(c => c.colIndex));
    const maxCol = Math.max(...cellsInfo.map(c => c.colIndex));
    
    // Verify it's a rectangular selection
    const expectedCells = (maxRow - minRow + 1) * (maxCol - minCol + 1);
    if (cellsInfo.length !== expectedCells) {
      toast.error('יש לבחור אזור רצף (מלבן) של תאים');
      return;
    }
    
    const rowspan = maxRow - minRow + 1;
    const colspan = maxCol - minCol + 1;
    
    const masterCell = `${filteredAndSortedData[minRow].id}_${visibleColumns[minCol].key}`;
    
    const mergeKey = `merge_${Date.now()}`;
    setMergedCells(prev => ({ 
      ...prev, 
      [mergeKey]: {
        cells: cellsArray,
        master: masterCell,
        rowspan,
        colspan
      }
    }));
    
    toast.success(`✓ ${cellsArray.length} תאים אוחדו (${rowspan} שורות × ${colspan} עמודות)`);
    setSelectedCells(new Set());
    
    setTimeout(() => {
      saveToHistory(columnsRef.current, rowsDataRef.current, cellStylesRef.current, cellNotesRef.current, subHeadersRef.current, mergedHeadersRef.current, headerStylesRef.current);
      saveToBackend();
    }, 50);
  };

  const unmergeCells = (cellKey) => {
    const mergeKeyToDelete = Object.keys(mergedCells).find(key => 
      mergedCells[key].cells?.includes(cellKey)
    );
    
    if (!mergeKeyToDelete) {
      toast.error('התא אינו חלק ממיזוג');
      return;
    }

    const mergeData = mergedCells[mergeKeyToDelete];
    const newMerged = { ...mergedCells };
    delete newMerged[mergeKeyToDelete];
    setMergedCells(newMerged);
    setCellContextMenu(null);
    
    setTimeout(() => {
      saveToHistory(columnsRef.current, rowsDataRef.current, cellStylesRef.current, cellNotesRef.current, subHeadersRef.current, mergedHeadersRef.current, headerStylesRef.current);
      saveToBackend();
    }, 50);
    
    toast.success(`✓ מיזוג בוטל (${mergeData.cells?.length || 0} תאים שוחררו)`);
  };

  const getMergeInfo = (cellKey) => {
    for (const [mergeKey, mergeData] of Object.entries(mergedCells)) {
      if (mergeData.cells?.includes(cellKey)) {
        return { mergeKey, ...mergeData, isMaster: mergeData.master === cellKey };
      }
    }
    return null;
  };

  const mergeHeaders = () => {
    console.log('🔵 [MERGE] mergeHeaders called', { selectedHeaders: Array.from(selectedHeaders) });
    
    if (selectedHeaders.size < 2) {
      toast.error('בחר לפחות 2 כותרות למיזוג');
      return;
    }

    const headersArray = Array.from(selectedHeaders);
    const indices = headersArray
      .map(key => visibleColumns.findIndex(c => c.key === key))
      .filter(i => i >= 0)
      .sort((a, b) => a - b);
    
    console.log('🔵 [MERGE] indices:', indices);
    
    if (indices.length < 2) {
      toast.error('לא נמצאו מספיק עמודות');
      return;
    }
    
    const minIndex = indices[0];
    const maxIndex = indices[indices.length - 1];
    const colspan = maxIndex - minIndex + 1;
    
    const isConsecutive = indices.every((val, i, arr) => i === 0 || val === arr[i - 1] + 1);
    console.log('🔵 [MERGE] isConsecutive:', isConsecutive, { minIndex, maxIndex, colspan });
    
    if (!isConsecutive) {
      toast.error('ניתן למזג רק כותרות רציפות');
      return;
    }
    
    const masterKey = visibleColumns[minIndex].key;
    const mergeKey = `header_merge_${Date.now()}`;
    
    const defaultTitle = headersArray.map(k => visibleColumns.find(c => c.key === k)?.title).join(' + ');
    const title = prompt('כותרת עליונה למיזוג:', defaultTitle);
    
    if (title === null) {
      console.log('🔵 [MERGE] User cancelled');
      return;
    }
    
    const finalTitle = title.trim() || defaultTitle;
    
    console.log('🔵 [MERGE] Creating merged header:', { mergeKey, masterKey, colspan, title: finalTitle, columns: headersArray });
    
    setMergedHeaders(prev => {
      const newHeaders = {
        ...prev,
        [mergeKey]: {
          columns: headersArray,
          master: masterKey,
          colspan,
          title: finalTitle
        }
      };
      console.log('🔵 [MERGE] New mergedHeaders state:', newHeaders);
      return newHeaders;
    });
    
    setShowSubHeaders(true);
    toast.success(`✓ ${headersArray.length} כותרות אוחדו`);
    setSelectedHeaders(new Set());
    setTimeout(() => {
      saveToHistory(columnsRef.current, rowsDataRef.current, cellStylesRef.current, cellNotesRef.current, subHeadersRef.current, mergedHeadersRef.current, headerStylesRef.current);
      saveToBackend();
    }, 50);
  };

  const unmergeHeaders = (columnKey) => {
    console.log('✂️ [UNMERGE] unmergeHeaders called for:', columnKey);
    console.log('✂️ [UNMERGE] Current mergedHeaders:', mergedHeaders);
    
    const mergeKeyToDelete = Object.keys(mergedHeaders).find(key =>
      mergedHeaders[key].columns?.includes(columnKey)
    );

    console.log('✂️ [UNMERGE] Found merge key:', mergeKeyToDelete);

    if (!mergeKeyToDelete) {
      toast.error('הכותרת אינה חלק ממיזוג');
      return;
    }

    const newMerged = { ...mergedHeaders };
    delete newMerged[mergeKeyToDelete];
    setMergedHeaders(newMerged);
    
    console.log('✂️ [UNMERGE] After deletion:', newMerged);
    
    if (Object.keys(newMerged).length === 0 && Object.keys(subHeaders).length === 0) {
      console.log('✂️ [UNMERGE] No more headers, hiding sub-headers row');
      setShowSubHeaders(false);
    }
    
    const newHeaderStyles = { ...headerStyles };
    delete newHeaderStyles[mergeKeyToDelete];
    setHeaderStyles(newHeaderStyles);

    setTimeout(() => {
      saveToHistory(columnsRef.current, rowsDataRef.current, cellStylesRef.current, cellNotesRef.current);
      saveToBackend();
    }, 50);
    toast.success('✓ מיזוג כותרות בוטל');
  };

  const getHeaderMergeInfo = (columnKey) => {
    for (const [mergeKey, mergeData] of Object.entries(mergedHeaders)) {
      if (mergeData.columns?.includes(columnKey)) {
        return { mergeKey, ...mergeData, isMaster: mergeData.master === columnKey };
      }
    }
    return null;
  };

  const addOrEditSubHeader = (columnKey, position = null) => {
    // Get current sub header data
    const currentData = subHeaders[columnKey];
    const currentTitle = typeof currentData === 'object' ? currentData.title : (currentData || '');
    const currentPosition = typeof currentData === 'object' ? currentData.position : 'above';
    
    const newTitle = prompt('כותרת משנה:', currentTitle);
    
    if (newTitle === null) return;
    
    if (newTitle.trim()) {
      setSubHeaders(prev => ({ 
        ...prev, 
        [columnKey]: { 
          title: newTitle.trim(), 
          position: position || currentPosition || 'above' 
        } 
      }));
      setShowSubHeaders(true);
      toast.success('✓ כותרת משנה נוספה');
    } else {
      const newSubHeaders = { ...subHeaders };
      delete newSubHeaders[columnKey];
      setSubHeaders(newSubHeaders);
      
      const newHeaderStyles = { ...headerStyles };
      delete newHeaderStyles[columnKey];
      setHeaderStyles(newHeaderStyles);

      if (Object.keys(newSubHeaders).length === 0 && Object.keys(mergedHeaders).length === 0) {
        setShowSubHeaders(false);
      }
      toast.success('✓ כותרת משנה הוסרה');
    }
    
    setTimeout(() => {
      saveToHistory(columnsRef.current, rowsDataRef.current, cellStylesRef.current, cellNotesRef.current, subHeadersRef.current, mergedHeadersRef.current, headerStylesRef.current);
      saveToBackend();
    }, 50);
  };

  const changeSubHeaderPosition = (columnKey, newPosition) => {
    const currentData = subHeaders[columnKey];
    if (!currentData) return;
    
    const title = typeof currentData === 'object' ? currentData.title : currentData;
    setSubHeaders(prev => ({
      ...prev,
      [columnKey]: { title, position: newPosition }
    }));
    
    setTimeout(() => {
      saveToHistory(columnsRef.current, rowsDataRef.current, cellStylesRef.current, cellNotesRef.current);
      saveToBackend();
    }, 50);
    toast.success(`✓ מיקום כותרת משנה שונה ל${newPosition === 'above' ? 'מעל' : 'מתחת'}`);
  };

  // Helper to get sub header title (handles both old string format and new object format)
  const getSubHeaderTitle = (columnKey) => {
    const data = subHeaders[columnKey];
    if (!data) return null;
    return typeof data === 'object' ? data.title : data;
  };

  // Helper to get sub header position
  const getSubHeaderPosition = (columnKey) => {
    const data = subHeaders[columnKey];
    if (!data) return 'above';
    return typeof data === 'object' ? (data.position || 'above') : 'above';
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
    const lastColIndex = dragStartCell.lastIndexOf('_col');
    if (lastColIndex === -1) return;
    
    const startRowId = dragStartCell.substring(0, lastColIndex);
    const startColKey = dragStartCell.substring(lastColIndex + 1);
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
      saveToHistory(columnsRef.current, rowsDataRef.current, cellStylesRef.current, cellNotesRef.current, subHeadersRef.current, mergedHeadersRef.current, headerStylesRef.current);
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

  const isClientColumn = (column) => {
    if (!column) return false;
    const title = (column.title || '').toLowerCase();
    const key = (column.key || '').toLowerCase();
    return column.type === 'client' || 
           title.includes('לקוח') || 
           title.includes('client') ||
           key.includes('לקוח') ||
           key.includes('client');
  };

  const handleCellClick = (rowId, columnKey, event) => {
    const isAltPressed = event?.altKey || event?.getModifierState?.('AltGraph');
    if (isAltPressed) {
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

    // Enter - Navigate to client page with spreadsheet (optimized)
    if (event?.key === 'Enter') {
      event.preventDefault();
      const column = columns.find(c => c.key === columnKey);

      if (isClientColumn(column)) {
        const row = filteredAndSortedData.find(r => r.id === rowId);
        const clientName = row?.[columnKey];

        if (clientName) {
          const client = allClients.find(c => 
            c.name?.toLowerCase() === clientName.toLowerCase()
          );

          if (client) {
            const url = spreadsheet?.id 
              ? createPageUrl(`Clients?clientId=${client.id}&spreadsheetId=${spreadsheet.id}`)
              : createPageUrl(`Clients?clientId=${client.id}`);

            window.history.pushState(null, '', url);
            window.dispatchEvent(new PopStateEvent('popstate'));
          } else {
            toast.error('לקוח לא נמצא במערכת');
          }
        }
      }
      return;
    }

    if (event?.ctrlKey || event?.metaKey) {
      event.preventDefault();
      setPopoverOpen(`${rowId}_${columnKey}`);
      return;
    }

    const row = filteredAndSortedData.find(r => r.id === rowId);
    if (!row) return;
    const column = columns.find(c => c.key === columnKey);

    // Update presence
    setCurrentFocusedCell(`${rowId}_${column.key}`);

    // Stage columns have their own click handler
    if (column.type === 'stage') {
      setEditingCell(`${rowId}_${column.key}`);
      setEditValue(String(row[column.key] || ''));
      return;
    }

    const currentValue = row[column.key] || '';
    setEditingCell(`${rowId}_${column.key}`);
    setEditValue(String(currentValue));
    setTimeout(() => editInputRef.current?.focus(), 0);
  };

  const handleClientPickerToggle = (rowId, columnKey, event) => {
    event.preventDefault();
    event.stopPropagation();
    setShowClientPicker(`${rowId}_${columnKey}`);
    setClientSearchQuery("");
  };

  const handleCellDoubleClick = (rowId, columnKey, event) => {
    event.preventDefault();
    event.stopPropagation();
    const cellKey = `${rowId}_${columnKey}`;
    setCellContextMenu(cellKey);
  };

  const handleHeaderClick = (columnKey, event) => {
    const isAltPressed = event?.altKey || event?.getModifierState?.('AltGraph');
    console.log('🖱️ [HEADER CLICK]', { columnKey, alt: event?.altKey, altGraph: event?.getModifierState?.('AltGraph'), shift: event?.shiftKey, ctrl: event?.ctrlKey });

    if (isAltPressed) {
      event.preventDefault();
      setSelectedHeaders(prev => {
        const newSet = new Set(prev);
        if (newSet.has(columnKey)) {
          newSet.delete(columnKey);
        } else {
          newSet.add(columnKey);
        }
        console.log('🖱️ [HEADER CLICK] New selectedHeaders:', Array.from(newSet));
        return newSet;
      });
      return;
    }
    
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
      saveToHistory(columnsRef.current, rowsDataRef.current, cellStylesRef.current, newNotes, subHeadersRef.current, mergedHeadersRef.current, headerStylesRef.current);
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
      saveToHistory(columnsRef.current, rowsDataRef.current, newStyles, cellNotesRef.current, subHeadersRef.current, mergedHeadersRef.current, headerStylesRef.current);
      saveToBackend();
    }, 50);
    
    toast.success('✓ הדגשה הוחלה');
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
    
    // Fixed: Split by last occurrence of "_col" to handle row IDs that might contain underscores
    const lastColIndex = editingCell.lastIndexOf('_col');
    if (lastColIndex === -1) {
      console.error('❌ Invalid cellKey:', editingCell);
      toast.error('שגיאה בזיהוי התא');
      return;
    }
    
    const rowId = editingCell.substring(0, lastColIndex);
    const columnKey = editingCell.substring(lastColIndex + 1);
    
    console.log('💾 [SAVE] Saving cell:', { cellKey: editingCell, rowId, columnKey, editValue });
    
    // Auto-convert V/X for mixed_check columns
    const column = columns.find(c => c.key === columnKey);
    let finalValue = editValue;
    if (column?.type === 'mixed_check') {
      if (editValue === 'V' || editValue === 'v') finalValue = '✓';
      else if (editValue === 'X' || editValue === 'x') finalValue = '✗';
    }
    
    const validationError = validateCell(columnKey, finalValue);
    if (validationError) {
      setValidationErrors(prev => ({ ...prev, [editingCell]: validationError }));
      toast.error(validationError);
      return;
    }
    setValidationErrors(prev => { const { [editingCell]: removed, ...rest } = prev; return rest; });
    
    const updatedRows = rowsData.map(row => 
      row.id === rowId ? { ...row, [columnKey]: finalValue } : row
    );
    
    console.log('💾 [SAVE] Updated rows:', updatedRows);
    
    setRowsData(updatedRows);
    setEditingCell(null);
    setEditValue("");
    
    // Update refs immediately for saveToBackend
    rowsDataRef.current = updatedRows;
    
    setTimeout(() => {
      saveToHistory(columnsRef.current, updatedRows, cellStylesRef.current, cellNotesRef.current, subHeadersRef.current, mergedHeadersRef.current, headerStylesRef.current);
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

  const handleOpenHeaderColorDialog = (columnKey) => {
    setColorPickerTargetHeader(columnKey);
    setShowHeaderColorDialog(true);
    setPopoverOpen(null);
  };

  const handleExportToGoogle = async (spreadsheetId, sheetName, syncMode = 'overwrite') => {
    const visibleCols = columns.filter(col => col.visible !== false);
    const headers = visibleCols.map(col => col.title);
    const rows = filteredAndSortedData.map(row => {
      return visibleCols.map(col => {
        const val = row[col.key];
        // Clean value if needed
        return val === undefined || val === null ? '' : String(val);
      });
    });

    if (syncMode === 'two_way_sync') {
      // 1. Prepare Local Metadata for Sync
      const localStyles = [];
      const localNotes = [];
      
      rows.forEach((row) => {
          const rowStyles = [];
          const rowNotes = [];
          visibleCols.forEach((col) => {
              const cellKey = `${row.id}_${col.key}`;
              rowStyles.push(cellStyles[cellKey] || null);
              rowNotes.push(cellNotes[cellKey] || null);
          });
          localStyles.push(rowStyles);
          localNotes.push(rowNotes);
      });

      const { data } = await base44.functions.invoke('googleSheets', {
        action: 'twoWaySync',
        spreadsheetId,
        sheetName,
        localHeaders: headers,
        localRows: rows,
        localStyles,
        localNotes,
        primaryKeyColumn: visibleCols[0]?.title // Assuming first column is key/ID
      });

      if (data.success && data.mergedData) {
        // Handle merged data update
        const mergedHeaders = data.mergedHeaders || headers;
        const mergedRows = data.mergedData;
        const mergedStyles = data.mergedStyles || [];
        const mergedNotes = data.mergedNotes || [];
        const remoteMerges = data.mergedMerges || [];

        // Update columns structure if new headers appeared
        const newColumns = [...columns];
        const colMapping = [];
        
        mergedHeaders.forEach((header, index) => {
          const existingCol = newColumns.find(c => c.title === header);
          if (existingCol) {
            colMapping[index] = existingCol.key;
          } else {
            const newKey = `col_${Date.now()}_${index}`;
            newColumns.push({
              key: newKey,
              title: header,
              width: '150px',
              type: 'text',
              visible: true
            });
            colMapping[index] = newKey;
          }
        });

        // Rebuild rows data and Metadata
        const newRowsData = [];
        const newCellStyles = {};
        const newCellNotes = {};
        
        mergedRows.forEach((row, rIndex) => {
          const newRow = { id: `row_sync_${Date.now()}_${rIndex}` };
          const rowStyles = mergedStyles[rIndex] || [];
          const rowNotes = mergedNotes[rIndex] || [];

          row.forEach((cellVal, cIndex) => {
            const key = colMapping[cIndex];
            if (key) {
                newRow[key] = cellVal;
                // Map style/note back to cellKey
                if (rowStyles[cIndex]) newCellStyles[`${newRow.id}_${key}`] = rowStyles[cIndex];
                if (rowNotes[cIndex]) newCellNotes[`${newRow.id}_${key}`] = rowNotes[cIndex];
            }
          });
          newRowsData.push(newRow);
        });

        // Map Remote Merges back to Local
        const newMergedCells = {};
        remoteMerges.forEach(merge => {
             // Skip header merges (rowIndex 0)
             if (merge.startRowIndex > 0) {
                 const startRow = merge.startRowIndex - 1;
                 const endRow = merge.endRowIndex - 1;
                 
                 if (newRowsData[startRow]) {
                     const rowId = newRowsData[startRow].id;
                     const colKey = colMapping[merge.startColumnIndex];
                     
                     if (rowId && colKey) {
                         const mergeKey = `merge_sync_${Date.now()}_${Math.random()}`;
                         const cells = [];
                         for(let r = startRow; r < endRow; r++) {
                             for(let c = merge.startColumnIndex; c < merge.endColumnIndex; c++) {
                                 if (newRowsData[r] && colMapping[c]) {
                                     cells.push(`${newRowsData[r].id}_${colMapping[c]}`);
                                 }
                             }
                         }
                         newMergedCells[mergeKey] = {
                             cells,
                             master: `${rowId}_${colKey}`,
                             rowspan: endRow - startRow,
                             colspan: merge.endColumnIndex - merge.startColumnIndex
                         };
                     }
                 }
             }
        });

        setColumns(newColumns);
        setRowsData(newRowsData);
        setCellStyles(newCellStyles);
        setCellNotes(newCellNotes);
        setMergedCells(newMergedCells);

        columnsRef.current = newColumns;
        rowsDataRef.current = newRowsData;
        cellStylesRef.current = newCellStyles;
        cellNotesRef.current = newCellNotes;
        mergedCellsRef.current = newMergedCells;
        
        setTimeout(() => {
          saveToHistory(newColumns, newRowsData, newCellStyles, newCellNotes, subHeadersRef.current, mergedHeadersRef.current, headerStylesRef.current);
          saveToBackend();
        }, 100);
        
        toast.success(`✓ סנכרון דו-כיווני הושלם עם מטא-דאטה`);
      }
    } else {
      
      // Prepare Metadata for Export (Full Sync only)
      let metadata = null;
      if (syncMode === 'overwrite') {
          metadata = {
              merges: [],
              styles: [],
              notes: [],
              headerStyles: []
          };

          // 1. Merges
          // Convert local mergedCells (rowId_colKey) to indices
          Object.values(mergedCells).forEach(merge => {
              // Parse master to get start
              const masterParts = merge.master.split('_col');
              if (masterParts.length < 2) return;
              const rowId = masterParts[0]; // e.g. "row_123"
              // Fix for complex IDs: "row_123_456" -> we split by LAST _col
              // Actually my parser above is weak. Let's use generic approach:
              
              const lastUnderscore = merge.master.lastIndexOf('_');
              const rId = merge.master.substring(0, lastUnderscore);
              const cKey = merge.master.substring(lastUnderscore + 1);
              
              const rIndex = rows.findIndex((r, i) => filteredAndSortedData[i].id === rId);
              const cIndex = visibleCols.findIndex(c => c.key === cKey);
              
              if (rIndex >= 0 && cIndex >= 0) {
                  metadata.merges.push({
                      startRowIndex: rIndex + 1, // +1 for header
                      endRowIndex: rIndex + 1 + (merge.rowspan || 1),
                      startColumnIndex: cIndex,
                      endColumnIndex: cIndex + (merge.colspan || 1)
                  });
              }
          });

          // 2. Styles & Notes
          rows.forEach((row, rIndex) => {
              const rowData = filteredAndSortedData[rIndex];
              const rowStyles = [];
              const rowNotes = [];
              
              visibleCols.forEach((col, cIndex) => {
                  const cellKey = `${rowData.id}_${col.key}`;
                  const style = cellStyles[cellKey];
                  const note = cellNotes[cellKey];
                  
                  if (style) rowStyles[cIndex] = style;
                  if (note) rowNotes[cIndex] = note;
              });
              metadata.styles.push(rowStyles);
              metadata.notes.push(rowNotes);
          });
          
          // 3. Header Styles
          // Not fully implemented on frontend side to store array, but we have `headerStyles` map
          // metadata.headerStyles = ...
      }

      await base44.functions.invoke('googleSheets', {
        action: 'update',
        spreadsheetId,
        sheetName,
        headers,
        values: rows,
        mode: syncMode, // 'overwrite', 'append', 'update_existing'
        metadata: metadata // New: Send formatting data
      });
    }
  };

  const handleImportFromGoogle = async (spreadsheetId, sheetName, syncMode = 'overwrite') => {
    toast.info('מייבא נתונים, עיצובים ומיזוגים מגוגל...');
    
    const { data } = await base44.functions.invoke('googleSheets', {
      action: 'read',
      spreadsheetId,
      sheetName,
      includeMetadata: true // NEW: Request advanced data
    });

    console.log('📥 [IMPORT] Google Sheets Data (Advanced):', data);

    if (data.success) {
      const importedHeaders = data.headers || [];
      const importedRows = data.rows || [];
      const importedMerges = data.merges || []; // [{startRowIndex, endRowIndex, startColumnIndex, endColumnIndex}]
      const importedStyles = data.styles || []; // [ [ {backgroundColor...} ] ]
      const importedNotes = data.notes || []; // [ [ "note" ] ]
      
      let newColumns = [...columns];
      const colMapping = []; // sheet_index -> colKey

      // 1. Map Headers / Columns
      importedHeaders.forEach((header, index) => {
        const existingCol = newColumns.find(c => c.title === header);
        if (existingCol) {
          colMapping[index] = existingCol.key;
        } else {
          const newKey = `col_imp_${Date.now()}_${index}`;
          newColumns.push({
            key: newKey,
            title: header || `Column ${index + 1}`,
            width: '150px',
            type: 'text',
            visible: true
          });
          colMapping[index] = newKey;
        }
      });

      // 2. Map Rows
      const newRowsData = importedRows.map((row, rIndex) => {
        const newRow = { id: `row_imp_${Date.now()}_${rIndex}` };
        row.forEach((cellVal, cIndex) => {
          const key = colMapping[cIndex];
          if (key) newRow[key] = cellVal;
        });
        return newRow;
      });

      // 3. Process Metadata (Styles, Notes, Merges)
      let newCellStyles = { ...cellStylesRef.current };
      let newCellNotes = { ...cellNotesRef.current };
      let newMergedCells = { ...mergedCellsRef.current };

      if (syncMode === 'overwrite') {
          newCellStyles = {};
          newCellNotes = {};
          newMergedCells = {};
      }

      // Map Styles & Notes
      newRowsData.forEach((row, rIndex) => {
          const rowStyles = importedStyles[rIndex] || [];
          const rowNotes = importedNotes[rIndex] || [];
          
          rowStyles.forEach((style, cIndex) => {
              if (style && Object.keys(style).length > 0) {
                  const key = colMapping[cIndex];
                  if (key) newCellStyles[`${row.id}_${key}`] = style;
              }
          });
          
          rowNotes.forEach((note, cIndex) => {
              if (note) {
                  const key = colMapping[cIndex];
                  if (key) newCellNotes[`${row.id}_${key}`] = note;
              }
          });
      });

      // Map Merges
      // Google Indices: Row 0 = Header. Data starts at Row 1.
      // GenericSpreadsheet: Headers are separate. Data rows index 0 = Row 1 in Grid.
      // So Google Row 1 = Data Row 0.
      
      importedMerges.forEach(merge => {
          // Check if it's a body merge or header merge
          // Header is row index 0.
          
          if (merge.startRowIndex === 0) {
              // HEADER MERGE (Not fully supported in GenericSpreadsheet for complex cases yet, but we have subheaders)
              // If we have mergedHeaders support:
              // merge.startColumnIndex to merge.endColumnIndex - 1
              // Not implemented in this import pass to keep it safe, 
              // focusing on BODY merges which are indices > 0
          } else {
              // BODY MERGE
              // Adjust indices for data rows (subtract 1 for header)
              const startRow = merge.startRowIndex - 1;
              const endRow = merge.endRowIndex - 1; // Exclusive in Google, so (end-1) - 1
              
              if (startRow >= 0 && newRowsData[startRow]) {
                  const rowId = newRowsData[startRow].id;
                  const colKey = colMapping[merge.startColumnIndex];
                  
                  if (rowId && colKey) {
                      const mergeKey = `merge_imp_${Date.now()}_${Math.random()}`;
                      const cells = [];
                      
                      // Collect all cell keys in range
                      for(let r = startRow; r < endRow; r++) {
                          for(let c = merge.startColumnIndex; c < merge.endColumnIndex; c++) {
                              if (newRowsData[r] && colMapping[c]) {
                                  cells.push(`${newRowsData[r].id}_${colMapping[c]}`);
                              }
                          }
                      }
                      
                      const rowspan = endRow - startRow;
                      const colspan = merge.endColumnIndex - merge.startColumnIndex;
                      
                      newMergedCells[mergeKey] = {
                          cells,
                          master: `${rowId}_${colKey}`,
                          rowspan,
                          colspan
                      };
                  }
              }
          }
      });

      // Apply Data
      let finalRows = [];
      let finalColumns = newColumns;

      if (syncMode === 'append') {
        finalRows = [...rowsDataRef.current, ...newRowsData];
      } else if (syncMode === 'update_existing') {
        const existingRows = [...rowsDataRef.current];
        const keyCol = newColumns[0]?.key;
        if (keyCol) {
            newRowsData.forEach(importedRow => {
                const matchIndex = existingRows.findIndex(r => r[keyCol] === importedRow[keyCol]);
                if (matchIndex >= 0) {
                    existingRows[matchIndex] = { ...existingRows[matchIndex], ...importedRow };
                } else {
                    existingRows.push(importedRow);
                }
            });
            finalRows = existingRows;
        } else {
            finalRows = [...existingRows, ...newRowsData];
        }
      } else {
        finalRows = newRowsData;
      }

      setColumns(finalColumns);
      setRowsData(finalRows);
      setCellStyles(newCellStyles);
      setCellNotes(newCellNotes);
      setMergedCells(newMergedCells);
      
      columnsRef.current = finalColumns;
      rowsDataRef.current = finalRows;
      cellStylesRef.current = newCellStyles;
      cellNotesRef.current = newCellNotes;
      mergedCellsRef.current = newMergedCells;
      
      setTimeout(() => {
        saveToHistory(finalColumns, finalRows, newCellStyles, newCellNotes, subHeadersRef.current, mergedHeadersRef.current, headerStylesRef.current);
        saveToBackend();
      }, 100);
      
      toast.success(`✓ יובאו נתונים, עיצובים ומיזוגים בהצלחה!`);
    } else {
      throw new Error(data.error || 'Import failed');
    }
  };

  const handleSaveGoogleLink = async (spreadsheetId, sheetName, syncConfig) => {
    const updateData = {
      google_sheet_id: spreadsheetId,
      google_sheet_name: sheetName
    };
    if (syncConfig) {
      updateData.sync_config = syncConfig;
    }
    await base44.entities.CustomSpreadsheet.update(spreadsheet.id, updateData);
    if (onUpdate) onUpdate();
  };

  const splitColumn = async (columnKey) => {
    const col = columns.find(c => c.key === columnKey);
    if (!col) return;

    const delimiter = prompt(`פיצול עמודה "${col.title}"\n\nהזן תו מפריד (לדוגמה: , או ; או רווח):`, ',');
    if (!delimiter && delimiter !== '') return;

    const numParts = prompt('לכמה חלקים לפצל? (מקסימום 10)', '2');
    const parts = parseInt(numParts);
    if (isNaN(parts) || parts < 2 || parts > 10) {
      toast.error('מספר חלקים לא תקין (2-10)');
      return;
    }

    const newColumns = [];
    for (let i = 1; i <= parts; i++) {
      newColumns.push({
        key: `${columnKey}_part${i}`,
        title: `${col.title} (${i})`,
        width: col.width,
        type: col.type,
        visible: true
      });
    }

    const colIndex = columns.findIndex(c => c.key === columnKey);
    const updatedColumns = [
      ...columns.slice(0, colIndex),
      ...newColumns,
      ...columns.slice(colIndex + 1)
    ];

    const updatedRows = rowsData.map(row => {
      const value = row[columnKey] || '';
      const splitValues = String(value).split(delimiter);
      const newRow = { ...row };

      delete newRow[columnKey];

      for (let i = 0; i < parts; i++) {
        newRow[`${columnKey}_part${i + 1}`] = splitValues[i]?.trim() || '';
      }

      return newRow;
    });

    setColumns(updatedColumns);
    setRowsData(updatedRows);

    setTimeout(() => {
      saveToHistory(columnsRef.current, rowsDataRef.current, cellStylesRef.current, cellNotesRef.current);
      saveToBackend();
    }, 50);

    toast.success(`✓ עמודה פוצלה ל-${parts} חלקים לפי "${delimiter}"`);
  };

  const applyHeaderColor = (columnKey, style) => {
    const newHeaderStyles = { 
      ...headerStyles, 
      [columnKey]: { 
        ...(headerStyles[columnKey] || {}), 
        ...style 
      } 
    };
    
    setHeaderStyles(newHeaderStyles);
    
    setTimeout(() => {
      saveToBackend();
    }, 100);
    
    toast.success('✓ צבע כותרת עודכן');
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

  // Calculate offsets for sticky columns
  const stickyColumnOffsets = useMemo(() => {
    const offsets = [];
    let currentOffset = 48; // Start after handle column (w-12 = 3rem = 48px)
    visibleColumns.forEach(col => {
      offsets.push(currentOffset);
      const width = parseInt(col.width) || 150;
      currentOffset += width;
    });
    return offsets;
  }, [visibleColumns]);

  // Calculate offsets for sticky rows (assuming header is ~40px)
  const stickyRowOffsets = useMemo(() => {
    const offsets = [];
    let currentOffset = showSubHeaders && (Object.keys(mergedHeaders).length > 0 || Object.keys(subHeaders).length > 0) ? 80 : 40; // Approx header height
    filteredAndSortedData.forEach(row => {
      offsets.push(currentOffset);
      const height = rowHeights[row.id] || 40;
      currentOffset += height;
    });
    return offsets;
  }, [filteredAndSortedData, rowHeights, showSubHeaders, mergedHeaders, subHeaders]);

  console.log('📊 [RENDER] State:', {
    selectedHeaders: Array.from(selectedHeaders),
    mergedHeaders: Object.keys(mergedHeaders),
    showSubHeaders,
    subHeaders: Object.keys(subHeaders)
  });

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

      <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="border-b space-y-4 pb-4">
          {!fullScreenMode && (
            <div className="flex items-center mb-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (onBack) {
                    onBack();
                  } else {
                    window.history.back();
                  }
                }}
                className="gap-1 text-slate-500 hover:text-slate-800 p-0 hover:bg-transparent"
              >
                <ChevronRight className="w-4 h-4" />
                חזרה לרשימת טבלאות
              </Button>
            </div>
          )}
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Table className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-slate-800">{spreadsheet.name}</CardTitle>
                <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                  <span className="bg-slate-100 px-2 py-0.5 rounded-full">{filteredAndSortedData.length} שורות</span>
                  <span>•</span>
                  <span>{visibleColumns.length} עמודות</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2 mr-4 flex-wrap">
              {Object.keys(cellStyles).length > 0 && (
                <Badge variant="secondary" className="bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200">
                  <Palette className="w-3 h-3 ml-1" />
                  {Object.keys(cellStyles).length}
                </Badge>
              )}
              {Object.keys(cellNotes).length > 0 && (
                <Badge variant="secondary" className="bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200">
                  <MessageSquare className="w-3 h-3 ml-1" />
                  {Object.keys(cellNotes).length}
                </Badge>
              )}
              </div>
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
                  {Object.keys(mergedCells).length} מיזוגי תאים
                </Badge>
              )}
              {(Object.keys(mergedHeaders).length > 0 || Object.keys(subHeaders).length > 0) && (
                <Badge className="bg-blue-100 text-blue-800">
                  <Merge className="w-3 h-3 ml-1" />
                  {Object.keys(mergedHeaders).length + Object.keys(subHeaders).length} כותרות
                </Badge>
              )}
              {Object.keys(headerStyles).length > 0 && (
                <Badge className="bg-yellow-100 text-yellow-800">
                  <Palette className="w-3 h-3 ml-1" />
                  {Object.keys(headerStyles).length} עיצוב כותרות
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
            
            {/* Collaborators & Presence */}
            <div className="flex items-center gap-2 px-2 xl:border-l border-slate-200">
               <Collaborators 
                 spreadsheetId={spreadsheet.id} 
                 currentUser={currentUser}
                 currentCell={currentFocusedCell}
                 onCollaboratorsChange={setActiveCollaborators}
               />
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-3 pt-2">
            <div className="flex flex-1 items-center gap-2 overflow-x-auto pb-2 lg:pb-0 no-scrollbar mask-fade-right">
              <Button onClick={handleUndo} size="sm" variant="outline" disabled={!canUndo} title="בטל (Ctrl+Z)"><Undo className="w-4 h-4" /></Button>
              <Button onClick={handleRedo} size="sm" variant="outline" disabled={!canRedo} title="שחזר (Ctrl+Y)"><Redo className="w-4 h-4" /></Button>
              <Popover>
                <PopoverTrigger asChild>
                  <Button size="sm" variant="outline" className="gap-2">
                    <Type className="w-4 h-4" />
                    כותרות משנה
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64" align="end" dir="rtl">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">הצג כותרות משנה</span>
                      <Switch checked={showSubHeaders} onCheckedChange={(val) => {
                        setShowSubHeaders(val);
                        setTimeout(() => saveToBackend(), 50);
                      }} />
                    </div>
                    <Separator />
                    <div className="text-xs text-slate-600 bg-blue-50 p-2 rounded">
                      💡 לחץ על כותרת עמודה כדי להוסיף כותרת משנה
                    </div>
                    {(Object.keys(subHeaders).length > 0 || Object.keys(mergedHeaders).length > 0) && (
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {visibleColumns.map(col => {
                          const mergedHeader = getHeaderMergeInfo(col.key);
                          const subHeaderTitle = getSubHeaderTitle(col.key);
                          const subHeaderPos = getSubHeaderPosition(col.key);

                          if (mergedHeader && !mergedHeader.isMaster) {
                            return null;
                          }
                          
                          const headerKeyForStyle = mergedHeader ? mergedHeader.mergeKey : col.key;
                          const currentHeaderStyle = headerStyles[headerKeyForStyle] || {};

                          if (mergedHeader) {
                            return (
                              <div key={mergedHeader.mergeKey} className="flex items-center justify-between p-2 bg-blue-50 rounded text-xs">
                                <div className="flex items-center gap-2 flex-1">
                                  <input
                                    type="color"
                                    value={currentHeaderStyle.backgroundColor || '#f1f5f9'}
                                    onChange={(e) => {
                                      const newHeaderStyles = { 
                                        ...headerStyles, 
                                        [headerKeyForStyle]: { 
                                          ...(headerStyles[headerKeyForStyle] || {}), 
                                          backgroundColor: e.target.value 
                                        } 
                                      };
                                      setHeaderStyles(newHeaderStyles);
                                      setTimeout(() => saveToBackend(), 100);
                                    }}
                                    className="h-6 w-6 cursor-pointer rounded border-2 border-slate-200"
                                    title="צבע כותרת"
                                  />
                                  <div>
                                    <div className="font-semibold text-blue-800">{mergedHeader.title}</div>
                                    <div className="text-slate-500">מיזוג ({mergedHeader.colspan} עמודות)</div>
                                  </div>
                                </div>
                                <div className="flex gap-1">
                                  <Button size="icon" variant="ghost" className="h-6 w-6 bg-white/90 hover:bg-white" onClick={() => unmergeHeaders(col.key)}>
                                    <Scissors className="w-3 h-3 text-orange-600" />
                                  </Button>
                                </div>
                              </div>
                            );
                          } else if (subHeaderTitle) {
                            return (
                              <div key={col.key} className="flex items-center justify-between p-2 bg-slate-50 rounded text-xs">
                                <div className="flex items-center gap-2 flex-1">
                                  <input
                                    type="color"
                                    value={currentHeaderStyle.backgroundColor || '#f1f5f9'}
                                    onChange={(e) => {
                                      const newHeaderStyles = { 
                                        ...headerStyles, 
                                        [headerKeyForStyle]: { 
                                          ...(headerStyles[headerKeyForStyle] || {}), 
                                          backgroundColor: e.target.value 
                                        } 
                                      };
                                      setHeaderStyles(newHeaderStyles);
                                      setTimeout(() => saveToBackend(), 100);
                                    }}
                                    className="h-6 w-6 cursor-pointer rounded border-2 border-slate-200"
                                    title="צבע כותרת"
                                  />
                                  <div>
                                    <div className="font-semibold">{col.title}</div>
                                    <div className="text-slate-500">{subHeaderTitle}</div>
                                  </div>
                                </div>
                                <div className="flex gap-1 items-center">
                                  <div className="flex gap-0.5 bg-white rounded border border-slate-200">
                                    <button
                                      className={`px-1.5 py-0.5 text-[10px] rounded-r ${subHeaderPos === 'above' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                                      onClick={() => changeSubHeaderPosition(col.key, 'above')}
                                      title="מעל הכותרת"
                                    >
                                      מעל
                                    </button>
                                    <button
                                      className={`px-1.5 py-0.5 text-[10px] rounded-l ${subHeaderPos === 'below' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                                      onClick={() => changeSubHeaderPosition(col.key, 'below')}
                                      title="מתחת לכותרת"
                                    >
                                      מתחת
                                    </button>
                                  </div>
                                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => addOrEditSubHeader(col.key)}>
                                    <Edit2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        })}
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
              <Button onClick={() => setShowColumnStats(!showColumnStats)} size="sm" variant="outline" className="gap-2"><BarChart3 className="w-4 h-4" />סטטיסטיקות</Button>
              <Button onClick={() => React.startTransition(() => setShowThemeSelector(true))} size="sm" variant="outline" className="gap-2"><Palette className="w-4 h-4" />עיצוב</Button>
              <Button onClick={() => React.startTransition(() => setShowViewManager(true))} size="sm" variant="outline" className="gap-2">
                <Layers className="w-4 h-4" />תצוגות
                {savedViews.length > 0 && <Badge variant="outline" className="mr-1 h-5 px-1.5 text-xs">{savedViews.length}</Badge>}
              </Button>
              <Button onClick={() => React.startTransition(() => { setEditingChart(null); setShowChartBuilder(true); })} size="sm" variant="outline" className="gap-2 hover:bg-green-50">
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
                    <Button variant="outline" size="sm" className="w-full justify-start gap-2 bg-blue-50 hover:bg-blue-100 border-blue-300" onClick={() => React.startTransition(() => setShowAddFromClientDialog(true))}>
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
                    <Button variant="outline" size="sm" className="w-full justify-start gap-2 bg-orange-50 hover:bg-orange-100 border-orange-300" onClick={() => React.startTransition(() => setShowBulkColumnsDialog(true))}>
                      <Zap className="w-4 h-4 text-orange-600" />
                      <span className="text-orange-900">יצירה מהירה</span>
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
              <Button onClick={() => React.startTransition(() => setShowColumnsManager(true))} size="sm" variant="outline" className="gap-2 hover:bg-orange-50">
                <Settings className="w-4 h-4" />
                ניהול עמודות + צבעים
              </Button>
              <Button onClick={() => React.startTransition(() => setShowStageManager(true))} size="sm" variant="outline" className="gap-2 hover:bg-purple-50">
                <Circle className="w-4 h-4 text-purple-600" />
                ניהול שלבים
              </Button>
              <Button 
                onClick={() => { setCommentsTargetCell(null); setShowCommentsSidebar(true); }} 
                size="sm" 
                variant="outline" 
                className="gap-2 hover:bg-blue-50"
              >
                <MessageSquare className="w-4 h-4 text-blue-600" />
                תגובות
              </Button>

              {/* Sync Status Indicators */}
              {spreadsheet?.google_sheet_id ? (
                <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-sm mr-2">
                   <div className="flex items-center px-2 py-1 gap-1.5 border-l border-slate-100">
                       <div className={`w-2 h-2 rounded-full ${
                           spreadsheet.sync_config?.auto_sync_interval !== 'none' ? 'bg-green-500 animate-pulse' : 'bg-slate-300'
                       }`} title={spreadsheet.sync_config?.auto_sync_interval !== 'none' ? 'סנכרון אוטומטי פעיל' : 'סנכרון ידני'} />
                       
                       {spreadsheet.sync_config?.sync_direction === 'two_way' ? (
                           <ArrowUpDown className="w-3.5 h-3.5 text-blue-600" title="סנכרון דו-כיווני" />
                       ) : spreadsheet.sync_config?.sync_direction === 'import_on_load' ? (
                           <ArrowDown className="w-3.5 h-3.5 text-orange-600" title="ייבוא בלבד" />
                       ) : (
                           <ArrowUp className="w-3.5 h-3.5 text-green-600" title="ייצוא בלבד" />
                       )}
                   </div>
   
                   <Button
                       variant="ghost"
                       size="sm"
                       className="h-7 px-2 hover:bg-slate-100 text-slate-600 gap-1.5 rounded-md"
                       onClick={() => {
                           const mode = spreadsheet.sync_config?.sync_direction || 'export_only';
                           if (mode === 'import_on_load') handleImportFromGoogle(spreadsheet.google_sheet_id, spreadsheet.google_sheet_name);
                           else if (mode === 'two_way') handleImportFromGoogle(spreadsheet.google_sheet_id, spreadsheet.google_sheet_name, 'two_way');
                           else handleExportToGoogle(spreadsheet.google_sheet_id, spreadsheet.google_sheet_name);
                       }}
                       title="סנכרון מהיר עכשיו"
                   >
                       <RefreshCw className="w-3.5 h-3.5" />
                   </Button>
   
                   <Button
                       variant="ghost"
                       size="sm"
                       className="h-7 px-2 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-md"
                       onClick={() => setShowSyncDialog(true)}
                       title="הגדרות סנכרון"
                   >
                       <Settings className="w-3.5 h-3.5" />
                   </Button>
                </div>
              ) : (
                <Button
                   variant="outline"
                   size="sm"
                   onClick={() => setShowSyncDialog(true)}
                   className="gap-2"
                 >
                   <RefreshCw className="w-4 h-4" />
                   חיבור ל-Google Sheets
                 </Button>
              )}
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button size="sm" variant="outline" className="gap-2 hover:bg-cyan-50">
                    <Snowflake className="w-4 h-4 text-cyan-600" />
                    הקפאה
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64" align="end" dir="rtl">
                  <div className="space-y-4">
                    <h4 className="font-semibold text-sm flex items-center gap-2">
                      <Snowflake className="w-4 h-4 text-cyan-600" />
                      הגדרות הקפאה
                    </h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">עמודות להקפאה (מימין):</span>
                        <Input 
                          type="number" 
                          min="0" 
                          max="5" 
                          value={freezeSettings.freeze_columns} 
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            setFreezeSettings(prev => ({ ...prev, freeze_columns: val }));
                            setTimeout(() => saveToBackend(), 500);
                          }}
                          className="w-16 h-8 text-center"
                        />
                      </div>
                      <div className="text-xs text-slate-400 pr-1">
                        * העמודה הראשונה (גרירה) תמיד מוקפאת
                      </div>
                    </div>
                    <Separator />
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">שורות להקפאה (מלמעלה):</span>
                        <Input 
                          type="number" 
                          min="0" 
                          max="5" 
                          value={freezeSettings.freeze_rows} 
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            setFreezeSettings(prev => ({ ...prev, freeze_rows: val }));
                            setTimeout(() => saveToBackend(), 500);
                          }}
                          className="w-16 h-8 text-center"
                        />
                      </div>
                      <div className="text-xs text-slate-400 pr-1">
                        * שורת הכותרת תמיד מוקפאת
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button size="sm" variant="outline" className="gap-2">
                    <Eye className="w-4 h-4" />
                    תצוגה: {viewMode === 'table' ? 'טבלה' : viewMode === 'cards' ? 'כרטיסים' : viewMode === 'compact' ? 'קומפקטי' : 'גלריה'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56" align="end" dir="rtl">
                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-slate-500 mb-2 px-2">בחר תצוגה</div>
                    <Button 
                      variant={viewMode === 'table' ? 'default' : 'ghost'} 
                      size="sm" 
                      className="w-full justify-start gap-2"
                      onClick={() => setViewMode('table')}
                    >
                      <Table className="w-4 h-4" />
                      טבלה רגילה
                    </Button>
                    <Button 
                      variant={viewMode === 'cards' ? 'default' : 'ghost'} 
                      size="sm" 
                      className="w-full justify-start gap-2"
                      onClick={() => setViewMode('cards')}
                    >
                      <Grid className="w-4 h-4" />
                      כרטיסים
                    </Button>
                    <Button 
                      variant={viewMode === 'compact' ? 'default' : 'ghost'} 
                      size="sm" 
                      className="w-full justify-start gap-2"
                      onClick={() => setViewMode('compact')}
                    >
                      <Layers className="w-4 h-4" />
                      תצוגה קומפקטית
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
              {selectedCells.size > 0 && (
                <>
                  <Badge variant="outline" className="bg-purple-50 px-3">נבחרו: {selectedCells.size} תאים</Badge>
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
                  {selectedCells.size >= 2 && (
                    <>
                      <Button size="sm" variant="outline" onClick={mergeCells} className="gap-2 hover:bg-green-50">
                        <Grid className="w-4 h-4 text-green-600" />
                        מזג תאים
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => {
                        // Unmerge all selected cells
                        const cellsArray = Array.from(selectedCells);
                        let unmergedCount = 0;
                        
                        cellsArray.forEach(cellKey => {
                          const mergeKeyToDelete = Object.keys(mergedCells).find(key => 
                            mergedCells[key].cells?.includes(cellKey)
                          );
                          if (mergeKeyToDelete) {
                            const newMerged = { ...mergedCells };
                            delete newMerged[mergeKeyToDelete];
                            setMergedCells(newMerged);
                            unmergedCount++;
                          }
                        });
                        
                        if (unmergedCount > 0) {
                          setTimeout(() => {
                            saveToHistory(columnsRef.current, rowsDataRef.current, cellStylesRef.current, cellNotesRef.current, subHeadersRef.current, mergedHeadersRef.current, headerStylesRef.current);
                            saveToBackend();
                          }, 50);
                          toast.success(`✓ ${unmergedCount} מיזוגים בוטלו`);
                        } else {
                          toast.error('אף תא נבחר אינו חלק ממיזוג');
                        }
                        setSelectedCells(new Set());
                      }} className="gap-2 hover:bg-orange-50">
                        <Scissors className="w-4 h-4 text-orange-600" />
                        בטל מיזוג
                      </Button>
                    </>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => setSelectedCells(new Set())} className="gap-2"><X className="w-4 h-4" /></Button>
                </>
              )}
              {selectedHeaders.size > 0 && (
                <>
                  <Badge variant="outline" className="bg-blue-50 px-3">נבחרו: {selectedHeaders.size} כותרות</Badge>
                  {selectedHeaders.size >= 2 && <Button size="sm" variant="outline" onClick={mergeHeaders} className="gap-2 hover:bg-blue-50"><Merge className="w-4 h-4 text-blue-600" />מזג כותרות</Button>}
                  <Button size="sm" variant="ghost" onClick={() => setSelectedHeaders(new Set())} className="gap-2"><X className="w-4 h-4" /></Button>
                </>
              )}
              <div className="ml-auto flex items-center gap-2">
                <Popover><PopoverTrigger asChild><Button size="sm" variant="outline" className="gap-2"><Download className="w-4 h-4" />ייצוא</Button></PopoverTrigger><PopoverContent className="w-48" align="end" dir="rtl"><div className="space-y-2"><Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={exportToCSV}><Download className="w-4 h-4" />CSV</Button><Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={exportToPDF}><Download className="w-4 h-4" />PDF</Button></div></PopoverContent></Popover>
                <Button onClick={clearAllFilters} size="sm" variant={hasActiveFilters ? "default" : "outline"} className="gap-2">{hasActiveFilters ? <><XCircle className="w-4 h-4" />נקה סינון</> : <><Filter className="w-4 h-4" />סינון</>}</Button>
              </div>
            </div>
            
            <div className="relative w-full lg:w-72">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                placeholder="חיפוש מהיר..." 
                value={globalFilter} 
                onChange={(e) => setGlobalFilter(e.target.value)} 
                className="pr-10 bg-slate-50 border-slate-200 focus:bg-white transition-colors" 
              />
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          {viewMode === 'cards' && (
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredAndSortedData.map((row, idx) => (
                  <Card key={row.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-base">
                            {row[visibleColumns[0]?.key] || `שורה ${idx + 1}`}
                          </CardTitle>
                        </div>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => duplicateRow(row)}>
                            <Copy className="w-3 h-3" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => deleteRow(row.id)}>
                            <Trash2 className="w-3 h-3 text-red-600" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {visibleColumns.slice(1).map(col => {
                        const value = row[col.key];
                        if (!value) return null;
                        return (
                          <div key={col.key} className="flex items-center justify-between text-sm border-b border-slate-100 pb-2">
                            <span className="text-slate-600 font-medium">{col.title}</span>
                            <span className="text-slate-900 font-semibold">
                              {col.type === 'checkmark' || col.type === 'mixed_check' ? (
                                value === '✓' ? <span className="text-green-600 text-lg">✓</span> : 
                                value === '✗' ? <span className="text-red-600 text-lg">✗</span> : value
                              ) : col.type === 'stage' ? (
                                getStageLabel(value)
                              ) : String(value)}
                            </span>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
          
          {viewMode === 'compact' && (
            <div className="p-4">
              <div className="space-y-1">
                {filteredAndSortedData.map((row, idx) => (
                  <div key={row.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg border-b border-slate-100 group">
                    <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                      {idx + 1}
                    </div>
                    <div className="flex-1 flex items-center gap-4">
                      {visibleColumns.slice(0, 4).map(col => {
                        const value = row[col.key];
                        return (
                          <div key={col.key} className="flex items-center gap-1 text-sm">
                            <span className="text-slate-500 text-xs">{col.title}:</span>
                            <span className="font-medium text-slate-900">
                              {col.type === 'checkmark' || col.type === 'mixed_check' ? (
                                value === '✓' ? '✓' : value === '✗' ? '✗' : '-'
                              ) : col.type === 'stage' ? (
                                getStageLabel(value) || '-'
                              ) : value || '-'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => duplicateRow(row)}>
                        <Copy className="w-3 h-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => deleteRow(row.id)}>
                        <Trash2 className="w-3 h-3 text-red-600" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {viewMode === 'table' && showColumnStats && Object.keys(columnStats).length > 0 && (
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

          {viewMode === 'table' && (
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
                    <thead style={{ position: 'sticky', top: 0, zIndex: 25 }} ref={provided.innerRef} {...provided.droppableProps}>
                      {showSubHeaders && (Object.keys(mergedHeaders).length > 0 || Object.keys(subHeaders).length > 0) && (
                        <tr>
                          <th className="p-3 w-12 sticky right-0 shadow-[2px_0_5px_rgba(0,0,0,0.1)]" style={{ zIndex: 35, backgroundColor: palette.headerBg, borderWidth: isSeparateBorders ? '0' : borderStyle.width, borderStyle: borderStyle.style, borderColor: palette.border }}></th>
                          {visibleColumns.map((col) => {
                            const headerMerge = getHeaderMergeInfo(col.key);
                            const subHeaderTitle = getSubHeaderTitle(col.key);
                            const subHeaderPos = getSubHeaderPosition(col.key);
                            
                            if (headerMerge && !headerMerge.isMaster) {
                              return null;
                            }
                            
                            const headerKeyForStyle = headerMerge ? headerMerge.mergeKey : col.key;
                            const currentHeaderStyle = headerStyles[headerKeyForStyle] || {};

                            // Check if this column is first or last in a merged header
                            let isFirstInMerge = false;
                            let isLastInMerge = false;
                            if (headerMerge && headerMerge.columns && headerMerge.columns.length > 0) {
                              const firstCol = headerMerge.columns[0];
                              const lastCol = headerMerge.columns[headerMerge.columns.length - 1];
                              if (col.key === firstCol) isFirstInMerge = true;
                              if (col.key === lastCol) isLastInMerge = true;
                            }

                            // Only show sub headers with position 'above' in this row
                            if (!headerMerge && (!subHeaderTitle || subHeaderPos !== 'above')) {
                              return <th key={`sub_empty_${col.key}`} className="text-center font-bold p-2" style={{ backgroundColor: palette.headerBg, borderWidth: isSeparateBorders ? '0' : borderStyle.width, borderStyle: borderStyle.style, borderColor: palette.border }}></th>;
                            }
                            
                            return (
                              <th
                                key={`merged_header_${col.key}`}
                                colSpan={headerMerge?.colspan || 1}
                                className="text-center font-bold p-2 cursor-pointer group relative"
                                style={{
                                  backgroundColor: currentHeaderStyle.backgroundColor || palette.headerBg,
                                  color: currentHeaderStyle.color || palette.headerText,
                                  fontWeight: currentHeaderStyle.fontWeight || 'bold',
                                  fontFamily: headerFont.value,
                                  fontSize: headerFontSize,
                                  borderWidth: isSeparateBorders ? '0' : borderStyle.width,
                                  borderStyle: borderStyle.style,
                                  borderColor: palette.border,
                                  borderBottomWidth: borderStyle.width,
                                  borderRightWidth: (isFirstInMerge || headerMerge) && !isSeparateBorders ? '3px' : undefined,
                                  borderRightColor: (isFirstInMerge || headerMerge) ? palette.border : undefined,
                                  borderLeftWidth: (isLastInMerge || headerMerge) && !isSeparateBorders ? '3px' : undefined,
                                  borderLeftColor: (isLastInMerge || headerMerge) ? palette.border : undefined
                                }}
                                onClick={(e) => {
                                  e.preventDefault();
                                  if (headerMerge) {
                                    const newTitle = prompt('ערוך כותרת עליונה:', headerMerge.title);
                                    if (newTitle !== null && newTitle.trim()) {
                                      setMergedHeaders(prev => ({
                                        ...prev,
                                        [headerMerge.mergeKey]: { ...headerMerge, title: newTitle.trim() }
                                      }));
                                      setTimeout(() => saveToBackend(), 50);
                                    }
                                  } else if (subHeaderTitle) {
                                    addOrEditSubHeader(col.key);
                                  }
                                }}
                              >
                                <div className="flex items-center justify-center gap-2">
                                  {headerMerge?.title || subHeaderTitle}
                                  <div className="opacity-0 group-hover:opacity-100 flex gap-1 absolute left-1 top-1">
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-5 w-5 bg-white/90 hover:bg-white"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenHeaderColorDialog(headerKeyForStyle);
                                      }}
                                    >
                                      <Palette className="w-3 h-3 text-purple-600" />
                                    </Button>
                                    {headerMerge && (
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-5 w-5 bg-white/90 hover:bg-white"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          unmergeHeaders(col.key);
                                        }}
                                      >
                                        <Scissors className="w-3 h-3 text-orange-600" />
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </th>
                            );
                          })}
                          <th className="p-3" style={{ backgroundColor: palette.headerBg, borderWidth: isSeparateBorders ? '0' : borderStyle.width, borderStyle: borderStyle.style, borderColor: palette.border }}></th>
                        </tr>
                      )}
                      <tr>
                        <th className="p-3 w-12 sticky right-0 shadow-[2px_0_5px_rgba(0,0,0,0.1)]" style={{ zIndex: 35, backgroundColor: palette.headerBg, borderWidth: isSeparateBorders ? '0' : borderStyle.width, borderStyle: borderStyle.style, borderColor: palette.border, borderRadius: isSeparateBorders ? tableBorderRadius : '0' }}>
                          <GripVertical className="w-4 h-4 mx-auto" style={{ color: palette.headerText }} />
                        </th>
                        {visibleColumns.map((col, colIndex) => {
                          const isEditing = editingColumnKey === col.key;
                          const isSorted = sortColumn === col.key;
                          const isHeaderSelected = selectedHeaders.has(col.key);
                          const hasSubHeader = getSubHeaderTitle(col.key);
                          const headerStyle = headerStyles[col.key] || {};
                          
                          // Check if this column is part of a merged header above
                          let isFirstInMerge = false;
                          let isLastInMerge = false;
                          let hasParentMerge = false;
                          Object.values(mergedHeaders).forEach(merge => {
                            if (merge.columns && merge.columns.includes(col.key)) {
                              hasParentMerge = true;
                              const firstCol = merge.columns[0];
                              const lastCol = merge.columns[merge.columns.length - 1];
                              if (col.key === firstCol) isFirstInMerge = true;
                              if (col.key === lastCol) isLastInMerge = true;
                            }
                          });
                          
                          return (
                            <Draggable key={col.key} draggableId={col.key} index={colIndex} type="column">
                              {(provided, snapshot) => (
                                <th ref={provided.innerRef} {...provided.draggableProps} className={`text-right font-semibold cursor-pointer group ${snapshot.isDragging ? 'opacity-50 shadow-2xl' : ''} ${isHeaderSelected ? 'ring-2 ring-blue-500' : ''}`} style={{
                                  width: col.width,
                                  minWidth: col.width,
                                  maxWidth: col.width,
                                  // Freeze Columns Logic for Header
                                  position: colIndex < freezeSettings.freeze_columns ? 'sticky' : 'relative',
                                  right: colIndex < freezeSettings.freeze_columns ? `${stickyColumnOffsets[colIndex]}px` : 'auto',
                                  zIndex: snapshot.isDragging ? 50 : (colIndex < freezeSettings.freeze_columns ? 30 : 10),
                                  
                                  backgroundColor: isHeaderSelected ? palette.selected : (headerStyle.backgroundColor || (snapshot.isDragging ? palette.hover : palette.headerBg)),
                                  color: headerStyle.color || palette.headerText,
                                  fontWeight: headerStyle.fontWeight || 'bold',
                                  fontFamily: headerFont.value,
                                  fontSize: headerFontSize,
                                  padding: cellPadding,
                                  borderWidth: isSeparateBorders ? '0' : borderStyle.width,
                                  borderStyle: borderStyle.style,
                                  borderColor: palette.border,
                                  borderRadius: isSeparateBorders ? tableBorderRadius : '0',
                                  borderTopWidth: (hasParentMerge && showSubHeaders && !isSeparateBorders) ? borderStyle.width : undefined,
                                  borderRightWidth: isFirstInMerge && !isSeparateBorders ? '3px' : undefined,
                                  borderRightColor: isFirstInMerge ? palette.border : undefined,
                                  borderLeftWidth: isLastInMerge && !isSeparateBorders ? '3px' : undefined,
                                  borderLeftColor: isLastInMerge ? palette.border : undefined,
                                  boxShadow: colIndex === freezeSettings.freeze_columns - 1 ? '-2px 0 5px rgba(0,0,0,0.05)' : 'none',
                                  ...provided.draggableProps.style
                                }} onClick={(e) => !snapshot.isDragging && handleHeaderClick(col.key, e)}>
                                  {isEditing ? (
                                    <Input ref={columnEditRef} value={editingColumnTitle} onChange={(e) => setEditingColumnTitle(e.target.value)} onBlur={saveColumnTitle} onKeyDown={(e) => { if (e.key === 'Enter') saveColumnTitle(); if (e.key === 'Escape') { setEditingColumnKey(null); setEditingColumnTitle(""); } }} className="h-8" autoFocus />
                                  ) : (
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <div {...provided.dragHandleProps} className="opacity-0 group-hover:opacity-100 cursor-grab p-1 hover:bg-blue-100 rounded transition-opacity"><GripVertical className="w-4 h-4 text-slate-400" /></div>
                                        <span>{col.title}</span>
                                        {hasSubHeader && <Type className="w-3 h-3 text-blue-500" title={hasSubHeader} />}
                                      </div>
                                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); handleSort(col.key); }}>{isSorted ? (sortDirection === 'asc' ? <ArrowUp className="w-4 h-4 text-blue-600" /> : <ArrowDown className="w-4 h-4 text-blue-600" />) : <ArrowUpDown className="w-4 h-4 text-slate-400" />}</Button>
                                        <Popover open={popoverOpen === `header_${col.key}`} onOpenChange={(open) => !open && setPopoverOpen(null)}>
                                          <PopoverTrigger asChild>
                                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); setPopoverOpen(`header_${col.key}`); }}><Settings className="w-3 h-3" /></Button>
                                          </PopoverTrigger>
                                          <PopoverContent className="w-56" align="start" dir="rtl">
                                            <div className="space-y-2">
                                              <h4 className="font-semibold text-sm mb-3">{col.title}</h4>
                                              <Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={() => { setEditingColumnKey(col.key); setEditingColumnTitle(col.title); setPopoverOpen(null); }}><Edit2 className="w-4 h-4" />שנה שם</Button>
                                              <Button variant="outline" size="sm" className="w-full justify-start gap-2 bg-purple-50 hover:bg-purple-100" onClick={() => { handleOpenHeaderColorDialog(col.key); }}><Palette className="w-4 h-4 text-purple-600" />צבע כותרת</Button>
                                              <Button variant="outline" size="sm" className="w-full justify-start gap-2 bg-blue-50" onClick={() => { addOrEditSubHeader(col.key); setPopoverOpen(null); }}><Type className="w-4 h-4 text-blue-600" />{hasSubHeader ? 'ערוך' : 'הוסף'} כותרת משנה</Button>
                                              <Button variant="outline" size="sm" className="w-full justify-start gap-2 bg-orange-50 hover:bg-orange-100" onClick={() => { splitColumn(col.key); setPopoverOpen(null); }}><Scissors className="w-4 h-4 text-orange-600" />פצל עמודה</Button>
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
                      {showSubHeaders && Object.values(subHeaders).some(sh => (typeof sh === 'object' ? sh.position : 'above') === 'below') && (
                        <tr>
                          <th className="p-3 w-12 sticky right-0 shadow-[2px_0_5px_rgba(0,0,0,0.1)]" style={{ zIndex: 35, backgroundColor: palette.headerBg, borderWidth: isSeparateBorders ? '0' : borderStyle.width, borderStyle: borderStyle.style, borderColor: palette.border }}></th>
                          {visibleColumns.map((col) => {
                            const subHeaderTitle = getSubHeaderTitle(col.key);
                            const subHeaderPos = getSubHeaderPosition(col.key);
                            
                            const headerKeyForStyle = col.key;
                            const currentHeaderStyle = headerStyles[headerKeyForStyle] || {};

                            // Only show sub headers with position 'below' in this row
                            if (!subHeaderTitle || subHeaderPos !== 'below') {
                              return <th key={`sub_below_empty_${col.key}`} className="text-center font-bold p-2" style={{ backgroundColor: palette.headerBg, borderWidth: isSeparateBorders ? '0' : borderStyle.width, borderStyle: borderStyle.style, borderColor: palette.border }}></th>;
                            }
                            
                            return (
                              <th
                                key={`sub_header_below_${col.key}`}
                                className="text-center font-bold p-2 cursor-pointer group relative"
                                style={{
                                  backgroundColor: currentHeaderStyle.backgroundColor || palette.headerBg,
                                  color: currentHeaderStyle.color || palette.headerText,
                                  fontWeight: currentHeaderStyle.fontWeight || 'bold',
                                  fontFamily: headerFont.value,
                                  fontSize: headerFontSize,
                                  borderWidth: isSeparateBorders ? '0' : borderStyle.width,
                                  borderStyle: borderStyle.style,
                                  borderColor: palette.border
                                }}
                                onClick={(e) => {
                                  e.preventDefault();
                                  addOrEditSubHeader(col.key);
                                }}
                              >
                                <div className="flex items-center justify-center gap-2">
                                  {subHeaderTitle}
                                  <div className="opacity-0 group-hover:opacity-100 flex gap-1 absolute left-1 top-1">
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-5 w-5 bg-white/90 hover:bg-white"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenHeaderColorDialog(headerKeyForStyle);
                                      }}
                                    >
                                      <Palette className="w-3 h-3 text-purple-600" />
                                    </Button>
                                  </div>
                                </div>
                              </th>
                            );
                          })}
                          <th className="p-3" style={{ backgroundColor: palette.headerBg, borderWidth: isSeparateBorders ? '0' : borderStyle.width, borderStyle: borderStyle.style, borderColor: palette.border }}></th>
                        </tr>
                      )}
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
                            <SpreadsheetRow
                              key={row.id}
                              row={row}
                              rowIndex={rowIndex}
                              visibleColumns={visibleColumns}
                              rowHeight={rowHeight}
                              palette={palette}
                              cellFont={cellFont}
                              cellFontSize={cellFontSize}
                              cellPadding={cellPadding}
                              isSeparateBorders={isSeparateBorders}
                              borderStyle={borderStyle}
                              tableBorderRadius={tableBorderRadius}
                              freezeSettings={freezeSettings}
                              stickyColumnOffsets={stickyColumnOffsets}
                              stickyRowOffsets={stickyRowOffsets}
                              editingCell={editingCell}
                              selectedCells={selectedCells}
                              showClientPicker={showClientPicker}
                              activeCollaborators={activeCollaborators}
                              currentUser={currentUser}
                              cellStyles={cellStyles}
                              cellNotes={cellNotes}
                              mergedCells={mergedCells}
                              customStageOptions={customStageOptions}
                              allClients={allClients}
                              editValue={editValue}
                              getConditionalStyle={getConditionalStyle}
                              getStageLabel={getStageLabel}
                              getMergeInfo={getMergeInfo}
                              isClientColumn={isClientColumn}
                              getAutoCompleteSuggestions={getAutoCompleteSuggestions}
                              
                              onCellClick={handleCellClick}
                              onCellDoubleClick={handleCellDoubleClick}
                              onCellMouseDown={handleCellMouseDown}
                              onCellMouseEnter={handleCellMouseEnter}
                              onCheckmarkClick={handleCheckmarkClick}
                              onClientPickerToggle={handleClientPickerToggle}
                              onNoteTriangleClick={handleNoteTriangleClick}
                              onDuplicateRow={duplicateRow}
                              onDeleteRow={deleteRow}
                              onRowResizeStart={handleRowResizeStart}
                              
                              setEditingCell={setEditingCell}
                              setEditValue={setEditValue}
                              saveEdit={saveEdit}
                              editInputRef={editInputRef}
                              
                              onDirectSaveStage={async (stageValue, columnKey) => {
                                // Simplified Direct Save Logic passed as callback
                                // Re-implemented inline in row component, but we can pass the heavy logic here if needed
                                // Or better: The row component calls this prop with stageValue
                                
                                console.log('🟣 [STAGE SAVE] Direct save called with:', stageValue);
                                const column = columns.find(c => c.key === columnKey); // We need columnKey passed back
                                const updatedRows = rowsData.map(r => 
                                  r.id === row.id ? { ...r, [columnKey]: stageValue } : r
                                );
                                setRowsData(updatedRows);
                                setEditingCell(null);
                                setEditValue("");
                                rowsDataRef.current = updatedRows;
                                
                                // Client update logic
                                const clientColumns = columnsRef.current.filter(col => 
                                  col.type === 'client' || col.key.toLowerCase().includes('client') || col.title?.toLowerCase().includes('לקוח')
                                );
                                
                                if (clientColumns.length > 0) {
                                  const clientName = row[clientColumns[0].key];
                                  if (clientName) {
                                    try {
                                      const matchingClient = allClients.find(c => c.name?.toLowerCase() === clientName.toLowerCase());
                                      if (matchingClient) {
                                        await base44.entities.Client.update(matchingClient.id, { stage: stageValue });
                                        const updatedClient = await base44.entities.Client.get(matchingClient.id);
                                        window.dispatchEvent(new CustomEvent('client:updated', { detail: updatedClient }));
                                      }
                                    } catch (e) { console.error(e); }
                                  }
                                }
                                
                                setTimeout(() => {
                                  saveToHistory(columnsRef.current, updatedRows, cellStylesRef.current, cellNotesRef.current);
                                  saveToBackend();
                                }, 50);
                                toast.success('✓ שלב עודכן');
                              }}
                            />
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
          )}
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
            {selectedHeaders.size > 0 && (
              <>
                <span>•</span>
                <span className="text-blue-600 font-semibold">נבחרו {selectedHeaders.size} כותרות</span>
              </>
            )}
          </div>
          <div className="text-slate-400 text-[10px] bg-slate-100 px-2 py-1 rounded">
            💡 Ctrl+לחיצה על תא לקוח = תפריט ניווט • Alt+Click לבחירה מרובה • Shift+גרירה לטווח • לחיצה כפולה לתפריט • 🔺 להערה
          </div>
        </div>
      </Card>

      {popoverOpen && (() => {
        const lastColIndex = popoverOpen.lastIndexOf('_col');
        if (lastColIndex === -1) return null;
        const rowId = popoverOpen.substring(0, lastColIndex);
        const columnKey = popoverOpen.substring(lastColIndex + 1);
        const column = columns.find(c => c.key === columnKey);
        const row = filteredAndSortedData.find(r => r.id === rowId);
        const cellValue = row?.[columnKey] || '';
        
        if (!isClientColumn(column) || !cellValue) return null;
        
        return (
          <div 
            ref={clientPopoverRef}
            className="fixed z-[9999] bg-white border-2 border-blue-500 rounded-lg shadow-2xl p-3 min-w-[220px]"
            style={{
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)'
            }}
          >
            <div className="space-y-2">
              <div className="text-sm font-semibold text-slate-700 border-b pb-2">
                {cellValue}
              </div>
              <Button
                size="sm"
                className="w-full gap-2 bg-blue-600 hover:bg-blue-700"
                onClick={() => {
                  const client = allClients.find(c => 
                    c.name?.toLowerCase() === cellValue?.toLowerCase()
                  );
                  console.log('🔵 [CLIENT NAV] Button clicked', { cellValue, client, spreadsheet: spreadsheet?.id, allClients: allClients.length });
                  if (client && spreadsheet?.id) {
                    const url = createPageUrl(`Clients?open=details&client_id=${client.id}&spreadsheetId=${spreadsheet.id}`);
                    console.log('🔵 [CLIENT NAV] Navigating to:', url);
                    window.location.href = url;
                  } else if (client) {
                    const url = createPageUrl(`Clients?open=details&client_id=${client.id}`);
                    console.log('🔵 [CLIENT NAV] Navigating to (no spreadsheet):', url);
                    window.location.href = url;
                  } else {
                    console.log('❌ [CLIENT NAV] Client not found');
                    toast.error('לקוח לא נמצא במערכת');
                  }
                }}
              >
                <Users className="w-4 h-4" />
                פתח תיקיית לקוח
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="w-full gap-2"
                onClick={() => {
                  setPopoverOpen(null);
                  const row = filteredAndSortedData.find(r => r.id === rowId);
                  if (!row) return;
                  setEditingCell(`${rowId}_${columnKey}`);
                  setEditValue(String(cellValue));
                  setTimeout(() => editInputRef.current?.focus(), 0);
                }}
              >
                <Edit2 className="w-4 h-4" />
                ערוך שם
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="w-full gap-2"
                onClick={() => setPopoverOpen(null)}
              >
                <X className="w-4 h-4" />
                סגור
              </Button>
            </div>
          </div>
        );
      })()}

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
              className="w-full justify-start gap-2 hover:bg-blue-50"
              onClick={() => {
                setCommentsTargetCell(cellContextMenu);
                setShowCommentsSidebar(true);
                setCellContextMenu(null);
              }}
            >
              <MessageSquare className="w-4 h-4 text-blue-600" />
              פתח תגובות (צ'אט)
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-start gap-2 hover:bg-amber-50"
              onClick={() => handleOpenNoteDialog(cellContextMenu)}
            >
              <MessageSquare className="w-4 h-4 text-amber-600" />
              {cellNotes[cellContextMenu] ? 'ערוך פתקית (צהובה)' : 'הוסף פתקית (צהובה)'}
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
            {getMergeInfo(cellContextMenu) ? (
              <>
                <Separator />
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full justify-start gap-2 hover:bg-orange-50"
                  onClick={() => unmergeCells(cellContextMenu)}
                >
                  <Scissors className="w-4 h-4 text-orange-600" />
                  בטל מיזוג תאים
                </Button>
              </>
            ) : null}
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
          setSelectedCells(new Set()); // Clear selection when color picker closes
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

      <Dialog open={showHeaderColorDialog} onOpenChange={(open) => {
        if (!open) {
          setShowHeaderColorDialog(false);
          setColorPickerTargetHeader(null);
        }
      }}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-purple-600" />
              בחר צבע לכותרת
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <ColorPicker 
              currentStyle={colorPickerTargetHeader ? headerStyles[colorPickerTargetHeader] : {}}
              onApply={(style) => {
                if (colorPickerTargetHeader) {
                  applyHeaderColor(colorPickerTargetHeader, style);
                }
                setShowHeaderColorDialog(false);
                setColorPickerTargetHeader(null);
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
        headerStyles={headerStyles}
        onHeaderStyleChange={(columnKey, style) => {
          const newHeaderStyles = { 
            ...headerStyles, 
            [columnKey]: { 
              ...(headerStyles[columnKey] || {}), 
              ...style 
            } 
          };
          setHeaderStyles(newHeaderStyles);
          setTimeout(() => saveToBackend(), 100);
        }}
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

      <StageOptionsManager
        open={showStageManager}
        onClose={() => {
          console.log('🔵🔵🔵 [GENERIC SPREADSHEET] StageOptionsManager onClose called');
          setShowStageManager(false);
        }}
        stageOptions={customStageOptions}
        onSave={(newOptions) => {
          console.log('🔵🔵🔵 [GENERIC SPREADSHEET] StageOptionsManager onSave called with:', JSON.stringify(newOptions, null, 2));
          setCustomStageOptions(newOptions);
          console.log('🔵🔵🔵 [GENERIC SPREADSHEET] customStageOptions state updated');
          setTimeout(() => {
            console.log('🔵🔵🔵 [GENERIC SPREADSHEET] Calling saveToBackend...');
            saveToBackend();
          }, 50);
          toast.success('✓ אפשרויות שלבים עודכנו');
        }}
      />

      <SpreadsheetSyncDialog 
        open={showSyncDialog} 
        onClose={() => setShowSyncDialog(false)} 
        spreadsheet={spreadsheet}
        onImport={handleImportFromGoogle}
        onExport={handleExportToGoogle}
        onSaveLink={handleSaveGoogleLink}
      />

      <CommentsSidebar 
        spreadsheetId={spreadsheet.id}
        cellKey={commentsTargetCell}
        cellTitle={commentsTargetCell ? `${columns.find(c => c.key === commentsTargetCell.split('_').pop())?.title}` : 'כללי'}
        currentUser={currentUser}
        isOpen={showCommentsSidebar}
        onClose={() => setShowCommentsSidebar(false)}
      />

      {editingCell && (() => {
        const lastColIndex = editingCell.lastIndexOf('_col');
        if (lastColIndex === -1) {
          console.log('🔍 [POPUP] No match for editingCell:', editingCell);
          return null;
        }
        const rowId = editingCell.substring(0, lastColIndex);
        const colKey = editingCell.substring(lastColIndex + 1);
        const column = columns.find(c => c.key === colKey);
        
        console.log('🔍 [POPUP] Checking if client column:', { column, isClientColumn: isClientColumn(column) });
        
        if (!isClientColumn(column)) return null;
        
        const filteredClients = allClients.filter(c => 
          !editValue || 
          c.name?.toLowerCase().includes(editValue.toLowerCase()) || 
          c.company?.toLowerCase().includes(editValue.toLowerCase()) ||
          c.email?.toLowerCase().includes(editValue.toLowerCase())
        ).slice(0, 15);
        
        console.log('🔍 [POPUP] Filtered clients:', filteredClients.length, 'editValue:', editValue);
        
        if (filteredClients.length === 0) {
          console.log('🔍 [POPUP] No filtered clients found');
          return null;
        }
        
        return (
          <div 
            className="fixed bg-white border-2 border-blue-500 rounded-lg shadow-2xl max-h-80 overflow-y-auto z-[99999]"
            style={{
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              minWidth: '360px',
              maxWidth: '500px'
            }}
          >
            <div className="sticky top-0 bg-blue-50 px-4 py-2 border-b border-blue-200 text-sm font-semibold text-blue-900">
              💡 בחר לקוח ({filteredClients.length} תוצאות)
            </div>
            <div className="p-2">
              {filteredClients.map(client => (
                <button 
                  key={client.id} 
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleClientSelect(rowId, colKey, client);
                    setEditingCell(null);
                    setEditValue("");
                  }}
                  className="w-full px-4 py-3 hover:bg-blue-50 text-right rounded-lg transition-colors mb-1"
                >
                  <div className="font-bold text-base text-slate-900">{client.name}</div>
                  {(client.company || client.phone || client.email) && (
                    <div className="text-xs text-slate-600 mt-1">
                      {[client.company, client.phone, client.email].filter(Boolean).join(' • ')}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        );
      })()}
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