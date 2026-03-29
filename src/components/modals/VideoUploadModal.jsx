import React, { useState, useRef } from 'react';
import { Upload, Loader, AlertCircle, Clock } from 'lucide-react';
import { Modal, Button } from '../ui';
import { colors, spacing, borderRadius, typography } from '../../styles/theme';
import { uploadVideo } from '../../lib/uploadVideo';
import VideoPlayer from '../VideoPlayer';

export default function VideoUploadModal({ isOpen, onClose, prompt, existingResponse, onSubmit }) {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const fileRef = useRef(null);

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setError(null);
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  };

  const handleSubmit = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);

    try {
      const { url, durationSeconds } = await uploadVideo(file);
      await onSubmit(url, durationSeconds);
      handleClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setError(null);
    setUploading(false);
    onClose();
  };

  const isPending = existingResponse?.status === 'pending';
  const isRejected = existingResponse?.status === 'rejected';

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Submit Video Response"
      maxWidth="550px"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose} style={{ width: 'auto' }}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!file || uploading}
            icon={uploading ? Loader : Upload}
          >
            {uploading ? 'Uploading...' : 'Submit Video'}
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xl }}>
        {/* Prompt question */}
        <div style={{
          padding: spacing.xl,
          background: colors.background.tertiary,
          borderRadius: borderRadius.lg,
        }}>
          <p style={{
            fontSize: typography.fontSize.md,
            fontWeight: typography.fontWeight.semibold,
            color: colors.text.primary,
            marginBottom: prompt?.description ? spacing.xs : 0,
          }}>
            {prompt?.prompt_text}
          </p>
          {prompt?.description && (
            <p style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary, marginTop: spacing.xs }}>
              {prompt.description}
            </p>
          )}
        </div>

        {/* Existing response status */}
        {isPending && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: spacing.sm,
            padding: spacing.md,
            background: colors.background.tertiary,
            borderRadius: borderRadius.md,
          }}>
            <Clock size={16} style={{ color: colors.text.secondary, flexShrink: 0 }} />
            <span style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>
              Your response is pending review. Upload again to replace it.
            </span>
          </div>
        )}
        {isRejected && (
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: spacing.sm,
            padding: spacing.md,
            background: colors.status.errorMuted,
            borderRadius: borderRadius.md,
          }}>
            <AlertCircle size={16} style={{ color: colors.status.error, flexShrink: 0, marginTop: '2px' }} />
            <div>
              <span style={{ fontSize: typography.fontSize.sm, color: colors.status.error, display: 'block' }}>
                Response was not accepted. Please re-upload.
              </span>
              {existingResponse.rejection_reason && (
                <span style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, display: 'block', marginTop: spacing.xs }}>
                  Reason: {existingResponse.rejection_reason}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Video preview or upload area */}
        {previewUrl ? (
          <div>
            <VideoPlayer src={previewUrl} maxHeight="300px" />
            <button
              onClick={() => { if (previewUrl) URL.revokeObjectURL(previewUrl); setFile(null); setPreviewUrl(null); }}
              style={{
                marginTop: spacing.sm, background: 'none', border: 'none',
                color: colors.text.muted, fontSize: typography.fontSize.sm,
                cursor: 'pointer', padding: 0,
              }}
            >
              Choose a different video
            </button>
          </div>
        ) : (
          <div
            onClick={() => fileRef.current?.click()}
            style={{
              padding: spacing.xxl,
              border: `1px solid ${colors.border.primary}`,
              borderRadius: borderRadius.lg,
              textAlign: 'center',
              cursor: 'pointer',
              background: colors.background.tertiary,
            }}
          >
            <Upload size={28} style={{ color: colors.text.muted, marginBottom: spacing.lg }} />
            <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm, marginBottom: spacing.xs }}>
              Tap to select a video
            </p>
            <p style={{ color: colors.text.muted, fontSize: typography.fontSize.xs }}>
              MP4, MOV, or WebM up to 100MB
            </p>
          </div>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="video/*"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />

        {error && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: spacing.sm,
            padding: spacing.md,
            background: colors.status.errorMuted,
            borderRadius: borderRadius.md,
          }}>
            <AlertCircle size={16} style={{ color: colors.status.error }} />
            <span style={{ fontSize: typography.fontSize.sm, color: colors.status.error }}>{error}</span>
          </div>
        )}
      </div>
    </Modal>
  );
}
