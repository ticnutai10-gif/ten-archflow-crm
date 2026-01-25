import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Calculator, Download, Mail, Clock, User, 
  Calendar, DollarSign, FileText, Send, Loader2,
  TrendingUp, Users, AlertCircle
} from "lucide-react";
import { format, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { he } from "date-fns/locale";

export default function SalaryReportsPage() {
  const [teamMembers, setTeamMembers] = useState([]);
  const [timeLogs, setTimeLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [sending, setSending] = useState(false);
  
  const [selectedMember, setSelectedMember] = useState("");
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const [includeVat, setIncludeVat] = useState(true);
  
  const [salaryReport, setSalaryReport] = useState(null);
  const [emailRecipients, setEmailRecipients] = useState("");
  const [allMembersReport, setAllMembersReport] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [members, logs] = await Promise.all([
        base44.entities.TeamMember.list(),
        base44.entities.TimeLog.list()
      ]);
      setTeamMembers(members.filter(m => m.active !== false));
      setTimeLogs(logs);
    } catch (error) {
      console.error("Error loading data:", error);
    }
    setLoading(false);
  };

  const calculateSalary = (memberId = null) => {
    setCalculating(true);
    
    try {
      const membersToCalculate = memberId 
        ? teamMembers.filter(m => m.id === memberId)
        : teamMembers;
      
      const reports = membersToCalculate.map(member => {
        const memberLogs = timeLogs.filter(log => {
          const logDate = log.date || log.created_date?.split("T")[0];
          const matchesMember = log.user_email === member.email || 
                               log.created_by === member.email ||
                               log.team_member_id === member.id;
          const matchesDate = logDate >= dateFrom && logDate <= dateTo;
          return matchesMember && matchesDate;
        });

        const totalHours = memberLogs.reduce((sum, log) => {
          return sum + (log.hours || log.duration_hours || 0);
        }, 0);

        const hourlyRate = member.hourly_rate || 0;
        const grossAmount = totalHours * hourlyRate;
        const vatPercentage = includeVat ? (member.vat_percentage || 17) : 0;
        const vatAmount = grossAmount * (vatPercentage / 100);
        const netAmount = grossAmount + vatAmount;

        return {
          member,
          totalHours: Math.round(totalHours * 100) / 100,
          hourlyRate,
          grossAmount: Math.round(grossAmount * 100) / 100,
          vatPercentage,
          vatAmount: Math.round(vatAmount * 100) / 100,
          netAmount: Math.round(netAmount * 100) / 100,
          logsCount: memberLogs.length,
          logs: memberLogs
        };
      });

      if (memberId) {
        setSalaryReport(reports[0]);
      } else {
        setAllMembersReport(reports);
      }
    } catch (error) {
      console.error("Error calculating salary:", error);
    }
    
    setCalculating(false);
  };

  const sendReportByEmail = async () => {
    if (!salaryReport || !emailRecipients.trim()) {
      alert("יש לבחור עובד ולהזין כתובות מייל");
      return;
    }

    setSending(true);
    try {
      const recipients = emailRecipients.split(",").map(e => e.trim()).filter(e => e);
      
      const reportHtml = generateReportHtml(salaryReport);
      
      for (const recipient of recipients) {
        await base44.integrations.Core.SendEmail({
          to: recipient,
          subject: `דוח שעות ושכר - ${salaryReport.member.full_name} - ${format(parseISO(dateFrom), "MM/yyyy")}`,
          body: reportHtml
        });
      }
      
      alert(`הדוח נשלח בהצלחה ל-${recipients.length} נמענים`);
    } catch (error) {
      console.error("Error sending email:", error);
      alert("שגיאה בשליחת המייל: " + error.message);
    }
    setSending(false);
  };

  const generateReportHtml = (report) => {
    return `
      <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0;">דוח שעות ושכר</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">תקופה: ${format(parseISO(dateFrom), "dd/MM/yyyy")} - ${format(parseISO(dateTo), "dd/MM/yyyy")}</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; border: 1px solid #e9ecef;">
          <h2 style="color: #333; margin-top: 0;">${report.member.full_name}</h2>
          <p style="color: #666;">${report.member.email || ""}</p>
          ${report.member.role ? `<p style="color: #666;">תפקיד: ${report.member.role}</p>` : ""}
        </div>
        
        <div style="padding: 20px; border: 1px solid #e9ecef; border-top: none;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>סה"כ שעות:</strong></td>
              <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: left;">${report.totalHours} שעות</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>שכר שעתי:</strong></td>
              <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: left;">₪${report.hourlyRate.toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>סכום ברוטו:</strong></td>
              <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: left;">₪${report.grossAmount.toLocaleString()}</td>
            </tr>
            ${report.vatPercentage > 0 ? `
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>מע"מ (${report.vatPercentage}%):</strong></td>
              <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: left;">₪${report.vatAmount.toLocaleString()}</td>
            </tr>
            ` : ""}
            <tr style="background: #f0f0f0;">
              <td style="padding: 15px;"><strong style="font-size: 1.1em;">סה"כ לתשלום:</strong></td>
              <td style="padding: 15px; text-align: left;"><strong style="font-size: 1.2em; color: #667eea;">₪${report.netAmount.toLocaleString()}</strong></td>
            </tr>
          </table>
        </div>
        
        <div style="background: #f8f9fa; padding: 15px; border: 1px solid #e9ecef; border-top: none; border-radius: 0 0 10px 10px; text-align: center; color: #666; font-size: 12px;">
          דוח זה נוצר אוטומטית על ידי מערכת ניהול הפרויקטים
        </div>
      </div>
    `;
  };

  const exportToCsv = () => {
    const data = allMembersReport.length > 0 ? allMembersReport : (salaryReport ? [salaryReport] : []);
    if (data.length === 0) {
      alert("אין נתונים לייצוא");
      return;
    }

    const headers = ["שם", "אימייל", "שעות", "שכר שעתי", "ברוטו", "מע\"מ %", "סכום מע\"מ", "סה\"כ לתשלום"];
    const rows = data.map(r => [
      r.member.full_name,
      r.member.email || "",
      r.totalHours,
      r.hourlyRate,
      r.grossAmount,
      r.vatPercentage,
      r.vatAmount,
      r.netAmount
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `salary_report_${dateFrom}_${dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalStats = allMembersReport.reduce((acc, r) => ({
    hours: acc.hours + r.totalHours,
    gross: acc.gross + r.grossAmount,
    vat: acc.vat + r.vatAmount,
    net: acc.net + r.netAmount
  }), { hours: 0, gross: 0, vat: 0, net: 0 });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
            <Calculator className="w-8 h-8 text-blue-600" />
            דוחות שכר ושעות
          </h1>
          <p className="text-slate-600 mt-1">חישוב שכר, מע"מ ושליחת דוחות במייל</p>
        </div>
      </div>

      {/* Filters Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            בחירת תקופה ועובד
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>מתאריך</Label>
              <Input 
                type="date" 
                value={dateFrom} 
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div>
              <Label>עד תאריך</Label>
              <Input 
                type="date" 
                value={dateTo} 
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <div>
              <Label>עובד (אופציונלי)</Label>
              <Select value={selectedMember} onValueChange={setSelectedMember}>
                <SelectTrigger>
                  <SelectValue placeholder="כל העובדים" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל העובדים</SelectItem>
                  {teamMembers.map(member => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <div className="flex items-center gap-2">
                <Checkbox 
                  id="vat" 
                  checked={includeVat} 
                  onCheckedChange={setIncludeVat}
                />
                <Label htmlFor="vat">כולל מע"מ</Label>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2 mt-4">
            <Button 
              onClick={() => calculateSalary(selectedMember === "all" ? null : selectedMember)}
              disabled={calculating}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {calculating ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Calculator className="w-4 h-4 ml-2" />}
              חשב שכר
            </Button>
            <Button variant="outline" onClick={exportToCsv}>
              <Download className="w-4 h-4 ml-2" />
              ייצוא CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* All Members Summary */}
      {allMembersReport.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              סיכום כל העובדים
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-sm text-blue-600">סה"כ שעות</div>
                <div className="text-2xl font-bold text-blue-700">{totalStats.hours.toFixed(1)}</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <div className="text-sm text-green-600">סה"כ ברוטו</div>
                <div className="text-2xl font-bold text-green-700">₪{totalStats.gross.toLocaleString()}</div>
              </div>
              <div className="bg-amber-50 rounded-lg p-4">
                <div className="text-sm text-amber-600">סה"כ מע"מ</div>
                <div className="text-2xl font-bold text-amber-700">₪{totalStats.vat.toLocaleString()}</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="text-sm text-purple-600">סה"כ לתשלום</div>
                <div className="text-2xl font-bold text-purple-700">₪{totalStats.net.toLocaleString()}</div>
              </div>
            </div>

            {/* Members Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-right p-3">שם</th>
                    <th className="text-right p-3">שעות</th>
                    <th className="text-right p-3">שכר שעתי</th>
                    <th className="text-right p-3">ברוטו</th>
                    <th className="text-right p-3">מע"מ</th>
                    <th className="text-right p-3">לתשלום</th>
                    <th className="text-right p-3">פעולות</th>
                  </tr>
                </thead>
                <tbody>
                  {allMembersReport.map((report, idx) => (
                    <tr key={idx} className="border-b hover:bg-slate-50">
                      <td className="p-3">
                        <div className="font-medium">{report.member.full_name}</div>
                        <div className="text-sm text-slate-500">{report.member.email}</div>
                      </td>
                      <td className="p-3">
                        <Badge variant="outline">{report.totalHours} שעות</Badge>
                      </td>
                      <td className="p-3">₪{report.hourlyRate}</td>
                      <td className="p-3">₪{report.grossAmount.toLocaleString()}</td>
                      <td className="p-3">₪{report.vatAmount.toLocaleString()}</td>
                      <td className="p-3 font-bold text-green-600">₪{report.netAmount.toLocaleString()}</td>
                      <td className="p-3">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            setSalaryReport(report);
                            setSelectedMember(report.member.id);
                          }}
                        >
                          <FileText className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Individual Report */}
      {salaryReport && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              דוח מפורט - {salaryReport.member.full_name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Employee Info */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">פרטי עובד</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-600">שם:</span>
                    <span className="font-medium">{salaryReport.member.full_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">אימייל:</span>
                    <span>{salaryReport.member.email || "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">תפקיד:</span>
                    <span>{salaryReport.member.role || "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">שכר שעתי:</span>
                    <span>₪{salaryReport.hourlyRate}</span>
                  </div>
                </div>
              </div>

              {/* Salary Calculation */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">חישוב שכר</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-600">סה"כ שעות:</span>
                    <span className="font-medium">{salaryReport.totalHours} שעות</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">רישומי זמן:</span>
                    <span>{salaryReport.logsCount} רישומים</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">סכום ברוטו:</span>
                    <span>₪{salaryReport.grossAmount.toLocaleString()}</span>
                  </div>
                  {salaryReport.vatPercentage > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">מע"מ ({salaryReport.vatPercentage}%):</span>
                      <span>₪{salaryReport.vatAmount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t text-lg">
                    <span className="font-bold">סה"כ לתשלום:</span>
                    <span className="font-bold text-green-600">₪{salaryReport.netAmount.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Send Email Section */}
            <div className="mt-6 pt-6 border-t">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Mail className="w-5 h-5" />
                שליחת דוח במייל
              </h3>
              <div className="flex gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="כתובות מייל (מופרדות בפסיק)"
                    value={emailRecipients}
                    onChange={(e) => setEmailRecipients(e.target.value)}
                  />
                  <p className="text-xs text-slate-500 mt-1">ניתן להזין מספר כתובות מופרדות בפסיק</p>
                </div>
                <Button 
                  onClick={sendReportByEmail}
                  disabled={sending || !emailRecipients.trim()}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Send className="w-4 h-4 ml-2" />}
                  שלח דוח
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Data Warning */}
      {teamMembers.length === 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 text-amber-800">
              <AlertCircle className="w-6 h-6" />
              <div>
                <h3 className="font-semibold">אין חברי צוות במערכת</h3>
                <p className="text-sm">יש להוסיף חברי צוות עם שכר שעתי כדי לחשב דוחות שכר</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}