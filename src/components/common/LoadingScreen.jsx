/**
 * LoadingScreen - Full-page loading indicator
 * 
 * Used during async operations like auth checks, data fetching, etc.
 */

import React from 'react';

export default function LoadingScreen({ message = 'Loading...' }) {
  return (
    <div className="min-h-screen flex items-center justify-center text-gold text-xl font-sans" style={{ background: '#0a0a0c' }}>
      <div className="text-center">
        <div className="w-10 h-10 mx-auto mb-4 border-3 border-border-gold border-t-gold rounded-full animate-spin" />
        {message}
      </div>
    </div>
  );
}
