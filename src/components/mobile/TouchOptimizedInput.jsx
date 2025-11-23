import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useIsMobile } from '../utils/useMediaQuery';

export function TouchOptimizedInput({ type = 'text', multiline = false, ...props }) {
  const isMobile = useIsMobile();
  
  const mobileStyles = isMobile ? {
    fontSize: '16px', // Prevents zoom on iOS
    minHeight: '44px',
    padding: '12px 16px'
  } : {};

  if (multiline) {
    return (
      <Textarea
        {...props}
        style={{ ...mobileStyles, ...props.style }}
        className={`${props.className} ${isMobile ? 'text-base' : ''}`}
      />
    );
  }

  return (
    <Input
      type={type}
      {...props}
      style={{ ...mobileStyles, ...props.style }}
      className={`${props.className} ${isMobile ? 'text-base h-11' : ''}`}
    />
  );
}