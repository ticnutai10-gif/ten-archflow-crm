import React, { useState, useEffect, useRef } from 'react';
import { Activity, Clock, Zap, TrendingUp, RefreshCw, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function PerformanceMonitor() {
  const [isVisible, setIsVisible] = useState(false);
  const [metrics, setMetrics] = useState({
    fps: 0,
    memory: 0,
    renderCount: 0,
    avgRenderTime: 0,
    slowRenders: []
  });
  
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const renderTimesRef = useRef([]);
  const componentRendersRef = useRef({});

  // FPS Monitor
  useEffect(() => {
    if (!isVisible) return;
    
    const measureFPS = () => {
      frameCountRef.current++;
      const currentTime = performance.now();
      const elapsed = currentTime - lastTimeRef.current;
      
      if (elapsed >= 1000) {
        const fps = Math.round((frameCountRef.current * 1000) / elapsed);
        setMetrics(prev => ({ ...prev, fps }));
        frameCountRef.current = 0;
        lastTimeRef.current = currentTime;
      }
      
      requestAnimationFrame(measureFPS);
    };
    
    const animationId = requestAnimationFrame(measureFPS);
    return () => cancelAnimationFrame(animationId);
  }, [isVisible]);

  // Memory Monitor
  useEffect(() => {
    if (!isVisible) return;
    
    const measureMemory = () => {
      if (performance.memory) {
        const usedMemory = Math.round(performance.memory.usedJSHeapSize / 1048576);
        setMetrics(prev => ({ ...prev, memory: usedMemory }));
      }
    };
    
    const interval = setInterval(measureMemory, 1000);
    return () => clearInterval(interval);
  }, [isVisible]);

  // Render Performance Observer
  useEffect(() => {
    if (!isVisible) return;
    
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach(entry => {
        if (entry.entryType === 'measure') {
          renderTimesRef.current.push(entry.duration);
          
          // Keep only last 100 measurements
          if (renderTimesRef.current.length > 100) {
            renderTimesRef.current.shift();
          }
          
          // Calculate average
          const avg = renderTimesRef.current.reduce((a, b) => a + b, 0) / renderTimesRef.current.length;
          
          // Track slow renders (>16ms for 60fps)
          if (entry.duration > 16) {
            setMetrics(prev => ({
              ...prev,
              avgRenderTime: Math.round(avg * 100) / 100,
              slowRenders: [...prev.slowRenders.slice(-9), {
                name: entry.name,
                duration: Math.round(entry.duration * 100) / 100,
                time: new Date().toLocaleTimeString()
              }]
            }));
          } else {
            setMetrics(prev => ({
              ...prev,
              avgRenderTime: Math.round(avg * 100) / 100
            }));
          }
        }
      });
    });
    
    observer.observe({ entryTypes: ['measure'] });
    return () => observer.disconnect();
  }, [isVisible]);

  // Component Render Counter
  useEffect(() => {
    if (!isVisible) return;
    
    const originalRender = React.Component.prototype.render;
    const renderCounts = {};
    
    React.Component.prototype.render = function() {
      const name = this.constructor.name;
      renderCounts[name] = (renderCounts[name] || 0) + 1;
      componentRendersRef.current = { ...renderCounts };
      return originalRender.call(this);
    };
    
    return () => {
      React.Component.prototype.render = originalRender;
    };
  }, [isVisible]);

  // Performance Marks for measuring
  useEffect(() => {
    const markStart = (name) => {
      performance.mark(`${name}-start`);
    };
    
    const markEnd = (name) => {
      performance.mark(`${name}-end`);
      performance.measure(name, `${name}-start`, `${name}-end`);
    };

    window.perfMark = markStart;
    window.perfMeasure = markEnd;
    
    return () => {
      delete window.perfMark;
      delete window.perfMeasure;
    };
  }, []);

  const getPerformanceScore = () => {
    const { fps, avgRenderTime, slowRenders } = metrics;
    
    let score = 100;
    
    // FPS impact
    if (fps < 30) score -= 40;
    else if (fps < 45) score -= 20;
    else if (fps < 55) score -= 10;
    
    // Render time impact
    if (avgRenderTime > 50) score -= 30;
    else if (avgRenderTime > 30) score -= 15;
    else if (avgRenderTime > 16) score -= 5;
    
    // Slow renders impact
    if (slowRenders.length > 5) score -= 20;
    else if (slowRenders.length > 2) score -= 10;
    
    return Math.max(0, score);
  };

  const score = getPerformanceScore();
  const scoreColor = score >= 80 ? 'text-green-600' : score >= 60 ? 'text-yellow-600' : 'text-red-600';
  const scoreBg = score >= 80 ? 'bg-green-100' : score >= 60 ? 'bg-yellow-100' : 'bg-red-100';

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-24 left-6 z-[9999] bg-purple-600 hover:bg-purple-700 text-white p-3 rounded-full shadow-lg transition-all"
        title="פתח ניטור ביצועים">
        <Activity className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-24 left-6 z-[9999] w-80" dir="rtl">
      <Card className="bg-white shadow-2xl border-2 border-purple-200">
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-4 rounded-t-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              <span className="font-bold">ניטור ביצועים</span>
            </div>
            <button
              onClick={() => setIsVisible(false)}
              className="hover:bg-white/20 p-1 rounded transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="flex items-center gap-3">
            <div className={`${scoreBg} px-3 py-1 rounded-full`}>
              <span className={`${scoreColor} font-bold text-lg`}>{score}</span>
            </div>
            <span className="text-sm text-white/90">ציון כללי</span>
          </div>
        </div>

        <div className="p-4 space-y-3">
          {/* FPS */}
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium">FPS</span>
            </div>
            <div className="text-right">
              <div className={`text-lg font-bold ${metrics.fps < 30 ? 'text-red-600' : metrics.fps < 55 ? 'text-yellow-600' : 'text-green-600'}`}>
                {metrics.fps}
              </div>
              <div className="text-xs text-slate-500">
                יעד: 60
              </div>
            </div>
          </div>

          {/* Memory */}
          {metrics.memory > 0 && (
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-medium">זיכרון</span>
              </div>
              <div className="text-right">
                <div className={`text-lg font-bold ${metrics.memory > 100 ? 'text-red-600' : metrics.memory > 50 ? 'text-yellow-600' : 'text-green-600'}`}>
                  {metrics.memory}MB
                </div>
                <div className="text-xs text-slate-500">
                  JS Heap
                </div>
              </div>
            </div>
          )}

          {/* Render Time */}
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-600" />
              <span className="text-sm font-medium">זמן רינדור ממוצע</span>
            </div>
            <div className="text-right">
              <div className={`text-lg font-bold ${metrics.avgRenderTime > 50 ? 'text-red-600' : metrics.avgRenderTime > 16 ? 'text-yellow-600' : 'text-green-600'}`}>
                {metrics.avgRenderTime}ms
              </div>
              <div className="text-xs text-slate-500">
                יעד: &lt;16ms
              </div>
            </div>
          </div>

          {/* Slow Renders */}
          {metrics.slowRenders.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center gap-2 mb-2">
                <RefreshCw className="w-4 h-4 text-red-600" />
                <span className="text-sm font-bold text-red-600">רינדורים איטיים ({metrics.slowRenders.length})</span>
              </div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {metrics.slowRenders.slice(-5).map((render, i) => (
                  <div key={i} className="text-xs bg-red-50 p-2 rounded flex justify-between items-center">
                    <span className="font-mono text-red-800 truncate flex-1">{render.name}</span>
                    <span className="text-red-600 font-bold ml-2">{render.duration}ms</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-3 border-t text-xs text-slate-500 space-y-1">
            <div className="flex justify-between">
              <span>✅ מעולה: 80-100</span>
              <span>⚠️ בינוני: 60-79</span>
              <span>❌ איטי: 0-59</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}