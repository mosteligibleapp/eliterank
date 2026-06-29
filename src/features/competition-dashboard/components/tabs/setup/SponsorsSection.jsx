import React from 'react';
import { Star, Plus, Trash2, Edit2 } from 'lucide-react';
import { Button, Panel } from '../../../../../components/ui';
import { colors, spacing, borderRadius, typography } from '../../../../../styles/theme';

/**
 * SponsorsSection — Setup tab. View, add, edit, and remove sponsors. Sponsors
 * appear publicly on the competition's Prizes/Rewards page but can be managed
 * any time, so this isn't part of the publish-locked group.
 */
export default function SponsorsSection({
  sponsors = [],
  isMobile,
  focusId,
  focusNonce,
  badge,
  style,
  onOpenSponsorModal,
  onDeleteSponsor,
}) {
  return (
    <Panel
      key={`section-sponsors-${focusId === 'sponsors' ? focusNonce : 'x'}`}
      id="setup-section-sponsors"
      title={`Sponsors (${sponsors.length})`}
      icon={Star}
      badge={badge}
      action={<Button size="sm" icon={Plus} onClick={() => onOpenSponsorModal(null)}>Add Sponsor</Button>}
      collapsible
      defaultCollapsed={focusId !== 'sponsors'}
      style={style}
    >
      <div style={{ padding: isMobile ? spacing.md : spacing.xl }}>
        {sponsors.length === 0 ? (
          <div style={{ textAlign: 'center', padding: spacing.xl, color: colors.text.secondary }}>
            <Star size={48} style={{ marginBottom: spacing.md, opacity: 0.5 }} />
            <p>No sponsors yet</p>
            <p style={{ fontSize: typography.fontSize.sm, marginTop: spacing.sm }}>
              Add the brands backing your competition — they appear on your public Prizes page.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: spacing.md }}>
            {sponsors.map((sponsor) => (
              <div key={sponsor.id} style={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing.lg,
                padding: spacing.lg,
                background: colors.background.secondary,
                borderRadius: borderRadius.lg,
                flexWrap: isMobile ? 'wrap' : 'nowrap',
              }}>
                {sponsor.logoUrl ? (
                  <img src={sponsor.logoUrl} alt={sponsor.name} style={{ width: 48, height: 48, borderRadius: borderRadius.md, objectFit: 'contain', flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 48, height: 48, background: colors.gold.muted, borderRadius: borderRadius.md, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Star size={24} style={{ color: colors.gold.primary }} />
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: typography.fontWeight.medium }}>{sponsor.name}</p>
                  <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm }}>
                    {sponsor.tier === 'inkind'
                      ? 'In-kind'
                      : `${(sponsor.tier || '').charAt(0).toUpperCase()}${(sponsor.tier || '').slice(1)} Tier`}
                    {sponsor.amount ? ` • $${sponsor.amount.toLocaleString()}` : ''}
                  </p>
                </div>
                <button
                  onClick={() => onOpenSponsorModal(sponsor)}
                  title="Edit sponsor"
                  style={{
                    padding: spacing.sm,
                    background: 'transparent',
                    border: `1px solid ${colors.border.primary}`,
                    borderRadius: borderRadius.md,
                    color: colors.text.secondary,
                    cursor: 'pointer',
                    minWidth: '36px',
                    minHeight: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Edit2 size={14} />
                </button>
                <button
                  onClick={() => onDeleteSponsor(sponsor.id)}
                  title="Remove sponsor"
                  style={{
                    padding: spacing.sm,
                    background: 'transparent',
                    border: `1px solid rgba(239,68,68,0.3)`,
                    borderRadius: borderRadius.md,
                    color: '#ef4444',
                    cursor: 'pointer',
                    minWidth: '36px',
                    minHeight: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Panel>
  );
}
