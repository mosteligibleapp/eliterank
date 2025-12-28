import React from 'react';
import {
  Crown,
  UserPlus,
  FileText,
  Settings,
  User,
  Trophy,
} from 'lucide-react';
import { colors, spacing, typography } from '../../styles/theme';

const ICON_MAP = {
  overview: Crown,
  nominations: UserPlus,
  community: FileText,
  settings: Settings,
  profile: User,
};

const TITLE_MAP = {
  overview: 'Competition Overview',
  nominations: 'Nominations',
  community: 'Community',
  settings: 'Settings',
  profile: 'Host Profile',
};

export default function PageHeader({ tab, showCompetitionLabel = false, competitionName }) {
  const Icon = ICON_MAP[tab];

  // Use competition name for overview tab if provided
  const displayTitle = tab === 'overview' && competitionName
    ? competitionName
    : TITLE_MAP[tab];

  const containerStyle = {
    marginBottom: spacing.xxxl,
  };

  const labelStyle = {
    fontSize: typography.fontSize.md,
    color: colors.gold.primary,
    fontWeight: typography.fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: '1px',
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  };

  const titleStyle = {
    fontSize: typography.fontSize.display,
    fontWeight: typography.fontWeight.semibold,
    display: 'flex',
    alignItems: 'center',
    gap: spacing.md,
  };

  return (
    <div style={containerStyle}>
      {showCompetitionLabel && (
        <p style={labelStyle}>
          <Trophy size={16} /> Your Competition
        </p>
      )}
      <h1 style={titleStyle}>
        {Icon && <Icon size={28} style={{ color: colors.gold.primary }} />}
        {displayTitle}
      </h1>
    </div>
  );
}
