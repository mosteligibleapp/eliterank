import React, { useState, useEffect, useMemo } from 'react';
import {
  Crown, Plus, MapPin, Calendar, Users, Edit2, Trash2, UserPlus,
  ChevronRight, ChevronLeft, ChevronDown, Building2, X, Loader,
  Settings, Eye, Archive, AlertTriangle, Activity, DollarSign, Lock, ChevronUp
} from 'lucide-react';
import { Button } from '../../../components/ui';
import { colors, spacing, borderRadius, typography } from '../../../styles/theme';
import { useResponsive } from '../../../hooks/useResponsive';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../../contexts/ToastContext';
import {
  COMPETITION_STATUS,
  STATUS_CONFIG,
  DEFAULT_COMPETITION,
  generateCompetitionUrl,
  generateSlug,
  PRICE_BUNDLER_TIERS,
} from '../../../types/competition';
import { validateStatusChange, COMPETITION_STATUSES } from '../../../utils/competitionPhase';

// Wizard steps for creating a new competition
const WIZARD_STEPS = [
  { id: 1, name: 'Organization', description: 'Select organization' },
  { id: 2, name: 'Location', description: 'City & season' },
  { id: 3, name: 'Details', description: 'Competition settings' },
  { id: 4, name: 'Review', description: 'Confirm & create' },
];

export default function CompetitionsManager({ onViewDashboard }) {
  const toast = useToast();
  const { isMobile } = useResponsive();

  // Data state
  const [competitions, setCompetitions] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [cities, setCities] = useState([]);
  const [categories, setCategories] = useState([]);
  const [demographics, setDemographics] = useState([]);
  const [hosts, setHosts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAssignHostModal, setShowAssignHostModal] = useState(false);
  const [showStatusConfirmModal, setShowStatusConfirmModal] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState(null); // { competitionId, newStatus, competition }
  const [selectedCompetition, setSelectedCompetition] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editModalTab, setEditModalTab] = useState('basic'); // 'basic', 'pricing', 'settings'
  const [showPriceBundlerTiers, setShowPriceBundlerTiers] = useState(false);

  // Filter state
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [filterSeason, setFilterSeason] = useState('');

  // Form state for new competition
  const [formData, setFormData] = useState({
    organization_id: '',
    city_id: '',
    category_id: '',
    demographic_id: '',
    name: '', // Custom competition name
    season: new Date().getFullYear() + 1,
    number_of_winners: 5,
    minimum_prize: 1000, // $1,000 default
    eligibility_radius: 100, // 100 miles default
    min_contestants: 40,
    max_contestants: '', // Empty = no limit
    host_id: '',
    description: '',
    // Pricing fields
    price_per_vote: 1.00,
    use_price_bundler: false,
    allow_manual_votes: false,
  });

  // Collapsible state for contestant limits section
  const [showContestantLimits, setShowContestantLimits] = useState(false);

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

      // Categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .eq('active', true)
        .order('name');

      if (!categoriesError) setCategories(categoriesData || []);

      // Demographics
      const { data: demographicsData, error: demographicsError } = await supabase
        .from('demographics')
        .select('*')
        .eq('active', true)
        .order('id');

      if (!demographicsError) setDemographics(demographicsData || []);

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
    if (!formData.organization_id || !formData.city_id || !formData.category_id || !formData.demographic_id) {
      toast.error('Organization, city, category, and demographic are required');
      return;
    }

    // Validate new settings
    if (formData.minimum_prize < 1000) {
      toast.error('Minimum prize must be at least $1,000');
      return;
    }

    if (formData.min_contestants < 10) {
      toast.error('Minimum contestants must be at least 10');
      return;
    }

    const maxContestants = formData.max_contestants ? parseInt(formData.max_contestants, 10) : null;
    if (maxContestants !== null && maxContestants <= formData.min_contestants) {
      toast.error('Maximum contestants must be greater than minimum');
      return;
    }

    setIsSubmitting(true);
    try {
      // Check for duplicate competition (same org + city + category + demographic + season)
      const { data: existing } = await supabase
        .from('competitions')
        .select('id')
        .eq('organization_id', formData.organization_id)
        .eq('city_id', formData.city_id)
        .eq('category_id', formData.category_id)
        .eq('demographic_id', formData.demographic_id)
        .eq('season', formData.season)
        .limit(1);

      if (existing && existing.length > 0) {
        const selectedCategory = categories.find(c => c.id === formData.category_id);
        const selectedDemographic = demographics.find(d => d.id === formData.demographic_id);
        const selectedCity = cities.find(c => c.id === formData.city_id);
        toast.error(
          `A ${selectedCategory?.name || 'Unknown'} competition for ${selectedDemographic?.label || 'Unknown'} in ${selectedCity?.name || 'Unknown'} already exists for Season ${formData.season}.`
        );
        setIsSubmitting(false);
        return;
      }

      // Generate competition slug
      const selectedCity = cities.find(c => c.id === formData.city_id);
      const selectedDemographic = demographics.find(d => d.id === formData.demographic_id);
      const citySlugPart = selectedCity?.slug?.replace(/-[a-z]{2}$/i, '') || generateSlug(selectedCity?.name || 'unknown');
      const isOpenDemographic = !selectedDemographic || selectedDemographic.slug === 'open';
      const competitionSlug = isOpenDemographic
        ? `${citySlugPart}-${formData.season}`
        : `${citySlugPart}-${selectedDemographic.slug}-${formData.season}`;

      // Create competition with settings included (consolidated schema)
      const { data, error } = await supabase
        .from('competitions')
        .insert({
          organization_id: formData.organization_id,
          city_id: formData.city_id,
          category_id: formData.category_id,
          demographic_id: formData.demographic_id,
          name: formData.name || null,
          slug: competitionSlug,
          season: formData.season,
          status: COMPETITION_STATUS.DRAFT,
          entry_type: 'nominations',
          has_events: true,
          number_of_winners: formData.number_of_winners,
          selection_criteria: 'votes',
          host_id: formData.host_id || null,
          description: formData.description || '',
          // New settings fields
          minimum_prize_cents: formData.minimum_prize * 100,
          eligibility_radius_miles: formData.eligibility_radius,
          min_contestants: formData.min_contestants,
          max_contestants: maxContestants,
          // Existing settings
          price_per_vote: 1.00,
          use_price_bundler: false,
          allow_manual_votes: false,
        })
        .select()
        .single();

      if (error) throw error;

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

  // Check if a status change requires confirmation
  const requiresConfirmation = (currentStatus, newStatus) => {
    // Confirmation needed for destructive changes
    if (newStatus === COMPETITION_STATUSES.ARCHIVE) return true;
    if (newStatus === COMPETITION_STATUSES.COMPLETED) return true;
    if (currentStatus === COMPETITION_STATUSES.LIVE) return true;
    return false;
  };

  // Get confirmation dialog content based on status change
  const getConfirmationContent = (currentStatus, newStatus) => {
    if (newStatus === COMPETITION_STATUSES.ARCHIVE) {
      return {
        title: 'Archive Competition?',
        message: 'This will hide the competition from public view and host dashboard.',
        confirmLabel: 'Archive',
      };
    }
    if (newStatus === COMPETITION_STATUSES.COMPLETED) {
      return {
        title: 'Complete Competition?',
        message: 'This will finalize results and make the competition read-only. This should only be done after winners are determined.',
        confirmLabel: 'Complete',
      };
    }
    if (currentStatus === COMPETITION_STATUSES.LIVE) {
      return {
        title: 'Change Live Competition?',
        message: 'This competition is currently live. Changing status will affect active voting.',
        confirmLabel: 'Change Status',
      };
    }
    return {
      title: 'Change Status?',
      message: 'Are you sure you want to change the competition status?',
      confirmLabel: 'Change Status',
    };
  };

  // Execute the actual status change in the database
  const executeStatusChange = async (competitionId, newStatus) => {
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

  // Handle status change request with validation and confirmation
  const handleStatusChange = async (competitionId, newStatus) => {
    // Find the competition object
    const competition = competitions.find(c => c.id === competitionId);
    if (!competition) {
      toast.error('Competition not found');
      return;
    }

    // Don't do anything if status is the same
    if (competition.status === newStatus) return;

    // Validate the status change
    const validation = validateStatusChange(competition, newStatus);
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    // Check if confirmation is required
    if (requiresConfirmation(competition.status, newStatus)) {
      setPendingStatusChange({ competitionId, newStatus, competition });
      setShowStatusConfirmModal(true);
      return;
    }

    // No confirmation needed, execute immediately
    await executeStatusChange(competitionId, newStatus);
  };

  // Handle status confirmation from modal
  const handleStatusConfirm = async () => {
    if (!pendingStatusChange) return;

    await executeStatusChange(pendingStatusChange.competitionId, pendingStatusChange.newStatus);
    setShowStatusConfirmModal(false);
    setPendingStatusChange(null);
  };

  // Cancel status change
  const handleStatusCancel = () => {
    setShowStatusConfirmModal(false);
    setPendingStatusChange(null);
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
      // Delete competition (related data cascades automatically)
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
      category_id: '',
      demographic_id: '',
      name: '',
      season: new Date().getFullYear() + 1,
      number_of_winners: 5,
      minimum_prize: 1000,
      eligibility_radius: 100,
      min_contestants: 40,
      max_contestants: '',
      host_id: '',
      description: '',
    });
    setCurrentStep(1);
    setShowContestantLimits(false);
  };

  // Open edit modal with competition data
  const openEditModal = (comp, defaultTab = 'basic') => {
    setSelectedCompetition(comp);
    setEditModalTab(defaultTab);
    setShowPriceBundlerTiers(false);
    setFormData({
      organization_id: comp.organization_id,
      city_id: comp.city_id,
      category_id: comp.category_id || '',
      demographic_id: comp.demographic_id || '',
      name: comp.name || '',
      season: comp.season,
      number_of_winners: comp.number_of_winners,
      minimum_prize: comp.minimum_prize_cents ? comp.minimum_prize_cents / 100 : 1000,
      eligibility_radius: comp.eligibility_radius_miles ?? 100,
      min_contestants: comp.min_contestants ?? 40,
      max_contestants: comp.max_contestants || '',
      host_id: comp.host_id || '',
      description: comp.description || '',
      // Pricing fields
      price_per_vote: comp.price_per_vote ?? 1.00,
      use_price_bundler: comp.use_price_bundler ?? false,
      allow_manual_votes: comp.allow_manual_votes ?? false,
    });
    setShowEditModal(true);
  };

  // Close edit modal and reset state
  const closeEditModal = () => {
    setShowEditModal(false);
    setSelectedCompetition(null);
    setEditModalTab('basic');
    setShowPriceBundlerTiers(false);
    resetForm();
  };

  // Update competition - saves all tabs at once
  const handleUpdate = async () => {
    if (!selectedCompetition) return;

    // Validation
    if (formData.minimum_prize < 1000) {
      toast.error('Minimum prize must be at least $1,000');
      setEditModalTab('settings');
      return;
    }

    if (formData.min_contestants < 10) {
      toast.error('Minimum contestants must be at least 10');
      setEditModalTab('settings');
      return;
    }

    const maxContestants = formData.max_contestants ? parseInt(formData.max_contestants, 10) : null;
    if (maxContestants !== null && maxContestants <= formData.min_contestants) {
      toast.error('Maximum contestants must be greater than minimum');
      setEditModalTab('settings');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('competitions')
        .update({
          // Tab 1: Basic Info
          name: formData.name || null,
          season: formData.season,
          number_of_winners: formData.number_of_winners,
          host_id: formData.host_id || null,
          description: formData.description || '',
          // Tab 2: Voting & Pricing
          price_per_vote: formData.price_per_vote,
          use_price_bundler: formData.use_price_bundler,
          allow_manual_votes: formData.allow_manual_votes,
          // Tab 3: Settings
          minimum_prize_cents: formData.minimum_prize * 100,
          eligibility_radius_miles: formData.eligibility_radius,
          min_contestants: formData.min_contestants,
          max_contestants: maxContestants,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedCompetition.id);

      if (error) throw error;

      toast.success('Competition updated');
      closeEditModal();
      fetchData();
    } catch (err) {
      toast.error(`Failed to update competition: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get display name for competition
  const getCompetitionName = (comp) => {
    // Use custom name if set, otherwise generate from org/city/demographic
    if (comp.name) return comp.name;
    const org = organizations.find(o => o.id === comp.organization_id);
    const city = cities.find(c => c.id === comp.city_id);
    const demographic = demographics.find(d => d.id === comp.demographic_id);
    const orgName = org?.name || 'Unknown Org';
    const cityName = city?.name || 'Unknown City';
    // Include demographic in name if not "Open (All)"
    if (demographic && demographic.slug !== 'open') {
      return `${orgName} ${cityName} - ${demographic.label}`;
    }
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

  // Get unique seasons from competitions (descending)
  const uniqueSeasons = useMemo(() => {
    const seasons = [...new Set(competitions.map(c => c.season))];
    return seasons.sort((a, b) => b - a);
  }, [competitions]);

  // Filter competitions
  const filteredCompetitions = useMemo(() => {
    return competitions.filter(comp => {
      if (filterStatus && comp.status !== filterStatus) return false;
      if (filterCity && comp.city_id !== filterCity) return false;
      if (filterSeason && comp.season !== parseInt(filterSeason)) return false;
      return true;
    });
  }, [competitions, filterStatus, filterCity, filterSeason]);

  // Check if any filter is active
  const hasActiveFilters = filterStatus || filterCity || filterSeason;

  // Clear all filters
  const clearFilters = () => {
    setFilterStatus('');
    setFilterCity('');
    setFilterSeason('');
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
        // Get selected values for auto-generated name preview
        const step2Org = organizations.find(o => o.id === formData.organization_id);
        const step2City = cities.find(c => c.id === formData.city_id);
        const step2Demographic = demographics.find(d => d.id === formData.demographic_id);
        const isOpenDemographic = step2Demographic?.slug === 'open';
        const autoGeneratedName = step2Org && step2City
          ? isOpenDemographic || !step2Demographic
            ? `${step2Org.name} ${step2City.name}`
            : `${step2Org.name} ${step2City.name} - ${step2Demographic.label}`
          : '';

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

            {/* Category selection */}
            <div style={{ marginBottom: spacing.lg }}>
              <label style={labelStyle}>Category *</label>
              {categories.length === 0 ? (
                <div style={{ padding: spacing.md, background: colors.background.secondary, borderRadius: borderRadius.lg, color: colors.text.secondary }}>
                  No categories found.
                </div>
              ) : (
                <select
                  value={formData.category_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, category_id: e.target.value }))}
                  style={selectStyle}
                >
                  <option value="">Select a category...</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Demographic selection */}
            <div style={{ marginBottom: spacing.lg }}>
              <label style={labelStyle}>Demographic *</label>
              {demographics.length === 0 ? (
                <div style={{ padding: spacing.md, background: colors.background.secondary, borderRadius: borderRadius.lg, color: colors.text.secondary }}>
                  No demographics found.
                </div>
              ) : (
                <select
                  value={formData.demographic_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, demographic_id: e.target.value }))}
                  style={selectStyle}
                >
                  <option value="">Select a demographic...</option>
                  {demographics.map(demographic => (
                    <option key={demographic.id} value={demographic.id}>
                      {demographic.label}
                    </option>
                  ))}
                </select>
              )}
              <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, marginTop: spacing.xs }}>
                Who can enter this competition
              </p>
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
                placeholder={autoGeneratedName || 'e.g., Most Eligible Miami'}
                style={inputStyle}
              />
              <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, marginTop: spacing.xs }}>
                {formData.name
                  ? 'Using custom name'
                  : autoGeneratedName
                    ? `Will auto-generate as: "${autoGeneratedName}"`
                    : 'Leave blank to auto-generate from organization, city, and demographic.'}
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

            {/* Minimum Prize */}
            <div style={{ marginBottom: spacing.lg }}>
              <label style={labelStyle}>Minimum Prize *</label>
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute',
                  left: spacing.md,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: colors.text.muted,
                  fontSize: typography.fontSize.md,
                  pointerEvents: 'none',
                }}>$</span>
                <input
                  type="number"
                  value={formData.minimum_prize}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    minimum_prize: Math.max(1000, parseInt(e.target.value) || 1000)
                  }))}
                  min={1000}
                  step={100}
                  style={{ ...inputStyle, paddingLeft: '28px' }}
                />
              </div>
              <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, marginTop: spacing.xs }}>
                Host must fund at least this amount
              </p>
            </div>

            {/* Eligibility Radius */}
            <div style={{ marginBottom: spacing.lg }}>
              <label style={labelStyle}>Eligibility Radius *</label>
              <select
                value={formData.eligibility_radius}
                onChange={(e) => setFormData(prev => ({ ...prev, eligibility_radius: parseInt(e.target.value) }))}
                style={selectStyle}
              >
                <option value={0}>Must reside in city</option>
                <option value={10}>Within 10 miles</option>
                <option value={25}>Within 25 miles</option>
                <option value={50}>Within 50 miles</option>
                <option value={100}>Within 100 miles</option>
              </select>
              <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, marginTop: spacing.xs }}>
                How close contestants must be to the city
              </p>
            </div>

            {/* Contestant Limits (Collapsible) */}
            <div style={{
              marginBottom: spacing.lg,
              border: `1px solid ${colors.border.light}`,
              borderRadius: borderRadius.lg,
              overflow: 'hidden',
            }}>
              <button
                type="button"
                onClick={() => setShowContestantLimits(!showContestantLimits)}
                style={{
                  width: '100%',
                  padding: spacing.md,
                  background: colors.background.secondary,
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  color: colors.text.primary,
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.medium,
                }}
              >
                <span>Contestant Limits (Optional)</span>
                <ChevronDown
                  size={16}
                  style={{
                    transform: showContestantLimits ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s ease',
                  }}
                />
              </button>
              {showContestantLimits && (
                <div style={{ padding: spacing.md, background: colors.background.card }}>
                  {/* Minimum Contestants */}
                  <div style={{ marginBottom: spacing.md }}>
                    <label style={{ ...labelStyle, marginBottom: spacing.xs }}>Minimum to Launch</label>
                    <input
                      type="number"
                      value={formData.min_contestants}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        min_contestants: Math.max(10, parseInt(e.target.value) || 10)
                      }))}
                      min={10}
                      style={inputStyle}
                    />
                    <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, marginTop: spacing.xs }}>
                      Required to start voting rounds
                    </p>
                  </div>
                  {/* Maximum Contestants */}
                  <div>
                    <label style={{ ...labelStyle, marginBottom: spacing.xs }}>Maximum Contestants</label>
                    <input
                      type="number"
                      value={formData.max_contestants}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        max_contestants: e.target.value
                      }))}
                      placeholder="No limit"
                      style={inputStyle}
                    />
                    <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, marginTop: spacing.xs }}>
                      Leave blank for no limit
                    </p>
                  </div>
                </div>
              )}
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
        const selectedCategory = categories.find(c => c.id === formData.category_id);
        const selectedDemographic = demographics.find(d => d.id === formData.demographic_id);
        const selectedHost = hosts.find(h => h.id === formData.host_id);

        // Determine if demographic is "Open (All)"
        const step4IsOpen = selectedDemographic?.slug === 'open';

        // Generate competition name for display
        const displayName = formData.name
          ? formData.name
          : selectedOrg && selectedCity
            ? step4IsOpen || !selectedDemographic
              ? `${selectedOrg.name} ${selectedCity.name}`
              : `${selectedOrg.name} ${selectedCity.name} - ${selectedDemographic.label}`
            : 'Auto-generated';

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
                <p style={{ fontWeight: typography.fontWeight.medium }}>{displayName}</p>
              </div>
              <div style={{ marginBottom: spacing.md }}>
                <span style={{ color: colors.text.muted, fontSize: typography.fontSize.sm }}>Location:</span>
                <p style={{ fontWeight: typography.fontWeight.medium }}>
                  {selectedCity ? `${selectedCity.name}, ${selectedCity.state}` : 'Not selected'}
                </p>
              </div>
              <div style={{ marginBottom: spacing.md }}>
                <span style={{ color: colors.text.muted, fontSize: typography.fontSize.sm }}>Category:</span>
                <p style={{ fontWeight: typography.fontWeight.medium }}>{selectedCategory?.name || 'Not selected'}</p>
              </div>
              <div style={{ marginBottom: spacing.md }}>
                <span style={{ color: colors.text.muted, fontSize: typography.fontSize.sm }}>Demographic:</span>
                <p style={{ fontWeight: typography.fontWeight.medium }}>{selectedDemographic?.label || 'Not selected'}</p>
              </div>
              <div style={{ marginBottom: spacing.md }}>
                <span style={{ color: colors.text.muted, fontSize: typography.fontSize.sm }}>Season:</span>
                <p style={{ fontWeight: typography.fontWeight.medium }}>{formData.season}</p>
              </div>
              <div style={{ marginBottom: spacing.md }}>
                <span style={{ color: colors.text.muted, fontSize: typography.fontSize.sm }}>Winners:</span>
                <p style={{ fontWeight: typography.fontWeight.medium }}>{formData.number_of_winners}</p>
              </div>
              <div style={{ marginBottom: spacing.md }}>
                <span style={{ color: colors.text.muted, fontSize: typography.fontSize.sm }}>Minimum Prize:</span>
                <p style={{ fontWeight: typography.fontWeight.medium }}>
                  ${formData.minimum_prize.toLocaleString()}
                </p>
              </div>
              <div style={{ marginBottom: spacing.md }}>
                <span style={{ color: colors.text.muted, fontSize: typography.fontSize.sm }}>Eligibility:</span>
                <p style={{ fontWeight: typography.fontWeight.medium }}>
                  {formData.eligibility_radius === 0
                    ? `Must reside in ${selectedCity?.name || 'city'}`
                    : `Within ${formData.eligibility_radius} miles of ${selectedCity?.name || 'city'}`}
                </p>
              </div>
              <div style={{ marginBottom: spacing.md }}>
                <span style={{ color: colors.text.muted, fontSize: typography.fontSize.sm }}>Contestants:</span>
                <p style={{ fontWeight: typography.fontWeight.medium }}>
                  {formData.max_contestants
                    ? `${formData.min_contestants} minimum, ${formData.max_contestants} maximum`
                    : `${formData.min_contestants} minimum, no maximum`}
                </p>
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
                  {generateCompetitionUrl(selectedOrg.slug, selectedCity.slug, formData.season, selectedDemographic?.slug)}
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
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: isMobile ? spacing.md : spacing.xl,
        gap: spacing.md,
        flexWrap: 'wrap',
      }}>
        <div style={{ minWidth: 0 }}>
          <h2 style={{
            fontSize: isMobile ? typography.fontSize.lg : typography.fontSize.xl,
            fontWeight: typography.fontWeight.bold,
            marginBottom: spacing.xs
          }}>
            Competitions
          </h2>
          {!isMobile && (
            <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm }}>
              Create and manage competitions
            </p>
          )}
        </div>
        <Button icon={Plus} size={isMobile ? 'sm' : 'md'} onClick={() => setShowCreateModal(true)}>
          {isMobile ? 'New' : 'New Competition'}
        </Button>
      </div>

      {/* Filter Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: isMobile ? spacing.sm : spacing.md,
        padding: isMobile ? spacing.sm : spacing.lg,
        background: colors.background.secondary,
        borderRadius: borderRadius.lg,
        marginBottom: isMobile ? spacing.sm : spacing.lg,
        flexWrap: 'wrap',
      }}>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{ ...selectStyle, flex: isMobile ? '1 1 calc(50% - 4px)' : 'none', minWidth: isMobile ? '0' : '150px', fontSize: isMobile ? '14px' : typography.fontSize.md }}
        >
          <option value="">All Statuses</option>
          {Object.entries(STATUS_CONFIG).map(([key, config]) => (
            <option key={key} value={key}>{config.label}</option>
          ))}
        </select>

        <select
          value={filterCity}
          onChange={(e) => setFilterCity(e.target.value)}
          style={{ ...selectStyle, flex: isMobile ? '1 1 calc(50% - 4px)' : 'none', minWidth: isMobile ? '0' : '150px', fontSize: isMobile ? '14px' : typography.fontSize.md }}
        >
          <option value="">All Cities</option>
          {cities.map(city => (
            <option key={city.id} value={city.id}>{city.name}</option>
          ))}
        </select>

        <select
          value={filterSeason}
          onChange={(e) => setFilterSeason(e.target.value)}
          style={{ ...selectStyle, flex: isMobile ? '1 1 calc(50% - 4px)' : 'none', minWidth: isMobile ? '0' : '120px', fontSize: isMobile ? '14px' : typography.fontSize.md }}
        >
          <option value="">All Seasons</option>
          {uniqueSeasons.map(season => (
            <option key={season} value={season}>{season}</option>
          ))}
        </select>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            style={{
              background: 'none',
              border: 'none',
              color: colors.text.muted,
              cursor: 'pointer',
              fontSize: typography.fontSize.sm,
              marginLeft: isMobile ? '0' : 'auto',
              flex: isMobile ? '1 1 calc(50% - 4px)' : 'none',
              textAlign: isMobile ? 'center' : 'right',
              padding: spacing.sm,
            }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Results Count */}
      <p style={{
        fontSize: typography.fontSize.sm,
        color: colors.text.muted,
        marginBottom: spacing.md,
      }}>
        Showing {filteredCompetitions.length} of {competitions.length} competitions
      </p>

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
      ) : filteredCompetitions.length === 0 ? (
        <div style={{
          ...cardStyle,
          textAlign: 'center',
          padding: spacing.xxxl,
        }}>
          <Crown size={48} style={{ color: colors.text.muted, marginBottom: spacing.md }} />
          <h3 style={{ fontSize: typography.fontSize.lg, marginBottom: spacing.sm }}>No competitions match filters</h3>
          <Button variant="secondary" onClick={clearFilters}>
            Clear Filters
          </Button>
        </div>
      ) : (
        filteredCompetitions.map(comp => {
          const statusConfig = STATUS_CONFIG[comp.status] || STATUS_CONFIG[COMPETITION_STATUS.DRAFT];
          const host = hosts.find(h => h.id === comp.host_id);
          const hostName = getHostName(host);
          const org = organizations.find(o => o.id === comp.organization_id);
          const city = cities.find(c => c.id === comp.city_id);

          return (
            <div key={comp.id} style={{
              ...cardStyle,
              padding: isMobile ? spacing.md : spacing.lg,
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: isMobile ? spacing.sm : spacing.lg,
                flexDirection: isMobile ? 'column' : 'row',
              }}>
                {/* Top row on mobile: Logo + Name + Status */}
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: isMobile ? spacing.sm : spacing.lg,
                  width: isMobile ? '100%' : 'auto',
                  flex: isMobile ? 'none' : 1,
                }}>
                  {/* Organization Logo */}
                  <div style={{
                    width: isMobile ? '40px' : '56px',
                    height: isMobile ? '40px' : '56px',
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
                      <Crown size={isMobile ? 18 : 24} style={{ color: colors.gold.primary }} />
                    )}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: spacing.sm,
                      marginBottom: spacing.xs,
                      flexWrap: 'wrap',
                    }}>
                      <h3 style={{
                        fontSize: isMobile ? typography.fontSize.sm : typography.fontSize.lg,
                        fontWeight: typography.fontWeight.semibold,
                        lineHeight: 1.3,
                        wordBreak: 'break-word',
                      }}>
                        {getCompetitionName(comp)}
                      </h3>
                      <div style={{
                        padding: `2px ${spacing.sm}`,
                        background: statusConfig.bg,
                        borderRadius: borderRadius.pill,
                        flexShrink: 0,
                      }}>
                        <span style={{ color: statusConfig.color, fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.medium }}>
                          {statusConfig.label}
                        </span>
                      </div>
                    </div>

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: isMobile ? spacing.md : spacing.lg,
                      marginBottom: spacing.sm,
                      flexWrap: 'wrap',
                    }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: colors.text.secondary, fontSize: isMobile ? typography.fontSize.xs : typography.fontSize.sm }}>
                        <MapPin size={isMobile ? 12 : 14} />
                        {city?.name || 'No City'}{!isMobile && `, ${city?.state || ''}`}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: colors.text.secondary, fontSize: isMobile ? typography.fontSize.xs : typography.fontSize.sm }}>
                        <Calendar size={isMobile ? 12 : 14} />
                        {isMobile ? comp.season : `Season ${comp.season}`}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: colors.text.secondary, fontSize: isMobile ? typography.fontSize.xs : typography.fontSize.sm }}>
                        <Users size={isMobile ? 12 : 14} />
                        {comp.number_of_winners} {isMobile ? 'win' : 'winners'}
                      </span>
                    </div>

                    {/* Host info */}
                    {hostName ? (
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: spacing.xs,
                        padding: `2px ${spacing.sm}`,
                        background: 'rgba(212,175,55,0.1)',
                        borderRadius: borderRadius.md,
                        fontSize: typography.fontSize.xs,
                      }}>
                        <UserPlus size={10} style={{ color: colors.gold.primary }} />
                        <span style={{ color: colors.gold.primary }}>Host: {hostName}</span>
                      </div>
                    ) : (
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: spacing.xs,
                        padding: `2px ${spacing.sm}`,
                        background: 'rgba(239,68,68,0.1)',
                        borderRadius: borderRadius.md,
                        fontSize: typography.fontSize.xs,
                      }}>
                        <AlertTriangle size={10} style={{ color: '#ef4444' }} />
                        <span style={{ color: '#ef4444' }}>No host assigned</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div style={{
                  display: 'flex',
                  gap: spacing.xs,
                  width: isMobile ? '100%' : 'auto',
                  justifyContent: isMobile ? 'flex-start' : 'flex-end',
                  flexWrap: 'wrap',
                  marginTop: isMobile ? spacing.sm : 0,
                }}>
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
                      {isMobile ? 'Assign' : 'Assign Host'}
                    </Button>
                  )}
                  {onViewDashboard && (
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={Eye}
                      onClick={() => onViewDashboard({
                        ...comp,
                        name: getCompetitionName(comp),
                        city,
                        organization: org,
                      })}
                    />
                  )}
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={Settings}
                    onClick={() => openEditModal(comp, 'pricing')}
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={Edit2}
                    onClick={() => openEditModal(comp, 'basic')}
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
                marginTop: isMobile ? spacing.md : spacing.lg,
                paddingTop: spacing.md,
                borderTop: `1px solid ${colors.border.light}`,
                display: 'flex',
                alignItems: 'center',
                gap: spacing.sm,
                flexWrap: 'wrap',
              }}>
                <span style={{ fontSize: typography.fontSize.xs, color: colors.text.muted }}>Status:</span>
                <div style={{
                  display: 'flex',
                  gap: '4px',
                  flexWrap: 'wrap',
                  flex: 1,
                }}>
                  {Object.entries(STATUS_CONFIG).map(([status, config]) => (
                    <button
                      key={status}
                      onClick={() => handleStatusChange(comp.id, status)}
                      disabled={comp.status === status}
                      style={{
                        padding: isMobile ? `4px 6px` : `${spacing.xs} ${spacing.sm}`,
                        background: comp.status === status ? config.bg : 'transparent',
                        border: `1px solid ${comp.status === status ? config.color : colors.border.light}`,
                        borderRadius: borderRadius.md,
                        color: comp.status === status ? config.color : colors.text.muted,
                        fontSize: isMobile ? '10px' : typography.fontSize.xs,
                        cursor: comp.status === status ? 'default' : 'pointer',
                        opacity: comp.status === status ? 1 : 0.6,
                        minHeight: '28px',
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
                    (currentStep === 2 && (!formData.city_id || !formData.category_id || !formData.demographic_id))
                  }
                >
                  Next
                </Button>
              ) : (
                <Button
                  onClick={handleCreate}
                  disabled={isSubmitting || !formData.organization_id || !formData.city_id || !formData.category_id || !formData.demographic_id}
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

      {/* Status Change Confirmation Modal */}
      {showStatusConfirmModal && pendingStatusChange && (
        <div style={modalOverlayStyle} onClick={handleStatusCancel}>
          <div style={{ ...modalStyle, maxWidth: '420px' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: spacing.xl, textAlign: 'center' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: pendingStatusChange.newStatus === COMPETITION_STATUSES.ARCHIVE
                  ? 'rgba(156,163,175,0.2)'
                  : pendingStatusChange.newStatus === COMPETITION_STATUSES.COMPLETED
                    ? 'rgba(168,85,247,0.2)'
                    : 'rgba(251,191,36,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto',
                marginBottom: spacing.lg,
              }}>
                <AlertTriangle size={28} style={{
                  color: pendingStatusChange.newStatus === COMPETITION_STATUSES.ARCHIVE
                    ? colors.text.muted
                    : pendingStatusChange.newStatus === COMPETITION_STATUSES.COMPLETED
                      ? '#a855f7'
                      : '#fbbf24'
                }} />
              </div>

              <h3 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, marginBottom: spacing.sm }}>
                {getConfirmationContent(pendingStatusChange.competition.status, pendingStatusChange.newStatus).title}
              </h3>
              <p style={{ color: colors.text.secondary, marginBottom: spacing.xl, lineHeight: 1.5 }}>
                {getConfirmationContent(pendingStatusChange.competition.status, pendingStatusChange.newStatus).message}
              </p>

              <div style={{ display: 'flex', gap: spacing.md }}>
                <Button
                  variant="secondary"
                  onClick={handleStatusCancel}
                  style={{ flex: 1 }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleStatusConfirm}
                  style={{
                    flex: 1,
                    background: pendingStatusChange.newStatus === COMPETITION_STATUSES.ARCHIVE
                      ? colors.text.muted
                      : pendingStatusChange.newStatus === COMPETITION_STATUSES.COMPLETED
                        ? '#a855f7'
                        : colors.gold.primary,
                  }}
                >
                  {getConfirmationContent(pendingStatusChange.competition.status, pendingStatusChange.newStatus).confirmLabel}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Competition Modal - Tabbed */}
      {showEditModal && selectedCompetition && (() => {
        const editOrg = organizations.find(o => o.id === selectedCompetition.organization_id);
        const editCity = cities.find(c => c.id === selectedCompetition.city_id);
        const editCategory = categories.find(c => c.id === selectedCompetition.category_id);
        const editDemographic = demographics.find(d => d.id === selectedCompetition.demographic_id);

        const readOnlyFieldStyle = {
          padding: spacing.md,
          background: colors.background.secondary,
          border: `1px solid ${colors.border.light}`,
          borderRadius: borderRadius.md,
          color: colors.text.muted,
        };

        const tabStyle = (isActive) => ({
          padding: `${spacing.md} ${spacing.lg}`,
          background: 'none',
          border: 'none',
          borderBottom: isActive ? `2px solid ${colors.gold.primary}` : '2px solid transparent',
          color: isActive ? colors.gold.primary : colors.text.muted,
          fontWeight: isActive ? typography.fontWeight.semibold : typography.fontWeight.normal,
          cursor: 'pointer',
          fontSize: typography.fontSize.sm,
        });

        return (
          <div style={modalOverlayStyle} onClick={closeEditModal}>
            <div style={{ ...modalStyle, maxWidth: '600px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div style={{
                padding: spacing.xl,
                borderBottom: `1px solid ${colors.border.light}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, marginBottom: spacing.xs }}>
                      Edit Competition
                    </h3>
                    <p style={{ fontSize: typography.fontSize.sm, color: colors.text.muted }}>
                      {getCompetitionName(selectedCompetition)}
                    </p>
                  </div>
                  <button
                    onClick={closeEditModal}
                    style={{ background: 'none', border: 'none', color: colors.text.secondary, cursor: 'pointer' }}
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Tab Bar */}
              <div style={{ display: 'flex', borderBottom: `1px solid ${colors.border.light}`, padding: `0 ${spacing.xl}` }}>
                <button style={tabStyle(editModalTab === 'basic')} onClick={() => setEditModalTab('basic')}>
                  Basic Info
                </button>
                <button style={tabStyle(editModalTab === 'pricing')} onClick={() => setEditModalTab('pricing')}>
                  Voting & Pricing
                </button>
                <button style={tabStyle(editModalTab === 'settings')} onClick={() => setEditModalTab('settings')}>
                  Settings
                </button>
              </div>

              {/* Tab Content */}
              <div style={{ padding: spacing.xl, overflowY: 'auto', flex: 1 }}>
                {/* Tab 1: Basic Info */}
                {editModalTab === 'basic' && (
                  <>
                    {/* Read-only fields */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing.md, marginBottom: spacing.lg }}>
                      <div>
                        <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: spacing.xs }}>
                          Organization <Lock size={12} style={{ color: colors.text.muted }} />
                        </label>
                        <div style={readOnlyFieldStyle}>{editOrg?.name || 'Not set'}</div>
                      </div>
                      <div>
                        <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: spacing.xs }}>
                          City <Lock size={12} style={{ color: colors.text.muted }} />
                        </label>
                        <div style={readOnlyFieldStyle}>{editCity?.name || 'Not set'}</div>
                      </div>
                      <div>
                        <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: spacing.xs }}>
                          Category <Lock size={12} style={{ color: colors.text.muted }} />
                        </label>
                        <div style={readOnlyFieldStyle}>{editCategory?.name || 'Not set'}</div>
                      </div>
                      <div>
                        <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: spacing.xs }}>
                          Demographic <Lock size={12} style={{ color: colors.text.muted }} />
                        </label>
                        <div style={readOnlyFieldStyle}>{editDemographic?.label || 'Not set'}</div>
                      </div>
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
                        Leave blank to auto-generate from organization and city.
                      </p>
                    </div>

                    {/* Season & Winners Row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing.md, marginBottom: spacing.lg }}>
                      <div>
                        <label style={labelStyle}>Season</label>
                        <input
                          type="number"
                          value={formData.season}
                          onChange={(e) => setFormData(prev => ({ ...prev, season: parseInt(e.target.value) }))}
                          style={inputStyle}
                        />
                      </div>
                      <div>
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
                    </div>

                    {/* Host */}
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
                    <div>
                      <label style={labelStyle}>Description</label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Competition description..."
                        rows={3}
                        style={{ ...inputStyle, resize: 'vertical' }}
                      />
                    </div>
                  </>
                )}

                {/* Tab 2: Voting & Pricing */}
                {editModalTab === 'pricing' && (
                  <>
                    <div style={{ background: colors.background.secondary, borderRadius: borderRadius.lg, padding: spacing.lg, marginBottom: spacing.lg }}>
                      <h4 style={{ fontSize: typography.fontSize.md, marginBottom: spacing.md, display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                        <DollarSign size={18} />
                        Vote Pricing
                      </h4>

                      {/* Price per vote */}
                      <div style={{ marginBottom: spacing.lg }}>
                        <label style={labelStyle}>Base Price Per Vote</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                          <span style={{ color: colors.text.muted }}>$</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.price_per_vote}
                            onChange={(e) => setFormData(prev => ({ ...prev, price_per_vote: parseFloat(e.target.value) || 0 }))}
                            style={{ ...inputStyle, maxWidth: '120px' }}
                          />
                        </div>
                      </div>

                      {/* Price bundler toggle */}
                      <div style={{ marginBottom: spacing.md }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: spacing.md, cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={formData.use_price_bundler}
                            onChange={(e) => setFormData(prev => ({ ...prev, use_price_bundler: e.target.checked }))}
                            style={{ width: 18, height: 18, accentColor: colors.gold.primary }}
                          />
                          <span>Enable Price Bundler (volume discounts)</span>
                        </label>
                      </div>

                      {/* Show bundler tiers */}
                      {formData.use_price_bundler && (
                        <div>
                          <button
                            onClick={() => setShowPriceBundlerTiers(!showPriceBundlerTiers)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: colors.gold.primary,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: spacing.xs,
                              fontSize: typography.fontSize.sm,
                            }}
                          >
                            {showPriceBundlerTiers ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            View pricing tiers
                          </button>
                          {showPriceBundlerTiers && PRICE_BUNDLER_TIERS && (
                            <div style={{
                              marginTop: spacing.md,
                              background: colors.background.card,
                              borderRadius: borderRadius.md,
                              padding: spacing.md,
                            }}>
                              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: typography.fontSize.sm }}>
                                <thead>
                                  <tr style={{ borderBottom: `1px solid ${colors.border.light}` }}>
                                    <th style={{ padding: spacing.sm, textAlign: 'left', color: colors.text.muted }}>Votes</th>
                                    <th style={{ padding: spacing.sm, textAlign: 'center', color: colors.text.muted }}>Discount</th>
                                    <th style={{ padding: spacing.sm, textAlign: 'right', color: colors.text.muted }}>Price/Vote</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {PRICE_BUNDLER_TIERS.map((tier, i) => (
                                    <tr key={i}>
                                      <td style={{ padding: spacing.sm }}>
                                        {tier.minVotes === tier.maxVotes ? tier.minVotes : `${tier.minVotes}-${tier.maxVotes}`}
                                      </td>
                                      <td style={{ padding: spacing.sm, textAlign: 'center', color: colors.gold.primary }}>
                                        {tier.discount}% off
                                      </td>
                                      <td style={{ padding: spacing.sm, textAlign: 'right' }}>
                                        ${(formData.price_per_vote * tier.pricePerVote).toFixed(2)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Manual Votes Section */}
                    <div style={{ background: colors.background.secondary, borderRadius: borderRadius.lg, padding: spacing.lg }}>
                      <h4 style={{ fontSize: typography.fontSize.md, marginBottom: spacing.md }}>
                        Additional Options
                      </h4>

                      <label style={{ display: 'flex', alignItems: 'flex-start', gap: spacing.md, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={formData.allow_manual_votes}
                          onChange={(e) => setFormData(prev => ({ ...prev, allow_manual_votes: e.target.checked }))}
                          style={{ width: 18, height: 18, accentColor: colors.gold.primary, marginTop: 2 }}
                        />
                        <div>
                          <span>Allow Manual Votes</span>
                          <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, marginTop: spacing.xs }}>
                            Host can add manual votes (tracked separately from public votes)
                          </p>
                        </div>
                      </label>
                    </div>
                  </>
                )}

                {/* Tab 3: Settings */}
                {editModalTab === 'settings' && (
                  <>
                    {/* Minimum Prize */}
                    <div style={{ marginBottom: spacing.lg }}>
                      <label style={labelStyle}>Minimum Prize</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                        <span style={{ color: colors.text.muted }}>$</span>
                        <input
                          type="number"
                          value={formData.minimum_prize}
                          onChange={(e) => setFormData(prev => ({ ...prev, minimum_prize: parseInt(e.target.value) || 0 }))}
                          style={{ ...inputStyle, maxWidth: '150px' }}
                        />
                      </div>
                      <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, marginTop: spacing.xs }}>
                        Host must fund at least this amount
                      </p>
                    </div>

                    {/* Eligibility Radius */}
                    <div style={{ marginBottom: spacing.lg }}>
                      <label style={labelStyle}>Eligibility Radius</label>
                      <select
                        value={formData.eligibility_radius}
                        onChange={(e) => setFormData(prev => ({ ...prev, eligibility_radius: parseInt(e.target.value) }))}
                        style={selectStyle}
                      >
                        <option value={0}>Must reside in city</option>
                        <option value={10}>Within 10 miles</option>
                        <option value={25}>Within 25 miles</option>
                        <option value={50}>Within 50 miles</option>
                        <option value={100}>Within 100 miles</option>
                      </select>
                      <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, marginTop: spacing.xs }}>
                        Contestants must confirm they meet this requirement
                      </p>
                    </div>

                    {/* Contestant Limits */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing.md }}>
                      <div>
                        <label style={labelStyle}>Minimum Contestants</label>
                        <input
                          type="number"
                          value={formData.min_contestants}
                          onChange={(e) => setFormData(prev => ({ ...prev, min_contestants: parseInt(e.target.value) || 10 }))}
                          style={inputStyle}
                        />
                        <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, marginTop: spacing.xs }}>
                          Required to start voting
                        </p>
                      </div>
                      <div>
                        <label style={labelStyle}>Maximum Contestants</label>
                        <input
                          type="number"
                          value={formData.max_contestants}
                          onChange={(e) => setFormData(prev => ({ ...prev, max_contestants: e.target.value }))}
                          placeholder="No limit"
                          style={inputStyle}
                        />
                        <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, marginTop: spacing.xs }}>
                          Leave blank for no limit
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Footer */}
              <div style={{
                padding: spacing.xl,
                borderTop: `1px solid ${colors.border.light}`,
                display: 'flex',
                gap: spacing.md,
                justifyContent: 'flex-end',
              }}>
                <Button variant="secondary" onClick={closeEditModal}>
                  Cancel
                </Button>
                <Button onClick={handleUpdate} disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
