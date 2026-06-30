import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Check, X, Award } from 'lucide-react';
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
  competition,
  criteria = [],
  votingRounds = [],
  onAddCriterion,
  onUpdateCriterion,
  onDeleteCriterion,
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

  // Judging happens in exactly one round — the one with judge_weight > 0. Its
  // layout (votes + judges, or judges-only), weight and dates are configured
  // inline on the final round in Voting Details now. Here we only show a
  // read-only summary plus the shared scoring criteria.
  const judgingRound = votingRounds.find((r) => (r.judge_weight || 0) > 0) || null;
  const judgingIsSeparate = !!judgingRound && ((judgingRound.round_type === 'judging') || (judgingRound.judge_weight || 0) >= 100);
  const judgingRoundName = judgingRound ? (judgingRound.title || `Round ${judgingRound.round_order || ''}`) : '';
  const judgingSummary = !judgingRound
    ? null
    : judgingIsSeparate
      ? `${judgingRoundName} — judges only (100%)`
      : `${judgingRoundName} — ${judgingRound.judge_weight}% judges · ${100 - judgingRound.judge_weight}% votes`;

  return (
    <Panel title="Judging" icon={Award} locked={locked} badge={badge} collapsible defaultCollapsed>
      <div style={{ padding: spacing.xl }}>
        {/* Criteria */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, marginBottom: spacing.sm }}>
          <span style={sectionLabel}>Criteria ({criteria.length})</span>
          {!adding && !editingId && !locked && (
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
                {!locked && (<>
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
                </>)}
              </div>
            )
          ))}

          {adding && editor}
        </div>

        {/* Judging round — now configured inline on the final round in Voting
            Details (one source of truth). Here we just summarize it. */}
        <div style={{ borderTop: `1px solid ${colors.border.primary}`, marginTop: spacing.xl, paddingTop: spacing.lg }}>
          <span style={sectionLabel}>Judging round</span>
        </div>
        <div style={{ marginTop: spacing.md }}>
          {judgingRound ? (
            <div style={{
              padding: spacing.md, borderRadius: borderRadius.md,
              background: 'rgba(212,175,55,0.08)', border: `1px solid ${colors.gold.primary}55`,
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: spacing.xs, color: colors.gold.primary, fontWeight: typography.fontWeight.semibold, fontSize: typography.fontSize.sm }}>
                <Award size={15} style={{ flexShrink: 0 }} /> {judgingSummary}
              </span>
              <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, marginTop: spacing.xs, lineHeight: 1.4 }}>
                The judging layout, weight and dates live on your final round in <strong style={{ color: colors.text.secondary }}>Voting Details</strong>. The criteria above are what judges score on.
              </p>
            </div>
          ) : (
            <p style={{ color: colors.text.muted, fontSize: typography.fontSize.sm, lineHeight: 1.5 }}>
              No judging round set yet. Open your final round in <strong style={{ color: colors.text.secondary }}>Voting Details</strong> and choose how winners are decided — <strong>Public votes + judges</strong> or <strong>Judges only</strong>.
            </p>
          )}
        </div>
      </div>
    </Panel>
  );
}
