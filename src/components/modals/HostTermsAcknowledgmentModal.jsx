import React, { useState } from 'react';
import { Shield, ExternalLink, AlertTriangle } from 'lucide-react';
import { Button } from '../ui';
import { colors, spacing, borderRadius, typography } from '../../styles/theme';
import { supabase } from '../../lib/supabase';

export const HOST_TERMS_VERSION = '2026-05-28';

export default function HostTermsAcknowledgmentModal({
  isOpen,
  competition,
  onAccepted,
  onDecline,
}) {
  const [checked, setChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen || !competition) return null;

  const competitionName = competition.name || 'this competition';

  const handleAccept = async () => {
    if (!checked || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const { error: rpcError } = await supabase.rpc('accept_host_terms', {
        p_competition_id: competition.id,
        p_version: HOST_TERMS_VERSION,
      });
      if (rpcError) throw rpcError;
      onAccepted?.();
    } catch (err) {
      console.error('Failed to accept host terms:', err);
      setError(err.message || 'Failed to record acceptance. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: spacing.xl,
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          background: colors.background.primary,
          borderRadius: borderRadius.xl,
          border: `1px solid ${colors.gold.primary}`,
          maxWidth: '640px',
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          padding: spacing.xl,
          borderBottom: `1px solid ${colors.border.light}`,
          display: 'flex',
          alignItems: 'center',
          gap: spacing.md,
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            background: 'rgba(212,175,55,0.15)',
            borderRadius: borderRadius.lg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Shield size={20} style={{ color: colors.gold.primary }} />
          </div>
          <div>
            <h2 style={{
              fontSize: typography.fontSize.xl,
              fontWeight: typography.fontWeight.semibold,
              color: colors.text.primary,
            }}>
              Host Acknowledgment Required
            </h2>
            <p style={{
              fontSize: typography.fontSize.sm,
              color: colors.text.secondary,
              marginTop: '2px',
            }}>
              Before you operate <strong style={{ color: colors.gold.primary }}>{competitionName}</strong>
            </p>
          </div>
        </div>

        <div style={{ padding: spacing.xl, overflowY: 'auto', flex: 1 }}>
          <p style={{
            color: colors.text.primary,
            fontSize: typography.fontSize.md,
            lineHeight: 1.6,
            marginBottom: spacing.lg,
          }}>
            EliteRank is a neutral technology platform. As the Host of this competition,
            you are the promoter and operator of record &mdash; not EliteRank. By accepting,
            you confirm that you understand and agree:
          </p>

          <ul style={{
            color: colors.text.secondary,
            fontSize: typography.fontSize.sm,
            lineHeight: 1.8,
            paddingLeft: spacing.lg,
            marginBottom: spacing.lg,
          }}>
            <li>
              You are <strong style={{ color: colors.text.primary }}>solely responsible</strong> for
              complying with all applicable laws, regulations, ordinances, licensing, registration,
              bonding, taxation, consumer-protection, advertising, prize-disclosure, sweepstakes,
              contest, raffle, lottery, charitable-solicitation, data-protection, privacy, and labor
              requirements in every country, federal/national, state, province, territory, county,
              parish, municipality, city, township, tribal, or other jurisdiction in which this
              competition is offered, promoted, conducted, or capable of being entered.
            </li>
            <li>
              You are responsible for obtaining any required registrations, bonds, permits, licenses,
              filings, and tax forms (including IRS Form 1099 or equivalent) before launching or
              awarding prizes.
            </li>
            <li>
              <strong style={{ color: colors.text.primary }}>EliteRank does not provide legal, tax,
              or regulatory advice.</strong> You should consult qualified counsel in each relevant
              jurisdiction.
            </li>
            <li>
              You will <strong style={{ color: colors.text.primary }}>defend, indemnify, and hold
              EliteRank harmless</strong> from any claim, regulatory action, penalty, fine, tax,
              judgment, settlement, loss, or expense (including attorneys' fees) arising from your
              competition or any failure to comply with applicable law.
            </li>
            <li>
              EliteRank may suspend or remove any competition it reasonably believes may be unlawful,
              under regulatory inquiry, or that creates legal or reputational risk &mdash; without
              waiving any of your compliance or indemnification obligations.
            </li>
          </ul>

          <div style={{
            padding: spacing.md,
            background: 'rgba(212,175,55,0.08)',
            border: `1px solid rgba(212,175,55,0.3)`,
            borderRadius: borderRadius.lg,
            marginBottom: spacing.lg,
          }}>
            <p style={{
              color: colors.text.secondary,
              fontSize: typography.fontSize.sm,
              lineHeight: 1.6,
            }}>
              Full text:{' '}
              <a
                href="/terms#13"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: colors.gold.primary,
                  textDecoration: 'underline',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                Terms of Use §13
                <ExternalLink size={12} />
              </a>
              {' '}and{' '}
              <a
                href="/contest-terms"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: colors.gold.primary,
                  textDecoration: 'underline',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                Contest Terms §2
                <ExternalLink size={12} />
              </a>
              .
            </p>
          </div>

          <label style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: spacing.md,
            padding: spacing.md,
            background: colors.background.secondary,
            border: `1px solid ${checked ? colors.gold.primary : colors.border.light}`,
            borderRadius: borderRadius.lg,
            cursor: 'pointer',
            transition: 'border-color 0.2s',
          }}>
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              style={{
                marginTop: '3px',
                width: '18px',
                height: '18px',
                accentColor: colors.gold.primary,
                cursor: 'pointer',
                flexShrink: 0,
              }}
            />
            <span style={{
              color: colors.text.primary,
              fontSize: typography.fontSize.sm,
              lineHeight: 1.5,
            }}>
              I have read and agree to the Host Obligations above, and I accept full legal
              responsibility for compliance with all laws applicable to this competition in every
              relevant jurisdiction. I indemnify EliteRank as set out in the Terms of Use.
            </span>
          </label>

          {error && (
            <div style={{
              marginTop: spacing.md,
              padding: spacing.md,
              background: 'rgba(239,68,68,0.1)',
              border: `1px solid ${colors.status.error}`,
              borderRadius: borderRadius.lg,
              display: 'flex',
              alignItems: 'flex-start',
              gap: spacing.sm,
            }}>
              <AlertTriangle size={16} style={{ color: colors.status.error, flexShrink: 0, marginTop: '2px' }} />
              <p style={{ color: colors.status.error, fontSize: typography.fontSize.sm }}>{error}</p>
            </div>
          )}
        </div>

        <div style={{
          padding: spacing.xl,
          borderTop: `1px solid ${colors.border.light}`,
          display: 'flex',
          gap: spacing.md,
        }}>
          <Button
            variant="secondary"
            onClick={onDecline}
            disabled={submitting}
            style={{ flex: 1 }}
          >
            Decline &amp; Exit
          </Button>
          <Button
            variant="primary"
            onClick={handleAccept}
            disabled={!checked || submitting}
            style={{ flex: 2 }}
          >
            {submitting ? 'Recording…' : 'I Accept & Continue'}
          </Button>
        </div>
      </div>
    </div>
  );
}
