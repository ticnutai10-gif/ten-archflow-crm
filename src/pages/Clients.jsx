import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Client, Project, TimeLog } from "@/entities/all";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  Plus,
  Search,
  Filter,
  Edit,
  Eye,
  Download,
  Phone,
  Mail,
  MapPin,
  Building,
  Clock,
  FolderOpen,
  TrendingUp,
  LayoutGrid,
  List,
  Table as TableIcon,
  CheckSquare,
  Square,
  Copy,
  Trash2,
  AlertTriangle,
  Eraser,
  FileSpreadsheet,
  Upload,
  FileText,
  Sparkles,
  RefreshCw,
  ChevronDown,
  MoreVertical,
  Circle
} from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { UploadFile } from "@/integrations/Core";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";

import ClientForm from "../components/clients/ClientForm";
import ClientCard from "../components/clients/ClientCard";
import ClientDetails from "../components/clients/ClientDetails";
import ClientStats from "../components/clients/ClientStats";
import ClientTable from "../components/clients/ClientTable";
import ClientSpreadsheet from "../components/clients/ClientSpreadsheet";
import { bulkDeleteClients } from "@/functions/bulkDeleteClients";
import ClientImporter from "../components/clients/ClientImporter";
import GoogleSheetsManager from "../components/clients/GoogleSheetsManager";
import ClientMerger from "../components/clients/ClientMerger";
import GoogleSheetsImporter from "../components/clients/GoogleSheetsImporter";
import { useAccessControl, autoAssignToCreator } from "../components/access/AccessValidator";
import { toast } from "sonner";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

// Stage options
const STAGE_OPTIONS = [
  { value: 'ברור_תכן', label: 'ברור תכן', color: '#3b82f6' },
  { value: 'תיק_מידע', label: 'תיק מידע', color: '#8b5cf6' },
  { value: 'היתרים', label: 'היתרים', color: '#f59e0b' },
  { value: 'ביצוע', label: 'ביצוע', color: '#10b981' },
  { value: 'סיום', label: 'סיום', color: '#6b7280' }
];

export default function ClientsPage() {
  const [clients, setClients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [budgetFilter, setBudgetFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [viewMode, setViewMode] = useState(() => {
    try {
      return localStorage.getItem('clients-view-mode') || "grid";
    } catch {
      return "grid";
    }
  });
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showImporter, setShowImporter] = useState(false);
  const [showMerger, setShowMerger] = useState(false);
  const [showSheetsImporter, setShowSheetsImporter] = useState(false);
  const [isCleaningNames, setIsCleaningNames] = useState(false);

  // scrollContainerRef is kept but its role in virtual scrolling is removed.
  // It could still be used for general layout purposes if needed, but no longer directly controls scroll behavior for DND/grid.
  const scrollContainerRef = useRef(null);

  // הוספת בדיקת הרשאות
  const { isAdmin, filterClients, canCreateClient, loading: accessLoading, me } = useAccessControl();

  // הוספת קבוע לצבע האייקונים
  const iconColor = "#2C3A50";

  // Define status colors for consistent styling
  const statusColors = {
    "פוטנציאלי": "bg-amber-100 text-amber-800 border-amber-200",
    "פעיל": "bg-green-100 text-green-800 border-green-200",
    "לא פעיל": "bg-red-100 text-red-800 border-red-200",
    "all": "bg-slate-100 text-slate-800 border-slate-200"
  };

  // Search highlight function
  const highlightText = useCallback((text, search) => {
    if (!search || !text) return text;

    const parts = String(text).split(new RegExp(`(${search})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === search.toLowerCase()
        ? <mark key={i} className="bg-yellow-200 px-1 rounded">{part}</mark>
        : part
    );
  }, []);

  // MOVED BEFORE useEffect that uses it
  const filteredAndSortedClients = useMemo(() => {
    return clients.
      filter((client) => {
        const matchesSearch = client.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          client.email && client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          client.phone && client.phone.includes(searchTerm);
        const matchesStatus = statusFilter === "all" || client.status === statusFilter;
        const matchesSource = sourceFilter === "all" || client.source === sourceFilter;
        const matchesBudget = budgetFilter === "all" || client.budget_range && client.budget_range.includes(budgetFilter);
        const matchesStage = stageFilter === "all" || client.stage === stageFilter;

        return matchesSearch && matchesStatus && matchesSource && matchesBudget && matchesStage;
      }).
      sort((a, b) => {
        switch (sortBy) {
          case "name":
            return (a.name || '').localeCompare(b.name || '');
          case "created_date":
            return new Date(b.created_date) - new Date(a.created_date);
          case "status":
            return (a.status || '').localeCompare(b.status || '');
          default:
            return 0;
        }
      });
  }, [clients, searchTerm, statusFilter, sourceFilter, budgetFilter, sortBy]);

  useEffect(() => {
    if (!accessLoading) {
      console.log('📊 [CLIENTS PAGE] Access loaded:', {
        user: me?.email,
        isAdmin,
        canCreate: canCreateClient
      });
      loadClients();
    }
  }, [accessLoading]);

  useEffect(() => {
    const handleClientUpdate = (event) => {
      console.log('📬 [CLIENTS PAGE] Received client:updated event:', event.detail);
      const updatedClient = event.detail;
      
      // עדכון מיידי בממשק
      if (updatedClient?.id) {
        setClients(prev => prev.map(c => 
          c.id === updatedClient.id ? { ...c, ...updatedClient } : c
        ));
        console.log('✅ [CLIENTS PAGE] Updated client locally:', updatedClient.name, 'Stage:', updatedClient.stage);
      }
      
      // טען מחדש מהשרת לסנכרון מלא
      console.log('🔄 [CLIENTS PAGE] Reloading all clients...');
      setTimeout(() => loadClients(), 100);
    };
    
    window.addEventListener('client:updated', handleClientUpdate);
    console.log('👂 [CLIENTS PAGE] Listening for client updates');
    return () => {
      console.log('🔇 [CLIENTS PAGE] Stopped listening');
      window.removeEventListener('client:updated', handleClientUpdate);
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('clients-view-mode', viewMode);
    } catch {}
  }, [viewMode]);

  useEffect(() => {
    if (!clients || clients.length === 0) return;
    const urlParams = new URLSearchParams(window.location.search);
    const open = urlParams.get("open");
    if (open !== "details") return;

    const clientId = urlParams.get("client_id");
    const clientName = urlParams.get("client_name");

    let target = null;
    if (clientId) {
      target = clients.find((c) => String(c.id) === String(clientId));
    }
    if (!target && clientName) {
      target = clients.find((c) => c.name?.trim() === clientName.trim());
    }
    if (target) {
      setSelectedClient(target);
    }
  }, [clients]);

  const loadClients = async () => {
    setIsLoading(true);
    try {
      console.log('📊 [CLIENTS PAGE] Loading clients...');
      const clientsData = await base44.entities.Client.list('-created_date');
      console.log('📊 [CLIENTS PAGE] Loaded from server:', clientsData.length);

      // ✅ סינון לפי הרשאות
      const filteredData = filterClients(clientsData);

      console.log('✅ [CLIENTS PAGE] After filtering:', {
        total: clientsData.length,
        filtered: filteredData.length,
        userEmail: me?.email,
        isAdmin
      });

      // Clean and deduplicate clients
      const cleanedClients = filteredData.map((client) => {
        const cleanedName = (client.name || '').replace(/[^\p{L}\p{N}\s\-.']/gu, '').trim() || 'לקוח ללא שם';
        return {
          ...client,
          // Remove special characters, trim, and default to 'לקוח ללא שם'
          name: cleanedName,
          // Ensure name_clean exists
          name_clean: client.name_clean || cleanedName
        };
      });

      // Remove exact duplicates (same name and phone/email)
      const uniqueClients = [];
      const seen = new Set();

      for (const client of cleanedClients) {
        // Create a unique key using cleaned name, phone, and email
        const key = `${client.name}_${client.phone || ''}_${client.email || ''}`;
        if (!seen.has(key)) {
          seen.add(key);
          uniqueClients.push(client);
        }
      }

      console.log('✅ [CLIENTS] Loaded and cleaned:', uniqueClients.length, 'clients');
      setClients(uniqueClients);
    } catch (error) {
      console.error('❌ [CLIENTS] Error loading clients:', error);
      toast.error('שגיאה בטעינת לקוחות');
    }
    setIsLoading(false);
  };

  const handleSubmit = async (clientData) => {
    try {
      console.log('Starting client submission...', clientData);

      if (editingClient) {
        console.log('Updating existing client:', editingClient.id);
        await base44.entities.Client.update(editingClient.id, clientData);

        try {
          window.dispatchEvent(new CustomEvent('client:updated', {
            detail: { id: editingClient.id, ...clientData }
          }));
        } catch (e) {
          console.warn('client:updated event dispatch failed', e);
        }
      } else {
        console.log('Creating new client...');
        const created = await base44.entities.Client.create(clientData);
        console.log('Client created successfully:', created);

        // ✅ שיוך אוטומטי לעובד שיצר את הלקוח
        if (created?.id) {
          await autoAssignToCreator('client', created.id);
        }

        try {
          window.dispatchEvent(new CustomEvent('client:created', {
            detail: created || clientData
          }));
        } catch (e) {
          console.warn('client:created event dispatch failed', e);
        }
      }

      setShowForm(false);
      setEditingClient(null);

      console.log('Reloading clients...');
      await loadClients();
      console.log('Client submission completed successfully');

    } catch (error) {
      console.error('Error saving client:', error);
      throw new Error(error.message || 'שגיאה בשמירת הלקוח');
    }
  };

  const handleEdit = (client) => {
    setEditingClient(client);
    setShowForm(true);
  };

  const handleViewDetails = (client) => {
    setSelectedClient(client);
  };

  const exportToCSV = () => {
    const headers = ['שם', 'טלפון', 'אימייל', 'חברה', 'סטטוס', 'מקור הגעה', 'טווח תקציב', 'תאריך יצירה'];
    const csvData = [
      headers.join(','),
      ...filteredAndSortedClients.map((client) => [
        client.name,
        client.phone,
        client.email || '',
        client.company || '',
        client.status,
        client.source || '',
        client.budget_range || '',
        format(new Date(client.created_date), 'dd/MM/yyyy')].
        map((field) => `"${String(field || '').replace(/"/g, '""')}"`).join(','))].
      join('\n');

    const blob = new Blob(['\uFEFF' + csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `clients-${format(new Date(), 'dd-MM-yyyy')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const createAndSendCSV = async (sendMethod = 'whatsapp') => {
    try {
      const headers = ['שם', 'טלפון', 'אימייל', 'חברה', 'כתובת', 'סטטוס', 'מקור הגעה', 'טווח תקציב', 'הערות', 'תאריך יצירה'];

      const csvData = [
        headers.join(','),
        ...filteredAndSortedClients.map((client) => [
          client.name || '',
          client.phone || '',
          client.email || '',
          client.company || '',
          client.address || '',
          client.status || '',
          client.source || '',
          client.budget_range || '',
          client.notes || '',
          client.created_date ? new Date(client.created_date).toLocaleDateString('he-IL') : ''].
          map((field) => `"${String(field).replace(/"/g, '""')}"`).join(','))].
        join('\n');

      const blob = new Blob(['\uFEFF' + csvData], { type: 'text/csv;charset=utf-8' });
      const file = new File([blob], `לקוחות-CRM-${new Date().toISOString().split('T')[0]}.csv`, { type: 'text/csv' });

      const uploadResult = await UploadFile({ file });
      const fileUrl = uploadResult.file_url;

      if (sendMethod === 'whatsapp') {
        const phoneNumbers = filteredAndSortedClients.
          filter((client) => client.phone).
          map((client) => `${client.name || 'לקוח'}: ${client.phone}`).
          join('\n');

        const message = encodeURIComponent(
          `רשימת לקוחות מ-CRM\n\n` +
          `${phoneNumbers.slice(0, 500)}${phoneNumbers.length > 500 ? '...\n(רשימה חלקית)' : ''}\n\n` +
          `קובץ CSV מלא: ${fileUrl}`
        );
        window.open(`https://wa.me/?text=${message}`, '_blank');
      } else {
        const emailList = filteredAndSortedClients.
          filter((client) => client.email && client.email.includes('@')).
          map((client) => `${client.name || 'לקוח'}: ${client.email}`);

        const subject = encodeURIComponent('רשימת לקוחות מ-CRM');
        const body = encodeURIComponent(
          `שלום,\n\nמצ"ב רשימת לקוחות מ-CRM:\n\n` +
          `${emailList.join('\n').slice(0, 500)}${emailList.length > 500 ? '...\n(רשימה חלקית)' : ''}\n\n` +
          `קובץ CSV מלא: ${fileUrl}\n\nבברכה,\nצוות CRM`
        );
        const emailAddresses = emailList.map((e) => e.split(': ')[1]).join(',');

        window.open(`mailto:${emailAddresses}?subject=${subject}&body=${body}`, '_blank');
      }

      toast.success(`קובץ CSV נוצר ונשלח! ${filteredAndSortedClients.length} לקוחות נכללו בקובץ.`);

    } catch (error) {
      console.error('Error creating and sending CSV:', error);
      toast.error('שגיאה ביצירת הקובץ: ' + (error.message || 'נסה שוב מאוחר יותר.'));
    }
  };

  const toggleSelectionMode = () => {
    setSelectionMode((v) => {
      if (!v) return true;
      setSelectedIds([]);
      return false;
    });
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // NEW: Function to enter selection mode with a specific client selected
  const enterSelectionModeWith = (clientId) => {
    setSelectionMode(true);
    setSelectedIds([clientId]);
  };

  const handleDelete = async (clientId) => {
    if (!confirm('האם למחוק את הלקוח? הפעולה אינה הפיכה.')) return;
    await base44.entities.Client.delete(clientId);
    try {
      window.dispatchEvent(new CustomEvent('client:deleted', { detail: { id: clientId } }));
    } catch (e) {
      console.warn('client:deleted event dispatch failed', e);
    }
    loadClients();
  };

  const duplicateClient = async (client) => {
    const { id, created_date, updated_date, created_by, ...rest } = client;
    const newName = `${client.name} (העתק)`;
    await base44.entities.Client.create({ ...rest, name: newName });
    loadClients();
  };

  const deleteUnnamedClients = async () => {
    const ok = confirm("למחוק את כל הלקוחות ללא שם ('לקוח ללא שם' או ריקים)? פעולה זו אינה הפיכה.");
    if (!ok) return;

    const { data } = await bulkDeleteClients({ deleteUnnamed: true });
    try {
      window.dispatchEvent(new CustomEvent('client:deleted', { detail: { ids: data?.processed_ids || [] } }));
    } catch (e) {
      console.warn('client:deleted event dispatch failed for unnamed clients', e);
    }
    loadClients();
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    const allSelected = selectedIds.length === filteredAndSortedClients.length;
    if (allSelected) {
      const ok = confirm(`נבחרו ${selectedIds.length} לקוחות (כל הרשימה המסוננת) למחיקה. האם להמשיך?`);
      if (!ok) return;
    } else if (!confirm(`למחוק ${selectedIds.length} לקוחות?`)) {
      return;
    }

    const { data } = await bulkDeleteClients({ ids: selectedIds });
    try {
      window.dispatchEvent(new CustomEvent('client:deleted', { detail: { ids: data?.processed_ids || selectedIds } }));
    } catch (e) {
      console.warn('client:deleted bulk event dispatch failed', e);
    }
    setSelectedIds([]);
    loadClients();
  };

  const handleBulkCopy = async () => {
    if (selectedIds.length === 0) return;
    const allSelected = selectedIds.length === filteredAndSortedClients.length;
    if (allSelected) {
      const ok = confirm(`נבחרו ${selectedIds.length} לקוחות (כל הרשימה המסוננת) להעתקה. האם להמשיך?`);
      if (!ok) return;
    }
    const idSet = new Set(selectedIds);
    const toCopy = clients.filter((c) => idSet.has(c.id));
    for (const c of toCopy) {
      await duplicateClient(c);
    }
    setSelectedIds([]);
    loadClients();
  };

  const selectAllClients = () => {
    const allIds = filteredAndSortedClients.map((c) => c.id);
    const isAllSelected = selectedIds.length === allIds.length && allIds.length > 0 && selectedIds.every((id) => allIds.includes(id));
    setSelectedIds(isAllSelected ? [] : allIds);
  };

  const countDuplicates = () => {
    const names = {};
    clients.forEach((client) => {
      const name = client.name?.trim().toLowerCase();
      if (name && name !== 'לקוח ללא שם') {
        names[name] = (names[name] || 0) + 1;
      }
    });
    return Object.values(names).filter((count) => count > 1).length;
  };

  const duplicateCount = countDuplicates();

  const openGoogleSheet = () => {
    window.open("https://docs.google.com/spreadsheets/d/11cHX_TgtMHsnBogdrEdGpdlqsnIZIJGumnP1_XdED2Q/edit?usp=sharing", '_blank');
  };

  const cleanAllNames = async () => {
    console.log('🧹 [CLEAN NAMES] Starting clean process...');

    if (!confirm('האם לנקות את השמות של כל הלקוחות? פעולה זו תעדכן את כל הרשומות.')) {
      console.log('🧹 [CLEAN NAMES] User cancelled');
      return;
    }

    setIsCleaningNames(true);
    try {
      console.log('🧹 [CLEAN NAMES] Calling backend function...');
      const response = await base44.functions.invoke('cleanClientNames');
      console.log('🧹 [CLEAN NAMES] Response:', response);

      if (response.data && response.data.success) {
        console.log('✅ [CLEAN NAMES] Success:', response.data.message);
        toast.success(response.data.message);
        console.log('🔄 [CLEAN NAMES] Reloading clients...');
        await loadClients();
        console.log('✅ [CLEAN NAMES] Done!');
      } else {
        console.error('❌ [CLEAN NAMES] Error:', response.data?.error);
        toast.error('שגיאה: ' + (response.data?.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('❌ [CLEAN NAMES] Exception:', error);
      toast.error('שגיאה בניקוי השמות: ' + error.message);
    } finally {
      setIsCleaningNames(false);
    }
  };

  // Drag & Drop handler
  const onDragEnd = (result) => {
    if (!result.destination) return;

    // Create a mutable copy of the filtered clients for reordering
    const items = Array.from(filteredAndSortedClients);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update the main clients array to match the new order of the filtered items
    // This assumes `filteredAndSortedClients` is the list we intend to reorder
    // and `setClients` will effectively replace the current `clients` state with this new order.
    const reorderedIds = items.map(c => c.id);
    const newOrder = reorderedIds.map(id => clients.find(c => c.id === id)).filter(Boolean);
    setClients(newOrder);

    toast.success('סדר הלקוחות עודכן');
  };


  console.log('🔵 [CLIENTS PAGE] Rendering, viewMode:', viewMode);

  // הצגת הודעה אם אין הרשאות
  if (accessLoading) {
    return (
      <div className="p-6 lg:p-8 min-h-screen pl-24 lg:pl-12 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" style={{ color: iconColor }} />
          <p className="text-slate-600">בודק הרשאות...</p>
        </div>
      </div>
    );
  }

  if (selectedClient) {
    // Find the latest version of the client from the clients array
    const latestClient = clients.find(c => c.id === selectedClient.id) || selectedClient;
    
    return (
      <ClientDetails
        key={latestClient.id}
        client={latestClient}
        onBack={() => setSelectedClient(null)}
        onEdit={() => {
          setEditingClient(latestClient);
          setShowForm(true);
          setSelectedClient(null);
        }} />);

  }

  if (showMerger) {
    return (
      <div className="p-6 lg:p-8 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen pl-24 lg:pl-12">
        <div className="max-w-7xl mx-auto">
          <ClientMerger
            clients={clients}
            onMerged={() => {
              setShowMerger(false);
              loadClients();
            }}
            onCancel={() => setShowMerger(false)} />
        </div>
      </div>);

  }

  // עדכון כפתור "לקוח חדש" - הצגה רק למי שיכול ליצור
  return (
    <div
      className="p-6 lg:p-8 min-h-screen pl-24 lg:pl-12"
      dir="rtl"
      style={{
        backgroundColor: 'var(--bg-cream, #FCF6E3)',
        width: '100%' // Changed overflow to visible for scrollArea to manage
      }}>

      {/* כותרת העמוד */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-4 gap-4">
        <div className="text-right">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">ניהול לקוחות</h1>
          <p className="text-slate-600">ניהול מאגר הלקוחות והפרויקטים שלהם</p>
        </div>
      </div>

      {/* סטטיסטיקות */}
      <div className="mb-6">
        <ClientStats clients={clients} isLoading={isLoading} />
      </div>

      {/* כפתורי הפעולה (Toolbar) */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
        {/* Left group of buttons */}
        <div className="flex flex-wrap gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="bg-background text-slate-800 px-4 py-2 text-sm font-medium rounded-md inline-flex items-center justify-center whitespace-nowrap ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border hover:text-accent-foreground h-10 gap-2 border-slate-200 hover:bg-slate-50">
                <FileSpreadsheet className="w-4 h-4" style={{ color: iconColor }} />
                פעולות נתונים
                <ChevronDown className="w-4 h-4" style={{ color: iconColor }} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto" dir="rtl">
              {/* Google Sheets Manager בתוך התפריט */}
              <div className="p-4 border-b border-slate-200">
                <GoogleSheetsManager
                  clients={filteredAndSortedClients}
                  onRefresh={loadClients} />
              </div>

              <DropdownMenuItem onClick={openGoogleSheet} className="gap-3">
                <FileSpreadsheet className="w-4 h-4" style={{ color: iconColor }} />
                פתח Google Sheets
              </DropdownMenuItem>

              <DropdownMenuItem onClick={() => setShowSheetsImporter(true)} className="gap-3">
                <Upload className="w-4 h-4" style={{ color: iconColor }} />
                ייבא מ-Google Sheets
              </DropdownMenuItem>

              <div className="px-2 py-1.5 hover:bg-slate-50 rounded-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Download className="w-4 h-4" style={{ color: iconColor }} />
                    <span className="text-sm">ייצא לאקסל (CSV)</span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        exportToCSV();
                      }}
                      className="p-1 hover:bg-slate-100 rounded active:bg-slate-200"
                      title="הורד קובץ מקומי"
                      style={{ color: iconColor }}>
                      <Download className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        createAndSendCSV('whatsapp');
                      }}
                      className="p-1 hover:bg-slate-100 rounded active:bg-slate-200"
                      title="יצור CSV ושלח לוואטסאפ"
                      style={{ color: iconColor }}>
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        createAndSendCSV('email');
                      }}
                      className="p-1 hover:bg-slate-100 rounded active:bg-slate-200"
                      title="יצור CSV ושלח במייל"
                      style={{ color: iconColor }}>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              <DropdownMenuItem onClick={() => setShowImporter(true)} className="gap-3">
                <FileText className="w-4 h-4" style={{ color: iconColor }} />
                ייבא לקוחות מקובץ
              </DropdownMenuItem>

              <div className="my-1 h-px bg-slate-200"></div>

              <DropdownMenuItem onClick={deleteUnnamedClients} className="gap-3 text-red-600 focus:text-red-700">
                <Eraser className="w-4 h-4" style={{ color: iconColor }} />
                מחק לקוחות ללא שם
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {duplicateCount > 0 && (
            <Button
              variant="outline"
              onClick={() => setShowMerger(true)}
              className="gap-2 border-amber-200 text-amber-700 hover:bg-amber-50">
              <Users className="w-4 h-4" style={{ color: iconColor }} />
              מזג כפולים ({duplicateCount})
            </Button>
          )}

          <Button
            variant={selectionMode ? "default" : "outline"}
            onClick={toggleSelectionMode}
            className={selectionMode ? "bg-[#2C3A50] hover:bg-[#1f2937] text-white" : ""}
            title="מצב בחירה מרובה">
            {selectionMode ? (
              <>
                <CheckSquare className="w-4 h-4 ml-2" />
                ביטול בחירה
              </>
            ) : (
              <>
                <Square className="w-4 h-4 ml-2" style={{ color: iconColor }} />
                מצב בחירה
              </>
            )}
          </Button>
        </div>

        {/* Right group of buttons */}
        <div className="flex items-center gap-3">
          {/* View Mode Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="gap-2 bg-white border-slate-200 hover:bg-slate-50">
                <Eye className="w-4 h-4" style={{ color: iconColor }} />
                <span className="text-sm">תצוגה</span>
                <ChevronDown className="w-4 h-4" style={{ color: iconColor }} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56" dir="rtl">
              <DropdownMenuItem
                onClick={() => setViewMode("grid")}
                className={`flex items-center gap-3 cursor-pointer ${viewMode === "grid" ? "bg-blue-50 text-blue-700" : ""}`}>
                <LayoutGrid className="w-4 h-4" style={{ color: viewMode === "grid" ? undefined : iconColor }} />
                <span className="flex-1">כרטיסים</span>
                {viewMode === "grid" && <Eye className="w-4 h-4 text-blue-600" />}
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => setViewMode("list")}
                className={`flex items-center gap-3 cursor-pointer ${viewMode === "list" ? "bg-blue-50 text-blue-700" : ""}`}>
                <List className="w-4 h-4" style={{ color: viewMode === "list" ? undefined : iconColor }} />
                <span className="flex-1">רשימה</span>
                {viewMode === "list" && <Eye className="w-4 h-4 text-blue-600" />}
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => setViewMode("compact")}
                className={`flex items-center gap-3 cursor-pointer ${viewMode === "compact" ? "bg-blue-50 text-blue-700" : ""}`}>
                <Users className="w-4 h-4" style={{ color: viewMode === "compact" ? undefined : iconColor }} />
                <span className="flex-1">קומפקטי</span>
                {viewMode === "compact" && <Eye className="w-4 h-4 text-blue-600" />}
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => setViewMode("detailed")}
                className={`flex items-center gap-3 cursor-pointer ${viewMode === "detailed" ? "bg-blue-50 text-blue-700" : ""}`}>
                <FileText className="w-4 h-4" style={{ color: viewMode === "detailed" ? undefined : iconColor }} />
                <span className="flex-1">מפורט</span>
                {viewMode === "detailed" && <Eye className="w-4 h-4 text-blue-600" />}
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => setViewMode("table")}
                className={`flex items-center gap-3 cursor-pointer ${viewMode === "table" ? "bg-blue-50 text-blue-700" : ""}`}>
                <TableIcon className="w-4 h-4" style={{ color: viewMode === "table" ? undefined : iconColor }} />
                <span className="flex-1">טבלה</span>
                {viewMode === "table" && <Eye className="w-4 h-4 text-blue-600" />}
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => setViewMode("kanban")}
                className={`flex items-center gap-3 cursor-pointer ${viewMode === "kanban" ? "bg-blue-50 text-blue-700" : ""}`}>
                <CheckSquare className="w-4 h-4" style={{ color: viewMode === "kanban" ? undefined : iconColor }} />
                <span className="flex-1">לוח קנבן</span>
                {viewMode === "kanban" && <Eye className="w-4 h-4 text-blue-600" />}
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => setViewMode("spreadsheet")}
                className={`flex items-center gap-3 cursor-pointer ${viewMode === "spreadsheet" ? "bg-blue-50 text-blue-700" : ""}`}>
                <FileSpreadsheet className="w-4 h-4" style={{ color: viewMode === "spreadsheet" ? undefined : iconColor }} />
                <span className="flex-1">Excel</span>
                {viewMode === "spreadsheet" && <Eye className="w-4 h-4 text-blue-600" />}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            onClick={() => {
              console.log('🖱️ [UI] Clean Names button clicked!');
              cleanAllNames();
            }}
            disabled={isCleaningNames}
            variant="outline"
            className="bg-background text-slate-800 px-4 py-2 text-sm font-medium rounded-xl inline-flex items-center justify-center gap-2 whitespace-nowrap ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 h-10 border-slate-200 hover:bg-slate-50">
            {isCleaningNames ? (
              <>
                <RefreshCw className="w-4 h-4 ml-2 animate-spin" style={{ color: iconColor }} />
                מנקה שמות...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 ml-2" style={{ color: iconColor }} />
                נקה שמות אוטומטית
              </>
            )}
          </Button>

          {canCreateClient && (
            <Button
              onClick={() => setShowForm(true)}
              className="bg-[#2C3A50] text-white px-6 py-2 text-sm font-medium rounded-xl inline-flex items-center justify-center gap-2 whitespace-nowrap ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 h-10 hover:bg-[#1f2937] shadow-lg hover:shadow-xl transition-all duration-200">
              <Plus className="w-5 h-5 ml-2" />
              לקוח חדש
            </Button>
          )}
        </div>
      </div>


      {/* שורת החיפוש והפילטרים */}
      <Card className="mb-6 shadow-lg border-0 bg-white/80 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4" dir="rtl">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: iconColor }} />
              <Input
                placeholder="חיפוש לקוח (שם, טלפון, אימייל)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10 text-right" />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full lg:w-40">
                <SelectValue placeholder="סטטוס" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הסטטוסים</SelectItem>
                <SelectItem value="פוטנציאלי">פוטנציאלי</SelectItem>
                <SelectItem value="פעיל">פעיל</SelectItem>
                <SelectItem value="לא פעיל">לא פעיל</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-full lg:w-40">
                <SelectValue placeholder="מקור הגעה" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל המקורות</SelectItem>
                <SelectItem value="הפניה">הפניה</SelectItem>
                <SelectItem value="אתר אינטרנט">אתר אינטרנט</SelectItem>
                <SelectItem value="מדיה חברתית">מדיה חברתית</SelectItem>
                <SelectItem value="פרסומת">פרסומת</SelectItem>
                <SelectItem value="אחר">אחר</SelectItem>
              </SelectContent>
            </Select>

            <Select value={budgetFilter} onValueChange={setBudgetFilter}>
              <SelectTrigger className="w-full lg:w-40">
                <SelectValue placeholder="טווח תקציב" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל התקציבים</SelectItem>
                <SelectItem value="עד 5,000 ש״ח">עד 5,000 ש״ח</SelectItem>
                <SelectItem value="5,000 - 10,000 ש״ח">5,000 - 10,000 ש״ח</SelectItem>
                <SelectItem value="10,000 - 20,000 ש״ח">10,000 - 20,000 ש״ח</SelectItem>
                <SelectItem value="מעל 20,000 ש״ח">מעל 20,000 ש״ח</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full lg:w-40">
                <SelectValue placeholder="מיון" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">לפי שם</SelectItem>
                <SelectItem value="created_date">לפי תאריך</SelectItem>
                <SelectItem value="status">לפי סטטוס</SelectItem>
              </SelectContent>
            </Select>

            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className="w-full lg:w-40">
                <SelectValue placeholder="שלב" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל השלבים</SelectItem>
                <SelectItem value="ברור_תכן">ברור תכן</SelectItem>
                <SelectItem value="תיק_מידע">תיק מידע</SelectItem>
                <SelectItem value="היתרים">היתרים</SelectItem>
                <SelectItem value="ביצוע">ביצוע</SelectItem>
                <SelectItem value="סיום">סיום</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Dialogs and imports */}
      {showImporter &&
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <ClientImporter
            open={showImporter}
            onClose={() => setShowImporter(false)}
            onDone={() => {
              setShowImporter(false);
              loadClients();
            }} />
        </div>
      }

      {showSheetsImporter &&
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <GoogleSheetsImporter
            onImportComplete={() => {
              setShowSheetsImporter(false);
              loadClients();
            }}
            onClose={() => setShowSheetsImporter(false)} />
        </div>
      }

      {/* Selection toolbar */}
      {selectionMode && selectedIds.length > 0 &&
        <div className="mb-4 bg-white border rounded-xl p-3 flex items-center justify-between animate-in slide-in-from-top-2">
          <div className="text-slate-700 flex items-center gap-2">
            <CheckSquare className="w-5 h-5" style={{ color: iconColor }} />
            נבחרו {selectedIds.length} לקוחות
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={selectAllClients}
              className="gap-2"
              disabled={filteredAndSortedClients.length === 0}>
              <CheckSquare className="w-4 h-4" style={{ color: iconColor }} />
              {selectedIds.length === filteredAndSortedClients.length && filteredAndSortedClients.length > 0 ? 'בטל הכל' : 'בחר הכל'}
            </Button>
            <Button variant="outline" onClick={handleBulkCopy} className="gap-2">
              <Copy className="w-4 h-4" style={{ color: iconColor }} />
              העתק
            </Button>
            <Button variant="destructive" onClick={handleBulkDelete} className="gap-2">
              <Trash2 className="w-4 h-4" />
              מחק
            </Button>
          </div>
        </div>
      }

      {/* Client Form */}
      {showForm &&
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <ClientForm
            client={editingClient}
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false);
              setEditingClient(null);
            }} />
        </div>
      }

      {/* Main content - SINGLE RENDER */}
      <div ref={scrollContainerRef} style={{ width: '100%' }}>
        {viewMode === "spreadsheet" ? (
          <div key="spreadsheet-view" style={{ width: '100%', overflow: 'visible' }}>
            <ClientSpreadsheet
              clients={filteredAndSortedClients}
              onEdit={handleEdit}
              onView={handleViewDetails}
              isLoading={isLoading}
            />
          </div>
        ) : viewMode === "table" ? (
          <ClientTable
            clients={filteredAndSortedClients}
            onEdit={handleEdit}
            onView={handleViewDetails}
            isLoading={isLoading}
            selectionMode={selectionMode}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onCopy={duplicateClient}
            onDelete={handleDelete}
            onRefresh={loadClients}
          />
        ) : viewMode === "compact" ? (
          <ScrollArea className="h-[calc(100vh-380px)] rounded-md pr-4">
            <div className="space-y-2">
              {isLoading ? (
                Array(10).fill(0).map((_, i) => (
                  <div key={i} className="h-20 bg-slate-200 rounded-lg animate-pulse"></div>
                ))
              ) : filteredAndSortedClients.length === 0 ? (
                <div className="text-center py-16">
                  <Users className="w-16 h-16 mx-auto mb-4" style={{ color: iconColor }} />
                  <h3 className="text-xl font-semibold text-slate-600 mb-2">
                    {searchTerm || statusFilter !== "all" || sourceFilter !== "all" || budgetFilter !== "all" ? "לא נמצאו לקוחות" : "אין לקוחות עדיין"}
                  </h3>
                  {!searchTerm && statusFilter === "all" && sourceFilter === "all" && budgetFilter === "all" && stageFilter === "all" && canCreateClient && (
                    <Button onClick={() => setShowForm(true)} className="mt-4 bg-[#2C3A50] hover:bg-[#1f2937]">
                      <Plus className="w-4 h-4 ml-2" />
                      הוסף לקוח ראשון
                    </Button>
                  )}
                </div>
              ) : (
                filteredAndSortedClients.map((client) => (
                  <div
                    key={client.id}
                    className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200 hover:shadow-md transition-all cursor-pointer group"
                    onClick={() => handleViewDetails(client)}>
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      {selectionMode && (
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleSelect(client.id); }}
                          className="flex-shrink-0">
                          {selectedIds.includes(client.id) ? (
                            <CheckSquare className="w-5 h-5" style={{ color: iconColor }} />
                          ) : (
                            <Square className="w-5 h-5 text-slate-400" />
                          )}
                        </button>
                      )}

                      <div className="flex-1 min-w-0">
                        <h3 
                          className="font-semibold text-slate-900 truncate hover:text-blue-600 transition-colors cursor-pointer flex items-center gap-2"
                          onClick={(e) => {
                            if (e.ctrlKey || e.metaKey) {
                              e.stopPropagation();
                              handleViewDetails(client);
                            }
                          }}
                        >
                          {client.stage && (() => {
                            const currentStage = STAGE_OPTIONS.find(s => s.value === client.stage);
                            if (currentStage) {
                              return (
                                <Circle 
                                  className="w-3 h-3 flex-shrink-0 fill-current"
                                  style={{ color: currentStage.color }}
                                  title={currentStage.label}
                                />
                              );
                            }
                            return null;
                          })()}
                          {highlightText(client.name, searchTerm)}
                        </h3>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={`${statusColors[client.status]} text-xs`}>
                            {client.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-sm text-slate-600">
                          {client.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" style={{ color: iconColor }} />
                              {highlightText(client.phone, searchTerm)}
                            </span>
                          )}
                          {client.email && (
                            <span className="flex items-center gap-1 truncate">
                              <Mail className="w-3 h-3" style={{ color: iconColor }} />
                              {highlightText(client.email, searchTerm)}
                            </span>
                          )}
                          {client.company && (
                            <span className="flex items-center gap-1 truncate">
                              <Building className="w-3 h-3" style={{ color: iconColor }} />
                              {client.company}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); handleEdit(client); }}>
                        <Edit className="w-4 h-4" style={{ color: iconColor }} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); duplicateClient(client); }}>
                        <Copy className="w-4 h-4" style={{ color: iconColor }} />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        ) : viewMode === "detailed" ? (
          <ScrollArea className="h-[calc(100vh-380px)] rounded-md pr-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {isLoading ? (
                Array(4).fill(0).map((_, i) => (
                  <Card key={i} className="h-64">
                    <CardHeader>
                      <Skeleton className="h-6 w-32" />
                      <Skeleton className="h-4 w-24 mt-2" />
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-4 w-5/6" />
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : filteredAndSortedClients.length === 0 ? (
                <div className="col-span-full text-center py-16">
                  <Users className="w-16 h-16 mx-auto mb-4" style={{ color: iconColor }} />
                  <h3 className="text-xl font-semibold text-slate-600 mb-2">
                    {searchTerm || statusFilter !== "all" || sourceFilter !== "all" || budgetFilter !== "all" ? "לא נמצאו לקוחות" : "אין לקוחות עדיין"}
                  </h3>
                  {!searchTerm && statusFilter === "all" && sourceFilter === "all" && budgetFilter === "all" && stageFilter === "all" && canCreateClient && (
                    <Button onClick={() => setShowForm(true)} className="mt-4 bg-[#2C3A50] hover:bg-[#1f2937]">
                      <Plus className="w-4 h-4 ml-2" />
                      הוסף לקוח ראשון
                    </Button>
                  )}
                </div>
              ) : (
                filteredAndSortedClients.map((client) => (
                  <Card key={client.id} className="hover:shadow-lg transition-all bg-white/80 backdrop-blur-sm">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <CardTitle 
                            className="text-xl font-bold text-slate-900 hover:text-blue-600 transition-colors cursor-pointer flex items-center gap-2 mb-2"
                            onClick={(e) => {
                              if (e.ctrlKey || e.metaKey) {
                                e.preventDefault();
                                e.stopPropagation();
                                handleViewDetails(client);
                              }
                            }}
                          >
                            {client.stage && (() => {
                              const currentStage = STAGE_OPTIONS.find(s => s.value === client.stage);
                              if (currentStage) {
                                return (
                                  <Circle 
                                    className="w-3 h-3 flex-shrink-0 fill-current"
                                    style={{ color: currentStage.color }}
                                    title={currentStage.label}
                                  />
                                );
                              }
                              return null;
                            })()}
                            {client.name}
                          </CardTitle>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="outline" className={`${statusColors[client.status]} text-xs`}>
                              {client.status}
                            </Badge>
                            {client.budget_range && (
                              <Badge variant="outline" className="bg-slate-100 text-slate-700 text-xs">
                                {client.budget_range}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="w-4 h-4" style={{ color: iconColor }} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" dir="rtl">
                            <DropdownMenuItem onClick={() => handleViewDetails(client)}>
                              <Eye className="w-4 h-4 ml-2" style={{ color: iconColor }} />
                              פתח דף לקוח
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(client)}>
                              <Edit className="w-4 h-4 ml-2" style={{ color: iconColor }} />
                              ערוך
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => duplicateClient(client)}>
                              <Copy className="w-4 h-4 ml-2" style={{ color: iconColor }} />
                              העתק
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDelete(client.id)} className="text-red-600">
                              <Trash2 className="w-4 h-4 ml-2" />
                              מחק
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {client.phone && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <Phone className="w-4 h-4" style={{ color: iconColor }} />
                          <span>{highlightText(client.phone, searchTerm)}</span>
                        </div>
                      )}
                      {client.email && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <Mail className="w-4 h-4" style={{ color: iconColor }} />
                          <span>{highlightText(client.email, searchTerm)}</span>
                        </div>
                      )}
                      {client.company && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <Building className="w-4 h-4" style={{ color: iconColor }} />
                          <span>{client.company}</span>
                        </div>
                      )}
                      {client.address && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <MapPin className="w-4 h-4" style={{ color: iconColor }} />
                          <span>{client.address}</span>
                        </div>
                      )}
                      {client.source && (
                        <div className="flex items-center gap-2 text-slate-500 text-sm">
                          <TrendingUp className="w-4 h-4" style={{ color: iconColor }} />
                          <span>מקור: {client.source}</span>
                        </div>
                      )}
                      {client.notes && (
                        <div className="mt-3 p-3 bg-slate-50 rounded-lg">
                          <p className="text-sm text-slate-600 line-clamp-3">{client.notes}</p>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-slate-400 text-xs pt-2 border-t">
                        <Clock className="w-3 h-3" style={{ color: iconColor }} />
                        <span>נוסף ב-{format(new Date(client.created_date), 'dd/MM/yy', { locale: he })}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        ) : viewMode === "kanban" ? (
          <div className="h-[calc(100vh-380px)] overflow-x-auto">
            <div className="flex gap-4 min-w-max pb-4">
              {['פוטנציאלי', 'פעיל', 'לא פעיל'].map((status) => {
                const statusClients = filteredAndSortedClients.filter(c => c.status === status);
                return (
                  <div key={status} className="flex-shrink-0 w-80">
                    <div className={`rounded-lg border-2 ${
                      status === 'פוטנציאלי' ? 'border-amber-200 bg-amber-50' :
                      status === 'פעיל' ? 'border-green-200 bg-green-50' :
                      'border-slate-200 bg-slate-50'
                    } p-4`}>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-lg">{status}</h3>
                        <Badge variant="outline" className="bg-white">
                          {statusClients.length}
                        </Badge>
                      </div>

                      <ScrollArea className="h-[calc(100vh-500px)]">
                        <div className="space-y-3 pr-2"> {/* Added pr-2 for scrollbar spacing */}
                          {isLoading ?
                            Array(3).fill(0).map((_, i) => (
                              <Card key={i} className="h-32">
                                <CardHeader className="pb-2"><Skeleton className="h-4 w-3/4" /></CardHeader>
                                <CardContent className="space-y-2 text-xs">
                                  <Skeleton className="h-3 w-full" />
                                  <Skeleton className="h-3 w-5/6" />
                                  <Skeleton className="h-3 w-2/3" />
                                </CardContent>
                              </Card>
                            ))
                          : statusClients.length === 0 ? (
                            <div className="text-center py-8 text-slate-400 text-sm">
                              אין לקוחות בסטטוס זה
                            </div>
                          ) : (
                            statusClients.map((client) => (
                              <Card
                                key={client.id}
                                className="cursor-pointer hover:shadow-md transition-all bg-white"
                                onClick={(e) => {
                                  if (e.ctrlKey || e.metaKey) {
                                    e.preventDefault();
                                    window.location.href = createPageUrl('Folders') + `?client_id=${client.id}&client_name=${encodeURIComponent(client.name)}`;
                                  } else {
                                    handleViewDetails(client);
                                  }
                                }}>
                                <CardHeader className="pb-2">
                                  <CardTitle 
                                    className="text-sm font-semibold hover:text-blue-600 transition-colors cursor-pointer flex items-center gap-2"
                                    onClick={(e) => {
                                      if (e.ctrlKey || e.metaKey) {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleViewDetails(client);
                                      }
                                    }}
                                  >
                                    {client.stage && (() => {
                                      const currentStage = STAGE_OPTIONS.find(s => s.value === client.stage);
                                      if (currentStage) {
                                        return (
                                          <Circle 
                                            className="w-2.5 h-2.5 flex-shrink-0 fill-current"
                                            style={{ color: currentStage.color }}
                                            title={currentStage.label}
                                          />
                                        );
                                      }
                                      return null;
                                    })()}
                                    {client.name}
                                  </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2 text-xs">
                                  {client.phone && (
                                    <div className="flex items-center gap-1 text-slate-600">
                                      <Phone className="w-3 h-3" style={{ color: iconColor }} />
                                      <span className="truncate">{highlightText(client.phone, searchTerm)}</span>
                                    </div>
                                  )}
                                  {client.email && (
                                    <div className="flex items-center gap-1 text-slate-600">
                                      <Mail className="w-3 h-3" style={{ color: iconColor }} />
                                      <span className="truncate">{highlightText(client.email, searchTerm)}</span>
                                    </div>
                                  )}
                                  {client.company && (
                                    <div className="flex items-center gap-1 text-slate-600">
                                      <Building className="w-3 h-3" style={{ color: iconColor }} />
                                      <span className="truncate">{client.company}</span>
                                    </div>
                                  )}
                                  <div className="flex gap-2 mt-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 text-xs"
                                      onClick={(e) => { e.stopPropagation(); handleEdit(client); }}>
                                      <Edit className="w-3 h-3 ml-1" style={{ color: iconColor }} />
                                      ערוך
                                    </Button>
                                  </div>
                                </CardContent>
                              </Card>
                            ))
                          )}
                        </div>
                      </ScrollArea>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : ( // Default to Grid view for DND
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="clients-grid">
              {(provided) => (
                <ScrollArea className="h-[calc(100vh-380px)] rounded-md pr-4">
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`grid ${viewMode === "grid" ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "grid-cols-1"} gap-6`}>
                    {isLoading ?
                      Array(8).fill(0).map((_, i) =>
                        <Card key={i} className="h-[320px]">
                          <CardHeader>
                            <Skeleton className="h-6 w-32" />
                            <Skeleton className="h-4 w-24 mt-2" />
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              <Skeleton className="h-4 w-full" />
                              <Skeleton className="h-4 w-3/4" />
                              <Skeleton className="h-4 w-5/6" />
                            </div>
                          </CardContent>
                        </Card>
                      ) :
                      filteredAndSortedClients.length === 0 ?
                        <div className="col-span-full text-center py-16">
                          <Users className="w-16 h-16 mx-auto mb-4" style={{ color: iconColor }} />
                          <h3 className="text-xl font-semibold text-slate-600 mb-2">
                            {searchTerm || statusFilter !== "all" || sourceFilter !== "all" || budgetFilter !== "all" || stageFilter !== "all" ? "לא נמצאו לקוחות" : "אין לקוחות עדיין"}
                          </h3>
                          {!searchTerm && statusFilter === "all" && sourceFilter === "all" && budgetFilter === "all" && canCreateClient &&
                            <Button onClick={() => setShowForm(true)} className="mt-4 bg-[#2C3A50] hover:bg-[#1f2937]">
                              <Plus className="w-4 h-4 ml-2" />
                              הוסף לקוח ראשון
                            </Button>
                          }
                        </div> :
                        filteredAndSortedClients.map((client, index) =>
                          <Draggable key={client.id} draggableId={client.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={`h-[320px] transition-all ${snapshot.isDragging ? 'opacity-50 scale-105 rotate-2' : ''}`}>
                                <ClientCard
                                  client={client}
                                  onEdit={() => handleEdit(client)}
                                  onView={() => handleViewDetails(client)}
                                  selectionMode={selectionMode}
                                  selected={selectedIds.includes(client.id)}
                                  onToggleSelect={() => toggleSelect(client.id)}
                                  onCopy={() => duplicateClient(client)}
                                  onDelete={() => handleDelete(client.id)}
                                  onEnterSelectionMode={() => enterSelectionModeWith(client.id)}
                                  isDraggable={true}
                                  dragHandleProps={provided.dragHandleProps}
                                />
                              </div>
                            )}
                          </Draggable>
                        )
                    }
                    {provided.placeholder}
                  </div>
                </ScrollArea>
              )}
            </Droppable>
          </DragDropContext>
        )}
      </div>

      {/* Footer */}
      {!isLoading && filteredAndSortedClients.length > 0 &&
        <div className="text-center mt-8">
          <p className="text-slate-500">
            מציג {filteredAndSortedClients.length} מתוך {clients.length} לקוחות
          </p>
        </div>
      }
    </div>
  );
}