import React from 'react';
import { MapPin, Gift } from 'lucide-react';
import { Panel } from '../../components/ui';
import { colors, spacing, borderRadius, typography, gradients } from '../../styles/theme';
import { useResponsive } from '../../hooks/useResponsive';

/**
 * RewardsPage - Displays user rewards dashboard
 * Shows a simplified profile banner and available rewards section
 */
export default function RewardsPage({ hostProfile }) {
  const { isMobile } = useResponsive();

  if (!hostProfile) return null;

  const initials = `${(hostProfile.firstName || '?')[0]}${(hostProfile.lastName || '?')[0]}`;

  return (
    <div>
      {/* Simplified Profile Banner */}
      <Panel style={{ marginBottom: isMobile ? spacing.lg : spacing.xxl }}>
        <div
          style={{
            height: isMobile ? '140px' : '200px',
            background: hostProfile.coverImage
              ? `url(${hostProfile.coverImage}) center/cover`
              : gradients.cover,
            position: 'relative',
          }}
        />
        <div style={{ padding: isMobile ? `0 ${spacing.lg} ${spacing.lg}` : `0 ${spacing.xxxl} ${spacing.xxxl}`, marginTop: isMobile ? '-40px' : '-60px' }}>
          <div style={{ display: 'flex', gap: isMobile ? spacing.md : spacing.xxl, alignItems: isMobile ? 'center' : 'flex-end', flexWrap: 'wrap' }}>
            <div
              style={{
                width: isMobile ? '100px' : '140px',
                height: isMobile ? '100px' : '140px',
                borderRadius: borderRadius.xxl,
                background: hostProfile.avatarUrl
                  ? `url(${hostProfile.avatarUrl}) center/cover`
                  : 'linear-gradient(135deg, rgba(212,175,55,0.4), rgba(212,175,55,0.1))',
                border: isMobile ? '3px solid #1a1a24' : '4px solid #1a1a24',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: isMobile ? '32px' : '42px',
                fontWeight: typography.fontWeight.semibold,
                color: colors.gold.primary,
                flexShrink: 0,
              }}
            >
              {!hostProfile.avatarUrl && initials}
            </div>
            <div style={{ flex: 1, paddingBottom: isMobile ? 0 : spacing.sm, minWidth: 0 }}>
              <h1 style={{
                fontSize: isMobile ? typography.fontSize.xxl : typography.fontSize.hero,
                fontWeight: typography.fontWeight.bold,
                color: '#fff',
                wordBreak: 'break-word',
              }}>
                {hostProfile.firstName} {hostProfile.lastName}
              </h1>
              {hostProfile.city && (
                <p style={{
                  color: colors.text.secondary,
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing.sm,
                  marginTop: spacing.sm,
                  fontSize: isMobile ? typography.fontSize.md : typography.fontSize.lg
                }}>
                  <MapPin size={isMobile ? 16 : 18} /> {hostProfile.city}
                </p>
              )}
            </div>
          </div>
        </div>
      </Panel>

      {/* Available Rewards Section */}
      <Panel>
        <div style={{ padding: isMobile ? spacing.lg : spacing.xxl }}>
          <h2 style={{
            fontSize: isMobile ? typography.fontSize.xl : typography.fontSize.xxl,
            fontWeight: typography.fontWeight.semibold,
            marginBottom: spacing.xl,
            display: 'flex',
            alignItems: 'center',
            gap: spacing.md,
            color: colors.text.primary,
          }}>
            <Gift size={isMobile ? 20 : 24} style={{ color: colors.gold.primary }} />
            Available Rewards
          </h2>

          {/* Empty State */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: isMobile ? spacing.xxl : spacing.xxxl,
            textAlign: 'center',
          }}>
            <div style={{
              width: isMobile ? '64px' : '80px',
              height: isMobile ? '64px' : '80px',
              borderRadius: borderRadius.full,
              background: 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.05))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: spacing.lg,
            }}>
              <Gift size={isMobile ? 28 : 36} style={{ color: colors.gold.primary, opacity: 0.6 }} />
            </div>
            <p style={{
              color: colors.text.secondary,
              fontSize: isMobile ? typography.fontSize.md : typography.fontSize.lg,
            }}>
              No rewards available
            </p>
          </div>
        </div>
      </Panel>
    </div>
  );
}
