/**
 * CookieConsentBanner — first-visit cookie consent + reopenable preferences modal.
 *
 * Consent state is persisted in localStorage under STORAGE_KEY:
 *   { version: 1, ts: <ISO>, choices: { essential: true, functional, analytics } }
 *
 * Other code can react to consent via:
 *   - window.getCookieConsent() → returns choices or null
 *   - window.openCookiePreferences() → re-opens the preferences modal
 *   - 'cookieConsentChange' CustomEvent on window — fires after every save
 *
 * Essential cookies are always on (auth / session / consent storage itself).
 * Functional includes fraud-prevention fingerprinting and is opt-in where
 * required by law; analytics defaults to off until the user opts in.
 *
 * Disabled on /claim, /claim-judge, /reset-password and the admin app so that
 * time-sensitive flows aren't covered by an overlay on the first visit.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { colors, spacing, typography, borderRadius } from '../styles/theme';

const STORAGE_KEY = 'eliterank-cookie-consent';
const CONSENT_VERSION = 1;
const EVENT_NAME = 'cookieConsentChange';

const DEFAULT_CHOICES = {
  essential: true,
  functional: false,
  analytics: false,
};

const SUPPRESSED_PREFIXES = ['/claim', '/claim-judge', '/reset-password', '/admin'];

function readConsent() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== CONSENT_VERSION) return null;
    return parsed.choices || null;
  } catch {
    return null;
  }
}

function writeConsent(choices) {
  if (typeof window === 'undefined') return;
  try {
    const payload = {
      version: CONSENT_VERSION,
      ts: new Date().toISOString(),
      choices: { ...DEFAULT_CHOICES, ...choices, essential: true },
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: payload.choices }));
  } catch {
    /* best-effort; user may have storage disabled */
  }
}

const styles = {
  banner: {
    position: 'fixed',
    left: spacing[4],
    right: spacing[4],
    bottom: spacing[4],
    zIndex: 1100,
    maxWidth: '760px',
    margin: '0 auto',
    background: colors.background.elevated,
    border: `1px solid ${colors.border.primary}`,
    borderRadius: borderRadius.xl,
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
    padding: spacing[5],
    color: colors.text.primary,
    fontFamily: typography.fontFamily.sans,
  },
  title: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.gold.primary,
    marginBottom: spacing[2],
  },
  body: {
    color: colors.text.secondary,
    fontSize: typography.fontSize.sm,
    lineHeight: typography.lineHeight.relaxed,
    marginBottom: spacing[4],
  },
  link: {
    color: colors.gold.primary,
    textDecoration: 'none',
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    padding: 0,
    font: 'inherit',
  },
  actions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: spacing[2],
    justifyContent: 'flex-end',
  },
  btnPrimary: {
    padding: `${spacing[2]} ${spacing[4]}`,
    background: colors.gold.primary,
    color: '#0a0a0c',
    border: 'none',
    borderRadius: borderRadius.md,
    cursor: 'pointer',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  btnSecondary: {
    padding: `${spacing[2]} ${spacing[4]}`,
    background: 'transparent',
    color: colors.text.primary,
    border: `1px solid ${colors.border.primary}`,
    borderRadius: borderRadius.md,
    cursor: 'pointer',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  btnGhost: {
    padding: `${spacing[2]} ${spacing[4]}`,
    background: 'transparent',
    color: colors.text.secondary,
    border: 'none',
    borderRadius: borderRadius.md,
    cursor: 'pointer',
    fontSize: typography.fontSize.sm,
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: colors.background.overlay,
    zIndex: 1200,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[4],
    fontFamily: typography.fontFamily.sans,
  },
  modal: {
    background: colors.background.elevated,
    border: `1px solid ${colors.border.primary}`,
    borderRadius: borderRadius.xl,
    width: '100%',
    maxWidth: '560px',
    maxHeight: '85vh',
    overflowY: 'auto',
    padding: spacing[6],
    color: colors.text.primary,
  },
  modalTitle: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.gold.primary,
    marginBottom: spacing[2],
  },
  modalIntro: {
    color: colors.text.secondary,
    fontSize: typography.fontSize.sm,
    lineHeight: typography.lineHeight.relaxed,
    marginBottom: spacing[4],
  },
  category: {
    border: `1px solid ${colors.border.primary}`,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    marginBottom: spacing[3],
    background: colors.background.card,
  },
  catHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[3],
    marginBottom: spacing[2],
  },
  catTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  catDesc: {
    color: colors.text.secondary,
    fontSize: typography.fontSize.sm,
    lineHeight: typography.lineHeight.relaxed,
    margin: 0,
  },
  toggleWrap: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing[2],
  },
  toggleLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  required: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
    fontStyle: 'italic',
  },
  modalActions: {
    display: 'flex',
    gap: spacing[2],
    justifyContent: 'flex-end',
    marginTop: spacing[4],
    flexWrap: 'wrap',
  },
};

function Toggle({ checked, onChange, disabled, label }) {
  return (
    <label style={styles.toggleWrap}>
      <span style={styles.toggleLabel}>{checked ? 'On' : 'Off'}</span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        aria-label={label}
        style={{
          width: '44px',
          height: '24px',
          accentColor: colors.gold.primary,
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
      />
    </label>
  );
}

function shouldSuppressBannerOn(pathname) {
  return SUPPRESSED_PREFIXES.some(prefix => pathname === prefix || pathname.startsWith(prefix + '/'));
}

export default function CookieConsentBanner() {
  const location = useLocation();
  const navigate = useNavigate();
  const [hasDecided, setHasDecided] = useState(() => readConsent() !== null);
  const [showModal, setShowModal] = useState(false);
  const [draftChoices, setDraftChoices] = useState(() => readConsent() || DEFAULT_CHOICES);
  const previouslyFocused = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    window.getCookieConsent = readConsent;
    window.openCookiePreferences = () => {
      setDraftChoices(readConsent() || DEFAULT_CHOICES);
      setShowModal(true);
    };
    return () => {
      delete window.getCookieConsent;
      delete window.openCookiePreferences;
    };
  }, []);

  useEffect(() => {
    if (!showModal) return undefined;
    previouslyFocused.current = document.activeElement;
    const onKey = (e) => {
      if (e.key === 'Escape') setShowModal(false);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      if (previouslyFocused.current && typeof previouslyFocused.current.focus === 'function') {
        previouslyFocused.current.focus();
      }
    };
  }, [showModal]);

  const acceptAll = useCallback(() => {
    writeConsent({ essential: true, functional: true, analytics: true });
    setHasDecided(true);
    setShowModal(false);
  }, []);

  const rejectNonEssential = useCallback(() => {
    writeConsent({ essential: true, functional: false, analytics: false });
    setHasDecided(true);
    setShowModal(false);
  }, []);

  const saveDraft = useCallback(() => {
    writeConsent(draftChoices);
    setHasDecided(true);
    setShowModal(false);
  }, [draftChoices]);

  const openManager = useCallback(() => {
    setDraftChoices(readConsent() || DEFAULT_CHOICES);
    setShowModal(true);
  }, []);

  const goToCookiePolicy = useCallback(() => {
    navigate('/cookies');
  }, [navigate]);

  const bannerSuppressed = useMemo(() => shouldSuppressBannerOn(location.pathname), [location.pathname]);

  const showBanner = !hasDecided && !bannerSuppressed;

  return (
    <>
      {showBanner && (
        <div role="dialog" aria-live="polite" aria-label="Cookie consent" style={styles.banner}>
          <div style={styles.title}>Your privacy choices</div>
          <p style={styles.body}>
            We use cookies and similar technologies to keep you signed in, prevent vote fraud, and measure
            performance. You can accept all, reject non-essential, or choose which categories to allow. Read our{' '}
            <button type="button" onClick={goToCookiePolicy} style={styles.link}>Cookie Policy</button>{' '}
            for details.
          </p>
          <div style={styles.actions}>
            <button type="button" onClick={openManager} style={styles.btnGhost}>
              Manage preferences
            </button>
            <button type="button" onClick={rejectNonEssential} style={styles.btnSecondary}>
              Reject non-essential
            </button>
            <button type="button" onClick={acceptAll} style={styles.btnPrimary}>
              Accept all
            </button>
          </div>
        </div>
      )}

      {showModal && (
        <div
          style={styles.modalOverlay}
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div role="dialog" aria-modal="true" aria-label="Cookie preferences" style={styles.modal}>
            <div style={styles.modalTitle}>Cookie preferences</div>
            <p style={styles.modalIntro}>
              Choose which categories of cookies and similar technologies EliteRank may use during your visit. You
              can change this at any time from the footer of our Cookie Policy page.
            </p>

            <div style={styles.category}>
              <div style={styles.catHeader}>
                <div style={styles.catTitle}>Strictly necessary</div>
                <span style={styles.required}>Always on</span>
              </div>
              <p style={styles.catDesc}>
                Required for the Service to function: keeps you signed in, secures your account, and remembers your
                consent choice on this device.
              </p>
            </div>

            <div style={styles.category}>
              <div style={styles.catHeader}>
                <div style={styles.catTitle}>Functional &amp; fraud prevention</div>
                <Toggle
                  checked={!!draftChoices.functional}
                  onChange={(v) => setDraftChoices(prev => ({ ...prev, functional: v }))}
                  label="Functional and fraud-prevention cookies"
                />
              </div>
              <p style={styles.catDesc}>
                Detects duplicate accounts and abusive voting via browser fingerprinting and similar techniques.
                Turning this off may limit your ability to vote.
              </p>
            </div>

            <div style={styles.category}>
              <div style={styles.catHeader}>
                <div style={styles.catTitle}>Analytics &amp; performance</div>
                <Toggle
                  checked={!!draftChoices.analytics}
                  onChange={(v) => setDraftChoices(prev => ({ ...prev, analytics: v }))}
                  label="Analytics and performance cookies"
                />
              </div>
              <p style={styles.catDesc}>
                Helps us understand how the Service is used and how fast it loads, so we can improve it. Anonymized.
              </p>
            </div>

            <div style={styles.modalActions}>
              <button type="button" onClick={rejectNonEssential} style={styles.btnGhost}>
                Reject non-essential
              </button>
              <button type="button" onClick={saveDraft} style={styles.btnSecondary}>
                Save preferences
              </button>
              <button type="button" onClick={acceptAll} style={styles.btnPrimary}>
                Accept all
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export { STORAGE_KEY as COOKIE_CONSENT_STORAGE_KEY, EVENT_NAME as COOKIE_CONSENT_EVENT };
