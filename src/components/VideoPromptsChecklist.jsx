import React, { useState, useEffect } from 'react';
import { Video, CheckCircle, Clock, XCircle, Upload } from 'lucide-react';
import { colors, spacing, borderRadius, typography, transitions } from '../styles/theme';
import { getVideoPromptsForContestant, submitVideoResponse, notifyHostOfResponse } from '../lib/videoPrompts';
import VideoUploadModal from './modals/VideoUploadModal';

/**
 * VideoPromptsChecklist - Renders video prompts as task rows inside BonusVotesChecklist
 */
export default function VideoPromptsChecklist({ competitionId, contestantId, userId }) {
  const [prompts, setPrompts] = useState([]);
  const [selectedPrompt, setSelectedPrompt] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchPrompts = async () => {
    if (!competitionId || !contestantId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { prompts: data } = await getVideoPromptsForContestant(competitionId, contestantId);
    setPrompts(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchPrompts();
  }, [competitionId, contestantId]);

  const handleSubmit = async (videoUrl, durationSeconds) => {
    if (!selectedPrompt) return;
    const result = await submitVideoResponse(
      selectedPrompt.id,
      competitionId,
      contestantId,
      userId,
      videoUrl,
      durationSeconds,
    );
    if (result.success) {
      notifyHostOfResponse(competitionId, 'A contestant', selectedPrompt.prompt_text).catch(() => {});
      fetchPrompts();
    }
  };

  if (loading || prompts.length === 0) return null;

  return (
    <>
      {prompts.map((prompt) => {
          const response = prompt.response;
          const isApproved = response?.status === 'approved';
          const isPending = response?.status === 'pending';
          const isRejected = response?.status === 'rejected';
          const canSubmit = !isApproved;

          const getBorderColor = () => {
            if (isApproved) return 'rgba(34, 197, 94, 0.2)';
            if (isPending) return 'rgba(212, 175, 55, 0.25)';
            if (isRejected) return 'rgba(239, 68, 68, 0.2)';
            return 'rgba(255, 255, 255, 0.06)';
          };

          const getBackground = () => {
            if (isApproved) return 'rgba(34, 197, 94, 0.08)';
            if (isPending) return 'rgba(212, 175, 55, 0.05)';
            if (isRejected) return 'rgba(239, 68, 68, 0.04)';
            return 'rgba(255, 255, 255, 0.03)';
          };

          const getIconColor = () => {
            if (isApproved) return colors.status.success;
            if (isPending) return colors.gold.primary;
            if (isRejected) return colors.status.error;
            return colors.gold.primary;
          };

          const getIconBg = () => {
            if (isApproved) return 'rgba(34, 197, 94, 0.15)';
            if (isPending) return 'rgba(212, 175, 55, 0.12)';
            if (isRejected) return 'rgba(239, 68, 68, 0.1)';
            return 'rgba(212, 175, 55, 0.1)';
          };

          return (
            <div
              key={prompt.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing.md,
                padding: `${spacing.md} ${spacing.lg}`,
                borderRadius: borderRadius.lg,
                background: getBackground(),
                border: `1px solid ${getBorderColor()}`,
                transition: transitions.all,
                cursor: canSubmit ? 'pointer' : 'default',
              }}
              onClick={() => canSubmit && setSelectedPrompt(prompt)}
            >
              {/* Icon */}
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: borderRadius.md,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: getIconBg(),
                flexShrink: 0,
              }}>
                <Video size={18} style={{ color: getIconColor() }} />
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{
                  fontSize: typography.fontSize.base,
                  fontWeight: typography.fontWeight.medium,
                  color: isApproved ? colors.text.secondary : colors.text.primary,
                  textDecoration: isApproved ? 'line-through' : 'none',
                }}>
                  {prompt.prompt_text}
                </span>
                {prompt.description && (
                  <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, marginTop: '2px' }}>
                    {prompt.description}
                  </p>
                )}
                {isPending && (
                  <p style={{ fontSize: typography.fontSize.xs, color: colors.gold.primary, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={12} /> Pending review
                  </p>
                )}
                {isRejected && (
                  <p style={{ fontSize: typography.fontSize.xs, color: colors.status.error, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <XCircle size={12} /> Rejected — tap to resubmit
                  </p>
                )}
              </div>

              {/* Status */}
              <div style={{ flexShrink: 0 }}>
                {isApproved && <CheckCircle size={22} style={{ color: colors.status.success }} />}
                {isPending && <Clock size={22} style={{ color: colors.gold.primary }} />}
                {isRejected && (
                  <span style={{
                    fontSize: typography.fontSize.xs,
                    color: colors.text.muted,
                    padding: `${spacing.xs} ${spacing.sm}`,
                    background: 'rgba(255,255,255,0.06)',
                    borderRadius: borderRadius.sm,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    whiteSpace: 'nowrap',
                  }}>
                    <Upload size={12} /> Upload
                  </span>
                )}
                {!response && (
                  <span style={{
                    fontSize: typography.fontSize.xs,
                    fontWeight: typography.fontWeight.semibold,
                    color: prompt.votes_awarded > 0 ? colors.gold.primary : colors.text.muted,
                    padding: `${spacing.xs} ${spacing.sm}`,
                    background: prompt.votes_awarded > 0 ? 'rgba(212,175,55,0.1)' : 'rgba(255,255,255,0.06)',
                    border: prompt.votes_awarded > 0 ? '1px solid rgba(212,175,55,0.2)' : 'none',
                    borderRadius: borderRadius.sm,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    whiteSpace: 'nowrap',
                  }}>
                    {prompt.votes_awarded > 0 ? `+${prompt.votes_awarded}` : <><Upload size={12} /> Upload</>}
                  </span>
                )}
              </div>
            </div>
          );
        })}

      <VideoUploadModal
        isOpen={!!selectedPrompt}
        onClose={() => setSelectedPrompt(null)}
        prompt={selectedPrompt}
        existingResponse={selectedPrompt?.response}
        onSubmit={handleSubmit}
      />
    </>
  );
}
