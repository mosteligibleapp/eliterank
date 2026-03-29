import React, { useState, useEffect } from 'react';
import { Video, CheckCircle, Clock, XCircle, Upload } from 'lucide-react';
import { colors, spacing, borderRadius, typography } from '../styles/theme';
import { getVideoPromptsForContestant, submitVideoResponse } from '../lib/videoPrompts';
import VideoUploadModal from './modals/VideoUploadModal';

/**
 * VideoPromptsChecklist - Contestant view of video prompts assigned to them
 */
export default function VideoPromptsChecklist({ competitionId, contestantId, userId, previewEmail }) {
  const [prompts, setPrompts] = useState([]);
  const [selectedPrompt, setSelectedPrompt] = useState(null);
  const [loading, setLoading] = useState(true);

  // Preview mode: only show for info@eliterank.co while testing
  const PREVIEW_EMAIL = 'info@eliterank.co';

  const fetchPrompts = async () => {
    if (!competitionId || !contestantId) {
      // No contestant entry — show preview for test account anyway
      if (previewEmail === PREVIEW_EMAIL) {
        setPrompts([
          { id: 'preview-1', prompt_text: 'What makes you the most eligible?', description: 'Tell us in 60 seconds or less!', response: null },
          { id: 'preview-2', prompt_text: 'Describe your ideal first date', response: { status: 'pending' } },
          { id: 'preview-3', prompt_text: 'What\'s your hidden talent?', response: { status: 'approved' } },
        ]);
      }
      setLoading(false);
      return;
    }
    setLoading(true);
    const { prompts: data } = await getVideoPromptsForContestant(competitionId, contestantId);
    if ((!data || data.length === 0) && previewEmail === PREVIEW_EMAIL) {
      setPrompts([
        { id: 'preview-1', prompt_text: 'What makes you the most eligible?', description: 'Tell us in 60 seconds or less!', response: null },
        { id: 'preview-2', prompt_text: 'Describe your ideal first date', response: { status: 'pending' } },
        { id: 'preview-3', prompt_text: 'What\'s your hidden talent?', response: { status: 'approved' } },
      ]);
    } else {
      setPrompts(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPrompts();
  }, [competitionId, contestantId]);

  const handleSubmit = async (videoUrl, durationSeconds) => {
    if (!selectedPrompt) return;
    // Preview mode: skip DB call, just update UI
    if (selectedPrompt.id?.startsWith('preview-')) {
      setPrompts(prev => prev.map(p =>
        p.id === selectedPrompt.id
          ? { ...p, response: { status: 'pending', video_url: videoUrl } }
          : p
      ));
      setSelectedPrompt(null);
      return;
    }
    const result = await submitVideoResponse(
      selectedPrompt.id,
      competitionId,
      contestantId,
      userId,
      videoUrl,
      durationSeconds,
    );
    if (result.success) {
      fetchPrompts();
    }
  };

  if (loading || prompts.length === 0) return null;

  const getStatusIcon = (response) => {
    if (!response) return <Upload size={16} style={{ color: colors.text.muted }} />;
    if (response.status === 'approved') return <CheckCircle size={16} style={{ color: '#22c55e' }} />;
    if (response.status === 'pending') return <Clock size={16} style={{ color: '#fbbf24' }} />;
    if (response.status === 'rejected') return <XCircle size={16} style={{ color: '#ef4444' }} />;
    return null;
  };

  const getStatusLabel = (response) => {
    if (!response) return 'Not submitted';
    if (response.status === 'approved') return 'Approved';
    if (response.status === 'pending') return 'Pending review';
    if (response.status === 'rejected') return 'Resubmit';
    return '';
  };

  const getStatusColor = (response) => {
    if (!response) return colors.text.muted;
    if (response.status === 'approved') return '#22c55e';
    if (response.status === 'pending') return '#fbbf24';
    if (response.status === 'rejected') return '#ef4444';
    return colors.text.muted;
  };

  return (
    <>
      <div style={{
        background: colors.background.card,
        border: `1px solid ${colors.border.primary}`,
        borderRadius: borderRadius.xl,
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: spacing.lg,
          borderBottom: `1px solid ${colors.border.primary}`,
          display: 'flex',
          alignItems: 'center',
          gap: spacing.md,
        }}>
          <Video size={20} style={{ color: colors.gold.primary }} />
          <span style={{
            fontSize: typography.fontSize.lg,
            fontWeight: typography.fontWeight.semibold,
          }}>
            Video Prompts
          </span>
          <span style={{
            fontSize: typography.fontSize.xs,
            color: colors.text.muted,
            background: 'rgba(255,255,255,0.05)',
            padding: `2px ${spacing.sm}`,
            borderRadius: borderRadius.sm,
          }}>
            {prompts.filter(p => p.response?.status === 'approved').length}/{prompts.length}
          </span>
        </div>

        {/* Prompts list */}
        <div style={{ padding: spacing.md }}>
          {prompts.map((prompt) => {
            const canSubmit = !prompt.response || prompt.response.status !== 'approved';
            return (
              <button
                key={prompt.id}
                onClick={canSubmit ? () => setSelectedPrompt(prompt) : undefined}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing.md,
                  padding: spacing.md,
                  background: 'none',
                  border: 'none',
                  borderRadius: borderRadius.md,
                  cursor: canSubmit ? 'pointer' : 'default',
                  textAlign: 'left',
                  color: 'inherit',
                  opacity: prompt.response?.status === 'approved' ? 0.7 : 1,
                }}
              >
                {getStatusIcon(prompt.response)}
                <span style={{
                  flex: 1,
                  fontSize: typography.fontSize.sm,
                  color: colors.text.primary,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {prompt.prompt_text}
                </span>
                <span style={{
                  fontSize: typography.fontSize.xs,
                  color: getStatusColor(prompt.response),
                  whiteSpace: 'nowrap',
                }}>
                  {getStatusLabel(prompt.response)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

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
