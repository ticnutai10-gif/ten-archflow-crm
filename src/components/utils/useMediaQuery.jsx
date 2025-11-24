import { useState, useEffect, useSyncExternalStore } from 'react';

// Simple check for mobile based on screen width
function checkIsMobile() {
  if (typeof window === 'undefined') return false;
  return window.innerWidth <= 768;
}

// Force mobile mode from localStorage (for testing)
function getForcedMobileMode() {
  if (typeof window === 'undefined') return null;
  const forced = localStorage.getItem('force-mobile-view');
  if (forced === 'true') return true;
  if (forced === 'false') return false;
  return null;
}

export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const media = window.matchMedia(query);
    setMatches(media.matches);

    const listener = (e) => setMatches(e.matches);
    
    if (media.addEventListener) {
      media.addEventListener('change', listener);
      return () => media.removeEventListener('change', listener);
    } else {
      media.addListener(listener);
      return () => media.removeListener(listener);
    }
  }, [query]);

  return matches;
}

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => {
    const forced = getForcedMobileMode();
    if (forced !== null) return forced;
    return checkIsMobile();
  });

  useEffect(() => {
    // Check forced mode
    const forced = getForcedMobileMode();
    if (forced !== null) {
      setIsMobile(forced);
      return;
    }

    // Initial check
    setIsMobile(checkIsMobile());

    // Listen to resize
    const handleResize = () => {
      const newForced = getForcedMobileMode();
      if (newForced !== null) {
        setIsMobile(newForced);
      } else {
        setIsMobile(checkIsMobile());
      }
    };

    // Listen to storage changes (for force mobile toggle)
    const handleStorage = () => {
      const newForced = getForcedMobileMode();
      if (newForced !== null) {
        setIsMobile(newForced);
      } else {
        setIsMobile(checkIsMobile());
      }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('storage', handleStorage);
    window.addEventListener('force-mobile-changed', handleStorage);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('force-mobile-changed', handleStorage);
    };
  }, []);

  return isMobile;
}

export function useIsTablet() {
  return useMediaQuery('(min-width: 769px) and (max-width: 1024px)');
}

export function useIsDesktop() {
  return useMediaQuery('(min-width: 1025px)');
}

export function useIsTouchDevice() {
  return useMediaQuery('(hover: none) and (pointer: coarse)');
}