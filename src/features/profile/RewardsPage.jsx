import React, { useState, useEffect, useCallback } from 'react';
import { MapPin, Gift, Package, ExternalLink, Clock, Check, Link2, Plus, Loader, AlertCircle } from 'lucide-react';
import { Panel, Button, Badge } from '../../components/ui';
import { colors, spacing, borderRadius, typography, gradients } from '../../styles/theme';
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
  const [claimingId, setClaimingId] = useState(null);
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
      // First get all contestants for this user
      const { data: contestants, error: contestantError } = await supabase
        .from('contestants')
        .select('id, competition_id')
        .eq('user_id', user.id);

      if (contestantError) throw contestantError;

      if (!contestants || contestants.length === 0) {
        setClaimableRewards([]);
        setVisibleRewards([]);
        setLoading(false);
        return;
      }

      const contestantIds = contestants.map(c => c.id);
      const competitionIds = contestants.map(c => c.competition_id);

      // Get individual assignments (claimable rewards)
      const { data: individualAssignments, error: indError } = await supabase
        .from('reward_assignments')
        .select(`
          *,
          reward:rewards(*),
          competition:competitions(
            id,
            name,
            season,
            city:cities(name)
          )
        `)
        .in('contestant_id', contestantIds)
        .order('created_at', { ascending: false });

      if (indError) throw indError;
      setClaimableRewards(individualAssignments || []);

      // Get competition-level assignments (visible rewards)
      const { data: compAssignments, error: compError } = await supabase
        .from('reward_competition_assignments')
        .select(`
          *,
          reward:rewards(*),
          competition:competitions(
            id,
            name,
            season,
            city:cities(name)
          )
        `)
        .in('competition_id', competitionIds)
        .order('created_at', { ascending: false });

      if (compError) throw compError;

      // Filter out rewards that user already has individual assignment for
      const claimableRewardIds = new Set((individualAssignments || []).map(a => a.reward_id));
      const visibleOnly = (compAssignments || []).filter(ca => !claimableRewardIds.has(ca.reward_id));
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

  // Claim a reward
  const handleClaim = async (assignmentId) => {
    if (!supabase) return;

    setClaimingId(assignmentId);
    try {
      const { error } = await supabase
        .from('reward_assignments')
        .update({
          status: 'claimed',
          claimed_at: new Date().toISOString(),
        })
        .eq('id', assignmentId);

      if (error) throw error;
      await fetchRewards();
    } catch (err) {
      console.error('Error claiming reward:', err);
      alert('Failed to claim reward. Please try again.');
    } finally {
      setClaimingId(null);
    }
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

  const initials = `${(hostProfile.firstName || '?')[0]}${(hostProfile.lastName || '?')[0]}`;

  // Separate claimable rewards by status
  const pendingRewards = claimableRewards.filter(a => a.status === 'pending');
  const activeRewards = claimableRewards.filter(a => ['claimed', 'shipped', 'active'].includes(a.status));
  const completedRewards = claimableRewards.filter(a => ['completed', 'expired'].includes(a.status));

  // Check if there are any rewards at all (claimable or visible)
  const hasAnyRewards = claimableRewards.length > 0 || visibleRewards.length > 0;

  return (
    <div>
      {/* Simplified Profile Banner */}
      <Panel style={{ marginBottom: isMobile ? spacing.lg : spacing.xxl }}>
        <div
          style={{
            height: isMobile ? '140px' : '200px',
            background: hostProfile.coverImage
              ? `url(${hostProfile.coverImage}) center/cover`
              : gradients.cover,
            position: 'relative',
          }}
        />
        <div style={{ padding: isMobile ? `0 ${spacing.lg} ${spacing.lg}` : `0 ${spacing.xxxl} ${spacing.xxxl}`, marginTop: isMobile ? '-40px' : '-60px' }}>
          <div style={{ display: 'flex', gap: isMobile ? spacing.md : spacing.xxl, alignItems: isMobile ? 'center' : 'flex-end', flexWrap: 'wrap' }}>
            <div
              style={{
                width: isMobile ? '100px' : '140px',
                height: isMobile ? '100px' : '140px',
                borderRadius: borderRadius.xxl,
                background: hostProfile.avatarUrl
                  ? `url(${hostProfile.avatarUrl}) center/cover`
                  : 'linear-gradient(135deg, rgba(212,175,55,0.4), rgba(212,175,55,0.1))',
                border: isMobile ? '3px solid #1a1a24' : '4px solid #1a1a24',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: isMobile ? '32px' : '42px',
                fontWeight: typography.fontWeight.semibold,
                color: colors.gold.primary,
                flexShrink: 0,
              }}
            >
              {!hostProfile.avatarUrl && initials}
            </div>
            <div style={{ flex: 1, paddingBottom: isMobile ? 0 : spacing.sm, minWidth: 0 }}>
              <h1 style={{
                fontSize: isMobile ? typography.fontSize.xxl : typography.fontSize.hero,
                fontWeight: typography.fontWeight.bold,
                color: '#fff',
                wordBreak: 'break-word',
              }}>
                {hostProfile.firstName} {hostProfile.lastName}
              </h1>
              {hostProfile.city && (
                <p style={{
                  color: colors.text.secondary,
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing.sm,
                  marginTop: spacing.sm,
                  fontSize: isMobile ? typography.fontSize.md : typography.fontSize.lg
                }}>
                  <MapPin size={isMobile ? 16 : 18} /> {hostProfile.city}
                </p>
              )}
            </div>
          </div>
        </div>
      </Panel>

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
        <Panel style={{ marginBottom: isMobile ? spacing.lg : spacing.xxl }}>
          <div style={{ padding: isMobile ? spacing.lg : spacing.xxl }}>
            <h2 style={{
              fontSize: isMobile ? typography.fontSize.xl : typography.fontSize.xxl,
              fontWeight: typography.fontWeight.semibold,
              marginBottom: spacing.xl,
              display: 'flex',
              alignItems: 'center',
              gap: spacing.md,
              color: colors.text.primary,
            }}>
              <AlertCircle size={isMobile ? 20 : 24} style={{ color: '#eab308' }} />
              Action Required ({pendingRewards.length})
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))', gap: spacing.md }}>
              {pendingRewards.map(assignment => (
                <RewardCard
                  key={assignment.id}
                  assignment={assignment}
                  isMobile={isMobile}
                  onClaim={() => handleClaim(assignment.id)}
                  claiming={claimingId === assignment.id}
                />
              ))}
            </div>
          </div>
        </Panel>
      )}

      {/* Active Rewards */}
      {!loading && activeRewards.length > 0 && (
        <Panel style={{ marginBottom: isMobile ? spacing.lg : spacing.xxl }}>
          <div style={{ padding: isMobile ? spacing.lg : spacing.xxl }}>
            <h2 style={{
              fontSize: isMobile ? typography.fontSize.xl : typography.fontSize.xxl,
              fontWeight: typography.fontWeight.semibold,
              marginBottom: spacing.xl,
              display: 'flex',
              alignItems: 'center',
              gap: spacing.md,
              color: colors.text.primary,
            }}>
              <Gift size={isMobile ? 20 : 24} style={{ color: colors.gold.primary }} />
              Your Rewards ({activeRewards.length})
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))', gap: spacing.md }}>
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
        </Panel>
      )}

      {/* Completed/Expired Rewards */}
      {!loading && completedRewards.length > 0 && (
        <Panel style={{ marginBottom: isMobile ? spacing.lg : spacing.xxl }}>
          <div style={{ padding: isMobile ? spacing.lg : spacing.xxl }}>
            <h2 style={{
              fontSize: isMobile ? typography.fontSize.xl : typography.fontSize.xxl,
              fontWeight: typography.fontWeight.semibold,
              marginBottom: spacing.xl,
              display: 'flex',
              alignItems: 'center',
              gap: spacing.md,
              color: colors.text.secondary,
            }}>
              <Clock size={isMobile ? 20 : 24} style={{ color: colors.text.muted }} />
              Past Rewards ({completedRewards.length})
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg, opacity: 0.7 }}>
              {completedRewards.map(assignment => (
                <RewardCard
                  key={assignment.id}
                  assignment={assignment}
                  isMobile={isMobile}
                />
              ))}
            </div>
          </div>
        </Panel>
      )}

      {/* Visible-Only Rewards (can see but not yet assigned) */}
      {!loading && visibleRewards.length > 0 && (
        <Panel style={{ marginBottom: isMobile ? spacing.lg : spacing.xxl }}>
          <div style={{ padding: isMobile ? spacing.lg : spacing.xxl }}>
            <h2 style={{
              fontSize: isMobile ? typography.fontSize.xl : typography.fontSize.xxl,
              fontWeight: typography.fontWeight.semibold,
              marginBottom: spacing.xl,
              display: 'flex',
              alignItems: 'center',
              gap: spacing.md,
              color: colors.text.primary,
            }}>
              <Gift size={isMobile ? 20 : 24} style={{ color: colors.text.muted }} />
              Coming Soon ({visibleRewards.length})
            </h2>
            <p style={{
              fontSize: typography.fontSize.sm,
              color: colors.text.secondary,
              marginBottom: spacing.lg,
            }}>
              These rewards are available for your competition. Check back soon to claim!
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))', gap: spacing.md }}>
              {visibleRewards.map(assignment => (
                <VisibleRewardCard
                  key={assignment.id}
                  assignment={assignment}
                  isMobile={isMobile}
                />
              ))}
            </div>
          </div>
        </Panel>
      )}

      {/* Empty State */}
      {!loading && !hasAnyRewards && (
        <Panel>
          <div style={{ padding: isMobile ? spacing.lg : spacing.xxl }}>
            <h2 style={{
              fontSize: isMobile ? typography.fontSize.xl : typography.fontSize.xxl,
              fontWeight: typography.fontWeight.semibold,
              marginBottom: spacing.xl,
              display: 'flex',
              alignItems: 'center',
              gap: spacing.md,
              color: colors.text.primary,
            }}>
              <Gift size={isMobile ? 20 : 24} style={{ color: colors.gold.primary }} />
              Available Rewards
            </h2>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: isMobile ? spacing.xxl : spacing.xxxl,
              textAlign: 'center',
            }}>
              <div style={{
                width: isMobile ? '64px' : '80px',
                height: isMobile ? '64px' : '80px',
                borderRadius: borderRadius.full,
                background: 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.05))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: spacing.lg,
              }}>
                <Gift size={isMobile ? 28 : 36} style={{ color: colors.gold.primary, opacity: 0.6 }} />
              </div>
              <p style={{
                color: colors.text.secondary,
                fontSize: isMobile ? typography.fontSize.md : typography.fontSize.lg,
              }}>
                No rewards available
              </p>
              <p style={{
                color: colors.text.muted,
                fontSize: typography.fontSize.sm,
                marginTop: spacing.sm,
              }}>
                Rewards will appear here when assigned to you by EliteRank
              </p>
            </div>
          </div>
        </Panel>
      )}

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
 */
function RewardCard({
  assignment,
  isMobile,
  onClaim,
  claiming,
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
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: spacing.sm,
      padding: spacing.md,
      background: colors.background.secondary,
      borderRadius: borderRadius.lg,
      border: isPending ? `2px solid #eab308` : `1px solid ${colors.border.light}`,
    }}>
      {/* Product Image */}
      <div style={{
        width: '100%',
        height: '120px',
        background: reward?.image_url
          ? `url(${reward.image_url}) center/cover`
          : 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.05))',
        borderRadius: borderRadius.md,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {!reward?.image_url && <Package size={32} style={{ color: colors.gold.primary, opacity: 0.5 }} />}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: spacing.xs, gap: spacing.sm, flexWrap: 'wrap' }}>
          <div>
            <p style={{ fontSize: typography.fontSize.xs, color: colors.gold.primary, marginBottom: '2px' }}>
              {reward?.brand_name}
            </p>
            <h3 style={{ fontSize: typography.fontSize.md, fontWeight: typography.fontWeight.semibold }}>
              {reward?.name}
            </h3>
          </div>
          <Badge style={{ background: `${statusConfig.color}20`, color: statusConfig.color }} size="sm">
            {statusConfig.label}
          </Badge>
        </div>

        <p style={{ fontSize: typography.fontSize.xs, color: colors.text.secondary, marginBottom: spacing.sm, lineHeight: 1.4 }}>
          {reward?.description || 'No description available.'}
          {reward?.cash_value && (
            <span style={{ color: '#22c55e', fontWeight: typography.fontWeight.semibold }}>
              {' '}(${reward.cash_value} value)
            </span>
          )}
        </p>

        {/* Competition Info */}
        <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, marginBottom: spacing.sm }}>
          From: {assignment.competition?.name || assignment.competition?.city?.name || 'Unknown'}
        </p>

        {/* Pending: Claim Button */}
        {isPending && (
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md, flexWrap: 'wrap' }}>
            <Button
              onClick={onClaim}
              disabled={claiming}
              icon={claiming ? Loader : Check}
              style={{ background: '#eab308', color: '#000' }}
            >
              {claiming ? 'Claiming...' : 'Claim Reward'}
            </Button>
            {daysRemaining !== null && (
              <p style={{ fontSize: typography.fontSize.sm, color: daysRemaining <= 2 ? '#ef4444' : colors.text.muted }}>
                <Clock size={14} style={{ display: 'inline', marginRight: spacing.xs }} />
                {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} remaining
              </p>
            )}
          </div>
        )}

        {/* Active: Show code/link and content links */}
        {canAddLinks && (
          <div>
            {/* Discount Code & Tracking Link */}
            {(assignment.discount_code || assignment.tracking_link) && (
              <div style={{
                display: 'flex',
                gap: spacing.lg,
                marginBottom: spacing.md,
                padding: spacing.md,
                background: colors.background.card,
                borderRadius: borderRadius.md,
                flexWrap: 'wrap',
              }}>
                {assignment.discount_code && (
                  <div>
                    <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, marginBottom: spacing.xs }}>
                      Your Discount Code
                    </p>
                    <p style={{
                      fontSize: typography.fontSize.lg,
                      fontWeight: typography.fontWeight.bold,
                      color: colors.gold.primary,
                      fontFamily: 'monospace',
                    }}>
                      {assignment.discount_code}
                    </p>
                  </div>
                )}
                {assignment.tracking_link && (
                  <div>
                    <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, marginBottom: spacing.xs }}>
                      Your Tracking Link
                    </p>
                    <a
                      href={assignment.tracking_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: spacing.xs,
                        fontSize: typography.fontSize.sm,
                        color: colors.gold.primary,
                        textDecoration: 'none',
                      }}
                    >
                      <Link2 size={16} />
                      Open Link
                      <ExternalLink size={14} />
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
                        gap: spacing.xs,
                        fontSize: typography.fontSize.sm,
                        color: colors.text.secondary,
                        textDecoration: 'none',
                        padding: spacing.sm,
                        background: colors.background.card,
                        borderRadius: borderRadius.sm,
                      }}
                    >
                      <Check size={14} style={{ color: '#22c55e' }} />
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {link}
                      </span>
                      <ExternalLink size={14} />
                    </a>
                  ))}
                </div>
              )}

              {/* Add Link Form */}
              {addingLinkId === assignment.id ? (
                <div style={{ display: 'flex', gap: spacing.sm }}>
                  <input
                    type="url"
                    placeholder="Paste your content link..."
                    value={newLink}
                    onChange={(e) => setNewLink(e.target.value)}
                    style={{
                      flex: 1,
                      padding: spacing.sm,
                      background: colors.background.card,
                      border: `1px solid ${colors.border.light}`,
                      borderRadius: borderRadius.sm,
                      color: colors.text.primary,
                      fontSize: typography.fontSize.sm,
                    }}
                  />
                  <Button size="sm" onClick={onAddLink} disabled={!newLink.trim()}>
                    Add
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setAddingLinkId(null)}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="secondary"
                  icon={Plus}
                  onClick={() => setAddingLinkId(assignment.id)}
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
                background: 'rgba(234,179,8,0.1)',
                borderRadius: borderRadius.md,
                border: '1px solid rgba(234,179,8,0.2)',
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
 * Shows reward info but with disabled claim action
 */
function VisibleRewardCard({ assignment, isMobile }) {
  const reward = assignment.reward;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: spacing.sm,
      padding: spacing.md,
      background: colors.background.secondary,
      borderRadius: borderRadius.lg,
      border: `1px solid ${colors.border.light}`,
      opacity: 0.85,
    }}>
      {/* Product Image */}
      <div style={{
        width: '100%',
        height: '120px',
        background: reward?.image_url
          ? `url(${reward.image_url}) center/cover`
          : 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.05))',
        borderRadius: borderRadius.md,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {!reward?.image_url && <Package size={32} style={{ color: colors.gold.primary, opacity: 0.5 }} />}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: spacing.xs, gap: spacing.sm, flexWrap: 'wrap' }}>
          <div>
            <p style={{ fontSize: typography.fontSize.xs, color: colors.gold.primary, marginBottom: '2px' }}>
              {reward?.brand_name}
            </p>
            <h3 style={{ fontSize: typography.fontSize.md, fontWeight: typography.fontWeight.semibold }}>
              {reward?.name}
            </h3>
          </div>
          <Badge style={{ background: 'rgba(107, 114, 128, 0.2)', color: colors.text.muted }} size="sm">
            Coming Soon
          </Badge>
        </div>

        <p style={{ fontSize: typography.fontSize.xs, color: colors.text.secondary, marginBottom: spacing.sm, lineHeight: 1.4 }}>
          {reward?.description || 'No description available.'}
          {reward?.cash_value && (
            <span style={{ color: '#22c55e', fontWeight: typography.fontWeight.semibold }}>
              {' '}(${reward.cash_value} value)
            </span>
          )}
        </p>

        {/* Competition Info */}
        <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, marginBottom: spacing.sm }}>
          From: {assignment.competition?.name || assignment.competition?.city?.name || 'Unknown'}
        </p>

        {/* Disabled Claim Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' }}>
          <Button
            disabled
            size="sm"
            style={{
              background: colors.background.card,
              color: colors.text.muted,
              cursor: 'not-allowed',
              opacity: 0.6,
            }}
          >
            Not Yet Available
          </Button>
          <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted }}>
            Check back soon for claiming details
          </p>
        </div>

        {/* Commission Info (if applicable) */}
        {reward?.commission_rate && (
          <div style={{
            marginTop: spacing.sm,
            padding: spacing.sm,
            background: 'rgba(139, 92, 246, 0.1)',
            borderRadius: borderRadius.sm,
            border: '1px solid rgba(139, 92, 246, 0.2)',
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
