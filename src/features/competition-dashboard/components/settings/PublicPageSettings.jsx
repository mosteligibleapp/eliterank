import React from 'react';
import { ExternalLink, Eye, AlertCircle, CheckCircle } from 'lucide-react';
import { AboutSectionEditor } from './AboutSectionEditor';
import { ThemeEditor } from './ThemeEditor';
import { PrizePoolSettings } from './PrizePoolSettings';
import { colors, spacing, borderRadius, typography } from '../../../../styles/theme';
import { Button } from '../../../../components/ui';

/**
 * Main public page settings component
 * Combines About, Theme, and Prize Pool editors
 *
 * @param {object} competition - Competition object
 * @param {object} organization - Organization object with defaults
 * @param {function} onSave - Callback when any save completes
 */
export function PublicPageSettings({ competition, organization, onSave }) {
  // Build public page URL
  const citySlug = typeof competition?.city === 'object'
    ? competition.city?.slug || competition.city?.name?.toLowerCase()
    : competition?.city?.toLowerCase();
  const publicUrl = competition
    ? `/c/${organization?.slug || 'most-eligible'}/${citySlug}${
        competition.season ? `/${competition.season}` : ''
      }`
    : null;

  // Styles
  const containerStyle = {
    maxWidth: '800px',
  };

  const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xl,
    flexWrap: 'wrap',
    gap: spacing.md,
  };

  const headerContentStyle = {
    flex: 1,
  };

  const titleStyle = {
    margin: `0 0 ${spacing.xs}`,
    fontSize: typography.fontSize['3xl'],
    fontWeight: typography.fontWeight.bold,
  };

  const subtitleStyle = {
    color: colors.text.secondary,
    margin: 0,
  };

  const headerActionsStyle = {
    display: 'flex',
    gap: spacing.sm,
  };

  const statusBannerStyle = (type) => ({
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xl,
    fontSize: typography.fontSize.sm,
    background:
      type === 'live'
        ? 'rgba(245, 158, 11, 0.1)'
        : type === 'completed'
        ? 'rgba(100, 100, 100, 0.1)'
        : 'transparent',
    border:
      type === 'live'
        ? '1px solid rgba(245, 158, 11, 0.3)'
        : type === 'completed'
        ? `1px solid ${colors.border.primary}`
        : 'none',
    color: type === 'live' ? colors.status.warning : colors.text.secondary,
  });

  const statusDotStyle = {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: colors.status.warning,
    animation: 'pulse 1.5s infinite',
  };

  const sectionsStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.xl,
  };

  // Add keyframes for pulse animation
  const pulseKeyframes = `
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
  `;

  return (
    <div style={containerStyle}>
      <style>{pulseKeyframes}</style>

      {/* Header */}
      <div style={headerStyle}>
        <div style={headerContentStyle}>
          <h1 style={titleStyle}>Public Page</h1>
          <p style={subtitleStyle}>Customize how your competition appears to the public</p>
        </div>

        {publicUrl && (
          <div style={headerActionsStyle}>
            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: 'none' }}
            >
              <Button variant="secondary" icon={Eye}>
                View Public Page
                <ExternalLink size={14} style={{ marginLeft: spacing.xs }} />
              </Button>
            </a>
          </div>
        )}
      </div>

      {/* Status Banner */}
      {competition?.status === 'live' && (
        <div style={statusBannerStyle('live')}>
          <span style={statusDotStyle} />
          <span>
            Competition is live. Some fields are locked to protect contestant expectations.
          </span>
        </div>
      )}

      {competition?.status === 'completed' && (
        <div style={statusBannerStyle('completed')}>
          <CheckCircle size={16} />
          <span>Competition is complete. Most fields are now locked.</span>
        </div>
      )}

      {/* Settings Sections */}
      <div style={sectionsStyle}>
        <AboutSectionEditor
          competition={competition}
          organization={organization}
          onSave={onSave}
        />
        <PrizePoolSettings competition={competition} onSave={onSave} />
        <ThemeEditor competition={competition} organization={organization} onSave={onSave} />
      </div>
    </div>
  );
}

export default PublicPageSettings;
