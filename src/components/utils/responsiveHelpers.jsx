/**
 * Responsive utility functions and constants
 */

export const BREAKPOINTS = {
  mobile: 768,
  tablet: 1024,
  desktop: 1280
};

export const getResponsiveClass = (mobileClass, desktopClass, isMobile) => {
  return isMobile ? mobileClass : desktopClass;
};

export const getResponsiveValue = (mobileValue, desktopValue, isMobile) => {
  return isMobile ? mobileValue : desktopValue;
};

export const getGridColumns = (isMobile, isTablet) => {
  if (isMobile) return 'grid-cols-1';
  if (isTablet) return 'grid-cols-2';
  return 'grid-cols-3';
};

export const getCardPadding = (isMobile) => {
  return isMobile ? 'p-3' : 'p-6';
};

export const getTextSize = (isMobile, size = 'base') => {
  const sizes = {
    sm: isMobile ? 'text-xs' : 'text-sm',
    base: isMobile ? 'text-sm' : 'text-base',
    lg: isMobile ? 'text-base' : 'text-lg',
    xl: isMobile ? 'text-lg' : 'text-xl',
    '2xl': isMobile ? 'text-xl' : 'text-2xl',
    '3xl': isMobile ? 'text-2xl' : 'text-3xl'
  };
  return sizes[size] || sizes.base;
};

export const getButtonSize = (isMobile) => {
  return isMobile ? 'h-11 px-4' : 'h-10 px-6';
};

export const getSpacing = (isMobile, size = 'md') => {
  const spacings = {
    sm: isMobile ? 'gap-2' : 'gap-3',
    md: isMobile ? 'gap-3' : 'gap-4',
    lg: isMobile ? 'gap-4' : 'gap-6'
  };
  return spacings[size] || spacings.md;
};