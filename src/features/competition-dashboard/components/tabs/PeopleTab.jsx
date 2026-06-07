import React, { useState, useRef } from 'react';
import {
  Crown, RotateCcw, ExternalLink, UserCheck, Users, CheckCircle, XCircle,
  Plus, User, Star, UserPlus, Link2, Check, Download, Loader, Send, Camera, Wrench, Clock, Heart, Instagram,
  ChevronUp, ChevronDown,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button, Badge, Avatar, Panel } from '../../../../components/ui';
import { AddVotesModal } from '../../../../components/modals';
import { colors, spacing, borderRadius, typography } from '../../../../styles/theme';
import { useResponsive } from '../../../../hooks/useResponsive';
import { generateAchievementCard, getAdvancementTitle } from '../../../achievement-cards/generateAchievementCard';
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
  votingRounds = [],
  nominees,
  contestants,
  host,
  coHosts = [],
  isSuperAdmin = false,
  onRefresh,
  onApproveNominee,
  onRejectNominee,
  onRestoreNominee,
  onOpenAddPersonModal,
  onShowHostAssignment,
  onRemoveHost,
  onShowAddCoHost,
  onRemoveCoHost,
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
  const [bulkPhotoProgress, setBulkPhotoProgress] = useState(null);
  const [nominators, setNominators] = useState([]);
  const [voters, setVoters] = useState([]);
  const [nominatorsLoaded, setNominatorsLoaded] = useState(false);
  const [votersLoaded, setVotersLoaded] = useState(false);
  const avatarFileRef = useRef(null);
  const avatarUploadTarget = useRef(null);
  const [reordering, setReordering] = useState(false);
  const [showAddVotes, setShowAddVotes] = useState(false);
  // 'all' | 'male' | 'female' — only meaningful when the competition splits
  // winners by gender. Filters every nominee / contestant section below.
  const [genderFilter, setGenderFilter] = useState('all');

  const splitByGender = !!competition?.winnersSplitByGender;
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

  const handleDownloadCard = async (person, type = 'contestant', options = {}) => {
    setGeneratingCardId(person.id);
    try {
      const blob = await generateAchievementCard({
        achievementType: type === 'contestant' ? 'contestant' : 'nominated',
        customTitle: options.customTitle,
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

      const fileSuffix = options.fileSuffix || type;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${person.name.replace(/\s+/g, '-').toLowerCase()}-${fileSuffix}-card.png`;
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

  // Compute every "TOP N CONTESTANT" tier this contestant has earned.
  // Mirrors ProfileView.jsx's tier logic but returns ALL surviving rounds,
  // not just the highest — so a Top-15 contestant gets Top-50, Top-25 and
  // Top-15 cards (one per round they made the cut for). Active contestants
  // earn credit for every completed round; eliminated contestants earn
  // credit for every round strictly before eliminated_in_round.
  const getAdvancementCardsForContestant = (person) => {
    if (!person) return [];
    let earnedRounds;
    if (person.status === 'eliminated' && person.eliminatedInRound) {
      earnedRounds = votingRounds.filter(
        (r) => (r.round_order || 0) < person.eliminatedInRound,
      );
    } else {
      const now = Date.now();
      earnedRounds = votingRounds.filter(
        (r) => r.end_date && new Date(r.end_date).getTime() <= now,
      );
    }
    return earnedRounds
      .filter((r) => Number.isFinite(r.contestants_advance) && r.contestants_advance > 0)
      // Largest cohort first (Top 50 before Top 25) — matches how the
      // contestant progressed through the funnel.
      .sort((a, b) => (b.contestants_advance || 0) - (a.contestants_advance || 0))
      .map((r) => ({
        title: `TOP ${r.contestants_advance} CONTESTANT`,
        menuLabel: `${getAdvancementTitle(r.contestants_advance)} Contestant Card`,
        advanceCount: r.contestants_advance,
      }));
  };

  const triggerBlobDownload = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const photoFilename = (person, blob) => {
    const safeName = person.name.replace(/\s+/g, '-').toLowerCase();
    const mime = blob.type || '';
    let ext = mime.split('/')[1]?.split('+')[0];
    if (!ext) {
      const fromUrl = person.avatarUrl?.split('?')[0]?.split('.').pop()?.toLowerCase();
      ext = fromUrl && fromUrl.length <= 5 ? fromUrl : 'jpg';
    }
    if (ext === 'jpeg') ext = 'jpg';
    return `${safeName}-photo.${ext}`;
  };

  const handleDownloadPhoto = async (person) => {
    if (!person.avatarUrl) {
      alert('No profile photo on file for this contestant.');
      return;
    }
    setGeneratingCardId(person.id);
    try {
      const response = await fetch(person.avatarUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      triggerBlobDownload(blob, photoFilename(person, blob));
    } catch (err) {
      console.error('Photo download failed:', err);
      alert('Failed to download photo. Please try again.');
    } finally {
      setGeneratingCardId(null);
    }
  };

  const handleDownloadAllPhotos = async () => {
    const withPhotos = contestants.filter(c => c.avatarUrl);
    if (!withPhotos.length) {
      alert('No contestants have a profile photo yet.');
      return;
    }
    const skipped = contestants.length - withPhotos.length;
    const msg = skipped
      ? `Download ${withPhotos.length} of ${contestants.length} contestant photos? (${skipped} without photos will be skipped)\n\nYour browser may ask permission to download multiple files.`
      : `Download photos for all ${withPhotos.length} contestants?\n\nYour browser may ask permission to download multiple files.`;
    if (!confirm(msg)) return;
    let failed = 0;
    for (let i = 0; i < withPhotos.length; i++) {
      const c = withPhotos[i];
      setBulkPhotoProgress({ current: i + 1, total: withPhotos.length });
      try {
        const response = await fetch(c.avatarUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const blob = await response.blob();
        triggerBlobDownload(blob, photoFilename(c, blob));
        await new Promise(r => setTimeout(r, 250));
      } catch (err) {
        console.error(`Failed to download photo for ${c.name}:`, err);
        failed++;
      }
    }
    setBulkPhotoProgress(null);
    if (failed) alert(`Done. ${withPhotos.length - failed} downloaded, ${failed} failed.`);
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
  const incompleteNomineesAll = nominees.filter(n =>
    (n.status === 'pending' || n.status === 'awaiting_profile' || n.status === 'profile_complete') &&
    n.nominatedBy === 'self' && !n.claimedAt
  );
  const nomineesWithProfileAll = activeNominees.filter(n => n.hasProfile);
  const externalNomineesAll = activeNominees.filter(n => !n.hasProfile);
  const declinedNomineesAll = nominees.filter(n => n.status === 'declined' || n.status === 'rejected' || n.status === 'archived');

  // Per-gender breakdown helper. Used for both the stat-row sub-counts and
  // the host's male/female filter chips. Only meaningful when split is on.
  const byGender = (list) => ({
    male: list.filter((p) => p.gender === 'male').length,
    female: list.filter((p) => p.gender === 'female').length,
    unset: list.filter((p) => p.gender !== 'male' && p.gender !== 'female').length,
  });
  const applyGenderFilter = (list) => {
    if (!splitByGender || genderFilter === 'all') return list;
    return list.filter((p) => p.gender === genderFilter);
  };

  // Filtered views used in the section panels + their counts.
  const nomineesWithProfile = applyGenderFilter(nomineesWithProfileAll);
  const externalNominees = applyGenderFilter(externalNomineesAll);
  const incompleteNominees = applyGenderFilter(incompleteNomineesAll);
  const declinedNominees = applyGenderFilter(declinedNomineesAll);
  const contestantsFiltered = applyGenderFilter(contestants || []);

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
    // "Accepted" requires an explicit claim — a matched profile alone is
    // not consent. Host-added (nominated_by='admin') nominees often match
    // an existing platform user by email, which used to flip this badge
    // to "Accepted" before they ever clicked the invite link.
    if (nominee.claimedAt) {
      return (
        <span style={{
          fontSize: typography.fontSize.xs,
          padding: `2px ${spacing.sm}`,
          borderRadius: borderRadius.sm,
          background: 'rgba(var(--color-success-rgb),0.15)',
          color: 'var(--color-success)',
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
              background: isCopied ? 'rgba(var(--color-success-rgb),0.1)' : 'rgba(59,130,246,0.1)',
              border: 'none',
              borderRadius: borderRadius.sm,
              cursor: 'pointer',
              color: isCopied ? 'var(--color-success)' : '#3b82f6',
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
              background: resentId === nominee.id ? 'rgba(var(--color-success-rgb),0.1)' : 'rgba(168,85,247,0.1)',
              border: 'none',
              borderRadius: borderRadius.sm,
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              color: resentId === nominee.id ? 'var(--color-success)' : '#a855f7',
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
            background: approveDisabled ? 'rgba(107,114,128,0.1)' : 'rgba(var(--color-success-rgb),0.1)',
            border: 'none',
            borderRadius: borderRadius.sm,
            cursor: approveDisabled ? 'not-allowed' : 'pointer',
            color: approveDisabled ? '#6b7280' : 'var(--color-success)',
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
            background: 'rgba(var(--color-error-rgb),0.1)',
            border: 'none',
            borderRadius: borderRadius.sm,
            cursor: 'pointer',
            color: 'var(--color-error)',
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
    const advancementCards = isContestant ? getAdvancementCardsForContestant(person) : [];

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
              {advancementCards.map((advancement) => (
                <button
                  key={advancement.advanceCount}
                  onClick={() => {
                    setMenuOpen(false);
                    handleDownloadCard(person, 'contestant', {
                      customTitle: advancement.title,
                      fileSuffix: `top-${advancement.advanceCount}`,
                    });
                  }}
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
                  {advancement.menuLabel}
                </button>
              ))}
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
              <button
                onClick={() => { setMenuOpen(false); handleDownloadPhoto(person); }}
                disabled={!person.avatarUrl}
                title={person.avatarUrl ? 'Download original profile photo' : 'No profile photo on file'}
                style={{
                  padding: `${spacing.xs} ${spacing.sm}`,
                  background: 'none',
                  border: 'none',
                  color: person.avatarUrl ? colors.text.primary : colors.text.muted,
                  cursor: person.avatarUrl ? 'pointer' : 'not-allowed',
                  borderRadius: borderRadius.sm,
                  textAlign: 'left',
                  fontSize: typography.fontSize.sm,
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={e => { if (person.avatarUrl) e.target.style.background = 'rgba(255,255,255,0.05)'; }}
                onMouseLeave={e => e.target.style.background = 'none'}
              >
                Profile Photo
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
          {splitByGender && (person.gender === 'male' || person.gender === 'female') && (
            <span style={{
              fontSize: typography.fontSize.xs,
              fontWeight: typography.fontWeight.semibold,
              padding: `1px ${spacing.xs}`,
              borderRadius: borderRadius.sm,
              background: 'rgba(212,175,55,0.12)',
              color: colors.gold.primary,
              letterSpacing: '0.04em',
            }}>
              {person.gender === 'male' ? 'M' : 'F'}
            </span>
          )}
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
        accept="image/jpeg,image/png,image/webp"
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
        title={`Hosts${host ? ` (${1 + coHosts.length})` : coHosts.length ? ` (${coHosts.length})` : ''}`}
        icon={User}
        style={{ marginBottom: 0 }}
        action={
          isSuperAdmin ? (
            host ? (
              <Button size="sm" icon={UserPlus} onClick={(e) => { e.stopPropagation(); onShowAddCoHost?.(); }}>
                Add Co-Host
              </Button>
            ) : (
              <Button size="sm" icon={UserPlus} onClick={(e) => { e.stopPropagation(); onShowHostAssignment(); }}>
                Assign Host
              </Button>
            )
          ) : null
        }
      >
        <div style={{ padding: isMobile ? spacing.md : spacing.lg }}>
          {!host && coHosts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: spacing.xl, color: colors.text.secondary }}>
              <User size={40} style={{ marginBottom: spacing.md, opacity: 0.5 }} />
              <p style={{ marginBottom: spacing.md, fontSize: typography.fontSize.sm }}>No hosts assigned yet</p>
              {isSuperAdmin && (
                <Button icon={UserPlus} onClick={onShowHostAssignment}>Assign Host</Button>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
              {host && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing.md,
                    padding: spacing.md,
                    background: 'rgba(255,255,255,0.03)',
                    border: `1px solid ${colors.border.light}`,
                    borderRadius: borderRadius.md,
                  }}
                >
                    <Avatar name={host.name} src={host.avatar} size={44} />
                    <button
                      onClick={() => handleViewProfile(host.id)}
                      disabled={!host.id}
                      title={host.id ? 'View host profile' : undefined}
                      style={{
                        flex: 1,
                        minWidth: 0,
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        textAlign: 'left',
                        cursor: host.id ? 'pointer' : 'default',
                        color: 'inherit',
                      }}
                    >
                      <p style={{
                        fontWeight: typography.fontWeight.medium,
                        display: 'flex',
                        alignItems: 'center',
                        gap: spacing.xs,
                        color: '#fff',
                      }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {host.name}
                        </span>
                        {host.id && <ExternalLink size={12} style={{ opacity: 0.5, flexShrink: 0 }} />}
                      </p>
                      <p style={{
                        color: colors.text.secondary,
                        fontSize: typography.fontSize.sm,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {host.city || ''}
                      </p>
                    </button>
                    <Badge variant="gold" size="sm">
                      <Star size={12} style={{ marginRight: spacing.xs }} /> Host
                    </Badge>
                    {isSuperAdmin && (
                      <>
                        <Button size="sm" variant="secondary" onClick={onShowHostAssignment}>
                          Reassign
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          style={{ color: 'var(--color-error)', borderColor: 'rgba(var(--color-error-rgb),0.5)' }}
                          onClick={onRemoveHost}
                        >
                          Remove
                        </Button>
                      </>
                    )}
                </div>
              )}

              {coHosts.map((coHost) => (
                <div
                  key={coHost.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing.md,
                    padding: spacing.md,
                    background: 'rgba(255,255,255,0.03)',
                    border: `1px solid ${colors.border.light}`,
                    borderRadius: borderRadius.md,
                  }}
                >
                  <Avatar name={coHost.name} src={coHost.avatar} size={44} />
                  <button
                    onClick={() => handleViewProfile(coHost.id)}
                    disabled={!coHost.id}
                    title={coHost.id ? 'View co-host profile' : undefined}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      textAlign: 'left',
                      cursor: coHost.id ? 'pointer' : 'default',
                      color: 'inherit',
                    }}
                  >
                    <p style={{
                      fontWeight: typography.fontWeight.medium,
                      display: 'flex',
                      alignItems: 'center',
                      gap: spacing.xs,
                      color: '#fff',
                    }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {coHost.name}
                      </span>
                      {coHost.id && <ExternalLink size={12} style={{ opacity: 0.5, flexShrink: 0 }} />}
                    </p>
                    <p style={{
                      color: colors.text.secondary,
                      fontSize: typography.fontSize.sm,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {coHost.email}
                    </p>
                  </button>
                  <Badge variant="gold" size="sm">
                    <Star size={12} style={{ marginRight: spacing.xs }} /> Co-Host
                  </Badge>
                  {isSuperAdmin && (
                    <Button
                      size="sm"
                      variant="secondary"
                      style={{ color: 'var(--color-error)', borderColor: 'rgba(var(--color-error-rgb),0.5)' }}
                      onClick={() => onRemoveCoHost?.(coHost.id)}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </Panel>

      {/* Winners Manager */}
      <WinnersManager competition={competition} onUpdate={onRefresh} allowEdit={true} />
      </div>

      {/* Gender filter chips — only shown when the competition splits
       *  winners by gender. Filters every section below + the contestants
       *  panel. Counts above stay against the full population. */}
      {!isNewHost && splitByGender && (
        <div style={{
          display: 'flex',
          gap: spacing.xs,
          flexWrap: 'wrap',
          padding: spacing.xs,
          background: colors.background.card,
          border: `1px solid ${colors.border.light}`,
          borderRadius: borderRadius.lg,
        }}>
          {[
            { value: 'all', label: 'All' },
            { value: 'male', label: 'Men' },
            { value: 'female', label: 'Women' },
          ].map((opt) => {
            const active = genderFilter === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setGenderFilter(opt.value)}
                style={{
                  flex: isMobile ? 1 : 'initial',
                  padding: `${spacing.xs} ${spacing.md}`,
                  background: active ? 'rgba(212,175,55,0.15)' : 'transparent',
                  border: `1px solid ${active ? colors.gold.primary : 'transparent'}`,
                  borderRadius: borderRadius.md,
                  color: active ? colors.gold.primary : colors.text.secondary,
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.medium,
                  cursor: 'pointer',
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Stats Row - hide when all zeros */}
      {!isNewHost && <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)',
        gap: spacing.sm,
      }}>
        {[
          { label: 'Nominees', list: nominees, color: colors.gold.primary },
          { label: 'Ready to Approve', list: nomineesWithProfileAll, color: '#3b82f6' },
          { label: 'Awaiting Response', list: externalNomineesAll, color: '#f59e0b' },
          { label: 'Contestants', list: contestants || [], color: 'var(--color-success)' },
          { label: 'Declined', list: declinedNomineesAll, color: 'var(--color-error)' },
        ].map((stat, i, arr) => {
          const breakdown = splitByGender ? byGender(stat.list) : null;
          return (
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
                {stat.list.length}
              </p>
              {breakdown && (
                <p style={{
                  marginTop: spacing.xs,
                  fontSize: typography.fontSize.xs,
                  color: colors.text.muted,
                }}>
                  {breakdown.male}M · {breakdown.female}F
                  {breakdown.unset > 0 ? ` · ${breakdown.unset}?` : ''}
                </p>
              )}
            </div>
          );
        })}
      </div>}

      {/* Contestants Section */}
      <Panel
        title={`Contestants (${contestantsFiltered.length})`}
        icon={Crown}
        style={{ marginBottom: 0 }}
        collapsible
        defaultCollapsed
        action={
          <div style={{ display: 'flex', gap: spacing.xs, alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
            {contestants.some(c => c.avatarUrl) && (
              <Button
                size="sm"
                variant="secondary"
                icon={bulkPhotoProgress ? Loader : Download}
                disabled={!!bulkPhotoProgress}
                onClick={handleDownloadAllPhotos}
                title="Download all contestant profile photos"
              >
                {bulkPhotoProgress ? `${bulkPhotoProgress.current}/${bulkPhotoProgress.total}` : 'Photos'}
              </Button>
            )}
            {competition?.allowManualVotes && contestants.length > 0 && (
              <Button
                size="sm"
                variant="secondary"
                icon={Star}
                onClick={() => setShowAddVotes(true)}
                title="Manually add votes for a contestant"
              >
                Add Votes
              </Button>
            )}
          </div>
        }
      >
        <div style={{ padding: isMobile ? spacing.md : spacing.xl }}>
          {contestantsFiltered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: spacing.xl, color: colors.text.secondary }}>
              <Crown size={40} style={{ marginBottom: spacing.md, opacity: 0.4, color: colors.gold.primary }} />
              <p style={{ marginBottom: spacing.md, fontSize: typography.fontSize.sm }}>No contestants yet</p>
              <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted }}>
                Approve nominees to build your lineup.
              </p>
            </div>
          ) : (() => {
            const sortedContestants = showReorder
              ? [...contestantsFiltered].sort((a, b) => (a.rank || 999) - (b.rank || 999))
              : contestantsFiltered;
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
                          background: 'rgba(var(--color-error-rgb),0.1)',
                          border: 'none',
                          borderRadius: borderRadius.sm,
                          cursor: 'pointer',
                          color: 'var(--color-error)',
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
        action={
          <Button size="sm" icon={Plus} onClick={() => onOpenAddPersonModal('nominee')}>
            Add
          </Button>
        }
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
                            background: copiedId === n.id ? 'rgba(var(--color-success-rgb),0.1)' : 'rgba(59,130,246,0.1)',
                            border: 'none',
                            borderRadius: borderRadius.sm,
                            cursor: 'pointer',
                            color: copiedId === n.id ? 'var(--color-success)' : '#3b82f6',
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
                            background: resentId === n.id ? 'rgba(var(--color-success-rgb),0.1)' : 'rgba(168,85,247,0.1)',
                            border: 'none',
                            borderRadius: borderRadius.sm,
                            cursor: processingIds.has(n.id) ? 'not-allowed' : 'pointer',
                            color: resentId === n.id ? 'var(--color-success)' : '#a855f7',
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
                          background: 'rgba(var(--color-error-rgb),0.1)',
                          border: 'none',
                          borderRadius: borderRadius.sm,
                          cursor: 'pointer',
                          color: 'var(--color-error)',
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
                          background: 'rgba(var(--color-success-rgb),0.1)',
                          border: 'none',
                          borderRadius: borderRadius.sm,
                          cursor: processingIds.has(n.id) ? 'not-allowed' : 'pointer',
                          color: 'var(--color-success)',
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

      <AddVotesModal
        isOpen={showAddVotes}
        onClose={() => setShowAddVotes(false)}
        competition={competition}
        contestants={contestants}
        onSuccess={onRefresh}
      />

      {/* Keyframes for loader animation */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
