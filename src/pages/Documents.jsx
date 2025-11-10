
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import DocumentUploader from "@/components/documents/DocumentUploader";
import DocumentList from "@/components/documents/DocumentList";

export default function DocumentsPage() {
  return (
    <div className="p-6 lg:p-8 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen pl-24 lg:pl-12 overflow-auto" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* כותרת העמוד */}
        <div className="flex justify-between items-center text-right">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 mb-2">ניהול מסמכים</h1>
            <p className="text-slate-600">ארגון וניהול כל המסמכים והקבצים</p>
          </div>
        </div>

        {/* העלאת מסמכים עם גלילה */}
        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardContent className="p-6 max-h-96 overflow-y-auto">
            <DocumentUploader />
          </CardContent>
        </Card>

        {/* רשימת מסמכים עם גלילה */}
        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardContent className="p-6 max-h-[600px] overflow-y-auto">
            <DocumentList />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
