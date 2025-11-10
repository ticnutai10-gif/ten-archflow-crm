import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, Clock, Calendar } from "lucide-react";

export default function ReportPreview({ open, onClose, schedule }) {
  const getReportTypeLabel = (type) => {
    const labels = {
      time_logs: '⏱️ רישומי זמן',
      new_clients: '👥 לקוחות חדשים',
      new_tasks: '✅ משימות חדשות',
      new_projects: '🏗️ פרויקטים חדשים',
      meetings: '📅 פגישות',
      invoices: '💰 חשבוניות'
    };
    return labels[type] || type;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>תצוגה מקדימה - {schedule.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* פרטי הדוח */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-bold text-blue-900 mb-3">פרטי הדוח</h3>
            
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <span className="font-medium">שעת שליחה:</span>
                <span>{schedule.schedule_time}</span>
              </div>

              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-blue-600" />
                <span className="font-medium">נמענים:</span>
                <span>{schedule.recipients?.length || 0} אנשי קשר</span>
              </div>

              {schedule.last_sent && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <span className="font-medium">נשלח לאחרונה:</span>
                  <span>{new Date(schedule.last_sent).toLocaleDateString('he-IL')}</span>
                </div>
              )}

              <div className="flex items-start gap-2 mt-3">
                <span className="font-medium">סוגי תוכן:</span>
                <div className="flex flex-wrap gap-2">
                  {schedule.report_types?.map((type) => (
                    <Badge key={type} variant="outline" className="text-xs">
                      {getReportTypeLabel(type)}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* תצוגה מקדימה של המייל */}
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-slate-50 border-b p-4">
              <h3 className="font-bold text-slate-900">תצוגה מקדימה של המייל</h3>
              <p className="text-sm text-slate-600">כך המייל ייראה בתיבת הדואר של הנמענים</p>
            </div>

            <div className="p-6 bg-white">
              {/* Email header */}
              <div className="mb-6 pb-4 border-b">
                <div className="text-sm text-slate-600 mb-1">נושא:</div>
                <div className="font-bold text-lg">
                  {schedule.name} - {new Date().toLocaleDateString('he-IL')}
                </div>
              </div>

              {/* Email body preview */}
              <div style={{ fontFamily: 'Arial, sans-serif', direction: 'rtl' }}>
                <h1 style={{ 
                  color: '#2C3A50', 
                  borderBottom: '3px solid #2C3A50', 
                  paddingBottom: '10px',
                  marginBottom: '20px'
                }}>
                  📊 דוח יומי - {new Date().toLocaleDateString('he-IL', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </h1>

                {schedule.include_summary && (
                  <div style={{ 
                    background: '#e3f2fd', 
                    padding: '15px', 
                    borderRadius: '8px', 
                    marginBottom: '20px' 
                  }}>
                    <h2 style={{ 
                      color: '#2C3A50', 
                      marginBottom: '10px' 
                    }}>
                      📈 סיכום כללי
                    </h2>
                    <div style={{ fontSize: '14px', color: '#555' }}>
                      <p style={{ margin: '5px 0' }}>✓ כאן יופיע סיכום כללי של כל הנתונים</p>
                      <p style={{ margin: '5px 0' }}>✓ למשל: סה"כ שעות עבודה, לקוחות חדשים וכו'</p>
                    </div>
                  </div>
                )}

                {schedule.report_types?.map((type) => (
                  <div key={type} style={{ marginTop: '30px' }}>
                    <h2 style={{ 
                      color: '#2C3A50', 
                      borderRight: '4px solid #2C3A50', 
                      paddingRight: '10px',
                      marginBottom: '15px'
                    }}>
                      {getReportTypeLabel(type)}
                    </h2>
                    <div style={{ 
                      background: '#f5f5f5', 
                      padding: '15px', 
                      borderRadius: '8px',
                      fontSize: '14px',
                      color: '#666'
                    }}>
                      <p>כאן יופיעו הנתונים בפורמט טבלה מעוצבת</p>
                      <p>הדוח יכלול את כל הפעילויות שהתבצעו היום</p>
                    </div>
                  </div>
                ))}

                <div style={{ 
                  marginTop: '30px', 
                  textAlign: 'center', 
                  color: '#999', 
                  fontSize: '12px',
                  borderTop: '1px solid #ddd',
                  paddingTop: '15px'
                }}>
                  <p>דוח זה נוצר אוטומטית על ידי מערכת טננבאום - אדריכלות מתקדמת</p>
                  <p>תאריך יצירה: {new Date().toLocaleString('he-IL')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* נמענים */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <h3 className="font-bold text-slate-900 mb-3">רשימת נמענים</h3>
            <div className="flex flex-wrap gap-2">
              {schedule.recipients?.map((email) => (
                <Badge key={email} variant="outline">
                  <Mail className="w-3 h-3 ml-1" />
                  {email}
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={onClose}>סגור</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}