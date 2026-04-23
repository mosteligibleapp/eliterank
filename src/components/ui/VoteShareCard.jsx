import React, { useState, useEffect, useCallback } from 'react';
import { Download, Share2, Loader, Check } from 'lucide-react';
import { generateVoteCard } from '../../features/achievement-cards/generateVoteCard';
import { colors, spacing, borderRadius, typography } from '../../styles/theme';

/**
 * VoteShareCard — Shows a shareable "I Voted" card after voting.
 *
 * Generates an ephemeral card client-side with the contestant's photo
 * and a simple "I voted for X and you should too!" message.
 *
 * @param {Object} props
 * @param {Object} props.contestant - { name, avatar_url }
 * @param {Object} props.competition - { name }
 * @param {number} [props.voteCount] - Number of votes (optional display)
 * @param {string} [props.organizationLogoUrl] - Logo for the card
 * @param {function} [props.onShare] - Callback when share is attempted
 */
export default function VoteShareCard({
  contestant,
  competition,
  voteCount,
  organizationLogoUrl,
  onShare,
}) {
  const [cardUrl, setCardUrl] = useState(null);
  const [cardBlob, setCardBlob] = useState(null);
  const [generating, setGenerating] = useState(true);
  const [shareStatus, setShareStatus] = useState('idle'); // 'idle' | 'shared' | 'copied'

  const contestantName = contestant?.name || 'Contestant';
  const photoUrl = contestant?.avatar_url || contestant?.avatarUrl;
  const competitionName = competition?.name || 'Most Eligible';

  // Generate the card on mount
  useEffect(() => {
    let cancelled = false;
    let objectUrl = null;

    setGenerating(true);

    generateVoteCard({
      contestantName,
      photoUrl,
      competitionName,
      voteCount,
      organizationLogoUrl,
    })
      .then((blob) => {
        if (cancelled) return;
        setCardBlob(blob);
        objectUrl = URL.createObjectURL(blob);
        setCardUrl(objectUrl);
        setGenerating(false);
      })
      .catch((err) => {
        console.error('Vote card generation failed:', err);
        setGenerating(false);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [contestantName, photoUrl, competitionName, voteCount, organizationLogoUrl]);

  // Download the card
  const handleDownload = useCallback(() => {
    if (!cardUrl) return;
    const a = document.createElement('a');
    a.href = cardUrl;
    a.download = `i-voted-for-${contestantName.toLowerCase().replace(/\s+/g, '-')}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [cardUrl, contestantName]);

  // Share the card (native share or fallback)
  const handleShare = useCallback(async () => {
    if (!cardBlob) return;

    onShare?.();

    try {
      const file = new File([cardBlob], 'i-voted.png', { type: 'image/png' });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `I voted for ${contestantName}!`,
          text: `I voted for ${contestantName} in ${competitionName} and you should too! 🗳️`,
        });
        setShareStatus('shared');
        setTimeout(() => setShareStatus('idle'), 2000);
        return;
      }

      // Fallback: download
      handleDownload();
      setShareStatus('copied');
      setTimeout(() => setShareStatus('idle'), 2000);
    } catch (err) {
      if (err.name === 'AbortError') return; // User cancelled
      console.error('Share failed:', err);
      // Fallback to download
      handleDownload();
    }
  }, [cardBlob, contestantName, competitionName, handleDownload, onShare]);

  const canNativeShare = typeof navigator !== 'undefined' && navigator.share;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.md,
      background: 'rgba(212,175,55,0.05)',
      border: '1px solid rgba(212,175,55,0.2)',
      borderRadius: borderRadius.lg,
    }}>
      {/* Card preview */}
      <div style={{
        width: '100%',
        maxWidth: '200px',
        aspectRatio: '9/16',
        borderRadius: borderRadius.md,
        overflow: 'hidden',
        background: '#0a0a0a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {generating ? (
          <Loader size={24} style={{ color: colors.gold.primary, animation: 'spin 1s linear infinite' }} />
        ) : cardUrl ? (
          <img
            src={cardUrl}
            alt="Share card preview"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <span style={{ color: colors.text.muted, fontSize: typography.fontSize.sm }}>
            Card unavailable
          </span>
        )}
      </div>

      {/* Share prompt */}
      <p style={{
        fontSize: typography.fontSize.sm,
        color: colors.text.secondary,
        margin: 0,
        textAlign: 'center',
      }}>
        Share your vote to help {contestant?.name?.split(' ')[0] || 'them'} win!
      </p>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: spacing.sm, width: '100%' }}>
        <button
          onClick={handleDownload}
          disabled={generating || !cardUrl}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing.xs,
            padding: `${spacing.sm} ${spacing.md}`,
            background: 'rgba(255,255,255,0.06)',
            border: `1px solid ${colors.border.primary}`,
            borderRadius: borderRadius.md,
            color: colors.text.secondary,
            fontSize: typography.fontSize.sm,
            fontWeight: typography.fontWeight.medium,
            cursor: generating || !cardUrl ? 'not-allowed' : 'pointer',
            opacity: generating || !cardUrl ? 0.5 : 1,
          }}
        >
          <Download size={16} />
          Save
        </button>

        <button
          onClick={handleShare}
          disabled={generating || !cardBlob}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing.xs,
            padding: `${spacing.sm} ${spacing.md}`,
            background: shareStatus !== 'idle' ? colors.status.success : 'linear-gradient(135deg, #d4af37, #f4d03f)',
            border: 'none',
            borderRadius: borderRadius.md,
            color: shareStatus !== 'idle' ? 'white' : '#0a0a0f',
            fontSize: typography.fontSize.sm,
            fontWeight: typography.fontWeight.semibold,
            cursor: generating || !cardBlob ? 'not-allowed' : 'pointer',
            opacity: generating || !cardBlob ? 0.5 : 1,
            transition: 'all 0.2s ease',
          }}
        >
          {shareStatus === 'shared' || shareStatus === 'copied' ? (
            <>
              <Check size={16} />
              {shareStatus === 'shared' ? 'Shared!' : 'Saved!'}
            </>
          ) : (
            <>
              <Share2 size={16} />
              {canNativeShare ? 'Share' : 'Save & Share'}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
