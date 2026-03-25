import React, { useState } from 'react';
import { Send, ExternalLink } from 'lucide-react';
import { Modal, Button, Input } from '../ui';
import { colors, spacing, borderRadius, typography } from '../../styles/theme';

export default function SubmitProofModal({
  isOpen,
  onClose,
  task,
  onSubmit,
}) {
  const [proofUrl, setProofUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Reset state when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setProofUrl(task?.proof_url || '');
      setSubmitting(false);
    }
  }, [isOpen, task?.proof_url]);

  const isValidUrl = (url) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = async () => {
    const trimmed = proofUrl.trim();
    if (!trimmed || !isValidUrl(trimmed)) return;

    setSubmitting(true);
    await onSubmit(task.id, trimmed);
    setSubmitting(false);
    onClose();
  };

  if (!task) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Submit Proof"
      maxWidth="480px"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} style={{ width: 'auto' }}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            icon={Send}
            disabled={!proofUrl.trim() || !isValidUrl(proofUrl.trim()) || submitting}
          >
            {submitting ? 'Submitting...' : 'Submit for Review'}
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
        {/* Task info */}
        <div style={{
          padding: spacing.md,
          background: 'rgba(212,175,55,0.06)',
          borderRadius: borderRadius.md,
          border: '1px solid rgba(212,175,55,0.15)',
        }}>
          <p style={{
            fontWeight: typography.fontWeight.semibold,
            fontSize: typography.fontSize.base,
            color: colors.text.primary,
            marginBottom: spacing.xs,
          }}>
            {task.label}
          </p>
          {task.description && (
            <p style={{
              fontSize: typography.fontSize.sm,
              color: colors.text.secondary,
              marginBottom: spacing.sm,
            }}>
              {task.description}
            </p>
          )}
          <p style={{
            fontSize: typography.fontSize.sm,
            color: colors.gold.primary,
            fontWeight: typography.fontWeight.medium,
          }}>
            +{task.votes_awarded} bonus votes
          </p>
        </div>

        {/* URL input */}
        <div>
          <Input
            label={task.proof_label || 'Content Link *'}
            value={proofUrl}
            onChange={(e) => setProofUrl(e.target.value)}
            placeholder="https://www.instagram.com/p/..."
            type="url"
          />
          {proofUrl.trim() && !isValidUrl(proofUrl.trim()) && (
            <p style={{
              fontSize: typography.fontSize.xs,
              color: colors.status.error,
              marginTop: spacing.xs,
            }}>
              Please enter a valid URL
            </p>
          )}
        </div>

        {/* Rejection reason if resubmitting */}
        {task.submission_status === 'rejected' && task.rejection_reason && (
          <div style={{
            padding: spacing.md,
            background: 'rgba(239,68,68,0.06)',
            borderRadius: borderRadius.md,
            border: '1px solid rgba(239,68,68,0.15)',
          }}>
            <p style={{
              fontSize: typography.fontSize.xs,
              fontWeight: typography.fontWeight.medium,
              color: colors.status.error,
              marginBottom: spacing.xs,
            }}>
              Previous submission was rejected:
            </p>
            <p style={{
              fontSize: typography.fontSize.sm,
              color: colors.text.secondary,
            }}>
              {task.rejection_reason}
            </p>
          </div>
        )}

        <p style={{
          fontSize: typography.fontSize.xs,
          color: colors.text.muted,
          lineHeight: 1.5,
        }}>
          Your submission will be reviewed by the competition host. Votes will be awarded once approved.
        </p>
      </div>
    </Modal>
  );
}
