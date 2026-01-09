import React, { useState, useRef, useEffect, memo, useCallback } from 'react';
import { User, LogOut, LayoutDashboard, UserCircle, LogIn } from 'lucide-react';
import { colors, borderRadius, spacing, typography, shadows, transitions } from '../../styles/theme';
import Avatar from './Avatar';

/**
 * ProfileIcon - A reusable profile icon component with dropdown menu
 * Displays in the top-right corner across all pages
 */
function ProfileIcon({
  isAuthenticated = false,
  user = null,
  profile = null,
  onLogin,
  onLogout,
  onProfile,
  onDashboard,
  hasDashboardAccess = false,
  size = 36,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  const handleToggle = useCallback(() => {
    if (!isAuthenticated && onLogin) {
      onLogin();
    } else {
      setIsOpen((prev) => !prev);
    }
  }, [isAuthenticated, onLogin]);

  const handleMenuClick = useCallback((action) => {
    setIsOpen(false);
    if (action) action();
  }, []);

  // Get display name
  const displayName = profile?.first_name
    ? `${profile.first_name} ${profile.last_name || ''}`.trim()
    : user?.email?.split('@')[0] || 'User';

  const containerStyle = {
    position: 'relative',
    zIndex: 100,
  };

  const buttonStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: borderRadius.full,
    background: isAuthenticated
      ? 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.1))'
      : 'rgba(255, 255, 255, 0.1)',
    border: isAuthenticated
      ? `2px solid ${colors.gold.primary}`
      : `1px solid ${colors.border.secondary}`,
    cursor: 'pointer',
    transition: `all ${transitions.fast}`,
    overflow: 'hidden',
    padding: 0,
  };

  const dropdownStyle = {
    position: 'absolute',
    top: `${size + 8}px`,
    right: 0,
    minWidth: '200px',
    background: colors.background.card,
    border: `1px solid ${colors.border.primary}`,
    borderRadius: borderRadius.lg,
    boxShadow: shadows.lg,
    overflow: 'hidden',
    opacity: isOpen ? 1 : 0,
    visibility: isOpen ? 'visible' : 'hidden',
    transform: isOpen ? 'translateY(0)' : 'translateY(-8px)',
    transition: `all ${transitions.fast}`,
  };

  const headerStyle = {
    padding: `${spacing.md} ${spacing.lg}`,
    borderBottom: `1px solid ${colors.border.primary}`,
  };

  const nameStyle = {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  };

  const emailStyle = {
    fontSize: typography.fontSize.xs,
    color: colors.text.muted,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };

  const menuStyle = {
    padding: spacing.sm,
  };

  const menuItemStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
    width: '100%',
    padding: `${spacing.sm} ${spacing.md}`,
    background: 'transparent',
    border: 'none',
    borderRadius: borderRadius.md,
    color: colors.text.secondary,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    cursor: 'pointer',
    transition: `all ${transitions.fast}`,
    textAlign: 'left',
  };

  const logoutItemStyle = {
    ...menuItemStyle,
    color: colors.status.error,
  };

  return (
    <div ref={dropdownRef} style={containerStyle}>
      <button
        onClick={handleToggle}
        style={buttonStyle}
        aria-label={isAuthenticated ? 'Profile menu' : 'Sign in'}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {isAuthenticated && profile?.avatar_url ? (
          <Avatar
            name={displayName}
            src={profile.avatar_url}
            size={size - 4}
          />
        ) : isAuthenticated ? (
          <Avatar name={displayName} size={size - 4} />
        ) : (
          <User size={size * 0.5} color={colors.text.secondary} />
        )}
      </button>

      {isAuthenticated && (
        <div style={dropdownStyle}>
          {/* User info header */}
          <div style={headerStyle}>
            <div style={nameStyle}>{displayName}</div>
            {user?.email && <div style={emailStyle}>{user.email}</div>}
          </div>

          {/* Menu items */}
          <div style={menuStyle}>
            {onProfile && (
              <button
                onClick={() => handleMenuClick(onProfile)}
                style={menuItemStyle}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = colors.interactive.hover;
                  e.currentTarget.style.color = colors.text.primary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = colors.text.secondary;
                }}
              >
                <UserCircle size={16} />
                View Profile
              </button>
            )}

            {hasDashboardAccess && onDashboard && (
              <button
                onClick={() => handleMenuClick(onDashboard)}
                style={menuItemStyle}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = colors.interactive.hover;
                  e.currentTarget.style.color = colors.text.primary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = colors.text.secondary;
                }}
              >
                <LayoutDashboard size={16} />
                Dashboard
              </button>
            )}

            {onLogout && (
              <button
                onClick={() => handleMenuClick(onLogout)}
                style={logoutItemStyle}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <LogOut size={16} />
                Sign Out
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(ProfileIcon);
