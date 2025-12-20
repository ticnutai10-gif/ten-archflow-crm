import React from 'react';

// Simplified card without swipe gestures that block scrolling
// Just renders children with standard touch behavior
export default function SwipeableCard({ 
  children, 
  onDelete, 
  onEdit, 
  onView,
  className = ""
}) {
  return (
    <div className={`relative ${className}`}>
      {children}
    </div>
  );
}