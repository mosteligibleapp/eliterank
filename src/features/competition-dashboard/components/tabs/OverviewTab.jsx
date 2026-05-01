import React, { useEffect, useMemo, useState } from 'react';
import { Eye, Users, UserPlus, Star, Plus, Crown, Calendar, DollarSign, FileText, Pin, Edit, Trash2, Download, Loader, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { colors, spacing, borderRadius, typography } from '../../../../styles/theme';
import { useResponsive } from '../../../../hooks/useResponsive';
import { Button, Panel, Avatar, Badge } from '../../../../components/ui';
import { formatNumber, formatCurrency, formatRelativeTime, daysUntil, formatDate } from '../../../../utils/formatters';
import { generateAchievementCard } from '../../../achievement-cards/generateAchievementCard';
import { generateRankingsCarousel } from '../../../achievement-cards/generateRankingsCarousel';
import { supabase } from '../../../../lib/supabase';
import { isLive } from '../../../../utils/competitionPhase';
import TimelineCard from '../../../overview/components/TimelineCard';
import MetricCard from '../../../overview/components/MetricCard';

/**
 * OverviewTab - Host Dashboard with performance metrics and quick actions
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
  const navigate = useNavigate();
  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [announcementForm, setAnnouncementForm] = useState({ title: '', content: '' });
  const [generatingCardId, setGeneratingCardId] = useState(null);
  const [generatingRankings, setGeneratingRankings] = useState(false);
  const [activeRound, setActiveRound] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const loadActiveRound = async () => {
      if (!supabase || !competition?.id) return;
      const { data } = await supabase
        .from('voting_rounds')
        .select('id, title, round_order, start_date, end_date')
        .eq('competition_id', competition.id)
        .order('round_order');
      if (cancelled || !data?.length) return;
      const now = Date.now();
      const current = data.find((r) => {
        const start = r.start_date ? new Date(r.start_date).getTime() : null;
        const end = r.end_date ? new Date(r.end_date).getTime() : null;
        return start && end && start <= now && now <= end;
      });
      setActiveRound(current || data[data.length - 1]);
    };
    loadActiveRound();
    return () => { cancelled = true; };
  }, [competition?.id]);

  const handleViewProfile = (profileId) => {
    if (!profileId) return;
    navigate(`/profile/${profileId}`);
  };

  const handleDownloadRankings = async () => {
    if (generatingRankings || rankedContestants.length === 0) return;
    setGeneratingRankings(true);
    try {
      const slides = await generateRankingsCarousel({
        contestants: rankedContestants,
        competitionSlug: competition?.slug || competition?.name,
        cityName: competition?.city,
        season: competition?.season,
        roundTitle: activeRound?.title,
      });
      if (!slides.length) return;

      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      slides.forEach(({ filename, blob }) => zip.file(filename, blob));
      const zipBlob = await zip.generateAsync({ type: 'blob' });

      const slug = (competition?.slug || competition?.name || 'competition')
        .toString()
        .toLowerCase()
        .replace(/\s+/g, '-');
      const roundSlug = activeRound?.title
        ? `-${activeRound.title.toLowerCase().replace(/\s+/g, '-')}`
        : '';

      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${slug}${roundSlug}-standings.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Rankings carousel generation failed:', err);
    } finally {
      setGeneratingRankings(false);
    }
  };

  const handleDownloadCard = async (person) => {
    setGeneratingCardId(person.id);
    try {
      const blob = await generateAchievementCard({
        achievementType: 'contestant',
        name: person.name,
        photoUrl: person.avatarUrl,
        handle: person.instagram,
        competitionName: competition?.name || `Most Eligible ${competition?.city}`,
        cityName: competition?.city,
        season: competition?.season?.toString(),
        organizationName: competition?.organizationName || 'Most Eligible',
        organizationLogoUrl: competition?.organizationLogoUrl,
        accentColor: competition?.themePrimary || '#d4af37',
        voteUrl: competition?.slug ? `mosteligible.co/${competition.slug}` : 'mosteligible.co',
        votingStartDate: competition?.votingStart,
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${person.name.replace(/\s+/g, '-').toLowerCase()}-card.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Card generation failed:', err);
    } finally {
      setGeneratingCardId(null);
    }
  };

  const rankedContestants = useMemo(() => {
    return [...(contestants || [])].sort((a, b) => (b.votes || 0) - (a.votes || 0));
  }, [contestants]);

  const topContestants = rankedContestants.slice(0, 5);
  // Separate completed vs incomplete self-nominations
  const completedNominees = (nominees || []).filter(n =>
    !(n.nominatedBy === 'self' && !n.claimedAt)
  );
  const incompleteCount = (nominees || []).filter(n =>
    n.nominatedBy === 'self' && !n.claimedAt &&
    (n.status === 'pending' || n.status === 'awaiting_profile')
  ).length;
  const pendingNominees = completedNominees.filter(n => n.status === 'pending').length;
  const totalNominees = (nominees || []).length;

  const upcomingEvents = useMemo(() => {
    // Use string comparison to avoid timezone issues
    const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD format in local time
    return (events || [])
      .filter(e => e.date >= todayStr)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 3);
  }, [events]);

  const sponsorRevenue = (sponsors || []).reduce((sum, s) => sum + (s.amount || 0), 0);
  const totalRevenue = sponsorRevenue;

  const sortedAnnouncements = useMemo(() => {
    return [...(announcements || [])].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.publishedAt) - new Date(a.publishedAt);
    }).slice(0, 3);
  }, [announcements]);

  const authorName = isSuperAdmin ? 'EliteRank' : (host?.name || 'Host');
  const authorAvatar = isSuperAdmin ? null : host?.avatar;

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

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
      gap: isMobile ? spacing.lg : spacing.xl,
      alignItems: 'start',
    }}>
      {/* Left Column */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? spacing.lg : spacing.xl }}>
        <TimelineCard competition={competition} events={events} />

        {/* Key Metrics */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: isMobile ? spacing.sm : spacing.md,
        }}>
          <MetricCard
            icon={UserPlus}
            label="Nominations"
            value={totalNominees}
            goal={300}
            goalLabel={[pendingNominees > 0 && `${pendingNominees} pending`, incompleteCount > 0 && `${incompleteCount} incomplete`].filter(Boolean).join(', ') || null}
            variant="default"
            cta="People →"
            onCtaClick={() => onNavigateToTab?.('people')}
          />
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
          style={{ marginBottom: 0 }}
          action={<Button size="sm" icon={Plus} onClick={() => onOpenEventModal?.(null)}>Add Event</Button>}
          collapsible
        >
          <div style={{ padding: isMobile ? spacing.md : spacing.xl }}>
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
                <Button size="sm" icon={Plus} onClick={() => onOpenEventModal?.(null)}>Add Event</Button>
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
                        border: '1px solid rgba(255,255,255,0.04)',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      <div style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: borderRadius.lg,
                        background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(139,92,246,0.08))',
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

      {/* Right Column */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? spacing.lg : spacing.xl }}>
        {/* Revenue Card */}
        <div style={{
          padding: isMobile ? spacing.md : spacing.xl,
          borderRadius: borderRadius.xl,
          background: 'linear-gradient(135deg, rgba(34,197,94,0.12) 0%, rgba(34,197,94,0.04) 60%, rgba(6,182,212,0.06) 100%)',
          border: '1px solid rgba(34,197,94,0.25)',
          boxShadow: totalRevenue > 0 ? '0 4px 24px rgba(34,197,94,0.12)' : 'none',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Decorative glow */}
          <div style={{
            position: 'absolute',
            top: '-40px',
            right: '-40px',
            width: '120px',
            height: '120px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(34,197,94,0.12) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md, position: 'relative' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: borderRadius.md,
              background: 'rgba(34,197,94,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <DollarSign size={16} style={{ color: '#4ade80' }} />
            </div>
            <span style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Total Revenue
            </span>
          </div>
          <p style={{
            fontSize: isMobile ? typography.fontSize['3xl'] : typography.fontSize['5xl'],
            fontWeight: typography.fontWeight.bold,
            color: '#fff',
            marginBottom: spacing.md,
            letterSpacing: '-0.02em',
            position: 'relative',
          }}>
            {formatCurrency(totalRevenue)}
          </p>
          {totalRevenue > 0 ? (
            <p style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary, position: 'relative' }}>
              Sponsors {formatCurrency(sponsorRevenue)}
            </p>
          ) : (
            <p style={{ color: colors.text.muted, fontSize: typography.fontSize.sm, position: 'relative' }}>
              Revenue from votes, sponsors, and events will appear here
            </p>
          )}
        </div>

        {/* Top Contestants */}
        <Panel
          title="Top Contestants"
          icon={Crown}
          style={{ marginBottom: 0 }}
          action={
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
              <button
                onClick={handleDownloadRankings}
                disabled={generatingRankings || rankedContestants.length === 0}
                title="Download standings carousel (6 slides, 1080×1350) as zip"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: spacing.xs,
                  padding: `${spacing.xs} ${spacing.sm}`,
                  background: 'rgba(212,175,55,0.1)',
                  border: `1px solid ${colors.border.gold}`,
                  borderRadius: borderRadius.md,
                  color: colors.gold.primary,
                  fontSize: typography.fontSize.xs,
                  fontWeight: typography.fontWeight.medium,
                  cursor: generatingRankings || rankedContestants.length === 0 ? 'not-allowed' : 'pointer',
                  opacity: rankedContestants.length === 0 ? 0.5 : 1,
                }}
              >
                {generatingRankings ? (
                  <Loader size={12} style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  <Download size={12} />
                )}
                {generatingRankings ? 'Generating…' : 'Carousel'}
              </button>
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
            </div>
          }
          collapsible
        >
          <div style={{ padding: isMobile ? spacing.md : spacing.xl }}>
            {topContestants.length === 0 ? (
              <div style={{ textAlign: 'center', padding: spacing.xl, color: colors.text.secondary }}>
                <Users size={48} style={{ marginBottom: spacing.md, opacity: 0.5 }} />
                <p style={{ fontSize: typography.fontSize.sm }}>
                  {isLive(competition?.status) ? 'Rankings appear when voting begins' : 'No contestants yet'}
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
                {topContestants.map((contestant, index) => {
                  const rankColors = [
                    { bg: 'rgba(212,175,55,0.12)', border: 'rgba(212,175,55,0.25)', text: colors.gold.primary, rowBg: 'rgba(212,175,55,0.06)' },
                    { bg: 'rgba(192,192,210,0.12)', border: 'rgba(192,192,210,0.25)', text: '#c0c0d2', rowBg: 'rgba(192,192,210,0.04)' },
                    { bg: 'rgba(205,127,50,0.12)', border: 'rgba(205,127,50,0.25)', text: '#cd7f32', rowBg: 'rgba(205,127,50,0.04)' },
                  ];
                  const rankStyle = index < 3 ? rankColors[index] : null;
                  return (
                  <div
                    key={contestant.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: spacing.md,
                      padding: `${spacing.sm} ${spacing.md}`,
                      background: rankStyle ? rankStyle.rowBg : 'transparent',
                      borderRadius: borderRadius.lg,
                      transition: 'background 0.15s ease',
                    }}
                  >
                    <div style={{
                      width: '30px',
                      height: '30px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: typography.fontWeight.bold,
                      fontSize: typography.fontSize.sm,
                      color: rankStyle ? rankStyle.text : colors.text.muted,
                      background: rankStyle ? rankStyle.bg : 'transparent',
                      border: rankStyle ? `1px solid ${rankStyle.border}` : 'none',
                      borderRadius: borderRadius.md,
                    }}>
                      {index === 0 ? <Crown size={14} style={{ color: colors.gold.primary }} /> : index + 1}
                    </div>
                    <Avatar name={contestant.name} size={36} src={contestant.avatarUrl} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {contestant.userId ? (
                        <button
                          onClick={() => handleViewProfile(contestant.userId)}
                          style={{
                            fontWeight: typography.fontWeight.medium,
                            display: 'flex',
                            alignItems: 'center',
                            gap: spacing.xs,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            background: 'none',
                            border: 'none',
                            color: '#fff',
                            cursor: 'pointer',
                            padding: 0,
                            fontSize: 'inherit',
                          }}
                        >
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {contestant.name}
                          </span>
                          <ExternalLink size={10} style={{ opacity: 0.4, flexShrink: 0 }} />
                        </button>
                      ) : (
                        <span style={{
                          fontWeight: typography.fontWeight.medium,
                          display: 'block',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {contestant.name}
                        </span>
                      )}
                    </div>
                    <span style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm }}>
                      {formatNumber(contestant.votes || 0)} votes
                    </span>
                    <button
                      onClick={() => handleDownloadCard(contestant)}
                      disabled={generatingCardId === contestant.id}
                      title="Download share card"
                      style={{
                        padding: spacing.xs,
                        background: 'rgba(212,175,55,0.1)',
                        border: 'none',
                        borderRadius: borderRadius.sm,
                        cursor: generatingCardId === contestant.id ? 'wait' : 'pointer',
                        color: colors.gold.primary,
                        minWidth: '28px',
                        minHeight: '28px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {generatingCardId === contestant.id ? (
                        <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} />
                      ) : (
                        <Download size={14} />
                      )}
                    </button>
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        </Panel>

        {/* Announcements */}
        <Panel
          title="Announcements"
          icon={FileText}
          style={{ marginBottom: 0 }}
          action={<Button size="sm" icon={Plus} onClick={() => setShowAnnouncementForm(true)}>New Post</Button>}
          collapsible
        >
          <div style={{ padding: isMobile ? spacing.md : spacing.xl }}>
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
                    fontSize: '16px',
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
                    fontSize: '16px',
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

            {sortedAnnouncements.length === 0 ? (
              <div style={{ textAlign: 'center', padding: spacing.xl, color: colors.text.secondary }}>
                <FileText size={48} style={{ marginBottom: spacing.md, opacity: 0.5 }} />
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm }}>
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
                    <div style={{ display: 'flex', gap: spacing.sm, marginTop: spacing.sm, justifyContent: 'flex-end' }}>
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
                        onClick={() => {
                          setEditingAnnouncement(post);
                          setAnnouncementForm({ title: post.title, content: post.content });
                          setShowAnnouncementForm(true);
                        }}
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
              background: 'linear-gradient(135deg, rgba(212,175,55,0.15) 0%, rgba(212,175,55,0.08) 100%)',
              border: `1px solid rgba(212,175,55,0.35)`,
              borderRadius: borderRadius.xl,
              color: colors.gold.primary,
              fontSize: typography.fontSize.md,
              fontWeight: typography.fontWeight.semibold,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 12px rgba(212,175,55,0.1)',
            }}
          >
            <Eye size={18} />
            View Competition
          </button>
        )}
      </div>

      {/* Keyframes for loader animation */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
