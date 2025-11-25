import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Palette, Check, Plus, Edit2, Trash2, Save, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const DEFAULT_THEMES = [
  { 
    id: 'cream', 
    name: 'קרם מסורתי', 
    bg: '#FCF6E3',
    text: '#1e293b',
    preview: '🏛️',
    isDefault: true
  },
  { 
    id: 'dark', 
    name: 'כהה', 
    bg: '#1a1a2e',
    text: '#ffffff',
    preview: '🌙',
    isDefault: true
  },
  { 
    id: 'light', 
    name: 'בהיר', 
    bg: '#f8f9fa',
    text: '#1e293b',
    preview: '☀️',
    isDefault: true
  },
  { 
    id: 'ocean', 
    name: 'אוקיינוס', 
    bg: '#e0f2f7',
    text: '#1e293b',
    preview: '🌊',
    isDefault: true
  },
  { 
    id: 'sunset', 
    name: 'שקיעה', 
    bg: '#fff5f0',
    text: '#1e293b',
    preview: '🌅',
    isDefault: true
  },
  { 
    id: 'forest', 
    name: 'יער', 
    bg: '#e8f5e9',
    text: '#1e293b',
    preview: '🌲',
    isDefault: true
  },
  { 
    id: 'midnight', 
    name: 'מידנייט רויאל', 
    bg: '#0f0b1f',
    text: '#e0e7ff',
    preview: '👑',
    isDefault: true
  },
  { 
    id: 'gold', 
    name: 'זהב יוקרתי', 
    bg: '#fff8e7',
    text: '#7c5d20',
    preview: '✨',
    isDefault: true
  },
  { 
    id: 'rosegold', 
    name: 'רוז גולד', 
    bg: '#fff5f7',
    text: '#5c3642',
    preview: '💎',
    isDefault: true
  },
  { 
    id: 'emerald', 
    name: 'אמרלד פרימיום', 
    bg: '#ecfdf5',
    text: '#064e3b',
    preview: '💚',
    isDefault: true
  },
  { 
    id: 'sapphire', 
    name: 'ספיר אלגנטי', 
    bg: '#eff6ff',
    text: '#1e3a8a',
    preview: '💙',
    isDefault: true
  },
  { 
    id: 'platinum', 
    name: 'פלטינה', 
    bg: '#f5f5f7',
    text: '#1d1d1f',
    preview: '⚪',
    isDefault: true
  },
  { 
    id: 'burgundy', 
    name: 'בורדו מלכותי', 
    bg: '#fef2f2',
    text: '#7c2d12',
    preview: '🍷',
    isDefault: true
  },
  { 
    id: 'navy', 
    name: 'נייבי פרימיום', 
    bg: '#f0f4f8',
    text: '#172554',
    preview: '⚓',
    isDefault: true
  },
  { 
    id: 'lavender', 
    name: 'לבנדר יוקרתי', 
    bg: '#faf5ff',
    text: '#581c87',
    preview: '🪻',
    isDefault: true
  },
  { 
    id: 'pearl', 
    name: 'פנינה', 
    bg: '#fefefe',
    text: '#334155',
    preview: '🤍',
    isDefault: true
  },
  { 
    id: 'bronze', 
    name: 'ברונזה אנטיקה', 
    bg: '#fef7ee',
    text: '#78350f',
    preview: '🥉',
    isDefault: true
  },
  { 
    id: 'arctic', 
    name: 'ארקטי קר', 
    bg: '#f0f9ff',
    text: '#0c4a6e',
    preview: '❄️',
    isDefault: true
  }
];

export default function ThemeManager() {
  const [currentTheme, setCurrentTheme] = useState('cream');
  const [loading, setLoading] = useState(false);
  const [customThemes, setCustomThemes] = useState([]);
  const [allThemes, setAllThemes] = useState(DEFAULT_THEMES);
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingTheme, setEditingTheme] = useState(null);
  
  // Form state
  const [themeForm, setThemeForm] = useState({
    name: '',
    bg: '#FCF6E3',
    text: '#1e293b',
    preview: '🎨'
  });

  // טעינת ערכות מותאמות אישית
  useEffect(() => {
    try {
      const saved = localStorage.getItem('custom-themes');
      if (saved) {
        const parsed = JSON.parse(saved);
        setCustomThemes(parsed);
        setAllThemes([...DEFAULT_THEMES, ...parsed]);
      }
    } catch (e) {
      console.error('Error loading custom themes:', e);
    }
  }, []);

  // טעינת נושא נוכחי
  useEffect(() => {
    const load = async () => {
      try {
        const user = await base44.auth.me();
        const theme = user.theme || localStorage.getItem('app-theme') || 'cream';
        setCurrentTheme(theme);
        applyTheme(theme);
      } catch (e) {
        console.error('Error loading theme:', e);
      }
    };
    load();
  }, []);

  const applyTheme = (themeId) => {
    const theme = allThemes.find(t => t.id === themeId);
    if (!theme) return;

    document.documentElement.style.setProperty('--bg-cream', theme.bg);
    document.body.style.backgroundColor = theme.bg;
    document.body.style.color = theme.text;
    localStorage.setItem('app-theme', themeId);
  };

  const handleChange = async (themeId) => {
    if (loading) return;

    setLoading(true);

    try {
      applyTheme(themeId);
      setCurrentTheme(themeId);
      await base44.auth.updateMe({ theme: themeId });
      toast.success('✅ הנושא שונה בהצלחה!');
    } catch (e) {
      console.error('Error saving theme:', e);
      toast.error('שגיאה בשמירת הנושא');
    } finally {
      setLoading(false);
    }
  };

  const saveCustomThemes = (themes) => {
    try {
      localStorage.setItem('custom-themes', JSON.stringify(themes));
      setCustomThemes(themes);
      setAllThemes([...DEFAULT_THEMES, ...themes]);
    } catch (e) {
      console.error('Error saving custom themes:', e);
      toast.error('שגיאה בשמירת הערכה המותאמת');
    }
  };

  const handleCreateTheme = () => {
    if (!themeForm.name.trim()) {
      toast.error('נא להזין שם לערכת הנושא');
      return;
    }

    const newTheme = {
      id: `custom-${Date.now()}`,
      name: themeForm.name.trim(),
      bg: themeForm.bg,
      text: themeForm.text,
      preview: themeForm.preview || '🎨',
      isDefault: false
    };

    const updated = [...customThemes, newTheme];
    saveCustomThemes(updated);

    setCreateDialogOpen(false);
    setThemeForm({
      name: '',
      bg: '#FCF6E3',
      text: '#1e293b',
      preview: '🎨'
    });

    toast.success('✅ ערכת נושא חדשה נוצרה!');
  };

  const handleEditTheme = () => {
    if (!themeForm.name.trim()) {
      toast.error('נא להזין שם לערכת הנושא');
      return;
    }

    const updated = customThemes.map(t => 
      t.id === editingTheme.id 
        ? { ...t, name: themeForm.name.trim(), bg: themeForm.bg, text: themeForm.text, preview: themeForm.preview }
        : t
    );

    saveCustomThemes(updated);

    // אם הנושא הנוכחי הוא זה שנערך, נחיל אותו מחדש
    if (currentTheme === editingTheme.id) {
      applyTheme(editingTheme.id);
    }

    setEditDialogOpen(false);
    setEditingTheme(null);
    setThemeForm({
      name: '',
      bg: '#FCF6E3',
      text: '#1e293b',
      preview: '🎨'
    });

    toast.success('✅ ערכת הנושא עודכנה!');
  };

  const handleDeleteTheme = (themeId) => {
    if (!confirm('❓ האם למחוק ערכת נושא זו?')) return;

    const updated = customThemes.filter(t => t.id !== themeId);
    saveCustomThemes(updated);

    // אם הנושא הנוכחי נמחק, עבור לקרם
    if (currentTheme === themeId) {
      handleChange('cream');
    }

    toast.success('🗑️ ערכת הנושא נמחקה');
  };

  const openEditDialog = (theme) => {
    setEditingTheme(theme);
    setThemeForm({
      name: theme.name,
      bg: theme.bg,
      text: theme.text,
      preview: theme.preview || '🎨'
    });
    setEditDialogOpen(true);
  };

  return (
    <>
      <Card dir="rtl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5" />
                ערכות נושא
              </CardTitle>
              <p className="text-sm text-slate-500 mt-1">
                בחר נושא או צור ערכה מותאמת אישית
              </p>
            </div>
            <Button
              onClick={() => setCreateDialogOpen(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 ml-1" />
              ערכה חדשה
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* ערכות ברירת מחדל */}
          <div>
            <h3 className="font-semibold text-slate-900 mb-3 text-right">ערכות ברירת מחדל</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {DEFAULT_THEMES.map((theme) => {
                const isActive = currentTheme === theme.id;
                
                return (
                  <button
                    key={theme.id}
                    onClick={() => handleChange(theme.id)}
                    disabled={loading}
                    className={`
                      relative p-6 rounded-xl border-2 transition-all text-right
                      ${isActive 
                        ? 'border-blue-500 ring-2 ring-blue-200 shadow-lg' 
                        : 'border-slate-200 hover:border-blue-300'
                      }
                      ${loading ? 'opacity-50 cursor-wait' : 'cursor-pointer hover:shadow-md'}
                    `}
                  >
                    <div 
                      className="h-20 w-full rounded-lg mb-3 border-2"
                      style={{ 
                        backgroundColor: theme.bg,
                        borderColor: theme.text 
                      }}
                    />
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-2xl">{theme.preview}</span>
                      <span className="font-medium text-sm">{theme.name}</span>
                    </div>
                    {isActive && (
                      <div className="absolute top-2 left-2 bg-blue-500 rounded-full p-1">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ערכות מותאמות אישית */}
          {customThemes.length > 0 && (
            <div>
              <h3 className="font-semibold text-slate-900 mb-3 text-right">הערכות שלי</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {customThemes.map((theme) => {
                  const isActive = currentTheme === theme.id;
                  
                  return (
                    <div
                      key={theme.id}
                      className={`
                        relative p-6 rounded-xl border-2 transition-all
                        ${isActive 
                          ? 'border-blue-500 ring-2 ring-blue-200 shadow-lg' 
                          : 'border-slate-200 hover:border-blue-300'
                        }
                      `}
                    >
                      <button
                        onClick={() => handleChange(theme.id)}
                        disabled={loading}
                        className={`w-full text-right ${loading ? 'cursor-wait' : 'cursor-pointer'}`}
                      >
                        <div 
                          className="h-20 w-full rounded-lg mb-3 border-2"
                          style={{ 
                            backgroundColor: theme.bg,
                            borderColor: theme.text 
                          }}
                        />
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-2xl">{theme.preview}</span>
                          <span className="font-medium text-sm">{theme.name}</span>
                        </div>
                      </button>

                      {/* כפתורי עריכה ומחיקה */}
                      <div className="absolute top-2 right-2 flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 bg-white/80 hover:bg-white"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditDialog(theme);
                          }}
                          title="ערוך"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 bg-white/80 hover:bg-white"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTheme(theme.id);
                          }}
                          title="מחק"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-600" />
                        </Button>
                      </div>

                      {isActive && (
                        <div className="absolute top-2 left-2 bg-blue-500 rounded-full p-1">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* הסבר */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900 text-right">
              💡 <strong>טיפ:</strong> ערכות מותאמות אישית נשמרות במכשיר שלך בלבד. 
              לחץ על "ערכה חדשה" כדי ליצור ערכת נושא עם הצבעים שלך!
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right flex items-center gap-2">
              <Plus className="w-5 h-5 text-blue-600" />
              ערכת נושא חדשה
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-right block">שם הערכה *</Label>
              <Input
                id="name"
                value={themeForm.name}
                onChange={(e) => setThemeForm({ ...themeForm, name: e.target.value })}
                placeholder="לדוגמה: הנושא שלי"
                className="text-right"
                dir="rtl"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bg" className="text-right block">צבע רקע</Label>
                <div className="flex gap-2">
                  <Input
                    id="bg"
                    type="color"
                    value={themeForm.bg}
                    onChange={(e) => setThemeForm({ ...themeForm, bg: e.target.value })}
                    className="w-16 h-10 cursor-pointer"
                  />
                  <Input
                    value={themeForm.bg}
                    onChange={(e) => setThemeForm({ ...themeForm, bg: e.target.value })}
                    placeholder="#FCF6E3"
                    className="flex-1 text-left"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="text" className="text-right block">צבע טקסט</Label>
                <div className="flex gap-2">
                  <Input
                    id="text"
                    type="color"
                    value={themeForm.text}
                    onChange={(e) => setThemeForm({ ...themeForm, text: e.target.value })}
                    className="w-16 h-10 cursor-pointer"
                  />
                  <Input
                    value={themeForm.text}
                    onChange={(e) => setThemeForm({ ...themeForm, text: e.target.value })}
                    placeholder="#1e293b"
                    className="flex-1 text-left"
                    dir="ltr"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="preview" className="text-right block">אמוג'י (אופציונלי)</Label>
              <Input
                id="preview"
                value={themeForm.preview}
                onChange={(e) => setThemeForm({ ...themeForm, preview: e.target.value })}
                placeholder="🎨"
                className="text-center text-2xl"
                maxLength={2}
              />
            </div>

            {/* תצוגה מקדימה */}
            <div className="space-y-2">
              <Label className="text-right block">תצוגה מקדימה</Label>
              <div 
                className="h-32 rounded-lg border-2 flex items-center justify-center"
                style={{ 
                  backgroundColor: themeForm.bg,
                  color: themeForm.text,
                  borderColor: themeForm.text
                }}
              >
                <div className="text-center">
                  <div className="text-4xl mb-2">{themeForm.preview}</div>
                  <div className="font-bold">{themeForm.name || 'ערכת נושא'}</div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter dir="rtl">
            <div className="flex gap-2 justify-start w-full">
              <Button onClick={handleCreateTheme} className="bg-blue-600 hover:bg-blue-700">
                <Save className="w-4 h-4 ml-1" />
                צור ערכה
              </Button>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                <X className="w-4 h-4 ml-1" />
                ביטול
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-blue-600" />
              עריכת ערכת נושא
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name" className="text-right block">שם הערכה *</Label>
              <Input
                id="edit-name"
                value={themeForm.name}
                onChange={(e) => setThemeForm({ ...themeForm, name: e.target.value })}
                placeholder="לדוגמה: הנושא שלי"
                className="text-right"
                dir="rtl"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-bg" className="text-right block">צבע רקע</Label>
                <div className="flex gap-2">
                  <Input
                    id="edit-bg"
                    type="color"
                    value={themeForm.bg}
                    onChange={(e) => setThemeForm({ ...themeForm, bg: e.target.value })}
                    className="w-16 h-10 cursor-pointer"
                  />
                  <Input
                    value={themeForm.bg}
                    onChange={(e) => setThemeForm({ ...themeForm, bg: e.target.value })}
                    placeholder="#FCF6E3"
                    className="flex-1 text-left"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-text" className="text-right block">צבע טקסט</Label>
                <div className="flex gap-2">
                  <Input
                    id="edit-text"
                    type="color"
                    value={themeForm.text}
                    onChange={(e) => setThemeForm({ ...themeForm, text: e.target.value })}
                    className="w-16 h-10 cursor-pointer"
                  />
                  <Input
                    value={themeForm.text}
                    onChange={(e) => setThemeForm({ ...themeForm, text: e.target.value })}
                    placeholder="#1e293b"
                    className="flex-1 text-left"
                    dir="ltr"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-preview" className="text-right block">אמוג'י (אופציונלי)</Label>
              <Input
                id="edit-preview"
                value={themeForm.preview}
                onChange={(e) => setThemeForm({ ...themeForm, preview: e.target.value })}
                placeholder="🎨"
                className="text-center text-2xl"
                maxLength={2}
              />
            </div>

            {/* תצוגה מקדימה */}
            <div className="space-y-2">
              <Label className="text-right block">תצוגה מקדימה</Label>
              <div 
                className="h-32 rounded-lg border-2 flex items-center justify-center"
                style={{ 
                  backgroundColor: themeForm.bg,
                  color: themeForm.text,
                  borderColor: themeForm.text
                }}
              >
                <div className="text-center">
                  <div className="text-4xl mb-2">{themeForm.preview}</div>
                  <div className="font-bold">{themeForm.name || 'ערכת נושא'}</div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter dir="rtl">
            <div className="flex gap-2 justify-start w-full">
              <Button onClick={handleEditTheme} className="bg-blue-600 hover:bg-blue-700">
                <Save className="w-4 h-4 ml-1" />
                שמור שינויים
              </Button>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                <X className="w-4 h-4 ml-1" />
                ביטול
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}