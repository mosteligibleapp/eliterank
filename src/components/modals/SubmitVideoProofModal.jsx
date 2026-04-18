import React, { useState, useRef } from 'react';
import { Loader, AlertCircle, Clock, Video } from 'lucide-react';
import { Modal } from '../ui';
import { colors, spacing, borderRadius, typography } from '../../styles/theme';
import { uploadVideo } from '../../lib/uploadVideo';
import VideoPlayer from '../VideoPlayer';

const MAX_DURATION_SECONDS = 60;

/**
 * SubmitVideoProofModal — video-upload variant of SubmitProofModal.
 * Used for the intro_video bonus task. Enforces a max duration client-side.
 */
export default function SubmitVideoProofModal({
  isOpen,
  onClose,
  task,
  onSubmit,
}) {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [duration, setDuration] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const fileRef = useRef(null);

  React.useEffect(() => {
    if (isOpen) {
      setFile(null);
      setPreviewUrl(null);
      setDuration(null);
      setError(null);
      setUploading(false);
    }
  }, [isOpen]);

  const readDuration = (f) => new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    const url = URL.createObjectURL(f);
    video.src = url;
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(Math.round(video.duration));
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
  });

  const handleFileChange = async (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setError(null);
    const d = await readDuration(selected);
    if (d && d > MAX_DURATION_SECONDS) {
      setError(`Video is ${d}s — must be ${MAX_DURATION_SECONDS}s or less. Please trim and try again.`);
      return;
    }
    setFile(selected);
    setDuration(d);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(selected));
  };

  const handleClose = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    onClose();
  };

  const handleSubmit = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const { url } = await uploadVideo(file);
      await onSubmit(task.id, url);
      handleClose();
    } catch (err) {
      setError(err?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  if (!task) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Submit Intro Video"
      maxWidth="480px"
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

        {/* Rejection reason (if resubmitting) */}
        {task.submission_status === 'rejected' && task.rejection_reason && (
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: spacing.md,
            padding: spacing.md,
            background: 'rgba(239,68,68,0.06)',
            border: '1px solid rgba(239,68,68,0.15)',
            borderRadius: borderRadius.md,
          }}>
            <AlertCircle size={16} style={{ color: colors.status.error, flexShrink: 0, marginTop: '2px' }} />
            <div>
              <p style={{ fontSize: typography.fontSize.xs, color: colors.status.error, fontWeight: typography.fontWeight.medium, marginBottom: spacing.xs }}>
                Previous video was rejected
              </p>
              <p style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>
                {task.rejection_reason}
              </p>
            </div>
          </div>
        )}

        {/* Pending notice (if resubmitting while pending) */}
        {task.submission_status === 'pending' && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: spacing.md,
            padding: spacing.md,
            background: 'rgba(255,255,255,0.04)',
            borderRadius: borderRadius.md,
          }}>
            <Clock size={16} style={{ color: colors.gold.primary, flexShrink: 0 }} />
            <p style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>
              Your submission is pending review. Uploading a new video replaces it.
            </p>
          </div>
        )}

        {/* Upload / preview */}
        {previewUrl ? (
          <div>
            <VideoPlayer src={previewUrl} maxHeight="280px" />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm }}>
              <span style={{ fontSize: typography.fontSize.xs, color: colors.text.muted }}>
                {duration ? `${duration}s` : ''}
              </span>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                style={{
                  background: 'none', border: 'none',
                  color: colors.text.muted, fontSize: typography.fontSize.sm,
                  cursor: uploading ? 'not-allowed' : 'pointer', padding: 0,
                }}
              >
                Choose a different video
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            style={{
              padding: spacing.xl,
              background: 'rgba(255,255,255,0.03)',
              border: `1px dashed ${colors.border.primary}`,
              borderRadius: borderRadius.md,
              color: colors.text.secondary,
              cursor: uploading ? 'not-allowed' : 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: spacing.sm,
              width: '100%',
            }}
          >
            <div style={{
              width: '48px', height: '48px',
              borderRadius: borderRadius.full,
              background: 'rgba(212,175,55,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Video size={22} style={{ color: colors.gold.primary }} />
            </div>
            <span style={{
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.medium,
              color: colors.text.primary,
            }}>
              Choose a video
            </span>
            <span style={{ fontSize: typography.fontSize.xs, color: colors.text.muted }}>
              MP4, MOV, or WebM — up to {MAX_DURATION_SECONDS}s, 500MB
            </span>
          </button>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="video/*"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />

        {error && (
          <p style={{
            fontSize: typography.fontSize.xs,
            color: colors.status.error,
          }}>
            {error}
          </p>
        )}

        <p style={{
          fontSize: typography.fontSize.xs,
          color: colors.text.muted,
          lineHeight: 1.5,
        }}>
          Tell voters who you are, where you&rsquo;re from, what you do, and why you should win. The host will review your video — votes are awarded once approved.
        </p>

        {/* Actions */}
        <div style={{ display: 'flex', gap: spacing.md }}>
          <button
            onClick={handleClose}
            disabled={uploading}
            style={{
              flex: 1,
              padding: spacing.md,
              background: 'rgba(255,255,255,0.05)',
              border: `1px solid rgba(255,255,255,0.1)`,
              borderRadius: borderRadius.md,
              color: colors.text.secondary,
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.medium,
              cursor: uploading ? 'not-allowed' : 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!file || uploading}
            style={{
              flex: 1,
              padding: spacing.md,
              background: (!file || uploading) ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #d4af37 0%, #f4d03f 100%)',
              border: 'none',
              borderRadius: borderRadius.md,
              color: (!file || uploading) ? colors.text.muted : '#0a0a0c',
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.semibold,
              cursor: (!file || uploading) ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: spacing.sm,
            }}
          >
            {uploading ? (
              <>
                <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} />
                Uploading...
              </>
            ) : (
              'Submit for Review'
            )}
          </button>
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </Modal>
  );
}
