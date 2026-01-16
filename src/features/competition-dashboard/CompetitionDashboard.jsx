import React, { useState, useEffect } from 'react';
import {
  Crown, ArrowLeft, Star, LogOut, BarChart3, FileText, Settings as SettingsIcon,
  Eye, Loader, AlertCircle, CheckCircle, XCircle, Edit, Check
} from 'lucide-react';
import { Button, Badge, Avatar } from '../../components/ui';
import { HostAssignmentModal, JudgeModal, SponsorModal, EventModal, RuleModal, AddPersonModal } from '../../components/modals';
import { colors, gradients, spacing, borderRadius, typography, transitions } from '../../styles/theme';
import { useResponsive } from '../../hooks/useResponsive';
import { useToast } from '../../contexts/ToastContext';
import { supabase } from '../../lib/supabase';
import { useCompetitionDashboard } from '../super-admin/hooks/useCompetitionDashboard';

// Import tab components
import { OverviewTab, PeopleTab, ContentTab, SetupTab } from './components/tabs';

// Consolidated 4-tab navigation
const TABS = [
  { id: 'dashboard', label: 'Dashboard', shortLabel: 'Home', icon: BarChart3 },
  { id: 'people', label: 'People', shortLabel: 'People', icon: Crown },
  { id: 'content', label: 'Content', shortLabel: 'Content', icon: FileText },
  { id: 'setup', label: 'Setup', shortLabel: 'Setup', icon: SettingsIcon },
];

export default function CompetitionDashboard({
  competitionId,
  role = 'host',
  onBack,
  onLogout,
  onViewPublicSite,
  currentUserId,
}) {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showHostAssignment, setShowHostAssignment] = useState(false);
  const isSuperAdmin = role === 'superadmin';
  const { isMobile } = useResponsive();

  // Fetch all dashboard data
  const dashboard = useCompetitionDashboard(competitionId);
  const {
    data,
    loading,
    error,
    refresh,
    addNominee,
    approveNominee,
    rejectNominee,
    archiveNominee,
    restoreNominee,
    addContestant,
    addJudge,
    updateJudge,
    deleteJudge,
    addSponsor,
    updateSponsor,
    deleteSponsor,
    addEvent,
    updateEvent,
    deleteEvent,
    addAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    toggleAnnouncementPin,
    addRule,
    updateRule,
    deleteRule,
    assignHost,
    removeHost,
  } = dashboard;

  const competition = data.competition;
  const competitionName = competition?.name || 'Competition';

  // Add person modal state
  const [addPersonModal, setAddPersonModal] = useState({ isOpen: false, type: 'nominee' });

  const openAddPersonModal = (type) => {
    setAddPersonModal({ isOpen: true, type });
  };

  const closeAddPersonModal = () => {
    setAddPersonModal({ isOpen: false, type: 'nominee' });
  };

  const handleAddPerson = async (personData) => {
    const { type } = addPersonModal;
    try {
      if (type === 'contestant') {
        const result = await addContestant(personData);
        if (!result.success) {
          toast.error(result.error || 'Failed to add contestant');
          throw new Error(result.error);
        }
        toast.success(`${personData.name} added as contestant`);
      } else {
        const result = await addNominee(personData);
        if (!result.success) {
          toast.error(result.error || 'Failed to add nominee');
          throw new Error(result.error);
        }
        toast.success(`${personData.name} added as nominee`);
      }
    } catch (err) {
      console.error('Error adding person:', err);
      throw err;
    }
  };

  // Entity modals
  const [judgeModal, setJudgeModal] = useState({ isOpen: false, judge: null });
  const [sponsorModal, setSponsorModal] = useState({ isOpen: false, sponsor: null });
  const [eventModal, setEventModal] = useState({ isOpen: false, event: null });
  const [ruleModal, setRuleModal] = useState({ isOpen: false, rule: null });
  const [showNominationFormEditor, setShowNominationFormEditor] = useState(false);

  // Default nomination form fields config
  const DEFAULT_FORM_FIELDS = [
    { key: 'nomineeName', label: "Nominee's Full Name", type: 'text', required: true, enabled: true },
    { key: 'nomineeAge', label: 'Age', type: 'number', required: true, enabled: true, min: 21, max: 45, description: 'Must be between 21-45' },
    { key: 'livesNearCity', label: 'Do they live within 100 miles of the city?', type: 'boolean', required: true, enabled: true },
    { key: 'isSingle', label: 'Are they single (not married or engaged)?', type: 'boolean', required: true, enabled: true },
    { key: 'email', label: 'Email Address', type: 'email', required: true, enabled: true },
    { key: 'phone', label: 'Phone Number', type: 'phone', required: true, enabled: true },
    { key: 'instagram', label: 'Instagram Handle', type: 'text', required: true, enabled: true },
  ];

  // Form fields state
  const [formFields, setFormFields] = useState(DEFAULT_FORM_FIELDS);
  const [editingField, setEditingField] = useState(null);
  const [savingFormFields, setSavingFormFields] = useState(false);

  // Load form fields from competition when data loads
  useEffect(() => {
    if (data.competition?.nominationFormConfig) {
      try {
        const config = typeof data.competition.nominationFormConfig === 'string'
          ? JSON.parse(data.competition.nominationFormConfig)
          : data.competition.nominationFormConfig;
        if (config.fields && Array.isArray(config.fields)) {
          setFormFields(config.fields);
        }
      } catch (e) {
        console.error('Failed to parse nomination form config:', e);
      }
    }
  }, [data.competition?.nominationFormConfig]);

  // Save form fields to database
  const saveFormFields = async () => {
    if (!competitionId) return;

    setSavingFormFields(true);
    try {
      const { error } = await supabase
        .from('competitions')
        .update({
          nomination_form_config: JSON.stringify({ fields: formFields }),
          updated_at: new Date().toISOString(),
        })
        .eq('id', competitionId);

      if (error) throw error;
      toast.success('Form fields saved successfully');
      setShowNominationFormEditor(false);
      refresh();
    } catch (err) {
      toast.error(`Failed to save form fields: ${err.message}`);
    } finally {
      setSavingFormFields(false);
    }
  };

  // Toggle field enabled status
  const toggleFieldEnabled = (key) => {
    setFormFields(prev => prev.map(field =>
      field.key === key ? { ...field, enabled: !field.enabled } : field
    ));
  };

  // Toggle field required status
  const toggleFieldRequired = (key) => {
    setFormFields(prev => prev.map(field =>
      field.key === key ? { ...field, required: !field.required } : field
    ));
  };

  // Update field label
  const updateFieldLabel = (key, label) => {
    setFormFields(prev => prev.map(field =>
      field.key === key ? { ...field, label } : field
    ));
  };

  // ============================================================================
  // HEADER
  // ============================================================================

  const renderHeader = () => (
    <header style={{
      background: 'rgba(20,20,30,0.95)',
      borderBottom: '1px solid rgba(212,175,55,0.15)',
      padding: isMobile ? `${spacing.sm} ${spacing.md}` : `${spacing.md} ${spacing.xxl}`,
      position: 'sticky',
      top: 0,
      zIndex: 40,
      backdropFilter: 'blur(20px)',
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: spacing.sm,
      }}>
        {/* Left side: Back, Logo, Name, Badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: isMobile ? spacing.sm : spacing.md,
          minWidth: 0,
          flex: 1,
        }}>
          {onBack && (
            <button
              onClick={onBack}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: isMobile ? '32px' : '36px',
                height: isMobile ? '32px' : '36px',
                background: 'rgba(212,175,55,0.1)',
                border: '1px solid rgba(212,175,55,0.3)',
                borderRadius: borderRadius.md,
                color: colors.gold.primary,
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              <ArrowLeft size={isMobile ? 16 : 18} />
            </button>
          )}

          <div style={{
            width: isMobile ? '28px' : '40px',
            height: isMobile ? '28px' : '40px',
            background: 'linear-gradient(135deg, #d4af37, #f4d03f)',
            borderRadius: borderRadius.md,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#0a0a0f',
            boxShadow: '0 0 20px rgba(212,175,55,0.3)',
            flexShrink: 0,
          }}>
            <Crown size={isMobile ? 16 : 22} />
          </div>

          {/* Name + Badge stacked on mobile */}
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: isMobile ? 'flex-start' : 'center',
            gap: isMobile ? '1px' : spacing.md,
            minWidth: 0,
          }}>
            <span style={{
              fontSize: isMobile ? typography.fontSize.sm : typography.fontSize.xxl,
              fontWeight: typography.fontWeight.semibold,
              background: 'linear-gradient(135deg, #d4af37, #f4d03f)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: isMobile ? '100px' : 'none',
              lineHeight: 1.2,
            }}>
              {competitionName}
            </span>

            <span style={{
              padding: isMobile ? `1px ${spacing.xs}` : `${spacing.xs} ${spacing.md}`,
              background: 'rgba(212,175,55,0.15)',
              color: colors.gold.primary,
              borderRadius: borderRadius.sm,
              fontSize: isMobile ? '9px' : typography.fontSize.xs,
              fontWeight: typography.fontWeight.semibold,
              display: 'flex',
              alignItems: 'center',
              gap: '2px',
              whiteSpace: 'nowrap',
            }}>
              <Star size={isMobile ? 8 : 12} /> {isSuperAdmin ? 'ADMIN' : 'HOST'}
            </span>
          </div>
        </div>

        {/* Right side: Preview + Logout */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: isMobile ? spacing.xs : spacing.md,
          flexShrink: 0,
        }}>
          {onViewPublicSite && (
            <button
              onClick={onViewPublicSite}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing.xs,
                padding: isMobile ? `${spacing.xs} ${spacing.sm}` : `${spacing.sm} ${spacing.md}`,
                background: 'rgba(212,175,55,0.1)',
                border: `1px solid ${colors.gold.primary}`,
                borderRadius: borderRadius.md,
                color: colors.gold.primary,
                fontSize: isMobile ? '11px' : typography.fontSize.sm,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              <Eye size={isMobile ? 12 : 14} />
              {isMobile ? 'Preview' : 'Preview Competition'}
            </button>
          )}

          {onLogout && (
            <button
              onClick={onLogout}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: isMobile ? spacing.xs : `${spacing.sm} ${spacing.md}`,
                background: 'transparent',
                border: `1px solid ${colors.border.light}`,
                borderRadius: borderRadius.md,
                color: colors.text.secondary,
                fontSize: typography.fontSize.sm,
                cursor: 'pointer',
                minWidth: isMobile ? '32px' : 'auto',
                minHeight: isMobile ? '32px' : 'auto',
              }}
            >
              <LogOut size={16} />
              {!isMobile && <span style={{ marginLeft: spacing.sm }}>Logout</span>}
            </button>
          )}
        </div>
      </div>
    </header>
  );

  // ============================================================================
  // NAVIGATION
  // ============================================================================

  const renderNavigation = () => (
    <nav style={{
      background: 'rgba(20,20,30,0.8)',
      borderBottom: `1px solid ${colors.border.lighter}`,
      padding: `0 ${isMobile ? spacing.md : spacing.xxl}`,
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'flex',
        gap: '0',
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch', // Smooth scroll on iOS
        scrollbarWidth: 'none', // Hide scrollbar on Firefox
        msOverflowStyle: 'none', // Hide scrollbar on IE/Edge
      }}>
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: isMobile ? `${spacing.md} ${spacing.md}` : `${spacing.md} ${spacing.xl}`,
                color: isActive ? colors.gold.primary : colors.text.secondary,
                fontSize: isMobile ? typography.fontSize.sm : typography.fontSize.md,
                fontWeight: typography.fontWeight.medium,
                cursor: 'pointer',
                borderBottom: `2px solid ${isActive ? colors.gold.primary : 'transparent'}`,
                background: 'none',
                border: 'none',
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: isMobile ? '2px' : spacing.sm,
                transition: `all ${transitions.fast}`,
                whiteSpace: 'nowrap',
                minWidth: isMobile ? '60px' : 'auto',
                minHeight: '44px', // Touch-friendly
              }}
            >
              <Icon size={isMobile ? 20 : 18} />
              {isMobile ? (
                <span style={{ fontSize: '10px' }}>{tab.shortLabel || tab.label}</span>
              ) : (
                tab.label
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  const renderContent = () => {
    if (loading) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: spacing.xxxl,
          gap: spacing.lg,
        }}>
          <Loader size={48} style={{ color: colors.gold.primary, animation: 'spin 1s linear infinite' }} />
          <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.lg }}>
            Loading competition data...
          </p>
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
      );
    }

    if (error) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: spacing.xxxl,
          gap: spacing.lg,
        }}>
          <AlertCircle size={48} style={{ color: '#ef4444' }} />
          <p style={{ color: '#ef4444', fontSize: typography.fontSize.lg }}>
            Error loading data: {error}
          </p>
          <Button onClick={refresh} variant="secondary">Try Again</Button>
        </div>
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return (
          <OverviewTab
            competition={competition}
            contestants={data.contestants}
            events={data.events}
            onViewPublicSite={onViewPublicSite}
          />
        );
      case 'people':
        return (
          <PeopleTab
            competition={competition}
            competitionId={competitionId}
            nominees={data.nominees}
            contestants={data.contestants}
            onRefresh={refresh}
            onApproveNominee={approveNominee}
            onRejectNominee={rejectNominee}
            onArchiveNominee={archiveNominee}
            onRestoreNominee={restoreNominee}
            onOpenAddPersonModal={openAddPersonModal}
          />
        );
      case 'content':
        return (
          <ContentTab
            competition={competition}
            announcements={data.announcements}
            host={data.host}
            isSuperAdmin={isSuperAdmin}
            onRefresh={refresh}
            onAddAnnouncement={addAnnouncement}
            onUpdateAnnouncement={updateAnnouncement}
            onDeleteAnnouncement={deleteAnnouncement}
            onTogglePin={toggleAnnouncementPin}
            onViewPublicSite={onViewPublicSite}
          />
        );
      case 'setup':
        return (
          <SetupTab
            competition={competition}
            judges={data.judges}
            sponsors={data.sponsors}
            events={data.events}
            rules={data.rules}
            formFields={formFields}
            host={data.host}
            isSuperAdmin={isSuperAdmin}
            onRefresh={refresh}
            onDeleteJudge={deleteJudge}
            onDeleteSponsor={deleteSponsor}
            onDeleteEvent={deleteEvent}
            onDeleteRule={deleteRule}
            onOpenJudgeModal={(judge) => setJudgeModal({ isOpen: true, judge })}
            onOpenSponsorModal={(sponsor) => setSponsorModal({ isOpen: true, sponsor })}
            onOpenEventModal={(event) => setEventModal({ isOpen: true, event })}
            onOpenRuleModal={(rule) => setRuleModal({ isOpen: true, rule })}
            onShowNominationFormEditor={() => setShowNominationFormEditor(true)}
            onShowHostAssignment={() => setShowHostAssignment(true)}
            onRemoveHost={removeHost}
          />
        );
      default:
        return null;
    }
  };

  return (
    <>
      <div style={{ minHeight: '100vh', background: gradients.background }}>
        {renderHeader()}
        {renderNavigation()}
        <main style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: isMobile ? `${spacing.lg} ${spacing.md}` : `${spacing.xxxl} ${spacing.xxl}`,
        }}>
          {renderContent()}
        </main>
      </div>
      <HostAssignmentModal
        isOpen={showHostAssignment}
        onClose={() => setShowHostAssignment(false)}
        onAssign={async (userId) => {
          await assignHost(userId);
          setShowHostAssignment(false);
        }}
        currentHostId={data.host?.id}
      />
      <JudgeModal
        isOpen={judgeModal.isOpen}
        onClose={() => setJudgeModal({ isOpen: false, judge: null })}
        judge={judgeModal.judge}
        onSave={async (judgeData) => {
          if (judgeModal.judge) {
            await updateJudge(judgeModal.judge.id, judgeData);
          } else {
            await addJudge(judgeData);
          }
          setJudgeModal({ isOpen: false, judge: null });
        }}
      />
      <SponsorModal
        isOpen={sponsorModal.isOpen}
        onClose={() => setSponsorModal({ isOpen: false, sponsor: null })}
        sponsor={sponsorModal.sponsor}
        onSave={async (sponsorData) => {
          if (sponsorModal.sponsor) {
            await updateSponsor(sponsorModal.sponsor.id, sponsorData);
          } else {
            await addSponsor(sponsorData);
          }
          setSponsorModal({ isOpen: false, sponsor: null });
        }}
      />
      <EventModal
        isOpen={eventModal.isOpen}
        onClose={() => setEventModal({ isOpen: false, event: null })}
        event={eventModal.event}
        onSave={async (eventData) => {
          if (eventModal.event) {
            await updateEvent(eventModal.event.id, eventData);
          } else {
            await addEvent(eventData);
          }
          setEventModal({ isOpen: false, event: null });
        }}
      />
      <RuleModal
        isOpen={ruleModal.isOpen}
        onClose={() => setRuleModal({ isOpen: false, rule: null })}
        rule={ruleModal.rule}
        onSave={async (ruleData) => {
          if (ruleModal.rule) {
            await updateRule(ruleModal.rule.id, ruleData);
          } else {
            await addRule(ruleData);
          }
          setRuleModal({ isOpen: false, rule: null });
        }}
      />
      <AddPersonModal
        isOpen={addPersonModal.isOpen}
        onClose={closeAddPersonModal}
        onAdd={handleAddPerson}
        type={addPersonModal.type}
      />

      {/* Nomination Form Fields Editor Modal */}
      {showNominationFormEditor && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: spacing.xl,
          }}
          onClick={() => setShowNominationFormEditor(false)}
        >
          <div
            style={{
              background: colors.background.card,
              borderRadius: borderRadius.xxl,
              width: '100%',
              maxWidth: '600px',
              maxHeight: '90vh',
              overflow: 'auto',
              border: `1px solid ${colors.border.light}`,
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{
              padding: spacing.xl,
              borderBottom: `1px solid ${colors.border.light}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <h3 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold }}>
                Edit Nomination Form Fields
              </h3>
              <button
                onClick={() => setShowNominationFormEditor(false)}
                style={{ background: 'none', border: 'none', color: colors.text.secondary, cursor: 'pointer' }}
              >
                <XCircle size={20} />
              </button>
            </div>

            <div style={{ padding: spacing.xl }}>
              <p style={{ color: colors.text.secondary, marginBottom: spacing.lg, fontSize: typography.fontSize.sm }}>
                Toggle fields on/off, mark them as required, or edit their labels.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
                {formFields.map((field) => (
                  <div
                    key={field.key}
                    style={{
                      padding: spacing.lg,
                      background: colors.background.secondary,
                      borderRadius: borderRadius.lg,
                      border: `1px solid ${field.enabled ? colors.border.light : 'rgba(100,100,100,0.2)'}`,
                      opacity: field.enabled ? 1 : 0.7,
                    }}
                  >
                    {editingField === field.key ? (
                      <div style={{ display: 'flex', gap: spacing.sm, alignItems: 'center' }}>
                        <input
                          type="text"
                          value={field.label}
                          onChange={(e) => updateFieldLabel(field.key, e.target.value)}
                          style={{
                            flex: 1,
                            padding: spacing.sm,
                            background: colors.background.card,
                            border: `1px solid ${colors.border.light}`,
                            borderRadius: borderRadius.md,
                            color: '#fff',
                            fontSize: typography.fontSize.sm,
                          }}
                          autoFocus
                        />
                        <button
                          onClick={() => setEditingField(null)}
                          style={{
                            padding: spacing.sm,
                            background: colors.gold.primary,
                            border: 'none',
                            borderRadius: borderRadius.md,
                            color: '#000',
                            cursor: 'pointer',
                          }}
                        >
                          <Check size={14} />
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontWeight: typography.fontWeight.medium, marginBottom: spacing.xs }}>
                            {field.label}
                          </p>
                          <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted }}>
                            Type: {field.type} {field.description && `• ${field.description}`}
                          </p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                          <button
                            onClick={() => setEditingField(field.key)}
                            style={{
                              padding: spacing.sm,
                              background: 'transparent',
                              border: `1px solid ${colors.border.light}`,
                              borderRadius: borderRadius.md,
                              color: colors.text.secondary,
                              cursor: 'pointer',
                            }}
                            title="Edit label"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={() => toggleFieldRequired(field.key)}
                            style={{
                              padding: `${spacing.xs} ${spacing.sm}`,
                              background: field.required ? 'rgba(212,175,55,0.2)' : 'transparent',
                              border: `1px solid ${field.required ? colors.gold.primary : colors.border.light}`,
                              borderRadius: borderRadius.md,
                              color: field.required ? colors.gold.primary : colors.text.muted,
                              cursor: 'pointer',
                              fontSize: typography.fontSize.xs,
                            }}
                            title="Toggle required"
                          >
                            Required
                          </button>
                          <button
                            onClick={() => toggleFieldEnabled(field.key)}
                            style={{
                              padding: spacing.sm,
                              background: field.enabled ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)',
                              border: `1px solid ${field.enabled ? 'rgba(34,197,94,0.5)' : 'rgba(239,68,68,0.5)'}`,
                              borderRadius: borderRadius.md,
                              color: field.enabled ? '#22c55e' : '#ef4444',
                              cursor: 'pointer',
                            }}
                            title={field.enabled ? 'Disable field' : 'Enable field'}
                          >
                            {field.enabled ? <CheckCircle size={14} /> : <XCircle size={14} />}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
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
                onClick={() => {
                  setFormFields(DEFAULT_FORM_FIELDS);
                  setShowNominationFormEditor(false);
                }}
              >
                Reset to Defaults
              </Button>
              <Button
                onClick={saveFormFields}
                disabled={savingFormFields}
              >
                {savingFormFields ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
