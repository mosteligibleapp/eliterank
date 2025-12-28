import React from 'react';
import { Crown } from 'lucide-react';
import { borderRadius } from '../../styles/theme';

// Check if the logo is an emoji or URL
function isEmoji(str) {
  if (!str) return false;
  // Emojis are typically 1-4 characters, URLs start with http or /
  return str.length <= 4 && !str.startsWith('http') && !str.startsWith('/');
}

export default function OrganizationLogo({ logo, size = 48, style = {} }) {
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

  // Image URL logo
  return (
    <img
      src={logo}
      alt="Organization logo"
      style={{
        ...containerStyle,
        objectFit: 'cover',
      }}
    />
  );
}
