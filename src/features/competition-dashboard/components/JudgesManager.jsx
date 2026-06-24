import React, { useState } from 'react';
import { User, Plus, Mail, Edit2, Trash2, Check, Link2, Send } from 'lucide-react';
import { Button, Avatar, Panel } from '../../../components/ui';
import { colors, spacing, borderRadius, typography } from '../../../styles/theme';
import { useResponsive } from '../../../hooks/useResponsive';
import { useToast } from '../../../contexts/ToastContext';

/**
 * JudgesManager — the judge roster (invite, manage, claim status). Judges are
 * people with a role in the competition, so this lives on the People tab. The
 * judging *rules* (criteria, per-round weight) and results stay in Setup.
 */
export default function JudgesManager({ judges = [], onOpenJudgeModal, onDeleteJudge, onSendJudgeInvite, badge }) {
  const { isMobile } = useResponsive();
  const toast = useToast();

  const [judgeBusy, setJudgeBusy] = useState(new Set());
  const [judgeCopied, setJudgeCopied] = useState(null);
  const [judgeSent, setJudgeSent] = useState(null);

  const handleSendJudgeInvite = async (judge) => {
    if (!onSendJudgeInvite || !judge?.id) return;
    if (!judge.email) {
      toast?.error?.('Add an email for this judge first');
      return;
    }
    setJudgeBusy(prev => new Set(prev).add(judge.id));
    try {
      const result = await onSendJudgeInvite(judge.id, { forceResend: !!judge.inviteSentAt });
      if (result?.success) {
        setJudgeSent(judge.id);
        setTimeout(() => setJudgeSent(null), 2000);
        toast?.success?.(judge.inviteSentAt ? 'Reminder sent' : 'Invite sent');
      } else {
        toast?.error?.(result?.error || 'Failed to send invite');
      }
    } finally {
      setJudgeBusy(prev => { const next = new Set(prev); next.delete(judge.id); return next; });
    }
  };

  const handleCopyJudgeLink = async (judge) => {
    if (!judge?.inviteToken) return;
    const url = `${window.location.origin}/claim-judge/${judge.inviteToken}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = url;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setJudgeCopied(judge.id);
    setTimeout(() => setJudgeCopied(null), 2000);
  };

  return (
    <Panel
      title={`Judges (${judges.length})`}
      icon={User}
      badge={badge}
      action={<Button size="sm" icon={Plus} onClick={() => onOpenJudgeModal(null)}>Add Judge</Button>}
      collapsible
      defaultCollapsed={judges.length > 0}
    >
      <div style={{ padding: isMobile ? spacing.md : spacing.xl }}>
        {judges.length === 0 ? (
          <div style={{ textAlign: 'center', padding: spacing.xl, color: colors.text.secondary }}>
            <User size={48} style={{ marginBottom: spacing.md, opacity: 0.5 }} />
            <p>No judges assigned yet</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: spacing.lg }}>
            {judges.map((judge) => {
              const isBusy = judgeBusy.has(judge.id);
              const isCopied = judgeCopied === judge.id;
              const isSent = judgeSent === judge.id;
              let statusLabel = 'No email';
              let statusColor = colors.text.muted;
              if (judge.email) {
                if (judge.claimedAt) {
                  statusLabel = 'Accepted';
                  statusColor = colors.status.success;
                } else if (judge.inviteSentAt) {
                  statusLabel = 'Invited';
                  statusColor = colors.status.warning;
                } else {
                  statusLabel = 'Not invited';
                  statusColor = colors.text.secondary;
                }
              }
              return (
                <div key={judge.id} style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: spacing.md,
                  padding: spacing.lg,
                  background: colors.background.secondary,
                  borderRadius: borderRadius.lg,
                  overflow: 'hidden',
                  minWidth: 0,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
                    <Avatar name={judge.name} size={isMobile ? 40 : 48} src={judge.avatarUrl} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: typography.fontWeight.medium, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{judge.name}</p>
                      <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{judge.title}</p>
                      {judge.email && (
                        <p style={{ color: colors.text.muted, fontSize: typography.fontSize.xs, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
                          <Mail size={11} style={{ verticalAlign: 'text-bottom', marginRight: 4 }} />{judge.email}
                        </p>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: typography.fontSize.xs,
                      padding: `2px ${spacing.sm}`,
                      borderRadius: borderRadius.sm,
                      background: `${statusColor}1f`,
                      color: statusColor,
                    }}>
                      {statusLabel}
                    </span>
                    <div style={{ flex: 1 }} />
                    {judge.inviteToken && (
                      <button
                        onClick={() => handleCopyJudgeLink(judge)}
                        title={isCopied ? 'Copied!' : 'Copy claim link'}
                        style={{
                          padding: spacing.sm,
                          background: isCopied ? 'rgba(34,197,94,0.1)' : 'transparent',
                          border: `1px solid ${isCopied ? colors.status.success : colors.border.primary}`,
                          borderRadius: borderRadius.md,
                          color: isCopied ? colors.status.success : colors.text.secondary,
                          cursor: 'pointer',
                          minWidth: '36px',
                          minHeight: '36px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {isCopied ? <Check size={14} /> : <Link2 size={14} />}
                      </button>
                    )}
                    {judge.email && (
                      <button
                        onClick={() => handleSendJudgeInvite(judge)}
                        disabled={isBusy}
                        title={isSent ? 'Sent!' : judge.inviteSentAt ? 'Resend invite' : 'Send invite'}
                        style={{
                          padding: spacing.sm,
                          background: isSent ? 'rgba(34,197,94,0.1)' : 'transparent',
                          border: `1px solid ${isSent ? colors.status.success : colors.border.primary}`,
                          borderRadius: borderRadius.md,
                          color: isSent ? colors.status.success : colors.gold.primary,
                          cursor: isBusy ? 'wait' : 'pointer',
                          minWidth: '36px',
                          minHeight: '36px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {isSent ? <Check size={14} /> : <Send size={14} />}
                      </button>
                    )}
                    <button
                      onClick={() => onOpenJudgeModal(judge)}
                      style={{
                        padding: spacing.sm,
                        background: 'transparent',
                        border: `1px solid ${colors.border.primary}`,
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
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => onDeleteJudge(judge.id)}
                      style={{
                        padding: spacing.sm,
                        background: 'transparent',
                        border: `1px solid rgba(239,68,68,0.3)`,
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
              );
            })}
          </div>
        )}
      </div>
    </Panel>
  );
}
