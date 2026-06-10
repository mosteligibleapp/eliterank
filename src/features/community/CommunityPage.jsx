import React from 'react';
import { Plus, FileText, Sparkles, Check, MapPin, Edit, Trash2 } from 'lucide-react';
import { Panel, Avatar, Badge, Button } from '../../components/ui';
import { colors, spacing, borderRadius, typography } from '../../styles/theme';
import { formatRelativeTime } from '../../utils/formatters';

const TYPE_CONFIG = {
  announcement: { icon: Sparkles, color: colors.gold.primary, bgColor: 'rgba(212,175,55,0.15)' },
  update: { icon: Check, color: colors.status.success, bgColor: 'rgba(var(--color-success-rgb),0.15)' },
  news: { icon: FileText, color: colors.status.info, bgColor: 'rgba(59,130,246,0.15)' },
};

export default function CommunityPage({
  announcements,
  hostProfile,
  onCreateAnnouncement,
  onEditAnnouncement,
  onDeleteAnnouncement,
  onTogglePin,
}) {
  // Sort: pinned first, then by date
  const sortedAnnouncements = [...announcements].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return new Date(b.date) - new Date(a.date);
  });

  const getTypeConfig = (type) => TYPE_CONFIG[type] || TYPE_CONFIG.announcement;

  return (
    <div>
      {/* Create Post Section */}
      <Panel title="Create Announcement" icon={Plus}>
        <div style={{ padding: spacing.xl }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing.lg,
              padding: spacing.xl,
              background: 'rgba(255,255,255,0.02)',
              borderRadius: borderRadius.xl,
              border: `1px dashed ${colors.border.gold}`,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onClick={onCreateAnnouncement}
          >
            <Avatar name={`${hostProfile.firstName} ${hostProfile.lastName}`} size={44} />
            <div style={{ flex: 1 }}>
              <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.lg }}>
                Share an update with your audience...
              </p>
            </div>
            <Button icon={Plus}>New Post</Button>
          </div>
        </div>
      </Panel>

      {/* Announcements Feed */}
      <Panel
        title="Announcements Feed"
        icon={FileText}
        action={
          <span style={{ color: colors.text.secondary, fontSize: typography.fontSize.md }}>
            {announcements.length} posts
          </span>
        }
      >
        <div style={{ padding: spacing.xl }}>
          {sortedAnnouncements.length > 0 ? (
            sortedAnnouncements.map((post) => {
              const typeConfig = getTypeConfig(post.type);
              const TypeIcon = typeConfig.icon;

              return (
                <div
                  key={post.id}
                  style={{
                    background: post.pinned ? 'rgba(212,175,55,0.05)' : 'rgba(255,255,255,0.02)',
                    border: post.pinned
                      ? `1px solid rgba(212,175,55,0.2)`
                      : `1px solid ${colors.border.lighter}`,
                    borderRadius: borderRadius.xl,
                    padding: spacing.xl,
                    marginBottom: spacing.lg,
                  }}
                >
                  {/* Post Header */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: spacing.md,
                      marginBottom: spacing.md,
                    }}
                  >
                    <Avatar name={`${hostProfile.firstName} ${hostProfile.lastName}`} size={44} />
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: spacing.sm,
                          flexWrap: 'wrap',
                        }}
                      >
                        <span style={{ fontWeight: typography.fontWeight.semibold, fontSize: typography.fontSize.lg }}>
                          {hostProfile.firstName} {hostProfile.lastName}
                        </span>
                        <Badge variant="gold" size="sm" uppercase>
                          HOST
                        </Badge>
                        {post.pinned && (
                          <Badge variant="gold" size="sm" uppercase icon={MapPin}>
                            PINNED
                          </Badge>
                        )}
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: spacing.sm,
                          marginTop: spacing.xs,
                        }}
                      >
                        <span style={{ color: colors.text.secondary, fontSize: typography.fontSize.base }}>
                          {formatRelativeTime(post.date)}
                        </span>
                        <Badge
                          variant={post.type === 'announcement' ? 'gold' : post.type === 'update' ? 'success' : 'info'}
                          size="sm"
                          uppercase
                          icon={TypeIcon}
                        >
                          {post.type}
                        </Badge>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: spacing.sm }}>
                      <button
                        onClick={() => onTogglePin(post.id)}
                        style={{
                          padding: spacing.sm,
                          background: post.pinned ? 'rgba(212,175,55,0.15)' : 'transparent',
                          border: 'none',
                          borderRadius: borderRadius.sm,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        title={post.pinned ? 'Unpin' : 'Pin'}
                      >
                        <MapPin size={14} style={{ color: post.pinned ? colors.gold.primary : colors.text.secondary }} />
                      </button>
                      <button
                        onClick={() => onEditAnnouncement(post)}
                        style={{
                          padding: spacing.sm,
                          background: 'transparent',
                          border: 'none',
                          borderRadius: borderRadius.sm,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: colors.text.secondary,
                        }}
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => onDeleteAnnouncement(post.id)}
                        style={{
                          padding: spacing.sm,
                          background: 'rgba(var(--color-error-rgb),0.15)',
                          border: 'none',
                          borderRadius: borderRadius.sm,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: colors.status.error,
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Post Content */}
                  <div style={{ marginLeft: '58px' }}>
                    <h3
                      style={{
                        fontSize: typography.fontSize.xl,
                        fontWeight: typography.fontWeight.semibold,
                        marginBottom: spacing.sm,
                        color: '#fff',
                      }}
                    >
                      {post.title}
                    </h3>
                    <p style={{ color: colors.text.light, fontSize: typography.fontSize.md, lineHeight: '1.6' }}>
                      {post.content}
                    </p>
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ textAlign: 'center', padding: `${spacing.xxxl} ${spacing.xl}`, color: colors.text.muted }}>
              <FileText size={48} style={{ marginBottom: spacing.lg, opacity: 0.3 }} />
              <p style={{ fontSize: typography.fontSize.lg, marginBottom: spacing.sm }}>No announcements yet</p>
              <p style={{ fontSize: typography.fontSize.md, color: colors.text.secondary }}>
                Create your first post to engage with your audience
              </p>
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
}
