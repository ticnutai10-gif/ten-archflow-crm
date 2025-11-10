import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Timer as TimerIcon, Play, Pause, Square, RefreshCcw } from "lucide-react";

function Controls({ running, onToggle, onStop, onReset, variant = "default" }) {
  const base = "h-8 px-3 text-sm";
  if (variant === "ghost") {
    return (
      <div className="flex gap-1.5">
        <Button variant="ghost" className={base} onClick={onToggle}>
          {running ? <Pause className="w-4 h-4 ml-1" /> : <Play className="w-4 h-4 ml-1" />}
          {running ? "השהה" : "התחל"}
        </Button>
        <Button variant="ghost" className={base} onClick={onStop}>
          <Square className="w-4 h-4 ml-1" />
          עצור
        </Button>
        <Button variant="ghost" className={base} onClick={onReset}>
          <RefreshCcw className="w-4 h-4 ml-1" />
          אפס
        </Button>
      </div>
    );
  }
  if (variant === "pill") {
    return (
      <div className="flex gap-1.5">
        <Button className={`${base} rounded-full`} onClick={onToggle}>
          {running ? <Pause className="w-4 h-4 ml-1" /> : <Play className="w-4 h-4 ml-1" />}
          {running ? "השהה" : "התחל"}
        </Button>
        <Button variant="outline" className={`${base} rounded-full`} onClick={onStop}>
          <Square className="w-4 h-4 ml-1" />
          עצור
        </Button>
        <Button variant="outline" className={`${base} rounded-full`} onClick={onReset}>
          <RefreshCcw className="w-4 h-4 ml-1" />
          אפס
        </Button>
      </div>
    );
  }
  return (
    <div className="flex gap-1.5">
      <Button className={base} onClick={onToggle}>
        {running ? <Pause className="w-4 h-4 ml-1" /> : <Play className="w-4 h-4 ml-1" />}
        {running ? "השהה" : "התחל"}
      </Button>
      <Button variant="outline" className={base} onClick={onStop}>
        <Square className="w-4 h-4 ml-1" />
        עצור
      </Button>
      <Button variant="outline" className={base} onClick={onReset}>
        <RefreshCcw className="w-4 h-4 ml-1" />
        אפס
      </Button>
    </div>
  );
}

export function VariantNeon({ h, m, s, running, onToggle, onStop, onReset, prefs }) {
  const { colorFrom, colorTo, fontFamily, textColor } = prefs;
  return (
    <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-md">
      <CardHeader className="flex flex-row items-center justify-between py-3">
        <CardTitle className="text-sm">Neon Glow</CardTitle>
        <div
          className="w-9 h-9 rounded-xl grid place-items-center shadow ring-1 ring-white/60"
          style={{ backgroundImage: `linear-gradient(to bottom right, ${colorFrom}, ${colorTo})` }}
        >
          <TimerIcon className="w-5 h-5 text-white drop-shadow" />
        </div>
      </CardHeader>
      <CardContent className="space-y-2 pb-3">
        <div
          className="font-mono text-3xl tracking-widest text-transparent bg-clip-text"
          style={{
            backgroundImage: `linear-gradient(to bottom right, ${colorFrom}, ${colorTo})`,
            fontFamily: fontFamily === "default" ? undefined : fontFamily,
          }}
        >
          {h}:{m}:{s}
        </div>
        <Controls running={running} onToggle={onToggle} onStop={onStop} onReset={onReset} />
      </CardContent>
    </Card>
  );
}

export function VariantMinimal({ h, m, s, running, onToggle, onStop, onReset, prefs }) {
  const { fontFamily, textColor } = prefs;
  return (
    <Card className="bg-white border border-slate-200 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between py-3">
        <CardTitle className="text-sm">Minimal</CardTitle>
        <TimerIcon className="w-5 h-5 text-slate-700" />
      </CardHeader>
      <CardContent className="space-y-2 pb-3">
        <div className="font-mono text-3xl" style={{ color: textColor, fontFamily: fontFamily === "default" ? undefined : fontFamily }}>
          <span className="inline-block border-b-2 border-slate-200">{h}</span>
          <span className="mx-1.5 text-slate-400">:</span>
          <span className="inline-block border-b-2 border-slate-200">{m}</span>
          <span className="mx-1.5 text-slate-400">:</span>
          <span className="inline-block border-b-2 border-slate-200">{s}</span>
        </div>
        <Controls running={running} onToggle={onToggle} onStop={onStop} onReset={onReset} variant="ghost" />
      </CardContent>
    </Card>
  );
}

export function VariantRing({ seconds, h, m, s, running, onToggle, onStop, onReset, prefs }) {
  const { colorFrom, colorTo, fontFamily, textColor } = prefs;
  const size = 84;
  const stroke = 7;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = (seconds % 60) / 60;
  const dash = circ * pct;

  return (
    <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-md">
      <CardHeader className="flex flex-row items-center justify-between py-3">
        <CardTitle className="text-sm">Circular</CardTitle>
        <TimerIcon className="w-5 h-5 text-slate-700" />
      </CardHeader>
      <CardContent className="space-y-2 pb-3">
        <div className="flex items-center gap-3">
          <div className="relative" style={{ width: size, height: size }}>
            <svg width={size} height={size}>
              <circle cx={size / 2} cy={size / 2} r={r} stroke="#e5e7eb" strokeWidth={stroke} fill="none" />
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
                  <stop offset="0%" stopColor={colorFrom} />
                  <stop offset="100%" stopColor={colorTo} />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 grid place-items-center">
              <div className="font-mono text-xl" style={{ color: textColor, fontFamily: fontFamily === "default" ? undefined : fontFamily }}>{s}</div>
            </div>
          </div>
          <div className="font-mono text-3xl" style={{ color: textColor, fontFamily: fontFamily === "default" ? undefined : fontFamily }}>
            {h}:{m}:{s}
          </div>
        </div>
        <Controls running={running} onToggle={onToggle} onStop={onStop} onReset={onReset} />
      </CardContent>
    </Card>
  );
}

export function VariantGlass({ h, m, s, running, onToggle, onStop, onReset, prefs }) {
  const { colorFrom, colorTo, fontFamily, textColor } = prefs;
  const Digit = ({ children }) => (
    <div
      className="px-2.5 py-1.5 rounded-lg bg-white/60 backdrop-blur border border-white/40 shadow-sm font-mono text-2xl"
      style={{ color: textColor, fontFamily: fontFamily === "default" ? undefined : fontFamily }}
    >
      {children}
    </div>
  );
  return (
    <Card className="bg-gradient-to-br from-indigo-50 to-sky-50 border-0 shadow-md">
      <CardHeader className="flex flex-row items-center justify-between py-3">
        <CardTitle className="text-sm">Glass</CardTitle>
        <div
          className="w-9 h-9 rounded-lg grid place-items-center shadow"
          style={{ backgroundImage: `linear-gradient(to bottom right, ${colorFrom}, ${colorTo})` }}
        >
          <TimerIcon className="w-5 h-5 text-white" />
        </div>
      </CardHeader>
      <CardContent className="space-y-2 pb-3">
        <div className="flex items-center gap-1.5">
          <Digit>{h}</Digit>
          <span className="text-slate-400 text-2xl">:</span>
          <Digit>{m}</Digit>
          <span className="text-slate-400 text-2xl">:</span>
          <Digit>{s}</Digit>
        </div>
        <Controls running={running} onToggle={onToggle} onStop={onStop} onReset={onReset} variant="pill" />
      </CardContent>
    </Card>
  );
}

export default function TimerVariants({ style, state, handlers, prefs }) {
  const { seconds, h, m, s, running } = state;
  const { onToggle, onStop, onReset } = handlers;

  if (style === "minimal") {
    return <VariantMinimal h={h} m={m} s={s} running={running} onToggle={onToggle} onStop={onStop} onReset={onReset} prefs={prefs} />;
  }
  if (style === "ring") {
    return <VariantRing seconds={seconds} h={h} m={m} s={s} running={running} onToggle={onToggle} onStop={onStop} onReset={onReset} prefs={prefs} />;
  }
  if (style === "glass") {
    return <VariantGlass h={h} m={m} s={s} running={running} onToggle={onToggle} onStop={onStop} onReset={onReset} prefs={prefs} />;
  }
  return <VariantNeon h={h} m={m} s={s} running={running} onToggle={onToggle} onStop={onStop} onReset={onReset} prefs={prefs} />;
}