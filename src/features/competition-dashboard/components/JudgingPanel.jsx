import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Check, X, Sliders, Award } from 'lucide-react';
import { Button, Panel, Input } from '../../../components/ui';
import { colors, spacing, borderRadius, typography } from '../../../styles/theme';

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
  criteria = [],
  votingRounds = [],
  onAddCriterion,
  onUpdateCriterion,
  onDeleteCriterion,
  onUpdateRoundJudgeWeight,
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

  return (
    <>
      {/* Criteria */}
      <Panel
        title={`Judging Criteria (${criteria.length})`}
        icon={Award}
        collapsible
        defaultCollapsed
        action={
          !adding && !editingId && (
            <Button size="sm" icon={Plus} onClick={(e) => { e.stopPropagation(); startAdd(); }}>
              Add Criterion
            </Button>
          )
        }
      >
        <div style={{ padding: spacing.xl, display: 'flex', flexDirection: 'column', gap: spacing.md }}>
          <p style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary, marginTop: -spacing.sm }}>
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
                    border: `1px solid rgba(var(--color-error-rgb),0.3)`,
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
      </Panel>

      {/* Round Weights */}
      <Panel
        title="Judging Round"
        icon={Sliders}
        collapsible
        defaultCollapsed
      >
        <div style={{ padding: spacing.xl, display: 'flex', flexDirection: 'column', gap: spacing.md }}>
          <p style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary, marginTop: -spacing.sm }}>
            Pick the single round judges score, and how much their scores count toward who advances. 0% means votes decide that round; 100% means judges decide; anything between is a blend (e.g. 60% judges + 40% votes). Only one round can be a judging round at a time.
          </p>

          <JudgingRoundSummary votingRounds={votingRounds} />

          {votingRounds.length === 0 ? (
            <p style={{ color: colors.text.muted, fontSize: typography.fontSize.sm }}>
              Add voting rounds in the Timeline first.
            </p>
          ) : (
            [...votingRounds]
              .sort((a, b) => (a.round_order || 0) - (b.round_order || 0))
              .map((r) => (
                <RoundWeightRow
                  key={r.id}
                  round={r}
                  votingRounds={votingRounds}
                  onUpdate={onUpdateRoundJudgeWeight}
                />
              ))
          )}
        </div>
      </Panel>
    </>
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

function RoundWeightRow({ round, votingRounds, onUpdate }) {
  const [weight, setWeight] = useState(round.judge_weight ?? 0);
  const [saving, setSaving] = useState(false);
  const dirty = weight !== (round.judge_weight ?? 0);

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
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.md,
      background: colors.background.card,
      border: `1px solid ${colors.border.primary}`,
      borderRadius: borderRadius.md,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontWeight: typography.fontWeight.semibold }}>
          {round.title || `Round ${round.round_order || ''}`}
        </p>
        <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, marginTop: 2 }}>
          {weight === 0 ? '100% votes' : weight === 100 ? '100% judges' : `${weight}% judges · ${100 - weight}% votes`}
          {round.contestants_advance > 0 && ` · top ${round.contestants_advance} advance`}
        </p>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={weight}
        onChange={(e) => setWeight(parseInt(e.target.value, 10))}
        style={{ width: 140, accentColor: colors.gold.primary }}
      />
      <input
        type="number"
        min={0}
        max={100}
        value={weight}
        onChange={(e) => setWeight(Math.max(0, Math.min(100, parseInt(e.target.value || '0', 10))))}
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
    </div>
  );
}
