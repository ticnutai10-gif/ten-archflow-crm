import React, { useState } from 'react';
import { QuoteFile } from '@/entities/QuoteFile';
import { uploadFile } from '@/functions/uploadFile';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Upload, File, Download, Trash2, Eye } from 'lucide-react';
import { toast } from 'sonner';

export default function QuoteFiles({ quote, files, onFilesUpdate }) {
  const [isUploading, setIsUploading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('מסמך');
  const [description, setDescription] = useState('');

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const { data } = await uploadFile(formData);
      
      await QuoteFile.create({
        quote_id: quote.id,
        quote_number: quote.quote_number,
        file_url: data.file_url,
        filename: data.filename,
        file_type: data.type,
        file_size: data.size,
        category: selectedCategory,
        description: description
      });

      toast.success('קובץ הועלה בהצלחה!');
      onFilesUpdate();
      setDescription('');
      event.target.value = '';
    } catch (error) {
      toast.error('שגיאה בהעלאת הקובץ');
    }
    setIsUploading(false);
  };

  const handleDeleteFile = async (fileId) => {
    if (confirm('האם אתה בטוח שברצונך למחוק קובץ זה?')) {
      try {
        await QuoteFile.delete(fileId);
        toast.success('הקובץ נמחק בהצלחה');
        onFilesUpdate();
      } catch (error) {
        toast.error('שגיאה במחיקת הקובץ');
      }
    }
  };

  const formatFileSize = (bytes) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Byte';
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getCategoryColor = (category) => {
    const colors = {
      'חוזה': 'bg-green-100 text-green-800',
      'מסמך': 'bg-blue-100 text-blue-800',
      'תמונה': 'bg-purple-100 text-purple-800',
      'אחר': 'bg-slate-100 text-slate-800'
    };
    return colors[category] || colors['אחר'];
  };

  return (
    <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle>קבצים ומסמכים</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Section */}
        <div className="border-2 border-dashed border-slate-300 rounded-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="space-y-2">
              <Label>קטגוריה</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="חוזה">חוזה חתום</SelectItem>
                  <SelectItem value="מסמך">מסמך</SelectItem>
                  <SelectItem value="תמונה">תמונה</SelectItem>
                  <SelectItem value="אחר">אחר</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>תיאור (אופציונלי)</Label>
              <Input 
                value={description} 
                onChange={(e) => setDescription(e.target.value)}
                placeholder="תיאור הקובץ..."
              />
            </div>
          </div>
          
          <div className="text-center">
            <input
              type="file"
              id="file-upload"
              className="hidden"
              onChange={handleFileUpload}
              disabled={isUploading}
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.xlsx,.xls"
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              <div className="flex flex-col items-center justify-center space-y-2">
                <Upload className="w-8 h-8 text-slate-400" />
                <div className="text-slate-600">
                  {isUploading ? 'מעלה...' : 'לחץ להעלאת קובץ או גרור קובץ לכאן'}
                </div>
                <div className="text-xs text-slate-500">
                  PDF, Word, תמונות, Excel - עד 10MB
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Files List */}
        <div className="space-y-3">
          {files.length === 0 ? (
            <div className="text-center py-8">
              <File className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">אין קבצים עדיין</p>
            </div>
          ) : (
            files.map((file) => (
              <div key={file.id} className="flex items-center gap-4 p-4 border border-slate-200 rounded-lg hover:shadow-md transition-all">
                <File className="w-8 h-8 text-slate-400" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-slate-900">{file.filename}</h4>
                    <span className={`px-2 py-1 rounded-full text-xs ${getCategoryColor(file.category)}`}>
                      {file.category}
                    </span>
                  </div>
                  <div className="text-sm text-slate-600">
                    {file.description && <span>{file.description} • </span>}
                    {formatFileSize(file.file_size)}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                  >
                    <a href={file.file_url} target="_blank" rel="noopener noreferrer">
                      <Eye className="w-4 h-4" />
                    </a>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                  >
                    <a href={file.file_url} download={file.filename}>
                      <Download className="w-4 h-4" />
                    </a>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteFile(file.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}