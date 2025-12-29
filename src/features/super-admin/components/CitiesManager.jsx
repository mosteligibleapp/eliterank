import React, { useState, useEffect } from 'react';
import {
  MapPin, Plus, Edit2, Trash2, X, Loader, ChevronRight, Crown
} from 'lucide-react';
import { Button } from '../../../components/ui';
import { colors, spacing, borderRadius, typography } from '../../../styles/theme';
import { generateCitySlug, US_STATES } from '../../../types/competition';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../../contexts/ToastContext';

export default function CitiesManager() {
  const toast = useToast();

  // State
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedCity, setSelectedCity] = useState(null);
  const [expandedCity, setExpandedCity] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    state: '',
  });

  // Fetch cities
  useEffect(() => {
    fetchCities();
  }, []);

  const fetchCities = async () => {
    if (!supabase) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('cities')
        .select(`
          *,
          competitions:competitions(count)
        `)
        .order('name');

      if (error) throw error;

      setCities(data || []);
    } catch (err) {
      console.error('Error fetching cities:', err);
      toast.error('Failed to load cities');
    } finally {
      setLoading(false);
    }
  };

  // Fetch competitions for a city
  const fetchCityCompetitions = async (cityId) => {
    if (!supabase) return [];

    try {
      const { data, error } = await supabase
        .from('competitions')
        .select(`
          id,
          season,
          status,
          organizations:organization_id(name)
        `)
        .eq('city_id', cityId)
        .order('season', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Error fetching city competitions:', err);
      return [];
    }
  };

  // Create city
  const handleCreate = async () => {
    if (!formData.name.trim() || !formData.state) {
      toast.error('City name and state are required');
      return;
    }

    setIsSubmitting(true);
    try {
      const slug = generateCitySlug(formData.name, formData.state);

      const { data, error } = await supabase
        .from('cities')
        .insert({
          name: formData.name.trim(),
          state: formData.state,
          slug,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          toast.error('This city/state combination already exists');
        } else {
          throw error;
        }
        return;
      }

      toast.success(`${data.name}, ${data.state} added successfully`);
      setShowCreateModal(false);
      resetForm();
      fetchCities();
    } catch (err) {
      console.error('Error creating city:', err);
      toast.error(`Failed to create city: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update city (name only - state and slug cannot be changed)
  const handleUpdate = async () => {
    if (!selectedCity || !formData.name.trim()) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('cities')
        .update({
          name: formData.name.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedCity.id);

      if (error) throw error;

      toast.success('City updated successfully');
      setShowEditModal(false);
      setSelectedCity(null);
      resetForm();
      fetchCities();
    } catch (err) {
      console.error('Error updating city:', err);
      toast.error('Failed to update city');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete city
  const handleDelete = async () => {
    if (!selectedCity) return;

    setIsSubmitting(true);
    try {
      // Check if city has competitions
      const { data: competitions } = await supabase
        .from('competitions')
        .select('id')
        .eq('city_id', selectedCity.id)
        .limit(1);

      if (competitions && competitions.length > 0) {
        toast.error('Cannot delete city with existing competitions');
        return;
      }

      const { error } = await supabase
        .from('cities')
        .delete()
        .eq('id', selectedCity.id);

      if (error) throw error;

      toast.success('City deleted successfully');
      setShowDeleteModal(false);
      setSelectedCity(null);
      fetchCities();
    } catch (err) {
      console.error('Error deleting city:', err);
      toast.error('Failed to delete city');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      state: '',
    });
  };

  // Open edit modal
  const openEditModal = (city) => {
    setSelectedCity(city);
    setFormData({
      name: city.name,
      state: city.state,
    });
    setShowEditModal(true);
  };

  // Toggle expanded city to show competitions
  const toggleExpandCity = async (cityId) => {
    if (expandedCity === cityId) {
      setExpandedCity(null);
    } else {
      setExpandedCity(cityId);
      const competitions = await fetchCityCompetitions(cityId);
      setCities(prev =>
        prev.map(city =>
          city.id === cityId ? { ...city, competitionsList: competitions } : city
        )
      );
    }
  };

  // Get state name from code
  const getStateName = (code) => {
    const state = US_STATES.find(s => s.code === code);
    return state ? state.name : code;
  };

  // Styles
  const cardStyle = {
    background: colors.background.card,
    border: `1px solid ${colors.border.light}`,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
  };

  const modalOverlayStyle = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: spacing.xl,
  };

  const modalStyle = {
    background: colors.background.card,
    borderRadius: borderRadius.xxl,
    width: '100%',
    maxWidth: '500px',
    maxHeight: '90vh',
    overflow: 'auto',
    border: `1px solid ${colors.border.light}`,
  };

  const inputStyle = {
    width: '100%',
    padding: spacing.md,
    background: colors.background.secondary,
    border: `1px solid ${colors.border.light}`,
    borderRadius: borderRadius.lg,
    color: '#fff',
    fontSize: typography.fontSize.md,
    outline: 'none',
  };

  const selectStyle = {
    ...inputStyle,
    cursor: 'pointer',
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 12px center',
    paddingRight: spacing.xl,
  };

  const labelStyle = {
    display: 'block',
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
    fontWeight: typography.fontWeight.medium,
  };

  if (loading) {
    return (
      <div style={{ padding: spacing.xl, textAlign: 'center' }}>
        <Loader size={24} style={{ animation: 'spin 1s linear infinite', color: colors.gold.primary }} />
        <p style={{ marginTop: spacing.md, color: colors.text.secondary }}>Loading cities...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl }}>
        <div>
          <h2 style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, marginBottom: spacing.xs }}>
            Cities
          </h2>
          <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm }}>
            Manage competition cities (US only)
          </p>
        </div>
        <Button icon={Plus} onClick={() => setShowCreateModal(true)}>
          Add City
        </Button>
      </div>

      {/* Cities List */}
      {cities.length === 0 ? (
        <div style={{
          ...cardStyle,
          textAlign: 'center',
          padding: spacing.xxxl,
        }}>
          <MapPin size={48} style={{ color: colors.text.muted, marginBottom: spacing.md }} />
          <h3 style={{ fontSize: typography.fontSize.lg, marginBottom: spacing.sm }}>No Cities Yet</h3>
          <p style={{ color: colors.text.secondary, marginBottom: spacing.lg }}>
            Add your first city to create competitions
          </p>
          <Button icon={Plus} onClick={() => setShowCreateModal(true)}>
            Add City
          </Button>
        </div>
      ) : (
        cities.map(city => (
          <div key={city.id} style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.lg }}>
              {/* Icon */}
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: borderRadius.lg,
                background: 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.1))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <MapPin size={24} style={{ color: colors.gold.primary }} />
              </div>

              {/* Info */}
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, marginBottom: spacing.xs }}>
                  {city.name}, {city.state}
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
                  <span style={{ fontSize: typography.fontSize.xs, color: colors.text.muted }}>
                    /{city.slug}
                  </span>
                  <span style={{
                    fontSize: typography.fontSize.xs,
                    color: colors.gold.primary,
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing.xs,
                  }}>
                    <Crown size={12} />
                    {city.competitions?.[0]?.count || 0} competitions
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: spacing.sm }}>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => toggleExpandCity(city.id)}
                  style={{ padding: spacing.sm }}
                >
                  <ChevronRight
                    size={16}
                    style={{
                      transform: expandedCity === city.id ? 'rotate(90deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s',
                    }}
                  />
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={Edit2}
                  onClick={() => openEditModal(city)}
                  style={{ padding: spacing.sm }}
                />
                <Button
                  variant="secondary"
                  size="sm"
                  icon={Trash2}
                  onClick={() => {
                    setSelectedCity(city);
                    setShowDeleteModal(true);
                  }}
                  style={{ padding: spacing.sm }}
                />
              </div>
            </div>

            {/* Expanded Competitions List */}
            {expandedCity === city.id && (
              <div style={{
                marginTop: spacing.lg,
                paddingTop: spacing.lg,
                borderTop: `1px solid ${colors.border.light}`,
              }}>
                <h4 style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary, marginBottom: spacing.md }}>
                  Competitions
                </h4>
                {city.competitionsList?.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
                    {city.competitionsList.map(comp => (
                      <div
                        key={comp.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: spacing.md,
                          background: colors.background.secondary,
                          borderRadius: borderRadius.md,
                        }}
                      >
                        <span>
                          {comp.organizations?.name} - {comp.season}
                        </span>
                        <span style={{
                          fontSize: typography.fontSize.xs,
                          padding: `${spacing.xs} ${spacing.sm}`,
                          background: 'rgba(212,175,55,0.2)',
                          color: colors.gold.primary,
                          borderRadius: borderRadius.pill,
                        }}>
                          {comp.status}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: colors.text.muted, fontSize: typography.fontSize.sm }}>
                    No competitions yet
                  </p>
                )}
              </div>
            )}
          </div>
        ))
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div style={modalOverlayStyle} onClick={() => setShowCreateModal(false)}>
          <div style={modalStyle} onClick={e => e.stopPropagation()}>
            <div style={{
              padding: spacing.xl,
              borderBottom: `1px solid ${colors.border.light}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <h3 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold }}>
                Add City
              </h3>
              <button
                onClick={() => { setShowCreateModal(false); resetForm(); }}
                style={{ background: 'none', border: 'none', color: colors.text.secondary, cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: spacing.xl }}>
              {/* City Name */}
              <div style={{ marginBottom: spacing.lg }}>
                <label style={labelStyle}>City Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Chicago"
                  style={inputStyle}
                />
              </div>

              {/* State */}
              <div style={{ marginBottom: spacing.lg }}>
                <label style={labelStyle}>State *</label>
                <select
                  value={formData.state}
                  onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                  style={selectStyle}
                >
                  <option value="">Select a state...</option>
                  {US_STATES.map(state => (
                    <option key={state.code} value={state.code}>
                      {state.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Preview Slug */}
              {formData.name && formData.state && (
                <div style={{
                  padding: spacing.md,
                  background: colors.background.secondary,
                  borderRadius: borderRadius.md,
                  marginBottom: spacing.xl,
                }}>
                  <span style={{ fontSize: typography.fontSize.xs, color: colors.text.muted }}>
                    URL slug:
                  </span>
                  <span style={{ fontSize: typography.fontSize.sm, color: colors.gold.primary, marginLeft: spacing.xs }}>
                    /{generateCitySlug(formData.name, formData.state)}
                  </span>
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', gap: spacing.md }}>
                <Button
                  variant="secondary"
                  onClick={() => { setShowCreateModal(false); resetForm(); }}
                  style={{ flex: 1 }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={isSubmitting || !formData.name.trim() || !formData.state}
                  style={{ flex: 1 }}
                >
                  {isSubmitting ? 'Adding...' : 'Add City'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedCity && (
        <div style={modalOverlayStyle} onClick={() => setShowEditModal(false)}>
          <div style={modalStyle} onClick={e => e.stopPropagation()}>
            <div style={{
              padding: spacing.xl,
              borderBottom: `1px solid ${colors.border.light}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <h3 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold }}>
                Edit City
              </h3>
              <button
                onClick={() => { setShowEditModal(false); setSelectedCity(null); resetForm(); }}
                style={{ background: 'none', border: 'none', color: colors.text.secondary, cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: spacing.xl }}>
              {/* City Name */}
              <div style={{ marginBottom: spacing.lg }}>
                <label style={labelStyle}>City Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Chicago"
                  style={inputStyle}
                />
              </div>

              {/* State (read-only) */}
              <div style={{ marginBottom: spacing.lg }}>
                <label style={labelStyle}>State</label>
                <div style={{
                  ...inputStyle,
                  background: 'rgba(107,114,128,0.2)',
                  cursor: 'not-allowed',
                }}>
                  {getStateName(selectedCity.state)}
                </div>
                <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, marginTop: spacing.xs }}>
                  State cannot be changed after creation
                </p>
              </div>

              {/* Slug (read-only) */}
              <div style={{
                padding: spacing.md,
                background: colors.background.secondary,
                borderRadius: borderRadius.md,
                marginBottom: spacing.xl,
              }}>
                <span style={{ fontSize: typography.fontSize.xs, color: colors.text.muted }}>
                  URL slug:
                </span>
                <span style={{ fontSize: typography.fontSize.sm, color: colors.gold.primary, marginLeft: spacing.xs }}>
                  /{selectedCity.slug}
                </span>
                <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, marginTop: spacing.xs }}>
                  Slug cannot be changed after creation
                </p>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: spacing.md }}>
                <Button
                  variant="secondary"
                  onClick={() => { setShowEditModal(false); setSelectedCity(null); resetForm(); }}
                  style={{ flex: 1 }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdate}
                  disabled={isSubmitting || !formData.name.trim()}
                  style={{ flex: 1 }}
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedCity && (
        <div style={modalOverlayStyle} onClick={() => setShowDeleteModal(false)}>
          <div style={{ ...modalStyle, maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: spacing.xl, textAlign: 'center' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(239,68,68,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto',
                marginBottom: spacing.lg,
              }}>
                <Trash2 size={28} style={{ color: colors.status.error }} />
              </div>

              <h3 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, marginBottom: spacing.sm }}>
                Delete City?
              </h3>
              <p style={{ color: colors.text.secondary, marginBottom: spacing.xl }}>
                Are you sure you want to delete "{selectedCity.name}, {selectedCity.state}"? This action cannot be undone.
              </p>

              <div style={{ display: 'flex', gap: spacing.md }}>
                <Button
                  variant="secondary"
                  onClick={() => { setShowDeleteModal(false); setSelectedCity(null); }}
                  style={{ flex: 1 }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDelete}
                  disabled={isSubmitting}
                  style={{
                    flex: 1,
                    background: colors.status.error,
                  }}
                >
                  {isSubmitting ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
