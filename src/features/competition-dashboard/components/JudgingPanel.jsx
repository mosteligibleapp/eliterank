import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Check, X, Sliders, Award, Calendar, CheckCircle2, Circle } from 'lucide-react';
import { Button, Panel, Input } from '../../../components/ui';
import { colors, spacing, borderRadius, typography } from '../../../styles/theme';
import { supabase } from '../../../lib/supabase';

/**
 * JudgingPanel — host-side controls for the judging system.
 *
 * Two sections:
 *  1. Criteria — host-defined qualities scored 1–10. Same set is reused across
 *     every judging round (holistic per-person scoring).
 *  2. Round Weights — for each round, the host picks how much judges count
 *     toward advancement (0–100%). 0 = pure voting (current default).
 */

export default function JudgingPanel({
  competition,
  criteria = [],
  votingRounds = [],
  onAddCriterion,
  onUpdateCriterion,
  onDeleteCriterion,
  onUpdateRoundJudgeWeight,
  onRefresh,
  locked = false,
  badge,
}) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({ label: '', description: '', weight: 1 });
  const [busy, setBusy] = useState(false);

  const startAdd = () => {
    setDraft({ label: '', description: '', weight: 1 });
    setAdding(true);
    setEditingId(null);
  };

  const startEdit = (c) => {
    setDraft({ label: c.label, description: c.description || '', weight: c.weight ?? 1 });
    setEditingId(c.id);
    setAdding(false);
  };

  const cancel = () => {
    setAdding(false);
    setEditingId(null);
    setDraft({ label: '', description: '', weight: 1 });
  };

  const submit = async () => {
    if (!draft.label.trim()) return;
    setBusy(true);
    try {
      if (editingId) {
        await onUpdateCriterion?.(editingId, {
          label: draft.label.trim(),
          description: draft.description.trim() || null,
          weight: parseFloat(draft.weight) || 1,
        });
      } else {
        await onAddCriterion?.({
          label: draft.label.trim(),
          description: draft.description.trim() || null,
          weight: parseFloat(draft.weight) || 1,
        });
      }
      cancel();
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this criterion? Any scores recorded against it will also be deleted.')) return;
    setBusy(true);
    try {
      await onDeleteCriterion?.(id);
    } finally {
      setBusy(false);
    }
  };

  const editor = (
    <div style={{
      padding: spacing.md,
      background: colors.background.card,
      border: `1px solid ${colors.border.primary}`,
      borderRadius: borderRadius.md,
      display: 'flex',
      flexDirection: 'column',
      gap: spacing.sm,
    }}>
      <Input
        label="Criterion label"
        value={draft.label}
        onChange={(e) => setDraft(d => ({ ...d, label: e.target.value }))}
        placeholder='e.g. "Stage Presence"'
        autoFocus
      />
      <Input
        label="Description (optional)"
        value={draft.description}
        onChange={(e) => setDraft(d => ({ ...d, description: e.target.value }))}
        placeholder="What should judges look for?"
      />
      <Input
        label="Weight"
        type="number"
        min={0.1}
        step={0.1}
        value={draft.weight}
        onChange={(e) => setDraft(d => ({ ...d, weight: e.target.value }))}
      />
      <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, marginTop: -spacing.xs }}>
        Weight multiplies the 1–10 score. Default 1 means it counts equally with other criteria.
      </p>
      <div style={{ display: 'flex', gap: spacing.sm, justifyContent: 'flex-end' }}>
        <Button variant="secondary" size="sm" icon={X} onClick={cancel} disabled={busy}>
          Cancel
        </Button>
        <Button size="sm" icon={Check} onClick={submit} disabled={busy || !draft.label.trim()}>
          {editingId ? 'Save' : 'Add criterion'}
        </Button>
      </div>
    </div>
  );

  const sectionLabel = { fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, textTransform: 'uppercase', letterSpacing: 0.5, color: colors.text.muted };

  // Judging happens in exactly one round — the one with judge_weight > 0.
  const sortedRounds = [...votingRounds].sort((a, b) => (a.round_order || 0) - (b.round_order || 0));
  const judgingRound = votingRounds.find((r) => (r.judge_weight || 0) > 0) || null;
  const competitionId = competition?.id;

  // ── Guided judging layout ────────────────────────────────────────────────
  // There's only ever one judging round, and only two sensible places for it.
  // The host picks one and we set it up as a default they can then fine-tune:
  //   • blend    — judges score the LAST voting round (votes + judges together)
  //   • separate — a dedicated judging round right AFTER voting closes
  const votingTypeRounds = sortedRounds.filter((r) => r.round_type === 'voting');
  const lastVotingRound = votingTypeRounds.length ? votingTypeRounds[votingTypeRounds.length - 1] : null;
  const separateJudgingRound = sortedRounds.find((r) => r.round_type === 'judging') || null;
  const judgingMode = !judgingRound ? 'none' : (judgingRound.round_type === 'judging' ? 'separate' : 'blend');

  // A separate judging round is always 100% judges. Normalize any stray value
  // below 100 (e.g. from an earlier build where it was adjustable). Guard on
  // !== 100 so this writes once and then no-ops after the refetch.
  useEffect(() => {
    if (separateJudgingRound && (separateJudgingRound.judge_weight || 0) !== 100) {
      supabase
        .from('voting_rounds')
        .update({ judge_weight: 100 })
        .eq('id', separateJudgingRound.id)
        .then(() => onRefresh?.());
    }
  }, [separateJudgingRound?.id, separateJudgingRound?.judge_weight, onRefresh]);

  // Blend judging into the final voting round (judges 60%+ — the skill-contest floor).
  const applyBlend = async () => {
    if (!lastVotingRound || busy) return;
    if (separateJudgingRound &&
      !window.confirm('Move judging into your final voting round? This removes the separate judging round you added.')) return;
    setBusy(true);
    try {
      if (separateJudgingRound) {
        await supabase.from('voting_rounds').delete().eq('id', separateJudgingRound.id);
      }
      // Clear any stray weight on other rounds, then blend into the last round.
      for (const r of sortedRounds) {
        if (r.id !== lastVotingRound.id && r.id !== separateJudgingRound?.id && (r.judge_weight || 0) > 0) {
          await supabase.from('voting_rounds').update({ judge_weight: 0 }).eq('id', r.id);
        }
      }
      // Judges must control at least 60% of the deciding round (skill-contest
      // requirement). Blend defaults to 60% and never goes below it.
      const w = Math.max(60, lastVotingRound.judge_weight || 0);
      await supabase.from('voting_rounds').update({ judge_weight: w }).eq('id', lastVotingRound.id);
      onRefresh?.();
    } finally { setBusy(false); }
  };

  // A dedicated judging round right after voting (judges decide; 100% default).
  const applySeparate = async () => {
    if (!lastVotingRound || busy) return;
    setBusy(true);
    try {
      // Voting rounds carry no judge weight in this layout.
      for (const r of votingTypeRounds) {
        if ((r.judge_weight || 0) > 0) await supabase.from('voting_rounds').update({ judge_weight: 0 }).eq('id', r.id);
      }
      if (separateJudgingRound) {
        // A separate judging round is always 100% judges — never less.
        await supabase.from('voting_rounds').update({ judge_weight: 100 }).eq('id', separateJudgingRound.id);
      } else {
        // Create it right after the last voting round: starts when voting ends,
        // runs ~5 days, judges decide, advancing to the number of winners.
        const start = lastVotingRound.end_date || null;
        const end = start ? new Date(new Date(start).getTime() + 5 * 86400000).toISOString() : null;
        const maxOrder = Math.max(0, ...sortedRounds.map((r) => r.round_order || 0));
        const advance = competition?.numberOfWinners || competition?.number_of_winners || lastVotingRound.contestants_advance || 1;
        const { error } = await supabase.from('voting_rounds').insert({
          competition_id: competitionId,
          title: 'Judging Round',
          round_type: 'judging',
          round_order: maxOrder + 1,
          start_date: start,
          end_date: end,
          contestants_advance: advance,
          judge_weight: 100,
        });
        if (error) throw error;
        // Tie the finale to just after judging ends.
        if (competitionId && end) {
          const finale = new Date(new Date(end).getTime() + 60000).toISOString();
          await supabase.from('competitions').update({ finals_date: finale }).eq('id', competitionId);
        }
      }
      onRefresh?.();
    } catch (err) {
      window.alert(`Could not set up the judging round: ${err.message || err}`);
    } finally { setBusy(false); }
  };

  // A pickable layout card.
  const layoutCard = ({ active, title, desc, onClick }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      style={{
        textAlign: 'left', cursor: busy ? 'default' : 'pointer',
        padding: spacing.md, borderRadius: borderRadius.md,
        background: active ? 'rgba(212,175,55,0.08)' : colors.background.card,
        border: `1px solid ${active ? colors.gold.primary : colors.border.primary}`,
        display: 'flex', flexDirection: 'column', gap: spacing.xs,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs }}>
        {active
          ? <CheckCircle2 size={15} style={{ color: colors.gold.primary, flexShrink: 0 }} />
          : <Circle size={15} style={{ color: colors.text.muted, flexShrink: 0 }} />}
        <span style={{ fontWeight: typography.fontWeight.semibold, fontSize: typography.fontSize.sm }}>{title}</span>
      </div>
      <span style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, lineHeight: 1.4 }}>{desc}</span>
    </button>
  );

  return (
    <Panel title="Judging" icon={Award} locked={locked} badge={badge} collapsible defaultCollapsed>
      <div style={{ padding: spacing.xl }}>
        {/* Criteria */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, marginBottom: spacing.sm }}>
          <span style={sectionLabel}>Criteria ({criteria.length})</span>
          {!adding && !editingId && (
            <Button size="sm" icon={Plus} onClick={startAdd}>Add Criterion</Button>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
          <p style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>
            Judges score each contestant 1–10 on every criterion. Keep them broad and holistic — overall qualities, not narrow checklists. The same criteria are reused across every judging round.
          </p>

          {criteria.length === 0 && !adding && (
            <div style={{
              textAlign: 'center',
              padding: spacing.xl,
              color: colors.text.muted,
              background: colors.background.card,
              border: `1px dashed ${colors.border.primary}`,
              borderRadius: borderRadius.md,
            }}>
              <p style={{ fontSize: typography.fontSize.sm, marginBottom: spacing.sm }}>No criteria yet.</p>
              <p style={{ fontSize: typography.fontSize.xs }}>
                A typical setup uses 3–5 qualities like &ldquo;Stage Presence&rdquo;, &ldquo;Personality&rdquo;, and &ldquo;Overall Impression&rdquo;.
              </p>
            </div>
          )}

          {criteria.map((c) => (
            editingId === c.id ? (
              <div key={c.id}>{editor}</div>
            ) : (
              <div key={c.id} style={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing.md,
                padding: spacing.md,
                background: colors.background.card,
                border: `1px solid ${colors.border.primary}`,
                borderRadius: borderRadius.md,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: typography.fontWeight.semibold }}>
                    {c.label}
                    {c.weight !== 1 && (
                      <span style={{
                        marginLeft: spacing.sm,
                        fontSize: typography.fontSize.xs,
                        color: colors.gold.primary,
                        fontWeight: typography.fontWeight.regular,
                      }}>
                        weight ×{c.weight}
                      </span>
                    )}
                  </p>
                  {c.description && (
                    <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, marginTop: 2 }}>
                      {c.description}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => startEdit(c)}
                  title="Edit criterion"
                  style={{
                    padding: spacing.sm,
                    background: 'transparent',
                    border: `1px solid ${colors.border.primary}`,
                    borderRadius: borderRadius.md,
                    color: colors.text.secondary,
                    cursor: 'pointer',
                  }}
                >
                  <Edit2 size={14} />
                </button>
                <button
                  onClick={() => handleDelete(c.id)}
                  title="Delete criterion"
                  style={{
                    padding: spacing.sm,
                    background: 'transparent',
                    border: `1px solid rgba(239,68,68,0.3)`,
                    borderRadius: borderRadius.md,
                    color: colors.status.error,
                    cursor: 'pointer',
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )
          ))}

          {adding && editor}
        </div>

        {/* Judging round — weight + date, all here (not in the voting timeline) */}
        <div style={{ borderTop: `1px solid ${colors.border.primary}`, marginTop: spacing.xl, paddingTop: spacing.lg }}>
          <span style={sectionLabel}>Judging round</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md, marginTop: spacing.md }}>
          <p style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>
            Pick how judging fits your timeline — we’ll set it up, and you can fine-tune the weight and dates below. There’s only ever one judging round.
          </p>

          {votingTypeRounds.length === 0 ? (
            <p style={{ color: colors.text.muted, fontSize: typography.fontSize.sm }}>
              Add a voting round in Voting Details first, then choose a judging layout here.
            </p>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: spacing.md }}>
                {layoutCard({
                  active: judgingMode === 'blend',
                  title: 'Judges score your final round',
                  desc: 'Judges decide your last voting round, with public votes influencing it (judges 60%+; adjustable).',
                  onClick: applyBlend,
                })}
                {layoutCard({
                  active: judgingMode === 'separate',
                  title: 'Separate round after voting',
                  desc: 'After voting closes, judges score the finalists in a dedicated round (judges decide).',
                  onClick: applySeparate,
                })}
              </div>

              {judgingMode === 'none' && (
                <p style={{ color: colors.status.error, fontSize: typography.fontSize.xs }}>
                  Your competition is judged — pick one of the layouts above to set up the judging round.
                </p>
              )}

              {judgingRound && (
                <RoundWeightRow
                  key={judgingRound.id}
                  round={judgingRound}
                  competitionId={competitionId}
                  votingRounds={votingRounds}
                  onUpdate={onUpdateRoundJudgeWeight}
                  onRefresh={onRefresh}
                />
              )}
            </>
          )}
        </div>
      </div>
    </Panel>
  );
}

function JudgingRoundSummary({ votingRounds }) {
  const active = (votingRounds || []).find(r => (r.judge_weight || 0) > 0);
  const label = active
    ? `${active.title || `Round ${active.round_order || ''}`} — ${active.judge_weight}% judges${active.judge_weight < 100 ? ` · ${100 - active.judge_weight}% votes` : ''}`
    : 'No judging round selected. All rounds are decided by votes.';
  return (
    <div style={{
      padding: spacing.md,
      background: active ? 'rgba(212,175,55,0.08)' : 'rgba(255,255,255,0.03)',
      border: `1px solid ${active ? 'rgba(212,175,55,0.3)' : colors.border.primary}`,
      borderRadius: borderRadius.md,
      fontSize: typography.fontSize.sm,
      color: active ? colors.gold.primary : colors.text.secondary,
      fontWeight: typography.fontWeight.medium,
    }}>
      <span style={{ color: colors.text.muted, fontSize: typography.fontSize.xs, letterSpacing: '0.1em', textTransform: 'uppercase', marginRight: spacing.sm }}>
        Judging round:
      </span>
      {label}
    </div>
  );
}

function RoundWeightRow({ round, competitionId, votingRounds, onUpdate, onRefresh }) {
  const [weight, setWeight] = useState(round.judge_weight ?? 0);
  const [saving, setSaving] = useState(false);
  const dirty = weight !== (round.judge_weight ?? 0);

  // When this round is the judging round, its date is editable right here
  // (a direct field write — the round still lives in the voting schedule).
  const isJudgingRound = (round.judge_weight ?? 0) > 0;
  // Blend = judging rides on the final voting round; separate = a dedicated
  // judging round after voting. Drives the labels so "judging on a voting
  // round" reads intentionally instead of looking like a mislabel.
  const isBlendRound = (round.round_type || 'voting') !== 'judging';
  const toLocal = (v) => (v ? String(v).slice(0, 16) : '');
  const [start, setStart] = useState(toLocal(round.start_date));
  const [end, setEnd] = useState(toLocal(round.end_date));
  const [savingDates, setSavingDates] = useState(false);
  const datesDirty = start !== toLocal(round.start_date) || end !== toLocal(round.end_date);
  const saveDates = async () => {
    setSavingDates(true);
    try {
      await supabase.from('voting_rounds').update({ start_date: start || null, end_date: end || null }).eq('id', round.id);
      // The finale is tied to the end of judging: default it to 1 minute after
      // (host can push it up to 24h later in Voting Details).
      if (competitionId && end) {
        const d = new Date(end);
        if (!Number.isNaN(d.getTime())) {
          d.setMinutes(d.getMinutes() + 1);
          await supabase.from('competitions').update({ finals_date: d.toISOString() }).eq('id', competitionId);
        }
      }
      onRefresh?.();
    } finally {
      setSavingDates(false);
    }
  };
  const dateInput = {
    flex: 1, padding: `${spacing.xs} ${spacing.sm}`, background: colors.background.secondary,
    border: `1px solid ${colors.border.primary}`, borderRadius: borderRadius.sm, color: colors.text.primary,
    fontSize: typography.fontSize.sm, colorScheme: 'dark',
  };

  const save = async () => {
    // Enforce: only one round can have judge_weight > 0 at a time.
    // If the host is turning judging ON for this round and another round
    // already has it, confirm the switch and zero out the other one first.
    if (weight > 0) {
      const other = (votingRounds || []).find(
        r => r.id !== round.id && (r.judge_weight || 0) > 0
      );
      if (other) {
        const otherName = other.title || `Round ${other.round_order || ''}`;
        const thisName = round.title || `Round ${round.round_order || ''}`;
        const ok = window.confirm(
          `${otherName} is currently the judging round (${other.judge_weight}% judges).\n\nOnly one round can be judged at a time. Move judging to ${thisName} instead?`
        );
        if (!ok) return;
        setSaving(true);
        try {
          await onUpdate?.(other.id, 0);
          await onUpdate?.(round.id, weight);
        } finally {
          setSaving(false);
        }
        return;
      }
    }
    setSaving(true);
    try {
      await onUpdate?.(round.id, weight);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: spacing.sm,
      padding: spacing.md,
      background: colors.background.card,
      border: `1px solid ${isJudgingRound ? 'rgba(212,175,55,0.3)' : colors.border.primary}`,
      borderRadius: borderRadius.md,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontWeight: typography.fontWeight.semibold, display: 'flex', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' }}>
            {isBlendRound ? 'Your final voting round' : 'Dedicated judging round'}
            <span style={{ fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.regular, color: colors.text.muted }}>
              · {round.title || `Round ${round.round_order || ''}`}
            </span>
          </p>
          <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, marginTop: 2 }}>
            {isBlendRound
              ? `Judges score this round alongside public votes — ${weight}% judges · ${100 - weight}% votes.`
              : 'Judges alone decide this round after voting closes — 100% judges.'}
            {round.contestants_advance > 0 && ` Top ${round.contestants_advance} advance.`}
          </p>
        </div>
        {isBlendRound ? (
          <>
            <input
              type="range"
              min={60}
              max={100}
              step={5}
              value={weight}
              onChange={(e) => setWeight(Math.max(60, parseInt(e.target.value, 10)))}
              style={{ width: 140, accentColor: colors.gold.primary }}
            />
            <input
              type="number"
              min={60}
              max={100}
              value={weight}
              onChange={(e) => setWeight(Math.max(60, Math.min(100, parseInt(e.target.value || '60', 10))))}
              style={{
                width: 60,
                padding: `${spacing.xs} ${spacing.sm}`,
                background: colors.background.secondary,
                border: `1px solid ${colors.border.primary}`,
                borderRadius: borderRadius.sm,
                color: colors.text.primary,
                textAlign: 'right',
                fontSize: typography.fontSize.sm,
              }}
            />
            <span style={{ color: colors.text.muted, fontSize: typography.fontSize.sm }}>%</span>
            <Button size="sm" disabled={!dirty || saving} onClick={save}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </>
        ) : (
          // A separate judging round is always 100% judges — fixed, not adjustable.
          <span style={{
            display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap',
            padding: `${spacing.xs} ${spacing.md}`, borderRadius: borderRadius.sm,
            background: 'rgba(212,175,55,0.12)', border: `1px solid ${colors.gold.primary}55`,
            color: colors.gold.primary, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold,
          }}>
            100% judges
          </span>
        )}
      </div>

      {isJudgingRound && (
        <div style={{ borderTop: `1px solid ${colors.border.primary}`, paddingTop: spacing.sm }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xs }}>
            <Calendar size={13} style={{ color: colors.gold.primary }} />
            <span style={{ fontSize: typography.fontSize.xs, color: colors.text.muted }}>
              {isBlendRound ? 'When your final round runs (judging rides along)' : 'When judging runs'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: spacing.sm, flexWrap: 'wrap' }}>
            <label style={{ flex: 1, minWidth: 150 }}>
              <span style={{ display: 'block', fontSize: typography.fontSize.xs, color: colors.text.muted, marginBottom: 2 }}>Opens</span>
              <input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} style={dateInput} />
            </label>
            <label style={{ flex: 1, minWidth: 150 }}>
              <span style={{ display: 'block', fontSize: typography.fontSize.xs, color: colors.text.muted, marginBottom: 2 }}>Closes</span>
              <input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} style={dateInput} />
            </label>
            <Button size="sm" variant="secondary" disabled={!datesDirty || savingDates} onClick={saveDates} style={{ width: 'auto' }}>
              {savingDates ? 'Saving…' : 'Save dates'}
            </Button>
          </div>
          <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, marginTop: spacing.xs, lineHeight: 1.4 }}>
            Saving sets the finale to 1 minute after judging ends. You can push it up to 24 hours later in Voting Details.
          </p>
        </div>
      )}
    </div>
  );
}
