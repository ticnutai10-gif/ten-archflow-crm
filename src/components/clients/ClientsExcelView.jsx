import React, { useState, useEffect, useCallback, useRef } from "react";
import GenericSpreadsheet from "@/components/spreadsheets/GenericSpreadsheet";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function ClientsExcelView({ clients, onRefresh }) {
  const [virtualSpreadsheet, setVirtualSpreadsheet] = useState(null);
  const [loading, setLoading] = useState(true);
  const prevClientsRef = useRef([]);

  useEffect(() => {
    initSpreadsheet();
  }, [clients]);

  const initSpreadsheet = () => {
    setLoading(true);
    
    // Define columns based on Client entity
    const columns = [
      { key: 'name', title: 'שם לקוח', width: '200px', type: 'text', visible: true },
      { key: 'status', title: 'סטטוס', width: '120px', type: 'select', visible: true, options: ['פוטנציאלי', 'פעיל', 'לא פעיל'] },
      { key: 'stage', title: 'שלב', width: '150px', type: 'stage', visible: true },
      { key: 'phone', title: 'טלפון', width: '150px', type: 'text', visible: true },
      { key: 'email', title: 'אימייל', width: '200px', type: 'text', visible: true },
      { key: 'company', title: 'חברה', width: '150px', type: 'text', visible: true },
      { key: 'address', title: 'כתובת', width: '200px', type: 'text', visible: true },
      { key: 'source', title: 'מקור הגעה', width: '120px', type: 'select', visible: true, options: ['הפניה', 'אתר אינטרנט', 'מדיה חברתית', 'פרסומת', 'אחר'] },
      { key: 'budget_range', title: 'תקציב', width: '150px', type: 'select', visible: true, options: ['עד 500K', '500K-1M', '1M-2M', '2M-5M', 'מעל 5M'] },
      { key: 'notes', title: 'הערות', width: '300px', type: 'long_text', visible: true }
    ];

    // Map clients to rows
    const rows = clients.map(client => ({
      id: client.id,
      ...client
    }));

    // Create virtual spreadsheet object
    setVirtualSpreadsheet({
      id: 'virtual_clients_sheet',
      name: 'טבלת לקוחות (Excel View)',
      columns: columns,
      rows_data: rows,
      // Load saved preferences if available (mocked for now, could be loaded from UserPreferences)
      cell_styles: {}, 
      cell_notes: {},
      freeze_settings: { freeze_rows: 0, freeze_columns: 1 },
      theme_settings: {
        palette: "default",
        density: "comfortable"
      }
    });
    
    prevClientsRef.current = clients;
    setLoading(false);
  };

  const handleSave = useCallback(async (data) => {
    // Detect changes and update clients
    const newRows = data.rows_data;
    const oldRows = prevClientsRef.current;
    
    const updates = [];
    
    // Simple diff
    newRows.forEach(newRow => {
      const oldRow = oldRows.find(r => r.id === newRow.id);
      if (oldRow) {
        // Check for changed fields
        const changes = {};
        let hasChanges = false;
        
        ['name', 'status', 'stage', 'phone', 'email', 'company', 'address', 'source', 'budget_range', 'notes'].forEach(key => {
          if (String(newRow[key] || '') !== String(oldRow[key] || '')) {
            changes[key] = newRow[key];
            hasChanges = true;
          }
        });
        
        if (hasChanges) {
          updates.push({ id: newRow.id, ...changes });
        }
      } else {
        // New row (created in spreadsheet)
        // Currently GenericSpreadsheet adds rows with temp IDs "row_..."
        if (newRow.id.startsWith('row_')) {
           // This is a new client creation
           updates.push({ isNew: true, ...newRow });
        }
      }
    });

    if (updates.length === 0) return;

    try {
      await Promise.all(updates.map(async (update) => {
        if (update.isNew) {
          const { isNew, id, ...clientData } = update;
          // Create new client
          await base44.entities.Client.create(clientData);
        } else {
          const { id, ...changes } = update;
          await base44.entities.Client.update(id, changes);
        }
      }));
      
      toast.success(`✓ ${updates.length} רשומות עודכנו`);
      if (onRefresh) onRefresh();
      
    } catch (error) {
      console.error('Error saving clients from spreadsheet:', error);
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