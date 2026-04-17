import React, { useState, useRef } from 'react';
import { Send, Upload, RefreshCw } from 'lucide-react';
import { Modal, Button } from '../ui';
import { colors, spacing, borderRadius, typography } from '../../styles/theme';
import { uploadPhoto } from '../../features/entry/utils/uploadPhoto';
import { useToast } from '../../contexts/ToastContext';

export default function SubmitProofModal({
  isOpen,
  onClose,
  task,
  onSubmit,
}) {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);
  const toast = useToast();

  React.useEffect(() => {
    if (isOpen) {
      setFile(null);
      setPreviewUrl('');
      setUploadError('');
      setSubmitting(false);
    }
  }, [isOpen]);

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
    setUploadError('');
  };

  const handleSubmit = async () => {
    if (!file) return;
    setSubmitting(true);
    setUploadError('');
    try {
      const url = await uploadPhoto(file, 'bonus-proofs');
      await onSubmit(task.id, url);
      onClose();
    } catch (err) {
      const msg = err?.message || 'Failed to upload screenshot';
      setUploadError(msg);
      toast?.error?.(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!task) return null;

  const instruction = task.proof_label || 'Upload a screenshot as proof';

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
            disabled={!file || submitting}
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

        {/* Image upload */}
        <div>
          <label style={{
            display: 'block',
            fontSize: typography.fontSize.sm,
            fontWeight: typography.fontWeight.medium,
            color: colors.text.secondary,
            marginBottom: spacing.sm,
          }}>
            {instruction}
          </label>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />

          {previewUrl ? (
            <div style={{
              position: 'relative',
              borderRadius: borderRadius.md,
              border: `1px solid ${colors.border.primary}`,
              overflow: 'hidden',
              background: colors.background.secondary,
            }}>
              <img
                src={previewUrl}
                alt="Proof preview"
                style={{
                  width: '100%',
                  maxHeight: '320px',
                  objectFit: 'contain',
                  display: 'block',
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={submitting}
                style={{
                  position: 'absolute',
                  top: spacing.sm,
                  right: spacing.sm,
                  padding: `${spacing.xs} ${spacing.sm}`,
                  background: 'rgba(0,0,0,0.7)',
                  border: `1px solid ${colors.border.primary}`,
                  borderRadius: borderRadius.sm,
                  color: colors.text.primary,
                  fontSize: typography.fontSize.xs,
                  fontWeight: typography.fontWeight.medium,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <RefreshCw size={12} /> Replace
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={submitting}
              style={{
                width: '100%',
                padding: spacing.xl,
                background: 'rgba(255,255,255,0.03)',
                border: `1px dashed ${colors.border.primary}`,
                borderRadius: borderRadius.md,
                color: colors.text.secondary,
                cursor: submitting ? 'not-allowed' : 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: spacing.sm,
              }}
            >
              <Upload size={24} style={{ color: colors.gold.primary }} />
              <span style={{
                fontSize: typography.fontSize.sm,
                fontWeight: typography.fontWeight.medium,
                color: colors.text.primary,
              }}>
                Choose screenshot
              </span>
              <span style={{
                fontSize: typography.fontSize.xs,
                color: colors.text.muted,
              }}>
                JPG, PNG, or WebP — max 10MB
              </span>
            </button>
          )}

          {uploadError && (
            <p style={{
              fontSize: typography.fontSize.xs,
              color: colors.status.error,
              marginTop: spacing.xs,
            }}>
              {uploadError}
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
          Your screenshot will be reviewed by the competition host. Votes will be awarded once approved.
        </p>
      </div>
    </Modal>
  );
}
