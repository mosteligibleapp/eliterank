import React, { useState, useEffect } from 'react';
import { Plus, FileText, Pin, Edit, Trash2, Video, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Button, Badge, Avatar, Panel } from '../../../../components/ui';
import { colors, spacing, borderRadius, typography } from '../../../../styles/theme';
import { useResponsive } from '../../../../hooks/useResponsive';
import { formatRelativeTime } from '../../../../utils/formatters';
import { AboutSectionEditor, OrganizationBrandingEditor } from '../settings';
import { getVideoPrompts, getVideoResponses, createVideoPrompt, deleteVideoPrompt, reviewVideoResponse } from '../../../../lib/videoPrompts';
import { useAuthStore } from '../../../../stores';
import VideoPromptModal from '../../../../components/modals/VideoPromptModal';
import VideoPlayer from '../../../../components/VideoPlayer';

/**
 * ContentTab - Manages about section, prize pool, and announcements
 */
export default function ContentTab({
  competition,
  announcements,
  host,
  isSuperAdmin,
  onRefresh,
  onAddAnnouncement,
  onUpdateAnnouncement,
  onDeleteAnnouncement,
  onTogglePin,
  organizationId,
  organizationHeaderLogoUrl,
  organizationWebsiteUrl,
}) {
  const { isMobile } = useResponsive();
  const user = useAuthStore(s => s.user);
  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [announcementForm, setAnnouncementForm] = useState({ title: '', content: '' });

  // Video prompts state
  const [videoPrompts, setVideoPrompts] = useState([]);
  const [videoResponses, setVideoResponses] = useState([]);
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [reviewingId, setReviewingId] = useState(null);

  const fetchVideoData = async () => {
    if (!competition?.id) return;
    const [pResult, rResult] = await Promise.all([
      getVideoPrompts(competition.id),
      getVideoResponses(competition.id),
    ]);
    setVideoPrompts(pResult.prompts);
    setVideoResponses(rResult.responses);
  };

  useEffect(() => { fetchVideoData(); }, [competition?.id]);

  const handleCreatePrompt = async (data) => {
    await createVideoPrompt(competition.id, { ...data, createdBy: user?.id });
    setShowPromptModal(false);
    fetchVideoData();
  };

  const handleDeletePrompt = async (promptId) => {
    if (!confirm('Delete this video prompt and all responses?')) return;
    await deleteVideoPrompt(promptId);
    fetchVideoData();
  };

  const handleReviewResponse = async (responseId, action, reason) => {
    await reviewVideoResponse(responseId, user?.id, action, reason);
    fetchVideoData();
  };

  const pendingResponses = videoResponses.filter(r => r.status === 'pending');

  const authorName = isSuperAdmin ? 'EliteRank' : (host?.name || 'Host');
  const authorAvatar = isSuperAdmin ? null : host?.avatar;

  const handleSubmit = async () => {
    if (!announcementForm.title.trim() || !announcementForm.content.trim()) return;
    if (editingAnnouncement) {
      await onUpdateAnnouncement(editingAnnouncement.id, announcementForm);
      setEditingAnnouncement(null);
    } else {
      await onAddAnnouncement(announcementForm);
    }
    setAnnouncementForm({ title: '', content: '' });
    setShowAnnouncementForm(false);
  };

  const resetForm = () => {
    setShowAnnouncementForm(false);
    setEditingAnnouncement(null);
    setAnnouncementForm({ title: '', content: '' });
  };

  const sortedAnnouncements = [...announcements].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return new Date(b.publishedAt) - new Date(a.publishedAt);
  });

  return (
    <div>
      {/* Organization Branding */}
      <OrganizationBrandingEditor
        organizationId={organizationId}
        currentHeaderLogoUrl={organizationHeaderLogoUrl}
        currentWebsiteUrl={organizationWebsiteUrl}
        onSave={onRefresh}
      />

      {/* About Section */}
      <AboutSectionEditor competition={competition} organization={null} onSave={onRefresh} />

      {/* Video Prompts */}
      <Panel
        title="Video Prompts"
        icon={Video}
        action={<Button size="sm" icon={Plus} onClick={() => setShowPromptModal(true)}>Add Prompt</Button>}
        collapsible
      >
        <div style={{ padding: isMobile ? spacing.md : spacing.xl }}>
          {videoPrompts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: spacing.xl, color: colors.text.secondary }}>
              <Video size={40} style={{ marginBottom: spacing.md, opacity: 0.4, color: colors.gold.primary }} />
              <p style={{ fontSize: typography.fontSize.sm, marginBottom: spacing.md }}>No video prompts yet</p>
              <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, marginBottom: spacing.lg }}>
                Create a prompt to ask your contestants interview-style questions.
              </p>
              <Button size="sm" icon={Plus} onClick={() => setShowPromptModal(true)}>Add Video Prompt</Button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
              {videoPrompts.map(prompt => {
                const responseCount = videoResponses.filter(r => r.prompt_id === prompt.id).length;
                const pendingCount = videoResponses.filter(r => r.prompt_id === prompt.id && r.status === 'pending').length;
                return (
                  <div key={prompt.id} style={{
                    padding: spacing.md,
                    background: colors.background.secondary,
                    borderRadius: borderRadius.lg,
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing.md,
                  }}>
                    <Video size={18} style={{ color: colors.gold.primary, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        fontWeight: typography.fontWeight.medium,
                        fontSize: typography.fontSize.sm,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>{prompt.prompt_text}</p>
                      <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted }}>
                        {responseCount} {responseCount === 1 ? 'response' : 'responses'}
                        {pendingCount > 0 && <span style={{ color: '#fbbf24' }}> ({pendingCount} pending)</span>}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeletePrompt(prompt.id)}
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

          {/* Pending responses for review */}
          {pendingResponses.length > 0 && (
            <div style={{ marginTop: spacing.xl }}>
              <h4 style={{
                fontSize: typography.fontSize.md,
                fontWeight: typography.fontWeight.semibold,
                marginBottom: spacing.md,
                display: 'flex', alignItems: 'center', gap: spacing.sm,
              }}>
                <Clock size={16} style={{ color: '#fbbf24' }} />
                Pending Review ({pendingResponses.length})
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
                {pendingResponses.map(resp => (
                  <div key={resp.id} style={{
                    padding: spacing.md,
                    background: colors.background.secondary,
                    borderRadius: borderRadius.lg,
                    border: '1px solid rgba(251,191,36,0.2)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md }}>
                      <Avatar name={resp.contestant?.name} src={resp.contestant?.avatar_url} size={32} />
                      <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: typography.fontWeight.medium, fontSize: typography.fontSize.sm }}>
                          {resp.contestant?.name}
                        </p>
                        <p style={{ fontSize: typography.fontSize.xs, color: colors.gold.primary }}>
                          {resp.prompt?.prompt_text}
                        </p>
                      </div>
                    </div>
                    <VideoPlayer src={resp.video_url} maxHeight="250px" />
                    <div style={{ display: 'flex', gap: spacing.sm, marginTop: spacing.md, justifyContent: 'flex-end' }}>
                      <Button
                        size="sm"
                        variant="secondary"
                        style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.5)' }}
                        onClick={() => {
                          const reason = prompt('Rejection reason (optional):');
                          handleReviewResponse(resp.id, 'reject', reason);
                        }}
                      >
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        icon={CheckCircle}
                        onClick={() => handleReviewResponse(resp.id, 'approve')}
                      >
                        Approve
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Panel>

      <VideoPromptModal
        isOpen={showPromptModal}
        onClose={() => setShowPromptModal(false)}
        onSave={handleCreatePrompt}
      />

      {/* Create Announcement Section */}
      <Panel title="Create Announcement" icon={Plus} collapsible defaultCollapsed>
        <div style={{ padding: isMobile ? spacing.md : spacing.xl }}>
          {showAnnouncementForm || editingAnnouncement ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
              <input
                type="text"
                placeholder="Announcement title..."
                value={announcementForm.title}
                onChange={(e) => setAnnouncementForm(prev => ({ ...prev, title: e.target.value }))}
                style={{
                  background: colors.background.secondary,
                  border: `1px solid ${colors.border.light}`,
                  borderRadius: borderRadius.lg,
                  padding: spacing.md,
                  color: '#fff',
                  fontSize: '16px',
                  minHeight: '44px',
                }}
              />
              <textarea
                placeholder="Write your announcement..."
                value={announcementForm.content}
                onChange={(e) => setAnnouncementForm(prev => ({ ...prev, content: e.target.value }))}
                rows={4}
                style={{
                  background: colors.background.secondary,
                  border: `1px solid ${colors.border.light}`,
                  borderRadius: borderRadius.lg,
                  padding: spacing.md,
                  color: '#fff',
                  fontSize: '16px',
                  resize: 'vertical',
                }}
              />
              <div style={{ display: 'flex', gap: spacing.md, justifyContent: 'flex-end' }}>
                <Button variant="secondary" onClick={resetForm}>Cancel</Button>
                <Button onClick={handleSubmit}>{editingAnnouncement ? 'Update' : 'Post'}</Button>
              </div>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing.lg,
                padding: isMobile ? spacing.md : spacing.lg,
                background: 'rgba(255,255,255,0.02)',
                borderRadius: borderRadius.xl,
                border: `1px dashed ${colors.border.gold}`,
                cursor: 'pointer',
                flexWrap: isMobile ? 'wrap' : 'nowrap',
              }}
              onClick={() => setShowAnnouncementForm(true)}
            >
              <Avatar name={authorName} src={authorAvatar} size={isMobile ? 36 : 44} />
              <div style={{ flex: 1, minWidth: isMobile ? '100%' : 'auto' }}>
                <p style={{ color: colors.text.secondary, fontSize: isMobile ? typography.fontSize.sm : typography.fontSize.md }}>
                  Share an update with your audience...
                </p>
              </div>
              <Button icon={Plus} size={isMobile ? 'sm' : 'md'}>New Post</Button>
            </div>
          )}
        </div>
      </Panel>

      {/* Announcements Feed */}
      <Panel
        title="Announcements Feed"
        icon={FileText}
        action={<span style={{ color: colors.text.secondary }}>{announcements.length} posts</span>}
        collapsible
      >
        <div style={{ padding: isMobile ? spacing.md : spacing.xl }}>
          {sortedAnnouncements.length === 0 ? (
            <div style={{ textAlign: 'center', padding: spacing.xl, color: colors.text.secondary }}>
              <FileText size={48} style={{ marginBottom: spacing.md, opacity: 0.5 }} />
              <p>No announcements yet. Create your first post above.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
              {sortedAnnouncements.map((post) => (
                <div
                  key={post.id}
                  style={{
                    background: post.pinned ? 'rgba(212,175,55,0.05)' : 'rgba(255,255,255,0.02)',
                    border: post.pinned ? '1px solid rgba(212,175,55,0.2)' : `1px solid ${colors.border.lighter}`,
                    borderRadius: borderRadius.xl,
                    padding: isMobile ? spacing.md : spacing.lg,
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: spacing.md,
                    marginBottom: spacing.md,
                    flexWrap: isMobile ? 'wrap' : 'nowrap',
                  }}>
                    <Avatar name={authorName} src={authorAvatar} size={isMobile ? 36 : 44} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: spacing.sm,
                        marginBottom: spacing.xs,
                        flexWrap: 'wrap',
                      }}>
                        <span style={{ fontWeight: typography.fontWeight.semibold, fontSize: typography.fontSize.sm }}>
                          {authorName}
                        </span>
                        {post.pinned && <Badge variant="gold" size="sm">Pinned</Badge>}
                        <span style={{ color: colors.text.muted, fontSize: typography.fontSize.xs }}>
                          · {formatRelativeTime(post.publishedAt)}
                        </span>
                      </div>
                      <h4 style={{
                        fontSize: isMobile ? typography.fontSize.base : typography.fontSize.lg,
                        fontWeight: typography.fontWeight.semibold,
                        marginBottom: spacing.sm,
                      }}>
                        {post.title}
                      </h4>
                      <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm }}>
                        {post.content}
                      </p>
                    </div>
                    <div style={{
                      display: 'flex',
                      gap: spacing.xs,
                      ...(isMobile ? { width: '100%', justifyContent: 'flex-end', marginTop: spacing.sm } : {}),
                    }}>
                      <button
                        onClick={() => onTogglePin(post.id, post.pinned)}
                        style={{
                          padding: spacing.sm,
                          background: post.pinned ? 'rgba(212,175,55,0.2)' : 'transparent',
                          border: `1px solid ${post.pinned ? colors.gold.primary : colors.border.light}`,
                          borderRadius: borderRadius.md,
                          color: post.pinned ? colors.gold.primary : colors.text.secondary,
                          cursor: 'pointer',
                          minWidth: '36px',
                          minHeight: '36px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        title={post.pinned ? 'Unpin' : 'Pin'}
                      >
                        <Pin size={14} />
                      </button>
                      <button
                        onClick={() => {
                          setEditingAnnouncement(post);
                          setAnnouncementForm({ title: post.title, content: post.content });
                          setShowAnnouncementForm(true);
                        }}
                        style={{
                          padding: spacing.sm,
                          background: 'transparent',
                          border: `1px solid ${colors.border.light}`,
                          borderRadius: borderRadius.md,
                          color: colors.text.secondary,
                          cursor: 'pointer',
                          minWidth: '36px',
                          minHeight: '36px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => onDeleteAnnouncement(post.id)}
                        style={{
                          padding: spacing.sm,
                          background: 'transparent',
                          border: '1px solid rgba(239,68,68,0.3)',
                          borderRadius: borderRadius.md,
                          color: '#ef4444',
                          cursor: 'pointer',
                          minWidth: '36px',
                          minHeight: '36px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
}
