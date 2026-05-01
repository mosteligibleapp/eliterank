import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Building2, CheckCircle, XCircle, Clock, Eye,
  ArrowLeft, ExternalLink, Send, FileText, Trophy,
} from 'lucide-react';
import { colors, spacing, borderRadius, typography, transitions } from '@shared/styles/theme';
import { supabase } from '@shared/lib/supabase';
import { useToast } from '@shared/contexts/ToastContext';
import FilterBar from '../../../components/FilterBar';
import DataTable from '../../../components/DataTable';
import StatRow from '../../../components/StatRow';

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

function DetailRow({ label, children }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '160px 1fr',
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
        .from('competition_submissions')
        .update({
          status,
          internal_notes: internalNotes.trim() || null,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', submission.id);
      if (error) throw error;
      toast.success('Submission updated');
      onUpdate({ ...submission, status, internal_notes: internalNotes.trim() || null });
    } catch (err) {
      console.error('Update failed:', err);
      toast.error('Failed to update submission');
    } finally {
      setSaving(false);
    }
  }, [status, internalNotes, submission, toast, onUpdate]);

  const handleReply = () => {
    const subject = encodeURIComponent(`Re: ${submission.competition_name} on EliteRank`);
    const body = encodeURIComponent(
      `Hi ${submission.contact_name || 'there'},\n\nThanks for submitting your concept for ${submission.competition_name}.`,
    );
    window.location.href = `mailto:${submission.contact_email}?subject=${subject}&body=${body}`;
  };

  const handleConvert = () => {
    // eslint-disable-next-line no-console
    console.log('TODO: convert submission to live competition', submission);
    toast.info('Conversion flow coming soon — wired up in a follow-up.');
  };

  const ageRange = submission.no_age_restrictions
    ? 'No age restrictions'
    : `${submission.age_min ?? '?'}-${submission.age_max ?? '?'}`;

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
            title={submission.status !== 'approved' ? 'Approve the submission first' : 'Convert to live competition'}
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
            <ExternalLink size={14} /> Convert to live competition
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
          }}>{submission.competition_name}</h2>
          <p style={{
            fontSize: typography.fontSize.sm,
            color: colors.text.tertiary,
            margin: 0,
          }}>
            {submission.org_name} · submitted {dateTime(submission.created_at)}
          </p>
        </div>
        <StatusPill status={submission.status} />
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: spacing.lg,
      }}>
        <DetailSection title="Organization">
          <DetailRow label="Org name">{submission.org_name} {submission.org_is_new ? '(new)' : '(existing)'}</DetailRow>
          <DetailRow label="Contact">{dash(submission.contact_name)}</DetailRow>
          <DetailRow label="Email">
            <a href={`mailto:${submission.contact_email}`} style={{ color: colors.gold.primary, textDecoration: 'none' }}>
              {submission.contact_email}
            </a>
          </DetailRow>
        </DetailSection>

        <DetailSection title="Competition">
          <DetailRow label="Name">{dash(submission.competition_name)}</DetailRow>
          <DetailRow label="Category">{submission.category_other || submission.category}</DetailRow>
          <DetailRow label="Scope">{submission.scope}</DetailRow>
        </DetailSection>

        <DetailSection title="Eligibility">
          <DetailRow label="Genders">{(submission.gender_eligibility || []).join(', ') || '—'}</DetailRow>
          <DetailRow label="Ages">{ageRange}</DetailRow>
        </DetailSection>

        <DetailSection title="Presence">
          <DetailRow label="Website">
            {submission.website_url ? (
              <a href={submission.website_url} target="_blank" rel="noopener noreferrer" style={{ color: colors.gold.primary, textDecoration: 'none' }}>
                {submission.website_url}
              </a>
            ) : '—'}
          </DetailRow>
          <DetailRow label="Social">
            {submission.social_url ? (
              <a href={submission.social_url} target="_blank" rel="noopener noreferrer" style={{ color: colors.gold.primary, textDecoration: 'none' }}>
                {submission.social_url}
              </a>
            ) : '—'}
          </DetailRow>
        </DetailSection>

        <DetailSection title="Revenue">
          <DetailRow label="Models">{(submission.revenue_models || []).join(', ') || '—'}</DetailRow>
        </DetailSection>

        <DetailSection title="Timing">
          <DetailRow label="Wants to start">{dash(submission.start_timeframe)}</DetailRow>
        </DetailSection>
      </div>

      {submission.notes && (
        <DetailSection title="Submitter notes">
          <p style={{ fontSize: typography.fontSize.sm, color: colors.text.primary, whiteSpace: 'pre-wrap', margin: 0 }}>
            {submission.notes}
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
        .from('competition_submissions')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setSubmissions(data || []);
    } catch (err) {
      console.error('Error fetching competition submissions:', err);
      toast.error('Failed to load submissions');
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
      const hay = `${sub.org_name} ${sub.contact_name || ''} ${sub.contact_email} ${sub.competition_name || ''} ${sub.scope || ''}`.toLowerCase();
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
      key: 'org_name', label: 'Org', sortable: true,
      render: (val, row) => (
        <span style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
          <Building2 size={14} style={{ color: colors.text.tertiary, flexShrink: 0 }} />
          <span style={{ fontWeight: typography.fontWeight.medium }}>
            {val} {row.org_is_new ? '' : <span style={{ color: colors.text.tertiary, fontSize: typography.fontSize.xs }}>(existing)</span>}
          </span>
        </span>
      ),
    },
    {
      key: 'contact_name', label: 'Contact', sortable: true,
      render: (val, row) => (
        <span style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: typography.fontSize.sm }}>{val || '—'}</span>
          <span style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary }}>{row.contact_email}</span>
        </span>
      ),
    },
    {
      key: 'competition_name', label: 'Competition', sortable: true,
      render: (val) => (
        <span style={{ display: 'flex', alignItems: 'center', gap: spacing.xs }}>
          <Trophy size={12} style={{ color: colors.gold.primary, flexShrink: 0 }} />
          {val || <span style={{ color: colors.text.tertiary }}>(unnamed)</span>}
        </span>
      ),
    },
    { key: 'scope', label: 'Scope', sortable: true },
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
        searchPlaceholder="Search org, contact, competition, scope…"
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
            ? 'No submissions match your filters.'
            : 'No competition submissions yet.'
        }
      />
    </div>
  );
}

/**
 * Hook that returns the count of pending competition submissions for the
 * sidebar badge. Polled lightly via realtime so the count stays fresh.
 */
export function usePendingSubmissionCount() {
  const [count, setCount] = useState(0);

  const fetchCount = useCallback(async () => {
    if (!supabase) return;
    const { count: c, error } = await supabase
      .from('competition_submissions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending');
    if (!error && typeof c === 'number') setCount(c);
  }, []);

  useEffect(() => {
    fetchCount();
    if (!supabase) return undefined;
    const channel = supabase
      .channel('competition_submissions_pending_count')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'competition_submissions' },
        fetchCount,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchCount]);

  return count;
}
