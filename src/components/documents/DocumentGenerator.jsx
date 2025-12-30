import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FileText, Plus, Edit, Copy, Trash2, Printer } from "lucide-react";
import SmartDocEditor from "./SmartDocEditor";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function DocumentGenerator({ 
  open, 
  onClose, 
  spreadsheetId, 
  rowData, // Can be null if managing templates
  columns 
}) {
  const [mode, setMode] = useState('list'); // list, edit, create, view
  const [templates, setTemplates] = useState([]);
  const [instances, setInstances] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && spreadsheetId) {
      loadDocuments();
    }
  }, [open, spreadsheetId, rowData?.id]);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      // Load templates
      const temps = await base44.entities.SmartDocument.filter({
        spreadsheet_id: spreadsheetId,
        type: 'template'
      });
      setTemplates(temps || []);

      // If viewing a row, load its instances
      if (rowData?.id) {
        const insts = await base44.entities.SmartDocument.filter({
          spreadsheet_id: spreadsheetId,
          row_id: rowData.id,
          type: 'instance'
        });
        setInstances(insts || []);
      }
    } catch (error) {
      console.error("Failed to load docs:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = () => {
    setSelectedDoc(null);
    setMode('edit_template');
  };

  const handleEditDoc = (doc) => {
    setSelectedDoc(doc);
    setMode(doc.type === 'template' ? 'edit_template' : 'edit_instance');
  };

  const handleUseTemplate = (template) => {
    // Create a new instance in memory from template
    const newInstance = {
      title: `${template.title} - ${rowData[columns[0]?.key] || 'חדש'}`,
      content: template.content, // Copy content
      type: 'instance',
      spreadsheet_id: spreadsheetId,
      row_id: rowData.id
    };
    
    // Inject variables immediately for the initial view
    let processedContent = template.content;
    columns.forEach(col => {
      const placeholder = `{{${col.key}}}`;
      const value = rowData[col.key] || '';
      processedContent = processedContent.split(placeholder).join(value);
    });
    newInstance.content = processedContent;

    setSelectedDoc(newInstance);
    setMode('edit_instance');
  };

  const handleSave = async (docData) => {
    try {
      const payload = {
        ...docData,
        spreadsheet_id: spreadsheetId,
        type: mode === 'edit_template' ? 'template' : 'instance',
        row_id: mode === 'edit_template' ? null : rowData?.id
      };

      if (selectedDoc?.id) {
        await base44.entities.SmartDocument.update(selectedDoc.id, payload);
        toast.success("המסמך עודכן בהצלחה");
      } else {
        await base44.entities.SmartDocument.create(payload);
        toast.success("המסמך נוצר בהצלחה");
      }
      
      await loadDocuments();
      setMode('list');
    } catch (error) {
      console.error("Save error:", error);
      toast.error("שגיאה בשמירה");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("האם למחוק מסמך זה?")) return;
    try {
      await base44.entities.SmartDocument.delete(id);
      loadDocuments();
      toast.success("נמחק בהצלחה");
    } catch (e) {
      toast.error("שגיאה במחיקה");
    }
  };

  const handlePrint = (doc) => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html dir="rtl">
        <head>
          <title>${doc.title}</title>
          <style>
            body { font-family: sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
            img { max-width: 100%; }
          </style>
        </head>
        <body>
          <h1>${doc.title}</h1>
          <div>${doc.content}</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-5xl h-[85vh] p-0 flex flex-col" dir="rtl">
        {(mode === 'edit_template' || mode === 'edit_instance') ? (
          <SmartDocEditor
            document={selectedDoc}
            columns={columns}
            rowData={rowData}
            onSave={handleSave}
            onClose={() => setMode('list')}
            isTemplateMode={mode === 'edit_template'}
          />
        ) : (
          <>
            <DialogHeader className="p-6 border-b">
              <DialogTitle className="flex items-center gap-2 text-xl">
                <FileText className="w-6 h-6 text-blue-600" />
                {rowData ? `מסמכים עבור: ${rowData[columns[0]?.key] || 'פריט'}` : 'ניהול תבניות מסמכים'}
              </DialogTitle>
            </DialogHeader>
            
            <div className="flex-1 bg-slate-50 p-6 overflow-y-auto">
              <Tabs defaultValue={rowData ? "instances" : "templates"} className="w-full">
                <TabsList className="mb-4">
                  {rowData && <TabsTrigger value="instances">מסמכים קיימים ({instances.length})</TabsTrigger>}
                  <TabsTrigger value="templates">תבניות ({templates.length})</TabsTrigger>
                </TabsList>

                {rowData && (
                  <TabsContent value="instances" className="space-y-4">
                    {instances.length === 0 ? (
                      <div className="text-center py-12 text-slate-500">
                        <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>אין מסמכים לשורה זו.</p>
                        <p className="text-sm">בחר תבנית כדי ליצור מסמך חדש.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {instances.map(doc => (
                          <DocCard 
                            key={doc.id} 
                            doc={doc} 
                            onEdit={() => handleEditDoc(doc)}
                            onDelete={() => handleDelete(doc.id)}
                            onPrint={() => handlePrint(doc)}
                          />
                        ))}
                      </div>
                    )}
                  </TabsContent>
                )}

                <TabsContent value="templates" className="space-y-4">
                  <div className="flex justify-end mb-4">
                    <Button onClick={handleCreateTemplate} className="gap-2">
                      <Plus className="w-4 h-4" />
                      צור תבנית חדשה
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {templates.map(temp => (
                      <Card key={temp.id} className="hover:shadow-md transition-all cursor-pointer border-dashed border-2">
                        <CardContent className="p-4">
                          <div className="font-bold text-lg mb-2 truncate">{temp.title}</div>
                          <p className="text-xs text-slate-500 mb-4">
                            עודכן: {new Date(temp.last_modified || temp.created_date).toLocaleDateString('he-IL')}
                          </p>
                          <div className="flex gap-2">
                            {rowData ? (
                              <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-700" onClick={() => handleUseTemplate(temp)}>
                                צור מסמך
                              </Button>
                            ) : (
                              <Button size="sm" variant="outline" className="flex-1" onClick={() => handleEditDoc(temp)}>
                                <Edit className="w-4 h-4" />
                              </Button>
                            )}
                            {!rowData && (
                              <Button size="sm" variant="ghost" className="text-red-500" onClick={() => handleDelete(temp.id)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DocCard({ doc, onEdit, onDelete, onPrint }) {
  return (
    <Card className="hover:shadow-md transition-all group">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div className="p-2 bg-blue-50 rounded-lg">
            <FileText className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onPrint} title="הדפס">
              <Printer className="w-4 h-4 text-slate-600" />
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:bg-red-50" onClick={onDelete}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <h3 className="font-bold text-slate-900 truncate mb-1" title={doc.title}>{doc.title}</h3>
        <p className="text-xs text-slate-500 mb-4">
          {new Date(doc.last_modified || doc.created_date).toLocaleString('he-IL')}
        </p>
        <Button size="sm" variant="outline" className="w-full gap-2" onClick={onEdit}>
          <Edit className="w-3 h-3" />
          ערוך מסמך
        </Button>
      </CardContent>
    </Card>
  );
}