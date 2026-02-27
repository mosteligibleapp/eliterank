import React, { useState, useEffect, useCallback } from 'react';
import {
  Gift, Plus, Edit2, Trash2, Users, ExternalLink, Clock, Check, X,
  Package, Link2, Loader, ChevronDown, ChevronRight, AlertCircle, Crown
} from 'lucide-react';
import { Button, Badge, SkeletonGrid } from '../../../components/ui';
import { colors, spacing, borderRadius, typography } from '../../../styles/theme';
import { supabase } from '../../../lib/supabase';
import RewardModal from '../../../components/modals/RewardModal';
import AssignRewardModal from '../../../components/modals/AssignRewardModal';

const STATUS_COLORS = {
  active: { bg: 'rgba(34,197,94,0.15)', color: '#22c55e' },
  paused: { bg: 'rgba(234,179,8,0.15)', color: '#eab308' },
  archived: { bg: 'rgba(107,114,128,0.15)', color: '#6b7280' },
};

const ASSIGNMENT_STATUS_COLORS = {
  pending: { bg: 'rgba(234,179,8,0.15)', color: '#eab308', label: 'Pending' },
  claimed: { bg: 'rgba(59,130,246,0.15)', color: '#3b82f6', label: 'Claimed' },
  shipped: { bg: 'rgba(139,92,246,0.15)', color: '#8b5cf6', label: 'Shipped' },
  active: { bg: 'rgba(34,197,94,0.15)', color: '#22c55e', label: 'Active' },
  completed: { bg: 'rgba(107,114,128,0.15)', color: '#6b7280', label: 'Completed' },
  expired: { bg: 'rgba(239,68,68,0.15)', color: '#ef4444', label: 'Expired' },
};

export default function RewardsManager() {
  const [activeTab, setActiveTab] = useState('rewards');
  const [rewards, setRewards] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [competitionAssignments, setCompetitionAssignments] = useState([]);
  const [competitions, setCompetitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal states
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [editingReward, setEditingReward] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigningReward, setAssigningReward] = useState(null);

  // Expanded reward cards (to show assignments)
  const [expandedRewards, setExpandedRewards] = useState({});

  // Fetch rewards from database
  const fetchRewards = useCallback(async () => {
    if (!supabase) return;

    try {
      const { data, error } = await supabase
        .from('rewards')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRewards(data || []);
    } catch (err) {
      console.error('Error fetching rewards:', err);
      setError(err.message);
    }
  }, []);

  // Fetch assignments with related data
  const fetchAssignments = useCallback(async () => {
    if (!supabase) return;

    try {
      const { data, error } = await supabase
        .from('reward_assignments')
        .select(`
          *,
          reward:rewards(id, name, brand_name, image_url, is_affiliate),
          competition:competitions(id, name, city, season),
          contestant:contestants(id, name, user_id, profile:profiles(first_name, last_name, email, avatar_url)),
          nominee:nominees(id, name, email, avatar_url)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAssignments(data || []);
    } catch (err) {
      console.error('Error fetching assignments:', err);
    }
  }, []);

  // Fetch competitions for assignment modal
  const fetchCompetitions = useCallback(async () => {
    if (!supabase) return;

    try {
      const { data, error } = await supabase
        .from('competitions')
        .select(`
          id,
          name,
          season,
          status,
          city_id,
          city:cities(id, name, state)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      // Map data to include city name for display
      const mappedData = (data || []).map(comp => ({
        ...comp,
        cityName: comp.city?.name || 'Unknown City',
        cityState: comp.city?.state || '',
      }));
      setCompetitions(mappedData);
    } catch (err) {
      console.error('Error fetching competitions:', err);
    }
  }, []);

  // Fetch competition assignments (visibility)
  const fetchCompetitionAssignments = useCallback(async () => {
    if (!supabase) return;

    try {
      const { data, error } = await supabase
        .from('reward_competition_assignments')
        .select(`
          *,
          competition:competitions(
            id,
            name,
            season,
            status,
            city:cities(name, state)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCompetitionAssignments(data || []);
    } catch (err) {
      console.error('Error fetching competition assignments:', err);
    }
  }, []);

  // Load all data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchRewards(), fetchAssignments(), fetchCompetitions(), fetchCompetitionAssignments()]);
      setLoading(false);
    };
    loadData();
  }, [fetchRewards, fetchAssignments, fetchCompetitions, fetchCompetitionAssignments]);

  // Create or update a reward
  const handleSaveReward = async (rewardData) => {
    if (!supabase) return;

    try {
      if (editingReward) {
        // Update existing
        const { error } = await supabase
          .from('rewards')
          .update({
            name: rewardData.name,
            brand_name: rewardData.brandName,
            brand_logo_url: rewardData.brandLogoUrl,
            description: rewardData.description,
            image_url: rewardData.imageUrl,
            product_url: rewardData.productUrl,
            terms: rewardData.isAffiliate ? rewardData.terms : null,
            commission_rate: rewardData.isAffiliate ? (rewardData.commissionRate || null) : null,
            cash_value: rewardData.cashValue || null,
            requires_promotion: rewardData.isAffiliate ? rewardData.requiresPromotion : false,
            claim_deadline_days: rewardData.claimDeadlineDays || 7,
            status: rewardData.status,
            reward_type: rewardData.rewardType,
            is_affiliate: rewardData.isAffiliate,
          })
          .eq('id', editingReward.id);

        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from('rewards')
          .insert({
            name: rewardData.name,
            brand_name: rewardData.brandName,
            brand_logo_url: rewardData.brandLogoUrl,
            description: rewardData.description,
            image_url: rewardData.imageUrl,
            product_url: rewardData.productUrl,
            terms: rewardData.isAffiliate ? rewardData.terms : null,
            commission_rate: rewardData.isAffiliate ? (rewardData.commissionRate || null) : null,
            cash_value: rewardData.cashValue || null,
            requires_promotion: rewardData.isAffiliate ? rewardData.requiresPromotion : false,
            claim_deadline_days: rewardData.claimDeadlineDays || 7,
            status: rewardData.status || 'active',
            reward_type: rewardData.rewardType,
            is_affiliate: rewardData.isAffiliate,
          });

        if (error) throw error;
      }

      await fetchRewards();
      setShowRewardModal(false);
      setEditingReward(null);
    } catch (err) {
      console.error('Error saving reward:', err);
      alert('Failed to save reward: ' + err.message);
    }
  };

  // Delete a reward
  const handleDeleteReward = async (rewardId) => {
    if (!confirm('Are you sure you want to delete this reward? This will also delete all assignments.')) return;
    if (!supabase) return;

    try {
      const { error } = await supabase
        .from('rewards')
        .delete()
        .eq('id', rewardId);

      if (error) throw error;
      await fetchRewards();
      await fetchAssignments();
    } catch (err) {
      console.error('Error deleting reward:', err);
      alert('Failed to delete reward: ' + err.message);
    }
  };

  // Assign reward to competitions and/or contestants
  const handleAssignReward = async (assignmentData) => {
    if (!supabase) return;

    try {
      // Remove unselected competition assignments
      if (assignmentData.removedCompetitionIds && assignmentData.removedCompetitionIds.length > 0) {
        const { error: removeError } = await supabase
          .from('reward_competition_assignments')
          .delete()
          .eq('reward_id', assigningReward.id)
          .in('competition_id', assignmentData.removedCompetitionIds);

        if (removeError) throw removeError;
      }

      // Create competition assignments (for visibility)
      if (assignmentData.competitionIds && assignmentData.competitionIds.length > 0) {
        const competitionAssignmentsToCreate = assignmentData.competitionIds.map(competitionId => ({
          reward_id: assigningReward.id,
          competition_id: competitionId,
        }));

        const { error: compError } = await supabase
          .from('reward_competition_assignments')
          .upsert(competitionAssignmentsToCreate, { onConflict: 'reward_id,competition_id' });

        if (compError) throw compError;
      }

      // Remove deselected contestant assignments
      if (assignmentData.removedContestantIds && assignmentData.removedContestantIds.length > 0) {
        const { error: removeContError } = await supabase
          .from('reward_assignments')
          .delete()
          .eq('reward_id', assigningReward.id)
          .in('contestant_id', assignmentData.removedContestantIds);

        if (removeContError) throw removeContError;
      }

      // Remove deselected nominee assignments
      if (assignmentData.removedNomineeIds && assignmentData.removedNomineeIds.length > 0) {
        const { error: removeNomError } = await supabase
          .from('reward_assignments')
          .delete()
          .eq('reward_id', assigningReward.id)
          .in('nominee_id', assignmentData.removedNomineeIds);

        if (removeNomError) throw removeNomError;
      }

      // Create contestant assignments (for claiming) if any selected
      if (assignmentData.contestantIds && assignmentData.contestantIds.length > 0) {
        // Get contestant competition mappings
        const { data: contestantData } = await supabase
          .from('contestants')
          .select('id, competition_id')
          .in('id', assignmentData.contestantIds);

        const contestantCompMap = {};
        (contestantData || []).forEach(c => {
          contestantCompMap[c.id] = c.competition_id;
        });

        const contestantAssignmentsToCreate = assignmentData.contestantIds.map(contestantId => ({
          reward_id: assigningReward.id,
          competition_id: contestantCompMap[contestantId],
          contestant_id: contestantId,
          discount_code: null,
          tracking_link: null,
          status: 'pending',
        }));

        const { error: assignError } = await supabase
          .from('reward_assignments')
          .upsert(contestantAssignmentsToCreate, { onConflict: 'reward_id,contestant_id' });

        if (assignError) throw assignError;
      }

      // Create nominee assignments (for claiming) if any selected
      if (assignmentData.nomineeIds && assignmentData.nomineeIds.length > 0) {
        // Get nominee competition mappings
        const { data: nomineeData } = await supabase
          .from('nominees')
          .select('id, competition_id')
          .in('id', assignmentData.nomineeIds);

        const nomineeCompMap = {};
        (nomineeData || []).forEach(n => {
          nomineeCompMap[n.id] = n.competition_id;
        });

        const nomineeAssignmentsToCreate = assignmentData.nomineeIds.map(nomineeId => ({
          reward_id: assigningReward.id,
          competition_id: nomineeCompMap[nomineeId],
          nominee_id: nomineeId,
          discount_code: null,
          tracking_link: null,
          status: 'pending',
        }));

        const { error: nomineeError } = await supabase
          .from('reward_assignments')
          .upsert(nomineeAssignmentsToCreate, { onConflict: 'reward_id,nominee_id' });

        if (nomineeError) throw nomineeError;
      }

      await Promise.all([fetchAssignments(), fetchCompetitionAssignments()]);
      setShowAssignModal(false);
      setAssigningReward(null);
    } catch (err) {
      console.error('Error assigning reward:', err);
      alert('Failed to assign reward: ' + err.message);
    }
  };

  // Update assignment (code, link, status)
  const handleUpdateAssignment = async (assignmentId, updates) => {
    if (!supabase) return;

    try {
      const { error } = await supabase
        .from('reward_assignments')
        .update(updates)
        .eq('id', assignmentId);

      if (error) throw error;
      await fetchAssignments();
    } catch (err) {
      console.error('Error updating assignment:', err);
      alert('Failed to update assignment: ' + err.message);
    }
  };

  // Toggle expanded state for a reward
  const toggleExpanded = (rewardId) => {
    setExpandedRewards(prev => ({
      ...prev,
      [rewardId]: !prev[rewardId]
    }));
  };

  // Get contestant assignments for a specific reward
  const getRewardAssignments = (rewardId) => {
    return assignments.filter(a => a.reward_id === rewardId);
  };

  // Get competition assignments for a specific reward
  const getRewardCompetitionAssignments = (rewardId) => {
    return competitionAssignments.filter(a => a.reward_id === rewardId);
  };

  // Get existing competition IDs for a reward (for the modal)
  const getExistingCompetitionIds = (rewardId) => {
    return competitionAssignments
      .filter(a => a.reward_id === rewardId)
      .map(a => a.competition_id);
  };

  if (loading) {
    return <SkeletonGrid count={4} columns={2} cardHeight={180} gap={16} style={{ padding: spacing.xl }} />;
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xxl }}>
        <div>
          <h1 style={{ fontSize: typography.fontSize.xxl, fontWeight: typography.fontWeight.bold, marginBottom: spacing.xs }}>
            Rewards Management
          </h1>
          <p style={{ color: colors.text.secondary }}>
            Manage affiliate rewards and track contestant assignments
          </p>
        </div>
        <Button icon={Plus} onClick={() => { setEditingReward(null); setShowRewardModal(true); }}>
          Create Reward
        </Button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: spacing.sm, marginBottom: spacing.xl }}>
        <button
          onClick={() => setActiveTab('rewards')}
          style={{
            padding: `${spacing.md} ${spacing.xl}`,
            background: activeTab === 'rewards' ? 'rgba(212,175,55,0.2)' : 'transparent',
            border: `1px solid ${activeTab === 'rewards' ? colors.gold.primary : colors.border.light}`,
            borderRadius: borderRadius.lg,
            color: activeTab === 'rewards' ? colors.gold.primary : colors.text.secondary,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: spacing.sm,
            fontSize: typography.fontSize.md,
            fontWeight: typography.fontWeight.medium,
          }}
        >
          <Gift size={18} />
          Rewards ({rewards.length})
        </button>
        <button
          onClick={() => setActiveTab('assignments')}
          style={{
            padding: `${spacing.md} ${spacing.xl}`,
            background: activeTab === 'assignments' ? 'rgba(212,175,55,0.2)' : 'transparent',
            border: `1px solid ${activeTab === 'assignments' ? colors.gold.primary : colors.border.light}`,
            borderRadius: borderRadius.lg,
            color: activeTab === 'assignments' ? colors.gold.primary : colors.text.secondary,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: spacing.sm,
            fontSize: typography.fontSize.md,
            fontWeight: typography.fontWeight.medium,
          }}
        >
          <Users size={18} />
          All Assignments ({assignments.length})
        </button>
      </div>

      {/* Rewards Tab */}
      {activeTab === 'rewards' && (
        rewards.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: spacing.xxxl,
            background: colors.background.card,
            borderRadius: borderRadius.xl,
            border: `1px solid ${colors.border.light}`,
          }}>
            <Gift size={64} style={{ color: colors.text.muted, marginBottom: spacing.lg }} />
            <h3 style={{ fontSize: typography.fontSize.xl, marginBottom: spacing.sm }}>No Rewards Yet</h3>
            <p style={{ color: colors.text.secondary, marginBottom: spacing.lg }}>
              Create your first reward to start assigning to contestants.
            </p>
            <Button icon={Plus} onClick={() => setShowRewardModal(true)}>
              Create Reward
            </Button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
            {rewards.map((reward) => {
              const rewardAssignments = getRewardAssignments(reward.id);
              const rewardCompAssignments = getRewardCompetitionAssignments(reward.id);
              const isExpanded = expandedRewards[reward.id];

              return (
                <div
                  key={reward.id}
                  style={{
                    background: colors.background.card,
                    border: `1px solid ${colors.border.light}`,
                    borderRadius: borderRadius.xl,
                    overflow: 'hidden',
                  }}
                >
                  {/* Reward Header */}
                  <div style={{ padding: spacing.xl }}>
                    <div style={{ display: 'flex', gap: spacing.xl }}>
                      {/* Image */}
                      <div style={{
                        width: '120px',
                        height: '120px',
                        background: reward.image_url
                          ? `url(${reward.image_url}) center/cover`
                          : 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.05))',
                        borderRadius: borderRadius.lg,
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        {!reward.image_url && <Package size={40} style={{ color: colors.gold.primary, opacity: 0.5 }} />}
                      </div>

                      {/* Details */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: spacing.sm }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs }}>
                              <h3 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold }}>
                                {reward.name}
                              </h3>
                              <Badge
                                style={{
                                  background: STATUS_COLORS[reward.status]?.bg,
                                  color: STATUS_COLORS[reward.status]?.color,
                                }}
                                size="sm"
                              >
                                {reward.status}
                              </Badge>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm }}>
                              <p style={{ fontSize: typography.fontSize.sm, color: colors.gold.primary }}>
                                {reward.brand_name}
                              </p>
                              <Badge
                                size="sm"
                                style={{
                                  background: reward.reward_type === 'winners_only'
                                    ? 'rgba(212,175,55,0.15)'
                                    : 'rgba(34,197,94,0.15)',
                                  color: reward.reward_type === 'winners_only'
                                    ? colors.gold.primary
                                    : '#22c55e',
                                }}
                              >
                                {reward.reward_type === 'winners_only' ? 'Winners Only' : 'All Nominees'}
                              </Badge>
                              {reward.is_affiliate && (
                                <Badge
                                  size="sm"
                                  style={{
                                    background: 'rgba(139,92,246,0.15)',
                                    color: '#a78bfa',
                                  }}
                                >
                                  Affiliate
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: spacing.sm }}>
                            <Button
                              variant="secondary"
                              size="sm"
                              icon={Users}
                              onClick={() => { setAssigningReward(reward); setShowAssignModal(true); }}
                            >
                              Assign
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              icon={Edit2}
                              onClick={() => { setEditingReward(reward); setShowRewardModal(true); }}
                            />
                            <Button
                              variant="secondary"
                              size="sm"
                              icon={Trash2}
                              onClick={() => handleDeleteReward(reward.id)}
                              style={{ color: '#ef4444' }}
                            />
                          </div>
                        </div>

                        <p style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary, marginBottom: spacing.md, lineHeight: 1.5 }}>
                          {reward.description || 'No description provided.'}
                        </p>

                        {/* Assigned Competitions */}
                        {rewardCompAssignments.length > 0 && (
                          <div style={{ marginBottom: spacing.md }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm }}>
                              <Crown size={14} style={{ color: colors.gold.primary }} />
                              <span style={{ fontSize: typography.fontSize.xs, color: colors.text.muted }}>
                                Visible in {rewardCompAssignments.length} competition{rewardCompAssignments.length !== 1 ? 's' : ''}:
                              </span>
                            </div>
                            <div style={{ display: 'flex', gap: spacing.xs, flexWrap: 'wrap' }}>
                              {rewardCompAssignments.map(ca => (
                                <Badge
                                  key={ca.id}
                                  size="sm"
                                  style={{
                                    background: 'rgba(139,92,246,0.15)',
                                    color: '#a78bfa',
                                  }}
                                >
                                  {ca.competition?.name || `${ca.competition?.city?.name || 'Unknown'} ${ca.competition?.season}`}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        <div style={{ display: 'flex', gap: spacing.xl, flexWrap: 'wrap' }}>
                          {reward.cash_value && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs }}>
                              <span style={{ fontSize: typography.fontSize.sm, color: colors.text.muted }}>Value:</span>
                              <span style={{ fontSize: typography.fontSize.sm, color: '#22c55e', fontWeight: typography.fontWeight.semibold }}>
                                ${reward.cash_value}
                              </span>
                            </div>
                          )}
                          {reward.commission_rate && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs }}>
                              <span style={{ fontSize: typography.fontSize.sm, color: colors.text.muted }}>Commission:</span>
                              <span style={{ fontSize: typography.fontSize.sm, color: colors.gold.primary, fontWeight: typography.fontWeight.semibold }}>
                                {reward.commission_rate}%
                              </span>
                            </div>
                          )}
                          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs }}>
                            <Clock size={14} style={{ color: colors.text.muted }} />
                            <span style={{ fontSize: typography.fontSize.sm, color: colors.text.muted }}>
                              {reward.claim_deadline_days || 7} days to claim
                            </span>
                          </div>
                          {reward.product_url && (
                            <a
                              href={reward.product_url}
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
                              <ExternalLink size={14} />
                              View Product
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Assignments Section */}
                  {rewardAssignments.length > 0 && (
                    <>
                      <button
                        onClick={() => toggleExpanded(reward.id)}
                        style={{
                          width: '100%',
                          padding: `${spacing.md} ${spacing.xl}`,
                          background: colors.background.secondary,
                          border: 'none',
                          borderTop: `1px solid ${colors.border.light}`,
                          color: colors.text.secondary,
                          fontSize: typography.fontSize.sm,
                          fontWeight: typography.fontWeight.medium,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                          <Users size={16} />
                          {rewardAssignments.length} Assignment{rewardAssignments.length !== 1 ? 's' : ''}
                        </span>
                        {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                      </button>

                      {isExpanded && (
                        <div style={{ borderTop: `1px solid ${colors.border.light}` }}>
                          {rewardAssignments.map((assignment) => (
                            <AssignmentRow
                              key={assignment.id}
                              assignment={assignment}
                              onUpdate={handleUpdateAssignment}
                            />
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}

      {/* All Assignments Tab */}
      {activeTab === 'assignments' && (
        assignments.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: spacing.xxxl,
            background: colors.background.card,
            borderRadius: borderRadius.xl,
            border: `1px solid ${colors.border.light}`,
          }}>
            <Users size={64} style={{ color: colors.text.muted, marginBottom: spacing.lg }} />
            <h3 style={{ fontSize: typography.fontSize.xl, marginBottom: spacing.sm }}>No Assignments Yet</h3>
            <p style={{ color: colors.text.secondary }}>
              Assign rewards to contestants to see them here.
            </p>
          </div>
        ) : (
          <div style={{
            background: colors.background.card,
            border: `1px solid ${colors.border.light}`,
            borderRadius: borderRadius.xl,
            overflow: 'hidden',
          }}>
            {assignments.map((assignment, index) => (
              <AssignmentRow
                key={assignment.id}
                assignment={assignment}
                onUpdate={handleUpdateAssignment}
                showRewardInfo
                isLast={index === assignments.length - 1}
              />
            ))}
          </div>
        )
      )}

      {/* Reward Modal */}
      <RewardModal
        isOpen={showRewardModal}
        onClose={() => { setShowRewardModal(false); setEditingReward(null); }}
        reward={editingReward}
        onSave={handleSaveReward}
      />

      {/* Assign Modal */}
      <AssignRewardModal
        isOpen={showAssignModal}
        onClose={() => { setShowAssignModal(false); setAssigningReward(null); }}
        reward={assigningReward}
        competitions={competitions}
        existingCompetitionAssignments={assigningReward ? getExistingCompetitionIds(assigningReward.id) : []}
        onAssign={handleAssignReward}
      />
    </div>
  );
}

/**
 * AssignmentRow - Displays a single assignment with inline editing
 */
function AssignmentRow({ assignment, onUpdate, showRewardInfo = false, isLast = false }) {
  const [isEditing, setIsEditing] = useState(false);
  const [code, setCode] = useState(assignment.discount_code || '');
  const [link, setLink] = useState(assignment.tracking_link || '');

  const isAffiliate = assignment.reward?.is_affiliate;
  const isNomineeAssignment = !assignment.contestant_id && !!assignment.nominee_id;
  const contestantName = isNomineeAssignment
    ? (assignment.nominee?.name || 'Unknown Nominee')
    : assignment.contestant?.profile
      ? `${assignment.contestant.profile.first_name || ''} ${assignment.contestant.profile.last_name || ''}`.trim()
      : assignment.contestant?.name || 'Unknown';
  const avatarUrl = isNomineeAssignment
    ? assignment.nominee?.avatar_url
    : assignment.contestant?.profile?.avatar_url;
  const email = isNomineeAssignment
    ? assignment.nominee?.email
    : assignment.contestant?.profile?.email;

  const handleSave = () => {
    onUpdate(assignment.id, {
      discount_code: code || null,
      tracking_link: link || null,
    });
    setIsEditing(false);
  };

  const handleStatusChange = (newStatus) => {
    onUpdate(assignment.id, { status: newStatus });
  };

  const statusConfig = ASSIGNMENT_STATUS_COLORS[assignment.status] || ASSIGNMENT_STATUS_COLORS.pending;

  return (
    <div style={{
      padding: spacing.lg,
      borderBottom: isLast ? 'none' : `1px solid ${colors.border.light}`,
      display: 'flex',
      alignItems: 'center',
      gap: spacing.lg,
    }}>
      {/* Contestant Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: borderRadius.full,
            background: avatarUrl
              ? `url(${avatarUrl}) center/cover`
              : 'linear-gradient(135deg, #8b5cf6, #a78bfa)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: typography.fontSize.sm,
            fontWeight: typography.fontWeight.bold,
            color: '#fff',
          }}>
            {!avatarUrl && contestantName.charAt(0)}
          </div>
          <div>
            <p style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium }}>
              {contestantName}
              {isNomineeAssignment && (
                <span style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, marginLeft: spacing.xs }}>(nominee)</span>
              )}
            </p>
            <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted }}>
              {email}
            </p>
          </div>
        </div>
        {showRewardInfo && (
          <p style={{ fontSize: typography.fontSize.xs, color: colors.gold.primary, marginTop: spacing.xs }}>
            {assignment.reward?.name} • {assignment.reward?.brand_name}
          </p>
        )}
        <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, marginTop: spacing.xs }}>
          {assignment.competition?.name || assignment.competition?.city}
        </p>
      </div>

      {/* Shipping Address */}
      <div style={{ width: '160px' }}>
        {assignment.shipping_address ? (
          <div>
            <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, marginBottom: spacing.xs }}>Shipping:</p>
            <p style={{ fontSize: typography.fontSize.xs, color: colors.text.secondary, lineHeight: 1.4 }}>
              {assignment.shipping_address.street}
              {assignment.shipping_address.apt ? `, ${assignment.shipping_address.apt}` : ''}
              <br />
              {assignment.shipping_address.city}, {assignment.shipping_address.state} {assignment.shipping_address.zip}
            </p>
          </div>
        ) : (
          <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, fontStyle: 'italic' }}>
            {assignment.status === 'pending' ? 'Awaiting claim' : 'No address'}
          </p>
        )}
      </div>

      {/* Code & Link (affiliate rewards) */}
      <div style={{ width: '200px' }}>
        {isAffiliate ? (
          isEditing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
              <input
                type="text"
                placeholder="Discount code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                style={{
                  padding: spacing.sm,
                  background: colors.background.secondary,
                  border: `1px solid ${colors.border.light}`,
                  borderRadius: borderRadius.sm,
                  color: colors.text.primary,
                  fontSize: typography.fontSize.xs,
                }}
              />
              <input
                type="text"
                placeholder="Tracking link"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                style={{
                  padding: spacing.sm,
                  background: colors.background.secondary,
                  border: `1px solid ${colors.border.light}`,
                  borderRadius: borderRadius.sm,
                  color: colors.text.primary,
                  fontSize: typography.fontSize.xs,
                }}
              />
              <div style={{ display: 'flex', gap: spacing.xs }}>
                <button
                  onClick={handleSave}
                  style={{
                    flex: 1,
                    padding: spacing.xs,
                    background: colors.gold.primary,
                    border: 'none',
                    borderRadius: borderRadius.sm,
                    color: '#000',
                    fontSize: typography.fontSize.xs,
                    cursor: 'pointer',
                  }}
                >
                  Save
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  style={{
                    padding: spacing.xs,
                    background: 'transparent',
                    border: `1px solid ${colors.border.light}`,
                    borderRadius: borderRadius.sm,
                    color: colors.text.secondary,
                    fontSize: typography.fontSize.xs,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div>
              {assignment.discount_code ? (
                <p style={{ fontSize: typography.fontSize.xs, marginBottom: spacing.xs }}>
                  <span style={{ color: colors.text.muted }}>Code: </span>
                  <span style={{ color: colors.text.primary, fontFamily: 'monospace' }}>{assignment.discount_code}</span>
                </p>
              ) : null}
              {assignment.tracking_link ? (
                <a
                  href={assignment.tracking_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing.xs,
                    fontSize: typography.fontSize.xs,
                    color: colors.gold.primary,
                    textDecoration: 'none',
                  }}
                >
                  <Link2 size={12} />
                  Tracking Link
                </a>
              ) : null}
              {!assignment.discount_code && !assignment.tracking_link && (
                <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, fontStyle: 'italic' }}>
                  No code/link yet
                </p>
              )}
              <button
                onClick={() => setIsEditing(true)}
                style={{
                  marginTop: spacing.xs,
                  padding: `${spacing.xs} ${spacing.sm}`,
                  background: 'transparent',
                  border: `1px solid ${colors.border.light}`,
                  borderRadius: borderRadius.sm,
                  color: colors.text.secondary,
                  fontSize: typography.fontSize.xs,
                  cursor: 'pointer',
                }}
              >
                Edit
              </button>
            </div>
          )
        ) : (
          <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, fontStyle: 'italic' }}>
            Non-affiliate
          </p>
        )}
      </div>

      {/* Status */}
      <div style={{ width: '120px' }}>
        <select
          value={assignment.status}
          onChange={(e) => handleStatusChange(e.target.value)}
          style={{
            width: '100%',
            padding: spacing.sm,
            background: statusConfig.bg,
            border: `1px solid ${statusConfig.color}40`,
            borderRadius: borderRadius.md,
            color: statusConfig.color,
            fontSize: typography.fontSize.xs,
            fontWeight: typography.fontWeight.medium,
            cursor: 'pointer',
          }}
        >
          <option value="pending">Pending</option>
          <option value="claimed">Claimed</option>
          <option value="shipped">Shipped</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      {/* Compliance */}
      <div style={{ width: '80px', textAlign: 'center' }}>
        <button
          onClick={() => onUpdate(assignment.id, { content_posted: !assignment.content_posted })}
          style={{
            padding: spacing.sm,
            background: assignment.content_posted ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.1)',
            border: 'none',
            borderRadius: borderRadius.md,
            color: assignment.content_posted ? '#22c55e' : '#ef4444',
            fontSize: typography.fontSize.xs,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing.xs,
          }}
        >
          {assignment.content_posted ? <Check size={14} /> : <X size={14} />}
          Posted
        </button>
      </div>
    </div>
  );
}
