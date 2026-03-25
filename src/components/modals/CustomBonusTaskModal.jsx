import React, { useMemo } from 'react';
import { Check } from 'lucide-react';
import { Modal, Button, Input } from '../ui';
import { colors, spacing, borderRadius, typography } from '../../styles/theme';
import useModalForm from '../../hooks/useModalForm';

const INITIAL_STATE = {
  label: '',
  description: '',
  votesAwarded: '5',
  proofLabel: '',
};

export default function CustomBonusTaskModal({
  isOpen,
  onClose,
  task,
  onSave,
}) {
  const taskData = useMemo(() => {
    if (!task) return null;
    return {
      label: task.label || '',
      description: task.description || '',
      votesAwarded: (task.votes_awarded ?? 5).toString(),
      proofLabel: task.proof_label || '',
    };
  }, [task]);

  const { form, updateField, getFormData } = useModalForm(INITIAL_STATE, taskData, isOpen);
  const isEditing = !!task;

  const handleSave = () => {
    const data = getFormData();
    onSave({
      label: data.label.trim(),
      description: data.description.trim(),
      votesAwarded: parseInt(data.votesAwarded, 10) || 5,
      proofLabel: data.proofLabel.trim() || 'Submit your content link',
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Custom Task' : 'Add Custom Bonus Task'}
      maxWidth="500px"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} style={{ width: 'auto' }}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            icon={Check}
            disabled={!form.label.trim()}
          >
            {isEditing ? 'Save Changes' : 'Add Task'}
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
        <Input
          label="Task Title *"
          value={form.label}
          onChange={(e) => updateField('label', e.target.value)}
          placeholder="e.g., Post about the competition on social media"
        />

        <Input
          label="Description"
          value={form.description}
          onChange={(e) => updateField('description', e.target.value)}
          placeholder="e.g., Share the competition on your Instagram or TikTok"
        />

        <Input
          label="Proof Label"
          value={form.proofLabel}
          onChange={(e) => updateField('proofLabel', e.target.value)}
          placeholder="e.g., Paste your Instagram post link"
        />

        <div>
          <label style={{
            display: 'block',
            fontSize: typography.fontSize.sm,
            fontWeight: typography.fontWeight.medium,
            color: colors.text.secondary,
            marginBottom: spacing.xs,
          }}>
            Vote Reward
          </label>
          <input
            type="number"
            value={form.votesAwarded}
            onChange={(e) => updateField('votesAwarded', e.target.value)}
            min="1"
            max="100"
            style={{
              width: '80px',
              padding: `${spacing.sm} ${spacing.md}`,
              background: colors.background.secondary,
              border: `1px solid ${colors.border.primary}`,
              borderRadius: borderRadius.md,
              color: colors.gold.primary,
              fontSize: typography.fontSize.md,
              fontWeight: typography.fontWeight.semibold,
              textAlign: 'center',
            }}
          />
          <span style={{
            marginLeft: spacing.sm,
            fontSize: typography.fontSize.sm,
            color: colors.text.muted,
          }}>
            votes
          </span>
        </div>

        <div style={{
          padding: spacing.md,
          background: 'rgba(212,175,55,0.06)',
          borderRadius: borderRadius.md,
          border: '1px solid rgba(212,175,55,0.15)',
        }}>
          <p style={{
            fontSize: typography.fontSize.xs,
            color: colors.text.secondary,
            lineHeight: 1.5,
          }}>
            Contestants will submit a content link as proof. You'll review and approve each submission before votes are awarded.
          </p>
        </div>
      </div>
    </Modal>
  );
}
