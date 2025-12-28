import React, { useState, useEffect } from 'react';
import { AlertTriangle, X, Trash2 } from 'lucide-react';
import { Button } from '../ui';
import { colors, spacing, borderRadius, typography } from '../../styles/theme';
import { supabase } from '../../lib/supabase';

export default function DeleteCompetitionModal({
  isOpen,
  onClose,
  competition,
  onDeleted,
}) {
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setConfirmText('');
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen || !competition) return null;

  const competitionName = competition.city
    ? `${competition.city} ${competition.season || ''}`.trim()
    : competition.name || 'Unknown Competition';

  const isConfirmValid = confirmText === competitionName;

  const handleDelete = async () => {
    if (!isConfirmValid) return;

    setIsDeleting(true);
    setError(null);

    try {
      if (!supabase) throw new Error('Database not configured');

      // Delete the competition - cascading deletes will handle related records
      // (nominees, contestants, judges, sponsors, events, announcements)
      const { error: deleteError } = await supabase
        .from('competitions')
        .delete()
        .eq('id', competition.id);

      if (deleteError) throw deleteError;

      // Success - close modal and notify parent
      onClose();
      if (onDeleted) {
        onDeleted(competition.id);
      }
    } catch (err) {
      console.error('Error deleting competition:', err);
      setError(err.message || 'Failed to delete competition');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: spacing.xl,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: colors.background.primary,
          borderRadius: borderRadius.xl,
          border: `1px solid ${colors.status.error}`,
          maxWidth: '500px',
          width: '100%',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: spacing.xl,
          borderBottom: `1px solid ${colors.border.light}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
            <div style={{
              width: '40px',
              height: '40px',
              background: 'rgba(239,68,68,0.2)',
              borderRadius: borderRadius.lg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <AlertTriangle size={20} style={{ color: colors.status.error }} />
            </div>
            <h2 style={{
              fontSize: typography.fontSize.xl,
              fontWeight: typography.fontWeight.semibold,
              color: colors.status.error,
            }}>
              Delete Competition
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: colors.text.secondary,
              cursor: 'pointer',
              padding: spacing.sm,
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: spacing.xl }}>
          <div style={{
            padding: spacing.lg,
            background: 'rgba(239,68,68,0.1)',
            borderRadius: borderRadius.lg,
            marginBottom: spacing.xl,
          }}>
            <p style={{
              color: colors.status.error,
              fontSize: typography.fontSize.md,
              fontWeight: typography.fontWeight.medium,
              marginBottom: spacing.sm,
            }}>
              This action cannot be undone.
            </p>
            <p style={{
              color: colors.text.secondary,
              fontSize: typography.fontSize.sm,
              lineHeight: 1.6,
            }}>
              This will permanently delete the competition <strong style={{ color: '#fff' }}>{competitionName}</strong> and all associated data including:
            </p>
            <ul style={{
              marginTop: spacing.sm,
              paddingLeft: spacing.lg,
              color: colors.text.secondary,
              fontSize: typography.fontSize.sm,
              lineHeight: 1.8,
            }}>
              <li>All nominees and contestants</li>
              <li>All votes and voting data</li>
              <li>All judges and sponsors</li>
              <li>All events and announcements</li>
            </ul>
          </div>

          <div style={{ marginBottom: spacing.xl }}>
            <label style={{
              display: 'block',
              fontSize: typography.fontSize.sm,
              color: colors.text.secondary,
              marginBottom: spacing.sm,
            }}>
              Type <strong style={{ color: '#fff' }}>{competitionName}</strong> to confirm:
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={competitionName}
              style={{
                width: '100%',
                padding: spacing.md,
                background: colors.background.secondary,
                border: `1px solid ${isConfirmValid ? colors.status.success : colors.border.light}`,
                borderRadius: borderRadius.lg,
                color: colors.text.primary,
                fontSize: typography.fontSize.md,
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
            />
          </div>

          {error && (
            <div style={{
              padding: spacing.md,
              background: 'rgba(239,68,68,0.1)',
              border: `1px solid ${colors.status.error}`,
              borderRadius: borderRadius.lg,
              marginBottom: spacing.xl,
            }}>
              <p style={{ color: colors.status.error, fontSize: typography.fontSize.sm }}>{error}</p>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: spacing.md }}>
            <Button
              variant="secondary"
              onClick={onClose}
              style={{ flex: 1 }}
            >
              Cancel
            </Button>
            <Button
              variant="reject"
              onClick={handleDelete}
              disabled={!isConfirmValid || isDeleting}
              icon={Trash2}
              style={{ flex: 1 }}
            >
              {isDeleting ? 'Deleting...' : 'Delete Forever'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
