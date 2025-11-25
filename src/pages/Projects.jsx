import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Project, Client, User } from "@/entities/all"; // This import might become redundant if base44 fully replaces them, but keeping for safety as original code had it.
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  FolderOpen, 
  Plus, 
  Search,
  Filter,
  MapPin,
  Calendar,
  TrendingUp,
  Users,
  Building,
  Eye,
  Edit,
  FileText,
  Copy,
  Trash2,
  CheckSquare,
  Square
} from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";

import ProjectForm from "../components/projects/ProjectForm";
import ProjectCard from "../components/projects/ProjectCard";
import ProjectStats from "../components/projects/ProjectStats";
import { useAccessControl } from "../components/access/AccessValidator";
import { useIsMobile } from "../components/utils/useMediaQuery";
import PullToRefresh from "../components/mobile/PullToRefresh";

export default function ProjectsPage() {
  const { isAdmin, filterProjects, filterClients, loading: accessLoading } = useAccessControl();
  const isMobile = useIsMobile();

  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("created_date");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  useEffect(() => {
    if (!accessLoading) {
      loadProjects();
    }
  }, [accessLoading]);

  const loadProjects = async () => {
    setIsLoading(true);
    try {
      const [projectsData, clientsData] = await Promise.all([
        base44.entities.Project.list('-created_date'),
        base44.entities.Client.list()
      ]);

      const filteredProjects = filterProjects(projectsData);
      const filteredClients = filterClients(clientsData);

      console.log('✅ [PROJECTS] Loaded:', {
        totalProjects: projectsData.length,
        filteredProjects: filteredProjects.length,
        totalClients: clientsData.length,
        filteredClients: filteredClients.length,
        isAdmin
      });

      setProjects(filteredProjects);
      setClients(filteredClients);
    } catch (error) {
      console.error('❌ [PROJECTS] Error:', error);
    }
    setIsLoading(false);
  };

  const reloadProjects = async () => {
    const projectsData = await base44.entities.Project.list('-created_date');
    // Ensure reloaded projects are also filtered
    const filteredProjects = filterProjects(projectsData);
    setProjects(filteredProjects);
  };

  const handleSubmit = async (projectData) => {
    try {
      if (editingProject) {
        await base44.entities.Project.update(editingProject.id, projectData);
      } else {
        await base44.entities.Project.create(projectData);
      }
      setShowForm(false);
      setEditingProject(null);
      reloadProjects();
    } catch (error) {
      console.error('Error saving project:', error);
    }
  };

  const handleEdit = (project) => {
    setEditingProject(project);
    setShowForm(true);
  };

  const toggleSelectionMode = () => {
    setSelectionMode((v) => {
      if (!v) return true; // Turn on selection mode
      setSelectedIds([]); // Clear selection when turning off
      return false; // Turn off selection mode
    });
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    const allFilteredProjectIds = filteredAndSortedProjects.map(p => p.id);
    const isAllSelected = selectedIds.length === allFilteredProjectIds.length && allFilteredProjectIds.length > 0 && selectedIds.every(id => allFilteredProjectIds.includes(id));
    setSelectedIds(isAllSelected ? [] : allFilteredProjectIds);
  };

  const duplicateProject = async (project) => {
    const { id, created_date, updated_date, created_by, ...rest } = project;
    const newName = `${project.name} (העתק)`;
    await base44.entities.Project.create({ ...rest, name: newName });
    reloadProjects();
  };

  const handleDelete = async (projectId) => {
    if (!confirm('האם למחוק את הפרויקט? הפעולה אינה הפיכה.')) return;
    await base44.entities.Project.delete(projectId);
    reloadProjects();
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    const allSelected = selectedIds.length === filteredAndSortedProjects.length;
    if (allSelected) {
      const ok = confirm(`בחרת למחוק ${selectedIds.length} פרויקטים (כל הרשימה המסוננת). האם להמשיך?`);
      if (!ok) return;
    } else {
      const ok = confirm(`למחוק ${selectedIds.length} פרויקטים?`);
      if (!ok) return;
    }
    await Promise.all(selectedIds.map((id) => base44.entities.Project.delete(id)));
    setSelectedIds([]);
    reloadProjects();
  };

  const handleBulkCopy = async () => {
    if (selectedIds.length === 0) return;
    const allSelected = selectedIds.length === filteredAndSortedProjects.length;
    if (allSelected) {
      const ok = confirm(`נבחרו ${selectedIds.length} פרויקטים (כל הרשימה המסוננת) להעתקה. האם להמשיך?`);
      if (!ok) return;
    }
    const idSet = new Set(selectedIds);
    const toCopy = filteredAndSortedProjects.filter(p => idSet.has(p.id));
    for (const p of toCopy) {
      await duplicateProject(p);
    }
    setSelectedIds([]);
    reloadProjects();
  };

  const filteredAndSortedProjects = projects
    .filter(project => {
      const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (project.client_name && project.client_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                           (project.location && project.location.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus = statusFilter === "all" || project.status === statusFilter;
      const matchesClient = clientFilter === "all" || project.client_name === clientFilter;
      const matchesType = typeFilter === "all" || project.type === typeFilter;
      
      return matchesSearch && matchesStatus && matchesClient && matchesType;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "created_date":
          return new Date(b.created_date) - new Date(a.created_date);
        case "start_date":
          if (!a.start_date && !b.start_date) return 0;
          if (!a.start_date) return 1;
          if (!b.start_date) return -1;
          return new Date(b.start_date) - new Date(a.start_date);
        case "budget":
          return (b.budget || 0) - (a.budget || 0);
        default:
          return 0;
      }
    });

  return (
    <PullToRefresh onRefresh={loadProjects}>
    <div className={`${isMobile ? 'p-3 pb-24' : 'p-6 lg:p-8 pl-24 lg:pl-12'} min-h-screen`} dir="rtl" style={{ backgroundColor: 'var(--bg-cream, #FCF6E3)' }}>
      <div className="max-w-7xl mx-auto">
        {/* Header - Desktop Only */}
        {!isMobile && (
          <div className="flex justify-between items-center mb-8 text-right">
            <div>
              <h1 className="text-4xl font-bold text-slate-900 mb-2">ניהול פרויקטים</h1>
              <p className="text-slate-600">מעקב אחר כל הפרויקטים והתקדמותם</p>
            </div>
            <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              פרויקט חדש
            </Button>
          </div>
        )}

        {/* Selection mode toggle - Desktop Only */}
        {!isMobile && (
          <div className="flex flex-wrap gap-2 mb-4 justify-end">
            <Button
              variant={selectionMode ? "default" : "outline"}
              onClick={toggleSelectionMode}
              className={selectionMode ? "bg-purple-600 hover:bg-purple-700 text-white" : ""}
              title="מצב בחירה מרובה"
            >
              {selectionMode ? (
                <>
                  <CheckSquare className="w-4 h-4 ml-2" />
                  ביטול בחירה
                </>
              ) : (
                <>
                  <Square className="w-4 h-4 ml-2" />
                  מצב בחירה
                </>
              )}
            </Button>
          </div>
        )}

        {/* Bulk actions bar */}
        {selectionMode && selectedIds.length > 0 && (
          <div className="mb-4 bg-white border rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between shadow-sm">
            <div className="text-slate-700 mb-2 sm:mb-0">
              נבחרו {selectedIds.length} פרויקטים
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              <Button variant="outline" onClick={() => selectAll()} className="gap-2">
                <CheckSquare className="w-4 h-4" /> {selectedIds.length === filteredAndSortedProjects.length ? 'בטל הכל' : 'בחר הכל'}
              </Button>
              <Button variant="outline" onClick={handleBulkCopy} className="gap-2">
                <Copy className="w-4 h-4" /> העתק
              </Button>
              <Button variant="destructive" onClick={handleBulkDelete} className="gap-2">
                <Trash2 className="w-4 h-4" /> מחק
              </Button>
            </div>
          </div>
        )}

        {/* Stats - Compact on Mobile */}
        {!isMobile && (
          <div className="mb-8">
            <ProjectStats projects={projects} isLoading={isLoading} />
          </div>
        )}

        {/* Mobile Stats - Horizontal Scroll */}
        {isMobile && (
          <div className="flex gap-3 overflow-x-auto pb-3 mb-4 -mx-3 px-3">
            <div className="flex-shrink-0 bg-blue-50 rounded-xl px-4 py-3 min-w-[140px]">
              <div className="flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-blue-600" />
                <span className="text-2xl font-bold text-blue-600">{projects.length}</span>
              </div>
              <p className="text-xs text-blue-600/70 mt-1">פרויקטים</p>
            </div>
            <div className="flex-shrink-0 bg-green-50 rounded-xl px-4 py-3 min-w-[140px]">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                <span className="text-2xl font-bold text-green-600">
                  {projects.length > 0 ? Math.round(projects.reduce((sum, p) => sum + (p.progress || 0), 0) / projects.length) : 0}%
                </span>
              </div>
              <p className="text-xs text-green-600/70 mt-1">התקדמות ממוצעת</p>
            </div>
            <div className="flex-shrink-0 bg-amber-50 rounded-xl px-4 py-3 min-w-[140px]">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-amber-600" />
                <span className="text-2xl font-bold text-amber-600">
                  {projects.filter(p => p.status === 'היתרים').length}
                </span>
              </div>
              <p className="text-xs text-amber-600/70 mt-1">אישורים בהמתנה</p>
            </div>
          </div>
        )}

        {/* Filters and Search */}
        <Card className={`${isMobile ? 'mb-4' : 'mb-6'} shadow-lg border-0 bg-white/80 backdrop-blur-sm`}>
          <CardContent className={isMobile ? "p-3" : "p-6"}>
            {/* Search */}
            <div className={`relative ${isMobile ? 'mb-3' : 'mb-4'}`}>
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                placeholder="חיפוש פרויקטים..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`pr-10 ${isMobile ? 'h-12 text-base rounded-xl' : ''}`}
              />
            </div>

            {/* Filters */}
            <div className={`flex ${isMobile ? 'gap-2' : 'flex-col lg:flex-row gap-4'}`}>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className={`${isMobile ? 'flex-1 h-10 text-sm' : 'w-full lg:w-40'}`}>
                  <SelectValue placeholder="סטטוס" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל הסטטוסים</SelectItem>
                  <SelectItem value="הצעת מחיר">הצעת מחיר</SelectItem>
                  <SelectItem value="תכנון">תכנון</SelectItem>
                  <SelectItem value="היתרים">היתרים</SelectItem>
                  <SelectItem value="ביצוע">ביצוע</SelectItem>
                  <SelectItem value="הושלם">הושלם</SelectItem>
                  <SelectItem value="מבוטל">מבוטל</SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className={`${isMobile ? 'flex-1 h-10 text-sm' : 'w-full lg:w-40'}`}>
                  <SelectValue placeholder="סוג" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל הסוגים</SelectItem>
                  <SelectItem value="דירת מגורים">דירת מגורים</SelectItem>
                  <SelectItem value="בית פרטי">בית פרטי</SelectItem>
                  <SelectItem value="משרדים">משרדים</SelectItem>
                  <SelectItem value="מסחרי">מסחרי</SelectItem>
                  <SelectItem value="ציבורי">ציבורי</SelectItem>
                  <SelectItem value="אחר">אחר</SelectItem>
                </SelectContent>
              </Select>

              {!isMobile && (
                <Select value={clientFilter} onValueChange={setClientFilter}>
                  <SelectTrigger className="w-full lg:w-40">
                    <SelectValue placeholder="לקוח" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">כל הלקוחות</SelectItem>
                    {clients.map(client => (
                      <SelectItem key={client.id} value={client.name}>{client.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Sort - Desktop Only */}
            {!isMobile && (
              <div className="flex justify-between items-center mt-4">
                <div className="text-sm text-slate-600">
                  {filteredAndSortedProjects.length} מתוך {projects.length} פרויקטים
                </div>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="מיין לפי" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="created_date">תאריך יצירה</SelectItem>
                    <SelectItem value="name">שם פרויקט</SelectItem>
                    <SelectItem value="start_date">תאריך התחלה</SelectItem>
                    <SelectItem value="budget">תקציב</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Project Form Modal */}
        {showForm && (
          <ProjectForm
            project={editingProject}
            clients={clients}
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false);
              setEditingProject(null);
            }}
          />
        )}

        {/* Projects Grid / List */}
        {isMobile ? (
          // Mobile List View
          <div className="space-y-3">
            {isLoading ? (
              Array(4).fill(0).map((_, i) => (
                <div key={i} className="h-28 bg-slate-200 rounded-xl animate-pulse" />
              ))
            ) : filteredAndSortedProjects.length === 0 ? (
              <div className="text-center py-12">
                <FolderOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-600 mb-2">
                  {searchTerm || statusFilter !== "all" ? "לא נמצאו פרויקטים" : "עדיין אין פרויקטים"}
                </h3>
                <Button onClick={() => setShowForm(true)} className="mt-4 bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 ml-2" />
                  הוסף פרויקט
                </Button>
              </div>
            ) : (
              filteredAndSortedProjects.map((project) => (
                <Link key={project.id} to={createPageUrl('ProjectDetails') + `?id=${project.id}`}>
                  <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm active:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-slate-900 truncate">{project.name}</h3>
                        {project.client_name && (
                          <p className="text-sm text-slate-500 truncate">{project.client_name}</p>
                        )}
                      </div>
                      <Badge className={`text-xs flex-shrink-0 ${
                        project.status === 'ביצוע' ? 'bg-green-100 text-green-700' :
                        project.status === 'תכנון' ? 'bg-blue-100 text-blue-700' :
                        project.status === 'היתרים' ? 'bg-amber-100 text-amber-700' :
                        project.status === 'הושלם' ? 'bg-slate-100 text-slate-700' :
                        'bg-purple-100 text-purple-700'
                      }`}>
                        {project.status}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-slate-600">
                      {project.location && (
                        <span className="flex items-center gap-1 truncate">
                          <MapPin className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">{project.location}</span>
                        </span>
                      )}
                      {project.type && (
                        <span className="flex items-center gap-1">
                          <Building className="w-4 h-4" />
                          {project.type}
                        </span>
                      )}
                    </div>

                    {/* Progress Bar */}
                    {project.progress !== undefined && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                          <span>התקדמות</span>
                          <span>{project.progress || 0}%</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-500 rounded-full transition-all"
                            style={{ width: `${project.progress || 0}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </Link>
              ))
            )}
          </div>
        ) : (
          // Desktop Grid View
          <div className="max-h-[600px] overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {isLoading ? (
                Array(6).fill(0).map((_, i) => (
                  <Skeleton key={i} className="h-72 rounded-xl" />
                ))
              ) : filteredAndSortedProjects.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <FolderOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-slate-600 mb-2">
                    {searchTerm || statusFilter !== "all" ? "לא נמצאו פרויקטים" : "עדיין אין פרויקטים"}
                  </h3>
                  <p className="text-slate-500 mb-6">
                    {searchTerm || statusFilter !== "all" 
                      ? "נסה לשנות את הפילטרים או החיפוש" 
                      : "הוסף את הפרויקט הראשון שלך כדי להתחיל"
                    }
                  </p>
                  {!searchTerm && statusFilter === "all" && (
                    <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700">
                      <Plus className="w-4 h-4 ml-2" />
                      הוסף פרויקט ראשון
                    </Button>
                  )}
                </div>
              ) : (
                filteredAndSortedProjects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onEdit={() => handleEdit(project)}
                    selectionMode={selectionMode}
                    selected={selectedIds.includes(project.id)}
                    onToggleSelect={() => toggleSelect(project.id)}
                    onCopy={() => duplicateProject(project)}
                    onDelete={handleDelete}
                  />
                ))
              )}
            </div>
          </div>
        )}

        {/* Mobile FAB for adding new project */}
        {isMobile && (
          <button
            onClick={() => setShowForm(true)}
            className="fixed bottom-24 left-4 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center z-40 active:scale-95 transition-transform"
          >
            <Plus className="w-6 h-6" />
          </button>
        )}
      </div>
    </div>
    </PullToRefresh>
  );
}