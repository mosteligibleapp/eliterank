import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Package, Clock, Check, MapPin, Mail, User, History, Loader
} from 'lucide-react';
import { colors, spacing, borderRadius, typography } from '@shared/styles/theme';
import { supabase } from '@shared/lib/supabase';
import FilterBar from '../../../components/FilterBar';
import DataTable from '../../../components/DataTable';
import StatRow from '../../../components/StatRow';
import ActionMenu from '../../../components/ActionMenu';

const ASSIGNMENT_STATUS_COLORS = {
  pending: { bg: 'rgba(234,179,8,0.15)', color: '#eab308', label: 'Pending' },
  claimed: { bg: 'rgba(59,130,246,0.15)', color: '#3b82f6', label: 'Claimed' },
  shipped: { bg: 'rgba(139,92,246,0.15)', color: '#8b5cf6', label: 'Shipped' },
  active: { bg: 'rgba(34,197,94,0.15)', color: '#22c55e', label: 'Active' },
  completed: { bg: 'rgba(107,114,128,0.15)', color: '#6b7280', label: 'Completed' },
  expired: { bg: 'rgba(239,68,68,0.15)', color: '#ef4444', label: 'Expired' },
};

function StatusBadge({ status }) {
  const cfg = ASSIGNMENT_STATUS_COLORS[status] || ASSIGNMENT_STATUS_COLORS.pending;
  return (
    <span style={{
      display: 'inline-block', padding: `2px ${spacing.sm}`, borderRadius: borderRadius.sm,
      background: cfg.bg, color: cfg.color, fontSize: typography.fontSize.xs,
      fontWeight: typography.fontWeight.medium, textTransform: 'capitalize',
    }}>
      {cfg.label}
    </span>
  );
}

export default function PrizeRedemptionTracker() {
  const [assignments, setAssignments] = useState([]);
  const [competitions, setCompetitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [statusFilter, setStatusFilter] = useState('');
  const [competitionFilter, setCompetitionFilter] = useState('');

  const [historyCache, setHistoryCache] = useState({});
  const [loadingHistory, setLoadingHistory] = useState({});

  const fetchAssignments = useCallback(async () => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('reward_assignments')
        .select(`
          *,
          reward:rewards(id, name, brand_name, image_url, is_affiliate, cash_value),
          competition:competitions(id, name, season),
          contestant:contestants(id, name, user_id, profile:profiles(first_name, last_name, email, avatar_url)),
          nominee:nominees(id, name, email, avatar_url)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setAssignments(data || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching assignments:', err);
      setError(err.message);
    }
  }, []);

  const fetchCompetitions = useCallback(async () => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('competitions')
        .select('id, name, season, city:cities(name, state)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setCompetitions(data || []);
    } catch (err) {
      console.error('Error fetching competitions:', err);
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchAssignments(), fetchCompetitions()]);
      setLoading(false);
    };
    load();
  }, [fetchAssignments, fetchCompetitions]);

  const fetchHistory = useCallback(async (assignmentId) => {
    if (historyCache[assignmentId] || loadingHistory[assignmentId]) return;
    if (!supabase) return;
    setLoadingHistory(prev => ({ ...prev, [assignmentId]: true }));
    try {
      const { data, error } = await supabase
        .from('reward_assignment_history')
        .select('*')
        .eq('assignment_id', assignmentId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setHistoryCache(prev => ({ ...prev, [assignmentId]: data || [] }));
    } catch (err) {
      console.error('Error fetching history:', err);
      setHistoryCache(prev => ({ ...prev, [assignmentId]: [] }));
    } finally {
      setLoadingHistory(prev => ({ ...prev, [assignmentId]: false }));
    }
  }, [historyCache, loadingHistory]);

  const handleStatusChange = async (assignmentId, newStatus) => {
    if (!supabase) return;
    try {
      const { error } = await supabase
        .from('reward_assignments').update({ status: newStatus }).eq('id', assignmentId);
      if (error) throw error;
      setHistoryCache(prev => { const next = { ...prev }; delete next[assignmentId]; return next; });
      await fetchAssignments();
    } catch (err) {
      console.error('Error updating status:', err);
      alert('Failed to update status: ' + err.message);
    }
  };

  // Helpers
  const getRecipientName = (a) => {
    if (!a.contestant_id && a.nominee_id) return a.nominee?.name || 'Unknown Nominee';
    if (a.contestant?.profile) return `${a.contestant.profile.first_name || ''} ${a.contestant.profile.last_name || ''}`.trim();
    return a.contestant?.name || 'Unknown';
  };

  const getRecipientEmail = (a) => {
    if (!a.contestant_id && a.nominee_id) return a.nominee?.email;
    return a.contestant?.profile?.email;
  };

  // Stats
  const stats = useMemo(() => [
    { label: 'Total Redemptions', value: assignments.length, icon: Package, color: colors.gold.primary },
    { label: 'Pending', value: assignments.filter(a => a.status === 'pending').length, icon: Clock, color: '#eab308' },
    { label: 'Shipped', value: assignments.filter(a => a.status === 'shipped').length, icon: Package, color: '#8b5cf6' },
    { label: 'Completed', value: assignments.filter(a => a.status === 'completed' || a.status === 'active').length, icon: Check, color: '#22c55e' },
  ], [assignments]);

  // Filtered data
  const filtered = useMemo(() =>
    assignments.filter(a => {
      if (statusFilter && a.status !== statusFilter) return false;
      if (competitionFilter && a.competition_id !== competitionFilter) return false;
      return true;
    }),
    [assignments, statusFilter, competitionFilter]
  );

  // Filters config
  const statusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'claimed', label: 'Claimed' },
    { value: 'shipped', label: 'Shipped' },
    { value: 'active', label: 'Active' },
    { value: 'completed', label: 'Completed' },
    { value: 'expired', label: 'Expired' },
  ];

  const competitionOptions = competitions.map(c => ({
    value: c.id,
    label: c.name || `${c.city?.name || 'Unknown'} ${c.season}`,
  }));

  // Table columns
  const columns = [
    {
      key: 'reward_name', label: 'Prize', sortable: false,
      render: (_, row) => (
        <span style={{ fontWeight: typography.fontWeight.medium }}>
          {row.reward?.name || 'Unknown'}
          <span style={{ color: colors.text.tertiary, fontSize: typography.fontSize.xs, marginLeft: spacing.xs }}>
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
      render: (val) => <StatusBadge status={val} />,
    },
    {
      key: 'created_at', label: 'Requested', sortable: true,
      render: (val) => (
        <span style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary }}>
          {new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
      ),
    },
  ];

  // Expanded row
  const renderExpanded = (row) => {
    const email = getRecipientEmail(row);
    const addr = row.shipping_address;
    const hasAddress = addr && addr.street;
    const claimedDate = row.claimed_at
      ? new Date(row.claimed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : null;
    const expiresDate = row.expires_at
      ? new Date(row.expires_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : null;
    const history = historyCache[row.id];
    const isLoadingHist = loadingHistory[row.id];

    // Trigger history fetch on expand
    if (!history && !isLoadingHist) {
      fetchHistory(row.id);
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
        {/* Details grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: spacing.lg }}>
          {/* Shipping */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.sm }}>
              <MapPin size={14} style={{ color: colors.gold.primary }} />
              <span style={{ fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold, color: colors.text.primary }}>
                Shipping Address
              </span>
            </div>
            {hasAddress ? (
              <div style={{ background: colors.background.card, borderRadius: borderRadius.sm, padding: spacing.sm, border: `1px solid ${colors.border.secondary}` }}>
                <p style={{ fontSize: typography.fontSize.xs, color: colors.text.primary, lineHeight: 1.6, margin: 0 }}>
                  {addr.street}{addr.apt ? `, ${addr.apt}` : ''}<br />
                  {addr.city}, {addr.state} {addr.zip}
                </p>
              </div>
            ) : (
              <p style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary, fontStyle: 'italic', margin: 0 }}>
                {row.status === 'pending' ? 'Awaiting claim' : 'No address provided'}
              </p>
            )}
          </div>

          {/* Details */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.sm }}>
              <User size={14} style={{ color: colors.gold.primary }} />
              <span style={{ fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold, color: colors.text.primary }}>Details</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs, fontSize: typography.fontSize.xs }}>
              {email && <span style={{ color: colors.text.secondary }}>{email}</span>}
              {row.reward?.cash_value && <span style={{ color: '#22c55e' }}>Value: ${row.reward.cash_value}</span>}
              {claimedDate && <span style={{ color: colors.text.tertiary }}>Claimed: {claimedDate}</span>}
              {expiresDate && <span style={{ color: colors.text.tertiary }}>Expires: {expiresDate}</span>}
              {row.discount_code && <span style={{ fontFamily: typography.fontFamily.mono, color: colors.text.secondary }}>Code: {row.discount_code}</span>}
              <span style={{ color: colors.text.tertiary }}>Content posted: {row.content_posted ? 'Yes' : 'No'}</span>
            </div>
          </div>

          {/* Status update */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.sm }}>
              <Package size={14} style={{ color: colors.gold.primary }} />
              <span style={{ fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold, color: colors.text.primary }}>Update Status</span>
            </div>
            <select
              value={row.status}
              onChange={(e) => handleStatusChange(row.id, e.target.value)}
              style={{
                width: '100%', padding: `${spacing.xs} ${spacing.sm}`,
                background: (ASSIGNMENT_STATUS_COLORS[row.status] || ASSIGNMENT_STATUS_COLORS.pending).bg,
                border: `1px solid ${(ASSIGNMENT_STATUS_COLORS[row.status] || ASSIGNMENT_STATUS_COLORS.pending).color}40`,
                borderRadius: borderRadius.sm, color: (ASSIGNMENT_STATUS_COLORS[row.status] || ASSIGNMENT_STATUS_COLORS.pending).color,
                fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium, cursor: 'pointer',
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
        </div>

        {/* History */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.sm }}>
            <History size={14} style={{ color: colors.gold.primary }} />
            <span style={{ fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold, color: colors.text.primary }}>
              Change History
            </span>
          </div>
          {isLoadingHist ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs, fontSize: typography.fontSize.xs, color: colors.text.tertiary }}>
              <Loader size={12} style={{ animation: 'spin 1s linear infinite' }} /> Loading...
              <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : history && history.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
              {history.map((entry) => (
                <HistoryEntry key={entry.id} entry={entry} />
              ))}
            </div>
          ) : (
            <p style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary, fontStyle: 'italic', margin: 0 }}>
              No history recorded yet.
            </p>
          )}
        </div>
      </div>
    );
  };

  if (error && !loading) {
    return (
      <div style={{
        padding: spacing.xl, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
        borderRadius: borderRadius.lg, color: '#ef4444', textAlign: 'center',
      }}>
        <p style={{ fontWeight: typography.fontWeight.semibold, marginBottom: spacing.sm }}>Failed to load redemption data</p>
        <p style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>{error}</p>
        <button
          onClick={() => { setError(null); setLoading(true); Promise.all([fetchAssignments(), fetchCompetitions()]).then(() => setLoading(false)); }}
          style={{
            marginTop: spacing.md, padding: `${spacing.sm} ${spacing.xl}`,
            background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: borderRadius.md, color: '#ef4444', cursor: 'pointer',
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
      <StatRow stats={stats} />

      <FilterBar
        filters={[
          { key: 'status', label: 'Status', options: statusOptions, value: statusFilter },
          { key: 'competition', label: 'Competition', options: competitionOptions, value: competitionFilter },
        ]}
        onFilterChange={(key, value) => {
          if (key === 'status') setStatusFilter(value);
          if (key === 'competition') setCompetitionFilter(value);
        }}
      />

      <DataTable
        columns={columns}
        data={filtered}
        loading={loading}
        emptyMessage={statusFilter || competitionFilter ? 'No assignments match these filters.' : 'No rewards have been assigned yet.'}
        expandable
        renderExpanded={renderExpanded}
        actions={(row) => (
          <ActionMenu actions={[
            { label: 'Mark Claimed', icon: Check, onClick: () => handleStatusChange(row.id, 'claimed'), disabled: row.status === 'claimed' },
            { label: 'Mark Shipped', icon: Package, onClick: () => handleStatusChange(row.id, 'shipped'), disabled: row.status === 'shipped' },
            { label: 'Mark Completed', icon: Check, onClick: () => handleStatusChange(row.id, 'completed'), disabled: row.status === 'completed' },
          ]} />
        )}
      />
    </div>
  );
}

/** Timeline entry for status changes */
function HistoryEntry({ entry }) {
  const date = new Date(entry.created_at);
  const timeStr = date.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });

  const fieldLabels = {
    status: 'Status', shipping_address: 'Shipping Address', content_posted: 'Content Posted',
    discount_code: 'Discount Code', tracking_link: 'Tracking Link',
  };
  const fieldLabel = fieldLabels[entry.field_name] || entry.field_name;

  if (entry.field_name === 'status') {
    const oldCfg = ASSIGNMENT_STATUS_COLORS[entry.old_value] || { color: colors.text.tertiary, label: entry.old_value };
    const newCfg = ASSIGNMENT_STATUS_COLORS[entry.new_value] || { color: colors.text.tertiary, label: entry.new_value };
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: spacing.sm,
        padding: `${spacing.xs} ${spacing.sm}`, background: colors.background.card,
        borderRadius: borderRadius.xs, borderLeft: `3px solid ${newCfg.color}`, fontSize: typography.fontSize.xs,
      }}>
        <span style={{ color: colors.text.tertiary, minWidth: '120px' }}>{timeStr}</span>
        <span style={{ color: colors.text.secondary }}>{fieldLabel}:</span>
        <span style={{ color: oldCfg.color }}>{oldCfg.label || entry.old_value || '--'}</span>
        <span style={{ color: colors.text.tertiary }}>&rarr;</span>
        <span style={{ color: newCfg.color, fontWeight: typography.fontWeight.medium }}>{newCfg.label || entry.new_value}</span>
      </div>
    );
  }

  if (entry.field_name === 'shipping_address') {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: spacing.sm,
        padding: `${spacing.xs} ${spacing.sm}`, background: colors.background.card,
        borderRadius: borderRadius.xs, borderLeft: `3px solid #3b82f6`, fontSize: typography.fontSize.xs,
      }}>
        <span style={{ color: colors.text.tertiary, minWidth: '120px' }}>{timeStr}</span>
        <span style={{ color: colors.text.secondary }}>Shipping address updated</span>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: spacing.sm,
      padding: `${spacing.xs} ${spacing.sm}`, background: colors.background.card,
      borderRadius: borderRadius.xs, borderLeft: `3px solid ${colors.text.tertiary}`, fontSize: typography.fontSize.xs,
    }}>
      <span style={{ color: colors.text.tertiary, minWidth: '120px' }}>{timeStr}</span>
      <span style={{ color: colors.text.secondary }}>
        {fieldLabel}: {entry.old_value || '--'} &rarr; {entry.new_value}
      </span>
    </div>
  );
}
