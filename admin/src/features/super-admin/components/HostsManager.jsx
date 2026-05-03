import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Users, UserCheck, Clock, Eye, Trash2, Check, X, Plus, AlertTriangle } from 'lucide-react';
import { colors, spacing, borderRadius, typography } from '@shared/styles/theme';
import { Button } from '@shared/components/ui';
import { supabase } from '@shared/lib/supabase';
import StatRow from '../../../components/StatRow';
import FilterBar from '../../../components/FilterBar';
import DataTable from '../../../components/DataTable';
import ActionMenu from '../../../components/ActionMenu';
import FormModal from '../../../components/FormModal';
import { FormField, TextInput } from '../../../components/FormField';

export default function HostsManager() {
  const [hosts, setHosts] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Add Host modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addEmail, setAddEmail] = useState('');
  const [addError, setAddError] = useState('');
  const [addSubmitting, setAddSubmitting] = useState(false);

  // Remove Host modal state
  const [hostToRemove, setHostToRemove] = useState(null);
  const [removeSubmitting, setRemoveSubmitting] = useState(false);

  const fetchHosts = useCallback(async () => {
    if (!supabase) { setHosts([]); return; }
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('is_host', true).order('created_at', { ascending: false });
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

  const openAddModal = () => {
    setAddEmail('');
    setAddError('');
    setShowAddModal(true);
  };

  const closeAddModal = () => {
    if (addSubmitting) return;
    setShowAddModal(false);
    setAddEmail('');
    setAddError('');
  };

  const handleAddHost = async () => {
    if (!supabase) return;
    const email = addEmail.trim().toLowerCase();
    if (!email) { setAddError('Email is required.'); return; }
    setAddError('');
    setAddSubmitting(true);
    try {
      const { data: profile, error: lookupErr } = await supabase
        .from('profiles')
        .select('id, email, is_host')
        .ilike('email', email)
        .maybeSingle();
      if (lookupErr) throw lookupErr;
      if (!profile) {
        setAddError('No user found with that email. The user must sign up first.');
        return;
      }
      if (profile.is_host) {
        setAddError('This user is already a host.');
        return;
      }
      const { error: updateErr } = await supabase
        .from('profiles')
        .update({ is_host: true })
        .eq('id', profile.id);
      if (updateErr) throw updateErr;
      await fetchHosts();
      setShowAddModal(false);
      setAddEmail('');
    } catch (err) {
      console.error('Error adding host:', err);
      setAddError(err?.message || 'Failed to add host.');
    } finally {
      setAddSubmitting(false);
    }
  };

  const handleRemoveHost = async () => {
    if (!supabase || !hostToRemove) return;
    setRemoveSubmitting(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_host: false })
        .eq('id', hostToRemove.id);
      if (error) throw error;
      await fetchHosts();
      setHostToRemove(null);
    } catch (err) {
      console.error('Error removing host:', err);
    } finally {
      setRemoveSubmitting(false);
    }
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
      <div style={S.headerRow}>
        <div>
          <h1 style={S.title}>Host Management</h1>
          <p style={S.subtitle}>Manage hosts and review applications</p>
        </div>
        {!showPending && (
          <Button icon={Plus} onClick={openAddModal}>
            Add Host
          </Button>
        )}
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
          emptyMessage="No hosts found. Add an existing user as a host to get started."
          actions={(row) => (
            <ActionMenu actions={[
              { label: 'View Profile', icon: Eye, onClick: () => { /* placeholder */ } },
              { label: 'Remove Host', icon: Trash2, variant: 'danger', onClick: () => setHostToRemove(row) },
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

      {/* ── Add Host Modal ─────────────────────────────── */}
      <FormModal
        isOpen={showAddModal}
        onClose={closeAddModal}
        title="Add Host"
        subtitle="Promote an existing user to host"
        onSubmit={handleAddHost}
        submitLabel={addSubmitting ? 'Adding...' : 'Add Host'}
        loading={addSubmitting}
        size="sm"
      >
        <FormField
          label="User email"
          description="The user must already have an EliteRank account."
          error={addError}
          required
        >
          <TextInput
            type="email"
            value={addEmail}
            onChange={(e) => setAddEmail(e.target.value)}
            placeholder="user@example.com"
            autoFocus
          />
        </FormField>
      </FormModal>

      {/* ── Remove Host Confirmation ───────────────────── */}
      <FormModal
        isOpen={!!hostToRemove}
        onClose={() => { if (!removeSubmitting) setHostToRemove(null); }}
        title="Remove Host?"
        subtitle={hostToRemove ? hostToRemove.name : ''}
        onSubmit={handleRemoveHost}
        submitLabel={removeSubmitting ? 'Removing...' : 'Remove Host'}
        loading={removeSubmitting}
        size="sm"
      >
        <div style={S.confirmBody}>
          <div style={S.confirmIcon}>
            <AlertTriangle size={24} style={{ color: colors.status.error }} />
          </div>
          <p style={S.confirmText}>
            This will revoke host access for this user. They will no longer be able to manage competitions.
            This does not delete their account or any past competitions they hosted.
          </p>
        </div>
      </FormModal>
    </div>
  );
}

const S = {
  headerRow: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md, flexWrap: 'wrap' },
  title: { fontSize: typography.fontSize.xxl, fontWeight: typography.fontWeight.bold, marginBottom: spacing.xs, color: colors.text.primary },
  subtitle: { color: colors.text.secondary, fontSize: typography.fontSize.sm },
  avatar: { width: '28px', height: '28px', borderRadius: borderRadius.full, background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.bold, color: '#fff', flexShrink: 0, overflow: 'hidden' },
  avatarImg: { width: '100%', height: '100%', objectFit: 'cover', borderRadius: borderRadius.full },
  expandLabel: { fontSize: typography.fontSize.xs, color: colors.text.tertiary, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: typography.fontWeight.semibold },
  expandText: { fontSize: typography.fontSize.sm, color: colors.text.secondary, lineHeight: 1.6, margin: 0 },
  confirmBody: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: spacing.md, padding: `${spacing.md} 0` },
  confirmIcon: { width: '48px', height: '48px', borderRadius: borderRadius.full, background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  confirmText: { fontSize: typography.fontSize.sm, color: colors.text.secondary, lineHeight: 1.6, margin: 0, textAlign: 'center' },
};
