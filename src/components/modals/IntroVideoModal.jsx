import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { colors, spacing, borderRadius } from '../../styles/theme';

/**
 * IntroVideoModal — full-screen vertical video player for contestant intro videos.
 * Black backdrop, tap outside or X to close.
 */
export default function IntroVideoModal({ isOpen, onClose, videoUrl, posterUrl }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (isOpen && videoRef.current) {
      const playPromise = videoRef.current.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => { /* browser blocked autoplay — controls still work */ });
      }
    }
    if (!isOpen && videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen || !videoUrl) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(0,0,0,0.92)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.lg,
      }}
    >
      <button
        onClick={onClose}
        aria-label="Close"
        style={{
          position: 'absolute',
          top: spacing.lg,
          right: spacing.lg,
          width: '40px',
          height: '40px',
          borderRadius: borderRadius.full,
          background: 'rgba(255,255,255,0.08)',
          border: `1px solid rgba(255,255,255,0.12)`,
          color: '#fff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1,
        }}
      >
        <X size={18} />
      </button>

      <video
        ref={videoRef}
        src={videoUrl}
        poster={posterUrl}
        controls
        playsInline
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '100%',
          maxHeight: '90vh',
          borderRadius: borderRadius.lg,
          background: '#000',
        }}
      />
    </div>
  );
}
