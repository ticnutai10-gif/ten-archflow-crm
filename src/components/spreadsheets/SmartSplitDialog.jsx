import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Scissors, ArrowLeftRight, Wand2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function SmartSplitDialog({ open, onClose, column, rowsData, onSplit }) {
  const [delimiterType, setDelimiterType] = useState('auto');
  const [customDelimiter, setCustomDelimiter] = useState('');
  const [previewData, setPreviewData] = useState([]);

  // Analyze data to find best delimiter
  useEffect(() => {
    if (open && column && rowsData) {
      if (delimiterType === 'auto') {
        const sampleSize = Math.min(rowsData.length, 50);
        const counts = { ',': 0, ' ': 0, ';': 0, '|': 0, '-': 0 };
        
        for (let i = 0; i < sampleSize; i++) {
          const val = String(rowsData[i][column.key] || '');
          if (val.includes(',')) counts[',']++;
          if (val.includes(' ')) counts[' ']++;
          if (val.includes(';')) counts[';']++;
          if (val.includes('|')) counts['|']++;
          if (val.includes('-')) counts['-']++;
        }
        
        const best = Object.entries(counts).reduce((a, b) => b[1] > a[1] ? b : a);
        if (best[1] > 0) {
          setCustomDelimiter(best[0]);
        } else {
          setCustomDelimiter(' '); // Default fallback
        }
      }
    }
  }, [open, column, rowsData, delimiterType]);

  const delimiter = delimiterType === 'custom' ? customDelimiter : 
                    delimiterType === 'space' ? ' ' :
                    delimiterType === 'comma' ? ',' :
                    delimiterType === 'auto' ? customDelimiter : customDelimiter;

  // Generate preview
  useEffect(() => {
    if (!column || !rowsData) return;
    
    const sample = rowsData.slice(0, 5).map(row => {
      const original = String(row[column.key] || '');
      const parts = original.split(delimiter);
      return {
        original,
        part1: parts[0] || '',
        part2: parts.slice(1).join(delimiter) || '' // Join rest if more than 2, or just 2nd part
      };
    });
    setPreviewData(sample);
  }, [column, rowsData, delimiter]);

  const handleSplit = () => {
    onSplit(column.key, delimiter);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scissors className="w-5 h-5 text-orange-600" />
            פיצול תא/עמודה חכם
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm text-orange-800 flex items-start gap-2">
            <Wand2 className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              הפיצול יחול על כל העמודה <strong>"{column?.title}"</strong> ויצור עמודות חדשות מימין.
            </div>
          </div>

          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>לפי מה לפצל?</Label>
              <Select value={delimiterType} onValueChange={setDelimiterType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">✨ זיהוי אוטומטי (חכם)</SelectItem>
                  <SelectItem value="space">רווח ( )</SelectItem>
                  <SelectItem value="comma">פסיק (,)</SelectItem>
                  <SelectItem value="custom">מותאם אישית...</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(delimiterType === 'custom' || delimiterType === 'auto') && (
              <div className="space-y-2">
                <Label>תו מפריד</Label>
                <div className="flex gap-2">
                  <Input 
                    value={customDelimiter} 
                    onChange={(e) => {
                      setCustomDelimiter(e.target.value);
                      if (delimiterType === 'auto') setDelimiterType('custom');
                    }}
                    className="font-mono text-center text-lg w-full"
                    maxLength={5}
                    placeholder="לדוגמה: -"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-slate-500">תצוגה מקדימה (5 שורות ראשונות):</Label>
            <div className="border rounded-md overflow-hidden text-sm">
              <div className="grid grid-cols-3 bg-slate-50 border-b p-2 font-medium text-xs text-slate-600">
                <div>מקור</div>
                <div className="flex items-center gap-1 text-blue-600"><ArrowLeftRight className="w-3 h-3" /> חלק 1</div>
                <div className="flex items-center gap-1 text-green-600"><ArrowLeftRight className="w-3 h-3" /> חלק 2+</div>
              </div>
              {previewData.map((row, i) => (
                <div key={i} className="grid grid-cols-3 border-b last:border-0 p-2 hover:bg-slate-50 transition-colors">
                  <div className="truncate text-slate-500 border-l pl-2 ml-2">{row.original}</div>
                  <div className="truncate font-medium border-l pl-2 ml-2">{row.part1}</div>
                  <div className="truncate text-slate-700">{row.part2}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>ביטול</Button>
          <Button onClick={handleSplit} className="bg-orange-600 hover:bg-orange-700 gap-2">
            <Scissors className="w-4 h-4" />
            בצע פיצול
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}