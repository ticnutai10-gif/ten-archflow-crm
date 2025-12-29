import React, { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar"; // Assuming you have a Calendar component or use native date input
import { Search, Filter, Calendar as CalendarIcon, Check, X } from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";

export default function ColumnFilter({ column, rowsData, currentFilter, onFilterChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Parse current filter
  const filterState = useMemo(() => {
    if (!currentFilter) return {};
    try {
      return typeof currentFilter === 'string' ? JSON.parse(currentFilter) : currentFilter;
    } catch {
      return { type: 'text', value: currentFilter }; // Fallback for legacy text filters
    }
  }, [currentFilter]);

  const uniqueValues = useMemo(() => {
    const values = new Set();
    rowsData.forEach(row => {
      const val = row[column.key];
      if (val !== undefined && val !== null && val !== '') {
        values.add(String(val));
      }
    });
    return Array.from(values).sort();
  }, [rowsData, column.key]);

  const filteredValues = useMemo(() => {
    return uniqueValues.filter(v => v.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [uniqueValues, searchTerm]);

  const handleSelectValue = (value) => {
    const currentSelected = filterState.selectedValues || [];
    let newSelected;
    if (currentSelected.includes(value)) {
      newSelected = currentSelected.filter(v => v !== value);
    } else {
      newSelected = [...currentSelected, value];
    }
    
    // If empty, clear filter
    if (newSelected.length === 0 && !filterState.min && !filterState.max && !filterState.start && !filterState.end) {
      onFilterChange(null);
    } else {
      onFilterChange({ ...filterState, type: 'multi-select', selectedValues: newSelected });
    }
  };

  const handleSelectAll = () => {
    if (filterState.selectedValues?.length === uniqueValues.length) {
      onFilterChange(null); // Deselect all -> Clear filter
    } else {
      onFilterChange({ ...filterState, type: 'multi-select', selectedValues: uniqueValues });
    }
  };

  const handleDateRangeChange = (type, value) => {
    const newState = { ...filterState, type: 'date-range', [type]: value };
    if (!newState.start && !newState.end) onFilterChange(null);
    else onFilterChange(newState);
  };

  const handleNumberRangeChange = (type, value) => {
    const newState = { ...filterState, type: 'number-range', [type]: value };
    if (!newState.min && !newState.max) onFilterChange(null);
    else onFilterChange(newState);
  };

  const clearFilter = () => {
    onFilterChange(null);
    setIsOpen(false);
  };

  const isActive = !!currentFilter;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className={`h-7 w-7 ${isActive ? 'text-blue-600 bg-blue-50' : 'text-slate-400 hover:text-slate-600'}`}
          onClick={(e) => { e.stopPropagation(); }}
        >
          <Filter className="h-3 w-3" fill={isActive ? "currentColor" : "none"} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start" dir="rtl">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">סינון: {column.title}</h4>
            {isActive && (
              <Button variant="ghost" size="sm" onClick={clearFilter} className="h-6 px-2 text-xs text-red-500 hover:bg-red-50">
                נקה
              </Button>
            )}
          </div>

          {/* Date Range Filter */}
          {column.type === 'date' && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">מתאריך</Label>
                  <Input 
                    type="date" 
                    value={filterState.start || ''} 
                    onChange={(e) => handleDateRangeChange('start', e.target.value)} 
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs">עד תאריך</Label>
                  <Input 
                    type="date" 
                    value={filterState.end || ''} 
                    onChange={(e) => handleDateRangeChange('end', e.target.value)} 
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Number Range Filter */}
          {column.type === 'number' && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">מינימום</Label>
                  <Input 
                    type="number" 
                    value={filterState.min || ''} 
                    onChange={(e) => handleNumberRangeChange('min', e.target.value)} 
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs">מקסימום</Label>
                  <Input 
                    type="number" 
                    value={filterState.max || ''} 
                    onChange={(e) => handleNumberRangeChange('max', e.target.value)} 
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Multi-select Values (for Text, Select, Stage, Client, etc.) */}
          {['text', 'select', 'stage', 'client', undefined, 'long_text'].includes(column.type) && (
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
                <Input 
                  placeholder="חפש ברשימה..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-8 pr-7 text-xs"
                />
              </div>
              <div className="max-h-40 overflow-y-auto border rounded p-1 space-y-1 bg-slate-50">
                {filteredValues.length > 0 ? (
                  <>
                    <div 
                      className="flex items-center gap-2 p-1.5 hover:bg-slate-200 rounded cursor-pointer"
                      onClick={handleSelectAll}
                    >
                      <Checkbox 
                        checked={filterState.selectedValues?.length === uniqueValues.length} 
                        onCheckedChange={handleSelectAll}
                        id={`all-${column.key}`}
                      />
                      <label htmlFor={`all-${column.key}`} className="text-xs cursor-pointer select-none font-semibold">
                        (בחר הכל)
                      </label>
                    </div>
                    {filteredValues.map(val => (
                      <div 
                        key={val} 
                        className="flex items-center gap-2 p-1.5 hover:bg-slate-200 rounded cursor-pointer"
                        onClick={() => handleSelectValue(val)}
                      >
                        <Checkbox 
                          checked={filterState.selectedValues?.includes(val)} 
                          onCheckedChange={() => handleSelectValue(val)}
                          id={`val-${column.key}-${val}`}
                        />
                        <label htmlFor={`val-${column.key}-${val}`} className="text-xs cursor-pointer select-none truncate">
                          {val}
                        </label>
                      </div>
                    ))}
                  </>
                ) : (
                  <div className="text-center text-xs text-slate-400 py-2">לא נמצאו ערכים</div>
                )}
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}