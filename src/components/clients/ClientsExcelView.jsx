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
  const [globalDataTypes, setGlobalDataTypes] = useState([]);
  const prevClientsRef = useRef([]);
  const savedPrefsRef = useRef(null);
  const currentUserRef = useRef(null);

  // Load user prefs and global data types ONCE on mount
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Load user
        const user = await base44.auth.me();
        currentUserRef.current = user;
        
        // Load user preferences
        const prefs = await base44.entities.UserPreferences.filter({ user_email: user.email });
        if (prefs && prefs.length > 0) {
          savedPrefsRef.current = prefs[0];
        }

        // Load global data types to identify professional columns
        const types = await base44.entities.GlobalDataType.list();
        setGlobalDataTypes(types);

      } catch (e) {
        console.error("Failed to load initial data", e);
      } finally {
        setPrefsLoaded(true);
      }
    };
    loadInitialData();
  }, []);

  // Init spreadsheet only after prefs are loaded
  useEffect(() => {
    if (prefsLoaded && clients) {
      initSpreadsheet();
    }
  }, [clients, prefsLoaded]);

  // Helper function to check if a column is a "professional" type column
  const isProfessionalColumn = useCallback((column) => {
    if (!column) return false;
    
    // Check by type key
    if (column.type?.startsWith('custom_')) {
      const matchingType = globalDataTypes.find(t => t.type_key === column.type);
      if (matchingType?.is_professional_type) return true;
    }
    
    // Check by title keywords
    const professionalKeywords = ['קונסטרוקטור', 'יועץ', 'מודד', 'בעל מקצוע', 'קבלן', 'אדריכל', 'מהנדס'];
    const titleLower = (column.title || '').toLowerCase();
    return professionalKeywords.some(keyword => titleLower.includes(keyword));
  }, [globalDataTypes]);

  // Helper function to get the type_key for a professional column
  const getProfessionalTypeKey = useCallback((column) => {
    if (column.type?.startsWith('custom_')) {
      return column.type;
    }
    // Try to match by name
    const matchingType = globalDataTypes.find(t => 
      t.name?.toLowerCase().trim() === column.title?.toLowerCase().trim()
    );
    return matchingType?.type_key || null;
  }, [globalDataTypes]);

  const initSpreadsheet = () => {
    setLoading(true);
    
    const savedExcelPrefs = savedPrefsRef.current?.spreadsheet_columns?.clients_excel;
    
    let finalColumns;
    
    if (savedExcelPrefs?.columns && savedExcelPrefs.columns.length > 0) {
      finalColumns = savedExcelPrefs.columns;
    } else {
      finalColumns = DEFAULT_BASE_COLUMNS;
    }

    // Map clients to rows with professional data mapping
    const rows = clients.map(client => {
      const row = {
        id: client.id,
        ...client
      };
      
      // CRITICAL: Map professionals data back to custom columns
      const clientProfessionals = client.professionals || {};
      
      finalColumns.forEach(col => {
        if (isProfessionalColumn(col)) {
          const typeKey = getProfessionalTypeKey(col);
          
          // Try to get value from professionals object first
          if (typeKey && clientProfessionals[typeKey]) {
            row[col.key] = clientProfessionals[typeKey];
            console.log(`📍 [INIT] Mapped professional "${typeKey}" value "${clientProfessionals[typeKey]}" to column "${col.title}"`);
          }
          // Fallback to constructor_name for backward compatibility
          else if (client.constructor_name && !row[col.key]) {
            const colTitle = (col.title || '').toLowerCase();
            if (colTitle.includes('קונסטרוקטור')) {
              row[col.key] = client.constructor_name;
              console.log(`📍 [INIT] Mapped constructor_name "${client.constructor_name}" to column "${col.title}" (backward compat)`);
            }
          }
        }
      });
      
      return row;
    });

    console.log('🔄 [INIT] Loaded clients with professionals mapping');

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
    
    prevClientsRef.current = rows;
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
    const columnsToCheck = data.columns || [];
    
    const updates = [];
    
    newRows.forEach(newRow => {
      const oldRow = oldRows.find(r => r.id === newRow.id);
      if (oldRow) {
        const changes = {};
        let hasChanges = false;
        
        // Check standard client fields
        ['name', 'status', 'stage', 'phone', 'email', 'company', 'address', 'source', 'budget_range', 'notes'].forEach(key => {
          if (String(newRow[key] || '') !== String(oldRow[key] || '')) {
            changes[key] = newRow[key];
            hasChanges = true;
            console.log(`🔍 [CHANGE DETECTED] ${key}: "${oldRow[key]}" -> "${newRow[key]}"`);
          }
        });
        
        // Check professional columns and build professionals object
        const professionalsUpdate = { ...(oldRow.professionals || {}) };
        let professionalsChanged = false;
        
        columnsToCheck.forEach(col => {
          if (isProfessionalColumn(col)) {
            const newVal = newRow[col.key];
            const oldVal = oldRow[col.key];
            
            if (String(newVal || '') !== String(oldVal || '')) {
              const typeKey = getProfessionalTypeKey(col);
              
              if (typeKey) {
                professionalsUpdate[typeKey] = newVal || '';
                professionalsChanged = true;
                console.log(`🔍 [PROFESSIONAL CHANGE] ${col.title} (${typeKey}): "${oldVal}" -> "${newVal}"`);
              }
              
              // Also update constructor_name for backward compatibility if it's a קונסטרוקטור column
              const colTitle = (col.title || '').toLowerCase();
              if (colTitle.includes('קונסטרוקטור')) {
                changes.constructor_name = newVal;
                hasChanges = true;
              }
            }
          }
        });
        
        if (professionalsChanged) {
          changes.professionals = professionalsUpdate;
          hasChanges = true;
        }
        
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
      
      prevClientsRef.current = newRows;
      
      if (onRefresh) onRefresh();
      
    } catch (error) {
      console.error('💾 [EXCEL VIEW SAVE] ERROR:', error);
      toast.error('שגיאה בשמירת שינויים');
    }
  }, [onRefresh, isProfessionalColumn, getProfessionalTypeKey]);

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