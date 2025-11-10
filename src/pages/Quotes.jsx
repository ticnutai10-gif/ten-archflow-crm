
import React, { useState, useEffect } from "react";
import { Quote, Client, Project } from "@/entities/all";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText,
  Plus,
  Search,
  MoreVertical,
  Edit,
  Trash2
} from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";

import QuoteForm from "../components/quotes/QuoteForm";
import QuoteCard from "../components/quotes/QuoteCard";
// Removed: import { exportQuotes } from "@/functions/exportQuotes";
// Removed: import { UploadFile } from "@/integrations/Core";

// Placeholder component for QuoteStatus - this should ideally be in its own file
const QuoteStatus = ({ quotes, isLoading }) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
      </div>
    );
  }

  const totalQuotes = quotes.length;
  const sent = quotes.filter(q => q.status === 'נשלחה').length;
  const approved = quotes.filter(q => q.status === 'אושרה').length;
  const pending = quotes.filter(q => q.status === 'בהמתנה').length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
      <Card className="p-4 flex flex-col items-center shadow-sm">
        <CardTitle className="text-2xl font-bold">{totalQuotes}</CardTitle>
        <p className="text-sm text-slate-500">סה"כ הצעות</p>
      </Card>
      <Card className="p-4 flex flex-col items-center shadow-sm">
        <CardTitle className="text-2xl font-bold text-blue-600">{sent}</CardTitle>
        <p className="text-sm text-slate-500">נשלחו</p>
      </Card>
      <Card className="p-4 flex flex-col items-center shadow-sm">
        <CardTitle className="text-2xl font-bold text-green-600">{approved}</CardTitle>
        <p className="text-sm text-slate-500">אושרו</p>
      </Card>
      <Card className="p-4 flex flex-col items-center shadow-sm">
        <CardTitle className="text-2xl font-bold text-yellow-600">{pending}</CardTitle>
        <p className="text-sm text-slate-500">בהמתנה</p>
      </Card>
    </div>
  );
};


export default function QuotesPage() {
  const [quotes, setQuotes] = useState([]);
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingQuote, setEditingQuote] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    loadPageData();
  }, []);

  const loadPageData = async () => {
    setIsLoading(true);
    try {
      const [quotesData, clientsData, projectsData] = await Promise.all([
        Quote.list('-created_date'),
        Client.list(),
        Project.list()
      ]);
      setQuotes(quotesData);
      setClients(clientsData);
      setProjects(projectsData);
    } catch (error) {
      console.error('Error loading data:', error);
    }
    setIsLoading(false);
  };

  const reloadQuotes = async () => {
      const quotesData = await Quote.list('-created_date');
      setQuotes(quotesData);
  }

  const handleSubmit = async (quoteData) => {
    try {
      if (editingQuote) {
        await Quote.update(editingQuote.id, quoteData);
      } else {
        const latestQuote = await Quote.list('-quote_number', 1);
        const newQuoteNumber = latestQuote.length > 0 ? (parseInt(latestQuote[0].quote_number.split('-')[1]) + 1) : 1;
        const year = new Date().getFullYear();
        quoteData.quote_number = `${year}-${newQuoteNumber.toString().padStart(3, '0')}`;
        await Quote.create(quoteData);
      }
      setShowForm(false);
      setEditingQuote(null);
      reloadQuotes();
    } catch (error) {
      console.error('Error saving quote:', error);
    }
  };

  const handleEdit = (quote) => {
    setEditingQuote(quote);
    setShowForm(true);
  };

  const handleDelete = async (quoteId) => {
    if (confirm('האם אתה בטוח שברצונך למחוק את הצעת המחיר?')) {
        await Quote.delete(quoteId);
        reloadQuotes();
    }
  }

  // Removed: handleExport function
  // Removed: createAndSendPDF function

  const filteredQuotes = quotes
    .filter(quote => {
      const matchesSearch = quote.project_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           quote.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           quote.quote_number.includes(searchTerm);
      const matchesStatus = statusFilter === "all" || quote.status === statusFilter;
      return matchesSearch && matchesStatus;
    });


  return (
    <div className="p-6 lg:p-8 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen pl-24 lg:pl-12 overflow-auto" dir="rtl">
      <div className="max-w-7xl mx-auto">
        {/* כותרת העמוד */}
        <div className="flex justify-between items-center mb-8 text-right">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 mb-2">הצעות מחיר</h1>
            <p className="text-slate-600">ניהול וקביעה של הצעות מחיר ללקוחות</p>
          </div>
          <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            הצעת מחיר חדשה
          </Button>
        </div>

        {/* סטטיסטיקות */}
        <div className="mb-8">
          <QuoteStatus quotes={quotes} isLoading={isLoading} />
        </div>

        {/* מסגרת חיפוש עם גלילה */}
        <Card className="mb-6 shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardContent className="p-6 max-h-96 overflow-y-auto" dir="rtl">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  placeholder="חיפוש (פרויקט, לקוח, מספר הצעה)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full lg:w-48">
                  <SelectValue placeholder="סינון לפי סטטוס" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל הסטטוסים</SelectItem>
                  <SelectItem value="נשלחה">נשלחה</SelectItem>
                  <SelectItem value="בהמתנה">בהמתנה</SelectItem>
                  <SelectItem value="אושרה">אושרה</SelectItem>
                  <SelectItem value="נדחתה">נדחתה</SelectItem>
                  <SelectItem value="פגה תוקף">פגה תוקף</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {showForm && (
          <QuoteForm
            quote={editingQuote}
            clients={clients}
            projects={projects}
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false);
              setEditingQuote(null);
            }}
          />
        )}

        {/* תוכן ההצעות עם גלילה */}
        <div className="max-h-[600px] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoading ? (
              Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-56 rounded-xl" />)
            ) : filteredQuotes.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-600">לא נמצאו הצעות מחיר</h3>
              </div>
            ) : (
              filteredQuotes.map((quote) => (
                <QuoteCard
                  key={quote.id}
                  quote={quote}
                  onEdit={() => handleEdit(quote)}
                  onDelete={() => handleDelete(quote.id)}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
