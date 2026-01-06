import React, { useState, useMemo, useEffect } from 'react';
import {
  Crown, ArrowLeft, Star, LogOut, BarChart3, UserPlus, FileText, Settings as SettingsIcon,
  User, Calendar, Eye, Loader, AlertCircle, Archive, RotateCcw, ExternalLink,
  UserCheck, Users, CheckCircle, XCircle, ChevronDown, ChevronUp, Plus, Edit, Trash2,
  Pin, MapPin, Clock, Sparkles, TrendingUp, Hash, Award, Scale, Check, Wand2
} from 'lucide-react';
import { Button, Badge, Avatar, Panel } from '../../components/ui';
import { HostAssignmentModal, JudgeModal, SponsorModal, EventModal, RuleModal, AddPersonModal } from '../../components/modals';
import { colors, gradients, spacing, borderRadius, typography, transitions } from '../../styles/theme';
import { useToast } from '../../contexts/ToastContext';
import { supabase } from '../../lib/supabase';
import { useCompetitionDashboard } from '../super-admin/hooks/useCompetitionDashboard';
import { formatRelativeTime, formatEventDateRange } from '../../utils/formatters';
import WinnersManager from '../super-admin/components/WinnersManager';
import TimelineSettings from './components/TimelineSettings';

// Reusable components from overview
import CurrentPhaseCard from '../overview/components/CurrentPhaseCard';
import UpcomingCard from '../overview/components/UpcomingCard';
import Leaderboard from '../overview/components/Leaderboard';

const TABS = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'contestants', label: 'Contestants', icon: Users },
  { id: 'advancement', label: 'Advancement', icon: TrendingUp },
  { id: 'community', label: 'Community', icon: FileText },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
  { id: 'profile', label: 'Host Profile', icon: User },
];

// Helper to determine event status
const getEventStatus = (event) => {
  if (event.status === 'completed') return 'completed';
  if (!event.date && !event.startDate) return 'upcoming';
  const eventDate = new Date(event.date || event.startDate);
  const now = new Date();
  if (eventDate < now) return 'completed';
  // Check if event is currently active (started but not ended)
  if (event.endDate) {
    const endDate = new Date(event.endDate);
    if (eventDate <= now && now <= endDate) return 'active';
  }
  return 'upcoming';
};

export default function CompetitionDashboard({
  competitionId,
  role = 'host', // 'host' or 'superadmin'
  onBack,
  onLogout,
  onViewPublicSite,
  currentUserId,
}) {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [showHostAssignment, setShowHostAssignment] = useState(false);
  const isSuperAdmin = role === 'superadmin';

  // Fetch all dashboard data
  const dashboard = useCompetitionDashboard(competitionId);
  const {
    data,
    loading,
    error,
    refresh,
    // Nominee operations
    addNominee,
    approveNominee,
    rejectNominee,
    archiveNominee,
    restoreNominee,
    // Contestant operations
    addContestant,
    // Judge operations
    addJudge,
    updateJudge,
    deleteJudge,
    // Sponsor operations
    addSponsor,
    updateSponsor,
    deleteSponsor,
    // Event operations
    addEvent,
    updateEvent,
    deleteEvent,
    // Announcement operations
    addAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    toggleAnnouncementPin,
    // Rule operations
    addRule,
    updateRule,
    deleteRule,
    // Competition operations
    updateTimeline,
    updateWinners,
    assignHost,
    removeHost,
  } = dashboard;

  const competition = data.competition;
  const competitionName = competition?.name || 'Competition';

  // Collapsible sections state for nominations
  const [expandedSections, setExpandedSections] = useState({
    contestants: true,
    withProfile: true,
    external: true,
    archived: false,
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Modal states
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);
  const [announcementForm, setAnnouncementForm] = useState({ title: '', content: '' });

  // AI Draft state (super admin only)
  const [isAiMode, setIsAiMode] = useState(false);
  const [aiTopicType, setAiTopicType] = useState('company_update');
  const [aiBulletPoints, setAiBulletPoints] = useState(['', '', '']);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiError, setAiError] = useState(null);

  // Add person modal state (for manual nominee/contestant entry)
  const [addPersonModal, setAddPersonModal] = useState({ isOpen: false, type: 'nominee' });

  // Advancement tab state
  const [voteInputs, setVoteInputs] = useState({});
  const [savingVotes, setSavingVotes] = useState({});
  const [activeRound, setActiveRound] = useState(null);
  const [votingRounds, setVotingRounds] = useState([]);
  const [showTieResolver, setShowTieResolver] = useState(false);
  const [tiedContestants, setTiedContestants] = useState([]);
  const [advanceCount, setAdvanceCount] = useState(10);

  // Fetch voting rounds for advancement tab
  useEffect(() => {
    const fetchRounds = async () => {
      if (!supabase || !competitionId) return;
      const { data: rounds } = await supabase
        .from('voting_rounds')
        .select('*')
        .eq('competition_id', competitionId)
        .order('round_order');
      if (rounds && rounds.length > 0) {
        setVotingRounds(rounds);
        // Set active round to current/latest
        const now = new Date();
        const active = rounds.find(r => {
          const start = r.start_date ? new Date(r.start_date) : null;
          const end = r.end_date ? new Date(r.end_date) : null;
          return start && end && start <= now && now <= end;
        }) || rounds[rounds.length - 1];
        setActiveRound(active);
        setAdvanceCount(active?.contestants_advance || 10);
      }
    };
    fetchRounds();
  }, [competitionId]);

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

  // Form fields state (loaded from competition or use defaults)
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

  // Processing states
  const [processingId, setProcessingId] = useState(null);

  // ============================================================================
  // HEADER
  // ============================================================================

  const renderHeader = () => (
    <header style={{
      background: 'rgba(20,20,30,0.95)',
      borderBottom: '1px solid rgba(212,175,55,0.15)',
      padding: `${spacing.md} ${spacing.xxl}`,
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
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
          {onBack && (
            <button
              onClick={onBack}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '36px',
                height: '36px',
                background: 'rgba(212,175,55,0.1)',
                border: '1px solid rgba(212,175,55,0.3)',
                borderRadius: borderRadius.md,
                color: colors.gold.primary,
                cursor: 'pointer',
              }}
            >
              <ArrowLeft size={18} />
            </button>
          )}

          <div style={{
            width: '40px',
            height: '40px',
            background: 'linear-gradient(135deg, #d4af37, #f4d03f)',
            borderRadius: borderRadius.lg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#0a0a0f',
            boxShadow: '0 0 20px rgba(212,175,55,0.3)',
          }}>
            <Crown size={22} />
          </div>

          <span style={{
            fontSize: typography.fontSize.xxl,
            fontWeight: typography.fontWeight.semibold,
            background: 'linear-gradient(135deg, #d4af37, #f4d03f)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            {competitionName}
          </span>

          <span style={{
            padding: `${spacing.xs} ${spacing.md}`,
            background: 'rgba(212,175,55,0.15)',
            color: colors.gold.primary,
            borderRadius: borderRadius.sm,
            fontSize: typography.fontSize.xs,
            fontWeight: typography.fontWeight.semibold,
            display: 'flex',
            alignItems: 'center',
            gap: spacing.xs,
          }}>
            <Star size={12} /> {isSuperAdmin ? 'SUPER ADMIN' : 'VERIFIED HOST'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
          {onViewPublicSite && (
            <button
              onClick={onViewPublicSite}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing.sm,
                padding: `${spacing.sm} ${spacing.md}`,
                background: 'rgba(212,175,55,0.1)',
                border: `1px solid ${colors.gold.primary}`,
                borderRadius: borderRadius.md,
                color: colors.gold.primary,
                fontSize: typography.fontSize.sm,
                cursor: 'pointer',
              }}
            >
              <Eye size={14} />
              Preview Competition
            </button>
          )}

          {onLogout && (
            <button
              onClick={onLogout}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing.sm,
                padding: `${spacing.sm} ${spacing.md}`,
                background: 'transparent',
                border: `1px solid ${colors.border.light}`,
                borderRadius: borderRadius.md,
                color: colors.text.secondary,
                fontSize: typography.fontSize.sm,
                cursor: 'pointer',
              }}
            >
              <LogOut size={16} />
              Logout
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
      padding: `0 ${spacing.xxl}`,
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'flex',
        gap: '0',
        overflowX: 'auto',
      }}>
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: `${spacing.md} ${spacing.xl}`,
                color: isActive ? colors.gold.primary : colors.text.secondary,
                fontSize: typography.fontSize.md,
                fontWeight: typography.fontWeight.medium,
                cursor: 'pointer',
                borderBottom: `2px solid ${isActive ? colors.gold.primary : 'transparent'}`,
                background: 'none',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: spacing.sm,
                transition: `all ${transitions.fast}`,
                whiteSpace: 'nowrap',
              }}
            >
              <Icon size={18} />
              {tab.label}
            </button>
          );
        })}
      </div>
    </nav>
  );

  // ============================================================================
  // OVERVIEW TAB
  // ============================================================================

  const renderOverview = () => {
    const cityName = competition?.city?.name || competition?.name?.split(' ')?.[0] || 'Competition';

    return (
      <div>
        {/* Two Cards Row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: spacing.xl,
          marginBottom: spacing.xxxl,
        }}>
          <CurrentPhaseCard competition={competition} />
          <UpcomingCard events={data.events} />
        </div>

        {/* Leaderboard */}
        <Leaderboard contestants={data.contestants} title={`${competitionName} Top Contestants`} />

        {/* Footer Actions */}
        {onViewPublicSite && (
          <div style={{
            marginTop: spacing.xxxl,
            paddingTop: spacing.xl,
            borderTop: `1px solid ${colors.border.light}`,
            display: 'flex',
            justifyContent: 'center',
          }}>
            <button
              onClick={onViewPublicSite}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing.sm,
                background: 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.1))',
                border: `1px solid ${colors.gold.primary}`,
                borderRadius: borderRadius.pill,
                padding: `${spacing.lg} ${spacing.xxl}`,
                color: colors.gold.primary,
                fontSize: typography.fontSize.md,
                fontWeight: typography.fontWeight.semibold,
                cursor: 'pointer',
              }}
            >
              <Eye size={18} />
              Preview Competition as Public
            </button>
          </div>
        )}
      </div>
    );
  };

  // ============================================================================
  // CONTESTANTS TAB
  // ============================================================================

  const renderContestants = () => {
    // Categorize nominees
    const activeNominees = data.nominees.filter(n =>
      n.status === 'pending' || n.status === 'profile_complete' || n.status === 'awaiting_profile'
    );
    const nomineesWithProfile = activeNominees.filter(n => n.hasProfile);
    const externalNominees = activeNominees.filter(n => !n.hasProfile);
    const archivedNominees = data.nominees.filter(n => n.status === 'archived');
    const approvedContestants = data.contestants;

    // Stats
    const stats = [
      { label: 'Total Nominees', value: data.nominees.length, color: colors.gold.primary },
      { label: 'With Profile', value: nomineesWithProfile.length, color: '#3b82f6' },
      { label: 'External', value: externalNominees.length, color: '#f59e0b' },
      { label: 'Approved', value: approvedContestants.length, color: '#22c55e' },
      { label: 'Archived', value: archivedNominees.length, color: '#6b7280' },
    ];

    const SectionHeader = ({ title, count, icon: Icon, iconColor, sectionKey, badge }) => (
      <button
        onClick={() => toggleSection(sectionKey)}
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: spacing.lg,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: '#fff',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
          <Icon size={20} style={{ color: iconColor }} />
          <h3 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold }}>
            {title}
          </h3>
          <Badge variant={badge || 'secondary'} size="sm">{count}</Badge>
        </div>
        {expandedSections[sectionKey] ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </button>
    );

    const NomineeRow = ({ nominee, showActions = true, isArchived = false }) => (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: spacing.lg,
        padding: spacing.lg,
        background: colors.background.secondary,
        borderRadius: borderRadius.lg,
        marginBottom: spacing.sm,
        opacity: isArchived ? 0.7 : 1,
      }}>
        <Avatar name={nominee.name} size={48} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' }}>
            <p style={{ fontWeight: typography.fontWeight.medium }}>{nominee.name}</p>
            {nominee.age && (
              <span style={{ color: colors.text.muted, fontSize: typography.fontSize.sm }}>
                ({nominee.age})
              </span>
            )}
            {nominee.hasProfile && (
              <Badge variant="info" size="sm" style={{ cursor: 'pointer' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <ExternalLink size={10} /> View Profile
                </span>
              </Badge>
            )}
          </div>
          <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm }}>
            {nominee.nominatedBy === 'self' ? 'Self-nominated' :
              nominee.nominatorName ? `Nominated by ${nominee.nominatorName}` : 'Third-party nomination'}
            {nominee.email && ` • ${nominee.email}`}
          </p>
        </div>
        <Badge variant={nominee.nominatedBy === 'self' ? 'gold' : 'secondary'} size="sm">
          {nominee.nominatedBy === 'self' ? 'Self' : 'Third Party'}
        </Badge>
        {showActions && !isArchived && (
          <div style={{ display: 'flex', gap: spacing.sm }}>
            <Button
              variant="approve"
              size="sm"
              onClick={() => { setProcessingId(nominee.id); approveNominee(nominee).then(() => setProcessingId(null)); }}
              disabled={processingId === nominee.id}
            >
              <CheckCircle size={14} />
            </Button>
            <Button
              variant="reject"
              size="sm"
              onClick={() => { setProcessingId(nominee.id); rejectNominee(nominee.id).then(() => setProcessingId(null)); }}
              disabled={processingId === nominee.id}
            >
              <XCircle size={14} />
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => { setProcessingId(nominee.id); archiveNominee(nominee.id).then(() => setProcessingId(null)); }}
              disabled={processingId === nominee.id}
            >
              <Archive size={14} />
            </Button>
          </div>
        )}
        {isArchived && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => { setProcessingId(nominee.id); restoreNominee(nominee.id).then(() => setProcessingId(null)); }}
            disabled={processingId === nominee.id}
          >
            <RotateCcw size={14} style={{ marginRight: spacing.xs }} /> Restore
          </Button>
        )}
      </div>
    );

    const ContestantRow = ({ contestant }) => (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: spacing.lg,
        padding: spacing.lg,
        background: 'rgba(34,197,94,0.1)',
        border: '1px solid rgba(34,197,94,0.2)',
        borderRadius: borderRadius.lg,
        marginBottom: spacing.sm,
      }}>
        <Avatar name={contestant.name} size={48} avatarUrl={contestant.avatarUrl} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
            <p style={{ fontWeight: typography.fontWeight.medium }}>{contestant.name}</p>
            {contestant.age && (
              <span style={{ color: colors.text.muted, fontSize: typography.fontSize.sm }}>
                ({contestant.age})
              </span>
            )}
            <Badge variant="success" size="sm">Competing</Badge>
          </div>
          <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm }}>
            {contestant.instagram && `@${contestant.instagram.replace('@', '')}`}
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ color: colors.gold.primary, fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold }}>
            {contestant.votes || 0}
          </p>
          <p style={{ color: colors.text.muted, fontSize: typography.fontSize.xs }}>votes</p>
        </div>
        <Badge variant="gold" size="sm">#{contestant.rank}</Badge>
      </div>
    );

    return (
      <div>
        {/* Winners Manager - always accessible for host/superadmin */}
        <WinnersManager competition={competition} onUpdate={refresh} allowEdit={true} />

        {/* Stats Row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: spacing.lg,
          marginBottom: spacing.xxl,
        }}>
          {stats.map((stat, i) => (
            <div key={i} style={{
              background: colors.background.card,
              border: `1px solid ${colors.border.light}`,
              borderRadius: borderRadius.xl,
              padding: spacing.lg,
            }}>
              <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.xs, marginBottom: spacing.xs }}>{stat.label}</p>
              <p style={{ fontSize: typography.fontSize.xxl, fontWeight: typography.fontWeight.bold, color: stat.color }}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Contestants Section */}
        <div style={{
          background: colors.background.card,
          border: `1px solid rgba(34,197,94,0.3)`,
          borderRadius: borderRadius.xl,
          marginBottom: spacing.lg,
          overflow: 'hidden',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: spacing.lg }}>
            <SectionHeader title="Contestants" count={approvedContestants.length} icon={Crown} iconColor="#22c55e" sectionKey="contestants" badge="success" />
            <Button size="sm" icon={Plus} onClick={() => openAddPersonModal('contestant')}>
              Add Contestant
            </Button>
          </div>
          {expandedSections.contestants && (
            <div style={{ padding: `0 ${spacing.lg} ${spacing.lg}` }}>
              {approvedContestants.length === 0 ? (
                <div style={{ textAlign: 'center', padding: spacing.xl, color: colors.text.secondary }}>
                  <Crown size={32} style={{ marginBottom: spacing.sm, opacity: 0.5 }} />
                  <p>No contestants yet. Approve nominees or add manually.</p>
                </div>
              ) : approvedContestants.map(c => <ContestantRow key={c.id} contestant={c} />)}
            </div>
          )}
        </div>

        {/* Nominees with Profile */}
        <div style={{
          background: colors.background.card,
          border: `1px solid ${colors.border.light}`,
          borderRadius: borderRadius.xl,
          marginBottom: spacing.lg,
          overflow: 'hidden',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: spacing.lg }}>
            <SectionHeader title="Nominees with Profile" count={nomineesWithProfile.length} icon={UserCheck} iconColor="#3b82f6" sectionKey="withProfile" badge="info" />
            <Button size="sm" variant="secondary" icon={Plus} onClick={() => openAddPersonModal('nominee')}>
              Add Nominee
            </Button>
          </div>
          {expandedSections.withProfile && (
            <div style={{ padding: `0 ${spacing.lg} ${spacing.lg}` }}>
              {nomineesWithProfile.length === 0 ? (
                <div style={{ textAlign: 'center', padding: spacing.xl, color: colors.text.secondary }}>
                  <UserCheck size={32} style={{ marginBottom: spacing.sm, opacity: 0.5 }} />
                  <p>No nominees with linked profiles</p>
                </div>
              ) : nomineesWithProfile.map(n => <NomineeRow key={n.id} nominee={n} />)}
            </div>
          )}
        </div>

        {/* External Nominees */}
        <div style={{
          background: colors.background.card,
          border: `1px solid ${colors.border.light}`,
          borderRadius: borderRadius.xl,
          marginBottom: spacing.lg,
          overflow: 'hidden',
        }}>
          <SectionHeader title="External Nominees" count={externalNominees.length} icon={Users} iconColor="#f59e0b" sectionKey="external" badge="warning" />
          {expandedSections.external && (
            <div style={{ padding: `0 ${spacing.lg} ${spacing.lg}` }}>
              {externalNominees.length === 0 ? (
                <div style={{ textAlign: 'center', padding: spacing.xl, color: colors.text.secondary }}>
                  <Users size={32} style={{ marginBottom: spacing.sm, opacity: 0.5 }} />
                  <p>No external nominees</p>
                </div>
              ) : externalNominees.map(n => <NomineeRow key={n.id} nominee={n} />)}
            </div>
          )}
        </div>

        {/* Archived */}
        <div style={{
          background: colors.background.card,
          border: `1px solid ${colors.border.light}`,
          borderRadius: borderRadius.xl,
          overflow: 'hidden',
        }}>
          <SectionHeader title="Archived" count={archivedNominees.length} icon={Archive} iconColor="#6b7280" sectionKey="archived" />
          {expandedSections.archived && (
            <div style={{ padding: `0 ${spacing.lg} ${spacing.lg}` }}>
              {archivedNominees.length === 0 ? (
                <div style={{ textAlign: 'center', padding: spacing.xl, color: colors.text.secondary }}>
                  <Archive size={32} style={{ marginBottom: spacing.sm, opacity: 0.5 }} />
                  <p>No archived nominees</p>
                </div>
              ) : archivedNominees.map(n => <NomineeRow key={n.id} nominee={n} showActions={false} isArchived />)}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ============================================================================
  // ADVANCEMENT TAB
  // ============================================================================

  const renderAdvancement = () => {
    // Sort contestants by votes
    const sortedContestants = [...data.contestants].sort((a, b) => (b.votes || 0) - (a.votes || 0));

    // Detect ties at the advancement cutoff
    const detectTies = () => {
      if (sortedContestants.length <= advanceCount) return [];

      const cutoffVotes = sortedContestants[advanceCount - 1]?.votes || 0;
      const tied = sortedContestants.filter((c, idx) => {
        // Include contestants at the cutoff position who share the same vote count
        return c.votes === cutoffVotes && (idx >= advanceCount - 1);
      });

      // Only return if there's an actual tie (more than one at the cutoff)
      return tied.length > 1 ? tied : [];
    };

    const ties = detectTies();

    // Handle adding votes to a contestant
    const handleAddVotes = async (contestantId) => {
      const votesToAdd = parseInt(voteInputs[contestantId]) || 0;
      if (votesToAdd === 0) return;

      setSavingVotes(prev => ({ ...prev, [contestantId]: true }));

      try {
        const contestant = data.contestants.find(c => c.id === contestantId);
        const newVotes = (contestant?.votes || 0) + votesToAdd;

        const { error } = await supabase
          .from('contestants')
          .update({ votes: newVotes })
          .eq('id', contestantId);

        if (error) throw error;

        toast.success(`Added ${votesToAdd} votes to ${contestant?.name}`);
        setVoteInputs(prev => ({ ...prev, [contestantId]: '' }));
        refresh();
      } catch (err) {
        console.error('Error adding votes:', err);
        toast.error('Failed to add votes');
      } finally {
        setSavingVotes(prev => ({ ...prev, [contestantId]: false }));
      }
    };

    // Handle tie resolution - advance selected contestant
    const handleResolveTie = async (selectedContestantId) => {
      // Add 1 vote to break the tie
      try {
        const contestant = data.contestants.find(c => c.id === selectedContestantId);
        const { error } = await supabase
          .from('contestants')
          .update({ votes: (contestant?.votes || 0) + 1 })
          .eq('id', selectedContestantId);

        if (error) throw error;

        toast.success(`${contestant?.name} will advance`);
        setShowTieResolver(false);
        refresh();
      } catch (err) {
        console.error('Error resolving tie:', err);
        toast.error('Failed to resolve tie');
      }
    };

    return (
      <div>
        {/* Tie Alert */}
        {ties.length > 0 && (
          <div style={{
            background: 'rgba(245,158,11,0.1)',
            border: '1px solid rgba(245,158,11,0.3)',
            borderRadius: borderRadius.xl,
            padding: spacing.lg,
            marginBottom: spacing.xl,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
              <Scale size={24} style={{ color: '#f59e0b' }} />
              <div>
                <p style={{ fontWeight: typography.fontWeight.semibold, color: '#f59e0b' }}>
                  Tie Detected at Position {advanceCount}
                </p>
                <p style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>
                  {ties.length} contestants are tied with {ties[0]?.votes} votes. Select who advances.
                </p>
              </div>
            </div>
            <Button
              variant="warning"
              onClick={() => {
                setTiedContestants(ties);
                setShowTieResolver(true);
              }}
            >
              Resolve Tie
            </Button>
          </div>
        )}

        {/* Voting Round Selector */}
        {votingRounds.length > 0 && (
          <div style={{
            background: colors.background.card,
            border: `1px solid ${colors.border.light}`,
            borderRadius: borderRadius.xl,
            padding: spacing.lg,
            marginBottom: spacing.xl,
          }}>
            <h4 style={{ fontSize: typography.fontSize.md, marginBottom: spacing.md, display: 'flex', alignItems: 'center', gap: spacing.sm }}>
              <Hash size={18} />
              Voting Round
            </h4>
            <div style={{ display: 'flex', gap: spacing.sm, flexWrap: 'wrap' }}>
              {votingRounds.map((round) => (
                <button
                  key={round.id}
                  onClick={() => {
                    setActiveRound(round);
                    setAdvanceCount(round.contestants_advance || 10);
                  }}
                  style={{
                    padding: `${spacing.sm} ${spacing.md}`,
                    background: activeRound?.id === round.id ? 'rgba(212,175,55,0.2)' : 'transparent',
                    border: `1px solid ${activeRound?.id === round.id ? colors.gold.primary : colors.border.light}`,
                    borderRadius: borderRadius.md,
                    color: activeRound?.id === round.id ? colors.gold.primary : colors.text.secondary,
                    cursor: 'pointer',
                    fontSize: typography.fontSize.sm,
                  }}
                >
                  {round.title}
                  <span style={{ marginLeft: spacing.sm, opacity: 0.7 }}>
                    (Top {round.contestants_advance} advance)
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Contestants Leaderboard with Vote Management */}
        <Panel title="Contestant Performance & Vote Management" icon={TrendingUp}>
          <div style={{ padding: spacing.lg }}>
            {sortedContestants.length === 0 ? (
              <div style={{ textAlign: 'center', padding: spacing.xxl, color: colors.text.secondary }}>
                <Users size={48} style={{ marginBottom: spacing.md, opacity: 0.5 }} />
                <p>No contestants yet</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
                {sortedContestants.map((contestant, index) => {
                  const isInAdvanceZone = index < advanceCount;
                  const isTied = ties.some(t => t.id === contestant.id);

                  return (
                    <div
                      key={contestant.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: spacing.lg,
                        padding: spacing.lg,
                        background: isTied
                          ? 'rgba(245,158,11,0.1)'
                          : isInAdvanceZone
                            ? 'rgba(34,197,94,0.05)'
                            : colors.background.secondary,
                        border: `1px solid ${isTied ? 'rgba(245,158,11,0.3)' : isInAdvanceZone ? 'rgba(34,197,94,0.2)' : colors.border.light}`,
                        borderRadius: borderRadius.lg,
                      }}
                    >
                      {/* Rank */}
                      <div style={{
                        width: 40,
                        height: 40,
                        borderRadius: borderRadius.full,
                        background: index < 3 ? 'linear-gradient(135deg, #d4af37, #f4d03f)' : colors.background.card,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: typography.fontWeight.bold,
                        color: index < 3 ? '#0a0a0f' : colors.text.primary,
                      }}>
                        {index + 1}
                      </div>

                      {/* Avatar & Name */}
                      <Avatar name={contestant.name} size={48} avatarUrl={contestant.avatarUrl} />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                          <p style={{ fontWeight: typography.fontWeight.medium }}>{contestant.name}</p>
                          {isInAdvanceZone && !isTied && (
                            <Badge variant="success" size="sm">Advancing</Badge>
                          )}
                          {isTied && (
                            <Badge variant="warning" size="sm">Tied</Badge>
                          )}
                        </div>
                        <p style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>
                          {contestant.instagram && `@${contestant.instagram.replace('@', '')}`}
                        </p>
                      </div>

                      {/* Current Votes */}
                      <div style={{ textAlign: 'center', minWidth: 80 }}>
                        <p style={{
                          fontSize: typography.fontSize.xl,
                          fontWeight: typography.fontWeight.bold,
                          color: colors.gold.primary,
                        }}>
                          {contestant.votes || 0}
                        </p>
                        <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted }}>votes</p>
                      </div>

                      {/* Add Votes */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                        <input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={voteInputs[contestant.id] || ''}
                          onChange={(e) => setVoteInputs(prev => ({
                            ...prev,
                            [contestant.id]: e.target.value
                          }))}
                          style={{
                            width: 70,
                            padding: spacing.sm,
                            background: colors.background.card,
                            border: `1px solid ${colors.border.light}`,
                            borderRadius: borderRadius.md,
                            color: '#fff',
                            fontSize: typography.fontSize.sm,
                            textAlign: 'center',
                          }}
                        />
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleAddVotes(contestant.id)}
                          disabled={savingVotes[contestant.id] || !voteInputs[contestant.id]}
                        >
                          {savingVotes[contestant.id] ? (
                            <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} />
                          ) : (
                            <Plus size={14} />
                          )}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Panel>

        {/* Tie Resolver Modal */}
        {showTieResolver && (
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
              background: colors.background.primary,
              border: `1px solid ${colors.border.gold}`,
              borderRadius: borderRadius.xl,
              padding: spacing.xxl,
              maxWidth: 500,
              width: '90%',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md, marginBottom: spacing.xl }}>
                <Scale size={24} style={{ color: colors.gold.primary }} />
                <h3 style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold }}>
                  Resolve Tie
                </h3>
              </div>

              <p style={{ color: colors.text.secondary, marginBottom: spacing.xl }}>
                The following contestants are tied at position {advanceCount} with {tiedContestants[0]?.votes} votes.
                Select who should advance to the next round.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md, marginBottom: spacing.xl }}>
                {tiedContestants.map((contestant) => (
                  <button
                    key={contestant.id}
                    onClick={() => handleResolveTie(contestant.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: spacing.md,
                      padding: spacing.lg,
                      background: colors.background.secondary,
                      border: `1px solid ${colors.border.light}`,
                      borderRadius: borderRadius.lg,
                      cursor: 'pointer',
                      transition: `all ${transitions.fast}`,
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.borderColor = colors.gold.primary;
                      e.currentTarget.style.background = 'rgba(212,175,55,0.1)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.borderColor = colors.border.light;
                      e.currentTarget.style.background = colors.background.secondary;
                    }}
                  >
                    <Avatar name={contestant.name} size={48} avatarUrl={contestant.avatarUrl} />
                    <div style={{ flex: 1, textAlign: 'left' }}>
                      <p style={{ fontWeight: typography.fontWeight.medium, color: '#fff' }}>{contestant.name}</p>
                      <p style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>
                        {contestant.votes} votes
                      </p>
                    </div>
                    <Award size={20} style={{ color: colors.gold.primary }} />
                  </button>
                ))}
              </div>

              <Button variant="secondary" onClick={() => setShowTieResolver(false)} style={{ width: '100%' }}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ============================================================================
  // COMMUNITY TAB
  // ============================================================================

  const renderCommunity = () => {
    // For superadmin, show as "EliteRank"; for hosts, show their name
    const authorName = isSuperAdmin ? 'EliteRank' : (data.host?.name || 'Host');
    const authorAvatar = isSuperAdmin ? null : data.host?.avatar;

    const handleCreateAnnouncement = async () => {
      if (!announcementForm.title.trim() || !announcementForm.content.trim()) return;
      await addAnnouncement(announcementForm);
      setAnnouncementForm({ title: '', content: '' });
      setShowAnnouncementForm(false);
    };

    const handleUpdateAnnouncement = async () => {
      if (!editingAnnouncement || !announcementForm.title.trim()) return;
      await updateAnnouncement(editingAnnouncement.id, announcementForm);
      setEditingAnnouncement(null);
      setAnnouncementForm({ title: '', content: '' });
    };

    // AI Draft generation (super admin only)
    const handleGenerateAiDraft = async () => {
      setIsGeneratingAi(true);
      setAiError(null);

      try {
        const validBullets = aiBulletPoints.filter(bp => bp.trim() !== '');
        if (validBullets.length < 2) {
          throw new Error('Please enter at least 2 bullet points');
        }

        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        if (!supabaseUrl) throw new Error('Supabase not configured');

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');

        const response = await fetch(`${supabaseUrl}/functions/v1/generate-ai-post`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            mode: 'editorial',
            topicType: aiTopicType,
            bulletPoints: validBullets,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || 'Failed to generate draft');
        }

        const result = await response.json();
        if (!result.success) throw new Error(result.error || 'Failed to generate draft');

        // Populate form with generated content
        setAnnouncementForm({ title: result.title, content: result.content });
        setIsAiMode(false); // Switch back to manual mode to edit

      } catch (error) {
        console.error('Error generating AI draft:', error);
        setAiError(error.message);
      } finally {
        setIsGeneratingAi(false);
      }
    };

    const AI_TOPIC_TYPES = [
      { value: 'partnership', label: 'Partnership' },
      { value: 'feature_launch', label: 'Feature Launch' },
      { value: 'winner_spotlight', label: 'Winner Spotlight' },
      { value: 'company_update', label: 'Company Update' },
      { value: 'competition_highlight', label: 'Competition Highlight' },
    ];

    const sortedAnnouncements = [...data.announcements].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.publishedAt) - new Date(a.publishedAt);
    });

    return (
      <div>
        {/* Create Post Section */}
        <Panel title="Create Announcement" icon={Plus}>
          <div style={{ padding: spacing.xl }}>
            {showAnnouncementForm || editingAnnouncement ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
                {/* AI Draft Toggle - Super Admin Only */}
                {isSuperAdmin && !editingAnnouncement && (
                  <div style={{
                    display: 'flex',
                    gap: spacing.sm,
                    padding: spacing.xs,
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: borderRadius.lg,
                    border: `1px solid ${colors.border.lighter}`,
                    marginBottom: spacing.sm,
                  }}>
                    <button
                      onClick={() => setIsAiMode(false)}
                      style={{
                        flex: 1,
                        padding: `${spacing.sm} ${spacing.md}`,
                        borderRadius: borderRadius.md,
                        border: 'none',
                        background: !isAiMode ? 'rgba(212,175,55,0.2)' : 'transparent',
                        color: !isAiMode ? colors.gold.primary : colors.text.secondary,
                        fontWeight: typography.fontWeight.medium,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: spacing.sm,
                        fontSize: typography.fontSize.sm,
                      }}
                    >
                      <FileText size={14} /> Manual
                    </button>
                    <button
                      onClick={() => setIsAiMode(true)}
                      style={{
                        flex: 1,
                        padding: `${spacing.sm} ${spacing.md}`,
                        borderRadius: borderRadius.md,
                        border: 'none',
                        background: isAiMode ? 'rgba(139,92,246,0.2)' : 'transparent',
                        color: isAiMode ? '#a78bfa' : colors.text.secondary,
                        fontWeight: typography.fontWeight.medium,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: spacing.sm,
                        fontSize: typography.fontSize.sm,
                      }}
                    >
                      <Wand2 size={14} /> AI Draft
                    </button>
                  </div>
                )}

                {/* AI Draft Interface */}
                {isAiMode && isSuperAdmin && !editingAnnouncement ? (
                  <div style={{
                    padding: spacing.lg,
                    background: 'rgba(139,92,246,0.05)',
                    borderRadius: borderRadius.lg,
                    border: '1px solid rgba(139,92,246,0.2)',
                  }}>
                    {/* Topic Type */}
                    <div style={{ marginBottom: spacing.lg }}>
                      <label style={{ display: 'block', fontSize: typography.fontSize.sm, color: colors.text.secondary, marginBottom: spacing.sm }}>
                        Topic Type
                      </label>
                      <select
                        value={aiTopicType}
                        onChange={(e) => setAiTopicType(e.target.value)}
                        style={{
                          width: '100%',
                          padding: spacing.md,
                          background: colors.background.secondary,
                          border: `1px solid ${colors.border.light}`,
                          borderRadius: borderRadius.md,
                          color: '#fff',
                          fontSize: typography.fontSize.base,
                        }}
                      >
                        {AI_TOPIC_TYPES.map(t => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Bullet Points */}
                    <div style={{ marginBottom: spacing.lg }}>
                      <label style={{ display: 'block', fontSize: typography.fontSize.sm, color: colors.text.secondary, marginBottom: spacing.sm }}>
                        Key Points (2-4 bullet points)
                      </label>
                      {aiBulletPoints.map((point, idx) => (
                        <input
                          key={idx}
                          type="text"
                          placeholder={`Point ${idx + 1}...`}
                          value={point}
                          onChange={(e) => {
                            const newPoints = [...aiBulletPoints];
                            newPoints[idx] = e.target.value;
                            setAiBulletPoints(newPoints);
                          }}
                          style={{
                            width: '100%',
                            padding: spacing.md,
                            marginBottom: spacing.sm,
                            background: colors.background.secondary,
                            border: `1px solid ${colors.border.light}`,
                            borderRadius: borderRadius.md,
                            color: '#fff',
                            fontSize: typography.fontSize.base,
                          }}
                        />
                      ))}
                      {aiBulletPoints.length < 4 && (
                        <button
                          onClick={() => setAiBulletPoints([...aiBulletPoints, ''])}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#a78bfa',
                            fontSize: typography.fontSize.sm,
                            cursor: 'pointer',
                            padding: spacing.sm,
                          }}
                        >
                          + Add another point
                        </button>
                      )}
                    </div>

                    {/* Generate Button */}
                    <Button
                      onClick={handleGenerateAiDraft}
                      disabled={isGeneratingAi || aiBulletPoints.filter(p => p.trim()).length < 2}
                      icon={isGeneratingAi ? Loader : Wand2}
                      style={{ width: '100%', background: 'rgba(139,92,246,0.8)' }}
                    >
                      {isGeneratingAi ? 'Generating...' : 'Generate Draft'}
                    </Button>

                    {aiError && (
                      <p style={{ marginTop: spacing.md, color: '#ef4444', fontSize: typography.fontSize.sm }}>
                        {aiError}
                      </p>
                    )}
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      placeholder="Announcement title..."
                      value={announcementForm.title}
                      onChange={(e) => setAnnouncementForm(prev => ({ ...prev, title: e.target.value }))}
                      style={{
                        background: colors.background.secondary,
                        border: `1px solid ${colors.border.light}`,
                        borderRadius: borderRadius.lg,
                        padding: spacing.md,
                        color: '#fff',
                        fontSize: typography.fontSize.lg,
                      }}
                    />
                    <textarea
                      placeholder="Write your announcement..."
                      value={announcementForm.content}
                      onChange={(e) => setAnnouncementForm(prev => ({ ...prev, content: e.target.value }))}
                      rows={4}
                      style={{
                        background: colors.background.secondary,
                        border: `1px solid ${colors.border.light}`,
                        borderRadius: borderRadius.lg,
                        padding: spacing.md,
                        color: '#fff',
                        fontSize: typography.fontSize.md,
                        resize: 'vertical',
                      }}
                    />
                  </>
                )}

                <div style={{ display: 'flex', gap: spacing.md, justifyContent: 'flex-end' }}>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setShowAnnouncementForm(false);
                      setEditingAnnouncement(null);
                      setAnnouncementForm({ title: '', content: '' });
                      setIsAiMode(false);
                      setAiBulletPoints(['', '', '']);
                      setAiError(null);
                    }}
                  >
                    Cancel
                  </Button>
                  {(!isAiMode || editingAnnouncement) && (
                    <Button onClick={editingAnnouncement ? handleUpdateAnnouncement : handleCreateAnnouncement}>
                      {editingAnnouncement ? 'Update' : 'Post'}
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing.lg,
                  padding: spacing.xl,
                  background: 'rgba(255,255,255,0.02)',
                  borderRadius: borderRadius.xl,
                  border: `1px dashed ${colors.border.gold}`,
                  cursor: 'pointer',
                }}
                onClick={() => setShowAnnouncementForm(true)}
              >
                <Avatar name={authorName} avatarUrl={authorAvatar} size={44} />
                <div style={{ flex: 1 }}>
                  <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.lg }}>
                    Share an update with your audience...
                  </p>
                </div>
                <Button icon={Plus}>New Post</Button>
              </div>
            )}
          </div>
        </Panel>

        {/* Announcements Feed */}
        <Panel
          title="Announcements Feed"
          icon={FileText}
          action={<span style={{ color: colors.text.secondary }}>{data.announcements.length} posts</span>}
        >
          <div style={{ padding: spacing.xl }}>
            {sortedAnnouncements.length > 0 ? (
              sortedAnnouncements.map((post) => (
                <div
                  key={post.id}
                  style={{
                    background: post.pinned ? 'rgba(212,175,55,0.05)' : 'rgba(255,255,255,0.02)',
                    border: post.pinned ? `1px solid rgba(212,175,55,0.2)` : `1px solid ${colors.border.lighter}`,
                    borderRadius: borderRadius.xl,
                    padding: spacing.xl,
                    marginBottom: spacing.lg,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: spacing.md, marginBottom: spacing.md }}>
                    <Avatar name={authorName} avatarUrl={authorAvatar} size={44} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs }}>
                        <span style={{ fontWeight: typography.fontWeight.semibold }}>{authorName}</span>
                        {post.pinned && <Badge variant="gold" size="sm">Pinned</Badge>}
                        <span style={{ color: colors.text.muted, fontSize: typography.fontSize.sm }}>
                          • {formatRelativeTime(post.publishedAt)}
                        </span>
                      </div>
                      <h4 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, marginBottom: spacing.sm }}>
                        {post.title}
                      </h4>
                      <p style={{ color: colors.text.secondary }}>{post.content}</p>
                    </div>
                    <div style={{ display: 'flex', gap: spacing.sm }}>
                      <button
                        onClick={() => toggleAnnouncementPin(post.id, post.pinned)}
                        style={{
                          padding: spacing.sm,
                          background: post.pinned ? 'rgba(212,175,55,0.2)' : 'transparent',
                          border: `1px solid ${post.pinned ? colors.gold.primary : colors.border.light}`,
                          borderRadius: borderRadius.md,
                          color: post.pinned ? colors.gold.primary : colors.text.secondary,
                          cursor: 'pointer',
                        }}
                        title={post.pinned ? 'Unpin' : 'Pin'}
                      >
                        <Pin size={14} />
                      </button>
                      <button
                        onClick={() => {
                          setEditingAnnouncement(post);
                          setAnnouncementForm({ title: post.title, content: post.content });
                        }}
                        style={{
                          padding: spacing.sm,
                          background: 'transparent',
                          border: `1px solid ${colors.border.light}`,
                          borderRadius: borderRadius.md,
                          color: colors.text.secondary,
                          cursor: 'pointer',
                        }}
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => deleteAnnouncement(post.id)}
                        style={{
                          padding: spacing.sm,
                          background: 'transparent',
                          border: `1px solid rgba(239,68,68,0.3)`,
                          borderRadius: borderRadius.md,
                          color: '#ef4444',
                          cursor: 'pointer',
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: spacing.xxl, color: colors.text.secondary }}>
                <FileText size={48} style={{ marginBottom: spacing.md, opacity: 0.5 }} />
                <p>No announcements yet. Create your first post above.</p>
              </div>
            )}
          </div>
        </Panel>
      </div>
    );
  };

  // ============================================================================
  // SETTINGS TAB
  // ============================================================================

  const renderSettings = () => {
    return (
      <div>
        {/* Timeline & Status Settings */}
        <Panel title="Timeline & Status" icon={Calendar}>
          <div style={{ padding: spacing.xl }}>
            <TimelineSettings
              competition={competition}
              onSave={refresh}
            />
          </div>
        </Panel>

        {/* Judges Section */}
        <Panel
          title={`Judges (${data.judges.length})`}
          icon={User}
          action={<Button size="sm" icon={Plus} onClick={() => setJudgeModal({ isOpen: true, judge: null })}>Add Judge</Button>}
        >
          <div style={{ padding: spacing.xl }}>
            {data.judges.length === 0 ? (
              <div style={{ textAlign: 'center', padding: spacing.xl, color: colors.text.secondary }}>
                <User size={48} style={{ marginBottom: spacing.md, opacity: 0.5 }} />
                <p>No judges assigned yet</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: spacing.lg }}>
                {data.judges.map((judge) => (
                  <div key={judge.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing.md,
                    padding: spacing.lg,
                    background: colors.background.secondary,
                    borderRadius: borderRadius.lg,
                  }}>
                    <Avatar name={judge.name} size={48} avatarUrl={judge.avatarUrl} variant="gold" />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: typography.fontWeight.medium }}>{judge.name}</p>
                      <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm }}>{judge.title}</p>
                    </div>
                    <button
                      onClick={() => deleteJudge(judge.id)}
                      style={{
                        padding: spacing.sm,
                        background: 'transparent',
                        border: `1px solid rgba(239,68,68,0.3)`,
                        borderRadius: borderRadius.md,
                        color: '#ef4444',
                        cursor: 'pointer',
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Panel>

        {/* Sponsors Section */}
        <Panel
          title={`Sponsors (${data.sponsors.length})`}
          icon={Star}
          action={<Button size="sm" icon={Plus} onClick={() => setSponsorModal({ isOpen: true, sponsor: null })}>Add Sponsor</Button>}
        >
          <div style={{ padding: spacing.xl }}>
            {data.sponsors.length === 0 ? (
              <div style={{ textAlign: 'center', padding: spacing.xl, color: colors.text.secondary }}>
                <Star size={48} style={{ marginBottom: spacing.md, opacity: 0.5 }} />
                <p>No sponsors yet</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: spacing.md }}>
                {data.sponsors.map((sponsor) => (
                  <div key={sponsor.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing.lg,
                    padding: spacing.lg,
                    background: colors.background.secondary,
                    borderRadius: borderRadius.lg,
                  }}>
                    {sponsor.logoUrl ? (
                      <img src={sponsor.logoUrl} alt={sponsor.name} style={{ width: 48, height: 48, borderRadius: borderRadius.md, objectFit: 'contain' }} />
                    ) : (
                      <div style={{ width: 48, height: 48, background: 'rgba(212,175,55,0.2)', borderRadius: borderRadius.md, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Star size={24} style={{ color: colors.gold.primary }} />
                      </div>
                    )}
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: typography.fontWeight.medium }}>{sponsor.name}</p>
                      <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm }}>
                        {sponsor.tier.charAt(0).toUpperCase() + sponsor.tier.slice(1)} Tier • ${sponsor.amount.toLocaleString()}
                      </p>
                    </div>
                    <button
                      onClick={() => deleteSponsor(sponsor.id)}
                      style={{
                        padding: spacing.sm,
                        background: 'transparent',
                        border: `1px solid rgba(239,68,68,0.3)`,
                        borderRadius: borderRadius.md,
                        color: '#ef4444',
                        cursor: 'pointer',
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Panel>

        {/* Events Section */}
        <Panel
          title={`Events (${data.events.length})`}
          icon={Calendar}
          action={<Button size="sm" icon={Plus} onClick={() => setEventModal({ isOpen: true, event: null })}>Add Event</Button>}
        >
          <div style={{ padding: spacing.xl }}>
            {data.events.length === 0 ? (
              <div style={{ textAlign: 'center', padding: spacing.xl, color: colors.text.secondary }}>
                <Calendar size={48} style={{ marginBottom: spacing.md, opacity: 0.5 }} />
                <p>No events scheduled yet</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: spacing.md }}>
                {data.events.map((event) => {
                  const status = getEventStatus(event);
                  return (
                    <div key={event.id} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: spacing.lg,
                      padding: spacing.lg,
                      background: colors.background.secondary,
                      borderRadius: borderRadius.lg,
                    }}>
                      <div style={{
                        width: 48,
                        height: 48,
                        background: status === 'active' ? 'rgba(212,175,55,0.2)' : status === 'completed' ? 'rgba(34,197,94,0.2)' : 'rgba(59,130,246,0.2)',
                        borderRadius: borderRadius.lg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <Calendar size={24} style={{ color: status === 'active' ? colors.gold.primary : status === 'completed' ? '#22c55e' : '#3b82f6' }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: typography.fontWeight.medium }}>{event.name}</p>
                        <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm }}>
                          {event.date ? new Date(event.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'No date set'}
                          {event.location && ` • ${event.location}`}
                        </p>
                      </div>
                      <Badge variant={status === 'active' ? 'gold' : status === 'completed' ? 'success' : 'secondary'} size="sm">
                        {status}
                      </Badge>
                      <button
                        onClick={() => deleteEvent(event.id)}
                        style={{
                          padding: spacing.sm,
                          background: 'transparent',
                          border: `1px solid rgba(239,68,68,0.3)`,
                          borderRadius: borderRadius.md,
                          color: '#ef4444',
                          cursor: 'pointer',
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Panel>

        {/* Rules Section */}
        <Panel
          title={`Rules (${data.rules.length})`}
          icon={FileText}
          action={<Button size="sm" icon={Plus} onClick={() => setRuleModal({ isOpen: true, rule: null })}>Add Rule</Button>}
        >
          <div style={{ padding: spacing.xl }}>
            {data.rules.length === 0 ? (
              <div style={{ textAlign: 'center', padding: spacing.xl, color: colors.text.secondary }}>
                <FileText size={48} style={{ marginBottom: spacing.md, opacity: 0.5 }} />
                <p>No rules defined yet</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: spacing.md }}>
                {data.rules.map((rule) => (
                  <div key={rule.id} style={{
                    padding: spacing.lg,
                    background: colors.background.secondary,
                    borderRadius: borderRadius.lg,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm }}>
                      <h4 style={{ fontWeight: typography.fontWeight.semibold }}>{rule.sectionTitle}</h4>
                      <div style={{ display: 'flex', gap: spacing.sm }}>
                        <button
                          onClick={() => setRuleModal({ isOpen: true, rule })}
                          style={{
                            padding: spacing.sm,
                            background: 'transparent',
                            border: `1px solid ${colors.border.light}`,
                            borderRadius: borderRadius.md,
                            color: colors.text.secondary,
                            cursor: 'pointer',
                          }}
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => deleteRule(rule.id)}
                          style={{
                            padding: spacing.sm,
                            background: 'transparent',
                            border: `1px solid rgba(239,68,68,0.3)`,
                            borderRadius: borderRadius.md,
                            color: '#ef4444',
                            cursor: 'pointer',
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm }}>{rule.sectionContent || 'No content'}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Panel>

        {/* Nomination Form Fields Section */}
        <Panel
          title="Nomination Form Fields"
          icon={FileText}
          action={<Button size="sm" icon={Edit} onClick={() => setShowNominationFormEditor(true)}>Edit Form</Button>}
        >
          <div style={{ padding: spacing.xl }}>
            <p style={{ color: colors.text.secondary, marginBottom: spacing.lg, fontSize: typography.fontSize.sm }}>
              Customize the fields shown in the nomination form. Toggle fields on/off or mark them as required.
            </p>
            <div style={{ display: 'grid', gap: spacing.sm }}>
              {formFields.map((field) => (
                <div
                  key={field.key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: spacing.md,
                    background: field.enabled ? colors.background.secondary : 'rgba(100,100,100,0.1)',
                    borderRadius: borderRadius.lg,
                    opacity: field.enabled ? 1 : 0.6,
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: typography.fontWeight.medium }}>{field.label}</p>
                    <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted }}>
                      Type: {field.type} {field.required && '• Required'}
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                    {field.enabled ? (
                      <CheckCircle size={18} style={{ color: colors.status.success }} />
                    ) : (
                      <XCircle size={18} style={{ color: colors.text.muted }} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </div>
    );
  };

  // ============================================================================
  // HOST PROFILE TAB
  // ============================================================================

  const renderHostProfile = () => {
    const host = data.host;

    if (!host) {
      return (
        <div style={{
          background: colors.background.card,
          border: `1px solid ${colors.border.light}`,
          borderRadius: borderRadius.xl,
          padding: spacing.xxl,
          textAlign: 'center',
        }}>
          <User size={64} style={{ color: colors.text.muted, marginBottom: spacing.lg }} />
          <h3 style={{ fontSize: typography.fontSize.lg, marginBottom: spacing.md }}>No Host Assigned</h3>
          <p style={{ color: colors.text.secondary, marginBottom: spacing.xl }}>
            This competition doesn't have a host assigned yet.
          </p>
          {isSuperAdmin && (
            <Button icon={UserPlus} onClick={() => setShowHostAssignment(true)}>Assign Host</Button>
          )}
        </div>
      );
    }

    return (
      <div>
        {/* Host Profile Card */}
        <div style={{
          background: colors.background.card,
          border: `1px solid ${colors.border.light}`,
          borderRadius: borderRadius.xl,
          overflow: 'hidden',
        }}>
          {/* Header with avatar */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(139,92,246,0.1))',
            padding: spacing.xxl,
            display: 'flex',
            alignItems: 'center',
            gap: spacing.xl,
          }}>
            <Avatar name={host.name} avatarUrl={host.avatar} size={120} />
            <div>
              <h2 style={{ fontSize: typography.fontSize.display, fontWeight: typography.fontWeight.bold }}>
                {host.name}
              </h2>
              {host.city && (
                <p style={{ color: colors.text.secondary, display: 'flex', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm }}>
                  <MapPin size={16} /> {host.city}
                </p>
              )}
              <Badge variant="gold" size="md" style={{ marginTop: spacing.md }}>
                <Star size={14} style={{ marginRight: spacing.xs }} /> Verified Host
              </Badge>
            </div>
            {isSuperAdmin && (
              <div style={{ marginLeft: 'auto', display: 'flex', gap: spacing.md }}>
                <Button variant="secondary" onClick={() => setShowHostAssignment(true)}>Reassign Host</Button>
                <Button
                  variant="secondary"
                  style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.5)' }}
                  onClick={removeHost}
                >
                  Remove Host
                </Button>
              </div>
            )}
          </div>

          {/* Profile content */}
          <div style={{ padding: spacing.xxl }}>
            {/* About */}
            {host.bio && (
              <div style={{ marginBottom: spacing.xxl }}>
                <h3 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, marginBottom: spacing.md, display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                  <FileText size={18} /> About
                </h3>
                <p style={{ color: colors.text.secondary, lineHeight: 1.6 }}>{host.bio}</p>
              </div>
            )}

            {/* Social Links */}
            {host.instagram && (
              <div style={{ marginBottom: spacing.xxl }}>
                <h3 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, marginBottom: spacing.md }}>
                  Social
                </h3>
                <a
                  href={`https://instagram.com/${host.instagram.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: spacing.sm,
                    padding: `${spacing.sm} ${spacing.md}`,
                    background: 'rgba(255,255,255,0.05)',
                    border: `1px solid ${colors.border.light}`,
                    borderRadius: borderRadius.md,
                    color: colors.text.primary,
                    textDecoration: 'none',
                  }}
                >
                  @{host.instagram.replace('@', '')}
                  <ExternalLink size={14} />
                </a>
              </div>
            )}

            {/* Gallery */}
            {host.gallery && host.gallery.length > 0 && (
              <div>
                <h3 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, marginBottom: spacing.md }}>
                  Gallery
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: spacing.md }}>
                  {host.gallery.map((img, i) => (
                    <img
                      key={i}
                      src={typeof img === 'string' ? img : img.url}
                      alt={`Gallery ${i + 1}`}
                      style={{
                        width: '100%',
                        aspectRatio: '1',
                        objectFit: 'cover',
                        borderRadius: borderRadius.lg,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

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
      case 'overview': return renderOverview();
      case 'contestants': return renderContestants();
      case 'advancement': return renderAdvancement();
      case 'community': return renderCommunity();
      case 'settings': return renderSettings();
      case 'profile': return renderHostProfile();
      default: return null;
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
          padding: `${spacing.xxxl} ${spacing.xxl}`,
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
            {/* Header */}
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

            {/* Content */}
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

            {/* Footer */}
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
