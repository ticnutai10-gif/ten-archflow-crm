import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
    density: "comfortable"
  });

  React.useEffect(() => {
    if (currentTheme) {
      setTheme(currentTheme);
    }
  }, [currentTheme, open]);

  const handleApply = () => {
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
      density: "comfortable"
    };
    setTheme(defaultTheme);
    toast.success("✓ עיצוב אופס לברירת מחדל");
  };

  const selectedPalette = COLOR_PALETTES[theme.palette] || COLOR_PALETTES.default;
  const selectedBorder = BORDER_STYLES[theme.borderStyle] || BORDER_STYLES.thin;

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
            <Label className="text-base font-bold flex items-center gap-2">
              <Palette className="w-5 h-5" />
              פלטת צבעים
            </Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(COLOR_PALETTES).map(([key, palette]) => (
                <button
                  key={key}
                  onClick={() => setTheme({ ...theme, palette: key })}
                  className={`relative p-3 rounded-xl border-2 transition-all hover:scale-105 ${
                    theme.palette === key ? 'border-purple-500 shadow-lg' : 'border-slate-200 hover:border-slate-300'
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
                  {theme.palette === key && (
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">✓</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* תצוגה מקדימה */}
          <div className="space-y-3">
            <Label className="text-base font-bold">תצוגה מקדימה</Label>
            <div className="border-2 border-slate-300 rounded-lg overflow-hidden">
              <table className="w-full border-collapse" dir="rtl">
                <thead>
                  <tr>
                    <th 
                      className="p-3 text-right border"
                      style={{
                        backgroundColor: selectedPalette.headerBg,
                        color: selectedPalette.headerText,
                        borderWidth: selectedBorder.width,
                        borderStyle: selectedBorder.style,
                        borderColor: selectedPalette.border,
                        fontFamily: FONT_OPTIONS[theme.headerFont]?.value,
                        fontSize: theme.fontSize === 'small' ? '12px' : theme.fontSize === 'large' ? '16px' : '14px'
                      }}
                    >
                      כותרת 1
                    </th>
                    <th 
                      className="p-3 text-right border"
                      style={{
                        backgroundColor: selectedPalette.headerBg,
                        color: selectedPalette.headerText,
                        borderWidth: selectedBorder.width,
                        borderStyle: selectedBorder.style,
                        borderColor: selectedPalette.border,
                        fontFamily: FONT_OPTIONS[theme.headerFont]?.value,
                        fontSize: theme.fontSize === 'small' ? '12px' : theme.fontSize === 'large' ? '16px' : '14px'
                      }}
                    >
                      כותרת 2
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td 
                      className="p-2 border"
                      style={{
                        backgroundColor: selectedPalette.cellBg,
                        color: selectedPalette.cellText,
                        borderWidth: selectedBorder.width,
                        borderStyle: selectedBorder.style,
                        borderColor: selectedPalette.border,
                        fontFamily: FONT_OPTIONS[theme.cellFont]?.value,
                        fontSize: theme.fontSize === 'small' ? '11px' : theme.fontSize === 'large' ? '15px' : '13px',
                        padding: theme.density === 'compact' ? '4px 8px' : theme.density === 'spacious' ? '12px 16px' : '8px 12px'
                      }}
                    >
                      נתון 1
                    </td>
                    <td 
                      className="p-2 border"
                      style={{
                        backgroundColor: selectedPalette.cellBg,
                        color: selectedPalette.cellText,
                        borderWidth: selectedBorder.width,
                        borderStyle: selectedBorder.style,
                        borderColor: selectedPalette.border,
                        fontFamily: FONT_OPTIONS[theme.cellFont]?.value,
                        fontSize: theme.fontSize === 'small' ? '11px' : theme.fontSize === 'large' ? '15px' : '13px',
                        padding: theme.density === 'compact' ? '4px 8px' : theme.density === 'spacious' ? '12px 16px' : '8px 12px'
                      }}
                    >
                      נתון 2
                    </td>
                  </tr>
                  <tr>
                    <td 
                      className="p-2 border"
                      style={{
                        backgroundColor: selectedPalette.cellAltBg,
                        color: selectedPalette.cellText,
                        borderWidth: selectedBorder.width,
                        borderStyle: selectedBorder.style,
                        borderColor: selectedPalette.border,
                        fontFamily: FONT_OPTIONS[theme.cellFont]?.value,
                        fontSize: theme.fontSize === 'small' ? '11px' : theme.fontSize === 'large' ? '15px' : '13px',
                        padding: theme.density === 'compact' ? '4px 8px' : theme.density === 'spacious' ? '12px 16px' : '8px 12px'
                      }}
                    >
                      נתון 3
                    </td>
                    <td 
                      className="p-2 border"
                      style={{
                        backgroundColor: selectedPalette.cellAltBg,
                        color: selectedPalette.cellText,
                        borderWidth: selectedBorder.width,
                        borderStyle: selectedBorder.style,
                        borderColor: selectedPalette.border,
                        fontFamily: FONT_OPTIONS[theme.cellFont]?.value,
                        fontSize: theme.fontSize === 'small' ? '11px' : theme.fontSize === 'large' ? '15px' : '13px',
                        padding: theme.density === 'compact' ? '4px 8px' : theme.density === 'spacious' ? '12px 16px' : '8px 12px'
                      }}
                    >
                      נתון 4
                    </td>
                  </tr>
                </tbody>
              </table>
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