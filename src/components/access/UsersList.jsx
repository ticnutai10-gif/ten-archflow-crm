import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Settings, 
  Trash2, 
  CheckCircle2, 
  XCircle,
  Shield,
  Users,
  Briefcase,
  Pencil,
  Crown
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const roleColors = {
  super_admin: 'bg-purple-100 text-purple-700 border-purple-200',
  admin: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  manager_plus: 'bg-blue-100 text-blue-700 border-blue-200',
  staff: 'bg-slate-100 text-slate-700 border-slate-200',
  client: 'bg-emerald-100 text-emerald-700 border-emerald-200'
};

const roleLabels = {
  super_admin: 'מנהל על',
  admin: 'מנהל',
  manager_plus: 'מנהל פלוס',
  staff: 'עובד',
  client: 'לקוח'
};

export default function UsersList({ 
  users, 
  loading, 
  onToggleActive, 
  onDelete, 
  onOpenPermissions,
  onEditUserName
}) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array(5).fill(0).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-slate-600">אין משתמשים להצגה</h3>
        <p className="text-slate-500 mt-2">נסה לשנות את הפילטרים או החיפוש</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50">
            <TableHead className="text-right w-12"></TableHead>
            <TableHead className="text-right">שם משתמש</TableHead>
            <TableHead className="text-right">מייל</TableHead>
            <TableHead className="text-right">תפקיד</TableHead>
            <TableHead className="text-right">שיוכים</TableHead>
            <TableHead className="text-right">סטטוס</TableHead>
            <TableHead className="text-right w-[250px]">פעולות</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => {
            const displayName = user.full_name || user.email?.split('@')[0] || 'משתמש';
            const initials = displayName.substring(0, 2).toUpperCase();
            const isVirtual = user.isVirtual; // רשומה וירטואלית של מנהל על
            
            return (
              <TableRow key={user.id} className="hover:bg-slate-50">
                <TableCell>
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className={roleColors[user.role]}>
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </TableCell>
                
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div>
                      <div className="font-medium text-slate-900">
                        {user.full_name || (
                          <span className="text-slate-400 text-sm">לא הוגדר</span>
                        )}
                      </div>
                      {user.client_name && (
                        <div className="text-xs text-slate-500 mt-1">
                          {user.client_name}
                        </div>
                      )}
                    </div>
                    {user.role === 'super_admin' && (
                      <Crown className="w-4 h-4 text-purple-600" title="מנהל על" />
                    )}
                  </div>
                </TableCell>
                
                <TableCell>
                  <div className="text-sm text-slate-600">{user.email}</div>
                </TableCell>
                
                <TableCell>
                  <Badge className={roleColors[user.role]}>
                    {roleLabels[user.role] || user.role}
                  </Badge>
                </TableCell>
                
                <TableCell>
                  <div className="flex gap-2">
                    {user.assigned_clients?.length > 0 && (
                      <Badge variant="outline" className="gap-1">
                        <Users className="w-3 h-3" />
                        {user.assigned_clients.length} לקוחות
                      </Badge>
                    )}
                    {user.assigned_projects?.length > 0 && (
                      <Badge variant="outline" className="gap-1">
                        <Briefcase className="w-3 h-3" />
                        {user.assigned_projects.length} פרויקטים
                      </Badge>
                    )}
                    {!user.assigned_clients?.length && !user.assigned_projects?.length && (
                      <span className="text-xs text-slate-400">
                        {user.role === 'super_admin' || user.role === 'admin' || user.role === 'manager_plus' 
                          ? 'גישה לכל' 
                          : 'אין שיוכים'}
                      </span>
                    )}
                  </div>
                </TableCell>
                
                <TableCell>
                  {user.active ? (
                    <Badge className="bg-emerald-100 text-emerald-700 gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      פעיל
                    </Badge>
                  ) : (
                    <Badge className="bg-slate-100 text-slate-700 gap-1">
                      <XCircle className="w-3 h-3" />
                      מושהה
                    </Badge>
                  )}
                </TableCell>
                
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEditUserName && onEditUserName(user)}
                      className="gap-1"
                      title="ערוך שם משתמש"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      שם
                    </Button>

                    {!isVirtual && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onOpenPermissions(user)}
                          className="gap-1"
                        >
                          <Settings className="w-3.5 h-3.5" />
                          הרשאות
                        </Button>
                        
                        <Button
                          variant={user.active ? "secondary" : "outline"}
                          size="sm"
                          onClick={() => onToggleActive(user)}
                          className="gap-1"
                        >
                          {user.active ? (
                            <>
                              <XCircle className="w-3.5 h-3.5" />
                              השבת
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              הפעל
                            </>
                          )}
                        </Button>
                        
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => onDelete(user)}
                          className="gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    )}
                    
                    {isVirtual && (
                      <Badge variant="outline" className="text-xs text-purple-600 border-purple-300">
                        הרשאות מוגדרות במערכת
                      </Badge>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}