import React from 'react';

/**
 * Avatar Component
 * 
 * Features:
 * - Multiple sizes (xs, sm, md, lg, xl)
 * - Status indicator (online, offline, busy, away)
 * - Rank overlay for top contestants
 * - Fallback to initials
 * - Image loading states
 * 
 * @example
 * <Avatar src="..." size="lg" />
 * <Avatar src="..." status="online" />
 * <Avatar src="..." rank={1} />
 * <AvatarGroup users={[...]} max={3} />
 */

const Avatar = ({
  src,
  alt = '',
  name,
  size = 'md',
  status,
  rank,
  border = false,
  className = '',
  onClick,
  ...props
}) => {
  const [imgError, setImgError] = React.useState(false);
  const [imgLoading, setImgLoading] = React.useState(true);
  
  // Size configurations
  const sizes = {
    xs: { container: 'w-6 h-6', text: 'text-[10px]', status: 'w-1.5 h-1.5', rank: 'w-3 h-3 text-[8px]' },
    sm: { container: 'w-8 h-8', text: 'text-xs', status: 'w-2 h-2', rank: 'w-4 h-4 text-[9px]' },
    md: { container: 'w-10 h-10', text: 'text-sm', status: 'w-2.5 h-2.5', rank: 'w-5 h-5 text-[10px]' },
    lg: { container: 'w-12 h-12', text: 'text-base', status: 'w-3 h-3', rank: 'w-6 h-6 text-xs' },
    xl: { container: 'w-16 h-16', text: 'text-lg', status: 'w-3.5 h-3.5', rank: 'w-7 h-7 text-sm' },
    '2xl': { container: 'w-20 h-20', text: 'text-xl', status: 'w-4 h-4', rank: 'w-8 h-8 text-base' },
  };
  
  // Status colors
  const statusColors = {
    online: 'bg-success',
    offline: 'bg-text-disabled',
    busy: 'bg-error',
    away: 'bg-warning',
  };
  
  // Rank colors
  const rankColors = {
    1: 'bg-gradient-to-br from-gold-500 to-gold-600 text-bg-primary shadow-glow-gold',
    2: 'bg-gradient-to-br from-zinc-300 to-zinc-400 text-bg-primary',
    3: 'bg-gradient-to-br from-amber-600 to-amber-700 text-white',
  };
  
  // Get initials from name
  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };
  
  const sizeConfig = sizes[size];
  const showImage = src && !imgError;
  
  return (
    <div 
      className={`
        relative inline-flex flex-shrink-0
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
      onClick={onClick}
      {...props}
    >
      {/* Main avatar */}
      <div 
        className={`
          ${sizeConfig.container}
          rounded-full
          overflow-hidden
          bg-bg-elevated
          flex items-center justify-center
          ${border ? 'ring-2 ring-bg-primary' : ''}
          ${rank === 1 ? 'ring-2 ring-gold' : ''}
        `}
      >
        {showImage ? (
          <>
            {imgLoading && (
              <div className="absolute inset-0 bg-bg-elevated animate-pulse" />
            )}
            <img 
              src={src}
              alt={alt || name || ''}
              className={`
                w-full h-full object-cover
                transition-opacity duration-200
                ${imgLoading ? 'opacity-0' : 'opacity-100'}
              `}
              onLoad={() => setImgLoading(false)}
              onError={() => {
                setImgError(true);
                setImgLoading(false);
              }}
            />
          </>
        ) : (
          <span className={`${sizeConfig.text} font-medium text-text-secondary`}>
            {getInitials(name)}
          </span>
        )}
      </div>
      
      {/* Status indicator */}
      {status && (
        <span 
          className={`
            absolute bottom-0 right-0
            ${sizeConfig.status}
            ${statusColors[status]}
            rounded-full
            ring-2 ring-bg-primary
          `}
        />
      )}
      
      {/* Rank badge */}
      {rank && rank <= 3 && (
        <span 
          className={`
            absolute -top-1 -right-1
            ${sizeConfig.rank}
            ${rankColors[rank]}
            rounded-full
            flex items-center justify-center
            font-bold
            ring-2 ring-bg-primary
          `}
        >
          {rank}
        </span>
      )}
    </div>
  );
};

/**
 * Avatar Group - Stacked avatars
 */
export const AvatarGroup = ({
  users = [],
  max = 4,
  size = 'md',
  className = '',
  onMoreClick,
  ...props
}) => {
  const visibleUsers = users.slice(0, max);
  const hiddenCount = users.length - max;
  
  // Overlap amounts by size
  const overlapAmounts = {
    xs: '-ml-1.5',
    sm: '-ml-2',
    md: '-ml-2.5',
    lg: '-ml-3',
    xl: '-ml-4',
    '2xl': '-ml-5',
  };
  
  const sizes = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg',
    '2xl': 'w-20 h-20 text-xl',
  };
  
  return (
    <div className={`flex items-center ${className}`} {...props}>
      {visibleUsers.map((user, index) => (
        <Avatar
          key={user.id || index}
          src={user.image || user.avatar || user.src}
          name={user.name}
          size={size}
          border
          className={index > 0 ? overlapAmounts[size] : ''}
        />
      ))}
      
      {hiddenCount > 0 && (
        <button
          onClick={onMoreClick}
          className={`
            ${overlapAmounts[size]}
            ${sizes[size]}
            rounded-full
            bg-bg-elevated
            border-2 border-bg-primary
            flex items-center justify-center
            font-medium text-text-secondary
            hover:bg-bg-hover hover:text-text-primary
            transition-colors
          `}
        >
          +{hiddenCount}
        </button>
      )}
    </div>
  );
};

/**
 * Avatar with name - Common pattern
 */
export const AvatarWithName = ({
  user,
  size = 'md',
  subtitle,
  className = '',
  ...props
}) => {
  const textSizes = {
    xs: { name: 'text-xs', subtitle: 'text-[10px]' },
    sm: { name: 'text-sm', subtitle: 'text-xs' },
    md: { name: 'text-sm', subtitle: 'text-xs' },
    lg: { name: 'text-base', subtitle: 'text-sm' },
    xl: { name: 'text-lg', subtitle: 'text-base' },
  };
  
  return (
    <div className={`flex items-center gap-3 ${className}`} {...props}>
      <Avatar
        src={user.image || user.avatar}
        name={user.name}
        size={size}
        status={user.status}
        rank={user.rank}
      />
      <div className="min-w-0 flex-1">
        <p className={`${textSizes[size].name} font-medium text-text-primary truncate`}>
          {user.name}
        </p>
        {subtitle && (
          <p className={`${textSizes[size].subtitle} text-text-muted truncate`}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
};

export default Avatar;
