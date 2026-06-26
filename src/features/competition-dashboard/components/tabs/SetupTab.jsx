import React, { useState, useEffect } from 'react';
import { Calendar, Star, Plus, Trash2, Edit2, Lock, CheckCircle, Gift } from 'lucide-react';
import { Button, Panel } from '../../../../components/ui';
import { colors, spacing, borderRadius, typography } from '../../../../styles/theme';
import { useResponsive } from '../../../../hooks/useResponsive';
import TimelineSettings from '../TimelineSettings';
import JudgingPanel from '../JudgingPanel';
import JudgesManager from '../JudgesManager';
import CompetitionSummaryCard from '../CompetitionSummaryCard';
import HostsPanel from '../HostsPanel';
import { isFieldEditable } from '../../../../utils/fieldEditability';
import { NominationFormEditor } from '../settings';

// Top-to-bottom order of every Setup section, aligned with the launch
// checklist: Timeline → Nomination form → Judging (judges, criteria, results,
// charity), then the remaining setup extras (sponsors) below.
//
// `sectionStyle` maps each id to a CSS flex `order`, so THIS list — not DOM
// source order — is the single source of truth for vertical ordering. That
// lets us realign sections without physically moving large JSX blocks.
// Sections that don't apply (no judges / no charity) sort to the bottom.
//
// The participation-driving sections (events, double-vote days, bonus votes,
// video prompts) now live on their own EngagementTab.
const SECTION_ORDER = [
  'competitionDetails',
  // Locks at publish — get these right before going public (grouped first).
  'nominationForm',
  'timeline',
  'judgingCriteria',
  'charity',
  // Editable anytime — adjust whenever, even after going live.
  'hosts',
  'judges',
  'sponsors',
];

/**
 * LockedSection — a grayed-out, inaccessible placeholder for a Setup section
 * that doesn't apply to this competition (e.g. no charity, or no judges
 * because winners are decided by public vote). Stays visible so the host can
 * see it exists, but is dimmed and non-interactive.
 */
function LockedSection({ title, icon: Icon = Lock, reason }) {
  return (
    <div style={{
      background: colors.background.card,
      border: `1px solid ${colors.border.light}`,
      borderRadius: borderRadius.xxl,
      boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
      opacity: 0.5,
      pointerEvents: 'none',
      padding: spacing.xl,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs }}>
        <Icon size={22} style={{ color: colors.gold.primary }} />
        <span style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.semibold, color: colors.text.primary }}>{title}</span>
        <Lock size={16} style={{ color: colors.text.muted, marginLeft: 'auto' }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, color: colors.text.muted, fontSize: typography.fontSize.sm }}>
        <Lock size={14} style={{ flexShrink: 0 }} />
        <span>{reason}</span>
      </div>
    </div>
  );
}

/**
 * SetupTab - Configuration settings tab
 * Contains competition details, hosts, timeline, nomination form, judging,
 * sponsors, and charity. Participation tools live on EngagementTab.
 */
export default function SetupTab({
  competition,
  focusSection,
  host,
  coHosts = [],
  canManageHosts = false,
  onShowHostAssignment,
  onShowAddCoHost,
  onRemoveCoHost,
  judges = [],
  onOpenJudgeModal,
  onDeleteJudge,
  onSendJudgeInvite,
  judgingCriteria = [],
  sponsors,
  isSuperAdmin = false,
  onRefresh,
  onAddCriterion,
  onUpdateCriterion,
  onDeleteCriterion,
  onUpdateRoundJudgeWeight,
  onDeleteSponsor,
  onOpenSponsorModal,
  onOpenCharityModal,
}) {
  const { isMobile } = useResponsive();

  // ---- Grayed-out Setup sections ----
  // Hosts can gray out sections they aren't using; grayed sections render
  // dimmed and sort to the bottom. Mirrored locally for an instant toggle,
  // then persisted on the competition row.
  const [hiddenSections, setHiddenSections] = useState(
    () => competition?.hiddenSetupSections || []
  );

  useEffect(() => {
    setHiddenSections(competition?.hiddenSetupSections || []);
  }, [competition?.hiddenSetupSections]);

  const isHidden = (id) => hiddenSections.includes(id);

  // ---- Deep-link focus from the launch checklist ----
  // A checklist CTA can target a section ({ id, nonce }); the matching Panel
  // opens expanded and we scroll it into view. The nonce makes repeat clicks
  // on the same step re-trigger the scroll.
  const focusId = focusSection?.id || null;
  const focusNonce = focusSection?.nonce || null;

  useEffect(() => {
    if (!focusId) return undefined;
    const t = setTimeout(() => {
      const el = document.getElementById(`setup-section-${focusId}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
    return () => clearTimeout(t);
  }, [focusId, focusNonce]);

  const sectionStyle = (id) => {
    const idx = SECTION_ORDER.indexOf(id);
    // Sections that don't apply to this competition's configuration are grayed
    // out and sink below the active ones.
    const usesJudgesLocal = ['judges', 'hybrid'].includes(competition?.selectionCriteria);
    const charityActive = !!competition?.charityPercentage || !!competition?.charityName;
    const locked =
      (!usesJudgesLocal && id === 'judgingCriteria') ||
      (!charityActive && id === 'charity');
    return { order: locked ? 100 + idx : 1 + idx, opacity: 1 };
  };

  // Whether a section applies is driven by what the host entered in their
  // competition details (e.g. charity / judging), not a manual "not using"
  // toggle — so the header just shows the section's own action.
  const sectionAction = (id, ownAction) => ownAction || null;

  // What the host actually configured drives which Setup sections apply:
  //  - charity panel is only relevant if they're donating a % of proceeds
  //  - judging is only relevant if winners are decided by judges (not pure votes)
  const charityApplies = !!competition?.charityPercentage || !!competition?.charityName;
  const usesJudges = ['judges', 'hybrid'].includes(competition?.selectionCriteria);
  // These public-facing sections only actually lock once the competition is
  // published (publish-lock tier) — show the lock badge only then.
  const publishLocked = !isFieldEditable('nomination_form', competition?.status);

  // Per-section editability badges so the host knows, at a glance, which
  // sections lock when they publish vs. which stay editable throughout.
  const badgeBase = {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: `2px ${spacing.sm}`, borderRadius: '999px',
    fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.medium,
    whiteSpace: 'nowrap',
  };
  const lockBadge = (
    <span style={{ ...badgeBase, background: 'rgba(212,175,55,0.12)', color: colors.gold.primary, border: '1px solid rgba(212,175,55,0.3)' }}>
      <Lock size={11} /> {publishLocked ? 'Locked' : 'Locks at publish'}
    </span>
  );
  const editBadge = (
    <span style={{ ...badgeBase, background: 'rgba(255,255,255,0.05)', color: colors.text.muted, border: `1px solid ${colors.border.lighter}` }}>
      Editable anytime
    </span>
  );

  return (
    <div className="er-setup" style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Scoped form polish — a gold focus ring + custom select chevron so the
          Setup tab's inputs feel consistent with the create wizard. Uses a
          box-shadow ring (works regardless of each control's inline border). */}
      <style>{`
        .er-setup input:focus, .er-setup select:focus, .er-setup textarea:focus {
          outline: none;
          box-shadow: 0 0 0 3px rgba(212,175,55,0.15);
          border-color: ${colors.gold.primary} !important;
        }
        .er-setup input, .er-setup select, .er-setup textarea {
          transition: box-shadow .15s ease, border-color .15s ease;
        }
      `}</style>
      {/* Competition details — the same recap the host sees on the Dashboard, so
          Setup is aligned with what they entered during onboarding. Editable in
          draft, locked thereafter (handled inside the card). */}
      <div style={{ ...sectionStyle('competitionDetails'), marginBottom: spacing.xxl }}>
        <CompetitionSummaryCard competition={competition} onRefresh={onRefresh} />
      </div>

      {/* Intro for the publish-locked, public-facing sections below. */}
      <div style={{ order: 1, marginBottom: spacing.lg }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
          <Lock size={16} style={{ color: colors.gold.primary }} />
          <h3 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, margin: 0 }}>Important Information</h3>
        </div>
        <p style={{ color: colors.text.muted, fontSize: typography.fontSize.sm, margin: `${spacing.xs} 0 0`, lineHeight: 1.6 }}>
          This is the public-facing information for your competition. Some of it{' '}
          <span style={{ color: colors.gold.primary }}>locks when you publish</span> — get the{' '}
          nomination form, voting &amp; judging dates, judging criteria &amp; weight, and your charity
          partner right before you go public. Your{' '}
          <span style={{ color: colors.text.secondary }}>host, judges, and sponsors stay editable anytime</span>,
          even after you’re live.
        </p>
      </div>

      {/* Hosts (creator + co-hosts) — moved here from the People tab. */}
      <div style={{ ...sectionStyle('hosts'), marginBottom: spacing.xxl }}>
        <HostsPanel
          host={host}
          coHosts={coHosts}
          competition={competition}
          canManage={canManageHosts}
          badge={editBadge}
          isMobile={isMobile}
          onShowHostAssignment={onShowHostAssignment}
          onShowAddCoHost={onShowAddCoHost}
          onRemoveCoHost={onRemoveCoHost}
          onRefresh={onRefresh}
        />
      </div>

      {/* Voting Details (voting/judging rounds + finale) */}
      <Panel
        key={`section-timeline-${focusId === 'timeline' ? focusNonce : 'x'}`}
        id="setup-section-timeline"
        style={sectionStyle('timeline')}
        title="Voting Details"
        icon={Calendar}
        locked={publishLocked}
        badge={lockBadge}
        collapsible
        defaultCollapsed={focusId !== 'timeline'}
      >
        <div style={{ padding: isMobile ? spacing.md : spacing.xl }}>
          <TimelineSettings competition={competition} onSave={onRefresh} isSuperAdmin={isSuperAdmin} />
        </div>
      </Panel>

      {/* Nomination Form — checklist step 4. Lives here in Setup (not Content)
          so the launch flow's build steps (timeline → form → judging → events)
          all sit in one tab, in order. */}
      <NominationFormEditor
        key={`section-nominationForm-${focusId === 'nominationForm' ? focusNonce : 'x'}`}
        id="setup-section-nominationForm"
        style={sectionStyle('nominationForm')}
        competition={competition}
        onSave={onRefresh}
        locked={publishLocked}
        badge={lockBadge}
        collapsible
        defaultCollapsed={focusId !== 'nominationForm'}
      />

      {/* Judging criteria + results. Only relevant when winners are decided by
          judges (or a hybrid). For pure public-vote competitions these are
          grayed out and inaccessible. */}
      {/* Judging criteria + weight — locks at publish. The judge roster lives in
          its own section below (editable anytime), so locked vs. editable group
          cleanly. */}
      {usesJudges ? (
        <div id="setup-section-judgingCriteria" style={sectionStyle('judgingCriteria')}>
          <JudgingPanel
            competition={competition}
            criteria={judgingCriteria}
            votingRounds={competition?.voting_rounds || []}
            onAddCriterion={onAddCriterion}
            onUpdateCriterion={onUpdateCriterion}
            onDeleteCriterion={onDeleteCriterion}
            onUpdateRoundJudgeWeight={onUpdateRoundJudgeWeight}
            onRefresh={onRefresh}
            locked={publishLocked}
            badge={lockBadge}
          />
        </div>
      ) : (
        <div id="setup-section-judgingCriteria" style={sectionStyle('judgingCriteria')}>
          <LockedSection
            title="Judging"
            icon={CheckCircle}
            reason="Not used — winners are decided by public votes. Switch “How they win” to Judges or Votes + judges to set this up."
          />
        </div>
      )}

      {/* Judge roster — invite/manage; editable any time, so it's grouped with
          the other always-editable sections. */}
      {usesJudges && (
        <div id="setup-section-judges" style={sectionStyle('judges')}>
          <JudgesManager
            judges={judges}
            onOpenJudgeModal={onOpenJudgeModal}
            onDeleteJudge={onDeleteJudge}
            onSendJudgeInvite={onSendJudgeInvite}
            badge={editBadge}
          />
        </div>
      )}

      {/* Sponsors — view, add, edit, and remove. Sponsors appear publicly on
          the competition's Prizes/Rewards page, but can be managed any time, so
          this isn't part of the publish-locked group above. */}
      <Panel
        key={`section-sponsors-${focusId === 'sponsors' ? focusNonce : 'x'}`}
        id="setup-section-sponsors"
        title={`Sponsors (${sponsors.length})`}
        icon={Star}
        badge={editBadge}
        action={sectionAction('sponsors', <Button size="sm" icon={Plus} onClick={() => onOpenSponsorModal(null)}>Add Sponsor</Button>)}
        collapsible
        defaultCollapsed={focusId !== 'sponsors'}
        style={sectionStyle('sponsors')}
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

      {/* Charity Section — only relevant if the host is donating a % of
          proceeds. Otherwise it's grayed out and inaccessible. */}
      {!charityApplies ? (
        <div id="setup-section-charity" style={sectionStyle('charity')}>
          <LockedSection
            title="Charity Partner"
            icon={Gift}
            reason="Not used — you chose not to donate a portion of proceeds. Turn charity on in your competition details to set this up."
          />
        </div>
      ) : (
      <Panel
        key={`section-charity-${isHidden('charity')}-${focusId === 'charity' ? focusNonce : 'x'}`}
        id="setup-section-charity"
        title="Charity Partner"
        icon={Gift}
        locked={publishLocked}
        badge={lockBadge}
        action={sectionAction('charity',
          <Button size="sm" icon={competition?.charityName ? Edit2 : Plus} onClick={onOpenCharityModal}>
            {competition?.charityName ? 'Edit' : 'Add Charity'}
          </Button>
        )}
        collapsible
        defaultCollapsed={focusId !== 'charity'}
        style={sectionStyle('charity')}
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
      )}
    </div>
  );
}
