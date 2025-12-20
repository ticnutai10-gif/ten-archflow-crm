import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Edit, Eye, X, Trash2, Maximize2, Minimize2, Settings, Bug, Save, Phone as PhoneIcon, Palette, Split, Merge, Edit2, Copy, Table, Info, Sparkles, Clock, FileText, Eraser, Circle, User, ArrowUpDown } from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { PRESET_CLIENT_COLUMNS } from "@/components/constants/presetClientColumns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Client } from "@/entities/all";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import HelpIcon from "@/components/ui/HelpIcon";
import { Checkbox } from "@/components/ui/checkbox";

import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { StageDisplay } from "@/components/spreadsheets/GenericSpreadsheet";
import StageOptionsManager from "@/components/spreadsheets/StageOptionsManager";
import StatusOptionsManager from "@/components/spreadsheets/StatusOptionsManager";
import UserPreferencesDialog from "@/components/spreadsheets/UserPreferencesDialog";

const ICON_COLOR = "#2C3A50";

const STAGE_OPTIONS = [
  { value: 'ברור_תכן', label: 'ברור תכן', color: '#3b82f6', glow: 'rgba(59, 130, 246, 0.4)' },
  { value: 'תיק_מידע', label: 'תיק מידע', color: '#8b5cf6', glow: 'rgba(139, 92, 246, 0.4)' },
  { value: 'היתרים', label: 'היתרים', color: '#f59e0b', glow: 'rgba(245, 158, 11, 0.4)' },
  { value: 'ביצוע', label: 'ביצוע', color: '#10b981', glow: 'rgba(16, 185, 129, 0.4)' },
  { value: 'סיום', label: 'סיום', color: '#6b7280', glow: 'rgba(107, 114, 128, 0.4)' }
];

const STATUS_OPTIONS = [
  { value: 'פוטנציאלי', label: 'פוטנציאלי', color: '#f59e0b', glow: 'rgba(245, 158, 11, 0.4)' },
  { value: 'פעיל', label: 'פעיל', color: '#22c55e', glow: 'rgba(34, 197, 94, 0.4)' },
  { value: 'לא_פעיל', label: 'לא פעיל', color: '#ef4444', glow: 'rgba(239, 68, 68, 0.4)' }
];

const statusColors = {
  'פוטנציאלי': 'bg-amber-100 text-amber-800 border-amber-200',
  'פעיל': 'bg-green-100 text-green-800 border-green-200',
  'לא פעיל': 'bg-slate-100 text-slate-800 border-slate-200'
};

const COLORS = [
{ name: 'לבן', value: '#FFFFFF', border: '#E5E7EB' },
{ name: 'צהוב', value: '#FEF3C7', border: '#FDE047' },
{ name: 'ירוק', value: '#D1FAE5', border: '#34D399' },
{ name: 'כחול', value: '#DBEAFE', border: '#60A5FA' },
{ name: 'אדום', value: '#FEE2E2', border: '#F87171' },
{ name: 'סגול', value: '#EDE9FE', border: '#A78BFA' },
{ name: 'ורוד', value: '#FCE7F3', border: '#F472B6' },
{ name: 'אפור', value: '#F3F4F6', border: '#9CA3AF' }];


const fixedDefaultColumns = [
{ key: 'name', title: 'שם לקוח', width: '200px', type: 'text', required: true },
{ key: 'phone', title: 'טלפון', width: '150px', type: 'phone', required: false },
{ key: 'email', title: 'אימייל', width: '150px', type: 'email', required: false },
{ key: 'status', title: 'סטטוס', width: '120px', type: 'status', required: false }];


const isValidPhone = (phone) => {
  if (!phone) return false;
  const cleaned = String(phone).replace(/\D/g, '');

  if (cleaned.length < 7) return false;

  const uniqueDigits = new Set(cleaned.split(''));
  if (uniqueDigits.size < 2) return false;

  return true;
};

// Component to display stage icon
function StageIcon({ client, columns, stageOptions }) {
  const stageColumn = columns.find(col => col.type === 'stage' || col.key === 'stage');
  if (!stageColumn) return null;
  
  const stageValue = stageColumn.key === 'stage' 
    ? client.stage 
    : client.custom_data?.[stageColumn.key.slice(3)];
  
  if (!stageValue) return null;
  
  const currentStage = stageOptions.find(s => s.value === stageValue);
  if (!currentStage) return null;
  
  return (
    <div
      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
      style={{ 
        backgroundColor: currentStage.color,
        boxShadow: `0 0 8px ${currentStage.color}, 0 0 12px ${currentStage.color}60`
      }}
      title={currentStage.label}
    />
  );
}

// Component to display and edit status
function StatusDisplay({ value, isEditing, onEdit, editValue, onSave, onCancel, statusOptions, onDirectSave }) {
  console.log('🔵 [STATUS_DISPLAY] Rendering:', { 
    value, 
    isEditing, 
    editValue,
    statusOptionsType: typeof statusOptions,
    statusOptionsIsArray: Array.isArray(statusOptions),
    hasOnDirectSave: typeof onDirectSave === 'function'
  });
  
  // Handle both array and wrapped object format
  const STATUS_OPTIONS_ARRAY = Array.isArray(statusOptions) 
    ? statusOptions 
    : (statusOptions?.options || STATUS_OPTIONS);
  
  console.log('🔵 [STATUS_DISPLAY] Available options:', STATUS_OPTIONS_ARRAY.map(s => s.value));
  
  const currentStatus = STATUS_OPTIONS_ARRAY.find(s => s.value === value || s.label === value);
  console.log('🔵 [STATUS_DISPLAY] Current status found:', currentStatus ? currentStatus.label : 'NOT FOUND');
  
  // Default color for unknown statuses
  const defaultColor = '#6b7280';
  const defaultGlow = 'rgba(107, 114, 128, 0.4)';
  
  if (isEditing) {
    return (
      <Select value={editValue} onValueChange={(val) => {
        onEdit(val);
        if (onDirectSave) {
          onDirectSave(val);
        }
      }}>
        <SelectTrigger className="h-8">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS_ARRAY.map(status => (
            <SelectItem key={status.value} value={status.value}>
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full animate-pulse"
                  style={{ 
                    backgroundColor: status.color,
                    boxShadow: `0 0 6px ${status.glow}`
                  }}
                />
                <span>{status.label}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }
  
  if (!value) {
    return (
      <button
        onClick={() => onEdit('')}
        className="text-slate-400 hover:text-blue-600 transition-colors text-sm"
      >
        לחץ לבחירה
      </button>
    );
  }
  
  // Display status even if not in the predefined list
  const displayColor = currentStatus?.color || defaultColor;
  const displayGlow = currentStatus?.glow || defaultGlow;
  const displayLabel = currentStatus?.label || value.replace(/_/g, ' ');
  
  return (
    <div className="flex items-center gap-2 justify-center">
      <div 
        className="w-3 h-3 rounded-full flex-shrink-0 animate-pulse"
        style={{ 
          backgroundColor: displayColor,
          boxShadow: `0 0 8px ${displayGlow}, 0 0 12px ${displayGlow}`,
          border: '1px solid white'
        }}
        title={displayLabel}
      />
      <span 
        className="text-sm font-medium px-2 py-0.5 rounded"
        style={{ 
          backgroundColor: `${displayColor}15`,
          color: displayColor,
          border: `1px solid ${displayColor}40`
        }}
      >
        {displayLabel}
      </span>
    </div>
  );
}

// Load settings from database (per user)
const loadUserSettings = async (tableName = 'clients') => {
  try {
    const user = await base44.auth.me();
    const userPrefs = await base44.entities.UserPreferences.filter({ user_email: user.email });
    
    if (userPrefs.length > 0 && userPrefs[0].spreadsheet_columns?.[tableName]) {
      return userPrefs[0].spreadsheet_columns[tableName];
    }
  } catch (e) {
    console.error('Error loading user settings:', e);
  }
  return null;
};

// Save settings to database (per user)
const saveUserSettings = async (tableName, columns, cellStyles, showSubHeaders, subHeaders, stageOptions, statusOptions) => {
  try {
    const user = await base44.auth.me();
    const existingPrefs = await base44.entities.UserPreferences.filter({ user_email: user.email });
    
    const columnSettings = {
      order: columns.map(c => c.key),
      visibility: columns.reduce((acc, col) => {
        acc[col.key] = col.visible !== false;
        return acc;
      }, {}),
      widths: columns.reduce((acc, col) => {
        acc[col.key] = col.width;
        return acc;
      }, {}),
      custom_columns: columns.filter(c => c.key.startsWith('cf:')).map(c => ({
        key: c.key,
        title: c.title,
        type: c.type,
        width: c.width
      })),
      cellStyles: cellStyles || {},
      showSubHeaders: showSubHeaders,
      subHeaders: subHeaders || {},
      stageOptions: stageOptions || STAGE_OPTIONS,
      statusOptions: statusOptions || STATUS_OPTIONS
    };
    
    if (existingPrefs.length > 0) {
      const currentSpreadsheetColumns = existingPrefs[0].spreadsheet_columns || {};
      await base44.entities.UserPreferences.update(existingPrefs[0].id, {
        spreadsheet_columns: {
          ...currentSpreadsheetColumns,
          [tableName]: columnSettings
        }
      });
    } else {
      await base44.entities.UserPreferences.create({
        user_email: user.email,
        spreadsheet_columns: {
          [tableName]: columnSettings
        }
      });
    }
    
    console.log('User settings saved to database');
  } catch (e) {
    console.error('Error saving user settings:', e);
  }
};

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
          {COLORS.map((color) =>
          <button
            key={color.value}
            type="button"
            className={`h-10 rounded border-2 hover:scale-110 transition-transform ${
            selectedColor === color.value ? 'ring-2 ring-blue-500' : ''}`}
            style={{
              backgroundColor: color.value,
              borderColor: color.border
            }}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedColor(color.value);
            }}
            title={color.name} />

          )}
        </div>

        <Input
          type="color"
          value={selectedColor}
          onChange={(e) => {
            e.stopPropagation();
            setSelectedColor(e.target.value);
          }}
          onClick={(e) => e.stopPropagation()}
          className="w-full h-10 cursor-pointer" />

      </div>

      <div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium">שקיפות</span>
          <span className="text-sm text-slate-600">{opacity}%</span>
        </div>
        <Slider
          value={[opacity]}
          onValueChange={(values) => {
            setOpacity(values[0]);
          }}
          min={0}
          max={100}
          step={5}
          className="w-full"
          onClick={(e) => e.stopPropagation()} />

      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">טקסט מודגש</span>
        <Switch
          checked={isBold}
          onCheckedChange={(val) => {
            setIsBold(val);
          }}
          onClick={(e) => e.stopPropagation()} />

      </div>

      <div className="pt-2 border-t">
        <Button
          onClick={(e) => {
            e.stopPropagation();
            handleApply();
          }}
          className="w-full bg-blue-600 hover:bg-blue-700">

          החל סגנון
        </Button>
      </div>
    </div>);

}

export default function ClientSpreadsheet({ clients, onEdit, onView, isLoading }) {

  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [showUserPreferences, setShowUserPreferences] = useState(false);
  
  const [columns, setColumns] = useState(() => {
    const initialColumns = [...fixedDefaultColumns];
    if (!initialColumns.some((col) => col.key === 'actions')) {
      initialColumns.push({ key: 'actions', title: 'פעולות', width: '120px', type: 'actions', required: true, visible: true });
    }
    return initialColumns.map((col) => ({ ...col, visible: col.visible !== false }));
  });

  const [localClients, setLocalClients] = useState([]);
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [fullScreen, setFullScreen] = useState(false);
  const cardRef = useRef(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isDropdownSettingsOpen, setIsDropdownSettingsOpen] = useState(false);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [presetToAdd, setPresetToAdd] = useState("");
  const [pendingChanges, setPendingChanges] = useState(new Map());
  const [isSaving, setIsSaving] = useState(false);
  const [cellStyles, setCellStyles] = useState({});
  const [popoverOpen, setPopoverOpen] = useState(null);
  const [editingColumnKey, setEditingColumnKey] = useState(null);
  const [editingColumnTitle, setEditingColumnTitle] = useState("");
  const [showAddColumnDialog, setShowAddColumnDialog] = useState(false);

  const [selectedCells, setSelectedCells] = useState(new Set());
  const [selectedHeaders, setSelectedHeaders] = useState(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedRows, setSelectedRows] = useState(new Set());

  const [draggedColumn, setDraggedColumn] = useState(null);

  const [showSubHeaders, setShowSubHeaders] = useState(false);

  const [subHeaders, setSubHeaders] = useState({});
  
  const [statusOptions, setStatusOptions] = useState(STATUS_OPTIONS);
  const [showStatusManager, setShowStatusManager] = useState(false);

  const [editingSubHeader, setEditingSubHeader] = useState(null);
  const [tempSubHeaderValue, setTempSubHeaderValue] = useState('');
  
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  const [showShortcuts, setShowShortcuts] = useState(false);
  const [autoSave, setAutoSave] = useState(true);
  const [autoCloseEdit, setAutoCloseEdit] = useState(true);
  const [smoothScroll, setSmoothScroll] = useState(true);
  const [userPreferences, setUserPreferences] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showStageManager, setShowStageManager] = useState(false);
  const [stageOptions, setStageOptions] = useState(STAGE_OPTIONS);


  const [newColumnName, setNewColumnName] = useState("");
  const [newColumnType, setNewColumnType] = useState("text");
  const [showAddInPanel, setShowAddInPanel] = useState(false);
  const [editingInPanel, setEditingInPanel] = useState(null);
  const [editingPanelTitle, setEditingPanelTitle] = useState("");

  const editInputRef = useRef(null);
  const columnEditRef = useRef(null);
  const tableContainerRef = useRef(null);

  // Load user settings from database on mount
  useEffect(() => {
    const loadUserPrefs = async () => {
      try {
        const userSettings = await loadUserSettings('clients');
        
        // Load global stage and status options
        const stageSettings = await base44.entities.AppSettings.filter({ setting_key: 'client_stage_options' });
        if (stageSettings.length > 0 && stageSettings[0].value) {
          const stageValue = stageSettings[0].value;
          setStageOptions(Array.isArray(stageValue) ? stageValue : (stageValue.options || STAGE_OPTIONS));
        }
        
        const statusSettings = await base44.entities.AppSettings.filter({ setting_key: 'client_status_options' });
        if (statusSettings.length > 0 && statusSettings[0].value) {
          const statusValue = statusSettings[0].value;
          setStatusOptions(Array.isArray(statusValue) ? statusValue : (statusValue.options || STATUS_OPTIONS));
        }
        
        if (userSettings && userSettings.order) {
          
          // Build columns ONLY from saved settings
          const restoredColumns = [];
          
          // Restore saved columns
          userSettings.order.forEach(key => {
            // Try to find in custom columns
            const customCol = userSettings.custom_columns?.find(c => c.key === key);
            if (customCol) {
              restoredColumns.push({
                ...customCol,
                visible: userSettings.visibility?.[key] !== false,
                width: userSettings.widths?.[key] || customCol.width
              });
              return;
            }
            
            // Try to find in default columns
            const defaultCol = fixedDefaultColumns.find(c => c.key === key);
            if (defaultCol) {
              restoredColumns.push({
                ...defaultCol,
                visible: userSettings.visibility?.[key] !== false,
                width: userSettings.widths?.[key] || defaultCol.width
              });
              return;
            }
            
            // Special columns
            if (key === 'actions') {
              restoredColumns.push({
                key: 'actions',
                title: 'פעולות',
                width: userSettings.widths?.[key] || '120px',
                type: 'actions',
                required: true,
                visible: true
              });
            }
          });
          
          // Ensure 'name' is always first and visible
          const nameIndex = restoredColumns.findIndex(c => c.key === 'name');
          if (nameIndex > 0) {
            const [nameCol] = restoredColumns.splice(nameIndex, 1);
            restoredColumns.unshift(nameCol);
          }
          
          // Ensure actions is always last
          const actionsIndex = restoredColumns.findIndex(c => c.key === 'actions');
          if (actionsIndex !== -1 && actionsIndex < restoredColumns.length - 1) {
            const [actionsCol] = restoredColumns.splice(actionsIndex, 1);
            restoredColumns.push(actionsCol);
          } else if (actionsIndex === -1) {
            restoredColumns.push({
              key: 'actions',
              title: 'פעולות',
              width: '120px',
              type: 'actions',
              required: true,
              visible: true
            });
          }
          
          console.log('📊 Restored columns:', restoredColumns);
          setColumns(restoredColumns);
        } else {
          console.log('📊 No saved settings, using defaults');
          // No saved settings - use defaults
          const defaultCols = [...fixedDefaultColumns];
          if (!defaultCols.some(c => c.key === 'actions')) {
            defaultCols.push({
              key: 'actions',
              title: 'פעולות',
              width: '120px',
              type: 'actions',
              required: true,
              visible: true
            });
          }
          setColumns(defaultCols.map(col => ({ ...col, visible: col.visible !== false })));
        }
        
        // Restore cell styles and other settings
        if (userSettings) {
          if (userSettings.cellStyles) {
            setCellStyles(userSettings.cellStyles);
          }
          
          // Restore sub headers
          if (userSettings.showSubHeaders !== undefined) {
            setShowSubHeaders(userSettings.showSubHeaders);
          }
          if (userSettings.subHeaders) {
            setSubHeaders(userSettings.subHeaders);
          }
          
          // Stage options already loaded above
        }
        
        // Load general preferences
        const user = await base44.auth.me();
        const userPrefsData = await base44.entities.UserPreferences.filter({ user_email: user.email });
        if (userPrefsData.length > 0 && userPrefsData[0].general_preferences) {
          const prefs = userPrefsData[0].general_preferences;
          setUserPreferences(prefs);
          setAutoSave(prefs.auto_save !== false);
          setAutoCloseEdit(prefs.auto_close_edit !== false);
        }
      } catch (e) {
        console.error('Error loading user preferences:', e);
      }
      setSettingsLoaded(true);
    };
    
    loadUserPrefs();

    // Listen for global settings updates
    const handleStatusUpdate = (event) => {
      if (event.detail?.statusOptions) {
        const opts = event.detail.statusOptions;
        setStatusOptions(Array.isArray(opts) ? opts : (opts.options || STATUS_OPTIONS));
      }
    };
    
    const handleStageUpdate = (event) => {
      if (event.detail?.stageOptions) {
        const opts = event.detail.stageOptions;
        setStageOptions(Array.isArray(opts) ? opts : (opts.options || STAGE_OPTIONS));
      }
    };

    window.addEventListener('status:options:updated', handleStatusUpdate);
    window.addEventListener('stage:options:updated', handleStageUpdate);

    return () => {
      window.removeEventListener('status:options:updated', handleStatusUpdate);
      window.removeEventListener('stage:options:updated', handleStageUpdate);
    };
  }, []);

  // Listen for preference updates
  useEffect(() => {
    const handlePrefsUpdate = (event) => {
      const { preferences } = event.detail;
      setUserPreferences(preferences);
      setAutoSave(preferences.auto_save !== false);
      setAutoCloseEdit(preferences.auto_close_edit !== false);
    };
    
    window.addEventListener('user:preferences:updated', handlePrefsUpdate);
    return () => window.removeEventListener('user:preferences:updated', handlePrefsUpdate);
  }, []);

  useEffect(() => {
    if (!clients || clients.length === 0) {
      setLocalClients([]);
      return;
    }
    
    // Apply sorting if active
    if (sortConfig.key) {
      const sorted = [...clients].sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        
        // Handle empty values
        if (!aVal && !bVal) return 0;
        if (!aVal) return sortConfig.direction === 'asc' ? 1 : -1;
        if (!bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        
        // Compare values
        const comparison = String(aVal).localeCompare(String(bVal), 'he');
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      });
      setLocalClients(sorted);
    } else {
      setLocalClients(clients);
    }
  }, [clients, sortConfig]);

  // Listen for client updates - optimized
  useEffect(() => {
    const handleClientUpdate = (event) => {
      const updatedClient = event.detail;
      if (!updatedClient?.id) return;
      
      setLocalClients(prev => prev.map(c => 
        c.id === updatedClient.id ? { ...c, ...updatedClient } : c
      ));
    };
    
    window.addEventListener('client:updated', handleClientUpdate);
    return () => window.removeEventListener('client:updated', handleClientUpdate);
  }, []);

  // Debounced save to database (per user)
  const saveTimeoutRef = useRef(null);
  
  useEffect(() => {
    if (columns.length > 0 && settingsLoaded) {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      
      saveTimeoutRef.current = setTimeout(() => {
        saveUserSettings('clients', columns, cellStyles, showSubHeaders, subHeaders, stageOptions, statusOptions);
      }, 1000);
    }
    
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [columns, cellStyles, showSubHeaders, subHeaders, settingsLoaded, stageOptions]);

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

  // Handle fullscreen toggle and ESC key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        if (fullScreen) {
          setFullScreen(false);
        }
        if (selectionMode) {
          setSelectionMode(false);
          setSelectedRows(new Set());
          setSelectedCells(new Set());
          setSelectedHeaders(new Set());
        }
      }
    };
    
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [fullScreen, selectionMode]);

  const visibleColumns = useMemo(() => {
    const visible = columns.filter((col) => col.visible !== false);
    return visible;
  }, [columns]);

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const sourceIndex = result.source.index;
    const destIndex = result.destination.index;

    const sourceColumn = columns[sourceIndex];
    if (sourceColumn.key === 'actions' || sourceColumn.required) {
      toast.error('לא ניתן לגרור עמודה זו.');
      return;
    }
    const destinationColumn = columns[destIndex];
    if (destinationColumn && destinationColumn.required && destIndex < sourceIndex) {
      toast.error('לא ניתן למקם עמודה לפני עמודה חובה.');
      return;
    }


    if (sourceIndex === destIndex) return;

    const newColumns = Array.from(columns);
    const [removed] = newColumns.splice(sourceIndex, 1);
    newColumns.splice(destIndex, 0, removed);

    setColumns(newColumns);
    toast.success('סדר העמודות עודכן');
  };

  const addPresetColumn = () => {
    const preset = PRESET_CLIENT_COLUMNS.find((p) => p.slug === presetToAdd);
    if (!preset) {
      toast.error('לא נבחר סוג עמודה');
      return;
    }

    const columnKey = `cf:${preset.slug}`;

    if (columns.some((col) => col.key === columnKey)) {
      toast.error('עמודה זו כבר קיימת בטבלה');
      return;
    }

    const newColumn = {
      key: columnKey,
      title: preset.label,
      width: '150px',
      type: preset.type || 'text',
      required: false,
      visible: true
    };

    const actionsIndex = columns.findIndex((col) => col.key === 'actions');
    const newColumns = [...columns];
    if (actionsIndex > -1) {
      newColumns.splice(actionsIndex, 0, newColumn);
    } else {
      newColumns.push(newColumn);
    }

    setColumns(newColumns);
    setPresetToAdd("");
    toast.success('עמודה נוספה בהצלחה');
    setShowAddColumnDialog(false);
  };

  const addQuickColumn = () => {
    const columnName = prompt('שם העמודה החדשה:');
    if (!columnName) return;

    const newColumn = {
      key: `cf:custom_${Date.now()}`,
      title: columnName,
      width: '150px',
      type: 'text',
      required: false,
      visible: true
    };

    const actionsIndex = columns.findIndex((col) => col.key === 'actions');
    const newColumns = [...columns];
    if (actionsIndex > -1) {
      newColumns.splice(actionsIndex, 0, newColumn);
    } else {
      newColumns.push(newColumn);
    }

    setColumns(newColumns);
    toast.success(`עמודה "${columnName}" נוספה בהצלחה`);
  };

  const addNewRow = async () => {
    const name = prompt('שם הלקוח החדש:');
    if (!name) {
      return;
    }

    try {
      await Client.create({ name, status: 'פוטנציאלי' });
      toast.success('לקוח חדש נוסף בהצלחה');
      window.location.reload();
    } catch (error) {
      toast.error('שגיאה בהוספת לקוח: ' + error.message);
    }
  };

  const handleCellClick = (clientId, columnKey, event) => {
    // Ctrl+Click on name column - open client details
    if ((event.ctrlKey || event.metaKey) && columnKey === 'name') {
      event.preventDefault();
      event.stopPropagation();
      const client = localClients.find(c => c.id === clientId);
      if (client) {
        onView?.(client);
      }
      return;
    }

    if (event.altKey) {
      event.preventDefault();
      event.stopPropagation();
      const cellKey = `${clientId}_${columnKey}`;

      setSelectedCells((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(cellKey)) {
          newSet.delete(cellKey);
        } else {
          newSet.add(cellKey);
        }
        return newSet;
      });

      setSelectionMode(true);
      setIsDragging(true);
      return;
    }

    if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
      event.stopPropagation();
      const popoverKey = `${clientId}_${columnKey}`;
      setPopoverOpen(popoverKey);
      return;
    }

    const column = columns.find((c) => c.key === columnKey);
    if (!column || column.type === 'actions' || columnKey === 'created_date') {
      return;
    }



    const client = localClients.find((c) => c.id === clientId);
    if (!client) return;

    let currentValue = '';
    if (columnKey.startsWith('cf:')) {
      const slug = columnKey.slice(3);
      currentValue = client.custom_data?.[slug] || '';
    } else {
      currentValue = client[columnKey] || '';
    }

    setEditingCell(`${clientId}_${columnKey}`);
    setEditValue(String(currentValue));
    setTimeout(() => editInputRef.current?.focus(), 0);
  };

  const saveEdit = async () => {
    if (!editingCell) return;

    const [clientId, columnKey] = editingCell.split('_');
    const client = localClients.find((c) => c.id === clientId);

    if (!client) {
      console.warn('Client not found for edit');
      setEditingCell(null);
      return;
    }

    let updatedClient = { ...client };

    if (columnKey.startsWith('cf:')) {
      const slug = columnKey.slice(3);
      updatedClient = {
        ...updatedClient,
        custom_data: {
          ...(updatedClient.custom_data || {}),
          [slug]: editValue
        }
      };
    } else {
      updatedClient = {
        ...updatedClient,
        [columnKey]: editValue
      };
    }

    setLocalClients((prev) => prev.map((c) => c.id === clientId ? updatedClient : c));

    if (autoSave) {
      try {
        const dataToSave = { ...updatedClient };
        delete dataToSave.id;
        delete dataToSave.created_date;
        delete dataToSave.updated_date;
        delete dataToSave.created_by;

        await base44.entities.Client.update(clientId, dataToSave);
        const refreshedClient = await base44.entities.Client.get(clientId);
        window.dispatchEvent(new CustomEvent('client:updated', {
          detail: refreshedClient
        }));
        
        toast.success('התא עודכן');
      } catch (error) {
        toast.error('שגיאה בשמירת התא');
      }
    } else {
      toast.info('התא עודכן מקומית');
    }

    if (autoCloseEdit) {
      setEditingCell(null);
      setEditValue("");
    }
  };

  const handleCellMouseEnter = (clientId, columnKey, event) => {
    if (event.altKey && isDragging) {
      event.preventDefault();
      const cellKey = `${clientId}_${columnKey}`;

      setSelectedCells((prev) => {
        const newSet = new Set(prev);
        if (!newSet.has(cellKey)) {
          newSet.add(cellKey);
        }
        return newSet;
      });
    }
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

    if (!confirm(`האם למזג את "${sourceCol.title}" אל "${targetCol.title}"? פעולה זו אינה הפיכה.`)) {
      return;
    }

    const clientsToUpdate = [];

    const updatedClients = localClients.map((client) => {
      let sourceValue = '';
      let targetValue = '';

      if (sourceKey.startsWith('cf:')) {
        const slug = sourceKey.slice(3);
        sourceValue = client.custom_data?.[slug] || '';
      } else {
        sourceValue = client[sourceKey] || '';
      }

      if (targetKey.startsWith('cf:')) {
        const slug = targetKey.slice(3);
        targetValue = client.custom_data?.[slug] || '';
      } else {
        targetValue = client[targetKey] || '';
      }

      const mergedValue = targetValue && sourceValue ?
      `${targetValue}, ${sourceValue}` :
      targetValue || sourceValue;

      let updatedClient = { ...client };
      if (targetKey.startsWith('cf:')) {
        const slug = targetKey.slice(3);
        updatedClient = {
          ...updatedClient,
          custom_data: {
            ...(updatedClient.custom_data || {}),
            [slug]: mergedValue
          }
        };
      } else {
        updatedClient = {
          ...updatedClient,
          [targetKey]: mergedValue
        };
      }

      if (sourceKey.startsWith('cf:')) {
        const slug = sourceKey.slice(3);
        const newCustomData = { ...(updatedClient.custom_data || {}) };
        delete newCustomData[slug];
        updatedClient = { ...updatedClient, custom_data: newCustomData };
      } else {
        updatedClient = { ...updatedClient, [sourceKey]: '' };
      }

      clientsToUpdate.push(updatedClient);
      return updatedClient;
    });

    setLocalClients(updatedClients);

    try {
      await Promise.all(clientsToUpdate.map(async (client) => {
        const dataToSave = { ...client };
        delete dataToSave.id;
        delete dataToSave.created_date;
        delete dataToSave.updated_date;
        delete dataToSave.created_by;
        await Client.update(client.id, dataToSave);
      }));
      toast.success('העמודות מוזגו בהצלחה');
    } catch (error) {
      toast.error('שגיאה בשמירת נתונים ממוזגים: ' + error.message);
    }

    setCellStyles((prevStyles) => {
      const newStyles = { ...prevStyles };
      for (const key in newStyles) {
        if (key.endsWith(`_${sourceKey}`) || key === `header_${sourceKey}`) {
          delete newStyles[key];
        }
      }
      return newStyles;
    });

    const newColumns = columns.filter((c) => c.key !== sourceKey);
    setColumns(newColumns);
    setPopoverOpen(null);
    clearSelection();
  };

  const mergeSelectedHeaders = async () => {
    const headersList = Array.from(selectedHeaders);

    if (headersList.length < 2) {
      toast.error('בחר לפחות 2 כותרות למיזוג');
      return;
    }

    const actualHeadersToMerge = headersList.filter((key) => !key.startsWith('sub_'));
    if (actualHeadersToMerge.length < 2) {
      toast.error('בחר לפחות 2 כותרות ראשיות למיזוג');
      return;
    }

    const targetKey = actualHeadersToMerge[0];
    const targetCol = columns.find((c) => c.key === targetKey);

    if (!targetCol) {
      toast.error('עמודת יעד לא חוקית');
      return;
    }

    if (!confirm(`האם למזג את ${actualHeadersToMerge.length - 1} העמודות הנותרות אל "${targetCol.title}"? פעולה זו אינה הפיכה.`)) {
      return;
    }

    for (let i = 1; i < actualHeadersToMerge.length; i++) {
      await mergeColumns(actualHeadersToMerge[i], actualHeadersToMerge[0]);
    }

    setSelectedHeaders(new Set());
    setSelectionMode(false);
    toast.success(`${actualHeadersToMerge.length} עמודות מוזגו בהצלחה`);
  };

  const handleColumnClick = (columnKey, event) => {
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
      setSelectionMode(true);
      return;
    }

    if (event.altKey) {
      event.preventDefault();
      event.stopPropagation();
      const columnCells = localClients.map((c) => `${c.id}_${columnKey}`);
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
      setSelectionMode(true);
      return;
    }

    if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
      event.stopPropagation();
      const popoverKey = `header_${columnKey}`;
      setPopoverOpen(popoverKey);
      return;
    }

    const column = columns.find((c) => c.key === columnKey);
    if (!column) return;

    if (!column.required && column.key !== 'actions' && !editingColumnKey) {
      setEditingColumnKey(column.key);
      setEditingColumnTitle(column.title);
    }
  };

  const saveColumnTitle = () => {
    if (!editingColumnKey || !editingColumnTitle.trim()) {
      console.warn('Invalid column title');
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

    setEditingColumnKey(null);
    setEditingColumnTitle("");
    toast.success('שם העמודה עודכן');
  };

  const applyCellStyle = (cellKey, style) => {
    setCellStyles((prev) => ({
      ...prev,
      [cellKey]: style
    }));
    setPopoverOpen(null);
    toast.success('סגנון הותקן');
  };

  const applyStyleToSelection = (style) => {
    setCellStyles((prev) => {
      const newStyles = { ...prev };
      selectedCells.forEach((cellKey) => {
        newStyles[cellKey] = style;
      });
      return newStyles;
    });
    setPopoverOpen(null);
    toast.success(`סגנון הותקן ל-${selectedCells.size} תאים`);
  };

  const applyColumnStyle = (columnKey, style) => {
    const columnCells = localClients.map((c) => `${c.id}_${columnKey}`);
    setCellStyles((prev) => {
      const newStyles = { ...prev };
      columnCells.forEach((cellKey) => {
        newStyles[cellKey] = style;
      });
      return newStyles;
    });
    setPopoverOpen(null);
    toast.success(`סגנון הותקן לעמודה`);
  };

  const applyHeaderStyle = (columnKey, style) => {
    setCellStyles((prev) => {
      const newStyles = { ...prev };
      newStyles[`header_${columnKey}`] = style;
      return newStyles;
    });
    setPopoverOpen(null);
    toast.success('סגנון הותקן לכותרת');
  };

  const applySubHeaderStyle = (columnKey, style) => {
    setCellStyles((prev) => {
      const newStyles = { ...prev };
      newStyles[`subheader_${columnKey}`] = style;
      return newStyles;
    });
    setPopoverOpen(null);
    toast.success('סגנון כותרת משנה עודכן');
  };

  const splitColumn = (columnKey) => {
    const column = columns.find((c) => c.key === columnKey);
    if (!column) return;

    if (column.key.match(/_(\d+)$/)) {
      toast.error('לא ניתן לפצל עמודה שכבר פוצלה באופן דומה');
      return;
    }

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
    setPopoverOpen(null);
    toast.success('עמודה פוצלה בהצלחה');
  };

  const deleteColumn = (columnKey) => {
    const column = columns.find((c) => c.key === columnKey);
    if (!column || column.required) {
      toast.error('לא ניתן למחוק עמודה זו');
      return;
    }

    if (!confirm(`האם למחוק את העמודה "${column.title}"?`)) {
      return;
    }

    setCellStyles((prevStyles) => {
      const newStyles = { ...prevStyles };
      for (const key in newStyles) {
        if (key.endsWith(`_${columnKey}`) || key === `header_${columnKey}`) {
          delete newStyles[key];
        }
      }
      return newStyles;
    });

    const newColumns = columns.filter((c) => c.key !== columnKey);
    setColumns(newColumns);
    setPopoverOpen(null);
    toast.success('העמודה נמחקה');
  };

  const addColumnFromPanel = () => {
    if (!newColumnName.trim()) {
      toast.error('נא להזין שם לעמודה');
      return;
    }

    const newColumn = {
      key: `cf:custom_${Date.now()}`,
      title: newColumnName.trim(),
      width: '150px',
      type: newColumnType,
      required: false,
      visible: true
    };

    const actionsIndex = columns.findIndex((col) => col.key === 'actions');
    const newColumns = [...columns];
    if (actionsIndex > -1) {
      newColumns.splice(actionsIndex, 0, newColumn);
    } else {
      newColumns.push(newColumn);
    }

    setColumns(newColumns);
    setNewColumnName("");
    setNewColumnType("text");
    setShowAddInPanel(false);
    toast.success(`עמודה "${newColumn.title}" נוספה`);
  };

  const saveColumnTitleInPanel = (columnKey) => {
    if (!editingPanelTitle.trim()) {
      toast.error('נא להזין שם חדש');
      setEditingInPanel(null);
      setEditingPanelTitle("");
      return;
    }

    setColumns((prev) => prev.map((col) => {
      if (col.key === columnKey) {
        return { ...col, title: editingPanelTitle.trim() };
      }
      return col;
    }));

    setEditingInPanel(null);
    setEditingPanelTitle("");
    toast.success('שם העמודה עודכן');
  };

  const deleteCell = async (clientId, columnKey) => {
    const updatedClients = localClients.map((c) => {
      if (c.id !== clientId) return c;

      if (columnKey.startsWith('cf:')) {
        const slug = columnKey.slice(3);
        const newCustomData = { ...(c.custom_data || {}) };
        delete newCustomData[slug];
        return { ...c, custom_data: newCustomData };
      }

      return { ...c, [columnKey]: '' };
    });

    setLocalClients(updatedClients);

    try {
      const updatedClient = updatedClients.find((c) => c.id === clientId);
      const dataToSave = { ...updatedClient };

      delete dataToSave.id;
      delete dataToSave.created_date;
      delete dataToSave.updated_date;
      delete dataToSave.created_by;

      await Client.update(clientId, dataToSave);
      toast.success('התא נוקה');
    } catch (error) {
      toast.error('שגיאה במחיקת התא');
    }

    setPopoverOpen(null);
  };

  const deleteSelectedCells = async () => {
    if (selectedCells.size === 0) return;

    if (!confirm(`האם למחוק ${selectedCells.size} תאים? פעולה זו אינה הפיכה.`)) return;

    const cellsArray = Array.from(selectedCells);
    for (const cellKey of cellsArray) {
      const [clientId, columnKey] = cellKey.split('_');
      await deleteCell(clientId, columnKey);
    }

    setSelectedCells(new Set());
    setSelectionMode(false);
    toast.success(`${cellsArray.length} תאים נמחקו`);
  };

  const clearSelectedCells = async () => {
    if (selectedCells.size === 0) return;

    if (!confirm(`האם לנקות את התוכן של ${selectedCells.size} תאים?`)) return;

    const cellsArray = Array.from(selectedCells);
    const clientsToUpdate = new Map();

    cellsArray.forEach(cellKey => {
      const [clientId, columnKey] = cellKey.split('_');
      if (!clientsToUpdate.has(clientId)) {
        clientsToUpdate.set(clientId, []);
      }
      clientsToUpdate.get(clientId).push(columnKey);
    });

    const updatedClientsMap = new Map();
    localClients.forEach(client => {
      if (clientsToUpdate.has(client.id)) {
        let updatedClient = { ...client };
        clientsToUpdate.get(client.id).forEach(columnKey => {
          if (columnKey.startsWith('cf:')) {
            const slug = columnKey.slice(3);
            updatedClient = {
              ...updatedClient,
              custom_data: {
                ...(updatedClient.custom_data || {}),
                [slug]: ''
              }
            };
          } else {
            updatedClient = {
              ...updatedClient,
              [columnKey]: ''
            };
          }
        });
        updatedClientsMap.set(client.id, updatedClient);
      }
    });

    setLocalClients(prev => prev.map(c => updatedClientsMap.get(c.id) || c));

    try {
      await Promise.all(Array.from(updatedClientsMap.values()).map(async (client) => {
        const dataToSave = { ...client };
        delete dataToSave.id;
        delete dataToSave.created_date;
        delete dataToSave.updated_date;
        delete dataToSave.created_by;
        await Client.update(client.id, dataToSave);
      }));
      toast.success(`${cellsArray.length} תאים נוקו`);
    } catch (error) {
      toast.error('שגיאה בניקוי תאים');
    }

    setSelectedCells(new Set());
    setSelectionMode(false);
  };

  const copySelectedCells = () => {
    if (selectedCells.size === 0) return;

    const cellsData = [];
    selectedCells.forEach(cellKey => {
      const [clientId, columnKey] = cellKey.split('_');
      const client = localClients.find(c => c.id === clientId);
      const column = columns.find(c => c.key === columnKey);
      
      if (client && column) {
        let value = '';
        if (columnKey.startsWith('cf:')) {
          const slug = columnKey.slice(3);
          value = client.custom_data?.[slug] || '';
        } else {
          value = client[columnKey] || '';
        }
        
        cellsData.push({
          client: client.name,
          column: column.title,
          value: value
        });
      }
    });

    const textData = cellsData.map(d => `${d.client} - ${d.column}: ${d.value}`).join('\n');
    navigator.clipboard.writeText(textData);
    toast.success(`${selectedCells.size} תאים הועתקו ללוח`);
  };

  const fillSelectedCells = async () => {
    if (selectedCells.size === 0) return;

    const fillValue = prompt(`הזן ערך למילוי ${selectedCells.size} תאים:`);
    if (fillValue === null) return;

    const cellsArray = Array.from(selectedCells);
    const clientsToUpdate = new Map();

    cellsArray.forEach(cellKey => {
      const [clientId, columnKey] = cellKey.split('_');
      if (!clientsToUpdate.has(clientId)) {
        clientsToUpdate.set(clientId, []);
      }
      clientsToUpdate.get(clientId).push(columnKey);
    });

    const updatedClientsMap = new Map();
    localClients.forEach(client => {
      if (clientsToUpdate.has(client.id)) {
        let updatedClient = { ...client };
        clientsToUpdate.get(client.id).forEach(columnKey => {
          if (columnKey.startsWith('cf:')) {
            const slug = columnKey.slice(3);
            updatedClient = {
              ...updatedClient,
              custom_data: {
                ...(updatedClient.custom_data || {}),
                [slug]: fillValue
              }
            };
          } else {
            updatedClient = {
              ...updatedClient,
              [columnKey]: fillValue
            };
          }
        });
        updatedClientsMap.set(client.id, updatedClient);
      }
    });

    setLocalClients(prev => prev.map(c => updatedClientsMap.get(c.id) || c));

    try {
      await Promise.all(Array.from(updatedClientsMap.values()).map(async (client) => {
        const dataToSave = { ...client };
        delete dataToSave.id;
        delete dataToSave.created_date;
        delete dataToSave.updated_date;
        delete dataToSave.created_by;
        await Client.update(client.id, dataToSave);
      }));
      toast.success(`${cellsArray.length} תאים מולאו בערך "${fillValue}"`);
    } catch (error) {
      toast.error('שגיאה במילוי תאים');
    }

    setSelectedCells(new Set());
    setSelectionMode(false);
  };

  const exportSelectedCells = () => {
    if (selectedCells.size === 0) return;

    const cellsData = [];
    selectedCells.forEach(cellKey => {
      const [clientId, columnKey] = cellKey.split('_');
      const client = localClients.find(c => c.id === clientId);
      const column = columns.find(c => c.key === columnKey);
      
      if (client && column) {
        let value = '';
        if (columnKey.startsWith('cf:')) {
          const slug = columnKey.slice(3);
          value = client.custom_data?.[slug] || '';
        } else {
          value = client[columnKey] || '';
        }
        
        cellsData.push({
          client: client.name,
          column: column.title,
          value: value
        });
      }
    });

    const csvData = [
      ['לקוח', 'עמודה', 'ערך'],
      ...cellsData.map(row => row.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `selected-cells-${format(new Date(), 'dd-MM-yyyy')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success(`${selectedCells.size} תאים יוצאו לקובץ CSV`);
  };

  const toggleColumnVisibility = (columnKey) => {
    setColumns((prev) => prev.map((col) => {
      if (col.key !== columnKey) return col;
      if (col.required || col.key === 'actions') {
        toast.error('לא ניתן להסתיר עמודה זו.');
        return col;
      }
      return { ...col, visible: !(col.visible !== false) };
    }));
  };

  const clearSelection = () => {
    setSelectedCells(new Set());
    setSelectedHeaders(new Set());
    setSelectedRows(new Set());
    setSelectionMode(false);
    setIsDragging(false);
    toast.info('הבחירה נוקתה');
  };

  const toggleRowSelection = (clientId) => {
    setSelectedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(clientId)) {
        newSet.delete(clientId);
      } else {
        newSet.add(clientId);
      }
      return newSet;
    });
  };

  const toggleSubHeaders = () => {
    const newValue = !showSubHeaders;
    setShowSubHeaders(newValue);

    if (newValue) {
      const initialSubHeaders = {};
      visibleColumns.forEach((col) => {
        if (subHeaders[col.key] === undefined) {
          initialSubHeaders[col.key] = '';
        }
      });
      setSubHeaders((prev) => ({ ...prev, ...initialSubHeaders }));
      toast.success('שורת כותרות משנה הופעלה');
    } else {
      toast.success('שורת כותרות משנה הוסתרה');
    }
  };

  const updateSubHeader = (columnKey, value) => {
    setSubHeaders((prev) => ({
      ...prev,
      [columnKey]: value
    }));
    toast.success('כותרת משנה עודכנה');
  };

  const handleSort = (columnKey) => {
    setSortConfig((prev) => {
      if (prev.key === columnKey) {
        // Toggle: asc -> desc -> none
        if (prev.direction === 'asc') {
          return { key: columnKey, direction: 'desc' };
        } else {
          return { key: null, direction: 'asc' };
        }
      }
      // New column sort
      return { key: columnKey, direction: 'asc' };
    });
  };

  const handleSaveStageOptions = async (newOptions) => {
    try {
      const user = await base44.auth.me();
      
      // Save to global AppSettings
      const existing = await base44.entities.AppSettings.filter({ setting_key: 'client_stage_options' });
      
      if (existing.length > 0) {
        await base44.entities.AppSettings.update(existing[0].id, {
          value: newOptions,
          updated_by: user.email
        });
      } else {
        await base44.entities.AppSettings.create({
          setting_key: 'client_stage_options',
          value: newOptions,
          updated_by: user.email
        });
      }
      
      setStageOptions(newOptions);
      toast.success('✓ השלבים נשמרו ומסונכרנו לכל המשתמשים');
    } catch (error) {
      console.error('Failed to save stage options:', error);
      toast.error('שגיאה בשמירת השלבים');
    }
  };

  const handleSaveStatusOptions = async (newOptions) => {
    try {
      const user = await base44.auth.me();
      
      // Save to global AppSettings
      const existing = await base44.entities.AppSettings.filter({ setting_key: 'client_status_options' });
      
      if (existing.length > 0) {
        await base44.entities.AppSettings.update(existing[0].id, {
          value: newOptions,
          updated_by: user.email
        });
      } else {
        await base44.entities.AppSettings.create({
          setting_key: 'client_status_options',
          value: newOptions,
          updated_by: user.email
        });
      }
      
      setStatusOptions(newOptions);
      toast.success('✓ הסטטוסים נשמרו ומסונכרנו לכל המשתמשים');
    } catch (error) {
      console.error('Failed to save status options:', error);
      toast.error('שגיאה בשמירת הסטטוסים');
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <div className="h-64 animate-pulse bg-gray-200 rounded-md"></div>
      </div>);

  }

  return (
    <div className={`w-full overflow-visible ${fullScreen ? 'fixed inset-0 z-[9999] bg-white p-4' : ''}`} dir="rtl">
      {showDebugPanel &&
      <div className="fixed top-4 left-4 bg-red-600 text-white p-4 rounded-lg shadow-2xl z-[9999] max-w-sm" dir="rtl">
          <div className="font-bold text-lg mb-2 flex items-center justify-between">
            <span>🔴 DEBUG</span>
            <Button
            size="sm"
            variant="ghost"
            className="text-white hover:bg-red-700 h-6 w-6 p-0"
            onClick={() => {
              setShowDebugPanel(false);
            }}>

              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="text-sm space-y-1">
            <div>עמודות: {columns.length}</div>
            <div>גלויות: {visibleColumns.length}</div>
            <div>לקוחות: {localClients.length}</div>
            <div>עריכה: {editingCell || 'אין'}</div>
            <div>פופאפ: {popoverOpen || 'סגור'}</div>
            <div>תאים נבחרו: {selectedCells.size}</div>
            <div>כותרות נבחרו: {selectedHeaders.size}</div>
            <div>כותרות משנה גלויות: {showSubHeaders ? 'כן' : 'לא'}</div>
            <div className="pt-2 border-t text-xs">
              💡 Ctrl+Click = פופאפ<br />
              ⌥ Alt+Click = בחירת תאים<br />
              ⌥⇧ Alt+Shift+Click על כותרת = בחירת כותרת<br />
              ⌥⇧ Alt+Shift+Click על כותרת משנה = בחירת כותרת משנה<br />
              📝 Click = עריכה<br />
              🖱️ Drag = שינוי סדר
            </div>
          </div>
        </div>
      }

      <Card ref={cardRef} className={`shadow-lg border-0 bg-white/80 backdrop-blur-sm rounded-2xl ${fullScreen ? 'h-full flex flex-col' : ''}`} dir="rtl">
        <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gray-900 p-3 rounded-xl from-blue-500 to-purple-600 shadow-lg">
                <Table className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="bg-clip-text text-sky-950 text-2xl font-bold tracking-tight from-blue-600 to-purple-600">
                  טבלת Excel מתקדמת
                </CardTitle>
                <p className="text-sm text-slate-500 mt-1 flex items-center gap-2">
                  עריכה ישירה עם קיצורי מקלדת מהירים
                  <HelpIcon
                    text="טבלת Excel מתקדמת עם יכולות עריכה מלאות. השתמש בקיצורי מקלדת לעבודה מהירה!" />

                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowUserPreferences(true)}
                className="gap-2">

                <User className="w-4 h-4" />
                העדפות אישיות
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowShortcuts(!showShortcuts)}
                className="gap-2">

                <Info className="w-4 h-4" />
                {showShortcuts ? 'הסתר' : 'הצג'} קיצורים
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowStageManager(true)}
                className="gap-2">

                <Circle className="w-4 h-4" style={{ color: '#8b5cf6' }} />
                שלבים
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowStatusManager(true)}
                className="gap-2">

                <Circle className="w-4 h-4" style={{ color: '#22c55e' }} />
                סטטוסים
              </Button>

              <DropdownMenu open={isDropdownSettingsOpen} onOpenChange={setIsDropdownSettingsOpen}>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Settings className="w-4 h-4" />
                    הגדרות
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-72" dir="rtl">
                  <div className="p-3 space-y-3">
                    <h3 className="font-semibold text-sm mb-2">הגדרות זרימת עבודה</h3>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <label htmlFor="auto-save-switch" className="text-sm font-medium">שמירה אוטומטית</label>
                        <HelpIcon text="שמור שינויים אוטומטית בעת מעבר בין תאים או יציאה ממצב עריכה." />
                      </div>
                      <Switch
                        id="auto-save-switch"
                        checked={autoSave}
                        onCheckedChange={setAutoSave}
                        onClick={(e) => e.stopPropagation()} />

                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <label htmlFor="auto-close-edit-switch" className="text-sm font-medium">סגירת עריכה אוטומטית</label>
                        <HelpIcon text="סגור אוטומטית את מצב עריכת התא לאחר שמירה או לחיצה מחוץ לתא." />
                      </div>
                      <Switch
                        id="auto-close-edit-switch"
                        checked={autoCloseEdit}
                        onCheckedChange={setAutoCloseEdit}
                        onClick={(e) => e.stopPropagation()} />

                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <label htmlFor="smooth-scroll-switch" className="text-sm font-medium">מעבר חלק</label>
                        <HelpIcon text="הפעל אנימציות חלקות בעת גלילה או מעבר בין אזורים בטבלה." />
                      </div>
                      <Switch
                        id="smooth-scroll-switch"
                        checked={smoothScroll}
                        onCheckedChange={setSmoothScroll}
                        onClick={(e) => e.stopPropagation()} />

                    </div>

                    <DropdownMenuSeparator />

                    <h3 className="font-semibold text-sm mb-2">כללי</h3>

                    <DropdownMenuItem onClick={() => {setIsSheetOpen(true);setIsDropdownSettingsOpen(false);}} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                          <Edit2 className="w-4 h-4" />
                          <span>ניהול עמודות</span>
                      </div>
                      <HelpIcon text="הגדר עמודות, נראות, ומחוק עמודות מותאמות אישית." side="left" />
                    </DropdownMenuItem>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <label htmlFor="debug-panel-switch" className="text-sm font-medium">לוח Debug</label>
                        <HelpIcon text="הצג/הסתר פאנל ניפוי באגים עם מידע טכני." />
                      </div>
                      <Switch
                        id="debug-panel-switch"
                        checked={showDebugPanel}
                        onCheckedChange={setShowDebugPanel}
                        onClick={(e) => e.stopPropagation()} />

                    </div>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setFullScreen(!fullScreen);
                }}
                title={fullScreen ? 'מצב רגיל (ESC)' : 'מסך מלא'}>

                {fullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>

        {showShortcuts &&
        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
            <div className="flex items-start gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <h3 className="font-semibold text-blue-900">קיצורי מקלדת מהירים</h3>
              <HelpIcon
              text="השתמש בקיצורים אלה לעבודה מהירה ויעילה יותר בטבלה." />

            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-y-3 gap-x-6 text-sm">
              <KeyboardShortcut keys="Click" description="על כותרת = עריכת שם" />
              <KeyboardShortcut keys="Ctrl+Click" description="תפריט מלא" />
              <KeyboardShortcut keys="Drag" description="שינוי סדר עמודות" />
              <KeyboardShortcut keys="Alt+Click" description="בחירה מרובה" />
              <KeyboardShortcut keys="Alt+Shift+Click" description="בחירת כותרת" />
            </div>
            <div className="mt-4 flex flex-wrap gap-3 pt-3 border-t border-blue-200">
              <Button onClick={addNewRow} size="sm" variant="outline" className="gap-2 bg-white">
                <Plus className="w-4 h-4" /> שורה חדשה
              </Button>
              <Button onClick={addQuickColumn} size="sm" variant="outline" className="gap-2 bg-white">
                <Plus className="w-4 h-4" /> עמודה חדשה
              </Button>
              <Button onClick={() => setShowHistory(true)} size="sm" variant="outline" className="gap-2 bg-white">
                <Clock className="w-4 h-4" /> היסטוריית שינויים
              </Button>
              <Button onClick={clearSelection} size="sm" variant="destructive" className="gap-2">
                <X className="w-4 h-4" /> נקה בחירה
              </Button>
            </div>
          </div>
        }

      {!showShortcuts &&
        <CardHeader className="pt-3 border-b border-slate-200">
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              onClick={addNewRow}
              className="bg-[#2C3A50] hover:bg-[#1f2937] text-white gap-2 h-8"
            >
              <Plus className="w-3 h-3" />
              שורה
            </Button>

            <Button
              size="sm"
              variant={selectionMode ? "default" : "outline"}
              onClick={() => {
                const newMode = !selectionMode;
                setSelectionMode(newMode);
                if (!newMode) {
                  setSelectedRows(new Set());
                  setSelectedCells(new Set());
                  setSelectedHeaders(new Set());
                }
              }}
              className={`gap-2 h-8 ${selectionMode ? 'bg-purple-600 hover:bg-purple-700 text-white' : ''}`}
            >
              <Checkbox className="w-3 h-3" />
              {selectionMode ? 'סגור בחירה' : 'בחירה מרובה'}
            </Button>

            <Button
              size="sm"
              onClick={addQuickColumn}
              className="bg-[#2C3A50] hover:bg-[#1f2937] text-white gap-2 h-8"
            >
              <Plus className="w-3 h-3" />
              עמודה מהירה
            </Button>

            <Popover open={showAddColumnDialog} onOpenChange={setShowAddColumnDialog}>
              <PopoverTrigger asChild>
                <Button
                  size="sm"
                  className="bg-[#2C3A50] hover:bg-[#1f2937] text-white gap-2 h-8"
                >
                  <Plus className="w-3 h-3" />
                  עמודה מוכנה
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="start" side="bottom" dir="rtl">
                <div className="space-y-3">
                  <h4 className="font-semibold">הוסף עמודה מוכנה</h4>
                  <Select value={presetToAdd} onValueChange={setPresetToAdd}>
                    <SelectTrigger>
                      <SelectValue placeholder="בחר סוג עמודה" />
                    </SelectTrigger>
                    <SelectContent>
                      {PRESET_CLIENT_COLUMNS.filter((p) => !columns.some((col) => col.key === `cf:${p.slug}`)).map((p) =>
                      <SelectItem key={p.slug} value={p.slug}>
                          {p.label}
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <div className="flex gap-2">
                    <Button
                      onClick={addPresetColumn}
                      className="flex-1 bg-green-600 hover:bg-green-700">

                      <Plus className="w-4 h-4 ml-2" />
                      הוסף
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowAddColumnDialog(false);
                        setPresetToAdd("");
                      }}>

                      ביטול
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            <Button
              size="sm"
              variant={showSubHeaders ? "default" : "outline"}
              onClick={toggleSubHeaders}
              className={`gap-2 h-8 ${showSubHeaders ? 'bg-purple-600 hover:bg-purple-700 text-white' : ''}`}
            >
              <Plus className="w-3 h-3" />
              {showSubHeaders ? 'הסתר כותרות משנה' : 'הוסף כותרות משנה'}
            </Button>



            {selectionMode && selectedRows.size > 0 && (
              <>
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 font-semibold">
                  נבחרו {selectedRows.size} לקוחות
                </Badge>

                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2 h-8 bg-blue-50 hover:bg-blue-100 border-blue-200"
                  onClick={async () => {
                    if (selectedRows.size === 0) return;
                    const selectedClients = localClients.filter(c => selectedRows.has(c.id));
                    
                    try {
                      await Promise.all(
                        selectedClients.map(client => 
                          base44.entities.Client.create({
                            ...client,
                            name: `${client.name} (עותק)`,
                            id: undefined,
                            created_date: undefined,
                            updated_date: undefined,
                            created_by: undefined
                          })
                        )
                      );
                      toast.success(`${selectedRows.size} לקוחות הועתקו בהצלחה`);
                      window.location.reload();
                    } catch (error) {
                      toast.error('שגיאה בהעתקת לקוחות');
                    }
                  }}
                >
                  <Copy className="w-3 h-3" />
                  העתק לקוחות
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2 h-8 text-red-600 hover:bg-red-50 border-red-200"
                  onClick={async () => {
                    if (selectedRows.size === 0) return;
                    if (!confirm(`האם אתה בטוח שברצונך למחוק ${selectedRows.size} לקוחות? פעולה זו אינה הפיכה.`)) return;
                    
                    try {
                      await Promise.all(
                        Array.from(selectedRows).map(clientId => 
                          base44.entities.Client.delete(clientId)
                        )
                      );
                      toast.success(`${selectedRows.size} לקוחות נמחקו`);
                      window.location.reload();
                    } catch (error) {
                      toast.error('שגיאה במחיקת לקוחות');
                    }
                  }}
                >
                  <Trash2 className="w-3 h-3" />
                  מחק לקוחות
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-2 h-8"
                  onClick={() => {
                    setSelectedRows(new Set());
                    setSelectionMode(false);
                  }}
                >
                  <X className="w-3 h-3" />
                  בטל
                </Button>
              </>
            )}

            {selectedHeaders.size > 0 &&
            <>
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  נבחרו {selectedHeaders.size} כותרות
                </Badge>

                {selectedHeaders.size >= 2 &&
              <Button
                size="sm"
                variant="outline"
                className="gap-2 h-8"
                onClick={mergeSelectedHeaders}>

                    <Merge className="w-3 h-3" />
                    מזג כותרות
                  </Button>
              }

                <Button
                size="sm"
                variant="ghost"
                className="gap-2 h-8"
                onClick={clearSelection}>

                  <X className="w-3 h-3" />
                  בטל
                </Button>
              </>
            }

            {selectionMode && selectedCells.size > 0 &&
            <>
                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                  נבחרו: {selectedCells.size}
                </Badge>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                    size="sm"
                    variant="outline"
                    className="gap-2 h-8">

                      <Palette className="w-3 h-3" />
                      צבע
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" side="bottom" align="start">
                    <ColorPicker
                    onApply={applyStyleToSelection}
                    onClose={() => {}} />

                  </PopoverContent>
                </Popover>

                <Button
                size="sm"
                variant="outline"
                className="gap-2 h-8 text-red-600"
                onClick={deleteSelectedCells}>

                  <Trash2 className="w-3 h-3" />
                  מחק
                </Button>

                <Button
                size="sm"
                variant="ghost"
                className="gap-2 h-8"
                onClick={clearSelection}>

                  <X className="w-3 h-3" />
                  בטל
                </Button>
              </>
            }
          </div>
        </CardHeader>
        }


      {selectionMode && selectedCells.size > 0 && (
          <div className="border-b bg-gradient-to-r from-purple-50 to-blue-50 p-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-300 text-base px-3 py-1">
                  ✓ נבחרו {selectedCells.size} תאים
                </Badge>
              </div>
              
              <div className="flex items-center gap-2 flex-wrap">
                {/* Style */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-2 bg-white hover:bg-purple-50 border-purple-200">
                      <Palette className="w-4 h-4" />
                      צבע וסגנון
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" side="bottom" align="start">
                    <ColorPicker
                      onApply={applyStyleToSelection}
                      onClose={() => {}} />
                  </PopoverContent>
                </Popover>

                {/* Copy */}
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2 bg-white hover:bg-blue-50 border-blue-200"
                  onClick={copySelectedCells}>
                  <Copy className="w-4 h-4" />
                  העתק
                </Button>

                {/* Fill */}
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2 bg-white hover:bg-green-50 border-green-200"
                  onClick={fillSelectedCells}>
                  <Edit className="w-4 h-4" />
                  מלא בערך
                </Button>

                {/* Export */}
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2 bg-white hover:bg-amber-50 border-amber-200"
                  onClick={exportSelectedCells}>
                  <FileText className="w-4 h-4" />
                  ייצא CSV
                </Button>

                {/* Clear */}
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2 bg-white hover:bg-orange-50 border-orange-200"
                  onClick={clearSelectedCells}>
                  <Eraser className="w-4 h-4" />
                  נקה תוכן
                </Button>

                {/* Delete */}
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2 bg-white hover:bg-red-50 border-red-300 text-red-600"
                  onClick={deleteSelectedCells}>
                  <Trash2 className="w-4 h-4" />
                  מחק
                </Button>

                {/* Cancel */}
                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-2"
                  onClick={clearSelection}>
                  <X className="w-4 h-4" />
                  בטל
                </Button>
              </div>
            </div>

            {/* Help text */}
            <div className="mt-2 text-xs text-slate-600 flex items-center gap-2">
              <Info className="w-3 h-3" />
              <span>💡 טיפ: החזק Alt והחלק על תאים נוספים לבחירה מרובה</span>
            </div>
          </div>
        )}

      <CardContent className={`p-0 ${fullScreen ? 'flex-1 flex flex-col' : ''}`}>
        <div
            ref={tableContainerRef}
            className="border border-slate-200 overflow-auto"
            style={{
              height: fullScreen ? '100%' : 'auto',
              maxHeight: fullScreen ? '100%' : '70vh',
              width: '100%',
              position: 'relative'
            }}
            onScroll={(e) => {
            }}>
          <DragDropContext onDragEnd={handleDragEnd}>
            <table className="border-collapse" dir="rtl" style={{
                  width: 'max-content',
                  minWidth: '100%',
                  tableLayout: 'fixed'
                }}>

              <Droppable droppableId="columns" direction="horizontal">
                {(provided) =>
                  <thead
                    className="bg-slate-100 sticky top-0 z-20"
                    ref={provided.innerRef}
                    {...provided.droppableProps}>

                    <tr>
                      {selectionMode && (
                        <th
                          className="border border-slate-200 p-3 text-center font-medium text-slate-700 sticky right-0 z-30 shadow-[2px_0_5px_rgba(0,0,0,0.1)] bg-purple-100"
                          style={{
                            width: '50px',
                            minWidth: '50px',
                            maxWidth: '50px'
                          }}
                        >
                          <Checkbox
                            checked={selectedRows.size === localClients.length && localClients.length > 0}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedRows(new Set(localClients.map(c => c.id)));
                              } else {
                                setSelectedRows(new Set());
                              }
                            }}
                            className="cursor-pointer"
                          />
                        </th>
                      )}
                      {visibleColumns.map((column, colIndex) => {
                        const headerStyle = cellStyles[`header_${column.key}`] || {};
                        const isHeaderSelected = selectedHeaders.has(column.key);
                        const canEdit = !column.required && column.key !== 'actions';
                        const canDrag = !column.required && column.key !== 'actions';

                        return (
                          <Draggable
                            key={column.key}
                            draggableId={column.key}
                            index={colIndex}
                            isDragDisabled={!canDrag}>

                            {(provided, snapshot) =>
                            <th
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...canDrag ? provided.dragHandleProps : {}}
                              className={`border border-slate-200 p-3 text-right font-medium text-slate-700 ${
                              colIndex === 0 && !selectionMode ? 'sticky right-0 z-30 shadow-[2px_0_5px_rgba(0,0,0,0.1)]' : ''} ${
                              colIndex === 0 && selectionMode ? 'sticky z-30 shadow-[2px_0_5px_rgba(0,0,0,0.1)]' : ''} ${
                              isHeaderSelected ? 'ring-2 ring-blue-500 bg-blue-50' : ''}
                                ${canEdit ? 'hover:bg-blue-50 hover:shadow-inner transition-all cursor-pointer' : ''}
                                ${snapshot.isDragging ? 'opacity-50 bg-blue-100' : ''}`}
                              style={{
                                width: column.width,
                                minWidth: column.width,
                                backgroundColor: snapshot.isDragging ? '#dbeafe' : isHeaderSelected ? '#eff6ff' : headerStyle.backgroundColor || (colIndex === 0 ? '#f1f5f9' : '#f1f5f9'),
                                opacity: headerStyle.opacity ? headerStyle.opacity / 100 : 1,
                                fontWeight: headerStyle.fontWeight || 'normal',
                                borderColor: isHeaderSelected ? '#3b82f6' : headerStyle.borderColor || '#e2e8f0',
                                cursor: canDrag ? 'grab' : 'default',
                                right: selectionMode && colIndex === 0 ? '50px' : colIndex === 0 ? '0' : 'auto',
                                ...provided.draggableProps.style
                              }}
                              onClick={(e) => !snapshot.isDragging && handleColumnClick(column.key, e)}
                              onMouseDown={(e) => {
                                if (e.altKey || e.ctrlKey || e.metaKey) {
                                  e.preventDefault();
                                }
                              }}>

                                {editingColumnKey === column.key ?
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
                                  className="h-8 flex-1"
                                  onClick={(e) => e.stopPropagation()} />

                                    <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    saveColumnTitle();
                                  }}
                                  title="שמור שינויים">

                                      <Save className="w-4 h-4 text-green-600" />
                                    </Button>
                                    <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingColumnKey(null);
                                    setEditingColumnTitle("");
                                  }}
                                  title="בטל עריכה">

                                      <X className="w-4 h-4 text-red-600" />
                                    </Button>
                                  </div> :

                              <div className="flex items-center justify-between group w-full">
                                    <span>{column.title}</span>

                                    <div className="flex items-center gap-1">
                                      {/* Sort Icon - Always Visible */}
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleSort(column.key);
                                        }}
                                        className="p-1 hover:bg-slate-200 rounded transition-colors"
                                        title={`מיין לפי ${column.title}`}
                                      >
                                        {sortConfig.key === column.key ? (
                                          sortConfig.direction === 'asc' ? (
                                            <ArrowUpDown className="w-4 h-4 text-blue-600" />
                                          ) : (
                                            <ArrowUpDown className="w-4 h-4 text-blue-600 rotate-180" />
                                          )
                                        ) : (
                                          <ArrowUpDown className="w-4 h-4 text-slate-400 hover:text-slate-600" />
                                        )}
                                      </button>

                                      {canEdit && !snapshot.isDragging &&
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0 hover:bg-blue-100"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingColumnKey(column.key);
                                      setEditingColumnTitle(column.title);
                                    }}
                                    title="ערוך שם (או לחץ על הכותרת)">

                                          <Edit2 className="w-3 h-3 text-slate-500" />
                                        </Button>

                                        <Popover
                                    open={popoverOpen === `header_${column.key}`}
                                    onOpenChange={(open) => {
                                      if (!open) setPopoverOpen(null);
                                    }}>

                                          <PopoverTrigger asChild>
                                            <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-6 w-6 p-0 hover:bg-blue-100"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setPopoverOpen(`header_${column.key}`);
                                        }}
                                        title="תפריט אפשרויות (או Ctrl+Click)">

                                              <Settings className="w-3 h-3 text-slate-500" />
                                            </Button>
                                          </PopoverTrigger>
                                          <PopoverContent
                                      className="w-64 p-2"
                                      align="start"
                                      side="bottom"
                                      dir="rtl"
                                    >
                                            <div className="space-y-2">
                                              <div className="px-2 py-1 border-b border-slate-200">
                                                <h4 className="font-semibold text-sm">{column.title}</h4>
                                                <p className="text-xs text-slate-500 mt-1">אפשרויות עמודה</p>
                                              </div>

                                              <Button
                                          variant="outline"
                                          size="sm"
                                          className="w-full justify-start gap-2"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setEditingColumnKey(column.key);
                                            setEditingColumnTitle(column.title);
                                            setPopoverOpen(null);
                                          }}>

                                                <Edit2 className="w-4 h-4" />
                                                ערוך שם
                                              </Button>

                                              <Popover>
                                                <PopoverTrigger asChild>
                                                  <Button
                                              variant="outline"
                                              size="sm"
                                              className="w-full justify-start gap-2"
                                              onClick={(e) => e.stopPropagation()}>

                                                    <Palette className="w-4 h-4" />
                                                    צבע כותרת
                                                  </Button>
                                                </PopoverTrigger>
                                                <PopoverContent
                                            side="left"
                                            align="start"
                                            className="w-auto p-0"
                                          >
                                                  <ColorPicker
                                              currentStyle={headerStyle}
                                              onApply={(style) => applyHeaderStyle(column.key, style)}
                                              onClose={() => setPopoverOpen(null)} />

                                                </PopoverContent>
                                              </Popover>

                                              <Popover>
                                                <PopoverTrigger asChild>
                                                  <Button
                                              variant="outline"
                                              size="sm"
                                              className="w-full justify-start gap-2"
                                              onClick={(e) => e.stopPropagation()}>

                                                    <Palette className="w-4 h-4" />
                                                    צבע עמודה מלאה
                                                  </Button>
                                                </PopoverTrigger>
                                                <PopoverContent
                                            side="left"
                                            align="start"
                                            className="w-auto p-0"
                                          >
                                                  <ColorPicker
                                              onApply={(style) => applyColumnStyle(column.key, style)}
                                              onClose={() => setPopoverOpen(null)} />

                                                </PopoverContent>
                                              </Popover>

                                              <div className="border-t border-slate-200 my-2"></div>

                                              <Popover>
                                                <PopoverTrigger asChild>
                                                  <Button
                                              variant="outline"
                                              size="sm"
                                              className="w-full justify-start gap-2"
                                              onClick={(e) => e.stopPropagation()}>

                                                    <Merge className="w-4 h-4" />
                                                    מזג לעמודה אחרת
                                                  </Button>
                                                </PopoverTrigger>
                                                <PopoverContent
                                            side="left"
                                            align="start"
                                            className="w-64 p-3"
                                          >
                                                  <div className="space-y-3">
                                                    <h4 className="font-semibold text-sm">מזג לעמודה אחרת</h4>
                                                    <p className="text-xs text-slate-600">
                                                      בחר עמודה למיזוג. הנתונים יאוחדו והעמודה הנוכחית תמחק.
                                                    </p>
                                                    <Select onValueChange={(targetKey) => {
                                                mergeColumns(column.key, targetKey);
                                                setPopoverOpen(null);
                                              }}>
                                                      <SelectTrigger>
                                                        <SelectValue placeholder="בחר עמודת יעד" />
                                                      </SelectTrigger>
                                                      <SelectContent>
                                                        {columns.filter((c) =>
                                                  c.key !== column.key &&
                                                  !c.required &&
                                                  c.key !== 'actions'
                                                  ).map((c) =>
                                                  <SelectItem key={c.key} value={c.key}>
                                                            {c.title}
                                                          </SelectItem>
                                                  )}
                                                      </SelectContent>
                                                    </Select>
                                                  </div>
                                                </PopoverContent>
                                              </Popover>

                                              <Button
                                          variant="outline"
                                          size="sm"
                                          className="w-full justify-start gap-2"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            splitColumn(column.key);
                                          }}>

                                                <Split className="w-4 h-4" />
                                                פצל לשתי עמודות
                                              </Button>

                                              <Button
                                          variant="outline"
                                          size="sm"
                                          className="w-full justify-start gap-2"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            toggleColumnVisibility(column.key);
                                            setPopoverOpen(null);
                                          }}>

                                                {column.visible !== false ?
                                          <>
                                                    <Eye className="w-4 h-4" />
                                                    הסתר עמודה
                                                  </> :

                                          <>
                                                    <Eye className="w-4 h-4" />
                                                    הצג עמודה
                                                  </>
                                          }
                                              </Button>


                                              <div className="border-t border-slate-200 my-2"></div>

                                              <Button
                                          variant="outline"
                                          size="sm"
                                          className="w-full justify-start gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            deleteColumn(column.key);
                                          }}>

                                                <Trash2 className="w-4 h-4" />
                                                מחק עמודה
                                              </Button>
                                            </div>
                                          </PopoverContent>
                                        </Popover>
                                      </div>
                                }
                                    </div>
                                  </div>
                              }
                              </th>
                            }
                          </Draggable>);

                      })}
                      {provided.placeholder}
                    </tr>

                    {showSubHeaders &&
                    <tr>
                        {selectionMode && (
                          <th
                            className="border border-slate-200 p-2 sticky right-0 z-30 shadow-[2px_0_5px_rgba(0,0,0,0.1)] bg-purple-50"
                            style={{
                              width: '50px',
                              minWidth: '50px',
                              maxWidth: '50px'
                            }}
                          />
                        )}
                        {visibleColumns.map((column, colIndex) => {
                        const subHeaderStyle = cellStyles[`subheader_${column.key}`] || {};
                        const isSubHeaderSelected = selectedHeaders.has(`sub_${column.key}`);
                        const canEdit = !column.required && column.key !== 'actions';

                        return (
                          <th
                            key={`sub_${column.key}`}
                            className={`border border-slate-200 p-2 text-right font-normal text-slate-600 text-sm ${
                            colIndex === 0 && !selectionMode ? 'sticky right-0 z-30 shadow-[2px_0_5px_rgba(0,0,0,0.1)]' : ''} ${
                            colIndex === 0 && selectionMode ? 'sticky z-30 shadow-[2px_0_5px_rgba(0,0,0,0.1)]' : ''} ${
                            isSubHeaderSelected ? 'ring-2 ring-purple-500 bg-purple-50' : ''}
                              ${canEdit ? 'hover:bg-purple-50 hover:shadow-inner transition-all cursor-pointer' : ''}`}
                            style={{
                              width: column.width,
                              minWidth: column.width,
                              backgroundColor: isSubHeaderSelected ? '#faf5ff' : subHeaderStyle.backgroundColor || (colIndex === 0 ? '#f8fafc' : '#f8fafc'),
                              opacity: subHeaderStyle.opacity ? subHeaderStyle.opacity / 100 : 1,
                              fontWeight: subHeaderStyle.fontWeight || 'normal',
                              borderColor: isSubHeaderSelected ? '#a855f7' : subHeaderStyle.borderColor || '#e2e8f0',
                              right: selectionMode && colIndex === 0 ? '50px' : colIndex === 0 ? '0' : 'auto'
                            }}
                            onClick={(e) => {
                              if (canEdit && editingSubHeader !== column.key) {
                                if (e.ctrlKey || e.metaKey) {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setPopoverOpen(`subheader_${column.key}`);
                                } else if (e.altKey && e.shiftKey) {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setSelectedHeaders((prev) => {
                                    const newSet = new Set(prev);
                                    const subHeaderSelectionKey = `sub_${column.key}`;
                                    if (newSet.has(subHeaderSelectionKey)) {
                                      newSet.delete(subHeaderSelectionKey);
                                    } else {
                                      newSet.add(subHeaderSelectionKey);
                                    }
                                    return newSet;
                                  });
                                  setSelectionMode(true);
                                } else {
                                  setEditingSubHeader(column.key);
                                  setTempSubHeaderValue(subHeaders[column.key] || '');
                                }
                              }
                            }}
                            onMouseDown={(e) => {
                              if (e.altKey || e.ctrlKey || e.metaKey) {
                                e.preventDefault();
                              }
                            }}>

                              {editingSubHeader === column.key ?
                            <div className="flex items-center gap-2">
                                  <Input
                                value={tempSubHeaderValue}
                                onChange={(e) => setTempSubHeaderValue(e.target.value)}
                                onBlur={() => {
                                  updateSubHeader(column.key, tempSubHeaderValue);
                                  setEditingSubHeader(null);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    updateSubHeader(column.key, tempSubHeaderValue);
                                    setEditingSubHeader(null);
                                  }
                                  if (e.key === 'Escape') {
                                    setEditingSubHeader(null);
                                  }
                                }}
                                className="h-6 flex-1 text-sm"
                                onClick={(e) => e.stopPropagation()}
                                autoFocus />

                                </div> :

                            <div className="flex items-center justify-between group">
                                  <span className="text-xs">{subHeaders[column.key] || 'לחץ לעריכה...'}</span>

                                  {canEdit &&
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-5 w-5 p-0 hover:bg-purple-100"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingSubHeader(column.key);
                                    setTempSubHeaderValue(subHeaders[column.key] || '');
                                  }}
                                  title="ערוך כותרת משנה">

                                        <Edit2 className="w-3 h-3 text-slate-500" />
                                      </Button>

                                      <Popover
                                  open={popoverOpen === `subheader_${column.key}`}
                                  onOpenChange={(open) => {
                                    if (!open) setPopoverOpen(null);
                                  }}>

                                        <PopoverTrigger asChild>
                                          <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-5 w-5 p-0 hover:bg-purple-100"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setPopoverOpen(`subheader_${column.key}`);
                                      }}
                                      title="אפשרויות כותרת משנה">

                                            <Settings className="w-3 h-3 text-slate-500" />
                                          </Button>
                                        </PopoverTrigger>
                                        <PopoverContent
                                    className="w-64 p-2"
                                    align="start"
                                    side="bottom"
                                    dir="rtl"
                                  >
                                          <div className="space-y-2">
                                            <div className="px-2 py-1 border-b border-slate-200">
                                              <h4 className="font-semibold text-sm">כותרת משנה</h4>
                                              <p className="text-xs text-slate-500 mt-1">{column.title}</p>
                                            </div>

                                            <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full justify-start gap-2"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setEditingSubHeader(column.key);
                                          setTempSubHeaderValue(subHeaders[column.key] || '');
                                          setPopoverOpen(null);
                                        }}>

                                              <Edit2 className="w-4 h-4" />
                                              ערוך טקסט
                                            </Button>

                                            <Popover>
                                              <PopoverTrigger asChild>
                                                <Button
                                            variant="outline"
                                            size="sm"
                                            className="w-full justify-start gap-2"
                                            onClick={(e) => e.stopPropagation()}>

                                                  <Palette className="w-4 h-4" />
                                                  צבע וסגנון
                                                </Button>
                                              </PopoverTrigger>
                                              <PopoverContent
                                          side="left"
                                          align="start"
                                          className="w-auto p-0"
                                        >
                                                <ColorPicker
                                            currentStyle={subHeaderStyle}
                                            onApply={(style) => applySubHeaderStyle(column.key, style)}
                                            onClose={() => setPopoverOpen(null)} />

                                              </PopoverContent>
                                            </Popover>

                                            <div className="border-t border-slate-200 my-2"></div>

                                            <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full justify-start gap-2 text-red-600 hover:text-red-700"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          updateSubHeader(column.key, '');
                                          setPopoverOpen(null);
                                          toast.success('כותרת משנה נמחקה');
                                        }}>

                                              <Trash2 className="w-4 h-4" />
                                              מחק כותרת משנה
                                            </Button>
                                          </div>
                                        </PopoverContent>
                                      </Popover>
                                    </div>
                              }
                                </div>
                            }
                            </th>);

                      })}
                      </tr>
                    }
                  </thead>
                  }
              </Droppable>

              <tbody>
                {localClients.map((client, rowIndex) =>
                  <tr key={client.id} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    {selectionMode && (
                      <td
                        className="border border-slate-200 p-2 sticky right-0 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)] bg-purple-50"
                        style={{
                          width: '50px',
                          minWidth: '50px',
                          maxWidth: '50px',
                          backgroundColor: rowIndex % 2 === 0 ? '#faf5ff' : '#f3e8ff'
                        }}
                      >
                        <div className="flex items-center justify-center">
                          <Checkbox
                            checked={selectedRows.has(client.id)}
                            onCheckedChange={() => toggleRowSelection(client.id)}
                            className="cursor-pointer"
                          />
                        </div>
                      </td>
                    )}
                    {visibleColumns.map((column, colIndex) => {
                      const cellKey = `${client.id}_${column.key}`;
                      const isEditing = editingCell === cellKey;
                      const cellStyle = cellStyles[cellKey] || {};
                      const isSelected = selectedCells.has(cellKey);
                      const actualColIndex = selectionMode ? colIndex + 1 : colIndex;

                      if (column.type === 'actions') {
                        return (
                          <td
                            key={column.key}
                            className={`border border-slate-200 p-2 ${
                            actualColIndex === 0 ? 'sticky right-0 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]' : ''}`
                            }
                            style={{
                              width: column.width,
                              minWidth: column.width,
                              maxWidth: column.width,
                              backgroundColor: actualColIndex === 0 ? rowIndex % 2 === 0 ? '#ffffff' : '#f8fafc' : 'inherit',
                              right: selectionMode ? '50px' : '0'
                            }}>

                            <div className="flex items-center gap-1 justify-center">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (typeof onView === 'function') onView(client);
                                }}>

                                <Eye className="w-4 h-4 text-blue-600" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (typeof onEdit === 'function') onEdit(client);
                                }}>

                                <Edit className="w-4 h-4 text-green-600" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (!confirm(`האם למחוק את ${client.name}? פעולה זו אינה הפיכה.`)) return;
                                  try {
                                    await base44.entities.Client.delete(client.id);
                                    toast.success('הלקוח נמחק בהצלחה');
                                    window.location.reload();
                                  } catch (error) {
                                    toast.error('שגיאה במחיקת הלקוח');
                                  }
                                }}>

                                <Trash2 className="w-4 h-4 text-red-600" />
                              </Button>
                            </div>
                          </td>);

                      }

                      let cellValue = '';
                      if (column.key.startsWith('cf:')) {
                        const slug = column.key.slice(3);
                        cellValue = client.custom_data?.[slug] || '';
                      } else if (column.key === 'status' || column.type === 'status' || column.key === 'client_status') {
                        // Always prioritize client_status over status
                        cellValue = client.client_status || '';
                      } else {
                        cellValue = client[column.key] || '';
                      }

                      if (column.key === 'created_date' && cellValue) {
                        try {
                          cellValue = format(new Date(cellValue), 'dd/MM/yyyy', { locale: he });
                        } catch (e) {
                          cellValue = '';
                        }
                      }

                      if (column.type === 'phone' || column.key === 'phone_secondary' || column.key === 'whatsapp') {
                        cellValue = isValidPhone(cellValue) ? cellValue : '';
                      }

                      return (
                        <td
                          key={column.key}
                          className={`border border-slate-200 p-2 ${
                        actualColIndex === 0 && !selectionMode ? 'sticky right-0 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]' : ''} ${
                        actualColIndex === 0 && selectionMode ? 'sticky z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]' : ''} ${

                        column.key !== 'created_date' ? 'cursor-pointer hover:bg-blue-50' : ''} ${

                        isSelected ? 'ring-2 ring-purple-500 bg-purple-50' : ''}`
                        }
                        onClick={(e) => handleCellClick(client.id, column.key, e)}
                        onMouseEnter={(e) => handleCellMouseEnter(client.id, column.key, e)}
                        onMouseDown={(e) => {
                          if (e.altKey) {
                            e.preventDefault();
                          }
                        }}
                        style={{
                          width: column.width,
                          minWidth: column.width,
                          maxWidth: column.width,
                          backgroundColor: isSelected ? '#faf5ff' : actualColIndex === 0 ? rowIndex % 2 === 0 ? '#ffffff' : '#f8fafc' : cellStyle.backgroundColor || 'inherit',
                          opacity: cellStyle.opacity ? cellStyle.opacity / 100 : 1,
                          fontWeight: cellStyle.fontWeight || 'normal',
                          borderColor: isSelected ? '#a855f7' : cellStyle.borderColor || '#e2e8f0',
                          right: selectionMode && actualColIndex === 0 ? '50px' : actualColIndex === 0 ? '0' : 'auto'
                        }}>

                          {column.type === 'stage' ? (
                            <div className="flex items-center justify-center">
                              <StageDisplay 
                                value={cellValue}
                                column={column}
                                isEditing={isEditing}
                                onEdit={(val) => setEditValue(val)}
                                editValue={editValue}
                                onSave={saveEdit}
                                onCancel={() => {
                                  setEditingCell(null);
                                  setEditValue("");
                                }}
                                stageOptions={stageOptions}
                                onDirectSave={async (stageValue) => {
                                  const updatedClient = column.key.startsWith('cf:')
                                    ? {
                                        ...client,
                                        custom_data: {
                                          ...(client.custom_data || {}),
                                          [column.key.slice(3)]: stageValue
                                        }
                                      }
                                    : { ...client, [column.key]: stageValue };

                                  setLocalClients(prev => prev.map(c => c.id === client.id ? updatedClient : c));
                                  setEditingCell(null);
                                  setEditValue("");

                                  const dataToSave = { ...updatedClient };
                                  delete dataToSave.id;
                                  delete dataToSave.created_date;
                                  delete dataToSave.updated_date;
                                  delete dataToSave.created_by;

                                  await base44.entities.Client.update(client.id, dataToSave);
                                  const refreshedClient = await base44.entities.Client.get(client.id);

                                  window.dispatchEvent(new CustomEvent('client:updated', {
                                    detail: refreshedClient
                                  }));

                                  toast.success('✓ שלב עודכן');
                                }}
                              />
                            </div>
                          ) : column.type === 'status' || column.key === 'status' || column.key === 'client_status' ? (
                            <div className="flex items-center justify-center">
                              <StatusDisplay 
                                value={cellValue}
                                isEditing={isEditing}
                                onEdit={(val) => setEditValue(val)}
                                editValue={editValue}
                                onSave={saveEdit}
                                onCancel={() => {
                                  setEditingCell(null);
                                  setEditValue("");
                                }}
                                statusOptions={statusOptions}
                                onDirectSave={async (statusValue) => {
                                  // Determine the correct field name - always use client_status for status type
                                  const fieldName = column.key === 'status' ? 'client_status' : column.key;
                                  
                                  const updatedClient = fieldName.startsWith('cf:')
                                    ? {
                                        ...client,
                                        custom_data: {
                                          ...(client.custom_data || {}),
                                          [fieldName.slice(3)]: statusValue
                                        }
                                      }
                                    : { ...client, [fieldName]: statusValue, client_status: statusValue };

                                  setLocalClients(prev => prev.map(c => c.id === client.id ? updatedClient : c));
                                  setEditingCell(null);
                                  setEditValue("");

                                  try {
                                    // Save with client_status field
                                    await base44.entities.Client.update(client.id, { client_status: statusValue });
                                    const refreshedClient = await base44.entities.Client.get(client.id);

                                    console.log('📢 [SPREADSHEET] Dispatching client:updated for status change:', {
                                      clientId: refreshedClient.id,
                                      clientName: refreshedClient.name,
                                      newStatus: refreshedClient.client_status
                                    });

                                    window.dispatchEvent(new CustomEvent('client:updated', {
                                      detail: refreshedClient
                                    }));

                                    toast.success('✓ סטטוס עודכן');
                                  } catch (error) {
                                    console.error('❌ Error updating status:', error);
                                    toast.error('שגיאה בעדכון סטטוס');
                                  }
                                }}
                              />
                            </div>
                          ) : isEditing ?
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
                            onClick={(e) => e.stopPropagation()} /> :


                          <Popover
                            open={popoverOpen === cellKey}
                            onOpenChange={(open) => {
                              if (!open) setPopoverOpen(null);
                            }}>

                              <PopoverTrigger asChild>
                                <div className="text-sm w-full" dir="rtl">
                                  {column.key === 'name' ? (
                                   <div className="flex items-center gap-2">
                                     <StageIcon 
                                       client={client} 
                                       columns={columns} 
                                       stageOptions={stageOptions} 
                                     />
                                     <span style={{
                                       color: column.type === 'email' || column.type === 'phone' ? '#000000' : 'inherit',
                                       fontWeight: column.type === 'email' || column.type === 'phone' ? '500' : 'normal'
                                     }}>
                                       {String(cellValue)}
                                     </span>
                                   </div>
                                  ) : column.type === 'phone' || column.key === 'phone_secondary' || column.key === 'whatsapp' ?
                                cellValue ?
                                <a
                                  href={`tel:${cellValue}`}
                                  className="hover:underline font-medium block"
                                  style={{ color: '#000000' }}
                                  onClick={(e) => e.stopPropagation()}>

                                        {cellValue}
                                      </a> :

                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCellClick(client.id, column.key, e);
                                  }}
                                  className="flex items-center justify-center w-full text-slate-400 hover:text-blue-600 transition-colors"
                                  title="לחץ להוספת מספר טלפון">

                                        <PhoneIcon className="w-4 h-4" />
                                      </button> :

                                column.type === 'email' && cellValue ?
                                <a
                                  href={`mailto:${cellValue}`}
                                  className="hover:underline font-medium block"
                                  style={{ color: '#000000' }}
                                  onClick={(e) => e.stopPropagation()}>

                                      {cellValue}
                                    </a> :

                                <span style={{
                                  color: column.type === 'email' || column.type === 'phone' ? '#000000' : 'inherit',
                                  fontWeight: column.type === 'email' || column.type === 'phone' ? '500' : 'normal'
                                }}>
                                      {String(cellValue)}
                                    </span>
                                }
                                </div>
                              </PopoverTrigger>
                              <PopoverContent
                              className="w-auto p-2"
                              align="center"
                              side="left"
                              dir="rtl"
                            >
                                <div className="space-y-2">
                                  <Button
                                  variant="outline"
                                  size="sm"
                                  className="w-full justify-start gap-2"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingCell(cellKey);
                                    setEditValue(String(cellValue));
                                    setPopoverOpen(null);
                                    setTimeout(() => editInputRef.current?.focus(), 0);
                                  }}>

                                    <Edit2 className="w-4 h-4" />
                                    ערוך
                                  </Button>

                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <Button
                                      variant="outline"
                                      size="sm"
                                      className="w-full justify-start gap-2"
                                      onClick={(e) => e.stopPropagation()}>

                                        <Palette className="w-4 h-4" />
                                        צבע ועיצוב
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent
                                    side="left"
                                    align="start"
                                    className="w-auto p-0"
                                  >
                                      <ColorPicker
                                      currentStyle={cellStyle}
                                      onApply={(style) => applyCellStyle(cellKey, style)}
                                      onClose={() => setPopoverOpen(null)} />

                                    </PopoverContent>
                                  </Popover>

                                  <Button
                                  variant="outline"
                                  size="sm"
                                  className="w-full justify-start gap-2"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigator.clipboard.writeText(String(cellValue));
                                    toast.success('הועתק ללוח');
                                    setPopoverOpen(null);
                                  }}>

                                    <Copy className="w-4 h-4" />
                                    העתק
                                  </Button>

                                  <Button
                                  variant="outline"
                                  size="sm"
                                  className="w-full justify-start gap-2 text-red-600 hover:text-red-700"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteCell(client.id, column.key);
                                  }}>

                                    <Trash2 className="w-4 h-4" />
                                    מחק תוכן
                                  </Button>
                                </div>
                              </PopoverContent>
                            </Popover>
                          }
                        </td>);

                    })}
                  </tr>
                  )}
              </tbody>
            </table>
          </DragDropContext>
        </div>
      </CardContent>
    </Card>
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="left" className="w-[500px] p-0" dir="rtl">
          <SheetHeader className="p-6 pb-4 border-b bg-gradient-to-r from-slate-50 to-white">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-xl font-bold">ניהול עמודות</SheetTitle>
              <Badge variant="outline" className="text-sm">
                {columns.length} עמודות
              </Badge>
            </div>
          </SheetHeader>

          <ScrollArea className="h-[calc(100vh-180px)]">
            <div className="p-6 space-y-4">
              {showAddInPanel ? (
                <div className="p-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border-2 border-blue-200 space-y-3">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-blue-900">הוספת עמודה חדשה</h3>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => {
                        setShowAddInPanel(false);
                        setNewColumnName("");
                        setNewColumnType("text");
                      }}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Input
                      placeholder="שם העמודה..."
                      value={newColumnName}
                      onChange={(e) => setNewColumnName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') addColumnFromPanel();
                        if (e.key === 'Escape') {
                          setShowAddInPanel(false);
                          setNewColumnName("");
                        }
                      }}
                      className="text-right"
                      autoFocus
                    />

                    <Select value={newColumnType} onValueChange={setNewColumnType}>
                      <SelectTrigger>
                        <SelectValue placeholder="סוג עמודה" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">טקסט</SelectItem>
                        <SelectItem value="number">מספר</SelectItem>
                        <SelectItem value="phone">טלפון</SelectItem>
                        <SelectItem value="email">אימייל</SelectItem>
                        <SelectItem value="date">תאריך</SelectItem>
                        <SelectItem value="stage">🔵 שלבים (מואר)</SelectItem>
                        <SelectItem value="client_status">🟢 סטטוסים (מואר)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={addColumnFromPanel}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 gap-2">
                      <Plus className="w-4 h-4" />
                      הוסף עמודה
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowAddInPanel(false);
                        setNewColumnName("");
                        setNewColumnType("text");
                      }}>
                      ביטול
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  onClick={() => setShowAddInPanel(true)}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 gap-2 shadow-lg">
                  <Plus className="w-5 h-5" />
                  הוסף עמודה חדשה
                </Button>
              )}

              <div className="pt-2">
                <h4 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <Table className="w-4 h-4" />
                  רשימת עמודות
                  <span className="text-xs text-slate-500 font-normal">(גרור לשינוי סדר)</span>
                </h4>

                <DragDropContext onDragEnd={(result) => {
                  if (!result.destination) return;
                  
                  const sourceIndex = result.source.index;
                  const destIndex = result.destination.index;
                  
                  const sourceColumn = columns[sourceIndex];
                  if (sourceColumn.required || sourceColumn.key === 'actions') {
                    toast.error('לא ניתן לגרור עמודה זו');
                    return;
                  }
                  
                  const newColumns = Array.from(columns);
                  const [removed] = newColumns.splice(sourceIndex, 1);
                  newColumns.splice(destIndex, 0, removed);
                  
                  setColumns(newColumns);
                  toast.success('סדר העמודות עודכן');
                }}>
                  <Droppable droppableId="columns-panel">
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className="space-y-2"
                      >
                        {columns.map((col, index) => (
                          <Draggable
                            key={col.key}
                            draggableId={col.key}
                            index={index}
                            isDragDisabled={col.required || col.key === 'actions'}
                          >
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`group p-4 border-2 rounded-xl hover:border-blue-300 hover:shadow-md transition-all bg-white ${
                                  snapshot.isDragging ? 'shadow-2xl opacity-80 rotate-2 scale-105' : ''
                                }`}
                                style={{
                                  ...provided.draggableProps.style
                                }}
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <Switch
                                      checked={col.visible !== false}
                                      onCheckedChange={() => toggleColumnVisibility(col.key)}
                                      disabled={col.required || col.key === 'actions'}
                                    />

                                    <div className="flex-1 min-w-0">
                                      {editingInPanel === col.key ? (
                                        <div className="flex items-center gap-2">
                                          <Input
                                            value={editingPanelTitle}
                                            onChange={(e) => setEditingPanelTitle(e.target.value)}
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter') saveColumnTitleInPanel(col.key);
                                              if (e.key === 'Escape') {
                                                setEditingInPanel(null);
                                                setEditingPanelTitle("");
                                              }
                                            }}
                                            onBlur={() => saveColumnTitleInPanel(col.key)}
                                            className="h-8 text-sm"
                                            autoFocus
                                          />
                                        </div>
                                      ) : (
                                        <>
                                          <div className="font-semibold text-slate-900 truncate flex items-center gap-2">
                                            {col.title}
                                            {cellStyles[`header_${col.key}`]?.backgroundColor && (
                                              <div 
                                                className="w-3 h-3 rounded-full border"
                                                style={{ 
                                                  backgroundColor: cellStyles[`header_${col.key}`].backgroundColor,
                                                  borderColor: cellStyles[`header_${col.key}`].borderColor || '#e2e8f0'
                                                }}
                                                title="צבע כותרת"
                                              />
                                            )}
                                          </div>
                                          <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                                            <span className="truncate">{col.key}</span>
                                            {col.required && (
                                              <Badge variant="outline" className="text-xs bg-blue-50 border-blue-200">
                                                חובה
                                              </Badge>
                                            )}
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  </div>

                                  {!col.required && col.key !== 'actions' && (
                                    <div className="flex items-center gap-1 transition-opacity">
                                      <Popover>
                                        <PopoverTrigger asChild>
                                          <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-8 w-8 hover:bg-purple-100"
                                            title="צבע כותרת">
                                            <Palette className="w-4 h-4 text-purple-600" />
                                          </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" side="left" align="start">
                                          <ColorPicker
                                            currentStyle={cellStyles[`header_${col.key}`] || {}}
                                            onApply={(style) => applyHeaderStyle(col.key, style)}
                                            onClose={() => {}}
                                          />
                                        </PopoverContent>
                                      </Popover>

                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-8 w-8 hover:bg-blue-100"
                                        onClick={() => {
                                          setEditingInPanel(col.key);
                                          setEditingPanelTitle(col.title);
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
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              </div>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {showHistory &&
      <Sheet open={showHistory} onOpenChange={setShowHistory}>
          <SheetContent side="left" className="w-[450px] p-0" dir="rtl">
            <SheetHeader className="p-6 pb-4 border-b">
              <SheetTitle>היסטוריית שינויים</SheetTitle>
            </SheetHeader>
            <div className="p-6 text-sm text-slate-600">
              <p>כאן תוצג היסטוריית השינויים שבוצעו בטבלה. פיתוח בתהליך...</p>
            </div>
          </SheetContent>
        </Sheet>
      }

      <StageOptionsManager
        open={showStageManager}
        onClose={() => setShowStageManager(false)}
        stageOptions={stageOptions}
        onSave={handleSaveStageOptions}
      />

      <StatusOptionsManager
        open={showStatusManager}
        onClose={() => setShowStatusManager(false)}
        statusOptions={statusOptions}
        onSave={handleSaveStatusOptions}
      />

      <UserPreferencesDialog
        open={showUserPreferences}
        onClose={() => setShowUserPreferences(false)}
        tableName="clients"
      />

    </div>);

}

function KeyboardShortcut({ keys, description }) {
  return (
    <div className="flex items-center gap-2">
      <kbd className="px-2 py-1 bg-white border border-slate-300 rounded text-xs font-mono shadow-sm">
        {keys}
      </kbd>
      <span className="text-slate-600 text-xs">{description}</span>
    </div>);

}