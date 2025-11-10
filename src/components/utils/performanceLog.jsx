
import React from 'react';

// Performance logging utility with detailed memory and timing tracking
const PERF_LOG_KEY = "perf-logs";
const MAX_LOGS = 500;

export class PerformanceLogger {
  static instance = null;

  constructor() {
    if (PerformanceLogger.instance) {
      return PerformanceLogger.instance;
    }
    this.logs = [];
    this.timers = new Map();
    PerformanceLogger.instance = this;
  }

  static getInstance() {
    if (!PerformanceLogger.instance) {
      new PerformanceLogger();
    }
    return PerformanceLogger.instance;
  }

  log(component, event, data = {}) {
    const timestamp = Date.now();
    const memory = this.getMemoryInfo();
    
    const entry = {
      timestamp,
      component,
      event,
      data,
      memory,
      url: typeof window !== 'undefined' ? window.location.pathname : 'unknown',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 100) : 'unknown'
    };

    this.logs.push(entry);
    
    // Keep only recent logs in memory
    if (this.logs.length > MAX_LOGS) {
      this.logs = this.logs.slice(-MAX_LOGS);
    }

    // Console output for development - check if methods exist
    try {
      if (typeof console.group === 'function') {
        console.group(`🔍 [${component}] ${event}`);
        console.log('Data:', data);
        console.log('Memory:', memory);
        console.log('Time:', new Date(timestamp).toLocaleTimeString());
        console.groupEnd();
      } else {
        // Fallback for environments without console.group
        console.log(`🔍 [${component}] ${event}`, { data, memory, time: new Date(timestamp).toLocaleTimeString() });
      }
    } catch (e) {
      // Silent fallback if console methods fail
      try {
        console.log(`🔍 [${component}] ${event}`, data);
      } catch {
        // Complete silence if even basic console.log fails
      }
    }

    // Persist critical events
    if (event.includes('error') || event.includes('slow') || event.includes('freeze')) {
      this.persistLog(entry);
    }
  }

  startTimer(id) {
    this.timers.set(id, performance.now());
  }

  endTimer(component, id, threshold = 100) {
    const startTime = this.timers.get(id);
    if (!startTime) return;

    const duration = performance.now() - startTime;
    this.timers.delete(id);

    const isSlow = duration > threshold;
    this.log(component, `timer_${id}${isSlow ? '_SLOW' : ''}`, {
      duration: Math.round(duration * 100) / 100,
      threshold,
      slow: isSlow
    });

    return duration;
  }

  getMemoryInfo() {
    try {
      if (typeof performance !== 'undefined' && 'memory' in performance) {
        const mem = performance.memory;
        return {
          used: Math.round(mem.usedJSHeapSize / 1024 / 1024 * 100) / 100,
          total: Math.round(mem.totalJSHeapSize / 1024 / 1024 * 100) / 100,
          limit: Math.round(mem.jsHeapSizeLimit / 1024 / 1024 * 100) / 100
        };
      }
    } catch (e) {
      // Ignore memory API errors
    }
    return null;
  }

  persistLog(entry) {
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = JSON.parse(localStorage.getItem(PERF_LOG_KEY) || '[]');
        stored.push(entry);
        
        // Keep only last 50 persisted logs
        const recent = stored.slice(-50);
        localStorage.setItem(PERF_LOG_KEY, JSON.stringify(recent));
      }
    } catch (e) {
      console.warn('Failed to persist performance log:', e);
    }
  }

  getRecentLogs(count = 100) {
    return this.logs.slice(-count);
  }

  getPersistedLogs() {
    try {
      if (typeof localStorage !== 'undefined') {
        return JSON.parse(localStorage.getItem(PERF_LOG_KEY) || '[]');
      }
    } catch {
      // Silent fallback
    }
    return [];
  }

  clear() {
    this.logs = [];
    this.timers.clear();
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(PERF_LOG_KEY);
      }
    } catch {}
  }
}

// Global instance
const perfLogger = PerformanceLogger.getInstance();

// Convenient exports
export const logPerf = (component, event, data) => perfLogger.log(component, event, data);
export const startTimer = (id) => perfLogger.startTimer(id);
export const endTimer = (component, id, threshold) => perfLogger.endTimer(component, id, threshold);
export const getPerformanceLogs = () => perfLogger.getRecentLogs();
export const clearPerformanceLogs = () => perfLogger.clear();

// React hook for performance monitoring
export function usePerformanceMonitor(componentName) {
  const renderCount = React.useRef(0);
  const mountTime = React.useRef(performance.now());
  
  React.useEffect(() => {
    renderCount.current += 1;
    const renderTime = performance.now() - mountTime.current;
    
    if (renderCount.current > 1) {
      logPerf(componentName, 'rerender', {
        count: renderCount.current,
        timeSinceMount: Math.round(renderTime * 100) / 100
      });
    }
    
    if (renderCount.current > 10) {
      logPerf(componentName, 'excessive_renders', {
        count: renderCount.current,
        warning: 'Component may have render loop'
      });
    }
  });

  React.useEffect(() => {
    logPerf(componentName, 'mount', {});
    
    // Capture the ref value inside the effect
    const mountTimeValue = mountTime.current; // Captures mount time at the effect's setup
    const renderCountRef = renderCount; // Captures the ref object
    
    return () => {
      const totalTime = performance.now() - mountTimeValue;
      logPerf(componentName, 'unmount', {
        totalRenders: renderCountRef.current, // Access the latest value via the captured ref object
        lifeTime: Math.round(totalTime * 100) / 100
      });
    };
  }, [componentName]);
}
