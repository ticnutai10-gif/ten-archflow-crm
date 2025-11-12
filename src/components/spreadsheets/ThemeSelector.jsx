import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Palette, Type, Grid } from "lucide-react";
import { toast } from "sonner";

// פלטות צבעים מוגדרות מראש
const COLOR_PALETTES = {
  default: {
    name: "ברירת מחדל",
    headerBg: "#f1f5f9",
    headerText: "#1e293b",
    cellBg: "#ffffff",
    cellAltBg: "#f8fafc",
    cellText: "#334155",
    border: "#e2e8f0",
    hover: "#dbeafe",
    selected: "#faf5ff"
  },
  ocean: {
    name: "אוקיינוס",
    headerBg: "#0891b2",
    headerText: "#ffffff",
    cellBg: "#ecfeff",
    cellAltBg: "#cffafe",
    cellText: "#164e63",
    border: "#67e8f9",
    hover: "#a5f3fc",
    selected: "#e0f2fe"
  },
  forest: {
    name: "יער",
    headerBg: "#16a34a",
    headerText: "#ffffff",
    cellBg: "#f0fdf4",
    cellAltBg: "#dcfce7",
    cellText: "#14532d",
    border: "#86efac",
    hover: "#bbf7d0",
    selected: "#d1fae5"
  },
  sunset: {
    name: "שקיעה",
    headerBg: "#ea580c",
    headerText: "#ffffff",
    cellBg: "#fff7ed",
    cellAltBg: "#ffedd5",
    cellText: "#7c2d12",
    border: "#fdba74",
    hover: "#fed7aa",
    selected: "#ffe4e6"
  },
  purple: {
    name: "סגול",
    headerBg: "#9333ea",
    headerText: "#ffffff",
    cellBg: "#faf5ff",
    cellAltBg: "#f3e8ff",
    cellText: "#581c87",
    border: "#d8b4fe",
    hover: "#e9d5ff",
    selected: "#f3e8ff"
  },
  dark: {
    name: "כהה",
    headerBg: "#1e293b",
    headerText: "#f1f5f9",
    cellBg: "#334155",
    cellAltBg: "#475569",
    cellText: "#f1f5f9",
    border: "#64748b",
    hover: "#475569",
    selected: "#3730a3"
  },
  minimal: {
    name: "מינימליסטי",
    headerBg: "#ffffff",
    headerText: "#000000",
    cellBg: "#ffffff",
    cellAltBg: "#ffffff",
    cellText: "#000000",
    border: "#e5e7eb",
    hover: "#f9fafb",
    selected: "#f3f4f6"
  },
  candy: {
    name: "סוכריות",
    headerBg: "#ec4899",
    headerText: "#ffffff",
    cellBg: "#fdf2f8",
    cellAltBg: "#fce7f3",
    cellText: "#831843",
    border: "#f9a8d4",
    hover: "#fbcfe8",
    selected: "#fce7f3"
  }
};

// סגנונות גבולות
const BORDER_STYLES = {
  thin: { name: "דק", width: "1px", style: "solid" },
  medium: { name: "בינוני", width: "2px", style: "solid" },
  thick: { name: "עבה", width: "3px", style: "solid" },
  dashed: { name: "מקווקו", width: "1px", style: "dashed" },
  dotted: { name: "מנוקד", width: "1px", style: "dotted" },
  double: { name: "כפול", width: "3px", style: "double" },
  none: { name: "ללא", width: "0px", style: "none" }
};

// פונטים
const FONT_OPTIONS = {
  default: { name: "ברירת מחדל", value: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
  arial: { name: "Arial", value: "Arial, sans-serif" },
  heebo: { name: "Heebo", value: "'Heebo', sans-serif" },
  assistant: { name: "Assistant", value: "'Assistant', sans-serif" },
  rubik: { name: "Rubik", value: "'Rubik', sans-serif" },
  opensans: { name: "Open Sans", value: "'Open Sans', sans-serif" },
  roboto: { name: "Roboto", value: "'Roboto', sans-serif" },
  mono: { name: "Monospace", value: "'Courier New', monospace" }
};

export default function ThemeSelector({ open, onClose, currentTheme, onApply }) {
  const [theme, setTheme] = React.useState(currentTheme || {
    palette: "default",
    borderStyle: "thin",
    headerFont: "default",
    cellFont: "default",
    fontSize: "medium",
    density: "comfortable",
    borderRadius: "none",
    shadow: "none",
    cellSpacing: "none",
    hoverEffect: "subtle",
    customColors: null
  });
  
  const [showCustomColors, setShowCustomColors] = React.useState(false);

  React.useEffect(() => {
    if (currentTheme) {
      setTheme(currentTheme);
      // אם יש customColors, הצג את העורך המותאם
      if (currentTheme.customColors) {
        setShowCustomColors(true);
      }
    }
  }, [currentTheme, open]);

  const handleApply = () => {
    console.log('🎨 [THEME SELECTOR] Applying theme:', theme);
    onApply(theme);
    toast.success("✓ עיצוב הטבלה עודכן בהצלחה");
    onClose();
  };

  const handleReset = () => {
    const defaultTheme = {
      palette: "default",
      borderStyle: "thin",
      headerFont: "default",
      cellFont: "default",
      fontSize: "medium",
      density: "comfortable",
      borderRadius: "none",
      shadow: "none",
      cellSpacing: "none",
      hoverEffect: "subtle",
      customColors: null
    };
    setTheme(defaultTheme);
    setShowCustomColors(false);
    toast.success("✓ עיצוב אופס לברירת מחדל");
  };
  
  const handleCreateCustomPalette = () => {
    // אם יש כבר customColors, השתמש בהם. אחרת צור חדשים מהפלטה הנוכחית
    const basePalette = theme.customColors || {
      name: "מותאם אישית",
      headerBg: selectedPalette.headerBg,
      headerText: selectedPalette.headerText,
      cellBg: selectedPalette.cellBg,
      cellAltBg: selectedPalette.cellAltBg,
      cellText: selectedPalette.cellText,
      border: selectedPalette.border,
      hover: selectedPalette.hover,
      selected: selectedPalette.selected
    };
    setTheme({ ...theme, customColors: basePalette, palette: "custom" });
    setShowCustomColors(true);
  };
  
  const updateCustomColor = (key, value) => {
    if (!theme.customColors) return;
    setTheme({
      ...theme,
      customColors: {
        ...theme.customColors,
        [key]: value
      }
    });
  };

  const selectedPalette = theme.customColors || COLOR_PALETTES[theme.palette] || COLOR_PALETTES.default;
  const selectedBorder = BORDER_STYLES[theme.borderStyle] || BORDER_STYLES.thin;
  
  // הגדרות רדיוס פינות
  const borderRadiusOptions = {
    none: { name: "ללא", value: "0px" },
    small: { name: "קטן", value: "4px" },
    medium: { name: "בינוני", value: "8px" },
    large: { name: "גדול", value: "12px" },
    xlarge: { name: "מאוד גדול", value: "16px" }
  };
  
  // הגדרות צללים
  const shadowOptions = {
    none: { name: "ללא", value: "none" },
    subtle: { name: "עדין", value: "0 1px 3px rgba(0,0,0,0.1)" },
    medium: { name: "בינוני", value: "0 4px 6px rgba(0,0,0,0.1)" },
    strong: { name: "חזק", value: "0 10px 15px rgba(0,0,0,0.15)" },
    glow: { name: "זוהר", value: "0 0 10px rgba(147, 51, 234, 0.3)" }
  };
  
  // הגדרות רווחים
  const cellSpacingOptions = {
    none: { name: "ללא", value: "0px" },
    small: { name: "קטן", value: "2px" },
    medium: { name: "בינוני", value: "4px" },
    large: { name: "גדול", value: "8px" }
  };
  
  // הגדרות אפקט Hover
  const hoverEffectOptions = {
    none: { name: "ללא" },
    subtle: { name: "עדין" },
    medium: { name: "בינוני" },
    strong: { name: "חזק" }
  };
  
  const currentRadius = borderRadiusOptions[theme.borderRadius || "none"];
  const currentShadow = shadowOptions[theme.shadow || "none"];
  const currentSpacing = cellSpacingOptions[theme.cellSpacing || "none"];
  const currentHover = hoverEffectOptions[theme.hoverEffect || "subtle"];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Palette className="w-6 h-6 text-purple-600" />
            עיצוב הטבלה
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* פלטת צבעים */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-bold flex items-center gap-2">
                <Palette className="w-5 h-5" />
                פלטת צבעים
              </Label>
              {!showCustomColors && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCreateCustomPalette}
                  className="gap-2 border-dashed border-purple-300 hover:border-purple-500 hover:bg-purple-50"
                >
                  <Palette className="w-4 h-4" />
                  התאמה אישית
                </Button>
              )}
            </div>
            
            {!showCustomColors && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(COLOR_PALETTES).map(([key, palette]) => (
                  <button
                    key={key}
                    onClick={() => {
                      setTheme({ ...theme, palette: key, customColors: null });
                      setShowCustomColors(false);
                    }}
                    className={`relative p-3 rounded-xl border-2 transition-all hover:scale-105 ${
                      theme.palette === key && !theme.customColors ? 'border-purple-500 shadow-lg' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex gap-1 h-6">
                        <div className="flex-1 rounded" style={{ backgroundColor: palette.headerBg }} />
                        <div className="flex-1 rounded" style={{ backgroundColor: palette.cellBg }} />
                        <div className="flex-1 rounded" style={{ backgroundColor: palette.cellAltBg }} />
                      </div>
                      <div className="text-xs font-semibold text-center">{palette.name}</div>
                    </div>
                    {theme.palette === key && !theme.customColors && (
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* עורך צבעים מותאם אישית */}
          {showCustomColors && theme.customColors && (
            <div className="space-y-3 bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-xl border-2 border-purple-200">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-base font-bold flex items-center gap-2">
                  <Palette className="w-5 h-5 text-purple-600" />
                  עריכת צבעים מותאמים
                  <Badge className="bg-purple-600 text-white">פעיל</Badge>
                </Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (confirm('האם לבטל את ההתאמה האישית ולחזור לפלטת צבעים רגילה?')) {
                      setTheme({ ...theme, customColors: null, palette: "default" });
                      setShowCustomColors(false);
                    }
                  }}
                  className="text-xs hover:bg-red-50 hover:text-red-600"
                >
                  ביטול התאמה אישית
                </Button>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">רקע כותרות</label>
                  <input
                    type="color"
                    value={theme.customColors.headerBg}
                    onChange={(e) => updateCustomColor('headerBg', e.target.value)}
                    className="w-full h-10 rounded border-2 border-purple-300 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">טקסט כותרות</label>
                  <input
                    type="color"
                    value={theme.customColors.headerText}
                    onChange={(e) => updateCustomColor('headerText', e.target.value)}
                    className="w-full h-10 rounded border-2 border-purple-300 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">רקע תאים</label>
                  <input
                    type="color"
                    value={theme.customColors.cellBg}
                    onChange={(e) => updateCustomColor('cellBg', e.target.value)}
                    className="w-full h-10 rounded border-2 border-purple-300 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">רקע תאים לסירוגין</label>
                  <input
                    type="color"
                    value={theme.customColors.cellAltBg}
                    onChange={(e) => updateCustomColor('cellAltBg', e.target.value)}
                    className="w-full h-10 rounded border-2 border-purple-300 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">טקסט תאים</label>
                  <input
                    type="color"
                    value={theme.customColors.cellText}
                    onChange={(e) => updateCustomColor('cellText', e.target.value)}
                    className="w-full h-10 rounded border-2 border-purple-300 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">גבולות</label>
                  <input
                    type="color"
                    value={theme.customColors.border}
                    onChange={(e) => updateCustomColor('border', e.target.value)}
                    className="w-full h-10 rounded border-2 border-purple-300 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">Hover</label>
                  <input
                    type="color"
                    value={theme.customColors.hover}
                    onChange={(e) => updateCustomColor('hover', e.target.value)}
                    className="w-full h-10 rounded border-2 border-purple-300 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">בחירה</label>
                  <input
                    type="color"
                    value={theme.customColors.selected}
                    onChange={(e) => updateCustomColor('selected', e.target.value)}
                    className="w-full h-10 rounded border-2 border-purple-300 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* עיגול פינות */}
          <div className="space-y-3">
            <Label className="text-base font-bold flex items-center gap-2">
              <Grid className="w-5 h-5" />
              עיגול פינות
            </Label>
            <div className="grid grid-cols-5 gap-2">
              {Object.entries(borderRadiusOptions).map(([key, option]) => (
                <button
                  key={key}
                  onClick={() => setTheme({ ...theme, borderRadius: key })}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    theme.borderRadius === key ? 'border-purple-500 bg-purple-50' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="text-xs font-semibold mb-2">{option.name}</div>
                  <div 
                    className="h-8 bg-gradient-to-r from-blue-400 to-purple-400"
                    style={{ borderRadius: option.value }}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* צללים */}
          <div className="space-y-3">
            <Label className="text-base font-bold">צללים ואפקטים</Label>
            <div className="grid grid-cols-5 gap-2">
              {Object.entries(shadowOptions).map(([key, option]) => (
                <button
                  key={key}
                  onClick={() => setTheme({ ...theme, shadow: key })}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    theme.shadow === key ? 'border-purple-500 bg-purple-50' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="text-xs font-semibold mb-2">{option.name}</div>
                  <div 
                    className="h-8 bg-white"
                    style={{ boxShadow: option.value }}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* רווחים בין תאים */}
          <div className="space-y-3">
            <Label className="text-base font-bold">רווחים בין תאים</Label>
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(cellSpacingOptions).map(([key, option]) => (
                <button
                  key={key}
                  onClick={() => setTheme({ ...theme, cellSpacing: key })}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    theme.cellSpacing === key ? 'border-purple-500 bg-purple-50' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="text-xs font-semibold mb-2">{option.name}</div>
                  <div className="grid grid-cols-2 gap-0.5" style={{ gap: option.value }}>
                    <div className="h-4 bg-blue-400 rounded-sm" />
                    <div className="h-4 bg-blue-400 rounded-sm" />
                    <div className="h-4 bg-blue-400 rounded-sm" />
                    <div className="h-4 bg-blue-400 rounded-sm" />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* אפקט Hover */}
          <div className="space-y-3">
            <Label className="text-base font-bold">עוצמת אפקט Hover</Label>
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(hoverEffectOptions).map(([key, option]) => (
                <button
                  key={key}
                  onClick={() => setTheme({ ...theme, hoverEffect: key })}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    theme.hoverEffect === key ? 'border-purple-500 bg-purple-50' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="text-xs font-semibold">{option.name}</div>
                </button>
              ))}
            </div>
          </div>

          {/* תצוגה מקדימה */}
          <div className="space-y-3">
            <Label className="text-base font-bold">תצוגה מקדימה</Label>
            <div 
              className="border-2 border-slate-300 overflow-hidden"
              style={{ 
                borderRadius: currentRadius.value,
                boxShadow: currentShadow.value
              }}
            >
              <table className="w-full" dir="rtl" style={{ borderCollapse: theme.cellSpacing === 'none' ? 'collapse' : 'separate', borderSpacing: currentSpacing.value }}>
                <thead>
                  <tr>
                    <th 
                      className="p-3 text-right transition-all duration-200"
                      style={{
                        backgroundColor: selectedPalette.headerBg,
                        color: selectedPalette.headerText,
                        borderWidth: theme.cellSpacing === 'none' ? selectedBorder.width : '0',
                        borderStyle: selectedBorder.style,
                        borderColor: selectedPalette.border,
                        fontFamily: FONT_OPTIONS[theme.headerFont]?.value,
                        fontSize: theme.fontSize === 'small' ? '12px' : theme.fontSize === 'large' ? '16px' : '14px',
                        borderRadius: theme.cellSpacing !== 'none' ? currentRadius.value : '0'
                      }}
                    >
                      כותרת 1
                    </th>
                    <th 
                      className="p-3 text-right transition-all duration-200"
                      style={{
                        backgroundColor: selectedPalette.headerBg,
                        color: selectedPalette.headerText,
                        borderWidth: theme.cellSpacing === 'none' ? selectedBorder.width : '0',
                        borderStyle: selectedBorder.style,
                        borderColor: selectedPalette.border,
                        fontFamily: FONT_OPTIONS[theme.headerFont]?.value,
                        fontSize: theme.fontSize === 'small' ? '12px' : theme.fontSize === 'large' ? '16px' : '14px',
                        borderRadius: theme.cellSpacing !== 'none' ? currentRadius.value : '0'
                      }}
                    >
                      כותרת 2
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="preview-row">
                    <td 
                      className="p-2 transition-all duration-200"
                      style={{
                        backgroundColor: selectedPalette.cellBg,
                        color: selectedPalette.cellText,
                        borderWidth: theme.cellSpacing === 'none' ? selectedBorder.width : '0',
                        borderStyle: selectedBorder.style,
                        borderColor: selectedPalette.border,
                        fontFamily: FONT_OPTIONS[theme.cellFont]?.value,
                        fontSize: theme.fontSize === 'small' ? '11px' : theme.fontSize === 'large' ? '15px' : '13px',
                        padding: theme.density === 'compact' ? '4px 8px' : theme.density === 'spacious' ? '12px 16px' : '8px 12px',
                        borderRadius: theme.cellSpacing !== 'none' ? currentRadius.value : '0'
                      }}
                    >
                      נתון 1
                    </td>
                    <td 
                      className="p-2 transition-all duration-200"
                      style={{
                        backgroundColor: selectedPalette.cellBg,
                        color: selectedPalette.cellText,
                        borderWidth: theme.cellSpacing === 'none' ? selectedBorder.width : '0',
                        borderStyle: selectedBorder.style,
                        borderColor: selectedPalette.border,
                        fontFamily: FONT_OPTIONS[theme.cellFont]?.value,
                        fontSize: theme.fontSize === 'small' ? '11px' : theme.fontSize === 'large' ? '15px' : '13px',
                        padding: theme.density === 'compact' ? '4px 8px' : theme.density === 'spacious' ? '12px 16px' : '8px 12px',
                        borderRadius: theme.cellSpacing !== 'none' ? currentRadius.value : '0'
                      }}
                    >
                      נתון 2
                    </td>
                  </tr>
                  <tr className="preview-row">
                    <td 
                      className="p-2 transition-all duration-200"
                      style={{
                        backgroundColor: selectedPalette.cellAltBg,
                        color: selectedPalette.cellText,
                        borderWidth: theme.cellSpacing === 'none' ? selectedBorder.width : '0',
                        borderStyle: selectedBorder.style,
                        borderColor: selectedPalette.border,
                        fontFamily: FONT_OPTIONS[theme.cellFont]?.value,
                        fontSize: theme.fontSize === 'small' ? '11px' : theme.fontSize === 'large' ? '15px' : '13px',
                        padding: theme.density === 'compact' ? '4px 8px' : theme.density === 'spacious' ? '12px 16px' : '8px 12px',
                        borderRadius: theme.cellSpacing !== 'none' ? currentRadius.value : '0'
                      }}
                    >
                      נתון 3
                    </td>
                    <td 
                      className="p-2 transition-all duration-200"
                      style={{
                        backgroundColor: selectedPalette.cellAltBg,
                        color: selectedPalette.cellText,
                        borderWidth: theme.cellSpacing === 'none' ? selectedBorder.width : '0',
                        borderStyle: selectedBorder.style,
                        borderColor: selectedPalette.border,
                        fontFamily: FONT_OPTIONS[theme.cellFont]?.value,
                        fontSize: theme.fontSize === 'small' ? '11px' : theme.fontSize === 'large' ? '15px' : '13px',
                        padding: theme.density === 'compact' ? '4px 8px' : theme.density === 'spacious' ? '12px 16px' : '8px 12px',
                        borderRadius: theme.cellSpacing !== 'none' ? currentRadius.value : '0'
                      }}
                    >
                      נתון 4
                    </td>
                  </tr>
                </tbody>
              </table>
              
              <style>{`
                .preview-row:hover td {
                  background-color: ${selectedPalette.hover} !important;
                  transform: ${theme.hoverEffect === 'strong' ? 'scale(1.02)' : theme.hoverEffect === 'medium' ? 'translateY(-1px)' : theme.hoverEffect === 'subtle' ? 'none' : 'none'};
                  box-shadow: ${theme.hoverEffect === 'strong' ? '0 4px 6px rgba(0,0,0,0.1)' : theme.hoverEffect === 'medium' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'};
                }
              `}</style>
            </div>
          </div>

          {/* סגנון גבולות */}
          <div className="space-y-3">
            <Label className="text-base font-bold flex items-center gap-2">
              <Grid className="w-5 h-5" />
              סגנון גבולות
            </Label>
            <div className="grid grid-cols-3 md:grid-cols-7 gap-2">
              {Object.entries(BORDER_STYLES).map(([key, style]) => (
                <button
                  key={key}
                  onClick={() => setTheme({ ...theme, borderStyle: key })}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    theme.borderStyle === key ? 'border-purple-500 bg-purple-50' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="text-xs font-semibold mb-2">{style.name}</div>
                  <div 
                    className="h-6 bg-slate-200 rounded"
                    style={{
                      borderWidth: style.width,
                      borderStyle: style.style,
                      borderColor: '#64748b'
                    }}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* פונטים */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-bold flex items-center gap-2">
                <Type className="w-4 h-4" />
                פונט כותרות
              </Label>
              <Select value={theme.headerFont} onValueChange={(value) => setTheme({ ...theme, headerFont: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(FONT_OPTIONS).map(([key, font]) => (
                    <SelectItem key={key} value={key} style={{ fontFamily: font.value }}>
                      {font.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-bold flex items-center gap-2">
                <Type className="w-4 h-4" />
                פונט תאים
              </Label>
              <Select value={theme.cellFont} onValueChange={(value) => setTheme({ ...theme, cellFont: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(FONT_OPTIONS).map(([key, font]) => (
                    <SelectItem key={key} value={key} style={{ fontFamily: font.value }}>
                      {font.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* גודל גופן וצפיפות */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-bold">גודל גופן</Label>
              <Select value={theme.fontSize} onValueChange={(value) => setTheme({ ...theme, fontSize: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">קטן</SelectItem>
                  <SelectItem value="medium">בינוני</SelectItem>
                  <SelectItem value="large">גדול</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-bold">צפיפות תאים</Label>
              <Select value={theme.density} onValueChange={(value) => setTheme({ ...theme, density: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="compact">צפוף</SelectItem>
                  <SelectItem value="comfortable">נוח</SelectItem>
                  <SelectItem value="spacious">מרווח</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="flex justify-between gap-3 pt-4 border-t">
          <Button variant="outline" onClick={handleReset}>
            איפוס לברירת מחדל
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              ביטול
            </Button>
            <Button onClick={handleApply} className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
              <Palette className="w-4 h-4 ml-2" />
              החל עיצוב
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { COLOR_PALETTES, BORDER_STYLES, FONT_OPTIONS };