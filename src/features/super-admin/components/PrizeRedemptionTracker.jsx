import React, { useState, useEffect, useCallback } from 'react';
import {
  Package, ChevronDown, ChevronRight, Clock, Check, X,
  MapPin, Mail, User, History, Loader, Filter, Eye
} from 'lucide-react';
import { Button, Badge } from '../../../components/ui';
import { colors, spacing, borderRadius, typography, shadows } from '../../../styles/theme';
import { supabase } from '../../../lib/supabase';

const ASSIGNMENT_STATUS_COLORS = {
  pending: { bg: 'rgba(234,179,8,0.15)', color: '#eab308', label: 'Pending' },
  claimed: { bg: 'rgba(59,130,246,0.15)', color: '#3b82f6', label: 'Claimed' },
  shipped: { bg: 'rgba(139,92,246,0.15)', color: '#8b5cf6', label: 'Shipped' },
  active: { bg: 'rgba(34,197,94,0.15)', color: '#22c55e', label: 'Active' },
  completed: { bg: 'rgba(107,114,128,0.15)', color: '#6b7280', label: 'Completed' },
  expired: { bg: 'rgba(239,68,68,0.15)', color: '#ef4444', label: 'Expired' },
};

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'pending', label: 'Not Claimed' },
  { value: 'claimed', label: 'Claimed' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'expired', label: 'Expired' },
];

export default function PrizeRedemptionTracker() {
  const [assignments, setAssignments] = useState([]);
  const [competitions, setCompetitions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [competitionFilter, setCompetitionFilter] = useState('all');

  // Expanded assignment (to show details + history)
  const [expandedAssignment, setExpandedAssignment] = useState(null);

  // History cache
  const [error, setError] = useState(null);
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
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchAssignments(), fetchCompetitions()]);
      setLoading(false);
    };
    loadData();
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
        .from('reward_assignments')
        .update({ status: newStatus })
        .eq('id', assignmentId);

      if (error) throw error;

      // Clear history cache for this assignment so it refreshes
      setHistoryCache(prev => {
        const next = { ...prev };
        delete next[assignmentId];
        return next;
      });

      await fetchAssignments();

      // Re-fetch history if this assignment is expanded
      if (expandedAssignment === assignmentId) {
        setTimeout(() => fetchHistory(assignmentId), 500);
      }
    } catch (err) {
      console.error('Error updating status:', err);
      alert('Failed to update status: ' + err.message);
    }
  };

  const toggleExpanded = (assignmentId) => {
    if (expandedAssignment === assignmentId) {
      setExpandedAssignment(null);
    } else {
      setExpandedAssignment(assignmentId);
      fetchHistory(assignmentId);
    }
  };

  // Apply filters
  const filtered = assignments.filter(a => {
    if (statusFilter !== 'all' && a.status !== statusFilter) return false;
    if (competitionFilter !== 'all' && a.competition_id !== competitionFilter) return false;
    return true;
  });

  // Summary counts
  const counts = {
    total: assignments.length,
    pending: assignments.filter(a => a.status === 'pending').length,
    claimed: assignments.filter(a => a.status === 'claimed').length,
    shipped: assignments.filter(a => a.status === 'shipped').length,
    completed: assignments.filter(a => a.status === 'completed' || a.status === 'active').length,
    expired: assignments.filter(a => a.status === 'expired').length,
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: spacing.xxxl, color: colors.text.secondary
      }}>
        <Loader size={32} style={{ animation: 'spin 1s linear infinite', marginBottom: spacing.md }} />
        <p>Loading redemption data...</p>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        padding: spacing.xl,
        background: 'rgba(239,68,68,0.08)',
        border: '1px solid rgba(239,68,68,0.25)',
        borderRadius: borderRadius.xl,
        color: '#ef4444',
        textAlign: 'center',
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
    <div>
      {/* Header */}
      <div style={{ marginBottom: spacing.xxl }}>
        <h1 style={{ fontSize: typography.fontSize.xxl, fontWeight: typography.fontWeight.bold, marginBottom: spacing.xs }}>
          Prize Redemption Tracking
        </h1>
        <p style={{ color: colors.text.secondary }}>
          Track prize claims, view shipping addresses, and review redemption history
        </p>
      </div>

      {/* Summary Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: spacing.md,
        marginBottom: spacing.xxl,
      }}>
        {[
          { label: 'Total', value: counts.total, color: colors.text.primary, bg: colors.background.card },
          { label: 'Not Claimed', value: counts.pending, color: '#eab308', bg: 'rgba(234,179,8,0.08)' },
          { label: 'Claimed', value: counts.claimed, color: '#3b82f6', bg: 'rgba(59,130,246,0.08)' },
          { label: 'Shipped', value: counts.shipped, color: '#8b5cf6', bg: 'rgba(139,92,246,0.08)' },
          { label: 'Fulfilled', value: counts.completed, color: '#22c55e', bg: 'rgba(34,197,94,0.08)' },
          { label: 'Expired', value: counts.expired, color: '#ef4444', bg: 'rgba(239,68,68,0.08)' },
        ].map(card => (
          <div
            key={card.label}
            style={{
              background: card.bg,
              border: `1px solid ${colors.border.primary}`,
              borderRadius: borderRadius.xl,
              padding: spacing.lg,
              textAlign: 'center',
            }}
          >
            <p style={{ fontSize: typography.fontSize['3xl'], fontWeight: typography.fontWeight.bold, color: card.color, marginBottom: spacing.xs }}>
              {card.value}
            </p>
            <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {card.label}
            </p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{
        display: 'flex',
        gap: spacing.md,
        marginBottom: spacing.xl,
        flexWrap: 'wrap',
        alignItems: 'center',
      }}>
        <Filter size={16} style={{ color: colors.text.muted }} />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            padding: `${spacing.sm} ${spacing.lg}`,
            background: colors.background.secondary,
            border: `1px solid ${colors.border.primary}`,
            borderRadius: borderRadius.lg,
            color: colors.text.primary,
            fontSize: typography.fontSize.sm,
            cursor: 'pointer',
            minWidth: '160px',
          }}
        >
          {STATUS_FILTER_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        <select
          value={competitionFilter}
          onChange={(e) => setCompetitionFilter(e.target.value)}
          style={{
            padding: `${spacing.sm} ${spacing.lg}`,
            background: colors.background.secondary,
            border: `1px solid ${colors.border.primary}`,
            borderRadius: borderRadius.lg,
            color: colors.text.primary,
            fontSize: typography.fontSize.sm,
            cursor: 'pointer',
            minWidth: '200px',
          }}
        >
          <option value="all">All Competitions</option>
          {competitions.map(comp => (
            <option key={comp.id} value={comp.id}>
              {comp.name || `${comp.city?.name || 'Unknown'} ${comp.season}`}
            </option>
          ))}
        </select>

        <span style={{ fontSize: typography.fontSize.sm, color: colors.text.muted, marginLeft: spacing.sm }}>
          Showing {filtered.length} of {assignments.length}
        </span>
      </div>

      {/* Assignments List */}
      {filtered.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: spacing.xxxl,
          background: colors.background.card,
          borderRadius: borderRadius.xl,
          border: `1px solid ${colors.border.primary}`,
        }}>
          <Package size={48} style={{ color: colors.text.muted, marginBottom: spacing.md }} />
          <h3 style={{ fontSize: typography.fontSize.lg, marginBottom: spacing.sm }}>No Assignments Found</h3>
          <p style={{ color: colors.text.secondary }}>
            {statusFilter !== 'all' || competitionFilter !== 'all'
              ? 'Try adjusting your filters.'
              : 'No rewards have been assigned yet.'}
          </p>
        </div>
      ) : (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: spacing.md,
        }}>
          {filtered.map(assignment => (
            <RedemptionCard
              key={assignment.id}
              assignment={assignment}
              isExpanded={expandedAssignment === assignment.id}
              onToggle={() => toggleExpanded(assignment.id)}
              onStatusChange={handleStatusChange}
              history={historyCache[assignment.id]}
              loadingHistory={loadingHistory[assignment.id]}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * RedemptionCard - A single assignment displayed as a card with expandable details
 */
function RedemptionCard({ assignment, isExpanded, onToggle, onStatusChange, history, loadingHistory }) {
  const isNomineeAssignment = !assignment.contestant_id && !!assignment.nominee_id;
  const recipientName = isNomineeAssignment
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

  const statusConfig = ASSIGNMENT_STATUS_COLORS[assignment.status] || ASSIGNMENT_STATUS_COLORS.pending;
  const competitionName = assignment.competition?.name
    || `${assignment.competition?.city || 'Unknown'} ${assignment.competition?.season || ''}`;

  const addr = assignment.shipping_address;
  const hasAddress = addr && addr.street;

  const claimedDate = assignment.claimed_at
    ? new Date(assignment.claimed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;
  const expiresDate = assignment.expires_at
    ? new Date(assignment.expires_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;
  const createdDate = new Date(assignment.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div style={{
      background: colors.background.card,
      border: `1px solid ${isExpanded ? colors.gold.primary + '40' : colors.border.primary}`,
      borderRadius: borderRadius.xl,
      overflow: 'hidden',
      transition: 'border-color 0.2s',
    }}>
      {/* Card Header - Always Visible */}
      <div
        onClick={onToggle}
        style={{
          padding: spacing.xl,
          cursor: 'pointer',
          display: 'grid',
          gridTemplateColumns: '1fr auto auto auto',
          gap: spacing.xl,
          alignItems: 'center',
        }}
      >
        {/* Recipient Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md, minWidth: 0 }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: borderRadius.full,
            background: avatarUrl
              ? `url(${avatarUrl}) center/cover`
              : 'linear-gradient(135deg, #8b5cf6, #a78bfa)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: typography.fontSize.lg,
            fontWeight: typography.fontWeight.bold,
            color: '#fff',
            flexShrink: 0,
          }}>
            {!avatarUrl && recipientName.charAt(0)}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' }}>
              <p style={{ fontSize: typography.fontSize.md, fontWeight: typography.fontWeight.semibold }}>
                {recipientName}
              </p>
              {isNomineeAssignment && (
                <Badge size="sm" style={{ background: 'rgba(139,92,246,0.15)', color: '#a78bfa' }}>Nominee</Badge>
              )}
            </div>
            <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, marginTop: '2px' }}>
              {assignment.reward?.name} &middot; {assignment.reward?.brand_name}
            </p>
            <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, marginTop: '2px' }}>
              {competitionName}
            </p>
          </div>
        </div>

        {/* Claim Status Indicator */}
        <div style={{ textAlign: 'center' }}>
          {assignment.status === 'pending' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs }}>
              <Clock size={14} style={{ color: '#eab308' }} />
              <span style={{ fontSize: typography.fontSize.xs, color: '#eab308' }}>
                Not Claimed
              </span>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs }}>
                <Check size={14} style={{ color: '#3b82f6' }} />
                <span style={{ fontSize: typography.fontSize.xs, color: '#3b82f6' }}>
                  Claimed
                </span>
              </div>
              {claimedDate && (
                <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, marginTop: '2px' }}>
                  {claimedDate}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Status Badge */}
        <div>
          <Badge
            size="sm"
            style={{
              background: statusConfig.bg,
              color: statusConfig.color,
              minWidth: '80px',
              textAlign: 'center',
              display: 'inline-block',
            }}
          >
            {statusConfig.label}
          </Badge>
        </div>

        {/* Expand Arrow */}
        <div>
          {isExpanded
            ? <ChevronDown size={20} style={{ color: colors.text.muted }} />
            : <ChevronRight size={20} style={{ color: colors.text.muted }} />
          }
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div style={{ borderTop: `1px solid ${colors.border.primary}` }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: spacing.xl,
            padding: spacing.xl,
          }}>
            {/* Column 1: Shipping Address */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md }}>
                <MapPin size={16} style={{ color: colors.gold.primary }} />
                <h4 style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.text.primary }}>
                  Shipping Address
                </h4>
              </div>
              {hasAddress ? (
                <div style={{
                  background: colors.background.secondary,
                  borderRadius: borderRadius.lg,
                  padding: spacing.lg,
                  border: `1px solid ${colors.border.primary}`,
                }}>
                  <p style={{ fontSize: typography.fontSize.sm, color: colors.text.primary, lineHeight: 1.6 }}>
                    {addr.street}
                    {addr.apt ? `, ${addr.apt}` : ''}
                  </p>
                  <p style={{ fontSize: typography.fontSize.sm, color: colors.text.primary, lineHeight: 1.6 }}>
                    {addr.city}, {addr.state} {addr.zip}
                  </p>
                </div>
              ) : (
                <div style={{
                  background: colors.background.secondary,
                  borderRadius: borderRadius.lg,
                  padding: spacing.lg,
                  border: `1px dashed ${colors.border.primary}`,
                  textAlign: 'center',
                }}>
                  <p style={{ fontSize: typography.fontSize.sm, color: colors.text.muted, fontStyle: 'italic' }}>
                    {assignment.status === 'pending' ? 'Awaiting claim — no address yet' : 'No address provided'}
                  </p>
                </div>
              )}
            </div>

            {/* Column 2: Contact & Prize Info */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md }}>
                <User size={16} style={{ color: colors.gold.primary }} />
                <h4 style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.text.primary }}>
                  Details
                </h4>
              </div>
              <div style={{
                background: colors.background.secondary,
                borderRadius: borderRadius.lg,
                padding: spacing.lg,
                border: `1px solid ${colors.border.primary}`,
              }}>
                {email && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md }}>
                    <Mail size={14} style={{ color: colors.text.muted }} />
                    <span style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>{email}</span>
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
                  <DetailRow label="Prize" value={assignment.reward?.name} />
                  <DetailRow label="Brand" value={assignment.reward?.brand_name} />
                  {assignment.reward?.cash_value && (
                    <DetailRow label="Value" value={`$${assignment.reward.cash_value}`} valueColor="#22c55e" />
                  )}
                  <DetailRow label="Assigned" value={createdDate} />
                  {expiresDate && <DetailRow label="Expires" value={expiresDate} />}
                  {assignment.discount_code && (
                    <DetailRow label="Code" value={assignment.discount_code} mono />
                  )}
                </div>
              </div>
            </div>

            {/* Column 3: Actions & Status */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md }}>
                <Package size={16} style={{ color: colors.gold.primary }} />
                <h4 style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.text.primary }}>
                  Status
                </h4>
              </div>
              <div style={{
                background: colors.background.secondary,
                borderRadius: borderRadius.lg,
                padding: spacing.lg,
                border: `1px solid ${colors.border.primary}`,
              }}>
                <label style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, marginBottom: spacing.sm, display: 'block' }}>
                  Update Status
                </label>
                <select
                  value={assignment.status}
                  onChange={(e) => onStatusChange(assignment.id, e.target.value)}
                  style={{
                    width: '100%',
                    padding: `${spacing.sm} ${spacing.md}`,
                    background: statusConfig.bg,
                    border: `1px solid ${statusConfig.color}40`,
                    borderRadius: borderRadius.md,
                    color: statusConfig.color,
                    fontSize: typography.fontSize.sm,
                    fontWeight: typography.fontWeight.medium,
                    cursor: 'pointer',
                    marginBottom: spacing.lg,
                  }}
                >
                  <option value="pending">Pending</option>
                  <option value="claimed">Claimed</option>
                  <option value="shipped">Shipped</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="expired">Expired</option>
                </select>

                {/* Content compliance */}
                <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                  <span style={{ fontSize: typography.fontSize.xs, color: colors.text.muted }}>Content Posted:</span>
                  <Badge
                    size="sm"
                    style={{
                      background: assignment.content_posted ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.1)',
                      color: assignment.content_posted ? '#22c55e' : '#ef4444',
                    }}
                  >
                    {assignment.content_posted ? 'Yes' : 'No'}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* History Section */}
          <div style={{
            borderTop: `1px solid ${colors.border.primary}`,
            padding: spacing.xl,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md }}>
              <History size={16} style={{ color: colors.gold.primary }} />
              <h4 style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.text.primary }}>
                Change History
              </h4>
            </div>

            {loadingHistory ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, padding: spacing.md }}>
                <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: typography.fontSize.sm, color: colors.text.muted }}>Loading history...</span>
              </div>
            ) : history && history.length > 0 ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: spacing.sm,
              }}>
                {history.map((entry) => (
                  <HistoryEntry key={entry.id} entry={entry} />
                ))}
              </div>
            ) : (
              <p style={{ fontSize: typography.fontSize.sm, color: colors.text.muted, fontStyle: 'italic', padding: spacing.sm }}>
                No history recorded yet. Changes will appear here once status updates are made.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * DetailRow - A label/value pair in the details panel
 */
function DetailRow({ label, value, valueColor, mono }) {
  if (!value) return null;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: typography.fontSize.xs, color: colors.text.muted }}>{label}</span>
      <span style={{
        fontSize: typography.fontSize.xs,
        color: valueColor || colors.text.secondary,
        fontFamily: mono ? typography.fontFamily.mono : 'inherit',
        fontWeight: mono ? typography.fontWeight.medium : typography.fontWeight.normal,
      }}>
        {value}
      </span>
    </div>
  );
}

/**
 * HistoryEntry - A single audit log entry
 */
function HistoryEntry({ entry }) {
  const date = new Date(entry.created_at);
  const timeStr = date.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });

  const fieldLabels = {
    status: 'Status',
    shipping_address: 'Shipping Address',
    content_posted: 'Content Posted',
    discount_code: 'Discount Code',
    tracking_link: 'Tracking Link',
  };

  const fieldLabel = fieldLabels[entry.field_name] || entry.field_name;

  // For status changes, show colored badges
  if (entry.field_name === 'status') {
    const oldConfig = ASSIGNMENT_STATUS_COLORS[entry.old_value] || { color: colors.text.muted, label: entry.old_value };
    const newConfig = ASSIGNMENT_STATUS_COLORS[entry.new_value] || { color: colors.text.muted, label: entry.new_value };

    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: spacing.md,
        padding: `${spacing.sm} ${spacing.md}`,
        background: colors.background.secondary,
        borderRadius: borderRadius.md,
        borderLeft: `3px solid ${newConfig.color}`,
      }}>
        <span style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, minWidth: '140px' }}>
          {timeStr}
        </span>
        <span style={{ fontSize: typography.fontSize.xs, color: colors.text.secondary }}>
          {fieldLabel}:
        </span>
        <span style={{ fontSize: typography.fontSize.xs, color: oldConfig.color }}>
          {oldConfig.label || entry.old_value || '—'}
        </span>
        <span style={{ fontSize: typography.fontSize.xs, color: colors.text.muted }}>&rarr;</span>
        <span style={{ fontSize: typography.fontSize.xs, color: newConfig.color, fontWeight: typography.fontWeight.medium }}>
          {newConfig.label || entry.new_value}
        </span>
      </div>
    );
  }

  // For shipping address changes
  if (entry.field_name === 'shipping_address') {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: spacing.md,
        padding: `${spacing.sm} ${spacing.md}`,
        background: colors.background.secondary,
        borderRadius: borderRadius.md,
        borderLeft: `3px solid #3b82f6`,
      }}>
        <span style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, minWidth: '140px' }}>
          {timeStr}
        </span>
        <span style={{ fontSize: typography.fontSize.xs, color: colors.text.secondary }}>
          Shipping address updated
        </span>
      </div>
    );
  }

  // Generic change entry
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: spacing.md,
      padding: `${spacing.sm} ${spacing.md}`,
      background: colors.background.secondary,
      borderRadius: borderRadius.md,
      borderLeft: `3px solid ${colors.text.muted}`,
    }}>
      <span style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, minWidth: '140px' }}>
        {timeStr}
      </span>
      <span style={{ fontSize: typography.fontSize.xs, color: colors.text.secondary }}>
        {fieldLabel}: {entry.old_value || '—'} &rarr; {entry.new_value}
      </span>
    </div>
  );
}
