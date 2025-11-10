import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Send } from "lucide-react";

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    email: "",
    full_name: "",
    phone: "",
    company: "",
    reason: ""
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // יצירת בקשת הרשמה
      await base44.entities.PendingUser.create({
        ...formData,
        status: "pending"
      });

      // שליחת מייל למנהל
      await base44.functions.invoke('notifyAdminNewRegistration', {
        user: formData
      });

      setSubmitted(true);
    } catch (error) {
      alert("שגיאה בשליחת הבקשה: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-6" dir="rtl">
        <Card className="max-w-md w-full shadow-xl">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">בקשתך התקבלה!</h2>
              <p className="text-slate-600">
                תודה על הרשמתך למערכת ArchFlow CRM.
                <br />
                המנהל יקבל התראה ויאשר את הבקשה בהקדם.
                <br />
                תקבל הודעה למייל ברגע שהחשבון יאושר.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-6" dir="rtl">
      <Card className="max-w-md w-full shadow-xl">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center mb-4">
            <span className="text-3xl text-white font-bold">A</span>
          </div>
          <CardTitle className="text-3xl font-bold">הרשמה למערכת</CardTitle>
          <p className="text-slate-600 mt-2">ArchFlow CRM - ניהול לקוחות ופרויקטים</p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="full_name">שם מלא *</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="הזן שם מלא"
                required
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="email">אימייל *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="example@company.com"
                required
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="phone">טלפון</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="050-1234567"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="company">חברה/ארגון</Label>
              <Input
                id="company"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                placeholder="שם החברה"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="reason">למה אתה רוצה להצטרף?</Label>
              <Textarea
                id="reason"
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                placeholder="ספר לנו קצת על עצמך..."
                rows={3}
                className="mt-1"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              {loading ? (
                "שולח..."
              ) : (
                <>
                  <Send className="w-4 h-4 ml-2" />
                  שלח בקשת הרשמה
                </>
              )}
            </Button>
          </form>

          <p className="text-xs text-center text-slate-500 mt-4">
            המנהל יאשר את בקשתך ותקבל הודעה למייל
          </p>
        </CardContent>
      </Card>
    </div>
  );
}