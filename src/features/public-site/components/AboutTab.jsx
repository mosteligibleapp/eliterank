import React from 'react';
import { Award, Calendar, FileText, Trophy, Building, Crown, Check, Star, ExternalLink } from 'lucide-react';
import { Avatar, Badge } from '../../../components/ui';
import { colors, spacing, borderRadius, typography, gradients } from '../../../styles/theme';
import { formatEventDateRange } from '../../../utils/formatters';

export default function AboutTab({ judges, sponsors, events }) {
  const platinumSponsor = sponsors.find((s) => s.tier === 'Platinum');
  const otherSponsors = sponsors.filter((s) => s.tier !== 'Platinum');
  const publicEvents = events.filter((e) => e.publicVisible !== false);

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: spacing.xxxl }}>
        <h1 style={{ fontSize: typography.fontSize.hero, fontWeight: typography.fontWeight.bold, marginBottom: spacing.md }}>
          About Most Eligible NYC
        </h1>
        <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.lg, maxWidth: '600px', margin: '0 auto' }}>
          The premier competition celebrating New York's most outstanding singles
        </p>
      </div>

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
              style={{
                background: colors.background.card,
                border: `1px solid ${colors.border.light}`,
                borderRadius: borderRadius.xxl,
                padding: spacing.xxl,
                textAlign: 'center',
              }}
            >
              <Avatar name={judge.name} size={100} style={{ margin: '0 auto 16px' }} />
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

      {/* Timeline Section */}
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
            <Calendar size={24} style={{ color: colors.status.info }} />
          </div>
          <h2 style={{ fontSize: typography.fontSize.xxxl, fontWeight: typography.fontWeight.bold }}>Competition Timeline</h2>
        </div>
        <div style={{ background: colors.background.card, border: `1px solid ${colors.border.light}`, borderRadius: borderRadius.xxl, padding: spacing.xxxl }}>
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
          <a
            href={platinumSponsor.websiteUrl || '#'}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'block',
              background: 'linear-gradient(135deg, rgba(200,200,200,0.1), rgba(200,200,200,0.02))',
              border: '1px solid rgba(200,200,200,0.2)',
              borderRadius: borderRadius.xxl,
              padding: spacing.xxxl,
              marginBottom: spacing.xl,
              textAlign: 'center',
              textDecoration: 'none',
              transition: 'all 0.3s',
              cursor: platinumSponsor.websiteUrl ? 'pointer' : 'default',
            }}
          >
            <p style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary, textTransform: 'uppercase', letterSpacing: '2px', marginBottom: spacing.lg }}>
              Presenting Sponsor
            </p>
            {platinumSponsor.logoUrl ? (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  marginBottom: spacing.lg,
                }}
              >
                <div
                  style={{
                    padding: `${spacing.lg} ${spacing.xxxl}`,
                    background: '#fff',
                    borderRadius: borderRadius.lg,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <img
                    src={platinumSponsor.logoUrl}
                    alt={platinumSponsor.name}
                    style={{ maxHeight: '60px', maxWidth: '200px', objectFit: 'contain' }}
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                </div>
              </div>
            ) : (
              <h3 style={{ fontSize: typography.fontSize.hero, fontWeight: typography.fontWeight.bold, color: colors.tier.platinum, marginBottom: spacing.lg }}>
                {platinumSponsor.name}
              </h3>
            )}
            {platinumSponsor.websiteUrl && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, color: colors.text.secondary, fontSize: typography.fontSize.sm }}>
                <ExternalLink size={14} />
                <span>Visit Website</span>
              </div>
            )}
            <div style={{ width: '60px', height: '3px', background: 'linear-gradient(90deg, transparent, #e0e0e0, transparent)', margin: `${spacing.lg} auto 0` }} />
          </a>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: spacing.lg }}>
          {otherSponsors.map((sponsor) => {
            const SponsorWrapper = sponsor.websiteUrl ? 'a' : 'div';
            const wrapperProps = sponsor.websiteUrl ? {
              href: sponsor.websiteUrl,
              target: '_blank',
              rel: 'noopener noreferrer',
            } : {};

            return (
              <SponsorWrapper
                key={sponsor.id}
                {...wrapperProps}
                style={{
                  display: 'block',
                  background: colors.background.card,
                  border: `1px solid ${sponsor.tier === 'Gold' ? 'rgba(212,175,55,0.2)' : 'rgba(139,92,246,0.2)'}`,
                  borderRadius: borderRadius.xl,
                  padding: spacing.xxl,
                  textAlign: 'center',
                  textDecoration: 'none',
                  transition: 'all 0.3s',
                  cursor: sponsor.websiteUrl ? 'pointer' : 'default',
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

                {sponsor.logoUrl ? (
                  <div
                    style={{
                      margin: `${spacing.lg} auto`,
                      padding: spacing.md,
                      background: '#fff',
                      borderRadius: borderRadius.md,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '100%',
                      maxWidth: '150px',
                      height: '50px',
                    }}
                  >
                    <img
                      src={sponsor.logoUrl}
                      alt={sponsor.name}
                      style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  </div>
                ) : (
                  <h4 style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.semibold, marginTop: spacing.lg, color: '#fff' }}>
                    {sponsor.name}
                  </h4>
                )}

                <p style={{ color: '#fff', fontSize: typography.fontSize.md, fontWeight: typography.fontWeight.medium, marginTop: sponsor.logoUrl ? 0 : spacing.sm }}>
                  {sponsor.name}
                </p>

                {sponsor.websiteUrl && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, color: colors.text.secondary, fontSize: typography.fontSize.xs, marginTop: spacing.sm }}>
                    <ExternalLink size={10} />
                    <span>Visit</span>
                  </div>
                )}
              </SponsorWrapper>
            );
          })}
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
          {['New York', 'Los Angeles', 'Miami', 'Chicago', 'Houston'].map((city, i) => (
            <span
              key={city}
              style={{
                padding: `${spacing.md} ${spacing.xl}`,
                background: i === 0 ? 'rgba(212,175,55,0.2)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${i === 0 ? 'rgba(212,175,55,0.4)' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: borderRadius.pill,
                fontSize: typography.fontSize.md,
                color: i === 0 ? colors.gold.primary : colors.text.secondary,
              }}
            >
              {city}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
