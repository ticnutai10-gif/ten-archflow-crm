import React, { useState, useEffect, useCallback, useRef } from "react";
import GenericSpreadsheet from "@/components/spreadsheets/GenericSpreadsheet";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

// Default base columns - used only when NO saved preferences exist
const DEFAULT_BASE_COLUMNS = [
  { key: 'name', title: 'שם לקוח', width: '200px', type: 'text', visible: true },
  { key: 'status', title: 'סטטוס', width: '120px', type: 'select', visible: true, options: ['פוטנציאלי', 'פעיל', 'לא פעיל'] },
  { key: 'stage', title: 'שלב', width: '150px', type: 'stage', visible: true },
  { key: 'phone', title: 'טלפון', width: '150px', type: 'text', visible: true },
  { key: 'email', title: 'אימייל', width: '200px', type: 'text', visible: true },
  { key: 'address', title: 'כתובת', width: '200px', type: 'text', visible: true },
  { key: 'notes', title: 'הערות', width: '300px', type: 'long_text', visible: true }
];

export default function ClientsExcelView({ clients, onRefresh }) {
  const [virtualSpreadsheet, setVirtualSpreadsheet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const prevClientsRef = useRef([]);
  const savedPrefsRef = useRef(null);
  const currentUserRef = useRef(null);

  // Load user prefs ONCE on mount
  useEffect(() => {
    const loadPrefs = async () => {
      try {
        const user = await base44.auth.me();
        currentUserRef.current = user;
        
        const prefs = await base44.entities.UserPreferences.filter({ user_email: user.email });
        if (prefs && prefs.length > 0) {
          savedPrefsRef.current = prefs[0];
        }
      } catch (e) {
        console.error("Failed to load prefs", e);
      } finally {
        setPrefsLoaded(true);
      }
    };
    loadPrefs();
  }, []);

  // Init spreadsheet only after prefs are loaded
  useEffect(() => {
    if (prefsLoaded && clients) {
      initSpreadsheet();
    }
  }, [clients, prefsLoaded]);

  const initSpreadsheet = () => {
    setLoading(true);
    
    const savedExcelPrefs = savedPrefsRef.current?.spreadsheet_columns?.clients_excel;
    
    // CRITICAL: If user has saved columns, use ONLY those (respecting their visibility settings)
    // If no saved prefs, use default columns
    let finalColumns;
    
    if (savedExcelPrefs?.columns && savedExcelPrefs.columns.length > 0) {
      // Use saved columns EXACTLY as saved - do NOT merge with defaults
      // This ensures deleted/hidden columns stay that way
      finalColumns = savedExcelPrefs.columns;
    } else {
      // First time user - use defaults
      finalColumns = DEFAULT_BASE_COLUMNS;
    }

    // Map clients to rows - CRITICAL: Map custom column values from constructor_name
    const rows = clients.map(client => {
      const row = {
        id: client.id,
        ...client
      };
      
      // CRITICAL: Map constructor_name back to custom columns
      // Find columns that are custom data types (e.g., קונסטרוקטור)
      if (client.constructor_name) {
        finalColumns.forEach(col => {
          // Check if this column is a custom data type column (type starts with custom_ or title matches)
          const isCustomTypeCol = col.type?.startsWith('custom_') || 
                                  col.title?.includes('קונסטרוקטור') ||
                                  col.title?.includes('בעל מקצוע');
          if (isCustomTypeCol && !row[col.key]) {
            row[col.key] = client.constructor_name;
            console.log(`📍 [INIT] Mapped constructor_name "${client.constructor_name}" to column "${col.title}" (${col.key})`);
          }
        });
      }
      
      return row;
    });

    console.log('🔄 [INIT] Loaded clients with constructor_name:', rows.filter(r => r.constructor_name).map(r => ({ name: r.name, constructor_name: r.constructor_name })));

    // Create virtual spreadsheet object
    setVirtualSpreadsheet({
      id: 'virtual_clients_sheet',
      name: 'טבלת לקוחות',
      columns: finalColumns,
      rows_data: rows,
      saved_views: savedExcelPrefs?.saved_views || [],
      active_view_id: savedExcelPrefs?.active_view_id || null,
      cell_styles: savedExcelPrefs?.cell_styles || {}, 
      cell_notes: {},
      freeze_settings: savedExcelPrefs?.freeze_settings || { freeze_rows: 0, freeze_columns: 1 },
      theme_settings: savedExcelPrefs?.theme_settings || {
        palette: "default",
        density: "comfortable"
      }
    });
    
    prevClientsRef.current = rows; // CRITICAL: Use mapped rows, not original clients
    setLoading(false);
  };

  const handleSave = useCallback(async (data) => {
    console.log('💾 [EXCEL VIEW SAVE] START', { rowCount: data.rows_data.length });
    
    const currentUser = currentUserRef.current;
    
    // 1. Save Column & View Preferences
    if (currentUser) {
      try {
        const prefsData = {
          columns: data.columns.map(c => ({ 
            key: c.key, 
            title: c.title, 
            width: c.width, 
            visible: c.visible, 
            type: c.type, 
            options: c.options 
          })),
          saved_views: data.saved_views || [],
          active_view_id: data.active_view_id || null,
          cell_styles: data.cell_styles || {},
          freeze_settings: data.freeze_settings,
          theme_settings: data.theme_settings
        };

        const existingPrefs = await base44.entities.UserPreferences.filter({ user_email: currentUser.email });
        
        if (existingPrefs && existingPrefs.length > 0) {
          const currentCols = existingPrefs[0].spreadsheet_columns || {};
          await base44.entities.UserPreferences.update(existingPrefs[0].id, {
            spreadsheet_columns: {
              ...currentCols,
              clients_excel: prefsData
            }
          });
        } else {
          await base44.entities.UserPreferences.create({
            user_email: currentUser.email,
            spreadsheet_columns: {
              clients_excel: prefsData
            }
          });
        }
        
        savedPrefsRef.current = {
          ...savedPrefsRef.current,
          spreadsheet_columns: {
            ...(savedPrefsRef.current?.spreadsheet_columns || {}),
            clients_excel: prefsData
          }
        };
      } catch (e) {
        console.error("Failed to save view preferences", e);
        toast.error('שגיאה בשמירת הגדרות תצוגה');
      }
    }

    // 2. Detect changes and update clients
    const newRows = data.rows_data;
    const oldRows = prevClientsRef.current;
    
    const updates = [];
    
    newRows.forEach(newRow => {
      const oldRow = oldRows.find(r => r.id === newRow.id);
      if (oldRow) {
        const changes = {};
        let hasChanges = false;
        
        // CRITICAL: Check ALL client fields including constructor_name
        ['name', 'status', 'stage', 'phone', 'email', 'company', 'address', 'source', 'budget_range', 'notes', 'constructor_name'].forEach(key => {
          if (String(newRow[key] || '') !== String(oldRow[key] || '')) {
            changes[key] = newRow[key];
            hasChanges = true;
            console.log(`🔍 [CHANGE DETECTED] ${key}: "${oldRow[key]}" -> "${newRow[key]}"`);
          }
        });
        
        if (hasChanges) {
          updates.push({ id: newRow.id, ...changes });
        }
      } else {
        if (newRow.id.startsWith('row_')) {
           updates.push({ isNew: true, ...newRow });
        }
      }
    });

    if (updates.length === 0) {
      console.log('💾 [EXCEL VIEW SAVE] No changes detected');
      return;
    }

    console.log('💾 [EXCEL VIEW SAVE] Updating', updates.length, 'clients:', updates);
    
    try {
      await Promise.all(updates.map(async (update) => {
        if (update.isNew) {
          const { isNew, id, ...clientData } = update;
          await base44.entities.Client.create(clientData);
        } else {
          const { id, ...changes } = update;
          await base44.entities.Client.update(id, changes);
        }
      }));
      
      console.log('💾 [EXCEL VIEW SAVE] COMPLETE');
      toast.success(`✓ ${updates.length} רשומות עודכנו`);
      
      // CRITICAL: Update prevClientsRef with the NEW data (not old clients)
      prevClientsRef.current = newRows;
      
      if (onRefresh) onRefresh();
      
    } catch (error) {
      console.error('💾 [EXCEL VIEW SAVE] ERROR:', error);
      toast.error('שגיאה בשמירת שינויים');
    }
  }, [onRefresh]);

  if (loading || !virtualSpreadsheet) return <div className="p-12 text-center text-slate-500">טוען נתונים...</div>;

  return (
    <div className="h-full bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden flex flex-col">
      <GenericSpreadsheet
        spreadsheet={virtualSpreadsheet}
        customSaveHandler={handleSave}
        fullScreenMode={true}
      />
    </div>
  );
}