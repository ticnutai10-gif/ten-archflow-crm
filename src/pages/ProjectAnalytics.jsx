import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Brain, Users, BarChart3 } from 'lucide-react';
import AIProjectAnalytics from '../components/ai/AIProjectAnalytics';
import AITeamAnalytics from '../components/ai/AITeamAnalytics';

export default function ProjectAnalyticsPage() {
  return (
    <div className="p-6 min-h-screen" style={{ backgroundColor: 'var(--bg-cream, #FCF6E3)' }} dir="rtl">
      <div className="max-w-7xl mx-auto">
        <Tabs defaultValue="projects" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-white shadow-sm mb-6">
            <TabsTrigger value="projects" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              ניתוח פרויקטים
            </TabsTrigger>
            <TabsTrigger value="team" className="gap-2">
              <Users className="w-4 h-4" />
              ניתוח צוות
            </TabsTrigger>
          </TabsList>

          <TabsContent value="projects">
            <AIProjectAnalytics />
          </TabsContent>

          <TabsContent value="team">
            <AITeamAnalytics />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}