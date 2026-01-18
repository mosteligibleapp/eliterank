import React, { useMemo, useState } from 'react';
import { Eye, Users, UserPlus, Star, Plus, Crown, Calendar, DollarSign, FileText, Pin, Edit, Trash2 } from 'lucide-react';
import { colors, spacing, borderRadius, typography } from '../../../../styles/theme';
import { useResponsive } from '../../../../hooks/useResponsive';
import { Button, Panel, Avatar, Badge } from '../../../../components/ui';
import { formatNumber, formatCurrency, formatRelativeTime, daysUntil, formatDate } from '../../../../utils/formatters';
import TimelineCard from '../../../overview/components/TimelineCard';
import MetricCard from '../../../overview/components/MetricCard';

/**
 * OverviewTab - Host Dashboard with performance metrics and quick actions
 * 2-column layout on desktop, stacked on mobile
 */
export default function OverviewTab({
  competition,
  contestants,
  nominees,
  sponsors,
  events,
  announcements,
  host,
  isSuperAdmin,
  onViewPublicSite,
  onNavigateToTab,
  onOpenSponsorModal,
  onOpenEventModal,
  onAddAnnouncement,
  onUpdateAnnouncement,
  onDeleteAnnouncement,
  onTogglePin,
}) {
  const { isMobile } = useResponsive();
  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [announcementForm, setAnnouncementForm] = useState({ title: '', content: '' });

  // Sort contestants by votes (descending) for ranking
  const rankedContestants = useMemo(() => {
    return [...(contestants || [])].sort((a, b) => (b.votes || 0) - (a.votes || 0));
  }, [contestants]);

  // Top 5 contestants for display
  const topContestants = rankedContestants.slice(0, 5);

  // Count pending nominees
  const pendingNominees = (nominees || []).filter(n => n.status === 'pending').length;
  const totalNominees = (nominees || []).length;

  // Upcoming events (future events only, sorted by date)
  const upcomingEvents = useMemo(() => {
    const now = new Date();
    return (events || [])
      .filter(e => new Date(e.date) >= now)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 3);
  }, [events]);

  // Calculate revenue (placeholder - would need real data)
  const sponsorRevenue = (sponsors || []).reduce((sum, s) => sum + (s.amount || 0), 0);
  const voteRevenue = 0; // TODO: Add vote revenue data
  const eventRevenue = 0; // TODO: Add event revenue data
  const totalRevenue = sponsorRevenue + voteRevenue + eventRevenue;

  // Sorted announcements (pinned first, then by date)
  const sortedAnnouncements = useMemo(() => {
    return [...(announcements || [])].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.publishedAt) - new Date(a.publishedAt);
    }).slice(0, 3); // Show only 3 on dashboard
  }, [announcements]);

  const authorName = isSuperAdmin ? 'EliteRank' : (host?.name || 'Host');
  const authorAvatar = isSuperAdmin ? null : host?.avatar;

  // Announcement handlers
  const handleSubmitAnnouncement = async () => {
    if (!announcementForm.title.trim() || !announcementForm.content.trim()) return;

    if (editingAnnouncement) {
      await onUpdateAnnouncement?.(editingAnnouncement.id, announcementForm);
      setEditingAnnouncement(null);
    } else {
      await onAddAnnouncement?.(announcementForm);
    }
    setAnnouncementForm({ title: '', content: '' });
    setShowAnnouncementForm(false);
  };

  const handleEditAnnouncement = (announcement) => {
    setEditingAnnouncement(announcement);
    setAnnouncementForm({ title: announcement.title, content: announcement.content });
    setShowAnnouncementForm(true);
  };

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
      gap: isMobile ? spacing.lg : spacing.xl,
    }}>
      {/* LEFT COLUMN */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? spacing.lg : spacing.xl }}>
        {/* Timeline Card */}
        <TimelineCard competition={competition} events={events} />

        {/* Key Metrics - 3 cards in a row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: isMobile ? spacing.sm : spacing.md,
        }}>
          {/* Nominations */}
          <MetricCard
            icon={UserPlus}
            label="Nominations"
            value={totalNominees}
            goal={300}
            goalLabel={pendingNominees > 0 ? `${pendingNominees} pending` : null}
            variant="default"
            cta="People →"
            onCtaClick={() => onNavigateToTab?.('people')}
          />

          {/* Contestants */}
          <MetricCard
            icon={Users}
            label="Contestants"
            value={contestants?.length || 0}
            goal={competition?.minContestants || 40}
            warning={contestants?.length < (competition?.minContestants || 40)
              ? `Need ${(competition?.minContestants || 40) - contestants?.length} more`
              : null}
            variant={contestants?.length >= (competition?.minContestants || 40) ? 'success' : 'warning'}
            cta="People →"
            onCtaClick={() => onNavigateToTab?.('people')}
          />

          {/* Sponsors */}
          <MetricCard
            icon={Star}
            label="Sponsors"
            value={sponsors?.length || 0}
            goalLabel={sponsorRevenue > 0 ? formatCurrency(sponsorRevenue) : null}
            variant="gold"
            cta="+ Add"
            onCtaClick={() => onOpenSponsorModal?.(null)}
          />
        </div>

        {/* Upcoming Events */}
        <Panel
          title="Upcoming Events"
          icon={Calendar}
          action={
            <Button size="sm" icon={Plus} onClick={() => onOpenEventModal?.(null)}>
              Add Event
            </Button>
          }
          collapsible
        >
          <div style={{ padding: isMobile ? spacing.md : spacing.lg }}>
            {upcomingEvents.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: spacing.xl,
                background: 'rgba(251,191,36,0.05)',
                borderRadius: borderRadius.lg,
                border: '1px dashed rgba(251,191,36,0.3)',
              }}>
                <Calendar size={32} style={{ color: '#fbbf24', marginBottom: spacing.md, opacity: 0.7 }} />
                <p style={{ color: '#fbbf24', fontSize: typography.fontSize.sm, marginBottom: spacing.md }}>
                  No events scheduled
                </p>
                <Button size="sm" icon={Plus} onClick={() => onOpenEventModal?.(null)}>
                  Add Event
                </Button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
                {upcomingEvents.map(event => {
                  const eventDays = daysUntil(event.date);
                  return (
                    <div
                      key={event.id}
                      style={{
                        padding: spacing.md,
                        background: colors.background.secondary,
                        borderRadius: borderRadius.lg,
                        display: 'flex',
                        alignItems: 'center',
                        gap: spacing.md,
                      }}
                    >
                      <div style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: borderRadius.md,
                        background: 'rgba(139,92,246,0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <Calendar size={20} style={{ color: '#a78bfa' }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{
                          fontWeight: typography.fontWeight.medium,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {event.name}
                        </p>
                        <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted }}>
                          {formatDate(event.date, { weekday: 'short', month: 'short', day: 'numeric' })}
                          {event.time && ` · ${event.time}`}
                        </p>
                      </div>
                      <Badge variant={eventDays <= 3 ? 'error' : eventDays <= 7 ? 'warning' : 'secondary'}>
                        {eventDays === 0 ? 'Today' : eventDays === 1 ? '1 day' : `${eventDays} days`}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Panel>
      </div>

      {/* RIGHT COLUMN */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? spacing.lg : spacing.xl }}>
        {/* Revenue Card */}
        <div style={{
          padding: isMobile ? spacing.md : spacing.xl,
          borderRadius: borderRadius.xl,
          background: 'linear-gradient(135deg, rgba(34,197,94,0.15), rgba(34,197,94,0.05))',
          border: '1px solid rgba(34,197,94,0.3)',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: spacing.sm,
            marginBottom: spacing.sm,
          }}>
            <DollarSign size={18} style={{ color: '#4ade80' }} />
            <span style={{
              color: colors.text.secondary,
              fontSize: typography.fontSize.sm,
              textTransform: 'uppercase',
            }}>
              Total Revenue
            </span>
          </div>
          <p style={{
            fontSize: isMobile ? typography.fontSize.xxl : typography.fontSize.hero,
            fontWeight: typography.fontWeight.bold,
            color: '#fff',
            marginBottom: spacing.md,
          }}>
            {formatCurrency(totalRevenue)}
          </p>
          {totalRevenue > 0 ? (
            <div style={{
              display: 'flex',
              gap: spacing.md,
              fontSize: typography.fontSize.sm,
              color: colors.text.secondary,
              flexWrap: 'wrap',
            }}>
              {sponsorRevenue > 0 && <span>Sponsors {formatCurrency(sponsorRevenue)}</span>}
              {voteRevenue > 0 && <span>· Votes {formatCurrency(voteRevenue)}</span>}
              {eventRevenue > 0 && <span>· Events {formatCurrency(eventRevenue)}</span>}
            </div>
          ) : (
            <p style={{ color: colors.text.muted, fontSize: typography.fontSize.sm }}>
              Revenue from votes, sponsors, and events will appear here
            </p>
          )}
        </div>

        {/* Top Contestants */}
        <Panel
          title="Top Contestants"
          icon={Crown}
          action={
            <button
              onClick={() => onNavigateToTab?.('people')}
              style={{
                background: 'none',
                border: 'none',
                color: colors.gold.primary,
                fontSize: typography.fontSize.sm,
                cursor: 'pointer',
              }}
            >
              View All →
            </button>
          }
          collapsible
        >
          <div style={{ padding: isMobile ? spacing.md : spacing.lg }}>
            {topContestants.length === 0 ? (
              <div style={{ textAlign: 'center', padding: spacing.xl, color: colors.text.secondary }}>
                <Users size={32} style={{ marginBottom: spacing.md, opacity: 0.5 }} />
                <p style={{ fontSize: typography.fontSize.sm }}>
                  {competition?.status === 'live' && competition?.votingStart
                    ? 'Rankings appear when voting begins'
                    : 'No contestants yet'}
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
                {topContestants.map((contestant, index) => (
                  <div
                    key={contestant.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: spacing.md,
                      padding: spacing.sm,
                      background: index < 3 ? 'rgba(212,175,55,0.05)' : 'transparent',
                      borderRadius: borderRadius.md,
                    }}
                  >
                    <div style={{
                      width: '28px',
                      height: '28px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: typography.fontWeight.semibold,
                      color: index === 0 ? colors.gold.primary : colors.text.secondary,
                    }}>
                      {index === 0 ? <Crown size={16} style={{ color: colors.gold.primary }} /> : index + 1}
                    </div>
                    <Avatar name={contestant.name} size={36} src={contestant.avatarUrl} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{
                        fontWeight: typography.fontWeight.medium,
                        display: 'block',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {contestant.name}
                      </span>
                    </div>
                    <span style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm }}>
                      {formatNumber(contestant.votes || 0)} votes
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Panel>

        {/* Announcements */}
        <Panel
          title="Announcements"
          icon={FileText}
          action={
            <Button size="sm" icon={Plus} onClick={() => setShowAnnouncementForm(true)}>
              New Post
            </Button>
          }
          collapsible
        >
          <div style={{ padding: isMobile ? spacing.md : spacing.lg }}>
            {/* Quick Post Form */}
            {showAnnouncementForm && (
              <div style={{
                marginBottom: spacing.lg,
                padding: spacing.md,
                background: colors.background.secondary,
                borderRadius: borderRadius.lg,
              }}>
                <input
                  type="text"
                  placeholder="Announcement title..."
                  value={announcementForm.title}
                  onChange={(e) => setAnnouncementForm(prev => ({ ...prev, title: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: spacing.md,
                    background: colors.background.primary,
                    border: `1px solid ${colors.border.light}`,
                    borderRadius: borderRadius.md,
                    color: '#fff',
                    fontSize: typography.fontSize.md,
                    marginBottom: spacing.sm,
                  }}
                />
                <textarea
                  placeholder="Write your announcement..."
                  value={announcementForm.content}
                  onChange={(e) => setAnnouncementForm(prev => ({ ...prev, content: e.target.value }))}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: spacing.md,
                    background: colors.background.primary,
                    border: `1px solid ${colors.border.light}`,
                    borderRadius: borderRadius.md,
                    color: '#fff',
                    fontSize: typography.fontSize.md,
                    resize: 'vertical',
                    marginBottom: spacing.md,
                  }}
                />
                <div style={{ display: 'flex', gap: spacing.sm, justifyContent: 'flex-end' }}>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setShowAnnouncementForm(false);
                      setEditingAnnouncement(null);
                      setAnnouncementForm({ title: '', content: '' });
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSubmitAnnouncement}
                    disabled={!announcementForm.title.trim() || !announcementForm.content.trim()}
                  >
                    {editingAnnouncement ? 'Update' : 'Post'}
                  </Button>
                </div>
              </div>
            )}

            {/* Announcements List */}
            {sortedAnnouncements.length === 0 ? (
              <div style={{ textAlign: 'center', padding: spacing.xl, color: colors.text.secondary }}>
                <FileText size={32} style={{ marginBottom: spacing.md, opacity: 0.5 }} />
                <p style={{ fontSize: typography.fontSize.sm }}>No announcements yet</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
                {sortedAnnouncements.map(post => (
                  <div
                    key={post.id}
                    style={{
                      padding: spacing.md,
                      background: post.pinned ? 'rgba(212,175,55,0.05)' : colors.background.secondary,
                      borderRadius: borderRadius.lg,
                      border: post.pinned ? `1px solid ${colors.border.gold}` : 'none',
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: spacing.sm,
                      marginBottom: spacing.sm,
                    }}>
                      <Avatar name={authorName} src={authorAvatar} size={28} />
                      <span style={{ fontWeight: typography.fontWeight.medium, fontSize: typography.fontSize.sm }}>
                        {authorName}
                      </span>
                      <span style={{ color: colors.text.muted, fontSize: typography.fontSize.xs }}>
                        · {formatRelativeTime(post.publishedAt)}
                      </span>
                      {post.pinned && <Pin size={12} style={{ color: colors.gold.primary }} />}
                    </div>
                    <h4 style={{
                      fontSize: typography.fontSize.md,
                      fontWeight: typography.fontWeight.semibold,
                      marginBottom: spacing.xs,
                    }}>
                      {post.title}
                    </h4>
                    <p style={{
                      color: colors.text.secondary,
                      fontSize: typography.fontSize.sm,
                      lineHeight: 1.5,
                      overflow: 'hidden',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                    }}>
                      {post.content}
                    </p>
                    {/* Action buttons */}
                    <div style={{
                      display: 'flex',
                      gap: spacing.sm,
                      marginTop: spacing.sm,
                      justifyContent: 'flex-end',
                    }}>
                      <button
                        onClick={() => onTogglePin?.(post.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: post.pinned ? colors.gold.primary : colors.text.muted,
                          cursor: 'pointer',
                          padding: spacing.xs,
                        }}
                      >
                        <Pin size={14} />
                      </button>
                      <button
                        onClick={() => handleEditAnnouncement(post)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: colors.text.muted,
                          cursor: 'pointer',
                          padding: spacing.xs,
                        }}
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => onDeleteAnnouncement?.(post.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: colors.text.muted,
                          cursor: 'pointer',
                          padding: spacing.xs,
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
                {announcements?.length > 3 && (
                  <button
                    onClick={() => onNavigateToTab?.('content')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: colors.gold.primary,
                      fontSize: typography.fontSize.sm,
                      cursor: 'pointer',
                      textAlign: 'center',
                      padding: spacing.sm,
                    }}
                  >
                    View all {announcements.length} announcements →
                  </button>
                )}
              </div>
            )}
          </div>
        </Panel>

        {/* View Competition Button */}
        {onViewPublicSite && (
          <button
            onClick={onViewPublicSite}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: spacing.sm,
              padding: spacing.lg,
              background: 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.1))',
              border: `1px solid ${colors.gold.primary}`,
              borderRadius: borderRadius.xl,
              color: colors.gold.primary,
              fontSize: typography.fontSize.md,
              fontWeight: typography.fontWeight.semibold,
              cursor: 'pointer',
            }}
          >
            <Eye size={18} />
            View Competition
          </button>
        )}
      </div>
    </div>
  );
}
