import React from 'react';
import { Plus, Edit2, Gift } from 'lucide-react';
import { Button, Panel } from '../../../../../components/ui';
import { colors, spacing, borderRadius, typography } from '../../../../../styles/theme';
import LockedSection from './LockedSection';

/**
 * CharitySection — Setup tab. Only relevant if the host is donating a % of
 * proceeds; otherwise it renders as a grayed-out, inaccessible placeholder.
 * Locks at publish like the other public-facing sections.
 */
export default function CharitySection({
  competition,
  charityApplies,
  isMobile,
  focusId,
  focusNonce,
  charityHidden,
  badge,
  style,
  publishLocked,
  onOpenCharityModal,
}) {
  if (!charityApplies) {
    return (
      <div id="setup-section-charity" style={style}>
        <LockedSection
          title="Charity Partner"
          icon={Gift}
          reason="Not used — you chose not to donate a portion of proceeds. Turn charity on in your competition details to set this up."
        />
      </div>
    );
  }

  return (
    <Panel
      key={`section-charity-${charityHidden}-${focusId === 'charity' ? focusNonce : 'x'}`}
      id="setup-section-charity"
      title="Charity Partner"
      icon={Gift}
      locked={publishLocked}
      badge={badge}
      action={
        <Button size="sm" icon={competition?.charityName ? Edit2 : Plus} onClick={onOpenCharityModal}>
          {competition?.charityName ? 'Edit' : 'Add Charity'}
        </Button>
      }
      collapsible
      defaultCollapsed={focusId !== 'charity'}
      style={style}
    >
      <div style={{ padding: isMobile ? spacing.md : spacing.xl }}>
        {!competition?.charityName ? (
          <div style={{ textAlign: 'center', padding: spacing.xl, color: colors.text.secondary }}>
            <Gift size={48} style={{ marginBottom: spacing.md, opacity: 0.5 }} />
            <p>No charity partner set</p>
            <p style={{ fontSize: typography.fontSize.sm, marginTop: spacing.sm }}>
              Highlight a charity that benefits from competition proceeds
            </p>
          </div>
        ) : (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: spacing.lg,
            padding: spacing.lg,
            background: colors.background.secondary,
            borderRadius: borderRadius.lg,
            flexWrap: isMobile ? 'wrap' : 'nowrap',
          }}>
            {competition.charityLogoUrl ? (
              <img src={competition.charityLogoUrl} alt={competition.charityName} style={{ width: 48, height: 48, borderRadius: borderRadius.md, objectFit: 'contain' }} />
            ) : (
              <div style={{ width: 48, height: 48, background: colors.gold.muted, borderRadius: borderRadius.md, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Gift size={24} style={{ color: colors.gold.primary }} />
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontWeight: typography.fontWeight.medium }}>{competition.charityName}</p>
              {competition.charityWebsiteUrl && (
                <a
                  href={competition.charityWebsiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm, textDecoration: 'underline' }}
                >
                  {competition.charityWebsiteUrl}
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </Panel>
  );
}
