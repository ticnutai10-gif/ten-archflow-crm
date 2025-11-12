
import React, { useState, useEffect, useMemo } from 'react';
import { User, ClientFile } from '@/entities/all';
import { googleDrive } from '@/functions/googleDrive';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FolderPlus, FilePlus, RefreshCw, Folder, File, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { UploadFile as CoreUploadFile } from '@/integrations/Core';
import { Input } from '@/components/ui/input';

// Helper to map mime to type
const mapMimeToType = (mime = "") => {
  if (mime.includes('spreadsheet')) return 'sheet';
  if (mime.includes('document') || mime.includes('msword') || mime.includes('officedocument')) return 'doc';
  if (mime.includes('pdf')) return 'pdf';
  if (mime.startsWith('image/')) return 'image';
  return 'other';
};

export default function ClientFiles({ client, files, onFilesUpdate }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [clientFolder, setClientFolder] = useState(null);
  const [driveFiles, setDriveFiles] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      const currentUser = await User.me();
      setUser(currentUser);
      
      // ✅ הגנה על files prop
      if (!Array.isArray(files)) {
        console.error('❌ [ClientFiles] files is not an array!', files);
        setClientFolder(null);
        setIsLoading(false);
        return;
      }
      
      const existingFolder = files.find(f => f?.type === 'folder');
      setClientFolder(existingFolder);
      
      if (existingFolder?.google_file_id) {
        await fetchDriveFiles(existingFolder.google_file_id);
      }
      setIsLoading(false);
    };
    loadData();
  }, [client, files]);

  const getFileType = (mimeType) => {
    if (mimeType.includes('spreadsheet')) return 'sheet';
    if (mimeType.includes('document')) return 'doc';
    if (mimeType.includes('pdf')) return 'pdf';
    if (mimeType.includes('image')) return 'image';
    return 'other';
  };

  const fetchDriveFiles = async (folderId) => {
    try {
      const { data } = await googleDrive({ action: 'list_files', payload: { folderId } });
      
      // ✅ הגנה על data
      const validData = Array.isArray(data) ? data : [];
      setDriveFiles(validData);
    } catch (error) {
      console.error('❌ [ClientFiles] Error fetching drive files:', error);
      toast.error('שגיאה בטעינת קבצים מ-Google Drive');
      setDriveFiles([]);
    }
  };

  const handleCreateRootFolder = async () => {
    setIsLoading(true);
    try {
      const { data } = await googleDrive({ action: 'create_root_folder' });
      const refreshedUser = await User.me();
      setUser(refreshedUser);
      toast.success('תיקיית בסיס נוצרה בהצלחה ב-Google Drive');
      // No need to create client folder immediately after root, user can do it later
      // await handleCreateClientFolder(data.folderId); // This was previously here, but we now allow separate creation
    } catch (error) {
      toast.error('שגיאה ביצירת תיקיית בסיס');
    }
    setIsLoading(false);
  };
  
  const handleCreateClientFolder = async (rootFolderId) => {
    setIsLoading(true);
    try {
      const { data: folderData } = await googleDrive({ action: 'create_client_folder', payload: { clientName: client.name, rootFolderId } });
      await ClientFile.create({
        client_id: client.id,
        client_name: client.name,
        google_file_id: folderData.id,
        name: folderData.name,
        link: folderData.webViewLink,
        type: 'folder',
        mime_type: 'application/vnd.google-apps.folder'
      });
      onFilesUpdate();
      toast.success(`תיקייה עבור ${client.name} נוצרה`);
    } catch(error) {
       toast.error('שגיאה ביצירת תיקיית לקוח');
    }
    setIsLoading(false);
  }
  
  const handleCreateSheet = async () => {
      setIsLoading(true);
      const sheetName = prompt('אנא הכנס שם לטבלה:', `סיכום פגישה - ${client.name}`);
      if(sheetName && clientFolder) {
          try {
              const { data } = await googleDrive({ action: 'create_sheet', payload: { sheetName, folderId: clientFolder.google_file_id } });
              toast.success("טבלה חדשה נוצרה בהצלחה!");
              await fetchDriveFiles(clientFolder.google_file_id);
          } catch(error) {
              toast.error("שגיאה ביצירת טבלה חדשה.");
          }
      }
      setIsLoading(false);
  }

  // NEW: local uploaded files (from DB, not Drive)
  // ✅ הגנה על localFiles
  const localFiles = useMemo(() => {
    if (!Array.isArray(files)) {
      console.error('❌ [ClientFiles] files is not an array for localFiles!', files);
      return [];
    }
    return files.filter(f => f && f.type !== 'folder' && !f.google_file_id);
  }, [files]);

  // NEW: upload local file (no Google required)
  const inputRef = React.useRef(null);
  const handleChooseFile = () => inputRef.current?.click();

  const handleUploadLocalFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsLoading(true);
    try {
      const { file_url } = await CoreUploadFile({ file });
      await ClientFile.create({
        client_id: client.id,
        client_name: client.name,
        name: file.name,
        mime_type: file.type,
        link: file_url,
        file_url: file_url, // Storing file_url explicitly, might be redundant with link
        type: mapMimeToType(file.type)
      });
      toast.success('הקובץ הועלה בהצלחה');
      onFilesUpdate?.();
    } catch (err) {
      console.error('Upload error:', err);
      toast.error('שגיאה בהעלאת הקובץ');
    } finally {
      setIsLoading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  if (isLoading) {
    return <Card><CardContent><p className="p-4">טוען נתונים...</p></CardContent></Card>;
  }
  
  // The old logic for blocking UI if Drive is not configured or client folder is missing is moved inside the main return block

  return (
    <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
      <CardHeader className="flex flex-row justify-between items-center">
        <CardTitle>קבצים וקישורים</CardTitle>
        <div className="flex gap-2">
          {/* Always available: local upload */}
          <Button variant="default" size="sm" onClick={handleChooseFile} disabled={isLoading}>
            <FilePlus className="ml-2 w-4 h-4" /> העלה קובץ
          </Button>
          <Input ref={inputRef} type="file" className="hidden" onChange={handleUploadLocalFile} />

          {/* Drive actions (only if client folder exists) */}
          {clientFolder && (
            <>
              <Button variant="outline" size="sm" onClick={handleCreateSheet} disabled={isLoading}>
                <FilePlus className="ml-2 w-4 h-4" /> טבלה חדשה (Drive)
              </Button>
              <Button variant="outline" size="sm" onClick={() => fetchDriveFiles(clientFolder.google_file_id)} disabled={isLoading}>
                <RefreshCw className="ml-2 w-4 h-4" /> רענן Drive
              </Button>
              <Button asChild size="sm">
                <a href={clientFolder.link} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="ml-2 w-4 h-4" /> פתח ב-Drive
                </a>
              </Button>
            </>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-8">
        {/* If no Drive configured – offer to create it, but DO NOT block local files */}
        {(!user || !user.google_drive_root_folder_id) && (
          <div className="p-3 rounded-lg border bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-sm text-slate-600 text-center sm:text-right">
              ניתן להשתמש בהעלאת קבצים מקומית. לריכוז קבצים בגוגל דרייב, צור תיקיית בסיס.
            </div>
            <Button onClick={handleCreateRootFolder} size="sm" variant="outline" disabled={isLoading}>
              <FolderPlus className="ml-2 w-4 h-4" /> צור תיקיית CRM ב-Drive
            </Button>
          </div>
        )}

        {/* Local files list */}
        <div>
          <h4 className="font-semibold text-slate-800 mb-3">קבצים שהועלו למערכת</h4>
          {localFiles.length === 0 ? (
            <div className="text-sm text-slate-500">עדיין לא הועלו קבצים.</div>
          ) : (
            <div className="space-y-2">
              {localFiles.map(f => (
                <a key={f.id} href={f.link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 border rounded-lg hover:bg-slate-50 transition-colors">
                  <File className="w-5 h-5 text-slate-500" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-800 truncate">{f.name}</div>
                    <div className="text-xs text-slate-500">{f.mime_type || f.type}</div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-slate-400" />
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Google Drive section (if user has root folder) */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-slate-800">Google Drive</h4>
            {!clientFolder && user?.google_drive_root_folder_id && (
              <Button onClick={() => handleCreateClientFolder(user.google_drive_root_folder_id)} size="sm" disabled={isLoading}>
                <FolderPlus className="ml-2 w-4 h-4" /> צור תיקיית לקוח
              </Button>
            )}
          </div>

          {user?.google_drive_root_folder_id ? (
            clientFolder ? (
              driveFiles.length === 0 ? (
                <div className="text-center py-8">
                  <Folder className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">התיקייה ריקה. הוסף קבצים או צור טבלה חדשה.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {driveFiles.map(file => (
                    <a href={file.webViewLink} target="_blank" rel="noopener noreferrer" key={file.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-slate-50 transition-colors">
                      <img src={file.iconLink} alt="icon" className="w-5 h-5" />
                      <span className="flex-1 text-slate-800 truncate">{file.name}</span>
                      <ExternalLink className="w-4 h-4 text-slate-400" />
                    </a>
                  ))}
                </div>
              )
            ) : (
              <div className="text-sm text-slate-500">לא קיימת עדיין תיקיית Drive ללקוח זה. צור אותה כדי להתחיל לנהל קבצים ב-Drive.</div>
            )
          ) : (
            <div className="text-sm text-slate-500">
              כדי להשתמש בניהול קבצים באמצעות Google Drive, עליך ליצור תיקיית בסיס.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
