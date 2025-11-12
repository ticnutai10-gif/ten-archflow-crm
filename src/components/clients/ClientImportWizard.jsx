// ... keep all imports and CLIENT_SCHEMA ...

import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import {
  Upload, FileSpreadsheet, Sparkles, Check, X, AlertTriangle, ArrowRight, Eye, Loader2,
  CheckCircle2, Terminal, Wand2, FileText, Database, Zap, Table as TableIcon, AlertCircle,
  RefreshCw, Brain, XCircle, CheckSquare, Square, Info, Layers, Edit2
} from 'lucide-react';
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import TableManager from './TableManager';

const CLIENT_SCHEMA = {
  name: { label: 'שם לקוח', required: true, type: 'text', example: 'חברת ABC', 
    synonyms: ['שם', 'שם לקוח', 'לקוח', 'שם מלא', 'שם החברה', 'name', 'full name', 'client name', 'customer', 'client'] },
  email: { label: 'אימייל', required: false, type: 'email', example: 'info@abc.com',
    synonyms: ['מייל', 'אימייל', 'אימיל', 'דוא"ל', 'דואל', 'email', 'e-mail', 'mail', 'e mail'] },
  phone: { label: 'טלפון', required: false, type: 'phone', example: '050-1234567',
    synonyms: ['טלפון', 'טל', 'נייד', 'פלאפון', 'פלפון', 'טלפון נייד', 'phone', 'mobile', 'cell', 'telephone', 'tel', 'cellphone'] },
  company: { label: 'חברה', required: false, type: 'text', example: 'ABC בע"מ',
    synonyms: ['חברה', 'שם חברה', 'ארגון', 'עסק', 'company', 'organization', 'business', 'firm'] },
  address: { label: 'כתובת', required: false, type: 'text', example: 'רחוב הרצל 1',
    synonyms: ['כתובת', 'רחוב', 'עיר', 'מען', 'address', 'street', 'city', 'location'] },
  position: { label: 'תפקיד', required: false, type: 'text', example: 'מנכ"ל',
    synonyms: ['תפקיד', 'תפקידו', 'משרה', 'position', 'title', 'role', 'job title'] },
  status: { label: 'סטטוס', required: false, type: 'select', example: 'פעיל',
    synonyms: ['סטטוס', 'מצב', 'סטאטוס', 'status', 'state', 'condition'] },
  budget_range: { label: 'טווח תקציב', required: false, type: 'select', example: '1M-2M',
    synonyms: ['תקציב', 'טווח תקציב', 'תק', 'budget', 'price range', 'budget range'] },
  source: { label: 'מקור הגעה', required: false, type: 'select', example: 'הפנייה',
    synonyms: ['מקור', 'מקור הגעה', 'מקור לקוח', 'source', 'lead source', 'origin'] },
  notes: { label: 'הערות', required: false, type: 'textarea', example: 'לקוח VIP',
    synonyms: ['הערות', 'הערה', 'הע', 'notes', 'note', 'comments', 'remarks'] },
  phone_secondary: { label: 'טלפון נוסף', required: false, type: 'phone', example: '03-1234567',
    synonyms: ['טלפון נוסף', 'טלפון משני', 'טל 2', 'secondary phone', 'phone 2', 'additional phone'] },
  whatsapp: { label: 'וואטסאפ', required: false, type: 'phone', example: '050-1234567',
    synonyms: ['וואטסאפ', 'ווצאפ', 'whatsapp', 'wa', 'wapp'] },
  website: { label: 'אתר', required: false, type: 'url', example: 'www.abc.com',
    synonyms: ['אתר', 'אתר אינטרנט', 'website', 'site', 'web', 'url'] },
  linkedin: { label: 'לינקדאין', required: false, type: 'url', example: 'linkedin.com/company/abc',
    synonyms: ['לינקדאין', 'לינקדין', 'linkedin', 'linked in'] },
  preferred_contact: { label: 'תקשורת מועדפת', required: false, type: 'select', example: 'אימייל',
    synonyms: ['תקשורת מועדפת', 'דרך תקשורת', 'preferred contact', 'contact method'] }
};

// ... keep all validation and matching functions unchanged ...

// ... keep STEPS constant ...

const STEPS = {
  SELECT_MODE: 0,
  SELECT_TABLE: 1,
  UPLOAD: 2,
  PARSE: 3,
  NAME_TABLE: 4,
  CREATE_TABLE: 5,
  MAP: 6,
  VALIDATE: 7,
  IMPORT: 8,
  COMPLETE: 9
};

export default function ClientImportWizard({ open, onClose, onSuccess }) {
  // ... keep all existing state ...
  
  const [step, setStep] = useState(STEPS.SELECT_MODE);
  const [file, setFile] = useState(null);
  const [rawHeaders, setRawHeaders] = useState([]);
  const [rawRows, setRawRows] = useState([]);
  const [mapping, setMapping] = useState({});
  const [validatedData, setValidatedData] = useState([]);
  const [validationErrors, setValidationErrors] = useState([]);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState(null);
  const [logs, setLogs] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importMode, setImportMode] = useState(null);
  const [targetTable, setTargetTable] = useState(null);
  const [newTableName, setNewTableName] = useState('');
  const [newTableDescription, setNewTableDescription] = useState('');
  const [detectedSheetName, setDetectedSheetName] = useState('');
  const [showTableSelector, setShowTableSelector] = useState(false);
  const [previewRows, setPreviewRows] = useState([]);
  const [skippedRows, setSkippedRows] = useState(new Set());
  const [rowValidations, setRowValidations] = useState({});
  const [tableStructure, setTableStructure] = useState(null);
  const [editingHeaders, setEditingHeaders] = useState({}); // NEW: For editing header names

  // ... keep all existing functions (log, parseCSV, parseExcel, handleFileSelect, etc.) ...

  // NEW: Function to update header name
  const updateHeaderName = (index, newName) => {
    setRawHeaders(prev => {
      const updated = [...prev];
      updated[index] = newName;
      return updated;
    });
    setEditingHeaders(prev => {
      const updated = { ...prev };
      delete updated[index];
      return updated;
    });
    toast.success('שם הכותרת עודכן');
  };

  // ... keep all other existing functions unchanged ...

  // בשלב MAP, עדכן את הרינדור של הכותרות:
  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-6xl h-[90vh] p-0" dir="rtl">
          <div className="flex flex-col h-full">
            {/* ... keep header section ... */}

            <ScrollArea className="flex-1 px-6">
              <div className="py-4 space-y-4">
                {/* ... keep logs, SELECT_MODE, UPLOAD, PARSE, etc ... */}

                {step === STEPS.MAP && (
                  <div className="space-y-4 pb-20">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-bold">מיפוי עמודות</h3>
                        <p className="text-sm text-slate-600">דיוק {Math.round((mappedCount/rawHeaders.length)*100)}%</p>
                      </div>
                      <Badge className="bg-gradient-to-r from-purple-100 to-blue-100 border-purple-300">
                        <Brain className="w-3 h-3 ml-1" />
                        {mappedCount} / {rawHeaders.length}
                      </Badge>
                    </div>

                    <Alert className="bg-blue-50 border-blue-200">
                      <Info className="w-5 h-5 text-blue-600" />
                      <AlertDescription>
                        <div className="font-semibold text-blue-900 mb-1">💡 טיפ</div>
                        <div className="text-sm text-blue-800">
                          ברירת המחדל היא שם הכותרת מהקובץ. לחץ על העיפרון ✏️ לשינוי שם הכותרת, או בחר שדה אחר מהרשימה.
                        </div>
                      </AlertDescription>
                    </Alert>

                    <div className="space-y-3">
                      {rawHeaders.map((header, index) => {
                        const mappedField = mapping[index];
                        const isMapped = mappedField && mappedField !== 'skip';
                        const targetFields = importMode === 'client' ? Object.keys(CLIENT_SCHEMA) : targetTable?.columns?.map(col => col.key) || [];
                        const isEditingName = editingHeaders[index] !== undefined;
                        
                        return (
                          <Card key={index} className={`p-4 transition-all ${isMapped ? 'border-2 border-green-400 bg-green-50/50 shadow-md' : 'hover:border-purple-300'}`}>
                            <div className="flex items-center gap-3">
                              {/* שם הכותרת מהקובץ - עם אפשרות עריכה */}
                              <div className="flex-1 min-w-0">
                                <div className="text-xs text-slate-500 mb-1">עמודה {index + 1}</div>
                                {isEditingName ? (
                                  <div className="flex items-center gap-2">
                                    <Input
                                      value={editingHeaders[index]}
                                      onChange={(e) => setEditingHeaders(prev => ({ ...prev, [index]: e.target.value }))}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          updateHeaderName(index, editingHeaders[index]);
                                        }
                                        if (e.key === 'Escape') {
                                          setEditingHeaders(prev => {
                                            const updated = { ...prev };
                                            delete updated[index];
                                            return updated;
                                          });
                                        }
                                      }}
                                      onBlur={() => {
                                        if (editingHeaders[index]?.trim()) {
                                          updateHeaderName(index, editingHeaders[index]);
                                        } else {
                                          setEditingHeaders(prev => {
                                            const updated = { ...prev };
                                            delete updated[index];
                                            return updated;
                                          });
                                        }
                                      }}
                                      className="h-8 text-sm"
                                      autoFocus
                                    />
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-8 w-8"
                                      onClick={() => updateHeaderName(index, editingHeaders[index])}
                                    >
                                      <Check className="w-4 h-4 text-green-600" />
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 group">
                                    <div className="font-semibold truncate flex-1">{header || `עמודה ${index + 1}`}</div>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                      onClick={() => setEditingHeaders(prev => ({ ...prev, [index]: header }))}
                                      title="ערוך שם כותרת"
                                    >
                                      <Edit2 className="w-3 h-3 text-blue-600" />
                                    </Button>
                                  </div>
                                )}
                                <div className="text-xs text-slate-600 truncate mt-1">דוגמה: {rawRows[0]?.[index] || '—'}</div>
                              </div>

                              <ArrowRight className={`w-5 h-5 flex-shrink-0 ${isMapped ? 'text-green-600' : 'text-slate-400'}`} />

                              {/* בחירת שדה יעד */}
                              <div className="flex-1 min-w-0">
                                <Select 
                                  value={mappedField || header} 
                                  onValueChange={(value) => setMapping({ ...mapping, [index]: value })}
                                >
                                  <SelectTrigger className={isMapped ? 'border-2 border-green-500 bg-green-50' : ''}>
                                    <SelectValue placeholder={header || "בחר שדה..."} />
                                  </SelectTrigger>
                                  <SelectContent dir="rtl">
                                    <SelectItem value="skip">
                                      <div className="flex items-center gap-2">
                                        <X className="w-4 h-4" />
                                        דלג על עמודה זו
                                      </div>
                                    </SelectItem>
                                    {targetFields.map(field => (
                                      <SelectItem key={field} value={field}>
                                        {importMode === 'client'
                                          ? CLIENT_SCHEMA[field]?.label
                                          : targetTable?.columns?.find(c => c.key === field)?.title || field
                                        }
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <div className="text-xs text-slate-500 mt-1">
                                  {isMapped && mappedField !== 'skip' && (
                                    <span className="text-green-600">✓ ממופה ל-{
                                      importMode === 'client' 
                                        ? CLIENT_SCHEMA[mappedField]?.label 
                                        : targetTable?.columns?.find(c => c.key === mappedField)?.title || mappedField
                                    }</span>
                                  )}
                                  {mappedField === 'skip' && <span className="text-slate-400">⊗ עמודה זו תדולג</span>}
                                  {!mappedField && <span className="text-blue-600">📌 שם הכותרת כברירת מחדל</span>}
                                </div>
                              </div>

                              <div className="flex-shrink-0">
                                {isMapped && mappedField !== 'skip' ? 
                                  <CheckCircle2 className="w-6 h-6 text-green-600" /> : 
                                  <AlertCircle className="w-6 h-6 text-slate-400" />
                                }
                              </div>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ... keep all other steps (VALIDATE, IMPORT, COMPLETE) unchanged ... */}
              </div>
            </ScrollArea>

            {/* ... keep footer buttons ... */}
          </div>
        </DialogContent>
      </Dialog>

      {/* ... keep TableManager ... */}
    </>
  );
}