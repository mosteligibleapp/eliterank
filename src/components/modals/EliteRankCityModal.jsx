import React, { useState, useEffect, useMemo } from 'react';
import {
  X, Crown, MapPin, Calendar, Trophy, Clock, ChevronRight, Sparkles, Users,
  Activity, Info, Briefcase, Loader, User, Megaphone, Award, Building, Heart,
  Home, Search, Bell, Menu, ArrowRight, Play, ExternalLink
} from 'lucide-react';
import { Button, Badge, OrganizationLogo, ProfileIcon, EliteRankCrown, CrownIcon } from '../ui';
import { useSupabaseAuth, useAppSettings } from '../../hooks';
import { colors, spacing, borderRadius, typography, shadows, transitions, gradients, components, styleHelpers } from '../../styles/theme';
import { useResponsive } from '../../hooks/useResponsive';
import { supabase } from '../../lib/supabase';
import {
  useCities,
  useOrganizations,
  useProfiles,
  useVotingRounds,
} from '../../hooks/useCachedQuery';
import {
  computeCompetitionPhase,
  isCompetitionVisible,
  isCompetitionAccessible,
  getPhaseDisplayConfig,
  COMPETITION_STATUSES,
  shouldAutoTransitionToLive,
  shouldAutoTransitionToCompleted,
  isLive,
  isPublished,
  isCompleted,
} from '../../utils/competitionPhase';
import { getCityImage } from '../../utils/cityImages';

// Tab configuration
// Custom wrapper to make CrownIcon work like lucide icons
const CrownIconWrapper = ({ size, style }) => <CrownIcon size={size} color="currentColor" style={style} />;

const TABS = [
  { id: 'competitions', label: 'Explore', icon: CrownIconWrapper, mobileIcon: Home },
  { id: 'events', label: 'Events', icon: Calendar, mobileIcon: Calendar },
  { id: 'announcements', label: 'News', icon: Megaphone, mobileIcon: Bell },
  { id: 'opportunities', label: 'Join', icon: Briefcase, mobileIcon: Briefcase },
  { id: 'about', label: 'About', icon: Info, mobileIcon: Info },
];

export default function EliteRankCityModal({
  isOpen,
  onClose,
  onOpenCompetition,
  onOpenTeaser,
  isFullPage = false,
  onLogin,
  onDashboard,
  onProfile,
  onRewards,
  isAuthenticated = false,
  userRole = 'fan',
  userName,
  onLogout,
}) {
  const { isMobile, isTablet, width } = useResponsive();

  // Get user and profile data for ProfileIcon
  const { user, profile } = useSupabaseAuth();

  // Check if user has dashboard access
  const hasDashboardAccess = profile?.is_host || profile?.is_super_admin;
  const [activeTab, setActiveTab] = useState('competitions');
  const [showCrownAnimation, setShowCrownAnimation] = useState(true);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [competitions, setCompetitions] = useState([]);
  const [events, setEvents] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('active'); // Default to Live competitions
  const [cityFilter, setCityFilter] = useState('all');
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Use cached hooks for static data (cities, organizations, profiles)
  const { data: cachedCities, loading: citiesLoading } = useCities();
  const { data: cachedOrganizations, loading: orgsLoading } = useOrganizations();
  const { data: cachedProfiles, loading: profilesLoading } = useProfiles();

  // Fetch Hall of Winners settings
  const { data: hallOfWinnersData } = useAppSettings('hall_of_winners');

  // Memoize maps for quick lookups
  const cities = cachedCities || [];
  const organizations = cachedOrganizations || [];
  const profilesMap = useMemo(() => {
    return (cachedProfiles || []).reduce((acc, p) => { acc[p.id] = p; return acc; }, {});
  }, [cachedProfiles]);
  const citiesMap = useMemo(() => {
    return cities.reduce((acc, c) => { acc[c.id] = c; return acc; }, {});
  }, [cities]);

  // Fetch dynamic data (competitions, settings, voting rounds, events, announcements)
  useEffect(() => {
    const fetchData = async () => {
      if (!supabase || citiesLoading || orgsLoading || profilesLoading) {
        return;
      }

      try {
        // Fetch only dynamic data - static data comes from cached hooks
        // Note: competition_settings has been merged into competitions table
        const [compsResult, votingRoundsResult, nominationPeriodsResult, eventsResult, announcementsResult] = await Promise.all([
          supabase.from('competitions').select('*').order('created_at', { ascending: false }),
          supabase.from('voting_rounds').select('*').order('round_order'),
          supabase.from('nomination_periods').select('*').order('period_order'),
          supabase.from('events').select('*').order('date', { ascending: true }),
          supabase.from('announcements').select('*').order('published_at', { ascending: false }),
        ]);

        // Group voting rounds by competition_id
        const votingRoundsMap = (votingRoundsResult.data || []).reduce((acc, r) => {
          if (!acc[r.competition_id]) acc[r.competition_id] = [];
          acc[r.competition_id].push(r);
          return acc;
        }, {});

        // Group nomination periods by competition_id
        const nominationPeriodsMap = (nominationPeriodsResult.data || []).reduce((acc, p) => {
          if (!acc[p.competition_id]) acc[p.competition_id] = [];
          acc[p.competition_id].push(p);
          return acc;
        }, {});

        // Auto-transitions (settings are now directly on competition)
        // Must attach nomination_periods before checking transitions
        const toTransition = [];
        for (const comp of (compsResult.data || [])) {
          const compWithPeriods = {
            ...comp,
            nomination_periods: nominationPeriodsMap[comp.id] || [],
          };
          if (shouldAutoTransitionToLive(compWithPeriods, comp)) {
            toTransition.push({ id: comp.id, newStatus: 'live' });
          } else if (shouldAutoTransitionToCompleted(compWithPeriods, comp)) {
            toTransition.push({ id: comp.id, newStatus: 'completed' });
          }
        }

        if (toTransition.length > 0) {
          for (const { id, newStatus } of toTransition) {
            await supabase.from('competitions').update({ status: newStatus }).eq('id', id);
          }
          const { data: updated } = await supabase.from('competitions').select('*').order('created_at', { ascending: false });
          if (updated) compsResult.data = updated;
        }

        if (compsResult.data) {
          setCompetitions(compsResult.data.map(comp => {
            // Settings are now directly on the competition object
            const compWithSettings = {
              ...comp,
              voting_rounds: votingRoundsMap[comp.id] || [],
              nomination_periods: nominationPeriodsMap[comp.id] || [],
            };
            const computedPhase = computeCompetitionPhase(compWithSettings);
            const visible = isCompetitionVisible(comp.status);
            const accessible = isCompetitionAccessible(comp.status);
            const cityFromLookup = citiesMap[comp.city_id];
            // Prioritize city lookup by city_id over potentially stale comp.city string
            const cityName = cityFromLookup?.name || comp.city || 'Unknown City';
            const hostProfile = comp.host_id ? profilesMap[comp.host_id] : null;
            // Include organization data directly to avoid lookup issues later
            const org = organizations.find(o => o.id === comp.organization_id);

            return {
              id: comp.id,
              name: comp.name || `Most Eligible ${cityName}`,
              slug: comp.slug, // Database slug - source of truth for navigation
              city: cityName,
              cityState: cityFromLookup?.state || '',
              citySlug: cityFromLookup?.slug || cityName.toLowerCase().replace(/\s+/g, '-'),
              cityId: comp.city_id,
              season: comp.season || new Date().getFullYear(),
              status: (comp.status || COMPETITION_STATUSES.DRAFT).toLowerCase(),
              phase: computedPhase,
              visible,
              accessible,
              organizationId: comp.organization_id,
              // Include org slug directly for reliable navigation
              orgSlug: org?.slug,
              organization: org ? { id: org.id, name: org.name, logo_url: org.logo_url || org.logo, slug: org.slug } : null,
              host_id: comp.host_id,
              host: hostProfile ? {
                id: hostProfile.id,
                name: `${hostProfile.first_name || ''} ${hostProfile.last_name || ''}`.trim() || hostProfile.email,
                avatar: hostProfile.avatar_url,
              } : null,
              winners: comp.winners || [],
              nomination_start: compWithSettings.nomination_start,
              nomination_end: compWithSettings.nomination_end,
              voting_start: compWithSettings.voting_start,
              voting_end: compWithSettings.voting_end,
              finals_date: compWithSettings.finals_date,
              voting_rounds: compWithSettings.voting_rounds,
              nomination_periods: compWithSettings.nomination_periods,
            };
          }));
        }

        if (eventsResult.data) {
          setEvents(eventsResult.data.map(event => {
            const comp = compsResult.data?.find(c => c.id === event.competition_id);
            const cityInfo = comp?.city_id ? citiesMap[comp.city_id] : null;
            return { ...event, competitionName: comp?.name || 'Elite Rank', cityName: cityInfo?.name || 'Unknown' };
          }));
        }

        if (announcementsResult.data) {
          setAnnouncements(announcementsResult.data.map(a => {
            const comp = compsResult.data?.find(c => c.id === a.competition_id);
            const cityInfo = comp?.city_id ? citiesMap[comp.city_id] : null;
            return { ...a, competitionName: comp?.name || 'Elite Rank', cityName: cityInfo?.name || 'Unknown' };
          }));
        }
      } catch {
        // Silent fail
      } finally {
        setLoading(false);
      }
    };

    if (isOpen && !citiesLoading && !orgsLoading && !profilesLoading) fetchData();
  }, [isOpen, citiesLoading, orgsLoading, profilesLoading, citiesMap, profilesMap]);

  // Memoized values
  const availableCities = useMemo(() =>
    cities.filter(city => competitions.some(c => c.visible && c.cityId === city.id)),
    [cities, competitions]
  );

  const visibleCompetitions = useMemo(() => {
    return competitions.filter(c => {
      if (!c.visible) return false;
      if (cityFilter !== 'all' && c.cityId !== cityFilter) return false;
      if (statusFilter === 'active') {
        return isLive(c.status) && ['nomination', 'voting', 'judging'].includes(c.phase);
      }
      if (statusFilter === 'upcoming') return isPublished(c.status);
      if (statusFilter === 'complete') return isCompleted(c.status) || c.phase === 'completed';
      return true;
    });
  }, [competitions, cityFilter, statusFilter]);

  // Competition counts for header stats
  const competitionStats = useMemo(() => {
    const visible = competitions.filter(c => c.visible);
    const active = visible.filter(c => isLive(c.status) && ['nomination', 'voting', 'judging'].includes(c.phase)).length;
    const openingSoon = visible.filter(c => isPublished(c.status)).length;
    return { active, openingSoon };
  }, [competitions]);

  const getOrg = (orgId) => organizations.find(o => o.id === orgId);

  const handleCompetitionClick = (competition) => {
    if (onOpenCompetition) {
      onOpenCompetition(competition);
    }
  };

  if (!isOpen) return null;

  // ============================================
  // COMPETITION CARD - Modern, Instagram-style
  // ============================================
  const CompetitionCard = ({ competition }) => {
    const isHovered = hoveredCard === competition.id;
    const displayPhase = competition.accessible ? competition.phase : competition.status;
    const config = getPhaseDisplayConfig(displayPhase);
    const isClickable = competition.accessible || isPublished(competition.status);
    const cityImage = getCityImage(competition.city);
    const org = getOrg(competition.organizationId);

    const getCtaText = () => {
      if (isPublished(competition.status)) return 'Coming Soon';
      if (competition.phase === 'nomination') return 'Nominate';
      if (competition.phase === 'voting') return 'Vote Now';
      if (competition.phase === 'completed') return 'View Winners';
      return 'View';
    };

    return (
      <div
        onClick={() => handleCompetitionClick(competition)}
        onMouseEnter={() => setHoveredCard(competition.id)}
        onMouseLeave={() => setHoveredCard(null)}
        style={{
          position: 'relative',
          borderRadius: isMobile ? borderRadius.xxl : borderRadius.xl,
          overflow: 'hidden',
          cursor: isClickable ? 'pointer' : 'default',
          transform: isHovered && isClickable ? 'translateY(-8px) scale(1.01)' : 'translateY(0) scale(1)',
          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: isHovered
            ? '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(212, 175, 55, 0.2)'
            : '0 10px 30px -10px rgba(0, 0, 0, 0.3)',
          aspectRatio: isMobile ? '16/10' : '16/9',
          background: colors.background.card,
        }}
      >
        {/* Background Image */}
        <div style={{
          ...styleHelpers.absoluteFill,
          backgroundImage: `url(${cityImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: isHovered ? 'scale(1.08)' : 'scale(1)',
        }} />

        {/* Gradient Overlay */}
        <div style={{
          ...styleHelpers.absoluteFill,
          background: isMobile
            ? 'linear-gradient(0deg, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.1) 100%)'
            : 'linear-gradient(0deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.15) 100%)',
          transition: 'opacity 0.3s',
          opacity: isHovered ? 0.9 : 1,
        }} />

        {/* Shine effect on hover */}
        {isHovered && (
          <div style={{
            ...styleHelpers.absoluteFill,
            background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.03) 45%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.03) 55%, transparent 60%)',
            animation: 'shine 1.5s ease-in-out',
          }} />
        )}

        {/* Content */}
        <div style={{
          position: 'relative',
          height: '100%',
          padding: isMobile ? spacing.lg : spacing.xl,
          display: 'flex',
          flexDirection: 'column',
        }}>
          {/* Top Row */}
          <div style={{ ...styleHelpers.flexBetween }}>
            <Badge variant={config.variant} size={isMobile ? 'sm' : 'md'} pill dot={config.pulse}>
              {config.label}
            </Badge>
            {org && (
              <div style={{
                width: isMobile ? '36px' : '40px',
                height: isMobile ? '36px' : '40px',
                borderRadius: borderRadius.lg,
                background: 'rgba(255,255,255,0.15)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                ...styleHelpers.flexCenter,
                transition: 'transform 0.3s, background 0.3s',
                transform: isHovered ? 'scale(1.1)' : 'scale(1)',
              }}>
                <OrganizationLogo logo={org.logo_url || org.logo} size={isMobile ? 28 : 32} />
              </div>
            )}
          </div>

          {/* Bottom Content */}
          <div style={{ marginTop: 'auto' }}>
            {org && (
              <p style={{
                fontSize: typography.fontSize.xs,
                color: colors.gold.primary,
                fontWeight: typography.fontWeight.medium,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginBottom: spacing.xs,
                opacity: 0.9,
              }}>
                {org.name}
              </p>
            )}

            <h3 style={{
              fontSize: isMobile ? typography.fontSize.xl : typography.fontSize['2xl'],
              fontWeight: typography.fontWeight.bold,
              color: colors.text.primary,
              marginBottom: spacing.sm,
              lineHeight: typography.lineHeight.tight,
              textShadow: '0 2px 10px rgba(0,0,0,0.3)',
            }}>
              {competition.name}
            </h3>

            <div style={{
              ...styleHelpers.flexStart,
              gap: spacing.lg,
              marginBottom: spacing.md,
            }}>
              <div style={{ ...styleHelpers.flexStart, gap: spacing.xs }}>
                <MapPin size={14} style={{ color: colors.gold.primary }} />
                <span style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>
                  {competition.city}
                </span>
              </div>
              <div style={{ ...styleHelpers.flexStart, gap: spacing.xs }}>
                <Calendar size={14} style={{ color: colors.text.secondary }} />
                <span style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>
                  Season {competition.season}
                </span>
              </div>
            </div>

            {/* CTA Button */}
            {isClickable && (
              <div style={{
                ...styleHelpers.flexCenter,
                gap: spacing.sm,
                padding: `${spacing.sm} ${spacing.lg}`,
                background: isHovered ? colors.gold.primary : 'rgba(212, 175, 55, 0.15)',
                border: `1.5px solid ${colors.gold.primary}`,
                borderRadius: borderRadius.lg,
                color: isHovered ? colors.text.inverse : colors.gold.primary,
                fontSize: typography.fontSize.sm,
                fontWeight: typography.fontWeight.semibold,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                width: 'fit-content',
                transform: isHovered ? 'translateX(4px)' : 'translateX(0)',
              }}>
                {competition.phase === 'voting' && <Play size={14} />}
                {getCtaText()}
                <ArrowRight size={14} style={{
                  transition: 'transform 0.3s',
                  transform: isHovered ? 'translateX(4px)' : 'translateX(0)',
                }} />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // FILTER BAR - Clean, minimal
  // ============================================
  const FilterBar = () => (
    <div style={{
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.md,
      marginBottom: spacing.xl,
      padding: isMobile ? `0 ${spacing.lg}` : 0,
      flexWrap: 'wrap',
    }}>
      {/* Status Pills */}
      <div style={{
        display: 'flex',
        gap: spacing.sm,
        overflowX: 'auto',
        paddingBottom: isMobile ? spacing.sm : 0,
        ...styleHelpers.hideScrollbar,
      }}>
        {[
          { id: 'active', label: 'Live', dot: true },
          { id: 'upcoming', label: 'Coming Soon' },
          { id: 'complete', label: 'Completed' },
        ].map((filter) => (
          <button
            key={filter.id}
            onClick={() => setStatusFilter(filter.id)}
            style={{
              ...styleHelpers.flexCenter,
              gap: spacing.xs,
              padding: `${spacing.sm} ${spacing.lg}`,
              background: statusFilter === filter.id ? colors.gold.muted : 'transparent',
              border: statusFilter === filter.id ? `1.5px solid ${colors.gold.primary}` : `1px solid ${colors.border.primary}`,
              borderRadius: borderRadius.pill,
              color: statusFilter === filter.id ? colors.gold.primary : colors.text.secondary,
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.medium,
              cursor: 'pointer',
              transition: `all ${transitions.fast}`,
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {filter.dot && statusFilter === filter.id && (
              <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: colors.status.success,
                animation: 'pulse 2s infinite',
              }} />
            )}
            {filter.label}
          </button>
        ))}
      </div>

      {/* City Filter */}
      {availableCities.length > 1 && (
        <select
          value={cityFilter}
          onChange={(e) => setCityFilter(e.target.value)}
          style={{
            padding: `${spacing.sm} ${spacing.lg}`,
            background: colors.background.card,
            border: `1px solid ${colors.border.primary}`,
            borderRadius: borderRadius.lg,
            color: colors.text.primary,
            fontSize: typography.fontSize.sm,
            cursor: 'pointer',
            outline: 'none',
            minWidth: '140px',
          }}
        >
          <option value="all">All Cities</option>
          {availableCities.map(city => (
            <option key={city.id} value={city.id}>{city.name}</option>
          ))}
        </select>
      )}
    </div>
  );

  // ============================================
  // HALL OF WINNERS - Champions showcase
  // ============================================
  const HallOfWinners = () => {
    // Use dynamic data from app settings
    const winners = hallOfWinnersData?.winners || [];
    const year = hallOfWinnersData?.year || new Date().getFullYear();
    if (!winners.length) return null;

    return (
      <div style={{
        maxWidth: '900px',
        margin: '0 auto',
        marginTop: spacing.xxxl,
        marginBottom: spacing.xxxl,
        padding: spacing.xl,
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: borderRadius.xl,
        border: `1px solid rgba(255, 255, 255, 0.1)`,
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: spacing.md,
          marginBottom: spacing.xl,
        }}>
          <EliteRankCrown size={28} />
          <div>
            <p style={{
              fontSize: typography.fontSize.xs,
              color: colors.text.muted,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '2px',
            }}>
              ELITES
            </p>
            <h2 style={{
              fontSize: isMobile ? typography.fontSize.lg : typography.fontSize.xl,
              fontWeight: typography.fontWeight.bold,
              color: colors.text.primary,
              margin: 0,
            }}>
              Most Eligible {year}
            </h2>
          </div>
        </div>

        {/* Winners Grid */}
        <div style={{
          display: isMobile ? 'flex' : 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: spacing.sm,
        }}>
          {winners.slice(0, 5).map((winner, index) => (
            <div
              key={winner.id}
              style={{
                flex: isMobile ? '0 1 calc(50% - 8px)' : undefined,
                minWidth: isMobile ? '140px' : undefined,
                display: 'flex',
                alignItems: 'center',
                gap: spacing.sm,
                padding: `${spacing.sm} ${spacing.md}`,
                background: 'rgba(0, 0, 0, 0.2)',
                borderRadius: borderRadius.md,
                border: `1px solid rgba(212, 175, 55, 0.15)`,
              }}
            >
              {/* Rank */}
              <div style={{
                width: '22px',
                height: '22px',
                background: 'rgba(212, 175, 55, 0.2)',
                borderRadius: '50%',
                ...styleHelpers.flexCenter,
                flexShrink: 0,
                fontSize: typography.fontSize.xs,
                fontWeight: typography.fontWeight.bold,
                color: colors.gold.primary,
              }}>
                {index + 1}
              </div>

              {/* Profile Image */}
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: colors.background.card,
                border: `2px solid rgba(212, 175, 55, 0.3)`,
                ...styleHelpers.flexCenter,
                flexShrink: 0,
                overflow: 'hidden',
              }}>
                {winner.imageUrl ? (
                  <img
                    src={winner.imageUrl}
                    alt={winner.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <User size={18} style={{ color: colors.text.muted }} />
                )}
              </div>

              {/* Info */}
              <div style={{ minWidth: 0 }}>
                <p style={{
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.semibold,
                  color: colors.text.primary,
                  marginBottom: '1px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {winner.name}
                </p>
                {winner.city && (
                  <p style={{
                    fontSize: typography.fontSize.xs,
                    color: colors.text.muted,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {winner.city}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ============================================
  // RENDER CONTENT
  // ============================================
  const renderContent = () => {
    if (loading) {
      return (
        <div style={{
          ...styleHelpers.flexCenter,
          flexDirection: 'column',
          minHeight: '60vh',
          gap: spacing.lg,
        }}>
          <Loader size={32} style={{ animation: 'spin 1s linear infinite', color: colors.gold.primary }} />
          <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.md }}>Loading...</p>
        </div>
      );
    }

    const contentPadding = isMobile ? spacing.lg : spacing.xxl;

    switch (activeTab) {
      case 'competitions':
        return (
          <div style={{ padding: contentPadding, paddingBottom: isMobile ? '100px' : contentPadding }}>
            {/* Hero */}
            <div style={{
              textAlign: 'center',
              maxWidth: '700px',
              margin: '0 auto',
              marginBottom: spacing.xl,
              padding: isMobile ? `${spacing.lg} 0` : `${spacing.xl} 0`,
            }}>
              {/* Animated Crown */}
              {showCrownAnimation && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  marginBottom: spacing.xl,
                }}>
                  <div style={{
                    animation: 'crownDrop 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
                  }}>
                    <EliteRankCrown size={isMobile ? 64 : 80} />
                  </div>
                </div>
              )}

              {/* Season Status Badge - matches card styling */}
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: spacing.sm,
                padding: `${spacing.md} ${spacing.lg}`,
                background: 'rgba(39, 39, 42, 0.5)',
                borderRadius: borderRadius.xl,
                border: '1px solid #3f3f46',
                marginBottom: isMobile ? spacing.lg : spacing.xl,
              }}>
                <span style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: colors.gold.primary,
                  animation: 'pulse 2s infinite',
                }} />
                <span style={{
                  fontSize: typography.fontSize.sm,
                  color: '#d4d4d8',
                  fontWeight: typography.fontWeight.medium,
                }}>
                  Season {new Date().getFullYear()} · {competitionStats.active} Active Competition{competitionStats.active !== 1 ? 's' : ''} · {competitionStats.openingSoon} Opening Soon
                </span>
              </div>

              {/* Main Headline */}
              <h1 style={{
                fontSize: isMobile ? '2rem' : '3rem',
                fontWeight: typography.fontWeight.bold,
                lineHeight: 1.15,
                marginBottom: isMobile ? spacing.sm : spacing.md,
              }}>
                <span style={{
                  display: 'block',
                  background: 'linear-gradient(90deg, #f5d485, #d4af37)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}>
                  Where the Best Get Recognized
                </span>
              </h1>

              {/* Subheadline */}
              <p style={{
                fontSize: isMobile ? typography.fontSize.md : typography.fontSize.lg,
                marginBottom: isMobile ? spacing.md : spacing.lg,
              }}>
                <span style={{ color: '#a1a1aa' }}>Climb the Ranks. </span>
                <span style={{ color: '#ffffff', fontWeight: typography.fontWeight.semibold }}>Become an Elite.</span>
              </p>

              {/* Card */}
              <div style={{
                display: 'inline-block',
                background: 'rgba(39, 39, 42, 0.5)',
                borderRadius: borderRadius.xl,
                border: '1px solid #3f3f46',
                padding: `${spacing.md} ${spacing.xl}`,
                marginBottom: isMobile ? spacing.md : spacing.lg,
              }}>
                <span style={{ color: '#a1a1aa', fontSize: isMobile ? typography.fontSize.md : typography.fontSize.lg, display: 'block' }}>
                  Think you're elite?
                </span>
                <span style={{
                  color: '#d4af37',
                  fontWeight: typography.fontWeight.bold,
                  fontSize: isMobile ? typography.fontSize.md : typography.fontSize.lg,
                  display: 'block',
                }}>
                  Prove it.
                </span>
              </div>

              {/* Action Line */}
              <p style={{
                fontSize: isMobile ? typography.fontSize.xl : '1.5rem',
                fontWeight: typography.fontWeight.bold,
                color: '#ffffff',
                marginBottom: isMobile ? spacing.sm : spacing.md,
              }}>
                Enter <span style={{ color: '#d4af37' }}>·</span> Compete <span style={{ color: '#d4af37' }}>·</span> Win
              </p>

              {/* Subtext */}
              <p style={{
                fontSize: isMobile ? typography.fontSize.sm : typography.fontSize.md,
                color: '#71717a',
              }}>
                Fans decide who win
              </p>
            </div>

            <FilterBar />

            {/* Competition Grid */}
            {visibleCompetitions.length > 0 ? (
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'center',
                gap: isMobile ? spacing.lg : spacing.xl,
                maxWidth: '1400px',
                margin: '0 auto',
              }}>
                {visibleCompetitions.map((comp) => (
                  <div key={comp.id} style={{
                    flex: isMobile ? '1 1 100%' : isTablet ? '1 1 calc(50% - 16px)' : '1 1 380px',
                    maxWidth: isMobile ? '100%' : isTablet ? 'calc(50% - 16px)' : '500px',
                  }}>
                    <CompetitionCard competition={comp} />
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                ...styleHelpers.flexCenter,
                flexDirection: 'column',
                padding: spacing.xxxl,
                background: colors.background.card,
                borderRadius: borderRadius.xl,
                border: `1px solid ${colors.border.primary}`,
                textAlign: 'center',
              }}>
                <Crown size={48} style={{ color: colors.text.muted, marginBottom: spacing.lg }} />
                <h3 style={{ fontSize: typography.fontSize.xl, color: colors.text.primary, marginBottom: spacing.sm }}>
                  No competitions found
                </h3>
                <p style={{ color: colors.text.secondary, marginBottom: spacing.lg }}>
                  Try adjusting your filters or check back soon.
                </p>
                {cityFilter !== 'all' && (
                  <Button variant="outline" size="sm" onClick={() => { setStatusFilter('active'); setCityFilter('all'); }}>
                    Clear Filters
                  </Button>
                )}
              </div>
            )}

            <HallOfWinners />
          </div>
        );

      case 'events':
        // Use string comparison to avoid timezone issues
        const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD format in local time
        const upcomingEvents = events.filter(e => e.date >= todayStr).sort((a, b) => new Date(a.date) - new Date(b.date));
        const pastEvents = events.filter(e => e.date < todayStr).sort((a, b) => new Date(b.date) - new Date(a.date));

        const formatTime12h = (timeStr) => {
          if (!timeStr) return '';
          const [hours, minutes] = timeStr.split(':').map(Number);
          const period = hours >= 12 ? 'PM' : 'AM';
          const displayHour = hours % 12 || 12;
          return `${displayHour}:${String(minutes).padStart(2, '0')} ${period} CST`;
        };

        const renderEventCard = (event, isPast = false) => (
          <div key={event.id} style={{
            background: colors.background.card,
            border: `1px solid ${colors.border.primary}`,
            borderRadius: borderRadius.xxl,
            overflow: 'hidden',
            opacity: isPast ? 0.7 : 1,
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}>
            {/* Cover Image */}
            <div style={{
              width: '100%',
              height: '180px',
              background: event.image_url
                ? `url(${event.image_url}) center/cover no-repeat`
                : 'linear-gradient(135deg, rgba(212,175,55,0.15) 0%, rgba(139,92,246,0.1) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}>
              {!event.image_url && (
                <Crown size={48} style={{ color: 'rgba(212,175,55,0.4)' }} />
              )}
              {/* Date badge overlay */}
              <div style={{
                position: 'absolute',
                top: spacing.md,
                right: spacing.md,
                background: 'rgba(10,10,15,0.85)',
                backdropFilter: 'blur(8px)',
                borderRadius: borderRadius.lg,
                padding: `${spacing.sm} ${spacing.md}`,
                textAlign: 'center',
                minWidth: '56px',
              }}>
                <div style={{ fontSize: typography.fontSize.xs, color: colors.gold.primary, fontWeight: typography.fontWeight.bold, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {new Date(event.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short' })}
                </div>
                <div style={{ fontSize: typography.fontSize.xxl, fontWeight: typography.fontWeight.bold, color: colors.text.primary, lineHeight: 1 }}>
                  {new Date(event.date + 'T00:00:00').getDate()}
                </div>
              </div>
              {isPast && (
                <div style={{
                  position: 'absolute',
                  top: spacing.md,
                  left: spacing.md,
                  background: 'rgba(255,255,255,0.15)',
                  backdropFilter: 'blur(8px)',
                  borderRadius: borderRadius.md,
                  padding: `${spacing.xs} ${spacing.sm}`,
                  fontSize: typography.fontSize.xs,
                  color: colors.text.secondary,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}>
                  Past Event
                </div>
              )}
            </div>

            {/* Card Body */}
            <div style={{ padding: spacing.xl }}>
              {/* Competition badge */}
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: spacing.xs,
                padding: `${spacing.xs} ${spacing.sm}`,
                background: 'rgba(212,175,55,0.1)',
                border: `1px solid rgba(212,175,55,0.2)`,
                borderRadius: borderRadius.md,
                marginBottom: spacing.md,
              }}>
                <Crown size={12} style={{ color: colors.gold.primary }} />
                <span style={{ fontSize: typography.fontSize.xs, color: colors.gold.primary, fontWeight: typography.fontWeight.medium }}>
                  {event.competitionName || 'Elite Rank'} {event.cityName && event.cityName !== 'Unknown' ? `\u2022 ${event.cityName}` : ''}
                </span>
              </div>

              <h3 style={{
                fontSize: typography.fontSize.xl,
                fontWeight: typography.fontWeight.bold,
                color: colors.text.primary,
                marginBottom: spacing.sm,
              }}>
                {event.name}
              </h3>

              {event.description && (
                <p style={{
                  color: colors.text.secondary,
                  fontSize: typography.fontSize.sm,
                  lineHeight: 1.5,
                  marginBottom: spacing.lg,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}>
                  {event.description}
                </p>
              )}

              {/* Meta info */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm, marginBottom: event.ticket_url && !isPast ? spacing.lg : 0 }}>
                {event.time && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, color: colors.text.secondary, fontSize: typography.fontSize.sm }}>
                    <Clock size={14} style={{ flexShrink: 0 }} />
                    <span>{formatTime12h(event.time)}</span>
                  </div>
                )}
                {event.location && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, color: colors.text.secondary, fontSize: typography.fontSize.sm }}>
                    <MapPin size={14} style={{ flexShrink: 0 }} />
                    <span>{event.location}</span>
                  </div>
                )}
              </div>

              {/* Ticket link */}
              {event.ticket_url && !isPast && (
                <a
                  href={event.ticket_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: spacing.sm,
                    padding: `${spacing.md} ${spacing.xl}`,
                    background: `linear-gradient(135deg, ${colors.gold.primary}, ${colors.gold.light || '#f4d03f'})`,
                    color: '#0a0a0f',
                    borderRadius: borderRadius.lg,
                    fontSize: typography.fontSize.sm,
                    fontWeight: typography.fontWeight.bold,
                    textDecoration: 'none',
                    marginTop: spacing.lg,
                  }}
                >
                  Get Tickets
                  <ExternalLink size={14} />
                </a>
              )}
            </div>
          </div>
        );

        return (
          <div style={{ padding: contentPadding, paddingBottom: isMobile ? '100px' : contentPadding, maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: spacing.xxxl }}>
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                marginBottom: spacing.lg,
              }}>
                <div style={{
                  animation: 'crownFloat 3s ease-in-out infinite, crownGlow 2s ease-in-out infinite',
                }}>
                  <EliteRankCrown size={isMobile ? 64 : 80} />
                </div>
              </div>
              <h2 style={{ fontSize: typography.fontSize['3xl'], fontWeight: typography.fontWeight.bold, color: colors.text.primary, marginBottom: spacing.sm }}>Events</h2>
              <p style={{ color: colors.text.secondary }}>Exclusive events across all competitions</p>
            </div>

            {upcomingEvents.length > 0 && (
              <div style={{ marginBottom: spacing.xxxl }}>
                <h3 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, color: colors.text.primary, marginBottom: spacing.lg }}>
                  Upcoming
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(320px, 1fr))', gap: spacing.xl }}>
                  {upcomingEvents.map(event => renderEventCard(event))}
                </div>
              </div>
            )}

            {pastEvents.length > 0 && (
              <div>
                <h3 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, color: colors.text.secondary, marginBottom: spacing.lg }}>Past Events</h3>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(320px, 1fr))', gap: spacing.xl }}>
                  {pastEvents.slice(0, 6).map(event => renderEventCard(event, true))}
                </div>
              </div>
            )}

            {events.length === 0 && (
              <div style={{ ...styleHelpers.flexCenter, flexDirection: 'column', padding: spacing.xxxl, textAlign: 'center' }}>
                <div style={{ marginBottom: spacing.lg, opacity: 0.5 }}>
                  <EliteRankCrown size={48} />
                </div>
                <p style={{ color: colors.text.secondary }}>No events scheduled yet</p>
              </div>
            )}
          </div>
        );

      case 'announcements':
        return (
          <div style={{ padding: contentPadding, paddingBottom: isMobile ? '100px' : contentPadding, maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: spacing.xxxl }}>
              <div style={{
                width: '64px',
                height: '64px',
                background: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
                borderRadius: borderRadius.xl,
                ...styleHelpers.flexCenter,
                margin: '0 auto',
                marginBottom: spacing.lg,
              }}>
                <Megaphone size={32} style={{ color: '#000' }} />
              </div>
              <h2 style={{ fontSize: typography.fontSize['3xl'], fontWeight: typography.fontWeight.bold, color: colors.text.primary, marginBottom: spacing.sm }}>News</h2>
              <p style={{ color: colors.text.secondary }}>Latest updates from Elite Rank</p>
            </div>

            {announcements.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
                {announcements.map(a => (
                  <article key={a.id} style={{
                    background: colors.background.card,
                    border: a.pinned ? `2px solid ${colors.gold.primary}` : `1px solid ${colors.border.primary}`,
                    borderRadius: borderRadius.xl,
                    padding: spacing.xl,
                  }}>
                    <div style={{ ...styleHelpers.flexBetween, marginBottom: spacing.md }}>
                      <Badge variant="info" size="xs">{a.cityName}</Badge>
                      <span style={{ fontSize: typography.fontSize.xs, color: colors.text.muted }}>
                        {new Date(a.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                    <h3 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, color: colors.text.primary, marginBottom: spacing.sm }}>{a.title}</h3>
                    <p style={{ fontSize: typography.fontSize.md, color: colors.text.secondary, lineHeight: typography.lineHeight.relaxed }}>{a.content}</p>
                  </article>
                ))}
              </div>
            ) : (
              <div style={{ ...styleHelpers.flexCenter, flexDirection: 'column', padding: spacing.xxxl, textAlign: 'center' }}>
                <Megaphone size={48} style={{ color: colors.text.muted, marginBottom: spacing.lg }} />
                <p style={{ color: colors.text.secondary }}>No announcements yet</p>
              </div>
            )}
          </div>
        );

      case 'opportunities':
        const joinOptions = [
          {
            id: 'compete',
            icon: Trophy,
            title: 'Compete',
            desc: "You've got what it takes. Enter a competition, rally your network, and let the crowd decide. Every vote you earn puts money in your pocket.",
            color: colors.gold.primary,
            hoverBg: `${colors.gold.primary}08`,
            cta: 'Apply to compete',
            action: () => setActiveTab('competitions'),
          },
          {
            id: 'vote',
            icon: Heart,
            title: 'Vote',
            desc: "Know someone who deserves the spotlight? Back them with your vote. Follow their journey. Be part of their rise.",
            color: colors.accent.pink,
            hoverBg: `${colors.accent.pink}08`,
            cta: 'Browse competitions',
            action: () => setActiveTab('competitions'),
          },
          {
            id: 'partner',
            icon: Building,
            title: 'Partner',
            desc: "Host a competition as a category expert, sponsor a competition by contributing prizes for the winners, or bring EliteRank to your organization and launch a competition for your community. Let's build something together.",
            color: '#10b981',
            hoverBg: 'rgba(16, 185, 129, 0.08)',
            cta: 'Start a conversation',
            action: () => window.location.href = 'mailto:hello@eliterank.com?subject=Partnership%20Inquiry',
          },
        ];

        return (
          <div style={{ padding: contentPadding, paddingBottom: isMobile ? '100px' : contentPadding, maxWidth: '1000px', margin: '0 auto' }}>
            {/* Hero Section */}
            <div style={{ textAlign: 'center', marginBottom: spacing.xxxl, padding: isMobile ? `${spacing.xl} 0` : `${spacing.xxl} 0` }}>
              <h2 style={{
                fontSize: isMobile ? typography.fontSize['3xl'] : typography.fontSize['4xl'],
                fontWeight: typography.fontWeight.bold,
                color: colors.text.primary,
                marginBottom: spacing.md,
                lineHeight: typography.lineHeight.tight,
              }}>
                Rank Is <span style={{ color: colors.gold.primary }}>Earned</span>
              </h2>
              <p style={{
                fontSize: isMobile ? typography.fontSize.md : typography.fontSize.lg,
                color: colors.text.secondary,
                lineHeight: typography.lineHeight.relaxed,
                maxWidth: '600px',
                margin: '0 auto',
              }}>
                Competitors enter the ranks. Voters decide who rises. Partners make the elite shine.
              </p>
            </div>

            {/* Three Cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
              gap: spacing.lg,
              marginBottom: spacing.xxxl,
            }}>
              {joinOptions.map(option => (
                <div
                  key={option.id}
                  style={{
                    background: colors.background.card,
                    border: `1px solid ${colors.border.primary}`,
                    borderRadius: borderRadius.xl,
                    padding: spacing.xl,
                    transition: `all ${transitions.normal}`,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = option.color;
                    e.currentTarget.style.background = option.hoverBg;
                    e.currentTarget.style.transform = 'translateY(-4px)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = colors.border.primary;
                    e.currentTarget.style.background = colors.background.card;
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                  onClick={option.action}
                >
                  {/* Icon */}
                  <div style={{
                    width: '48px',
                    height: '48px',
                    background: `${option.color}15`,
                    borderRadius: borderRadius.lg,
                    ...styleHelpers.flexCenter,
                    marginBottom: spacing.lg,
                  }}>
                    <option.icon size={24} style={{ color: option.color }} />
                  </div>

                  {/* Title */}
                  <h3 style={{
                    fontSize: typography.fontSize.xl,
                    fontWeight: typography.fontWeight.bold,
                    color: colors.text.primary,
                    marginBottom: spacing.sm,
                  }}>
                    {option.title}
                  </h3>

                  {/* Description */}
                  <p style={{
                    fontSize: typography.fontSize.sm,
                    color: colors.text.secondary,
                    lineHeight: typography.lineHeight.relaxed,
                    marginBottom: spacing.lg,
                  }}>
                    {option.desc}
                  </p>

                  {/* Spacer */}
                  <div style={{ flex: 1 }} />

                  {/* Arrow CTA */}
                  <div style={{
                    ...styleHelpers.flexStart,
                    gap: spacing.sm,
                    color: option.color,
                    fontSize: typography.fontSize.sm,
                    fontWeight: typography.fontWeight.medium,
                    marginTop: 'auto',
                  }}>
                    {option.cta}
                    <ArrowRight size={16} style={{ transition: 'transform 0.2s' }} />
                  </div>
                </div>
              ))}
            </div>

          </div>
        );

      case 'about':
        return (
          <div style={{ padding: contentPadding, paddingBottom: isMobile ? '100px' : contentPadding, maxWidth: '900px', margin: '0 auto' }}>
            {/* Hero Section */}
            <div style={{ textAlign: 'center', marginBottom: spacing.xxxl }}>
              <div style={{
                width: '64px',
                height: '64px',
                background: gradients.gold,
                borderRadius: borderRadius.xl,
                ...styleHelpers.flexCenter,
                margin: '0 auto',
                marginBottom: spacing.lg,
              }}>
                <Crown size={32} style={{ color: '#000' }} />
              </div>
              <h2 style={{ fontSize: typography.fontSize['3xl'], fontWeight: typography.fontWeight.bold, color: colors.text.primary, marginBottom: spacing.lg }}>About EliteRank</h2>
              <p style={{ color: colors.text.secondary, lineHeight: typography.lineHeight.relaxed, fontSize: typography.fontSize.md, marginBottom: spacing.lg }}>
                EliteRank is a social competition platform where public voting determines who ranks at the top across categories that matter — from dating to creators and more. Elites are nominated, accepted by the host then begin rally support, campaign for a chance to win while building their fan base.
              </p>
              <p style={{ color: colors.text.tertiary, lineHeight: typography.lineHeight.relaxed, fontSize: typography.fontSize.sm, fontStyle: 'italic' }}>
                Think American Idol meets GoFundMe — bracket-style tournaments where your network becomes your campaign team, the crowd decides who rises, and every vote puts money in your pocket.
              </p>
            </div>

            {/* Mission Section */}
            <div style={{
              background: colors.background.card,
              border: `1px solid ${colors.gold.primary}40`,
              borderRadius: borderRadius.xl,
              padding: spacing.xl,
              textAlign: 'center',
              marginBottom: spacing.xxxl,
            }}>
              <h3 style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.semibold, color: colors.gold.primary, marginBottom: spacing.md }}>Our Mission</h3>
              <p style={{ color: colors.text.secondary, lineHeight: typography.lineHeight.relaxed, fontSize: typography.fontSize.lg }}>
                To spotlight and reward exceptional people backed by public opinion.
              </p>
            </div>

            {/* How It Works */}
            <div style={{ marginBottom: spacing.xxxl }}>
              <h3 style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.semibold, color: colors.text.primary, marginBottom: spacing.xl, textAlign: 'center' }}>How It Works</h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
                gap: spacing.lg,
              }}>
                {[
                  { step: '1', title: 'Enter', desc: 'Apply directly or accept a nomination to compete' },
                  { step: '2', title: 'Compete', desc: 'Rally your network, promote your profile, and gather votes each round' },
                  { step: '3', title: 'Win', desc: 'Winners take home a piece of the cash prize pool, the title, sponsored prizes, exposure and more' },
                ].map(item => (
                  <div key={item.step} style={{
                    background: colors.background.card,
                    border: `1px solid ${colors.border.primary}`,
                    borderRadius: borderRadius.xl,
                    padding: spacing.xl,
                    textAlign: 'center',
                  }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      background: colors.gold.primary,
                      borderRadius: borderRadius.full,
                      ...styleHelpers.flexCenter,
                      margin: '0 auto',
                      marginBottom: spacing.md,
                      fontSize: typography.fontSize.xl,
                      fontWeight: typography.fontWeight.bold,
                      color: colors.text.inverse,
                    }}>{item.step}</div>
                    <h4 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, color: colors.text.primary, marginBottom: spacing.sm }}>{item.title}</h4>
                    <p style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary, lineHeight: typography.lineHeight.relaxed }}>{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Why Compete & Who Competes */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
              gap: spacing.lg,
              marginBottom: spacing.xxxl,
            }}>
              <div style={{
                background: colors.background.card,
                border: `1px solid ${colors.border.primary}`,
                borderRadius: borderRadius.xl,
                padding: spacing.xl,
              }}>
                <h4 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, color: colors.gold.primary, marginBottom: spacing.md }}>Why Compete?</h4>
                <p style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary, lineHeight: typography.lineHeight.relaxed }}>
                  This isn't about a trophy. It's about proving publicly that people believe in you — and getting paid to do it. Every vote is someone putting money behind your name. Win or lose, you build your brand and walk away with earnings.
                </p>
              </div>
              <div style={{
                background: colors.background.card,
                border: `1px solid ${colors.border.primary}`,
                borderRadius: borderRadius.xl,
                padding: spacing.xl,
              }}>
                <h4 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, color: colors.gold.primary, marginBottom: spacing.md }}>Who Competes?</h4>
                <p style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary, lineHeight: typography.lineHeight.relaxed }}>
                  Anyone confident enough to put themselves forward and ambitious enough to rally support. If you've ever been told you're exceptional, EliteRank is where you prove it and profit from it.
                </p>
              </div>
            </div>

            {/* CTA Section */}
            <div style={{
              background: `linear-gradient(135deg, ${colors.gold.primary}20, ${colors.gold.primary}05)`,
              border: `1px solid ${colors.gold.primary}60`,
              borderRadius: borderRadius.xl,
              padding: spacing.xxl,
              textAlign: 'center',
              marginBottom: spacing.xxxl,
            }}>
              <h3 style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: colors.text.primary, marginBottom: spacing.lg }}>Ready to Compete?</h3>
              <div style={{ ...styleHelpers.flexCenter, flexWrap: 'wrap', gap: spacing.md }}>
                <Button variant="primary" size="md" onClick={() => setActiveTab('competitions')}>Enter a Competition</Button>
                <Button variant="outline" size="md" onClick={() => setActiveTab('competitions')}>Nominate Someone</Button>
              </div>
              <button
                onClick={() => setActiveTab('competitions')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: colors.text.secondary,
                  fontSize: typography.fontSize.sm,
                  marginTop: spacing.lg,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                See Current Competitions
              </button>
            </div>

            {/* For Partners */}
            <div style={{
              background: colors.background.card,
              border: `1px solid ${colors.border.primary}`,
              borderRadius: borderRadius.xl,
              padding: spacing.xl,
              textAlign: 'center',
            }}>
              <Building size={32} style={{ color: colors.gold.primary, marginBottom: spacing.md }} />
              <h4 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, color: colors.text.primary, marginBottom: spacing.sm }}>For Partners & Brands</h4>
              <p style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary, lineHeight: typography.lineHeight.relaxed, marginBottom: spacing.lg }}>
                Host a competition on EliteRank. Bring your audience, we bring the infrastructure. Sponsors, media partners, and organizations can co-create categories or power competitions around cultural moments.
              </p>
              <Button variant="outline" size="sm" onClick={() => window.location.href = 'mailto:hello@eliterank.com'}>Contact Us</Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // ============================================
  // MAIN LAYOUT
  // ============================================
  return (
    <div style={{
      position: isFullPage ? 'relative' : 'fixed',
      inset: isFullPage ? undefined : 0,
      minHeight: isFullPage ? '100vh' : undefined,
      background: colors.background.primary,
      zIndex: isFullPage ? undefined : 1000,
      overflow: 'auto',
      fontFamily: typography.fontFamily.sans,
    }}>
      {/* Header */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'rgba(10, 10, 12, 0.9)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: `1px solid ${colors.border.secondary}`,
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: `${spacing.md} ${isMobile ? spacing.lg : spacing.xxl}`,
          ...styleHelpers.flexBetween,
        }}>
          {/* Logo */}
          <div style={{ ...styleHelpers.flexStart, gap: spacing.sm }}>
            <EliteRankCrown size={isMobile ? 28 : 36} />
            <span style={{
              fontSize: isMobile ? typography.fontSize.lg : typography.fontSize.xl,
              fontWeight: typography.fontWeight.bold,
            }}>
              <span style={{ color: '#ffffff' }}>Elite</span>
              <span style={{
                background: 'linear-gradient(90deg, #d4af37, #c9a227)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>Rank</span>
            </span>
          </div>

          {/* Desktop Navigation */}
          {!isMobile && (
            <nav style={{ ...styleHelpers.flexStart, gap: spacing.xs }}>
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    ...styleHelpers.flexCenter,
                    gap: spacing.xs,
                    padding: `${spacing.sm} ${spacing.lg}`,
                    background: activeTab === tab.id ? colors.gold.muted : 'transparent',
                    border: 'none',
                    borderRadius: borderRadius.lg,
                    color: activeTab === tab.id ? colors.gold.primary : colors.text.secondary,
                    fontSize: typography.fontSize.sm,
                    fontWeight: typography.fontWeight.medium,
                    cursor: 'pointer',
                    transition: `all ${transitions.fast}`,
                  }}
                >
                  <tab.icon size={16} />
                  {tab.label}
                </button>
              ))}
            </nav>
          )}

          {/* Auth Actions */}
          <div style={{ ...styleHelpers.flexStart, gap: spacing.sm }}>
            <ProfileIcon
              isAuthenticated={isAuthenticated}
              user={user}
              profile={profile}
              onLogin={onLogin}
              onLogout={onLogout}
              onProfile={onProfile}
              onRewards={onRewards}
              onDashboard={hasDashboardAccess ? onDashboard : null}
              hasDashboardAccess={hasDashboardAccess}
              size={isMobile ? 36 : 40}
            />

            {/* TEST PUSH NOTIFICATION BUTTON - REMOVE AFTER TESTING */}
            {isAuthenticated && user?.id && (
              <button
                onClick={async () => {
                  try {
                    const response = await fetch('/api/notifications/send', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        userIds: [user.id],
                        title: '🎉 Test Notification',
                        message: 'Push notifications are working!',
                        url: 'https://eliterank.co'
                      })
                    });
                    const data = await response.json();
                    console.log('Notification sent:', data);
                    alert('Test notification sent! Check your notifications.');
                  } catch (error) {
                    console.error('Error:', error);
                    alert('Error sending notification: ' + error.message);
                  }
                }}
                style={{
                  ...styleHelpers.flexCenter,
                  width: isMobile ? '36px' : '40px',
                  height: isMobile ? '36px' : '40px',
                  background: colors.gold.primary,
                  border: 'none',
                  borderRadius: borderRadius.lg,
                  color: colors.text.inverse,
                  cursor: 'pointer',
                  transition: `all ${transitions.fast}`,
                }}
                title="Test Push Notification"
              >
                <Bell size={18} />
              </button>
            )}
            
            {!isFullPage && (
              <button onClick={onClose} style={{
                background: 'none',
                border: 'none',
                color: colors.text.secondary,
                cursor: 'pointer',
                padding: spacing.sm,
                ...styleHelpers.flexCenter,
              }}>
                <X size={24} />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>{renderContent()}</main>

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <nav style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: components.bottomBar.height,
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          background: 'rgba(10, 10, 12, 0.95)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderTop: `1px solid ${colors.border.secondary}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          zIndex: 100,
        }}>
          {TABS.slice(0, 5).map(tab => {
            const Icon = tab.mobileIcon || tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  ...styleHelpers.flexColumn,
                  ...styleHelpers.flexCenter,
                  gap: '2px',
                  padding: spacing.sm,
                  background: 'none',
                  border: 'none',
                  color: isActive ? colors.gold.primary : colors.text.muted,
                  cursor: 'pointer',
                  transition: `all ${transitions.fast}`,
                  flex: 1,
                }}
              >
                <Icon size={22} />
                <span style={{ fontSize: '10px', fontWeight: isActive ? typography.fontWeight.semibold : typography.fontWeight.normal }}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </nav>
      )}

      {/* Global Styles */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes shine {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes crownDrop {
          0% {
            opacity: 0;
            transform: translateY(-100px) scale(0.3) rotate(-20deg);
          }
          50% {
            opacity: 1;
            transform: translateY(10px) scale(1.2) rotate(5deg);
          }
          70% {
            transform: translateY(-5px) scale(1.1) rotate(-3deg);
          }
          85% {
            transform: translateY(3px) scale(1.05) rotate(1deg);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1) rotate(0deg);
          }
        }
        @keyframes crownGlow {
          0%, 100% {
            filter: drop-shadow(0 0 8px rgba(212, 175, 55, 0.4)) drop-shadow(0 0 20px rgba(212, 175, 55, 0.2));
          }
          50% {
            filter: drop-shadow(0 0 20px rgba(212, 175, 55, 0.8)) drop-shadow(0 0 40px rgba(212, 175, 55, 0.4)) drop-shadow(0 0 60px rgba(212, 175, 55, 0.2));
          }
        }
        @keyframes crownFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: ${colors.border.primary};
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: ${colors.border.focus};
        }
      `}</style>
    </div>
  );
}
