import React, { useState, useRef } from 'react';
import {
  Crown, RotateCcw, ExternalLink, UserCheck, Users, CheckCircle, XCircle,
  Plus, User, Star, FileText, MapPin, UserPlus, Link2, Check, Download, Loader, Send, Camera, Wrench, Clock
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button, Badge, Avatar, Panel } from '../../../../components/ui';
import { colors, spacing, borderRadius, typography } from '../../../../styles/theme';
import { useResponsive } from '../../../../hooks/useResponsive';
import { generateAchievementCard } from '../../../achievement-cards/generateAchievementCard';
import { uploadPhoto } from '../../../entry/utils/uploadPhoto';
import { supabase } from '../../../../lib/supabase';
import WinnersManager from '../WinnersManager';

/**
 * PeopleTab - Manages winners, nominees, contestants, and host profile
 */
export default function PeopleTab({
  competition,
  nominees,
  contestants,
  host,
  isSuperAdmin = false,
  onRefresh,
  onApproveNominee,
  onRejectNominee,
  onRestoreNominee,
  onOpenAddPersonModal,
  onShowHostAssignment,
  onRemoveHost,
  onResendInvite,
  onRepairNomineeAccount,
  onRepairAllNomineeAccounts,
}) {
  const { isMobile } = useResponsive();
  const navigate = useNavigate();
  const [processingIds, setProcessingIds] = useState(new Set());
  const addProcessing = (id) => setProcessingIds(prev => new Set(prev).add(id));
  const removeProcessing = (id) => setProcessingIds(prev => { const next = new Set(prev); next.delete(id); return next; });
  const [copiedId, setCopiedId] = useState(null);
  const [resentId, setResentId] = useState(null);
  const [generatingCardId, setGeneratingCardId] = useState(null);
  const [uploadingAvatarId, setUploadingAvatarId] = useState(null);
  const avatarFileRef = useRef(null);
  const avatarUploadTarget = useRef(null);

  const handleAvatarClick = (nominee) => {
    avatarUploadTarget.current = nominee;
    avatarFileRef.current?.click();
  };

  const handleAvatarFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !avatarUploadTarget.current) return;
    const nominee = avatarUploadTarget.current;
    e.target.value = '';

    setUploadingAvatarId(nominee.id);
    try {
      const url = await uploadPhoto(file, 'host-uploads');
      await supabase
        .from('nominees')
        .update({ avatar_url: url })
        .eq('id', nominee.id);
      onRefresh?.();
    } catch (err) {
      console.error('Avatar upload failed:', err);
    } finally {
      setUploadingAvatarId(null);
      avatarUploadTarget.current = null;
    }
  };

  const handleViewProfile = (profileId) => {
    if (!profileId) return;
    navigate(`/profile/${profileId}`);
  };

  const handleDownloadCard = async (person, type = 'contestant') => {
    setGeneratingCardId(person.id);
    try {
      const blob = await generateAchievementCard({
        achievementType: type === 'contestant' ? 'contestant' : 'nominated',
        name: person.name,
        photoUrl: person.avatarUrl,
        handle: person.instagram,
        competitionName: competition?.name || `Most Eligible ${competition?.city?.name || competition?.city}`,
        cityName: competition?.city?.name || competition?.city,
        season: competition?.season?.toString(),
        organizationName: competition?.organizationName || 'Most Eligible',
        organizationLogoUrl: competition?.organizationLogoUrl,
        accentColor: competition?.themePrimary || '#d4af37',
        voteUrl: competition?.slug ? `mosteligible.co/${competition.slug}` : 'mosteligible.co',
        votingStartDate: competition?.votingStart,
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${person.name.replace(/\s+/g, '-').toLowerCase()}-${type}-card.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Card generation failed:', err);
    } finally {
      setGeneratingCardId(null);
    }
  };

  const handleCopyClaimLink = async (nominee) => {
    if (!nominee.inviteToken) return;
    const url = `${window.location.origin}/claim/${nominee.inviteToken}`;
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
    setCopiedId(nominee.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleResendInvite = async (nominee) => {
    if (!onResendInvite) return;
    addProcessing(nominee.id);
    try {
      const result = await onResendInvite(nominee.id);
      if (result?.success) {
        setResentId(nominee.id);
        setTimeout(() => setResentId(null), 2000);
      } else {
        alert(result?.error || 'Failed to send reminder. Please try again.');
      }
    } catch (err) {
      alert('Failed to send reminder. Please try again.');
    } finally {
      removeProcessing(nominee.id);
    }
  };

  // Categorize nominees
  const activeNominees = nominees.filter(n => {
    if (n.status !== 'pending' && n.status !== 'profile_complete' && n.status !== 'awaiting_profile') return false;
    // Incomplete self-nominees go in their own bucket
    if (n.nominatedBy === 'self' && !n.claimedAt) return false;
    return true;
  });
  // Incomplete self-nominations: started the flow but haven't finished
  const incompleteNominees = nominees.filter(n =>
    (n.status === 'pending' || n.status === 'awaiting_profile' || n.status === 'profile_complete') &&
    n.nominatedBy === 'self' && !n.claimedAt
  );
  const nomineesWithProfile = activeNominees.filter(n => n.hasProfile);
  const externalNominees = activeNominees.filter(n => !n.hasProfile);
  const declinedNominees = nominees.filter(n => n.status === 'declined' || n.status === 'rejected' || n.status === 'archived');

  // Whether a nominee can be approved (must have accepted and have a profile)
  const canApprove = (nominee) => {
    if (nominee.nominatedBy === 'self') return !!nominee.hasProfile;
    return !!nominee.claimedAt && !!nominee.hasProfile;
  };

  // Acceptance status badge for nominees
  const AcceptanceStatus = ({ nominee }) => {
    if (nominee.nominatedBy === 'self') {
      return (
        <span style={{
          fontSize: typography.fontSize.xs,
          padding: `2px ${spacing.sm}`,
          borderRadius: borderRadius.sm,
          background: 'rgba(212,175,55,0.15)',
          color: colors.gold.primary,
          whiteSpace: 'nowrap',
        }}>
          Self
        </span>
      );
    }
    if (nominee.claimedAt && nominee.userId) {
      return (
        <span style={{
          fontSize: typography.fontSize.xs,
          padding: `2px ${spacing.sm}`,
          borderRadius: borderRadius.sm,
          background: 'rgba(34,197,94,0.15)',
          color: '#22c55e',
          whiteSpace: 'nowrap',
        }}>
          Accepted
        </span>
      );
    }
    if (nominee.claimedAt || (nominee.flowStage && nominee.flowStage !== 'pending')) {
      return (
        <span style={{
          fontSize: typography.fontSize.xs,
          padding: `2px ${spacing.sm}`,
          borderRadius: borderRadius.sm,
          background: 'rgba(251,146,60,0.15)',
          color: '#fb923c',
          whiteSpace: 'nowrap',
        }}>
          In Progress
        </span>
      );
    }
    return (
      <span style={{
        fontSize: typography.fontSize.xs,
        padding: `2px ${spacing.sm}`,
        borderRadius: borderRadius.sm,
        background: 'rgba(251,191,36,0.15)',
        color: '#fbbf24',
        whiteSpace: 'nowrap',
      }}>
        Awaiting Response
      </span>
    );
  };

  // Action buttons for nominee rows
  const NomineeActions = ({ nominee }) => {
    const isProcessing = processingIds.has(nominee.id);
    const approveDisabled = isProcessing || !canApprove(nominee);
    const isCopied = copiedId === nominee.id;
    return (
      <div style={{ display: 'flex', gap: spacing.xs, alignItems: 'center' }}>
        <AcceptanceStatus nominee={nominee} />
        {nominee.inviteToken && (
          <button
            onClick={() => handleCopyClaimLink(nominee)}
            title={isCopied ? 'Copied!' : 'Copy claim link'}
            style={{
              padding: spacing.xs,
              background: isCopied ? 'rgba(34,197,94,0.1)' : 'rgba(59,130,246,0.1)',
              border: 'none',
              borderRadius: borderRadius.sm,
              cursor: 'pointer',
              color: isCopied ? '#22c55e' : '#3b82f6',
              minWidth: '32px',
              minHeight: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isCopied ? <Check size={16} /> : <Link2 size={16} />}
          </button>
        )}
        {nominee.email && onResendInvite && (!nominee.hasProfile || (nominee.claimedAt && !nominee.convertedToContestant)) && (
          <button
            onClick={() => handleResendInvite(nominee)}
            disabled={isProcessing}
            title={resentId === nominee.id ? 'Sent!' : `${nominee.claimedAt ? 'Send profile completion reminder' : 'Resend invite email'}${nominee.inviteSentAt ? `\nLast sent: ${new Date(nominee.inviteSentAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}` : '\nNever sent'}`}
            style={{
              padding: spacing.xs,
              background: resentId === nominee.id ? 'rgba(34,197,94,0.1)' : 'rgba(168,85,247,0.1)',
              border: 'none',
              borderRadius: borderRadius.sm,
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              color: resentId === nominee.id ? '#22c55e' : '#a855f7',
              minWidth: '32px',
              minHeight: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {resentId === nominee.id ? <Check size={16} /> : <Send size={16} />}
          </button>
        )}
        {!nominee.hasProfile && nominee.email && nominee.claimedAt && nominee.userId && onRepairNomineeAccount && (
          <button
            onClick={async () => {
              addProcessing(nominee.id);
              try {
                const result = await onRepairNomineeAccount(nominee.id);
                if (result?.success) {
                  const msg = result.data?.repaired?.length
                    ? `Repaired: ${result.data.repaired[0]?.action}`
                    : result.data?.skipped?.length
                      ? `Already OK: ${result.data.skipped[0]?.reason}`
                      : 'Done';
                  alert(msg);
                } else {
                  alert(`Repair failed: ${result?.error || 'Unknown error'}`);
                }
              } finally {
                removeProcessing(nominee.id);
              }
            }}
            disabled={isProcessing}
            title="Repair account (create auth user + sync profile data)"
            style={{
              padding: spacing.xs,
              background: 'rgba(245,158,11,0.1)',
              border: 'none',
              borderRadius: borderRadius.sm,
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              color: '#f59e0b',
              minWidth: '32px',
              minHeight: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Wrench size={16} />
          </button>
        )}
        <button
          onClick={async () => { addProcessing(nominee.id); try { await onApproveNominee(nominee); } finally { removeProcessing(nominee.id); } }}
          disabled={approveDisabled}
          title={!canApprove(nominee) ? 'Nominee must accept first' : 'Approve'}
          style={{
            padding: spacing.xs,
            background: approveDisabled ? 'rgba(107,114,128,0.1)' : 'rgba(34,197,94,0.1)',
            border: 'none',
            borderRadius: borderRadius.sm,
            cursor: approveDisabled ? 'not-allowed' : 'pointer',
            color: approveDisabled ? '#6b7280' : '#22c55e',
            minWidth: '32px',
            minHeight: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: approveDisabled ? 0.5 : 1,
          }}
        >
          <CheckCircle size={16} />
        </button>
        <button
          onClick={async () => { addProcessing(nominee.id); try { await onRejectNominee(nominee.id); } finally { removeProcessing(nominee.id); } }}
          disabled={isProcessing}
          style={{
            padding: spacing.xs,
            background: 'rgba(239,68,68,0.1)',
            border: 'none',
            borderRadius: borderRadius.sm,
            cursor: 'pointer',
            color: '#ef4444',
            minWidth: '32px',
            minHeight: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <XCircle size={16} />
        </button>
      </div>
    );
  };

  // Download card button shared across rows
  const CardDownloadButton = ({ person, type }) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const isContestant = type === 'contestant';

    if (!isContestant) {
      return (
        <button
          onClick={() => handleDownloadCard(person, type)}
          disabled={generatingCardId === person.id}
          title="Download share card"
          style={{
            padding: spacing.xs,
            background: 'rgba(212,175,55,0.1)',
            border: 'none',
            borderRadius: borderRadius.sm,
            cursor: generatingCardId === person.id ? 'wait' : 'pointer',
            color: colors.gold.primary,
            minWidth: '32px',
            minHeight: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {generatingCardId === person.id ? (
            <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />
          ) : (
            <Download size={16} />
          )}
        </button>
      );
    }

    return (
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          disabled={generatingCardId === person.id}
          title="Download share card"
          style={{
            padding: spacing.xs,
            background: 'rgba(212,175,55,0.1)',
            border: 'none',
            borderRadius: borderRadius.sm,
            cursor: generatingCardId === person.id ? 'wait' : 'pointer',
            color: colors.gold.primary,
            minWidth: '32px',
            minHeight: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {generatingCardId === person.id ? (
            <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />
          ) : (
            <Download size={16} />
          )}
        </button>
        {menuOpen && (
          <>
            <div
              style={{ position: 'fixed', inset: 0, zIndex: 9 }}
              onClick={() => setMenuOpen(false)}
            />
            <div style={{
              position: 'absolute',
              right: 0,
              top: '100%',
              marginTop: 4,
              background: colors.background.secondary,
              border: `1px solid ${colors.border.primary}`,
              borderRadius: borderRadius.md,
              padding: spacing.xs,
              zIndex: 10,
              minWidth: 160,
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}>
              <button
                onClick={() => { setMenuOpen(false); handleDownloadCard(person, 'contestant'); }}
                style={{
                  padding: `${spacing.xs} ${spacing.sm}`,
                  background: 'none',
                  border: 'none',
                  color: colors.text.primary,
                  cursor: 'pointer',
                  borderRadius: borderRadius.sm,
                  textAlign: 'left',
                  fontSize: typography.fontSize.sm,
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={e => e.target.style.background = 'rgba(255,255,255,0.05)'}
                onMouseLeave={e => e.target.style.background = 'none'}
              >
                Contestant Card
              </button>
              <button
                onClick={() => { setMenuOpen(false); handleDownloadCard(person, 'nominee'); }}
                style={{
                  padding: `${spacing.xs} ${spacing.sm}`,
                  background: 'none',
                  border: 'none',
                  color: colors.text.primary,
                  cursor: 'pointer',
                  borderRadius: borderRadius.sm,
                  textAlign: 'left',
                  fontSize: typography.fontSize.sm,
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={e => e.target.style.background = 'rgba(255,255,255,0.05)'}
                onMouseLeave={e => e.target.style.background = 'none'}
              >
                Nominated Card
              </button>
            </div>
          </>
        )}
      </div>
    );
  };

  // Person row component - shared between contestants and nominees
  const PersonRow = ({ person, actions, dimmed, showVotes, onNameClick, cardType, onAvatarUpload }) => (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.md,
      background: colors.background.secondary,
      borderRadius: borderRadius.lg,
      opacity: dimmed ? 0.7 : 1,
    }}>
      {onAvatarUpload ? (
        <button
          onClick={() => onAvatarUpload(person)}
          title={person.avatarUrl ? 'Change photo' : 'Upload photo'}
          style={{
            position: 'relative',
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: uploadingAvatarId === person.id ? 'wait' : 'pointer',
            borderRadius: '50%',
            flexShrink: 0,
          }}
        >
          <Avatar name={person.name} size={40} src={person.avatarUrl} />
          <div style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: uploadingAvatarId === person.id ? 1 : 0,
            transition: 'opacity 0.15s',
          }}
            onMouseEnter={e => { if (uploadingAvatarId !== person.id) e.currentTarget.style.opacity = '0.8'; }}
            onMouseLeave={e => { if (uploadingAvatarId !== person.id) e.currentTarget.style.opacity = '0'; }}
          >
            {uploadingAvatarId === person.id ? (
              <Loader size={16} style={{ color: '#fff', animation: 'spin 1s linear infinite' }} />
            ) : (
              <Camera size={16} style={{ color: '#fff' }} />
            )}
          </div>
        </button>
      ) : (
        <Avatar name={person.name} size={40} src={person.avatarUrl} />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        {onNameClick ? (
          <button
            onClick={onNameClick}
            style={{
              fontWeight: typography.fontWeight.medium,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              background: 'none',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              padding: 0,
              fontSize: 'inherit',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: spacing.xs,
              width: '100%',
            }}
          >
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {person.name}
            </span>
            <ExternalLink size={12} style={{ opacity: 0.5, flexShrink: 0 }} />
          </button>
        ) : (
          <p style={{
            fontWeight: typography.fontWeight.medium,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {person.name}
          </p>
        )}
        <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted }}>
          {person.email}{showVotes && person.votes > 0 ? `${person.email ? ' · ' : ''}${person.votes} votes` : ''}
          {person.inviteSentAt && (
            <span style={{ color: colors.text.muted, opacity: 0.7 }}>
              {' · '}Invited {new Date(person.inviteSentAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          )}
        </p>
      </div>
      {cardType && <CardDownloadButton person={person} type={cardType} />}
      {actions}
    </div>
  );

  const totalPeople = activeNominees.length + contestants.length;
  const isNewHost = totalPeople === 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xl }}>
      {/* Hidden file input for nominee avatar uploads */}
      <input
        ref={avatarFileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic"
        style={{ display: 'none' }}
        onChange={handleAvatarFileChange}
      />

      {/* Getting Started - shown when no people yet */}
      {isNewHost && (
        <div style={{
          padding: isMobile ? spacing.lg : spacing.xl,
          borderRadius: borderRadius.xl,
          background: 'linear-gradient(135deg, rgba(212,175,55,0.1) 0%, rgba(139,92,246,0.06) 100%)',
          border: '1px solid rgba(212,175,55,0.2)',
        }}>
          <h3 style={{
            fontSize: typography.fontSize.xl,
            fontWeight: typography.fontWeight.semibold,
            marginBottom: spacing.sm,
            color: colors.gold.primary,
          }}>
            Get your first nominees
          </h3>
          <p style={{
            color: colors.text.secondary,
            fontSize: typography.fontSize.sm,
            lineHeight: 1.6,
            marginBottom: spacing.lg,
          }}>
            Share your competition link to collect nominations, or add people manually to get started.
          </p>
          <div style={{ display: 'flex', gap: spacing.sm, flexWrap: 'wrap' }}>
            <Button size="sm" icon={Plus} onClick={() => onOpenAddPersonModal('nominee')}>
              Add Nominee
            </Button>
            <Button size="sm" variant="secondary" icon={Plus} onClick={() => onOpenAddPersonModal('contestant')}>
              Add Contestant
            </Button>
          </div>
        </div>
      )}

      {/* Host Profile Section */}
      <Panel
        title="Host Profile"
        icon={User}
        style={{ marginBottom: 0 }}
        collapsible
        action={
          host && isSuperAdmin ? (
            <div style={{ display: 'flex', gap: spacing.sm }}>
              <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); onShowHostAssignment(); }}>
                Reassign
              </Button>
              <Button
                size="sm"
                variant="secondary"
                style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.5)' }}
                onClick={(e) => { e.stopPropagation(); onRemoveHost(); }}
              >
                Remove
              </Button>
            </div>
          ) : isSuperAdmin ? (
            <Button size="sm" icon={UserPlus} onClick={(e) => { e.stopPropagation(); onShowHostAssignment(); }}>
              Assign Host
            </Button>
          ) : null
        }
      >
        <div style={{ padding: isMobile ? spacing.md : spacing.xl }}>
          {!host ? (
            <div style={{ textAlign: 'center', padding: spacing.xl, color: colors.text.secondary }}>
              <User size={48} style={{ marginBottom: spacing.md, opacity: 0.5 }} />
              <p style={{ marginBottom: spacing.lg }}>No host assigned yet</p>
              {isSuperAdmin && (
                <Button icon={UserPlus} onClick={onShowHostAssignment}>Assign Host</Button>
              )}
            </div>
          ) : (
            <div>
              <div style={{
                display: 'flex',
                alignItems: isMobile ? 'flex-start' : 'center',
                gap: spacing.xl,
                marginBottom: spacing.xl,
                flexDirection: isMobile ? 'column' : 'row',
              }}>
                <Avatar name={host.name} src={host.avatar} size={isMobile ? 80 : 100} />
                <div style={{ flex: 1 }}>
                  <h2 style={{
                    fontSize: isMobile ? typography.fontSize.xl : typography.fontSize.display,
                    fontWeight: typography.fontWeight.bold,
                  }}>
                    {host.name}
                  </h2>
                  {host.city && (
                    <p style={{
                      color: colors.text.secondary,
                      display: 'flex',
                      alignItems: 'center',
                      gap: spacing.sm,
                      marginTop: spacing.sm,
                    }}>
                      <MapPin size={16} /> {host.city}
                    </p>
                  )}
                  <Badge variant="gold" size="md" style={{ marginTop: spacing.md }}>
                    <Star size={14} style={{ marginRight: spacing.xs }} /> Verified Host
                  </Badge>
                </div>
              </div>

              {host.bio && (
                <div style={{ marginBottom: spacing.xl }}>
                  <h3 style={{
                    fontSize: typography.fontSize.lg,
                    fontWeight: typography.fontWeight.semibold,
                    marginBottom: spacing.md,
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing.sm,
                  }}>
                    <FileText size={18} /> About
                  </h3>
                  <p style={{ color: colors.text.secondary, lineHeight: 1.6 }}>{host.bio}</p>
                </div>
              )}

              {host.instagram && (
                <div style={{ marginBottom: spacing.xl }}>
                  <h3 style={{
                    fontSize: typography.fontSize.lg,
                    fontWeight: typography.fontWeight.semibold,
                    marginBottom: spacing.md,
                  }}>
                    Social
                  </h3>
                  <a
                    href={`https://instagram.com/${host.instagram.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: spacing.sm,
                      padding: `${spacing.sm} ${spacing.md}`,
                      background: 'rgba(255,255,255,0.05)',
                      border: `1px solid ${colors.border.light}`,
                      borderRadius: borderRadius.md,
                      color: colors.text.primary,
                      textDecoration: 'none',
                      minHeight: '44px',
                    }}
                  >
                    @{host.instagram.replace('@', '')}
                  </a>
                </div>
              )}

              {host.gallery && host.gallery.length > 0 && (
                <div>
                  <h3 style={{
                    fontSize: typography.fontSize.lg,
                    fontWeight: typography.fontWeight.semibold,
                    marginBottom: spacing.md,
                  }}>
                    Gallery
                  </h3>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(150px, 1fr))',
                    gap: spacing.md,
                  }}>
                    {host.gallery.map((img, i) => (
                      <img
                        key={i}
                        src={typeof img === 'string' ? img : img.url}
                        alt={`Gallery ${i + 1}`}
                        style={{
                          width: '100%',
                          aspectRatio: '1',
                          objectFit: 'cover',
                          borderRadius: borderRadius.lg,
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </Panel>

      {/* Winners Manager */}
      <WinnersManager competition={competition} onUpdate={onRefresh} allowEdit={true} />

      {/* Stats Row - hide when all zeros */}
      {!isNewHost && <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)',
        gap: spacing.sm,
      }}>
        {[
          { label: 'Total Nominees', value: activeNominees.length, color: colors.gold.primary },
          { label: 'With Profile', value: nomineesWithProfile.length, color: '#3b82f6' },
          { label: 'External', value: externalNominees.length, color: '#f59e0b' },
          { label: 'Approved', value: contestants.length, color: '#22c55e' },
          { label: 'Declined', value: declinedNominees.length, color: '#ef4444' },
        ].map((stat, i, arr) => (
          <div
            key={stat.label}
            style={{
              background: colors.background.card,
              border: `1px solid ${colors.border.light}`,
              borderRadius: borderRadius.lg,
              padding: spacing.md,
              ...(isMobile && i === arr.length - 1 && arr.length % 2 === 1 ? { gridColumn: 'span 2' } : {}),
            }}
          >
            <p style={{
              color: colors.text.secondary,
              fontSize: typography.fontSize.xs,
              marginBottom: spacing.xs,
            }}>
              {stat.label}
            </p>
            <p style={{
              fontSize: typography.fontSize.xl,
              fontWeight: typography.fontWeight.bold,
              color: stat.color,
            }}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>}

      {/* Contestants Section */}
      <Panel
        title={`Contestants (${contestants.length})`}
        icon={Crown}
        style={{ marginBottom: 0 }}
        action={
          <Button size="sm" icon={Plus} onClick={() => onOpenAddPersonModal('contestant')}>
            Add
          </Button>
        }
        collapsible
      >
        <div style={{ padding: isMobile ? spacing.md : spacing.xl }}>
          {contestants.length === 0 ? (
            <div style={{ textAlign: 'center', padding: spacing.xl, color: colors.text.secondary }}>
              <Crown size={40} style={{ marginBottom: spacing.md, opacity: 0.4, color: colors.gold.primary }} />
              <p style={{ marginBottom: spacing.md, fontSize: typography.fontSize.sm }}>No contestants yet</p>
              <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, marginBottom: spacing.lg }}>
                Approve nominees or add people manually to build your lineup.
              </p>
              <Button size="sm" icon={Plus} onClick={() => onOpenAddPersonModal('contestant')}>
                Add Contestant
              </Button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
              {contestants.map(c => (
                <PersonRow
                  key={c.id}
                  person={c}
                  showVotes
                  cardType="contestant"
                  onNameClick={c.userId ? () => handleViewProfile(c.userId) : undefined}
                />
              ))}
            </div>
          )}
        </div>
      </Panel>

      {/* Nominees with Profile */}
      <Panel
        title={`Nominees with Profile (${nomineesWithProfile.length})`}
        icon={UserCheck}
        style={{ marginBottom: 0 }}
        action={
          <Button size="sm" variant="secondary" icon={Plus} onClick={() => onOpenAddPersonModal('nominee')}>
            Add
          </Button>
        }
        collapsible
        defaultCollapsed
      >
        <div style={{ padding: isMobile ? spacing.md : spacing.xl }}>
          {nomineesWithProfile.length === 0 ? (
            <div style={{ textAlign: 'center', padding: spacing.xl, color: colors.text.secondary }}>
              <UserCheck size={40} style={{ marginBottom: spacing.md, opacity: 0.4 }} />
              <p style={{ fontSize: typography.fontSize.sm }}>No nominees with linked profiles yet</p>
              <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, marginTop: spacing.xs }}>
                Nominees who accept their invitation and create a profile will appear here.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
              {nomineesWithProfile.map(n => (
                <PersonRow
                  key={n.id}
                  person={n}
                  showVotes
                  cardType="nominee"
                  onNameClick={n.matchedProfileId ? () => handleViewProfile(n.matchedProfileId) : undefined}
                  actions={<NomineeActions nominee={n} />}
                  onAvatarUpload={handleAvatarClick}
                />
              ))}
            </div>
          )}
        </div>
      </Panel>

      {/* External Nominees */}
      <Panel
        title={`External Nominees (${externalNominees.length})`}
        icon={Users}
        style={{ marginBottom: 0 }}
        collapsible
        defaultCollapsed
      >
        <div style={{ padding: isMobile ? spacing.md : spacing.xl }}>
          {externalNominees.length > 0 && onRepairAllNomineeAccounts && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: spacing.md }}>
              <Button
                variant="secondary"
                size="sm"
                disabled={processingIds.has('repair-all')}
                onClick={async () => {
                  if (!confirm(`Repair all ${externalNominees.length} external nominee accounts? This will create auth users and sync profiles for any that are missing.`)) return;
                  addProcessing('repair-all');
                  try {
                    const result = await onRepairAllNomineeAccounts();
                    if (result?.success) {
                      alert(result.data?.summary || 'Repair complete');
                    } else {
                      alert(`Repair failed: ${result?.error || 'Unknown error'}`);
                    }
                  } finally {
                    removeProcessing('repair-all');
                  }
                }}
              >
                <Wrench size={14} style={{ marginRight: spacing.xs }} />
                {processingIds.has('repair-all') ? 'Repairing...' : 'Repair All Accounts'}
              </Button>
            </div>
          )}
          {externalNominees.length === 0 ? (
            <div style={{ textAlign: 'center', padding: spacing.xl, color: colors.text.secondary }}>
              <Users size={40} style={{ marginBottom: spacing.md, opacity: 0.4 }} />
              <p style={{ fontSize: typography.fontSize.sm }}>No external nominees</p>
              <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, marginTop: spacing.xs }}>
                Nominees without a linked profile will appear here.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
              {externalNominees.map(n => (
                <PersonRow
                  key={n.id}
                  person={n}
                  showVotes
                  cardType="nominee"
                  actions={<NomineeActions nominee={n} />}
                  onAvatarUpload={handleAvatarClick}
                />
              ))}
            </div>
          )}
        </div>
      </Panel>

      {/* Incomplete Self-Nominations */}
      {incompleteNominees.length > 0 && (
        <Panel
          title={`Incomplete Self-Nominations (${incompleteNominees.length})`}
          icon={Clock}
          style={{ marginBottom: 0 }}
          collapsible
          defaultCollapsed={false}
        >
          <div style={{ padding: isMobile ? spacing.md : spacing.xl }}>
            <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm, marginBottom: spacing.md }}>
              These people started entering but haven't finished their profile. Send a reminder to nudge them to complete.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
              {incompleteNominees.map(n => (
                <PersonRow
                  key={n.id}
                  person={n}
                  cardType="nominee"
                  onAvatarUpload={handleAvatarClick}
                  actions={
                    <div style={{ display: 'flex', gap: spacing.xs, alignItems: 'center' }}>
                      <span style={{
                        fontSize: typography.fontSize.xs,
                        padding: `2px ${spacing.sm}`,
                        borderRadius: borderRadius.sm,
                        background: 'rgba(251,191,36,0.15)',
                        color: '#fbbf24',
                        whiteSpace: 'nowrap',
                      }}>
                        Incomplete
                      </span>
                      {n.inviteToken && (
                        <button
                          onClick={() => handleCopyClaimLink(n)}
                          title={copiedId === n.id ? 'Copied!' : 'Copy resume link'}
                          style={{
                            padding: spacing.xs,
                            background: copiedId === n.id ? 'rgba(34,197,94,0.1)' : 'rgba(59,130,246,0.1)',
                            border: 'none',
                            borderRadius: borderRadius.sm,
                            cursor: 'pointer',
                            color: copiedId === n.id ? '#22c55e' : '#3b82f6',
                            minWidth: '32px',
                            minHeight: '32px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {copiedId === n.id ? <Check size={16} /> : <Link2 size={16} />}
                        </button>
                      )}
                      {n.email && onResendInvite && (
                        <button
                          onClick={() => handleResendInvite(n)}
                          disabled={processingIds.has(n.id)}
                          title={resentId === n.id ? 'Sent!' : `Send reminder to finish profile${n.inviteSentAt ? `\nLast sent: ${new Date(n.inviteSentAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}` : ''}`}
                          style={{
                            padding: spacing.xs,
                            background: resentId === n.id ? 'rgba(34,197,94,0.1)' : 'rgba(168,85,247,0.1)',
                            border: 'none',
                            borderRadius: borderRadius.sm,
                            cursor: processingIds.has(n.id) ? 'not-allowed' : 'pointer',
                            color: resentId === n.id ? '#22c55e' : '#a855f7',
                            minWidth: '32px',
                            minHeight: '32px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {resentId === n.id ? <Check size={16} /> : <Send size={16} />}
                        </button>
                      )}
                      <button
                        onClick={async () => { addProcessing(n.id); try { await onRejectNominee(n.id); } finally { removeProcessing(n.id); } }}
                        disabled={processingIds.has(n.id)}
                        title="Reject"
                        style={{
                          padding: spacing.xs,
                          background: 'rgba(239,68,68,0.1)',
                          border: 'none',
                          borderRadius: borderRadius.sm,
                          cursor: 'pointer',
                          color: '#ef4444',
                          minWidth: '32px',
                          minHeight: '32px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <XCircle size={16} />
                      </button>
                    </div>
                  }
                />
              ))}
            </div>
          </div>
        </Panel>
      )}

      {/* Declined / Rejected */}
      {declinedNominees.length > 0 && (
        <Panel
          title={`Declined (${declinedNominees.length})`}
          icon={XCircle}
          style={{ marginBottom: 0 }}
          collapsible
          defaultCollapsed
        >
          <div style={{ padding: isMobile ? spacing.md : spacing.xl }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
              {declinedNominees.map(n => (
                <PersonRow
                  key={n.id}
                  person={n}
                  dimmed
                  actions={
                    <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs }}>
                      <Badge variant="error" size="sm">
                        {n.status === 'declined' ? 'Declined' : 'Rejected'}
                      </Badge>
                      <button
                        onClick={async () => {
                          addProcessing(n.id);
                          try { await onRestoreNominee(n.id); } finally { removeProcessing(n.id); }
                        }}
                        disabled={processingIds.has(n.id)}
                        title="Unreject"
                        style={{
                          padding: `${spacing.xs} ${spacing.sm}`,
                          background: 'rgba(34,197,94,0.1)',
                          border: 'none',
                          borderRadius: borderRadius.sm,
                          cursor: processingIds.has(n.id) ? 'not-allowed' : 'pointer',
                          color: '#22c55e',
                          display: 'flex',
                          alignItems: 'center',
                          gap: spacing.xs,
                          fontSize: typography.fontSize.sm,
                        }}
                      >
                        <RotateCcw size={14} /> Restore
                      </button>
                    </div>
                  }
                />
              ))}
            </div>
          </div>
        </Panel>
      )}

      {/* Keyframes for loader animation */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
