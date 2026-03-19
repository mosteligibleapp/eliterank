import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Users, UserCheck, Clock, Eye, Trash2, Check, X } from 'lucide-react';
import { colors, spacing, borderRadius, typography } from '@shared/styles/theme';
import { supabase } from '@shared/lib/supabase';
import StatRow from '../../../components/StatRow';
import FilterBar from '../../../components/FilterBar';
import DataTable from '../../../components/DataTable';
import ActionMenu from '../../../components/ActionMenu';

export default function HostsManager() {
  const [hosts, setHosts] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchHosts = useCallback(async () => {
    if (!supabase) { setHosts([]); return; }
    try {
      const { data, error } = await supabase.from('users').select('*').contains('roles', ['host']).order('created_at', { ascending: false });
      if (error) { setHosts([]); return; }
      setHosts((data || []).map(h => ({
        id: h.id,
        name: `${h.first_name || ''} ${h.last_name || ''}`.trim() || h.email,
        email: h.email,
        city: h.city || 'Not specified',
        avatar: h.avatar_url,
        instagram: h.instagram,
        linkedin: h.linkedin,
        joinedAt: h.created_at?.split('T')[0] || 'Unknown',
        competitions: 0,
        totalRevenue: 0,
        status: 'active',
      })));
    } catch { setHosts([]); }
  }, []);

  const fetchApplications = useCallback(async () => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('interest_submissions').select('*').eq('interest_type', 'hosting').eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (error) { setApplications([]); return; }
      setApplications((data || []).map(app => ({
        id: app.id,
        name: app.name || 'Unknown',
        email: app.email,
        city: '',
        experience: '',
        socialFollowing: 0,
        instagram: '',
        linkedin: '',
        whyHost: app.message || '',
        status: app.status,
        appliedAt: app.created_at?.split('T')[0] || 'Unknown',
      })));
    } catch { setApplications([]); }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setLoading(true);
      const timeout = setTimeout(() => { if (isMounted) setLoading(false); }, 10000);
      try { await Promise.all([fetchHosts(), fetchApplications()]); }
      catch { /* silent */ }
      finally { clearTimeout(timeout); if (isMounted) setLoading(false); }
    };
    load();
    return () => { isMounted = false; };
  }, [fetchHosts, fetchApplications]);

  const handleApprove = async (applicationId) => {
    if (!supabase) return;
    if (!applications.find(a => a.id === applicationId)) return;
    try {
      const { error } = await supabase.from('interest_submissions')
        .update({ status: 'approved', reviewed_at: new Date().toISOString() }).eq('id', applicationId);
      if (error) throw error;
      await Promise.all([fetchHosts(), fetchApplications()]);
    } catch (err) { console.error('Error approving application:', err); }
  };

  const handleReject = async (applicationId) => {
    if (!supabase) return;
    try {
      const { error } = await supabase.from('interest_submissions')
        .update({ status: 'rejected', reviewed_at: new Date().toISOString() }).eq('id', applicationId);
      if (error) throw error;
      await fetchApplications();
    } catch (err) { console.error('Error rejecting application:', err); }
  };

  const showPending = statusFilter === 'pending';

  const filteredHosts = useMemo(() => {
    if (!searchValue) return hosts;
    const q = searchValue.toLowerCase();
    return hosts.filter(h => h.name.toLowerCase().includes(q) || h.email.toLowerCase().includes(q));
  }, [hosts, searchValue]);

  const filteredApplications = useMemo(() => {
    if (!searchValue) return applications;
    const q = searchValue.toLowerCase();
    return applications.filter(a => a.name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q));
  }, [applications, searchValue]);

  const stats = useMemo(() => [
    { label: 'Total Hosts', value: hosts.length, icon: Users },
    { label: 'Active', value: hosts.filter(h => h.status === 'active').length, icon: UserCheck, color: colors.status.success },
    { label: 'Pending Applications', value: applications.length, icon: Clock, color: colors.status.warning },
  ], [hosts, applications]);

  const hostColumns = useMemo(() => [
    {
      key: 'name', label: 'Host', sortable: true,
      render: (_, row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
          <div style={S.avatar}>
            {row.avatar ? <img src={row.avatar} alt="" style={S.avatarImg} /> : row.name.charAt(0).toUpperCase()}
          </div>
          <span style={{ fontWeight: typography.fontWeight.medium }}>{row.name}</span>
        </div>
      ),
    },
    { key: 'email', label: 'Email', sortable: true },
    { key: 'competitions', label: 'Competitions', sortable: true, width: '120px' },
    { key: 'totalRevenue', label: 'Revenue', sortable: true, width: '100px', render: (val) => `$${((val || 0) / 1000).toFixed(0)}K` },
    { key: 'joinedAt', label: 'Joined', sortable: true, width: '110px' },
  ], []);

  const appColumns = useMemo(() => [
    {
      key: 'name', label: 'Applicant', sortable: true,
      render: (_, row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
          <div style={{ ...S.avatar, background: 'linear-gradient(135deg, #f59e0b, #fbbf24)', color: '#000' }}>
            {row.name.charAt(0).toUpperCase()}
          </div>
          <span style={{ fontWeight: typography.fontWeight.medium }}>{row.name}</span>
        </div>
      ),
    },
    { key: 'email', label: 'Email', sortable: true },
    {
      key: 'whyHost', label: 'Message',
      render: (val) => <span style={{ color: colors.text.secondary }}>{val ? (val.length > 60 ? val.substring(0, 60) + '...' : val) : '--'}</span>,
    },
    { key: 'appliedAt', label: 'Applied', sortable: true, width: '110px' },
  ], []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
      <div>
        <h1 style={S.title}>Host Management</h1>
        <p style={S.subtitle}>Manage hosts and review applications</p>
      </div>

      <StatRow stats={stats} />

      <FilterBar
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        searchPlaceholder="Search hosts..."
        filters={[{
          key: 'status', label: 'Status',
          options: [
            { value: '', label: `Active Hosts (${hosts.length})` },
            { value: 'pending', label: `Pending (${applications.length})` },
          ],
          value: statusFilter,
        }]}
        onFilterChange={(key, value) => { if (key === 'status') setStatusFilter(value); }}
      />

      {!showPending && (
        <DataTable
          columns={hostColumns}
          data={filteredHosts}
          loading={loading}
          emptyMessage="No hosts found. Hosts will appear when users are assigned the host role."
          actions={(row) => (
            <ActionMenu actions={[
              { label: 'View Profile', icon: Eye, onClick: () => { /* placeholder */ } },
              { label: 'Remove Host', icon: Trash2, variant: 'danger', onClick: () => { /* placeholder */ } },
            ]} />
          )}
        />
      )}

      {showPending && (
        <DataTable
          columns={appColumns}
          data={filteredApplications}
          loading={loading}
          emptyMessage="No pending applications. All host applications have been reviewed."
          expandable
          renderExpanded={(row) => (
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
              {row.whyHost && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
                  <span style={S.expandLabel}>Message</span>
                  <p style={S.expandText}>{row.whyHost}</p>
                </div>
              )}
              {row.experience && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
                  <span style={S.expandLabel}>Experience</span>
                  <p style={S.expandText}>{row.experience}</p>
                </div>
              )}
            </div>
          )}
          actions={(row) => (
            <ActionMenu actions={[
              { label: 'Approve', icon: Check, onClick: () => handleApprove(row.id) },
              { label: 'Reject', icon: X, variant: 'danger', onClick: () => handleReject(row.id) },
            ]} />
          )}
        />
      )}
    </div>
  );
}

const S = {
  title: { fontSize: typography.fontSize.xxl, fontWeight: typography.fontWeight.bold, marginBottom: spacing.xs, color: colors.text.primary },
  subtitle: { color: colors.text.secondary, fontSize: typography.fontSize.sm },
  avatar: { width: '28px', height: '28px', borderRadius: borderRadius.full, background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.bold, color: '#fff', flexShrink: 0, overflow: 'hidden' },
  avatarImg: { width: '100%', height: '100%', objectFit: 'cover', borderRadius: borderRadius.full },
  expandLabel: { fontSize: typography.fontSize.xs, color: colors.text.tertiary, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: typography.fontWeight.semibold },
  expandText: { fontSize: typography.fontSize.sm, color: colors.text.secondary, lineHeight: 1.6, margin: 0 },
};
