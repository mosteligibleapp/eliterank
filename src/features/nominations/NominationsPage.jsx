import React, { useState, useMemo } from 'react';
import {
  Users, UserCheck, UserPlus, XCircle, ChevronDown, ChevronUp,
  ExternalLink, User, Mail, Phone, Instagram, Check, X, RotateCcw,
  Loader, AlertCircle, Link2, Send, Clock
} from 'lucide-react';
import { Button, Badge } from '../../components/ui';
import { colors, spacing, borderRadius, typography } from '../../styles/theme';
import { useCompetitionDashboard } from '../competition-dashboard/hooks/useCompetitionDashboard';
import { SkeletonPulse, SkeletonCard } from '../../components/common/Skeleton';

// Section configuration for categorized view
const SECTION_CONFIG = {
  contestants: {
    title: 'Contestants',
    subtitle: 'Approved to compete',
    icon: UserCheck,
    color: '#22c55e',
    bgColor: 'rgba(34,197,94,0.15)',
    borderColor: 'rgba(34,197,94,0.3)',
  },
  withProfile: {
    title: 'Nominees with Profile',
    subtitle: 'Have linked user profiles',
    icon: User,
    color: '#3b82f6',
    bgColor: 'rgba(59,130,246,0.15)',
    borderColor: 'rgba(59,130,246,0.3)',
  },
  external: {
    title: 'External Nominees',
    subtitle: 'No linked profile',
    icon: UserPlus,
    color: '#f59e0b',
    bgColor: 'rgba(245,158,11,0.15)',
    borderColor: 'rgba(245,158,11,0.3)',
  },
  incomplete: {
    title: 'Incomplete Self-Nominations',
    subtitle: 'Started entry but haven\'t finished',
    icon: Clock,
    color: '#fbbf24',
    bgColor: 'rgba(251,191,36,0.15)',
    borderColor: 'rgba(251,191,36,0.3)',
  },
  rejected: {
    title: 'Rejected / Declined',
    subtitle: 'Denied or declined nominations',
    icon: XCircle,
    color: '#ef4444',
    bgColor: 'rgba(239,68,68,0.15)',
    borderColor: 'rgba(239,68,68,0.3)',
  },
};

export default function NominationsPage({ competitionId, competitionName }) {
  const {
    data,
    loading,
    error,
    refresh,
    approveNominee,
    rejectNominee,
    restoreNominee,
    resendInvite,
  } = useCompetitionDashboard(competitionId);

  const [expandedSections, setExpandedSections] = useState({
    contestants: true,
    withProfile: true,
    external: true,
    incomplete: true,
    rejected: false,
  });

  const [processingId, setProcessingId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [resentId, setResentId] = useState(null);

  const handleCopyClaimLink = async (item) => {
    if (!item.inviteToken) return;
    const url = `${window.location.origin}/claim/${item.inviteToken}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = url;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleResendInvite = async (item) => {
    setProcessingId(item.id);
    const result = await resendInvite(item.id);
    setProcessingId(null);
    if (result.success) {
      setResentId(item.id);
      setTimeout(() => setResentId(null), 2000);
    }
  };

  // Categorize nominees
  const categorizedData = useMemo(() => {
    const nominees = data.nominees || [];
    const contestants = data.contestants || [];

    // Active nominees (pending status, not declined/rejected)
    // Incomplete self-nominations (started but not finished) go in a separate bucket
    const activeNominees = nominees.filter(n => {
      if (n.status !== 'pending' && n.status !== 'profile_complete' && n.status !== 'awaiting_profile') return false;
      if (n.nominatedBy === 'self' && !n.claimedAt) return false;
      return true;
    });
    const incompleteNominees = nominees.filter(n =>
      (n.status === 'pending' || n.status === 'awaiting_profile') &&
      n.nominatedBy === 'self' && !n.claimedAt
    );

    // Nominees with profile (has user_id)
    const withProfile = activeNominees.filter(n => n.hasProfile);

    // External nominees (no user_id)
    const external = activeNominees.filter(n => !n.hasProfile);

    // Rejected + declined nominees
    const rejected = nominees.filter(n => n.status === 'rejected' || n.status === 'declined' || n.status === 'archived');

    return {
      contestants,
      withProfile,
      external,
      incomplete: incompleteNominees,
      rejected,
    };
  }, [data.nominees, data.contestants]);

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleApprove = async (nominee) => {
    setProcessingId(nominee.id);
    await approveNominee(nominee);
    setProcessingId(null);
  };

  const handleReject = async (nomineeId) => {
    setProcessingId(nomineeId);
    await rejectNominee(nomineeId);
    setProcessingId(null);
  };

  const handleRestore = async (nomineeId) => {
    setProcessingId(nomineeId);
    await restoreNominee(nomineeId);
    setProcessingId(null);
  };

  // Loading state
  if (loading) {
    return (
      <div>
        {/* Stats skeleton */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: spacing.lg,
          marginBottom: spacing.xxl,
        }}>
          {Array.from({ length: 4 }, (_, i) => (
            <SkeletonPulse key={i} height="80px" radius={borderRadius.xl} />
          ))}
        </div>
        {/* Section skeletons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xl }}>
          {Array.from({ length: 3 }, (_, i) => (
            <SkeletonCard key={i} height="120px" />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.xxxl,
        minHeight: '400px',
      }}>
        <AlertCircle size={32} style={{ color: colors.status.error, marginBottom: spacing.md }} />
        <p style={{ color: colors.status.error, marginBottom: spacing.lg }}>Error loading nominees: {error}</p>
        <Button variant="secondary" onClick={refresh}>
          Try Again
        </Button>
      </div>
    );
  }

  // No competition selected
  if (!competitionId) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.xxxl,
        minHeight: '400px',
      }}>
        <Users size={48} style={{ color: colors.text.muted, marginBottom: spacing.lg }} />
        <h3 style={{ fontSize: typography.fontSize.xl, color: colors.text.secondary, marginBottom: spacing.sm }}>
          No Competition Assigned
        </h3>
        <p style={{ color: colors.text.muted }}>
          You need to be assigned to a competition to view nominees.
        </p>
      </div>
    );
  }

  // Render a single section
  const renderSection = (sectionKey, items) => {
    const config = SECTION_CONFIG[sectionKey];
    const Icon = config.icon;
    const isExpanded = expandedSections[sectionKey];
    const isContestants = sectionKey === 'contestants';
    const isRejected = sectionKey === 'rejected';

    return (
      <div
        key={sectionKey}
        style={{
          background: colors.background.card,
          border: `1px solid ${config.borderColor}`,
          borderRadius: borderRadius.xl,
          overflow: 'hidden',
          marginBottom: spacing.xl,
        }}
      >
        {/* Section Header */}
        <button
          onClick={() => toggleSection(sectionKey)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: spacing.lg,
            background: config.bgColor,
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: borderRadius.lg,
              background: `${config.color}20`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Icon size={20} style={{ color: config.color }} />
            </div>
            <div style={{ textAlign: 'left' }}>
              <h3 style={{
                fontSize: typography.fontSize.lg,
                fontWeight: typography.fontWeight.semibold,
                color: config.color,
                marginBottom: spacing.xs,
              }}>
                {config.title}
              </h3>
              <p style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>
                {config.subtitle}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
            <Badge variant="default" size="sm">
              {items.length}
            </Badge>
            {isExpanded ? <ChevronUp size={20} style={{ color: colors.text.secondary }} /> : <ChevronDown size={20} style={{ color: colors.text.secondary }} />}
          </div>
        </button>

        {/* Section Content */}
        {isExpanded && (
          <div style={{ padding: spacing.lg }}>
            {items.length === 0 ? (
              <p style={{
                textAlign: 'center',
                color: colors.text.muted,
                padding: spacing.xl,
              }}>
                No {config.title.toLowerCase()} yet
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
                {items.map((item) => {
                  const isProcessing = processingId === item.id;

                  return (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: spacing.md,
                        background: colors.background.secondary,
                        borderRadius: borderRadius.lg,
                        border: `1px solid ${colors.border.light}`,
                      }}
                    >
                      {/* Person Info */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md, flex: 1 }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: borderRadius.full,
                          background: `linear-gradient(135deg, ${config.color}40, ${config.color}20)`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: typography.fontWeight.bold,
                          color: config.color,
                          fontSize: typography.fontSize.md,
                        }}>
                          {item.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                            <span style={{ fontWeight: typography.fontWeight.medium }}>
                              {item.name || 'Unknown'}
                            </span>
                            {/* Nomination type badge */}
                            {!isContestants && item.nominatedBy && (
                              <Badge
                                variant={item.nominatedBy === 'self' ? 'info' : 'warning'}
                                size="sm"
                              >
                                {item.nominatedBy === 'self' ? 'Self-nominated' : 'Third-party'}
                              </Badge>
                            )}
                            {/* Declined/Rejected badge */}
                            {(item.status === 'declined' || item.status === 'rejected') && (
                              <Badge variant="error" size="sm">
                                {item.status === 'declined' ? 'Declined' : 'Rejected'}
                              </Badge>
                            )}
                            {/* Profile linked badge */}
                            {!isContestants && item.hasProfile && (
                              <Badge variant="success" size="sm">
                                Has Profile
                              </Badge>
                            )}
                          </div>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: spacing.lg,
                            marginTop: spacing.xs,
                            color: colors.text.secondary,
                            fontSize: typography.fontSize.sm,
                          }}>
                            {item.email && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: spacing.xs }}>
                                <Mail size={12} />
                                {item.email}
                              </span>
                            )}
                            {item.instagram && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: spacing.xs }}>
                                <Instagram size={12} />
                                @{item.instagram.replace('@', '')}
                              </span>
                            )}
                            {isContestants && typeof item.votes === 'number' && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: spacing.xs }}>
                                <Users size={12} />
                                {item.votes} votes
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                        {isProcessing ? (
                          <Loader size={16} style={{ animation: 'spin 1s linear infinite', color: colors.gold.primary }} />
                        ) : (
                          <>
                            {/* View Profile button for nominees with profile */}
                            {!isContestants && item.hasProfile && (
                              <Button
                                variant="secondary"
                                size="sm"
                                icon={ExternalLink}
                                style={{ padding: `${spacing.xs} ${spacing.sm}` }}
                              >
                                View Profile
                              </Button>
                            )}

                            {/* Copy claim link button */}
                            {!isContestants && item.inviteToken && (
                              <Button
                                variant="secondary"
                                size="sm"
                                icon={copiedId === item.id ? Check : Link2}
                                onClick={() => handleCopyClaimLink(item)}
                                style={{
                                  padding: `${spacing.xs} ${spacing.sm}`,
                                  ...(copiedId === item.id ? { color: colors.status.success, borderColor: colors.status.success } : {}),
                                }}
                              >
                                {copiedId === item.id ? 'Copied!' : 'Claim Link'}
                              </Button>
                            )}

                            {/* Resend invite button for nominees without a profile */}
                            {!isContestants && !isRejected && !item.hasProfile && item.inviteToken && (
                              <Button
                                variant="secondary"
                                size="sm"
                                icon={resentId === item.id ? Check : Send}
                                onClick={() => handleResendInvite(item)}
                                style={{
                                  padding: `${spacing.xs} ${spacing.sm}`,
                                  ...(resentId === item.id ? { color: colors.status.success, borderColor: colors.status.success } : {}),
                                }}
                              >
                                {resentId === item.id ? 'Sent!' : 'Resend Invite'}
                              </Button>
                            )}

                            {/* Approve button for pending nominees */}
                            {!isContestants && !isRejected && (
                              <Button
                                variant="primary"
                                size="sm"
                                icon={Check}
                                onClick={() => handleApprove(item)}
                                style={{ padding: `${spacing.xs} ${spacing.sm}` }}
                              >
                                Approve
                              </Button>
                            )}

                            {/* Reject/Deny button for active nominees */}
                            {!isContestants && !isRejected && (
                              <Button
                                variant="secondary"
                                size="sm"
                                icon={XCircle}
                                onClick={() => handleReject(item.id)}
                                style={{ padding: `${spacing.xs} ${spacing.sm}`, color: colors.status.error, borderColor: colors.status.error }}
                              />
                            )}

                            {/* Restore button for rejected/declined nominees */}
                            {isRejected && (
                              <Button
                                variant="secondary"
                                size="sm"
                                icon={RotateCcw}
                                onClick={() => handleRestore(item.id)}
                                style={{ padding: `${spacing.xs} ${spacing.sm}` }}
                              >
                                Restore
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      {/* Stats Summary */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: spacing.lg,
        marginBottom: spacing.xxl,
      }}>
        {Object.entries(SECTION_CONFIG).map(([key, config]) => {
          const count = categorizedData[key]?.length || 0;
          const Icon = config.icon;

          return (
            <div
              key={key}
              style={{
                background: colors.background.card,
                border: `1px solid ${colors.border.light}`,
                borderRadius: borderRadius.xl,
                padding: spacing.lg,
                display: 'flex',
                alignItems: 'center',
                gap: spacing.md,
              }}
            >
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: borderRadius.lg,
                background: config.bgColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Icon size={24} style={{ color: config.color }} />
              </div>
              <div>
                <p style={{
                  fontSize: typography.fontSize.xxl,
                  fontWeight: typography.fontWeight.bold,
                  color: config.color,
                }}>
                  {count}
                </p>
                <p style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>
                  {config.title}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Sections */}
      {renderSection('contestants', categorizedData.contestants)}
      {renderSection('withProfile', categorizedData.withProfile)}
      {renderSection('external', categorizedData.external)}
      {categorizedData.incomplete.length > 0 && renderSection('incomplete', categorizedData.incomplete)}
      {renderSection('rejected', categorizedData.rejected)}
    </div>
  );
}
