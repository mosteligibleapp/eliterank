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
import { useNavigate, useLocation, Routes, Route } from 'react-router-dom';

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

const LoginPage = lazy(() => import('./features/auth/LoginPage'));
const SuperAdminPage = lazy(() => import('./features/super-admin/SuperAdminPage'));
const ProfilePage = lazy(() => import('./features/profile/ProfilePage'));
const ClaimNominationPage = lazy(() => import('./features/public-site/pages/ClaimNominationPage'));
const CompetitionLayout = lazy(() => import('./pages/competition/CompetitionLayout'));

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

/**
 * PendingNominationsModal - Shows when user has multiple pending nominations
 */
function PendingNominationsModal({ nominations, onSelect, onClose }) {
  if (!nominations?.length) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '24px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#1a1a2e',
          border: '1px solid rgba(212, 175, 55, 0.3)',
          borderRadius: '16px',
          padding: '32px',
          maxWidth: '480px',
          width: '100%',
          maxHeight: '80vh',
          overflow: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              background: 'linear-gradient(135deg, rgba(212,175,55,0.3), rgba(212,175,55,0.1))',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              fontSize: '32px',
            }}
          >
            👑
          </div>
          <h2 style={{ color: '#d4af37', fontSize: '1.5rem', marginBottom: '8px' }}>
            You Have Pending Nominations!
          </h2>
          <p style={{ color: '#9ca3af', fontSize: '0.95rem' }}>
            Select a competition to claim your nomination
          </p>
        </div>

        {/* Nominations List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {nominations.map((nom) => (
            <button
              key={nom.id}
              onClick={() => onSelect(nom)}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(212, 175, 55, 0.1)';
                e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ color: '#fff', fontWeight: '600', marginBottom: '4px' }}>
                    Most Eligible {nom.competition?.city} {nom.competition?.season}
                  </p>
                  <p style={{ color: '#9ca3af', fontSize: '0.85rem' }}>
                    {nom.competition?.organization?.name || 'EliteRank'}
                  </p>
                </div>
                <div
                  style={{
                    background: nom.claimed_at ? 'rgba(74, 222, 128, 0.2)' : 'rgba(212, 175, 55, 0.2)',
                    color: nom.claimed_at ? '#4ade80' : '#d4af37',
                    fontSize: '0.75rem',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontWeight: '500',
                  }}
                >
                  {nom.claimed_at ? 'Complete Profile' : 'Accept/Decline'}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Skip Option */}
        <button
          onClick={onClose}
          style={{
            width: '100%',
            marginTop: '20px',
            padding: '12px',
            background: 'transparent',
            border: 'none',
            color: '#6b7280',
            fontSize: '0.9rem',
            cursor: 'pointer',
            textDecoration: 'underline',
          }}
        >
          I'll do this later
        </button>
      </div>
    </div>
  );
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
  const [showUserProfile, setShowUserProfile] = useState(false);

  // Claim nomination state
  const [claimToken, setClaimToken] = useState(null);
  const [claimStage, setClaimStage] = useState(null); // null, 'initial', 'completion', 'profile'
  const [claimData, setClaimData] = useState(null); // { nominee, competition } after accept

  // Return URL after login (for redirecting back to contestant vote modal)
  const [loginReturnUrl, setLoginReturnUrl] = useState(null);

  // Pending nominations state (for showing selection modal after login)
  const [pendingNominations, setPendingNominations] = useState(null);
  const [showNominationsModal, setShowNominationsModal] = useState(false);

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
          .select(`
            *,
            voting_rounds:voting_rounds(*),
            nomination_periods:nomination_periods(*)
          `)
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

  // Handle query params (e.g., ?login=true, ?profile=true, ?dashboard=true)
  useEffect(() => {
    const params = new URLSearchParams(location.search);

    if (params.get('login') === 'true') {
      // Store return URL if provided (for redirecting back after login)
      const returnTo = params.get('returnTo');
      if (returnTo) {
        setLoginReturnUrl(decodeURIComponent(returnTo));
      }
      setCurrentView(VIEW.LOGIN);
      // Clear the query param from URL
      navigate('/', { replace: true });
    } else if (params.get('profile') === 'true' && isAuthenticated) {
      setShowUserProfile(true);
      navigate('/', { replace: true });
    } else if (params.get('dashboard') === 'true' && hasDashboardAccess) {
      if (userRole === ROLE.SUPER_ADMIN) {
        setCurrentView(VIEW.SUPER_ADMIN);
      } else if (userRole === ROLE.HOST) {
        setCurrentView(VIEW.HOST_DASHBOARD);
      }
      navigate('/', { replace: true });
    }
  }, [location.search, isAuthenticated, hasDashboardAccess, userRole, navigate]);

  // Handle initial URL on app load (e.g., /claim/:token or legacy /c/:citySlug)
  useEffect(() => {
    const handleInitialUrl = async () => {
      // Check for claim nomination URL (handles both /claim/{token} and /claim/{token}/complete)
      // The unified ClaimNominationPage handles the entire flow
      const claimMatch = location.pathname.match(/^\/claim\/([^/]+)(\/complete)?\/?$/);
      if (claimMatch) {
        setClaimToken(claimMatch[1]);
        setClaimStage('initial'); // Always use 'initial' - the page handles everything
        return;
      }

      // Check for legacy /c/:citySlug format (single segment after /c/)
      // Redirect to new format: /c/:orgSlug/:citySlug
      const legacyMatch = location.pathname.match(/^\/c\/([^/]+)\/?$/);
      if (legacyMatch && supabase) {
        const citySlug = legacyMatch[1];

        try {
          // Look up the competition to get org slug and year
          const cityName = slugToCity(citySlug);

          // Find competition by city name
          const { data: competitions } = await supabase
            .from('competitions')
            .select(`
              id, city, season, status,
              organization:organizations(slug)
            `)
            .or(`city.ilike.%${cityName}%,name.ilike.%${cityName}%`)
            .order('created_at', { ascending: false })
            .limit(1);

          if (competitions?.[0]) {
            const comp = competitions[0];
            const orgSlug = comp.organization?.slug || 'most-eligible';
            const city = comp.city?.toLowerCase().replace(/\s+/g, '-').replace(/,/g, '') || citySlug;
            const year = comp.season || '';

            // Redirect to new URL format
            const newPath = year ? `/c/${orgSlug}/${city}/${year}` : `/c/${orgSlug}/${city}`;
            navigate(newPath, { replace: true });
            return;
          }
        } catch {
          // Silent fail - will fall through to default handling
        }

        // Default redirect if no competition found
        navigate(`/c/most-eligible/${citySlug}`, { replace: true });
      }
    };

    handleInitialUrl();
  }, []); // Only run once on mount

  // ===========================================================================
  // PENDING NOMINATIONS CHECK
  // ===========================================================================

  // Track if we've already checked for pending nominations this session
  const [hasCheckedPending, setHasCheckedPending] = useState(false);

  // Check if user has pending nominations after login
  const checkPendingNominations = useCallback(async (userEmail, userId) => {
    if (!userEmail || !supabase) return null;

    try {
      // Find nominee records for this email that are:
      // 1. Not yet claimed (claimed_at IS NULL), OR
      // 2. Claimed but profile incomplete
      const { data: nominees, error } = await supabase
        .from('nominees')
        .select(`
          id,
          name,
          email,
          invite_token,
          claimed_at,
          status,
          user_id,
          competition:competitions(
            id,
            city,
            season,
            status,
            nomination_end,
            organization:organizations(name, slug)
          )
        `)
        .eq('email', userEmail)
        .neq('status', 'rejected')
        .is('converted_to_contestant', null);

      if (error || !nominees?.length) {
        return null;
      }

      // Filter to only pending nominations:
      // - Not yet claimed OR claimed but profile incomplete
      const pending = nominees.filter(n => {
        // Skip if competition nomination period ended
        if (n.competition?.nomination_end) {
          const endDate = new Date(n.competition.nomination_end);
          if (new Date() > endDate) return false;
        }
        return true;
      });

      if (!pending.length) return null;

      return pending;
    } catch (err) {
      console.error('Error checking pending nominations:', err);
      return null;
    }
  }, []);

  // Check for pending nominations when user logs in via magic link
  // (this handles the case where magic link bypasses LoginPage)
  useEffect(() => {
    const checkOnAuth = async () => {
      // Only check if:
      // 1. User is authenticated
      // 2. We haven't already checked this session
      // 3. We're not already on a claim page
      // 4. We're not showing the nominations modal
      if (
        isAuthenticated &&
        user?.email &&
        !hasCheckedPending &&
        !claimToken &&
        !showNominationsModal
      ) {
        setHasCheckedPending(true);

        const pending = await checkPendingNominations(user.email, user.id);

        if (pending?.length) {
          if (pending.length === 1) {
            setClaimToken(pending[0].invite_token);
            setClaimStage('initial');
          } else {
            setPendingNominations(pending);
            setShowNominationsModal(true);
          }
        }
      }
    };

    checkOnAuth();
  }, [isAuthenticated, user?.email, user?.id, hasCheckedPending, claimToken, showNominationsModal, checkPendingNominations]);

  // Reset the check flag when user logs out
  useEffect(() => {
    if (!isAuthenticated) {
      setHasCheckedPending(false);
    }
  }, [isAuthenticated]);

  // ===========================================================================
  // NAVIGATION HANDLERS
  // ===========================================================================

  const handleShowLogin = useCallback(() => {
    setCurrentView(VIEW.LOGIN);
  }, []);

  const handleLogin = useCallback(async (userData) => {
    // Check for pending nominations first
    if (userData?.email) {
      const pending = await checkPendingNominations(userData.email, userData.id);

      if (pending?.length) {
        if (pending.length === 1) {
          // Single pending nomination - redirect directly to claim page
          setClaimToken(pending[0].invite_token);
          setClaimStage('initial');
          setCurrentView(VIEW.PUBLIC);
          return;
        } else {
          // Multiple pending nominations - show selection modal
          setPendingNominations(pending);
          setShowNominationsModal(true);
          setCurrentView(VIEW.PUBLIC);
          return;
        }
      }
    }

    // No pending nominations - normal flow
    // If we have a return URL (e.g., from clicking "Sign in to vote"), redirect there
    if (loginReturnUrl) {
      const returnUrl = loginReturnUrl;
      setLoginReturnUrl(null); // Clear the stored URL
      navigate(returnUrl);
    } else {
      setCurrentView(VIEW.PUBLIC);
    }
  }, [loginReturnUrl, navigate, checkPendingNominations]);

  const handleLogout = useCallback(async () => {
    await signOut();
    setCurrentView(VIEW.PUBLIC);
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

    // Build new URL format: /c/:orgSlug/:citySlug/:year
    const orgSlug = competition?.organization?.slug || competition?.orgSlug || 'most-eligible';
    const citySlug = competition?.city
      ? competition.city.toLowerCase().replace(/\s+/g, '-').replace(/,/g, '')
      : '';
    const year = competition?.season || '';

    if (citySlug) {
      const path = year ? `/c/${orgSlug}/${citySlug}/${year}` : `/c/${orgSlug}/${citySlug}`;
      navigate(path);
    }
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
  // PENDING NOMINATIONS MODAL HANDLERS
  // ===========================================================================

  const handleSelectNomination = useCallback((nomination) => {
    setShowNominationsModal(false);
    setPendingNominations(null);
    setClaimToken(nomination.invite_token);
    setClaimStage('initial');
  }, []);

  const handleCloseNominationsModal = useCallback(() => {
    setShowNominationsModal(false);
    setPendingNominations(null);
  }, []);


  // ===========================================================================
  // RENDER: LOADING STATE
  // ===========================================================================

  if (authLoading) {
    return <LoadingScreen message="Loading..." />;
  }

  // ===========================================================================
  // RENDER: PUBLIC COMPETITION PAGES (/:orgSlug/:slug routes)
  // ===========================================================================

  // New URL format: /:orgSlug/:slug
  // Where slug is: {city}-{year} or {city}-{demographic}-{year}
  // Examples: /most-eligible/chicago-2028, /most-eligible/chicago-women-21-39-2028
  const pathParts = location.pathname.split('/').filter(Boolean);

  // Reserved paths that should NOT be treated as competition routes
  const reservedPaths = ['c', 'org', 'login', 'claim', 'admin', 'profile', 'api', 'auth'];

  // Check if this is a competition route:
  // 1. Has exactly 2 segments (or more for nested routes like /e/:contestant)
  // 2. First segment is not a reserved path
  // 3. Second segment ends with a 4-digit year (e.g., "chicago-2028")
  const isCompetitionRoute =
    pathParts.length >= 2 &&
    !reservedPaths.includes(pathParts[0].toLowerCase()) &&
    /-\d{4}($|\/)/.test(pathParts[1]);

  // Also support legacy /c/ routes for backwards compatibility
  const isLegacyCompetitionRoute = pathParts[0] === 'c' && pathParts.length >= 2;

  if (isCompetitionRoute || isLegacyCompetitionRoute) {
    return (
      <ErrorBoundary>
        <Suspense fallback={<LoadingScreen message="Loading competition..." />}>
          <Routes>
            {/* New format: /:orgSlug/:slug/* */}
            <Route path="/:orgSlug/:slug/*" element={<CompetitionLayout />} />
            {/* Legacy format: /c/:orgSlug/:citySlug/:year/* */}
            <Route path="/c/:orgSlug/:citySlug/:year/*" element={<CompetitionLayout />} />
            <Route path="/c/:orgSlug/:citySlug/*" element={<CompetitionLayout />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    );
  }

  // ===========================================================================
  // RENDER: CLAIM NOMINATION FLOW
  // ===========================================================================

  // Handle claim close/reset
  const handleClaimClose = () => {
    setClaimToken(null);
    setClaimStage(null);
    setClaimData(null);
    navigate('/', { replace: true });
  };

  // Render claim page - ClaimNominationPage now handles the entire flow
  // (accept/reject + profile completion)
  if (claimToken) {
    return (
      <ErrorBoundary>
        <Suspense fallback={<LoadingScreen message="Loading nomination..." />}>
          <ClaimNominationPage
            token={claimToken}
            onClose={handleClaimClose}
            onSuccess={handleClaimClose}
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
            // Navigate to new public page format: /:orgSlug/:city-{year}
            const orgSlug = hostCompetition?.organization?.slug || 'most-eligible';
            const cityName = hostCompetition?.city?.name || hostCompetition?.city || 'competition';
            const citySlug = cityName.toLowerCase().replace(/\s+/g, '-').replace(/,/g, '');
            const year = hostCompetition?.season || new Date().getFullYear();
            // New format: /:orgSlug/:city-year (demographic not included for host view)
            const path = `/${orgSlug}/${citySlug}-${year}`;
            window.open(path, '_blank');
          }}
        />
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

      {/* Pending Nominations Modal */}
      {showNominationsModal && pendingNominations?.length > 0 && (
        <PendingNominationsModal
          nominations={pendingNominations}
          onSelect={handleSelectNomination}
          onClose={handleCloseNominationsModal}
        />
      )}
    </ErrorBoundary>
  );
}
