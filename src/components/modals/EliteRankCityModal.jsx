import React, { useState, useEffect, useMemo } from 'react';
import {
  X, Crown, MapPin, Calendar, Trophy, Clock, ChevronRight, Sparkles, Users,
  Activity, Info, Briefcase, Loader, User, Megaphone, Award, Building, Heart,
  Home, Search, Bell, Menu, ArrowRight, Play
} from 'lucide-react';
import { Button, Badge, OrganizationLogo } from '../ui';
import { colors, spacing, borderRadius, typography, shadows, transitions, gradients, components, styleHelpers } from '../../styles/theme';
import { useResponsive } from '../../hooks/useResponsive';
import { supabase } from '../../lib/supabase';
import {
  computeCompetitionPhase,
  isCompetitionVisible,
  isCompetitionAccessible,
  getPhaseDisplayConfig,
  COMPETITION_STATUSES,
  shouldAutoTransitionToLive,
  shouldAutoTransitionToCompleted,
} from '../../utils/competitionPhase';
import { getCityImage } from '../../utils/cityImages';

// Tab configuration
const TABS = [
  { id: 'competitions', label: 'Explore', icon: Crown, mobileIcon: Home },
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
  isAuthenticated = false,
  userRole = 'fan',
  userName,
  onLogout,
}) {
  const { isMobile, isTablet, width } = useResponsive();
  const [activeTab, setActiveTab] = useState('competitions');
  const [hoveredCard, setHoveredCard] = useState(null);
  const [competitions, setCompetitions] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [cities, setCities] = useState([]);
  const [events, setEvents] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('all');
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Fetch data from Supabase
  useEffect(() => {
    const fetchData = async () => {
      if (!supabase) {
        setLoading(false);
        return;
      }

      try {
        const [compsResult, orgsResult, citiesResult, settingsResult, votingRoundsResult, profilesResult, eventsResult, announcementsResult] = await Promise.all([
          supabase.from('competitions').select('*').order('created_at', { ascending: false }),
          supabase.from('organizations').select('*').order('name'),
          supabase.from('cities').select('*').order('name'),
          supabase.from('competition_settings').select('*'),
          supabase.from('voting_rounds').select('*').order('round_order'),
          supabase.from('profiles').select('id, email, first_name, last_name, avatar_url, bio, instagram'),
          supabase.from('events').select('*').order('date', { ascending: true }),
          supabase.from('announcements').select('*').order('published_at', { ascending: false }),
        ]);

        const profilesMap = (profilesResult.data || []).reduce((acc, p) => { acc[p.id] = p; return acc; }, {});
        const citiesData = citiesResult.data || [];
        setCities(citiesData);
        const citiesMap = citiesData.reduce((acc, c) => { acc[c.id] = c; return acc; }, {});
        const settingsMap = (settingsResult.data || []).reduce((acc, s) => { acc[s.competition_id] = s; return acc; }, {});
        // Group voting rounds by competition_id
        const votingRoundsMap = (votingRoundsResult.data || []).reduce((acc, r) => {
          if (!acc[r.competition_id]) acc[r.competition_id] = [];
          acc[r.competition_id].push(r);
          return acc;
        }, {});

        // Auto-transitions
        const toTransition = [];
        for (const comp of (compsResult.data || [])) {
          const settings = settingsMap[comp.id];
          if (shouldAutoTransitionToLive(comp, settings)) {
            toTransition.push({ id: comp.id, newStatus: 'live' });
          } else if (shouldAutoTransitionToCompleted(comp, settings)) {
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
            // Merge settings and voting rounds for phase calculation
            const settings = settingsMap[comp.id] || {};
            const compWithSettings = {
              ...comp,
              nomination_start: settings.nomination_start || comp.nomination_start,
              nomination_end: settings.nomination_end || comp.nomination_end,
              voting_start: settings.voting_start || comp.voting_start,
              voting_end: settings.voting_end || comp.voting_end,
              finals_date: settings.finale_date || comp.finals_date,
              voting_rounds: votingRoundsMap[comp.id] || [],
            };
            const computedPhase = computeCompetitionPhase(compWithSettings);
            const visible = isCompetitionVisible(comp.status);
            const accessible = isCompetitionAccessible(comp.status);
            const cityFromLookup = citiesMap[comp.city_id];
            const cityName = comp.city || cityFromLookup?.name || 'Unknown City';
            const hostProfile = comp.host_id ? profilesMap[comp.host_id] : null;

            return {
              id: comp.id,
              name: comp.name || `Most Eligible ${cityName}`,
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
            };
          }));
        }

        if (orgsResult.data) setOrganizations(orgsResult.data);

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

    if (isOpen) fetchData();
  }, [isOpen]);

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
        return c.status === COMPETITION_STATUSES.LIVE && ['nomination', 'voting', 'judging'].includes(c.phase);
      }
      if (statusFilter === 'upcoming') return c.status === COMPETITION_STATUSES.PUBLISH;
      if (statusFilter === 'complete') return c.status === COMPETITION_STATUSES.COMPLETED || c.phase === 'completed';
      return true;
    });
  }, [competitions, cityFilter, statusFilter]);

  const getOrg = (orgId) => organizations.find(o => o.id === orgId);

  const handleCompetitionClick = (competition) => {
    const org = getOrg(competition.organizationId);
    const competitionWithOrg = {
      ...competition,
      organization: org ? { id: org.id, name: org.name, logo_url: org.logo_url || org.logo, slug: org.slug } : null,
    };

    if (competition.accessible && onOpenCompetition) {
      onOpenCompetition(competitionWithOrg);
    } else if (competition.status === COMPETITION_STATUSES.PUBLISH) {
      onOpenTeaser ? onOpenTeaser(competitionWithOrg) : onOpenCompetition?.({ ...competitionWithOrg, isTeaser: true });
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
    const isClickable = competition.accessible || competition.status === COMPETITION_STATUSES.PUBLISH;
    const cityImage = getCityImage(competition.city);
    const org = getOrg(competition.organizationId);

    const getCtaText = () => {
      if (competition.status === COMPETITION_STATUSES.PUBLISH) return 'Coming Soon';
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
      alignItems: isMobile ? 'stretch' : 'center',
      gap: spacing.md,
      marginBottom: spacing.xl,
      padding: isMobile ? `0 ${spacing.lg}` : 0,
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
          { id: 'all', label: 'All' },
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
              maxWidth: '600px',
              margin: '0 auto',
              marginBottom: spacing.xxl,
              padding: isMobile ? `${spacing.xl} 0` : `${spacing.xxxl} 0`,
            }}>
              <h1 style={{
                fontSize: isMobile ? typography.fontSize['3xl'] : typography.fontSize['5xl'],
                fontWeight: typography.fontWeight.bold,
                color: colors.text.primary,
                lineHeight: typography.lineHeight.tight,
                marginBottom: spacing.md,
              }}>
                Discover the Most Eligible
              </h1>
              <p style={{
                fontSize: isMobile ? typography.fontSize.md : typography.fontSize.lg,
                color: colors.text.secondary,
                lineHeight: typography.lineHeight.relaxed,
              }}>
                Vote for your favorites and be part of the most exciting social competition.
              </p>
            </div>

            <FilterBar />

            {/* Competition Grid */}
            {visibleCompetitions.length > 0 ? (
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile
                  ? '1fr'
                  : isTablet
                    ? 'repeat(2, 1fr)'
                    : `repeat(auto-fill, minmax(380px, 1fr))`,
                gap: isMobile ? spacing.lg : spacing.xl,
                maxWidth: '1400px',
                margin: '0 auto',
              }}>
                {visibleCompetitions.map((comp) => (
                  <CompetitionCard key={comp.id} competition={comp} />
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
                {(statusFilter !== 'all' || cityFilter !== 'all') && (
                  <Button variant="outline" size="sm" onClick={() => { setStatusFilter('all'); setCityFilter('all'); }}>
                    Clear Filters
                  </Button>
                )}
              </div>
            )}
          </div>
        );

      case 'events':
        const now = new Date();
        const upcomingEvents = events.filter(e => new Date(e.date) >= now).sort((a, b) => new Date(a.date) - new Date(b.date));
        const pastEvents = events.filter(e => new Date(e.date) < now).sort((a, b) => new Date(b.date) - new Date(a.date));

        return (
          <div style={{ padding: contentPadding, paddingBottom: isMobile ? '100px' : contentPadding, maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: spacing.xxxl }}>
              <div style={{
                width: '64px',
                height: '64px',
                background: gradients.purple,
                borderRadius: borderRadius.xl,
                ...styleHelpers.flexCenter,
                margin: '0 auto',
                marginBottom: spacing.lg,
              }}>
                <Calendar size={32} style={{ color: '#fff' }} />
              </div>
              <h2 style={{ fontSize: typography.fontSize['3xl'], fontWeight: typography.fontWeight.bold, color: colors.text.primary, marginBottom: spacing.sm }}>Events</h2>
              <p style={{ color: colors.text.secondary }}>Exclusive events across all competitions</p>
            </div>

            {upcomingEvents.length > 0 && (
              <div style={{ marginBottom: spacing.xxxl }}>
                <h3 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, color: colors.text.primary, marginBottom: spacing.lg }}>
                  Upcoming
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
                  {upcomingEvents.map(event => (
                    <div key={event.id} style={{
                      background: colors.background.card,
                      border: `1px solid ${colors.border.primary}`,
                      borderRadius: borderRadius.lg,
                      padding: spacing.lg,
                      ...styleHelpers.flexBetween,
                      flexWrap: 'wrap',
                      gap: spacing.md,
                    }}>
                      <div>
                        <h4 style={{ fontSize: typography.fontSize.md, fontWeight: typography.fontWeight.semibold, color: colors.text.primary, marginBottom: spacing.xs }}>{event.name}</h4>
                        <div style={{ ...styleHelpers.flexStart, gap: spacing.lg, color: colors.text.secondary, fontSize: typography.fontSize.sm }}>
                          {event.location && <span style={{ ...styleHelpers.flexStart, gap: spacing.xs }}><MapPin size={14} />{event.location}</span>}
                          {event.time && <span style={{ ...styleHelpers.flexStart, gap: spacing.xs }}><Clock size={14} />{event.time}</span>}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, color: colors.gold.primary }}>
                          {new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                        <Badge variant="info" size="xs">{event.cityName}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {pastEvents.length > 0 && (
              <div style={{ opacity: 0.7 }}>
                <h3 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, color: colors.text.secondary, marginBottom: spacing.lg }}>Past Events</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
                  {pastEvents.slice(0, 4).map(event => (
                    <div key={event.id} style={{
                      background: colors.background.card,
                      border: `1px solid ${colors.border.secondary}`,
                      borderRadius: borderRadius.lg,
                      padding: spacing.md,
                      ...styleHelpers.flexBetween,
                    }}>
                      <span style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm }}>{event.name}</span>
                      <span style={{ color: colors.text.muted, fontSize: typography.fontSize.xs }}>
                        {new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {events.length === 0 && (
              <div style={{ ...styleHelpers.flexCenter, flexDirection: 'column', padding: spacing.xxxl, textAlign: 'center' }}>
                <Calendar size={48} style={{ color: colors.text.muted, marginBottom: spacing.lg }} />
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
        const opportunities = [
          { id: 'compete', icon: Trophy, title: 'Compete', desc: 'Get nominated and compete for the title', color: colors.gold.primary, features: ['Build your profile', 'Gain votes', 'Win prizes'] },
          { id: 'judge', icon: Award, title: 'Judge', desc: 'Join our panel of distinguished judges', color: colors.accent.purple, features: ['Evaluate contestants', 'VIP access', 'Shape outcomes'] },
          { id: 'host', icon: Crown, title: 'Host', desc: 'Lead your city\'s competition', color: colors.accent.pink, features: ['Build community', 'Revenue share', 'Full support'] },
          { id: 'sponsor', icon: Building, title: 'Sponsor', desc: 'Partner with Elite Rank', color: colors.status.success, features: ['Brand visibility', 'Event access', 'Activations'] },
        ];

        return (
          <div style={{ padding: contentPadding, paddingBottom: isMobile ? '100px' : contentPadding, maxWidth: '1000px', margin: '0 auto' }}>
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
                <Briefcase size={32} style={{ color: '#000' }} />
              </div>
              <h2 style={{ fontSize: typography.fontSize['3xl'], fontWeight: typography.fontWeight.bold, color: colors.text.primary, marginBottom: spacing.sm }}>Join Elite Rank</h2>
              <p style={{ color: colors.text.secondary }}>Multiple ways to get involved</p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
              gap: spacing.lg,
            }}>
              {opportunities.map(opp => (
                <div key={opp.id} style={{
                  background: colors.background.card,
                  border: `1px solid ${colors.border.primary}`,
                  borderRadius: borderRadius.xl,
                  padding: spacing.xl,
                  transition: `all ${transitions.normal}`,
                  cursor: 'pointer',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = opp.color; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = colors.border.primary; e.currentTarget.style.transform = 'translateY(0)'; }}
                onClick={() => opp.id === 'compete' ? setActiveTab('competitions') : (onLogin && !isAuthenticated && onLogin())}
                >
                  <div style={{
                    width: '48px',
                    height: '48px',
                    background: `${opp.color}20`,
                    borderRadius: borderRadius.lg,
                    ...styleHelpers.flexCenter,
                    marginBottom: spacing.lg,
                  }}>
                    <opp.icon size={24} style={{ color: opp.color }} />
                  </div>
                  <h3 style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: colors.text.primary, marginBottom: spacing.xs }}>{opp.title}</h3>
                  <p style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary, marginBottom: spacing.md }}>{opp.desc}</p>
                  <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                    {opp.features.map((f, i) => (
                      <li key={i} style={{ ...styleHelpers.flexStart, gap: spacing.sm, fontSize: typography.fontSize.sm, color: colors.text.tertiary, marginBottom: spacing.xs }}>
                        <Heart size={12} style={{ color: opp.color }} />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div style={{
              marginTop: spacing.xxxl,
              padding: spacing.xl,
              background: colors.background.card,
              border: `1px solid ${colors.gold.primary}40`,
              borderRadius: borderRadius.xl,
              textAlign: 'center',
            }}>
              <h3 style={{ fontSize: typography.fontSize.lg, color: colors.text.primary, marginBottom: spacing.sm }}>Have Questions?</h3>
              <p style={{ color: colors.text.secondary, marginBottom: spacing.lg }}>We'd love to hear from you</p>
              <Button variant="primary" onClick={() => window.location.href = 'mailto:hello@eliterank.com'}>Contact Us</Button>
            </div>
          </div>
        );

      case 'about':
        return (
          <div style={{ padding: contentPadding, paddingBottom: isMobile ? '100px' : contentPadding, maxWidth: '800px', margin: '0 auto' }}>
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
              <h2 style={{ fontSize: typography.fontSize['3xl'], fontWeight: typography.fontWeight.bold, color: colors.text.primary, marginBottom: spacing.sm }}>About Elite Rank</h2>
              <p style={{ color: colors.text.secondary, lineHeight: typography.lineHeight.relaxed }}>
                America's premier social competition platform connecting ambitious professionals through city-based competitions and exclusive events.
              </p>
            </div>

            <div style={{
              background: colors.background.card,
              border: `1px solid ${colors.gold.primary}40`,
              borderRadius: borderRadius.xl,
              padding: spacing.xl,
              textAlign: 'center',
              marginBottom: spacing.xxxl,
            }}>
              <h3 style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.semibold, color: colors.gold.primary, marginBottom: spacing.md }}>Our Mission</h3>
              <p style={{ color: colors.text.secondary, lineHeight: typography.lineHeight.relaxed }}>
                To celebrate and elevate exceptional individuals in every major city.
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
              gap: spacing.lg,
            }}>
              {[
                { step: '1', title: 'Compete', desc: 'Get nominated and compete' },
                { step: '2', title: 'Vote', desc: 'Public votes for favorites' },
                { step: '3', title: 'Win', desc: 'Winners crowned at finale' },
              ].map(item => (
                <div key={item.step} style={{ textAlign: 'center', padding: spacing.lg }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    background: colors.gold.primary,
                    borderRadius: borderRadius.full,
                    ...styleHelpers.flexCenter,
                    margin: '0 auto',
                    marginBottom: spacing.md,
                    fontSize: typography.fontSize.lg,
                    fontWeight: typography.fontWeight.bold,
                    color: colors.text.inverse,
                  }}>{item.step}</div>
                  <h4 style={{ fontSize: typography.fontSize.md, fontWeight: typography.fontWeight.semibold, color: colors.text.primary, marginBottom: spacing.xs }}>{item.title}</h4>
                  <p style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>{item.desc}</p>
                </div>
              ))}
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
            <div style={{
              width: isMobile ? '32px' : '40px',
              height: isMobile ? '32px' : '40px',
              background: gradients.gold,
              borderRadius: borderRadius.lg,
              ...styleHelpers.flexCenter,
            }}>
              <Crown size={isMobile ? 18 : 24} style={{ color: colors.text.inverse }} />
            </div>
            <span style={{
              fontSize: isMobile ? typography.fontSize.lg : typography.fontSize.xl,
              fontWeight: typography.fontWeight.bold,
              color: colors.text.primary,
            }}>
              Elite<span style={{ color: colors.gold.primary }}>Rank</span>
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
                    gap: spacing.sm,
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
            {isAuthenticated ? (
              <>
                {!isMobile && onDashboard && <Button variant="ghost" size="sm" onClick={onDashboard}>Dashboard</Button>}
                {onProfile && <Button variant="ghost" size="sm" onClick={onProfile} icon={User} iconOnly={isMobile} />}
                {!isMobile && <Button variant="ghost" size="sm" onClick={onLogout}>Logout</Button>}
              </>
            ) : (
              onLogin && <Button variant="primary" size="sm" onClick={onLogin}>Sign In</Button>
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
