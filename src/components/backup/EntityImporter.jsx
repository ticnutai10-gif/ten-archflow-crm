
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Upload, X, Maximize2, Minimize2, Pencil, ArrowUp, ArrowDown, Plus, Save } from "lucide-react";
import { parseSpreadsheet } from "@/functions/parseSpreadsheet"; // New import
import * as Entities from "@/entities/all";

function inferExt(nameOrUrl = "") {
  try {
    const base = (nameOrUrl.split("?")[0] || "").toLowerCase();
    const parts = base.split(".");
    return parts.length > 1 ? parts.pop() : "";
  } catch {
    return "";
  }
}

export default function EntityImporter({ open = true, onClose, onDone, entityName }) {
  const Entity = Entities?.[entityName];

  // schema + fields
  const [schema, setSchema] = React.useState(null);
  const [targetFields, setTargetFields] = React.useState([]);

  // file + parsed data
  const [file, setFile] = React.useState(null);
  const [fileUrl, setFileUrl] = React.useState("");
  const [headers, setHeaders] = React.useState([]);
  const [headerOrder, setHeaderOrder] = React.useState([]);
  const [rows, setRows] = React.useState([]);

  // mapping
  const [mapping, setMapping] = React.useState({});

  // preview ux
  const [previewCount, setPreviewCount] = React.useState(20);
  const [wrap, setWrap] = React.useState(true);
  const [dense, setDense] = React.useState(false);
  const [fullScreen, setFullScreen] = React.useState(false);

  // sorting (icon 1-first vs last-first)
  const [sortConfig, setSortConfig] = React.useState({ key: null, dir: "asc" });

  // header add/rename
  const [newHeader, setNewHeader] = React.useState("");
  const [renamingKey, setRenamingKey] = React.useState(null);
  const [renameValue, setRenameValue] = React.useState("");

  // status
  const [busy, setBusy] = React.useState(false); // Used for isLoading from outline
  const [progress, setProgress] = React.useState(0);
  const [statusText, setStatusText] = React.useState("");
  const [errors, setErrors] = React.useState([]);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      if (!Entity || !Entity.schema) return;
      const s = await Entity.schema().catch(() => null);
      if (!mounted) return;
      setSchema(s || {});
      const fields = Object.keys(s?.properties || {}).map((k) => ({
        key: k,
        title: s?.properties?.[k]?.description || k
      }));
      setTargetFields(fields);
    })();
    return () => { mounted = false; };
  }, [entityName, Entity]);

  React.useEffect(() => {
    if (headers?.length) {
      setHeaderOrder(headers.slice());
    } else {
      setHeaderOrder([]);
    }
  }, [headers]);

  const reset = () => {
    setFile(null);
    setFileUrl("");
    setHeaders([]);
    setHeaderOrder([]);
    setRows([]);
    setMapping({});
    setBusy(false);
    setProgress(0);
    setStatusText("");
    setErrors([]);
    setNewHeader("");
    setRenamingKey(null);
    setRenameValue("");
    setSortConfig({ key: null, dir: "asc" });
  };

  const autoMapColumns = (hdrs = [], fields = []) => {
    const m = {};
    hdrs.forEach((h) => {
      const lower = String(h || "").trim().toLowerCase();
      const hit = fields.find(
        f => f.key.toLowerCase() === lower || (f.title && String(f.title).toLowerCase() === lower)
      );
      if (hit) m[h] = hit.key;
    });
    return m;
  };

  const handleFileUpload = async (event) => {
    const selectedFile = event.target.files?.[0] || event.dataTransfer?.files?.[0];
    if (!selectedFile) return;

    reset();
    setFile(selectedFile);
    setBusy(true);
    setStatusText("מעלה ומעבד קובץ...");

    try {
      // Upload file first
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      
      if (!uploadResponse.ok) {
        throw new Error('Upload failed');
      }
      
      const { file_url } = await uploadResponse.json();
      setFileUrl(file_url);
      
      // Parse the uploaded file
      const parseResponse = await parseSpreadsheet({ file_url });
      
      if (parseResponse.data?.status === 'success') {
        const { rows: parsedRows, headers: parsedHeaders } = parseResponse.data;
        
        setRows(parsedRows);
        setHeaders(parsedHeaders);
        setMapping(autoMapColumns(parsedHeaders, targetFields));
        setStatusText(`נמצאו ${parsedRows.length} שורות | ${parsedHeaders.length} כותרות`);
      } else {
        throw new Error(parseResponse.data?.error || 'Failed to parse file');
      }
    } catch (error) {
      console.error('File processing error:', error);
      setErrors((prev) => [...prev, `שגיאה בעיבוד הקובץ: ${error.message}`]);
      setStatusText("נכשל בעיבוד הקובץ");
    } finally {
      setBusy(false);
    }
  };

  const setSortAsc = (key) => setSortConfig({ key, dir: "asc" });
  const setSortDesc = (key) => setSortConfig({ key, dir: "desc" });

  const previewRows = React.useMemo(() => {
    if (!sortConfig?.key) return rows;
    const k = sortConfig.key;
    const dir = sortConfig.dir === "desc" ? -1 : 1;
    const copy = [...rows];
    copy.sort((a, b) => {
      const va = a?.[k] ?? "";
      const vb = b?.[k] ?? "";
      const aNum = typeof va === "number" || (/^-?\d+(\.\d+)?$/.test(String(va)));
      const bNum = typeof vb === "number" || (/^-?\d+(\.\d+)?$/.test(String(vb)));
      if (aNum && bNum) return (Number(va) - Number(vb)) * dir;
      return String(va).localeCompare(String(vb)) * dir;
    });
    return copy;
  }, [rows, sortConfig]);

  const addHeader = () => {
    const key = (newHeader || "").trim();
    if (!key) return;
    if (headers.includes(key)) {
      setNewHeader("");
      return;
    }
    const nextHeaders = [...headers, key];
    setHeaders(nextHeaders);
    setHeaderOrder(nextHeaders);
    setRows((prev) => prev.map((r) => ({ ...r, [key]: r?.[key] ?? "" })));
    setNewHeader("");
  };

  const startRename = (key) => {
    setRenamingKey(key);
    setRenameValue(key);
  };
  const commitRename = () => {
    const oldKey = renamingKey;
    const newKey = (renameValue || "").trim();
    if (!oldKey) return;
    if (!newKey || newKey === oldKey) {
      setRenamingKey(null);
      setRenameValue("");
      return;
    }
    if (headers.includes(newKey)) {
      setRenamingKey(null);
      setRenameValue("");
      return;
    }
    // update headers + order
    setHeaders((prev) => prev.map((h) => (h === oldKey ? newKey : h)));
    setHeaderOrder((prev) => prev.map((h) => (h === oldKey ? newKey : h)));
    // move data key
    setRows((prev) =>
      prev.map((r) => {
        const val = r?.[oldKey];
        const { [oldKey]: _, ...rest } = r || {};
        return { ...rest, [newKey]: val };
      })
    );
    // update mapping
    setMapping((prev) => {
      const next = { ...prev };
      if (next[oldKey] && !next[newKey]) next[newKey] = next[oldKey];
      delete next[oldKey];
      return next;
    });
    setRenamingKey(null);
    setRenameValue("");
  };

  const setCell = (rowIndex, key, value) => {
    setRows((prev) => {
      const copy = [...prev];
      copy[rowIndex] = { ...(copy[rowIndex] || {}), [key]: value };
      return copy;
    });
  };

  const mappingStats = React.useMemo(() => {
    const mapped = Object.values(mapping || {}).filter(Boolean).length;
    return { mapped, total: headers.length || 0, unmapped: Math.max(0, (headers.length || 0) - mapped) };
  }, [mapping, headers]);

  const updateMapping = (srcHeader, targetKey) => {
    setMapping((prev) => ({ ...prev, [srcHeader]: targetKey }));
  };

  const buildRecord = (rawRow, m) => {
    const out = {};
    for (const [src, trg] of Object.entries(m || {})) {
      if (!trg) continue;
      const v = rawRow?.[src];
      if (v === undefined || v === null) continue;
      out[trg] = Array.isArray(v) ? v.join(", ") : String(v).trim();
    }
    return out;
  };

  const startImport = async () => {
    if (!Entity || !rows.length) return;
    setBusy(true);
    setProgress(0);
    setStatusText("מייבא נתונים...");
    setErrors([]);
    const batchSize = 50;
    const mapped = rows.map((r) => buildRecord(r, mapping));
    let done = 0;
    for (let i = 0; i < mapped.length; i += batchSize) {
      const chunk = mapped.slice(i, i + batchSize);
      try {
        await Entity.bulkCreate(chunk);
      } catch (e) {
        // אם נכשל ב-bulk, ננסה אחד-אחד כדי להמשיך קדימה
        for (const rec of chunk) {
          try { // eslint-disable-line no-empty
            await Entity.create(rec);
          } catch (err) {
            setErrors((prev) => [...prev, `שורה ${i + 1} נכשלה: ${String(err?.message || err)}`]);
          }
        }
      }
      done += chunk.length;
      setProgress(Math.round((done / mapped.length) * 100));
    }
    setBusy(false);
    setStatusText("ייבוא הסתיים");
    onDone && onDone({ created: rows.length - errors.length, failed: errors.length });
  };

  if (!open) return null;

  const cellCls = `${wrap ? "whitespace-pre-wrap break-words" : "truncate"} ${dense ? "text-xs" : "text-sm"} px-3 py-2 text-right`;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
      <Card className={`w-full ${fullScreen ? "max-w-[95vw] h-[90vh]" : "max-w-5xl max-h-[90vh]"} overflow-auto rounded-2xl`}>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>ייבוא מתקדם • {entityName}</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setFullScreen((v) => !v)}>
              {fullScreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => { reset(); onClose && onClose(); }}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-5" dir="rtl">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>בחר קובץ CSV/XLSX/Excel</Label>
              <div className="flex items-center gap-2">
                <Input 
                  type="file" 
                  accept=".csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv" 
                  onChange={handleFileUpload} 
                />
              </div>
              {statusText && <div className="text-sm text-slate-600 mt-1">{statusText}</div>}
            </div>
            <div className="space-y-2">
              <Label>התקדמות</Label>
              <Progress value={progress} className="h-2" />
              <div className="text-xs text-slate-500">{busy ? "מעבד..." : "מוכן לייבוא"}</div>
            </div>
          </div>

          {/* Mapping controls */}
          {headers.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-800">
                  מיפוי עמודות • {mappingStats.mapped}/{mappingStats.total} ממופות
                </h3>
                <div className="flex items-center gap-2">
                  <Button onClick={startImport} disabled={busy || rows.length === 0}>
                    {busy ? "מייבא..." : "התחל יבוא"}
                  </Button>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                {headers.map((h) => (
                  <div key={h} className="p-3 border rounded-lg bg-white">
                    <div className="text-xs text-slate-500 mb-1">עמודה מקורית</div>
                    <div className="font-medium mb-2 truncate">{h}</div>
                    <Select value={mapping[h] || ""} onValueChange={(v) => updateMapping(h, v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="בחר שדה יעד" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={null}>(אל תמפה)</SelectItem>
                        {targetFields.map((f) => (
                          <SelectItem key={f.key} value={f.key}>{f.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Preview controls */}
          {headers.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Label className="text-sm text-slate-600">כמות שורות לתצוגה</Label>
                <Select
                  value={String(previewCount)}
                  onValueChange={(v) => setPreviewCount(Number(v))}
                >
                  <SelectTrigger className="w-28 h-8">
                    <SelectValue placeholder="בחר כמות" />
                  </SelectTrigger>
                  <SelectContent align="end">
                    {[10, 20, 30, 100].map((n) => (
                      <SelectItem key={n} value={String(n)}>{n} שורות</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min={1}
                  max={Math.max(1, rows.length)}
                  value={previewCount}
                  onChange={(e) => setPreviewCount(Math.max(1, Math.min(rows.length || 1, Number(e.target.value || 1))))}
                  className="w-24 h-8"
                />
              </div>

              <div className="flex items-center gap-2">
                <Input
                  placeholder="הוסף כותרת חדשה..."
                  value={newHeader}
                  onChange={(e) => setNewHeader(e.target.value)}
                  className="h-8 w-56"
                  onKeyDown={(e) => { if (e.key === "Enter") addHeader(); }}
                />
                <Button size="sm" onClick={addHeader} disabled={!newHeader.trim()}>
                  <Plus className="w-4 h-4 ml-1" /> הוסף עמודה
                </Button>
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={wrap} onChange={(e) => setWrap(e.target.checked)} />
                  עטיפת טקסט
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={dense} onChange={(e) => setDense(e.target.checked)} />
                  תצוגה דחוסה
                </label>
              </div>
            </div>
          )}

          {/* Preview table */}
          {headers.length > 0 && (
            <div className="border rounded-lg overflow-auto max-h-[60vh]">
              <div className="min-w-[900px]">
                <table className="w-full border-collapse">
                  <thead className="bg-slate-50 sticky top-0 z-10">
                    <tr>
                      {headerOrder.map((h) => (
                        <th key={h} className="border-b border-slate-200 p-2 text-right font-medium text-slate-700 align-top">
                          <div className="flex items-center justify-between gap-2">
                            {renamingKey === h ? (
                              <div className="flex items-center gap-2">
                                <Input
                                  value={renameValue}
                                  onChange={(e) => setRenameValue(e.target.value)}
                                  onKeyDown={(e) => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") { setRenamingKey(null); setRenameValue(""); } }}
                                  onBlur={commitRename}
                                  className="h-8"
                                  autoFocus
                                />
                                <Button size="sm" onClick={commitRename}>
                                  <Save className="w-4 h-4 ml-1" /> שמור
                                </Button>
                              </div>
                            ) : (
                              <>
                                <span className="truncate" title={h}>{h}</span>
                                <div className="flex items-center gap-1">
                                  <Button variant="ghost" size="icon" className="h-7 w-7" title="מיין מהתחלה (1 ראשון)" onClick={() => setSortAsc(h)}>
                                    <ArrowUp className="w-4 h-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" title="מיין מהסוף (האחרון ראשון)" onClick={() => setSortDesc(h)}>
                                    <ArrowDown className="w-4 h-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" title="ערוך כותרת" onClick={() => startRename(h)}>
                                    <Pencil className="w-4 h-4" />
                                  </Button>
                                </div>
                              </>
                            )}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.slice(0, previewCount).map((r, idx) => (
                      <tr key={`row-${idx}`} className={idx % 2 ? "bg-white" : "bg-slate-25"}>
                        {headerOrder.map((h) => (
                          <td key={`${idx}-${h}`} className="border-t border-slate-200 align-top">
                            <input
                              className={`w-full bg-transparent outline-none ${cellCls}`}
                              value={String(r?.[h] ?? "")}
                              onChange={(e) => setCell(idx, h, e.target.value)}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                    {rows.length === 0 && (
                      <tr>
                        <td colSpan={headerOrder.length} className="text-center py-8 text-slate-500">
                          אין נתונים להצגה
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {errors.length > 0 && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
              <div className="font-medium mb-1">תקלות</div>
              <ul className="list-disc mr-5">
                {errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
