import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Building2, Plus, Edit2, Trash2, Upload, Loader, Crown, Image as ImageIcon } from 'lucide-react';
import { colors, spacing, borderRadius, typography } from '@shared/styles/theme';
import { generateSlug } from '@shared/types/competition';
import { supabase } from '@shared/lib/supabase';
import { useToast } from '@shared/contexts/ToastContext';
import StatRow from '../../../components/StatRow';
import FilterBar from '../../../components/FilterBar';
import DataTable from '../../../components/DataTable';
import ActionMenu from '../../../components/ActionMenu';
import FormModal from '../../../components/FormModal';
import { FormField, TextInput, TextArea } from '../../../components/FormField';

export default function OrganizationsManager() {
  const toast = useToast();
  const fileInputRef = useRef(null);
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState('');
  const [modalMode, setModalMode] = useState(null); // 'create' | 'edit' | null
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '', logo_url: '' });

  const getCompetitionCount = async (orgId) => {
    if (!supabase) return 0;
    try {
      const { count, error } = await supabase
        .from('competitions').select('*', { count: 'exact', head: true }).eq('organization_id', orgId);
      return error ? 0 : count || 0;
    } catch { return 0; }
  };

  const fetchOrganizations = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.from('organizations').select('*').order('name');
      if (error) throw error;
      const orgsWithCounts = await Promise.all(
        (data || []).map(async (org) => ({ ...org, competitionCount: await getCompetitionCount(org.id) }))
      );
      setOrganizations(orgsWithCounts);
    } catch (err) {
      toast.error(`Failed to load organizations: ${err.message}`);
    } finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { fetchOrganizations(); }, [fetchOrganizations]);

  const fetchOrgCompetitions = async (orgId) => {
    if (!supabase) return [];
    try {
      const { data: competitions, error } = await supabase
        .from('competitions').select('id, season, status, city_id')
        .eq('organization_id', orgId).order('season', { ascending: false });
      if (error) throw error;
      if (!competitions?.length) return [];

      const cityIds = [...new Set(competitions.map(c => c.city_id).filter(Boolean))];
      let citiesMap = {};
      if (cityIds.length > 0) {
        const { data: citiesData } = await supabase.from('cities').select('id, name, state').in('id', cityIds);
        if (citiesData) citiesMap = citiesData.reduce((acc, c) => { acc[c.id] = c; return acc; }, {});
      }
      return competitions.map(comp => ({
        ...comp,
        cityName: comp.city_id ? citiesMap[comp.city_id]?.name || 'Unknown' : 'No City',
        cityState: comp.city_id ? citiesMap[comp.city_id]?.state || '' : '',
      }));
    } catch { return []; }
  };

  const handleLogoUpload = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please upload an image file'); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error('Image must be less than 2MB'); return; }
    setUploadingLogo(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `org-logos/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${ext}`;
      const { error } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
      setFormData(prev => ({ ...prev, logo_url: urlData.publicUrl }));
      toast.success('Logo uploaded successfully');
    } catch (err) {
      console.error('Logo upload error:', err);
      toast.warning('Logo upload failed. You can create the organization without a logo.');
    } finally { setUploadingLogo(false); }
  };

  const handleCreate = async () => {
    if (!formData.name.trim()) { toast.error('Organization name is required'); return; }
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.from('organizations')
        .insert({ name: formData.name.trim(), slug: generateSlug(formData.name), description: formData.description.trim(), logo_url: formData.logo_url })
        .select().single();
      if (error) {
        toast.error(error.code === '23505' ? 'An organization with this name already exists' : error.message);
        if (error.code === '23505') return;
        throw error;
      }
      toast.success(`Organization "${data.name}" created successfully`);
      closeFormModal();
      fetchOrganizations();
    } catch (err) {
      toast.error(`Failed to create organization: ${err.message}`);
    } finally { setIsSubmitting(false); }
  };

  const handleUpdate = async () => {
    if (!selectedOrg || !formData.name.trim()) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('organizations')
        .update({ name: formData.name.trim(), description: formData.description.trim(), logo_url: formData.logo_url, updated_at: new Date().toISOString() })
        .eq('id', selectedOrg.id);
      if (error) throw error;
      toast.success('Organization updated successfully');
      closeFormModal();
      fetchOrganizations();
    } catch (err) {
      toast.error('Failed to update organization');
    } finally { setIsSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!selectedOrg) return;
    setIsSubmitting(true);
    try {
      const { data: comps } = await supabase.from('competitions').select('id').eq('organization_id', selectedOrg.id).limit(1);
      if (comps?.length) { toast.error('Cannot delete organization with existing competitions'); return; }
      const { error } = await supabase.from('organizations').delete().eq('id', selectedOrg.id);
      if (error) throw error;
      toast.success('Organization deleted successfully');
      setShowDeleteModal(false);
      setSelectedOrg(null);
      fetchOrganizations();
    } catch (err) {
      toast.error('Failed to delete organization');
    } finally { setIsSubmitting(false); }
  };

  const resetForm = () => setFormData({ name: '', description: '', logo_url: '' });
  const openCreateModal = () => { resetForm(); setSelectedOrg(null); setModalMode('create'); };
  const openEditModal = (org) => { setSelectedOrg(org); setFormData({ name: org.name, description: org.description || '', logo_url: org.logo_url || '' }); setModalMode('edit'); };
  const closeFormModal = () => { setModalMode(null); setSelectedOrg(null); resetForm(); };

  const handleExpandRow = async (row) => {
    if (row.competitionsList) return;
    const competitions = await fetchOrgCompetitions(row.id);
    setOrganizations(prev => prev.map(org => org.id === row.id ? { ...org, competitionsList: competitions } : org));
  };

  const filteredOrgs = useMemo(() => {
    if (!searchValue) return organizations;
    const q = searchValue.toLowerCase();
    return organizations.filter(o => o.name.toLowerCase().includes(q) || (o.slug || '').toLowerCase().includes(q));
  }, [organizations, searchValue]);

  const stats = useMemo(() => [
    { label: 'Total Orgs', value: organizations.length, icon: Building2 },
    { label: 'With Logo', value: organizations.filter(o => o.logo_url).length, icon: ImageIcon, color: colors.status.success },
    { label: 'Total Competitions', value: organizations.reduce((sum, o) => sum + (o.competitionCount || 0), 0), icon: Crown },
  ], [organizations]);

  const columns = useMemo(() => [
    {
      key: 'name', label: 'Organization', sortable: true,
      render: (_, row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
          <div style={S.logoThumb}>
            {row.logo_url ? <img src={row.logo_url} alt="" style={S.logoImg} /> : <Building2 size={14} style={{ color: colors.text.muted }} />}
          </div>
          <span style={{ fontWeight: typography.fontWeight.medium }}>{row.name}</span>
        </div>
      ),
    },
    { key: 'slug', label: 'Slug', sortable: true, render: (val) => <span style={{ color: colors.text.tertiary, fontSize: typography.fontSize.xs }}>/org/{val}</span> },
    { key: 'competitionCount', label: 'Competitions', sortable: true, width: '120px', render: (val) => <span style={{ color: colors.gold.primary }}>{val || 0}</span> },
  ], []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
      <div>
        <h2 style={S.title}>Organizations</h2>
        <p style={S.subtitle}>Manage organizations and their competitions</p>
      </div>

      <StatRow stats={stats} />

      <FilterBar
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        searchPlaceholder="Search organizations..."
        actions={<button onClick={openCreateModal} style={S.addBtn}><Plus size={14} /> New Organization</button>}
      />

      <DataTable
        columns={columns}
        data={filteredOrgs}
        loading={loading}
        emptyMessage="No organizations yet. Create your first organization to get started."
        expandable
        renderExpanded={(row) => {
          if (!row.competitionsList) { handleExpandRow(row); return <span style={S.muted}>Loading competitions...</span>; }
          if (!row.competitionsList.length) return <span style={S.muted}>No competitions yet</span>;
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
              <span style={S.expandLabel}>Competitions</span>
              {row.competitionsList.map(comp => (
                <div key={comp.id} style={S.compRow}>
                  <span style={{ fontSize: typography.fontSize.sm }}>{comp.cityName}{comp.cityState ? `, ${comp.cityState}` : ''} - {comp.season}</span>
                  <span style={S.badge}>{comp.status}</span>
                </div>
              ))}
            </div>
          );
        }}
        actions={(row) => (
          <ActionMenu actions={[
            { label: 'Edit', icon: Edit2, onClick: () => openEditModal(row) },
            { label: 'Delete', icon: Trash2, variant: 'danger', onClick: () => { setSelectedOrg(row); setShowDeleteModal(true); } },
          ]} />
        )}
      />

      {/* Create / Edit Modal */}
      <FormModal
        isOpen={modalMode !== null}
        onClose={closeFormModal}
        title={modalMode === 'edit' ? 'Edit Organization' : 'Create Organization'}
        subtitle={modalMode === 'edit' ? `Editing ${selectedOrg?.name || ''}` : 'Add a new organization'}
        submitLabel={modalMode === 'edit' ? 'Save Changes' : 'Create Organization'}
        loading={isSubmitting}
        onSubmit={modalMode === 'edit' ? handleUpdate : handleCreate}
        size="md"
      >
        <div style={{ marginBottom: spacing.lg }}>
          <span style={S.fieldLabel}>Organization Logo</span>
          <div onClick={() => fileInputRef.current?.click()} style={S.logoZone}>
            {uploadingLogo ? (
              <Loader size={24} style={{ animation: 'spin 1s linear infinite', color: colors.gold.primary }} />
            ) : formData.logo_url ? (
              <img src={formData.logo_url} alt="Logo preview" style={S.logoImg} />
            ) : (
              <><Upload size={20} style={{ color: colors.text.muted }} /><span style={{ fontSize: typography.fontSize.xs, color: colors.text.muted }}>Upload</span></>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={(e) => handleLogoUpload(e.target.files[0])} style={{ display: 'none' }} />
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>

        <FormField label="Organization Name" required>
          <TextInput value={formData.name} onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} placeholder="e.g., Most Eligible" />
        </FormField>
        {formData.name && (
          <p style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary, marginTop: spacing.xs }}>
            {modalMode === 'edit' ? `URL: /org/${selectedOrg?.slug} (cannot be changed)` : `URL: /org/${generateSlug(formData.name)}`}
          </p>
        )}

        <div style={{ marginTop: spacing.lg }}>
          <FormField label="Description">
            <TextArea value={formData.description} onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} placeholder="Brief description of the organization" rows={3} />
          </FormField>
        </div>
      </FormModal>

      {/* Delete Modal */}
      <FormModal
        isOpen={showDeleteModal && selectedOrg !== null}
        onClose={() => { setShowDeleteModal(false); setSelectedOrg(null); }}
        title="Delete Organization?"
        subtitle={`Are you sure you want to delete "${selectedOrg?.name}"? This action cannot be undone.`}
        submitLabel={isSubmitting ? 'Deleting...' : 'Delete'}
        loading={isSubmitting}
        onSubmit={handleDelete}
        size="sm"
      >
        <div style={{ textAlign: 'center', padding: `${spacing.md} 0` }}>
          <div style={S.deleteIcon}><Trash2 size={24} style={{ color: colors.status.error }} /></div>
        </div>
      </FormModal>
    </div>
  );
}

const S = {
  title: { fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, marginBottom: spacing.xs, color: colors.text.primary },
  subtitle: { color: colors.text.secondary, fontSize: typography.fontSize.sm },
  muted: { color: colors.text.tertiary, fontSize: typography.fontSize.sm },
  logoThumb: { width: '28px', height: '28px', borderRadius: borderRadius.md, background: colors.background.tertiary, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 },
  logoImg: { width: '100%', height: '100%', objectFit: 'cover' },
  addBtn: { display: 'flex', alignItems: 'center', gap: spacing.xs, height: '32px', padding: `0 ${spacing.md}`, background: colors.gold.primary, border: 'none', borderRadius: borderRadius.sm, color: colors.text.inverse, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium, fontFamily: typography.fontFamily.sans, cursor: 'pointer', whiteSpace: 'nowrap' },
  expandLabel: { fontSize: typography.fontSize.xs, color: colors.text.tertiary, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: typography.fontWeight.semibold, marginBottom: spacing.xs },
  compRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: `${spacing.sm} ${spacing.md}`, background: colors.background.tertiary, borderRadius: borderRadius.md },
  badge: { fontSize: typography.fontSize.xs, padding: `2px ${spacing.sm}`, background: 'rgba(212,175,55,0.2)', color: colors.gold.primary, borderRadius: borderRadius.pill },
  fieldLabel: { display: 'block', fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium, color: colors.text.primary, marginBottom: spacing.sm },
  logoZone: { width: '96px', height: '96px', borderRadius: borderRadius.lg, border: `2px dashed ${colors.border.primary}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden', gap: spacing.xs, background: colors.background.tertiary },
  deleteIcon: { width: '56px', height: '56px', borderRadius: borderRadius.full, background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' },
};
