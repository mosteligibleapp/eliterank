import React, { useState, useEffect, useCallback } from 'react';
import { Gift, Package, ExternalLink, Clock, Check, Link2, Plus, Loader, AlertCircle } from 'lucide-react';
import { Panel, Button } from '../../components/ui';
import ClaimRewardModal from '../../components/modals/ClaimRewardModal';
import { colors, spacing, borderRadius, typography } from '../../styles/theme';
import { useResponsive } from '../../hooks/useResponsive';
import { supabase } from '../../lib/supabase';
import { useSupabaseAuth } from '../../hooks';

const STATUS_CONFIG = {
  pending: { color: '#eab308', label: 'Pending Claim', description: 'Click to claim this reward' },
  claimed: { color: '#3b82f6', label: 'Claimed', description: 'Awaiting shipment' },
  shipped: { color: '#8b5cf6', label: 'Shipped', description: 'On its way to you' },
  active: { color: '#22c55e', label: 'Active', description: 'Start promoting!' },
  completed: { color: '#6b7280', label: 'Completed', description: 'Thank you for participating' },
  expired: { color: '#ef4444', label: 'Expired', description: 'Claim period ended' },
};

/**
 * RewardsPage - Displays user rewards dashboard
 * Shows a simplified profile banner and available rewards section
 */
export default function RewardsPage({ hostProfile }) {
  const { isMobile } = useResponsive();
  const { user } = useSupabaseAuth();
  const [claimableRewards, setClaimableRewards] = useState([]); // Individual assignments (can claim)
  const [visibleRewards, setVisibleRewards] = useState([]); // Competition assignments (visible only)
  const [loading, setLoading] = useState(true);
  const [claimingAssignment, setClaimingAssignment] = useState(null); // Assignment being claimed (opens modal)
  const [addingLinkId, setAddingLinkId] = useState(null);
  const [newLink, setNewLink] = useState('');

  // Fetch user's rewards (both claimable and visible-only)
  const fetchRewards = useCallback(async () => {
    if (!user?.id || !supabase) {
      setClaimableRewards([]);
      setVisibleRewards([]);
      setLoading(false);
      return;
    }

    try {
      // Fetch contestants and nominees for this user in parallel
      const [contestantsRes, nomineesRes] = await Promise.all([
        supabase
          .from('contestants')
          .select('id, competition_id')
          .eq('user_id', user.id),
        supabase
          .from('nominees')
          .select('id, competition_id')
          .eq('user_id', user.id),
      ]);

      if (contestantsRes.error) throw contestantsRes.error;
      if (nomineesRes.error) throw nomineesRes.error;

      const contestants = contestantsRes.data || [];
      const nominees = nomineesRes.data || [];

      const contestantIds = contestants.map(c => c.id);
      const nomineeIds = nominees.map(n => n.id);
      const competitionIds = [
        ...new Set([
          ...contestants.map(c => c.competition_id),
          ...nominees.map(n => n.competition_id),
        ]),
      ];

      if (contestantIds.length === 0 && nomineeIds.length === 0) {
        setClaimableRewards([]);
        setVisibleRewards([]);
        setLoading(false);
        return;
      }

      const rewardSelect = `
        *,
        reward:rewards(*),
        competition:competitions(
          id,
          name,
          season,
          city:cities(name)
        )
      `;

      // Fetch individual assignments for contestants and nominees in parallel
      const assignmentQueries = [];

      if (contestantIds.length > 0) {
        assignmentQueries.push(
          supabase
            .from('reward_assignments')
            .select(rewardSelect)
            .in('contestant_id', contestantIds)
            .order('created_at', { ascending: false })
        );
      }

      if (nomineeIds.length > 0) {
        assignmentQueries.push(
          supabase
            .from('reward_assignments')
            .select(rewardSelect)
            .in('nominee_id', nomineeIds)
            .order('created_at', { ascending: false })
        );
      }

      const assignmentResults = await Promise.all(assignmentQueries);

      // Merge all individual assignments, deduplicating by id
      const allAssignments = [];
      const seenIds = new Set();
      for (const res of assignmentResults) {
        if (res.error) throw res.error;
        for (const a of (res.data || [])) {
          if (!seenIds.has(a.id)) {
            seenIds.add(a.id);
            allAssignments.push(a);
          }
        }
      }
      setClaimableRewards(allAssignments);

      // Get competition-level assignments (visible rewards)
      let visibleOnly = [];
      if (competitionIds.length > 0) {
        const { data: compAssignments, error: compError } = await supabase
          .from('reward_competition_assignments')
          .select(rewardSelect)
          .in('competition_id', competitionIds)
          .order('created_at', { ascending: false });

        if (compError) throw compError;

        // Filter out rewards that user already has individual assignment for
        const claimableRewardIds = new Set(allAssignments.map(a => a.reward_id));
        visibleOnly = (compAssignments || []).filter(ca => !claimableRewardIds.has(ca.reward_id));
      }
      setVisibleRewards(visibleOnly);
    } catch (err) {
      console.error('Error fetching rewards:', err);
      setClaimableRewards([]);
      setVisibleRewards([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchRewards();
  }, [fetchRewards]);

  // Open claim modal for a reward assignment
  const handleStartClaim = (assignment) => {
    setClaimingAssignment(assignment);
  };

  // Add content link
  const handleAddLink = async (assignmentId) => {
    if (!newLink.trim() || !supabase) return;

    try {
      const assignment = claimableRewards.find(a => a.id === assignmentId);
      const currentLinks = assignment?.content_links || [];
      const updatedLinks = [...currentLinks, newLink.trim()];

      const { error } = await supabase
        .from('reward_assignments')
        .update({
          content_links: updatedLinks,
          content_posted: true,
        })
        .eq('id', assignmentId);

      if (error) throw error;
      await fetchRewards();
      setNewLink('');
      setAddingLinkId(null);
    } catch (err) {
      console.error('Error adding link:', err);
      alert('Failed to add link. Please try again.');
    }
  };

  if (!hostProfile) return null;

  // Separate claimable rewards by status
  const pendingRewards = claimableRewards.filter(a => a.status === 'pending');
  const activeRewards = claimableRewards.filter(a => ['claimed', 'shipped', 'active'].includes(a.status));
  const completedRewards = claimableRewards.filter(a => ['completed', 'expired'].includes(a.status));

  // Check if there are any rewards at all (claimable or visible)
  const hasAnyRewards = claimableRewards.length > 0 || visibleRewards.length > 0;

  return (
    <div>
      {/* Loading State */}
      {loading && (
        <Panel>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: spacing.xxxl,
          }}>
            <Loader size={32} style={{ animation: 'spin 1s linear infinite', color: colors.gold.primary, marginBottom: spacing.md }} />
            <p style={{ color: colors.text.secondary }}>Loading your rewards...</p>
          </div>
        </Panel>
      )}

      {/* Pending Rewards - Action Required */}
      {!loading && pendingRewards.length > 0 && (
        <div style={{ marginBottom: spacing.xxxl }}>
          <h3 style={{
            fontSize: typography.fontSize.lg,
            fontWeight: typography.fontWeight.semibold,
            color: '#eab308',
            marginBottom: spacing.lg,
            display: 'flex',
            alignItems: 'center',
            gap: spacing.sm,
          }}>
            <AlertCircle size={18} />
            Action Required ({pendingRewards.length})
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: spacing.xl }}>
            {pendingRewards.map(assignment => (
              <RewardCard
                key={assignment.id}
                assignment={assignment}
                isMobile={isMobile}
                onClaim={() => handleStartClaim(assignment)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Active Rewards */}
      {!loading && activeRewards.length > 0 && (
        <div style={{ marginBottom: spacing.xxxl }}>
          <h3 style={{
            fontSize: typography.fontSize.lg,
            fontWeight: typography.fontWeight.semibold,
            color: colors.text.primary,
            marginBottom: spacing.lg,
            display: 'flex',
            alignItems: 'center',
            gap: spacing.sm,
          }}>
            <Gift size={18} style={{ color: colors.gold.primary }} />
            Your Rewards ({activeRewards.length})
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: spacing.xl }}>
            {activeRewards.map(assignment => (
              <RewardCard
                key={assignment.id}
                assignment={assignment}
                isMobile={isMobile}
                addingLinkId={addingLinkId}
                setAddingLinkId={setAddingLinkId}
                newLink={newLink}
                setNewLink={setNewLink}
                onAddLink={() => handleAddLink(assignment.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Completed/Expired Rewards */}
      {!loading && completedRewards.length > 0 && (
        <div style={{ marginBottom: spacing.xxxl }}>
          <h3 style={{
            fontSize: typography.fontSize.lg,
            fontWeight: typography.fontWeight.semibold,
            color: colors.text.secondary,
            marginBottom: spacing.lg,
            display: 'flex',
            alignItems: 'center',
            gap: spacing.sm,
          }}>
            <Clock size={18} style={{ color: colors.text.muted }} />
            Past Rewards ({completedRewards.length})
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: spacing.xl, opacity: 0.6 }}>
            {completedRewards.map(assignment => (
              <RewardCard
                key={assignment.id}
                assignment={assignment}
                isMobile={isMobile}
              />
            ))}
          </div>
        </div>
      )}

      {/* Visible-Only Rewards (can see but not yet assigned) */}
      {!loading && visibleRewards.length > 0 && (
        <div style={{ marginBottom: spacing.xxxl }}>
          <h3 style={{
            fontSize: typography.fontSize.lg,
            fontWeight: typography.fontWeight.semibold,
            color: colors.text.primary,
            marginBottom: spacing.sm,
            display: 'flex',
            alignItems: 'center',
            gap: spacing.sm,
          }}>
            <Gift size={18} style={{ color: colors.text.muted }} />
            Coming Soon ({visibleRewards.length})
          </h3>
          <p style={{
            fontSize: typography.fontSize.sm,
            color: colors.text.secondary,
            marginBottom: spacing.lg,
          }}>
            These rewards are available for your competition. Check back soon to claim!
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: spacing.xl }}>
            {visibleRewards.map(assignment => (
              <VisibleRewardCard
                key={assignment.id}
                assignment={assignment}
                isMobile={isMobile}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !hasAnyRewards && (
        <div style={{
          textAlign: 'center',
          padding: spacing.xxxl,
          background: colors.background.card,
          border: `1px solid ${colors.border.primary}`,
          borderRadius: borderRadius.xxl,
        }}>
          <Gift size={64} style={{ color: colors.text.muted, marginBottom: spacing.xl }} />
          <h2 style={{ fontSize: typography.fontSize.xxl, fontWeight: typography.fontWeight.semibold, marginBottom: spacing.md }}>
            No Rewards Yet
          </h2>
          <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.lg, maxWidth: '500px', margin: '0 auto' }}>
            Rewards will appear here when assigned to you by EliteRank
          </p>
        </div>
      )}

      {/* Claim Reward Modal */}
      <ClaimRewardModal
        isOpen={!!claimingAssignment}
        onClose={() => setClaimingAssignment(null)}
        assignment={claimingAssignment}
        userId={user?.id}
        onClaimed={fetchRewards}
      />

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

/**
 * RewardCard - Displays a single reward assignment
 * Design matches event card pattern: image-first with overlays
 */
function RewardCard({
  assignment,
  isMobile,
  onClaim,
  addingLinkId,
  setAddingLinkId,
  newLink,
  setNewLink,
  onAddLink,
}) {
  const reward = assignment.reward;
  const statusConfig = STATUS_CONFIG[assignment.status] || STATUS_CONFIG.pending;
  const isPending = assignment.status === 'pending';
  const canAddLinks = ['claimed', 'shipped', 'active'].includes(assignment.status);

  // Calculate days remaining to claim
  const getDaysRemaining = () => {
    if (!assignment.expires_at) return null;
    const now = new Date();
    const expires = new Date(assignment.expires_at);
    const diff = Math.ceil((expires - now) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  const daysRemaining = isPending ? getDaysRemaining() : null;

  return (
    <div
      style={{
        display: 'block',
        transition: 'transform 0.2s ease',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.02)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
    >
      {/* Cover Image */}
      <div style={{
        width: '100%',
        aspectRatio: '3 / 2',
        borderRadius: borderRadius.xl,
        overflow: 'hidden',
        position: 'relative',
        background: reward?.image_url
          ? `url(${reward.image_url}) center/cover no-repeat`
          : 'linear-gradient(135deg, rgba(212,175,55,0.15) 0%, rgba(139,92,246,0.1) 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {!reward?.image_url && <Package size={56} style={{ color: 'rgba(212,175,55,0.35)' }} />}

        {/* Bottom gradient fade */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '50%',
          background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 100%)',
          pointerEvents: 'none',
        }} />

        {/* Status badge - bottom left */}
        <div style={{
          position: 'absolute',
          bottom: spacing.md,
          left: spacing.md,
          background: statusConfig.color,
          borderRadius: '20px',
          padding: `4px ${spacing.md}`,
          fontSize: typography.fontSize.xs,
          fontWeight: typography.fontWeight.semibold,
          color: '#000',
          letterSpacing: '0.3px',
        }}>
          {statusConfig.label}
        </div>

        {/* Brand badge - top left */}
        {reward?.brand_name && (
          <div style={{
            position: 'absolute',
            top: spacing.md,
            left: spacing.md,
            background: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(8px)',
            borderRadius: '20px',
            padding: `4px ${spacing.sm}`,
            fontSize: typography.fontSize.xs,
            color: colors.gold.primary,
            fontWeight: typography.fontWeight.medium,
            letterSpacing: '0.3px',
          }}>
            {reward.brand_name}
          </div>
        )}

        {/* Cash value badge - bottom right */}
        {reward?.cash_value && (
          <div style={{
            position: 'absolute',
            bottom: spacing.md,
            right: spacing.md,
            background: 'rgba(34, 197, 94, 0.9)',
            backdropFilter: 'blur(8px)',
            borderRadius: '20px',
            padding: `4px ${spacing.md}`,
            fontSize: typography.fontSize.xs,
            fontWeight: typography.fontWeight.bold,
            color: '#fff',
          }}>
            ${reward.cash_value}
          </div>
        )}

        {/* Days remaining badge - top right (pending only) */}
        {isPending && daysRemaining !== null && (
          <div style={{
            position: 'absolute',
            top: spacing.md,
            right: spacing.md,
            background: daysRemaining <= 2 ? 'rgba(239,68,68,0.85)' : 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(8px)',
            borderRadius: '20px',
            padding: `4px ${spacing.sm}`,
            fontSize: typography.fontSize.xs,
            fontWeight: typography.fontWeight.semibold,
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            gap: spacing.xs,
          }}>
            <Clock size={12} />
            {daysRemaining}d left
          </div>
        )}
      </div>

      {/* Card Info */}
      <div style={{ padding: `${spacing.md} 2px 0` }}>
        <h3 style={{
          fontSize: typography.fontSize.md,
          fontWeight: typography.fontWeight.bold,
          color: colors.text.primary,
          marginBottom: '2px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {reward?.name}
        </h3>

        {reward?.description && (
          <p style={{
            fontSize: typography.fontSize.sm,
            color: colors.text.tertiary,
            marginBottom: spacing.xs,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            lineHeight: 1.4,
          }}>
            {reward.description}
          </p>
        )}

        <p style={{
          fontSize: typography.fontSize.xs,
          color: colors.text.muted,
        }}>
          From: {assignment.competition?.name || assignment.competition?.city?.name || 'Unknown'}
        </p>

        {/* Pending: Claim Button */}
        {isPending && (
          <div style={{ marginTop: spacing.md }}>
            <Button
              onClick={onClaim}
              icon={Gift}
              style={{ background: '#eab308', color: '#000', width: '100%' }}
            >
              Claim Reward
            </Button>
          </div>
        )}

        {/* Active: Show code/link and content links */}
        {canAddLinks && (
          <div style={{ marginTop: spacing.md }}>
            {/* Discount Code & Tracking Link */}
            {(assignment.discount_code || assignment.tracking_link) && (
              <div style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                gap: spacing.md,
                marginBottom: spacing.md,
                padding: spacing.md,
                background: colors.background.card,
                borderRadius: borderRadius.lg,
                border: `1px solid ${colors.border.primary}`,
              }}>
                {assignment.discount_code && (
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, marginBottom: spacing.xs }}>
                      Discount Code
                    </p>
                    <p style={{
                      fontSize: typography.fontSize.lg,
                      fontWeight: typography.fontWeight.bold,
                      color: colors.gold.primary,
                      fontFamily: 'monospace',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {assignment.discount_code}
                    </p>
                  </div>
                )}
                {assignment.tracking_link && (
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, marginBottom: spacing.xs }}>
                      Tracking Link
                    </p>
                    <a
                      href={assignment.tracking_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: spacing.xs,
                        fontSize: typography.fontSize.sm,
                        color: colors.gold.primary,
                        textDecoration: 'none',
                      }}
                    >
                      <Link2 size={14} />
                      Open Link
                      <ExternalLink size={12} />
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* Content Links */}
            <div>
              <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, marginBottom: spacing.sm }}>
                Your Content ({assignment.content_links?.length || 0})
              </p>

              {assignment.content_links?.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs, marginBottom: spacing.sm }}>
                  {assignment.content_links.map((link, index) => (
                    <a
                      key={index}
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: spacing.sm,
                        fontSize: typography.fontSize.sm,
                        color: colors.text.secondary,
                        textDecoration: 'none',
                        padding: `${spacing.sm} ${spacing.md}`,
                        background: colors.background.card,
                        borderRadius: borderRadius.md,
                        border: `1px solid ${colors.border.secondary}`,
                      }}
                    >
                      <Check size={14} style={{ color: '#22c55e', flexShrink: 0 }} />
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
                        {link}
                      </span>
                      <ExternalLink size={14} style={{ flexShrink: 0 }} />
                    </a>
                  ))}
                </div>
              )}

              {/* Add Link Form */}
              {addingLinkId === assignment.id ? (
                <div style={{ display: 'flex', gap: spacing.sm, flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
                  <input
                    type="url"
                    placeholder="Paste your content link..."
                    value={newLink}
                    onChange={(e) => setNewLink(e.target.value)}
                    style={{
                      flex: 1,
                      minWidth: isMobile ? '100%' : 0,
                      padding: `${spacing.sm} ${spacing.md}`,
                      background: colors.background.card,
                      border: `1px solid ${colors.border.primary}`,
                      borderRadius: borderRadius.md,
                      color: colors.text.primary,
                      fontSize: typography.fontSize.sm,
                      outline: 'none',
                    }}
                  />
                  <div style={{ display: 'flex', gap: spacing.sm }}>
                    <Button size="sm" onClick={onAddLink} disabled={!newLink.trim()}>
                      Add
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setAddingLinkId(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="secondary"
                  icon={Plus}
                  onClick={() => setAddingLinkId(assignment.id)}
                  style={{ width: '100%' }}
                >
                  Add Content Link
                </Button>
              )}
            </div>

            {/* Terms Reminder */}
            {reward?.terms && (
              <div style={{
                marginTop: spacing.md,
                padding: spacing.md,
                background: 'rgba(234,179,8,0.08)',
                borderRadius: borderRadius.lg,
                border: '1px solid rgba(234,179,8,0.15)',
              }}>
                <p style={{ fontSize: typography.fontSize.xs, color: '#eab308', fontWeight: typography.fontWeight.medium, marginBottom: spacing.xs }}>
                  Promotion Requirements
                </p>
                <p style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary, lineHeight: 1.5 }}>
                  {reward.terms}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * VisibleRewardCard - Displays a visible-only reward (not yet assigned to user)
 * Design matches event card pattern with a muted appearance
 */
function VisibleRewardCard({ assignment, isMobile }) {
  const reward = assignment.reward;

  return (
    <div
      style={{
        display: 'block',
        opacity: 0.85,
        transition: 'transform 0.2s ease, opacity 0.2s ease',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.opacity = '1'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.opacity = '0.85'; }}
    >
      {/* Cover Image */}
      <div style={{
        width: '100%',
        aspectRatio: '3 / 2',
        borderRadius: borderRadius.xl,
        overflow: 'hidden',
        position: 'relative',
        background: reward?.image_url
          ? `url(${reward.image_url}) center/cover no-repeat`
          : 'linear-gradient(135deg, rgba(212,175,55,0.15) 0%, rgba(139,92,246,0.1) 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {!reward?.image_url && <Package size={56} style={{ color: 'rgba(212,175,55,0.35)' }} />}

        {/* Bottom gradient fade */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '50%',
          background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 100%)',
          pointerEvents: 'none',
        }} />

        {/* Coming Soon badge - bottom left */}
        <div style={{
          position: 'absolute',
          bottom: spacing.md,
          left: spacing.md,
          background: 'rgba(107, 114, 128, 0.85)',
          backdropFilter: 'blur(8px)',
          borderRadius: '20px',
          padding: `4px ${spacing.md}`,
          fontSize: typography.fontSize.xs,
          fontWeight: typography.fontWeight.semibold,
          color: '#fff',
          letterSpacing: '0.3px',
        }}>
          Coming Soon
        </div>

        {/* Brand badge - top left */}
        {reward?.brand_name && (
          <div style={{
            position: 'absolute',
            top: spacing.md,
            left: spacing.md,
            background: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(8px)',
            borderRadius: '20px',
            padding: `4px ${spacing.sm}`,
            fontSize: typography.fontSize.xs,
            color: colors.gold.primary,
            fontWeight: typography.fontWeight.medium,
            letterSpacing: '0.3px',
          }}>
            {reward.brand_name}
          </div>
        )}

        {/* Cash value badge - bottom right */}
        {reward?.cash_value && (
          <div style={{
            position: 'absolute',
            bottom: spacing.md,
            right: spacing.md,
            background: 'rgba(34, 197, 94, 0.9)',
            backdropFilter: 'blur(8px)',
            borderRadius: '20px',
            padding: `4px ${spacing.md}`,
            fontSize: typography.fontSize.xs,
            fontWeight: typography.fontWeight.bold,
            color: '#fff',
          }}>
            ${reward.cash_value}
          </div>
        )}
      </div>

      {/* Card Info */}
      <div style={{ padding: `${spacing.md} 2px 0` }}>
        <h3 style={{
          fontSize: typography.fontSize.md,
          fontWeight: typography.fontWeight.bold,
          color: colors.text.primary,
          marginBottom: '2px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {reward?.name}
        </h3>

        {reward?.description && (
          <p style={{
            fontSize: typography.fontSize.sm,
            color: colors.text.tertiary,
            marginBottom: spacing.xs,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            lineHeight: 1.4,
          }}>
            {reward.description}
          </p>
        )}

        <p style={{
          fontSize: typography.fontSize.xs,
          color: colors.text.muted,
        }}>
          From: {assignment.competition?.name || assignment.competition?.city?.name || 'Unknown'}
        </p>

        {/* Commission Info (if applicable) */}
        {reward?.commission_rate && (
          <div style={{
            marginTop: spacing.md,
            padding: `${spacing.sm} ${spacing.md}`,
            background: 'rgba(139, 92, 246, 0.08)',
            borderRadius: borderRadius.lg,
            border: '1px solid rgba(139, 92, 246, 0.15)',
          }}>
            <p style={{ fontSize: typography.fontSize.xs, color: '#a78bfa', fontWeight: typography.fontWeight.medium }}>
              Earn up to {reward.commission_rate}% commission on referrals
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
