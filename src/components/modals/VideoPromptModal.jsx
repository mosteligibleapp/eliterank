import React, { useMemo } from 'react';
import { Check } from 'lucide-react';
import { Modal, Button, Input } from '../ui';
import { colors, spacing, borderRadius, typography } from '../../styles/theme';
import useModalForm from '../../hooks/useModalForm';

const INITIAL_STATE = {
  promptText: '',
  description: '',
  votesAwarded: '0',
};

export default function VideoPromptModal({ isOpen, onClose, prompt, onSave }) {
  const promptData = useMemo(() => {
    if (!prompt) return null;
    return {
      promptText: prompt.prompt_text || '',
      description: prompt.description || '',
      votesAwarded: (prompt.votes_awarded || 0).toString(),
    };
  }, [prompt]);

  const { form, updateField, getFormData } = useModalForm(INITIAL_STATE, promptData, isOpen);
  const isEditing = !!prompt;

  const handleSave = () => {
    const data = getFormData();
    onSave({
      promptText: data.promptText.trim(),
      description: data.description.trim() || null,
      votesAwarded: parseInt(data.votesAwarded, 10) || 0,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Video Prompt' : 'New Video Prompt'}
      maxWidth="500px"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} style={{ width: 'auto' }}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            icon={Check}
            disabled={!form.promptText.trim()}
          >
            {isEditing ? 'Save Changes' : 'Create Prompt'}
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
        <div>
          <label style={{
            display: 'block',
            fontSize: typography.fontSize.sm,
            fontWeight: typography.fontWeight.medium,
            color: colors.text.secondary,
            marginBottom: spacing.xs,
          }}>
            Question / Prompt *
          </label>
          <textarea
            value={form.promptText}
            onChange={(e) => updateField('promptText', e.target.value)}
            placeholder="e.g., What makes you the most eligible?"
            rows={3}
            style={{
              width: '100%',
              padding: spacing.md,
              background: colors.background.secondary,
              border: `1px solid ${colors.border.primary}`,
              borderRadius: borderRadius.md,
              color: colors.text.primary,
              fontSize: '16px',
              resize: 'vertical',
              fontFamily: 'inherit',
            }}
          />
        </div>

        <Input
          label="Description (optional)"
          value={form.description}
          onChange={(e) => updateField('description', e.target.value)}
          placeholder="Additional context for the contestant..."
        />

        <div>
          <label style={{
            display: 'block',
            fontSize: typography.fontSize.sm,
            fontWeight: typography.fontWeight.medium,
            color: colors.text.secondary,
            marginBottom: spacing.xs,
          }}>
            Bonus Votes (optional)
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
            <input
              type="number"
              value={form.votesAwarded}
              onChange={(e) => updateField('votesAwarded', e.target.value)}
              min="0"
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
                fontFamily: 'inherit',
              }}
            />
            <span style={{ fontSize: typography.fontSize.sm, color: colors.text.muted }}>
              votes awarded on approval
            </span>
          </div>
        </div>
      </div>
    </Modal>
  );
}
