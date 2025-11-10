import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Upload, FileText } from "lucide-react";
import { Document } from "@/entities/Document";
import { UploadFile } from "@/integrations/Core";

export default function DocumentUploader({ defaultCategory = "אחר", preset = {} , onUploaded, dir = "rtl" }) {
  const [file, setFile] = React.useState(null);
  const [title, setTitle] = React.useState("");
  const [category, setCategory] = React.useState(defaultCategory);
  const [isUploading, setIsUploading] = React.useState(false);

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    const { file_url } = await UploadFile({ file });
    const docPayload = {
      title: title || file.name,
      description: "",
      file_url,
      filename: file.name,
      file_type: file.type || "",
      file_size: file.size || 0,
      category,
      tags: [],
      ...preset
    };
    const created = await Document.create(docPayload);
    setFile(null);
    setTitle("");
    setCategory(defaultCategory);
    setIsUploading(false);
    onUploaded && onUploaded(created);
  };

  return (
    <div className="p-4 border rounded-xl bg-white/80 backdrop-blur-sm" dir={dir}>
      <div className="grid md:grid-cols-3 gap-3">
        <div className="space-y-1 md:col-span-2">
          <Label className="text-sm text-slate-700">בחר קובץ</Label>
          <Input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          <Input placeholder="כותרת (רשות)" value={title} onChange={(e) => setTitle(e.target.value)} className="mt-2" />
        </div>
        <div className="space-y-1">
          <Label className="text-sm text-slate-700">קטגוריה</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue placeholder="בחר קטגוריה" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="שרטוט">שרטוט</SelectItem>
              <SelectItem value="חוזה">חוזה</SelectItem>
              <SelectItem value="תמונה">תמונה</SelectItem>
              <SelectItem value="חשבונית">חשבונית</SelectItem>
              <SelectItem value="אחר">אחר</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex justify-end mt-3">
        <Button onClick={handleUpload} disabled={!file || isUploading} className="gap-2">
          {isUploading ? <FileText className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
          {isUploading ? "מעלה..." : "העלה מסמך"}
        </Button>
      </div>
    </div>
  );
}