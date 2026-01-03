import React, { useState, useEffect } from 'react';
import {
  Crown, Plus, MapPin, Calendar, Users, Edit2, Trash2, UserPlus,
  ChevronRight, ChevronLeft, Building2, X, Loader,
  Settings, Eye, Archive, AlertTriangle, Activity
} from 'lucide-react';
import { Button } from '../../../components/ui';
import { colors, spacing, borderRadius, typography } from '../../../styles/theme';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../../contexts/ToastContext';
import {
  COMPETITION_STATUS,
  STATUS_CONFIG,
  DEFAULT_COMPETITION,
  generateCompetitionUrl,
} from '../../../types/competition';

// Wizard steps for creating a new competition
const WIZARD_STEPS = [
  { id: 1, name: 'Organization', description: 'Select organization' },
  { id: 2, name: 'Location', description: 'City & season' },
  { id: 3, name: 'Details', description: 'Competition settings' },
  { id: 4, name: 'Review', description: 'Confirm & create' },
];

export default function CompetitionsManager({ onViewDashboard, onOpenAdvancedSettings }) {
  const toast = useToast();

  // Data state
  const [competitions, setCompetitions] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [cities, setCities] = useState([]);
  const [hosts, setHosts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAssignHostModal, setShowAssignHostModal] = useState(false);
  const [selectedCompetition, setSelectedCompetition] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state for new competition
  const [formData, setFormData] = useState({
    organization_id: '',
    city_id: '',
    name: '', // Custom competition name
    season: new Date().getFullYear() + 1,
    number_of_winners: 5,
    host_id: '',
    description: '',
  });

  // Fetch all data on mount
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    if (!supabase) return;

    setLoading(true);
    try {
      // Fetch data separately for better error handling
      // Organizations
      const { data: orgsData, error: orgsError } = await supabase
        .from('organizations')
        .select('*')
        .order('name');

      if (!orgsError) setOrganizations(orgsData || []);

      // Cities
      const { data: citiesData, error: citiesError } = await supabase
        .from('cities')
        .select('*')
        .order('name');

      if (!citiesError) setCities(citiesData || []);

      // Hosts
      const { data: hostsData } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name')
        .eq('is_host', true);

      setHosts(hostsData || []);

      // Competitions - simple query first
      const { data: compsData, error: compsError } = await supabase
        .from('competitions')
        .select('*')
        .order('created_at', { ascending: false });

      if (!compsError) {
        setCompetitions(compsData || []);
      } else {
        setCompetitions([]);
      }
    } catch (err) {
      toast.error(`Failed to load data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Create competition
  const handleCreate = async () => {
    if (!formData.organization_id || !formData.city_id) {
      toast.error('Organization and city are required');
      return;
    }

    setIsSubmitting(true);
    try {
      // Check for duplicate competition (same org + city + season)
      const { data: existing } = await supabase
        .from('competitions')
        .select('id')
        .eq('organization_id', formData.organization_id)
        .eq('city_id', formData.city_id)
        .eq('season', formData.season)
        .limit(1);

      if (existing && existing.length > 0) {
        toast.error('A competition for this organization, city, and season already exists');
        setIsSubmitting(false);
        return;
      }

      // Create competition
      const { data, error } = await supabase
        .from('competitions')
        .insert({
          organization_id: formData.organization_id,
          city_id: formData.city_id,
          name: formData.name || null, // Custom competition name
          season: formData.season,
          status: COMPETITION_STATUS.DRAFT,
          entry_type: 'nominations',
          has_events: true, // Always enable events
          number_of_winners: formData.number_of_winners,
          selection_criteria: 'votes', // Default to public votes
          host_id: formData.host_id || null,
          description: formData.description || '',
        })
        .select()
        .single();

      if (error) throw error;

      // Create default competition settings
      await supabase
        .from('competition_settings')
        .insert({
          competition_id: data.id,
          price_per_vote: 1.00,
          use_price_bundler: false,
          allow_manual_votes: false,
        });

      toast.success('Competition created successfully');
      setShowCreateModal(false);
      resetForm();
      fetchData();
    } catch (err) {
      toast.error(`Failed to create competition: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update competition status
  const handleStatusChange = async (competitionId, newStatus) => {
    try {
      const { error } = await supabase
        .from('competitions')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', competitionId);

      if (error) throw error;

      toast.success(`Status changed to ${STATUS_CONFIG[newStatus].label}`);
      fetchData();
    } catch {
      toast.error('Failed to update status');
    }
  };

  // Assign host
  const handleAssignHost = async (hostId) => {
    if (!selectedCompetition) return;

    try {
      const { error } = await supabase
        .from('competitions')
        .update({ host_id: hostId, updated_at: new Date().toISOString() })
        .eq('id', selectedCompetition.id);

      if (error) throw error;

      toast.success('Host assigned successfully');
      setShowAssignHostModal(false);
      setSelectedCompetition(null);
      fetchData();
    } catch {
      toast.error('Failed to assign host');
    }
  };

  // Delete competition
  const handleDelete = async () => {
    if (!selectedCompetition) return;

    setIsSubmitting(true);
    try {
      // Delete related settings first
      await supabase
        .from('competition_settings')
        .delete()
        .eq('competition_id', selectedCompetition.id);

      // Delete competition
      const { error } = await supabase
        .from('competitions')
        .delete()
        .eq('id', selectedCompetition.id);

      if (error) throw error;

      toast.success('Competition deleted successfully');
      setShowDeleteModal(false);
      setSelectedCompetition(null);
      fetchData();
    } catch {
      toast.error('Failed to delete competition');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      organization_id: '',
      city_id: '',
      name: '',
      season: new Date().getFullYear() + 1,
      number_of_winners: 5,
      host_id: '',
      description: '',
    });
    setCurrentStep(1);
  };

  // Open edit modal with competition data
  const openEditModal = (comp) => {
    setSelectedCompetition(comp);
    setFormData({
      organization_id: comp.organization_id,
      city_id: comp.city_id,
      name: comp.name || '',
      season: comp.season,
      number_of_winners: comp.number_of_winners,
      host_id: comp.host_id || '',
      description: comp.description || '',
    });
    setShowEditModal(true);
  };

  // Update competition
  const handleUpdate = async () => {
    if (!selectedCompetition) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('competitions')
        .update({
          name: formData.name || null,
          season: formData.season,
          number_of_winners: formData.number_of_winners,
          host_id: formData.host_id || null,
          description: formData.description || '',
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedCompetition.id);

      if (error) throw error;

      toast.success('Competition updated successfully');
      setShowEditModal(false);
      setSelectedCompetition(null);
      resetForm();
      fetchData();
    } catch (err) {
      toast.error(`Failed to update competition: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get display name for competition
  const getCompetitionName = (comp) => {
    // Use custom name if set, otherwise generate from org/city
    if (comp.name) return comp.name;
    const org = organizations.find(o => o.id === comp.organization_id);
    const city = cities.find(c => c.id === comp.city_id);
    const orgName = org?.name || 'Unknown Org';
    const cityName = city?.name || 'Unknown City';
    return `${orgName} ${cityName}`;
  };

  // Get host display name
  const getHostName = (host) => {
    if (!host) return null;
    if (host.first_name || host.last_name) {
      return `${host.first_name || ''} ${host.last_name || ''}`.trim();
    }
    return host.email;
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
    maxWidth: '600px',
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
        <p style={{ marginTop: spacing.md, color: colors.text.secondary }}>Loading competitions...</p>
      </div>
    );
  }

  // Render wizard step content
  const renderWizardStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div>
            <h4 style={{ fontSize: typography.fontSize.md, marginBottom: spacing.lg }}>
              Select Organization
            </h4>
            {organizations.length === 0 ? (
              <div style={{ textAlign: 'center', padding: spacing.xl, color: colors.text.secondary }}>
                <Building2 size={48} style={{ marginBottom: spacing.md, opacity: 0.5 }} />
                <p>No organizations found. Create one first.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
                {organizations.map(org => (
                  <div
                    key={org.id}
                    onClick={() => setFormData(prev => ({ ...prev, organization_id: org.id }))}
                    style={{
                      padding: spacing.md,
                      background: formData.organization_id === org.id
                        ? 'rgba(212,175,55,0.2)'
                        : colors.background.secondary,
                      border: `1px solid ${formData.organization_id === org.id ? colors.gold.primary : colors.border.light}`,
                      borderRadius: borderRadius.lg,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: spacing.md,
                    }}
                  >
                    {org.logo_url ? (
                      <img
                        src={org.logo_url}
                        alt={org.name}
                        style={{ width: 40, height: 40, borderRadius: borderRadius.md, objectFit: 'cover' }}
                      />
                    ) : (
                      <div style={{
                        width: 40,
                        height: 40,
                        borderRadius: borderRadius.md,
                        background: colors.background.card,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <Building2 size={20} style={{ color: colors.text.muted }} />
                      </div>
                    )}
                    <div>
                      <p style={{ fontWeight: typography.fontWeight.medium }}>{org.name}</p>
                      <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted }}>
                        /org/{org.slug}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 2:
        return (
          <div>
            <h4 style={{ fontSize: typography.fontSize.md, marginBottom: spacing.lg }}>
              Location & Season
            </h4>

            {/* City selection */}
            <div style={{ marginBottom: spacing.lg }}>
              <label style={labelStyle}>City *</label>
              {cities.length === 0 ? (
                <div style={{ padding: spacing.md, background: colors.background.secondary, borderRadius: borderRadius.lg, color: colors.text.secondary }}>
                  No cities found. Add one first.
                </div>
              ) : (
                <select
                  value={formData.city_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, city_id: e.target.value }))}
                  style={selectStyle}
                >
                  <option value="">Select a city...</option>
                  {cities.map(city => (
                    <option key={city.id} value={city.id}>
                      {city.name}, {city.state}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Season */}
            <div style={{ marginBottom: spacing.lg }}>
              <label style={labelStyle}>Season Year *</label>
              <select
                value={formData.season}
                onChange={(e) => setFormData(prev => ({ ...prev, season: parseInt(e.target.value) }))}
                style={selectStyle}
              >
                {[...Array(5)].map((_, i) => {
                  const year = new Date().getFullYear() + i;
                  return (
                    <option key={year} value={year}>{year}</option>
                  );
                })}
              </select>
            </div>

            {/* Competition Name */}
            <div style={{ marginBottom: spacing.lg }}>
              <label style={labelStyle}>Competition Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Most Eligible Miami"
                style={inputStyle}
              />
              <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, marginTop: spacing.xs }}>
                Custom name for the competition. Leave blank to auto-generate from organization and city.
              </p>
            </div>
          </div>
        );

      case 3:
        return (
          <div>
            <h4 style={{ fontSize: typography.fontSize.md, marginBottom: spacing.lg }}>
              Competition Details
            </h4>

            {/* Number of Winners */}
            <div style={{ marginBottom: spacing.lg }}>
              <label style={labelStyle}>Number of Winners</label>
              <select
                value={formData.number_of_winners}
                onChange={(e) => setFormData(prev => ({ ...prev, number_of_winners: parseInt(e.target.value) }))}
                style={selectStyle}
              >
                {[1, 3, 5, 10, 15, 20].map(num => (
                  <option key={num} value={num}>{num}</option>
                ))}
              </select>
            </div>

            {/* Assign Host (optional) */}
            <div style={{ marginBottom: spacing.lg }}>
              <label style={labelStyle}>Assign Host (optional)</label>
              <select
                value={formData.host_id}
                onChange={(e) => setFormData(prev => ({ ...prev, host_id: e.target.value }))}
                style={selectStyle}
              >
                <option value="">No host assigned</option>
                {hosts.map(host => (
                  <option key={host.id} value={host.id}>
                    {getHostName(host) || host.email}
                  </option>
                ))}
              </select>
            </div>
          </div>
        );

      case 4:
        const selectedOrg = organizations.find(o => o.id === formData.organization_id);
        const selectedCity = cities.find(c => c.id === formData.city_id);
        const selectedHost = hosts.find(h => h.id === formData.host_id);

        return (
          <div>
            <h4 style={{ fontSize: typography.fontSize.md, marginBottom: spacing.lg }}>
              Review & Create
            </h4>

            <div style={{
              background: colors.background.secondary,
              borderRadius: borderRadius.lg,
              padding: spacing.lg,
            }}>
              <div style={{ marginBottom: spacing.md }}>
                <span style={{ color: colors.text.muted, fontSize: typography.fontSize.sm }}>Organization:</span>
                <p style={{ fontWeight: typography.fontWeight.medium }}>{selectedOrg?.name || 'Not selected'}</p>
              </div>
              <div style={{ marginBottom: spacing.md }}>
                <span style={{ color: colors.text.muted, fontSize: typography.fontSize.sm }}>Competition Name:</span>
                <p style={{ fontWeight: typography.fontWeight.medium }}>
                  {formData.name || `${selectedOrg?.name || ''} ${selectedCity?.name || ''}`.trim() || 'Auto-generated'}
                </p>
              </div>
              <div style={{ marginBottom: spacing.md }}>
                <span style={{ color: colors.text.muted, fontSize: typography.fontSize.sm }}>Location:</span>
                <p style={{ fontWeight: typography.fontWeight.medium }}>
                  {selectedCity ? `${selectedCity.name}, ${selectedCity.state}` : 'Not selected'}
                </p>
              </div>
              <div style={{ marginBottom: spacing.md }}>
                <span style={{ color: colors.text.muted, fontSize: typography.fontSize.sm }}>Season:</span>
                <p style={{ fontWeight: typography.fontWeight.medium }}>{formData.season}</p>
              </div>
              <div style={{ marginBottom: spacing.md }}>
                <span style={{ color: colors.text.muted, fontSize: typography.fontSize.sm }}>Winners:</span>
                <p style={{ fontWeight: typography.fontWeight.medium }}>{formData.number_of_winners}</p>
              </div>
              <div>
                <span style={{ color: colors.text.muted, fontSize: typography.fontSize.sm }}>Host:</span>
                <p style={{ fontWeight: typography.fontWeight.medium }}>
                  {selectedHost ? getHostName(selectedHost) : 'Not assigned'}
                </p>
              </div>
            </div>

            {selectedOrg && selectedCity && (
              <div style={{
                marginTop: spacing.lg,
                padding: spacing.md,
                background: 'rgba(212,175,55,0.1)',
                borderRadius: borderRadius.lg,
                border: '1px solid rgba(212,175,55,0.2)',
              }}>
                <span style={{ color: colors.text.muted, fontSize: typography.fontSize.xs }}>URL Preview:</span>
                <p style={{ color: colors.gold.primary, fontSize: typography.fontSize.sm }}>
                  {generateCompetitionUrl(selectedOrg.slug, selectedCity.slug, formData.season)}
                </p>
              </div>
            )}

            <p style={{
              marginTop: spacing.lg,
              fontSize: typography.fontSize.sm,
              color: colors.text.secondary,
              textAlign: 'center',
            }}>
              Competition will be created as Draft. Configure timeline and pricing in Advanced Settings.
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl }}>
        <div>
          <h2 style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, marginBottom: spacing.xs }}>
            Competitions
          </h2>
          <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm }}>
            Create and manage competitions
          </p>
        </div>
        <Button icon={Plus} onClick={() => setShowCreateModal(true)}>
          New Competition
        </Button>
      </div>

      {/* Competitions List */}
      {competitions.length === 0 ? (
        <div style={{
          ...cardStyle,
          textAlign: 'center',
          padding: spacing.xxxl,
        }}>
          <Crown size={48} style={{ color: colors.text.muted, marginBottom: spacing.md }} />
          <h3 style={{ fontSize: typography.fontSize.lg, marginBottom: spacing.sm }}>No Competitions Yet</h3>
          <p style={{ color: colors.text.secondary, marginBottom: spacing.lg }}>
            Create your first competition to get started
          </p>
          <Button icon={Plus} onClick={() => setShowCreateModal(true)}>
            Create Competition
          </Button>
        </div>
      ) : (
        competitions.map(comp => {
          const statusConfig = STATUS_CONFIG[comp.status] || STATUS_CONFIG[COMPETITION_STATUS.DRAFT];
          const host = hosts.find(h => h.id === comp.host_id);
          const hostName = getHostName(host);
          const org = organizations.find(o => o.id === comp.organization_id);
          const city = cities.find(c => c.id === comp.city_id);

          return (
            <div key={comp.id} style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: spacing.lg }}>
                {/* Organization Logo */}
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: borderRadius.lg,
                  background: colors.background.secondary,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  flexShrink: 0,
                }}>
                  {org?.logo_url ? (
                    <img
                      src={org.logo_url}
                      alt={org.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <Crown size={24} style={{ color: colors.gold.primary }} />
                  )}
                </div>

                {/* Info */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md, marginBottom: spacing.xs }}>
                    <h3 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold }}>
                      {getCompetitionName(comp)}
                    </h3>
                    <div style={{
                      padding: `${spacing.xs} ${spacing.sm}`,
                      background: statusConfig.bg,
                      borderRadius: borderRadius.pill,
                    }}>
                      <span style={{ color: statusConfig.color, fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.medium }}>
                        {statusConfig.label}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: spacing.lg, marginBottom: spacing.sm }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: spacing.xs, color: colors.text.secondary, fontSize: typography.fontSize.sm }}>
                      <MapPin size={14} />
                      {city?.name || 'No City'}, {city?.state || ''}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: spacing.xs, color: colors.text.secondary, fontSize: typography.fontSize.sm }}>
                      <Calendar size={14} />
                      Season {comp.season}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: spacing.xs, color: colors.text.secondary, fontSize: typography.fontSize.sm }}>
                      <Users size={14} />
                      {comp.number_of_winners} winners
                    </span>
                  </div>

                  {/* Host info */}
                  {hostName ? (
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: spacing.sm,
                      padding: `${spacing.xs} ${spacing.sm}`,
                      background: 'rgba(212,175,55,0.1)',
                      borderRadius: borderRadius.md,
                      fontSize: typography.fontSize.xs,
                    }}>
                      <UserPlus size={12} style={{ color: colors.gold.primary }} />
                      <span style={{ color: colors.gold.primary }}>Host: {hostName}</span>
                    </div>
                  ) : (
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: spacing.sm,
                      padding: `${spacing.xs} ${spacing.sm}`,
                      background: 'rgba(239,68,68,0.1)',
                      borderRadius: borderRadius.md,
                      fontSize: typography.fontSize.xs,
                    }}>
                      <AlertTriangle size={12} style={{ color: '#ef4444' }} />
                      <span style={{ color: '#ef4444' }}>No host assigned</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: spacing.sm }}>
                  {!comp.host_id && (
                    <Button
                      variant="primary"
                      size="sm"
                      icon={UserPlus}
                      onClick={() => {
                        setSelectedCompetition(comp);
                        setShowAssignHostModal(true);
                      }}
                    >
                      Assign Host
                    </Button>
                  )}
                  {onViewDashboard && (
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={Eye}
                      onClick={() => onViewDashboard({ ...comp, name: getCompetitionName(comp) })}
                    />
                  )}
                  {onOpenAdvancedSettings && (
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={Settings}
                      onClick={() => onOpenAdvancedSettings({ ...comp, name: getCompetitionName(comp) })}
                    />
                  )}
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={Edit2}
                    onClick={() => openEditModal(comp)}
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={Trash2}
                    onClick={() => {
                      setSelectedCompetition(comp);
                      setShowDeleteModal(true);
                    }}
                  />
                </div>
              </div>

              {/* Quick Status Change */}
              <div style={{
                marginTop: spacing.lg,
                paddingTop: spacing.md,
                borderTop: `1px solid ${colors.border.light}`,
                display: 'flex',
                alignItems: 'center',
                gap: spacing.md,
              }}>
                <span style={{ fontSize: typography.fontSize.xs, color: colors.text.muted }}>Status:</span>
                <div style={{ display: 'flex', gap: spacing.xs }}>
                  {Object.entries(STATUS_CONFIG).map(([status, config]) => (
                    <button
                      key={status}
                      onClick={() => handleStatusChange(comp.id, status)}
                      disabled={comp.status === status}
                      style={{
                        padding: `${spacing.xs} ${spacing.sm}`,
                        background: comp.status === status ? config.bg : 'transparent',
                        border: `1px solid ${comp.status === status ? config.color : colors.border.light}`,
                        borderRadius: borderRadius.md,
                        color: comp.status === status ? config.color : colors.text.muted,
                        fontSize: typography.fontSize.xs,
                        cursor: comp.status === status ? 'default' : 'pointer',
                        opacity: comp.status === status ? 1 : 0.6,
                      }}
                    >
                      {config.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          );
        })
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div style={modalOverlayStyle} onClick={() => setShowCreateModal(false)}>
          <div style={modalStyle} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div style={{
              padding: spacing.xl,
              borderBottom: `1px solid ${colors.border.light}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <h3 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold }}>
                Create Competition
              </h3>
              <button
                onClick={() => { setShowCreateModal(false); resetForm(); }}
                style={{ background: 'none', border: 'none', color: colors.text.secondary, cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Step Indicators */}
            <div style={{
              display: 'flex',
              padding: `${spacing.md} ${spacing.xl}`,
              borderBottom: `1px solid ${colors.border.light}`,
              gap: spacing.md,
            }}>
              {WIZARD_STEPS.map((step, index) => (
                <div
                  key={step.id}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing.xs,
                  }}
                >
                  <div style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: currentStep >= step.id ? colors.gold.primary : colors.background.secondary,
                    color: currentStep >= step.id ? '#000' : colors.text.muted,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: typography.fontSize.xs,
                    fontWeight: typography.fontWeight.bold,
                  }}>
                    {step.id}
                  </div>
                  <span style={{
                    fontSize: typography.fontSize.xs,
                    color: currentStep >= step.id ? '#fff' : colors.text.muted,
                    display: index < WIZARD_STEPS.length - 1 ? 'none' : 'block',
                  }}>
                    {step.name}
                  </span>
                  {index < WIZARD_STEPS.length - 1 && (
                    <div style={{
                      flex: 1,
                      height: 2,
                      background: currentStep > step.id ? colors.gold.primary : colors.border.light,
                      marginLeft: spacing.xs,
                    }} />
                  )}
                </div>
              ))}
            </div>

            {/* Step Content */}
            <div style={{ padding: spacing.xl, minHeight: '300px' }}>
              {renderWizardStep()}
            </div>

            {/* Footer */}
            <div style={{
              padding: spacing.xl,
              borderTop: `1px solid ${colors.border.light}`,
              display: 'flex',
              justifyContent: 'space-between',
            }}>
              <Button
                variant="secondary"
                icon={ChevronLeft}
                onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
                disabled={currentStep === 1}
              >
                Back
              </Button>
              {currentStep < WIZARD_STEPS.length ? (
                <Button
                  icon={ChevronRight}
                  onClick={() => setCurrentStep(prev => prev + 1)}
                  disabled={
                    (currentStep === 1 && !formData.organization_id) ||
                    (currentStep === 2 && !formData.city_id)
                  }
                >
                  Next
                </Button>
              ) : (
                <Button
                  onClick={handleCreate}
                  disabled={isSubmitting || !formData.organization_id || !formData.city_id}
                >
                  {isSubmitting ? 'Creating...' : 'Create Competition'}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Assign Host Modal */}
      {showAssignHostModal && selectedCompetition && (
        <div style={modalOverlayStyle} onClick={() => setShowAssignHostModal(false)}>
          <div style={{ ...modalStyle, maxWidth: '450px' }} onClick={e => e.stopPropagation()}>
            <div style={{
              padding: spacing.xl,
              borderBottom: `1px solid ${colors.border.light}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <h3 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold }}>
                Assign Host
              </h3>
              <button
                onClick={() => { setShowAssignHostModal(false); setSelectedCompetition(null); }}
                style={{ background: 'none', border: 'none', color: colors.text.secondary, cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: spacing.xl }}>
              <p style={{ marginBottom: spacing.lg, color: colors.text.secondary }}>
                Select a host for {getCompetitionName(selectedCompetition)}
              </p>

              {hosts.length === 0 ? (
                <p style={{ color: colors.text.muted }}>No hosts available</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
                  {hosts.map(host => (
                    <button
                      key={host.id}
                      onClick={() => handleAssignHost(host.id)}
                      style={{
                        padding: spacing.md,
                        background: colors.background.secondary,
                        border: `1px solid ${colors.border.light}`,
                        borderRadius: borderRadius.lg,
                        color: '#fff',
                        cursor: 'pointer',
                        textAlign: 'left',
                        display: 'flex',
                        alignItems: 'center',
                        gap: spacing.md,
                      }}
                    >
                      <div style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #d4af37, #f4d03f)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#000',
                        fontWeight: typography.fontWeight.bold,
                      }}>
                        {(host.first_name?.[0] || host.email[0]).toUpperCase()}
                      </div>
                      <div>
                        <p style={{ fontWeight: typography.fontWeight.medium }}>
                          {getHostName(host)}
                        </p>
                        <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted }}>
                          {host.email}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedCompetition && (
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
                Delete Competition?
              </h3>
              <p style={{ color: colors.text.secondary, marginBottom: spacing.xl }}>
                Are you sure you want to delete "{getCompetitionName(selectedCompetition)}"? This action cannot be undone.
              </p>

              <div style={{ display: 'flex', gap: spacing.md }}>
                <Button
                  variant="secondary"
                  onClick={() => { setShowDeleteModal(false); setSelectedCompetition(null); }}
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

      {/* Edit Competition Modal */}
      {showEditModal && selectedCompetition && (
        <div style={modalOverlayStyle} onClick={() => { setShowEditModal(false); setSelectedCompetition(null); resetForm(); }}>
          <div style={{ ...modalStyle, maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
            <div style={{
              padding: spacing.xl,
              borderBottom: `1px solid ${colors.border.light}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <h3 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold }}>
                Edit Competition
              </h3>
              <button
                onClick={() => { setShowEditModal(false); setSelectedCompetition(null); resetForm(); }}
                style={{ background: 'none', border: 'none', color: colors.text.secondary, cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: spacing.xl }}>
              {/* Competition Name */}
              <div style={{ marginBottom: spacing.lg }}>
                <label style={labelStyle}>Competition Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Most Eligible Miami"
                  style={inputStyle}
                />
                <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, marginTop: spacing.xs }}>
                  Leave blank to auto-generate from organization and city.
                </p>
              </div>

              {/* Season */}
              <div style={{ marginBottom: spacing.lg }}>
                <label style={labelStyle}>Season</label>
                <input
                  type="number"
                  value={formData.season}
                  onChange={(e) => setFormData(prev => ({ ...prev, season: parseInt(e.target.value) }))}
                  style={inputStyle}
                />
              </div>

              {/* Number of Winners */}
              <div style={{ marginBottom: spacing.lg }}>
                <label style={labelStyle}>Number of Winners</label>
                <select
                  value={formData.number_of_winners}
                  onChange={(e) => setFormData(prev => ({ ...prev, number_of_winners: parseInt(e.target.value) }))}
                  style={selectStyle}
                >
                  {[1, 3, 5, 10, 15, 20].map(num => (
                    <option key={num} value={num}>{num}</option>
                  ))}
                </select>
              </div>

              {/* Assign Host */}
              <div style={{ marginBottom: spacing.lg }}>
                <label style={labelStyle}>Host</label>
                <select
                  value={formData.host_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, host_id: e.target.value }))}
                  style={selectStyle}
                >
                  <option value="">No host assigned</option>
                  {hosts.map(host => (
                    <option key={host.id} value={host.id}>
                      {getHostName(host) || host.email}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div style={{ marginBottom: spacing.lg }}>
                <label style={labelStyle}>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Competition description..."
                  rows={3}
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </div>
            </div>

            <div style={{
              padding: spacing.xl,
              borderTop: `1px solid ${colors.border.light}`,
              display: 'flex',
              gap: spacing.md,
              justifyContent: 'flex-end',
            }}>
              <Button
                variant="secondary"
                onClick={() => { setShowEditModal(false); setSelectedCompetition(null); resetForm(); }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdate}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
