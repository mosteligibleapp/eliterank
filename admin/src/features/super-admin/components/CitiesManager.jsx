import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { MapPin, Plus, Edit2, Trash2, Crown } from 'lucide-react';
import { colors, spacing, borderRadius, typography } from '@shared/styles/theme';
import { generateCitySlug, US_STATES } from '@shared/types/competition';
import { supabase } from '@shared/lib/supabase';
import { useToast } from '@shared/contexts/ToastContext';
import { useCities, useOrganizations } from '@shared/hooks/useCachedQuery';
import { invalidateTable } from '@shared/lib/queryCache';
import StatRow from '../../../components/StatRow';
import FilterBar from '../../../components/FilterBar';
import DataTable from '../../../components/DataTable';
import ActionMenu from '../../../components/ActionMenu';
import FormModal from '../../../components/FormModal';
import { FormField, TextInput, SelectInput } from '../../../components/FormField';

const getStateName = (code) => US_STATES.find(s => s.code === code)?.name || code;

export default function CitiesManager() {
  const toast = useToast();
  const { data: cachedCities, loading: citiesLoading, refetch: refetchCities } = useCities();
  const { data: cachedOrganizations, loading: orgsLoading } = useOrganizations();

  const [citiesWithCounts, setCitiesWithCounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [modalMode, setModalMode] = useState(null); // 'create' | 'edit' | null
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedCity, setSelectedCity] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ name: '', state: '' });

  const orgsMap = useMemo(() =>
    (cachedOrganizations || []).reduce((acc, org) => { acc[org.id] = org.name; return acc; }, {}),
  [cachedOrganizations]);

  const fetchCityCompetitions = useCallback(async (cityId) => {
    if (!supabase) return [];
    try {
      const { data: competitions, error } = await supabase
        .from('competitions').select('id, season, status, organization_id')
        .eq('city_id', cityId).order('season', { ascending: false });
      if (error) throw error;
      if (!competitions?.length) return [];
      return competitions.map(comp => ({
        ...comp,
        organizationName: comp.organization_id ? orgsMap[comp.organization_id] || 'Unknown' : 'No Organization',
      }));
    } catch { return []; }
  }, [orgsMap]);

  const getCompetitionCount = async (cityId) => {
    if (!supabase) return 0;
    try {
      const { count, error } = await supabase
        .from('competitions').select('*', { count: 'exact', head: true }).eq('city_id', cityId);
      return error ? 0 : count || 0;
    } catch { return 0; }
  };

  useEffect(() => {
    const update = async () => {
      if (citiesLoading || !cachedCities) return;
      setLoading(true);
      try {
        const data = await Promise.all(
          (cachedCities || []).map(async (city) => ({ ...city, competitionCount: await getCompetitionCount(city.id) }))
        );
        setCitiesWithCounts(data);
      } catch (err) {
        toast.error(`Failed to load cities: ${err.message}`);
      } finally { setLoading(false); }
    };
    update();
  }, [cachedCities, citiesLoading, toast]);

  const fetchCities = () => { invalidateTable('cities'); refetchCities(); };

  const handleCreate = async () => {
    if (!formData.name.trim() || !formData.state) { toast.error('City name and state are required'); return; }
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.from('cities')
        .insert({ name: formData.name.trim(), state: formData.state, slug: generateCitySlug(formData.name, formData.state) })
        .select().single();
      if (error) {
        toast.error(error.code === '23505' ? 'This city/state combination already exists' : error.message);
        if (error.code === '23505') return;
        throw error;
      }
      toast.success(`${data.name}, ${data.state} added successfully`);
      closeFormModal();
      fetchCities();
    } catch (err) {
      toast.error(`Failed to create city: ${err.message}`);
    } finally { setIsSubmitting(false); }
  };

  const handleUpdate = async () => {
    if (!selectedCity || !formData.name.trim()) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('cities')
        .update({ name: formData.name.trim(), updated_at: new Date().toISOString() })
        .eq('id', selectedCity.id);
      if (error) throw error;
      toast.success('City updated successfully');
      closeFormModal();
      fetchCities();
    } catch (err) {
      toast.error('Failed to update city');
    } finally { setIsSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!selectedCity) return;
    setIsSubmitting(true);
    try {
      const { data: comps } = await supabase.from('competitions').select('id').eq('city_id', selectedCity.id).limit(1);
      if (comps?.length) { toast.error('Cannot delete city with existing competitions'); return; }
      const { error } = await supabase.from('cities').delete().eq('id', selectedCity.id);
      if (error) throw error;
      toast.success('City deleted successfully');
      setShowDeleteModal(false);
      setSelectedCity(null);
      fetchCities();
    } catch (err) {
      toast.error('Failed to delete city');
    } finally { setIsSubmitting(false); }
  };

  const resetForm = () => setFormData({ name: '', state: '' });
  const openCreateModal = () => { resetForm(); setSelectedCity(null); setModalMode('create'); };
  const openEditModal = (city) => { setSelectedCity(city); setFormData({ name: city.name, state: city.state }); setModalMode('edit'); };
  const closeFormModal = () => { setModalMode(null); setSelectedCity(null); resetForm(); };

  const handleExpandRow = async (row) => {
    if (row.competitionsList) return;
    const competitions = await fetchCityCompetitions(row.id);
    setCitiesWithCounts(prev => prev.map(c => c.id === row.id ? { ...c, competitionsList: competitions } : c));
  };

  const stateFilterOptions = useMemo(() =>
    [...new Set(citiesWithCounts.map(c => c.state).filter(Boolean))].sort().map(code => ({ value: code, label: getStateName(code) })),
  [citiesWithCounts]);

  const stateSelectOptions = useMemo(() => US_STATES.map(s => ({ value: s.code, label: s.name })), []);

  const filteredCities = useMemo(() => {
    let result = citiesWithCounts;
    if (stateFilter) result = result.filter(c => c.state === stateFilter);
    if (searchValue) {
      const q = searchValue.toLowerCase();
      result = result.filter(c => c.name.toLowerCase().includes(q) || (c.slug || '').toLowerCase().includes(q) || getStateName(c.state).toLowerCase().includes(q));
    }
    return result;
  }, [citiesWithCounts, searchValue, stateFilter]);

  const uniqueStates = useMemo(() => new Set(citiesWithCounts.map(c => c.state).filter(Boolean)).size, [citiesWithCounts]);
  const totalComps = useMemo(() => citiesWithCounts.reduce((sum, c) => sum + (c.competitionCount || 0), 0), [citiesWithCounts]);

  const stats = useMemo(() => [
    { label: 'Total Cities', value: citiesWithCounts.length, icon: MapPin },
    { label: 'States Covered', value: uniqueStates, icon: MapPin, color: colors.status.info },
    { label: 'Total Competitions', value: totalComps, icon: Crown },
  ], [citiesWithCounts.length, uniqueStates, totalComps]);

  const columns = useMemo(() => [
    { key: 'name', label: 'City', sortable: true, render: (_, row) => <span style={{ fontWeight: typography.fontWeight.medium }}>{row.name}</span> },
    { key: 'state', label: 'State', sortable: true, width: '120px', render: (val) => getStateName(val) },
    { key: 'slug', label: 'Slug', sortable: true, render: (val) => <span style={{ color: colors.text.tertiary, fontSize: typography.fontSize.xs }}>/{val}</span> },
    { key: 'competitionCount', label: 'Competitions', sortable: true, width: '120px', render: (val) => <span style={{ color: colors.gold.primary }}>{val || 0}</span> },
  ], []);

  const isPageLoading = loading || citiesLoading || orgsLoading;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
      <div>
        <h2 style={S.title}>Cities</h2>
        <p style={S.subtitle}>Manage competition cities (US only)</p>
      </div>

      <StatRow stats={stats} />

      <FilterBar
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        searchPlaceholder="Search cities..."
        filters={[{ key: 'state', label: 'State', options: stateFilterOptions, value: stateFilter }]}
        onFilterChange={(key, value) => { if (key === 'state') setStateFilter(value); }}
        actions={<button onClick={openCreateModal} style={S.addBtn}><Plus size={14} /> Add City</button>}
      />

      <DataTable
        columns={columns}
        data={filteredCities}
        loading={isPageLoading}
        emptyMessage="No cities yet. Add your first city to create competitions."
        expandable
        renderExpanded={(row) => {
          if (!row.competitionsList) { handleExpandRow(row); return <span style={S.muted}>Loading competitions...</span>; }
          if (!row.competitionsList.length) return <span style={S.muted}>No competitions yet</span>;
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
              <span style={S.expandLabel}>Competitions</span>
              {row.competitionsList.map(comp => (
                <div key={comp.id} style={S.compRow}>
                  <span style={{ fontSize: typography.fontSize.sm }}>{comp.organizationName} - {comp.season}</span>
                  <span style={S.badge}>{comp.status}</span>
                </div>
              ))}
            </div>
          );
        }}
        actions={(row) => (
          <ActionMenu actions={[
            { label: 'Edit', icon: Edit2, onClick: () => openEditModal(row) },
            { label: 'Delete', icon: Trash2, variant: 'danger', onClick: () => { setSelectedCity(row); setShowDeleteModal(true); } },
          ]} />
        )}
      />

      {/* Create / Edit Modal */}
      <FormModal
        isOpen={modalMode !== null}
        onClose={closeFormModal}
        title={modalMode === 'edit' ? 'Edit City' : 'Add City'}
        subtitle={modalMode === 'edit' ? `Editing ${selectedCity?.name || ''}, ${selectedCity?.state || ''}` : 'Add a new competition city'}
        submitLabel={modalMode === 'edit' ? 'Save Changes' : 'Add City'}
        loading={isSubmitting}
        onSubmit={modalMode === 'edit' ? handleUpdate : handleCreate}
        size="sm"
      >
        <FormField label="City Name" required>
          <TextInput value={formData.name} onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} placeholder="e.g., Chicago" />
        </FormField>

        <div style={{ marginTop: spacing.lg }}>
          {modalMode === 'edit' ? (
            <FormField label="State" description="State cannot be changed after creation">
              <TextInput value={getStateName(selectedCity?.state || '')} disabled />
            </FormField>
          ) : (
            <FormField label="State" required>
              <SelectInput value={formData.state} onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))} options={stateSelectOptions} placeholder="Select a state..." />
            </FormField>
          )}
        </div>

        {formData.name && (modalMode === 'edit' ? selectedCity?.slug : formData.state) && (
          <div style={S.slugPreview}>
            <span style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary }}>URL slug: </span>
            <span style={{ fontSize: typography.fontSize.sm, color: colors.gold.primary }}>
              /{modalMode === 'edit' ? selectedCity.slug : generateCitySlug(formData.name, formData.state)}
            </span>
            {modalMode === 'edit' && <p style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary, margin: `${spacing.xs} 0 0` }}>Slug cannot be changed after creation</p>}
          </div>
        )}
      </FormModal>

      {/* Delete Modal */}
      <FormModal
        isOpen={showDeleteModal && selectedCity !== null}
        onClose={() => { setShowDeleteModal(false); setSelectedCity(null); }}
        title="Delete City?"
        subtitle={`Are you sure you want to delete "${selectedCity?.name}, ${selectedCity?.state}"? This action cannot be undone.`}
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
  addBtn: { display: 'flex', alignItems: 'center', gap: spacing.xs, height: '32px', padding: `0 ${spacing.md}`, background: colors.gold.primary, border: 'none', borderRadius: borderRadius.sm, color: colors.text.inverse, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium, fontFamily: typography.fontFamily.sans, cursor: 'pointer', whiteSpace: 'nowrap' },
  expandLabel: { fontSize: typography.fontSize.xs, color: colors.text.tertiary, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: typography.fontWeight.semibold, marginBottom: spacing.xs },
  compRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: `${spacing.sm} ${spacing.md}`, background: colors.background.tertiary, borderRadius: borderRadius.md },
  badge: { fontSize: typography.fontSize.xs, padding: `2px ${spacing.sm}`, background: 'rgba(212,175,55,0.2)', color: colors.gold.primary, borderRadius: borderRadius.pill },
  slugPreview: { marginTop: spacing.lg, padding: spacing.md, background: colors.background.tertiary, borderRadius: borderRadius.md },
  deleteIcon: { width: '56px', height: '56px', borderRadius: borderRadius.full, background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' },
};
