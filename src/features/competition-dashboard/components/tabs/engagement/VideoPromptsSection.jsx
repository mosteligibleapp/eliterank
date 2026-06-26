import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Upload, Download, CheckCircle, Clock, X } from 'lucide-react';
import { Button, Avatar, Panel } from '../../../../../components/ui';
import { colors, spacing, borderRadius, typography } from '../../../../../styles/theme';
import {
  getVideoPrompts,
  getVideoResponses,
  createVideoPrompt,
  deleteVideoPrompt,
  reviewVideoResponse,
  notifyContestantsOfPrompt,
} from '../../../../../lib/videoPrompts';
import VideoPromptModal from '../../../../../components/modals/VideoPromptModal';

/**
 * VideoPromptsSection — Engagement tab. Create interview-style prompts for
 * contestants to answer with video, and review their responses. Owns its own
 * data loading.
 */
export default function VideoPromptsSection({
  competitionId,
  isMobile,
  defaultCollapsed,
  style,
  reviewerId,
}) {
  const [videoPrompts, setVideoPrompts] = useState([]);
  const [videoResponses, setVideoResponses] = useState([]);
  const [showVideoPromptModal, setShowVideoPromptModal] = useState(false);
  const [videoRejectingId, setVideoRejectingId] = useState(null);
  const [videoRejectionReason, setVideoRejectionReason] = useState('');

  const loadVideoData = useCallback(async () => {
    if (!competitionId) return;
    const [pResult, rResult] = await Promise.all([
      getVideoPrompts(competitionId),
      getVideoResponses(competitionId),
    ]);
    setVideoPrompts(pResult.prompts);
    setVideoResponses(rResult.responses);
  }, [competitionId]);

  useEffect(() => {
    loadVideoData();
  }, [loadVideoData]);

  const handleCreateVideoPrompt = async (data) => {
    const result = await createVideoPrompt(competitionId, { ...data, createdBy: reviewerId });
    if (result.success) {
      notifyContestantsOfPrompt(competitionId, data.promptText).catch(() => {});
    }
    setShowVideoPromptModal(false);
    loadVideoData();
  };

  const handleDeleteVideoPrompt = async (promptId) => {
    if (!confirm('Delete this video prompt and all responses?')) return;
    await deleteVideoPrompt(promptId);
    loadVideoData();
  };

  const handleReviewVideoResponse = async (responseId, action, reason) => {
    const result = await reviewVideoResponse(responseId, reviewerId, action, reason);
    if (!result.success) {
      console.error('Video review failed:', result.error);
      alert(`Review failed: ${result.error || 'Unknown error'}`);
    }
    loadVideoData();
  };

  const pendingVideoResponses = videoResponses.filter(r => r.status === 'pending');

  return (
    <>
      <Panel
        title="Video Prompts"
        icon={Upload}
        action={<Button size="sm" icon={Plus} onClick={() => setShowVideoPromptModal(true)}>Add Prompt</Button>}
        collapsible
        defaultCollapsed={defaultCollapsed}
        style={style}
      >
        <div style={{ padding: isMobile ? spacing.md : spacing.xl }}>
          {videoPrompts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: spacing.xl, color: colors.text.secondary }}>
              <Upload size={40} style={{ marginBottom: spacing.md, opacity: 0.4, color: colors.gold.primary }} />
              <p style={{ fontSize: typography.fontSize.sm, marginBottom: spacing.md }}>No video prompts yet</p>
              <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, marginBottom: spacing.lg }}>
                Create interview-style prompts for your contestants to respond to with video.
              </p>
              <Button size="sm" icon={Plus} onClick={() => setShowVideoPromptModal(true)}>Add Video Prompt</Button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
              {videoPrompts.map(vp => {
                const responseCount = videoResponses.filter(r => r.prompt_id === vp.id).length;
                const pendingCount = videoResponses.filter(r => r.prompt_id === vp.id && r.status === 'pending').length;
                return (
                  <div key={vp.id} style={{
                    padding: spacing.md,
                    background: colors.background.secondary,
                    borderRadius: borderRadius.lg,
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing.md,
                  }}>
                    <Upload size={18} style={{ color: colors.gold.primary, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        fontWeight: typography.fontWeight.medium,
                        fontSize: typography.fontSize.sm,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>{vp.prompt_text}</p>
                      <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted }}>
                        {responseCount} {responseCount === 1 ? 'response' : 'responses'}
                        {pendingCount > 0 && <span style={{ color: '#fbbf24' }}> ({pendingCount} pending)</span>}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteVideoPrompt(vp.id)}
                      style={{
                        padding: spacing.xs, background: 'none', border: 'none',
                        color: colors.text.muted, cursor: 'pointer',
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pending video responses for review */}
          {pendingVideoResponses.length > 0 && (
            <div style={{ marginTop: spacing.xl }}>
              <h4 style={{
                fontSize: typography.fontSize.md,
                fontWeight: typography.fontWeight.semibold,
                marginBottom: spacing.md,
                display: 'flex', alignItems: 'center', gap: spacing.sm,
              }}>
                <Clock size={16} style={{ color: '#fbbf24' }} />
                Pending Review ({pendingVideoResponses.length})
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: spacing.md }}>
                {pendingVideoResponses.map(resp => (
                  <div key={resp.id} style={{
                    background: colors.background.secondary,
                    borderRadius: borderRadius.lg,
                    overflow: 'hidden',
                    border: `1px solid ${colors.border.primary}`,
                  }}>
                    {/* 4:3 video */}
                    <div style={{ position: 'relative', paddingTop: '75%', background: '#000' }}>
                      <video
                        src={resp.video_url}
                        controls
                        playsInline
                        preload="metadata"
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
                    </div>
                    {/* Info + actions */}
                    <div style={{ padding: spacing.md }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md }}>
                        <Avatar name={resp.contestant?.name} src={resp.contestant?.avatar_url} size={28} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontWeight: typography.fontWeight.medium, fontSize: typography.fontSize.sm, margin: 0 }}>
                            {resp.contestant?.name}
                          </p>
                          <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {resp.prompt?.prompt_text}
                          </p>
                        </div>
                        <a
                          href={resp.video_url}
                          download
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Download video"
                          style={{
                            padding: spacing.sm,
                            background: 'rgba(255,255,255,0.05)',
                            border: `1px solid ${colors.border.primary}`,
                            borderRadius: borderRadius.md,
                            color: colors.text.secondary,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            textDecoration: 'none',
                            flexShrink: 0,
                          }}
                        >
                          <Download size={14} />
                        </a>
                      </div>
                      {videoRejectingId === resp.id ? (
                        <div style={{ display: 'flex', gap: spacing.sm, alignItems: 'center' }}>
                          <input
                            type="text"
                            placeholder="Reason (optional)"
                            value={videoRejectionReason}
                            onChange={(e) => setVideoRejectionReason(e.target.value)}
                            autoFocus
                            style={{
                              flex: 1,
                              padding: `${spacing.sm} ${spacing.md}`,
                              background: colors.background.card,
                              border: `1px solid ${colors.border.primary}`,
                              borderRadius: borderRadius.md,
                              color: colors.text.primary,
                              fontSize: typography.fontSize.xs,
                              fontFamily: 'inherit',
                              minWidth: 0,
                            }}
                          />
                          <button
                            onClick={() => { setVideoRejectingId(null); setVideoRejectionReason(''); }}
                            style={{
                              padding: spacing.sm, background: 'none', border: 'none',
                              color: colors.text.muted, cursor: 'pointer', flexShrink: 0,
                            }}
                          >
                            <X size={14} />
                          </button>
                          <Button
                            size="sm"
                            variant="secondary"
                            style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.5)', flexShrink: 0 }}
                            onClick={() => {
                              handleReviewVideoResponse(resp.id, 'reject', videoRejectionReason);
                              setVideoRejectingId(null);
                              setVideoRejectionReason('');
                            }}
                          >
                            Reject
                          </Button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: spacing.sm, justifyContent: 'flex-end' }}>
                          <Button
                            size="sm"
                            variant="secondary"
                            style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.5)' }}
                            onClick={() => setVideoRejectingId(resp.id)}
                          >
                            Reject
                          </Button>
                          <Button
                            size="sm"
                            icon={CheckCircle}
                            onClick={() => handleReviewVideoResponse(resp.id, 'approve')}
                          >
                            Approve
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Panel>

      <VideoPromptModal
        isOpen={showVideoPromptModal}
        onClose={() => setShowVideoPromptModal(false)}
        onSave={handleCreateVideoPrompt}
      />
    </>
  );
}
