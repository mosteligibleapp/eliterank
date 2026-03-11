import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Gift, Plus, Edit2, Trash2, Users, ExternalLink, Clock, Check, X,
  Package, Crown, DollarSign
} from 'lucide-react';
import { colors, spacing, borderRadius, typography } from '@shared/styles/theme';
import { supabase } from '@shared/lib/supabase';
import RewardModal from '@shared/components/modals/RewardModal';
import AssignRewardModal from '@shared/components/modals/AssignRewardModal';
import FilterBar from '../../../components/FilterBar';
import DataTable from '../../../components/DataTable';
import StatRow from '../../../components/StatRow';
import ActionMenu from '../../../components/ActionMenu';

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

const TAB_OPTIONS = [
  { value: 'rewards', label: 'Rewards' },
  { value: 'assignments', label: 'Assignments' },
  { value: 'competition_assignments', label: 'Competition Assignments' },
];

function StatusBadge({ status, configMap }) {
  const cfg = configMap[status] || { bg: 'rgba(107,114,128,0.15)', color: '#6b7280', label: status };
  return (
    <span style={{
      display: 'inline-block',
      padding: `2px ${spacing.sm}`,
      borderRadius: borderRadius.sm,
      background: cfg.bg,
      color: cfg.color,
      fontSize: typography.fontSize.xs,
      fontWeight: typography.fontWeight.medium,
      textTransform: 'capitalize',
      whiteSpace: 'nowrap',
    }}>
      {cfg.label || status}
    </span>
  );
}

export default function RewardsManager() {
  const [activeTab, setActiveTab] = useState('rewards');
  const [searchQuery, setSearchQuery] = useState('');
  const [rewards, setRewards] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [competitionAssignments, setCompetitionAssignments] = useState([]);
  const [competitions, setCompetitions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [editingReward, setEditingReward] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigningReward, setAssigningReward] = useState(null);

  // --- Data fetching ---
  const fetchRewards = useCallback(async () => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('rewards').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setRewards(data || []);
    } catch (err) { console.error('Error fetching rewards:', err); }
  }, []);

  const fetchAssignments = useCallback(async () => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('reward_assignments')
        .select(`
          *,
          reward:rewards(id, name, brand_name, image_url, is_affiliate),
          competition:competitions(id, name, season),
          contestant:contestants(id, name, user_id, profile:profiles(first_name, last_name, email, avatar_url)),
          nominee:nominees(id, name, email, avatar_url)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setAssignments(data || []);
    } catch (err) { console.error('Error fetching assignments:', err); }
  }, []);

  const fetchCompetitions = useCallback(async () => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('competitions')
        .select('id, name, season, status, city_id, city:cities(id, name, state)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setCompetitions((data || []).map(comp => ({
        ...comp,
        cityName: comp.city?.name || 'Unknown City',
        cityState: comp.city?.state || '',
      })));
    } catch (err) { console.error('Error fetching competitions:', err); }
  }, []);

  const fetchCompetitionAssignments = useCallback(async () => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('reward_competition_assignments')
        .select(`
          *,
          competition:competitions(id, name, season, status, city:cities(name, state))
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setCompetitionAssignments(data || []);
    } catch (err) { console.error('Error fetching competition assignments:', err); }
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchRewards(), fetchAssignments(), fetchCompetitions(), fetchCompetitionAssignments()]);
      setLoading(false);
    };
    load();
  }, [fetchRewards, fetchAssignments, fetchCompetitions, fetchCompetitionAssignments]);

  // --- Reward CRUD ---
  const handleSaveReward = async (rewardData) => {
    if (!supabase) return;
    try {
      const payload = {
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
      };

      if (editingReward) {
        const { error } = await supabase.from('rewards').update(payload).eq('id', editingReward.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('rewards').insert(payload);
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

  const handleDeleteReward = async (rewardId) => {
    if (!confirm('Are you sure you want to delete this reward? This will also delete all assignments.')) return;
    if (!supabase) return;
    try {
      const { error } = await supabase.from('rewards').delete().eq('id', rewardId);
      if (error) throw error;
      await fetchRewards();
      await fetchAssignments();
    } catch (err) {
      console.error('Error deleting reward:', err);
      alert('Failed to delete reward: ' + err.message);
    }
  };

  // --- Assignment CRUD ---
  const handleAssignReward = async (assignmentData) => {
    if (!supabase) return;
    try {
      if (assignmentData.removedCompetitionIds?.length > 0) {
        const { error } = await supabase
          .from('reward_competition_assignments').delete()
          .eq('reward_id', assigningReward.id)
          .in('competition_id', assignmentData.removedCompetitionIds);
        if (error) throw error;
      }
      if (assignmentData.competitionIds?.length > 0) {
        const rows = assignmentData.competitionIds.map(cid => ({ reward_id: assigningReward.id, competition_id: cid }));
        const { error } = await supabase
          .from('reward_competition_assignments').upsert(rows, { onConflict: 'reward_id,competition_id' });
        if (error) throw error;
      }
      if (assignmentData.removedContestantIds?.length > 0) {
        const { error } = await supabase
          .from('reward_assignments').delete()
          .eq('reward_id', assigningReward.id)
          .in('contestant_id', assignmentData.removedContestantIds);
        if (error) throw error;
      }
      if (assignmentData.removedNomineeIds?.length > 0) {
        const { error } = await supabase
          .from('reward_assignments').delete()
          .eq('reward_id', assigningReward.id)
          .in('nominee_id', assignmentData.removedNomineeIds);
        if (error) throw error;
      }
      if (assignmentData.contestantIds?.length > 0) {
        const { data: cData } = await supabase
          .from('contestants').select('id, competition_id').in('id', assignmentData.contestantIds);
        const map = {};
        (cData || []).forEach(c => { map[c.id] = c.competition_id; });
        const rows = assignmentData.contestantIds.map(cid => ({
          reward_id: assigningReward.id, competition_id: map[cid],
          contestant_id: cid, discount_code: null, tracking_link: null, status: 'pending',
        }));
        const { error } = await supabase
          .from('reward_assignments').upsert(rows, { onConflict: 'reward_id,contestant_id' });
        if (error) throw error;
      }
      if (assignmentData.nomineeIds?.length > 0) {
        const { data: nData } = await supabase
          .from('nominees').select('id, competition_id').in('id', assignmentData.nomineeIds);
        const map = {};
        (nData || []).forEach(n => { map[n.id] = n.competition_id; });
        const rows = assignmentData.nomineeIds.map(nid => ({
          reward_id: assigningReward.id, competition_id: map[nid],
          nominee_id: nid, discount_code: null, tracking_link: null, status: 'pending',
        }));
        const { error } = await supabase
          .from('reward_assignments').upsert(rows, { onConflict: 'reward_id,nominee_id' });
        if (error) throw error;
      }
      await Promise.all([fetchAssignments(), fetchCompetitionAssignments()]);
      setShowAssignModal(false);
      setAssigningReward(null);
    } catch (err) {
      console.error('Error assigning reward:', err);
      alert('Failed to assign reward: ' + err.message);
    }
  };

  const handleUpdateAssignment = async (assignmentId, updates) => {
    if (!supabase) return;
    try {
      const { error } = await supabase.from('reward_assignments').update(updates).eq('id', assignmentId);
      if (error) throw error;
      await fetchAssignments();
    } catch (err) {
      console.error('Error updating assignment:', err);
      alert('Failed to update assignment: ' + err.message);
    }
  };

  // --- Helpers ---
  const getRewardAssignments = (rewardId) => assignments.filter(a => a.reward_id === rewardId);

  const getExistingCompetitionIds = (rewardId) =>
    competitionAssignments.filter(a => a.reward_id === rewardId).map(a => a.competition_id);

  const getRecipientName = (a) => {
    if (!a.contestant_id && a.nominee_id) return a.nominee?.name || 'Unknown Nominee';
    if (a.contestant?.profile) return `${a.contestant.profile.first_name || ''} ${a.contestant.profile.last_name || ''}`.trim();
    return a.contestant?.name || 'Unknown';
  };

  // --- Stats ---
  const stats = useMemo(() => {
    const totalValue = rewards.reduce((sum, r) => sum + (parseFloat(r.cash_value) || 0), 0);
    return [
      { label: 'Total Rewards', value: rewards.length, icon: Gift, color: colors.gold.primary },
      { label: 'Active Assignments', value: assignments.filter(a => a.status === 'active' || a.status === 'claimed').length, icon: Users, color: '#3b82f6' },
      { label: 'Pending Claims', value: assignments.filter(a => a.status === 'pending').length, icon: Clock, color: '#eab308' },
      { label: 'Total Value', value: totalValue > 0 ? `$${totalValue.toLocaleString()}` : '$0', icon: DollarSign, color: '#22c55e' },
    ];
  }, [rewards, assignments]);

  // --- Search filter ---
  const q = searchQuery.toLowerCase();

  const filteredRewards = useMemo(() =>
    rewards.filter(r => !q || r.name?.toLowerCase().includes(q) || r.brand_name?.toLowerCase().includes(q)),
    [rewards, q]
  );

  const filteredAssignments = useMemo(() =>
    assignments.filter(a => {
      if (!q) return true;
      const name = getRecipientName(a).toLowerCase();
      const rewardName = (a.reward?.name || '').toLowerCase();
      return name.includes(q) || rewardName.includes(q);
    }),
    [assignments, q]
  );

  const filteredCompAssignments = useMemo(() =>
    competitionAssignments.filter(ca => {
      if (!q) return true;
      const compName = (ca.competition?.name || '').toLowerCase();
      return compName.includes(q);
    }),
    [competitionAssignments, q]
  );

  // --- Table columns ---
  const rewardColumns = [
    {
      key: 'name', label: 'Reward Name', sortable: true,
      render: (val, row) => (
        <span style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
          <span style={{
            width: '28px', height: '28px', borderRadius: borderRadius.sm, flexShrink: 0,
            background: row.image_url ? `url(${row.image_url}) center/cover` : 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.05))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {!row.image_url && <Package size={14} style={{ color: colors.gold.primary, opacity: 0.5 }} />}
          </span>
          <span style={{ fontWeight: typography.fontWeight.medium }}>{val}</span>
        </span>
      ),
    },
    {
      key: 'reward_type', label: 'Type', sortable: true,
      render: (val) => (
        <span style={{
          padding: `2px ${spacing.sm}`, borderRadius: borderRadius.sm, fontSize: typography.fontSize.xs,
          background: val === 'winners_only' ? 'rgba(212,175,55,0.15)' : 'rgba(34,197,94,0.15)',
          color: val === 'winners_only' ? colors.gold.primary : '#22c55e',
        }}>
          {val === 'winners_only' ? 'Winners Only' : 'All Nominees'}
        </span>
      ),
    },
    {
      key: 'cash_value', label: 'Value', sortable: true,
      render: (val) => val ? (
        <span style={{ color: '#22c55e', fontWeight: typography.fontWeight.semibold }}>${val}</span>
      ) : <span style={{ color: colors.text.tertiary }}>--</span>,
    },
    {
      key: 'status', label: 'Status', sortable: true,
      render: (val) => <StatusBadge status={val} configMap={STATUS_COLORS} />,
    },
    {
      key: 'created_at', label: 'Created', sortable: true,
      render: (val) => (
        <span style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary }}>
          {new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
      ),
    },
  ];

  const assignmentColumns = [
    {
      key: 'reward_name', label: 'Reward', sortable: true,
      render: (_, row) => (
        <span style={{ fontSize: typography.fontSize.sm }}>
          {row.reward?.name || 'Unknown'}
          <span style={{ color: colors.text.tertiary, marginLeft: spacing.xs, fontSize: typography.fontSize.xs }}>
            {row.reward?.brand_name}
          </span>
        </span>
      ),
    },
    {
      key: 'recipient', label: 'Recipient', sortable: false,
      render: (_, row) => {
        const isNominee = !row.contestant_id && !!row.nominee_id;
        return (
          <span style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
            <span style={{ fontWeight: typography.fontWeight.medium }}>{getRecipientName(row)}</span>
            {isNominee && (
              <span style={{
                fontSize: typography.fontSize.xs, padding: `1px ${spacing.xs}`,
                background: 'rgba(139,92,246,0.15)', color: '#a78bfa', borderRadius: borderRadius.xs,
              }}>nominee</span>
            )}
          </span>
        );
      },
    },
    {
      key: 'competition_name', label: 'Competition', sortable: false,
      render: (_, row) => (
        <span style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary }}>
          {row.competition?.name || '--'}
        </span>
      ),
    },
    {
      key: 'status', label: 'Status', sortable: true,
      render: (val) => <StatusBadge status={val} configMap={ASSIGNMENT_STATUS_COLORS} />,
    },
    {
      key: 'created_at', label: 'Assigned', sortable: true,
      render: (val) => (
        <span style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary }}>
          {new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
      ),
    },
  ];

  const compAssignmentColumns = [
    {
      key: 'competition_name', label: 'Competition', sortable: false,
      render: (_, row) => (
        <span style={{ fontWeight: typography.fontWeight.medium }}>
          {row.competition?.name || `${row.competition?.city?.name || 'Unknown'} ${row.competition?.season}`}
        </span>
      ),
    },
    {
      key: 'reward_id', label: 'Reward', sortable: false,
      render: (val) => {
        const r = rewards.find(rw => rw.id === val);
        return r ? r.name : val;
      },
    },
    {
      key: 'competition_status', label: 'Status', sortable: false,
      render: (_, row) => (
        <span style={{
          padding: `2px ${spacing.sm}`, borderRadius: borderRadius.sm, fontSize: typography.fontSize.xs,
          background: 'rgba(34,197,94,0.15)', color: '#22c55e', textTransform: 'capitalize',
        }}>
          {row.competition?.status || 'unknown'}
        </span>
      ),
    },
    {
      key: 'created_at', label: 'Assigned', sortable: true,
      render: (val) => (
        <span style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary }}>
          {new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
      ),
    },
  ];

  // --- Expanded row renderers ---
  const renderExpandedReward = (row) => {
    const rowAssignments = getRewardAssignments(row.id);
    const rowCompAssignments = competitionAssignments.filter(a => a.reward_id === row.id);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
        {row.description && (
          <p style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary, lineHeight: 1.5, margin: 0 }}>
            {row.description}
          </p>
        )}
        <div style={{ display: 'flex', gap: spacing.xl, flexWrap: 'wrap', fontSize: typography.fontSize.xs }}>
          {row.brand_name && (
            <span style={{ color: colors.gold.primary }}>{row.brand_name}</span>
          )}
          {row.is_affiliate && (
            <span style={{ padding: `1px ${spacing.xs}`, background: 'rgba(139,92,246,0.15)', color: '#a78bfa', borderRadius: borderRadius.xs }}>
              Affiliate
            </span>
          )}
          {row.commission_rate && <span style={{ color: colors.text.tertiary }}>Commission: {row.commission_rate}%</span>}
          <span style={{ color: colors.text.tertiary }}>{row.claim_deadline_days || 7} days to claim</span>
          {row.product_url && (
            <a href={row.product_url} target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: '4px', color: colors.gold.primary, textDecoration: 'none' }}>
              <ExternalLink size={12} /> View Product
            </a>
          )}
        </div>
        {rowCompAssignments.length > 0 && (
          <div style={{ display: 'flex', gap: spacing.xs, flexWrap: 'wrap', alignItems: 'center' }}>
            <Crown size={12} style={{ color: colors.gold.primary }} />
            <span style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary, marginRight: spacing.xs }}>
              Visible in:
            </span>
            {rowCompAssignments.map(ca => (
              <span key={ca.id} style={{
                padding: `1px ${spacing.sm}`, fontSize: typography.fontSize.xs,
                background: 'rgba(139,92,246,0.15)', color: '#a78bfa', borderRadius: borderRadius.xs,
              }}>
                {ca.competition?.name || `${ca.competition?.city?.name || 'Unknown'} ${ca.competition?.season}`}
              </span>
            ))}
          </div>
        )}
        {rowAssignments.length > 0 && (
          <div>
            <p style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary, marginBottom: spacing.sm }}>
              {rowAssignments.length} assignment{rowAssignments.length !== 1 ? 's' : ''}:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
              {rowAssignments.map(a => (
                <AssignmentInlineRow key={a.id} assignment={a} onUpdate={handleUpdateAssignment} />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderExpandedAssignment = (row) => {
    const isNominee = !row.contestant_id && !!row.nominee_id;
    const email = isNominee ? row.nominee?.email : row.contestant?.profile?.email;
    const isAffiliate = row.reward?.is_affiliate;

    return (
      <div style={{ display: 'flex', gap: spacing.xl, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs, fontSize: typography.fontSize.xs }}>
          {email && <span style={{ color: colors.text.secondary }}>Email: {email}</span>}
          {row.shipping_address?.street && (
            <span style={{ color: colors.text.secondary }}>
              Ship to: {row.shipping_address.street}{row.shipping_address.apt ? `, ${row.shipping_address.apt}` : ''}, {row.shipping_address.city}, {row.shipping_address.state} {row.shipping_address.zip}
            </span>
          )}
          {isAffiliate && (
            <span style={{ color: colors.text.secondary }}>
              Code: {row.discount_code || 'none'} | Link: {row.tracking_link ? 'set' : 'none'}
            </span>
          )}
          <span style={{ color: colors.text.tertiary }}>
            Content posted: {row.content_posted ? 'Yes' : 'No'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: spacing.sm, alignItems: 'flex-start' }}>
          <select
            value={row.status}
            onChange={(e) => handleUpdateAssignment(row.id, { status: e.target.value })}
            style={{
              padding: `${spacing.xs} ${spacing.sm}`,
              background: (ASSIGNMENT_STATUS_COLORS[row.status] || ASSIGNMENT_STATUS_COLORS.pending).bg,
              border: `1px solid ${(ASSIGNMENT_STATUS_COLORS[row.status] || ASSIGNMENT_STATUS_COLORS.pending).color}40`,
              borderRadius: borderRadius.sm, color: (ASSIGNMENT_STATUS_COLORS[row.status] || ASSIGNMENT_STATUS_COLORS.pending).color,
              fontSize: typography.fontSize.xs, cursor: 'pointer',
            }}
          >
            <option value="pending">Pending</option>
            <option value="claimed">Claimed</option>
            <option value="shipped">Shipped</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="expired">Expired</option>
          </select>
          <button
            onClick={() => handleUpdateAssignment(row.id, { content_posted: !row.content_posted })}
            style={{
              padding: `${spacing.xs} ${spacing.sm}`, border: 'none', borderRadius: borderRadius.sm, cursor: 'pointer',
              fontSize: typography.fontSize.xs,
              background: row.content_posted ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.1)',
              color: row.content_posted ? '#22c55e' : '#ef4444',
              display: 'flex', alignItems: 'center', gap: '4px',
            }}
          >
            {row.content_posted ? <Check size={12} /> : <X size={12} />} Posted
          </button>
        </div>
      </div>
    );
  };

  // --- Action button style ---
  const actionBtnStyle = {
    display: 'flex', alignItems: 'center', gap: spacing.xs,
    height: '32px', padding: `0 ${spacing.md}`,
    background: colors.gold.primary, border: 'none', borderRadius: borderRadius.md,
    color: colors.text.inverse, fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium, cursor: 'pointer', whiteSpace: 'nowrap',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
      <StatRow stats={stats} />

      <FilterBar
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search rewards, recipients..."
        filters={[{
          key: 'tab', label: 'View',
          options: TAB_OPTIONS,
          value: activeTab,
        }]}
        onFilterChange={(key, value) => { if (key === 'tab') setActiveTab(value || 'rewards'); }}
        actions={
          <div style={{ display: 'flex', gap: spacing.sm }}>
            <button style={actionBtnStyle} onClick={() => { setEditingReward(null); setShowRewardModal(true); }}>
              <Plus size={14} /> Create Reward
            </button>
            <button
              style={{ ...actionBtnStyle, background: 'transparent', border: `1px solid ${colors.border.primary}`, color: colors.text.secondary }}
              onClick={() => {
                if (rewards.length === 0) { alert('Create a reward first'); return; }
                setAssigningReward(rewards[0]);
                setShowAssignModal(true);
              }}
            >
              <Users size={14} /> Assign Reward
            </button>
          </div>
        }
      />

      {activeTab === 'rewards' && (
        <DataTable
          columns={rewardColumns}
          data={filteredRewards}
          loading={loading}
          emptyMessage="No rewards yet. Create your first reward to get started."
          expandable
          renderExpanded={renderExpandedReward}
          actions={(row) => (
            <ActionMenu actions={[
              { label: 'Edit', icon: Edit2, onClick: () => { setEditingReward(row); setShowRewardModal(true); } },
              { label: 'Assign', icon: Users, onClick: () => { setAssigningReward(row); setShowAssignModal(true); } },
              { label: 'Delete', icon: Trash2, variant: 'danger', onClick: () => handleDeleteReward(row.id) },
            ]} />
          )}
        />
      )}

      {activeTab === 'assignments' && (
        <DataTable
          columns={assignmentColumns}
          data={filteredAssignments}
          loading={loading}
          emptyMessage="No assignments yet. Assign rewards to contestants to see them here."
          expandable
          renderExpanded={renderExpandedAssignment}
          actions={(row) => (
            <ActionMenu actions={[
              {
                label: 'Update Status',
                icon: Package,
                onClick: () => {
                  const next = { pending: 'claimed', claimed: 'shipped', shipped: 'active', active: 'completed', completed: 'completed', expired: 'expired' };
                  handleUpdateAssignment(row.id, { status: next[row.status] || 'completed' });
                },
              },
            ]} />
          )}
        />
      )}

      {activeTab === 'competition_assignments' && (
        <DataTable
          columns={compAssignmentColumns}
          data={filteredCompAssignments}
          loading={loading}
          emptyMessage="No competition assignments yet."
        />
      )}

      <RewardModal
        isOpen={showRewardModal}
        onClose={() => { setShowRewardModal(false); setEditingReward(null); }}
        reward={editingReward}
        onSave={handleSaveReward}
      />

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

/** Compact inline assignment row for the expanded reward view */
function AssignmentInlineRow({ assignment, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false);
  const [code, setCode] = useState(assignment.discount_code || '');
  const [link, setLink] = useState(assignment.tracking_link || '');

  const isNominee = !assignment.contestant_id && !!assignment.nominee_id;
  const name = isNominee
    ? (assignment.nominee?.name || 'Unknown Nominee')
    : assignment.contestant?.profile
      ? `${assignment.contestant.profile.first_name || ''} ${assignment.contestant.profile.last_name || ''}`.trim()
      : assignment.contestant?.name || 'Unknown';
  const statusCfg = ASSIGNMENT_STATUS_COLORS[assignment.status] || ASSIGNMENT_STATUS_COLORS.pending;

  const handleSave = () => {
    onUpdate(assignment.id, { discount_code: code || null, tracking_link: link || null });
    setIsEditing(false);
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: spacing.md, padding: `${spacing.xs} ${spacing.sm}`,
      background: colors.background.tertiary, borderRadius: borderRadius.sm, fontSize: typography.fontSize.xs,
    }}>
      <span style={{ fontWeight: typography.fontWeight.medium, minWidth: '120px' }}>
        {name}
        {isNominee && <span style={{ color: colors.text.tertiary, marginLeft: spacing.xs }}>(nominee)</span>}
      </span>
      <StatusBadge status={assignment.status} configMap={ASSIGNMENT_STATUS_COLORS} />
      {assignment.reward?.is_affiliate && !isEditing && (
        <span style={{ color: colors.text.tertiary }}>
          {assignment.discount_code ? `Code: ${assignment.discount_code}` : 'No code'}
        </span>
      )}
      {assignment.reward?.is_affiliate && isEditing && (
        <div style={{ display: 'flex', gap: spacing.xs, alignItems: 'center' }}>
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Code"
            style={{ padding: '2px 6px', background: colors.background.card, border: `1px solid ${colors.border.primary}`, borderRadius: borderRadius.xs, color: colors.text.primary, fontSize: typography.fontSize.xs, width: '80px' }} />
          <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="Link"
            style={{ padding: '2px 6px', background: colors.background.card, border: `1px solid ${colors.border.primary}`, borderRadius: borderRadius.xs, color: colors.text.primary, fontSize: typography.fontSize.xs, width: '100px' }} />
          <button onClick={handleSave} style={{ padding: '2px 8px', background: colors.gold.primary, border: 'none', borderRadius: borderRadius.xs, color: '#000', fontSize: typography.fontSize.xs, cursor: 'pointer' }}>Save</button>
          <button onClick={() => setIsEditing(false)} style={{ padding: '2px 8px', background: 'transparent', border: `1px solid ${colors.border.primary}`, borderRadius: borderRadius.xs, color: colors.text.secondary, fontSize: typography.fontSize.xs, cursor: 'pointer' }}>X</button>
        </div>
      )}
      {assignment.reward?.is_affiliate && !isEditing && (
        <button onClick={() => setIsEditing(true)} style={{ padding: '2px 6px', background: 'transparent', border: `1px solid ${colors.border.secondary}`, borderRadius: borderRadius.xs, color: colors.text.tertiary, fontSize: typography.fontSize.xs, cursor: 'pointer' }}>
          Edit
        </button>
      )}
      <select
        value={assignment.status}
        onChange={(e) => onUpdate(assignment.id, { status: e.target.value })}
        style={{ marginLeft: 'auto', padding: '2px 4px', background: statusCfg.bg, border: `1px solid ${statusCfg.color}40`, borderRadius: borderRadius.xs, color: statusCfg.color, fontSize: typography.fontSize.xs, cursor: 'pointer' }}
      >
        <option value="pending">Pending</option>
        <option value="claimed">Claimed</option>
        <option value="shipped">Shipped</option>
        <option value="active">Active</option>
        <option value="completed">Completed</option>
        <option value="expired">Expired</option>
      </select>
      <button
        onClick={() => onUpdate(assignment.id, { content_posted: !assignment.content_posted })}
        style={{
          padding: '2px 6px', border: 'none', borderRadius: borderRadius.xs, cursor: 'pointer',
          background: assignment.content_posted ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.1)',
          color: assignment.content_posted ? '#22c55e' : '#ef4444', fontSize: typography.fontSize.xs,
          display: 'flex', alignItems: 'center', gap: '2px',
        }}
      >
        {assignment.content_posted ? <Check size={10} /> : <X size={10} />} Posted
      </button>
    </div>
  );
}
