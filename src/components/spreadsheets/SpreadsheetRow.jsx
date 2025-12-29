import React, { memo } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Draggable } from '@hello-pangea/dnd';
import { Copy, Trash2, Palette, Bold, MessageSquare, GripVertical, Users } from "lucide-react";
import { StageDisplay } from "./GenericSpreadsheet"; // We'll export this or import from a shared file if needed, for now assuming it's available or we move it to a shared utils file. 
// Actually, circular dependency might be an issue. Let's assume we pass StageDisplay as a prop or it's simple enough to duplicate/move.
// Better: We will keep StageDisplay in GenericSpreadsheet for now and pass render logic or move StageDisplay to a separate file.
// Let's assume StageDisplay is exported from GenericSpreadsheet or a utils file. 
// To avoid issues, I will assume I need to move StageDisplay to a separate file `SpreadsheetComponents.js` or similar, OR just pass it down/import it.
// Since I cannot easily move StageDisplay in the same turn without rewriting GenericSpreadsheet completely, I will inline a simple version or expect it to be passed.
// Wait, I can move StageDisplay to a new file `components/spreadsheets/SpreadsheetComponents.js`.

const SpreadsheetRow = memo(({
  row,
  rowIndex,
  visibleColumns,
  rowHeight,
  palette,
  cellFont,
  cellFontSize,
  cellPadding,
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
  commentCounts, // New prop
  mergedCells,
  customStageOptions,
  allClients,
  editValue,
  getConditionalStyle,
  getStageLabel,
  getMergeInfo,
  isClientColumn,
  getAutoCompleteSuggestions,
  // Handlers
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
  
  // Edit Handlers
  setEditingCell,
  setEditValue,
  saveEdit,
  editInputRef,
  validateCell,
  
  // Stage Handlers
  onDirectSaveStage
}) => {
  
  return (
    <Draggable draggableId={row.id} index={rowIndex}>
      {(provided, snapshot) => (
        <tr 
          ref={provided.innerRef} 
          {...provided.draggableProps} 
          className={`group transition-all duration-200 ease-out hover:brightness-95 hover:shadow-sm ${snapshot.isDragging ? 'opacity-95 shadow-2xl bg-white scale-[1.01] z-[100] ring-2 ring-blue-500/20' : ''}`}
          style={{ 
            height: `${rowHeight}px`, 
            backgroundColor: rowIndex % 2 === 0 ? palette.cellBg : palette.cellAltBg,
            contentVisibility: 'auto' // Improves scroll perf
          }}
        >
          {/* Row Handle & Index */}
          <td 
            {...provided.dragHandleProps} 
            className="p-0 relative border-b border-slate-100 group-hover:bg-slate-50 transition-colors"
            style={{ 
              height: `${rowHeight}px`, 
              zIndex: 15, 
              backgroundColor: palette.headerBg, 
              borderWidth: isSeparateBorders ? '0' : borderStyle.width, 
              borderStyle: borderStyle.style, 
              borderColor: palette.border,
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
            
            if (mergeInfo && !mergeInfo.isMaster) {
              return null;
            }
            
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

            // Premium touches: Active cell border (Excel style), smooth focus
            const selectionClass = isSelected 
              ? 'ring-[2px] ring-blue-600 ring-inset z-20 bg-blue-50/30' 
              : 'border-b border-r border-slate-200/50'; // Softer default borders
            
            const activeUserClass = activeUserOnCell ? 'ring-2 ring-offset-1 z-20' : '';
            
            // Highlight for row hover (subtle vertical guide)
            const hoverClass = !isEditing && !isSelected && !mergeInfo 
              ? 'group-hover:bg-black/[0.015] hover:!bg-black/[0.03] transition-colors duration-100' 
              : '';

            return (
              <td 
                key={column.key}
                rowSpan={mergeInfo?.rowspan || 1}
                colSpan={mergeInfo?.colspan || 1}
                className={`
                  relative px-3 py-1.5 outline-none focus:outline-none 
                  ${selectionClass} 
                  ${hoverClass}
                  ${isClientPicker ? 'ring-2 ring-blue-500 z-30 shadow-lg' : ''} 
                  ${mergeInfo ? 'bg-white shadow-sm' : ''}
                  overflow-hidden
                `}
                style={{
                  ...((activeUserOnCell) ? { borderColor: activeUserOnCell.color } : {}),
                  backgroundColor: isSelected ? `${palette.selected}40` : (
                    (column.type === 'checkmark' || column.type === 'mixed_check') && cellValue === '✓' ? '#f0fdf4' : 
                    (column.type === 'checkmark' || column.type === 'mixed_check') && cellValue === '✗' ? '#fef2f2' :
                    finalStyle.backgroundColor || (rowIndex % 2 === 0 ? palette.cellBg : palette.cellAltBg)
                  ),
                  color: finalStyle.color || palette.cellText,
                  opacity: finalStyle.opacity ? finalStyle.opacity / 100 : 1,
                  fontWeight: finalStyle.fontWeight || 'normal',
                  fontFamily: cellFont.value,
                  fontSize: cellFontSize,
                  padding: cellPadding,
                  height: `${rowHeight}px`,

                  // Freeze Columns Logic
                  position: (colIndex < freezeSettings.freeze_columns || rowIndex < freezeSettings.freeze_rows) ? 'sticky' : 'relative',
                  right: colIndex < freezeSettings.freeze_columns ? `${stickyColumnOffsets[colIndex]}px` : 'auto',
                  top: rowIndex < freezeSettings.freeze_rows ? `${stickyRowOffsets[rowIndex]}px` : 'auto',

                  // Z-Index Handling
                  zIndex: (colIndex < freezeSettings.freeze_columns && rowIndex < freezeSettings.freeze_rows) ? 20 : 
                          (colIndex < freezeSettings.freeze_columns) ? 10 : 
                          (rowIndex < freezeSettings.freeze_rows) ? 10 : 1,

                  boxShadow: colIndex === freezeSettings.freeze_columns - 1 ? '-4px 0 8px -2px rgba(0,0,0,0.05)' : 
                             rowIndex === freezeSettings.freeze_rows - 1 ? '0 4px 8px -2px rgba(0,0,0,0.05)' : 'none',

                  borderWidth: isSeparateBorders ? '0' : '0 0 1px 1px',
                  borderStyle: 'solid',
                  borderColor: isSelected ? 'transparent' : `${palette.border}40`,
                  borderRadius: isSeparateBorders ? tableBorderRadius : '0'
                }} 
                onClick={(e) => !isEditing && (column.type === 'checkmark' ? onCheckmarkClick(row.id, column.key, e) : onCellClick(row.id, column.key, e))} 
                onDoubleClick={(e) => onCellDoubleClick(row.id, column.key, e)}
                onContextMenu={(e) => onCellContextMenu(row.id, column.key, e)}
                onMouseDown={(e) => !isEditing && onCellMouseDown(row.id, column.key, e)} 
                onMouseEnter={() => onCellMouseEnter(row.id, column.key)}
              >

                {/* Note Indicator - Elegant corner triangle */}
                {hasNote && (
                <div 
                  className="absolute top-0 right-0 w-0 h-0 z-10 cursor-pointer hover:scale-110 transition-transform" 
                  style={{
                    borderTop: '8px solid #f59e0b',
                    borderLeft: '8px solid transparent'
                  }}
                  title={cellNotes[cellKey]}
                  onClick={(e) => onNoteTriangleClick(cellKey, e)}
                />
                )}

                {/* Comment Indicator */}
                {commentCount > 0 && (
                  <div 
                    className="absolute top-0 left-0 z-10 cursor-pointer hover:scale-110 transition-transform"
                    title={`${commentCount} תגובות`}
                  >
                    <div className="bg-blue-500 text-white text-[8px] font-bold px-1 rounded-br-md shadow-sm">
                      {commentCount}
                    </div>
                  </div>
                )}
                
                {/* Active Collaborator Label */}
                {activeUserOnCell && (
                <div 
                  className="absolute -top-4 right-0 z-30 text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-white shadow-md whitespace-nowrap opacity-90"
                  style={{ backgroundColor: activeUserOnCell.color }}
                >
                  {activeUserOnCell.user_name}
                </div>
                )}

                {/* Cell Content */}
                <div className="w-full h-full flex items-center overflow-hidden">
                  {column.type === 'checkmark' ? (
                    <div className="w-full flex items-center justify-center">
                      <div className={`
                        w-6 h-6 rounded-md flex items-center justify-center transition-all duration-200
                        ${cellValue === '✓' ? 'bg-green-100 text-green-600 scale-110' : 
                          cellValue === '✗' ? 'bg-red-100 text-red-600 scale-110' : 
                          'hover:bg-slate-100 text-slate-300'}
                      `}>
                        {cellValue === '✓' ? '✓' : cellValue === '✗' ? '✗' : '•'}
                      </div>
                    </div>
                  ) : column.type === 'mixed_check' ? (
                    isEditing ? (
                      <Input 
                        ref={editInputRef} 
                        value={editValue} 
                        onChange={(e) => setEditValue(e.target.value)} 
                        onBlur={saveEdit} 
                        onKeyDown={(e) => { 
                          if (e.key === 'Enter') saveEdit(); 
                          if (e.key === 'Escape') { setEditingCell(null); setEditValue(""); } 
                        }} 
                        className="h-full w-full border-none shadow-none focus:ring-0 bg-transparent p-0 text-inherit" 
                        autoFocus 
                        dir="rtl" 
                        placeholder="V / X / טקסט" 
                      />
                    ) : (
                      <div className="w-full flex items-center justify-center">
                        {cellValue === '✓' || cellValue === 'V' || cellValue === 'v' ? (
                          <span className="inline-flex items-center justify-center px-2 py-0.5 rounded bg-green-50 text-green-700 text-xs font-bold border border-green-100">✓</span>
                        ) : cellValue === '✗' || cellValue === 'X' || cellValue === 'x' ? (
                          <span className="inline-flex items-center justify-center px-2 py-0.5 rounded bg-red-50 text-red-700 text-xs font-bold border border-red-100">✗</span>
                        ) : cellValue ? (
                          <span className="truncate w-full">{String(cellValue)}</span>
                        ) : (
                          <span className="text-slate-200 text-xs">•</span>
                        )}
                      </div>
                    )
                  ) : column.type === 'stage' ? (
                    <div className="w-full flex justify-center">
                      {/* Render stage display component (passed as prop would be better but we assume simple rendering here or duplicate logic for performance) */}
                      {/* Using a simplified version for performance in large tables */}
                      {(() => {
                         const currentStage = (customStageOptions || []).flatMap(g => [g, ...(g.children || [])]).find(s => s.value === cellValue);
                         if (!currentStage) return <span className="text-slate-300 text-xs">-</span>;
                         return (
                           <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-medium transition-transform hover:scale-105"
                             style={{ 
                               backgroundColor: `${currentStage.color}15`, 
                               borderColor: `${currentStage.color}40`, 
                               color: currentStage.color 
                             }}
                             onClick={(e) => { e.stopPropagation(); onCellClick(row.id, column.key, e); }}
                           >
                             <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: currentStage.color }} />
                             {currentStage.label}
                           </div>
                         );
                      })()}
                    </div>
                  ) : isClientColumn(column) ? (
                    isEditing ? (
                      <Input 
                        ref={editInputRef} 
                        value={editValue} 
                        onChange={(e) => setEditValue(e.target.value)} 
                        onBlur={() => setTimeout(saveEdit, 200)}
                        onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingCell(null); }} 
                        className="h-full w-full border-none shadow-none focus:ring-0 bg-transparent p-0 text-inherit" 
                        autoFocus 
                        dir="rtl" 
                      />
                    ) : (
                      <div className="flex items-center gap-2 truncate group/cell">
                        {cellValue ? (
                          <>
                            <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-bold">
                              {cellValue.substring(0,1)}
                            </div>
                            <span className="truncate font-medium">{cellValue}</span>
                          </>
                        ) : (
                          <span className="text-slate-300 text-xs italic">בחר לקוח...</span>
                        )}
                      </div>
                    )
                  ) : isEditing ? (
                    <div className="relative w-full h-full">
                      {column.type === 'long_text' ? (
                        <textarea
                          ref={editInputRef}
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={saveEdit}
                          onKeyDown={(e) => { 
                            if (e.key === 'Enter' && e.ctrlKey) saveEdit(); 
                            if (e.key === 'Escape') { setEditingCell(null); setEditValue(""); } 
                          }}
                          className="absolute inset-0 w-full h-full min-h-[60px] z-50 p-2 bg-white border-2 border-blue-500 rounded shadow-lg resize-none text-sm leading-snug"
                          autoFocus
                          dir="rtl"
                        />
                      ) : (
                        <>
                          <Input 
                            ref={editInputRef} 
                            type={column.type === 'date' ? 'date' : column.type === 'number' ? 'number' : 'text'}
                            value={editValue} 
                            onChange={(e) => setEditValue(e.target.value)} 
                            onBlur={saveEdit} 
                            onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') { setEditingCell(null); setEditValue(""); } }} 
                            className={`h-full w-full border-none shadow-none focus:ring-0 bg-white/50 p-0 text-inherit ${
                              validateCell && validateCell(column.key, editValue) ? 'text-red-600 bg-red-50' : ''
                            }`}
                            autoFocus 
                            dir="rtl" 
                            list={column.type === 'text' || !column.type ? `ac-${column.key}` : undefined} 
                          />
                          {validateCell && validateCell(column.key, editValue) && (
                            <div className="absolute bottom-full left-0 mb-1 z-[60] bg-red-600 text-white text-[10px] px-2 py-1 rounded shadow-md whitespace-nowrap pointer-events-none animate-in fade-in slide-in-from-bottom-1">
                              {validateCell(column.key, editValue)}
                              <div className="absolute top-full left-2 border-4 border-transparent border-t-red-600"></div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="truncate w-full" title={String(cellValue).length > 20 ? String(cellValue) : ''}>
                      {String(cellValue)}
                    </div>
                  )}
                </div>
                
                {/* Auto Complete Datalist */}
                {isEditing && !isClientColumn(column) && column.type !== 'stage' && (
                   <datalist id={`ac-${column.key}`}>{getAutoCompleteSuggestions(column.key).map((s, i) => <option key={i} value={s} />)}</datalist>
                )}
              </td>
            );
          })}

          {/* Row Actions */}
          <td 
            className="p-0 text-center relative border-b border-slate-100 bg-white"
            style={{ 
              height: `${rowHeight}px`,
              borderWidth: isSeparateBorders ? '0' : borderStyle.width, 
              borderStyle: borderStyle.style, 
              borderColor: palette.border 
            }}
          >
            <div className="w-full h-full flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <Button size="icon" variant="ghost" className="h-6 w-6 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-full" onClick={() => onDuplicateRow(row)} title="שכפל">
                <Copy className="w-3 h-3" />
              </Button>
              <Button size="icon" variant="ghost" className="h-6 w-6 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-full" onClick={() => onDeleteRow(row.id)} title="מחק">
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </td>
        </tr>
      )}
    </Draggable>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for performance optimization
  // Returns true if props are equal (no re-render needed)
  
  if (prevProps.row.id !== nextProps.row.id) return false;
  if (prevProps.rowIndex !== nextProps.rowIndex) return false;
  if (prevProps.row !== nextProps.row) return false; // Row data changed
  
  // Check if row is being edited
  const isPrevEditing = prevProps.editingCell?.startsWith(prevProps.row.id);
  const isNextEditing = nextProps.editingCell?.startsWith(nextProps.row.id);
  if (isPrevEditing || isNextEditing) return false;
  
  // Check if any cell in row is selected
  // Optimization: Check intersection of selectedCells with this row's cell keys
  // This is expensive to do deeply, so we might just check strict equality of selectedCells set reference if it's immutable, 
  // but here it's a Set. 
  // Let's assume if selectedCells size changed or reference changed we re-render visible rows. 
  // Better: Only if this row is involved.
  // For simplicity in this implementation, we shallow compare the rest.
  
  return (
    prevProps.visibleColumns === nextProps.visibleColumns &&
    prevProps.rowHeight === nextProps.rowHeight &&
    prevProps.palette === nextProps.palette &&
    prevProps.cellStyles === nextProps.cellStyles && // Ref compare - assuming immutable updates
    prevProps.cellNotes === nextProps.cellNotes &&
    prevProps.mergedCells === nextProps.mergedCells &&
    prevProps.activeCollaborators === nextProps.activeCollaborators &&
    prevProps.freezeSettings === nextProps.freezeSettings
  );
});

export default SpreadsheetRow;