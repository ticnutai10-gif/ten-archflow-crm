import React, { memo, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Draggable } from '@hello-pangea/dnd';
import { Copy, Trash2, Palette, Bold, MessageSquare, GripVertical, Users, MoreHorizontal, Eye } from "lucide-react";
import { StageDisplay } from "./GenericSpreadsheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const SpreadsheetRow = memo(({
  row,
  rowIndex,
  visibleColumns,
  rowHeight,
  density, // 'compact', 'comfortable', 'spacious'
  palette,
  cellFont,
  cellFontSize,
  cellPadding,
  borderColor,
  isSeparateBorders,
  borderStyle,
  tableBorderRadius,
  freezeSettings,
  stickyColumnOffsets,
  stickyRowOffsets,
  editingCell,
  selectedCells,
  showClientPicker,
  activeCollaborators,
  currentUser,
  cellStyles,
  cellNotes,
  cellMetadata,
  commentCounts,
  mergedCells,
  customStageOptions,
  globalDataTypes,
  allClients,
  editValue,
  getConditionalStyle,
  getStageLabel,
  getMergeInfo,
  isClientColumn,
  getAutoCompleteSuggestions,
  onCellClick,
  onCellDoubleClick,
  onCellContextMenu,
  onCellMouseDown,
  onCellMouseEnter,
  onCheckmarkClick,
  onClientPickerToggle,
  onNoteTriangleClick,
  onDuplicateRow,
  onDeleteRow,
  onRowResizeStart,
  setEditingCell,
  setEditValue,
  saveEdit,
  editInputRef,
  validateCell,
  onDirectSaveStage
}) => {
  const [customFieldsDialog, setCustomFieldsDialog] = useState(null);
  const [tempFields, setTempFields] = useState({});

  // 1. Calculate Auto-Color for Row
  let rowAutoStyle = {};
  
  visibleColumns.forEach(col => {
    if ((['stage', 'taba', 'transfer_rights', 'purchase_rights'].includes(col.type) || (globalDataTypes && globalDataTypes[col.type]))) {
      const cellKey = `${row.id}_${col.key}`;
      const val = row[col.key];
      const meta = cellMetadata?.[cellKey] || {};
      
      let options = [];
      if (col.type === 'stage') options = globalDataTypes?.['stages'] || customStageOptions;
      else options = globalDataTypes?.[col.type] || [];
      
      const flatOptions = (options || []).flatMap(g => [g, ...(g.children || [])]);
      const option = flatOptions.find(o => o.value === val);
      
      if (option && option.auto_color) {
        option.auto_color.forEach(rule => {
          if (rule.color_target === 'row') {
            const fieldVal = meta[rule.condition_field];
            let match = false;
            
            // Basic comparison
            if (rule.operator === 'equals') match = fieldVal == rule.value;
            if (rule.operator === 'not_equals') match = fieldVal != rule.value;
            if (rule.operator === 'contains') match = String(fieldVal || '').includes(rule.value);
            if (rule.operator === 'greater_than') match = Number(fieldVal) > Number(rule.value) || new Date(fieldVal) > new Date(rule.value);
            if (rule.operator === 'less_than') match = Number(fieldVal) < Number(rule.value) || new Date(fieldVal) < new Date(rule.value);
            
            if (match) {
              rowAutoStyle = { backgroundColor: `${rule.color}30` }; // 30% opacity
            }
          }
        });
      }
    }
  });

  const handleStageSelect = (val, colKey) => {
    // Check if new stage requires fields
    const column = visibleColumns.find(c => c.key === colKey);
    let options = [];
    if (column.type === 'stage') options = globalDataTypes?.['stages'] || customStageOptions;
    else options = globalDataTypes?.[column.type] || [];
    
    const flatOptions = (options || []).flatMap(g => [g, ...(g.children || [])]);
    const option = flatOptions.find(o => o.value === val);
    
    if (option && option.fields && option.fields.length > 0) {
      setTempFields({});
      setCustomFieldsDialog({
        option,
        val,
        colKey,
        currentMeta: cellMetadata?.[`${row.id}_${colKey}`] || {}
      });
    } else {
      onDirectSaveStage(val, colKey);
    }
  };

  const saveCustomFields = () => {
    const { val, colKey } = customFieldsDialog;
    onDirectSaveStage(val, colKey, tempFields);
    setCustomFieldsDialog(null);
  };

  return (
    <>
      <Draggable draggableId={row.id} index={rowIndex}>
        {(provided, snapshot) => (
          <tr 
            ref={provided.innerRef} 
            {...provided.draggableProps} 
            className={`group transition-all duration-200 ease-out hover:brightness-95 hover:shadow-sm ${snapshot.isDragging ? 'opacity-95 shadow-2xl bg-white scale-[1.01] z-[100] ring-2 ring-blue-500/20' : ''}`}
            style={{ 
              height: `${rowHeight}px`, 
              backgroundColor: rowAutoStyle.backgroundColor || (rowIndex % 2 === 0 ? palette.cellBg : palette.cellAltBg),
              contentVisibility: 'auto'
            }}
          >
            {/* Row Handle */}
            <td 
              {...provided.dragHandleProps} 
              className="p-0 relative border-b border-slate-100 group-hover:bg-slate-50 transition-colors"
              style={{ 
                height: `${rowHeight}px`, 
                zIndex: 15, 
                backgroundColor: palette.headerBg, 
                borderWidth: isSeparateBorders ? '0' : borderStyle.width, 
                borderStyle: borderStyle.style, 
                borderColor: borderColor || palette.border,
                position: 'sticky',
                right: 0,
                width: '48px',
                minWidth: '48px'
              }}
            >
              <div className="w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-[10px] text-slate-400 font-mono absolute top-1 right-1">{rowIndex + 1}</span>
                <GripVertical className="w-3 h-3 text-slate-400" />
              </div>
              <div 
                onMouseDown={(e) => onRowResizeStart(e, row.id)} 
                className="absolute left-0 right-0 bottom-0 cursor-row-resize h-[6px] hover:bg-blue-400/50 z-20 transition-colors" 
              />
            </td>

            {visibleColumns.map((column, colIndex) => {
              const cellKey = `${row.id}_${column.key}`;
              const mergeInfo = getMergeInfo(cellKey);
              if (mergeInfo && !mergeInfo.isMaster) return null;
              
              const isEditing = editingCell === cellKey;
              const activeUserOnCell = activeCollaborators.find(u => u.focus_cell === cellKey && u.user_email !== currentUser?.email);
              const isSelected = selectedCells.has(cellKey);
              const isClientPicker = showClientPicker === cellKey;
              const cellValue = row[column.key] || '';
              const cellStyle = cellStyles[cellKey] || {};
              const conditionalStyle = getConditionalStyle(column.key, cellValue);
              const finalStyle = { ...conditionalStyle, ...cellStyle };
              const hasNote = cellNotes[cellKey];
              const commentCount = commentCounts?.[cellKey] || 0;
              const selectionClass = isSelected ? 'ring-[2px] ring-blue-600 ring-inset z-20 bg-blue-50/30' : 'border-b border-r border-slate-200/50';
              const hoverClass = !isEditing && !isSelected && !mergeInfo ? 'group-hover:bg-black/[0.015] hover:!bg-black/[0.03] transition-colors duration-100' : '';

              // Collapsed state logic
              if (column.collapsed) {
                return (
                  <td
                    key={column.key}
                    className={`relative px-1 py-1 bg-slate-50 border-r border-slate-200`}
                    style={{
                      width: '40px',
                      maxWidth: '40px',
                      minWidth: '40px',
                      overflow: 'hidden',
                      height: `${rowHeight}px`,
                      borderBottomWidth: '1px',
                      borderBottomColor: borderColor || palette.border,
                    }}
                  >
                    {/* Optionally show a dot or color indicator if cell has value */}
                    {cellValue && <div className="w-1.5 h-1.5 rounded-full bg-slate-300 mx-auto" />}
                  </td>
                );
              }

              return (
                <td 
                  key={column.key}
                  rowSpan={mergeInfo?.rowspan || 1}
                  colSpan={mergeInfo?.colspan || 1}
                  className={`relative outline-none focus:outline-none ${selectionClass} ${hoverClass} ${isClientPicker ? 'ring-2 ring-blue-500 z-30 shadow-lg' : ''} ${mergeInfo ? 'bg-white shadow-sm' : ''} overflow-hidden`}
                  style={{
                    ...((activeUserOnCell) ? { borderColor: activeUserOnCell.color } : {}),
                    backgroundColor: isSelected ? `${palette.selected}40` : (
                      (column.type === 'checkmark' || column.type === 'mixed_check') && cellValue === '✓' ? '#f0fdf4' : 
                      (column.type === 'checkmark' || column.type === 'mixed_check') && cellValue === '✗' ? '#fef2f2' :
                      finalStyle.backgroundColor || 'transparent'
                    ),
                    color: finalStyle.color || palette.cellText,
                    opacity: finalStyle.opacity ? finalStyle.opacity / 100 : 1,
                    fontWeight: finalStyle.fontWeight || 'normal',
                    fontFamily: cellFont.value,
                    fontSize: cellFontSize,
                    padding: cellPadding,
                    height: `${rowHeight}px`,
                    position: (colIndex < freezeSettings.freeze_columns || rowIndex < freezeSettings.freeze_rows) ? 'sticky' : 'relative',
                    right: colIndex < freezeSettings.freeze_columns ? `${stickyColumnOffsets[colIndex]}px` : 'auto',
                    top: rowIndex < freezeSettings.freeze_rows ? `${stickyRowOffsets[rowIndex]}px` : 'auto',
                    zIndex: (colIndex < freezeSettings.freeze_columns && rowIndex < freezeSettings.freeze_rows) ? 20 : (colIndex < freezeSettings.freeze_columns) ? 10 : (rowIndex < freezeSettings.freeze_rows) ? 10 : 1,
                    boxShadow: colIndex === freezeSettings.freeze_columns - 1 ? '-4px 0 8px -2px rgba(0,0,0,0.05)' : rowIndex === freezeSettings.freeze_rows - 1 ? '0 4px 8px -2px rgba(0,0,0,0.05)' : 'none',
                    borderWidth: isSeparateBorders ? '0' : '0 0 1px 1px',
                    borderStyle: 'solid',
                    borderColor: isSelected ? 'transparent' : (borderColor || `${palette.border}40`),
                    borderRadius: isSeparateBorders ? tableBorderRadius : '0'
                  }} 
                  onClick={(e) => !isEditing && (column.type === 'checkmark' ? onCheckmarkClick(row.id, column.key, e) : onCellClick(row.id, column.key, e))} 
                  onDoubleClick={(e) => onCellDoubleClick(row.id, column.key, e)}
                  onContextMenu={(e) => onCellContextMenu(row.id, column.key, e)}
                  onMouseDown={(e) => !isEditing && onCellMouseDown(row.id, column.key, e)} 
                  onMouseEnter={() => onCellMouseEnter(row.id, column.key)}
                >
                  {hasNote && <div className="absolute top-0 right-0 w-0 h-0 z-10 cursor-pointer hover:scale-110 transition-transform" style={{ borderTop: '8px solid #f59e0b', borderLeft: '8px solid transparent' }} title={cellNotes[cellKey]} onClick={(e) => onNoteTriangleClick(cellKey, e)} />}
                  {commentCount > 0 && <div className="absolute top-0 left-0 z-10 cursor-pointer hover:scale-110 transition-transform" title={`${commentCount} תגובות`}><div className="bg-blue-500 text-white text-[8px] font-bold px-1 rounded-br-md shadow-sm">{commentCount}</div></div>}
                  {activeUserOnCell && <div className="absolute -top-4 right-0 z-30 text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-white shadow-md whitespace-nowrap opacity-90" style={{ backgroundColor: activeUserOnCell.color }}>{activeUserOnCell.user_name}</div>}

                  <div className="w-full h-full flex items-center overflow-hidden">
                    {column.type === 'checkmark' ? (
                      <div className="w-full flex items-center justify-center">
                        <div className={`w-6 h-6 rounded-md flex items-center justify-center transition-all duration-200 ${cellValue === '✓' ? 'bg-green-100 text-green-600 scale-110' : cellValue === '✗' ? 'bg-red-100 text-red-600 scale-110' : 'hover:bg-slate-100 text-slate-300'}`}>
                          {cellValue === '✓' ? '✓' : cellValue === '✗' ? '✗' : '•'}
                        </div>
                      </div>
                    ) : (['stage', 'taba', 'transfer_rights', 'purchase_rights'].includes(column.type) || (globalDataTypes && globalDataTypes[column.type])) ? (
                      <StageDisplay 
                        value={cellValue}
                        column={column}
                        isEditing={isEditing}
                        onEdit={(val) => setEditValue(val)}
                        editValue={editValue}
                        onSave={() => saveEdit()} 
                        onCancel={() => setEditingCell(null)}
                        globalDataTypes={globalDataTypes}
                        customStageOptions={customStageOptions}
                        onDirectSave={(val) => handleStageSelect(val, column.key)}
                      />
                    ) : isClientColumn(column) ? (
                      isEditing ? <Input ref={editInputRef} value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={() => setTimeout(saveEdit, 200)} onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingCell(null); }} className="h-full w-full border-none shadow-none focus:ring-0 bg-transparent p-0 text-inherit" autoFocus dir="rtl" /> : (
                        <div className="flex items-center gap-2 truncate group/cell w-full">
                          {cellValue ? (
                            <>
                              <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-bold flex-shrink-0">{cellValue.substring(0,1)}</div>
                              <span className="truncate font-medium w-full" title={cellValue}>{cellValue}</span>
                            </>
                          ) : (
                            <span className="text-slate-300 text-xs italic">בחר לקוח...</span>
                          )}
                        </div>
                      )
                    ) : isEditing ? (
                      column.type === 'long_text' ? <textarea ref={editInputRef} value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={saveEdit} onKeyDown={(e) => { if (e.key === 'Enter' && e.ctrlKey) saveEdit(); if (e.key === 'Escape') { setEditingCell(null); setEditValue(""); } }} className="absolute inset-0 w-full h-full min-h-[60px] z-50 p-2 bg-white border-2 border-blue-500 rounded shadow-lg resize-none text-sm leading-snug" autoFocus dir="rtl" /> : (
                        <>
                          <Input ref={editInputRef} type={column.type === 'date' ? 'date' : column.type === 'number' ? 'number' : 'text'} value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={saveEdit} onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') { setEditingCell(null); setEditValue(""); } }} className={`h-full w-full border-none shadow-none focus:ring-0 bg-white/50 p-0 text-inherit ${validateCell && validateCell(column.key, editValue) ? 'text-red-600 bg-red-50' : ''}`} autoFocus dir="rtl" list={column.type === 'text' || !column.type ? `ac-${column.key}` : undefined} />
                          {validateCell && validateCell(column.key, editValue) && <div className="absolute bottom-full left-0 mb-1 z-[60] bg-red-600 text-white text-[10px] px-2 py-1 rounded shadow-md whitespace-nowrap pointer-events-none animate-in fade-in slide-in-from-bottom-1">{validateCell(column.key, editValue)}<div className="absolute top-full left-2 border-4 border-transparent border-t-red-600"></div></div>}
                        </>
                      )
                    ) : (
                      // SMART TEXT TRUNCATION
                      <TooltipProvider>
                        <Tooltip delayDuration={500}>
                          <TooltipTrigger asChild>
                            <div className="truncate w-full cursor-default">
                              {String(cellValue)}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" align="start" className="max-w-[300px] break-words">
                            <p>{String(cellValue)}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                  {isEditing && !isClientColumn(column) && !(['stage', 'taba', 'transfer_rights', 'purchase_rights'].includes(column.type) || (globalDataTypes && globalDataTypes[column.type])) && <datalist id={`ac-${column.key}`}>{getAutoCompleteSuggestions(column.key).map((s, i) => <option key={i} value={s} />)}</datalist>}
                </td>
              );
            })}
            
            {/* Grouped Actions */}
            <td className="p-0 text-center relative border-b border-slate-100 bg-white" style={{ height: `${rowHeight}px`, borderWidth: isSeparateBorders ? '0' : borderStyle.width, borderStyle: borderStyle.style, borderColor: palette.border }}>
              <div className="w-full h-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full hover:bg-slate-100">
                      <MoreHorizontal className="w-4 h-4 text-slate-500" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" dir="rtl">
                    <DropdownMenuItem onClick={() => onDuplicateRow(row)}>
                      <Copy className="w-4 h-4 ml-2" />
                      שכפל שורה
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {
                        // View logic - e.g. open details if possible
                        // Assuming we can trigger cell click or similar
                        // Just a placeholder for "View"
                        alert('צפייה בפרטים (למימוש עתידי)');
                    }}>
                        <Eye className="w-4 h-4 ml-2" />
                        צפה בפרטים
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onDeleteRow(row.id)} className="text-red-600">
                      <Trash2 className="w-4 h-4 ml-2" />
                      מחק שורה
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </td>
          </tr>
        )}
      </Draggable>

      <Dialog open={!!customFieldsDialog} onOpenChange={(open) => !open && setCustomFieldsDialog(null)}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>השלמת פרטים: {customFieldsDialog?.option?.label}</DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-4">
            {customFieldsDialog?.option?.fields?.map(field => (
              <div key={field.key} className="space-y-1">
                <label className="text-sm font-medium text-slate-700">
                  {field.label} {field.required && <span className="text-red-500">*</span>}
                </label>
                {field.type === 'select' ? (
                  <Select 
                    value={tempFields[field.key] || customFieldsDialog.currentMeta[field.key] || ''}
                    onValueChange={(val) => setTempFields(prev => ({ ...prev, [field.key]: val }))}
                  >
                    <SelectTrigger><SelectValue placeholder="בחר..." /></SelectTrigger>
                    <SelectContent>
                      {(field.options || []).map(opt => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : field.type === 'boolean' ? (
                  <div className="flex items-center gap-2">
                    <Switch 
                      checked={tempFields[field.key] ?? customFieldsDialog.currentMeta[field.key] ?? false}
                      onCheckedChange={(val) => setTempFields(prev => ({ ...prev, [field.key]: val }))}
                    />
                    <span className="text-sm">{tempFields[field.key] ? 'כן' : 'לא'}</span>
                  </div>
                ) : (
                  <Input 
                    type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                    value={tempFields[field.key] || customFieldsDialog.currentMeta[field.key] || ''}
                    onChange={(e) => setTempFields(prev => ({ ...prev, [field.key]: e.target.value }))}
                    placeholder={field.default_value}
                  />
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCustomFieldsDialog(null)}>ביטול</Button>
            <Button onClick={saveCustomFields}>שמור והמשך</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}, (prev, next) => {
  if (prev.row.id !== next.row.id) return false;
  if (prev.rowIndex !== next.rowIndex) return false;
  if (prev.row !== next.row) return false;
  const isPrevEditing = prev.editingCell?.startsWith(prev.row.id);
  const isNextEditing = next.editingCell?.startsWith(next.row.id);
  if (isPrevEditing || isNextEditing) return false;
  
  const prevMeta = prev.cellMetadata;
  const nextMeta = next.cellMetadata;
  if (prevMeta !== nextMeta) return false;

  return (
    prev.visibleColumns === next.visibleColumns &&
    prev.rowHeight === next.rowHeight &&
    prev.density === next.density && // Check density
    prev.palette === next.palette &&
    prev.cellStyles === next.cellStyles &&
    prev.cellNotes === next.cellNotes &&
    prev.mergedCells === next.mergedCells &&
    prev.activeCollaborators === next.activeCollaborators &&
    prev.freezeSettings === next.freezeSettings
  );
});

export default SpreadsheetRow;