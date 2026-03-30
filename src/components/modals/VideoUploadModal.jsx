import React, { useState, useRef } from 'react';
import { Upload, Loader, AlertCircle, Clock, Video } from 'lucide-react';
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
      title=""
      maxWidth="480px"
      centered
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xl, padding: `0 ${spacing.sm}` }}>
        {/* Header */}
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: borderRadius.lg,
            background: 'rgba(255,255,255,0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: `0 auto ${spacing.md}`,
          }}>
            <Video size={22} style={{ color: colors.gold.primary }} />
          </div>
          <h2 style={{
            fontSize: typography.fontSize['2xl'],
            fontWeight: typography.fontWeight.bold,
            margin: `0 0 ${spacing.xs}`,
          }}>
            Video Response
          </h2>
          <p style={{
            fontSize: typography.fontSize.sm,
            color: colors.text.secondary,
            margin: 0,
          }}>
            Record or upload your answer
          </p>
        </div>

        {/* Prompt question */}
        <div style={{
          padding: spacing.lg,
          background: 'rgba(255,255,255,0.04)',
          borderRadius: borderRadius.lg,
          borderLeft: `3px solid ${colors.gold.primary}`,
        }}>
          <p style={{
            fontSize: typography.fontSize.md,
            fontWeight: typography.fontWeight.medium,
            color: colors.text.primary,
            margin: 0,
            lineHeight: 1.5,
          }}>
            "{prompt?.prompt_text}"
          </p>
          {prompt?.description && (
            <p style={{ fontSize: typography.fontSize.sm, color: colors.text.muted, margin: `${spacing.sm} 0 0` }}>
              {prompt.description}
            </p>
          )}
        </div>

        {/* Status messages */}
        {isPending && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: spacing.md,
            padding: spacing.lg,
            background: 'rgba(255,255,255,0.04)',
            borderRadius: borderRadius.lg,
          }}>
            <Clock size={18} style={{ color: colors.text.muted, flexShrink: 0 }} />
            <p style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary, margin: 0 }}>
              Your response is pending review. You can upload a new one to replace it.
            </p>
          </div>
        )}
        {isRejected && (
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: spacing.md,
            padding: spacing.lg,
            background: colors.status.errorMuted,
            borderRadius: borderRadius.lg,
          }}>
            <AlertCircle size={18} style={{ color: colors.status.errorLight, flexShrink: 0, marginTop: '1px' }} />
            <div>
              <p style={{ fontSize: typography.fontSize.sm, color: colors.status.errorLight, margin: 0 }}>
                Your response was not accepted. Please upload a new one.
              </p>
              {existingResponse.rejection_reason && (
                <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, margin: `${spacing.xs} 0 0` }}>
                  Reason: {existingResponse.rejection_reason}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Upload area */}
        {previewUrl ? (
          <div>
            <VideoPlayer src={previewUrl} maxHeight="280px" />
            <button
              onClick={() => { if (previewUrl) URL.revokeObjectURL(previewUrl); setFile(null); setPreviewUrl(null); }}
              style={{
                marginTop: spacing.md, background: 'none', border: 'none',
                color: colors.text.muted, fontSize: typography.fontSize.sm,
                cursor: 'pointer', padding: 0,
              }}
            >
              Choose a different video
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileRef.current?.click()}
            style={{
              padding: `${spacing.xxl} ${spacing.xl}`,
              border: `1px solid rgba(255,255,255,0.08)`,
              borderRadius: borderRadius.xl,
              textAlign: 'center',
              cursor: 'pointer',
              background: 'rgba(255,255,255,0.03)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: spacing.sm,
              color: 'inherit',
              fontFamily: 'inherit',
            }}
          >
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: borderRadius.full,
              background: 'rgba(255,255,255,0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: spacing.sm,
            }}>
              <Upload size={24} style={{ color: colors.text.secondary }} />
            </div>
            <p style={{ color: colors.text.primary, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium, margin: 0 }}>
              Tap to select a video
            </p>
            <p style={{ color: colors.text.muted, fontSize: typography.fontSize.xs, margin: 0 }}>
              MP4, MOV, or WebM — up to 500MB
            </p>
          </button>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="video/*"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />

        {/* Error */}
        {error && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: spacing.md,
            padding: spacing.lg,
            background: colors.status.errorMuted,
            borderRadius: borderRadius.lg,
          }}>
            <AlertCircle size={18} style={{ color: colors.status.errorLight }} />
            <p style={{ fontSize: typography.fontSize.sm, color: colors.status.errorLight, margin: 0 }}>{error}</p>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: spacing.md }}>
          <button
            onClick={handleClose}
            style={{
              flex: 1,
              padding: spacing.lg,
              background: 'rgba(255,255,255,0.05)',
              border: `1px solid rgba(255,255,255,0.1)`,
              borderRadius: borderRadius.lg,
              color: colors.text.secondary,
              fontSize: typography.fontSize.md,
              fontWeight: typography.fontWeight.medium,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!file || uploading}
            style={{
              flex: 1,
              padding: spacing.lg,
              background: (!file || uploading) ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #d4af37 0%, #f4d03f 100%)',
              border: 'none',
              borderRadius: borderRadius.lg,
              color: (!file || uploading) ? colors.text.muted : '#0a0a0c',
              fontSize: typography.fontSize.md,
              fontWeight: typography.fontWeight.semibold,
              cursor: (!file || uploading) ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: spacing.sm,
              fontFamily: 'inherit',
            }}
          >
            {uploading ? (
              <>
                <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />
                Uploading...
              </>
            ) : (
              'Submit Video'
            )}
          </button>
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </Modal>
  );
}
