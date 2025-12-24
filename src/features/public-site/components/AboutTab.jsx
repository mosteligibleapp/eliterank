import React, { useState } from 'react';
import { Award, Calendar, FileText, Trophy, Building, Crown, Check, Star, Instagram, Linkedin, Twitter, User } from 'lucide-react';
import { Avatar, Badge } from '../../../components/ui';
import { colors, spacing, borderRadius, typography, gradients } from '../../../styles/theme';
import { formatEventDateRange } from '../../../utils/formatters';
import ProfileModal from './ProfileModal';

export default function AboutTab({ judges, sponsors, events, host, city = 'New York' }) {
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [profileType, setProfileType] = useState('host');

  const platinumSponsor = sponsors.find((s) => s.tier === 'Platinum');
  const otherSponsors = sponsors.filter((s) => s.tier !== 'Platinum');
  const publicEvents = events.filter((e) => e.publicVisible !== false);

  const handleViewProfile = (profile, type) => {
    setSelectedProfile(profile);
    setProfileType(type);
  };

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
            onClick={() => handleViewProfile(host, 'host')}
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
              onClick={() => handleViewProfile(judge, 'judge')}
              style={{
                background: colors.background.card,
                border: `1px solid ${colors.border.light}`,
                borderRadius: borderRadius.xxl,
                padding: spacing.xxl,
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.3s',
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

      {/* Profile Modal */}
      <ProfileModal
        isOpen={!!selectedProfile}
        onClose={() => setSelectedProfile(null)}
        profile={selectedProfile}
        type={profileType}
      />
    </div>
  );
}
