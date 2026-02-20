import React, { memo, useMemo, useState, useCallback } from 'react';

function Avatar({
  name,
  size = 44,
  src,
  className = '',
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

  // Determine font size class based on avatar size
  const fontSizeClass = size >= 80 ? 'text-2xl' : size >= 60 ? 'text-lg' : 'text-sm';

  const handleLoad = useCallback(() => setImgStatus('loaded'), []);
  const handleError = useCallback(() => setImgStatus('error'), []);

  return (
    <div 
      className={`rounded-full bg-gradient-to-br from-gold/30 to-gold/10 flex items-center justify-center font-semibold text-gold overflow-hidden shrink-0 relative ${fontSizeClass} ${className}`}
      style={{ width: `${size}px`, height: `${size}px`, ...style }}
    >
      {/* Always render initials as fallback underneath */}
      {imgStatus !== 'loaded' && initials}
      {src && imgStatus !== 'error' && (
        <img
          src={src}
          alt={name || 'Avatar'}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-200 ${imgStatus === 'loaded' ? 'opacity-100' : 'opacity-0'}`}
          onLoad={handleLoad}
          onError={handleError}
        />
      )}
    </div>
  );
}

export default memo(Avatar);
