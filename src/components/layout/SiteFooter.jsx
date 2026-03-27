import React, { memo } from 'react';
import { Instagram } from 'lucide-react';
import { colors, spacing, borderRadius, typography } from '../../styles/theme';
import { useResponsive } from '../../hooks/useResponsive';

const styles = {
  footer: {
    borderTop: `1px solid ${colors.border.primary}`,
    background: colors.background.card,
    padding: `${spacing.xxl} ${spacing.xl}`,
    marginTop: 'auto',
  },
  inner: {
    maxWidth: '1000px',
    margin: '0 auto',
  },
  topRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: spacing.xl,
    marginBottom: spacing.xl,
  },
  brand: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.sm,
  },
  brandName: {
    fontSize: '11px',
    letterSpacing: '0.3em',
    color: colors.gold.primary,
    fontWeight: typography.fontWeight.semibold,
  },
  brandTagline: {
    fontSize: typography.fontSize.xs,
    color: colors.text.muted,
    maxWidth: '240px',
    lineHeight: 1.5,
  },
  columns: {
    display: 'flex',
    gap: spacing.xxl,
    flexWrap: 'wrap',
  },
  columnTitle: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.secondary,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  link: {
    display: 'block',
    fontSize: typography.fontSize.sm,
    color: colors.text.muted,
    textDecoration: 'none',
    marginBottom: spacing.sm,
    transition: 'color 0.15s',
  },
  socialRow: {
    display: 'flex',
    gap: spacing.md,
  },
  socialLink: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
    borderRadius: borderRadius.md,
    background: 'rgba(255,255,255,0.04)',
    border: `1px solid ${colors.border.primary}`,
    color: colors.text.muted,
    textDecoration: 'none',
    transition: 'all 0.15s',
  },
  bottomRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.md,
    paddingTop: spacing.lg,
    borderTop: `1px solid ${colors.border.primary}`,
  },
  copyright: {
    fontSize: typography.fontSize.xs,
    color: colors.text.muted,
  },
  bottomLinks: {
    display: 'flex',
    gap: spacing.lg,
  },
  bottomLink: {
    fontSize: typography.fontSize.xs,
    color: colors.text.muted,
    textDecoration: 'none',
  },
};

// TikTok icon (not in lucide)
function TikTokIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.97a8.23 8.23 0 004.76 1.52V7.04a4.85 4.85 0 01-1-.35z" />
    </svg>
  );
}

function SiteFooter() {
  const { isMobile } = useResponsive();

  return (
    <footer style={styles.footer}>
      <div style={styles.inner}>
        {/* Top section */}
        <div style={{
          ...styles.topRow,
          flexDirection: isMobile ? 'column' : 'row',
        }}>
          {/* Brand */}
          <div style={styles.brand}>
            <span style={styles.brandName}>ELITERANK</span>
            <p style={styles.brandTagline}>
              The platform for competitive nominations, voting, and community-driven recognition.
            </p>
          </div>

          {/* Link columns */}
          <div style={{
            ...styles.columns,
            gap: isMobile ? spacing.xl : spacing.xxl,
          }}>
            <div>
              <p style={styles.columnTitle}>Platform</p>
              <a href="/login" style={styles.link}>Log In</a>
              <a href="/privacy" style={styles.link}>Privacy Policy</a>
              <a href="/terms" style={styles.link}>Terms of Service</a>
            </div>
            <div>
              <p style={styles.columnTitle}>Connect</p>
              <a
                href="mailto:info@eliterank.co"
                style={styles.link}
              >
                info@eliterank.co
              </a>
              <div style={{ ...styles.socialRow, marginTop: spacing.sm }}>
                <a
                  href="https://www.instagram.com/mosteligiblechi/"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={styles.socialLink}
                  title="Instagram"
                >
                  <Instagram size={16} />
                </a>
                <a
                  href="https://www.tiktok.com/@mosteligiblechi"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={styles.socialLink}
                  title="TikTok"
                >
                  <TikTokIcon size={16} />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div style={styles.bottomRow}>
          <p style={styles.copyright}>
            &copy; {new Date().getFullYear()} EliteRank. All rights reserved.
          </p>
          <div style={styles.bottomLinks}>
            <a href="/privacy" style={styles.bottomLink}>Privacy</a>
            <a href="/terms" style={styles.bottomLink}>Terms</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default memo(SiteFooter);
