import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Building2, CheckCircle, XCircle, Clock, Eye,
  ArrowLeft, ExternalLink, Send, FileText, MessageSquare,
} from 'lucide-react';
import { colors, spacing, borderRadius, typography, transitions } from '@shared/styles/theme';
import { supabase } from '@shared/lib/supabase';
import { useToast } from '@shared/contexts/ToastContext';
import FilterBar from '../../../components/FilterBar';
import DataTable from '../../../components/DataTable';
import StatRow from '../../../components/StatRow';

/**
 * Launch leads viewer — reads from interest_submissions filtered to
 * interest_type = 'launching' (unaffiliated leads from the public /launch
 * form). Per-competition interest submissions are handled by a separate
 * viewer that filters by competition_id.
 */

const STATUS_OPTIONS = [
  { value: 'pending',    label: 'Pending' },
  { value: 'in_review',  label: 'In review' },
  { value: 'approved',   label: 'Approved' },
  { value: 'rejected',   label: 'Rejected' },
];

const STATUS_BADGES = {
  pending:   { bg: 'rgba(234,179,8,0.15)',  color: '#eab308', icon: Clock },
  in_review: { bg: 'rgba(59,130,246,0.15)', color: '#3b82f6', icon: Eye },
  approved:  { bg: 'rgba(34,197,94,0.15)',  color: '#22c55e', icon: CheckCircle },
  rejected:  { bg: 'rgba(239,68,68,0.15)',  color: '#ef4444', icon: XCircle },
};

const dash = (v) => (v == null || v === '' ? '—' : v);
const dateTime = (v) => (v ? new Date(v).toLocaleString() : '—');

function StatusPill({ status }) {
  const cfg = STATUS_BADGES[status] || STATUS_BADGES.pending;
  const Icon = cfg.icon;
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      padding: `2px ${spacing.sm}`,
      borderRadius: borderRadius.sm,
      fontSize: typography.fontSize.xs,
      background: cfg.bg,
      color: cfg.color,
      textTransform: 'capitalize',
      whiteSpace: 'nowrap',
    }}>
      <Icon size={10} />
      {String(status).replace('_', ' ')}
    </span>
  );
}

function DetailSection({ title, children }) {
  return (
    <div style={{
      padding: spacing.lg,
      background: colors.background.card,
      border: `1px solid ${colors.border.secondary}`,
      borderRadius: borderRadius.md,
    }}>
      <h3 style={{
        fontSize: typography.fontSize.xs,
        fontWeight: typography.fontWeight.semibold,
        color: colors.text.tertiary,
        textTransform: 'uppercase',
        letterSpacing: typography.letterSpacing.wider,
        margin: `0 0 ${spacing.md}`,
      }}>{title}</h3>
      {children}
    </div>
  );
}

function DetailRow({ label, children }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '140px 1fr',
      gap: spacing.md,
      padding: `${spacing.xs} 0`,
      borderBottom: `1px solid ${colors.border.secondary}`,
      fontSize: typography.fontSize.sm,
    }}>
      <span style={{ color: colors.text.tertiary }}>{label}</span>
      <span style={{ color: colors.text.primary, wordBreak: 'break-word' }}>{children}</span>
    </div>
  );
}

function SubmissionDetail({ submission, onBack, onUpdate }) {
  const [status, setStatus] = useState(submission.status);
  const [internalNotes, setInternalNotes] = useState(submission.internal_notes || '');
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const dirty = status !== submission.status || internalNotes !== (submission.internal_notes || '');

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('interest_submissions')
        .update({
          status,
          internal_notes: internalNotes.trim() || null,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', submission.id);
      if (error) throw error;
      toast.success('Lead updated');
      onUpdate({ ...submission, status, internal_notes: internalNotes.trim() || null });
    } catch (err) {
      console.error('Update failed:', err);
      toast.error('Failed to update lead');
    } finally {
      setSaving(false);
    }
  }, [status, internalNotes, submission, toast, onUpdate]);

  const handleReply = () => {
    const subject = encodeURIComponent(`Re: launching a competition with EliteRank`);
    const body = encodeURIComponent(
      `Hi ${submission.name || 'there'},\n\nThanks for reaching out about your competition concept.`,
    );
    window.location.href = `mailto:${submission.email}?subject=${subject}&body=${body}`;
  };

  const handleConvert = () => {
    // eslint-disable-next-line no-console
    console.log('TODO: convert lead to live competition / start onboarding', submission);
    toast.info('Conversion flow coming soon — wired up in a follow-up.');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, flexWrap: 'wrap' }}>
        <button
          onClick={onBack}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: spacing.xs,
            padding: `${spacing.xs} ${spacing.md}`,
            background: 'transparent', border: `1px solid ${colors.border.primary}`,
            borderRadius: borderRadius.md, color: colors.text.secondary,
            fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium,
            cursor: 'pointer',
          }}
        >
          <ArrowLeft size={14} /> Back to list
        </button>
        <div style={{ display: 'flex', gap: spacing.sm, flexWrap: 'wrap' }}>
          <button
            onClick={handleReply}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: spacing.xs,
              padding: `${spacing.xs} ${spacing.md}`,
              background: 'transparent', border: `1px solid ${colors.border.primary}`,
              borderRadius: borderRadius.md, color: colors.text.primary,
              fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium,
              cursor: 'pointer',
            }}
          >
            <Send size={14} /> Reply to contact
          </button>
          <button
            onClick={handleConvert}
            disabled={submission.status !== 'approved'}
            title={submission.status !== 'approved' ? 'Approve the lead first' : 'Convert to onboarding'}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: spacing.xs,
              padding: `${spacing.xs} ${spacing.md}`,
              background: submission.status === 'approved' ? colors.gold.primary : 'transparent',
              border: `1px solid ${submission.status === 'approved' ? colors.gold.primary : colors.border.primary}`,
              borderRadius: borderRadius.md,
              color: submission.status === 'approved' ? colors.text.inverse : colors.text.tertiary,
              fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold,
              cursor: submission.status === 'approved' ? 'pointer' : 'not-allowed',
              opacity: submission.status === 'approved' ? 1 : 0.6,
            }}
          >
            <ExternalLink size={14} /> Start onboarding
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{
            fontSize: typography.fontSize.xl,
            fontWeight: typography.fontWeight.bold,
            color: colors.text.primary,
            margin: 0,
          }}>{submission.name}</h2>
          <p style={{
            fontSize: typography.fontSize.sm,
            color: colors.text.tertiary,
            margin: 0,
          }}>
            {submission.org_name ? `${submission.org_name} · ` : ''}
            submitted {dateTime(submission.created_at)}
          </p>
        </div>
        <StatusPill status={submission.status} />
      </div>

      <DetailSection title="Contact">
        <DetailRow label="Name">{submission.name}</DetailRow>
        <DetailRow label="Email">
          <a href={`mailto:${submission.email}`} style={{ color: colors.gold.primary, textDecoration: 'none' }}>
            {submission.email}
          </a>
        </DetailRow>
        <DetailRow label="Org">{dash(submission.org_name)}</DetailRow>
        <DetailRow label="Website / social">
          {submission.website_url
            ? (submission.website_url.startsWith('http')
                ? <a href={submission.website_url} target="_blank" rel="noopener noreferrer" style={{ color: colors.gold.primary, textDecoration: 'none' }}>{submission.website_url}</a>
                : submission.website_url)
            : '—'}
        </DetailRow>
        <DetailRow label="Wants to start">{dash(submission.start_timeframe)}</DetailRow>
      </DetailSection>

      <DetailSection title="What they want to launch">
        <p style={{ fontSize: typography.fontSize.sm, color: colors.text.primary, whiteSpace: 'pre-wrap', margin: 0 }}>
          {dash(submission.pitch)}
        </p>
      </DetailSection>

      {submission.message && (
        <DetailSection title="Submitter notes">
          <p style={{ fontSize: typography.fontSize.sm, color: colors.text.primary, whiteSpace: 'pre-wrap', margin: 0 }}>
            {submission.message}
          </p>
        </DetailSection>
      )}

      <DetailSection title="Internal review">
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
          <div>
            <label style={{
              display: 'block',
              fontSize: typography.fontSize.xs,
              color: colors.text.tertiary,
              marginBottom: spacing.xs,
            }}>Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              style={{
                padding: spacing.sm,
                background: colors.background.tertiary,
                border: `1px solid ${colors.border.primary}`,
                borderRadius: borderRadius.md,
                color: colors.text.primary,
                fontSize: typography.fontSize.sm,
                minWidth: 180,
              }}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{
              display: 'block',
              fontSize: typography.fontSize.xs,
              color: colors.text.tertiary,
              marginBottom: spacing.xs,
            }}>Internal notes</label>
            <textarea
              rows={4}
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              placeholder="Notes only super admins see…"
              style={{
                width: '100%',
                padding: spacing.md,
                background: colors.background.tertiary,
                border: `1px solid ${colors.border.primary}`,
                borderRadius: borderRadius.md,
                color: colors.text.primary,
                fontSize: typography.fontSize.sm,
                resize: 'vertical',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <div>
            <button
              onClick={handleSave}
              disabled={!dirty || saving}
              style={{
                padding: `${spacing.sm} ${spacing.lg}`,
                background: dirty ? colors.gold.primary : 'transparent',
                border: `1px solid ${dirty ? colors.gold.primary : colors.border.primary}`,
                borderRadius: borderRadius.md,
                color: dirty ? colors.text.inverse : colors.text.tertiary,
                fontSize: typography.fontSize.sm,
                fontWeight: typography.fontWeight.semibold,
                cursor: dirty && !saving ? 'pointer' : 'not-allowed',
                opacity: saving ? 0.6 : 1,
                transition: `all ${transitions.fast}`,
              }}
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      </DetailSection>
    </div>
  );
}

export default function CompetitionSubmissionsViewer() {
  const toast = useToast();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selected, setSelected] = useState(null);

  const fetchSubmissions = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('interest_submissions')
        .select('*')
        .eq('interest_type', 'launching')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setSubmissions(data || []);
    } catch (err) {
      console.error('Error fetching launch leads:', err);
      toast.error('Failed to load leads');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchSubmissions(); }, [fetchSubmissions]);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return submissions.filter((sub) => {
      if (statusFilter && sub.status !== statusFilter) return false;
      if (!q) return true;
      const hay = `${sub.name || ''} ${sub.email || ''} ${sub.org_name || ''} ${sub.pitch || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [submissions, statusFilter, searchQuery]);

  const stats = useMemo(() => [
    { label: 'Total',     value: submissions.length, icon: FileText, color: colors.gold.primary },
    { label: 'Pending',   value: submissions.filter((s) => s.status === 'pending').length,    icon: Clock,       color: '#eab308' },
    { label: 'In Review', value: submissions.filter((s) => s.status === 'in_review').length, icon: Eye,         color: '#3b82f6' },
    { label: 'Approved',  value: submissions.filter((s) => s.status === 'approved').length,  icon: CheckCircle, color: '#22c55e' },
    { label: 'Rejected',  value: submissions.filter((s) => s.status === 'rejected').length,  icon: XCircle,     color: '#ef4444' },
  ], [submissions]);

  const handleUpdated = (next) => {
    setSubmissions((rows) => rows.map((r) => (r.id === next.id ? { ...r, ...next } : r)));
    setSelected(next);
  };

  if (selected) {
    return (
      <SubmissionDetail
        submission={selected}
        onBack={() => setSelected(null)}
        onUpdate={handleUpdated}
      />
    );
  }

  const columns = [
    {
      key: 'created_at', label: 'Submitted', sortable: true,
      render: (val) => (
        <span style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary, whiteSpace: 'nowrap' }}>
          {new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
      ),
    },
    {
      key: 'name', label: 'Contact', sortable: true,
      render: (val, row) => (
        <span style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium }}>{val}</span>
          <span style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary }}>{row.email}</span>
        </span>
      ),
    },
    {
      key: 'org_name', label: 'Org', sortable: true,
      render: (val) => (
        <span style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
          <Building2 size={14} style={{ color: colors.text.tertiary, flexShrink: 0 }} />
          <span>{val || <span style={{ color: colors.text.tertiary }}>—</span>}</span>
        </span>
      ),
    },
    {
      key: 'pitch', label: 'Looking to launch', sortable: false,
      render: (val) => (
        <span style={{
          display: 'flex', alignItems: 'flex-start', gap: spacing.xs,
          fontSize: typography.fontSize.xs, color: colors.text.secondary,
          maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          <MessageSquare size={12} style={{ color: colors.text.tertiary, flexShrink: 0, marginTop: 2 }} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{val || '—'}</span>
        </span>
      ),
    },
    { key: 'start_timeframe', label: 'Wants to start', sortable: true },
    {
      key: 'status', label: 'Status', sortable: true,
      render: (val) => <StatusPill status={val} />,
    },
    {
      key: 'action', label: '', sortable: false, width: '60px',
      render: () => (
        <span style={{ color: colors.gold.primary, fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold }}>
          Open →
        </span>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
      <StatRow stats={stats} />
      <FilterBar
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search name, email, org, pitch…"
        filters={[
          { key: 'status', label: 'Status', options: STATUS_OPTIONS, value: statusFilter },
        ]}
        onFilterChange={(key, value) => {
          if (key === 'status') setStatusFilter(value);
        }}
      />
      <DataTable
        columns={columns}
        data={filtered}
        loading={loading}
        onRowClick={(row) => setSelected(row)}
        emptyMessage={
          searchQuery || statusFilter
            ? 'No leads match your filters.'
            : 'No leads yet.'
        }
      />
    </div>
  );
}

/**
 * Hook that returns the count of pending launch leads for the sidebar
 * badge. Filtered to interest_type='launching' so the existing per-comp
 * interest submissions don't bleed into this count.
 */
export function usePendingSubmissionCount() {
  const [count, setCount] = useState(0);

  const fetchCount = useCallback(async () => {
    if (!supabase) return;
    const { count: c, error } = await supabase
      .from('interest_submissions')
      .select('id', { count: 'exact', head: true })
      .eq('interest_type', 'launching')
      .eq('status', 'pending');
    if (!error && typeof c === 'number') setCount(c);
  }, []);

  useEffect(() => {
    fetchCount();
    if (!supabase) return undefined;
    const channel = supabase
      .channel('launch_leads_pending_count')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'interest_submissions' },
        fetchCount,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchCount]);

  return count;
}
