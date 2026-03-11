import React, { useState, useRef, useEffect, useCallback } from 'react';
import { LogOut, Shield } from 'lucide-react';
import { colors, spacing, borderRadius, typography, transitions, shadows } from '@shared/styles/theme';
import { useResponsive } from '@shared/hooks/useResponsive';

function AdminAvatar({ name, size = 32 }) {
  const initials = name
    ? name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
    : '?';

  return (
    <div style={{
      width: `${size}px`,
      height: `${size}px`,
      borderRadius: borderRadius.full,
      background: 'linear-gradient(135deg, rgba(212,175,55,0.3), rgba(212,175,55,0.15))',
      border: `2px solid ${colors.gold.primary}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: colors.gold.primary,
      fontSize: size >= 32 ? typography.fontSize.sm : typography.fontSize.xs,
      fontWeight: typography.fontWeight.bold,
      flexShrink: 0,
    }}>
      {initials}
    </div>
  );
}

export default function AdminHeader({ title, subtitle, onLogout, actions, user, profile }) {
  const [profileOpen, setProfileOpen] = useState(false);
  const dropdownRef = useRef(null);
  const { isMobile } = useResponsive();

  const displayName = profile?.first_name
    ? `${profile.first_name} ${profile.last_name || ''}`.trim()
    : user?.email?.split('@')[0] || 'Admin';

  const roleLabel = profile?.is_super_admin ? 'Super Admin' : 'Admin';

  // Close dropdown on outside click
  useEffect(() => {
    if (!profileOpen) return;
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [profileOpen]);

  // Close on Escape
  useEffect(() => {
    if (!profileOpen) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') setProfileOpen(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [profileOpen]);

  const handleToggle = useCallback(() => {
    setProfileOpen(prev => !prev);
  }, []);

  const handleLogout = useCallback(() => {
    setProfileOpen(false);
    if (onLogout) onLogout();
  }, [onLogout]);

  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: isMobile ? `0 ${spacing.md} 0 56px` : `0 ${spacing.xl}`,
      height: '56px',
      minHeight: '56px',
      background: colors.background.primary,
      borderBottom: `1px solid ${colors.border.primary}`,
      position: 'sticky',
      top: 0,
      zIndex: 10,
      flexShrink: 0,
    }}>
      {/* Left: Title + Subtitle */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        minWidth: 0,
      }}>
        <h1 style={{
          fontSize: isMobile ? typography.fontSize.md : typography.fontSize.lg,
          fontWeight: typography.fontWeight.bold,
          color: colors.text.primary,
          lineHeight: typography.lineHeight.tight,
          margin: 0,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {title}
        </h1>
        {subtitle && !isMobile && (
          <p style={{
            fontSize: typography.fontSize.xs,
            color: colors.text.tertiary,
            lineHeight: typography.lineHeight.tight,
            margin: 0,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {subtitle}
          </p>
        )}
      </div>

      {/* Right: Actions + Profile */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: spacing.sm,
        flexShrink: 0,
      }}>
        {actions}

        {/* Profile dropdown */}
        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <button
            onClick={handleToggle}
            aria-label="Profile menu"
            aria-expanded={profileOpen}
            aria-haspopup="true"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing.sm,
              padding: `${spacing.xs} ${spacing.sm}`,
              background: profileOpen ? colors.interactive.hover : 'transparent',
              border: `1px solid ${colors.border.primary}`,
              borderRadius: borderRadius.md,
              cursor: 'pointer',
              transition: `all ${transitions.fast} ${transitions.ease}`,
              height: '36px',
            }}
          >
            <AdminAvatar name={displayName} size={24} />
            {!isMobile && (
              <span style={{
                fontSize: typography.fontSize.sm,
                fontWeight: typography.fontWeight.medium,
                color: colors.text.secondary,
                maxWidth: '120px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {displayName}
              </span>
            )}
          </button>

          {/* Dropdown menu */}
          {profileOpen && (
            <div style={{
              position: 'absolute',
              top: '44px',
              right: 0,
              minWidth: '220px',
              background: colors.background.card,
              border: `1px solid ${colors.border.primary}`,
              borderRadius: borderRadius.lg,
              boxShadow: shadows.lg,
              overflow: 'hidden',
              zIndex: 50,
              animation: 'modalCardIn 150ms ease',
            }}>
              {/* User info header */}
              <div style={{
                padding: `${spacing.md} ${spacing.lg}`,
                borderBottom: `1px solid ${colors.border.primary}`,
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing.md,
                  marginBottom: spacing.sm,
                }}>
                  <AdminAvatar name={displayName} size={36} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{
                      fontSize: typography.fontSize.sm,
                      fontWeight: typography.fontWeight.semibold,
                      color: colors.text.primary,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {displayName}
                    </div>
                    <div style={{
                      fontSize: typography.fontSize.xs,
                      color: colors.text.tertiary,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {user?.email || ''}
                    </div>
                  </div>
                </div>
                {/* Role badge */}
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: spacing.xs,
                  padding: `2px ${spacing.sm}`,
                  background: 'rgba(139, 92, 246, 0.15)',
                  borderRadius: borderRadius.pill,
                  fontSize: typography.fontSize.xs,
                  fontWeight: typography.fontWeight.semibold,
                  color: '#a78bfa',
                }}>
                  <Shield size={10} />
                  {roleLabel}
                </div>
              </div>

              {/* Sign out */}
              <div style={{ padding: spacing.sm }}>
                <button
                  onClick={handleLogout}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing.sm,
                    width: '100%',
                    padding: `${spacing.sm} ${spacing.md}`,
                    background: 'transparent',
                    border: 'none',
                    borderRadius: borderRadius.md,
                    color: colors.status.error,
                    fontSize: typography.fontSize.sm,
                    fontWeight: typography.fontWeight.medium,
                    cursor: 'pointer',
                    transition: `all ${transitions.fast}`,
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <LogOut size={14} />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes modalCardIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </header>
  );
}
