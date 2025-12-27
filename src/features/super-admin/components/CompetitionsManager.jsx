import React, { useState, useEffect } from 'react';
import {
  Crown, Plus, MapPin, Calendar, Users, Edit2, Trash2, UserPlus,
  ChevronDown, Check, X, Eye, Building2, Trophy, Vote, Scale,
  Heart, Dumbbell, Star, Sparkles, ChevronRight, ChevronLeft, DollarSign, Save, Loader
} from 'lucide-react';
import { Button, Badge } from '../../../components/ui';
import { colors, spacing, borderRadius, typography } from '../../../styles/theme';
import { useCompetitionManager } from '../hooks';
import { supabase } from '../../../lib/supabase';

// Emoji options for new organizations
const LOGO_OPTIONS = ['👑', '✨', '💪', '⭐', '🏆', '🎭', '💎', '🌟', '🎯', '🔥', '💫', '🎪'];

// Category types with icons
const CATEGORY_TYPES = [
  { id: 'dating', name: 'Dating', icon: Heart, color: '#ec4899', description: 'Singles & eligibility competitions' },
  { id: 'pageant', name: 'Pageant', icon: Crown, color: '#d4af37', description: 'Beauty, talent & personality' },
  { id: 'fitness', name: 'Fitness', icon: Dumbbell, color: '#22c55e', description: 'Body transformation & athletics' },
  { id: 'health', name: 'Health & Wellness', icon: Heart, color: '#06b6d4', description: 'Wellness journey competitions' },
  { id: 'social', name: 'Social Influencer', icon: Star, color: '#8b5cf6', description: 'Social media & content creation' },
  { id: 'talent', name: 'Talent', icon: Sparkles, color: '#f59e0b', description: 'Performance & skill-based' },
];

// Contestant entry types
const CONTESTANT_TYPES = [
  { id: 'nominations', name: 'Nominations', description: 'Public can nominate contestants who then apply' },
  { id: 'appointments', name: 'Appointments', description: 'Host directly selects and invites contestants' },
  { id: 'applications', name: 'Open Applications', description: 'Anyone can apply to be a contestant' },
];

// Winner selection criteria
const SELECTION_CRITERIA = [
  { id: 'votes', name: 'Public Votes Only', icon: Vote, description: 'Winner determined 100% by public votes' },
  { id: 'judges', name: 'Judges Only', icon: Scale, description: 'Winner determined 100% by judge panel' },
  { id: 'hybrid', name: 'Hybrid', icon: Trophy, description: 'Combination of votes and judges' },
];

const AVAILABLE_CITIES = [
  { name: 'New York', state: 'NY' },
  { name: 'Chicago', state: 'IL' },
  { name: 'Miami', state: 'FL' },
  { name: 'Los Angeles', state: 'CA' },
  { name: 'Dallas', state: 'TX' },
  { name: 'Atlanta', state: 'GA' },
  { name: 'Boston', state: 'MA' },
  { name: 'San Francisco', state: 'CA' },
  { name: 'Seattle', state: 'WA' },
  { name: 'Denver', state: 'CO' },
  { name: 'Houston', state: 'TX' },
  { name: 'Phoenix', state: 'AZ' },
];

const statusStyles = {
  draft: { bg: 'rgba(100,100,100,0.2)', color: colors.text.secondary, label: 'Draft' },
  upcoming: { bg: 'rgba(100,100,100,0.2)', color: colors.text.secondary, label: 'Upcoming' },
  assigned: { bg: 'rgba(59,130,246,0.2)', color: '#3b82f6', label: 'Host Assigned' },
  active: { bg: 'rgba(34,197,94,0.2)', color: '#22c55e', label: 'Active' },
  nomination: { bg: 'rgba(212,175,55,0.2)', color: '#d4af37', label: 'Nominations' },
  voting: { bg: 'rgba(139,92,246,0.2)', color: '#8b5cf6', label: 'Voting' },
  completed: { bg: 'rgba(139,92,246,0.2)', color: '#8b5cf6', label: 'Completed' },
};


const WIZARD_STEPS = [
  { id: 1, name: 'Organization', description: 'Select owner organization' },
  { id: 2, name: 'Location', description: 'Choose city and year' },
  { id: 3, name: 'Category', description: 'Select competition type' },
  { id: 4, name: 'Contestants', description: 'Entry method' },
  { id: 5, name: 'Settings', description: 'Host & events' },
  { id: 6, name: 'Winners', description: 'Selection criteria' },
  { id: 7, name: 'Review', description: 'Confirm details' },
];

export default function CompetitionsManager({ onViewDashboard }) {
  // Use the Supabase-connected hook
  const {
    templates,
    organizations,
    loading,
    error,
    createCompetition,
    updateCompetition,
    deleteCompetition,
    assignHost,
    activateCompetition,
    createOrganization,
  } = useCompetitionManager();

  // Hosts from Supabase (users with is_host = true)
  const [availableHosts, setAvailableHosts] = useState([]);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [showNewOrgForm, setShowNewOrgForm] = useState(false);
  const [newOrg, setNewOrg] = useState({ name: '', logo: '🏆', description: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit mode state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [editStep, setEditStep] = useState(1);

  const [newTemplate, setNewTemplate] = useState({
    organization: null,
    city: '',
    season: new Date().getFullYear() + 1,
    category: '',
    contestantType: '',
    hasHost: true,
    hasEvents: true,
    numberOfWinners: 5,
    selectionCriteria: '',
    voteWeight: 50,
    judgeWeight: 50,
    votePrice: 1.00,
    hostPayoutPercentage: 20,
    maxContestants: 30,
  });

  // Fetch available hosts from Supabase
  useEffect(() => {
    const fetchHosts = async () => {
      if (!supabase) return;
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name')
        .eq('is_host', true);

      if (!error && data) {
        setAvailableHosts(data.map(h => ({
          id: h.id,
          name: `${h.first_name || ''} ${h.last_name || ''}`.trim() || h.email,
          email: h.email,
        })));
      }
    };
    fetchHosts();
  }, []);

  const resetWizard = () => {
    setCurrentStep(1);
    setShowNewOrgForm(false);
    setNewOrg({ name: '', logo: '🏆', description: '' });
    setNewTemplate({
      organization: null,
      city: '',
      season: new Date().getFullYear() + 1,
      category: '',
      contestantType: '',
      hasHost: true,
      hasEvents: true,
      numberOfWinners: 5,
      selectionCriteria: '',
      voteWeight: 50,
      judgeWeight: 50,
      votePrice: 1.00,
      hostPayoutPercentage: 20,
      maxContestants: 30,
    });
  };

  const handleCreateOrganization = async () => {
    if (!newOrg.name.trim()) return;
    setIsSubmitting(true);
    try {
      const org = await createOrganization({
        name: newOrg.name.trim(),
        logo: newOrg.logo,
        description: newOrg.description.trim() || `${newOrg.name} competitions`,
      });
      if (org) {
        setNewTemplate({ ...newTemplate, organization: org });
        setShowNewOrgForm(false);
        setNewOrg({ name: '', logo: '🏆', description: '' });
      } else {
        alert('Failed to create organization. Check console for details.');
      }
    } catch (err) {
      console.error('Error creating organization:', err);
      alert(`Error creating organization: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateTemplate = async () => {
    setIsSubmitting(true);
    try {
      const result = await createCompetition(newTemplate, null); // No host assigned initially
      if (result) {
        setShowCreateModal(false);
        resetWizard();
      } else {
        // Show error to user
        alert('Failed to create competition. Check console for details.');
      }
    } catch (err) {
      console.error('Error creating competition:', err);
      alert(`Error creating competition: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssignHost = async (templateId, host) => {
    setIsSubmitting(true);
    try {
      const result = await assignHost(templateId, host.id);
      if (result && result.success) {
        setShowAssignModal(false);
        setSelectedTemplate(null);
      } else {
        const errorMsg = result?.error || 'Unknown error';
        console.error('Failed to assign host:', errorMsg);
        alert(`Failed to assign host: ${errorMsg}`);
      }
    } catch (err) {
      console.error('Error assigning host:', err);
      alert(`Error assigning host: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleActivate = async (templateId) => {
    await activateCompetition(templateId);
  };

  const handleDelete = async (templateId) => {
    if (window.confirm('Are you sure you want to delete this competition?')) {
      await deleteCompetition(templateId);
    }
  };

  // Open edit modal with pre-populated data
  const handleOpenEdit = (template) => {
    setEditingTemplate({ ...template });
    setEditStep(1);
    setShowEditModal(true);
  };

  // Save edited template
  const handleSaveEdit = async () => {
    setIsSubmitting(true);
    try {
      await updateCompetition(editingTemplate.id, editingTemplate);
      setShowEditModal(false);
      setEditingTemplate(null);
      setEditStep(1);
    } catch (err) {
      console.error('Error saving competition:', err);
      alert(`Error saving competition: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  
  const canProceed = () => {
    switch (currentStep) {
      case 1: return newTemplate.organization !== null;
      case 2: return newTemplate.city !== '';
      case 3: return newTemplate.category !== '';
      case 4: return newTemplate.contestantType !== '';
      case 5: return true;
      case 6: return newTemplate.selectionCriteria !== '';
      case 7: return true;
      default: return false;
    }
  };

  const getCategoryIcon = (categoryId) => {
    const cat = CATEGORY_TYPES.find(c => c.id === categoryId);
    return cat ? cat.icon : Star;
  };

  const getCategoryColor = (categoryId) => {
    const cat = CATEGORY_TYPES.find(c => c.id === categoryId);
    return cat ? cat.color : '#8b5cf6';
  };

  const renderWizardStep = () => {
    switch (currentStep) {
      case 1: // Organization
        return (
          <div>
            <h3 style={{ fontSize: typography.fontSize.lg, marginBottom: spacing.xl }}>
              Select Organization
            </h3>

            {!showNewOrgForm ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: spacing.md }}>
                  {organizations.map((org) => (
                    <div
                      key={org.id}
                      onClick={() => setNewTemplate({ ...newTemplate, organization: org })}
                      style={{
                        padding: spacing.xl,
                        background: newTemplate.organization?.id === org.id
                          ? 'rgba(139,92,246,0.2)'
                          : colors.background.secondary,
                        border: `2px solid ${newTemplate.organization?.id === org.id ? '#8b5cf6' : colors.border.light}`,
                        borderRadius: borderRadius.xl,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        textAlign: 'center',
                      }}
                    >
                      <div style={{ fontSize: '48px', marginBottom: spacing.md }}>{org.logo}</div>
                      <h4 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, marginBottom: spacing.xs }}>
                        {org.name}
                      </h4>
                      <p style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>
                        {org.description}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Create New Organization Button */}
                <div
                  onClick={() => setShowNewOrgForm(true)}
                  style={{
                    marginTop: spacing.xl,
                    padding: spacing.xl,
                    background: 'rgba(139,92,246,0.05)',
                    border: `2px dashed rgba(139,92,246,0.3)`,
                    borderRadius: borderRadius.xl,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    textAlign: 'center',
                  }}
                >
                  <div style={{
                    width: '48px',
                    height: '48px',
                    background: 'rgba(139,92,246,0.2)',
                    borderRadius: borderRadius.full,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto',
                    marginBottom: spacing.md,
                  }}>
                    <Plus size={24} style={{ color: '#8b5cf6' }} />
                  </div>
                  <h4 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, marginBottom: spacing.xs, color: '#8b5cf6' }}>
                    Create New Organization
                  </h4>
                  <p style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>
                    Add a new brand like "Playboy", "Sports Illustrated", etc.
                  </p>
                </div>
              </>
            ) : (
              /* New Organization Form */
              <div style={{
                padding: spacing.xxl,
                background: colors.background.secondary,
                border: `1px solid ${colors.border.light}`,
                borderRadius: borderRadius.xl,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md, marginBottom: spacing.xl }}>
                  <Building2 size={24} style={{ color: '#8b5cf6' }} />
                  <h4 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold }}>
                    New Organization
                  </h4>
                </div>

                {/* Logo Selection */}
                <div style={{ marginBottom: spacing.xl }}>
                  <label style={{ display: 'block', fontSize: typography.fontSize.sm, color: colors.text.secondary, marginBottom: spacing.sm }}>
                    Logo / Icon
                  </label>
                  <div style={{ display: 'flex', gap: spacing.sm, flexWrap: 'wrap' }}>
                    {LOGO_OPTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => setNewOrg({ ...newOrg, logo: emoji })}
                        style={{
                          width: '48px',
                          height: '48px',
                          fontSize: '24px',
                          background: newOrg.logo === emoji ? 'rgba(139,92,246,0.3)' : colors.background.card,
                          border: `2px solid ${newOrg.logo === emoji ? '#8b5cf6' : colors.border.light}`,
                          borderRadius: borderRadius.lg,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Organization Name */}
                <div style={{ marginBottom: spacing.xl }}>
                  <label style={{ display: 'block', fontSize: typography.fontSize.sm, color: colors.text.secondary, marginBottom: spacing.sm }}>
                    Organization Name *
                  </label>
                  <input
                    type="text"
                    value={newOrg.name}
                    onChange={(e) => setNewOrg({ ...newOrg, name: e.target.value })}
                    placeholder="e.g., Playboy, Sports Illustrated"
                    style={{
                      width: '100%',
                      padding: spacing.md,
                      background: colors.background.card,
                      border: `1px solid ${colors.border.light}`,
                      borderRadius: borderRadius.md,
                      color: '#fff',
                      fontSize: typography.fontSize.md,
                    }}
                  />
                </div>

                {/* Description */}
                <div style={{ marginBottom: spacing.xl }}>
                  <label style={{ display: 'block', fontSize: typography.fontSize.sm, color: colors.text.secondary, marginBottom: spacing.sm }}>
                    Description (optional)
                  </label>
                  <input
                    type="text"
                    value={newOrg.description}
                    onChange={(e) => setNewOrg({ ...newOrg, description: e.target.value })}
                    placeholder="Brief description of the organization"
                    style={{
                      width: '100%',
                      padding: spacing.md,
                      background: colors.background.card,
                      border: `1px solid ${colors.border.light}`,
                      borderRadius: borderRadius.md,
                      color: '#fff',
                      fontSize: typography.fontSize.md,
                    }}
                  />
                </div>

                {/* Preview */}
                {newOrg.name && (
                  <div style={{
                    padding: spacing.lg,
                    background: 'rgba(139,92,246,0.1)',
                    border: `1px solid rgba(139,92,246,0.3)`,
                    borderRadius: borderRadius.lg,
                    marginBottom: spacing.xl,
                    textAlign: 'center',
                  }}>
                    <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, marginBottom: spacing.sm }}>Preview</p>
                    <div style={{ fontSize: '32px', marginBottom: spacing.sm }}>{newOrg.logo}</div>
                    <p style={{ fontWeight: typography.fontWeight.semibold }}>{newOrg.name}</p>
                    <p style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>
                      {newOrg.description || `${newOrg.name} competitions`}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', gap: spacing.md }}>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setShowNewOrgForm(false);
                      setNewOrg({ name: '', logo: '🏆', description: '' });
                    }}
                    style={{ flex: 1 }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateOrganization}
                    disabled={!newOrg.name.trim()}
                    style={{ flex: 1 }}
                  >
                    Create & Select
                  </Button>
                </div>
              </div>
            )}
          </div>
        );

      case 2: // Location
        return (
          <div>
            <h3 style={{ fontSize: typography.fontSize.lg, marginBottom: spacing.xl }}>
              Location & Season
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xl }}>
              <div>
                <label style={{ display: 'block', fontSize: typography.fontSize.sm, color: colors.text.secondary, marginBottom: spacing.sm }}>
                  City *
                </label>
                <select
                  value={newTemplate.city}
                  onChange={(e) => setNewTemplate({ ...newTemplate, city: e.target.value })}
                  style={{
                    width: '100%',
                    padding: spacing.md,
                    background: colors.background.secondary,
                    border: `1px solid ${colors.border.light}`,
                    borderRadius: borderRadius.md,
                    color: '#fff',
                    fontSize: typography.fontSize.md,
                  }}
                >
                  <option value="">Select a city</option>
                  {AVAILABLE_CITIES.map((city) => (
                    <option key={city.name} value={city.name}>
                      {city.name}, {city.state}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: typography.fontSize.sm, color: colors.text.secondary, marginBottom: spacing.sm }}>
                  Season (Year) *
                </label>
                <input
                  type="number"
                  value={newTemplate.season}
                  onChange={(e) => setNewTemplate({ ...newTemplate, season: parseInt(e.target.value) })}
                  min={new Date().getFullYear()}
                  max={new Date().getFullYear() + 5}
                  style={{
                    width: '100%',
                    padding: spacing.md,
                    background: colors.background.secondary,
                    border: `1px solid ${colors.border.light}`,
                    borderRadius: borderRadius.md,
                    color: '#fff',
                    fontSize: typography.fontSize.md,
                  }}
                />
              </div>
            </div>
          </div>
        );

      case 3: // Category
        return (
          <div>
            <h3 style={{ fontSize: typography.fontSize.lg, marginBottom: spacing.xl }}>
              Competition Category
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: spacing.md }}>
              {CATEGORY_TYPES.map((cat) => {
                const IconComponent = cat.icon;
                return (
                  <div
                    key={cat.id}
                    onClick={() => setNewTemplate({ ...newTemplate, category: cat.id })}
                    style={{
                      padding: spacing.lg,
                      background: newTemplate.category === cat.id
                        ? `${cat.color}20`
                        : colors.background.secondary,
                      border: `2px solid ${newTemplate.category === cat.id ? cat.color : colors.border.light}`,
                      borderRadius: borderRadius.xl,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        background: `${cat.color}30`,
                        borderRadius: borderRadius.lg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <IconComponent size={20} style={{ color: cat.color }} />
                      </div>
                      <h4 style={{ fontSize: typography.fontSize.md, fontWeight: typography.fontWeight.semibold }}>
                        {cat.name}
                      </h4>
                    </div>
                    <p style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>
                      {cat.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        );

      case 4: // Contestant Type
        return (
          <div>
            <h3 style={{ fontSize: typography.fontSize.lg, marginBottom: spacing.xl }}>
              How Will Contestants Enter?
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
              {CONTESTANT_TYPES.map((type) => (
                <div
                  key={type.id}
                  onClick={() => setNewTemplate({ ...newTemplate, contestantType: type.id })}
                  style={{
                    padding: spacing.xl,
                    background: newTemplate.contestantType === type.id
                      ? 'rgba(139,92,246,0.2)'
                      : colors.background.secondary,
                    border: `2px solid ${newTemplate.contestantType === type.id ? '#8b5cf6' : colors.border.light}`,
                    borderRadius: borderRadius.xl,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <h4 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, marginBottom: spacing.xs }}>
                        {type.name}
                      </h4>
                      <p style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>
                        {type.description}
                      </p>
                    </div>
                    {newTemplate.contestantType === type.id && (
                      <div style={{
                        width: '24px',
                        height: '24px',
                        background: '#8b5cf6',
                        borderRadius: borderRadius.full,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <Check size={14} style={{ color: '#fff' }} />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 5: // Settings (Host & Events)
        return (
          <div>
            <h3 style={{ fontSize: typography.fontSize.lg, marginBottom: spacing.xl }}>
              Competition Settings
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xl }}>
              {/* Host Toggle */}
              <div style={{
                padding: spacing.xl,
                background: colors.background.secondary,
                borderRadius: borderRadius.xl,
                border: `1px solid ${colors.border.light}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md }}>
                  <div>
                    <h4 style={{ fontSize: typography.fontSize.md, fontWeight: typography.fontWeight.semibold, marginBottom: spacing.xs }}>
                      Assign Host
                    </h4>
                    <p style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>
                      A host manages the competition locally
                    </p>
                  </div>
                  <button
                    onClick={() => setNewTemplate({ ...newTemplate, hasHost: !newTemplate.hasHost })}
                    style={{
                      width: '56px',
                      height: '32px',
                      borderRadius: borderRadius.pill,
                      background: newTemplate.hasHost ? '#8b5cf6' : colors.background.card,
                      border: `1px solid ${newTemplate.hasHost ? '#8b5cf6' : colors.border.light}`,
                      cursor: 'pointer',
                      position: 'relative',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: borderRadius.full,
                      background: '#fff',
                      position: 'absolute',
                      top: '3px',
                      left: newTemplate.hasHost ? '28px' : '3px',
                      transition: 'all 0.2s',
                    }} />
                  </button>
                </div>
              </div>

              {/* Events Toggle */}
              <div style={{
                padding: spacing.xl,
                background: colors.background.secondary,
                borderRadius: borderRadius.xl,
                border: `1px solid ${colors.border.light}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md }}>
                  <div>
                    <h4 style={{ fontSize: typography.fontSize.md, fontWeight: typography.fontWeight.semibold, marginBottom: spacing.xs }}>
                      Include Events
                    </h4>
                    <p style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>
                      Host can create in-person or virtual events
                    </p>
                  </div>
                  <button
                    onClick={() => setNewTemplate({ ...newTemplate, hasEvents: !newTemplate.hasEvents })}
                    style={{
                      width: '56px',
                      height: '32px',
                      borderRadius: borderRadius.pill,
                      background: newTemplate.hasEvents ? '#8b5cf6' : colors.background.card,
                      border: `1px solid ${newTemplate.hasEvents ? '#8b5cf6' : colors.border.light}`,
                      cursor: 'pointer',
                      position: 'relative',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: borderRadius.full,
                      background: '#fff',
                      position: 'absolute',
                      top: '3px',
                      left: newTemplate.hasEvents ? '28px' : '3px',
                      transition: 'all 0.2s',
                    }} />
                  </button>
                </div>
              </div>

              {/* Max Contestants */}
              <div>
                <label style={{ display: 'block', fontSize: typography.fontSize.sm, color: colors.text.secondary, marginBottom: spacing.sm }}>
                  Max Contestants
                </label>
                <input
                  type="number"
                  value={newTemplate.maxContestants}
                  onChange={(e) => setNewTemplate({ ...newTemplate, maxContestants: parseInt(e.target.value) })}
                  style={{
                    width: '100%',
                    padding: spacing.md,
                    background: colors.background.secondary,
                    border: `1px solid ${colors.border.light}`,
                    borderRadius: borderRadius.md,
                    color: '#fff',
                    fontSize: typography.fontSize.md,
                  }}
                />
              </div>
            </div>
          </div>
        );

      case 6: // Winners & Selection
        return (
          <div>
            <h3 style={{ fontSize: typography.fontSize.lg, marginBottom: spacing.xl }}>
              Winner Selection
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xl }}>
              {/* Number of Winners */}
              <div>
                <label style={{ display: 'block', fontSize: typography.fontSize.sm, color: colors.text.secondary, marginBottom: spacing.sm }}>
                  Number of Winners
                </label>
                <div style={{ display: 'flex', gap: spacing.sm }}>
                  {[1, 3, 5, 10].map((num) => (
                    <button
                      key={num}
                      onClick={() => setNewTemplate({ ...newTemplate, numberOfWinners: num })}
                      style={{
                        flex: 1,
                        padding: spacing.md,
                        background: newTemplate.numberOfWinners === num ? '#8b5cf6' : colors.background.secondary,
                        border: `1px solid ${newTemplate.numberOfWinners === num ? '#8b5cf6' : colors.border.light}`,
                        borderRadius: borderRadius.md,
                        color: '#fff',
                        fontSize: typography.fontSize.md,
                        fontWeight: typography.fontWeight.semibold,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      {num}
                    </button>
                  ))}
                  <input
                    type="number"
                    value={newTemplate.numberOfWinners}
                    onChange={(e) => setNewTemplate({ ...newTemplate, numberOfWinners: parseInt(e.target.value) || 1 })}
                    min="1"
                    max="100"
                    placeholder="Custom"
                    style={{
                      width: '80px',
                      padding: spacing.md,
                      background: colors.background.secondary,
                      border: `1px solid ${colors.border.light}`,
                      borderRadius: borderRadius.md,
                      color: '#fff',
                      fontSize: typography.fontSize.md,
                      textAlign: 'center',
                    }}
                  />
                </div>
              </div>

              {/* Selection Criteria */}
              <div>
                <label style={{ display: 'block', fontSize: typography.fontSize.sm, color: colors.text.secondary, marginBottom: spacing.md }}>
                  Selection Criteria *
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
                  {SELECTION_CRITERIA.map((criteria) => {
                    const IconComponent = criteria.icon;
                    return (
                      <div
                        key={criteria.id}
                        onClick={() => {
                          const weights = criteria.id === 'votes'
                            ? { voteWeight: 100, judgeWeight: 0 }
                            : criteria.id === 'judges'
                              ? { voteWeight: 0, judgeWeight: 100 }
                              : { voteWeight: 50, judgeWeight: 50 };
                          setNewTemplate({ ...newTemplate, selectionCriteria: criteria.id, ...weights });
                        }}
                        style={{
                          padding: spacing.lg,
                          background: newTemplate.selectionCriteria === criteria.id
                            ? 'rgba(139,92,246,0.2)'
                            : colors.background.secondary,
                          border: `2px solid ${newTemplate.selectionCriteria === criteria.id ? '#8b5cf6' : colors.border.light}`,
                          borderRadius: borderRadius.xl,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
                          <div style={{
                            width: '40px',
                            height: '40px',
                            background: 'rgba(139,92,246,0.2)',
                            borderRadius: borderRadius.lg,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}>
                            <IconComponent size={20} style={{ color: '#8b5cf6' }} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <h4 style={{ fontSize: typography.fontSize.md, fontWeight: typography.fontWeight.semibold, marginBottom: spacing.xs }}>
                              {criteria.name}
                            </h4>
                            <p style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>
                              {criteria.description}
                            </p>
                          </div>
                          {newTemplate.selectionCriteria === criteria.id && (
                            <div style={{
                              width: '24px',
                              height: '24px',
                              background: '#8b5cf6',
                              borderRadius: borderRadius.full,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}>
                              <Check size={14} style={{ color: '#fff' }} />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Weight Sliders for Hybrid */}
              {newTemplate.selectionCriteria === 'hybrid' && (
                <div style={{
                  padding: spacing.xl,
                  background: colors.background.secondary,
                  borderRadius: borderRadius.xl,
                  border: `1px solid ${colors.border.light}`,
                }}>
                  <h4 style={{ fontSize: typography.fontSize.md, fontWeight: typography.fontWeight.semibold, marginBottom: spacing.lg }}>
                    Weight Distribution
                  </h4>

                  <div style={{ marginBottom: spacing.lg }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: spacing.sm }}>
                      <span style={{ fontSize: typography.fontSize.sm }}>Public Votes</span>
                      <span style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.bold, color: '#22c55e' }}>
                        {newTemplate.voteWeight}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={newTemplate.voteWeight}
                      onChange={(e) => {
                        const voteWeight = parseInt(e.target.value);
                        setNewTemplate({ ...newTemplate, voteWeight, judgeWeight: 100 - voteWeight });
                      }}
                      style={{
                        width: '100%',
                        accentColor: '#22c55e',
                      }}
                    />
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: spacing.sm }}>
                      <span style={{ fontSize: typography.fontSize.sm }}>Judge Scores</span>
                      <span style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.bold, color: '#d4af37' }}>
                        {newTemplate.judgeWeight}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={newTemplate.judgeWeight}
                      onChange={(e) => {
                        const judgeWeight = parseInt(e.target.value);
                        setNewTemplate({ ...newTemplate, judgeWeight, voteWeight: 100 - judgeWeight });
                      }}
                      style={{
                        width: '100%',
                        accentColor: '#d4af37',
                      }}
                    />
                  </div>

                  {/* Visual Representation */}
                  <div style={{
                    marginTop: spacing.lg,
                    height: '24px',
                    borderRadius: borderRadius.pill,
                    overflow: 'hidden',
                    display: 'flex',
                  }}>
                    <div style={{ width: `${newTemplate.voteWeight}%`, background: '#22c55e', transition: 'width 0.2s' }} />
                    <div style={{ width: `${newTemplate.judgeWeight}%`, background: '#d4af37', transition: 'width 0.2s' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: spacing.sm }}>
                    <span style={{ fontSize: typography.fontSize.xs, color: '#22c55e' }}>Votes ({newTemplate.voteWeight}%)</span>
                    <span style={{ fontSize: typography.fontSize.xs, color: '#d4af37' }}>Judges ({newTemplate.judgeWeight}%)</span>
                  </div>
                </div>
              )}

              {/* Vote Price - Only shown for votes or hybrid selection */}
              {(newTemplate.selectionCriteria === 'votes' || newTemplate.selectionCriteria === 'hybrid') && (
                <div style={{
                  padding: spacing.xl,
                  background: colors.background.secondary,
                  borderRadius: borderRadius.xl,
                  border: `1px solid ${colors.border.light}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      background: 'rgba(34,197,94,0.2)',
                      borderRadius: borderRadius.lg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <DollarSign size={20} style={{ color: '#22c55e' }} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: typography.fontSize.md, fontWeight: typography.fontWeight.semibold }}>
                        Price Per Vote
                      </h4>
                      <p style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>
                        How much each vote costs
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
                    <span style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: '#22c55e' }}>$</span>
                    <input
                      type="number"
                      step="0.25"
                      min="0.25"
                      value={newTemplate.votePrice}
                      onChange={(e) => setNewTemplate({ ...newTemplate, votePrice: parseFloat(e.target.value) || 1 })}
                      style={{
                        width: '120px',
                        padding: spacing.md,
                        background: colors.background.card,
                        border: `1px solid ${colors.border.light}`,
                        borderRadius: borderRadius.md,
                        color: '#fff',
                        fontSize: typography.fontSize.xl,
                        fontWeight: typography.fontWeight.bold,
                        textAlign: 'center',
                      }}
                    />
                    <span style={{ fontSize: typography.fontSize.md, color: colors.text.secondary }}>per vote</span>
                  </div>

                  {/* Quick price options */}
                  <div style={{ display: 'flex', gap: spacing.sm, marginTop: spacing.lg }}>
                    {[0.50, 1.00, 2.00, 5.00].map((price) => (
                      <button
                        key={price}
                        onClick={() => setNewTemplate({ ...newTemplate, votePrice: price })}
                        style={{
                          flex: 1,
                          padding: spacing.sm,
                          background: newTemplate.votePrice === price ? '#22c55e' : colors.background.card,
                          border: `1px solid ${newTemplate.votePrice === price ? '#22c55e' : colors.border.light}`,
                          borderRadius: borderRadius.md,
                          color: newTemplate.votePrice === price ? '#000' : '#fff',
                          fontSize: typography.fontSize.sm,
                          fontWeight: typography.fontWeight.medium,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                      >
                        ${price.toFixed(2)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 7: // Review
        return (
          <div>
            <h3 style={{ fontSize: typography.fontSize.lg, marginBottom: spacing.xl }}>
              Review Competition
            </h3>
            <div style={{
              padding: spacing.xl,
              background: colors.background.secondary,
              borderRadius: borderRadius.xl,
              border: `1px solid ${colors.border.light}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md, marginBottom: spacing.xl }}>
                <div style={{ fontSize: '32px' }}>{newTemplate.organization?.logo}</div>
                <div>
                  <h2 style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold }}>
                    {newTemplate.organization?.name} {newTemplate.city}
                  </h2>
                  <p style={{ color: colors.text.secondary }}>Season {newTemplate.season}</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: spacing.lg }}>
                {[
                  { label: 'Category', value: CATEGORY_TYPES.find(c => c.id === newTemplate.category)?.name },
                  { label: 'Contestant Entry', value: CONTESTANT_TYPES.find(c => c.id === newTemplate.contestantType)?.name },
                  { label: 'Has Host', value: newTemplate.hasHost ? 'Yes' : 'No' },
                  { label: 'Has Events', value: newTemplate.hasEvents ? 'Yes' : 'No' },
                  { label: 'Max Contestants', value: newTemplate.maxContestants },
                  { label: 'Number of Winners', value: newTemplate.numberOfWinners },
                  { label: 'Selection', value: SELECTION_CRITERIA.find(c => c.id === newTemplate.selectionCriteria)?.name },
                  // Only show vote price for votes or hybrid
                  ...(newTemplate.selectionCriteria === 'votes' || newTemplate.selectionCriteria === 'hybrid'
                    ? [{ label: 'Vote Price', value: `$${newTemplate.votePrice.toFixed(2)}` }]
                    : []),
                ].map((item, i) => (
                  <div key={i}>
                    <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, marginBottom: spacing.xs }}>
                      {item.label}
                    </p>
                    <p style={{ fontSize: typography.fontSize.md, fontWeight: typography.fontWeight.medium }}>
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>

              {newTemplate.selectionCriteria === 'hybrid' && (
                <div style={{ marginTop: spacing.lg, paddingTop: spacing.lg, borderTop: `1px solid ${colors.border.light}` }}>
                  <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, marginBottom: spacing.sm }}>
                    Winner Selection Weight
                  </p>
                  <div style={{ display: 'flex', gap: spacing.md }}>
                    <Badge variant="success" size="md">Votes: {newTemplate.voteWeight}%</Badge>
                    <Badge variant="gold" size="md">Judges: {newTemplate.judgeWeight}%</Badge>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.xxxl,
        color: colors.text.secondary
      }}>
        <Loader size={32} style={{ animation: 'spin 1s linear infinite', marginBottom: spacing.md }} />
        <p>Loading competitions...</p>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div style={{
        padding: spacing.xxl,
        background: 'rgba(239,68,68,0.1)',
        border: '1px solid rgba(239,68,68,0.3)',
        borderRadius: borderRadius.xl,
        textAlign: 'center',
        color: '#ef4444'
      }}>
        <p style={{ marginBottom: spacing.md }}>Error loading competitions: {error}</p>
        <Button variant="secondary" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xxl }}>
        <div>
          <h1 style={{ fontSize: typography.fontSize.xxl, fontWeight: typography.fontWeight.bold, marginBottom: spacing.xs }}>
            Competition Templates
          </h1>
          <p style={{ color: colors.text.secondary }}>
            Create and manage competition templates for each city
          </p>
        </div>
        <Button icon={Plus} onClick={() => setShowCreateModal(true)}>
          New Competition
        </Button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: spacing.lg, marginBottom: spacing.xxl }}>
        {[
          { label: 'Total Templates', value: templates.length, icon: Crown },
          { label: 'Active', value: templates.filter(t => t.status === 'active').length, icon: Check },
          { label: 'Awaiting Host', value: templates.filter(t => t.hasHost && !t.assignedHost).length, icon: UserPlus },
          { label: 'Organizations', value: [...new Set(templates.map(t => t.organization?.id))].length, icon: Building2 },
        ].map((stat, i) => (
          <div key={i} style={{
            background: colors.background.card,
            border: `1px solid ${colors.border.light}`,
            borderRadius: borderRadius.xl,
            padding: spacing.xl,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm }}>
              <stat.icon size={20} style={{ color: '#8b5cf6' }} />
              <span style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm }}>{stat.label}</span>
            </div>
            <p style={{ fontSize: typography.fontSize.hero, fontWeight: typography.fontWeight.bold, color: '#fff' }}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Templates Grid */}
      {templates.length === 0 ? (
        <div style={{
          padding: spacing.xxxl,
          background: colors.background.card,
          border: `1px solid ${colors.border.light}`,
          borderRadius: borderRadius.xl,
          textAlign: 'center',
        }}>
          <Crown size={48} style={{ color: colors.text.muted, marginBottom: spacing.md }} />
          <h3 style={{ fontSize: typography.fontSize.lg, marginBottom: spacing.sm }}>No Competitions Yet</h3>
          <p style={{ color: colors.text.secondary, marginBottom: spacing.xl }}>
            Create your first competition to get started.
          </p>
          <Button icon={Plus} onClick={() => setShowCreateModal(true)}>
            Create Competition
          </Button>
        </div>
      ) : (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: spacing.xl }}>
        {templates.map((template) => {
          const status = statusStyles[template.status];
          const CategoryIcon = getCategoryIcon(template.category);
          const categoryColor = getCategoryColor(template.category);

          return (
            <div
              key={template.id}
              style={{
                background: colors.background.card,
                border: `1px solid ${colors.border.light}`,
                borderRadius: borderRadius.xl,
                overflow: 'hidden',
              }}
            >
              {/* Card Header */}
              <div style={{
                padding: spacing.lg,
                background: template.status === 'active'
                  ? 'linear-gradient(135deg, rgba(34,197,94,0.1), transparent)'
                  : `linear-gradient(135deg, ${categoryColor}15, transparent)`,
                borderBottom: `1px solid ${colors.border.light}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs }}>
                      <span style={{ fontSize: '20px' }}>{template.organization?.logo}</span>
                      <span style={{ fontSize: typography.fontSize.xs, color: categoryColor, textTransform: 'uppercase', letterSpacing: '1px' }}>
                        {template.organization?.name}
                      </span>
                    </div>
                    <h3 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold }}>
                      {template.name}
                    </h3>
                  </div>
                  <span style={{
                    padding: `${spacing.xs} ${spacing.sm}`,
                    background: status.bg,
                    color: status.color,
                    borderRadius: borderRadius.md,
                    fontSize: typography.fontSize.xs,
                    fontWeight: typography.fontWeight.medium,
                  }}>
                    {status.label}
                  </span>
                </div>
              </div>

              {/* Card Body */}
              <div style={{ padding: spacing.lg }}>
                {/* Category & Settings */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing.md, marginBottom: spacing.lg }}>
                  <div>
                    <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, marginBottom: spacing.xs }}>Category</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                      <CategoryIcon size={14} style={{ color: categoryColor }} />
                      <span style={{ fontSize: typography.fontSize.sm }}>{CATEGORY_TYPES.find(c => c.id === template.category)?.name}</span>
                    </div>
                  </div>
                  <div>
                    <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, marginBottom: spacing.xs }}>Season</p>
                    <p style={{ fontSize: typography.fontSize.md, fontWeight: typography.fontWeight.medium }}>{template.season}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, marginBottom: spacing.xs }}>Winners</p>
                    <p style={{ fontSize: typography.fontSize.md, fontWeight: typography.fontWeight.medium }}>{template.numberOfWinners}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, marginBottom: spacing.xs }}>Selection</p>
                    <p style={{ fontSize: typography.fontSize.md, fontWeight: typography.fontWeight.medium }}>
                      {SELECTION_CRITERIA.find(c => c.id === template.selectionCriteria)?.name}
                    </p>
                  </div>
                </div>

                {/* Weight Bar for Hybrid */}
                {template.selectionCriteria === 'hybrid' && (
                  <div style={{ marginBottom: spacing.lg }}>
                    <div style={{
                      height: '8px',
                      borderRadius: borderRadius.pill,
                      overflow: 'hidden',
                      display: 'flex',
                    }}>
                      <div style={{ width: `${template.voteWeight}%`, background: '#22c55e' }} />
                      <div style={{ width: `${template.judgeWeight}%`, background: '#d4af37' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: spacing.xs }}>
                      <span style={{ fontSize: typography.fontSize.xs, color: '#22c55e' }}>Votes {template.voteWeight}%</span>
                      <span style={{ fontSize: typography.fontSize.xs, color: '#d4af37' }}>Judges {template.judgeWeight}%</span>
                    </div>
                  </div>
                )}

                {/* Assigned Host */}
                {template.hasHost && (
                  <div style={{
                    padding: spacing.md,
                    background: colors.background.secondary,
                    borderRadius: borderRadius.lg,
                    marginBottom: spacing.lg,
                  }}>
                    <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, marginBottom: spacing.sm }}>Assigned Host</p>
                    {template.assignedHost ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)',
                          borderRadius: borderRadius.full,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: typography.fontSize.sm,
                          fontWeight: typography.fontWeight.bold,
                          color: '#fff',
                        }}>
                          {template.assignedHost.name.charAt(0)}
                        </div>
                        <div>
                          <p style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium }}>{template.assignedHost.name}</p>
                          <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted }}>{template.assignedHost.email}</p>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, color: colors.text.muted }}>
                        <UserPlus size={16} />
                        <span style={{ fontSize: typography.fontSize.sm }}>No host assigned</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', gap: spacing.sm }}>
                  {template.hasHost && !template.assignedHost && (
                    <Button
                      variant="primary"
                      size="sm"
                      icon={UserPlus}
                      onClick={() => {
                        setSelectedTemplate(template);
                        setShowAssignModal(true);
                      }}
                      style={{ flex: 1 }}
                    >
                      Assign Host
                    </Button>
                  )}
                  {(!template.hasHost || template.assignedHost) && template.status !== 'active' && (
                    <Button
                      variant="primary"
                      size="sm"
                      icon={Check}
                      onClick={() => handleActivate(template.id)}
                      style={{ flex: 1 }}
                    >
                      Activate
                    </Button>
                  )}
                  {template.status === 'active' && onViewDashboard && (
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={Eye}
                      onClick={() => onViewDashboard(template)}
                      style={{ flex: 1 }}
                    >
                      View Dashboard
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={Edit2}
                    onClick={() => handleOpenEdit(template)}
                    style={{ width: '40px', padding: spacing.sm }}
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={Trash2}
                    onClick={() => handleDelete(template.id)}
                    style={{ width: '40px', padding: spacing.sm }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* Create Modal - Wizard */}
      {showCreateModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.9)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: spacing.xl,
        }}>
          <div style={{
            background: colors.background.card,
            borderRadius: borderRadius.xxl,
            width: '100%',
            maxWidth: '700px',
            maxHeight: '90vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            border: `1px solid ${colors.border.light}`,
          }}>
            {/* Modal Header */}
            <div style={{
              padding: spacing.xl,
              borderBottom: `1px solid ${colors.border.light}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div>
                <h2 style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold }}>
                  Create New Competition
                </h2>
                <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm }}>
                  Step {currentStep} of {WIZARD_STEPS.length}: {WIZARD_STEPS[currentStep - 1].description}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetWizard();
                }}
                style={{ background: 'none', border: 'none', color: colors.text.secondary, cursor: 'pointer' }}
              >
                <X size={24} />
              </button>
            </div>

            {/* Progress Steps */}
            <div style={{ padding: `${spacing.md} ${spacing.xl}`, borderBottom: `1px solid ${colors.border.light}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                {WIZARD_STEPS.map((step) => (
                  <div
                    key={step.id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      flex: 1,
                    }}
                  >
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: borderRadius.full,
                      background: step.id < currentStep
                        ? '#22c55e'
                        : step.id === currentStep
                          ? '#8b5cf6'
                          : colors.background.secondary,
                      border: step.id <= currentStep ? 'none' : `1px solid ${colors.border.light}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: typography.fontSize.sm,
                      fontWeight: typography.fontWeight.bold,
                      color: step.id <= currentStep ? '#fff' : colors.text.muted,
                      marginBottom: spacing.xs,
                    }}>
                      {step.id < currentStep ? <Check size={16} /> : step.id}
                    </div>
                    <span style={{
                      fontSize: typography.fontSize.xs,
                      color: step.id === currentStep ? '#8b5cf6' : colors.text.muted,
                      textAlign: 'center',
                    }}>
                      {step.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Step Content */}
            <div style={{ flex: 1, overflow: 'auto', padding: spacing.xl }}>
              {renderWizardStep()}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: spacing.xl,
              borderTop: `1px solid ${colors.border.light}`,
              display: 'flex',
              justifyContent: 'space-between',
            }}>
              <Button
                variant="secondary"
                icon={ChevronLeft}
                onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
                disabled={currentStep === 1 || isSubmitting}
              >
                Back
              </Button>

              {currentStep < WIZARD_STEPS.length ? (
                <Button
                  icon={ChevronRight}
                  iconPosition="right"
                  onClick={() => setCurrentStep(currentStep + 1)}
                  disabled={!canProceed()}
                >
                  Continue
                </Button>
              ) : (
                <Button
                  icon={isSubmitting ? Loader : Check}
                  onClick={handleCreateTemplate}
                  disabled={!canProceed() || isSubmitting}
                >
                  {isSubmitting ? 'Creating...' : 'Create Competition'}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Assign Host Modal */}
      {showAssignModal && selectedTemplate && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            background: colors.background.card,
            borderRadius: borderRadius.xxl,
            padding: spacing.xxl,
            width: '100%',
            maxWidth: '500px',
            border: `1px solid ${colors.border.light}`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl }}>
              <div>
                <h2 style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold }}>
                  Assign Host
                </h2>
                <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm }}>
                  {selectedTemplate.name}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedTemplate(null);
                }}
                style={{ background: 'none', border: 'none', color: colors.text.secondary, cursor: 'pointer' }}
              >
                <X size={24} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
              {availableHosts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: spacing.xl, color: colors.text.muted }}>
                  <UserPlus size={32} style={{ marginBottom: spacing.md, opacity: 0.5 }} />
                  <p>No hosts available.</p>
                  <p style={{ fontSize: typography.fontSize.sm }}>Mark users as hosts in the Hosts tab first.</p>
                </div>
              ) : (
                availableHosts.map((host) => (
                  <div
                    key={host.id}
                    onClick={() => !isSubmitting && handleAssignHost(selectedTemplate.id, host)}
                    style={{
                      padding: spacing.lg,
                      background: colors.background.secondary,
                      border: `1px solid ${colors.border.light}`,
                      borderRadius: borderRadius.lg,
                      cursor: isSubmitting ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s',
                      opacity: isSubmitting ? 0.5 : 1,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
                      <div style={{
                        width: '48px',
                        height: '48px',
                        background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)',
                        borderRadius: borderRadius.full,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: typography.fontSize.lg,
                        fontWeight: typography.fontWeight.bold,
                        color: '#fff',
                      }}>
                        {host.name.charAt(0)}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: typography.fontWeight.medium, marginBottom: spacing.xs }}>{host.name}</p>
                        <p style={{ fontSize: typography.fontSize.sm, color: colors.text.muted }}>{host.email}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div style={{ marginTop: spacing.xl }}>
              <Button
                variant="secondary"
                fullWidth
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedTemplate(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Competition Modal */}
      {showEditModal && editingTemplate && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.9)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: spacing.xl,
        }}>
          <div style={{
            background: colors.background.card,
            borderRadius: borderRadius.xxl,
            width: '100%',
            maxWidth: '700px',
            maxHeight: '90vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            border: `1px solid ${colors.border.light}`,
          }}>
            {/* Modal Header */}
            <div style={{
              padding: spacing.xl,
              borderBottom: `1px solid ${colors.border.light}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'linear-gradient(135deg, rgba(139,92,246,0.1), transparent)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  background: 'rgba(139,92,246,0.2)',
                  borderRadius: borderRadius.lg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Edit2 size={20} style={{ color: '#8b5cf6' }} />
                </div>
                <div>
                  <h2 style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold }}>
                    Edit Competition
                  </h2>
                  <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm }}>
                    {editingTemplate.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingTemplate(null);
                }}
                style={{ background: 'none', border: 'none', color: colors.text.secondary, cursor: 'pointer' }}
              >
                <X size={24} />
              </button>
            </div>

            {/* Edit Content */}
            <div style={{ flex: 1, overflow: 'auto', padding: spacing.xl }}>
              {/* Organization */}
              <div style={{ marginBottom: spacing.xl }}>
                <label style={{ display: 'block', fontSize: typography.fontSize.sm, color: colors.text.secondary, marginBottom: spacing.sm }}>
                  Organization
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: spacing.sm }}>
                  {organizations.map((org) => (
                    <div
                      key={org.id}
                      onClick={() => setEditingTemplate({ ...editingTemplate, organization: org })}
                      style={{
                        padding: spacing.md,
                        background: editingTemplate.organization?.id === org.id ? 'rgba(139,92,246,0.2)' : colors.background.secondary,
                        border: `2px solid ${editingTemplate.organization?.id === org.id ? '#8b5cf6' : colors.border.light}`,
                        borderRadius: borderRadius.lg,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: spacing.sm,
                      }}
                    >
                      <span style={{ fontSize: '24px' }}>{org.logo}</span>
                      <span style={{ fontWeight: typography.fontWeight.medium }}>{org.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* City & Season */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing.lg, marginBottom: spacing.xl }}>
                <div>
                  <label style={{ display: 'block', fontSize: typography.fontSize.sm, color: colors.text.secondary, marginBottom: spacing.sm }}>
                    City
                  </label>
                  <select
                    value={editingTemplate.city}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, city: e.target.value })}
                    style={{
                      width: '100%',
                      padding: spacing.md,
                      background: colors.background.secondary,
                      border: `1px solid ${colors.border.light}`,
                      borderRadius: borderRadius.md,
                      color: '#fff',
                    }}
                  >
                    {AVAILABLE_CITIES.map((city) => (
                      <option key={city.name} value={city.name}>{city.name}, {city.state}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: typography.fontSize.sm, color: colors.text.secondary, marginBottom: spacing.sm }}>
                    Season (Year)
                  </label>
                  <input
                    type="number"
                    value={editingTemplate.season}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, season: parseInt(e.target.value) })}
                    style={{
                      width: '100%',
                      padding: spacing.md,
                      background: colors.background.secondary,
                      border: `1px solid ${colors.border.light}`,
                      borderRadius: borderRadius.md,
                      color: '#fff',
                    }}
                  />
                </div>
              </div>

              {/* Category */}
              <div style={{ marginBottom: spacing.xl }}>
                <label style={{ display: 'block', fontSize: typography.fontSize.sm, color: colors.text.secondary, marginBottom: spacing.sm }}>
                  Category
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: spacing.sm }}>
                  {CATEGORY_TYPES.map((cat) => {
                    const IconComponent = cat.icon;
                    return (
                      <div
                        key={cat.id}
                        onClick={() => setEditingTemplate({ ...editingTemplate, category: cat.id })}
                        style={{
                          padding: spacing.md,
                          background: editingTemplate.category === cat.id ? `${cat.color}20` : colors.background.secondary,
                          border: `2px solid ${editingTemplate.category === cat.id ? cat.color : colors.border.light}`,
                          borderRadius: borderRadius.lg,
                          cursor: 'pointer',
                          textAlign: 'center',
                        }}
                      >
                        <IconComponent size={20} style={{ color: cat.color, marginBottom: spacing.xs }} />
                        <p style={{ fontSize: typography.fontSize.sm }}>{cat.name}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Contestant Type */}
              <div style={{ marginBottom: spacing.xl }}>
                <label style={{ display: 'block', fontSize: typography.fontSize.sm, color: colors.text.secondary, marginBottom: spacing.sm }}>
                  Contestant Entry Type
                </label>
                <div style={{ display: 'flex', gap: spacing.sm }}>
                  {CONTESTANT_TYPES.map((type) => (
                    <button
                      key={type.id}
                      onClick={() => setEditingTemplate({ ...editingTemplate, contestantType: type.id })}
                      style={{
                        flex: 1,
                        padding: spacing.md,
                        background: editingTemplate.contestantType === type.id ? 'rgba(139,92,246,0.2)' : colors.background.secondary,
                        border: `2px solid ${editingTemplate.contestantType === type.id ? '#8b5cf6' : colors.border.light}`,
                        borderRadius: borderRadius.md,
                        color: '#fff',
                        cursor: 'pointer',
                      }}
                    >
                      {type.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Settings Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: spacing.lg, marginBottom: spacing.xl }}>
                <div>
                  <label style={{ display: 'block', fontSize: typography.fontSize.sm, color: colors.text.secondary, marginBottom: spacing.sm }}>
                    Has Host
                  </label>
                  <button
                    onClick={() => setEditingTemplate({ ...editingTemplate, hasHost: !editingTemplate.hasHost })}
                    style={{
                      width: '56px',
                      height: '32px',
                      borderRadius: borderRadius.pill,
                      background: editingTemplate.hasHost ? '#8b5cf6' : colors.background.card,
                      border: `1px solid ${editingTemplate.hasHost ? '#8b5cf6' : colors.border.light}`,
                      cursor: 'pointer',
                      position: 'relative',
                    }}
                  >
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: borderRadius.full,
                      background: '#fff',
                      position: 'absolute',
                      top: '3px',
                      left: editingTemplate.hasHost ? '28px' : '3px',
                      transition: 'all 0.2s',
                    }} />
                  </button>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: typography.fontSize.sm, color: colors.text.secondary, marginBottom: spacing.sm }}>
                    Has Events
                  </label>
                  <button
                    onClick={() => setEditingTemplate({ ...editingTemplate, hasEvents: !editingTemplate.hasEvents })}
                    style={{
                      width: '56px',
                      height: '32px',
                      borderRadius: borderRadius.pill,
                      background: editingTemplate.hasEvents ? '#8b5cf6' : colors.background.card,
                      border: `1px solid ${editingTemplate.hasEvents ? '#8b5cf6' : colors.border.light}`,
                      cursor: 'pointer',
                      position: 'relative',
                    }}
                  >
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: borderRadius.full,
                      background: '#fff',
                      position: 'absolute',
                      top: '3px',
                      left: editingTemplate.hasEvents ? '28px' : '3px',
                      transition: 'all 0.2s',
                    }} />
                  </button>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: typography.fontSize.sm, color: colors.text.secondary, marginBottom: spacing.sm }}>
                    Max Contestants
                  </label>
                  <input
                    type="number"
                    value={editingTemplate.maxContestants}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, maxContestants: parseInt(e.target.value) })}
                    style={{
                      width: '100%',
                      padding: spacing.sm,
                      background: colors.background.secondary,
                      border: `1px solid ${colors.border.light}`,
                      borderRadius: borderRadius.md,
                      color: '#fff',
                    }}
                  />
                </div>
              </div>

              {/* Winner Selection */}
              <div style={{ marginBottom: spacing.xl }}>
                <label style={{ display: 'block', fontSize: typography.fontSize.sm, color: colors.text.secondary, marginBottom: spacing.sm }}>
                  Winner Selection Criteria
                </label>
                <div style={{ display: 'flex', gap: spacing.sm, marginBottom: spacing.md }}>
                  {SELECTION_CRITERIA.map((criteria) => (
                    <button
                      key={criteria.id}
                      onClick={() => {
                        const weights = criteria.id === 'votes'
                          ? { voteWeight: 100, judgeWeight: 0 }
                          : criteria.id === 'judges'
                            ? { voteWeight: 0, judgeWeight: 100 }
                            : { voteWeight: 50, judgeWeight: 50 };
                        setEditingTemplate({ ...editingTemplate, selectionCriteria: criteria.id, ...weights });
                      }}
                      style={{
                        flex: 1,
                        padding: spacing.md,
                        background: editingTemplate.selectionCriteria === criteria.id ? 'rgba(139,92,246,0.2)' : colors.background.secondary,
                        border: `2px solid ${editingTemplate.selectionCriteria === criteria.id ? '#8b5cf6' : colors.border.light}`,
                        borderRadius: borderRadius.md,
                        color: '#fff',
                        cursor: 'pointer',
                      }}
                    >
                      {criteria.name}
                    </button>
                  ))}
                </div>

                {/* Hybrid Weight Slider */}
                {editingTemplate.selectionCriteria === 'hybrid' && (
                  <div style={{ padding: spacing.lg, background: colors.background.secondary, borderRadius: borderRadius.lg }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: spacing.sm }}>
                      <span style={{ fontSize: typography.fontSize.sm, color: '#22c55e' }}>Votes: {editingTemplate.voteWeight}%</span>
                      <span style={{ fontSize: typography.fontSize.sm, color: '#d4af37' }}>Judges: {editingTemplate.judgeWeight}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={editingTemplate.voteWeight}
                      onChange={(e) => {
                        const voteWeight = parseInt(e.target.value);
                        setEditingTemplate({ ...editingTemplate, voteWeight, judgeWeight: 100 - voteWeight });
                      }}
                      style={{ width: '100%' }}
                    />
                  </div>
                )}
              </div>

              {/* Vote Price & Winners */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing.lg }}>
                <div>
                  <label style={{ display: 'block', fontSize: typography.fontSize.sm, color: colors.text.secondary, marginBottom: spacing.sm }}>
                    Number of Winners
                  </label>
                  <input
                    type="number"
                    value={editingTemplate.numberOfWinners}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, numberOfWinners: parseInt(e.target.value) })}
                    style={{
                      width: '100%',
                      padding: spacing.md,
                      background: colors.background.secondary,
                      border: `1px solid ${colors.border.light}`,
                      borderRadius: borderRadius.md,
                      color: '#fff',
                    }}
                  />
                </div>
                {(editingTemplate.selectionCriteria === 'votes' || editingTemplate.selectionCriteria === 'hybrid') && (
                  <div>
                    <label style={{ display: 'block', fontSize: typography.fontSize.sm, color: colors.text.secondary, marginBottom: spacing.sm }}>
                      Vote Price ($)
                    </label>
                    <input
                      type="number"
                      step="0.25"
                      value={editingTemplate.votePrice}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, votePrice: parseFloat(e.target.value) })}
                      style={{
                        width: '100%',
                        padding: spacing.md,
                        background: colors.background.secondary,
                        border: `1px solid ${colors.border.light}`,
                        borderRadius: borderRadius.md,
                        color: '#fff',
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: spacing.xl,
              borderTop: `1px solid ${colors.border.light}`,
              display: 'flex',
              gap: spacing.md,
            }}>
              <Button
                variant="secondary"
                onClick={() => {
                  setShowEditModal(false);
                  setEditingTemplate(null);
                }}
                style={{ flex: 1 }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                icon={isSubmitting ? Loader : Save}
                onClick={handleSaveEdit}
                style={{ flex: 1 }}
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
