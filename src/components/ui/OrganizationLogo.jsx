import React from 'react';
import { Crown } from 'lucide-react';
import { borderRadius } from '../../styles/theme';
import { useTrimmedLogo } from '../../lib/trimLogo';

// Check if the logo is an emoji or URL
function isEmoji(str) {
  if (!str) return false;
  // Emojis are typically 1-4 characters, URLs start with http or /
  return str.length <= 4 && !str.startsWith('http') && !str.startsWith('/');
}

export default function OrganizationLogo({ logo, size = 48, style = {} }) {
  // Auto-trim image logos so a tightly-padded mark fills the frame instead of
  // floating small in its own whitespace (wide wordmarks stay uncropped).
  // Called unconditionally (Rules of Hooks); only image URLs get trimmed.
  const isImageLogo = !!logo && !isEmoji(logo);
  const displayLogo = useTrimmedLogo(isImageLogo ? logo : null);

  const containerStyle = {
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: borderRadius.lg,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
    ...style,
  };

  // No logo - show default crown icon
  if (!logo) {
    return (
      <div style={{
        ...containerStyle,
        background: 'linear-gradient(135deg, rgba(212,175,55,0.3), rgba(212,175,55,0.1))',
      }}>
        <Crown size={size * 0.5} style={{ color: '#d4af37' }} />
      </div>
    );
  }

  // Emoji logo
  if (isEmoji(logo)) {
    return (
      <div style={{
        ...containerStyle,
        fontSize: `${size * 0.6}px`,
        background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(139,92,246,0.05))',
      }}>
        {logo}
      </div>
    );
  }

  // Image URL logo. Use `contain` on the trimmed logo so a padded square mark
  // fills the frame while a wide wordmark fits to width — neither is cropped.
  return (
    <img
      src={displayLogo}
      alt="Organization logo"
      style={{
        ...containerStyle,
        objectFit: 'contain',
      }}
    />
  );
}
