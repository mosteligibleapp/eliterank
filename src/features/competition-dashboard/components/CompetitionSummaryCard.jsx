import React from 'react';
import { ClipboardList, Pencil } from 'lucide-react';
import { Panel, Button } from '../../../components/ui';
import { colors, spacing, borderRadius, typography } from '../../../styles/theme';
import { isFieldEditable } from '../../../utils/fieldEditability';

/**
 * CompetitionSummaryCard — recap of what the host set during onboarding, shown
 * on the dashboard Overview. Edit jumps to Setup; locked fields are noted by the
 * lifecycle phase.
 */
const GENDER = { all: 'All genders', female: 'Women', male: 'Men', 'LGBTQ+': 'LGBTQ+' };
const ENTRY = { nominations: 'Nomination', applications: 'Application' };
const WIN = { votes: 'Public votes', hybrid: 'Votes + judges', judges: 'Judges only' };

export default function CompetitionSummaryCard({ competition, onNavigateToTab }) {
  if (!competition) return null;
  const c = competition;

  const territory = c.territoryScope === 'us'
    ? 'US-wide (all US + Toronto)'
    : c.territoryScope === 'state'
    ? `State-wide · ${c.territoryState || '—'}`
    : `City-wide${c.city ? ` · ${c.city}` : ''}${c.eligibilityRadiusMiles ? ` (${c.eligibilityRadiusMiles} mi)` : ''}`;

  const whoCanEnter = `${GENDER[c.eligibilityGender] || 'All genders'}${
    c.eligibilityAgeMin ? `, ${c.eligibilityAgeMin}–${c.eligibilityAgeMax || '+'}` : ''
  }`;

  const rows = [
    ['Sponsor of record', c.organizationName],
    ['Category', c.categoryTemplate || c.categoryName],
    ['Territory', territory],
    ['Who can enter', whoCanEnter],
    ['Entry', ENTRY[c.entryType] || c.entryType],
    ['How they win', WIN[c.selectionCriteria] || c.selectionCriteria],
    ['Winners', c.numberOfWinners],
    ['Charity', c.charityPercentage ? `${c.charityPercentage}% of proceeds` : 'None'],
  ];

  // The core onboarding fields lock at submit-for-approval.
  const editable = isFieldEditable('category', c.status);

  return (
    <Panel
      title="Your competition"
      icon={ClipboardList}
      style={{ marginBottom: 0 }}
      action={
        <Button size="sm" variant="secondary" icon={Pencil} onClick={() => onNavigateToTab?.('setup')} style={{ width: 'auto' }}>
          {editable ? 'Edit in Setup' : 'View in Setup'}
        </Button>
      }
    >
      <div style={{ padding: spacing.xl }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: `${spacing.sm} ${spacing.xl}` }}>
          {rows.map(([k, v]) => (
            <div key={k} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ color: colors.text.muted, fontSize: typography.fontSize.xs }}>{k}</span>
              <span style={{ color: colors.text.primary, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium }}>{v || '—'}</span>
            </div>
          ))}
        </div>
        {!editable && (
          <p style={{
            marginTop: spacing.lg, padding: spacing.sm, borderRadius: borderRadius.md,
            background: colors.background.secondary, color: colors.text.muted, fontSize: typography.fontSize.xs,
          }}>
            These were locked when you submitted for approval and can't be changed.
          </p>
        )}
      </div>
    </Panel>
  );
}
