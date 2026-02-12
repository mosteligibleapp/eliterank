import React, { memo, useMemo, useState, useCallback } from 'react';
import { colors, borderRadius, typography } from '../../styles/theme';

function Avatar({
  name,
  size = 44,
  src,
  style = {},
}) {
  const [imgStatus, setImgStatus] = useState(src ? 'loading' : 'none');

  const initials = useMemo(() => {
    return name
      ? name
          .split(' ')
          .slice(0, 2)
          .map((n) => n[0])
          .join('')
      : '?';
  }, [name]);

  const avatarStyle = useMemo(() => ({
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: borderRadius.full,
    background: 'linear-gradient(135deg, rgba(212,175,55,0.3), rgba(212,175,55,0.1))',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: typography.fontWeight.semibold,
    color: colors.gold.primary,
    fontSize: size >= 80 ? '24px' : size >= 60 ? '18px' : '14px',
    overflow: 'hidden',
    flexShrink: 0,
    position: 'relative',
    ...style,
  }), [size, style]);

  const handleLoad = useCallback(() => setImgStatus('loaded'), []);
  const handleError = useCallback(() => setImgStatus('error'), []);

  return (
    <div style={avatarStyle}>
      {/* Always render initials as fallback underneath */}
      {imgStatus !== 'loaded' && initials}
      {src && imgStatus !== 'error' && (
        <img
          src={src}
          alt={name || 'Avatar'}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: imgStatus === 'loaded' ? 1 : 0,
            transition: 'opacity 0.2s ease',
          }}
          onLoad={handleLoad}
          onError={handleError}
        />
      )}
    </div>
  );
}

export default memo(Avatar);
