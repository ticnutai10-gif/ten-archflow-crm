import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  History, Download, Trash2, Clock, FileJson, FileSpreadsheet, 
  FileText, Archive, CheckCircle2, AlertCircle, RefreshCw, Eye
} from "lucide-react";

// Store backup history in localStorage
const STORAGE_KEY = 'backup_history';

export default function BackupHistoryPanel({ onRestore }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setHistory(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Error loading backup history:', e);
    }
    setLoading(false);
  };

  const saveHistory = (newHistory) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
      setHistory(newHistory);
    } catch (e) {
      console.error('Error saving backup history:', e);
    }
  };

  const addToHistory = (backup) => {
    const newHistory = [backup, ...history].slice(0, 50); // Keep last 50
    saveHistory(newHistory);
  };

  const removeFromHistory = (id) => {
    const newHistory = history.filter(h => h.id !== id);
    saveHistory(newHistory);
  };

  const clearHistory = () => {
    if (confirm('האם למחוק את כל היסטוריית הגיבויים?')) {
      saveHistory([]);
    }
  };

  const getFormatIcon = (format) => {
    switch (format) {
      case 'json': return <FileJson className="w-4 h-4 text-amber-500" />;
      case 'excel': return <FileSpreadsheet className="w-4 h-4 text-green-500" />;
      case 'csv': return <FileText className="w-4 h-4 text-blue-500" />;
      case 'zip': return <Archive className="w-4 h-4 text-purple-500" />;
      default: return <FileText className="w-4 h-4 text-slate-500" />;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-100 text-green-700"><CheckCircle2 className="w-3 h-3 ml-1" />הצליח</Badge>;
      case 'error':
        return <Badge className="bg-red-100 text-red-700"><AlertCircle className="w-3 h-3 ml-1" />נכשל</Badge>;
      default:
        return <Badge variant="outline">לא ידוע</Badge>;
    }
  };

  // Expose addToHistory for parent component
  React.useEffect(() => {
    window.addBackupToHistory = addToHistory;
    return () => { delete window.addBackupToHistory; };
  }, [history]);

  return (
    <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm">
      <CardHeader className="border-b bg-gradient-to-l from-amber-50 to-white pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3 text-xl">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
              <History className="w-5 h-5 text-white" />
            </div>
            היסטוריית גיבויים
          </CardTitle>
          {history.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={clearHistory}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4 ml-1" />
              נקה היסטוריה
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>אין היסטוריית גיבויים</p>
            <p className="text-sm">גיבויים שתבצע יופיעו כאן</p>
          </div>
        ) : (
          <ScrollArea className="h-[300px]">
            <div className="divide-y">
              {history.map((backup) => (
                <div 
                  key={backup.id}
                  className="p-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getFormatIcon(backup.format)}
                      <div>
                        <div className="font-semibold text-slate-900">
                          {backup.name || `גיבוי ${backup.format?.toUpperCase()}`}
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-2">
                          <Clock className="w-3 h-3" />
                          {new Date(backup.date).toLocaleString('he-IL')}
                          <span>•</span>
                          <span>{backup.categories?.length || 0} קטגוריות</span>
                          <span>•</span>
                          <span>{(backup.size / 1024).toFixed(1)} KB</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(backup.status)}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeFromHistory(backup.id)}
                        className="h-8 w-8 p-0 text-slate-400 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  {backup.categories && backup.categories.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {backup.categories.slice(0, 5).map(cat => (
                        <Badge key={cat} variant="outline" className="text-xs">
                          {cat}
                        </Badge>
                      ))}
                      {backup.categories.length > 5 && (
                        <Badge variant="outline" className="text-xs">
                          +{backup.categories.length - 5}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}