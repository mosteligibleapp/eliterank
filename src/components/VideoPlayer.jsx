import React from 'react';
import { borderRadius } from '../styles/theme';

/**
 * VideoPlayer - Simple HTML5 video wrapper with dark theme styling
 */
export default function VideoPlayer({ src, poster, maxHeight = '400px', style = {} }) {
  if (!src) return null;

  return (
    <video
      src={src}
      poster={poster}
      controls
      playsInline
      preload="metadata"
      style={{
        width: '100%',
        maxHeight,
        borderRadius: borderRadius.lg,
        background: '#000',
        ...style,
      }}
    />
  );
}
