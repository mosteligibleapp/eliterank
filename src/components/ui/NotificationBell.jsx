import React, { useRef, useEffect } from 'react';
import { Bell, Check, ChevronRight } from 'lucide-react';
import { useNotifications, getNotificationMeta } from '../../contexts/NotificationContext';
import { colors, spacing, borderRadius, typography, shadows, transitions } from '../../styles/theme';
import { formatRelativeTime } from '../../utils/formatters';

function NotificationItem({ notification, onRead, onNavigate }) {
  const meta = getNotificationMeta(notification.type);
  const isUnread = !notification.read_at;

  const handleClick = () => {
    if (isUnread) onRead(notification.id);
    if (notification.action_url && onNavigate) {
      onNavigate(notification.action_url);
    }
  };

  return (
    <button
      onClick={handleClick}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: spacing.sm,
        width: '100%',
        padding: `${spacing.sm} ${spacing.md}`,
        background: isUnread ? 'rgba(212, 175, 55, 0.05)' : 'transparent',
        border: 'none',
        borderBottom: `1px solid ${colors.border.lighter}`,
        cursor: 'pointer',
        textAlign: 'left',
        transition: `background ${transitions.fast}`,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = colors.background.cardHover; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = isUnread ? 'rgba(212, 175, 55, 0.05)' : 'transparent'; }}
    >
      {/* Icon */}
      <div style={{
        width: '36px',
        height: '36px',
        borderRadius: borderRadius.full,
        background: colors.background.elevated,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '16px',
        flexShrink: 0,
      }}>
        {meta.emoji}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: typography.fontSize.sm,
          fontWeight: isUnread ? typography.fontWeight.semibold : typography.fontWeight.normal,
          color: colors.text.primary,
          lineHeight: 1.4,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {notification.title}
        </div>
        <div style={{
          fontSize: '12px',
          color: colors.text.secondary,
          lineHeight: 1.3,
          marginTop: '2px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {notification.body}
        </div>
        <div style={{
          fontSize: '11px',
          color: colors.text.tertiary,
          marginTop: '4px',
        }}>
          {formatRelativeTime(notification.created_at)}
        </div>
      </div>

      {/* Unread indicator */}
      {isUnread && (
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: borderRadius.full,
          background: colors.gold.primary,
          flexShrink: 0,
          marginTop: '6px',
        }} />
      )}
    </button>
  );
}

export default function NotificationBell({ size = 36, onNavigate }) {
  const { notifications, unreadCount, isOpen, loading, togglePanel, closePanel, markAsRead, markAllAsRead } = useNotifications();
  const panelRef = useRef(null);
  const bellRef = useRef(null);

  // Close panel on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target) &&
        bellRef.current && !bellRef.current.contains(e.target)
      ) {
        closePanel();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, closePanel]);

  return (
    <div style={{ position: 'relative' }}>
      {/* Bell Button */}
      <button
        ref={bellRef}
        onClick={togglePanel}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: borderRadius.full,
          background: isOpen ? colors.gold.muted : 'rgba(255, 255, 255, 0.1)',
          border: `1px solid ${isOpen ? colors.gold.primary : colors.border.secondary}`,
          cursor: 'pointer',
          transition: `all ${transitions.fast}`,
          padding: 0,
          position: 'relative',
        }}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <Bell size={size * 0.45} color={isOpen ? colors.gold.primary : colors.text.secondary} />
      </button>

      {/* Unread badge */}
      {unreadCount > 0 && (
        <div style={{
          position: 'absolute',
          top: '-4px',
          right: '-4px',
          minWidth: '18px',
          height: '18px',
          background: colors.status.error,
          borderRadius: borderRadius.full,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '10px',
          fontWeight: typography.fontWeight.bold,
          color: '#fff',
          padding: '0 4px',
          border: `2px solid ${colors.background.primary}`,
          pointerEvents: 'none',
        }}>
          {unreadCount > 99 ? '99+' : unreadCount}
        </div>
      )}

      {/* Notification Panel Dropdown */}
      {isOpen && (
        <div
          ref={panelRef}
          style={{
            position: 'absolute',
            top: `${size + 8}px`,
            right: 0,
            width: '340px',
            maxHeight: '420px',
            background: colors.background.secondary,
            border: `1px solid ${colors.border.secondary}`,
            borderRadius: borderRadius.lg,
            boxShadow: shadows.xl,
            zIndex: 9999,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: `${spacing.sm} ${spacing.md}`,
            borderBottom: `1px solid ${colors.border.lighter}`,
          }}>
            <span style={{
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.semibold,
              color: colors.text.primary,
            }}>
              Notifications
            </span>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '12px',
                  color: colors.gold.primary,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: `${spacing.xs} ${spacing.sm}`,
                  borderRadius: borderRadius.sm,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = colors.gold.muted; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
              >
                <Check size={12} />
                Mark all read
              </button>
            )}
          </div>

          {/* Notification List */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
          }}>
            {loading && notifications.length === 0 ? (
              <div style={{
                padding: spacing.xl,
                textAlign: 'center',
                color: colors.text.tertiary,
                fontSize: typography.fontSize.sm,
              }}>
                Loading...
              </div>
            ) : notifications.length === 0 ? (
              <div style={{
                padding: spacing.xl,
                textAlign: 'center',
                color: colors.text.tertiary,
                fontSize: typography.fontSize.sm,
              }}>
                <Bell size={32} color={colors.text.muted} style={{ marginBottom: spacing.sm }} />
                <div>No notifications yet</div>
              </div>
            ) : (
              notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onRead={markAsRead}
                  onNavigate={(url) => {
                    closePanel();
                    if (onNavigate) onNavigate(url);
                  }}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
