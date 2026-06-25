import React from 'react';
import { FileText, Lock } from 'lucide-react';
import { Panel } from '../../../../components/ui';
import { colors, spacing, borderRadius, typography } from '../../../../styles/theme';
import { buildAutoRules } from '../../../../lib/competitionRules';

/**
 * AutoRulesPreview — read-only "Rules" section for the Site tab.
 *
 * Rules are generated automatically from the competition's setup (selection
 * process, eligibility, entry, voting, charity) and shown on the public page,
 * so they always match how the competition actually runs. Hosts don't edit
 * them directly — they change them by changing the underlying settings.
 */
export function AutoRulesPreview({ competition }) {
  const sections = buildAutoRules(competition);

  return (
    <Panel title="Rules" icon={FileText} collapsible defaultCollapsed>
      <div style={{ padding: spacing.xl }}>
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: spacing.sm,
          padding: spacing.md,
          marginBottom: spacing.lg,
          background: 'rgba(212,175,55,0.06)',
          border: `1px solid rgba(212,175,55,0.25)`,
          borderRadius: borderRadius.md,
        }}>
          <Lock size={15} style={{ color: colors.gold.primary, flexShrink: 0, marginTop: 2 }} />
          <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm, lineHeight: 1.5, margin: 0 }}>
            There’s nothing to edit here — your rules are generated automatically from your competition setup and published on your public page. To change them, update the matching settings (selection process, eligibility, charity, and so on).
          </p>
        </div>

        {sections.length === 0 ? (
          <p style={{ color: colors.text.muted, fontSize: typography.fontSize.sm }}>
            Finish your competition setup and your rules will appear here.
          </p>
        ) : (
          <div style={{ display: 'grid', gap: spacing.md }}>
            {sections.map((section) => (
              <div key={section.title} style={{
                padding: spacing.lg,
                background: colors.background.secondary,
                borderRadius: borderRadius.lg,
                border: `1px solid ${colors.border.lighter}`,
              }}>
                <h4 style={{
                  fontWeight: typography.fontWeight.semibold,
                  fontSize: typography.fontSize.base,
                  marginBottom: spacing.xs,
                }}>
                  {section.title}
                </h4>
                <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm, lineHeight: 1.6, margin: 0 }}>
                  {section.content}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </Panel>
  );
}
