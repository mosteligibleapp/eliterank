import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Mail, Phone, User, Download, Building2, DollarSign, Trophy, Award,
  CheckCircle, XCircle, MessageSquare, Calendar
} from 'lucide-react';
import { colors, spacing, borderRadius, typography } from '@shared/styles/theme';
import { supabase } from '@shared/lib/supabase';
import { useToast } from '@shared/contexts/ToastContext';
import {
  INTEREST_TYPE,
  INTEREST_TYPE_CONFIG,
  ONBOARDING_INTEREST_TYPES,
  COMPETITION_TYPE_OPTIONS,
  TARGET_DEMOGRAPHIC_OPTIONS,
  EXPECTED_CONTESTANTS_OPTIONS,
  LAUNCH_TIMEFRAME_OPTIONS,
  BUDGET_RANGE_OPTIONS,
} from '@shared/types/competition';
import FilterBar from '../../../components/FilterBar';
import DataTable from '../../../components/DataTable';
import StatRow from '../../../components/StatRow';
import ActionMenu from '../../../components/ActionMenu';

const INTEREST_ICONS = {
  [INTEREST_TYPE.HOSTING]: Building2,
  [INTEREST_TYPE.SPONSORING]: DollarSign,
  [INTEREST_TYPE.COMPETING]: Trophy,
  [INTEREST_TYPE.JUDGING]: Award,
};

const INTEREST_COLORS = {
  [INTEREST_TYPE.HOSTING]: '#8b5cf6',
  [INTEREST_TYPE.SPONSORING]: '#22c55e',
  [INTEREST_TYPE.COMPETING]: '#f59e0b',
  [INTEREST_TYPE.JUDGING]: '#3b82f6',
};

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

const TYPE_OPTIONS = Object.entries(INTEREST_TYPE).map(([_, value]) => ({
  value,
  label: INTEREST_TYPE_CONFIG[value]?.label || value,
}));

const buildLookup = (options) =>
  options.reduce((acc, opt) => ({ ...acc, [opt.value]: opt.label }), {});

const ONBOARDING_LOOKUPS = {
  competition_type: buildLookup(COMPETITION_TYPE_OPTIONS),
  target_demographic: buildLookup(TARGET_DEMOGRAPHIC_OPTIONS),
  expected_contestants: buildLookup(EXPECTED_CONTESTANTS_OPTIONS),
  target_launch_timeframe: buildLookup(LAUNCH_TIMEFRAME_OPTIONS),
  budget_range: buildLookup(BUDGET_RANGE_OPTIONS),
};

const ONBOARDING_DETAIL_FIELDS = [
  { key: 'competition_type', label: 'Competition Type' },
  { key: 'target_demographic', label: 'Demographic' },
  { key: 'expected_contestants', label: 'Expected Contestants' },
  { key: 'target_launch_timeframe', label: 'Launch Timeframe' },
  { key: 'budget_range', label: 'Budget' },
];

const formatBool = (val) => {
  if (val === true) return 'Yes';
  if (val === false) return 'No';
  return null;
};

export default function InterestSubmissionsViewer({ competition }) {
  const toast = useToast();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const fetchSubmissions = useCallback(async () => {
    if (!supabase || !competition?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('interest_submissions')
        .select('*')
        .eq('competition_id', competition.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setSubmissions(data || []);
    } catch (err) {
      console.error('Error fetching submissions:', err);
      toast.error('Failed to load submissions');
    } finally {
      setLoading(false);
    }
  }, [competition?.id, toast]);

  useEffect(() => { fetchSubmissions(); }, [fetchSubmissions]);

  const updateSubmissionStatus = async (submissionId, status) => {
    try {
      const { error } = await supabase
        .from('interest_submissions')
        .update({ status, reviewed_at: new Date().toISOString() })
        .eq('id', submissionId);
      if (error) throw error;
      toast.success(`Submission marked as ${status}`);
      fetchSubmissions();
    } catch (err) {
      console.error('Error updating submission:', err);
      toast.error('Failed to update submission');
    }
  };

  // Filter
  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return submissions.filter(sub => {
      if (statusFilter) {
        const subStatus = sub.status || 'pending';
        if (subStatus !== statusFilter) return false;
      }
      if (typeFilter && sub.interest_type !== typeFilter) return false;
      if (q) {
        const name = (sub.name || '').toLowerCase();
        const email = (sub.email || '').toLowerCase();
        if (!name.includes(q) && !email.includes(q)) return false;
      }
      return true;
    });
  }, [submissions, searchQuery, statusFilter, typeFilter]);

  // Stats
  const stats = useMemo(() => [
    { label: 'Total Submissions', value: submissions.length, icon: Mail, color: colors.gold.primary },
    { label: 'Pending', value: submissions.filter(s => !s.status || s.status === 'pending').length, icon: Calendar, color: '#eab308' },
    { label: 'Approved', value: submissions.filter(s => s.status === 'approved').length, icon: CheckCircle, color: '#22c55e' },
    { label: 'Rejected', value: submissions.filter(s => s.status === 'rejected').length, icon: XCircle, color: '#ef4444' },
  ], [submissions]);

  // CSV export
  const exportToCsv = () => {
    const headers = [
      'Name', 'Email', 'Phone', 'Interest Type', 'Message',
      'Competition Type', 'Demographic', 'Target City', 'Target State',
      'Expected Contestants', 'Launch Timeframe', 'Budget',
      'Has Venue', 'Has Audience', 'Goals',
      'Status', 'Submitted At',
    ];
    const rows = filtered.map(sub => [
      sub.name,
      sub.email,
      sub.phone || '',
      INTEREST_TYPE_CONFIG[sub.interest_type]?.label || sub.interest_type,
      sub.message || '',
      ONBOARDING_LOOKUPS.competition_type[sub.competition_type] || sub.competition_type || '',
      ONBOARDING_LOOKUPS.target_demographic[sub.target_demographic] || sub.target_demographic || '',
      sub.target_city || '',
      sub.target_state || '',
      ONBOARDING_LOOKUPS.expected_contestants[sub.expected_contestants] || sub.expected_contestants || '',
      ONBOARDING_LOOKUPS.target_launch_timeframe[sub.target_launch_timeframe] || sub.target_launch_timeframe || '',
      ONBOARDING_LOOKUPS.budget_range[sub.budget_range] || sub.budget_range || '',
      formatBool(sub.has_venue) || '',
      formatBool(sub.has_audience) || '',
      sub.goals || '',
      sub.status || 'pending',
      new Date(sub.created_at).toLocaleString(),
    ]);
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `interest-submissions-${competition?.id || 'all'}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Submissions exported successfully');
  };

  // Show placeholder when no competition selected
  if (!competition?.id) {
    return (
      <div style={{
        textAlign: 'center', padding: spacing.xxxl,
        color: colors.text.tertiary,
      }}>
        <Mail size={48} style={{ marginBottom: spacing.md, opacity: 0.5 }} />
        <h3 style={{ fontSize: typography.fontSize.lg, marginBottom: spacing.sm, color: colors.text.secondary }}>
          No Competition Selected
        </h3>
        <p style={{ fontSize: typography.fontSize.sm }}>
          Select a competition from the Competitions tab to view interest submissions.
        </p>
      </div>
    );
  }

  // Table columns
  const columns = [
    {
      key: 'name', label: 'Name', sortable: true,
      render: (val, row) => {
        const Icon = INTEREST_ICONS[row.interest_type] || User;
        const color = INTEREST_COLORS[row.interest_type] || colors.text.tertiary;
        return (
          <span style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
            <span style={{
              width: '24px', height: '24px', borderRadius: borderRadius.sm, flexShrink: 0,
              background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon size={12} style={{ color }} />
            </span>
            <span style={{ fontWeight: typography.fontWeight.medium }}>{val}</span>
          </span>
        );
      },
    },
    {
      key: 'email', label: 'Email', sortable: true,
      render: (val) => (
        <span style={{ fontSize: typography.fontSize.xs, color: colors.text.secondary }}>{val}</span>
      ),
    },
    {
      key: 'interest_type', label: 'Type', sortable: true,
      render: (val) => {
        const color = INTEREST_COLORS[val] || colors.text.tertiary;
        return (
          <span style={{
            padding: `2px ${spacing.sm}`, borderRadius: borderRadius.sm, fontSize: typography.fontSize.xs,
            background: `${color}20`, color,
          }}>
            {INTEREST_TYPE_CONFIG[val]?.label || val}
          </span>
        );
      },
    },
    {
      key: 'status', label: 'Status', sortable: true,
      render: (val) => {
        const status = val || 'pending';
        const cfgMap = {
          pending: { bg: 'rgba(234,179,8,0.15)', color: '#eab308' },
          approved: { bg: 'rgba(34,197,94,0.15)', color: '#22c55e' },
          rejected: { bg: 'rgba(239,68,68,0.15)', color: '#ef4444' },
        };
        const cfg = cfgMap[status] || cfgMap.pending;
        return (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            padding: `2px ${spacing.sm}`, borderRadius: borderRadius.sm, fontSize: typography.fontSize.xs,
            background: cfg.bg, color: cfg.color, textTransform: 'capitalize',
          }}>
            {status === 'approved' && <CheckCircle size={10} />}
            {status === 'rejected' && <XCircle size={10} />}
            {status}
          </span>
        );
      },
    },
    {
      key: 'created_at', label: 'Submitted', sortable: true,
      render: (val) => (
        <span style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary }}>
          {new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
      ),
    },
  ];

  // Expanded row
  const renderExpanded = (row) => {
    const isOnboarding = ONBOARDING_INTEREST_TYPES.includes(row.interest_type);
    const onboardingDetails = isOnboarding
      ? ONBOARDING_DETAIL_FIELDS
          .map(({ key, label }) => {
            const raw = row[key];
            if (!raw) return null;
            const display = ONBOARDING_LOOKUPS[key]?.[raw] || raw;
            return { key, label, display };
          })
          .filter(Boolean)
      : [];
    const targetLocation = isOnboarding && (row.target_city || row.target_state)
      ? [row.target_city, row.target_state].filter(Boolean).join(', ')
      : null;
    if (targetLocation) {
      onboardingDetails.push({ key: 'target_location', label: 'Target Location', display: targetLocation });
    }
    const venueLabel = isOnboarding ? formatBool(row.has_venue) : null;
    if (venueLabel) {
      onboardingDetails.push({ key: 'has_venue', label: 'Venue Secured', display: venueLabel });
    }
    const audienceLabel = isOnboarding ? formatBool(row.has_audience) : null;
    if (audienceLabel) {
      onboardingDetails.push({ key: 'has_audience', label: 'Existing Audience', display: audienceLabel });
    }

    return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
      <div style={{ display: 'flex', gap: spacing.xl, flexWrap: 'wrap', fontSize: typography.fontSize.sm }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: spacing.xs, color: colors.text.secondary }}>
          <Mail size={14} />
          <a href={`mailto:${row.email}`} style={{ color: colors.gold.primary, textDecoration: 'none' }}>{row.email}</a>
        </span>
        {row.phone && (
          <span style={{ display: 'flex', alignItems: 'center', gap: spacing.xs, color: colors.text.secondary }}>
            <Phone size={14} />
            <a href={`tel:${row.phone}`} style={{ color: colors.gold.primary, textDecoration: 'none' }}>{row.phone}</a>
          </span>
        )}
      </div>
      {onboardingDetails.length > 0 && (
        <div style={{
          background: colors.background.card, borderRadius: borderRadius.sm,
          padding: spacing.md, border: `1px solid ${colors.border.secondary}`,
        }}>
          <div style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary, marginBottom: spacing.sm }}>
            Onboarding Details
          </div>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: spacing.sm,
          }}>
            {onboardingDetails.map(({ key, label, display }) => (
              <div key={key}>
                <div style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary }}>{label}</div>
                <div style={{ fontSize: typography.fontSize.sm, color: colors.text.primary }}>{display}</div>
              </div>
            ))}
          </div>
          {row.goals && (
            <div style={{ marginTop: spacing.md }}>
              <div style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary, marginBottom: spacing.xs }}>
                Goals
              </div>
              <p style={{ fontSize: typography.fontSize.sm, color: colors.text.primary, whiteSpace: 'pre-wrap', margin: 0 }}>
                {row.goals}
              </p>
            </div>
          )}
        </div>
      )}
      {row.message && (
        <div style={{
          background: colors.background.card, borderRadius: borderRadius.sm,
          padding: spacing.md, border: `1px solid ${colors.border.secondary}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xs }}>
            <MessageSquare size={12} style={{ color: colors.text.tertiary }} />
            <span style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary }}>Message</span>
          </div>
          <p style={{ fontSize: typography.fontSize.sm, color: colors.text.primary, whiteSpace: 'pre-wrap', margin: 0 }}>
            {row.message}
          </p>
        </div>
      )}
      <div style={{ display: 'flex', gap: spacing.sm }}>
        <button
          onClick={() => updateSubmissionStatus(row.id, 'approved')}
          disabled={row.status === 'approved'}
          style={{
            display: 'flex', alignItems: 'center', gap: spacing.xs,
            padding: `${spacing.xs} ${spacing.md}`, border: 'none', borderRadius: borderRadius.sm,
            background: row.status === 'approved' ? 'rgba(34,197,94,0.08)' : 'rgba(34,197,94,0.15)',
            color: '#22c55e', fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.medium,
            cursor: row.status === 'approved' ? 'not-allowed' : 'pointer',
            opacity: row.status === 'approved' ? 0.5 : 1,
          }}
        >
          <CheckCircle size={12} /> Approve
        </button>
        <button
          onClick={() => updateSubmissionStatus(row.id, 'rejected')}
          disabled={row.status === 'rejected'}
          style={{
            display: 'flex', alignItems: 'center', gap: spacing.xs,
            padding: `${spacing.xs} ${spacing.md}`, border: 'none', borderRadius: borderRadius.sm,
            background: row.status === 'rejected' ? 'rgba(239,68,68,0.08)' : 'rgba(239,68,68,0.15)',
            color: '#ef4444', fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.medium,
            cursor: row.status === 'rejected' ? 'not-allowed' : 'pointer',
            opacity: row.status === 'rejected' ? 0.5 : 1,
          }}
        >
          <XCircle size={12} /> Reject
        </button>
      </div>
    </div>
  );
  };

  // Export button
  const actionBtnStyle = {
    display: 'flex', alignItems: 'center', gap: spacing.xs,
    height: '32px', padding: `0 ${spacing.md}`,
    background: 'transparent', border: `1px solid ${colors.border.primary}`,
    borderRadius: borderRadius.md, color: colors.text.secondary,
    fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium,
    cursor: filtered.length === 0 ? 'not-allowed' : 'pointer',
    opacity: filtered.length === 0 ? 0.5 : 1,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
      {competition && (
        <p style={{ fontSize: typography.fontSize.sm, color: colors.text.tertiary, margin: 0 }}>
          {competition?.organization?.name ? `${competition.organization.name} - ` : ''}
          {competition?.city?.name || ''} {competition?.season || ''}
        </p>
      )}

      <StatRow stats={stats} />

      <FilterBar
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search by name or email..."
        filters={[
          { key: 'status', label: 'Status', options: STATUS_OPTIONS, value: statusFilter },
          { key: 'type', label: 'Interest Type', options: TYPE_OPTIONS, value: typeFilter },
        ]}
        onFilterChange={(key, value) => {
          if (key === 'status') setStatusFilter(value);
          if (key === 'type') setTypeFilter(value);
        }}
        actions={
          <button style={actionBtnStyle} onClick={exportToCsv} disabled={filtered.length === 0}>
            <Download size={14} /> Export CSV
          </button>
        }
      />

      <DataTable
        columns={columns}
        data={filtered}
        loading={loading}
        emptyMessage={searchQuery || statusFilter || typeFilter
          ? 'No submissions match the selected filters.'
          : 'No one has submitted an interest form yet.'}
        expandable
        renderExpanded={renderExpanded}
        actions={(row) => (
          <ActionMenu actions={[
            {
              label: 'Approve',
              icon: CheckCircle,
              onClick: () => updateSubmissionStatus(row.id, 'approved'),
              disabled: row.status === 'approved',
            },
            {
              label: 'Reject',
              icon: XCircle,
              variant: 'danger',
              onClick: () => updateSubmissionStatus(row.id, 'rejected'),
              disabled: row.status === 'rejected',
            },
          ]} />
        )}
      />
    </div>
  );
}
