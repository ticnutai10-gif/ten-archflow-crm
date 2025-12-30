import React, { useState, useRef, useMemo } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Save, FileText, X, Plus, Type } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

export default function SmartDocEditor({ 
  document, 
  columns = [], 
  rowData = null, 
  onSave, 
  onClose,
  isTemplateMode = true
}) {
  const [title, setTitle] = useState(document?.title || "מסמך חדש");
  const [content, setContent] = useState(document?.content || "");
  const quillRef = useRef(null);

  // Custom toolbar modules
  const modules = useMemo(() => ({
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'align': [] }],
      [{ 'color': [] }, { 'background': [] }],
      ['link', 'clean']
    ],
  }), []);

  const insertVariable = (colKey, colTitle) => {
    const quill = quillRef.current?.getEditor();
    if (quill) {
      const cursorPosition = quill.getSelection()?.index || 0;
      // Insert placeholder in format {{column_key}}
      const textToInsert = `{{${colKey}}}`;
      quill.insertText(cursorPosition, textToInsert, {
        'color': '#2563eb',
        'bold': true
      });
      quill.setSelection(cursorPosition + textToInsert.length);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("נא להזין כותרת למסמך");
      return;
    }

    const docData = {
      title,
      content,
      last_modified: new Date().toISOString()
    };

    if (onSave) {
      await onSave(docData);
    }
  };

  // Replace variables for preview if rowData exists
  const getPreviewContent = () => {
    if (!rowData || !content) return content;
    
    let preview = content;
    columns.forEach(col => {
      const placeholder = `{{${col.key}}}`;
      const value = rowData[col.key] || '---';
      // Global replace
      preview = preview.split(placeholder).join(value);
    });
    return preview;
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg overflow-hidden" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-slate-50">
        <div className="flex items-center gap-3 flex-1">
          <div className="p-2 bg-blue-100 rounded-lg">
            <FileText className="w-5 h-5 text-blue-600" />
          </div>
          <Input 
            value={title} 
            onChange={(e) => setTitle(e.target.value)} 
            className="font-bold text-lg bg-transparent border-transparent hover:border-slate-300 focus:bg-white transition-all max-w-md"
            placeholder="כותרת המסמך..."
          />
          {isTemplateMode && <Badge variant="outline" className="bg-blue-50 text-blue-700">מצב תבנית</Badge>}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onClose}>
            <X className="w-4 h-4 ml-2" />
            סגור
          </Button>
          <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
            <Save className="w-4 h-4 ml-2" />
            שמור
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Editor Area */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          <ReactQuill 
            ref={quillRef}
            theme="snow"
            value={content}
            onChange={setContent}
            modules={modules}
            className="flex-1 flex flex-col [&>.ql-container]:flex-1 [&>.ql-container]:overflow-y-auto [&>.ql-container]:text-right [&>.ql-editor]:text-right"
            placeholder="התחל לכתוב כאן..."
          />
        </div>

        {/* Sidebar - Variables / Preview */}
        <div className="w-64 border-r bg-slate-50 flex flex-col">
          {isTemplateMode ? (
            <>
              <div className="p-3 border-b bg-white">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Plus className="w-4 h-4 text-blue-600" />
                  שדות דינמיים
                </h3>
                <p className="text-xs text-slate-500 mt-1">לחץ להוספת שדה מהטבלה</p>
              </div>
              <ScrollArea className="flex-1 p-2">
                <div className="space-y-1">
                  {columns.filter(c => c.visible !== false).map(col => (
                    <button
                      key={col.key}
                      onClick={() => insertVariable(col.key, col.title)}
                      className="w-full text-right px-3 py-2 text-sm bg-white border border-slate-200 rounded hover:border-blue-400 hover:bg-blue-50 transition-all flex items-center justify-between group"
                    >
                      <span className="truncate">{col.title}</span>
                      <Type className="w-3 h-3 text-slate-400 group-hover:text-blue-500" />
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </>
          ) : (
            <div className="flex-1 flex flex-col">
              <div className="p-3 border-b bg-white">
                <h3 className="font-semibold text-sm">נתוני שורה</h3>
              </div>
              <ScrollArea className="flex-1 p-3">
                <div className="space-y-3">
                  {columns.filter(c => c.visible !== false).map(col => (
                    <div key={col.key} className="text-sm">
                      <span className="text-slate-500 text-xs block">{col.title}</span>
                      <div className="font-medium truncate bg-white p-1 rounded border border-slate-100">
                        {rowData?.[col.key] || '-'}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}