/**
 * EliteRank Dashboard - Main Application
 *
 * This is the main entry point for the EliteRank competition platform.
 * It handles routing, authentication, and top-level state management.
 *
 * Architecture:
 * - View-based routing with URL sync for competitions
 * - Authentication via Supabase with role-based access
 * - Lazy loading for performance optimization
 * - Error boundaries for resilient error handling
 */

import React, {
  useState,
  useCallback,
  useMemo,
  useEffect,
  lazy,
  Suspense
} from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

// =============================================================================
// CORE IMPORTS
// =============================================================================

// Supabase client
import { supabase } from './lib/supabase';

// Phase utilities
import { computeCompetitionPhase, COMPETITION_STATUSES } from './utils/competitionPhase';

// Hooks
import { useSupabaseAuth } from './hooks';

// Modals (eagerly loaded for responsiveness)
import { EliteRankCityModal } from './components/modals';

// =============================================================================
// LAZY-LOADED FEATURE PAGES (Code Splitting)
// =============================================================================

const PublicSitePage = lazy(() => import('./features/public-site/PublicSitePage'));
const LoginPage = lazy(() => import('./features/auth/LoginPage'));
const SuperAdminPage = lazy(() => import('./features/super-admin/SuperAdminPage'));
const ProfilePage = lazy(() => import('./features/profile/ProfilePage'));
const ClaimNominationPage = lazy(() => import('./features/public-site/pages/ClaimNominationPage'));

// Shared competition dashboard for both host and superadmin
import { CompetitionDashboard } from './features/competition-dashboard';

// =============================================================================
// CONSTANTS
// =============================================================================

import { DEFAULT_HOST_PROFILE } from './constants';

// View states
const VIEW = Object.freeze({
  PUBLIC: 'public',
  LOGIN: 'login',
  HOST_DASHBOARD: 'host_dashboard',
  SUPER_ADMIN: 'super_admin',
});

// User roles (aligned with database schema)
const ROLE = Object.freeze({
  SUPER_ADMIN: 'super_admin',
  HOST: 'host',
  FAN: 'fan',
});

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Convert city name to URL slug
 * @param {string} city - City name (e.g., "New York, NY")
 * @returns {string} URL slug (e.g., "new-york-ny")
 */
const cityToSlug = (city) => {
  if (!city || typeof city !== 'string') return '';
  return city.toLowerCase().replace(/\s+/g, '-').replace(/,/g, '');
};

/**
 * Convert URL slug back to city name
 * @param {string} slug - URL slug (e.g., "new-york-ny")
 * @returns {string} City name (e.g., "New York Ny")
 */
const slugToCity = (slug) => {
  if (!slug || typeof slug !== 'string') return '';
  return slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Build competition display name from city and season
 * @param {Object} competition - Competition object from database
 * @returns {string} Display name
 */
const buildCompetitionName = (competition) => {
  if (!competition) return 'Unknown Competition';

  const city = competition.city || 'Unknown';
  const season = competition.season || new Date().getFullYear();

  // If city already includes "Most Eligible", use as-is
  if (city.toLowerCase().includes('most eligible')) {
    return city;
  }

  return `${city} Most Eligible ${season}`.trim();
};

/**
 * Create safe competition object with defaults
 * @param {Object} competition - Raw competition data
 * @returns {Object} Competition with safe defaults
 */
const createSafeCompetition = (competition = {}) => ({
  id: competition.id ?? null,
  city: competition.city ?? 'Unknown City',
  season: competition.season ?? String(new Date().getFullYear()),
  phase: competition.phase ?? 'voting',
  status: competition.status ?? 'draft',
  host_id: competition.host_id ?? null,
  host: competition.host ?? null,
  winners: Array.isArray(competition.winners) ? competition.winners : [],
  isTeaser: competition.isTeaser ?? false,
  organization: competition.organization ?? null,
  nomination_start: competition.nomination_start ?? null,
  nomination_end: competition.nomination_end ?? null,
  voting_start: competition.voting_start ?? null,
  voting_end: competition.voting_end ?? null,
  finals_date: competition.finals_date ?? null,
});

// =============================================================================
// UI COMPONENTS
// =============================================================================

/**
 * Loading screen component
 */
function LoadingScreen({ message = 'Loading...' }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 100%)',
        color: '#d4af37',
        fontSize: '1.25rem',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            width: '40px',
            height: '40px',
            margin: '0 auto 16px',
            border: '3px solid rgba(212, 175, 55, 0.2)',
            borderTopColor: '#d4af37',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }}
        />
        {message}
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
}

/**
 * Error boundary for catching render errors
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 100%)',
            color: '#fff',
            padding: '2rem',
            textAlign: 'center',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              marginBottom: '1.5rem',
              background: 'rgba(239, 68, 68, 0.2)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2rem',
            }}
          >
            ⚠️
          </div>
          <h1 style={{ color: '#d4af37', marginBottom: '0.75rem', fontSize: '1.5rem' }}>
            Something went wrong
          </h1>
          <p style={{ color: '#9ca3af', marginBottom: '2rem', maxWidth: '400px' }}>
            We encountered an unexpected error. Please try refreshing the page or go back to the home page.
          </p>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '0.75rem 1.5rem',
                background: 'rgba(255, 255, 255, 0.1)',
                color: '#fff',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              Refresh Page
            </button>
            <button
              onClick={this.handleReset}
              style={{
                padding: '0.75rem 1.5rem',
                background: 'linear-gradient(135deg, #d4af37, #f4d03f)',
                color: '#0a0a0f',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              Go Home
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// =============================================================================
// MAIN APP COMPONENT
// =============================================================================

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  // ===========================================================================
  // AUTHENTICATION
  // ===========================================================================

  const {
    user,
    profile,
    loading: authLoading,
    isAuthenticated,
    signOut,
    updateProfile,
  } = useSupabaseAuth();

  // Derive user role from profile (aligned with database schema)
  const userRole = useMemo(() => {
    if (!profile) return ROLE.FAN;
    if (profile.is_super_admin) return ROLE.SUPER_ADMIN;
    if (profile.is_host) return ROLE.HOST;
    return ROLE.FAN;
  }, [profile]);

  // Check if user has dashboard access
  const hasDashboardAccess = userRole === ROLE.HOST || userRole === ROLE.SUPER_ADMIN;

  // Derive display-friendly host profile from database profile
  const hostProfile = useMemo(() => {
    if (!profile) return DEFAULT_HOST_PROFILE;

    return {
      firstName: profile.first_name || '',
      lastName: profile.last_name || '',
      bio: profile.bio || '',
      city: profile.city || '',
      instagram: profile.instagram || '',
      twitter: profile.twitter || '',
      linkedin: profile.linkedin || '',
      tiktok: profile.tiktok || '',
      hobbies: Array.isArray(profile.interests) ? profile.interests : [],
      avatarUrl: profile.avatar_url || '',
      coverImage: profile.cover_image || '',
      gallery: Array.isArray(profile.gallery) ? profile.gallery : [],
    };
  }, [profile]);

  // Get user display name safely
  const userName = useMemo(() => {
    if (profile?.first_name) return profile.first_name;
    if (user?.email) {
      const emailParts = user.email.split('@');
      return emailParts[0] || 'User';
    }
    return 'User';
  }, [profile?.first_name, user?.email]);

  // ===========================================================================
  // VIEW & NAVIGATION STATE
  // ===========================================================================

  const [currentView, setCurrentView] = useState(VIEW.PUBLIC);
  const [showPublicSite, setShowPublicSite] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [initialUrlHandled, setInitialUrlHandled] = useState(false);

  // Claim nomination state
  const [claimToken, setClaimToken] = useState(null);

  // Selected competition for public site view
  const [selectedCompetition, setSelectedCompetition] = useState(
    createSafeCompetition({ city: 'New York', season: '2026', phase: 'voting' })
  );

  // ===========================================================================
  // HOST COMPETITION (from database)
  // ===========================================================================

  const [hostCompetition, setHostCompetition] = useState(null);

  // Fetch host's assigned competition from Supabase
  useEffect(() => {
    const fetchHostCompetition = async () => {
      if (!user?.id || !supabase) {
        setHostCompetition(null);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('competitions')
          .select('*')
          .eq('host_id', user.id)
          .limit(1);

        if (error) {
          setHostCompetition(null);
          return;
        }

        const competition = data?.[0];
        if (competition) {
          setHostCompetition({
            ...competition,
            name: buildCompetitionName(competition),
          });
        } else {
          setHostCompetition(null);
        }
      } catch {
        setHostCompetition(null);
      }
    };

    fetchHostCompetition();
  }, [user?.id]);

  // ===========================================================================
  // PROFILE EDITING STATE
  // ===========================================================================

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editingProfileData, setEditingProfileData] = useState(null);

  // ===========================================================================
  // URL HANDLING
  // ===========================================================================

  // Handle initial URL on app load (e.g., /c/:citySlug or /claim/:token)
  useEffect(() => {
    const handleInitialUrl = async () => {
      // Check for claim nomination URL
      const claimMatch = location.pathname.match(/^\/claim\/([^/]+)\/?$/);
      if (claimMatch) {
        setClaimToken(claimMatch[1]);
        setInitialUrlHandled(true);
        return;
      }

      const match = location.pathname.match(/^\/c\/([^/]+)\/?$/);

      if (match && supabase) {
        const slug = match[1];
        const cityName = slugToCity(slug);

        try {
          // First, find the city by name to get city_id
          const { data: cities } = await supabase
            .from('cities')
            .select('id, name')
            .ilike('name', `%${cityName}%`)
            .limit(1);

          let competitions = [];

          if (cities?.length) {
            // Found city, search by city_id with voting rounds (settings are now on competitions table)
            const { data } = await supabase
              .from('competitions')
              .select('*, voting_rounds(*)')
              .eq('city_id', cities[0].id)
              .limit(1);
            competitions = data || [];
          }

          // Fallback: search by competition name if no city match
          if (!competitions?.length) {
            const { data } = await supabase
              .from('competitions')
              .select('*, voting_rounds(*)')
              .ilike('name', `%${cityName}%`)
              .limit(1);
            competitions = data || [];
          }

          if (competitions?.[0]) {
            // Get city name for the competition
            let competitionCityName = cityName;
            if (competitions[0].city_id) {
              const { data: cityData } = await supabase
                .from('cities')
                .select('name')
                .eq('id', competitions[0].city_id)
                .single();
              if (cityData) competitionCityName = cityData.name;
            }
            const competition = competitions[0];
            // Settings are now directly on the competition object
            const competitionWithSettings = {
              ...competition,
              voting_rounds: competition.voting_rounds || [],
            };
            setSelectedCompetition(
              createSafeCompetition({
                ...competitionWithSettings,
                city: competitionCityName,
                phase: computeCompetitionPhase(competitionWithSettings),
                isTeaser: competition.status !== COMPETITION_STATUSES.LIVE,
              })
            );
            setShowPublicSite(true);
          }
        } catch {
          // Silent fail for URL parsing
        }
      }

      setInitialUrlHandled(true);
    };

    handleInitialUrl();
  }, []); // Only run once on mount

  // Sync URL with public site state
  useEffect(() => {
    if (!initialUrlHandled) return;

    if (showPublicSite && selectedCompetition.city) {
      const slug = cityToSlug(selectedCompetition.city);
      const targetPath = `/c/${slug}`;
      if (location.pathname !== targetPath) {
        navigate(targetPath, { replace: true });
      }
    } else if (!showPublicSite && location.pathname.startsWith('/c/')) {
      navigate('/', { replace: true });
    }
  }, [showPublicSite, selectedCompetition.city, initialUrlHandled, location.pathname, navigate]);

  // ===========================================================================
  // NAVIGATION HANDLERS
  // ===========================================================================

  const handleShowLogin = useCallback(() => {
    setCurrentView(VIEW.LOGIN);
  }, []);

  const handleLogin = useCallback(() => {
    setCurrentView(VIEW.PUBLIC);
  }, []);

  const handleLogout = useCallback(async () => {
    await signOut();
    setCurrentView(VIEW.PUBLIC);
    setShowPublicSite(false);
    setShowUserProfile(false);
    setIsEditingProfile(false);
    setEditingProfileData(null);
  }, [signOut]);

  const handleBackToPublic = useCallback(() => {
    setCurrentView(VIEW.PUBLIC);
  }, []);

  const handleGoToDashboard = useCallback(() => {
    if (userRole === ROLE.SUPER_ADMIN) {
      setCurrentView(VIEW.SUPER_ADMIN);
    } else if (userRole === ROLE.HOST) {
      setCurrentView(VIEW.HOST_DASHBOARD);
    }
  }, [userRole]);

  const handleShowProfile = useCallback(() => {
    setShowUserProfile(true);
    setShowPublicSite(false);
  }, []);

  const handleCloseProfile = useCallback(() => {
    setShowUserProfile(false);
    setIsEditingProfile(false);
    setEditingProfileData(null);
  }, []);

  // ===========================================================================
  // COMPETITION HANDLERS
  // ===========================================================================

  const handleOpenCompetition = useCallback((competition) => {
    setShowUserProfile(false);
    setSelectedCompetition(createSafeCompetition(competition));
    setShowPublicSite(true);

    const slug = cityToSlug(competition?.city);
    if (slug) {
      navigate(`/c/${slug}`);
    }
  }, [navigate]);

  const handleClosePublicSite = useCallback(() => {
    setShowPublicSite(false);
    navigate('/', { replace: true });
  }, [navigate]);

  // ===========================================================================
  // PROFILE HANDLERS
  // ===========================================================================

  const handleEditProfile = useCallback(() => {
    setEditingProfileData({ ...hostProfile });
    setIsEditingProfile(true);
  }, [hostProfile]);

  const handleSaveProfile = useCallback(async () => {
    if (!editingProfileData) return;

    try {
      // Convert UI format to database format
      const dbUpdates = {
        first_name: editingProfileData.firstName,
        last_name: editingProfileData.lastName,
        bio: editingProfileData.bio,
        city: editingProfileData.city,
        instagram: editingProfileData.instagram,
        twitter: editingProfileData.twitter,
        linkedin: editingProfileData.linkedin,
        tiktok: editingProfileData.tiktok,
        interests: editingProfileData.hobbies,
        avatar_url: editingProfileData.avatarUrl,
        cover_image: editingProfileData.coverImage,
        gallery: editingProfileData.gallery,
      };

      // Remove undefined values
      Object.keys(dbUpdates).forEach((key) => {
        if (dbUpdates[key] === undefined) delete dbUpdates[key];
      });

      const result = await updateProfile(dbUpdates);

      if (result?.error) {
        alert(`Failed to save profile: ${result.error}`);
        return;
      }

      setIsEditingProfile(false);
      setEditingProfileData(null);
    } catch {
      alert('Failed to save profile. Please try again.');
    }
  }, [editingProfileData, updateProfile]);

  const handleCancelProfile = useCallback(() => {
    setIsEditingProfile(false);
    setEditingProfileData(null);
  }, []);

  const handleProfileChange = useCallback((updates) => {
    setEditingProfileData(updates);
  }, []);


  // ===========================================================================
  // RENDER: LOADING STATE
  // ===========================================================================

  if (authLoading) {
    return <LoadingScreen message="Loading..." />;
  }

  // ===========================================================================
  // RENDER: CLAIM NOMINATION PAGE
  // ===========================================================================

  if (claimToken) {
    return (
      <ErrorBoundary>
        <Suspense fallback={<LoadingScreen message="Loading nomination..." />}>
          <ClaimNominationPage
            token={claimToken}
            onClose={() => {
              setClaimToken(null);
              navigate('/', { replace: true });
            }}
            onSuccess={() => {
              setClaimToken(null);
              navigate('/', { replace: true });
            }}
          />
        </Suspense>
      </ErrorBoundary>
    );
  }

  // ===========================================================================
  // RENDER: LOGIN VIEW
  // ===========================================================================

  if (currentView === VIEW.LOGIN) {
    return (
      <ErrorBoundary>
        <Suspense fallback={<LoadingScreen message="Loading login..." />}>
          <LoginPage onLogin={handleLogin} onBack={handleBackToPublic} />
        </Suspense>
      </ErrorBoundary>
    );
  }

  // ===========================================================================
  // RENDER: SUPER ADMIN DASHBOARD
  // ===========================================================================

  if (currentView === VIEW.SUPER_ADMIN && userRole === ROLE.SUPER_ADMIN) {
    return (
      <ErrorBoundary>
        <Suspense fallback={<LoadingScreen message="Loading admin dashboard..." />}>
          <SuperAdminPage onLogout={handleLogout} />
        </Suspense>
      </ErrorBoundary>
    );
  }

  // ===========================================================================
  // RENDER: HOST DASHBOARD
  // ===========================================================================

  if (currentView === VIEW.HOST_DASHBOARD && hasDashboardAccess) {
    // Host must have an assigned competition to view the dashboard
    if (!hostCompetition) {
      return (
        <ErrorBoundary>
          <div
            style={{
              minHeight: '100vh',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 100%)',
              color: '#fff',
              padding: '2rem',
              textAlign: 'center',
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                marginBottom: '1.5rem',
                background: 'rgba(212, 175, 55, 0.2)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2rem',
              }}
            >
              👑
            </div>
            <h1 style={{ color: '#d4af37', marginBottom: '0.75rem', fontSize: '1.5rem' }}>
              No Competition Assigned
            </h1>
            <p style={{ color: '#9ca3af', marginBottom: '2rem', maxWidth: '400px' }}>
              You don't have a competition assigned yet. Contact an administrator to get started.
            </p>
            <button
              onClick={handleBackToPublic}
              style={{
                padding: '0.75rem 1.5rem',
                background: 'linear-gradient(135deg, #d4af37, #f4d03f)',
                color: '#0a0a0f',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              Back to Competitions
            </button>
          </div>
        </ErrorBoundary>
      );
    }

    return (
      <ErrorBoundary>
        <CompetitionDashboard
          competitionId={hostCompetition.id}
          role="host"
          onBack={handleBackToPublic}
          onLogout={handleLogout}
          currentUserId={user?.id}
          onViewPublicSite={() => {
            const cityName = hostCompetition?.city || 'Your City';
            setSelectedCompetition(
              createSafeCompetition({
                id: hostCompetition?.id,
                city: cityName,
                season: hostCompetition?.season,
                status: hostCompetition?.status,
                phase: hostCompetition?.status || 'voting',
              })
            );
            setShowPublicSite(true);
            navigate(`/c/${cityToSlug(cityName)}`);
          }}
        />

        {/* Public Site Preview */}
        {showPublicSite && (
          <Suspense fallback={<LoadingScreen message="Loading preview..." />}>
            <PublicSitePage
              isOpen={showPublicSite}
              onClose={handleClosePublicSite}
              city={selectedCompetition.city}
              season={selectedCompetition.season}
              phase={selectedCompetition.phase}
              competition={hostCompetition}
              isAuthenticated={isAuthenticated}
              onLogin={handleShowLogin}
              userEmail={user?.email}
              userInstagram={profile?.instagram}
            />
          </Suspense>
        )}
      </ErrorBoundary>
    );
  }

  // ===========================================================================
  // RENDER: PUBLIC VIEW (Default)
  // ===========================================================================

  return (
    <ErrorBoundary>
      {/* Main Public Page - Competitions Listing */}
      <EliteRankCityModal
        isOpen={true}
        onClose={() => {}}
        isFullPage={true}
        onOpenCompetition={handleOpenCompetition}
        onLogin={handleShowLogin}
        onDashboard={isAuthenticated && hasDashboardAccess ? handleGoToDashboard : null}
        onProfile={isAuthenticated ? handleShowProfile : null}
        isAuthenticated={isAuthenticated}
        userRole={userRole}
        userName={userName}
        onLogout={handleLogout}
      />

      {/* Public Site for Selected Competition */}
      {showPublicSite && (
        <Suspense fallback={<LoadingScreen message="Loading competition..." />}>
          <PublicSitePage
            isOpen={showPublicSite}
            onClose={handleClosePublicSite}
            city={selectedCompetition.city}
            season={selectedCompetition.season}
            phase={selectedCompetition.phase}
            host={selectedCompetition.host}
            winners={selectedCompetition.winners}
            competition={selectedCompetition}
            isAuthenticated={isAuthenticated}
            onLogin={handleShowLogin}
            userEmail={user?.email}
            userInstagram={profile?.instagram}
            user={user}
          />
        </Suspense>
      )}

      {/* User Profile Modal */}
      {showUserProfile && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: '#0a0a0f',
            zIndex: 200,
            overflow: 'auto',
          }}
        >
          <div
            style={{
              maxWidth: '1200px',
              margin: '0 auto',
              padding: '24px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '24px' }}>
              <button
                onClick={handleCloseProfile}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '8px',
                  color: '#fff',
                  cursor: 'pointer',
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                }}
              >
                ← Back to Competitions
              </button>
            </div>
            <Suspense fallback={<LoadingScreen message="Loading profile..." />}>
              <ProfilePage
                hostProfile={isEditingProfile ? editingProfileData : hostProfile}
                isEditing={isEditingProfile}
                onEdit={handleEditProfile}
                onSave={handleSaveProfile}
                onCancel={handleCancelProfile}
                onChange={handleProfileChange}
                hostCompetition={null}
                userRole={userRole}
                isHost={userRole === ROLE.HOST}
              />
            </Suspense>
          </div>
        </div>
      )}
    </ErrorBoundary>
  );
}
