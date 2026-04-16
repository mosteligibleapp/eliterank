import React, { useState, useRef } from 'react';
import {
  Crown, RotateCcw, ExternalLink, UserCheck, Users, CheckCircle, XCircle,
  Plus, User, Star, FileText, MapPin, UserPlus, Link2, Check, Download, Loader, Send, Camera, Wrench, Clock, Heart, Instagram,
  ChevronUp, ChevronDown,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button, Badge, Avatar, Panel } from '../../../../components/ui';
import { colors, spacing, borderRadius, typography } from '../../../../styles/theme';
import { useResponsive } from '../../../../hooks/useResponsive';
import { generateAchievementCard } from '../../../achievement-cards/generateAchievementCard';
import { uploadPhoto } from '../../../entry/utils/uploadPhoto';
import { supabase } from '../../../../lib/supabase';
import WinnersManager from '../WinnersManager';

// Normalize an instagram handle that may be a bare username, "@name", or full URL
const parseInstagram = (raw) => {
  if (!raw) return null;
  const clean = String(raw)
    .trim()
    .replace(/^@/, '')
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
    .replace(/\/+$/, '')
    .split(/[/?#]/)[0];
  if (!clean) return null;
  return { url: `https://instagram.com/${clean}`, handle: clean };
};

const InstagramLink = ({ instagram, iconOnly = false }) => {
  const ig = parseInstagram(instagram);
  if (!ig) return null;
  return (
    <a
      href={ig.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      title={`@${ig.handle} on Instagram`}
      aria-label={`Open @${ig.handle} on Instagram`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '4px',
        color: colors.gold.primary,
        textDecoration: 'none',
        fontSize: typography.fontSize.xs,
        fontWeight: typography.fontWeight.medium,
        borderRadius: borderRadius.sm,
        lineHeight: 1,
      }}
    >
      <Instagram size={14} />
      {!iconOnly && <span>@{ig.handle}</span>}
    </a>
  );
};

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
  onRemoveContestant,
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
  const [nominators, setNominators] = useState([]);
  const [voters, setVoters] = useState([]);
  const [nominatorsLoaded, setNominatorsLoaded] = useState(false);
  const [votersLoaded, setVotersLoaded] = useState(false);
  const avatarFileRef = useRef(null);
  const avatarUploadTarget = useRef(null);
  const [reordering, setReordering] = useState(false);

  const isLegacy = competition?.is_legacy;
  const isCompleted = competition?.status === 'completed';
  const showReorder = isLegacy || isCompleted;

  const handleMoveContestant = async (contestantId, direction) => {
    if (!supabase || !competition?.id) return;
    setReordering(true);

    // Sort contestants by current rank
    const sorted = [...contestants].sort((a, b) => (a.rank || 999) - (b.rank || 999));
    const currentIndex = sorted.findIndex(c => c.id === contestantId);
    const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    if (swapIndex < 0 || swapIndex >= sorted.length) {
      setReordering(false);
      return;
    }

    const current = sorted[currentIndex];
    const swap = sorted[swapIndex];

    // Swap ranks in DB
    try {
      await Promise.all([
        supabase.from('contestants').update({ rank: swap.rank || (swapIndex + 1) }).eq('id', current.id),
        supabase.from('contestants').update({ rank: current.rank || (currentIndex + 1) }).eq('id', swap.id),
      ]);
      if (onRefresh) await onRefresh();
    } catch (err) {
      console.error('Error reordering contestants:', err);
    } finally {
      setReordering(false);
    }
  };

  const handleAvatarClick = (person, type = 'nominee') => {
    avatarUploadTarget.current = { ...person, _table: type };
    avatarFileRef.current?.click();
  };

  const handleAvatarFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !avatarUploadTarget.current) return;
    const target = avatarUploadTarget.current;
    const table = target._table === 'contestant' ? 'contestants' : 'nominees';
    e.target.value = '';

    setUploadingAvatarId(target.id);
    try {
      const url = await uploadPhoto(file, 'host-uploads');
      await supabase
        .from(table)
        .update({ avatar_url: url })
        .eq('id', target.id);
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

  const handleBulkResendInvites = async (nomineeList, label) => {
    const withEmail = nomineeList.filter(n => n.email);
    if (!withEmail.length || !onResendInvite) return;
    const skipped = nomineeList.length - withEmail.length;
    const msg = skipped
      ? `Send invite/reminder to ${withEmail.length} of ${nomineeList.length} ${label} nominees? (${skipped} without email will be skipped)`
      : `Send invite/reminder to all ${withEmail.length} ${label} nominees?`;
    if (!confirm(msg)) return;
    addProcessing('bulk-send');
    let sent = 0;
    let failed = 0;
    for (const n of withEmail) {
      try {
        const result = await onResendInvite(n.id);
        if (result?.success) sent++;
        else failed++;
      } catch {
        failed++;
      }
    }
    removeProcessing('bulk-send');
    alert(`Done! Sent: ${sent}${failed ? `, Failed: ${failed}` : ''}`);
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
    if (nominee.hasProfile || (nominee.claimedAt && nominee.userId)) {
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

  // Extract bare email from "Name <email>" format
  const parseEmail = (email) => {
    if (!email) return email;
    const match = email.match(/<([^>]+)>/);
    return match ? match[1] : email;
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
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' }}>
          <span style={{ fontSize: typography.fontSize.xs, color: colors.text.muted }}>
            {parseEmail(person.email)}{showVotes && person.votes > 0 ? `${person.email ? ' · ' : ''}${person.votes} votes` : ''}
            {person.inviteSentAt && (
              <span style={{ color: colors.text.muted, opacity: 0.7 }}>
                {' · '}Invited {new Date(person.inviteSentAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            )}
          </span>
          {person.instagram && <InstagramLink instagram={person.instagram} />}
        </div>
      </div>
      {cardType && <CardDownloadButton person={person} type={cardType} />}
      {actions}
    </div>
  );

  const totalPeople = activeNominees.length + contestants.length;
  const isNewHost = totalPeople === 0;

  const loadNominators = async () => {
    if (nominatorsLoaded || !competition?.id) return;
    const { data } = await supabase
      .from('nominees')
      .select('nominator_name, nominator_email, nominated_by, nomination_reason, created_at')
      .eq('competition_id', competition.id)
      .eq('nominated_by', 'third_party')
      .not('nominator_email', 'is', null)
      .order('created_at', { ascending: false });
    setNominators(data || []);
    setNominatorsLoaded(true);
  };

  const loadVoters = async () => {
    if (votersLoaded || !competition?.id) return;
    const { data } = await supabase
      .from('votes')
      .select('voter_email, vote_count, amount_paid, created_at')
      .eq('competition_id', competition.id)
      .order('created_at', { ascending: false });
    // Aggregate by email
    const byEmail = {};
    (data || []).forEach(v => {
      const email = v.voter_email || 'Anonymous';
      if (!byEmail[email]) byEmail[email] = { email, totalVotes: 0, totalPaid: 0, count: 0 };
      byEmail[email].totalVotes += v.vote_count || 1;
      byEmail[email].totalPaid += parseFloat(v.amount_paid) || 0;
      byEmail[email].count++;
    });
    setVoters(Object.values(byEmail).sort((a, b) => b.totalVotes - a.totalVotes));
    setVotersLoaded(true);
  };

  const downloadCSV = (rows, filename) => {
    if (!rows.length) return;
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(','), ...rows.map(r => headers.map(h => `"${(r[h] ?? '').toString().replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

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

      {/* Host Profile + Winners Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
        gap: spacing.xl,
        alignItems: 'start',
      }}>
      <Panel
        title="Host Profile"
        icon={User}
        style={{ marginBottom: 0 }}
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
                    {host.gallery.filter(Boolean).map((img, i) => (
                      <img
                        key={i}
                        src={typeof img === 'string' ? img : img?.url}
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
      </div>

      {/* Stats Row - hide when all zeros */}
      {!isNewHost && <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)',
        gap: spacing.sm,
      }}>
        {[
          { label: 'Nominees', value: activeNominees.length, color: colors.gold.primary },
          { label: 'Ready', value: nomineesWithProfile.length, color: '#3b82f6' },
          { label: 'Awaiting', value: externalNominees.length, color: '#f59e0b' },
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
        collapsible
        defaultCollapsed
        action={
          <Button size="sm" icon={Plus} onClick={() => onOpenAddPersonModal('contestant')}>
            Add
          </Button>
        }
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
          ) : (() => {
            const sortedContestants = showReorder
              ? [...contestants].sort((a, b) => (a.rank || 999) - (b.rank || 999))
              : contestants;
            return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
              {sortedContestants.map((c, idx) => (
                <PersonRow
                  key={c.id}
                  person={c}
                  showVotes
                  cardType="contestant"
                  onAvatarUpload={(person) => handleAvatarClick(person, 'contestant')}
                  onNameClick={c.userId ? () => handleViewProfile(c.userId) : undefined}
                  actions={
                    <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs }}>
                      {showReorder && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <button
                            onClick={() => handleMoveContestant(c.id, 'up')}
                            disabled={idx === 0 || reordering}
                            title="Move up"
                            style={{
                              padding: '2px',
                              background: 'transparent',
                              border: 'none',
                              cursor: idx === 0 || reordering ? 'default' : 'pointer',
                              color: idx === 0 ? colors.border.primary : colors.text.secondary,
                              opacity: idx === 0 ? 0.3 : 1,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <ChevronUp size={14} />
                          </button>
                          <button
                            onClick={() => handleMoveContestant(c.id, 'down')}
                            disabled={idx === sortedContestants.length - 1 || reordering}
                            title="Move down"
                            style={{
                              padding: '2px',
                              background: 'transparent',
                              border: 'none',
                              cursor: idx === sortedContestants.length - 1 || reordering ? 'default' : 'pointer',
                              color: idx === sortedContestants.length - 1 ? colors.border.primary : colors.text.secondary,
                              opacity: idx === sortedContestants.length - 1 ? 0.3 : 1,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <ChevronDown size={14} />
                          </button>
                        </div>
                      )}
                      <button
                        onClick={async () => {
                          if (!window.confirm(`Remove ${c.name} from contestants? They will be moved to Declined.`)) return;
                          addProcessing(c.id);
                          try { await onRemoveContestant(c.id); } finally { removeProcessing(c.id); }
                        }}
                        disabled={processingIds.has(c.id)}
                        title="Remove contestant"
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
            );
          })()}
        </div>
      </Panel>

      {/* Ready to Approve */}
      <Panel
        title={`Ready to Approve (${nomineesWithProfile.length})`}
        icon={UserCheck}
        style={{ marginBottom: 0 }}
        collapsible
        defaultCollapsed
        action={
          <Button size="sm" icon={Plus} onClick={() => onOpenAddPersonModal('nominee')}>
            Add
          </Button>
        }
      >
        <div style={{ padding: isMobile ? spacing.md : spacing.xl }}>
          {nomineesWithProfile.length === 0 ? (
            <div style={{ textAlign: 'center', padding: spacing.xl, color: colors.text.secondary }}>
              <UserCheck size={40} style={{ marginBottom: spacing.md, opacity: 0.4 }} />
              <p style={{ fontSize: typography.fontSize.sm }}>No nominees ready to approve yet</p>
              <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, marginTop: spacing.xs }}>
                Nominees who accept and complete their profile will appear here for your review.
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
        title={`Awaiting Response (${externalNominees.length})`}
        icon={Users}
        style={{ marginBottom: 0 }}
        collapsible
        defaultCollapsed
      >
        <div style={{ padding: isMobile ? spacing.md : spacing.xl }}>
          {externalNominees.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: spacing.sm, marginBottom: spacing.md }}>
              {onResendInvite && (
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={processingIds.has('bulk-send')}
                  onClick={() => handleBulkResendInvites(externalNominees, 'awaiting')}
                >
                  <Send size={14} style={{ marginRight: spacing.xs }} />
                  {processingIds.has('bulk-send') ? 'Sending...' : 'Send All Invites'}
                </Button>
              )}
              {onRepairAllNomineeAccounts && <Button
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
              </Button>}
            </div>
          )}
          {externalNominees.length === 0 ? (
            <div style={{ textAlign: 'center', padding: spacing.xl, color: colors.text.secondary }}>
              <Users size={40} style={{ marginBottom: spacing.md, opacity: 0.4 }} />
              <p style={{ fontSize: typography.fontSize.sm }}>No one awaiting response</p>
              <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, marginTop: spacing.xs }}>
                Nominees who haven't accepted their invitation yet will appear here.
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
          defaultCollapsed
        >
          <div style={{ padding: isMobile ? spacing.md : spacing.xl }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
              <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm, margin: 0 }}>
                These people started entering but haven't finished their profile.
              </p>
              {onResendInvite && incompleteNominees.length > 0 && (
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={processingIds.has('bulk-send')}
                  onClick={() => handleBulkResendInvites(incompleteNominees, 'incomplete')}
                >
                  <Send size={14} style={{ marginRight: spacing.xs }} />
                  {processingIds.has('bulk-send') ? 'Sending...' : 'Send All Reminders'}
                </Button>
              )}
            </div>
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

      {/* Nominators */}
      <Panel
        title={`Nominators${nominatorsLoaded ? ` (${nominators.length})` : ''}`}
        icon={Heart}
        style={{ marginBottom: 0 }}
        collapsible
        defaultCollapsed
        action={nominators.length > 0 && (
          <Button size="sm" icon={Download} variant="secondary" onClick={(e) => {
            e.stopPropagation();
            downloadCSV(nominators.map(n => ({
              name: n.nominator_name || '',
              email: n.nominator_email || '',
              reason: n.nomination_reason || '',
              date: n.created_at ? new Date(n.created_at).toLocaleDateString() : '',
            })), 'nominators.csv');
          }}>
            Export
          </Button>
        )}
      >
        <div style={{ padding: isMobile ? spacing.md : spacing.xl }}>
          {!nominatorsLoaded ? (
            <div style={{ textAlign: 'center', padding: spacing.lg }}>
              <Button size="sm" variant="secondary" onClick={loadNominators}>Load Nominators</Button>
            </div>
          ) : nominators.length === 0 ? (
            <p style={{ textAlign: 'center', color: colors.text.muted, fontSize: typography.fontSize.sm, padding: spacing.lg }}>
              No third-party nominations yet
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
              {nominators.map((n, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: spacing.md,
                  padding: spacing.md, background: colors.background.secondary, borderRadius: borderRadius.lg,
                }}>
                  <Avatar name={n.nominator_name || n.nominator_email} size={36} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: typography.fontWeight.medium, fontSize: typography.fontSize.sm }}>
                      {n.nominator_name || 'Anonymous'}
                    </p>
                    <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {n.nominator_email}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Panel>

      {/* Voters */}
      <Panel
        title={`Voters${votersLoaded ? ` (${voters.length})` : ''}`}
        icon={Star}
        style={{ marginBottom: 0 }}
        collapsible
        defaultCollapsed
        action={voters.length > 0 && (
          <Button size="sm" icon={Download} variant="secondary" onClick={(e) => {
            e.stopPropagation();
            downloadCSV(voters.map(v => ({
              email: v.email,
              total_votes: v.totalVotes,
              total_paid: v.totalPaid > 0 ? `$${v.totalPaid.toFixed(2)}` : '$0',
              transactions: v.count,
            })), 'voters.csv');
          }}>
            Export
          </Button>
        )}
      >
        <div style={{ padding: isMobile ? spacing.md : spacing.xl }}>
          {!votersLoaded ? (
            <div style={{ textAlign: 'center', padding: spacing.lg }}>
              <Button size="sm" variant="secondary" onClick={loadVoters}>Load Voters</Button>
            </div>
          ) : voters.length === 0 ? (
            <p style={{ textAlign: 'center', color: colors.text.muted, fontSize: typography.fontSize.sm, padding: spacing.lg }}>
              No votes yet
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
              {voters.map((v, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: spacing.md,
                  padding: spacing.md, background: colors.background.secondary, borderRadius: borderRadius.lg,
                }}>
                  <Avatar name={v.email} size={36} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: typography.fontWeight.medium, fontSize: typography.fontSize.sm, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {v.email}
                    </p>
                    <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted }}>
                      {v.totalVotes} {v.totalVotes === 1 ? 'vote' : 'votes'}
                      {v.totalPaid > 0 && ` · $${v.totalPaid.toFixed(2)} spent`}
                    </p>
                  </div>
                  <span style={{
                    fontSize: typography.fontSize.xs,
                    fontWeight: typography.fontWeight.semibold,
                    color: colors.gold.primary,
                    padding: `${spacing.xs} ${spacing.sm}`,
                    background: 'rgba(212,175,55,0.1)',
                    borderRadius: borderRadius.sm,
                  }}>
                    {v.totalVotes}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </Panel>

      {/* Keyframes for loader animation */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
