import React, { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import { Modal, Button, Input, Select, Textarea } from '../ui';
import { colors, spacing, typography } from '../../styles/theme';
import { addManualVotes } from '../../lib/votes';

/**
 * AddVotesModal - lets a host manually credit votes to a contestant.
 * The votes land in the shared vote ledger, so they count toward the public
 * leaderboard immediately.
 */
export default function AddVotesModal({ isOpen, onClose, competition, contestants = [], onSuccess }) {
  const [contestantId, setContestantId] = useState('');
  const [voteCount, setVoteCount] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setContestantId('');
      setVoteCount('');
      setReason('');
      setError('');
      setSubmitting(false);
    }
  }, [isOpen]);

  const count = Number(voteCount);
  const canSubmit =
    !!contestantId && Number.isInteger(count) && count >= 1 && count <= 100000 && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError('');
    const result = await addManualVotes({
      competitionId: competition?.id,
      contestantId,
      voteCount: count,
      reason,
    });
    setSubmitting(false);
    if (result.success) {
      onSuccess?.();
      onClose();
    } else {
      setError(result.error || 'Failed to add votes');
    }
  };

  const contestantOptions = [
    { value: '', label: 'Select a contestant...' },
    ...[...contestants]
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      .map((c) => ({ value: c.id, label: c.name })),
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Votes"
      maxWidth="480px"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} style={{ width: 'auto' }}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} icon={Check} disabled={!canSubmit}>
            {submitting ? 'Adding...' : 'Add Votes'}
          </Button>
        </>
      }
    >
      <p style={{
        fontSize: typography.fontSize.sm,
        color: colors.text.secondary,
        marginBottom: spacing.lg,
        lineHeight: 1.5,
      }}>
        Manually credit votes to a contestant. They count toward the public leaderboard immediately.
      </p>

      <Select
        label="Contestant"
        value={contestantId}
        onChange={(e) => setContestantId(e.target.value)}
        options={contestantOptions}
      />

      <Input
        label="Number of Votes"
        type="number"
        min={1}
        step={1}
        value={voteCount}
        onChange={(e) => setVoteCount(e.target.value)}
        placeholder="e.g., 25"
      />

      <Textarea
        label="Reason (optional)"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="e.g., Votes collected at the launch event"
        rows={3}
      />

      {error && (
        <p style={{
          color: colors.status.error,
          fontSize: typography.fontSize.sm,
          marginTop: spacing.xs,
        }}>
          {error}
        </p>
      )}
    </Modal>
  );
}
