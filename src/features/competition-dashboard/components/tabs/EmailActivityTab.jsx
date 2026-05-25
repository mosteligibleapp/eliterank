import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Mail, CheckCircle, XCircle, Search, RefreshCw, Inbox, AlertCircle, Bell, Heart, Star, Download } from 'lucide-react';
import { Panel, StatCard, Badge, Avatar, Button } from '../../../../components/ui';
import { colors, spacing, borderRadius, typography } from '../../../../styles/theme';
import { supabase } from '../../../../lib/supabase';

// Page size for the Nominators / Voters lists. The CSV export uses a larger
// limit (EXPORT_PAGE_SIZE) so a host can dump everything in one round trip.
const PAGE_SIZE = 50;
const EXPORT_PAGE_SIZE = 10000;

const STATUS_PILL_PALETTE = {
  success: { bg: 'rgba(34,197,94,0.15)', fg: colors.status.success },
  error: { bg: 'rgba(239,68,68,0.15)', fg: colors.status.error },
  neutral: { bg: 'rgba(255,255,255,0.05)', fg: colors.text.muted },
  gold: { bg: 'rgba(212,175,55,0.12)', fg: colors.gold.primary },
};
const StatusPill = ({ tone = 'neutral', children, title }) => {
  const p = STATUS_PILL_PALETTE[tone] || STATUS_PILL_PALETTE.neutral;
  return (
    <span
      title={title}
      style={{
        fontSize: typography.fontSize.xs,
        fontWeight: typography.fontWeight.medium,
        color: p.fg,
        background: p.bg,
        padding: `2px ${spacing.sm}`,
        borderRadius: borderRadius.sm,
        whiteSpace: 'nowrap',
        lineHeight: 1.4,
      }}
    >
      {children}
    </span>
  );
};

const deliveryToneFor = (status) =>
  status === 'sent' ? 'success' : status === 'failed' ? 'error' : 'neutral';
const deliveryLabelFor = (status) =>
  status === 'sent' ? 'Sent' : status === 'failed' ? 'Failed' : 'No email sent';

const downloadCSV = (rows, filename) => {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(','),
    ...rows.map((r) =>
      headers.map((h) => `"${(r[h] ?? '').toString().replace(/"/g, '""')}"`).join(','),
    ),
  ].join('\n');
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

// Human-readable labels for each transactional email type. Unknown types
// (e.g. future "elimination" emails) fall back to a title-cased version.
const EMAIL_TYPE_LABELS = {
  nominee_invite: 'Nomination Invite',
  nominee_reminder: 'Profile Reminder',
  self_nominee_reminder: 'Entry Reminder',
  nominator_confirm: 'Nominator Confirmation',
  nominee_accepted: 'Nominee Accepted',
  nominee_declined: 'Nominee Declined',
  account_ready: 'Account Setup',
  fan_confirmation: 'Fan Confirmation',
  fan_weekly_digest: 'Weekly Performance Update',
  vote_receipt: 'Vote Receipt',
};

const labelForType = (type) =>
  EMAIL_TYPE_LABELS[type] ||
  String(type || 'Email')
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

const styles = {
  statGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  controls: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    borderBottom: `1px solid ${colors.border.primary}`,
  },
  searchWrap: {
    position: 'relative',
    flex: '1 1 220px',
    minWidth: '180px',
  },
  searchInput: {
    width: '100%',
    boxSizing: 'border-box',
    padding: `${spacing.sm} ${spacing.sm} ${spacing.sm} 34px`,
    background: colors.background.secondary,
    border: `1px solid ${colors.border.primary}`,
    borderRadius: borderRadius.md,
    color: colors.text.primary,
    fontSize: typography.fontSize.sm,
  },
  select: {
    padding: `${spacing.sm} ${spacing.md}`,
    background: colors.background.secondary,
    border: `1px solid ${colors.border.primary}`,
    borderRadius: borderRadius.md,
    color: colors.text.primary,
    fontSize: typography.fontSize.sm,
    cursor: 'pointer',
  },
  iconButton: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.xs,
    padding: `${spacing.sm} ${spacing.md}`,
    background: 'transparent',
    border: `1px solid ${colors.border.primary}`,
    borderRadius: borderRadius.md,
    color: colors.text.secondary,
    fontSize: typography.fontSize.sm,
    cursor: 'pointer',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderBottom: `1px solid ${colors.border.secondary}`,
    flexWrap: 'wrap',
  },
  empty: {
    textAlign: 'center',
    padding: spacing.xxxl,
    color: colors.text.secondary,
  },
};

export default function EmailActivityTab({ competitionId, subscribers = [], onRemoveSubscriber }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [removingIds, setRemovingIds] = useState(new Set());

  const [nominators, setNominators] = useState([]);
  const [nominatorsTotal, setNominatorsTotal] = useState(0);
  const [nominatorsLoaded, setNominatorsLoaded] = useState(false);
  const [nominatorsLoading, setNominatorsLoading] = useState(false);
  const [nominatorsError, setNominatorsError] = useState(null);
  const [nominatorsExporting, setNominatorsExporting] = useState(false);

  const [voters, setVoters] = useState([]);
  const [votersTotal, setVotersTotal] = useState(0);
  const [votersLoaded, setVotersLoaded] = useState(false);
  const [votersLoading, setVotersLoading] = useState(false);
  const [votersError, setVotersError] = useState(null);
  const [votersExporting, setVotersExporting] = useState(false);

  const fetchNominatorPage = useCallback(async (offset, limit) => {
    const { data, error: rpcError } = await supabase.rpc('get_competition_nominators', {
      p_competition_id: competitionId,
      p_limit: limit,
      p_offset: offset,
    });
    if (rpcError) throw rpcError;
    return data || [];
  }, [competitionId]);

  const fetchVoterPage = useCallback(async (offset, limit) => {
    const { data, error: rpcError } = await supabase.rpc('get_competition_voters', {
      p_competition_id: competitionId,
      p_limit: limit,
      p_offset: offset,
    });
    if (rpcError) throw rpcError;
    return data || [];
  }, [competitionId]);

  const loadMoreNominators = useCallback(async (reset = false) => {
    if (!competitionId) return;
    setNominatorsLoading(true);
    setNominatorsError(null);
    try {
      const offset = reset ? 0 : nominators.length;
      const rows = await fetchNominatorPage(offset, PAGE_SIZE);
      setNominators((prev) => (reset ? rows : [...prev, ...rows]));
      setNominatorsTotal(rows[0]?.total_count ? Number(rows[0].total_count) : (reset ? 0 : nominatorsTotal));
      setNominatorsLoaded(true);
    } catch (e) {
      setNominatorsError(e.message || 'Failed to load nominators');
    } finally {
      setNominatorsLoading(false);
    }
  }, [competitionId, nominators.length, nominatorsTotal, fetchNominatorPage]);

  const loadMoreVoters = useCallback(async (reset = false) => {
    if (!competitionId) return;
    setVotersLoading(true);
    setVotersError(null);
    try {
      const offset = reset ? 0 : voters.length;
      const rows = await fetchVoterPage(offset, PAGE_SIZE);
      setVoters((prev) => (reset ? rows : [...prev, ...rows]));
      setVotersTotal(rows[0]?.total_count ? Number(rows[0].total_count) : (reset ? 0 : votersTotal));
      setVotersLoaded(true);
    } catch (e) {
      setVotersError(e.message || 'Failed to load voters');
    } finally {
      setVotersLoading(false);
    }
  }, [competitionId, voters.length, votersTotal, fetchVoterPage]);

  const exportNominators = useCallback(async () => {
    if (!competitionId) return;
    setNominatorsExporting(true);
    try {
      const rows = await fetchNominatorPage(0, EXPORT_PAGE_SIZE);
      downloadCSV(
        rows.map((n) => ({
          name: n.nominator_name || '',
          email: n.nominator_email || '',
          delivery: n.delivery_status === 'sent' ? 'sent' : n.delivery_status === 'failed' ? 'failed' : 'not_sent',
          subscribed: n.is_subscriber ? 'yes' : 'no',
          reason: n.nomination_reason || '',
          date: n.created_at ? new Date(n.created_at).toLocaleDateString() : '',
        })),
        'nominators.csv',
      );
    } catch (e) {
      alert(`Export failed: ${e.message || 'unknown error'}`);
    } finally {
      setNominatorsExporting(false);
    }
  }, [competitionId, fetchNominatorPage]);

  const exportVoters = useCallback(async () => {
    if (!competitionId) return;
    setVotersExporting(true);
    try {
      const rows = await fetchVoterPage(0, EXPORT_PAGE_SIZE);
      downloadCSV(
        rows.map((v) => {
          const paid = Number(v.total_paid) || 0;
          return {
            email: v.email,
            total_votes: Number(v.total_votes) || 0,
            total_paid: paid > 0 ? `$${paid.toFixed(2)}` : '$0',
            transactions: Number(v.transaction_count) || 0,
            delivery: v.delivery_status === 'sent' ? 'sent' : v.delivery_status === 'failed' ? 'failed' : 'not_sent',
            subscribed: v.is_subscriber ? 'yes' : 'no',
          };
        }),
        'voters.csv',
      );
    } catch (e) {
      alert(`Export failed: ${e.message || 'unknown error'}`);
    } finally {
      setVotersExporting(false);
    }
  }, [competitionId, fetchVoterPage]);

  const handleRemoveSubscriber = async (sub) => {
    if (!onRemoveSubscriber) return;
    if (!confirm(`Remove ${sub.name} from this competition's subscriber list? They won't be notified when nominations open.`)) return;
    setRemovingIds((prev) => new Set(prev).add(sub.id));
    try {
      const result = await onRemoveSubscriber(sub.id);
      if (!result?.success) {
        alert(`Failed to remove subscriber: ${result?.error || 'Unknown error'}`);
      }
    } finally {
      setRemovingIds((prev) => {
        const next = new Set(prev);
        next.delete(sub.id);
        return next;
      });
    }
  };

  const fetchLogs = useCallback(async () => {
    if (!supabase || !competitionId) return;
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await supabase
      .from('email_logs')
      .select('*')
      .eq('competition_id', competitionId)
      .order('created_at', { ascending: false })
      .limit(500);
    if (fetchError) {
      setError(fetchError.message);
      setLogs([]);
    } else {
      setLogs(data || []);
    }
    setLoading(false);
  }, [competitionId]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const sentCount = useMemo(() => logs.filter((l) => l.status === 'sent').length, [logs]);
  const failedCount = useMemo(() => logs.filter((l) => l.status === 'failed').length, [logs]);

  // Email types actually present in this competition's logs, for the dropdown
  const presentTypes = useMemo(() => {
    const set = new Set(logs.map((l) => l.email_type).filter(Boolean));
    return Array.from(set).sort();
  }, [logs]);

  const filteredLogs = useMemo(() => {
    const term = search.trim().toLowerCase();
    return logs.filter((l) => {
      if (statusFilter !== 'all' && l.status !== statusFilter) return false;
      if (typeFilter !== 'all' && l.email_type !== typeFilter) return false;
      if (term) {
        const haystack = `${l.to_email || ''} ${l.to_name || ''}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [logs, statusFilter, typeFilter, search]);

  const formatDate = (iso) => {
    try {
      return new Date(iso).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  const renderStatusChip = (status) =>
    status === 'sent' ? (
      <Badge variant="success" size="sm">Sent</Badge>
    ) : (
      <Badge variant="error" size="sm">Failed</Badge>
    );

  return (
    <div>
      {/* Summary stats */}
      <div style={styles.statGrid}>
        <StatCard label="Total Emails" value={logs.length} icon={Mail} iconColor="gold" />
        <StatCard label="Delivered" value={sentCount} icon={CheckCircle} iconColor="green" />
        <StatCard
          label="Failed"
          value={failedCount}
          icon={XCircle}
          iconColor={failedCount > 0 ? 'gold' : 'green'}
        />
      </div>

      {/* Subscribers — users who opted in to "Notify me when nominations open" */}
      <Panel
        title={`Subscribers (${subscribers.length})`}
        icon={Bell}
        collapsible
        defaultOpen={subscribers.length > 0}
      >
        <div style={{ padding: spacing.lg }}>
          {subscribers.length === 0 ? (
            <p style={{ color: colors.text.secondary, textAlign: 'center', padding: spacing.lg }}>
              No one has subscribed yet. They'll appear here when visitors opt in from the coming-soon page.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
              {subscribers.map((sub) => (
                <div
                  key={sub.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing.md,
                    padding: spacing.md,
                    background: colors.background.tertiary,
                    border: `1px solid ${colors.border.primary}`,
                    borderRadius: borderRadius.md,
                  }}
                >
                  <Avatar name={sub.name} src={sub.avatar} size={40} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: typography.fontWeight.medium, color: colors.text.primary }}>
                      {sub.name}
                    </p>
                    <p
                      style={{
                        color: colors.text.secondary,
                        fontSize: typography.fontSize.sm,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {sub.email}
                    </p>
                  </div>
                  {sub.subscribedAt && (
                    <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.xs }}>
                      {new Date(sub.subscribedAt).toLocaleDateString()}
                    </p>
                  )}
                  {onRemoveSubscriber && (
                    <button
                      onClick={() => handleRemoveSubscriber(sub)}
                      disabled={removingIds.has(sub.id)}
                      title="Remove from subscriber list"
                      style={{
                        padding: spacing.xs,
                        background: colors.border.error,
                        border: 'none',
                        borderRadius: borderRadius.sm,
                        cursor: removingIds.has(sub.id) ? 'not-allowed' : 'pointer',
                        color: colors.status.error,
                        minWidth: '32px',
                        minHeight: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <XCircle size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </Panel>

      {/* Nominators — third-party people who nominated someone in this competition */}
      <Panel
        title={`Nominators${nominatorsLoaded ? ` (${nominatorsTotal})` : ''}`}
        icon={Heart}
        collapsible
        defaultCollapsed
        action={nominatorsLoaded && nominatorsTotal > 0 && (
          <Button
            size="sm"
            icon={Download}
            variant="secondary"
            disabled={nominatorsExporting}
            onClick={(e) => { e.stopPropagation(); exportNominators(); }}
          >
            {nominatorsExporting ? 'Exporting…' : 'Export'}
          </Button>
        )}
      >
        <div style={{ padding: spacing.lg }}>
          {!nominatorsLoaded ? (
            <div style={{ textAlign: 'center', padding: spacing.lg }}>
              <Button
                size="sm"
                variant="secondary"
                disabled={nominatorsLoading}
                onClick={() => loadMoreNominators(true)}
              >
                {nominatorsLoading ? 'Loading…' : 'Load Nominators'}
              </Button>
              {nominatorsError && (
                <p style={{ color: colors.status.error, fontSize: typography.fontSize.sm, marginTop: spacing.sm }}>
                  {nominatorsError}
                </p>
              )}
            </div>
          ) : nominators.length === 0 ? (
            <p style={{ textAlign: 'center', color: colors.text.muted, fontSize: typography.fontSize.sm, padding: spacing.lg }}>
              No third-party nominations yet.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
              {nominators.map((n, i) => (
                <div
                  key={`${n.nominator_email}-${i}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing.md,
                    padding: spacing.md,
                    background: colors.background.secondary,
                    borderRadius: borderRadius.lg,
                  }}
                >
                  <Avatar name={n.nominator_name || n.nominator_email} size={36} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: typography.fontWeight.medium, fontSize: typography.fontSize.sm }}>
                      {n.nominator_name || 'Anonymous'}
                    </p>
                    <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {n.nominator_email}
                    </p>
                    <div style={{ display: 'flex', gap: spacing.xs, marginTop: spacing.xs, flexWrap: 'wrap' }}>
                      <StatusPill
                        tone={deliveryToneFor(n.delivery_status)}
                        title={n.delivery_status === 'failed' ? 'Last invite email failed to send' : n.delivery_status === 'sent' ? 'Invite email sent' : 'No invite email sent yet'}
                      >
                        {deliveryLabelFor(n.delivery_status)}
                      </StatusPill>
                      {n.is_subscriber && (
                        <StatusPill tone="gold" title="Subscribed to this competition's updates">Subscribed</StatusPill>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {nominators.length < nominatorsTotal && (
                <div style={{ textAlign: 'center', padding: spacing.md }}>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={nominatorsLoading}
                    onClick={() => loadMoreNominators(false)}
                  >
                    {nominatorsLoading ? 'Loading…' : `Load ${Math.min(PAGE_SIZE, nominatorsTotal - nominators.length)} more`}
                  </Button>
                </div>
              )}
              {nominatorsError && (
                <p style={{ color: colors.status.error, fontSize: typography.fontSize.sm, textAlign: 'center' }}>
                  {nominatorsError}
                </p>
              )}
            </div>
          )}
        </div>
      </Panel>

      {/* Voters — unique paying voters in this competition, aggregated by email */}
      <Panel
        title={`Voters${votersLoaded ? ` (${votersTotal})` : ''}`}
        icon={Star}
        collapsible
        defaultCollapsed
        action={votersLoaded && votersTotal > 0 && (
          <Button
            size="sm"
            icon={Download}
            variant="secondary"
            disabled={votersExporting}
            onClick={(e) => { e.stopPropagation(); exportVoters(); }}
          >
            {votersExporting ? 'Exporting…' : 'Export'}
          </Button>
        )}
      >
        <div style={{ padding: spacing.lg }}>
          {!votersLoaded ? (
            <div style={{ textAlign: 'center', padding: spacing.lg }}>
              <Button
                size="sm"
                variant="secondary"
                disabled={votersLoading}
                onClick={() => loadMoreVoters(true)}
              >
                {votersLoading ? 'Loading…' : 'Load Voters'}
              </Button>
              {votersError && (
                <p style={{ color: colors.status.error, fontSize: typography.fontSize.sm, marginTop: spacing.sm }}>
                  {votersError}
                </p>
              )}
            </div>
          ) : voters.length === 0 ? (
            <p style={{ textAlign: 'center', color: colors.text.muted, fontSize: typography.fontSize.sm, padding: spacing.lg }}>
              No votes yet.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
              {voters.map((v, i) => {
                const totalVotes = Number(v.total_votes) || 0;
                const totalPaid = Number(v.total_paid) || 0;
                return (
                  <div
                    key={`${v.email}-${i}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: spacing.md,
                      padding: spacing.md,
                      background: colors.background.secondary,
                      borderRadius: borderRadius.lg,
                    }}
                  >
                    <Avatar name={v.email} size={36} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: typography.fontWeight.medium, fontSize: typography.fontSize.sm, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {v.email}
                      </p>
                      <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted }}>
                        {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}
                        {totalPaid > 0 && ` · $${totalPaid.toFixed(2)} spent`}
                      </p>
                      {v.email !== 'Anonymous' && (
                        <div style={{ display: 'flex', gap: spacing.xs, marginTop: spacing.xs, flexWrap: 'wrap' }}>
                          <StatusPill
                            tone={deliveryToneFor(v.delivery_status)}
                            title={v.delivery_status === 'failed' ? 'Last receipt email failed to send' : v.delivery_status === 'sent' ? 'Receipt email sent' : 'No email sent to this voter yet'}
                          >
                            {deliveryLabelFor(v.delivery_status)}
                          </StatusPill>
                          {v.is_subscriber && (
                            <StatusPill tone="gold" title="Subscribed to this competition's updates">Subscribed</StatusPill>
                          )}
                        </div>
                      )}
                    </div>
                    <span
                      style={{
                        fontSize: typography.fontSize.xs,
                        fontWeight: typography.fontWeight.semibold,
                        color: colors.gold.primary,
                        padding: `${spacing.xs} ${spacing.sm}`,
                        background: 'rgba(212,175,55,0.1)',
                        borderRadius: borderRadius.sm,
                      }}
                    >
                      {totalVotes}
                    </span>
                  </div>
                );
              })}
              {voters.length < votersTotal && (
                <div style={{ textAlign: 'center', padding: spacing.md }}>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={votersLoading}
                    onClick={() => loadMoreVoters(false)}
                  >
                    {votersLoading ? 'Loading…' : `Load ${Math.min(PAGE_SIZE, votersTotal - voters.length)} more`}
                  </Button>
                </div>
              )}
              {votersError && (
                <p style={{ color: colors.status.error, fontSize: typography.fontSize.sm, textAlign: 'center' }}>
                  {votersError}
                </p>
              )}
            </div>
          )}
        </div>
      </Panel>

      <Panel title="Email Activity" icon={Mail} collapsible defaultCollapsed>
        {/* Filters */}
        <div style={styles.controls}>
          <div style={styles.searchWrap}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: spacing.sm,
                top: '50%',
                transform: 'translateY(-50%)',
                color: colors.text.muted,
              }}
            />
            <input
              type="text"
              placeholder="Search by recipient name or email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={styles.searchInput}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={styles.select}
          >
            <option value="all">All statuses</option>
            <option value="sent">Sent</option>
            <option value="failed">Failed</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={styles.select}
          >
            <option value="all">All types</option>
            {presentTypes.map((t) => (
              <option key={t} value={t}>{labelForType(t)}</option>
            ))}
          </select>

          <button onClick={fetchLogs} style={styles.iconButton}>
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>

        {/* List */}
        {loading ? (
          <div style={styles.empty}>Loading email activity…</div>
        ) : error ? (
          <div style={styles.empty}>
            <AlertCircle size={40} style={{ color: colors.status.error, marginBottom: spacing.md }} />
            <p style={{ color: colors.status.error }}>Could not load email activity.</p>
            <p style={{ fontSize: typography.fontSize.sm, color: colors.text.muted }}>{error}</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div style={styles.empty}>
            <Inbox size={48} style={{ marginBottom: spacing.md, opacity: 0.5 }} />
            <p>
              {logs.length === 0
                ? 'No emails have been sent for this competition yet.'
                : 'No emails match the current filters.'}
            </p>
          </div>
        ) : (
          <div>
            {filteredLogs.map((log) => (
              <div key={log.id} style={styles.row}>
                {/* Status icon */}
                <div style={{ flexShrink: 0 }}>
                  {log.status === 'sent' ? (
                    <CheckCircle size={20} style={{ color: colors.status.success }} />
                  ) : (
                    <XCircle size={20} style={{ color: colors.status.error }} />
                  )}
                </div>

                {/* Recipient */}
                <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                  <p
                    style={{
                      fontWeight: typography.fontWeight.medium,
                      color: colors.text.primary,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {log.to_name || log.to_email}
                  </p>
                  <p
                    style={{
                      fontSize: typography.fontSize.xs,
                      color: colors.text.muted,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {log.to_email}
                  </p>
                  {log.status === 'failed' && log.error && (
                    <p
                      style={{
                        fontSize: typography.fontSize.xs,
                        color: colors.status.error,
                        marginTop: spacing.xs,
                        wordBreak: 'break-word',
                      }}
                    >
                      {log.error}
                    </p>
                  )}
                </div>

                {/* Email type */}
                <div style={{ flex: '0 0 auto' }}>
                  <span
                    style={{
                      fontSize: typography.fontSize.sm,
                      color: colors.text.secondary,
                    }}
                  >
                    {labelForType(log.email_type)}
                  </span>
                </div>

                {/* Status badge */}
                <div style={{ flex: '0 0 auto' }}>{renderStatusChip(log.status)}</div>

                {/* Timestamp */}
                <div
                  style={{
                    flex: '0 0 auto',
                    fontSize: typography.fontSize.xs,
                    color: colors.text.muted,
                    minWidth: '140px',
                    textAlign: 'right',
                  }}
                >
                  {formatDate(log.created_at)}
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
