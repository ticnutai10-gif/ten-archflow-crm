import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, XCircle, Clock, User as UserIcon, Mail, Phone, Building2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function UserApprovalsPage() {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadPendingUsers();
  }, []);

  const loadPendingUsers = async () => {
    setLoading(true);
    try {
      const users = await base44.entities.PendingUser.filter(
        { status: "pending" },
        "-created_date"
      );
      setPendingUsers(users);
    } catch (error) {
      console.error("Error loading pending users:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (user) => {
    if (!confirm(`האם לאשר את ${user.full_name}?`)) return;

    setProcessing(true);
    try {
      // עדכון סטטוס לאושר
      await base44.entities.PendingUser.update(user.id, {
        status: "approved",
        reviewed_at: new Date().toISOString(),
        admin_notes: adminNotes
      });

      // הוספה ל-AccessControl
      await base44.entities.AccessControl.create({
        email: user.email,
        role: "staff",
        active: true,
        notes: `אושר על ידי מנהל - ${user.full_name}`
      });

      // שליחת מייל אישור למשתמש
      await base44.functions.invoke('sendApprovalEmail', {
        email: user.email,
        full_name: user.full_name,
        approved: true
      });

      alert("המשתמש אושר בהצלחה!");
      setSelectedUser(null);
      setAdminNotes("");
      loadPendingUsers();
    } catch (error) {
      alert("שגיאה באישור משתמש: " + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (user) => {
    if (!confirm(`האם לדחות את ${user.full_name}?`)) return;

    setProcessing(true);
    try {
      await base44.entities.PendingUser.update(user.id, {
        status: "rejected",
        reviewed_at: new Date().toISOString(),
        admin_notes: adminNotes
      });

      await base44.functions.invoke('sendApprovalEmail', {
        email: user.email,
        full_name: user.full_name,
        approved: false,
        reason: adminNotes
      });

      alert("הבקשה נדחתה");
      setSelectedUser(null);
      setAdminNotes("");
      loadPendingUsers();
    } catch (error) {
      alert("שגיאה בדחיית משתמש: " + error.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen" dir="rtl">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">אישור משתמשים חדשים</h1>
            <p className="text-slate-600 mt-2">סקירה ואישור בקשות הרשמה למערכת</p>
          </div>
          <Badge variant="outline" className="text-lg px-4 py-2">
            <Clock className="w-4 h-4 ml-2" />
            {pendingUsers.length} ממתינים
          </Badge>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
            <p className="text-slate-600 mt-4">טוען בקשות...</p>
          </div>
        ) : pendingUsers.length === 0 ? (
          <Card className="shadow-lg">
            <CardContent className="py-12 text-center">
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-900">אין בקשות ממתינות</h3>
              <p className="text-slate-600 mt-2">כל הבקשות טופלו</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {pendingUsers.map((user) => (
              <Card key={user.id} className="shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                        <UserIcon className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">{user.full_name}</CardTitle>
                        <p className="text-sm text-slate-600">
                          נרשם: {new Date(user.created_date).toLocaleDateString('he-IL')}
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-amber-100 text-amber-800">
                      <Clock className="w-3 h-3 ml-1" />
                      ממתין
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="pt-6">
                  <div className="grid md:grid-cols-2 gap-4 mb-6">
                    <div className="flex items-center gap-2 text-slate-700">
                      <Mail className="w-4 h-4 text-slate-400" />
                      <span className="font-medium">אימייל:</span>
                      <span>{user.email}</span>
                    </div>
                    {user.phone && (
                      <div className="flex items-center gap-2 text-slate-700">
                        <Phone className="w-4 h-4 text-slate-400" />
                        <span className="font-medium">טלפון:</span>
                        <span>{user.phone}</span>
                      </div>
                    )}
                    {user.company && (
                      <div className="flex items-center gap-2 text-slate-700">
                        <Building2 className="w-4 h-4 text-slate-400" />
                        <span className="font-medium">חברה:</span>
                        <span>{user.company}</span>
                      </div>
                    )}
                  </div>

                  {user.reason && (
                    <div className="bg-slate-50 rounded-lg p-4 mb-4">
                      <p className="text-sm font-medium text-slate-700 mb-2">סיבת ההרשמה:</p>
                      <p className="text-slate-600">{user.reason}</p>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button
                      onClick={() => {
                        setSelectedUser(user);
                        setAdminNotes("");
                      }}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle2 className="w-4 h-4 ml-2" />
                      אשר
                    </Button>
                    <Button
                      onClick={() => handleReject(user)}
                      variant="destructive"
                      className="flex-1"
                    >
                      <XCircle className="w-4 h-4 ml-2" />
                      דחה
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Dialog לאישור */}
        <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle>אישור משתמש - {selectedUser?.full_name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">
                  הערות (אופציונלי)
                </label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="הערות למשתמש..."
                  rows={3}
                />
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={() => handleApprove(selectedUser)}
                  disabled={processing}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {processing ? "מאשר..." : "אשר והוסף למערכת"}
                </Button>
                <Button
                  onClick={() => setSelectedUser(null)}
                  variant="outline"
                  className="flex-1"
                >
                  ביטול
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}