import React, { useState, useRef, useEffect, memo, useCallback } from 'react';
import { User, LogOut, LayoutDashboard, UserCircle, LogIn, Gift, Lightbulb, Trophy, Settings, TrendingUp, Heart, Award, Gavel } from 'lucide-react';
import { colors, borderRadius, spacing, typography, shadows, transitions } from '../../styles/theme';
import Avatar from './Avatar';
import { SkeletonPulse } from '../common/Skeleton';

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
  onPerformance,
  onRewards,
  onAchievements,
  onDashboard,
  onJudge,
  onAccountSettings,
  onHowToCompete,
  hasDashboardAccess = false,
  isJudge = false,
  performance = null,
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

  // Get display name — falls back to empty string when the user record
  // hasn't hydrated yet (persisted isAuthenticated can be true before the
  // Supabase session resolves). The dropdown header renders a skeleton in
  // that window instead of a literal "User" placeholder.
  const displayName = profile?.first_name
    ? `${profile.first_name} ${profile.last_name || ''}`.trim()
    : user?.email?.split('@')[0] || '';

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

  const performanceSectionStyle = {
    padding: `${spacing.md} ${spacing.lg}`,
    borderBottom: `1px solid ${colors.border.primary}`,
    background: 'linear-gradient(135deg, rgba(212,175,55,0.06), transparent)',
  };

  const performanceHeaderStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.xs,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colors.gold.primary,
    textTransform: 'uppercase',
    letterSpacing: typography.letterSpacing.wider,
    marginBottom: spacing.sm,
  };

  const performanceRowStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  };

  const performanceLabelStyle = {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };

  const performanceValueStyle = {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.gold.primary,
    fontVariantNumeric: 'tabular-nums',
  };

  const performanceCompNameStyle = {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
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
            {user ? (
              <>
                {displayName && <div style={nameStyle}>{displayName}</div>}
                {user.email && <div style={emailStyle}>{user.email}</div>}
              </>
            ) : (
              <>
                <SkeletonPulse width="120px" height="14px" style={{ marginBottom: spacing.xs }} />
                <SkeletonPulse width="160px" height="12px" />
              </>
            )}
          </div>

          {/* Performance stats — accepts either a single { totalVotes,
              roundVotes, rank, roundLabel } object or an array of such
              entries (one per competition the user is competing in). */}
          {performance && (Array.isArray(performance) ? performance : [performance]).length > 0 && (
            <div style={performanceSectionStyle}>
              <div style={performanceHeaderStyle}>
                <TrendingUp size={12} color={colors.gold.primary} />
                <span>My Performance</span>
              </div>
              {(Array.isArray(performance) ? performance : [performance]).map((perf, idx, arr) => (
                <div
                  key={perf.competitionId || idx}
                  style={{
                    marginBottom: idx < arr.length - 1 ? spacing.md : 0,
                    paddingBottom: idx < arr.length - 1 ? spacing.md : 0,
                    borderBottom: idx < arr.length - 1
                      ? `1px solid ${colors.border.secondary}`
                      : 'none',
                  }}
                >
                  {arr.length > 1 && perf.competitionName && (
                    <div style={performanceCompNameStyle}>
                      {perf.competitionName}
                    </div>
                  )}
                  <div style={performanceRowStyle}>
                    <Heart size={14} color={colors.gold.primary} />
                    <span style={performanceLabelStyle}>Total votes</span>
                    <span style={performanceValueStyle}>
                      {Number(perf.totalVotes ?? 0).toLocaleString()}
                    </span>
                  </div>
                  <div style={performanceRowStyle}>
                    <Award size={14} color={colors.gold.primary} />
                    <span style={performanceLabelStyle}>
                      {perf.roundLabel || 'This round'}
                    </span>
                    <span style={performanceValueStyle}>
                      {Number(perf.roundVotes ?? 0).toLocaleString()}
                    </span>
                  </div>
                  <div style={{ ...performanceRowStyle, marginBottom: 0 }}>
                    <Trophy size={14} color={colors.gold.primary} />
                    <span style={performanceLabelStyle}>Current rank</span>
                    <span style={performanceValueStyle}>
                      {perf.rank ? `#${perf.rank}` : '—'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

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

            {onPerformance && (
              <button
                onClick={() => handleMenuClick(onPerformance)}
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
                <TrendingUp size={16} />
                Performance
              </button>
            )}

            {onRewards && (
              <button
                onClick={() => handleMenuClick(onRewards)}
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
                <Gift size={16} />
                Rewards
              </button>
            )}

            {onAccountSettings && (
              <button
                onClick={() => handleMenuClick(onAccountSettings)}
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
                <Settings size={16} />
                Account Settings
              </button>
            )}

            {onHowToCompete && (
              <button
                onClick={() => handleMenuClick(onHowToCompete)}
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
                <Lightbulb size={16} />
                How to Win
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

            {isJudge && onJudge && (
              <button
                onClick={() => handleMenuClick(onJudge)}
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
                <Gavel size={16} />
                Judge Dashboard
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
