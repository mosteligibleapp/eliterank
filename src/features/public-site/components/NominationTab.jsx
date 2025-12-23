import React, { useState } from 'react';
import { Crown, Sparkles, Users, Calendar, Trophy, ChevronRight, Star } from 'lucide-react';
import { Button } from '../../../components/ui';
import { colors, spacing, borderRadius, typography } from '../../../styles/theme';
import NominationForm from './NominationForm';

export default function NominationTab({ city, onNominationSubmit }) {
  const [showForm, setShowForm] = useState(false);

  if (showForm) {
    return (
      <div style={{ padding: spacing.xl }}>
        <NominationForm
          city={city}
          onSubmit={onNominationSubmit}
          onClose={() => setShowForm(false)}
        />
      </div>
    );
  }

  return (
    <div>
      {/* Hero Section */}
      <div style={{
        textAlign: 'center',
        padding: `${spacing.xxxl} ${spacing.xl}`,
        background: 'linear-gradient(180deg, rgba(212,175,55,0.1) 0%, transparent 100%)',
        borderRadius: borderRadius.xxl,
        marginBottom: spacing.xxxl,
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: spacing.sm,
          padding: `${spacing.sm} ${spacing.lg}`,
          background: 'rgba(212,175,55,0.2)',
          border: `1px solid ${colors.gold.primary}`,
          borderRadius: borderRadius.pill,
          marginBottom: spacing.xl,
        }}>
          <Sparkles size={16} style={{ color: colors.gold.primary }} />
          <span style={{ fontSize: typography.fontSize.sm, color: colors.gold.primary, fontWeight: typography.fontWeight.semibold }}>
            NOMINATIONS NOW OPEN
          </span>
        </div>

        <h1 style={{
          fontSize: 'clamp(32px, 6vw, 56px)',
          fontWeight: typography.fontWeight.bold,
          color: '#fff',
          marginBottom: spacing.lg,
          lineHeight: 1.1,
        }}>
          Are You {city}'s
          <span style={{ display: 'block', color: colors.gold.primary }}>Most Eligible?</span>
        </h1>

        <p style={{
          fontSize: typography.fontSize.lg,
          color: colors.text.secondary,
          maxWidth: '600px',
          margin: '0 auto',
          marginBottom: spacing.xxl,
          lineHeight: 1.6,
        }}>
          Nominate yourself or someone you know to compete for the title of Most Eligible in {city}.
          Join an exclusive community of ambitious professionals.
        </p>

        <Button
          size="lg"
          onClick={() => setShowForm(true)}
          style={{
            padding: `${spacing.lg} ${spacing.xxxl}`,
            fontSize: typography.fontSize.lg,
          }}
        >
          <Crown size={20} />
          Start Your Nomination
          <ChevronRight size={20} />
        </Button>
      </div>

      {/* How It Works */}
      <div style={{ marginBottom: spacing.xxxl }}>
        <h2 style={{
          fontSize: typography.fontSize.xxl,
          fontWeight: typography.fontWeight.semibold,
          color: '#fff',
          textAlign: 'center',
          marginBottom: spacing.xl,
        }}>
          How It Works
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: spacing.xl,
        }}>
          {[
            {
              step: '1',
              icon: Users,
              title: 'Submit Nomination',
              desc: 'Nominate yourself or someone you know who fits the criteria',
            },
            {
              step: '2',
              icon: Star,
              title: 'Get Approved',
              desc: 'Our team reviews nominations and selects contestants',
            },
            {
              step: '3',
              icon: Trophy,
              title: 'Compete & Win',
              desc: 'Gain votes, attend events, and compete for the crown',
            },
          ].map((item) => (
            <div
              key={item.step}
              style={{
                background: colors.background.card,
                border: `1px solid ${colors.border.light}`,
                borderRadius: borderRadius.xl,
                padding: spacing.xl,
                textAlign: 'center',
              }}
            >
              <div style={{
                width: '48px',
                height: '48px',
                background: colors.gold.primary,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto',
                marginBottom: spacing.lg,
                fontSize: typography.fontSize.xl,
                fontWeight: typography.fontWeight.bold,
                color: '#0a0a0f',
              }}>
                {item.step}
              </div>
              <item.icon size={32} style={{ color: colors.gold.primary, marginBottom: spacing.md }} />
              <h3 style={{
                fontSize: typography.fontSize.lg,
                fontWeight: typography.fontWeight.semibold,
                color: '#fff',
                marginBottom: spacing.sm,
              }}>
                {item.title}
              </h3>
              <p style={{
                fontSize: typography.fontSize.sm,
                color: colors.text.secondary,
                lineHeight: 1.5,
              }}>
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Benefits */}
      <div style={{
        background: colors.background.card,
        border: `1px solid ${colors.border.gold}`,
        borderRadius: borderRadius.xxl,
        padding: spacing.xxl,
        marginBottom: spacing.xxxl,
      }}>
        <h2 style={{
          fontSize: typography.fontSize.xl,
          fontWeight: typography.fontWeight.semibold,
          color: colors.gold.primary,
          marginBottom: spacing.xl,
          textAlign: 'center',
        }}>
          Why Compete?
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: spacing.lg,
        }}>
          {[
            'Professional photoshoot',
            'VIP event invitations',
            'Social media exposure',
            'Networking opportunities',
            'Cash prizes for winners',
            'Brand partnerships',
          ].map((benefit, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing.sm,
                padding: spacing.md,
                background: 'rgba(212,175,55,0.05)',
                borderRadius: borderRadius.lg,
              }}
            >
              <div style={{
                width: '24px',
                height: '24px',
                background: colors.gold.primary,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Star size={12} style={{ color: '#0a0a0f' }} />
              </div>
              <span style={{ fontSize: typography.fontSize.sm, color: colors.text.primary }}>
                {benefit}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Requirements */}
      <div style={{ marginBottom: spacing.xxxl }}>
        <h2 style={{
          fontSize: typography.fontSize.xl,
          fontWeight: typography.fontWeight.semibold,
          color: '#fff',
          marginBottom: spacing.lg,
          textAlign: 'center',
        }}>
          Requirements
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: spacing.md,
          maxWidth: '600px',
          margin: '0 auto',
        }}>
          {[
            'Ages 21-45',
            'Single (not married or engaged)',
            `Live within 100 miles of ${city}`,
            'Active on social media',
          ].map((req, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing.sm,
                padding: spacing.md,
                background: colors.background.secondary,
                borderRadius: borderRadius.lg,
                border: `1px solid ${colors.border.light}`,
              }}
            >
              <span style={{ color: colors.status.success }}>✓</span>
              <span style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>
                {req}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div style={{
        background: colors.background.card,
        border: `1px solid ${colors.border.light}`,
        borderRadius: borderRadius.xxl,
        padding: spacing.xxl,
        marginBottom: spacing.xxxl,
      }}>
        <h2 style={{
          fontSize: typography.fontSize.xl,
          fontWeight: typography.fontWeight.semibold,
          color: '#fff',
          marginBottom: spacing.xl,
          textAlign: 'center',
        }}>
          Competition Timeline
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
          {[
            { phase: 'Nominations Open', date: 'Now - March 15', status: 'active' },
            { phase: 'Contestants Announced', date: 'March 20', status: 'upcoming' },
            { phase: 'Voting Begins', date: 'March 25', status: 'upcoming' },
            { phase: 'Finals Gala', date: 'May 10', status: 'upcoming' },
          ].map((item, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing.lg,
                padding: spacing.md,
                background: item.status === 'active' ? 'rgba(212,175,55,0.1)' : 'transparent',
                borderRadius: borderRadius.lg,
                border: item.status === 'active' ? `1px solid ${colors.gold.primary}` : '1px solid transparent',
              }}
            >
              <div style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: item.status === 'active' ? colors.gold.primary : colors.border.light,
                boxShadow: item.status === 'active' ? `0 0 10px ${colors.gold.primary}` : 'none',
              }} />
              <div style={{ flex: 1 }}>
                <span style={{
                  fontSize: typography.fontSize.md,
                  fontWeight: typography.fontWeight.medium,
                  color: item.status === 'active' ? colors.gold.primary : colors.text.primary,
                }}>
                  {item.phase}
                </span>
              </div>
              <span style={{
                fontSize: typography.fontSize.sm,
                color: colors.text.secondary,
              }}>
                {item.date}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{ textAlign: 'center', padding: spacing.xl }}>
        <Button
          size="lg"
          onClick={() => setShowForm(true)}
          style={{
            padding: `${spacing.lg} ${spacing.xxxl}`,
            fontSize: typography.fontSize.lg,
          }}
        >
          <Crown size={20} />
          Nominate Now
          <ChevronRight size={20} />
        </Button>
        <p style={{
          fontSize: typography.fontSize.sm,
          color: colors.text.muted,
          marginTop: spacing.md,
        }}>
          Nominations close March 15, 2026
        </p>
      </div>
    </div>
  );
}
