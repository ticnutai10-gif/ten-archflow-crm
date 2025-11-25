import React from 'react';

// Simplified wrapper - no touch manipulation that blocks scrolling
// Just renders children directly
export default function PullToRefresh({ onRefresh, children }) {
  return <>{children}</>;
}