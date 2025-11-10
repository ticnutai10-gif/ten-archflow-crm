
import React from "react";
import { googleDrive } from "@/functions/googleDrive";
import { User } from "@/entities/User";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Folder, File, ExternalLink, RefreshCw, Home, ChevronLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const isFolder = (mime) => mime === "application/vnd.google-apps.folder";

export default function Folders() {
  const [user, setUser] = React.useState(null);
  const [rootId, setRootId] = React.useState(null);
  const [current, setCurrent] = React.useState({ id: null, name: "" });
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [breadcrumbs, setBreadcrumbs] = React.useState([]);

  const loadUser = React.useCallback(async () => {
    const me = await User.me().catch(() => null);
    setUser(me);
    setRootId(me?.google_drive_root_folder_id || null);
    return me;
  }, []);

  const fetchFolderMeta = React.useCallback(async (id) => {
    const { data } = await googleDrive({ action: "get_file", payload: { fileId: id } });
    return data;
  }, []);

  const loadItems = React.useCallback(async (folderId) => {
    if (!folderId) return;
    setLoading(true);
    const { data } = await googleDrive({ action: "list_files", payload: { folderId } });
    setItems(data || []);
    setLoading(false);
  }, []);

  const goToFolder = React.useCallback(async (folder) => {
    const folderMeta = folder?.id ? folder : await fetchFolderMeta(folder.id || folder);
    const id = folderMeta.id;
    const name = folderMeta.name;
    setCurrent({ id, name });
    setBreadcrumbs((prev) => {
      // if navigating down, append; if jumping via breadcrumb, replace until that id
      const existingIdx = prev.findIndex((b) => b.id === id);
      if (existingIdx >= 0) return prev.slice(0, existingIdx + 1);
      return [...prev, { id, name }];
    });
    await loadItems(id);
  }, [fetchFolderMeta, loadItems]);

  React.useEffect(() => {
    (async () => {
      const me = await loadUser();
      if (!me?.google_refresh_token) {
        setLoading(false);
        return;
      }
      if (!me?.google_drive_root_folder_id) {
        setLoading(false);
        return;
      }
      const rootMeta = await fetchFolderMeta(me.google_drive_root_folder_id).catch(() => ({ id: me.google_drive_root_folder_id, name: "ArchFlow CRM Files" }));
      setCurrent({ id: rootMeta.id, name: rootMeta.name || "ArchFlow CRM Files" });
      setBreadcrumbs([{ id: rootMeta.id, name: rootMeta.name || "ArchFlow CRM Files" }]);
      await loadItems(rootMeta.id);
    })();
  }, [loadUser, fetchFolderMeta, loadItems]);

  // After items for current folder load, if asked for a client folder by name at root – open it automatically
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const wanted = urlParams.get("client_name");
    // Only proceed if a client_name is requested and we have current folder info and root ID
    if (!wanted || !current?.id || !rootId) return;

    // Only try from root level to prevent unexpected navigation deep in the structure
    if (current.id !== rootId) return;

    // Find the target folder among the currently loaded items
    const target = items.find(it => isFolder(it.mimeType) && (it.name || "") === wanted);
    
    // If found, navigate to that folder and clear the search param to prevent re-triggering
    if (target) {
      goToFolder({ id: target.id, name: target.name });
      // Remove the client_name param from the URL to avoid re-triggering on subsequent renders
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete("client_name");
      window.history.replaceState({}, document.title, newUrl.toString());
    }
  }, [items, current, rootId, goToFolder]);


  const handleCreateRoot = async () => {
    setLoading(true);
    const { data } = await googleDrive({ action: "create_root_folder" });
    const refreshed = await User.me();
    setUser(refreshed);
    setRootId(refreshed.google_drive_root_folder_id);
    const rootMeta = await fetchFolderMeta(refreshed.google_drive_root_folder_id).catch(() => ({ id: refreshed.google_drive_root_folder_id, name: "ArchFlow CRM Files" }));
    setCurrent({ id: rootMeta.id, name: rootMeta.name || "ArchFlow CRM Files" });
    setBreadcrumbs([{ id: rootMeta.id, name: rootMeta.name || "ArchFlow CRM Files" }]);
    await loadItems(rootMeta.id);
    setLoading(false);
  };

  const visibleItems = React.useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return items;
    return items.filter((it) => it.name?.toLowerCase().includes(s));
  }, [items, search]);

  const openCurrentInDrive = () => {
    if (!current?.id) return;
    const url = `https://drive.google.com/drive/folders/${current.id}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  if (loading && !user) {
    return <div className="p-6">טוען...</div>;
  }

  const notConnected = !user?.google_refresh_token;
  const noRoot = !rootId;

  return (
    <div className="p-6 lg:p-8 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen pl-24 lg:pl-12" dir="rtl">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">תיקיות (Google Drive)</h1>
            <p className="text-slate-600">צפייה וניווט בין תיקיות וקבצים מתוך ה-Drive</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => current?.id && loadItems(current.id)} className="gap-2">
              <RefreshCw className="w-4 h-4" /> רענן
            </Button>
            <Button onClick={openCurrentInDrive} disabled={!current?.id} className="gap-2">
              <ExternalLink className="w-4 h-4" /> פתח ב‑Drive
            </Button>
          </div>
        </div>

        {/* Connection state */}
        {notConnected && (
          <Card className="mb-6">
            <CardContent className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="text-slate-700">
                כדי להשתמש בסייר Drive, התחבר לגוגל במסך ההגדרות.
              </div>
              <Button asChild variant="outline">
                <Link to={createPageUrl("Settings")}>למסך ההגדרות</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {!notConnected && noRoot && (
          <Card className="mb-6">
            <CardContent className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="text-slate-700">
                לא נמצאה תיקיית בסיס ב‑Drive. צור תיקיית ArchFlow CRM Files כדי להתחיל.
              </div>
              <Button onClick={handleCreateRoot}>צור תיקיית בסיס</Button>
            </CardContent>
          </Card>
        )}

        {/* Toolbar */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              {/* Breadcrumbs */}
              <div className="flex items-center flex-wrap gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!rootId || breadcrumbs.length === 0}
                  onClick={() => {
                    if (!rootId) return;
                    // jump back to root
                    setBreadcrumbs((prev) => (prev.length ? [prev[0]] : []));
                    if (rootId) {
                      goToFolder({ id: rootId, name: breadcrumbs[0]?.name || "ArchFlow CRM Files" });
                    }
                  }}
                  className="text-slate-700 gap-1"
                  title="לקפוץ לשורש"
                >
                  <Home className="w-4 h-4" /> שורש
                </Button>
                {breadcrumbs.map((bc, idx) => (
                  <React.Fragment key={bc.id}>
                    <ChevronLeft className="w-4 h-4 text-slate-400" />
                    <button
                      onClick={() => goToFolder({ id: bc.id, name: bc.name })}
                      className={`text-sm ${idx === breadcrumbs.length - 1 ? "font-semibold text-slate-900" : "text-blue-600 hover:underline"}`}
                      title={bc.name}
                    >
                      {bc.name}
                    </button>
                  </React.Fragment>
                ))}
              </div>

              {/* Search */}
              <div className="w-full md:w-72">
                <Input
                  placeholder="חיפוש לפי שם..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Grid */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">
              {current?.name ? `תוכן: ${current.name}` : "תוכן התיקייה"}
              {visibleItems?.length >= 0 && (
                <Badge variant="outline" className="ml-2">{visibleItems.length} פריטים</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {Array(12).fill(0).map((_, i) => (
                  <div key={i} className="h-24 rounded-lg bg-slate-100 animate-pulse" />
                ))}
              </div>
            ) : visibleItems.length === 0 ? (
              <div className="text-center text-slate-500 py-10">
                אין פריטים להצגה בתיקייה זו.
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {visibleItems.map((it) => (
                  <div
                    key={it.id}
                    className="group border rounded-xl p-3 hover:shadow-md transition cursor-pointer bg-white/80 backdrop-blur-sm"
                    onClick={() => {
                      if (isFolder(it.mimeType)) {
                        goToFolder({ id: it.id, name: it.name });
                      } else if (it.webViewLink) {
                        window.open(it.webViewLink, "_blank", "noopener,noreferrer");
                      }
                    }}
                    title={it.name}
                  >
                    <div className="flex items-center gap-3">
                      {isFolder(it.mimeType) ? (
                        <div className="w-10 h-10 rounded-md bg-amber-50 text-amber-700 flex items-center justify-center">
                          <Folder className="w-6 h-6" />
                        </div>
                      ) : it.iconLink ? (
                        <img src={it.iconLink} alt="" className="w-10 h-10" />
                      ) : (
                        <div className="w-10 h-10 rounded-md bg-slate-100 text-slate-500 flex items-center justify-center">
                          <File className="w-6 h-6" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="font-medium text-slate-900 truncate">{it.name}</div>
                        <div className="text-xs text-slate-500 truncate">{isFolder(it.mimeType) ? "תיקייה" : it.mimeType}</div>
                      </div>
                    </div>
                    {!isFolder(it.mimeType) && it.webViewLink && (
                      <>
                        <Separator className="my-3" />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-center gap-2 text-slate-600 hover:text-slate-800"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(it.webViewLink, "_blank", "noopener,noreferrer");
                          }}
                        >
                          <ExternalLink className="w-4 h-4" /> פתח
                        </Button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
