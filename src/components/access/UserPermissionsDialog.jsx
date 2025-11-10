import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Users, Briefcase, CheckCircle2, Square } from "lucide-react";
import { AccessControl } from "@/entities/all";
import { toast } from "react-hot-toast";

export default function UserPermissionsDialog({ 
  open, 
  onClose, 
  user, 
  clients = [], 
  projects = [],
  onSuccess 
}) {
  const [assignedClients, setAssignedClients] = useState([]);
  const [assignedProjects, setAssignedProjects] = useState([]);
  const [clientSearch, setClientSearch] = useState("");
  const [projectSearch, setProjectSearch] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setAssignedClients(user.assigned_clients || []);
      setAssignedProjects(user.assigned_projects || []);
    }
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await AccessControl.update(user.id, {
        assigned_clients: assignedClients,
        assigned_projects: assignedProjects
      });
      toast.success('הרשאות עודכנו בהצלחה!');
      onSuccess?.();
      onClose();
    } catch (error) {
      toast.error('שגיאה בעדכון הרשאות');
    } finally {
      setSaving(false);
    }
  };

  const toggleClient = (clientId) => {
    setAssignedClients(prev => 
      prev.includes(clientId) 
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    );
  };

  const toggleProject = (projectId) => {
    setAssignedProjects(prev => 
      prev.includes(projectId) 
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId]
    );
  };

  const selectAllClients = () => {
    setAssignedClients(
      assignedClients.length === filteredClients.length 
        ? [] 
        : filteredClients.map(c => c.id)
    );
  };

  const selectAllProjects = () => {
    setAssignedProjects(
      assignedProjects.length === filteredProjects.length 
        ? [] 
        : filteredProjects.map(p => p.id)
    );
  };

  const filteredClients = clients.filter(c => 
    (c.name || "").toLowerCase().includes(clientSearch.toLowerCase())
  );

  const filteredProjects = projects.filter(p => 
    (p.name || "").toLowerCase().includes(projectSearch.toLowerCase()) ||
    (p.client_name || "").toLowerCase().includes(projectSearch.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]" dir="rtl">
        <DialogHeader className="text-right">
          <DialogTitle className="flex items-center gap-2 text-right">
            <Users className="w-5 h-5" />
            הרשאות גישה - {user?.email}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="clients" className="w-full" dir="rtl">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="clients" className="gap-2">
              <Users className="w-4 h-4" />
              לקוחות ({assignedClients.length})
            </TabsTrigger>
            <TabsTrigger value="projects" className="gap-2">
              <Briefcase className="w-4 h-4" />
              פרויקטים ({assignedProjects.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="clients" className="mt-4 space-y-4">
            <div className="flex gap-3" dir="rtl">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="חיפוש לקוחות..."
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  className="pr-10 text-right"
                  dir="rtl"
                />
              </div>
              <Button
                variant="outline"
                onClick={selectAllClients}
                className="gap-2"
              >
                {assignedClients.length === filteredClients.length ? (
                  <>
                    <Square className="w-4 h-4" />
                    בטל הכל
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    בחר הכל
                  </>
                )}
              </Button>
            </div>

            <ScrollArea className="h-[400px] border rounded-lg p-4">
              <div className="space-y-2">
                {filteredClients.map((client) => (
                  <div
                    key={client.id}
                    className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-lg transition-colors"
                    dir="rtl"
                  >
                    <Checkbox
                      checked={assignedClients.includes(client.id)}
                      onCheckedChange={() => toggleClient(client.id)}
                    />
                    <div className="flex-1 text-right">
                      <div className="font-medium text-right">{client.name}</div>
                      {client.email && (
                        <div className="text-xs text-slate-500 text-right">{client.email}</div>
                      )}
                    </div>
                    {client.status && (
                      <Badge variant="outline">{client.status}</Badge>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="projects" className="mt-4 space-y-4">
            <div className="flex gap-3" dir="rtl">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="חיפוש פרויקטים..."
                  value={projectSearch}
                  onChange={(e) => setProjectSearch(e.target.value)}
                  className="pr-10 text-right"
                  dir="rtl"
                />
              </div>
              <Button
                variant="outline"
                onClick={selectAllProjects}
                className="gap-2"
              >
                {assignedProjects.length === filteredProjects.length ? (
                  <>
                    <Square className="w-4 h-4" />
                    בטל הכל
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    בחר הכל
                  </>
                )}
              </Button>
            </div>

            <ScrollArea className="h-[400px] border rounded-lg p-4">
              <div className="space-y-2">
                {filteredProjects.map((project) => (
                  <div
                    key={project.id}
                    className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-lg transition-colors"
                    dir="rtl"
                  >
                    <Checkbox
                      checked={assignedProjects.includes(project.id)}
                      onCheckedChange={() => toggleProject(project.id)}
                    />
                    <div className="flex-1 text-right">
                      <div className="font-medium text-right">{project.name}</div>
                      {project.client_name && (
                        <div className="text-xs text-slate-500 text-right">{project.client_name}</div>
                      )}
                    </div>
                    {project.status && (
                      <Badge variant="outline">{project.status}</Badge>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <DialogFooter dir="rtl">
          <div className="flex gap-2 justify-end w-full">
            <Button variant="outline" onClick={onClose}>ביטול</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'שומר...' : 'שמור שינויים'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}