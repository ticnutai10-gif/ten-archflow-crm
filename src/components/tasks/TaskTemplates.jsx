import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Zap, FileText, Phone, Calendar, Hammer, Eye, X } from "lucide-react";

const templates = [
  {
    id: 'client-meeting',
    title: 'פגישה עם לקוח',
    description: 'פגישת היכרות ראשונית עם לקוח חדש',
    category: 'פגישות',
    icon: Phone,
    template: {
      title: 'פגישה עם [שם לקוח]',
      description: 'פגישת היכרות ראשונית - הצגת הפרויקט, דיון בדרישות, תיאום ציפיות',
      priority: 'גבוהה',
      category: 'פגישה'
    }
  },
  {
    id: 'project-planning',
    title: 'תכנון פרויקט',
    description: 'יצירת תכנית עבודה מפורטת לפרויקט',
    category: 'תכנון',
    icon: Calendar,
    template: {
      title: 'תכנון פרויקט [שם פרויקט]',
      description: 'יצירת לוח זמנים, הגדרת אבני דרך, תיאום עם גורמים רלוונטיים',
      priority: 'בינונית',
      category: 'תכנון'
    }
  },
  {
    id: 'permit-submission',
    title: 'הגשת בקשת היתר',
    description: 'הכנה והגשת מסמכים לרשויות',
    category: 'היתרים',
    icon: FileText,
    template: {
      title: 'הגשת בקשת היתר - [פרויקט]',
      description: 'הכנת תיק היתרים, בדיקת מסמכים, הגשה לרשויות המקומיות',
      priority: 'גבוהה',
      category: 'היתרים'
    }
  },
  {
    id: 'site-visit',
    title: 'ביקור באתר',
    description: 'סיור ובדיקת התקדמות באתר הבנייה',
    category: 'מעקב',
    icon: Eye,
    template: {
      title: 'ביקור באתר - [פרויקט]',
      description: 'ביקור לבדיקת התקדמות, תיעוד ליקויים, תיאום עם קבלן',
      priority: 'בינונית',
      category: 'מעקב'
    }
  },
  {
    id: 'material-selection',
    title: 'בחירת חומרים',
    description: 'בחירה ואישור חומרי גמר עם הלקוח',
    category: 'קניות',
    icon: Hammer,
    template: {
      title: 'בחירת חומרי גמר - [פרויקט]',
      description: 'פגישה עם לקוח לבחירת חומרים, השוואת מחירים, הזמנת דוגמאות',
      priority: 'בינונית',
      category: 'קניות'
    }
  }
];

export default function TaskTemplates({ clients = [], projects = [], onSelectTemplate, onCancel }) {
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedProject, setSelectedProject] = useState('');

  // טיפול ב-ESC key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onCancel?.();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onCancel]);

  const handleTemplateSelect = (template) => {
    if (!onSelectTemplate) return;
    
    const taskData = {
      ...template.template,
      client_name: selectedClient,
      project_name: selectedProject,
      title: template.template.title
        .replace('[שם לקוח]', selectedClient || '[שם לקוח]')
        .replace('[שם פרויקט]', selectedProject || '[שם פרויקט]')
        .replace('[פרויקט]', selectedProject || '[פרויקט]'),
      description: template.template.description
    };
    onSelectTemplate(taskData);
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onCancel?.()}>
      <DialogContent className="sm:max-w-4xl text-right max-h-[90vh] overflow-hidden flex flex-col" dir="rtl">
        {/* כפתור סגירה */}
        <button
          onClick={onCancel}
          className="absolute left-4 top-4 rounded-sm opacity-70 ring-offset-white transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-slate-100 z-50"
        >
          <X className="h-5 w-5 text-slate-500 hover:text-slate-700" />
          <span className="sr-only">סגור</span>
        </button>

        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            תבניות משימות מהירות
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 flex-1 overflow-y-auto pl-2">
          {/* Client and Project Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">בחר לקוח (אופציונלי)</label>
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger>
                  <SelectValue placeholder="בחר לקוח" />
                </SelectTrigger>
                <SelectContent>
                  {clients && clients.length > 0 ? (
                    clients.map(client => (
                      <SelectItem key={client.id} value={client.name}>{client.name}</SelectItem>
                    ))
                  ) : (
                    <SelectItem value={null} disabled>אין לקוחות זמינים</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">בחר פרויקט (אופציונלי)</label>
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger>
                  <SelectValue placeholder="בחר פרויקט" />
                </SelectTrigger>
                <SelectContent>
                  {projects && projects.length > 0 ? (
                    projects.map(project => (
                      <SelectItem key={project.id} value={project.name}>{project.name}</SelectItem>
                    ))
                  ) : (
                    <SelectItem value={null} disabled>אין פרויקטים זמינים</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Templates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map(template => (
              <Card 
                key={template.id} 
                className="hover:shadow-lg transition-all duration-200 cursor-pointer group hover:border-blue-300" 
                onClick={() => handleTemplateSelect(template)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-100 group-hover:bg-blue-200 transition-colors">
                      <template.icon className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-base font-semibold">{template.title}</CardTitle>
                      <p className="text-sm text-slate-500">{template.category}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600">{template.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t flex-shrink-0">
          <Button variant="outline" onClick={onCancel}>
            סגור
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}