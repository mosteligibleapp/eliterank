import React, { memo, useState, Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useSupabaseAuth } from '../../hooks';
import { getUserRole, ROLE } from '../../routes/ProtectedRoute';
import ProfileIcon from './ProfileIcon';
import NotificationBell from './NotificationBell';
import './PageHeader.css';

const ContestantGuide = lazy(() => import('../../features/contestant-guide/ContestantGuide'));

/**
 * PageHeader - Standardized sticky header for all user-facing pages
 *
 * Provides consistent navigation: back button (left), title (center-left), profile icon (right).
 * Used on Profile, Rewards, Achievements, and any other non-competition page.
 */
function PageHeader({ title, subtitle, onBack, backLabel = 'Back', onHowToCompete, children }) {
  const navigate = useNavigate();
  const { user, profile, isAuthenticated, signOut } = useSupabaseAuth();
  const userRole = getUserRole(profile);
  const [showGuide, setShowGuide] = useState(false);

  const handleBack = onBack || (() => navigate('/'));
  const handleProfile = () => navigate('/profile');
  const handleRewards = () => navigate('/rewards');
  const handleAchievements = () => navigate('/achievements');
  const handleDashboard = () => navigate('/dashboard');
  const handleLogout = async () => {
    // Navigate away from protected route FIRST to prevent ProtectedRoute
    // from redirecting to /login while signOut clears Zustand state.
    navigate('/');
    await signOut();
  };

  const isNomineeOrContestant = profile?.is_nominee_or_contestant;
  const handleHowToCompete = isNomineeOrContestant ? (onHowToCompete || (() => setShowGuide(true))) : undefined;

  const hasDashboardAccess = userRole === ROLE.HOST || userRole === ROLE.SUPER_ADMIN;

  return (
    <>
      <header className="page-header">
        <button
          className="page-header__back"
          onClick={handleBack}
          aria-label={backLabel}
        >
          <ArrowLeft size={20} />
        </button>

        <div className="page-header__title-group">
          <h1 className="page-header__title">{title}</h1>
          {subtitle && <p className="page-header__subtitle">{subtitle}</p>}
        </div>

        {children}

        <div className="page-header__actions">
          {isAuthenticated && <NotificationBell size={40} />}
          <ProfileIcon
            isAuthenticated={isAuthenticated}
            user={user}
            profile={profile}
            onLogin={() => navigate('/login')}
            onLogout={handleLogout}
            onProfile={handleProfile}
            onRewards={handleRewards}
            onAchievements={handleAchievements}
            onHowToCompete={handleHowToCompete}
            onDashboard={hasDashboardAccess ? handleDashboard : null}
            hasDashboardAccess={hasDashboardAccess}
            size={40}
          />
        </div>
      </header>

      {/* Generic Contestant Guide (when no parent provides onHowToCompete) */}
      {!onHowToCompete && showGuide && (
        <Suspense fallback={null}>
          <ContestantGuide
            competition={null}
            mode="page"
            onClose={() => setShowGuide(false)}
            onComplete={() => setShowGuide(false)}
          />
        </Suspense>
      )}
    </>
  );
}

export default memo(PageHeader);
