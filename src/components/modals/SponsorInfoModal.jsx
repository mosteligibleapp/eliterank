import React from 'react';
import { Info, DollarSign, Users, Gift, Star, Trophy, CheckCircle, Crown } from 'lucide-react';
import { Modal, Button, Badge } from '../ui';
import { colors, spacing, borderRadius, typography } from '../../styles/theme';

const TIER_BENEFITS = {
  all: [
    'Access to our network of 21-40 year old female professionals',
    'Logo featured on competition web app',
    'Social media mention during competition',
  ],
  platinumGold: [
    'Social media post from competition winners',
    'Inclusion in email newsletter to all voters',
    'Logo on event materials and signage',
    'Complimentary tickets to Finals Gala',
  ],
  platinum: [
    'Robust media coverage and PR mentions',
    '"Presented by" headline sponsor placement',
    'Exclusive category sponsorship',
    'VIP table at Finals Gala',
  ],
};

const PRICING = [
  { tier: 'Platinum', amount: '$5,000', color: colors.tier.platinum, recommended: true },
  { tier: 'Gold', amount: '$1,000', color: colors.tier.gold },
  { tier: 'Silver', amount: '$500', color: colors.tier.silver },
];

export default function SponsorInfoModal({ isOpen, onClose }) {
  const sectionStyle = {
    marginBottom: spacing.xxl,
  };

  const sectionTitleStyle = {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing.lg,
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
  };

  const benefitItemStyle = {
    display: 'flex',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: `${spacing.md} 0`,
    borderBottom: `1px solid ${colors.border.lighter}`,
  };

  const pricingCardStyle = (isRecommended) => ({
    flex: 1,
    padding: spacing.lg,
    background: isRecommended ? 'rgba(212,175,55,0.1)' : 'rgba(255,255,255,0.03)',
    border: `1px solid ${isRecommended ? colors.border.gold : colors.border.lighter}`,
    borderRadius: borderRadius.lg,
    textAlign: 'center',
    position: 'relative',
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Sponsorship Guide"
      maxWidth="650px"
      footer={
        <Button onClick={onClose} style={{ width: 'auto' }}>
          Got It
        </Button>
      }
    >
      {/* When to Sell */}
      <div style={sectionStyle}>
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(251,191,36,0.15), rgba(251,191,36,0.05))',
            border: '1px solid rgba(251,191,36,0.3)',
            borderRadius: borderRadius.xl,
            padding: spacing.xl,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: spacing.md }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: borderRadius.md,
                background: 'rgba(251,191,36,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Info size={20} style={{ color: colors.status.warning }} />
            </div>
            <div>
              <p style={{ fontWeight: typography.fontWeight.semibold, marginBottom: spacing.sm, color: colors.status.warning }}>
                Sell Sponsorships Before Competition Begins
              </p>
              <p style={{ color: colors.text.light, fontSize: typography.fontSize.md, lineHeight: '1.6' }}>
                Secure sponsors during the nomination phase to maximize exposure. Sponsors get visibility throughout the entire competition, so early commitment means maximum value for their investment.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Ideal Sponsor Types */}
      <div style={sectionStyle}>
        <h3 style={sectionTitleStyle}>
          <Users size={18} style={{ color: colors.gold.primary }} />
          Ideal Sponsor Types
        </h3>
        <div
          style={{
            background: 'rgba(255,255,255,0.03)',
            borderRadius: borderRadius.lg,
            padding: spacing.xl,
          }}
        >
          <p style={{ color: colors.text.light, fontSize: typography.fontSize.md, lineHeight: '1.6', marginBottom: spacing.md }}>
            Target brands that want to reach our contestant audience:
          </p>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {[
              '21-40 year old female professionals',
              'Lifestyle, fashion, beauty, and wellness brands',
              'Luxury hospitality and travel companies',
              'Financial services targeting young professionals',
              'Food & beverage (champagne, restaurants, etc.)',
            ].map((item, i) => (
              <li
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing.sm,
                  padding: `${spacing.sm} 0`,
                  color: colors.text.light,
                  fontSize: typography.fontSize.md,
                }}
              >
                <CheckCircle size={14} style={{ color: colors.status.success, flexShrink: 0 }} />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Recommended Pricing */}
      <div style={sectionStyle}>
        <h3 style={sectionTitleStyle}>
          <DollarSign size={18} style={{ color: colors.gold.primary }} />
          Recommended Pricing
        </h3>
        <div style={{ display: 'flex', gap: spacing.md }}>
          {PRICING.map((tier) => (
            <div key={tier.tier} style={pricingCardStyle(tier.recommended)}>
              {tier.recommended && (
                <div
                  style={{
                    position: 'absolute',
                    top: '-10px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: colors.gold.primary,
                    color: '#0a0a0f',
                    padding: `${spacing.xs} ${spacing.md}`,
                    borderRadius: borderRadius.sm,
                    fontSize: typography.fontSize.xs,
                    fontWeight: typography.fontWeight.bold,
                    textTransform: 'uppercase',
                  }}
                >
                  Most Popular
                </div>
              )}
              <Crown
                size={24}
                style={{
                  color: tier.color,
                  marginBottom: spacing.sm,
                }}
              />
              <p style={{ color: tier.color, fontWeight: typography.fontWeight.bold, marginBottom: spacing.xs }}>
                {tier.tier}
              </p>
              <p style={{ fontSize: typography.fontSize.xxl, fontWeight: typography.fontWeight.bold, color: '#fff' }}>
                {tier.amount}
              </p>
            </div>
          ))}
        </div>
        <p style={{ fontSize: typography.fontSize.sm, color: colors.text.muted, marginTop: spacing.md, textAlign: 'center' }}>
          Pricing is flexible based on your market and sponsor relationships
        </p>
      </div>

      {/* Benefits by Tier */}
      <div style={sectionStyle}>
        <h3 style={sectionTitleStyle}>
          <Gift size={18} style={{ color: colors.gold.primary }} />
          What Sponsors Receive
        </h3>

        {/* All Tiers */}
        <div
          style={{
            background: 'rgba(255,255,255,0.03)',
            borderRadius: borderRadius.lg,
            padding: spacing.lg,
            marginBottom: spacing.md,
          }}
        >
          <p
            style={{
              fontSize: typography.fontSize.sm,
              color: colors.text.secondary,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: spacing.md,
            }}
          >
            All Tiers Receive
          </p>
          {TIER_BENEFITS.all.map((benefit, i) => (
            <div key={i} style={benefitItemStyle}>
              <CheckCircle size={16} style={{ color: colors.status.success, flexShrink: 0, marginTop: '2px' }} />
              <span style={{ color: colors.text.light, fontSize: typography.fontSize.md }}>{benefit}</span>
            </div>
          ))}
        </div>

        {/* Platinum & Gold */}
        <div
          style={{
            background: 'rgba(212,175,55,0.05)',
            border: `1px solid ${colors.border.gold}`,
            borderRadius: borderRadius.lg,
            padding: spacing.lg,
            marginBottom: spacing.md,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md }}>
            <Badge variant="gold" size="md" uppercase>Platinum</Badge>
            <span style={{ color: colors.text.secondary }}>&</span>
            <Badge variant="gold" size="md" uppercase>Gold</Badge>
            <span style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm }}>Also Receive</span>
          </div>
          {TIER_BENEFITS.platinumGold.map((benefit, i) => (
            <div key={i} style={benefitItemStyle}>
              <Star size={16} style={{ color: colors.gold.primary, flexShrink: 0, marginTop: '2px' }} />
              <span style={{ color: colors.text.light, fontSize: typography.fontSize.md }}>{benefit}</span>
            </div>
          ))}
        </div>

        {/* Platinum Only */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(200,200,200,0.1), rgba(200,200,200,0.05))',
            border: '1px solid rgba(200,200,200,0.3)',
            borderRadius: borderRadius.lg,
            padding: spacing.lg,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md }}>
            <Badge variant="platinum" size="md" uppercase>Platinum</Badge>
            <span style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm }}>Exclusive Benefits</span>
          </div>
          {TIER_BENEFITS.platinum.map((benefit, i) => (
            <div key={i} style={benefitItemStyle}>
              <Trophy size={16} style={{ color: colors.tier.platinum, flexShrink: 0, marginTop: '2px' }} />
              <span style={{ color: colors.text.light, fontSize: typography.fontSize.md }}>{benefit}</span>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}
