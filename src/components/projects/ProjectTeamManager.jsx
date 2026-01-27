import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Users, Plus, Trash2, Clock, DollarSign, Edit2, X, UserPlus } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function ProjectTeamManager({ project, onUpdate }) {
  const [teamMembers, setTeamMembers] = useState(project.team_members || []);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [allTeamMembers, setAllTeamMembers] = useState([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [newMember, setNewMember] = useState({
    email: '',
    name: '',
    role: '',
    hourly_rate: 0,
    allocated_hours: 0
  });

  useEffect(() => {
    loadAvailableUsers();
  }, []);

  const loadAvailableUsers = async () => {
    try {
      const [users, tms] = await Promise.all([
        base44.entities.User.list(),
        base44.entities.TeamMember.list()
      ]);
      setAvailableUsers(users);
      setAllTeamMembers(tms);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const handleSelectUser = (email) => {
    const user = availableUsers.find(u => u.email === email);
    const tm = allTeamMembers.find(t => t.email === email);
    
    setNewMember({
      email: email,
      name: user?.full_name || '',
      role: tm?.role || '',
      hourly_rate: tm?.hourly_rate || 0,
      allocated_hours: 0
    });
  };

  const handleAddMember = async () => {
    if (!newMember.email) {
      toast.error('יש לבחור עובד');
      return;
    }

    // Check if already in team
    if (teamMembers.find(m => m.email === newMember.email)) {
      toast.error('העובד כבר משויך לפרויקט');
      return;
    }

    const updatedTeam = [...teamMembers, { ...newMember }];
    setTeamMembers(updatedTeam);
    
    await onUpdate({ team_members: updatedTeam });
    
    setShowAddDialog(false);
    setNewMember({ email: '', name: '', role: '', hourly_rate: 0, allocated_hours: 0 });
    toast.success('העובד נוסף לפרויקט');
  };

  const handleUpdateMember = async () => {
    if (!editingMember) return;

    const updatedTeam = teamMembers.map(m => 
      m.email === editingMember.email ? editingMember : m
    );
    setTeamMembers(updatedTeam);
    
    await onUpdate({ team_members: updatedTeam });
    
    setEditingMember(null);
    toast.success('פרטי העובד עודכנו');
  };

  const handleRemoveMember = async (email) => {
    if (!confirm('להסיר את העובד מהפרויקט?')) return;

    const updatedTeam = teamMembers.filter(m => m.email !== email);
    setTeamMembers(updatedTeam);
    
    await onUpdate({ team_members: updatedTeam });
    toast.success('העובד הוסר מהפרויקט');
  };

  const totalAllocatedHours = teamMembers.reduce((sum, m) => sum + (m.allocated_hours || 0), 0);
  const totalEstimatedCost = teamMembers.reduce((sum, m) => sum + ((m.allocated_hours || 0) * (m.hourly_rate || 0)), 0);

  return (
    <Card className="shadow-lg border-0">
      <CardHeader className="border-b flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-600" />
          צוות הפרויקט ({teamMembers.length})
        </CardTitle>
        <Button onClick={() => setShowAddDialog(true)} size="sm" className="bg-blue-600 hover:bg-blue-700">
          <UserPlus className="w-4 h-4 ml-1" />
          הוסף לצוות
        </Button>
      </CardHeader>
      <CardContent className="p-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 rounded-xl p-4 text-center">
            <div className="text-sm text-blue-600">חברי צוות</div>
            <div className="text-2xl font-bold text-blue-700">{teamMembers.length}</div>
          </div>
          <div className="bg-purple-50 rounded-xl p-4 text-center">
            <div className="text-sm text-purple-600">שעות מוקצות</div>
            <div className="text-2xl font-bold text-purple-700">{totalAllocatedHours}</div>
          </div>
          <div className="bg-green-50 rounded-xl p-4 text-center">
            <div className="text-sm text-green-600">עלות משוערת</div>
            <div className="text-2xl font-bold text-green-700">₪{totalEstimatedCost.toLocaleString()}</div>
          </div>
        </div>

        {/* Team List */}
        {teamMembers.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p>לא שויכו עובדים לפרויקט זה</p>
            <Button 
              variant="outline" 
              className="mt-3"
              onClick={() => setShowAddDialog(true)}
            >
              <Plus className="w-4 h-4 ml-1" />
              הוסף עובד ראשון
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {teamMembers.map((member, idx) => (
              <div 
                key={member.email || idx}
                className="flex items-center justify-between p-4 border rounded-xl hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                    {(member.name || member.email || '?')[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900">{member.name || member.email}</div>
                    <div className="text-sm text-slate-500">{member.role || 'לא הוגדר תפקיד'}</div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className="flex items-center gap-1 text-sm text-slate-600">
                      <Clock className="w-4 h-4" />
                      {member.allocated_hours || 0} שעות
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center gap-1 text-sm text-slate-600">
                      <DollarSign className="w-4 h-4" />
                      ₪{member.hourly_rate || 0}/שעה
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-700">
                    ₪{((member.allocated_hours || 0) * (member.hourly_rate || 0)).toLocaleString()}
                  </Badge>
                  <div className="flex gap-1">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setEditingMember({ ...member })}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="text-red-500 hover:text-red-700"
                      onClick={() => handleRemoveMember(member.email)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Member Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="max-w-md" dir="rtl">
            <DialogHeader>
              <DialogTitle>הוסף עובד לפרויקט</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">בחר עובד</label>
                <Select value={newMember.email} onValueChange={handleSelectUser}>
                  <SelectTrigger>
                    <SelectValue placeholder="בחר עובד..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableUsers.map(user => (
                      <SelectItem key={user.email} value={user.email}>
                        {user.full_name || user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">תפקיד בפרויקט</label>
                <Input 
                  value={newMember.role}
                  onChange={e => setNewMember({ ...newMember, role: e.target.value })}
                  placeholder="למשל: מנהל פרויקט, מעצב..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">שכר שעתי</label>
                  <Input 
                    type="number"
                    value={newMember.hourly_rate}
                    onChange={e => setNewMember({ ...newMember, hourly_rate: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">שעות מוקצות</label>
                  <Input 
                    type="number"
                    value={newMember.allocated_hours}
                    onChange={e => setNewMember({ ...newMember, allocated_hours: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>ביטול</Button>
                <Button onClick={handleAddMember} className="bg-blue-600 hover:bg-blue-700">הוסף לצוות</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Member Dialog */}
        <Dialog open={!!editingMember} onOpenChange={() => setEditingMember(null)}>
          <DialogContent className="max-w-md" dir="rtl">
            <DialogHeader>
              <DialogTitle>עריכת פרטי עובד</DialogTitle>
            </DialogHeader>
            {editingMember && (
              <div className="space-y-4 mt-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">שם</label>
                  <Input value={editingMember.name} disabled className="bg-slate-50" />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">תפקיד בפרויקט</label>
                  <Input 
                    value={editingMember.role}
                    onChange={e => setEditingMember({ ...editingMember, role: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1 block">שכר שעתי</label>
                    <Input 
                      type="number"
                      value={editingMember.hourly_rate}
                      onChange={e => setEditingMember({ ...editingMember, hourly_rate: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1 block">שעות מוקצות</label>
                    <Input 
                      type="number"
                      value={editingMember.allocated_hours}
                      onChange={e => setEditingMember({ ...editingMember, allocated_hours: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-4">
                  <Button variant="outline" onClick={() => setEditingMember(null)}>ביטול</Button>
                  <Button onClick={handleUpdateMember} className="bg-blue-600 hover:bg-blue-700">שמור שינויים</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}