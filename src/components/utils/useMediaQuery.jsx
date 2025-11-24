import { useState, useEffect } from 'react';

/**
 * Detect mobile device using multiple methods:
 * 1. User Agent string (most reliable for device type)
 * 2. Touch capability 
 * 3. Screen width as fallback
 */

// Mobile user agent patterns
const MOBILE_REGEX = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS/i;

// Check if device is mobile via User Agent
function checkUserAgent() {
  if (typeof navigator === 'undefined') return false;
  return MOBILE_REGEX.test(navigator.userAgent);
}

// Check if device has touch capability
function checkTouchCapability() {
  if (typeof window === 'undefined') return false;
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    (window.matchMedia && window.matchMedia('(pointer: coarse)').matches)
  );
}

// Check screen width (breakpoint: 768px)
function checkScreenWidth() {
  if (typeof window === 'undefined') return false;
  return window.innerWidth <= 768;
}

// Combined mobile detection
function detectMobile() {
  // User agent is most reliable for actual device type
  const isUserAgentMobile = checkUserAgent();
  
  // Touch + small screen = definitely mobile experience
  const isTouchDevice = checkTouchCapability();
  const isSmallScreen = checkScreenWidth();
  
  // If user agent says mobile, trust it
  if (isUserAgentMobile) return true;
  
  // If touch device with small screen, treat as mobile
  if (isTouchDevice && isSmallScreen) return true;
  
  // Small screen only (could be resized browser window)
  // Still show mobile UI for better experience
  if (isSmallScreen) return true;
  
  return false;
}

// Force mobile mode from localStorage (for testing)
function getForcedMobileMode() {
  if (typeof localStorage === 'undefined') return null;
  try {
    const forced = localStorage.getItem('force-mobile-view');
    if (forced === 'true') return true;
    if (forced === 'false') return false;
  } catch (e) {
    // localStorage might be blocked
  }
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
    // Check forced mode first
    const forced = getForcedMobileMode();
    if (forced !== null) return forced;
    
    // Then detect automatically
    return detectMobile();
  });

  useEffect(() => {
    // Check forced mode
    const forced = getForcedMobileMode();
    if (forced !== null) {
      setIsMobile(forced);
      return;
    }

    // Initial detection
    setIsMobile(detectMobile());

    // Listen to resize for screen width changes
    const handleResize = () => {
      const newForced = getForcedMobileMode();
      if (newForced !== null) {
        setIsMobile(newForced);
      } else {
        setIsMobile(detectMobile());
      }
    };

    // Listen to orientation change (mobile devices)
    const handleOrientationChange = () => {
      setTimeout(() => {
        const newForced = getForcedMobileMode();
        if (newForced !== null) {
          setIsMobile(newForced);
        } else {
          setIsMobile(detectMobile());
        }
      }, 100); // Small delay for orientation to settle
    };

    // Listen for manual toggle
    const handleForceChange = () => {
      const newForced = getForcedMobileMode();
      if (newForced !== null) {
        setIsMobile(newForced);
      } else {
        setIsMobile(detectMobile());
      }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);
    window.addEventListener('force-mobile-changed', handleForceChange);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.removeEventListener('force-mobile-changed', handleForceChange);
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