import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Crown, MapPin, Calendar, Users, Loader, ChevronLeft, Trophy,
  Vote, UserPlus, PartyPopper, Megaphone, BookOpen, Clock, Award
} from 'lucide-react';
import { Button } from '../../../components/ui';
import { colors, spacing, borderRadius, typography, shadows } from '../../../styles/theme';
import { supabase } from '../../../lib/supabase';
import {
  COMPETITION_STATUS,
  STATUS_CONFIG,
  getCurrentPhase,
} from '../../../types/competition';
import InterestForm from '../components/InterestForm';
import UpcomingEventCard from '../components/UpcomingEventCard';
import { useOrganizations, useCities } from '../../../hooks/useCachedQuery';
import { formatEventTime } from '../../../utils/formatters';

// Tab definitions
const TABS = [
  { id: 'about', label: 'About', icon: Crown },
  { id: 'winners', label: 'Winners', icon: Trophy },
  { id: 'vote', label: 'Vote', icon: Vote },
  { id: 'compete', label: 'Compete', icon: UserPlus },
  { id: 'events', label: 'Events', icon: PartyPopper },
  { id: 'announcements', label: 'Announcements', icon: Megaphone },
  { id: 'rules', label: 'Rules', icon: BookOpen },
];

export default function CompetitionPage() {
  const { orgSlug, competitionSlug } = useParams();
  const navigate = useNavigate();

  // Use cached hooks for organizations and cities
  const { data: cachedOrganizations, loading: orgsLoading } = useOrganizations();
  const { data: cachedCities, loading: citiesLoading } = useCities();

  const [competition, setCompetition] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('about');
  const [winners, setWinners] = useState([]);
  const [events, setEvents] = useState([]);

  // Find organization from cached data
  const organization = useMemo(() => {
    return (cachedOrganizations || []).find(org => org.slug === orgSlug) || null;
  }, [cachedOrganizations, orgSlug]);

  useEffect(() => {
    if (orgSlug && competitionSlug && !orgsLoading && !citiesLoading) {
      fetchCompetition();
    }
  }, [orgSlug, competitionSlug, orgsLoading, citiesLoading, organization]);

  const fetchCompetition = async () => {
    if (!supabase) return;

    setLoading(true);
    setError(null);

    try {
      // Check if organization was found in cache
      if (!organization) {
        setError('Organization not found');
        setLoading(false);
        return;
      }

      // Fetch competition by slug directly (new slug format: name-city-year-demographics)
      const { data: compData, error: compError } = await supabase
        .from('competitions')
        .select(`
          *,
          voting_rounds:voting_rounds(*),
          nomination_periods:nomination_periods(*),
          prizes:competition_prizes(*),
          rules:competition_rules(*)
        `)
        .eq('slug', competitionSlug)
        .eq('organization_id', organization.id)
        .single();

      if (compError) {
        if (compError.code === 'PGRST116') {
          setError('Competition not found');
        } else {
          throw compError;
        }
        return;
      }

      // Check if competition is visible
      if (!['publish', 'live', 'completed'].includes(compData.status)) {
        setError('Competition not found');
        return;
      }

      // Get city data from cached cities
      const cityData = (cachedCities || []).find(city => city.id === compData.city_id) || null;

      setCompetition({
        ...compData,
        city: cityData?.name || 'Unknown City',  // Ensure city is a string for rendering
        cityData: cityData,  // Keep full city object for components that need it
      });

      // Fetch winners if competition has them
      if (compData.winners && compData.winners.length > 0) {
        const { data: winnerProfiles, error: winnersError } = await supabase
          .from('profiles')
          .select('id, email, first_name, last_name, avatar_url')
          .in('id', compData.winners);

        if (!winnersError && winnerProfiles) {
          // Maintain order from winner IDs
          const orderedWinners = compData.winners
            .map(id => winnerProfiles.find(p => p.id === id))
            .filter(Boolean);
          setWinners(orderedWinners);
        }
      }

      // Fetch events for this competition
      const { data: eventsData } = await supabase
        .from('events')
        .select('*')
        .eq('competition_id', compData.id)
        .order('date');

      if (eventsData) {
        setEvents(eventsData.map(e => ({
          id: e.id, name: e.name, date: e.date, endDate: e.end_date, time: e.time,
          location: e.location, description: e.description, imageUrl: e.image_url,
          ticketUrl: e.ticket_url, status: e.status, featured: e.featured,
          publicVisible: e.public_visible,
        })));
      }
    } catch (err) {
      console.error('Error fetching competition:', err);
      setError('Failed to load competition');
    } finally {
      setLoading(false);
    }
  };

  // Get current phase for live competitions
  const getCurrentPhaseInfo = () => {
    if (!competition || competition.status !== COMPETITION_STATUS.LIVE) return null;
    // Settings are now on the competition object directly (consolidated schema)
    return getCurrentPhase(competition, competition.nomination_periods || []);
  };

  const phaseInfo = getCurrentPhaseInfo();

  if (loading || orgsLoading || citiesLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.background.primary,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{ textAlign: 'center' }}>
          <Loader size={32} style={{ animation: 'spin 1s linear infinite', color: colors.gold.primary }} />
          <p style={{ marginTop: spacing.md, color: colors.text.secondary }}>Loading competition...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.background.primary,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{ textAlign: 'center', padding: spacing.xxl }}>
          <Crown size={64} style={{ color: colors.text.muted, marginBottom: spacing.lg }} />
          <h1 style={{ fontSize: typography.fontSize.xxl, marginBottom: spacing.md }}>
            Competition Not Found
          </h1>
          <p style={{ color: colors.text.secondary, marginBottom: spacing.xl }}>
            We couldn't find the competition you're looking for.
          </p>
          <Button onClick={() => navigate('/')}>Go Home</Button>
        </div>
      </div>
    );
  }

  const isTeaser = competition.status === COMPETITION_STATUS.PUBLISH;
  const statusConfig = STATUS_CONFIG[competition.status];

  return (
    <div style={{
      minHeight: '100vh',
      background: colors.background.primary,
    }}>
      {/* Header */}
      <div style={{
        background: `linear-gradient(135deg, ${colors.background.card} 0%, ${colors.background.primary} 100%)`,
        borderBottom: `1px solid ${colors.border.light}`,
        padding: `${spacing.xl} ${spacing.xl} 0`,
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {/* Back button */}
          <button
            onClick={() => navigate(`/org/${orgSlug}`)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing.xs,
              background: 'none',
              border: 'none',
              color: colors.text.secondary,
              cursor: 'pointer',
              marginBottom: spacing.lg,
              fontSize: typography.fontSize.sm,
            }}
          >
            <ChevronLeft size={16} />
            Back to {organization?.name}
          </button>

          {/* Competition Info */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: spacing.xl, marginBottom: spacing.xl }}>
            {/* Organization Logo */}
            <div style={{
              width: 80,
              height: 80,
              borderRadius: borderRadius.xl,
              background: colors.background.secondary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              border: `2px solid ${colors.border.light}`,
              flexShrink: 0,
            }}>
              {organization?.logo_url ? (
                <img
                  src={organization.logo_url}
                  alt={organization.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <Crown size={36} style={{ color: colors.gold.primary }} />
              )}
            </div>

            {/* Info */}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm }}>
                <h1 style={{ fontSize: typography.fontSize.xxl, fontWeight: typography.fontWeight.bold }}>
                  {organization?.name} {competition.city}
                </h1>
                <span style={{
                  padding: `${spacing.xs} ${spacing.md}`,
                  background: statusConfig?.bg,
                  color: statusConfig?.color,
                  borderRadius: borderRadius.pill,
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.medium,
                }}>
                  {statusConfig?.label}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: spacing.lg, marginBottom: spacing.md }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: spacing.xs, color: colors.text.secondary }}>
                  <MapPin size={16} />
                  {competition.city}{competition.cityData?.state ? `, ${competition.cityData.state}` : ''}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: spacing.xs, color: colors.text.secondary }}>
                  <Calendar size={16} />
                  Season {competition.season}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: spacing.xs, color: colors.text.secondary }}>
                  <Trophy size={16} />
                  {competition.number_of_winners} winner{competition.number_of_winners !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Current phase for live competitions */}
              {phaseInfo && (
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: spacing.sm,
                  padding: `${spacing.sm} ${spacing.md}`,
                  background: 'rgba(34,197,94,0.1)',
                  border: '1px solid rgba(34,197,94,0.3)',
                  borderRadius: borderRadius.md,
                }}>
                  <span style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: '#22c55e',
                    animation: 'pulse 2s infinite',
                  }} />
                  <span style={{ color: '#22c55e', fontSize: typography.fontSize.sm }}>
                    {phaseInfo.label}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Tabs - only show for live/completed competitions */}
          {!isTeaser && (
            <div style={{
              display: 'flex',
              gap: spacing.xs,
              borderBottom: `1px solid ${colors.border.light}`,
              marginBottom: -1,
            }}>
              {TABS.filter(tab => {
                // Only show Winners tab for completed competitions with winners
                if (tab.id === 'winners' && (competition.status !== COMPETITION_STATUS.COMPLETED || winners.length === 0)) return false;
                return true;
              }).map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: spacing.sm,
                      padding: `${spacing.md} ${spacing.lg}`,
                      background: 'none',
                      border: 'none',
                      borderBottom: `2px solid ${isActive ? colors.gold.primary : 'transparent'}`,
                      color: isActive ? colors.gold.primary : colors.text.secondary,
                      cursor: 'pointer',
                      fontSize: typography.fontSize.sm,
                      fontWeight: isActive ? typography.fontWeight.medium : typography.fontWeight.normal,
                      transition: 'all 0.2s',
                    }}
                  >
                    <Icon size={16} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: spacing.xxl }}>
        {/* Teaser Mode - Show Interest Form */}
        {isTeaser ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: spacing.xxl }}>
            <div>
              <h2 style={{ fontSize: typography.fontSize.xl, marginBottom: spacing.lg }}>
                Coming Soon
              </h2>
              <p style={{ color: colors.text.secondary, lineHeight: 1.6, marginBottom: spacing.lg }}>
                {organization?.name} is bringing an exciting competition to {competition.city} in {competition.season}!
                We're currently preparing everything for an amazing experience.
              </p>

              <div style={{
                background: colors.background.card,
                border: `1px solid ${colors.border.light}`,
                borderRadius: borderRadius.xl,
                padding: spacing.xl,
              }}>
                <h3 style={{ fontSize: typography.fontSize.lg, marginBottom: spacing.md }}>
                  What to Expect
                </h3>
                <ul style={{ color: colors.text.secondary, paddingLeft: spacing.lg }}>
                  <li style={{ marginBottom: spacing.sm }}>{competition.number_of_winners} winners will be selected</li>
                  <li style={{ marginBottom: spacing.sm }}>Winner selection by public votes</li>
                  <li style={{ marginBottom: spacing.sm }}>Exclusive events throughout the competition</li>
                </ul>
              </div>

              {/* Prizes (if any) */}
              {competition.prizes?.length > 0 && (
                <div style={{ marginTop: spacing.xl }}>
                  <h3 style={{ fontSize: typography.fontSize.lg, marginBottom: spacing.md }}>
                    Prizes
                  </h3>
                  <div style={{ display: 'grid', gap: spacing.md }}>
                    {competition.prizes.map(prize => (
                      <div
                        key={prize.id}
                        style={{
                          background: colors.background.card,
                          border: `1px solid ${colors.border.light}`,
                          borderRadius: borderRadius.lg,
                          padding: spacing.md,
                          display: 'flex',
                          alignItems: 'center',
                          gap: spacing.md,
                        }}
                      >
                        {prize.image_url ? (
                          <img
                            src={prize.image_url}
                            alt={prize.title}
                            style={{ width: 60, height: 60, borderRadius: borderRadius.md, objectFit: 'cover' }}
                          />
                        ) : (
                          <div style={{
                            width: 60,
                            height: 60,
                            borderRadius: borderRadius.md,
                            background: 'rgba(212,175,55,0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}>
                            <Award size={24} style={{ color: colors.gold.primary }} />
                          </div>
                        )}
                        <div>
                          <h4 style={{ fontWeight: typography.fontWeight.medium }}>{prize.title}</h4>
                          {prize.value && (
                            <p style={{ fontSize: typography.fontSize.sm, color: colors.gold.primary }}>
                              {prize.value}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Interest Form */}
            <div>
              <InterestForm competition={competition} />
            </div>
          </div>
        ) : (
          /* Live/Completed Mode - Tab Content with Sidebar */
          <div style={{
            display: 'grid',
            gridTemplateColumns: activeTab === 'events' || activeTab === 'rules' ? '1fr' : '1fr 300px',
            gap: spacing.xxl,
          }}>
            {/* Main Content */}
            <div>
              {activeTab === 'about' && (
                <AboutTab competition={competition} organization={organization} />
              )}
              {activeTab === 'winners' && (
                <WinnersTab winners={winners} />
              )}
              {activeTab === 'vote' && (
                <VoteTab competition={competition} />
              )}
              {activeTab === 'compete' && (
                <CompeteTab competition={competition} />
              )}
              {activeTab === 'events' && (
                <EventsTabContent events={events} />
              )}
              {activeTab === 'announcements' && (
                <AnnouncementsTab competition={competition} />
              )}
              {activeTab === 'rules' && (
                <RulesTab competition={competition} />
              )}
            </div>

            {/* Sidebar - show on most tabs except events and rules */}
            {activeTab !== 'events' && activeTab !== 'rules' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
                {/* Upcoming Event Card */}
                <UpcomingEventCard
                  events={events}
                  onViewAllEvents={() => setActiveTab('events')}
                />

                {/* Rules Summary Card */}
                {competition?.rules?.length > 0 && (
                  <div
                    style={{
                      background: colors.background.card,
                      border: `1px solid ${colors.border.light}`,
                      borderRadius: borderRadius.xl,
                      overflow: 'hidden',
                    }}
                  >
                    {/* Header */}
                    <div
                      style={{
                        padding: `${spacing.md} ${spacing.lg}`,
                        borderBottom: `1px solid ${colors.border.light}`,
                        display: 'flex',
                        alignItems: 'center',
                        gap: spacing.sm,
                      }}
                    >
                      <BookOpen size={16} style={{ color: colors.text.secondary }} />
                      <span
                        style={{
                          fontSize: typography.fontSize.sm,
                          fontWeight: typography.fontWeight.semibold,
                          color: colors.text.primary,
                        }}
                      >
                        Competition Rules
                      </span>
                    </div>
                    {/* Preview */}
                    <div style={{ padding: spacing.lg }}>
                      <p
                        style={{
                          fontSize: typography.fontSize.sm,
                          color: colors.text.secondary,
                          marginBottom: spacing.md,
                          lineHeight: 1.5,
                        }}
                      >
                        {competition.rules.length} rule section{competition.rules.length !== 1 ? 's' : ''} for this competition.
                      </p>
                      <button
                        onClick={() => setActiveTab('rules')}
                        style={{
                          background: 'none',
                          border: `1px solid ${colors.border.light}`,
                          borderRadius: borderRadius.md,
                          padding: `${spacing.sm} ${spacing.md}`,
                          color: colors.text.primary,
                          fontSize: typography.fontSize.sm,
                          fontWeight: typography.fontWeight.medium,
                          cursor: 'pointer',
                          width: '100%',
                        }}
                      >
                        View Rules
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Tab Components
function AboutTab({ competition, organization }) {
  return (
    <div>
      <h2 style={{ fontSize: typography.fontSize.xl, marginBottom: spacing.lg }}>
        About This Competition
      </h2>

      {competition.description ? (
        <p style={{ color: colors.text.secondary, lineHeight: 1.6, marginBottom: spacing.xl }}>
          {competition.description}
        </p>
      ) : (
        <p style={{ color: colors.text.muted, marginBottom: spacing.xl }}>
          No description provided.
        </p>
      )}

      <div style={{
        background: colors.background.card,
        border: `1px solid ${colors.border.light}`,
        borderRadius: borderRadius.xl,
        padding: spacing.xl,
        display: 'inline-block',
      }}>
        <Trophy size={24} style={{ color: colors.gold.primary, marginBottom: spacing.md }} />
        <h4 style={{ fontSize: typography.fontSize.sm, color: colors.text.muted, marginBottom: spacing.xs }}>
          Winners
        </h4>
        <p style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold }}>
          {competition.number_of_winners}
        </p>
      </div>

      {/* Prizes */}
      {competition.prizes?.length > 0 && (
        <div style={{ marginTop: spacing.xxl }}>
          <h3 style={{ fontSize: typography.fontSize.lg, marginBottom: spacing.lg }}>
            Prizes
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: spacing.md }}>
            {competition.prizes.map(prize => (
              <div
                key={prize.id}
                style={{
                  background: colors.background.card,
                  border: `1px solid ${colors.border.light}`,
                  borderRadius: borderRadius.lg,
                  padding: spacing.lg,
                }}
              >
                <h4 style={{ fontWeight: typography.fontWeight.medium, marginBottom: spacing.xs }}>
                  {prize.title}
                </h4>
                {prize.value && (
                  <p style={{ color: colors.gold.primary, fontSize: typography.fontSize.sm, marginBottom: spacing.sm }}>
                    {prize.value}
                  </p>
                )}
                {prize.description && (
                  <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm }}>
                    {prize.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function VoteTab({ competition }) {
  return (
    <div style={{ textAlign: 'center', padding: spacing.xxxl }}>
      <Vote size={64} style={{ color: colors.text.muted, marginBottom: spacing.lg }} />
      <h2 style={{ fontSize: typography.fontSize.xl, marginBottom: spacing.md }}>
        Vote for Your Favorite
      </h2>
      <p style={{ color: colors.text.secondary }}>
        Contestant voting will be displayed here during voting rounds.
      </p>
    </div>
  );
}

function WinnersTab({ winners }) {
  const getProfileName = (profile) => {
    const firstName = profile.first_name || '';
    const lastName = profile.last_name || '';
    const fullName = `${firstName} ${lastName}`.trim();
    return fullName || profile.email || 'Unknown';
  };

  if (!winners || winners.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: spacing.xxxl }}>
        <Trophy size={64} style={{ color: colors.text.muted, marginBottom: spacing.lg }} />
        <h2 style={{ fontSize: typography.fontSize.xl, marginBottom: spacing.md }}>
          Winners
        </h2>
        <p style={{ color: colors.text.secondary }}>
          No winners have been announced yet.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ fontSize: typography.fontSize.xl, marginBottom: spacing.lg }}>
        Competition Winners
      </h2>
      <p style={{ color: colors.text.secondary, marginBottom: spacing.xl }}>
        Congratulations to our winners!
      </p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: spacing.lg,
      }}>
        {winners.map((winner) => (
          <div
            key={winner.id}
            style={{
              background: colors.background.card,
              border: '1px solid rgba(212,175,55,0.3)',
              borderRadius: borderRadius.xl,
              padding: spacing.xl,
              textAlign: 'center',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Gold accent at top */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 4,
              background: 'linear-gradient(90deg, rgba(212,175,55,0.3), rgba(212,175,55,0.8), rgba(212,175,55,0.3))',
            }} />

            {/* Crown icon */}
            <div style={{
              width: 48,
              height: 48,
              borderRadius: borderRadius.full,
              background: 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.1))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto',
              marginBottom: spacing.md,
            }}>
              <Crown size={24} style={{ color: colors.gold.primary }} />
            </div>

            {/* Avatar */}
            <div style={{
              width: 80,
              height: 80,
              borderRadius: borderRadius.full,
              background: winner.avatar_url
                ? `url(${winner.avatar_url}) center/cover`
                : 'linear-gradient(135deg, rgba(212,175,55,0.3), rgba(212,175,55,0.1))',
              margin: '0 auto',
              marginBottom: spacing.md,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '3px solid rgba(212,175,55,0.5)',
              fontSize: typography.fontSize.xxl,
              fontWeight: typography.fontWeight.bold,
              color: colors.gold.primary,
            }}>
              {!winner.avatar_url && getProfileName(winner).charAt(0).toUpperCase()}
            </div>

            {/* Name */}
            <h3 style={{
              fontSize: typography.fontSize.lg,
              fontWeight: typography.fontWeight.semibold,
              marginBottom: spacing.xs,
            }}>
              {getProfileName(winner)}
            </h3>

            {/* Winner badge */}
            <div style={{
              marginTop: spacing.md,
              display: 'inline-flex',
              alignItems: 'center',
              gap: spacing.xs,
              padding: `${spacing.xs} ${spacing.md}`,
              background: 'rgba(212,175,55,0.15)',
              borderRadius: borderRadius.pill,
              color: colors.gold.primary,
              fontSize: typography.fontSize.xs,
              fontWeight: typography.fontWeight.medium,
            }}>
              <Trophy size={12} />
              Winner
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CompeteTab({ competition }) {
  return (
    <div style={{ textAlign: 'center', padding: spacing.xxxl }}>
      <UserPlus size={64} style={{ color: colors.text.muted, marginBottom: spacing.lg }} />
      <h2 style={{ fontSize: typography.fontSize.xl, marginBottom: spacing.md }}>
        Become a Contestant
      </h2>
      <p style={{ color: colors.text.secondary }}>
        Nomination and application forms will be displayed here during the nomination period.
      </p>
    </div>
  );
}

function EventsTabContent({ events }) {
  // Sort events into upcoming and past
  // Use string comparison to avoid timezone issues
  const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD format in local time
  const upcomingEvents = events.filter(e => !e.date || e.date >= todayStr);
  const pastEvents = events.filter(e => e.date && e.date < todayStr);

  if (events.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: spacing.xxxl }}>
        <PartyPopper size={64} style={{ color: colors.text.muted, marginBottom: spacing.lg }} />
        <h2 style={{ fontSize: typography.fontSize.xl, marginBottom: spacing.md }}>
          Competition Events
        </h2>
        <p style={{ color: colors.text.secondary }}>
          No events scheduled yet. Check back soon!
        </p>
      </div>
    );
  }

  const formatDateBadge = (dateStr, timeStr) => {
    if (!dateStr) return 'Date TBD';
    const eventDate = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isToday = eventDate.getTime() === today.getTime();
    const datePart = isToday
      ? 'TODAY'
      : eventDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase();
    if (timeStr) {
      return `${datePart}  •  ${formatEventTime(timeStr)}`;
    }
    return datePart;
  };

  const EventCard = ({ event, isPast }) => {
    const CardWrapper = event.ticketUrl && !isPast ? 'a' : 'div';
    const wrapperProps = event.ticketUrl && !isPast
      ? { href: event.ticketUrl, target: '_blank', rel: 'noopener noreferrer' }
      : {};

    return (
      <CardWrapper
        {...wrapperProps}
        style={{
          display: 'block',
          background: colors.background.card,
          borderRadius: borderRadius.xxl,
          overflow: 'hidden',
          opacity: isPast ? 0.7 : 1,
          position: 'relative',
          textDecoration: 'none',
          color: 'inherit',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          cursor: event.ticketUrl && !isPast ? 'pointer' : 'default',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'scale(1.02)';
          e.currentTarget.style.boxShadow = shadows.cardHover;
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        {/* Cover Image */}
        <div style={{
          width: '100%',
          aspectRatio: '4 / 3',
          background: event.imageUrl
            ? `url(${event.imageUrl}) center/cover no-repeat`
            : 'linear-gradient(135deg, rgba(212,175,55,0.15) 0%, rgba(139,92,246,0.1) 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}>
          {!event.imageUrl && (
            <Crown size={48} style={{ color: 'rgba(212,175,55,0.35)' }} />
          )}

          {/* Bottom gradient fade */}
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '50%',
            background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 100%)',
            pointerEvents: 'none',
          }} />

          {/* Date/time badge */}
          <div style={{
            position: 'absolute',
            bottom: spacing.md,
            left: spacing.md,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(12px)',
            borderRadius: borderRadius.lg,
            padding: `${spacing.xs} ${spacing.md}`,
            fontSize: typography.fontSize.xs,
            fontWeight: typography.fontWeight.semibold,
            color: colors.text.primary,
            letterSpacing: '0.3px',
          }}>
            {formatDateBadge(event.date, event.time)}
          </div>

          {isPast && (
            <div style={{
              position: 'absolute',
              top: spacing.md,
              left: spacing.md,
              background: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(8px)',
              borderRadius: borderRadius.md,
              padding: `${spacing.xs} ${spacing.sm}`,
              fontSize: typography.fontSize.xs,
              color: colors.text.tertiary,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>
              Past Event
            </div>
          )}
        </div>

        {/* Card Body */}
        <div style={{ padding: `${spacing.md} ${spacing.lg} ${spacing.lg}` }}>
          <h3 style={{
            fontSize: typography.fontSize.md,
            fontWeight: typography.fontWeight.semibold,
            color: colors.text.primary,
            marginBottom: spacing.xs,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {event.name}
          </h3>

          {event.location && (
            <p style={{
              fontSize: typography.fontSize.sm,
              color: colors.text.secondary,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {event.location}
            </p>
          )}
        </div>
      </CardWrapper>
    );
  };

  return (
    <div>
      <h2 style={{ fontSize: typography.fontSize.xl, marginBottom: spacing.lg }}>
        Competition Events
      </h2>

      {/* Upcoming Events */}
      {upcomingEvents.length > 0 && (
        <div style={{ marginBottom: spacing.xxl }}>
          <h3 style={{ fontSize: typography.fontSize.md, color: colors.text.secondary, marginBottom: spacing.md }}>
            Upcoming Events
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: spacing.lg }}>
            {upcomingEvents.map(event => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </div>
      )}

      {/* Past Events */}
      {pastEvents.length > 0 && (
        <div>
          <h3 style={{ fontSize: typography.fontSize.md, color: colors.text.secondary, marginBottom: spacing.md }}>
            Past Events
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: spacing.lg }}>
            {pastEvents.map(event => (
              <EventCard key={event.id} event={event} isPast />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AnnouncementsTab({ competition }) {
  return (
    <div style={{ textAlign: 'center', padding: spacing.xxxl }}>
      <Megaphone size={64} style={{ color: colors.text.muted, marginBottom: spacing.lg }} />
      <h2 style={{ fontSize: typography.fontSize.xl, marginBottom: spacing.md }}>
        Announcements
      </h2>
      <p style={{ color: colors.text.secondary }}>
        Competition announcements and updates will be displayed here.
      </p>
    </div>
  );
}

function RulesTab({ competition }) {
  if (!competition.rules || competition.rules.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: spacing.xxxl }}>
        <BookOpen size={64} style={{ color: colors.text.muted, marginBottom: spacing.lg }} />
        <h2 style={{ fontSize: typography.fontSize.xl, marginBottom: spacing.md }}>
          Competition Rules
        </h2>
        <p style={{ color: colors.text.secondary }}>
          No rules have been published yet.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ fontSize: typography.fontSize.xl, marginBottom: spacing.lg }}>
        Competition Rules
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
        {competition.rules.sort((a, b) => a.sort_order - b.sort_order).map(rule => (
          <div
            key={rule.id}
            style={{
              background: colors.background.card,
              border: `1px solid ${colors.border.light}`,
              borderRadius: borderRadius.xl,
              padding: spacing.xl,
            }}
          >
            <h3 style={{ fontSize: typography.fontSize.lg, marginBottom: spacing.md }}>
              {rule.section_title}
            </h3>
            <div
              style={{ color: colors.text.secondary, lineHeight: 1.6 }}
              dangerouslySetInnerHTML={{ __html: rule.section_content.replace(/\n/g, '<br/>') }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
