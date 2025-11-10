import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Timer as TimerIcon, Play, Pause, Square, RefreshCcw } from "lucide-react";

function useDemoTimer(initialSeconds = 0) {
  const [seconds, setSeconds] = React.useState(initialSeconds);
  const [running, setRunning] = React.useState(false);

  React.useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  const reset = () => setSeconds(0);
  const toggle = () => setRunning((r) => !r);
  const stop = () => setRunning(false);

  const h = String(Math.floor(seconds / 3600)).padStart(2, "0");
  const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
  const s = String(seconds % 60).padStart(2, "0");

  return { seconds, h, m, s, running, toggle, reset, stop };
}

function Controls({ running, onToggle, onStop, onReset, variant = "default" }) {
  const base = "h-9 px-3";
  if (variant === "ghost") {
    return (
      <div className="flex gap-2">
        <Button variant="ghost" className={`${base}`} onClick={onToggle}>
          {running ? <Pause className="w-4 h-4 ml-2" /> : <Play className="w-4 h-4 ml-2" />}
          {running ? "השהה" : "התחל"}
        </Button>
        <Button variant="ghost" className={`${base}`} onClick={onStop}>
          <Square className="w-4 h-4 ml-2" />
          עצור
        </Button>
        <Button variant="ghost" className={`${base}`} onClick={onReset}>
          <RefreshCcw className="w-4 h-4 ml-2" />
          אפס
        </Button>
      </div>
    );
  }
  if (variant === "pill") {
    return (
      <div className="flex gap-2">
        <Button className={`${base} rounded-full`} onClick={onToggle}>
          {running ? <Pause className="w-4 h-4 ml-2" /> : <Play className="w-4 h-4 ml-2" />}
          {running ? "השהה" : "התחל"}
        </Button>
        <Button variant="outline" className={`${base} rounded-full`} onClick={onStop}>
          <Square className="w-4 h-4 ml-2" />
          עצור
        </Button>
        <Button variant="outline" className={`${base} rounded-full`} onClick={onReset}>
          <RefreshCcw className="w-4 h-4 ml-2" />
          אפס
        </Button>
      </div>
    );
  }
  // default solid/outline
  return (
    <div className="flex gap-2">
      <Button className={base} onClick={onToggle}>
        {running ? <Pause className="w-4 h-4 ml-2" /> : <Play className="w-4 h-4 ml-2" />}
        {running ? "השהה" : "התחל"}
      </Button>
      <Button variant="outline" className={base} onClick={onStop}>
        <Square className="w-4 h-4 ml-2" />
        עצור
      </Button>
      <Button variant="outline" className={base} onClick={onReset}>
        <RefreshCcw className="w-4 h-4 ml-2" />
        אפס
      </Button>
    </div>
  );
}

function VariantNeon() {
  const { h, m, s, running, toggle, stop, reset } = useDemoTimer();
  return (
    <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Neon Glow</CardTitle>
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-500 grid place-items-center shadow-md ring-2 ring-white/60">
          <TimerIcon className="w-7 h-7 text-white drop-shadow" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="font-mono text-4xl md:text-5xl tracking-widest text-transparent bg-clip-text bg-gradient-to-br from-slate-900 to-slate-500">
          {h}:{m}:{s}
        </div>
        <Controls running={running} onToggle={toggle} onStop={stop} onReset={reset} />
      </CardContent>
    </Card>
  );
}

function VariantMinimal() {
  const { h, m, s, running, toggle, stop, reset } = useDemoTimer();
  return (
    <Card className="bg-white border border-slate-200 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Minimal Monochrome</CardTitle>
        <TimerIcon className="w-8 h-8 text-slate-700" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="font-mono text-4xl md:text-5xl text-slate-800">
          <span className="inline-block border-b-2 border-slate-200">{h}</span>
          <span className="mx-2 text-slate-400">:</span>
          <span className="inline-block border-b-2 border-slate-200">{m}</span>
          <span className="mx-2 text-slate-400">:</span>
          <span className="inline-block border-b-2 border-slate-200">{s}</span>
        </div>
        <Controls running={running} onToggle={toggle} onStop={stop} onReset={reset} variant="ghost" />
      </CardContent>
    </Card>
  );
}

function VariantRing() {
  const { seconds, h, m, s, running, toggle, stop, reset } = useDemoTimer();
  const pct = (seconds % 60) / 60; // progress ring by seconds
  const size = 120;
  const stroke = 8;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * pct;

  return (
    <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Circular Ring</CardTitle>
        <TimerIcon className="w-8 h-8 text-slate-700" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-6">
          <div className="relative" style={{ width: size, height: size }}>
            <svg width={size} height={size}>
              <circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                stroke="#e5e7eb"
                strokeWidth={stroke}
                fill="none"
              />
              <circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                stroke="url(#grad)"
                strokeWidth={stroke}
                strokeLinecap="round"
                fill="none"
                strokeDasharray={`${dash} ${circ - dash}`}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
              />
              <defs>
                <linearGradient id="grad" x1="0" x2="1">
                  <stop offset="0%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 grid place-items-center">
              <div className="font-mono text-2xl text-slate-800">
                {s}
              </div>
            </div>
          </div>
          <div className="font-mono text-4xl md:text-5xl text-slate-800">
            {h}:{m}:{s}
          </div>
        </div>
        <Controls running={running} onToggle={toggle} onStop={stop} onReset={reset} />
      </CardContent>
    </Card>
  );
}

function VariantGlassCards() {
  const { h, m, s, running, toggle, stop, reset } = useDemoTimer();
  const DigitCard = ({ children }) => (
    <div className="px-3 py-2 rounded-xl bg-white/60 backdrop-blur border border-white/40 shadow-sm font-mono text-3xl md:text-4xl text-slate-800">
      {children}
    </div>
  );
  return (
    <Card className="bg-gradient-to-br from-indigo-50 to-sky-50 border-0 shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Glass Segments</CardTitle>
        <div className="w-12 h-12 rounded-xl bg-white/70 grid place-items-center shadow">
          <TimerIcon className="w-7 h-7 text-indigo-600" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <DigitCard>{h}</DigitCard>
          <span className="text-slate-400 text-3xl">:</span>
          <DigitCard>{m}</DigitCard>
          <span className="text-slate-400 text-3xl">:</span>
          <DigitCard>{s}</DigitCard>
        </div>
        <Controls running={running} onToggle={toggle} onStop={stop} onReset={reset} variant="pill" />
      </CardContent>
    </Card>
  );
}

export default function TimerShowcasePage() {
  return (
    <div className="p-6 lg:p-8 min-h-screen bg-gradient-to-br from-slate-50 to-slate-100" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">תצוגות עיצוב לטיימר</h1>
          <p className="text-slate-600">ארבע אופציות מעוצבות לטיימר, עם כפתורי שליטה ודוגמאות חזותיות.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <VariantNeon />
          <VariantMinimal />
          <VariantRing />
          <VariantGlassCards />
        </div>
      </div>
    </div>
  );
}