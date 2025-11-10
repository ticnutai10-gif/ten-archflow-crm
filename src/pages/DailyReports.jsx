import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Plus, 
  Play, 
  Pause, 
  Trash2, 
  Clock,
  Mail,
  Calendar,
  Settings,
  CheckCircle2,
  XCircle,
  Send,
  Eye
} from "lucide-react";
import { toast } from "sonner";
import ReportScheduleForm from "@/components/reports/ReportScheduleForm";
import ReportPreview from "@/components/reports/ReportPreview";

export default function DailyReportsPage() {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewSchedule, setPreviewSchedule] = useState(null);
  const [sendingTest, setSendingTest] = useState(false);

  useEffect(() => {
    loadSchedules();
  }, []);

  const loadSchedules = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.DailyReportSchedule.list('-created_date');
      setSchedules(data || []);
    } catch (error) {
      console.error('Error loading schedules:', error);
      toast.error('שגיאה בטעינת הדוחות');
    }
    setLoading(false);
  };

  const handleCreate = () => {
    setEditingSchedule(null);
    setShowForm(true);
  };

  const handleEdit = (schedule) => {
    setEditingSchedule(schedule);
    setShowForm(true);
  };

  const handleFormSubmit = async (data) => {
    try {
      if (editingSchedule) {
        await base44.entities.DailyReportSchedule.update(editingSchedule.id, data);
        toast.success('הדוח עודכן בהצלחה!');
      } else {
        await base44.entities.DailyReportSchedule.create(data);
        toast.success('הדוח נוצר בהצלחה!');
      }
      setShowForm(false);
      setEditingSchedule(null);
      await loadSchedules();
    } catch (error) {
      console.error('Error saving schedule:', error);
      toast.error('שגיאה בשמירת הדוח');
    }
  };

  const handleToggleActive = async (schedule) => {
    try {
      await base44.entities.DailyReportSchedule.update(schedule.id, {
        active: !schedule.active
      });
      toast.success(schedule.active ? 'הדוח הושבת' : 'הדוח הופעל');
      await loadSchedules();
    } catch (error) {
      console.error('Error toggling schedule:', error);
      toast.error('שגיאה בעדכון סטטוס');
    }
  };

  const handleDelete = async (schedule) => {
    if (!confirm(`למחוק את הדוח "${schedule.name}"?`)) return;
    
    try {
      await base44.entities.DailyReportSchedule.delete(schedule.id);
      toast.success('הדוח נמחק בהצלחה');
      await loadSchedules();
    } catch (error) {
      console.error('Error deleting schedule:', error);
      toast.error('שגיאה במחיקת הדוח');
    }
  };

  const handleSendTestReport = async (schedule) => {
    if (!confirm(`לשלוח דוח בדיקה עכשיו ל-${schedule.recipients.length} נמענים?`)) return;
    
    setSendingTest(true);
    try {
      const result = await base44.functions.invoke('generateDailyReport');
      
      if (result.data?.sent > 0) {
        toast.success(`נשלחו ${result.data.sent} דוחות בהצלחה!`);
      } else {
        toast.info('לא נשלחו דוחות (ייתכן שכבר נשלחו היום או שלא הגיעה השעה)');
      }
    } catch (error) {
      console.error('Error sending test report:', error);
      toast.error('שגיאה בשליחת דוח הבדיקה');
    }
    setSendingTest(false);
  };

  const handlePreview = (schedule) => {
    setPreviewSchedule(schedule);
    setShowPreview(true);
  };

  const getReportTypeLabel = (type) => {
    const labels = {
      time_logs: 'רישומי זמן',
      new_clients: 'לקוחות חדשים',
      new_tasks: 'משימות חדשות',
      new_projects: 'פרויקטים חדשים',
      meetings: 'פגישות',
      invoices: 'חשבוניות'
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" dir="rtl">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">טוען דוחות...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-xl">
              <FileText className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">דוחות יומיים במייל</h1>
              <p className="text-slate-600">ניהול ותזמון דוחות אוטומטיים</p>
            </div>
          </div>
          
          <Button 
            onClick={handleCreate}
            className="bg-blue-600 hover:bg-blue-700 gap-2"
          >
            <Plus className="w-5 h-5" />
            דוח חדש
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">סה"כ דוחות</p>
                  <p className="text-3xl font-bold text-slate-900">{schedules.length}</p>
                </div>
                <FileText className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">פעילים</p>
                  <p className="text-3xl font-bold text-green-600">
                    {schedules.filter(s => s.active).length}
                  </p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">מושבתים</p>
                  <p className="text-3xl font-bold text-slate-400">
                    {schedules.filter(s => !s.active).length}
                  </p>
                </div>
                <XCircle className="w-8 h-8 text-slate-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">נמענים</p>
                  <p className="text-3xl font-bold text-blue-600">
                    {schedules.reduce((sum, s) => sum + (s.recipients?.length || 0), 0)}
                  </p>
                </div>
                <Mail className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Schedules List */}
        {schedules.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-600 mb-2">
                אין דוחות יומיים מוגדרים
              </h3>
              <p className="text-slate-500 mb-6">
                צור דוח יומי ראשון כדי להתחיל לקבל עדכונים אוטומטיים במייל
              </p>
              <Button onClick={handleCreate} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-5 h-5 ml-2" />
                צור דוח ראשון
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {schedules.map((schedule) => (
              <Card key={schedule.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-xl font-bold text-slate-900">
                          {schedule.name}
                        </h3>
                        {schedule.active ? (
                          <Badge className="bg-green-100 text-green-700">
                            <CheckCircle2 className="w-3 h-3 ml-1" />
                            פעיל
                          </Badge>
                        ) : (
                          <Badge className="bg-slate-100 text-slate-700">
                            <XCircle className="w-3 h-3 ml-1" />
                            מושבת
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Clock className="w-4 h-4" />
                          <span>שעת שליחה: {schedule.schedule_time}</span>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Mail className="w-4 h-4" />
                          <span>{schedule.recipients?.length || 0} נמענים</span>
                        </div>

                        {schedule.last_sent && (
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Calendar className="w-4 h-4" />
                            <span>
                              נשלח לאחרונה: {new Date(schedule.last_sent).toLocaleDateString('he-IL')}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2 mb-4">
                        {schedule.report_types?.map((type) => (
                          <Badge key={type} variant="outline" className="text-xs">
                            {getReportTypeLabel(type)}
                          </Badge>
                        ))}
                      </div>

                      <div className="flex flex-wrap gap-1 text-xs text-slate-500">
                        {schedule.recipients?.map((email, idx) => (
                          <span key={idx} className="bg-slate-100 px-2 py-1 rounded">
                            {email}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePreview(schedule)}
                        className="gap-1"
                      >
                        <Eye className="w-4 h-4" />
                        תצוגה מקדימה
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSendTestReport(schedule)}
                        disabled={sendingTest || !schedule.active}
                        className="gap-1"
                      >
                        <Send className="w-4 h-4" />
                        שלח עכשיו
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(schedule)}
                        className="gap-1"
                      >
                        <Settings className="w-4 h-4" />
                        ערוך
                      </Button>

                      <Button
                        variant={schedule.active ? "secondary" : "outline"}
                        size="sm"
                        onClick={() => handleToggleActive(schedule)}
                        className="gap-1"
                      >
                        {schedule.active ? (
                          <>
                            <Pause className="w-4 h-4" />
                            השבת
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4" />
                            הפעל
                          </>
                        )}
                      </Button>

                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(schedule)}
                        className="gap-1"
                      >
                        <Trash2 className="w-4 h-4" />
                        מחק
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Form Dialog */}
        {showForm && (
          <ReportScheduleForm
            open={showForm}
            onClose={() => {
              setShowForm(false);
              setEditingSchedule(null);
            }}
            schedule={editingSchedule}
            onSubmit={handleFormSubmit}
          />
        )}

        {/* Preview Dialog */}
        {showPreview && previewSchedule && (
          <ReportPreview
            open={showPreview}
            onClose={() => {
              setShowPreview(false);
              setPreviewSchedule(null);
            }}
            schedule={previewSchedule}
          />
        )}
      </div>
    </div>
  );
}