import React from 'react';
import { Award, Calendar, FileText, Trophy, Building, Crown, Check, Star, Instagram, Linkedin, Twitter, User, UserPlus, Vote, Clock } from 'lucide-react';
import { Avatar, Badge } from '../../../components/ui';
import { colors, spacing, borderRadius, typography, gradients } from '../../../styles/theme';
import { formatEventDateRange } from '../../../utils/formatters';

export default function AboutTab({ judges, sponsors, events, host, city = 'New York', competition, onViewProfile }) {
  const platinumSponsor = sponsors.find((s) => s.tier === 'Platinum');
  const otherSponsors = sponsors.filter((s) => s.tier !== 'Platinum');
  const publicEvents = events.filter((e) => e.publicVisible !== false);

  // Helper to format dates for display
  const formatKeyDate = (dateStr) => {
    if (!dateStr) return null;
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return null;
    }
  };

  // Helper to get date status
  const getDateStatus = (startDate, endDate) => {
    if (!startDate) return null;
    const now = new Date();
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : null;

    if (now < start) return 'upcoming';
    if (end && now > end) return 'ended';
    if (!end && now > start) return 'ended';
    return 'active';
  };

  // Check if we have any timeline data
  const hasTimelineData = competition && (
    competition.nomination_start ||
    competition.voting_start ||
    competition.finals_date
  );

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: spacing.xxxl }}>
        <h1 style={{ fontSize: typography.fontSize.hero, fontWeight: typography.fontWeight.bold, marginBottom: spacing.md }}>
          About Most Eligible {city}
        </h1>
        <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.lg, maxWidth: '600px', margin: '0 auto' }}>
          The premier competition celebrating {city}'s most outstanding singles
        </p>
      </div>

      {/* Host Section */}
      {host && (
        <div style={{ marginBottom: spacing.xxxl }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md, marginBottom: spacing.xxl }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(139,92,246,0.1))',
                borderRadius: borderRadius.lg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Crown size={24} style={{ color: '#8b5cf6' }} />
            </div>
            <h2 style={{ fontSize: typography.fontSize.xxxl, fontWeight: typography.fontWeight.bold }}>Your Host</h2>
          </div>

          <div
            onClick={() => onViewProfile?.(host, 'host')}
            style={{
              background: 'linear-gradient(135deg, rgba(139,92,246,0.1), rgba(212,175,55,0.05))',
              border: `1px solid rgba(139,92,246,0.3)`,
              borderRadius: borderRadius.xxl,
              padding: spacing.xxl,
              display: 'flex',
              gap: spacing.xxl,
              alignItems: 'center',
              cursor: 'pointer',
              transition: 'all 0.3s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 12px 40px rgba(139,92,246,0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {/* Host Avatar */}
            <div style={{
              width: '140px',
              height: '140px',
              borderRadius: borderRadius.xl,
              background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 8px 32px rgba(139,92,246,0.3)',
              overflow: 'hidden',
            }}>
              {host.avatar ? (
                <img src={host.avatar} alt={host.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: '48px', fontWeight: typography.fontWeight.bold, color: '#fff' }}>
                  {host.name?.charAt(0) || 'H'}
                </span>
              )}
            </div>

            {/* Host Info */}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm }}>
                <h3 style={{ fontSize: typography.fontSize.xxl, fontWeight: typography.fontWeight.bold }}>
                  {host.name}
                </h3>
                <Badge variant="warning" size="sm">HOST</Badge>
              </div>

              {host.title && (
                <p style={{ color: '#8b5cf6', fontSize: typography.fontSize.md, marginBottom: spacing.sm }}>
                  {host.title}
                </p>
              )}

              {host.bio && (
                <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.md, lineHeight: 1.6, marginBottom: spacing.lg, maxWidth: '500px' }}>
                  {host.bio}
                </p>
              )}

              {/* Social Links */}
              <div style={{ display: 'flex', gap: spacing.sm }}>
                {host.instagram && (
                  <a
                    href={`https://instagram.com/${host.instagram.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      padding: spacing.sm,
                      background: 'rgba(255,255,255,0.1)',
                      borderRadius: borderRadius.md,
                      color: colors.text.light,
                      display: 'flex',
                      alignItems: 'center',
                      gap: spacing.xs,
                      textDecoration: 'none',
                      fontSize: typography.fontSize.sm,
                    }}
                  >
                    <Instagram size={16} />
                    <span>{host.instagram}</span>
                  </a>
                )}
                {host.twitter && (
                  <a
                    href={`https://twitter.com/${host.twitter.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      padding: spacing.sm,
                      background: 'rgba(255,255,255,0.1)',
                      borderRadius: borderRadius.md,
                      color: colors.text.light,
                    }}
                  >
                    <Twitter size={16} />
                  </a>
                )}
                {host.linkedin && (
                  <a
                    href={`https://linkedin.com/in/${host.linkedin}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      padding: spacing.sm,
                      background: 'rgba(255,255,255,0.1)',
                      borderRadius: borderRadius.md,
                      color: colors.text.light,
                    }}
                  >
                    <Linkedin size={16} />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Key Dates & Timeline Section */}
      {(hasTimelineData || publicEvents.length > 0) && (
        <div style={{ marginBottom: spacing.xxxl }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md, marginBottom: spacing.xxl }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                background: 'rgba(59,130,246,0.15)',
                borderRadius: borderRadius.lg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Clock size={24} style={{ color: '#3b82f6' }} />
            </div>
            <h2 style={{ fontSize: typography.fontSize.xxxl, fontWeight: typography.fontWeight.bold }}>Key Dates & Events</h2>
          </div>

          {/* Phase Cards */}
          {hasTimelineData && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: spacing.xl,
              marginBottom: spacing.xxl,
            }}>
              {/* Nomination Period */}
              {competition.nomination_start && (
                <div style={{
                  background: 'linear-gradient(135deg, rgba(212,175,55,0.1), rgba(212,175,55,0.02))',
                  border: '1px solid rgba(212,175,55,0.2)',
                  borderRadius: borderRadius.xxl,
                  padding: spacing.xxl,
                  position: 'relative',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    width: '100px',
                    height: '100px',
                    background: 'radial-gradient(circle at top right, rgba(212,175,55,0.15), transparent)',
                    borderRadius: '0 0 0 100%',
                  }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      background: 'rgba(212,175,55,0.2)',
                      borderRadius: borderRadius.lg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <UserPlus size={24} style={{ color: '#d4af37' }} />
                    </div>
                    <div>
                      <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, textTransform: 'uppercase', letterSpacing: '1px' }}>
                        Nominations
                      </p>
                      <p style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: '#d4af37' }}>
                        {(() => {
                          const status = getDateStatus(competition.nomination_start, competition.nomination_end);
                          if (status === 'active') return 'Open Now';
                          if (status === 'upcoming') return 'Coming Soon';
                          return 'Closed';
                        })()}
                      </p>
                    </div>
                  </div>
                  <div style={{ fontSize: typography.fontSize.md, color: colors.text.secondary, lineHeight: 1.6 }}>
                    <p><strong style={{ color: '#fff' }}>Opens:</strong> {formatKeyDate(competition.nomination_start)}</p>
                    {competition.nomination_end && (
                      <p><strong style={{ color: '#fff' }}>Closes:</strong> {formatKeyDate(competition.nomination_end)}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Voting Period */}
              {competition.voting_start && (
                <div style={{
                  background: 'linear-gradient(135deg, rgba(139,92,246,0.1), rgba(139,92,246,0.02))',
                  border: '1px solid rgba(139,92,246,0.2)',
                  borderRadius: borderRadius.xxl,
                  padding: spacing.xxl,
                  position: 'relative',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    width: '100px',
                    height: '100px',
                    background: 'radial-gradient(circle at top right, rgba(139,92,246,0.15), transparent)',
                    borderRadius: '0 0 0 100%',
                  }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      background: 'rgba(139,92,246,0.2)',
                      borderRadius: borderRadius.lg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <Vote size={24} style={{ color: '#8b5cf6' }} />
                    </div>
                    <div>
                      <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, textTransform: 'uppercase', letterSpacing: '1px' }}>
                        Public Voting
                      </p>
                      <p style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: '#8b5cf6' }}>
                        {(() => {
                          const status = getDateStatus(competition.voting_start, competition.voting_end);
                          if (status === 'active') return 'Live Now';
                          if (status === 'upcoming') return 'Coming Soon';
                          return 'Closed';
                        })()}
                      </p>
                    </div>
                  </div>
                  <div style={{ fontSize: typography.fontSize.md, color: colors.text.secondary, lineHeight: 1.6 }}>
                    <p><strong style={{ color: '#fff' }}>Opens:</strong> {formatKeyDate(competition.voting_start)}</p>
                    {competition.voting_end && (
                      <p><strong style={{ color: '#fff' }}>Closes:</strong> {formatKeyDate(competition.voting_end)}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Finals Date */}
              {competition.finals_date && (
                <div style={{
                  background: 'linear-gradient(135deg, rgba(34,197,94,0.1), rgba(34,197,94,0.02))',
                  border: '1px solid rgba(34,197,94,0.2)',
                  borderRadius: borderRadius.xxl,
                  padding: spacing.xxl,
                  position: 'relative',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    width: '100px',
                    height: '100px',
                    background: 'radial-gradient(circle at top right, rgba(34,197,94,0.15), transparent)',
                    borderRadius: '0 0 0 100%',
                  }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      background: 'rgba(34,197,94,0.2)',
                      borderRadius: borderRadius.lg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <Trophy size={24} style={{ color: '#22c55e' }} />
                    </div>
                    <div>
                      <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, textTransform: 'uppercase', letterSpacing: '1px' }}>
                        Finals & Award Ceremony
                      </p>
                      <p style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: '#22c55e' }}>
                        {new Date() >= new Date(competition.finals_date) ? 'Completed' : 'Mark Your Calendar'}
                      </p>
                    </div>
                  </div>
                  <div style={{ fontSize: typography.fontSize.md, color: colors.text.secondary, lineHeight: 1.6 }}>
                    <p><strong style={{ color: '#fff' }}>Date:</strong> {formatKeyDate(competition.finals_date)}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Events Timeline */}
          {publicEvents.length > 0 && (
            <div style={{ background: colors.background.card, border: `1px solid ${colors.border.light}`, borderRadius: borderRadius.xxl, padding: spacing.xxxl }}>
              <h3 style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.semibold, marginBottom: spacing.xl, color: colors.text.primary }}>
                <Calendar size={20} style={{ display: 'inline', marginRight: spacing.sm, verticalAlign: 'middle' }} />
                Upcoming Events
              </h3>
              {publicEvents.map((event, i, arr) => (
                <div
                  key={event.id}
                  style={{
                    display: 'flex',
                    gap: spacing.xl,
                    position: 'relative',
                    paddingBottom: i < arr.length - 1 ? spacing.xxxl : '0',
                  }}
                >
                  {i < arr.length - 1 && (
                    <div
                      style={{
                        position: 'absolute',
                        left: '19px',
                        top: '40px',
                        width: '2px',
                        height: 'calc(100% - 20px)',
                        background: event.status === 'completed' ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.1)',
                      }}
                    />
                  )}
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: borderRadius.full,
                      background:
                        event.status === 'completed'
                          ? 'rgba(34,197,94,0.2)'
                          : event.status === 'active'
                            ? 'rgba(212,175,55,0.2)'
                            : 'rgba(255,255,255,0.05)',
                      border: `2px solid ${
                        event.status === 'completed'
                          ? colors.status.success
                          : event.status === 'active'
                            ? colors.gold.primary
                            : 'rgba(255,255,255,0.2)'
                      }`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      boxShadow: event.status === 'active' ? '0 0 20px rgba(212,175,55,0.3)' : 'none',
                    }}
                  >
                    {event.status === 'completed' && <Check size={18} style={{ color: colors.status.success }} />}
                    {event.status === 'active' && (
                      <div style={{ width: '12px', height: '12px', borderRadius: borderRadius.full, background: colors.gold.primary }} />
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ color: event.status === 'active' ? colors.gold.primary : colors.text.secondary, fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semibold, marginBottom: spacing.xs }}>
                      {formatEventDateRange(event)}
                      {event.time && ` at ${event.time}`}
                    </p>
                    <h4 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, marginBottom: spacing.xs }}>
                      {event.name}
                    </h4>
                    {event.location && <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.md }}>{event.location}</p>}
                  </div>
                  <Badge
                    variant={event.status === 'completed' ? 'success' : event.status === 'active' ? 'gold' : 'default'}
                    size="md"
                    uppercase
                    style={{ alignSelf: 'flex-start' }}
                  >
                    {event.status === 'completed' ? 'COMPLETED' : event.status === 'active' ? 'LIVE NOW' : 'UPCOMING'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Judges Section */}
      <div style={{ marginBottom: spacing.xxxl }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md, marginBottom: spacing.xxl }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              background: 'rgba(212,175,55,0.15)',
              borderRadius: borderRadius.lg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Award size={24} style={{ color: colors.gold.primary }} />
          </div>
          <h2 style={{ fontSize: typography.fontSize.xxxl, fontWeight: typography.fontWeight.bold }}>Meet the Judges</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: spacing.xxl }}>
          {judges.map((judge) => (
            <div
              key={judge.id}
              onClick={() => onViewProfile?.(judge, 'judge')}
              style={{
                background: colors.background.card,
                border: `1px solid ${colors.border.light}`,
                borderRadius: borderRadius.xxl,
                padding: spacing.xxl,
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.3s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(212,175,55,0.2)';
                e.currentTarget.style.borderColor = 'rgba(212,175,55,0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.borderColor = colors.border.light;
              }}
            >
              <Avatar name={judge.name} src={judge.avatarUrl || judge.avatar_url} size={100} style={{ margin: '0 auto 16px' }} />
              <h3 style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.semibold, marginBottom: spacing.xs }}>
                {judge.name}
              </h3>
              <p style={{ color: colors.gold.primary, fontSize: typography.fontSize.base, marginBottom: spacing.md }}>
                {judge.title}
              </p>
              <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.md, lineHeight: '1.5' }}>
                {judge.bio}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Sponsors Section */}
      <div style={{ marginBottom: spacing.xxxl }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md, marginBottom: spacing.xxl }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              background: 'rgba(200,200,200,0.15)',
              borderRadius: borderRadius.lg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Building size={24} style={{ color: colors.tier.platinum }} />
          </div>
          <h2 style={{ fontSize: typography.fontSize.xxxl, fontWeight: typography.fontWeight.bold }}>Our Sponsors</h2>
        </div>

        {platinumSponsor && (
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(200,200,200,0.1), rgba(200,200,200,0.02))',
              border: '1px solid rgba(200,200,200,0.2)',
              borderRadius: borderRadius.xxl,
              padding: spacing.xxxl,
              marginBottom: spacing.xl,
              textAlign: 'center',
            }}
          >
            <p style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary, textTransform: 'uppercase', letterSpacing: '2px', marginBottom: spacing.md }}>
              Presenting Sponsor
            </p>
            <h3 style={{ fontSize: typography.fontSize.hero, fontWeight: typography.fontWeight.bold, color: colors.tier.platinum, marginBottom: spacing.sm }}>
              {platinumSponsor.name}
            </h3>
            <div style={{ width: '60px', height: '3px', background: 'linear-gradient(90deg, transparent, #e0e0e0, transparent)', margin: '0 auto' }} />
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: spacing.lg }}>
          {otherSponsors.map((sponsor) => (
            <div
              key={sponsor.id}
              style={{
                background: colors.background.card,
                border: `1px solid ${sponsor.tier === 'Gold' ? 'rgba(212,175,55,0.2)' : 'rgba(139,92,246,0.2)'}`,
                borderRadius: borderRadius.xl,
                padding: spacing.xxl,
                textAlign: 'center',
              }}
            >
              <span
                style={{
                  fontSize: typography.fontSize.xs,
                  fontWeight: typography.fontWeight.semibold,
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  color: sponsor.tier === 'Gold' ? colors.tier.gold : colors.tier.silver,
                }}
              >
                {sponsor.tier} Sponsor
              </span>
              <h4 style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.semibold, marginTop: spacing.sm, color: '#fff' }}>
                {sponsor.name}
              </h4>
            </div>
          ))}
        </div>
      </div>

      {/* Advance to USA Section */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(212,175,55,0.15), rgba(139,92,246,0.1), rgba(212,175,55,0.1))',
          border: `2px solid ${colors.border.gold}`,
          borderRadius: borderRadius.xxl,
          padding: spacing.xxxl,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: '80px',
            height: '80px',
            background: gradients.gold,
            borderRadius: borderRadius.xxl,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
            boxShadow: '0 8px 32px rgba(212,175,55,0.3)',
          }}
        >
          <Trophy size={40} style={{ color: '#0a0a0f' }} />
        </div>
        <h2 style={{ fontSize: typography.fontSize.display, fontWeight: typography.fontWeight.bold, marginBottom: spacing.md }}>
          Advance to Most Eligible USA
        </h2>
        <p style={{ color: colors.text.light, fontSize: typography.fontSize.lg, maxWidth: '600px', margin: '0 auto 24px', lineHeight: '1.6' }}>
          The <span style={{ color: colors.gold.primary, fontWeight: typography.fontWeight.semibold }}>Top 5 finalists</span> from New York Most Eligible will automatically qualify to compete in the national <span style={{ color: colors.gold.primary, fontWeight: typography.fontWeight.semibold }}>Most Eligible USA</span> competition for the <span style={{ color: colors.gold.primary, fontWeight: typography.fontWeight.semibold }}>$100,000 grand prize</span>.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: spacing.lg, flexWrap: 'wrap' }}>
          {['New York', 'Los Angeles', 'Miami', 'Chicago', 'Houston'].map((cityName, i) => (
            <span
              key={cityName}
              style={{
                padding: `${spacing.md} ${spacing.xl}`,
                background: i === 0 ? 'rgba(212,175,55,0.2)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${i === 0 ? 'rgba(212,175,55,0.4)' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: borderRadius.pill,
                fontSize: typography.fontSize.md,
                color: i === 0 ? colors.gold.primary : colors.text.secondary,
              }}
            >
              {cityName}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
