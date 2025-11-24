import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Languages, Check } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const LANGUAGES = [
  { code: 'he', name: 'עברית', flag: '🇮🇱', dir: 'rtl' },
  { code: 'en', name: 'English', flag: '🇺🇸', dir: 'ltr' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦', dir: 'rtl' }
];

export default function LanguageSelector() {
  const [currentLang, setCurrentLang] = useState('he');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const user = await base44.auth.me();
        const lang = user.language || localStorage.getItem('app-language') || 'he';
        setCurrentLang(lang);
      } catch (e) {
        console.error('Error loading language:', e);
      }
    };
    load();
  }, []);

  const handleChange = async (langCode) => {
    if (loading) return;

    setLoading(true);
    try {
      setCurrentLang(langCode);
      localStorage.setItem('app-language', langCode);
      
      const lang = LANGUAGES.find(l => l.code === langCode);
      document.documentElement.setAttribute('dir', lang.dir);
      document.documentElement.setAttribute('lang', langCode);

      await base44.auth.updateMe({ language: langCode });
      
      toast.success('השפה שונתה בהצלחה!', {
        description: 'העמוד יתרענן כדי להחיל את השינויים'
      });

      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (e) {
      console.error('Error saving language:', e);
      toast.error('שגיאה בשמירת השפה');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card dir="rtl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Languages className="w-5 h-5" />
          שפת ממשק
        </CardTitle>
        <p className="text-sm text-slate-500 mt-1">
          בחר את שפת הממשק המועדפת עליך
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {LANGUAGES.map((lang) => {
            const isActive = currentLang === lang.code;
            
            return (
              <button
                key={lang.code}
                onClick={() => handleChange(lang.code)}
                disabled={loading}
                className={`
                  relative p-6 rounded-xl border-2 transition-all text-center
                  ${isActive 
                    ? 'border-blue-500 ring-2 ring-blue-200 shadow-lg bg-blue-50' 
                    : 'border-slate-200 hover:border-blue-300 bg-white'
                  }
                  ${loading ? 'opacity-50 cursor-wait' : 'cursor-pointer hover:shadow-md'}
                `}
              >
                <div className="text-4xl mb-2">{lang.flag}</div>
                <div className="font-medium text-lg text-slate-900">{lang.name}</div>
                
                {isActive && (
                  <div className="absolute top-2 left-2 bg-blue-500 rounded-full p-1">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* הערה */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-900">
            ⚠️ <strong>שים לב:</strong> כרגע המערכת תומכת רק בעברית. 
            תמיכה בשפות נוספות תתווסף בעתיד.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}